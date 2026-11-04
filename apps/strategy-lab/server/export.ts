// The research bundle of one completed run: a deterministic ZIP an analyst (or ChatGPT/Claude) can review WITHOUT the
// Strategy Lab server. Contents (docs/strategy-lab/EXPORTS.md):
//   README.md                    what the run is, its semantics, the files, metric definitions, limitations, checks
//   manifest.json                bundle schema, every file's sha256 and size, provenance, what is unavailable and why
//   run.json                     the run record (inputs, assumptions, provenance, code revision, metrics, phenotype)
//   parameters.json              the parameter snapshot, the effective values, the saved-but-inactive values, the schema
//   artifacts/<file>             UNMODIFIED copies of the run's artifacts, each verified against the run's manifest.json
//                                (events.json also against the database's sha256) before it is included
//   events.csv                   every event, one row, UTC and America/New_York times
//   trades.csv                   the trade ledger (Growth: trades.json; imports and pools: paired from the events)
//   continuation-episodes.csv    Growth with continuation: every episode (window, arming, trigger, end)
//   decision-log.csv             Growth: the chronological decision/state log
//   daily-marks.csv              Growth: the daily marks per symbol
//   attribution.json / .md       per-origin attribution (descriptive, NOT the causal effect) and the continuation counts
// The bundle never changes a run artifact, reads only the allowlisted files of that run's directory, and is refused if
// any text in it contains the server's access token.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

import type { DecisionsFile, SymbolMetrics } from '../shared/artifact-types.ts';
import type { LabEvent, RunDetail } from '../shared/contract.ts';
import { effectiveParams, isActive } from '../shared/params.ts';
import { findStrategy } from '../shared/strategies.ts';
import { readEvents, sha256 } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Repo } from './repo.ts';
import { type ZipEntry, writeZip } from './zip.ts';

export const BUNDLE_SCHEMA = 'strategy-lab.research-bundle';
export const BUNDLE_VERSION = 1;
export const MAX_BUNDLE_BYTES = 400 * 1024 * 1024;

/** The run artifacts a bundle may copy (nothing else in a run directory is ever read). */
export const ARTIFACT_FILES = [
  'request.json',
  'events.json',
  'metrics.json',
  'trades.json',
  'daily.json',
  'decisions.json',
  'provenance.json',
  'import.json',
  'study8-output.json',
  'manifest.json'
];
const MINUTE_FILE = 'minute-marks.csv.gz';

