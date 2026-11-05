# Claude Code Implementation Brief — Strategy Lab Growth: Entry Trend Filter, Latched Entry Eligibility, and Compact Strategy Picker

## Objective

Extend **Strategy Lab** to let the user manually backtest five independently selectable entry-trend filters and five independently selectable **latched entry-eligibility policies**, both **OFF by default**. Separately, replace the vertically expanding strategy radio-card list in **New test** with a compact, accessible rich-option dropdown.

This is an **implementation and testing assignment, not an optimisation assignment**. Preserve the existing Growth strategy and its current continuation functionality. The user will later select parameters manually in Strategy Lab and may subsequently include switches, method choices, and active parameters in Claude/CLI optimisation. Do not implement an optimiser in the browser.

The user-facing strategy is currently **Growth v1.1.0** (trading backtest), alongside **Rise from recent low (entry signal) v1.0.0**. Verify the actual repository state before modifying anything. The signal-only strategy must remain independently usable, and Dip Recovery / Study 8 / VG Balanced must not change. Keep the same user-facing **Growth** strategy (no new strategy card or separate “Growth V2”); advance the **internal strategy algorithm version** if required for truthful historical reproducibility.

This work builds on existing support for:

- Growth: rise X% above the rolling lowest low over N completed bars, emit only on a **false → true crossing**; a signal emitted while already invested is normally ignored. Execution is the next eligible trade after completed-bar decision. Fixed $100,000 notional, 11% interest, configurable transaction costs, D1-style profit-conditional trailing-stop exits, optional maximum losing hold and buffered loss exit.
- Growth v1.1.0: optional, mode-selectable post-profitable-exit continuation entries (four mechanisms), OFF by default.
- Conditional/enumerated strategy parameters, immutable saved runs, variations, phenotypes, downloadable diagnostic/analysis exports, and a real-data, single-configuration browser backtest workflow. Verify what is actually implemented; reuse the repository's canonical patterns instead of duplicating them.
- VG Balanced is a distinct shared-capital D1 research pool; do not silently turn Growth into a multi-ETF allocator in this change.

### Nonnegotiable invariants

1. **Both new switches OFF must give byte-for-byte or trade/event/metric-equivalent outputs to the existing Growth v1.1.0 baseline** on the same input data, costs, and continuation settings (allow only the documented unavoidable metadata/version differences). Maintain golden regression anchors.
2. **No look-ahead:** eligibility and trend decisions use only bars/sessions available as of the event's decision timestamp; never read a session's completed close, high, low, or next-minute value before it exists. The signal timestamp, decision, and next eligible execution/fill must remain distinct.
3. Changes must not rewrite existing immutable run artefacts or silently reinterpret historical parameters. Maintain versioned execution provenance; migration only when necessary and losslessly verified, with backup/transaction and rollback plan for persisted data.
4. **No strategy optimisation** in Strategy Lab. UI runs exactly one concrete configuration; imported optimised phenotypes can still be selected and individually rerun with correct provenance. Make both new features available to a future CLI optimiser through the typed parameter schema, including the OFF branch.
5. Implement and test the actual trading logic, not just UI switches. Preserve correct costs, interest, stops, drawdowns, and accounting reconciliation. No user-facing claims of profitability from illustrative examples.

---

## A. Optional entry trend filter — five methods

Add a top-level boolean option **“Entry trend filter”**, default **OFF**, with a short description: *Block new Growth entries when the selected recent-price trend condition is not satisfied.*

When ON, show a **“Trend method”** enumerated select with these five friendly labels; render only parameters applicable to the chosen method. Hide or disable method and its controls when OFF while retaining saved inactive values where consistent with the current schema. All selections, defaults, dependencies, validation bounds, and optimisation-domain metadata should live in the shared typed parameter registry, not hand-coded component conditionals.

