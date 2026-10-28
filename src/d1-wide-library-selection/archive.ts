// Arm ARCHIVE (PROTOCOL.md §4): the source study's sealed Stage A search archives, parsed directly and every row
// re-evaluated through the source's own evaluator on its own training window (5 bps, 11%), so the archived aggregates
// are checked to the cent and each credible row gets the trade path the archive does not store. Training data only:
// the reconstruction of a window reads through that window's search end and nothing later.
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import fs from 'fs-extra';
import { type Sealed, readSealed, sha256File } from '../d1-ranked-preemption/freeze.ts';
import { type FoldKey, type SourceWindow, folds, log, nowIso, readJson, resultFile, source, study } from './context.ts';
import { type Candidate, candidateOf, readCandidates, writeCandidates } from './candidates.ts';
import { sourceTrainingUniverse } from './doors.ts';
import { readStageRecord, requireCodeFrozen } from './freeze.ts';
import { Fast, gridKeyOf, gridOfKey } from './fast.ts';
import { writeRecord } from './records.ts';

export interface ArchiveRow {
  stage: 'sobol' | 'local';
  symbol: string;
  grid: string;
  origin: string;
  trades: number;
  net: number;
  best: number | null;
  dd: number;
  score: number;
  credible: boolean;
  r1: number | null;
  r2: number | null;
}

export const foldOfWindow = (window: SourceWindow): FoldKey | undefined =>
  window === 'fold-a' ? 'A' : window === 'fold-b' ? 'B' : undefined;

export const readArchive = async (window: SourceWindow): Promise<ArchiveRow[]> =>
  gunzipSync(await fs.readFile(source.archive(window)))
    .toString('utf8')
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as ArchiveRow);

export interface SourceProfile {
  symbol: string;
  status: string;
  uncertain: boolean;
  minTrades: number;
  evaluated: number;
  credibleVectors: number;
  representative: null | {
    credible: boolean;
    candidateId: string;
    grid: Record<string, number>;
    metrics: Record<string, unknown> & { net: number; score: number; trades: number; signature: string };
    neighbourhood: { draws: number; median: number; credibleShare: number; scores: number[] } | null;
    phenotypeFile: string | null;
    phenotypeSha256: string | null;
  };
  library: { role: string; file: string; sha256: string; candidateId: string }[];
  neighbourhoodChecked: {
    candidateId: string;
    grid: string;
    score: number;
    net: number;
    median: number;
    credibleShare: number;
  }[];
}

export const readProfile = (window: SourceWindow, symbol: string) =>
  readJson<SourceProfile>(path.join(source.standaloneRoot, window, `${symbol}.json`));

export const libraryGridsOf = async (profile: SourceProfile) =>
  Promise.all(
    profile.library.map(async (entry) => {
      const phenotype = await readJson<{ grid: Record<string, number>; role: string; candidateId: string }>(entry.file);

      return {
        role: entry.role,
        candidateId: entry.candidateId,
        key: gridKeyOf(phenotype.grid as never),
        file: entry.file
      };
    })
  );

// ----- field inventory (no outcome is aggregated) -----

export const archiveInventory = async () => {
  const windows: Record<string, unknown> = {};

  for (const window of ['fold-a', 'fold-b', 'final'] as const) {
    const stageA = await readSealed<
      Sealed & { files: Record<string, string>; archive: { file: string; sha256: string; rows: number } }
    >(source.stageA(window));
    const rows = await readArchive(window);
    const fields = new Set<string>();
    const perSymbol: Record<string, { sobol: number; local: number }> = {};

    for (const row of rows) {
      Object.keys(row).forEach((key) => fields.add(key));
      perSymbol[row.symbol] ??= { sobol: 0, local: 0 };
      perSymbol[row.symbol]![row.stage]++;
    }

    let filesVerified = 0;

    for (const [file, hash] of Object.entries(stageA.files)) {
      if ((await sha256File(file)) !== hash) {
        throw new Error(`${file}: does not hash to the sealed ${hash.slice(0, 12)}`);
      }

      filesVerified++;
    }

    const archiveHash = await sha256File(source.archive(window));

    if (archiveHash !== stageA.archive.sha256 || rows.length !== stageA.archive.rows) {
      throw new Error(`${window}: the archive does not match its sealed record`);
    }

    windows[window] = {
      stageA: {
        file: source.stageA(window),
        sha256: await sha256File(source.stageA(window)),
        bodyHash: stageA.bodyHash
      },
      archive: { file: source.archive(window), sha256: archiveHash, rows: rows.length },
      fields: [...fields].sort(),
      symbols: Object.keys(perSymbol).length,
      perSymbol,
      sealedFilesVerified: filesVerified,
      phenotypeFiles: Object.keys(stageA.files).filter((file) => file.includes('/phenotypes/')).length,
      profileFiles: Object.keys(stageA.files).filter((file) => !file.includes('/phenotypes/')).length
    };
  }

  return {
    schema: 'd1-wide-library-archive-inventory',
    createdAt: nowIso(),
    notStored: [
      'trade-level ledger (entries, exits, prices, reasons)',
      'interest and friction per row',
      'daily drawdown per row',
      'trade signature per row (only in profiles for the neighbourhood-checked vectors)',
      'worst trade per row',
      'neighbourhood draws of non-checked rows'
    ],
    windows
  };
};

