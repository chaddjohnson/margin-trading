# REPORT — Why the New L0 family's walk-forward procedures fail the $35,000 drawdown test

Diagnostic only: no search, no re-optimization, no parameter, rule, allocator or threshold change, no deployment. It
audits the earlier-cutoff (walk-forward) procedures behind **New L0 primary: VGT + GDX** (D1·VGT + D1·GDX + Growth·VGT in
one $100,000 slot) and its two follow-up studies, from their sealed records and from small replays of their sealed
selections with each study's own code. **DD** = the maximum minute drawdown of the marked net (realized + open lots at
the latest price − principal − accrued interest) on the fixed $100,000 principal; the ceiling is $35,000. All figures come
from sealed records (`results/`, 10 records in `results/seals.jsonl`) and the audited studies' sealed records; the tables
are in `results/tables/`. Written analysis and tables only (standard §7.7).

**Evidence labels.** *Precommitted chronological evidence* = the audited studies' own sealed walk-forward verdicts.
Everything this study adds is **retrospective diagnosis on previously examined history**: the slices (2020–2021,
2022–2023, 2024) were opened and published before it, and New L0 and every fixed control were chosen with later data.
Nothing here could have been selected at an earlier cutoff, and nothing is presented as if it could.

## 1. Executive conclusion

**Answer to the final question.** The historical optimizer kept producing fold portfolios that breached $35,000 for
reasons that are mostly *methodological and fundamental*, not software defects:

| # | Cause | Label | Confidence |
|---|---|---|---|
| 1 | **The training windows did not contain the regimes that broke the selections.** Every breach is in one of two episodes: the Feb–Mar 2020 crash (C19 slice) and the 2022 bear (C21 slice). C19's 2016–2019 window had no fast crash (VGT's worst 15-day fall 12.9% against 23.6% in March 2020; GDX 18.0% against 36.3%); C21's 2016–2021 window had no prolonged VGT bear (VGT below its 200-session average on 6.7% of sessions against 48.1% in 2022–2023). Where the next slice resembled training (2024), 3 of 58 evaluated fold winners and 0 of the 1,024 training-neighbourhood draws breached. | strongly supported (one history) | high |
| 2 | **The objective and gates rewarded exposure that the next regime punished.** The primary is the highest *marked* training net; the gates look only at training-window DD and at small parameter perturbations on the same prices. At C21 the winners' training nets were inflated by one open lot bought near the March 2020 bottom (+$127,035.59 = 53% of B1's training net; +$120,092.80 = 48% of B2's; 2.4–2.5× market exposure on the $100,000 principal). That lot's trailing stop gave back $37–38k in January 2022, 47–49% of B1's and B2's slice DD. Across the 57 evaluated C21 winners, training net correlated **+0.54** with the 2022–2023 DD and the open-lot share of training net **+0.72**: the ranking selected for the coming drawdown. | mechanism directly verified; causal role strongly supported | high |
| 3 | **D1 lots have no loss stop before their maximum hold** (net-profit stop policy). In the crash one dip-buy lost up to $44,579.74 (MAE) before its hold expired; in a slow bear the books re-enter and lose repeatedly (median 6 maximum-hold losses, −$28.9k, per breaching 2022–2023 winner). The D1 books carry a median 91% (2020) and 82% (2022) of the worst-episode declines; removing the D1 pair in a complete replay brings 7 of the 8 failing slices within $35,000. | directly verified | high |
| 4 | **Local robustness measured the training episodes, not the future.** Each fold primary's own selection neighbourhood (256 draws, regenerated exactly) breached in 0–7.8% of draws in training and in **54–100%** on the failing slices. | directly verified | high |
| 5 | **Search coverage and selection noise.** (a) *Hindsight check:* on 2016–2021 data New L0 passes every C21 gate and would rank first in every calendar study's C21 qualified set ($251,372.87 against the primaries' $218,446.88–$248,305.56), yet up to 157,440 fresh proposals per cutoff never reached its region. (b) Within what was found, the winners beat #2 by $199–$20,241, training net did not rank the next slice (Spearman −0.12, −0.16, +0.09 by slice), and 87 of the 96 seed-level fold winners of the 2020–2021 and 2022–2023 slices breached. 12× more search (B1, B2) did not help. | strongly supported (hindsight for 5a) | medium-high |
| 6 | **Shared-capital competition** is a secondary modifier, not the driver: few refusals in the failing slices (median 6–19), and displacement cascades are not what breaks the ceiling. | not supported as primary cause | high |
| 7 | **No implementation or accounting defect** was found: every sealed record verifies, every replay reproduces its sealed record field for field (190 replays), every sequential path recomputes to the cent, fold selections were committed before their slices, no split or bad print touches the doors, and every maximum-hold exit honours its configured unit. | affirmative evidence against defects | high |

