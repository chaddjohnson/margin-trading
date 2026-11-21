// gpu-phase6 (PROTOCOL.md §6 gate E2): the ISOLATION AUDIT of the job campaign (research/gpu-phase6/chains/campaign.sh),
// read-only. For every campaign job: its identity (kind, study, name, the definition's sha256 recomputed), completion,
// state (complete, lock free), disjoint directories, its events (only its own instances; the killed job's instance never
// released, then a resume), its receipt ledger (device, nonces unique across ALL jobs: no job wrote another's ledger),
// its dataset cache (its own file by default — distinct files, identical bytes; one shared file for the two jobs that
// declared the shared cache, no temporary left), the refused attempts (JOB_ACTIVE / JOB_EXISTS, exit 3, the attempted
// job's identity unchanged), the comparisons (every one identical), the engine runtime of every job, the process audit
// (every sampled Node process of the campaign's units ran with --no-maglev, including the CPU arm's forked workers) and
// that the campaign wrote nothing tracked outside research/gpu-phase6/.
//   node --no-maglev --experimental-transform-types tools/gpu-phase6/campaign-verify.ts --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { canonical, jobLayout, jobStatus } from '../../src/gpu-jobs/jobs.ts';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase6/context.ts';

const out = process.argv[process.argv.indexOf('--out') + 1]!;
const study = 'research/gpu-phase6';
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
const lines = (f: string) =>
  fs.existsSync(f)
    ? fs
        .readFileSync(f, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as Record<string, unknown>)
    : [];
const checks: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: unknown) => {
  checks.push({ name, pass, detail: typeof detail === 'string' ? detail : JSON.stringify(detail) });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};

const jobs = {
  'c1-ref-mini': { gpu: true, shared: false, events: ['open', 'complete', 'release'] },
  'c2-mini-cpu': { gpu: false, shared: false, events: ['open', 'complete', 'release'] },
  'c3-a3': { gpu: true, shared: false, events: ['open', 'complete', 'release'] },
  'c4-a3': { gpu: true, shared: false, events: ['open', 'barrier', 'complete', 'release'] },
  'c4-a2': { gpu: true, shared: false, events: ['open', 'barrier', 'complete', 'release'] },
  'c4-mini-kill': { gpu: true, shared: false, events: ['open', 'resume', 'complete', 'release'] },
  'c4-mini-stop': { gpu: true, shared: false, events: ['open', 'release', 'resume', 'complete', 'release'] },
  'c4-shared-a': { gpu: true, shared: true, events: ['open', 'barrier', 'complete', 'release'] },
  'c4-shared-b': { gpu: true, shared: true, events: ['open', 'barrier', 'complete', 'release'] },
  // amendment A2: the bounded re-run of the process audit (GPU and CPU arm at the same time)
  'a2-audit-mini-gpu': { gpu: true, shared: false, events: ['open', 'complete', 'release'] },
  'a2-audit-mini-cpu': { gpu: false, shared: false, events: ['open', 'complete', 'release'] }
} as const;
type Name = keyof typeof jobs;
const names = Object.keys(jobs) as Name[];
const L = Object.fromEntries(names.map((j) => [j, jobLayout({ study, job: j })])) as Record<Name, ReturnType<typeof jobLayout>>;
const nonces = new Map<string, string>();
const datasetFiles: Record<string, { file: string; ino: number; sha256: string }> = {};
const shared = path.join(repoRoot, 'research/gpu-phase6/cache/shared-datasets');

