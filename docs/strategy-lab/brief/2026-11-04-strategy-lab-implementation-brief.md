# Claude Code implementation prompt — Strategy Lab

You are working in my existing `ai-trading` repository on my Linux workstation, now named **`apollo`** (not `apollo-linux`). The repository already contains a working React/TypeScript/Dygraphs prototype named “Strategy Entry Explorer”, with synthetic demonstration data and an interface for choosing strategy variations and viewing entry markers. I want the next implementation iteration to turn that prototype into a practical, persistent, real-data **Strategy Lab**.

**Your assignment is to implement, test, document, commit, and push the changes — not merely propose a design.** Follow the repository's `CLAUDE.md`, architecture, conventions, tooling, and context-recovery policies. Inspect the repository and its actual backtesting/research artifacts before choosing integration points; do not assume commands or file paths in this prompt are exact.

## 0. Git and scope safeguards — first

1. Inspect `git status`, current branch, recent commits, and the existing UI implementation. Identify any uncommitted/untracked user work, and preserve it. Never discard, overwrite, or silently include unrelated work in your commits.
2. **Do not merge this UI work into `main`.** The previously requested merge of earlier work into `main` was for the prior phase. For this iteration, continue on the current UI feature branch if appropriate; if `main` is checked out, create a dedicated feature branch for Strategy Lab before making changes. Do not reset or force-push. If branch provenance or uncommitted work makes a safe decision impossible, stop and ask.
3. **Do not change the trading logic, configurations, parameters, or results of any existing strategies**, particularly D1, B5, Study 8, and `s8-vg-balanced` / `vg-balanced`. New code can add adapters/importers, independent reporting/instrumentation where safe, and a new isolated research strategy, but must not silently modify historical strategy behavior.
4. The final implementation must be committed and pushed to its feature branch, **not merged**. Clearly report the branch, commit, and push status. Do not claim success if anything was not actually completed.

## 1. Product identity and design intent

Rename the app everywhere appropriate from **Strategy Entry Explorer** to **Strategy Lab** (page title, nav, app metadata, documentation). Retain the existing polished dark theme and Dygraphs-based visual interface as the foundation; don't replace the interface wholesale or regress its features.

The app is a **general-purpose strategy research workbench**, not merely an entry explorer. It should eventually visualise both entries and exits, single-symbol strategies, and multi-ETF/shared-margin allocation strategies, and allow researchers to inspect saved studies and manually test parameters.

**Critical division of responsibilities:**
- **In the UI:** Inspect results, edit entry-strategy parameter values, start **one specific manually configured backtest/test run**, see progress/errors, review persisted results, bookmark/annotate them, and compare them visually.
- **Only via Claude/code/CLI research workflows:** Run parameter sweeps, large optimisation studies, and selection/robustness processes. **DO NOT implement an “Optimize”, “Run Optimization”, “Sweep”, or equivalent execution action in the browser or an API endpoint that launches optimisation.** The UI may display/import **previously completed** optimisation batches and trials, but never initiate one.
- Research direction: **first isolate entry-signal discovery**, examine forward returns/adverse excursions, timing, and signal coverage, and only later examine exits and full trade economics with a small number of frozen exit policies; ultimately evaluate entries and exits jointly. Never present entry-only signals as net-profit-producing trades.
- I want to use the UI to learn and formulate rules by editing parameters, rerunning individual tests, and visually comparing entries. Avoid premature or spurious “best strategy” claims.

Document this research direction as a lasting project design/research note, including the distinction between manual exploratory inspection and proper chronological validation to mitigate overfitting. Later Claude-led optimisation should be able to follow the robust methodology used in **Study 8**, which produced the `#2 VG Balanced` candidate; inspect the actual Study 8 documents and code and document the actual methodology, not an assumed approximation. **Do not implement or launch another optimisation study as part of this task.**

## 2. Data model, persistence, and naming

