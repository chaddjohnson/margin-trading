# Protocol: VGT trailing-buy strategy variants

Written on 2026-10-20 before any optimization or validation result of this program existed. The only
strategy results seen before writing it are (a) the reproduction of the attached `trades2.txt` log with the
checked-in `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` (section 2) and (b) the previous program's
reports in `research/trailing-buy-four-family-optimization/`, which this program extends. Later changes are
added as dated amendments at the end; nothing above an amendment is edited.

Code: `src/trailing-buy-variants/` (CLI `npm run trailing-buy-variants -- <command>`). Results: `results/`
next to this file. Branch `research/trailing-buy-four-family-optimization`.

## 1. Architectures

### 1.1 The four existing architectures (sources of truth, never modified by this program)

| # | Family key | File | Flags |
|---|---|---|---|
| 1 | `trailingBuy` | `src/app/allIn-trailingBuy.ts` | restricted re-entry, original exits |
| 2 | `bufferedLoss` | `src/app/allIn-trailingBuy-bufferedLoss.ts` | restricted re-entry, buffered intraday loss exit |
| 3 | `noReentry` | `src/app/allIn-trailingBuy-noReentry.ts` | no restriction, original exits |
| 4 | `bufferedLossNoReentry` | `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` | no restriction, buffered exit |

File 4's checked-in constants are the Trades2 phenotype (commit `f15f6b2`): X 20%, Y 0.5%, stop 7.8%, hold 11
days, L 104, buffer 0.2%. Files 1–3 keep 10% / 3–4% / 8% / 15 / 90. The previous program's parity audit
(156/156 + 8/8 cases, differences 0) established that `src/four-family/engine.ts` + `accounting.ts` reproduce
all four files exactly. This program's engine (`src/trailing-buy-variants/engine.ts`) is that engine plus
optional mechanisms; a test asserts that with every mechanism off it returns the identical trade list and
accounting to the four-family engine on the real data (random lattice vectors, all four families) and on the
synthetic scenarios. Note: commit `f15f6b2` changed literals that the four-family copy generator matches
(`const tickWindowSize = 90;` etc. in file 4), so the four-family test suite's copy-based tests now fail on
that file. This program's own copy generator matches constants by pattern, not literal.

### 1.2 New mechanisms (Workstream B), each a separate engine flag with its own parameters

Every mechanism is layered on an unrestricted base: base 4 (buffered) and base 3 (unbuffered). The
restriction (families 1, 2) is itself a re-entry mechanism and is not combined with the new ones in the first
pass. Mechanism families are named `<mechanism>` (base 4) and `<mechanism>Unbuffered` (base 3).

