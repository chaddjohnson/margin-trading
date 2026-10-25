# Protocol: unrestricted 16-ETF subset selection with joint portfolio-aware D1 optimization

Written on **2026-10-25** on branch `research/trailing-buy-four-family-optimization` at HEAD `96d7535c` (working tree
clean when the study began; no other process modifying the repository), **before** any performance figure of a new
16-ETF subset or parameter vector was computed. `npm run joint-16-etf-d1 -- freeze-protocol` records this file's
sha256, the sha256 of `src/joint-16-etf-d1/context.ts` (where every constant below is declared), the time and the git
state in `results/protocol_freeze.json`, once (a second freeze is refused). A later change is an amendment appended to
§15 with its reason and time, and is permitted only before the first outcome of the stage it affects is read.

**What existed or had been looked at before the freeze.**

- The previous study's verified machinery, reused unchanged (§3): the N-book engine
  (`src/portfolio-aware-d1/nbook/`), the trace cache (`trace.ts`), the causal fixed-pool replay (`replay.ts`), the
  exact structural comparison (`compare.ts`), the freezes (`freeze.ts`), and its record of 1,208 exact parity
  comparisons. No file of that study, of any earlier study, of the frozen allocator, of the phenotype files or of the
  market data is edited by this study; outside its own directories it adds only the npm script, one entry-point line
  in `src/phenotype/strategies.ts` (its registry test requires every `src/app` entry to be listed), the regenerated
  row of `config/phenotypes/COMPATIBILITY.md` and `.gitignore` lines for its regenerable logs.
- Every earlier published result, in particular the frozen benchmarks' figures (B4 All-lowDd training $242,196.01 at
  5 bps; B5 = All-lowDd + GDX `portfolioAware` training $388,489; their continuous `all` runs: fixed $284,245 /
  $486,208, minute drawdown $28,659 / $26,510; portfolio ending equity $3,608,484 / $5,410,977, maximum daily % DD
  34.65% / 29.67%, minute 37.01% / 31.09%) and their holdout/final segments. These are **inspected** facts.
- A throughput benchmark (scratch script, not part of the study) that loaded the 16 training files, traced 16 Sobol
  vectors on each ETF at 5 bps and replayed random subsets, printing **only** load time (72 s), bars per session
  (VOOG 142.7, VGT 325.7, IWN 360.7, the others 387–389), mean virtual trades per trace (27.4), timings (trace ≈ 10 ms;
  replay 2.7 ms for one book, 5.4 ms for 4, 11.6 ms for 8, 13.2 ms for 16) and memory (≈ 1.4 GB). No P&L, drawdown or
  ranking of any vector or subset was computed or printed.
- The study's code and tests, written before the freeze and exercised only on **synthetic** prices (an end-to-end
  smoke test of the whole training search with small budgets, and engine/replay/portfolio checks on fixtures).
- The machine: 10 CPU cores, 16 GB RAM, Node 23.6. Tests: 471/471 before any change; 485/485 with the study's 14 new
  tests at the freeze; `tsc --noEmit` clean; eslint 0 errors, 15 warnings (the pre-existing ones).

## 1. Question, controls and scope

**Primary question.** Among all nonempty subsets of the 16 ETF datasets and all admissible D1 parameter vectors of
their members, which robust combinations historically produced strong net profit with acceptable drawdown when run
through **one causal shared-margin pool**? Does any credibly improve the frozen benchmarks?

- **Universe** (all 16, symmetric): `EWZ GDX GLD IWM IWN KRE TLT VGT VOOG XBI XLE XLF XLU XLY XOP XRT`. Any nonempty
  subset is eligible, including subsets with none of VGT/XBI/XRT/KRE/GDX. VOOG and VGT are eligible **trading books**
  independently of the portfolio's 60/40 VOOG/VGT core.
