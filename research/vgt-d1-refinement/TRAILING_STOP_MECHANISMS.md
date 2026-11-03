# Track B: trailing-stop activation designs

Generated inputs: `results/trackB/trackB_summary.md`, `gross_threshold_sweep.csv`, `twoStage_threshold_sweep.csv`,
`trackB_<policy>_full.csv`, `trackB_<policy>_<fold>_training.csv`, `trackB_<policy>_picks.json`,
`trackB_defaults.json` from `npm run d1-refinement -- stop-variants`; the B0 diagnostic in
[D1_BASELINE_AND_DIAGNOSTICS.md](D1_BASELINE_AND_DIAGNOSTICS.md) §3. All runs on frozen D1 (X 21.6 Y 0.3 stop 7.3
hold 8 L 74 buffer 2.9 P 9.0 W 60), 11%, stop fills; only the stop's eligibility rule changes.

## 1. State machines

Common to every design: the level S(t) = H(t) × (1 − 7.3%), H = highest observed price since the fill (fill price,
entry-session close and later minute highs on the entry session; session highs afterwards), both updated once after
each session and never lowered. Exits are only evaluated on sessions that start with the position open. Reaching a
threshold never sells. The maximum-hold loss exit (day ≥ 8 and a loss at the open) and the buffered intraday loss
(from day 8, a completed minute closing at or below −2.9%) are unchanged.

| Design | State | Transition (at the daily update) | Stop eligible on the next session | Level used |
|---|---|---|---|---|
| D1 `net` | none | — | iff shares × S − investment − interest(date) > 0 (re-decided each session) | S |
| `netLatched` | ACTIVE latch | set on the first session the net test holds | once latched, always | S |
| **B-A** `gross` | ACTIVE latch | set once H ≥ entry × (1 + G) | once latched, always; never before | S |
| **B-B** `breakeven` | ACTIVE latch | set once S ≥ entry (equivalently H ≥ entry / (1 − 7.3%) = entry × 1.0787) | once latched, always; never before | S |
| **B-C** `twoStage` | EARLY → ESTABLISHED | ESTABLISHED once S ≥ entry (irreversible) | always | EARLY: entry × (1 − E) fixed; ESTABLISHED: S |
| **B-D** `always` | none | — | always, from the session after the entry | S |

