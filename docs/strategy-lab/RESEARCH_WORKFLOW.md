# Strategy Lab — research workflow and direction

This is the lasting design and research note for how Strategy Lab is meant to be used. It extends the growth-entry
plan ([../research/growth-entry-discovery/PLAN.md](../research/growth-entry-discovery/PLAN.md)) and follows the Study 8
methodology ([STUDY8_METHODOLOGY.md](STUDY8_METHODOLOGY.md)).

## 1. Division of responsibilities

| In the browser (Strategy Lab) | Only in Claude/CLI research workflows |
| --- | --- |
| Inspect saved runs: entries, exits, rejected signals, prices, parameters, provenance | Parameter sweeps, grid or random searches, optimisers (NSGA-II, Sobol …) |
| Edit an entry strategy's parameters and run **one** test of **one** configuration on real data | Selection, neighbourhood robustness, role assignment, ranking |
| Watch its progress; read its errors and log | Frozen protocols, sealed records, chronological test doors |
| Bookmark, title and annotate runs and variations; compare two runs on one symbol | Importing the *finished* records of those studies (read-only) |

There is no "Optimize", "Sweep" or batch button, and no API endpoint that launches one. The tests prove both.

## 2. Manual exploration is not validation

Strategy Lab is for **learning and formulating rules**: look at where a mechanism fires, edit a parameter, run again,
compare. That is exploratory and hindsight-prone. Every chart you look at is data you have seen.

- **Explore on training dates.** The form's default is the training partition (2016-01-04 → 2023-12-31). A window that
  reaches holdout or final dates is labelled as exposure. Every run records which partitions it touched.
- **Treat what you have looked at as spent.** Write a hypothesis down (a note on the variation) before running it.
  Assume that every variation you inspect is part of the search budget a later study must account for.
- **Never call an entry profitable.** Entry signals are not trades. The analysis shows forward moves after signals
  (5/21/63-session returns, MFE/MAE, time to +5/+10/+15%) next to an every-session baseline, with censored values
  excluded. It shows no P&L, because a signal has no exit.
- **No "best strategy" claims from the UI.** Selection happens in a frozen protocol with chronological doors (§5).

## 3. Roadmap

| # | Stage | Where |
| --- | --- | --- |
| 1 | **Discover entry mechanisms:** a few structurally distinct ideas (rise from recent low is the first) | Code (`src/entry-signals/`) + Strategy Lab |
| 2 | **Inspect and objectively evaluate their signals:** placement on the chart, coverage, clustering, forward returns and adverse excursions against the baseline | Strategy Lab (manual runs, notes) |
| 3 | **Iterate manually:** edit X, N and the resolution; compare runs; write findings in notes | Strategy Lab |
| 4 | **Claude-managed parameter sweeps** with a frozen protocol: chronological train/validation folds, neighbourhood (robust-region) checks, the Study 8 discipline | CLI study under `research/<study>/` |
| 5 | **Introduce a small number of frozen exit policies** (controlled, not optimised at first) | CLI study; results imported for display |
| 6 | **Evaluate entries and exits jointly** without uncontrolled search | CLI study |
| 7 | **Validate forward and at portfolio level** (shared margin and slot, allocator, costs, interest), then prospectively | CLI study + Strategy Lab display |

## 4. Using Strategy Lab (guide)

1. **Start it:** `npm --prefix apps/strategy-lab start` and open http://127.0.0.1:4317 or http://apollo:4317 on
   apollo. For other machines on the VPN, use `npm --prefix apps/strategy-lab run start:vpn` instead; see
   [OPERATIONS.md](OPERATIONS.md).
2. **Create a test:** click **+ New test**.
   - The strategy is *Rise from recent low (entry signal)*.
   - The parameters show their units, ranges and defaults (X = 5%, N = 20 bars).
   - Choose the bar resolution, the symbols and a date range (the presets cover the partitions).
   - Optionally give it a title, then click **Run Test**.
   - The run appears at the top of **Recent runs** as `queued` → `running` → `completed`, and its signals appear on the
     chart. Refreshing the page loses nothing.
3. **Change 5% to 6%:** on a completed manual run, open **Parameters**, click **Clone into new test…**, set
   *Advance from recent low (X)* to 6 and click **Run Test**. This creates a **new variation** (`V-…`) and a **new run**
   (`R-…`). The 5% run is never modified.
