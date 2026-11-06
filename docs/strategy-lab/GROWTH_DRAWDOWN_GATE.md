# Growth Drawdown Recovery Gate (Growth 1.4.0)

Growth 1.4.0 (`rise-from-recent-low-trading@1.4.0`) adds one optional switch, the **Drawdown Recovery Gate**. It is
**OFF by default**.

It is a **filter on Growth entry eligibility**, not an entry signal. It never opens a trade by itself. When the
underlying symbol has suffered a significant, still-unresolved decline, it blocks new Growth entries until the price
has recovered a share of the **whole** peak-to-trough decline and held that recovery through a number of trading-session
intervals, observed on completed one-minute prices. Without an unresolved dip it permits everything (NORMAL).

The required **Advance from Recent Low** entry, the exits, continuation, the entry trend filter, persistent eligibility
and the 1.3.0 options are unchanged and stay independent switches. With the gate OFF, Growth 1.4.0 reproduces 1.3.0
exactly (§10).

- **Code:**
  - `src/growth-trading/drawdownGate.ts`: the observations, the detector and the state machine.
  - `src/growth-trading/entryGates.ts`: the gate in the decision check, and the release wake of an armed opportunity.
  - `src/growth-trading/riseTrading.ts`: the simulation interleaves the gate's observations with the decisions.
  - Strategy Lab: `apps/strategy-lab/shared/strategies.ts` (the schema), `runner/growth-params.ts`,
    `runner/trading-run.ts`, `server/export.ts`.
- **Brief:** `brief/2026-11-06-growth-drawdown-recovery-gate-brief.md`.
- **Implementation report and evidence:** `reports/2026-11-06-drawdown-recovery-gate/REPORT.md`.
- **Not a recommendation.** The defaults are illustrative and were not optimised. The gate is not evidence of safer
  or better trading (§11).

## 1. Parameters

| Key | Label | Default | Bounds | Meaning |
| --- | --- | --- | --- | --- |
| `drawdownRecoveryGateEnabled` | Drawdown Recovery Gate | OFF | switch | OFF = exactly Growth 1.3.0 |
| `dipLookbackSessions` (N) | Dip lookback | 30 | integer 1–500 sessions | the **discovery** window (not an expiry) |
| `dipThresholdPercent` (d) | Significant decline | 5 | 0.1–90 % | minimum peak-to-subsequent-trough decline |
| `recoveryRetracementPercent` (r) | Required retracement | 70 | 0.1–100 % (100 allowed) | share of the **whole** decline to recover |
| `recoveryConfirmationSessions` (Y) | Confirmation | 2 | integer 0–60 sessions | trading-session intervals the recovery must hold; 0 = at once |

- **Units.** Percentages are **percentage points**, as for every Growth input: 5 = 5 %, stored and serialised as 5.
  The engine converts them to the nearest double fraction, so 5 becomes 0.05.
- **Sessions.** Sessions are the dataset's trading sessions, the NYSE sessions present in the canonical data.
  Weekends and holidays are not sessions.
- **Inactive inputs.** The four inputs apply only with the switch ON, and the form hides them otherwise. An inactive
  value is a draft, labelled "saved, not applied". It never enters the effective configuration, the variation
  identity or the preview cache key.
- **Optimisation metadata.** Each input has a `search` domain for a future CLI optimiser. Its `activeWhen` is the
  switch, so the OFF branch is a valid candidate. Nothing in Strategy Lab searches.

## 2. Observations (what the gate sees)

The gate reads completed regular-session prices of the run's symbol, strictly oldest to newest, **independently of the
signal bar resolution**.

| Observation | Price | Known at | Role |
| --- | --- | --- | --- |
| Opening trade | the session's first regular minute's open | that minute's start (normally 09:30 ET) | continuity only |
| Reopening trade | after missing minutes inside a session, the next bar's open | that bar's start | continuity only |
| Minute close | each completed one-minute close | the minute's end (start + 60 s) | **full** |
| Closing print | the official close; **only when the data have a closing print** (otherwise the last minute is never re-observed at the close) | the scheduled close (16:00 ET, 13:00 on early closes) | **full** |

- **Full observations** drive everything: detection, trough, the start of a recovery streak, its qualification and the
  resolution.
- **Continuity-only observations** can only break a recovery streak: an opening gap below the threshold, or a reopening
  after a halt or a run of missing minutes.
