// gpu-jobs: the job namespace command (GPU Phase 6; docs/gpu/README.md §4c). Read-only except `remove-cache`.
//   node --no-maglev --experimental-transform-types src/gpu-jobs/cli.ts list   --study research/<study>
//   node --no-maglev --experimental-transform-types src/gpu-jobs/cli.ts status --study research/<study> --job <job>
//   node --no-maglev --experimental-transform-types src/gpu-jobs/cli.ts remove-cache --study research/<study> --job <job> --yes
// States: active (a live process owns it), interrupted (resumable: rerun its command with --resume), complete, foreign
// (state without a job identity — never adopted), absent. `remove-cache` deletes ONLY the job's git-ignored state
// directory (archive, checkpoint, its own dataset cache, lock) of a job that is not active; its records under
// results/jobs/<job>/ are research records and are never deleted by a tool. Without its archive a job can no longer be
// resumed: it can only be rerun (deterministically) under a new name. Overrides: --cache-root, --results-root (as the
// job was opened), GPU_JOBS_CACHE_ROOT.
import fs from 'node:fs';
import { JobError, jobLayout, jobStatus, listJobs } from './jobs.ts';
import { OwnershipLock } from './lock.ts';

const [cmd, ...args] = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const study = opt('study') ?? '';
const roots = { cacheRoot: opt('cache-root'), resultsRoot: opt('results-root') };

try {
  if (cmd === 'list') {
    for (const s of listJobs({ study, ...roots }))
      console.log(
        `${s.state.padEnd(11)} ${s.id}${s.owner ? `  pid ${s.owner.pid} since ${s.owner.since}` : ''}${s.lastEvent ? `  last: ${s.lastEvent.event} ${s.lastEvent.t}` : ''}`
      );
  } else if (cmd === 'status') {
    console.log(JSON.stringify(jobStatus({ study, job: opt('job') ?? '', ...roots }), null, 1));
  } else if (cmd === 'remove-cache') {
    const job = opt('job') ?? '';
    const L = jobLayout({ study, job, ...roots });
    const s = jobStatus({ study, job, ...roots });

    if (s.state === 'active')
      throw new JobError('JOB_ACTIVE', `${s.id} is running (pid ${s.owner?.pid}): stop it first`);
    if (!fs.existsSync(L.cache)) {
      console.log(`${s.id}: no state directory`);
    } else if (!args.includes('--yes')) {
      console.log(`would remove ${L.cache} (${s.state}); its records ${L.results} stay. Repeat with --yes.`);
    } else {
      // hold the job's lock while deleting, so that no process can start the job meanwhile
      const lock = OwnershipLock.acquire(L.cache, 0);

      try {
        for (const f of fs.readdirSync(L.cache))
          if (f !== 'job.lock') fs.rmSync(`${L.cache}/${f}`, { recursive: true, force: true });
      } finally {
        lock.release(); // the empty lock file stays (a process waiting on it must not be left holding a deleted file)
      }
      if (fs.existsSync(L.events))
        fs.appendFileSync(
          L.events,
          `${JSON.stringify({ t: new Date().toISOString(), event: 'cache-removed', by: 'src/gpu-jobs/cli.ts', pid: process.pid })}\n`
        );
      console.log(`removed ${L.cache}`);
    }
  } else {
    console.error('usage: cli.ts list|status|remove-cache --study research/<study> [--job <job>] [--yes]');
    process.exit(2);
  }
} catch (e) {
  console.error(`❌ ${(e as Error).message}`);
  process.exit(e instanceof JobError ? 3 : 1);
}
