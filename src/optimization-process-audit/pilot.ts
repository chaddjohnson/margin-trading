// The runner pilot (PROTOCOL.md §10): TRAINING DOOR ONLY (D19, boundary 2018-12-31 inside the training window), so no
// next-period outcome is computed. A straight run; an abrupt self-SIGKILL after 10 fresh runs then a resume; a graceful
// stop (SIGTERM path) after 10 then a resume; duplicate keys in the input. All three must give identical results.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, codeDir, log, repoRoot } from './context.ts';
import { counter, recordExternal } from './compute.ts';
import { writePilot } from './records.ts';
import { type SliceItem, runSlices } from './runner.ts';
import { confOfEvidence, eligibleSet } from './subjects.ts';

const boundary = '2018-12-31';
const pilotFile = path.join(cacheRoot, 'pilot', 'PILOT.json');

const itemsOf = (): SliceItem[] => {
  const items: SliceItem[] = [];

  for (const s of ['3B', '4A'] as const)
    for (const e of eligibleSet(s, 'C19')) items.push({ key: `${s}|pilot|${e.id}`, conf: confOfEvidence(s, e), marks: items.length % 7 === 0 });

  return [...items, ...items.slice(0, 5)]; // duplicate keys
};

export const runPilotChild = async (job: string, mode: string) => {
  const cnt = counter(`pilot ${job} (${mode})`);

  try {
    await runSlices({
      job,
      door: 'D19',
      boundary,
      purpose: `pilot ${job} (training door only)`,
      items: itemsOf(),
      onFresh: () => cnt.fresh('pilot training-door slice run'),
      ...(mode === 'kill' ? { killAfter: 10 } : mode === 'stop' ? { stopAfter: 10 } : {})
    });
  } finally {
    cnt.done();
  }
};

const child = (job: string, mode: string) =>
  spawnSync(
    process.execPath,
    ['--expose-gc', '--experimental-transform-types', '--disable-warning=ExperimentalWarning', path.join(codeDir, 'main.ts'), 'stage3', 'pilot-child', job, mode],
    { cwd: repoRoot, encoding: 'utf8' }
  );

export const runPilot = async () => {
  for (const j of ['pilot-straight', 'pilot-kill', 'pilot-stop']) fs.rmSync(path.join(cacheRoot, 'jobs', j), { recursive: true, force: true });

  const out: Record<string, unknown> = {};
  const t0 = Date.now();
  const a = child('pilot-straight', 'straight');

  out.straight = { status: a.status, ms: Date.now() - t0 };

  const k1 = child('pilot-kill', 'kill');

  recordExternal('pilot pilot-kill (kill): self-SIGKILL after 10 fresh runs', 'pilot training-door slice run', 10);
  const k2 = child('pilot-kill', 'straight');

  out.kill = { first: { status: k1.status, signal: k1.signal }, resume: { status: k2.status } };

  const s1 = child('pilot-stop', 'stop');
  const s2 = child('pilot-stop', 'straight');

  out.stop = { first: { status: s1.status }, resume: { status: s2.status } };

  // compare the three archives' results (read through a zero-work run: every key archived)
  const read = async (job: string) => {
    const cnt = counter(`pilot read ${job}`);
    const r = await runSlices({ job, door: 'D19', boundary, purpose: `pilot read ${job}`, items: itemsOf(), onFresh: () => cnt.fresh('pilot (must be 0)') });

    cnt.done();
    return r;
  };
  const A = await read('pilot-straight');
  const B = await read('pilot-kill');
  const C = await read('pilot-stop');
  const same = (x: typeof A, y: typeof A) =>
    x.results.size === y.results.size && [...x.results].every(([k, v]) => JSON.stringify(v) === JSON.stringify(y.results.get(k)));

  out.compare = {
    keys: A.results.size,
    duplicatesRemoved: A.duplicatesRemoved,
    freshOnRead: [A.fresh, B.fresh, C.fresh],
    killResumeIdentical: same(A, B),
    stopResumeIdentical: same(A, C),
    killFirstExitedBySignal: k1.signal === 'SIGKILL',
    stopFirstExit75: s1.status === 75
  };
  out.ok =
    a.status === 0 && k2.status === 0 && s2.status === 0 && k1.signal === 'SIGKILL' && s1.status === 75 && same(A, B) && same(A, C) && A.fresh + B.fresh + C.fresh === 0;
  out.written = new Date().toISOString();
  writePilot(pilotFile, out);
  log(`pilot: ${JSON.stringify(out.compare)} → ${out.ok ? 'PASS' : 'FAIL'}`);
  if (!out.ok) throw new Error(`the runner pilot failed: ${JSON.stringify(out).slice(0, 2000)}`);
  return out;
};