**The frozen New L0's $20,385.99 full-history DD is not walk-forward evidence.** New L0 was assembled from incumbents
chosen with 2020–2024 (and partly 2025–2026) in view; its 2020–2024 path (+$302,751.28, DD $19,459.83) is descriptive.
The procedures that would have had to *find* such a portfolio at each earlier cutoff failed chronologically every time
they were tested.

**What to change before TSLA/MSFT (§6–§7):** precommit a chronological verdict with consequences; disclose and test
exposure at the cutoff (open-lot share, market-value multiple, give-back); stress the D1 hold-window tail on history the
search never saw; run the training-neighbourhood-on-next-slice diagnostic routinely; prefer coverage (smaller, enumerated
risk spaces) over more ranking formulas or bigger fresh searches; settle split adjustment and longer history for the new
symbols. A historical drawdown limit is a research filter, not a guarantee.

## 2. Experiment audit (`results/tables/audit.md`, `checks.md`)

### 2.1 What the four anchor experiments were

All four re-optimized at every cutoff (none replayed a fixed phenotype); each fold's selection was sealed and committed
seconds before its slice was evaluated (git order verified for all 9 folds). Common to all: Priority 3's pooled engine
(one exclusive funded $100,000 slot, same-instant order D1 → GDX → VGT, 5 bps per side, 11% simple interest by calendar
day, Growth lifecycle L0); training on byte-prefix doors D19 (2016-01-04 → 2019-12-31), D21 (→ 2021-12-31), D23
(→ 2023-12-29); slices evaluated on the next door as continuous runs from 2016-01-04; the primary = the **actual-profit
role** (highest centre net) of the fold's qualified *independent* set; gates Q1–Q6 (centre net > 0; centre DD ≤ $35,000;
confirmation p90 DD ≤ $35,000; confirmation p10 > 0; 10 bps stress; D1 and Growth funded). The DD convention is the same
everywhere (strict minute tracker, standard §0.3); slice DD resets at the cutoff close; the sequential DD chains the fold
primaries' slice marks without reset, charging 5 bps of $100,000 per lot closed or adopted at a switch.

| Path | Study, procedure | Differences that matter | Budget per cutoff (proposals / requested evaluations) |
|---|---|---|---|
| **5B-L0** | `research/vg-lifecycle-matched-optimization/`, L0 arm, independent lanes (NL0 1.0.0 §3.3) | calendar holds; structure searched (V, G, B cells); 2 replicates | 9,472–12,288 / 92,774–101,600 |
| **SES** | `research/vg-l0-session-hold/`, independent lanes | **NYSE-session holds**; V only; 6 replicates × 3 sub-cells (≈ 3×) | 26,880–31,488 / 252,267–304,047 |
| **B1** | `research/vg-l0-shadow-eligibility/`, fresh joint | calendar; V only; **three shadow-eligibility toggles searched**; 32 replicates × 3 | 151,040–161,280 / 1.26–1.66 M |
| **B2** | same study, fresh sequential | D1 pair (+ toggles) first, then Growth·VGT with the D1 books pinned; 8 replicates per step | 143,616–145,408 / 1.43–1.53 M |

### 2.2 Reconciled results (sealed; recomputed independently to the cent from the fold mark caches, gate G4)

