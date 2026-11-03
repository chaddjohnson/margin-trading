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

| ID | Scenario | Rate | Fee/spread bps | + Slippage bps | = costBps per side | Stop overshoot bps | Stop fill |
|---|---|---:|---:|---:|---:|---:|---|
| base | base: 11%, 5 bps | 11% | 5 | 0 | 5 | 0 | stop |
| r08 | financing 8% | 8% | 5 | 0 | 5 | 0 | stop |
| r14 | financing 14% | 14% | 5 | 0 | 5 | 0 | stop |
| r18 | financing 18% | 18% | 5 | 0 | 5 | 0 | stop |
| f00 | friction 0 bps/side | 11% | 0 | 0 | 0 | 0 | stop |
| f02 | friction 2 bps/side | 11% | 2 | 0 | 2 | 0 | stop |
| f10 | friction 10 bps/side (10 fee, or 5 fee + 5 slippage) | 11% | 10 | 0 | 10 | 0 | stop |
| f15 | friction 15 bps/side (5 fee + 10 slippage) | 11% | 5 | 10 | 15 | 0 | stop |
| f20 | friction 20 bps/side (20 fee, or 10 fee + 10 slippage) | 11% | 20 | 0 | 20 | 0 | stop |
| f30 | friction 30 bps/side (5 fee + 25 slippage) | 11% | 5 | 25 | 30 | 0 | stop |
| f45 | friction 45 bps/side (20 fee + 25 slippage) | 11% | 20 | 25 | 45 | 0 | stop |
| s10 | stop overshoot 10 bps | 11% | 5 | 0 | 5 | 10 | stop |
| s25 | stop overshoot 25 bps | 11% | 5 | 0 | 5 | 25 | stop |
| s50 | stop overshoot 50 bps | 11% | 5 | 0 | 5 | 50 | stop |
| s100 | stop overshoot 100 bps | 11% | 5 | 0 | 5 | 100 | stop |
| nxo | stops fill at the next trade after the trigger minute | 11% | 5 | 0 | 5 | 0 | next-open |
| C1 | combined: 14% + 10 fee + 10 slippage | 14% | 10 | 10 | 20 | 0 | stop |
| C2 | combined: 18% + 20 fee + 25 slippage | 18% | 20 | 25 | 45 | 0 | stop |
| C3 | combined: 18% + 20 fee + 25 slippage + 50 bps stop overshoot | 18% | 20 | 25 | 45 | 50 | stop |

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

