# Strategy Lab — architecture

Strategy Lab (`apps/strategy-lab/`) is a general-purpose strategy research workbench. In the browser you can:

- inspect saved results (entries and exits, single-symbol and multi-ETF);
- edit a strategy's parameters and start **one** manual test on real data: the signal-only entry strategy, or
  **Growth**, the trading backtest built on it, with optional continuation entries ([GROWTH_TRADING.md](GROWTH_TRADING.md),
  [GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md));
- browse the frozen **phenotype catalogue** and run one selected phenotype ([PHENOTYPES.md](PHENOTYPES.md));
- follow the run's progress;
- bookmark and annotate runs and variations;
- compare two runs on one symbol's chart, with a descriptive side-by-side comparison;
- download a run's **research bundle** ([EXPORTS.md](EXPORTS.md)).

Optimisation, sweeps and selection are **not** in the browser or the API. They run as Claude/CLI research workflows
([RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md)), and only their finished records may be imported for display.

```text
browser (React + Dygraphs) ──HTTP/JSON──▶ server (Node, node:http) ──▶ SQLite (state/strategy-lab/strategy-lab.sqlite)
                                              │                    └─▶ run artifacts (state/strategy-lab/runs/R-…/)
                                              ├─ prices: canonical minute files data/<SYM>/data.csv (read-only)
                                              └─ child process per manual run (allowlisted per strategy key):
                                                   runner/entry-signal-run.ts   (signal-only)
                                                   runner/trading-run.ts        (Growth; also replays legacy 1.0.0)
                                                   runner/pool-run.ts           (shared-slot pool phenotype reruns)
                                                   └─ src/lib/evaluation.ts (dataset pipeline) + src/entry-signals/
                                                      (+ src/growth-trading/ and the Study 8 D1 book for Growth;
                                                       the unchanged src/study8-runners/ for pools)
importers/study8.ts (CLI) ──▶ same SQLite + artifacts (reads a Study 8 runner output + the sealed F24 record)
importers/phenotypes.ts (CLI) ──▶ the phenotype catalogue (reads a verified phenotype export)
```

## Concepts and identifiers