- **Frozen benchmarks** (comparison runs only, never mandatory members; their files are not modified):
  **B1** VGT D1 alone (`primary`); **B4** All-lowDd shadow (VGT `primary`, XBI/XRT/KRE `lowDd`); **B5** All-lowDd +
  GDX `portfolioAware` (the previous study's accepted `P-add-GDX`: GDX X 27.4% Y 0.4% stop 7.1% hold 18 L 100 buffer
  3.6% P 19.1% W 81, read from `research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json` and checked equal to
  `config/phenotypes/D1/GDX.json`); **C0** the empty trading pool (60/40 core only, portfolio mode; never an eligible
  subset).
- **Algorithm.** The unchanged D1 family (`src/shared-margin-portfolio/strategy.ts` machines driven by the frozen
  `ShadowBook`, the verified port of `src/app/allIn-trailingBuy-postExitContinuation.ts`); only the eight numerical
  parameters vary. Shadow semantics: every book takes every signal it produces; the allocator funds the first
  executable signal when the pool is free; one lot or pending reservation at a time; refused signals stay virtual and
  are never executed later.
- **Not in scope:** live orders, broker integration, the borrowed fraction as a variable (fixed 20%), a new algorithm
  or priority rule, commits, edits to frozen artifacts or phenotypes. A no-advancement outcome is valid.

## 2. Data, partitions and access

- One canonical headerless six-column UTC minute-OHLCV file per symbol, `data/<SYMBOL>/data.csv`, through the shared
  loader (`src/lib/evaluation.ts`): regular sessions only, recorded splits (`config/market-events/splits.json`: VGT
  8:1 and VOOG 6:1 on 2026-04-21, XOP 1:4 reverse on 2020-03-30, XLE/XLU/XLY 2:1 on 2025-12-05) forward-adjusted
  **once**, calendars checked session by session (`assembleUniverse`). Windows from `data/partitions.json`:
  **training** 2016-01-01 → 2023-12-31 (last session 2023-12-29), **holdout** 2024-01-01 → 2025-10-16, **final**
  2025-10-17 → last row, **all** = every row. Books arm from **2017-06-15** (session 365), accounting from the close of
  2016-01-04.
- **Doors** (`src/joint-16-etf-d1/data.ts`), each refusing what it may not open:
  - `trainingUniverse` — every library, search, refinement, robustness and gate computation: all 16 symbols, the
    training partition, `access: 'optimization'` (the loader refuses any other partition before a byte is read). The
    search code has no other data path; traces and caches are built from this load only and carry its content hashes.
  - `benchmarkUniverse` — the benchmark reproduction (§12) on `all`: **only** VOOG, VGT, XBI, XRT, KRE and GDX (B1/B4/B5
    members, whose `all` results were inspected and published); it refuses any other symbol.
  - `evaluationUniverse` — the post-freeze continuous `all` run: only after `FROZEN_SELECTION.json` exists and its body
    hash verifies.
  - The integrity audit reads whole files for coverage, timestamps and corporate actions only — never a strategy result.
- **Distributions.** Portfolio mode books VGT/VOOG core distributions and VGT-lot distributions from the verified ledger
  (`config/market-events/distributions.csv`), the frozen convention; every other book's lots, VOOG lots included, are
  **price-only** (the engine entitles VOOG distributions to the core only — no double counting when VOOG is also a
  book). Fixed mode is price-only for every lot. The omission is quantified, never synthesized: exactly for VOOG and VGT
  lots from the ledger, and for other symbols as lot-days × principal × yield ÷ 365 at illustrative yields of 1%, 3%
  and 6% with the break-even yield that would change a reported sign (§13).

## 3. Engines and the fast path (correctness first)

- **Authoritative full engine:** the previous study's N-book allocator (`runNAllocator`), with the run's books in the
  canonical **book order** (VGT, XBI, XRT, KRE, then the others alphabetically) and **same-minute tie order
  alphabetical among the subset's members** — the previous convention generalized exactly (a subset without some
  ticker simply omits it). Its authority rests on the previous study's exact parity with the frozen engine on every
  four-book control (re-checked here, §11 P0).
