# REPORT — Priority 1: bounded entry eligibility for VG #2 Balanced

**Conclusion: no useful benefit.** Under the frozen, D1-faithful rules, preserving opportunities refused for capital
almost never activates. In 2016–2024 it activates in only 2 of 60 grid settings (VGT, A = 20 sessions, E = 5%,
alone or with GDX), through one delayed entry. That entry made the shared-capital portfolio worse: −$28,244.67, with
the minute drawdown rising from $17,280.74 to $33,641.44. No setting qualified at any cutoff, so the frozen selection
keeps the control (OFF). The feature never activates in 2025–2026. Around nearby D1 parameters it is more often
harmful than helpful and raises tail drawdown.

Research only, not deployed. 2025–2026 is **validation on previously examined history**, not an untouched holdout.

## 1. What was tested

- **Control:** Study 8 rank #2 VG Balanced (`s8-vg-balanced`, `S8-VG-F24-3`). VGT `d1-bd80e32ee4` and GDX
  `d1-7b99d2833d`, with parameters as in the brief's table (verified in code against the resolved configuration).
  One $100,000 slot, no compounding, 11% simple interest (365 days), 5 bps per side, $0 commission, stops at the stop
  or the gapped open, accounting from 2016-01-04, arming from 2017-06-15, shadow books, first executable decision
  wins, same-minute ties alphabetical.
- **Variant** (PROTOCOL.md §4, frozen 2026-11-07T23:19Z, sha256 `9636fc1f…13b4`):
  - **Arming:** a refused genuine D1 signal arms one opportunity per ETF, with an immutable origin.
  - **Selectable window:** while age ≤ A completed sessions.
  - **Cancellation:** when the originating shadow trade closes, or when a minute's low falls below the setup's
    trailing low.
  - **Revalidation:** on a free slot, when D1's trigger ≤ close ≤ original decision price × (1 + E).
  - **Priority:** fresh signals first.
  - **Fill:** at the next trade, never at the refused price.
  - **Exits:** the delayed lot gets its own fill, shares, costs, interest, holding age and post-entry high, and its
    own D1 exits, independent of the shadow trade.
- **Grid:** OFF plus 60 configurations: {VGT, GDX, VGT+GDX} × A ∈ {1, 3, 5, 10, 20} × E ∈ {0, 1, 3, 5}%.
  Each configuration got an exploratory neighbourhood (its 3 × 3 grid block plus 16 seeded draws). Confirmation draws
  and the ETF-specific refinement were reserved for configurations that passed the exploratory gate; none did.
- **Chronology:** selection at four cutoffs (C19, C21, C23, C24) on physical data doors, each evaluated on the next
  non-overlapping period. C24 (the primary) was validated once on 2025-01-02 → 2026-10-30.

## 2. Control reproduction and OFF parity

| Run | Window | Net | Minute DD ($ / % of $100k) | Lots | Source |
|---|---|---:|---:|---:|---|
| Existing runner | 2016-01-04 → 2024-12-31 | $260,223.13 | $17,280.74 / 17.28% | 36 | `results/control/runner-dev-2024-12-31/` |
| Existing runner | → 2026-10-30 | $334,911.93 | $21,303.61 / 21.30% | 48 (1 open) | `results/control/runner-full-2026-10-30/` |
| Existing runner | → 2026-10-29 | $340,147.67 | $21,303.61 | 48 | reconciles with sealed Study 8: **PASS**, 48 lots, 0 mismatches |

- **Engine parity:** the new adapter with eligibility OFF equals the control engine with **zero tolerance** on all five
  doors (D19, D21, D23, D24, FULL). That covers every trade, lot, signal, daily mark and drawdown, through both the
  plain configuration and the study's own evaluation path.
- **Runner files:** the runner's own writers produce byte-identical `lots.csv`, `trades.csv`, `signals.csv`,
  `daily.csv`, `yearly.csv`, `monthly.csv` and `lots.txt` from the adapter's result.
