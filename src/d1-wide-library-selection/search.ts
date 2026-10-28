// Arm NEW-SEARCH (PROTOCOL.md §5): a bounded, training-only standalone discovery per ETF and fold, separate from the
// archive and never mixed into it.
//
//   1. Sobol: the first 1,024 unique grid vectors of the ETF's own scrambled Sobol stream (the source's quantization
//      and box; this study's stream label, the same design in every fold so folds are paired); a vector in the fold's
//      collision guard (every archived Sobol grid, and the local-search grids of source windows ending on or before the
//      fold's cutoff) is dropped before evaluation and counted by cause, never replaced; a vector equal to a later
//      window's local-search grid is kept and flagged.
//   2. Families of the credible Sobol vectors (./families.ts) and up to 8 refinement starts from distinct families by
//      quota: 4 by T (the family's highest-T member), 2 by space-filling support (the family medoid), 2 by the lowest
//      minute drawdown (the family's lowest-DD member); an unfilled quota is filled from the T order.
//   3. Refinement: per start 2 rounds of 8 moves (6 single-coordinate ±1..3 step units, 2 joint ±1 unit; the
//      source's operators), moving to the best credible move whose T is strictly higher. At most 128 new evaluations
//      per ETF; a duplicate or guarded vector is redrawn (≤ 20 attempts, causes logged) and otherwise skipped (counted).
//      (Only the grid and stage of the later windows' archive rows are used — published records, no outcome.)
//
// The objective is T (no best-trade deduction); nothing after the fold's cutoff is read, no validation figure exists
// at this point, and the budget never depends on any outcome outside the training window.
import fs from 'fs-extra';
import { mutateAll, mutateOne, sobolVectors, vectorOf } from '../d1-ranked-preemption/space.ts';
import { Rng } from '../optimizer/rng.ts';
import os from 'node:os';
import { type FoldKey, folds, log, newSearch, nowIso, resultFile, rules, study } from './context.ts';
import { readArchive } from './archive.ts';
import { type Candidate, byKey, byT, candidateOf, readCandidates, writeCandidates } from './candidates.ts';
import { trainingUniverse } from './doors.ts';
import { clusterFamilies, medoidOf, pathDistance, pathOf } from './families.ts';
import { readStageRecord, requireCodeFrozen } from './freeze.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { Fast, type Grid, gridKeyOf } from './fast.ts';
import { readSealed, sha256File, writeRecord } from './records.ts';

export const searchFile = (fold: FoldKey) => resultFile('search', fold, 'SEARCH.json');
export const searchCandidatesFile = (fold: FoldKey) => resultFile('search', fold, 'candidates.jsonl.gz');
export const sobolLabel = `${study.seedLabel}:new-search`;

// The collision guard of a fold (PROTOCOL.md §5.2): every archived Sobol grid (the source's data-free design,
// identical in its three windows) and the local-search grids of source windows whose search end is on or before the
// fold's cutoff. Local-search grids chosen with later data never steer this fold's search: a new vector equal to one
// is kept and flagged (`laterLocal`), never dropped or redrawn.
export const archivedKeys = async (cutoff: string) => {
  const guard = new Map<string, Map<string, string>>(); // symbol → grid → cause
  const later = new Map<string, Set<string>>();
  const ends = { 'fold-a': '2020-06-30', 'fold-b': '2021-12-31', final: '2023-12-29' } as const;

  for (const window of ['fold-a', 'fold-b', 'final'] as const) {
    for (const row of await readArchive(window)) {
      if (row.stage === 'sobol' || ends[window] <= cutoff) {
        const map = guard.get(row.symbol) ?? guard.set(row.symbol, new Map()).get(row.symbol)!;

        if (!map.has(row.grid)) {
          map.set(row.grid, row.stage === 'sobol' ? 'archive-sobol' : `archive-local-${window}`);
        }
      } else {
        (later.get(row.symbol) ?? later.set(row.symbol, new Set()).get(row.symbol)!).add(row.grid);
      }
    }
  }

  return { guard, later };
};

