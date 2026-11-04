# Claude Code assignment — Strategy Lab: fix wheel direction and implement a clean growth-trading strategy

## Context / session start

You are starting in a **new Claude Code session** in the existing Margin Trading / `ai-trading` repository on host **`apollo`**. The previous Claude session may have been interrupted while working on a different, now-cancelled design that combined growth entries with post-material-loss restrictions and recovery resets. **This prompt supersedes that design.**

First read the repository's `CLAUDE.md`, applicable context-recovery / project docs, the current Strategy Lab implementation, existing rise-from-recent-low entry scanner, and actual D1 shared-margin exit implementation. Inspect Git and runtime state before editing. Do not assume the current branch, working tree cleanliness, file names, or installed service status.

The user wants **two changes**, not a new optimization study:

1. **Fix mouse-wheel / trackpad zoom direction in Strategy Lab.**
2. **Add a new, versioned, fully backtestable growth-following strategy** based on the existing, preserved **Rise from Recent Low** entry mechanism, with D1-like profit-conditional trailing stop, maximum losing-hold exit and buffered intraday-loss exit. Make its parameters and optional exit rules configurable in the browser, and display actual trades, exits and complete standard backtest metrics.

### Explicit design correction — important

**Do not implement material-loss restriction, lower-price re-entry requirement, or recovery reset in this new strategy.** Do not expose their checkboxes or parameters. Those are mechanisms from an older dip-recovery strategy family and are counter to the primary objective of catching growth runs after valid new signals. No frozen reference high / reset choice is needed; do **not** stop to ask the user the prior reference-high question.

Also, do **not** inherit VG Balanced's deep-dip trailing buy or its post-profitable-exit pullback/continuation entry mechanism. The new strategy's only positive entry mechanism is Rise from Recent Low. Re-entry is allowed when a **fresh** valid growth signal occurs after exit, with no mandatory further price decline, loss cooldown or recovery reset.

Preserve existing `rise-from-recent-low@1.0.0` signal-only strategy, all D1 and `s8-vg-balanced` implementations, sealed studies, historical Strategy Lab runs and imports.

## 0. Mandatory safe recovery of partial work from the interrupted assignment

**Treat the prior Claude session as interrupted, not as an invitation to roll the repository back.** Its work may be uncommitted, staged, committed or already pushed; some of it may be useful, and unrelated changes may coexist. Before implementing the new design, perform this recovery process **on the current checkout and feature branch**:

### 0A. Inventory and identify the last approved state

1. Read the repo's `CLAUDE.md` and recovery policy first. Record `pwd`, `git branch --show-current`, `git status --short`, `git log --oneline --decorate -20`, `git diff --stat`, `git diff --cached --stat`, and the branch's upstream relationship. Inspect untracked files **without deleting them**. Do not assume a clean worktree, which commit represents the approved baseline, or that the latest commit is disposable.
2. Identify the **last approved working Strategy Lab implementation** using existing commit history, documentation and session outputs. In particular, preserve the working chart/UI, drag-to-measure, mouse-wheel zoom implementation (fix its *direction* separately), SQLite persistence, imported VG Balanced results, run history, existing entry-only strategy, and all other pre-existing features.
3. Enumerate files/hunks/commits introduced by the *cancelled* request to add material-loss restriction, lower-price re-entry and recovery reset. Classify each as: (a) approved pre-existing, (b) unfinished work specific to the cancelled design, (c) potentially reusable work for this revised design, or (d) unrelated/unknown user work. Do not classify changes solely by file name or commit date; inspect diffs and dependencies.
4. Before touching anything, create a **recoverable, local, non-Git backup** of the exact current state: capture diffs of tracked/staged changes, an inventory and safe copies of relevant untracked application files, and the identities of any commits to change. Store backups outside the Git-tracked tree (or in an ignored recovery directory), with a concise manifest. Do not copy secrets into logs or commit backup material. For database work, use SQLite's consistent backup API/command, not an unsafe raw copy of a live DB.

### 0B. Targeted cleanup only, retaining useful work