1. **`invalidation`: failed-recovery invalidation exit.** At the fill, the trade records the setup's trailing
   low at the rebound signal (`trailingLow`). On every later session that starts with the position open, the
   first completed minute whose close is at or below `trailingLow × (1 − invalidationBuffer)` sells at the next
   eligible trade (exactly the buffered exit's fill rule: next minute's opening trade, the closing print only
   for a decision before the close, else the next session's opening trade). Precedence: a gap through an
   active stop at the open, a pending sale from an earlier session, and a due maximum hold come first; within
   the session the stop wins if it triggers in the signal minute or earlier, or at the opening trade of the
   next minute. If both the invalidation and the buffered signal occur, the earlier minute decides; on the
   same minute the invalidation is the reason. The level never changes after the fill.
2. **`episodeBudget`: correction-episode cumulative-loss budget.** An episode starts at the first setup
   activation while no episode is active; its reference high is that setup's frozen reference high `H`. Its
   low `low` is the lowest session close from the activation session on (updated at each session end). The
   episode's net is the sum of the realized net profits (after interest) of trades closed while it is active.
   When that sum is at or below `−episodeLossBudget × $100,000`, the episode is exhausted: no setup arms. At a
   session end with no position open, if the close is at or above `low + episodeResetRetrace × (H − low)`, the
   episode ends (exhausted or not); the next activation starts a new one. An armed or pending setup is never
   cancelled by a reset. Nothing else about entries or exits changes.
3. **`depthRebound`: correction-depth-adjusted rebound.** While armed, each completed minute first lowers the
   trailing low as before; the depth is `1 − trailingLow / referenceHigh` (the setup's frozen reference high).
   The rebound threshold is `Y + reboundDepthSlope × max(0, depth − X)`, so the buy trigger is
   `trailingLow × (1 + that)`. With a slope of 0 the family is its base.
4. **`staged`: progressive position deployment.** The rebound buys `initialFraction × $100,000` (the first leg).
   From the next completed minute after the fill, the first completed minute whose close is at or above
   `firstLegPrice × (1 + addTrigger)` adds the remaining `$100,000 − first leg` at the next eligible trade (the
   entry fill rule; an order without a later trade waits for the next session's opening trade). There is at most
   one add per trade, never more than $100,000 in total. Exit decisions in a session use the legs held at the
   session's start (the stop level is price-based and unchanged; stop activation, the maximum hold and the
   buffered threshold use the total shares, investment and interest of those legs). If an exit fills in the same
   session as the add, the add is cancelled when its fill would come at or after the exit's; otherwise the add
   fills and is sold with the position at the exit. Interest accrues per leg from its own entry session's date
   (none on that date). Reported with exposure-normalized figures and a risk-matched control (section 8).
5. **`progressHold`: progress-based hold extension.** Before a session, if the post-entry high through the
   previous session (the same high that sets the stop) is at or above `entryPrice × (1 + progressThreshold)`,
   the effective maximum hold for that session is `maximumHoldDays + holdExtensionDays`; otherwise it is
   `maximumHoldDays`. The maximum-hold exit and the buffered exit's day gate both use the effective hold.
6. **`persistence`: rebound-persistence confirmation.** While armed, a rebound is confirmed only after
   `confirmMinutes` consecutive completed minutes (bars present in the data) each closing at or above the
   current trigger; a minute closing below the trigger resets the count. The count carries across sessions with
   the setup. `confirmMinutes = 1` is the base.

Combinations are only built after the single-mechanism results, and only for mechanisms whose single-mechanism
results pass the credit rule or come close on at least two of the four out-of-sample windows (section 7);
any combination run is reported as a dated amendment.

## 2. Reference phenotype (Trades2) and reconciliation

`trades2.txt` was reproduced exactly by running file 4 at its checked-in constants on
`data/VGT/VGT-2016-2025-1-minute.csv` (809,490 rows, sha256 `600322af…24c7962f`, 2016-01-04 → 2025-10-13):
17 closed trades + 1 open, realized $111,329, unrealized $42,885 after $5,395 accrued interest, total
$154,213, interest $29,142, daily drawdown $23,010, minute drawdown $27,408. The total includes the open
position marked at the 2025-10-13 close net of accrued interest. Trades2 is the previous program's frozen pick
`4-81aca36069` (development $112,050 + holdout $42,164 = $154,214, rounding), so **it was selected on the
development data and already evaluated on the 2024–2025 window; it is a candidate reference, not an
independent baseline**. Comparators in every table: Trades2 (file 4 at its constants), each family's file
defaults at Y 3% and Y 4%, and `allIn.ts` (immediate entry) at its constants.

## 3. Data, execution and accounting (fixed)

Unchanged from the previous program (its PROTOCOL.md sections 2 and 4): raw Alpaca one-minute bars, regular
session plus the closing print, nothing repaired; $100,000 per entry (less for `staged` first legs, never
more in total), 11% simple annual interest by calendar day from the entry session's date, primary stop fill
`stop` (idealized: the bars only show that trading crossed the level), `next-open` as a sensitivity, no
spread, commission, slippage or dividends. Drawdowns are of the strategy's cumulative mark-to-market P&L on a
$100,000 allocation, minute-sampled (primary) and daily. Common first eligible session 2016-09-20 (index 180)
for every candidate and comparator.

## 4. Parameter space (one-decimal percentages, whole days, whole sessions, whole minutes)

| Parameter | Short | Domain | Step | Families |
|---|---|---|---|---|
| `targetPercentChange` | X | 5.0%–30.0% | 0.1 | all |
| `trailingBuyPercentage` | Y | 0.1%–8.0% | 0.1 | all |
| `trailingStopPercentage` | stop | 3.0%–15.0% | 0.1 | all |
| `maximumHoldDays` | hold | 3–40 days | 1 | all |
| `tickWindowSize` | L | 45–180 sessions | 1 | all |
| `materialLossThreshold` | mat | 0.5%–3.0% | 0.1 | 1, 2 |
| `lowerPriceReentry` | lower | 0.0%–6.0% | 0.1 | 1, 2 |
| `retraceFraction` | reset | 20.0%–70.0% | 0.1 | 1, 2 |
| `intradayLossBuffer` | buffer | 0.0%–3.0% | 0.1 | buffered families |
| `invalidationBuffer` | inv | 0.0%–6.0% | 0.1 | invalidation |
| `episodeLossBudget` | budget | 1.0%–20.0% of $100,000 | 0.1 | episodeBudget |
| `episodeResetRetrace` | epReset | 20.0%–80.0% | 0.1 | episodeBudget |
| `reboundDepthSlope` | slope | 0.0%–50.0% (rebound per unit of extra depth) | 0.1 | depthRebound |
| `initialFraction` | first | 10%–90% of $100,000 | 5 | staged |
| `addTrigger` | add | 0.5%–10.0% above the first leg | 0.1 | staged |
| `progressThreshold` | progress | 0.5%–10.0% above entry | 0.1 | progressHold |
| `holdExtensionDays` | extend | 1–45 days | 1 | progressHold |
| `confirmMinutes` | confirm | 2–30 minutes | 1 | persistence |

The domains are wider than the previous program's (X 7–20%, Y 0.5–8%, stop 4–12%, hold 5–30) because its
optima sat on those boundaries. `initialFraction` uses 5-point steps (a finer grid is meaningless for a
position size; this is the one declared exception to 0.1-point percentage steps). Every value reaches the
engine as `integer / 1000` (or `/ 100` for `initialFraction`), the same double as a source literal.

**Anchors** in every search: the base family's file defaults at Y 3% and Y 4%, and the Trades2 phenotype (with
the restriction defaults for families 1–2). Mechanism families use mechanism defaults on those anchors:
inv 2.0%, budget 8.0% / epReset 50.0%, slope 10.0%, first 50% / add 2.0%, progress 3.0% / extend 10, confirm 3.

## 5. Chronology, objectives and constraints

Same fits as the previous program: fold 1 trains 2016-09-20 → 2019-12-31 and validates 2020-01-02 →
2021-12-31; fold 2 trains → 2021-12-31, validates 2022; fold 3 trains → 2022-12-30, validates 2023; the final
development fit trains 2016-09-20 → 2023-12-29. The evaluation window **2024-01-02 → 2025-10-13 is reused**
from the previous program (its picks, including Trades2, were already evaluated on it; prominent 2025 trades
were inspected in earlier research). It is labelled *previously inspected / reused* everywhere and is never
called independent. Primary research decisions (which mechanisms are credited, which combinations are built)
use the three walk-forward windows only; the reused window is reported for every finalist once, after the
freeze, and does not change any selection.

Objectives on the training window (`stop` fills, 11%): maximize net profit after interest (realized plus the
open position marked at the training end) and minimize the maximum minute-sampled drawdown. Constraint: at
least one entry per calendar year of training (constrained domination). **Drawdown ceiling: a candidate whose
training minute drawdown exceeds $35,000 is ineligible for selection**; above-ceiling candidates are counted and
their best net reported for diagnostics only. The ceiling is re-checked on the full 2016-09-20 → 2025-10-13 run
of every finalist, and finalists above it there are shown separately as not accepted.

## 6. Search and selection (per family, per fit; identical for every family)

4,096 unique scrambled-Sobol lattice points plus the anchors, then two NSGA-II runs (population 128, 60
generations × 128 offspring, SBX p 0.9 η 15, polynomial mutation η 20, p 1/dimensions) seeded from
`deriveSeed('trailing-buy-variants', 'sobol' | 'nsga', fit, family[, seed])`. Selection follows the previous
program's Amendment-1 rule unchanged (exact-phenotype de-duplication; behaviour-cluster pool of up to 100
leaders by held-session Jaccard ≥ 0.8; one-parameter neighbourhood probes; robust net = 25th percentile,
robust drawdown = 75th percentile; fragile/moderate/stable; 10 picks: 3 profit, 3 balanced, 2 low-DD, 2
Pareto-diverse, no behavioural clones), with the $35,000 ceiling added to eligibility. Every mechanism family
gets exactly the same budget as every base family; nothing is pruned before its full search on all four fits.

