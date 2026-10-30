// Track O — the original B5 method (PROTOCOL.md §10.5, §8.1 P4 and R-OM).
//   P4    this study's symbol-parametrized re-implementation of the portfolio-aware step 4 ("the B5 optimizer"), run on
//         GDX with the original base S0 and window (the run to 2023-12-29), must reproduce the sealed selection of
//         research/portfolio-aware-d1-optimization (IDs, hypervolume trajectories, objectives at four costs).
//   O-PA  the same method applied to KRE inside the five-ETF pool: base = frozen VGT, XBI, XRT, GDX; search door only;
//         the original common pool and controls minus KRE's own primary and lowDd (in-sample on VAL); folds D1–D3 and
//         regimes R1–R9 of the development window; Stage C gates T1–T3.
//   R-OM  the multi-etf-d1 search (the method that produced KRE lowDd), run unchanged in a detached worktree on its
//         archived inputs, must reproduce the sealed KRE nominations.
//   O-ME  the same code with the smallest adapter (development end 2021-12-31; folds fold1, fold2, final) — only if
//         R-OM passes.
// The Study 5 Track 1 building blocks (Track1Evaluator, robustSelection, stageCGates, feasibleOf, objectiveOf) and the
// original constants are imported unchanged; only the symbol, the base, the window and the controls are parameters.
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { operatorSpace } from '../multi-etf-d1/space.ts';
import { deriveSeed } from '../optimizer/rng.ts';
import { study as original } from '../portfolio-aware-d1/context.ts';
import { commonSobolPool, poolFor } from '../portfolio-aware-d1/space.ts';
import { devRegimeKeys, folds as devFoldList, regimes } from '../study5-gdx-b5-three-etf/context.ts';
import { type Books, Evaluator } from '../study5-gdx-b5-three-etf/engine.ts';
import { type Grid, describe, genomeOfGrid, gridOfGenome, vectorId } from '../study5-gdx-b5-three-etf/grid.ts';
import { type Candidate as GaCandidate, type SearchSummary, runNsga2 } from '../study5-gdx-b5-three-etf/search.ts';
import {
  type Track,
  type VectorT1,
  Track1Evaluator,
  feasibleOf,
  objectiveOf,
  robustSelection,
  stageCGates
} from '../study5-gdx-b5-three-etf/track1.ts';
import { bookOrder, frozenGrids, resultFile, studyDir } from './context.ts';
import { openDoor } from './data.ts';
import { fileSha256, git, log, nowIso, readSealed, writeCsv, writeSealed } from './records.ts';

const costs = [0, 2, 5, 10] as const;
const principal = 5;

// The original tracks' violation and drawdown (src/portfolio-aware-d1/tracks.ts semantics, as Study 5 track1.ts).
const violationOf = (track: Track, result: VectorT1['results'][number]) => {
  const ceiling = original.drawdownCeiling;

  return track === 'S'
    ? Math.max(0, result.standalone.dd - ceiling) / ceiling +
        Math.max(0, original.feasibility.S.minTrades - result.standalone.trades) / original.feasibility.S.minTrades +
        Math.max(0, original.feasibility.S.minYears - result.standalone.years) / original.feasibility.S.minYears
    : Math.max(0, result.pool.dd - ceiling) / ceiling +
        Math.max(0, original.feasibility.P.minLots - result.pool.lots) / original.feasibility.P.minLots +
        Math.max(0, original.feasibility.P.minYears - result.pool.lotYears) / original.feasibility.P.minYears;
};

const drawdownOf = (track: Track, result: VectorT1['results'][number]) =>
  track === 'S' ? result.standalone.dd : result.pool.dd;

const scoreOf = (track: Track, item: VectorT1): GaCandidate<VectorT1> => {
  const result = item.results[principal]!;

  return {
    id: item.id,
    genome: genomeOfGrid(item.grid),
    objectives: [-objectiveOf(track, result), drawdownOf(track, result)],
    violation: Number.isFinite(objectiveOf(track, result)) ? violationOf(track, result) : 1e9,
    origin: item.origin,
    payload: item
  };
};

