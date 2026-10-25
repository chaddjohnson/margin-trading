# Protocol: portfolio-aware D1 optimization of complementary ETF books for the All-lowDd allocator

Written on **2026-10-24**, on branch `research/trailing-buy-four-family-optimization` at HEAD `cef15346` (clean when the
study began; no other process was modifying the repository), **before** any candidate-ETF price-performance figure of
this study was computed. `npm run portfolio-aware-d1 -- freeze-protocol` records this file's sha256, the time and the
git state in `results/protocol_freeze.json` and refuses a second freeze; any later change is an amendment appended in
§13 with its reason and time. The constants are declared in `src/portfolio-aware-d1/context.ts` (`study`), so the
code and this document can be compared line by line.

What existed before the freeze, and what had been looked at:

- The N-book allocator engine (`src/portfolio-aware-d1/nbook/`), the trace cache (`trace.ts`) and the fixed-pool
  replay (`replay.ts`). Development checks compared them **mechanically**: the frozen engine against the N-book engine
  on the frozen All-lowDd books (fixed training 0 bps; portfolio training 5 bps: 0 differences in every trade, lot,
  signal, daily row, ledger event and drawdown), the replay against the N-book engine on All-lowDd (training, 0/2/5/10
  bps, 0 differences), and 63 five-book pools (each of the seven candidates with three arbitrary vectors — D1's
  constants, the box's lower corner and a wide/slow corner — at 0/5/10 bps), printing **only** difference counts,
  trade and lot counts and timings, never a P&L, drawdown or delta of a candidate.
- The baseline's own training figures (All-lowDd fixed training $249,173.90 at 0 bps, $242,196.01 at 5 bps; 71 lots)
  and every earlier study's published results, including the complementary-ETF study's post hoc diagnostics of
  **unchanged D1** and of the eight-ETF XLE vectors on the seven candidates' training data (`research/
  complementary-etf-d1/results/stageA-diagnostics/`). Those are prior, inspected training facts.

## 1. Question, references and scope

Can a D1 book on one of seven further ETFs — with its **eight numerical D1 parameters** chosen either for its own
standalone result (**Track S**, standalone-first) or for its **incremental executable effect on the shared pool**
(**Track P**, portfolio-aware) — improve the executable **All-lowDd shadow** allocator? The objective is the quality of
the combined, causally funded trade sequence: funded P&L, risk, and what the new book displaces.

- **Control S0:** All-lowDd shadow, unchanged byte for byte: VGT `primary`, XBI/XRT/KRE `lowDd`
  (`config/phenotypes/D1/*.json`), first executable signal wins, shadow books, one shared pool, alphabetical tie order.
  **VGT D1 alone** remains a separate benchmark.
- **Candidates:** GDX, XOP, EWZ, TLT (primary attention); XLE, XLU, GLD (secondary). IWM, IWN, XLF, XLY are context
  only; VOOG is the portfolio core. Every candidate uses the unchanged D1 algorithm family
  (`src/shared-margin-portfolio/strategy.ts` machines, the verified port of `src/app/allIn-trailingBuy-
  postExitContinuation.ts`), only its eight parameters vary. The four frozen phenotypes are never re-optimized.
- **No** live orders, brokerage integration, leverage optimization (the 20% fraction is fixed), new algorithm,
  ranking/priority function, eighth candidate or commit. Frozen artifacts, phenotype files, the legacy archive and the
  allocator command without `--dataset` are not modified.
- The earlier generic daily-proxy screen (15%/2%/10%/20 sessions) is **context only, never a gate**.

## 2. Data, partitions and access

- One canonical headerless six-column UTC minute-OHLCV file per symbol, `data/<SYMBOL>/data.csv`; windows from
  `data/partitions.json` (sha256 `43893f3d…`): **training** 2016-01-01 → 2023-12-31 (last session 2023-12-29),
  **holdout** 2024-01-01 → 2025-10-16, **final** 2025-10-17 → last row, **all** = every row. The last common session of
  all eleven trading symbols and VOOG is verified by `audit` before any use (expected 2026-10-13); nothing is
  extended past it or filled.
- Splits (`config/market-events/splits.json`) are forward-adjusted **once** by the shared loader: VGT 8:1 and VOOG
  6:1 (2026-04-21), XOP 1:4 reverse (2020-03-30, inside training), XLE/XLU/XLY 2:1 (2025-12-05). `audit` re-verifies
  the registry (`npm run market-events -- verify`) and single-adjustment parity before any candidate phenotype runs. A
  material unrecorded event would block that symbol (not repaired).
- **Every optimization, fitness evaluation, shortlist, selection and configuration design reads the training
  partition only**, through `loadDatasetSessions({ access: 'optimization' })`, which refuses any other partition before
  a byte is read. The study's search code has no other data path; caches and traces are built from those loads only.
  Holdout, final and all are read for a candidate only by the post-freeze command, which first verifies
  `FROZEN_SELECTION.json`'s body hash and refuses otherwise. The integrity audit may read every row for coverage and
  corporate actions, never a strategy result. The baseline controls (S0, VGT alone) are evaluated on the old horizon
  and the full history as already authorized (those results were inspected in earlier work).
- Training runs: books arm from **2017-06-15** (session 365, the D1 convention); accounting from the close of
  2016-01-04; no warm-up exists before the file's first row. 11% simple interest, 365-day year.
- **Distributions:** the portfolio books VGT/VOOG distributions from the verified ledger
  (`config/market-events/distributions.csv`; `audit` checks coverage through the last valuation date). Candidate lots
  are **price-only**, the frozen convention for non-VGT books. Omitted candidate distributions are bounded analytically
  (lot-days held × principal × yield ÷ 365 at stated yields, and the break-even yield that would change a sign); no
  distribution is synthesized. Omission understates candidate lots, so it biases against additions.

## 3. Engines and the cache (correctness first)

- **Authoritative full engine:** the N-book allocator (`src/portfolio-aware-d1/nbook/engine.ts`), the frozen
  `runAllocator` with the books' symbols taken from the configuration (book order VGT, XBI, XRT, KRE, then the others
  alphabetically; same-minute tie order: all books alphabetically, the shadow policy's order extended). Its authority
  rests on exact parity with the frozen engine on every four-book control (gate E1).
- **Fast path:** each book's virtual-trade trace computed once by driving the frozen `ShadowBook` over its own symbol
  (`trace.ts`), cached by a key of every behaviour-relevant input (symbol, data sha256/id/window/session count, splits
  registry hash, all machine parameters, notional, rate, cost per side, stop fill and slippage, arming and accounting
  sessions, sha256 of the machine/book/trace source); then the fixed pool replayed causally (`replay.ts`). No cache
  crosses cost levels.
- **Gates before the cache may select anything** (`npm run portfolio-aware-d1 -- parity`):
  - **E1** frozen engine = N-book engine on S0 and VGT alone, fixed and portfolio, 0/2/5/10 bps, on training, on
    `all` through 2025-10-13 and on the full `all` history: every trade, lot, signal, daily row, ledger event, drawdown
    statistic identical (numbers exactly equal; NaN = NaN).
  - **E2** replay = N-book engine (fixed) on S0 and VGT alone at 0/2/5/10 bps on the same three windows, every field.
  - **E3** replay = N-book engine on candidate pools: for each of the seven candidates, the predeclared parity set
    (§4.2's controls plus 12 vectors drawn deterministically from the common Sobol pool, including the shortest and
    widest stops, the longest hold, the longest continuation window and both lookback extremes present in the pool),
    at 0/2/5/10 bps, as five-book additions; plus one substitution and one six-book combination per cost; standalone
    single-book runs for the same vectors. XOP's traces cross its reverse split.
  - **E4** every nominated champion (§5.4) and every Stage C configuration is re-run on the full engine on training
    before the freeze, and every post-freeze result comes from the full engine.
  Money must agree exactly (the comparison is exact equality, stronger than $0.01); times and choices exactly. If E1–E3
  fail and cannot be fixed, the cache is not used to select anything: the search falls back to the full engine with
  the budgets of §4–§5 reduced in the same proportion for both tracks, and `CACHE_VS_FULL_ENGINE.md` says so.

## 4. Stage A — causal opportunity map and the common initial pool (training only)

### 4.1 The search space

D1's eight parameters on the phenotype grid, inside the **existing eight-ETF box** (`src/multi-etf-d1/context.ts`,
used unchanged): X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30 calendar days, L 20–250 sessions, buffer
0.0–6.0%, P 3.0–20.0%, W 10–200 sessions. Percentages in tenths of a point, days and sessions integers.

### 4.2 The common pool

**512 unique quantized vectors** from one scrambled Sobol stream over the box (seed `deriveSeed('portfolio-aware-d1',
'common-pool', 'sobol-scramble')`), the **same vectors for all seven candidates and both tracks**, plus the controls:
D1's shipped constants; the six frozen XBI/XRT/KRE `primary`/`lowDd` vectors (in-training vectors of other symbols,
used as generic seeds); for XLE also the eight-ETF program's frozen XLE `primary` and `lowDd` vectors (in-sample on XLE
training; their 2024–2025 results were inspected in that program and are not used). Duplicates are evaluated once. The
benchmark (one trace ≈ 10 ms, one replay ≈ 3–10 ms) shows the full indicative budget is affordable, so nothing is
reduced.

Every pool vector is evaluated on every candidate at **0, 2, 5 and 10 bps per side** in both modes of the same
trace: standalone (the book alone in a fixed $100,000 pool) and pool (S0 plus the book). **5 bps is the principal
cost**; 0/2/10 are robustness checks.

### 4.3 Metrics of a vector (both tracks record all of them)

- **Standalone (Track S):** net (realized + marked unrealized, after interest and costs), minute- and daily-sampled
  maximum dollar drawdown, closed trades, wins, worst trade, longest losing streak, interest, costs paid, distinct
  calendar years with a closed trade, and the attribution of the marked P&L to folds, regimes and years (§4.4).
- **Pool (Track P):** Δ = net(S0 + book) − net(S0) on identical dates and costs; the pool's minute/daily drawdowns and
  net ÷ minute drawdown; the book's funded lots (count, net, years); the exact decomposition
  Δ = (book's funded net) + (net of baseline lots funded only with the book) − (net of S0 lots no longer funded);
  displaced and gained lots by symbol; Δ attributed to folds, regimes and years from the marked equity path;
  borrowing-dollar-days and utilization; independent episodes of the book's funded lots (a new episode starts when a
  decision comes ≥ 20 sessions after the previous lot's exit).

### 4.4 Periods (predeclared; attribution = mark at the last close of the period − mark at the close before it)

- **Folds:** F1 2017-06-15 → 2019-12-31; F2 2020-01-01 → 2021-12-31; F3 2022-01-01 → 2023-12-29.
- **Regimes** (a partition of the eligible training window): R1 2017-06-15 → 2018-01-25 calm late-2017 bull; R2
  2018-01-26 → 2018-04-30 February 2018 volatility shock; R3 2018-05-01 → 2018-09-30; R4 2018-10-01 → 2018-12-31 Q4
  2018 sell-off; R5 2019 (trade-war dips); R6 2020-01-01 → 2020-02-18; R7 2020-02-19 → 2020-04-30 COVID crash and first
  rebound; R8 2020-05-01 → 2020-12-31; R9 2021; R10 2022-01-01 → 2022-10-31 2022 bear market; R11 2022-11-01 →
  2023-02-28; R12 2023-03-01 → 2023-05-31 regional-bank stress; R13 2023-06-01 → 2023-12-29 (incl. the Aug–Oct rate
  sell-off).
- **Years:** 2017 (from 06-15) … 2023.

### 4.5 The opportunity map (descriptive, non-decisional)

From the S0 training run (fixed, 5 bps; the replay, which E2 proves exact): every funded lot, reservation, refusal,
exit and idle interval at minute resolution; busy share overall and by regime. Per candidate: its major declines
(episodes ≥ 10% below the 74-session reference high, closing within 5% of it; descriptive) and the virtual trades of
up to six representative actual D1 phenotypes from the pool — unchanged D1, the best Track S and best Track P vectors
at 5 bps, and the best Track-P-feasible vector of each stop class (tight ≤ 5.0%, medium 5.1–9.0%, wide ≥ 9.1%) —
each trade classified at its decision minute as **busy** (S0 holds or reserves the pool: refused), **idle-clean** (idle,
and no S0 funded decision falls inside its holding interval) or **idle-displacing** (idle, but it would block ≥ 1 S0
funded lot), with counts by regime and the actual outcome in the pool replay (funded or not, and the lots it displaced
or gained). Data validity, liquidity and split/distribution caveats per candidate.

### 4.6 Feasibility (at 5 bps)

- **Track S feasible:** standalone minute drawdown ≤ $35,000; ≥ 8 closed trades; closed trades in ≥ 3 calendar years.
- **Track P feasible:** pool minute drawdown ≤ $35,000; the book has ≥ 5 funded lots in ≥ 3 calendar years.

A candidate is excluded early only if its verified data is broken, its calendar does not align with the books', or no
pool vector produces a single executable D1 entry on training; such exclusions are reported.

### 4.7 Choosing up to three ETFs for the deeper search (mechanical; GDX and XOP get inspection priority only)

1. **Eligible:** the ETF passes the data gates and has **≥ 3 Track-P-feasible pool vectors with Δ@5 > 0**.
2. For each eligible ETF, over its **top 10 Track-P-feasible vectors by Δ@5** (fewer if fewer exist): P-potential =
   median Δ@5 (weight **0.40**); episode breadth = median number of regimes with Δ > 0 (**0.20**); cost robustness =
   median Δ@10 (**0.20**); and over its top 10 Track-S-feasible vectors, standalone robustness = median standalone
   net@5 (**0.20**).
3. Each criterion is converted to a rank score among the eligible ETFs, (n − rank) ÷ (n − 1) (1 for the best; 1 when
   n = 1; ties share the better rank); composite = the weighted sum.
4. Order by composite (descending; equal composites by the higher P-potential). Then one pass from the top: an ETF
   whose composite is within **0.05** of the ETF ranked directly above it moves above it when it has the higher
   inspection priority (GDX, XOP, EWZ, TLT, then XLE, XLU, GLD). **Select the first three** (fewer if fewer are
   eligible; zero is a valid outcome, which ends the study at Stage A with S0 retained).

## 5. Stage B — the two tracks, comparable budgets (training only)

### 5.1 Objectives and constraints

- **Track S:** minimize (−standalone net@5, standalone minute drawdown@5); violation = max(0, DD − 35,000) ÷ 35,000
  + max(0, 8 − trades) ÷ 8 + max(0, 3 − years) ÷ 3.
- **Track P:** minimize (−Δ@5, pool minute drawdown@5); violation = max(0, DD − 35,000) ÷ 35,000 + max(0, 5 − funded
  lots) ÷ 5 + max(0, 3 − funded years) ÷ 3. Δ comes from the complete chronological replay of S0 + the book.

### 5.2 Search (identical design per track and ETF)

NSGA-II on the integer grid (`src/optimizer/nsga2.ts` operators over the eight-ETF box): population **48**, crossover
probability 0.9, SBX η 15, polynomial mutation η 20; the initial population is the track's 48 best pool vectors of
that ETF by constrained domination with the eight-ETF program's diversity rule (normalized L∞ ≥ 0.02); a cap of
**1,000 new unique vectors** per track per ETF (evaluated at 5 bps), at most 40 generations, early stop after **8**
generations without a hypervolume gain above 1e-4 relative (reference point (0, 35,000)). Seeds
`deriveSeed('portfolio-aware-d1', ETF, track, 'nsga2')`. Each track sees only the common pool and its own offspring.
Every evaluated vector's both-mode metrics are recorded; selection uses only the track's own objective. Budgets are
not raised after any result is seen.

### 5.3 Robust selection per track and ETF

Shortlist: the track's **20** best feasible vectors by its primary objective at 5 bps (pool ∪ own search); each is
evaluated at 0/2/10 bps and probed with the eight-ETF one-parameter perturbations (X ±5, ±10; Y ±1, ±2; stop ±5, ±10;
hold ±1, ±2; L ±5, ±10; buffer ±5, ±10; P ±5, ±10; W ±10, ±20 grid steps, inside the box) at 5 bps. A vector is
**robust** when, with "objective" = standalone net (S) or Δ (P):

- **R1 costs:** objective > 0 at 0, 2 and 10 bps;
- **R2 folds:** objective attributed > 0 in at least 2 of the 3 folds (5 bps);
- **R3 concentration:** objective minus its largest positive regime contribution > 0 (5 bps) — no single crash or
  winner carries it;
- **R4 plateau:** ≥ 75% of the in-box probes feasible, and the probes' median objective > 0 and ≥ 50% of the vector's;
- **R5 (Track P only) risk efficiency:** pool net ÷ pool minute drawdown at 5 bps ≥ 0.95 × S0's.

The track's selected vector is the highest objective@5 among robust shortlisted vectors; if none, the shortlist
extends once to 40; if still none, the track has no robust vector for that ETF (reported, not forced).

### 5.4 Champions

Per finalist ETF: the **S-vector** (Track S selection) and the **P-vector** (Track P selection), possibly the same or
missing. Each is re-run on the full engine on training (E4). Reported side by side: each vector's standalone and pool
results at four costs, its folds, regimes and episodes, worst trade, losing streak, interest, costs and the
displacement decomposition — the paired answer to "does Track P beat Track S on the pool, and why".

## 6. Stage C — configurations (training only, at most 8 including S0)

Finalists are ordered by their P-vector's training Δ@5 (an ETF without a P-vector after those with one, by its
S-vector's Δ@5).

1. **C0 = S0.**
2. **Additions (≤ 4):** P-add(ETF1), S-add(ETF1), P-add(ETF2), S-add(ETF2); a missing or duplicate (S = P) case is
   skipped and the list continues with P-add(ETF3), S-add(ETF3) until four.
3. **Substitutions (≤ 2):** for each finalist P-vector (S-vector if it has none) and each of XBI, XRT, KRE, the
   **trigger** is ≥ 3 conflicts between that book and the candidate in the training addition run at 5 bps (candidate
   decisions refused while a lot of that book held or reserved the pool, plus that book's S0 lots displaced by
   candidate lots). Each triggered pair is replayed as VGT + the two other frozen books + the candidate; the up to two
   with the highest Δ@5 that also beat the corresponding addition's Δ@5 by ≥ $5,000 are included. VGT is never removed.
4. **Two-ETF combination (≤ 1):** the top two finalists' P-vectors together, only if both additions have Δ@5 > 0, the
   two books' funded holding intervals in their addition runs overlap on ≤ 25% of the smaller one's held days, and the
   combination's Δ@5 ≥ max(single Δ@5) + $5,000.
5. **Pairwise co-refinement:** performed only if the combination qualifies **and** its Δ@5 ≥ the sum of the two single
   Δ@5 (super-additive timing). Then, with the existing four books and ETF1's P-vector frozen, Track P's search (§5.2)
   is re-run for ETF2 inside the six-book pool with a cap of **300** new vectors and the §5.3 rule; the result replaces
   the combination case only if it passes §5.3 and beats it by ≥ $5,000. Otherwise not performed.

Each configuration is run on the **full engine** on training: fixed at 0/2/5/10 bps, and the **20% portfolio** at
0/2/5/10 bps; S0 additionally at **10/15/20/25%** of equity at 5 bps (the matched-borrowing ladder; the fraction is
not optimized). Matched borrowing-dollar-days: S0's ending equity linearly interpolated on the ladder at the
configuration's borrowing-dollar-days (extrapolated from the nearest segment and flagged when outside).

### 6.1 Training advancement gates — a configuration is **nominated** when it passes all

- **T1** fixed Δ@5 ≥ **$15,000**, and Δ > 0 at 0, 2 and 10 bps.
- **T2** fixed minute drawdown@5 ≤ **$35,000**, and net ÷ minute drawdown@5 ≥ **0.95 ×** S0's.
- **T3** the new books' funded lots ≥ 5 in ≥ 3 calendar years; Δ@5 > 0 in ≥ 2 of 3 folds; Δ@5 minus its largest
  positive regime contribution > 0.
- **T4** portfolio @5: ending-equity Δ ≥ **+2%** of S0's; maximum daily percentage drawdown ≤ **35%** and ≤ S0's
  + **1.0** point; maximum minute-sampled percentage drawdown ≤ S0's + **2.0** points.
- **T5** portfolio @5: ending equity ≥ S0's ladder interpolated at the same borrowing-dollar-days.

Configurations that fail are kept as labelled **comparators** (so the S-versus-P question can be answered after the
freeze); they can never be accepted.

## 7. Stage D — freeze once, then the continuous evaluation

1. `freeze-selection` writes `FROZEN_SELECTION.json` once (refuses if it exists): every configuration (books, their
   eight-parameter vectors, order, nominated/comparator status), the S0 phenotype hashes, the frozen ranking (training
   Δ@5, descending), the acceptance rules below, code/data/partition/split/distribution hashes, seeds, budgets and
   evaluation counts, parity signatures, training results and the authorized commands; its body hash is recorded.
2. Only then `evaluate` runs, after verifying the manifest: **one continuous `all` run** per configuration on the full
   engine (fixed and 20% portfolio, 0/2/5/10 bps; S0's ladder at 5 bps), all books arming from 2017-06-15 and carrying
   every state across 2024-01-01 and 2025-10-17, through the last common session; P&L attributed to training, holdout,
   final and all from the marked equity at the boundary closes (open lots marked, interest accrued). Isolated windows
   are not run. A deterministic confirmation re-run of the same command is permitted.
3. **Per segment classification** (fixed, 5 bps, each of holdout and final): **persists** Δ ≥ +$2,500; **reverses**
   Δ ≤ −$2,500; otherwise **disappears**.
4. **Acceptance** (nominated configurations only): post-training Δ@5 (holdout + final, continuous) > 0 and Δ@10 > 0;
   holdout **persists**; final does **not reverse**; portfolio post-training ending-equity Δ@5 > 0; over the full
   `all` run, portfolio maximum daily percentage drawdown ≤ 35% and ≤ S0's + 1.0 point, and fixed minute drawdown
   ≤ $35,000.
5. If Stage C holds no configuration besides S0 (no finalist, or no finalist with a selected vector), the manifest
   freezes that outcome and no candidate is evaluated after training.
6. **Recommendation:** the accepted configuration ranked highest in the frozen training ranking; if none, **All-lowDd
   unchanged**. No re-optimization, reselection, reweighting or rule change after the evaluation; a candidate that
   fails is not rescued. Only an accepted configuration's new phenotype may be registered under
   `config/phenotypes/D1/<SYMBOL>.json` (a new file; the existing four are never modified).

**Evidence grades.** S0's holdout/final results were inspected in earlier work (**inspected baseline**). The frozen
candidates' holdout/final results are a **newly locked comparison** (no candidate vector of this study has been
evaluated there; the eight-ETF XLE vectors' 2024–2025 results were inspected and are labelled so if they are frozen).
The analyst knows the broad 2024–2026 market history (for example gold's rise), so the evaluation is not fully
independent of hindsight; the mechanical, preregistered selection is the safeguard. No genuinely independent evidence
(data after 2026-10-13) exists.

## 8. Risk preferences (reporting; the gates above are binding)

Fixed pool: historical minute-sampled maximum dollar drawdown desired ≤ $35,000 per $100,000 (not a stop-loss).
Portfolio ($300,000, 60/40 VOOG/VGT, 20% of current equity at the decision, simple 11%): daily percentage drawdown
ideal ≤ 30%, 30–35% only with a substantial and robust advantage, > 35% blocks advancement. The benchmark itself is
34.55% daily / 36.92% minute (2020-02-19 → 2020-03-23, through 2025-10-13) — above the ideal; this is reported as is.
The 35/50/60% hypothetical maintenance schedules are reported for the finalists (passive measures); no stress program.

## 9. Controls to reproduce before any outcome claim (`controls`)

Old horizon (2016-01-04 → 2025-10-13, frozen settings): fixed VGT D1 alone $183,043.82 net / $19,330.69 minute DD;
fixed All-lowDd $294,675.77 / $27,968.03; portfolio VGT D1 (B) $2,346,272.33, maximum percentage drawdown 32.73% daily /
35.17% minute; portfolio All-lowDd $2,891,290.87, 34.55% / 36.92% — on the frozen legacy path and on the canonical
`all` path ending 2025-10-13, with the frozen engine and the N-book engine. Newer horizon (full `all`): fixed
All-lowDd ≈ $291,775 (76 lots), portfolio ≈ $3,661,933, verified against the current artifacts. A failure stops the
outcome study.

## 10. Tests and engineering gates

The full test suite, `tsc --noEmit` and eslint against the recorded baseline (462/462 pass; tsc clean; eslint 0 errors,
15 warnings); new tests for the N-book engine (parity on fixtures), the replay (causality: a later exit's P&L or time
cannot change an earlier decision; parity on fixtures), the cache key (every input changes it), the reverse-split
economy on the new paths, and refused data access (holdout/final/all under `optimization`; the post-freeze loader
without a verified manifest). Deterministic re-runs of seeded stages. No existing test is deleted or weakened.

## 11. Outputs

`research/portfolio-aware-d1-optimization/`: README, PROTOCOL, DATA_AND_BASELINE_AUDIT, OPPORTUNITY_MAP,
CANDIDATE_D1_SEARCH, CACHE_VS_FULL_ENGINE, PORTFOLIO_AWARE_OPTIMIZATION, FROZEN_SELECTION.json, HOLDOUT_FINAL_RESULTS,
IMPLEMENTATION_AUDIT, RECOMMENDATION, and `results/` (JSON/CSV: trials and seeds, vectors, signal events, funded and
refused trades, attribution, ledgers, drawdowns, hashes).

## 12. Stop condition

After the frozen evaluation and the reports, the study stops: no further search, candidate, architecture or
sensitivity. Retaining All-lowDd unchanged is a valid outcome.

## 13. Amendments

None.