Introduce persistent storage using **SQLite**, hosted on Apollo's filesystem and accessed from the browser through a Node.js API (not browser-side SQLite or localStorage as the authoritative store). Suggested default location: `state/strategy-lab/strategy-lab.sqlite` under the repository, overridable via environment configuration. Use a database migration approach; enable appropriate SQLite pragmas such as foreign keys and WAL where suitable. Keep database state, test outputs, and potentially large results out of Git; commit migrations, schema definitions, code, and small deterministic fixtures.

Use clear, distinct concepts:

- **Experiment**: a larger research question or campaign, e.g. “Growth Entry Discovery”.
- **Strategy**: a named algorithm/entry mechanism, e.g. “Trend established after rise from recent low”.
- **Variation**: a particular immutable parameter configuration (including strategy version), e.g. advancement = 6%, lookback = 60 completed bars.
- **Run**: one actual execution with an ID, name/title, timestamps, dataset identity, symbol set, strategy version, parameters, execution assumptions, status, and resulting events/metrics. Running the same variation again creates a **new run**.
- **Optimization batch/trial**: optional read-only/imported history from Claude/CLI optimisation studies, distinct from a browser-launched manual run.

Avoid conflating the demo “V1, V2, V3” labels with run IDs. Give each run a stable, unique, unambiguous identifier (e.g. `R-000042`, or another database-backed equivalent) and a human-readable, editable **run title**; use separate IDs for variations and strategies. IDs never change even if titles do. Rename the sidebar or add views as needed to make this obvious. Persist status (`queued`, `running`, `completed`, `failed`, `cancelled` if supported), errors, log/reference data, started/completed times, parameters, code revision, data provenance, and results.

**Reproducibility:** Store exact parameter snapshots per run, the instrument(s), date range, data resolution, dataset version/fingerprint, algorithm version/Git commit, signal/bar-time semantics, and relevant runtime assumptions. Completed results and their execution inputs should be immutable; changing parameters creates a new variation/new run, not silently altering old results. Allow editing friendly titles, notes, tags, and bookmark status without mutating execution facts.

Prefer large event arrays and timeseries in immutable files referenced by the SQLite database if embedding them would make SQLite unwieldy; use a simple, documented, efficient storage format and robust atomic writes. Migrate/respect existing available UI data where meaningful, but do not mislabel demonstration data as historical market results.

## 3. Navigation, run history, bookmarks, and notes

- Make **individual runs selectable** from the UI. Selecting one must load the exact saved result set, symbols, parameters, and chart events. The UX should distinguish experiment → strategy → variation → run, while allowing fast navigation without excessive nesting. You may adapt the existing left sidebar into a run-aware view, with tabs/filters for variations, recent runs, and bookmarks.
- **Sort the existing Variations list on the left by the creation time of their latest test-run results, newest first.** Where a variation has never been run, handle it consistently and explain the ordering. The **Recent Runs** view should likewise default to run result-creation/completion time descending, newest first. Do not sort by ID lexicographically. Preserve an option to find older results.
- **Bookmark saved test results**: when hovering over a list item on the left, reveal a clickable bookmark/star icon. If already bookmarked, keep an obvious indicator visible even when not hovered. Also support keyboard/touch access, not hover alone. Persist in SQLite and provide a filter for bookmarked results. Ideally support bookmarking both runs and reusable variations, with clear semantics.
- Add/edit/delete **notes**, preferably Markdown, for saved runs and variations. A short note excerpt or indicator may appear in the list. Optionally provide tags if they fit cleanly.
- Provide an obvious **Parameters** detail/panel for every run showing all inputs and their types/units, with a way to clone those settings into an editable new variation. Never hide important parameters in tooltips alone.
- Preserve selected run/variation, symbol, and useful chart state as appropriate when navigating; avoid surprising loss of zoom or context. If straightforward, allow a saved chart observation/bookmark with symbol, run, time window, and note; otherwise document that as a follow-on instead of blocking core delivery.

## 4. Manual parameter editing and real test execution — implement now

I need to be able to **change strategy parameters in the browser and press Run Test**. This must execute a real test using existing market data and the actual TypeScript research/backtest engine (or a cleanly integrated entry-signal runner sharing its data pipeline), not a browser-only simulation or fake result.

