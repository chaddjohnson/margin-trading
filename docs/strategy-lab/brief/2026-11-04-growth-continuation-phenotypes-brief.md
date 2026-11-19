# Claude Code assignment — Strategy Lab: Growth, continuation mechanisms, unified parameter schema, phenotype reruns, and research exports

## Mission

**Implement**, not merely propose, the next iteration in the existing `margin-trading` repository, on the **currently checked-out feature branch**. This assignment consolidates the user's requirements and the design decisions discussed after reviewing the earlier Growth-continuation prompt. Read the actual code and documents first; their contracts take precedence over assumptions in this brief. Work carefully with the existing SQLite database, immutable run artifacts, and sealed Study 8 research results.

The deliverables are:

1. Rename the **trading strategy's user-facing name** to **Growth**, consistently in the UI and historical saved-result views, using the repository's naming conventions. The separate signal-only strategy remains distinct and unchanged in behaviour.
2. Add a **Closed losses only** filter to the Trades list.
3. Add **optional continuation entries** to the existing user-facing **Growth** strategy with four selectable, independently implemented mechanisms and conditionally displayed parameters. The continuation system is **OFF by default**, reproducing the existing Growth behaviour exactly.
4. **Upgrade the shared parameter-definition system application-wide**, migrating all current strategy definitions, validators, forms and relevant persisted metadata to a single richer specification. Do not carry two perpetual, overlapping parameter-schema implementations. Preserve historical runs and their exact provenance.
5. Add a durable **optimised phenotype catalogue / import / selection / single-test rerun** workflow: after a Claude/CLI optimisation, selected frozen phenotypes can be viewed and **run individually from Strategy Lab** against a user-selected eligible symbol/dataset period, using the correct engine and execution contract. **No optimisation is initiated by the browser.**
6. Add a **downloadable research export** containing detailed trade records, signals, continuation/entry/exit decisions and metadata so the user can upload the bundle to ChatGPT or give it to Claude for independent analysis.
7. Add credible **non-optimising diagnostic comparisons** for continuation enabled vs disabled using already-existing equivalent runs, with explicit differences in entry attribution, profitability, drawdown, interest and exposure.

Do not introduce a separately visible `Growth V2` strategy. **Internal algorithm versioning is permitted and required where semantics change** (for example a `1.1.0` engine version) to preserve reproducibility. The UI may simply display **Growth**. Choose whether a visible `V1` is appropriate only after inspecting actual naming practices; default to the unqualified name.

---

## A. Audit before editing; safety and baseline

Inspect:

- Working branch, status, recent commits and user changes. Do not assume the checkout is clean or a specific branch name.
- `docs/strategy-lab/{ARCHITECTURE,CONTRACTS,GROWTH_TRADING,GROWTH_TRADING_AUDIT,OPERATIONS,RESEARCH_WORKFLOW,STUDY8_METHODOLOGY}.md` and current strategy docs.
- `apps/strategy-lab/shared/strategies.ts`, contract and validators, frontend parameter form, Trades table, chart, run/variation view, SQLite migration/trigger code, importers, API/job manager and tests.
- `src/entry-signals/`, `src/growth-trading/riseTrading.ts`, the trading runner, trade/decision output model, and the existing D1 continuation implementations (`src/app/allIn-trailingBuy-postExitContinuation.ts`, `src/shared-margin-portfolio/strategy.ts`, `src/multi-etf-allocator/shadow.ts`) with their parity tests.
- The Study 8 / `s8-vg-balanced` runner, its frozen phenotype formats and allocator semantics (one funded shared slot).
- Service status and ongoing jobs. Record whether it was running/enabled before work; never interrupt a running backtest silently. Back up database *consistently* (SQLite online backup or stop service and copy SQLite together with its WAL, plus run/import artifacts) before migrations. Verify ability to restore. The state root is Git-ignored.

