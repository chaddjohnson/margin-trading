# Mechanisms

Four distinct, causal ways for a flat strategy to arm without a fresh 21.6% decline from the rolling
74-session high, each implemented behind a flag in `src/recovery-eligibility/engine.ts` and as a runnable file
under `src/app/` (IMPLEMENTATION_AUDIT.md). All of them keep the deep-correction trailing buy intact: one setup
at a time, the deep path has precedence on the same minute, every setup buys on the usual Y rebound from its
trailing low, an exit session never arms, and fills, stops, the maximum hold, the buffered exit, interest and
accounting are file 4's. Nothing looks ahead: every state is updated from completed minutes and session
closes, and the "trough" is always the lowest low *through the previous session*.

## Shared state: the correction episode (A, B, E)

- **Starts** at a deep arming (the 21.6% condition against the rolling high). It records the **anchor high**
  (the rolling reference high at that arming; `anchorPolicy` 0 keeps the highest reference high of the
  episode's deep armings, 1 the latest) and the **trough** (the arming close, then the lowest session low).
- **Refreshes** at every later deep arming (the anchor by the policy, the trough never rises).
- **Ends** when a session close recovers `episodeReset` of the anchor-to-trough decline (`resetPolicy` 0:
  tested at every close; 1: only at closes with no position open), or `episodeExpiry` sessions after its
  last deep arming (bounded retention).
- In the 2022 data the single episode that matters starts 2022-10-10 at anchor 391.60 (the March and May
  episodes, anchored at 467.06 and 429.68, had already ended at the 50% retrace of the August rally in the
  50%-reset configurations, and are refreshed into one long episode in the ≥ 70% ones) and its trough is the
  2022-10-13 intraday low of 291.62.

## A. Persistent correction reference (`latch` at latch depth = X)

While the episode is active and the strategy is flat with no setup, a completed minute closing at or below
anchor × (1 − 21.6%) arms. This is the brief's "retain the defining reference high even after it leaves the
rolling window". Findings (COUNTERFACTUALS.md): with the anchor of the *latest* deep arming (391.60) it never
fires in 2023 (the January low is 20.76% below it); with the *highest* anchor and a reset of ≥ 70% it behaves
exactly like a 365-session lookback ($136,580 / $35,099), because the anchor is then 467.06 throughout 2022.
At a 60% reset it is inert, and a 20.0% latch depth (A1 in STRATEGY_COMPARISON.md) adds the December 28
entry that Set 2's 7.3% stop closes on 2023-03-13 for +$8,177. Set aside: no setting of A both recognizes the
2023 recovery and avoids the 2022 re-entries.

## E. Eligibility latch (`latch` at a shallower depth)

The same state, with the depth test relaxed (0–20%): once a correction has been recognized, eligibility is
latched until the episode ends. Findings: every setting that is not inert re-enters after each 2022 exit
and produces the −$12,022 June 2022 trade and ten further losses ($125,576 / $46,104 at U 10%); the fold-wise
walk-forward (OPTIMIZATION.md section 4) chooses U 0% on two of three folds and loses $17,040 in 2022.
Rejected.

## B. Recovery-from-trough eligibility (`trough`)

While the episode is active and the strategy is flat, a completed minute closing at least `troughRecovery`
above the trough through the previous session (and, if `troughRetrace` > 0, at least that fraction of the
decline back) arms, **once per trough**: another trough arming needs a lower trough first. This is the
brief's "remember the correction trough and permit a recovery entry after an objectively defined upward
movement from it". Findings: a 5–10% rise from 291.62 fires on 2022-12-16 (the first flat session after the
exit), the entry is stopped out by the 8-day hold at −$4,047, and the one-shot rule then blocks the window.
A 17.0% rise fires on 2023-01-18 (341.34) and that single trade earns +$20,117 to 2023-08-08; 15.0% fires on
2023-01-12 and is stopped in March for −$1,280. The whole benefit is one trade and the parameter that
produces it is chosen by that trade (the fold trained to 2022 picks T 1.0%, which is inert; OPTIMIZATION.md
section 4). The depth-scaled variant (`troughRetrace`) adds nothing the plain percentage does not. Retained
as an in-sample trade-off only.

## C. Dual-mode entry (`dual`)

A second arming level X2 < X with its own rebound Y2; a shallow setup reaching the X level is re-armed as a
deep one at that close so the deep path is unchanged. Findings: with Y2 = Y it *is* "lower X globally" (the
shallow path always arms first on the way down), and with a larger Y2 it is a worse version of it: no lattice
point dominates Set 2, the best 2023-participating point ($140,992 / $30,468) is below Set 2 on both axes,
and the joint search's best dual phenotype is a Set 2 clone with X2 ≥ 19%. Rejected; the control table in
COUNTERFACTUALS.md shows the global-X control alongside every dual row.

## D. Post-exit continuation (`postExit`)

A profitable exit opens a window of `continuationWindow` sessions. The window tracks the post-exit high
(the exit price, then the later session highs); while it is open and the strategy is flat, a completed
minute closing at or below that high × (1 − `pullback`) arms a trailing buy. One arming per window; any
arming or the window's end closes it; a losing exit opens nothing, so the mechanism cannot chain losses, and a
chain of profitable exits can continue. This is the brief's "after a profitable exit, allow later
participation if the market resumes after a meaningful pullback". Findings: at a 9% pullback it adds six
trades to Set 2 over nine years (+$32,414 net of interest; the 2019-08-05 and 2020-10-28 re-entries after
the May 2019 and September 2020 exits are the large ones), lowers the minute drawdown to $19,331 and never
trades the 2023 window (the December 2022 pullback from 331.37 reached 6.2%, and the 7% setting that does
catch it enters on 2023-03-13); its fold-wise picks are positive in 2020–2021 and slightly negative in 2022.
It is the only mechanism whose gain does not come from the 2023 trade it was asked about, and the only one
whose walk-forward is not negative; it is still not credited (OPTIMIZATION.md section 3).

## Independent alternative considered (section 3E of the brief)

The eligibility latch (E) *is* the "correction-episode eligibility latch that survives rolling-high decay
until a well-defined reset" the brief suggested, and D is the "short-lived post-exit continuation window
keyed to observed market structure". Two further ideas were examined on the traces and set aside without a
search: (i) resetting the episode only at flat closes (`resetPolicy` 1) changes which bear-market rallies end
an episode but not the 2022 whipsaw problem (COUNTERFACTUALS.md, Amendment 1 rows); (ii) arming on a
fraction of the anchor-to-trough decline instead of a percentage above the trough (`troughRetrace`) selects
the same January 2023 minute with a different number and is therefore redundant with B. The structurally
different idea that does help, D, keys on the strategy's own exits rather than on the correction, which is
why it is not tied to the 2023 event.
