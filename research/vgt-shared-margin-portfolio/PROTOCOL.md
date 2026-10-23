# Protocol: VGT D1 deployment risk, shared margin and the compounded VOOG/VGT portfolio

Written 2026-10-22 **before any scenario comparison ran**, from the brief and an audit of the repository. Every
later amendment is listed in §10 with its reason. The engine (`src/shared-margin-portfolio/`) encodes these rules;
`npm run shared-margin -- audit` prints the data facts referred to here.

## 1. Scope

- **Frozen strategies**, evaluated as shipped, never re-optimized:
  - **D1** — `src/app/allIn-trailingBuy-postExitContinuation.ts` (X 21.6%, Y 0.3%, L 74 sessions, stop 7.3%, hold
    8 calendar days, intraday buffer 2.9%, post-exit pullback P 9%, window W 60 sessions; net-profit stop rule).
  - **B2, gross-breakeven D1** — `src/app/allIn-trailingBuy-postExitContinuation-stopGrossBreakeven.ts` (the same
    entries and levels; the stop is eligible once its level reaches the entry price, latched).
  - **B3, D1 with P 8.6%** — D1's architecture with `pullback = 0.086` injected through the research engine; the
    D1 file's defaults are not touched.
  - **Swing-low C2** — `src/app/allIn-trailingBuy-swingLow.ts` as shipped (K 55 sessions, rebound 0.6%, Z 0, stop
    4.0%, hold 26 days, buffer 0.4%).
  - **Set 2** (`allIn-trailingBuy-bufferedLoss-noReentry.ts`) is a regression reference only.
- **Out of scope**: XBI/IWM/XRT/KRE/XLY/IWN/XLF/XLE, BTCUSDT, any parameter optimization. No other instrument is
  loaded.
- Everything reported is a **historical, inspected backtest** on data already examined by earlier programs; nothing
  here is evidence of predictive skill.

## 2. Data and adjustment audit

