// Chronological evaluation (PROTOCOL.md §8). One phase = one continuous run per vector from 2016-01-04 to the phase's
// end through the evaluation door, windows (b, e] starting at each listed boundary:
//
//   A         fold A → 2021-12-31, windows from 2020-06-30 (fold A; T1's selection window)
//   B-sel     fold B → 2022-12-30, window from 2021-12-31 (T2's selection window; the rolling year S21)
//   B         fold B → 2023-12-29, windows from 2021-12-31 (fold B) and 2022-12-30 (T2's later window)
//   T1-later  fold A's NEW and NEW-S vectors only → 2023-12-29, windows from 2020-06-30 and 2021-12-31 (T1's later)
//   S18 S19 S20 S22  the supplementary folds → their evaluation ends, window from the cutoff
//
// Every library member of the phase's pools runs on the fast path at 5 bps (V, windowed minute and daily drawdown,
// lots after each boundary); every nominee (and nested pick, and VGT primary as the matching-window reference) also at
// 0/2/10 bps on the fast path and at 0/2/5/10 bps on the full engine (ledgers, MAE/MFE), whose V must equal the fast
// path's to the cent; the 20% portfolio at 5 bps; the window's episode capture; for the primary cells, 16
// neighbourhood draws through the window (diagnostic only). Boundary parity: each vector's mark at its fold's cutoff
// must equal its sealed training net. Cross-phase parity: B-sel's V = B's first-window V minus its second, A's V = T1-
// later's first-window V minus its second. Any failure stops the phase (fail closed). Sealed once per phase.
import { gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import { capturesOf, catalogOf, deepConditionSessions, familiesOf } from '../d1-standalone-opportunity-audit/events.ts';
import type { CompactLot, RunRecord } from '../d1-standalone-opportunity-audit/run.ts';
import { neighbour, vectorOf } from '../d1-ranked-preemption/space.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import {
  type FoldKey,
  type PoolKey,
  type SourceWindow,
  folds,
  libraryArms,
  libraryKs,
  log,
  nowIso,
  primaryK,
  resultFile,
  source,
  study,
  triples,
  vgtPrimary
} from './context.ts';
import {
  eligibleSymbols,
  evaluationUniverse,
  isSealedFile,
  nestedSelectionFile,
  selectionFile,
  sourceCap
} from './doors.ts';
import { engineRunner, engineSpec } from './engine.ts';
import { Fast, type Grid, gridKeyOf, gridOfKey } from './fast.ts';
import { readStageRecord, requireCodeFrozen } from './freeze.ts';
import { readSealed, sha256File, sha256Json, writeRecord } from './records.ts';
import { readMembers, readSelection } from './selection.ts';

export type PhaseKey = 'A' | 'B-sel' | 'B' | 'T1-later' | 'S18' | 'S19' | 'S20' | 'S22';
export const phaseKeys: readonly PhaseKey[] = ['A', 'B-sel', 'B', 'T1-later', 'S18', 'S19', 'S20', 'S22'];

export interface Phase {
  key: PhaseKey;
  fold: FoldKey;
  end: string;
  starts: string[]; // window boundaries (dates); the first is the fold's cutoff
  pools: readonly PoolKey[];
  engine: boolean; // full-engine nominee runs, portfolio and capture
  captureStart: string; // the boundary whose window the capture diagnostics describe
  nested?: 'T1' | 'T2'; // the nested picks included as nominees
  requires: string[];
}

export const evaluationFile = (phase: PhaseKey) => resultFile('evaluation', phase, 'EVALUATION.json');
const fastFile = (phase: PhaseKey) => resultFile('evaluation', phase, 'fast.jsonl.gz');
const engineFile = (phase: PhaseKey) => resultFile('evaluation', phase, 'engine.jsonl.gz');

