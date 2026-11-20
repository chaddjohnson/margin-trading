// gpu-backend: the ENTRYPOINT AUDIT (standard 3.0.0 §9.8, §9.10). Every directory of src/ that contains CPU search
// machinery (NSGA-II / Sobol / a worker pool / a fork of evaluation workers / a search Lane) is classified:
//   legacy        a completed study's frozen CPU runner (its .ts files' digest is registered; any edit fails the test:
//                 legacy runners only reproduce frozen results, behind the npm purpose gate);
//   library       shared search algorithms with no evaluation of their own (src/optimizer);
//   non-official  an engineering study whose CPU evaluations are parity references only (declared with justification);
//   official      the GPU backend itself (src/gpu-backend), or a NEW optimizer that imports the official gate
//                 (src/gpu-backend/official.ts) — the only way a new directory may contain search machinery.
// config/gpu-backend/entrypoints.json is the registry; `node src/gpu-backend/entrypoints.ts --write` regenerates it
// (a reviewed change), src/gpu-backend/tests/policy.test.ts enforces it in `npm test`.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './toolchain.ts';

export const registryFile = path.join(repoRoot, 'config', 'gpu-backend', 'entrypoints.json');
export const searchMarkers = /optimizer\/nsga2\.ts|optimizer\/sobol\.ts|class Pool\b|fork\(|\/search\.ts'|new Lane\(/;
export const officialGate = /gpu-backend\/official\.ts/;
export const library = ['optimizer'];
export const nonOfficial: Record<string, string> = {
  'gpu-phase1': 'GPU Phase 1 feasibility (completed): CPU baselines and parity references only; never searched',
  'gpu-phase2':
    'GPU Phase 2 acceptance study: CPU parity references and the non-official CPU arm of the parity-only mini-optimization',
  'gpu-phase3':
    'GPU Phase 3 acceptance study (host-pipeline acceleration): CPU parity references, the CPU benchmark baseline and the non-official CPU arm of the parity-only mini-optimization',
  'gpu-phase4':
    'GPU Phase 4 acceptance study (concurrency and batching benchmarks): CPU parity references and the non-official CPU arm of the parity-only mini-optimization',
  'gpu-phase5':
    'GPU Phase 5 acceptance study (parity root cause, atomic dataset export, performance audit): CPU parity references, root-cause diagnostics and the non-official CPU arm of the parity-only mini-optimization'
};

const tsFiles = (dir: string) =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(
      (e) =>
        e.isFile() &&
        e.name.endsWith('.ts') &&
        !e.name.endsWith('.test.ts') &&
        !path.join(e.parentPath, e.name).includes('/tests/')
    )
    .map((e) => path.join(e.parentPath, e.name))
    .sort();

export const dirDigest = (dir: string) =>
  createHash('sha256')
    .update(
      tsFiles(dir)
        .map((f) => `${path.relative(repoRoot, f)}:${createHash('sha256').update(fs.readFileSync(f)).digest('hex')}`)
        .join('\n')
    )
    .digest('hex');

export const scan = () =>
  fs
    .readdirSync(path.join(repoRoot, 'src'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const dir = path.join(repoRoot, 'src', e.name);
      const files = tsFiles(dir);
      const search = files.some((f) => searchMarkers.test(fs.readFileSync(f, 'utf8')));
      const usesGate = files.some((f) => officialGate.test(fs.readFileSync(f, 'utf8')));

      return { name: e.name, search, usesGate };
    })
    .filter((x) => x.search);

export interface Registry {
  kind: 'gpu-backend entrypoint registry';
  generated: string;
  legacy: Record<string, string>; // dir → digest at registration
  library: string[];
  nonOfficial: Record<string, string>;
}

// Classification problems of the working tree against the registry (empty = compliant).
export const audit = (r: Registry) => {
  const problems: string[] = [];

  for (const d of scan()) {
    if (d.name === 'gpu-backend' || r.library.includes(d.name) || d.name in r.nonOfficial) continue;
    const reg = r.legacy[d.name];

    if (reg) {
      const now = dirDigest(path.join(repoRoot, 'src', d.name));

      if (now !== reg)
        problems.push(
          `src/${d.name} is a frozen legacy CPU runner and changed since registration (digest ${now.slice(0, 12)} ≠ ${reg.slice(0, 12)}): legacy runners only reproduce frozen results; a new optimizer belongs in a new directory behind src/gpu-backend/official.ts`
        );
    } else if (!d.usesGate)
      problems.push(
        `src/${d.name} contains search machinery but neither uses the official GPU gate (src/gpu-backend/official.ts) nor is registered: official optimization is GPU-only (standard 3.0.0 §9); declare it non-official in config/gpu-backend/entrypoints.json with a justification, or route its evaluations through the gate`
      );
  }
  for (const name of Object.keys(r.legacy))
    if (!fs.existsSync(path.join(repoRoot, 'src', name)))
      problems.push(`registered legacy runner src/${name} is missing`);
  return problems;
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  if (process.argv[2] === '--write') {
    const legacy: Record<string, string> = {};

    for (const d of scan())
      if (d.name !== 'gpu-backend' && !library.includes(d.name) && !(d.name in nonOfficial) && !d.usesGate)
        legacy[d.name] = dirDigest(path.join(repoRoot, 'src', d.name));
    const r: Registry = {
      kind: 'gpu-backend entrypoint registry',
      generated: new Date().toISOString(),
      legacy,
      library,
      nonOfficial
    };

    fs.mkdirSync(path.dirname(registryFile), { recursive: true });
    fs.writeFileSync(registryFile, `${JSON.stringify(r, null, 1)}\n`);
    console.log(
      `legacy ${Object.keys(legacy).length}, library ${library.length}, non-official ${Object.keys(nonOfficial).length}`
    );
  } else console.log(JSON.stringify(audit(JSON.parse(fs.readFileSync(registryFile, 'utf8')) as Registry), null, 1));
}
