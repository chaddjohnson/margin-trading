# Protocol — growth140-vgt-s8m: a Study 8–style search of Growth 1.4.0 on VGT, with #4 as a fixed control

Written 2026-11-07 (UTC) in the main checkout, branch `research/growth-vgt-study8` (HEAD `7c7bcab`, the user's revert of
the failed attempt `dd2f07f`). The brief is `brief/BRIEF.md` (sha256 `9146b7f0…7621c2`, read in full). The methodological
reference is `research/study8-expanded-regime-d1/PROTOCOL.md`, track V, fold F24. Code: `src/growth140-vgt-s8m/`.

**Written before any search, qualification, selection or validation statistic of this study existed.** Computed before
it, all on the development door or synthetic data:

1. Engineering probes (scratchpad; timing and memory only, §3.1).
2. Fixture-door smoke and stop/resume tests (synthetic data).
3. The engineering pilot `npm run growth140-s8m -- pilot` (§3.6). It used the development door and printed only
   timings, memory, counts and equality booleans. Its search and qualification outputs hold development figures of
   pilot configurations. They stay unread in the git-ignored cache (`.cache/growth140-vgt-s8m/pilot-out/`), and no
   design choice used them. The pilot's archives are bound to their own namespaces, and the study never reads them.

**What the analyst already knows.** The brief's #4 settings and its full-window browser figures (2016-01-04 →
2026-10-30). Every earlier VGT study, including Study 8 and its 2025–2026 test, and the failed attempt's design (its code
was read only to diagnose the crash, §3.1). The earlier browser work selected #4 with 2025–2026 in view (§2.4).

**Freeze.** `npm run growth140-s8m -- freeze-protocol` writes `results/protocol_freeze.json`. It records this file's
sha256, the amendment log's, the brief's, the code manifest (the study namespace and its transitive import closure,
§9), the data pins, git HEAD, the schedule and the resource contract. The freeze is committed before the search
starts. Afterwards this file is never edited. Amendments go to the append-only `AMENDMENTS.md`, and a code change needs
an amendment and `acknowledge-code <ID>`.

## 1. Question, objective, outcomes

- **Question.** Within a declared search of Growth 1.4.0's rule combinations, selected only on 2016-01-04 →
  2024-12-31, is there a stable VGT phenotype that earns significant net profit, with a low maximum minute drawdown and
  more distinct winning trades than #4? Does it keep that on 2025-01-02 → 2026-10-30?
