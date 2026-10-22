# Recommendations

## Reproducible observations (not in doubt)

1. **Why Set 2 stayed out of 2023.** Its arming rule measures depth only against a rolling 74-session high.
   After the December 15, 2022 exit that high had decayed to 357.47 (a level made during the trade), the
   deepest 2023 point was 13.0% below it in the December–January trough and 14.1% in the whole year, and the
   21.6% condition was false at every minute until April 2025. No pending order, restriction, warm-up or
   execution detail was involved. A frozen reference from the last rally (391.60) would still have fallen
   0.84 points short; only the previous episode's anchor (467.06) would have armed. This is a general
   correction-memory property of the design: any bear market longer than the window ends up invisible.
2. **It is a trade-off the earlier optimization made, not a bug.** The same decay kept Set 2 out of eleven
   losing 2022 re-entries. Every persistent-reference design tested (L ≥ 183, the anchored latch at a ≥ 70%
   reset) recovers the 2023 trade (+$19k) and pays $25–33k for it in 2022 with a $35,099 drawdown, above the
   ceiling. The user's L 90/183/365 results are reproduced to the dollar.
3. **Lowering X globally, or adding a shallow second path (C), does not help**: the thresholds that reach
   2023 (≤ 12%) carry $46–54k drawdowns; dual mode never dominates Set 2.
4. **Trades2's 2023 participation was marginal three times over**: it needed X 20.0% against an L 104
   reference (0.76 points to spare), a 7.8% stop that survived March 2023 (Set 2's 7.3% does not), and the
   11% interest assumption.
5. **Joint re-optimization of this architecture does not generalize**, with or without a mechanism: every
   family's fold picks lose money in 2022 (third program to find this). No mechanism is credited under the
   pre-registered rule.

## Promising but in-sample

6. **Post-exit continuation (D)** is the one mechanism with a genuine, non-2023 economic effect: after a
   profitable exit, re-enter on a 7–9% pullback within a bounded window. On frozen Set 2 it adds six trades
   in nine years, $32k net at a *lower* drawdown ($183,044 / $19,331 at P 9% / W 60), on a wide plateau
   (P 7–9%, any W ≥ 45; 85–96% neighbourhood stability), with the two 2022 continuation losses bounded by the
   one-per-window and profitable-exit-only rules. In the mechanism-only walk-forward its picks are stable
   (P 6–9%) and the result is neutral to mildly positive (+$16k for the low-drawdown policy, −$8k for the
   max-net policy, over three windows). It does not capture 2023 unless P ≤ 7% (then on 2023-03-13 for
   +$19.5k). This is the only candidate worth running alongside Set 2, and it should be judged as "Set 2 plus
   a known, bounded extra behaviour", not as a validated improvement.
7. **Trough recovery (B)** captures 2023 (+$20,117 from a 2023-01-18 entry at T 17%) at Set 2's drawdown,
   and that is all it does. The parameter is chosen by the one trade (training windows pick an inert
   setting), the neighbours at 15% and 19% give Set 2 ± $1k, and at 8% interest the same trade is stopped out
   in March 2023. Keep the file for inspection; do not run it as if the number meant something.
8. **The combination BD1** ($201,986 / $19,861) is D1 plus B1's one trade. Its attraction is exactly as
   trustworthy as B1's.
9. The jointly optimized phenotypes ($177–202k on the full run) are listed in STRATEGY_COMPARISON.md for
   completeness; their walk-forward is negative like every other joint pick.

## Evidence of generalization

None that survives the facts that 2023 was the inspected problem and 2024–2025 was examined before. The
only out-of-sample-style evidence in the program is the mechanism-only walk-forward, which says: D is
neutral-to-positive and stable, B is inert when chosen honestly, A/E and C are harmful. The 2024–2025
window adds nothing because no mechanism fires there (every finalist's reused net is Set 2's $45,821). No
later minute data exists; the daily files through October 2026 are on an adjusted price basis and were not
used.

## What to do

- **Keep Set 2 as the reference** ($150,630 / $21,183). The missed 2023 recovery is the price of the 2022
  protection, and no bounded memory tested recovers one without the other.
- **If recovery participation is wanted, run the post-exit continuation file** at P 9% / W 60 (D1) or, for
  2023-style participation at a slightly lower net, P 7% / W 60 (D3: $176,943 / $19,705), with the
  understanding that the gain comes from re-entering after profitable exits (2019, 2020), is in-sample, and
  adds about $12.5k of margin interest over the nine years ($33,362 against $20,855). Copy the constants from STRATEGY_COMPARISON.md into
  `src/app/allIn-trailingBuy-postExitContinuation.ts` (they are the shipped defaults) and run
  `npm run app -- allIn-trailingBuy-postExitContinuation VGT`.
- **Do not adopt the trough, latch or dual files as strategies.** They exist so the mechanisms can be
  inspected and re-run; their constants reproduce the tables.
- **Do not re-optimize this architecture jointly again** without a structurally new idea; three programs
  have now shown the 2022 failure of every optimized phenotype.
- If a future study wants to test D properly, the honest test is live or genuinely later minute data,
  because every historical window has now been inspected by one program or another.
