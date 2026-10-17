# Recommendation: keep the immediate 10% entry

**Decision: retain the immediate buy.** Do not adopt the fixed-percent trailing buy, the ATR trailing buy, or any of the re-optimized parameter sets. No candidate met the pre-registered acceptance standard (PROTOCOL.md §9): 0 of 24 candidate types passed, and the best passed 1 of 9 criteria.

## Why

The hypothesis was that waiting for a rebound after the 10% signal would avoid part of extended sell-offs and so reduce drawdown and interest. On VGT 2014–2026 it does the opposite:

1. **The decline it waits out is small, and the rebound it pays for is larger.** After the 10% close, VGT's median further fall before a Y% bounce was 0–2%, and the arming close was often the low. At Y = 3% the fill averaged 2.1% *above* the immediate entry, and 83% of fills were higher (development 2014-01-02 → 2022-12-30; PHASE1_FIXED_Y.md).
2. **A higher entry trips the unchanged 15-day loss exit**, and in deep declines the rebound fill is usually a rally that fails (2020-03-02, 2022 bear market) or a single overshooting day (2025-04-09, bought 13.5% above the trough). In all four corrections of 20% or more (2018 Q4, 2020, 2022, 2025) every X = 10% trailing variant lost against B0 (EVENT_ATTRIBUTION.md).
3. **No tuning fixes it.** With exits at B0, none of 9,956 fixed X / Y points has a development drawdown at or below B0's $23,723, and only 6 of 23,580 ATR points beat B0 on both net and drawdown, each an isolated point whose neighbourhood does not. With every parameter optimized under an identical budget, the trailing families' walk-forward picks lose money in aggregate, and they also lose to the re-optimized immediate entry (PHASE4_OPTIMIZATION.md).
4. **Out of sample it fails everywhere it was tested.** Walk-forward 2018–2022: B0 $84,183 / $23,723 against −$39k … $19k for the trailing picks. Holdout 2023-01-03 → 2026-10-14: B0 $122,197 / $28,208 against −$9.5k … $83.7k. Event-level bootstrap: P(trailing pick beats B0 over the holdout's correction blocks) ≤ 4.8% (VALIDATION_ROBUSTNESS.md).
5. **The re-optimized immediate entry is no better.** Its profit and balanced picks roughly double the in-sample profit ($159–174k vs $79k on 2014–2022), keep less than half of B0's profit in walk-forward ($32–39k), and trail B0 on the holdout ($88.7–114.9k vs $122.2k). The original parameters are the fairest baseline, and they win.

## Summary comparison

Close fills, 11% interest. Training = 2014-01-02 → 2022-12-30 (the FINAL fold; in sample for every optimized row). Walk-forward = each fold's own pick on 2018–19, 2020–21 and 2022 (Σ net / worst DD). Holdout = 2023-01-03 → 2026-10-14, the FINAL parameters, continuous attribution. DD = maximum daily mark-to-market drawdown of the $100,000 borrowed allocation's P&L, not of an account or portfolio.

| Row (brief) | Candidate | Parameters (FINAL) | Training net / DD | Walk-forward Σ net / worst DD | Holdout net / DD | Holdout next open |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Original baseline | **B0** | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $78,778 / $23,723 | $84,183 / $23,723 | **$122,197 / $28,208** | $127,058 / $25,780 |
| (checked-in control) | B0c | same, loss=0.5% lower=3.0% | $72,993 / $23,723 | – | $117,912 / $28,687 | $127,058 / $25,780 |
| Optimized legacy, same budget | P4.legacy.profit | legacy L=154 X=8.9% stop=9.5% hold=14d loss=0.6% lower=3.6% retrace=51.8% | $173,575 / $25,674 | $32,204 / $28,084 | $88,714 / $27,755 | $107,759 / $28,836 |
| | P4.legacy.balanced | legacy L=47 X=9.1% stop=8.4% hold=14d loss=0.6% lower=3.5% retrace=69.7% | $159,071 / $21,714 | $38,953 / $28,084 | $114,904 / $26,218 | $74,475 / $27,192 |
| | P4.legacy.lowDD | legacy L=70 X=20.0% stop=5.1% hold=16d loss=1.1% lower=3.8% retrace=46.3% | $79,369 / $13,421 | −$5,934 / $21,530 | −$3,342 / $8,192 (1 trade) | $31,476 / $8,644 |
| Fixed 10% activation, optimized Y (exits fixed) | P1.profit | fixed L=90 X=10.0% Y=0.5% + B0 exits | $60,141 / $44,011 | $10,189 / $40,189 | $83,710 / $30,619 | $64,518 / $28,057 |
| | P1.balanced | fixed L=90 X=10.0% Y=1.9% + B0 exits | $66,344 / $33,733 | $10,274 / $29,493 | $69,054 / $25,365 | $117,568 / $20,408 |
| | P1.lowDD | fixed L=90 X=10.0% Y=1.7% + B0 exits | $63,737 / $36,186 | $10,189 / $40,189 | $41,375 / $25,143 | $53,337 / $28,203 |
| Joint X / Y (exits fixed) | P2xy.profit | fixed L=90 X=16.2% Y=1.7% + B0 exits | $94,121 / $29,728 | −$8,411 / $42,375 | −$3,713 / $9,480 (1 trade) | $34,990 / $12,777 |
| | P2xy.balanced = lowDD | fixed L=90 X=15.4% Y=1.9% + B0 exits | $94,681 / $29,728 | $8,442 / $32,308 | $19,383 / $24,740 | $60,835 / $19,880 |
| Fully optimized fixed trailing | P4.fixed.profit | fixed L=61 X=15.8% Y=0.6% stop=8.0% hold=21d loss=1.9% lower=0.6% retrace=36.7% | $104,786 / $29,728 | −$39,398 / $38,078 | −$9,486 / $15,003 (1 trade) | −$3,398 / $15,224 |
| | P4.fixed.balanced = lowDD | fixed L=165 X=8.6% Y=0.5% stop=4.4% hold=7d loss=0.9% lower=4.0% retrace=59.7% | $83,892 / $22,412 | −$25,184 / $30,998 | $4,935 / $22,485 | $37,800 / $19,190 |
| ATR trailing (exits fixed) | P3snap.profit | atrSnapshot L=90 X=16.2% K=0.5 N=5 + B0 exits | $81,772 / $29,728 | −$1,374 / $34,907 | $31,621 / $16,127 | −$7,491 / $12,221 |
| | P3snap.balanced | atrSnapshot L=90 X=9.1% K=3.1 N=5 + B0 exits | $3,491 / $22,011 | $18,574 / $32,308 | $69,182 / $17,709 | $66,394 / $18,097 |
| | P3snap.lowDD | atrSnapshot L=90 X=15.4% K=0.6 N=30 + B0 exits | $85,451 / $29,728 | −$14,905 / $32,456 | −$8,988 / $22,473 | $31,412 / $17,754 |
| Fully optimized ATR trailing | P4.atr.profit | atrSnapshot L=87 X=7.0% K=0.5 N=23 stop=9.5% hold=18d loss=1.0% lower=3.5% retrace=63.8% | $109,068 / $36,728 | −$16,549 / $30,252 | $37,675 / $31,349 | $80,060 / $24,437 |
| | P4.atr.balanced | atrSnapshot L=53 X=7.0% K=3.5 N=22 stop=8.4% hold=15d loss=0.9% lower=4.5% retrace=46.5% | $94,268 / $22,229 | −$16,086 / $28,278 | $31,220 / $18,779 | $66,794 / $18,358 |
| | P4.atr.lowDD | atrSnapshot L=48 X=7.1% K=4.0 N=30 stop=5.7% hold=7d loss=0.6% lower=3.5% retrace=64.0% | $65,531 / $9,828 | −$9,187 / $17,742 | $74,432 / $10,584 | $66,571 / $11,974 |

The walk-forward column uses each fold's own pick, so its parameters differ by fold (PHASE1–4 reports list them). The FINAL parameters shown are what was frozen for the holdout.

**Holdout detail** (close @ 11%; continuous attribution; full table in `results/holdout/tables.md`):

| Candidate | Interest | Entries | Win rate | In market | Worst open-trade mark | Worst low below entry | Setups / cancelled / pending at end | Mean wait (sessions) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| B0 | $35,381 | 14 | 40% | 84.2% | −$13,745 | 17.0% | – | – |
| P4.legacy.balanced | $30,318 | 14 | 33% | 72.6% | −$8,192 | 11.8% | – | – |
| P1.balanced | $28,268 | 13 | 43% | 67.3% | −$8,236 | 9.2% | 13 / 0 / 0 | 3.8 |
| P2xy.balanced | $8,529 | 3 | 50% | 20.1% | −$8,236 | 9.2% | 3 / 0 / 0 | 2.7 |
| P3snap.balanced | $19,378 | 9 | 44% | 47.0% | −$5,889 | 5.6% | 9 / 1 / 0 | 27.1 |
| P4.fixed.balanced | $10,126 | 19 | 25% | 24.3% | −$12,585 | 17.5% | 19 / 0 / 0 | 1.9 |
| P4.atr.balanced | $13,773 | 10 | 30% | 33.3% | −$8,236 | 9.2% | 9 / 0 / 0 | 24.2 |
| P4.atr.lowDD | $14,737 | 10 | 40% | 35.5% | −$3,129 | 3.6% | 9 / 0 / 0 | 28.3 |

**Annual mark-to-market P&L** (FINAL parameters, continuous from 2014-01-02; 2014–2022 in sample for the optimized rows; a trade crossing a year end is attributed by its mark-to-market change in each year):

| Run | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026* |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B0 | $0k | $7k | −$13k | $0k | $6k | $26k | $58k | −$0k | −$5k | $44k | $22k | $32k | $23k |
| B0c | $0k | $7k | −$13k | $0k | $6k | $15k | $58k | −$0k | −$0k | $44k | $11k | $39k | $23k |
| P1.balanced | $0k | $6k | $8k | $36k | −$15k | $19k | $36k | −$4k | −$20k | $43k | $18k | −$13k | $21k |
| P2xy.balanced | $0k | $0k | $17k | $36k | −$2k | $16k | $37k | $0k | −$8k | $27k | $0k | −$8k | $0k |
| P3snap.balanced | $0k | $0k | −$1k | $0k | −$3k | $12k | −$5k | $2k | −$3k | $15k | $7k | $24k | $23k |
| P4.legacy.balanced | $0k | $7k | $13k | $37k | $8k | $20k | $58k | $23k | −$7k | $43k | $9k | $39k | $23k |
| P4.fixed.balanced | $7k | $6k | $17k | $15k | −$2k | $26k | −$1k | $12k | $3k | −$6k | $9k | −$12k | $14k |
| P4.atr.balanced | $5k | −$7k | $4k | $31k | −$3k | $27k | $33k | $15k | −$12k | $9k | $3k | −$3k | $23k |
| P4.atr.lowDD | $1k | $2k | $4k | $31k | $4k | $13k | $5k | $5k | $0k | $8k | $6k | $34k | $26k |

\* 2026 through 2026-10-14.

The four questions the brief asks to keep apart:

- **Higher raw profit:** nothing beats B0 out of sample. In sample, the re-optimized immediate entry doubles it.
- **Lower absolute drawdown:** several candidates have much smaller holdout drawdowns (P4.atr.lowDD $10.6k, P3snap.balanced $17.7k), but by trading less and keeping 39–43% less profit, and their walk-forward drawdowns are not lower in any consistent way.
- **Better combined trade-off:** none reaches the pre-registered risk-trade-off line (≥ 90% of B0's net with ≤ 85% of its drawdown) on both the walk-forward and the holdout. P4.atr.lowDD has the best holdout profit-to-drawdown ratio, but its fold picks lost money in walk-forward (−$9,187) and it fails 8 of 9 criteria.
- **Robustness and simplicity:** B0 is the simplest rule and the most robust in this study. The trailing rules add a state (pending setups), a parameter or two, and path dependence, with no compensating gain.

## Decision-relevant candidates (none recommended)

All with complete parameters; out-of-sample metrics as above.

1. **B0**, the retained rule.
2. **P4.legacy.balanced** (L=47 X=9.1% stop=8.4% hold=14d loss=0.6% lower=3.5% retrace=69.7%): the best re-tuned immediate entry. Holdout $114,904 / $26,218 (−6% net, −7% DD vs B0), WF fails, cross-asset passes on 4 of 6. A parameter hypothesis to watch prospectively at most, not to adopt.
3. **P4.atr.lowDD** (atrSnapshot L=48 X=7.1% K=4.0 N=30 stop=5.7% hold=7d loss=0.6% lower=3.5% retrace=64.0%): the low-risk extreme. Holdout $74,432 / $10,584 (in the market 36% of the time vs B0's 84%), WF −$9,187 / $17,742; fails the cross-asset check on all six ETFs.
4. **P1.balanced** (X 10%, Y 1.9%, B0 exits): the "minimal change" candidate. Holdout $69,054 / $25,365 (close) but $117,568 / $20,408 at next open, the only holdout risk trade-off found, and in one execution model only; WF fails.
5. **P3snap.balanced** (ATR X 9.1% K 3.1 N 5, B0 exits): holdout $69,182 / $17,709; WF $18,574 / $32,308.
6. **P2xy.balanced** (X 15.4% Y 1.9%, B0 exits): the development island; holdout $19,383 / $24,740 with 3 trades.
7. **P4.fixed.balanced** (L=165 X=8.6% Y=0.5% stop=4.4% hold=7d loss=0.9% lower=4.0% retrace=59.7%): the best-fitted fixed trailing rule; holdout $4,935 / $22,485.

The extended shortlists (10 per family, every parameter) are in PHASE4_OPTIMIZATION.md, with their holdout results in VALIDATION_ROBUSTNESS.md §3. All 30 fail against B0.

## Operational rules

**Retained rule (B0), unchanged from `src/app/allin-original.ts` with material loss 1.0% and lower re-entry 2.0%:**

1. Each session, compare the close with the highest high of the previous 90 sessions (today excluded). If flat at the start of the session and the close is at least 10% below that high, buy $100,000 of VGT at the close (fractional shares).
2. After a material losing trade (exit price at least 1.0% below the entry price, interest excluded), the next entry also needs a close at or below 98% of the losing exit price. The restriction clears instead if a flat close recovers 38% of the way from the episode's lowest close back to the losing trade's entry reference high; that session does not buy.
3. While holding: from the session after entry, a stop sits 8% below the highest high since entry (raised after each session for the next one). It is active only when selling at the stop would be profitable after accrued interest. If a session opens at or below an active stop, sell at the open; otherwise sell at the stop if the low reaches it. From 15 calendar days after entry, sell at the open whenever that sale would lose money after interest.
4. One position at a time; no purchase in a session that started with a position.

Configuration: `baselineParams` in `src/trailing-buy/engine.ts` (`entryMode: 'legacy', lookback: 90, armTenths: 100, stopTenths: 80, holdDays: 15, materialLossTenths: 10, lowerReentryTenths: 20, retraceTenths: 380`), 11% simple interest. Same-close fills are idealized; the executable pre-close model (decide and buy just before 15:55 New York time) tracked the close model within a few thousand dollars over 2016-01-04 → 2025-10-13. Next-open fills moved B0's results by tens of thousands in both directions (EXECUTION_SENSITIVITY.md).

**The rejected trailing rule, as tested (for reference or prospective paper tracking only):** after the 10% close, *arm* without buying; on each later close, lower the trough when the close is below it, otherwise buy when the close is at least Y% above the trough (or trough + K × the previous session's ATR). Example: prior high $100, close $89.90 arms; closes $80 and $75 set the trough; $77.20 and $77.24 do nothing; $78.00 buys at $78.00 (Y = 3%). A recovery reset cancels a pending setup. Exact specification: STATE_MACHINE.md.

## Known failure cases

- **Of the trailing entry** (why it was rejected): it buys higher in V-shaped dips (most VGT corrections bottom within days of the 10% close); it buys failed bear-market rallies (2020-03-02, 2022); it can fill on one huge up-day far above the trigger (2025-04-09, +13.5%); and its higher entries make the unchanged 15-day loss exit fire more often. It missed the 2025 V recovery entirely.
- **Of the retained immediate entry:** it buys early in deep declines, so its first trade in a crash loses (2020: −$8,847; 2025: −$3,025), and it relies on the 15-day exit and quick re-entries to recover. That worked in 2020 and 2025, both fast V recoveries and widely publicized events, so there is regime dependence on V-shaped recoveries. Its results are sensitive to the fill convention (walk-forward profit halves under next-open fills), and its holdout drawdown ($28,208, 2024-12-16 → 2025-04-08) was its largest since 2014. Interest is a large cost ($78,447 over 2014–2026 at 11%) and rises with the rate.
- **Of the evidence:** 20 correction episodes in total, 4 deep ones; single-path totals that move by tens of thousands on one fill; a holdout already examined by an earlier entry-timing study; and idealized same-close fills.

## Next research (only what the evidence supports)

1. **Execution, not entry logic.** The largest effect found on B0 in this study is the fill convention (next-open vs same-close: −$44k over the walk-forward windows), larger than any entry variant's effect. The highest-value next step is to settle how the live order is actually placed (a 15:55 pre-close order, an after-hours limit, or next open) and evaluate B0 under that model only. `research/risk-management/vgt-minute-execution/` already covers part of this for the minute strategy.

No further work on trailing or delayed entries is recommended: five families of tests here, and the earlier `research/vgt-drawdown-entry-risk` study of velocity, indicator and stabilization gates, all point the same way.
