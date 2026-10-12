# Adaptive re-entry program — recommendations and final answers

Coordinator deliverable, 2026-10-12. Basis: `COMPARISON.md` (rankings, validation chain, negative
findings) and the stage reports it indexes. Everything remains exploratory research on reused
data; nothing here selects a strategy for deployment, changes production code beyond the verified
Phase 1 configurations, or is committed.

## The twelve final questions

**1. Is a fixed 3% additional decline actually necessary, or is there a better way to set the
minimum acceptable re-entry price?** The 3% magnitude itself proved hard to beat: every adaptive
discount (volatility-, loss-, depth-, time-, count-scaled) either reproduced it, degraded it, or
moved its knife edge elsewhere. What IS better than "fixed 3% off the loss exit, always" is
conditioning on **whether to arm at all**: exempting immaterial price losses (A2_material_05, one
parameter) improved on the 3% rule in-sample on 3 of 4 frozen datasets and on all six fresh
instruments. The anchor question is settled: the loss-EXIT price is the right anchor; entry-price
anchors are economically perverse (they sit above the exit after a loss) and failed
catastrophically (−$118k / DD $182k on QQQ-old, found identically by two independent agents).

**2. Can re-entry spacing adapt to volatility, loss severity, correction depth or elapsed time
without becoming fragile?** Mostly no. Volatility scaling is procyclical (widens exactly at
V-bottoms; recreated the 2020 miss). Loss-proportional severity rebuilds the −5/−8% failures; the
workable direction is the inverse (severe loss ⇒ the market already delivered the discount), but
its 0.5% floor is a knife edge and it failed 2007–09 on four of five covering instruments.
Time/staleness decay (B7_stall) is economically sensible but turned out to be a one-episode
mechanism sitting on a binary parameter cliff. Correction depth helped only as a narrow tolerance
gate (D3). Every adaptive form conserved the knife-edge problem — it relocated the decisive 0.1–2%
gap rather than removing it.

**3. Can the recovery reset be improved so it doesn't become obsolete in prolonged declines?**
Yes — this is the program's clearest positive result. Re-anchoring the reset to the depth of the
correction itself (reset when price retraces 38% of the ref-high→low decline, C6) keeps it
reachable in deep bears, fixed the QQQ-2003 basing failure that no trigger or discount ever
touched (+$15.4k), improved recovery participation to the best level of any validated config, and
sits on a genuine parameter plateau (0.34–0.50; 0.30 is a cliff). Its cost is a small, systematic
false-reset tax in 2022-style grinds on nearly every instrument.

**4. How does removing the reset entirely affect performance?** Catastrophically. C0 deadlocked
for up to 13 years (QQQ) off a single losing exit, 8 years on VGT off a −$2.9k loss (−$153.7k vs
baseline), and eliminated 7–11 of each dataset's ≥$10k winners. Resets are mandatory.

**5. Does excluding financing-only losses preserve important recoveries?** Partially — the
original −$143 intuition was wrong in detail but right in spirit. The famous VGT-2023 block was
armed by a −$1,306 loss at −0.49% price return (a real but immaterial price loss), so pure
financing-only exclusion (A1) does NOT fix it; a −0.5% materiality cutoff does, and financing-only
armings are only 17% of episodes with exactly one major winner blocked outright. The exemption is
two-sided: SPY-2025 shows a financing-only arming that REF profited from (+$16.3k) and the
exemption lost. Net of both sides, the materiality cutoff still improved every fresh instrument.

**6. Can we avoid missing profitable rebounds by 1–2% without reintroducing excessive bear-market
trading?** Only partly, and not by execution tricks. Intraday limit orders are a mirage (7 of 9
named misses never printed intraday; a legitimate limit model is worse on 10 of 12 pairs).
Near-miss tolerance bands and rebound-gated entries bought 2001-style rallies (−$27k to −$65k).
What worked: materiality exemption (2023-class misses stop being armed at all) and the retrace
reset (2003-class basing recovered). The 2020-class V-bottom misses never existed on the 3% path —
they were artifacts of the −5/−8% configurations. Residual truth: some knife edge always remains.

**7. Does remembering previous unsuccessful purchase prices work better than remembering exit
prices?** No — decisively worse (question 1). The exit price is recent, hence below the market,
hence actually spaces re-entries; the entry price licenses re-buying ABOVE the previous failure's
exit. B4's "credit the decline already suffered" variants breached $100k drawdowns on QQQ-old.

**8. Can a correction-aware state machine solve both repeated-loss accumulation and missed
recoveries?** Not better than two quantities. Every added state variable added a failure mode
(stale ladder anchors, cumulative-loss saturation that recreated the −8% rule, mis-dated streaks);
the 2-quantity machine beat every 3+-quantity machine on 3 of 4 datasets. Cumulative correction
loss is the one richer signal with real content (best bear windows), but in the tested functional
form it saturated into D_lower8 exactly where that fails. The best "correction awareness" found
was the C6 reset, which reads the correction's depth without carrying extra trade memory.

