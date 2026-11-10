# REPORT — Priority 4A: standalone GDX Growth optimization

Research only, not deployed. One GDX Growth 1.4.0 book **alone** on one fixed **$100,000** principal budget (no D1, no
VGT, nothing competing for capital), no compounding, 5 bps per side, $0 commission, 11% simple interest (365-day
basis), canonical sizing, partial exits and minute marks. **DD** is the maximum **minute** drawdown of the marked net;
DD % = DD ÷ the fixed $100,000 (not peak equity). The ceiling is **$35,000**; historical compliance with it does not
guarantee future drawdown.

- **Development and every selection:** 2016-01-04 → 2024-12-31. **Validation:** 2025-01-02 → 2026-10-30 (the verified
  common complete endpoint), opened once after `FROZEN_SELECTION.json` was committed. It is **validation on previously
  examined history, not an untouched holdout**: Appendix A was chosen in the browser with 2025–2026 in view, and its
  standalone 2025–2026 result (+$87,340.87) was already known from Priority 5A.
- **Two lanes, separately accounted:** an **independent** broad search (canonical boxes, fresh seeds, no prior vector)
  repeated at C19, C21, C23 and C24; an **informed** lane at C24 only, seeded with Appendix A and 13 predeclared GDX
  vectors of Priorities 3B and 3C (P01–P13, chosen by a frozen development-role rule).
- Every figure comes from sealed records (`results/`); complete tables are in `results/tables/`. No charts (standard
  2.0.0 §7.7).

## 1. Answers to the brief's six questions