| ID | Fixed net | Δ vs base | Same trades re-costed (cost effect) | Path effect | Lots (+ / − / exits changed) | Minute DD | Net ÷ DD | Portfolio end | vs C0 | Daily % DD | Minute % DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base | $284,245 | +$0 (+0.0%) | +$0 | +$0 | 76 (+0 / −0 / 0) | $28,659 | 9.92 | $3,608,484 | +$1,328,715 | 34.65% | 37.01% |
| r08 | $296,884 | +$12,639 (+4.4%) | +$12,822 | −$183 | 76 (+0 / −0 / 1) | $28,446 | 10.44 | $3,686,097 | +$1,406,328 | 34.60% | 36.97% |
| r14 | $270,493 | −$13,752 (−4.8%) | −$12,822 | −$930 | 76 (+0 / −0 / 1) | $28,873 | 9.37 | $3,524,811 | +$1,245,042 | 34.69% | 37.06% |
| r18 | $209,188 | −$75,057 (−26.4%) | −$29,918 | −$45,139 | 71 (+1 / −6 / 4) | $24,111 | 8.68 | $3,163,773 | +$884,004 | 34.07% | 36.44% |
| f00 | $291,775 | +$7,530 (+2.6%) | +$7,935 | −$405 | 76 (+0 / −0 / 1) | $27,968 | 10.43 | $3,661,933 | +$1,382,164 | 34.55% | 36.92% |
| f02 | $289,005 | +$4,760 (+1.7%) | +$4,760 | +$0 | 76 (+0 / −0 / 0) | $28,245 | 10.23 | $3,642,263 | +$1,362,494 | 34.59% | 36.96% |
| f10 | $275,364 | −$8,881 (−3.1%) | −$7,927 | −$953 | 76 (+0 / −0 / 1) | $29,350 | 9.38 | $3,546,472 | +$1,266,703 | 34.74% | 37.11% |
| f15 | $242,606 | −$41,639 (−14.6%) | −$15,847 | −$25,792 | 73 (+2 / −5 / 3) | $30,040 | 8.08 | $3,321,355 | +$1,041,586 | 34.83% | 37.20% |
| f20 | $235,180 | −$49,065 (−17.3%) | −$23,758 | −$25,307 | 73 (+2 / −5 / 4) | $30,729 | 7.65 | $3,273,464 | +$993,695 | 34.93% | 37.29% |
| f30 | $185,519 | −$98,726 (−34.7%) | −$39,557 | −$59,168 | 72 (+3 / −7 / 7) | $26,691 | 6.95 | $2,999,722 | +$719,953 | 34.40% | 36.76% |
| f45 | $166,923 | −$117,321 (−41.3%) | −$63,197 | −$54,124 | 70 (+3 / −9 / 8) | $28,434 | 5.87 | $2,892,219 | +$612,450 | 34.62% | 36.98% |
| s10 | $279,065 | −$5,180 (−1.8%) | −$5,180 | +$0 | 76 (+0 / −0 / 0) | $29,187 | 9.56 | $3,573,932 | +$1,294,163 | 34.71% | 37.08% |
| s25 | $271,295 | −$12,950 (−4.6%) | −$12,950 | +$0 | 76 (+0 / −0 / 0) | $29,979 | 9.05 | $3,522,703 | +$1,242,934 | 34.81% | 37.17% |
| s50 | $239,148 | −$45,097 (−15.9%) | −$25,900 | −$19,197 | 74 (+0 / −2 / 0) | $31,299 | 7.64 | $3,308,632 | +$1,028,863 | 34.98% | 37.33% |
| s100 | $215,201 | −$69,044 (−24.3%) | −$51,800 | −$17,244 | 72 (+0 / −4 / 0) | $33,938 | 6.34 | $3,165,137 | +$885,368 | 35.31% | 37.65% |
| nxo | $284,959 | +$715 (+0.3%) | n/a (fill rule) | n/a | 76 (+0 / −0 / 33) | $28,312 | 10.07 | $3,611,119 | +$1,331,350 | 34.60% | 36.97% |
| C1 | $195,621 | −$88,623 (−31.2%) | −$36,580 | −$52,043 | 71 (+3 / −8 / 7) | $25,658 | 7.62 | $3,069,321 | +$789,552 | 34.27% | 36.64% |
| C2 | $143,892 | −$140,353 (−49.4%) | −$93,115 | −$47,238 | 71 (+5 / −10 / 10) | $29,973 | 4.80 | $2,782,179 | +$502,410 | 34.66% | 37.01% |
| C3 | $113,048 | −$171,197 (−60.2%) | −$118,809 | −$52,388 | 70 (+5 / −11 / 10) | $36,111 | 3.13 | $2,629,970 | +$350,201 | 34.86% | 37.21% |

## B5