- **Fast path:** each (symbol, vector, cost) virtual-trade trace from the frozen `ShadowBook` over its own symbol
  (`traceBook`), cached in memory by the previous study's `traceKey` (data id and sha256, window, splits hash, all
  machine parameters, notional, rate, cost, stop fill, stop slippage, arming/accounting sessions, sha256 of the
  machine/book/trace sources); then the causal fixed-pool replay of the subset's traces (`replayFixedPool`). The
  replay consumes events strictly in engine order (session; bar minutes, then the closing print; exits, fills,
  decisions in tie order) and answers each decision from the pool's state at that moment; a trace's later fields are
  read only when its own fill or exit event is reached. Traces are shared across subsets because a book's virtual
  trades do not depend on funding under shadow semantics. No trace crosses cost levels, windows or notional. The fast
  path is **fixed mode only**; every portfolio figure comes from the full engine.
- **Canonical symbol order.** Every configuration is passed to both engines in book order, so a result never depends
  on how a genome lists its members.
- **Fallback.** If any §11 parity comparison differs and the cause cannot be corrected without changing trade
  semantics, the replay selects nothing: every affected stage runs on the full engine with all budgets of §5–§8 scaled
  by the same factor (measured throughput ratio), recorded in CACHE_AND_CAUSAL_PARITY.md.
- **Every nominated configuration** is re-run on the full engine on training (fixed at four costs, portfolio at four
  costs) before the freeze; every post-freeze figure comes from the full engine, with the replay re-checked against it.

## 4. Periods (training only, predeclared)

- **Folds** (forward blocks): F1 2017-06-15 → 2019-12-31; F2 2020-01-01 → 2021-12-31; F3 2022-01-01 → 2023-12-29.
  They are **not holdouts** (the search sees all of them); they measure path stability.
- **Regimes** (a partition of the eligible training window): R1 2017-06-15 → 2018-01-25 calm late-2017 bull; R2
  2018-01-26 → 2018-04-30 February 2018 volatility shock; R3 2018-05-01 → 2018-09-30; R4 2018-10-01 → 2018-12-31 Q4
  2018 sell-off; R5 2019; R6 2020-01-01 → 2020-02-18; R7 2020-02-19 → 2020-04-30 COVID crash and first rebound; R8
  2020-05-01 → 2020-12-31; R9 2021; R10 2022-01-01 → 2022-10-31 bear market; R11 2022-11-01 → 2023-02-28; R12
  2023-03-01 → 2023-05-31 regional-bank stress; R13 2023-06-01 → 2023-12-29.
- **Years:** 2017 (from 06-15) … 2023.
- Attribution of any mark path to a period = mark at the period's last close − mark at the close before it.

## 5. Stage L — the neutral vector library (training, 5 bps)

- **Space:** D1's eight parameters inside the existing eight-ETF box (`src/multi-etf-d1/context.ts`, unchanged): X
  8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30 calendar days, L 20–250 sessions, buffer 0.0–6.0%, P 3.0–20.0%,
  W 10–200 sessions; percentages on the 0.1-point grid, days and sessions integers. No range is changed.
- **Sobol vectors:** **1,024** unique quantized vectors (2^10, a balanced Sobol sample size, above the brief's 768
  minimum) from one scrambled Sobol stream over the box, seed `deriveSeed('joint-16-etf-d1', 'library',
  'sobol-scramble')`, in stream order; the **same 1,024 vectors for all 16 ETFs**.
