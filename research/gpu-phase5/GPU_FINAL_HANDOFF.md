# GPU final handoff — parity root cause, atomic cache, performance audit, acceptance, integration (GPU Phase 5)

**READ FIRST. RISK-ENVELOPE PILOT NOT STARTED.** Nothing of the 35 % versus 40 % / 25 % / 25 % risk-envelope pilot was
implemented, configured, scheduled, preflighted, launched or run. No optimization was run. No trading rule, fitness,
qualification, search or selection code changed.

## 1. Status

| Question | Answer |
|---|---|
| Phase 4's parity mismatch | **RESOLVED** (by the rule frozen before any reproduction existed). A defect of the JavaScript engine — V8's Maglev compiler in Node v24.21.0 — not of the GPU evaluator: two objects created by one object literal can share the storage of their number fields. Reproduced with the historical signature on the historical candidate, on the CPU reference side; absent with `--no-maglev`. `PARITY_ROOT_CAUSE.md` |
| Acceptance | **ACCEPTED** 2026-11-21, record sha256 `49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4`; 38 of 38 checks. `GPU_ACCEPTANCE_REPORT.md` |
| Atomic dataset cache | **Implemented and proven**: 100 of 100 concurrent loads verified where Phase 4 measured 34 refused; no partial file observable; conflicting data refused explicitly. `ATOMIC_CACHE_AND_CONCURRENCY.md` |
| Performance | **No change retained; ×1.00 against Phase 3.** Nothing inside the GPU host path reaches the 2 % keep-rule; the audit's finding lies in the canonical CPU engine's parameter code, which this study must not change. `PERFORMANCE_AUDIT.md` |
| Integration | **Merged into `main`** (merge commit `dc926536f32416ee856896aa28f417102dc61dec`), verified after the merge, pushed. `MERGE_AND_RESTORE.md` |
| Checked-out branch | **`research/gpu-phase2`**, fast-forwarded to `main`, clean, verified |
| Risk-envelope pilot | **NOT STARTED.** `PILOT_HANDOFF_ONLY.md` |

## 2. The accepted version

| Item | Value |
|---|---|
| Record | `config/gpu-backend/acceptance.json` (schema 2, study `research/gpu-phase5`), sha256 `49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4`; supersedes Phase 3's `b08738be…` |
| Binary | `research/gpu-phase5/build/gb5`, sha256 `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e` (git-ignored; rebuilt bit-identically by `tools/gpu-backend/verify-acceptance.sh --rebuild`) |
| Evaluation digest | `3a6eacdecc4f0a24fbf008c0ef852644969e72dc8ea0af95bd5dc373ebb6033d` |
| Canonical CPU closure / CUDA sources | `c8a9f416…` / `d8899061…` — both unchanged since Phase 3; device code byte-identical since Phase 2 |
| GPU, driver, toolkit | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, CUDA 13.2 |
| Engine runtime (new) | Node v24.21.0 / V8 13.6.233.17, **every official process started as `node --no-maglev …`** — the official gate and the official runner refuse otherwise |
| Out-of-repository reference | `~/.local/share/margin-trading-gpu/acceptance-pins/` — the new record's copy and sha256 added; the Phase 3 pin kept unchanged |

What changed in the engine since Phase 3, all of it: the engine-runtime requirement (the fix); the atomic dataset
export; a shutdown guard in the host pipeline; Phase 4's type-only fix; the default binary path. Not changed: any
CUDA kernel, any file of the canonical CPU engine, Strategy Lab, any trading or search rule.

## 3. The merged revision

- `main` before: `3a52cc635c95f74fc6cf3c22aa30bf4507293fa3` (the accepted Phase 3 tree).
- Merge commit: **`dc926536f32416ee856896aa28f417102dc61dec`** (`git merge --no-ff research/gpu-phase5`; no conflict; no
  force-push; nothing reset or rewritten). It also brings Phase 4's commits and records into `main`'s history.
