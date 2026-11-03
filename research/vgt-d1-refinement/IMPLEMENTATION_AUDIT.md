# Implementation audit

## 1. What was added (nothing existing was modified except `package.json`, `.gitignore` and `eslint.config.js`)

Research module `src/d1-refinement/` (about 7,500 lines including tests):

| File | Role |
|---|---|
| `engine.ts` | D1's decision engine generalized by stop policy (`net`, `netLatched`, `gross`, `breakeven`, `twoStage`, `always`) and entry mode (`deep`, `always`, `swing`, `deepAlways`, `deepSwing`), with the continuation window behind a flag; a reusable exit evaluator (`createExitEvaluator`) with a per-session stop trace; `replayPosition` (one fill under one policy); the rolling-low cache |
| `families.ts` | Parameter specs on the integer grid (tenths of a point; days; sessions), families = architecture + the parameters it reads, D1 / Trades2 vectors, candidate IDs, formatting |
| `context.ts` | Protocol constants (data hash, eligibility session 365 = 2017-06-15, folds, regimes, $35k ceiling), loader, evaluation windows (full / training / validation) |
| `evaluate.ts` | One candidate on one window through the trailing-buy-variants accounting (`replay`); compact metrics incl. worst adverse excursion, per-path attribution, stop-activation counts, per-segment summaries |
| `report.ts` | Trade rows, episode attribution, regime tables, metric rows, `diffTrades` (preserved / altered / gained / lost against a reference) |
| `study.ts` | Sweep helpers, feasibility, Pareto front, selection policies, Sobol designs, coordinate-wise refinement, neighbourhood probes; the A1 sweep and the A2 stage |
| `local.ts` | `runLocalStudy`: one bounded local study (design, picks, refinement, probes, walk-forward of the selection rule) shared by Tracks B and C |
| `diagnose.ts` | `baseline` (A0) and `stop-diagnostic` (B0) |
| `trackB.ts`, `trackC.ts` | `stop-variants` and `no-dip` |
| `finalists.ts` | `finalists`: the cross-architecture comparison |
| `generate.ts` | Generates the six runnable files by exact-once substitutions on the D1 source (stop policies) and on file 4 (no-dip entries) |
| `parity.ts` | Injectable copies of the generated files (git-ignored under `generated/`) and the parity harness against the engine |
| `pool.ts`, `worker.ts` | Worker-thread evaluator (shared-memory dataset), in-process fallback |
| `cli.ts` | Commands; `src/app/d1Refinement.ts` is the entry (`npm run d1-refinement -- <command>`, script added to `package.json`) |
| `tests/equivalence.test.ts` | With the deep mode and the net policy the engine equals the recovery-eligibility engine (itself verified against the files): Set 2 and D1 to the dollar, arming from session 74 or 365, 24 random vectors on the real data (both fills, 8/11/14%), 120 random synthetic scenarios |
| `tests/mechanisms.test.ts` | Stop policies (net inactive below breakeven and active above, stop-level fill vs minute-open fill, B-B latch at the equality boundary selling at a net loss, B-A thresholds reached or not, B-D gap at the open, B-C protective then established, net switch-off vs latch, `replayPosition` = engine, hold exit under every policy) and entry modes (always: first-minute arming, lowest-low tracking, re-arming the session after an exit; swing: rolling low excludes the current session, equality arms; C3: upgrade to deep on the exact minute, window kept open; path causality / eligibility) |

Runnable strategy files under `src/app/` (generated; constants near the top of `runAllIn`; file 4's CLI arguments
`VGT [start] [end] [data file] [output dir] [stop fill] [Y] [buffer]`):

| File | Source | Mechanism | Shipped constants | Full run |
|---|---|---|---|---|
| `allIn-trailingBuy-postExitContinuation-stopGrossThreshold.ts` | D1 | B-A | G 8% | $183,044 / $19,331 (= D1) |
| `allIn-trailingBuy-postExitContinuation-stopGrossBreakeven.ts` | D1 | B-B | — | $183,044 / $19,331 (= D1) |
| `allIn-trailingBuy-postExitContinuation-stopTwoStage.ts` | D1 | B-C | E 10% | $173,731 / $24,077 |
| `allIn-trailingBuy-postExitContinuation-stopAlways.ts` | D1 | B-D | — | $165,606 / $22,933 |
| `allIn-trailingBuy-alwaysArmed.ts` | file 4 | C1 | Y (rebound) 10.3%, stop 7.3%, hold 9, buffer 1.6% | $102,180 / $26,733 |
| `allIn-trailingBuy-swingLow.ts` | file 4 | C2 | K 55, Z 0, Y (rebound) 0.6%, stop 4.0%, hold 26, buffer 0.4% | $114,478 / $16,706 |

