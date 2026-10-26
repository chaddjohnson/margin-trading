# Protocol: D1 standalone screening, frozen ETF priorities, causal net-breakeven preemption, joint pool optimization

Study `ranked-preemption` (`d1-ranked-preemption-v1`), 2026-10-26. Namespace: `research/d1-ranked-preemption/`,
`src/d1-ranked-preemption/`, `config/research-pools/d1-ranked-preemption/`, `evaluations/ranked-preemption/`
(git-ignored outputs). Every constant below is declared in `src/d1-ranked-preemption/context.ts`; the two are bound
together by the protocol freeze (§17). The assignment as received is `brief/BRIEF.md` (sha256 `e784c557…`).

> **Architecture (fixed by the brief).** Standalone optimization generates starting points; joint optimization decides
> what works as a portfolio. Each ETF is optimized and screened alone; two priority rankings are derived from the
> standalone phenotypes only and frozen per training window; the subset of ETFs and each member's own pool-specific
> D1 phenotype are then optimized jointly **while the frozen ranking governs allocation and preemption in every
> evaluation**. Rankings are never re-fitted, re-ordered or recomputed from joint results.

## 0. What is and is not claimed

- Every figure from 2016-01-04 → 2023-12-29 is **inspected history**. Both validation folds (2020-07 → 2023-12) were
  examined by earlier studies; a sealed walk-forward pick validated there is **reused retrospective evidence (E2)**,
  not independent proof. 2024-01-02 → 2026-10-13 is also inspected; at most one blocking-only diagnostic of at most
  one nominee may read it (§14.4, E3). True prospective evidence (E4) begins strictly after 2026-10-13; no such bar
  exists in this repository, so the forward observation count is **0**.
- In-sample optimizer success is never presented as alpha; D was optimized to beat C on training. No annualized
  expected return is derived from history. B5's two large GDX trades are not assumed to recur.
- A defensible **no improvement** is a valid outcome; B4 stays the default and B5 the leading incumbent unless a
  candidate passes every gate below.
- **Known biases, disclosed before any outcome.** (a) A (B5 unchanged) and B (B5's vectors under P1) use vectors chosen
  with knowledge of 2016–2026, including both validation folds: in the folds A is advantaged by hindsight relative to
  D, and B shares that contamination, so a B pass is weaker evidence than a D pass. (b) The diagnostic's B4/B5 counts,
  which help set Stage D's budget share (§9), come from those same vectors; the share only sizes the search and never
  selects anything. (c) A B nominee's 2024–2026 check (§14.4) reuses vectors that were themselves selected with that
  window inspected; it is weaker for B than for D. (d) Multiple testing: four procedures (B-R1, B-R2, D-R1, D-R2) are
  gated over two folds and at most one nominee is chosen by the largest neighbourhood median; the gates are therefore
  conservative by design and a pass is never read as proof. (e) Before the protocol freeze the timing benchmark read
  the final window's training data (timings and memory only; no figure was recorded or viewed). (f) The same-minute
  latency assumption (§5.3.4) governs most continuous-session switches between liquid ETFs (both symbols trade in
  the minute after the decision); conversely an overnight switch between two symbols that both print in the opening
  minute always aborts. The controls report the share of executed switches bought in the very minute of the sale.

## 1. Questions and hypotheses

- **Q1 / H1 (preemption alone, A vs B).** With B5's frozen vectors and membership unchanged, does the P1 allocator
  under a training-derived priority (R1 or R2) improve B5 on risk-aware economics?
- **Q2 / H2 (joint vs standalone, C vs D).** Under the same frozen ranking and P1, does joint optimization of
  membership and pool-specific vectors (D) beat the standalone-ranked assembly (C)?
- **Q3 (full proposal vs incumbent, A vs D).**
- **Q4 (R1 vs R2).** Two separate, equal-budget, paired branches.
- Each question is answered per window (training: E0/E1) and per fold validation (E2). Advancement is decided only
  by the procedure gate (§13.5) and the nomination gates (§14.2).

## 2. Invariants and hard boundaries

1. No existing artifact changes: `config/pools/B4.json`, `config/pools/B5.json`, `config/phenotypes/`,
   `config/research-pools/diverse-d1-2026-10-26/`, `data/`, `config/market-events/`, every earlier `research/` study
   and its sealed records, and the prospective freeze `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`
   (body `407a669b…`) stay byte-for-byte intact.
2. The prospective freeze binds the import closure of the pools CLI (134 files, including
   `src/portfolio-aware-d1/nbook/engine.ts`, `src/app.ts`, `src/lib/`, `src/phenotype/`), the `pools` npm script, the
   package.json `imports` map and `package-lock.json`. **None of these is edited.** Consequently the preemption
   allocator is a derived module (§5.1) and the study's entry point is `src/d1-ranked-preemption/main.ts` (a new
   `src/app/` entry point would need a registry line in the bound `src/phenotype/strategies.ts`). The only file
   outside the namespace that changes is `package.json` (one new script `ranked-preemption`, no `--env-file`).
3. The 15 research-only diverse-d1 finalists are never evaluated, seeded or used here on any window, and no sealed
   artifact of that study is used to place a candidate on post-2023 bars.
4. No broker, order, credential read, `.env`, download, network access, commit, push or merge. No future bar is
   invented.
5. The D1 eight-parameter definitions, box, grid (tenths of a percentage point, calendar days, sessions), fills,
   stops, warm-up, splits, calendar, interest and dividend conventions are the existing engine's and are unchanged.
