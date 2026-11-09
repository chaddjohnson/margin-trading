// Engineering pilots (PROTOCOL.md §13, before the freeze): the job machinery on a small, fixed task set (the first 24
// confirmation draws of A and GP85 under L1 and L2 on D24), interrupted gracefully (SIGTERM), by a killed worker or by
// a killed unit, then resumed; the resumed archive must equal an uninterrupted one. Only equality, counts, timing and
// memory are printed — never a net, a drawdown or any other performance figure (the rules are not tuned from profits).
import fs from 'node:fs';
import path from 'node:path';
import { log } from './context.ts';
import { coreDraws } from './instruments.ts';
import { type Task, JobStop, jobDir, runJob } from './jobs.ts';
import { codeDigest } from './stages.ts';
import { loadSubjects } from './subjects.ts';

export const pilotTasks = (): Task[] => {
  const subjects = loadSubjects();
  const out: Task[] = [];

  for (const k of ['A', 'GP85']) {
    const s = subjects.find((x) => x.key === k)!;

    for (const d of coreDraws(s, 'confirm').slice(0, 24))
      for (const mode of ['L1', 'L2'] as const)
        out.push({ id: `pilot|${k}|${d.id}|${mode}`, door: 'D24', quad: d.quad, options: s.options, mode });
  }
  return out;
};

export const pilot = async (name: string, o: { sigtermAfter?: number; killWorkerAfter?: number }) => {
  const job = `pilot-${name}`;
  const file = path.join(jobDir(job), 'results.jsonl');
  const tasks = pilotTasks();
  const t0 = Date.now();
  let timer: NodeJS.Timeout | null = null;

  if (o.sigtermAfter) {
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length - 1 : 0;

    timer = setInterval(() => {
      const n = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length - 1 : 0;

      if (n - before >= o.sigtermAfter!) {
        clearInterval(timer!);
        process.kill(process.pid, 'SIGTERM');
      }
    }, 200);
  }

  try {
    const r = await runJob(
      job,
      'D24',
      tasks,
      { codeDigest: codeDigest() },
      { killWorkerAfter: o.killWorkerAfter, purpose: `engineering pilot ${job}` }
    );
    const ms = [...r.values()].map((x) => x.ms);
    const rounds = [...r.values()].map((x) => x.out.summary.rounds);

    log(
      `${job}: complete, ${r.size} results in ${((Date.now() - t0) / 1000).toFixed(1)} s; per task ${Math.round(ms.reduce((a, b) => a + b, 0) / ms.length)} ms mean; consistency rounds max ${Math.max(...rounds)}`
    );
  } catch (e) {
    if (e instanceof JobStop) {
      log(`${job}: ${e.message}`);
      process.exitCode = 3;
    } else throw e;
  } finally {
    if (timer) clearInterval(timer);
  }
};

export const compare = (a: string, b: string) => {
  const read = (job: string) =>
    new Map(
      fs
        .readFileSync(path.join(jobDir(`pilot-${job}`), 'results.jsonl'), 'utf8')
        .split('\n')
        .slice(1)
        .filter(Boolean)
        .map((l) => {
          const x = JSON.parse(l) as { id: string; out: unknown };

          return [x.id, JSON.stringify(x.out)];
        })
    );
  const x = read(a);
  const y = read(b);
  const diff = [...x.keys()].filter((k) => x.get(k) !== y.get(k));

  return { a: x.size, b: y.size, identical: x.size === y.size && diff.length === 0, differing: diff.length };
};