// Stages A and B of the original method for one symbol, base and window (Study 5 track1Core with the symbol, its seed
// rule and the excluded controls as parameters).
export const paCore = async (t1: Track1Evaluator, symbol: string, label: string, excludeOrigins: readonly string[]) => {
  const started = Date.now();
  const common = commonSobolPool();
  const pool = (await poolFor(symbol, common.vectors)).filter((vector) => !excludeOrigins.includes(vector.origin));
  const stageA: VectorT1[] = pool.map((vector) => ({
    id: vector.id,
    grid: vector.grid,
    origin: vector.origin,
    results: Object.fromEntries(costs.map((costBps) => [costBps, t1.evaluate(vector.grid, costBps)]))
  }));

  log(`${label}: Stage A ${stageA.length} vectors × 4 costs in ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const tracks = {} as Record<
    Track,
    { summary: SearchSummary; selection: ReturnType<typeof robustSelection>; evaluated: Map<string, VectorT1> }
  >;

  for (const track of ['S', 'P'] as const) {
    const evaluated = new Map<string, VectorT1>();

    for (const item of stageA) {
      evaluated.set(item.id, { ...item, results: { ...item.results } });
    }

    const archive = new Map<string, GaCandidate<VectorT1>>();
    const initial = [...evaluated.values()].map((item) => scoreOf(track, item));

    for (const candidate of initial) {
      archive.set(candidate.id, candidate);
    }

    const { search } = original;
    const summary = runNsga2(
      {
        populationSize: search.populationSize,
        maxNewVectors: search.maxNewVectors,
        maxGenerations: search.maxGenerations,
        patience: search.earlyStopPatience,
        tolerance: search.earlyStopTolerance,
        seedDiversity: search.seedDiversity,
        variation: {
          crossoverProbability: search.crossoverProbability,
          crossoverEta: search.crossoverEta,
          mutationEta: search.mutationEta
        },
        reference: [0, original.drawdownCeiling],
        seed: deriveSeed('portfolio-aware-d1', symbol, track, 'nsga2'),
        space: operatorSpace,
        label: `ga:${track}`
      },
      initial,
      archive,
      (genome) => vectorId(gridOfGenome(genome)),
      (genome, id, origin) => {
        const grid = gridOfGenome(genome);
        const item: VectorT1 = { id, grid, origin, results: { [principal]: t1.evaluate(grid, principal) } };

        evaluated.set(id, item);

        return scoreOf(track, item);
      }
    );
    const selection = robustSelection(t1, track, evaluated);

    tracks[track] = { summary, selection, evaluated };
    log(
      `${label} ${track}: ${summary.newVectors} new, ${summary.generations} gens (${summary.stopReason}); feasible ${selection.feasibleCount}; selected ${selection.selected?.id ?? 'none'} ${selection.selected?.short ?? ''}`
    );
  }

  return { common, pool, stageA, tracks };
};

// P4: the re-implementation on GDX, base S0, the original window (to 2023-12-29; the diag door W23, an engineering
// check that evaluates no KRE vector other than the frozen one inside S0).
export const runP4 = async () => {
  const door = await openDoor(
    'diag',
    [...bookOrder],
    'P4 (Track O parity: original S0/GDX search, run to 2023-12-29)',
    'W23'
  );
  const ev = new Evaluator(door);
  const s0: Books = { VGT: frozenGrids.VGT, XBI: frozenGrids.XBI, XRT: frozenGrids.XRT, KRE: frozenGrids.KRE };
  const t1 = new Track1Evaluator(ev, s0, 'GDX', original.folds, original.regimes);
  const core = await paCore(t1, 'GDX', 'P4', []);
  const sealed = (await fs.readJson('research/portfolio-aware-d1-optimization/results/stageB/champions.json')) as {
    champions: {
      GDX: Record<'S' | 'P', { selected: { id: string }; feasible: number; search: { hypervolume: number[] } }>;
    };
  };
  const rows = (['S', 'P'] as const).map((track) => {
    const mine = core.tracks[track];
    const theirs = sealed.champions.GDX[track];
    const selection = fs.readJsonSync(
      `research/portfolio-aware-d1-optimization/results/stageB/GDX/track-${track}/selection.json`
    ) as { selected: { id: string; objective: Record<string, number>; drawdown: number; folds: number[] } };
    const selected = mine.selection.selected;

    return {
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
        costs.every((costBps) => selected.objective[costBps] === selection.selected.objective[String(costBps)])
    };
  });
  const passed = rows.every((row) => row.sameSelection && row.sameHypervolume && row.sameObjective);
  const record = await writeSealed(resultFile('parity', 'p4.json'), { stage: 'P4', at: nowIso(), passed, rows });

  log(
    `P4: ${passed ? 'PASS' : 'FAIL'} ${JSON.stringify(rows.map((row) => [row.track, row.sameSelection, row.sameHypervolume, row.sameObjective]))}; ${record.file}`
  );

  if (!passed) {
    throw new Error('P4 failed: Track O-PA cannot claim a faithful reproduction (PROTOCOL.md §8.1)');
  }
};

export const runTrackOPA = async () => {
  const started = Date.now();
  const p4 = await readSealed<{ passed: boolean }>(resultFile('parity', 'p4.json'));

  if (!p4.passed) {
    throw new Error('P4 did not pass');
  }

  const door = await openDoor('search', [...bookOrder], 'Track O-PA (portfolio-aware method on KRE)');
  const ev = new Evaluator(door);
  const base: Books = { VGT: frozenGrids.VGT, XBI: frozenGrids.XBI, XRT: frozenGrids.XRT, GDX: frozenGrids.GDX };
  const regimeList = regimes.filter((regime) => devRegimeKeys.includes(regime.key));
  const t1 = new Track1Evaluator(ev, base, 'KRE', devFoldList, regimeList);
  const excluded = ['control:KRE primary', 'control:KRE lowDd'];
  const { common, pool, stageA, tracks } = await paCore(t1, 'KRE', 'Track O-PA', excluded);
  const configurations = (['P', 'S'] as const).flatMap((track) => {
    const selected = tracks[track].selection.selected;

    if (!selected) {
      return [];
    }

    const gates = stageCGates(t1, selected.grid);

    return [
      {
        key: `O-PA-${track}`,
        track,
        books: { ...base, KRE: selected.grid } as Books,
        vector: { id: selected.id, origin: selected.origin, grid: selected.grid, short: selected.short },
        ...gates,
        status: gates.nominated ? 'original method: nominated by T1–T3' : 'original method: comparator (fails T1–T3)'
      }
    ];
  });
  const controls = (await poolFor('KRE', [])).filter((vector) => excluded.includes(vector.origin));
  const controlRows = controls.map((vector) => ({
    origin: vector.origin,
    id: vector.id,
    grid: vector.grid,
    at5: t1.evaluate(vector.grid, principal)
  }));
  const dir = resultFile('partB', 'trackO');
  const flat = (item: VectorT1) => ({
    id: item.id,
    origin: item.origin,
    params: describe(item.grid),
    ...Object.fromEntries(
      Object.entries(item.results).flatMap(([costBps, result]) => [
        [`S${costBps}.net`, Math.round(result.standalone.net)],
        [`S${costBps}.dd`, Math.round(result.standalone.dd)],
        [`P${costBps}.delta`, Math.round(result.pool.delta)],
        [`P${costBps}.dd`, Math.round(result.pool.dd)],
        [`P${costBps}.lots`, result.pool.lots]
      ])
    )
  });
  const files = {
    stageA: await writeCsv(`${dir}/o-pa-stageA.csv`, stageA.map(flat)),
    S: await writeCsv(`${dir}/o-pa-track-S.csv`, [...tracks.S.evaluated.values()].map(flat)),
    P: await writeCsv(`${dir}/o-pa-track-P.csv`, [...tracks.P.evaluated.values()].map(flat))
  };
  const topOf = (track: Track) =>
    [...tracks[track].evaluated.values()]
      .filter((item) => feasibleOf(track, item.results[principal]!))
      .sort((a, b) => objectiveOf(track, b.results[principal]!) - objectiveOf(track, a.results[principal]!))
      .slice(0, 5)
      .map((item) => ({ id: item.id, origin: item.origin, short: describe(item.grid), ...item.results[principal] }));
  const record = await writeSealed(resultFile('partB', 'trackO', 'o-pa.json'), {
    stage: 'trackO-PA',
    at: nowIso(),
    door: door.study6Key,
    window: { first: door.dates[0], last: door.dates[door.lastIndex] },
    base: {
      books: base,
      at: Object.fromEntries(
        costs.map((costBps) => [
          costBps,
          { net: t1.baseRun(costBps).net, dd: t1.baseRun(costBps).minuteDrawdown.maximum }
        ])
      )
    },
    departures: [
      'window: the search door (2017-06-15 → 2021-12-31) instead of 2017-06-15 → 2023-12-29; folds D1/D2/D3 and regimes R1–R9 inside it',
      'base: the four other frozen B5 books (VGT, XBI, XRT, GDX) instead of S0; the searched book is KRE instead of GDX',
      `controls: KRE's own primary and lowDd excluded from Stage A (fitted on 2017–2023, which contains VAL); evaluated as labelled controls only`,
      'Stage A finalist rule (seven ETFs) and Stage C substitutions/combinations do not apply; T4/T5 (20% portfolio) not applied'
    ],
    commonPool: { seed: common.seed, drawn: common.drawn, duplicates: common.duplicates, vectors: pool.length },
    settings: {
      search: original.search,
      selection: original.selection,
      gates: original.gates,
      feasibility: original.feasibility
    },
    tracks: Object.fromEntries(
      (['S', 'P'] as const).map((track) => [
        track,
        {
          seed: deriveSeed('portfolio-aware-d1', 'KRE', track, 'nsga2'),
          summary: tracks[track].summary,
          feasibleCount: tracks[track].selection.feasibleCount,
          shortlist: tracks[track].selection.shortlist,
          checks: tracks[track].selection.checks,
          selected: tracks[track].selection.selected ?? null,
          top5: topOf(track)
        }
      ])
    ),
    configurations,
    excludedControls: controlRows,
    files,
    traces: ev.traces,
    replays: ev.replays,
    seconds: (Date.now() - started) / 1000
  });

  log(`Track O-PA: ${configurations.map((c) => `${c.key} ${c.vector.short} ${c.status}`).join('; ')}; ${record.file}`);
};

