# Claude Code task: Merge current work safely, create a new branch, and build the Strategy Entry Explorer UI

**Project:** Existing `ai-trading` repository on the user's machine  
**Date:** 2026-11-03  
**Immediate deliverable:** A working local interactive research UI with **demo data**, plus written research direction.  
**Not part of this task:** Implementing genuine growth-entry strategies, optimizer runs, or trading-strategy changes.

## Read this first — intent and boundaries

The user wants a reusable **Strategy Entry Explorer** that visually displays price history and annotated entry events for many strategy variations. They need to click through variations, keep the same visible market interval, inspect individual entries, and compare how different hypotheses time their entries. This is the **first infrastructure step** in a larger program to discover growth-capturing entries; do not prematurely conduct that research.

A previous visual mockup is supplied, if available, as `reference/strategy-entry-explorer-mockup.png` in the accompanying bundle. **Use it as a design reference, not a pixel-perfect mandate.** If the image is unavailable, the detailed specification below is sufficient. Preserve the key information architecture: dark analytics UI, variations sidebar, central interactive price chart, entry annotations/tooltips, zoom/navigation, analysis summary, and entries table.

### Priority order

1. Protect existing repository work and integrate the currently checked-out branch into `main` safely.
2. Create a fresh UI feature branch from the updated `main`.
3. Document the *future research methodology* and project direction.
4. Build a functional, polished browser-based UI using **Dygraphs by default**, driven by truthful, clearly marked synthetic demonstration data.
5. Test the UI, report what was done, and leave all actual entry research for a later task.

## Phase 0 — repository inspection and conservative Git integration

You are operating in the **existing repo**; do not create a separate repo. Before modifying anything:

- Read the project's root `CLAUDE.md`, any imported agent instructions, context-recovery rules, documentation conventions, package scripts, worktree/branch conventions, and current architectural layout. Respect them. If instructions conflict, surface the conflict rather than guessing.
- Record the original branch/commit and inspect `git status --short`, branch tracking, outstanding commits relative to `main`, remote state, and the diff to be integrated. Check for untracked/ignored files that could be overwritten. Confirm whether `main` exists locally and/or as `origin/main`.
- **Do not discard, reset, overwrite, force-push, rebase away, squash away, or silently drop any work.** Do not delete existing branches.
- If there are **uncommitted or untracked changes**, preserve them exactly. Do not silently commit unrelated changes, stash and forget them, or proceed through a risky checkout. Stop and request the minimal user instruction needed to make them safe to integrate; if repo rules already provide a safe, explicit workflow, follow it and explain what you did.
- If the currently checked-out branch **is already `main`**, treat that as a special case: ensure its relevant work is safely committed/synchronized and proceed to feature branching. Do not invent a source branch.
- If there is a normal feature branch, **merge its complete relevant history into `main`** (not cherry-pick selected commits), following repository merge conventions. First safely synchronize with `origin/main` where applicable. Prefer a real merge that preserves ancestry when required. Verify that the original branch's HEAD is reachable from the updated `main` after integration.
- Run the repo's appropriate baseline checks/tests before finalizing the merge where feasible. If tests are failing before the task, distinguish existing failures from new failures. **Do not merge unresolved conflicts or known regressions.** Straightforward conflicts may be resolved with care and tests; stop and ask before making uncertain semantic decisions.
- Do not assume authority to force-push or change protected remote branches. For a normal push to `origin/main`, use the repository's established workflow and existing authorization; if unclear or blocked by branch protections, report the exact limitation rather than bypassing safeguards. A successful *local* merge must not be reported as a *remote* merge.
- Once `main` contains the intended prior work, **create a new named feature branch from that updated `main`**; suggested name: `feature/strategy-entry-explorer-ui` (or follow existing conventions). Perform all new UI and documentation commits on that feature branch, **not on `main`**.
- If a safety issue prevents the merge, do not pretend it succeeded or branch from an outdated `main`. Pause and report the blocker, while preserving the work.