`src/app/allIn-trailingBuy-postExitContinuation.ts`, `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` and
`src/app/allIn.ts` are untouched (`git status` lists them as unmodified). `generate` writes only the six files above
and never reads a generated file as a source. No C3 file was generated (no C3 setting earned one). D1 phenotypes
(P 8.6%, D3, A2-lowDd, A2-maxNet) are parameter vectors documented in the reports, not files.

Other changes: `package.json` (+ the `d1-refinement` script), `.gitignore` (+ `src/d1-refinement/generated/`),
`eslint.config.js` (ignores the git-ignored parity copies).

## 2. Commands

```
npm run d1-refinement -- smoke | baseline | stop-diagnostic | a1-sweep | a2-local [--anchors d1,p86,d3,p92w69] [--samples N]
npm run d1-refinement -- stop-variants [--samples N] | no-dip [--samples N] | finalists
npm run d1-refinement -- generate [--only key,key] | parity [--vectors N] [--synthetic N] [--only key,key]
npm run d1-refinement -- show --family <family> --params key=value,... [--rate 0.08]
npm run app -- <generated file> VGT
```

All accept `--workers N` (`0` = in-process). Seeds derive from `'d1-refinement'`, the stage and the anchor/policy
label; the Sobol designs, refinements and probes are deterministic. Every command verifies the data hash.

## 3. Parity (`results/parity/parity.json`)

For each of the six generated files: the file's own defaults with stop and next-open fills on the whole file, 40
random parameter vectors on the real data (random fills, 8/11/14% interest, eligibility 365 or 180) and 60 random
synthetic minute scenarios (early closes, missing minutes, sessions without a closing print, lookbacks below the grid):
**612 of 612 cases identical** on every trade field (entry and exit session, minute, price, execution, reason, profit,
interest; kind and anchor where the file records them), the summary totals, both drawdowns and every daily mark;
8,729 trades compared. The copies inject the session list, the arming start and every hard-coded constant; with
nothing injected a copy behaves as its source.

## 4. Tests, compilation, lint

- `npm test` (Node 24): **230 tests, 202 pass, 20 fail, 8 cancelled**. Before this program the same suite gave 214 /
  186 / 20 / 8: the 16 new tests pass and the 20 failures are the pre-existing ones (golden masters and literal checks
  of `src/optimizer`, `src/minute-optimizer`, `src/four-family`, `src/trailing-buy-variants` broken by the `allIn.ts`
  and file 4 parameter changes of earlier commits). None is touched by this program.
- `tsc --noEmit` is clean for the whole project (it is run by `npm run app`'s pre-step, which the comparator reruns
  exercised).
- `eslint` on the new module and the six generated files: no errors after `prettier`; the generated files are
  formatted after generation.

## 5. Reproduction of the baselines

- D1 file (`npm run app -- allIn-trailingBuy-postExitContinuation VGT`, 2026-10-22): $183,044 net, $19,331
  minute-sampled / $15,611 daily drawdown, 19 closed + 1 open, $33,362 interest, 14 windows, 6 continuation armings.
- `allIn.ts` (`npm run app -- allIn VGT`): $169,090, $32,084 / $28,542, 33 closed + 1 open, $65,699 interest.
- Engine: D1, Set 2, Trades2 and D3 to the dollar (`results/baseline/baseline.md` §1), trade for trade.

## 6. Assumptions and remaining limitations

- Every number is an idealized simulation: stop fills at the stop level (next-open bounds the assumption at under
  $1,000 for the D1 family, under $2,000 for the no-dip designs), no spread or slippage, dividends as price moves,
  simple interest by calendar day, $100,000 per entry without compounding. An unprofitable D1 position has no stop and
  no gap protection before the hold day under every retained candidate.
- The engine's stop-activation latches and the C3 arbitration are tested on synthetic data and by parity with
  independent implementations (the generated files), not against any external reference.
- The walk-forward tests the *selection rule*, not the strategy: the validation windows are the inspected history, and
  the "frozen vector" validation nets are full-run numbers cut into windows.
- The eligibility session 365 (2017-06-15) is common to every engine run; the no-dip designs therefore never see
  2016 – mid-2017, where an always-long strategy would have gained (VGT +31% over that span); their comparison with D1
  is on D1's window.
- Results were produced on the checked-in data file (sha256 `600322af…`). The per-fold training CSVs of the local
  studies (`*_training.csv` under `a2/`, `trackB/`, `trackC/`, 29 MB) are git-ignored; `a2-local`, `stop-variants` and
  `no-dip` regenerate them in minutes. The committed results are 17 MB.

## 7. Repository state

Uncommitted on branch `research/trailing-buy-four-family-optimization` (HEAD c636e40e): `src/d1-refinement/`,
`src/app/d1Refinement.ts`, the six generated `src/app/` files, the `package.json` script, the `.gitignore` and
`eslint.config.js` lines, and `research/vgt-d1-refinement/`. Committed on 2026-10-22 (not pushed).
