// gpu-jobs: the job isolation module's tests (GPU Phase 6, research/gpu-phase6/) — runnable without a GPU, in temporary
// directories (never a study's): directories and identities, allocation, every refusal (active, existing, identity
// conflict, not found, foreign state, not owner), resume of a job's own checkpoint, ownership across processes (a
// holder, a SIGKILLed holder, a creation race of six processes, two jobs at once), the EvalLab's claim on its directory,
// a declared shared dataset cache, the official gate's job check (before any server starts) and the status command.
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import { after, test } from 'node:test';
import { EvalLab } from '../../gpu-backend/lab.ts';
import { JobError, allocateJobName, jobLayout, jobStatus, labOptionsOf, listJobs, openJob, poolFilesOf } from '../jobs.ts';
import { OwnershipLock } from '../lock.ts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-jobs-test-'));
const study = 'research/zz-jobs-test';
let n = 0;
const roots = () => {
  const d = path.join(root, `r${n++}`);

  return { cacheRoot: path.join(d, 'cache'), resultsRoot: path.join(d, 'results') };
};
const def = { family: 'mini', door: 'D19', budget: 'mini-v1', backend: 'gpu' };
const code = (f: () => unknown) => {
  try {
    f();
    return 'ok';
  } catch (e) {
    return e instanceof JobError ? e.code : `other: ${(e as Error).message}`;
  }
};
const children: ChildProcess[] = [];
const child = (args: string[]) => {
  const c = spawn(
    process.execPath,
    [
      '--no-maglev',
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join(import.meta.dirname, 'jobChild.ts'),
      ...args
    ],
    { stdio: ['pipe', 'pipe', 'inherit'] }
  );

  children.push(c);
  return {
    c,
    first: new Promise<Record<string, unknown>>((resolve) => {
      let s = '';

      c.stdout!.on('data', (d) => {
        s += String(d);
        if (s.includes('\n')) resolve(JSON.parse(s.split('\n')[0]!));
      });
    }),
    exited: new Promise<number | null>((resolve) => c.on('exit', (x) => resolve(x)))
  };
};
const pool = { start: async () => {}, run: async () => {}, requestStop: () => {}, stopping: null, close: async () => {} };
const lab = (o: { cacheRoot: string; job: string; owner?: ReturnType<typeof openJob>; study?: string }) =>
  new EvalLab({
    study: o.study ?? study,
    job: o.job,
    door: 'none',
    doorPin: 'none',
    purpose: 'parity-test',
    pool,
    backend: 'test',
    codeDigest: 'test',
    cacheRoot: o.cacheRoot,
    ...(o.owner ? { owner: o.owner } : {})
  });

after(() => {
  for (const c of children) if (c.exitCode === null) c.kill('SIGKILL');
  fs.rmSync(root, { recursive: true, force: true });
});

test('a new job: its own records, state and dataset directories, identity written once; names validated', () => {
  const r = roots();
  const j = openJob({ study, job: 'a3-C19-broad1', identity: def, purpose: 'parity-test', ...r });

  assert.equal(j.id, `${study}/a3-C19-broad1`);
  assert.equal(j.resumed, false);
  assert.equal(j.dirs.cache, path.join(r.cacheRoot, 'jobs', 'a3-C19-broad1'));
  assert.equal(j.dirs.results, path.join(r.resultsRoot, 'jobs', 'a3-C19-broad1'));
  assert.equal(j.dirs.dataset, path.join(j.dirs.cache, 'dataset'));
  assert.equal(j.labCacheRoot, r.cacheRoot);
  assert.ok(fs.statSync(j.dirs.dataset).isDirectory());
  const id = JSON.parse(fs.readFileSync(j.files.identity, 'utf8'));

  assert.equal(id.definitionSha256.length, 64);
  assert.deepEqual(id.definition, def);
  assert.deepEqual(id.datasetCache, { mode: 'job' });
  assert.deepEqual(labOptionsOf(j), { study, job: j.name, owner: j, cacheRoot: r.cacheRoot });
  assert.deepEqual(poolFilesOf(j), { ledgerFile: j.files.receipts, telemetryFile: j.files.telemetry });
  j.release('test');
  for (const bad of ['', '../x', 'a/b', '.hidden', 'x'.repeat(97), 'a b'])
    assert.equal(code(() => jobLayout({ study, job: bad, ...r })), 'JOB_INVALID', bad);
  assert.equal(code(() => jobLayout({ study: 'elsewhere/x', job: 'a', ...r })), 'JOB_INVALID');
  assert.equal(code(() => openJob({ study, identity: def, purpose: 'x', resume: true, ...r })), 'JOB_INVALID');
});

