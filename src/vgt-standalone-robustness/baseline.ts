// The baseline reproduction (PROTOCOL.md §3), run before any comparison is interpreted:
//
//   1. B4, B5 and C0 through the prior audit's runner reproduce the brief's anchors and equal the prior audit's stored
//      base and control records field for field (the prior baseline proved that runner equal to runPoolOn);
//   2. every standalone phenotype at the frozen controls' costs (0, 2, 5, 10 bps; fixed and portfolio) equals
//      research/joint-16-etf-d1 controls.json `all.B1.*` in every summary field (B1 = VGT D1 alone, primary);
//   3. the standalone at 0 bps equals the existing standalone CLI (npm run app -- allIn-trailingBuy-postExitContinuation
//      VGT all … --phenotype primary) trade by trade;
//   4. the shadow-policy identity: the VGT book's virtual trades inside B4 and B5 are the standalone's lots, and the
//      pools' funded VGT lots are a subset of them;
//   5. ledger identities, drawdown labelling, the matched designs equal to the prior MANIFEST.json, determinism.
//
// It writes results/baseline/baseline.json and the base records, and throws (exit 1) on any failure.
import fs from 'fs-extra';
import { summaryOf } from '../joint-16-etf-d1/figures.ts';
import type { NRunResult, NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { loadAuditUniverse } from '../b4-b5-robustness/cli.ts';
import { WorkerRunner } from '../b4-b5-robustness/pool.ts';
import { executeSpec, lotRecordsOf, metricsOf, runSpec } from '../b4-b5-robustness/run.ts';
import { baseRun, controlRun, oatPoints } from '../b4-b5-robustness/specs.ts';
import { readFamily as readPriorFamily } from '../b4-b5-robustness/store.ts';
import {
  type PoolId,
  anchors,
  base,
  cliTradesFile,
  controlCosts,
  controlsFile,
  jsonReplacer,
  nowIso,
  pairedPools,
  priorRoot,
  readJson,
  resultDir,
  writeJson
} from './context.ts';
import {
  type RunSpec,
  type Standalone,
  asPriorSpec,
  loadFrozenPools,
  loadStandalones,
  pairedDesign,
  standaloneBaseRun,
  standaloneControlRuns
} from './specs.ts';
import { appendRun, parseCsv, readFamily, recordFields, revive } from './store.ts';

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

const cents = (value: number) => Math.round(value * 100) / 100;

type Controls = { all: Record<string, Record<string, { summary: Record<string, unknown> }>> };

// Every summary field the frozen controls hold (segments included), compared exactly; NaN/null both mean "none".
const summaryDifferences = (ours: Record<string, unknown>, theirs: Record<string, unknown>) => {
  const differences: string[] = [];
  const normalize = (value: unknown): unknown =>
    typeof value === 'number' && !Number.isFinite(value)
      ? null
      : Array.isArray(value)
        ? value.map(normalize)
        : value && typeof value === 'object'
          ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, normalize(inner)]))
          : value;

  for (const key of Object.keys(theirs)) {
    const a = JSON.stringify(normalize(ours[key]));
    const b = JSON.stringify(normalize(theirs[key]));

    if (a !== b) {
      differences.push(`${key}: ${a?.slice(0, 80)} vs ${b?.slice(0, 80)}`);
    }
  }

  return differences;
};

const executeFrom = (result: NRunResult, spec: RunSpec) =>
  executeSpec({ ...result.universe, instruments: {} } as NUniverse, asPriorSpec(spec), result);