Use **trading sessions** for N-session trend windows (rather than elapsed calendar days or N minute bars), even when the underlying Growth signal timeframe is intraday. Specify precise sampling semantics and warm-up requirements in documentation, code, and tooltips: for a decision during a session, the latest observation is the **current completed signal bar**; the older observations come from completed historical trading sessions, with any current-session high/low bounded by completed bars to the decision time. Do not duplicate the current session or read its future end-of-day bar. If this convention conflicts with existing data abstractions, choose an equally causal, consistent definition and document it with tested examples. N is the number of observations/windows the rule evaluates; require enough warm-up or mark the filter **not ready → block** (no implicit approval).

Implement five independently testable methods:

**A — N-session price change**
- Parameters: `lookbackSessions` (N), `minimumReturnPercent` (may be zero or a small positive value; configurable).
- Compare current completed decision-bar close to the corresponding historical sampled close N trading sessions back, using a documented indexing convention.
- **Allow** iff percentage change ≥ configured minimum.
- This is intentionally a simple endpoint comparison.

**B — Regression trend slope**
- Parameters: `lookbackSessions` (N), `minimumSlopePercent` (default 0).
- OLS regression over all sampled prices in the N-session observation window; use log prices against consecutive trading-session indices (or a mathematically equivalent, explicitly documented scale-normalised approach). Express the fitted slope as an interpretable percentage change over the lookback span. Compare to the minimum slope.
- Require positive finite prices, adequate observations, and deterministic handling of flat series.

**C — Rising moving average**
- Parameters: `movingAverageSessions` (N), `slopeComparisonSessions` (K).
- **Allow** iff the current close is above the current N-session simple moving average AND that SMA is strictly greater than its value K sessions earlier. Compute both averages causally. Optional configurable comparison margin only if justified, documented, and exposed in the registry.

**D — Higher highs and higher lows**
- Parameter: `lookbackSessions` (even N, or explicitly document deterministic handling of odd N). Optionally `minimumStructureIncreasePercent` (default 0).
- Split the trailing N session observations into an older and a newer chronological half; **allow** iff the recent half has a higher observed high **and** a higher observed low than the older half, respecting the configurable tolerance. Use completed information only.
- Clarify this is a **simple two-window structural proxy**, not a swing-pivot algorithm.

**E — Short-/long-term momentum**
- Parameters: `shortLookbackSessions` (S), `longLookbackSessions` (L), `minimumShortReturnPercent` (default 0), and `minimumLongReturnPercent` (e.g. configurable negative tolerance, not a hardcoded favourite). Enforce `0 < S < L`.
- **Allow** iff short-window price return ≥ its threshold AND long-window return ≥ its threshold.
- This method is intended to recognise a strengthening recovery without blindly ignoring the longer-term context.

**Common behaviour**
- Apply the trend gate to all **Growth-owned new-entry opportunities**, including baseline threshold-crossing entries, enabled continuation-mode entries, and later eligibility-based entries. **Do not alter exit policies.** Don't filter entries of other strategies.
- Evaluate at the actual entry **decision** moment (completed-bar signal or eligibility-trigger decision) and avoid treating a prior decision as a guaranteed fill. Respect existing pending-order/fill rules; document whether/how a changed trend affects a pending order (prefer preserving current order semantics unless explicitly rejected with a traceable reason).
- A blocked entry must be a **recorded filter veto with reason and observed indicator values**, not a fictitious executed trade. Preserve raw threshold-crossing signals and distinguish them from vetoes, capital conflicts, and signals ignored while invested.
- When entry eligibility is OFF, a filtered-out crossing stays filtered: **do not manufacture a later entry** when the trend turns favourable. When eligibility is ON, its live opportunity may become executable later under the selected policy (see below).
- If the available history is insufficient for a chosen trend method, fail closed with an explicit `insufficient_history` decision, not a future-looking calculation.

---

## B. Optional persistent entry eligibility — time-bounded latched opportunities