**Trades2-anchored sweeps** (cheap, pre-declared, for attribution rather than selection): each mechanism's own
parameters are swept over their full domain (every 0.1 point for one-parameter mechanisms; a coarse grid for
two-parameter ones) with the other parameters fixed at the Trades2 phenotype, on each fold's training window
and on the final development window, and the sweep's training-best value is evaluated on that fold's
validation window. This isolates the mechanism's effect at the reference phenotype.

## 7. Credit rule (pre-declared, as in the previous program)

A mechanism is credited with a repeatable out-of-sample advantage over its base family only if, on the same
base (4 vs 4-with-mechanism, 3 vs 3-with-mechanism), both hold:
- it wins on net profit in at least 3 of the 4 out-of-sample windows (2020–21, 2022, 2023 walk-forward, and
  the reused 2024–25 window) for the median of its 10 picks **and** for the stitched balanced #1 policy;
- its total out-of-sample net is higher, with the worst out-of-sample minute drawdown not more than 25% above
  the base's.

Walk-forward windows carry the decision weight: a mechanism winning 3 of 3 walk-forward windows but not the
reused one is reported as "credited on walk-forward, not confirmed on the reused window", never as credited.
Trades2-anchored sweeps are reported alongside but do not credit a mechanism by themselves.

## 8. Reporting