6. Every eligible ETF (VOOG and VGT included) receives the same Stage A procedure and budget; no symbol is excluded
   except by the frozen integrity rules (§4.2) or the frozen screening rules (§7).
7. Rankings are outputs of Stage A and inputs to Stage D; they are frozen per window before any joint search, held in
   sealed files, and every joint evaluation records the ranking file's body hash (an evaluation with any other hash
   is refused).

## 3. Isolation from earlier studies

- Studies that verify a manifest of every `src/**/*.ts` (e.g. diverse-d1) will refuse their guarded commands once new
  files exist; they are complete and are never rerun. Their integrity is checked at their own commits from git
  objects if ever needed; no legacy guard is relaxed.
- Read-only imports: the frozen engine's types and helpers, `ShadowBook`, the D1 machines, `FixedLedger`,
  `NPortfolioLedger`, the loader `loadNUniverse`, the trace builder, the frozen replay (P0 parity), the October 25
  audit function and neighbourhood instrument, the pools ledger formatter (`src/pools/trades.ts`).

## 4. Data, universe, windows and doors

### 4.1 Canonical data

`data/<SYMBOL>/data.csv` (raw SIP minute bars), `data/partitions.json`, splits forward-adjusted once from
`config/market-events/splits.json` (`e5bde427…`), VGT/VOOG distributions `config/market-events/distributions.csv`
(`3b4342eb…`). One calendar 2016-01-04 → 2026-10-13 (2,710 sessions). Baseline hashes: `results/baseline/`
(the 64 per-file hashes equal the diverse-d1 baseline list `335a8450…`). Integrity problems stop the study; data are
never repaired.

### 4.2 Universe

The October 25 study's 64 candidates are re-audited with its unchanged audit function (`auditSymbol`, rules D1–D5).
The study proceeds only if eligibility, cohorts, sessions, splits and every file/report hash equal
`research/d1-robust-pool-discovery/results/audit/universe.json` (expected **61 eligible**; GDXJ and OIH are
ineligible under rule D1, their first bar being 2016-05-02 (the "late" cohort); XLRE is excluded). The record is `results/audit/universe.json`. Nothing about strategy results enters eligibility.

### 4.3 Windows

| Window | Search window (Stage A–D may read) | Validation (opened only after the sealed `PICKS.json`) | Arms |
|---|---|---|---|
| fold-a | 2016-01-04 → 2020-06-30 | 2020-07-01 → 2021-12-31 | S, I |
| fold-b | 2016-01-04 → 2021-12-31 | 2022-01-01 → 2023-12-29 | S, I |
| final | 2016-01-04 → 2023-12-29 | none | S, I, B (exploratory) |

Books arm on 2017-06-15 (the mandatory warm-up); accounting starts at the 2016-01-04 close. Attribution periods:
calendar years and the October 25 study's 13 regimes (keyed G1–G13 here), clipped to each window. The complete procedure
(Stage A screening, rankings, diagnostic, C, D, picks) runs **independently in each window**; no later window's
ranking, phenotype or membership is used in an earlier one.

### 4.4 Doors (`src/d1-ranked-preemption/data.ts`; each refuses before a byte is read)

- `trainingUniverse(window)`: the audited eligible universe, partition `training`, access `optimization`, `endDate`
  = the search end (the loader stops reading there); the loaded last date is asserted; every file hash equals the
  audit; every symbol's loaded bars are hashed into the stage record. The only data path of Stages A–D. **It enforces
  the chronology:** fold-b opens only after fold-a's sealed `VALIDATION.json` verifies (fold-b's data hold fold-a's
  validation years); the final window only after the sealed `PROCEDURE_GATE.json`. (The one exception, before the
  protocol freeze only, is the outcome-blind benchmark.)
- `inspectionUniverse(window)`: the read-only CLI's door to a window's training data — the same chronology, the audit
  check, and no date after the window's search end unless that fold's validation is sealed (then through its
  validation end); the final window through 2023-12-29. Every CLI load uses this door, `benchmarkUniverse` (B4/B5/B1
  unchanged on `all`) or `historicalUniverse`.
- `validationUniverse(fold)`: refuses unless the fold's sealed `PICKS.json` verifies; through the validation end.
- `benchmarkUniverse`: B4/B5 members on `all`, for the P0 regression to the frozen anchors only.
- `historicalUniverse`: refuses unless `FROZEN_SELECTION.json` verifies **and** names a nominee; only the nominee's,
  B5's, B4's and the core's symbols; once for the historical check, then (its record sealed) for the CLI.

## 5. Execution model and allocation policies

### 5.1 The engines

- **Derived engine** `src/d1-ranked-preemption/engine.ts` `runPAllocator`: the frozen `runNAllocator` copied
  statement for statement with one opt-in option `allocation`. Under P0 every executed statement is the frozen one
  (5 replaced lines are equivalent rewrites; every other change is an added, policy-guarded branch). It runs fixed
  and portfolio modes. It is the authority for every reported run.
- **Derived replay** `src/d1-ranked-preemption/replay.ts` `replayPreemptive`: the frozen trace replay with the same
  option (fixed mode only), used by the optimizers. Under shadow semantics a book's virtual trades never depend on
  the allocator, so a book's cached trace is valid under every policy and ranking; only which trades are funded and
  when a funded lot is sold change. The replay consumes events in the engine's order, inserts a pending sale as an
  event at the incumbent's first trade at or after the decision, and resolves it there from that trade's price.