Add a separate top-level boolean **“Persistent entry eligibility”**, default **OFF**, independent of the trend-filter switch. Explanation: *A qualifying Growth signal can remain available for a limited time, allowing later entry if its conditions are still met (for example, when a trend filter turns favourable or a future shared-capital allocator frees the slot).* Do **not** retroactively fill at the original signal price.

When ON, a completed-bar false→true crossing of the original Rise-from-Recent-Low predicate **arms an opportunity** with a stable ID, original signal price/time, source method, and decision-time reference values. It is **not** an order and doesn't reserve capital. If entry is immediately allowed and capital is free, execute through the original normal next-eligible-trade mechanism; otherwise retain the opportunity according to the selected policy. A later entry gets the **then-current eligible fill price**, not the original threshold or signal price.

The user wants to try **each of five eligibility ideas** in an enumerated selector. Important: these were originally proposed as **constraints / lifecycle events**, not five inherently independent entry strategies. Model them as **five selectable, well-defined eligibility policies**, each preserving a **mandatory bounded age** and proper invalidation/rearm behaviour, so the UI doesn't accidentally offer an unbounded "eligible forever" option. No combinatorial stacking is required in this assignment; future combinations can be considered separately.

Top-level controls when enabled:
- **“Eligibility policy”** (five choices below).
- **“Maximum opportunity age (trading sessions)”** in *every* policy, with a documented, sensible default (e.g. 10 sessions; illustrative, not optimised) and bounds. Explicitly define whether the originating session counts as day 0; prefer eligibility through `origin + W` inclusive and expiry thereafter.
- Render only additional inputs relevant to the selected policy. Keep the form compact and explain the difference between a signal, an armed opportunity, a filtered signal, and an actual entry.

Five testable policies:

**1 — Time-limited opportunity (baseline latch)**
- Once armed, opportunity stays eligible for up to W sessions while a **minimal current-price qualification** remains valid: the current completed bar continues to satisfy the original rise-from-recent-low predicate (or a clearly documented, frozen-signal reference rule if necessary to avoid drift).
- If that qualification becomes false, invalidate. Consume at the first actual entry; expiry at W sessions. No automatic repeated entries.

**2 — Minimum trend strength**
- Same W-session time bound plus an explicit ongoing **minimum strength** requirement. Expose the chosen, simple strength metric and threshold: e.g. require current percentage advance over the original opportunity's fixed reference low ≥ configurable `minimumAdvancePercent`. Use signal-time fixed reference so a rolling lookback shift cannot silently change the meaning; choose and document the exact formula.
- Recheck each completed decision bar; invalidate when strength drops below the threshold. If both the trend filter and this policy are enabled, require **both** to pass to execute. Avoid using future data.

**3 — Maximum price extension**
- Same W-session time bound and minimal qualification, plus a configurable maximum percentage extension above the **original signal price**. If price has advanced beyond that bound, the opportunity is invalidated or temporarily made ineligible—choose a single unambiguous policy and document/test it; prefer **invalidate** to avoid late chasing and arbitrary reactivation.
- Allow an entry only when its current price satisfies the cap. Use the actual decision-time price, never a later fill price as a prior condition.

**4 — Trend-deterioration invalidation**
- Same W-session bound and minimal qualification, plus a **separately defined deterioration criterion** while latched, such as decline of current price below a configurable N-session SMA or a fixed percentage below the highest completed-bar close since arming. Provide straightforward select/parameters only if necessary to make the behaviour clear; favour the smallest coherent implementation with one primary metric and 1–2 parameters.
- When deterioration trips, cancel the opportunity and record the reason; recovery without a **new qualifying crossing** does not revive that cancelled opportunity.