// The search itself (no file, no guard): the stage below and the post-cutoff mutation test both call it.
export const searchCore = async (fold: FoldKey, loaded: LoadedUniverse, fast: Fast) => {
  const symbols = Object.keys(loaded.universe.instruments).sort();
  const { guard: archived, later } = await archivedKeys(folds[fold].cutoff);
  const causes: Record<string, Record<string, number>> = {};
  const laterLocal: Record<string, string[]> = {};
  const dates = loaded.universe.dates;
  const sessions = loaded.universe.sessionCount;
  const seen = new Map<string, Set<string>>(symbols.map((symbol) => [symbol, new Set<string>()]));
  const candidates = new Map<string, Candidate[]>(symbols.map((symbol) => [symbol, []]));
  const collisions: Record<string, number> = {};
  const skipped: Record<string, number> = {};

  log(`search ${fold}: ${symbols.length} symbols through ${loaded.universe.end}, min trades ${fast.minTrades}`);

  // 1. Sobol
  const sobolItems: { symbol: string; grid: Grid; origin: string }[] = [];

  for (const symbol of symbols) {
    collisions[symbol] = 0;
    skipped[symbol] = 0;

    for (const vector of sobolVectors(symbol, newSearch.sobol, sobolLabel)) {
      const key = gridKeyOf(vector.grid);

      if (archived.get(symbol)?.has(key)) {
        const cause = `sobol-drop:${archived.get(symbol)!.get(key)}`;

        collisions[symbol]!++;
        (causes[symbol] ??= {})[cause] = (causes[symbol]![cause] ?? 0) + 1;
        continue;
      }

      if (later.get(symbol)?.has(key)) {
        (laterLocal[symbol] ??= []).push(key);
      }

      seen.get(symbol)!.add(key);
      sobolItems.push({ symbol, grid: vector.grid, origin: vector.origin });
    }
  }

  const sobolMetrics = await fast.standalone(sobolItems);

  sobolItems.forEach((item, index) =>
    candidates
      .get(item.symbol)!
      .push(
        candidateOf(
          sobolMetrics[index]!,
          { symbol: item.symbol, provenance: 'new', stage: 'new-sobol', origin: item.origin },
          dates
        )
      )
  );
  log(`search ${fold}: Sobol done (${fast.evaluations} evaluations)`);

  // 2. refinement starts by family quota
  const starts: { symbol: string; start: number; quota: string; current: Candidate }[] = [];

  for (const symbol of symbols) {
    const credible = candidates
      .get(symbol)!
      .filter((candidate) => candidate.credible)
      .sort(byKey);
    const list = credible.map((candidate) => ({
      key: candidate.key,
      net: candidate.net,
      path: pathOf(candidate.intervals!, sessions)
    }));
    const { families } = clusterFamilies(list);
    const byFamilyT = families
      .map((family) => ({ family, rep: family.members.map((m) => credible[m]!).sort(byT)[0]! }))
      .sort((a, b) => byT(a.rep, b.rep));
    // support, order-independent: the credible Sobol vectors within the family diameter of the family's medoid
    const bySupport = families
      .map((family) => {
        const rep = credible[medoidOf(list, family)]!;
        const repPath = list[credible.indexOf(rep)]!.path;

        return {
          family,
          rep,
          support: list.filter((item) => pathDistance(repPath, item.path) <= rules.supportRadius).length
        };
      })
      .sort((a, b) => b.support - a.support || byKey(a.rep, b.rep));
    const byDd = families
      .map((family) => ({
        family,
        rep: family.members.map((m) => credible[m]!).sort((a, b) => a.dd - b.dd || byKey(a, b))[0]!
      }))
      .sort((a, b) => a.rep.dd - b.rep.dd || byKey(a.rep, b.rep));
    const used = new Set<number>();
    const take = (order: { family: { id: number }; rep: Candidate }[], count: number, quota: string) => {
      for (const entry of order) {
        if (count <= 0) {
          break;
        }

        if (!used.has(entry.family.id)) {
          used.add(entry.family.id);
          starts.push({ symbol, start: starts.filter((s) => s.symbol === symbol).length, quota, current: entry.rep });
          count--;
        }
      }

      return count;
    };

    let missing = take(byFamilyT, newSearch.starts.score, 'score');

    missing += take(bySupport, newSearch.starts.support, 'support');
    missing += take(byDd, newSearch.starts.downside, 'downside');
    take(byFamilyT, missing, 'fill');
  }

  // 3. refinement rounds (all symbols' starts together, round by round)
  const used = new Map<string, number>(symbols.map((symbol) => [symbol, 0]));
  const path: Record<string, { start: number; quota: string; from: string; to: string; moves: number }[]> = {};

  for (let round = 0; round < newSearch.rounds; round++) {
    const moves: { startIndex: number; symbol: string; grid: Grid; origin: string }[] = [];

    starts.forEach((start, startIndex) => {
      const rng = Rng.from(study.seedLabel, 'refine', fold, start.symbol, start.start, round);
      const centre = vectorOf(start.current.grid, start.current.origin);

      for (let m = 0; m < newSearch.movesPerRound; m++) {
        if (used.get(start.symbol)! >= newSearch.refinements) {
          skipped[start.symbol]!++;
          continue;
        }

        let accepted: Grid | undefined;

        for (let attempt = 0; attempt < newSearch.attempts && !accepted; attempt++) {
          const origin = `refine:${fold}:${start.symbol}:${start.start}:${round}:${m}`;
          const moved = m < newSearch.singleMoves ? mutateOne(centre, rng, origin) : mutateAll(centre, rng, origin);
          const key = gridKeyOf(moved.grid);

          if (!seen.get(start.symbol)!.has(key) && !archived.get(start.symbol)?.has(key)) {
            accepted = moved.grid;

            if (later.get(start.symbol)?.has(key)) {
              (laterLocal[start.symbol] ??= []).push(key);
            }
          } else {
            const cause = seen.get(start.symbol)!.has(key)
              ? 'redraw:duplicate'
              : `redraw:${archived.get(start.symbol)!.get(key)}`;

            (causes[start.symbol] ??= {})[cause] = (causes[start.symbol]![cause] ?? 0) + 1;
          }
        }

        if (!accepted) {
          skipped[start.symbol]!++;
          continue;
        }

        seen.get(start.symbol)!.add(gridKeyOf(accepted));
        used.set(start.symbol, used.get(start.symbol)! + 1);
        moves.push({
          startIndex,
          symbol: start.symbol,
          grid: accepted,
          origin: `refine:${fold}:${start.symbol}:${start.start}:${round}:${m}`
        });
      }
    });

    const metrics = await fast.standalone(moves);
    const bestOf = new Map<number, Candidate>();

    moves.forEach((move, index) => {
      const candidate = candidateOf(
        metrics[index]!,
        { symbol: move.symbol, provenance: 'new', stage: 'refine', origin: move.origin },
        dates
      );

      candidates.get(move.symbol)!.push(candidate);

      if (candidate.credible) {
        const seenBest = bestOf.get(move.startIndex);

        if (!seenBest || byT(candidate, seenBest) < 0) {
          bestOf.set(move.startIndex, candidate);
        }
      }
    });

    starts.forEach((start, startIndex) => {
      const best = bestOf.get(startIndex);
      const from = start.current.key;

      if (best && best.t > start.current.t) {
        start.current = best;
      }

      (path[start.symbol] ??= []).push({
        start: start.start,
        quota: start.quota,
        from,
        to: start.current.key,
        moves: moves.filter((move) => move.startIndex === startIndex).length
      });
    });

    log(`search ${fold}: refinement round ${round + 1} done (${fast.evaluations} evaluations)`);
  }

  return { symbols, candidates, collisions, skipped, causes, laterLocal, starts, path };
};

