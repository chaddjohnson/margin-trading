# Priority 4 — risk and robustness of S1 (staged trailing stops)

Written analysis and tables only. Sources:
- **Sealed official GPU records.** The paired risk statistics (`results/selection/C*.json`, `results/outcome.json`), the
  training-door tails, envelopes and stresses (`results/qualification/C*.json`), the next-interval and validation rows
  with their stresses (`results/intervals/C*.json`).
- **Report-only CPU diagnostics** (purpose `diagnostic`, never official evidence). These are the lot-level tables
  `tables/lots-C19-D21.md`, `lots-C21-D23.md`, `lots-C24-FULL.md` and the ON/OFF pair replays
  `tables/selection-C*-mechanism.md`, `decomposition-*-mechanism.md`, `ablation-mechanism.md`. Every CPU replay
  reproduced the sealed GPU whole-run net and marked DD to the cent, for 4 + 4 + 24 subjects (and 195/195 for every C24 validation row).
- **Generated tables:** `tables/tails.md`, `risk.md`, `annual-train-validate.md`.

Every interval is retrospective, previously inspected history.

## 1. The preregistered paired risk test (five metrics, EXP − CTRL lane representatives; PROTOCOL.md §8.2)

| Cutoff | Centre marked DD | Confirmation p90 DD | Breach share > $35k | Trade principal loss (liq.) | Banked-capital DD (liq.) | Verdict |
|---|---|---|---|---|---|---|
| C19 | −$869 [−$1,739, −$3] | +$624 [−$497, +$1,740] | +0.54 pp [−0.03, +1.11] | +$687 [+$215, +$1,155] | +$1,142 [+$550, +$1,736] | non-inferior |
| C21 | −$888 [−$1,915, +$129] | +$554 [−$304, +$1,401] | +0.24 pp [−0.31, +0.78] | +$887 [+$376, +$1,411] | +$871 [+$114, +$1,636] | non-inferior |
| C24 | +$205 [−$501, +$905] | +$646 [−$36, +$1,331] | +0.35 pp [−0.18, +0.90] | −$497 [−$1,024, +$29] | −$41 [−$793, +$710] | non-inferior |

Means with 80 % stratified bootstrap intervals (B = 100,000). Margins: +$2,500 for the dollar metrics, +2 pp for the breach share.
- **No metric is clearly worse at any fold.** Every U90 is well inside its margin.
- **The confirmation-family p90 DD and the breach share are slightly higher with S1 at every fold.** The 80 % intervals
  straddle zero.
- **At C19 and C21 the two envelope metrics are higher with S1, with intervals above zero.** These are trade principal
  loss and banked-capital DD. This is consistent with S1 banking gains earlier and re-entering from a higher banked
  level (not separately tested). The increase is under $1,200, which is immaterial against the margin.
- **At C24 the envelope metrics are neutral.**

## 2. Tails of the frozen subjects on their training doors (confirmation family 3 × 128; `tables/tails.md`)

