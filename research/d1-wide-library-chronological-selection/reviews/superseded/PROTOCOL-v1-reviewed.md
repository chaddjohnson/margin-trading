# Protocol — broad D1 phenotype libraries and chronology-aware selection (Study 1 of 3)

Study `d1-wide-library-chronological-selection-v1`, 2026-10-27. Namespace: `research/d1-wide-library-chronological-selection/`,
`src/d1-wide-library-selection/`, `evaluations/d1-wide-library-selection/` (git-ignored CLI outputs). Single entry
point: `npm run d1-library-study -- <command>`. Every constant below is declared in
`src/d1-wide-library-selection/context.ts`; the selection rules are restated operationally in
`LIBRARY_SELECTION_RULES.md` and machine-readably in `EXPERIMENT_MATRIX.json`. All three are bound by
`PROTOCOL_FREEZE.json`. The assignment as received is `brief/BRIEF.md` (sha256 `f6743100…`).

This study is **Study 1 of three**. It does not touch pairwise/all-61 signal overlap or capital occupancy (Study 2) or
any momentum entry (Study 3), and nothing here changes a pool, a registered phenotype or a deployed default.

## 0. What is and is not claimed (stated before any outcome)

- **Every window used here was inspected by earlier studies.** Fold A's evaluation window (2020-07-01 → 2021-12-31),
  fold B's (2022-01-03 → 2023-12-29) and the supplementary one-year windows were all seen before. The comparison is a
  **retrospective, period-correct method replay**: each procedure only reads data through its own cutoff, but the
  study's designer (and the source procedure's designer) knew the 2016–2026 history. Freezing now does not restore
  statistical independence.
- **No bar after 2023-12-29 is read for any candidate**; no bar after 2026-10-13 is read at all (the incumbents'
  full-history anchors end there). 2024–2026 is not opened, not validated and not used to choose anything. A future
  independent test would need a separate decision and protocol (§13).
- A historical drawdown below $35,000 is not a cap on future losses. No figure here is a forecast or a claim of future
  profitability. If no procedure reliably improves on the original narrow selection, the result is **no demonstrated
  improvement**, which is a valid outcome.
- **Structural hindsight inherited from earlier research** (disclosed, not removable): the 61-ETF universe consists
  of funds that exist and trade today with complete 2016-onward minute data (closures and pre-2016 history are absent);
  the D1 mechanism, its eight-parameter box, the $35,000 ceiling, the credible-trade rule, the $20,000 drawdown
  penalty and the neighbourhood instrument were all designed in October 2026 with 2016–2026 known; the exposure
  clusters were assigned by the standalone audit.
- **Pre-freeze exploration (disclosed):** before this protocol was written, this study (a) inventoried the three
  source archives (counts and hashes only), (b) reconstructed the fold-a archive on 2016-01-04 → 2020-06-30 and ran
  its census (families, triggers, the A0 reproduction, the discarded audit), and (c) reproduced the incumbents'
  anchors (VGT primary, B4, B5) on the folds' windows. The fold-a census informed the family diameter, the K values'
  realizability and the triggers. **No fold-B or final-window archive outcome, no new-search result and no outcome
  of any candidate after a cutoff existed when this protocol was frozen.** The incumbents' fold increments were
  already published by the source study and were only reproduced.

## 1. Questions

- **Q1 (width).** With the same candidates and the original scoring (A1 vs A0), does a wider, behaviourally diverse
  training-only library improve the next chronological window's results?
- **Q2 (objective).** Does a D1-tail-compatible training objective that does not subtract the largest winning trade
  (A2), or an explicit neighbourhood-risk rule (A3), improve later results relative to A0 — and does it merely raise
  training peak P&L?
- **Q3 (mechanism).** Are benefits, if any, due to diversity, new optimization (NEW vs ARCH pools), validation-based
  selection (A4) or simply more trials? (Ablations: pools ARCH / NEW / NEW-S / ALL; K ∈ {8, 16, 32, 64}; A4 vs A2 on
  the same library; library-level random-pick and oracle diagnostics.)
- **Q4 (nested).** Does choosing among a frozen training library with an intermediate validation window retain an
  advantage on the following window (T1, T2)?
