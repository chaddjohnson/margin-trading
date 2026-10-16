# Robustness: walk-forward, holdout, placebo, sensitivities, other ETFs

Procedure (PROTOCOL.md, sha in `PROTOCOL.sha256`, two pre-holdout amendments): the rules and the objective were fixed before any strategy result was computed. Selection used development only (2014–2022). The frozen choices were written to `results/frozen.json` before the holdout (2023-01-03 → 2026-10-13) was read. The holdout was then evaluated once. Later re-runs of the same frozen code only regenerated charts and tables; `validation.json` is byte-identical across them.

## 1. Walk-forward within development

Expanding training windows 2014→Y−1, test years 2018–2022. In each fold, the family pick is the rule with the best training J (net P&L − max MTM drawdown). Training labels are censored at the training end. The out-of-sample result is each test year's daily P&L increments from that year's pick, stitched together.

<!-- table:walk_forward -->
| Test year | A net / DD | B pick → test net / DD | C pick → test net / DD | D pick → test net / DD | E pick → test net / DD | F pick → test net / DD |
| --- | ---: | --- | --- | --- | --- | --- |
| 2018 | $5,943 / $23,723 | B_skipSlow_20 → $5,943 / $23,723 | C_gate_ret5_6 → −$8,315 / $23,811 | D_upClose_zone → −$14,162 / $28,988 | E_flat15_stab → −$7,533 / $29,032 | F_ret5_6+upClose → −$8,315 / $23,811 |
| 2019 | $15,380 / $9,581 | B_skipFast_10 → $6,201 / $9,581 | C_gate_ret5_6 → $17,384 / $9,581 | D_upClose_rebound → $11,686 / $9,283 | E_score → $22,502 / $10,105 | F_ret5_6+upClose → $17,384 / $9,581 |
| 2020 | $57,597 / $15,660 | B_skipFast_5 → $0 / $0 | C_gate_ret5_6 → $34,055 / $24,987 | D_upClose_rebound → $38,654 / $23,351 | E_score_stab → $26,683 / $15,867 | F_ret5_6+upClose → $53,724 / $23,577 |
| 2021 | −$358 / $10,953 | B_skipSlow_40 → −$358 / $10,953 | C_gate_ret5_6 → −$350 / $10,820 | D_upClose_rebound → −$4,908 / $12,194 | E_score_stab → $0 / $0 | F_ret5_6+upClose → −$350 / $10,820 |
| 2022 | −$165 / $20,570 | B_skipSlow_40 → −$6,638 / $25,421 | C_gate_ret5_6 → −$6,985 / $23,032 | D_upClose_rebound → −$11,051 / $24,525 | E_score_stab → −$8,963 / $27,746 | F_ret5_6+upClose → −$9,068 / $27,662 |

Stitched out-of-sample 2018–2022 (daily increments of each year’s pick):

| Family | Net P&L | Max MTM DD | J = net − DD | Δ J vs A |
| --- | ---: | ---: | ---: | ---: |
| A — Original | $78,398 | $23,723 | $54,675 | – |
| B — Velocity gate | $5,148 | $26,053 | −$20,906 | −$75,580 |
| C — Deterioration gate | $35,790 | $30,513 | $5,277 | −$49,398 |
| D — Stabilization confirmation | $20,218 | $39,906 | −$19,687 | −$74,362 |
| E — Adaptive threshold | $32,689 | $29,032 | $3,657 | −$51,017 |
| F — Simple combination | $53,376 | $27,760 | $25,616 | −$29,059 |

Sensitivity: each test year started flat with that year’s pick (a path a trader could follow):

| Family | Net P&L | Max MTM DD | J | Δ J vs A |
| --- | ---: | ---: | ---: | ---: |
| A — Original | $86,726 | $23,723 | $63,003 | – |
| B — Velocity gate | $7,336 | $25,421 | −$18,085 | −$81,089 |
| C — Deterioration gate | $45,339 | $30,513 | $14,826 | −$48,178 |
| D — Stabilization confirmation | $31,979 | $31,887 | $92 | −$62,911 |
| E — Adaptive threshold | $41,180 | $28,338 | $12,842 | −$50,161 |
| F — Simple combination | $62,925 | $27,760 | $35,165 | −$27,838 |
<!-- /table -->

