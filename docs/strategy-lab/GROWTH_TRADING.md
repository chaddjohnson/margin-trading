# Growth — the trading backtest `rise-from-recent-low-trading`

**Growth** (until 2026-11-04 displayed as "Rise from recent low (trading backtest)"; the key is unchanged) is a trading
backtest built on the **Rise from Recent Low** signal. It is meant to catch upward runs and stay invested while they
last. Unlike the signal-only strategy, it produces real executed entries and exits, an open position where there is
one, P&L, drawdowns and exposure.

**Versions** (one strategy in the UI; the version is shown in the run header and the Parameters panel):

| Version | What | Launchable |
| --- | --- | --- |
| `1.2.0` (current) | 1.1.0 + an optional **entry trend filter** (five methods) and optional **persistent entry eligibility** (five bounded policies), both OFF by default — [GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md) | New Test, phenotypes |
| `1.1.0` (legacy) | 1.0.0 + **optional continuation entries** after a net-profitable exit (four methods, OFF by default) and a decision log — [GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md) | Catalogue phenotypes only (rerun as 1.1.0 configurations). With both gates OFF, 1.2.0 reproduces every 1.1.0 artifact exactly (`src/growth-trading/tests/offParity-1.1.0.test.ts`, `apps/strategy-lab/tests/growth-parity.test.ts`). Cloning a 1.1.0 run starts a 1.2.0 test with both gates OFF |
| `1.0.0` (legacy) | The base entry and the three exits below | No: its runs stay as recorded. With continuation and both gates OFF, 1.2.0 reproduces every 1.0.0 signal, fill, exit, mark and metric exactly (`src/growth-trading/tests/offParity.test.ts`, `apps/strategy-lab/tests/growth-parity.test.ts`); `npm --prefix apps/strategy-lab run replay -- R-…` re-executes a stored run and diffs it. Cloning a 1.0.0 run starts a 1.2.0 test with all options OFF |

Everything below describes every version; continuation entries are in [GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md),
the entry trend filter and persistent eligibility in [GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md).

- **Code:** `src/growth-trading/riseTrading.ts` (engine) and `apps/strategy-lab/runner/trading-run.ts` (Strategy Lab
  runner).
- **D1 audit:** [GROWTH_TRADING_AUDIT.md](GROWTH_TRADING_AUDIT.md) maps every inherited rule to its D1 source.
- **Brief:** `brief/2026-11-04-growth-trading-strategy-brief.md`.
- **Not a recommendation.** This is a research tool. The defaults are illustrative and were not optimised for this
  strategy. Nothing here places orders.

## Entry and re-entry

- **Entry signal.** The base entry is the unchanged `rise-from-recent-low@1.0.0` scanner. Its rule, its edge trigger
  and the bar resolution are identical, and so are its warm-up and data loading.
  - Its signal: the completed bar's close is at least **X%** above the lowest low of the last **N** bars, after a bar
    below that level.
  - Both strategies receive identical raw signals; the tests prove it on real data.
- **Decision and fill.** The decision is made when the signal bar completes. The buy fills at the **next eligible
  trade**:
  - a daily signal (known at the 16:00 close) fills at the **next session's opening trade**;
  - an intraday signal fills at the open of the next minute, or at the closing print if no minute follows.
- **Position.** All-in or flat: one position of **$100,000** fixed notional, never compounded, no pyramiding.
- **Signals while invested.** A signal while a position is open, or while an order is waiting to fill, is recorded as
  **ignored**. It is never replayed later.
- **Re-entry after any exit.**
  - Re-entry happens on the next **fresh** signal, profit or loss alike. No price decline, cooldown, loss restriction
    or reset is required.
  - "Fresh" is the scanner's own rule: it fires on a crossing, not on a state. A rise that stays above X% gives one
    signal, and a new one needs a bar below the threshold first. So a predicate that stays true never triggers buy/sell
    loops.
  - A fresh signal later in the exit's own session is allowed. That new position can first exit the next session.

## The three exit rules

| Rule | Switch | Inputs (default) | What it does |
| --- | --- | --- | --- |
| **Trailing stop** | none: always on | % below the post-entry high (7.3%) | Sells when the price falls to the stop. The stop **is only active on a session where selling at it would be profitable after interest**. |
| **Maximum losing hold** | checkbox, ON | calendar days (8) | At or after that age, a position whose **opening trade** shows a net loss after interest is sold at the next trade. A profitable position may stay longer. |
| **Buffered intraday loss** | checkbox, ON; needs the hold | % of the $100,000 notional (2.9%) | From the hold age on, sells after the first completed minute whose close puts the **net P&L after interest** at or below −buffer × $100,000. |

### Trailing stop

- **Level.**
  - The stop is X% below the highest price since the fill.
  - On the entry session, only prices from the fill onwards count, plus the close.
  - After each later session, the stop is raised using that session's high. It is never lowered, and a session's own
    high never moves its own stop.
