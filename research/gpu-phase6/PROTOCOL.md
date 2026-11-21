# GPU Phase 6 — Maglev protection beyond the official path and concurrent-job isolation (acceptance protocol)

- **Brief:** `brief/BRIEF.md` (the user's assignment of 2026-11-21, verbatim). **Standard:** 3.0.0
  (`docs/research/OPTIMIZATION_STANDARD.md`, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`),
  scope **diagnostic** (engineering acceptance; `STANDARD_ADOPTION.json`). **Checklist:** `docs/gpu/PARITY_CHECKLIST.md`
  §2a (an enforcement-only change).
- **What this is not.** Not a research or optimization study: nothing is searched for selection, ranked, qualified or
  selected; no trading rule, fitness, parameter search, candidate selection, evaluation code, CUDA source, numerical
  precision or build flag changes. **The risk-envelope pilot is out of scope: nothing of it is created, configured,
  preflighted or run.** The namespace exists because standard §9.9 lets only an acceptance study write the acceptance
  record, and the brief (§4.7) requires renewing the acceptance when a pinned file changes.

## 1. Baseline (verified 2026-11-21T09:4xZ)

| Item | Value |
|---|---|
| `main` = `research/gpu-phase2` | `830a1221029c0569be647e0af3d335c6c9b3df5a` |
| Accepted record | `config/gpu-backend/acceptance.json` (study `research/gpu-phase5`) sha256 `49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4`; out-of-repository copy `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase5-49e95d7a.json` |
| Binary | `research/gpu-phase5/build/gb5` sha256 `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e` |
| Evaluation digest (compiled in) | `3a6eacdecc4f0a24fbf008c0ef852644969e72dc8ea0af95bd5dc373ebb6033d` (CPU closure `c8a9f416…`, CUDA `d8899061…`, host `53671a6c…`) |
| Device | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, Node v24.21.0 |
| Integrity baselines | `results/baseline/` (tracked research blobs, 22 study preflights PASS, sealed-file modes, the B4/B5 forward freeze's pre-existing failures, compat digests) |

## 2. The change and its classification

1. **Maglev protection beyond the official path.** `src/gpu-backend/runtime.ts` (the one place that knows how an engine
   process starts) gains `withEngineFlag`, `withEngineFlagArgs` and the **child-process guard**
   `installChildEngineGuard()`; `src/gpu-backend/legacyRunner.ts` refuses a process without `--no-maglev` and installs
   the guard before importing a frozen runner (frozen runners fork workers with an explicit execArgv that drops the
   flag); every Node npm script of the repository and of Strategy Lab passes `node --no-maglev` (a merge-gate test
   enforces it); Strategy Lab's server (`start()`) and its four runners refuse without the flag; its runner flags
   (`NODE_FLAGS`), replay, tests (Vitest `execArgv`), Playwright web server and systemd template carry it.
2. **Job isolation.** `src/gpu-jobs/` (new): `openJob` (identity, kernel ownership lock, per-job records, state and
   dataset cache, allocation, resume, refusals), the status command; `src/gpu-backend/lab.ts` takes a job's ownership
   (the owning job, or its own lock); `src/gpu-backend/official.ts` requires an official run to hold an isolated job of
   its study (`preflight-job`) and records it in the attestation; `src/gpu-backend/acceptance.ts` requires the record to
   pin the job module (`ENFORCEMENT_EXTRAS`); `tools/gpu-backend/official-preflight.ts` opens a job per preflight.
3. **Classification: enforcement-only (checklist §2a).** No file of the evaluation manifest changes: the evaluation
   digest stays `3a6eacde…` and the binary stays `f444c521…` (gate E1). `compat.ts` (in the host manifest) is not
   edited; the job module is pinned as enforcement extras instead. The kernel evidence of the Phase 5 record therefore
   remains valid and is carried into the new record unchanged (every file re-hashed against the Phase 5 record); the
   enforcement evidence, the job-isolation campaign and the confirmation parity are fresh.
4. **Untouched by construction:** the canonical CPU closure, the CUDA sources, the host path, every frozen legacy
   runner directory (entrypoint digests), `src/app.ts` and the B4/B5 forward freeze's bound files (`src/app.ts`,
   `src/app/pools.ts`, `src/pools/**`, the `imports` map, `package-lock.json`), every completed study's records.

## 3. Resource contract

- Slice `gpup6.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0; `tools/gpu-phase6/launch-slice.sh`), every step
  a transient unit; Node `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --no-maglev`.
- GPU jobs: batch 8,192, 8 host workers (Phase 4's Mode S/A). At most four GPU servers at once (≈ 6 GB VRAM each on D19).
- No endurance run (brief §3). No reboot, no machine-wide change.

## 4. Data access

Doors D19 (Assignment 3 C19 broad1, Assignment 2 C19 base, the mini schedule), D24 (parity, the sealed finalists),
the seeded synthetic fixture S3 — development data only, opened through this study's own door log
(`src/gpu-phase6/context.ts` → `results/doors.jsonl`). FULL and the validation window are not opened.

## 5. The campaign (`chains/campaign.sh`; commands in `RUN_COMMANDS.md`)

| Step | Content |
|---|---|
| C1 | the fixed-seed mini optimization on the GPU, one job alone (reference) |
| C2 | the same on the CPU arm (12 forked workers) |
| C3 | Assignment 3's C19 broad1 search job alone |
| C4 | two real optimizations at once (A3 C19 broad1 + A2 C19 base), each in its default namespace; meanwhile: reuse of an active identity (as new, as resume, as resume with another definition), a job SIGKILLed (whole unit) and resumed, a job stopped (exit 75) and resumed, two jobs with an explicitly shared dataset cache starting together |
| C5 | identity comparisons (`tools/gpu-phase6/compare.ts`) |
| C6 | the isolation audit (`tools/gpu-phase6/campaign-verify.ts`) incl. the process audit |
| C7 | bounded confirmation parity through the host path (D24 core 3,000 seeded genomes + references + strata + branch designs with determinism; D19 fund 1,500 with detail and risk; fixture S3 all options 300) |
| C8 | Assignment 3's 48 sealed finalists on D24: CPU reference (under `--no-maglev`) = GPU = sealed C24 figures |

Then, on the final committed tree: the negative suite (`tools/gpu-phase6/negative.ts`), the tamper suite
(`tools/gpu-phase6/tamper.ts`, sandbox clone), `npm test`, the root type check, Strategy Lab's suites (typecheck, lint,
Vitest, build, Playwright) and its portfolio parity (the five frozen pooled candidates against their sealed records),
the integrity re-check, the acceptance generator (`tools/gpu-phase6/accept.ts`).

## 6. Gates (all must pass; zero tolerance)

| Gate | Pass criterion |
|---|---|
| E0 engine runtime | every job profile, parity run, the finalists run and the negative suite record Maglev disabled; the generator too |
| E1 evaluation unchanged | evaluation digest = `3a6eacde…`, binary sha256 = `f444c521…`, CPU closure, CUDA and host digests = the Phase 5 record's; every carried Phase 5 evaluation-evidence file hashes to its Phase 5 pin |
| E2 job isolation | C6 audit passes every check |
| E3 negative suite | every case passes on the accepted pinned files at a commit whose pinned files equal HEAD's; dev binary = `f444c521…` |
| E4 tamper suite | baseline opens (static ACCEPTED, gate opened with a job, runner ran, verifier VERIFIED, merge gate passes) and every case (Phase 5's T1–T15 and the new T16–T20) is detected and restored clean |
| E5 parity | the three C7 runs: zero mismatches, pass |
| E6 optimizer identity | C5: A3 (alone and concurrent) and A2 (concurrent) = their sealed records; mini CPU = GPU; killed+resumed, stopped+resumed and both shared-cache jobs = the isolated reference; concurrent A3 = isolated A3 (every archived evaluation) |
| E7 sealed CPU results | C8: 48 finalists, CPU = GPU on every task, every D24 compact record = the sealed C24 figure; Strategy Lab's portfolio parity ALL VERIFIED |
| E8 tests | `npm test` = the known failures only (`known-npm-test-failures`: 7) plus none new; root `tsc` 0 errors; GPU-backend, jobs and runtime tests pass |
| E9 Strategy Lab | typecheck, lint, Vitest, build and Playwright pass (Playwright: one complete rerun allowed for the known timing races, disclosed) |
| E10 integrity | every tracked research file outside `research/gpu-phase6/` unchanged against `results/baseline/`; 22 study preflights PASS; sealed-file modes as at baseline; the B4/B5 freeze's failure list unchanged (no new failure) |
| P1, P5 | policy text; the policy, enforcement, layout, host-pipeline, dataset and jobs tests run by the generator |

A failed gate stops the integration; the accepted Phase 5 implementation stays in force. A discrepancy is investigated
before anything else; criteria are never loosened. Pre-existing failures are recorded apart from regressions.

## 7. Integration

After ACCEPTED on a committed tree: review the whole diff; `git merge --no-ff research/gpu-phase6` into `main`;
post-merge verification on `main` (merge-gate tests, the independent verifier with `--rebuild --device` and the new
record's out-of-repository sha256, the live official preflight opening with a job, study preflights); push `main`
(no force); fast-forward `research/gpu-phase2` to `main`, check it out clean, verify the backend from it; keep the new
record's copy and sha256 in `~/.local/share/margin-trading-gpu/acceptance-pins/` beside the Phase 5 and Phase 3 pins.