| Fold | Subject | Pattern | Centre net | Centre DD | p90 DD | p95 DD | worst-10 % mean | worst DD | breach > $35k | p10 net | PL liq. | BD liq. | BD liq. p95 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C19 | New L0 | off | $79,970 | $10,633 | $22,178 | $23,583 | $24,211 | $29,782 | 0.0 % | $25,176 | $3,687 | $3,687 | $16,110 |
| C19 | N/original | off | $80,437 | $10,691 | $23,965 | $25,867 | $26,440 | $34,162 | 0.0 % | $18,828 | $3,929 | $3,929 | $18,378 |
| C19 | CTRL primary | off | $127,622 | $18,217 | $19,159 | $19,279 | $19,367 | $22,104 | 0.0 % | $101,959 | $2,508 | $2,508 | $6,754 |
| C19 | EXP primary | VGT | $150,713 | $15,402 | $23,060 | $25,542 | $25,533 | $28,205 | 0.0 % | $91,616 | $5,495 | $5,495 | $16,442 |
| C19 | EXP primary all-OFF | off | $148,970 | $17,145 | $23,035 | $25,983 | $25,854 | $29,078 | 0.0 % | $96,048 | $5,495 | $5,495 | $15,999 |
| C21 | New L0 | off | $251,373 | $17,281 | $23,452 | $24,512 | $24,991 | $29,474 | 0.0 % | $138,500 | $5,638 | $5,638 | $16,501 |
| C21 | N/original | off | $251,839 | $17,281 | $24,683 | $26,942 | $27,765 | $36,650 | 0.3 % | $93,853 | $5,638 | $5,638 | $19,941 |
| C21 | CTRL primary | off | $236,003 | $28,004 | $33,926 | $34,149 | $34,206 | $36,758 | 0.3 % | $154,547 | $9,102 | $9,102 | $17,073 |
| C21 | EXP primary | GDX | $252,819 | $17,744 | $29,623 | $31,493 | $31,510 | $35,038 | 0.3 % | $122,265 | $5,043 | $5,043 | $22,223 |
| C21 | EXP primary all-OFF | off | $252,079 | $17,744 | $29,623 | $31,493 | $31,510 | $35,038 | 0.3 % | $121,318 | $5,043 | $5,043 | $22,223 |
| C24 | New L0 | off | $382,721 | $19,460 | $30,658 | $34,487 | $34,808 | $42,791 | 3.9 % | $206,312 | $8,093 | $10,384 | $27,364 |
| C24 | N/original | off | $388,031 | $19,460 | $28,012 | $29,965 | $31,605 | $42,275 | 2.1 % | $160,427 | $8,093 | $10,384 | $22,996 |
| C24 | CTRL primary | off | $241,225 | $23,468 | $30,791 | $32,869 | $33,360 | $42,133 | 2.1 % | $112,918 | $5,638 | $5,638 | $23,098 |
| C24 | EXP primary | GDX+VGT | $238,352 | $26,301 | $29,829 | $32,594 | $33,796 | $43,065 | 3.4 % | $92,163 | $8,462 | $14,483 | $25,482 |
| C24 | EXP primary all-OFF | off | $232,478 | $26,301 | $29,829 | $32,594 | $33,796 | $43,065 | 3.4 % | $89,379 | $8,462 | $14,483 | $25,482 |
| C24 | informed I1 EXP primary | GDX+VGT | $392,021 | $19,460 | $30,658 | $34,487 | $34,808 | $42,791 | 3.9 % | $208,989 | $8,093 | $10,384 | $27,364 |
| C24 | informed I2 EXP primary | GDX+VGT | $396,648 | $19,460 | $28,093 | $30,605 | $32,305 | $45,474 | 2.3 % | $162,444 | $8,093 | $10,384 | $23,051 |
| C24 | informed I3 EXP primary | GDX | $386,978 | $19,460 | $29,552 | $34,593 | $34,797 | $42,840 | 4.7 % | $213,014 | $8,093 | $10,384 | $27,663 |

PL = trade principal loss; BD = banked-capital DD (liquidation basis). Both are the worst events of one trade or one
holding period, never portfolio DD.

- **S1 leaves the DD tail of every finalist almost exactly where its own all-OFF projection has it.**
  - At C21 and C24 the p90, p95, worst-10 % mean, worst DD and breach share are identical to the cent.
  - At C19 they differ by under $1,000.
  - On the training doors S1 changes the net, not the drawdown profile.
- **Around the incumbents, informed lanes I1 and I2 also keep New L0's and N/original's tails.** I2's worst confirmation
  DD is $45,474, against N/original's $42,275.
- **Informed lane I3 raises the breach share from 3.9 % to 4.7 %.**

## 3. Giveback and stop-level protection (CPU diagnostics, complete shared-capital pool)

### 3.1 Giveback (hindsight peak of each winning lot; never realizable)

| Fold / door | Subject | winning lots | ex-post peak | retained | giveback | retained share |
|---|---|---|---|---|---|---|
| C19 → D21 (2016–2021) | CTRL primary | 44 | $388,413 | $205,143 | $183,270 | 52.8 % |
| | EXP primary (VGT) | 51 | $492,900 | $294,864 | $198,036 | 59.8 % |
| | New L0 / N/original | 17 / 17 | $386,968 / $387,476 | $251,373 / $251,839 | $135,595 / $135,638 | 65.0 % / 65.0 % |
| C21 → D23 (2016–2023) | CTRL primary | 34 | $481,368 | $260,647 | $220,721 | 54.1 % |
| | EXP primary (GDX) | 26 | $503,284 | $293,440 | $209,844 | 58.3 % |
| | New L0 / N/original | 32 / 30 | $578,033 / $574,432 | $347,491 / $354,607 | $230,542 / $219,825 | 60.1 % / 61.7 % |
| C24 → FULL (2016–2026-10) | CTRL primary | 22 | $487,813 | $296,947 | $190,867 | 60.9 % |
| | EXP primary (GDX+VGT) | 33 | $544,110 | $329,299 | $214,811 | 60.5 % |
| | New L0 / N/original | 46 / 44 | $834,701 / $828,709 | $507,212 / $512,114 | $327,489 / $316,595 | 60.8 % / 61.8 % |
| | informed I1 / I2 / I3 EXP primary | 46 / 45 / 46 | $834,701 / $814,844 / $834,701 | $521,981 / $508,881 / $512,883 | $312,720 / $305,963 / $321,818 | 62.5 % / 62.5 % / 61.5 % |