| Path | C19 → 2020–2021: net / slice DD | C21 → 2022–2023 | C23 → 2024 | Charges | **Sequential net / DD (peak → trough)** |
|---|---|---|---|---:|---|
| 5B-L0 | B pool +$9,083.51 / **$39,527.29** | V −$38,341.52 / **$57,259.44** | G $0.00 (no trade) | $100 | **−$29,358.01 / $67,214.22** (2020-09-10 → 2022-10-13) |
| SES | V +$45,828.28 / **$55,449.12** | V −$25,018.62 / **$57,489.79** | V +$4,627.88 / $20,299.72 | $200 | **+$25,237.54 / $58,866.62** (2021-11-22 → 2022-09-26) |
| B1 | V (toggles 111) +$89,021.67 / **$48,255.05** | V (101) −$23,908.85 / **$79,663.64** | V (000) +$6,494.57 / $14,520.92 | $200 | **+$71,407.39 / $80,475.04** (2021-11-22 → 2022-09-28) |
| B2 | V (011) +$48,104.08 / **$44,645.13** | V (111) −$63,611.93 / **$74,307.21** | V (000) +$4,141.11 / $34,117.37 | $150 | **−$11,516.74 / $74,307.21** (2022-01-04 → 2022-09-01) |
| *New L0 (fixed; descriptive)* | +$171,402.70 / $17,280.74 | +$87,238.48 / $19,459.83 | +$44,110.10 / $9,105.84 | — | *+$302,751.28 / $19,459.83* |

The brief's anchors are confirmed exactly. None of the sequential DDs recovered by 2024-12-31. Each path has exactly two
breaching episodes: the 2020 crash inside the C19 slice and the 2022 bear (the sequential maximum). In 5B-L0 the 2022
episode starts at 2020-09-10 because the C19 primary lost $30,878.64 to a string of D1·GDX maximum-hold exits between
September 2020 and September 2021 before the C21 primary lost more.

### 2.3 Every role and seed-level path breached too (sealed)

Robust-profit, balanced and lower-drawdown role paths: 12 of 12 above $35,000 (sequential DD $38,593.64–$78,831.87).
Seed-level replicate paths: **0 of 48 supported** (5B 0/2, SES 0/6, B1 0/32, B2 0/8; DD $44,835.19–$111,005.68).

### 2.4 Comparability

- **Valid:** each fold primary against the other rows its own study evaluated on the same slice under the same
  convention; within-path replays (removal, neighbourhoods); common-mechanism statements across the four paths.
- **Not valid as method comparisons:** SES vs 5B as "the hold-unit effect" (budget ×3 and structure differ; SES's own
  selections replayed under calendar holds still breached: +$75,529.19, DD $47,761.66); B1/B2 vs 5B (toggles, allocator,
  12–15× budget, structure); any fold path vs New L0 or C4 (hindsight controls). The shadow fold primaries run with
  eligibility toggles that the shadow study found harmful at C24 (C19 B1 111, C21 B1 101, C21 B2 111), a confound that
  does not apply to 5B or SES — yet all four fail the same way.
- **Other directly relevant failed chronological tests** (sealed): Priority 2 −$1,691.64 / DD $64,570.38; Priority 3
  −$61,544.61 / $102,257.90; 3B +$13,105.71 / $60,874.87; 4A −$16,537.03 / $47,820.43; 7A +$1,292.58 / $57,711.81; 5B L1
  −$30,032.46 / $106,883.44. Only 5B L2 passed (+$49,518.36 / $29,279.04), on one retained 2020 re-entry, with both of its
  replicate paths breaching. The process audit (`research/optimization-process-audit/`) found the same for 3B and 4A.

## 3. Trade-level failure chronology (`results/tables/chronology.md`, `removal.md`, `prevalence.md`)

Lot changes partition each episode exactly (one funded slot at a time). "Carried" = a lot open across the cutoff,
adopted by the walk-forward path at its cutoff mark.

### 3.1 The 2020 crash (C19 slice; peaks 2020-02-19)

| Path | DD (trough) | Give-back of the carried winner | Crash-time entries held to maximum hold | Other |
|---|---:|---|---|---|
| 5B-L0 | $39,527.29 (03-23) | D1·VGT from 2018-12-26 (1.54× exposure at the cutoff; 14.3% stop): −$24,954.49 | D1·VGT 03-09 → 04-03: −$20,121.30 in window (MAE −$20,121.30) | D1·GDX +$5,548.50 |
| SES | $55,449.12 (03-16) | Growth·VGT from 2019-10-16: −$20,372.14 | **D1·GDX 03-06 → 03-17: −$44,579.74** (MAE −$44,579.74; lot −$23,714.12) | D1·GDX +$9,502.77 |
| B1 | $48,255.05 (03-16) | D1·VGT from 2018-12-26 (1.51×; 13.2% stop): −$22,553.39 | Growth·VGT 02-27 → 03-16: −$20,805.98 | D1·GDX −$4,895.68 |
| B2 | $44,645.13 (03-16) | D1·VGT from 2019-10-03: −$10,526.96 | D1·VGT ×3 (02-25, 03-04, 03-10; holds of 4 calendar days): −$29,467.55 | Growth +$852.23; D1·GDX −$5,502.85 |
| *New L0* | *$17,280.74 (03-19)* | *Growth·VGT exited 02-24 at a gapped stop (lot +$13,616.58); flat until 03-12* | *four deep D1·GDX dip-buys 03-12 → 03-26, all profitable (+$68,624.54)* | *descriptive* |