- **Cash:** the summaries reconcile to the cent (`results/parity/`).

## 3. Phase A — the missed opportunities (development, D24)

The control's 50 shadow signals produce **14 refusals**. All are "pool occupied" by a lot: none by a reservation and
none for any other reason. VGT has 7 and GDX has 7. All fall in 2020-03-12 → 2022-12-20, 11 of them in 2022.
Ledger: `results/audit/phase-a-refusals.csv`.

| Within n sessions | 1 | 3 | 5 | 10 | 20 |
|---|---:|---:|---:|---:|---:|
| slot available | 2 | 3 | 6 | 9 | 12 |
| … and shadow trade still open | 2 | 3 | 6 | 9 | 10 |
| … and not yet invalidated (no low below the trailing low) | 0 | 0 | 0 | 1 | 2 |

- D1 buys a 0.1% (GDX) or 0.9% (VGT) rebound off the trailing low, so most refused setups print a new low within
  minutes to days. GDX 2022-06-28 did so one minute after its decision.
- A first-order band check, ignoring capital cascades, found **one** selectable case: VGT 2022-05-20, only at A = 20,
  E = 5%.
- The biggest refused shadow winner was VGT 2020-04-02 (+$51.6k hypothetical shadow net). By the time the slot freed
  it was 13.7% above its decision price, outside every bounded cap.
- Shadow profits are hypothetical: no rule reads them, and no delayed entry could have earned them.

## 4. The development search (C24, door D24) and the selection

- **58 of 60 grid settings are identical to OFF.** They form one ledger class with OFF; they never fund a delayed
  entry.
- **Two settings activate:** VGT A20 E5% and VGT+GDX A20 E5%. They share one ledger.
- **Nothing qualifies.** Both have Δ < 0, and their exploratory neighbourhood median Δ is $0: 60–70% of neighbours
  are unchanged and the p10 is −$28,253. No confirmation draws were therefore drawn, the refinement trigger did not
  fire, and **OFF is retained**: no qualifying improvement.
- **No lower-risk choice exists:** no setting lowers the drawdown.

| Development 2016–2024 | OFF (control) | VGT+GDX A20 E5% (reference, never selected) |
|---|---:|---:|
| Net (all realized) | $260,223.13 | $231,978.47 (**Δ −$28,244.67**) |
| Max minute DD ($; % of the $100k pool) | $17,280.74; 17.28% (2020-03-19) | **$33,641.44; 33.64%** (peak 2022-06-02, trough 2022-09-26, recovered 2023-03-23) |
| Max daily DD | $15,683.83 | $31,690.32 |
| Lots (won / lost) | 36 (25 / 11) | 40 (26 / 14) |
| Total losses; largest loss | −$24,257.87; −$6,455.48 | −$45,699.61; −$10,131.21 |
| Gross before costs; friction; interest | $294,829.02; $3,745.62; $30,860.27 | $267,060.68; $4,131.53; $30,950.68 |
| Exposure (sessions with a lot / from first eligible) | 706 / 1,899 (37.2%) | 705 / 1,899 |
| VGT lots, net | 4, $47,255.10 | 3, $37,971.33 (one delayed) |
| GDX lots, net | 32, $212,968.03 | 37, $194,007.14 |
| Refusals; opportunities | 14; — | 11; 10 armed: 1 filled, 8 invalidated, 1 cancelled when its shadow trade closed; 1 not armed (VGT already holding its delayed lot) |
| 2022 P&L | $30,086.81 | $1,842.14 |
| Every other year | identical | identical |

### Matched comparison: one delayed entry, a $28k cascade (the harmful/displacing example)

| Part | Lots | Net |
|---|---:|---:|
| Unchanged lots | 34 | $251,462.01 |
| **Delayed (late) entry** | 1 | −$522.64 |
| New fresh lots (funded only because the slot was free at other times) | 5 GDX | −$18,960.89 |
| Displaced control lots | 2 VGT | +$8,761.13 (lost) |
| **Δ** (= late + new − displaced) | | **−$28,244.67** |