test('allocation: a job without a name gets a fresh unique one', () => {
  const r = roots();
  const names = new Set(Array.from({ length: 50 }, () => allocateJobName('mini')));

  assert.equal(names.size, 50);
  for (const x of names) assert.match(x, /^mini-\d{8}T\d{6}Z-[0-9a-f]{6}$/);
  const a = openJob({ study, label: 'mini', identity: def, purpose: 'parity-test', ...r });
  const b = openJob({ study, label: 'mini', identity: def, purpose: 'parity-test', ...r });

  assert.notEqual(a.name, b.name);
  assert.equal(a.allocated, true);
  a.release();
  b.release();
});

test('refusals: active, existing, identity conflict, not found, foreign state; resume reads its own job', () => {
  const r = roots();
  const j = openJob({ study, job: 'j1', identity: def, purpose: 'parity-test', ...r });

  // the same job again while it is held (this process): refused
  assert.equal(code(() => openJob({ study, job: 'j1', identity: def, purpose: 'parity-test', resume: true, ...r })), 'JOB_ACTIVE');
  j.event('progress', { fresh: 10 });
  j.release('stopped');
  assert.equal(j.holds(), false);
  // an existing job is never reused without resume
  assert.equal(code(() => openJob({ study, job: 'j1', identity: def, purpose: 'parity-test', ...r })), 'JOB_EXISTS');
  // a resume with another definition is another job
  assert.equal(
    code(() => openJob({ study, job: 'j1', identity: { ...def, budget: 'other' }, purpose: 'parity-test', resume: true, ...r })),
    'JOB_IDENTITY_CONFLICT'
  );
  // key order is not identity
  const k = openJob({
    study,
    job: 'j1',
    identity: { backend: 'gpu', budget: 'mini-v1', door: 'D19', family: 'mini' },
    purpose: 'parity-test',
    resume: true,
    ...r
  });

  assert.equal(k.resumed, true);
  k.complete({ rows: 1 });
  k.release('complete');
  const events = fs.readFileSync(k.files.events, 'utf8').trim().split('\n').map((l) => JSON.parse(l).event);

  assert.deepEqual(events, ['open', 'progress', 'release', 'resume', 'complete', 'release']);
  assert.equal(jobStatus({ study, job: 'j1', ...r }).state, 'complete');
  assert.equal(code(() => openJob({ study, job: 'nope', identity: def, purpose: 'x', resume: true, ...r })), 'JOB_NOT_FOUND');
  // a directory with an archive but no identity (an unmanaged run): never adopted
  const L = jobLayout({ study, job: 'orphan', ...r });

  fs.mkdirSync(L.cache, { recursive: true });
  fs.writeFileSync(path.join(L.cache, 'archive.sqlite'), 'x');
  assert.equal(code(() => openJob({ study, job: 'orphan', identity: def, purpose: 'x', ...r })), 'JOB_FOREIGN_STATE');
  assert.equal(jobStatus({ study, job: 'orphan', ...r }).state, 'foreign');
  assert.equal(fs.readFileSync(path.join(L.cache, 'archive.sqlite'), 'utf8'), 'x', 'nothing overwritten');
  // a refused resume of an absent job leaves at most its empty lock: status absent, the name usable
  assert.equal(jobStatus({ study, job: 'nope', ...r }).state, 'absent');
  openJob({ study, job: 'nope', identity: def, purpose: 'x', ...r }).release();
});

