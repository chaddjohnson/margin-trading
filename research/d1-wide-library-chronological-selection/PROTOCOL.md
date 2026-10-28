# Protocol — broad D1 phenotype libraries and chronology-aware selection (Study 1 of 3)

Study `d1-wide-library-chronological-selection-v1`, 2026-10-27. Namespace: `research/d1-wide-library-chronological-selection/`,
`src/d1-wide-library-selection/`, `evaluations/d1-wide-library-selection/` (git-ignored CLI outputs). Single entry
point: `npm run d1-library-study -- <command>`. Every constant below is declared in
`src/d1-wide-library-selection/context.ts`; the selection rules are restated operationally in
`LIBRARY_SELECTION_RULES.md` and machine-readably in `EXPERIMENT_MATRIX.json`. All three are bound by
`PROTOCOL_FREEZE.json`. The assignment as received is `brief/BRIEF.md` (sha256 `f6743100…`). This is version 2: version
1 was reviewed by an independent read-only methodology reviewer (`reviews/methodology-review.md`, verbatim), revised
before the freeze (`reviews/METHODOLOGY_DISPOSITIONS.md`; v1 kept in `reviews/superseded/`).

This study is **Study 1 of three**. It does not touch pairwise/all-61 signal overlap or capital occupancy (Study 2) or
any momentum entry (Study 3), and nothing here changes a pool, a registered phenotype or a deployed default.

## 0. What is and is not claimed (stated before any outcome)

- **Every window used here was inspected by earlier studies.** Fold A's evaluation window (2020-07-01 → 2021-12-31),
  fold B's (2022-01-03 → 2023-12-29) and the supplementary one-year windows were all seen before. The comparison is a
  **retrospective, period-correct method replay**: each procedure reads data only through its own cutoff, but the
  designer of this study and of the source procedure knew the 2016–2026 history. Freezing now does not restore
  statistical independence.
- **What this study computed or inspected before the freeze:** an archive field inventory (counts and hashes only);
  the fold-a archive reconstruction and census on 2016-01-04 → 2020-06-30 (families, triggers, the A0 reproduction, a
  discarded audit); the incumbents' anchors (VGT primary, B4, B5) on the folds' windows; an outcome-free count of the
  new Sobol design's grid collisions with every archived grid (0 in every window and stage); and a **training-only dry
  run of fold S18** (2026-10-27T23:26–23:34Z, in a scratch root outside the repository, with a mode — since removed
  from the code — that bypassed the freezes and capped every load at 2018-12-31): the S18 new search (67,008
  evaluations), its engine-versus-fast parity sample (1,100 checks, 0 failures) and its libraries and nominees (71,200
  draws), reading nothing after 2018-12-31, i.e. before every evaluation window. Only structural counts were looked
  at (evaluation, check and draw counts; 0 collisions; 0 flags; one power count, NEW/A2/K = 16: 25 identical, 36
  differing nominees); no nominee, grid or training P&L. The dry-run digests are kept in
  `results/dryrun-S18-prefreeze/DRYRUN_DIGESTS.json`; the official S18 records must reproduce them (determinism).
  Code changed after the dry run (before the freeze): the analysis's S21 event attribution and every change listed in
  `reviews/CONFIRMATORY_DISPOSITIONS.md`; none is informed by the dry run's content. This study computed **no**
  fold-B or final-window archive outcome, **no** new-search result after 2018-12-31 and **no** outcome of any
  candidate after any cutoff.
- **What was already knowable from published records (disclosed; the knowledge cannot be removed):**
  1. *A0's fold outcomes are published.* The standalone audit (its §9.1, `CHRONOLOGICAL_EVIDENCE_AND_SELECTION_BIAS.md`)
     ran every fold-a and fold-b representative — A0's nominees — over its fold's evaluation window and published V
     per ETF at 5 and 10 bps. **The designer of this study read that table (all 119 fold vectors) at the start of
     this session, before writing this protocol.** A0's evaluation results are therefore known in advance, and any
     comparison with A0 is designed with that knowledge.
  2. *ARCH outcomes are derivable by subtraction of published files.* The source's 2,048 Sobol grids per ETF are
     identical in its three archives (checked, grids only: all 61 ETFs), and an archive `net` is the
     liquidation-equivalent mark at the search end; so fold-A V of an archived Sobol row = net(fold-b) − net(fold-a),
     and fold-B V = net(final) − net(fold-b). The pre-freeze inventory parsed the rows to count them; **this
     subtraction was not performed and will not be performed outside the planned evaluation.**
  3. *Thresholds were set by studies that saw 2016–2023:* A3's 75% / 75% neighbourhood filters and T's $10,000
     worst-lot term are the standalone audit's F9 / F10 / F2 flag thresholds; the $35,000 ceiling, the $20,000 DD
     penalty, the credible-trade rule, the box and the neighbourhood instrument are the source's.
  ARCH fold results are therefore graded at the **lowest evidence level** (retrospective, and determined in advance by
  published records); NEW and NEW-S results were not computable from published records, but the designer's knowledge
  of the history still applies.
