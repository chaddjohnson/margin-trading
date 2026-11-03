# VGT minute strategy: baseline, semantics and golden master

The strategy being optimized is **`src/app/allIn.ts`**, the one-minute execution of the `allIn` margin strategy. The daily `src/app/allin-original.ts` was not used for anything. Both files are read-only for this study; their hashes were recorded before any work and verified again before and after every run:

| File | sha256 | git blob | State |
|---|---|---|---|
| `src/app/allIn.ts` | `71c5c327e8ef018066ad598ccc8532f68d28fa387b16577815f6782cf9ba70de` | `0d7af211…` | unchanged (uncommitted working-tree version, see below) |
| `src/app/allin-original.ts` | `e847308570b9702f5b9a2999de7c943a137f93ae37598e510396b7b9c091b2f5` | `9958620b…` | unchanged during the study; afterwards reverted by the owner to the committed version (`42f2b7e7…`), which `verify-protected` now checks |
| `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f` | – | unchanged, not re-audited |

Before-hashes: `baseline/protected-hashes-before.txt` (2026-10-15T13:39Z). `npm run minute-optimizer -- verify-protected` re-checks them. Every `run`, `freeze` and `final-evaluation` also checks them, and so do the golden master and the test suite.

## Parameter inventory (verified in the code)

| Constant in `allIn.ts` | Value | Gene | Exact semantics |
|---|---|---|---|
| `targetPercentChange` | 0.025 | `dipTenths` = 25 | Entry when `1 − decisionPrice / recentHigh ≥ 0.025`, with no position open. |
| `trailingStopPercentage` | 0.021 | `trailingStopTenths` = 21 | Stop = highest price since entry × (1 − 0.021). Set once per session from prices up to the previous session's close; never moves down. |
| `maximumHoldDays` | 8 | `maximumHoldDays` = 8 | **Calendar days**: due when `(session date − entry date) / 86,400 s ≥ 8` and a sale at the session's opening trade would lose money after accrued interest. Then sells at the next observed trade. |
| `tickWindowSize` | 78 | `lookbackSessions` = 78 | `recentHigh` = highest session high (regular minutes and the closing print) of the previous 78 **trading sessions**, excluding the signal session. |
| `materialLossThreshold` | 0.022 | `materialLossTenths` = 22 | A closed trade with **ETF price return** `exit / entry − 1 ≤ −2.2%` restricts re-entry. Interest and financing are excluded. |
| `lowerPriceReentry` | 0.04 | `lowerReentryTenths` = 40 | While restricted, an entry also needs `decisionPrice ≤ lossExitPrice × (1 − 0.04)`. |
| `retraceFraction` | 0.367 | `retraceTenths` = 367 | The restriction clears at a close ≥ `episodeLow + 0.367 × (frozen reference high − episodeLow)` while flat. |
| `investmentAmount` | 100,000 | fixed | Dollars borrowed per entry; fractional shares = 100,000 / fill price. Never compounded. |
| `marginInterestRate` | 0.11 | fixed | Simple interest on $100,000 per calendar day, 365-day year, from the entry date. No interest on the entry day. |
| `stopFill` (CLI) | `stop` | fixed | Default fill of an intraday stop trigger. `next-open` is used only as a sensitivity. |

The genes are integer tenths of a percentage point (or whole days/sessions). The working copy converts them once as `tenths / 1000`, which gives the same double as the original's literal (25/1000 === 0.025, 21/1000 === 0.021, 367/1000 === 0.367).

## Minute execution semantics (preserved, not changed)

All of the following were read from `allIn.ts` and `src/lib/session.ts` and reproduced exactly. The golden master below, and the scenario tests in `src/minute-optimizer/tests/scenarios.test.ts`, check them against the original itself.

