# Recommendations — initial screening of five risk-management approaches

Coordinator assessment. The evidence is in `COMPARISON.md` and in each experiment's report. These are
exploratory, in-sample results on data that had already been examined. Nothing is adopted, combined or
optimized here, and `allIn.ts` is unchanged.

## Bottom line

**No experiment produced a convincing improvement.**

- **Simple deleveraging matches or beats the rules.** The one finding that holds across all four datasets is
  that a fixed, smaller position size does as well as, or better than, almost every rule tested, at the same
  borrowed-capital exposure.
- **Only SMA200 sizing shows an advantage beyond deleveraging,** and it is small, fragile and within what
  arbitrary trade selections produce.
- **The prolonged-bear-market problem is not solved by any of these mechanisms.** In 1999–2015, the best
  configuration still earns only about $11k–$12k over 10–17 years after 11% interest.
- This supports your stated fallback: **the strategy likely needs a fundamentally different approach to
  prolonged bear markets, not a better exit or re-entry rule.**

## Ranked assessment

| Rank | Approach | Classification | Best config |
|---|---|---|---|
| 1 | SMA200-based sizing | **Inconclusive** | B (the only config) |
| 2 | Cumulative drawdown circuit breaker | **Unpromising** | B |
| 3 | Staged position entries | **Unpromising** | C (3% recovery) is less bad than B |
| 4 | Recovery-confirmed re-entry | **Unpromising** | B (two positive closes) is least bad |
| 5 | Protective loss exits | **Unpromising** | D (early 5%) is least bad; all are dominated |

### 1. SMA200-based sizing — Inconclusive

**Backtest calculations**
- Max drawdown is lower than the baseline in all four datasets (−20% to −37%) and lower than the matched
  control in all four ($1.1k–$8.1k).
- Profit is higher than the control in three datasets. VGT 2016–2026 is the exception, at −$6.9k.
- It roughly halves bear-window losses: QQQ 2000–2002 −$45.8k vs −$91.6k.
- It keeps 71% of recovery-window P&L.

**Inferences**
- Most of the drawdown reduction is deleveraging (69–84% exposure).
- The residual edge is consistent in sign but small: 3.5–15% of the control's drawdown.
- The agent's descriptive chance check finds that arbitrary halvings of the same number of trades match it in
  15–38% (drawdown) and 28–70% (profit) of cases.
- The profit effect hinges on one to three bottom-recovery trades whose 20-session SMA200 slope was within
  ±0.4% of zero: Dec 2018, Apr 2025, and the Apr 2020 winner that kept full size.

**Why Inconclusive and not Promising**
- It is the only mechanism that beats its matched control on both measures in most datasets.
- But the advantage is not distinguishable from chance on this evidence.
- It systematically halves the first rebound entry after V-shaped bottoms.

**Worth one narrow follow-up, if authorised:** a pre-registered check on data not used here.

### 2. Cumulative drawdown circuit breaker — Unpromising

**Backtest calculations**
- Drawdown falls 23–59%, but the circuit breaker beats its matched control on both profit and drawdown in
  **0 of 4** datasets.
- On QQQ 1999–2015, its $62k drawdown compares with $43k for a fixed $28.8k position with the same exposure.
- It is trapped at low size: the $25k tier for the last 15.2 years of the QQQ data, and never back to $100k
  after January 2008 on VGT 2005–2015.
- It keeps 25% of the 2003 and 2009 recovery P&L, and 52% of recovery P&L overall.
- 34–50% of its max drawdown occurred while it still held $100k, because size changes only at the next entry.

**Inference.** It protects capital only by lowering exposure, and less efficiently than doing so from the
start. Its one profit gain (QQQ 1999–2015) depends on the dataset starting just before the 2000 top.

### 3. Staged position entries — Unpromising

**Backtest calculations**
- Both variants trail their matched control on drawdown in all 8 config × dataset cases.
- They trail on profit in 7 of 8. The exception is C on QQQ 2016–2026, +$5.0k from a single March 2020
  episode; without it, −$6.2k.