- **S1 raises the retained share of the ex-post peak, but only by a few points.** Between an ON representative and its
  own all-OFF projection the mean change is +3.6, +2.0 and +2.0 points at C19, C21 and C24 (per pair −11.4 to +39.7):
  training-door pair replays, last column of `tables/selection-C*-mechanism.md`.
- **On the full 2016–2026 run, the informed primaries retain 61.5–62.5 %, against New L0's 60.8 %.** About 38 % of
  every winning lot's hindsight peak is still given back. S1 trims the giveback; it does not change its scale.

### 3.2 Protection at the armed level (hypothetical) versus realized

At arming, the stage-2 stop level `H × (1 − τ₂)` implies a P&L if the lot had exited exactly there. This is an
identity, never realized P&L. Realized net is what the armed lots actually earned in the pooled run.

| Fold / door | Subject | armed lots | staged-exit lots | placement exits | gap exits (worst gap) | Σ P&L at the armed level (hypothetical) | Σ realized net of the armed lots |
|---|---|---|---|---|---|---|---|
| C19 → D21 | EXP primary (VGT) | 3 | 2 | 0 | 0 | $5,730 | $85,912 |
| C21 → D23 | EXP primary (GDX) | 1 | 1 | 0 | 0 | $38,650 | $38,452 |
| C24 → FULL | EXP primary (GDX+VGT) | 3 | 3 | 0 | 2 (−1.24 %) | $112,215 | $104,298 |
| C24 → FULL | informed I1 EXP primary | 6 | 6 | 0 | 2 (−0.20 %) | $193,633 | $236,434 |
| C24 → FULL | informed I2 EXP primary | 9 | 9 | 1 | 3 (−1.92 %) | $222,545 | $267,282 |
| C24 → FULL | informed I3 EXP primary | 4 | 4 | 0 | 0 | $95,117 | $128,942 |
| C24 → FULL | New L0 + EXP primary's staged genes | 5 | 5 | 0 | 3 (−1.24 %) | $182,897 | $171,947 |
| C24 → FULL | N/original + I1's staged genes | 7 | 7 | 0 | 2 (−0.20 %) | $215,359 | $259,426 |

- **Realized net can exceed the level at arming.** The stage-2 stop keeps trailing after arming. The wide-activation
  informed settings (A 24–49 %) realized 20–36 % more than their arming levels.
- **Realized net can also fall short of the level.** The tight-τ₂ EXP pooled primary (τ₂ 2.0–3.7 %) realized 7 % less
  than its arming levels, because two of its three staged exits gapped through the stop: worst gap −1.24 %.
- **Hypothetical protection is not realized profit.** At C21 one armed lot shows $38,650 at the armed level and realized
  $38,452. At C19 the three armed lots show only $5,730 at the level but realized $85,912; the profits came from the
  continued trailing, not from the level.

### 3.3 How often a staged exit forfeited the rest of a profitable trend

A staged exit is counted as **forfeited** when the lot ends in a staged (armed) trailing exit and the same entry, in the
paired configuration without S1, ended later with a larger net (`tools/vg-l0-staged-stop/diagnose.ts`).

| Pair set (door) | pairs | staged-exit lots | forfeited | share of staged exits | Σ forfeited | changed exits better / worse (Σ) |
|---|---|---|---|---|---|---|
| Stage A fixed points (D24; unselected settings) | 144 | 1,101 | 329 | **29.9 %** | $3,210,819 | 394 (+$834,330) / 329 (−$3,210,819) |
| C19 ON reps vs own all-OFF (D19; selected in-sample) | 51 | 80 | 5 | 6.3 % | $38,695 | 50 (+$165,094) / 11 (−$40,021) |
| C21 ON reps vs own all-OFF (D21; in-sample) | 53 | 186 | 10 | 5.4 % | $60,804 | 108 (+$301,344) / 13 (−$63,810) |
| C24 ON reps vs own all-OFF (D24; in-sample) | 46 | 218 | 13 | 6.0 % | $102,914 | 127 (+$252,795) / 13 (−$102,914) |
| Decomposition pairs (D24; in-sample) | 12 | 52 | 4 | 7.7 % | $51,078 | 44 (+$96,793) / 4 (−$51,078) |
| Decomposition pairs (FULL 2016–2026-10) | 12 | 72 | 10 | **13.9 %** | $133,237 | 58 (+$131,692) / 10 (−$133,237) |