1. **Did standalone GDX Growth yield a qualified, useful phenotype?** **On development, yes; across later periods, no.**
   - 24 of the 30 selectable C24 members qualified (Q1–Q5). The frozen **primary** is an **independent** discovery,
     `C24/indep-rise#1 profit`: **$139,668.45** development net, centre DD **$17,483.62 (17.5%)**, fresh confirmation
     median $98,297.01, p10 $63,711.46, robust net $81,004.23, p90 DD $24,504.45, 1.8% of 384 draws above $35,000
     (Wilson 95% interval 0.9%–3.7%). It is also the independent lane's own primary.
   - The other roles (development trade-offs, all qualified):
     - **robust-profit:** `C24/informed#2 robust`, $110,158.59 / $18,840.58, the highest selection robust net
       ($96,585.45), confirmation p10 $87,325.89, p90 DD $24,404.70;
     - **balanced:** P08 (3C's G robust-profit vector), $121,008.75 / $18,840.58, p90 DD $19,486.53, no breach;
     - **lower-drawdown:** P09 (3C's G lower-drawdown vector), $100,056.17 / $17,744.39, p90 DD $18,467.59.
     P08 and P09 are vectors of the 3C partner search, which the user declined as pooled additions; here they are
     research controls that hold standalone roles, **not** approved additions.
   - **In 2025–2026 the primary made no trade at all** (validation P&L $0.00; it fails V1 by the frozen rule), and so
     did P08, P09, the independent robust and balanced holders, `informed#1` and P07. Only `informed#2 robust` traded
     among the role holders: **+$39,487.05** (reset DD $11,730.77; passes V1–V3). None of the primary's 128
     validation-window neighbours earned anything (0% positive; median and p10 validation P&L and p90 validation DD all
     $0.00).
   - **Read:** a set of locally stable 2016–2024 phenotypes whose entry rule fires only on violent rebound days; their
     development profit is real but rests on two episodes, and the procedure that picks them failed chronologically.
     Not a demonstrated, reliable GDX phenotype.
2. **Against Appendix A on matched evidence:**
   - **Development (common confirmation draws):** the primary **dominates** Appendix A: centre net +$85,851.95, centre
     DD −$226.34, confirmation p10 +$92,493.84, p90 DD −$30,901.01. Appendix A **fails Q3 and Q4**: p90 DD $55,405.46,
     **51.8%** of draws above $35,000 [46.8%, 56.8%], p10 −$28,782.38, worst $96,612.39. On Priority 5A's instrument
     (report-only) it reproduces 5A exactly (median −$10,436.77, p90 $52,938.76, 52.1%), and the primary reads median
     $94,956.50, p90 $24,466.22, 2.3%.
   - **Validation:** Appendix A **+$87,340.87** (reset DD $17,709.24; passes V1–V3); the primary $0.00. Over the full
     history Appendix A earns $141,157.37 (its native target, **reproduced exactly**: $17,709.96 DD, 19 trades 17 / 2,
     flat at the end) and the primary $139,668.45. Appendix A was chosen with 2025–2026 in view, so its lead there is
     previously examined history, not independent evidence; its neighbourhood stays fragile in validation too
     (validation-window neighbours: median +$56,255.70, but 66 of 128 whole-run drawdowns above $35,000).
   - Passing validation and beating a comparator are different questions: Appendix A passes and leads in 2025–2026;
     the primary is more stable locally on development but did nothing afterwards.
3. **Did the independent procedure work across earlier cutoffs?** **No — chronologically UNSUPPORTED** by the frozen
   rule.
   - Fold primaries over their slices: C19 → 2020–2021 **−$3,143.02** (slice DD $21,815.07); C21 → 2022–2023
     **−$15,359.64** (slice DD **$47,820.43**); C23 → 2024 +$1,965.63 (slice DD $9,927.33).
   - **Sequential path (2020–2024): −$16,537.03, sequential minute DD $47,820.43**, peak 2022-02-24 → trough
     2022-09-29, **not recovered** by 2024-12-31. Every independent role sequence also lost and breached
     (robust −$28,391.90 / $38,770.96; balanced −$28,151.40 / $38,770.96; lower-drawdown −$19,768.39 / $36,643.97).
   - **Why the worst DD:** the C21-selected book (Rise 4.9% over 191 bars, 5% trailing stop, no trend filter, no
     losing-hold limit, an ATR initial stop) traded GDX's choppy 2022 decline: between the peak and the trough it was
     stopped out on 2022-04-25 (−$7,884.10), 06-17 (−$8,931.43), 07-05 (−$9,108.98), 07-29 (−$9,653.86) and 09-20
     (−$7,638.18), against small winners. It had been selected on 2016–2021, whose profit came from 2020's rebounds.
   - Appendix A held fixed over the same slices (descriptive; chosen with later data): +$22,769.78 with a $17,709.96 DD.
   - The C24 primary's own development history (DD $17,483.62) is not the procedure's sequential DD; both are reported.
4. **Are the profits broad across episodes?** **No — two episodes carry them.**
   - The primary's largest winning episode is the **March 2020 crash rebound** (decision 2020-03-13, entries 2020-03-16 →
     2020-08-26, 3 lots): **$93,560.96, 67.0% of its development net**; its causal no-new-funding rerun over that
     episode leaves **$46,107.49** (DD $17,097.20). The second is 2022-11 → 2023-05 (+$44,877.25). It earned **$0.00 in
     2016–2019** (no trade in four years) and −$7,276.89 in 2024; 11 lots, 7 episodes, 16.6% exposure.
   - The same holds for every selected searched book and the 3C "G" priors: the March 2020 episode is 52–82% of
     development net, and most hold the same ≈ $40.9k–$42.9k lot entered on 16 March 2020 (`indep-rise#2` kept it to
     June: +$68,489.25); none but P09 traded in 2016–2019.
   - **The explaining filter:** every selected Rise book except P09 pairs a small Rise trigger (X 3.2–4.8% over 73–167
     bars) with **minimum-strength eligibility** demanding 7.3–8.9% above the fixed recent low. An ordinary crossing is
     invalidated at once ("strength below minimum": the primary's 67 of 76 development crossings, and all 9 in
     2025–2026), so the book enters only when a single bar jumps far above the low — the violent rebounds of 2020 and
     late 2022 — and then re-enters through classic-D1 continuations. Their trend filter is OFF; exits are a 5.5–7%
     trailing stop, a 11–30-day losing-hold limit (OFF in `indep-rise#3`) and an ATR initial stop (the primary also
     retains 81% at the stop with a 24-session SMA exit). P09 instead uses reset-renew eligibility behind a
     regression-slope trend veto and a 6-day losing-hold limit. **Report-only toggles confirm it:** with eligibility
     OFF these books trade 44–60 times and their development DD rises to $42,454.11–$63,333.27 (the primary: $99,290.39
     net, $52,495.44 DD, 44 lots); with continuation OFF their net falls to $43,038.55–$84,247.98 (the March 2020
     episode is a base entry plus continuations). Appendix A instead trades steadily: its trend filter and
     recovery gate defer most crossings (82 trend vetoes, 26 gate deferrals of 122), and it earned in every
     subperiod but 2022–2023.
5. **Which candidates go to 4B?** The **frozen 4B export set** (development-selected, fixed before validation, unchanged
   by it): the primary `C24/indep-rise#1 profit`, `C24/informed#2 robust`, P08, P09 and Appendix A (the exact
   control), with complete settings in `FROZEN_SELECTION.json` `export4B` and `results/tables/settings.md`.
   - **What remains unknown about pooled contribution:** everything that depends on sharing one slot with D1·GDX —
     which book's decisions are refused, which D1 trades a long or a dormant Growth book displaces or admits — can only
     be measured by complete pooled reruns (4B), never by adding standalone profits. Standalone, the export books are
     idle 83–94% of the time, which may leave room for D1·GDX, but their few entries coincide with GDX's most violent
     moves, when D1·GDX is likely to be active too. Their 2025–2026 dormancy would carry into a pool unchanged.
6. **Why did the search stop?** **On the frozen triggers, not on budget or resources.** Every lane at every cutoff
   ended on **"triggers not met"** (its last island added under $2,000 of best centre and robust net, under 1%
   hypervolume and no new competitive stratum); no lane reached its extension cap; every island stopped on its proposal
   budget (none on stagnation, so nothing **converged**); no resource guard or interruption occurred. Extensions fired
   in C19 rise (+2 islands), C21 breakout (+1), C23 rise (+1) and C24 rise and breakout (+2 each); the informed lane
   stopped at its 4 base islands.

## 2. What was run

### 2.1 Controls, engine and verification

- **Engine:** Priority 3's pooled engine, unchanged (evaluation digest `147cad7c…4e88`), with only Growth·GDX enabled
  (a single book is never refused, so the pooled run is the canonical standalone run). Native and harmonized
  conventions coincide for one Growth book: start 2016-01-04 without warm-up history, funding from the first session,
  no GDX split event (prices unadjusted).
- **Controls** (`CONTROL_MANIFEST.json`, sealed before any evaluation): **Appendix A** `07cac3329fc7a520` from Priority 3's
  sealed manifest; **P01–P13** by the frozen rule — every distinct GDX vector holding a formal C24 role in 3C's arms
  R, O, G (P01–P09, all Rise) and in 3B's inclusion-G/B role sets with a funded GDX book (P10–P13; three breakouts);
  **cash**. All are informed (chosen with later data or beside such anchors) and never entered the independent lane.
- **Engineering gates** (`results/parity/parity.json`, **294 checks, 0 failed**, sealed before the freeze):
  E1 Priority 3's digest; **E2 Appendix A = 5A's sealed centre field for field** ($53,816.50 / $17,709.96 / 13 lots);
  **E3 trade-by-trade parity with the canonical `runRiseTrading` + `summarizeSimulation`** for Appendix A, P01–P13 and
  64 random configurations (times, prices, net and interest per trade, minute and daily DD and their times, every
  daily mark); E4 prefix causality (54); E5 accounting identities (Σ lots = net, principal ≤ $100,000, one position,
  no refusal, cash = 0); E6 identity under inactive inputs; **E7 5A's standalone instrument reproduced exactly**.
- **Tests:** this study's 7 unit tests and Priority 3's 20 pool/space tests pass.
- **Pilot** (`results/pilot/PILOT.md`): every stage path; graceful stop, worker kill and whole-unit kill each resumed to
  lane results **identical** to the straight run; the duplicate-concurrent-key test passed (3C's hang does not recur).
  It found four defects, fixed before the freeze (R1) — notably the no-new-funding window, which now starts at the
  episode's first decision.

### 2.2 Search, budgets and stopping (`results/tables/coverage.md`)

| Cutoff / lane | New distinct centre proposals (base / cap) | Refinement moves | Fresh evaluations | Archive hits | Wall | Rung-1 feasible (rise / breakout) | Islands (rise / breakout) | Stop |
|---|---:|---:|---:|---:|---:|---|---|---|
| C19 independent | 18,432 (16,384 / 32,768) | 336 | 134,519 | 839 | 5.1 min | 3,085 / 2,904 | 6 / 4 | triggers not met |
| C21 independent | 17,408 | 357 | 119,128 | 879 | 7.6 min | 1,952 / 2,970 | 4 / 5 | triggers not met |
| C23 independent | 17,408 | 290 | 114,103 | 816 | 10.1 min | 1,991 / 2,629 | 5 / 4 | triggers not met |
| C24 independent | 20,480 | 351 | 148,937 | 814 | 14.9 min | 2,492 / 3,947 | 6 / 6 | triggers not met |
| C24 informed | 8,192 (8,192 / 16,384) | 504 | 86,524 | 2,530 | 6.7 min | 3,903 | 4 | triggers not met |
| **Searches** | **81,920** | 1,838 | **603,211** | 5,878 | 44.4 min | | | |

- **Qualifications:** 9,966 / 9,958 / 9,967 (12 members each at C19–C23) and 46,376 (31 members at C24) fresh
  evaluations; the validation neighbourhoods 1,152. **Total fresh backend evaluations ≈ 680,630** (cap 4,000,000),
  plus ≈ 100 in-process runs (fold evaluations, diagnostics, validation centres and stresses).
- **Accounting:** the base budgets were spent in full at every cutoff (16,384 independent, 8,192 informed); extensions
  added 2,048 (C19), 1,024 (C21, C23) and 4,096 (C24) independent proposals.
- **Coverage:** both entry cells and all 64 Rise / 32 breakout strata were screened at every cutoff. Cash-equivalent
  proposals (a book that never trades) were frequent among Rise (975–1,605 per cutoff) and rare among breakouts (3–168);
  they are never promoted. The useful results came from the **independent rise cell** (the primary) and the
  **informed islands** (`informed#1`, `#2`); the breakout cell's best C24 member earned $28,054.78, and no breakout
  reached any role. Insufficiently explored, by design: values outside the canonical boxes, and Cartesian corners of
  the strata beyond 64 per cell per cutoff.
- **The informed lane's refinement of Appendix A** never became feasible: its 128-draw p90 DD exceeds $35,000, and the
  best fine moves lowered the violation only by cutting its net to ≈ $11,900.

## 3. Development: the C24 selection (`results/tables/qualify-C24.md`, `tails-C24.md`, `stresses-C24.md`)

| Member | Lane / role | Centre net | Centre DD | Lots (episodes) | Sel. robust | Conf. median / p10 | Conf. p90 DD [95%] | > $35k | Worst-10% mean / worst | Gates |
|---|---|---:|---:|---:|---:|---|---|---:|---|---|
| **indep-rise#1 profit** | independent; **PRIMARY**, independent primary | **$139,668.45** | $17,483.62 | 11 (7) | $79,324.25 | $98,297.01 / $63,711.46 | $24,504.45 [$23,570.75, $25,997.29] | 1.8% | $30,398.59 / $52,843.53 | qualified |
| informed#2 robust | informed; robust-profit | $110,158.59 | $18,840.58 | 16 (10) | **$96,585.45** | $109,556.61 / $87,325.89 | $24,404.70 | 1.3% | $29,010.42 / $41,424.10 | qualified |
| P08 (3C G robust) | control; **balanced** | $121,008.75 | $18,840.58 | 11 (9) | $88,514.40 | $103,220.91 / $73,706.40 | $19,486.53 | 0.0% | $20,543.84 / $26,278.79 | qualified |
| P09 (3C G lower-DD) | control; **lower-drawdown** | $100,056.17 | $17,744.39 | 15 (7) | $57,766.45 | $64,414.26 / $51,566.47 | $18,467.59 | 0.0% | $20,056.23 / $26,949.11 | qualified |
| informed#1 profit | informed; informed actual-profit | $137,675.75 | $19,094.64 | 17 (13) | $93,420.14 | $104,559.85 / $84,901.94 | $22,300.52 | 0.3% | $25,469.83 / $38,023.05 | qualified |
| indep-rise#2 robust | independent robust-profit | $123,836.44 | $22,981.65 | 7 (3) | $88,642.71 | $100,361.96 / $73,590.61 | $25,257.26 | 1.6% | $30,796.19 / $54,461.80 | qualified |
| indep-rise#3 balanced | independent balanced, lower-DD | $92,656.70 | $17,744.39 | 7 (5) | $72,733.97 | $76,141.64 / $68,649.75 | $18,361.83 | 0.0% | $21,077.46 / $26,824.53 | qualified |
| P07 (3C G profit) | control | $126,406.73 | $18,500.58 | 12 (9) | $72,832.73 | $85,944.82 / $59,419.54 | $32,584.10 | 7.5% | $40,597.84 / $66,269.56 | qualified |
| **Appendix A** | exact control | $53,816.50 | $17,709.96 | 13 (9) | −$16,916.13 | −$8,973.86 / −$28,782.38 | **$55,405.46** | **51.8%** | $65,173.96 / $96,612.39 | **fails Q3, Q4** |

- **Pareto set** (13 qualified members) and every rank order: `qualify-C24.md`. 6 of 30 selectable members failed:
  Appendix A (Q3, Q4), P01 and P03 (Q4), and three one-lot "alternative" slots (Q4).
- **Against Appendix A** (descriptive, `versus-appendixA-C24.md`): three qualified members dominate it (the primary,
  `indep-rise#5` and P13); all 24 qualified members are locally more stable (higher confirmation p10, lower p90 DD);
  none of their p90 95% intervals overlaps Appendix A's.
- **Radius sensitivity:** at half radius no role holder breaches; at 1.5× the primary breaches in 9.4% of draws,
  `informed#2` 15.6%, P08 4.7%, P09 0%, Appendix A 51.6%. Perturbation frequencies on one history, not probabilities.
- **Costs and execution:** the primary keeps $138,418.42 at 10 bps, $135,922.11 at 20 bps, $136,673.54 at 14% interest
  and $137,540.48 with +25 bps stop slippage (next-open stops: not applicable to books with an initial stop or
  retention, which keep stop-level fills). Appendix A falls to $31,030.00 at 20 bps (DD $34,540.78).
- **Optional-rule toggles** (report-only, `stresses-C24.md`): eligibility OFF multiplies the selected Rise books' trades
  (44–60 lots) and raises their DD to $42,454.11–$63,333.27; continuation OFF cuts their net to $43,038.55–$84,247.98;
  the initial stop and loss buffer change little (except `indep-rise#3`, whose DD reaches $78,884.42 without its initial
  stop).

## 4. Development diagnostics (`results/tables/diagnostics.md`; D24; report-only)

| Subject | 2016–2019 | 2020–2021 | 2022–2023 | 2024 | Exposure | Holding mean / max days | Under water | Largest episode (share) → net without new funding in it |
|---|---:|---:|---:|---:|---:|---|---:|---|
| primary indep-rise#1 | $0.00 | $91,706.09 | $55,239.25 | −$7,276.89 | 16.6% | 48 / 99 | 51.2% | Mar–Aug 2020 $93,560.96 (67.0%) → $46,107.49 |
| informed#2 robust | $0.00 | $74,422.53 | $35,736.06 | $0.00 | 8.5% | 16.3 / 50 | 52.1% | Mar–Apr 2020 $74,063.18 (67.2%) → $36,095.41 |
| P08 | $0.00 | $73,431.00 | $47,577.75 | $0.00 | 6.1% | 17 / 48 | 51.7% | Mar–Apr 2020 $72,083.24 (59.6%) → $48,925.51 |
| P09 | $4,135.90 | $58,160.37 | $13,305.02 | $24,454.87 | 6.5% | 12.9 / 50 | 57.3% | Mar 2020 $59,365.26 (59.3%) → $40,690.91 |
| Appendix A | $31,046.72 | $16,718.19 | −$7,394.32 | $13,445.91 | 15.3% | 37.2 / 163 | 95.8% | Jun–Jul 2020 $16,899.85 (31.4%) → $36,916.65 |

- **Maximum drawdowns** (development, with the positions responsible): the primary's $17,483.62 runs 2020-07-27 →
  2020-09-24 (inside its 2020 lot #3, entered 2020-06-15 and partly sold under retention, and a September 2020 loss),
  recovered 2022-11-08; the others' fall
  inside the March 2020 crash (2020-03-19), recovered within weeks; Appendix A's $17,709.96 runs 2020-07-27 →
  2024-06-26 (a 2023 stop-out), recovered 2024-08-20 — under water 95.8% of sessions.
- **Causal reruns:** under the standalone virtual book the decisions do not depend on funding, so removing new funding
  in the top episode removes exactly that episode's profit (causal = arithmetic to the cent); only the drawdown path
  changes.
- **Decision funnel:** the selected books see 47–76 crossings in nine years and decide 11–16 times; 41–67 crossings are
  invalidated by minimum strength. Appendix A sees 122, defers 82 to its trend filter and 26 to its gate.

## 5. Chronological procedure tests (`results/tables/folds.md`)

Each cutoff re-ran the complete independent search and selection on its own door; each fold selection was sealed and
**committed before its slice opened** (C19 `3dc5719b`, C21 `f78cf6e8`, C23 `bab28345`).

| Fold | Fold primary (structure) | Training net / DD | Conf. p10 / p90 DD | Slice | Slice P&L | Slice reset DD |
|---|---|---:|---|---|---:|---:|
| C19 | `indep-rise#1 profit` (Rise 17.8% / 16 bars, no filters, hold 27 d, 11.3% stop; 5 lots, 92% of training net in one episode) | $79,776.54 / $27,493.55 | $11,060.80 / $33,359.05 | 2020–2021 | −$3,143.02 | $21,815.07 |
| C21 | `indep-rise#4 profit order` (Rise 4.9% / 191 bars, no trend filter, no hold limit, 5% stop, ATR stop; 25 lots) | $127,595.98 / $25,174.67 | $13,801.14 / $32,571.14 | 2022–2023 | −$15,359.64 | **$47,820.43** |
| C23 | `indep-rise#1 profit` (Rise 1.7% / 72 bars, regression-slope trend, reset-renew eligibility, 5% stop; 17 lots) | $133,766.46 / $18,191.42 | $12,528.32 / $28,077.13 | 2024 | +$1,965.63 | $9,927.33 |

| Sequential policy (2020–2024, switch charges included) | Net | Sequential minute DD | Peak → trough | Recovered |
|---|---:|---:|---|---|
| **Independent procedure** (each fold primary) | **−$16,537.03** | **$47,820.43** | 2022-02-24 → 2022-09-29 | no |
| independent robust-profit holders | −$28,391.90 | $38,770.96 | 2020-01-03 → 2021-09-29 | no |
| independent balanced holders | −$28,151.40 | $38,770.96 | 2020-01-03 → 2021-09-29 | no |
| independent lower-drawdown holders | −$19,768.39 | $36,643.97 | 2020-08-05 → 2023-04-27 | no |
| Appendix A fixed (descriptive; chosen with later data) | +$22,769.78 | $17,709.96 | 2020-07-27 → 2024-06-26 | 2024-08-20 |
| cash | $0.00 | $0.00 | — | — |

- **Verdict (frozen): UNSUPPORTED** — the sequential net is negative and the sequential DD exceeds $35,000. Every fold
  produced a qualified primary; the training neighbourhoods (p90 ≤ $35,000 on 384 draws) described 2016–2019 and
  2016–2021, not the next regime: **local stability is not chronological reliability**.
- The C21 and C23 robust/balanced holders made almost no trades in their slices ($0 to +$492.88): the same
  dormancy the C24 selections showed in 2025–2026.

## 6. Validation and full history (FULL, once; `results/tables/validation.md`)

| Member (role) | Development net | Validation P&L | Reset val. DD | Full net | Whole-run DD (%) | Lots after 2024 | V1–V3 |
|---|---:|---:|---:|---:|---:|---:|---|
| **indep-rise#1 profit (primary)** | $139,668.45 | **$0.00** | $0.00 | $139,668.45 | $17,483.62 (17.5%) | 0 | **fails V1** |
| informed#2 robust (robust-profit) | $110,158.59 | **+$39,487.05** | $11,730.77 | $149,645.63 | $18,840.58 (18.8%) | 4 | pass |
| P08 (balanced) | $121,008.75 | $0.00 | $0.00 | $121,008.75 | $18,840.58 | 0 | fails V1 |
| P09 (lower-drawdown) | $100,056.17 | $0.00 | $0.00 | $100,056.17 | $17,744.39 | 0 | fails V1 |
| indep-rise#2 robust / #3 balanced | $123,836.44 / $92,656.70 | $0.00 / $0.00 | — | — | — | 0 / 0 | fail V1 |
| informed#1 profit | $137,675.75 | $0.00 | — | $137,675.75 | $19,094.64 | 0 | fails V1 |
| **Appendix A** (exact control) | $53,816.50 | **+$87,340.87** | $17,709.24 | **$141,157.37** | $17,709.96 (17.7%) | 6 | pass |
| P12 / P11 / P10 (3B breakouts) | $6,927.65 / $6,772.78 / $6,772.78 | +$30,128.78 / +$15,639.47 / +$13,687.26 | $21,208.15 / $25,201.08 / $27,153.29 | — | ≤ $28,160.65 | 4–7 | pass |
| P04 / P05 | $33,223.29 / $15,362.24 | +$6,163.96 / +$2,032.53 | — | — | — | 2–3 | pass |
| P01, P06, P07, P13; P02, P03 | — | $0.00; −$100.08 | — | — | — | 0; 1 | fail V1 |

- **7 of 20 rows pass V1–V3**; no row breaches the $35,000 ceiling in validation or over the whole run. The failures are
  V1 only: no trade (or −$100.08) in 2025–2026.
- **Appendix A's native full-history target is reproduced exactly:** $141,157.37 net, $17,709.96 maximum minute DD, 19
  closed trades (17 wins, 2 losses), flat at the end.
- **Why the books were silent** (amendment A1, a post-validation, report-only funnel, `results/validation/funnel.json`):
  in 2025–2026 GDX was above the Rise threshold on 443–454 of 459 sessions; the selected books saw 3–9 crossings, and
  minimum-strength eligibility invalidated every one (P09's 5 were deferred by its trend veto). `informed#2` took one
  base signal and three continuations. Appendix A saw 28 crossings and decided 6 times.
- **Report-only:** validation-window neighbourhoods (128 draws): none of the primary's neighbours earned anything (0% positive; median $0.00);
  `informed#2` 48.4% positive, median $0.00, p90 whole-run DD $28,235.12; Appendix A median +$56,255.70 (98.4%
  positive) with 66 of 128 whole-run DDs above $35,000. Stresses on FULL change nothing for the silent books.
- **No validation-driven change:** the primary, the roles and the 4B export set stay as frozen.

## 7. The 4B export set (`FROZEN_SELECTION.json` `export4B`; complete settings in `results/tables/settings.md`)

| Book | Why exported (development) | Validation (descriptive) | Caution |
|---|---|---|---|
| `C24/indep-rise#1 profit` | the primary and independent primary | $0.00, fails V1 | dormant outside violent rebounds; the procedure behind it is chronologically unsupported |
| `C24/informed#2 robust` | the robust-profit role | +$39,487.05, passes | informed provenance (its seeds carry later data) |
| P08 (3C G robust-profit vector) | the balanced role | $0.00, fails V1 | a declined 3C partner vector: a labelled research control, not an approved addition |
| P09 (3C G lower-drawdown vector) | the lower-drawdown role | $0.00, fails V1 | as P08 |
| Appendix A | the exact control | +$87,340.87, passes | fails Q3/Q4 standalone; browser-chosen with 2025–2026 in view |

## 8. Resources and recoverability

- **Containment:** every heavy stage ran as a transient unit in `gdxg.slice` (MemoryHigh 44G, MemoryMax 48G,
  MemorySwapMax 0), one at a time, launched by the chain unit `gdxg-chain` (2026-11-10T17:43:56Z → 18:35:06Z); the
  validation 18:36Z. No other study's work ran; mongod and a vLLM server ran outside.
- **Measured:** peak job cgroup 9.5 GiB (validation); searches 5.9–8.4 GiB; worker ArrayBuffers ≤ 77.7 MiB; no
  `memory.high`, `memory.max` or OOM event. 12 workers, ≈ 350 evaluations/s on D19 and ≈ 170 on D24 (CPU-bound).
- **Bench and pilot:** `results/pilot/PILOT.md`. No interruption occurred in the study run.
- **Integrity:** protocol frozen (`d8fd3a83…`, `results/protocol-freeze.json` `fc4fef1d…`, commit `6a4d5caa`) before any
  search; amendments R1–R2 pre-freeze; **A1** post-validation, report-only; the code closure (252 files) and the
  evaluation digest unchanged since the freeze; fold selections committed before their slices;
  `FROZEN_SELECTION.json` (`5d262154…`) committed (`e4daa5bc`) before FULL opened; validation sealed and committed
  (`f28fabd1`). `npm run gdxg -- verify`: every sealed record verifies.
- **Disclosed incident (minor, pre-freeze):** the endpoint check printed the last two minute bars of the canonical GDX
  and VGT files (one price each, no strategy result).
- **Archives:** the job archives (`.cache/gdx-growth-standalone/jobs/`, git-ignored, regenerable) are listed with sizes
  and sha256 in `results/archive-manifest.json`.

## 9. Limitations

- **Previously examined history.** 2025–2026 had been examined; Appendix A and the informed seeds were chosen with
  later data in view. The independent lane avoids later-selected settings, but the canonical boxes and the design were
  written with earlier studies in view; fresh seeds are not fresh data.
- **Two episodes.** GDX's March 2020 rebound and its late-2022 rally carry the selected books; a neighbourhood that is
  stable around two violent episodes measures parameter sensitivity on one history, not reliability.
- **Selection rewards dormancy.** A book that trades only on rare jump days avoids losses in-sample; in 2016–2019 and
  2025–2026 it simply did nothing. No rule here penalizes that, by design (no activity floor); the evidence is reported
  instead.
- **No pooled conclusion.** Standalone profit says nothing about a GDX D1 pool (4B) or the VGT pools; only complete
  pooled reruns can.
- **Not tested:** other funding lifecycles, sizing or allocation (Priority 5); other ETFs (Priority 6);
  November–December 2026.

## 10. Reproduce

`RUN_COMMANDS.md` (from the repository root). Sealed stages refuse to rerun; each heavy stage resumes from its job archive.

```
npm run research-preflight -- --study research/gdx-growth-standalone
npm run gdxg -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-growth-standalone/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/gdx-growth-standalone/tests/*.test.ts
```

## Review points (nothing started)

1. **Accept the reading:** on 2016–2024 standalone GDX Growth has locally stable, qualified phenotypes far stronger than
   Appendix A on matched evidence, but they are dormant except on violent rebound days, the independent procedure was
   chronologically unsupported (−$16,537.03, DD $47,820.43), and the primary made no trade in 2025–2026.
2. **4B (GDX-only D1 + Growth)** can take the frozen export set as candidates beside VG #2's GDX D1 book, evaluated by
   complete pooled reruns; it should report dormancy and episode concentration beside profit.
3. **Process (Priority 5):** this study adds one more case where neighbourhood stability did not transfer forward,
   and a case where the selection favoured an eligibility filter that makes a book inactive; both belong to the approved
   optimization-process investigation. No rule changes here.
