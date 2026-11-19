// A resumable evaluation job (PROTOCOL.md §13): tasks evaluated by child-process workers (worker.ts), each result
// appended to the job's archive as it arrives (.cache/<study>/jobs/<job>/results.jsonl, its first line the binding:
// study, job, door, code digest). A rerun with the same binding skips every archived task, so an interrupted job resumes
// mid-stage with identical outputs (the tasks are deterministic). Bounded in flight (workers × inflightPerWorker).
//
// Failure handling: a worker that dies, a task that throws, a memory-pressure reading above the declared threshold, or
// SIGTERM/SIGINT stops dispatching; in-flight results are awaited (a dead worker's tasks are dropped, never awaited),
// every worker is stopped and the job throws JobStop — the stage seals nothing and can be rerun to resume. There is no
// automatic restart. Every attempt is logged (attempts.jsonl: dispatched, persisted, reason) for the retry disclosure.
import { type ChildProcess, fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { STUDY, cacheRoot, codeDir, log, repoRoot, resources } from './context.ts';
import type { DoorKey } from './doors.ts';
import type { Output } from './evaluate.ts';
import type { Mode } from './lifecycle.ts';

export interface Task {
  id: string;
  door: DoorKey;
  quad: Quad;
  options: EvalOptions;
  mode: Mode;
  detail?: boolean;
  boundary?: string | null;
  noGuess?: boolean;
}

export interface Result {
  id: string;
  ms: number;
  out: Output;
}

export class JobStop extends Error {}

export const jobDir = (job: string) => path.join(cacheRoot, 'jobs', job);

const readArchive = (file: string, binding: Record<string, unknown>) => {
  const out = new Map<string, Result>();

  if (!fs.existsSync(file)) return out;

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const head = JSON.parse(lines[0]!) as Record<string, unknown>;

  if (JSON.stringify(head) !== JSON.stringify(binding))
    throw new Error(`${file}: archive binding ${JSON.stringify(head)} differs from ${JSON.stringify(binding)}`);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;

    let r: Result;

    try {
      r = JSON.parse(lines[i]!) as Result;
    } catch {
      if (i === lines.length - 1 || (i === lines.length - 2 && !lines.at(-1))) continue; // a torn last line
      throw new Error(`${file}: corrupt line ${i + 1}`);
    }
    out.set(r.id, r);
  }
  return out;
};

const cgroupMemory = () => {
  try {
    const cg = fs.readFileSync('/proc/self/cgroup', 'utf8').trim().split(':').at(-1)!;

    return Number(fs.readFileSync(`/sys/fs/cgroup${cg}/memory.current`, 'utf8'));
  } catch {
    return NaN;
  }
};

