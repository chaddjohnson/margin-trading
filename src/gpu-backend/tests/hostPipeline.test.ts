// The parallel host path (hostPipeline.ts, hostWorker.ts) against the serial codec (batch.ts), without a GPU: a small
// synthetic door, the reference identities and seeded Assignment 3 genomes, and a synthetic response that is consistent
// with its request and receipt (every candidate status 0, no trades or lots, distinct per-candidate values). The real
// GPU outputs are covered on Apollo (the parity campaign through the pipeline); these tests pin the pipeline's own
// contract: the same request bytes, the same results in candidate order for any worker count, the receipt verified
// before anything is returned, and fail-closed behaviour on a corrupted response, another device, a worker that throws,
// exits or hangs, and a door that differs.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { fixtureDoorOf } from '../../vg-d1-growth-joint/data.ts';
import { sessionOf, weekdays } from '../../d1-risk-controls/tests/fixtures.ts';
import { vOptions, incumbents } from '../../vg-l0-full-joint/nl0.ts';
import { decode, levelsOf } from '../../vg-l0-full-joint/space.ts';
import { subjectOfCfg } from '../../vg-l0-risk-metrics/engine.ts';
import { Rng, deriveSeed } from '../../optimizer/rng.ts';
import {
  type EncodedBatch,
  type Task,
  type TaskResult,
  candHashes,
  combineChecksum,
  decodeBatch,
  encodeBatch
} from '../batch.ts';
import { HostPipeline } from '../hostPipeline.ts';
import { doorDigest, workerDoorOf } from '../hostDoor.ts';
import { BatchHeader, BookOut, CandOut, FLAGS, PROTOCOL_VERSION, Period, Receipt, ResultHeader } from '../layout.ts';
import { bookView, canonHash, poolView } from '../canon.ts';

const rng = new Rng(deriveSeed('gpu-backend', 'host-pipeline-test', 'door'));
const dates = weekdays(330, '2017-01-02');
const make = (p0: number) => {
  let p = p0;

  return dates.map((date) => {
    p = Math.max(1, Math.round(p * (1 + (rng.next() - 0.5) * 0.04) * 4) / 4);
    const bars = Array.from({ length: 5 }, () => {
      const o = p;

      p = Math.max(1, Math.round(p * (1 + (rng.next() - 0.5) * 0.01) * 4) / 4);
      return { o, c: p };
    });

    return sessionOf(date, bars);
  });
};
const door = fixtureDoorOf('host-pipeline-test', { GDX: make(40), VGT: make(100) });
const tasks: Task[] = (() => {
  const inc = incumbents();
  const out: Task[] = (['NL0', 'IJ1', 'C4', 'C4R'] as const).map((k) => ({
    k: `R:${k}`,
    quad: inc[k].quad,
    controls: null,
    options: vOptions,
    detail: k === 'C4',
    risk: k === 'IJ1'
  }));
  const levels = levelsOf('coarse');

  for (let i = 0; i < 300; i++) {
    const r = new Rng(deriveSeed('gpu-backend', 'host-pipeline-test', i));
    const s = subjectOfCfg(
      decode(
        levels.map((l) => r.int(l)),
        'coarse'
      )
    );

    out.push({
      k: `P:${i}`,
      quad: s.quad,
      controls: s.controls,
      options: i % 7 === 0 ? { ...vOptions, boundaries: [dates[100]!, dates[200]!] } : vOptions,
      detail: i % 5 === 0,
      risk: i % 3 === 0
    });
  }
  return out;
})();
const UUID = 'GPU-01234567-89ab-cdef-0123-456789abcdef';
const uuidBytes = Buffer.from(UUID.slice(4).replaceAll('-', ''), 'hex');

