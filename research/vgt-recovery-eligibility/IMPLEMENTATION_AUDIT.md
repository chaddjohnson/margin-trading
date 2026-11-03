# Implementation audit

## 1. What was added (nothing existing was modified except `package.json` and `.gitignore`)

Research module `src/recovery-eligibility/`:

| File | Role |
|---|---|
| `engine.ts` | File 4's decision engine plus the four mechanisms behind flags (`latch`, `trough`, `dual`, `postExit`), a session trace in detail mode |
| `families.ts` | Parameter specs (integer tenths of a point; sessions/days), families (base, four mechanisms, two combinations), Set 2 / Trades2 / default vectors, candidate IDs |
| `evaluate.ts` | One candidate on one window through the trailing-buy-variants accounting (`replay`), compact metrics with per-path attribution |
| `context.ts` | Protocol constants (data hash, eligibility session 365 = 2017-06-15, folds, reused window, $35k ceiling), loaders, window specs |
| `report.ts` | Trade lists, recovery-episode attribution, Markdown helpers |
| `diagnose.ts` | `root-cause`, `controls`, `counterfactuals` |
| `study.ts` | `sweeps`, `search` (Sobol + NSGA-II per family and fit), `validate`, selection policies, neighbourhoods |
| `search.ts`, `pool.ts`, `worker.ts` | The search stage with a JSONL checkpoint; a worker-thread evaluator |
| `final.ts` | `mechanism-walk-forward`, `finalists`, `tables` |
| `generate.ts` | Generates the five runnable strategy files from file 4 by exact-once substitutions |
| `parity.ts` | Injectable copies of the generated files and the parity harness against the engine |
| `inspect.ts` | `show`: any candidate's trades, attribution and session trace |
| `tests/equivalence.test.ts`, `tests/mechanisms.test.ts` | See section 4 |
| `src/app/recoveryEligibility.ts` | CLI entry: `npm run recovery-eligibility -- <command>` (script added to `package.json`) |

Runnable strategy files under `src/app/` (generated; each is file 4 plus one mechanism, constants near the
top of `runAllIn`, the same CLI arguments as file 4):

| File | Mechanism | Constants shipped (the phenotype of STRATEGY_COMPARISON.md) |
|---|---|---|
| `allIn-trailingBuy-postExitContinuation.ts` | D | `pullback = 0.09`, `continuationWindow = 60` (D1) |
| `allIn-trailingBuy-troughRecovery.ts` | B | `troughRecovery = 0.17`, `troughRetrace = 0`, `episodeReset = 0.6`, `resetPolicy = 0`, `episodeExpiry = 250`, `anchorPolicy = 0` (B1) |
| `allIn-trailingBuy-episodeLatch.ts` | A / E | `latchDepth = 0.2`, `episodeReset = 0.6`, `resetPolicy = 0`, `episodeExpiry = 250`, `anchorPolicy = 0` (A1) |
| `allIn-trailingBuy-dualMode.ts` | C | `shallowDepth = 0.1`, `shallowRebound = 0.03` |
| `allIn-trailingBuy-troughRecovery-postExitContinuation.ts` | B + D | B1 + D1 (BD1) |

All five ship with Set 2's base constants (X 0.216, Y 0.003, stop 0.073, hold 8, L 74, buffer 0.029). The
originals `src/app/allIn.ts` and `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` are untouched
(`git status` shows them unmodified). No preset or phenotype files were added; phenotypes live in the
Markdown tables and are set by editing the constants.

## 2. Commands

```
npm run app -- allIn-trailingBuy-postExitContinuation VGT                      # the D1 file as shipped
npm run app -- allIn-trailingBuy-troughRecovery VGT 2016-01-04 2025-10-13 - out/b1 stop 0.003 0.029
npm run app -- allIn-trailingBuy-episodeLatch VGT
npm run app -- allIn-trailingBuy-dualMode VGT
npm run app -- allIn-trailingBuy-troughRecovery-postExitContinuation VGT

npm run recovery-eligibility -- smoke                   # Set 2 through the engine, timing
npm run recovery-eligibility -- root-cause              # ROOT_CAUSE tables and trace
npm run recovery-eligibility -- controls                # lookback / threshold controls
npm run recovery-eligibility -- counterfactuals         # predeclared mechanism settings + Amendment 1
npm run recovery-eligibility -- sweeps                  # targeted lattices, Set 2 frozen
npm run recovery-eligibility -- search [--families a,b] [--fits fold1,...] [--workers N] [--quick]
npm run recovery-eligibility -- validate                # joint walk-forward rows
npm run recovery-eligibility -- mechanism-walk-forward  # mechanism-only walk-forward
npm run recovery-eligibility -- finalists               # finalists: trades, attribution, sensitivities, neighbourhoods
npm run recovery-eligibility -- tables                  # results/tables/tables.md
npm run recovery-eligibility -- generate                # (re)writes the five src/app files from file 4
npm run recovery-eligibility -- parity [--vectors 40] [--synthetic 60]
npm run recovery-eligibility -- show --family trough --params troughRecovery=170,episodeReset=600 --trace 2022-10-07:2023-01-20
```