export const phaseOf = (key: PhaseKey): Phase => {
  switch (key) {
    case 'A':
      return {
        key,
        fold: 'A',
        end: '2021-12-31',
        starts: ['2020-06-30'],
        pools: folds.A.pools,
        engine: true,
        captureStart: '2020-06-30',
        requires: [selectionFile('A')]
      };
    case 'B-sel':
      return {
        key,
        fold: 'B',
        end: '2022-12-30',
        starts: ['2021-12-31'],
        pools: folds.B.pools,
        engine: false,
        captureStart: '2021-12-31',
        requires: [selectionFile('B'), nestedSelectionFile('T1')]
      };
    case 'B':
      return {
        key,
        fold: 'B',
        end: '2023-12-29',
        starts: ['2021-12-31', '2022-12-30'],
        pools: folds.B.pools,
        engine: true,
        captureStart: '2021-12-31',
        nested: 'T2',
        requires: [selectionFile('B'), nestedSelectionFile('T2'), evaluationFile('B-sel'), selectionFile('S22')]
      };
    case 'T1-later':
      return {
        key,
        fold: 'A',
        end: '2023-12-29',
        starts: ['2020-06-30', '2021-12-31'],
        pools: triples.T1.pools,
        engine: true,
        captureStart: '2021-12-31',
        nested: 'T1',
        requires: [nestedSelectionFile('T1'), nestedSelectionFile('T2'), evaluationFile('A'), selectionFile('S22')]
      };
    default:
      return {
        key,
        fold: key,
        end: folds[key].evaluationEnd,
        starts: [folds[key].cutoff],
        pools: folds[key].pools,
        engine: true,
        captureStart: folds[key].cutoff,
        requires: [selectionFile(key), evaluationFile('B'), evaluationFile('T1-later')]
      };
  }
};

export interface VectorRef {
  symbol: string;
  key: string;
  provenance: 'archive' | 'new' | 'reference';
  trainingNet: number; // the sealed training net at 5 bps (NaN for the reference)
  pools: PoolKey[]; // the pools whose libraries hold it (the door checks a later window's pools)
  window?: SourceWindow; // an archived row's source window (always the fold's own)
}

export interface NomineeRef extends VectorRef {
  slots: string[]; // "<pool>|<arm>|<K>" (A0r and A0 use K "-")
}

