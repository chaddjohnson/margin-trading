# Prior intraday research and minute-backtest infrastructure: audit for the Intraday D1 (VGT) study

Written 2026-11-06T16:58Z (UTC). This was a read-only audit. Only this file was written. No test, optimizer or backtest
was run.

- **Repository state:** branch `research/intraday-d1-vgt`, HEAD `353e33f`. The working tree was clean apart from the
  untracked `research/intraday-d1-vgt/`.
- **Node:** v24.21.0 (`.node-version`).
- **Machine:** see §C.4.
- **Time zones:** file mtimes from `stat` are in the machine's local zone (+01:00). Every other time here is UTC
  unless it is marked ET.

**Data-discipline note.** Several prior reports print results for periods after 2024-12-31. This audit does **not**
reproduce any of them: P&L, drawdowns, trade counts or parameter rankings. Where such results exist, it names the
file and nothing more. Every number below is one of three things:
- a methodology or infrastructure fact;
- a data-quality fact;
- a result restricted to dates on or before 2024-12-31.

---

## A. Prior intraday / minute VGT research

### A.1 What exists

| Item | What it is | Date windows |
|---|---|---|
| `research/vgt-intraday-study/` + `src/intraday-study/` | Frozen-protocol hypothesis test, **no optimization**. Covers 11 entry policies, 2 stop models and 3 depth-conditional policies, all around the incumbent minute `allIn.ts` dip-buy. Protocol sha in `PROTOCOL.sha256` (`03418fd4…`). | `continuous` 2016-10-07→2025-10-13 (primary). `dev` slice 2016-10-07→2023-12-29. `forward_flat` 2024-01-02→2025-10-13. Ensemble: 29 quarterly flat starts, each to 2025-10-13 (`PROTOCOL.md` §3). |
| `research/vgt-minute-optimizer/` + `src/minute-optimizer/` + `src/app/allIn-minute-optimizable.ts` | Optimizes the 7 parameters of the same minute `allIn` strategy. Search: 4,096 Sobol candidates, then NSGA-II, inside an expanding walk-forward. | History-only sessions 2016-01-04→2016-10-06. Folds train 2016-10-07→2019/20/21/22, then validate the next year. Final dev run 2016-10-07→2023-12-31. Locked final evaluation 2024-01-02→2025-10-13 (`MINUTE_OPTIMIZER_DESIGN.md`, "Protocol"). |
| `research/risk-management/allin-minute-conversion/` | Conversion of the daily `allIn` to minute execution, with a minute-data audit (`IMPLEMENTATION.md` §2). | 2016-10-07→2025-10-13 |

All three read the **legacy** file `data/VGT/VGT-2016-2025-1-minute.csv` (sha `600322af…`). That file is now
archived as the first 809,490 rows of the canonical `data/VGT/data.csv`:
- `config/archive/legacy-research-inputs.json`;
- `src/lib/archive.ts:13-14, 62-63`.

It **contains 2025 rows**, through 2025-10-13. The new study must not use it for development.

**Post-2024 results exist but are not reproduced here.** They are in:
- the headline totals and drawdown tables of `vgt-intraday-study/README.md`, `CONCLUSIONS_AND_NEXT_STEPS.md` and
  `RISK_AND_EXECUTION.md` §5, which span 2016-10→2025-10;
- `vgt-minute-optimizer/MINUTE_FINAL_EVALUATION.md` and the final-evaluation paragraph of its README (2024–2025);
- `allin-minute-conversion/IMPLEMENTATION.md`, whose totals run to 2025-10-13.

### A.2 Did any of them build an intraday-scaled D1?

**No.** None of them touches the canonical D1. The multi-ETF allocator pins the D1 as
`src/app/allIn-trailingBuy-postExitContinuation.ts` (`src/multi-etf-allocator/context.ts:24`). None of the three
uses minute-scale windows or sub-percent stops.

- **The strategy they studied.** All three study `src/app/allIn.ts`. It is a *daily-clock* dip-buy on minute data:
  - one entry decision per session, at `close − 60 s`;
  - a 78-**session** reference high;
  - a trailing stop updated **once a day**;
  - an 8-**calendar-day** max hold;
  - a re-entry restriction (`vgt-intraday-study/PROTOCOL.md` §2).
- **The intraday study's "minute stop".** `STOP_MINUTE_CAUSAL` (`src/intraday-study/exits.ts:33-133`) only changes
  how often the stop updates (every completed minute). Its magnitude stays the incumbent's 2.1%
  (`exits.ts:57,128`, `incumbent.trailingStopPercentage`). It is labelled an "experimental exit rule, a different
  strategy" (`PROTOCOL.md` §6).
- **The minute optimizer's bounds** (`MINUTE_OPTIMIZER_DESIGN.md`, parameter table):
  - dip and trailing stop from 0.5%;
  - lookback 10–250 **sessions**;
  - max hold 1–60 **calendar days**.

  Decisions stay once per session. Small stops were reachable, but only as daily-clock stops.