- **Structural hindsight (not removable):** the 61-ETF universe consists of funds that exist and trade today with
  complete 2016-onward minute data (closures and pre-2016 history are absent); the exposure clusters were assigned by
  the standalone audit.
- **No bar after 2023-12-29 is read for any candidate**; no bar after 2026-10-13 is read at all (the incumbents'
  full-history anchors end there). 2024–2026 is not opened, not validated and not used to choose anything.
- A historical drawdown below $35,000 is not a cap on future losses. No figure here is a forecast or a claim of future
  profitability. **No demonstrated improvement** is a valid outcome. The verdict rules are deliberately conservative
  (§9); with 12 (arm × pool) chances, "mixed / inconclusive" is a likely outcome even without any real effect.

## 1. Questions

- **Q1 (width).** With the same candidates and the original scoring (A1 vs A0), does a wider, behaviourally diverse
  training-only library improve the next chronological window's results? (A1(8) vs A0 is the equal-checked-budget
  diversity comparison; A1n separates diversity from simply checking more candidates.)
- **Q2 (objective).** Does a D1-tail-compatible objective without the largest-winner subtraction (A2), or an explicit
  neighbourhood-risk rule (A3), improve later results relative to A0 — or merely raise training peak P&L? (NEW-S, the
  only objective-neutral pool, is the pool for interpreting A1 vs A2.)
- **Q3 (mechanism).** Diversity, new optimization, validation-based selection or more trials? Ablations: pools ARCH,
  ARCH-S, NEW, NEW-S, ALL; K ∈ {8, 16, 32, 64}; A1n; A4 vs A2 on the same library; random-pick and oracle diagnostics.
- **Q4 (nested).** Does choosing among a frozen training library with an intermediate validation window retain an
  advantage on the following window (T1 primary, T2 secondary)?
- **Q5 (risk and events).** Are risk ceilings, costs and dip-and-recovery capture robust; which ETFs and event families
  drive any finding; which windows are too sparse to judge?

## 2. Invariants

1. The D1 mechanism, its eight parameters, box and grid (tenths of a percentage point; sessions; calendar days),
   fills, stops, buffer, holding, continuation, warm-up, splits, calendar and interest are the existing engine's and
   are unchanged. No momentum entry, no exit change, no leverage beyond the margin model, no allocator change.
2. Standalone only: each ETF alone in one fixed $100,000 borrowed slot, one lot at a time, never compounded; 11%
   simple interest from the entry session's midnight (365-day); 5 bps per side modelled friction (not a commission);
   accounting from the 2016-01-04 close; books arm on 2017-06-15. No pooled phenotype, preemption, joint optimization or
   overlap-based ETF combination.
