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
| Run **one** selected frozen phenotype of a finished study; compare two existing runs side by side; download a research bundle | Choosing and exporting the phenotypes; any batch of runs |

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
- **A trading backtest is one exploratory configuration.** Its P&L is real accounting of simulated fills, but on data
  you have seen. Its defaults (the D1 baseline exits) were not optimised for it, and one good run is not an edge.
- **No "best strategy" claims from the UI.** Selection happens in a frozen protocol with chronological doors (§5).
- **Interactive Preview is exploration too.** Each preview is one explicit configuration you chose; nothing searches,
  and nothing restricts or presets the dates you pick. A long sequence of previews is still a search you performed by
  hand: count it as spent, exactly like saved runs.

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
   - Choose the strategy in the **Strategy to test** select (one compact row; open it with a click, ↓, Enter or
     Space, or by typing the first letter). It lists every strategy with its version, badge and full description;
     ↑/↓ move, Enter or Space choose, Escape closes it without a change. The choice's full description stays below
     the select. *Rise from recent low (entry signal)* is signal-only; **Growth** is the trading backtest that buys on
     those signals and has exits and P&L ([GROWTH_TRADING.md](GROWTH_TRADING.md)).
   - Growth's optional groups are all OFF by default; switched ON, each shows only the chosen method's or policy's
     inputs. *Entry trend filter* blocks entries whose recent trend fails (five methods, lookbacks in trading
     sessions). *Persistent entry eligibility* keeps a signal available for at most W sessions under one of five
     policies ([GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md)). *Continuation entries* adds entries after a
     profitable exit ([GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md)). Since 1.3.0: *Entry method* chooses the Rise
     entry (default) or the trend breakout (its SMA inputs are part of the method; eligibility is then not applicable);
     *Initial risk stop* adds a fixed fill − m × ATR stop; *Retain part of profitable trend* sells only a fraction at the
     first trailing-stop event and exits the rest on closes below an SMA ([GROWTH_OPTIONAL_RULES.md](GROWTH_OPTIONAL_RULES.md)).
     Compare an option with Candidate A by cloning it and switching only that option ON.
   - The trading backtest adds the exit rules (a mandatory trailing stop, plus switches for the maximum losing hold and
     the buffered intraday loss) and the cost per side.
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
8. **Measure:** hold the mouse button and drag across the chart to see the price change between two points (Eastern
   times, $ and %; green up, red down), from the earlier point to the later one, whichever way you drag. It is shown
   only while the button is held: releasing it (anywhere) or pressing Escape clears it. Zoom with
   the trackpad or mouse wheel around the cursor (a two-finger swipe up zooms in, down zooms out), the buttons or the
   overview; dragging never zooms. Hold ⌘ (macOS) or Ctrl (Windows, Linux), or Shift, while dragging to pan instead:
   dragging left shows later times, and the zoom level stays the same.
9. **Compare:** pick a run under **Compare with (B)**. Its events for the same symbol appear with an orange halo,
   and the event table and tooltips label them B. Marker colours mean the trade outcome for both runs: green net
   profit, red net loss, grey breakeven, blue open, purple rejected (see the legend).
   - The **Compare** panel first says whether A and B are methodologically comparable (same strategy and version,
     symbols, window, resolution, costs, capital model and base parameters) and lists every difference. Then: the
     metrics side by side with B − A (net, gross, costs, interest, trades, wins/losses, worst trade, holding, exposure,
     minute and daily drawdown), the trades matched by decision instant (identical, shifted, only in A, only in B, with
     their origin) and the continuation windows (captured, expired with a later higher high, closed by a base entry).
   - **Continuation (or an entry gate) ON vs OFF.** Clone the ON run, switch that option OFF (nothing else) and run it;
     then compare. B − A is the path-dependent counterfactual of the switch; it is not the P&L of the trades that
     option opened, because the later trade sequence changes. Comparing never starts a run. From the CLI,
     `npm run growth-paired -- --request <run dir>/request.json` writes the paired entry-gate diagnostic (two runs on
     identical data; retrospective).
