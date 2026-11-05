# Implementation brief: optional Growth entry, protection, and trend-retention rules

Implement the three proposed research features below as independently configurable options in Strategy Lab. This is an implementation request, not a claim that these features improve returns. Keep Candidate A as the unchanged research control. Do not optimize parameters or run a large research campaign as part of implementation.

## Compatibility and scope

All new features must be OFF by default. With all OFF, reproduce existing Growth 1.2.0 signals, fills, trade accounting, financing, and marked drawdowns exactly. Preserve historical saved results and immutable parameter snapshots. Version the strategy appropriately; do not overwrite the meaning of existing snapshots or reuse old cached previews for new semantics.

Expose the new controls everywhere existing Growth options are supported: parameter schema and validation, engine, Interactive Preview, new-test configuration, effective parameter identity/cache keys, saved snapshots, exports, and parameter descriptions. Use existing app conventions. Disabled feature inputs must not accidentally change effective configuration identity. Verify valid disabled-feature configurations do not fail engine validation, including the known intraday-loss-buffer OFF issue.

Use distinct parameter namespaces for the three features. Users must be able to test each alone or combine them. Do not change live trading, saved runs, bookmarks, or existing strategy defaults.

## 1. Independent initial risk stop

Add an `Initial risk stop` switch, default OFF.

When ON, expose:
- ATR lookback in completed daily trading sessions; initial research default 20.
- Initial-stop distance in ATR multiples; initial research default 3, permitting a 2-versus-3 comparison. These defaults are starting hypotheses, not optimized values.

Define the ATR convention explicitly, including smoothing and true-range calculation. Use only sessions fully completed before the entry fill. Never use the fill session's eventual high/low/close to set its initial stop. If adequate history is unavailable, block the protected entry and record the reason; never silently enter without requested protection.

At entry, initial stop = actual fill price minus multiplier times pre-entry ATR. The initial risk stop is active from entry regardless of estimated profit, accumulated interest, or position age. Keep its price fixed for that position. The existing profit trailing stop remains separately governed by its existing rules. For a long position, the higher of applicable active stop levels governs, subject to valid event chronology. A profit trailing stop becoming ineligible must never deactivate the independent initial risk stop.

Use observed execution conventions consistently: gap through a stop fills at the first eligible observed trade, not at the inaccessible stop level; intraminute fills must be labelled assumed where applicable. Document same-bar ambiguity and choose a conservative deterministic ordering. Log stop level, ATR, activation time, decision time, fill time, and exit reason.

Do not add the separate 'remove profitability condition from trailing stop' research idea to this feature implicitly. That would be a different experiment.

## 2. Alternative trend-breakout entry

Use an entry-method selector rather than two entry systems silently operating together:
- Existing rise-from-recent-low entry (default).
- Breakout above prior high in a rising trend (new).

The new method exposes:
- Entry SMA length, initial research default 50 sessions.
- SMA slope-comparison period, initial research default 40 sessions, following Candidate A's trend horizon.
- Prior-high lookback, initial research default 20 sessions.

Define the new signal at the completed daily close:
1. Close is strictly above its SMA.
2. SMA is strictly above its value K sessions earlier.
3. Close is strictly above the highest session high of the preceding N completed sessions, excluding the signal session.

Fill at the next eligible trade. State the observation timing in parameter help. Reject insufficient history with a recorded reason.

One position at a time, no pyramiding or duplicate pending entries. Use a fresh post-exit completed signal, never an old crossing replay. Once a breakout decision is consumed or rejected, its signal ID cannot trigger again. A later completed session can generate a distinct breakout above its own preceding-window high; do not reset the reference high to the exit fill or introduce an implicit cooldown.

Keep the existing optional entry trend filter as a separately labelled additional gate for either entry method. The new method's rising-trend condition is intrinsic and remains required even if the optional extra filter is OFF. Clearly distinguish the intrinsic SMA inputs from the existing optional filter inputs. Do not silently replace their meanings.

Existing rise-specific persistence applies only to the existing rise entry method. Disable/hide its controls for the new entry method and record it as not applicable. Preserve existing continuation semantics as an independent optional feature if enabled; base-entry decisions retain their existing priority. Do not quietly enable persistence or continuation for this new method.

## 3. Optional trend-retention exit

Add a `Retain part of profitable trend` switch, default OFF.

When ON, expose:
- Fraction sold at the existing profit trailing-stop event, initial research default 50%.
- Remaining-position SMA length, initial research default 50 sessions.
- Consecutive completed closes below that SMA required to exit, initial research default 2.

At the first existing profit trailing-stop event, sell the configured fraction of current shares and retain the remainder. An opening gap can still produce a net loss; handle that actual fill honestly. This is one transition to the remainder stage, not repeated fractional selling every time the old stop condition is met.

For the remainder, replace the consumed profit trailing exit with the trend-retention exit. Count consecutive completed closes strictly below the SMA; reset the count when the condition is not met. Decide at the qualifying close and fill at the next eligible trade. Define whether the partial-sale session's completed close counts, with no use of information before it exists.

Independent initial risk protection, maximum losing hold, and buffered loss exits remain applicable to all remaining shares. Recalculate financing-dependent gates against the current position's remaining notional, not the original full-position dollar thresholds. Document how stop/trend decisions interact and ensure the same shares cannot be sold twice. Pending full risk exits take precedence over lower-priority partial/trend instructions under existing execution timing conventions.

Remain 'invested' until the remainder is closed: no new full-size base entry or pyramiding. For continuation eligibility, treat the complete position as exited only after the final fill and evaluate profitability using aggregate net P&L for that complete position.

Account for partial fills explicitly: proceeds, proportional principal repayment, remaining debt, interest accrual before and after each sale, per-fill costs, realized and unrealized P&L, and marks. Preserve the existing debt-funded economic model unless separately authorized; do not introduce new equity/leverage assumptions here.

Represent one logical position with multiple exit fills. Closed-trade count and final win/loss classification occur when the entire position closes; show partial realized P&L separately. Include cumulative realized profit in portfolio marks alongside the remaining position, with no double counting.

## Visibility and reproducibility

Show new entry, initial-stop, partial-exit, and final-exit events on the chart and in event/trade details. Explain why each decision occurred. Export all effective parameters and accounting artifacts needed to reproduce it. Make old/full-position and new/partial-position results clearly distinguishable without breaking existing reports.

Interactive Preview must continue to execute one unsaved configuration at a time. A failed preview must clearly state that the visible chart and Analysis still belong to the previous successful configuration; never imply that those metrics describe a rejected configuration.

## Required validation

Use meaningful deterministic fixtures and existing regression tests for:
- Exact legacy behavior with all new options OFF.
- Each feature alone and all supported combinations.
- ATR warmup, completed-data timing, next-trade fills, gaps and ambiguous bars.
- An initial stop executing while the position is unprofitable and before maximum-hold age.
- Prior-high window excluding the signal session and no replayed entry.
- Partial sale, remainder-stage transition, trend-counter reset, simultaneous exit triggers, and no duplicate sale.
- Debt repayment, calendar-day interest including weekends, per-fill fees, and reconciliation of realized plus unrealized P&L and marked drawdown.
- Correct logical trade counts and net win/loss classification across partial exits.
- Old snapshots, versioned cache identity, effective/inapplicable values, valid OFF states, and stale-result handling after preview errors.

Deliver a concise implementation summary, changed files, tests performed, exact rule semantics, any unsupported combinations, and instructions for reproducing Candidate A with all new features OFF. Do not save, delete, or migrate the user's existing runs merely to demonstrate the features.
