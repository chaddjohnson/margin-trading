# Strategy Lab — architecture

Strategy Lab (`apps/strategy-lab/`) is a general-purpose strategy research workbench. In the browser you can:

- inspect saved results (entries and exits, single-symbol and multi-ETF);
- edit a strategy's parameters and start **one** manual test on real data: the signal-only entry strategy, or the
  trading backtest built on it ([GROWTH_TRADING.md](GROWTH_TRADING.md));
- follow the run's progress;
- bookmark and annotate runs and variations;
- compare two runs on one symbol's chart.

Optimisation, sweeps and selection are **not** in the browser or the API. They run as Claude/CLI research workflows
([RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md)), and only their finished records may be imported for display.

```text
browser (React + Dygraphs) ──HTTP/JSON──▶ server (Node, node:http) ──▶ SQLite (state/strategy-lab/strategy-lab.sqlite)
                                              │                    └─▶ run artifacts (state/strategy-lab/runs/R-…/)
                                              ├─ prices: canonical minute files data/<SYM>/data.csv (read-only)
                                              └─ child process per manual run (allowlisted per strategy):
                                                   runner/entry-signal-run.ts   (signal-only)
                                                   runner/trading-run.ts        (trading backtest)
                                                   └─ src/lib/evaluation.ts (dataset pipeline) + src/entry-signals/
                                                      (+ src/growth-trading/ and the Study 8 D1 book for trading)
importers/study8.ts (CLI) ──▶ same SQLite + artifacts (reads a Study 8 runner output + the sealed F24 record)
```

## Concepts and identifiers

| Concept | Meaning | Identifier |
| --- | --- | --- |
| **Experiment** | A research question or campaign ("Growth Entry Discovery", "Study 8 imports", "Demo (synthetic data)") | `E-0001` |
| **Strategy** | A named algorithm at a version ("Rise from recent low" `rise-from-recent-low@1.0.0`; its trading backtest `rise-from-recent-low-trading@1.0.0`; "Study 8 D1 shared-slot pool") | `S-0001` (plus key and version) |
| **Variation** | One **immutable** parameter configuration of one strategy version in one experiment. Identity = strategy + experiment + canonical parameters; for runnable strategies the bar resolution is part of the configuration | `V-000001` |
| **Run** | One execution (or import) of a variation: title, timestamps, status, symbols, window, data fingerprints, code revision, parameter snapshot, assumptions, events, metrics. Running the same variation again creates a **new run** | `R-000001` |
| **Optimisation batch / trial** | Read-only history imported from a Claude/CLI optimisation study; never launched from Strategy Lab (schema in place, no batch imported yet) | `OB-0001` |

- **IDs are derived from the integer primary key and never change.** Titles are separate and editable.
- **Annotations are mutable; execution facts are not.** Editable: titles, notes, bookmarks. Immutable, enforced by
  SQLite triggers: a variation's parameters, and a run's inputs. A finished run's results can never be updated, and
  runs and variations can never be deleted.
- **Changing a parameter creates a new variation.** Cloning a run into a new test records `parentVariation`
  (provenance only).

## Run lifecycle

`queued → running → completed | failed | cancelled`

1. `POST /api/runs` validates the request against the strategy registry (`shared/strategies.ts`):
   - known strategy and version;
   - every parameter present, numeric and within its range;
   - integers where required;
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
- **Artifacts** live in `state/strategy-lab/runs/R-xxxxxx/`. They are immutable files referenced by the run row:
  - `request.json` (manual runs);
  - `events.json` (contract v2, sorted, verified against `runs.artifact_sha256` on every read);
  - `metrics.json`, `provenance.json` (or `import.json`), `manifest.json`, `run.log`;
  - trading backtests also: `trades.json`, `daily.json`.

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
  - **Navigation.** Shift-drag pans and double-click resets the zoom; zooming otherwise uses the buttons, the range
    selector and the mouse wheel.
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

## Optimisation imports (design, display-only)

`optimization_batches` (study reference, methodology reference, source path and sha256, summary) and
`optimization_trials` (trial key, parameters, metrics, role, rank, and optional links to a variation and a run) hold
**finished** results imported by a CLI. The API has only `GET /api/optimization-batches`; there is no route that
creates, starts or schedules a search. [RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md) §4 describes the import
procedure.

## Security

See [OPERATIONS.md](OPERATIONS.md) §Security. In short:

- **Binding:** loopback plus the Tailscale address only. Binding 0.0.0.0 or :: is refused.
- **Client allowlist:** loopback and Tailscale address ranges.
- **Host-header allowlist**, against DNS rebinding.
- **Bearer token** for every API call whenever the server listens beyond loopback.
- **Requests:** JSON bodies of at most 64 KB; no CORS; a strict CSP on the UI.