- Discover the repository's actual data loader and execution interfaces; reuse existing code/data where appropriate without modifying existing strategies' behavior.
- Build a schema-driven parameter editor with labels, descriptions, defaults, constraints, units, and validation. Editing an existing run's parameters should create a **new** configuration/run, leaving the historical one unchanged.
- Select one or more eligible symbols and an available data range; make timeframe/tick-window units explicit.
- **Run Test** schedules exactly **one configured evaluation**, not a parameter search. Show queued/running/completed/failed states and actionable errors. Make finished entries available on the chart and in the event table, persisting across refresh/server restart.
- Enforce server-side input validation, no arbitrary shell command or filename injection, no unrestricted command execution, bounded concurrency/resource use, and safe error handling. If you must launch a child process, use an allowlisted executable and argument vector (never interpolate user input into a shell command).
- Avoid blocking the HTTP request for the duration of long backtests. Use a bounded background job + status polling or equivalent; expose failures accurately, and ensure a refresh does not lose progress/history. Cancellation and logs are desirable if practical.
- **Do not provide browser/API controls to perform optimisation or batch sweeps.** A manual one-configuration, optionally multi-symbol test is permitted; a grid search or optimiser job is not.

## 5. New real entry-only research strategy: buy after a rise from a recent low

Implement one **new, isolated** growth/trend-entry strategy under the repo's appropriate strategy location, leaving every existing strategy untouched. This is not the existing deep-dip/recovery strategy. The entry idea is to participate in upward trends/runs:

> Emit an entry signal once price has advanced by at least **X% from a recent low within a rolling tick window**.

Expose at least two editable parameters with clear names, e.g.:
- `advanceFromRecentLowPercent` (X%, initial demo/default such as 5% — choose a reasonable documented value).
- `recentLowLookbackBars` or `tickWindowSize` (rolling completed-bar lookback; choose and document a sensible default appropriate to the available timeframe).

Important requirements:
- Specify the exact rule mathematically, with explicit tick/bar and window semantics. **Never use future prices** to decide a historical signal. Use completed bars for the trigger as consistent with this engine's temporal conventions. Document whether the lookback includes/excludes the current bar, and consistently preserve that distinction.
- Decide and document a **deterministic, edge-triggered rearming policy**, so a market staying 5% above a rolling low does not generate a “new entry” on every bar. Prefer the crossing from below to at/above threshold; rearm only after the criterion resets (or another explicitly defensible rule). Include tests for repeated highs, flat/rolling lows, missing bars, gaps, and threshold equality.
- Clarify timestamp and price semantics: the signal should indicate the bar when the condition is first knowable. If execution is modeled separately, fills must happen no earlier than the first eligible subsequent price; don't mark same-bar fills without explicit credible assumptions.
- **Do not implement or optimize exit rules for this new strategy.** It is **signal-only** for now. No portfolio P&L, “executed trades”, or fictitious holdings should be claimed. UI event type should be `entry signal`, not `executed entry`, unless there is a separately defined, valid execution simulation. Permit multiple distinct signals over time so I can inspect their placement.
- Produce typed, persistent event data and any valid forward-return/adverse-excursion metrics that can be calculated without pretending the strategy has exits. If such metrics require a future observation window, mark incomplete/right-censored outcomes clearly.
- Add deterministic automated tests and at least one real-data manual run to confirm the UI/engine integration. Do not invent market prices, events, or measured performance.

## 6. Visualise historical `vg-balanced` entries **and exits**