// The phase's vectors (every library member of its pools) and nominees, from the sealed selections.
export const phaseVectors = async (phase: Phase) => {
  const selection = await readSelection(phase.fold);
  const vectors = new Map<string, VectorRef>();
  const nominees = new Map<string, NomineeRef>();
  const add = (symbol: string, key: string, provenance: VectorRef['provenance'], net: number) => {
    const id = `${symbol}|${key}`;
    const existing = vectors.get(id);

    if (existing) {
      if (existing.provenance !== provenance || existing.trainingNet !== net) {
        throw new Error(`${id}: two pools disagree on its provenance or training net`);
      }

      return existing;
    }

    const ref: VectorRef = {
      symbol,
      key,
      provenance,
      trainingNet: net,
      pools: [],
      ...(provenance === 'archive' ? { window: folds[phase.fold].sourceWindow } : {})
    };

    vectors.set(id, ref);
    return ref;
  };
  const nominate = (ref: VectorRef, slot: string) => {
    const id = `${ref.symbol}|${ref.key}`;
    const existing = nominees.get(id) ?? { ...ref, slots: [] };

    existing.slots.push(slot);
    nominees.set(id, existing);
  };

  for (const pool of phase.pools) {
    const members = await readMembers(phase.fold, pool);

    for (const [symbol, s] of Object.entries(selection.selections[pool]!)) {
      const memberOf = (key: string) => {
        const m = members[symbol]![key];

        if (!m) {
          throw new Error(`${pool} ${symbol} ${key}: not a sealed member`);
        }

        // an ALL member keeps its own provenance (archive or new)
        const ref = add(symbol, key, m.provenance, m.net);

        if (!ref.pools.includes(pool)) {
          ref.pools.push(pool);
        }

        return ref;
      };
      const keys = new Set([
        ...s.a0r.library,
        ...s.a0r.checked.map((entry) => entry.key),
        ...s.arms.A1.library,
        ...s.arms.A2.library,
        ...s.arms.A3.library,
        ...s.arms.A1n.library,
        ...s.penaltyDisplaced.map((entry) => entry.key),
        ...(s.a0?.library ?? [])
      ]);

      for (const key of keys) {
        memberOf(key);
      }

      if (s.a0r.nominee) {
        nominate(memberOf(s.a0r.nominee.key), `${pool}|A0r|-`);
      }

      if (s.a0?.nominee) {
        nominate(memberOf(s.a0.nominee), `${pool}|A0|-`);
      }

      for (const arm of libraryArms) {
        for (const k of libraryKs) {
          const nominee = s.arms[arm].nominees[String(k)];

          if (nominee) {
            nominate(memberOf(nominee.key), `${pool}|${arm}|${k}`);
          }
        }
      }
    }
  }

  if (phase.nested) {
    const nested = await readStageRecord<{
      bodyHash: string;
      picks: Record<string, Record<string, Record<string, { key: string } | null>>>;
    }>(nestedSelectionFile(phase.nested));

    for (const [pool, bySymbol] of Object.entries(nested.picks)) {
      if (!phase.pools.includes(pool as PoolKey)) {
        continue;
      }

      for (const [symbol, byK] of Object.entries(bySymbol)) {
        for (const [k, pick] of Object.entries(byK)) {
          if (pick) {
            const ref = vectors.get(`${symbol}|${pick.key}`);

            if (!ref) {
              throw new Error(
                `${phase.nested} pick ${symbol} ${pick.key} is not a library member of fold ${phase.fold}`
              );
            }

            nominate(ref, `${pool}|A4|${k}`);
          }
        }
      }
    }
  }

  // every candidate's door: an archived vector never beyond its source window's own door
  const sourceWindow = folds[phase.fold].sourceWindow;

  for (const ref of vectors.values()) {
    if (ref.provenance === 'archive') {
      if (!sourceWindow) {
        throw new Error(`${ref.symbol} ${ref.key}: an archived vector in fold ${phase.fold}, which has no archive`);
      }

      sourceCap(sourceWindow, phase.end);
    }
  }

  // the matching-window reference (registered; context only, never a candidate)
  nominees.set(`VGT|reference`, {
    symbol: vgtPrimary.symbol,
    key: gridKeyOf(vgtPrimary.grid as unknown as Grid),
    provenance: 'reference',
    trainingNet: NaN,
    pools: [],
    slots: ['reference|VGT-primary|-']
  });

  return { selection, vectors: [...vectors.values()], nominees: [...nominees.values()] };
};

const liquidationMark = (universe: NUniverse, record: RunRecord, index: number, costBps: number) => {
  const row = record.daily!.find((item) => item.index === index);

  if (!row) {
    throw new Error(`${record.key}: no daily row at session ${index}`);
  }

  let friction = 0;

  for (const lot of record.lots) {
    if (lot.entryIndex <= index && (lot.exitIndex < 0 || lot.exitIndex > index)) {
      friction += lot.shares * universe.instruments[lot.symbol]!.ds.sClose[index]! * (costBps / 10000);
    }
  }

  return row.strategyMark - friction;
};

const portfolioWindows = (record: RunRecord, starts: number[], end: number) =>
  starts.map((start) => {
    const rows = record.daily!.filter((row) => row.index >= start && row.index <= end);
    const first = rows[0]!;
    let peak = first.equity;
    let worst = 0;

    for (const row of rows) {
      peak = Math.max(peak, row.equity);
      worst = Math.max(worst, (peak - row.equity) / peak);
    }

    return { start, equityStart: first.equity, equityEnd: rows.at(-1)!.equity, maxDailyPercentDrawdown: worst };
  });