- **Parity gate (before any optimization):** (i) P0 derived engine = frozen engine, every output field, B4 and B5 on
  `all` at 0/2/5/10 bps in fixed and portfolio mode (frozen dividends); (ii) P0 derived replay = frozen replay on
  random pools; (iii) derived engine (fixed) = derived replay, every lot, signal, daily row, drawdown and preemption
  record, under P0, P0R, P1, P1-B250 and P1-B500, on random pools of 1–12 books with random priorities on fold-a's
  training data (the chronology), drawn until at least 40 pools ran and at least 20 executed a preemption under P1
  (at most 200; a shortfall is a failure); (iv) the worker pool returns exactly the in-process runner's standalone and
  pool metrics; (v) for 20 runs the replay's windowed daily drawdown and increment after a boundary equal the
  engine's daily marks (and the windowed minute drawdown is at least the daily one); (vi) for 20 runs the portfolio
  engine under P1 funds exactly the fixed pool's P1 sequence whenever no margin test refuses anything. Any
  difference stops the study (no optimization on a known-wrong fast path).

### 5.2 Policies (`allocation.ts`)

| Key | Same-minute decisions | Preemption | Threshold | Role |
|---|---|---|---|---|
| P0 | alphabetical (frozen) | no | — | the unchanged B4/B5 allocator |
| P0R | priority order | no | — | isolates the tie rule |
| **P1** | priority order | yes | **$0** | the study's policy |
| P1-B250, P1-B500 | priority order | yes | $250 / $500 | frozen secondary sensitivities, fixed pool only (absolute dollars on the $100,000 lot); never selected or fitted |

### 5.3 P1 execution semantics (each is a tested rule, §18)

1. **One funded slot.** One $100,000 funded lot or one binding reservation at a time; a replacement can be bought
   only after the incumbent is sold and its financing released. Never two lots or a lot and a reservation together.
2. **Signals.** A preemption starts only on a fresh D1 entry decision of a book (a rebound confirmed at a completed
   minute, stamped T + 60 s), the same signal that the frozen allocator funds or refuses. Every book continues its
   virtual trades independently (shadow semantics); a refused signal is never reconsidered later; a priority never
   creates a signal.
3. **Rank.** With no funded lot, the frozen allocation applies (a free pool grants the first decision; P0R/P1 answer
   same-minute decisions in the priority order). With exactly one funded lot and no reservation or pending
   preemption, only a decision of a book **strictly higher** in the frozen order than the lot's book can start a
   preemption.
4. **Net breakeven, two tests.** At the decision, the incumbent's liquidation net at its last price — shares × last
   price × (1 − cost) − principal − principal × 11% × (session date − entry session date) ÷ 365 — must be ≥ the
   threshold. The entry friction is inside the shares (principal ÷ cost-adjusted entry). The sale is attempted at
   the incumbent's **first trade at or after the decision** (the next bar of its symbol in the timeline; else its
   closing print if the decision precedes the close; else the next sessions' first trade, as a carried order
   fills), after that bar's virtual exits (except an own exit priced inside that bar, §5.3.5) and before its virtual
   fills, at that bar's open (or the closing print).
   It executes only if the net at that fill, with the interest through that fill's session date (a Friday decision
   sold on Monday carries three more days), is still ≥ the threshold; otherwise the switch **aborts**. The test uses
   the ledger's own formula, so the booked lot net equals the tested net exactly (asserted). **Latency assumption:**
   in continuous trading the sale fills at a minute's open and the contingent purchase, when the replacement's order
   fills in that same minute, is modelled at that minute's open too (a sub-minute latency the bars cannot resolve).
