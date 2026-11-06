# Growth entry gates: the entry trend filter and persistent entry eligibility (Growth 1.2.0)

**Growth** (`rise-from-recent-low-trading`) version **1.2.0** adds two optional, independent switches to the entry side,
both **OFF by default**:

- **Entry trend filter** — blocks a new Growth entry when the selected recent-price trend condition is not satisfied
  (five methods, A–E).
- **Persistent entry eligibility** — keeps a qualifying Growth signal available for a bounded number of trading sessions,
  so that it can still be entered later, at the then-current price, while its policy stays satisfied (five policies, 1–5).

With both OFF, Growth 1.2.0 is **identical to Growth 1.1.0**: every signal, decision, fill, exit, continuation episode,
decision-log entry, daily and minute mark and metric (see §9). Exits are never filtered. Nothing here was optimised: the
defaults are illustrative, and a trend rule is **not** evidence of safer or better trading.

- **Code:** `src/growth-trading/entryGates.ts` (methods, policies, opportunities, the renewal watch) and
  `src/growth-trading/riseTrading.ts` (the minute loop that drives them). Continuation triggers are gated through hooks
  in `src/growth-trading/continuation.ts`.
- **Parameters:** `apps/strategy-lab/shared/strategies.ts` (Growth 1.2.0, groups *Entry trend filter* and *Persistent
  entry eligibility*); the mapping to the engine is `apps/strategy-lab/runner/growth-params.ts`.
- **Base strategy, exits, accounting:** [GROWTH_TRADING.md](GROWTH_TRADING.md); continuation:
  [GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md).
- **Brief:** `brief/2026-11-05-growth-trend-filter-eligibility-brief.md`.

## 1. Words used here

| Term | Meaning |
| --- | --- |
| **Signal** (raw crossing) | The unchanged Rise-from-Recent-Low event: a completed bar closes at or above X% over the rolling N-bar low after a bar below it. Recorded exactly once. |
| **Decision** | The instant an entry is judged: the end of a completed bar (its close is first knowable). |
| **Filtered / vetoed** | A decision the trend filter blocked. Recorded with its observed values, never traded. |
| **Armed opportunity** | A signal kept available by persistent eligibility. Not an order, no capital reserved, a stable id (`O-1`, `O-2` …). |
| **Entry** | An actual order, filled at the next eligible trade after the decision (the next minute's open; for a daily decision the next session's opening trade). |

A **signal**, its **decision** and its **fill** are three distinct instants: a decision never uses its own fill, and a
later (latched) entry never fills at the original signal or threshold price.

## 2. The entry trend filter

### 2.1 Sampling: trading sessions, not bars

Every lookback counts **trading sessions of the data** (NYSE sessions present in the canonical file), whatever the bar
resolution of the run. For a decision at time *t* in session *s*:

- **P₀** = the decision price: the close of the completed decision bar — the latest observation;
- **Pₖ** (k ≥ 1) = the regular-session close of session *s − k* (the closing print, or the last regular trade);
- **H₀ / L₀** = the high / low of session *s* over the minutes completed by *t* (for a decision at the close: the
  whole session, closing print included); **Hₖ / Lₖ** = the high / low of session *s − k*.

The current session is never duplicated and never read past *t*; holidays are simply not sessions (a 1-session lookback
on 2019-07-05 reads the 13:00 early close of 2019-07-03). **Not enough history** (a window reaching before the loaded
data) is `insufficient_history`, and a non-positive or non-finite price is `invalid_data`: both **block** (fail
closed, never an implicit approval). When the filter is ON, the runner loads as many extra sessions of warm-up as the
method needs (OFF loads exactly the 1.1.0 warm-up).

Comparisons "price ≥ threshold" absorb binary rounding only (relative 1e-12, as the Rise scanner): an exact equality
passes.

### 2.2 The five methods

