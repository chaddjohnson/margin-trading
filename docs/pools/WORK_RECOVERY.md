# Work recovery checkpoint — runnable B4/B5 pool configs and the prospective shadow comparison

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root.

- **Updated:** 2026-10-26T16:05Z. **Status: TASK COMPLETE.** Committed `158f3aca`, `b9a928bb` and (at the user's request, this point) the final commit with S13, the freeze record and the third check. Prospective observation count = 0; not yet evaluated.
- **Task:** operationalization, not research. No optimization, re-ranking or new evaluation of the diverse-d1
  finalists on 2024–2026. Brief: the user's message of 2026-10-26 ~12:19Z ("Implement runnable B4/B5 pool phenotypes
  and freeze prospective shadow comparisons"). Its content is summarized in §2 below. The full text is only in the
  conversation, and §2 is the on-disk record.
- **Authority:** `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` — FROZEN 2026-10-26T14:49:38Z, file sha256
  `0dabd97e2b3d50fe9946b773bd9b845b07da1934eb4a797ecc9a59af129c3be2`, body
  `407a669b2bfd524502be2afe465c9de0383052ea85dd7ba50df5637c40b0e6f0`; binds PROTOCOL.md `f2bca114…`, B4 `5bfc4fd5…`,
  B5 `92d73fc3…`, 134 code files (digest `c5134fb0…`; calendar append-only), data pins, market events, environment,
  cutoff states. Written before any post-2026-10-13 bar existed. **Never re-run `forward freeze`; never edit the bound
  files** (any change makes forward commands refuse; a change needs a new protocol version).
- **Complete:** S0–S5: configs + loader; CLI (`npm run pools -- list|show|validate|fixed|portfolio|compare|costs|verify|research …`); regression (`verify` 64/64); tests `src/pools/tests/pools.test.ts` (all pass; B4/B5 anchor tests ~25 s each); research archive exported + verified.
- **Incomplete:** real freeze (S6, deliberately last: it binds the code closure), S8 docs, S9 review/final. Protocol text written: `research/prospective-b4-b5-shadow/PROTOCOL.md` (not yet frozen; editable until the freeze).
- **Running process:** none.
- **Next action:** none in this task. Future (user-authorized): obtain post-2026-10-13 bars, `npm run pools -- forward import --from <folder> --snapshot <id> --source "…"`, then `forward report --snapshot <id>`. To extend the NYSE calendar past 2026-12-31: append dates only (frozen rule).
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
| S6 prospective protocol + write-once freeze | complete: frozen 2026-10-26T14:49:38Z (body `407a669b…`) | `research/prospective-b4-b5-shadow/PROTOCOL.md`; `npm run pools -- forward freeze` → `PROTOCOL_FREEZE.json` (binds protocol, pools, books, code import-closure of `src/app/pools.ts` + `src/pools/cli.ts` + `src/pools/forward/cli.ts`, canonical pins, market events, B4/B5 cutoff state × fixed/portfolio-frozen/portfolio-symmetric) | must precede any snapshot import (import refuses without it); challengers deferred (option b) |
| S7 forward data pathway + forward report + no-data smoke | implemented + unit tests pass (`src/pools/tests/forward.test.ts` 8/8) | `src/pools/forward/{protocol,freeze,data,metrics,report,cli}.ts`; `npm run pools -- forward status|freeze|import|report` | no-data smoke after the real freeze |
| S8 docs runbook | complete | `docs/pools/README.md` (every command run; figures checked against `evaluations/pools/all/*/summary.json`), README.md link; acceptance log `evaluations/pools/acceptance/` (commands.txt: 11 commands, exit 0) |
| S10 funded-trade ledger (user request after 158f3aca) | complete (uncommitted) | `src/pools/trades.ts` (+ report.ts/cli.ts): table on stdout by default for `fixed`; `trades.csv` (36 cols) + `trades.json` replace `lots.csv`; 12 reconciliation checks pass on B4/B5 `all` (exact vs summary and frozen controls); open position shown with `--end 2025-12-31`; tests 16/16; README section | logs `evaluations/pools/acceptance/fixed-B{4,5}-ledger.log`, `fixed-B4-to-2025-12-31.log` |
| S9 tests/typecheck/lint, independent reviews, final report | complete: npm test 571/571, tsc 0, eslint 0; reviews 1–3 in docs/pools/reviews/; no-data forward report + status verified (`evaluations/pools/acceptance/forward-*.log`) | `evaluations/pools/acceptance/{npm-test,tsc,eslint}.log` |

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

## 6. Independent review (docs/pools/reviews/independent-review.md, 13:30Z, code of 158f3aca) — dispositions

Verdict: not safe to freeze yet. Planned fixes (all before the freeze; the code is not frozen):
- M1 forward re-run check fails (firstWrittenAt inside the hashed body) → verify the seal on the stored object, then
  compare content without firstWrittenAt; test.
- M2 the calendar ends 2026-12-31 inside the bound code → bind src/lib/calendar.ts by an append-only rule (frozen
  holidays/early closes/coverage kept; only later dates may be added; the rest of the file unchanged) instead of its
  raw hash; protocol text.
- M3 portfolio dollar comparison distorted by different cutoff equity → compare forward returns and strategy P&L ÷
  cutoff equity; matched borrowing on borrowing dollar-days ÷ cutoff equity; drop raw-dollar equity deltas.
- M4 incomplete sessions accepted → refuse sessions on or after the import day (New York) and sessions without a
  bar in the last 5 regular minutes across the members.
- Minors: honour --out in costs/compare runs and protect data/; bind the pool file sha, distributions manifest,
  the `pools` npm script and record Node; check frozenReference.manifestSha256; record controls/ledger hashes in
  verify; hash-check the snapshot distributions file and validate its rows; check the snapshot's freezeBodyHash and
  run the full freeze verification on import; lower the split screen to ±15% with an explicit --confirm-move;
  fix PROTOCOL.md statements (6 pinned files, yearly tables, whole-run minute %, evidence threshold in sessions);
  README "after the freeze"; cosmetic refusal text, schema comment, id validation, research leak check.
- Applied (S11, all tested): M1 (`checkOrWriteObservation`), M2 (calendar bound append-only: `normalizedCalendarHash`,
  `calendarAppendOnlyFailures`), M3 (forward return, strategy P&L ÷ cutoff equity, borrowing intensity; matched
  borrowing on intensity; no cross-pool dollar deltas), M4 (sessions before the import day; a bar in the last five
  regular minutes across members), minors (`--out` subfolders for costs/compare; protected `data/`/`src/`; freeze
  binds pool file sha, distributions manifest, `pools` npm script, records Node; manifestSha256 check; verify records
  source hashes; distribution rows validated and re-hashed; snapshot freezeBodyHash check; import runs full freeze
  verification; ±15% split screen + `--confirm-move`; evidence threshold 252 sessions; yearly forward tables;
  whole-run minute % shown; PROTOCOL.md aligned incl. boundary edge cases; README; cosmetic fixes).

## 7. Second review (docs/pools/reviews/second-review.md, 14:09Z) — dispositions (S12)

- MATERIAL forward daily % DD = percent of the largest-dollar fall → track the largest percent fall separately (the
  historical PercentTracker's definition); dollars and percent each with their own peak/trough.
- Ledger labels: interest-days column (session-date days, the interest basis); profitable/losing/largest win-loss
  over closed trades only (open separately); drawdown peak/trough in New York time; rate from the run (no hard-coded
  11%); open lot: `exitNewYork` empty + `markedAt`; "the XRT lot" wording.
- M2 rest: calendar normalization tolerates trailing comments on date lines; unit test of normalizedCalendarHash.
- M4 rest: EVERY member must have a bar in the last 15 regular minutes (canonical 2024–2026: all members, all 698
  sessions, last bar within 2 minutes of the close); pure functions + unit tests for the today and close guards.
- M3 ladder: fractions 5…50% (0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50); exact-match (incl. 0 vs 0)
  handled as matched.
- Guards: distribution ex/pay dates must be NYSE sessions; yield plausibility (0 < amount/close_before ≤ 3%);
  through ≥ max ex-date and after the frozen coverage; declared split ratio checked against the observed move.
- Leftovers: compare --out per-mode folder; freeze binds src/app.ts, package.json "imports" map and
  package-lock.json; verify checks a pinned controls.json sha256 (`frozenReference.controlsSha256`); costs --mode
  validated.
- PROTOCOL.md: import vs report refusals; reports record the code digest/Node/calendar coverage (forward.json; code
  digest also in the observation body); limitations in report.txt and the no-snapshot report; --source in the import
  command; forward friction recorded in dollars and bps per side.
- README: commands that need data are marked as such; compare --out layout.

## 8. Third check (docs/pools/reviews/third-check.md) — dispositions (S13, before the freeze)

- Completeness guard override: `--confirm-complete SYMBOL:DATE` (recorded in the snapshot, like --confirm-move).
- `--distributions-through` must be ≤ the snapshot's last session and is refused without `--distributions`.
- PROTOCOL §8 states the bound code is the whole import closure (134 files incl. shared `src/lib`, `src/phenotype`)
  and that editing any of them, or package-lock.json, makes forward commands refuse until a new protocol version.
- Cosmetic: trades.json interest definition (interestDays), stale comment in metrics.ts, forward report row widths.
- Matched-borrowing ties at intensity 0 pick the lowest rung: harmless (all zero-borrowing rungs share one return);
  documented, not changed.