1. **Refusal.** VGT's deep-decline signal on 2022-05-20 13:47 ET ($330.54; trigger $330.00; trailing low $327.06)
   was refused while GDX lot 20 held the slot.
2. **First free minute.** GDX exited on 2022-06-09 at 09:42 ET. VGT was then 8.2% above its decision price, above
   the 5% cap, so the opportunity stayed pending.
3. **Delayed entry.** On the CPI morning of 2022-06-10, VGT's 09:30 minute closed at $344.63, inside the band. The
   opportunity was selected at age 14 and filled at $345.50 on the next minute's open, 4.5% above the refused price.
4. **The late lot itself.** VGT fell 9.2% to a low of $313.66 by 2022-06-16 (MAE −$9,438.93). The lot exited at the
   15-day maximum hold on 2022-06-27 for −$522.64.
5. **Displacement.** While it held the slot it displaced the control's VGT lots of 2022-06-13 (−$330.27) and
   2022-07-01 → 08-26 (+$9,091.40).
6. **New losers.** Its exit freed the slot for five GDX signals in a falling gold-miner market: 06-28 −$10,131.21,
   07-12 −$5,078.79, 07-26 +$1,622.89, 08-04 +$665.59 and 08-18 −$6,039.38. These are exactly the GDX refusals the
   control had made in that summer.