- **Q5 (risk and events).** Are risk ceilings, realistic costs and dip-and-recovery capture robust; which ETFs and event
  families drive any finding; are some windows too sparse to judge?

## 2. Invariants

1. The D1 mechanism, its eight parameters, box and grid (tenths of a percentage point; sessions; calendar days),
   fills, stops, buffer, holding, continuation, warm-up, splits, calendar and interest are the existing engine's and
   are unchanged. No momentum entry, no exit change, no leverage beyond the margin model, no allocator change.
2. Standalone only: each ETF alone in one fixed $100,000 borrowed slot, one lot at a time, never compounded; 11%
   simple interest from the entry session's midnight (365-day); 5 bps per side modelled friction (not a commission);
   accounting from the 2016-01-04 close; books arm on 2017-06-15. No pooled phenotype, no preemption, no joint
   optimization, no ETF combination chosen by overlap.
3. Read-only: `config/` (pools B4/B5, phenotypes, market events), `data/`, every earlier `research/` study and the
   prospective B4/B5 freeze and its code closure. The only file changed outside this study's two folders is
   `package.json` (one script). The earlier studies' verifiers are run before and after (§12).
4. No new phenotype is promoted or registered; every candidate here is **research-only**, stored in this study's
   namespace with its exact grid and provenance.
5. No download, network, broker, credential (`.env`) or account action.

## 3. Data, universe, folds and doors

### 3.1 Data and universe

