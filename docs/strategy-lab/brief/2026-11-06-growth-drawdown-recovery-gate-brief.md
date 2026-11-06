# Claude Code — Strategy Lab / Growth: Drawdown Recovery Gate

## Assignment

Implement one **optional, OFF-by-default Drawdown Recovery Gate** in the existing **Growth** strategy in Strategy Lab. This is a **filter on Growth entry eligibility, not a new entry signal or another D1 dip-recovery strategy**. Preserve Growth's required **Advance from Recent Low** entry trigger, its existing exit rules, continuation mechanisms, optional trend filters, persistent eligibility policies, saved results, and Interactive Preview behaviour.

The purpose is to allow Growth entries under either of two conditions:

1. **NORMAL: no unresolved significant recent decline** exists, so this new gate permits ordinary Growth entry decisions; **OR**
2. **A significant decline occurred and has been sufficiently repaired**: price has recovered a configurable **percentage of the entire chronological peak-to-trough decline**, and has maintained that recovery through a configurable number of **trading-session intervals**, using **completed one-minute prices** to evaluate continuity and determine the first intraday eligible decision.

This is deliberately **not** a generic percent rebound from the trough, a D1 trailing-buy trigger, or a separate buy strategy. Do not add a selectable trough-rebound alternative. **Only full-decline retracement is in scope.** The gate never creates an entry on its own.

## 0. Inspect the actual repository first

- Read root `CLAUDE.md`, repository workflow/recovery policies, and current branch status. Read the current Growth engine and tests, the Strategy Lab parameter registry and runner, `docs/strategy-lab/GROWTH_TRADING.md`, `GROWTH_ENTRY_GATES.md`, any continuation and Interactive Preview documentation, research bundle/export implementation, and chart markers/diagnostics if present. Verify paths, assumptions and currently deployed Growth version instead of assuming the state below is still current.
- The last documented version was Growth (`rise-from-recent-low-trading`) **1.2.0**, with entry trend filter A–E, persistent eligibility policies 1–5, continuation methods, and entry-gate decision records. The expected engine entry points were `src/growth-trading/riseTrading.ts`, `src/growth-trading/entryGates.ts`, and the mapping/registry in `apps/strategy-lab/runner/growth-params.ts` and `apps/strategy-lab/shared/strategies.ts`. Inspect and adapt to actual code.
- Do **not** start the previously discussed Study 9 optimisation, examine its reserved final-evaluation data for selection, merge a research branch, or change unrelated strategy rules. Implement this as an isolated feature on the current appropriate feature branch (create one if currently on `main`), test, commit and push. **Do not merge into `main` without a separate instruction.**
- If Interactive Preview exists, verify the new setting is editable there and participates in the correct version/implementation/data-sensitive cache keys. Do not implement or rewrite Interactive Preview as a separate project.

## 1. User-facing configuration

Add a new section named **Drawdown Recovery Gate**, with a clear ON/OFF checkbox, **default OFF**, and method-specific controls shown only when enabled. Use the established generic schema-driven form controls; do not hand-code a special form in one screen. The short labels below are suggestions; choose consistent polished labels and explanatory info text.

| Concept | Suggested registry identifier | Meaning | Illustrative default (NOT optimised) |
| --- | --- | --- | --- |
| Enable gate | `drawdownRecoveryGateEnabled` | Boolean; OFF preserves previous execution exactly | `false` |
| Dip lookback | `dipLookbackSessions` | Historical NYSE trading-session window used to **discover** a qualifying chronological drawdown, not the lifetime of a latched unresolved dip | `30` |
| Significant decline | `dipThresholdPercent` | Minimum **peak-to-subsequent-trough** decline needed to create a dip episode | `5%` |
| Required retracement | `recoveryRetracementPercent` | Fraction **of the entire price decline** between the episode peak and its subsequent trough that must be recovered | `70%` |
| Confirmation duration | `recoveryConfirmationSessions` | Number of **trading-session intervals** for which recovery must remain continuously valid, measured on completed one-minute bars | `2` |

