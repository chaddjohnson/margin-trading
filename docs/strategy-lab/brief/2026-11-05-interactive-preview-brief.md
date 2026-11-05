# Claude Code Assignment — Strategy Lab: Interactive Preview

## Objective

Implement **Interactive Preview** in the existing Strategy Lab web application. It should let a user rapidly edit a strategy's parameters, execute **one** configuration at a time, and see updated chart markers, trades, events, and analysis **without creating a new saved run, variation, or left-sidebar history entry** on every iteration. Repeated identical configurations should load from a safe, durable result cache instead of re-executing.

This is a **general Strategy Lab feature**, not a Growth-specific form. Growth 1.2.0 is the principal acceptance target, including its conditional continuation, trend-filter, entry-eligibility, and exit controls. Use the existing registry/schema-driven parameter system and existing backtest runner wherever possible.

**Exact feature name in UI and documentation: `Interactive Preview`.**

### User preferences that must be respected

- The user manages date ranges manually. **Do not** enforce, preselect, lock, or automatically restrict dates to a development/training period or a holdout. Retain the active run's dates initially; provide date editing where supported and validate it normally.
- **No optimisation in the UI.** Interactive Preview executes only the single, explicit configuration submitted by the user. No sweeps, automatic tuning, background candidate generation, or automatic runs on every keystroke.
- The panel is **hidden by default**, opened deliberately, compact, and scrolls internally. Field helper text must not occupy permanent space.
- Existing immutable saved runs must remain unchanged. Preview changes never produce saved runs unless the user explicitly invokes **Save as run**.
- Cache correctness is more important than cache hit rate or speed. If validity cannot be proven, execute a fresh preview.
- Preserve chart event visibility checkbox states (e.g. Entry signal, Executed entry, Executed exit, Rejected/ignored signal) across every preview change and cached result swap.

## 0. Before changing code: inspect and plan

Inspect the actual repository rather than assuming paths or behaviour. Focus on:

- `apps/strategy-lab` React app, run detail route/chart, selected-trade/event state, sidebar and parameter form architecture;
- current New Test dialog and shared strategy parameter registry (`apps/strategy-lab/shared/strategies.ts` and related schema/validation), including `activeWhen`, enums, booleans, dependency rules, and versioned engines;
- run API, runner, request schema, async job/execution queue, SQLite persistence, `state/strategy-lab` artifacts, research exports and any existing caching mechanisms;
- Growth 1.2.0 and the previous `1.1.0`/`1.0.0` replay contracts, continuation, trade accounting and warm-up logic;
- import-only results, shared-slot/pool phenotypes, and constraints on what the existing backend can **actually** rerun.

Before implementation, write a brief design and enumerate the exact code paths and data structures affected. Reuse existing primitives instead of introducing a second, divergent parameter form or backtest engine.

## 1. UI and interaction design

### 1.1 Placement and size

- Add an **Interactive Preview** control near the existing chart header/toolbar on a saved run detail page; the control opens/closes a right-side parameter panel adjacent to the chart.
- Panel is **closed by default**. The initial chart is unchanged. Opening the panel should not navigate away or create a run.
- On desktop, the price chart and the panel share the available horizontal space; the chart resizes correctly. Target approximately 320–380 CSS px for the panel, adjustable if the application's responsive design warrants it.
- **Panel height must not exceed the chart/plot section height.** Its body scrolls vertically and independently; do not expand the chart or force the entire page to scroll through all parameter controls.
- On narrower viewports, use a responsive drawer/overlay or equivalent accessible treatment rather than compressing the chart to an unusable width. Preserve existing mobile behaviour.
- The panel can be closed without discarding the currently rendered preview. Provide a clear way to **Return to saved result** and restore the original immutable run view.

### 1.2 Compact inputs and help

