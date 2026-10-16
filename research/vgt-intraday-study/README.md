# VGT intraday entries, trailing stops and correction-size policies (no optimization)

**Status: complete (2026-10-15). Uncommitted. No parameter was optimized and no production setting was changed.**

## What was tested

The study asked whether the incumbent one-minute VGT margin dip-buy strategy (`src/app/allIn.ts`) would benefit from any of three changes:

1. entering during the session rather than one minute before the close;
2. a causal, minute-updated trailing stop;
3. entry timing conditioned on the depth of the correction.

It used a frozen catalogue of policies, fixed in advance:

| Phase | What was fixed in advance |
|---|---|
| Phase 1 | 11 entry policies, run with the incumbent's daily stop |
| Phase 2 | Both stop models, crossed with every entry policy |
| Phase 3 | 4 depth bands, 3 conditional policies |

All seven incumbent parameters were held fixed throughout: 2.5% / 2.1% / 8 calendar days / 78 sessions / 2.2% / 4.0% / 36.7%, with $100k per position at 11%.

## Executive findings

These figures use the warm-start run from 2016-10-07 to 2025-10-13, at 5 bp/side, per $100,000 borrowed. On this basis the incumbent nets **$186,172** with a **$25,914** minute-sampled drawdown.

- **Earlier entry loses, consistently.** All 10 unconditional intraday-entry policies trail the incumbent, by **−$53k to −$101k**. The fill model and the cost level do not change this.
  - They are negative in most calendar years and in 24–29 of 29 staggered starts.
  - Every one of them breaches the $30k minute-drawdown gate in at least one cost/fill scenario.
- **The missed opportunity is real but small.** Waiting for the close misses 57 shallow dip-and-recovery sessions. Capturing them is outweighed by buying first touches that keep falling: entries above that day's close fill that then lost cost **$93k–$151k** per rule.
- **The only regime where buying early pays is February–April 2020** (+$10.6k to +$19.8k for 9 of 10 rules). Early entry loses in Q4 2018, in 2022 (up to −$39k) and, for most rules, in spring 2025.
- **The minute-updated stop (an experimental exit rule) slightly hurts the incumbent's entry** (−$2.2k, with minute DD $1.8k worse).
  - It improves most intraday-entry variants, by up to +$25.7k, mostly in 2020 and 2025.
  - It never lifts any of them above the incumbent.
- **Correction depth changes the size of the damage, not its sign.**
  - Shallow pullbacks carry most of the early-entry losses.
  - Extreme declines show one big rebound capture (2020) and losses in every other extreme episode.
