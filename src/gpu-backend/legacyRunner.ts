// gpu-backend: the purpose gate of every LEGACY CPU research runner (standard 3.0.0 §9.8). Each npm script that starts
// a CPU optimizer or study runner goes through this wrapper:
//   node … src/gpu-backend/legacyRunner.ts <runner name> <module> [args…]
// It refuses to start unless an explicit NON-OFFICIAL purpose is declared (GPU_POLICY_PURPOSE=cpu-reference |
// diagnostic | parity-test | benchmark | strategy-lab), and refuses 'official-optimization': official optimization is
// GPU-only and runs only through the attested gate (src/gpu-backend/official.ts). Legacy runners remain available to
// reproduce frozen results and run diagnostics; they can never perform official optimization.
//
// The engine runtime (GPU Phase 6, research/gpu-phase6/): the runner's numbers come from the canonical CPU engine, which
// V8's Maglev compiler can silently corrupt (research/gpu-phase5/PARITY_ROOT_CAUSE.md). So the gate also refuses a
// process that was not started as `node --no-maglev …` (runtime.ts; every npm research script passes it), and installs
// the child-process guard before the runner is imported: the frozen runners fork their evaluation workers with an
// explicit execArgv, and the guard adds the flag to those children (and to any spawn of this Node binary) without
// editing the frozen code. Worker threads share the process's V8 options. Nothing of the runner itself changes.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertNonOfficialCpuRun } from './purpose.ts';
import { ENGINE_FLAG, installChildEngineGuard, requireEngineRuntime } from './runtime.ts';

const [, , name, target, ...rest] = process.argv;

if (!name || !target) {
  console.error('usage: legacyRunner.ts <runner name> <module> [args…]');
  process.exit(2);
}

try {
  const purpose = assertNonOfficialCpuRun(`the legacy CPU runner '${name}'`);

  requireEngineRuntime(`the legacy CPU runner '${name}'`);
  installChildEngineGuard();
  console.error(
    `[GPU policy] ${name}: non-official CPU run (purpose ${purpose}, engine ${ENGINE_FLAG}); never official optimization evidence`
  );
} catch (e) {
  console.error(`❌ ${(e as Error).message}`);
  process.exit(3);
}

const file = path.resolve(path.resolve(import.meta.dirname, '../..'), target); // npm runs scripts from the repository root

process.argv = [process.argv[0]!, file, ...rest];
await import(pathToFileURL(file).href);