**Pattern:** one long-held winner surrenders 24–63% of the episode as its trailing stop is reached in the first week(s),
then the books buy the dip and hold the next leg down until the maximum hold. A single lot is ≥ 50% of the depth in 33 of
the 50 breaching C19-slice winners. All four recovered by 2020-08-18 (B2 on 03-17, B1 on 04-07, SES on 06-22, 5B on 08-18), so the 2020 breach is a
depth problem, not a lasting loss.

### 3.2 The 2022 bear (C21 slice; peaks 2022-01-04)

| Path | DD (trough) | Carried winner: mark at 2021-12-31 (share of training net; exposure) → change in episode | Then |
|---|---:|---|---|
| 5B-L0 | $57,259.44 (10-13) | Growth·VGT bought 2020-04-20: $73,149.92 (33%; 1.97×) → −$26,005.16 | D1·VGT −$10,687.97 and −$10,116.96 (maximum hold); Growth·VGT −$9,389.50 (initial stop); D1·GDX −$1,222 net |
| SES | $57,489.79 (09-26) | D1·VGT bought 2020-11-03: $37,146.01 (15%; 1.50×) → −$23,185.45 | D1·GDX: +$12,461.03, then −$11,246.49, −$19,082.67, −$8,213.32 (maximum holds of 27 *sessions*), +$993.63, −$9,216.51 |
| B1 | $79,663.64 (09-28) | **D1·VGT bought 2020-03-23: $127,035.59 (53%; 2.47×)** → −$37,749.61 | 5 D1·VGT maximum-hold losses (Feb–Jun, ≈ −$16,600), then D1·GDX (Jul–Sep, ≈ −$25,300 net) |
| B2 | $74,307.21 (09-01) | **D1·VGT bought 2020-03-18: $120,092.80 (48%; 2.40×)** → −$36,726.33 | Growth·VGT −$13,747.65 (maximum hold); 7 D1·GDX losses (≈ −$20,400) |
| *New L0* | *$19,459.83 (2023-02-24)* | *D1·GDX from 2021-12-15: $9,987.07 (4%; 1.10×)* | *5 small maximum-hold losses over the slice (4 D1·GDX, 1 D1·VGT; −$8,880 in all)* |

**Pattern:** the C21 winners entered 2022 holding a lot bought near the March 2020 bottom that had roughly doubled; its
trailing stop gave back $23–38k within three weeks, then the D1 books bought repeatedly into the decline and exited at
their maximum holds. A breaching 2022–2023 winner had a median of 7 losing lots in its worst episode and 6
maximum-hold losses (−$28,897.85) in the slice; only 14 of 51 had one lot ≥ 50% of the depth: a **sequence of losses**,
not one extreme trade. None recovered by 2024-12-31.

### 3.3 Which component drove it (complete replays; `removal.md`)

| Removed (whole run, then slice) | 2020 slices within $35k | 2022 slices within $35k |
|---|---:|---:|
| D1·VGT | 3 of 4 (not SES) | 0 of 4 |
| D1·GDX | 1 of 4 (SES) | 2 of 4 (5B, SES) |
| **Both D1 books** | **4 of 4** ($21,068–$29,886) | **3 of 4** ($2,308–$25,134; 5B $39,072.97) |
| Growth (all) | 0 of 4 | 1 of 4 (5B) |

Descriptively, the D1 books carry a median 91% (2020) and 82% (2022) of the breaching winners' worst-episode declines
(`prevalence.md`). Interactions through the single slot are real but secondary: removing D1·GDX from 5B's C21 primary
cuts its 2022 DD from $57,259.44 to $20,747.09 mostly because the 2020–2021 history then holds a different lot at the
cutoff; removing D1·VGT from New L0 *raises* its 2022–2023 DD to $35,975.28 (D1·VGT was occupying the slot). These are
whole-run counterfactuals; the engine cannot switch a book off at the cutoff only.