**Every family's selection procedure loses to A out of sample**, by $28k to $81k of J, and in both stitched variants. The picks also change from year to year (B alone used four different rules). That is what selection looks like when it fits noise. As registered, ties in training J were broken by grid order. The independent review found three ties whose tied alternatives would have scored differently in the test year (2018 E, 2020 B, 2022 B); none of the alternatives turns any family's total positive.

## 2. Untouched holdout and validation

<!-- table:validation -->
| Frozen pick | Dev Δ J (in-sample) | 1. Walk-forward Δ J | 2. Holdout Δ J | 3. Dev Δ net without largest episode | 4. Next-open Δ J dev / holdout | Validated |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| B: B_skipSlow_60 | +$143 | −$75,580 ✗ | −$59,100 ✗ | $0 ✓ | −$8,329 / −$62,609 ✗ | no |
| C: C_gate_accel_3 | +$19,239 | −$49,398 ✗ | −$64,581 ✗ | −$31,083 ✗ | −$14,059 / −$22,624 ✗ | no |
| D: D_upClose_rebound | +$7,254 | −$74,362 ✗ | −$9,148 ✗ | −$43,567 ✗ | −$2,168 / −$33,681 ✗ | no |
| E: E_ret5_15_stab | +$41,273 | −$51,017 ✗ | −$12,842 ✗ | −$18,749 ✗ | −$29,395 / −$21,194 ✗ | no |
| F: F_accel_3+upClose | +$33,508 | −$29,059 ✗ | −$15,809 ✗ | −$21,440 ✗ | +$11,896 / −$48,369 ✓ | no |
<!-- /table -->

Criteria (pre-registered): (1) walk-forward ΔJ > 0; (2) holdout ΔJ > 0; (3) development ΔP&L stays ≥ 0 after removing the episode that contributed most; (4) next-open execution does not flip the sign of ΔJ. **No rule passes even one of criteria 1 and 2.**

Notes on criterion 3. The episode removed is the largest *positive* contributor (Amendment 2). For C, D, E and F it is 2016-01, the single February 2016 entry. The protocol also allowed a pass if the *drawdown* reduction did not depend on one episode; that alternative was not computed. This makes the check stricter than registered. It cannot change the verdict, because criteria 1 and 2 fail for every rule. B passes criterion 3 on a technicality: its whole development difference (+$143) is one episode, and removing it leaves exactly $0.

Holdout started flat on 2023-01-03 (instead of carrying the 2022-12 position):

<!-- table:holdout_flat_start -->
| Rule | Net P&L | Max MTM DD | Entries | Δ J vs A |
| --- | ---: | ---: | ---: | ---: |
| A_original | $117,668 | $28,687 | 13 | $0 |
| B_skipSlow_60 | $58,014 | $28,687 | 11 | −$59,654 |
| C_gate_accel_3 | $78,330 | $23,163 | 9 | −$33,814 |
| D_upClose_rebound | $127,917 | $19,248 | 16 | +$19,688 |
| E_ret5_15_stab | $104,892 | $28,753 | 10 | −$12,842 |
| F_accel_3+upClose | $120,363 | $17,801 | 11 | +$13,581 |
<!-- /table -->

With a flat start, D (+$19.7k) and F (+$13.6k) beat A in the holdout. With the carried position (the registered convention) they do not (−$9.1k, −$15.8k). A result whose sign depends on whether one open position is carried across a date boundary is not evidence.

## 3. Placebo: uninformed random deferral (Amendment 1)

For each candidate, wait a random 0–5 or 0–10 sessions (seeded; 500 seeds each), then enter as A.

Development:

