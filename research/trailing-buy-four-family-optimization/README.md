# Four-family trailing-buy optimization (VGT, one-minute bars)

A reproducible multiobjective optimization of the four intraday trailing-buy strategies, with walk-forward
validation and a frozen 2024–2025 holdout. Each family is optimized separately; the strategy files themselves
are unchanged:

1. `src/app/allIn-trailingBuy.ts`: restricted re-entry, original exits
2. `src/app/allIn-trailingBuy-bufferedLoss.ts`: restricted re-entry, buffered intraday loss exit
3. `src/app/allIn-trailingBuy-noReentry.ts`: no re-entry restriction, original exits
4. `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts`: no re-entry restriction, buffered exit

## Read in this order

1. [OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md): the principal deliverable. Executive summary, budget
   actually run, cross-family comparison, pre-declared verdicts, recommendation.
2. [TOP10_TRAILING_BUY.md](TOP10_TRAILING_BUY.md), [TOP10_BUFFERED_LOSS.md](TOP10_BUFFERED_LOSS.md),
   [TOP10_NO_REENTRY.md](TOP10_NO_REENTRY.md), [TOP10_BUFFERED_LOSS_NO_REENTRY.md](TOP10_BUFFERED_LOSS_NO_REENTRY.md):
   the 10 frozen phenotypes per family with every parameter and result.
3. [WALK_FORWARD.md](WALK_FORWARD.md): fold-specific train-then-validate results.
4. [HOLDOUT.md](HOLDOUT.md): the frozen 2024-01-02 → 2025-10-13 evaluation, run once.
5. [ROBUSTNESS.md](ROBUSTNESS.md): `stop` vs `next-open`, 8% / 14% margin, per year (2018, 2020, 2022,
   April 2025), concentration, trade profile, parameter neighbourhoods.
6. [PROTOCOL.md](PROTOCOL.md): everything fixed before the results, plus Amendment 1.
7. [PARITY_AUDIT.md](PARITY_AUDIT.md): engine = strategy files, exactly.
8. [REPRODUCTION.md](REPRODUCTION.md): commands, seeds, hashes and file map.

Code: `src/four-family/` (CLI `npm run four-family -- <command>`), tests in `src/four-family/tests/`.
Machine-readable results: `results/` (see REPRODUCTION.md).

This is an idealized historical simulation on raw minute bars: stop-level fills, no spread, commission or
slippage, $100,000 borrowed per entry at 11% margin interest. It is not a forecast, and it says nothing about
whole-account or margin-call risk.