### 3.4 Exit mechanisms that mattered

- **D1 maximum hold** (with the net-profit stop policy, the only regular D1 loss exits are the maximum-hold exit at a
  losing open and the buffered loss after the hold; `src/shared-margin-portfolio/strategy.ts:239–245, 266, 349–354`):
  62 of the 64 losing D1 lots of the fold primaries in the 2020–2021 and 2022–2023 slices ended that way (57 maximum
  hold, 5 buffered loss; 2 at a stop gapped through at the open); 100 of 100 maximum-hold exits came at or after the
  configured hold (calendar days; sessions for SES).
- **Trailing stops on long-held winners:** the give-backs above (wide stops on appreciated positions: B1's and B2's
  C21 D1·VGT stops are 14.9% of a price that had more than doubled).
- **Growth exits:** maximum hold (B1 C19, B2 C21), initial ATR stop (5B C21), trailing stop + trend exit and retention on
  the carried Growth lots (5B C21, SES C19). Growth is a minority of the losses.
- **Continuation re-entries** and deep entries both appear among the 2022 D1 losses; post-exit continuation lets a book
  re-enter within its window after each maximum-hold exit.

## 4. Selection-process diagnosis (`results/tables/selection.md`, `neighbours.md`, `coverage.md`)

### 4.1 Why the fold primaries were chosen and why they passed

They were the highest centre net among qualified members, and they passed because every gate is measured on the same
2016–cutoff prices: their training DDs ($13,116.98–$34,041.80) and confirmation p90 DDs ($17,972.93–$34,855.68) were within
$35,000, with 0–9.9% of 384 draws above it. Nothing in Q1–Q6 measures exposure to a regime absent from training,
holding time, open-position share, market-value growth, or the per-lot loss a D1 book can take before its maximum hold.
Several were near the line (B1 C21 p90 $34,633.28 with 8.85% breaches; B2 C23 $34,855.68 / 9.9%).

### 4.2 The hypotheses of the brief

| # | Hypothesis | Label | Key evidence |
|---|---|---|---|
| H1 | Limited or unrepresentative training episodes | **directly verified** (facts); strongly supported (cause) | Primaries' training rests on 2–15 pool episodes (B1 C19 and C21: 2); top-episode share 40–86%; C21 primaries earned 66–76% of training net in 2020–2021; one open lot = 33–53% of training net at C21 (5B, B1, B2). |
| H2 | Regime sensitivity | **strongly supported** | D9 (`regimes.md`): training lacked a fast crash (C19) and a slow VGT bear (C21); breaches only in those two regimes; 2024 (training-like): 3/58 winners, 0/1,024 neighbours breach. One history: not provable. |
| H3 | Parameter instability, narrow optima | instability **directly verified**; narrow optima **not supported** | Structures change by fold (5B: B → V → G) and seed (B1 C19 replicate winners: 27 breakout / 5 Rise Growth; every toggle combination); but training neighbourhoods were stable (0–8% breaches), and they fail *together* on the slice: the region, not a knife-edge point, is fragile. |
| H4 | Objective/gate mismatch | **directly verified** (mechanism); strongly supported (cause) | Marked centre net credits unrealized gains of an open lot; at C21, ρ(training net, slice DD) = +0.54 and ρ(open-lot share, slice DD) = +0.72 (57 rows); no gate on exposure, hold-window tail or regime. |
| H5 | Local vs chronological robustness | **directly verified** | D7: training breach share 0–7.8% → slice 69.5–100% (C21), 54.3–100% (C19); 0% in 2024. |
| H6 | Shared-capital effects | **not supported** as primary cause; real as a modifier | Few refusals; D1 pair removal fixes 7/8; path dependence shown by single-book removals. |
| H7 | Search and selection effects | **strongly supported** | Rank-1 margins $199–$20,241; ρ(training net, slice net) −0.12 / −0.16 / +0.09; 87/96 seed-level winners of the two failing slices breach; B1/B2's 12× budget did no better; coverage gap at C21 (hindsight D10). |
| H8 | Accounting or implementation defects | **not supported** (affirmative evidence against) | §5. |