const lotRow = (lot: CompactLot) => ({
  id: lot.id,
  setup: lot.setup,
  entryIndex: lot.entryIndex,
  entryTime: lot.entryTime,
  entryDate: lot.entryDate,
  entryRawPrice: lot.entryRawPrice,
  entryPrice: lot.entryPrice,
  exitIndex: lot.exitIndex,
  exitTime: lot.exitTime,
  exitDate: lot.exitDate,
  exitRawPrice: lot.exitRawPrice,
  exitReason: lot.exitReason,
  shares: lot.shares,
  gross: lot.gross,
  interest: lot.interest,
  friction: lot.friction,
  net: lot.net,
  heldDays: lot.heldDays,
  occupiedDays: lot.occupiedDays,
  maePercent: lot.maePercent,
  maeDollars: lot.maeDollars,
  mfePercent: lot.mfePercent
});

const capturesFor = (universe: NUniverse, symbol: string, grid: Grid, lots: readonly CompactLot[], start: number) => {
  const ds = universe.instruments[symbol]!.ds;
  const last = universe.dates.length - 1;
  const catalog = catalogOf(symbol, universe.dates, ds.sClose, universe.eligibilityIndex, last);
  const windowEpisodes = catalog.filter((episode) => episode.troughIndex > start);
  const condition = deepConditionSessions(ds, grid.targetPercentChange / 1000, grid.tickWindowSize, start + 1);
  const after = lots.filter((lot) => lot.entryIndex > start);

  return {
    episodes: windowEpisodes.length,
    families: [...new Set(windowEpisodes.map((episode) => episode.family))],
    majorFamilies: [...new Set(windowEpisodes.filter((episode) => episode.major).map((episode) => episode.family))],
    captures: capturesOf(windowEpisodes, after, condition)
  };
};

export const windowCatalogs = (universe: NUniverse, start: number) =>
  Object.fromEntries(
    Object.keys(universe.instruments)
      .sort()
      .map((symbol) => {
        const ds = universe.instruments[symbol]!.ds;
        const catalog = catalogOf(
          symbol,
          universe.dates,
          ds.sClose,
          universe.eligibilityIndex,
          universe.dates.length - 1
        );
        const windowEpisodes = catalog.filter((episode) => episode.troughIndex > start);
        const families = familiesOf(catalog, ds.sClose).filter((family) =>
          windowEpisodes.some((episode) => episode.family === family.id)
        );

        return [symbol, { episodes: windowEpisodes, families }];
      })
  );