5. Remove or replace **only** the cancelled design's incompatible parts: material-loss restriction logic, lower-price re-entry logic, recovery-reset/reference-high mapping, and their new UI controls, schema elements or tests **if** they came from the unfinished assignment. Do **not** remove any similar functionality in the older, established strategies; those must remain untouched.
6. Retain reusable implementation from the interrupted assignment **only if verified correct and compatible** with this prompt (e.g. new strategy registration plumbing, generic run-result metrics, or the zoom-direction fix). Amend it if necessary, maintaining existing version/run immutability and complete test coverage.
7. If the cancelled changes are **uncommitted**, restore only the specific affected hunks/files after examining their diffs and accounting for any other edits within them. If **committed or pushed**, preserve published branch history: use a new corrective commit or suitably scoped `git revert` as appropriate, never history rewriting. A broad commit-level revert is acceptable **only after verifying it contains exclusively cancelled changes** and will not remove approved work; otherwise do a narrower corrective edit. Never force-push.
8. **Forbidden without separate, explicit user approval:** `git reset --hard`, `git clean -fd`/`-fdx`, broad `git checkout -- .`, broad `git restore .`, destructive branch rewinds, deleting the SQLite file, clearing run history, dropping tables to start fresh, or removing unrelated files/commits. No changes to `main`, sealed research artifacts or existing trading strategies.
9. If you cannot reliably determine which code belongs to the interrupted assignment, or a targeted rollback would destroy unrelated work, **stop and ask the user**, showing exact affected files/commits and the smallest viable choices. Do not guess. Otherwise proceed autonomously with a brief recovery summary and then implement the revised strategy.

### 0C. Running service, database and integrity

10. Check Strategy Lab's current service state and whether user backtests are active. Never terminate a user's active run without asking. If needed for backend changes or migrations, stop only the relevant service safely, recording its original running/enabled state.
11. Preserve SQLite data, bookmarks, notes, run IDs, immutable historical results and imported VG Balanced artifacts. Before migrations, take a **consistent** SQLite backup, test forward migration and backward/old-run reads, and do not overwrite already-persisted strategy identities with the new implementation.
12. Validate that previously approved UI functionality and historical runs still work **after cleanup and before new implementation**, insofar as practical. Restore the service to its prior running/enabled state only after testing, unless doing so is unsafe; if blocked, explain why and give exact commands.
13. Stay on the verified current Strategy Lab feature branch, commit and push the *revised* implementation when finished, and **do not merge into `main`**.

**In your final report:** identify the verified approved baseline, list precisely which cancelled changes you removed and which useful changes you retained, describe recovery backups and Git treatment (including any corrective commits), and confirm that unrelated user work and persistent data were preserved.

## 1. Fix trackpad / mouse wheel zoom direction

Current problem: a two-finger **up** swipe zooms **out** when it should zoom **in**.

Required:

- Two-finger swipe **up** => zoom **in**; swipe **down** => zoom **out**.
- Maintain cursor-anchored time-axis zoom: the time below the pointer remains fixed under the cursor.
- Preserve sensible mouse wheel behaviour, smooth zoom, limits, zoom buttons, overview navigator and existing axis behaviour.
- Preserve click-and-drag **price-change measurement** (not pan or zoom), hover crosshair, event markers, selection and tooltips.
- Avoid duplicate event handlers and accidental sign inversion across supported browsers. Add tests of event direction, anchor invariance and coexistence with measurement interactions. Clearly identify any behaviour not manually verified.

## 2. New strategy identity, intent and entry semantics

Register a new independently versioned strategy, e.g. **`rise-from-recent-low-trading@1.0.0`**, following existing registry conventions. Keep the original **signal-only** Rise from Recent Low algorithm and versions unchanged and selectable.

**Aim:** detect upward price moves and stay invested through rising trends, not buy a dip or force the market to fall further after a loss.

