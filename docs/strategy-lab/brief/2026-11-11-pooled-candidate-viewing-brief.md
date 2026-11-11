# Priority 6 — Make all five pooled candidates viewable in Strategy Lab

## Assignment and authorization

Implement, test and make usable **combined-candidate viewing in Strategy Lab**. The user wants to select a complete portfolio candidate and inspect its actual funded trades, even when D1 and Growth both trade the same symbol. Deliver working application functionality, not only a design, static report, screenshots or instructions for a later implementation.

The approved candidate list consists of the four candidates in the user's screenshot plus the new L0 primary from the completed matched lifecycle study. All five are required; do not reduce the task to the three multi-symbol candidates.

This is an application integration task, **not a new optimization or strategy-selection study**. No search, retuning, new neighborhood experiment, funding-rule change or candidate substitution. Replaying the frozen candidates for integration and parity is authorized, including their already-examined 2025–2026 results. Their inclusion in the viewer does not mean deployment or a declaration that they are independently validated.

Use a new task branch such as `feature/strategy-lab-pooled-candidates`, based on a verified checkout containing the completed lifecycle study and existing Strategy Lab. Its reported completion branch is `research/vg-lifecycle-matched-optimization`, commit `60eb7690`; inspect actual history and any later legitimate work before choosing the base. Preserve unrelated work and running services. Commit and push task-related work automatically at completion; no routine confirmation. Do not merge into main, force-push, deploy a public/production service or place broker orders.

Starting a local task-specific Strategy Lab development instance and exercising it in a browser is authorized. The previous backend-only restriction concerned optimization, not this explicitly requested UI implementation. The no-visuals preference concerns research reports; building, viewing and verifying the requested application charts is authorized. Keep the delivery report in Markdown with tables; do not create a separate visual report.

## Read and inspect first

Read applicable `CLAUDE.md`, `AGENTS.md`, `docs/claude/context-recovery.md`, the current roadmap, and relevant Strategy Lab architecture and run instructions. Maintain a task-local `WORK_RECOVERY.md` through implementation, verification and delivery.

Read the exact candidate artifacts, their conventions and relevant source code from:

- `research/vg-lifecycle-matched-optimization/`: `FROZEN_SELECTION.json`, report, protocol, amendments, validation tables and exported settings;
- `research/vg-d1-growth-expanded/` and `research/c4-gdx-growth-partner/`: C4, C4-refined and their exact identities;
- `research/vgt-d1-growth-joint/` and `research/vgt-d1-growth-separate-pooled/`: the two VGT-only fixed combinations, their architecture A conventions, comparator manifests and ledgers;
- `research/growth140-vgt-stable/`: exact Growth `08500a60ec56cfae` identity;
- relevant pooled runner and Growth/D1 engine code, including `src/vg-d1-growth-joint/`, `src/vgt-d1-growth-joint/` and the latest verified adapters.

Inspect the current application before designing changes: candidate/run selection, Interactive Preview, chart events, per-symbol tabs, trade ledger, metric calculation, preview caching and persistence. Reuse established components and APIs where suitable. Do not assume that per-symbol tabs require a separate page for every trading strategy.

Read the optimization standard to understand the archived metrics and constraints. This task changes no optimization rule and requires no new search protocol. Use ordinary application integration tests and parity fixtures. If a bounded diagnostic is genuinely necessary beyond parity, follow the standard's diagnostic requirements without expanding into optimization. Preserve all frozen studies, hashes, selections and verdicts. Compare historical manifests at their original commits where needed; never relax a historical guard to accommodate new application code.

## Required candidate catalog — exact identities

Create a small versioned catalog with stable IDs, readable names, full parameter vectors, enabled components, engine/allocator conventions, source artifact paths and hashes, and dates/data provenance. Recover settings from authoritative artifacts, not screenshots or abbreviated descriptions. A repeatable catalog build/verification step is preferable to manually copying undocumented defaults.