- **With fixed, unselected settings S1 forfeited a trend at 30 % of its staged exits.** The sum forfeited was four times
  the sum gained.
- **The search finds settings that rarely forfeit on the training door, at 5–8 % of staged exits.** It picks
  activation and τ₂ where the training history's big trends were not cut.
- **Out of sample the rate rises.** Adding 2025–2026 to the decomposition pairs adds about 20 staged exits and 6
  forfeitures, roughly 30 % of the new staged exits. That is the unselected rate again.
- **On FULL the decomposition pairs lose more to forfeiture ($133,237) than they gain from changed exits
  ($131,692).**
- **The largest single forfeiture of the validation window is in the EXP pooled primary.** A D1·VGT lot entered
  2025-04-21 after the April 2025 sell-off. It took its staged exit on 2025-07-14 at $33,147, while its all-OFF
  projection held the same lot to 2025-11-07 at $48,036. That costs $14,889, exactly the primary's validation shortfall
  against its own all-OFF projection. The same lot under New L0 and N/original with the primary's staged genes forfeited
  $13,462 and $10,888.
- **Informed I2's GDX lot of 2026-07-30 took its staged exit on 2026-08-13 and forfeited $14,316.** That is most of I2's
  −$11,850 validation shortfall against N/original.

## 4. Gap, stop slippage and the other stresses

### 4.1 Training door (sealed; net with marked DD; `tables/tails.md`)

| Subject (C24, D24) | base | cost 0 bps | cost 10 bps | cost 20 bps | interest 14 % | stop slip +10 bps | stop slip +25 bps | next-open stops |
|---|---|---|---|---|---|---|---|---|
| New L0 | $382,721 | $386,568 | $378,879 | $368,949 | $365,782 | $379,370 | $374,343 | $382,794 |
| CTRL primary | $241,225 | $243,295 | $239,156 | $235,026 | $225,899 | $239,410 | $236,687 | $240,899 |
| EXP primary (GDX+VGT) | $238,352 | $241,081 | **$204,467** | $199,484 | $194,108 | $205,097 | $202,298 | $206,865 |
| EXP primary all-OFF | $232,478 | $235,202 | **$198,599** | $193,626 | $188,119 | $199,229 | $196,438 | $201,197 |
| informed I1 EXP primary | $392,021 | $395,877 | $388,169 | $378,189 | $375,130 | $388,660 | $383,619 | $392,212 |
| informed I2 EXP primary | $396,648 | $400,408 | $392,892 | $383,105 | $379,913 | $393,281 | $388,230 | $396,415 |

- **The C24 EXP pooled primary is path-fragile.** Every stress except zero cost removes $31–44k (13–19 %), against
  under 7 % for the other subjects.
- **The fragility is in its base genes, not in S1.** Its all-OFF projection loses the same amounts, and S1's +$5,874 on
  D24 survives every stress.
- **Next-open execution of the D1 stops (the gap stress) moves the S1 subjects by under $400 except the EXP primary.**
  The informed I1 and I2 primaries are as robust to stop slippage and gaps as the incumbents.

### 4.2 Validation window 2025-01-02 → 2026-10-30 (sealed; interval P&L)

| Subject | base | cost 0 bps | cost 20 bps | interest 14 % | stop slip +25 bps | next-open stops |
|---|---|---|---|---|---|---|
| New L0 | $96,884 | $98,145 | $93,108 | $93,876 | $94,571 | $96,918 |
| N/original | $94,670 | $95,929 | $90,900 | $91,661 | $92,362 | $94,706 |
| CTRL primary | $55,308 | $55,779 | $53,896 | $52,214 | $54,244 | $55,337 |
| EXP primary (GDX+VGT) | $60,162 | $61,087 | $57,288 | $58,272 | $57,791 | $60,019 |
| EXP primary all-OFF | $75,051 | $75,995 | $72,122 | $72,207 | $72,634 | $74,908 |
| informed I1 EXP primary | $102,353 | $103,620 | $98,561 | $99,353 | $100,027 | $102,348 |
| informed I2 EXP primary | $82,820 | $84,066 | $79,087 | $79,943 | $80,543 | $82,866 |
| informed I3 EXP primary | $98,298 | $99,561 | $94,518 | $95,290 | $95,982 | $98,484 |

