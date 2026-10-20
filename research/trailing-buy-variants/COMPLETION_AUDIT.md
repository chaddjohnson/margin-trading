# Completion audit

Program: VGT trailing-buy strategy variants, 2026-10-20, branch `research/trailing-buy-four-family-optimization`
(working tree; nothing committed by this program). Node `v24.21.0`
(`~/.local/share/fnm/node-versions/v24.21.0/installation/bin`; the shell default v23 does not run the repository).

## Files added or changed

| Path | Status | What |
|---|---|---|
| `src/app/allIn-trailingBuy-invalidation.ts` | added | runnable strategy: file 4 + failed-recovery invalidation exit |
| `src/app/allIn-trailingBuy-episodeBudget.ts` | added | runnable strategy: file 4 + correction-episode loss budget |
| `src/app/allIn-trailingBuy-depthRebound.ts` | added | runnable strategy: file 4 + depth-adjusted rebound |
| `src/app/allIn-trailingBuy-staged.ts` | added | runnable strategy: file 4 + progressive deployment (two legs) |
| `src/app/allIn-trailingBuy-progressHold.ts` | added | runnable strategy: file 4 + progress-based hold extension |
| `src/app/allIn-trailingBuy-persistence.ts` | added | runnable strategy: file 4 + rebound persistence confirmation |
| `src/app/trailingBuyVariants.ts` | added | CLI entry (`npm run trailing-buy-variants -- <command>`) |
| `src/trailing-buy-variants/*.ts` | added | engine (mechanism flags, multi-leg), accounting, families, evaluate, worker/pool, search, selection, context, comparators, study, copies, parity, attribution, report, cli |
| `src/trailing-buy-variants/tests/{equivalence,mechanisms}.test.ts` | added | 16 tests |
| `package.json` | changed | `trailing-buy-variants` script |
| `research/trailing-buy-variants/` | added | PROTOCOL (with Amendment 1), README, STRATEGY_COMPARISON, TRADE_ATTRIBUTION, PROVENANCE, phenotypes/*.md (18), this audit, `results/` (520 MB: `fits/` 470 MB of gzipped evaluation checkpoints and candidate tables, `traces/` 35 MB, `holdout/`, `parity/`, `sweeps.json`, `shortlist.json`/`.csv`, `verdicts.json`, `combinations.json`, `logs/`) |

The four original strategy files, `allIn.ts`, `src/four-family/` and every other module are untouched.
`src/trailing-buy-variants/generated/` (injectable copies) is git-ignored.

## What compiles and runs

- `npx tsc --noEmit`: clean. `npx eslint`: 0 errors, 4 warnings (the pre-existing `no-use-before-define`
  pattern of the four-family code, mirrored in `selection.ts`/`evaluate.ts`, plus one in the four-family code).
- Every new strategy file runs at its defaults (`npm run app allIn-trailingBuy-<mechanism> VGT`), smoke-run on
  2026-10-20 (invalidation $122,416, episodeBudget $95,662, depthRebound $154,430, staged $137,265, progressHold
  $125,832, persistence $150,289 on 2016-01-04 → 2025-10-13).
- Parity of the six new files and file 4 with the engine: 294/294 cases on the research view (file defaults
  both stop fills + 40 random lattice vectors per file with every constant injected, random rates), and 14/14
  at the file defaults on the full file (`results/parity/parity.json`, `parity-full.json`). Every trade field,
  leg, count, total, drawdown and daily mark matched (max difference 0, or ≤ 6e-11 for the staged file's
  floating-point summation).
- `npm test`: 208 tests, 180 pass, 20 fail. The 20 failures are pre-existing and not caused by this program:
  the four-family copy-based tests (`src/four-family/tests/synthetic.test.ts`, 9 tests) fail because commit
  `f15f6b2` changed file 4's literals that `src/four-family/copies.ts` matches (`const tickWindowSize = 90;`
  etc.); the "protected files" hash test fails for the same commit; the minute-optimizer and daily-optimizer
  golden-master tests (10) fail because `allIn.ts`'s constants were changed in earlier commits
  (`const tickWindowSize = 78` expected). All 16 tests of this program pass.

## Reproducibility

- Data `data/VGT/VGT-2016-2025-1-minute.csv`, sha256 `600322af…24c7962f` (verified by `loadResearch`).
- Trades2 reproduced exactly from `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` at its checked-in
  constants and by the engine (net $154,213, minute DD $27,408, daily DD $23,010, 17 + 1 trades).
- Deterministic seeds (`deriveSeed('trailing-buy-variants', …)`); JSONL checkpoints per stage replay a search
  exactly; worker count does not affect results.
- Freeze `results/fits/final/freeze.json` (hash `695568752f…`, 2026-10-20T11:58:03Z, 180 picks in 18
  families) with code, data and protocol hashes. Reused-window evaluation: attempt 1 (11:58:04Z) exited after
  the 16 single families without writing any result because the combination families had not been registered
  with the worker pool; attempt 2 (11:59Z, `--rerun-reason` recorded in `results/holdout/attempts.json`) is
  the one reported. Only `study.ts` (orchestration) changed between the attempts; the decision code hashes
  verified by the freeze were unchanged, and no pick, rule or threshold changed.
- The accounting's leg summation order was changed (legs summed first, then the realized base) after the
  fold-1 search of the staged families had run, to make the engine and the staged source file sum identically.
  The difference is at the 1e-11 level and changes no decision; the checkpoints were not re-run.

## Commands actually executed (in order)

```
npm run trailing-buy-variants -- search                       # 16 families x 4 fits (then 2 combinations x 4 fits)
npm run trailing-buy-variants -- validate                      # folds 1-3
npm run trailing-buy-variants -- sweeps                        # Trades2-anchored sweeps
npm run trailing-buy-variants -- development                   # development traces and sensitivities
npm run trailing-buy-variants -- search --families invalidationDepth,invalidationStaged
npm run trailing-buy-variants -- validate --families invalidationDepth,invalidationStaged
npm run trailing-buy-variants -- development --families invalidationDepth,invalidationStaged
npm run trailing-buy-variants -- freeze
npm run trailing-buy-variants -- holdout                       # attempt 1, aborted (see above)
npm run trailing-buy-variants -- holdout --rerun-reason "..."  # attempt 2, reported
npm run trailing-buy-variants -- parity --vectors 40 ; -- parity --full
npm run trailing-buy-variants -- report
npm test ; npx tsc --noEmit ; npx eslint
```

Logs: `results/logs/`.

## Known caveats and unfinished work

- No random-sampling control was run for this program (the previous program's control showed Sobol+NSGA-II
  dominating random sampling on the same engine and families; the search configuration is identical).
- The unbuffered mechanism families (`*Unbuffered`, base 3) have no dedicated runnable file; their buffered
  counterparts exist. The buffered file with `intradayLossBuffer = 0` is not the same strategy (a zero buffer
  still adds an intraday trigger). No unbuffered mechanism family is in the shortlist for that reason.
- The two combination families have no runnable file; neither is credited nor shortlisted.
- Sweeps were not run for the combination families (their two-parameter grids would be 20,000–30,000 points).
- The reused window is previously inspected (by the previous program, by this program's Trades2 reference,
  and by earlier research); nothing here is an independent holdout.
- Idealized stop-level fills, no spread/commission/slippage, raw prices without dividends, about 20% of
  regular-session minutes without a bar (as the files use the data).
- `results/fits/` holds 370 MB of gzipped search checkpoints (`evaluations.jsonl.gz`, `probes.jsonl.gz`,
  `candidates.csv.gz`), excluded from version control by `results/.gitignore`; they are reproducible from the
  seeds with the `search` command. Every selection, stage statistic, validation, freeze, holdout, trace, sweep,
  parity file and the shortlist are committed.