| Display name | Exact combination / identity |
|---|---|
| **New L0 primary** | Matched lifecycle study `C24/L0/informed/R1#1 profit`, `FROZEN_SELECTION.json` → `arms.L0.primary`; candidate ID `67cfdd9b62d1e16f`, Priority 3 quad ID `a2e385640ca61012`, VGT Growth identity `6b5f909b30cfa516`. Modified D1–VGT + modified D1–GDX + VGT Growth; GDX Growth OFF; L0. These D1 books are **not** the unchanged VG #2 pair. |
| **C4-refined** | Alias of 3B `C24/informed-fixed#1 profit` / `informed-fixed#1`, ID `0f017f0ab9b26f24`, Priority 3 quad `07443ffaeef41e85`. VG #2 Balanced's unchanged D1–VGT and D1–GDX books plus refined VGT Growth; GDX Growth OFF. Not `informed-joint#1` and not the new L0 primary. Its Growth vector differs from original #4 in 17 settings, including initial stop OFF; do not reconstruct it as just trend OFF and trailing stop 5.7%. |
| **Original C4** | VG #2 Balanced's D1–VGT + D1–GDX pair plus original VGT Growth #4; GDX Growth OFF. Priority 3 quad `f324035d15f69610`; Growth #4 identity `420cd989e4fa7749`. |
| **VGT-only: D1 primary + Growth #4** | Existing standalone VGT D1 primary, paired as-is with original VGT Growth #4 under Priority 2's architecture A, D1 first. No GDX component. This D1 primary is not the newly optimized D1-only winner and not automatically VG #2's VGT book. Recover the fixed comparator exactly. |
| **VGT-only: D1 primary + Growth 08500a60** | The same existing standalone VGT D1 primary, paired as-is with Growth `08500a60ec56cfae` under architecture A, D1 first. No GDX component. Preserve its partial-exit and remainder-management settings exactly. |

VG #2 Balanced is Study 8 `S8-VG-F24-3` / `s8-vg-balanced`, not the older similarly named Study 7 pool. Catalog names and details must make these distinctions understandable. Display the candidates in the order above, without labeling that order a safety ranking or declaring a new adopted favorite.

For all candidates recover the complete effective engine settings, including boolean switches, continuation rules, disabled values, units, signal resolutions, warm-up, arming, tie-breaking, reservations, financing and partial-exit treatment. Handle serialized non-finite sentinels deliberately; never turn a disabled field into an active rule during JSON import.

## Required numerical parity

Default benchmark replay: **2016-01-04 through 2026-10-30**, using the matching canonical data and each candidate's archived simulation conventions. One fixed **$100,000** capital pool, no compounding; preserve canonical costs and interest (normally 5 bps per side and 11% simple annual interest). Verify these against each source rather than overriding it with current UI defaults.

| Candidate | Full-history marked net P&L | Full-history maximum minute DD | 2025–2026 marked net P&L |
|---|---:|---:|---:|
| New L0 primary | $479,605.18 | $20,385.99 | $96,883.72 |
| C4-refined | $452,082.36 | $19,477.66 | $91,512.65 |
| Original C4 | $401,867.24 | $21,536.85 | $99,081.34 |
| VGT-only: D1 primary + Growth #4 | $271,525.33 | $19,534.41 | $66,585.12 |
| VGT-only: D1 primary + Growth 08500a60 | $252,359.65 | $19,556.63 | $60,551.20 |

The validation numbers are the continuous run's marked-net change across the year-end 2024 boundary, through October 30, 2026. Preserve open positions and strategy state across that boundary. Do not recreate them by starting a fresh account in 2025. Full-history net includes unrealized P&L after canonical costs/financing; it is not just closed-trade profit. Published rounded subperiod numbers can differ from the rounded full total by a cent; use underlying precision and match each published field independently.

Known development checks: new L0 primary $382,721.46 net / $19,459.83 minute DD; C4-refined $360,569.71 / $17,280.74; C4 $302,785.91 / $17,332.09. Obtain all other checks, trade counts and exact ledgers from their authoritative archives.

**D1 arming matters:** combined studies can use harmonized early arming, while native VG #2 uses its original later start. Preserve each candidate's verified convention. Do not load the native VG #2 runner and silently substitute its different outcome for the combined candidate.

Reconcile money to the cent, timestamps, funded position/fill counts, quantities, partial sales, cash/principal/interest and open balances. An unexplained mismatch blocks the affected candidate's verified label; investigate it rather than changing a target or hardcoding a number. Complete the other independent work if one source is temporarily unavailable, and report any real remaining blocker precisely.

## Use the actual pooled simulation

Create or adapt a thin, tested bridge from the verified backend pooled runner into Strategy Lab's result/event model. Prefer reuse or a behavior-preserving extraction over another implementation of the trading rules. A cached canonical replay is acceptable if fully keyed and reproducible; a static standalone-event overlay is not.

All five candidates use the current L0 behavior. Preserve shadow state internally where the engine requires it, but **never present shadow trades as chart trades or ledger fills**. Do not change refused-entry behavior to make the display easier. Preserve the exclusive slot and its reservation after partial exits; partial liquidation does not automatically make another strategy eligible for the slot.

