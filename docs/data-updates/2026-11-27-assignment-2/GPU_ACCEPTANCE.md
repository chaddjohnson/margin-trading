# Official GPU re-acceptance: GPU Phase 9 (ACCEPTED)

**Result:** `config/gpu-backend/acceptance.json` is **ACCEPTED**, and the independent verifier reports **VERIFIED**
with rebuild and device.
- **The record:** study `research/gpu-phase9`, written 2026-11-28T03:19:01Z by `tools/gpu-phase9/accept.ts`, 48 of 48
  gates PASS. sha256 `9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4`.
- **Supersedes:** GPU Phase 7's `bb0e3fcf…`.
- **Out-of-band pin:** `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase9-9ebb33ce.json` (0444)
  and a `pins.jsonl` line.
- **Procedure:** `docs/gpu/PARITY_CHECKLIST.md` §2, a full cycle. The study's protocol is `research/gpu-phase9/PROTOCOL.md`
  (standard 5.0.0, scope diagnostic, preflight PASS, frozen by `results/protocol-freeze.json` `da4c9a40…`). Its
  amendments are A1 and A2 (`research/gpu-phase9/AMENDMENTS.md`).

## 1. Identity of what was accepted

| Item | Value |
|---|---|
| Source revision | `a63baf40268eeaf989debfa66ecadbc1f69ecd64` (tree `919db402…`), branch `integration/research-date-boundaries-a2`; the record's commit `4f82149c` |
| Candidate content | `feature/research-date-boundaries` `f2c414ef`, plus the TSLA fix merge `efd7454b`, the legacy-test fix `00e1425c`, the Phase 9 study and tooling, and `toolchain.ts` (default binary gb9). Staged trailing stops are excluded |
| Evaluation digest | `b51f6189d82fbd8b597a77e6044a46807099296e2fbc34faa69cdccb1fb22db8` (CPU closure 96 files, CUDA 7, host 12) |
| Binary | `research/gpu-phase9/build/gb9` `36dcc25109a9ffada8951ba02d7745fe242e8bf781d268b68f4b57ddf7ab36aa`. Reproducible (built twice, equal). Device code and SASS byte-identical to the accepted gb7 `cb2ff30b…` (whose kernels equal gb5's) |
| Device / runtime | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, CUDA 13.2 (user-space toolkit 13.2.86), Node v24.21.0 / V8 13.6.233.17, every process `--no-maglev`. `nvcc -O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true -Xcompiler -ffp-contract=off` |
| Standard | 5.0.0 `68487de7…` (registered, current) |
| Pinned historical GPU input | FULL's GB2 dataset `6e977ccd6104acf1…` = Phase 7's accepted export, built from the R1 byte prefixes VGT `2ee06310…` (53,395,054 B) and GDX `77dba9b2…` (80,036,100 B). Every real-data door is identical (D1) |

## 2. The campaign (`research/gpu-phase9/chains/final.sh`, 2026-11-27T23:00:42Z → 2026-11-28T03:18:03Z)

| Gate | Content | Result |
|---|---|---|
| S0, S1, S2 | the superseded record's pin; the change is exactly the declared one (CUDA unchanged; CPU closure: `csv.ts`, `evaluation.ts`, `vg-d1-growth-joint/{context,data}.ts` changed, `canonicalPrefix.ts` and `researchRanges.ts` new; host: `toolchain.ts` only); 11 carried entries, each with its unchanged-file condition | PASS |
| A0 | every evidence record under `--no-maglev` | PASS |
| B1 | the final binary (above) | PASS |
| **D1** (new) | 38 real-data parity runs (D19, D21, D23, D24, FULL, the regime windows, the episodes): GB2 dataset, per-symbol data hashes, sessions, first and last session = Phase 7's | **38/38** |
| A1 | parity campaign, 54 runs through the host path | **144,795 subjects, 0 mismatches** (141,600 random genomes, 20 doors, fixtures, determinism across batch sizes, input order and 0/1/3/12 host workers) |
| A2 | Assignment 3's 48 sealed finalists on D24 | 96/96 identical, 48/48 equal to the sealed C24 figures |
| R1–R3 | risk-envelope delivery through the EvalLab (edge-D21, edge-D24, finalists-D24, random-D19) | 0 differing values, records, decisions or rankings. 1,000/1,000 archived Assignment 3 records reproduced per edge door |
| A3 | sealed optimizer replays: Assignment 3 C19 broad1 plain and with the envelope requested (64 lanes, 1,242,714 fresh evaluations each), Assignment 2 C19 base (128 lanes, 2,196,920) | identical to the sealed records (0 diffs) |
| **A4: the fixed-seed engineering mini-optimization** | on D19 with fixed seeds: GPU with 8, 1 and 0 host workers; CPU; a graceful stop plus resume; a SIGKILL plus resume; risk on GPU and CPU; two jobs at once. Each run had 16 lanes and 30,749 archived evaluations | **9/9 comparisons identical** (0 row, configuration or lane differences) |
| Q1 | qualification and ranking parity on the risk mini archives, both policies | 30,749 evaluations, 0 differing |
| A5 | compute-sanitizer memcheck (leak check), racecheck, initcheck, synccheck | 0 errors; 97/97 identical each |
| A6 | bounded reliability, two concurrent processes × 32 min | 0 failures; parity samples 2,304 (p0), 0 mismatches; repeat 0 mismatches; CPU-scored 0 |
| E3 | negative suite on the final binaries | 73/73 |
| E4 | source-tamper suite in a sandbox clone, T1–T23, out-of-band pin | 23/23, baseline OK (second attempt; amendment A1) |
| E7 | Strategy Lab portfolio parity, all six catalog candidates (New L0, N/original among them) | ALL VERIFIED |
| E8 | `npm test` and root tsc | 1,934 tests, 1,927 pass, 3 fail (only the record-in-force tests before the record), 4 skipped; tsc 0 errors |
| E9 | Strategy Lab typecheck, lint, Vitest, scratch build, Playwright | 334/334; Playwright 82 + 1 failure (the known `candles.spec.ts:439` timing race), then 83/83 on the one allowed rerun (second attempt; amendment A2) |
| E10 | integrity against `f2c414ef` | 5/5: 23,824 tracked research files unchanged; 31 study preflights (26 PASS, 5 stale-blocked before the record); seals as at baseline; the B4/B5 forward freeze's failure list unchanged; the evaluation groups changed only in `toolchain.ts` |
| P1, P5 | policy text (standard 5.0.0 current); the policy, enforcement, layout, host-path, dataset, jobs and risk-envelope tests | PASS |

## 3. The fixed-seed mini-optimization: scope (brief §7.2)

- **Which workload:** the established acceptance workload of Phases 2–7 (`tools/gpu-phase9/job.ts --job mini`), and
  nothing more.
  - Door D19, which is development data: the C19 cutoff, sessions through 2019-12-31.
  - Phase 2's G7 schedule: eight Assignment 3 broad cells × 2 replicates, screen 96, the reduced island and rung counts
    of `miniBudget`.
  - Seeds derived from the study name.
- **No post-R1 data:** no door ends after 2026-10-30, so the extended data was never read.
- **No use of the results:** the archives were only compared with each other by identity. No candidate was reported,
  ranked, promoted or fed into any study.
- **No expansion:** the workload is the same as Phase 7's: the same runs, comparisons and budget.

## 4. After the record (`research/gpu-phase9/results/post-record/`)

| Check | Result |
|---|---|
| `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 9ebb33ce…` | **VERIFIED** (pinned files, digest, evidence, source revision an ancestor, reproducible rebuild, device) |
| Record-in-force tests: `policy.test.ts`, `enforcement.test.ts`, `preflight.test.ts` | 51/51 pass (MERGE GATE, "re-verifies independently" and "every study … passes the preflight" now pass) |
| Live official gate `official-preflight.ts --study research/gpu-phase9 --door D24` (purpose official-optimization) | **GATE OPEN** (job, attestation; 18/18 parity subjects identical to the CPU engine) |
| The same with purpose `diagnostic` | REFUSED (exit 3): "purpose diagnostic is not official optimization" |
| The same without `--no-maglev` | REFUSED (exit 3): `preflight-runtime` |
| `npm run research-preflight -- --all` | 32/32 PASS (the 5 previously blocked official studies pass) |
| `npm run tsla -- verify` | 163 sealed records ok, 0 failed |
| Full `npm test` after the record | `TESTS_AND_INTEGRITY.md` |

## 5. Failed attempts and corrections (evidence preserved)

1. **E4, attempt 1 (02:06:43Z): 22/23, "baseline NOT OK".**
   - **Cause:** the tamper sandbox's fixture study, copied from Phase 7, pinned standard 3.0.0. Since 4.0.0, the
     preflight's no-evasion rule correctly refuses that for a new optimization manifest.
   - **Fix:** the fixture adopts the current standard, R1 and the data pins (amendment A1, `97ae35cd`). No enforcement
     code, case or expectation changed.
   - **Preserved:** `research/gpu-phase9/results/superseded/tamper-attempt-1/`.
2. **E9, attempt 1 (02:57:09Z): Vitest 4 failures, 9 Playwright tests skipped.**
   - **Cause:** the campaign worktree's environment. Its `node_modules` were symlinks into the main checkout, so the
     implementation-fingerprint traces saw paths outside the checkout. It also had no copy of the Study 8 import.
   - **Fix:** amendment A2 (`b2d9f634`): real copies, and a read-only import copy. No code, test or expectation changed.
   - **Preserved:** `research/gpu-phase9/results/superseded/tests-attempt-1/`.

Every other step ran once. Steps 1–26 were not rerun.

## 6. Limitations

- **The binary is not in git:** `build/` is git-ignored, as in every phase. `verify-acceptance.sh --rebuild` rebuilds
  it byte-identically from the pinned sources. After the integration it was also placed at
  `research/gpu-phase9/build/gb9` in the main checkout (`INTEGRATION.md`).
- **Diagnostics are not acceptance evidence:** the diagnostic GPU/CPU checks of Assignment 1 are not part of this
  acceptance. This record is the official result.
- **Staged-stop paths are not covered:** this acceptance covers the tree without staged stops. The staged-stop branch's
  Phase 8 record is valid for that branch's own tree only.