- **Activation.** Before each session, the engine checks whether shares × stop − $100,000 − interest accrued to that
  date would be **positive**.
  - Only then is the stop active for that session.
  - **An open losing trade has no active stop**, and rising interest can make an inactive stop stay inactive.
  - The trailing stop alone therefore does not guarantee an exit.
- **Fills.**
  - At the open: an active stop that the session gaps through fills at the opening trade, at a loss if need be.
  - Intraday: the first minute that reaches the stop fills at the stop price (an assumption: the actual fill could be
    worse), or at that minute's open if it opened below the stop.

### Maximum losing hold versus the buffered intraday loss

They are different rules that work together.

- **Maximum losing hold: one look per session, at the open.**
  - The age is counted in calendar days from the fill session's date, so weekends and holidays count.
  - From that age on, each session's opening trade is checked. If net P&L there is negative (raw price, entry cost
    included, interest included, exit cost not included), the position is sold at the **next** trade (normally the
    09:31 open).
  - A profitable opening keeps the position. This is not a fixed holding period.
- **Buffered intraday loss: during the session, from the same age.**
  - If the open did not trigger the hold exit, every completed minute's close is checked against the buffer.
  - The trigger is net P&L **after interest** at or below −buffer × $100,000. For example, **2.9% = −$2,900 net, not a
    2.9% price drop**.
  - The sale fills at the next minute's open, at the closing print, or, if the decision came at the close, at the next
    session's opening trade.
- **Interplay.**
  - A losing open at the hold age always exits by the maximum hold first; the buffer never weakens that check.
  - An active stop that is reached in the same minute or earlier wins over the buffer.
- **Dependency.** The buffer only exists from the maximum-hold age, so it cannot be on while the hold is off.
  - The form unticks and disables it.
  - The API refuses the combination: "Buffered intraday-loss exit: it applies only from the maximum losing-hold age —
    switch it off, or switch the maximum losing hold on".

### Switching rules off

- **Maximum losing hold OFF.** There is no loss exit. With a stop that only activates in profit, a losing position can
  stay open **indefinitely**.
  - The form warns about this.
  - The run reports such a position as **open, marked at the last close**. It never invents a sale.
- **Buffer OFF with the hold ON.** Only the hold's opening check remains.
- **Saved values.** An input whose switch is off is still saved with the run, labelled "saved, not applied". It can be
  switched back on in a clone.

### Deliberately not part of this strategy

The following are not implemented, offered or saved:

- the material-loss restriction;
- the lower-price re-entry requirement;
- the recovery reset;
- any reference-high or episode state.

Also absent are D1's deep-dip trailing buy and any hard stop-loss or profit target. D1's post-profitable-exit
continuation entry is available since 1.1.0 as the optional *Classic D1* continuation method (OFF by default;
[GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md)). The tests assert that no post-loss restriction state exists.

## Accounting

| Item | Assumption |
| --- | --- |
| Notional | $100,000 per trade, borrowed, fixed, never compounded |
| Interest | 11% simple per year, per calendar day between the entry and exit session dates (365-day year). None on the entry day. Accrued, unpaid, on an open position |
| Costs | Editable: bps per side on every fill (default 5 bps, the Study 8 pools convention). $0 commission, no spread |
| Fill prices | Observed minute-bar opening trades and closing prints, as proxies. Stops fill at the stop price |
| Prices | Split-adjusted forward to each symbol's first loaded session (as the chart shows them) |
| Open position at the end | Marked at the last session close, net of accrued interest. Exit cost not charged. Not closed |

Per trade:

- gross = shares × (raw exit − raw entry);
- costs = entry cost + exit cost;
- **net = gross − costs − interest**;
- net % is relative to the $100,000 principal.

Run totals:

- **realized** net (closed trades) + **unrealized** net (the open position) = **total marked net**;
- interest and costs are shown separately.

**Drawdowns** are falls of the marked net (realized + open position, net of interest) from an earlier peak:

- **minute**: at every regular-session minute close and every session close;
- **daily**: at session closes only;
- each in $ and as **% of the $100,000 notional**. That is a capital reference, not a percentage of equity.

Every run re-books each trade in the shared fixed ledger (`FixedLedger`) and checks the gross/cost/interest identity
and the final mark. **A run whose accounting does not reconcile fails** instead of being shown.

**Several symbols** are independent standalone backtests: one simulation per symbol, each on its own $100,000. Results
are shown per symbol tab and **never summed**. There is no shared-capital allocator. Do not compare them with the
shared-slot `vg-balanced` pool (R-000013).

## Using it in Strategy Lab

1. **Start it.**
   - On apollo: `npm --prefix apps/strategy-lab start`, then open http://127.0.0.1:4317 or http://apollo:4317.
   - Over Tailscale: `npm --prefix apps/strategy-lab run start:vpn`, then http://apollo:4317 with the access token
     (`npm --prefix apps/strategy-lab run token -- --print` on apollo). See [OPERATIONS.md](OPERATIONS.md).
