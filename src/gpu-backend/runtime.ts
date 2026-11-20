// gpu-backend: the JAVASCRIPT ENGINE CONFIGURATION of every process that produces official results or parity evidence
// (GPU Phase 5; research/gpu-phase5/PARITY_ROOT_CAUSE.md).
//
// Node 24's V8 (13.6) runs hot code through three compilers: Sparkplug (baseline), Maglev (mid-tier) and TurboFan. With
// Maglev enabled, GPU Phase 5 reproduced a V8 defect in the UNCHANGED canonical code: two objects created by one object
// literal (`{ t, date, m, liq, r, lot }` in src/vg-l0-risk-metrics/metrics.ts portfolioPath) shared the storage of
// their number fields, so the first object silently took the numbers of the next one. It is timing-dependent (it
// follows when optimized code is installed, and is far more frequent on a loaded machine), it happens in freshly
// started processes and in warm ones, and it produced the CPU parity reference's wrong risk-envelope inputs with
// correct books, pooled replay and record. The same construct — object literals with number fields created in a loop —
// builds the canonical records (recordOf, riskInputsOf), on the CPU reference side AND in the GPU host path's worker
// threads. With `--no-maglev` the defect did not occur in the same experiments (the evidence and its limits are in the
// report above).
//
// Therefore the engine's JavaScript runs WITHOUT Maglev wherever a result matters:
//   - the official gate (official.ts) and the official runner (officialRunner.ts) refuse a process that was not started
//     with `--no-maglev` (V8 options are process-wide: the host pipeline's worker threads inherit them);
//   - the CPU parity-reference workers are forked with it (the acceptance study's harness);
//   - the acceptance campaign's tools run with it and record the engine configuration in their evidence.
// `--no-maglev` only removes one optimizing tier (Sparkplug and TurboFan remain); it changes no JavaScript semantics.
import { PolicyError } from './purpose.ts';

export const ENGINE_FLAG = '--no-maglev';

// the Node options a child process that evaluates must be started with (fork / spawn execArgv)
export const engineExecArgv = [ENGINE_FLAG] as const;

// Maglev is off iff the process's options contain `--no-maglev` and no other Maglev option (a later `--maglev`,
// `--stress-maglev`, `--maglev-future`, … would re-enable or alter it). `--jitless` is not accepted as a substitute: it
// is another configuration, with no evidence behind it.
export const maglevDisabled = (execArgv: readonly string[] = process.execArgv) =>
  execArgv.includes(ENGINE_FLAG) && execArgv.every((a) => a === ENGINE_FLAG || !/maglev/i.test(a));

export interface EngineRuntime {
  node: string;
  v8: string;
  maglev: 'disabled' | 'enabled';
  execArgv: string[];
}

export const engineRuntime = (): EngineRuntime => ({
  node: process.version,
  v8: process.versions.v8,
  maglev: maglevDisabled() ? 'disabled' : 'enabled',
  execArgv: [...process.execArgv]
});

export const runtimeProblem = (execArgv: readonly string[] = process.execArgv) =>
  maglevDisabled(execArgv)
    ? null
    : `this Node process was not started with ${ENGINE_FLAG} (its options: ${execArgv.join(' ') || 'none'}): V8's Maglev compiler can silently corrupt number fields of freshly created objects (research/gpu-phase5/PARITY_ROOT_CAUSE.md); start it as \`node ${ENGINE_FLAG} …\``;

// fail closed: `what` names the caller for the error (e.g. "official GPU session", "parity evidence")
export const requireEngineRuntime = (what: string) => {
  const p = runtimeProblem();

  if (p) throw new PolicyError('runtime-maglev', `${what}: ${p}`);
};