// ----- R-OM and O-ME: the multi-etf-d1 code in a detached worktree -----

export const omePatchFile = path.join(studyDir, 'patches', 'multi-etf-d1-dev-window.patch');

const worktreeRoot = () => process.env.STUDY6_WORKTREES ?? path.join(os.tmpdir(), 'study6-worktrees');

const runOriginal = async (kind: 'reproduce' | 'dev') => {
  const root = path.resolve('.');
  const tree = path.join(worktreeRoot(), `multi-etf-d1-${kind}`);
  const head = git('rev-parse HEAD');

  if (await fs.pathExists(tree)) {
    execFileSync('git', ['worktree', 'remove', '--force', tree], { stdio: 'inherit' });
  }

  await fs.ensureDir(path.dirname(tree));
  execFileSync('git', ['worktree', 'add', '--detach', tree, head], { stdio: 'inherit' });

  // The worktree's own sealed KRE search and selection records are removed so the search recomputes them.
  await fs.remove(path.join(tree, 'research/multi-etf-d1/results/search/KRE'));
  await fs.remove(path.join(tree, 'research/multi-etf-d1/results/selection/KRE'));
  await fs.symlink(path.join(root, 'node_modules'), path.join(tree, 'node_modules'));

  for (const symbol of ['KRE', 'VGT']) {
    const relative = `data/archive/legacy-research-inputs/${symbol}`;

    await fs.ensureDir(path.join(tree, relative));

    for (const name of await fs.readdir(path.join(root, relative))) {
      await fs.symlink(path.join(root, relative, name), path.join(tree, relative, name));
    }
  }

  if (kind === 'dev') {
    execFileSync('git', ['-C', tree, 'apply', path.join(root, omePatchFile)], { stdio: 'inherit' });
  }

  const started = Date.now();
  const output = execFileSync(
    process.execPath,
    [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      '--max-old-space-size=8192',
      'src/app.ts',
      'multiEtfD1',
      'search',
      '--symbols',
      'KRE',
      '--workers',
      '8'
    ],
    { cwd: tree, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  );
  const selection = (await fs.readJson(
    path.join(tree, 'research/multi-etf-d1/results/selection/KRE/selection.json')
  )) as Record<string, unknown>;
  const search = (await fs.readJson(path.join(tree, 'research/multi-etf-d1/results/search/KRE/search.json'))) as Record<
    string,
    unknown
  >;

  return { tree, head, output, selection, search, seconds: (Date.now() - started) / 1000 };
};

interface Nomination {
  role: string;
  id: string;
  params: Record<string, number>;
  development: Record<string, number>;
}

export const runROM = async () => {
  const run = await runOriginal('reproduce');
  const frozen = (
    (await fs.readJson('research/multi-etf-d1/FROZEN_CANDIDATES.json')) as {
      tickers: { KRE: { nominations: Nomination[] } };
    }
  ).tickers.KRE.nominations;
  const mine = ((run.selection as { nominations?: Nomination[] }).nominations ?? []) as Nomination[];
  const sealedSearch = (await fs.readJson('research/multi-etf-d1/results/search/KRE/search.json')) as {
    ga: { fold: string; hypervolume: number[] }[];
    candidates: number;
  };
  const rows = frozen.map((nomination) => {
    const match = mine.find((item) => item.role === nomination.role);

    return {
      role: nomination.role,
      sealedId: nomination.id,
      reproducedId: match?.id ?? null,
      sameId: match?.id === nomination.id,
      sealedDevelopment: nomination.development,
      reproducedDevelopment: match?.development ?? null,
      sameDevelopment:
        match !== undefined &&
        ['net', 'minuteDrawdown', 'entries'].every((key) => match.development[key] === nomination.development[key])
    };
  });
  const ga = (run.search as { ga: { fold: string; hypervolume: number[] }[] }).ga;
  const sameGa = sealedSearch.ga.every(
    (fold) =>
      JSON.stringify(ga.find((item) => item.fold === fold.fold)?.hypervolume) === JSON.stringify(fold.hypervolume)
  );
  const passed = rows.length > 0 && rows.every((row) => row.sameId && row.sameDevelopment) && sameGa;
  const record = await writeSealed(resultFile('parity', 'r-om.json'), {
    stage: 'R-OM',
    at: nowIso(),
    passed,
    worktree: { path: run.tree, head: run.head },
    command:
      'node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts multiEtfD1 search --symbols KRE --workers 8',
    rows,
    sameGaHypervolumes: sameGa,
    candidates: { reproduced: (run.search as { candidates: number }).candidates, sealed: sealedSearch.candidates },
    seconds: run.seconds
  });

  await fs.outputFile(resultFile('logs', 'r-om-worktree.log'), run.output);
  log(
    `R-OM: ${passed ? 'PASS' : 'FAIL'} ${JSON.stringify(rows.map((row) => [row.role, row.sameId, row.sameDevelopment]))} GA ${sameGa}; ${record.file}`
  );
};

export const runTrackOME = async () => {
  const rom = await readSealed<{ passed: boolean }>(resultFile('parity', 'r-om.json'));

  if (!rom.passed) {
    const record = await writeSealed(resultFile('partB', 'trackO', 'o-me.json'), {
      stage: 'trackO-ME',
      at: nowIso(),
      run: false,
      reason:
        'R-OM did not reproduce the sealed KRE nominations; the original multi-etf-d1 method is reported as not reproduced (PROTOCOL.md §8.1)'
    });

    log(`O-ME not run; ${record.file}`);
    return;
  }

  const run = await runOriginal('dev');
  const nominations = ((run.selection as { nominations?: Nomination[] }).nominations ?? []) as Nomination[];
  const toGrid = (params: Record<string, number>) => params as unknown as Grid;
  const configurations = nominations
    .filter((nomination) => nomination.role === 'alternate-lowDd' || nomination.role === 'primary')
    .map((nomination) => ({
      key: nomination.role === 'primary' ? 'O-ME-primary' : 'O-ME-lowDd',
      role: nomination.role,
      id: nomination.id,
      books: {
        ...Object.fromEntries(bookOrder.map((symbol) => [symbol, frozenGrids[symbol]])),
        KRE: toGrid(nomination.params)
      },
      development: nomination.development
    }));
  const record = await writeSealed(resultFile('partB', 'trackO', 'o-me.json'), {
    stage: 'trackO-ME',
    at: nowIso(),
    run: true,
    patch: { file: omePatchFile, sha256: await fileSha256(omePatchFile) },
    worktree: { path: run.tree, head: run.head },
    command: 'git -C <worktree> apply <patch>; node … src/app.ts multiEtfD1 search --symbols KRE --workers 8',
    nominations,
    configurations,
    search: { ga: (run.search as { ga: unknown }).ga, candidates: (run.search as { candidates: number }).candidates },
    seconds: run.seconds
  });

  await fs.outputFile(resultFile('logs', 'o-me-worktree.log'), run.output);
  log(`O-ME: ${configurations.map((c) => `${c.key} ${c.id}`).join('; ')}; ${record.file}`);
};
