// gpu-jobs: the OWNERSHIP LOCK of a job directory (GPU Phase 6, research/gpu-phase6/). One process at a time may write a
// job's state. The lock is a kernel lock, not a marker file: an exclusive SQLite transaction (node:sqlite, the same
// engine the job archives use) held open on `<dir>/job.lock` for as long as the owner runs. SQLite takes it with a POSIX
// advisory lock (fcntl), so
//   - a second process is refused (SQLITE_BUSY) — after a short bounded wait, so that a status probe (which takes and
//     drops the lock at once) never makes a legitimate start fail;
//   - a second open in the SAME process is refused too (SQLite tracks its locks per connection inside a process);
//   - the kernel releases it when the owner exits in ANY way (normal exit, crash, SIGKILL, the unit killed): there is no
//     stale lock to detect, no PID to compare and no PID-reuse hazard. A dead owner's job is simply unlocked, and its
//     own checkpoint resumes it.
// The lock file holds no data (the transaction never writes); `owner.json` beside it describes the current owner for
// humans and status reports only — it is never trusted for exclusion. Local file systems only (fcntl locks over NFS
// are not relied on).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const LOCK_FILE = 'job.lock';

const held = new Map<string, OwnershipLock>(); // this process's locks, by directory (resolved)

export class LockBusy extends Error {
  constructor(
    readonly dir: string,
    readonly inThisProcess: boolean
  ) {
    super(
      inThisProcess
        ? `${dir} is already owned by this process (opened twice)`
        : `${dir} is owned by another live process (its lock is held)`
    );
  }
}

export class OwnershipLock {
  private db: DatabaseSync | null;

  private constructor(
    readonly dir: string,
    db: DatabaseSync
  ) {
    this.db = db;
  }

  // take the lock of `dir` (created if needed); throws LockBusy if another owner holds it after `waitMs`
  static acquire(dir: string, waitMs = 1500): OwnershipLock {
    const d = path.resolve(dir);

    if (held.has(d)) throw new LockBusy(d, true);
    fs.mkdirSync(d, { recursive: true });

    const db = new DatabaseSync(path.join(d, LOCK_FILE), { timeout: waitMs });

    try {
      db.exec('PRAGMA journal_mode=DELETE');
      db.exec('BEGIN EXCLUSIVE');
    } catch (e) {
      db.close();
      if (/locked|busy/i.test((e as Error).message)) throw new LockBusy(d, false);
      throw e;
    }

    const lock = new OwnershipLock(d, db);

    held.set(d, lock);
    return lock;
  }

  // is `dir` locked by a live owner right now? (never blocks a real acquirer: the probe holds it for microseconds)
  static probe(dir: string): 'free' | 'held-by-this-process' | 'held' {
    const d = path.resolve(dir);

    if (held.has(d)) return 'held-by-this-process';
    if (!fs.existsSync(path.join(d, LOCK_FILE))) return 'free';

    const db = new DatabaseSync(path.join(d, LOCK_FILE), { timeout: 0 });

    try {
      db.exec('BEGIN EXCLUSIVE');
      db.exec('ROLLBACK');
      return 'free';
    } catch (e) {
      if (/locked|busy/i.test((e as Error).message)) return 'held';
      throw e;
    } finally {
      db.close();
    }
  }

  static heldHere(dir: string) {
    return held.get(path.resolve(dir)) ?? null;
  }

  get holds() {
    return this.db !== null;
  }

  release() {
    if (!this.db) return;
    try {
      this.db.exec('ROLLBACK');
    } finally {
      this.db.close();
      this.db = null;
      held.delete(this.dir);
    }
  }
}
