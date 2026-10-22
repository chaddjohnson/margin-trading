# VGT D1 refinement, trailing-stop redesign and no-dip entries

A research program (2026-10-22) on the shipped **D1** strategy (`src/app/allIn-trailingBuy-postExitContinuation.ts`:
Set 2's trailing buy plus post-exit continuation; $183,044 net, $19,331 minute-sampled drawdown, 20 entries on
2016-01-04 → 2025-10-13 VGT minute data at 11% margin interest) in three tracks:

- **A** — refine the continuation parameters (P, W), then locally optimize the six original parameters around a small
  shortlist, with the selection rule walked forward;
- **B** — diagnose the exact trailing-stop activation rule, then implement and test four alternatives (gross-profit
  threshold, gross breakeven, two-stage protection, always active);
- **C** — trailing buys that need no initial decline from a high (always-armed, swing low, and D1 plus such a path).

## Read in this order

1. [PROTOCOL.md](PROTOCOL.md) — fixed settings, architectures, grids, budgets, folds, selection policies, amendments.
2. [D1_BASELINE_AND_DIAGNOSTICS.md](D1_BASELINE_AND_DIAGNOSTICS.md) — parity with every reported figure, D1's trades
   and attribution, and the **exact stop semantics** (net-profit-at-the-stop test, re-decided each session, no latch,
   daily update of the high; the 2023 interest sensitivity reproduced).
3. [D1_LOCAL_OPTIMIZATION.md](D1_LOCAL_OPTIMIZATION.md) — A1 (9,211 cells), A2 (4 anchors × 4,096 Sobol points × 5
   windows), walk-forward, retained phenotypes.
4. [TRAILING_STOP_MECHANISMS.md](TRAILING_STOP_MECHANISMS.md) — state machines, counterfactuals, sweeps, local
   refinement, verdicts for B-A/B-B/B-C/B-D.
5. [NO_DIP_ENTRY_MECHANISMS.md](NO_DIP_ENTRY_MECHANISMS.md) — C1/C2/C3 specifications, grids, refinement, arbitration,
   displaced trades.
6. [STRATEGY_COMPARISON.md](STRATEGY_COMPARISON.md) — every retained candidate ranked by full-history performance
   and, separately, by validation robustness and evidence quality.
7. [TRADE_ATTRIBUTION.md](TRADE_ATTRIBUTION.md) — preserved / altered / gained / lost trades against D1, winners
   kept or cut, losers and drawdown drivers.
8. [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) — files, commands, parity, tests, limitations.
9. [RECOMMENDATIONS.md](RECOMMENDATIONS.md) — the shortlist and what to do next.

Generated outputs are under `results/` (baseline, diagnostics, a1, a2, trackB, trackC, finalists, parity), each with
CSV/JSON and a Markdown summary written by the command that produced it.

## Main conclusions

1. **D1 reproduces exactly** ($183,044 / $19,331 / 20 entries), as do Set 2, Trades2, D3 and `allIn.ts`. Its edge over
   Set 2 is six continuation re-entries in 2019–2021 (+$36,677) less two 2022 losses (−$4,264); nothing in 2023.
