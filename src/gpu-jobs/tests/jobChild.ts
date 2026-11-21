// gpu-jobs tests: a child process that opens a job (or an EvalLab without a job) and holds it — the other process of
// the cross-process ownership tests (jobs.test.ts). Prints one JSON line: {"ok":true,...} once it holds the job, or
// {"ok":false,"code":...} if the open was refused; then holds until stdin closes or `holdMs` elapses.
//   node --no-maglev --experimental-transform-types jobChild.ts <job|lab> <study> <job> <cacheRoot> <resultsRoot> <holdMs> [resume]
import { EvalLab } from '../../gpu-backend/lab.ts';
import { JobError, openJob } from '../jobs.ts';

const [mode, study, job, cacheRoot, resultsRoot, holdMs, resume] = process.argv.slice(2) as string[];
let release = () => {};

try {
  if (mode === 'job') {
    const j = openJob({
      study: study!,
      job: job!,
      identity: { test: 'jobChild', door: 'none' },
      purpose: 'parity-test',
      resume: resume === 'resume',
      cacheRoot,
      resultsRoot,
      lockWaitMs: 200
    });

    j.event('child-holding');
    release = () => j.release('child done');
    console.log(JSON.stringify({ ok: true, pid: process.pid, resumed: j.resumed, instance: j.instance }));
  } else {
    const pool = { start: async () => {}, run: async () => {}, requestStop: () => {}, stopping: null, close: async () => {} };
    const lab = new EvalLab({
      study: study!,
      job: job!,
      door: 'none',
      doorPin: 'none',
      purpose: 'parity-test',
      pool,
      backend: 'test',
      codeDigest: 'test',
      cacheRoot: cacheRoot!
    });

    release = () => void lab.close('child done');
    console.log(JSON.stringify({ ok: true, pid: process.pid }));
  }
} catch (e) {
  console.log(JSON.stringify({ ok: false, code: e instanceof JobError ? e.code : 'ERROR', message: (e as Error).message }));
  process.exit(0);
}

const timer = setTimeout(() => {
  release();
  process.exit(0);
}, Number(holdMs));

process.stdin.on('end', () => {
  clearTimeout(timer);
  release();
  process.exit(0);
});
process.stdin.resume();
