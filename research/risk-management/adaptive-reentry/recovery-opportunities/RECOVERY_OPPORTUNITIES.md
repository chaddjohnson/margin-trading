# Family D — Recovery opportunity preservation

Experiment `adaptive_recovery_opps`, run 2026-10-12 through the frozen Phase 2 runner
(`common/runner.py`; calibration gate passed on all four datasets — `A_baseline` and `REF_lower3`
reproduced the frozen baseline and lower-price-reentry `B_lower_3pct` trade for trade; `selftest.py`
PASS). 15 configurations registered in `registry.jsonl` BEFORE the first run; 60 runs
(config × dataset) in `results/`. The D6 diagnostic table is `D6_FAILURE_MECHANISMS.csv`.
No production code, shared infrastructure or other family directory was touched; nothing committed.

**Headline.** The D6 diagnostic shows the fixed rules' missed winners are dominated by (1) the
variant holding an overlapping position (not a restriction failure), (2) **small-loss triggers** and
(3) **the 10% signal lapsing before the frozen-high reset frees the strategy** — NOT by intraday
near-misses. Consistent with that, the two paths that attack mechanisms (2)+(3) directly —
`D7_tiny_loss_exit_anchor` and `D3_tolerance_deep` — are the only configurations that rescue the
known misses at small bear-market cost. Every rebound/turn-based path (`D1_*`, `D4_score`,
`D7_confirm_near`, `D7_fresh_leg`) buys 2000–02 bear rallies, exactly as feared; the reset-only
variant `D1_reset_only_rebound12` is the single worst configuration of the family (−$68,859 on
QQQ 1999–2015). `D2_window` as specified is arithmetically almost unsatisfiable and fired once in
26 years of data. No configuration dominates all four datasets.

---

## 1. Hypotheses as registered

Full text in `registry.jsonl` (append-only, timestamps 2026-10-12, all before the first run).
Summary: D1-reset — a 12% rebound off the episode low means the decline reversed; clearing the
restriction (entry still needs the 10% signal) rescues V-bottoms at modest cost. D1-alt
(exploratory) — buy the confirmed 10% turn directly, capped at 0.85×ref-high against bear-rally
tops. D2 — a 2% tolerance band gated by a 3% rebound buys turns, not knives (registered caveat: the
two conditions are jointly satisfiable only if the episode low closed ≈1% below the level on a
non-actionable session). D3 — relax 2% only in deep (dd252 ≥ 25%) markets; honesty control
`D3_control_fixed_106` = the same relaxation applied unconditionally. D4 — 2-of-4 evidence score;
registered risk: degenerates to "always enter" in cascades. D5 — 20-session range < 5% ⇒ 1%
discount; measure bear false-stability. D7_confirm_near — two up closes within 5% of the level
(the satisfiable version of D2's intent). D7_signal_pressure — ≥10 blocked signal sessions AND
within 3% of the level (opportunity-cost counter). D7_higher_low_base — 15-session floor while
≤0.90×ref-high (QQQ-2003 basing rescue). D7_fresh_leg — post-exit rebound ≥8% then −8% from the
post-exit high = a new correction. D7_tiny_loss_exit_anchor — |loss| < $2,000 ⇒ require only
close ≤ loss exit (0% discount; targets the small-loss mechanism). Anchors: `REF_lower3`,
`lower5`, `lower8` for D6.

## 2. Exact mechanisms

All configurations keep trigger = net loss, required level = loss-exit × 0.97, reset = close ≥
0.95 × frozen ref-high, except the single documented change (`strategies.py`, matching the registry
verbatim). All comparisons use closes. Alt entries run only on 10%-signal sessions, while
restricted and flat, after reset priority, and only when the close did not reach the required level.
`st.min_close`/`st.max_close` include the current session. dd252 = `ind.dd_from_high(252)`
(engine-convention shorter window at the start; `indicator_fallbacks` = 0 in every run — NaN occurs
only at i = 0). D5's range uses `max_close(20)/min_close(20)`, per-session, no latch (the "once"
in the spec implemented as a condition, not a latch — called out here per the rules).

## 3. Results per dataset

Net / max DD / P:DD / closed trades (W−L) / blocked signal sessions / lower-price re-entries /
alt entries / resets (false). Reference rows first. Δctrl = vs baseline-matched exposure control
(profit, DD); Δl3ctrl = vs ex-post lower3-matched control. Full numbers: `results/summary.json`.

### VGT 2005–2015 (baseline 11,602 / 73,404)