Use sensible typed bounds and validation (positive price; meaningful N and percentage limits; retracement in `(0, 100]`, including 100 where appropriate; `Y = 0` allowed for immediate threshold-only confirmation; higher Y bounded reasonably). Document bounds, day/time definitions, defaults, and whether UI percentages are serialised as percentage points or fractional values. Use the established conditional parameter representation so future CLI optimisation can include gate ON/OFF and active numerical settings; do **not** run optimisation now.

The new gate is **one** optional rule. Keep required Advance from Recent Low intact. Existing trend filter, continuation and persistent eligibility remain independent switches and may be used together; preserve existing OFF-by-default states and all pre-existing semantics.

## 2. Chronological dip detection — peak must actually precede trough

Use **completed regular-session one-minute closes**, processed strictly oldest-to-newest. Do not select an arbitrary `max(high)` and `min(low)` and assume the high occurred first. Do not use the current minute's high/low if their intrabar order is unknowable. For a candidate trough observation `j`, the eligible peak must come from an **earlier** observation `i < j` within the configured last-N-trading-session discovery window.

Conceptually, while scanning the chronological window, keep a running earlier maximum and its timestamp; **compare the current observed close against that earlier maximum before updating the maximum with the current observation**. A qualifying episode begins on the first observation where `(peak - currentClose) / peak * 100 >= dipThresholdPercent`. Record a stable episode ID; the actual peak timestamp and price; first qualifying tick; and the trough timestamp/price. If a rolling deque or incrementally maintained state is used for performance, it must produce identical results to a simple reference implementation that rescans minute observations chronologically.

Examples with a 5% dip trigger:

- `$100 -> $95 -> $90 -> $97`: **10%** chronological peak-to-trough decline; significant episode is detected.
- `$90 -> $95 -> $100 -> $97`: only **3%** decline after the later $100 high; **do not** falsely label it a 10% dip merely because $90 and $100 both occur in the window.
- `$100 -> $99.4 -> $98.8 -> $97.9 -> $96.5 -> $94.2`: gradual **5.8%** decline; it **does** qualify despite no large single-day selloff.
- High and low recorded within a single minute: do not infer their order from OHLC; rely on chronological completed closes.

The **N-session lookback is a discovery window, not an automatic episode expiration**. Once a significant dip is found, latch its anchor peak and subsequent trough and keep its state active even when that original peak ages out of the rolling lookback. A later lower observed close becomes the new trough. Do not let an unresolved bear-market decline disappear merely due to passage of N sessions. Do not repeatedly rediscover or restart the same historical episode as the rolling window advances.

After an episode is **fully resolved** (see below), ignore the historical episode for new detection even if its peak and trough remain within the rolling window. Establish a new causal baseline at the resolution instant; a **new** peak followed by a **new** significant decline can create a subsequent independent episode. Specify deterministic tie handling, initialization/warm-up (including data beginning mid-decline), and whether the detector can identify an unresolved dip in pre-eligible warm-up without accidentally permitting early trades. When historical data are insufficient to establish a trustworthy configured window, follow a documented conservative policy rather than blindly declaring NORMAL.

## 3. Recovery is a fraction of the full peak-to-trough decline (only method)

For an active episode, let `P` be its recorded peak close and `T` the lowest completed close **after** that peak; compute:

```
requiredRecoveryPrice = T + (P - T) * recoveryRetracementPercent / 100
```

For example: peak `$100`, trough `$90`, retracement `70%` -> threshold `$97`. This is **not** 70% above $90, nor an independent 5% rise from the trough. If a lower trough occurs, replace T, recompute the threshold, and reset any current confirmation streak. The peak remains the historical episode anchor until full resolution. Do not retroactively modify earlier decisions when future lows or highs are observed.

While price is below the threshold, the gate blocks entries. Once it reaches the threshold, the strict persistence clock starts, subject to the rules below.

## 4. Strict intraday continuity for Y trading-session intervals