Canonical `data/<SYMBOL>/data.csv` (raw SIP minute bars, splits forward-adjusted from
`config/market-events/splits.json`), the training partition (2016-01-01 → 2023-12-31) only. Baseline hashes in
`results/baseline/` (identical, file for file, to the standalone audit's). Universe: the source study's audited 61
eligible ETFs (`research/d1-ranked-preemption/results/audit/universe.json`; GDXJ and OIH late, XLRE excluded); every
loaded file must hash to that audit. Regular session only (the engine's).

### 3.2 Folds

| Fold | Role | Training (search, libraries, training-only selection) | Evaluation window (incremental) | Pools |
|---|---|---|---|---|
| **A** | primary | 2016-01-04 → **2020-06-30** | 2020-07-01 → **2021-12-31** | ARCH (source fold-a), NEW, NEW-S, ALL |
| **B** | primary | 2016-01-04 → **2021-12-31** | 2022-01-03 → **2023-12-29** | ARCH (source fold-b), NEW, NEW-S, ALL |
| S18 | supplementary | → 2018-12-31 | 2019-01-02 → 2019-12-31 | NEW |
| S19 | supplementary | → 2019-12-31 | 2020-01-02 → 2020-12-31 | NEW |
| S20 | supplementary | → 2020-12-31 | 2021-01-04 → 2021-12-31 | NEW |
| S21 | supplementary (derived) | fold B's NEW pool (→ 2021-12-31) | 2022-01-03 → 2022-12-30 | NEW (no extra search) |
| S22 | supplementary | → 2022-12-30 | 2023-01-03 → 2023-12-29 | NEW |

The supplementary folds form a **rolling one-year track** (2019 … 2023) with expanding training; their windows
overlap the primary windows and each other's training and are never counted as independent replications. S18 has
only 1.55 armed training years; a window with too few events is reported as insufficient evidence (§9.4), never as a
failed model. The final source window (training → 2023-12-29) is **not a fold**: its archive is only reconstructed on
its own training span for the census (§4); no final-window vector is evaluated on any window or used to assert any
earlier fold's out-of-sample behaviour.

### 3.3 Nested triples (§8)

| Triple | Training | Intermediate selection window | Later assessment window | Pools | Role |
|---|---|---|---|---|---|
| **T1** | fold A (→ 2020-06-30) | 2020-07-01 → 2021-12-31 | 2022-01-03 → 2023-12-29 | NEW, NEW-S | primary nested |
| **T2** | fold B (→ 2021-12-31) | 2022-01-03 → 2022-12-30 | 2023-01-03 → 2023-12-29 | ARCH, NEW, NEW-S, ALL | secondary; its later window overlaps T1's |

**T1 cannot use archived fold-a vectors:** the source study's door allows its fold-a vectors only through 2021-12-31,
and that restriction is respected, not relabelled or evaded. T1 therefore uses only this study's newly generated,
independent fold-A candidates (NEW, NEW-S), which this protocol authorizes through 2023-12-29. T2's later window ends
2023-12-29, inside the source's fold-b door, so archived fold-b vectors are legal there.

### 3.4 Doors (`src/d1-wide-library-selection/doors.ts`; each refuses before a byte is read)

- `trainingUniverse(fold)`: partition `training`, access `optimization`, through the fold's cutoff; the loaded last
  date must equal the cutoff; every file hash equals the audit; every symbol's loaded bars are hashed into the stage
  record. For folds A and B the loaded-bars hashes must equal the source's own Stage A door records.
- `evaluationUniverse(fold, end)`: never after 2023-12-29; nothing after the fold's cutoff unless the fold's sealed
  `results/libraries/<fold>/SELECTION.json` verifies; nothing after a triple's selection end unless that triple's
  sealed `results/nested/<T>/SELECTION.json` verifies; nothing after the fold's evaluation end except a triple's later
  window.
- `sourceCap(window, end)`: an archived vector is evaluated at most through its own door (fold-a 2021-12-31, fold-b
  2023-12-29); a final-window vector is never evaluated. Every evaluation request checks each candidate's provenance.
- Incumbent anchors use the source's own inspection door and the standalone audit's full-history door, unchanged.

## 4. Arm ARCHIVE — the source archives and the discarded-candidate audit

1. **Inventory** (`results/archive/INVENTORY.json`): rows, fields, Sobol/local counts per ETF and window, and the
   verification of every sealed file hash. The archives store only grid, origin, trades, net, best, minute DD, J_s,
   credible, R1, R2 — no trades, interest, friction, daily DD, worst trade or trade signature.
2. **Reconstruction** (fold-a, fold-b, final): every archived row is re-evaluated through the source's own evaluator on
   its own training window (5 bps, 11%); the nine stored fields must equal the recomputation to the cent (a single
   mismatch stops the window). Each credible row gets its trade path. The archive is a biased sample: its local search
   refined only the top 4 starts by J_s, so its densest regions are the old optimum's neighbourhood (it is never
   called unbiased).
3. **A0 reproduction:** the source's narrow rule re-applied to the reconstructed archive with the source's own 16
   neighbourhood draws must reproduce, for every ETF, the sealed representative, library, checked set (with its J_nb
   values), evaluated count and credible count. fold-a: 61/61 (pre-freeze). If fold-b or final does not reproduce,
   A0 remains the sealed records and the difference is reported.
4. **Census and discarded audit (training only):** credible counts, unique trade paths, bounded-diameter families
   (§6.2), the trigger statistics (§5.1), the old penalty's impact (the representative family's rank by T; whether the
   T-best family is the representative's) and, per ETF, why candidates never reached the old library: non-positive
   net; drawdown above $35,000; too few trades; credible but outside the top 32 by J_s; inside the top 32 but a
   near-duplicate (entry-session Jaccard < 0.5); distinct but beyond the cap of 4; and **best-trade-penalty
   displacement** — a family among the top 4 by T none of whose members reached the top 32 by J_s.

## 5. Arm NEW-SEARCH

### 5.1 Feasibility triggers (training-only; frozen here, evaluated by code)

- **T-a:** fewer than 12 credible families in more than 20% of ETFs.
- **T-b:** in more than 20% of ETFs, one family holds at least half of the top 32 credible vectors by J_s.
- **T-c (legal):** T1 needs fold-A candidates evaluable in 2022–2023; archived fold-a vectors are barred there.
- **T-d (objective):** the archive's refinement stage was steered by J_s (structural), so a controlled fresh search
  is needed to test whether the old objective suppressed the right tail.

The new search runs if any trigger holds. T-c and T-d hold by construction, so it runs in every fold; T-a and T-b
are computed and reported (fold-a, pre-freeze: T-a 18% — not raised; T-b 93% — raised).

### 5.2 Procedure and budget (per ETF and fold; training bars only)

1. **Sobol:** the first 1,024 unique grid vectors of the ETF's scrambled Sobol stream with this study's label
   (`sobolVectors(symbol, 1024, 'd1-wide-library-v1:new-search')`, the source's quantization and box; the same design in
   every fold, so folds are paired). A vector equal to any archived vector of that ETF in any source window is dropped
   before evaluation and counted (never replaced).
2. **Refinement starts** from distinct credible Sobol families by quota: 4 by T (the family's highest-T member), 2
   by space-filling support (the family's medoid; families ordered by size), 2 by the lowest minute drawdown (the
   family's lowest-DD member); an unfilled quota is filled from the T order.
3. **Refinement:** per start 2 rounds of 8 moves (6 single-coordinate moves of ±1..3 step units, 2 joint ±1-unit
   moves; the source's operators; seed `Rng.from('d1-wide-library-v1', 'refine', fold, symbol, start, round)`), moving
   to the best credible move whose T is strictly higher. **At most 128 refinement evaluations per ETF and fold**; a
   duplicate or archived vector is redrawn up to 20 times, then skipped and counted.
4. Objective **T = net − max(0, minute DD − $20,000) − max(0, −worst lot − $10,000)** — no best-trade deduction.
5. Every evaluation reads training bars only; no validation figure exists when the search runs; the budget is a count
   (≤ 1,152 per ETF and fold; ≤ 421,632 for 61 ETFs × 6 folds) and never depends on any outcome.
6. Pools: **NEW** = Sobol + refinements; **NEW-S** = Sobol only (the refinement ablation); **ALL** = ARCH ∪ NEW
   (folds A and B). ARCH ∩ NEW = ∅ by the collision rule. The extra multiple testing of NEW and ALL is part of the
   interpretation (§10).

## 6. Libraries and families

### 6.1 Credibility (identical for every arm; the source's rule)

A training vector is **credible** iff trades ≥ max(4, ⌈eligible years⌉) (fold A 4, B 5, S18 4, S19 4, S20 4, S22 6),
minute DD ≤ $35,000 and net > 0 (5 bps, 11%, a lot open at the cutoff at its liquidation value).

### 6.2 Trade-path families (bounded diameter; no single-linkage chaining)

Path distance d(a, b) = max(1 − Jaccard(held sessions), 1 − Dice(entry sessions matched within ±3 sessions)), held
sessions being every session from an entry through its exit (or the cutoff). Families: visit the credible vectors by
training net (descending, then grid key); each joins the first family (creation order) whose **every** member is
within d ≤ 0.5, else starts a new one. Every pair inside a family is within 0.5 by construction (complete linkage).
Near-identical paths count once however many numeric vectors produce them. A family's **support** is its number of
space-filling (Sobol) members. Descriptors: size, support, entries' calendar years, the eligible training catalog
families entered (the standalone audit's price-only catalog on training closes through the cutoff).

### 6.3 Library sizes

K ∈ {8, 16, 32, 64}, analysed for every arm, pool and fold; each library is the top K families of the arm's order (so
every smaller K is a prefix of the larger). Realized K per ETF is reported (an ETF with fewer families has a smaller
library; no near-duplicate is ever added to fill a quota). **K = 16 is the primary design point**; the decision rule
(§9) requires consistency across the four values, so no K is chosen after reading results.

## 7. Arms (training-only selection unless stated)

Each arm nominates **at most one vector per ETF** or none.

- **A0 — original narrow baseline (sealed).** Folds A and B, ARCH: the source's sealed representative and library
  (`research/d1-ranked-preemption/standalone/<window>/`). Nominee = the representative iff its sealed status is
  survivor (J_nb > 0 and J_s > 0); else none. It cannot nominate a NEW vector or any vector in T1.
- **A0r — the narrow rule on any pool.** Top 8 credible vectors by J_s with distinct trade signatures; 16 source
  neighbourhood draws each (stage `standalone:fold-a` / `standalone:fold-b`; `d1-wide-library:<fold>` for S folds);
  J_nb = median J_s of the draws; representative = the highest J_nb (ties J_s, grid key); nominee iff J_nb > 0 and
  J_s > 0; library = the representative and, from the top 32 by J_s, each vector at entry-session Jaccard distance
  ≥ 0.5 from all chosen, at most 4. On ARCH it equals A0 (verified per ETF). **A0r on the same pool is the baseline of
  every comparison.**
- **A1(K) — broad library, original scoring.** Families ordered by their highest-J_s member's J_s; library = the top
  K; nominee = the highest J_nb (the same 16 draws) among library members, iff J_nb > 0 and J_s > 0 (ties J_s, key).
- **A2(K) — broad library, D1-tail-compatible scoring.** Families ordered by their highest-T member's T; library =
  the top K; nominee = the highest **T_nb** (median T over the same 16 draws) among members whose entries fall in ≥ 2
  calendar years of the training window, iff T_nb > 0 (ties: net per occupied day, then key). The largest winning
  trade is never subtracted; the drawdown and the worst single loss are penalised in dollars; capital efficiency
  enters through the 11% interest inside net and the first tie-break; the neighbourhood median prevents rewarding an
  exact historical peak.
- **A3(K) — broad library, explicit neighbourhood risk.** Families ordered by support (descending; ties: the medoid's
  worst lot, then key), each represented by its **medoid**; library = the top K; each member gets 48 draws (N1 0..31
  and N1A2 0..15, the same instrument); nominee = among members with ≥ 75% of draws net-positive, ≥ 75% of draws with
  minute DD ≤ $35,000, a worst training lot ≥ −$15,000 and entries in ≥ 2 eligible training catalog families, the
  highest **P25 of the 48 draw nets**, iff P25 > 0 (ties: the draws' median net, then key). A3 differs from A2 in
  every component (support-ordered library, behaviour-central members, hard neighbourhood feasibility filters,
  a lower-quantile criterion).
- **A4(K) — validation selector (nested only, §8).** Library = the A2(K) library of the pool; nominee = the member with
  the largest selection-window increment V_sel (5 bps) among members with ≥ 1 lot entered in the selection window and
  selection-window minute DD ≤ $35,000, iff V_sel > 0 (ties: T_nb, key). It is assessed only on the later window.

**Across-ETF selection** (an extra multiple-testing layer): each arm advances the **top 5 ETFs** by its own nominee
score (A0/A0r/A1: J_nb; A2: T_nb; A3: P25; A4: V_sel), or fewer if it has fewer nominees; each advanced ETF runs in
its own $100,000 slot (separate standalone accounts, never a pool). Every arm also reports all its nominees.

## 8. Chronological evaluation and the nested design

### 8.1 Evaluation runs

Every evaluated vector runs **once, continuously, from 2016-01-04** to the window end (state, open lots, stops and
continuation windows carried across every boundary). For a window (b, e]: **V = liquidation-equivalent mark at e's
close − the same at b's close** (a lot open at either end at its liquidation value: exit friction and interest to that
session). Windowed minute and daily drawdowns restart at b's mark. Lots entered after b are counted; lots open at b are
reported. **Boundary parity (fail closed):** each vector's mark at the cutoff close must equal its sealed training net
(to the cent); training profit is never double counted and an open lot never disappears or is repriced.

- **Fast path (all library members):** the source's windowed single-book replay at 5 bps.
- **Full engine (every nominee of every arm, K and pool; A4 picks; references):** at 0/2/5/10 bps — re-simulated, so a
  cost change can change stops and continuation eligibility — with the readable ledger (entry/exit ET, prices,
  reason, gross, interest, friction, net, cumulative net, MAE/MFE, holding days, episode). The engine's V at every
  cost must equal the fast path's to the cent (fail closed). The 20% portfolio overlay (5 bps) for every nominee:
  $300,000 at 60% VOOG / 40% VGT, 20% of marked equity per lot, the frozen dividend convention; the window's equity
  increment over C0's and its maximum daily % drawdown after b (preferred ≤ 30%, conditional ceiling 35%).

### 8.2 Order of execution (each stage write-once; each door refuses the next window until the previous record is sealed)

1. Protocol freeze → fold-b and final archive reconstruction and census → NEW search (A, B, S18, S19, S20, S22) →
   engine-versus-fast parity sample on training windows → libraries and training-only selections for every fold and
   pool, sealed (`results/libraries/<fold>/SELECTION.json`) → code freeze of the evaluation and analysis code.
2. Fold A evaluation (→ 2021-12-31) = T1's selection window → **T1 nested selection sealed**.
3. Fold B selection-window evaluation (→ 2022-12-30) = T2's selection window and S21 → **T2 nested selection sealed**.
4. Fold B full evaluation (→ 2023-12-29; windows (2021-12-31, 2023-12-29] and (2022-12-30, 2023-12-29]) = fold B and
   T2's later window; T1's later evaluation (NEW and NEW-S fold-A candidates only, (2021-12-31, 2023-12-29]).
5. Supplementary folds S18, S19, S20, S22.
6. Event attribution, neighbourhood capture diagnostics, analysis and verdicts, reports.

### 8.3 Nested selection

A4's choice uses only the selection window's figures of the frozen library; the chosen vector is unchanged in the
later window; the later window is never used to choose anything. Reported: the price of selection (selection V versus
later V of the picks), the later V of every library member (random-pick expectation), the rank correlation between
selection and later V across members, picks resting on a single selection-window lot (thin evidence), and the
across-ETF A4 top 5. A nested result judged on its own selection window is never called validation.

## 9. Metrics and the predeclared decision rules

### 9.1 Reported per (fold or triple, pool, arm, K)

Library: realized K, families, credible, the share of A0's library families inside the arm's library, discarded
families. Nominees: ETFs with a nominee, lots in the window, ETFs with any window lot. P&L: Σ and mean V over the 61
ETFs (an ETF without a nominee contributes 0 — an idle slot), median, quantiles across ETFs; at 0/2/5/10 bps; windowed
minute and daily DD; breaches (> $35,000); worst window lot and MAE; an expected-shortfall proxy (the mean of the
worst 10% of window lot nets pooled across the arm's nominees); interest and friction in the window; lot-days; net per
$1M borrowing dollar-days. Events: the window's catalog episodes and families (trough inside the window), dip-captured
share (a dip entry — decline phase or ≥ 50% of depth below the peak — with attributed net > 0), major-family capture,
independent events (anchors ≥ 252 sessions apart), continuation trades high in the rebound, falling-knife losses.
Top-1/3/5 profit concentration is descriptive only and never a penalty.

### 9.2 Paired comparison of an arm with A0r on the same pool (one fold or triple, one K)

Per ETF i: ΔV_i = V_arm,i − V_A0r,i (5 bps and 10 bps). Over the 61 ETFs: mean ΔV (5, 10), W = #(ΔV > 0), L = #(ΔV <
0), I = identical nominees; per exposure cluster c (the audit's 15 predeclared clusters) ΔV_c = Σ_{i∈c} ΔV_i, CW, CL;
B = nominees whose windowed minute DD > $35,000.

- **favourable** ⇔ mean ΔV(5) > 0 ∧ mean ΔV(10) > 0 ∧ W > L ∧ CW > CL ∧ B_arm ≤ B_A0r + 1;
- **unfavourable** ⇔ mean ΔV(5) < 0 ∧ W < L;
- **risk-incompatible** ⇔ B_arm ≥ B_A0r + 3;
- **insufficient evidence** ⇔ fewer than 10 ETFs have V ≠ 0 for the arm or A0r (the comparison is then not counted).

### 9.3 Verdicts per (pool, arm) over the primary folds A and B

- **improves generalization**: favourable in both folds at K = 16 **and** in both folds for ≥ 3 of the 4 K values,
  and risk-incompatible in neither fold at any K;
- **demonstrably worse or risk-incompatible**: (unfavourable in both folds at K = 16 and for ≥ 3 of 4 K) or
  risk-incompatible in either fold at K = 16;
- **no evidence of improvement**: favourable in neither fold at K = 16 (and not worse);
- **mixed / inconclusive**: otherwise.

**Across-ETF verdict** per (pool, arm): Δ = Σ V(arm's top 5) − Σ V(A0r's top 5); "improves" iff Δ > 0 at 5 and 10 bps
in both folds at K = 16 and in both folds for ≥ 3 of 4 K; "worse" iff Δ < 0 at 5 bps in both folds at K = 16 and for
≥ 3 of 4 K; otherwise mixed.

**Nested verdict** (T1 primary; T2 secondary, same rule, not an independent replication): A4(K) is compared, on the
later window, with A2(K) (same library, training-only choice) and with A0r; "validation selection retains an
advantage" iff favourable against both at K = 16 and for ≥ 3 of 4 K; "worse" iff unfavourable against both at K = 16
and for ≥ 3 of 4 K; otherwise mixed or no evidence.

**Rolling track** (NEW pool, K = 16, vs A0r(NEW)): favourable / unfavourable / insufficient per year 2019 … 2023.

### 9.4 Study-level outcome (exactly one)

1. **Evidence for an improved selection procedure** iff some arm is "improves" on **ARCH** (the like-for-like
   candidate set) and the same arm is not "worse" on NEW or ALL and is favourable in ≥ 3 of the 5 rolling years.
2. **New procedure is materially worse** iff every one of A1, A2, A3 is "worse" on ARCH.
3. **Mixed / inconclusive** iff neither 1 nor 2 and some arm is favourable at K = 16 in both primary folds on some pool,
   or some arm is "improves" on a pool other than ARCH.
4. **No demonstrated improvement** otherwise.

Grounds for declining nomination are always reported (no credible vector; J_nb, T_nb or P25 ≤ 0; filters failed).
None of these outcomes nominates a production configuration.

## 10. Multiplicity, sample size and leakage controls

- Degrees of freedom are counted and reported: 3 broad arms × 4 K × 4 pools × 2 primary folds of comparisons with
  A0r; A4 × 4 K × 2 (T1) + 4 × 4 (T2); 5 rolling years; 6 cost-scenario figures per nominee; the across-ETF top 5
  among 61. The verdict rules require consistency across K and folds; a single favourable cell is never a finding.
- ETFs, years and episodes share one market history and are not independent; no p-value, bootstrap, PBO or deflated
  Sharpe is computed; cluster-level counts are reported beside ETF counts.
- Tests (§12): post-cutoff mutation leaves training archives, candidate ids, rankings and selection records
  byte-identical; door refusals; boundary-state accounting; deterministic, K-nested and family-deduplicated
  libraries; the bounded search's counts; stop/interest accounting; forbidden reads.

## 11. Records, freeze and amendments

- `PROTOCOL_FREEZE.json` binds this file, `LIBRARY_SELECTION_RULES.md`, `EXPERIMENT_MATRIX.json`, the brief,
  `context.ts` and every outcome-defining source file existing at the freeze, the pre-freeze records (inventory,
  fold-a reconstruction and census, anchors) and the methodology review with its dispositions.
- `results/CODE_FREEZE.json` (before the first evaluation) binds the evaluation, nested and analysis code; every
  evaluation and analysis stage verifies both freezes, Node v24.21.0 and the absence of test overrides.
- Every stage record is write-once with a body hash; a sealed stage is never rerun; an interrupted unsealed stage is
  rerun whole with the same configuration and seeds and labelled.
- Amendments (`results/amendments.jsonl`): technical or reporting corrections only, each with a reason and the files
  it changes; never a K, weight, threshold, window, rule or budget change after any evaluation outcome. A change after
  outcomes that could affect them is a separately labelled exploratory analysis, never confirmatory.

## 12. Verification and delivery

Before and after: `npm run pools -- verify`, `npm run pools -- forward status`, `npm run vgt-robustness -- verify`,
the ranked-preemption and standalone-audit verifiers at their own commits, and the baseline hash manifests. The
study's `verify` re-checks every freeze, sealed record, hash and parity identity. `npm test`, `tsc --noEmit` and
`eslint` on the new code. An independent read-only methodology review precedes the freeze; an independent
implementation and results audit precedes completion; findings and dispositions are published verbatim. The branch
`research/d1-wide-library-chronological-selection` is committed and pushed to `origin` at the end (no PR, merge,
force-push or tag).

## 13. What would come next (not authorized here)

A genuinely independent test needs bars after 2026-10-13 (none exist locally) or a separately authorized decision to
open 2024-01-02 → 2026-10-13 for newly generated candidates under its own protocol. Neither is done here. Study 2
(all-61 signal timing and occupancy complementarity) and Study 3 (an independent momentum-entry strategy) are later,
separate assignments.

## 14. Amendments

(none)