- **The stresses do not reorder any comparison on the validation window.** S1's effect is the same under every
  friction: I1 is about $5k above New L0, I2 about $12k below N/original, and the EXP primary about $15k below its own
  all-OFF projection.
- **Gap exits through the staged level are rare and small.** Over 2016–2026 there were 0–3 gap exits per subject, the
  worst −1.92 % beyond the level. Next-open execution changes validation P&L by under $200.

## 5. Profit concentration (lot nets in the pooled run; `tables/lots-*.md`)

| Door | Subject | Σ lot nets | winners / losers | top 1 | top 3 | top 5 | net without top 5 |
|---|---|---|---|---|---|---|---|
| D21 | CTRL primary C19 | $104,038 | 30 / 15 | 35.5 % | 80.5 % | 107.3 % | −$7,649 |
| D21 | EXP primary C19 | $227,034 | 33 / 18 | 25.3 % | 57.0 % | 71.7 % | $64,344 |
| D23 | CTRL primary C21 | $223,901 | 22 / 12 | 21.3 % | 47.8 % | 64.5 % | $79,607 |
| D23 | EXP primary C21 | $240,651 | 19 / 7 | 18.3 % | 45.4 % | 66.2 % | $81,391 |
| FULL | CTRL primary C24 | $296,532 | 21 / 1 | 13.7 % | 39.0 % | 59.8 % | $119,201 |
| FULL | EXP primary C24 | $298,514 | 27 / 6 | 13.6 % | 34.9 % | 52.0 % | $143,274 |
| FULL | New L0 | $479,605 | 37 / 9 | 10.8 % | 28.6 % | 41.3 % | $281,726 |
| FULL | N/original | $482,701 | 36 / 8 | 10.6 % | 27.9 % | 40.5 % | $287,179 |
| FULL | informed I1 EXP primary | $494,374 | 37 / 9 | 11.2 % | 29.6 % | 42.6 % | $283,741 |
| FULL | informed I2 EXP primary | $479,467 | 37 / 8 | 11.2 % | 29.5 % | 41.2 % | $281,954 |

- **The fold primaries are much more concentrated than the incumbents.** Their top five lots carry 52–107 % of the sum,
  against 40–41 % for New L0 and N/original.
- **S1 lowers the concentration of an EXP primary slightly** (C24: 52.0 % against 59.8 % for CTRL). It does this by
  cutting the big winners' tails, not by adding many winners.
- **Around the incumbents, S1 leaves the concentration unchanged.**
- **The pooled nets above are whole-run portfolio figures.** No standalone trade profits were added.

## 6. Chronological performance

### 6.1 Fold primaries on their next interval (sealed; reset DD)

| Fold → interval | CTRL primary P&L (DD) | EXP primary P&L (DD) | EXP primary all-OFF P&L | New L0 | N/original | T1 (EXP DD ≤ CTRL + $5k) |
|---|---|---|---|---|---|---|
| C19 → 2020–2021 | −$23,584 ($63,636) | +$76,321 ($37,941) | +$73,962 | +$171,403 | +$171,402 | pass |
| C21 → 2022–2023 | −$12,102 ($39,387) | −$12,168 ($55,987) | −$12,168 | +$87,238 | +$92,082 | **fail** |
| C24 → 2025-01 → 2026-10 | +$55,308 ($25,430) | +$60,162 ($20,373) | +$75,051 | +$96,884 | +$94,670 | pass |

- **Chronological check §9.3: passed by neither arm.** Σ interval P&L is CTRL $19,622 and EXP $124,315. The largest
  interval DD is CTRL $63,636 and EXP $55,987, both above $35,000.
- **The incumbents were chosen with these windows in view.** Their interval figures are reference points, not
  out-of-sample evidence.
- **T2 (U90 of the paired representative interval DD difference < +$5,000):** fails at C19 (U90 +$5,319) and passes at
  C21 (+$3,013) and C24 (+$2,224).