// a response consistent with the request: the device's shape, receipt and checksum, and values that are a function of
// each task (its key), never of its position in the batch — as a real evaluator's are
const keyValue = (k: string) => {
  let h = 2166136261;

  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619) >>> 0;
  return h % 9973;
};
const responseOf = (enc: EncodedBatch, S: number, keys: string[] = tasks.map((t) => t.k)) => {
  const n = enc.n;
  const runPool = (enc.flags & FLAGS.RUN_POOL) !== 0;
  const daily = enc.flags & FLAGS.RETURN_DAILY ? n * S * 8 : 0;
  const candAt = ResultHeader.size + Receipt.size;
  const buf = Buffer.alloc(candAt + n * CandOut.size + (runPool ? enc.nRanges * Period.size : 0) + daily);
  const RH = ResultHeader.offsets;
  const RC = Receipt.offsets;
  const CO = CandOut.offsets;

  buf.write('GB2OUT01', 0, 'latin1');
  buf.writeUInt32LE(PROTOCOL_VERSION, RH.version!);
  buf.writeUInt32LE(n, RH.nCand!);
  buf.writeUInt32LE(enc.flags, RH.flags!);
  buf.writeUInt32LE(S, RH.sessions!);
  for (let c = 0; c < n; c++) {
    const a = candAt + c * CandOut.size;

    buf.writeUInt32LE(c, a + CO.id!);
    buf.writeInt32LE(runPool ? 1 : 0, a + CO.executed!);
    buf.writeDoubleLE(keyValue(keys[c]!) + 0.25, a + CO.net!);
    for (let b = 0; b < 4; b++) buf.writeInt32LE(-1, a + CO.book! + b * BookOut.size + BookOut.offsets.firstDS!);
  }
  const dailyAt = candAt + n * CandOut.size + (runPool ? enc.nRanges * Period.size : 0);

  for (let c = 0; c < n; c++)
    for (let s = 0; s < S; s++)
      if (daily) buf.writeDoubleLE((keyValue(keys[c]!) % 13) * 10 + s * 0.5, dailyAt + (c * S + s) * 8);
  buf.writeBigUInt64LE(enc.nonce, ResultHeader.size + RC.batchNonce!);
  uuidBytes.copy(buf, ResultHeader.size + RC.uuid!);
  buf.writeUInt32LE(n, ResultHeader.size + RC.nCand!);
  buf.writeUInt32LE(enc.expectD1, ResultHeader.size + RC.d1Executed!);
  buf.writeUInt32LE(enc.expectG, ResultHeader.size + RC.gExecuted!);
  buf.writeUInt32LE(runPool ? n : 0, ResultHeader.size + RC.poolExecuted!);
  buf.writeBigUInt64LE(
    combineChecksum(candHashes(new Uint8Array(buf.buffer, buf.byteOffset + candAt, n * CandOut.size), 0, n)),
    ResultHeader.size + RC.outChecksum!
  );
  return buf;
};
const hashOf = (r: TaskResult) =>
  canonHash({
    key: r.key,
    id: r.id,
    status: r.status,
    features: r.features,
    record: r.record,
    books: r.books.map(bookView),
    rc: r.rc,
    pool: r.pool ? poolView(r.pool) : null,
    envelope: r.envelope
  });
const nonceAt = BatchHeader.offsets.batchNonce!;
const sameRequest = (a: Buffer, b: Buffer) =>
  Buffer.compare(a.subarray(0, nonceAt), b.subarray(0, nonceAt)) === 0 &&
  Buffer.compare(a.subarray(nonceAt + 8), b.subarray(nonceAt + 8)) === 0;
const serial = (() => {
  const enc = encodeBatch(door, tasks, {});

  return { enc, results: decodeBatch(door, tasks, enc, responseOf(enc, door.sessions), {}).results };
})();

test('host pipeline: the request bytes and every result equal the serial codec, in candidate order, for 1–4 workers', async () => {
  assert.ok(serial.results.every((r) => r.status === 0 && r.record !== null));
  for (const workers of [1, 2, 3, 4]) {
    const pipe = await HostPipeline.start({ door, workers, minShard: 16 });

    try {
      const p = await pipe.prepare(door, tasks, {});

      assert.ok(sameRequest(p.enc.buffer, serial.enc.buffer), `request bytes (${workers} workers)`);
      assert.equal(p.enc.shards.length, workers);

      const full = await pipe.complete(p, { payload: responseOf(p.enc, door.sessions), roundTripMs: 0 }, UUID, 'full');

      assert.deepEqual(
        full.results.map((r) => r.key),
        tasks.map((t) => t.k)
      );
      assert.deepEqual(full.results.map(hashOf), serial.results.map(hashOf), `results (${workers} workers)`);

      const p2 = await pipe.prepare(door, tasks, {});
      const lean = await pipe.complete(
        p2,
        { payload: responseOf(p2.enc, door.sessions), roundTripMs: 0 },
        UUID,
        'lean'
      );

      assert.deepEqual(
        lean.results.map((r) => canonHash(r.record)),
        serial.results.map((r) => canonHash(r.record))
      );
      assert.ok(lean.results.every((r) => r.books.length === 0 && r.pool === null));
    } finally {
      await pipe.close();
    }
  }
});