Capture a repeatable **before-change Growth baseline** (OFF / original configuration) with exact per-trade entries, exits, prices, timestamps, P&L, daily and minute drawdowns, signal counts and ledger hashes on at least one real daily and one real intraday dataset. Ensure the before/after parity harness is checked into tests or an auditable fixture. Do not use future data beyond the selected test window. Do not turn exploratory examples into candidate selection or an optimisation study.

Safety rules:

- Never run `git reset --hard`, mass-delete, force push, rewrite sealed studies, delete existing SQLite records, or overwrite user notes/bookmarks without explicit consent.
- Leave unrelated work alone. Make migrations transactional, idempotent, backed up and independently validated.
- Keep historical run IDs, variation IDs, notes, bookmarks, event/trade hashes, original engine versions and dataset fingerprints resolvable; do not modify immutable execution facts to make a new name look cleaner.
- No changes to existing D1/VG Balanced trading mechanics or its sealed results.
- Keep the app local to `apollo` / tailnet, with existing token/authentication and constrained backend execution preserved. Never expose an arbitrary shell-command execution endpoint.

---

## B. Growth strategy naming and internal versioning

- Rename **only the user-facing Growth trading strategy** from `Rise from recent low (trading backtest)` to **Growth** across menus, parameter headers, saved-run listings, trade analyses, descriptions, help text and future default run titles. Do not rename the separate signal-only algorithm to Growth or alter its scanner.
- Inspect database strategy rows, stored references, provenance and any aliases. Migrate or present legacy strategy labels so existing saved runs **show Growth** without changing user-authored run titles or corrupting immutable artifacts. If a past *user-authored* title is unchanged, that is intentional; don't overwrite personal titles or notes.
- Stable internal keys may retain the original machine-readable identifier. Prefer changing display metadata / creating a verified projection instead of rewriting hashed inputs. Document retained legacy keys; avoid broken routes or unresolved references.
- **Bump the internal algorithm/engine version** when adding new entry mechanisms because strategy semantics and parameter structure change. Preserve an executable or adequately pinned immutable legacy engine for old run replay, or explicitly document and test the reproducibility strategy; don't silently relabel historical `@1.0.0` executions as the new algorithm.
- Show the historical version/code provenance in run details when relevant without requiring the user to select multiple Growth strategies.
- An old run's absent continuation fields mean **continuation OFF**, never inferred active. Cloning it into a new current-version test starts with continuation OFF and preserves provenance to the original variation.

---

## C. One unified, optimisation-ready parameter specification (application-wide migration)

Upgrade the shared strategy parameter definitions and **convert every existing registered strategy to the new canonical schema**, not one-off UI conditionals for Growth.

The unified, typed specification must support:

- numeric, integer, boolean and **enumerated/string choice** values; labels, help, units, defaults, permitted bounds/steps, categorical options and optional explicit execution semantics;
- conditional visibility, enablement and effective applicability based on boolean switches and selected enum values; nested/compound predicates as needed;
- cross-field constraints (for example `intradayLossBufferEnabled` requires `maximumHoldEnabled`), available for the browser form **and** API/runner validation;
- serialisation and canonicalisation of the **effective** parameter set: distinguish active dimensions from stored inactive draft values, so configurations that behave identically do not multiply unnecessarily in future optimisation; carefully maintain existing variation IDs/identities for old runs;
- discoverable optimisation metadata: legal categories, active numeric domains, constraints, candidate generation/validation, and conditional search-space structure. Build a reusable helper usable by future CLI optimisers, but **do not build or run an optimiser now**;
- schema/engine versioning so a frozen historical configuration is not later reinterpreted using new parameter meanings;
- New Test, Clone, saved Parameters, variation identity, run creation, importer/phenotype loader, reports and API using the *same* parameter semantics and validation.