- **The canonical D1 is already partly intraday.** Per its header (`allIn-trailingBuy-postExitContinuation.ts:23-80`):
  - arming and the trailing-buy rebound are evaluated on every completed minute;
  - stops trigger minute by minute.

  Its other time units are coarse:
  - the reference high (`tickWindowSize = 74` sessions, `:580`);
  - the continuation window (60 sessions, `:553`);
  - the stop *level* update (once daily after the close, header lines 59-61);
  - max hold (8 calendar days, `:592`; `daysHeld` at `:200, :296`);
  - interest (calendar days, `calculateInterest` `:686-689`).

  These are the quantities an Intraday D1 must re-express. Mapping them is the D1-fidelity audit's job; it is not
  repeated here.

### A.3 Pre-2025 conclusions about intraday edges, costs and fills

**vgt-intraday-study.** The verdict, under its predeclared rules: "argues against" further optimization of
intraday entry, depth-conditional entry or minute-updated stops for that strategy (`CONCLUSIONS_AND_NEXT_STEPS.md`).

The pre-2025 findings:
- **Early entry was regime-dependent and mostly harmful.** Against the close-time incumbent, intraday entries lost in
  Q4 2018 (−$2.7k to −$15.3k) and in 2022 (−$6k to −$39k). The only period where most rules gained was Feb–Apr 2020
  (+$10.6k to +$19.8k for 9 of 10 rules) (`CONCLUSIONS…` Q2).
- **Mechanism.** Buying first touches of a 2.5% dip that kept falling, rather than buying at the close. The study
  concludes that the close-time decision acts as a *filter*. Its advice: "treat the close-time entry as load-bearing".
- **Confirmation did not fix it.** Persistence (15/30 minutes), "no new low" stabilization and 0.3%/0.5% rebound
  confirmation did not help consistently. Their gains came almost entirely from March 2020.
- **Too few deep episodes.** The deep and extreme depth bands rest on about four independent market episodes, which
  is too few to support a band-specific rule.
- **Minute-updated stop.**
  - Same-session churn was modest.
  - It "mostly preserves rebounds".
  - A same-session round trip pays **zero interest but two fees** (`RISK_AND_EXECUTION.md` §4).
- **Fills** (`RISK_AND_EXECUTION.md` §3):
  - The `stop` fill (at the stop price when a bar trades through it) is **optimistic**.
  - `next-open` (the next observed trade) is only a proxy.
  - No bid/ask exists, so the spread is not modelled.
  - For those 2.1%-stop strategies the fill choice was a second-order effect. The study's numeric evidence for that
    spans 2025 and is not quoted. For a ~0.3% stop it will be first-order: see §D.5.
- **Accounting conventions to watch:**
  - Interest is charged on calendar days from the entry *date*, with no entry-day interest. That "ignores the time of
    day" and favours intraday entries (§4).
  - Dividends are not credited (raw prices).

**vgt-minute-optimizer.** Development-only evidence: walk-forward folds 2020–2023 and in-sample 2016–2023.
- **In-sample, gains did not transfer.** The search found vectors about $15k–$39k better than the incumbent over
  2016-10→2023 at 5 bp.
- **Out of sample, the procedure lost.** The walk-forward policy lost −$4,056 in total over 2020–2023, against
  +$72,671 for the incumbent. It led in 1 of 4 folds. In 2022 it lost −$27,197, against +$13,796 (README, executive
  summary).
- **Unstable optima:**
  - Fold rank 1s spanned 0.6–3.8% dips, 2.1–6.3% stops, 9–37-day holds and 144–210-session lookbacks (stability
    score 0.39).
  - Independent seeds picked lookbacks of 204 and 136, where the main run picked 10.
  - The 2016–2023 rank 1 sat at the lookback bound, with only 43% of its neighbourhood feasible.
  - The shortlist was all "shallow-dip, tight-stop" variants.
- **Lesson for the new study:** tight-stop and shallow-dip regions over-fit single minute paths. "Single-path totals
  [are] knife-edge on individual stop fills" (README, caveats). Neighbourhood merit is essential.

**allin-minute-conversion.** A data audit and the minute execution model (`IMPLEMENTATION.md` §§2-3). Its data facts
are summarized in §D.

### A.4 Reusable code