**5 — Reset-and-renew after a fresh recovery crossing**
- Same W-session bounded latch and minimal qualification, but allow a *new, objectively qualified recovery crossing* after a previous opportunity **expired or was invalidated** without being consumed. This must be meaningfully distinct from policy 1; the original strategy already emits genuine false→true X%-over-recent-low crossings.
- Expose a simple two-stage reset/recovery rule, with configurable `resetDropPercent` (D) and `renewalReboundPercent` (R): after expiry/invalidation, record the reference price of the expired opportunity; require a **subsequent** completed-bar close at least D% below that fixed reference to *arm the renewal watch*, and then require a **subsequent completed-bar upward crossing** R% above the lowest completed-bar close recorded since the reset. Also require the original Growth predicate to be true at renewal; otherwise do not renew. The new crossing is a **distinct, real renewal signal**, with source `eligibility_renewal`, not a fabricated original `rise_from_recent_low` crossing.
- A renewal signal creates its **own new W-session bounded opportunity**, with new stable ID and lineage back to the prior one. Apply the chosen trend filter and the same active policy; do not silently use a future price or place an order at the earlier expired signal price.
- Never renew a **consumed** opportunity, never renew merely because the price remains above an old threshold, and never reuse the same reset/rebound episode repeatedly. Document how later new original X%-crossings compete with renewal; prefer genuine original crossings taking precedence, with no duplicate entry order.
- If the repo already has a well-tested equivalent reset/rearm primitive, reuse it. This mode must be visibly distinguishable from policy 1 on synthetic sequences and have an explicit regression test demonstrating the difference. Keep the simple parameters rather than introducing an elaborate hidden state machine.

**State-machine requirements**
- Model opportunity states explicitly: `armed/eligible`, `blocked_by_trend`, `blocked_by_capital` (for future allocator use; today Growth is standalone), `invalidated`, `expired`, `consumed`, and pending order as applicable. Distinguish persistent opportunity from the original instantaneous event; keep lifecycle events timestamped.
- A filter block **does not consume** an armed opportunity. When the filter later passes and the selected eligibility policy remains satisfied, allow a new decision and next eligible fill. If the filter fails again, eligibility remains pending within its bound unless the policy itself invalidates it.
- Handle while already invested, on exit, after exit, and after failed/pending orders consistently. **No same-session re-entry after an exit** if existing Growth rules disallow it; preserve precedence and exclusivity with continuation-entry mechanisms. Define one deterministic priority (e.g. regular fresh crossing, then live latched opportunity, then continuation) or preserve existing semantics where they already establish priority; test all clashes.
- A normal Growth trade exit does **not** automatically reopen the consumed opportunity; a new genuine crossing is required unless an explicitly enabled continuation entry mechanism fires. An independent strategy's exit in a *future* allocator should only release capital, not fabricate a Growth signal.
- The signal-only strategy stays signal-only; do not quietly implement eligibility or executions for it. Growth should maintain its own signal/eligibility state independent of whether a future shared slot is occupied.
- Prefer one live baseline-growth opportunity per symbol at a time with stable IDs, causal expiration and complete event history. If crossover to continuation modes creates two live opportunities, resolve deterministically and document which one wins, without silently dropping raw signals.
- Avoid repeatedly emitting an entry signal every bar while an opportunity is active. Events are `signal`, `armed`, `blocked`, `eligible`, `invalidated`, `expired`, `consumed`, etc. with unique identifiers and backreferences, not fabricated repeated threshold-crossing signals.

---

## C. New-test strategy selection UI — compact rich dropdown

The screenshot shows a **New test** modal with multiple vertically stacked, rich radio cards for **Rise from recent low (entry signal)** and **Growth v1.1.0**, each with title, version, category badge, and a multi-line strategy description. With more strategies this list will waste vertical space.

Replace the expanded card stack with an **accessible custom rich-select / combobox + popup listbox**, not a native `<select>` that cannot render rich option content:

- In the **closed** state show one compact row: selected strategy's name, version, badge, and a short subtitle if room permits.
- Clicking opens a constrained-height, scrollable popup/overlay of selectable rich options that show title, version, type badge and the existing description. The user must still be able to read the full description for any candidate before choosing it (in the expanded option or in an adjacent details region).
- Support keyboard focus, arrow navigation, Enter/Space selection, Escape dismissal, optional typeahead/search as appropriate, semantic ARIA combobox/listbox roles, selected state, screen readers, focus return, and pointer selection. No trapped/off-screen popup or clipping behind modal boundaries.
- Selecting updates exactly the strategy identifier used by the current form, parameter registry, test execution, and saved run. Do not lose the radio-list's existing validation or selection semantics.
- In the modal, keep all explanatory copy about single-config tests versus CLI optimisation. Display strategy description in a compact details area below the closed select if that improves comprehension.
- Prefer existing shared UI primitives and visual language; ensure mobile/small-viewport usability and sensible max popup height; test overflow, blur, click-away, and selection while scrolling.

---

## D. Architecture, reproducibility, observability, and future research

1. **Versioning:** Keep the user-facing name **Growth**. Increment the internal algorithm version (expected beyond v1.1.0) as appropriate; old runs must still identify the exact old implementation and remain interpretable. Never rewrite old net P&L, dates, trade IDs, hashes, or the facts that generated them. Verify cloning, opening, comparing, importing phenotypes, and exporting older results after the change.
2. **Typed schema:** Put methods/options, typed defaults, conditional visibility/validation, shared time units, nested eligibility dependencies, and search/optimisation domains into the canonical schema. Do not build strategy-specific form branches. Both boolean toggles, categorical methods, and active continuous/integer parameters must be serialisable and available for later **hierarchical conditional CLI optimisation**. An OFF branch must remain a valid candidate. Unused parameters must not affect execution or produce fake sensitivity differences.
3. **Provenance and logs:** Every run and downloadable analysis bundle should identify strategy version, data hashes, fill/cost assumptions, signal timeframe, trend toggle/method/values, eligibility toggle/policy/values, continuation settings and active/inactive effective configuration. Add machine-readable decision records: original crossing ID/time/reference low/threshold, measured trend values and veto reason, armed opportunity ID/state transitions, expiry/invalidation reason, decision/fill time and price, linked trade ID and **final realised or open unrealised net P&L**, plus selected continuation source where applicable. Keep append-only/timestamped lineage. Include concise summaries by entry source, blocked reason, filtered count, opportunities surviving until fill, age-at-fill, and eventual trade outcome. Include enough to send the export to ChatGPT/Claude for independent analysis without access to local SQLite. Follow existing bundle structure and avoid oversized per-bar logs unless a diagnostic verbosity setting requires them.
4. **Manual tests and saved phenotypes:** Current/previously imported optimised phenotypes must remain runnable as **single test configurations** from Strategy Lab. Permit future imported Growth phenotypes to include the new switches/methods and settings and rerun them with full provenance; don't add an optimisation UI or silently reinterpret old phenotype versions.
5. **Baseline comparison:** For every opted-in method/policy configuration, a CLI test harness may optionally produce a **paired diagnostic comparison to both switches OFF**, on identical data and costs. No automated grid search, fitting, auto-selection or claim of improvement. Report entry additions/removals, average eligibility age, missed/blocked signals, closed/open trades, realised/marked net, interest, max minute/daily DD and time-in-market. Clearly label any historical performance as retrospective.
6. **Performance:** Efficient incremental statistics or bounded window calculation. Avoid rescanning large minute data for every eligibility check if avoidable; the run must remain tractable on existing real SIP data. Deterministic replay independent of rendering/UI state.
7. **Documentation:** Update Growth, strategy-parameter schema/contracts, operations, UI guidance and research workflow docs; explain each mode, signal vs opportunity, session vs bar lookback, default OFF, interaction with continuation and common pitfalls. Include several concrete worked examples and exact defaults/bounds. Make no misleading implication that a trend rule guarantees safer trading.

---

## E. Test plan — required evidence before completion

Write meaningful unit, integration and browser tests, including:

- **OFF/OFF golden regression:** same Growth v1.1.0 entry/exit dates, fills, raw signals, effective continuation behaviour, net, interest, costs, DD and exposure for multiple symbols/timeframes. The new UI default is OFF for both switches, including when cloning legacy runs.
- **Trend A–E:** Positive/negative/flat/reversal/noisy sequences, exact threshold equality, warm-up missing, incomplete intraday sessions, timezones/holidays, day vs minute-based source bars, recent highs/lows without future leakage, param bounds and invalid combinations.
- **Persistent policies 1–5:** True crossing arms once; signal blocked by trend then admitted after the gate clears; raw signal blocked because occupied capital in simulated allocator/harness then admitted after release (without implementing a full allocator); expiry boundary; invalidation; price extension; strength; genuine rearm; non-rearm on simple true→true; consumed opportunity never reused; open trade/pending order/no same-session reentry; fresh exit and continuation clashes.
- **Orthogonality:** Filter OFF / eligibility OFF, filter ON / eligibility OFF, filter OFF / eligibility ON, both ON; every continuation method ON/OFF where relevant. No stale-signal replay if filter blocked and eligibility OFF. No spurious signals or trade fill duplication.
- **Accounting:** All runs reconcile exact ledger identities; accurate drawdown and interest; no change to D1, VG Balanced, Study 8 or signal-only strategy.
- **UI:** Selecting all A–E trend methods and all five eligibility policies shows only appropriate inputs with validation; changed values persist in variations and can be cloned/replayed; strategy rich dropdown supports keyboard/screen reader/pointer/scroll, retains selected ID, does not overflow modal, and correctly starts a test.
- **Analysis exports:** Structured trace has IDs, timestamps, decisions and trade attribution; verify contents against ledger/trades, deterministic export, and correct classification of blocked / expired / invalidated / consumed. End-to-end import/rerun/export of an eligible saved Growth phenotype. Historical run visibility unchanged.
- **Real-data examples:** Use user's six chart snapshots `no-1`, `no-2`, `no-3`, `yes-1`, `yes-2`, `yes-3` **if they are available to Claude** and can be mapped to exact symbol/decision time. The screenshots are illustrative classification examples, NOT a six-example training or acceptance objective. Do not guess timestamps or infer precise price series from cropped chart screenshots. If needed ask for IDs/times or log which reference examples cannot be matched. Do not optimise to those images.

Report exact tests executed and results, any regressions, test coverage or checks that remain unresolved, and representative trace examples for each method/policy. Avoid claiming parity or successful migrations without evidence.

## F. Execution and delivery protocol

1. Inspect current code/branch, the existing Growth v1.1.0 implementation and Strategy Lab docs/DB schema and tests; give a brief plan. Resolve nomenclature and duplicate functionality before implementation.
2. **Eligibility taxonomy:** The five original concepts were candidate constraints rather than five mutually exclusive mechanisms. Implement the five distinct, bounded policies specified above; in particular, mode 5 uses a *real post-reset recovery crossing* distinct from ordinary X%-threshold crossing. Demonstrate non-equivalence with policy 1 in tests. If an existing engine convention makes a specified rule impossible, report the conflict and use the closest explicitly documented causal alternative rather than shipping an inert dropdown choice.
3. Implement source/engine/schema/UI/export changes, tests and docs, preserving existing baseline and data. Keep existing strategy continuation independent of the trend/eligibility switches.
4. Run targeted tests, integration/browser tests, real-data parity, lint/typecheck/build and any required DB migration verification. Preserve user data; do not destroy/reset existing SQLite or archived runs.
5. Commit and push on the current Strategy Lab feature branch (expected `feature/strategy-entry-explorer-ui`; verify). **Do not merge into `main`.**
6. Finish with a concise report: git branch and commit SHA, changes made, exact defaults, notes on method semantics, test counts and failures, demonstrated OFF/OFF parity, DB/data migration verification, how to run the new manual test cases and download their research logs, and known limitations.

**Do not expand the scope to live trading, real orders, automatic allocation, new optimisation jobs, or unrequested changes to existing trading strategies.**