Do a planned, explicit migration of any existing stored presentation/parameter schema data. **Do not create a permanent parallel old-parameter-system implementation**. Historical immutable run snapshots and hash-protected artifacts remain factual records and must not be rewritten just to match the new input form. If legacy snapshots need a *read projection* to the new model, make it deterministic, version-aware and test it. Preserve correct execution provenance.

Test migration from a real-shaped prior SQLite fixture, including the signal-only strategy, Growth legacy runs, synthetic runs and the imported `s8-vg-balanced` pool. Audit counts/IDs/hashes/foreign keys before and after.

---

## D. Growth continuation: general rules

The existing rise-from-recent-low `X%` / `N`-bar **base entry remains active**, with unchanged scanner semantics and single-position economics. The chosen continuation mechanism is an **additional** possible entry when flat, not a replacement. Preserve the D1-derived profit-conditional trailing stop, optional maximum losing hold and optional buffered intraday-loss exit (including their switch dependency) exactly, with existing costs, financing and fill chronology.

UI:

- `Enable continuation entries`: boolean, **OFF by default**.
- `Continuation method`: one of the **four** choices below, selectable only when ON.
- `Continuation window`: **trading sessions** after a qualifying exit, shown only when ON.
- Mode-specific parameter inputs are displayed and validated **only** for the selected mode. Preserve user draft choices sensibly while switching; distinguish stored-but-inactive values from effective execution params. Historical runs display what was *actually applied*.
- A new run uses the same selected symbol, resolution and window configuration as other manual tests; re-running or cloning produces a new immutable run. Do not infer missing parameters from old artifacts as if continuation had run.

Eligibility and lifecycle:

- A **realised net-profitable exit** means P&L strictly greater than zero **after interest and transaction costs**. Losing/breakeven exits never start a continuation window.
- Anchor at the **exit session**. Eligible sessions: `exitSession + 1` through `exitSession + W` **inclusive**; expire at end of the Wth session. This matches D1. Use exact NYSE trading-session counts rather than calendar days, and apply a causal, resolution-aware interpretation of the minute/daily event order.
- A subsequent profitable exit may open a new window. At most one active continuation episode per symbol. A filled entry consumes/closes its old continuation episode; any unfilled pending setup must follow explicit per-mode cancellation/expiry rules.
- Never buy using uncompleted bars, future highs/lows, hindsight trend state or fill earlier than the first eligible trade after the decision. No overlapping holdings or pyramiding; a $100,000 fixed-notional standalone Growth run remains all-in/flat.
- Signals while invested or while an order is pending must not create trades; retain diagnostics for suppressed signals. Determine and document how windows behave during open positions, ignored signals, failed/pending setups and when base Growth signals coexist with continuation signals.
- **Arbitration:** deterministically give an eligible **base Growth** entry priority when both mechanisms would enter/arm at the same instant. Record that decision and what happened to the window, without accidental double fills. For Classic D1, preserve D1's rule that *any competing ordinary entry arming* closes the continuation window; explicitly document any adaptation required because Growth's base scanner is not D1's deep-dip arming machine. Consider edge cases where a continuation setup was armed but a base signal later arrives.
- Avoid repeated signals from a continuously true predicate. Define all arming, disarming, one-shot, state-reset, and new-window rules before implementation. No new post-loss lower-price restrictions, recovery resets or forced cooldowns.

### Mode 1 — `Classic D1: pullback + trailing rebound`

**Use the D1 mechanics, not a generic percentage-growth trigger.** D1's actual parameters are:

- `W`: continuation window in sessions;
- `P`: **pullback depth** from a tracked post-exit high (exit fill price, then observed session highs);
- `Y`: **trailing rebound percentage** above the trailing low after the setup arms.