**The user expressly does not want recovery confirmation based exclusively on Y daily closing prices, nor a forced wait until the following session's open.** Use **daily/NYSE session intervals as the duration unit**, and **completed one-minute observations to enforce persistence and to permit an intraday entry at the first valid decision**.

- `Y = 0`: as soon as an observed completed one-minute close reaches the dynamic recovery threshold, the recovery condition is satisfied; a Growth entry is possible at the first otherwise valid subsequent fill, using existing signal/order rules.
- `Y > 0`: the first completed one-minute close at or above the threshold starts a confirmation timer. Every **subsequent available completed regular-session one-minute close** during the confirmation interval must remain **at or above** the threshold. A completed minute close **below** it resets the entire timer; a later recovery begins a new timer. No tolerance band; no counting only end-of-day snapshots.
- **Session-based elapsed-time convention:** count the signal's starting trading session as session index 0; `Y=2` starting Monday 11:15 ET can become qualified **Wednesday at/after 11:15 ET**, assuming Tuesday and Wednesday are the next two exchange trading sessions and continuity was maintained. `Y=1` would become eligible Tuesday at/after the corresponding intraday point. Use NYSE session boundaries and America/New_York market time, never UTC 24-hour intervals or weekend/holiday calendar days. Handle early closes and the case where a corresponding time has no minute: qualify only at the first actual eligible subsequent completed minute, without pretending that a nonexistent tick occurred. Freeze and test the exact convention.
- On the first observed regular-session opening trade of each subsequent session, a **gap below the threshold resets continuity immediately** even if a later minute rebounds. A closing print below the threshold also resets. No overnight assumption that market prices were continuously observable; only ensure no observed opening/regular minute violates the threshold.
- Missing minute bars/halts must be handled deterministically and causally. They must not be silently treated as positive recovery evidence; document a conservative, testable handling rule appropriate to the project's market data completeness. Do not use future prints to backfill earlier decisions.
- Re-evaluate threshold validity on each completed minute. A new lower trough resets confirmation as stated above. If the confirmation is interrupted, entries are blocked until **another full Y-interval** passes, unless the episode becomes fully resolved.
- Once confirmed, the gate can permit an entry decision **during the qualifying session**, at that completed minute or a later causal decision point, and fill at the **next eligible trade** under the established Growth execution semantics. No look-ahead and no backdated fills.
- If the recovery loses its threshold after confirmation, immediately revert to recovery-required and reset confirmation. A second sustained recovery needs another full Y-interval.

Do not allow the same-minute closing observation to decide and fill at its own earlier open. Preserve natural chronological event order, including regular-session entry/exit sequencing and the strategy's established no/yes same-session re-entry rules.

## 5. Episode lifecycle and full resolution

Specify an auditable state machine with at least:

1. **NORMAL** — no unresolved qualifying dip; new gate is permissive and never generates its own entry.
2. **RECOVERY_REQUIRED** — qualifying chronological drawdown has been detected; Growth entries blocked. Track peak, trough, threshold, confirmation start and streak resets.
3. **RECOVERY_CONFIRMED** — price has satisfied the configured threshold continuously for Y trading-session intervals; the gate allows Growth entry decisions **only while threshold validity remains true**. The original dip episode still exists.
4. **RESOLVED** — first completed minute close returns to or exceeds the original anchored peak P. The old episode is closed, the detector transitions to NORMAL with a **fresh detection epoch**, and old prices do not re-arm that episode. When price reaches the original peak, full recovery supersedes the partial-retracement requirement; do not leave a completed 100% recovery permanently blocked solely for lack of Y intervals. Record this special resolution explicitly in logs. New later peak-to-trough declines can arm new episodes.

Specific cases to test and document: previously confirmed recovery falls below threshold; lower trough after a confirmed recovery; higher prices below original peak; original peak reached before Y elapsed; N-window expiry while unresolved; detection after resolution while old episode remains inside N; significant gradual decline; dip entirely during warm-up; unresolved episode crossing a year boundary; new highs and same-price timestamp ties; multiple candidate dips in a rolling window; long downtrend without new single-day drops.

