# GPU Phase 2 — policy and enforcement

What changed in the repository's rules, how the rules are enforced in code, how the enforcement was tested, and what
remains a limitation. Normative text: [OPTIMIZATION_STANDARD.md](../../docs/research/OPTIMIZATION_STANDARD.md) §9
(standard **3.0.0**). Procedure: [docs/gpu/PARITY_CHECKLIST.md](../../docs/gpu/PARITY_CHECKLIST.md).

## 1. Policy text

### 1.1 Root `CLAUDE.md` (read by every Claude Code session)

A new first section, **"GPU-only official optimization and CPU/GPU parity (MANDATORY — standard 3.0.0 §9)"**:

> Every historical strategy evaluation that affects an official optimization — fitness, qualification, promotion,
> refinement, robustness/perturbation tests, optimization validation — MUST run on the attested NVIDIA GPU evaluator.
> **There is no CPU fallback, ever**: no GPU, an unsupported reachable feature, a stale build or source digest, a failed
> smoke kernel or parity mini-set, lost device/server, bad receipts or exhausted VRAM stop the run (checkpointed) with an
> explicit error. Every change to D1, Growth, the allocator, entries/exits/risk controls, fills, costs/interest or any
> evaluation dependency needs its CUDA counterpart and fresh Apollo parity evidence BEFORE it is merged or used for
> official research. The TypeScript/CPU engine stays the authoritative reference and Strategy Lab's evaluator.

followed by the links (standard §9, checklist, feature matrix, operations guide), the single official path
(`openOfficialGpuSession` → `GpuPool` → `EvalLab`), the activation rule (blocked until `config/gpu-backend/
acceptance.json` is ACCEPTED), the non-official purposes for CPU runs, and the merge gate (a CPU-only CI pass is never
parity).

### 1.2 Optimization standard 3.0.0 (major version)

| Item | Change |
|---|---|
| Version mechanism | **3.0.0, major** (§7.4: mandatory rules added), effective 2026-11-19; registry `docs/research/optimization-standard.versions.json` with the new sha256; change-log entry (§8) with rationale, evidence and implications |
| §9 [M] (new) | 9.1 official evaluation defined, execution purposes; 9.2 GPU only, no CPU fallback / `auto` / hybrid, fail closed (list of conditions), GPU-only capacity retries; 9.3 the single official gate and its live checks, attestation, re-gate on resume; 9.4 capability coverage of the whole reachable domain, no silent genome reduction; 9.5 receipts, conservation (CPU-scored = 0), archive provenance; 9.6 permanent bit-identical parity for every evaluation-dependency change, TS authoritative, CUDA C++ accelerator, no Python/shared source, differences only as user-approved departures; 9.7 stale-port protection (compatibility manifest); 9.8 non-official CPU evaluation; 9.9 activation by the acceptance record; 9.10 merge gate + Apollo GPU verification step + entrypoint audit; 9.11 `evaluationBackend` in the adoption manifest, no evasion by pinning an older standard; 9.12 enforcement limits |
| Pointers | §0.1 (scope), §6.5 (resource contract: GPU batch, VRAM, timeout), §7.2 (manifest field), §7.6 (enforcement) |
| Templates | `STUDY_PROTOCOL_TEMPLATE.md` (§0 evaluation-backend row; §12 GPU gates; §13 GPU resources); `templates/STANDARD_ADOPTION.template.json` (`evaluationBackend`) |
| Contribution | `.github/pull_request_template.md` (evaluation-dependency checklist, Apollo verification, no-fallback items); `CONTRIBUTING.md` |
| Engineering docs | `docs/gpu/README.md` (operations), `docs/gpu/PARITY_CHECKLIST.md` (change procedure, merge gate), `docs/gpu/FEATURE_MATRIX.md` (the single maintained matrix) |

### 1.3 Adoption status

- The registry's current version is **3.0.0**. `npm run research-preflight -- --all`: all 19 studies PASS; every
  completed study keeps its pin (1.0.0 … 2.2.0) with a notice — nothing was re-hashed or rerun.
- This study keeps its pinned **2.2.0** (scope `diagnostic`; it searches nothing); its checkpoint records "retained
  pinned standard 2.2.0".
- From 2026-11-19 a new optimization or continuation manifest must adopt 3.0.0 or later (the preflight refuses an
  older pin) and declare `evaluationBackend: gpu-required / official-optimization`, which the preflight refuses until
  the acceptance record is ACCEPTED and matches the tree.

## 2. Enforcement in code (fail closed)