| File | sha256 | Use |
|---|---|---|
| `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f` | signals, fills, VGT marks (raw Alpaca, UTC minute-start bars, no closing print on 403 sessions is a VOOG fact, VGT has prints) |
| `data/VOOG/VOOG-2016-2025-1-minute.csv` | `f4ad4d72f39b157fce64e023f644c4648db840be39ce6979ff42a5818d278cc2` | VOOG marks and VOOG fills (raw Alpaca) |
| `research/risk-management/vgt-portfolio-margin/data/distributions.csv` | `30adf087e7f54927928c12a9d23e198d19336a7e6257df2e9be7e3fc70dba923` | the 78 VOOG/VGT distributions derived by the earlier program from the raw/adjusted ratio |
| `data/VGT/VGT-2016-2026.csv`, `data/VOOG/VOOG-2016-2026.csv` | `653b0030…`, `958ded64…` | **audit only**: re-derivation check of the distribution ledger (dividend- and split-adjusted daily closes; VGT's includes a 2026 split outside the window) |

- Both minute files group into the **same 2,459 New York sessions** (`groupMarketSessions`, regular session plus the
  closing-auction print, early closes and DST handled). Extended-hours rows are dropped.
- **Price basis**: every price used in signals, fills, marks and sizing is raw. Dividends are modelled as cash
  flows from the distribution ledger. Adjusted files are never mixed into the account; they are only compared with
  the ledger in the audit.
- **Splits**: none in the window for either ETF (the raw/adjusted ratio steps only by dividend-sized amounts).
- **VOOG sparsity**: median ≈150 of 390 regular minutes trade; 403 sessions have no closing print, including
  2016-01-04. The daily VOOG close is the closing print, or else the last regular trade.
- **Distribution ledger**: 39 VGT + 39 VOOG records, quarterly, 2016-03-21 → 2025-09-24. Amounts are derived from
  the raw/adjusted ratio step (±1% precision); the three 2016 VOOG amounts before VOOG's adjusted history and all
  **pay dates** (ex-date + 3 sessions before 2024-05-28, + 2 after) are estimated. The audit command re-derives the
  steps from the present adjusted files and reports every mismatch.
- **Horizon**: 2016-01-04 → 2025-10-13 (the last supported VGT minute). Nothing after 2025-10-13 is used or asserted.
  The daily files extend into 2026 and are not used for prices.
- **Minute-sampled portfolio marks**: both ETFs have minute data, so a combined minute-sampled drawdown is computed
  at every minute either ETF traded, each ETF at its **last observed trade** (forward-filled, never interpolated).
  It is labelled "minute-sampled, VOOG forward-filled" wherever it appears; the daily-close drawdown is the exact
  headline figure.

## 3. Dates, start and eligibility

- **Start**: the 2016-01-04 close. VGT closing print **106.61** (1,125.5980 shares for $120,000); VOOG has no closing
  print that day, so its **last regular trade 101.89** (14:58 ET) is used (1,766.6111 shares for $180,000). Equity
  $300,000, no cash, no debt.
- **Strategy eligibility**: every strategy may first arm on **session 365, 2017-06-15**, as in the two previous
  programs, so that D1, B2, B3 and swing-low are compared on a common start. D1's first trade (2018-12-21) is
  unaffected. The swing-low file on its own arms from session 55 and takes one extra trade (2016-06-27 →
  2016-11-04, +$10,030: $124,508 / 33 trades); under the common eligibility it is $114,478 / 32 trades, the figure
  the brief quotes. **No strategy trades between 2016-01-04 and 2017-06-15**; the portfolio is buy-and-hold then in
  every scenario, and this is stated wherever year-by-year results appear.
- **End**: 2025-10-13. An open margin lot is marked at that close with its accrued interest as a liability; its
  unrealized profit is never reinvested.

## 4. Account ledger

One self-financing margin account. Inventories: core VOOG shares, core VGT shares, trading lots (each with a
strategy owner, shares, borrowed principal, entry session date, interest rate), cash (never negative), dividend
receivables (declared, unpaid), and liabilities (each lot's principal plus interest accrued through the current
session date).

```
long market value (LMV) = VOOG shares × VOOG price + (core VGT + lot VGT shares) × VGT price
assets                 = LMV + receivables + cash
liabilities            = Σ lots (principal + principal × rate × (session date − entry date) / 365)
equity                 = assets − liabilities
```

- **Shares**: fractional at full floating-point precision (the strategy files buy `investment / price` shares).
  Disclosed; a whole-share sensitivity (shares floored, residual cash) is run for scenario B.
- **Interest**: 11% simple annual interest, accrued per calendar day on each lot's principal from its entry
  session date, none on the entry day — the strategy files' convention, so a lot's net profit in the ledger equals
  the strategy's own trade profit to the dollar. Interest is a liability while accruing and is paid from the sale
  proceeds at exit. There is no month-end compounding and no interest on anything but lot principal (unlike the
  earlier $400k study, which capitalized interest monthly; the difference is small and is noted).
- **Dividends**: shares held at the previous session's close (core and lots) are entitled on the ex-date; a
  receivable is booked on the ex-date and paid on the estimated pay date, when it buys shares of the same ETF at
  that session's close (closing print, else last trade) into the **core** inventory. Lot dividends therefore go to
  core VGT; they are reported separately and are not part of strategy P&L. Scenario A books exactly the same core
  distributions.
- **Reconciliation**: `assets − liabilities = equity` is asserted after every event and at every session close
  with a tolerance of $0.01, and shares/cash never go negative. The ledger emits every event to
  `results/*/margin_ledger.csv`.

### 4.1 Sizing at an entry

```
target principal = f × equity measured at the decision minute, f = 0.20 (primary)
```

The decision minute is the completed minute that confirmed the rebound. Equity at that moment uses: VGT at the
decision minute's close (the decision price), VOOG at the close of **VOOG's last completed minute at or before the
decision time** (else the previous VOOG session close), lots at the decision price, receivables, cash, and
liabilities with interest through the session date. The principal buys `principal / fill price` shares at the
strategy's fill (the first trade after the decision). Borrowing adds equal assets and liabilities: equity is
unchanged at the entry. **The size is fixed at the entry and never re-sized.** Reg T is checked at every entry
(debt after the entry ≤ 50% of LMV); a breach would decline the entry (never happens historically).

### 4.2 Exit, repayment and reinvestment (booking order)

1. The lot sells at the strategy's exit fill (minute m, price p): proceeds `shares × p` to cash.
2. The lot's liability (principal + interest through the exit session date) is repaid from cash immediately.
3. `net = proceeds − principal − interest`, identical to the strategy's trade profit.
4. **Primary core policy ("contribution 60/40, no rebalance")**:
   - net > 0: buy VOOG with 60% and VGT with 40% of net at the **earliest causally executable trades after the exit
     fill**: for VGT, the open of the first VGT minute bar that starts after minute m (the strategy's own
     next-trade rule), or the closing print if the exit preceded the close and no later minute traded, else the next
     session's opening trade; for VOOG, the open of VOOG's first minute bar at or after that same time, or VOOG's
     closing print under the same conditions, else VOOG's next session opening trade. Cash holds the amount until
     then and counts in equity. No same-minute VOOG fill is invented.
   - net < 0: the shortfall is funded by **selling core VOOG and core VGT in proportion to their market values**
     at the same executable trades, so that cash returns to zero. Turnover is reported.
   - Existing holdings are never rebalanced.
5. **Sensitivity ("full rebalance 60/40")**: at the same executable trades, core VOOG and VGT are traded so that
   their values are 60/40 at those prices (net profits included, losses funded). Turnover and the tax caveat are
   reported; it is never the primary scenario.
6. **Attribution control ("no reinvestment")**: net profits stay in cash earning nothing; losses are still funded
   by proportional core sales.

### 4.3 Margin constraints and forced liquidation

Reported every session close and minute-sampled: equity ÷ LMV, debt ÷ equity, gross exposure LMV ÷ equity.
Thresholds (equity ÷ LMV):

| Requirement | Status |
|---|---|
| 25% | FINRA Rule 4210 maintenance minimum (regulatory) |
| 35% | Vanguard's published house maintenance requirement for "most marginable securities" (its margin risk disclosure, retrieved 2026-10-22; not verified against an account agreement; Vanguard states it can raise it without notice) |
| 50% | Vanguard's stated requirement for **concentrated positions**; a 60/40 VOOG/VGT account whose margin lot is also VGT could plausibly be classified as concentrated. Treated as the conservative house case. |
| 50% | Reg T initial margin at each purchase |

**Forced liquidation rule (predeclared, generic, illustrative)**: if equity ÷ LMV at a session close is below the
scenario's maintenance requirement m, the account sells at the next session's opening trade: the trading lot(s)
first (a forced exit of the strategy's position, recorded as `forced liquidation`; the strategy returns to flat
and opens no continuation window), then core VOOG and VGT proportionally, until equity ÷ LMV ≥ m + 5 percentage
points. Proceeds repay debt first. The historical runs are evaluated with m = 25%, 35% and 50%; the stress runs use
the same rule, and a liquidation changes the subsequent strategy path.

## 5. Signal semantics, event order and the shadow evaluator

### 5.1 Strategy machines

D1/B2/B3 and swing-low are re-implemented in `src/shared-margin-portfolio/strategy.ts` as minute-stepped state
machines (FLAT → ARMED → PENDING_FILL → LONG) with the exit evaluator ported from the files (the net-profit stop,
the gross-breakeven latch, the maximum-hold exit, the buffered intraday loss exit, the pending-sale carry). Parity
with the files and with the D1-refinement engine is required before any shared run: every trade's entry/exit
session, minute, price, reason, interest and profit, and both drawdowns (`npm run shared-margin -- parity`).

### 5.2 Capital gate and declined signals

A rebound signal becomes an order only if the policy grants capital at that minute. When capital is refused, the
strategy's state evolves under one of three predeclared semantics, compared where they differ:

- **hold** (primary): the setup stays ARMED with its trailing low; every later completed minute re-tests the
  rebound trigger, and the first qualifying minute with capital available becomes the signal. The strategy's own
  state machine is untouched; only the fill is gated. The setup never re-arms, as in the files.
- **cancel**: the refused setup is dropped; the strategy is FLAT and may re-arm on its normal conditions.
- **shadow** (standalone replay): each strategy runs exactly as it does alone, including phantom positions it could
  not fund; the account executes a standalone trade only if the shared pool is free at its entry minute, and then
  exits it at that trade's standalone exit. This is the semantics implied by comparing two independent runs, and it
  is what Track I's "signals during competing exposure" counts.

Shadow signals never imply that two full-size trades could have been executed.

### 5.3 Event order inside a session

1. **Open**: ex-date entitlements for shares held at the previous close.
2. Forced liquidation ordered at the previous close (opening trade).
3. Orders carried from an earlier session fill at the **opening trade**, in this order: stops gapped through at the
   open (resting stop-market orders, filled at the open), pending buffered-loss sales, carried reinvestment or
   loss-funding orders, then carried entry orders (a rebound confirmed at the previous close with no trade left).
4. **Minute loop**, each bar k when it completes (its end is the decision time):
   a. lot exits scheduled for bar k by the per-session exit evaluators (decided from the pre-session state and the
      session's bars in the files' own order; they execute at the bar the evaluator names, at its price);
   b. reinvestment / loss-funding / liquidation orders due at bar k (the VGT leg at the bar's open; the VOOG leg at
      VOOG's first bar at or after the same time);
   c. entry fills due at bar k (an order from bar k−1's decision);
   d. the entry machines process bar k (arming, trailing low, rebound trigger). A rebound at bar k asks the capital
      gate; the policy's precedence rule orders two strategies signalling on the **same bar**.
5. **Close**: pay-date dividends reinvested at the close; marks; the daily row; the maintenance check.

A stop and an entry of the same strategy never occur in one session (the files' rules). An exit of one strategy
and an entry of the other can occur in the same session; the entry is gated only by capital.

### 5.4 Takeover (policy P5)

Swing-low may own the lot. If D1 produces a rebound signal at bar k while the swing lot is open **and** the swing
lot's exit for that session is not at a bar ≤ k, the lot's management transfers to D1 at the end of bar k: no
share is bought or sold, no principal is borrowed, the swing exit scheduled later in the session is cancelled, and
the swing machine returns to FLAT. The transfer timestamp (for T2) is the first observed trade after the decision
(the same proxy as an entry fill). D1 evaluates exits from the **next session** (no exit on the takeover session,
as D1 has none on an entry session; nothing is executed retroactively). If the swing exit is at a bar ≤ k, it
executes first and D1's signal is an ordinary entry gated by capital.

| State | T1 — continuous position accounting | T2 — exit-reference reset |
|---|---|---|
| Entry price, shares, principal | swing's | swing's |
| Interest start, loan age | swing's entry session date | swing's entry session date |
| Hold clock (8 days) | from swing's entry date | **T2a** from swing's entry date; **T2b** (sensitivity) from the takeover session date |
| Post-entry high | swing's observed high since its fill through the previous session; the takeover session's full range is added at that session's daily update | max(transfer-trade price, later bars' highs, session close), D1's own entry-session rule from the transfer bar |
| Stop level | high × (1 − 7.3%), never lowered | the same, from the reset high |
| Stop eligibility | D1's rule (net profit at the stop > 0 for D1 and B3; latch at gross breakeven for B2), using the lot's true investment and interest | the same |
| Buffer exit | D1's 2.9% of the lot's investment, from hold day 8 | the same |
| Continuation window after the exit | opens iff the lot's **true** net profit > 0 (the whole position) | the same |

Edge cases recorded in the trace: takeover with the swing lot in profit or in loss; a T1 stop already above the
next open (D1 then sells at that open as a gapped stop); multiple D1 signals during one swing position (only the
first transfers; later ones are no-ops, counted); a D1 signal on a session where the swing exit comes first; an
overnight gap after a takeover.

### 5.5 Policies (Track II)

All with the same 20%-of-equity total borrowing cap and hold semantics unless stated.

| Key | Policy | Entry sizing | Same-bar tie | While the other owns the lot |
|---|---|---|---|---|
| B | D1 only (control) | 20% | — | — |
| S | swing-low only (reference) | 20% | — | — |
| P1 | D1 priority | 20% | D1 | the other is declined (hold) |
| P2 | first signal wins | 20% | earlier decision minute; equal → D1 | declined (hold) |
| P2c, P2s | P2 under cancel / shadow semantics | 20% | as P2 | cancel / shadow |
| P3 | dedicated split | 10% each, both may be open | both fill | n/a (each has its own half) |
| P4 | dynamic sharing | 20% × equity − the other lot's outstanding principal; declined if below 10% × equity; **no top-ups** of open lots | D1 first | partial entry if ≥ 10% remains |
| P5-T1, P5-T2a, P5-T2b | D1 takeover of a swing lot | 20% (swing or D1 enters first; whoever is flat when the other holds is declined, except D1's takeover) | D1 | swing declined; D1 takes over |

## 6. Scenarios (Track IV)

A (buy and hold, dividends reinvested), B (D1, f = 20%), B2 (gross-breakeven), B3 (P 8.6%), C-P1 … C-P5 as above;
each under the primary core policy, plus the rebalance sensitivity and the no-reinvestment control for B and the
best C. Comparators: fixed-$100,000 noncompounded control (legacy link, separately labelled), and a **matched
borrowing-dollar-days passive leverage** comparator: a constant VGT margin lot held from 2017-06-15 whose
principal × days equals B's realized borrowing-dollar-days, at 11% interest, so that the value of timing can be
separated from the value of extra VGT exposure.

Metrics per scenario: year-end equity, core VOOG/VGT value, lot MTM, debt, cumulative interest, strategy P&L,
cumulative dividends, cash; annual and cumulative returns; CAGR over the exact span; max drawdown (daily exact,
minute-sampled diagnostic) with timestamps and recovery; strategy P&L normalized to $100k and in dynamic dollars;
exposure; win/loss; adverse excursions; max LMV ÷ equity; min equity ÷ LMV; turnover; reconciliation status.

## 7. Deployment-risk tests (Track III)

All on frozen D1 (and B2 where the stop rule matters), dynamic 20% sizing unless stated. Nothing is tuned.

- **Gap-through-stop**: VGT gaps down g ∈ {5, 10, 20, 30}% at the open of (a) the session after each entry (stop
  inactive), (b) the first session on which the stop is active, (c) the session of the deepest core-portfolio
  drawdown while the lot is open; VOOG falls ρ·g with ρ ∈ {0, 0.5, 1}. Fills at the gapped open (never at the
  crossed stop level). Per-trade table, plus full re-runs of the path for named dates (the whole subsequent VGT and
  VOOG series shifted), so that forced liquidation and later signals are affected.
- **Execution costs**: per-side cost c ∈ {0, 2, 5, 10, 25} basis points on every fill (entries, exits,
  reinvestment, loss funding, liquidation; DRIP excluded), commission $0 (Vanguard online ETF trades) — hypothetical
  grid, not a measured spread.
- **Intrabar fills**: stop at the level / at the next minute's open / at the next open less 10 and 50 bps.
- **Interest**: 8%, 11%, 14%, separating financing cost from changed exit timing (D1's net stop test is
  interest-dependent; B2's is not).
- **Allocation**: f ∈ {10, 15, 20, 25}% and the 0% anchor (A).
- **Correlated stress**: uniform falls in both ETFs of 20/30/40/50% from the worst historical balance sheet, and
  the fall that reaches each maintenance threshold.

## 8. Evidence grades

Every reported figure is one of: **reproduced** (equals a committed earlier figure), **computed** (from this
program's ledger on observed data), **sensitivity** (a predeclared variation), **stress** (a named hypothetical
shock), or **assumption** (a broker or cost figure not verified). Reports label them.

## 9. Validation

Regression to the files' own outputs; parity with the D1-refinement engine; independent recomputation of the
ledger from the event CSV (`npm run shared-margin -- audit-ledger`); unit tests on synthetic sessions for the
takeover transfer, the capital gate, same-bar ties, gaps, missing bars, ex-dates and pay dates, loss funding with
low cash, forced liquidation, and an open lot at the end of the data; `npm test`, `tsc --noEmit`, `eslint`.

## 10. Amendments

| # | Date | Amendment | Reason |
|---|---|---|---|
| A1 | 2026-10-22 | Swing-low's reference is $114,478 / 32 under the common eligibility; its own file prints $124,508 / 33 | The file arms from session 55 and takes a 2016 trade; the brief's figure is the engine's common-eligibility run. Both are reported. |
| A2 | 2026-10-22 | Lot dividends are reinvested into core VGT and reported separately | The strategy files don't model dividends; a lot held over an ex-date is entitled in a real account. Keeping them out of strategy P&L preserves parity. |
| A3 | 2026-10-22 | No month-end interest capitalization | Keeps every lot's ledger profit identical to the strategy's own profit; interest is paid at exit. |
| A4 | 2026-10-22 | The dividend re-derivation audit uses 3-session medians of the raw/adjusted ratio before and after a step (threshold 0.1%) instead of single-session steps | Single-session steps mis-sized several quarters on volatile days (e.g. VGT 2020-03-10) because the adjusted daily prices are rounded; the median method is the earlier study's. Result: 35/36 VGT and 35/35 VOOG ex-dates matched, aggregate difference 0.48% / 0.57%. |
| A5 | 2026-10-22 | `signals.csv` is written compactly (one row per refused setup) and the per-minute refusal log goes to a git-ignored `signals_minutes.csv`; sensitivity and shock re-runs' `daily.csv`/`ledger.csv` are git-ignored | Hold semantics logs one refusal per re-tested minute (≈60 MB over the shared scenarios). The summary counts distinct refused setups (`signals_declined_setups`) as well as minutes. All files regenerate with `run` / `stress`. |

## 11. Observations that are not amendments

- P4 (dynamic sharing) produced exactly P2's trades: the first entrant always takes the full 20% and no top-ups
  were allowed, so nothing was ever left above the 10% minimum. A different dynamic rule would need top-ups.
- P5-T1 and P5-T2a produced identical trades: D1's net-profit stop rule kept the stop inactive on every lot taken
  over in loss (9 of 12), and for the three taken over in profit both stop levels were below cost until the price
  made a new high, after which the carried and the reset highs coincide.
- P1 was run as a displacement (sell the swing lot and buy D1's lot at the next trade) because a "priority" that
  only breaks same-bar ties is indistinguishable from first-signal-wins (no same-bar double signal occurred).