<!-- table:placebo_development -->
| Placebo (random deferral) | Seeds | Δ net vs A: 5th / 50th / 95th pct | Δ J vs A: 5th / 50th / 95th pct | Δ J range | Frozen picks’ Δ J percentile in the placebo distribution |
| --- | ---: | ---: | ---: | ---: | --- |
| jitter5 | 500 | −$37,533 / +$28,498 / +$52,824 | −$45,204 / +$20,149 / +$51,226 | −$70,868 … +$58,803 | B 30%, C 48%, D 33%, E 73%, F 65% |
| jitter10 | 500 | −$49,900 / −$11,759 / +$43,489 | −$57,403 / −$16,313 / +$39,100 | −$84,953 … +$50,756 | B 63%, C 79%, D 67%, E 95%, F 92% |
<!-- /table -->

Holdout:

<!-- table:placebo_holdout -->
| Placebo | Δ J vs A: 5th / 50th / 95th pct | Frozen picks’ holdout Δ J percentile |
| --- | ---: | --- |
| jitter5 | −$75,853 / −$33,600 / +$1,629 | B 16%, C 13%, D 83%, E 76%, F 73% |
| jitter10 | −$92,699 / −$52,273 / −$6,826 | B 43%, C 34%, D 95%, E 93%, F 92% |
<!-- /table -->

In development, a random 0–5-session delay beats A by a median of **+$20k** of J. The frozen picks sit between the 30th and 73rd percentile of that random distribution, so on development they are indistinguishable from random timing. In the holdout, random delays lose to A (median −$34k), and D, E and F sit at the 73rd–83rd percentile of the random distribution: better than most coin flips, still worse than A. Development rewarded *any* delay because of one trade. The holdout penalised delay because A's 2025 entries were well timed.

## 4. Nearby parameters

<!-- table:neighbours -->
| Rule | Dev Δ J (same-close) | Dev Δ J (next open) | Holdout Δ J (same-close) | Holdout Δ J (next open) |
| --- | ---: | ---: | ---: | ---: |
| B_skipSlow_20 | −$8,967 | −$69,009 | −$109,108 | −$120,413 |
| B_skipSlow_40 | −$8,171 | −$13,213 | −$73,789 | −$76,936 |
| B_skipSlow_60 | +$143 | −$8,329 | −$59,100 | −$62,609 |
| C_gate_accel_3 | +$19,239 | −$14,059 | −$64,581 | −$22,624 |
| C_gate_accel_5 | −$12,700 | −$22,833 | −$839 | −$15,645 |
| C_gate_ret5_4 | +$2,422 | −$69,992 | −$67,332 | −$22,191 |
| C_gate_ret5_6 | +$12,342 | −$14,313 | −$43,924 | −$44,160 |
| C_gate_ret5_8 | −$35,322 | −$5,221 | +$239 | +$23 |
| D_upClose_rebound | +$7,254 | −$2,168 | −$9,148 | −$33,681 |
| D_upClose_zone | −$20,512 | −$44,470 | −$54,684 | −$44,022 |
| D_rebound_2_rebound | −$90,550 | −$115,394 | +$8,784 | −$3,044 |
| D_noNewLow_2_rebound | −$30,766 | −$38,529 | +$7,948 | −$6,825 |
| D_volContract_rebound | −$92,835 | −$93,801 | −$3,789 | −$36,929 |
| E_ret5_15 | +$36,743 | −$60,899 | −$12,842 | −$21,194 |
| E_ret5_15_stab | +$41,273 | −$29,395 | −$12,842 | −$21,194 |
| E_score | +$38,637 | −$42,184 | −$4,157 | −$19,366 |
| E_score_stab | +$30,669 | −$25,753 | −$9,229 | −$23,604 |
| E_score_skip | +$9,107 | −$45,113 | −$9,229 | −$23,604 |
| E_flat15 | +$10,769 | −$75,622 | −$84,281 | −$49,946 |
| E_fast15 | −$35,454 | −$78,322 | +$9,892 | −$6,273 |
<!-- /table -->

