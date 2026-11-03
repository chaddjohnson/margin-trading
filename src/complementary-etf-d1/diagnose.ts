// Post hoc, non-decisional diagnostics of the Stage A result (OPPORTUNITY_SCREEN.md §5), on the training partition
// only. They ask whether the daily proxy misjudges what D1 itself would find, by classifying actual minute-level D1
// trades against the exact All-lowDd fixed-pool occupancy of the screen:
//   - the unchanged D1 (the shipped constants) on each of the seven candidates;
//   - the eight-ETF program's frozen XLE vectors (research/multi-etf-d1/FROZEN_CANDIDATES.json), the one candidate
//     with an existing optimization; their training trades are in-sample;
//   - the p15 proxies of the screen, with the same displacement accounting.
// A trade is fundable when no funded baseline lot holds the pool at its decision minute (shadow semantics: otherwise
// it is refused and adds nothing). A fundable trade displaces the baseline lots whose decisions fall inside its
// holding interval. The first-order incremental value is Σ over fundable trades of (its net − the displaced lots'
// net); it ignores the path effects a full allocator run would add (a displaced book's later signals, the candidate's
// own later signals). Nothing here selects, ranks or changes anything.
import path from 'node:path';
import fs from 'fs-extra';
import type { Trade } from '../d1-refinement/engine.ts';
import type { IntParams } from '../d1-refinement/families.ts';
import { type Manifest, verifyManifestHash } from '../multi-etf-d1/freeze.ts';
import { cachesFor, developmentSpec, evaluateOne } from '../multi-etf-d1/evaluation.ts';
import { d1Params, describe } from '../multi-etf-d1/space.ts';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { candidates, formatDollars, log, stageDir, study, writeJson, writeText } from './context.ts';
import { trainingTickerData } from './data.ts';
import { requireProtocolFrozen } from './freeze.ts';
import { type Interval, baselinePool } from './screen.ts';

const eightEtfManifest = 'research/multi-etf-d1/FROZEN_CANDIDATES.json';

interface Classified {
  decision: string;
  exit: string;
  net: number;
  fundable: boolean;
  displaced: { symbol: string; decision: string; net: number }[];
  incremental: number; // fundable: net − displaced net; refused: 0
}

export const classify = (decisionTime: number, exitTime: number, net: number, funded: Interval[]): Classified => {
  const fundable = !funded.some((interval) => interval.start <= decisionTime && interval.end > decisionTime);
  const displaced = fundable
    ? funded
        .filter((interval) => interval.start > decisionTime && interval.start <= exitTime)
        .map((interval) => ({
          symbol: interval.symbol,
          decision: new Date(interval.start * 1000).toISOString(),
          net: interval.net
        }))
    : [];

  return {
    decision: new Date(decisionTime * 1000).toISOString(),
    exit: Number.isFinite(exitTime) ? new Date(exitTime * 1000).toISOString() : 'open',
    net,
    fundable,
    displaced,
    incremental: fundable ? net - displaced.reduce((total, lot) => total + lot.net, 0) : 0
  };
};

const summarize = (rows: Classified[]) => {
  const fundable = rows.filter((row) => row.fundable);
  const clean = fundable.filter((row) => row.displaced.length === 0);
  const incremental = fundable.map((row) => row.incremental);
  const best = incremental.length > 0 ? Math.max(...incremental) : 0;

  return {
    trades: rows.length,
    net: rows.reduce((total, row) => total + row.net, 0),
    fundable: fundable.length,
    fundableNet: fundable.reduce((total, row) => total + row.net, 0),
    clean: clean.length,
    cleanNet: clean.reduce((total, row) => total + row.net, 0),
    displacedLots: fundable.reduce((total, row) => total + row.displaced.length, 0),
    displacedVgtLots: fundable.reduce(
      (total, row) => total + row.displaced.filter((lot) => lot.symbol === 'VGT').length,
      0
    ),
    displacedNet: fundable.reduce((total, row) => total + row.displaced.reduce((sum, lot) => sum + lot.net, 0), 0),
    incremental: incremental.reduce((total, value) => total + value, 0),
    incrementalWithoutBest: incremental.reduce((total, value) => total + value, 0) - best
  };
};

const d1Trades = async (symbol: string, params: IntParams) => {
  const data = await trainingTickerData(symbol);
  const spec = developmentSpec(data);
  const { metrics, detail } = evaluateOne(data.ds, cachesFor(data.ds), params, spec, true);
  const outcomes = detail!.accounting.outcomes;
  const trades = detail!.trades.map((trade: Trade, index) => ({
    trade,
    net: outcomes[index]!.profit,
    exitTime: trade.exitIndex >= 0 ? trade.exitTime : Infinity
  }));

  return { metrics, trades, data };
};

