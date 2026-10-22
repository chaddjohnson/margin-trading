# Track C: trailing buys without a required initial dip

Generated inputs: `results/trackC/trackC_summary.md`, `c1_grid.csv`, `c2_grid.csv`, `c1_best_*`, `c1_literal_*`,
`c2_best_*` (full-run and training CSVs, `_picks.json`), `c3_grid.json`, `grid_fronts.json` from
`npm run d1-refinement -- no-dip`; `results/finalists/finalists.md` for the retained phenotypes. All runs from
2017-06-15, $100,000 per entry, 11%, stop fills, D1's exit set and accounting (stop active only while a fill at the
stop nets a profit; hold-day loss exit; buffered loss). D1 for comparison: $183,044 / $19,331, 20 entries, 36%
exposure, $33,362 interest.

## 1. Specifications

**C1, always-armed** (engine entry mode `always`; file `src/app/allIn-trailingBuy-alwaysArmed.ts`). When the strategy
is flat with no setup, the first completed minute of the first eligible session arms a setup at that minute's close
(the trailing low starts there, not at the minute's low). Each later completed minute lowers the trailing low to its
own low; the first completed minute closing at or above trailing low × (1 + Ya) sends the buy, filled at the next
observed trade as in D1 (next minute's open, the closing print for a decision before the close, else the next
session's opening trade). The low never resets while armed: it is the lowest low since arming. After an exit the
strategy re-arms on the first minute of the **next** session (an exit session never arms or buys, as in file 4); no
same-session re-entry. There is no stale all-time minimum: the low is the low since the last arming. The consequence
is the opposite failure the brief warned about: in a rising market the first minute's close is the low and the buy
comes as soon as a close is Ya above it, so C1 is "always long, re-entering Ya above the post-exit low".

**C2, swing** (entry mode `swing`; file `src/app/allIn-trailingBuy-swingLow.ts`). Rolling low RL(s) = the lowest
session low of the previous K sessions, never including session s (computed like the strategy files' reference high,
so it is known before the open). When flat with no setup, a completed minute closing at or below RL(s) × (1 + Z) arms
at that close (Z 0: at or below the rolling low itself); the rebound Ys from the trailing low buys as above. The
candidate low is confirmed by the rebound, not by any later bar: arming uses the previous sessions' lows and the
current minute's close, buying uses the trailing low of completed minutes. No decline from a high is tested. A
session whose lowest close is above RL × (1 + Z) is skipped.

**C3, D1 plus an independent path** (entry modes `deepAlways`, `deepSwing`, with the continuation window). While
flat with no setup, a completed minute is tested for D1's deep condition, then D1's continuation condition, then the
extra path; the first that holds arms. An armed always/swing setup is **re-armed as a deep or continuation setup on the
minute D1's condition holds** (the same close, trailing low and rebound as D1 alone would have had), and an
always/swing arming does **not** close the continuation window. Hence D1's arming decisions are reproduced exactly
whenever the strategy is flat, asserted by test; the extra path can displace a D1 trade only by holding the position
when D1 would have armed, and such displacements are counted as "lost" D1 trades.

## 2. Standalone grids (D1's exit set, buffer 2.9%)

**C1**, 234 cells (Ya × stop × hold): **10 within the $35,000 ceiling, none beats D1**. The literal design (Ya 0.3%,
stop 7.3%, hold 8) earns $124,346 with a **$54,137** drawdown, 80 entries (26 winners, 53 losers), 96% of sessions
invested, $88,181 of interest on $212,527 gross. Every Ya from 0.3% to 15% breaches the ceiling at most exit settings;
the feasible cells are Ya 1.0% / stop 6% / hold 8 ($126,378 / $34,878, 95 entries, 36/58), Ya 5–6% / stop 7.3–8% /
hold 30 ($106–121k / $34.4–34.7k, 31–34 entries) and Ya 15% / stop 5% / hold 8 ($5,682). The best feasible hold-15 cell loses money (−$9,587: positions are sold into the recovery); hold 30 lets more
positions recover but holds through the 2020 and 2022 declines.

**C2**, 1,134 cells (K × Ys × Z × stop × hold): **204 within the ceiling, none beats D1**. The literal design (K 20,
Ys 0.3%, Z 0, stop 7.3%, hold 8) **loses** $23,903 with a $59,426 drawdown (50 entries, 17/33). The frontier is K 5
with Ys 0.5–2% at stop 7.3% / hold 8 ($147–149k, $32.5–33.6k, 59–67 entries, 22 winners against 36–44 losers, 82–91%
invested, $75–83k interest) and, at lower drawdown, K 30 / Ys 0.5–1% / stop 5% ($74–80k, $24.6–27.4k, 46–47 entries,
20–23 winners vs 24–26 losers) and K 120 / Ys 1% / stop 5% ($23,537 / $21,082, 18 entries, 7% invested). Longer
lookbacks (K 60–120) arm rarely and win rarely: a new 3–6-month low on VGT is usually followed by a lower one.

Where the money comes from: the C1 and C2 cells that approach D1's net are invested 82–95% of the time (D1: 36%),
pay $75–88k of interest (D1: $33k) and lose more trades than they win. Their net is a consequence of being long VGT
through 2017–2021 and 2023–2025, not of entry quality; their 2022 is a string of losses (−$13.9k to −$22k, 12–17
losers) and their drawdowns sit at the ceiling.

## 3. Bounded local refinement and walk-forward

Anchored (in-sample) at each design's best feasible grid cell and at the literal C1 design; 2,048 Sobol points over
the mechanism's parameters and the exit set; selection policies and the walk-forward as in Track A.

| Study | Full-run max in the box | Refined pick (policy) | Net / DD / entries | Stability | Stitched validation of the rule (frozen D1 +$146,898) | Folds beating D1 |
|---|---:|---|---|---:|---:|---:|
| C1 best cell (Ya 1%, stop 6%, hold 8) | $142,869 (no point beats D1) | Ya 0.7 stop 5.6 hold 8 buffer 1.9 (maxNet) | $146,284 / $33,415 / 99 | 25% | +$43,173 (maxNet), +$11,849 (balanced), +$52,592 (lowDd) | 1/4 at most |
| C1 literal (Ya 0.3%) | $139,257 | Ya 10.3 stop 7.3 hold 9 buffer 1.6 (balanced) | $102,180 / $26,733 / 32 | 50% | +$9,639 to +$19,892 | 1/4 |
| C2 best cell (K 5, Ys 0.5%, Z 1%) | $158,452 | K 5 Ys 0.7 Z 0.6 stop 7.3 hold 8 buffer 2.9 (maxNet); K 55 Ys 0.6 Z 0 stop 4.0 hold 26 buffer 0.4 (balanced) | $167,203 / $32,054 / 67; $114,478 / $16,706 / 32 | 26%; 88% | +$31,355 (maxNet), −$1,051 (balanced), −$24,062 (lowDd) | 1/4 at most |

No point of any box beats D1 within the ceiling. The in-sample refinements add $20–30k of net to the grid anchors but
sit at 25–50% neighbourhood stability (one-parameter probes range from $31k to $167k and breach the ceiling at up to
$62k), and the selection rule walked forward earns a quarter to a third of frozen D1 with worst validation drawdowns
of $43–60k. The one no-dip phenotype with a D1-like risk profile is the C2 **balanced** refinement, K 55 / Ys 0.6% /
Z 0 / stop 4.0% / hold 26 / buffer 0.4%: $114,478 / **$16,706** (lower than D1's), 32 entries, 26 winners against 6
losers, 21% invested, $19,258 interest, 88% stability, and positive in every validation window (+$39,554, +$12,358,
+$18,475, +$16,447, stitched +$86,835). It is a different animal from D1 (a 4% stop, 20-day average hold, buys at
quarter-year lows) and earns 63% of D1's net; it is retained as a low-drawdown alternative architecture, in-sample.

## 4. C3: D1 plus an extra path

27 settings on frozen D1 (`trackC_summary.md` §3). Adding the always path (Ya 1–15%) keeps D1's 20 trades only from
Ya 10% up (below that the always position holds through D1's arming minutes: 1–12 D1 trades displaced, the 2019-08-05
winner among them at Ya 8%); at Ya 10% it adds 21 trades netting −$448 (6 winners, 15 losers), drawdown
$23,967, 62% invested — equal net, worse everything else. At Ya 15% it adds 14 trades for −$9,667. The swing path at
K 20–60 displaces 5–13 D1 trades (−$26k to −$102k of D1 net) and replaces them with 18–52 trades of its own; at K 120
it displaces 5 D1 trades (−$32,117, including the 2018-12-21 winner) for +$13,755 of its own. **No C3 setting beats D1
on net, and every setting raises the drawdown** ($23.8k–$62k).

Arbitration check: the upgrades counter shows how often an armed extra setup yielded to D1's paths on the minute D1
would have armed (16 at Ya 10%, 0–7 for swing); the "lost" D1 trades are all displacements by an open extra position,
never by an arming conflict (asserted by the C3 test on synthetic data and by the preserved-trade counts here).

## 5. Verdict (questions 5 and 6 of the brief)

Removing the initial-dip requirement does not produce a higher-quality, more frequent strategy after 11% interest. It
produces many low-quality entries: 59–99 trades with 36–58 losers for the designs that approach D1's net, bought
mainly by being invested 80–95% of the time at $75–88k of interest, with drawdowns at the ceiling and 2022 as a
string of losses. The brief's prior (shallow-X controls at 5–10% were worse) is confirmed for a structurally different
architecture, after targeted and local tuning, not only at naive defaults. The one retained alternative, the C2
balanced phenotype, buys quarter-year lows with a tight stop and earns 63% of D1's net at 86% of its drawdown; it
is an in-sample pick with a plausible mechanism, not a validated edge.

Runnable files, shipped at the balanced refinements for inspection (parity in
[IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md)): `src/app/allIn-trailingBuy-alwaysArmed.ts` (Ya 10.3%, stop
7.3%, hold 9, buffer 1.6%: $102,180 / $26,733) and `src/app/allIn-trailingBuy-swingLow.ts` (K 55, Ys 0.6%, Z 0,
stop 4.0%, hold 26, buffer 0.4%: $114,478 / $16,706). No C3 file was generated: no C3 setting earned one.