For every finalist: gross profit, interest, realized net, open-position mark, total net, minute and daily
drawdown, worst trade, worst episode (consecutive losses between profitable exits), trade count, win/loss,
time in market, exposure days, profit per exposure day, net / max drawdown, and the number of distinct
profitable recovery events (profitable trades separated by at least 60 sessions). For `staged`: capital-days,
mean deployed fraction, net per $100,000-year of capital, and the risk-matched control: the base family at the
same parameters scaled to the same mean deployed fraction (every decision in the base scales with the
investment, so the control is exact). Trade-level attribution against Trades2 for every finalist: winners
preserved, winners diminished or missed, losses avoided, losses reduced, new trades, exposure days and interest.
Negative results are reported in full; above-ceiling candidates separately.

## 9. Runnable code

Each mechanism retained after validation (credited, or presented in the shortlist) gets a runnable strategy
file `src/app/allIn-trailingBuy-<mechanism>.ts` derived from file 4, with the mechanism's parameters as named,
editable constants next to the existing ones, verified against the engine by parity on the real data at
several phenotypes and on synthetic scenarios. No preset files; phenotypes live in the reports.

## Amendment 1 (2026-10-20, after the walk-forward validation of the single mechanisms, before any freeze or reused-window result)

**Observation (walk-forward only).** No single mechanism passed the credit rule (section 7) on the three
walk-forward windows: every family's median-of-10 and balanced #1 policies lost money over 2020–2023, as did
the four base families' optimized policies. On the median measure, `invalidation`, `depthRebound` and `staged`
(all on base 4) each won 2 of the 3 walk-forward windows against base 4, with a smaller total loss; no other
mechanism won more than 1. The Trades2-anchored sweeps found no setting of any mechanism that beat the
Trades2 base by more than about $1,000 on any validation window.

**Combinations built (section 1.2's rule: "pass the credit rule or come close on at least two of the four
out-of-sample windows").** Two combination families on base 4, registered in `results/combinations.json`
and given exactly the same search budget, selection rule and validation as every other family:
- `invalidationDepth` (#17): invalidation + depthRebound;
- `invalidationStaged` (#18): invalidation + staged.

They are evaluated on the reused window together with the single-mechanism and base families in the one
frozen evaluation. No single-mechanism result, pick or rule was changed. The reused window had not been
evaluated for anything when this amendment was written.