- **There is no stable region.** Neighbours flip sign: C ret5 −4/−6/−8% gives +$2.4k / +$12.3k / −$35.3k in development; accel −3% vs −5% gives +$19.2k vs −$12.7k.
- **All 11 development winners in families B–E turn negative under next-open fills** (the only next-open development winner, C_gate_volRatio_15, loses under same-close). F_accel_3+upClose stays positive in development under next-open (+$11.9k) but loses $48.4k in the holdout.
- The E variants share one structure (deeper threshold after a sharp first week) and agree in development. That agreement comes from the single 2016 trade, and all of them are negative in the holdout.
- Holdout rows here are reported for transparency (`results/grid_holdout_not_for_selection.csv`) and were not used to choose anything. The best holdout rules (D_rebound_2_zone +$13.9k, D_rebound_3_zone +$12.0k, E_fast15 +$9.9k) were −$59k, −$50k and −$35k in development.

## 5. Execution, costs and margin rate

<!-- table:sensitivities -->
| Assumption | Window | A net / DD / interest | B Δ J (Δ net / Δ DD) | C Δ J (Δ net / Δ DD) | D Δ J (Δ net / Δ DD) | E Δ J (Δ net / Δ DD) | F Δ J (Δ net / Δ DD) |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 5 bp per side | development | $69,985 / $24,027 / $42,644 | +$143 (+$143 / $0) | +$19,930 (+$26,610 / +$6,680) | +$7,348 (+$15,401 / +$8,053) | +$42,448 (+$43,940 / +$1,492) | +$33,790 (+$37,717 / +$3,927) |
| 5 bp per side | holdout | $116,488 / $28,994 / $30,107 | −$58,866 (−$58,866 / +$0) | −$63,984 (−$69,507 / −$5,523) | −$9,283 (−$18,725 / −$9,442) | −$12,535 (−$12,468 / +$67) | −$15,489 (−$26,321 / −$10,832) |
| 10 bp per side | development | $66,977 / $24,332 / $42,644 | +$142 (+$142 / $0) | +$20,622 (+$27,191 / +$6,569) | +$7,442 (+$15,385 / +$7,943) | +$43,623 (+$44,915 / +$1,292) | +$34,072 (+$37,890 / +$3,818) |
| 10 bp per side | holdout | $115,065 / $29,301 / $30,107 | −$58,632 (−$58,632 / $0) | −$63,386 (−$68,908 / −$5,521) | −$9,418 (−$18,862 / −$9,444) | −$12,229 (−$12,160 / +$69) | −$15,219 (−$25,948 / −$10,729) |
| margin 8% | development | $83,826 / $23,170 / $31,036 | +$143 (+$143 / $0) | +$29,481 (+$36,602 / +$7,121) | +$12,177 (+$20,639 / +$8,462) | +$43,753 (+$45,801 / +$2,048) | +$45,313 (+$49,664 / +$4,351) |
| margin 8% | holdout | $126,881 / $28,079 / $21,896 | −$64,431 (−$64,431 / $0) | −$71,853 (−$77,615 / −$5,762) | −$12,144 (−$21,806 / −$9,661) | −$13,771 (−$13,935 / −$165) | −$24,623 (−$34,215 / −$9,592) |
| margin 14% | development | $59,025 / $24,323 / $52,164 | +$143 (+$143 / $0) | +$18,502 (+$24,915 / +$6,412) | +$2,736 (+$11,252 / +$8,516) | +$38,155 (+$39,445 / +$1,290) | +$31,637 (+$35,312 / +$3,675) |
| margin 14% | holdout | $112,427 / $29,295 / $39,353 | −$57,792 (−$57,792 / $0) | −$63,000 (−$68,286 / −$5,286) | −$11,940 (−$21,157 / −$9,217) | −$11,913 (−$11,618 / +$295) | −$16,479 (−$27,168 / −$10,689) |
<!-- /table -->

Costs of 5–10 bp per side and margin rates of 8%–14% change levels but no sign: the development gains and holdout losses of every pick persist. Next-open execution (ENTRY_COMPARISON.md) flips the development sign of B, C, D and E.

## 6. Other ETFs (frozen rules, no retuning; 2014-01-02 → 2026-09-08)