- **None of the three frozen depth-conditional policies beats the incumbent.** `BAND_LATE_DEEP` (don't buy deep declines early) comes closest at −$8.5k, which is indistinguishable from it.
- **Verdict under the predeclared rules: argues against further optimization** of intraday entry, depth-conditional entry, or minute-updated stops for this strategy. The most useful next evidence is fresh minute data after 2025-10-13 for the unchanged incumbent.

Full answers are in [CONCLUSIONS_AND_NEXT_STEPS.md](CONCLUSIONS_AND_NEXT_STEPS.md).

## Reports

| File | Contents |
|---|---|
| [PROTOCOL.md](PROTOCOL.md) (+ [PROTOCOL.sha256](PROTOCOL.sha256)) | Frozen design, written and hashed before any study code or result existed (`03418fd4…`, 2026-10-15T16:15:52Z). No amendments. |
| [BASELINE_EQUIVALENCE.md](BASELINE_EQUIVALENCE.md) | Golden master: byte-identical reproduction of `allIn.ts` (7 cases × 5 files); legacy (cold) vs warm start |
| [PHASE1_ENTRY_RESULTS.md](PHASE1_ENTRY_RESULTS.md) | All entry policies with the incumbent's daily stop: P&L, risk, costs, opportunities, attribution, years, regimes, windows |
| [PHASE2_EXIT_RESULTS.md](PHASE2_EXIT_RESULTS.md) | Entry policy × stop model factorial; paired stop effects, churn, interaction |
| [PHASE3_CORRECTION_SIZE.md](PHASE3_CORRECTION_SIZE.md) | Decision-time band diagnostics for all policies under both stop models; year/regime × band; crash split |
| [PHASE3_CONDITIONAL_POLICIES.md](PHASE3_CONDITIONAL_POLICIES.md) | The three conditional policies × two stop models against the incumbent and their constituents |
| [DIVERGENCE_ANALYSIS.md](DIVERGENCE_ANALYSIS.md) | First divergences, largest episodes, paired trade timelines |
| [RISK_AND_EXECUTION.md](RISK_AND_EXECUTION.md) | Clock and fill conventions, causality safeguards, stop fills, costs, the drawdown gate, data, tests |
| [CONCLUSIONS_AND_NEXT_STEPS.md](CONCLUSIONS_AND_NEXT_STEPS.md) | Answers to the required questions; mechanism-family verdicts |
| [replay/REPLAY_REPORT.md](replay/REPLAY_REPORT.md) | Independent Python replay (standard library only, written without seeing the engine): 8 configurations match exactly |

The tables in the reports are generated and kept in [tables/](tables/). The `reports` command refreshes the copies embedded between `<!-- include -->` markers.

## Machine-readable results ([results/](results/))

| File | Contents |
|---|---|
| `summary.json` / `summary.csv` | Every window × policy × stop model × fill × cost (448 rows) at full precision: net, gross, interest, fees, turnover, trade statistics, minute and daily DD with dates, exposure, holds, exit mix, no-fills, gate blocks, opportunity classes, year and regime changes |
| `paired.json`, `paired_entry_vs_close.csv`, `paired_minute_vs_daily_stop.csv`, `paired_conditional_vs_constituents.csv` | Paired deltas, year/regime deltas, leave-outs, episode totals by type and band |
| `divergence_episodes.csv` | Every divergence episode at 5 bp, with the trades involved |
| `band_diagnostics.*`, `band_by_year_and_regime.*` | Phase 3A band diagnostics |
| `session_facts.csv` | Decision-time record per session: final decision price, band and benchmark fill, first qualifying minute from 09:35/10:00 and its band, deepest minute, regime labels |
| `ensemble.*` | 29 staggered flat starts × every policy × stop model × fill |
| `classification.json`, `missed_opportunities.json` | Predeclared categories; the incumbent's missed dip-and-recovery sessions |
| `runs/<window>/<policy>__<stop>__<fill>/` | Per-run `trades.csv` (dates, ET times, decision price/depth/band, fill and exit execution, stop, reasons, interest, fees and net at every cost level, worst mark), `daily.csv` (equity at every cost level, running minute DD, exposure, restriction, state signature) and `setup_diagnostics.csv` |

Provenance is in [provenance/](provenance/):

- protected-file hashes and `git status` at start and end;
- the pre-study test run;
- `test-results.md`;
- `determinism.json`, which shows a full rerun was byte-identical;
- `manifest.json`, with SHA-256 for every source and result file, the protocol, protected files, Node version and git HEAD.

## Reproduce

From the repository root, with Node v23.6.1 as used here:

```sh
N="node --experimental-transform-types --disable-warning=ExperimentalWarning"
$N src/app.ts intradayStudy verify-protected   # protected files unchanged since the study started
$N src/app.ts intradayStudy golden-master      # allIn.ts vs study engine, 7 cases (~20 s)
$N src/app.ts intradayStudy run                # full run matrix + ensemble (~80 s)
$N src/app.ts intradayStudy tables             # tables/*.md from results/
$N src/app.ts intradayStudy reports            # refresh tables embedded in the reports
$N src/app.ts intradayStudy determinism        # rerun into a temp dir, compare every file
$N src/app.ts intradayStudy manifest           # provenance/manifest.json
$N src/app.ts intradayStudy all                # all of the above in order
$N --test 'src/intraday-study/tests/*.test.ts' # the study's 33 tests
python3 research/vgt-intraday-study/replay/replay.py --compare   # independent replay
```

`npm run app intradayStudy <command>` also works, but its `preapp` hook lints and type-checks the whole repository first. No `package.json` change was needed or made: `src/app.ts` dispatches to `src/app/intradayStudy.ts`.

## Code (new, isolated)

| Path | Purpose |
|---|---|
| `src/app/intradayStudy.ts` | CLI entry |
| `src/intraday-study/constants.ts` | Fixed constants, policy catalogue, bands, windows, regimes |
| `src/intraday-study/data.ts` | Loads through the incumbent's loader and grouping; frozen sessions; reference highs; decision-time session facts |
| `src/intraday-study/policies.ts` | Entry state machines |
| `src/intraday-study/exits.ts` | `STOP_MINUTE_CAUSAL`. `STOP_DAILY` is the incumbent's own exported `evaluateSessionExit`. |
| `src/intraday-study/engine.ts` | The generalized incumbent session loop, with marks, drawdowns and the fee overlay |
| `src/intraday-study/legacy.ts`, `goldenMaster.ts` | `allIn.ts`-format output and the golden master |
| `src/intraday-study/analysis.ts`, `study.ts`, `report.ts`, `cli.ts` | Metrics, paired divergence decomposition, band diagnostics, run matrix, tables |
| `src/intraday-study/tests/` | 33 tests |

Prior work was only imported read-only:

- `allIn.ts` exports;
- `src/lib`;
- `src/minute-optimizer/fixtures.ts`, for seeded synthetic minute files in tests.

Nothing in `research/vgt-minute-optimizer/`, `research/multi-asset-optimizer/`, `src/minute-optimizer/` or `src/optimizer/` was modified. The prior minute-optimizer freeze and its held-out evaluation were not touched.

## Sources and data

| Item | sha256 | State |
|---|---|---|
| `src/app/allIn.ts` | `71c5c327…` | Authoritative working-tree version; unchanged before and after. Its header comment is stale (see BASELINE_EQUIVALENCE.md). |
| `src/app/allin-original.ts` | `38bd247b…` | Pre-existing uncommitted edit; unrelated and unused; unchanged by this study |
| `data/VGT/VGT-2016-2025-1-minute.csv` | `600322af…` | Raw Alpaca minute bars, 2016-01-04 → 2025-10-13, 2,459 sessions; not re-audited; unchanged |

## Limitations

- **No out-of-sample evidence.** All years were used by earlier studies, the incumbent's parameters were fitted on them, and 2024–25 was inspected repeatedly. No data after 2025-10-13 exists in the file or was used.
- **Single historical path.** Totals move by tens of thousands with one episode (for example March 2020). The ensemble of 29 starts shares most of its history, so its starts are not independent samples.
- **Execution is modeled with proxies.** Fills are taken from minute OHLCV without bid/ask. The `stop` fill is optimistic, and `next-open` is a proxy, not a guarantee.
- **Excluded from the accounting:**
  - dividends: raw prices, with no cash distributions credited;
  - taxes;
  - financing beyond 11% simple interest on calendar days.
- **Interest ignores the time of day,** so it slightly favours intraday entries.
- **Drawdowns are per $100,000 borrowed allocation,** not portfolio drawdowns or margin-call analysis.
- **The bands use the strategy's rolling 78-session reference high,** not an all-time high. The deep bands rest on about four independent market episodes.