3. Read-only: `config/`, `data/`, every earlier `research/` study, the prospective B4/B5 freeze and its code closure.
   The only file changed outside this study's two folders is `package.json` (one script). The earlier studies'
   verifiers run before and after (§12); a verifier that writes inside its own study (the standalone audit's) runs only
   in a detached worktree at its own commit.
4. No new phenotype is promoted or registered; every candidate is **research-only**, stored in this namespace.
5. No download, network, broker, credential (`.env`) or account action.

## 3. Data, universe, folds and doors

### 3.1 Data and universe

Canonical `data/<SYMBOL>/data.csv` (raw SIP minute bars, splits forward-adjusted), the training partition only.
Baseline hashes in `results/baseline/`. Universe: the source study's audited 61 eligible ETFs; every loaded file must
hash to that audit; for folds A and B the loaded training bars must equal the source's own Stage A door records.

### 3.2 Folds

| Fold | Role | Training (search, libraries, training-only selection) | Evaluation window (incremental) | Pools |
|---|---|---|---|---|
| **A** | primary | 2016-01-04 → **2020-06-30** | 2020-07-01 → **2021-12-31** | ARCH (source fold-a), ARCH-S*, NEW, NEW-S, ALL |
| **B** | primary | 2016-01-04 → **2021-12-31** | 2022-01-03 → **2023-12-29** | ARCH (source fold-b), ARCH-S*, NEW, NEW-S, ALL |
| S18 | supplementary | → 2018-12-31 | 2019-01-02 → 2019-12-31 | NEW |
| S19 | supplementary | → 2019-12-31 | 2020-01-02 → 2020-12-31 | NEW |
| S20 | supplementary | → 2020-12-31 | 2021-01-04 → 2021-12-31 | NEW |
| S21 | supplementary (derived) | fold B's NEW pool | 2022-01-03 → 2022-12-30 | NEW (no extra search) |
| S22 | supplementary | → 2022-12-30 | 2023-01-03 → 2023-12-29 | NEW |

\* ARCH-S (the first 1,024 archived Sobol rows) is a descriptive budget-matched comparator of NEW-S; it enters no
verdict. The supplementary folds form a **rolling one-year track** (2019 … 2023); they overlap the primary windows and
each other and are never independent replications. S18 has 1.55 armed training years. The pre-freeze fold-a
reconstruction read 2016-01-04 → 2020-06-30, which contains S18's and S19's evaluation windows (only archived ARCH
grids, no NEW grid, were evaluated; disclosed). The final source window is **not a fold**: its archive is only
reconstructed on its own training span for the census, last (§8.2).

### 3.3 Nested triples (§8.3)

| Triple | Training | Intermediate selection window | Later assessment window | Pools | Role |
|---|---|---|---|---|---|
| **T1** | fold A | 2020-07-01 → 2021-12-31 | 2022-01-03 → 2023-12-29 | NEW (primary), NEW-S | primary nested |
| **T2** | fold B | 2022-01-03 → 2022-12-30 | 2023-01-03 → 2023-12-29 | ARCH, NEW, NEW-S, ALL | secondary; overlaps T1's later window |

**T1 cannot use archived fold-a vectors** (the source study allows them only through 2021-12-31); it uses only this
study's newly generated fold-A candidates, which this protocol authorizes through 2023-12-29 — an independent stream
with its own ids, nothing relabelled. No T1 result is reported for ARCH, ARCH-S or ALL.

### 3.4 Doors (`src/d1-wide-library-selection/doors.ts`; each refuses before a byte is read)

- **Calendar door (every load):** a load ending at E refuses unless every fold SELECTION whose cutoff is before E and
  every nested SELECTION whose selection end is before E is sealed, verifies, is the right fold's or triple's, was built
  on its own training door and was sealed under the current protocol freeze. Because the designs are paired (the same
  new Sobol grids in every fold; the same archived Sobol grids in every source window), a later cutoff's training
  figures are an earlier fold's evaluation figures by subtraction; the calendar door therefore orders every stage
  (§8.2). Each stage record lists the seals it verified.
- `trainingUniverse(fold)`: access `optimization`, through the cutoff; the loaded last date equals the cutoff; audited
  hashes; for folds A and B the source's Stage A bars.
- `sourceTrainingUniverse(window)`: a source window's own training span (fold-a = fold A, fold-b = fold B, final →
  2023-12-29), for the archive reconstruction and census only.
- `evaluationUniverse(fold, end, members, candidates)`: never after 2023-12-29; the code freeze; the fold's own sealed
  SELECTION for any date after its cutoff; a triple's sealed nested SELECTION for any date after its selection end;
  nothing after the fold's evaluation end except a triple's later window, and then only for that triple's pools; every
  archived candidate within its source window's door.