export const runJob = async (
  job: string,
  door: DoorKey,
  tasks: Task[],
  binding: { codeDigest: string },
  o: { workers?: number; purpose?: string; killWorkerAfter?: number } = {}
): Promise<Map<string, Result>> => {
  const dir = jobDir(job);
  const file = path.join(dir, 'results.jsonl');
  const bind = { study: STUDY, job, door, codeDigest: binding.codeDigest };

  fs.mkdirSync(dir, { recursive: true });

  const results = readArchive(file, bind);

  if (!fs.existsSync(file)) fs.writeFileSync(file, `${JSON.stringify(bind)}\n`);
  if (new Set(tasks.map((t) => t.id)).size !== tasks.length) throw new Error(`${job}: duplicate task ids`);

  const todo = tasks.filter((t) => !results.has(t.id));
  const attempt = {
    t: new Date().toISOString(),
    job,
    tasks: tasks.length,
    archived: results.size,
    dispatched: 0,
    persisted: 0,
    reason: 'complete'
  };

  log(`${job}: ${tasks.length} tasks, ${results.size} archived, ${todo.length} to evaluate on ${door}`);
  if (todo.length === 0) return results;

  const n = Math.max(1, Math.min(o.workers ?? resources.workers, Math.ceil(todo.length / 2)));
  const workers: { proc: ChildProcess; busy: Set<string>; ready: boolean; dead: boolean }[] = [];
  let next = 0;
  let stopReason: string | null = null;
  let fatal: Error | null = null;
  const fd = fs.openSync(file, 'a');
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((r) => (resolveDone = r));
  const inFlight = () => workers.reduce((a, w) => a + w.busy.size, 0);
  const finishIfIdle = () => {
    if (inFlight() === 0 && (stopReason || next >= todo.length)) resolveDone();
  };
  const stop = (reason: string) => {
    if (!stopReason) {
      stopReason = reason;
      log(`${job}: stopping (${reason}); ${inFlight()} in flight`);
    }
    finishIfIdle();
  };
  const dispatch = (w: (typeof workers)[number]) => {
    while (!stopReason && w.ready && !w.dead && w.busy.size < resources.inflightPerWorker && next < todo.length) {
      const t = todo[next++]!;

      w.busy.add(t.id);
      attempt.dispatched++;
      w.proc.send({ type: 'task', task: t });
    }
    finishIfIdle();
  };
  const onSignal = (sig: string) => () => stop(`signal ${sig}`);
  const sigterm = onSignal('SIGTERM');
  const sigint = onSignal('SIGINT');

  process.on('SIGTERM', sigterm);
  process.on('SIGINT', sigint);

  const pressure = setInterval(() => {
    const m = cgroupMemory();

    if (m > resources.pressureBytes) stop(`memory pressure ${(m / 2 ** 30).toFixed(1)} GiB`);
  }, 10_000);

  for (let i = 0; i < n; i++) {
    const proc = fork(path.join(codeDir, 'worker.ts'), [], {
      cwd: repoRoot,
      execArgv: [
        '--expose-gc',
        '--max-old-space-size=2048',
        '--experimental-transform-types',
        '--disable-warning=ExperimentalWarning'
      ],
      serialization: 'advanced'
    });
    const w = { proc, busy: new Set<string>(), ready: false, dead: false };

    workers.push(w);
    proc.on(
      'message',
      (m: { type: string; id?: string; ms?: number; out?: Output; message?: string; pid?: number }) => {
        if (m.type === 'ready') {
          w.ready = true;
          dispatch(w);
        } else if (m.type === 'result') {
          w.busy.delete(m.id!);
          fs.writeSync(fd, `${JSON.stringify({ id: m.id, ms: m.ms, out: m.out })}\n`);
          attempt.persisted++;
          results.set(m.id!, { id: m.id!, ms: m.ms!, out: m.out! });
          if (o.killWorkerAfter && attempt.persisted === o.killWorkerAfter) proc.kill('SIGKILL'); // the pilot's test
          dispatch(w);
        } else if (m.type === 'error' || m.type === 'fatal') {
          w.busy.delete(m.id ?? '');
          fatal ??= new Error(`${job}: ${m.type} ${m.id ?? ''}: ${m.message}`);
          stop('a task failed');
        }
      }
    );
    proc.on('exit', (code, signal) => {
      w.dead = true;
      if (w.busy.size > 0 || (!stopReason && next < todo.length)) {
        w.busy.clear(); // a dead worker's tasks are dropped, never awaited (the dead-worker hang fix)
        stop(`worker ${proc.pid} exited (${code ?? signal})`);
      }
      finishIfIdle();
    });
    proc.send({ type: 'init', door, purpose: o.purpose ?? job });
  }

  await done;
  clearInterval(pressure);
  process.off('SIGTERM', sigterm);
  process.off('SIGINT', sigint);
  for (const w of workers) if (!w.dead) w.proc.kill('SIGTERM');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  attempt.reason = stopReason ?? 'complete';
  fs.appendFileSync(
    path.join(dir, 'attempts.jsonl'),
    `${JSON.stringify({ ...attempt, ended: new Date().toISOString() })}\n`
  );

  if (fatal) throw fatal;
  if (stopReason)
    throw new JobStop(`${job}: ${stopReason} (${results.size}/${tasks.length} archived; rerun to resume)`);
  return results;
};

// The fresh evaluations a job's archive holds (each archived once) and the operational retries (dispatched in an
// interrupted attempt, never persisted, re-dispatched later).
export const jobCounts = (job: string) => {
  const f = path.join(jobDir(job), 'attempts.jsonl');

  if (!fs.existsSync(f)) return { attempts: 0, dispatched: 0, persisted: 0, retries: 0 };

  const a = fs
    .readFileSync(f, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { dispatched: number; persisted: number });
  const dispatched = a.reduce((x, y) => x + y.dispatched, 0);
  const persisted = a.reduce((x, y) => x + y.persisted, 0);

  return { attempts: a.length, dispatched, persisted, retries: dispatched - persisted };
};
