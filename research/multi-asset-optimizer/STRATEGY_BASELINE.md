# Strategy baseline: the original daily `allIn` and its working copy

## The files

| | Path | Notes |
|---|---|---|
| Original (read-only) | `src/app/allin-original.ts` | Committed in `b7abde6`. sha256 `42f2b7e7be4ef99e1af6c4fe113dd8da9ed4d329d2fe0564463db80b87f449e2`, git blob `6cdebca1c3590094894df1a9267d8d57cc47e210`. Never edited, formatted, renamed or moved. A test fails if a single byte changes. |
| Working copy | `src/app/allIn-optimizable.ts` | Parameterized, with a pure `simulateAllIn()` core and the same command-line outputs. |
| Minute strategy | `src/app/allIn.ts` | Untouched: `git diff` against the branch head is empty for it and for `src/lib` and `src/types`. |

Two provenance notes:

- **Filename case.** The brief names `src/app/allIn-original.ts`; the file is committed and on disk as `allin-original.ts` (lowercase *i*). macOS's case-insensitive filesystem resolves both spellings to the same file. Everything here refers to the committed spelling.
- **Origin.** Its content equals `main`'s current `src/app/allIn.ts` except that `main` starts with two extra comment lines (`// All in at 15%` and `//`). The logic is identical.

## What the original actually does

Read from the code. Where this differs from the brief's shorthand, the code wins (see [Discrepancies](#discrepancies-with-the-briefs-shorthand)).

**Data and window.** The original loads `date|open|high|low|close|volume` rows and keeps those between the optional start and end dates. The reference high on session *i* is the highest *high* of the up to 90 sessions before *i* **within the filtered range**, so the first 90 sessions of a run use a shorter window. The first session only seeds the window.

**Entry.** When flat, it buys if `1 − close / referenceHigh ≥ 10%`. It buys at that session's close, $100,000 / close shares (fractional), with $100,000 borrowed. The signal and the fill use the same close. Only one position is ever open.

**Exits.** Exits are checked from the session after the entry, in this fixed order each session:

1. *Maximum hold*: if at least 15 **calendar** days have passed since the entry (timestamps, not sessions) **and** selling at the open would lose money after interest accrued through the session, sell at the open.
2. *Stop gap*: the stop is **active** for the session only if a fill at the stop price would be profitable after interest. This is decided before the open, afresh each session, so growing interest can switch it off. If active and the open is at or below it, sell at the open, even at a loss.
3. *Trailing stop*: if active and the session's low reaches it, sell at exactly the stop price.

If the maximum hold fires while the open also gaps through an active stop, the single fill is credited to the maximum hold. There is no exit on the entry session and no re-entry on an exit session.

**Stop updates.** At entry, the post-entry high is the entry close and the stop is 92% of it. After each session without an exit, the high rises to that session's high and the stop to `max(stop, high × 0.92)`. The stop never falls, and a session's own high never moves that session's stop.

**Re-entry restriction** (the "0.5% / 3% / 38%" mechanism):

- An exit whose *price* return `exitPrice / entryPrice − 1` is **≤ −0.5%** restricts re-entry; interest is excluded. A smaller price loss, or a loss caused only by interest, does not.
- The restriction freezes the exit's fill price, the losing trade's entry-signal reference high, and a lower level of `exitPrice × 0.97`. It then tracks the lowest close since the exit session (the episode low, including that session).
- While restricted, a signal can buy only if the close is at or below the lower level **and** below the reset level. The reset level is `episodeLow + 38% × (frozen reference high − episodeLow)`, computed with today's close already in the episode low.
- At each restricted close the restriction clears in one of two ways. If a position opened at that close, it clears (lower-price re-entry). If still flat and the close is at or above the reset level, it clears (recovery reset). A reset never buys on that session; entries resume the next session.

**Financing and accounting.**

- Interest is simple: `$100,000 × 11% × (calendar days held / 365)`, with none on the entry day. At an exit it is charged through the exit session, whatever the time of the fill.
- Trade P&L = `shares × exit price − $100,000 − interest`.
- The daily mark to market is realized P&L plus `shares × close − $100,000 − accrued interest` for an open position.
- Maximum drawdown is the largest fall of that daily series below its running peak, which starts at $0.
- A position open at the end is reported at the last close, net of accrued interest.
- The $100,000 allocation is borrowed for every trade regardless of past results, so there is no compounding.

**Outputs.** Console log lines, plus `trades.csv`, `daily.csv`, `states.csv`, `episodes.csv` and `summary.json` at full precision when an output directory is given.

## Parameter inventory

Decision constants (tunable per symbol in the optimizer; bounds in OPTIMIZER_DESIGN.md):

| Constant in the original | `AllInParams` field | Units | Default | Valid domain | Exact effect |
|---|---|---|---|---|---|
| `targetPercentChange` | `dipTenths` | fraction (tenths of a percentage point) | 0.10 (100) | (0, 1) | Buy when `1 − close / referenceHigh ≥` it |
| `trailingStopPercentage` | `trailingStopTenths` | fraction | 0.08 (80) | (0, 1) | Stop = post-entry high × (1 − it); initial stop from the entry close |
| `maximumHoldDays` | `maximumHoldDays` | calendar days | 15 | integer ≥ 1 (0 behaves like 1) | From this many days after entry, sell at the open whenever that sale would lose money after interest |
| `tickWindowSize` | `lookbackSessions` | sessions | 90 | integer ≥ 1 | Sessions in the reference-high window |
| `materialLossThreshold` | `materialLossTenths` | fraction of price | 0.005 (5) | [0, 1) | An exit with price return ≤ −it restricts re-entry |
| `lowerPriceReentry` | `lowerReentryTenths` | fraction of price | 0.03 (30) | [0, 1) | A restricted re-entry needs a close ≤ loss-exit price × (1 − it) |
| `retraceFraction` | `retraceTenths` | fraction of the decline | 0.38 (380) | [0, 1] | Reset level = episode low + it × (frozen reference high − episode low) |

