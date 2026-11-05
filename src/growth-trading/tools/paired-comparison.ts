// A paired DIAGNOSTIC comparison of one Growth configuration with the entry trend filter and/or persistent eligibility
// ON against the same configuration with both OFF (continuation, exits, costs, symbols, window and data identical).
// It runs exactly two configurations per symbol — no grid, no search, no fitting, no selection — and reports
// descriptive differences of ONE retrospective history: entries added/removed, blocked and deferred signals,
// eligibility ages, closed/open trades, realised and marked net, interest, minute/daily drawdowns, time in market.
//
//   npm run growth-paired -- --request <request.json> [--out <dir>]
//
// <request.json> is a Strategy Lab Growth 1.2.0 request (the `request.json` of a run directory, or the same shape:
// strategyKey, strategyVersion, params, symbols, from, to, resolution). Both runs load the SAME sessions (the ON
// configuration's warm-up, which is never shorter than OFF's; the scanner's signals do not depend on extra warm-up), so
// the data are identical. Output: <out>/paired-comparison.json and .md (default: a new directory under the OS temp dir).
// Run from the repository root (the engine reads repository files at load).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { paramsOf } from '../../../apps/strategy-lab/runner/growth-params.ts';
import type { LabRunRequest } from '../../../apps/strategy-lab/shared/contract.ts';
import { validateRunRequest } from '../../../apps/strategy-lab/shared/strategies.ts';
import { resolveDataset } from '../../lib/dataset.ts';
import { loadDatasetSessions } from '../../lib/evaluation.ts';
import { readPartitionConfig } from '../../lib/partitions.ts';
import {
  type RiseTradingParams,
  type RiseTradingRun,
  STRATEGY_KEY,
  STRATEGY_VERSION,
  entrySourceOf,
  runRiseTrading,
  summarizeSimulation,
  warmupSessionsForParams
} from '../riseTrading.ts';

export const RETROSPECTIVE_NOTE =
  'RETROSPECTIVE DIAGNOSTIC of one configuration on one historical window: two runs on identical data and costs, the ' +
  'only difference being the entry trend filter / persistent eligibility. Path dependence: one blocked or added entry ' +
  'changes every later decision, so differences are not attributable trade by trade. Not an optimisation, not a ' +
  'selection, not evidence of an edge or of safer trading.';

const r2 = (x: number) => Math.round(x * 100) / 100;
const iso = (sec: number) => new Date(sec * 1000).toISOString().replace('.000Z', 'Z');

