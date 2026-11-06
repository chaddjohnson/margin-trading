# Growth Drawdown Recovery Gate — implementation report (Growth 1.4.0)

**Task 15, 2026-11-06.** It implements the brief `docs/strategy-lab/brief/2026-11-06-growth-drawdown-recovery-gate-brief.md`
(sha256 `808dcdaf…`). The full specification is [GROWTH_DRAWDOWN_GATE.md](../../GROWTH_DRAWDOWN_GATE.md); this report is
the evidence that the implementation meets it.

> **No claim of profitability, robustness or safety.** The defaults are the brief's illustrative values (N 30, d 5 %,
> r 70 %, Y 2), not optimised. The real-data figures below are paired diagnostics on the **training partition only**
> (2016-01-04 → 2023-12-29, already explored). Holdout and final data were not read for any diagnostic. Study 9 was not
> run.

## 1. What was built

| Item | Value |
| --- | --- |
| Strategy | **Growth** (`rise-from-recent-low-trading`), user-facing name unchanged |
| Version | **1.4.0**. The deployed version was 1.3.0 (Task 14), not the brief's 1.2.0; 1.3.0 is now legacy |
| Switch | `drawdownRecoveryGateEnabled`, default **OFF** |
| Inputs | `dipLookbackSessions` N 30 (integer 1–500), `dipThresholdPercent` d 5 (0.1–90 %), `recoveryRetracementPercent` r 70 (0.1–100 %), `recoveryConfirmationSessions` Y 2 (integer 0–60) |
| Units | percentage points; sessions of the canonical data |
| Engine | `src/growth-trading/drawdownGate.ts` (new), `entryGates.ts`, `riseTrading.ts` |
| Strategy Lab | the registry group "Drawdown Recovery Gate (optional)" with schema-driven controls in New Test and Interactive Preview; runner records; exports; the Analysis section; a trade label |
| CLI | `npm run growth-paired -- --request … --off drawdown-gate`; `npm --prefix apps/strategy-lab run export-requests -- --out <dir> <request.json> …` |