2. **+ New test → Strategy → "Growth".**
   - Inputs are grouped as Entry (X, N, resolution), Exits, Continuation entries (OFF by default) and Execution, with
     units, ranges, defaults and help.
   - The fixed assumptions are listed under the strategy.
3. **The example run.**
   - Choose symbol **VGT**, set dates 2016-01-04 → 2023-12-29 and keep the defaults (X 5%, N 20, 1d; stop 7.3%;
     hold ON 8 days; buffer ON 2.9%; 5 bps).
   - Click **Run Test**. One configuration gives one run (`R-…`), queued → running → completed.
4. **Inspect the result.**
   - The header says **TRADING BACKTEST · STANDALONE PER SYMBOL** and **Growth v1.1.0**.
   - The chart shows four marker kinds: *Executed entry* ▲, *Executed exit* ▽, *Entry signal* (a raw signal taken) and
     *Rejected signal* (a raw signal ignored). Each kind can be toggled.
   - **Trades** lists every trade: origin (base Growth or the continuation method), entry and exit in ET, fills, exit
     reason, days held, net. Clicking a row shows it on the chart. **Closed losses only** narrows the list to closed
     trades whose recorded net after costs and interest is below zero (open positions and breakevens excluded; the chart
     keeps every marker; a chart-selected trade hidden by the filter is explained, with **Show all trades**).
   - **Export research bundle** downloads a ZIP for independent review ([EXPORTS.md](EXPORTS.md)).
   - **Analysis** shows the metrics above, with "n/a — reason" where a figure does not exist.
   - **Parameters** shows every value with ON/OFF and the effective rules, read back from the immutable run.
5. **Clone to X = 6%.** Click **Parameters → Clone into new test…**, set X to 6 and click **Run Test**. This creates a
   new variation and a new run; the 5% run is unchanged.

The browser starts **one** backtest per click. There is no sweep, optimiser or batch control, and none will be added
to the UI.

### Exploratory example (not optimised; not a recommendation)

VGT, 2016-01-04 → 2023-12-29, daily, default exits, 5 bps. The data file is sha256 `2ee06310f2fa8926…`, read on
2026-11-04.

| | X 5%, N 20 | X 6%, N 20 |
| --- | ---: | ---: |
| Raw signals / taken / ignored (invested) | 116 / 52 / 64 | 109 / 54 / 55 |
| Closed trades (wins / losses), open at end | 51 (13 / 38), 1 open | 53 (13 / 40), 1 open |
| Exit reasons | stop 12, gap 1, max hold 38 | stop 11, gap 1, max hold 41 |
| Realized gross / costs / interest | $62,463.99 / $5,128.68 / $60,605.48 | $65,611.36 / $5,330.16 / $59,731.51 |
| Realized net | −$3,270.17 | +$549.69 |
| Unrealized net of the open trade (at 2023-12-29) | +$12,987.72 | +$12,987.72 |
| Total marked net | +$9,717.54 | +$13,537.41 |
| Max drawdown, minute / daily (of $100,000) | $73,618 (73.6%) / $73,385 (73.4%) | $59,530 (59.5%) / $59,208 (59.2%) |
| Sessions invested | 73.1% | 72.2% |

These are single exploratory runs on inspected data. Notes:

- Most losers exit by the maximum hold, 8–29 calendar days after entry (later when openings stayed profitable).
- Interest consumes nearly all of the gross.
- One open trade (entered 2023-11-03 at 421.85, marked at 484.00) carries most of the total.
- Neither figure is evidence of an edge.

## Tests

- `src/growth-trading/tests/riseTrading.test.ts` (part of the root `npm test`):
  - chronology, re-entry, and each exit rule with its exact boundaries;
  - the switches and the dependency;
  - accounting and drawdowns;
  - the absence of a restriction.
- `src/growth-trading/tests/parity.test.ts` (real data): exact parity with the Study 8 engine's D1 books (see the
  audit), and a VGT smoke run.
- `src/growth-trading/tests/offParity.test.ts` (real data): 1.1.0 with continuation OFF = the 1.0.0 baseline captured
  before the change (`tests/fixtures/baseline-1.0.0.json`, six cases, daily and intraday).
- `src/growth-trading/tests/continuation.test.ts`, `continuationRealData.test.ts`: the continuation methods
  ([GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md) §6).
- `apps/strategy-lab/tests/trading.test.ts`: the registry, validation, the API (create, clone, toggle, immutability),
  the runner allowlist, and the unchanged signal-only snapshot.
- `apps/strategy-lab/tests/real-data.test.ts`:
  - the trading run's raw signals equal the signal-only run's, at 1d and 60m;
  - per-symbol isolation and reproducibility.
- `apps/strategy-lab/e2e/trading.spec.ts`: the form and its switches; one Run Test; markers, trades and metrics in ET;
  the 5% → 6% clone; hold OFF; two-symbol isolation.