// The pure comparison of two completed runs of one symbol (OFF = both gates OFF; ON = the configuration under study).
export const pairedComparison = (off: RiseTradingRun, on: RiseTradingRun) => {
  const a = summarizeSimulation(off.simulation, off.ds);
  const b = summarizeSimulation(on.simulation, on.ds);
  const key = (t: { decisionTime: number; entryTime: number }) => `${t.decisionTime}|${t.entryTime}`;
  const offKeys = new Map(off.simulation.trades.map((t) => [key(t), t]));
  const onKeys = new Map(on.simulation.trades.map((t) => [key(t), t]));
  const row = (run: RiseTradingRun, t: RiseTradingRun['simulation']['trades'][number]) => ({
    decision: iso(t.decisionTime),
    entry: iso(t.entryTime),
    entryPrice: t.entryRawPrice,
    source: entrySourceOf(run.simulation, t),
    status: t.exitIndex < 0 ? 'open' : 'closed',
    netUsd: r2(t.net)
  });
  const g = b.metrics.entryGates;
  const side = (m: typeof a.metrics) => ({
    rawSignals: m.signals.raw,
    taken: m.signals.filled,
    ignoredWhileInvestedOrPending: m.signals.rejected,
    vetoed: 'vetoed' in m.signals ? m.signals.vetoed : 0,
    deferred: 'deferred' in m.signals ? m.signals.deferred : 0,
    tradesClosed: m.trades.closed,
    tradesOpen: m.trades.open,
    wins: m.trades.wins,
    losses: m.trades.losses,
    realizedNetUsd: r2(m.pnl.realizedNetUsd),
    markedNetUsd: r2(m.pnl.totalMarkedNetUsd),
    interestUsd: r2(m.pnl.totalInterestUsd),
    costsUsd: r2(m.pnl.totalCostsUsd),
    maxMinuteDrawdownUsd: r2(m.drawdown.minute.maximumUsd),
    maxDailyDrawdownUsd: r2(m.drawdown.daily.maximumUsd),
    sessionsInvestedPercent: m.occupancy.sessionsInvestedPercent,
    calendarTimeInvestedPercent: m.occupancy.calendarTimeInvestedPercent
  });
  const A = side(a.metrics);
  const B = side(b.metrics);
  const delta = Object.fromEntries(
    Object.keys(A).map((k) => {
      const x = A[k as keyof typeof A];
      const y = B[k as keyof typeof B];
      return [k, typeof x === 'number' && typeof y === 'number' ? r2(y - x) : null];
    })
  );

  return {
    window: a.metrics.window,
    sameRawSignals:
      JSON.stringify(off.scan.signals.map((s) => s.time)) === JSON.stringify(on.scan.signals.map((s) => s.time)),
    off: A,
    on: B,
    onMinusOff: delta,
    entries: {
      common: [...onKeys.keys()].filter((k) => offKeys.has(k)).length,
      addedByOn: [...onKeys].filter(([k]) => !offKeys.has(k)).map(([, t]) => row(on, t)),
      removedByOn: [...offKeys].filter(([k]) => !onKeys.has(k)).map(([, t]) => row(off, t))
    },
    eligibility:
      g && g.eligibility.enabled
        ? {
            opportunities: g.eligibility.opportunities,
            endedBy: g.eligibility.endedBy,
            takenLater: g.eligibility.takenLater,
            meanAgeSessionsAtDecision: g.eligibility.ageSessionsAtDecision.mean,
            maxAgeSessionsAtDecision: g.eligibility.ageSessionsAtDecision.max
          }
        : null,
    trendFilter:
      g && g.trendFilter.enabled
        ? { evaluations: g.trendFilter.evaluations, blocked: g.trendFilter.blockedByDecisionKind }
        : null,
    bySourceOn: g?.bySource ?? null
  };
};