- **Sessions.** `groupMarketSessions` keeps regular-session minutes in America/New_York (09:30 to the scheduled close, 16:00 or 13:00 on the listed early-close dates) plus the closing-auction print in the minute starting at the close. Extended-hours rows are dropped. Each session's `time` is midnight UTC of its New York date, so calendar-day arithmetic works across DST.
- **Entry decision** one minute before the scheduled close, on the close of the last completed minute (the 15:58 minute; 12:58 on early closes). The day's close, high and low are never used.
- **Entry fill** at the first trade at or after the decision: the 15:59 minute's open, else the closing print, else **no entry**. The no-fill case is counted. It happens once on the full range, on 2019-08-12, and is kept as is.
- **Restriction check at the decision.** The decision price provisionally counts toward the episode low, without being stored. A price at or above the reset level blocks the entry: the reset takes precedence and never buys. Otherwise the lower-price condition applies.
- **Trailing stop.** On the entry day the post-entry high is max(fill, session close, highs of the fill's minute onwards), and the stop is set from it for the *next* session. After each held session it is raised from the session high. A session's own prices never move its own stop.
- **Profit-conditional activation**, decided before each open: the stop is active only if a fill at the stop price would be profitable after interest accrued through that session date. Growing interest can switch it off again.
- **Order within a held session:**
  1. If the stop is active and the session opens at or below it, the position sells at the opening trade (`trailing stop gap`), even at a loss.
  2. Else, if the maximum hold is due, it sells at the next observed trade after the first minute (or the closing print). If there is none, it holds another session.
  3. Else, if the stop is active, the first minute whose low reaches it triggers. The fill is that minute's open if it opened at or below the stop, otherwise the stop price (`stop`), or the next observed trade after the minute (`next-open`). If no later trade exists, the fill is the triggering minute's close.
  4. The closing print is never a stop trigger.
- **Re-entry restriction.** A closed trade with price return ≤ −material loss freezes:
  - the loss-exit execution price;
  - the reference high used by the losing trade's entry;
  - the lower level, loss exit × (1 − lower re-entry).

  The episode low starts at the exit session's close and takes every later close. At each session's end while restricted:
  - a position opened that session clears the restriction (lower-price re-entry);
  - else, if flat, a close ≥ the reset level clears it (recovery reset).

  A smaller price loss, a loss caused only by interest, or a profit leaves trading unrestricted.
- **Accounting.**
  - Net P&L = realized + the open position marked at the last close, net of interest accrued through that session.
  - The daily drawdown samples the mark at each close.
  - The minute drawdown samples each regular-session minute's close and the official close, with the position counted from its fill's minute to its exit's minute.
  - Dividends are **not** modeled: prices are raw Alpaca prices, and ex-dividend drops are price moves. Cash dividends earned while holding are therefore missing from every figure in this study, for every strategy alike.

## Discrepancies with the brief, and other facts worth knowing

1. **The header comment of `allIn.ts` is stale.** It still describes a 10% dip, 8% stop, 90 sessions, 1% loss, 2% lower re-entry and 38% reset, and the strategy label is `material1-lower2-retrace38`. The constants are the brief's 2.5% / 2.1% / 8 / 78 / 2.2% / 4.0% / 36.7%. These constants are an **uncommitted working-tree change**: git `HEAD` (b7abde6) has 10% / 8% / 15 / 90 / 1.0% / 2.0% / 38.0%, which this study uses as the "deep-dip" diagnostic control. The study used the file exactly as it is on disk, as the brief requires.
2. **The incumbent is not a neutral baseline.** 2.5% / 2.1% / 8 / 78 / 2.2% / 4.0% / 36.7% is exactly the VGT rank 1 of the earlier daily multi-asset optimizer, which was fitted on 2014–2023 daily data. It is therefore in-sample for every walk-forward validation year here (2020–2023), and the comparison is tilted in its favour.
3. **`allin-original.ts` was also edited in the working tree** (same new constants) after the daily study froze its hash, so that study's own golden-master tests (`src/optimizer/tests/goldenMaster.test.ts`) failed during this study. The failure was pre-existing and not caused by this study. After the study, the owner reverted the file to its committed version, and those tests pass again. Nothing in `src/optimizer/` or the daily study's outputs was changed.
4. **The minute file starts on 2016-01-04**, not 2016-10-07. The brief's training start (2016-10-07) is kept. The 193 earlier sessions serve only as reference-high history. Lookbacks above 193 sessions therefore see a truncated window for at most their first 57 training sessions (October–December 2016). This never affects a validation year or the final evaluation.
5. **The file ends on 2025-10-13** (2,459 sessions, 797,115 regular-session minutes, 809,490 rows including extended hours). There are no 2026 minute bars, and none were invented or substituted.
6. **No data audit was repeated.** The file was only hashed and loaded through the verified loader. No material data issue was encountered that would change execution. The 2019-08-12 no-fill session behaves as the brief describes.
7. **The default stop fill is `stop`** (fill at the stop price when a minute trades through it). This is optimistic in fast markets; `next-open` is reported as a sensitivity for every finalist.

## Golden master

### Full-range reference (original `allIn.ts`, unmodified, on the local file)

`npm run app allIn VGT 2016-10-07 2025-10-13 data/VGT/VGT-2016-2025-1-minute.csv <dir>` reproduces the brief's reference exactly. With the start date, the original cuts the reference-high history at 2016-10-07 and skips that first session, as it always has. The full-precision outputs are saved in `baseline/allIn-full-range-original/` (trades.csv, daily.csv, states.csv, episodes.csv, summary.json, console.txt).

| Metric | Brief's reference (rounded) | Local golden master (full precision) |
|---|---|---|
| Range | 2016-10-07 → 2025-10-13 | 2016-10-07 → 2025-10-13 (2,266 sessions) |
| Completed trades | 170 + 1 open | 170 + 1 open |
| Realized net profit | $200,914 | $200,914.42413076814 |
| Unrealized net profit | $2,491 | $2,490.7860865010675 |
| Total net profit | $203,405 | $203,405.2102172692 |
| Margin interest | $62,564 | $62,564.383561643765 |
| Max drawdown, daily-sampled | $21,545 | $21,544.592211661104 (2025-01-23 → 2025-04-08) |
| Max drawdown, minute-sampled | $25,526 | $25,526.47747941222 (2025-01-24 09:30 → 2025-04-07 09:42 ET) |
| Entry decisions without a trade after them | 1 | 1 (2019-08-12) |
| Restrictions / lower-price re-entries / recovery resets | – | 27 / 16 / 11 |

There is no discrepancy. Note that the full-range drawdowns occur in 2025, inside the final-evaluation period. That is the incumbent's own already-known result and is not a property of any candidate.

### Equivalence results (`npm run minute-optimizer -- golden-master` → `baseline/golden-master.json`)

| Layer | What is compared | Cases | Result |
|---|---|---|---|
| 1. Original vs working copy at the original's constants | every output file (trades.csv, daily.csv, states.csv, episodes.csv, summary.json) and every console line, byte for byte | 16 date ranges on the real file, both stop fills: the full range, the whole file, each year 2017–2023, an early-close and DST window, the 2019-08-12 no-fill, the 2020 crash; plus 4 synthetic files | **20 / 20 identical** |
| 2. Variants of the original vs working copy | the same byte-for-byte comparison; the variant is a scratch copy of `allIn.ts` with only its 7 constant lines replaced | 8 corner vectors and 40 random grid vectors on real data (ranges ending ≤ 2023-12-31) + 12 vectors on each of 4 synthetic files | **96 / 96 identical** |
| 3. Fast engine vs working copy | every trade field, all totals, interest, exposure, restrictions, daily drawdown, per-year marks and cost levels, exact. Minute drawdown allowed 1e-6 (closed form) | 309 vectors × windows with and without warmup on real data, incumbent full range (both fills), 4 synthetic files × 13 vectors × cold/warm | **415 / 415 identical**; largest minute-drawdown gap **0** |

Paths exercised across layer 3:

- every entry and exit execution type (first trade after decision, closing print, opening trade, stop level, minute open through stop);
- every exit reason, including open positions at the cutoff;
- restrictions (205 cases), lower-price re-entries (142), recovery resets (108) and no-fill entry decisions (61).

The remaining `next-open` fallback ("trigger minute close"), the early close, the DST switch, once-a-day stop updates, profit-conditional activation and calendar-day maximum holds are covered by hand-written scenarios, run on the original, the copy and the engine (`tests/scenarios.test.ts`).

The synthetic files (`src/minute-optimizer/fixtures.ts`) are seeded minute random walks of 160 sessions each. They contain gaps, missing minutes, single-minute sessions, sessions without any trade after the decision, early closes and extended-hours rows.

The golden master was run before any optimization and again on the final, formatted code before the full run: identical results both times (173 s).

### Test suite

`npm test` includes `src/minute-optimizer/tests/*.test.ts`: 30 tests, all passing. They cover:

- protected files unchanged;
- full-range byte equivalence;
- variants and engine equivalence;
- no look-ahead: later sessions never change a window, the decision price comes from completed minutes only, a session is never in its own reference high;
- open position and accrued interest at cutoffs, flat starts, history limits;
- the research-view lock and the final-evaluation capability;
- strictly chronological folds;
- cost-layer reconciliation: zero cost equals the cost-free figures exactly, costs equal rate × turnover, decisions unchanged;
- 0.1 pp quantization and grid sizes, canonical IDs, Sobol reproducibility;
- identical results in-process and with 1, 2 or 3 workers.

During the study, the daily study's tests in the same suite failed for the pre-existing reason in point 3 above; after the revert, the whole suite passes.
