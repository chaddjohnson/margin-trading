# Implementation — the single production strategy in `allIn.ts`

Date: 2026-10-12. Scope: the implementation task of the "material-retrace" brief. Production file:
`src/app/allIn.ts`. Verification: `VERIFICATION.md`. Nothing committed.

## 1. The strategy now in `allIn.ts` (one strategy, named `lower3`)

| Rule | Value | Unchanged? |
|---|---|---|
| Entry signal | close ≤ 90% of the highest high of the previous 90 sessions (fewer at the start of a file) | unchanged |
| Position | $100,000 borrowed, one position at a time, filled at the signal session's close | unchanged |
| Trailing stop | 8% below the post-entry high through the previous session; active for a session only if a sale at the stop would be profitable after interest; fills at the stop, or at the open on a gap through it | unchanged |
| Loss exit | after ≥ 15 calendar days, at the open, if a sale at the open loses money | unchanged |
| Interest | 11%/yr simple on the borrowed amount, per calendar day, none on the entry day | unchanged |
| Same-session re-entry | never (the entry decision precedes exit processing within a session) | unchanged |
| **Material-loss classification** | a closed trade arms the re-entry restriction only if `exitPrice / entryPrice − 1 ≤ −0.005` (actual execution prices, interest excluded). Smaller price losses, and losses caused only by interest, leave normal eligibility in place | **new** (was: any net loss) |
| **Lower-price re-entry** | while restricted, an entry needs the 10% signal AND `close ≤ lossExitPrice × 0.97` | unchanged (3%) |
| **Recovery reset** | while restricted and flat, the restriction clears when `close ≥ episodeLow + 0.38 × (frozenReferenceHigh − episodeLow)`, where `episodeLow` is the lowest close since the losing exit session (inclusive of the current session) and `frozenReferenceHigh` is the 90-session reference high of the losing trade's entry signal, frozen for the episode | **new** (was: `close ≥ 0.95 × frozenReferenceHigh`) |

Frozen at arming and never updated: the loss-exit price, the lower level (97% of it) and the reference
high. Only the episode low moves, and only downward. A reset never buys by itself. The restriction
clears when a position opens; a later material loss creates a fresh restriction from its own trade.

### Chronology (identical to the verified research framework)

Within session i: (1) entry decision at the close, only while flat and only with the 10% signal —
while restricted, today's close first extends the episode low, then: a close at or above the reset
level blocks the entry (reset priority; the reset is applied at the end of the session), otherwise
the entry needs `close ≤ lowerLevel`; (2) exit evaluation if a position was open at the start of the
session; (3) stop/high updates; (4) daily mark-to-market; (5) end of session — a position opened at
this close clears the restriction; else, while flat, the (already extended) episode low is used to
test the reset. A material losing exit at step (2) arms the restriction, and the reset is tested at
step (5) of the same session with the exit session's close as the first episode low. No entry can
occur on an exit session because step (1) sees the position still open.

## 2. Exact changes to `allIn.ts`

1. **Removed** the `StrategyName` type, the `StrategyOptions` interface, the `strategies` object, the
   strategy-selection argument and all `strategy.lowerPriceReentry !== undefined` branching. The
   original baseline is no longer a production configuration; it remains available through git
   history (commit `cd65d51` and earlier) and the frozen Python research implementation
   (`research/risk-management/baseline/engine.py`, default `Strategy`).
2. **Added** three named constants next to the existing ones: `materialLossThreshold = 0.005`,
   `lowerPriceReentry = 0.03`, `retraceFraction = 0.38`.
3. **Changed the arming rule** at the exit block: `priceReturn = exit.price / position.entryPrice − 1`;
   arm iff `priceReturn ≤ −materialLossThreshold`; a non-material net loss logs `loss_not_restricted`
   and prints a one-line explanation; profits log `profitable_exit`.
4. **Replaced the reset**: the `Restriction` record now carries `episodeLow` instead of a fixed
   `resetLevel`; `resetLevelOf()` computes `episodeLow + 0.38 × (referenceHigh − episodeLow)`; the
   episode low is extended with the current close before the entry gate (restricted sessions with the
   signal) and at the end of every restricted session.
5. **Outputs**: when an output directory is given, `states.csv` now carries `price_return`,
   `episode_low` and `reset_level`, and a new `episodes.csv` lists every restriction (arming exit,
   reason, loss, price return, frozen values, episode low, resolution and date); `summary.json` adds
   the three parameters and counts of restrictions, lower-price re-entries, recovery resets and
   exempt losses.
6. **CLI**: `npm run app allIn [symbol] [start] [end] [data file] [output dir]` (the strategy argument
   is gone; `'-'` leaves an earlier argument at its default; the data file still defaults to the
   symbol's 2016–2026 file). Example: `npm run app allIn VGT 2016-10-07 2025-12-31 data/VGT/VGT-2016-2026.csv out/`.
7. Console output: unchanged lines plus restriction/reset/exemption messages and a final parameter line.
   `evaluateSessionExit` and every exit rule are untouched. Lint and `tsc --noEmit` pass.

## 3. What was deliberately not done

- No generic strategy framework, no selectable configurations, no LOC execution (see
  `LOC_FEASIBILITY.md`), no change to exits, sizing or interest.
- The earlier `adaptive-reentry/phase1/regression_test.py` targeted the removed `baseline`/`lower3`
  CLI; it is kept as the historical Phase 1 record with a superseded note at its top. The current
  regression test is `regression_test.py` in this directory.
