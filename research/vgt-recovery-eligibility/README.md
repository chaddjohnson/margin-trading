# VGT trailing-buy recovery eligibility

A diagnosis, mechanism study and implementation program (2026-10-21) on one structural weakness of the
Set 2 phenotype of `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` (X 21.6%, Y 0.3%, stop 7.3%, hold
8, L 74, buffer 2.9%; $150,630 net, $21,183 minute-sampled drawdown, 13 closed trades plus one open on
2016-01-04 → 2025-10-13 minute data): it captured the deep corrections of 2018, 2020, 2022 and 2025 and
stayed out of the whole 2023 recovery.

Read in this order:

1. [ROOT_CAUSE.md](ROOT_CAUSE.md) — the reproduced state trace, the rolling high's decay, the closest
   approach to the arming level (13.0% against 21.6%), and why `allIn.ts` entered on 2023-01-04.
2. [LOOKBACK_CONTROLS.md](LOOKBACK_CONTROLS.md) — L 74/90/183/365 reproduced (the user's runs confirmed),
   why long lookbacks lose money (the 2022 re-entry sequence), and the X-only control.
3. [MECHANISMS.md](MECHANISMS.md) — the four causal mechanisms (A/E episode latch, B trough recovery, C dual
   mode, D post-exit continuation), assumptions and failure modes.
4. [COUNTERFACTUALS.md](COUNTERFACTUALS.md) — one change at a time on frozen Set 2, with per-episode attribution.
5. [OPTIMIZATION.md](OPTIMIZATION.md) — targeted sweeps, the joint Sobol + NSGA-II search (28 stages,
   515,155 evaluations), walk-forward, the credit rule, the mechanism-only walk-forward, sensitivity.
6. [STRATEGY_COMPARISON.md](STRATEGY_COMPARISON.md) — finalists, frontier, recovery-by-recovery attribution,
   fill and interest sensitivity, verdict by architecture.
7. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — files, commands, parity (510/510), tests, repository state.
8. [RECOMMENDATIONS.md](RECOMMENDATIONS.md) — what is reproducible, what is in-sample, what to do.

[PROTOCOL.md](PROTOCOL.md) is the pre-registration. Generated outputs live under `results/` (diagnostics,
sweeps CSV, search stage summaries, validation rows, finalists, tables, parity); the large search
checkpoints and the sweep JSON are git-ignored.

## Verdict in six lines

- The 2023 miss is explained exactly: the rolling 74-session high forgets a long correction's peak, so after
  the December 2022 exit the market was never more than 14% below the reference. Not a bug; the same decay
  avoided eleven losing 2022 re-entries.
- Every persistent-reference design (long L, anchored latch) buys the 2023 trade with the 2022 losses and a
  $35,099 drawdown. Lowering X or adding a shallow path is worse still.
- No mechanism is credited under the pre-registered walk-forward rule; joint re-optimization loses 2022 in
  every family, as in the two previous programs.
- Post-exit continuation (D: re-enter on a 7–9% pullback within a bounded window after a profitable exit) is
  the one mechanism with a real, bounded, non-2023 effect: $183,044 / $19,331 in-sample on frozen Set 2, a
  wide plateau, neutral-to-positive in the mechanism-only walk-forward. It is an option, not a validated edge.
- Trough recovery (B) captures 2023 with a single trade (+$20,117) whose parameter, stop survival and
  interest assumption all have to line up; it is a single-event fit.
- Five runnable files exist under `src/app/` with parity against the engine on 510 cases; Set 2 remains the
  reference.

## Running a phenotype

Edit the constants near the top of `runAllIn` in the file (the shipped values are the phenotypes D1, B1, A1 and BD1 of
STRATEGY_COMPARISON.md, and X2 10% / Y2 3% for dual mode), then:

```
npm run app -- allIn-trailingBuy-postExitContinuation VGT                       # D1: $183,044 / $19,331
npm run app -- allIn-trailingBuy-troughRecovery VGT                             # B1: $170,748 / $21,183
npm run app -- allIn-trailingBuy-episodeLatch VGT                               # A1: $158,807 / $21,183
npm run app -- allIn-trailingBuy-dualMode VGT                                   # C1 at X2 10% / Y2 3%: $124,977 / $35,903
npm run app -- allIn-trailingBuy-troughRecovery-postExitContinuation VGT        # BD1: $201,986 / $19,861
```

Arguments after the symbol are file 4's: `[start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`.
Use Node 24.