### 4.3 Local stability is not chronological stability (D7)

| Fold primary | Training breach share (256 draws) | Next-slice breaches | Median next-slice DD |
|---|---:|---:|---:|
| 5B C19 / C21 / C23 | 0% / 6.25% / 1.56% | 256 / 178 / 0 of 256 | $44,906.87 / $42,698.87 / $0 |
| SES C19 / C21 / C23 | 0.78% / 0.78% / 1.17% | 246 / 256 / 0 | $55,575.22 / $53,944.41 / $15,491.79 |
| B1 C19 / C21 / C23 | 0% / 7.81% / 0% | 256 / 241 / 0 | $49,878.93 / $58,738.91 / $14,689.47 |
| B2 C19 / C21 / C23 | 0% / 3.52% / 10.55% | 139 / 243 / 0 | $35,849.32 / $74,442.62 / $0 |

The neighbourhood answers "would small parameter changes have mattered on these prices?" (no), not "will this region
survive different prices?" (mostly not). It is the brief's hypothesis 5, verified.

### 4.4 Coverage versus selection (D10; hindsight, report-only)

New L0, evaluated as if it had been a C21 member on D21: centre $251,372.87 / DD $17,280.74; confirmation p10
$138,627.28, p90 DD $22,861.61, 0 of 384 draws above $35,000; Q1–Q6 all pass; **rank 1** in the C21 qualified sets of
5B (20 members), B1 (316) and B2 (133). Its 2022–2023 slice was +$87,238.48 with $19,459.83 DD. At C19, by contrast, its
causal training net ($79,970.17) is below every C19 primary's ($105,653.22–$148,747.23): a profit-first rule would not have
picked it. So **C19's failure is a training-history problem; C21's is at least in part a search-coverage problem** — a
better-scoring, gate-passing region existed on the C21 data and the fresh searches did not reach it (the informed lane did, by starting
from incumbents chosen with later data). This does not show that any procedure could have found New L0 at C21 without
hindsight.

## 5. Bug audit (`results/tables/checks.md`)

| Suspected issue | Check | Result |
|---|---|---|
| Wrong records or code versions | G1: 36 audited records vs their seals; G2: evaluation digests (Priority 3 `147cad7c…`, 5B `3f902532…`, shadow `54304b69…`, session `a38174fa…` at its commit) | all equal |
| Replay fidelity | G3: 9 fold primaries and 3 New L0 control runs, 6 session runs (3 own unit, 3 calendar cross rows) and 172 evaluated rows replayed = sealed records, every field | 190/190 equal |
| Fold boundaries, warm-up, causal access | each fold primary on its training door = its sealed selection centre (whole record) | 12/12 equal |
| Sequential stitching, switch charges, DD carry | G4: nets, DDs, peaks, troughs and every slice's reset DD recomputed with an independent tracker | 4/4 to the cent |
| Leakage | git: each fold selection committed before its slice evaluation; evaluation records carry the selection's sha256 as guard | 9/9 |
| Maximum-hold semantics | 100 maximum-hold exits: holding time ≥ configured hold in its unit | 100/100 |
| Corporate actions / bad prints | consecutive-bar moves > 10% in VGT and GDX D24 (743,918 and 1,189,831 bars); split register | none; VGT's only split (8:1) is 2026-04-21, after every development door |
| Mark-to-market DD | minute marks while a lot is held + session closes (standard §0.3); reconciliation Σ lots = slice net | ≤ $0.03 (cent rounding) |

**No software defect.** Three *conventions* matter for interpretation but are working as specified: (1) the training net
marks open lots at the cutoff, so unrealized gains count in full; (2) the walk-forward path adopts the incoming primary's
open lot at its cutoff mark, including its appreciated market exposure (up to 2.47× principal); (3) D1's net-profit stop
policy gives no loss exit before the maximum hold. The "fixed $100,000 principal" fixes the borrowed principal, not the
market exposure of an open winner.

## 6. Ranked recommendations (for review; nothing is adopted)

Ordered by the strength of the evidence and the expected value. "Test now" = what existing archives allow
(retrospective, hypothesis-generating only, because every proposal below was formed after seeing the failures). "Proper
test" = the precommitted experiment that would count.

