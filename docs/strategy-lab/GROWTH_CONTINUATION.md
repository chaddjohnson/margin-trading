# Growth continuation entries (Growth 1.1.0)

**Growth** (`rise-from-recent-low-trading`, display name since 2026-11-04) can add ONE optional kind of entry next to
its unchanged base entry: a **continuation entry** after a realised net-profitable exit. It is **OFF by default**, and
OFF reproduces the version without it exactly. There are four selectable, independently implemented methods.

- **Code:** `src/growth-trading/continuation.ts` (the methods, episodes, decision log) and
  `src/growth-trading/riseTrading.ts` (the minute loop that drives them).
- **Parameters:** `apps/strategy-lab/shared/strategies.ts` (Growth 1.1.0, group *Continuation entries*).
- **Base strategy, exits, accounting:** [GROWTH_TRADING.md](GROWTH_TRADING.md). D1 mapping: [GROWTH_TRADING_AUDIT.md](GROWTH_TRADING_AUDIT.md).
- **Brief:** `brief/2026-11-04-growth-continuation-phenotypes-brief.md`.
- **Not a recommendation.** The defaults are illustrative and were not optimised for Growth; nothing here was selected
  by a search.
- **Since Growth 1.2.0** the continuation triggers are also checked by the optional entry trend filter. A blocked
  trigger is recorded (`vetoed`) and ends its episode (`trend_veto`). A taken continuation entry supersedes a waiting
  persistent-eligibility opportunity. A latched base decision has base priority at one instant, like any base entry
  ([GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md) §2.3, §3.4). With both gates OFF, continuation is exactly the 1.1.0
  behaviour.

## 1. What stays the same

- The base entry is the unchanged Rise-from-Recent-Low signal (X% over the N-bar low, edge-triggered), at the same bars
  and with the same warm-up.
- Exits are unchanged: the profit-conditional trailing stop, the optional maximum losing hold, the optional buffered
  intraday loss (which still requires the hold), with the same costs, interest and fill chronology.
- One position at a time: all-in or flat, $100,000 fixed notional, no pyramiding. Several symbols are independent
  standalone backtests.

## 2. Lifecycle common to every method

```text
             exit with net > 0 (after costs and interest)
   FLAT ──────────────────────────────────────────────▶ EPISODE OPEN (watching), anchored at exit session s0
                                                           │  eligible sessions s0+1 … s0+W
      ┌────────────────────────────────────────────────────┤
      │ base Growth decision taken (base priority)          │ method arms (classic_d1, shallow_pullback)
      ▼                                                     ▼
   closed: base_entry   ◀── base decision ─────────── ARMED ── trigger ──▶ ORDER (next eligible trade) ──▶ FILLED
      ▲                     (classic: setup cancelled)   │                       │
      │                                                  │ shallow: deeper than pmax → closed: pullback_too_deep
      │ after the close of s0+W, not triggered           │ (classic_d1: the armed setup persists past W, as in D1)
   closed: window_expired                                └── end of data → closed: end_of_data ("armed at end")
```

- **Qualifying exit.** A closed trade whose book net is **strictly greater than zero after both per-side costs and the
  margin interest** (`ShadowBook.close`). A losing or exactly-breakeven exit never opens a window. A continuation trade
  that exits profitably opens a new window too.
- **Window.** Anchored at the exit session s0. Eligible sessions are **s0+1 through s0+W inclusive**, in trading
  sessions of the dataset (NYSE sessions); the window expires after the close of session s0+W. The exit session itself
  is never eligible (as in D1).
- **Only while flat.** An episode exists only while the book is flat with no order pending: **every taken entry
  decision closes it.** So a continuation signal can never meet an open position or a pending order, windows never
  overlap, and there is at most one episode per symbol.
- **Base priority.** At one instant, a base Growth decision is judged first. If it is taken, the open episode closes
  (`base_entry`) and an armed setup is cancelled. A continuation step due at the same instant is assessed read-only:
  if it would have **triggered**, it is recorded as a suppressed signal (`base_priority`, a `rejected_signal` event); a
  would-be arming is noted on the episode only (arming is not an entry).
- **Decisions and fills.** Decisions are made at the end of a completed bar (its close is first knowable). The order
  fills at the **first eligible trade after the decision** (`firstTradeAfterDecision`): the next minute's open; the
  closing print only for a decision made before the close; otherwise the next session's opening trade (carried
  overnight). No uncompleted bar, future high/low or hindsight state is read.