| Config | Net | MaxDD | P:DD | Tr (W−L) | blk | low | alt | rst(f) | vs l3 | Δctrl | Δl3ctrl |
|---|---:|---:|---:|---|---:|---:|---:|---|---:|---|---|
| REF_lower3 | 26,384 | 54,279 | 0.49 | 22 (8−14) | 274 | 8 | 0 | 5(4) | 0 | +19,130/+8,383 | 0/0 |
| lower5 | 16,088 | 53,321 | 0.30 | 20 (6−14) | 283 | 7 | 0 | 6(5) | −10,296 | +10,548/+18,273 | −4,060/+11,872 |
| lower8 | 6,557 | 49,103 | 0.13 | 17 (6−11) | 332 | 4 | 0 | 6(4) | −19,827 | +245/+9,171 | −16,398/+1,878 |
| D1_reset_only_rebound12 | **−16,785** | 64,826 | −0.26 | 26 (6−20) | 220 | 11 | 0 | 8(6) | −43,169 | −24,039/+18,930 | −43,169/+10,547 |
| D1_alt_entry_rebound10 | 15,390 | 68,545 | 0.22 | 27 (7−20) | 199 | 12 | 2 | 5(4) | −10,994 | +7,393/+17,951 | −13,694/+8,710 |
| D2_window | 26,384 | 54,279 | 0.49 | = REF | 274 | 8 | 0 | 5(4) | 0 | = REF | 0/0 |
| D3_tolerance_deep | 28,385 | 51,712 | 0.55 | 22 (7−15) | 276 | 9 | 0 | 5(4) | +2,000 | +21,159/+6,001 | +2,107/−2,348 |
| D3_control_fixed_106 | 31,751 | 55,343 | 0.57 | 28 (7−21) | 180 | 16 | 0 | 5(4) | +5,367 | +24,223/+7,715 | +4,372/−983 |
| D4_score | 10,559 | 69,168 | 0.15 | 33 (11−22) | 87 | 4 | 13 | 4(3) | −15,825 | +686/+6,705 | −25,348/−4,703 |
| D5_stabilized_relax | 26,384 | 54,279 | 0.49 | = REF | 274 | 8 | 0 | 5(4) | 0 | = REF | 0/0 |
| D7_confirm_near | 15,352 | 59,014 | 0.26 | 23 (8−15) | 252 | 5 | 4 | 5(4) | −11,032 | +7,873/+11,696 | −11,849/+3,053 |
| D7_signal_pressure | 10,636 | 53,169 | 0.20 | 26 (9−17) | 199 | 7 | 4 | 5(3) | −15,748 | +2,126/−671 | −20,315/−10,504 |
| D7_higher_low_base | 15,371 | 55,501 | 0.28 | 31 (9−22) | 163 | 9 | 7 | 5(4) | −11,014 | +7,061/+2,928 | −14,851/−6,674 |
| D7_fresh_leg | **40,987** | 62,202 | 0.66 | 27 (9−18) | 216 | 9 | 5 | 3(3) | +14,603 | +32,223/+6,755 | +9,113/−3,371 |
| D7_tiny_loss_exit_anchor | 30,734 | 58,645 | 0.52 | 28 (9−19) | 215 | 6 | 9 | 4(3) | +4,350 | +22,766/+8,236 | +1,756/−970 |

### QQQ 1999–2015 (baseline −2,886 / 149,561)

| Config | Net | MaxDD | P:DD | Tr (W−L) | blk | low | alt | rst(f) | vs l3 | Δctrl | Δl3ctrl |
|---|---:|---:|---:|---|---:|---:|---:|---|---:|---|---|
| REF_lower3 | 40,258 | 91,469 | 0.44 | 69 (28−41) | 425 | 31 | 0 | 10(7) | 0 | +41,968/+2,844 | 0/0 |
| lower5 | 87,845 | 57,795 | 1.52 | 57 (24−33) | 575 | 23 | 0 | 10(6) | +47,587 | +89,173/−11,047 | +56,573/−13,257 |
| lower8 | 22,008 | 49,587 | 0.44 | 43 (15−28) | 736 | 16 | 0 | 12(8) | −18,250 | +22,794/+8,866 | +3,510/+7,559 |
| D1_reset_only_rebound12 | **−68,859** | **129,352** | −0.53 | 80 (28−52) | 309 | 34 | 0 | 18(14) | −109,118 | −67,249/+45,889 | −106,773/+43,211 |
| D1_alt_entry_rebound10 | 16,846 | 102,934 | 0.16 | 80 (30−50) | 294 | 35 | 5 | 10(7) | −23,412 | +18,692/+7,270 | −26,610/+4,199 |
| D2_window | 39,289 | 91,469 | 0.43 | 70 (28−42) | 421 | 31 | 1 | 10(7) | −969 | +41,001/+2,736 | −1,019/−112 |
| D3_tolerance_deep | 31,001 | 92,427 | 0.34 | 79 (31−48) | 301 | 38 | 0 | 10(7) | −9,257 | +32,837/−2,696 | −12,209/−5,748 |
| D3_control_fixed_106 | 52,363 | 85,587 | 0.61 | 83 (31−52) | 258 | 45 | 0 | 7(4) | +12,105 | +54,506/−25,456 | +1,922/−29,019 |
| D4_score | **−31,919** | **134,981** | −0.24 | 95 (34−61) | 109 | 17 | 37 | 7(5) | −72,177 | −29,457/+7,368 | −89,887/+3,273 |
| D5_stabilized_relax | 35,808 | 95,919 | 0.37 | 69 (28−41) | 425 | 31 | 0 | 10(7) | −4,450 | +37,519/+7,222 | −4,483/+4,376 |
| D7_confirm_near | 41,818 | 85,744 | 0.49 | 75 (32−43) | 410 | 26 | 12 | 5(3) | +1,560 | +43,995/−27,104 | −9,444/−30,726 |
| D7_signal_pressure | **58,663** | **66,374** | 0.88 | 76 (31−45) | 336 | 26 | 10 | 9(6) | +18,405 | +60,554/−31,637 | +14,142/−34,782 |
| D7_higher_low_base | 51,753 | 75,443 | 0.69 | 80 (31−49) | 282 | 32 | 9 | 8(7) | +11,495 | +53,875/−34,553 | +1,787/−38,083 |
| D7_fresh_leg | 34,961 | 88,931 | 0.39 | 79 (30−49) | 318 | 30 | 10 | 9(7) | −5,297 | +36,803/−6,517 | −8,396/−9,580 |
| D7_tiny_loss_exit_anchor | **73,678** | **69,850** | 1.05 | 76 (31−45) | 369 | 27 | 11 | 7(5) | +33,419 | +75,915/−46,139 | +20,989/−49,861 |

### VGT 2016–2026 (baseline 161,772 / 38,323)