Use Node 24 (`~/.local/share/fnm/node-versions/v24.21.0/installation/bin`); the shell default (v23) does not
run the repository's `--experimental-transform-types` scripts.

## 3. Reproduction of the baseline and of the user's runs

- File 4 as checked in (`npm run app -- allIn-trailingBuy-bufferedLoss-noReentry VGT`): $150,630 net,
  $21,183 minute-sampled drawdown (2019-05-01 11:44 → 2020-03-18 14:27), $16,577 daily, 13 closed trades
  plus one open, $20,855 interest — the figures in the brief. The engine gives the same, trade for trade
  (`smoke`, `root-cause`).
- Verbatim copies of file 4 with only `tickWindowSize` changed, run through the file's own code: L 90
  $143,060 / $21,183, L 183 $121,608 / $35,099, L 365 $136,580 / $35,099; the engine reproduces each
  (LOOKBACK_CONTROLS.md).
- `allIn.ts` as checked in: $169,090 / $32,084, 33 closed + 1 open, with the 2023-01-04 → 2023-08-09 trade
  at +$27,611 (ROOT_CAUSE.md).
- The generated post-exit file at its shipped constants: $183,044 / $19,331, 19 closed + 1 open, six
  continuation armings (its own console output), equal to the engine's D1.

## 4. Parity, tests, compilation

- **Parity** (`results/parity/parity.json`): for each of the five generated files, the file's own defaults
  (stop and next-open fills) on the whole file, 40 random lattice vectors on the real data (random fills,
  8/11/14% interest, eligibility 180 or 365) and 60 random synthetic minute scenarios (early closes, missing
  minutes, sessions without a closing print): **510 of 510 cases identical** on every trade field (entry and
  exit session, minute, price, execution, reason, profit, interest, path, anchor), the summary totals, both
  drawdowns and every daily mark; 6,270 trades compared.
- **Engine equivalence** (`tests/equivalence.test.ts`): with every flag off, identical trades, counts and
  accounting to the trailing-buy-variants engine (itself verified against file 4) on Set 2 and 24 random
  vectors on the real data and on 120 synthetic scenarios.
- **Mechanism behaviour** (`tests/mechanisms.test.ts`): the latch re-arms after the rolling high has decayed,
  the trough path arms once per trough, a shallow setup is re-armed as deep at the X level, the continuation
  window opens only after a profitable exit, arms only on the pullback and expires.
- **Full suite** (`npm test`, Node 24): 214 tests, 186 pass, 20 fail, 8 cancelled. Before this work the same
  suite gave 208 tests, 180 pass, 20 fail, 8 cancelled: the 6 new tests pass and the 20 failures are the
  pre-existing ones (golden masters and literal checks broken by the `allIn.ts` and file 4 parameter changes
  of earlier commits: `src/optimizer`, `src/minute-optimizer`, `src/four-family`, `src/trailing-buy-variants`
  suites). They are not touched by this program.
- `tsc --noEmit` is clean for the whole project; `eslint` reports no problems for the new module and the
  generated files (after `prettier`).

## 5. What remains uncertain

- The generated files reproduce the engine; the engine's semantics for the mechanisms are the ones described
  in MECHANISMS.md and are the only ones tested. In particular the episode trough is updated from session
  lows at the session's end, so the trough mechanism compares against the trough *through the previous
  session* (causal by construction).
- Every full-run number is an idealized simulation (stop fills at the stop price, no spread or slippage,
  dividends as price moves); the next-open sensitivity bounds the fill assumption at under $1,000 per
  finalist, nothing bounds the spread.
- Results were produced on the checked-in data file (sha256 `600322af…`); the `search` checkpoints that
  replay the joint search are git-ignored (87 MB) and the sweep JSON (40 MB) is kept only as CSV.

## 6. Repository state

Uncommitted on branch `research/trailing-buy-four-family-optimization`: the new module, the five generated
files, `src/app/recoveryEligibility.ts`, the `recovery-eligibility` script in `package.json`, three
`.gitignore` lines (checkpoints, sweep JSON, generated copies) and this directory. Nothing was committed.