The D1 research shows: a qualifying profitable exit anchors the window at its exit session; while the window remains eligible and the book is flat, a completed minute closing at or below `postExitHigh × (1 − P)` arms a trailing-buy setup; Y rebound triggers an order filled at the next eligible trade; **arming**, not filling, closes/consumes the continuation window; window expires at `start + W`; a competing ordinary deep arming closes the window and takes precedence. Preserve this as closely as possible, including next-bar fills and D1's pending/overnight behaviour. D1 uses deep-dip base signals, whereas Growth uses rise-from-recent-low; document only the required change in arbitration, not a claim of full whole-strategy D1 parity. Defaults are **illustrative**, not optimised for Growth. Test detailed per-state equivalence against D1 source-derived synthetic/real traces for the continuation component.

### Mode 2 — `Breakout above post-exit high`

A genuine **post-exit trend continuation breakout**, not a one-bar rebound below the last exit price. Track a causal high from the exit fill/observed subsequent post-exit highs **excluding the current candidate bar**; require a configurable breakout buffer (%) and a completed bar crossing above that reference. Require a documented initial reference/formation rule (at least one earlier completed eligible post-exit bar before a breakout can trigger), plus conditions ensuring no unconditional same-session re-buy or impossible self-referential high calculation. Clearly define how session highs and exit-fill price anchor the reference, how gap openings are handled, and how the signal's decision and next-fill work. A breakout must represent renewed highs, not merely a recovery above a previous bar inside a declining sequence.

### Mode 3 — `Shallow pullback + recovery in an uptrend`

Distinct from classic D1. Require an observable **uptrend qualification** (such as an earlier-period rising longer moving average, with configurable lookback/slope rules). Within that established trend, require a configurable small retracement from a post-exit/local high, and then a configurable rebound/recovery from the subsequent observed trough. Define causally: reference high, minimum pullback, optional maximum pullback/depth invalidation, trough updates, rebound signal, arming/expiry and next-eligible fill. Make the uptrend filter necessary, not merely decorative. Avoid silently duplicating the D1 rule under different labels.

### Mode 4 — `Cross above a rising moving average`

Require a **genuine price crossing from below to above** a moving average calculated only from eligible observed completed bars, *while the moving average itself is rising*. Expose configurable average lookback, rising/slope period and, if justified, a minimum positive slope/margin. Define MA type (e.g. SMA), current/prior-bar comparisons, lookback warm-up, comparison precision/equality, and next-eligible fill. A continuously above-MA state must not repeatedly trigger.

All four must support the allowed resolutions causally; if a required MA/session-based assumption cannot be implemented at all allowed resolutions with defensible semantics, explicitly scope/disable incompatible ones rather than silently approximating them.

### Attribution, state and diagnostics

Every entry signal, executed entry, ignored/rejected signal and resulting trade must record **origin** (`base_growth` or `continuation`), and if continuation, method, window/episode ID and the key trigger/reference values. Exits link to the same trade ID and are attributable to the originating entry mechanism, but **do not mistake origin-attributed P&L for the causal incremental profit** of enabling the mode; subsequent trade sequencing changes.

Instrument a compact, chronologically ordered **decision/state log** (not necessarily every minute unless requested) recording at least:

- qualifying exits, window opened/expired/consumed and reason;
- observed high, pullback, trough, MA/slope/crossing and applicable threshold values at setup/trigger;
- base versus continuation priority and suppression reasons (`already_in_position`, `pending_order`, `window_expired`, competing base setup, invalidated setup, etc.);
- setup arming, cancellation, signal generation, decision time, fill time and fill basis;
- exits, stop activity/inactivity, hold/buffer decision when triggered, gross/cost/interest/net reconciliation.