- Reuse the **same parameter definitions, types, validation, conditional visibility, labels, enums, defaulting and dependencies** as the New Test form. Do **not** create a Growth-only parameter system.
- Render only **labels and input controls** in the panel (plus concise section headings). **Do not** permanently render verbose descriptions, parameter IDs, range strings, explanatory paragraphs or helper text beneath each field.
- Add a small accessible **info icon** beside each relevant label/control. On click (and keyboard activation), show a popover/tooltip containing the **full existing description/helper text from the New Test form**. Support dismissal, keyboard and pointer use. Do not copy or fork descriptions.
- Display all currently applicable controls, including enable/disable switches and dropdowns. Only display dependent parameters for the selected ON state and selected method/policy (Growth 1.2.0's four continuation methods, five trend filters and five eligibility policies are explicit acceptance cases).
- Preserve hidden/inactive values in the draft when toggles change, consistent with New Test semantics, but canonicalise only **effective** values when determining equivalence; invalid disabled fields must not block a valid submission. Maintain existing dependencies (e.g. buffered-loss exit depends on losing-hold exit).
- Include a small, compact date-range control if the strategy's executable test request permits date editing. Start with the selected run's date range, not an assumed research partition. The start/end date and bar resolution must be reflected accurately in the submitted preview request.
- Show strategy name and **exact internal version** prominently enough to avoid confusion with historical runs. A run that cannot be rerun (e.g. import-only, missing executable backend, unsupported shared-pool mode) must receive an explicit, informative disabled state; **never silently substitute a standalone simulation for an imported shared-capital strategy**.

### 1.3 Submission and state

- Changing an input only marks the form **Modified**; **no execution while typing**.
- **Enter** from any applicable field submits the whole current configuration (except when used to select a dropdown option or interact with a popover); clicking **Run preview** also submits. Avoid accidental duplicate submissions.
- `Run preview` is disabled if (a) the effective configuration equals the **last successfully displayed configuration**, (b) the draft fails validation, or (c) an in-flight state requires it to be disabled. The button must become enabled again when the user returns to a previously executed configuration that differs from what is currently displayed, even if it is in cache.
- Explain validation failures concisely and accessibly, adjacent to the affected inputs or in a compact error summary.
- Show clear statuses: **Modified**, **Running**, **Cache hit**, **Preview ready**, **Error** (or equivalent). Show loading feedback without erasing the currently valid displayed result until a replacement is complete.
- Provide **Reset parameters** (restore the currently displayed configuration or original saved run configuration; choose clear naming and document exact semantics), **Return to saved result**, and **Save as run**.
- **Save as run** is an explicit action only after a successful preview. It creates a new normal, immutable run with the precise execution configuration, result, provenance, and appropriate relationships, and only then adds a sidebar entry. Ensure it works for cached previews as well as newly computed previews. Avoid mutating or reassigning the source run. If the current configuration is already saved, consider informing the user rather than creating accidental duplicates, but do not silently discard intentional saves.
- Clearly distinguish a **Temporary preview** from a saved `R-xxxxxx` result in the page header. Show the source saved run when applicable. A preview must **never masquerade under the original saved run ID**.

## 2. Preview semantics and isolation

- Use the **same simulation engine, execution assumptions, accounting and result schema** as ordinary single-configuration backtests. No approximate “fast mode” that changes trades or drawdowns.
- Preview is **ephemeral research state**: no saved-run ID, variation ID, bookmark, note, optimisation trial, trial counter or persisted normal-run history record is created during previews. It may have a separate opaque preview/cache ID that cannot be confused with `R-xxxxxx`.
- Reusing one preview repeatedly replaces its *displayed* results; it does not edit the original saved run, its SQLite records or its artifact directory.
- If the existing runner requires writing intermediate artifacts, write them in a dedicated temporary/cache namespace with proper cleanup, never into normal saved-run paths.
- Preview outputs should contain the same material as saved runs needed by the UI: price data reference, entry/exit/ignored event markers, trade ledger, realised/unrealised P&L, interest, minute/daily drawdowns, entry gate diagnostics, metadata and analysis. Preserve full chronological fidelity and provenance.
- Retain the ability to export research logs/bundles for the current preview (with clear *preview* provenance) if this can be safely built on the current export pipeline. Do not make temporary previews unreviewable merely because they are not saved runs.
- Correctly resolve base strategies and versions; existing 1.0.0/1.1.0 artifacts must remain immutable and replayable. For a historical run whose version cannot support editing/preview, explain that explicitly. Do not invisibly upgrade its engine or parameters.
- If saved-run data differs from the current implementation/version, expose the difference. The UI must not claim a preview reproduces a historical run unless its execution identity matches.

## 3. Cache design — persistent and correctness-first

Implement a bounded **server-side cache** of completed preview computations, optionally with a small in-memory LRU on top. Cache must survive normal server restarts. It must not create normal saved runs or sidebar records.

### 3.1 Deterministic execution identity

Construct a canonical, stable cache key that includes **all inputs capable of changing results**, including at least:

1. Strategy stable ID **and exact algorithm version**; if applicable, pool/allocator ID, pool policy and all per-symbol phenotype versions/parameters.
2. Canonical, fully resolved **effective** parameter values (including active toggles, categorical method choices and method-specific numerical values; omit irrelevant inactive parameters in a principled, documented way).
3. Symbol list and ordering semantics, date range, bar resolution, warm-up requirements and relevant replay/simulation mode.
4. Fees, slippage, financing rate, fill semantics, capital/notional assumptions, session calendar, corporate-action treatment and any other execution/accounting settings.
5. **Market data identity**: validated hashes/content fingerprints (and corporate-action metadata where applicable), not filenames or modification timestamps alone. A changed relevant file invalidates the cache. Conservative invalidation of all data for a changed symbol is acceptable.
6. **Executable implementation fingerprint** covering relevant strategy code, runner, indicator logic, accounting/execution engine and relevant local dependencies. Strategy version alone is **not sufficient**: a code change with an unchanged version must invalidate cache. Git HEAD alone is also insufficient for uncommitted modifications, cherry-picks or changed build outputs. Use a documented stable hash of applicable source/build inputs or a trustworthy build manifest; **fail closed** if it cannot be resolved.
7. Result schema/cache format version so incompatible cached payloads cannot be loaded after app schema changes.

Use stable sorting and number normalisation; validate the stored manifest again on every cache hit. Prefer conservative cache misses to false hits. Different date ranges, versions, data, assumptions or effective parameters must never be treated as the same execution.

### 3.2 Operational semantics

- Cache **only completed, valid, reconciled results**. Never cache failed, partial, cancelled, corrupt or inconsistent outputs as successful results.
- Return explicit `cacheHit`/provenance metadata, but avoid claiming a cache hit for a recomputation.
- Coalesce concurrent requests for the same exact key (one execution, multiple waiters) when safe. Respect cancellation/obsolescence per client without corrupting a shared in-flight calculation.
- Writes should be atomic (temporary file + verified manifest + rename, or equivalent). On corruption, missing files, mismatched fingerprints, unsupported schema or failed reconciliation: ignore/evict and recompute.
- Limit disk size and entry count with a deterministic LRU/age-based retention policy; implement safe manual cache clearing or equivalent maintenance capability if suitable. Never clean or delete normal saved runs, market data or imported research artifacts.
- Keep preview caches separate from research history; explain disk location and cleanup in docs.
- Measure and report cold-run vs warm-cache latency on representative Growth real-data requests. No performance promises without actual measurements.

## 4. Correct UI refresh and concurrency

- A successful preview replaces **all coupled result views together**: chart line and markers, Events table, Trades table and trade details, Analysis statistics, entry-gate diagnostics, annotations and summary labels.
- Preserve the user's *presentation preferences* across preview changes and cache swaps: **all chart marker visibility checkboxes**, symbol tab when still valid, chart zoom/pan where date overlap permits, event filters, and optionally chart display scale. These settings belong to the view and must not be reset by new result objects.
- When a previous selected trade/event no longer exists, clear selection or match only by **verified stable identity**. Never select a different trade just because it reused the same ordinal `T-7`.
- If the chart window no longer overlaps the new date range, reset to a sensible bounds-limited view rather than displaying blank or misleading axes.
- Maintain hover, paired entry/exit highlights, tooltip information, Cmd/Ctrl-drag panning, drag-to-measure, wheel zoom, markers and navigator functionality after repeated preview swaps.
- **Never mix data from different executions** in the same displayed result. In-flight requests have monotonically increasing request IDs/revisions; obsolete responses cannot overwrite newer submitted results. Cancel unnecessary work where supported; otherwise ignore stale responses safely.
- Handle browser navigation, panel close/open, server restart, cancellation, network failure, invalid input and repeated submissions without creating orphaned saved runs or inconsistent cache entries.
- Preview state may be held per tab/session; define its lifetime. Reloading a preview may restore from its validated cache key if the app has enough state, but do not promise cross-device persistence of draft fields unless implemented explicitly.

## 5. Date-range handling

The user explicitly wants manual control. **Do not** add special training/holdout restrictions, automatic 2016–2024 defaults, 2025–2026 warnings, validation gates, or optimisation-related locking to Interactive Preview.

- Start with the dates and bar resolution of the currently displayed saved run whenever executable.
- Allow editing the date range where the ordinary runner already supports it (or add a compact equivalent using existing validated run request semantics).
- Date changes count as a change to the effective configuration and its cache key, even if no trading parameters change.
- Preserve correct warm-up and cross-boundary state semantics identical to ordinary backtests. Do not reset positions, continuation windows or eligibility at artificial boundaries merely to speed up preview.

## 6. Tests and acceptance scenarios

Write meaningful unit, integration and browser tests. Test the actual backend and UI with representative real-data cases as well as synthetic cases. Include at least:

1. Opening/closing the panel; hidden by default; chart size/overflow; keyboard accessibility; narrow viewport; popovers show exact New Test help text without always-visible descriptions.
2. Generic dynamic controls: Growth toggle OFF/ON, conditional continuation method (all four), trend method (all five), eligibility policy (all five), optional exit dependency, and preservation of inactive draft values.
3. Enter submits whole form; no per-keystroke execution; unchanged configuration disables Run preview; change enables; invalid config blocks; return to previous *cached* combination enables and hits cache.
4. Starting from saved run `R-A`, run configuration `C1`, then `C2`, then `C1` again: only two cold executions; `C1` loads from cache on return; **zero new saved runs, variations or sidebar entries** throughout.
5. Explicit Save as run from both fresh and cached previews creates exactly one new immutable run and the correct sidebar item; source run remains byte-for-byte unchanged.
6. Distinct date ranges, bar resolutions, effective parameters, data hashes, algorithm versions, implementation fingerprints, costs and fill policies produce distinct cache identities. Disabled/irrelevant parameter values do **not** spuriously change the identity.
7. Modify strategy/runner/accounting code **without** increasing the advertised strategy version; invalidate the previous cache. Also invalidate when a relevant market data file changes or a cache payload is tampered with.
8. Cache persists across restart and atomically recovers from a partial write. Test cache eviction without deleting any normal run/history data.
9. Repeated swaps preserve chart checkboxes (especially entry signal, executed entry, executed exit, rejected/ignored signal), zoom when sensible, events filters and symbol tab; stale trade selection isn't misapplied.
10. Rapid sequential submissions and out-of-order completions: only latest requested configuration displays; cancellation/errors never show mixed results or false success.
11. Preview engine output (trades, events, accounting, minute/daily DD, entry-gate decisions) matches a normal single-configuration backtest on identical inputs. Reconcile pennies and complete event lineage where possible.
12. Imported Study 8/shared-pool or otherwise non-executable historical results do not silently run a different standalone strategy; unsupported previews show a clear explanation.
13. Existing run deletion, research exports, New Test, phenotype import, optimisation trial references, legacy replay and data integrity continue to work.
14. Cache hit reports true only on validated reuse and returns results equal to the original execution; demonstrate a measurable warm-cache improvement.

Include a brief acceptance checklist and direct commands for local smoke testing. If test fixtures or data are missing, state which checks were not possible rather than asserting completion.

## 7. Suggested build plan and deliverables

Use your judgement on module boundaries, but prefer the following sequence:

1. Inspect and write a concise design covering preview lifecycle, cache fingerprinting, UI state, and how to reuse parameter definitions and result renderers.
2. Implement the backend execution/cache path, isolated from saved-run persistence, with provenance, cleanup and cache safety tests.
3. Implement the compact responsive UI panel and generic parameter controls with info popovers.
4. Integrate preview result swapping into existing charts, events, trades, analysis and exports while preserving presentation state.
5. Implement explicit Save as run and return-to-saved-result interactions.
6. Add full tests and documentation. Benchmark at least one real-data uncached request and its repeated cached request.

Update appropriate Strategy Lab architecture, operations, research workflow and UI documentation. Document the cache key, source fingerprint scheme, storage location, retention, cache clear/repair, and exact behaviour of Save as run. Include a short results summary: files changed, what works, tests passed/failed, cold/hit timings and known limitations.

## 8. Git and execution safety

- Implement this **before** the planned Growth VGT optimisation study. Inspect the current branch and repository state first.
- Work on the existing `feature/strategy-entry-explorer-ui` branch if it remains active, or an appropriate fresh feature branch from the current safe baseline **without prematurely merging into `main`**. Do not discard unrelated work or reset the user's data.
- Do not execute the previous Growth optimisation study prompt as part of this assignment.
- Preserve the live SQLite DB and every saved run/variation/phenotype/notes/bookmark. Take a suitable backup before any operation that might mutate their storage; a preview-only operation must not require a data migration unless justified.
- Run relevant unit, integration, end-to-end, build and typecheck/lint tests; distinguish pre-existing failures from regressions.
- Commit and push the implementation branch. **Do not merge into `main`** as part of this assignment; the separate optimisation prompt already has an explicit review-and-merge-first workflow.
- If any major design conflict or unsafe cache invalidation mechanism remains unresolved, explain it rather than silently weakening reproducibility.

### Completion criteria

The user can open any **rerunnable** saved Growth result, toggle **Interactive Preview**, change `Advance from recent low (X)` from 5 to 10, press Enter or **Run preview**, and see newly computed results across chart/trades/analysis **without creating a new saved run**. Changing X back to 5 must reuse the appropriate validated cache entry. Chart marker checkbox states must remain exactly as the user left them. Changing the strategy implementation without changing its displayed version must still invalidate the old cached result. The user may explicitly **Save as run** if they decide to preserve a particular preview.