| # | Recommendation | Failure addressed and evidence | Layer | Test now / proper test | Risks and trade-offs | Effort / compute |
|---|---|---|---|---|---|---|
| 1 | **Precommit a chronological verdict with consequences.** Before any TSLA/MSFT search, the protocol states that if the independent walk-forward fails (default verdict of standard §1.8), the study's final selection is reported as "no chronological support" and is not a deployment candidate without the user's explicit decision; informed lanes are labelled as having none by construction. | 4 of 4 anchor procedures and 6 earlier ones failed; New L0's own lane had no test (5B AD9). | selection / governance | Already decisive on existing results (all unsupported). Proper: the TSLA/MSFT protocols. | May end a study with "no candidate" (a valid outcome). | low / none |
| 2 | **Disclose and test exposure at the cutoff.** Report for every fold and final candidate: open-lot share of training net, largest open lot's market-value multiple, and its give-back on the next slice. Test a conservative training valuation that marks open lots at their protective-stop exit instead of the last price. | Carried winners: 33–53% of the C21 training nets of 5B, B1 and B2 (15% in SES), 1.5–2.5× exposure; a median 34% (2020) and 40% (2022) of the breaching winners' worst-episode depth; ρ +0.72 with the 2022–2023 DD. | risk evaluation, then selection | Now: re-rank the archived C21 qualified sets under stop-level marking (≈ 1–2k replays). Proper: precommitted on TSLA/MSFT folds or the 7A archives. | Penalizes genuine trend capture; one cutoff (C21) drives the evidence; post hoc. | low–medium / low |
| 3 | **Stress the D1 hold-window tail on history the search never saw.** For each candidate report the loss of a $100,000 dip-buy held to its maximum hold through the worst hold-window decline of a longer reference history (pre-2016 data of the same symbol, or peers), and how often its entries would have met one; report-only first. | No D1 loss stop before the hold; the eight failing-fold primaries' worst slice MAE −$8,406.22 to −$44,579.74 against a worst training MAE of −$1,648.94 to −$7,394.70; VGT/GDX worst 15-day falls doubled from training to slice. | risk evaluation | Now: compute for the 12 fold primaries from older VGT/GDX data if available. Proper: TSLA/MSFT with a stress-only long-history door. | Needs data before 2016; rejects many profitable configurations; still one history per symbol. | medium / low |
| 4 | **Run "training neighbourhood on the next slice" (D7) in every walk-forward**, beside the local neighbourhood statistics, and stop describing local stability as robustness. | Training breach 0–8% vs 54–100% next slice. | reporting | Done here for 12 primaries. Proper: standard reporting item. | Cost ≈ 256 replays per fold; diagnostic only. | low / low |
| 5 | **Fix coverage before selection.** For a new symbol: a smaller, interpretable space (fix the Growth structure and most conditional genes; enumerate the D1 risk genes X, stop, hold on a coarse grid, standard §4.1 "small spaces are enumerated"); a hindsight-free coverage probe per cutoff (a precommitted generic grid) to tell coverage failures from selection failures. | D10: a gate-passing, rank-1 region at C21 was never reached by up to 157,440 proposals; 12× budget did no better; independent bests far below informed ones (NL0 §6). | optimizer | Now: none without new search. Proper: precommitted on TSLA/MSFT. | Excludes structures; a probe built from later winners would leak hindsight (must be generic). | medium / medium |
| 6 | **Stop investing in ranking formulas and in larger fresh searches on 2016–2024.** | Process audit (three formulas, no improvement); ρ ≈ 0; near-tie margins; 87/96 seed winners breach; 12× budget no better. | optimizer / selection | Existing evidence suffices. | None beyond forgone exploration. | saves compute |
| 7 | **More, shorter chronological folds** where compute allows (smaller per-cutoff budgets), so that no single cutoff at a market top (2021-12-31) decides the verdict. | Three correlated slices, two informative events; C21's cutoff sat at the VGT top. | selection / qualification | Proper only (new searches). | Each cutoff is a full search; still one history. | high / high |
| 8 | **Strategy-rule hypotheses (separate authorization):** a D1 loss protection before the maximum hold, a cap or partial profit-taking on long-held winners, a holding-time cap. | Maximum-hold loss strings (11–16 per failing 2022 slice in B1/B2, −$45–47k); give-backs of 1.5–2.5× exposure. | strategy rules | Out of scope here (no rule change was made). | Changes the strategy family; New L0 survived with the same rules through hindsight parameters. | medium / medium |