| Method | Allows when | Parameters (default; bounds) | Sessions read |
| --- | --- | --- | --- |
| **A — N-session price change** `price_change` | P₀ ≥ P_N × (1 + m) | N 20 (1–500); m 0% (−50–50) | N |
| **B — Regression trend slope** `regression_slope` | OLS of ln P against the session index over P_N … P₀ (N + 1 points); slope b per session; (e^{bN} − 1) × 100 ≥ minimum | N 20 (2–500); minimum 0% (−50–50) | N |
| **C — Rising moving average** `rising_sma` | P₀ > SMA_now **and** SMA_now > SMA_then (both strict); SMA_now = mean(P₀ … P_{N−1}), SMA_then = mean(P_K … P_{K+N−1}) | N 50 (2–500); K 5 (1–250) | K + N − 1 |
| **D — Higher highs and higher lows** `higher_highs_lows` | the N observations k = 0 … N−1 split into a newer and an older half of ⌊N/2⌋ (odd N: the middle one belongs to neither); max H(newer) > max H(older) × (1 + m) **and** min L(newer) > min L(older) × (1 + m) | N 20 (2–500); m 0% (0–20) | N − 1 |
| **E — Short-/long-term momentum** `momentum` | P₀ ≥ P_S × (1 + mS) **and** P₀ ≥ P_L × (1 + mL); 0 < S < L | S 5 (1–250); L 60 (2–500); mS 0%, mL 0% (−50–50) | L |

Notes on each method:

- **A** is deliberately a simple endpoint comparison: it ignores the path between the two closes.
- **B** fits a line through every sampled price, so a peaked reversal whose endpoints still rise can have a negative
  fitted slope. The logs are centred on ln P_N, so a perfectly flat series has a slope of exactly 0: it passes a 0%
  minimum and fails any positive one. The log also records R².
- **C**'s "earlier" average is the average as it stood at the close K sessions before, so both averages are causal.
- **D** is a **two-window structural proxy**, not a swing-pivot algorithm. The newer half contains the current session
  only up to the decision.
- **E** is meant to recognise a strengthening recovery without ignoring the longer context: a negative long minimum
  (for example −5%) tolerates a longer-term decline while the short return is positive.

### 2.3 Where it applies

