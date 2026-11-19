// gpu-backend: the EXECUTION PURPOSE of a run (standard 3.0.0 §9.1, §9.8). Official optimization — any historical
// strategy evaluation that affects a search, promotion, refinement, robustness/perturbation test, qualification or an
// optimization's validation — is GPU-only, attested and fail-closed (src/gpu-backend/official.ts). Every other purpose is
// explicitly NON-OFFICIAL and may evaluate on the CPU: Strategy Lab, deterministic diagnostics, controlled benchmark
// baselines, CPU reproduction of frozen results, and CPU/GPU parity testing. The purpose is declared explicitly (an
// argument or the GPU_POLICY_PURPOSE environment variable), never inferred from a default; an unknown or missing purpose
// is refused wherever an optimizer could search.
export const PURPOSES = [
  'official-optimization',
  'parity-test',
  'cpu-reference',
  'diagnostic',
  'benchmark',
  'strategy-lab'
] as const;
export type ExecutionPurpose = (typeof PURPOSES)[number];
export const NON_OFFICIAL: readonly ExecutionPurpose[] = [
  'parity-test',
  'cpu-reference',
  'diagnostic',
  'benchmark',
  'strategy-lab'
];
export const PURPOSE_ENV = 'GPU_POLICY_PURPOSE';

export class PolicyError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(`GPU policy (standard 3.0.0 §9): ${code}: ${message}`);
  }
}

export const isPurpose = (x: unknown): x is ExecutionPurpose =>
  typeof x === 'string' && (PURPOSES as readonly string[]).includes(x);

// The declared purpose: the explicit argument wins, then the environment; nothing is a default.
export const declaredPurpose = (
  explicit?: string | null,
  env: NodeJS.ProcessEnv = process.env
): ExecutionPurpose | null => {
  const x = explicit ?? env[PURPOSE_ENV] ?? null;

  if (x === null || x === '') return null;
  if (!isPurpose(x))
    throw new PolicyError('unknown-purpose', `"${x}" is not an execution purpose (${PURPOSES.join(', ')})`);
  return x;
};

// A CPU research runner (every legacy study runner, Strategy Lab, diagnostics) may run only under an explicit
// non-official purpose. It refuses an official purpose (official optimization is GPU-only) and a missing one.
export const assertNonOfficialCpuRun = (
  runner: string,
  explicit?: string | null,
  env: NodeJS.ProcessEnv = process.env
): ExecutionPurpose => {
  const p = declaredPurpose(explicit, env);

  if (p === null)
    throw new PolicyError(
      'purpose-required',
      `${runner} evaluates strategies on the CPU. Official optimization is GPU-only (no CPU fallback); this runner may only ` +
        `reproduce frozen results or run diagnostics. Declare an explicit non-official purpose, e.g. ${PURPOSE_ENV}=cpu-reference ` +
        `(${NON_OFFICIAL.join(', ')}).`
    );
  if (p === 'official-optimization')
    throw new PolicyError(
      'cpu-official-refused',
      `${runner} is a CPU evaluator: official optimization must use the attested GPU path (src/gpu-backend/official.ts); CPU substitution is prohibited.`
    );
  return p;
};
