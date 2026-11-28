// risk-envelope: the EvalLab's optional risk-envelope delivery (GPU Phase 7) with a scripted pool — no GPU, no market
// data, temporary directories only. A plain item keeps the earlier key, task and record exactly; a `risk` item gets its
// own `|risk` key, a task with `risk: true`, and its envelope is validated on write and on every read; every mismatch
// fails closed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import { after, test } from 'node:test';
import { EvalLab, type PoolLike, RISK_KEY_SUFFIX, checkEnvelope } from '../../gpu-backend/lab.ts';
import type { Task } from '../../gpu-backend/client.ts';
import { DatabaseSync } from 'node:sqlite';
import { evalKeyOf } from '../../vg-l0-full-joint/space.ts';
import { incumbentCfg } from '../../vg-l0-full-joint/stages.ts';
import { vOptions } from '../../vg-l0-full-joint/nl0.ts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-envelope-lab-test-'));

after(() => fs.rmSync(root, { recursive: true, force: true }));

const env = { bankedDdMarked: 1, bankedDdLiquidation: 2, principalLossMarked: 3, principalLossLiquidation: 4 };

// a pool that records the tasks it receives and answers with a scripted value per task
class ScriptedPool implements PoolLike {
  readonly seen: Task[] = [];
  stopping: string | null = null;

  constructor(readonly answer: (t: Task) => unknown) {}
  async start() {}
  async run<T>(tasks: Task[], onResult: (task: Task, value: T, ms: number) => void) {
    for (const t of tasks) {
      this.seen.push(t);
      onResult(t, this.answer(t) as T, 1);
    }
  }
  requestStop(reason: string) {
    this.stopping = reason;
  }
  async close() {}
}

let n = 0;
const labOf = (pool: PoolLike) => {
  const job = `j${n++}`;
  const lab = new EvalLab({
    study: 'research/zz-risk-envelope-test',
    job,
    door: 'D24',
    doorPin: 'test-pin',
    purpose: 'parity-test',
    pool,
    backend: 'test',
    codeDigest: 'test',
    cacheRoot: root
  });

  return { lab, job };
};
const cfg = incumbentCfg('NL0');
const plainKey = evalKeyOf('D24', cfg, vOptions);
const record = (t: Task) => ({ net: 1, dd: 2, key: t.k });

test('a plain item: the earlier key, task object and archived record, unchanged', async () => {
  const pool = new ScriptedPool(record);
  const { lab } = labOf(pool);

  await lab.open();
  const [r] = await lab.evalMany([{ cfg, options: vOptions }]);

  assert.equal(pool.seen.length, 1);
  assert.equal(pool.seen[0]!.k, plainKey);
  assert.deepEqual(Object.keys(pool.seen[0]!).sort(), ['controls', 'detail', 'k', 'options', 'quad']);
  assert.deepEqual(r, { net: 1, dd: 2, key: plainKey });
  await lab.close();
});

test('a risk item: its own |risk key, a risk task, the envelope delivered and validated; plain and risk never mix', async () => {
  const pool = new ScriptedPool((t) => (t.risk ? { ...record(t), envelope: env } : record(t)));
  const { lab } = labOf(pool);

  await lab.open();
  const rs = (await lab.evalMany([
    { cfg, options: vOptions, risk: true },
    { cfg, options: vOptions },
    { cfg, options: vOptions, risk: true } // a duplicate of the first: one evaluation
  ])) as unknown as { envelope?: unknown }[];

  assert.equal(pool.seen.length, 2);
  assert.equal(pool.seen[0]!.k, `${plainKey}${RISK_KEY_SUFFIX}`);
  assert.equal(pool.seen[0]!.risk, true);
  assert.equal(pool.seen[1]!.k, plainKey);
  assert.equal('risk' in pool.seen[1]!, false);
  assert.deepEqual(rs[0]!.envelope, env);
  assert.equal(rs[1]!.envelope, undefined);
  assert.deepEqual(rs[2], rs[0]);
  // detail + risk: both suffixes, in that order
  await lab.evalMany([{ cfg, options: vOptions, detail: true, risk: true }]);
  assert.equal(pool.seen[2]!.k, `${plainKey}|detail${RISK_KEY_SUFFIX}`);
  // archive hits are read back and validated again
  const before = pool.seen.length;

  await lab.evalMany([
    { cfg, options: vOptions, risk: true },
    { cfg, options: vOptions }
  ]);
  assert.equal(pool.seen.length, before);
  await lab.close();
});

test('fail closed: a risk record without (or with an invalid) envelope, a plain record with one, a tampered archive', async () => {
  for (const answer of [
    (t: Task) => record(t), // no envelope
    (t: Task) => ({ ...record(t), envelope: { ...env, principalLossLiquidation: NaN } }),
    (t: Task) => ({ ...record(t), envelope: { ...env, principalLossLiquidation: 2 } }) // liquidation < marked
  ]) {
    const { lab } = labOf(new ScriptedPool(answer));

    await lab.open();
    await assert.rejects(lab.evalMany([{ cfg, options: vOptions, risk: true }]), /risk envelope/);
    await lab.close().catch(() => undefined);
  }
  {
    const { lab } = labOf(new ScriptedPool((t) => ({ ...record(t), envelope: env })));

    await lab.open();
    await assert.rejects(lab.evalMany([{ cfg, options: vOptions }]), /without a risk request carries an envelope/);
    await lab.close().catch(() => undefined);
  }
  {
    // a risk record archived correctly, then its envelope removed from the archive: the next read refuses it
    const { lab, job } = labOf(new ScriptedPool((t) => ({ ...record(t), envelope: env })));

    await lab.open();
    await lab.evalMany([{ cfg, options: vOptions, risk: true }]);
    await lab.close();

    // the archive is write-once (INSERT OR IGNORE): tamper with the row directly, as a damaged or foreign file would
    const db = new DatabaseSync(path.join(root, 'jobs', job, 'archive.sqlite'));

    assert.equal(
      Number(
        db
          .prepare('UPDATE points SET json = ? WHERE key = ?')
          .run(JSON.stringify({ net: 1, dd: 2 }), `${plainKey}${RISK_KEY_SUFFIX}`).changes
      ),
      1
    );
    db.close();

    const again = new EvalLab({
      study: 'research/zz-risk-envelope-test',
      job,
      door: 'D24',
      doorPin: 'test-pin',
      purpose: 'parity-test',
      pool: new ScriptedPool(() => assert.fail('an archived key must not be re-evaluated')),
      backend: 'test',
      codeDigest: 'test',
      cacheRoot: root
    });

    await again.open();
    await assert.rejects(again.evalMany([{ cfg, options: vOptions, risk: true }]), /risk envelope missing/);
    await again.close().catch(() => undefined);
  }
});

test('checkEnvelope: exactly four finite non-negative fields, liquidation ≥ marked', () => {
  assert.deepEqual(checkEnvelope(env, 't'), env);
  assert.doesNotThrow(() => checkEnvelope({ ...env, bankedDdLiquidation: 1, principalLossLiquidation: 3 }, 't')); // equal bases (0 bps)
  for (const bad of [
    undefined,
    1,
    [],
    { ...env, x: 0 },
    { ...env, bankedDdMarked: -0.01 },
    { ...env, bankedDdMarked: 3 }
  ])
    assert.throws(() => checkEnvelope(bad, 't'));
});