| ID | Fixed net | Δ vs base | Same trades re-costed (cost effect) | Path effect | Lots (+ / − / exits changed) | Minute DD | Net ÷ DD | Portfolio end | vs C0 | Daily % DD | Minute % DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| base | $486,208 | +$0 (+0.0%) | +$0 | +$0 | 94 (+0 / −0 / 0) | $26,510 | 18.34 | $5,410,977 | +$3,131,208 | 29.67% | 31.09% |
| r08 | $500,433 | +$14,226 (+2.9%) | +$14,408 | −$183 | 94 (+0 / −0 / 1) | $26,387 | 18.97 | $5,548,821 | +$3,269,052 | 29.64% | 31.05% |
| r14 | $471,800 | −$14,408 (−3.0%) | −$14,408 | +$0 | 94 (+0 / −0 / 0) | $26,633 | 17.71 | $5,274,360 | +$2,994,591 | 29.70% | 31.12% |
| r18 | $414,944 | −$71,263 (−14.7%) | −$33,619 | −$37,644 | 90 (+2 / −6 / 3) | $26,771 | 15.50 | $4,766,040 | +$2,486,271 | 29.02% | 30.44% |
| f00 | $495,747 | +$9,539 (+2.0%) | +$9,944 | −$405 | 94 (+0 / −0 / 1) | $26,310 | 18.84 | $5,513,978 | +$3,234,209 | 29.64% | 31.03% |
| f02 | $492,173 | +$5,965 (+1.2%) | +$5,965 | +$0 | 94 (+0 / −0 / 0) | $26,390 | 18.65 | $5,475,253 | +$3,195,484 | 29.65% | 31.05% |
| f10 | $476,274 | −$9,934 (−2.0%) | −$9,934 | +$0 | 94 (+0 / −0 / 0) | $26,710 | 17.83 | $5,305,597 | +$3,025,828 | 29.70% | 31.14% |
| f15 | $438,416 | −$47,792 (−9.8%) | −$19,858 | −$27,934 | 92 (+3 / −5 / 1) | $26,910 | 16.29 | $4,917,228 | +$2,637,459 | 29.73% | 31.20% |
| f20 | $428,888 | −$57,320 (−11.8%) | −$29,772 | −$27,547 | 92 (+3 / −5 / 2) | $27,232 | 15.75 | $4,825,477 | +$2,545,708 | 29.75% | 31.26% |
| f30 | $377,741 | −$108,467 (−22.3%) | −$49,571 | −$58,896 | 91 (+4 / −7 / 4) | $30,204 | 12.51 | $4,408,352 | +$2,128,583 | 29.05% | 30.98% |
| f45 | $352,726 | −$133,482 (−27.5%) | −$79,196 | −$54,286 | 90 (+4 / −8 / 5) | $34,651 | 10.18 | $4,195,000 | +$1,915,231 | 29.35% | 31.77% |
| s10 | $479,502 | −$6,705 (−1.4%) | −$6,705 | +$0 | 94 (+0 / −0 / 0) | $26,736 | 17.93 | $5,343,284 | +$3,063,515 | 29.70% | 31.13% |
| s25 | $469,444 | −$16,764 (−3.4%) | −$16,764 | +$0 | 94 (+0 / −0 / 0) | $27,076 | 17.34 | $5,243,307 | +$2,963,538 | 29.74% | 31.19% |
| s50 | $440,192 | −$46,015 (−9.5%) | −$33,527 | −$12,488 | 93 (+1 / −2 / 0) | $27,641 | 15.93 | $4,948,547 | +$2,668,778 | 29.81% | 31.30% |
| s100 | $407,740 | −$78,468 (−16.1%) | −$67,054 | −$11,413 | 92 (+1 / −3 / 0) | $29,051 | 14.04 | $4,656,400 | +$2,376,631 | 29.95% | 31.51% |
| nxo | $487,267 | +$1,059 (+0.2%) | n/a (fill rule) | n/a | 94 (+0 / −0 / 43) | $26,162 | 18.62 | $5,421,868 | +$3,142,099 | 29.62% | 31.04% |
| C1 | $387,521 | −$98,686 (−20.3%) | −$44,181 | −$54,506 | 90 (+4 / −8 / 5) | $27,775 | 13.95 | $4,504,770 | +$2,225,001 | 29.04% | 30.63% |
| C2 | $325,495 | −$160,713 (−33.1%) | −$112,815 | −$47,898 | 91 (+6 / −9 / 8) | $35,917 | 9.06 | $3,995,568 | +$1,715,799 | 30.02% | 32.41% |
| C3 | $285,602 | −$200,606 (−41.3%) | −$146,075 | −$54,531 | 90 (+6 / −10 / 8) | $39,036 | 7.32 | $3,710,818 | +$1,431,049 | 30.93% | 33.29% |

## B5 − B4 under every scenario

| ID | Scenario | B5 − B4 fixed net | B5 − B4 portfolio end equity | B5 − B4 daily % DD |
|---|---|---:|---:|---:|
| base | base: 11%, 5 bps | +$201,963 | +$1,802,493 | −4.98 pp |
| r08 | financing 8% | +$203,549 | +$1,862,723 | −4.97 pp |
| r14 | financing 14% | +$201,306 | +$1,749,549 | −4.99 pp |
| r18 | financing 18% | +$205,757 | +$1,602,266 | −5.05 pp |
| f00 | friction 0 bps/side | +$203,972 | +$1,852,045 | −4.91 pp |
| f02 | friction 2 bps/side | +$203,168 | +$1,832,989 | −4.94 pp |
| f10 | friction 10 bps/side (10 fee, or 5 fee + 5 slippage) | +$200,909 | +$1,759,125 | −5.04 pp |
| f15 | friction 15 bps/side (5 fee + 10 slippage) | +$195,810 | +$1,595,873 | −5.11 pp |
| f20 | friction 20 bps/side (20 fee, or 10 fee + 10 slippage) | +$193,708 | +$1,552,014 | −5.17 pp |
| f30 | friction 30 bps/side (5 fee + 25 slippage) | +$192,222 | +$1,408,630 | −5.36 pp |
| f45 | friction 45 bps/side (20 fee + 25 slippage) | +$185,802 | +$1,302,781 | −5.28 pp |
| s10 | stop overshoot 10 bps | +$200,438 | +$1,769,352 | −5.02 pp |
| s25 | stop overshoot 25 bps | +$198,149 | +$1,720,604 | −5.07 pp |
| s50 | stop overshoot 50 bps | +$201,045 | +$1,639,915 | −5.17 pp |
| s100 | stop overshoot 100 bps | +$192,539 | +$1,491,263 | −5.36 pp |
| nxo | stops fill at the next trade after the trigger minute | +$202,307 | +$1,810,749 | −4.98 pp |
| C1 | combined: 14% + 10 fee + 10 slippage | +$191,900 | +$1,435,449 | −5.24 pp |
| C2 | combined: 18% + 20 fee + 25 slippage | +$181,603 | +$1,213,389 | −4.64 pp |
| C3 | combined: 18% + 20 fee + 25 slippage + 50 bps stop overshoot | +$172,554 | +$1,080,848 | −3.93 pp |