The latest study fixed an L2 end-of-window unfilled-order record defect locally. Read the amendment so shared adapters do not accidentally reintroduce missing-order records. L2 is not part of these five candidate presets, and there is no need to expose or implement L1/L2 controls for this task.

The integration must support actual entries, any partial exits and final exits, including multiple events on the same day. Stable event and position IDs should link charts, tooltips and ledger rows. Unfilled orders at the endpoint are not executed entries. Positions open at the endpoint must remain open, with marked P&L; do not invent a closing fill.

## User experience

Implement a clear **portfolio candidate selector** integrated with Strategy Lab and its preview/result workflow. Loading a candidate loads its complete portfolio, not a single component's standalone result. Show its readable composition and a settings/details view with each component's exact parameters and portfolio conventions.

A read-only frozen preset is acceptable and preferred to an incomplete multi-component parameter editor. Existing custom preview editing must continue to work. If editing a loaded preset is supported, create an explicitly labeled custom derivative; never mutate the frozen catalog identity or continue presenting its archived metrics as the edited run's results.

Required behavior:

1. **Portfolio summary:** actual aggregate marked net P&L, maximum minute DD, realized/open breakdown, exposure and position counts. Clearly distinguish portfolio totals from symbol/component attribution. Reuse the application's portfolio equity/DD display if present; add the necessary portfolio-level view if absent. Compute minute DD from minute marks even when price candles are daily. Do not sum per-component drawdowns or standalone profits. Label percentages with their denominator.
2. **Symbol tabs:** retain VGT/GDX tabs for multi-symbol portfolios and VGT for VGT-only portfolios. A VGT tab can contain both D1 and Growth trades. Switching tabs changes what is displayed, not the simulation or pool accounting.
3. **Executed events shown by default:** funded entries, partial exits and final exits. Distinguish D1/Growth with a readable shape, outline or badge and legend; preserve established profit/loss color semantics. Partial and final exits must be distinguishable, including in monochrome or overlapping clusters. Do not silently discard dense events; reuse grouping/fanning and intraday drill-down where available.
4. **Tooltips/details:** component, symbol, entry/partial/final action, execution timestamp/timezone, price, quantity, amount, remaining position, position ID, exit reason and relevant P&L. Clearly distinguish fill-level realized P&L from whole-position net after costs and interest. Reuse the established P&L color attribution if consistent; document how partial events are colored.
5. **No shadow-trade display:** no hypothetical entries, exits, profits or virtual holdings in the actual charts/ledger. Backend virtual state can remain internal.
6. **Optional refused signals, OFF by default:** inspect the existing purple crossed-circle icon and reuse it if appropriate. Identify the reason (e.g. insufficient pool availability) and component. Do not invent refusals from absent trades or treat every filter block as a refused executable signal. These events never count as fills, positions or P&L. No shadow-trade exit marker is needed to explain a refusal.
7. **Trade ledger:** show real pooled positions, expandable execution events and partial exits. Support symbol/component filtering and jump-to-chart behavior consistent with the app. Count a partially exited position as one position, not several independent winning trades. Preserve open/closed distinctions and reconcile totals with the portfolio summary.
8. **Visibility controls:** toggling a component or event type changes visibility only. It must not rerun the portfolio with that component removed, recompute capital allocation or alter aggregate performance. Label any displayed filtered subtotals explicitly. A component's booked profit is attribution, not causal contribution.
9. **Dates:** preserve existing zoom, pan, candle/intraday and range controls. A chart-range selection is a viewport, not an account restart. If the app offers a separate simulation-window control, label it distinctly and do not show frozen benchmark targets as the results of a changed window. Preserve full-run carry-in state when presenting a validation-period view.
10. **Persistence and preview:** browsing candidates must not create duplicate saved runs or overwrite user data. Use the existing preview/cache conventions or a separate namespaced candidate cache. Cache keys must include candidate vector, lifecycle, allocator/accounting, data/window and engine version/hash. Show pending/error states, cancel or coalesce redundant work and prevent a stale response from one candidate appearing under another's label.

Keep the interface familiar and concise. Source hashes and research IDs belong in expandable details, not in the main flow. Never require the user to read a research report or manually paste configuration JSON to view the five candidates.

## Preservation, performance and runtime

Preserve existing saved runs, preview history, chart settings and user data. Use additive, reversible persistence changes if needed; back up affected persistent stores before a required migration and verify existing records still load. Do not wipe a cache or database to make tests pass.

