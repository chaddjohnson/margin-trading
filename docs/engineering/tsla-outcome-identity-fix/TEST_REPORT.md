# TEST_REPORT — TSLA outcome identity fix

- **Machine and environment:** Apollo; Node 24.21.0; every Node process ran with `--no-maglev`. The GPU had no compute
  process at the start (an RTX 5090 is used by `npm test`'s live GPU tests).
- **How the checks ran:** in one contained unit, `tslafix-tests` (MemoryHigh 44G, MemoryMax 48G), through
  `chains/tests.sh`, from 2026-11-26T14:19:43Z to 2026-11-26T14:31:15Z (11.5 min).
- **Logs:** `evidence/tests/*.txt`, each ending in `exit=<code>`; the chain log is `evidence/tests/chain.log`.

## 1. The defect reproduced, then fixed

| Step | Command | Expected | Actual |
|---|---|---|---|
| Red, before the fix | `node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=spec src/tsla-d1-growth/tests/outcome.test.ts` (the reproduction-only version of the file) | fails: `validation` null; `developmentOnly` empty | **2 / 2 fail**: `actual: null` (expected `{V1: true, V2: true, V3: true}`); `actual: []` (expected `['G d375f8105c15ad72', 'C rc1-99c7a25e9144531e']`), exit 1 (`evidence/repro-before-fix.txt`) |
| Green, after the fix | the same command | pass | 2 / 2 pass. The final file has 25 tests, all pass |

## 2. Regression and integration checks

| # | Check | Command | Expected | Actual |
|---:|---|---|---|---|
| 1 | Focused suites | `node --test` over `src/research-outcome/tests/*`, `src/tsla-d1-growth/tests/*`, the reused modules' suites (`vg-l0-n-successor`, `vg-l0-full-joint`, `vg-l0-risk-envelope-pilot`, `vg-l0-risk-envelope-stage-b`) and `src/gpu-backend/tests/policy.test.ts` (the merge gate) | all pass | **197 / 197 pass**, exit 0 (`focused.txt`) |
| 2 | New tests | `src/research-outcome/tests/identityJoin.test.ts` (12), `src/tsla-d1-growth/tests/outcome.test.ts` (25) | all pass | **37 / 37 pass** |
| 3 | Full suite | `npm test` | only the 7 known pre-existing failures | **1,879 tests: 1,868 pass, 7 fail, 4 skipped**, exit 1 (`npm-test.txt`). The 7 failures are exactly the known pre-existing ones: lowercase `src/app/allin-original.ts` ×6 (`intraday-study/tests/study.test.ts:19`, `minute-optimizer/tests/goldenMaster.test.ts:36`, `trailing-buy/tests/goldenMaster.test.ts:39, 43, 49, 58`) and Study 7's sealed data end ×1 (`study7-runners/tests/runners.test.ts:148`). Against the Priority 6 record (1,842 tests: 1,831 pass, 7 fail, 4 skipped), the +37 tests are exactly the new ones. **No new failure.** |
| 4 | Root type check | `npx tsc --noEmit -p tsconfig.json` | 0 errors | **0 errors**, exit 0 |
| 5 | Tools type check | `npx tsc --noEmit -p chains/tsconfig.tools.json` (the root tsconfig over `tools/tsla-outcome-identity-fix/*.ts`) | 0 errors | **0 errors**, exit 0 |
| 6 | ESLint | `npx eslint src/research-outcome src/tsla-d1-growth tools/tsla-outcome-identity-fix` | 0 errors | **0 errors**, exit 0. The 253 warnings are prettier layout warnings in unchanged study files. The new files have **0** warnings. `outcome.ts` went from 16 warnings to **9**, all on unchanged lines |
| 7 | Every study preflight | `npm run research-preflight -- --all` | all PASS | **30 / 30 PASS**, exit 0 |
| 8 | TSLA preflight | `npm run research-preflight -- --study research/tsla-d1-growth` | PASS | **PASS** (standard 3.0.0, scope optimization), exit 0 |
| 9 | TSLA sealed records | `GPU_POLICY_PURPOSE=official-optimization npm run tsla -- verify` | 163 ok, 0 failed | **`{"ok":163,"failed":[]}`**, exit 0 |
| 10 | GPU acceptance record | `bash tools/gpu-backend/verify-acceptance.sh` | VERIFIED | **VERIFIED** (every group hashes to its pins: cpu 94, cuda 7, host 12, policy 29 files; evidence 42; source revision ancestor; binary sha256), exit 0 |
| 11 | Fingerprint after | `node … tools/tsla-outcome-identity-fix/fingerprint.ts` versus `evidence/baseline-before.json` | only `src/tsla-d1-growth/outcome.ts` differs | **Only `outcome.ts` differs.** Every listed git tree and sealed file is identical; 163/163 seals verify; no working-tree change under `research/` (`fingerprint-after.txt`) |
| 12 | Replay rerun (second process) | `node … tools/tsla-outcome-identity-fix/replay.ts --out <scratch>/replay-rerun.json` | byte-identical | **sha256 `6b923ff2…` = the committed output**; 18/18 checks pass |
| 13 | Strategy Lab portfolio parity | `npm --prefix apps/strategy-lab run portfolio-parity -- --out …` | ALL VERIFIED | **ALL VERIFIED**: New L0 primary net $479,605.18 = target, minute DD $20,385.99 = target, 43/43 record checks; C4-refined, Original C4 and two VGT-only candidates the same (`portfolio-parity.json` `allVerified: true`) |
| 14 | Strategy Lab typecheck | `npm run typecheck` (apps/strategy-lab) | exit 0 | **exit 0** |
| 15 | Strategy Lab lint | `npm run lint` | exit 0 | **exit 0** |
| 16 | Strategy Lab Vitest | `npm run test` | exit 0 | **314 / 314 pass** (34 files), exit 0 |
| 17 | Strategy Lab build | `npx vite build --outDir <scratch>/dist --emptyOutDir` (never the live `dist`) | exit 0 | **exit 0** (82 modules, into the scratch `dist` only) |
| 18 | Strategy Lab Playwright e2e | `STRATEGY_LAB_STATIC_DIR=<scratch>/dist npx playwright test`, with one rerun on failure | reported beside the gate (known timing races) | **81 / 81 passed on the first attempt** (4.4 min), exit 0; no rerun was needed |
| 19 | Strategy Lab live state | fingerprint of `state/strategy-lab/` before and after | unchanged | **unchanged** (`719ecb1a…` before and after; no Strategy Lab server was running) |
| 20 | Strategy Lab live `dist` | fingerprint of `apps/strategy-lab/dist` before and after | unchanged | **unchanged** (`7d703bc1…`, 4 files, before and after: `evidence/strategy-lab-dist-*.txt`) |

## 3. CPU/GPU and evaluation non-regression: why the CUDA backend was not recertified

This is a research-report-only change outside the accepted evaluation dependency graph. The evidence:

- **The GPU evaluation (compat) digest is unchanged.** It is `d1a2e490788fa5fa76a277719dfb623c2cc896de85cf95f739c3e3af184e233b`
  before and after, with group digests cpu `c8a9f416…`, cuda `d8899061…` and host `bfdcdfbb…` unchanged. The 113
  evaluation files (the CPU closure of the engine entrypoints, the CUDA sources and the host path) contain **no**
  changed or new file (`gpuEvaluationClosureTouchesFix: []`).
- **The pinned enforcement group is unchanged.** Its 29 policy files (`src/gpu-backend/compat.ts` `policyFiles`) and
  `ENFORCEMENT_EXTRAS` (`src/gpu-jobs/*`) contain none of the changed files, and `verify-acceptance.sh` reports
  VERIFIED both before (`evidence/verify-acceptance-before.txt`) and after.
- **The acceptance record is unchanged.** `config/gpu-backend/acceptance.json` is `bb0e3fcf…` (ACCEPTED, binary
  `cb2ff30b…`, RTX 5090 `GPU-ae5f222c…`).
- **No new search machinery.** The entrypoint audit (`policy.test.ts`, in `npm test` and in the focused run) passes.
  `src/research-outcome/` contains no search machinery.
- **The changed code is reachable only from the TSLA study's outcome stages.** They evaluate nothing ("no evaluation" in
  `main.ts`), and they are refused for the completed study (`REPORT.md` §6).