export const baseline = async () => {
  const checks: Check[] = [];
  const check = (name: string, pass: boolean, detail: string) => {
    checks.push({ name, pass, detail });
    console.log(`[baseline] ${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  };
  const started = Date.now();
  const universe = await loadAuditUniverse();
  const pools = await loadFrozenPools();
  const standalones = await loadStandalones();
  const controls = await readJson<Controls>(controlsFile);
  const priorBase = await readPriorFamily('base');
  const priorControl = await readPriorFamily('control');
  const storedBase = await readFamily('s-base');
  const summaries: Record<string, unknown> = {};

  // ---- 1. B4, B5, C0 ----
  const poolResults: Record<string, NRunResult> = {};

  for (const id of pairedPools) {
    for (const mode of ['fixed', 'portfolio'] as const) {
      const spec = baseRun(pools[id], mode);
      const result = runSpec(universe, spec);
      const metrics = metricsOf(result, spec);
      const anchor = anchors[id];
      const prior = priorBase.get(spec.key);

      poolResults[`${id}:${mode}`] = result;
      summaries[`${id}:${mode}`] = metrics;
      check(
        `${id} ${mode}: equals the prior audit's stored base record ${spec.key}`,
        prior !== undefined &&
          JSON.stringify(recordFields(metrics as never)) === JSON.stringify(recordFields(prior as never)),
        prior ? 'every stored field identical' : 'no prior record'
      );

      if (mode === 'fixed') {
        check(`${id} fixed anchor: net`, cents(metrics.net) === anchor.net, `${cents(metrics.net)} vs ${anchor.net}`);
        check(
          `${id} fixed anchor: max minute DD`,
          cents(metrics.minuteDD) === anchor.minuteDrawdown,
          `${cents(metrics.minuteDD)} vs ${anchor.minuteDrawdown}`
        );
        check(`${id} fixed anchor: funded lots`, metrics.lots === anchor.lots, `${metrics.lots} vs ${anchor.lots}`);
      } else {
        check(
          `${id} portfolio anchor: end equity`,
          cents(metrics.endEquity) === anchor.endEquity,
          `${cents(metrics.endEquity)} vs ${anchor.endEquity}`
        );
        check(
          `${id} portfolio anchor: max daily-close % DD (0.01 pp)`,
          Math.round(metrics.dailyPercent * 10000) / 10000 === anchor.dailyPercent,
          `${metrics.dailyPercent} vs ${anchor.dailyPercent}`
        );
        check(
          `${id} portfolio anchor: max minute-sampled % DD (0.01 pp)`,
          Math.round(metrics.minutePercent * 10000) / 10000 === anchor.minutePercent,
          `${metrics.minutePercent} vs ${anchor.minutePercent}`
        );
      }
    }
  }

  const c0 = controlRun();
  const c0Result = runSpec(universe, c0);
  const c0Metrics = metricsOf(c0Result, c0);
  const c0Prior = priorControl.get(c0.key);

  summaries.C0 = c0Metrics;
  check(
    "C0: equals the prior audit's stored control record",
    c0Prior !== undefined &&
      JSON.stringify(recordFields(c0Metrics as never)) === JSON.stringify(recordFields(c0Prior as never)),
    c0Prior ? 'every stored field identical' : 'no prior record'
  );
  check(
    'C0 anchor: end equity',
    cents(c0Metrics.endEquity) === anchors.C0.endEquity,
    `${cents(c0Metrics.endEquity)} vs ${anchors.C0.endEquity}`
  );
  check(
    'C0 anchor: max daily-close % DD (0.01 pp)',
    Math.round(c0Metrics.dailyPercent * 10000) / 10000 === anchors.C0.dailyPercent,
    `${c0Metrics.dailyPercent}`
  );
  check(
    'C0 anchor: max minute-sampled % DD (0.01 pp)',
    Math.round(c0Metrics.minutePercent * 10000) / 10000 === anchors.C0.minutePercent,
    `${c0Metrics.minutePercent}`
  );

  // ---- 2–5. each standalone phenotype ----
  for (const s of standalones) {
    const runs: { spec: RunSpec; costBps: number }[] = [
      ...(['fixed', 'portfolio'] as const).map((mode) => ({ spec: standaloneBaseRun(s, mode), costBps: base.costBps })),
      ...standaloneControlRuns(s)
        .filter((spec) => spec.dividends === 'frozen')
        .map((spec) => ({ spec, costBps: spec.costBps }))
    ];
    const results = new Map<string, NRunResult>();

    for (const { spec, costBps } of runs) {
      const result = runSpec(universe, asPriorSpec(spec));
      const control = controls.all.B1?.[`${spec.mode}-${costBps}`]?.summary;

      results.set(`${spec.mode}-${costBps}`, result);

      if (!controlCosts.includes(costBps as never) || !control) {
        check(`${s.id} ${spec.mode} ${costBps} bps: a frozen control exists`, false, 'no control');
        continue;
      }

      const differences = summaryDifferences(summaryOf(result) as never, control);

      check(
        `${s.id} ${spec.mode} ${costBps} bps: every summary field = ${controlsFile} all.B1.${spec.mode}-${costBps}`,
        differences.length === 0,
        differences.length === 0
          ? `${result.lots.length} lots, net ${cents(result.lots.reduce((t, lot) => t + lot.net, 0))}`
          : differences.slice(0, 4).join('; ')
      );
    }

    for (const mode of ['fixed', 'portfolio'] as const) {
      const spec = standaloneBaseRun(s, mode);
      const result = results.get(`${mode}-${base.costBps}`)!;
      const metrics = metricsOf(result, asPriorSpec(spec));
      const lots = lotRecordsOf(result);

      summaries[`${s.id}:${mode}`] = metrics;

      const identity = Math.max(...lots.map((lot) => Math.abs(lot.gross - lot.friction - lot.interest - lot.net)));
      const yearlyGap = Math.abs(
        Object.values(metrics.yearly).reduce((total, year) => total + year.change, 0) -
          (mode === 'fixed' ? metrics.finalStrategyMark : metrics.endEquity - base.initialEquity)
      );

      check(
        `${s.id} ${mode}: gross − friction − interest = net per lot`,
        identity <= 0.01,
        `largest gap ${identity.toExponential(2)}`
      );
      check(
        `${s.id} ${mode}: yearly attribution sums to the total`,
        yearlyGap <= 0.01,
        `gap ${yearlyGap.toExponential(2)}`
      );
      check(
        `${s.id} ${mode}: minute-sampled DD ≥ daily-close DD`,
        metrics.minuteDD >= metrics.dailyDD - 1e-9,
        `minute ${cents(metrics.minuteDD)} vs daily ${cents(metrics.dailyDD)}`
      );

      if (mode === 'fixed') {
        check(
          `${s.id} fixed: Σ lot net = final strategy mark, no open lot`,
          Math.abs(metrics.net - metrics.finalStrategyMark) <= 0.01 && metrics.openAtEnd === 0,
          `gap ${Math.abs(metrics.net - metrics.finalStrategyMark).toExponential(2)}, open ${metrics.openAtEnd}`
        );
      } else {
        check(
          `${s.id} portfolio: running-peak daily % DD recomputed from daily equity = engine`,
          Math.abs(metrics.recomputedDailyPercent - metrics.dailyPercent) <= 1e-9,
          `${metrics.recomputedDailyPercent} vs ${metrics.dailyPercent}`
        );
      }

      // Stored once: a rerun of the baseline checks the stored record instead of appending a duplicate.
      const output = executeFrom(result, spec);
      const existing = storedBase.get(spec.key);

      if (existing) {
        check(
          `${s.id} ${mode}: equals its stored s-base record`,
          JSON.stringify(existing) === JSON.stringify(JSON.parse(JSON.stringify(output.metrics, jsonReplacer), revive)),
          'every field identical'
        );
      } else {
        await appendRun(spec, output);
      }
    }

    // 3. Trade by trade against the existing standalone CLI (0 bps: the strategy file has no per-side cost).
    if (s.id === 'VGT-primary') {
      const cli = parseCsv(await fs.readFile(cliTradesFile, 'utf8'));
      const ours = lotRecordsOf(results.get('fixed-0')!);
      const dates = universe.dates;
      const mismatches: string[] = [];

      if (cli.length !== ours.length) {
        mismatches.push(`${cli.length} CLI trades vs ${ours.length} lots`);
      }

      cli.forEach((row, index) => {
        const lot = ours[index];

        if (!lot) {
          return;
        }

        const pairs: [string, number | string, number | string, number][] = [
          ['entry date', row.entry_date!, dates[lot.entryIndex]!, 0],
          ['exit date', row.exit_date!, dates[lot.exitIndex]!, 0],
          ['entry price', Number(row.entry_price), lot.entryRawPrice, 1e-9],
          ['exit price', Number(row.exit_price), lot.exitRawPrice, 1e-9],
          ['interest', Number(row.interest), lot.interest, 1e-6],
          ['net', Number(row.profit), lot.net, 1e-6],
          ['entry time', Date.parse(row.entry_time!) / 1000, lot.entryTime, 0],
          ['exit time', Date.parse(row.exit_time!) / 1000, lot.exitTime, 0]
        ];

        for (const [name, a, b, tolerance] of pairs) {
          const equal = typeof a === 'number' ? Math.abs(a - (b as number)) <= tolerance : a === b;

          if (!equal) {
            mismatches.push(`trade ${index + 1} ${name}: CLI ${a} vs engine ${b}`);
          }
        }

        const reason = row.reason!;

        if (reason !== lot.exitReason) {
          mismatches.push(`trade ${index + 1} reason: CLI "${reason}" vs engine "${lot.exitReason}"`);
        }
      });

      check(
        `${s.id} fixed 0 bps = the standalone CLI trade by trade (${cliTradesFile})`,
        mismatches.length === 0,
        mismatches.length === 0
          ? `${cli.length} trades: dates, times, fills, reasons, interest and net equal`
          : mismatches.slice(0, 6).join('; ')
      );

      // 4. The shadow-policy identity, at the base costs.
      const standaloneLots = lotRecordsOf(results.get(`fixed-${base.costBps}`)!);
      const key = (lot: { decisionTime: number; exitTime: number }) => `${lot.decisionTime}>${lot.exitTime}`;
      const standaloneKeys = new Set(standaloneLots.map(key));

      for (const id of pairedPools as readonly PoolId[]) {
        const pool = poolResults[`${id}:fixed`]!;
        const virtual = pool.trades
          .filter((trade) => trade.symbol === 'VGT' && trade.entryIndex >= 0)
          .map((trade) => ({
            decisionTime: trade.decisionTime,
            exitTime: trade.exitIndex >= 0 ? trade.exitTime : NaN,
            net: trade.net
          }));
        const virtualNet = virtual.map((trade) => trade.net);
        const sameTrades =
          virtual.length === standaloneLots.length &&
          virtual.every(
            (trade, index) =>
              key(trade) === key(standaloneLots[index]!) &&
              Math.abs(virtualNet[index]! - standaloneLots[index]!.net) <= 1e-6
          );
        const funded = lotRecordsOf(pool).filter((lot) => lot.symbol === 'VGT');
        const subset = funded.every((lot) => standaloneKeys.has(key(lot)));

        check(
          `${id} fixed: the VGT book's virtual trades = the standalone's lots (shadow policy)`,
          sameTrades,
          `${virtual.length} virtual VGT trades vs ${standaloneLots.length} standalone lots`
        );
        check(
          `${id} fixed: every funded VGT lot is a standalone lot`,
          subset,
          `${funded.length} funded VGT lots of ${standaloneLots.length}; ${standaloneLots.length - funded.length} blocked by another book's slot`
        );
      }
    }
  }

  // 5. The matched designs equal the prior manifest; the OAT points too.
  const manifest = await readJson<{
    samples: { pool: string; design: string; index: number; values: number[] }[];
    oat: { pool: string; symbol: string; key: string; offset: string; value: number; feasible: boolean }[];
  }>(`${priorRoot}/MANIFEST.json`);

  for (const id of pairedPools) {
    const { samples } = pairedDesign(pools, id);
    const stored = manifest.samples.filter((item) => item.pool === id && item.design === 'book-VGT');
    const equal =
      stored.length === samples.length &&
      stored.every((item) => JSON.stringify(item.values) === JSON.stringify(samples[item.index]));

    check(
      `${id} VGT per-book design regenerated = prior MANIFEST.json`,
      equal,
      `${samples.length} samples vs ${stored.length} stored`
    );

    const points = oatPoints(pools[id]).filter((point) => point.symbol === 'VGT');
    const storedOat = manifest.oat.filter((item) => item.pool === id && item.symbol === 'VGT');

    check(
      `${id} VGT OAT points = prior MANIFEST.json`,
      storedOat.length === points.length &&
        points.every((point, index) => point.key === storedOat[index]!.key && point.value === storedOat[index]!.value),
      `${points.length} points`
    );
  }

  // Determinism: in-process twice and through a worker thread.
  const s0 = standalones[0]!;
  const repeat = standaloneBaseRun(s0, 'portfolio');
  const first = JSON.stringify(metricsOf(runSpec(universe, asPriorSpec(repeat)), asPriorSpec(repeat)));
  const second = JSON.stringify(metricsOf(runSpec(universe, asPriorSpec(repeat)), asPriorSpec(repeat)));
  const worker = new WorkerRunner(universe, 1);
  const threaded = JSON.stringify((await worker.run(asPriorSpec(repeat))).metrics);

  await worker.close();
  check(
    'determinism: standalone portfolio twice in-process',
    first === second,
    first === second ? 'identical' : 'differs'
  );
  check('determinism: worker thread = in-process', first === threaded, first === threaded ? 'identical' : 'differs');

  const failures = checks.filter((item) => !item.pass);
  const record = {
    schema: 'vgt-standalone-robustness-baseline-v1',
    generatedAt: nowIso(),
    node: process.version,
    seconds: Math.round((Date.now() - started) / 1000),
    passed: failures.length === 0,
    checks,
    summaries
  };

  await writeJson(resultDir('baseline', 'baseline.json'), record);
  console.log(
    `[baseline] ${checks.length - failures.length}/${checks.length} checks passed → ${resultDir('baseline', 'baseline.json')}`
  );

  if (failures.length > 0) {
    throw new Error(`baseline reproduction failed (${failures.length} checks); the comparison stops here`);
  }
};

export type { Standalone };
