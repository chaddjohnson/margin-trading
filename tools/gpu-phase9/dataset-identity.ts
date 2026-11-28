// gpu-phase9 (PROTOCOL.md §6 gate D1): THE GPU INPUT IS THE ACCEPTED ONE. For every real-data run of this study's parity
// campaign (results/parity/final/<run>.json: D19, D21, D23, D24, FULL, the regime windows W-* and the episodes E-*), the
// exported GPU dataset (build.dataset: the sha256 of the .gb2ds file the server loaded), the door's per-symbol data hashes
// (dataSha256), its sessions and its first and last session must equal the same run of GPU Phase 7's sealed campaign
// (research/gpu-phase7/results/parity/final/<run>.json). This is what the research-date-boundaries change must preserve:
// the FULL door now reads a verified byte prefix of the appended canonical files, and every door must still deliver to
// the GPU exactly the bytes Phase 7 accepted. The synthetic fixtures (S0–S7) are excluded: their seeds are each study's own.
// Read-only towards Phase 7; writes only results/dataset-identity.json (sealed).
//   node --no-maglev --experimental-transform-types tools/gpu-phase9/dataset-identity.ts
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase9/context.ts';
import { ENGINE_FLAG, engineRuntime } from '../../src/gpu-backend/runtime.ts';

type Run = {
  door: string;
  sessions: number;
  first: string;
  last: string;
  dataSha256: unknown;
  build: { binarySha256: string; dataset: string };
};
const mine = path.join(resultsDir, 'parity', 'final');
const theirs = path.join(repoRoot, 'research', 'gpu-phase7', 'results', 'parity', 'final');
const out = path.join(resultsDir, 'dataset-identity.json');
const read = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as Run;
const runs = fs
  .readdirSync(mine)
  .filter((f) => f.endsWith('.json') && f !== 'SUMMARY.json' && !/^S\d-/.test(f))
  .sort();
const rows = runs.map((f) => {
  const a = read(path.join(mine, f));
  const pf = path.join(theirs, f);
  const b = fs.existsSync(pf) ? read(pf) : null;
  const same = (k: keyof Run) => !!b && JSON.stringify(a[k]) === JSON.stringify(b[k]);

  return {
    run: f.replace(/\.json$/, ''),
    door: a.door,
    dataset: a.build.dataset,
    phase7Dataset: b?.build.dataset ?? null,
    binarySha256: a.build.binarySha256,
    identical: !!b && a.build.dataset === b.build.dataset && same('dataSha256') && same('sessions') && same('first') && same('last'),
    detail: { dataSha256: same('dataSha256'), sessions: same('sessions'), first: same('first'), last: same('last') }
  };
});
const binaries = [...new Set(rows.map((r) => r.binarySha256))];
const pass = rows.length === 38 && rows.every((r) => r.identical) && binaries.length === 1 && engineRuntime().maglev === 'disabled';

if (fs.existsSync(out)) throw new Error(`${path.relative(repoRoot, out)} exists: the identity check is sealed once`);
writeJson(out, {
  kind: 'gpu-phase9 D1 GPU dataset identity with GPU Phase 7',
  t: new Date().toISOString(),
  runtime: { ...engineRuntime(), requiredOptions: [ENGINE_FLAG] },
  binarySha256: binaries.length === 1 ? binaries[0] : binaries,
  compared: rows.length,
  identical: rows.filter((r) => r.identical).length,
  doors: [...new Set(rows.map((r) => r.door))].sort(),
  phase7Records: path.relative(repoRoot, theirs),
  rows,
  pass
});
fs.chmodSync(out, 0o444);
fs.appendFileSync(
  path.join(resultsDir, 'seals.jsonl'),
  `${JSON.stringify({ t: new Date().toISOString(), file: path.relative(repoRoot, out), sha256: createHash('sha256').update(fs.readFileSync(out)).digest('hex') })}\n`
);
console.log(`${rows.filter((r) => r.identical).length}/${rows.length} real-data runs: dataset identical to GPU Phase 7 — ${pass ? 'PASS' : 'FAIL'}`);
process.exitCode = pass ? 0 : 2;