- **Edge triggering.** Each method fires at most once per episode, so a condition that stays true never re-buys.
- **No restrictions.** No post-loss lower-price rule, recovery reset or forced cooldown exists (the tests scan for
  them).

## 3. The four methods

| Method | Bars | Inputs (default) | Arms | Triggers | Ends without a trade |
| --- | --- | --- | --- | --- | --- |
| `classic_d1` | completed **1-minute** bars at every resolution (D1-native) | W 60, P 9%, Y 0.3% (D1 shipped) | a minute close ≤ H × (1 − P) | a minute close ≥ trailingLow × (1 + Y) | window expiry (not armed); a base entry; end of data |
| `breakout` | completed bars of the run resolution | W 60, b 1%, F 1 bar | — | after ≥ F formation bars, a close **>** H × (1 + b) | expiry; a base entry |
| `shallow_pullback` | completed bars of the run resolution | W 60, SMA L 50, slope M 10, r 0%, pmin 2%, pmax 8%, R 1% | uptrend AND pmin ≤ 1 − close/H ≤ pmax | uptrend AND close ≥ trough × (1 + R) | deeper than pmax (`pullback_too_deep`); expiry (armed or not); a base entry |
| `ma_cross` | completed bars of the run resolution | W 60, SMA L 20, rising M 5, s 0%, m 0% | — | prev close ≤ SMA(prev), close **>** SMA × (1 + m), SMA > SMA(M earlier) × (1 + s) | expiry; a base entry |

H is the **post-exit reference high**: the raw exit fill price, raised by later prices as each method states. The
exit session's own prices after the exit are not used (as in D1, whose window starts the next session).

### 3.1 Classic D1 — pullback + trailing rebound

D1's own continuation machine (`EntryMachine` of `src/shared-margin-portfolio/strategy.ts`, unchanged), inside the
same `ShadowBook` that executes Growth, called in D1's per-minute order (after that minute's exit and fill):

- H starts at the raw exit fill and, after each later session in the window, rises to that session's high (never
  within the session, so a minute never sees its own session's high).
- A completed minute that closes **at or below H × (1 − P)** arms a trailing buy. **Arming closes the window**; the
  arming minute never buys.
- The armed setup trails the lowest minute low; when a minute closes **at or above trailingLow × (1 + Y)** the decision
  is taken at that minute's end and fills at the next eligible trade.
- As in D1, the armed setup **persists** (also past s0+W, also overnight) until it fires.
- **Growth adaptation (the only change of rule).** D1's competing entry is its deep-dip arming; Growth's is the
  Rise-from-Recent-Low signal, which is a direct entry decision, not an arming. So a **taken base Growth decision**
  plays D1's "competing ordinary arming": it closes the window and, if a continuation setup is armed, **cancels** it
  (D1 never sees a competing entry while armed). D1's deep-dip arming itself is disabled (its target is NaN).