for (const j of names) {
  const spec = jobs[j];
  const l = L[j];
  const id = read<{ kind: string; study: string; job: string; definition: unknown; definitionSha256: string; datasetCache: { mode: string; dir?: string } }>(l.identity);
  const st = jobStatus({ study, job: j });
  const ev = lines(l.events);
  const instances = [...new Set(ev.map((e) => e.instance as string))];
  const profile = read<{ runtime: { maglev: string; execArgv: string[] }; jobIdentity: { instance: string; id: string } }>(path.join(l.results, 'profile.json'));
  const result = read<{ server: { datasetSha256: string; uuid: string } | null }>(path.join(l.results, 'result.json'));

  check(`${j}: identity (study, name, definition sha256 recomputed)`, id.kind === 'gpu-jobs job identity' && id.study === study && id.job === j && createHash('sha256').update(canonical(id.definition)).digest('hex') === id.definitionSha256, { definitionSha256: id.definitionSha256 });
  check(`${j}: complete, lock free`, st.state === 'complete' && st.lock === 'free', { state: st.state, lock: st.lock });
  check(`${j}: event sequence`, JSON.stringify(ev.map((e) => e.event)) === JSON.stringify(spec.events), ev.map((e) => e.event));
  check(`${j}: events only of its own instances (${instances.length})`, instances.length === spec.events.filter((e) => e === 'open' || e === 'resume').length && instances.includes(profile.jobIdentity.instance) && profile.jobIdentity.id === `${study}/${j}`, instances);
  if (j === 'c4-mini-kill')
    check(`${j}: the SIGKILLed instance never released; the resume did`, ev.filter((e) => e.instance === instances[0] && e.event === 'release').length === 0 && ev.filter((e) => e.instance === instances[1] && e.event === 'release').length === 1, ev.map((e) => [e.event, e.instance]));
  check(`${j}: engine runtime without Maglev`, profile.runtime.maglev === 'disabled' && profile.runtime.execArgv.filter((a) => a === '--no-maglev').length === 1, profile.runtime.execArgv);
  check(`${j}: dataset cache as declared`, spec.shared ? id.datasetCache.mode === 'shared' && path.resolve(id.datasetCache.dir!) === shared : id.datasetCache.mode === 'job', id.datasetCache);
  // the job's files lie in its own two directories
  for (const other of names)
    if (other !== j)
      check(`${j} / ${other}: disjoint directories`, ![L[other].cache, L[other].results].some((d) => d.startsWith(`${l.cache}/`) || d === l.cache || d.startsWith(`${l.results}/`) || d === l.results), [l.cache, l.results]);
  if (spec.gpu) {
    const r = lines(l.receipts).filter((x) => 'nonce' in x);

    check(`${j}: receipts ledger (${r.length} batches, one device, CPU-scored 0)`, r.length > 0 && r.every((x) => x.uuid === result.server!.uuid && x.cpuScored === 0), r.length);
    for (const x of r) {
      const prev = nonces.get(x.nonce as string);

      if (prev) check(`nonce ${x.nonce} in two ledgers`, false, [prev, j]);
      nonces.set(x.nonce as string, j);
    }
    const f = spec.shared ? path.join(shared, 'D19.gb2ds') : path.join(l.dataset, 'D19.gb2ds');

    datasetFiles[j] = { file: path.relative(repoRoot, f), ino: fs.statSync(f).ino, sha256: sha(f) };
    check(`${j}: the server loaded the dataset of its cache`, datasetFiles[j]!.sha256 === result.server!.datasetSha256, datasetFiles[j]);
    if (spec.shared) check(`${j}: no own dataset file beside the shared one`, !fs.existsSync(path.join(l.dataset, 'D19.gb2ds')), l.dataset);
  }
}
check('receipt nonces unique across every job (no job wrote another job\'s ledger)', checks.every((c) => !c.name.startsWith('nonce ')), nonces.size);
{
  const own = Object.entries(datasetFiles).filter(([j]) => !jobs[j as Name].shared);
  const sh = Object.entries(datasetFiles).filter(([j]) => jobs[j as Name].shared);

  check('own dataset caches: one distinct file per job, identical bytes (the same door)', new Set(own.map(([, d]) => d.ino)).size === own.length && new Set(own.map(([, d]) => d.sha256)).size === 1, own);
  check('the declared shared cache: one file for both jobs, the same bytes as the own caches', new Set(sh.map(([, d]) => d.ino)).size === 1 && sh[0]![1].sha256 === own[0]![1].sha256, sh);
  check('the shared cache holds exactly one dataset and its sidecar, no temporary file', JSON.stringify(fs.readdirSync(shared).sort()) === JSON.stringify(['D19.gb2ds', 'D19.gb2ds.json']), fs.readdirSync(shared));
}
// the refused attempts
for (const [name, code, job] of [
  ['reuse-new', 'JOB_ACTIVE', 'c4-a3'],
  ['reuse-resume', 'JOB_ACTIVE', 'c4-a3'],
  ['reuse-other-definition', 'JOB_ACTIVE', 'c4-a2'],
  ['killed-reopened-as-new', 'JOB_EXISTS', 'c4-mini-kill']
] as const) {
  const t = fs.readFileSync(path.join(resultsDir, 'campaign', `attempt-${name}.txt`), 'utf8');

  check(`attempt ${name}: refused ${code} (exit 3) before any evaluation; ${job}'s identity untouched`, t.includes(`JOB-REFUSED ${code}`) && /exit 3\s*$/.test(t) && !/GPU evaluations/.test(t) && read<{ createdBy: { instance: string } }>(L[job].identity).createdBy.instance === lines(L[job].events)[0]!.instance, t.split('\n')[0]);
}
{
  const s = read<{ state: string; lock: string }>(path.join(resultsDir, 'campaign', 'status-after-kill.json'));

  check('the SIGKILLed job: interrupted, its lock released by the kernel', s.state === 'interrupted' && s.lock === 'free', s);
}
// the comparisons
{
  const dir = path.join(resultsDir, 'compare');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const bad = files.filter((f) => read<{ identical: boolean }>(path.join(dir, f)).identical !== true);

  check(`every comparison identical (${files.length}: sealed A3 ×2, sealed A2, concurrent = isolated, CPU = GPU, killed+resumed, stopped+resumed, shared ×2 = reference; A2's re-run GPU and CPU = reference)`, files.length === 11 && bad.length === 0, bad);
}
// the process audit — from amendment A2's re-run (the campaign's own sample file is empty: its sampler read the system
// unit column instead of the user unit; AMENDMENTS.md A2)
{
  const original = path.join(resultsDir, 'runtime', 'process-samples.txt');

  check('the campaign sampler\'s file is the empty one of amendment A2 (kept as it is)', fs.existsSync(original) && fs.readFileSync(original, 'utf8') === '', fs.existsSync(original) ? fs.statSync(original).size : 'missing');
  const f = path.join(resultsDir, 'runtime', 'process-samples-a2.txt');
  const rows = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean) : [];
  const procs = new Map<string, { unit: string; args: string; ppid: string }>();

  for (const r of rows) {
    const [, pid, ppid, unit, ...rest] = r.split(/\s+/);

    procs.set(pid!, { unit: unit!, args: rest.join(' '), ppid: ppid! });
  }
  const without = [...procs.entries()].filter(([, p]) => !/ --no-maglev /.test(` ${p.args} `));
  const cpuWorkers = [...procs.values()].filter((p) => p.unit.startsWith('gpup6-a2-cpu') && p.args.includes('cpuEvalWorker.ts'));
  const units = new Set([...procs.values()].map((p) => p.unit));

  check(`process audit: every Node process of the campaign units ran with --no-maglev (${procs.size} processes, ${units.size} units, ${cpuWorkers.length} forked CPU workers)`, procs.size >= 14 && without.length === 0 && cpuWorkers.length >= 12 && [...units].some((u) => u.startsWith('gpup6-a2-gpu')), { without: without.slice(0, 5), units: [...units] });
}
// nothing tracked outside this study changed
{
  const s = spawnSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
  const outside = s.filter((l) => !l.slice(3).startsWith('research/gpu-phase6/'));

  check('the campaign wrote nothing tracked or untracked outside research/gpu-phase6/', outside.length === 0, outside.slice(0, 10));
}

const pass = checks.every((c) => c.pass);

writeJson(out, { kind: 'gpu-phase6 job campaign isolation audit', t: new Date().toISOString(), jobs: names, checks: checks.length, passed: checks.filter((c) => c.pass).length, pass, results: checks });
console.log(`${checks.filter((c) => c.pass).length}/${checks.length} isolation checks pass`);
process.exitCode = pass ? 0 : 2;