// ----- reconstruction of one window's archive on its own training window -----

export const reconstructionFile = (window: SourceWindow) => resultFile('archive', window, 'RECONSTRUCTION.json');
export const archiveCandidatesFile = (window: SourceWindow) => resultFile('archive', window, 'candidates.jsonl.gz');

const cents = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value) ? null : Math.round(value * 100) / 100;

export const reconstruct = async (window: SourceWindow, options: { workers?: number } = {}) => {
  const guard = await requireCodeFrozen();
  const fold = foldOfWindow(window) ?? null;
  const target = reconstructionFile(window);

  if (await fs.pathExists(target)) {
    throw new Error(`${target} exists: the reconstruction of ${window} is written once`);
  }

  const startedAt = nowIso();
  const rows = await readArchive(window);
  // the source window's own training span (the calendar door, the audit hashes, the source's Stage A bars)
  const { loaded, door } = await sourceTrainingUniverse(window);

  const fast = await Fast.create(loaded, options.workers);
  const dates = loaded.universe.dates;

  log(
    `reconstruct ${window}: ${rows.length} archived rows, ${Object.keys(loaded.universe.instruments).length} symbols, through ${loaded.universe.end}, min trades ${fast.minTrades}`
  );

  const candidates: Candidate[] = [];
  const mismatches: { symbol: string; grid: string; field: string; archived: unknown; recomputed: unknown }[] = [];
  const chunk = 4096;

  for (let offset = 0; offset < rows.length; offset += chunk) {
    const part = rows.slice(offset, offset + chunk);
    const metrics = await fast.standalone(
      part.map((row) => ({ symbol: row.symbol, grid: gridOfKey(row.grid), origin: row.origin }))
    );

    part.forEach((row, index) => {
      const m = metrics[index]!;
      const recomputed = {
        trades: m.trades,
        net: cents(m.net),
        best: cents(m.bestTrade),
        dd: cents(m.minuteDrawdown),
        score: cents(m.score),
        credible: m.credible,
        r1: cents(m.meanNet),
        r2: cents(m.netPerDay)
      };

      for (const field of ['trades', 'net', 'best', 'dd', 'score', 'credible', 'r1', 'r2'] as const) {
        if (recomputed[field] !== row[field]) {
          mismatches.push({
            symbol: row.symbol,
            grid: row.grid,
            field,
            archived: row[field],
            recomputed: recomputed[field]
          });
        }
      }

      if (gridKeyOf(m.grid) !== row.grid) {
        mismatches.push({
          symbol: row.symbol,
          grid: row.grid,
          field: 'grid',
          archived: row.grid,
          recomputed: gridKeyOf(m.grid)
        });
      }

      candidates.push(
        candidateOf(m, { symbol: row.symbol, provenance: 'archive', stage: row.stage, origin: row.origin }, dates)
      );
    });

    log(
      `reconstruct ${window}: ${Math.min(offset + chunk, rows.length)}/${rows.length} (${mismatches.length} mismatches)`
    );
  }

  await fast.close();

  if (mismatches.length > 0) {
    await fs.outputJson(resultFile('archive', window, 'MISMATCHES.json'), mismatches.slice(0, 2000), { spaces: 1 });
    throw new Error(`${window}: ${mismatches.length} archived fields differ from the recomputation (fail closed)`);
  }

  const file = archiveCandidatesFile(window);

  await writeCandidates(file, candidates);

  return writeRecord(target, {
    stage: 'archive-reconstruction',
    window,
    fold,
    startedAt,
    finishedAt: nowIso(),
    guard,
    door,
    sourceStageABarsMatch: true,
    rows: rows.length,
    evaluations: fast.evaluations,
    minTrades: fast.minTrades,
    fieldsCompared: ['trades', 'net', 'best', 'dd', 'score', 'credible', 'r1', 'r2', 'grid'],
    mismatches: 0,
    credible: candidates.filter((c) => c.credible).length,
    candidates: { file, sha256: await sha256File(file), rows: candidates.length },
    costBps: study.costBps,
    cutoff: door.endDate
  });
};

export const readArchiveCandidates = async (window: SourceWindow) => {
  const record = await readStageRecord<Sealed & { candidates: { file: string; sha256: string; rows: number } }>(
    reconstructionFile(window)
  );

  if ((await sha256File(record.candidates.file)) !== record.candidates.sha256) {
    throw new Error(`${record.candidates.file}: does not hash to its sealed reconstruction record`);
  }

  return readCandidates(record.candidates.file);
};