| Config | Net | MaxDD | P:DD | Tr (W−L) | blk | low | alt | rst(f) | vs l3 | Δctrl | Δl3ctrl |
|---|---:|---:|---:|---|---:|---:|---:|---|---:|---|---|
| REF_lower3 | 182,094 | 28,687 | 6.35 | 32 (13−19) | 138 | 15 | 0 | 4(2) | 0 | +63,993/+710 | 0/0 |
| lower5 | 55,944 | 24,347 | 2.30 | 27 (10−17) | 202 | 9 | 0 | 8(4) | −126,150 | −19,549/+6,463 | −60,456/+6,009 |
| lower8 | 22,062 | 24,347 | 0.91 | 24 (9−15) | 237 | 6 | 0 | 9(5) | −160,032 | −46,242/+8,166 | −83,253/+7,755 |
| D1_reset_only_rebound12 | 187,119 | 28,687 | 6.52 | 35 (14−21) | 106 | 16 | 0 | 5(3) | +5,025 | +59,631/−1,514 | −9,448/−2,280 |
| D1_alt_entry_rebound10 | 182,094 | 28,687 | 6.35 | = REF (alt never fired) | 138 | 15 | 0 | 4(2) | 0 | = REF | 0/0 |
| D2_window | 182,094 | 28,687 | 6.35 | = REF | 138 | 15 | 0 | 4(2) | 0 | = REF | 0/0 |
| D3_tolerance_deep | 209,467 | 28,687 | 7.30 | 34 (15−19) | 96 | 16 | 0 | 3(1) | +27,373 | +73,258/−3,580 | −547/−4,398 |
| D3_control_fixed_106 | 214,090 | 30,240 | 7.08 | 37 (16−21) | 60 | 20 | 0 | 1(0) | +31,996 | +55,913/−7,232 | −29,797/−8,182 |
| D4_score | 165,824 | 57,559 | 2.88 | 41 (13−28) | 63 | 6 | 20 | 2(1) | −16,270 | +20,761/+23,195 | −57,842/+22,323 |
| D5_stabilized_relax | 182,094 | 28,687 | 6.35 | = REF | 138 | 15 | 0 | 4(2) | 0 | = REF | 0/0 |
| D7_confirm_near | 202,617 | 29,336 | 6.91 | 36 (16−20) | 92 | 13 | 5 | 2(0) | +20,523 | +55,025/−5,628 | −24,949/−6,515 |
| D7_signal_pressure | 173,922 | 28,687 | 6.06 | 31 (12−19) | 175 | 13 | 2 | 4(2) | −8,172 | +60,681/+1,861 | −679/+1,180 |
| D7_higher_low_base | **215,639** | 28,687 | **7.52** | 37 (15−22) | 103 | 17 | 3 | 2(1) | +33,545 | +72,773/−5,157 | −4,639/−6,016 |
| D7_fresh_leg | 202,904 | 30,649 | 6.62 | 35 (15−20) | 126 | 15 | 2 | 3(1) | +20,810 | +70,757/−656 | −848/−1,450 |
| D7_tiny_loss_exit_anchor | 195,238 | **28,436** | 6.87 | 37 (15−22) | 80 | 9 | 11 | 2(0) | +13,144 | +45,981/−6,923 | −34,895/−7,820 |

### QQQ 2016–2026 (baseline 116,388 / 39,237)

| Config | Net | MaxDD | P:DD | Tr (W−L) | blk | low | alt | rst(f) | vs l3 | Δctrl | Δl3ctrl |
|---|---:|---:|---:|---|---:|---:|---:|---|---:|---|---|
| REF_lower3 | 132,242 | 23,564 | 5.61 | 27 (13−14) | 111 | 10 | 0 | 4(1) | 0 | +35,187/−9,155 | 0/0 |
| lower5 | 137,609 | 23,564 | 5.84 | 24 (12−12) | 159 | 8 | 0 | 4(1) | +5,366 | +44,812/−7,719 | +11,169/+1,034 |
| lower8 | 151,945 | 23,564 | 6.45 | 21 (12−9) | 206 | 6 | 0 | 3(1) | +19,702 | +57,075/−8,418 | +22,680/+531 |
| D1_reset_only_rebound12 | 125,862 | 29,723 | 4.23 | 30 (14−16) | 85 | 11 | 0 | 5(2) | −6,380 | +20,569/−5,773 | −17,604/+4,159 |
| D1_alt_entry_rebound10 | 132,242 | 23,564 | 5.61 | = REF (alt never fired) | 111 | 10 | 0 | 4(1) | 0 | = REF | 0/0 |
| D2_window | 132,242 | 23,564 | 5.61 | = REF | 111 | 10 | 0 | 4(1) | 0 | = REF | 0/0 |
| D3_tolerance_deep | **141,825** | 23,564 | 6.02 | 30 (15−15) | 68 | 12 | 0 | 3(1) | +9,583 | +38,661/−11,214 | +1,260/−1,483 |
| D3_control_fixed_106 | **98,596** | **32,865** | 3.00 | 30 (13−17) | 65 | 13 | 0 | 4(1) | −33,646 | +6,079/+1,676 | −27,462/+10,403 |
| D4_score | 80,399 | 43,340 | 1.86 | 32 (11−21) | 55 | 5 | 11 | 5(1) | −51,843 | −10,100/+12,831 | −42,910/+21,368 |
| D5_stabilized_relax | 132,242 | 23,564 | 5.61 | = REF | 111 | 10 | 0 | 4(1) | 0 | = REF | 0/0 |
| D7_confirm_near | 114,809 | 38,062 | 3.02 | 26 (12−14) | 154 | 7 | 3 | 4(1) | −17,433 | +21,788/+6,703 | −11,936/+15,478 |
| D7_signal_pressure | 141,265 | 23,564 | 5.99 | 28 (14−14) | 99 | 10 | 1 | 3(1) | +9,023 | +40,623/−10,364 | +4,136/−871 |
| D7_higher_low_base | 132,267 | 26,627 | 4.97 | 30 (14−16) | 82 | 11 | 2 | 3(1) | +25 | +26,470/−9,039 | −11,886/+941 |
| D7_fresh_leg | 118,751 | 36,335 | 3.27 | 28 (12−16) | 132 | 9 | 3 | 4(1) | −13,491 | +23,937/+4,372 | −10,437/+13,316 |
| D7_tiny_loss_exit_anchor | 122,725 | 31,521 | 3.89 | 27 (13−14) | 142 | 6 | 5 | 3(1) | −9,518 | +26,398/−952 | −8,525/+8,134 |