- **T3 (paired mean interval P&L, EXP − CTRL):** +$2,490, +$4,030 and −$5,156, and no interval excludes zero on the
  positive side.

### 6.2 Annual marked net of the C24 subjects (continuous run, FULL; CPU diagnostic = sealed GPU)

| Subject | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 (to 10-30) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| New L0 | $8,588 | $23,852 | $18,525 | $29,005 | $138,878 | $32,525 | $43,474 | $43,764 | $44,110 | $47,531 | $49,353 |
| N/original | $8,588 | $23,852 | $18,870 | $29,127 | $138,876 | $32,526 | $48,277 | $43,805 | $44,110 | $45,169 | $49,501 |
| CTRL primary | $4,114 | $27,897 | $8,415 | $38,144 | $104,450 | $11,339 | $12,464 | $25,656 | $8,745 | $31,779 | $23,528 |
| EXP primary | $1,325 | $25,182 | $8,065 | $24,407 | $119,325 | $0 | $28,563 | $28,128 | $3,358 | $27,820 | $32,342 |
| EXP primary all-OFF | $1,325 | $25,182 | $8,065 | $18,533 | $119,325 | $0 | $28,563 | $28,128 | $3,358 | $42,709 | $32,342 |
| informed I1 EXP primary | $8,588 | $23,852 | $18,525 | $29,005 | $144,242 | $32,525 | $43,474 | $45,779 | $46,030 | $51,020 | $51,333 |
| informed I2 EXP primary | $8,588 | $23,852 | $18,870 | $29,127 | $144,842 | $32,526 | $47,335 | $45,597 | $45,911 | $47,635 | $35,185 |
| informed I3 EXP primary | $8,588 | $23,852 | $18,525 | $29,005 | $140,358 | $32,525 | $43,474 | $45,156 | $45,495 | $47,531 | $50,768 |

- **S1's effect on the EXP primary falls in two single years:** +$5,874 in 2019 and −$14,889 in 2025. Every other year
  is identical to its all-OFF projection.
- **Informed I1's +$14,769 over New L0 across 2016–2026** comes from +$5,364 in 2020, 2023–2025 (+$2,015 / +$1,920 /
  +$3,489) and 2026 (+$1,980). It is a small, spread-out effect.
- **Informed I2 matches N/original's pattern until 2026, when one forfeited GDX trend costs $14,316.**
- More annual tables for every fold are in `tables/annual-train-validate.md`.

## 7. Regimes (Δ marked net inside the window; daily DD; `tables/lots-C24-FULL.md`)

| Subject | 2018 Q4 | 2020-02/03 | calendar 2022 | 2025-04 |
|---|---|---|---|---|
| New L0 | +$9,454 (DD $6,093) | +$66,908 (DD $12,488) | +$43,474 (DD $13,358) | +$12,798 (DD $7,208) |
| CTRL primary | −$3,167 (DD $10,826) | +$59,370 (DD $22,356) | +$12,464 (DD $13,070) | +$11,955 (DD $8,986) |
| EXP primary | −$3,340 (DD $11,215) | +$65,495 (DD $7,553) | +$28,563 (DD $12,854) | +$13,560 (DD $6,102) |
| informed I1 EXP primary | +$9,454 | +$68,699 | +$43,474 | +$12,798 |
| informed I2 EXP primary | +$10,059 | +$70,321 | +$47,335 | +$11,008 |

- **The COVID crash (2020-02/03) is where S1 helps most**, by +$1.5k to +$3.4k over the incumbents. GDX and VGT trends
  armed and locked in before the March 2020 reversal.
- **In 2018 Q4, 2022 and April 2025 S1 changes nothing or loses slightly** (I2 −$942 in 2022).

## 8. Conclusions on risk

1. **S1 is risk-neutral at the preregistered level.** It passed non-inferiority on all five metrics at all three folds,
   with no metric clearly worse. Its DD tails equal its own all-OFF projections'.
2. **S1 does not reduce drawdown.** S1 is supposed to protect profits, and it does not lower any finalist's p90, p95 or
   worst DD.
3. **Its benefit and its cost are both concentrated in a few large trends.** It helps when a trend reverses sharply
   after arming (March 2020). It hurts when a trend pauses after arming and then resumes (VGT April–November 2025, GDX
   August 2026).
4. **Out of sample the forfeiture rate reverts towards the unselected 30 %.** The training-door selection finds
   settings that dodge the known reversals; that is the main reason the in-sample advantage does not carry over.