export const runEvaluation = async (phaseKey: PhaseKey, options: { workers?: number } = {}) => {
  const guard = await requireCodeFrozen();
  const phase = phaseOf(phaseKey);
  const target = evaluationFile(phaseKey);

  if (await fs.pathExists(target)) {
    throw new Error(`${target} exists: phase ${phaseKey} is sealed and never rerun`);
  }

  for (const file of phase.requires) {
    if (!(await isSealedFile(file))) {
      throw new Error(`phase ${phaseKey} requires the sealed ${file} first (PROTOCOL.md §8.2)`);
    }
  }

  const startedAt = nowIso();
  const { selection, vectors, nominees } = await phaseVectors(phase);
  const { loaded, door } = await evaluationUniverse(phase.fold, phase.end, await eligibleSymbols(), [
    ...vectors,
    ...nominees
  ]);
  const universe = loaded.universe;
  const startIndex = phase.starts.map((date) => {
    const index = universe.dates.indexOf(date);

    if (index < 0) {
      throw new Error(`${date} is not a session of the phase universe`);
    }

    return index;
  });
  const endIndex = universe.dates.length - 1;

  if (universe.end !== phase.end) {
    throw new Error(`phase ${phaseKey}: the universe ends ${universe.end}, not ${phase.end}`);
  }

  log(
    `evaluation ${phaseKey}: ${vectors.length} vectors, ${nominees.length} nominees (incl. the reference), through ${universe.end}`
  );

  // ----- fast path: every vector at 5 bps; nominees also at 0, 2, 10 bps -----
  const fast = await Fast.create(loaded, options.workers);
  const fastRows = new Map<
    string,
    Record<
      string,
      { net: number; windows: { start: string; v: number; minuteDd: number; dailyDd: number; lots: number }[] }
    >
  >();
  const runFast = async (refs: readonly VectorRef[], costBps: number) => {
    const chunk = 4096;

    for (let offset = 0; offset < refs.length; offset += chunk) {
      const part = refs.slice(offset, offset + chunk);
      const metrics = await fast.windowed(
        part.map((ref) => ({ symbol: ref.symbol, grid: gridOfKey(ref.key) })),
        startIndex,
        costBps
      );

      part.forEach((ref, index) => {
        const m = metrics[index]!;
        const id = `${ref.symbol}|${ref.key}`;
        const row = fastRows.get(id) ?? {};

        row[String(costBps)] = {
          net: m.net,
          windows: m.windowed.map((w, i) => ({
            start: phase.starts[i]!,
            v: w.net,
            minuteDd: w.minuteDrawdown,
            dailyDd: w.dailyDrawdown,
            lots: w.lots
          }))
        };
        fastRows.set(id, row);
      });
    }
  };

  await runFast(vectors, study.costBps);

  for (const costBps of study.costGrid.filter((cost) => cost !== study.costBps)) {
    await runFast(nominees, costBps);
  }

  await runFast(
    nominees.filter((n) => n.provenance === 'reference'),
    study.costBps
  );
  await fast.close();
  log(`evaluation ${phaseKey}: fast path done`);

  // boundary parity: the mark at the fold's cutoff close = the sealed training net (5 bps)
  const boundaryFailures: string[] = [];

  for (const ref of vectors) {
    const row = fastRows.get(`${ref.symbol}|${ref.key}`)![String(study.costBps)]!;
    const mark = row.net - row.windows[0]!.v;

    if (Math.abs(mark - ref.trainingNet) > 0.01) {
      boundaryFailures.push(
        `${ref.symbol} ${ref.key}: mark at the cutoff ${mark.toFixed(4)} ≠ training net ${ref.trainingNet.toFixed(4)}`
      );
    }
  }

  // cross-phase parity
  const crossFailures: string[] = [];
  const cross = phaseKey === 'B' ? 'B-sel' : phaseKey === 'T1-later' ? 'A' : undefined;

  if (cross) {
    const earlier = await readFastRows(cross);

    for (const ref of vectors) {
      const id = `${ref.symbol}|${ref.key}`;
      const now = fastRows.get(id)![String(study.costBps)]!;
      const before = earlier.get(id)?.[String(study.costBps)];

      if (!before) {
        crossFailures.push(`${id}: missing from ${cross}`);
        continue;
      }

      const v = now.windows[0]!.v - now.windows[1]!.v;

      if (Math.abs(v - before.windows[0]!.v) > 0.01) {
        crossFailures.push(`${id}: ${v.toFixed(4)} ≠ ${cross}'s ${before.windows[0]!.v.toFixed(4)}`);
      }

      // nested boundary parity: the mark at the selection end in this run = the sealed selection-window run's end mark
      const markAtSelectionEnd = now.net - now.windows[1]!.v;

      if (Math.abs(markAtSelectionEnd - before.net) > 0.01) {
        crossFailures.push(
          `${id}: mark at ${phase.starts[1]} ${markAtSelectionEnd.toFixed(4)} ≠ ${cross}'s end mark ${before.net.toFixed(4)}`
        );
      }
    }

    // the same identities at 0, 2 and 10 bps wherever the earlier phase holds the vector at that cost (its nominees;
    // B-sel's 10 bps figures, which S21 uses, are otherwise never engine-checked)
    for (const ref of nominees.filter((n) => n.provenance !== 'reference')) {
      const id = `${ref.symbol}|${ref.key}`;

      for (const costBps of study.costGrid.filter((cost) => cost !== study.costBps)) {
        const now = fastRows.get(id)?.[String(costBps)];
        const before = earlier.get(id)?.[String(costBps)];

        if (!now || !before) {
          continue;
        }

        if (
          Math.abs(now.windows[0]!.v - now.windows[1]!.v - before.windows[0]!.v) > 0.01 ||
          Math.abs(now.net - now.windows[1]!.v - before.net) > 0.01
        ) {
          crossFailures.push(
            `${id} ${costBps} bps: the cross-phase or nested boundary identity fails against ${cross}`
          );
        }
      }
    }
  }

  // ----- full engine: nominees at 0/2/5/10 (ledgers), portfolio at 5 bps, captures, capture draws -----
  const engineRows: Record<string, unknown>[] = [];
  const engineFailures: string[] = [];
  let captureDraws = 0;

  if (phase.engine) {
    const runner = engineRunner(universe, options.workers);
    const captureStart = universe.dates.indexOf(phase.captureStart);
    const primarySlot = (slot: string) => {
      const [, arm, k] = slot.split('|');

      return arm === 'A0' || arm === 'A0r' || arm === 'VGT-primary' || k === String(primaryK);
    };

    await Promise.all(
      nominees.map(async (ref) => {
        const grid = gridOfKey(ref.key);
        const books = [
          { symbol: ref.symbol, grid, phenotype: ref.provenance === 'reference' ? vgtPrimary.id : undefined }
        ];
        const perCost: Record<string, unknown> = {};
        let lots5: CompactLot[] = [];

        for (const costBps of study.costGrid) {
          const record = await runner.run(
            engineSpec({
              key: `${phaseKey}:${ref.symbol}:${ref.key}`,
              subject: ref.symbol,
              books,
              costBps,
              keepDaily: true
            })
          );
          const end = liquidationMark(universe, record, endIndex, costBps);
          const windows = startIndex.map((s, i) => {
            const v = end - liquidationMark(universe, record, s, costBps);
            const fastWindow = fastRows.get(`${ref.symbol}|${ref.key}`)?.[String(costBps)]?.windows[i];

            if (!fastWindow || Math.abs(fastWindow.v - v) > 0.01) {
              engineFailures.push(
                `${ref.symbol} ${ref.key} ${costBps} bps window ${phase.starts[i]}: engine ${v.toFixed(4)} ≠ fast ${fastWindow?.v.toFixed(4)}`
              );
            }

            const after = record.lots.filter((lot) => lot.entryIndex > s);
            // the fast path's windowed daily drawdown convention: the engine's raw daily marks, peak reset at s
            let peak = NaN;
            let dailyDd = 0;

            for (const row of record.daily!) {
              if (row.index === s) {
                peak = row.strategyMark;
              } else if (row.index > s) {
                peak = Math.max(peak, row.strategyMark);
                dailyDd = Math.max(dailyDd, peak - row.strategyMark);
              }
            }

            if (fastWindow && (Math.abs(fastWindow.dailyDd - dailyDd) > 0.01 || fastWindow.lots !== after.length)) {
              engineFailures.push(
                `${ref.symbol} ${ref.key} ${costBps} bps window ${phase.starts[i]}: engine daily DD ${dailyDd.toFixed(4)} / lots ${after.length} ≠ fast ${fastWindow.dailyDd.toFixed(4)} / ${fastWindow.lots}`
              );
            }

            return {
              start: phase.starts[i]!,
              v,
              lotsEntered: after.length,
              openAtStart: record.lots.filter((lot) => lot.entryIndex <= s && (lot.exitIndex < 0 || lot.exitIndex > s))
                .length,
              interest: after.reduce((t, lot) => t + lot.interest, 0),
              friction: after.reduce((t, lot) => t + lot.friction, 0),
              gross: after.reduce((t, lot) => t + lot.gross, 0),
              lotDays: after.reduce((t, lot) => t + lot.occupiedDays, 0)
            };
          });

          perCost[String(costBps)] = {
            net: record.view.net,
            trades: record.view.trades,
            minuteDd: record.view.minuteDrawdown,
            windows
          };

          if (costBps === study.costBps) {
            lots5 = record.lots;
          }
        }

        const portfolio = await runner.run(
          engineSpec({
            key: `${phaseKey}:${ref.symbol}:${ref.key}:portfolio`,
            subject: ref.symbol,
            books,
            mode: 'portfolio',
            keepDaily: true
          })
        );
        const capture = capturesFor(universe, ref.symbol, grid, lots5, captureStart);
        let drawSummary: unknown = null;

        if (ref.slots.some(primarySlot) && ref.provenance !== 'reference') {
          const draws = [];

          for (let d = 0; d < 16; d++) {
            const moved = neighbour(
              [{ symbol: ref.symbol, vector: vectorOf(grid, 'capture') }],
              `d1-wide-library:capture:${phaseKey}`,
              'N1',
              d
            )[0]!;
            const record = await runner.run(
              engineSpec({
                key: `${phaseKey}:${ref.symbol}:${ref.key}:capture:${d}`,
                subject: ref.symbol,
                books: [{ symbol: ref.symbol, grid: moved.vector.grid }],
                boundaryDate: phase.captureStart
              })
            );
            const drawCapture = capturesFor(universe, ref.symbol, moved.vector.grid, record.lots, captureStart);

            draws.push({
              v: record.windowed!.increment,
              dipCapturedFamilies: [...new Set(drawCapture.captures.filter((c) => c.dipCaptured).map((c) => c.family))],
              firstEntryDepth: Object.fromEntries(
                drawCapture.captures
                  .filter((c) => c.firstEntryDepth !== null)
                  .map((c) => [c.episode, c.firstEntryDepth])
              ),
              episodeNets: Object.fromEntries(drawCapture.captures.map((c) => [c.episode, c.net]))
            });
            captureDraws++;
          }

          drawSummary = draws;
        }

        engineRows.push({
          symbol: ref.symbol,
          key: ref.key,
          provenance: ref.provenance,
          slots: ref.slots,
          costs: perCost,
          lots: lots5.map(lotRow),
          portfolio: {
            endEquity: portfolio.metrics.endEquity,
            windows: portfolioWindows(portfolio, startIndex, endIndex)
          },
          capture: {
            episodes: capture.episodes,
            families: capture.families,
            majorFamilies: capture.majorFamilies,
            captures: capture.captures.map((c) => ({
              episode: c.episode,
              family: c.family,
              outcome: c.outcome,
              entries: c.entries,
              dipEntries: c.dipEntries,
              continuationEntries: c.continuationEntries,
              declineEntries: c.declineEntries,
              dipNet: c.dipNet,
              dipCaptured: c.dipCaptured,
              net: c.net,
              firstEntryOffset: c.firstEntryOffset,
              firstEntryDepth: c.firstEntryDepth,
              capturedShare: c.capturedShare,
              worstMae: c.worstMae,
              lots: c.lots
            }))
          },
          captureDraws: drawSummary
        });
      })
    );

    // C0 (the core alone), for the overlay's increment
    const c0 = await runner.run(
      engineSpec({ key: `${phaseKey}:C0`, subject: 'C0', books: [], mode: 'portfolio', keepDaily: true })
    );

    engineRows.push({
      symbol: 'C0',
      key: 'core',
      provenance: 'reference',
      slots: ['reference|C0|-'],
      portfolio: { endEquity: c0.metrics.endEquity, windows: portfolioWindows(c0, startIndex, endIndex) }
    });
    await runner.close();
    log(`evaluation ${phaseKey}: full engine done (${captureDraws} capture draws)`);
  }

  const failures = [...boundaryFailures, ...crossFailures, ...engineFailures];

  if (failures.length > 0) {
    await fs.outputJson(resultFile('evaluation', phaseKey, 'FAILURES.json'), failures.slice(0, 5000), { spaces: 1 });
    throw new Error(
      `phase ${phaseKey}: ${boundaryFailures.length} boundary, ${crossFailures.length} cross-phase and ${engineFailures.length} engine parity failures (fail closed)`
    );
  }

  const fastLines = [...fastRows.entries()].map(([id, row]) => JSON.stringify({ id, ...row }));

  await fs.outputFile(fastFile(phaseKey), gzipSync(`${fastLines.join('\n')}\n`, { level: 9 }));
  engineRows.sort((a, b) => (`${a.symbol}|${a.key}` < `${b.symbol}|${b.key}` ? -1 : 1));
  await fs.outputFile(
    engineFile(phaseKey),
    gzipSync(`${engineRows.map((row) => JSON.stringify(row)).join('\n')}\n`, { level: 9 })
  );

  return writeRecord(target, {
    stage: 'evaluation',
    phase: phaseKey,
    fold: phase.fold,
    startedAt,
    finishedAt: nowIso(),
    guard,
    door,
    starts: phase.starts,
    end: phase.end,
    selection: { file: selectionFile(phase.fold), bodyHash: selection.bodyHash },
    vectors: vectors.length,
    vectorDigest: sha256Json(vectors.map((v) => `${v.symbol}|${v.key}|${v.provenance}`).sort()),
    nominees: nominees.length,
    parity: {
      boundary: { checked: vectors.length, failures: 0 },
      crossPhase: cross ? { against: cross, checked: vectors.length, failures: 0 } : null,
      engine: phase.engine
        ? { checked: nominees.length * study.costGrid.length * startIndex.length, failures: 0 }
        : null
    },
    captureDraws,
    // the price-only window catalog of every window start of the phase (each cell uses its own window's)
    catalogs: Object.fromEntries(
      phase.starts.map((start) => [start, windowCatalogs(universe, universe.dates.indexOf(start))])
    ),
    captureStart: phase.captureStart,
    files: {
      fast: { file: fastFile(phaseKey), sha256: await sha256File(fastFile(phaseKey)) },
      engine: phase.engine ? { file: engineFile(phaseKey), sha256: await sha256File(engineFile(phaseKey)) } : null
    },
    sourceDoors: source.evaluationCap
  });
};