| Mechanism | Where | What it does |
|---|---|---|
| Execution purposes | `src/gpu-backend/purpose.ts` | `GPU_POLICY_PURPOSE` must be declared; unknown values are refused; CPU evaluators refuse `official-optimization` (`cpu-official-refused`) |
| Legacy CPU runner gate | `src/gpu-backend/legacyRunner.ts`; `package.json` | every research/optimizer npm script (51) starts through the gate, which refuses before importing the runner (exit 3) without a non-official purpose |
| Entrypoint registry and audit | `src/gpu-backend/entrypoints.ts`; `config/gpu-backend/entrypoints.json` | every `src/` directory with search machinery is a registered legacy runner (41), a library (`optimizer`) or a non-official study (gpu-phase1, gpu-phase2); a new one fails `npm test` |
| Compatibility manifest | `src/gpu-backend/compat.ts` | sha256 of the 94-file CPU import closure, the CUDA sources and the host path, compiled into the server binary |
| Acceptance record | `src/gpu-backend/acceptance.ts`; `config/gpu-backend/acceptance.json` | written only by `tools/gpu-phase2/accept.ts` after every gate passed; pins the compat manifest, binary sha256, device, capabilities, domain and every evidence file's sha256; MISSING / INVALID / NOT_ACCEPTED / STALE all block |
| Reachable-domain capabilities | `src/gpu-backend/domain.ts` | derives the domain's features by encoding all 8,640 Growth structures and 14 D1 book structures under every stage's options (35 features); never declared by hand |
| The official gate | `src/gpu-backend/official.ts` `openOfficialGpuSession` | 1 purpose → 2 acceptance → 3 binary, server start, compat digest, device UUID vs `nvidia-smi`, no test hooks, accepted device → 4 capabilities ⊆ server's supported set → 5 smoke kernel verified by the CPU → 6 VRAM for the planned batch + 1 GiB → 7 parity mini-set (references + seeded genomes) vs the canonical CPU engine on the study's door → attestation file. Any failure throws `PolicyError` before a single search evaluation |
| Live preflight CLI | `tools/gpu-backend/official-preflight.ts` | opens the same gate without searching (exit 0 open, 3 refused) |
| Attested pool | `src/gpu-backend/pool.ts` `GpuPool` | per batch: request nonce, device UUID, device-side execution counters (atomics), FNV-1a-64 output checksum computed on the device, verified by the client; receipt ledger; telemetry every 30 s; conservation (submitted = returned + failed + in flight + queued; CPU-scored = 0) checked per batch — a violation withholds the batch and fails every caller; per-task capability re-check against the attested domain; capacity overflows retried ON THE GPU; batch timeout (20 min) |
| Server safeguards | `src/gpu-backend/cuda/gb_server.cu` | request validation, VRAM budget, kernel watchdog (300 s per batch → error + exit), device loop guards (`C_G_LOOP`), receipt self-check; test hooks only with `--allow-fault-injection` (the gate refuses such a server) |
| Lab binding | `src/gpu-backend/lab.ts` `EvalLab` | the archive is bound to (study, job, door, door pin, evaluation-code digest, **backend** = `gpu:<uuid>:<binary sha>:<compat digest>`); a resume under another backend or code is refused |
| Preflight rules | `src/research-standard/gpuPolicy.ts` (called by `preflight.ts`) | §9.11: `evaluationBackend` required for 3.0.0 optimization/continuation; acceptance checked statically; no evasion by an old pin; non-official CPU backends need a non-official purpose and a justification |

There is **no CPU evaluation path inside the official gate, pool or lab**: `GpuPool` has no CPU code; `EvalLab` takes
the pool it is given, and the official runner obtains it only from `openOfficialGpuSession`.

## 3. Tests

### 3.1 Repository tests (`npm test`; the merge gate)

`src/gpu-backend/tests/policy.test.ts` (9 tests) and `layout.test.ts`:

| Test | Asserts |
|---|---|
| purpose | explicit, never defaulted; unknown refused |
| CPU runner | refuses a missing purpose and official optimization; accepts a declared non-official purpose |
| legacy runner wrapper | refuses before importing the runner |
| npm scripts | every script that can start a CPU research runner or optimizer goes through the gate |
| entrypoint audit | no search machinery outside the gate; an injected new optimizer directory fails the audit |
| acceptance | missing, forged, stale, changed evidence, wrong binary and wrong device all fail closed |
| preflight §9 | an official 3.0.0 study needs the GPU backend and an accepted evaluator; no evasion by an old pin |
| pilot domain | the deferred pilot's domain reaches only implemented capabilities |
| **MERGE GATE** | once an acceptance exists, it must still match the working tree (any change to a mirrored CPU source, CUDA or host file fails `npm test` until a new acceptance is generated) |
| layout | every struct's size and field offsets equal between TypeScript and C++ |

### 3.2 Negative tests on Apollo (`tools/gpu-phase2/negative.ts`, final binary)

NEGATIVE_TABLE

### 3.3 The gate before acceptance

`results/runlogs/official-preflight-before-acceptance.txt`: without a purpose → `preflight-purpose` (exit 3); with
`official-optimization` → `preflight-acceptance: no GPU acceptance record` (exit 3). No GPU process was started.

## 4. Merge gate and the Apollo GPU step

- A change to any file in the compatibility manifest changes the digest: the server binary no longer matches
  (`preflight-compat`), the acceptance becomes STALE (official runs refused) and `npm test`'s MERGE GATE fails.
- The only way back is the checklist: CPU change + CUDA counterpart + feature matrix + the Apollo GPU verification
  (parity campaign, sanitizer, negative tests, fixed-seed mini-optimization) + a new acceptance by `accept.ts`.
- CI without an NVIDIA GPU can run the policy tests but never produce parity evidence; the PR template requires the
  Apollo evidence paths.

## 5. Limits (stated honestly)

- A digest proves that sources did not change, not that they are semantically equal: semantic parity rests on the
  runtime comparison suites (campaign, mini-set, stress samples).
- The entrypoint audit recognizes search machinery by markers; a deliberately disguised CPU optimizer could evade it.
  Code review and the user's oversight remain necessary (standard §9.12).
- The documentation-only integration on `main` carries the rules (CLAUDE.md, standard 3.0.0, docs); the enforcement
  code lives on `research/gpu-phase2` until the user approves merging it. On `main`, official optimization is therefore
  blocked by rule (no gate exists to open), not yet by mechanism.
