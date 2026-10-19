# Reproduction

## Requirements

- Node.js ≥ 24.21 (the repository's `engines`; tested with v24.21.0), `npm ci`.
- The minute file `data/VGT/VGT-2016-2025-1-minute.csv` (git-ignored, sha256
  `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f`). Every command checks the hash.
- Any multicore CPU; no GPU. The whole pipeline takes about 15 minutes on a 10-core laptop (8 worker threads).
  Most of that is the parity audit's runs of the original files (about 6 minutes per audit); the 16 search
  stages take about 2 minutes. Memory use is modest: worker threads share the minute data through
  SharedArrayBuffers.

## Commands (in order)

```sh
npm run four-family -- audit                   # data coverage and quality → results/audit/data-audit.json
npm run four-family -- copies                  # generated injectable copies → src/four-family/generated/ (git-ignored)
npm run four-family -- parity --golden 30      # parity audit → results/parity/parity.json (must pass)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/four-family/tests/*.test.ts'
npm run four-family -- benchmark               # throughput pilot → results/benchmark.json
npm run four-family -- search                  # 16 search stages + selection → results/fits/<fit>/<family>/
npm run four-family -- validate                # walk-forward validation → results/fits/fold*/validation.json
npm run four-family -- control                 # random-sampling control → results/fits/final/<family>/control.json
npm run four-family -- freeze                  # → results/fits/final/freeze.json (refuses if one exists)
npm run four-family -- development             # development-period robustness and traces
npm run four-family -- holdout                 # ONCE → results/holdout/ (refuses a second attempt)
npm run four-family -- report                  # all Markdown reports and results/shortlist.*, verdicts.json
```

Options: `--workers N` sets the worker threads (`0` runs in process; the default is `availableParallelism − 2`).
`--fits fold1,final` and `--families noReentry,...` restrict `search`; `--families` also restricts `control`.
`freeze` and `holdout` refuse to repeat without `--rerun-reason "<why>"`, and `holdout` records every attempt
in `results/holdout/attempts.json`.

`search` resumes from its checkpoints (`evaluations.jsonl[.gz]`, `probes.jsonl[.gz]`, and
`random-evaluations.jsonl[.gz]` for the control). Re-running a completed stage replays the identical
deterministic path from the cache, with no new simulations, and rewrites the same picks.

## Determinism

- **Seeds** are derived by hashing labels (`src/optimizer/rng.ts`):
  - Sobol scramble: `deriveSeed("four-family", "sobol", fit, family)`;
  - NSGA-II: `deriveSeed("four-family", "nsga", fit, family, 1 | 2)`;
  - random control: `Rng.from("four-family", "random-control", fit, family)`;
  - golden master: `Rng.from("four-family", "golden-master", "v1")`.
- **No randomness elsewhere.** No `Math.random`, no clock-dependent decisions, and results are ordered by
  request, so the worker count can't change a result (tested).
- **Hashes.** `results/fits/final/freeze.json` records the data hash, the five strategy files' hashes, the
  sha256 of every file in `src/four-family/`, the reused `src/optimizer/{nsga2,sobol,rng}.ts` and
  `src/lib/{csv,session}.ts`, the protocol's hash, the search and selection settings, and the 40 picks. Its
  `freezeHash` is the sha256 of all of that; the holdout verifies it and refuses on any mismatch in the data,
  the strategy files or the decision code.

## Where everything is

| Path | Contents |
|---|---|
| `results/audit/data-audit.json` | data coverage and quality |
| `results/parity/parity.json` | every parity case with its differences |
| `results/benchmark.json` | throughput pilot and projection |
| `results/fits/<fit>/<family>/stage.json` | search settings, budget actually run (attempted, unique, duplicates), NSGA-II hypervolume per generation |
| `results/fits/<fit>/<family>/candidates.csv.gz` | **every evaluated candidate**: all nine parameter columns (N/A where absent), feasibility, Pareto rank, metrics, trade signature, clone-group size |
| `results/fits/<fit>/<family>/selection.json` | pool (behaviour-cluster leaders), every probe, robustness, picks, pairwise held-session overlap |
| `results/fits/<fit>/<family>/evaluations.jsonl.gz` | the checkpoint (full metrics of every evaluation) |
| `results/fits/fold*/validation.json` | fold picks and defaults on training and validation (continuous and flat start, both stop fills) plus allIn.ts |
| `results/fits/final/control.json` | random-sampling control comparison |
| `results/fits/final/freeze.json` | the freeze |
| `results/fits/final/development.json` | finalists and baselines on development data, both stop fills, 8% / 11% / 14%, per year |
| `results/holdout/` | `holdout.json` (all holdout runs), `attempts.json` |
| `results/traces/development/<family>/<id>/` and `results/traces/full/<family>/<id>/` | `trades.csv`, `setups.csv`, `equity.csv` for every finalist and baseline |
| `results/shortlist.csv`, `results/shortlist.json` | the 40 frozen phenotypes with every parameter and result |
| `results/verdicts.json` | the pre-declared verdict computations |
| `results/logs/` | command logs |

## Files changed after the freeze

`freeze.json` records the hash of every study file at 13:26:27Z. Three files changed afterwards; none can change
a decision, a pick or an evaluated figure:

- `src/four-family/study.ts`: `search` now refuses to run unless a passing parity audit exists for the current
  engine code. This only codifies the order already followed.
- `src/four-family/parityAudit.ts`: the audit now records the engine, accounting, data and copy-generator
  hashes that this gate checks.
- `src/four-family/report.ts`: report layout only: compact top-10 tables in the summary, "n/a" for a
  best-trade share when net ≤ 0, and a note on holdout trade counting.

Before evaluating, the holdout verified that the decision files were unchanged: the engine, accounting, data,
evaluation, families, context, copy generator, comparator, holdout and the repository's CSV and session code.