**Mechanism found by the agent.** The second tranche raises the cost basis by 1–2%. That delays activation of
the profit-conditional stop and makes the 15-day loss exit fire more often. The second tranche earns less per
dollar-day than the baseline in all 8 cases.

**Partly working:** variant C does halve the losers that never bounce 3% (0 of its 91 no-add positions made
money).

### 4. Recovery-confirmed re-entry — Unpromising

**Backtest calculations**
- All 12 configurations earn less than both the baseline and their matched control.
- Drawdown is worse than the control in 11 of 12.

**Inferences**
- The baseline re-enters the session after a loss 90% of the time. The rules block 62–95% of those re-entries,
  losers and winners alike.
- Delayed entries cost a median 0.9–3.2% in price.
- Big winners were missed after tiny interest-driven losses: VGT January 2023 and March 2026 under B.
- The rules do not identify bad re-entries; they only delay all of them.

### 5. Protective loss exits — Unpromising

**Backtest calculations**
- Exposure is unchanged (99–108%), yet profit is lower in 12 of 12 cases, drawdown higher in 11 of 12, and
  bear-window losses worse in 14 of 15.

**Mechanism**
- With immediate re-entry, 211 of 215 stop-outs re-entered the very next session.
- Only 38% of re-entries were cheaper than the sale price.
- There were chains of up to 9 consecutive stop-outs.
- One large loss becomes several smaller ones, and their sum is larger.

**Inference.** This is the clearest negative result. Reducing individual losses does **not** reduce cumulative
bear-market drawdown when re-entry is immediate.

## What the screening suggests (inferences and hypotheses, not tested)

1. **Trade-selection and timing rules work against the strategy's source of profit.**
   - Profits come from entries near bottoms, which look identical to bear-market entries at the time.
   - Stops, confirmations and staged adds all trade bottom-rebound profit for reduced bear losses, and lose on
     net.
   - Observed across four datasets and three different mechanisms.
2. **Exposure rules work mostly by lowering exposure.** A fixed smaller size is the benchmark they must beat,
   and only SMA sizing does, marginally.
   - Practical inference: the most reliable risk control found here is choosing the fixed position size from
     the drawdown you can tolerate in the worst historical case.
   - The baseline's maximum drawdown was 1.50× the position size in QQQ 1999–2015 and 0.73× in VGT 2005–2015.
     This is an inference from the matched-control results, not a recommendation to adopt a specific size.
3. **Financing cost dominates the old periods.**
   - In QQQ 1999–2015, the baseline's gross trading profit ($122k) is less than its margin interest ($125k).
   - With an edge this thin before financing, no exit or re-entry rule can make prolonged bear markets
     profitable at 11%. Only the cost of capital, or a different source of edge, can.
   - This is a historical calculation; any implication for other financing rates is untested.

## Suggested next investigations (not performed; each needs separate authorisation)

**A. SMA200 sizing out-of-sample check**, pre-registered with the identical rule and no parameter changes:
- on data not used here, ideally independent bear markets: other indices or regions, or pre-1999 history if
  obtainable;
- report it against a matched-exposure control, with the same chance check.

The agent's flagged parameters (slope lookback and threshold, SMA length, regime definition) belong to a later
robustness phase. Testing them now would be optimization on already-examined data.

**B. A fixed-size, drawdown-budget baseline as the reference point.** Document the profit and drawdown
trade-off of simply running the strategy at smaller fixed sizes. It is computable exactly from the baseline,
because results scale linearly with size. Any future rule should have to beat it.

**C. A fundamentally different approach to prolonged bear markets.** Examples, as hypotheses only:
- portfolio-level exposure that does not rely on a single leveraged sleeve;
- unlevered or lower-cost financing for the dip-buying sleeve;
- a different entry concept that does not buy repeatedly into secular declines.

Previous entry-filter experiments eliminated the major rebound winners, so any regime-based idea faces the same
problem documented here.

## Stop

The initial screening is complete. Per your instructions, I have **not** proceeded to:
- parameter optimization;
- robustness sweeps;
- strategy combinations;
- any change to `allIn.ts`.

Nothing has been committed.
