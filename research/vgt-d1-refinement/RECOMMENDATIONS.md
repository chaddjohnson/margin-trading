# Recommendations

Evidence-calibrated, in the brief's terms: no fresh holdout exists, every "pick" below was chosen on inspected
history, and the one systematic test available — walking the selection rule forward over the chronological folds —
never produced anything better than the shipped D1.

## 1. Shortlist

| Role | Strategy | Vector | Full run | Why it is on the list | Caveat |
|---|---|---|---|---|---|
| **Reference / balanced** | **D1 unchanged** | `allIn-trailingBuy-postExitContinuation.ts` as shipped | $183,044 / $19,331, 20 entries | the maximum of its own local box (0 of 4,096 nearby points beat it in three of four boxes); on the centre of the P 8.5–9.4% plateau and a 109-session W plateau; picked by the maxNet and balanced rules on the folds that contain 2020 and 2022 | its six parameters are themselves the product of this history; the selection rule picks badly on windows that end before 2020 |
| Same trades, cleaner stop | D1 with the **gross-breakeven activation (B-B)** or **gross threshold 8% (B-A)** | `…-stopGrossBreakeven.ts`, `…-stopGrossThreshold.ts` | identical: $183,044 / $19,331 | the same 20 trades with an exit rule that does not depend on the interest assumption, cannot switch off, and is simpler to state and test | it is a reformulation, not an edge; it does not protect an unprofitable position before the hold day any more than D1 does |
| Lower drawdown, same entries | D1 with **P 8.6%** | `show --family d1 --params pullback=86` | $182,842 / $18,990 | the low-DD end of the plateau; 18 of D1's trades plus two marginal ones | $200 of net for $340 of drawdown: a different point on the same plateau |
| Lower drawdown, more stable | **A2-lowDd**: X 22.4 Y 0.8 stop 7.8 hold 8 L 82 buffer 2.4 + P 9.0 W 60 | `show --family d1 --params targetPercentChange=224,trailingBuyPercentage=8,trailingStopPercentage=78,tickWindowSize=82,intradayLossBuffer=24` | $172,035 / $19,191 | 98% one-parameter stability (the highest of any D1-family vector); the same episodes | −$11k of net, Y at the box edge, in-sample |
| Higher profit (in-sample) | **A2-maxNet**: X 23.8 Y 0.2 stop 7.3 hold 8 L 62 buffer 1.6 + P 9.2 W 69 | `show --family d1 --params targetPercentChange=238,trailingBuyPercentage=2,tickWindowSize=62,intradayLossBuffer=16,pullback=92,continuationWindow=69` | $195,808 / $19,517 | +$12,764 at equal drawdown with the same six big winners re-timed | chosen twice in-sample (a one-step P ridge, then a corner of the box with Y at its edge); the rule that finds it loses to frozen D1 by $13–77k on the earlier folds |
| 2023-participating | **D3** (P 7.0%) | `show --family d1 --params pullback=70` | $176,943 / $19,705 | the 7% pullback arms in March 2023 (+$19,542) at the cost of weaker 2019 and 2020 re-entries; 96% stability | 2023 is the previously inspected event; not evidence |
| Low-drawdown alternative architecture | **C2 swing balanced**: K 55 Ys 0.6% Z 0 stop 4.0% hold 26 buffer 0.4% | `allIn-trailingBuy-swingLow.ts` | $114,478 / $16,706, 32 entries, 26/6 | the only no-dip phenotype with a D1-like risk profile; positive in all four validation windows; 88% stability; shares no trade with D1 | 63% of D1's net; an in-sample refinement of a rejected architecture; a 4% stop and a 26-day hold are a different strategy, not a D1 variant |

Not on the list: the frequent-trading phenotypes (none kept the 2022 losses out), B-C and B-D (worse where D1's
inactive stop was a feature), C1 and the C2 maxNet refinement (invested 88–95% of the time at the drawdown ceiling),
C3 (adds noise to D1's trades).

## 2. Reasons to retain or reject each mechanism

- **Post-exit continuation (D1's mechanism)**: retain as is. Its P plateau is 1.0 point wide and its W plateau 109
  sessions; its gain over Set 2 is six 2019–2021 re-entries and two 2022 losses; nothing re-tuned beats it out of
  sample.
- **Local re-optimization of the six original parameters**: reject as a source of improvement. D1 is the design
  maximum of its own box; the few higher points sit on one-step ridges or box edges; the selection rule converges to D1
  only once 2020 and 2022 are in the training window.
- **Stop activation B-A / B-B**: retain as an *equivalent formulation* worth adopting for clarity (no interest
  dependence, no switch-off, a latch that is irreversible by construction, explicit unit tests). On this history it
  changes nothing; the B0 diagnostic shows why: D1's stop never executed below gross breakeven, and the one switch-off
  met no breach.
- **Stop activation B-C (two-stage)**: reject. The protective stop fires only where the hold-day rule already sells,
  and sells lower (March 2020).
- **Stop activation B-D (always active)**: reject. Costs 10% of the net and raises the drawdown by stopping fresh
  entries into the gaps of March 2020 and April 2025.
- **No-dip entries C1 / C2 / C3**: reject as improvements; keep the C2 balanced phenotype as a documented
  alternative. Their profits come from exposure, not entry quality; their drawdowns sit at the ceiling and their 2022
  is a string of losses; adding them to D1 never raised the net.

## 3. What the stop diagnostic implies for live use

The shipped rule tests whether a fill *at the stop level* would net a profit after interest, re-decided every session.
Three consequences for anyone running D1: (1) an unprofitable position has **no stop at all** until the eighth calendar
day, and no gap protection (a 20% overnight gap on day 3 is held); (2) the protection can lapse during a long flat
stretch as interest accrues (once on D1's history, harmlessly); (3) the exit decision depends on the interest-rate
assumption (the 2023 trough trade of the previous program existed only because the rule was off that week). B-B
removes (2) and (3) at zero historical cost; nothing in this program removes (1) without losing money on this history
(B-C, B-D). Whether to accept (1) is a risk decision, not a backtest question.

## 4. Next research steps that do not pretend a holdout exists

1. **Decide the live stop rule on principle**: adopt B-B (or B-A 8%) for its explicit, interest-independent latch; the
   historical cost is zero and the tests are in place. Keep the rule's exact wording in the strategy file.
2. **Forward-record, don't re-fit.** D1's parameters have now been shown to be a local maximum of the inspected
   history three ways; the next information will come from 2026 minute data (not in the repository), evaluated with
   D1 and B-B frozen, before any further tuning.
3. **Gap risk on unprofitable positions**: if (1) above is unacceptable, the question is a *wide* protective stop (B-C
   at E 15–20% fires rarely: E ≥ 16.3% never did) sized as insurance, evaluated by what it would have cost, not
   optimized for net.
4. **The C2 balanced phenotype** is the only new architecture with a different trade signature and a D1-like
   drawdown; if it is of interest, the next step is a mechanism study of *why* quarter-year lows with a tight stop
   won 26 of 32 trades (session-of-week, gap behaviour, which lows), with 2016–2017 (before the eligibility session)
   as a pseudo-forward check it has not seen, before any tuning.
5. **Do not** run another global or joint search on this architecture; three programs have shown it loses 2022.