- **No dependency or lock file changed.** `git diff --stat 421e4c87 HEAD -- package.json package-lock.json apps config`
  is empty.

Strategy Lab's CPU simulation path is unaffected: `apps/` is unchanged, portfolio parity is ALL VERIFIED, and the live
state is unchanged (§2, rows 13–20).

## 4. Reproducibility of the corrected report-only outcome on a second clean run

The replay was rerun from a **clean shallow clone of the pushed fix commit**:
`git clone --depth 1 --branch fix/tsla-outcome-identity-join`, at commit `70f8bdf1…`. The clone had no untracked or
ignored files and no read-only seals (every file at mode 0664). `node_modules` was linked, and the six git-ignored
generated sources of `src/four-family/generated/` were copied in. The clone was removed afterwards.
Evidence: `evidence/clean-clone-run.txt`.

| Run | Command | Expected | Actual |
|---|---|---|---|
| 1. First run, in the working checkout | `node … tools/tsla-outcome-identity-fix/replay.ts` | 18/18 checks, written | sha256 `6b923ff290b6ccc6576aeb32c22272ea19449b1ad2929684cfe4899d98ed86c6`, 18/18 |
| 2. Rerun, separate process (regression chain) | `… replay.ts --out <scratch>/replay-rerun.json` | byte-identical | **identical** (`6b923ff2…`) |
| 3. Clean clone, default output (the committed file) | `… replay.ts` | `unchanged` | **`unchanged: … (identical bytes)`**, exit 0 |
| 4. Clean clone, fresh output | `… replay.ts --out <scratch>/clean-replay.json` | byte-identical | **identical** (`cmp` equal; `6b923ff2…`), exit 0 |
| 5. Clean clone, the new tests | `node --test src/research-outcome/tests/*.test.ts src/tsla-d1-growth/tests/*.test.ts` | the 37 new tests pass | **The 37 new tests pass** with every file at its fresh-clone mode; 54/55 overall |