- Post-merge verification on `main`: merge-gate tests 21 of 21; the independent verifier with a reproducible rebuild,
  the device and the out-of-repository sha256 → VERIFIED; 22 of 22 study preflights; the live official gate opens;
  CPU closure and Strategy Lab unchanged; the repository and Strategy Lab suites repeated on the merged tree
  (`MERGE_AND_RESTORE.md` §4).
- This document's own commit is a documentation-only successor of the merge; `main`, `research/gpu-phase5` and
  `research/gpu-phase2` all point to it (`git rev-parse main`).

## 4. The checked-out branch

`research/gpu-phase2` (the branch active before this work), fast-forwarded to `main`, working tree clean, acceptance
verified from it. `research/gpu-phase3` and `research/gpu-phase4` are untouched (`3a52cc63`, `0ac3e4e2`).

## 5. Operating the accepted engine

- **Start every official process with `node --no-maglev`.** `NODE_OPTIONS` cannot carry the flag; put it on the
  command line (the npm scripts of official studies go through `src/gpu-backend/officialRunner.ts`, which refuses
  without it). Use the same flag for any CPU reference, diagnostic or comparison whose numbers matter.
- **Fastest single optimization (default): one job**, batch 8,192, 8 host workers. An Assignment 3-shaped search
  replay takes ≈ 585 s (≈ 2,125 evaluations / s; ≈ ×10 the canonical CPU engine on 12 workers).
- **Most total throughput: two independent jobs at once**, batch 8,192 and 8 host workers each — 1.25–1.31× the
  throughput of one job for Assignment 3-shaped work and ≈ 1.55× for the Growth-fixed Assignment 2 shape (Phase 4's
  measurements; each job then takes ≈ 1.5× longer). More than two gains nothing.
- **Namespaces:** each job needs its own job name (mandatory — the archive has no inter-process lock; the guards
  refuse a shared or reused name). A separate dataset cache directory per job is no longer needed for correctness and
  stays the recommended practice.
- Every job passes its own official gate; there is no CPU fallback, no shared GPU queue, no MPS.

## 6. Risks and limitations

1. **The V8 defect is avoided, not repaired.** `--no-maglev` removes the compiler tier that produces it (measured cost
   on a complete job: +0.2 %, inside the noise). A Node upgrade changes the JavaScript engine on both sides of every
   parity comparison and must be treated like any other evaluation-dependency change (a fresh acceptance).
2. **The requirement covers the official GPU path only.** Strategy Lab's server and the legacy CPU runners still run
   with Maglev enabled and are exposed to the defect — observed in this study only on a loaded machine in freshly
   started processes, where it corrupted, among others, a D1 book's standalone figures. Extending the flag to them is
   recommended and was outside this assignment (no Strategy Lab or legacy-runner file was changed).
3. **Attribution of the historical event is an inference.** Phase 4's run kept no record of the mismatching values.
   What is proven is the mechanism, its signature on the same candidate at the same position of a cold process, and
   its absence with the fix (0 of 1,170 cold processes against 9 of 1,180; then 2,040 fresh CPU workers and 170 fresh
   GPU contexts on the fixed configuration without a mismatch). Phase 4's verdict is not rewritten.
4. **Hardware.** The RTX 5090 and the host RAM are non-ECC; bounded pattern tests (24 GiB each) found nothing, and no
   test can exclude a one-off bit error.
5. **The acceptance is specific** to this GPU, driver, CUDA toolkit, Node version and tree. Any change to a pinned
   file makes it STALE and blocks official runs until the parity checklist is repeated.
6. **Known hazards left unchanged** (`PARITY_ROOT_CAUSE.md` §9): the parity hash covers a NaN's raw bits (no record
   field is a computed NaN today); the device checksum covers the fixed per-candidate structures only; response byte
   offsets are 32-bit (the accepted batch is far below the limit).
