// The dataset export's publication contract (dataset.ts, GPU Phase 5), without a GPU: the bytes are the previous
// exporter's (golden sha256 values produced by the exporter of commit 0ac3e4e2 on these synthetic doors); a dataset file
// is write-once and published atomically; an identical published dataset is reused untouched; another dataset under the
// same name is an explicit conflict; a truncated, foreign or linked target is an explicit invalid-cache error; nothing
// is ever overwritten; a writer killed at any time leaves no partial target; concurrent writers and readers of one
// directory never meet a partial file. Everything happens in a temporary directory removed afterwards.
import { strict as assert } from 'node:assert';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import {
  DatasetCacheError,
  exportDataset,
  isCompleteDataset,
  removeStaleTemporaries,
  writeExclusive
} from '../dataset.ts';
import { NAME, targetOf, testDoor } from './datasetChild.ts';

const GOLD = {
  a120: 'fbf15597f76642ecd965d2654d0dcec9f835f604a40a49ef3e0467d8fccfd16e',
  b120: '37f04231a3f0ff21f3e8dea5b3d5551172f787336248ca900de6e9beb78ff90f',
  a260: 'ac623e2aac6f74853320acfb5af2bf69dff226f66b0ee972aeefa54dcb437053'
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gb2ds-test-'));
const child = path.join(import.meta.dirname, 'datasetChild.ts');
const nodeArgs = ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', child];
const sha = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const doorA = testDoor(NAME, 'a', 120);
const doorB = testDoor(NAME, 'b', 120);
const temporaries = (dir: string) => fs.readdirSync(dir).filter((f) => f.includes('.tmp-'));
const run = (args: string[]) =>
  new Promise<Record<string, unknown>>((resolve, reject) => {
    const c = spawn(process.execPath, [...nodeArgs, ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
    let buf = '';

    c.stdout.on('data', (d: Buffer) => (buf += d.toString()));
    c.on('exit', (code) => {
      const line = buf.trim().split('\n').at(-1) ?? '';

      if (code !== 0 || !line.startsWith('{')) reject(new Error(`child ${args[0]} exited ${code}: ${buf.slice(-200)}`));
      else resolve(JSON.parse(line) as Record<string, unknown>);
    });
  });
const refuses = (fn: () => unknown, code: string) =>
  assert.throws(fn, (e: unknown) => e instanceof DatasetCacheError && e.code === code, `expected ${code}`);

after(() => fs.rmSync(root, { recursive: true, force: true }));

test("the exported bytes are the previous exporter's (golden sha256); the file is published once with its sidecar", () => {
  const dir = path.join(root, 'one');
  const d = exportDataset(doorA, dir);

  assert.equal(d.sha256, GOLD.a120);
  assert.equal(d.published, 'created');
  assert.equal(d.file, targetOf(dir));
  assert.equal(sha(d.file), GOLD.a120);
  assert.ok(isCompleteDataset(fs.readFileSync(d.file)));
  assert.equal((JSON.parse(fs.readFileSync(d.sidecar, 'utf8')) as { fileSha256: string }).fileSha256, GOLD.a120);
  assert.deepEqual(fs.readdirSync(dir).sort(), [path.basename(d.file), path.basename(d.sidecar)].sort());
  assert.equal(exportDataset(testDoor(NAME, 'b', 120), path.join(root, 'one-b')).sha256, GOLD.b120);
  assert.equal(exportDataset(testDoor(`${NAME}-long`, 'a', 260), path.join(root, 'one-long')).sha256, GOLD.a260);
});

test('an identical published dataset is reused untouched (the same inode, times and sidecar)', () => {
  const dir = path.join(root, 'one');
  const before = fs.statSync(targetOf(dir));
  const sidecarBefore = fs.readFileSync(`${targetOf(dir)}.json`, 'utf8');
  const d = exportDataset(doorA, dir);
  const now = fs.statSync(targetOf(dir));

  assert.equal(d.published, 'reused');
  assert.equal(d.sha256, GOLD.a120);
  assert.deepEqual([now.ino, now.mtimeMs, now.size], [before.ino, before.mtimeMs, before.size]);
  assert.equal(fs.readFileSync(`${targetOf(dir)}.json`, 'utf8'), sidecarBefore);
  assert.deepEqual(temporaries(dir), []);
});

test('another dataset under the same name is an explicit conflict; the published file is never overwritten', () => {
  const dir = path.join(root, 'one');
  const before = fs.statSync(targetOf(dir));

  refuses(() => exportDataset(doorB, dir), 'DATASET_CACHE_CONFLICT');
  assert.equal(sha(targetOf(dir)), GOLD.a120);
  assert.equal(fs.statSync(targetOf(dir)).ino, before.ino);
  assert.deepEqual(temporaries(dir), []);
  // a sidecar that describes another dataset than the (correct) data file is a conflict too
  const dir2 = path.join(root, 'sidecar');

  exportDataset(doorA, dir2);
  fs.writeFileSync(`${targetOf(dir2)}.json`, JSON.stringify({ kind: 'gb2 dataset', fileSha256: GOLD.b120 }));
  refuses(() => exportDataset(doorA, dir2), 'DATASET_CACHE_CONFLICT');
});

test('a truncated, empty or foreign target is an explicit invalid-cache error and is left as it is', () => {
  const full = fs.readFileSync(targetOf(path.join(root, 'one')));

  for (const [name, bytes] of [
    ['truncated', full.subarray(0, full.length / 2)],
    ['empty', Buffer.alloc(0)],
    ['foreign', Buffer.from('not a dataset')],
    ['flipped', Buffer.from(full).fill(0xff, full.length - 8)]
  ] as const) {
    const dir = path.join(root, `invalid-${name}`);

    fs.mkdirSync(dir);
    fs.writeFileSync(targetOf(dir), bytes);
    refuses(() => exportDataset(doorA, dir), 'DATASET_CACHE_INVALID');
    assert.ok(fs.readFileSync(targetOf(dir)).equals(bytes), `${name}: the file changed`);
    assert.deepEqual(temporaries(dir), []);
    // the operator's remedy: remove it; then the export publishes
    fs.rmSync(targetOf(dir));
    assert.equal(exportDataset(doorA, dir).published, 'created');
    assert.equal(sha(targetOf(dir)), GOLD.a120);
  }
});

test('a symbolic link or directory at the target is never followed or replaced; exclusive creation never opens an existing path', () => {
  const victim = path.join(root, 'victim.bin');

  fs.writeFileSync(victim, 'victim');
  for (const make of [
    (t: string) => fs.symlinkSync(victim, t),
    (t: string) => fs.symlinkSync(path.join(root, 'does-not-exist'), t),
    (t: string) => fs.mkdirSync(t)
  ]) {
    const dir = fs.mkdtempSync(path.join(root, 'link-'));

    make(targetOf(dir));
    refuses(() => exportDataset(doorA, dir), 'DATASET_CACHE_INVALID');
    assert.equal(fs.readFileSync(victim, 'utf8'), 'victim');
    assert.ok(!fs.existsSync(path.join(root, 'does-not-exist')));
    assert.deepEqual(temporaries(dir), []);
  }

  const link = path.join(root, 'tmp-link');

  fs.symlinkSync(victim, link);
  assert.throws(() => writeExclusive(link, Buffer.from('x')), /EEXIST/);
  assert.throws(() => writeExclusive(victim, Buffer.from('x')), /EEXIST/);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'victim');
});

test('a writer that died before publication leaves only a temporary file: a restart publishes; stale temporaries of dead writers are removed, recent or live ones kept', () => {
  const dir = path.join(root, 'crashed');
  const base = path.basename(targetOf(dir));
  const dead = spawnSync(process.execPath, ['-e', '0']).pid; // a process that has exited
  const old = new Date(Date.now() - 3600_000);
  const half = fs.readFileSync(targetOf(path.join(root, 'one'))).subarray(0, 5000);
  const staleDead = path.join(dir, `.${base}.tmp-${dead}-abc123-0123456789ab`);
  const staleSidecar = path.join(dir, `.${base}.json.tmp-${dead}-abc123-0123456789ab`);
  const recentDead = path.join(dir, `.${base}.tmp-${dead}-abc124-0123456789ab`);
  const oldLive = path.join(dir, `.${base}.tmp-${process.pid}-abc125-0123456789ab`);
  const unrelated = path.join(dir, `.${base}.tmp-note`);

  fs.mkdirSync(dir);
  for (const f of [staleDead, staleSidecar, recentDead, oldLive, unrelated]) fs.writeFileSync(f, half);
  for (const f of [staleDead, staleSidecar, oldLive, unrelated]) fs.utimesSync(f, old, old);

  const d = exportDataset(doorA, dir); // the restart: the target was absent

  assert.equal(d.published, 'created');
  assert.equal(sha(d.file), GOLD.a120);
  assert.ok(
    !fs.existsSync(staleDead) && !fs.existsSync(staleSidecar),
    'stale temporaries of a dead writer are removed'
  );
  assert.ok(fs.existsSync(recentDead), 'a recent temporary is kept (its writer may be starting)');
  assert.ok(fs.existsSync(oldLive), 'a temporary whose writer id is alive is kept');
  assert.ok(fs.existsSync(unrelated), 'a file that is not an export temporary is never touched');
  assert.equal(removeStaleTemporaries(dir, base, 0), 1); // age 0: the recent dead one goes; the live one stays
  assert.ok(fs.existsSync(oldLive));
});

test('writers killed at arbitrary instants never leave a partial target; every directory is publishable afterwards', async () => {
  const dir = path.join(root, 'killed');
  let killed = 0;

  fs.mkdirSync(dir);
  for (let n = 0; n < 6; n++)
    await new Promise<void>((resolve, reject) => {
      const c = spawn(process.execPath, [...nodeArgs, 'loop', dir], { stdio: ['ignore', 'pipe', 'inherit'] });

      c.stdout.once('data', () => setTimeout(() => c.kill('SIGKILL'), 3 + n * 7));
      c.on('exit', (_code, signal) => {
        if (signal === 'SIGKILL') killed++;
        resolve();
      });
      c.on('error', reject);
    });
  assert.equal(killed, 6);

  const door = testDoor(NAME, 'a', 260);
  let complete = 0;
  let onlyTemporary = 0;

  for (const k of fs.readdirSync(dir)) {
    const t = targetOf(path.join(dir, k));

    if (fs.existsSync(t)) {
      assert.equal(sha(t), GOLD.a260, `${k}: a published target is the whole dataset`);
      complete++;
    } else onlyTemporary++;
    assert.equal(exportDataset(door, path.join(dir, k)).sha256, GOLD.a260);
    assert.equal(sha(t), GOLD.a260);
  }
  assert.ok(complete > 0, 'the killed writers had published datasets');
  assert.ok(complete + onlyTemporary > 6);
});

test('concurrent writers and readers of one directory: every export succeeds, one creates and the rest reuse, no reader ever sees a partial file', async () => {
  const dir = path.join(root, 'concurrent');
  const rounds = 20;
  const startAt = Date.now() + 1500;
  const gap = 60;

  fs.mkdirSync(dir);

  const [readers, writers] = await Promise.all([
    Promise.all([0, 1].map(() => run(['read', dir, String(rounds), String(startAt + rounds * gap + 400), GOLD.a120]))),
    Promise.all([0, 1, 2, 3].map(() => run(['write', dir, 'a', String(rounds), String(startAt), String(gap)])))
  ]);
  const outcomes = writers.flatMap((w) => w.out as { round: number; outcome: string; sha256?: string }[]);

  assert.equal(outcomes.length, 4 * rounds);
  assert.deepEqual([...new Set(outcomes.map((o) => o.outcome))].sort(), ['created', 'reused']);
  for (let r = 0; r < rounds; r++) {
    assert.equal(outcomes.filter((o) => o.round === r && o.outcome === 'created').length, 1, `round ${r}: one creator`);
    assert.equal(sha(targetOf(path.join(dir, `r${r}`))), GOLD.a120);
    assert.equal(
      fs.readdirSync(path.join(dir, `r${r}`)).length,
      2,
      `round ${r}: the dataset and its sidecar, no temporary`
    );
  }
  for (const r of readers) {
    assert.equal(r.badCount, 0, `a reader saw a partial or foreign file: ${JSON.stringify(r.bad)}`);
    assert.ok((r.reads as number) > rounds);
  }
});

test('concurrent writers of two different datasets under one name: one dataset is published, the others get the explicit conflict', async () => {
  const dir = path.join(root, 'conflict');
  const rounds = 12;
  const startAt = Date.now() + 1500;
  const gap = 60;

  fs.mkdirSync(dir);

  const [readers, writers] = await Promise.all([
    Promise.all(
      [0].map(() =>
        run(['read', dir, String(rounds), String(startAt + rounds * gap + 400), `${GOLD.a120},${GOLD.b120}`])
      )
    ),
    Promise.all(
      ['a', 'b', 'a', 'b'].map((tag) => run(['write', dir, tag, String(rounds), String(startAt), String(gap)]))
    )
  ]);

  assert.equal(readers[0]!.badCount, 0);
  for (let r = 0; r < rounds; r++) {
    const published = sha(targetOf(path.join(dir, `r${r}`)));
    const winner = published === GOLD.a120 ? 'a' : 'b';

    assert.ok(published === GOLD.a120 || published === GOLD.b120, `round ${r}: one complete dataset`);
    for (const w of writers) {
      const o = (w.out as { round: number; outcome: string; sha256?: string }[]).find((x) => x.round === r)!;

      if (w.tag === winner)
        assert.ok(o.outcome === 'created' || o.outcome === 'reused', `round ${r}: ${String(w.tag)} ${o.outcome}`);
      else assert.equal(o.outcome, 'DATASET_CACHE_CONFLICT', `round ${r}: the other dataset's writer is refused`);
    }
    assert.equal(
      (JSON.parse(fs.readFileSync(`${targetOf(path.join(dir, `r${r}`))}.json`, 'utf8')) as { fileSha256: string })
        .fileSha256,
      published
    );
    assert.deepEqual(temporaries(path.join(dir, `r${r}`)), []);
  }
});