## 6. Interaction with existing Growth entries and entry eligibility

- **Advance from Recent Low is still the required entry generator.** The Drawdown Recovery Gate never independently generates an entry signal, never opens a trade because its threshold was reached, and never changes D1's deep-dip or classic continuation definitions.
- Apply the gate to **every Growth-owned entry decision** where the existing entry trend gate applies (base crossing, latched opportunity decision, renewal if present, and each continuation method), not to exits. The gate is conceptually independent of the existing A–E trend filter; if both enabled, both must allow the decision. Log the actual blocking reasons independently.
- **Persistent eligibility ON:** If a valid Growth crossing or existing opportunity is blocked solely or partly by this gate, keep it latched under its chosen policy and maximum lifetime. When the gate becomes permissive, it may execute **only if that previously generated opportunity is still valid** and all other filters/capital constraints pass. Fill at current price, never at the old signal/threshold price. If an opportunity expires or invalidates before confirmation, do **not** invent an entry; wait for a new genuine crossing or eligible existing continuation event.
- **Persistent eligibility OFF:** a gate-blocked instant signal is vetoed, not automatically replayed later. Turning the new gate permissive does not create a synthetic Growth crossing. This should be clear in the UI/help documentation.
- Respect existing precedence rules for base versus continuation and exactly one order/trade per symbol as applicable. Preserve established semantics for a trend-vetoed continuation episode unless a **separate explicit design change** is requested; do not silently alter continuation rules.
- **Important with daily vs intraday signal bars:** Growth's base crossing may be evaluated at a selected bar resolution, while the new gate is defined on completed **one-minute** observations. Ensure the gate state is maintained on minute market data independently of the chosen base signal resolution. Never act on a future daily close. Where a valid **already-armed** opportunity exists and the gate confirms intraday, support a causal minute-level eligibility decision and next-trade fill without waiting for that day's close. If other existing eligibility-policy evaluations are bar-resolution-dependent, define and test a consistent causal evaluation schedule, rather than misrepresenting this as intraday support. Without an already-armed eligible opportunity, the gate permitting at 10:42 AM must **not** fabricate a new base signal at 10:42 AM.
- Keep existing order-pending behaviour: once a valid decision has created an order, the original next-eligible-trade fill rules apply. If current engine contracts prevent exact integration, expose and explain the constraint before making a shortcut.

## 7. UI, preview, chart diagnostics and exports

- Add a **Drawdown Recovery Gate** ON/OFF switch to the schema-driven **New Test** form and **Interactive Preview** compact parameter panel, hidden parameter inputs when disabled, labels and accessible descriptions/info controls. Keep its default OFF. Ensure keyboard Enter, dirty-state detection, conditional validation, cloning, saved variations, and phenotype import/export function correctly.
- If Interactive Preview is present, include the effective gate parameters in its cache identity and preserve the safety mechanisms for strategy implementation/version, market data, dates, resolution, interest and execution settings. No cached results from another implementation may be returned incorrectly. Preview runs must not silently create saved runs.
- Add transparent *nonintrusive* diagnostics: current gate state, peak/trough timestamps/prices, observed dip %, required recovery %, dynamic threshold, confirmation start/time elapsed, resets, and reason an entry was allowed/blocked. The existing chart and analysis panel can optionally show an episode/threshold overlay if practical, default hidden; **do not** redesign the chart or impede zoom/hover/drag controls.
- Extend `events.json`, `decisions.json`, `trades.json` metadata, metrics, and research ZIP/CSV/Markdown exports using the established architecture. Provide stable episode IDs and causal transition logs (`dip_detected`, `new_trough`, `recovery_started`, `confirmation_reset`, `recovery_confirmed`, `confirmation_lost`, `dip_resolved`, `entry_blocked_by_drawdown_gate`, etc.), with decision timestamps and original crossing/latched opportunity IDs. Include the gate ON/OFF state and exact numerical parameters in provenance.
- Provide summary diagnostic counts: episodes, dip magnitudes, confirmations, confirmation failures/resets, blocked crossings, blocked continuations, deferred eligible entries, and trades that eventually resulted. Do not claim per-trade contributions are causally additive: use identical paired ON/OFF reruns if measuring marginal effects.

