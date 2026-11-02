# Study 8 local strategy runner

Execution tooling only. It runs **existing** D1 strategies on the local minute data through the **unchanged** pools
engine:

- the Study 8 candidates (from the sealed, training-only F24 ranking and shortlists);
- the frozen controls;
- Study 7's research references.

Nothing is optimized, re-tuned or re-selected. No D1 rule, allocator semantics or phenotype value changes.

It is a slim adapter over the Study 7 runner (`src/study7-runners/`). It reuses that runner's tested helpers unchanged:

- cost validation;
- the summary row and the reproducibility metadata;
- the to-the-cent, lot-by-lot reconciliation.

The Study 7 runner's own aliases (frozen controls, Study 7 candidates) are resolved and reconciled by that runner's
code. Its alias map is not modified.

## The seven named strategies (all local history)

Each alias resolves from the sealed records: `FROZEN_SELECTION.json` (F24 ranking, roles and shortlists), the
research configuration of that shortlist member, and the one-time F24 test record. Its books must equal the sealed
parameter vectors, or the runner refuses.

| # | Strategy | Command | Resolves to |
|---|---|---|---|
| 1 | Study 8 #1 VG profit | `npm run study8-run -- run s8-vg-profit` | F24 rank 1, VG profit; `S8-VG-F24-1`; `VGT:d1-f41ebcd961+GDX:d1-016d8e4257` |
| 2 | Study 8 #2 VG balanced | `npm run study8-run -- run s8-vg-balanced` | F24 rank 2, VG balanced; `S8-VG-F24-3`; `VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d` |
| 3 | Study 8 #3 VXRG profit | `npm run study8-run -- run s8-vxrg-profit` | F24 rank 3, VXRG profit; `S8-VXRG-F24-1` (VGT+XBI+XRT+GDX) |
| 4 | Study 8 #8 VXRKG profit | `npm run study8-run -- run s8-vxrkg-profit` | F24 rank 8, VXRKG profit; `S8-VXRKG-F24-1` (all five ETFs) |
| 5 | Study 8 #15 VXR profit | `npm run study8-run -- run s8-vxr-profit` | F24 rank 15, VXR profit; `S8-VXR-F24-1` (VGT+XBI+XRT) |
| 6 | Frozen B1 (VGT `primary`) | `npm run study8-run -- run vgt-primary` | the frozen B1 book, through this pools engine at 5 bps |
| 7 | Frozen B5 five-book pool | `npm run study8-run -- run b5-frozen` | `config/pools/B5.json` |

All seven in one run, on one window and one friction (in this order):

```
npm run study8-run -- compare s8-vg-profit s8-vg-balanced s8-vxrg-profit s8-vxrkg-profit s8-vxr-profit vgt-primary b5-frozen
```

**Equivalent aliases.** `s8-vg-best`, `s8-vxrg-best`, `s8-vxrkg-best` and `s8-vxr-best` resolve to the same sealed IDs
as the profit aliases above; `s8-vg-3` is the same as `s8-vg-balanced`. `compare --all` is a different set (the six
track bests with B1 and B5) and is unchanged.

**B1.** It runs through this pools engine with the pools costs (5 bps per side, 11%, the $100,000 slot). Its figures
are therefore not those of the ordinary 0-bps standalone CLI.

## Prerequisites