2. **The stop rule**: eligible on a session iff a fill at the stop level would net a profit after interest through
   that date; re-decided every session (no latch; it switched off once on D1's history, harmlessly); the high and
   level update once a day after the session; an unprofitable position has no stop before the hold day. The 2023
   trough trade's interest sensitivity is this rule, not a latch; a latch changes none of D1's trades.
3. **Track A**: the continuation plateau is P 8.5–9.4% × W 58–166 (D1's trades throughout); D1 is the maximum of
   its own local box (0 of 4,096 Sobol points beat it in three of four boxes); the selection rule walked forward never
   beats frozen D1 (0/4 to 1/4 folds, stitched $47–105k vs $147k). In-sample improvements exist (P 9.2% W 69
   $190,013; X 23.8 Y 0.2 L 62 buffer 1.6 + P 9.2 W 69 $195,808) on one-step ridges and box edges.
4. **Track B**: the latched net rule, gross threshold ≤ 9.4% and gross breakeven give **exactly D1's 20 trades**
   (D1's stop never executed below gross breakeven); two-stage (−$9,313, DD +$4,746) and always-active (−$17,438, DD
   +$3,602) are worse, both in March 2020. No alternative improves D1; B-B/B-A are cleaner, interest-independent
   equivalents.
5. **Track C**: no no-dip design beats D1 within the $35,000 ceiling after grids and local refinement; the ones that
   approach it are invested 82–95% of the time with more losers than winners and 2022 as a string of losses; adding a
   path to D1 never raised the net. One low-drawdown alternative is kept for inspection (swing K 55, 4% stop:
   $114,478 / $16,706).
6. **Verdict**: no new architecture is preferable to D1. The retained shortlist is D1, D1 with the gross-breakeven stop
   (same trades, cleaner rule), two lower-drawdown D1 points, one in-sample higher-profit point, D3, and the C2
   phenotype, all labelled by evidence grade in RECOMMENDATIONS.md.

## Reproducing

Node 24. Every command checks the data hash (`600322af…`) and arms from 2017-06-15.

```
npm run d1-refinement -- smoke              # Set 2 and D1 through the engine, trade lists, timing
npm run d1-refinement -- baseline           # A0: results/baseline/
npm run d1-refinement -- stop-diagnostic    # B0: results/diagnostics/
npm run d1-refinement -- a1-sweep           # results/a1/          (9,211 evaluations, ~20 s on 9 workers)
npm run d1-refinement -- a2-local           # results/a2/          (~100 s)
npm run d1-refinement -- stop-variants      # results/trackB/      (~45 s)
npm run d1-refinement -- no-dip             # results/trackC/      (~90 s)
npm run d1-refinement -- finalists          # results/finalists/
npm run d1-refinement -- generate           # (re)writes the six src/app files from the D1 and file 4 sources
npm run d1-refinement -- parity             # results/parity/parity.json
npm run d1-refinement -- show --family d1 --params pullback=86 [--rate 0.08]
npm test                                    # the whole suite; the program's tests are src/d1-refinement/tests/
```

`--workers N` sets the worker threads (`0` = in-process); `--samples N` the Sobol budget of the local studies.
Parameters on the command line are integers in tenths of a percentage point or whole days/sessions (`pullback=86` is
8.6%). Families: `base`, `d1`, `d1.netLatched`, `d1.gross`, `d1.breakeven`, `d1.twoStage`, `d1.always`, `always`,
`swing`, `deepAlwaysPostExit`, `deepSwingPostExit` (and the stop policies on `base`, `always` and `swing`).

## Candidate quick-start

```
npm run app -- allIn-trailingBuy-postExitContinuation VGT                        # D1: $183,044 / $19,331
npm run app -- allIn-trailingBuy-postExitContinuation-stopGrossBreakeven VGT     # B-B: identical trades
npm run app -- allIn-trailingBuy-postExitContinuation-stopGrossThreshold VGT     # B-A at 8%: identical trades
npm run app -- allIn-trailingBuy-postExitContinuation-stopTwoStage VGT           # B-C at 10%: $173,731 / $24,077
npm run app -- allIn-trailingBuy-postExitContinuation-stopAlways VGT             # B-D: $165,606 / $22,933
npm run app -- allIn-trailingBuy-swingLow VGT                                     # C2 balanced: $114,478 / $16,706
npm run app -- allIn-trailingBuy-alwaysArmed VGT                                  # C1 balanced: $102,180 / $26,733
```

The D1 phenotypes (P 8.6%, D3, A2-lowDd, A2-maxNet) are parameter vectors of the unchanged D1 file: edit the
constants near the top of `runAllIn` (or use `show`); no separate file was created for them.