At the end, report the exact source branch, original HEAD, merged `main` HEAD, new feature branch and HEAD, worktree cleanliness, and whether any remote push succeeded or was intentionally not attempted.

## Phase 1 — document the longer-term research direction

Add a durable plan in the repo, e.g. `docs/research/growth-entry-discovery/PLAN.md`, adjusting path to existing conventions. This documentation is **research direction**, not authorization to implement later phases now.

Record the following agreed decisions and refinements:

**Primary objective:** Discover robust **entries that capture sustained price growth**, complementing existing D1/B5 dip/recovery methods; do not change existing D1, B5, `vg-balanced`, or other frozen strategies. This research is not primarily about optimizing exits yet. The user trades **all-in or not-at-all** at the strategy-entry level; no pyramiding/scaling-in research is requested. No leveraged ETFs are needed.

**Entry ideas for future investigation (hypotheses, not requirements to code now):**
- Entry after an established rebound, such as approximately **5% above a recent low**.
- Entry on **shallow pullbacks within an established uptrend**.
- Breakout / growth-resumption / profitable-exit re-entry candidates, as appropriate.
- Develop several **structurally distinct** mechanisms (perhaps initially 5–10), not hundreds of cosmetic variants.

**Method:**
1. Build and review the interactive chart using **synthetic demo data** (the current task).
2. Define a standard, strategy-agnostic results schema and, in a later task, connect real historical price series and entry-event outputs.
3. Implement a handful of distinct entry mechanisms in a later task; inspect their entry timings visually and evaluate them statistically **before optimization**.
4. For each entry, examine forward returns and probabilities of reaching illustrative upside thresholds (+5%, +10%, +15%) over explicitly defined horizons; time-to-target; maximum favorable excursion (MFE) and maximum adverse excursion (MAE); early-versus-late participation in sustained rallies; and appropriate baseline comparisons. Clarify horizon/censoring methodology, trading costs where relevant, and handling overlapping/clustered signals so heavily correlated entries do not overstate evidence.
5. Distinguish **raw entry signals** from **actually executable entries**: signals may occur while a single all-in position is already open. The entry research should expose all raw opportunities without incorrectly calling them executed trades; executable entries later require frozen position-state/exits.
6. Narrow mechanisms before tuning parameters. Optimize *promising* mechanisms with restrained local sweeps and real optimization tooling, not blind parameter searches. Prefer stable parameter neighborhoods and cross-regime behavior over a single best historical point.
7. Use chronological train/validation splits (and walk-forward tests where sensible), untouched final holdouts, and explicit protection against hindsight and leakage. **Do not render or inspect reserved holdout dates in research charts before the candidate is frozen**; a chart is itself a form of data exposure. Do not optimize using holdout results.
8. Entries cannot be declared useful solely from forward returns; eventually test promising entries against one or two **frozen, standard exit policies** as a sanity check. After selection, research entries and exits jointly without uncontrolled search overfitting. Exit optimization is a **later phase**, not this task.
9. Design all artifacts and the explorer to be reusable for D1, B5, other strategies/ETFs, and later exit markers; this is permanent research infrastructure, not a one-off strategy viewer.

**Criterion to define before optimization:** Specify measurable entry success aligned to sustained growth, not merely the highest frequency of a small +5% gain. A signal's attractiveness depends on upside capture, adverse excursion, timing, opportunity frequency, risk, and eventual exits.

Include a short stage roadmap with precise 'current vs future' boundaries, and an explicit warning that manual visual selection can create hindsight bias. Document the demo schema with versioning, units, timezone, signal/execution semantics, and JSON example(s), ideally in a companion `ENTRY_EXPLORER.md` or `SCHEMA.md`.

## Phase 2 — UI design and implementation

### Technology

