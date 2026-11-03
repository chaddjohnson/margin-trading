// The study's commands (`npm run vgt-robustness -- <command>`):
//
//   baseline                reproduce B4/B5/C0 (anchors, prior stored records) and every standalone phenotype (frozen
//                           B1 controls at 0/2/5/10 bps, the standalone CLI trade by trade, the shadow identity);
//                           exit 1 on any failure (./baseline.ts)
//   run [--family F] [--workers N] [--local]
//                           every protocol run not yet stored (resumable)
//   status                  stored versus pending runs per family
//   manifest                MANIFEST.json (fingerprints, designs, scenarios, run keys)
//   analyze                 results/analysis.json + CSV tables (./analysis.ts)
//   report                  the Markdown reports from templates/ + analysis.json (./render.ts)
//   verify                  the read-only inputs unchanged, the prior audit and the prospective freeze intact, the
//                           stored records equal to MANIFEST.json
//   fixed [ID] [--cost-bps N] [--out DIR] [--json]
//   portfolio [ID] [--cost-bps N] [--out DIR] [--json]
//                           one standalone phenotype (default VGT-primary) on `all`: the readable summary and every
//                           funded trade; writes trades.csv / trades.json / summary.json under evaluations/ (git-ignored)
//   compare [--cost-bps N]  the standalone phenotypes, B4, B5 and C0 side by side on identical data, capital and costs
//
// The script loads no .env file and reads no credential; nothing is downloaded and no broker is contacted.
import path from 'node:path';
import fs from 'fs-extra';
import { loadAuditUniverse } from '../b4-b5-robustness/cli.ts';
import { defaultWorkerCount, LocalRunner, type Runner, WorkerRunner } from '../b4-b5-robustness/pool.ts';
import { type RunMetrics, lotRecordsOf, metricsOf, runSpec } from '../b4-b5-robustness/run.ts';
import { baseRun, controlRun } from '../b4-b5-robustness/specs.ts';
import { newYork } from '../pools/run.ts';
import {
  type StandaloneId,
  base,
  hasFlag,
  nowIso,
  option,
  priorProtocolSha256,
  priorRoot,
  protocolFile,
  protocolSha256,
  requireNode24,
  sha256Of,
  standalonePhenotypes
} from './context.ts';
import {
  type Family,
  type RunSpec,
  allSpecs,
  asPriorSpec,
  families,
  loadFrozenPools,
  loadStandalones
} from './specs.ts';
import { appendRun, isCurrent, readFamily, toCsv } from './store.ts';

export const requireProtocol = async () => {
  const hash = await sha256Of(protocolFile);

  if (!protocolSha256 || hash !== protocolSha256) {
    throw new Error(
      `${protocolFile} hashes to ${hash}, not the frozen ${protocolSha256 || '(not yet frozen)'}; record an amendment first`
    );
  }

  const prior = await sha256Of(`${priorRoot}/PROTOCOL.md`);

  if (prior !== priorProtocolSha256) {
    throw new Error(`${priorRoot}/PROTOCOL.md changed (${prior}); the prior audit's records cannot be reused`);
  }
};

export const runAll = async (args: string[]) => {
  const { specs } = allSpecs(await loadFrozenPools(), await loadStandalones());
  const only = option(args, 'family') as Family | undefined;

  if (only && !families.includes(only)) {
    throw new Error(`--family must be one of ${families.join(', ')}`);
  }

  const selected = only ? specs.filter((spec) => spec.family === only) : specs;
  const stored = new Map<string, RunMetrics>();

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
        const output = await runner.run(asPriorSpec(spec));

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

  console.log(`[run] finished ${nowIso()} (${Math.round((Date.now() - started) / 1000)} s)`);
};

export const status = async () => {
  const { specs } = allSpecs(await loadFrozenPools(), await loadStandalones());

  for (const family of families) {
    const stored = await readFamily(family);
    const wanted = specs.filter((spec) => spec.family === family);
    const current = wanted.filter((spec) => isCurrent(stored.get(spec.key), spec)).length;

    console.log(
      `${family.padEnd(10)} ${current}/${wanted.length} stored${stored.size > current ? ` (+${stored.size - current} stale or extra)` : ''}`
    );
  }
};

// ----- the readable single-run commands -----