All event timestamps stored in UTC and displayed/exportable with US Eastern time and explicit precision. Apply per-symbol filtering throughout (VGT chart contains only VGT's events). No fictional event prices.

---

## E. Closed-loss trades filter

Add a visible, accessible **`Closed losses only`** toggle (OFF by default) for the selected run/symbol Trades list. It includes only **closed trades with realised net P&L < 0** after interest and per-side costs, not open unrealised losers, breakevens or trades selected based on raw price difference. Show selected/total counts and a clear empty state.

Preserve sort/search, click-from-entry **and** click-from-exit trade selection, scroll-to-row, tooltip P&L, marker pairing/connector, keyboard interactions and symbol isolation. If a chart-selected trade is hidden by the filter, give a clear explanation and an easy way to show it. Do not remove chart markers just because a table filter is enabled. Test imported `vg-balanced` and Growth separately.

---

## F. Optimised phenotype catalogue and **manual post-optimisation reruns**

The user wants to run **selected phenotypes discovered later by Claude-led optimisation** from Strategy Lab. This is not the same as launching an optimisation.

### Data model and import

- Define a **frozen phenotype** as a named, versioned executable strategy/pool configuration with a stable ID and exact parameters, switches, selected continuation method and active subspace, per-symbol settings if applicable, engine implementation/revision/hash, data/execution assumptions, and link to its origin optimisation study, ranking/role, training/test exposure and import manifest.
- Support a validated, preferably idempotent **CLI import of selected candidates** from a completed Claude study (in line with `STUDY8_METHODOLOGY.md` and `RESEARCH_WORKFLOW.md`). Do not automatically import every intermediate trial as a runnable phenotype. The importer checks schema, hashes, referenced engine/version and parameter validity. Imported optimisation batches/trials may remain read-only for inspection; **selected phenotypes** are explicitly promoted/published into the runnable catalogue.
- The UI must let the user find a phenotype by study, strategy, symbol, ID/name or role, inspect its locked origin configuration, and click **Run selected phenotype** / **New test from phenotype** to create **ONE** manual test. Permit a title, eligible date range/dataset and appropriate symbols, but treat edited parameters as a **new variation** derived from the phenotype, not as overwriting the frozen phenotype itself. The launched run records the parent phenotype ID and study provenance.
- Do not present historical validation windows as untouched: existing 2025–2026 data is already exposed. Clearly label data partitions and warn when an exploratory rerun examines exposed/final dates; it is *not* another independent holdout.
- Provide at least a tested import → catalogue → select → single manual run → immutable saved result path for the **Growth** engine and its conditional configuration, including continuation OFF and each ON mode. Document a stable machine-readable phenotype export contract that future CLI optimisers can emit.

### Crucial multi-ETF distinction

- **Standalone multi-symbol Growth** currently means **one independent $100,000 backtest per symbol**. A **shared-slot multi-ETF pool**, such as `s8-vg-balanced`, is **one allocator replay with a single shared funded margin slot**. Never rerun a pooled phenotype as independent symbol tests or sum standalone P&Ls and call it the pool result.
- Detect and expose phenotype execution kinds (`standalone`, `independent-symbol batch`, `shared-slot pool`). Route each through its appropriate registered, vetted runner. For pool reruns, use the real allocator and retain trade refusals, per-symbol state and pool-level metrics. Inspect whether the existing Study 8 runner can safely power browser-initiated *single* pool reruns with bounded, validated arguments; integrate it where feasible with parity tests. **If a phenotype cannot be executed under its real contract, show it as view/import-only and explicitly explain why**; never simulate fake support. Do not quietly invent a new allocator or change Study 8 code to fulfil the UI.
- Make supported/unavailable capability explicit in UI and API. Test an actual selected Growth phenotype and, if feasible, an existing Study 8 shared-slot phenotype; if pool execution is not feasible, report this as an outstanding limitation and preserve its correct read-only display.

### No optimisation from UI

- Only a **single stored configuration per user action** can be launched; no optimiser, sweep, auto-tuning, grid/range loops, evolutionary search, batch scheduling or selection process is triggered from browser or HTTP API. Keep a bounded allowlist of executable runners with server-side validation and existing security/timeouts.
- Future optimiser CLI can choose continuation enabled **OFF or ON**, and when ON choose one of four **categorical** mechanisms with only relevant numeric dimensions active. Support nested conditional parameter domains and constraints without generating meaningless inactive combinations.
- Do **not** implement an optimiser in this assignment. Future research should evaluate mechanism families fairly, with registered budgets and robust/neighbourhood testing like Study 8, plus categorical/method sensitivity distinct from numeric perturbations.

---

## G. Analysis-ready downloadable run exports

Create an **Export research bundle** capability from the UI for a completed run (and optionally a CLI command), producing a portable ZIP or another straightforward single downloadable artifact with **unmodified raw machine-readable evidence** and human-readable summaries suitable for uploading to ChatGPT/Claude.

Minimum contents where present:

- `README.md` or `SUMMARY.md`: run ID/title, strategy/phenotype, date range, symbol(s), standalone vs shared-slot semantics, simulated versus imported, constraints, what metrics mean and known limitations;
- `manifest.json`: export schema version, filenames, checksums and source provenance; export never silently mutates original immutable run artifacts;
- exact **input/parameter snapshot**, active switches/method-specific values, engine ID/version/commit or hash, dataset hashes/partition and price basis, fill/interest/cost/stop execution assumptions, parent phenotype/study link;
- machine-readable per-symbol **signals/events**, executed entries/exits and trade linkage; relevant ignored/rejected signals and their reasons;
- complete **trade ledger** (`trades.csv` and/or JSON) with trade ID, symbol, entry origin/method, raw decision time, fill timestamps/prices (UTC and ET labels or derived unambiguously), exit reason, size, gross, transaction costs, financing, realised/unrealised net P&L and holding duration;
- continuation **windows, state transitions and causal decision traces** for Growth continuation runs, including armed/not-filled setups and suppressions as available; make absent data explicit rather than fabricating it;
- time series or artifact references for daily and minute sampled equity/marked P&L and drawdown, plus by-symbol and pool totals if relevant; if minute series would be huge, use a documented optional `include minute marks` export mode or compressed format, while including the essential period/drawdown statistics by default;
- a compact **attribution summary** broken down by base growth vs each continuation mode: entries, exits, profit/loss, interest, holding, drawdown-related diagnostics where meaningful; label attribution descriptive and never claim it equals incremental causal benefit.

Exports must be **deterministic where practical** (stable data order and well-defined timestamps) and check for integrity. Never leak access tokens, host credentials, private environment variables or arbitrary files. The download endpoint uses existing authentication and is scoped to allowlisted completed run IDs; bound export size/stream safely for large histories. For a missing artifact or a partially imported old run, explain what is unavailable, don't invent it; export all legitimate available facts.

The user must be able to download the bundle and hand it to ChatGPT for detailed review **without access to the running Apollo server**. Document export contents and how another analyst can reproduce or independently check key claims. Include a small anonymised/fixture export in tests, not real portfolio secrets.

---

## H. Descriptive comparisons without tuning/searching

In Strategy Lab support side-by-side comparison of **two existing** runs with matching strategy/engine applicability, symbol, dataset and cost assumptions, especially a continuation **ON** run versus an otherwise-identical **OFF** run. Do not automatically launch an OFF run or perform parameter search. If no matching control exists, explain how to manually clone and run one.

Show:

- entries introduced/suppressed/shifted and trade origin/method;
- net P&L, gross, interest, per-side costs, exposure, trades, win/loss ratio, worst trade, holding periods, minute/daily max drawdown and any meaningful normalisation;
- window success/failure counts, continued rallies captured/missed where measurable, and differences in trade chronology;
- explicit non-additivity: per-trade mechanism attribution is descriptive, while ON-versus-OFF replay difference is the **path-dependent counterfactual** of two complete simulations.

If the two runs are not methodologically comparable (different dataset, dates, symbol, capital model, strategy version or cost assumptions), display the mismatch and do not imply an apples-to-apples performance comparison. Preserve existing chart comparisons, bookmarks, notes, filters and ET timestamps. No new optimisation UI.

---

## I. Verification, acceptance and deliverables

Automate tests and explicitly report results for:

1. **OFF parity**: all old baseline Growth signals, entries, exits, fill prices, timestamp order, interest/costs, net and daily/minute drawdown match before-change fixtures, for daily and intraday resolutions. The old engine remains reproducible.
2. **D1 classic**: profitable net exit → window start+1..start+W, prior high tracking, P pullback, Y rebound, one arming per window, cancellation on ordinary entry, expiration, no loss-launched window and order/fill timing. Compare its component directly to authoritative D1 state traces; isolate and document necessary Growth-specific adaptations.
3. **Other three modes**: causality, prior/reference high exclusions, confirmed trend, shallow retracement and recovery, true rising-MA crossing, initial warm-up, equality boundaries, window expiry, overlapping signals, pending orders, no lookahead and allowed resolutions.
4. **UI/parameters**: all strategies use unified schema; enum and nested conditions; invalid state rejection by server; clone/edit; OFF default; mode-specific field visibility; future CLI optimizer domain introspection and valid candidate sampling (only smoke checks, no optimisation).
5. **Historical persistence/name**: before/after DB run ID count, variation IDs, trade/event hashes, user-authored titles, notes, bookmarks, imports, legacy version identification, linkages and SQLite foreign keys; transactional/idempotent migration and verified restore backup.
6. **Closed losses only**: strict realised net-negative semantics; open positions excluded; selection via either chart entry/exit marker; symbol isolation; imported VG Balanced data.
7. **Phenotype import/rerun**: signed/hash-verified or hash-checked import manifest, selected Growth phenotype under new enum schema, single-run execution, locked phenotype untouched, result provenance, no browser optimisation routes; pool case preserves allocator semantics or returns explicit unsupported capability.
8. **Export**: parse ZIP; verify manifest/checksums; correct entry/exit linkage, ET/UTC dates, gross/cost/interest/net reconciliations, attribution, partial legacy data fallbacks and no secrets.
9. **Comparisons**: valid ON vs OFF path-dependent comparison, mismatched-assumption warning, no auto-execution/search.
10. **Regression and E2E**: build, typecheck, lint, unit tests, Playwright interactions, database migrations and repository regression suites; baseline known failures separately identified. Confirm original D1 and `s8-vg-balanced` remain unchanged. Do not claim test results you didn't actually run.

Perform at least one **real-data, single-configuration** test for each continuation mode plus OFF (using safe exploratory dates), and verify entry attribution and exported bundles. Do **not** rank winners, search ranges or tune parameters. Any numbers are diagnostics only. Demonstrate creating/importing a frozen Growth phenotype and running one selected phenotype through the UI/API with immutable provenance. Run or faithfully verify a shared-slot phenotype path if implemented, otherwise label view-only.

Keep docs current (`ARCHITECTURE.md`, `CONTRACTS.md`, `GROWTH_TRADING.md`, `GROWTH_TRADING_AUDIT.md`, `OPERATIONS.md`, `RESEARCH_WORKFLOW.md`, Study 8 guidance as appropriate). Document schema, accepted methods and all defaults, state diagram/transitions, phenotype import format, single-rerun actions and export schema. Add human-understandable examples to explain the four modes.

Final report must provide: modified files, engine/version/name decision, migration/backups and checksums, all four mode specs/defaults, exact available phenotype execution capabilities, export location/operation, baseline/parity evidence, commands/tests executed, known limitations, branch/commit and push status. Explain any old-run engine support retained for reproducibility.

**Git:** Commit and push normally to the **existing checked-out feature branch**, without rewriting history. **Do not merge into `main`.** Restore the Strategy Lab service to its former running/enabled state only when safe and after migrations/testing; don't silently stop user jobs. If a fundamental ambiguity or data-preserving migration obstacle cannot be resolved from actual code, stop and ask before making a destructive guess.
