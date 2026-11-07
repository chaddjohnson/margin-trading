# Protocol — Growth 1.4.0 on VGT: a Study 8–style search with browser trial #4 as a fixed control

Written 2026-11-07 (UTC) in the main checkout, branch `research/growth-vgt-study8` (from `4fe5eff`). Authority: the
user's brief `brief/BRIEF.md` (sha256 `db3f1b4e…a662a8`). Methodological reference: Study 8
(`research/study8-expanded-regime-d1/PROTOCOL.md`, its V track and F24 chronology; runner
`src/study8-expanded-regime-d1/`), whose artifacts are only read, never changed. Code: `src/growth-vgt-study8/`
(`npm run growth-vgt-study8`). Frozen by `seal-protocol` (chain phase `protocol`, `results/protocol_freeze.json`) and a
git commit **before** any search, parity or selection statistic exists. Afterwards this file is never edited;
changes go to the append-only `AMENDMENTS.md`, dated, justified, and never informed by validation-period data.

**Done before the freeze (no performance figure was computed into a record or printed):**
1. An engineering timing script and the sealed timing pilot (`results/pilot/pilot.json`) on the development door only:
   48.9 ms per point on one thread, 121.4 points/s on 14 workers.
2. One adapter-versus-runner smoke run on an engineering-seed configuration (development prefix), printing only the
   number of differences (0) and the runner's window dates.
3. Unit tests on synthetic minute data (`src/growth-vgt-study8/tests/`): 17 pass, including the whole pipeline (search,
   qualification and the validation code path) at a smoke budget.

**What the analyst already knew.** The brief's full-window figures of #4 (they include 2025–2026); Study 8's and the
Intraday D1 study's published outcomes; the exploratory Growth default example in `docs/strategy-lab/GROWTH_TRADING.md`
(VGT 2016–2023). No 2025–2026 result of any configuration other than #4's brief totals, no #4 ledger, no Strategy Lab
saved run or trial ranking was read. No range below was chosen from #4's values (§4 names every range's source).

## 1. Question and scope

Within a declared Growth 1.4.0 search on VGT, selected on **2016-01-04 → 2024-12-31** only with Study 8's
stability-first discipline, is there a stable phenotype that earns substantial net profit with a low maximum minute
drawdown and more distinct winning trades — and how does it, and #4, behave on **2025-01-02 → 2026-10-30**? An honest
"no challenger qualified" is a valid outcome. Out of scope: other symbols, intraday signal bars, sizing or cost
changes, portfolios, re-optimization after validation, Strategy Lab UI changes.

**Exposure.** 2025–2026 was used by the browser work that selected #4, and all of 2016–2026 VGT history was examined by
earlier studies. Validation is therefore a forward-period test of **this frozen search** on previously examined market
history, not a holdout, and #4 carries a selection advantage on it.

## 2. Strategy, engine and fixed contracts

