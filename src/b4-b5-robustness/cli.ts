// The audit's commands (`npm run robustness-audit -- <command>`):
//
//   baseline   reproduce B4/B5 (fixed, portfolio frozen and symmetric dividends) and C0 through the audit runner; prove
//              them equal, field for field, to src/pools/run.ts runPoolOn on the pools' own universes, to the
//              regression anchors and to the frozen controls; check the ledger identities and determinism. Stops the
//              audit (exit 1) on any failure.
//   run        execute every run specification of the protocol not yet stored (resumable; --family F, --workers N).
//   status     stored versus pending runs per family.
//   manifest   write MANIFEST.json (fingerprints, rules, sampled configurations, scenarios).
//   analyze    compute every workstream's tables from the stored runs (./analysis.ts).
//   report     render the Markdown reports from the templates and the analysis (./render.ts).
//
// Every command refuses to run unless PROTOCOL.md still hashes to the frozen value and Node is v24.
import crypto from 'node:crypto';
import fs from 'fs-extra';
import { readJson as readControls } from '../portfolio-aware-d1/context.ts';
import { compareValues } from '../portfolio-aware-d1/compare.ts';
import type { NRunResult, NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import { loadNUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { loadPool } from '../pools/load.ts';
import { loadPoolUniverse, runPoolOn } from '../pools/run.ts';
import {
  type PoolId,
  anchors,
  base,
  hasFlag,
  nowIso,
  option,
  poolIds,
  protocolFile,
  protocolSha256,
  requireNode24,
  resultDir,
  writeJson
} from './context.ts';
import { defaultWorkerCount, LocalRunner, type Runner, WorkerRunner } from './pool.ts';
import { executeSpec, lotRecordsOf, metricsOf, runSpec } from './run.ts';
import { type Family, type RunSpec, allSpecs, baseRun, controlRun, loadFrozenPools } from './specs.ts';
import { appendRun, isCurrent, readFamily } from './store.ts';

export const families: Family[] = [
  'base',
  'control',
  'dividends',
  'cost',
  'ablation',
  'oat',
  'boundary',
  'joint',
  'book'
];

export const auditMembers = ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'];

const sha256File = async (file: string) =>
  crypto
    .createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex');

export const requireProtocol = async () => {
  const hash = await sha256File(protocolFile);

  if (hash !== protocolSha256) {
    throw new Error(`${protocolFile} hashes to ${hash}, not the frozen ${protocolSha256}; record an amendment first`);
  }
};

// The canonical `all` universe of every member the audit needs, checked against the pools' pinned conventions.
export const loadAuditUniverse = async (): Promise<NUniverse> => {
  const loaded = await loadNUniverse({
    members: auditMembers,
    partition: 'all',
    access: 'manual evaluation',
    warmupSessions: 0
  });
  const { universe } = loaded;
  const dates = universe.dates;
  const pinned = JSON.parse(await fs.readFile('config/pools/B5.json', 'utf8')).regressionAnchors.dataSha256 as Record<
    string,
    string
  >;

  if (dates[0] !== base.first || dates.at(-1) !== base.end || dates.length !== base.sessions) {
    throw new Error(`the universe spans ${dates[0]} → ${dates.at(-1)} (${dates.length}), not the frozen window`);
  }

  if (dates[universe.eligibilityIndex] !== base.firstEligibleDate) {
    throw new Error(`the first eligible session is ${dates[universe.eligibilityIndex]}, not ${base.firstEligibleDate}`);
  }

  for (const symbol of auditMembers) {
    if (universe.instruments[symbol]!.hash !== pinned[symbol]) {
      throw new Error(
        `${symbol}: data hash ${universe.instruments[symbol]!.hash} differs from the pinned ${pinned[symbol]}`
      );
    }
  }

  return universe;
};

const cents = (value: number) => Math.round(value * 100) / 100;

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

const ignoreRunFields = new Set(['config', 'universe']);

// The stored output of an already computed result (no second engine run).
const executeSpecFrom = (result: NRunResult, spec: RunSpec) => {
  return executeSpec({ ...result.universe, instruments: {} } as NUniverse, spec, result);
};

export const baseline = async () => {
  const checks: Check[] = [];
  const check = (name: string, pass: boolean, detail: string) => {
    checks.push({ name, pass, detail });
    console.log(`[baseline] ${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  };
  const started = Date.now();
  const universe = await loadAuditUniverse();
  const pools = await loadFrozenPools();
  const summaries: Record<string, unknown> = {};
  const controls = await readControls<{ all: Record<string, Record<string, { summary: Record<string, number> }>> }>(
    'research/joint-16-etf-d1/results/controls/controls.json'
  );

  for (const id of poolIds) {
    const pool = await loadPool(id);
    const reference = await loadPoolUniverse(pool, {
      mode: 'portfolio',
      dataset: 'all',
      costBps: base.costBps,
      dividends: 'frozen'
    });
    const variants: { mode: 'fixed' | 'portfolio'; dividends: 'frozen' | 'symmetric'; spec: RunSpec }[] = [
      { mode: 'fixed', dividends: 'frozen', spec: baseRun(pools[id], 'fixed') },
      { mode: 'portfolio', dividends: 'frozen', spec: baseRun(pools[id], 'portfolio') },
      {
        mode: 'portfolio',
        dividends: 'symmetric',
        spec: allSpecs(pools).specs.find((spec) => spec.key === `dividends:${id}:symmetric:portfolio`)!
      }
    ];

    for (const variant of variants) {
      const ours = runSpec(universe, variant.spec);
      const theirs: NRunResult = runPoolOn(pool, reference, {
        mode: variant.mode,
        dataset: 'all',
        costBps: base.costBps,
        dividends: variant.dividends
      });
      const differences = compareValues(ours, theirs, { ignore: ignoreRunFields });

      check(
        `${id} ${variant.mode} ${variant.dividends}: audit runner = runPoolOn`,
        differences.length === 0,
        differences.length === 0
          ? `every lot, signal, trade, daily row, event and drawdown identical (${ours.lots.length} lots, ${ours.daily.length} daily rows)`
          : differences.slice(0, 5).join('; ')
      );

      const metrics = metricsOf(ours, variant.spec);
      const lots = lotRecordsOf(ours);

      summaries[variant.spec.key] = metrics;

      // Ledger identities.
      const identity = Math.max(...lots.map((lot) => Math.abs(lot.gross - lot.friction - lot.interest - lot.net)));
      const markGap = Math.abs(metrics.net - (variant.mode === 'fixed' ? metrics.finalStrategyMark : metrics.net));
      const yearlyGap = Math.abs(
        Object.values(metrics.yearly).reduce((total, year) => total + year.change, 0) -
          ((variant.mode === 'fixed' ? metrics.finalStrategyMark : metrics.endEquity) -
            (variant.mode === 'fixed' ? 0 : base.initialEquity))
      );

      check(
        `${id} ${variant.mode} ${variant.dividends}: gross − friction − interest = net per lot`,
        identity <= 0.01,
        `largest gap $${identity.toExponential(2)}`
      );
      check(
        `${id} ${variant.mode} ${variant.dividends}: yearly attribution sums to the total`,
        yearlyGap <= 0.01,
        `gap $${yearlyGap.toExponential(2)}`
      );

      if (variant.mode === 'fixed') {
        check(
          `${id} fixed: Σ lot net = final strategy mark (no open lot)`,
          markGap <= 0.01 && metrics.openAtEnd === 0,
          `gap $${markGap.toExponential(2)}, open lots ${metrics.openAtEnd}`
        );
      }

      check(
        `${id} ${variant.mode} ${variant.dividends}: minute DD ≥ daily DD`,
        metrics.minuteDD >= metrics.dailyDD - 1e-9,
        `minute $${cents(metrics.minuteDD)} vs daily $${cents(metrics.dailyDD)}`
      );

      if (variant.mode === 'portfolio') {
        check(
          `${id} portfolio ${variant.dividends}: running-peak daily % DD recomputed from daily equity = engine`,
          Math.abs(metrics.recomputedDailyPercent - metrics.dailyPercent) <= 1e-9,
          `recomputed ${metrics.recomputedDailyPercent} vs engine ${metrics.dailyPercent}`
        );
      }

      // Anchors and frozen controls (frozen dividends only).
      if (variant.dividends === 'frozen') {
        const anchor = anchors[id];
        const control = controls.all[id]![`${variant.mode}-5`]!.summary;

        if (variant.mode === 'fixed') {
          check(`${id} fixed anchor: net`, cents(metrics.net) === anchor.net, `${cents(metrics.net)} vs ${anchor.net}`);
          check(
            `${id} fixed anchor: max minute DD`,
            cents(metrics.minuteDD) === anchor.minuteDrawdown,
            `${cents(metrics.minuteDD)} vs ${anchor.minuteDrawdown}`
          );
          check(`${id} fixed anchor: lots`, metrics.lots === anchor.lots, `${metrics.lots} vs ${anchor.lots}`);
        } else {
          check(
            `${id} portfolio anchor: end equity`,
            cents(metrics.endEquity) === anchor.endEquity,
            `${cents(metrics.endEquity)} vs ${anchor.endEquity}`
          );
          check(
            `${id} portfolio anchor: max daily % DD (0.01 pp)`,
            Math.round(metrics.dailyPercent * 10000) / 10000 === anchor.dailyPercent,
            `${metrics.dailyPercent} vs ${anchor.dailyPercent}`
          );
        }

        for (const field of ['net', 'interest', 'lots', 'minuteDrawdown', 'dailyDrawdown'] as const) {
          const value = {
            net: metrics.net,
            interest: metrics.interest,
            lots: metrics.lots,
            minuteDrawdown: metrics.minuteDD,
            dailyDrawdown: metrics.dailyDD
          }[field];

          check(
            `${id} ${variant.mode}: ${field} = frozen control all.${id}.${variant.mode}-5`,
            value === control[field],
            `${value} vs ${control[field]}`
          );
        }

        if (variant.mode === 'portfolio') {
          for (const [field, value] of [
            ['endEquity', metrics.endEquity],
            ['dailyPercent', metrics.dailyPercent],
            ['minutePercent', metrics.minutePercent]
          ] as const) {
            check(
              `${id} portfolio: ${field} = frozen control`,
              value === control[field],
              `${value} vs ${control[field]}`
            );
          }
        }
      }

      if (variant.dividends === 'frozen' || variant.mode === 'portfolio') {
        await appendRun(variant.spec, executeSpecFrom(ours, variant.spec));
      }
    }
  }

  // C0, the no-margin control.
  const c0 = controlRun();
  const c0Result = runSpec(universe, c0);
  const c0Metrics = metricsOf(c0Result, c0);
  const c0Control = controls.all.C0!['portfolio-5']!.summary;

  for (const [field, value] of [
    ['endEquity', c0Metrics.endEquity],
    ['dailyPercent', c0Metrics.dailyPercent],
    ['minutePercent', c0Metrics.minutePercent],
    ['minuteDrawdown', c0Metrics.minuteDD],
    ['dailyDrawdown', c0Metrics.dailyDD]
  ] as const) {
    check(
      `C0 portfolio: ${field} = frozen control all.C0.portfolio-5`,
      value === c0Control[field],
      `${value} vs ${c0Control[field]}`
    );
  }

  check(
    'C0 portfolio: running-peak daily % DD recomputed = engine',
    Math.abs(c0Metrics.recomputedDailyPercent - c0Metrics.dailyPercent) <= 1e-9,
    `${c0Metrics.recomputedDailyPercent} vs ${c0Metrics.dailyPercent}`
  );
  summaries[c0.key] = c0Metrics;
  await appendRun(c0, executeSpecFrom(c0Result, c0));

  // Determinism: the same specification twice, and through a worker thread.
  const repeat = baseRun(pools.B5, 'fixed');
  const first = JSON.stringify(metricsOf(runSpec(universe, repeat), repeat));
  const second = JSON.stringify(metricsOf(runSpec(universe, repeat), repeat));
  const worker = new WorkerRunner(universe, 1);
  const threaded = JSON.stringify((await worker.run(repeat)).metrics);

  await worker.close();
  check('determinism: B5 fixed twice in-process', first === second, first === second ? 'identical' : 'differs');
  check(
    'determinism: B5 fixed in a worker thread = in-process',
    first === threaded,
    first === threaded ? 'identical' : 'differs'
  );

  const failures = checks.filter((item) => !item.pass);
  const record = {
    schema: 'b4-b5-robustness-baseline-v1',
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
    throw new Error(`baseline reproduction failed (${failures.length} checks); the comparative audit stops here`);
  }
};

export const runAll = async (args: string[]) => {
  const pools = await loadFrozenPools();
  const { specs } = allSpecs(pools);
  const only = option(args, 'family') as Family | undefined;
  const selected = only ? specs.filter((spec) => spec.family === only) : specs;
  const stored = new Map<string, Awaited<ReturnType<typeof readFamily>> extends Map<string, infer V> ? V : never>();

  for (const family of families) {
    for (const [key, metrics] of await readFamily(family)) {
      stored.set(key, metrics);
    }
  }

  const pending = selected.filter((spec) => !isCurrent(stored.get(spec.key), spec));

  console.log(
    `[run] ${selected.length} specifications, ${selected.length - pending.length} stored, ${pending.length} to run`
  );

  if (pending.length === 0) {
    return;
  }

  const universe = await loadAuditUniverse();
  const workers = Number(option(args, 'workers') ?? defaultWorkerCount());
  const runner: Runner = hasFlag(args, 'local') ? new LocalRunner(universe) : new WorkerRunner(universe, workers);
  const started = Date.now();
  let done = 0;

  console.log(`[run] ${runner.description}; started ${nowIso()}`);

  try {
    await Promise.all(
      pending.map(async (spec) => {
        const output = await runner.run(spec);

        await appendRun(spec, output);
        done++;

        if (done % 25 === 0 || done === pending.length) {
          console.log(`[run] ${done}/${pending.length} (${Math.round((Date.now() - started) / 1000)} s)`);
        }
      })
    );
  } finally {
    await runner.close();
  }

  console.log(`[run] finished ${nowIso()}`);
};

export const status = async () => {
  const pools = await loadFrozenPools();
  const { specs } = allSpecs(pools);

  for (const family of families) {
    const stored = await readFamily(family);
    const wanted = specs.filter((spec) => spec.family === family);
    const current = wanted.filter((spec) => isCurrent(stored.get(spec.key), spec)).length;

    console.log(
      `${family.padEnd(10)} ${current}/${wanted.length} stored${stored.size > current ? ` (+${stored.size - current} stale or extra)` : ''}`
    );
  }
};

export const runCli = async (args: string[]) => {
  requireNode24();
  await requireProtocol();

  const [command, ...rest] = args;

  switch (command) {
    case 'baseline':
      return baseline();
    case 'run':
      return runAll(rest);
    case 'status':
      return status();
    case 'manifest':
      return (await import('./manifest.ts')).writeManifest();
    case 'analyze':
      return (await import('./analysis.ts')).analyze();
    case 'report':
      return (await import('./render.ts')).render();
    default:
      throw new Error(
        `usage: robustness-audit baseline | run [--family F] [--workers N] [--local] | status | manifest | analyze | report (got ${command ?? 'nothing'})`
      );
  }
};

export type { PoolId };