- **Controls** (the same set for every ETF, labelled with provenance; seeds only, never mandatory): D1's shipped
  constants (= VGT `primary`); every nomination of the eight-ETF manifest (`research/multi-etf-d1/FROZEN_CANDIDATES.json`,
  body hash verified: each ticker's `primary` and `alternate-lowDd`); the previous study's four frozen candidate
  vectors (P-GDX = GDX `portfolioAware`, S-GDX, P-XOP, S-XOP). All have **inspected post-2023 results on their source
  symbol**; on other symbols they are ordinary in-box vectors. Duplicates are kept once.
- For every (ETF, vector) at 5 bps the trace is built and cached, and the library record stores: the trace key and
  content signature, virtual trades, signals, setups, closed trades, years with a closed trade, held days, signals per
  regime, the decision-to-fill delay distribution, and — as **diagnostics only** — the single-book fixed-pool net,
  minute/daily drawdown and worst trade. **No vector is pruned, ranked or preferred** for its standalone result, trade
  count, sign or any proxy; the discovery stage never reads the library's standalone diagnostics. Vectors with no
  training trade on an ETF are reported as inert (a member with an inert vector changes nothing in training).

## 6. Stage D — unrestricted subset discovery (training, fixed $100,000, 5 bps)

**Genome.** A 16-bit membership mask (nonempty) and one D1 vector per ETF (active members' vectors are used; inactive
ETFs carry a latent vector so they can be re-added). The **evaluation key** is the sorted list of active
`symbol:vectorId`; latent vectors never affect a result. An evaluation is the complete causal replay of the subset's
funded shared-pool sequence; its fitness is the **allocator's total net after interest and costs** (realized + marked
unrealized at the last training close), never a sum of separate virtual P&Ls.

**Objectives (NSGA-II, minimized):** f1 = −net@5, f2 = minute-sampled maximum drawdown@5, f3 = number of books;
violation = max(0, drawdown − $35,000) ÷ $35,000 (constrained domination). Breadth is not a gate anywhere.

**D-greedy — 16 independent greedy forward paths**, one starting from each ETF (all 16, symmetric), RNG
`Rng.from('joint-16-etf-d1', 'greedy', ETF)`: the starting singleton tries **8** library vectors drawn uniformly
(without replacement) and keeps the best feasible net (or the lowest drawdown if none is feasible); each step tries,
for every inactive ETF in alphabetical order, **3** library vectors drawn uniformly, and accepts the best feasible
addition only if it raises net by at least **λ = $5,000**; the path stops when no addition qualifies or at 16 books.
At most 8 + 3 × (15 + 14 + … + 1) = 368 evaluations per path (5,888 in all).

**D-islands — 8 islands**, each a population of **64**, (μ + λ) elitism with λ = 64 children per generation,
binary crowded tournaments, and a cap of **3,072 unique new evaluations per island** (initial population included;
24,576 in all). RNG `Rng.from('joint-16-etf-d1', 'island', key)`. Initial populations (outcome-independent):

