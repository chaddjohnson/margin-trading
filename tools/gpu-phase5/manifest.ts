// gpu-phase5 (adapted from tools/gpu-phase3/manifest.ts): writes research/gpu-phase5/MANIFEST.json — the study's identity and inventory: branch and source commit,
// device / driver / toolchain / runtime identity, the final binary and its compatibility manifest (every CPU, CUDA and
// host source with its sha256), the data identity of every door opened (from results/doors.jsonl), the deliverables and
// every machine-readable evidence file with sha256 and size. Large raw archives (results/raw-large/), caches, builds
// and market data are listed by reference only, never included.
//   node --experimental-transform-types tools/gpu-phase5/manifest.ts
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { compatManifest, policySources } from '../../src/gpu-backend/compat.ts';
import { computeSanitizer, nvcc, repoRoot } from '../../src/gpu-backend/toolchain.ts';

const study = path.join(repoRoot, 'research/gpu-phase5');
const rel = (f: string) => path.relative(repoRoot, f);
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const sh = (cmd: string, args: string[]) => {
  try {
    return execFileSync(cmd, args, { cwd: repoRoot }).toString().trim();
  } catch (e) {
    return `unavailable: ${(e as Error).message.split('\n')[0]}`;
  }
};
const walk = (d: string): string[] =>
  fs.existsSync(d)
    ? fs
        .readdirSync(d, { withFileTypes: true })
        .flatMap((e) =>
          e.isDirectory()
            ? ['raw-large', 'logs', 'ledger'].includes(e.name)
              ? []
              : walk(path.join(d, e.name))
            : [path.join(d, e.name)]
        )
    : [];
const deliverables = [
  'GPU_FINAL_HANDOFF.md',
  'PARITY_ROOT_CAUSE.md',
  'ATOMIC_CACHE_AND_CONCURRENCY.md',
  'PERFORMANCE_AUDIT.md',
  'GPU_ACCEPTANCE_REPORT.md',
  'MERGE_AND_RESTORE.md',
  'PILOT_HANDOFF_ONLY.md',
  'PROTOCOL.md',
  'AMENDMENTS.md',
  'STANDARD_ADOPTION.json',
  'RUN_COMMANDS.md',
  'RESEARCH_RECOVERY.md',
  'brief/BRIEF.md'
].map((f) => path.join(study, f));
const doors = new Map<string, unknown>();