I also want to open **actual** previously tested `vg-balanced` (`s8-vg-balanced`, Study 8, #2 candidate) results in Strategy Lab, with both **entry and exit markers** on the correct ETF price chart.

- First locate the actual Study 8 candidate code, evaluation outputs, archived artifacts, and/or replay commands. Do not guess symbols, timestamps, executions, or P&L; inspect the actual source. The run may involve VGT and GDX and could have additional symbol/allocator details — derive the full symbol set from the real artifacts.
- Build an importer/adapter for real existing run artifacts, or a reproducible replay/export command if necessary. This should be a **read-only integration from the perspective of existing strategy logic**. If trade timestamps or exit reasons are absent from available artifacts, state what is missing and build a safe exporter/instrumentation route without silently fabricating data.
- Imported trade events should carry symbol, timestamp, event type (entry/exit), price, order/fill semantics where known, relevant reason/trigger, run ID, and trade linkage; preserve the allocator's actual decision chronology.
- When viewing VGT, show **only VGT price and VGT entry/exit events**; when viewing GDX, show **only GDX price and GDX entry/exit events**. Never show GDX markers on VGT's chart, or vice versa. Apply this symbol filter to tooltips, event selection, and the symbol-specific event table too. An optional all-symbol timeline/overview can exist separately, clearly labeled.
- Distinguish entries from exits using visually distinct marker shapes/colours and accessible text/legend; let the user toggle event categories. Retain the ability to compare variations/runs when applicable without leaking other symbols' markers into the selected symbol chart.
- Where the allocator generated a signal but did **not** execute because capital/margin was occupied or another allocation rule applied, don't depict that signal as an executed trade. Show such decisions only if genuinely recorded, with a correct label.
- Validate imported outcomes/event counts against actual source artifacts. Don't silently change historical simulation settings or claim that an arbitrary re-run exactly reproduces a prior frozen result without verification.

## 7. Chart and timestamp improvements

Keep Dygraphs as the charting library unless a proven technical blocker makes an alternative strictly necessary; explain any proposal to change it before doing so. Retain efficient zoom/pan, overview range selector, hover details, interactive markers, event selection, and comparison controls.

1. **Vertical hover crosshair**: as the pointer moves over the price chart, draw a subtle full-height vertical guide at the hovered timestamp, accompanied by a clear dot/highlight where it intersects the price series (similar to the macOS Stocks app screenshot). Coordinate this with markers and hover behavior; no distracting jitter. Use Dygraphs capabilities or a carefully tested drawing overlay that works correctly while zooming, panning, resizing, and changing runs/symbols.
2. **Timestamp precision for real runs**: on hover/selection of a real entry or exit, show the **date and time in U.S. Eastern Time** (`America/New_York`), with daylight-saving-aware **EST/EDT** labeling where appropriate. Preserve exact UTC instants internally; do not naively apply a constant −5 offset. Include time in the selected-event detail and event table, not just the calendar date. The minute-level source bar/execution time should be used when available. If imported artifacts contain only a day and not an intraday time, label the precision honestly instead of inventing one.
3. Multiple symbols: price series and events in the chart must change together when changing symbol tabs. Preserve zoom if meaningful/valid; otherwise reset deliberately and predictably. Clear stale event selection on symbol or run change.
4. Clearly distinguish synthetic/demo data from real market prices. No research view may silently substitute a demo chart if the real dataset or event data is missing.
5. Performance: full-history minute data can be large. Reuse efficient chart data loading/decimation where needed without changing event timestamps or accidentally dropping markers. Tests should cover event placement after zoom and downsampling.

## 8. Fix layout bug: sidebar scrollbar and banner

The current demonstration-data banner adds vertical space at the top, and the **left variations sidebar's internal scrollbar extends below the visible viewport**, past the bottom of the screen.

Fix layout sizing/overflow so the sidebar always ends **at the bottom of the available viewport**, whether the banner is present, absent, expanded, or wrapped. Its list should scroll internally without the controls or scrollbar extending past the screen. Ensure correct behavior across typical desktop resolutions, browser zoom, and narrower windows. Prefer proper flex/grid min-height handling (`min-height: 0` where needed) over hardcoded pixel heights. Test in the actual rendered UI.

## 9. Apollo hosting and remote VPN access

Make the local app practical to run continuously on workstation **`apollo`**, and accessible from my other computers over my existing private VPN/Tailscale. For example `http://apollo:<configured-port>` may work where VPN DNS is configured; document the actual port and prerequisites. Avoid references to `apollo-linux`.

- Provide clearly documented start/build/dev commands and a reasonable production run path (e.g. Docker Compose or service if aligned with this repo), with restart/persistence behavior and correct volume mounts for the SQLite database and run artifacts.
- Bind the service to an appropriate interface for VPN access; **do not expose an unauthenticated command-execution/backtest endpoint to the public Internet**. Use VPN-only firewall/interface restrictions plus appropriate API access protection, especially for POST endpoints that launch work; make the choice explicit.
- SQLite writes should remain server-side with robust concurrency/locking/error handling; a remote browser should never directly open the SQLite file.
- Document database location, backups, configuration, and recovery. Keep secrets out of version control.

## 10. Data contracts, QA, and delivery

Define a clear, stable typed event/output contract usable by all future strategies, including:
- run ID, strategy/variation provenance, instrument/symbol, timestamp as UTC instant, event kind (`entry_signal`, `executed_entry`, `executed_exit`, optionally `rejected_signal`), relevant event price, timing/precision, trigger/decision metadata, trade linkage where available, and source/data provenance;
- a way to express when a field is **unknown**, not zero or inferred;
- real vs synthetic data origin;
- per-symbol event filtering and event ordering.

Preserve existing features that are working in the screenshot (variations list, quick switching, zoom, tooltips, event table, selected-event panel, comparison, metrics where meaningful), adapting labels and disabled states to the actual data available. Never show fabricated analytics or silently treat entry-only research as completed trading performance.

Implement automated and practical smoke tests covering at least:
1. SQLite migration, data persistence after restart, run ID uniqueness, immutable execution snapshots, notes, bookmark toggle and filter.
2. Single-run browser execution: editing X from 5% to 6% creates a new variation/run; old run unchanged; saved events display after refresh; invalid inputs rejected; no optimizer action/endpoints exposed.
3. Correct rolling-window math, cross-up/rearm semantics, chronology/no-lookahead, and missing data behavior for the new strategy.
4. Multi-symbol `vg-balanced`: VGT tab never displays GDX events and vice versa, including after changing run, using comparison, hovering, and filtering tables. Actual entries/exits match verified source data.
5. Accurate America/New_York time formatting across DST boundaries, bar precision, and event-to-chart alignment.
6. Crosshair/highlight behavior, bookmark UI hover and keyboard accessibility, sidebar scroll bounds with/without banner, and descending result timestamp sort.
7. Service reachable on Apollo via intended VPN access (or state exactly what cannot be verified from the development environment, with a reproducible verification procedure).

### Documentation

Update/create project docs recording:
- architecture and run/variation/strategy/experiment semantics;
- parameter schema, event contract, SQLite schema/location/migrations and run artifacts;
- how I can manually edit parameters and execute a **single** test in the browser;
- how future **Claude-led** optimisation studies based on the real Study 8 methodology may export/import results **without an optimisation button in the UI**;
- the longer-term roadmap: discover entry mechanisms → visually inspect and objectively evaluate their signals → manually iterate → Claude-managed parameter sweeps with chronological train/validation and robust neighbourhood checks → introduce controlled/frozen exits → evaluate jointly → validate forward and at portfolio level;
- operation, backups, security, limitations, and any known data gaps.

### Completion report

When finished, provide:
- URL/commands to start Strategy Lab on Apollo, and how to connect from another VPN machine;
- a brief guide: create/clone a variation, change 5% to 6%, click Run Test, select the new run, view parameters, bookmark it, add a note, switch symbols, and inspect `vg-balanced` entries/exits;
- exact source and methodology used to import/replay `vg-balanced`, including evidence of event-count/result agreement or any unresolved mismatches;
- concise test/build results and known limitations (especially any unavailable historical timestamps/data);
- branch, commit SHA, and confirmation of push; explicitly **no merge to `main`**.

**Prioritisation:** Deliver functioning end-to-end integration over decorative screens. The must-haves are the real entry-only signal strategy, manual browser-triggered single runs, saved run/parameter access with SQLite/bookmarks/notes, real `vg-balanced` entry+exit plotting with correct per-symbol filtering, correct Eastern timestamps, crosshair, sidebar layout fix, and safely accessible Apollo hosting. Display-only imported optimiser results may be modest in this iteration, but design the schema for them. Do not claim completion of a capability unless it actually works.