<!-- table:cross_etf -->
| ETF | Execution | Window | Episodes (severe) | A net / DD | B Δ J (Δ net / Δ DD) | C Δ J (Δ net / Δ DD) | D Δ J (Δ net / Δ DD) | E Δ J (Δ net / Δ DD) | F Δ J (Δ net / Δ DD) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| QQQ | close | 2014-01-02 → 2026-09-08 | 14 (4) | $135,186 / $24,060 | −$38,187 (−$30,153 / +$8,034) | −$68,964 (−$57,821 / +$11,143) | −$89,213 (−$71,082 / +$18,132) | −$63,218 (−$61,419 / +$1,799) | −$56,571 (−$44,317 / +$12,254) |
| QQQ | nextOpen | 2014-01-02 → 2026-09-08 | 14 (4) | $113,279 / $34,005 | −$26,582 (−$20,679 / +$5,903) | −$35,351 (−$31,371 / +$3,980) | −$43,269 (−$44,772 / −$1,503) | +$3,783 (−$795 / −$4,578) | −$29,498 (−$27,735 / +$1,762) |
| VOOG | close | 2014-01-02 → 2026-09-08 | 10 (2) | $94,332 / $29,449 | +$359 (+$359 / $0) | −$1,999 (+$804 / +$2,803) | −$46,033 (−$42,266 / +$3,767) | −$7,329 (−$7,460 / −$131) | +$373 (+$2,327 / +$1,954) |
| VOOG | nextOpen | 2014-01-02 → 2026-09-08 | 10 (2) | $100,077 / $31,659 | +$417 (+$208 / −$208) | −$31,841 (−$30,506 / +$1,336) | −$68,222 (−$61,532 / +$6,691) | −$1,292 (+$6,266 / +$7,558) | −$34,989 (−$30,962 / +$4,028) |
| SOXX | close | 2014-01-02 → 2026-09-08 | 19 (6) | $122,040 / $59,812 | +$12,788 (+$12,788 / $0) | −$157,087 (−$139,857 / +$17,230) | −$78,366 (−$55,664 / +$22,703) | +$31,454 (+$1,260 / −$30,194) | −$106,249 (−$94,556 / +$11,693) |
| SOXX | nextOpen | 2014-01-02 → 2026-09-08 | 19 (6) | $96,429 / $54,598 | −$25,959 (−$9,870 / +$16,089) | −$140,113 (−$110,612 / +$29,502) | −$92,163 (−$39,237 / +$52,926) | +$14,639 (−$11,261 / −$25,901) | −$89,826 (−$63,993 / +$25,833) |
| IGV | close | 2014-01-02 → 2026-09-08 | 12 (3) | $132,371 / $33,062 | −$13,814 (−$15,520 / −$1,706) | −$59,500 (−$56,585 / +$2,915) | −$65,870 (−$49,292 / +$16,578) | −$52,231 (−$50,398 / +$1,833) | −$59,175 (−$43,388 / +$15,787) |
| IGV | nextOpen | 2014-01-02 → 2026-09-08 | 12 (3) | $99,289 / $39,278 | +$4,421 (−$3,927 / −$8,348) | −$65,950 (−$49,085 / +$16,865) | −$29,030 (−$30,006 / −$976) | +$11,214 (+$5,487 / −$5,727) | −$10,164 (−$15,925 / −$5,762) |
| XLY | close | 2014-01-02 → 2026-09-08 | 8 (3) | $81,273 / $29,188 | −$21,009 (−$13,734 / +$7,274) | −$57,296 (−$38,317 / +$18,979) | −$87,856 (−$69,053 / +$18,803) | −$12,043 (−$14,047 / −$2,004) | −$55,854 (−$38,258 / +$17,596) |
| XLY | nextOpen | 2014-01-02 → 2026-09-08 | 8 (3) | $33,592 / $38,501 | −$26,122 (−$13,061 / +$13,061) | −$57,028 (−$38,692 / +$18,336) | −$70,371 (−$41,950 / +$28,421) | −$6,152 (−$6,152 / $0) | −$36,887 (−$21,854 / +$15,033) |
| IWN | close | 2014-01-02 → 2026-09-08 | 7 (0) | −$20,295 / $58,799 | +$412 (+$1,390 / +$978) | −$72,552 (−$53,396 / +$19,156) | −$51,005 (−$24,197 / +$26,808) | +$101,176 (+$73,200 / −$27,975) | −$9,470 (−$19,776 / −$10,306) |
| IWN | nextOpen | 2014-01-02 → 2026-09-08 | 7 (0) | $6,828 / $54,993 | +$9,965 (+$11,020 / +$1,055) | −$56,978 (−$38,654 / +$18,324) | −$156,339 (−$102,576 / +$53,763) | +$58,530 (+$31,810 / −$26,721) | −$10,799 (−$11,517 / −$719) |
<!-- /table -->

