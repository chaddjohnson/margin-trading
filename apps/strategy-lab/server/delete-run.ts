// Deleting ONE saved run (DELETE /api/runs/:id): its database rows and its artifact directory, consistently.
//
// What is deleted: the run row (results, metrics, request, provenance, bookmark, title), its symbols, the notes attached
// to THAT run, and its artifact directory `runs/R-xxxxxx` (events, metrics, trades, decision log, minute marks, logs…).
// What is kept: the variation (an immutable configuration that other runs may share; its notes and bookmark), the
// strategy, the experiment, phenotypes and their imports, optimisation history, Study 8 import sources under imports/,
// market data, every other run. A minimal tombstone (migration 0003) keeps the id from ever being reused.
//
// Consistency, in this order (all synchronous, one run at a time, per-run lock):
//   1. checks: the run exists; it is not queued or running; no optimisation trial references it; its artifact
//      directory is the canonical runs/R-xxxxxx (anything else is refused — no path outside it is ever removed);
//   2. the artifact directory is MOVED (one atomic rename on the same file system) to trash/R-xxxxxx.<stamp>;
//   3. ONE database transaction removes the rows (repo.deleteRunRecords);
//   4. if 3 fails, the directory is moved back and the failure reported — the run is intact; if moving back also
//      fails, the failure says where the directory is (startup recovery restores it, because the run row still exists);
//   5. after the commit, the trash directory is removed. If that fails, the run IS deleted (database and runs/), the
//      response says the files are still in the trash, and the next server start purges them (recoverRunDeletions).

import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';

import { runDirName } from './artifacts.ts';
import type { Config } from './config.ts';
import type { Repo, RunDeletionInfo } from './repo.ts';

export class DeleteRunError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
    options?: { cause?: unknown }
  ) {
    super(message, options);
  }
}

export interface DeleteRunResult {
  deleted: string;
  strategy: RunDeletionInfo['strategy'];
  symbols: string[];
  notesDeleted: number;
  bookmarkRemoved: boolean;
  variation: { id: string; otherRuns: number; kept: true };
  artifacts: { existed: boolean; purged: boolean; warning: string | null };
}

/** Test-only fault injection (never reachable from HTTP). */
export interface DeleteRunFaults {
  failMove?: boolean;
  failTransaction?: boolean;
  failRestore?: boolean;
  failPurge?: boolean;
  /** Called inside the transaction (e.g. to attempt a second, concurrent deletion of the same run). */
  during?: () => void;
}

const RUN_ID = /^R-\d{6,12}$/;
const inProgress = new Set<string>();

export const trashDirOf = (cfg: Config) => join(cfg.stateDir, 'trash');

