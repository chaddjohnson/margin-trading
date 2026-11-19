// gpu-backend: proves that v8_log / v8_exp (src/gpu-backend/cuda/v8math.cuh) equal Node's Math.log / Math.exp bit for
// bit, on the GPU (built with the backend's flags) and on the host, for a seeded set of inputs: the trend filter's real
// range (logs of prices 0.01–100,000, exponents of slopes) plus random doubles over the whole exponent range and the
// special values. Writes a JSON record; exits 1 on any difference.
//   node --experimental-transform-types tools/gpu-backend/check-v8math.ts <binary> <out.json> [n]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Rng } from '../../src/optimizer/rng.ts';

const [bin, outFile, nArg] = process.argv.slice(2);
const n = Number(nArg ?? 10_000_000);
const rng = Rng.from('gpu-backend', 'v8math', 20261119);
const xs = new Float64Array(n);
const special = [0, -0, 1, -1, 2, 0.5, Math.E, Math.LN2, 1e-300, 5e-324, 2.2250738585072014e-308, 709.782712893384,
  709.79, -745.1332191019412, -745.14, 1e308, Infinity, -Infinity, NaN, 1 + 2 ** -52, 1 - 2 ** -53, 0.34657359027997264];
const bits = new BigUint64Array(1);
const view = new Float64Array(bits.buffer);
for (let i = 0; i < n; i++) {
  const r = i % 8;
  if (i < special.length) xs[i] = special[i]!;
  else if (r === 0) xs[i] = 10 ** (rng.next() * 7 - 2); // prices 0.01 … 100,000
  else if (r === 1) xs[i] = 1 + (rng.next() - 0.5) * 0.2; // price ratios near 1
  else if (r === 2) xs[i] = (rng.next() - 0.5) * 2; // slope × lookback
  else if (r === 3) xs[i] = (rng.next() - 0.5) * 1500; // the whole exp range
  else if (r === 4) xs[i] = (rng.next() - 0.5) * 1e-6; // tiny
  else if (r === 5) xs[i] = rng.next() * 50; // log of large ratios
  else {
    bits[0] = (BigInt(Math.floor(rng.next() * 2 ** 32)) << 32n) | BigInt(Math.floor(rng.next() * 2 ** 32));
    xs[i] = view[0]!; // any double
  }
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'v8math-'));
const inFile = path.join(dir, 'in.f64');
const resFile = path.join(dir, 'out.f64');
fs.writeFileSync(inFile, Buffer.from(xs.buffer));
execFileSync(bin!, [inFile, resFile], { stdio: ['ignore', 'pipe', 'inherit'] });
const buf = fs.readFileSync(resFile);
const out = new Float64Array(buf.buffer, buf.byteOffset, buf.length / 8);
const counts = { gpuLog: 0, gpuExp: 0, hostLog: 0, hostExp: 0 };
const examples: unknown[] = [];
for (let i = 0; i < n; i++) {
  const l = Math.log(xs[i]!);
  const e = Math.exp(xs[i]!);
  const got = [out[4 * i]!, out[4 * i + 1]!, out[4 * i + 2]!, out[4 * i + 3]!];
  const want = [l, e, l, e];
  (['gpuLog', 'gpuExp', 'hostLog', 'hostExp'] as const).forEach((k, j) => {
    if (!Object.is(got[j], want[j])) {
      counts[k]++;
      if (examples.length < 20) examples.push({ k, x: xs[i], want: want[j], got: got[j] });
    }
  });
}
fs.rmSync(dir, { recursive: true, force: true });
const ok = Object.values(counts).every((c) => c === 0);
const rec = { kind: 'v8math parity', t: new Date().toISOString(), node: process.version, v8: process.versions.v8, n, mismatches: counts, examples, ok };
fs.mkdirSync(path.dirname(outFile!), { recursive: true });
fs.writeFileSync(outFile!, `${JSON.stringify(rec, null, 1)}\n`);
console.log(JSON.stringify({ n, mismatches: counts, ok }));
process.exit(ok ? 0 : 1);
