// Engineering gates of PROTOCOL.md §8.1, run before any Part A statistic:
//   P1 replay = the full N-book engine (every lot, signal, virtual trade, daily row and both drawdowns) for frozen B5
//      at 0/5/10 bps on W23 and W29, for 8 joint and 4 KRE-only parity samples at 5 bps on W29, and for frozen B5 and
//      two parity samples at 8% and 14% interest, next-open stops and 25 bps stop slippage on W29 (this study's
//      extension of replayAgainstFull to the execution settings, same comparison);
//   P3 `npm run pools -- fixed B5 --end 2026-10-13` = $486,207.77 / $26,509.97 / 94 lots, and the evaluator = the pools
//      CLI on W13 and W29 (net, both drawdowns, lots);
//   P5 the first 8 stored B5 joint samples (seed 1) of research/b4-b5-robustness-audit re-run on W13 = the stored
//      fixed net and minute drawdown (|Δ| < $0.005) and lots.
// P4 and R-OM (Track O) run with Track O (trackO.ts).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { compareValues, outputsOf } from '../portfolio-aware-d1/compare.ts';
import { traceWindowOf } from '../portfolio-aware-d1/data.ts';
import { type NRunConfig, type NUniverse, baseNRunConfig, runNAllocator } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { candidateBook, d1Keys, type Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { replayFixedPool } from '../portfolio-aware-d1/replay.ts';
import { traceBook, traceSettings } from '../portfolio-aware-d1/trace.ts';
import { bookOrder, execution, frozenGrids, parityFile, sets } from './context.ts';
import { openDoor } from './data.ts';
import { type Books, design } from './designs.ts';
import { Lab, settingsWith } from './evaluate.ts';
import { log, nowIso, writeSealed } from './records.ts';

const phenotypesOf = (books: Books) =>
  Object.fromEntries(
    Object.entries(books).map(([symbol, grid]) => [symbol, candidateBook(symbol, `p6-${symbol}`, grid)])
  );

const symbolsOf = (books: Books) => (bookOrder as readonly string[]).filter((symbol) => symbol in books);

// replayAgainstFull with the execution settings the engine supports (rate, stop fill, stop slippage, cost).
export const replayAgainstFullWith = (
  loaded: LoadedUniverse,
  books: Books,
  settings: { costBps: number; rate: number; stopFill: 'stop' | 'next-open'; stopSlippageBps: number }
) => {
  const symbols = symbolsOf(books);
  const phenotypes = phenotypesOf(books);
  const window = traceWindowOf(loaded);
  const config: NRunConfig = baseNRunConfig({
    key: 'parity',
    label: 'parity',
    mode: 'fixed',
    symbols,
    phenotypes,
    costBps: settings.costBps,
    rate: settings.rate,
    stopFill: settings.stopFill,
    stopSlippageBps: settings.stopSlippageBps,
    eligibilityIndex: window.armStart,
    accountingStartIndex: window.startIndex
  });
  const universe: NUniverse = {
    ...loaded.universe,
    instruments: Object.fromEntries(symbols.map((symbol) => [symbol, loaded.universe.instruments[symbol]!]))
  };
  const full = runNAllocator(universe, config);
  const replay = replayFixedPool(
    symbols.map((symbol) => ({
      symbol,
      ds: loaded.universe.instruments[symbol]!.ds,
      trace: traceBook(
        loaded.universe.instruments[symbol]!.ds,
        phenotypes[symbol]!,
        traceSettings(settings.costBps, {
          rate: settings.rate,
          stopFill: settings.stopFill,
          stopSlippageBps: settings.stopSlippageBps
        }),
        window
      )
    })),
    {
      symbols,
      startIndex: window.startIndex,
      endIndex: window.endIndex,
      principal: execution.principal,
      rate: settings.rate,
      costBps: settings.costBps,
      stopSlippageBps: settings.stopSlippageBps,
      detail: true
    }
  );
  const differences = compareValues(outputsOf(full), replay.full, { maxDifferences: 10 });
  const fullNet = full.lots.reduce((total, lot) => total + lot.net, 0);

  if (fullNet !== replay.net) {
    differences.push(`net ${fullNet} vs ${replay.net}`);
  }

  return {
    differences,
    net: replay.net,
    minute: replay.minuteDrawdown.maximum,
    lots: replay.lots.length,
    checks: `${full.trades.length} virtual trades, ${full.lots.length} lots, ${full.signals.length} signals, ${full.daily.length} daily rows`
  };
};

const npm = (args: string[]) =>
  execFileSync(
    'node',
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      '--max-old-space-size=8192',
      'src/app.ts',
      'pools',
      ...args
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }
  );