- **Rules:** Growth `rise-from-recent-low-trading@1.4.0`, every rule exactly as implemented. **Canonical backtester:**
  the adapter (`adapter.ts`) runs exactly the Strategy Lab path after loading: effective values → `LabRunRequest`
  (1.4.0, VGT, `1d`) → `paramsOf` (`apps/strategy-lab/runner/growth-params.ts`) → `runRiseTrading` →
  `summarizeSimulation`; a run whose accounting does not reconcile (the runner's 1e-6 tolerance) fails. No engine,
  registry or runner file is modified; their sha256 are pinned (`seal.ts` `importedFiles`) and every stage refuses if
  one changes.
- **Fixed for every primary comparison:** VGT only; daily (`1d`) signal bars with minute-level execution, marks and
  drawdown; $100,000 fixed notional per trade, no compounding, no pyramiding; $0 commission; 5 bps per side; 11% simple
  interest by calendar day on a 365-day year; the engine's native fill timing, gap handling, stop fills and marking.
- **Run start:** 2016-01-04 (the file's first session) with no earlier warm-up, exactly as a Strategy Lab run from that
  date; each rule waits inside the window for its own lookback.

## 3. Data, doors, chronology

### 3.1 Windows

| Purpose | First session | Last session | Sessions | Use |
|---|---|---|---:|---|
| Development | 2016-01-04 | 2024-12-31 | 2,264 | all search, refinement, stability tests, ranking and selection |
| Validation | 2025-01-02 | 2026-10-30 | 459 | one predeclared evaluation of the frozen shortlist and #4 |

New York regular-session dates (`groupMarketSessions`: 09:30–16:00 ET or the early close, plus the closing print).
y = sessions ÷ 252: 8.984 (development), 1.821 (validation, yTest), 10.806 (full run). The validation window has one
session more than Study 8's test (which ended 2026-10-29); results are not compared with Study 8's numbers.

### 3.2 Doors (`data.ts`; every opening is logged to `results/doors.jsonl` with the chain head and git HEAD)

- **Development door:** only the first 42,469,694 bytes of `data/VGT/data.csv` (743,918 rows, last row
  2024-12-31T21:11Z, sha256 `c144619f…ecb`), verified before parsing; 2,264 sessions; no recorded split before 2025
  (verified). Every worker re-verifies it. No byte after 2024 enters a development process, and the point caches live
  only in those processes.
- **Full door:** the whole file (sha256 `2ee06310…412e`, 935,608 rows, 2,723 sessions to 2026-10-30), VGT's 8-for-1
  split of 2026-04-21 forward-adjusted by the repository's rule. It refuses unless `FROZEN_SELECTION.json` exists, is
  committed, and its body hash is presented.
- **P1 direct runs** (§10) use a scratch root whose `data/VGT/data.csv` is a real copy of the development prefix, so
  the unchanged Strategy Lab runner is physically capped at 2024-12-31 too.

### 3.3 Coverage

`dataset-report.json` (2026-11-02) lists 2,723 expected NYSE sessions with regular bars, none missing, none on closed
days, 13 early closes with late bars, median minute coverage 0.846. P1 records the development window's coverage
(missing, partial < 50% of scheduled minutes, closing prints, the 2016-01-04, 2024-12-24 and 2024-12-31 sessions);
validation records the full window's (adding 2025-01-02, 2026-04-21, 2026-10-29 and 2026-10-30). A missing or partial
session is reported with its effect on comparability; nothing is filled or interpolated.

### 3.4 Boundary

Validation is one continuous causal run from 2016-01-04 to 2026-10-30: positions, pending orders, indicator history,
continuation and gate states and accrued interest carry across 2024-12-31 (no reset). Development figures come from
the development door. Validation net = marked equity at the last 2026-10-30 close − marked equity at the 2024-12-31
close. The validation drawdown starts with its peak at that boundary equity and is updated on every minute mark after
the 2024 close. A position open at the boundary is reported as carried in, split into its development part (its mark
at the 2024 close) and its validation part; new validation entries are reported separately. A no-lookahead check
requires the full run's daily marks and closed trades through 2024-12-31 to equal the development-door run's.

## 4. The conditional search space (`context.ts`, `space.ts`)

A genome is 8 structural genes and 50 numeric genes (d = 58). A configuration **is** its effective Growth 1.4.0
parameters (the registry's identity rule): latent genes never enter it, and two genomes with the same effective
parameters are one configuration, evaluated once. Every effective configuration is validated by the registry
(`validateParams`) and the engine (`tradingParamErrors`). Its id is `g` + the first 12 hex of sha256(canonical
effective JSON | 1d); the manifest stores the full hash.

**Structural genes:** entry {Rise from recent low, trend breakout}; trend filter {off, price change, regression slope,
rising SMA, higher highs/lows, momentum}; persistent eligibility {off, time-limited, minimum strength, maximum extension,
deterioration, reset-and-renew} (Rise only — with the breakout it is not applicable and latent, as in the registry);
Drawdown Recovery Gate {off, on}; hold {off, maximum losing hold, hold + buffered intraday loss} (the buffer needs the
hold); initial risk stop {off, on}; retention {off, on}; continuation {off, Classic D1, breakout, shallow pullback, MA
cross}. 5,040 structures.

**Numeric genes** (value = min + index × step; r = neighbourhood radius in steps; source: **R** = the 1.4.0 registry's
own `search` domain, **S8** = Study 8's D1 box, **P** = defined here from first principles):

| Gene | Grid | r | Src | Gene | Grid | r | Src |
|---|---|---:|---|---|---|---:|---|
| Rise X % | 1–20 / 0.5 | 2 | P | Rise N bars | 5–250 / 5 | 2 | P |
| breakout SMA | 10–200 / 10 | 1 | R | breakout K | 5–120 / 5 | 2 | R |
| breakout prior high | 5–120 / 5 | 2 | R | trend change lookback | 5–120 / 5 | 2 | R |
| trend change min % | −5–10 / 0.5 | 2 | R | slope lookback | 5–120 / 5 | 2 | R |
| slope min % | −5–10 / 0.5 | 2 | R | rising SMA | 10–200 / 10 | 1 | R |
| SMA comparison | 1–30 / 1 | 2 | R | structure lookback | 4–120 / 2 | 3 | R |
| structure min % | 0–5 / 0.25 | 2 | R | momentum S | 2–30 / 1 | 2 | R |
| momentum L | **40**–250 / 10 | 1 | R* | momentum min S % | −2–10 / 0.5 | 2 | R |
| momentum min L % | −15–10 / 0.5 | 2 | R | eligibility max age | 1–30 / 1 | 2 | R |
| min strength % | 0–10 / 0.5 | 2 | R | max extension % | 0.5–10 / 0.5 | 2 | R |
| deterioration % | 0.5–10 / 0.5 | 2 | R | reset drop % | 1–10 / 0.5 | 2 | R |
| renewal rebound % | 0.5–10 / 0.5 | 2 | R | dip lookback | 10–120 / 10 | 1 | R |
| dip threshold % | 2–15 / 0.5 | 2 | R | retracement % | 30–100 / 10 | 1 | R |
| confirmation sessions | 0–10 / 1 | 1 | R | trailing stop % | 3–15 / 0.5 | 2 | S8 |
| max hold days | 3–30 / 1 | 2 | S8 | buffer % | 0–6 / 0.25 | 4 | S8 |
| ATR sessions | 5–60 / 5 | 1 | R | ATR multiple | 1–5 / 0.5 | 1 | R |
| retention sell % | 10–90 / 10 | 1 | R | retention SMA | 10–200 / 10 | 1 | R |
| closes below | 1–5 / 1 | 1 | R | continuation W | 10–200 / 5 | 4 | S8 |
| Classic P % | 3–20 / 0.5 | 2 | S8 | Classic Y % | 0.1–5 / 0.1 | 2 | S8 |
| cont. breakout buffer % | 0–5 / 0.25 | 2 | P | cont. formation bars | 1–30 / 1 | 2 | P |
| uptrend SMA | 10–200 / 10 | 1 | P | uptrend slope bars | 1–30 / 1 | 2 | P |
| uptrend min rise % | 0–5 / 0.25 | 2 | P | pullback min % | 0.5–10 / 0.5 | 2 | P |
| pullback band % (max = min + band) | 0.5–15 / 0.5 | 2 | P | recovery % | 0.25–5 / 0.25 | 2 | P |
| MA-cross SMA | 10–200 / 10 | 1 | P | MA-cross rising bars | 1–30 / 1 | 2 | P |
| MA-cross min slope % | 0–5 / 0.25 | 2 | P | MA-cross margin % | 0–3 / 0.25 | 2 | P |

R* = the registry's 20–250 narrowed to 40–250 so that S < L always holds. The pullback band makes pmin < pmax hold by
construction. Radii are 4.0–16.7% of each grid (Study 8's absolute radii were 4–17% of its box), except the
5-level retention closes-below gene, whose smallest move (one close, r = 1) is 25%. P ranges: X from about one
daily VGT move to a large rebound; N one week to one year; the continuation inputs on the same scales as the registry's
own SMA, comparison and percentage domains.

**Fixed, not searched (documented exclusions):** symbol, bar resolution (1d), cost (5 bps; stresses only), notional,
interest, fills; values outside the box; the registry's other combinations that its own rules forbid (the buffer
without the hold, eligibility with the breakout). Because the grid steps are the registry's, some of #4's values are
off-grid (retracement 45 on a 10-step grid): the search cannot produce #4 exactly. #4's effective configuration is
removed wherever it could still appear (screen, fillers, offspring, refinement moves; counted in the search record) and
is never a shortlist member.

**Distance** (every distinctness rule): normalized L∞ — 1 between different structures; within a structure the largest
|Δ index| ÷ (levels − 1) over the active numeric genes.

**Neighbourhoods** (Study 8's Latin-hypercube "clip" design and its in-box variant): only the centre's **active
numeric** genes move — continuous and integer genes alike by index offsets round(u · scale · r), u from a Latin
hypercube with one column per numeric gene, so the same labels give the same offsets for every centre (common random
numbers); clip mode clips to the grid, in-box mode samples inside [c − r, c + r] ∩ grid. The structure (switches,
methods, policies) is the phenotype and never moves; conditional inputs move only while active. Points equal to the
centre or an earlier point (same effective configuration) are dropped. Every neighbourhood reports n (= distinct
effective configurations) and the number of distinct trade ledgers among the centre and its points.

## 5. Point metrics (Study 8's record and fitness, imported unchanged)

Each run gives a Study 8 `PointRecord` (`adapter.ts`): net = realized + marked open, after interest and costs; minute
drawdown (the engine's strict tracker over every minute mark and close) and daily drawdown, $ and % of $100,000;
lots = trades; episodes (a trade starts a new one when it enters > 10 sessions after the previous exit); lot-years;
held calendar days and net per occupied $100k-year; top-trade share; calendar-year attributions (mark at the year's
last close − mark at the previous year's) with best year; the ledger signature (entry, exit, net). Also: wins, losses,
breakevens, exposure (sessions invested %, Strategy Lab's "Sessions invested"; calendar time invested % beside it),
profitable episodes, net without the largest winner, time underwater.

## 6. Fitness (Study 8 §6, literally)

Constrained Pareto objectives: maximize centre net/yr, neighbourhood median/yr and p10/yr; minimize neighbourhood p90
minute drawdown. Constraints → normalized violation (non-finite = infeasible): C1 centre DD < $35,000 (strict); C2
share of neighbours with DD < $35,000 ≥ 0.90 and p90 < $35,000; C3 lots ≥ ⌈1.5·y⌉ = 14, episodes ≥ ⌈0.5·y⌉ = 5,
lot-years ≥ 3; C5 median ≥ $10,000/yr and p10 > 0; C6 ≥ $11,000 per occupied $100k-year; C7 top trade ≤ 25% of net,
best calendar year ≤ 75%, net excluding the best year ≥ $5,000/yr. (C4 is pool-only.) **Robust profit** = ½ median
+ ½ p10 of neighbourhood net; robust annual profit = that ÷ y. Dollar totals are reported beside every per-year figure.

## 7. Search (`search.ts`; one job, the F24 chronology on the development door)

### 7.1 Schedule

Study 8's V-track schedule with its own dimension rule s(d) = max(1, d/16) = 3.625 for d = 58 applied to the
joint-proposal budgets (Study 8 scaled screens, combinations, rung-1 cap, population and new configurations this way):

| Step | Study 8 V | This study |
|---|---:|---:|
| Screen | 8,192 Sobol | 32,768 (≥ 8,192 × s, a power of two) |
| Rung-1 cap (½ by rank on (−net, DD, −lots), ½ by greedy max–min L∞) | 1,024 | 3,712 |
| Rung 1 / 2 / 3 neighbourhood n | 16 / 64 / 128 | 16 / 64 / 128 |
| NSGA-II islands (T1: +2 up to 8) | 4 | 4 (≤ 8) |
| Population; new configurations per island; generations | 64; 2,048; ≤ 40 | 232; 7,424; ≤ 40 |
| Rung 2: top by constrained rank at L∞ ≥ 0.02 | 192 | 192 |
| Rung 3: top at L∞ ≥ 0.03 | 48 | 48 |
| Refinement: starts at 0.05, passes, n, gain | 6, ≤ 2, 64, ≥ $1,000/yr | same |
| Shortlist at L∞ ≥ 0.10 | ≤ 6 | ≤ 6 |
| Selection families | 2 × 128 | 2 × 128 |

Pilot estimate: ≈ 671,000 points, ≈ 92 min on 14 workers (≈ 160 min if T1 doubles the islands). Compute is not
limiting, so breadth is not reduced.

### 7.2 Stages (Study 8's, decision for decision)

1. **Screen** (departure, §12): the repository's scrambled Sobol sequence has 16 dimensions; it drives the 8 structural
   genes and the 8 numeric genes active in most structures (X, N, trailing stop, hold days, buffer, continuation
   window, eligibility age, dip threshold); the other 42 numeric genes come from a joint Latin hypercube of the same size
   (Study 8's joint-LHS tool). Duplicates by effective configuration are dropped. **Plausible:** centre DD < $35,000,
   net > 0, lots ≥ ⌈14/2⌉ = 7. Promotion to rung 1 as in the table.
2. **Rung 1** (n = 16) on the promoted centres.
3. **NSGA-II islands:** island i takes every 4th member of the rung-1 rank order (i mod 4), up to the population, and is
   filled from a joint Latin hypercube; constrained-domination survivor selection and binary tournaments (the
   repository's operators); stagnation stop after 10 generations without a 1e-3 relative gain of the 2-D hypervolume of
   (robust/yr, p90 DD). **Variation (departure, §12):** inside a crossover event (p 0.9) the structural genes are
   exchanged uniformly and the numeric genes by the repository's SBX (η 15); each structural gene is then reset to a
   different level with probability 1/8, and the numeric genes get the repository's polynomial mutation (η 20) at rate
   1/(active numeric genes of the child). Offspring already seen (same effective configuration) are duplicates.
4. **T1** (island saturation), **rung 2** with **T3** (coverage), **rung 3**, **refinement** (every single-gene probe
   move ±⌈r/2⌉, ±r of the active numeric genes; acceptance from a feasible start: stays feasible, median and p10 not
   lower, p90 not higher, robust/yr ≥ +$1,000; from an infeasible start: violation −0.01), **T2** (bootstrap 2,000
   of the rung-3 records; if the top two feasible differ by less than the larger SE, the top 8 are re-scored with
   r3 + r3b), exactly as Study 8 §7.1–7.2.
5. **Shortlist:** one candidate per identical ledger signature, then ≤ 6 picks at L∞ ≥ 0.10 in this order: profit
   (robust/yr), robust (share, among median ≥ 50% of the profit pick's), balanced (robust/yr ÷ p90), centre (centre
   net/yr), the Pareto order, then infeasible-on-development fill.
6. **Selection evidence:** select1 and select2 (2 × 128) and their pooled figures, for every member and for #4.

**Seeds:** `deriveSeed('growth-vgt-study8', …labels, 'V', 'DEV')`, sfc32. Families: `screen` (+`sobol`/`lhs`), `fill`
(island), `ga` (island), `r1`, `r2`, `r3`, `r3b`, `refine`, `bootstrap`, `select` (rep 1–2); qualification
`confirm` (rep 1–3), `confirm-inbox` (1–2), `confirm-half`, `confirm-wide`; validation `test`, `test-inbox`, `test-half`,
`test-wide` with fold label `VAL`; engineering only `pilot`, `parity`, `parity-determinism`. No family is chosen by its
result. The islands share the rung-1 offsets (common random numbers), as in Study 8.

**Archive:** every screened configuration (`search-screen.csv.gz`) and every rung-1 configuration
(`search-archive.csv.gz`) with its effective parameters, structure and figures; the record counts unique
configurations, structures and ledgers at each rung.

## 8. Qualification, development diagnostics, selection (`qualify.ts`, development door only)

### 8.1 Gates (every shortlist member, after the search is sealed; independent confirmation families)

| Gate | Requirement |
|---|---|
| Q1 | centre DD < $35,000 |
| Q2 | confirm 1–3 pooled (≈ 384 unique): share ≥ 0.90 and p90 < $35,000 |
| Q2b | the in-box pair (2 × 128) likewise, when an active gene is within r of a bound |
| Q4 | net > 0, best year ≤ 75% of net, net excluding the best year ≥ $5,000/yr |
| Q5 | lots ≥ 14, episodes ≥ 5, lot-years ≥ 3 |
| Q6 | largest trade ≤ 25% of net |
| Q7 | at 10 bps per side: net > 0 and DD < $35,000 |
| Q8 | confirmation median development net ≥ 60% of the centre's (> 0) |
| **Q9** | positive in at least 3 of the 4 expanding test windows (2020–21, 2021–22, 2022–23, 2024) for the centre **and** for the confirmation median (departure, §12) |
| E1 | confirmation median ≥ $10,000/yr and p10 > 0 |
| E2 | ≥ $11,000 per occupied $100k-year |

Infeasible-on-development members never qualify. **Marginal:** Q2 passes with pooled share ≤ 0.93 or a replicate
fails on its own. #4 gets the same evidence on the same labels (reported; never a seed).

### 8.2 Development diagnostics (every member and #4; report-only except Q9)

Expanding folds (F19 → 2019 / test 2020–21, F20 → 2020 / 2021–22, F21 → 2021 / 2022–23, F23 → 2023 / 2024: the
centre and confirmation-median attributions; no re-optimization), year-by-year contributions, the largest winner and
the net without it and without the top 3, distinct moves and profitable moves, losing trades (count, sum, worst,
longest losing streak), exposure, time underwater (longest span and dates, share of sessions), 10 and 20 bps runs each
on its own, trades by origin (base or continuation method), PBO by CSCV over the 64 best rung-2 configurations ×
half-years 2018H1–2024H2, and the selection → confirmation decay.

### 8.3 Winner matching against #4 (predeclared; development window here, validation in §9)

Within one window, a **winner** is a trade entered in the window with net > 0 (closed, or open and marked positive at
the window's end). Candidate and #4 winners are matched **one to one** by the largest number of sessions both hold
(ties: earlier #4 entry, then earlier candidate entry; ≥ 1 common session). A matched candidate winner is **retained**
if its entry and exit (or last) sessions are each within ±2 sessions of #4's, otherwise **retimed**. An unmatched
candidate winner overlapping a #4 winner is an **extra entry into a #4 move** (multiple entries into one move);
one overlapping no #4 winner is a **new winning trade**, and new winning trades are grouped into **new winning
moves** (Study 8's 10-session episode rule) and flagged when they overlap a #4 loss. Unmatched #4 winners are **lost**
(with whether the candidate held a losing trade then). Losing closed trades are compared by count and sum ("increased"
if either is worse). The winner-count comparison is labelled **inconclusive (sparse)** when #4 has fewer than 5
winners in the window or the counts differ by at most 1.

### 8.4 Roles, ranking, freeze

Roles in the **selection-family** order, each to the first **qualified** member at L∞ ≥ 0.10 from the holders taken:
**profit-first** (robust/yr; ties lower p90, then id), **robustness-first** (share, among members whose selection
median is ≥ 50% of the profit holder's), **balanced** (robust/yr ÷ p90), and at most 2 **extra** holders whose
development ledger Jaccard with every holder is < 0.5. A role nobody qualifies for stays **empty**: no weak candidate
fills it. **Ranking:** tier "strong" if the confirmation robust/yr ≥ #4's under the same labels, else "modest"; then
robust/yr, p90, id. **The primary candidate is rank 1.** `freeze` writes `FROZEN_SELECTION.json` (read-only): the
timestamp, git HEAD and protocol commit, code and engine digests, data pins, the rulebook, every member's exact
effective settings and configuration hash, qualification results, roles, ranking, primary, the validation plan. It
is committed to git **before** the full door opens. No role holder → the pre-registered outcome **"no challenger
qualified"**; validation still runs for the shortlist and #4, labelled diagnostic.

## 9. Final evaluation (`validate.ts`, once, after the freeze commit)

1. **P2 — browser parity (first step):** #4 on 2016-01-04 → 2026-10-30, 1d, through the unchanged Strategy Lab runner
   on the canonical file, against the brief's figures: total marked net and realized net to the displayed cent
   ($145,468.46 each), minute DD $14,578.10 and 14.58%, 10 wins / 3 losses / 0 breakevens / 13 closed exactly, exposure
   37.0% at one decimal (sessions invested %, or calendar time invested %; which one matched is recorded), flat at the
   end. Then the adapter's full-door run of #4 must equal that runner trade for trade and mark for mark. On a mismatch:
   report expected versus observed, investigate data coverage, engine version, adjusted price units, fill timing,
   stops, financing and marking; never tune #4; withhold any claim of browser-equivalent improvement while it remains.
2. **The battery** (one full-door opening): every shortlist member — role holders first in rank order, then the other
   members in shortlist order — and #4, failures included: the continuous run and its boundary split (§3.4), the
   no-lookahead check, test families 1–3 (3 × 128) + in-box pair + half/wide on the full run, and Study 8's T gates
   (veto only; never reorder, replace or rescue):

| Gate | Requirement (run 2016-01-04 → 2026-10-30, 5 bps, 11%) |
|---|---|
| T1 | whole-run centre minute DD < $35,000 |
| T2 / T2b | test families pooled share ≥ 0.90 and p90 < $35,000 / the in-box pair likewise for near-bound members |
| T3 | validation net ≥ $10,000 × yTest ($18,214); pooled test median validation net > 0 and ≥ $5,000 × yTest |
| T4 | at 10 bps: validation net > 0 and whole-run DD < $35,000 |
| T5 | whole run: best year (2026 partial counted) ≤ 75%, ex-best ≥ $5,000/yr, largest trade ≤ 25% |
| T6 | whole run: lots ≥ ⌈1.5 × 10.806⌉ = 17, episodes ≥ 6, lot-years ≥ 3; validation: new entries ≥ 3, new episodes ≥ 1 |
| T7 | whole run ≥ $11,000 per occupied $100k-year |

   **Status:** fail if any T gate fails; ambiguous if all pass but the pooled share ≤ 0.93, a replicate fails T2 on its
   own, or the centre DD ≥ $33,000; pass otherwise.
3. **Against #4 on the same dates** (reported for every member): validation net and validation minute DD (from the
   boundary) and their deltas; **"beats #4" means higher validation net with equal or lower validation drawdown**;
   winners retained, retimed, added and lost and whether losses increased (§8.3, validation window and whole run).
4. **Conventions versus Study 8:** Study 8's T1 drawdown runs from the start of the whole run; the brief's validation
   drawdown starts at the boundary equity — both are reported. Validation net is Study 8's period attribution (mark at
   the window's last close − mark at the close before it).

**Pre-registered reading.** No role holder → "no challenger qualified". Primary: pass → "the primary candidate passed
the frozen validation battery"; ambiguous → "passed with ambiguity"; fail → "did not deliver on validation". A
profitable member can still fail. Winners are described as the best found within this declared search. After
validation, selection ends; ideas go to the report as future research.

## 10. Engineering parity before the search (P1, `parity`)

On the development data: #4, 40 engineering-seed configurations chosen greedily so that every structural level appears
(target twice; the record lists the counts),
#4 at 10 bps and one configuration at 20 bps, each through the unchanged Strategy Lab runner (subprocess, physically
capped prefix) and through the adapter: every metric (net, realized, interest, costs, minute and daily DD, trades,
wins, losses, breakevens, open, exposure, window), every trade (entry and exit times, entry fill, net, exit reason) and
every daily mark must agree (|Δ| ≤ 1e-9). Plus determinism: 64 configurations evaluated in process twice and through
the worker pool must be identical. Any difference stops the study until resolved by an amendment; the record keeps
only difference counts. P1 also records the development coverage (§3.3).

## 11. Integrity

Local hash chain `results/chain.jsonl` (phases protocol → parity → search → qualify → selection → validation; each
entry hashes its records, the door log and the previous entry), door log `results/doors.jsonl`, write-once sealed
records with body hashes, git commits at the protocol freeze and the selection freeze. Every stage re-verifies the
chain, refuses if the engine or the decision code (`src/growth-vgt-study8/*.ts` except `report.ts` and `tests/`)
changed since the last sealed digest, unless an `AMENDMENTS.md` entry is acknowledged by `acknowledge-code <ID>`. The
search, qualification and freeze refuse once the selection exists; validation refuses unless the selection is
committed and refuses a second time. Crash policy: a crashed stage writes nothing and is rerun once with the same
configuration and seeds, labelled and disclosed.

## 12. Departures from Study 8 and why Growth requires them

| Item | Study 8 | Here | Why |
|---|---|---|---|
| Rules and engine | D1, `traceBook` fast path, N-book replay | Growth 1.4.0 through the Strategy Lab mapping and `runRiseTrading` | the brief's strategy and canonical backtester |
| Parameters | 8 always-active numeric | 8 structural + 50 conditional numeric genes; identity = effective parameters | Growth's switches, methods and policies |
| Screen | 8,192 16-D-or-less Sobol | 32,768: Sobol (16 genes) + joint LHS (42) | the repository's Sobol has 16 dimensions; s(d) |
| GA variation | SBX + PM on all genes | + uniform crossover and reset mutation of structural genes; PM rate 1/active genes | categorical genes; latent genes |
| Neighbourhood | all 8 coordinates | active numeric genes only; structure fixed | the structure is the phenotype; inactive inputs do not exist |
| Arming, y | 2017-06-15; y from arming | the run starts 2016-01-04 with the engine's own warm-up; y from 2016-01-04 | identical to the browser run of #4 |
| Folds | F19–F23 re-optimized, F24 primary | F24 only; F19–F23 windows as diagnostics and Q9 | the brief names the F24 chronology; Q9 adds the stability check the brief asks for |
| Q7/T4 stresses | 10 bps, 14%, next-open, +25 bps | 10 bps gate; 20 bps report-only | only the cost is a native Growth input; the brief asks for 10 and 20 bps |
| E3, tier comparator | E3 vs B1 (pools); tier vs B1 | no E3 (one book); tier vs #4 | #4 is this study's fixed control |
| Test window | to 2026-10-29 | to 2026-10-30 | the brief |
| Audit agents | independent pre-test and final audits | the deterministic checks of §10–11 and a final self-audit of the records | single-session study; disclosed |

## 13. Deliverables

`README.md`; `REPORT.md` (the side-by-side table of #4 and the frozen finalists with separate development and validation
columns for total marked net, minute DD $ and %, W/L/B, exposure and deltas to #4, two decimals; the detailed ledger with
realized and open P&L, drawdown dates and recovery status; trade-offs and lost #4 winners; which phenotypes met the
frozen criteria, the stability evidence, whether the primary delivered; the exposure disclosure); `PROTOCOL.md`,
`AMENDMENTS.md`, `FROZEN_SELECTION.json`; `RUN_COMMANDS.md`; `RESEARCH_RECOVERY.md`; sealed records (`results/`), the
trial archive, per-candidate ledgers and year tables, generated tables (`results/report/`).
