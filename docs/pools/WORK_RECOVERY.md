# Work recovery checkpoint — runnable B4/B5 pool configs and the prospective shadow comparison

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root.

- **Updated:** 2026-10-26T13:25Z. **Status:** in progress. **Current stage:** S9 independent review RUNNING (agent; brief `docs/pools/reviews/independent-review.PROMPT.md`). The implementation was **committed at the user's request at this point** (before the review finished and before the real freeze); later changes need a further user-requested commit. Then fixes, then the REAL `forward freeze` (last), the no-data `forward report`, final checks.
- **Task:** operationalization, not research. No optimization, re-ranking or new evaluation of the diverse-d1
  finalists on 2024–2026. Brief: the user's message of 2026-10-26 ~12:19Z ("Implement runnable B4/B5 pool phenotypes
  and freeze prospective shadow comparisons"). Its content is summarized in §2 below. The full text is only in the
  conversation, and §2 is the on-disk record.
- **Authority:** no frozen protocol of its own yet. The prospective protocol will be frozen write-once at
  `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` (stage S6) **before** any post-2026-10-13 bar is read;
  none exists on disk now.
- **Complete:** S0–S5: configs + loader; CLI (`npm run pools -- list|show|validate|fixed|portfolio|compare|costs|verify|research …`); regression (`verify` 64/64); tests `src/pools/tests/pools.test.ts` (all pass; B4/B5 anchor tests ~25 s each); research archive exported + verified.
- **Incomplete:** real freeze (S6, deliberately last: it binds the code closure), S8 docs, S9 review/final. Protocol text written: `research/prospective-b4-b5-shadow/PROTOCOL.md` (not yet frozen; editable until the freeze).
- **Running process:** the independent review agent (background; read-only).
- **Next action:** when the review reports: save it verbatim to `docs/pools/reviews/independent-review.md`, fix correctness defects (code is NOT frozen yet), re-run tests, then `npm run pools -- forward freeze` → `npm run pools -- forward report` (no-data) → `forward status` → final git status + report to the user. If the review agent is gone without a report, relaunch it with the same brief.
- **Never:** commit/push/merge without the user's explicit request; broker access, orders, credential reads (`.env`)
  or downloads; edit sealed records of any earlier study (`research/d1-robust-pool-discovery/`,
  `research/d1-diverse-pool-discovery/`, …), frozen phenotype JSONs, `data/`, splits, partitions or distributions;
  backtest any diverse-d1 finalist on data after 2023-12-29.

## 1. Environment and baseline (task start, 2026-10-26T12:23Z)

- Branch `research/trailing-buy-four-family-optimization`, `HEAD` `943886d4`, working tree clean.
- Node v24.21.0 (`export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`).
- Baseline hashes:
  - 64 canonical `data/*/data.csv`: sha256 of their `shasum` list `335a8450…` (per-file list as in
    `research/d1-diverse-pool-discovery/results/baseline/data-csv.sha256`, verified equal 10:53Z);
  - `config/phenotypes/D1/` GDX `ed98c23c…`, KRE `6b8889e2…`, VGT `3e77a419…`, XBI `453c4fd0…`, XRT `d7b7f222…`;
  - splits `e5bde427…`, distributions `3b4342eb…`, partitions `43893f3d…`.
- Frozen references used read-only:
  - `research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json` `16c91895…` (configurations S0 = B4,
    P-add-GDX = B5);
  - its `results/evaluation/evaluation.json` `fc10c508…` (window 2016-01-04 → 2026-10-13, summaries) and
    `results/evaluation/runs/{S0,P-add-GDX}/{fixed,portfolio}-{0,2,5,10}-lots.csv` (frozen per-lot ledgers);
  - `research/joint-16-etf-d1/results/controls/controls.json` `2bd521dc…` (B1/B4/B5/C0 `all` anchors).

## 2. The brief (on-disk summary)

1. B4 (default; All-lowDd shadow: VGT primary, XBI/XRT/KRE lowDd) and B5 (leading incumbent; B4 + GDX
   `portfolioAware`) as JSON pool configs, loaded by name through a maintained CLI. The configs need:
   - one shared funded slot and a constant non-compounding $100k per funded trade;
   - 11% simple interest and 5 bps per side (0/2/10 selectable);
   - per-book immutable phenotype references with hashes.
2. Fixed `all` runs that reproduce **to the cent**: B4 net $284,244.74 / max minute DD $28,659.34; B5 $486,207.77 /
   $26,509.97 (5 bps). Then the 20% portfolio anchors under the frozen dividend convention: B4 $3,608,484.05
   (34.65%), B5 $5,410,976.72 (29.67%).
   - Reports: text + JSON + funded-lot CSV.
   - Commands: `compare B4 B5` and cost overrides.
   - Trade-level identity against the frozen lot ledgers where they exist.
3. Archive the 15 unseeded diverse-d1 finalists (8 J-u + 7 T-u) from the sealed `assessment.json` as research-only
   JSONs, verified by deep comparison. Provide list/show; no backtest after 2023; no registry install.
4. A frozen prospective shadow protocol (observations strictly after 2026-10-13), B4 vs B5 mandatory.
   - Challengers: either a mechanical frozen subset or defer. Defer if continuous state would need 2024–2026
     evaluation.
   - Carried state at the cutoff, a forward DD peak reset, and portfolio borrowing efficiency.
   - A versioned additive data pathway that never alters canonical `all`. With no new data, "prospective
     observation count = 0; not yet evaluated".