Notes. `indicator_fallbacks` = 0 in all 60 runs. Reset-priority blocks occurred ONLY under
`D1_reset_only_rebound12` (2/6/2/2 per dataset) — the rebound reset is the first mechanism in this
program for which the dual-trigger case is real. Unresolved-at-end episodes: only the trivial
9-session VGT 2005–2015 tail (every config except `D7_tiny_loss_exit_anchor` and
`D3_control_fixed_106`-style early resolvers; D7_tiny captured the tail's +5,731 as an alt entry at
2015-09-28). The ex-post lower3-matched control scales lower3 UP for configurations with more
exposure, which makes Δl3ctrl a hard benchmark on strongly trending datasets (VGT 2016–2026).

## 4. Bear and recovery windows

Window P&L (from `results/summary.json`; recovery windows include 2026-03-20..2026-10-06):

| Window | REF | l5 | l8 | D1rst | D1alt | D3 | D3ctl | D4 | D7cnf | D7sig | D7hlb | D7frl | D7tny |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| QQQ 2000–02 | −11,471 | +13,619 | +24,328 | **−59,517** | −31,133 | −4,040 | −9,256 | **−78,281** | **−33,341** | **−7,318** | −12,538 | −17,484 | −16,251 |
| QQQ 2007–09 | +45,281 | +60,884 | −9,231 | −28,690 | +41,788 | +30,079 | +27,822 | −4,482 | +48,355 | +40,419 | +43,907 | +41,224 | +48,007 |
| VGT 2007–09 | −6,198 | −37 | −30,663 | −49,366 | −17,191 | −4,197 | −5,270 | −35,823 | −15,225 | −38,703 | −8,723 | −15,425 | −8,006 |
| VGT 2022 | −3,865 | −35 | +1,838 | −6,490 | −3,865 | −5,296 | −13,937 | −45,019 | −1,621 | −12,036 | −7,034 | −14,735 | −6,076 |
| QQQ 2022 | −9,942 | −4,624 | −6,733 | −16,780 | −9,942 | −7,997 | −18,051 | −30,398 | −27,376 | −7,627 | −13,710 | −23,417 | −18,605 |
| QQQ 2003 | 0 | −1,187 | 0 | +15,444 | −23 | −1,251 | −1,251 | +20,908 | 0 | **+19,532** | +17,506 | −23 | 0 |
| QQQ 2009 | +65,938 | +69,817 | 0 | −4,911 | +67,930 | +69,817 | +69,817 | +48,060 | +65,938 | +63,623 | +67,930 | +66,522 | +65,938 |
| VGT 2009 | +29,642 | +33,093 | 0 | −6,207 | +29,314 | +33,093 | +33,093 | +12,429 | +24,437 | −6,207 | +29,314 | +29,314 | +29,642 |
| VGT 2020 | +55,455 | +21 | +21 | +55,455 | +55,455 | +55,455 | +55,455 | +38,805 | +55,455 | +55,455 | +55,455 | +55,455 | +55,455 |
| VGT 2023 | +18,901 | +295 | −503 | +16,937 | +18,901 | **+47,704** | +45,527 | +47,704 | +46,404 | +18,901 | **+50,581** | +50,581 | +44,468 |
| VGT 2025 | +42,023 | +850 | +850 | +42,023 | +42,023 | +42,023 | +36,993 | +36,953 | +36,993 | +42,023 | +42,023 | +42,023 | +36,993 |
| VGT 2026 | +51,712 | +36,423 | −239 | +51,712 | +51,712 | +51,712 | +45,820 | +51,712 | +51,712 | +51,712 | +48,739 | +51,712 | +47,148 |
| QQQ 2023 | +17,473 | +17,473 | +17,473 | +16,165 | +17,473 | **+25,111** | +25,111 | +16,165 | +17,473 | +24,181 | +18,232 | +17,456 | +25,111 |
| QQQ 2020/25/26 | all configs ≈ REF (no active restriction; +63,172 / +26,779 / +32,918) | | | | | | | | | | | | (D3ctl 2025: −3,301; D4 2025: −3,301) |

### 2000–02 alt entries and their P&L (the question the family was asked to answer explicitly)

QQQ 1999–2015, window 2000-01-01..2002-12-31, every alt entry with its trade result
(full list printed in `tmp/bear_rescue.txt`; derived from `results/events/` + `results/trades/`):

| Config | alt entries | losers | alt-trade P&L | character |
|---|---:|---:|---:|---|
| D4_score | 23 | 18 | **−65,340** | degenerates to buying the whole cascade (registered risk confirmed) |
| D7_confirm_near | 5 | 5 | **−56,193** | textbook bear-rally buys, e.g. 2001-02-15 @ 49.51 (+1.3% above the prior loss exit) → −19,616 |
| D7_fresh_leg | 7 | 7 | −27,275 | every "fresh leg" in 2000–02 kept falling (registered risk confirmed) |
| D7_higher_low_base | 3 | 3 | −22,284 | bear-rally floors (2000-05-08, 2001-08-14, 2002-08-26) |
| D7_signal_pressure | 6 | 5 | −19,412 | all entries 0.3–3.0% BELOW the prior loss exit; modest damage |
| D1_alt_entry_rebound10 | 4 | 3 | −7,846 | entries +4.1% to +14.1% ABOVE the loss exits; the 0.85×ref-high cap did NOT filter 2001 rallies |
| D7_tiny_loss_exit_anchor | 3 | 2 | **−1,891** | only tiny-loss episodes re-admit; the cheapest bear profile of any alt path |
| D2_window | 1 | 1 | −969 | its only firing in 26 years of data |
| D1_reset_only_rebound12 | 0 (5 in-window resets) | — | next-trades after resets −6,967 | resets at 2000-04-18, 2000-06-01, 2001-05-21, 2002-08-14, 2002-10-14; post-reset entries have NO price condition (e.g. 2000-06-02 @ 79.37 = 25% above the 63.59 loss exit); window P&L −59,517 |

