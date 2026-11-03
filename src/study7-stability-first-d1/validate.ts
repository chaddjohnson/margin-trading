// The fold evidence and qualification stage (PROTOCOL.md §10.2, §11.1) for one track × outer fold: the fold's sealed
// shortlist and controls on the fold's test door (F19, F20, M) or, for fold L, on its own search door (in-sample),
// after every Phase B search job is sealed. Confirmation families are new seeds never used by the search. Also PBO by
// CSCV over the rung-2 set and the shortlist's training → test decay. Sealed per track-fold; never re-run.
import fs from 'fs-extra';
import { pboOf } from '../d1-robust/pbo.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import {
  type FoldKey,
  type TrackKey,
  bookOrder,
  cacheDir,
  folds,
  frozenGrids,
  frozenPools,
  gdxControls,
  halfYears,
  searchFile,
  tracks,
  validationFile
} from './context.ts';
import { openDoor } from './data.ts';
import { type Books, Evaluator, Lab, PointCache, cacheFileOf } from './evaluate.ts';
import { type Evidence, evidenceOf, qualificationOf } from './evidence.ts';
import { floorsOf } from './fitness.ts';
import { requireAllSearchesSealed } from './gates.ts';
import { log, nowIso, readSealed, writeSealed } from './records.ts';
import { spearman } from './stats.ts';

const parseBooks = (key: string): Books =>
  Object.fromEntries(
    key.split('|').map((part) => {
      const [symbol, values] = part.split(':') as [string, string];
      const [X, Y, stop, hold, L, buffer, P, W] = values.split('/').map(Number);

      return [
        symbol,
        { targetPercentChange: X!, trailingBuyPercentage: Y!, trailingStopPercentage: stop!, maximumHoldDays: hold!, tickWindowSize: L!, intradayLossBuffer: buffer!, pullback: P!, continuationWindow: W! } satisfies Grid
      ];
    })
  );

export const periodKeysOf = (fold: FoldKey) =>
  ({
    F19: { train: 'TRAIN-F19', test: 'TEST-F19' },
    F20: { train: 'TRAIN-F20', test: 'TEST-F20' },
    M: { train: 'DEV', test: 'VAL' },
    L: { train: 'TRAIN-L', test: undefined }
  })[fold];

export const controlsOf = (track: TrackKey): Record<string, Books> => {
  const symbols = [...tracks[track].books] as string[];
  const out: Record<string, Books> = { B1: { VGT: { ...frozenGrids.VGT } }, B5: Object.fromEntries(bookOrder.map((s) => [s, { ...frozenGrids[s] }])) };

  if (track === 'G') {
    for (const [key, control] of Object.entries(gdxControls)) out[key] = { GDX: { ...control.grid } };
  } else {
    const frozenKey = (Object.keys(frozenPools) as (keyof typeof frozenPools)[]).find(
      (key) => frozenPools[key].length === symbols.length && frozenPools[key].every((s) => symbols.includes(s))
    );

    if (frozenKey && frozenKey !== 'B1') out[frozenKey] = Object.fromEntries(symbols.map((s) => [s, { ...frozenGrids[s as keyof typeof frozenGrids] }]));
  }

  return out;
};

interface SearchRecord {
  shortlist: { rank: number; pick: string; id: string; books: Books; selection: { pooled: { nb: { robustPerYear: number; medianPerYear: number; p10PerYear: number; p90Dd: number; share: number } } } }[];
  rung2: { id: string; books: string; violation: number; nb: { robustPerYear: number } }[];
  bodyHash: string;
}