for (const l of fs.readFileSync(path.join(study, 'results/doors.jsonl'), 'utf8').trim().split('\n')) {
  const r = JSON.parse(l) as { door: string; sha256?: unknown; sessions?: number; first?: string; last?: string };

  doors.set(r.door, { sha256: r.sha256, sessions: r.sessions, first: r.first, last: r.last });
}
const m = compatManifest();
const smi = sh('nvidia-smi', [
  '--query-gpu=name,uuid,driver_version,memory.total,compute_cap,vbios_version',
  '--format=csv,noheader'
]).split(', ');
const rec = {
  kind: 'gpu-phase5 MANIFEST',
  generated: new Date().toISOString(),
  study: 'research/gpu-phase5',
  git: {
    branch: sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    sourceCommit: sh('git', ['rev-parse', 'HEAD']),
    base: '3a52cc635c95f74fc6cf3c22aa30bf4507293fa3',
    note: 'sourceCommit is HEAD when this manifest was generated; the manifest itself is committed after it'
  },
  host: {
    hostname: os.hostname(),
    kernel: os.release(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model,
    memGiB: Math.round(os.totalmem() / 2 ** 30),
    node: process.version
  },
  device: { name: smi[0], uuid: smi[1], driver: smi[2], memory: smi[3], computeCapability: smi[4], vbios: smi[5] },
  toolchain: {
    nvcc: sh(nvcc, ['--version']).split('\n').at(-1),
    computeSanitizer: sh(computeSanitizer, ['--version']).split('\n')[1] ?? '',
    flags: m.nvccFlags,
    installManifest:
      '/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit/INSTALL_MANIFEST.json (not bundled: toolchain)'
  },
  finalBinary: JSON.parse(fs.readFileSync(path.join(study, 'results/final-binary.json'), 'utf8')).binary,
  compat: {
    digest: m.digest,
    protocolVersion: m.protocolVersion,
    datasetVersion: m.datasetVersion,
    cpu: m.cpu,
    cuda: m.cuda,
    host: m.host
  },
  policy: policySources(['tools/gpu-phase5/accept.ts']),
  acceptance: fs.existsSync(path.join(repoRoot, 'config/gpu-backend/acceptance.json'))
    ? {
        path: 'config/gpu-backend/acceptance.json',
        sha256: sha(path.join(repoRoot, 'config/gpu-backend/acceptance.json')),
        status: JSON.parse(fs.readFileSync(path.join(repoRoot, 'config/gpu-backend/acceptance.json'), 'utf8')).status
      }
    : null,
  data: {
    note: 'market data are local and git-ignored (data/<SYMBOL>/); identity by sha256 of the bytes each door read',
    doors: Object.fromEntries(doors)
  },
  deliverables: deliverables
    .filter((f) => fs.existsSync(f))
    .map((f) => ({ path: rel(f), sha256: sha(f), bytes: fs.statSync(f).size })),
  evidence: walk(path.join(study, 'results'))
    .sort()
    .map((f) => ({ path: rel(f), sha256: sha(f), bytes: fs.statSync(f).size })),
  policy: [
    'CLAUDE.md',
    'CONTRIBUTING.md',
    '.github/pull_request_template.md',
    'docs/research/OPTIMIZATION_STANDARD.md',
    'docs/research/optimization-standard.versions.json',
    'docs/research/STUDY_PROTOCOL_TEMPLATE.md',
    'docs/research/templates/STANDARD_ADOPTION.template.json',
    'docs/gpu/README.md',
    'docs/gpu/PARITY_CHECKLIST.md',
    'docs/gpu/FEATURE_MATRIX.md',
    'config/gpu-backend/entrypoints.json',
    'config/gpu-backend/acceptance.json'
  ]
    .map((f) => path.join(repoRoot, f))
    .filter((f) => fs.existsSync(f))
    .map((f) => ({ path: rel(f), sha256: sha(f) })),
  sources: {
    gpuBackend: walk(path.join(repoRoot, 'src/gpu-backend'))
      .sort()
      .map((f) => ({ path: rel(f), sha256: sha(f) })),
    study: walk(path.join(repoRoot, 'src/gpu-phase5'))
      .sort()
      .map((f) => ({ path: rel(f), sha256: sha(f) })),
    tools: [...walk(path.join(repoRoot, 'tools/gpu-backend')), ...walk(path.join(repoRoot, 'tools/gpu-phase5'))]
      .sort()
      .map((f) => ({ path: rel(f), sha256: sha(f) })),
    preflight: [
      'src/research-standard/gpuPolicy.ts',
      'src/research-standard/preflight.ts',
      'src/research-standard/main.ts'
    ].map((f) => ({ path: f, sha256: sha(path.join(repoRoot, f)) }))
  },
  excluded: [
    'research/gpu-phase5/results/raw-large/ (archive dumps; digests committed)',
    'research/gpu-phase5/results/logs/ (git-ignored; copies in results/runlogs/)',
    'research/gpu-phase5/cache/ (datasets, job archives)',
    'research/gpu-phase5/build/ (binaries; reproducible from source)',
    'data/ (market data)',
    'the CUDA toolkit'
  ]
};

fs.writeFileSync(path.join(study, 'MANIFEST.json'), `${JSON.stringify(rec, null, 1)}\n`);
console.log(
  `MANIFEST.json: ${rec.deliverables.length} deliverables, ${rec.evidence.length} evidence files, ${rec.compat.cpu.files.length} CPU sources`
);
