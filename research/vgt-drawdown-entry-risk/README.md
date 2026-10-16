# VGT drawdown regime and entry risk

Can the speed, acceleration and structure of a VGT decline tell, at the first −10% close, whether the correction will stop or run to −20% or worse? And can that improve the entry of the daily margin dip-buy strategy (`src/app/allin-original.ts`)?

**Answer: no, on the evidence available. Keep the entry as it is.** From 2014 to 2026 VGT had 15 independent corrections, and only 3 reached −20% within 40 sessions. Neither speed nor any of 36 point-in-time indicators separated those 3 from the rest. Of 58 pre-specified entry rules (velocity gates, deterioration gates, stabilization waits, adaptive thresholds) plus a two-stage combination, none beat the baseline in the 2018–2022 walk-forward or on the untouched 2023–2026 holdout. Their in-sample gains came from one 2016 trade and matched what random 0–5-day entry delays produce. The baseline already limits the brief's failure mode: in each severe crash its first −10% trade lost $1.5k–$9k, and the episode as a whole made money.

## Reports

| File | Contents |
|---|---|
| [RECOMMENDATION.md](RECOMMENDATION.md) | Verdict, required summary table, best candidate in- vs out-of-sample, established findings vs hypotheses, next steps |
| [BASELINE_AUDIT.md](BASELINE_AUDIT.md) | Verified baseline mechanics (code vs the brief), data, byte-identical reproduction, execution conventions |
| [DRAWDOWN_EVENTS.md](DRAWDOWN_EVENTS.md) | Episode definitions, the 2014–2026 episode table, threshold timing, velocity bins, depth-vs-time chart, pre-2014 episodes |
| [INDICATOR_STUDY.md](INDICATOR_STUDY.md) | Point-in-time feature definitions, single-feature and flag diagnostics, failure examples |
| [ENTRY_COMPARISON.md](ENTRY_COMPARISON.md) | Families A–F state machines, development grid, frozen picks (development, holdout, next-open), decisions, attribution, crash walk-throughs |
| [ROBUSTNESS.md](ROBUSTNESS.md) | Walk-forward, holdout validation, placebo, nearby parameters, costs/margin, six other ETFs, 2006–2013 stress |
| [PROTOCOL.md](PROTOCOL.md) | Pre-registration (frozen before any strategy result) and two pre-holdout amendments; hash in `PROTOCOL.sha256` |

## Reproduce

```sh
node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts drawdownEntry all
```

`all` runs, in order:

- `golden`: the original vs the engine, byte for byte, 8 cases.
- `dev`: Phase 1 and Phase 3 on 2014–2022, the grid, the walk-forward and the placebo. It writes `results/frozen.json` only if that file is absent.
- `final`: the holdout, sensitivities, other ETFs, the 2006–2013 stress test, exports and charts.
- `reports`: refreshes the `<!-- table:… -->` blocks in these reports from `results/tables/`.

Each command can also be run on its own. The whole run takes about 40 seconds on one core; everything is deterministic (placebo seeds are fixed). Tests: `npm test` (the study's own 38 tests are in `src/drawdown-entry/tests/`). On 2026-10-16: 172 of 173 pass. The one failure is pre-existing and unrelated: `src/intraday-study/tests/study.test.ts` pins the hash of an earlier uncommitted edit of `allin-original.ts` (38bd247b…), while the file now equals its committed version (42f2b7e7…, `git diff` empty).

Data (git-ignored under `data/`): `data/VGT/VGT-2005-2026.csv` and `data/stooq/processed/*`. The CBOE VIX history used is in `data/raw/cboe/` here, with its provenance.

## Code

`src/drawdown-entry/`, entry point `src/app/drawdownEntry.ts`. Nothing else in the repository was changed: `src/app/allin-original.ts` (checked by sha256 in the tests) and `src/app/allIn.ts` (the minute strategy) are untouched.

| Module | Role |
|---|---|
| `engine.ts` | The original's daily state machine with a pluggable entry policy; same-close and next-open execution; cash costs; margin-rate setting |
| `features.ts` | 36 point-in-time indicators (VIX lagged one session; proxies by exact date, never forward-filled) |
| `events.ts` | Episodes, candidates, signal sessions, censored labels, MAE, threshold timing |
| `policies.ts` | Families A–F and the placebo |
| `metrics.ts`, `stats.ts` | Window metrics, missed winners, avoidance, decision counts; Wilson, cluster bootstrap, AUC, Spearman |
| `study.ts`, `final.ts`, `cli.ts` | Phases, selection, walk-forward, holdout, robustness, tables, charts |
| `goldenMaster.ts` | Runs the untouched original and compares all five output files |

## Machine-readable outputs (`results/`)

| File | Contents |
|---|---|
| `episodes_full.csv`, `candidates_full.csv`, `signals_full.csv` (`_dev` = outcomes censored at 2022-12-30) | Event-, candidate- and signal-level datasets with labels, MAE, every feature and the baseline's outcome |
| `decisions_all_rules.csv`, `decisions/<rule>_<execution>.csv` | Every logged decision with its reason, for all rules (2014–2026) |
| `trades_all_rules.csv`, `trades/<rule>_<execution>.csv` | Per-trade results for every rule and execution |
| `grid_development.csv`, `grid_holdout_not_for_selection.csv`, `frozen_comparison.csv` | Strategy metrics vs A |
| `walk_forward.json`, `frozen.json`, `validation.json`, `final_run.json` | Selection record and validation |
| `feature_diagnostics_*.csv`, `flag_diagnostics_*.csv`, `placebo_*.csv`, `cross_etf.csv`, `golden_master.json` | Diagnostics |
| `tables/*.md` | Every table quoted in the reports |
