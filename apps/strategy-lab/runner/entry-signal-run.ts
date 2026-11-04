// The Strategy Lab entry-signal runner: ONE manual test of one configuration, started by the server as a child process
// with a fixed argument vector:
//
//   node --experimental-transform-types runner/entry-signal-run.ts <absolute run directory>
//
// cwd must be the repository root (data/, config/ paths). It reads <run dir>/request.json (written by the server after
// validation), loads each symbol through the repository's dataset pipeline (src/lib/evaluation.ts: the evaluation
// window, warm-up sessions read for the lookback only, forward split adjustment, the data file's sha256, access mode
// 'manual evaluation'), runs the signal-only strategy (src/entry-signals/), measures forward outcomes inside the window
// only, and writes events.json, metrics.json and provenance.json atomically. Progress goes to stdout as JSON lines.
// It never searches parameters: one request, one configuration.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { barsFromSessions, isSignalResolution } from '../../../src/entry-signals/bars.ts';
import { defaultOutcomeConfig, forwardOutcome, summarizeOutcomes } from '../../../src/entry-signals/outcomes.ts';
import { scanRiseFromRecentLow } from '../../../src/entry-signals/riseFromRecentLow.ts';
import { resolveDataset } from '../../../src/lib/dataset.ts';
import { loadDatasetSessions } from '../../../src/lib/evaluation.ts';
import { atomicWrite, writeEvents } from '../server/artifacts.ts';
import type { LabEvent, LabValue, RunRequest } from '../shared/contract.ts';
import { RISE_FROM_RECENT_LOW } from '../shared/strategies.ts';

const emit = (o: Record<string, unknown>) => process.stdout.write(`${JSON.stringify(o)}\n`);
const progress = (message: string, fraction: number | null = null) => emit({ type: 'progress', message, fraction });

const ENGINE_FILES = [
  'src/entry-signals/bars.ts',
  'src/entry-signals/riseFromRecentLow.ts',
  'src/entry-signals/outcomes.ts',
  'src/lib/evaluation.ts',
  'src/lib/session.ts',
  'src/lib/csv.ts',
  'src/lib/corporateActions.ts',
  'apps/strategy-lab/runner/entry-signal-run.ts'
];

const iso = (sec: number) => new Date(sec * 1000).toISOString().replace('.000Z', 'Z');
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;