export const runDiagnose = async () => {
  await requireProtocolFrozen();

  const { funded, baseline } = await baselinePool();
  const screen = (await fs.readJson(stageDir('stageA', 'screen.json'))) as {
    rows: {
      symbol: string;
      proxies: Record<
        string,
        { trades: { entryDate: string; exitDate: string; net5: number; timing: { idleAtEntry: boolean } }[] }
      >;
    }[];
  };
  const manifest = (await fs.readJson(eightEtfManifest)) as Manifest;

  if (!verifyManifestHash(manifest)) {
    throw new Error(`${eightEtfManifest}: the body hash does not verify`);
  }

  const results = [];
  const tradeRows: Record<string, unknown>[] = [];
  const runs: { symbol: string; label: string; params: IntParams }[] = [
    ...candidates.map((symbol) => ({ symbol, label: 'D1 unchanged', params: d1Params() })),
    ...(
      manifest.tickers.XLE as unknown as { nominations: { role: string; id: string; params: IntParams }[] }
    ).nominations.map((nomination) => ({
      symbol: 'XLE',
      label: `eight-ETF frozen ${nomination.role} ${nomination.id}`,
      params: nomination.params
    }))
  ];

  for (const run of runs) {
    const { metrics, trades, data } = await d1Trades(run.symbol, run.params);
    const rows = trades.map(({ trade, net, exitTime }) => classify(trade.decisionTime, exitTime, net, funded));

    results.push({
      symbol: run.symbol,
      label: run.label,
      vector: describe(run.params),
      dataHash: data.dataHash,
      standalone: {
        net: metrics.net,
        minuteDrawdown: metrics.minuteDrawdown,
        entries: metrics.entries,
        wins: metrics.wins,
        losses: metrics.losses
      },
      pool: summarize(rows)
    });
    rows.forEach((row) =>
      tradeRows.push({
        symbol: run.symbol,
        run: run.label,
        decision: row.decision,
        exit: row.exit,
        net: row.net,
        fundable: row.fundable,
        displaced: row.displaced.map((lot) => `${lot.symbol} ${lot.decision} ${lot.net.toFixed(0)}`).join('; '),
        incremental: row.incremental
      })
    );
    log(
      `${run.symbol} ${run.label}: ${rows.length} trades, net ${formatDollars(metrics.net)}; fundable ${rows.filter((row) => row.fundable).length}, first-order incremental ${formatDollars(summarize(rows).incremental)}`
    );
  }

  // The p15 proxies with the same accounting (5 bps), from the screen's record: decision = the entry close.
  const proxies = [];
  const closeTimes = new Map(
    Object.values(baseline.universe.instruments)[0]!.ds.dates.map((date, index) => [
      date,
      Object.values(baseline.universe.instruments)[0]!.ds.sCloseTime[index]!
    ])
  );

  for (const row of screen.rows) {
    const classified = row.proxies.p15!.trades.map((trade) =>
      classify(closeTimes.get(trade.entryDate)!, closeTimes.get(trade.exitDate)!, trade.net5, funded)
    );

    proxies.push({ symbol: row.symbol, pool: summarize(classified) });
  }

  const record = {
    generatedAt: new Date().toISOString(),
    nature: 'post hoc, non-decisional diagnostics of the Stage A result; training partition only',
    window: { first: study.eligibilityDate, last: study.trainingEnd },
    baselineFundedLots: funded.length,
    d1: results,
    proxies
  };
  const dir = stageDir('stageA-diagnostics');

  await writeJson(path.join(dir, 'diagnostics.json'), record);
  await writeText(path.join(dir, 'd1-trades.csv'), toCsv(tradeRows));
  await writeText(path.join(dir, 'DIAGNOSTICS.md'), diagnosticsTables(record));

  return record;
};

type DiagnosticsRecord = Awaited<ReturnType<typeof runDiagnose>>;

function diagnosticsTables(record: DiagnosticsRecord) {
  return [
    `# Stage A diagnostics (post hoc, non-decisional; generated ${record.generatedAt})`,
    '',
    `Training ${record.window.first} → 2023-12-29; the All-lowDd fixed pool's ${record.baselineFundedLots} funded lots. First-order incremental value = Σ over fundable trades of (net − the net of the baseline lots whose decisions fall inside the trade); path effects of a full allocator run are ignored.`,
    '',
    '## Minute-level D1 trades against the pool (0 bps)',
    '',
    '| ETF | Run | Vector | Standalone net / minute DD / entries | Fundable (clean) | Fundable net | Displaced lots (VGT) | Displaced net | First-order incremental | … without the best trade |',
    '|---|---|---|---|---|---:|---|---:|---:|---:|',
    ...record.d1.map(
      (row) =>
        `| ${row.symbol} | ${row.label} | ${row.vector} | ${formatDollars(row.standalone.net)} / ${formatDollars(row.standalone.minuteDrawdown)} / ${row.standalone.entries} | ${row.pool.fundable} of ${row.pool.trades} (${row.pool.clean}) | ${formatDollars(row.pool.fundableNet)} | ${row.pool.displacedLots} (${row.pool.displacedVgtLots}) | ${formatDollars(row.pool.displacedNet)} | ${formatDollars(row.pool.incremental)} | ${formatDollars(row.pool.incrementalWithoutBest)} |`
    ),
    '',
    '## Proxy p15 with the same displacement accounting (5 bps)',
    '',
    '| ETF | Proxies | Fundable (clean) | Fundable net | Displaced lots (VGT) | Displaced net | First-order incremental | … without the best |',
    '|---|---:|---|---:|---|---:|---:|---:|',
    ...record.proxies.map(
      (row) =>
        `| ${row.symbol} | ${row.pool.trades} | ${row.pool.fundable} (${row.pool.clean}) | ${formatDollars(row.pool.fundableNet)} | ${row.pool.displacedLots} (${row.pool.displacedVgtLots}) | ${formatDollars(row.pool.displacedNet)} | ${formatDollars(row.pool.incremental)} | ${formatDollars(row.pool.incrementalWithoutBest)} |`
    )
  ].join('\n');
}