7. **Reliability evidence is bounded**: one 32-minute two-job run (3.3 M evaluations, 0 errors). No endurance test.
8. **Atomic publication protects against concurrent writers and crashes of a writer process.** Power loss: the data
   is flushed before it is published, so on a journaling file system the target is absent or complete afterwards; a
   just-published entry may be missing and is republished by the next export; an existing file is verified before it
   is reused and refused if it does not verify.
9. **Tests:** the acceptance's test gate passed on the second attempt of its step because Strategy Lab's browser
   suite showed two timing races in tests of the unchanged application (`GPU_ACCEPTANCE_REPORT.md` §7, amendment A5):
   three of five complete runs that day had exactly one failing test, two were clean. Strategy Lab loads no file this
   branch changes. The two tests should be hardened in Strategy Lab's own work. The 7 long-known `npm test` failures
   are unchanged.
10. **Performance is host-bound.** The device waits for the host ≈ 40 % of a job; about half of the host's main-thread
    time is parameter canonicalization in the canonical CPU engine. An estimated — not measured — 15–30 % of a job
    could be gained there; it needs the user's authorization and a full acceptance cycle (`PERFORMANCE_AUDIT.md` §5).

## 7. What the original conversation decides before a pilot

1. Whether to authorize the risk-envelope pilot as a new study, and its exact protocol (thresholds, fitness, budgets,
   folds, go / no-go). Nothing of it exists.
2. Whether to implement the envelope-delivery change the pilot needs on the official path (the pool and the Lab do not
   hand the risk-envelope inputs to a search today). It touches pinned files, so it makes the acceptance STALE until a
   fresh acceptance cycle passes (about six hours of mostly unattended machine time with this study's chain) — or to
   define the pilot on quantities the official path already delivers.
3. Whether to extend `--no-maglev` to Strategy Lab's server and the legacy CPU runners (recommended).
4. Whether to authorize the parameter-canonicalization speed-up in the canonical CPU engine (run time only; it could
   share one acceptance cycle with item 2).

## 8. This bundle

| File | Content |
|---|---|
| `GPU_FINAL_HANDOFF.md` | this file |
| `PARITY_ROOT_CAUSE.md` | the original failure, the captured evidence, the mechanism, the fix, attribution limits |
| `ATOMIC_CACHE_AND_CONCURRENCY.md` | the atomic export, its tests, job isolation, the one-job and two-job modes |
| `PERFORMANCE_AUDIT.md` | profiles, every candidate and its decision, end-to-end timings against Phase 3 |
| `GPU_ACCEPTANCE_REPORT.md` | every gate with counts, hashes and evidence; diagnostics; disclosures |
| `MERGE_AND_RESTORE.md` | commits, the diff review, post-merge verification, the restored branch, how to verify or go back |
| `PILOT_HANDOFF_ONLY.md` | context for the pilot's owner |
| `research/gpu-phase5/` | the brief, the frozen protocol, amendments A1–A5, the exact commands, the checkpoint, `MANIFEST.json`, and `results/` (JSON, JSONL, CSV, text logs) |
| `summaries/`, `CHECKSUMS.sha256`, `README.md` | the main machine-readable summaries; sha256 of every file; reading order |

Location on Apollo: `/home/chad/projects/margin-trading/research/gpu-phase5/bundle/gpu-phase5-final-handoff.zip`
(committed), with a copy and a `.sha256` file in `~/.local/share/margin-trading-gpu/handoffs/`. To copy it:

```bash
cp ~/.local/share/margin-trading-gpu/handoffs/gpu-phase5-final-handoff.zip <destination>/
# or from another machine:  scp <user>@<apollo>:.local/share/margin-trading-gpu/handoffs/gpu-phase5-final-handoff.zip .
sha256sum -c ~/.local/share/margin-trading-gpu/handoffs/gpu-phase5-final-handoff.zip.sha256
```

**RISK-ENVELOPE PILOT NOT STARTED.**