const NY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short'
});
export const newYork = (iso: string | null | undefined) => {
  if (!iso) return '';
  const p = Object.fromEntries(NY.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${p.timeZoneName}`;
};

const cell = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
export const csv = (header: string[], rows: unknown[][]) =>
  `${[header.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n')}\n`;

const value = (e: LabEvent | undefined, key: string) => e?.values.find((v) => v.key === key)?.value ?? null;

interface Bundle {
  filename: string;
  zip: Buffer;
  manifest: Record<string, unknown>;
}

export function buildResearchBundle(cfg: Config, repo: Repo, runId: string, opts: { minuteMarks?: boolean } = {}): Bundle {
  const run = repo.runDetail(runId);
  if (!run) throw new ExportError(404, `no run ${runId}`);
  if (run.status !== 'completed' || !run.artifactDir) throw new ExportError(409, `${runId} is ${run.status}: only completed runs export`);
  const dir = join(cfg.stateDir, run.artifactDir);
  const request = repo.runRequest(runId);
  const unavailable: Record<string, string> = {};
  const files: { name: string; data: Buffer; description: string }[] = [];
  const add = (name: string, data: string | Buffer, description: string) =>
    files.push({ name, data: typeof data === 'string' ? Buffer.from(data, 'utf8') : data, description });

  // 1. Unmodified artifacts, verified before inclusion.
  const stored = existsSync(join(dir, 'manifest.json'))
    ? (JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as { sha256: Record<string, string> }).sha256
    : {};
  const { events } = readEvents(dir, run.artifact.sha256); // throws if events.json no longer matches the database
  const read = (f: string) => {
    if (!existsSync(join(dir, f))) return null;
    const data = readFileSync(join(dir, f));
    if (f !== 'manifest.json' && stored[f] && sha256(data) !== stored[f])
      throw new ExportError(500, `${f} of ${runId} no longer matches its manifest sha256 (restore it from a backup)`);
    return data;
  };
  for (const f of [...ARTIFACT_FILES, ...(opts.minuteMarks ? [MINUTE_FILE] : [])]) {
    const data = read(f);
    if (data) add(`artifacts/${f}`, data, `unmodified copy of the run artifact ${f}${stored[f] ? ' (sha256 verified against the run manifest)' : ''}`);
  }
  if (!opts.minuteMarks)
    unavailable[MINUTE_FILE] = existsSync(join(dir, MINUTE_FILE))
      ? 'not included by default (large); export with "include minute marks" to add it'
      : 'not recorded by this run (runs before Growth 1.1.0, imports and signal-only runs have none)';
  else if (!existsSync(join(dir, MINUTE_FILE))) unavailable[MINUTE_FILE] = 'not recorded by this run';

  const json = (f: string) => {
    const data = read(f);
    return data ? (JSON.parse(data.toString('utf8')) as Record<string, unknown>) : null;
  };
  const metrics = json('metrics.json');
  const tradesFile = json('trades.json') as { trades?: Record<string, Record<string, unknown>[]> } | null;
  const dailyFile = json('daily.json') as { daily?: Record<string, Record<string, unknown>[]> } | null;
  const decisions = json('decisions.json') as DecisionsFile | null;

  // 2. Run record and parameters.
  const publicRun = Object.fromEntries(Object.entries(run).filter(([k]) => k !== 'artifactDir' && k !== 'progress'));
  add('run.json', `${JSON.stringify({ ...publicRun, request }, null, 2)}\n`, 'the run record: inputs, assumptions, provenance, code revision, metrics, phenotype link');
  const spec = findStrategy(run.strategy.key, run.strategy.version);
  const reqParams = (request as { params?: Record<string, unknown> } | null)?.params ?? null;
  add(
    'parameters.json',
    `${JSON.stringify(
      {
        strategy: { ...run.strategy, formerTitle: run.strategyFormerTitle },
        snapshot: run.params,
        effective: spec && reqParams ? effectiveParams(spec, reqParams) : null,
        savedNotApplied:
          spec && reqParams
            ? Object.fromEntries(Object.entries(reqParams).filter(([k]) => !isActive(spec, reqParams, k)))
            : null,
        resolution: run.window.resolution,
        schema: run.paramSchema,
        note: 'effective = the values the engine executed; savedNotApplied = values stored with the request whose switch or method made them inactive'
      },
      null,
      2
    )}\n`,
    'parameter snapshot, effective values, saved-but-inactive values, parameter schema'
  );

  // 3. Events.
  add(
    'events.csv',
    csv(
      ['id', 'symbol', 'kind', 't_utc', 't_new_york', 'time_precision', 'price', 'price_basis', 'trade_id', 'linked_event_id', 'origin', 'method', 'episode', 'reason', 'values_json', 'meta_json'],
      events.map((e) => [
        e.id,
        e.symbol,
        e.kind,
        e.t,
        e.timePrecision === 'day' ? e.t.slice(0, 10) : newYork(e.t),
        e.timePrecision,
        e.price,
        e.priceBasis,
        e.tradeId,
        e.linkedEventId,
        e.meta?.origin ?? value(e, 'origin'),
        e.meta?.method ?? null,
        e.meta?.episode ?? value(e, 'episode'),
        e.reason,
        e.values,
        e.meta
      ])
    ),
    'every event of the run (signals, executed entries and exits, rejected/suppressed signals) with UTC and ET times'
  );

  // 4. Trades.
  const tradeHeader = ['symbol', 'trade', 'status', 'origin', 'method', 'episode', 'decision_utc', 'decision_new_york', 'entry_utc', 'entry_new_york', 'entry_fill', 'entry_price', 'exit_utc', 'exit_new_york', 'exit_reason', 'exit_price', 'shares', 'principal_usd', 'gross_before_costs_usd', 'costs_usd', 'interest_usd', 'net_usd', 'net_return_percent', 'calendar_days_held', 'sessions_held', 'source'];
  if (tradesFile?.trades) {
    const rows = Object.entries(tradesFile.trades).flatMap(([symbol, list]) =>
      list.map((t) => [
        symbol, t.trade, t.status, t.origin ?? 'base_growth', t.method ?? null, t.episode ?? null,
        t.decisionTimeUtc, t.decisionTimeNewYork, t.entryTimeUtc, t.entryTimeNewYork, t.entryFill, t.entryFillPrice,
        t.exitTimeUtc, t.exitTimeNewYork, t.exitReason, t.exitFillPrice ?? t.markPrice, t.shares, t.principal,
        t.grossBeforeCosts, Number(t.entryCost ?? 0) + Number(t.exitCost ?? 0), t.interest, t.net, t.netReturnPercent,
        t.calendarDaysHeld, t.sessionsHeld, t.status === 'open' ? 'trades.json (open: marked at the last close, unrealized)' : 'trades.json'
      ])
    );
    add('trades.csv', csv(tradeHeader, rows), 'the trade ledger from trades.json (origin = the mechanism that opened the trade)');
  } else {
    const entries = events.filter((e) => e.kind === 'executed_entry');
    const byId = new Map(events.map((e) => [e.id, e]));
    const rows = entries.map((en) => {
      const ex = en.linkedEventId ? byId.get(en.linkedEventId) : undefined;
      const paired = ex && ex.linkedEventId === en.id && ex.tradeId === en.tradeId;
      return [
        en.symbol, en.tradeId, paired ? 'closed' : en.meta?.open ? 'open' : 'not linked', en.meta?.entrySetup ?? null, null, null,
        value(en, 'decisionTime'), newYork(value(en, 'decisionTime') as string | null), en.t, newYork(en.t), en.reason, en.price,
        paired ? ex.t : null, paired ? newYork(ex.t) : null, paired ? ex.meta?.exitReason ?? ex.reason : null, paired ? ex.price : null,
        value(en, 'shares'), value(en, 'principal'), paired ? value(ex, 'gross') : null, paired ? value(ex, 'friction') : null,
        paired ? value(ex, 'interest') : null, paired ? value(ex, 'net') : null, null, null, paired ? value(ex, 'sessionsHeld') : null,
        'paired from events.json (tradeId + linkedEventId); the source recorded no separate ledger'
      ];
    });
    if (rows.length) add('trades.csv', csv(tradeHeader, rows), 'the trades, paired from the executed events (no ledger artifact for this run kind)');
    else unavailable['trades.csv'] = 'this run has no executed trades (signal-only or demo run)';
    if (rows.length) unavailable['trades.json'] = 'this run kind records no trade ledger file; trades.csv pairs the executed events instead';
  }

  // 5. Growth: episodes, decision log, daily marks.
  if (decisions?.perSymbol) {
    const episodes = Object.entries(decisions.perSymbol).flatMap(([symbol, d]) => d.episodes.map((e) => ({ symbol, ...e })));
    if (episodes.length)
      add(
        'continuation-episodes.csv',
        csv(
          ['symbol', 'id', 'method', 'opened_by', 'exit_utc', 'exit_new_york', 'exit_price', 'exit_net_usd', 'first_eligible_session', 'last_eligible_session', 'reference_high', 'max_high_in_window', 'armed_utc', 'armed_price', 'trigger_utc', 'trigger_price', 'end', 'end_utc', 'status', 'trade'],
          episodes.map((e) => [
            e.symbol, e.id, e.method, e.openedBy, e.exitTime?.utc, e.exitTime?.newYork, e.exitPrice, e.exitNet,
            e.firstEligibleSession, e.lastEligibleSession, e.referenceHigh, e.maxHighInWindow, e.armed?.utc ?? null,
            e.armed?.price ?? null, e.trigger?.utc ?? null, e.trigger?.price ?? null, e.end, e.endTime?.utc ?? null, e.status, e.trade
          ])
        ),
        'every continuation episode: window, arming, trigger and how it ended'
      );
    else unavailable['continuation-episodes.csv'] = 'continuation was OFF, or no profitable exit opened a window';
    add(
      'decision-log.csv',
      csv(
        ['symbol', 'seq', 't_utc', 't_new_york', 'session', 'event', 'origin', 'method', 'episode', 'trade', 'disposition', 'reason', 'values_json'],
        Object.entries(decisions.perSymbol).flatMap(([symbol, d]) =>
          d.log.map((x) => [symbol, x.seq, x.utc, x.newYork, x.session, x.event, x.origin, x.method, x.episode, x.trade, x.disposition, x.reason, x.values])
        )
      ),
      'the chronological decision/state log (base signals, fills, exits with the net identity, continuation transitions)'
    );
  } else unavailable['decision-log.csv'] = 'not recorded by this run (only Growth 1.1.0 runs write decisions.json)';
  if (dailyFile?.daily)
    add(
      'daily-marks.csv',
      csv(
        ['symbol', 'date', 'close', 'realized_usd', 'unrealized_usd', 'marked_usd', 'held_at_close'],
        Object.entries(dailyFile.daily).flatMap(([symbol, list]) =>
          list.map((d) => [symbol, d.date, d.close, d.realized, d.unrealized, d.marked, d.heldAtClose])
        )
      ),
      'daily marks per symbol (realized + open position marked net of interest at each close)'
    );
  else unavailable['daily-marks.csv'] = 'this run kind records no daily marks (see metrics for the drawdown statistics)';

  // 6. Attribution (descriptive).
  const perSymbol = (metrics?.perSymbol ?? {}) as Record<string, SymbolMetrics>;
  const attribution = Object.fromEntries(
    Object.entries(perSymbol)
      .filter(([, m]) => m && typeof m === 'object' && 'attribution' in m)
      .map(([sym, m]) => [sym, { attribution: m.attribution, continuation: m.continuation, drawdown: m.drawdown, pnl: m.pnl }])
  );
  if (Object.keys(attribution).length) {
    add('attribution.json', `${JSON.stringify(attribution, null, 2)}\n`, 'per-origin attribution (descriptive), continuation counts, drawdowns, P&L per symbol');
    add('attribution.md', attributionMarkdown(attribution), 'the attribution tables in prose form');
  } else unavailable['attribution.json'] = 'no per-origin attribution recorded (runs before Growth 1.1.0, imports, signal-only)';

  // 7. README and manifest (deterministic: the run's own completion time is the bundle's timestamp).
  const stamp = new Date(run.completedAt ?? run.createdAt);
  add('README.md', readme(run, request, files.map((f) => [f.name, f.description]), unavailable, Boolean(opts.minuteMarks)), 'this description');
  const sorted = [...files].sort((a, b) => (a.name < b.name ? -1 : 1));
  const manifest = {
    schema: BUNDLE_SCHEMA,
    schemaVersion: BUNDLE_VERSION,
    runId: run.id,
    title: run.title,
    strategy: run.strategy,
    exportedFor: run.completedAt,
    options: { minuteMarks: Boolean(opts.minuteMarks) },
    source: {
      eventsSha256: run.artifact.sha256,
      runManifestSha256: stored,
      note: 'artifacts/ holds unmodified copies; their sha256 equal the run manifest (and events.json the database record)'
    },
    files: Object.fromEntries(sorted.map((f) => [f.name, { sha256: sha256(f.data), bytes: f.data.length, description: f.description }])),
    unavailable
  };
  const entries: ZipEntry[] = [...sorted.map((f) => ({ name: f.name, data: f.data })), { name: 'manifest.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) }];
  const total = entries.reduce((n, e) => n + e.data.length, 0);
  if (total > MAX_BUNDLE_BYTES) throw new ExportError(413, `the bundle would be ${Math.round(total / 1e6)} MB (limit ${MAX_BUNDLE_BYTES / 1e6} MB)`);
  if (cfg.token) {
    const token = Buffer.from(cfg.token, 'utf8');
    for (const e of entries) {
      const text = e.name.endsWith('.gz') ? gunzipSync(e.data) : e.data;
      if (text.includes(token)) throw new ExportError(500, `refusing to export: ${e.name} contains the access token`);
    }
  }
  return {
    filename: `strategy-lab-${run.id}${opts.minuteMarks ? '-with-minute-marks' : ''}.zip`,
    zip: writeZip(entries.sort((a, b) => (a.name < b.name ? -1 : 1)), stamp),
    manifest
  };
}

export class ExportError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const usd = (x: unknown) => (typeof x === 'number' ? `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}` : 'n/a');

function attributionMarkdown(a: Record<string, Pick<SymbolMetrics, 'attribution' | 'continuation' | 'drawdown' | 'pnl'>>) {
  const lines = ['# Attribution by entry origin (descriptive)', '', a[Object.keys(a)[0]!]?.attribution?.note ?? '', ''];
  for (const [sym, x] of Object.entries(a)) {
    lines.push(`## ${sym}`, '', '| Origin | Entries | Closed (W/L/0) | Open | Realized net | Gross before costs | Costs | Interest | Unrealized |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const [k, v] of Object.entries(x.attribution?.byOrigin ?? {}))
      lines.push(`| ${k} | ${v.entries} | ${v.closed} (${v.wins}/${v.losses}/${v.breakeven}) | ${v.open} | ${usd(v.realizedNetUsd)} | ${usd(v.realizedGrossBeforeCostsUsd)} | ${usd(v.realizedCostsUsd)} | ${usd(v.realizedInterestUsd)} | ${usd(v.unrealizedNetUsd)} |`);
    const c = x.continuation;
    if (c?.enabled)
      lines.push('', `Continuation (${c.method}): ${c.episodes} episode(s) from ${c.qualifyingExits} qualifying exit(s); ended by ${Object.entries(c.endedBy ?? {}).map(([k, n]) => `${k} ${n}`).join(', ')}; ${c.armed} armed; ${c.filled} filled; ${c.suppressedBasePriority} suppressed by base priority; ${c.expiredWithLaterHigherHigh} expired although a higher high followed in the window.`);
    else lines.push('', 'Continuation: OFF.');
    lines.push('', `Drawdown (minute / daily): ${usd(x.drawdown?.minute?.maximumUsd)} / ${usd(x.drawdown?.daily?.maximumUsd)}. Total marked net: ${usd(x.pnl?.totalMarkedNetUsd)}.`, '');
  }
  return `${lines.join('\n')}\n`;
}

function readme(run: RunDetail, request: unknown, files: [string, string][], unavailable: Record<string, string>, minute: boolean) {
  const pool = run.strategy.key === 'study8-d1-pool';
  const growth = run.strategy.key === 'rise-from-recent-low-trading';
  const semantics = pool
    ? 'SHARED-SLOT POOL: one allocator replay with ONE funded $100,000 slot shared by its books (first executable signal wins, no preemption). Per-symbol figures are the books’ lots inside that one pool — never independent backtests, never to be summed with anything.'
    : growth
      ? 'STANDALONE PER SYMBOL: each symbol is an independent backtest on its own $100,000 fixed notional (all-in or flat, never compounded). Per-symbol results are never summed and are not comparable with a shared-slot pool.'
      : run.strategy.key === 'rise-from-recent-low'
        ? 'SIGNAL-ONLY: entry signals and their forward outcomes; no positions, fills, exits or P&L.'
        : 'See run.json for the run’s semantics.';
  const origin = run.kind === 'import' ? 'IMPORTED (a replay produced outside Strategy Lab and verified on import)' : run.dataOrigin === 'synthetic' ? 'SYNTHETIC demo data — not market data' : 'SIMULATED by Strategy Lab on real local minute data';
  return `# Strategy Lab research bundle — ${run.id}

**${run.title}**

| | |
| --- | --- |
| Run | ${run.id} (${run.kind}, ${run.status}); variation ${run.variation.id}; experiment ${run.experiment.title} |
| Strategy | ${run.strategy.title} — \`${run.strategy.key}@${run.strategy.version}\`${run.strategyFormerTitle ? ` (formerly “${run.strategyFormerTitle}”)` : ''} |
| Phenotype | ${run.phenotype ? `${run.phenotype.id} \`${run.phenotype.key}\` from study \`${run.phenotype.study}\`${run.phenotype.edited ? ' — EDITED (a derived variation, not the frozen phenotype)' : ''}` : 'none'} |
| Symbols | ${run.symbols.join(', ')} |
| Window | ${run.window.from} → ${run.window.to} (New York session dates, inclusive); resolution ${run.window.resolution ?? 'n/a'}; partitions touched: ${run.window.partition ?? 'n/a'} |
| Data | ${origin} |
| Semantics | ${semantics} |
| Completed | ${run.completedAt ?? 'n/a'} (UTC) |

## What the numbers mean

- **Net P&L** = gross − per-side costs − margin interest (11% simple, per calendar day between session dates, 365-day year), on the fixed $100,000 notional. **Realized** = closed trades; **unrealized** = an open position marked at the last close net of accrued interest (its exit cost not charged).
- **Drawdowns** are falls of the marked net (realized + open position) from an earlier peak: *minute* at every minute close and session close, *daily* at session closes; % = of the $100,000 notional, not of equity.
- **Times** are stored in UTC (\`…Z\`); the \`*_new_york\` columns give America/New_York wall-clock time with EST/EDT. \`time_precision\`: minute, session-close (a daily bar's close), day (date only) or unknown.
- **Origin** (Growth 1.1.0): \`base_growth\` = the Rise-from-Recent-Low entry; \`continuation\` = an entry of the selected continuation method. Origin-attributed P&L is DESCRIPTIVE: it is not the incremental effect of enabling a method, because enabling it changes the whole later trade sequence. Compare a complete ON run with an otherwise identical OFF run for the counterfactual.
- **Exploratory, not validated.** A single run on historical data (often already inspected) is not evidence of an edge, and a rerun of a study's phenotype on exposed dates is not another holdout.

## Files

| File | Contents |
| --- | --- |
${([...files, ['manifest.json', 'sha256 and size of every file, provenance, unavailable items']] as [string, string][]).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([n, d]) => `| \`${n}\` | ${d} |`).join('\n')}

## Not available in this bundle

${Object.keys(unavailable).length ? Object.entries(unavailable).map(([k, v]) => `- \`${k}\`: ${v}`).join('\n') : '- nothing'}
${minute ? '\n`artifacts/minute-marks.csv.gz`: gzip CSV `symbol,t_unix_utc,marked_net_usd` — one row per CHANGE of the minute-marked net (it holds until the next row), rounded to cents.\n' : ''}
## How to check it independently

1. \`sha256sum\` every file against \`manifest.json\`; the files under \`artifacts/\` also against \`artifacts/manifest.json\` (the run's own manifest, written when the run completed).
2. Per trade: \`net_usd\` = \`gross_before_costs_usd\` − \`costs_usd\` − \`interest_usd\` (to the cent); interest = 100,000 × 0.11 × calendar days between the entry and exit session dates / 365.
3. Entries and exits pair only by \`trade_id\` and \`linked_event_id\`; every executed entry fills strictly after its decision time.
4. Growth: the totals in \`artifacts/metrics.json\` (per symbol: realized + unrealized = total marked net) equal the sums of \`trades.csv\`.
5. The request (\`artifacts/request.json\`, parameters in \`parameters.json\`) plus the code revision in \`run.json\` reproduce the run: \`node --experimental-transform-types apps/strategy-lab/scripts/replay-run.ts ${run.id}\` on the machine that holds the data.
${request ? '' : '\nThis run was not created from a Strategy Lab request (an import or demo): see `artifacts/import.json` or `run.json` provenance.\n'}`;
}
