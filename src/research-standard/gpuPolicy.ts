// The preflight's GPU rules (docs/research/OPTIMIZATION_STANDARD.md §9, from 3.0.0). A study pinned to 3.0.0 or later
// with scope optimization or continuation must declare the GPU-required evaluation backend, and its declaration is
// valid only while an ACCEPTED GPU evaluator matches the working tree (config/gpu-backend/acceptance.json, checked
// statically: record, status, source digests, evidence files). A new optimization or continuation manifest adopted on or
// after 3.0.0's effective date may not pin an earlier version (the GPU rule cannot be evaded by pinning an old
// standard). A diagnostic may declare a non-official CPU backend; it is never official optimization evidence. The live
// checks (device, binary, smoke kernel, parity mini-set, capability coverage) run when the official run opens the gate
// in code (src/gpu-backend/official.ts openOfficialGpuSession).
import { checkAcceptance } from '../gpu-backend/acceptance.ts';
import { NON_OFFICIAL, isPurpose } from '../gpu-backend/purpose.ts';

export const gpuRequiredSince = '3.0.0';

export interface EvaluationBackend {
  policy: 'gpu-required' | 'non-official-cpu';
  purpose: string; // official-optimization | parity-test | cpu-reference | diagnostic | benchmark | strategy-lab
  acceptance?: string; // config/gpu-backend/acceptance.json (gpu-required)
  justification?: string; // non-official-cpu: why no official evaluation happens
}

const cmp = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);

  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
  return 0;
};

export const checkGpuPolicy = (
  a: { scope: string; adoptedAt?: string; evaluationBackend?: EvaluationBackend },
  pinnedVersion: string | null,
  registry: { versions: { version: string; effective: string }[] } | null,
  o: { acceptanceFile?: string } = {}
) => {
  const errors: string[] = [];
  const notices: string[] = [];
  const v3 = registry?.versions.find((x) => x.version === gpuRequiredSince);
  const official = a.scope === 'optimization' || a.scope === 'continuation';

  // no evasion by pinning an earlier standard once §9 is in force
  if (official && v3 && pinnedVersion && cmp(pinnedVersion, gpuRequiredSince) < 0 && typeof a.adoptedAt === 'string' && a.adoptedAt.slice(0, 10) >= v3.effective)
    errors.push(
      `a ${a.scope} adopted on ${a.adoptedAt.slice(0, 10)} pins standard ${pinnedVersion}: from ${v3.effective} new optimization ` +
        `and continuation manifests adopt ${gpuRequiredSince} or later, whose §9 makes official optimization GPU-only`
    );

  if (!pinnedVersion || cmp(pinnedVersion, gpuRequiredSince) < 0) return { errors, notices };

  const b = a.evaluationBackend;

  if (official) {
    if (!b || b.policy !== 'gpu-required' || b.purpose !== 'official-optimization')
      errors.push(
        `evaluationBackend must be { policy: "gpu-required", purpose: "official-optimization", acceptance: "config/gpu-backend/acceptance.json" } ` +
          `(standard ${pinnedVersion} §9: official optimization evaluates every historical candidate on the attested GPU; no CPU fallback)`
      );
    const acc = checkAcceptance({ file: o.acceptanceFile });

    if (!acc.ok) errors.push(`official GPU optimization is BLOCKED (§9.9): ${acc.reasons.join('; ')}`);
    else notices.push(`GPU acceptance ${acc.status}: ${acc.record!.binary.sha256.slice(0, 12)}… on ${acc.record!.device.uuid}; the run must still pass the live gate (openOfficialGpuSession)`);
  } else if (b) {
    if (b.policy === 'gpu-required' && b.purpose !== 'official-optimization') errors.push('a gpu-required backend declares purpose official-optimization');
    if (b.policy === 'non-official-cpu') {
      if (!isPurpose(b.purpose) || !(NON_OFFICIAL as readonly string[]).includes(b.purpose))
        errors.push(`a non-official CPU backend declares a non-official purpose (${NON_OFFICIAL.join(', ')})`);
      if (!b.justification || !b.justification.trim()) errors.push('a non-official CPU backend needs its justification');
      notices.push(`non-official CPU evaluation (${b.purpose}): never official optimization evidence (§9.8)`);
    }
  } else notices.push(`a ${a.scope} under ${pinnedVersion} without evaluationBackend: it must not search or score candidates officially (§9)`);

  return { errors, notices };
};