**Successful example (report-only, at a nearby D1 parameter point, not the control's):** D1-stress point explore #9,
development, `results/diagnostics/D24/examples/explore-9/`.

- A VGT signal refused on 2022-12-22 at $316.65 was funded on 2022-12-27, age 2, at $317.41.
- It rode the 2023 rally to a trailing-stop exit on 2023-08-09 for **+$27,554.39**.
- It displaced four GDX lots (+$18,094.56 in that point's control), so the portfolio gained +$9,459.83 and the
  drawdown fell from $20,514 to $17,281.
- It shows the feature's only upside mechanism: holding one ETF for seven months while the other ETF's signals are
  refused.

## 5. Chronological selection (expanding windows; development only)

| Fold | Training through | Activated | Qualified | Selected | Evaluation period | Selected P&L | Δ vs OFF |
|---|---|---:|---:|---|---|---:|---:|
| C19 | 2019-12-31 | 0 | 0 | OFF | 2020–2021 | $132,702.13 | $0 |
| C21 | 2021-12-31 | 0 | 0 | OFF | 2022–2023 | $63,208.84 | $0 |
| C23 | 2023-12-29 | 2 | 0 | OFF | 2024 | $28,624.54 | $0 |
| C24 | 2024-12-31 | 2 | 0 | OFF | 2025–2026 (validation) | $74,688.80 | $0 |

- The procedure's behaviour is stable: it keeps OFF at every cutoff.
- Report-only counterfactual: had the reference been chosen at C21, its 2022–2023 P&L would have been $34,964.17
  (Δ −$28,244.67), with an evaluation-period minute drawdown of $33,641.44 against $17,027.86.
- VG #2's own D1 parameters were selected on data through 2024. These folds therefore test only the incremental
  eligibility choice, conditional on a retrospectively chosen control; they are not a nested reoptimization.

## 6. Robustness diagnostics (report-only; `results/diagnostics/D24/diagnostics.json`)

**D1 stress, paired.** The reference was compared with OFF at the same nearby D1 values, using Study 8's N1 radius
on all 16 coordinates. No D1 point is ever selected.

| Family | n | Median Δ | Mean Δ | p10 / p90 Δ | Better / unchanged / worse | Activated | DD p90: OFF → variant | Share < $35k: OFF → variant |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| exploratory | 64 | $0 | −$7,650 | −$28,829 / $0 | 9% / 52% / 39% | 31 | $23,615 → $35,854 | 100% → 89% |
| confirmation | 128 | $0 | −$8,149 | −$29,095 / +$2,031 | 13% / 48% / 38% | 66 | $24,448 → $36,396 | 96% → 88% |

- Across the 97 activated points, the delayed lots themselves earned **+$496,313** in total.
- The portfolio's median Δ at those points was nevertheless **−$14,505** (mean −$15,801). Displacement costs more
  than the delayed entries earn: the portfolio-path comparison the brief asks for, not the sum of extra trades.
- Clipping: GDX's Y = 0.1% sits on the box's lower bound. 43 of 64 and 89 of 128 points clip at least one coordinate.

**Friction and execution stresses** (reference − OFF): Δ stays between −$28,022 and −$29,359 under 10 or 20 bps per
side, 14% interest, next-open stop fills, +25 bps stop slippage, and delayed entries filled at the fill minute's high.
That high equals the open on 2022-06-10, so the last stress changes nothing. The drawdown rises by $16,335–18,371. At
20 bps the reference's drawdown is **$35,975, above the ceiling**.

**Invalidation sensitivity** (post-audit, report-only; the grid on D24):

- Measuring the invalidation on minute closes changes nothing: the same 2 settings activate, with the same result.
- Removing the trailing-low invalidation activates 52 of 60 settings (15 distinct ledgers): 45 worse, 7 better
  (at most +$522); median Δ −$24,768, worst −$87,849; maximum drawdown $23,978.
- A looser rule would not rescue the feature.

**Concentration.**

- Pool-level episodes span both ETFs; a new episode starts after a gap of more than 10 sessions.
- The reference differs from OFF in exactly one episode, 2022-05-12 → 2023-04-19 (32 lots, Δ −$28,244.67). No
  episode has positive Δ.
- **Causal rerun:** blacking out that episode for both runs makes them identical (Δ $0).
- Arithmetic removal of the configuration's best episode (2020-03-12 → 04-15, Δ $0) leaves Δ at −$28,244.67, and the
  causal rerun agrees.
- The whole effect is one 2022 cascade.

## 7. Validation (FULL, once; `results/validation/validation.json`, guard = `FROZEN_SELECTION.json` `8aba2d5e…4943`)

| 2025-01-02 → 2026-10-30 | OFF (frozen selection) | Reference (report-only) |
|---|---:|---:|
| P&L (marked equity change from the 2024-12-31 close) | $74,688.80 (2025 $47,239.34; 2026 $27,449.46) | $74,688.80 (Δ $0) |
| Minute DD, reset at the boundary | $21,303.61 | $21,303.61 |
| Delayed entries in 2025–2026 | — | 0 |
| Whole run 2016 → 2026-10-30: net; minute DD | $334,911.93; $21,303.61 | $306,667.26 (Δ −$28,244.67); $33,641.44 |

- **Tests V1–V3** apply to role holders, and there were none. The selection (OFF) is the control itself.
- **Report-only perturbations on FULL:**
  - The reference's 32 confirmation draws, and all 128 paired D1-stress points, show 2025–2026 Δ = $0. No point
    activated in 2025–2026.
  - Every friction stress also shows 2025–2026 Δ = $0.
- **Not exercised:** the control had no refusals at all in 2023–2026, a fact known before the protocol (disclosed),
  so validation could not exercise the feature.
- **Endpoint:** the actual validation endpoint is 2026-10-30, the latest complete session of both ETFs. November and
  December 2026 were not tested.

## 8. Verdict, uncertainty and what was not tested

- **Verdict: no useful benefit.**
  - **No attractive historical trade-off:** the only activation lost money and doubled the drawdown.
  - **No stable improving neighbourhood:** the neighbourhoods are flat at $0, with a −$28k tail.
  - **No chronological evidence of benefit:** every cutoff kept OFF.
  - **Validation could not test it:** the feature had no opportunity in 2025–2026.
- **Evidence is thin either way:** one delayed entry in nine years at the control's own parameters, so the
  development result rests on one episode. The D1 stress is the broader evidence: 97 activations across 192 nearby
  parameter sets, which still lean negative.
- **The −$28k is mostly not the delayed trade:** it comes from the capital it displaced (Section 4). Any future
  delayed-entry design is a capital-allocation decision, not an entry-signal decision.
- **Not tested:**
  - joint retuning of the D1 parameters with eligibility (excluded by the brief);
  - funding closed shadow trades or re-confirming after a new low (a synthesized signal, excluded);
  - preemption or extra capital;
  - Growth;
  - other ETFs;
  - November–December 2026.
  - The ETF-specific refinement was reserved but never triggered.

## 9. Execution, memory and tests

- **Containment:** every heavy stage ran in its own transient unit (`MemoryHigh=44G`, `MemoryMax=48G`,
  `MemorySwapMax=0`), verified in each job log as `app.slice/vgbe-*.service`, `memory.high 47244640256`,
  `memory.max 51539607552`, `swap.max 0`. Stages were serialized.
- **Memory:** peak cgroup use 5.21 GB (validation, 6 workers); searches 3.2–4.6 GB; pilot 0.85 GB per worker job.
  No memory-pressure stop, no OOM event (`results/memory/*.jsonl`).
- **Pilot** (`results/pilot/PILOT.md`): graceful stop, worker SIGKILL and unit SIGTERM each resumed to records
  identical to an uninterrupted run. It found and fixed one infrastructure defect (AMENDMENTS E1).
- **Tests:** 25 study tests pass (`src/vg-balanced-entry-eligibility/tests/`). They cover:
  - OFF parity;
  - arming, expiry, extension cap, trigger boundary and invalidation;
  - shadow-close cancellation;
  - the closing-print fill;
  - fresh-versus-delayed priority and simultaneous candidates;
  - duplicate prevention;
  - late-lot initialization and divergence;
  - period accounting and causality;
  - specs, seeds, selection rules and the archive binding.

  Resume equivalence is verified by the pilot. Repository suite: see Section 10.
- **Disclosures and amendments:** R1–R3 before the freeze, E1–E2 after; no rule or criterion changed after the freeze.
  - The prior knowledge of zero 2023–2026 control refusals.
  - The vacuous first kill test.
  - The pre-freeze audit field-name defect.

## 10. Repository checks

- **Full `npm test`** (in a capped unit): 1,255 tests, 1,244 pass, 7 fail, 4 skipped. All 7 failures are known and
  pre-existing:
  - six tests that open `src/app/allin-original.ts` (lowercase), which does not exist on this case-sensitive
    filesystem;
  - the Study 7 runner's reconciliation, pinned to a 2026-10-29 data end.

  The count is 1,230 + this study's 25 tests.
- **Static checks:** `tsc --noEmit` is clean, and ESLint reports no errors in the study code.
- **Unresolved defects:** none known in the study code.

## Priority 1 review — decision before Priority 2

Questions for the user and ChatGPT:

1. Do you accept "no useful benefit" for D1 entry eligibility at VG #2's fixed parameters? It rests on one
   development activation (−$28,245 with a near-ceiling drawdown), flat neighbourhoods, and D1-stress evidence that
   leans negative (median $0, 38–39% worse, tail drawdown up).
2. Is the trailing-low invalidation the right definition of "the setup is still valid"? Dropping it (report-only)
   makes the feature active and clearly harmful (45 of 60 settings worse), so this does not look like a reason to
   reopen the question.
3. The cost came from capital displacement, not from the delayed trade. Should Priority 2's joint D1 + Growth pool
   for VGT treat slot allocation (which family or ETF gets the slot, and for how long) as an explicit design
   question, rather than adding delayed entries?
4. Should a separately approved follow-up ever retune D1 jointly with eligibility, or close this feature for VG #2?
5. Validation could not exercise the feature, because the control had no 2023–2026 refusals. Is a prospective watch
   for refused opportunities worth anything, or is the question closed?

**Priority 2 — a jointly optimized D1 + Growth pool for VGT (one capital pool, using both families, with
single-family systems as controls) — has not been started** and awaits your decision.