| Island | Initial population (64 genomes; latent vectors uniform from the library) |
|---|---|
| I1, I2 | cardinality uniform on 1–16, members uniform, vectors uniform from the library (two seeds) |
| I3 | sparse: cardinality uniform on 1–3 |
| I4 | medium: cardinality uniform on 4–8 |
| I5 | broad: cardinality uniform on 10–16 |
| I6 | singletons: each of the 16 ETFs with 4 uniform library vectors |
| I7 | the 16 greedy paths' final genomes and each path's accepted intermediate genomes (up to 64), filled with uniform genomes (I1's rule) |
| I8 | B1, B4, B5 (their frozen vectors) and 29 one-move mutants of them (add/swap/reset), plus 32 uniform genomes |

**Variation** (per pair of tournament-selected parents): with probability 0.9 a crossover that exchanges **(membership
bit, vector) pairs** per ETF uniformly, and for each ETF active in both parents applies SBX (η 15) to the two vectors
with probability 0.5; then each child receives exactly one operator drawn with weights **add 0.15** (activate an
inactive ETF with its latent vector or, with probability 0.5, a fresh uniform library vector), **remove 0.15**
(deactivate one member; skipped for a singleton), **swap 0.10** (deactivate one member, activate one inactive ETF),
**paramOne 0.25** (polynomial mutation, η 20, of one member's vector, each gene with probability 1/8 and at least one
gene changed), **paramMulti 0.15** (the same on 2 or 3 members jointly), **reset 0.10** (replace one member's vector by
an independent uniform library draw), **crossoverOnly 0.10**. A child left with an empty mask by the crossover
activates one ETF of either parent before its operator is applied. All vectors stay exactly on the box grid.

**Dedup and budget.** A child whose key is already in the island's population or among the generation's children is
discarded; a child whose key was already evaluated elsewhere is a **cache hit**: it may enter the population with its
recorded fitness but does not count toward any budget; at most 20 × 64 child attempts per generation; an island stops
early only after 3 consecutive generations without a new unique child (reported). **Migration** every 8 generations,
ring I1 → I2 → … → I8 → I1: 4 genomes drawn uniformly from the source's first front (topped up in rank/crowding order
if the front is smaller) replace the destination's 4 worst (rank, then crowding); a stopped island receives no
migrants. Greedy paths run first (I7 needs them), then the
islands I1 → I8 interleaved generation by generation (so migration is well defined); single-threaded, deterministic.
**Total discovery: 25,424–30,464 unique evaluations** (≥ 25,000 guaranteed by the island caps plus each path's
minimum of 53). Every evaluation is logged with its key, origin, island/path, generation and metrics.