4. **Select runs.** *Recent runs* lists runs newest first. *Variations* lists variations by their latest result, with
   never-run ones last. *★ Bookmarks* lists bookmarked runs and variations. Search by id, title or symbol, and use
   **Show older…** to page back. The URL (`#/run/R-…?symbol=…`) restores the selection after a refresh.
5. **Bookmark:** hover a list item (or Tab to it) and click ☆; a bookmarked item keeps ★ visible. The run header has
   the same star.
6. **Notes:** under **Notes**, add Markdown notes to the run and to its variation. Edit or delete them there. The list
   shows the latest note's excerpt.
7. **Symbols:** a multi-symbol run has one tab per symbol. Each tab shows only that symbol's price and events (the
   chart, tooltips, table and analysis). Switching symbols clears the selected event and keeps the zoom when it fits.
8. **Measure:** drag across the chart to see the price change between two points (Eastern times, $ and %; green up,
   red down), from the earlier point to the later one, whichever way you drag. Escape or a click clears it. Zoom with
   the mouse wheel (around the cursor), the buttons or the overview; dragging never zooms.
9. **Compare:** pick a run under **Compare with (B)**. Its events for the same symbol appear in orange; run A's are in
   aqua.
10. **vg-balanced:** open *vg-balanced (s8-vg-balanced) — Study 8 #2 replay* (experiment *Study 8 imports*).
   - **VGT tab:** 6 entries, 6 exits and 7 rejected signals. **GDX tab:** 42 entries, 41 exits (one lot is still open
     at the end) and 7 rejected signals.
   - Hover or click a marker for its Eastern date and time (EST/EDT), fill price, reason and trade link.
   - The legend toggles each category.

## 5. Claude-led optimisation without a UI button

A future optimisation of an entry mechanism follows [STUDY8_METHODOLOGY.md](STUDY8_METHODOLOGY.md) §8:

- a frozen protocol;
- training-only search doors with expanding-window folds;
- neighbourhood scoring (robust = ½ median + ½ p10);
- roles;
- one-time test doors that may only veto;
- hash-chained records;
- 2025–2026 treated as exposed.

It runs entirely as a CLI study (`research/<study>/`, its own `src/<study>/` namespace). Export and import to Strategy
Lab:

1. The study writes its finished, sealed outputs, as Study 8 did: the selection file, the per-candidate test records
   and lot ledgers, plus a manifest with sha256.
2. An importer CLI (in the style of `apps/strategy-lab/importers/study8.ts`) reads them **read-only**, verifies the
   hashes against the study's chain, and writes:
   - one `optimization_batches` row (study reference, methodology reference, source path and sha256, summary);
   - one `optimization_trials` row per reported configuration (parameters, metrics, role, rank);
   - optionally, for the nominated candidates, a full `import` run with entry and exit events, reconciled with the
     study's sealed record. This is how vg-balanced is imported today.
3. Strategy Lab displays them. The browser never starts, resumes or schedules a search.

**How vg-balanced was imported.**

- **Source.** `npm run study8-run -- run s8-vg-balanced --end 2026-10-29`. This is the existing Study 8 local runner
  (`src/study8-runners/`, unchanged pools engine and phenotypes). It writes `lots.json` (funded lots with minute
  decision, fill and exit times, fill prices, exit reasons) and `signals.csv` (every funding decision, granted or
  refused, with the reason).
- **Verification.** The importer refuses unless all three hold:
  1. The runner reconciled the run with the sealed F24 test record: totals and trade by trade, 48 of 48 lots, 0
     mismatches.
  2. The importer's own check agrees: every lot's symbol, New York entry and exit minute, open flag and net to the cent
     match `research/study8-expanded-regime-d1/results/test/F24/test-lots.jsonl.gz` (holder
     `VG/F24/VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d`).
  3. Every granted decision in `signals.csv` matches a lot's decision.
- **Events.**
  - `executed_entry`: the fill minute, fill price, decision time and price;
  - `executed_exit`: the fill minute, fill price, exit reason;
  - `rejected_signal`: the decision minute; price not recorded (`null`), with the refusal reason.
- **Missing from the artifacts** (stated, not invented): broker order IDs, commissions (the engine charges $0; friction
  is 5 bps per side) and tick-level fill detail. Fills are at minute-bar prices. Prices are in first-session share
  units, with VGT's 8:1 split on 2026-04-21 forward-adjusted.