| Need | Reusable piece | Notes |
|---|---|---|
| Fast typed-array minute dataset (full OHLC per minute) | `Dataset`, `fixtureDataset(sessions)` (`src/four-family/data.ts:19, 171`) | `SharedArrayBuffer` arrays `bTime/bOpen/bHigh/bLow/bClose` per minute, plus per-session arrays. Already used on canonical data by `src/portfolio-aware-d1/nbook/universe.ts:83`. `researchDataset` (`:127`) filters after a full load. |
| Precomputed fill/trigger index | `MinuteDataset`, `buildDataset` (`src/minute-optimizer/data.ts:142-298`) | Next observed trade after each minute (`bNextPrice/bNextBar`), running-min trigger key with binary search, and closed-form minute-drawdown prefix stats. These suit a daily-clock strategy. For per-minute state machines, reuse the `bNext*` idea. |
| Next-trade fill rule | `firstTradeFrom` (`src/app/allIn-minute-optimizable.ts:165`); typed-array versions `firstTradeFrom`/`firstTradeAfterDecision` (`src/shared-margin-portfolio/strategy.ts:111,125`) | Fill = open of the first bar with `start ≥ decision`, else the closing print, else none. |
| Conservative same-bar policy | `evaluateMinuteSessionExit` (`src/intraday-study/exits.ts:33-133`) | Open is checked before low. A bar's high raises the stop **for the next bar only**. The fill's own bar never triggers. Closing print never triggers. `stop` / `next-open` fills. Tested: "never uses a minute's high to stop that same minute". |
| D1 research engine (typed arrays) | `EntryMachine`, `ExitManager`, `Levels` (`src/shared-margin-portfolio/strategy.ts:173, 425, 454`); `ShadowBook` (`src/multi-etf-allocator/shadow.ts`); `traceBook` (`src/portfolio-aware-d1/trace.ts:128`) | The Study 8 D1 path. A reference for parity. **Do not modify**: these are pinned by trace code hashes (`trace.ts:25-30`). |
| Cost model | `ShadowBook.buyPrice/sellPrice` = raw × (1 ± bps) (`shadow.ts:117-123`), plus `stopSlippageBps` on stops (`:277`); Study 8 stress grid (`src/study8-expanded-regime-d1/context.ts:28-36, 223-239`: cost 0/2/10/20 bp, rate 8/14%, next-open, slip 10/25 bp) | The minute optimizer and the intraday study instead keep costs as an accounting overlay that never changes signals (`MINUTE_OPTIMIZER_DESIGN.md`, "Objectives, constraints, costs"). |
| Interest | `interestOn` (`strategy.ts:150-151`): simple, `rate × days/365` from the entry session's midnight-UTC date | Gives **zero** interest for same-session round trips. The brief requires accrual by actual exposure: an explicit, documented adaptation. |
| Search primitives | `Sobol` (`src/optimizer/sobol.ts:100`), `Rng`/`deriveSeed` (`src/optimizer/rng.ts:5,12`), `nsga2.ts`, `explorationGenomes`/`runSearch` (`src/optimizer/search.ts:161,256`), grid utilities (`src/optimizer/params.ts`) | Reused unchanged by the minute optimizer and by Study 8. |
| Worker pool | `WorkerPool`/`LocalEvaluator` (`src/minute-optimizer/pool.ts`, `worker.ts`) | Long-lived `worker_threads`. Datasets are sent once as `SharedArrayBuffer`s. Chunk size 32. Per-task timeout. Results come back in request order, so they are independent of worker count (tested). |
| Synthetic minute files | `writeMinuteFixture` (`src/minute-optimizer/fixtures.ts:61`) | Seeded. Covers gaps through stops, missing minutes, single-minute sessions, no trade after a decision, early closes, DST and extended-hours rows. |
| Liquidity check | Capacity assessment (`src/d1-robust/assess.ts:150-190`; constants `src/d1-robust/context.ts:406`: participation 10%, 5-minute window, 2-minute delay) | Compares $100k with the dollar volume in the 5 minutes after the decision. |
| Data-access lock patterns | Research-view and one-time unlock capability (`src/minute-optimizer/data.ts:300-350`); Study 8 doors (§B.5) | |

---

## B. Engine infrastructure for minute backtests

### B.1 Loading minute bars

- **Canonical file:** `data/<SYM>/data.csv` (`canonicalDataFile`, `src/lib/dataset.ts:61-64`).
  - Headerless and comma-delimited: `"ISO-UTC-start-of-minute",open,high,low,close,volume`.
  - No trade counts (`src/lib/csv.ts:5-10`).
  - SIP feed, `adjustment=raw`, 1Min (`scripts/download.sh:45-46`).
- **`parseMinuteBar(fields, where)`** (`csv.ts:21-51`):
  - insists on a `Z` timestamp;
  - parses numbers strictly;
  - sets `trades = NaN`.
- **`loadCsvMinuteBacktestData(symbol, file, {fromTime,toTime,stats})`** (`csv.ts:102-133`):
  - streams through `csv-parse` with `for await` (`:113`);
  - refuses a non-ascending row (`:117-119`);
  - **does not stop at `toTime`**: it parses and checks *every* row and only discards rows outside the bounds
    (`:91` "Every row is still parsed and checked", `:123-129`).