export const runSearch = async (fold: FoldKey, options: { workers?: number } = {}) => {
  const target = searchFile(fold);

  if (await fs.pathExists(target)) {
    throw new Error(`${target} exists: the new search of fold ${fold} is sealed and never rerun`);
  }

  const guard = await requireCodeFrozen();
  const startedAt = nowIso();
  const { loaded, door } = await trainingUniverse(fold);
  const fast = await Fast.create(loaded, options.workers);
  const { symbols, candidates, collisions, skipped, causes, laterLocal, starts, path } = await searchCore(
    fold,
    loaded,
    fast
  );
  await fast.close();

  const all = symbols.flatMap((symbol) => candidates.get(symbol)!);
  const file = searchCandidatesFile(fold);

  await writeCandidates(file, all);

  return writeRecord(target, {
    stage: 'new-search',
    fold,
    startedAt,
    finishedAt: nowIso(),
    guard,
    door,
    workers: fast.evaluator.runner.size,
    cores: os.availableParallelism(),
    cutoff: folds[fold].cutoff,
    minTrades: fast.minTrades,
    budget: { sobol: newSearch.sobol, refinements: newSearch.refinements },
    seeds: {
      sobol: `sobolVectors(symbol, ${newSearch.sobol}, '${sobolLabel}') — deriveSeed('d1-ranked-preemption', '${sobolLabel}', symbol)`,
      refine: `Rng.from('${study.seedLabel}', 'refine', '${fold}', symbol, start, round)`
    },
    evaluations: fast.evaluations,
    perSymbol: Object.fromEntries(
      symbols.map((symbol) => {
        const list = candidates.get(symbol)!;

        return [
          symbol,
          {
            sobol: list.filter((c) => c.stage === 'new-sobol').length,
            refine: list.filter((c) => c.stage === 'refine').length,
            credible: list.filter((c) => c.credible).length,
            collisionsDropped: collisions[symbol],
            movesSkipped: skipped[symbol],
            causes: causes[symbol] ?? {},
            laterLocalCollisionsKept: laterLocal[symbol] ?? [],
            starts: starts.filter((s) => s.symbol === symbol).length
          }
        ];
      })
    ),
    refinementPaths: path,
    candidates: { file, sha256: await sha256File(file), rows: all.length }
  });
};

export const readSearchCandidates = async (fold: FoldKey) => {
  const record = await readStageRecord<{ bodyHash: string; candidates: { file: string; sha256: string } }>(
    searchFile(fold)
  );

  if ((await sha256File(record.candidates.file)) !== record.candidates.sha256) {
    throw new Error(`${record.candidates.file}: does not hash to its sealed search record`);
  }

  return readCandidates(record.candidates.file);
};
