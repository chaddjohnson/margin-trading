# Baseline equivalence (golden master)

**Result: the study engine reproduces the unmodified `src/app/allIn.ts` byte for byte.** That holds on all 7 golden cases and all 5 output files of each case (`trades.csv`, `daily.csv`, `states.csv`, `episodes.csv`, `summary.json`), under both stop fills, at 0 bp. The control used in every experiment is therefore the incumbent itself, not an approximation of it.

- Machine-readable proof: [`baseline/golden_master.json`](baseline/golden_master.json). It holds per-file SHA-256 hashes on both sides, and the summaries.
- Raw outputs of both sides: [`baseline/golden/<case>/{allIn,engine}/`](baseline/golden/). The `allIn/console.txt` file keeps the incumbent's own console report.
- The run used Node v23.6.1, git HEAD `0bebfd06`, `allIn.ts` sha256 `71c5c327…` (working tree) and data sha256 `600322af…`.

## How the comparison is made

`npm`-free command: `node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts intradayStudy golden-master`.

For each case, the golden master does three things:

1. It calls the incumbent's exported `runAllIn({ startDate, endDate, dataFile, outDir, stopFill })`, unmodified, and captures `console.info` into `console.txt`.
2. It runs the study engine (`src/intraday-study/engine.ts`) with `CLOSE_1M` + `STOP_DAILY` at 0 bp. The engine uses the same session array that `allIn.ts` builds: the same loader, the same grouping and the same date filter.
3. It writes the engine's output in `allIn.ts`'s exact format (`src/intraday-study/legacy.ts`) and compares the files as strings.

Two pieces of the engine are the incumbent's own exported functions: the `STOP_DAILY` exit (`evaluateSessionExit`) and the fill rule (`firstTradeFrom`). Everything else is the study's own code: the session loop, entries, the restriction state machine, interest, marks and drawdowns.

| Case | Range (sessions) | Stop fill | Trades | Net P&L | Interest | Daily DD | Minute DD | Restrictions / LPR / resets | No-fill | Files |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| legacy-2016-10-07_2025-10-13-stop | 2016-10-07 → 2025-10-13 (2266) | stop | 170 + 1 | $203,405.21 | $62,564.38 | $21,544.59 | $25,526.48 | 27/16/11 | 1 | 5/5 identical |
| legacy-2016-10-07_2025-10-13-next-open | 2016-10-07 → 2025-10-13 (2266) | next-open | 170 + 1 | $202,684.10 | $62,564.38 | $21,544.59 | $25,526.48 | 27/16/11 | 1 | 5/5 identical |
| whole-file-stop | 2016-01-04 → 2025-10-13 (2459) | stop | 177 + 1 | $197,460.72 | $67,175.34 | $21,544.59 | $25,526.48 | 31/16/15 | 1 | 5/5 identical |
| whole-file-next-open | 2016-01-04 → 2025-10-13 (2459) | next-open | 177 + 1 | $196,878.83 | $67,175.34 | $21,544.59 | $25,526.48 | 31/16/15 | 1 | 5/5 identical |
| legacy-2024-01-02_2025-10-13-stop | 2024-01-02 → 2025-10-13 (447) | stop | 32 + 1 | $51,759.86 | $12,687.67 | $21,544.59 | $25,526.48 | 6/4/2 | 0 | 5/5 identical |
| legacy-2024-01-02_2025-10-13-next-open | 2024-01-02 → 2025-10-13 (447) | next-open | 32 + 1 | $51,810.11 | $12,687.67 | $21,544.59 | $25,526.48 | 6/4/2 | 0 | 5/5 identical |
| legacy-2020-01-02_2020-12-31-stop | 2020-01-02 → 2020-12-31 (253) | stop | 21 + 0 | $35,841.84 | $6,750.68 | $17,542.68 | $19,369.94 | 5/2/3 | 0 | 5/5 identical |

The first row is the brief's reference, reproduced exactly:

- 170 closed trades plus 1 open;
- net $203,405.21;
- interest $62,564.38;
- daily DD $21,544.59 (2025-01-23 → 2025-04-08);
- minute DD $25,526.48 (2025-01-24 09:30 ET → 2025-04-07 09:42 ET).

The full-range reference's file hashes match on both sides:

| File | sha256 |
|---|---|
| `trades.csv` | `e8ef95a5…` |
| `daily.csv` | `5f0bfbb5…` |
| `states.csv` | `b3b84d36…` |
| `episodes.csv` | `43cdd605…` |
| `summary.json` | `e3a31621…` |

The same engine is also checked against `allIn.ts` on three seeded synthetic minute files, under both fills (`src/intraday-study/tests/engine.test.ts`). These files contain things real data rarely or never has:

- opening gaps through stops;
- missing minutes;
- single-minute sessions;
- sessions with no trade after the decision;
- early closes;
- DST changes;
- extended-hours rows that must be dropped.

All of these comparisons are byte-identical too.

## Legacy (cold) start vs the research warm start

`allIn.ts` with a start date filters the session array to the window. In the first 78 sessions, the reference high therefore only sees sessions since the start date, and the first session is skipped entirely. This study calls that the **legacy start**, and uses it only for the golden master. The **research baseline** used in every comparison is the **warm start**:

- every session from 2016-01-04 is loaded;
- the 78-session reference high has full history;
- the strategy starts flat and unrestricted on 2016-10-07, and that session is tradable.

Every policy and window in the study uses this one history policy.

| Run (CLOSE_1M, daily stop, stop fill) | Trades | Net 0 bp | Net 5 bp | Interest | Daily DD | Minute DD 0 bp | Minute DD 5 bp |
|---|---:|---:|---:|---:|---:|---:|---:|
| Legacy start 2016-10-07 (allIn.ts) | 170 + 1 | $203,405.21 | – | $62,564.38 | $21,544.59 | $25,526.48 | – |
| **Warm start 2016-10-07 (research baseline)** | 170 + 1 | **$203,405.21** | **$186,172.23** | $62,564.38 | $21,544.59 | $25,526.48 | $25,914.30 |
| Warm start, `next-open` | 170 + 1 | $202,684.10 | $185,451.48 | $62,564.38 | $21,544.59 | $25,526.48 | $25,914.30 |
| Legacy start 2024-01-02 (allIn.ts) | 32 + 1 | $51,759.86 | – | $12,687.67 | $21,544.59 | $25,526.48 | – |
| **Warm flat start 2024-01-02 (research)** | 32 + 1 | **$50,384.94** | **$47,053.39** | $12,717.81 | $21,544.59 | $25,526.48 | $25,914.30 |

What the comparison shows:

- **On the main window the two history policies give identical trades** (`researchBaseline` in the JSON; the warm run's trade list equals the legacy list entry for entry). The truncated October–December 2016 reference high never changed a decision, so the 2016-10-07 truncation has no effect on this window. It is still disclosed, and the warm start is used as the protocol requires.
- **On the 2024-01-02 window the two policies differ** by $1,374.92 at 0 bp. A cold start there truncates the reference high in early 2024. This is the example of why a cold baseline must never be compared with warm variants.
- The warm 2024–25 flat-start figure, $47,053.39 at 5 bp, equals the incumbent figure the earlier minute-optimizer study reported for the same period.
- The code path itself is checked as well. A warm-start run whose window starts at the file's second session gives `trades.csv`, net, daily DD and minute DD identical to the whole-file `allIn.ts` run, under both fills (`warmStartCodePathMatchesWholeFile`).

## Facts about the source that the brief or comments get wrong (the source wins)

1. **Stale header in `allIn.ts`.** The header comment still describes the old configuration, and the strategy label is `material1-lower2-retrace38`:
   - a 10% dip, 90 sessions, an 8% stop and a 15-day loss exit;
   - re-entry rules of 1% / 2% / 38%.

   The constants are 2.5% / 2.1% / 8 calendar days / 78 sessions / 2.2% / 4.0% / 36.7%, with $100,000 at 11%, exactly as the brief lists them. Every experiment uses the constants.
2. **What the incumbent's semantics are, as verified in the code:**
   - Activation is profit-conditional (the stop fill must be profitable after interest accrued through the session date) and is re-decided before every session.
   - The maximum hold is due only when a sale at the opening trade would lose money after interest. It then fills at the next observed trade, and not at all that session if there is none (in which case no stop is checked that session either).
   - The closing print never triggers a stop.
   - The material-loss test uses the price return only.
   - The lower-price level is 0.96 × the losing exit's actual fill.
   - At the decision, the provisional episode low lets the reset take priority over a purchase.
   - The episode low takes session closes only.
   - The restriction is cleared by an entry, or by a close at or above the reset level while flat, including on the exit session itself.

   All of this matches the brief.
3. **The one no-fill session.** The 15:59 decision on 2019-08-12 has no later regular-session trade and no closing print, so there is no entry. This is the incumbent's behaviour and is kept.
4. **`src/app/allin-original.ts` has an uncommitted working-tree edit**, present before this study started. Its default data file was changed from `VGT-2016-2026.csv` to `VGT-2026.csv` (sha256 `38bd247b…`). It is unrelated to this experiment, was not used, and was not touched. Because of this edit, three pre-existing repository tests fail: the protected-file checks of the earlier daily and minute optimizer studies, which compare against the committed version. See [RISK_AND_EXECUTION.md](RISK_AND_EXECUTION.md#7-tests).