test('a declared shared dataset cache: recorded in the identity, the same on resume', () => {
  const r = roots();
  const shared = path.join(root, 'shared-datasets');
  const j = openJob({ study, job: 's1', identity: def, purpose: 'x', datasetCache: { shared }, ...r });

  assert.equal(j.datasetShared, true);
  assert.equal(j.dirs.dataset, shared);
  j.release();
  assert.equal(code(() => openJob({ study, job: 's1', identity: def, purpose: 'x', resume: true, ...r })), 'JOB_IDENTITY_CONFLICT');
  assert.equal(
    code(() => openJob({ study, job: 's1', identity: def, purpose: 'x', resume: true, datasetCache: { shared: `${shared}2` }, ...r })),
    'JOB_IDENTITY_CONFLICT'
  );
  openJob({ study, job: 's1', identity: def, purpose: 'x', resume: true, datasetCache: { shared }, ...r }).release();
  assert.equal(code(() => openJob({ study, job: 's2', identity: def, purpose: 'x', datasetCache: { shared: 'rel' }, ...r })), 'JOB_INVALID');
});

test('across processes: a live owner refuses another; a SIGKILLed owner frees the job, which resumes', async () => {
  const r = roots();
  const h = child(['job', study, 'x1', r.cacheRoot, r.resultsRoot, '60000']);
  const got = await h.first;

  assert.equal(got.ok, true);
  assert.equal(code(() => openJob({ study, job: 'x1', identity: { test: 'jobChild', door: 'none' }, purpose: 'x', resume: true, lockWaitMs: 100, ...r })), 'JOB_ACTIVE');
  const s = jobStatus({ study, job: 'x1', ...r });

  assert.equal(s.state, 'active');
  assert.equal(s.owner?.pid, got.pid);
  h.c.kill('SIGKILL');
  await h.exited;
  assert.equal(jobStatus({ study, job: 'x1', ...r }).state, 'interrupted');
  const j = openJob({ study, job: 'x1', identity: { test: 'jobChild', door: 'none' }, purpose: 'x', resume: true, ...r });

  assert.equal(j.resumed, true);
  j.release();
});

test('across processes: six processes creating one new job at once — exactly one owns it', async () => {
  const r = roots();
  const hs = Array.from({ length: 6 }, () => child(['job', study, 'race', r.cacheRoot, r.resultsRoot, '3000']));
  const firsts = await Promise.all(hs.map((h) => h.first));

  assert.equal(firsts.filter((x) => x.ok).length, 1, JSON.stringify(firsts));
  for (const x of firsts.filter((y) => !y.ok)) assert.match(String(x.code), /JOB_ACTIVE|JOB_EXISTS/);
  await Promise.all(hs.map((h) => h.exited));
  const id = JSON.parse(fs.readFileSync(jobLayout({ study, job: 'race', ...r }).identity, 'utf8'));

  assert.equal(id.createdBy.pid, firsts.find((x) => x.ok)!.pid);
});

test('across processes: two different jobs at once own disjoint directories', async () => {
  const r = roots();
  const a = child(['job', study, 'ja', r.cacheRoot, r.resultsRoot, '60000']);
  const b = child(['job', study, 'jb', r.cacheRoot, r.resultsRoot, '60000']);

  assert.equal((await a.first).ok, true);
  assert.equal((await b.first).ok, true);
  assert.deepEqual(
    listJobs({ study, ...r }).map((s) => [s.id.split('/').at(-1), s.state]),
    [
      ['ja', 'active'],
      ['jb', 'active']
    ]
  );
  a.c.stdin!.end();
  b.c.stdin!.end();
  await Promise.all([a.exited, b.exited]);
  assert.deepEqual(
    listJobs({ study, ...r }).map((s) => s.state),
    ['interrupted', 'interrupted']
  );
});