10. **vg-balanced:** open *vg-balanced (s8-vg-balanced) — Study 8 #2 replay* (experiment *Study 8 imports*).
   - **VGT tab:** 6 entries, 6 exits and 7 rejected signals. **GDX tab:** 42 entries, 41 exits (one lot is still open
     at the end) and 7 rejected signals.
   - Hover or click a marker for its Eastern date and time (EST/EDT), fill price, reason, and the trade's net P&L.
     Hovering an entry or exit highlights its partner and draws a connector between them. Clicking either one selects
     the lot under **Trades** and shows its details beneath.
   - The legend toggles each category.
11. **Closed losses only:** above the Trades list. Closed trades whose net after costs and interest is below zero;
   open positions and breakevens are excluded; the chart is not filtered.
12. **Phenotypes:** the header's *Phenotypes* tab ([PHENOTYPES.md](PHENOTYPES.md)). Find a phenotype, inspect its locked
   configuration and data exposure, **Run selected phenotype…** for ONE run (an edit becomes a derived variation; a
   shared-slot pool keeps its books and start and only takes an end date).
13. **Export research bundle:** in a completed run's header ([EXPORTS.md](EXPORTS.md)) — a ZIP with the unmodified
   artifacts, CSV ledgers, decision log, attribution, README and checksums, for review without the server. With an
   entry gate ON it also holds `entry-decisions.csv`, `opportunities.csv` and `entry-gates.md`: the research log of
   every crossing, opportunity, block and entry.
14. **Entry gates in a run:** the Trades list labels latched and renewal entries (`base Growth · latched O-3`); the
   Analysis panel's *Entry gates* section counts vetoed and deferred signals, trend blocks, opportunity ends and ages,
   and the trades by entry source; each signal's detail lists the observed trend values (`trend.*`) and policy values
   (`policy.*`).
15. **Optional rules in a run (1.3.0):** a partial exit is a half-filled ▼ on the chart and `+ 1 partial` in Trades
   (the detail lists each fill and its own net; the trade's net is the whole position's); the Analysis panel's
   *Optional rules* section counts protected positions, stop exits, blocked decisions and partial fills; the bundle adds
   `exit-fills.csv` and `optional-rules.md`.
16. **Delete a result:** a run's header → **⋯ → Delete result…** → check the id, strategy, symbols and date →
   **Delete result**. It removes that run (results, files, its notes and bookmark) permanently and keeps its
   variation and everything else ([OPERATIONS.md](OPERATIONS.md) §Deleting a saved result). Bookmark instead of
   deleting when in doubt.
17. **Interactive Preview:** on a completed run, **Interactive Preview** (right of the symbol tabs) opens a compact panel
    beside the chart ([INTERACTIVE_PREVIEW.md](INTERACTIVE_PREVIEW.md)). Change a value (the ⓘ shows its full help),
    press **Enter** or **Run preview**: the chart, events, trades and analysis show that ONE configuration as a
    **TEMPORARY PREVIEW** (`PV-…`), with no new run. Going back to a configuration already previewed is a *Cache hit*.
    **Save as run…** keeps the displayed preview as a normal run; **Return to saved result** shows the saved run again.
    It is still manual exploration (§2): one explicit configuration per click, never a sweep, no automatic runs, and
    the date range is yours to choose.

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

**Selected phenotypes (since 2026-11-04).** A study that wants its nominations to be runnable from Strategy Lab also
writes a `strategy-lab.phenotype-export` directory for the phenotypes it SELECTED (never every trial): effective
parameters, execution kind, engine version, execution assumptions, the selection and test windows and the exposure,
each record hashed, plus a manifest ([PHENOTYPES.md](PHENOTYPES.md) §2). `importers/phenotypes.ts` verifies it against
the registry and the study's sealed records and promotes those phenotypes into the catalogue. The conditional search
space of a strategy — which dimensions exist when, their legal domains and the constraints — comes from
`searchSpaceOf(spec)` (`apps/strategy-lab/shared/params.ts`), so an optimiser of Growth can choose continuation OFF or
ON and then one of the four methods without generating meaningless inactive combinations. Such a study should treat
the method choice as a categorical dimension evaluated with its own budget, test method sensitivity separately from
numeric neighbourhoods, and keep the Study 8 discipline (frozen protocol, training doors, neighbourhood scoring, roles,
veto-only test doors, 2025–2026 exposed).

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
