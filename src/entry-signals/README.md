# Entry signals (signal-only research strategies)

Strategies here emit **entry signals only**: no orders, fills, positions, exits, costs or P&L. Strategy Lab runs them
as manual single tests (`apps/strategy-lab/runner/entry-signal-run.ts`) on the shared dataset pipeline
(`src/lib/evaluation.ts`). No existing strategy, configuration or study depends on this directory.

## `rise-from-recent-low` v1.0.0 (`riseFromRecentLow.ts`)

An entry idea for participating in upward runs: signal once the price has advanced at least X% from its recent low.

### Bars

`bars.ts` builds completed bars of one resolution from the regular-session minute bars (09:30–16:00 ET; extended hours
excluded; split-adjusted forward to the first loaded session):

| Resolution | Bar | Bar end (`end`, when the close is first knowable) |
| --- | --- | --- |
| `1d` | one regular session; close = the closing-auction print (else the last regular trade) | the scheduled close: 16:00 ET, 13:00 on early-close days |
| `1m`, `5m`, `15m`, `30m`, `60m` | N-minute buckets from the 09:30 open, within one session; minute bars are stamped with their start and belong to the bucket they start in | bucket start + N minutes, capped at the session close (the last bucket can be shorter); the closing print belongs to the daily bar only |

Missing bars are **not imputed**: a bucket without a minute bar does not exist, and session gaps (nights, weekends,
holidays) are not bars. So the lookback counts bars present in the data, not clock time.

### Rule

Bars b₀ … bₙ₋₁ are in ascending time order. With N = `recentLowLookbackBars` (an integer ≥ 2) and
x = `advanceFromRecentLowPercent` / 100 (> 0):

```
L_i = min(low_{i−N+1}, …, low_i)              recent low over the last N completed bars — bar i INCLUDED (i ≥ N−1)
T_i = L_i × (1 + x)                            threshold price
C_i ⇔ close_i ≥ T_i × (1 − 10⁻¹²)              at or above the threshold (the factor only absorbs binary rounding)
signal on bar i ⇔ i ≥ N  ∧  C_i  ∧  ¬C_{i−1}
```

- **Edge-triggered, deterministic rearming.** A signal needs the previous bar *below* its own threshold, so a market
  that stays X% above its rolling low signals **once**. The rule rearms only after a bar with C false. That happens
  when the price falls back, or when the rolling low rises as old lows leave the window.
- **First evaluable bar.** At i = N − 1 the rule only sets the state; no crossing has been observed yet, so it never
  signals there.
- **No lookahead.** Deciding bar i reads bars ≤ i only, all of them complete at bᵢ.end. The signal is stamped
  **bᵢ.end** at price **closeᵢ**.
- **Ties.** The reported recent-low bar is the earliest of equal lows.
- **Warm-up.** Sessions before the evaluation window, up to the window's first date and never after it, provide L and
  the previous state. Signals are only emitted inside the window.

**Defaults:** X = 5%, N = 20 bars, resolution `1d`, so 20 completed sessions, about one month. On minute resolutions N
counts minutes or buckets of the regular session; for example, 20 × `60m` bars is about three sessions.

**No execution model.** Strategy Lab labels these events `entry_signal`, never `executed_entry`.

### Forward outcomes (`outcomes.ts`)

Each signal is measured relative to its signal price P, over the regular sessions after the signal's session, inside
the run's evaluation window only:

- **Forward returns** after 5, 21 and 63 sessions, close to close. A return whose session lies beyond the window is
  **censored** and recorded as `null`, never as 0.
- **MFE / MAE** over 63 sessions: the highest session high and the lowest session low relative to P. They require the
  full 63 sessions.
- **Targets** +5 / +10 / +15%: the first later session whose high reaches the target. The value is `true` or `false`
  in a complete window, and `null` when the window was censored before the target was reached.
- **Summaries:**
  - medians;
  - the positive share;
  - hit rates over complete windows only (counting early hits of censored signals would bias them upward);
  - a greedy non-overlapping count (signals at least 63 sessions apart).

  The summaries sit next to an **every-session baseline** over the same window.

Tests: `tests/riseFromRecentLow.test.ts`, part of the root `npm test`. They cover the window maths, threshold equality,
repeated highs, rolling lows, rearming, warm-up, gaps and missing bars, ties, a randomised prefix (no-lookahead)
property, bar construction including early closes, and censored outcomes.