**Defect / method / uncertainty.** Correctable software defects: none found. Research-method limitations: items 1–7
(objective credit for open exposure, same-history robustness, coverage, selection noise, too few folds). Fundamental
uncertainty: one market history with two breaking events in five years; 2025–2026 already examined; no historical
procedure can certify a future drawdown.

### Proposed narrowly scoped amendment (for review only; not applied)

Standard **2.2.0 (minor)**, adding report-only and specify items, no [M] change:

- **§5.9 [R] Chronological exposure disclosure.** Every earlier-cutoff primary and every final candidate reports: the
  open-lot share of its training net at each cutoff; the market-value multiple of its largest open lot; that lot's change
  on the next slice; the per-lot MAE distribution; the D1 hold-window tail stress against the declared reference history;
  and the next-slice breach share of its own selection neighbourhood (D7 method). Report-only; never a gate, ranking input
  or tolerance.
- **§1.8 [S] Consequence of the verdict.** The protocol states, before any search, what a chronologically unsupported
  independent procedure means for the final selection (default proposed: "no chronological support; not a deployment
  candidate without the user's decision").

NL0 1.0.0 is unchanged; it describes what was executed and must not be rewritten to imply these rules existed.

## 7. Next-study implications: settle these before optimizing D1 + Growth for TSLA and MSFT

1. **Data and corporate actions.** The repository holds no canonical TSLA or MSFT data, and the split register lists
   neither. TSLA split inside any 2016–2024 window (5:1 in 2020, 3:1 in 2022 — dates to verify against the vendor);
   byte-prefix doors load explicit files without forward split adjustment, so a door must apply the register (7A practice)
   and pass a consecutive-bar jump scan (D8 method) before any search.
2. **Per-lot tail first.** With one $100,000 slot and no D1 loss stop before the maximum hold, a single-stock lot can
   breach $35,000 alone; measure each symbol's hold-window decline distribution on the longest available history before
   choosing the X and hold boxes (recommendation 3).
3. **Folds that straddle each symbol's regime breaks** (for example the 2022 declines), with the verdict and its
   consequence precommitted (recommendation 1).
4. **Exposure creep.** A fixed principal does not fix exposure; fast-rising single stocks will compound an open lot's
   market value far beyond VGT's 2.5×. Report it (recommendation 2).
5. **A smaller, enumerated search with a coverage probe** rather than more replicates or bigger fresh budgets
   (recommendations 5, 6); VGT/GDX phenotypes used as seeds are an informed lane without chronological evidence.
6. **Routine D7 and give-back diagnostics** in every fold, and an explicit expectation that "no configuration meets the
   ceiling chronologically" is a valid result.

## 8. Limitations

- **Examined history.** Every slice and New L0's outcomes were published before this study; all diagnostics are
  retrospective. D10 uses a configuration chosen with later data and shows coverage, not selectability.
- **Few independent events.** Two breaking episodes (2020 crash, 2022 bear), shared by every path; three correlated
  slices; one market history. Correlations are descriptive, from heterogeneous pooled rows.
- **Post-hoc framing.** The recommended diagnostics and valuation tests were formed after seeing the failures; their
  value is unproven until a precommitted test.
- **Counterfactual limits.** Book removals are whole-run counterfactuals (the cutoff state changes). The session study
  was replayed from its own commit in a temporary worktree (removed afterwards). The 5B C23 primary (a G pool) made no
  2024 trade, so its fold carries no information.
- **Missing artifacts.** None needed: every record, mark cache and code version was available and verified. Earlier
  studies' (Priority 2, 3, 3B, 4A, 7A) chronologies were taken from their sealed records and the process audit, not
  replayed.
- **Compute.** 4,698 fresh simulations on development doors only (cap 5,000 after amendment A1; FULL never opened);
  peak unit memory 3.7 GB; all sealing runs in `vgwfd.slice` units (MemoryHigh 44G / MemoryMax 48G / swap 0).

## Reproduce

From the repository root (`RUN_COMMANDS.md` has every command; sealed records refuse to be rewritten; `--dry` writes
unsealed copies to `$WFD_SCRATCH`):

```
npm run research-preflight -- --study research/vg-l0-walk-forward-diagnostic
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-walk-forward-diagnostic/tables.ts
```