2007–09 and 2022 alt entries (same method): D7_signal_pressure QQQ 2 alts +59,206 (incl. 2009-03-02
@ 23.10 → +52,010 — it bought the March 2009 bottom through the alt path); D7_confirm_near VGT-old
2 alts +24,530 (incl. 2009-03-04 → +24,437) but QQQ 2022 3 alts −16,163; D7_tiny VGT-new 2022
3 alts −871 (incl. 2022-11-04 → +4,640); D7_fresh_leg 2022 −4,591/−5,105 on VGT/QQQ.

## 5. Family-specific questions

### 5.1 D6 — why the fixed rules missed every baseline winner (the failure-mechanism table)

`D6_FAILURE_MECHANISMS.csv`: one row per (dataset × anchor × missed baseline winner), 150 rows —
42 under 3%, 50 under 5%, 58 under 8% (98 direct blocks, 52 holding/exited). Every row carries the
episode's frozen values, the required level, the minimum close gap, the deepest intraday low vs the
level (raw OHLC), the resolution and the signal state at resolution, plus one boolean per mechanism;
the primary classification uses the precedence variant_holding → small_loss (<$1,000) →
intraday-only → signal-lapsed → reset-too-late → never-reached (precedence documented in
`d6_diagnostic.py`; the flags columns preserve all overlaps).

**Counts (all four datasets) and missed baseline P&L per mechanism per threshold:**

| Mechanism | n @3% | n @5% | n @8% | $ @3% | $ @5% | $ @8% |
|---|---:|---:|---:|---:|---:|---:|
| variant_holding (overlapping position) | 20 | 16 | 16 | 274,977 | 191,529 | 176,695 |
| small_loss_trigger (|loss| < $1k) | 7 | 13 | 15 | 51,686 | 123,065 | 116,751 |
| signal_lapsed (reset in span, signal gone) | 8 | 6 | 11 | 74,584 | 28,159 | 213,111 |
| never_reached_level | 3 | 10 | 10 | 6,756 | 44,147 | 61,157 |
| reset_too_late (reset after the span) | 3 | 3 | 4 | 5,442 | 9,010 | 27,418 |
| reached_intraday_only (low ≤ level < close) | 1 | 2 | 2 | 18,141 | 54,399 | 5,135 |

Readings, in order of importance for the program:

1. **The single biggest bucket is not a restriction failure at all.** ~40–48% of "missed" winners
   were missed because the variant already held an overlapping (usually better-priced) position;
   their window P&L is typically positive. Any raw count of "blocked winners" overstates the
   problem roughly 2×.
2. **Among direct blocks, small-loss triggers and signal-lapse dominate — not price proximity.**
   At 3%: small_loss + signal_lapsed = 15 of 22 direct blocks ($126k of $157k). At 8%:
   26 of 42 ($330k of $424k, including the March-2009 +57,832 QQQ trade, classified signal_lapsed:
   the frozen-high reset came 2009-12-24, nine months after the signal-bearing bottom). This is why
   Family-A-type severity filters and Family-C-type reset work attack more dollars than any
   tolerance band.
3. **Intraday-only is rare but decisive where it occurs**: VGT 2010-08-31 @3% (+18,141; low pierced
   the level by 0.57% on 2010-07-01 with the signal on) and VGT 2020-04-03 @5% (+50,533; low
   2.26% through the level on 2020-03-18). Three further small-loss rows also touched intraday
   (flags in the CSV: 3/2/3 touches per anchor). Family F's resting-limit diagnostic should start
   from exactly these rows.
4. **never_reached_level grows with the threshold** (3 → 10 → 10): wide discounts manufacture
   unreachable levels; at 3% the level is almost always reachable and the failures move to the
   trigger (small losses) and the reset (lapsed signal).