Of the 60 frozen-pick comparisons (5 rules × 6 ETFs × 2 executions), 13 are positive: E on SOXX and IWN (both executions) and QQQ and IGV (next open), B on six cells (three under $1k; the largest are SOXX same-close +$12.8k and IWN next-open +$10.0k), F once (VOOG, +$0.4k). C and D lose everywhere. E's +$101k on IWN (where A loses $20k) is the largest single cell. It comes from avoiding entries in IWN's long 2022–2023 grind, which is consistent with "require a deeper drawdown after a sharp first week" sometimes helping in slow bear markets. But the same rule loses $63k on QQQ and $52k on IGV. These ETFs are highly correlated with VGT and with each other: QQQ, IGV, SOXX and VOOG share most of their crash dates. They are related evidence, not independent crashes.

## 7. Pre-2014 VGT stress test (2006–2013; never used for selection)

<!-- table:stress_2006_2013 -->
| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $15,196 | $42,825 | $50,883 | 30 | 27% (8/30) | 0/0 | 0 | 979 |
| B: B_skipSlow_60 | −$7,914 | $36,797 | $51,687 | 26 | 23% (6/26) | 0/0 | 2 | 839 |
| C: C_gate_accel_3 | $23,195 | $43,759 | $57,569 | 26 | 42% (11/26) | 0/0 | 1 | 999 |
| D: D_upClose_rebound | −$59,133 | $38,153 | $90,315 | 27 | 26% (7/27) | 0/0 | 2 | 878 |
| E: E_ret5_15_stab | $5,620 | $42,553 | $51,782 | 20 | 25% (5/20) | 0/0 | 1 | 972 |
| F: F_accel_3+upClose | −$7,781 | $36,014 | $60,489 | 24 | 33% (8/24) | 0/0 | 1 | 825 |
<!-- /table -->

A made $15k with a $51k drawdown through 2008. No pick reduced A's drawdown; D more than doubled it, to $90k. C made $8k more profit with a $6.7k larger drawdown.

## 8. Sample-size limits and failures

- **15 independent VGT episodes, 3 severe (2 in development).** No indicator, rule or score can be validated as a predictor of "−10% that goes to −20%" from this sample, and this study does not claim one.
- **Strategy P&L is dominated by a few long holds.** The Feb 2016 → Feb 2018 trade (+$55k), the 2020 rebound (+$48k), 2023 (+$28k), 2025 (+$39k) and 2026 (+$31k) together are most of A's profit. Any entry change that shifts timing by a few days moves which of these trades is caught. That swamps the loss-avoidance effect the brief is after (first-trade losses of $1.5k–$9k in the severe episodes).
- **The trade-level relative-volume pattern** (INDICATOR_STUDY.md) did not replicate in the holdout.
- **Proxy data ends 2026-09-08**; cross-ETF flags are off for VGT's last 24 holdout sessions. None of the frozen picks uses them.
- **Independent review** (a separate agent; scripts in the session scratchpad) re-derived every feature, decision and mark with data truncated at six dates and found no lookahead. It found three reporting issues, fixed before the holdout read (PROTOCOL.md Amendment 2).