- **`loadDatasetSessions(request)`** (`src/lib/evaluation.ts:251-283`) is the partition-aware loader.
  - `loadBounded` (`:237-246`) passes `toTime = end + 2 UTC days`. It still parses every row (`:236`).
  - It then hashes the **whole** file (`:281`, `sha256FileSync`), and so does `selectDataset` (`dataset.ts:122`).
- **The canonical D1 CLI file** loads the whole file too, then windows it
  (`allIn-trailingBuy-postExitContinuation.ts:579-587`).

**Conclusion: no existing loader stops reading at a date.** Each one either parses all rows (the lib loaders) or
loads everything and then filters into a "research view":
- `src/minute-optimizer/data.ts:305-315`;
- `src/four-family/data.ts:127`.

### B.2 Regular session, early closes, holidays, DST

- **`groupMarketSessions(ticks)`** (`src/lib/session.ts:59-123`):
  - keeps New York minutes in `[09:30, close]`. Here `close` is 16:00, or 13:00 when the date is in
    `nyseEarlyCloses` (`:7-9, :68-73`).
  - Bars `09:30..15:59` (or `..12:59`) are `session.bars`.
  - The bar starting **exactly at the close** contributes only its **open**, as `closingPrint` (`:104-106`).
  - All other bars are dropped. That covers pre-market, after-hours, and post-13:00 bars on early-close days.
  - A closing print with no regular trade doesn't create a session (`:80-83`).
  - The session close = `closingPrint ?? last bar close`. High and low include it (`:116-120`).
  - `openTime`/`closeTime` are Unix seconds of 09:30 ET and of the scheduled close (`:85-91`).
  - `time` = midnight UTC of the NY date.
  - Minutes without trades **have no bar** (`src/types/session.ts:13-15`).
- **Calendar** (`src/lib/calendar.ts`):
  - Coverage runs 2016-01-01→2026-12-31 (`:3`). Sessions outside it throw (`session.ts:75-77`).
  - 23 early closes, 2016–2026 (`:6-30`). The 2016–2024 entries look consistent with NYSE's published 13:00 closes.
    They were not re-checked against an external source here.
  - Holidays (`:34-140`, including the 2018-12-05 and 2025-01-09 mourning days) are used **only** by the data audit.
    Sessions are inferred from bars (`:32-33`).
- **Eastern time:** `newYorkOffset(ts)` (`session.ts:28-51`).
  - It uses `Intl.DateTimeFormat('America/New_York')`, cached per UTC hour, so DST switches are exact.
  - `formatNewYorkTime` (`:54-55`) prints `YYYY-MM-DD HH:MM ET`.
  - All 19 DST transitions in the legacy file show the open moving 14:30Z↔13:30Z
    (`allin-minute-conversion/IMPLEMENTATION.md:62`).
  - Tests: `src/lib/tests/evaluation.test.ts:106-115` (sparse sessions, early close, DST evening bars).

### B.3 Splits and the VGT 8:1 split

- **The registry:** `config/market-events/splits.json` (sha `e5bde427…`) records VGT ratio 8, effective 2026-04-21,
  from the Vanguard press release.
- **Adjustment** (`adjustSessionsForSplits`, `src/lib/corporateActions.ts:104-143`):
  - forward adjustment: prices from the effective date onward × ratio, volume ÷ ratio;
  - the run ends up in the share units of its first session;
  - sessions before the split are untouched, and a run not spanning a split is unchanged.
- **Where it applies:**
  - It runs inside `selectRunSessions` (`evaluation.ts:171-175`), i.e. for partition runs.
  - **Explicit files are never adjusted** (`corporateActions.ts:8-9`, `evaluation.ts:145-151`).
  - `splitFactor` (`:88-91`) is the helper.
  - `unexplainedSplitGaps` (`:146-166`) is the audit check.
- **Consequences:**
  - The 2016–2024 development window contains **no VGT split**.
  - The validation run spans it. A custom loader must call `adjustSessionsForSplits(sessions, 'VGT', readSplits())`
    itself, or route its sessions through `selectRunSessions`.
- **Invariance tests:** a split held across is economically invisible.
  - `src/multi-etf-allocator/tests/crossPath.test.ts` uses VGT 8:1.
  - `src/phenotype/tests/splitRun.test.ts`.
  - Both are listed in `complementary-etf-d1/DATA_AND_CORPORATE_ACTION_AUDIT.md` §4.
  - All D1 rules are percentage-based, so they are scale-free. Any absolute-price constant (for example a tick-size
    or spread floor in dollars) would **not** be. Express costs in bp.

### B.4 Partitions and the `optimization` access guard

`data/partitions.json` (sha `43893f3d…`):
- training 2016-01-01→2023-12-31;
- holdout 2024-01-01→2025-10-16;
- final 2025-10-17→open;
- all.

