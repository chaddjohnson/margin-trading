// gpu-backend: the purpose gate of every LEGACY CPU research runner (standard 3.0.0 §9.8). Each npm script that starts
// a CPU optimizer or study runner goes through this wrapper:
//   node … src/gpu-backend/legacyRunner.ts <runner name> <module> [args…]
// It refuses to start unless an explicit NON-OFFICIAL purpose is declared (GPU_POLICY_PURPOSE=cpu-reference |
// diagnostic | parity-test | benchmark | strategy-lab), and refuses 'official-optimization': official optimization is
// GPU-only and runs only through the attested gate (src/gpu-backend/official.ts). Legacy runners remain available to
// reproduce frozen results and run diagnostics; they can never perform official optimization.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertNonOfficialCpuRun } from './purpose.ts';

const [, , name, target, ...rest] = process.argv;

if (!name || !target) {
  console.error('usage: legacyRunner.ts <runner name> <module> [args…]');
  process.exit(2);
}

try {
  const purpose = assertNonOfficialCpuRun(`the legacy CPU runner '${name}'`);

  console.error(`[GPU policy] ${name}: non-official CPU run (purpose ${purpose}); never official optimization evidence`);
} catch (e) {
  console.error(`❌ ${(e as Error).message}`);
  process.exit(3);
}

const file = path.resolve(path.resolve(import.meta.dirname, '../..'), target); // npm runs scripts from the repository root

process.argv = [process.argv[0]!, file, ...rest];
await import(pathToFileURL(file).href);