**9. Which mechanisms provide benefits beyond simply reducing borrowed exposure?** On the frozen
data: the material-loss trigger and the retrace reset (G8 and legs beat both matched-exposure
controls on both dimensions on QQQ-old by large margins), and B7_stall/C11 nominally top the
matched-control sums — but validation demoted both of those, a textbook selection warning. Out of
design, nothing cleared the matched-exposure baseline consistently: on six fresh instruments even
the best candidates lose to an equally-exposed baseline on most instruments (G8 wins it only on
VOOG and IWM). The honest statement: timing value beyond deleveraging is proven only for the
2000-era QQQ cascade pattern and a handful of replay-verified episodes (SPY-2009, IWM-2008).

**10. Which combinations demonstrate complementary advantages rather than accidental historical
optimization?** One: **G8 = material-loss trigger + 38%-retrace reset**. Its components fix
disjoint failure mechanisms with per-episode attribution (micro-arming exemptions + post-cascade
re-admission), it is the only Phase-2 configuration additive OUT of design (beats both its own
legs on QLD/XLK/IWM; Σ fresh $460k vs legs $356k/$320k), and stage-2 replay found zero
discrepancies. Qualified: its beats-its-legs margin on QQQ-old is a local peak at the
pre-registered retrace 0.38, its −1% cutoff sits one step from a rebuilt 2022 cascade (−0.5%
dominates there), and on SPY the components interfere. Every other combination was redundant
(G6, G2, G5's third wheel), interfering (G3/G5, G7), or outright harmful (G10, G9b).

**11. Is there a simple strategy that materially improves on the existing 3% rule across most
market environments?** Yes, with stated limits: **A2_material_05** — the existing 3% rule, armed
only when the losing trade's price return is ≤ −0.5%. One parameter; improves net over the 3% rule
on 3 of 4 frozen datasets and on 6 of 6 fresh instruments; preserves the 2000–02 protection to
within ~$6k. Limits: it never improves the frozen datasets' drawdowns, its cutoff margin at the
decisive 2022 episode is 0.008pp, and like every variant it does not beat equally-exposed baseline
risk out of sample. G8 is the stronger but more complex improvement (two parameters, bigger gains,
same caveat class plus a sharper cutoff sensitivity).

**12. What remains unresolved before any candidate could reasonably be considered for live margin
trading?** (a) A genuinely out-of-sample test: new eras (post-2026 data as it accrues) and
pre-registered parameters — the six fresh instruments reduce but do not remove reuse bias, and
every candidate was selected on the frozen four. (b) The Finding-1 ceiling: at matched exposure
the whole restriction family usually trails a smaller-size baseline off-design; a live case must
argue why the deployment environment resembles VGT/QQQ 2016–26 rather than QLD/SPY/IWM. (c)
Portfolio-level margin-capacity analysis (required by the brief; never performed — all drawdowns
here are strategy-level dollars, not account equity). (d) Execution realism beyond the same-close
approximation, which Family F showed has been subsidizing results. (e) Knife-edge governance: a
rule for what happens when a decision sits within ~1% of a threshold, since every mechanism
retains at least one such edge. (f) Multiple-testing discipline going forward: 188 configurations
have now touched these datasets; further in-sample iteration has near-zero evidential value.

## Risk-requirement audit (brief §13)

- **Cumulative trading drawdown > $100,000:** 26 config-dataset cells breached, ALL on
  QQQ 1999–2015, none belonging to a recommended candidate (list in `comparison/all_records.csv`;
  worst: B3/E2 DD $182k, min cumulative P&L −$135k). Baseline itself fell below −$100k there.
  A2_material_05's worst DD is $93.7k — under but near the line.
- **Borrowing beyond $100,000:** none (single fixed $100k position by construction; matched
  controls all scaled below $100k).
- **Restricted for years:** C0 (by design of the diagnostic) and the B10_fresh_crash/no-reset
  variants; no recommended candidate exceeds ~1.5 years restricted (longest G8 episode well below
  C0's multi-year locks).
- **Dependence on one exceptional trade:** G4, B7_stall, B7_decay120, C11 (named trades in
  COMPARISON.md §7 and the family reports) — all excluded from recommendation on exactly this
  ground. G8's QQQ-old margin over A2m1 is ~2 episodes; flagged.
- **Loses most recovery participation:** lower8, A4_proportional, C0, B10_ref_high — none
  recommended.
- **Attractive full-period P&L with unacceptable bear losses:** none among the finalists; the
  pattern appeared only in diagnostics (C2/G9b, D1_alt).
- Maximum drawdown is reported in dollars against the $100k allocation throughout; no
  account-equity or portfolio-margin claim is made anywhere in this program.

## Recommended next steps (in order, none executed here)

1. Treat **A2_material_05** as the default improvement hypothesis and **G8's mechanism** as the
   ambitious one; register BOTH with fixed parameters (including the stage-2 observation of
   −0.5% / retrace 0.38–0.42 as the G8 variant to test) BEFORE any new data or instrument is
   examined, then evaluate prospectively (new eras / instruments only).
2. Do the portfolio-level margin-capacity analysis before any live consideration (brief
   requirement; out of scope here).
3. If another historical iteration is ever authorized despite (f) above, spend it on the
   Finding-1 question — why the framework's edge is era/instrument-local — not on new thresholds.
4. Production `allIn.ts` already carries `baseline` and `lower3` verified configurations; no
   further production change is recommended until step 1 produces prospective evidence.