## 8. Versioning, reproducibility and testing

- Bump the **internal Growth algorithm version** following the project's versioning scheme because new functionality changes possible outcomes. Keep the user-facing name **Growth** (not a separate Growth/Dip strategy). Preserve previous `1.2.0` and earlier saved results, parameter interpretation, provenance and replay semantics. If legacy replay is achieved through explicit OFF gates on the new engine, verify it against archived trade/event/metric signatures. Do not rewrite historical run artifacts or silently upgrade previous strategies.
- **OFF-parity is mandatory:** With the new gate disabled, existing Growth signal, trade, timing, decision, exit, costs, minute/daily drawdowns, and historical outputs must reproduce exactly to the established parity tolerances across existing Growth configurations, including combinations of trend, eligibility and continuation. No extra active warm-up state or data transformations may change OFF results. Document any unavoidable additional inactive metadata separately from trading parity.
- Add isolated unit tests for chronological peak-before-trough detection (the two `$90/$100` permutations), gradual dips, intraday decline, rolling N-window boundaries, stable episode anchor, no duplicate detection, fresh epoch after resolution, moving trough, same-timestamp bars and insufficient data.
- Add strict confirmation tests for `Y=0`, `Y=1`, `Y=2`, and larger Y; threshold equality; a one-minute dip under threshold resetting the timer; overnight opening gap below threshold; holiday/weekend; US DST; early NYSE closes; missing bars; lower trough during/after confirmation; full peak recovery; intraday eligible decision with **next observed eligible fill** (not waiting for the close); resolution-mismatched data and no look-ahead.
- Add integration tests for filter OFF/ON, no-dip branch allowing original Growth signals, gate-blocked crossings with eligibility OFF vs ON, opportunity expiry, each eligibility policy where relevant, interaction with trend A–E and each continuation method, import/export, Interactive Preview caching and no saved run pollution.
- Test on deterministic synthetic data first; use existing research/development partitions for illustrative real-data diagnostics, **not** previously reserved final-evaluation data as a tuning target. Add a paired gate-OFF vs gate-ON diagnostic on the same historical data and assumptions (no optimiser/search required). Do not claim that the rule is profitable, robust or safer before testing.
- Run available unit/integration/browser tests, lint, typecheck and build. State actual results and pre-existing failures accurately. Update Growth/Strategy Lab docs and user-facing parameter descriptions.

## 9. Delivery and constraints

1. Implement on a suitable feature branch; commit and push changes. **Do not automatically merge into `main`.** Do not execute the Study 9 optimisation or change any market data, frozen Study 8 assets, historical results or real trading systems.
2. Provide concise summary of architecture and state transitions; exact version; parameter names/defaults/validation; how to launch a manual test and configure Interactive Preview; test results; reproducible command(s); and remaining issues.
3. Produce a focused, reviewable Markdown implementation report showing:
   - proof of chronology (peak preceding trough) and cumulative-dip example;
   - session-interval timing with actual intraday qualification;
   - original-peak resolution and non-redetection;
   - OFF parity;
   - signal-vs-gate-vs-opportunity-vs-execution separation;
   - references to exported episode and trade decision logs for later independent analysis.
4. If a requirement conflicts with existing engine semantics, document the exact conflict and implement a causal, compatible solution rather than silently degrading to daily-close-only entry or allowing the gate to create buy signals.

**The core acceptance criterion:** Existing Growth behaviour is unchanged when this optional gate is OFF. When ON, Growth may enter in the absence of an unresolved significant dip, or following the specified **full-decline retracement plus strict Y-session minute-observed confirmation**. All decisions must be chronological, causal, auditable, and compatible with the existing entry-eligibility mechanism.
