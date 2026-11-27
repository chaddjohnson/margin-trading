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
- Official runs go only through `openOfficialGpuSession` (src/gpu-backend/official.ts) → `GpuPool` (the parallel host
  path: 8 worker threads by default) → `EvalLab` (src/gpu-backend/); an official study's npm script starts its runner
  through `src/gpu-backend/officialRunner.ts`. The preflight (`npm run research-preflight`) refuses an official study
  until `config/gpu-backend/acceptance.json` (schema 2) is ACCEPTED and matches the tree. Status: **ACCEPTED
  2026-11-22 by research/gpu-phase7/** on branch research/gpu-phase7-risk-envelope-readiness (full re-acceptance for the
  risk-envelope delivery through GpuPool/EvalLab; binary `cb2ff30b…`, RTX 5090 `GPU-ae5f222c…`, record sha256
  `bb0e3fcf6bde45cc…`; `main` keeps research/gpu-phase6's record `3610caaf0bfc14ec…` until a reviewed merge; on branch feature/research-date-boundaries (2026-11-27) the record is STALE because the evaluation loaders and the preflight changed — official runs there wait for a §2 re-acceptance; every Node process that evaluates — official
  runs, legacy CPU runners, Strategy Lab's server and runners, every npm script — starts as `node --no-maglev …` and
  refuses otherwise, docs/gpu/README.md §3a; every official run owns an isolated job, `src/gpu-jobs/jobs.ts` `openJob`,
  docs/gpu/README.md §4c); any change to a file of the evaluation manifest (CPU closure, CUDA, host path), of the pinned
  enforcement group or of the job module (`ENFORCEMENT_EXTRAS`) makes it STALE and blocks official runs until the parity checklist is repeated (§2, or §2a for an
  enforcement-only change). `tools/gpu-backend/verify-acceptance.sh` re-verifies the record without the TypeScript
  validator. Official optimization still needs the user's authorization of each study.
- CPU evaluation is allowed only under an explicit non-official purpose (`GPU_POLICY_PURPOSE=cpu-reference | diagnostic |
  parity-test | benchmark | strategy-lab`); every legacy CPU runner's npm script enforces this. Never present CPU
  results, or a CPU/GPU hybrid, as official optimization. Any real exception needs the user's explicit approval first.
- `npm test` includes the merge gate (src/gpu-backend/tests/policy.test.ts); a CPU-only CI pass is never complete
  parity — the Apollo GPU verification (parity campaign, sanitizer, negative tests, fixed-seed mini-optimization) is
  required and recorded in the acceptance record.

## Delivery: commit and push at completion (standing preference)

> At completion, commit task-related work and push the task's branch to its configured remote without asking for routine confirmation. This applies to research, documentation and negative results. Stage only task-related changes, preserve unrelated work, and exclude secrets and inappropriate large data artifacts. Verify the push and report branch and commit. If a concrete problem prevents a safe push, preserve the work and explain the blocker. Do not force-push, merge into main, deploy, or publish outside the repository without separate authorization.

- Recorded at the user's request in the Priority 3 brief (`research/vg-d1-growth-joint/brief/BRIEF.md` §1, 2026-11-08).
  It replaces the earlier routine "ask before committing or pushing" practice; broker access still needs the user's
  explicit request.
- Verify the push with `git ls-remote origin <branch>` (equal to the local commit) and record it in the task's
  checkpoint.

## Reporting: written analysis and tables only, no visuals (standing preference)

> Report research with written analysis, Markdown tables and machine-readable results only. Do not create charts,
> plots, SVGs, screenshots, images, dashboards, HTML visual reports, PDFs or other visual artifacts, and do not spend
> time rendering or inspecting report graphics.

- Recorded at the user's request in the Priority 5A brief (`research/vg-growth-funding-lifecycle/brief/BRIEF.md` §1,
  2026-11-09) and enacted as optimization standard 2.0.0 §7.7. It replaces the earlier permission for backend report
  charts. Visuals of earlier studies are preserved, never deleted or regenerated. Only a brief that explicitly asks for
  a visual overrides it (recorded as a departure). Strategy Lab's own application interface is outside this rule.

## Context recovery (applies to every session)

- For any substantial multi-stage task, follow @docs/claude/context-recovery.md and, at session start and after any context compaction, reread that guide and the task's on-disk recovery checkpoint before executing work.
- Task state (results, hashes, commands, process IDs, next steps) belongs in the task's own checkpoint — `research/<study>/RESEARCH_RECOVERY.md` or `WORK_RECOVERY.md` — never in this file or the guide.

## Optimization research — read the standard first (mandatory)

- Before any new optimization study, or any material continuation of one (a new search, lane, budget, cutoff, validation or selectable candidate), read in full `docs/research/OPTIMIZATION_STANDARD.md` (its current version is registered in `docs/research/optimization-standard.versions.json`) and the study's own `PROTOCOL.md` and `AMENDMENTS.md`. This applies to bounded diagnostics of frozen selections too (scope `diagnostic`).
- A new study starts from `docs/research/STUDY_PROTOCOL_TEMPLATE.md`, records `research/<study>/STANDARD_ADOPTION.json` (version, sha256, read/adoption times, protocol hash, date split, objective/roles, risk denominator, budget, deviations) and must pass `npm run research-preflight -- --study research/<study>` before its first substantive stage; new runners call `requireStandardAdoption` (`src/research-standard/preflight.ts`) in code. The preflight checks the declaration and hashes, not understanding.
- A frozen study keeps the standard version it pinned; adopting a newer version is an explicit amendment. Completed studies are never retrofitted.
- The standard changes only when the user agrees a process change: a new version, a change-log entry (§8) and the new sha256 in the registry (`npm run research-preflight -- --hash`). Never edit it silently; the preflight then fails for every study.
- Formal windows are explicit dates (standard 4.0.0 §1): `config/research/date-ranges.json` (R1: development 2016-01-04 → 2024-12-31, validation 2025-01-01 → 2026-10-30). Appending market data never extends them; a later range is a new entry with the user's explicit authorization. Data after the validation end are for manual evaluation only (`npm run manual-eval`, labelled "manual post-validation evaluation"), never selection, qualification or validation evidence. Canonical files grow by `npm run datasets -- append` only (byte-prefix proof, `config/market-data/vintages.json`); historical inputs are verified as byte prefixes, never by weakening a check.

## Project

- Overview, data layout and commands: `README.md` and `docs/`. Research priorities and their status: `docs/research/ROADMAP.md`.