Fixed operational assumptions (not tuned):

| Constant | Value | Role |
|---|---|---|
| `investmentAmount` | $100,000 | Borrowed per position; shares = amount / entry close |
| `marginInterestRate` | 11% a year | Simple interest on the borrowed amount |
| 365-day year, 86,400-second day | | Interest and holding-period arithmetic |
| Entry fill | signal close | Same-close assumption (see below) |
| Stop fill | stop price, or the open on a gap | |
| Position limit | one | No pyramiding or overlap |
| Commissions, spread, slippage | none | |
| Prices | as given | Stooq back-adjusts for splits and distributions (DATA_AUDIT.md) |

**Dependencies and degenerate combinations.** No combination is invalid. Some switch rules off:

- A 0% retrace resets the restriction on the exit session itself, so the restriction never binds.
- A material-loss threshold larger than any realized price loss also switches the restriction off; the re-entry decline and the retrace are then inert.
- A lower level at or above the reset level makes the reset the binding condition.
- A stop wider than the dip can still trigger, but only once the position is profitable enough for the stop to be active.

Vectors that differ only in inert parameters produce identical trades; the shortlist treats them as behavioural duplicates.

## Discrepancies with the brief's shorthand

| Brief | Code |
|---|---|
| Dip-based entry around 10% | 10%, against the highest **high** of the previous **90 sessions** (the window length is not mentioned in the brief) |
| "Additional adverse-move exit (around 3%)" | **No such exit exists.** 3% is the extra decline below a losing exit's price that a restricted re-entry needs |
| Profit-conditional trailing stop around 8% | 8%. It is active only if a fill at the stop would be profitable after interest, re-decided before every session; a gap through it sells at the open even at a loss |
| 15-**trading**-day loss rule | 15 **calendar** days (timestamp difference). It sells at the open only when that sale would lose money after interest, and is checked every session from day 15 |
| Material-loss threshold around 1%; re-entry decline around 2% | **0.5% and 3%** in this original. 1% / 2% are the values in this branch's minute `src/app/allIn.ts` (commit `1d82867`) |
| "Another threshold around 0.5%" | That **is** the material-loss threshold: price return ≤ −0.5%, interest excluded |
| (not mentioned) | A 38% recovery reset clears the restriction |

## Equivalence evidence (golden master)

`npm run optimizer -- golden-master` runs the original and the working copy through their own command entry points on the same data file and date range. It compares every output file and every console line **byte for byte**, so no floating-point tolerance is needed or applied. Away from the defaults, a scratch copy of the original with only its constant declarations replaced serves as the reference; the original file itself is only read.

To keep 2024–2026 unseen before the freeze, every case ends on or before 2023-12-31.

**Result: 100 of 100 cases identical** (`baseline/golden-master.json` stores each case's data hash, parameters and output-file hashes, for detecting drift):

| Group | Cases | What they cover |
|---|---|---|
| Repository files | 3 | `VGT-2016-2026.csv` (default start), `VGT-2005-2026.csv`, `QQQ-1999-2015.csv` |
| Stooq series | 24 | All 21 prepared symbols through 2023-12-31, plus VGT 2014–2018, 2020 only, and 2008–2009 (date-filtered starts and ends) |
| Synthetic edge cases | 13 | Gap through an active stop; maximum-hold exits across a week-long market closure; restricted re-entry and recovery reset; no trades; position open at the end; 1- and 2-session series; six random walks with gaps and closures |
| Random parameter variants | 60 | 12 random grid vectors each on VGT, NVDA, IWN and two synthetic series, against generated variants of the original |

Across the cases, the exercised paths include:

- every exit reason, losses that do and don't restrict, lower-price re-entries, recovery resets, and restrictions unresolved at the end;
- trades open at a measurement boundary;
- flat periods.

On the 21 Stooq series through 2023, the original made between 22 (VOO) and 527 (AMD) closed trades.

**After the holdout unlock**, the same comparison was run on the complete data files, including 2024–2026: the default `VGT-2016-2026.csv` invocation and all 21 full Stooq series. Result: 22 of 22 identical (`baseline/golden-master-full-range.json`).

Further checks in `npm test`:

- the fast and detail modes of the working copy produce identical trades and totals;
- the original's bytes and git blob are unchanged, with no uncommitted edits.

## Execution assumptions to keep in mind

These are kept for equivalence and reported, not changed:

- **Same-close entry.** The signal uses the session's close and the fill happens at that close. Live, an order would have to go in shortly before the close using a provisional price. The earlier minute-level study measured the cost of executable timing for VGT.
- **Stop fills.** A stop-market order is assumed to fill exactly at the stop, or at the open on a gap. Real fills can be worse in fast markets, and the spread isn't modeled. Tight stops (2–3%) and frequent trading, which the optimizer finds attractive on several symbols, are the most exposed to this.
- **Maximum-hold exit.** It is decided on the open and filled at the open.
- **Daily-bar ambiguity.** Within a session, the open is processed first, then the low against the stop. The real order of the high and the low is unknown.
- **Financing.** A constant 11% simple rate. Real margin rates moved a lot from 2014 to 2026.
- **Adjusted prices.** Distributions appear as price. A trailing stop or dip computed on adjusted prices can differ around ex-dividend dates from one computed on the prices a broker shows.