Latching: for B-A, B-B and B-C the condition is monotone (H and S never fall, the entry price is fixed), so the latch
is irreversible by construction and "latched" and "unlatched" variants coincide; the state is still kept explicitly and
tested. Only the `net` rule can switch off (through interest), and `netLatched` is the one design where a latch
changes anything. B-A at G = 7.87% is B-B exactly; at G = 8% (the brief's illustration) the two differ only when the
high lands between 7.87% and 8% above the entry at a daily update.

Fill mechanics in every design: a session opening at or below the active level fills at the open (gap); otherwise the
first minute that opens at or below the level fills at its open, and the first minute whose low reaches it fills at the
level (idealized). B-C's protective stop uses the same mechanics and is labelled `protective stop` / `protective stop
gap`. Unit tests for each transition and boundary are in `src/d1-refinement/tests/mechanisms.test.ts`.

## 2. The designs on D1's trades (predeclared settings)

| Policy | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Interest | Stop never active | Switch-offs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| D1 (net) | $183,044 | $19,331 | $15,611 | 20 | 14/5 | −$3,447 | −$11,003 | $33,362 | 6 | 1 |
| netLatched | $183,044 | $19,331 | $15,611 | 20 | 14/5 | −$3,447 | −$11,003 | $33,362 | 6 | 0 |
| B-A gross 8% | $183,044 | $19,331 | $15,611 | 20 | 14/5 | −$3,447 | −$11,003 | $33,362 | 6 | 0 |
| B-B breakeven | $183,044 | $19,331 | $15,611 | 20 | 14/5 | −$3,447 | −$11,003 | $33,362 | 6 | 0 |
| B-C two-stage E 10% | $173,731 | $24,077 | $20,754 | 20 | 14/5 | −$10,181 | −$10,181 | $33,422 | 6 | 0 |
| B-D always | $165,606 | $22,933 | $18,899 | 24 | 13/10 | −$7,029 | −$7,424 | $33,151 | 0 | 0 |

**netLatched, B-A (8%) and B-B reproduce D1's 20 trades exactly** (20 preserved, 0 altered). The reason is in the
trade list: D1's trailing stop never executed below gross breakeven. Every D1 position either never became eligible
under the net rule (the six maximum-hold losers, whose high never rose enough: H < entry × 1.0787) or became eligible
when S was already above net breakeven, i.e. above the entry; and the one net switch-off (2021-04-05) coincided with
no breach. The three designs therefore change *when* the stop is eligible on paper, but on this history never *whether*
a session's prices reached an eligible level. Sensitivity in G (0.1-point sweep, 196 values, 15 distinct lists): G
≤ 9.4% gives D1's trades or variants within $3k; **G 9.5–10.6% gives $183,873 / $19,331 with 17 entries**: two D1
exits no longer happen because the high had not yet reached 9.5% above the entry when D1's net rule would have been
active. The 2022-10-10 entry is not stopped on 2022-11-03 (+$676) and rides to the 2022-12-15 stop at 331.37 for
+$6,162, absorbing D1's 2022-11-04 trade (+$6,736); the 2025-04-04 entry is not stopped on 2025-04-10 (+$1,252) and is
still open at the end (+$47,900), absorbing D1's 2025-04-11 (−$2,141) and 2025-04-22 (+$46,709) trades. Net +$829,
same drawdown, 15 trades preserved. G ≥ 10.7% loses net steadily (fewer exits are stops, more are hold-day sales).

**B-C** at E 10% alters one trade and the chain after it: the 2020-03-12 entry hits the protective stop at 184.70 on
2020-03-18 for −$10,181 (D1's hold-day exit two sessions later lost −$3,447), a re-entry on 2020-03-19 earns +$6,545
and D1's 2020-03-23 trade (+$9,125) is displaced; net −$9,313, drawdown +$4,746. The E sweep (191 values, 100 distinct
lists) has no value above D1: E ≥ 16.3% never fires (equals D1), E 1–16% costs $1k to $60k (E 1.0%: $123,277,
30 entries). B-C adds an early loss cap D1 does not have, and on this history the cap is only ever hit in March 2020,
where the hold-day rule was already selling.

**B-D** alters four exits and adds four re-entries: 2020-03-12 stopped at the open on 2020-03-16 (−$5,944 vs −$3,447),
followed by two one-day losers (−$2,684, −$1,690) before D1's 2020-03-23 entry; 2022-05-12 stopped on 2022-05-20
(−$943 vs +$2,116); the 2025-04-04 entry gapped out on 2025-04-07 at 451.00 (−$7,029 vs +$1,252) with a −$42
re-entry. Net −$17,438, drawdown +$3,602, 10 losers instead of 5. All six D1 winners ≥ $10,000 are kept by every
design; the always-active stop damages D1 exactly where D1's inactive stop was a feature: the first days of a deep
correction, where a stop 7.3% below a fresh high is hit by the next gap.

## 3. Regimes and interest paths

By regime (`trackB_summary.md` §3) the four latched/gross designs equal D1 everywhere; B-C loses only in 2020
(+$66,570 vs +$75,883); B-D loses in 2020 (+$69,013), 2022 (+$20,880 vs +$23,074) and 2024–2025 (+$37,447 vs
+$45,821). No design trades in 2023.

Interest-rate decision paths (§5): at 8%, 11% and 14% **every policy keeps an identical trade list**; only the expense
changes (D1 $192,142 / $183,044 / $173,945). On D1's trades the net rule's interest dependence never crossed a price,
so none of the alternatives is "more interest-independent" in effect, although B-A, B-B, B-C and B-D are so by
construction for the stop (the hold-day and buffer exits remain net-profit tests in all of them). The 2023
trough-recovery trade of the previous program is the counter-example: there the net rule's interest dependence *was*
the decision, and every alternative sells it in March 2023 (`stop_semantics.md` §5).

## 4. Bounded local refinement

Per policy, threshold × stop width 5.0–10.0% × hold 6–16 with D1's other parameters frozen; the 2-D boxes are the
full 561-cell grid, the 3-D ones 2,048 Sobol points (`trackB_summary.md` §6).

| Policy | Design | Feasible | Max net in the box | Full-run refined pick | Stitched validation of the rule (vs frozen D1 +$146,898) | Folds beating D1 |
|---|---:|---:|---:|---|---:|---:|
| net (control) | 561 | 538 | $183,044 (D1) | stop 7.3 hold 8 (D1) | +$68,895 (3/4 folds picked) | 0/4 |
| netLatched | 561 | 544 | $183,044 | D1 | +$68,895 | 0/4 |
| B-A gross | 2,049 | 1,881 | $183,044 (design), $183,873 refined (G 9.5%) | G 9.5 stop 7.3 hold 8, 17 entries, stability 78% | +$68,895 (balanced), +$65,799 (lowDd) | 0/4 |
| B-B breakeven | 561 | 547 | $183,044 | D1 | +$68,895 | 0/4 |
| B-C two-stage | 2,049 | 1,924 | $183,044 (E 16.3%: never fires) | E 16.3 stop 7.3 hold 8 = D1's trades | +$76,712 (balanced/lowDd, 4/4 folds) | 0/4 |
| B-D always | 561 | 534 | $165,870 | stop 7.3 hold 7 | +$53,302 | 0/4 |

In no policy does any point of the box beat D1's net within the ceiling (one point for B-A, G 9.5%, after
refinement, +$829). The walk-forward of the selection rule is the same story as Track A: the rule chooses D1's
stop/hold on the later folds and something worse on fold 1, and no policy beats frozen D1 on the stitched total.

## 5. Verdict

| Design | Changes D1's history? | Net / DD vs D1 | Robust improvement? | Standing |
|---|---|---|---|---|
| B-A gross threshold | no at G ≤ 9.4%; 17 entries at G 9.5–10.6% | 0 / 0; +$829 / 0 at G 9.5% | no (in-sample band, one changed trade chain) | **retained as an equivalent**: same trades as D1 with an explicit, interest-independent, irreversible activation; worth preferring on clarity grounds alone (see RECOMMENDATIONS.md) |
| B-B gross breakeven | no | 0 / 0 | n/a | equivalent to D1 on this history; the simplest rule (no threshold); same remark |
| B-C two-stage | one 2020 trade chain at E ≤ 16% | −$9,313 / +$4,746 at E 10% | no | rejected: the early cap only fires where the hold-day exit already sells, and sells lower |
| B-D always active | 4 exits + 4 re-entries | −$17,438 / +$3,602 | no | rejected: the first-days-of-a-correction gap risk is exactly what the inactive stop avoided |
| netLatched (diagnostic) | no | 0 / 0 | n/a | shows the latch question is moot on D1's trades |

Answer to question 4 of the brief: none of A/B/C/D improves D1's net or drawdown while preserving its winners, because
D1's winners are already preserved by every design and D1's losers are hold-day exits that no stop variant improves
(B-C and B-D turn them into earlier, larger stop losses). B-A and B-B are *equivalent* formulations of D1's protection
on this history, with a cleaner rule (no dependence of the exit decision on the interest assumption, no switch-off);
they do not make D1 safer where it is unprotected — an unprofitable position still has no stop until the hold day —
and the only design that does (B-D) costs 10% of the net.

Runnable files (parity in [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md)):
`src/app/allIn-trailingBuy-postExitContinuation-stopGrossThreshold.ts` (G 8%),
`…-stopGrossBreakeven.ts`, `…-stopTwoStage.ts` (E 10%), `…-stopAlways.ts`; the original D1 file is unchanged.