const NY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short'
});
const nyText = (sec: number) => {
  const p = Object.fromEntries(NY.formatToParts(new Date(sec * 1000)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute} ${p.timeZoneName}`;
};

interface StoredRequest extends RunRequest {
  runId: string;
}

async function main() {
  const runDir = process.argv[2];
  if (!runDir) throw new Error('usage: entry-signal-run.ts <run directory>');
  const request = JSON.parse(readFileSync(join(runDir, 'request.json'), 'utf8')) as StoredRequest;
  if (request.strategyKey !== RISE_FROM_RECENT_LOW.key || request.strategyVersion !== RISE_FROM_RECENT_LOW.version)
    throw new Error(`unsupported strategy ${request.strategyKey}@${request.strategyVersion}`);
  if (!isSignalResolution(request.resolution)) throw new Error(`unsupported resolution ${request.resolution}`);

  const params = {
    advanceFromRecentLowPercent: request.params.advanceFromRecentLowPercent!,
    recentLowLookbackBars: request.params.recentLowLookbackBars!
  };
  const n = params.recentLowLookbackBars;
  const minutes = request.resolution === '1d' ? 390 : Number(request.resolution.slice(0, -1));
  const barsPerSession = Math.ceil(390 / minutes);
  // Enough sessions of history for N bars plus the previous bar's state at the window's first bar.
  const warmupSessions = request.resolution === '1d' ? n + 1 : Math.ceil((n + 1) / barsPerSession) + 1;

  const events: LabEvent[] = [];
  const perSymbol: Record<string, unknown> = {};
  const provenance: Record<string, unknown> = {};
  const basisBySymbol: Record<string, string> = {};

  for (const [k, symbol] of request.symbols.entries()) {
    const base = k / request.symbols.length;
    progress(`${symbol}: loading the canonical minute file`, base);
    const dataset = resolveDataset(symbol, 'all');
    const run = await loadDatasetSessions({
      dataset,
      startDate: request.from,
      endDate: request.to,
      warmupSessions,
      access: 'manual evaluation'
    });
    progress(`${symbol}: ${run.sessions.length} sessions loaded; scanning`, base + 0.6 / request.symbols.length);

    const bars = barsFromSessions(run.history, request.resolution);
    const firstEligible = bars.findIndex((b) => b.sessionIndex >= run.warmup);
    const scan = scanRiseFromRecentLow(bars, params, firstEligible < 0 ? bars.length : firstEligible);
    basisBySymbol[symbol] = run.history[0]!.date;

    const items: { sessionIndex: number; outcome: ReturnType<typeof forwardOutcome> }[] = [];
    for (const s of scan.signals) {
      const bar = bars[s.index]!;
      const low = bars[s.recentLowIndex]!;
      const sessionIndex = bar.sessionIndex - run.warmup;
      const outcome = forwardOutcome(run.sessions, sessionIndex, s.close);
      items.push({ sessionIndex, outcome });
      const t = iso(s.time);
      const values: LabValue[] = [
        { key: 'advance', label: 'Advance above the recent low', value: r2(s.advancePercent), unit: 'percent' },
        {
          key: 'previousAdvance',
          label: 'Advance on the previous bar',
          value: r2(s.previousAdvancePercent),
          unit: 'percent'
        },
        { key: 'recentLow', label: `Recent low (${n}-bar window)`, value: r4(s.recentLow), unit: 'price' },
        { key: 'recentLowBarEnd', label: 'Recent-low bar end', value: iso(low.end), unit: 'datetime' },
        { key: 'thresholdPrice', label: 'Threshold price', value: r4(s.thresholdPrice), unit: 'price' },
        { key: 'barStart', label: 'Signal bar start', value: iso(bar.start), unit: 'datetime' },
        ...outcome.returns.map((r) => ({
          key: `return${r.sessions}`,
          label: `Return after ${r.sessions} sessions (close to close)`,
          value: r.returnPercent === null ? null : r2(r.returnPercent),
          unit: 'percent' as const
        })),
        {
          key: 'mfe',
          label: `MFE over ${outcome.excursion.sessions} sessions (highs)`,
          value: outcome.excursion.mfePercent === null ? null : r2(outcome.excursion.mfePercent),
          unit: 'percent'
        },
        {
          key: 'mae',
          label: `MAE over ${outcome.excursion.sessions} sessions (lows)`,
          value: outcome.excursion.maePercent === null ? null : r2(outcome.excursion.maePercent),
          unit: 'percent'
        },
        ...outcome.targets.map((tg) => ({
          key: `reached${tg.percent}`,
          label: `Reached +${tg.percent}% within ${outcome.excursion.sessions} sessions`,
          value: tg.reached,
          unit: 'text' as const
        }))
      ];
      events.push({
        id: `${symbol}:entry_signal:${t}`,
        runId: request.runId,
        symbol,
        kind: 'entry_signal',
        t,
        timePrecision: request.resolution === '1d' ? 'session-close' : 'minute',
        timeMeaning:
          request.resolution === '1d'
            ? 'scheduled close of the session (16:00 ET, 13:00 on early-close days): the daily bar is complete'
            : `end of the completed ${request.resolution} bar: the signal is first knowable`,
        price: s.close,
        priceBasis: 'bar-close',
        reason: `Close ${s.close.toFixed(2)} is ${r2(s.advancePercent).toFixed(2)}% above the ${n}-bar low ${s.recentLow.toFixed(2)} (bar ending ${nyText(low.end)}); the previous bar was ${r2(s.previousAdvancePercent).toFixed(2)}% above its low`,
        values,
        tradeId: null,
        linkedEventId: null,
        meta: { censored: !outcome.excursion.complete, signalOnly: true }
      });
    }

    const baseline = run.sessions.map((sess, i) => ({
      sessionIndex: i,
      outcome: forwardOutcome(run.sessions, i, sess.close)
    }));
    perSymbol[symbol] = {
      signals: scan.signals.length,
      evaluableBars: scan.evaluableBars,
      barsAtOrAboveThreshold: scan.barsAtOrAboveThreshold,
      bars: bars.length - (firstEligible < 0 ? bars.length : firstEligible),
      outcomes: summarizeOutcomes(items),
      baseline: summarizeOutcomes(baseline)
    };
    provenance[symbol] = { ...run.report, dataFile: run.report?.dataFile, firstSignalBar: firstEligible };
    progress(`${symbol}: ${scan.signals.length} signals`, (k + 1) / request.symbols.length);
  }

  const appRoot = fileURLToPath(new URL('..', import.meta.url));
  const repoRoot = join(appRoot, '..', '..');
  const engine = Object.fromEntries(
    ENGINE_FILES.map((f) => [
      f,
      createHash('sha256')
        .update(readFileSync(join(repoRoot, f)))
        .digest('hex')
    ])
  );

  const eventsSha = writeEvents(runDir, request.runId, events);
  atomicWrite(
    join(runDir, 'metrics.json'),
    `${JSON.stringify(
      {
        kind: 'entry-signal outcomes',
        disclaimer:
          'Signal-only research: forward moves of the price after each signal, inside the run window. No exits, positions, costs or P&L are modelled; these are not trade results.',
        config: defaultOutcomeConfig,
        perSymbol
      },
      null,
      2
    )}\n`
  );
  atomicWrite(
    join(runDir, 'provenance.json'),
    `${JSON.stringify({ request, warmupSessions, basisBySymbol, engine, node: process.version, symbols: provenance }, null, 2)}\n`
  );
  emit({ type: 'done', events: events.length, eventsSha256: eventsSha, runDir: relative(repoRoot, runDir) });
}

main().catch((e: unknown) => {
  emit({ type: 'error', message: e instanceof Error ? e.message : String(e) });
  process.exitCode = 1;
});