5. The famous episodes classify as: VGT 2023-01 @3% signal_lapsed (armed by −$1,306; gap 2.55% on
   actionable sessions — the oft-quoted 1.55% gap includes the arming exit session's own close,
   where no entry is possible), @5% small_loss (−$143, gap 1.60%); VGT 2020-04 @5% intraday-only,
   @8% signal_lapsed; VGT 2026-03 @8% signal_lapsed (gap 1.53%); QQQ 2003-03 @3% signal_lapsed
   (gap 1.99%), @8% small_loss (−$713); QQQ 2009-03 @8% signal_lapsed; VGT 2009-03 @8%
   reset_too_late (reset 2009-12-21 after the winner's span).

Major (≥$10k) directly blocked winners, all anchors — the complete list is §5.1's table source
(`D6_FAILURE_MECHANISMS.csv`); the 25 rows with b_profit ≥ 10k are reproduced in
`tmp/final_facts.txt` and were used for the rescue matrix below.

### 5.2 Does any path recover the missed rebounds WITHOUT buying 2001-style bear rallies?

The rescue matrix (classification / window P&L, from `results/matching/`):

| Episode (baseline P&L) | rescued identically | rescued later | NOT rescued | 2000–02 bill of the rescuer |
|---|---|---|---|---|
| VGT 2023-01-04 (+28,006) | D3 (+28,006), D3ctl, D4, **D7_tiny** (alt @ 38.9505 ≤ exit 39.5194) | D7_confirm, D7_hlb, D7_fresh (2023-01-05, +30,882 window) | D1rst (−1,283!), D1alt, D2, D5, D7_sig | D3 −4,040; D7_tiny −16,251; D7_hlb −12,538 (window; REF −11,471) |
| QQQ 2003-03-06 (+18,419) | — | D1rst (2003-03-31, +15,467), D4 (2003-03-10, +21,035) | all fixed thresholds | D1rst −59,517; D4 −78,281 — ruinous |
| …but via overlapping alt trades | D7_sig window +18,676 (alt 2003-02-26 → +19,555), D7_hlb +18,269 (alt 2003-03-03 → +17,528) | | | D7_sig **−7,318** (better than REF), D7_hlb −12,538 |
| QQQ 2009-03-09 (+57,832) | D3, D3ctl, D7_hlb, D7_fresh, D1alt (ident) | D4 (2009-03-17, +43,958) | lower8, D1rst (+1,816 window — destroyed) | n/a (kept by keeping the 3% path intact) |
| VGT 2010-08-31 (+18,141) | **D7_tiny** (ident; armed by −$1,656 < $2k) | — | REF and most others | −1,891 (its three 2000–02 alts) |
| VGT 2020-04-03 (+50,533) | nobody under 3% needed it (REF holds a better 2020-03-20 position, window +49,648) | D4 (2020-04-07, +39,579) | lower5/8 (+21) | D4's bill: −78,281 |
| VGT 2026-03-26 (+31,094) | D3ctl, D7_hlb (ident) | REF/most (2026-03-27, +34,067 — already fine at 3%) | lower8 | — |

Answer: **yes, two paths, and only because they are gated by something other than a rebound.**
(1) `D7_tiny_loss_exit_anchor` recovers the small-loss-trigger episodes (VGT 2023-01, VGT 2010-08,
VGT 2023-10 +15,193, VGT 2025-04 one day early +34,305, VGT 2026-07 +13,320, QQQ 2006/2010
+16,939/+19,221) at a 2000–02 bill of −$1,891 — tiny losses are rare mid-cascade, so the gate
almost never opens in a bear. Its weakness is QQQ 2016–2026 (−9,518 vs REF: the 2018-12-07 −9,700
and 2022-03-01 −3,182 tiny-loss re-entries early in declines — the registered risk).
(2) `D3_tolerance_deep` recovers VGT 2023-01 and QQQ 2023 (+25,111) through the ordinary price path
(spot-check: dd252 = 30.8% on 2023-01-04, level 39.5194×0.97×1.02 = 39.1005 ≥ close 38.9505) at a
2000–02 bill of +$7,431 BETTER than REF (−4,040 vs −11,471; the tolerance merely advances
cascade entries that were coming anyway). Every rebound/turn-gated path paid heavily in 2000–02
(table in §4): the 10%/12% rebounds, two-up-closes, fresh-leg and 2-of-4 score conditions are all
satisfied repeatedly by 2000–02 bear rallies. The explicit counts and P&L are in §4.

### 5.3 Does D2's near-miss window fix 2020/2023/2026, and what does it cost?

**No — it cannot, by arithmetic, and the run confirms it.** `close ≤ level×1.02 AND close ≥
1.03×min_close` requires `min_close ≤ level×1.02/1.03 ≈ level − 0.97%`; in a blocked episode every
close on an actionable session is above the level, so the window can only open when a close dipped
below the level on the arming exit session or on a session without the 10% signal. This was
registered as a caveat before running. Observed: D2 ≡ REF on three datasets; on QQQ 1999–2015 it
fired once (2000-04-24 @ 71.848, −969). In the three target episodes the minimum close sat 1.0–1.6%
ABOVE the level, so the rebound leg of the condition is unsatisfiable there. Cost of the mechanism
as specified: −969 total across 26 years; benefit: zero. The *intent* of D2 is served instead by
`D7_confirm_near` (fires 24×, rescues VGT 2023-01 at +30,882) — but at −56,193 in 2000–02, the
honest price of confirmation-gated tolerance.

### 5.4 Is D3 distinguishable from simply using a smaller fixed threshold?

Partly — and only on one dataset, which is an honest "mostly no". `D3_control_fixed_106`
(the deep-bear level applied unconditionally) matches or beats D3 on VGT 2005–2015 (31,751 vs
28,385), QQQ 1999–2015 (52,363 vs 31,001 — in 2000–02 dd252 ≥ 25% almost throughout, so D3 ≈
control there, and the control's extra relaxation in the shallow 2004–06/2010 episodes
rescued more winners) and nominally on VGT 2016–2026 (214,090 vs 209,467, but with higher DD and a
−29,797 deficit to the lower3-matched control vs D3's −547). **The separation appears exactly where
the gate binds**: QQQ 2016–2026, where the control's unconditional relaxation walks into the
shallow 2025 correction (window −3,301 vs +26,779) and loses a third of its net (98,596/32,865 vs
D3's 141,825/23,564). So the dd252 gate provably prevents shallow-market loosening — but on the
two long datasets you would have done as well or better with the plain 1.06% discount. Verdict:
the *gate* has demonstrable value only in regimes mixing deep bears with shallow corrections
(both 2016–2026 files); on the old files D3 is not distinguishable from (and on QQQ-old is worse
than) a smaller fixed threshold.

### 5.5 D5 bear-market false stability

Measured directly (restricted sessions × the 20-session range condition, `tmp/extra_checks.txt`):
on QQQ 1999–2015 D5 was restricted 771 sessions, of which 53 were "stabilized" — and **zero of the
53 fell in 2000–02** (242 restricted sessions there; zero stabilized signal sessions). The feared
bear false-stability did not materialize; the 2000–02 volatility never compressed under 5% per 20
sessions while restricted. But the benefit did not materialize either: across all four datasets the
relaxation changed exactly ONE entry — QQQ 2006-07-07 (1% discount, range-stabilized), which lost
−5,419 where REF's later entry lost −969; D5 is otherwise identical to REF everywhere. The QQQ-2003
basing period it was designed for kept 20-session ranges above 5% (and/or no signal), so it never
fired there. A clean null-plus-slight-harm result.

## 6. Failure cases (named)

- `D1_reset_only_rebound12`, QQQ 1999–2015: −68,859 net, 129,352 DD; 18 resets, 14 false. The 12%
  rebound reset fires in every bear rally (2000-04-18, 2000-06-01, 2001-05-21, 2002-08-14,
  2002-10-14 within the window) and post-reset entries carry no price condition at all (2000-06-02
  @ 79.37, 25% above the 63.59 loss exit). It also destroyed March 2009 on BOTH old datasets
  (QQQ r2009 −4,911: a 2009-03-23 false reset after it had sat out the bottom; VGT r2009 −6,207)
  and even degraded VGT 2023 (−1,283: reset 2022-11-15 mid-correction, then losing entries). Its
  one good dataset (VGT 2016–2026, +5,025) does not survive the lower3-matched control (−9,448).
  It is also the only config with reset-priority blocks (12 across datasets).
- `D4_score`, QQQ 1999–2015: 37 alt entries, −31,919 net; 23 of the alts in 2000–02 for −65,340.
  Conditions (b) close ≤ loss exit and (c) dd252 ≥ 20% hold simultaneously through entire cascades,
  so 2-of-4 re-admits nearly every signal session; the score design is structurally unsafe in bears.
- `D7_confirm_near`, QQQ 2000–02: five alt entries, five losses, −56,193 (worst: 2001-02-15
  @ 49.5102 after closes 46.84 → 48.71 → 49.51, level×1.05 = 49.78; exit 2001-03-02 @ 40.02,
  −19,616). Also QQQ 2022: −16,163 across three alts. Its VGT 2016–2026 gain (+20,523) does not
  cover either.
- `D1_alt_entry_rebound10` (exploratory): the 0.85×ref-high cap faces both ways — it blocked the
  alt path entirely on BOTH 2016–2026 datasets (zero alt entries; V-bottom rebounds carry price
  above the cap before the 10% rebound completes, e.g. VGT 2020: 1.10×22.232 = 24.46 > 0.85×27.06 ≈
  23.0) while failing to block 2000–02 rallies (four alts at +4.1% to +14.1% above the loss exits,
  −7,846). The config is strictly ≤ REF on every dataset.
- `D7_tiny_loss_exit_anchor`, QQQ 2016–2026: −9,518 vs REF, driven by 2018-12-07 (−9,700) and
  2022-03-01 (−3,182) — tiny-loss re-entries early in genuine declines; the registered risk, now
  quantified.
- `D7_signal_pressure`, VGT 2005–2015 and VGT 2016–2026: −15,748/−8,172 vs REF — ten-session
  signal pressure within 3% of the level occurs mid-decline in grinding VGT corrections
  (2009-02-23 −4,883; 2022-06-10 −2,379), and on VGT-old it also sat out 2010-08 that REF caught.

## 7. Dependence on few trades

Every positive headline rests on a handful of episodes: D7_tiny's +33,419 (QQQ-old) is mostly
2006-08-08 +16,939, 2010-08-26 +19,221 and 2001-05-14 +6,199 against −1,891 of bear alts; its
VGT-new +86,404 alt P&L is five trades (2023-01-04 +28,006, 2025-04-15 +34,305, 2023-10-20
+15,193, 2026-07-27 +13,320, 2022-11-04 +4,640); its QQQ-new deficit is ONE trade (2018-12-07
−9,700). D7_signal's QQQ-old edge is substantially one alt (2009-03-02 +52,010) plus 2003-02-26
+19,555. D3's VGT-new +27,373 is concentrated in the late-2022/Jan-2023 restructuring (window 2023:
+47,704 vs +18,901). D7_higher_low's VGT-new +33,545 is the same single window (+50,581). The
knife-edge sensitivity documented for the fixed rules therefore persists in the rescues: a 1–2%
shift in any gate would reorder these configurations. All classifications below treat single-window
dominance as a robustness liability.

## 8. Per-config classification

Baseline-compatible (reset-only) vs exploratory alt-entry configs are labeled; "historical
observation" = what happened on these four files; "inference" = judgment, flagged as such.

| Config | Class | Grounds (observation) | Inference |
|---|---|---|---|
| D1_reset_only_rebound12 (baseline-compatible) | **Unpromising** | worst config of the family; −153,642 total vs lower3; 14/18 false resets QQQ-old; broke 2009 twice | rebound resets without any entry-price condition are structurally unsafe; do not refine |
| D1_alt_entry_rebound10 (exploratory) | **Unpromising** | ≤ REF on all four datasets; cap blocked the V-bottoms, not the bear rallies | the ref-high cap is the wrong instrument for both goals |
| D2_window | **Unpromising (as specified)** | fired once in 26 years (−969); target episodes unsatisfiable by arithmetic | the near-miss intent needs a non-low-referencing gate (cf. D7_confirm) |
| D3_tolerance_deep | **Promising (narrowly)** | +29,699 total vs lower3; rescued VGT/QQQ 2023; 2000–02 better than REF; beats lower3-control on both sides only on QQQ-new | value = the gate's protection of shallow regimes; on old files indistinguishable from/worse than a 1.06% fixed discount — validation must test the dd window/threshold |
| D3_control_fixed_106 (control) | Inconclusive as a strategy | wins 3 datasets, catastrophic on QQQ-new (−33,646, 2025 window −30k swing) | exists to referee D3; confirms unconditional tolerance is regime-fragile |
| D4_score | **Unpromising** | −156,115 total vs lower3; −78,281 in 2000–02; 37 QQQ-old alts | OR-of-conditions scores degenerate in cascades |
| D5_stabilized_relax | **Unpromising (null)** | one changed entry in 60 runs (−4,450 net effect); zero 2000–02 false stability, zero 2003 benefit | the 20-session/5% gate is simply too tight to matter |
| D7_confirm_near | **Unpromising** | −6,382 total vs lower3; −56,193 in 2000–02; QQQ-new −17,433 | confirmation does not price bear rallies; rescuing VGT-2023 this way costs 2× elsewhere |
| D7_signal_pressure | **Inconclusive, leaning promising on QQQ** | QQQ-old +18,405 vs lower3 with DD −25,095 and a BETTER 2000–02 than REF (−7,318); beats both matched controls on both QQQ files; negative on both VGT files | the only mechanism that improved bear window AND basing recovery together; VGT weakness is real — validation should test the blocked-count gate on fresh instruments |
| D7_higher_low_base | **Inconclusive, leaning promising** | +34,051 total vs lower3; best VGT-new (215,639, P:DD 7.52); QQQ-old +11,495 with DD −16,026; but VGT-old −11,014 and three 2000–02 bear-floor losses (−22,284) | floor-based basing entry works where bases exist; buys long bear rallies; single-window dependence on VGT-new |
| D7_fresh_leg | **Inconclusive** | best VGT-old (+14,603), VGT-new +20,810; but all seven 2000–02 fresh legs lost (−27,275) and QQQ-new −13,491 | "new correction" is indistinguishable from "next leg down" in real cascades |
| D7_tiny_loss_exit_anchor | **Promising** | +41,395 total vs lower3; QQQ-old 73,678/69,850 beating BOTH matched controls by wide margins; cheapest 2000–02 bill of any alt path (−1,891); rescued VGT 2023-01/2010-08/2023-10/2025-04 | directly removes the D6 table's second-largest mechanism; QQQ-new −9,518 single-trade deficit is the open risk; the $2,000 bound is untuned and must go to validation, not be refined here |

## 9. Flagged for validation (not explored further here)

1. `D7_tiny_loss_exit_anchor`: the $2,000 small-loss bound and the 0%-discount anchor (vs e.g.
   exit×0.99); interaction with Family A's trigger bands (A3) — the mechanisms overlap and only one
   should survive combination. Test unchanged on QLD/SOXX/VOOG.
2. `D3_tolerance_deep`: dd window (252) and depth (25%) sensitivity; against fixed 1–2% discounts
   on fresh instruments; combination with D7_tiny (they rescue disjoint episode sets: deep-market
   vs tiny-loss).
3. `D7_signal_pressure`: blocked-count gate (10) and tolerance (3%) — QQQ-specific strength needs
   out-of-sample confirmation.
4. `D7_higher_low_base`: floor length (15) interacts with bear-rally duration; only worth carrying
   into G as the "basing" complement if 1–3 survive.
5. From D6 for the OTHER families: the per-episode table says the highest-value targets are
   (a) small-loss triggers (Family A), (b) signal-lapse-after-reset (Family C — a reset is useless
   if it arrives after the signal; C's resets should be scored on signal-alive-at-reset, which this
   table provides per episode), (c) the two intraday-only rows for Family F.

## 10. Verification performed

- Calibration gate: runner-enforced trade-for-trade identity of A_baseline and REF_lower3 with the
  frozen results on all four datasets; `common/selftest.py` PASS (state-log equivalence included).
  REF_lower3 / lower5 / lower8 headline numbers equal the published lower-price-reentry
  B/C/D figures exactly.
- Counter/episode consistency: for all 60 runs, `alt_entries`, `lower_price_reentries`,
  `recovery_resets`, episode counts and blocked-session totals agree between counters and the
  events CSVs (script in `tmp/extra_checks.txt`; zero mismatches).
- Spot checks against raw OHLC (full printouts in `tmp/spotchecks.txt`):
  1. **Rescued V-bottom** — D7_tiny, VGT 2023-01-04: episode armed 2023-01-03 (exit 39.5194, net
     −142.90 < $2,000); 2023-01-04 close 38.9505 ≤ 39.5194, 10% signal present (15.44% below the
     90-session high 46.0645); alt entry taken, trade exited 2023-08-09 @ 52.4061 for +28,005.77 =
     the baseline winner. Also verified its 2022-11-04 alt (close 37.9724 ≤ exit 38.0568, loss
     −1,306 < $2,000) → +4,640.
  2. **2000–02 bear-rally decision** — D7_confirm_near, QQQ 2001-02-15: closes 46.8397 → 48.7075 →
     49.5102 (two up closes), level 47.4084, close ≤ level×1.05 = 49.7788 and > level, signal on;
     entry @ 49.5102, exit 2001-03-02 @ 40.0223, −19,615.58. The mechanism fired exactly as
     designed and lost exactly as a bear rally punishes.
  3. **Rebound reset** — D1_reset_only, QQQ 2000-06-01: close 74.0714 ≥ 1.12 × 65.9207 = 73.8312
     (episode min close), frozen95 level 97.0815 not met; restriction cleared; next entry
     2000-06-02 @ 79.3722 with no price condition.
  4. **D3 gate** — VGT 2023-01-04: dd252 = 1 − 38.9505/56.2845 = 30.80% ≥ 25%; relaxed level
     39.1005 ≥ close 38.9505 → ordinary price-path entry (not an alt), as logged.
  5. **Floor condition** — D7_higher_low, VGT 2022-11-25 alt: 15 sessions after the 2022-11-03
     episode low 37.4855 with close 41.8278 ≤ 0.90×47.7709 = 42.99 → entry (lost −2,228), and its
     2023-01-05 re-entry was via the price path (38.1436 ≤ 38.3338), both consistent with the logs.
- D6 cross-validation: every classification of the known episodes matches the prior report's
  independently derived facts (VGT 2020 5%: close gap 1.02%, intraday −2.26% through the level;
  VGT 2023 5%: −$143 loss, gap 1.60%; VGT 2026 8%: gap 1.53%; QQQ 2009 8%: reset 2009-12-24).
  One deliberate definitional difference: the D6 window starts the session AFTER the arming exit
  (no entry is possible on the exit session), so e.g. the VGT 2022-11-03 episode shows gap 2.55%
  where the prior report's episode-minimum (including the exit-day close 37.4855) showed 1.55%.

## 11. Reproducing

```
PY=<frozen research venv python>
cd research/risk-management/adaptive-reentry/recovery-opportunities
$PY register.py      # idempotent; registry.jsonl is append-only
$PY run.py           # 15 configs x 4 datasets through common/runner.py -> results/
$PY d6_diagnostic.py # -> D6_FAILURE_MECHANISMS.csv + console pivots
```

Working files: `tmp/run_log.txt`, `tmp/tables.txt`, `tmp/bear_rescue.txt`, `tmp/spotchecks.txt`,
`tmp/extra_checks.txt`, `tmp/final_facts.txt`.