The record holds no timestamp, host, path or file mode. It depends only on the input bytes (pinned sha256) and the code
bytes (recorded sha256).

**The one clean-clone failure is pre-existing and environmental.** It is `src/tsla-d1-growth/tests/study.test.ts:104`,
the study's own test: "research/vg-l0-full-joint/FROZEN_SELECTION.json is not sealed (read-only)". It reads Assignment 3's
sealed selection through `readSealed`, which requires mode 0444, and a fresh clone checks files out 0664. With that one
file set to 0444 inside the scratch clone, **55/55** pass. In the working checkout, where the seals are read-only, it
passes (§2 row 1). The new tests deliberately verify sealed inputs by sha256, not by file mode, so they pass in a fresh
clone.

## 5. Known pre-existing failures (not caused by this change)

| Test | Cause | Status |
|---|---|---|
| `src/intraday-study/tests/study.test.ts:19` | opens `src/app/allin-original.ts` (lowercase); the file is `allIn-original.ts` on a case-sensitive filesystem | pre-existing since at least 2026-11-06 |
| `src/minute-optimizer/tests/goldenMaster.test.ts:36` | the same | pre-existing |
| `src/trailing-buy/tests/goldenMaster.test.ts:39, 43, 49, 58` | the same | pre-existing |
| `src/study7-runners/tests/runners.test.ts:148` | Study 7's reconciliation applies only when the data ends on its sealed end, 2026-10-29; `data/VGT/data.csv` now ends 2026-10-30 | pre-existing since 2026-11-02 |