(Growth 1.4.0 adds a third entry-side filter, the **Drawdown Recovery Gate**, applied at the same decisions after the
trend filter; with both ON both must allow, and each block is logged — [GROWTH_DRAWDOWN_GATE.md](GROWTH_DRAWDOWN_GATE.md).
With eligibility ON, an opportunity it blocked may also be decided at the gate's release minute, §7.1 there.)


The filter is checked at **every Growth-owned entry decision**: the base crossing, a later decision of a latched
opportunity, a renewal signal, and a **continuation trigger** of any method. Decisions of other strategies are never
filtered, and neither are exits.

- **Eligibility OFF:** a blocked crossing is a `vetoed` signal (`rejected_signal`, reason `trend_veto`, with the
  observed values). It is **not replayed later**: no entry is manufactured when the trend turns favourable.
- **Eligibility ON:** the crossing arms its opportunity, which keeps waiting (`blocked_by_trend`). See §3.
- **Continuation:** a blocked trigger is recorded (`continuation_signal`, disposition `vetoed`) and **ends that
  episode** (`trend_veto`). Otherwise a condition that stays true — a breakout above the high, an armed D1 setup —
  would re-trigger on every later bar. A Classic D1 setup is cancelled in the D1 machine.
- **Orders:** a decision that passed placed its order; the order fills at the next eligible trade even if the trend
  turns in between. These are the existing order semantics, which are preserved.

## 3. Persistent entry eligibility

### 3.1 Lifecycle

```text
raw crossing, flat, no order ──▶ ARMED (O-k: signal time/price, fixed recent low, threshold, source)
                                    │  evaluated now, then at every completed bar of the run resolution while flat:
                                    │  1. expiry  2. policy validity  3. capital (harness)  4. trend filter  5. decision
     ┌──────────────────────────────┼──────────────────────────────┬────────────────────────────┐
     ▼                              ▼                              ▼                            ▼
 invalidated (policy fails)   blocked_by_trend / _capital      ordered ──fill──▶ consumed   expired (after the
 terminal; policy 5 may        (stays armed, counted,           (next eligible trade,       close of origin + W)
 open a renewal watch          logged on change only)           then-current price)         policy 5 may open a watch
```

- **Arming.** Only a raw crossing met while **flat with no order pending** arms an opportunity (or, under policy 5, a
  renewal signal). A signal while invested or with an order pending stays ignored, exactly as before, and arms nothing.
- **Maximum age W** (every policy; default 10, bounds 1–120 trading sessions). The signal's session is **day 0**.
  Decisions are allowed through session **origin + W inclusive**, and the opportunity expires after that session's
  close. There is no unbounded "eligible forever" option.
- **Evaluation.** At the arming decision, then at each completed bar of the run resolution (1d: each session close)
  while flat with no order. Only **state changes** are logged (armed, blocked with its reason and values, decision,
  invalidated, expired, superseded, consumed); repeated blocked evaluations are counted on the opportunity, not logged
  bar by bar.
- **A block never consumes.** When the gate later passes and the policy still holds, a new decision is taken. Its order
  fills at the next eligible trade, at the then-current price.
- **Consumed** at its own fill. A normal Growth exit never reopens a consumed opportunity: re-entry needs a new genuine
  crossing (or an enabled continuation entry).
- **Capital.** Standalone Growth always has its own capital. A harness-only hook (`GateRuntime.capacity`, used by the
  tests, not by Strategy Lab) stands in for a future shared-capital allocator: `blocked_by_capital` until released. An
  allocator's exit only frees capital; it never fabricates a Growth signal.
- **Without a trend filter** (and with standalone capital) nothing blocks, so every opportunity is taken at once:
  eligibility ON = OFF, trade for trade (tested).

### 3.2 The five policies

| Policy | Valid while (checked from the arming bar on) | Parameters (default; bounds) |
| --- | --- | --- |
| **1 — Time-limited opportunity** `time_limited` | each completed bar satisfies the original Rise predicate: close ≥ rolling N-bar low × (1 + X) | W 10 |
| **2 — Minimum trend strength** `minimum_strength` | close ≥ the recent low **fixed at the signal** × (1 + a) — no rolling-low drift | W 10; a 3% (0–100) |
| **3 — Maximum price extension** `maximum_extension` | the predicate **and** decision price ≤ the original signal price × (1 + e); beyond the cap: **invalidated** (no late chasing, no reactivation) | W 10; e 3% (0.1–50) |
| **4 — Trend-deterioration invalidation** `deterioration` | the predicate **and** close > the highest completed-bar close since arming × (1 − d); a recovery does not revive it | W 10; d 3% (0.1–50) |
| **5 — Reset and renew after a fresh recovery** `reset_renew` | as 1; plus the renewal watch (§3.3) | W 10; D 3%, R 2% (0.1–50) |

Policy 2 replaces the rolling predicate with a fixed reference, so a rolling lookback that shifts cannot silently change
its meaning. A minimum above the crossing's own advance invalidates that crossing at once; the outcome is `vetoed`,
reason `policy_invalidated`.

### 3.3 Policy 5: the renewal watch

After an **unconsumed** opportunity expires or is invalidated, policy 5 opens **one** renewal watch (`RW-k`). The watch
is bounded by W sessions after that end and lapses without renewal otherwise:

1. **Reset:** a later completed-bar close **≤ ref × (1 − D)**, where ref is the ended opportunity's signal price.
2. **Rebound:** the trough is the lowest close since the reset (the candidate bar excluded). The **first** later bar
   closing **≥ trough × (1 + R)** ends the watch.
3. If the original predicate holds on that bar, it is a **renewal signal** (source `eligibility_renewal`). That signal
   arms its own new W-bounded opportunity with lineage (`renewedFrom`), evaluated at once (trend filter, capital, the
   same policy). If the predicate does not hold, the watch ends without renewal (`predicate_false_at_rebound`): each
   reset/rebound episode is used at most once.

Precedence and limits:

- A genuine raw crossing takes precedence: it ends the watch (`superseded_by_crossing`) and arms its own opportunity,
  so there is no duplicate order.
- Any entry ends the watch (`entry_taken`).
- A consumed opportunity never opens a watch. A price that merely stays above an old threshold never renews.

For a renewal to differ from a crossing, the price must fall D% below the old signal price while still X% above the
rolling low. That needs a signal well above its threshold (a gap) or a deep rolling low. Renewals are therefore rare,
and policy 5 is otherwise identical to policy 1. The synthetic regression test shows the difference on one path: policy
5 renews and trades, policy 1 expires and does not.

### 3.4 Priority and clashes (one deterministic order)

1. At one instant: **fresh crossing → live opportunity → continuation trigger**.
2. Every taken entry closes an open continuation episode (base priority, as in 1.1.0). A continuation trigger due at the
   same instant is recorded as `suppressed` (`base_priority`).
3. One live opportunity per symbol. A new crossing while one is live (possible only under policy 2) supersedes it
   (`superseded_by_new_crossing`).
4. A continuation entry taken while an opportunity waits supersedes it (`superseded: an entry was taken by a
   continuation entry`). Raw signals are never dropped silently: each has its record.
5. A same-session re-entry after an exit stays allowed: these are the existing Growth semantics, unchanged.

## 4. Records and exports

- **Events** (`events.json`). The raw crossing appears once: `SYM:entry_signal:<t>` if taken at once, otherwise
  `SYM:rejected_signal:<t>` with `meta.disposition` `ignored` | `vetoed` | `deferred`, `meta.opportunity`,
  `meta.entryGate` and the trend/policy values (`trend.*`, `policy.*`). A later decision of an opportunity is
  `SYM:latched:<t>` and a renewal signal `SYM:renewal:<t>`. Executed entries carry `entrySource`, `opportunity`, the
  signal time/price and the ages at decision and at fill.
- **decisions.json** (per symbol, only with a gate ON):
  - `opportunities`: signal, bound, evaluations, blocked counts, transitions, decision, end, trade, fill and final net;
  - `renewalWatches`;
  - `entryDecisions`: one record per Growth entry decision — crossing, latched, renewal, continuation — with the gate
    result, trend values, policy values, opportunity, trade, fill and the final **realised or open unrealised net**.
  - The log adds `opportunity_*` and `renewal_*` events.
- **trades.json**: `entrySource`, `opportunity`, `opportunitySignalTimeUtc`, `opportunitySignalPrice`,
  `ageSessionsAtDecision`, `ageSessionsAtFill`.
- **metrics.json**: run-level `trendFilter` and `eligibility` (`{enabled: false}` when OFF). Per symbol (only when ON):
  `signals.vetoed`/`vetoedByReason`/`deferred` and `entryGates` — trend evaluations and blocks by decision kind;
  opportunities ended by state and invalidated by reason; taken at arming vs later; age at decision (mean, median, max,
  histogram); renewal watches; trades **by entry source**. All descriptive: path dependence makes per-trade
  attribution non-causal.
- **Research bundle** ([EXPORTS.md](EXPORTS.md)): `entry-decisions.csv`, `opportunities.csv` and `entry-gates.md` are
  added, and `trades.csv` gains `entry_source`, `opportunity` and `age_sessions_at_decision`.

## 5. Worked examples

All examples are illustrative records, not profitability claims; the real-data ones are from the training partition
(already explored).

1. **Blocked by the trend, admitted when it clears (synthetic, `entryGates.test.ts`).** Closes … 110, 100, 96, then a
   crossing at 101.5 (≥ 96 × 1.05 = 100.8). Trend A with N = 3 compares it with the close three sessions back, 110:
   blocked. With eligibility OFF the signal is vetoed and nothing happens later. With policy 1 the opportunity waits.
   The next close, 102, is ≥ 100 (three sessions back), so it passes: decided at that close and **filled at the next
   session's open, 103** — not at 101.5 or 100.8.
2. **Real data, VGT, trend A (N 20) + policy 1.** The crossing of 2016-02-16 closed at 97.66. It was vetoed: −0.45%
   against the close of 2016-01-15 (98.10). It armed `O-1` (fixed low 92.95), passed at the close of 2016-02-17
   (100.06), and filled on 2016-02-18 at 100.43 (`latched:rise_from_recent_low`, net −$784.91).
3. **Expiry boundary (synthetic).** W = 3 with the slot occupied through day 3: a decision at the close of day 3 is
   allowed (age 3). The same path occupied through day 4 expires after the close of day 3, with 4 blocked evaluations.
4. **Policy 3 on real data (GDX).** Signal 2016-09-02 at 27.37, cap 28.19 (+3%). The close of 2016-09-06, 28.66
   (+4.71%), invalidated it (`extension_exceeded`) while the predicate still held.
5. **Policy 4 on real data (GDX).** Signal 2016-10-18 at 24.17. The highest close since arming was 24.87; the close of
   2016-10-24, 24.09, was ≤ 24.87 × 0.97 = 24.12: deteriorated, while the predicate still held.
6. **Policy 5 renewal on real data (GDX, trend E).** `O-85` ended unconsumed (signal price 23.58). The close of
   2022-10-14, 22.73, was ≤ 23.58 × 0.97 (the reset); the trough was 22.73, so the rebound threshold was 22.73 × 1.02 =
   23.18. The close of 2022-10-17, 23.45, was a renewal with the predicate true: `O-86`, renewed from `O-85`. It then
   stayed blocked by the trend filter and expired.
7. **Methods on the same VGT crossings.** 2016-05-25 (close 108.87) passes all five:
   - A: +1.94% over 20 sessions;
   - B: fitted +1.98%;
   - C: SMA 107.23 > 107.06;
   - D: 109.20 > 107.44 and 103.85 > 103.17;
   - E: +3.56% and +4.68%.

   2016-06-30 (107.09) fails C (the SMA is falling) and E (−2.15% short, −2.49% long).

## 6. Running manual tests and downloading the research logs

1. **New test** → choose **Growth** in the strategy select → switch **Entry trend filter** and/or **Persistent entry
   eligibility** ON. Pick the method and policy; only their inputs are shown. Run Test runs exactly ONE configuration.
2. The run's **Trades** list labels each trade (`base Growth · latched O-3`, `base Growth · renewal`, `continuation ·
   …`). **Analysis** has the *Entry gates* section. Each event's detail shows the observed values.
3. **Export research bundle** (or `npm --prefix apps/strategy-lab run export -- R-xxxxxx`) downloads the ZIP with
   `entry-decisions.csv`, `opportunities.csv` and `entry-gates.md`. These are enough for an independent review without
   the SQLite database.
4. The paired control is **Clone into new test…** with the switch OFF (nothing else changed), then **Compare**. From
   the CLI, `npm run growth-paired -- --request <run dir>/request.json --out <dir>` runs ON and both-OFF on identical
   data and costs and writes `paired-comparison.json`/`.md`. It is a retrospective diagnostic only: two runs, no grid,
   no selection.

## 7. For a future CLI optimiser

The registry exposes both switches (`[false, true]`), the method and policy enums and every input with its bounds and a
`search` domain. The `activeWhen` chains make the search space hierarchical: a method's inputs apply only under that
method, and only with the filter ON. The OFF branch is a valid candidate, `sampleCandidate` draws only effective values,
and unused inputs never enter a variation identity (no fake sensitivity). Strategy Lab never searches; an optimisation
is a CLI study with a frozen protocol whose selected phenotypes are imported ([PHENOTYPES.md](PHENOTYPES.md); a 1.2.0
demonstration export with gates ON: `apps/strategy-lab/fixtures/phenotypes/growth-gates-demo-2026-11`).

## 8. Pitfalls

- A trend filter only removes or delays entries. Fewer entries can mean missed rises as well as avoided losses; judge it
  only against the paired OFF run, over more than one symbol and window, and never on dates you will later test.
- Policy 1 on intraday bars: the rolling predicate flips often, so opportunities are invalidated quickly. Policy 2
  avoids the drift but needs a sensible fixed reference minimum.
- Method B with a 0% minimum admits flat series; method C with a short K reacts to noise; method D with a short N
  compares very few highs and lows.
- A window starting at the first data session gives early decisions `insufficient_history` (blocked) until enough
  sessions exist.
- With the filter ON, extra warm-up sessions are loaded. Prices are split-adjusted forward to the first loaded session,
  so a split inside the extra warm-up rescales all prices consistently; percentages and dollar P&L on the fixed
  notional are unaffected up to rounding.
- Without a trend filter, eligibility changes nothing in a standalone run: it needs a blocker.

## 9. Versions, OFF parity and old runs

- `rise-from-recent-low-trading@1.2.0` is the version New Test offers.
- **1.1.0** is legacy (`launch: phenotype`). Its runs keep their facts; its catalogue phenotypes rerun **as 1.1.0
  configurations** on the 1.2.0 engine with both gates OFF (metrics record `legacyReplay`). A clone starts a 1.2.0
  test with both gates OFF.
- **1.0.0** is legacy (`launch: none`). It replays as 1.2.0 with continuation and both gates OFF.
- Proof:
  - `src/growth-trading/tests/offParity-1.1.0.test.ts`: 7 real-data cases captured from 1.1.0 at `0301c01`, before
    the change, each with continuation OFF and every method ON; identical in full.
  - `offParity.test.ts`: the six 1.0.0 cases.
  - `apps/strategy-lab/tests/growth-parity.test.ts`: the runner artifacts of three 1.1.0 runs reproduced byte for byte,
    both by replaying the 1.1.0 requests and as 1.2.0 requests with both gates OFF.
  - `scripts/replay-run.ts` uses mode `legacy-1.1.0` for 1.1.0 runs.
- No database migration was needed: strategy rows are created per version on first use, and stored runs and
  variations are not touched.
