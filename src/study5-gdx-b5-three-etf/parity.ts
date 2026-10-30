// Engineering gates (PROTOCOL.md §9), run before any selection:
//   P1 replay = the full N-book engine (every lot, signal, daily row and drawdown; replayAgainstFull) for C5, C3, C2
//      on the search and validation doors at 0/5/10 bps, and for 8 arbitrary three-ETF pools (Sobol vectors);
//   P2 the standalone replay at 0 bps = the D1 app runner (npm run app … GDX training --phenotype portfolioAware);
//   P4 the Track 1 re-implementation reproduces the sealed portfolio-aware GDX search on its original base S0 and
//      window: the same selected vectors, the same hypervolume trajectories and the same objectives at four costs.
// P3 (frozen B5 through 2026-10-13 = $486,207.77) is run with the pools CLI itself (RUN_COMMANDS.md).
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { study as original } from '../portfolio-aware-d1/context.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { candidateBook } from '../portfolio-aware-d1/phenotypes.ts';
import { frozenGrids, resultFile, restrictedUniverse } from './context.ts';
import { openDoor } from './data.ts';
import { type Books, Evaluator, orderedSymbols, settingsWith } from './engine.ts';
import { sobolGrids } from './grid.ts';
import { log, nowIso, writeSealed } from './records.ts';
import { Track1Evaluator, track1Core } from './track1.ts';

const phenotypesOf = (books: Books) =>
  Object.fromEntries(
    Object.entries(books).map(([symbol, grid]) => [symbol, candidateBook(symbol, `p-${symbol}`, grid)])
  );