- Node **v24.21.0** (`.node-version`); for example
  `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.
- The Study 8 branch (`research/study8-expanded-regime-d1`), with the study's sealed records:
  - `research/study8-expanded-regime-d1/FROZEN_SELECTION.json`;
  - `results/test/F24/test.json` and its lot ledger;
  - the local hash chain with phase `test-F24`;
  - the research configurations `config/research-pools/study8-expanded-regime-d1/S8-<TRACK>-F24-<n>.json`.
- The runner refuses to resolve a Study 8 alias before the one-time F24 test is sealed.
- Local canonical data: `data/{VGT,XBI,XRT,KRE,GDX}/data.csv` (git-ignored).
- Run every command from the repository root, inside the git checkout. B1 and B5 verify their frozen source with
  `git show`.

## Commands

```
npm run study8-run -- list
npm run study8-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
npm run study8-run -- compare <alias> <alias> … [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
npm run study8-run -- compare --all [--end …] [--cost-bps …] [--out …]
```

**Defaults:**

- `--end`: the **latest common complete session**. That is the latest New York session that the local file of every
  ETF the run reads holds completely. A `compare` uses the files of all its strategies, so it has one cutoff.
  - A session is complete once its file holds a bar at or after the regular close: 4:00 p.m., or 1:00 p.m. on an
    early-close day. That bar is the closing print the shared session builder uses as the official close.
  - So a day appended only in part never becomes the default end: bars up to mid-session, or pre-market bars only.
  - An explicit `--end` after that session is refused (exit 2), with the reason (for example "GDX holds 2026-10-30
    only up to 11:00 ET").
  - Omitting `--end` never caps a run at the old 2026-10-29 endpoint. A run goes as far as the data is complete. There
    is no `all`/`latest` keyword; use `--end YYYY-MM-DD` for a historical cutoff.
- `--cost-bps`: 5 bps per side.
- 11% simple interest; the fixed $100,000 single funded slot, no compounding.

**Unchanged from the pools engine:**

- accounting from the close of 2016-01-04 and arming on 2017-06-15;
- stops fill at the stop or the gapped open;
- shadow books; first executable signal wins; same-minute ties alphabetical.

**`compare`** refuses configurations whose conventions differ, and refuses an alias listed twice.

**Errors.** Exit 2 for a usage error: an unknown alias, a bad option or date, an `--end` after the latest complete
session, or an existing `--out`. Exit 1 for an engine, integrity, reconciliation or export-check failure.

## Aliases

| Alias                                                                 | What it is                                                                                                                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `s8-<track>-profit` / `-robust` / `-balanced` / `-extra1` / `-extra2` | the sealed F24 role holder of that role (an error if the role is empty: no qualified candidate)                                                                                                |
| `s8-<track>-best` | the frozen nomination rule within the track: its top-ranked F24 role holder that the one-time test did not fail; if every holder failed, its top-ranked holder; if it has none, its F24 shortlist member 1 (labelled: no role, never a nominee) |
| `s8-<track>-<n>`                                                      | the track's F24 shortlist member n (training order)                                                                                                                                            |
| `vxr-frozen`, `vxrg-frozen`                                           | B5's VGT/XBI/XRT (and GDX) books, unchanged (`config/research-pools/study8-local-runners/`)                                                                                                    |
| Study 7 runner aliases                                                | `vgt-primary` (B1), `vg-frozen`, `gdx-portfolio-aware`, `b5-frozen`, `gdx-study5-nearmiss1`, `vg-profit`, `vg-robust`, `vg-balanced`, `vxr-profit`, `gdx-profit`, `gdx-balanced`, `gdx-robust` |

`<track>` is one of `g`, `v`, `vg`, `vxr`, `vxrg`, `vxrkg`. `list` prints every alias with:

- its F24 training rank;
- its 2025–2026 T-gate status;
- its configuration;
- its latest complete session.

**Status labels** come from the sealed records:

- A role holder whose T gates did not fail is a **research nomination**: retrospectively chronologically persistent,
  NOT DEPLOYED.
- A failed one is not a nomination.
- Shortlist members without a role are never nominees.

## Outputs

Every run writes a **new** directory: `evaluations/study8-runs/<UTC stamp>-run-<alias>/`, or
`…-compare/<alias>/` inside a comparison. It is git-ignored and never overwritten:

- the directory is created atomically, so concurrent runs started in the same second get `-2`, `-3`, … suffixes;
- an existing `--out` is refused;
- `research/`, `config/`, `data/` and `src/` are refused;
- a run that fails before writing anything removes its empty directory.

| File | Contents |
|---|---|
| `runner-summary.txt` | The human-readable report, also printed by `run`. Sections: P&L (net = realized + unrealized; gross − friction − interest); drawdowns in $ and % of the slot with peak, trough and recovery; by ETF; execution and risk (signals, refusals by reason, occupancy, exit reasons and fill types, holding times, win rate, profit factor, MAE/MFE); by year; a month grid; the five data files; engine and config hashes; runtime; reconciliation; export check. |
| `lots.txt` | One labelled block per funded lot. |
| `lots.csv`, `lots.json` | The audit ledger, one row per funded lot in entry order (fields below). `lots.json` adds the definitions and the list of unavailable fields. |
| `trades.csv`, `trades.json` | The pools engine's standard funded-trade ledger (unchanged format). It holds the same lots, and the same money values, as `lots.csv`. |
| `report.txt` | The pools engine's report, with the full trade table (printed by `run` unless `--quiet`). |
| `signals.csv` | Every funding decision of the shadow books: granted or refused, with the reason and the lot that held the slot. |
| `daily.csv`, `monthly.csv`, `yearly.csv` | Session marks, and the marked P&L change and interest per period. |
| `summary.json` | The pools engine's run record. |
| `runner.json` | Alias, Study 8 status, books, config/phenotype hashes, window (requested end, latest common complete session, whether it reaches past 2026-10-29), conventions, the five data files' provenance, market-event files, diagnostics, reconciliation, export check, runtime, reproducibility (git, Node, engine file hashes and digest, runner file hashes). |

A `compare` directory adds:

- `compare.md`: the table, a year-by-year side-by-side, provenance and labels;
- `compare.csv`, `compare-yearly.csv`, `compare.json`.

**Fields of `lots.csv`.** These are the engine's own values unless stated otherwise; `lots.json` `definitions` spells
each one out.

- **Identity:** `trade`, `lot`, `symbol`, `status` (`closed` | `open`).
- **Entry:** `entrySetup` (D1 `deep` decline or post-exit `continuation`); `decisionTime{Utc,NewYork}` and
  `decisionPrice`; `entryTime{Utc,NewYork}`, `entryFillReason`, `entryFillPrice`, `entryPriceAfterFriction`;
  `shares`, `principal`.
- **Exit:** `exitTime{Utc,NewYork}`, `exitReason`, `exitFillReason`, `exitFillPrice`, `exitPriceAfterFriction`.
- **Open lots:** `asOfSession`, `asOfMarkTimeUtc`, `asOfMarkPrice`, and `exitFrictionCharged` ("no" for an open lot).
- **Holding:** `calendarDaysHeld`, `sessionsHeld`, `interestDays`.
- **Money:** `grossPnl`, `entryFriction`, `exitFriction`, `totalFriction`, `marginInterest` (accrued to the as-of
  session for an open lot), `realizedNet` / `unrealizedNet`, `net`, `cumulativeNet`.
- **Excursions:** `mae{Dollars,TimeUtc,TimeNewYork,PercentOfPrincipal}` and the same four for `mfe`, plus
  `excursionMarks` and `mfeStatus`.
- **Slot:** `sameMinuteCandidates`, `signalsRefusedWhileHeld`, `refusedSymbols`.

Notes:

- `…NewYork` times are America/New_York wall-clock time, labelled `ET`.
- Minute bars are stamped with their start. The decision time is the end of the signal minute, so the decision and
  the entry often show the same clock minute.
- Prices and shares are in the run's first-session share units (VGT's 2026-04-21 8:1 split is forward-adjusted).
  Dollar amounts are unaffected.

**MAE and MFE.**

- The MAE is the engine's worst mark while held: shares × last price − principal − accrued interest, floored at $0.
- The engine does not record the MFE. The runner replays the engine's marks with its own price arrays and
  `FixedLedger.mark`: every regular-minute bar of the lot's ETF while held, and each session close held through.
- A lot's MFE is reported only if that replay reproduces the engine's MAE, its time and its mark count exactly
  (`mfeStatus` = `verified replay`). Otherwise it is "unavailable", never estimated.

**Not available** (documented in `lots.json` `unavailable`):

- broker order IDs (this is a backtest);
- commissions (the engine charges $0; all friction is the per-side bps cost);
- tick-level fill detail (fills are at minute-bar prices).

**Export check.** After writing, the runner re-reads `lots.csv`, `lots.json`, `trades.csv`, `yearly.csv` and
`monthly.csv`. It checks:

- counts, net, realized, unrealized, interest, friction and gross against the run's figures, to the cent;
- that the period files sum to the net;
- per-ETF nets and counts;
- `lots.csv` against `trades.csv`, lot by lot, as exact text.

A failure exits 1.

The runner never writes into the study's records. In particular it does not append to the study's door log; each
run's provenance is its own `runner.json`.

## Data provenance and appended bars

Every run and comparison prints all five canonical files, whichever ones it reads. For each file it shows:

- the sha256, bytes and rows;
- the last bar (ET) and the latest complete session (with any incomplete trailing day);
- the Study 8 status:
  - `= Study 8 pinned file`;
  - `= Study 8 pinned file + N appended bytes (pinned prefix verified)`: the first pinned-length bytes still hash to
    Study 8's pin (`results/protocol_freeze.json`);
  - `DIFFERS from the Study 8 pinned file`: history changed;
- whether the file's `dataset-report.json` still describes it.

Appending minute bars needs no change here:

- The `all` partition has no end date (`data/partitions.json`), and nothing in the runner pins a data hash.
- The next complete session simply becomes the default end.
- The study's sealed records, chain and door log are only read.

## Reconciliation

A run ending on **2026-10-29 at 5 bps** is compared with the sealed records:

- **Study 8 aliases:** the F24 test record (`results/test/F24/test.json` and `test-lots.jsonl.gz`):
  - **role holders and the frozen VXR/VXRG controls:** totals to the cent (net, realized, unrealized, interest,
    friction, minute and daily DD, lot count) and **trade by trade**;
  - **other shortlist members:** totals only (the sealed record keeps no ledger for them).
- **Study 7 aliases (including B1 and B5):** reconciled by the Study 7 runner against Study 7's sealed final door (the
  same convention).

This also holds when the files extend past 2026-10-29: with `--end 2026-10-29` the run uses only sessions up to the
sealed endpoint.

A run past 2026-10-29, at another cost or on another window is reported as **not applicable**, never as a PASS or a
FAIL. Runs past 2026-10-29 also carry a NEW LOCAL DATA label: those sessions are not part of any Study 8 record, and
they are neither validated nor prospective.

If the data before 2026-10-29 itself changed (`DIFFERS`), a run to 2026-10-29 still reconciles. A FAIL then reflects
that the data differ.

**All history through 2026-10-29 was inspected before Study 8.** The 2025–2026 results are a one-time retrospective
evaluation on a closed but previously inspected window, not independent validation or prospective monitoring.

## Limitations

- **Calendar end.** The shared NYSE calendar (`src/lib/calendar.ts`) ends on 2026-12-31. Bars after it are ignored
  and flagged, and the default end stops there. Extending the calendar changes shared code: a separate change.
- **Closing print.** A session whose file ends exactly at 3:59 p.m., with no closing print or later bar, is treated as
  incomplete until a later bar arrives.
- **Distributions.** `config/market-events/distributions.csv` is loaded (its hash is in `runner.json`), but fixed-pool
  runs book no distributions.