**Architecture.** The gate is a stateful object on the run's minute data. The simulation feeds it observations
(opening trades, completed minute closes, closing prints) **in time order, interleaved with the decisions**. At one
instant the order is: a completed close, then the fresh crossing, then the live opportunity, then continuation, and
last an opening or reopening trade of that instant (it may be a decision's own fill).

The detector reads from N sessions before the run's first session, whatever other options load.

`EntryGates.check` asks the gate at every Growth-owned entry decision, after the trend filter and before the initial
stop's availability. A blocking → permissive transition ("release") may wake an armed opportunity for an intraday
decision. The gate never produces a decision of its own.

**States.**

```text
NORMAL ─dip ≥ d below an EARLIER high of the window─▶ RECOVERY_REQUIRED ─≥ R held Y sessions─▶ RECOVERY_CONFIRMED
   ▲                                                       ▲   (a lower trough / any observation < R) ◀─┘
   └──────────── a close ≥ the peak P: RESOLVED (fresh epoch; old prices never re-arm) ◀──────────────────┘
```

## 2. Chronology: the peak precedes the trough, and declines are cumulative

- **The rule.** Detection compares each completed close with the highest **earlier** close of the current session and
  the N sessions before it, before the new close joins the candidates.
- **Synthetic proof** (`src/growth-trading/tests/drawdownGate.test.ts`, d = 5 %):

  | Path | Result |
  | --- | --- |
  | $100 → $95 → $90 → $97 | one episode: detected at 95 (exactly 5 %, equality counts), trough 90, decline **10 %**, threshold **97** at r 70 % |
  | $90 → $95 → $100 → $97 | **no episode** (3 % below the later 100) |
  | $100 → $99.4 → $98.8 → $97.9 → $96.5 → $94.2, one close per session | detected at 94.2, **5.8 %** — no single large drop needed |
  | one minute with high 120, low 80, close 100 | nothing: intrabar highs and lows are never used |

- **Equivalence with a reference.** An independent rescanning reference implementation (no deque; New York minutes via
  `Intl`) gives **identical transitions**. It was run on 4 seeded random paths of 140 NYSE sessions (sparse minutes,
  opening gaps, missing closing prints) × 4 configurations.
- **Real data, VGT DD-2** (`bundles/B-defaults-eligibility1-gate.zip` → `drawdown-episodes.csv`, `drawdown-transitions.csv`):
  - peak 110.4099 (2016-04-04 10:10 ET);
  - first qualifying close 104.84 (2016-04-29 09:32 ET, −5.04 %);
  - the trough lowered in three per-session records to 103.17 (2016-05-06 09:31 ET);
  - deepest dip 6.56 %, threshold 103.17 + 7.2399 × 0.7 = **108.238**.
- **Cumulative, latched decline, VGT DD-23:** peak 466.13 (2021-12-28), detected 2022-01-05 at 442.67, trough 291.84
  (2022-10-13, −37.4 %), threshold 413.84.
  - It stayed active for 477 sessions although its peak left the 30-session discovery window in February 2022.
  - It was confirmed on 2023-11-03 and resolved on 2023-11-29 at 466.32.

## 3. Session-interval timing with actual intraday qualification

The convention:

- The streak's first completed minute at or above R is session index 0, at New York minute m₀.
- With Y ≥ 1, the gate is confirmed at the first completed minute (or closing print) of session Y at New York minute
  ≥ m₀, or later, if every observation in between stayed at or above R.
- Elapsed time is counted in the data's NYSE sessions, never in 24-hour UTC intervals or calendar days.

**Tested cases (synthetic NYSE dates):**

| Case | Result |
| --- | --- |
| Monday 11:15 ET start, Y = 1 | confirmed Tuesday at 11:15 (not 11:14) |
| Monday 11:15 ET start, Y = 2 | confirmed Wednesday at 11:15 |
| Y = 5 across Presidents' Day | confirmed on the fifth session after the start |
| Friday 11:15 EST → Monday 11:15 EDT (DST) | 3 days − 1 hour of UTC |
| An early close (13:00) without the 15:00 minute | confirmed at the next session's 09:31 |
| A missing 11:15 minute | confirmed at 11:21 |
| A one-minute dip | reset: the next streak needs a full Y |
| An opening gap below R | reset at 09:30, although the 09:31 close rebounded |
| A closing print below R | reset |
| A reopening after missing minutes below R | reset (`reopen_gap`) |
| A lower trough during or after confirmation | reset / lost |

**Real data, VGT DD-2, with the decision it released** (`bundles/B-…`, `entry-decisions.csv`):

| New York time | Event |
| --- | --- |
| 2016-05-24 15:25 | `recovery_started` at 108.244 (≥ 108.238) |
| 2016-05-24 15:28 | `confirmation_reset` (minute close 108.22 < 108.238): a one-minute reset |
| 2016-05-25 09:31 | `recovery_started` at 108.706 — session index 0, m₀ = 09:31 |
| 2016-05-25 16:00 | the Rise crossing (close 108.87) is **blocked** (`recovery_required`; `blocked_by` = drawdown); persistent eligibility arms `O-2` |
| 2016-05-27 09:31 | `recovery_confirmed` at the 09:30 minute's close 109.12 (session index 2, minute ≥ 09:31) → release |
| 2016-05-27 09:31 | `O-2` decided **intraday** at 109.12 (`via: drawdown_release`, age 2 sessions) |
| 2016-05-27 09:31 | filled at the **next trade**, the 09:31 minute's opening trade, 109.13 (`T-1`) — not at the session close, not at the signal price 108.87, not at the threshold |

VGT DD-23 shows the same clock with Y = 2: a streak from 2023-11-01 15:29 ET was confirmed on 2023-11-03 15:29 ET
(after a 15:28 reset on 11-01).

## 4. Original-peak resolution and non-redetection

- **Resolution at the peak.** VGT DD-2 was resolved on 2016-06-07 09:41 ET at 110.4406 ≥ 110.4099. A fresh epoch (3)
  started at that close.
  - The next episode, DD-3, peaked on 2016-06-08 15:15 ET (110.6432), **after** the resolution.
  - The old 110.41 → 103.17 dip, still inside the 30-session window, was never re-detected.
- **The peak regained before a confirmation.** DD-3 (trough 101.50, threshold 107.90) was never confirmed. It was
  resolved on 2016-07-12 09:37 ET at 110.6599, recorded as `resolvedBeforeConfirmation: true`, and the gate permitted
  at once (release cause `dip_resolved`).
- **Synthetic tests:**
  - "resolution at the peak; a fresh epoch: the old dip inside the window never re-arms, a new peak can";
  - "regaining the peak before Y elapsed resolves the episode … and permits at once";
  - "retracement 100 %: only regaining the peak permits".

## 5. OFF parity

| Evidence | Result |
| --- | --- |
| `src/growth-trading/tests/fixtures/baseline-1.3.0.json` | 7 real-data cases captured from the **unchanged** 1.3.0 code at `d13148a` (engineDirty ""), sha256 `344fb135…`: the breakout, the initial stop, retention, trend A/B/C/D/E, eligibility 1/2/4/5, all four continuation methods, 1d/60m/15m, Candidate A + the stop |
| `offParity-1.3.0.test.ts` | 1.4.0 with the gate absent, and with `drawdownGate: null`, reproduces every case **exactly**: signals, trades, excursions, drawdowns, daily marks, episodes, the decision log, minute marks, metrics, gate records, optional-rule records, the breakout scan |
| `offParity-1.2.0`, `-1.1.0`, `offParity` (1.0.0) | still exact on the 1.4.0 engine |
| `apps/strategy-lab/tests/fixtures/growth-runner-baseline-1.3.0` | 4 runner baselines (R-930001…004, one effective-values-only), `SHA256SUMS` `f2e0571e…` |
| `growth-parity.test.ts` | as 1.3.0 replays and as 1.4.0 with the gate OFF: `events.json`, `trades.json`, `daily.json`, `decisions.json` and the minute marks **byte for byte**; `metrics.json` = the stored one + `drawdownGate: {enabled: false}` only |
| Stored schemas | 1.3.0 `a2cca065…`, 1.2.0 `f43f8510…`, 1.1.0, 1.0.0 unchanged |

**Inactive metadata (not trading parity).** An OFF 1.4.0 run adds:

- `drawdownGate: {enabled: false}` and `engineVersion: 1.4.0` to `metrics.json`;
- one run-record assumption, "Drawdown Recovery Gate: OFF (identical to Growth 1.3.0)";
- the new engine file's hash in `provenance.json`.

With the gate OFF:

- `drawdownGate.ts` is not instantiated;
- the merge loop never takes its branch;
- the count records keep their 1.3.0 keys.

## 6. Signal vs gate vs opportunity vs execution

| Layer | Owner | In the records |
| --- | --- | --- |
| **Signal** | the unchanged Rise scanner (or the breakout) — the only generator | `entry_signal` / `rejected_signal` events once per raw crossing; `entry-decisions.csv` kind `crossing` |
| **Gate** | `DrawdownRecoveryGate` on minute observations (plus the trend filter, the initial stop) | `drawdown.*`, `blockedBy` on every gate result; `drawdown-transitions.csv` (incl. `entry_blocked_by_drawdown_gate` with the decision kind and the crossing/opportunity id) |
| **Opportunity** | persistent eligibility (policy, maximum age) — unchanged | `opportunities.csv`; state `blocked_by_drawdown_gate`; a release decision `via: drawdown_release` |
| **Execution** | the unchanged ShadowBook: the next eligible trade after the decision | `executed_entry` (minute precision; `meta.via`), `trades.json` `drawdownGate.decidedAtRelease` |

**With persistent eligibility OFF**, a blocked signal is `vetoed` and never replayed. In run A (VGT, defaults), 68 raw
crossings were vetoed and none was entered later: 0 release decisions. **With it ON** (run B, VGT), 67 crossings were
deferred and 15 were entered later at a release, each at the then-current price.

Each layer is tested on its own:

- the gate never signals (the synthetic eligibility-OFF test);
- a release without a live opportunity creates nothing;
- an opportunity that expires before the confirmation produces no trade;
- the extension cap at the release price defers the decision without invalidating;
- the decision fills at the next trade.

## 7. Paired diagnostics (training partition, identical data and costs; only the gate differs)

The CLI loads the same sessions for both runs: `npm run growth-paired -- --request requests/<name>.json --off
drawdown-gate --out paired/<name>`. Symbols VGT, GDX, XBI; 1d; 2016-01-04 → 2023-12-29; 5 bps; gate N 30, d 5 %, r
70 %, Y 2. Column notes:

- "Signals taken" are raw signals entered at their own decision. With eligibility ON, the release decisions add
  entries.
- "Marked" = realized plus the open position at the last close, in dollars on the $100,000 notional.

**A — Growth defaults (X 5 %, N 20, stop 7.3 %, hold 8 d, buffer 2.9 %), eligibility OFF:**

| Symbol | Signals taken OFF → ON | Closed W/L OFF → ON | Marked net OFF → ON (Δ) | Max minute DD OFF → ON | Sessions invested % |
| --- | --- | --- | --- | --- | --- |
| VGT | 52 → 24 | 13/38 → 3/20 | 9,718 → −5,838 (−15,555) | 73,618 → 31,939 | 73.1 → 27.6 |
| GDX | 85 → 4 | 22/63 → 1/3 | 9,942 → −12,476 (−22,418) | 82,665 → 13,089 | 51.7 → 1.3 |
| XBI | 79 → 3 | 19/59 → 0/3 | −45,016 → −13,875 (+31,141) | 94,982 → 15,515 | 49.8 → 1.0 |

**B — A + persistent eligibility (policy 1, W 10) on both sides:**

| Symbol | Signals taken OFF → ON | Closed W/L OFF → ON | Marked net OFF → ON (Δ) | Max minute DD OFF → ON | Sessions invested % | Release decisions |
| --- | --- | --- | --- | --- | --- | --- |
| VGT | 52 → 15 | 13/38 → 5/24 | 9,718 → 26,412 (+16,694) | 73,618 → 30,353 | 73.1 → 42.8 | 15 |
| GDX | 85 → 4 | 22/63 → 3/8 | 9,942 → −23,817 (−33,759) | 82,665 → 60,804 | 51.7 → 5.2 | 6 |
| XBI | 79 → 2 | 19/59 → 2/13 | −45,016 → −34,418 (+10,598) | 94,982 → 44,828 | 49.8 → 8.8 | 13 |

**C — Candidate A (X 8 %, N 60, stop 4 %, hold 15 d, trend C 50/40), training window only:**

| Symbol | Signals taken OFF → ON | Closed W/L OFF → ON | Marked net OFF → ON (Δ) | Max minute DD OFF → ON | Sessions invested % |
| --- | --- | --- | --- | --- | --- |
| VGT | 20 → 8 | 11/9 → 4/4 | 43,707 → 20,956 (−22,751) | 13,798 → 10,255 | 33.0 → 15.6 |
| GDX | 4 → 2 | 2/2 → 2/0 | −6,198 → 6,204 (+12,401) | 16,963 → 6,494 | 2.3 → 1.1 |
| XBI | 4 → 1 | 2/2 → 1/0 | 2,382 → 7,204 (+4,822) | 15,374 → 4,375 | 2.2 → 0.5 |

These are single retrospective histories:

- **Results by symbol.** The gate reduced exposure and drawdowns in every case. The net results went both ways (VGT −,
  GDX −, XBI + under the defaults).
- **Exposure.** At these settings, GDX and XBI spent most of 2016–2023 inside an unresolved dip (their peaks were not
  regained for years), so the gate kept them out of the market for most sessions. That is a property of the
  full-decline anchor, not a finding about returns.
- **No conclusion is drawn.** Path dependence makes per-trade attribution non-causal, and some trades counted here are
  very few. Anything beyond a description needs a frozen protocol, untouched data and more than one window.

## 8. Exported logs for independent analysis

All files below are in this directory: requests, paired outputs and the full research bundles of both sides. The
bundles are exported through the real Strategy Lab service and runner in a scratch state, at commit `2206a41` (clean:
`run.json` code revision `dirty: []`).

| File | sha256 (first 16) |
| --- | --- |
| `bundles/A-defaults-gate.zip` / `A-defaults-gate-OFF.zip` | `c20dbc879c7cde53` / `f928e23392199381` |
| `bundles/B-defaults-eligibility1-gate.zip` / `…-OFF.zip` | `f8649dc489207838` / `040f5435f613ee59` |
| `bundles/C-candidateA-gate.zip` / `…-OFF.zip` | `31d0edfa110ceeb7` / `c063eb6410dc0a33` |
| `paired/A-defaults-gate/paired-comparison.json` / `.md` | `8af0991ec21fe03f` / `cb3a1b352a96c97e` |
| `paired/B-defaults-eligibility1-gate/paired-comparison.json` / `.md` | `ec26ab3fc7a1b1b1` / `f0d05dbb548a89d3` |
| `paired/C-candidateA-gate/paired-comparison.json` / `.md` | `4e41ece181c46281` / `46dfd47e4f7fe50b` |

Inside each ON bundle:

- `drawdown-episodes.csv`: every episode with peak, detection, trough, threshold, confirmations, resets by cause and
  resolution;
- `drawdown-transitions.csv`: every causal transition and blocked decision, in time order;
- `entry-decisions.csv`: every entry decision with `blocked_by`, the gate state, its levels and `via`;
- `opportunities.csv` and `trades.csv`;
- `drawdown-gate.md` and `README.md`;
- the unmodified `artifacts/` (`decisions.json` `drawdownGate`, `events.json`, `trades.json`).

Each bundle verifies against its own manifest.

## 9. Verification

Run in the main checkout on the final code (commit `2206a41`; logs in `apps/strategy-lab/logs/task15/`, git-ignored):

| Check | Result |
| --- | --- |
| Growth engine suites (`node --test src/growth-trading/tests/*.test.ts`) | **237 / 237** pass (`drawdownGate.test.ts` 46, `offParity-1.3.0` 7 cases × 2 OFF forms, the 1.2.0/1.1.0/1.0.0 parity suites, every earlier Growth suite) — `growth-tests-3.log` |
| Strategy Lab `npm run check` (typecheck, lint, Vitest, build, Playwright) | typecheck and lint clean; Vitest **244 / 244** (27 files, incl. `drawdown-gate.test.ts` 8 and `growth-parity.test.ts` 30); build; Playwright **64 / 64** (incl. `drawdown-gate.spec.ts` 2) — `check-3.log`, 2026-11-06 15:23:57Z → 15:29:29Z |
| Root `tsc --noEmit` | clean — `root-tsc-2.log` |
| Root ESLint | 306 problems = the baseline before this task; the one error is the pre-existing `src/trailing-buy-variants/selection.ts`; none in a new or changed file — `root-eslint-2.log` |
| Root `npm test` | 1197 tests: 1186 pass, **7 fail**, 4 skipped. The 7 are, by name, the same pre-existing failures as before this task (Task 14's `root-test.log`: Study 7 / legacy golden-master and protected-file checks), unrelated — `root-test-2.log` |
| Real data | `data/VGT|GDX|XBI/data.csv` sha256 `2ee06310…` / `77dba9b2…` / `4a51bcbe…` = the pre-task values |
| Live Strategy Lab state | no file under `state/strategy-lab/` changed during the task (none newer than 13:53Z); tests use temporary state directories |

Disclosed test events:

- The first full check (before the review fixes) had **one failing e2e test**. `trading.spec.ts`'s guard against a
  post-loss "recovery" control matched the new gate's switch id. The guard was scoped to every control except the
  gate's documented switch, which the test now asserts explicitly.
- The second full check had **one known flaky failure**, `strategy-lab.spec.ts:308` (`data-view-from` read as null
  right after a symbol switch: a race in that existing test, seen before in Tasks 10 and 13). It passed in the rerun
  (`check-3.log`).
- Unit-test registry guard: the same `/retrace/` guard in `tests/trading.test.ts` was scoped the same way.

## 10. Independent review and the fixes it led to

A read-only review of the engine looked at causality, the state machine, the release path and OFF parity. It found
one bug, two risks and two nits; all five are fixed in `2206a41`, each with a regression test.

| Finding | Fix |
| --- | --- |
| **Bug (rare look-ahead).** On intraday bars whose last minute is missing, the next bar's reopening trade carries the decision instant. It was handed to the gate before the decision, although it can be the decision's own fill. | Opening and reopening trades are handed to the gate only after the decisions of their instant; `check()` allows exactly that pending trade. |
| **Risk (stale evidence).** Without a closing print, the last minute's close was re-observed at the scheduled close. | A close observation is emitted only when the data have a closing print. |
| **Risk (coupling).** The detector's history depended on other options' warm-up, so switching the trend filter could change the gate's state. | The detector starts N sessions before the run's first session. A test with 20 extra sessions loaded gives identical transitions. |
| **Nit.** `blockedBy` omitted an initial-stop block. | `blockedBy` includes `protection`. |
| **Nit.** A blocked continuation trigger's record named no episode. | It names its episode and method. |

**Effect on the evidence: none on any decision.** I re-ran every paired diagnostic and every bundle on `2206a41`.

- The paired outputs are **byte-identical**.
- In the bundles, `trades.csv`, `daily-marks.csv`, `entry-decisions.csv`, `opportunities.csv`, `drawdown-episodes.csv`,
  `decision-log.csv` and `drawdown-gate.md` are identical.
- `drawdown-transitions.csv` differs only in its `seq` column, the observation counter: sessions without a closing
  print now contribute no close observation. Every transition's time, event, price, state and values are unchanged.

The OFF-parity suites were re-run after the fixes and pass.

## 11. Conflicts with existing semantics, and remaining issues

1. **Version.** The brief assumed 1.2.0 was current. 1.3.0 had already shipped, so the gate is 1.4.0, and parity is
   proven against 1.3.0 (and, transitively, every earlier fixture).
2. **Continuation triggers blocked by the gate end their episode.** This is the established trend-veto rule, kept as
   the brief requires: no silent change. A blocked trigger is never retried later in the same window.
3. **Eligibility policies are bar-based.** A release decision between bar ends uses the last completed bar's predicate
   and re-checks only the price conditions of policies 2, 3 and 4, read-only. It never invalidates off-schedule; a
   failure defers to the next bar (documented, tested).
4. **Warm-up and initial state.** The gate loads N sessions of warm-up (the strict discovery window, as every Growth
   lookback) and starts with a fresh epoch N sessions before the run, whatever other options load.
   - An episode that began before that history is unknown, so the state can depend on the window start.
   - For VGT/GDX/XBI runs starting 2016-01-04 (the data start) this changes nothing.
   - While the window is incomplete the gate blocks, fail closed.
5. **Missing minutes** count on the session clock, but qualification needs an observed close, and the first trade after
   a gap is checked. Elapsed time across a halt is not treated as positive evidence of prices.
6. **No chart overlay.** It was optional. The episodes are in Analysis, the event details and the exports. The chart is
   unchanged.
7. **Live server.** It was not running during the task; after the next start it offers 1.4.0. No migration is needed.
8. **Not done, as instructed:** no optimisation, no Study 9, no merge into `main`, no market-data, Study 8 or historical
   result change.

## 12. Reproduce

Run everything from the repository root, with the git-ignored `data/` present:

```sh
# the synthetic gate tests and the OFF parity with 1.3.0 (and every earlier Growth fixture)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-timeout=600000 'src/growth-trading/tests/*.test.ts'
# Strategy Lab: typecheck, lint, Vitest (incl. drawdown-gate and growth-parity), build, Playwright
npm --prefix apps/strategy-lab run check
# the paired ON/OFF diagnostics of §7 (two runs per symbol on identical sessions; writes JSON + Markdown)
D=docs/strategy-lab/reports/2026-11-06-drawdown-recovery-gate
for n in A-defaults-gate B-defaults-eligibility1-gate C-candidateA-gate; do
  npm run growth-paired -- --request $D/requests/$n.json --off drawdown-gate --out $D/paired/$n
done
# the research bundles of §8 (a NEW scratch state; never the live one)
npm --prefix apps/strategy-lab run export-requests -- --out $D/bundles $D/requests/*.json
```

**A manual test in the browser:**

1. Start Strategy Lab (`npm --prefix apps/strategy-lab start`, or the user's `start:vpn` service, after a restart).
2. **+ New test → Growth (v1.4.0)** → switch **Drawdown Recovery Gate** ON and keep N 30, d 5, r 70, Y 2. Optionally
   switch **Persistent entry eligibility** ON (policy 1).
3. Choose VGT and 2016-01-04 → 2023-12-29 (the training partition), then **Run Test**.
4. Open the run's **Analysis → Drawdown Recovery Gate**, **Trades** (an entry *at the drawdown-gate release*) and
   **Export research bundle**.

**Interactive Preview:** open a run and click **Interactive Preview**. The gate's switch and inputs are in the panel;
**Run preview** executes one configuration without saving. To build the paired control, clone the run with only the
gate OFF, run it, and use **Compare**.