export const runValidation = async (track: TrackKey, fold: FoldKey) => {
  const file = validationFile(track, fold);

  if (await fs.pathExists(file)) throw new Error(`${file} exists (sealed); validation refuses to re-run`);
  if (track === 'V') throw new Error('the Track V diagnostic is never validated (PROTOCOL.md §9.5)');

  await requireAllSearchesSealed();

  const started = Date.now();
  const search = await readSealed<SearchRecord>(searchFile(track, fold));
  const doorKey = fold === 'L' ? ('search-L' as const) : (`test-${fold}` as const);
  const door = await openDoor(doorKey, [...bookOrder], `Phase D evidence ${track} ${fold}`, { gate: requireAllSearchesSealed });
  const ev = new Evaluator(door);
  const lab = new Lab(ev, await PointCache.open(door, cacheFileOf(cacheDir, `validate-${track}-${fold}`)));
  const y = ev.yearsOfRun();
  const end = door.dates[door.lastIndex]!;
  const floors = floorsOf(y, 2017, Number(end.slice(0, 4)));
  const keys = periodKeysOf(fold);
  const options = { prefix: 'confirm', track, fold, floors, trainKey: keys.train, ...(keys.test ? { testKey: keys.test } : {}) };
  const controls = controlsOf(track);
  const controlEvidence: Record<string, Evidence> = {};

  for (const [key, books] of Object.entries(controls)) {
    controlEvidence[key] = evidenceOf(lab, books, { ...options, sequence: Object.keys(books).length > 1 || key === 'B1' });
    lab.cache.flushSync();
    log(`${track} ${fold}: control ${key} done (${lab.computed} points)`);
  }

  const pooled = tracks[track].books.length > 1;
  const candidates = search.shortlist.map((item) => {
    const evidence = evidenceOf(lab, item.books, options);
    const qualification = qualificationOf(evidence, floors, { fold, trainKey: keys.train, ...(keys.test ? { testKey: keys.test } : {}), b1: controlEvidence.B1, pooled });

    lab.cache.flushSync();
    log(`${track} ${fold}: ${item.id} [${item.pick}] ${qualification.qualified ? 'qualified' : `failed ${qualification.failed.join(',')}`}`);

    return { rank: item.rank, pick: item.pick, id: item.id, books: item.books, trainingSelection: item.selection.pooled.nb, evidence, qualification, infeasibleOnTraining: item.pick === 'infeasible on training' };
  });

  for (const candidate of candidates) {
    if (candidate.infeasibleOnTraining) {
      candidate.qualification.qualified = false;
      candidate.qualification.failed.push('infeasible on training');
    }
  }

  const controlGates = Object.fromEntries(
    Object.entries(controlEvidence).map(([key, evidence]) => [
      key,
      qualificationOf(evidence, floors, { fold, trainKey: keys.train, ...(keys.test ? { testKey: keys.test } : {}), b1: controlEvidence.B1, pooled: Object.keys(controls[key]!).length > 1 })
    ])
  );

  // PBO (CSCV) over the rung-2 set's 64 best (constrained-domination order = the sealed rung-2 list order, feasible first)
  const r2 = [...search.rung2].sort((a, b) => (a.violation === 0 ? 0 : 1) - (b.violation === 0 ? 0 : 1) || b.nb.robustPerYear - a.nb.robustPerYear || (a.id < b.id ? -1 : 1)).slice(0, 64);
  const halves = halfYears().filter((h) => h.start >= '2018-01-01' && h.end <= end.slice(0, 4) + '-12-31' && h.start <= end);
  const usable = halves.filter((h) => r2.length && typeof lab.point(parseBooks(r2[0]!.books)).periods[h.key] === 'number');
  const blocks = usable.length % 2 === 0 ? usable : usable.slice(1);
  const matrix = r2.map((item) => {
    const record = lab.point(parseBooks(item.books));

    return blocks.map((h) => record.periods[h.key] ?? 0);
  });
  const pbo = r2.length >= 2 && blocks.length >= 2 ? pboOf(matrix, blocks.length) : { pbo: NaN, splits: 0, configs: r2.length };

  // training → test decay of the shortlist
  const trainRobust = candidates.map((c) => c.trainingSelection.robustPerYear);
  const testMedian = candidates.map((c) => c.evidence.decisive.test?.median ?? NaN);
  const decay = {
    trainRobustPerYear: trainRobust,
    testMedian,
    spearman: candidates.length >= 3 && keys.test ? spearman(trainRobust, testMedian) : NaN
  };

  lab.cache.flushSync();

  const record = await writeSealed(file, {
    stage: 'PHASE_D_EVIDENCE',
    track,
    fold,
    at: nowIso(),
    door: { key: door.key, id: door.id, last: end, sessions: door.dates.length },
    search: { file: searchFile(track, fold), bodyHash: search.bodyHash },
    y,
    floors,
    periodKeys: keys,
    candidates,
    controls: Object.fromEntries(Object.entries(controlEvidence).map(([key, evidence]) => [key, { evidence, qualification: controlGates[key] }])),
    pbo: { ...pbo, blocks: blocks.map((h) => h.key), configs: r2.length },
    decay,
    stats: lab.stats(),
    seconds: (Date.now() - started) / 1000
  });

  log(`${track} ${fold}: validation sealed ${record.file} ${record.bodyHash.slice(0, 12)} (${((Date.now() - started) / 60000).toFixed(1)} min)`);

  void folds;
};