It is validated strictly (`src/lib/partitions.ts:87-176`).

The guard:
- `assertOptimizationPartition` (`dataset.ts:131-139`) throws unless the partition is `training`.
- `assertAccess` (`evaluation.ts:117-127`) applies it when `access === 'optimization'`. It also refuses explicit
  files under optimization.
- `loadDatasetSessions` calls it "before a byte is read" (`:254`).
- `optimizationDataset` (`dataset.ts:143-144`) is the convenience wrapper.

**A 2016-01-01→2024-12-31 window therefore cannot use `access: 'optimization'`.** It spans training and part of
holdout.

### B.5 Precedent: Study 8 had the same 2016–2024 training window

Study 8 trained on 2016-01-04→**2024-12-31** and tested 2025-01-02→2026-10-29 (`study8 PROTOCOL.md` §3.1-3.2).

Its doors (`src/study8-expanded-regime-d1/data.ts`):
- **Partition choice.** It uses `training` when the end ≤ 2023-12-31, else **`all` + explicit `endDate`** (`:33`).
- **Access label.** Under `all` it passes `'manual evaluation'`, "the only one [the loader] accepts there" (`:75`). The
  real purpose goes to an append-only door log, `results/doors.jsonl` (`:94-114`).
- **Gate.** It runs a sealed-stage precondition gate before reading (`:67`).
- **Assertion.** It asserts that the last loaded session ≤ the end (`:87`).

The protocol discloses that optimizing on 2024 is "a brief-authorized departure from the repository rule".

Limitation: through `loadBounded`, this still **parses every post-2024 row** and hashes the whole file. It only
guarantees that no later *session* exists in memory.

### B.6 A hard-cutoff development loader (recommended; `data/partitions.json` untouched)

These facts were measured on `data/VGT/data.csv` (sha `2ee06310…`, 935,608 rows, equal to `dataset-report.json`)
by reading timestamps only:

| Fact | Value |
|---|---|
| Rows with UTC time < 2025-01-01T00:00Z | **743,918** (lines 1–743,918) |
| Their bytes / sha256 | **42,469,694** bytes, `c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb` |
| Last pre-cutoff row | `2024-12-31T21:11:00Z` (16:11 ET, after-hours) |
| First post-cutoff row | `2025-01-02T12:26:00Z` |

Design: add a new, study-local module. Nothing in `src/lib` changes.

1. **Cutoff.** Use `cutoff = Date.parse('2025-01-01T00:00:00Z')/1000`, which is 2024-12-31 19:00 ET. That is after
   the last regular bar of the last development session and before any 2025 bar. Equivalently, use the first instant
   of the NY date after `2024-12-31`.
2. **Stream and stop.** Stream with `readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })`.
   For each line:
   - read only the timestamp field (strip quotes);
   - check strictly ascending order;
   - **break at the first row with time ≥ cutoff, before parsing its prices**;
   - otherwise strip the quotes from field 0 and call the exported `parseMinuteBar` (`csv.ts:21`).

   Then call `lines.close()` and `input.destroy()`.
3. **Fingerprint the consumed prefix.** Count its rows and sha256 it, and assert them against the pinned values above
   (protocol constants).
4. **Strictest variant.** Read with `fs.createReadStream(file, { start: 0, end: 42469694 - 1 })` and verify the
   prefix sha. Then not one post-2024 byte enters the development process, not even inside a 64 KB read-ahead chunk.
   The readline variant reads at most one chunk beyond the cutoff into a buffer, but never parses it. This mirrors the
   archive's `canonical-prefix` idea (`src/lib/archive.ts:13-14`).
5. **Build sessions.**
   - Call `groupMarketSessions(ticks)`.
   - Optionally pass the sessions to `selectRunSessions(sessions, { dataset: resolveDataset('VGT','all'), endDate:
     '2024-12-31', access: 'manual evaluation' })` (`evaluation.ts:139`). That gives the standard `WindowReport` and
     split handling, which is a no-op before 2026.
   - Do **not** call `loadDatasetSessions` or `selectDataset` in development code. Both read or hash the full file.
6. **Guard and log.** Wrap the loader in a study door, as Study 8 did:
   - refuse after the candidate freeze;
   - log each opening;
   - assert that the last session ≤ 2024-12-31.

   Keep the validation loader a separate function. It should take a one-time capability, as
   `issueUnlockCapability`/`unlockedDataset` do in `src/minute-optimizer/data.ts:328-350`, and be callable only once
   the freeze record verifies.

---

## C. Performance and parallelization

### C.1 Data volume (2016-01-04→2024-12-31, VGT)

- 2,264 sessions.
- 734,112 regular-session minute bars, about 324 per session (computed for this audit, timestamps and bar counts
  only).
- As typed arrays (5 × Float64 per bar), about 30 MB.

### C.2 Measured throughputs in the records

