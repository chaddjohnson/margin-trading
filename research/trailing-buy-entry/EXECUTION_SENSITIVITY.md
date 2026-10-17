# Execution timing and margin-interest sensitivity (Phase 5)

**Result: no execution model or margin rate turns a trailing-entry candidate into a recommendation, but execution matters a lot for the baseline itself.** Filling at the next open instead of the signal close cuts B0's walk-forward profit from $84,183 to $40,053, the largest single effect on B0 measured in this study. On the holdout, by contrast, next-open fills *help* B0 ($127,058 vs $122,197). The pre-close model (decide and fill just before 15:55 using the actual minute tape) stays close to the idealized close, for B0 and for most candidates. Margin rates from 8% to 14% shift every result by similar amounts and change no ranking.

All selection used close fills at 11% (PROTOCOL.md §5). The models below are applied unchanged to the frozen candidates. Spreads, slippage and commissions are out of scope and zero in every model.

## Execution models

| Model | Decision | Fill | Notes |
|---|---|---|---|
| **close** (idealized, the original's) | the official close | that close | optimistic: the signal uses a price that is only known once it can no longer be traded at |
| **next open** (executable) | the official close | next session's open, gaps included | no exit is evaluated on the fill session; its high and low count as post-entry. Variant B checks the decision close. A missing or invalid next open would cancel the order (none occurs); an order still pending at the end of the data is reported, not filled. |
| **pre-close** (separate, minute data) | last trade before 15:55 New York time (12:55 on early-close days), against the state as of the previous close | that price | VGT minute file 2016-01-04 → 2025-10-13 only; raw prices scaled by the *previous* session's adjusted/raw close ratio; arming and the trough still use official closes; runs start flat on 2016-01-04. 1,761 covered sessions; mean \|pre-close / close − 1\| = 0.11%. |

Exits are the original's in every model: the open first (maximum hold, then a gap through an active stop fills at the open, not at a fabricated stop price), then the session's low against the stop, with the stop from highs through the previous session. Interest accrues by calendar day through the actual exit session.

## Walk-forward (each fold's own pick; Σ net / worst DD over WF1–3)

| Candidate | close @ 11% | next open @ 11% | pass at next open? |
| --- | ---: | ---: | --- |
| **B0** | $84,183 / $23,723 | $40,053 / $26,280 | – |
| P1.balanced (X 10%, Y ≈ 0.6–7.7% by fold) | $10,274 / $29,493 | $2,834 / $28,789 | no |
| P2xy.balanced | $8,442 / $32,308 | $8,308 / $28,497 | no |
| P2legacy.profit (immediate, X only) | $53,917 / $30,188 | $61,183 / $30,419 | no (net ✓, DD ✗) |
| P3snap.balanced | $18,574 / $32,308 | $35,240 / $19,335 | no (risk trade-off needs net ≥ 90% of B0's $40,053; it has 88%) |
| P3roll.balanced | −$800 / $32,310 | $33,697 / $19,771 | no (84%) |
| P4.legacy.balanced | $38,953 / $28,084 | $4,960 / $30,065 | no |
| P4.fixed.balanced | −$25,184 / $30,998 | −$1,528 / $30,896 | no |
| P4.atr.balanced | −$16,086 / $28,278 | $4,695 / $25,765 | no |

The full grid (all 24 candidates × 8 scenarios) is in `results/validation/development/tables.md`. Only two cells in it pass against B0, both at next open and 14% interest: the ATR snapshot and ATR rolling balanced picks (risk trade-offs). These are cells where B0 itself is at its weakest, and the same candidates fail at 11% and in the holdout.

**B0's next-open fragility.** Per fold, B0 goes from $31,701 → $11,295 (2018–19), $57,240 → $42,658 (2020–21) and −$4,758 → −$13,900 (2022); over 2016–2022 flat it goes from $76,632 / $23,723 to $33,642 / $31,684. One session's delay in the entry fill moves the 15-day clock, the stop's starting level and the restriction's lower level, and these path effects compound. The prior minute-execution study (`research/risk-management/vgt-minute-execution/`) found the same knife-edge behaviour. The same-close figures in this repository should therefore be read as an optimistic reference, not as an executable expectation.

## Holdout 2023-01-03 → 2026-10-14 (FINAL picks, continuous attribution)

| Candidate | close @ 11% | next open @ 11% | class vs B0 (close / next open) |
| --- | ---: | ---: | --- |
| **B0** | $122,197 / $28,208 | $127,058 / $25,780 | – |
| P1.profit | $83,710 / $30,619 | $64,518 / $28,057 | Fails / Fails |
| P1.balanced | $69,054 / $25,365 | $117,568 / $20,408 | Fails / **Risk trade-off** |
| P2xy.balanced | $19,383 / $24,740 | $60,835 / $19,880 | Fails / Fails |
| P2legacy.balanced | $116,893 / $28,988 | $110,840 / $25,856 | Fails / Fails |
| P3snap.balanced | $69,182 / $17,709 | $66,394 / $18,097 | Fails / Fails |
| P4.legacy.balanced | $114,904 / $26,218 | $74,475 / $27,192 | Fails / Fails |
| P4.fixed.balanced | $4,935 / $22,485 | $37,800 / $19,190 | Fails / Fails |
| P4.atr.balanced | $31,220 / $18,779 | $66,794 / $18,358 | Fails / Fails |
| P4.atr.lowDD | $74,432 / $10,584 | $66,571 / $11,974 | Fails / Fails (DD −58%, net −48%) |

**Flagged:** P1.balanced (X = 10%, Y = 1.9%, B0 exits) is a risk trade-off against B0 on the holdout **under next-open execution only** ($117,568 / $20,408 vs $127,058 / $25,780: −7% net, −21% drawdown). It fails under close execution on the same window ($69,054 / $25,365), fails in the walk-forward under both models, and its development perturbations fail. A result that appears in one execution model and one window only is not evidence for the mechanism. It shows how much a single entry-fill convention moves this strategy.

## Pre-close model over the minute-data coverage (FINAL picks, flat start 2016-01-04)

| Run | close 2016–2022 | close 2023 → 2025-10-13 | next open 2016–2022 | next open 2023 → 2025-10 | pre-close 2016–2022 | pre-close 2023 → 2025-10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **B0** | $76,632 / $23,723 | $98,943 / $28,208 | $33,642 / $31,684 | $98,693 / $25,780 | $71,810 / $23,841 | $100,149 / $27,997 |
| P1.balanced | $66,699 / $33,733 | $46,707 / $25,143 | $5,206 / $39,002 | $92,063 / $20,408 | $63,904 / $34,208 | $46,482 / $25,699 |
| P2xy.balanced | $94,681 / $29,728 | $19,383 / $24,740 | $100,559 / $27,583 | $65,148 / $19,880 | $85,026 / $29,149 | $18,857 / $25,114 |
| P3snap.balanced | $3,491 / $22,011 | $52,355 / $17,673 | $1,004 / $23,651 | $50,147 / $18,097 | $5,695 / $21,799 | $45,805 / $17,560 |
| P4.legacy.balanced | $156,335 / $21,714 | $94,502 / $26,218 | $103,023 / $40,385 | $83,862 / $27,192 | $141,544 / $26,205 | $92,526 / $28,342 |
| P4.fixed.balanced | $70,707 / $22,412 | −$11,364 / $22,485 | $27,677 / $24,087 | $16,297 / $19,190 | $51,125 / $29,035 | −$5,750 / $22,068 |
| P4.atr.balanced | $99,602 / $22,229 | $9,271 / $18,779 | $91,794 / $21,413 | $51,938 / $15,652 | $96,957 / $22,451 | $8,729 / $19,385 |

(2016–2022 is in sample for the optimized candidates. All rows: `results/holdout/tables.md`.) The pre-close model, which is the executable way to approximate a same-close fill, stays within a few thousand dollars of the close model for B0 ($71.8k vs $76.6k; $100.1k vs $98.9k) and for P1.balanced, P2xy.balanced and P4.atr.balanced. The next-open model is the outlier in both directions. Pre-close P1.balanced in 2023–2025 earns $46.5k, about half of its next-open figure, which confirms that the next-open "trade-off" above is execution noise.

## Margin interest

The 11% rate is a cost assumption, not an optimization parameter. Constant-rate sensitivities (actual historical broker rates are not available locally, and FRED could not be reached from this environment, so no time-varying series is tested or invented):

| Rate | B0 walk-forward Σ net / worst DD | B0 holdout net / DD | P4.legacy.balanced WF / holdout net | P1.balanced WF / holdout net | P4.atr.lowDD WF / holdout net |
| --- | ---: | ---: | ---: | ---: | ---: |
| 8% | $93,552 / $23,170 | $132,604 / $27,395 | $46,834 / $121,203 | $17,318 / $76,763 | −$6,960 / $78,451 |
| 9.5% | $88,868 / $23,423 | $127,022 / $27,802 | $43,810 / $118,752 | $13,796 / $72,908 | −$8,074 / $76,442 |
| 11% | $84,183 / $23,723 | $122,197 / $28,208 | $38,953 / $114,904 | $10,274 / $69,054 | −$9,187 / $74,432 |
| 12.5% | $79,498 / $24,023 | $120,209 / $28,615 | $34,095 / $110,770 | $857 / $65,199 | −$10,301 / $72,423 |
| 14% | $70,993 / $25,295 | $115,273 / $29,022 | $23,969 / $106,635 | −$808 / $62,283 | −$17,259 / $70,413 |

Each percentage point of rate costs B0 roughly $3.8k over the three validation windows and about $2.9k over the 3¾-year holdout (B0 is in the market 84% of the holdout; holdout interest at 11% is $35,381). Strategies that hold less pay less interest and lose less from a higher rate. That is the only channel through which the rate favours the trailing entries, and it is far too small: no candidate passes at 8% or 14% in either the walk-forward or the holdout (acceptance criteria C4, VALIDATION_ROBUSTNESS.md §1).

## Conclusion

The trailing-entry verdict does not depend on the execution convention or the rate. The baseline's own reported profit does depend on the convention: its walk-forward profit halves under next-open fills, while the pre-close model, which can actually be executed, stays near the idealized close. Any live use of this strategy should be judged on the pre-close or next-open numbers, not the same-close ones.