*Example (synthetic, `tests/continuation.test.ts`).* Exit at 114 (stop) with net +$13,970 → window opens. Next
session: minutes close 112, 110, **108** (≤ 114 × 0.95 = 108.3 → armed, trailing low 108, trigger 108.54), **108.6**
(≥ 108.54 → decision at that minute's end) → filled at the next minute's open, 108.6.

### 3.2 Breakout above the post-exit high

A genuine renewed-high breakout, not a rebound inside a decline:

- H starts at the raw exit fill. Each completed eligible bar is evaluated **first**, then its high raises H — so a
  candidate never sees its own high (no self-referential threshold).
- **Formation:** at least F completed eligible bars (default 1) must have formed H before any bar can trigger. With
  daily bars the first eligible session is therefore formation only.
- **Trigger:** a completed bar whose **close is strictly above H × (1 + b)**. Equality does not trigger. Because H is the
  maximum of the exit price and every high since, the close exceeds every post-exit high by b.
- **Gaps:** a bar that opens above the threshold is not bought at the open; only its completed close counts, and the
  fill is the next trade after the bar's end.

*Example.* Exit at 114; next session flat at 113 (formation: H stays 114); the session after closes at 116 > 114 × 1.01
= 115.14 → decision at that close → filled at the next session's opening trade. A spike to 130 on the formation bar
would raise H to 130, and a later close of 116 would not trigger.

### 3.3 Shallow pullback + recovery in an uptrend

Distinct from Classic D1: bounded shallow depth, a necessary trend filter, closes not lows, window-bounded.

- **Uptrend:** SMA of the last L completed closes (the candidate included) is above its value M bars earlier ×
  (1 + r). It is required **at arming and at the trigger** (without it the method never arms — tested on a falling
  history).
- **Watching:** H starts at the exit fill and rises with each completed eligible bar's high. A close whose pullback
  1 − close/H lies in **[pmin, pmax]** in an uptrend arms the setup; H **freezes** at arming.
- **Invalidation:** a close deeper than pmax below H (while watching or armed) ends the episode (`pullback_too_deep`):
  the pullback is not shallow, and the episode does not re-arm on the way back up.
- **Armed:** the trough is the lowest close since arming (the candidate excluded); a close **at or above trough ×
  (1 + R)** in an uptrend triggers. An armed setup **expires with the window**.

*Example.* After a rising history, exit at 114; closes 112 (1.75%: too shallow), **111** (2.63%, SMA10 rising → armed,
trough 111), 110 (trough 110), **111.2** (≥ 110 × 1.01 = 111.1, still rising → trigger) → filled next session.

### 3.4 Cross above a rising moving average

- SMA of the last L completed closes of the run resolution (the candidate included; L bars of warm-up are needed).
- **Cross from below:** the previous bar closed **at or below** its own SMA, and this bar closes **strictly above**
  SMA × (1 + m).
- **Rising:** SMA now above its value M bars earlier × (1 + s).
- One trigger per episode: a price that stays above its average never re-triggers.

*Example (L 2, M 1).* After the exit: closes 110, **109** (at or below its SMA), **112** (above SMA 110.5, SMA rising
because 112 > 110) → trigger. A close of 109.5 instead crosses but the SMA falls (109.5 < 110): no trigger.

### 3.5 Resolutions

All four methods run at every resolution of the form (1d, 60m, 30m, 15m, 5m, 1m), causally:

- `classic_d1` always reads completed 1-minute bars and session highs (D1's definition); the run resolution applies to
  the base scanner.
- The other three read completed bars of the run resolution (the same bars as the base scanner); their lookbacks are
  in those bars. An ON run extends the warm-up for the moving averages (the scanner's warm-up when OFF, unchanged).
- The window is always counted in trading sessions.

## 4. Parameters (Growth 1.1.0 schema)

| Key | Label | Type | Default | Range | Applies when |
| --- | --- | --- | --- | --- | --- |
| `continuationEnabled` | Enable continuation entries | boolean | OFF | — | always |
| `continuationMethod` | Continuation method | enum | `classic_d1` | `classic_d1`, `breakout`, `shallow_pullback`, `ma_cross` | enabled |
| `continuationWindowSessions` | Continuation window (W) | integer sessions | 60 | 1–500 | enabled |
| `classicPullbackPercent` | Pullback depth (P) | % | 9 | 0.1–50 | `classic_d1` |
| `classicReboundPercent` | Trailing rebound (Y) | % | 0.3 | 0.01–20 | `classic_d1` |
| `breakoutBufferPercent` | Breakout buffer (b) | % | 1 | 0–20 | `breakout` |
| `breakoutFormationBars` | Formation bars (F) | integer bars | 1 | 1–500 | `breakout` |
| `uptrendSmaBars` | Uptrend SMA length (L) | integer bars | 50 | 2–1000 | `shallow_pullback` |
| `uptrendSlopeBars` | Uptrend slope period (M) | integer bars | 10 | 1–500 | `shallow_pullback` |
| `uptrendMinimumRisePercent` | Uptrend minimum rise (r) | % | 0 | 0–50 | `shallow_pullback` |
| `pullbackMinimumPercent` | Minimum pullback (pmin) | % | 2 | 0.1–50 | `shallow_pullback`; must be < pmax |
| `pullbackMaximumPercent` | Maximum pullback (pmax) | % | 8 | 0.2–90 | `shallow_pullback` |
| `recoveryPercent` | Recovery from the trough (R) | % | 1 | 0.01–20 | `shallow_pullback` |
| `crossSmaBars` | Moving-average length (L) | integer bars | 20 | 2–1000 | `ma_cross` |
| `crossRisingBars` | Rising period (M) | integer bars | 5 | 1–500 | `ma_cross` |
| `crossMinimumSlopePercent` | Minimum SMA rise (s) | % | 0 | 0–50 | `ma_cross` |
| `crossMarginPercent` | Cross margin (m) | % | 0 | 0–20 | `ma_cross` |

- The form shows the method inputs only for the selected method; other methods' drafts are kept while switching and
  are saved only when edited (labelled "saved, not applied"). Only the **effective** values execute and form the
  variation's identity ([CONTRACTS.md](CONTRACTS.md) §Parameter schema).
- An old run without these fields is continuation OFF; cloning it starts a 1.1.0 test with continuation OFF.

## 5. What a run records

- **Events:** every base signal (taken or rejected) and executed entry/exit carries `origin` (`base_growth` |
  `continuation`), and for continuation the method and episode. A continuation trigger is an `entry_signal`
  (`SYM:continuation:<t>`); one suppressed by base priority a `rejected_signal`. Exits link to their entry's trade id.
- **`decisions.json`:** per symbol, every episode (anchor, window dates, H, maximum high in the window, armed/trigger
  instants and values, how it ended, its trade) and a compact chronological log: base signals with their disposition,
  fills (basis, carried overnight), exits (reason, stop level and activity, hold due, buffer decision, the
  gross/cost/interest/net identity, whether the exit qualifies), episode opened / armed / window closed / setup
  cancelled / continuation signal / episode closed with the reason. Times in UTC with the New York wall-clock time.
- **Metrics:** per symbol `attribution` (entries, outcomes, gross, costs, interest, net by origin — **descriptive, not
  the causal effect**) and `continuation` (episodes, how they ended, armed, filled, suppressed, windows that expired
  although a higher high followed).
- **`minute-marks.csv.gz`:** the change points of the minute-marked net (for the export's optional minute mode).

Compare a continuation ON run with an otherwise identical OFF run in the UI (**Compare with (B)**): the B − A
difference of two complete replays is the path-dependent counterfactual of enabling the method, which is generally not
the P&L of the continuation trades ([RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md) §4).

## 6. Evidence (tests)

- **OFF parity** (`src/growth-trading/tests/offParity.test.ts`, real data): six cases captured from 1.0.0 at `b590c60`
  before any change (VGT/GDX daily 2016–2023, VGT daily N90 hold off, VGT 60m 2018–2020, GDX 15m buffer off, VGT 1m)
  — signals, every trade field, excursions, both drawdowns, every daily mark, the ledger hash and the metrics are
  identical, with the continuation field absent and with it null. Runner level: `apps/strategy-lab/tests/growth-parity.test.ts`.
- **Rules** (`tests/continuation.test.ts`, synthetic, 29 tests): qualifying exit, window bounds and expiry, each
  method's arming/trigger/invalidation with equality boundaries, a candidate never seeing its own high, the uptrend
  necessity, base priority at one instant, a base entry cancelling an armed D1 setup, the D1 setup persisting past W,
  pending orders, 5-minute bars, attribution, configuration errors; Classic D1 against D1's own `EntryMachine` driven
  directly.
- **Real data** (`tests/continuationRealData.test.ts`): each method on VGT/GDX daily and VGT 60m — base signals
  identical to OFF, episodes only from profitable exits, decisions inside their windows, fills after decisions, no
  overlapping positions, accounting reconciled; Classic D1 equal, trade by trade and setup by setup, to an independently
  written driver of D1's book in the N-book engine's order (four configurations).

## 7. Diagnostic single runs (not a ranking, not tuned)

VGT, daily, 2016-01-04 → 2023-12-29 (training dates, already explored), base and exit defaults, each method with its
illustrative defaults; one run each on a scratch server, 2026-11-04. Numbers are diagnostics only.

| Run | Trades (base + continuation) | Episodes: triggered / base entry / too deep | Total marked net | Minute DD |
| --- | --- | --- | ---: | ---: |
| OFF | 52 (52 + 0) | — | +$9,717.54 | $73,618 |
| Classic D1 | 52 (49 + 3) | 14: 3 / 11 / 0 | +$23,051.12 | $60,546 |
| Breakout | 53 (51 + 2) | 13: 2 / 11 / 0 | +$5,469.26 | $79,286 |
| Shallow pullback | 55 (49 + 6) | 13: 6 / 5 / 2 | +$5,383.99 | $77,770 |
| MA cross | 52 (52 + 0) | 13: 0 / 13 / 0 | +$9,717.54 | $73,618 |

Most windows close because a base Rise signal arrives first. In the Classic D1 run, the three continuation trades net
−$354 together while the whole run is +$13,334 above OFF: the difference comes from the changed later sequence, which
is why attribution is descriptive. One window on one symbol is not evidence of an edge.