- Use the repo's established Node.js/TypeScript tooling and frontend conventions. If no suitable frontend exists, create a minimally invasive, isolated local web application (React + TypeScript is preferred where compatible). Avoid a wholesale monorepo overhaul or touching backtest execution paths.
- Use **Dygraphs** for the time-series price chart unless a demonstrably better library is necessary for the requirements. Dygraphs was recently maintained (v2.2.2 released 2026-07-26) and supports annotations, event callbacks, zoom/pan, and replacing annotations. If you find a major blocker, document an evidence-based comparison and **ask before switching**; do not substitute a different charting library unilaterally.
- Ensure correct lifecycle management when integrating Dygraphs with React (create once per chart lifecycle, update annotation/state appropriately, destroy on unmount).
- Prefer dependency reuse and straightforward local development/start commands. No external hosted service, account, auth flow, trading credentials, or cloud deployment.

### Required layout and behaviors

Implement the visually polished **dark analytics dashboard** shown in the mockup, with responsive desktop-first layout:

1. **Header:** `Strategy Entry Explorer`, an explicit `DEMO / SYNTHETIC DATA` status, symbol/time-range context, and a clear UI indication that this is an entry exploration prototype. An `Entries (Analysis)` view is active. Do not add misleading functional `Backtest (with Exit)` or `Settings` tabs; either omit or render clearly disabled/marked future.
2. **Left variation browser:** Searchable list of at least **10 realistically different synthetic variations** (e.g., 5% rebound from recent low, shallow 2–4% pullback, breakout above prior high, MA crossover, momentum plus trend). Show rule summary and counts. Single-click a variation to replace its annotations on the same price chart. Support selecting a second variation for **overlay comparison** with distinct marker shapes/colors and a clear legend. Make controls intuitive, keyboard accessible, and avoid accidental loss of the primary selection.
3. **Central price chart:** Price is the persistent main line; dates are on the X axis, price on the Y axis. Entry events are discrete flags/triangles/markers anchored to the appropriate time/price, **not another line series**. Markers support hover **and click** with a readable tooltip/detail panel including variation ID, event type, date/time, price, trigger description, threshold/lookback values (when applicable), and whether it is a signal or an executed entry. Markers for two variations must be visually distinguishable. Add a sane policy for overlapping same-timestamp markers (e.g., stack/offset and an event list) rather than silently hiding one.
4. **Preserve chart viewport:** Switching variation(s), switching raw/executed marker filters, and clicking an entry should **not unexpectedly reset the current X-axis zoom/pan**. Offer explicit reset/all/1Y/3Y/5Y/range-selector controls or equivalent. Zooming into a 2020–2022 interval and switching variations is a primary acceptance test. Ensure selecting an entry from the table can intentionally center/zoom to it without destroying all other state.
5. **Signal vs executed controls:** Filter among raw signals, executed entries, and both; distinguish the types visually. Define generated demo entries as an illustrative execution subset, not a production-accurate portfolio simulation. Avoid depicting every raw signal as a filled position.
6. **Below-chart analysis summary:** Show illustrative counts, forward-move hit rates and/or MFE/MAE/time-to-target examples for the selected variation *only if they are computed from the demo series with a documented horizon and clear DEMO labels*. It's acceptable to use a smaller but mathematically coherent set of metrics rather than hard-coded fake claims. Do not imply these are historical VGT strategy performance results. If full metric calculation would materially expand scope, show a truthful modest summary (signal count, executed count, first/last entry) and reserve advanced stats in documentation for later.
7. **Entries table:** Scrollable, sortable/filterable list of selected variation's events with timestamp, price, signal/executed status, and trigger. Selecting a table row highlights/locates the corresponding chart annotation; selecting a marker highlights the row (or opens its information). Counts stay consistent with filters and time window, with labeling for total vs visible.
8. **Compare variations:** Support at least two overlaid entry-marker sets on one unchanged price series; easy to toggle one or both. For a first version, two at a time is sufficient; do not clutter the chart with 20 variations at once.
9. **Polish:** Good contrast, readable axes/legends, meaningful empty states, responsive treatment when the viewport shrinks, tooltips that don't clip, basic accessibility, browser-error-free behavior. Ensure multiple markers on dense ranges can be understood after zooming.

