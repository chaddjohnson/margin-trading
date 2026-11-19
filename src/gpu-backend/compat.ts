// gpu-backend: the COMPATIBILITY MANIFEST — what a GPU evaluator build was verified against.
//
//   cpu   the TypeScript sources the CUDA port mirrors: the import closure of the canonical evaluation path (the
//         optimizer workers' evaluate / evaluateDetail, the risk-envelope reference, the door loader and the
//         session clock). ANY change to one of them is an "evaluation dependency" change (standard 3.0.0 §9): the
//         acceptance record stops matching and official GPU optimization is refused until the CUDA port is updated
//         and the parity suite re-passes.
//   cuda  the CUDA sources (src/gpu-backend/cuda/), compiled with the fixed flags below
//   host  the GPU path's TypeScript (encoding, dataset export, client, layout, policy)
// The combined digest is compiled into the server binary (GB_COMPAT_DIGEST) and reported by INFO, so a binary always
// names the sources it was built from; the acceptance record (config/gpu-backend/acceptance.json) binds the digest to
// the binary's sha256, the compiler, the device and the parity evidence. A source digest is necessary, not sufficient:
// semantic parity is proven only by the runtime comparison suites (standard 3.0.0 §9.6).
//
//   node --experimental-transform-types src/gpu-backend/compat.ts [--digest | --manifest | --check]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importClosure } from '../vg-l0-full-joint/records.ts';
import { DATASET_VERSION, PROTOCOL_VERSION } from './layout.ts';
import { nvccFlags, repoRoot } from './toolchain.ts';

export const MANIFEST_VERSION = 1;
export const NVCC_VERSION = '13.2.86';

// the canonical evaluation entry points whose import closure the CUDA port mirrors
export const cpuEntries = [
  'src/vg-l0-risk-families/evaluate.ts', // evaluate / evaluateDetail (RC 2 books, Priority 3's Growth books, pool, records)
  'src/vg-l0-risk-metrics/engine.ts', // the risk-envelope reference (toLedger)
  'src/vg-l0-risk-metrics/metrics.ts', // banked-capital drawdown, trade principal loss
  'src/vg-d1-growth-joint/data.ts', // the door loader (the exact arrays the GPU reads)
  'src/lib/session.ts' // newYorkOffset (the drawdown gate's wall clock)
];

const sha = (file: string) => createHash('sha256').update(fs.readFileSync(path.join(repoRoot, file))).digest('hex');
const digestOf = (files: { path: string; sha256: string }[]) =>
  createHash('sha256').update(files.map((f) => `${f.path}:${f.sha256}`).join('\n')).digest('hex');
const group = (files: string[]) => {
  const list = [...new Set(files)].sort().map((p) => ({ path: p, sha256: sha(p) }));

  return { files: list, digest: digestOf(list) };
};

export const cpuMirrored = () =>
  group(importClosure(cpuEntries.map((f) => path.join(repoRoot, f))).filter((f) => !f.startsWith('src/gpu-backend/')));
export const cudaSources = () =>
  group(fs.readdirSync(path.join(repoRoot, 'src/gpu-backend/cuda')).filter((f) => /\.(cu|cuh|h)$/.test(f)).map((f) => `src/gpu-backend/cuda/${f}`));
export const hostSources = () =>
  group(['client.ts', 'encode.ts', 'dataset.ts', 'layout.ts', 'canon.ts', 'compat.ts', 'toolchain.ts', 'pool.ts'].map((f) => `src/gpu-backend/${f}`));

export interface CompatManifest {
  kind: 'gpu-backend compatibility manifest';
  version: number;
  protocolVersion: number;
  datasetVersion: number;
  nvcc: string;
  nvccFlags: string[];
  cpu: ReturnType<typeof group>;
  cuda: ReturnType<typeof group>;
  host: ReturnType<typeof group>;
  digest: string; // the combined digest compiled into the binary
}

export const compatManifest = (): CompatManifest => {
  const cpu = cpuMirrored();
  const cuda = cudaSources();
  const host = hostSources();
  const digest = createHash('sha256')
    .update(JSON.stringify({ v: MANIFEST_VERSION, p: PROTOCOL_VERSION, d: DATASET_VERSION, nvcc: NVCC_VERSION, flags: nvccFlags, cpu: cpu.digest, cuda: cuda.digest, host: host.digest }))
    .digest('hex');

  return {
    kind: 'gpu-backend compatibility manifest',
    version: MANIFEST_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    datasetVersion: DATASET_VERSION,
    nvcc: NVCC_VERSION,
    nvccFlags,
    cpu,
    cuda,
    host,
    digest
  };
};

// the files of a manifest that differ from the working tree (empty = compatible)
export const staleFiles = (m: Pick<CompatManifest, 'cpu' | 'cuda' | 'host'>) => {
  const out: string[] = [];

  for (const g of [m.cpu, m.cuda, m.host])
    for (const f of g.files) {
      const full = path.join(repoRoot, f.path);

      if (!fs.existsSync(full)) out.push(`${f.path} (missing)`);
      else if (sha(f.path) !== f.sha256) out.push(f.path);
    }
  return out;
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const m = compatManifest();
  const a = process.argv[2];

  if (a === '--digest') console.log(m.digest);
  else if (a === '--manifest') console.log(JSON.stringify(m, null, 1));
  else console.log(JSON.stringify({ digest: m.digest, cpuFiles: m.cpu.files.length, cpu: m.cpu.digest, cuda: m.cuda.digest, host: m.host.digest }));
}