- **Never used:** a minute's high and low, because their order inside the minute is unknowable. A dip with a high and a
  low inside one minute is not a dip.
- **Missing minutes** are never evidence. Elapsed time counts on the session clock, but a streak qualifies only at an
  actual observed close, and the first trade after a gap is checked.
- **Same-instant order.** A close is known at its instant, so a decision at that instant knows it. An opening or
  reopening **trade** at an instant happens after that instant's decisions: it can be their own fill. So the gate
  receives it only after them (§7.2).

## 3. Detection: the peak must precede the trough

At a full observation *j* (close *c*, session *s*), in NORMAL:

1. **Candidate peaks.** These are the full observations *i < j* of the current detection epoch in sessions *s − N … s*:
   the current session and the N sessions before it. M is the highest candidate close; between equal closes the most
   recent one is the peak.
2. **The comparison comes before *j* joins the candidates.** If *c ≤ M × (1 − d)*, an episode `DD-k` starts. Equality
   qualifies, and binary rounding is absorbed (relative 1e-12, as in the Rise scanner).
3. **What the episode records:** a stable id, the peak (its price, time, session and observation kind), the first
   qualifying observation, and the trough (initially *c*).

Examples with d = 5 % (synthetic tests in `src/growth-trading/tests/drawdownGate.test.ts`):

| Path | Result |
| --- | --- |
| $100 → $95 → $90 → $97 | detected at 95 (exactly 5 %); trough 90; a 10 % chronological decline; threshold at r 70 % = 97 |
| $90 → $95 → $100 → $97 | **no episode**: only 3 % below the later high (the earlier 90 is not a "peak before the 100") |
| $100 → $99.4 → $98.8 → $97.9 → $96.5 → $94.2 | detected at 94.2 (5.8 %): a gradual decline counts |
| a minute with high 120, low 80, close 100 | nothing (highs and lows are not observations) |

A monotonic deque keeps M. On four seeded random paths with sparse minutes, gaps and missing closing prints, and four
configurations each, an independent rescanning reference implementation gives identical transitions (tested).

## 4. The episode, its threshold and its end

- **Latched anchor.** The peak P stays the episode's anchor until the episode is resolved. The discovery window never
  expires it: an unresolved bear-market decline does not disappear as sessions pass.
  - Example: VGT's DD-23 peaked at 466.13 on 2021-12-28. It stayed active through the 2022 low of 291.84 (2022-10-13)
    until 2023-11-29.
- **One episode at a time.** While an episode is active nothing new is detected, so the same history is never
  rediscovered.
- **Trough.** T is the lowest full close since the peak. A strictly lower close lowers it; on equal closes the earlier
  trough is kept.
- **Threshold.** R = T + (P − T) × r. With P = 100, T = 90 and r = 70 %, R = 97. This is **not** 70 % above the
  trough, and not a rebound measured from the trough. A new trough recomputes R and restarts any confirmation.
- **Resolution.** The first full close at or above P resolves the episode (`dip_resolved`), even before a confirmation
  completes. A full recovery supersedes the partial one; `resolvedBeforeConfirmation` records that case.
  - The detector returns to NORMAL with a **fresh epoch** that starts at the resolving close.
  - Older prices can never re-arm the episode, even while they are still inside the window.
  - A new peak followed by a new significant decline starts a new episode. VGT example: DD-2 was resolved on
    2016-06-07 09:41 ET at 110.44; DD-3's peak, 110.64 on 2016-06-08, came after it.

## 5. Confirmation: Y trading-session intervals, observed on minutes

The confirmation clock works as follows:

- **Start.** A streak starts at the first full observation at or above R. Its session is session index 0, and its New
  York wall-clock minute is m₀.
- **Y = 0.** The gate is confirmed at that same observation.
- **Y ≥ 1.** The gate is confirmed at the first full observation, with continuity intact, in session index Y at New
  York minute ≥ m₀, or in any later session.
- **Continuity.** Every observation in between must be at or above R: minute closes, opening and reopening trades, and
  closing prints. One observation below resets the streak (`confirmation_reset`, with its cause), and a new streak
  needs another full Y.

Cases:

| Case | Result (tested) |
| --- | --- |
| Monday 11:15 ET, Y = 1 | Tuesday at the 11:15 minute close (not at 11:14, not at Tuesday's close) |
| Monday 11:15 ET, Y = 2 | Wednesday at/after 11:15 (the user's example) |
| Friday start | the next session is Monday (Presidents' Day holiday skipped: Tuesday) |
| Across DST (Friday 11:15 EST → Monday 11:15 EDT) | New York time, not 24-hour UTC intervals (3 days − 1 hour) |
| Target session is an early close (13:00) and m₀ = 15:00 | the next session's first completed minute (09:31) — no pretended tick |
| The target minute is missing | the next observed completed minute (e.g. 11:21) |
| One minute close below R | reset; the next close at/above R restarts a full Y |
| An overnight gap below R | reset at the opening trade, even if the first minute rebounds |
| A closing print below R | reset |
| A reopening trade below R after missing minutes | reset (`reopen_gap`) |
| A lower trough during confirmation / after it | reset / `confirmation_lost`; R moves down |
| The peak regained before Y | resolved at once (permits) |
| r = 100 % | only regaining the peak permits |

Once confirmed (`recovery_confirmed`), the gate permits while every observation stays at or above R. A close below R
(`confirmation_lost`) blocks again and needs another full Y.

**Real example (VGT, 2016, defaults: N 30, d 5 %, r 70 %, Y 2):**

1. **The episode.** DD-2's peak was 110.41 (2016-04-04 10:10 ET). The dip was detected at 104.84 (2016-04-29 09:32)
   and the trough reached 103.17 (05-06), giving R = 108.238.
2. **A one-minute reset.** A streak started on 05-24 at 15:25 (108.244) and was reset at 15:28 (108.22).
3. **The streak that counted.** A new streak started on 05-25 at 09:31.
4. **Confirmation.** On 05-27 (index 2) at 09:31 the gate was confirmed.

## 6. States and availability

```text
NORMAL ──(a close ≥ d below the highest EARLIER close of the window)──▶ RECOVERY_REQUIRED (blocks)
   ▲                                                                       │  ▲
   │                                   (≥ R held Y sessions; Y = 0 at once)│  │(a close/gap below R; a lower trough)
   │                                                                       ▼  │
   └──────────────(a close ≥ the peak P: RESOLVED, fresh epoch)──── RECOVERY_CONFIRMED (permits while ≥ R)
```

- **Permits** in NORMAL and RECOVERY_CONFIRMED. **Blocks** in RECOVERY_REQUIRED.
- **Insufficient history** also blocks (fail closed): while the discovery window reaches before the loaded data
  (session index < N), the gate cannot establish NORMAL over the configured window.
  - The run loads N sessions of warm-up for the gate, so inside a window only a symbol's first sessions are affected
    (VGT/GDX/XBI data start on 2016-01-04).
  - Episodes in the warm-up are detected and can block the window's first decisions; trades never happen in the
    warm-up.
- **Initialisation.** The detector starts **N sessions before the run's first session**, or at the first loaded session
  when the data begin later, with a fresh epoch.
  - This holds whatever other options load as warm-up: a trend filter, continuation or the initial stop never change
    the gate's history (tested).
  - An episode that began before that history is unknown to it. This is a documented limitation: an earlier window
    start gives the detector more history, and the episode records `windowCompleteAtDetection`.
  - A dip detected while the window was incomplete may have a censored peak.

## 7. Interaction with Growth's entries

The gate is checked at **every Growth-owned entry decision**: the base crossing (or breakout), a latched opportunity's
decision, a renewal signal, and a continuation trigger of every method. **Exits are never filtered.**

| Situation | Behaviour |
| --- | --- |
| No unresolved dip | NORMAL: every decision as without the gate (tested: identical trades) |
| **Persistent eligibility OFF**, the gate blocks a signal | `vetoed` (`rejected_signal`, reason `drawdown_gate`); **never replayed**. A later release creates nothing until a NEW genuine signal |
| **Persistent eligibility ON**, the gate blocks a crossing | the opportunity is armed and waits (`blocked_by_drawdown_gate`) under its policy and maximum age; when the gate permits — **at the confirming minute** (the release) — it may be decided if it is still live, flat with no order, and every other gate passes; it fills at the **next eligible trade**, at the then-current price (never the signal or threshold price) |
| An opportunity expires or is invalidated first | nothing is invented; re-entry needs a new signal |
| A continuation trigger blocked | `vetoed`, and its episode ends (`drawdown_gate`): the established trend-veto semantics, unchanged |
| The entry trend filter also ON | both are evaluated at every decision; both must allow; `blockedBy` lists every blocker (the primary reason is the first in the order trend → drawdown) |
| The initial risk stop ON | its availability is checked after the gate (as after the trend filter) |
| The breakout entry | its decisions are gated the same way (eligibility does not apply to the breakout) |
| An order already placed | fills at the next eligible trade even if the gate turns; existing order semantics |

### 7.1 The release decision (intraday, eligibility ON only)

A **release** is a blocking → permissive transition at a full observation: a confirmation, a resolution, or the window
becoming complete. If the live opportunity's latest evaluation was blocked **with the drawdown gate among its
blockers**, one extra decision is taken at that instant (`via: drawdown_release`). The steps:

1. **Policy validity.** The rolling-predicate part of the policy is the last completed run-resolution bar's. The
   opportunity is live, so it held there. Policy conditions are bar-based, so the release does not re-run the bar
   schedule.
2. **Price conditions.** The price conditions of policies 2 (minimum strength), 3 (extension cap) and 4
   (deterioration) are re-checked at the release price, read-only.
   - A failure only defers the decision, and it is logged.
   - An invalidation happens only at a completed bar of the schedule.
3. **Gates.** Capital, then the trend filter at that instant, then the drawdown gate (now permissive), then the initial
   stop's availability.
4. **Order.** The order fills at the next eligible trade: the next minute's opening trade, or the next session's
   opening trade.

At the same instant a regular bar evaluation goes first, and the wake is then redundant. A release without a live
opportunity creates nothing: the gate never fabricates a signal.

**Example (VGT 2016, the same episode as §5).** The chain separates signal, gate, opportunity and execution:

| Instant (ET) | Layer | What happened |
| --- | --- | --- |
| 2016-05-25 16:00 | Signal | The Rise crossing closed at 108.87 |
| 2016-05-25 16:00 | Gate | Recovery required (streak since 09:31) |
| 2016-05-25 16:00 | Opportunity | Armed as `O-2` (policy 1, W 10), `deferred` |
| 2016-05-27 09:31 | Gate | The 09:30 minute closed at 109.12: confirmed, a release |
| 2016-05-27 09:31 | Decision | `O-2` decided at 109.12 (age 2 sessions) |
| 2016-05-27 09:31 | Execution | Filled at the next trade, the 09:31 minute's open, 109.13 (`T-1`) |

### 7.2 Simulation order

The gate's observations are merged into the decision loop in time order. At one instant the order is fixed:

1. a completed close (minute close or closing print): a decision at that instant knows it;
2. the fresh crossing;
3. the live opportunity's step (the bar before a release wake);
4. the continuation step;
5. an opening or reopening **trade** at that instant: it can be one of the decisions' own fills, so it is never
   known to them.

A decision never reads an observation after its instant. The gate's `check` refuses an unprocessed close of the
instant (only a pending trade of the instant is allowed), and a run on data truncated after any session reproduces
every earlier transition (tested). With the gate OFF the loop is the 1.3.0 loop.

## 8. Records and exports

| Where | What |
| --- | --- |
| `events.json` | Gate results on signal and decision events: `drawdown.*` values (state, episode, peak, trough, dip %, threshold, recovered %, streak start, resets) and `blockedBy`. A release decision: an `entry_signal` with id `SYM:latched:<t>`, minute precision, `meta.via = drawdown_release`; its executed entry carries the gate state at the decision. No new event kind |
| `decisions.json` | Run level `drawdownGate {enabled, …}` and a note. Per symbol `drawdownGate`: the detector (first loaded session, `windowCompleteFrom`, observation counts, the state at the end), `episodes` (stable `DD-n`: peak, first qualifying observation, trough, threshold, confirmations, resets by cause, resolution, blocked decisions), `transitions` (in time order, each with its observation and the state after it), `releases` and `summary`. `entryDecisions` gate records add `drawdown` and `blockedBy`; latched records add `via`. **Only with the gate ON** |
| `trades.json` | `drawdownGate` per row: state at the decision, episode, threshold, peak, trough, `decidedAtRelease`, `opportunityBlockedByGateBefore`. Only ON |
| `metrics.json` | Run level `drawdownGate` (`{enabled: false}` when OFF). Per symbol (ON only) the descriptive counts (§8.1) |
| Research bundle | `drawdown-episodes.csv`, `drawdown-transitions.csv`, `drawdown-gate.md`; `entry-decisions.csv` gains `blocked_by`, `drawdown_state`, `drawdown_episode`, `drawdown_peak`, `drawdown_trough`, `drawdown_threshold`, `drawdown_confirmation_start`, `via`, `drawdown_values_json` (only when the gate was ON) |

The transition events are:

- `dip_detected` and `new_trough`. A run of new lows is **one record per session**, with the first and last instants
  and the count, so a crash does not log every minute.
- `recovery_started`, `confirmation_reset` (cause: `opening_gap`, `reopen_gap`, `minute_close`, `closing_print`,
  `new_trough`), `recovery_confirmed`, `confirmation_lost` and `dip_resolved`.
- `window_complete`.
- `entry_blocked_by_drawdown_gate`, with the decision kind and the crossing or opportunity id. A latched opportunity
  gets one record per blocked stretch, not one per bar.

### 8.1 Summary counts (descriptive)

Per symbol:

- **Episodes:** total, in the warm-up, with the window incomplete, resolved (and how many before a confirmation), and
  unresolved at the end.
- **Depth and duration:** the deepest decline per episode, and the sessions from detection to resolution.
- **Confirmation:** streaks started, confirmations, resets before confirming, confirmations lost, and resets by cause.
- **Releases** by cause.
- **Blocks:** blocked decisions by kind, blocked crossings, and blocked continuation triggers.
- **Deferred entries:** opportunities the gate blocked and those later entered, decisions taken at a release, and the
  trades that came from a blocked opportunity.
- **State:** the gate's state at each window session's close, and at the end.

These are counts of one run. **They are not causal per-trade contributions:** a blocked or delayed entry changes every
later decision. To measure the effect, compare an otherwise identical run with the gate OFF (paired, §9).

## 9. Using it

1. **New Test.** Choose **Growth (v1.4.0)** and switch **Drawdown Recovery Gate** ON. The four inputs and their help
   appear.
   - With persistent eligibility OFF, a note says a blocked signal is never replayed.
   - Run Test runs one configuration.
2. **The run.**
   - **Analysis** has the *Drawdown Recovery Gate* section.
   - **Trades** labels an entry decided at a release *base Growth · latched O-k · at the drawdown-gate release*.
   - Each event's detail lists the gate's values.
   - **Parameters** shows the switch and its inputs.
3. **Interactive Preview.** The gate is part of the compact panel, from the same registry as the form. Switching it,
   or changing an active input, changes the configuration.
   - The cache identity holds the effective values, the strategy version, the schema hash, the implementation
     fingerprint and the data.
   - An OFF gate's drafts never change the key.
   - A preview never creates a saved run.
   - A 1.3.0 run is previewed only through the explicit *Preview as Growth 1.4.0* button, with the gate OFF.
4. **The paired control.** Clone the run, switch only the gate OFF, Run Test and Compare: the comparison names the
   gate's state on both sides. From the CLI, two runs on identical sessions:

   ```text
   npm run growth-paired -- --request <request.json> --off drawdown-gate --out <dir>
   ```

5. **Evidence bundles without the UI** (a scratch state, never the live one):

   ```text
   npm --prefix apps/strategy-lab run export-requests -- --out <dir> <request.json> …
   ```

## 10. Versions, OFF parity and old runs

- **The current version.** 1.4.0 is the version New Test offers.
- **1.3.0 is legacy.**
  - It is `launch: phenotype`, and its stored schema is byte-identical (sha256 `a2cca065…`).
  - It replays as 1.4.0 with the gate OFF (`replay` mode `legacy-1.3.0`), and a clone starts a 1.4.0 test with the
    gate OFF.
  - 1.2.0, 1.1.0 and 1.0.0 replay as before, with the gate OFF as well.
- **OFF parity: engine.** `src/growth-trading/tests/offParity-1.3.0.test.ts` reproduces 7 real-data cases captured
  from 1.3.0 at `d13148a` before any gate code, in two OFF forms. The breakout entry, the initial stop, retention, both
  entry gates and every continuation method are ON in at least one case, on daily, 60- and 15-minute bars.
  - Identical: signals and dispositions, every trade field, excursions, both drawdowns, every daily mark, episodes,
    the complete decision log, the minute marks, the full metrics, the gate and optional-rule records and the breakout
    scan.
  - The 1.2.0, 1.1.0 and 1.0.0 fixtures still pass on the same engine.
- **OFF parity: runner.** `apps/strategy-lab/tests/growth-parity.test.ts` reproduces the runner artifacts of four 1.3.0
  runs (R-930001…004, one with effective values only) captured before the change, both as 1.3.0 replays and as 1.4.0
  with the gate OFF.
  - `events.json`, `trades.json`, `daily.json`, `decisions.json` and the minute marks are **byte for byte** identical.
  - `metrics.json` is identical except for the added `drawdownGate: {enabled: false}` and `engineVersion`.
- **Inactive metadata (not trading parity).** A 1.4.0 OFF run adds:
  - `drawdownGate: {enabled: false}` to `metrics.json`;
  - the assumption "Drawdown Recovery Gate: OFF (identical to Growth 1.3.0)" to its run record;
  - `src/growth-trading/drawdownGate.ts` to the provenance engine hashes.
- **No migration.** The 1.4.0 strategy row is created on first use. The live server needs a restart to offer 1.4.0
  ([OPERATIONS.md](OPERATIONS.md)).

## 11. Limitations and pitfalls

- **A filter only removes or delays entries.** In the training-partition diagnostics (the report) the defaults
  removed most VGT and GDX entries. GDX spent most of 2016–2023 in an unresolved dip, so the gate kept it out of the
  market for most sessions. Fewer entries mean missed rises as well as avoided losses. Judge it only against the
  paired OFF run, over several symbols and windows, never on dates you will later test.
- **Path dependence.** The gate's state depends on the loaded history (§6). Episodes before the first loaded session
  are unknown.
- **Volatile, range-bound symbols** can stay in RECOVERY_REQUIRED for a long time: the anchored peak may not be
  regained, and the threshold moves down only with new troughs.
- **Choppy recoveries.** A recovery near R in a choppy market resets often. The minute-level continuity rule is
  strict by design: no tolerance band.
- **Fill price.** Release decisions are intraday. They fill at the next trade, which the minute-bar data only proxy (no
  spread).
- **No chart overlay.** The episodes are in the Analysis section, the event details and the exports. The brief made
  the overlay optional.
- **Not optimised.** No setting was optimised or validated.

## 12. Tests

| Test | What it covers |
| --- | --- |
| `src/growth-trading/tests/drawdownGate.test.ts` (42) | bounds and warm-up; the observation stream (open, reopen, minute closes at their end, the closing print); the `$90/$100` permutations, the gradual dip, the intrabar range, the rolling window boundary, the latched anchor, the long downtrend, resolution and the fresh epoch, equal closes and same-instant observations, insufficient history, a dip resolved in the warm-up, the decision-instant guard; Y = 0/1/2/5, equality, a one-minute reset, the opening gap, the closing print, weekends and holidays, DST, an early close, missing minutes and a reopening gap, a lower trough during and after confirmation, the peak before Y, r = 100 %; a rescanning reference on random paths; truncation (no look-ahead); the simulation: OFF creates nothing, the no-dip branch equals OFF, eligibility OFF (vetoed, never replayed) and ON (decided at the 09:32 release, filled at the next trade at the then-current price), expiry before confirmation, policy price conditions at a release, the trend filter together with the gate, every trend method × eligibility policy, a continuation trigger through the same gate |
| `src/growth-trading/tests/offParity-1.3.0.test.ts` | exact 1.3.0 parity with the gate OFF (7 real-data cases × 2 OFF forms) |
| `apps/strategy-lab/tests/drawdown-gate.test.ts` (8) | registry (defaults, applicability, notes, help), bounds, variation identity, the conditional search space, the unchanged 1.3.0 schema, the effective-value mapping; on real data: records, release decisions, the bundle, an exact replay, the OFF control's comparison, Interactive Preview identity and no saved run |
| `apps/strategy-lab/tests/growth-parity.test.ts` | runner byte parity with 1.3.0 (R-930001…004, replay and as 1.4.0 with the gate OFF) |
| `apps/strategy-lab/e2e/drawdown-gate.spec.ts` | the form (OFF by default, inputs only ON, notes, a bound), a run's Analysis/Parameters/Trades, the gate in the Interactive Preview panel |
