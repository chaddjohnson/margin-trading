# GPU acceptance report (GPU Phase 5)

## 1. Verdict

**ACCEPTED** on 2026-11-21T06:00:58Z. Every gate of the frozen protocol (§7, with the root-cause gates of amendment A2)
passed on the final tree: **38 of 38 checks of the acceptance generator, 0 failed** (`results/acceptance-gates.txt`).
Nothing was waived, no tolerance was loosened, and the original mismatch was neither discarded nor excepted: it was
explained (`PARITY_ROOT_CAUSE.md`), its cause removed, and the original run repeated on the final candidate.

| Item | Value |
|---|---|
| Acceptance record | `config/gpu-backend/acceptance.json`, schema 2, study `research/gpu-phase5` |
| **Record sha256** | **`49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4`** |
| Supersedes | the Phase 3 record `b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214` (accepted 2026-11-19) |
| Accepted source revision | `0ab04601d64cf20300b1f06b8569335f2987f831` (branch `research/gpu-phase5`); the record's own commit is `9192e697` |
| Binary | `research/gpu-phase5/build/gb5`, sha256 `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e` (git-ignored; reproducible from the pinned sources) |
| Evaluation digest (compiled into the binary) | `3a6eacdecc4f0a24fbf008c0ef852644969e72dc8ea0af95bd5dc373ebb6033d` |
| Canonical CPU closure (94 files) | `c8a9f416e25b393a92018544322cc6ade272cb237e50d6557cc4333cf9024e6a` — **unchanged** from Phase 3 |
| CUDA sources (7 files) | `d88990612c5cd6d7f274821cd8b49ba4a29710419dd6a5f872fc8582b6592e46` — **unchanged**; device code and SASS byte-identical to the Phase 3 and Phase 2 binaries |
| Host path (12 files) | `53671a6c07c486fbcd4b74486365c1b6604afcac2a00e0fa32f0ea39d9a47af3` — changed: atomic dataset export, shutdown guard, default binary path |
| Enforcement group (24 files, the generator included) | `c4832e8856e78785a0beb6ae45af7bac8c0f88fd95d5b8ada8a6c8b5eaf2a55b` — changed: the engine-runtime requirement and its tests |
| Device | NVIDIA GeForce RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, CUDA 13.2 |
| Engine runtime (new, part of the record) | Node v24.21.0, V8 13.6.233.17-node.53, **`--no-maglev` required** (`src/gpu-backend/runtime.ts`) |
| Out-of-repository reference | `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase5-49e95d7a.json` and a new line in `pins.jsonl`; the Phase 3 pin file and its lines are kept unchanged beside it |
| Independent verification | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 49e95d7a…` → **VERIFIED** on the branch, on `main` after the merge and on `research/gpu-phase2` (`results/policy/verify-acceptance-branch.txt`, `results/integration/`) |

What the acceptance means: the tree, the binary and the GPU named above evaluate every candidate of the official
domain bit-identically to the canonical TypeScript engine, in a process started with `node --no-maglev`. A change to any
pinned file, the binary, the GPU, or a process without the flag is refused by the official gate.

## 2. Gates

Paths are relative to `research/gpu-phase5/`. Every run used the final binary, the parallel host path (8 worker
threads unless a gate varies it) and `--no-maglev` (gate A0), except the accepted-configuration baselines of A9.

| Gate | Requirement | Result | Evidence |
|---|---|---|---|
| R1 | the defect is present with the default engine and absent with the fix (CPU reference chunks of the original run in cold processes, 10 at a time, compared with a ground truth equal to Phase 4's diagnostics) | **pass** — default engine: 234 processes, 13 wrong evaluations (11 of them record-only, 3 on `O-fund:coarse:28`); `--no-maglev`: 231 processes, **0** | `results/rootcause/record-stress-truth-default.json`, `-no-maglev.json` |
| R2 | the fresh-context loop at its full budget on the final candidate | **pass** — 170 cycles, 2,040 fresh CPU workers, 170 fresh GPU contexts, 265,370 GPU evaluations, 8,160 parity comparisons, **0 mismatches**; device response digest unchanged in every cycle | `results/rootcause/fresh-loop-final/` |
| R3 | the host path cold, under CPU load | **pass** — 150 fresh pipelines, 1,200 cold worker threads, 12 CPU burners, 234,150 results, **0 mismatches** | `results/rootcause/host-soak-final.json` |
| A0 | every parity run, replay and the negative suite ran under `--no-maglev` | **pass** | the `runtime` field of each record |
| A1 | reproducible final binary; device code identical to the accepted one | **pass** — built twice, `f444c521…` both times; `.nv_fatbin` `a8e53c14…` and SASS `6a558a85…` (160,991 lines) identical to gb3 and gb2 | `results/final-binary.json` |
| A2 | offline codec check on Phase 3's 7 captured real batches, serial and 1 / 2 / 3 / 8 / 12 workers | **pass** — 7 captures, 0 failures: request bytes and every result hash identical | `results/final/offline-check.json` |
| A3 | parity campaign, this study's seeds | **pass** — **54 runs, 144,795 of 144,795 candidates identical, 0 mismatches**; 141,600 random genomes; 64,050 risk envelopes; 176 determinism runs; 20 doors and windows; 18 option sets (§3) | `results/parity/final/SUMMARY.json` and the 54 run records |
| A3 | Phase 4's exact `D24-fund` run with Phase 4's seeds | **pass** — **1,561 of 1,561 identical, twice** | `results/parity/original/` |
| A3 | Assignment 3's 48 sealed finalists on D24 and FULL | **pass** — 96 evaluations of the 48 finalists on D24 and 96 on FULL, GPU = CPU reference in all 192; the 48 sealed D24 figures reproduced | `results/parity/final-finalists.json` |
| A4 | sealed-job replays identical | **pass** — Assignment 3 C19 broad1 search twice (585.1 s, 584.0 s), Assignment 3 C19 broad qualification (2.74 min), Assignment 2 C19 base search (721.9 s): proposals, rankings, promotions, refinements, verdicts and archive digests identical to the sealed records | `results/optimizer/compare-final-*.json` |
| A4 | fixed-seed mini-optimization | **pass** — CPU = GPU with 8 workers = 1 worker = serial path = interrupted and resumed | `results/optimizer/compare-final-mini-*.json` |
| A5 | compute-sanitizer | **pass** — memcheck with full leak check (0 errors, 0 bytes leaked), racecheck (0 hazards), initcheck (0 errors), synccheck (0 errors); 97 candidates each, results identical under every tool (§6) | `results/sanitizer-final/` |
| A6 | negative suite | **pass** — **49 of 49** fail-closed cases, including the four new engine-runtime cases | `results/policy/negative-final.json` |
| A6 | source-tamper suite in a sandbox clone | **pass** — **15 of 15**, including T15 (the runtime requirement removed) and T14 (a weakened gate committed with a regenerated record, caught only by the out-of-repository value) | `results/policy/tamper-final.json` |
| A7 | bounded reliability run, two jobs at once | **pass** — 2 processes × 32.1 min, 3,276,800 GPU evaluations, 4,800 CPU parity samples, 0 mismatches (§5) | `results/sustained/p0`, `p1` |
| A8 | repository tests | **pass on the second attempt of the step** (§7) — `npm test` 1,710 tests, 1,699 pass, the 7 known failures, 0 unexpected; root `tsc` 0 errors; ESLint clean; Strategy Lab typecheck, lint, 314 unit tests, build, e2e 81 of 81; `state/strategy-lab/` and the live build untouched | `results/tests/`, `results/tests/attempt1/` |
| A9 | no performance regression beyond ±3 % | **pass** — Assignment 3 replay 585.1 / 584.0 s against 586.6 / 583.2 s on the accepted configuration: ratio 0.9994 | `results/optimizer/regression.json`, `PERFORMANCE_AUDIT.md` §6 |
| A10 | atomic dataset export | **pass** — 4 × 25 shared-directory race on the final binary: 100 of 100 loads verified, 0 refused, 0 partial reads; 40 writers killed: 0 partial targets; conflicting writers: 20 explicit conflicts; 28 datasets byte-identical to the previous exporter | `results/final/`, `results/cache/` |
| A10 | isolation under concurrency (I1–I6) | **pass** — every failing or interrupted job behaves as specified and every neighbour finishes identical (`ATOMIC_CACHE_AND_CONCURRENCY.md` §5) | `results/isolation/`, `results/bench/i1`, `i2` |
| A11 | canonical CPU closure and CUDA sources unchanged; preflights; live gate | **pass** — closure `c8a9f416…`, CUDA `d8899061…`; 22 study preflights pass; the live official gate opens on the record (15 checks, parity mini-set 18 of 18) | the record; `results/integration/` |
| P1, P5 | policy text; the GPU backend's tests under the mandated runtime | **pass** | `results/policy/policy-tests.txt` |

## 3. The parity campaign in detail (gate A3)

CPU reference: the canonical TypeScript engine in 12 child processes, each under `--no-maglev`. GPU: the final binary
through the 8-worker host path. Comparison: canonical hashes over the raw IEEE-754 bits of the books, the pool and
the detailed record (with the RC counters and the risk-envelope inputs); a mismatch would have been captured with both
sides' original values (none occurred).

| Door / window | Runs | Candidates | Identical | Mismatches | Envelopes compared | Determinism runs | Option sets |
|---|---|---|---|---|---|---|---|
| D19 | 1 | 10,061 | 10,061 | 0 | 0 | 0 | base |
| D21 | 1 | 10,061 | 10,061 | 0 | 0 | 0 | base |
| D23 | 1 | 10,061 | 10,061 | 0 | 0 | 0 | base |
| D24 | 22 | 67,540 | 67,540 | 0 | 31,215 | 32 | all, base, blackout, cost0, cost10, cost20, d1only, fund, ggdx, gonly, native, nextopen, periods, rate14, slip25, tie, vgtonly, whole |
| FULL | 6 | 19,373 | 19,373 | 0 | 5,160 | 16 | all, base, nextopen, periods |
| episodes E-2020, E-2022, E-2025 | 3 | 9,183 | 9,183 | 0 | 9,183 | 0 | base |
| regime windows W-BEAR, W-CRASH, W-QUIET, W-TREND | 4 | 12,244 | 12,244 | 0 | 12,244 | 0 | base |
| adversarial fixtures S0–S7 | 16 | 6,272 | 6,272 | 0 | 6,248 | 128 | all, base |
| **Total** | **54** | **144,795** | **144,795** | **0** | **64,050** | **176** | 18 |

- Candidates by set: 141,600 seeded uniform random genomes; 2,828 Growth-structure strata (a random genome with one
  structural gene forced to each of its values; 5,040 distinct Growth structures covered); 175 evaluations of the
  frozen reference identities; 64 of Phase 1's branch-heavy D1 designs; 128 neighbourhood points of the references. The evaluations contain 8,444,086
  trades, 5,431,297 lots, 2,980,315 funding records and 200,637 partial fills; every feature flag of the domain and
  every exit reason and entry kind occurs (`SUMMARY.json`, `totals`).
- Determinism (11 subsets × 16 variations = 176 runs, all identical): batch sizes 1, 7, 13, 16, 32, 50, 64 and 128;
  shuffled and reversed input order; a repeat in the same process; host workers 0, 1, 3 and 12; a server and host-path
  restart.
- One binary (`f444c521…`), one evaluation digest and one GPU across all 54 runs.
- The campaign is 1,561 candidates smaller than Phase 4's 146,356 because the original `D24-fund` run is not one of
  this study's 54 seeded runs; it was run separately with Phase 4's own seeds, twice (3,122 further comparisons), and
  in the fresh-context loop (8,160 comparisons against the CPU reference, 265,370 GPU evaluations against the first
  cycle). CPU/GPU candidate comparisons on the final candidate in total: 144,795 + 3,122 + 8,160 + 192 finalist
  evaluations + 4,800 reliability samples = 161,069, all identical.

## 4. Replays (gate A4)

| Job | Fresh evaluations | Wall | Against the sealed CPU run | Identical |
|---|---|---|---|---|
| Assignment 3 C19 broad1 search, run 1 | 1,242,714 | 585.1 s | ×10.08 | yes |
| Assignment 3 C19 broad1 search, run 2 | 1,242,714 | 584.0 s | ×10.10 | yes |
| Assignment 3 C19 broad qualification | — | 2.74 min | ×7.59 | yes |
| Assignment 2 C19 base search (Growth fixed) | 2,196,920 | 721.9 s | ×6.48 | yes |
| Mini-optimization: CPU, GPU 8 workers, 1 worker, serial path, interrupted and resumed | 30,749 | 65–74 s (GPU arms) | — | all five identical |

## 5. The reliability run (gate A7)

Two independent processes at once (the two-job mode), each with 8 host workers, its own job name and dataset cache
directory, 50 rounds of 32,768 candidates cycling D19, D21, D23, D24 and FULL.

| | Process 0 | Process 1 |
|---|---|---|
| Duration | 32.1 min | 32.2 min |
| GPU evaluations | 1,638,400 | 1,638,400 |
| CPU parity samples / mismatches | 2,400 / 0 | 2,400 / 0 |
| Repeatability checks (8,192 candidates each) / mismatches | 4 / 0 | 4 / 0 |
| Failures, restarts, capacity retries, CPU-scored evaluations | 0, 0, 0, 0 | 0, 0, 0, 0 |
| Peak host RSS: first cycle / second cycle | 7.6 GiB / 7.5 GiB | 7.3 GiB / 7.7 GiB |
| Throughput on D19, first cycle → second cycle (evaluations / s, mean of 5 rounds) | 2,194 → 2,470 | 2,182 → 2,482 |
| Throughput on FULL, first cycle → second cycle | 779 → 798 | 775 → 770 |

GPU peaks (both processes together): 58 °C, 222 W, 14,021 MiB of VRAM; no throttle flag in any sample. Host memory
follows the door in use (largest on FULL); the two cycles' peaks are within 0.4 GiB of each other (lower in the second
cycle for process 0, higher for process 1), far below the job slice's 44 GiB memory limit; throughput does not decline. Phase 4's
run of the same shape peaked at 8.4 and 7.8 GiB.
No eight-hour endurance run was made (the brief excludes it).

## 6. Diagnostics (protocol §4.5 item 5)

| Diagnostic | Result | Limit |
|---|---|---|
| compute-sanitizer 2026.1.1 on the final binary, door W-CRASH, 97 candidates through the host path per tool | memcheck with `--leak-check full`: 0 errors, 0 bytes leaked; racecheck: 0 hazards (0 errors, 0 warnings); initcheck: 0 errors; synccheck: 0 errors; the results under every tool identical to the reference | a subset, as the tools slow execution by orders of magnitude |
| VRAM pattern test (`tools/gpu-phase5/vram-test.cu`), spare memory only | 24 GiB, 6 patterns × 3 rounds, 115,964,116,992 words verified, **0 mismatched**, 9.8 s (`results/diagnostics/vram-test.json`) | seconds, not hours; cannot exclude a rare transient |
| Host memory pattern test (user space, no reboot) | 24 GiB, 6 patterns × 2 rounds, 8 threads, 77,309,411,328 words verified, **0 mismatched**, 20.4 s (`results/diagnostics/hostmem-test.json`) | the pages the kernel handed out at that moment only |
| Kernel log, 2026-11-20T20:00Z to the end of the campaign | no machine-check, EDAC, hardware-error or out-of-memory line; **one `Xid 43`** at 2026-11-21T03:00:05Z from process `gb5-dev` | that Xid is the negative suite's deliberate device-fault case (the binary in its test-hook role, which the official gate refuses); the earlier 12 Xid 43 entries since 2026-11-18 are the same test in earlier suites |
| Transfer and serialization | the device response of the original 1,561-candidate batch had the same sha256 (`1047014f…`) in all 170 fresh-context cycles and in the host soak | — |

The GeForce RTX 5090 has no ECC memory reporting and the host RAM is non-ECC: no test here can prove that a one-off bit
error never happens. None is needed to explain the Phase 4 event, whose mechanism was reproduced on the CPU side with
the device's result correct every time.

## 7. Disclosures

1. **Gate A8 passed on the second attempt of the tests step (amendment A5).** In the first attempt Strategy Lab's
   browser suite had one failing test in its run and one in its allowed rerun — a different test each time; all 81
   tests passed in at least one of the two runs. Both failures are timing races inside the tests (a reset connection
   in a test's own proxied request; a chart width read before the layout followed a viewport change). Nothing the
   suite executes differs from the accepted tree (`apps/` identical to `main`, no import from the changed
   directories, CPU closure unchanged), and the suite passed 81 of 81 in Phase 3 and Phase 4. The decision was written
   before the rerun: one whole rerun of the step under its unchanged rule, and NOT ACCEPTED if that did not pass. The
   rerun passed 81 of 81 on its first run. Attempt 1's records are kept in `results/tests/attempt1/`. The same
   stale-width race appeared once more when the suites were repeated on the merged tree (80 + 1, then 81 of 81 on the
   allowed rerun; `MERGE_AND_RESTORE.md` §4): of five complete runs of the browser suite on 2026-11-21, two were clean
   and three had exactly one failing test (`candles.spec.ts:439` twice, `preview.spec.ts:375` once). Strategy Lab's
   static import closure (389 files) contains none of the files this branch changes
   (`results/integration/tests/strategy-lab-import-closure.json`); the tests need hardening in Strategy Lab's own
   work, which this study does not touch.
2. **Step 29 stopped once on a shell error of my chain script** before the two dataset tests of I7 ran (amendment A4).
   No test failed; the two tests ran from a corrected script; nothing that had passed was rerun.
3. **A host-path defect was found and fixed before the campaign (amendment A3):** a call arriving after the pipeline
   was closed waited for the ten-minute operation timeout instead of being refused. Four lines and a regression test;
   no numerical path changed; every gate ran on the tree that contains it.
4. **The negative and tamper suites record HEAD `e1d77b09`**, a checkpoint commit after the final-tree commit
   `bc428d8b`; the generator verified that every pinned file is identical between those commits and the accepted
   revision.
5. **The accepted-configuration baseline `p3-a3-r1` ran beside `tsc` and `eslint`** (586.6 s; the quiet repeat gave
   583.2 s). The regression gate uses both and passes either way.
6. **Root-cause evidence on the unfixed configuration** was gathered at 10–24 concurrent cold processes, more than a
   campaign uses; the limits of attributing the historical event are in `PARITY_ROOT_CAUSE.md` §8.
7. Other disclosures of the study (an edit and extra CPU load during the first fresh-context loop, a void first run of
   a tracing tool, an interrupted benchmark group) are in `RESEARCH_RECOVERY.md`, "Disclosures".

## 8. Evidence files bound by the record

The record stores the sha256 of each file; the independent verifier re-hashes all 34.

| Gate | File | sha256 |
|---|---|---|
| R1 the defect reproduces with the default engine (the record stress: wrong evaluations, record-only ones among them, against a ground truth equal to Phase 4's diagnostics) | `results/rootcause/record-stress-truth-default.json` | `52086bcbeb023267…` |
| R1 the same stress without Maglev: zero wrong evaluations | `results/rootcause/record-stress-truth-no-maglev.json` | `dde5422b7a1431cd…` |
| R2 the fresh-context loop on the final candidate, fixed configuration (≥ 2,000 fresh CPU workers on the original first chunks, ≥ 150 fresh GPU contexts on the original batch; zero mismatches; the device response identical in every cycle) | `results/rootcause/fresh-loop-final/summary.json` | `44a1d3c5bd580432…` |
| R2 the fresh-context loop's configuration record | `results/rootcause/fresh-loop-final/config.json` | `dc82adb9ec39e912…` |
| R3 the host-path cold soak on the final candidate, fixed configuration (fresh host pipelines decoding one real device response of the original batch; zero mismatches) | `results/rootcause/host-soak-final.json` | `a7282aca0bbc0885…` |
| A1 final binary (reproducible; built from this tree; kernels identical to the accepted Phase 3 and Phase 2 binaries) | `results/final-binary.json` | `5bba8cab4d2d5644…` |
| A2 offline codec and host-pipeline equivalence (Phase 3 captures of real Phase 2 batches) | `results/final/offline-check.json` | `b81b9e81e74ec60f…` |
| A3 parity campaign through the final host path (zero mismatches, coverage, determinism) | `results/parity/final/SUMMARY.json` | `0761a3502ffd34db…` |
| A3 the original failing run D24-fund with Phase 4's own seeds on the final candidate (r1: 1,561 of 1,561 identical) | `results/parity/original/D24-fund-p4seeds-r1.json` | `e80e3148eb13c065…` |
| A3 the original failing run D24-fund with Phase 4's own seeds on the final candidate (r2: 1,561 of 1,561 identical) | `results/parity/original/D24-fund-p4seeds-r2.json` | `45b1540437a39190…` |
| A3 Assignment 3 sealed finalists (GPU = CPU reference; D24 = sealed figures) | `results/parity/final-finalists.json` | `2d2de9fcbb7ba3be…` |
| A4 Assignment 3 C19 broad1 search replay = sealed record (final binary, host path; run 1) | `results/optimizer/compare-final-a3-r1-vs-sealed.json` | `8a2d06929af332a1…` |
| A4 Assignment 3 C19 broad1 search replay = sealed record (final binary, host path; run 2) | `results/optimizer/compare-final-a3-r2-vs-sealed.json` | `97960684f6ed8327…` |
| A4 Assignment 2 C19 base search replay = sealed record (Growth fixed; final binary, host path) | `results/optimizer/compare-final-a2-r1-vs-sealed.json` | `ec572536fb0fbae2…` |
| A4 Assignment 3 C19 broad qualification replay = sealed evidence (final binary, host path) | `results/optimizer/compare-final-a3q.json` | `2f1060573c359309…` |
| A4 fixed-seed mini-optimization CPU = GPU (final binary, host path) | `results/optimizer/compare-final-mini-cpu-vs-gpu.json` | `72b5fdd5c64f6e5f…` |
| A4 fixed-seed mini-optimization GPU = interrupted + resumed GPU | `results/optimizer/compare-final-mini-gpu-vs-resumed.json` | `51ba0cc2c7caa059…` |
| A4 fixed-seed mini-optimization host workers 1 = 8 workers | `results/optimizer/compare-final-mini-w1-vs-w8.json` | `be641f2b3e97f8ea…` |
| A4 fixed-seed mini-optimization serial path (host workers 0) = 8 workers | `results/optimizer/compare-final-mini-w0-vs-w8.json` | `aa4454d67177b6e0…` |
| A5 compute-sanitizer (memcheck, racecheck, initcheck, synccheck) on the final binary, requests from the host path | `results/sanitizer-final/sanitizer.json` | `89a31d37ebbb3b87…` |
| A6 negative tests on the accepted pinned files (final binary) | `results/policy/negative-final.json` | `791755bac65d07d7…` |
| A6 source-tamper tests in a sandbox clone on the accepted pinned files (every mechanism; out-of-band pin) | `results/policy/tamper-final.json` | `de6ba1d1dd14ccce…` |
| A7 bounded 30–35 min reliability run (p0: no failure, parity samples, repeatability) | `results/sustained/p0/summary.json` | `0f5c81257561f663…` |
| A7 bounded 30–35 min reliability run (p1: no failure, parity samples, repeatability) | `results/sustained/p1/summary.json` | `8656164f92da5a62…` |
| A8 npm test (= baseline + new tests; known failures only) | `results/tests/npm-test.json` | `ae42bec21cf20e83…` |
| A8 root TypeScript check: 0 errors | `results/tests/npm-test.json` | `ae42bec21cf20e83…` |
| A8 Strategy Lab regression (CPU engine, suites, state untouched) | `results/tests/strategy-lab.json` | `86794b8c2fdf0647…` |
| A9 final candidate regression benchmark (Assignment 3 replay within ±3 % of the accepted engine) | `results/optimizer/regression.json` | `da7ad2460180f84c…` |
| A10 atomic dataset export: the 4 × 25 shared-directory race on the final binary (100 of 100 loads verified, no partial read) | `results/final/race-d19-atomic.json` | `ba5dcd09b3d9783d…` |
| A10 atomic dataset export: writers killed at random instants (no partial target; every directory complete after a restart) | `results/cache/kill-d19.json` | `94a05e10b8d07e9d…` |
| A10 atomic dataset export: two datasets under one name at the same instant (one published, explicit conflicts) | `results/final/conflict.json` | `5d9807476a4d72a8…` |
| A10 atomic dataset export: byte identity with the previous exporter on every door, window, episode and fixture | `results/cache/dataset-identity.json` | `a02c39a0f58de38f…` |
| A10 isolation and failure tests under concurrency on the final candidate (I1 kill + resume, I2 stop + resume, I3 server killed, I4 host-worker fault, I5 VRAM refusal, I6 namespace guards — each neighbour identical) | `results/isolation/i6.json` | `1d23d908b144c87a…` |
| P5 policy, enforcement, host-pipeline and dataset-export tests | `results/policy/policy-tests.txt` | `0c2cc5e3340f6a8e…` |

**RISK-ENVELOPE PILOT NOT STARTED.**