**Logged per evaluation:** net, realized, unrealized, minute and daily drawdown, funded lots (by symbol), lots per
book, virtual trades, refusals, the decider × holder refusal matrix, same-minute contested grants, held days and
utilization, the largest and two largest lots, fold/regime/year attribution, and a **behaviour key** (sha256 of the
members' trace signatures) to count behaviourally distinct evaluations.

## 7. Stage R — targeted joint refinement (training, 5 bps)

**Contenders (≤ 6, structurally diverse, mechanical).** Over the feasible discovery archive (minute drawdown@5 ≤
$35,000), Q = net@5 − λ × books (λ = $5,000). Jaccard distance of membership sets d(A, B) = 1 − |A∩B| ÷ |A∪B|.
1. c1 = argmax Q.
2. If c1 has ≥ 5 books: the best Q with ≤ 4 books and d ≥ 0.5 from every chosen contender ("compact").
3. If no chosen contender has ≥ 9 books: the best Q with ≥ 9 books and d ≥ 0.5 from every chosen ("broad").
4. Fill to 6 by Q descending with d ≥ 0.5 from every chosen contender.

**Refinement of each contender** (cap **2,500 unique evaluations** each, 15,000 in all; RNG `Rng.from('joint-16-etf-d1',
'refine', k)`), maximizing **J = net@5 − λ × books** subject to minute drawdown@5 ≤ $35,000, accepting a move only if
J rises by more than **$100**. One cycle:
1. **Membership pass** (best improvement): remove each member (if ≥ 2); add each inactive ETF with 3 uniform library
   vectors; swap each member for each inactive ETF with 1 uniform library vector.
2. **Coordinate pass:** for each member in alphabetical order, its in-box one-parameter probes (the box's offsets: X
   ±5/±10, Y ±1/±2, stop ±5/±10, hold ±1/±2, L ±5/±10, buffer ±5/±10, P ±5/±10, W ±10/±20 grid steps); the best
   improving probe of that member is accepted before the next member.
3. **Joint pass:** 32 random joint moves (2 or 3 members, each moved by 1–3 random box probes — a random parameter
   shifted by one of its probe offsets); the best improving move is accepted.

Cycles repeat until a full cycle accepts nothing or the cap is reached. Every member — including any VGT/XBI/XRT/KRE/
GDX book — may be retuned, removed or replaced. The report shows each contender's trajectory, the changed funded lots
(new, lost) between contender and result, and whether the accepted moves touched more than one member.

## 8. Stage S — shortlist and robustness battery (training)

**Shortlist (≤ 20):** the 6 refined configurations, the 6 contenders as discovered (if not identical), and up to 8
further configurations of the whole archive (discovery and refinement), feasible, by Q descending with d ≥ 0.5 from
every shortlisted one. B1, B4 and B5 go through the
same battery as references (never eligible).

**Battery** (fixed $100,000 unless stated):
- net and drawdowns at 0, 2, 5 and 10 bps (5 bps principal);
- folds, regimes, years; the largest and two largest lots' share of net; net minus each regime's contribution
  (leave-one-regime-out) and its minimum;
- **one-parameter probes:** every member's in-box box probes (≤ 32 per member) at 5 bps;
- **48 joint perturbations** (RNG `Rng.from('joint-16-etf-d1', 'joint-perturbation', key)`): every member, every
  parameter moved independently by −m, 0 or +m grid steps (m: X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5, W 10),
  clamped to the box; P50 = their median net@5;
- **exclusions:** the configuration without each member (one-symbol sensitivity);
- **tie order:** the replay with the reverse-alphabetical tie order and 2 seeded random tie orders (through symbol
  aliases, which change only same-minute priority), and the count of contested same-minute grants;
- **full engine:** fixed@5 (E4: field-for-field equal to the replay) and the **20% portfolio at 5 bps on training**
  (ending equity, maximum daily and minute-sampled % drawdown, borrowing-dollar-days); B5's portfolio ladder at
  10/15/20/25/30% of equity at 5 bps on training (matched borrowing, §9 T9).

## 9. Training gates, score and nominations

A shortlisted configuration **passes** when all hold (5 bps unless stated):

- **T0 technical:** full-engine fixed run = replay, field for field; the replay through alphabetical aliases equals
  the canonical one; every member's data passed the audit.
- **T1 fixed risk:** minute drawdown ≤ $35,000 at 5 and at 10 bps.
- **T2 portfolio risk:** training maximum daily % drawdown ≤ 35% (the ideal is ≤ 30%; between 30% and 35% the T8
  margins double to $50,000).
- **T3 costs:** net > 0 at 0, 2 and 10 bps, and net@10 ≥ 0.85 × net@5.
- **T4 folds:** net > 0 in ≥ 2 of the 3 folds, and net minus the best fold > 0.
- **T5 concentration:** net minus the two largest lots > 0; net minus the largest positive regime contribution > 0.
- **T6 plateau:** ≥ 75% of the one-parameter probes feasible and their median net ≥ 0.85 × net; ≥ 75% of the joint
  perturbations feasible and P50 ≥ 0.75 × net.
- **T7 membership:** removing any single member lowers net (every member's marginal training contribution > 0).
- **T8 benchmark materiality:** net ≥ B5's net + $25,000; P50 ≥ B5's P50 + $25,000; net ÷ minute drawdown ≥ 0.90 ×
  B5's (margins $50,000 under T2's conditional band).
- **T9 matched borrowing:** training portfolio ending equity ≥ B5's ladder interpolated linearly at the configuration's
  training borrowing-dollar-days (outside the ladder: linear extrapolation from the two nearest points, flagged).

**Score** (ranking of passing configurations): **S = P50 − $5,000 × books + $1,500 × (regimes with positive
attributed net)** — a smoothed net with a complexity cost and a soft breadth reward; no trade-count minimum anywhere.

**Nominations (≤ 3, mechanical):** **primary** = argmax S; **alternative 1** = argmax S with Jaccard distance ≥ 0.5
from the primary; **alternative 2** = argmax S among passing configurations with ≤ 4 books and d ≥ 0.5 from both (if
the primary or alternative 1 already has ≤ 4 books: argmax S with d ≥ 0.5 from both). If no configuration passes, the
manifest freezes the **no-advancement** outcome and no candidate is evaluated after training. Each nominee is re-run
on the full engine on training (fixed and portfolio at 0/2/5/10 bps) before the freeze.

**Rolling-origin diagnostic (not a gate; reported):** over the feasible discovery archive, the rank correlation of
F1 net with F2 + F3 net and of F1 + F2 net with F3 net, and the F3 net of the top 1% by F1 + F2 net against the
archive's median — whether in-sample ranking persists forward inside training at all.

## 10. Freeze, continuous evaluation and acceptance

1. `freeze-selection` writes `FROZEN_SELECTION.json` once (refused if it exists): nominees and benchmarks (members,
   eight-parameter vectors, book and tie order), the frozen ranking, the gates' results, these acceptance rules,
   hashes of the code, data files, partitions, splits and distributions, seeds, budgets, evaluation counts, parity
   signatures and the authorized commands; its body hash is recorded and verified by every later command.
2. `evaluate` (once; `--confirm` is the deterministic re-run): **one continuous `all` run** per frozen configuration
   (nominees, B1, B4, B5, C0) on the full engine, fixed and 20% portfolio at 0/2/5/10 bps, B5's ladder at 5 bps;
   every position, setup, stop, continuation window, debt and core holding carried across 2024-01-01 and 2025-10-17
   through the last common session; P&L and segment returns attributed to development (training), holdout and final
   from the marked state at the boundary closes. Isolated windows are never added. The replay is re-checked on the fixed
   runs.
3. **Acceptance of a nominee** (fixed unless stated; Δ = nominee − B5 on identical dates and costs):
   - **A1** post-training Δ@5 (holdout + final) ≥ **+$15,000** (≥ +$25,000 if the full-`all` portfolio maximum daily %
     drawdown is in (30%, 35%]);
   - **A2** post-training Δ > 0 at 0, 2 and 10 bps;
   - **A3** neither the holdout Δ@5 nor the final Δ@5 ≤ −$2,500 (no reversal);
   - **A4** full-`all` fixed minute drawdown@5 ≤ $35,000;
   - **A5** full-`all` portfolio maximum daily % drawdown@5 ≤ 35%;
   - **A6** portfolio post-training compounded return@5 (training's last close → last session) ≥ B5's.
   Segment classification against B5 (and reported against B4 and B1): persists ≥ +$2,500; reverses ≤ −$2,500;
   otherwise disappears.
4. **Recommendation:** the accepted nominee ranked highest by the frozen training score. If none is accepted, the
   frozen benchmarks are retained exactly as previously recommended (B5 as an optional forward-test candidate, B4
   defensible); no rescue optimization, rule change or further search. An accepted gain whose post-training Δ
   disappears without its two largest contributing lots is graded **thin evidence**.
5. **Evidence grades.** The holdout and final windows have been inspected repeatedly in this research programme, and
   the analyst knows the broad 2024–2026 market history; a nominee's post-training result is a **locked historical
   comparison, additional but not independent** corroboration. Only sessions after 2026-10-13 are new evidence.

## 11. Parity matrix, tests and engineering gates

**P0** (regression) the frozen engine = the N-book engine on B1 and B4, fixed and portfolio, 0/2/5/10 bps, training.
**P1** replay = N-book engine (fixed, training, 0/2/5/10 bps), field for field (every virtual trade, lot, signal
record with refusal reason and holder, daily row, drawdown statistic and end state): each of the 16 ETFs alone with
D1's constants and with a library vector (VOOG alone included); 4 random subsets of each size 2, 4, 8, 12, 16 with
random library vectors (RNG `Rng.from('joint-16-etf-d1', 'parity', size, n)`), at least one without VGT, one with
VOOG, one with XOP (crossing its reverse split); B1, B4, B5; six 16-book pools of the library's extreme vectors
(shortest/widest stop, longest hold, longest W, shortest/longest L) and one 16-book pool of D1's constants on every
ETF (the most same-minute collisions). **P2** portfolio consistency on the full engine (training, 5 bps) for a 16-book
pool, VOOG alone, VOOG + VGT and B5: the funded signals equal the fixed run's unless a margin rule refused one; at every
daily row equity = market values + cash + receivables − principal − interest liability; core distributions = core
shares × amount on each ex-date; VOOG lots receive none, VGT lots receive VGT's; quantities of core and lot shares of the
same ticker are kept separately. **P3** benchmarks on `all` (§12). **P4** determinism: Stages L and D re-run in a
fresh process (`determinism`) reproduce byte-identical logs; required before the selection freeze.

**Tests** (new, `src/joint-16-etf-d1/tests/`): genome keys, operators, crossover and repair; mixed membership on the
N-book engine and the replay (no VGT, single non-VGT book, VOOG book, core/lot overlap); tie order through aliases;
lookahead immunity (a later exit's price or time changes no earlier decision in a multi-book subset); cache keys; the
three doors (training refuses later partitions, benchmark door refuses non-benchmark symbols, evaluation door refuses
without a verified manifest); write-once freezes and tamper detection. The full suite, `tsc --noEmit` and eslint must
stay at the recorded baseline; no existing test is deleted or weakened.

## 12. Benchmark reproduction (before any outcome claim)

B1, B4 and B5 on training (fixed and portfolio, 0/2/5/10 bps) and on the full `all` history (the previous evaluation's
continuous runs) must reproduce the previous study's records to the cent (B4 training $242,196.01 fixed at 5 bps;
B5 `all` fixed $486,208, portfolio $5,410,977, 29.67% / 31.09%; B4 `all` $284,245, $3,608,484, 34.65% / 37.01%). A
failure stops the study.

## 13. Risk preferences and accounting (binding where stated in §9–§10)

- Fixed pool: historical minute-sampled maximum drawdown ≤ $35,000 per $100,000 lot (a filter, not a stop-loss). Daily
  and minute-sampled drawdowns are always reported separately, in dollars and as % of $100,000.
- Portfolio: $300,000 at the first close, $180,000 VOOG / $120,000 VGT; each admitted lot borrows 20% of marked equity
  at the decision; 11% simple interest; profits reinvested 60/40, losses funded by proportional core sales (the frozen
  rules). Maximum daily % drawdown ideally ≤ 30%, 30–35% only with a larger margin, > 35% disqualifying. Daily and
  minute-sampled percentage drawdowns are reported separately, and the passive 35/50/60% maintenance measures the
  engine computes are reported, never invented broker outcomes.
- A VOOG or VGT book's lot and the core holding of the same ticker are separate quantities; the engine's VOOG-lot loss
  funding values VOOG core at its last known print (documented, immaterial), VGT lots at their exit print (frozen).
- VOOG's sparse minute bars are never filled or forward-filled for execution: fills occur only at actual bars; the
  audit reports its bar coverage, inter-bar gaps and decision-to-fill delays, and any execution restriction is stated
  as a data/execution fact.

## 14. Budget, outputs and stop condition

Measured throughput (§0) makes the full indicative budget affordable on one core (≈ 20 ms per evaluation including new
traces; the whole training search ≈ 1 hour), so nothing is downscaled; budgets are never raised after a result is
seen. Outputs: `research/joint-16-etf-d1/` — README, PROTOCOL, DATA_AND_ENGINE_AUDIT, CACHE_AND_CAUSAL_PARITY,
SEARCH_COVERAGE, JOINT_SEARCH_RESULTS, FROZEN_SELECTION.json, HOLDOUT_FINAL_RESULTS, IMPLEMENTATION_AUDIT,
RECOMMENDATION and `results/` (JSON/CSV; bulky regenerable logs git-ignored). Post-study runs write to
`evaluations/joint-16-etf-d1/`. The study **stops** after the frozen evaluation and the reports.

## 15. Amendments

None.
