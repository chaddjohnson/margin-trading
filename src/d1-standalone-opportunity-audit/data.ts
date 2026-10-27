// The study's data access (PROTOCOL.md §3). Each door refuses what it may not open before a byte is read, and the
// research doors go through the ranked-preemption study's own door (inspectionUniverse), so that study's chronology,
// audited file hashes and end dates apply unchanged:
//
//   candidateUniverse(members, end?)   final-window research phenotypes and the common-window incumbents: the audited
//                                      universe through at most 2023-12-29 (the candidates' authorized horizon).
//   foldUniverse(fold, members, end?)  a fold's representatives, through at most that fold's sealed validation end
//                                      (the source study's door permits exactly this after its sealed validation).
//   fullHistoryUniverse()              VOOG VGT XBI XRT KRE GDX on `all` (2016-01-04 → 2026-10-13), pinned to
//                                      config/pools/B5.json, for the unchanged incumbents (S, B4, B5, C0) only. The door
//                                      restricts symbols; research vectors of those symbols are kept off it by their
//                                      cutoff (views.ts refuses them after 2023-12-29) and no Stage 3–4 path calls it.
import { loadAuditUniverse } from '../b4-b5-robustness/cli.ts';
import { inspectionUniverse, loadedBarsHash } from '../d1-ranked-preemption/data.ts';
import type { NUniverse } from '../portfolio-aware-d1/nbook/engine.ts';
import type { LoadedUniverse } from '../portfolio-aware-d1/nbook/universe.ts';
import { type FoldKey, armingDate, candidateCutoff, firstSession, poolMembers, windows } from './context.ts';

export interface DoorRecord {
  door: 'candidate' | 'fold' | 'full-history';
  window: string;
  endDate: string;
  firstDate: string;
  lastDate: string;
  sessions: number;
  eligibilityDate: string;
  symbols: string[];
  dataSha256: Record<string, string>;
  loadedBarsSha256: Record<string, string>;
}

const assertShape = (universe: NUniverse, end: string, label: string) => {
  if (universe.dates[0] !== firstSession) {
    throw new Error(`${label}: the universe starts ${universe.dates[0]}, not ${firstSession}`);
  }

  if (universe.end > end || universe.dates.at(-1)! > end) {
    throw new Error(`${label}: the universe ends ${universe.end}, after its authorized ${end}`);
  }

  for (const [symbol, instrument] of Object.entries(universe.instruments)) {
    if (instrument.ds.lastDate > end) {
      throw new Error(`${label}: ${symbol} has bars after ${end}`);
    }
  }

  if (universe.dates[universe.eligibilityIndex] !== armingDate) {
    throw new Error(`${label}: the first eligible session is ${universe.dates[universe.eligibilityIndex]}`);
  }
};

const recordOf = (door: DoorRecord['door'], window: string, end: string, loaded: LoadedUniverse): DoorRecord => {
  const symbols = Object.keys(loaded.universe.instruments).sort();

  return {
    door,
    window,
    endDate: end,
    firstDate: loaded.universe.dates[0]!,
    lastDate: loaded.universe.end,
    sessions: loaded.universe.sessionCount,
    eligibilityDate: loaded.universe.dates[loaded.universe.eligibilityIndex]!,
    symbols,
    dataSha256: Object.fromEntries(symbols.map((symbol) => [symbol, loaded.universe.instruments[symbol]!.hash])),
    loadedBarsSha256: Object.fromEntries(symbols.map((symbol) => [symbol, loadedBarsHash(loaded, symbol)]))
  };
};

export const candidateUniverse = async (members: readonly string[], end: string = candidateCutoff) => {
  if (end > candidateCutoff) {
    throw new Error(
      `research phenotypes may be evaluated through ${candidateCutoff} only (PROTOCOL.md §3): ${end} refused`
    );
  }

  const loaded = await inspectionUniverse('final', [...new Set(members)], end);

  assertShape(loaded.universe, end, 'candidate door');

  return { universe: loaded.universe, door: recordOf('candidate', 'final', end, loaded) };
};

export const foldUniverse = async (fold: FoldKey, members: readonly string[], end?: string) => {
  const last = windows[fold].validationEnd!;
  const until = end ?? last;

  if (until > last) {
    throw new Error(`${fold} representatives may be evaluated through ${last} only: ${until} refused`);
  }

  const loaded = await inspectionUniverse(fold, [...new Set(members)], until);

  assertShape(loaded.universe, until, `${fold} door`);

  return { universe: loaded.universe, door: recordOf('fold', fold, until, loaded) };
};

// The completed audits' loader, unchanged (it refuses data that differ from config/pools/B5.json's pins).
export const fullHistoryUniverse = async (members: readonly string[] = poolMembers) => {
  for (const symbol of members) {
    if (!(poolMembers as readonly string[]).includes(symbol)) {
      throw new Error(`${symbol}: the full-history door opens the unchanged incumbents' symbols only`);
    }
  }

  const universe = await loadAuditUniverse();
  const symbols = Object.keys(universe.instruments).sort();

  return {
    universe,
    door: {
      door: 'full-history',
      window: 'all',
      endDate: universe.end,
      firstDate: universe.dates[0]!,
      lastDate: universe.end,
      sessions: universe.sessionCount,
      eligibilityDate: universe.dates[universe.eligibilityIndex]!,
      symbols,
      dataSha256: Object.fromEntries(symbols.map((symbol) => [symbol, universe.instruments[symbol]!.hash])),
      loadedBarsSha256: {}
    } satisfies DoorRecord
  };
};