| Concept | Meaning | Identifier |
| --- | --- | --- |
| **Experiment** | A research question or campaign ("Growth Entry Discovery", "Study 8 imports", "Demo (synthetic data)") | `E-0001` |
| **Strategy** | A named algorithm at a version ("Rise from recent low" `rise-from-recent-low@1.0.0`; **Growth** `rise-from-recent-low-trading@1.1.0`, legacy `@1.0.0`; "Study 8 D1 shared-slot pool"). The display name is metadata (`strategies.title`, `former_title`); key and version never change | `S-0001` (plus key and version) |
| **Variation** | One **immutable** parameter configuration of one strategy version in one experiment. Identity = strategy + experiment + canonical parameters; for runnable strategies the bar resolution is part of the configuration | `V-000001` |
| **Run** | One execution (or import) of a variation: title, timestamps, status, symbols, window, data fingerprints, code revision, parameter snapshot, assumptions, events, metrics. Running the same variation again creates a **new run** | `R-000001` |
| **Phenotype** | A frozen executable configuration a study selected, imported with its manifest; runnable one test at a time, never edited ([PHENOTYPES.md](PHENOTYPES.md)) | `PH-0001` (import `PI-0001`) |
| **Optimisation batch / trial** | Read-only history imported from a Claude/CLI optimisation study (a phenotype export's optional `trials`); never launched from Strategy Lab | `OB-0001` |

- **IDs are derived from the integer primary key and never change.** Titles are separate and editable.
- **Annotations are mutable; execution facts are not.** Editable: titles, notes, bookmarks. Immutable, enforced by
  SQLite triggers: a variation's parameters, and a run's inputs. A finished run's results can never be updated, and
  runs and variations can never be deleted.
- **Changing a parameter creates a new variation.** Cloning a run into a new test records `parentVariation`
  (provenance only).

## Run lifecycle

`queued → running → completed | failed | cancelled`

1. `POST /api/runs` (or `POST /api/phenotypes/:id/runs`) validates the request against the strategy registry
   (`shared/strategies.ts`, parameter schema v2 in `shared/params.ts`):
   - a known strategy version that may be launched this way (legacy versions are refused with their replay rule);
   - every ACTIVE parameter present and valid (type, range, integer, enum option); inactive ones optional but valid;
   - the cross-field constraints;
   - 1–8 known symbols;
   - YYYY-MM-DD dates in order;
   - an allowed resolution;
   - no unknown fields.

   It then finds or creates the variation and inserts the run with its input snapshot, which records:
   - the parameters as typed values with units;
   - the assumptions;
   - the partitions the window touches;
   - the code revision (`git rev-parse HEAD`, plus `git status` of the code it runs).

   It writes `request.json` atomically and queues the run.
2. The job manager (`server/jobs.ts`) starts at most `STRATEGY_LAB_MAX_CONCURRENT_RUNS` (default 1) children. Each is
   started with **an allowlisted executable and a fixed argument vector**: this Node binary, fixed flags, the runner
   script of the run's stored strategy (`RUNNER_SCRIPTS`, one fixed script per runnable strategy key) and the
   server-generated run directory. There is no shell, no user text on the command line, a minimal
   environment and a timeout (default 30 min). Progress is reported as JSON lines on stdout into `progress_json`;
   stdout and stderr go to `run.log`.
3. The runner reads each symbol through `loadDatasetSessions` (access `manual evaluation`). That gives:
   - the window;
   - warm-up sessions read for the lookback only;
   - forward split adjustment;
   - the data file's sha256.

   The signal-only runner then builds the bars, scans for signals, measures forward outcomes inside the window, and
   writes `events.json`, `metrics.json` and `provenance.json` atomically. The trading runner scans the same bars, runs
   one standalone backtest per symbol, and also writes `trades.json` (the ledger) and `daily.json` (daily marks). It
   exits non-zero, so the run is marked `failed`, if any accounting check does not reconcile.
4. The server validates the events against the contract, writes `manifest.json` (sha256 of every file), and records
   the result once: event count, events sha256, metrics, provenance, and the price basis per symbol.
5. **Restart:** queued runs are re-queued, and a run left `running` by a stopped server is marked `failed`
   ("Interrupted …"). The browser polls `GET /api/runs/:id`, so a refresh loses nothing.
6. **Cancel:** `POST /api/runs/:id/cancel` drops a queued run, or terminates a running child (SIGTERM, then SIGKILL).

## Storage

- **SQLite** through Node's built-in `node:sqlite`. Default `state/strategy-lab/strategy-lab.sqlite`; override with
  `STRATEGY_LAB_DB` or `STRATEGY_LAB_STATE_DIR`. Pragmas: WAL, `foreign_keys = ON`, `busy_timeout = 5000`,
  `synchronous = NORMAL`. Only the server process (and the importer CLI) opens it; browsers never do.
- **Migrations** live in `apps/strategy-lab/server/migrations/NNNN_name.sql`. They are forward-only and each applies in
  one transaction. They are recorded with their sha256 in `schema_migrations`, and the server refuses to start if an
  applied migration file changed.
- **Tables** (migration 0001):
  - `experiments`, `strategies`, `variations`, `runs`, `run_symbols`, `notes`;
  - `optimization_batches`, `optimization_trials` (reserved for imports);
  - triggers `variations_immutable`, `variations_no_delete`, `runs_inputs_immutable`, `runs_results_immutable`,
    `runs_no_delete`.
- **Migration 0002** (`0002_growth_schema_phenotypes.sql`, 2026-11-04; generated once by
  `scripts/generate-migration-0002.ts`, which a test re-runs):
  - display metadata only for existing rows: `strategies.former_title`; `rise-from-recent-low-trading@1.0.0` titled
    **Growth**; every stored `param_schema_json` converted to the version-2 schema object; the pool row's description.
    No run or variation column and no artifact is changed;
  - `phenotype_imports`, `phenotypes` (immutable, never deleted), `runs.phenotype_id` (an immutable input: the
    `runs_inputs_immutable` trigger is recreated with it).
  - Verified on a copy of the live database before it was applied (counts, ids, immutable-column hashes, titles,
    notes, bookmarks, foreign keys, integrity, events; `scripts/audit-state.ts`) and by `tests/migration.test.ts`.
- **Artifacts** live in `state/strategy-lab/runs/R-xxxxxx/`. They are immutable files referenced by the run row:
  - `request.json` (manual runs);
  - `events.json` (contract v2, sorted, verified against `runs.artifact_sha256` on every read);
  - `metrics.json`, `provenance.json` (or `import.json`), `manifest.json`, `run.log`;
  - trading backtests also: `trades.json`, `daily.json`; Growth 1.1.0 also `decisions.json`, `minute-marks.csv.gz`;
  - pool reruns: `study8/` (the Study 8 runner's own output) and `study8-output.json` (its file hashes).

  Writes are atomic: temporary file, fsync, rename, then fsync of the directory.
- **Git:** everything under `state/` is ignored (root `.gitignore`). Migrations, code and the small demo fixture are
  committed.

## Prices on the chart

- **Real symbols.** `server/prices.ts` loads each canonical minute file once with the repository's own loader and
  session builder (`src/lib/csv.ts`, `src/lib/session.ts`) and caches typed arrays. The cache is reloaded when the
  file's size or mtime changes. The series holds regular-session minute closes (x = the minute's start, the data's
  convention) plus each session's closing print (x = the scheduled close).
- **Split units.** Prices are forward-adjusted with `splitFactor` to the run's basis date: the first session the run
  loaded. The events were computed in the same units. A compared run's event prices are converted to the chart's
  basis with the recorded split ratios (`display` prices); the events' own prices are never changed.
- **Run windows only.** A run's chart shows only its own window. A training-only run therefore never renders holdout
  dates (PLAN §6).
- **Decimation.** Long windows keep the minimum and the maximum of every bucket in time order, so spikes survive. The
  browser loads an overview first. When you zoom in, it fetches the visible window at finer resolution and merges it
  in; the range selector keeps the overview.
- **Markers.** Markers are an overlay of focusable buttons placed with Dygraphs' `toDomCoords(t, price)` at the
  event's exact instant and price. Decimation never moves or drops a marker. An event without a recorded price
  (rejected signals) is drawn on the price line at that instant and labelled "price not recorded".
- **Trades** (`src/trades.ts`, `src/chart/link.ts`, `src/components/Trading.tsx`):
  - **Pairing.** Executed entries and exits are paired only through the recorded `tradeId` and a mutual
    `linkedEventId`, within one symbol, never by time or price. Inconsistent records (duplicates, one-way or crossed
    links) are shown as "not linked".
  - **Marker colours** (`src/chart/markers.ts`, since 2026-11-04, Task 9). Shapes are unchanged: ▲ entry, ▼ exit,
    ⊘ rejected, a hollow ▲ for a raw signal. The colour is the outcome:
    - both markers of a trade are **green** for a net profit, **red** for a net loss and **grey** for exactly $0. The
      outcome is the trade's RECORDED net P&L after costs and margin interest, never the price difference;
    - an executed entry of a position still **open** is **sky blue**, whatever its unrealized P&L (its P&L text is the
      same neutral blue);
    - an executed event without a recorded trade P&L is **amber** (e.g. the synthetic demo's illustrative entries), so
      it is never mistaken for breakeven;
    - every **rejected signal** is **purple**, whatever the reason, and a **raw entry signal** is a hollow light
      outline.
    - The legend shows the executed kinds by shape and an outcome colour key. The hover highlight, the connector, the
      tooltip glyphs, the P&L text and the event table use the same colours.
    - Comparing runs: run B's markers keep the outcome colours and get an orange halo. Before this change, the colour
      was the run role (A aqua, B orange).
  - **Trade P&L in tooltips.** Both markers of a trade show the same trade-level net P&L, after costs and margin
    interest, in $ and % (green profit, red loss):
    - a closed trade: the exit's recorded `net`; the % is `netReturn`, else net ÷ the recorded principal;
    - an open position: UNREALIZED, from the run's recorded mark. Trading backtests use
      `metrics.perSymbol[symbol].pnl.unrealized`; the Study 8 import uses `metrics.trades.unrealized` only when the
      pool has exactly one open lot;
    - otherwise "P&L unavailable — reason", never a made-up figure.
  - **Selection.** Clicking either marker of a trade selects the trade: its row in **Trades** is highlighted and
    scrolled into view inside the list, and its details are shown beneath. Selecting the other marker of the same
    trade keeps the selection. This works for trading backtests and imported multi-ETF runs, per symbol.
  - **Closed losses only** (since 2026-11-04, Task 10): a toggle above each Trades list keeps only CLOSED trades whose
    recorded net after costs and interest is below zero (`isClosedLoss` in `src/trades.ts`): never an open position,
    a breakeven, or a trade judged by its price difference. The list shows "k of n trades" and an empty state; the
    chart keeps every marker; a chart-selected trade the filter hides is explained, with **Show all trades**.
  - **Origin** (Growth 1.1.0): the Trades list shows whether each trade came from the base entry or a continuation
    method.
  - **Hover link.** Hovering (or focusing) an executed entry or exit highlights both markers of its trade and draws a
    temporary connector between them.
    - The connector is dashed and translucent, green for a profit and red for a loss, under the markers, clipped to the
      plot. It is drawn directly on the marker layer: no Dygraphs redraw, no re-initialisation. It follows a zoom
      while hovered.
    - The tooltip adds a summary (entry and exit date/price, holding period, net P&L) and opens on the side away from
      the counterpart.
    - A counterpart outside the view is reported ("The exit is later than the current view"); the chart is not
      zoomed to it. An open position highlights only its entry and says it is still open.
    - Everything is removed as soon as the pointer leaves the marker. No links appear during a measure or pan drag.
- **Synthetic runs.** These (the demo) get their prices only from `apps/strategy-lab/fixtures/demo-dataset.v1.json`
  and are labelled synthetic everywhere. A real run never falls back to them: missing data shows an error instead of a
  chart.

## Per-symbol rule

A chart shows one symbol: its price and **its** events only. The rule is enforced twice:

- the server filters `GET /api/runs/:id/events?symbol=S`;
- the client filters again, by symbol and by event category.

Tooltips, selection, the event table and the analysis panel all derive from that same filtered list. A comparison run
contributes only its events for the same symbol. Real and synthetic runs are never compared.

## Chart behaviour

- **Library.** Dygraphs 2.2.2, kept as the base.
- **Crosshair.** A vertical line follows the nearest highlighted data point, with Dygraphs' highlight dot on the line
  and a readout showing the Eastern time and price.
- **Axis.** Ticks fall on America/New_York boundaries, from a custom ticker, so labels never shift a day with the
  browser's time zone.
- **Times.** Every displayed time is America/New_York with an EST/EDT label (Intl, daylight-saving exact). Instants are
  stored in UTC, and an event's precision (`minute`, `session-close`, `day`, `unknown`) is shown with it.
- **Changing symbol or run** keeps the zoom when it still fits the new data (otherwise it shows everything) and clears
  the selected event.
- **Drag to measure** (a custom Dygraphs `interactionModel`; `src/chart/measure.ts`):
  - **Gesture.** Dragging with the primary button held never zooms or pans. It selects two points, each snapped with
    `findClosestRow` to the closest plotted data point and that point's own price.
  - **Display.** Two vertical lines, two dots on the line and translucent shading between them. Above the chart:
    the Eastern start and end times, the dollar change and the percentage change (green up, red down), updated live
    while dragging.
  - **Direction.** The result is always computed from the earlier to the later point, whichever way you drag.
  - **Lifetime.** The measurement exists **only while the mouse button is held** (since 2026-11-04, Task 6).
    - Releasing the button, on the chart or anywhere else, clears all of it at once: the shading, both lines, both
      dots and the read-out. The read-out is cleared synchronously, not one frame later.
    - A cancelled drag clears it the same way: Escape, the window losing focus, a context menu, a move reporting the
      button no longer held (a missed release), or the chart unmounting (a symbol or run change).
    - A plain click shows nothing.
  - **Navigation.** Double-click resets the zoom; zooming otherwise uses the buttons, the range selector and the
    mouse wheel.
- **Drag to pan** (`src/chart/pan.ts`, the same interaction model):
  - **Modifier.** ⌘ Command + drag on macOS, Ctrl + drag on Windows and Linux. Shift + drag and Alt + drag pan on
    every platform, as before. On macOS, Ctrl-click is a right-click, so Ctrl is not the pan key there.
  - **Mode lock.** The modifier is read at the mouse-down and the mode is locked until the release: releasing the key
    mid-drag keeps panning, and pressing it during a measurement keeps measuring.
  - **Direction.** The content follows the pointer: dragging left shows later times, dragging right shows earlier
    ones.
  - **Smoothness and zoom.** The pan is continuous (applied once per animation frame with `updateOptions({ dateWindow
    })`, so the chart is never re-initialised) and never changes the zoom level. The range selector (overview) stays
    in step.
  - **Bounds.** The window is clamped to the data's extent, the same bounds the wheel zoom uses. (Before 2026-11-04,
    Shift-drag used Dygraphs' unbounded pan.)
  - **No measurement.** No measurement lines, dots, shading or read-out are drawn while panning.
  - **Ending.** The release ends a pan wherever it happens. Escape, focus loss, a context menu, a missed release, or
    an unmount end it in place. No text is selected while panning (`html.chart-panning`: `user-select: none`, a
    grabbing cursor).
- **Mouse-wheel zoom** (`src/chart/wheelZoom.ts`, a `wheel` handler in the same interaction model):
  - **Direction and centre.** A two-finger swipe **up** zooms **in**, a swipe down zooms out, around the time under
    the cursor (it keeps its screen position).
    - With the default natural scrolling of macOS and Windows precision touchpads, a swipe up arrives as
      `deltaY > 0`. So `deltaY > 0` zooms in.
    - The sign is decided in one place (`wheelZoomOutPx`), with no browser- or device-specific branch: browsers do not
      reveal whether the device is a mouse or a trackpad, or whether natural scrolling is on.
    - A mouse wheel therefore follows the operating system's scroll direction: with classic (non-natural) scrolling,
      rolling it toward you zooms in.
    - Pinch gestures (and Ctrl + wheel) arrive with `ctrlKey` and keep the browser's page-zoom sign: pinching out
      zooms in.
    - Changed on 2026-11-04 (Task 5): before, a swipe up zoomed out.
  - **Steps.** Gentle: about ×0.86 or ×1.16 per 100-pixel notch, capped at ×0.7 or ×1.4 per event. Pixel, line and
    page delta modes are normalised, so trackpads work too.
  - **Axes.** Time axis only; the y axis keeps its auto-scaling.
  - **Bounds.** The data's extent, and a minimum window of 30 minutes (minute data) or 20 sessions (the synthetic
    daily demo).
  - **Page scrolling.** The wheel event is consumed only when the window actually changes, so the page still scrolls
    over the axes or at a zoom limit.
  - **Markers.** A wheel over a marker zooms as well.

## Phenotypes, comparisons and exports

- **Phenotype catalogue** ([PHENOTYPES.md](PHENOTYPES.md)): `importers/phenotypes.ts` (CLI) verifies a
  `strategy-lab.phenotype-export` and promotes its selected phenotypes; `GET /api/phenotypes[/:id]` lists them with an
  explicit capability (runnable with its runner, or view-only with the reason); `POST /api/phenotypes/:id/runs`
  creates ONE run. A shared-slot pool phenotype runs through `runner/pool-run.ts`, which calls the unchanged Study 8
  runner (`runFor`) — one allocator replay, never per-symbol tests.
- **Comparison** (`server/compare.ts`, `GET /api/compare?a=&b=`): when a run B is selected under *Compare with (B)*,
  the panel checks comparability (strategy and version, symbols, window, resolution, costs, capital model, base
  parameters), then shows the metrics side by side with B − A, the trades identical / shifted / introduced / suppressed
  with their origin, and the continuation window outcomes. It states that origin attribution is descriptive and B − A
  is a path-dependent counterfactual. It never starts a run.
- **Research bundle** ([EXPORTS.md](EXPORTS.md), `server/export.ts`, `server/zip.ts`, `GET /api/runs/:id/export`).

## Optimisation imports (design, display-only)

`optimization_batches` (study reference, methodology reference, source path and sha256, summary) and
`optimization_trials` (trial key, parameters, metrics, role, rank, and optional links to a variation and a run) hold
**finished** results imported by a CLI (a phenotype export's optional `trials`). The API has only
`GET /api/optimization-batches`; there is no route that creates, starts or schedules a search.
[RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md) §5 describes the procedure.

## Security

See [OPERATIONS.md](OPERATIONS.md) §Security. In short:

- **Binding:** loopback plus the Tailscale address only. Binding 0.0.0.0 or :: is refused.
- **Client allowlist:** loopback and Tailscale address ranges.
- **Host-header allowlist**, against DNS rebinding.
- **Bearer token** for every API call whenever the server listens beyond loopback.
- **Requests:** JSON bodies of at most 64 KB; no CORS; a strict CSP on the UI.
