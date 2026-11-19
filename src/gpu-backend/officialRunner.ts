// gpu-backend: the purpose gate of an OFFICIAL GPU runner's npm script (standard 3.0.0 §9.3, §9.10) — the counterpart of
// legacyRunner.ts. An official study's npm script starts its runner through this wrapper:
//   node … src/gpu-backend/officialRunner.ts <research/<study>> <module> [args…]
// It refuses (exit 3, before importing the runner) unless:
//   1. the run declares GPU_POLICY_PURPOSE=official-optimization (explicit; never a default);
//   2. the study's adoption manifest passes the research preflight — which, for an optimization or continuation adopting
//      3.0.0 or later, requires evaluationBackend gpu-required and an ACCEPTED acceptance record matching the tree;
//   3. the runner module imports the official gate (src/gpu-backend/official.ts) — the only way it may evaluate.
// The wrapper does not replace the gate: the runner itself opens openOfficialGpuSession, which performs the live checks
// (server, device, binary, capabilities, smoke kernel, memory, host path, parity mini-set) and writes the attestation.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { PolicyError, declaredPurpose } from './purpose.ts';
import { officialGate } from './entrypoints.ts';

const [, , study, target, ...rest] = process.argv;
const repoRoot = path.resolve(import.meta.dirname, '../..');

if (!study || !target) {
  console.error('usage: officialRunner.ts <research/<study>> <module> [args…]');
  process.exit(2);
}

const file = path.resolve(repoRoot, target);

try {
  const purpose = declaredPurpose();

  if (purpose !== 'official-optimization')
    throw new PolicyError(
      'official-purpose-required',
      `an official GPU runner starts only with GPU_POLICY_PURPOSE=official-optimization (declared: ${purpose ?? 'none'}); non-official work uses a non-official runner`
    );
  const r = requireStandardAdoption(path.resolve(repoRoot, study), { repoRoot });

  if (r.scope !== 'optimization' && r.scope !== 'continuation')
    throw new PolicyError('official-scope', `${study} has scope ${r.scope}: only an optimization or continuation runs officially`);
  if (!fs.existsSync(file) || !officialGate.test(fs.readFileSync(file, 'utf8')))
    throw new PolicyError(
      'official-gate-missing',
      `${target} does not import the official gate (src/gpu-backend/official.ts): an official runner evaluates only through openOfficialGpuSession`
    );
  console.error(`[GPU policy] official GPU run of ${study} (${target}); the runner must open the official gate`);
} catch (e) {
  console.error(`❌ ${(e as Error).message}`);
  process.exit(3);
}

process.argv = [process.argv[0]!, file, ...rest];
await import(pathToFileURL(file).href);