| Engine | Workload | Throughput | Source |
|---|---|---|---|
| Minute `allIn` fast engine (precomputed per-session index, O(1)/session + binary search) | 2016-10→2023, 1,819 sessions | 6,517 evals/s in-process; 31,039/s with 8 workers. Literal object-based copy: 20/s. Index ≈ 48 MB, RSS 0.5–1.1 GB. | `MINUTE_OPTIMIZER_DESIGN.md`, "Measured performance" (Apple M1 Pro, **not this machine**) |
| Study 8 D1 trace (`traceBook`/`ShadowBook`, per-minute driven, skips sessions that cannot arm) | VGT 2016-01-04→2024-12-31 | **5.55 ms per trace**, single thread, **on this machine**. Neighbourhood points 5.8–30.9 ms. Universe load 12.6 s for 5 symbols (full-file parse); RSS 1.7 GB. | `research/study8-expanded-regime-d1/results/pilot/pilot.json`; `PROTOCOL.md:11-13` |
| Intraday study (object-based per-minute session loop) | Full policy × stop × fill matrix plus a 29-start ensemble, 2016-10→2025-10 | about 80 s total; golden master about 20 s | `vgt-intraday-study/README.md`, "Reproduce" |

### C.3 Expected cost for an Intraday D1, an estimate not a measurement

- **Why it is slower than the D1 trace.** With minute-scale windows and sub-percent thresholds, arming will happen in
  most sessions. The D1 trace's session skipping (`sMinClose`, `four-family/data.ts:38`) will then rarely apply.
- **Single-thread estimate.** A tight typed-array per-minute loop over about 734k bars, using a monotonic deque for a
  rolling minute high and O(1) state updates, should cost about **5–30 ms per evaluation**.
- **Pool estimate.** With 14 workers that is about 500–2,800 evaluations/s.
- **Budget implications:**
  - a 100k-evaluation search takes about 1–4 minutes;
  - a Study-8-scale 10M point evaluations takes about 1–6 h wall.
- **Loading.** A CSV parse of the development prefix should take a few seconds. Load once per process.
- **Benchmark early.** A benchmark command, like `src/minute-optimizer/benchmark.ts`, should replace these estimates
  before the budget is frozen.

### C.4 How Studies 7, 8 and 9 parallelize

- **Process-level parallelism, no threads.** Each runs `research/<study>/scripts/run_jobs.sh <jobs-file> 12`, which
  is `xargs -P 12`. Each search or qualification job is **one single-threaded `npm run studyN` process** in its own
  process group:
  - Study 8: `SEARCH_AND_COMPUTE.md` §1, `PROTOCOL.md` §7.3; script `scripts/run_jobs.sh`.
  - Study 9B: 12 parallel jobs, 60.9 CPU-h search (`study9-phase-b/SEARCH_AND_COMPUTE.md` §7).
  - Study 7: 12–14 parallel jobs.
- **Data per job.** Each job opens its own data door, so the data is loaded once per process.
- **Caching:**
  - an in-memory bounded `TraceCache` (`portfolio-aware-d1/trace.ts:218`);
  - a persistent JSONL point cache per job, `results/cache/<job>.jsonl`, flushed every 30 s. Its header binds the
    door identity and the engine code hash, and any mismatch is refused.
- **Resilience.** A 45-minute idle watchdog. A rerun resumes from the cache with identical output.
- **Study 8 totals:** 55.4 CPU-h, 5.0 h wall.
- **Thread-based alternative.** In-process `worker_threads` pools with `SharedArrayBuffer` datasets are used by:
  - the minute optimizer (`src/minute-optimizer/pool.ts`; default workers = cores − 2);
  - four-family, recovery-eligibility, d1-refinement, d1-robust and d1-ranked-preemption (`*/pool.ts`).
- **Memory limits.** Per-study npm scripts set `--max-old-space-size` (`package.json:53-75`; study8 uses 12288).

**Machine:**
- AMD Ryzen 7 9800X3D, 8 cores / **16 threads** (`nproc` 16);
- **59 GB RAM**, about 44 GB available at audit time;
- 7 GB swap (2 GB used);
- load average about 0.1.

---

## D. VGT minute-data quality

Sources: `data/VGT/dataset-report.json`, `allin-minute-conversion/IMPLEMENTATION.md:58-71` and
`complementary-etf-d1/DATA_AND_CORPORATE_ACTION_AUDIT.md` §§2, 5-6. The per-year figures in §D.4 were computed for
this audit and stop at 2025-01-01T00:00Z.

### D.1 Integrity