- **Objective (the user's).** Stable phenotypes (broad parameter neighbourhoods) that earn significant net profit with
  low maximum minute drawdown and capture more distinct winning trades. An honest finding that no challenger qualified
  is a valid outcome. No role is filled with a weak candidate to complete a table.
- **Outcomes.** (a) *qualified*: at least one role holder qualifies on development data; (b) *no qualifier*.
  Validation reports each frozen member as pass / ambiguous / fail. Validation never reorders, replaces or rescues.

## 2. Data, windows and doors

### 2.1 Windows (New York regular-session dates)

| Purpose | First session | Last session | Use |
|---|---|---|---|
| Development | 2016-01-04 | 2024-12-31 | all search, refinement, stability tests, ranking and selection |
| Validation | 2025-01-02 | 2026-10-30 | one predeclared evaluation of the frozen members and #4 |

- The validation end, 2026-10-30, is intentional. The original Study 8 protocol ended on 2026-10-29.
- **Development years.** y = 2,264 sessions ÷ 252 = 8.984.
- **Validation length.** yVal = the validation sessions ÷ 252, rounded to 0.01. It is counted at validation from the
  loaded sessions, ≈ 459 sessions ≈ 1.82.

### 2.2 The development door (physical cap)

- **The file.** `.cache/growth140-vgt-s8m/dev/VGT-dev.csv` is the byte prefix of `data/VGT/data.csv` (sha256
  `2ee06310…412e`, 935,608 rows, ending 2026-10-30T23:59Z) holding every row whose New York date is ≤ 2024-12-31. That
  is every row before 2025-01-01T05:00:00Z: 743,918 rows, 42,469,694 bytes, sha256 `c144619f…0bf9ecb`. Its last row is
  2024-12-31T21:11Z; the next canonical row is 2025-01-02T12:26Z.
- **Opening it.** Every worker opening the door verifies the file's size, sha256 and last-row time before parsing.
  It then loads the file through the repository loader (`loadDatasetSessions`, explicit file, dates 2016-01-04 →
  2024-12-31, warm-up 0) and asserts 2,264 sessions from 2016-01-04 to 2024-12-31.
- **No split adjustment needed.** No VGT split falls inside the window; the only one is 2026-04-21, and the door asserts
  this. Development prices are therefore identical to the full run's forward-adjusted prices.
- **No 2025–2026 bytes.** No search, qualification or selection process opens the canonical file. P1 parity (§9.2)
  runs the browser runner on development dates, which reads the canonical file capped logically at 2024-12-31 (a
  disclosed exception for the parity reference only).
- **The full door.** It opens only in `validate`, after `FROZEN_SELECTION.json` is committed (§10). It is the browser's
  own path: partition `all`, 2016-01-04 → 2026-10-30, forward split adjustment, warm-up 0.
- **Logged.** Every opening goes to `results/doors.jsonl`.

### 2.3 Coverage

- **What is reported.** Minute coverage against the NYSE calendar at validation, from the full door's sessions, for
  both windows: missing sessions, partial sessions (< 90% of the scheduled regular minutes), early closes and sessions
  without a closing print.
- **Comparability.** Their effect on comparability is discussed in the report. The validation window's counts are read
  only after the freeze.

### 2.4 Exposure

- **Earlier inspection.** All of 2016–2026 was inspected by earlier studies. Study 8 opened 2025-01-02 → 2026-10-29.
- **#4's advantage.** #4 was chosen in the browser with 2025–2026 in view, which gives it an advantage on the
  validation window.
- **What validation is.** A forward-period test of this frozen search on previously examined market history. It is not
  a holdout, and nothing selected here is called independently validated.

## 3. Resources, containment, memory and resumability (engineering contract)

### 3.1 The diagnosed failure

- **The incident.** The failed attempt's search (`node … --max-old-space-size=12288 src/growth-vgt-study8/main.ts
  search`, PID 388644) was killed by a global OOM at 10:26:09 UTC (the journal's 11:26:09 is CET). The kill came
  ≈ 27 s after the search opened its door, with anon-rss 55.9 GB.
- **The failed design.** It ran 14 worker threads in one process. Each thread loaded the door itself and called the
  canonical engine per evaluation, with `maxOldGenerationSizeMb: 3072`.
- **What was measured here.** Each canonical `runRiseTrading` builds a fresh dataset of typed arrays: about 28 MB of
  ArrayBuffers per run. V8 lets this garbage build up to several GB per isolate, and neither `--max-old-space-size`
  nor `maxOldGenerationSizeMb` bounds it.
  - One such worker thread reached 5.3 GB of ArrayBuffers and 6.9 GB process RSS within 400 runs, with a heap of
    ≤ 0.42 GB.
  - With `gc()` every 10 runs, an isolate stays at ≈ 0.75 GB.
- **Attribution.** This is the supported mechanism, but the failed code itself was not re-run.

### 3.2 Bounded retained data

- **The archive.** Every evaluation goes into a per-job SQLite archive (`node:sqlite`, WAL, 32 MiB page cache).
  - In front of it sits an LRU of at most 50,000 compact records.
  - Behind it, a write buffer is committed every 500 rows or 2 s.
  - The archive is bound to its namespace (study, job namespace, door, pins), and a foreign archive is refused.
- **Compact records.** A record holds net, realized, unrealized, minute and daily drawdown with their times, trade
  counts, episodes, lot years, capital-days, concentration, half-year attributions, exposure, time underwater and a
  ledger signature.
- **No retained curves or ledgers.** Minute curves and trade ledgers are regenerated on demand, for selected
  configurations only (`detailOf`).
- **Drawdown.** Drawdown is the engine's own streaming tracker. A sub-window drawdown replays the engine's
  minute-mark change points through the same tracker (`Tracker.updateStrict`), and a whole-run replay must reproduce
  the run's own drawdown.
- **Bounded pending work.** Each worker holds ≤ 2 tasks, and a batch enters the queue in chunks of ≤ 4,096 keys.
  Centres are fitted in chunks of 256.
- **Eviction.** The pilot verifies that eviction (an LRU of 256) leaves results identical.

### 3.3 Workers

- **Processes.** Workers are child processes (`--expose-gc --max-old-space-size=1024`). Each holds its own copy of the
  door (≈ 0.4 GB, measured), and they start one at a time.
- **GC governor.** A worker runs a full GC after every 8 evaluations, or when its ArrayBuffers exceed 256 MiB.
- **Coordinator.** The coordinator holds no market data (`--max-old-space-size=2048`).

### 3.4 Containment and checkpoints

- **The unit.** Every long stage runs as a transient systemd user service (`systemd-run --user`, in
  `app.slice`, separate from the tmux/Claude scope). Its properties are:
  - `MemoryHigh=44G`, `MemoryMax=48G` (the user's limits of 2026-11-07, replacing the brief's provisional 20G/24G).
    On this host's 59.4 GiB this leaves ≈ 11 GiB rather than the brief's 16 GiB of headroom. The measured need is far
    below the cap.
  - `MemorySwapMax=0`: host swap is already full with other workloads.
  - `KillMode=mixed`, `TimeoutStopSec=120`, no restart, `--collect`, and logs in `results/runlogs/<unit>.log`.
  - The ancestor cgroups (`user.slice`, `user-1000.slice`, `user@1000.service`, `app.slice`) are unlimited (verified).
- **The monitor.** Every 10 s it appends to `results/memory/<job>.jsonl`:
  - the job cgroup's `memory.current`, `memory.peak`, anon memory, swap and `memory.events`;
  - the worker count, each process's RSS, and each worker's heapUsed, external and arrayBuffers;
  - the LRU and write-buffer sizes, queued and in-flight tasks, and completed, fresh and archive-hit evaluations.
- **The pressure threshold.** At `memory.current` ≥ 16 GiB, dispatching stops: in-flight work finishes, the archive is
  committed, the checkpoint is written, and the job exits 75. SIGTERM (`systemctl --user stop`) does the same.
  - 16 GiB is ≈ 2× the pilot's measured 12-worker peak of 6.5 GiB, and far below MemoryHigh. The rule is
    min(16 GiB, MemoryHigh − 4 GiB).
  - Exceeding it means unexplained growth: the job stops for diagnosis long before the host is at risk.
- **Checkpoints.** They are atomic (temp file, fsync, rename, dir fsync; the previous one kept as `.prev`) and
  hash-validated (body sha256 plus the protocol, code and data pins).
  - They are written at every stage boundary and island generation, with the generation and island position, RNG
    state, ranked population with ranks and crowding, seen sets, archive IDs and trigger logs.
  - They are refreshed at least once a minute during long batches.
- **Resume.** `--resume` reloads the last valid checkpoint. It regenerates the interrupted batch from the saved RNG
  state and takes finished evaluations from the archive. Configuration IDs are deduplicated, so the run reproduces an
  uninterrupted one exactly.
  - SIGKILL allows no final save: the job then resumes from its last durable checkpoint.
  - Qualification and validation are idempotent over their archives. Rerunning one recomputes nothing already stored,
    and their sealed outputs are written once at the end.

### 3.5 Concurrency

- The study search uses at most 12 workers, after the pilot measured the incremental footprint at 1 → 2 → 4 → 8 → 12
  workers. The job cgroup peaked at 0.78 / 1.18 / 2.47 / 4.50 / 6.52 GiB: ≈ 0.5 GiB per added worker.
- **Per worker.** ≈ 389 MiB at ready (its own copy of the door); 440–480 MiB median and ≤ 685 MiB maximum in steady
  state; ArrayBuffers ≤ 197 MiB; heapUsed ≤ 228 MiB.
- **The coordinator.** ≤ 200 MiB RSS in search jobs (≈ 420 MiB in validation, which loads the doors for coverage).
- No `memory.high`, `memory.max` or OOM events occurred, and no swap was used (`results/pilot/memory-summary.json`).
- Overlapping jobs at the freeze: vLLM (Docker, ≈ 0.1 GB RSS plus 3.6 GB swapped), mongod (≈ 0.1 GB) and the desktop.
  None of them is a search.

### 3.6 The pilot (§3 must pass before scaling)

- **Phases.** Each phase is its own capped unit on the development door, using the pilot schedule (`context.ts`).
  - A: 1 worker, fresh archive, the whole search pipeline.
  - A2: the qualification workload (confirmation, selection, in-box, half and wide families, 10/20 bps stresses,
    ablations, on-demand detail), 2 workers.
  - B: cache reload, using a copy of A's archive with 2 workers. It must make 0 fresh evaluations and give an
    identical output.
  - C: LRU of 256, 4 workers, fresh archive; the output must be identical.
  - D: stop after 3,000 fresh evaluations, then resume with 8 workers; the output must be identical.
  - E: SIGKILL of the whole unit after 75 s, then resume with 12 workers; the output must be identical.
  - F: browser-runner parity of 10 fixed non-#4 configurations.
- **Pass.** At least 15 minutes and at least 500 fresh evaluations; memory settled within the measured budget; all
  identities hold.
- **Supplementary phases.** A3 (qualification stopped after 1,500 fresh evaluations, then rerun) and G (validation
  code on the development door with a pseudo-boundary at 2023-12-29, stopped after 400, then rerun). Each must
  reproduce its uninterrupted run.
- **Result** (`results/pilot/`).
  - Phases A–F ran 16.7 min, with 10,054 fresh evaluations in A alone.
  - B, C, D and E reproduced A exactly; A3 and G reproduced their uninterrupted runs.
  - F passed after the trade-time format was aligned with the browser (`…:00Z`, not `…:00.000Z`). The first run showed
    differences in that format only.

## 4. Strategy, fixed contracts and the space

### 4.1 Fixed contracts (every primary comparison)

- **The evaluation path.** `rise-from-recent-low-trading@1.4.0` (Growth 1.4.0), evaluated through the browser's own
  path:
  - the Strategy Lab request mapping (`apps/strategy-lab/runner/growth-params.ts` `paramsOf`);
  - the engine (`src/growth-trading/riseTrading.ts` `runRiseTrading`);
  - its summary (`summarizeSimulation`) with the browser runner's accounting checks (1e-6 USD).
- **Fixed settings.** VGT only; 1d signal bars with minute execution and marking; $100,000 fixed notional, no
  compounding; 11% simple annual interest per calendar day (365-day year); 5 bps per side; $0 commission; the
  engine's native fills, gaps, stops and marks.
- **Identity.** A configuration's identity is the browser's: the canonical JSON of its effective parameters plus
  `|1d`, hashed (16 hex characters). Every configuration passes the browser's own validator (`validateParams`).

### 4.2 Structural genes (switches and selectors)

| Gene | Options |
|---|---|
| entry | rise_from_recent_low, trend_breakout |
| trend filter | off, price_change, regression_slope, rising_sma, higher_highs_lows, momentum |
| persistent eligibility | off, time_limited, minimum_strength, maximum_extension, deterioration, reset_renew (Rise entry only) |
| Drawdown Recovery Gate | off, on |
| exits | maximum hold off; hold on, buffer off; hold on, buffer on (the buffer requires the hold) |
| initial risk stop | off, on |
| trend retention | off, on |
| continuation | off, classic_d1, breakout, shallow_pullback, ma_cross |

- 8,640 genome combinations give 5,040 distinct structures, because eligibility does not apply to the breakout entry.
- The trailing stop is always on (mandatory).

### 4.3 Numeric genes

There are 50 numeric genes, each active only under its structure. The table gives min–max / step, the levels, and the
radius r (in steps and in value).

| Gene | Range / step | Levels | r | Source |
|---|---|---:|---|---|
| advanceFromRecentLowPercent X | 1–20 / 0.5 | 39 | 4 (2.0 pt) | rule A |
| recentLowLookbackBars N | 10–250 / 10 | 25 | 2 (20) | Study 8 L box 20–250, extended down to 10 |
| trailingStopPercent | 3–15 / 0.5 | 25 | 2 (1.0 pt) | Study 8 stop box |
| maximumHoldDays (calendar) | 3–30 / 1 | 28 | 3 | Study 8 hold box |
| intradayLossBufferPercent | 0–6 / 0.5 | 13 | 1 (0.5 pt) | Study 8 buffer box |
| dipLookbackSessions | 10–120 / 10 | 12 | 1 | schema `search` |
| dipThresholdPercent | 2–15 / 0.5 | 27 | 3 (1.5 pt) | schema |
| recoveryRetracementPercent | 30–100 / 10 | 8 | 1 (10 pt) | schema |
| recoveryConfirmationSessions | 0–10 / 1 | 11 | 1 | schema |
| breakoutSmaSessions / SlopeComparison / PriorHigh | 10–200/10; 5–120/5; 5–120/5 | 20, 24, 24 | 2, 2, 2 | schema |
| initialStopAtrSessions / AtrMultiple | 5–60/5; 1–5/0.5 | 12, 9 | 1, 1 | schema |
| retentionSellPercent / SmaSessions / ClosesBelow | 10–90/10; 10–200/10; 1–5/1 | 9, 20, 5 | 1, 2, 1 | schema |
| eligibilityMaxAgeSessions | 1–30 / 1 | 30 | 3 | schema |
| eligibility policy inputs (minAdvance 0–10, maxExtension 0.5–10, deterioration 0.5–10, resetDrop 1–10, renewal 0.5–10) | / 0.5 | 19–21 | 2 | schema |
| continuationWindowSessions | 10–200 / 10 | 20 | 2 | Study 8 W box |
| trend price_change: lookback, min return | 5–120/5; −5–10/0.5 | 24, 31 | 2, 3 | schema |
| trend regression_slope: lookback, min slope | 5–120/5; −5–10/0.5 | 24, 31 | 2, 3 | schema |
| trend rising_sma: SMA, comparison | 10–200/10; 1–30/1 | 20, 30 | 2, 3 | schema |
| trend higher_highs_lows: lookback, min increase | 4–120/2; 0–5/0.25 | 59, 21 | 6, 2 | schema |
| trend momentum: S, L, min S return, min L return | 2–30/1; 20–250/10; −2–10/0.5; −15–10/0.5 | 29, 24, 25, 51 | 3, 2, 2, 5 | schema |
| classic_d1: pullback, rebound | 3–20/0.5; 0.2–5/0.2 | 35, 25 | 3, 2 | Study 8 P and Y boxes |
| breakout continuation: buffer, formation bars | 0–5/0.25; 1–20/1 | 21, 20 | 2, 2 | rule B |
| shallow_pullback: SMA, slope, min rise, pullback min, pullback max, recovery | 10–200/10; 1–30/1; 0–5/0.25; 0.5–4/0.5; 5–15/1; 0.25–5/0.25 | 20, 30, 21, 8, 11, 20 | 2, 3, 2, 1, 1, 2 | rule B |
| ma_cross: SMA, rising bars, min slope, margin | 10–200/10; 1–30/1; 0–2/0.1; 0–3/0.25 | 20, 30, 21, 13 | 2, 3, 2, 1 | rule B |

- **Radius.** r = max(1, round(0.1 × (levels − 1))) steps, about 10% of each range. Study 8's radii were 4–17% of its
  box.
- **Rule A.** H1 of `docs/research/growth-entry-discovery/PLAN.md` ("about 5% above a recent low"), widened a
  decade-and-more around the engine default of 5%.
- **Rule B.** Inputs without a schema hint take the conventions of the analogous hinted inputs:
  - SMA lengths 10–200 / 10;
  - slope and rising periods 1–30 / 1;
  - minimum rises 0–5 / 0.25;
  - percent bands on 0.5 or 0.25 steps.
  - The shallow-pullback band uses disjoint boxes (min ≤ 4% < max ≥ 5%), so min < max holds by construction.
- **No #4 influence.** None of the ranges was set with #4's vector in view. #4 lies inside every box; its retracement
  of 45 and its buffer of 2.9 are off-grid.
- **The momentum repair.** The rule S < L is repaired deterministically: L = S + 1, or S = L − 1 at the box top.

### 4.4 Excluded options (fixed for primary comparisons)

- **Fixed.** Other symbols; intraday resolutions; costs other than 5 bps (10/20 bps are diagnostics); notional,
  compounding and interest.
- **Not searchable.** The engine's stop fill and slippage (not inputs of the engine).
- **Not an option.** Turning the trailing stop off (it is mandatory).
- **Kept in the space.** Nothing else is excluded. The maximum-hold OFF option stays in the space (with no loss exit
  other than the optional initial stop, a position can stay open). The drawdown constraints judge it.

### 4.5 Neighbourhoods (the stability instrument)

- **Design.** For a seed family (`labels`, n), one Latin hypercube of n points over all 50 numeric genes is drawn
  (`latinOffsets`, Rng `seedOf('nbhd', …labels)`). Every centre uses the columns of its active genes, so neighbourhoods
  share common random numbers.
- **Perturbations.**
  - Continuous and integer inputs: value = centre + round(u × scale × r) × step, clipped to the box (the box widened to
    include an off-grid centre).
  - Conditional inputs move only when active; switches and selectors stay fixed (a neighbourhood is one rule
    structure).
  - The constraint repair applies afterwards.
  - Duplicates of the centre or of an earlier point are dropped.
- **Mode `inbox`.** It maps u onto the in-box part of [−r, r].
- **Variants.** Scale 0.5 (half) and 1.5 (wide) are report-only.
- **Reported.** For every neighbourhood, the distinct effective configurations (n) and the distinct trade ledgers.

## 5. Fitness (Study 8 §6 for one book)

- **Objectives (constrained Pareto).**
  - Maximize centre net/yr, neighbourhood median/yr and neighbourhood p10/yr.
  - Minimize neighbourhood p90 maximum minute drawdown.
  - Robust profit = ½ median + ½ p10 (per year and in dollars).
- **Constraints.** These form a normalized violation (0 iff feasible); a non-finite violation is infeasible.

| ID | Constraint |
|---|---|
| C1 | centre minute DD < $35,000 |
| C2 | neighbour share with DD < $35,000 ≥ 0.90, and p90 DD < $35,000 |
| C3 | trades ≥ ⌈1.5·y⌉ = 14, episodes ≥ ⌈0.5·y⌉ = 5 (new episode: entry > 10 sessions after the previous exit), lot years ≥ min(3, 2024 − 2016) = 3 |
| C5 | neighbourhood median ≥ $10,000/yr and p10 > $0 |
| C6 | net per occupied $100k-year ≥ $11,000 |
| C7 | largest positive trade ≤ 25% of net; best calendar year ≤ 75% of net; ex-best-year economy ≥ $5,000/yr |

- C4 (pooled books) does not apply.

## 6. Search schedule (Study 8 §7.1, track V, scaled)

### 6.1 Budgets

- **Dimension scale.** Study 8 scaled its joint-proposal budgets with s(d) = max(1, d/16). Here at most 36 genes are
  active at once (8 structural + ≤ 28 numeric), so s ≈ 2.25. Study 8's largest-track budgets (VXRKG, s = 2.5) are used
  for the population, the new configurations per island and the rung-1 cap.
- **Screen.** 16,384 = 2^14 vectors: the power of two nearest 8,192 × 2.25, which keeps the Sobol balance.

| Step | Value |
|---|---|
| Screen | 16,384 genomes (Latin supercube of scrambled Sobol blocks, §6.2) |
| Promotion | plausible if centre DD < $35k, net > 0, trades ≥ ⌈14/2⌉ = 7; if more than 2,560, ½ by constrained rank on (−net, DD, −trades) and ½ by max-min L∞ diversity |
| Rung 1 | 16 points |
| Islands | 4 sequential, population 160, ≤ 5,120 new configurations each, ≤ 40 generations, SBX η15 (p 0.9), PM η20 on grid indices (`src/optimizer/nsga2.ts`), stagnation 10 generations / 1e-3 of the island hypervolume on (−robust/yr, p90 DD) with reference (0, $35k) |
| T1 | if the last island raised the union hypervolume ≥ 10% (or, with nothing feasible, lowered the minimum violation ≥ 25%), two more islands, up to 8 |
| Rung 2 | top 192 by constrained rank (Study 8 `rankOrder`), distinct L∞ ≥ 0.02, n = 64 |
| T3 | if fewer than 2 rung-2-feasible regions (L∞ 0.10) while rung 1 has ≥ 3, up to 16 regional representatives |
| Rung 3 | top 48, distinct 0.03, n = 128 |
| Refinement | 6 starts (distinct 0.05), ≤ 2 passes on 64-point neighbourhoods (below) |
| T2 | if the top two rung-3-feasible differ by less than the larger bootstrap SE (2,000 resamples), re-score the top 8 with r3 + r3b pooled |
| Shortlist | ≤ 6 at L∞ ≥ 0.10, one per ledger signature (picks below) |

### 6.2 Operators and encodings

- **Grid-index genes.** Every gene is a grid index (`ParameterSpace` with min 0, max levels − 1). Structural genes are
  ordinal-coded indices under the same SBX and PM, so a mutated selector usually moves one option. This departs from
  Study 8, which had no categorical genes.
- **Dead genes.** An inactive gene is a "dead" gene: it is inherited but does not change the identity.
- **The screen.** The project's Sobol generator has 16 dimensions. The 58 genes are split into four consecutive blocks
  (16/16/16/10), each a scrambled Sobol sequence seeded `('screen', …, 'block', b)`. The points of blocks 2–4 are
  permuted by seeded Fisher–Yates (Owen's Latin supercube), so every gene's levels are balanced.
- **Island seeding.** Island i starts from the rung-1 screen fits whose rank-order index ≡ i (mod islands), topped up
  with Latin-supercube fillers `('fill', i)`.
- **Distance.** L∞ distance is 1 between different structures; otherwise it is the largest |Δ| ÷ (max − min) over
  active genes.

### 6.3 Refinement

- **Moves.** Every active numeric gene moves ±⌈r/2⌉ and ±r steps inside the box. In addition, each enabled optional
  rule can be switched OFF: trend filter, eligibility, gate, initial stop, retention, continuation, buffer. The OFF moves
  are an addition: Study 8 had no switches.
- **Acceptance from a feasible start.** The move stays feasible, does not lower the median or p10, does not raise
  the p90, and raises robust profit by ≥ $1,000/yr. The best gain is taken; ties go to the lower p90, then the ID.
- **From an infeasible start.** The move lowers the violation by ≥ 0.01.
- **Endpoints.** Each endpoint gets rung 3.

### 6.4 Shortlist picks (in order)

1. *profit* (robust/yr);
2. *robust* (share, among candidates with median ≥ 50% of the profit pick's);
3. *balanced* (robust/yr ÷ p90);
4. *centre* (centre net/yr);
5. then the Pareto order;
6. then infeasible fill.

Ties go to the lower p90, then the ID.

### 6.5 Seeds

Every seed is `deriveSeed('growth140-vgt-s8m', …labels)`.

| Family | Labels | n |
|---|---|---:|
| Screen | `('screen','search','F24','block'/'permute', b)` | 16,384 |
| Island GA / fill | `('ga', i, 'search','F24')`, `('fill', i, 'search','F24')` | — |
| Rungs | `('nbhd','r1' / 'r2' / 'r3' / 'r3b' / 'refine','search','F24')` | 16 / 64 / 128 / 128 / 64 |
| T2 bootstrap | `('bootstrap','search','F24')` | 2,000 |
| Selection | `('nbhd','select', rep, 'F24')`, rep 1–2 | 2 × 128 |
| Confirmation | `('nbhd','confirm', rep, 'F24')`, rep 1–3; in-box `('nbhd','confirm-inbox', rep, 'F24')` rep 1–2; half/wide `('nbhd','confirm-half'/'confirm-wide', 1, 'F24')` | 3 × 128 (+ 2 × 128, 2 × 128) |
| Validation | `('nbhd','test','sets','F24', rep)`, rep 1–3 | 3 × 128 |
| Parity | `('parity','P1')` | — |
| Pilot | `…'pilot'` (engineering only) | — |

- No frozen phenotype, earlier candidate or #4 seeds any screen, island, refinement or shortlist.
- Islands share the rung-1 offsets (common random numbers) and differ only in their GA randomness.

### 6.6 Compute

- **Throughput.** From the pilot: ≈ 23 fresh evaluations/s with one worker (≈ 44 ms each, GC included). The pilot's
  small batches (population 16) limit parallel efficiency, so its multi-worker rates understate the study's.
- **The estimate.** The base schedule is ≈ 0.47 M evaluations: screen 16k, rung 1 41k, islands 348k, rungs 2–3 18k,
  refinement ≤ 50k, the rest small. That is about 45–90 min with 12 workers on the 8-core / 16-thread host, and up to
  about twice that if T1 adds islands.

## 7. Metrics (per evaluation, `engine.ts` `recordOf`; the browser's definitions where it has one)

- **Net.**
  - Total marked net = realized (closed trades, plus the partial fills of an open position) + the open position marked
    at the last close, net of accrued interest (exit cost not charged): `summarizeSimulation` `totalMarkedNetUsd`.
  - Per year: ÷ y.
- **Maximum minute drawdown.** The engine's minute tracker (strict new peaks) on the marked net at every
  regular-session minute close and every session close, in $ and as % of $100,000, with its peak, trough and recovery
  times. The daily drawdown is kept beside it.
- **Trade counts.**
  - Trades ("lots"): filled positions.
  - Wins, losses and breakevens: closed trades with net > 0, < 0 and = 0.
  - Open: the open position.
- **Episodes.** A new episode starts when an entry is more than 10 sessions after the previous exit. A profitable
  episode is one whose trades' net is positive.
- **Activity and capital use.**
  - Lot years: distinct calendar years with a closed trade (by exit year).
  - Capital-days: calendar days held.
  - Net per occupied $100k-year = net ÷ (capital-days ÷ 365).
  - Exposure: sessions invested ÷ window sessions (`sessionsInvestedPercent`).
- **Concentration.** Largest positive trade ÷ net (NaN if net ≤ 0); best calendar year = the largest positive yearly
  attribution of the marked net.
- **Time underwater.** The share of sessions whose closing mark is below an earlier closing peak, with the longest
  such run.
- **Period attribution and the signature.**
  - Half-year attributions: the marked net's change across each calendar half-year.
  - Ledger signature: sha256 over every trade's entry time and raw fill, and exit time and raw fill.

## 8. Qualification, evidence, selection (development door only; after the search is sealed)

### 8.1 Families

- **Every member and #4.** Every shortlist member and the control #4 get:
  - the centre;
  - confirmation 3 × 128, pooled and unique (≈ 384);
  - per-family confirmation;
  - selection 2 × 128, pooled;
  - the in-box pair 2 × 128 when an active coordinate lies within r of a bound;
  - half and wide (report-only);
  - the centre and confirmation family 1 at 10 and 20 bps per side.

### 8.2 Gates (all must hold; a search-infeasible member cannot qualify)

| Gate | Requirement |
|---|---|
| Q1 | centre DD < $35k |
| Q2 | confirmation pooled share ≥ 0.90 and p90 < $35k |
| Q2b | the in-box pair likewise, when applicable |
| Q4 | net > 0, best year ≤ 75%, ex-best-year ≥ $5k/yr |
| Q5 | the C3 floors |
| Q6 | largest positive trade ≤ 25% of net |
| Q7 | at 10 bps per side: centre net > 0 and DD < $35k |
| Q8 | confirmation median net ≥ 60% of the centre's |
| E1 | confirmation median ≥ $10k/yr and p10 > 0 |
| E2 | ≥ $11k per occupied $100k-year |

- **Marginal.** A member is marginal when it qualifies but its pooled share is ≤ 0.93, or at least one confirmation
  family fails Q2 on its own.
- **Departures.** Study 8's Q7 also stressed interest, next-open stops and slippage, which the Growth engine does not
  expose as inputs; E3 applies to pools only.

### 8.3 Development evidence (report-only; nothing below selects)

- **Profit sources.**
  - Year-by-year contributions.
  - Dependence on the largest winning trade (net excluding it, and its share).
  - Distinct profitable episodes, losses, exposure and time underwater.
- **Expanding folds.** These are slices of the one continuous development run: F19 (2016–2019 | 2020–21), F20 (… |
  2021–22), F21 (… | 2022–23) and F23 (… | 2024). For each, the centre's train and test net, and the confirmation
  neighbourhood's test-slice median, p10 and positive share.
- **Procedural fold diagnostic.** The Spearman correlation, over the search's rung-3 configurations, of their
  2016–trainEnd robust profit (from their rung-3 neighbours) with their test-slice median. These are in-sample
  diagnostics, not independent folds.
- **Ablations.** The centre with each enabled optional rule switched OFF.
- **Cost stresses.** 10 and 20 bps, as separate diagnostics.
- **Trades against #4 (development window).** The predeclared one-to-one matching rule of `trades.ts` (its header,
  verbatim, is part of this protocol). It classifies retained (entry and exit within ±3 sessions) and retimed winners,
  extra entries into a #4 move, new wins on #4 losing moves, genuinely new winning moves (counted by candidate
  episode), lost #4 winners with their net, and losses.
- **Sparse evidence.** When #4 has fewer than 5 winners in the window, or fewer than 3 pairs match, the evidence is
  marked sparse and reported as inconclusive.

### 8.4 Roles (from the selection families)

- **The rule.** Each role goes to the first QUALIFIED member in its order that is at L∞ ≥ 0.10 from the holders
  already taken:
  1. *profit*: selection robust/yr;
  2. *robust*: selection share, among members with a selection median ≥ 50% of the profit holder's;
  3. *balanced*: selection robust/yr ÷ selection p90 DD;
  4. *extra*: up to 2 more qualified members in shortlist order, also with entry-date ledger Jaccard < 0.5 against
     every holder.
- **Ties.** The lower selection p90, then the ID.
- **Empty roles.** A role nobody qualifies for stays empty.

### 8.5 Ranking and the primary candidate

- **Tier.** A holder is in tier *strong* iff its confirmation robust/yr ≥ #4's AND its confirmation p90 DD ≤ #4's,
  under the same confirmation labels; otherwise *modest*. Study 8 used profit only; the drawdown condition encodes the
  user's "low drawdown" objective.
- **Order.** Within a tier: confirmation robust/yr, then the lower p90, then the ID.
- **The primary candidate.** It is rank 1. With no holder, the outcome is "no qualifier".
- **The freeze.** `freeze-selection` writes `FROZEN_SELECTION.json` (chmod 444): members with exact effective
  settings, IDs and canonical hashes, gates, roles, ranking, primary, the control, pins, and the search and
  qualification record hashes. It is committed before `validate`.

## 9. Integrity and engineering gates

### 9.1 Pins

- **The code manifest.** The sha256 of every file in the transitive import closure of `src/growth140-vgt-s8m/*.ts`
  (tests excluded): the study namespace, the Growth engine, the Strategy Lab mapping and validator, the optimizer,
  the loaders and the Study 5/8 helpers.
- **Every stage verifies the pins.** It checks:
  - the protocol hash;
  - the data pins (development prefix, partitions, splits);
  - the code closure, against the freeze or a code amendment acknowledged with `acknowledge-code`.
- **Exclusive archives.** Each search, qualification and validation job has its own archive; none is shared with the
  pilot or with another attempt.

### 9.2 P1 parity (after the freeze, before the search)

- **What runs.** The worker path (development prefix door, compact record and on-demand detail) against the browser
  runner itself (`apps/strategy-lab/runner/trading-run.ts`, run in a scratch directory) on 2016-01-04 → 2024-12-31.
  The configurations are the engine defaults, #4 and 12 structurally distinct `('parity','P1')` screen configurations.
- **What must match.** Exactly: total marked and realized net, the minute-drawdown maximum with its peak and trough
  times, wins, losses, breakevens, closed and open counts, exposure, and every trade's entry and exit times, fill
  prices and net. The compact record must agree with the detail.
- **Failure.** Any difference stops the study.

## 10. Validation (opened once)

### 10.1 Preconditions and order

1. `FROZEN_SELECTION.json` is tracked, unchanged from HEAD and pinned.
2. The full door opens once (door log).
3. **Continuity.** The development span of the full door has the same session digest as the development door; for
   every frozen member and #4, the full run's marked equity at the 2024 close equals its frozen development net.
4. **#4 parity first.** #4 on 2016-01-04 → 2026-10-30 is compared with the brief:
   - $145,468.46 total marked and $145,468.46 realized net;
   - maximum minute drawdown $14,578.10 (14.58%);
   - 10 wins, 3 losses, 0 breakeven, 13 closed;
   - exposure 37.0% (sessions invested), flat at the end.
   - Dollars must match to the cent, counts exactly and exposure to one decimal.
   - On a mismatch the expected and observed values are reported and investigated (data coverage, engine version,
     price units, fills, stops, financing, marks). No claim of browser-equivalent improvement is made while it
     remains, and #4 is never tuned.

### 10.2 Conventions (each frozen member and #4, one continuous run)

- **Validation net** = marked equity at 2026-10-30 − marked equity at the 2024-12-31 close.
- **Validation minute drawdown.** The engine's strict tracker, its peak initialized at the boundary equity, updated
  by the minute marks after the boundary close.
- **Carried-in positions.** A position open across the boundary is split there: the part up to it is the boundary
  equity minus the trades closed by then. New validation entries are listed separately.
- **Departure.** Study 8 measured test drawdown over the whole run. Both are reported here.

### 10.3 Battery (statuses; outcomes only veto)

| Gate | Requirement |
|---|---|
| T1 | the run's minute DD (2016 → 2026-10-30) < $35k |
| T2 | the validation families 3 × 128 on the full door: pooled share with run DD < $35k ≥ 0.90, and p90 < $35k |
| T3 | validation centre net ≥ $10k × yVal; the families' validation-net median > 0 and ≥ $5k × yVal |
| T4 | at 10 bps: validation centre net > 0 and run DD < $35k |
| T5 | on the whole run: net > 0, best calendar year ≤ 75%, ex-best ≥ $5k/yr, largest trade ≤ 25% |
| T6 | whole-run C3 floors with the run's y; new validation trades ≥ ⌈1.5·yVal⌉ and new episodes ≥ ⌈0.5·yVal⌉ |
| T7 | net per occupied $100k-year ≥ $11k |

- **Status.** *fail* if any gate fails; *ambiguous* if every gate passes but the pooled share is ≤ 0.93 or the run DD
  is ≥ $33k; *pass* otherwise.
- **Reported for every member, in development rank order, against #4 on the same dates.** Development and validation
  columns:
  - net (realized and open);
  - maximum minute DD in $ and %, with dates and recovery;
  - wins, losses and breakevens; exposure;
  - deltas to #4;
  - whether validation net is higher with equal or lower validation drawdown;
  - winners retained and added, and whether losses increased (the matching rule on validation-window entries).
- **After validation, selection ends.** Further ideas are recorded for future studies.

## 11. Departures from Study 8 and why

| Item | Study 8 (V track) | Here | Why |
|---|---|---|---|
| Rules | D1 (8 parameters) | Growth 1.4.0 (8 structural + 50 conditional numeric genes) | the brief |
| Folds | five searched folds (F19–F24) | F24 only; F19–F23 as development slices and a rung-3 diagnostic | the brief's single F24 chronology; one search budget |
| Test end | 2026-10-29 | 2026-10-30 | the brief |
| Budgets | V: 8,192 / 64 / 2,048 / 1,024 | 16,384 / 160 / 5,120 / 2,560 | dimension (§6.1) |
| Screen | plain scrambled Sobol | Latin supercube of 4 Sobol blocks | the 16-dimension generator |
| Categorical genes | none | ordinal grid genes; OFF moves in refinement | Growth's switches |
| Q7 stress | cost, interest, next-open, slippage | cost only (10 bps; 20 bps diagnostic) | engine inputs |
| Tier | robust ≥ B1 | robust ≥ #4 and p90 ≤ #4 | the user's drawdown objective |
| Test drawdown | whole run | whole run (T1, T2) and validation-window drawdown from the boundary (reported) | the brief |
| Integrity | local hash chain | freeze record, pins, door log, committed freeze and selection | commits authorized |
| Memory | unbounded per-job caches | bounded archive, GC governor, contained unit, checkpoints | the incident (§3.1) |

## 12. Disclosures

- The pilot and the probes opened the development door before the freeze; they printed engineering figures only.
- The analyst knows #4's full-window browser figures and earlier studies' 2025–2026 results.
- The user's memory limits (44G/48G) leave less host headroom than the brief's 16 GiB.