5. Tests (schema, regression, single slot/fixed notional/ties, freeze refusal, boundary carryover, no-data smoke),
   docs runbook, an independent read-only review, a final `Commands I can run` section. No commit.

## 3. Plan and stage table

| Stage | Status | Output | Notes |
|---|---|---|---|
| S0 inspect | complete | — | existing: `npm run portfolio-aware-d1 -- run --config S0\|P-add-GDX --mode fixed --dataset all` (thin report, research names); engine `runNAllocator` (`src/portfolio-aware-d1/nbook/engine.ts`), loader `loadNUniverse`; frozen books `frozenBenchmarkPhenotypes()` (`src/joint-16-etf-d1/benchmarks.ts`) |
| S1 pool schema + B4/B5 JSON + loader | complete | `config/pools/{B4,B5}.json`, `src/pools/{schema,load}.ts`; algorithmic hashes B4 `5bfc4fd5…`, B5 `92d73fc3…` |
| S2 CLI fixed/portfolio/compare + reports | complete | `src/pools/{cli,run,report}.ts`, `src/app/pools.ts`, npm script `pools` (no `.env`), registry line in `src/phenotype/strategies.ts` (COMPATIBILITY.md regeneration pending) |
| S3 regression to the cent + trade identity | complete | `npm run pools -- verify` (`src/pools/verify.ts`) → `evaluations/pools/verify/verify.json` `40b0b400…`: 64/64 PASS (summaries = frozen controls at 0/2/5/10 bps both modes; lots + daily CSV byte-identical to `research/portfolio-aware-d1-optimization/results/evaluation/runs/{S0,P-add-GDX}/`; anchors to the cent). B5 summaries use the frozen `newSymbols: [GDX]` argument (bookkeeping field only) |
| S4 semantic tests (single slot, notional, ties) | complete | `src/pools/tests/pools.test.ts`: schema refusals (dup symbol, missing/out-of-box/off-grid/bare-number params, hash mismatch, policy/slots/compounding/notional/cost/interest/dividends), phenotype-drift and frozen-reference refusals, synthetic single-slot/constant-notional/refusal and same-minute alphabetical tie through `runPoolOn`, B4/B5 anchors on frozen all (skipped if data absent/changed) |
| S5 15 research-only finalists | complete | `npm run pools -- research export` (write-once) → `config/research-pools/diverse-d1-2026-10-26/` (15 JSON + `manifest.json` + `CATALOG.md`); `research verify`: all equal to the sealed `assessment.json` (hash-checked against FROZEN_SELECTION records); not loadable as pools |
| S6 prospective protocol + write-once freeze | protocol written; freeze pending (last step) | `research/prospective-b4-b5-shadow/PROTOCOL.md`; `npm run pools -- forward freeze` → `PROTOCOL_FREEZE.json` (binds protocol, pools, books, code import-closure of `src/app/pools.ts` + `src/pools/cli.ts` + `src/pools/forward/cli.ts`, canonical pins, market events, B4/B5 cutoff state × fixed/portfolio-frozen/portfolio-symmetric) | must precede any snapshot import (import refuses without it); challengers deferred (option b) |
| S7 forward data pathway + forward report + no-data smoke | implemented + unit tests pass (`src/pools/tests/forward.test.ts` 8/8) | `src/pools/forward/{protocol,freeze,data,metrics,report,cli}.ts`; `npm run pools -- forward status|freeze|import|report` | no-data smoke after the real freeze |
| S8 docs runbook | complete | `docs/pools/README.md` (every command run; figures checked against `evaluations/pools/all/*/summary.json`), README.md link; acceptance log `evaluations/pools/acceptance/` (commands.txt: 11 commands, exit 0) |
| S9 tests/typecheck/lint, independent review, final report | tests done (npm test 562/562, tsc 0, eslint 0 errors; new code warning-free); review running | `evaluations/pools/acceptance/{npm-test,tsc,eslint}.log` |

## 4. Decisions so far

- Reuse the N-book engine and loader exactly (no new simulator). A new thin `src/pools/` namespace keeps the frozen
  study code untouched; new npm script `pools` without `--env-file`.
- Challengers: planned **option (b)**, defer. The diverse-d1 protocol forbids evaluating its finalists after 2023
  and "one more look" (§22). Continuous state would need a 2024–2026 replay. A flat start needs a new, user-approved
  protocol. The protocol will document the deferred design.

## 5. Disclosures so far

1. Adding `src/pools/` and `src/app/pools.ts` changes the "every `src/**/*.ts`" code manifests that the completed
   d1-diverse (and similar) studies verify. Their guarded commands will now refuse. They are complete and must not be
   rerun; verify them at their own commits (e.g. `c123faa2`) as the guide §4 says.
2. `config/pools/B5.json` `frozenReference.newSymbols: ["GDX"]` reproduces the frozen controls' `summaryOf` argument
   (`newLots`/`newLotDays` bookkeeping). The first `verify` run failed on exactly those two fields until it was passed.
3. A sandboxed end-to-end forward test ran in the session scratchpad. It used a temporary freeze and a SYNTHETIC
   snapshot (2026-10-13 bars replayed onto 2026-10-14..16). It was deleted afterwards. Nothing from it is in the repo,
   and its figures are not observations.