export const readFastRows = async (phase: PhaseKey) => {
  const record = await readStageRecord<{ bodyHash: string; files: { fast: { file: string; sha256: string } } }>(
    evaluationFile(phase)
  );

  if ((await sha256File(record.files.fast.file)) !== record.files.fast.sha256) {
    throw new Error(`${record.files.fast.file}: does not hash to its sealed evaluation record`);
  }

  const { gunzipSync } = await import('node:zlib');
  const rows = new Map<
    string,
    Record<
      string,
      { net: number; windows: { start: string; v: number; minuteDd: number; dailyDd: number; lots: number }[] }
    >
  >();

  for (const line of gunzipSync(await fs.readFile(record.files.fast.file))
    .toString('utf8')
    .split('\n')) {
    if (line.length > 0) {
      const { id, ...row } = JSON.parse(line) as { id: string } & Record<string, never>;

      rows.set(id, row);
    }
  }

  return rows;
};

export const readEngineRows = async (phase: PhaseKey) => {
  const record = await readStageRecord<{
    bodyHash: string;
    files: { engine: { file: string; sha256: string } | null };
  }>(evaluationFile(phase));

  if (!record.files.engine) {
    return [];
  }

  if ((await sha256File(record.files.engine.file)) !== record.files.engine.sha256) {
    throw new Error(`${record.files.engine.file}: does not hash to its sealed evaluation record`);
  }

  const { gunzipSync } = await import('node:zlib');

  return gunzipSync(await fs.readFile(record.files.engine.file))
    .toString('utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
};