5. **Replacement eligibility.** The replacement is the deciding book's own committed virtual order, which fills at
   its first trade after the decision. If that fill comes before the incumbent could be sold (it has no executable
   trade in time), the switch aborts and nothing is sold. **Auction prints:** if the replacement's fill would be the
   very print at which the incumbent is sold (or exits on its own rule) and that print is an auction — the closing
   print, or the opening trade of a session after the decision's (an order carried overnight) — the purchase cannot
   be made contingent on the sale, so the switch aborts before anything is sold (the incumbent's own exit, if any,
   still happens). The auction test is decided from bar timestamps and availability alone, never from a price; an
   incumbent's first bar in the decision's own session counts as continuous trading. If the incumbent's own rule
   exits it first at an event at or before the sale's — a gap stop, a
   minute-open-through-stop, a pending buffered loss or a maximum hold, all at a minute's open, or an exit at the
   closing print — the preemption is **superseded**: no sale is made, the pool is released by the own exit, and the
   replacement keeps its reservation and is bought at its fill (unless the auction rule applies). **An own stop that
   fills inside the sale bar** (a stop level touched by the bar's low after an open above it) does not come first:
   the sale at the bar's open is attempted first, and only if it aborts does the own stop close the lot. An abort
   never closes the incumbent.
6. **No churn.** A pending preemption blocks every other decision (refused, reason recorded), so at most one switch
   starts per decision minute and no chain forms in one bar; a reservation is never preempted. Among same-minute
   competitors the highest-priority decision is answered first. A replacement, like any funded lot, can itself be
   preempted from the bar after its purchase on, by a strictly higher-ranked fresh decision, provided its own
   liquidation net clears both frictions and the interest (a chain is therefore bounded by the number of ranks and
   needs a gain at every step). P1 has no other confirmation rule.
7. **Shadow divergence.** The sale changes only the funded position and the pool's accounting. The incumbent's
   virtual position continues and exits on its own rules (that exit then moves no money); its continuation window,
   material-loss/buffer, hold and trailing-stop logic follow the virtual position; it can signal again only after its
   virtual exit, like any book, and a later fresh signal is funded under the same rules. No virtual book is reset,
   no exit backdated, no same-bar re-entry granted.
8. **Lifecycle record.** Each preemption: decision time, source/target symbols and positions, lot and trade ids,
   holding age, estimate price/net/interest, outcome (executed / superseded / aborted) and reason, execution time,
   bar, raw and cost-adjusted price, net, interest, gross, entry and exit friction, released and replacement
   principal, replacement lot id, the incumbent's virtual state, and both books' frozen ranking scores. Denied switches
   (estimate below the threshold) are recorded as declines. The funded exit reason is `priority_preemption`. Field
   coverage by outcome: executed — every field; superseded — the released principal and the reason (the own exit is
   in the lot ledger), execution fields NaN; aborted — the execution fields only if a fill-time test was made.
9. **End of data.** A preemption pending at the end aborts; an open lot is marked at the last close (the engine's
   convention: no exit fill, no exit friction). Scores use the liquidation-equivalent mark (exit friction deducted).
10. **Portfolio mode.** The replacement's principal (20% of marked equity at the decision) and the frozen margin
    tests (minimum equity, Reg T, house U35) are evaluated at the decision with the incumbent still open
    (conservative); a failure means no preemption. The sale books through the portfolio ledger and its proceeds fund
    the frozen core orders as any exit does. The breakeven sign is scale-free, so with $0 the switches are the fixed
    pool's whenever margin does not bind.
11. **Opportunity cost (read-only).** For each executed preemption the incumbent trade's own-rule exit (known only
    from the completed trace, after the fact) gives a hindsight continuation net; reports show it labelled as
    hindsight, beside the realized preempted net and the replacement lot's net. It never enters a decision, score or
    gate.

## 6. Stage A — standalone D1 discovery (every eligible symbol, every window, identical procedure)

### 6.1 Evaluation

One book alone in the fixed $100,000 slot (P0; with one book every signal is funded), 5 bps per side, 11% simple
interest, arming 2017-06-15, data through the window's search end. Per vector:

- trades = every entered virtual trade; a trade open at the search end counts at its **liquidation value** at the
  last close (exit friction and interest to that session included) — in the numerator and the denominator;
- net = Σ trade nets; best/second/third/worst trade; mean (R1), median; wins, losses, loss sum;
- capital-occupied days = Σ max(1, calendar days from the entry session's date to the exit (or end) session's date)
  — calendar days because interest accrues on calendar days (weekends and holidays included) and the slot is
  unavailable to other books then; a same-day round trip counts as one day;
- net per occupied day (R2's metric), interest, friction, minute and daily drawdown of the one-book pool (frozen
  replay), net by exit year, best-year share;
- **J_s = net − max(0, best trade) − max(0, minute DD − $20,000)**;
- **credible** iff trades ≥ max(4, ⌈1.0 × eligible years⌉) (fold-a 4, fold-b 5, final 7), minute DD ≤ $35,000 and
  net > 0.

### 6.2 Search (budgets from the frozen tier, §16)

1. **Sobol:** the first N unique grid vectors of the symbol's scrambled Sobol stream (seed: study, `standalone`,
   symbol — the same design in every window, so windows are paired).
2. **Local search:** from the top 4 vectors by J_s among credible ones (filled from the rest by J_s if fewer), up to
   R rounds each: 12 candidate moves per round (8 single-coordinate moves of ±1..3 step units, 4 joint ±1-unit
   moves; seed `local:<window>:<symbol>:<start>:<round>`; step units X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5,
   W 10 grid units, reflected at the box); move to the best candidate if its J_s is strictly higher;
   stop after 2 rounds without a move.
3. **Neighbourhood:** the top 8 credible vectors by J_s with distinct trade signatures, each with D N1 draws of the
   step-unit instrument (stage `standalone:<window>`, common random numbers) → J_nb = median J_s of the draws,
   credible share of the draws.

### 6.3 Representative (the ranking input) and library

- **Representative** = the neighbourhood-checked vector with the highest J_nb (ties: higher centre J_s, then the
  smaller grid key). If the symbol has no credible vector, its representative for **ranking purposes only** is the
  vector with the highest J_s among those with ≥ 1 trade, flagged `non-credible`; with no trade at all the symbol is
  **unrankable**.
- **Library** (pool seeds; at most 4): the representative, then, from the top 32 credible vectors by J_s, greedily
  each vector whose entry-session set has Jaccard distance ≥ 0.5 from every vector already chosen (genuinely
  different trades, not parameter-near copies).
- Every symbol's profile (all metrics of the representative and library, the screening decision, budgets, seeds,
  data hashes) is `standalone/<window>/<SYMBOL>.json`; every library phenotype is its own versioned JSON
  `standalone/<window>/phenotypes/<SYMBOL>-<role>-<candidateId>.json` (schema `ranked-preemption-standalone-phenotype`
  v1) with its eight exact parameters, window, dataset hashes, grid version, budget, seeds, costs, interest, score
  and provenance. Prior phenotype files are never touched. Rejected symbols are kept in the catalog with the reason.
