# Implementation audit

## 1. What was added and changed

New research module `src/multi-etf-d1/` (about 5,900 lines including tests) and the entry `src/app/multiEtfD1.ts`
(`npm run multi-etf-d1 -- <command>`, script added to `package.json`):

| File | Role |
|---|---|
| `context.ts` | Every protocol constant (tickers, dates, eligibility, box, budget, selection thresholds, sensitivities), result paths, small helpers |
| `data.ts` | Per-ticker loading through the repository's own loader and session grouping, hash verification against the audit, the development view (physically truncated at the last 2023 session, `researchDataset`) and the full view (`unlockedDataset`, holdout only) |
| `audit.ts` | The tolerant row audit, session audit, common calendar, corporate-action gaps, development-only price statistics, the Markdown tables |
| `evaluation.ts` | Evaluation windows as segments of one continuous run (development, training/validation folds, years; combined/development/holdout), the thin wrapper over `src/d1-refinement/evaluate.ts` |
| `space.ts` | The integer box, genome ↔ parameters, candidate IDs (d1-refinement IDs), the scrambled Sobol design, the plateau probes |
| `baseline.ts` | VGT parity (file vs prior figures vs engine), the eight-ticker development benchmark with trade-by-trade file parity, the XLF distribution exposure check, the throughput profile, `show` |
| `search.ts` | The checkpointed evaluation cache, the per-fold NSGA-II on training objectives (operators of `src/optimizer/nsga2.ts`), the per-ticker pipeline |
| `selection.ts` | Views, feasibility, plateau check, the three policies, the walk-forward summary, the nominations, Pareto export, CSV/Markdown |
| `detail.ts` | `trades.csv`, `daily.csv`, optional `minute_marks.csv`, `summary.json` per run |
| `freeze.ts` | `FROZEN_CANDIDATES.json` with data/code/protocol hashes, git state and the manifest hash; `FROZEN_SELECTION.md` |
| `holdout.ts` | Manifest verification, attempt log, the one unlock capability, the sealed evaluation with sensitivities and boundary-spanning attribution |
| `report.ts` | `results/tables/*.md` regenerated from JSON without reopening any selection |
| `cli.ts` | Commands |
| `tests/` | 17 tests: segment equivalence (synthetic + real XLF), quantization and determinism of the design and operators, the cost option (off = bit-identical; on = worse fills, fewer shares, the sale cost in the stop test), the selection rule on a fake pool, the manifest hash, the row audit |

Changed existing files:

- `src/d1-refinement/engine.ts`: an optional `costPerSide` on `RunSettings` (buy at observed × (1 + c), sale at
  observed × (1 − c), the sale cost in every net-profit test; levels on observed prices), two observed-price fields on
  `Trade`, the `sellFactor` export of the exit evaluator. With the option absent or 0 every factor is exactly 1 and the
  engine is bit-identical (asserted by `tests/cost.test.ts`; the d1-refinement suite's 16 tests still pass).
- `src/d1-refinement/evaluate.ts`: `EvalSpec.costPerSide` passed through to the engine.
- `package.json` (the script), `.gitignore` (checkpoints, full candidate tables, minute curves).

**Not changed**: `src/app/allIn-trailingBuy-postExitContinuation.ts` (D1) and every other `src/app/` file,
`src/lib/`, `src/four-family/`, `src/optimizer/`, `src/trailing-buy-variants/`: `git status` lists only the four files
above as modified. No file of any committed freeze (four-family, trailing-buy-variants) was touched.

## 2. Commands (all in `README.md`)

```
npm run multi-etf-d1 -- audit                       # DATA_AUDIT inputs, hashes.json
npm run multi-etf-d1 -- parity                      # VGT regression control
npm run multi-etf-d1 -- benchmark [--symbols A,B]   # unchanged D1 on development data + file parity
npm run multi-etf-d1 -- profile [--workers N]       # throughput and the budget
npm run multi-etf-d1 -- search [--symbols A,B] [--workers N] [--samples N]   # Sobol + per-fold NSGA-II + selection
npm run multi-etf-d1 -- freeze                      # FROZEN_CANDIDATES.json + FROZEN_SELECTION.md (one-time)
npm run multi-etf-d1 -- holdout [--rerun-reason "..."] [--minute-curves]     # the sealed evaluation (one-time)
npm run multi-etf-d1 -- report                      # results/tables/*.md
npm run multi-etf-d1 -- show --symbol XBI --params targetPercentChange=250,trailingStopPercentage=40
```

Node 24.21.0 (`fnm`), 9 worker threads on an Apple M1 Pro (10 cores, 16 GB).

## 3. Performance and determinism

- Throughput (`results/profile/profile.json`): 14–29 ms per development run in-process; 120–382 runs per second on
  the pool. The search took 13:05–13:17 UTC for the eight tickers (17,841–22,488 simulations each, 166,000 in all),
  the holdout 27 seconds.
- Seeds: Sobol scramble `multi-etf-d1|<ticker>|sobol-scramble`, GA `multi-etf-d1|<ticker>|ga|<fold>`; ties by
  candidate ID; the pool returns results in request order. The holdout was run twice on the same manifest (attempt 2
  with a recorded reason) and the two `holdout.json` are identical apart from the timestamps.
- Checkpoints: `results/search/<ticker>/evaluations.jsonl` (one line per simulated candidate, ~75 MB per ticker,
  git-ignored); a rerun resumes from it and replays the same decisions.

## 4. Look-ahead and accidental holdout-access checks

- Every development command builds its dataset from sessions dated ≤ 2023-12-31 before any typed array exists
  (`researchDataset`); the dataset ends on 2023-12-29 (`tests/segments.test.ts` asserts it on XLF). A later price
  cannot be read because it is not in memory.
- The only way to build a full dataset is `unlockedDataset` with the capability that `holdout.ts` takes at module
  load; `src/four-family/data.ts` throws on a second request in a process.
- Training folds are prefix segments of one continuous run; their equality with truncated runs is asserted on 12
  synthetic scenarios and on XLF (net, both drawdowns, entries, exits, wins, losses, interest).
- The D1 *file* was run on the eight tickers only with `endDate = 2023-12-31` (its own session filter), and on the
  full VGT file (not a holdout instrument).
- `FROZEN_CANDIDATES.json` (13:22:39Z) predates `results/holdout/attempts.json` attempt 1 (13:22:49Z); the holdout
  verified the manifest hash, the nine data hashes, 17 decision-code hashes and the protocol hash. The manifest
  cannot be overwritten by the `freeze` command.
- One mechanics smoke test of the search ran before the protocol-budget run (XLF, 64 Sobol points, same GA settings);
  its outputs were deleted before the full run and no decision used them (PROTOCOL.md §10).
- The protocol's rule for the drawdown list (net ≥ 75% of the *best feasible* net, which can be a needle) is stricter
  than the lowDd alternate's own floor; it was kept as written (PROTOCOL.md §10) and the unit test exercises it.

## 5. Tests, type check, lint

- `npm test` (Node 24.21.0): **261 tests, 233 pass, 20 fail, 8 cancelled**. Before this program the suite gave 244 /
  216 / 20 / 8 (Node 23.6.1 and 24: the same). The 17 new tests pass; the 20 failures and 8 cancellations are the
  pre-existing golden-master and literal checks of `src/optimizer`, `src/minute-optimizer`, `src/four-family` and
  `src/trailing-buy-variants` that earlier parameter changes to `allIn.ts` and file 4 broke, as the previous
  programs' audits record. None is touched by this program.
- `tsc --noEmit`: clean.
- `eslint`: 0 errors, 15 warnings (8 pre-existing; 7 `no-use-before-define` warnings on functions in the new module,
  the same style the repository already uses).

## 6. Limitations

- The search was budget-bound on most folds; the nominations are not optima. Several lie on box edges.
- The walk-forward evaluates the selection rule on validation years with 0–28 entries; "pass" is a weak signal.
- The holdout is one episode; see `HOLDOUT_RESULTS.md` §4.
- No distribution history, no measured spreads; price-only, hypothetical costs.
- The trade signature used for "distinct phenotype" on folds 1–4 is the development-window signature (exact on the
  final fold only).
- `candidates.csv` and the checkpoints are local only; `pareto.csv`, `selection.json` (with every probed candidate)
  and every nomination's artifacts are in the repository.
