# Workstream D — financing, transaction costs, slippage and stop execution

The frozen B4 and B5 signals (parameters unchanged) are re-run under the scenarios pre-registered in PROTOCOL.md §6.
Machine-readable results:
- `results/D_costs.csv`;
- `results/D_B5_minus_B4.csv`;
- `results/runs/cost.jsonl`.

## Cost layers (no double counting)

The engine applies **one** multiplicative per-side adjustment to every fill price, `costBps`.
- Fee/spread crossing and additional fill slippage both enter through it, as their sum, and the engine cannot tell
  them apart. "10 bps fee" and "5 bps fee + 5 bps slippage" are the same run.
- **Stop overshoot** (`stopSlippageBps`) is an extra adverse adjustment on trailing-stop and stop-gap exits only, on top
  of `costBps`.
- `next-open` changes the stop **fill rule** (the first trade after the trigger minute instead of the stop level). It
  is an execution-path stress, not a cost.
- **Financing** is the simple annual rate on a 365-day year, accrued daily on the funded principal. The interest
  convention is the engine's: whole calendar days from the entry session's date to the exit session's date.

{{t.costLayers}}

**Costs change the trade path, not only the bill.**
- D1's trailing stop is active only once an exit at the stop would be **net-profitable after interest and
  friction**. Its continuation window opens only after a **net-profitable** exit.
- So a higher rate or friction delays stop activation, turns marginal winners into maximum-hold exits, and closes
  continuation windows. Every scenario was therefore **re-simulated**.
- Each scenario's change in fixed net is split into two parts:
  - **Cost effect:** the base run's own lots, re-costed at the scenario's rate, friction and stop overshoot, with the
    same entries, exits and holding days. Exact for the same trades.
  - **Path effect:** the rest. These are lots added or removed, and exits that moved, because the decisions
    themselves changed.

## B4

{{t.costs.B4}}

## B5

{{t.costs.B5}}

## B5 − B4 under every scenario

{{t.costDiff}}

## Break-even thresholds

A break-even is reported only where the measured quantity changes sign between two tested points, interpolated
linearly between them and never extrapolated.

{{t.breakEvens}}

Nothing changes sign in the tested ranges:
- financing 8–18%;
- friction 0–45 bps per side;
- stop overshoot to 100 bps.

So **no break-even exists inside the tested values**, and none is extrapolated.

## Findings

- **Both pools stay profitable under every scenario, and both beat the no-margin core.**
  - The harshest combined case (C3: 18% financing, 45 bps per side, 50 bps stop overshoot) leaves B4 at
    {{v.cost.B4.C3}} and B5 at {{v.cost.B5.C3}} of fixed net.
  - Their portfolios still finish {{v.c3Inc.B4}} and {{v.c3Inc.B5}} above C0.
- **Degradation is non-linear, and path effects are as large as cost effects.**
  - At 18% financing, the same-trade cost is {{v.costCost.B4.r18}} for B4, and the path effect adds
    {{v.costPath.B4.r18}} (lots {{v.costLots.B4.r18}}).
  - At 15 bps per side, the cost is {{v.costCost.B4.f15}} and the path {{v.costPath.B4.f15}}.
  - Below about 10 bps and 14%, the path barely moves: at most one exit changes.
  - Above that, marginal trades flip from stop exits to maximum-hold exits, and the changed exit dates reorder later
    entries. Under C3, 5 of B4's matched lots flip, and its maximum-hold exits rise from 27 to 33. In B5, 4 flip, and
    maximum-hold exits rise from 32 to 37.
- **B4 is more cost-sensitive than B5.**
  - C1 (14% + 20 bps) leaves B4 at {{v.cost.B4.C1}} and B5 at {{v.cost.B5.C1}}.
  - C2 leaves them at {{v.cost.B4.C2}} and {{v.cost.B5.C2}}.
  - Under C3, net ÷ minute DD changes by {{v.costNetPerDD.B4.C3}} (B4) and {{v.costNetPerDD.B5.C3}} (B5).
- **Gate E** (moderate stresses r14, f15, f20, C1): neither pool's fixed net or incremental portfolio wealth goes
  non-positive. The C1 falls (B4 −31%, B5 −20% of fixed net; −23% / −24% net ÷ DD) are under the pre-registered 50%,
  so **no flag** for either pool. The severe scenarios C2 and C3 are not part of gate E, but they show material
  degradation (B4 −49% / −60%).
- **The GDX increment is cost-robust.**
  - B5 − B4 stays between {{v.costDiffMinFixed}} and {{v.costDiffMaxFixed}} of fixed net in every scenario.
  - The portfolio difference never falls below {{v.costDiffMinPortfolio}}.
  - GDX trades are long holds with large moves (median 18 days; see `TRADE_CONCENTRATION.md`), so per-side friction
    and stop overshoot barely touch them. Gate C (cost part) raises no flag.
- **Stop execution.**
  - Stop overshoot is a pure cost up to 25 bps; at 50–100 bps it starts removing lots.
  - `next-open` fills move 33 (B4) and 43 (B5) exits but leave net almost unchanged (+0.3% / +0.2%). The stop-level
    fill assumption is not flattering the results on average.
  - It is still an assumption: minute bars cannot show whether the stop actually traded. Gap exits ("trailing stop
    gap") already fill at the opening trade.
- **Portfolio drawdowns barely move with costs** (B4 34.1–35.3%, B5 29.0–30.9%), because the drawdown is set by the
  core and the March-2020 slot sequence. Under C2/C3, B5's maximum drawdown moves to the 2022 bear market (30.0% /
  30.9%), above the 30% preference.

## Limitations

- **Quote-level execution.** Minute OHLCV bars cannot reproduce quote-level execution: the bid/ask, queue position and
  partial fills. The friction is a symmetric per-side haircut, applied the same in calm and stressed markets.
- **Stressed markets.** Real spreads on XBI, XRT, KRE and GDX widen in exactly the episodes that drive the profits
  (March 2020). A uniform 20–45 bps is a coarse stand-in for that.
- **Size.** Capacity at portfolio scale (borrowed principal up to $0.6M for B4 and $1.0M for B5 per lot) was not
  modelled. Whether the ETFs absorb orders of that size at the modelled friction in stressed minutes was not
  checked.
- **Financing rates.** Financing is simple interest at a constant rate. Real broker margin rates float with policy
  rates and differ by broker and balance tier. The constant-rate scenarios (8–18%) bracket rather than reproduce them.
