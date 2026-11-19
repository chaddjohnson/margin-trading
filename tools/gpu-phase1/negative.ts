// S4 gate G6 (PROTOCOL.md §12): failures must be explicit errors, never plausible output.
// Each case states the expected outcome; the record keeps what actually happened.
//
//   node --experimental-transform-types tools/gpu-phase1/negative.ts --out <json>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { VBook } from '../../src/vg-d1-growth-joint/books.ts';
import { booksOf as p3BooksOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { cacheDir, openDoor, writeJson } from '../../src/gpu-phase1/context.ts';
import { exportDataset } from '../../src/gpu-phase1/dataset.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { type EvalItem, FEATURE, GpuError, GpuEvaluator, cudaLibDir, defaultBinary } from '../../src/gpu-phase1/gpu.ts';
import { branchHeavySubjects, randomSubjects, referenceSubjects } from '../../src/gpu-phase1/subjects.ts';

const args = process.argv.slice(2);
const out = args[args.indexOf('--out') + 1];

if (!out || !args.includes('--out')) throw new Error('--out <json> is required');

const door = await openDoor('W-CRASH', 'S4 negative tests');
const ds = exportDataset(door, 'negative-W-CRASH');
const refs = referenceSubjects();
const items: EvalItem[] = [...refs, ...randomSubjects(6, 'NEG'), ...branchHeavySubjects(refs[0]!.quad).slice(0, 4)].map((s) => ({ key: s.key, quad: s.quad, controls: s.controls, options: vOptions }));
const cases: { case: string; expected: string; outcome: string; pass: boolean }[] = [];
const record = (c: string, expected: string, outcome: string, pass: boolean) => {
  cases.push({ case: c, expected, outcome, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${c}: ${outcome}`);
};
const expectError = async (c: string, status: number, f: () => Promise<unknown>) => {
  try {
    await f();
    record(c, `GpuError status ${status}`, 'no error (results returned)', false);
  } catch (e) {
    const s = e instanceof GpuError ? e.status : -1;

    record(c, `GpuError status ${status}`, `${(e as Error).message.slice(0, 160)}`, s === status);
  }
};

// a raw request with a hand-made frame or payload
const rawBatch = async (gpu: GpuEvaluator, mutate: (b: Buffer) => Buffer) => {
  // capture a valid batch by encoding through the client, then mutate it
  const enc = await import('../../src/gpu-phase1/gpu.ts');
  void enc;
  const valid = await captureBatch(items.slice(0, 2));
  const r = await gpu.request(2, mutate(Buffer.from(valid)));

  if (r.status) throw new GpuError(r.status, r.payload.toString());
  return r;
};
let captured: Buffer | null = null;
const captureBatch = async (list: EvalItem[]) => {
  if (captured) return captured;

  const spy = GpuEvaluator.start();

  await spy.load(ds.file);

  const orig = spy.request.bind(spy);

  spy.request = async (type: number, payload?: Buffer) => {
    if (type === 2 && payload) captured = Buffer.from(payload);
    return orig(type, payload);
  };
  await spy.evaluate(door, list, { record: false });
  await spy.close();
  return captured!;
};

// ----- 1. framing and datasets -----
{
  const gpu = GpuEvaluator.start();

  await expectError('EVAL before any dataset is loaded', 104, () => gpu.evaluate(door, items.slice(0, 1)));
  await expectError('LOAD of a missing file', 107, () => gpu.load(path.join(cacheDir, 'does-not-exist.gp1ds')));

  const bytes = fs.readFileSync(ds.file);
  const corrupt = Buffer.from(bytes);

  corrupt[corrupt.length - 100]! ^= 0x01; // one flipped bit in the last session's bars
  fs.writeFileSync(path.join(cacheDir, 'corrupt.gp1ds'), corrupt);
  await expectError('LOAD of a dataset with one flipped bit', 107, () => gpu.load(path.join(cacheDir, 'corrupt.gp1ds')));
  fs.writeFileSync(path.join(cacheDir, 'truncated.gp1ds'), bytes.subarray(0, bytes.length - 8));
  await expectError('LOAD of a truncated dataset', 102, () => gpu.load(path.join(cacheDir, 'truncated.gp1ds')));
  fs.rmSync(path.join(cacheDir, 'corrupt.gp1ds'));
  fs.rmSync(path.join(cacheDir, 'truncated.gp1ds'));

  await gpu.load(ds.file);
  await expectError('unknown request type', 100, async () => {
    const r = await gpu.request(77);

    if (r.status) throw new GpuError(r.status, r.payload.toString());
  });
  await expectError('batch with a bad magic', 100, () => rawBatch(gpu, (b) => (b.write('XP1BATCH', 0, 'latin1'), b)));
  await expectError('batch with protocol version 2', 101, () => rawBatch(gpu, (b) => (b.writeUInt32LE(2, 8), b)));
  await expectError('truncated batch', 102, () => rawBatch(gpu, (b) => b.subarray(0, b.length - 1)));
  await expectError('batch declaring 0 candidates', 102, () => rawBatch(gpu, (b) => (b.writeUInt32LE(0, 12), b.subarray(0, 64))));
  await expectError('batch evaluating to another end session', 103, () => rawBatch(gpu, (b) => (b.writeUInt32LE(5, 32), b)));
  await expectError('external book range out of bounds', 102, () => rawBatch(gpu, (b) => (b.writeInt32LE(1, 64 + 16), b.writeInt32LE(999999, 64 + 24), b)));

  // ----- 2. unsupported features: the whole batch is refused -----
  const withOpt = (o: object) => items.slice(0, 2).map((it) => ({ ...it, options: { ...it.options, ...o } }));

  await expectError('pool option wholeShares', 103, () => gpu.evaluate(door, withOpt({ wholeShares: true })));
  await expectError('pool option blackouts', 103, () => gpu.evaluate(door, withOpt({ blackouts: [{ first: door.dates[10]!, last: door.dates[20]! }] })));
  await expectError('pool option period boundaries', 103, () => gpu.evaluate(door, withOpt({ boundaries: [door.dates[50]!] })));
  await expectError('pool option explicit tie order', 103, () => gpu.evaluate(door, withOpt({ tieOrder: ['G:VGT', 'G:GDX', 'D1:VGT', 'D1:GDX'] })));
  await expectError('pool option later funding start', 103, () => gpu.evaluate(door, withOpt({ fundFrom: door.dates[30]! })));
  await expectError('Growth evaluated on the GPU (not in the slice)', 103, () => gpu.evaluate(door, items.slice(0, 2), { extraFeatures: FEATURE.GROWTH_ON_GPU }));
  await expectError('an unknown feature bit', 103, () => gpu.evaluate(door, items.slice(0, 2), { extraFeatures: 1 << 30 }));

  // ----- 3. VRAM -----
  await expectError('batch above the VRAM budget', 105, () => gpu.evaluate(door, items, { tradeCap: 1 << 20, lotCap: 16 }));
  await gpu.close();

  const big = GpuEvaluator.start({ vramBudgetMb: 1_000_000 });

  await big.load(ds.file);
  await expectError('batch above the free device memory (budget lifted)', 105, () => big.evaluate(door, items, { tradeCap: 1 << 20, lotCap: 16 }));
  await big.close();
}

// ----- 4. per-candidate capacity overflow: only the overflowing candidates fail; the rest stay bit-exact -----
{
  const gpu = GpuEvaluator.start();

  await gpu.load(ds.file);

  const cpu = items.map((it) => runWithControls2(door, it.quad, it.controls, it.options, false, false, { cache: false }));
  const check = async (label: string, o: { tradeCap?: number; lotCap?: number }, statusText: string) => {
    const { results } = await gpu.evaluate(door, items, { ...o, returnTrades: true, returnLots: true, returnSeries: true, record: false });
    let failed = 0,
      exact = 0,
      wrong = 0;

    results.forEach((r, i) => {
      if (r.status !== 0) {
        failed++;
        if (r.statusText !== statusText || r.pool !== null) wrong++;
      } else if (deepDiff(cpu[i]!.result, r.pool).length === 0) exact++;
      else wrong++;
    });

    const expectFail = items.filter((_it, i) => (o.tradeCap !== undefined ? cpu[i]!.books.some((b) => b.book.startsWith('D1') && b.trades.length > o.tradeCap!) : cpu[i]!.result.lots.length > o.lotCap!)).length;

    record(label, `${expectFail} candidates '${statusText}' with no outputs; the other ${items.length - expectFail} bit-exact`, `${failed} failed, ${exact} bit-exact, ${wrong} wrong`, failed === expectFail && wrong === 0 && exact === items.length - expectFail);
  };

  await check('D1 trade capacity 3', { tradeCap: 3 }, 'trade capacity');
  await check('pool lot capacity 2', { lotCap: 2 }, 'lot capacity');

  // a malformed external book (a duplicated decision: never strictly ordered): that candidate fails explicitly
  const gOf = (it: EvalItem) => p3BooksOf(door, it.quad, { ...vOptions, enabled: { ...vOptions.enabled, 'D1:GDX': false, 'D1:VGT': false } }) as VBook[];
  const victimIdx = items.findIndex((it) => gOf(it).some((b) => b.trades.length >= 1));
  const malformed = gOf(items[victimIdx]!).map((b) => ({ ...b, trades: b.trades.length ? [b.trades[0]!, b.trades[0]!, ...b.trades.slice(1)] : b.trades }));
  const other = items[victimIdx === 0 ? 1 : 0]!;
  const { results } = await gpu.evaluate(door, [{ ...items[victimIdx]!, growth: malformed }, other], { record: false });

  record('external Growth book with a duplicated (unordered) decision', "candidate 0 'external book unordered'; candidate 1 ok", `${results[0]!.statusText} / ${results[1]!.statusText}`, results[0]!.statusText === 'external book unordered' && results[1]!.status === 0);
  await gpu.close();
}

// ----- 5. device failure and process failure -----
{
  const refused = GpuEvaluator.start();

  await expectError('fault injection without the opt-in flag', 108, () => refused.fault());
  await refused.close();

  const gpu = GpuEvaluator.start({ allowFault: true });

  await gpu.load(ds.file);
  await expectError('a device trap (__trap) during a kernel', 106, () => gpu.fault());
  await new Promise((r) => setTimeout(r, 500));
  try {
    await gpu.evaluate(door, items.slice(0, 1));
    record('a request after the sticky device error', 'the client refuses (server exited)', 'results returned', false);
  } catch (e) {
    record('a request after the sticky device error', 'the client refuses (server exited)', (e as Error).message.slice(0, 120), /exited/.test((e as Error).message));
  }

  const victim = GpuEvaluator.start();

  await victim.load(ds.file);

  const many = Array.from({ length: 512 }, (_v, i) => ({ ...items[i % items.length]!, key: `k${i}` }));
  const pending = victim.evaluate(door, many, { record: false });

  setTimeout(() => victim.kill('SIGKILL'), 150);
  try {
    await pending;
    record('server killed during a batch', 'the pending batch rejects', 'results returned', false);
  } catch (e) {
    record('server killed during a batch', 'the pending batch rejects', (e as Error).message.slice(0, 120), /exited/.test((e as Error).message));
  }
}

// ----- 6. a bad frame closes the server (raw pipe) -----
{
  const child = spawn(defaultBinary(), [], { env: { ...process.env, LD_LIBRARY_PATH: cudaLibDir() } });
  const chunks: Buffer[] = [];

  child.stdout.on('data', (c: Buffer) => chunks.push(c));

  const exit = new Promise<number | null>((r) => child.on('exit', (code) => r(code)));

  child.stdin.write(Buffer.from('this is not a GP1 frame at all'));
  child.stdin.end();

  const code = await exit;
  const resp = Buffer.concat(chunks);
  const status = resp.length >= 8 ? resp.readUInt32LE(4) : -1;

  record('garbage on the request pipe', 'status 100 (bad frame), then the server exits', `status ${status}, exit ${code}`, status === 100);
}

const pass = cases.every((c) => c.pass);

writeJson(out!, { kind: 'gpu-phase1 S4 negative tests (G6)', door: 'W-CRASH', pass, cases });
console.log(`G6: ${cases.filter((c) => c.pass).length}/${cases.length} → ${pass ? 'PASS' : 'FAIL'}`);