const usd = (x: number | null) =>
  x === null ? 'n/a' : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const pairedMarkdown = (report: {
  request: LabRunRequest;
  perSymbol: Record<string, ReturnType<typeof pairedComparison>>;
  partitions: string;
}) => {
  const lines = [
    `# Paired diagnostic: entry gates ON vs both OFF (${STRATEGY_KEY}@${STRATEGY_VERSION})`,
    '',
    `> ${RETROSPECTIVE_NOTE}`,
    '',
    `Window ${report.request.from} → ${report.request.to} (${report.partitions}), resolution ${report.request.resolution}, symbols ${report.request.symbols.join(', ')}.`,
    ''
  ];
  for (const [sym, c] of Object.entries(report.perSymbol)) {
    lines.push(
      `## ${sym}`,
      '',
      `Same raw signals in both runs: ${c.sameRawSignals ? 'yes' : 'NO'}. Entries: ${c.entries.common} common, ${c.entries.addedByOn.length} only ON, ${c.entries.removedByOn.length} only OFF.`,
      ''
    );
    lines.push('| | OFF | ON | ON − OFF |', '| --- | ---: | ---: | ---: |');
    for (const k of Object.keys(c.off) as (keyof typeof c.off)[]) {
      const money = /Usd$/.test(k);
      const f = (v: unknown) =>
        v === null ? 'n/a' : money ? usd(v as number) : String(typeof v === 'number' ? r2(v) : v);
      lines.push(`| ${k} | ${f(c.off[k])} | ${f(c.on[k])} | ${f(c.onMinusOff[k])} |`);
    }
    if (c.eligibility)
      lines.push(
        '',
        `Eligibility: ${c.eligibility.opportunities} opportunities; ended by ${Object.entries(c.eligibility.endedBy)
          .map(([k, n]) => `${k} ${n}`)
          .join(
            ', '
          )}; ${c.eligibility.takenLater} taken later; age at decision mean ${c.eligibility.meanAgeSessionsAtDecision?.toFixed(2) ?? 'n/a'}, max ${c.eligibility.maxAgeSessionsAtDecision ?? 'n/a'} session(s).`
      );
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const args = process.argv.slice(2);
  const opt = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const base = process.env.INIT_CWD ?? process.cwd();
  const file = opt('--request');
  if (!file) throw new Error('usage: paired-comparison.ts --request <request.json> [--out <dir>]');
  const request = JSON.parse(readFileSync(isAbsolute(file) ? file : resolve(base, file), 'utf8')) as LabRunRequest & {
    runId?: string;
  };
  const body: LabRunRequest = { ...request };
  delete (body as { runId?: string }).runId; // a run directory's request.json carries its run id
  const symbols = new Set(body.symbols);
  const errors = validateRunRequest(body, symbols);
  if (errors.length) throw new Error(`invalid request: ${errors.join('; ')}`);
  if (body.strategyKey !== STRATEGY_KEY || body.strategyVersion !== STRATEGY_VERSION)
    throw new Error(
      `a ${STRATEGY_KEY}@${STRATEGY_VERSION} request is needed (got ${body.strategyKey}@${body.strategyVersion})`
    );
  const on: RiseTradingParams = paramsOf(body);
  if (!on.trendFilter && !on.eligibility)
    throw new Error('both entry gates are OFF in this request: nothing to compare');
  const off: RiseTradingParams = { ...on, trendFilter: null, eligibility: null };
  const cfg = readPartitionConfig(join(process.cwd(), 'data'));
  const touched = (['training', 'holdout', 'final'] as const).filter((p) => {
    const { start, end } = cfg.partitions[p];
    return (end === null || body.from <= end) && (start === null || body.to >= start);
  });
  if (touched.some((p) => p !== 'training'))
    console.error(
      `note: the window touches ${touched.join('+')} dates — data exposure for any future study of this question`
    );
  const perSymbol: Record<string, ReturnType<typeof pairedComparison>> = {};
  for (const symbol of body.symbols) {
    const loaded = await loadDatasetSessions({
      dataset: resolveDataset(symbol, 'all'),
      startDate: body.from,
      endDate: body.to,
      warmupSessions: Math.max(warmupSessionsForParams(on), warmupSessionsForParams(off)),
      access: 'manual evaluation'
    });
    const hash = loaded.report!.dataSha256!;
    perSymbol[symbol] = pairedComparison(
      runRiseTrading(symbol, loaded.history, loaded.warmup, off, hash),
      runRiseTrading(symbol, loaded.history, loaded.warmup, on, hash)
    );
    console.error(
      `${symbol}: ON − OFF marked net ${usd(perSymbol[symbol].onMinusOff.markedNetUsd as number)} (retrospective)`
    );
  }
  const report = {
    kind: 'growth paired entry-gate diagnostic',
    note: RETROSPECTIVE_NOTE,
    engine: { key: STRATEGY_KEY, version: STRATEGY_VERSION },
    request: body,
    partitions: touched.join('+'),
    on: { trendFilter: on.trendFilter, eligibility: on.eligibility, continuation: on.continuation ?? null },
    off: { trendFilter: null, eligibility: null, continuation: off.continuation ?? null },
    perSymbol
  };
  const out = opt('--out') ? resolve(base, opt('--out')!) : mkdtempSync(join(tmpdir(), 'growth-paired-'));
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'paired-comparison.json'), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(out, 'paired-comparison.md'), pairedMarkdown(report));
  console.error(`wrote ${join(out, 'paired-comparison.json')} and .md`);
};

if (import.meta.url === `file://${process.argv[1]}`) await main();