The supplied mockup suggests a ~25% left sidebar, ~75% chart content, a chart toolbar and range overview below the plot, and a bottom row split between entry metrics and entries table. You may improve the spacing/details while preserving this recognizable layout. The three illustrative mockup modes are: single variation, comparison overlay, and zoomed interval.

### Demonstration data and scope boundaries

- Include a **deterministic local fixture generator** or checked-in fixture dataset: a plausible, *explicitly synthetic* 2016–2026 daily price series and ≥10 entry variants with enough distinct events to make comparison meaningful. Several variants should generate raw signals as well as a smaller subset labeled executed, for feature testing. All displayed figures must be consistent with the underlying fixture.
- Clearly label the demo as **synthetic / fictional, not actual VGT prices or verified trades**. You can choose VGT as the *illustrative symbol label* but must not present synthetic prices as genuine historical VGT prices. Do not use archived research statistics as sample figures unless genuinely obtained from repository data and clearly attributed.
- Optionally load a real price series read-only if trivial and safe, but **do not spend this task integrating research/backtest data**. If real price is used with fake entries, label the two independently. Absolutely no actual signal-strategy implementation or parameter optimization now.
- Implement a simple **versioned, strategy-agnostic data contract** (e.g. `Dataset { schemaVersion, instrument, priceBars, variations[] }`, with `EntryEvent` fields) and sample loader/adapter interface. Include stable event IDs, variation IDs, timestamps with timezone policy, price/currency/adjustment semantics, parameter descriptors, source provenance (`synthetic` vs future `backtest`), event type (`signal` or `executed`), and optional event metadata. Do not hardcode special behavior by variation name.
- The future app will consume actual minute and/or daily data. Keep the architecture ready for timestamp alignment, daylight-saving and market-session semantics, duplicate timestamps, and annotation matching. With Dygraphs, don't silently place an event on an unrelated bar; expose alignment policy, and demonstrate exact alignment in fixtures. Design for range-aware/downsampled visualization eventually, while keeping raw event timestamps/semantics intact.
- Support the current desktop environment and existing project scripts. Do not introduce direct trading APIs, orders, margin changes, or side effects on existing strategy runs.

## Phase 3 — verification / acceptance criteria

Run the appropriate install, lint/typecheck, test, and build commands in the repo, fixing problems introduced by this task. Add focused tests for data-schema validation/fixture reproducibility, state/filter logic, and key behaviors where feasible; use browser automation or local manual verification if available.

**Acceptance walkthrough to actually verify:**

- Start the UI with **one documented local command**; see an immediately populated chart and demo warning.
- Click variation A: chart price line remains unchanged and only A's events appear.
- Zoom to a narrow date interval; select B: same interval persists and markers switch correctly.
- Add A+B overlay: both marker sets appear with distinct styling and counts; deselect one without reset.
- Toggle `signals` vs `executed`: markers, legend, summary counts, and table agree.
- Hover/click a marker: see accurate event details; select an event in the table: correct corresponding marker/price/date is highlighted or located.
- Verify no fabricated historical results are represented as actual returns. Refresh/start from a clean process; ensure no runtime errors.
- Existing trading tests and frozen strategies remain unaffected. Document any baseline failures distinctly.

## Phase 4 — commit and handoff

On the **new UI feature branch**, commit the implementation, tests, demo fixtures, and research-direction docs in coherent commits, using repo conventions. Don't merge the **new UI branch** back into `main` during this task: the user wants to review the UI first. Push the feature branch only if normal project workflow/authorization permits; do not force-push.

Finish with a concise handoff containing:

1. Original branch/HEAD, merged main HEAD, feature branch/HEAD, and precise push status.
2. What app was added, directory location, charting library/version, and **exact command to launch**.
3. Files containing the research plan and schema.
4. What UI features are working; which tests were run and their results.
5. Any intentional differences from the mockup or blocked features.
6. Explicit confirmation that **no real growth strategies or optimization runs were implemented**, and the demo is synthetic.

**Do not continue beyond this scope without a new instruction.** The next work session should be a user review of the UI, not implementation of entry mechanisms.