test('the EvalLab: its own lock without a job, the job owner with one; a second writer is refused', async () => {
  const r = roots();
  const l1 = lab({ cacheRoot: r.cacheRoot, job: 'lab1' });

  assert.equal(code(() => lab({ cacheRoot: r.cacheRoot, job: 'lab1' })), 'JOB_ACTIVE');
  const other = child(['lab', study, 'lab1', r.cacheRoot, r.resultsRoot, '1000']);

  assert.equal((await other.first).code, 'JOB_ACTIVE');
  await other.exited;
  await l1.close('test');
  const l2 = lab({ cacheRoot: r.cacheRoot, job: 'lab1' }); // released at close

  await l2.close('test');
  // with a job context: the job's directory and name, no second lock
  const j = openJob({ study, job: 'owned', identity: def, purpose: 'parity-test', ...r });
  const l3 = new EvalLab({ ...labOptionsOf(j), door: 'none', doorPin: 'none', purpose: 'parity-test', pool, backend: 'test', codeDigest: 'test' });

  assert.ok(fs.existsSync(path.join(j.dirs.cache, 'archive.sqlite')));
  assert.equal(code(() => lab({ cacheRoot: r.cacheRoot, job: 'owned' })), 'JOB_ACTIVE');
  assert.equal(code(() => lab({ cacheRoot: r.cacheRoot, job: 'other', owner: j })), 'JOB_NOT_OWNER');
  assert.equal(code(() => lab({ cacheRoot: r.cacheRoot, job: 'owned', owner: j, study: 'research/another' })), 'JOB_NOT_OWNER');
  await l3.close('test');
  assert.equal(j.holds(), true, 'the Lab does not release the job it does not own');
  j.release();
  assert.equal(code(() => lab({ cacheRoot: r.cacheRoot, job: 'owned', owner: j })), 'JOB_NOT_OWNER');
  assert.equal(OwnershipLock.probe(j.dirs.cache), 'free');
});

test('the official gate refuses an official run without a held job of its study (before any server starts)', async () => {
  const { openOfficialGpuSession } = await import('../../gpu-backend/official.ts');
  const r = roots();
  const j = openJob({ study: 'research/zz-other', job: 'g1', identity: def, purpose: 'official-optimization', ...r });
  const base = {
    study,
    purpose: 'official-optimization',
    door: { name: 'none', sessions: 1 } as never,
    domain: { name: 'x', features: 0n, growthStructures: 0, d1Structures: 0 } as never,
    plannedBatch: 1,
    binary: '/nonexistent',
    allowUnaccepted: true
  };
  const refusal = async (o: Record<string, unknown>) => {
    try {
      await openOfficialGpuSession({ ...base, ...o } as never);
      return 'opened';
    } catch (e) {
      return (e as Error).message;
    }
  };

  assert.match(await refusal({ job: j }), /preflight-job: .*belongs to research\/zz-other/);
  assert.match(await refusal({}), /preflight-job: a run without a job needs a run id and a dataset cache/);
  const k = openJob({ study, job: 'g2', identity: def, purpose: 'official-optimization', ...r });

  assert.match(await refusal({ job: k, runId: 'another' }), /preflight-job: run id another is not the job's name/);
  assert.match(await refusal({ job: k, cacheDir: '/tmp/elsewhere' }), /preflight-job: dataset cache \/tmp\/elsewhere is not the job's/);
  // a valid job passes the job check: the next refusal is the (missing) binary
  assert.match(await refusal({ job: k }), /preflight-binary/);
  k.release();
  assert.match(await refusal({ job: k }), /preflight-job: .*not held by this process/);
  // an official run (no test switch) without a job is refused at the job check once the acceptance passes; with no
  // accepted record here the acceptance refuses first — either way it never opens
  assert.match(await refusal({ allowUnaccepted: false }), /preflight-(acceptance|pins|source|job)/);
  j.release();
});

test('the status command lists jobs and their states', () => {
  const r = roots();

  openJob({ study, job: 'done', identity: def, purpose: 'x', ...r }).release();
  const j = openJob({ study, job: 'done', identity: def, purpose: 'x', resume: true, ...r });

  j.complete();
  j.release();
  const out = spawnSync(
    process.execPath,
    [
      '--no-maglev',
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join(import.meta.dirname, '..', 'cli.ts'),
      'list',
      '--study',
      study,
      '--cache-root',
      r.cacheRoot,
      '--results-root',
      r.resultsRoot
    ],
    { encoding: 'utf8' }
  );

  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^complete +research\/zz-jobs-test\/done/m);
});