test('host pipeline: a corrupted response, a stale nonce, another device and a missing candidate are refused; nothing is returned', async () => {
  const pipe = await HostPipeline.start({ door, workers: 3, minShard: 16 });

  try {
    const p = await pipe.prepare(door, tasks, {});
    const bad = responseOf(p.enc, door.sessions);

    bad[ResultHeader.size + Receipt.size + CandOut.size * 7 + 40]! ^= 1;
    await assert.rejects(pipe.complete(p, { payload: bad, roundTripMs: 0 }, UUID), /differ from the device checksum/);
    const p2 = await pipe.prepare(door, tasks, {});

    await assert.rejects(
      pipe.complete(p2, { payload: responseOf(serial.enc, door.sessions), roundTripMs: 0 }, UUID),
      /receipt nonce differs/
    );
    const p3 = await pipe.prepare(door, tasks, {});

    await assert.rejects(
      pipe.complete(
        p3,
        { payload: responseOf(p3.enc, door.sessions), roundTripMs: 0 },
        'GPU-00000000-0000-0000-0000-000000000000'
      ),
      /receipt from GPU-01234567/
    );
    // a response that lacks a candidate (a missing or truncated result)
    const p5 = await pipe.prepare(door, tasks, {});
    const short = responseOf(p5.enc, door.sessions);

    short.writeUInt32LE(tasks.length - 1, ResultHeader.offsets.nCand!);
    await assert.rejects(pipe.complete(p5, { payload: short, roundTripMs: 0 }, UUID), /result shape/);
    // still healthy: a verification failure is the batch's, not the pipeline's
    const p4 = await pipe.prepare(door, tasks, {});

    assert.equal(
      (await pipe.complete(p4, { payload: responseOf(p4.enc, door.sessions), roundTripMs: 0 }, UUID)).results.length,
      tasks.length
    );
  } finally {
    await pipe.close();
  }
});

test('host pipeline: a worker that throws, exits or hangs fails closed; every later call is refused', async () => {
  for (const kind of ['throw', 'exit', 'hang'] as const) {
    const pipe = await HostPipeline.start({
      door,
      workers: 3,
      minShard: 16,
      allowFaultInjection: true,
      opTimeoutMs: 4000
    });

    try {
      const p = await pipe.prepare(door, tasks, {});

      await assert.rejects(
        pipe.complete(p, { payload: responseOf(p.enc, door.sessions), roundTripMs: 0 }, UUID, 'lean', {
          shard: 1,
          kind
        }),
        kind === 'throw' ? /injected decode failure/ : kind === 'exit' ? /exited \(7\)/ : /did not answer decode/
      );
      if (kind !== 'throw') {
        assert.ok(pipe.failed);
        await assert.rejects(pipe.prepare(door, tasks, {}));
      }
    } finally {
      await pipe.close();
    }
  }
  // without the test option, no fault can be injected
  const pipe = await HostPipeline.start({ door, workers: 1 });

  try {
    const p = await pipe.prepare(door, tasks.slice(0, 8), {});

    await assert.rejects(
      pipe.complete(p, { payload: responseOf(p.enc, door.sessions), roundTripMs: 0 }, UUID, 'lean', {
        shard: 0,
        kind: 'throw'
      }),
      /fault injection is not enabled/
    );
  } finally {
    await pipe.close();
  }
});