export const runParity = async () => {
  const started = Date.now();
  const rows: Record<string, unknown>[] = [];
  const c5: Books = { ...frozenGrids };
  const c3: Books = { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE, GDX: frozenGrids.GDX };
  const c2: Books = { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE };
  const arbitrary = sobolGrids(24, 'parity', 'pools').grids;

  // P1
  for (const doorKey of ['search', 'validation'] as const) {
    const door = await openDoor(doorKey, ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'], `parity P1 ${doorKey}`);
    const configurations: [string, Books][] = [
      ['C5', c5],
      ['C3', c3],
      ['C2', c2],
      ...Array.from(
        { length: 8 },
        (_value, index) =>
          [
            `sobol-${index + 1}`,
            { VGT: arbitrary[3 * index]!, KRE: arbitrary[3 * index + 1]!, GDX: arbitrary[3 * index + 2]! }
          ] as [string, Books]
      )
    ];

    for (const [key, books] of configurations) {
      for (const costBps of key.startsWith('sobol') ? [5] : [0, 5, 10]) {
        const symbols = orderedSymbols(books);
        const outcome = replayAgainstFull(door.loaded, symbols, phenotypesOf(books), costBps);

        rows.push({ gate: 'P1', door: doorKey, key, costBps, symbols, ...outcome });
        log(`P1 ${doorKey} ${key} ${costBps} bps: ${outcome.differences.length} differences (${outcome.checks})`);
      }
    }
  }

  // P2: the standalone replay at 0 bps against the app runner, GDX portfolioAware on the training partition
  // (2016-01-04 → 2023-12-29, the validation door's window).
  const door = await openDoor('validation', ['GDX'], 'parity P2');
  const ev = new Evaluator(door);
  const replay = ev.metrics({ GDX: frozenGrids.GDX }, settingsWith({ costBps: 0 }));
  const outDir = path.join(os.tmpdir(), `study5-p2-${process.pid}`);

  execFileSync(
    'node',
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      'src/app.ts',
      'allIn-trailingBuy-postExitContinuation',
      'GDX',
      'training',
      '-',
      '-',
      '-',
      outDir,
      '--phenotype',
      'portfolioAware'
    ],
    { stdio: 'ignore' }
  );

  const app = (await fs.readJson(path.join(outDir, 'summary.json'))) as Record<string, number>;
  const p2 = {
    gate: 'P2',
    replay: { net: replay.net, minute: replay.minuteDrawdown, daily: replay.dailyDrawdown, closed: replay.closed },
    app: {
      net: app.netProfit,
      minute: app.minuteMaximumDrawdown,
      daily: app.maximumDrawdown,
      realized: app.realizedProfit,
      interest: app.marginInterest
    },
    netDifference: Math.abs(replay.net - app.netProfit!),
    minuteDifference: Math.abs(replay.minuteDrawdown - app.minuteMaximumDrawdown!),
    dailyDifference: Math.abs(replay.dailyDrawdown - app.maximumDrawdown!)
  };

  rows.push(p2);
  await fs.remove(outDir);
  log(
    `P2: replay ${replay.net.toFixed(2)} / ${replay.minuteDrawdown.toFixed(2)} vs app ${app.netProfit} / ${app.minuteMaximumDrawdown}`
  );

  // P4: the original GDX search on S0 (VGT primary, XBI/XRT/KRE lowDd), training 2017-06-15 → 2023-12-29.
  const p4Door = await openDoor(
    'validation',
    ['VGT', 'XBI', 'XRT', 'KRE', 'GDX'],
    'parity P4 (original S0 and window)'
  );
  const p4Ev = new Evaluator(p4Door);
  const s0: Books = { VGT: frozenGrids.VGT, XBI: frozenGrids.XBI, XRT: frozenGrids.XRT, KRE: frozenGrids.KRE };
  const t1 = new Track1Evaluator(p4Ev, s0, 'GDX', original.folds, original.regimes);
  const core = await track1Core(t1, 'P4 original');
  const sealed = (await fs.readJson('research/portfolio-aware-d1-optimization/results/stageB/champions.json')) as {
    champions: {
      GDX: Record<'S' | 'P', { selected: { id: string }; feasible: number; search: { hypervolume: number[] } }>;
    };
  };
  const p4 = (['S', 'P'] as const).map((track) => {
    const mine = core.tracks[track];
    const theirs = sealed.champions.GDX[track];
    const selection = fs.readJsonSync(
      `research/portfolio-aware-d1-optimization/results/stageB/GDX/track-${track}/selection.json`
    ) as {
      selected: {
        id: string;
        objective: Record<string, number>;
        drawdown: number;
        folds: number[];
        withoutBestRegime: number;
      };
    };
    const selected = mine.selection.selected;

    return {
      gate: 'P4',
      track,
      selectedId: selected?.id,
      sealedId: theirs.selected.id,
      sameSelection: selected?.id === theirs.selected.id,
      feasible: mine.selection.feasibleCount,
      sealedFeasible: theirs.feasible,
      sameHypervolume: JSON.stringify(mine.summary.hypervolume) === JSON.stringify(theirs.search.hypervolume),
      objective: selected?.objective,
      sealedObjective: selection.selected.objective,
      sameObjective:
        selected !== undefined &&
        [0, 2, 5, 10].every((costBps) => selected.objective[costBps] === selection.selected.objective[String(costBps)]),
      drawdown: selected?.drawdown,
      sealedDrawdown: selection.selected.drawdown,
      folds: selected?.folds,
      sealedFolds: selection.selected.folds,
      withoutBestRegime: selected?.withoutBestRegime,
      sealedWithoutBestRegime: selection.selected.withoutBestRegime
    };
  });

  rows.push(...p4);
  log(
    `P4: ${JSON.stringify(p4.map((row) => ({ track: row.track, same: row.sameSelection, hv: row.sameHypervolume, objective: row.sameObjective })))}`
  );

  const p1Failures = rows.filter((row) => row.gate === 'P1' && (row.differences as string[]).length > 0).length;
  const passed = {
    P1: p1Failures === 0,
    P2: p2.netDifference < 0.005 && p2.minuteDifference < 0.005 && p2.dailyDifference < 0.005,
    P4: p4.every((row) => row.sameSelection && row.sameHypervolume && row.sameObjective)
  };
  const record = await writeSealed(resultFile('parity', 'parity.json'), {
    stage: 'parity',
    at: nowIso(),
    restrictedUniverse,
    passed,
    rows,
    seconds: (Date.now() - started) / 1000
  });

  log(`parity: ${JSON.stringify(passed)}; ${record.file} ${record.bodyHash.slice(0, 12)}`);
};