Avoid loading duplicate full minute datasets per component/request, retaining huge traces in the browser, or recalculating the same replay on every visibility toggle. Keep replay on the backend; send the data needed by the visible chart and ledger, with bounded caches and lazy detail loading where appropriate. Avoid premature infrastructure expansion: five presets should not require a new distributed system.

Apollo has 64 GB RAM. Heavy replay/test work may use available capacity safely under an **aggregate** MemoryHigh=44G / MemoryMax=48G / MemorySwapMax=0 boundary, with Claude/tmux outside. Account for concurrent services and other jobs. Heap limits alone do not bound typed-array memory. Do not run several individually capped jobs whose combined use can exhaust the machine.

Inspect running Strategy Lab processes and ports before starting the task version. Prefer a separate local instance if replacing the existing process would disrupt user work. Do not kill an unrelated service or silently repoint the user's usual URL to an unverified build. Deliver the exact working URL and launch command for the implemented branch; if port 4317 is occupied, a clearly reported alternate local port is acceptable. Make the task instance reachable from the user's browser on Apollo's existing private-network setup without changing firewall/security settings. This authorizes local development serving, not production deployment.

## Verification and acceptance

Write focused, meaningful tests for the new bridge, catalog and UI behaviors. At minimum:

- Catalog completeness: all five exact identities; no accidental mixing of the existing standalone D1 primary, VG #2 D1 pair and new L0's modified D1 books.
- Canonical backend-to-app parity for all five at the default dates, including full and validation figures above, exact funded event chronology and open balances. Do not rely on headline totals alone.
- Real partial exits and final exits in the 08500a60 combination, using its actual ledger if present; add a small synthetic fixture for any edge case absent from these five ledgers. Verify remaining quantity, finance allocation and position counts.
- Refused and unfunded virtual events excluded from executed markers/ledger by default; optional refusals only when enabled; unfilled orders never rendered as fills.
- Component/symbol/visibility changes leave aggregate results unchanged; validation viewport preserves carry-in; rapid candidate switching cannot show stale metrics or events.
- Existing single-strategy runs, saved data and Interactive Preview still work; chart controls and persisted preferences do not regress.
- Browser end-to-end verification: load and run every candidate, inspect VGT and GDX where applicable, match a real entry/partial/final event to the ledger, exercise filters, refused-signal default, zoom and daily/intraday views, reload and verify persistence. Use real browser interaction where available; backend tests alone do not establish usable charts. Browser automation or screenshots used to verify this application are authorized.
- Run the build and relevant test suites, then the repository's required broader checks. Separate pre-existing failures from regressions with evidence. An unavailable browser tool is a verification limitation to report, not a reason to claim that UI verification passed.

Keep a compact acceptance table with expected/actual results, pass/fail and evidence. Do not hide unresolved parity failures behind a generic success statement. Preserve old research outputs unchanged; new parity records belong to this task.

## Documentation, roadmap and delivery

Update `docs/research/ROADMAP.md` and relevant current instructions to record the user's latest decisions:

- Matched lifecycle optimization (5B) reviewed; L0 remains the working funding model. Preserve its original evidence labels and results.
- **Priority 6: Strategy Lab pooled-candidate viewing**, this task, with all five named candidates including the new L0 primary.
- **Priority 7: Growth for other ETFs**, only after this functionality is working and reviewed. This explicitly supersedes the older ETF-first sequence in 5B's brief/report. Preserve historical entries as history, but remove contradictory current next-step instructions.
- 4B and broader allocation/reassessment/preemption research remain deferred. The declined 3C partner stays declined. No optimization, ETF screening or next-priority work starts as part of this task.
- Candidate catalog inclusion is permission to inspect, not a live-trading instruction or a new favorite designation.

Document the candidate provenance, preset/preview semantics, event and P&L definitions, parity results, startup instructions and any known limitations. Keep the normal research-report no-visuals rule intact; note that explicitly requested Strategy Lab application charts are outside it. No new selection/risk-rule version is needed just to build the viewer.

At completion, commit and push only task-related work without routine confirmation and verify remote/local commit agreement. Leave the verified local task instance usable where feasible, with a recovery/start command and its URL. Report:

1. What was implemented and where the user selects the five candidates.
2. Exact working URL and branch/commit.
3. A five-row parity table with full-history marked net, minute DD and validation net.
4. Confirmation that entries, partial exits and final exits are actual funded events; refused signals are optional and initially hidden; shadow trades are absent.
5. Tests performed, any remaining limitation and data-preservation status.

Stop for user review after Priority 6. Do not merge, deploy or start Priority 7 automatically.