export const runParity = async () => {
  const started = Date.now();
  const rows: Record<string, unknown>[] = [];
  const b5: Books = { ...frozenGrids };
  const five = [...bookOrder];

  // P1
  const w29 = await openDoor('diag', five, 'parity P1 W29', 'W29');
  const w23 = await openDoor('diag', five, 'parity P1 W23', 'W23');

  for (const [label, door] of [
    ['W23', w23],
    ['W29', w29]
  ] as const) {
    for (const costBps of [0, 5, 10]) {
      const outcome = replayAgainstFull(door.loaded, symbolsOf(b5), phenotypesOf(b5), costBps);

      rows.push({ gate: 'P1', window: label, key: 'B5', costBps, ...outcome });
      log(`P1 ${label} B5 ${costBps} bps: ${outcome.differences.length} differences (${outcome.checks})`);
    }
  }

  const jointSamples = design({
    centre: b5,
    perturb: five,
    n: sets.parity.joint,
    labels: ['A', 'parity', 'joint'],
    mode: 'clip',
    scale: 1
  });
  const kreSamples = design({
    centre: b5,
    perturb: ['KRE'],
    n: sets.parity.kre,
    labels: ['A', 'parity', 'KRE'],
    mode: 'clip',
    scale: 1
  });

  for (const [key, point] of [
    ...jointSamples.map((point) => [`joint-${point.index}`, point] as const),
    ...kreSamples.map((point) => [`kre-${point.index}`, point] as const)
  ]) {
    const outcome = replayAgainstFull(w29.loaded, symbolsOf(point.books), phenotypesOf(point.books), 5);

    rows.push({ gate: 'P1', window: 'W29', key, costBps: 5, books: point.books, ...outcome });
    log(`P1 W29 ${key}: ${outcome.differences.length} differences (${outcome.checks})`);
  }

  const variants = [
    { key: 'rate8', rate: 0.08 },
    { key: 'rate14', rate: 0.14 },
    { key: 'nextOpen', stopFill: 'next-open' as const },
    { key: 'slip25', stopSlippageBps: 25 }
  ];

  for (const [key, books] of [
    ['B5', b5],
    ['joint-0', jointSamples[0]!.books],
    ['kre-0', kreSamples[0]!.books]
  ] as const) {
    for (const variant of variants) {
      const settings = {
        costBps: execution.costBps,
        rate: variant.rate ?? execution.rate,
        stopFill: variant.stopFill ?? execution.stopFill,
        stopSlippageBps: variant.stopSlippageBps ?? 0
      };
      const outcome = replayAgainstFullWith(w29.loaded, books, settings);

      rows.push({ gate: 'P1', window: 'W29', key: `${key}:${variant.key}`, settings, ...outcome });
      log(`P1 W29 ${key} ${variant.key}: ${outcome.differences.length} differences`);
    }
  }

  // P3: the pools CLI (the authoritative engine and report) on W13 and W29, against the evaluator.
  const w13 = await openDoor('diag', five, 'parity P3 W13', 'W13');
  const p3: Record<string, unknown>[] = [];

  for (const [label, door, extra] of [
    ['W13', w13, ['--end', '2026-10-13']],
    ['W29', w29, []]
  ] as const) {
    const outDir = path.join('evaluations', 'study6', `P3-B5-fixed-${label}`);

    await fs.remove(outDir);
    npm(['fixed', 'B5', ...extra, '--out', outDir]);

    const summary = (await fs.readJson(path.join(outDir, 'summary.json'))) as {
      figures: { net: number; minuteDrawdown: number; dailyDrawdown: number; fundedLots: number };
    };
    const lab = new Lab(door);
    const point = lab.point(b5);
    const cli = {
      net: summary.figures.net,
      minute: summary.figures.minuteDrawdown,
      daily: summary.figures.dailyDrawdown,
      lots: summary.figures.fundedLots
    };

    p3.push({
      window: label,
      outDir,
      cli,
      evaluator: { net: point.net, minute: point.dd, daily: point.ddDaily, lots: point.lots },
      equal:
        Math.abs(cli.net - point.net) < 0.005 &&
        Math.abs(cli.minute - point.dd) < 0.005 &&
        Math.abs(cli.daily - point.ddDaily) < 0.005 &&
        cli.lots === point.lots
    });
    log(`P3 ${label}: CLI ${JSON.stringify(cli)} evaluator ${point.net} / ${point.dd} / ${point.lots}`);
  }

  const anchor = p3.find((row) => row.window === 'W13')!.cli as Record<string, number>;
  const p3Anchor =
    Math.abs(anchor.net! - 486207.77) < 0.005 && Math.abs(anchor.minute! - 26509.97) < 0.005 && anchor.lots === 94;

  rows.push(...p3.map((row) => ({ gate: 'P3', ...row })), { gate: 'P3', anchor: p3Anchor });

  // P5: the B4/B5 robustness audit's first 8 B5 joint samples of seed 1 (stored parameters and fixed results).
  const manifest = (await fs.readJson('research/b4-b5-robustness-audit/MANIFEST.json')) as {
    samples: { pool: string; design: string; index: number; dimensions: string[]; values: number[] }[];
  };
  const stored = new Map<number, { net: number; minuteDD: number; lots: number }>();

  for (const line of (await fs.readFile('research/b4-b5-robustness-audit/results/runs/joint.jsonl', 'utf8'))
    .split('\n')
    .filter(Boolean)) {
    const record = JSON.parse(line) as {
      pool: string;
      mode: string;
      meta: { design: string; sample: number };
      net: number;
      minuteDD: number;
      lots: number;
    };

    if (record.pool === 'B5' && record.mode === 'fixed' && record.meta.design === 'joint-s1') {
      stored.set(record.meta.sample, record);
    }
  }

  const shortOf: Record<string, string> = {
    X: 'targetPercentChange',
    Y: 'trailingBuyPercentage',
    stop: 'trailingStopPercentage',
    hold: 'maximumHoldDays',
    L: 'tickWindowSize',
    buffer: 'intradayLossBuffer',
    P: 'pullback',
    W: 'continuationWindow'
  };
  const lab13 = new Lab(w13);
  const p5 = manifest.samples
    .filter((sample) => sample.pool === 'B5' && sample.design === 'joint-s1' && sample.index < 8)
    .map((sample) => {
      const books: Books = {};

      sample.dimensions.forEach((dimension, index) => {
        const [symbol, short] = dimension.split('.') as [string, string];

        books[symbol] ??= {} as Grid;
        (books[symbol] as Record<string, number>)[shortOf[short]!] = sample.values[index]!;
      });

      for (const grid of Object.values(books)) {
        if (d1Keys.some((key) => !Number.isInteger(grid[key]))) {
          throw new Error(`P5 sample ${sample.index}: incomplete vector`);
        }
      }

      const point = lab13.point(books);
      const record = stored.get(sample.index)!;

      return {
        sample: sample.index,
        stored: { net: record.net, minuteDD: record.minuteDD, lots: record.lots },
        evaluator: { net: point.net, minuteDD: point.dd, lots: point.lots },
        equal:
          Math.abs(record.net - point.net) < 0.005 &&
          Math.abs(record.minuteDD - point.dd) < 0.005 &&
          record.lots === point.lots
      };
    });

  rows.push(...p5.map((row) => ({ gate: 'P5', ...row })));
  log(`P5: ${p5.filter((row) => row.equal).length}/${p5.length} equal`);

  const p1Rows = rows.filter((row) => row.gate === 'P1');
  const passed = {
    P1: p1Rows.length > 0 && p1Rows.every((row) => (row.differences as string[]).length === 0),
    P3: p3Anchor && p3.every((row) => row.equal === true),
    P5: p5.length === 8 && p5.every((row) => row.equal)
  };
  const record = await writeSealed(parityFile, {
    stage: 'parity',
    at: nowIso(),
    passed,
    rows,
    seconds: (Date.now() - started) / 1000
  });

  log(`parity: ${JSON.stringify(passed)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);

  if (!passed.P1 || !passed.P3 || !passed.P5) {
    throw new Error(`parity failed: ${JSON.stringify(passed)} — the study stops here (PROTOCOL.md §8.1)`);
  }
};

export { settingsWith };