- **Provenance semantics:** doors apply per provenance row (source window, stage, row). The same grid evaluated under
  another provenance or fold is another row; **no figure computed under one provenance or fold is ever attributed to a
  vector of another** (in particular, no fold-a archived grid is looked up in fold B's rows).
- Incumbent anchors use the source's own inspection door and the standalone audit's full-history door, unchanged.

## 4. Arm ARCHIVE — the source archives and the discarded-candidate audit

1. **Inventory** (`results/archive/INVENTORY.json`): rows, fields, Sobol/local counts per ETF and window; every sealed
   file hash verified. Stored per row: grid, origin, trades, net, best, minute DD, J_s, credible, R1, R2 — no trades,
   interest, friction, daily DD, worst trade or trade signature.
2. **Reconstruction** (fold-a pre-freeze; fold-b in calendar order; final last): every row re-evaluated through the
   source's own evaluator on its own training window; the nine stored fields must equal the recomputation to the cent.
   The archive is a biased sample (its local search refined only the top 4 starts by J_s) and is never called
   unbiased.
3. **A0 reproduction:** the source's narrow rule on the reconstructed archive with the source's own draws must
   reproduce, per ETF, the sealed representative, library, checked set (J_nb), evaluated and credible counts (fold-a
   pre-freeze: 61/61). **Where the sealed A0 and A0r on ARCH differ, the sealed A0 governs the ARCH baseline** and the
   difference is reported.
4. **Census and discarded audit (training only):** credible counts, unique trade paths, families, trigger statistics,
   the old penalty's impact and, per ETF, the exclusions: non-positive net; drawdown above $35,000; too few trades;
   credible but outside the J_s top 32 (**crowding**); inside the top 32 but a near-duplicate; distinct but beyond the
   cap of 4; credible with DD above $20,000 (the DD term); and **best-trade-penalty displacement**, measured by the
   counterfactual **J′ = net − max(0, minute DD − $20,000)** (J_s without the best-trade term): a family is displaced iff
   it is among the top 4 families by J′ (each family's best-J′ member) but not among the top 4 by J_s. The fold-a v1
   census (pre-freeze, crowding-confounded displacement measure) is kept as `CENSUS-prefreeze-v1.json`; the fold-a
   census is rerun after the freeze with the v2 code.

## 5. Arm NEW-SEARCH

### 5.1 Feasibility triggers (training-only)

T-a fewer than 12 credible families in more than 20% of ETFs; T-b in more than 20% of ETFs one family holds at least
half of the top 32 credible vectors by J_s; **T-c (legal)** T1 needs fold-A candidates evaluable in 2022–2023 and
archived fold-a vectors are barred there; **T-d (objective)** the archive's refinement was steered by J_s. T-c and T-d
hold by construction, so the search runs in every fold; T-a and T-b are reported (fold-a pre-freeze: 18%, 93%).

### 5.2 Procedure and budget (per ETF and fold; training bars only)

1. **Sobol:** `sobolVectors(symbol, 1024, 'd1-wide-library-v1:new-search')` (the source's quantization and box; the
   same design in every fold). **Collision guard:** every archived Sobol grid (the source's data-free design) and the
   local-search grids of source windows whose search end is on or before the fold's cutoff; a vector in the guard is
   dropped and counted by cause; a vector equal to a later window's local-search grid is kept and flagged (never
   dropped, so post-cutoff data cannot steer the search). Pre-freeze count of the design's collisions with every
   archived grid: **0**.
2. **Refinement starts** from distinct credible Sobol families by quota: 4 by T (the family's highest-T member), 2 by
   support (§6.2; the medoid), 2 by the lowest minute drawdown; an unfilled quota is filled from the T order.
3. **Refinement:** per start 2 rounds of 8 moves (6 single-coordinate ±1..3 step units, 2 joint ±1 unit; the source's
   operators; `Rng.from('d1-wide-library-v1', 'refine', fold, symbol, start, round)`), moving to the best credible move
   whose T is strictly higher; **at most 128 refinement evaluations per ETF and fold**; a duplicate or guarded vector
   is redrawn up to 20 times (logged by cause), then skipped.
4. Objective **T = net − max(0, minute DD − $20,000) − max(0, −worst lot − $10,000)**.
5. The budget is a count (≤ 1,152 per ETF and fold; ≤ 421,632 for 61 ETFs × 6 folds); the record states evaluations,
   workers, cores and times.
6. Pools: **NEW** = Sobol + refinements (refinements steered by T, A2's objective); **NEW-S** = Sobol only (the only
   objective-neutral pool); **ALL** = ARCH ∪ NEW; **ARCH-S** = the archived Sobol rows 0..1023 (budget-matched with
   NEW-S; descriptive). Budgets differ and are not normalized except ARCH-S vs NEW-S: ARCH ≈ 2,250–2,280 evaluations
   per ETF (2,048 Sobol + local search), NEW ≤ 1,152, NEW-S ≤ 1,024, ALL ≈ 3,400. The neighbourhood draws per library
   member (§7) are additional and recorded.
7. A new nominee whose training trade signature equals an archived vector's of the same fold, or whose grid equals an
   incumbent's, is flagged in the selection record. No claim about any archived vector is made from NEW results.

## 6. Libraries and families

### 6.1 Credibility (identical for every arm; the source's rule)

credible ⇔ trades ≥ max(4, ⌈eligible years⌉) (A 4, B 5, S18 4, S19 4, S20 4, S22 6) ∧ minute DD ≤ $35,000 ∧ net > 0
(5 bps, 11%, a lot open at the cutoff at its liquidation value).

### 6.2 Trade-path families

d(a, b) = max(1 − Jaccard(held sessions), 1 − Dice(entry sessions matched within ±3 sessions)). Families: visit the
credible vectors by training net (descending, then key); each joins the first family whose **every** member is within
d ≤ 0.5 (complete linkage, bounded diameter; no chaining), else starts a new one. d ≤ 0.5 means "similar trade
paths" (not "near-identical"); exit modes and catalog episodes are descriptors, not distance components; the diameter
was chosen after the fold-a census (disclosed). The visiting order makes high-net families absorb boundary candidates;
therefore **support is defined order-independently**: the number of the pool's credible Sobol vectors within d ≤ 0.5 of
the family's medoid.

### 6.3 Library sizes

K ∈ {8, 16, 32, 64}; each library is the top K families of the arm's order (smaller K a prefix). Realized K and the
share of ETFs whose K-library is no larger than K/2 (saturation) are reported per cell. K = 16 is the primary design
point; the verdict requires K = 8 and K = 16 and one of K = 32 / 64 (§9.3), so no K is chosen after a result and the
often-saturated 32/64 count once.

## 7. Arms

Each arm nominates **at most one vector per ETF** or none. "No nominee" is an idle slot (V = 0) by design.

- **A0 (sealed)** — folds A and B, ARCH: the source's sealed representative and library; nominee iff the sealed status
  is survivor. The ARCH baseline.
- **A0r** — the narrow rule on any pool: top 8 credible by J_s with distinct signatures; 16 source draws (stage
  `standalone:fold-a` / `standalone:fold-b`; `d1-wide-library:<fold>` for S folds); J_nb = median J_s; representative =
  highest J_nb (ties J_s, key), **then** nominee iff J_nb > 0 ∧ J_s > 0; library ≤ 4 by entry-session Jaccard ≥ 0.5 from
  the top 32. The baseline on every pool other than ARCH.
- **A1(K)** — families ordered by their best-J_s member's J_s; library = top K; among members with J_nb > 0 ∧ J_s > 0,
  the highest J_nb (filters **then** maximizes, so A1 can nominate where A0r declines — disclosed).
- **A1n(K)** (descriptive) — top K credible by J_s with distinct signatures, no family deduplication; A1's nominee rule.
- **A2(K)** — families ordered by their best-T member's T; library = top K; among members with entries in ≥ 2 calendar
  years and T_nb > 0 (median T over the same 16 draws), the highest T_nb (ties: net per occupied day, key). Capital
  efficiency enters only through the interest inside net and a rarely binding tie-break; "event coverage" is ≥ 2 entry
  years.
- **A3(K)** — families ordered by support (§6.2) (ties: the medoid's worst lot, key), each represented by its
  **medoid**; library = top K; 48 draws per member (N1 0..31, N1A2 0..15 — more than A0r/A1/A2's 16, disclosed); among
  members with ≥ 75% of draws net-positive, ≥ 75% with minute DD ≤ $35,000, a worst training lot ≥ −$15,000 and entries
  in ≥ 2 eligible training catalog families, the highest **P25 of the 48 draw nets**, iff P25 > 0.
- **A4(K)** (nested only) — library = A2(K) of the pool; the member with the largest selection-window V (5 bps) among
  members with ≥ 1 lot entered in the selection window and a windowed minute DD ≤ $35,000, iff V > 0 (ties: T_nb, key).

**Across-ETF** (an extra multiple-testing layer): each arm advances its top 5 ETFs by its own nominee score (A0/A0r/A1:
J_nb; A2: T_nb; A3: P25; A4: V_sel), each in its own $100,000 slot (separate accounts, never a pool). The across-ETF A0r
is a study construct, not the source's R1/R2 ranking.

## 8. Chronological evaluation, conventions and order

### 8.1 Evaluation runs and conventions

Every evaluated vector runs **once, continuously, from 2016-01-04** to the window end. For a window (b, e]:
**V = liquidation-equivalent mark at e − the same at b** (a lot open at either end at its liquidation value: exit
friction and interest to that session). **Windowed minute and daily drawdowns** are the source replay's: the engine's
marks (realized + open lot marked without exit friction), peak reset to the mark at b's close; the breach count B and
A4's filter use the **fast path's windowed minute drawdown at 5 bps**. Fail-closed identities:

- **Boundary parity:** each vector's mark at the cutoff close equals its sealed training net (5 bps).
- **Engine = fast:** every nominee (every arm, K, pool; A4 picks; VGT primary) is re-run on the full engine at
  0/2/5/10 bps (re-simulated: a cost change can change stops and continuation eligibility); its V, its windowed daily
  drawdown (engine raw daily marks) and its lots entered after b equal the fast path's at every cost and window.
- **Cross-phase parity:** B-sel's V = B's first-window V minus its second; A's V = T1-later's first-window V minus its
  second. **Nested boundary parity:** the mark at the selection end in the later run equals the sealed
  selection-window run's end mark. Both at 5 bps for every vector and at 0/2/10 bps for every nominee the earlier phase
  holds at that cost (so B-sel's 10 bps figures, which S21 uses, are checked).
- Every phase stores a price-only window catalog for each of its window starts; each cell uses its own window's.
- The 20% portfolio overlay (5 bps): $300,000 at 60% VOOG / 40% VGT, 20% of marked equity per lot, the frozen dividend
  convention; the window's equity increment over C0's and its maximum daily % drawdown after b (preferred ≤ 30%,
  conditional ceiling 35%).

### 8.2 Order of execution (each stage write-once; the calendar door enforces the order)

1. Protocol freeze → code freeze (every source and test file).
2. S18: search → engine-vs-fast sample → libraries. 3. S19: likewise.
4. Fold A: fold-a census (v2) → search → sample → libraries. 5. S20: search → sample → libraries.
6. Phase A (→ 2021-12-31) → **T1 nested selection**.
7. Fold B: fold-b reconstruction → census → search → sample → libraries.
8. Phase B-sel (→ 2022-12-30; T2's selection window and S21) → **T2 nested selection**.
9. S22: search → sample → libraries.
10. Phase B (windows from 2021-12-31 and 2022-12-30), phase T1-later (NEW and NEW-S fold-A candidates; windows from
    2020-06-30 and 2021-12-31), phases S18, S19, S20, S22.
11. Final-window reconstruction and census (census only), analysis, tables, reports.

The calendar door enforces every ordering that matters: a load ending at a triple's selection end reads no later bar,
so "T1 before fold B", "T2 before S22" and "the final census after phase B" are advisory (harmless either way; the
order above is followed). `analyze`, `tables` and `verify` refuse unless every evaluation was made from the current
sealed SELECTION and seals and started after them, and every nested selection after its selection-window evaluation
(`chronology.ts`).

**Parity sample** (per fold, after its search, before its libraries): per ETF, the highest-J_s credible archived row and
one hash-chosen archived row (folds A, B), one hash-chosen new Sobol row and one hash-chosen refinement row, re-run on
the full engine on the training window; trades, closed, open, net, best, worst, minute and daily DD, interest and
friction must agree to the cent.

### 8.3 Nested selection

A4's choice uses only the sealed selection-window evaluation; the chosen vector is unchanged in the later window,
which never chooses anything. Reported: the price of selection (selection V vs later V of the picks), the later V of
every library member (random-pick expectation), the median per-ETF rank correlation between selection and later V,
picks resting on one selection-window lot (thin evidence), and the across-ETF A4 top 5. A nested result judged on its
own selection window is never called validation.

## 9. Metrics and the predeclared decision rules

### 9.1 Reported per (window, pool, arm, K)

Library (realized K, saturation, families, credible, A0-library family coverage). Nominees (count, lots in the window,
ETFs with window lots, nomination rate). P&L: Σ / mean / median / quantiles of V over the 61 ETFs (no nominee = 0) at
0/2/5/10 bps; windowed minute and daily DD; breaches; worst window lot and MAE; an expected-shortfall proxy (the mean of
the worst 10% of window lot nets pooled across the arm's nominees); win/loss counts, MAE, MFE and holding-day
distributions, exit reasons; interest and friction; lot-days and net per $1M borrowing dollar-days. Events: window
catalog families (trough inside the window), dip-captured share (all 61 and nominees only), major-family capture, major
families missed by nominees, continuation trades high in the rebound, falling-knife losses, first-entry offsets from the
trough; for the primary cells, the nominees' largest window winners' parameter dependence over 16 capture draws (same
family captured, ≥ 50% of the episode net retained, narrow coincidences (< 25% retain), entry-depth spread). Top-1/3/5
profit concentration is descriptive only and never a penalty.

### 9.2 Paired comparison with the baseline on the same pool (one window, one K)

ΔV_i = V_arm,i − V_base,i (5 and 10 bps) per ETF i; mean ΔV (5, 10); W = #(ΔV > 0); L = #(ΔV < 0); I = identical
nominees (both none included); per exposure cluster c ΔV_c = Σ ΔV_i, CW, CL; B = nominees with windowed minute DD >
$35,000.

- **insufficient evidence** ⇔ W + L < 10, or CW + CL < 5, or fewer than 10 ETFs with V ≠ 0 for the arm, or fewer than 10
  for the baseline, or fewer than 10 eligible catalog families with a trough inside the window (61 ETFs together). An
  insufficient cell is neither favourable nor unfavourable; the K denominator stays 4.
- **favourable** ⇔ not insufficient ∧ mean ΔV(5) > 0 ∧ mean ΔV(10) > 0 ∧ W > L ∧ CW > CL ∧ B_arm ≤ B_base + 1.
- **unfavourable** ⇔ not insufficient ∧ mean ΔV(5) < 0 ∧ W < L. **risk-incompatible** ⇔ B_arm ≥ B_base + 3.
- Descriptive, always reported: the four-way split of ΔV (identical / both nominate different vectors / only the arm /
  only the baseline) with W and L in each; mean ΔV without the cluster of largest |ΔV_c|; the nomination rates. The
  identical-nominee counts of every comparison are sealed with the libraries, before any evaluation (its power).

### 9.3 Verdicts

Per (pool ∈ {ARCH, NEW, NEW-S, ALL}, arm ∈ {A1, A2, A3}) over folds A and B; **the first rule that holds, in this
order, applies** ("at K = 32 or 64" always means at K = 32 in both folds or at K = 64 in both folds):
- **improves generalization**: favourable in both folds at K = 8 **and** K = 16 **and** at K = 32 or 64, and
  risk-incompatible in neither fold at any K;
- **demonstrably worse or risk-incompatible**: unfavourable in both folds at K = 8 and 16 and at 32 or 64, or
  risk-incompatible in either fold at K = 16;
- **insufficient evidence**: an insufficient K = 16 cell in either fold;
- **no evidence of improvement**: favourable in neither fold at K = 16;
- **mixed / inconclusive**: otherwise.

**Across-ETF** per (pool, arm): Δ = Σ V(arm's top 5) − Σ V(baseline's top 5); "improves" iff Δ > 0 at 5 and 10 bps in both
folds at K = 8, 16 and 32 or 64; "worse" iff Δ < 0 at 5 bps likewise; else mixed. The baseline's score on ARCH is the
sealed representative's own J_nb.

**Nested** (reported **beside**, not inside, §9.4): the primary cell is **T1/NEW**. A4(K) is compared on the later
window with A2(K) (same library, training-only choice) and with the baseline. A nested cell is, first rule first:
**favourable** iff favourable against both at K = 8, 16 and 32 or 64; **worse** iff unfavourable against both likewise;
**insufficient evidence** iff either K = 16 comparison is insufficient; **no evidence of an advantage** iff neither
K = 16 comparison is favourable; else **mixed / inconclusive**. **"Validation selection retains an advantage"** iff
T1/NEW is favourable and T1/NEW-S is not worse (T1/NEW favourable with T1/NEW-S worse → mixed); "validation selection
is worse" iff T1/NEW is worse; otherwise T1/NEW's own state. T2's cells are secondary and never counted as a
replication. **Nested across-ETF:** "improves" iff A4's top 5 improves (the across-ETF rule) against both A2(K)'s and
the baseline's top 5; "worse" iff worse against both; else mixed.

**Rolling track** (NEW, K = 16, vs A0r(NEW)): favourable / unfavourable / neither / insufficient per year 2019 … 2023.

### 9.4 Study-level outcome (exactly one)

1. **Evidence for an improved selection procedure** iff some arm is "improves" on **ARCH**, is "worse" on **neither**
   NEW nor ALL, and is favourable in ≥ 3 of the 5 rolling years.
2. **New procedure is materially worse** iff every one of A1, A2, A3 is "worse" on ARCH.
3. **Mixed / inconclusive** iff neither 1 nor 2 and some arm is favourable at K = 16 in both primary folds on some
   verdict pool, or some arm is "improves" on a pool other than ARCH, or some arm is "insufficient evidence" on ARCH.
4. **No demonstrated improvement** otherwise.

None of these outcomes nominates a production configuration.

### 9.5 Descriptive analyses (never in a verdict)

A1 vs A1n (diversity at equal trials) and A1n vs the baseline (more trials without diversity); A1(8) vs A0 (equal
checked budget); ARCH-S vs NEW-S (budget-matched pools: each arm on ARCH-S against the same arm on NEW-S, paired); every arm on NEW, NEW-S, ALL, ARCH-S against the sealed A0 on
ARCH (complete procedures, budgets differ); the across-ETF top 5 drawn from 50 seeded subsets of 15 and of 30 ETFs; the
discarded groups' window V (the sealed library, the J′-displaced families, the A1 library's other families); library
random-pick and hindsight-oracle means and the training-vs-window rank correlation; matching-window references (VGT
primary run alone; B4/B5 from the sealed anchors; context only, hindsight-advantaged).

## 10. Multiplicity, sample size and leakage controls

- Degrees of freedom (counted and reported): 3 arms × 4 K × 4 verdict pools × 2 primary folds of comparisons with the
  baseline (96), 12 (arm × pool) verdicts; nested: T1 2 pools × 4 K × 2 comparators (16), T2 4 pools × 4 K × 2 (32); 5
  rolling years × 3 arms; the across-ETF top 5 among 61; 4 cost settings per nominee; the descriptive ablations. A
  single favourable cell is never a finding.
- ETFs, years and episodes share one market history; no p-value, bootstrap, PBO or deflated Sharpe is computed;
  cluster counts are reported beside ETF counts.
- Disclosed asymmetries: A3's 48 draws vs 16; A1's filter-then-maximize vs A0r's maximize-then-filter; NEW's
  T-steered refinements vs ARCH's J_s-steered local search; unnormalized pool budgets (ARCH-S vs NEW-S is the matched
  comparison); B grows with the number of nominees.
- Tests (`src/d1-wide-library-selection/tests/`): post-cutoff mutation leaves the training door, metrics, families,
  libraries and nominees byte-identical; the calendar door refuses until earlier seals exist and refuses a wrong-fold
  seal; the evaluation door's refusals (sealed selection, nested selection, 2023-12-29, source caps, later-window
  pools); boundary-state accounting with a lot open across the cutoff (fast = engine); K-nesting; the decision rules
  (ties, floors, K pattern, insufficiency, outcome).

## 11. Records, freezes and amendments

- `PROTOCOL_FREEZE.json` binds this file, `LIBRARY_SELECTION_RULES.md`, `EXPERIMENT_MATRIX.json`, the brief, both
  reviews and their dispositions, the superseded v1 documents, the pre-freeze records (incl. the fold-a candidates
  file and the dry-run digests), the baseline manifests and every outcome-defining source file. `results/CODE_FREEZE.json` follows immediately and binds every source and test file;
  both precede every post-freeze data stage.
- Every post-freeze stage verifies both freezes, Node v24.21.0 and the absence of test overrides (the frozen code has
  no other mode; the pre-freeze dry-run mode of §0 was removed before the freeze), and stamps its record with the
  protocol body, the code body and the outcome-code digest. **Every record a stage consumes** must carry the freezes'
  protocol and code bodies and start after the code freeze, except the explicit pre-freeze list (inventory, fold-a
  reconstruction, fold-a census v1, the collision count, the anchors). `verify` checks every stamp against the
  outcome-code digest in force when the record started. Every record is write-once with a body hash; a sealed stage is
  never rerun; an interrupted unsealed stage is rerun whole with the same configuration and seeds and labelled.
- Amendments (`results/amendments.jsonl`, hash-chained): reporting corrections to report-only code or text, or a
  technical correction of outcome code that records the new outcome digest and, once any SELECTION exists, either names
  every record it supersedes or states why no sealed record is affected (e.g. a crash fix before the crashed stage
  wrote its record); `verify` fails for a record made under a replaced digest that its amendment does not account for.
  Never a K, weight, threshold, window, rule or budget change after any evaluation outcome.

## 12. Verification and delivery

Before and after: `npm run pools -- verify`, `npm run pools -- forward status`, `npm run vgt-robustness -- verify`, the
ranked-preemption and standalone-audit verifiers at their own commits, and the baseline manifests. The study's `verify`
re-checks every freeze, sealed record, stamp, referenced file hash and budget. `npm test`, `tsc --noEmit` and `eslint`.
An independent implementation and results audit precedes completion; findings and dispositions are published
verbatim. The branch `research/d1-wide-library-chronological-selection` is committed and pushed to `origin` at the end
(no PR, merge, force-push or tag).

## 13. What would come next (not authorized here)

A genuinely independent test needs bars after 2026-10-13 (none exist locally) or a separately authorized decision to
open 2024-01-02 → 2026-10-13 for newly generated candidates under its own protocol. Neither is done here. Study 2
(all-61 signal timing and occupancy complementarity) and Study 3 (an independent momentum-entry strategy) are later,
separate assignments.

## 14. Amendment history

- **v1 → v2 (before the freeze, after the independent review):** the calendar door and the reordered execution
  (finding 1); guards and stamps in every stage (2); the §0 knowability disclosures (3); the insufficiency floors and
  verdict (4); the nested primary cell and nested across-ETF rule (5); the A1n ablation (6); provenance semantics (7);
  the collision guard limited to data-free and pre-cutoff grids (8); the doors' candidate and seal checks (9);
  order-independent support (10); the J′ displacement measure (11); disclosed asymmetries and ARCH-S (12); the K rule
  K = 8 ∧ K = 16 ∧ (32 ∨ 64) (13); the abstention decomposition (14); the measurement conventions and nested boundary
  parity (15); the final-window census, write-once bound files, A0 governance (16); the descriptive brief items (17);
  outcome-code stamps (18). Details: `reviews/METHODOLOGY_DISPOSITIONS.md`.
- **v2 → v2.1 (before the freeze, after the confirmatory review `reviews/confirmatory-review.md`):** the dry run
  disclosed and its mode removed (N1); consumed records' stamps checked (N2); amendments account for superseded records
  (N3); T2's pools (N4); the J′ wording (N5); the K = 32 / 64 wording (N6); rule precedence, nested definitions and the
  nested across-ETF rule (N7); per-window catalogs (N8); A0's own J_nb (N9); the freeze binds what §11 says (N10); the
  chronology checks of `analyze`/`tables`/`verify` (N11); added tests (N12); advisory orderings (N13); door, sample and
  comment details (N14); ARCH-S vs NEW-S (N15); 10 bps cross-phase parity (N16). Details:
  `reviews/CONFIRMATORY_DISPOSITIONS.md`.