export function deleteRun(cfg: Config, repo: Repo, publicId: string, faults: DeleteRunFaults = {}): DeleteRunResult {
  if (!RUN_ID.test(publicId)) throw new DeleteRunError(400, `"${publicId}" is not a run id`);
  if (inProgress.has(publicId)) throw new DeleteRunError(409, `${publicId} is already being deleted`);
  inProgress.add(publicId);
  try {
    const info = repo.runDeletionInfo(publicId);
    if (!info) {
      const gone = repo.runDeletion(publicId);
      throw new DeleteRunError(
        404,
        gone ? `${publicId} was already deleted (${gone.deletedAt})` : `no run ${publicId}`
      );
    }
    if (info.status === 'queued' || info.status === 'running')
      throw new DeleteRunError(
        409,
        `${publicId} is ${info.status}: cancel it and wait for it to stop before deleting it`
      );
    if (info.optimizationTrialRefs > 0)
      throw new DeleteRunError(
        409,
        `${publicId} is referenced by ${info.optimizationTrialRefs} imported optimisation trial(s); that history is kept, so the run cannot be deleted`
      );
    const canonical = runDirName(publicId);
    if (info.artifactDir !== null && info.artifactDir !== canonical)
      throw new DeleteRunError(
        409,
        `${publicId} records an unexpected artifact directory (${info.artifactDir}); refusing to delete files outside ${canonical}`
      );

    const dir = join(cfg.stateDir, canonical);
    const existed = existsSync(dir);
    const trash = join(trashDirOf(cfg), `${publicId}.${Date.now()}`);
    if (existed) {
      try {
        if (faults.failMove) throw new Error('injected: move failed');
        mkdirSync(trashDirOf(cfg), { recursive: true });
        renameSync(dir, trash);
      } catch (e) {
        throw new DeleteRunError(
          500,
          `${publicId} was NOT deleted: its artifact directory could not be moved aside (${(e as Error).message})`,
          [],
          { cause: e }
        );
      }
    }

    // Moves the files back after a failed transaction; returns the error if that fails too.
    const restore = (): Error | null => {
      try {
        if (faults.failRestore) throw new Error('injected: restore failed');
        renameSync(trash, dir);
        return null;
      } catch (r) {
        return r as Error;
      }
    };
    let counts: { notesDeleted: number };
    try {
      counts = repo.deleteRunRecords(
        info,
        { artifactDir: existed ? canonical : null, trashDir: existed ? relative(cfg.stateDir, trash) : null },
        () => {
          faults.during?.();
          if (faults.failTransaction) throw new Error('injected: transaction failed');
        }
      );
    } catch (e) {
      // The transaction rolled back: the run's rows are intact. Put its files back.
      const failed = existed ? restore() : null;
      if (failed)
        throw new DeleteRunError(
          500,
          `${publicId} was NOT deleted (database: ${(e as Error).message}), and its artifact directory could not be moved back (${failed.message}); it is at ${relative(cfg.stateDir, trash)} and is restored at the next server start`,
          [],
          { cause: e }
        );
      throw new DeleteRunError(500, `${publicId} was NOT deleted: ${(e as Error).message}; nothing was changed`, [], {
        cause: e
      });
    }

    let purged = !existed;
    let warning: string | null = null;
    if (existed)
      try {
        if (faults.failPurge) throw new Error('injected: purge failed');
        rmSync(trash, { recursive: true });
        repo.markRunArtifactsPurged(publicId);
        purged = true;
      } catch (e) {
        warning = `the run is deleted, but its files could not be removed from ${relative(cfg.stateDir, trash)} (${(e as Error).message}); the next server start removes them`;
      }

    return {
      deleted: publicId,
      strategy: info.strategy,
      symbols: info.symbols,
      notesDeleted: counts.notesDeleted,
      bookmarkRemoved: info.bookmarked,
      variation: { id: info.variation, otherRuns: info.variationOtherRuns, kept: true },
      artifacts: { existed, purged, warning }
    };
  } finally {
    inProgress.delete(publicId);
  }
}

/**
 * At server start: finishes interrupted deletions. A trash directory of a DELETED run (its purge failed) is removed; a
 * trash directory of a run that still EXISTS (a deletion failed and could not move its files back, or the process
 * stopped between the move and the commit) is moved back to runs/. Anything else in trash/ is left alone and reported.
 */
export function recoverRunDeletions(cfg: Config, repo: Repo, log: (line: string) => void = () => {}) {
  const report = { purged: [] as string[], restored: [] as string[], left: [] as string[] };
  for (const p of repo.pendingRunPurges()) {
    const path = join(cfg.stateDir, p.trashDir);
    try {
      if (existsSync(path)) rmSync(path, { recursive: true });
      repo.markRunArtifactsPurged(p.publicId);
      report.purged.push(p.publicId);
    } catch (e) {
      log(`run deletion: could not purge ${p.trashDir} (${(e as Error).message})`);
      report.left.push(p.trashDir);
    }
  }
  const trash = trashDirOf(cfg);
  if (existsSync(trash))
    for (const name of readdirSync(trash)) {
      const m = /^(R-\d{6,12})\.\d+$/.exec(name);
      const runId = m?.[1];
      const runDir = runId ? join(cfg.stateDir, runDirName(runId)) : '';
      if (runId && repo.runIdOf(runId) !== null && !existsSync(runDir)) {
        renameSync(join(trash, name), runDir);
        report.restored.push(runId);
        log(`run deletion: restored the artifact directory of ${runId} (its deletion had not completed)`);
      } else if (runId && repo.runIdOf(runId) === null && repo.runDeletion(runId)) {
        rmSync(join(trash, name), { recursive: true }); // files of a deleted run
        report.purged.push(runId);
      } else report.left.push(name);
    }
  if (report.purged.length) log(`run deletion: purged the files of ${report.purged.join(', ')}`);
  if (report.left.length) log(`run deletion: left in ${relative(cfg.stateDir, trash)}: ${report.left.join(', ')}`);
  return report;
}