- **Incumbent standalone phenotypes** (config/phenotypes/D1) were chosen with later data: they are not seeds of any
  Stage A; they appear only as inspected references.

## 7. Screening (per window, from training results only)

| Status | Rule | Downstream |
|---|---|---|
| **survivor** | the representative is credible, its J_nb > 0 and its J_s > 0 | Stage C/D universe |
| survivor (uncertain) | a survivor whose representative has < 10 trades (label `sparse`, `very sparse` < 5) | as survivor, labelled |
| screened-down | ≥ 1 credible vector but not a survivor | reserve candidate |
| **reserve** | screened-down, ranked by idle share c(x) (share of its representative's held sessions — entry through exit session — on which no survivor's representative holds a trade), descending (ties: J_nb, symbol); those with c(x) ≥ 0.5, at most 6 | Stage D universe, labelled `reserve` |
| **rejected** | no credible vector (negative or zero net after all costs, drawdown above $35,000 or too few trades in every evaluated vector) | none; catalogued |

The Stage D universe of a window is survivors ∪ reserve. Counts of explored, rejected, retained, reserved and
downstream-tried symbols are recorded per window. Every symbol, including rejected ones, keeps its rank (§8).

## 8. Stage B — the two frozen rankings (per window)

- **R1(symbol)** = mean net per trade of the representative = Σ trade nets ÷ trades (the open trade at its
  liquidation value, counted once).
- **R2(symbol)** = Σ trade nets ÷ Σ capital-occupied calendar days of the representative (§6.1). A single book has
  one funded state, so there is no simultaneous virtual/actual double count.
- Higher score = higher priority. Ties (exact equality) → more trades first, then the alphabetical symbol.
  Unrankable symbols follow every rankable one, alphabetically, labelled. Labels: `adequate` (≥ 10 trades), `sparse`
  (5–9), `very sparse` (< 5); `non-credible representative`.
- R1 and R2 are separate fixed rankings, never composite and never fitted. The average of the top N trades is not
  computed for ranking.
- Files: `rankings/<window>/R1.json`, `R2.json` (sealed write-once): ordered symbols, both raw metrics, trades,
  occupied days, net, sample labels, the representative's phenotype id, grid and phenotype-file sha256, the frozen
  screening status, the definitions and the body hash. A pool inherits its members' relative order. Each joint
  evaluation names its ranking body hash; the ranking file is re-verified before every stage that uses it.
- Acceptance: the rankings are recomputed from the phenotype JSONs by an independent full-engine standalone run of
  each representative and must equal the sealed scores (§18).

## 9. Preflight overlap diagnostic and the material-opportunity criterion (per window, after the rankings)

