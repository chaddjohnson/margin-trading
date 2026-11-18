# IMPLEMENTATION_AND_TESTS

Research-only code on the research branch; nothing is merged into `main`; no engine, study, standard or method file was
edited. Run every command from the repository root with Node v24.21.0.

## 1. Code locations

| File | Role |
|---|---|
| `src/vg-l0-risk-metrics/ledger.ts` | engine-independent ledger types (lots, fills, per-instant marks, the portfolio path) |
| `src/vg-l0-risk-metrics/engine.ts` | read-only adapter: `replay` (Assignment 3's evaluation path, RC 2's `runWithControls2` with detail and minute marks, its D1 book cache bypassed), `toLedger` (independent re-marking of every lot from the raw minute bars), `reconcile` (the rebuilt path against the engine) |
| `src/vg-l0-risk-metrics/metrics.ts` | pure metrics: portfolio path, strict drawdown (the engine's tracker semantics), windows, realized / banked drawdowns, floor shortfall, per-lot values, the exact drawdown attribution, per-trade risk, realized loss clusters, losing streaks, tails |
| `src/vg-l0-risk-metrics/stops.ts` | exit-state reconstruction (trailing, protective, initial stop; retention), stressed protected values, the bounded-loss-exit flag, `verifyExit` (gate G-S) |
| `src/vg-l0-risk-metrics/bundle.ts` | the per-run bundle (windows, episodes, exposures with stop states, gap fills, clusters, trades) |
| `src/vg-l0-risk-metrics/margin.ts` | the account-margin scenario model (excess, ratios, first-deficiency shock by bisection and closed form, the illustrative core-plus-slot account) |
| `src/vg-l0-risk-metrics/selectors.ts` | the experimental selectors P2, P2b and ablations (frozen in PROTOCOL §9) |
| `src/vg-l0-risk-metrics/subjects.ts`, `archive.ts`, `doors.ts`, `records.ts`, `context.ts` | pinned reads of the audited studies, door opening with this study's log, write-once seals |
| `tools/vg-l0-risk-metrics/*.ts` | stage runners: `freeze`, `baseline`, `audit` (+ `audit-options`), `exclusions`, `population`, `select`, `margin-scenarios`, `tables`, `common` (guard and code digest) |
| `src/vg-l0-risk-metrics/tests/*.test.ts` | synthetic and historical tests |

## 2. Tests (gate G1) — `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-risk-metrics/tests/*.test.ts`

**23 tests, 23 pass** (2026-11-18T06:42Z; including the A3 truncation test). Every expected value is hand-computed in the
test beside it. **Full repository suite** (`npm test` in unit `vgl0rm-npm-test`, 06:34:16Z → 06:38:28Z, log
`results/logs/npm-test.log`, git-ignored): **1,677 tests, 1,666 pass, 4 skipped, 7 fail** — exactly the 7 known
pre-existing failures (six open the missing lowercase `src/app/allin-original.ts` in `intraday-study`, `minute-optimizer`
and `trailing-buy` ×4; one is Study 7's runner parity at the 2026-10-29 data end). Assignment 3 recorded 1,654 tests with
the same 7; the 23 added are this study's.

| Brief §1.6 case | Test |
|---|---|
| $100k → $250k → $210k: $40k peak giveback, $110k realized gain, $0 principal loss | `metrics.test.ts` (and the same path with 5 bps and 11% interest, exact ledger arithmetic) |
| $100k → $60k: $40k principal loss and $40k equity DD | `metrics.test.ts` |
| A winner gives back profit then crosses below break-even: separate, no double counting | `metrics.test.ts` (giveback 30k + principal 10k = DD 40k, residual 0) |
| Multiple closed losses separated by winners | `metrics.test.ts` (realized DD 8k ≠ naive Σ losses 13k; two clusters, one unrecovered) |
| Profit still open at a cutoff; carried trades | `metrics.test.ts` (banked DD 0 while the marked DD is 18k; the reset window counts the carried giveback) |
| Shared-pool transitions | `metrics.test.ts` (overlapping lots refused; back-to-back lots accumulate the banked net) |
| Partial exits | `metrics.test.ts` (retention-style 50% sale: realized part kept in the lot P&L) |
| Stops after entry, entry-day activation, late stops, overnight gaps, halts; no lookahead | `stops.test.ts` (pre-fill spike ignored; armed vs unarmed trailing stop; unconditional protective stop; a level above the close fills from the close; retention's partial protection); `historical.test.ts` (the C21 stop state identical on D21 and D24); the engine-level entry-day, gap and halt mechanics are Assignment 2/3's 35 synthetic RC 2 tests, unchanged; every real exit is re-derived by gate G-S below |
| Interest over weekends and holidays | `historical.test.ts` (every consecutive session-close pair of New L0's D24 lots: Δinterest = principal × 0.11 × calendar days ÷ 365; > 50 weekends and ≥ 1 long weekend checked) |
| Price adjustments | FULL reconciliation across VGT's 8:1 split on 2026-04-21 (gate G0; every minute mark equal) |
| Exact accounting reconciliation | `historical.test.ts` and gate G0 |
| Determinism | `metrics.test.ts`; gate G0 (two FULL replays, identical ledger hash) |
| Strict tracker semantics | `metrics.test.ts` (equal values never move the peak; recovery = first strictly higher value, the engine's rule) |
| Margin closed forms, giveback effect, concentration | `metrics.test.ts` (3 tests) |

## 3. Reconciliation to the established ledger and the gates

| Gate | What | Result |
|---|---|---|
| G0 | New L0 and N/original on FULL and D24 vs the published anchors; causality D24 vs FULL; determinism | **PASS** (`results/baseline/parity.json`) |
| Reconciliation (every replay) | rebuilt minute marks = every engine minute-mark change (value and instant), DD and its peak/trough instants, Σ lots = net, each lot's canonical MAE and best mark | 0 discrepancies; e.g. New L0 FULL 547,752 mark changes, D24 458,837 |
| Parity of the 51 audit subjects | FULL net, DD, lots, 2025–2026 P&L and reset DD = sealed, to the cent | 51/51 |
| G-S (stop reconstruction) | every historical trailing-stop, protective and initial-stop exit re-derived from the bars | 1,532 exits of the audit subjects and 35,289 exits of the 2,520 member replays (training doors): **0 failures**; for the audit subjects every trailing exit was also armed by the net rule |
| S3 neighbourhood parity | regenerated selection families reproduce the sealed p90 DD and worst-10% mean to the cent | 8/8 on D24 (after amendment A1; see §5) |
| S4 screen regeneration | the regenerated screen proposals reproduce every lane's screen-reason counts | 512/512 lanes, 0 mismatches |
| G5a | each of the 2,520 member replays equals its archived evidence (net, DD, realized, unrealized, lots, conservative net, worst MAE, occupancy) | **PASS** |
| G5b | P0, P1 and RA2 re-derive every sealed primary of Assignment 3 (all cutoffs and populations) | **PASS** |
| G5c | the re-chained P0/P1/RA2 slices and sequential paths equal the sealed records to the cent; Assignment 3's labels re-derived | **PASS** ("risk improvement" in L, B and F reproduced) |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` (repository) and a scratch tsconfig covering `src/` and `tools/` of this study | clean |

**Cost reconciliation.** Entry cost = q₀ × (entry price − raw) ≈ $49.98 per lot (5 bps inside the entry fill); every
exit fill's price = raw × 0.9995 (minus modelled slippage); the liquidation-equivalent value subtracts exactly the open
shares' 5 bps. A lot's realized net and the engine's net agree to floating point for all lots.

**Causality.** The metrics read only the ledger of a run on a given door; at a cutoff every input comes from the cutoff's
own door (members) or from bars up to that close (stop states; tested D21 vs D24). The next-session interest uses the
calendar only.

**Independent arithmetic.** The re-marking is an independent implementation of the pool's mark formula from raw bars; the
drawdown tracker is reimplemented and compared with the engine's; the selectors P0/P1/RA2 are Assignment 3's code; the
labels rule is replicated and re-derives Assignment 3's sealed labels.

## 4. Reproducibility

Every stage runner checks the adoption preflight and the frozen protocol hash (`tools/vg-l0-risk-metrics/common.ts
studyGuard`), writes write-once sealed JSON (0444, sha256 in `results/seals.jsonl`, 24 records) and refuses a rerun.
Replays are deterministic (no RNG; neighbourhood draws regenerated with Assignment 3's seeds). The exact commands are in
`RUN_COMMANDS.md`. Resources: in-process runs used 1.9–3.6 GB RSS (`memoryRssMb` in each record); heavy runs in transient
systemd units inside `vgl0rm.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0 at the slice); the largest
concurrent load was 7 units (≈ 8.5 GB slice memory observed); no OOM, no restart.

## 5. Incidents, failures and fixes (kept, not hidden)

1. **Dry-run defects fixed before any seal:** the windowed drawdown helpers ignored the window end for whole-run windows
   (caught by G0's causality check in a dry run); `Math.min(...)` over a 100k-element mark array overflowed the stack
   (replaced by loops); the engine's first flat mark (an empty change list records 0) is matched explicitly; the strict
   tracker's recovery rule was aligned with the engine (a test's expectation was wrong, not the engine).
2. **A1 (amendment):** two neighbourhood runs stopped at the S3 parity gate on 1-cent differences (unrounded vs the
   instrument's cent-rounded DDs); fixed to the instrument's convention; nothing was sealed by the failed runs.
3. **Slice-net comparison** in `select.ts folds` compares to the cent (the record's period figures are cent-rounded); a dry
   run had compared at 1e-6 relative on a small 2024 slice net.
4. **Code-digest timing:** records written by the units that were running while `population.ts` was refactored and new
   files were added (06:05–06:15Z) carry the digest of the tree at their END; the replay and metric modules did not
   change during those runs (`notes/incidents.md`). Since 06:07:10Z the digest is taken at process start.
5. **Post-seal type-only edits:** `stops.ts verifyExit`'s entry-session branch now returns NaN level fields (a branch never
   taken in any run), and two tool type annotations; no behaviour changed.
6. **A2 (amendment):** budget accounting: ≈ 6,133 fresh simulations of the 6,200 cap; two per-use lines exceeded by dry
   runs and the overlay's ledger replays.
7. Scratch engineering checks (no records) opened D24 and FULL before the sealed runs; every opening by study code is in
   `results/doors.jsonl`.

## 6. Limitations of the measurement

Minute OHLCV (no intraminute order; marks at minute closes); liquidation value at the minute close with the 5 bps model
cost (no spread, impact, queue, halt or latency model beyond the stress gaps); interest on the funded principal only; no
distributions; the exact attribution relies on the single funded slot; the stop reconstruction assumes the next session is
the next weekday (holidays ignored: one to three days of interest).