const money = (value: number) =>
  `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value: number) => `${(value * 100).toFixed(2)}%`;

const standaloneOf = async (id: string | undefined) => {
  const standalones = await loadStandalones();
  const wanted = (id ?? 'VGT-primary') as StandaloneId;
  const found = standalones.find((item) => item.id === wanted || item.phenotype === wanted);

  if (!found) {
    throw new Error(
      `no standalone phenotype ${wanted}; known: ${standalonePhenotypes.map((item) => item.id).join(', ')}`
    );
  }

  return found;
};

const costOf = (args: string[]) => {
  const raw = option(args, 'cost-bps');
  const costBps = raw === undefined ? base.costBps : Number(raw);

  if (!(Number.isFinite(costBps) && costBps >= 0 && costBps <= 100)) {
    throw new Error('--cost-bps must be a number of basis points per side from 0 to 100');
  }

  return costBps;
};

const positional = (args: string[]) =>
  args.find((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));

export const single = async (mode: 'fixed' | 'portfolio', args: string[]) => {
  const s = await standaloneOf(positional(args));
  const costBps = costOf(args);
  const spec: RunSpec = {
    key: `show:${s.id}:${mode}:${costBps}bps`,
    family: 's-base',
    pool: s.id,
    mode,
    books: [s.book],
    rate: base.rate,
    costBps,
    stopSlippageBps: 0,
    stopFill: 'stop',
    dividends: 'frozen',
    diagnostic: costBps !== base.costBps,
    detail: true,
    meta: {}
  };
  const universe = await loadAuditUniverse();
  const result = runSpec(universe, asPriorSpec(spec));
  const metrics = metricsOf(result, asPriorSpec(spec));
  const lots = lotRecordsOf(result);
  let cumulative = 0;
  const rows = lots.map((lot) => {
    cumulative += lot.net;

    return {
      strategy: `D1 standalone ${s.id}`,
      symbol: lot.symbol,
      entryTime: newYork(lot.entryTime),
      exitTime: lot.exitIndex >= 0 ? newYork(lot.exitTime) : 'open',
      entryFill: lot.entryRawPrice,
      exitFill: lot.exitRawPrice,
      shares: lot.shares,
      principal: lot.principal,
      exitReason: lot.exitReason,
      gross: lot.gross,
      interest: lot.interest,
      friction: lot.friction,
      net: lot.net,
      cumulativeNet: cumulative,
      worstMark: lot.worstMark
    };
  });

  if (hasFlag(args, 'json')) {
    console.log(JSON.stringify({ metrics, trades: rows }, null, 1));
  } else {
    console.log(`D1 standalone ${s.id} (${s.file} ${s.phenotype}), ${mode}, canonical all ${base.first} → ${base.end}`);
    console.log(
      `${costBps} bps per side, ${(base.rate * 100).toFixed(0)}% simple interest, arming from ${base.firstEligibleDate}; ` +
        (mode === 'fixed'
          ? `one $${base.notional.toLocaleString('en-US')} lot at a time, never compounded`
          : `$${base.initialEquity.toLocaleString('en-US')} 60/40 VOOG/VGT core, ${base.borrowedFraction * 100}% of marked equity borrowed per lot`)
    );
    console.log('');
    console.log(
      '#  entry (ET)           exit (ET)            entry fill  exit fill   principal      reason              net          cumulative'
    );

    rows.forEach((row, index) => {
      console.log(
        `${String(index + 1).padStart(2)} ${row.entryTime.padEnd(20)} ${row.exitTime.padEnd(20)} ${row.entryFill.toFixed(2).padStart(10)} ${row.exitFill.toFixed(2).padStart(10)} ${money(row.principal).padStart(14)} ${row.exitReason.padEnd(19)} ${money(row.net).padStart(12)} ${money(row.cumulativeNet).padStart(14)}`
      );
    });
    console.log('');
    console.log(
      `Lots ${metrics.lots} (${metrics.wins} won, ${metrics.losses} lost), net ${money(metrics.net)} after interest ${money(metrics.interest)} and friction ${money(metrics.friction)}`
    );

    if (mode === 'fixed') {
      console.log(
        `Max drawdown of the strategy mark: daily close ${money(metrics.dailyDD)} (${pct(metrics.dailyDD / base.notional)} of the $100,000 notional), minute-sampled ${money(metrics.minuteDD)} (${pct(metrics.minuteDD / base.notional)})`
      );
    } else {
      console.log(
        `End equity ${money(metrics.endEquity)}; max portfolio drawdown (running peak): daily close ${pct(metrics.dailyPercent)}, minute-sampled ${pct(metrics.minutePercent)}`
      );
    }
  }

  const outDir = option(args, 'out') ?? path.join('evaluations', 'vgt-robustness', `${s.id}-${mode}-${costBps}bps`);

  if (path.resolve(outDir).startsWith(path.resolve('research'))) {
    throw new Error('--out may not be inside research/ (the study records are written only by `run`)');
  }

  await fs.outputFile(path.join(outDir, 'trades.csv'), toCsv(rows));
  await fs.outputFile(path.join(outDir, 'trades.json'), `${JSON.stringify(rows, null, 1)}\n`);
  await fs.outputFile(
    path.join(outDir, 'summary.json'),
    `${JSON.stringify({ ...metrics, lotsBrief: undefined }, null, 1)}\n`
  );
  console.error(`[vgt-robustness] wrote trades.csv, trades.json and summary.json to ${outDir}`);
};

export const compare = async (args: string[]) => {
  const costBps = costOf(args);
  const universe = await loadAuditUniverse();
  const pools = await loadFrozenPools();
  const standalones = await loadStandalones();
  const c0 = metricsOf(runSpec(universe, controlRun()), controlRun());
  const rows: { name: string; fixed: RunMetrics; portfolio: RunMetrics }[] = [];
  const withCost = (spec: RunSpec): RunSpec => ({ ...spec, costBps });

  for (const s of standalones) {
    const pair = (['fixed', 'portfolio'] as const).map((mode) => {
      const spec = withCost({
        key: `compare:${s.id}:${mode}`,
        family: 's-base',
        pool: s.id,
        mode,
        books: [s.book],
        rate: base.rate,
        costBps,
        stopSlippageBps: 0,
        stopFill: 'stop',
        dividends: 'frozen',
        diagnostic: false,
        detail: false,
        meta: {}
      });

      return metricsOf(runSpec(universe, asPriorSpec(spec)), asPriorSpec(spec));
    });

    rows.push({ name: `${s.id} standalone`, fixed: pair[0]!, portfolio: pair[1]! });
  }

  for (const id of ['B4', 'B5'] as const) {
    const pair = (['fixed', 'portfolio'] as const).map((mode) => {
      const spec = { ...baseRun(pools[id], mode), costBps };

      return metricsOf(runSpec(universe, spec), spec);
    });

    rows.push({ name: `${id} shared pool`, fixed: pair[0]!, portfolio: pair[1]! });
  }

  console.log(
    `Canonical all ${base.first} → ${base.end}; ${costBps} bps per side; ${(base.rate * 100).toFixed(0)}% interest; fixed = one $100,000 lot; portfolio = $300,000 60/40 core, 20% of equity per lot`
  );
  console.log('');
  console.log(
    'configuration          fixed net      lots  min-DD($)    net/$1M-day  | end equity      vs C0          daily %DD  minute %DD'
  );

  for (const row of rows) {
    const f = row.fixed;
    const p = row.portfolio;

    console.log(
      `${row.name.padEnd(22)} ${money(f.net).padStart(13)} ${String(f.lots).padStart(5)} ${money(f.minuteDD).padStart(12)} ${money((f.net / f.borrowingDollarDays) * 1e6).padStart(12)}  | ${money(p.endEquity).padStart(15)} ${money(p.endEquity - c0.endEquity).padStart(14)} ${pct(p.dailyPercent).padStart(10)} ${pct(p.minutePercent).padStart(11)}`
    );
  }

  console.log(
    `${'C0 core only'.padEnd(22)} ${''.padStart(13)} ${''.padStart(5)} ${''.padStart(12)} ${''.padStart(12)}  | ${money(c0.endEquity).padStart(15)} ${money(0).padStart(14)} ${pct(c0.dailyPercent).padStart(10)} ${pct(c0.minutePercent).padStart(11)}`
  );
  console.log('');
  console.log(
    'Historical, previously inspected figures; not expected returns. Fixed $ figures and portfolio % figures are different bases.'
  );
};

export const runCli = async (args: string[]) => {
  requireNode24();

  const [command, ...rest] = args;

  switch (command) {
    case 'baseline':
      return (await import('./baseline.ts')).baseline();
    case 'fixed':
    case 'portfolio':
      return single(command, rest);
    case 'compare':
      return compare(rest);
    case 'verify':
      return (await import('./verify.ts')).verify();
  }

  await requireProtocol();

  switch (command) {
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
        `usage: vgt-robustness baseline | run [--family F] [--workers N] [--local] | status | manifest | analyze | report | verify | fixed [ID] [--cost-bps N] | portfolio [ID] [--cost-bps N] | compare [--cost-bps N] (got ${command ?? 'nothing'})`
      );
  }
};