- Runs (P0, fixed, 5 bps, the window's training data): B4 and B5 with their exact frozen vectors, and C_R1, C_R2
  (§10). For every decision refused while one funded lot alone held the pool: timestamp, holder and holding age,
  decider, higher priority under R1 / R2, the estimated and the next-trade liquidation net, whether the holder's own
  exit or the decider's fill would come first, and **actionable[Rk]** = higher under Rk ∧ estimate ≥ 0 ∧ a next trade
  exists ∧ its net ≥ 0 ∧ the holder's own exit is not first (an own stop inside the sale bar is not first, §5.3.5) ∧
  the decider's fill is not first ∧ the fill is not the same auction print — exactly the conditions under which P1
  would sell at that moment (tested against P1 on randomized fixtures). Also overlap rates,
  per-symbol and per-regime counts, ties, days since the last funded entry. Hindsight figures (the decider's virtual
  net, the holder's remaining net) are labelled and never used.
- **Criterion (frozen, one decision per window):** a window is **material** iff, under either ranking, the number of
  actionable opportunities in at least one of B4, B5 or C_Rk is ≥ 3 (a fold window) or ≥ 5 (the final window).
- **Rule:** a material window runs Stage D at its full budget for both R1 and R2; an immaterial window runs both at
  25% of it (the materially downscaled search, labelled `downscaled`; a downscaled branch remains nominable with that
  label). R1 and R2 always get equal budgets. The windows run in strict chronological order (fold-a, fold-b, then the
  procedure gate, then final; enforced by the doors, §4.4), so the rule never looks ahead.

## 10. Stage C — the standalone-ranked pool

C_Rk = the top 5 survivors in the order of Rk, each with its representative vector (all survivors if fewer than 5;
undefined if none), funded under P1 with Rk. Also run under P0 (ablation). No joint parameter is fitted.

## 11. Stage D — joint search with the frozen ranking active

### 11.1 Candidates and arms

A candidate = {a subset of the window's Stage D universe (1–12 members), the window's frozen ranking (R1 or R2),
one pool-specific D1 vector per member, policy P1}. It need not contain VGT, GDX or any B4/B5 symbol. Arms, each with
its own budget, population, archive and shortlist (never pooled):

| Arm | Windows | Initial population (48) | Vector source for add/swap |
|---|---|---|---|
| S standalone-seeded | all | C_Rk; then subsets of size U{2..8} from the universe, each member's vector its representative (p = ½) or a library alternative | the symbol's library |
| I independent | all | subsets of size U{2..8}, uniform random grid vectors (no Stage A vector) | uniform random grid vector |
| B incumbent-seeded | final only (exploratory, not nominable) | B4 and B5 exact, 46 mutants (23 each) | the library; a B5 member outside the universe keeps its frozen vector |

R1 and R2 branches use the same arm seeds (`joint:<window>:<arm>`), so their initial populations are paired; the
budgets, operators and universes are identical.

### 11.2 Evolution

μ + λ with μ = λ = 48: parents by binary tournament on J_pool; one operator per offspring — paramOne 0.30 (one
member, one coordinate, ±1..3 step units), paramMulti 0.15 (one member, every coordinate −u/0/+u), add 0.15, remove
0.12, swap 0.10, crossover 0.18 (per-symbol exchange of two parents' members); a configuration already evaluated in
the arm is retried (≤ 20 attempts). Every offspring is evaluated by the derived replay under **P1 with the frozen
ranking**, fixed pool, 5 bps. Survivors = the best 48 of parents ∪ offspring (ties: the configuration key). The arm
stops at its evaluation budget.

### 11.3 Score

**J_pool = net − max(0, best lot net) − $2,500 × (books − 1) − max(0, minute DD − $25,000)**, where net is the
liquidation-equivalent fixed-pool net (realized + open lot at its liquidation value) after interest and friction.
Feasible iff minute DD ≤ $35,000 and funded lots ≥ 6 (fold-a), 8 (fold-b), 12 (final); an infeasible configuration's
J_pool is its raw value minus 10⁹, so it ranks below every feasible one (and a neighbourhood with half or more
infeasible draws has a median below every mostly-feasible one).

### 11.4 Promotion, refinement, assessment, picks (per arm, then per branch)

1. **Promotion:** the best 12 **feasible** configurations by J_pool (at most 2 with the same membership; none with the
   funded-trade key of an already promoted one) → A draws N1 (stage `promotion:<window>:<ranking>`), J_nbA = median
   J_pool of the draws; keep the best 3 by J_nbA. An arm with no feasible configuration has no finalist; a branch
   with no finalist in its nominable arms has no pick, and its procedure's gates fail.
2. **Refinement** (1 cycle per kept candidate): 8 single-coordinate moves of ±1..3 step units per member and the
   removal of each member; the best move is accepted if it raises the centre J_pool by ≥ $2,500 (a pure removal of a
   member that changes nothing gains exactly the $2,500 book penalty and is accepted: pruning of inert members).
3. **Assessment:** B independent N1 draws and B₂ N1A2 (double amplitude) draws (stage
   `assessment:<window>:<ranking>`), ranking fixed: J_nbB = median J_pool of the N1 draws, the share with minute DD ≤
   $35,000, the 10th/25th/50th percentile nets, the tail drawdowns, the A2 sensitivity.
4. **Arm finalist** = the best J_nbB of the arm's 3. **Branch pick D\*_Rk** = the best J_nbB among the finalists of
   the nominable arms (S, I); ties: centre J_pool, then the key. The B arm's finalist is reported only.

## 12. Controlled comparisons (every window; fixed pool at 5 bps, costs 0/2/10 for the picks, P1-B250/B500 for B and D)

| ID | Phenotypes / membership | Allocation |
|---|---|---|
| A | B5 exact (B4 and B1 = VGT D1 alone also reported) | P0 |
| B_Rk | B5 exact | P1 with Rk (also P0R) |
| C_Rk | §10 | P1 with Rk (also P0) |
| D\*_Rk | §11 pick | P1 with Rk (also P0: the switch-off ablation) |

For every preemptive run: executed/superseded/aborted preemptions, declines, the preempted lots' realized nets,
the replacements' nets, the hindsight continuation (labelled), switching friction and interest, and the paired
difference against the same vectors under P0. The 20% portfolio (§15) is run for A, B4, B_Rk, C_Rk and D\*_Rk.

## 13. Walk-forward validation (fold-a, fold-b)

1. **PICKS.json** (sealed) holds, per ranking, the definitions of B_Rk, C_Rk and D\*_Rk (members, grids, ranking
   file and body hash) and the arm finalists, written before the validation door opens.
2. **Validation run:** one continuous run from 2016-01-04 through the validation end (state, marks, virtual books
   and any open lot carried across the search end; a pending preemption resolves on its own rules). Incremental
   validation net V = liquidation-equivalent mark at the validation end − liquidation-equivalent mark at the search-end
   close (an open lot's exit friction deducted at both ends). Windowed minute and daily drawdowns restart from the boundary mark. Lots entered and preemptions executed
   after the boundary are counted. The same for A, B4, B1 and every ablation; the portfolio is run continuously too
   and its validation daily % drawdown restarts at the boundary.
3. **Fold gate** of a procedure X ∈ {B, D} under Rk: **F1** validation minute DD ≤ $35,000; **F2** V(X) − max(V(B5),
   V(B4)) ≥ **$5,000** at 5 bps **and** V(X) ≥ max(V(B5), V(B4)) at 10 bps (a material out-of-sample improvement over
   the better incumbent that survives doubled friction); **F3** ≥ 3 lots of X entered in the validation window. Fold
   success = F1 ∧ F2 ∧ F3. B5 and B4 in the folds are advantaged by hindsight (§0), which makes F2 conservative. The
   gate inputs (V at 5 and 10 bps, the windowed daily drawdown, the lots) are recomputed from the derived engine's own
   daily marks and must equal the replay's.
4. Descriptive (never gating): V(D) − V(C), V(B) − V(A), V(D, P1) − V(D, P0), R1 vs R2, year and regime attribution.
   **C is a control, never nominable, and D's nomination does not require V(D) ≥ V(C):** H2 (joint beats standalone)
   is answered descriptively from these differences in both folds; it is "supported" only if V(D) > V(C) in both
   folds for that ranking.
5. **Procedure gate GP(X, Rk)** = success in both folds; written once to `results/walkforward/PROCEDURE_GATE.json`
   after the fold-b validation. Four procedures: B-R1, B-R2, D-R1, D-R2.

### 13.6 Order of execution

fold-a: Stage A → rankings (and their recheck) → diagnostic → Stage D → controls → `PICKS.json` → validation; then
fold-b likewise; then `PROCEDURE_GATE.json`; then the final window: Stage A → rankings → diagnostic → Stage D →
controls → nominations → `FROZEN_SELECTION.json` → (historical check, registration only with a nominee). No window's
stage reads a later window's records; the doors refuse fold-b before fold-a's sealed validation and the final window
before the sealed procedure gate (§4.4).

## 14. The final round, nominations and the historical check

1. The final window runs Stages A–D (arms S, I, B) and the controls whatever GP says (training-only, E0/E1).
2. **Nomination gates** for X_Rk with GP(X, Rk) passed, on the final training window: **N1** minute DD ≤ $35,000 at
   5 and 10 bps; **N2** net(X) − max(net(B5), net(B4)) ≥ $25,000 at 5 bps and > 0 at 10 bps, and net − best lot ≥ the
   better incumbent's; **N3** in 64 fresh N1 draws never used by any selection (stage `nomination:final:<ranking>`, for
   B and D alike, ranking fixed) a share ≥ 0.75 with minute DD ≤ $35,000 and the median draw net ≥ the better
   incumbent's net; **N4** the 20% portfolio 2016-01-04 → 2023-12-29 has a maximum daily drawdown ≤ 35% and borrowing
   productivity (strategy net per $1M borrowing dollar-days) ≥ best − 0.1 × |best|, best = the better incumbent's; **N5** ≥ 12 funded lots in ≥ 4 calendar years, net(10 bps) ≥ 0.8 × net(5 bps); **N6**
   the two best lots ≤ 50% of net.
3. **FROZEN_SELECTION.json** (sealed): every final candidate's gates and at most **one nominee** (the passing
   candidate with the highest neighbourhood median J_pool; ties D before B, R1 before R2), or no advancement.
4. **Historical check** (only with a nominee, once, after the selection freeze): one continuous run 2016-01-04 →
   2026-10-13 of the nominee, A and B4; increments after the 2023-12-29 close. Passes iff V(nominee) ≥ max(V(B5),
   V(B4)) − $10,000 and the window's minute DD ≤ $35,000. The derived engine must reproduce the replay's figures for
   all three runs (whole-run net, lots, minute drawdown; the window's increment and daily drawdown). The door opens
   only to the nominee's, B5's, B4's and the core's symbols, once for the check, and to the CLI only after it. Label: inspected historical confirmation only (E3). Never used to choose anything; no re-search after it.
5. **Prospective registration** only if the check passes: `PROSPECTIVE_REGISTRATION.json` (a new-study record;
   the B4/B5 freeze untouched), observations strictly after 2026-10-13, 0 today. Otherwise every pool stays
   `research-only`.

## 15. The 20% portfolio

The frozen portfolio mode of the derived engine: $300,000 core (60% VOOG / 40% VGT), each funded trade borrows 20%
of marked equity at the decision in the single shared slot, profits reinvested 60/40, losses funded by core sales,
11% simple interest, 5 bps, the **frozen** dividend convention (core VOOG/VGT and open VGT lots credited). Measures:
end equity, maximum daily % drawdown (the PercentTracker's), borrowing dollar-days (interest × 365 ÷ 11%), strategy
net, productivity = strategy net per $1M borrowing dollar-days. Portfolio end-equity differences driven by earlier
compounding are not read as incremental return.

## 16. Compute tier (outcome-blind)

`npm run ranked-preemption -- benchmark` measures standalone and pool unit costs on the final window (timings and
memory only) and writes `results/benchmark/tier.json`: the first of T1, T2, T3 whose conservative projection (1.5 ×
unit costs) is ≤ 8 h wall-clock and ≤ 12 GB resident; none → stop.

| Tier | Sobol / symbol | local rounds | standalone draws | joint budget fold / final (per window, ranking, arm) | promotion draws | assessment N1 / A2 |
|---|---:|---:|---:|---:|---:|---:|
| T1 | 2,048 | 10 | 16 | 10,000 / 16,000 | 32 | 64 / 32 |
| T2 | 1,024 | 8 | 16 | 6,000 / 10,000 | 32 | 48 / 24 |
| T3 | 512 | 6 | 12 | 3,000 / 5,000 | 24 | 32 / 16 |

Downscaling is allowed only before outcomes (the tier rule). No extra evaluation after a validation is seen. Budgets
are evaluation counts, never wall-clock limits: no stage is truncated by time, so the time cap cannot change a
result (a stage that cannot finish is interrupted and rerun whole, §17).

## 17. Records, freezes and amendments

- **Protocol freeze** `PROTOCOL_FREEZE.json` (sealed): this file, `context.ts`, the brief, the universe record, the
  tier, the data baseline, the B4/B5 configs and phenotypes and the prospective freeze body hash. Written after the
  independent preregistration review and before any study outcome.
- **Code freeze** `results/code_freeze.json` (sealed): the code manifest (every `src/**/*.ts` except tests) after the
  parity gate and the engine review; every outcome stage verifies the protocol freeze, the code freeze (or the
  amendment chain) and the data hashes before it starts.
- Every stage record is sealed write-once with a body hash; a sealed stage is never rerun (a rerun of an interrupted
  unsealed stage repeats it whole with the same seeds).
- **Amendments** (`results/amendments.jsonl`, hash-chained): technical corrections only, each with the stage it
  affects, the files it touches, its reason and review; never a gate, threshold, metric, ranking, budget or seed
  change after outcomes. **Outcome-defining files** — `allocation.ts`, `engine.ts`, `replay.ts`, `evaluate.ts`,
  `data.ts`, `standalone.ts`, `ranking.ts`, `inputs.ts`, `diagnostic.ts`, `joint.ts`, `controls.ts`,
  `walkforward.ts`, `final.ts`, `space.ts`, `context.ts` — may be amended only with a new independent review recorded
  in `reviews/`, and never after a sealed outcome of a stage the change could affect. Report-only code (`tables.ts`,
  the read-only CLI commands, report text) may change after the code freeze through a `reporting` amendment that
  states it cannot affect any sealed record.
- **Environment:** every stage, freeze and parity run refuses a Node version other than `v24.21.0`, and the test-only
  path overrides (`RANKED_PREEMPTION_ROOT`, `RANKED_PREEMPTION_DATA`) are honoured only inside the operating
  system's temporary directory; the freezes refuse them outright. Every stage record states the guard's result.

## 18. Tests and acceptance

`src/d1-ranked-preemption/tests/`: P0 = frozen engine and replay on synthetic universes; the switch at exactly $0,
+$0.01, −$0.01; gross positive but net negative; weekend interest and the next eligible trade; lower/equal priority;
a pending reservation; a missing executable trade (abort); a missing rank; three same-minute competitors
(determinism, no chain); an own exit superseding a switch (gap through the stop); shadow divergence and a later
re-entry; post-switch mutation of later bars; nets, interest interval and both frictions; one lot at a time; end of
data; portfolio = fixed funded sequence and no dividend after the sale; price units (splits); the sale and the
replacement's fill at the same auction print (abort) and at a strictly later fill (execute); an own stop inside the
sale bar (the sale at the open first; with the $500 buffer it aborts and the stop closes the lot); supersession by a
maximum hold with a later fill; a two-minute chain; portfolio margin refusal with the incumbent open; a closing-print
sale; an own exit in the decision minute (a plain grant); a friction-driven abort; the $250 boundary; windowed
figures against the engine's daily marks; a refused signal never reconsidered; P0 = frozen with a fifth book; every
later array mutated; a seeded fuzz of engine against replay under all five policies with accounting, arming and end
offsets; the P0 diagnostic actionable exactly when P1 executes its first preemption. Plus: the loader's
post-cutoff mutation test (bars after a search end cannot change a window's loaded hash or its rankings); ranking
recomputation from the JSON; rankings unchanged across every joint evaluation (hash checks); the real-data parity
gate (§5.1); a synthetic end-to-end run of every stage in order on fixture data in a scratch tree
(`tests/pipeline.test.ts`: write-once refusals, door refusals, export, CLI); `npm test`, `tsc --noEmit`, `eslint`; the earlier studies' and the prospective freeze's hashes
unchanged; an independent engine review and an independent final audit.

## 19. Reports and CLI

Reports in this folder: `README.md`, this protocol and its freeze, `STANDALONE_SCREENING.md`,
`FROZEN_PRIORITY_RANKINGS.md` (+ `rankings/<window>/R{1,2}.json`), `OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md`,
`JOINT_SEARCH_AND_DIVERSITY.md`, `CHRONOLOGICAL_VALIDATION.md`, `FINAL_COMPARISON_AND_RECOMMENDATION.md`,
`IMPLEMENTATION_AUDIT.md`, `RESEARCH_RECOVERY.md`. Research pools: `config/research-pools/d1-ranked-preemption/`
(schema `ranked-preemption-pool` v1; status `research-only` unless registered). CLI `npm run ranked-preemption --`:
list, show, fixed, portfolio, compare, preemptions, prospective, verify, tables and the stage commands. Every fixed
run prints and exports (CSV and JSON) the full chronological funded-trade ledger from the engine's own accounting —
trade #, ETF, entry/exit times and fills, size, shares, holding days, exit reason (incl. `priority_preemption`),
gross P&L, friction, interest, net, cumulative net, MAE — per-ETF totals, open positions with accrued interest
marked at the last close, the realized/unrealized reconciliation, minute and daily drawdowns ($ and % of $100,000);
a portfolio run adds end equity, daily % drawdown and borrowing productivity; both add every preemption record and
decline and the per-book granted/refused counts with the holders (collision report). Unregistered research pools and
new configurations (B5 under P1) are limited to their window's training data (§4.4); B4/B5/B1 unchanged run on
`all` and reproduce the pools CLI (`npm run pools -- fixed B4|B5`), whose commands stay the reference.

## 20. Stop rules

Audit mismatch; parity failure; no tier fits; a freeze or hash verification failure; an integrity defect found by a
review that cannot be fixed before an unsealed stage. Each stops the study at that point and is reported. Gate
failures are outcomes, not stop rules.

## 21. Evidence grades

E0 one training centre; E1 a training neighbourhood; E2 reused chronological folds (inspected years); E3 the inspected
2024–2026 window (blocking-only); E4 forward observations (none exist).