test('host pipeline: a prepare or complete after close is refused at once, not after the operation timeout', async () => {
  // the operation timeout is far beyond the test's own bound: a call that waits for it fails the test
  const pipe = await HostPipeline.start({ door, workers: 2, minShard: 16, opTimeoutMs: 20000 });
  const p = await pipe.prepare(door, tasks, {});

  await pipe.close();

  const t0 = performance.now();
  const bounded = <T>(what: string, x: Promise<T>) =>
    Promise.race([
      x,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${what} after close did not settle within 5 s`)), 5000).unref();
      })
    ]);

  await assert.rejects(
    bounded('complete', pipe.complete(p, { payload: responseOf(p.enc, door.sessions), roundTripMs: 0 }, UUID, 'lean')),
    /host pipeline closed/
  );
  await assert.rejects(bounded('prepare', pipe.prepare(door, tasks, {})), /host pipeline closed/);
  assert.ok(performance.now() - t0 < 4000);
});

test("host pipeline: an encoding error is the serial path's error; the worker door equals the main door", async () => {
  const bad: Task = { ...tasks[5]!, options: { ...vOptions, boundaries: ['1999-01-04'] } };

  assert.throws(() => encodeBatch(door, [bad], {}), /is not a session/);
  const pipe = await HostPipeline.start({ door, workers: 2 });

  try {
    await assert.rejects(pipe.prepare(door, [bad, ...tasks.slice(0, 40)], {}), /is not a session/);
    await assert.rejects(pipe.prepare({ ...door }, tasks, {}), /another door/);
  } finally {
    await pipe.close();
  }
  assert.equal(doorDigest(workerDoorOf(door)), doorDigest(door));
  assert.notEqual(doorDigest({ ...door, dates: [...door.dates.slice(0, -1), '2099-01-01'] }), doorDigest(door));
});

// the GpuPool on the parallel host path, without a GPU: a stand-in server answers each request with a response
// consistent with it (the same as above), after a short delay
class StandInServer {
  pid = -1;
  calls = 0;
  stderrTail = '';
  prepare(d: typeof door, t: Task[], o: Parameters<typeof encodeBatch>[2]) {
    return { door: d, tasks: t, o, enc: encodeBatch(d, t, o), encodeMs: 0 };
  }
  async submit(p: { enc: EncodedBatch; tasks: Task[] }) {
    this.calls++;
    await new Promise((r) => setTimeout(r, 5));
    return {
      payload: responseOf(
        p.enc,
        door.sessions,
        p.tasks.map((t) => t.k)
      ),
      roundTripMs: 5
    };
  }
  complete(p: { tasks: Task[]; enc: EncodedBatch; o: Parameters<typeof encodeBatch>[2] }, raw: { payload: Buffer }) {
    const d = decodeBatch(door, p.tasks, p.enc, raw.payload, p.o);

    return { ...d, timing: { encodeMs: 0, roundTripMs: 0, decodeMs: 0, requestBytes: 0, responseBytes: 0 } };
  }
  kill() {}
  async close() {}
}

test('GpuPool on the host pipeline: callers that run while the pool starts, every worker count, the same records as the serial path', async () => {
  const { GpuPool } = await import('../pool.ts');
  const os = await import('node:os');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-pool-'));
  const recordsOf = async (hostWorkers: number) => {
    const pool = new GpuPool({
      door,
      session: null,
      server: new StandInServer() as never,
      uuid: UUID,
      ledgerFile: path.join(dir, `l${hostWorkers}.jsonl`),
      batchSize: 64,
      lingerMs: 2,
      hostWorkers
    });
    const got = new Map<string, string>();
    // three callers at once, without awaiting start(): the Lab's lanes do exactly this on their first evaluations
    const parts = [tasks.slice(0, 100), tasks.slice(100, 220), tasks.slice(220)];

    void pool.start();
    try {
      await Promise.all(parts.map((p) => pool.run(p, (t, v) => got.set(t.k, canonHash(v)))));
      assert.equal(pool.counters.cpuScored, 0);
      assert.equal(pool.hostWorkers, hostWorkers);
    } finally {
      await pool.close().catch(() => undefined);
    }
    return got;
  };

  try {
    const serialRecords = await recordsOf(0);

    assert.equal(serialRecords.size, tasks.length);
    assert.deepEqual([...serialRecords.keys()].sort(), tasks.map((t) => t.k).sort());
    for (const w of [1, 3]) {
      const r = await recordsOf(w);

      assert.deepEqual([...r.entries()].sort(), [...serialRecords.entries()].sort(), `${w} host workers`);
    }
    assert.deepEqual(
      [...serialRecords.entries()].sort(),
      serial.results.map((r) => [r.key, canonHash(r.record)]).sort()
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('GpuPool on the host pipeline: a worker that fails mid-job fails every caller; nothing of that batch is released', async () => {
  const { GpuPool } = await import('../pool.ts');
  const os = await import('node:os');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-pool-'));
  const pipe = await HostPipeline.start({ door, workers: 3, minShard: 8, allowFaultInjection: true });
  const pool = new GpuPool({
    door,
    session: null,
    server: new StandInServer() as never,
    uuid: UUID,
    ledgerFile: path.join(dir, 'l.jsonl'),
    batchSize: 64,
    lingerMs: 2,
    pipeline: pipe
  });
  let returned = 0;

  try {
    await assert.rejects(
      pool.run(tasks, () => {
        returned++;
        if (returned === 64) pipe.injectNextDecodeFault('throw', 1);
      }),
      /injected decode failure/
    );
    assert.equal(returned % 64, 0, 'whole batches only');
    assert.ok(returned < tasks.length);
    assert.equal(pool.counters.cpuScored, 0);
  } finally {
    await pool.close().catch(() => undefined);
    await pipe.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
