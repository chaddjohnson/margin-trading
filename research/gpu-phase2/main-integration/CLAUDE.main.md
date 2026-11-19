# Margin trading — project instructions for Claude Code

## GPU-only official optimization and CPU/GPU parity (MANDATORY — standard 3.0.0 §9)

> Every historical strategy evaluation that affects an official optimization — fitness, qualification, promotion,
> refinement, robustness/perturbation tests, optimization validation — MUST run on the attested NVIDIA GPU evaluator.
> **There is no CPU fallback, ever**: no GPU, an unsupported reachable feature, a stale build or source digest, a failed
> smoke kernel or parity mini-set, lost device/server, bad receipts or exhausted VRAM stop the run (checkpointed) with an
> explicit error. Every change to D1, Growth, the allocator, entries/exits/risk controls, fills, costs/interest or any
> evaluation dependency needs its CUDA counterpart and fresh Apollo parity evidence BEFORE it is merged or used for
> official research. The TypeScript/CPU engine stays the authoritative reference and Strategy Lab's evaluator.

- Normative text: [docs/research/OPTIMIZATION_STANDARD.md](docs/research/OPTIMIZATION_STANDARD.md) §9 (3.0.0). Engineering
  procedure and merge gate: [docs/gpu/PARITY_CHECKLIST.md](docs/gpu/PARITY_CHECKLIST.md); feature matrix:
  [docs/gpu/FEATURE_MATRIX.md](docs/gpu/FEATURE_MATRIX.md); operations: [docs/gpu/README.md](docs/gpu/README.md).
- **Status on `main` (documentation only):** the CUDA evaluator and the enforcement code — the official gate
  `openOfficialGpuSession` → `GpuPool` → `EvalLab` (`src/gpu-backend/`), the preflight's §9 rules, the purpose gate on
  every legacy CPU research script and the policy/merge-gate tests — live on branch `research/gpu-phase2` and are NOT
  merged into `main` (merging them needs the user's separate approval). Until they are, no official optimization can
  run from `main`: there is no gate to open, and a CPU run must never stand in for one.
- Official GPU optimization is additionally blocked until `config/gpu-backend/acceptance.json` is ACCEPTED and matches
  the tree (research/gpu-phase2/ reports the current verdict).
- CPU evaluation is allowed only under an explicit non-official purpose (`GPU_POLICY_PURPOSE=cpu-reference | diagnostic |
  parity-test | benchmark | strategy-lab`). Never present CPU results, or a CPU/GPU hybrid, as official optimization.
  Any real exception needs the user's explicit approval first.
- A CPU-only CI pass is never complete parity — the Apollo GPU verification (parity campaign, sanitizer, negative
  tests, fixed-seed mini-optimization) is required and recorded in the acceptance record.

## Context recovery (applies to every session)

- For any substantial multi-stage task, follow @docs/claude/context-recovery.md and, at session start and after any context compaction, reread that guide and the task's on-disk recovery checkpoint before executing work.
- Task state (results, hashes, commands, process IDs, next steps) belongs in the task's own checkpoint — `research/<study>/RESEARCH_RECOVERY.md` or `WORK_RECOVERY.md` — never in this file or the guide.

## Project

- Overview, data layout and commands: `README.md` and `docs/`.