## Break-even thresholds

A break-even is reported only where the measured quantity changes sign between two tested points, interpolated
linearly between them and never extrapolated.

| Curve | Result |
|---|---|
| B4.rate.fixedNet | no sign change in the tested range |
| B4.rate.portfolioIncrementalOverC0 | no sign change in the tested range |
| B4.friction.fixedNet | no sign change in the tested range |
| B4.friction.portfolioIncrementalOverC0 | no sign change in the tested range |
| B5.rate.fixedNet | no sign change in the tested range |
| B5.rate.portfolioIncrementalOverC0 | no sign change in the tested range |
| B5.friction.fixedNet | no sign change in the tested range |
| B5.friction.portfolioIncrementalOverC0 | no sign change in the tested range |
| B5-B4.rate.fixedDifference | no sign change in the tested range |
| B5-B4.rate.portfolioDifference | no sign change in the tested range |
| B5-B4.friction.fixedDifference | no sign change in the tested range |
| B5-B4.friction.portfolioDifference | no sign change in the tested range |

Nothing changes sign in the tested ranges:
- financing 8–18%;
- friction 0–45 bps per side;
- stop overshoot to 100 bps.

So **no break-even exists inside the tested values**, and none is extrapolated.

## Findings

- **Both pools stay profitable under every scenario, and both beat the no-margin core.**
  - The harshest combined case (C3: 18% financing, 45 bps per side, 50 bps stop overshoot) leaves B4 at
    $113,048 (−60.2%) and B5 at $285,602 (−41.3%) of fixed net.
  - Their portfolios still finish +$350,201 and +$1,431,049 above C0.
- **Degradation is non-linear, and path effects are as large as cost effects.**
  - At 18% financing, the same-trade cost is −$29,918 for B4, and the path effect adds
    −$45,139 (lots +1 / −6).
  - At 15 bps per side, the cost is −$15,847 and the path −$25,792.
  - Below about 10 bps and 14%, the path barely moves: at most one exit changes.
  - Above that, marginal trades flip from stop exits to maximum-hold exits, and the changed exit dates reorder later
    entries. Under C3, 5 of B4's matched lots flip, and its maximum-hold exits rise from 27 to 33. In B5, 4 flip, and
    maximum-hold exits rise from 32 to 37.
- **B4 is more cost-sensitive than B5.**
  - C1 (14% + 20 bps) leaves B4 at $195,621 (−31.2%) and B5 at $387,521 (−20.3%).
  - C2 leaves them at $143,892 (−49.4%) and $325,495 (−33.1%).
  - Under C3, net ÷ minute DD changes by −68.4% (B4) and −60.1% (B5).
- **Gate E** (moderate stresses r14, f15, f20, C1): neither pool's fixed net or incremental portfolio wealth goes
  non-positive. The C1 falls (B4 −31%, B5 −20% of fixed net; −23% / −24% net ÷ DD) are under the pre-registered 50%,
  so **no flag** for either pool. The severe scenarios C2 and C3 are not part of gate E, but they show material
  degradation (B4 −49% / −60%).
- **The GDX increment is cost-robust.**
  - B5 − B4 stays between $172,554 and $205,757 of fixed net in every scenario.
  - The portfolio difference never falls below $1,080,848.
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