The `verify` scan of `data/VGT/data.csv` (sha `2ee06310…`, which equals today's recomputed hash) found:
- 935,608 rows;
- 0 malformed, out-of-order, duplicate, out-of-range, unaligned or inconsistent-price rows.

The file's mtime is 2026-11-06 00:02 +01:00, but its hash is unchanged.

### D.2 Sessions

- **Coverage.** 2,723 expected sessions from 2016-01-04 to the last row, 2026-10-30T23:59Z. All have regular bars:
  - `missingSessions: []`;
  - `sessionsOnClosedDays: []`.
- **No sparse sessions.** No VGT session has fewer than 50% of its minutes (`below50: 0`). The audit's "sparse"
  label applies to VOOG only.

### D.3 Early-close anomaly

"Bars after 1:00 p.m. on 13 early-close days". Ten of those days are in the development window:

| Date | Bars after 13:00 |
|---|---:|
| 2017-11-24 | 1 |
| 2018-12-24 | 5 |
| 2019-11-29 | 2 |
| 2019-12-24 | 1 |
| 2020-11-27 | 1 |
| 2022-11-25 | 2 |
| 2023-07-03 | 3 |
| 2024-07-03 | 1 |
| 2024-11-29 | 2 |
| 2024-12-24 | 1 |

The other three are in 2025.

- They are post-close prints. One example is a 495k-share block at 13:02 on 2023-07-03.
- `groupMarketSessions` drops them, because `minute > 13:00`.
- The 13:00 bar's open is that day's closing print.
- 2016-11-25 has no closing print.
- The conversion audit found no unlisted early close: every normal session has ≥ 6.9% of its volume after 13:00.

### D.4 Extended hours and missing minutes

- **Extended hours.** The file has 38,042 extended-hours bars. About 7.5k are in 2016–2024; Alpaca's
  extended-hours coverage grows later. All are dropped by the session grouping.
- **Missing minutes are the norm.** A minute without trades has no bar. Median coverage in 2016–2024 is 83.6% of
  scheduled minutes:

| Year | Median minute coverage | Sessions under 75% coverage |
|---|---:|---:|
| 2016 | 73.3% | 144 of 252 |
| 2017 | 79.5% | — |
| 2018 | 89.0% | — |
| 2019 | 83.3% | — |
| 2020 | 95.1% | 3 |
| 2021 | 83.6% | — |
| 2022 | 86.2% | — |
| 2023 | 82.8% | — |
| 2024 | 80.0% | — |

  The minimum session coverage is about 55%.
- **Earlier findings in the conversion audit:**
  - only 28 sessions were complete;
  - the 15:58 minute was missing on 16 sessions;
  - 09:31 was missing on 195 sessions;
  - 2019-08-12 has no bars after 15:29;
  - the closing print was missing on 2016-04-06, 2016-11-25 and 2019-08-12.
- **Largest gaps:**
  - 2016-06-07, 12:36→12:55 (19 min);
  - 15-minute gaps on 2020-03-09, 03-12, 03-16 and 03-18. These coincide with the March 2020 market-wide
    circuit-breaker halts.

### D.5 Liquidity (computed for this audit, 2016–2024, regular session)

| Year | Median minute dollar volume | Median daily dollar volume | Median one-minute high–low range |
|---|---:|---:|---:|
| 2016 | $62k | $37M | 0.9 bp |
| 2017 | $89k | — | 0.9 bp |
| 2018 | $153k | — | 2.1 bp |
| 2019 | $148k | — | 1.2 bp |
| 2020 | $355k | $196M | 3.2 bp |
| 2021 | $308k | — | 1.5 bp |
| 2022 | $351k | — | 3.2 bp |
| 2023 | $301k | — | 1.7 bp |
| 2024 | $437k | $220M | 1.4 bp |

- **A $100k order is large in the early years.** In 2016–2017 it exceeds the median minute's whole traded value.
- **Thresholds will sit close to cost.** A ~0.3% stop or rebound threshold is only about 10–30× a typical minute range
  and a few times a plausible spread plus slippage.
- **What this means for the study:**
  - fill realism (next-observed-trade fills, the stale-bar handling of gaps);
  - per-side costs and stop slippage in bp;
  - break-even cost analysis.

  These are central, not sensitivities. No bid/ask data exists (`DATA_AND_CORPORATE_ACTION_AUDIT.md` §2).

### D.6 Adjustment policy

- **Prices.** Raw Alpaca prices (`adjustment=raw`).
- **Splits.** Forward-adjusted only in partition runs (§B.3). VGT's only split, 2026-04-21, is outside development.
- **Distributions.** They are **not** in prices. Ex-dividend drops appear as price moves (quarterly, about −0.1% to
  −0.4%; `IMPLEMENTATION.md:71`).
- **The distribution ledger.** `config/market-events/distributions.csv` (current sha `30feaa99…`, equal to its
  manifest; the complementary audit quotes an earlier `3b4342eb…`) has 36 VGT ex-dates in 2016–2024.
  - Only the allocator's portfolio mode credits distributions.
  - Standalone D1 files and all prior minute studies are price-only.
- **What the new study must decide.** It should state its distribution treatment. A position held overnight across an
  ex-date is the only way a distribution matters intraday.

---

## E. CLI registration and Strategy Lab integration

### E.1 CLI

`src/app.ts` dynamically imports `./app/${script}.ts` and calls its default export (`:31-35`).
- **Argument handling.** Names starting with `allIn` (except the two daily scripts) get `expandDatasetArguments`,
  i.e. partition shorthand (`:14-15, 35`).
- **Phenotypes.** `--phenotype` routes to `src/phenotype/cli.ts` (`:24-29`).
- **The preapp hook.** `npm run app -- X` runs the `preapp` hook (whole-repo eslint + tsc, `package.json:37`).
- **Two patterns in use:**
  - a thin `src/app/<name>.ts` wrapper (as `src/app/intradayStudy.ts`, `minuteOptimizer.ts`) plus an npm alias;
  - for recent studies, a dedicated npm script calling `src/<study>/main.ts` with `--max-old-space-size`
    (`package.json:58-75`).

  Either is a few lines. A `package.json` script line is the only shared-file edit.

**Cautions:**
- Several historical studies pin a code manifest over `src/**/*.ts`, so new files change it. Check those studies at
  their own commit (`docs/claude/context-recovery.md` §4).
- `npm test` (`package.json:46`, `src/**/*.test.ts`) includes suites that read whole data files, including post-2024
  rows. During the embargo, run the suite only in a data-less worktree.

### E.2 Strategy Lab

The registry is **schema-driven** (`docs/strategy-lab/ARCHITECTURE.md`, "Run lifecycle"). A selectable strategy
needs:

1. **A `StrategySpec`** in `apps/strategy-lab/shared/strategies.ts`, added to `STRATEGY_REGISTRY` (`:1635-1645`):
   - key, version, kind `trades`;
   - `launch: 'form' | 'phenotype' | 'none'`;
   - schema-v2 params, groups and constraints (`shared/params.ts`), from which the New Test form renders
     automatically;
   - `resolutions: ['1m']`.

   Keys and versions are immutable (`CONTRACTS.md`).
2. **A runner script** allowlisted in `RUNNER_SCRIPTS` (`apps/strategy-lab/server/jobs.ts:19-24`). The server spawns
   it as a child with fixed Node flags (`:28-31, 122`). It must:
   - read `request.json`;
   - load through `loadDatasetSessions` (access `manual evaluation`);
   - write `events.json`, `metrics.json` and `provenance.json`, optionally `trades.json`, `daily.json` and
     `minute-marks.csv.gz` (`:26`);
   - pass the event contract (`shared/validate-events.ts`);
   - reconcile accounting or exit 1.

   The Growth runner `runner/trading-run.ts` is 1,524 lines. `pool-run.ts` (145 lines) shows a thin adapter over an
   existing engine.
3. **Tests.** Unit tests and Playwright e2e tests (`apps/strategy-lab/e2e`).
4. **Operations.** The live server serves `dist`, and `state/strategy-lab` must never be wiped. Build to a scratch
   outDir.

**Cost: moderate to heavy.** A spec of about 100–200 lines, a runner adapter of about 150–400 lines if the engine
already emits a trade ledger and daily marks, plus contract, e2e and docs work.

**Methodological risk.** Strategy Lab exists for manual exploration on any dates. The form defaults to training, and
other windows are only labelled "exposure" (`docs/strategy-lab/RESEARCH_WORKFLOW.md` §2).

**Recommendation:**
- Deliver the CLI first.
- Defer Strategy Lab registration until after the validation run. If it is needed earlier, register the strategy
  `launch: 'phenotype'` for the frozen candidates only.

---

## Key cautions for the study design

1. **Data access.** Don't use `data/VGT/VGT-2016-2025-1-minute.csv`, `loadDatasetSessions`, `selectDataset` or the
   D1 CLI's own loader in development code. Each of them parses or hashes post-2024 rows. Use the hard-cutoff prefix
   loader of §B.6.
2. **The development window spans two partitions.** It can't use `access: 'optimization'`. Disclose the Study 8-style
   departure and enforce the study's own door and freeze guards.
3. **Interest.** The existing interest convention (calendar days from the entry date, 0 for same-day round trips)
   conflicts with the brief's accrual-by-exposure requirement. That needs a documented adaptation, with the D1
   convention as a parity reference.
4. **Data.** Missing minutes are ubiquitous (§D.4). VGT's minute dollar volume in 2016–2017 is comparable to $100k.
   Use next-observed-trade fills, a conservative same-bar order (open before low; a high raises the stop only for the
   next bar) and bp-denominated cost and slippage stresses. Report break-even costs.
5. **Prior minute optimizations of tight-stop VGT variants.** They found in-sample gains that did not transfer, with
   unstable optima. Neighbourhood-based merit and Study 8's robustness discipline are warranted.