- Primary entry uses the **existing scanner** (e.g. `scanRiseFromRecentLow`) without changing its signal definition or timing: threshold **X** = minimum percentage rise from a recent low; window **N** = lookback in bars/sessions, consistent with existing data resolution. The default research example is **X=5%, N=20 daily bars**; verify existing defaults and units.
- Implement an all-in/flat position model: one funded position per standalone strategy run, no pyramiding or fractional add-on entries. Follow the project convention for **fixed $100,000 notional per trade, no compounding**, unless the current execution contract specifies otherwise; document assumptions.
- Signals while already invested must be recorded as ignored/occupied, not filled again.
- **Fresh-signal re-entry:** after either a profit or loss exit, a newly qualifying growth signal may create the next position immediately when an eligible fill is possible, without a lower-price test or reset. Define a deterministic, causal *re-arming* rule so a continuously true scanner predicate doesn't produce repeated immediate buy/sell loops. Prefer the existing scanner's event semantics; if needed distinguish new signal events from an unchanged true state (for example, a false-to-true transition), and document exact rules and any unavoidable entry-event adaptation. Do not introduce a blanket cooldown or a separate post-profit continuation mechanism. Follow the engine's no same-session reentry rule if required by its verified fill chronology, and document any such restriction precisely.
- Use completed-bars-only decisions, correct market sessions, next eligible fill and overnight/gap handling, causally available warm-up data and no lookahead. Use existing execution primitives rather than a duplicated simulation engine where feasible.
- Support a **single-symbol trading backtest** cleanly. If the existing UI permits multi-symbol selection, either run clearly labelled **independent** single-symbol simulations (with separate equity/P&L and per-symbol events), or reject unsupported shared-capital execution with a clear message. **Do not add a shared-margin allocator or sum independent results as if they were one funded pool.** Preserve symbol-tab isolation (VGT chart never displays GDX's events).

## 3. Exactly which D1 mechanisms to inherit

Audit actual authoritative D1 code first, including:

- `src/app/allIn-trailingBuy-postExitContinuation.ts`
- `src/shared-margin-portfolio/strategy.ts` and `ExitManager`
- `src/entry-signals/`
- related execution, accounting and Strategy Lab runner code

Record a compact, committed mapping under `docs/strategy-lab/` documenting source, activation condition, chronology, units, fills and any adapted behaviour. Reuse or compose the proven exit component where safe; test equivalence with D1-style exit scenarios, while acknowledging the **entry mechanism is different**.

### Required rule A — profit-conditional trailing stop (mandatory)

- Trailing stop percentage is browser-editable and validated, but the feature has **no OFF toggle**.
- Preserve the D1 semantics of profit-condition eligibility at the stop price (including financing, if so defined), ratcheting of the stop from the correct post-entry high, timing, gap-through behaviour, and stop fill convention. Do not silently turn it into an unconditional protective stop or change when it becomes active.
- An open losing trade may not have an active trailing stop. Do not falsely claim trailing stop alone always guarantees an exit.

### Required rule B — maximum losing hold (checkbox; ON by default)

- Editable threshold in **calendar days** (or authoritative source units, explicitly documented).
- Follow the verified D1 rule: at/after the holding-age threshold, exit if the position's eligible-session **opening** P&L is negative on the appropriate net/price basis. A profitable position can remain open beyond the configured age. It is **not** a mandatory fixed-duration liquidation or a minimum hold before selling profitably.
- OFF removes this exit entirely. Warn that a profit-conditional stop plus no loss exit may leave a losing trade open for an arbitrarily long time; report open exposure instead of fabricating a close.

### Required rule C — buffered intraday-loss exit (checkbox; ON by default, with sensible dependency)

- Editable threshold as a **percentage of the fixed invested notional**, not a percent decline in price (verify the exact authoritative D1 basis).
- Preserve D1 chronology: only after the maximum losing-hold age has been reached, unless a prior exit applies; when the position was not already exited for an opening loss, monitor completed intraday minute closes; if **net P&L after accrued margin interest** reaches or falls below **negative invested notional × buffer fraction**, trigger a sale at the next eligible trade. Respect pending overnight fills, stops, maximum-hold precedence and fill ordering.
- Example for documentation: $100,000 notional and 2.9% buffer means a **−$2,900 net P&L** trigger after eligibility, not a 2.9% price drop. A losing open once maximum hold is due normally exits at the open first.
- **Dependencies:** The buffer's original meaning depends on maximum-hold age. With maximum losing hold OFF, either disable the buffer control as well (recommended to preserve identical D1 semantics), or support a separately specified, clearly labelled eligibility age only if already consistent with existing source behaviour. **Do not silently redefine the buffer or permit an enabled-but-inert checkbox.** Choose and document the most minimal causal rule; no user question is needed for the recommended dependency behaviour.

### Mechanisms explicitly NOT part of this strategy

- No material-loss restriction or material-loss threshold.
- No additional decline/lower-price re-entry requirement.
- No recovery reset, retracement fraction, frozen reference-high mapping or episode state.
- No deep-dip trailing-buy entry rule.
- No VG Balanced/D1 post-profitable-exit pullback continuation entry mode.
- No additional hard stop-loss, profit target or unspecified exit mechanism without approval.

The base research defaults for inherited exits may use the registered **VGT D1 baseline** (for example 7.3% stop, 8 calendar days, 2.9% intraday loss buffer), **only after verifying source constants**. Do not copy VG Balanced's independently optimized VGT or GDX book parameters and present them as universal defaults. Clearly label defaults as illustrative, not optimized for the new growth strategy.

## 4. Strategy Lab UI, parameters and reproducible execution

Extend the existing **New Test → Edit Parameters → Run Test** and **Clone into New Test** flows:

- Strategy selector includes the new full trading strategy and still includes the unchanged signal-only strategy.
- Inputs: **X (rise %), N (lookback bars), resolution**, trailing stop percentage (mandatory), maximum losing-hold days (optional toggle ON by default), intraday loss buffer percentage (optional toggle ON by default when hold is ON), plus compatible symbol/date and other existing execution inputs.
- Show units, clear labels, concise help text and validations. Save all values and effective enabled states in the immutable run configuration. Show them accurately when loading a historical run.
- No UI controls for material-loss / lower reentry / recovery reset.
- Cloning and editing an old run creates a **new variation**, executing it creates a new uniquely identified **run**; never mutate historical configurations, runs or results.
- **Manual single-test execution is allowed from the UI. Optimisation, parameter sweeps, automated search, and Study 8-style optimiser initiation are NOT allowed from the UI.** Those remain Claude-prompt/CLI-only future research workflows.
- Preserve SQLite persistence, notes, bookmarks, completed run history, permissions/authentication and remote access over the user's Tailscale VPN (`http://apollo:4317` where configured). Do not expose Strategy Lab to LAN or public interfaces without user approval.

## 5. Actual trade outputs, full economics and chart integration

The new trading strategy must produce **actual executed entries and exits** and meaningful portfolio-independent research metrics, not only raw scanner signals or forward-return studies.

- Reuse verified project execution/accounting assumptions wherever applicable. Report fixed notional, interest basis/rate (D1 baseline 11% annual if inherited), financing over calendar time, fees/commission/slippage when modelled, stop/gap fill assumptions and whether open trades are marked at run end.
- Save a trade ledger (symbol, raw signal, decision time, entry/exit fills and reasons, per-trade gross/net, interest/costs, holding duration), mark-to-market series, source SHA, dataset hash, strategy version, effective parameters and execution settings.
- Show, where supported: closed-trade count, win/loss counts and win rate, realized gross/net P&L, unrealized P&L of open trades, total net marked P&L, accrued interest, transaction costs, minute and daily mark-to-market drawdowns in dollars and properly denominated percentages, occupancy, holding durations, entry and exit reasons and ignored/unfilled signals. Never show absent metrics as made-up zeros.
- Chart **actual entry and exit markers** with details and timestamp in **America/New_York (EST/EDT)**. Preserve the price-change measurement overlay, corrected wheel zoom, tooltip/crosshair, and per-symbol event filtering. Allow raw signals and executed entries to be distinguished.
- Use clear 'signal-only' vs 'trading/backtest' labels. Do not claim comparability to combined shared-slot VG Balanced P&L; standalone multi-symbol outcomes are separate.

## 6. Tests and acceptance criteria

Add deterministic unit/integration/browser tests with synthetic fixtures and one honest real-data smoke test. At minimum:

1. Wheel up zooms in and wheel down zooms out, with cursor anchoring and intact drag-to-measure.
2. The unchanged Rise from Recent Low scanner emits identical raw signals for identical input/configuration; no modification to signal-only historical runs.
3. Correct entry signal-to-fill chronology and fresh-signal rearm after profitable and losing exits; no repeated buys merely because a predicate remains true; no same-position overlap, lookahead or ineligible fills.
4. Profit-conditional stop activation, ratchet, gap handling, and stop versus other exit precedence.
5. Losing-hold eligibility and exit at open; profitable open allowed to continue. Buffered intraday loss threshold on net P&L **after interest**, exact threshold boundary, completed-minute decision and next eligible fill.
6. Hold/buffer toggles ON/OFF/default/dependency, validation, persistence, cloning and old-run immutability. Test disabled-hold long-lived losing positions and correct unrealized/marked P&L.
7. **Assert absence of material-loss, lower-price reentry and recovery-reset state/guard paths** in the new trading strategy; re-entry on a fresh signal must not require a further decline.
8. Cent-level accounting tests where equivalently applicable, minute vs daily drawdown correctness and clear denominators.
9. VGT vs GDX isolation, historical `s8-vg-balanced` import unchanged, prior Strategy Lab entries and notes/bookmarks unchanged, UI Run Test triggers only one configured backtest.
10. No introduction of optimiser/sweep controls or live brokerage interaction. Run typecheck, lint, focused and relevant root tests. Separate pre-existing failures from new regressions.

Example manual flow: create VGT daily X=5%, N=20 growth-trading run with exit defaults; inspect entry/exit markers, reasons, P&L and drawdowns; clone to X=6%, run, and verify the prior run remains selectable and immutable. Report clearly if either result has no trades or open trades, rather than engineering output to look successful.

## 7. Documentation, Git and final deliverables

- Update `docs/strategy-lab/` with an accessible explanation of the three included rules, especially the buffered-loss versus maximum-losing-hold distinction; the intentionally omitted re-entry restrictions; default parameters and accounting assumptions; UI use and result interpretation.
- Implement on **the current feature branch**, commit and **push**. Do not merge into `main`. Do not modify existing frozen strategies, sealed Study 8 records or user datasets.
- Never place generated SQLite database, private tokens, live user history or raw data into Git.
- Final response must include: exact branch/commits, what previous interrupted-session work was retained/cleaned up (and how), verified exit-rule audit, UI navigation, example run commands/results (as exploratory, **not optimised**), test counts and known caveats, and remote access/restart commands only if necessary.

**Scope boundary:** this is an improvement to a local research/backtesting application, not a trading recommendation or approved deployment strategy. No automatic optimisation, broker orders, production trading, or alteration of historical strategies.
