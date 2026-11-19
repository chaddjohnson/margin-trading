# Protocol — New L0 shadow-position entry eligibility: implementation, fixed-parameter comparison and four optimization tracks (A1, A2, B1, B2)

Research only. Nothing here replaces New L0, deploys a strategy or changes live trading; a candidate can be **nominated**
for the user's decision, never adopted by this study. Calendar-day maximum holds stay the default throughout. Reports are
written analysis, Markdown tables and machine-readable results only (standard §7.7).

- **Study:** `research/vg-l0-shadow-eligibility/`; code `src/vg-l0-shadow-eligibility/`; `npm run vg-l0se -- <command>`
  from the repository root.
- **Brief:** `brief/BRIEF.md` (the user's "New L0 Shadow-Position Eligibility: Implementation and Comprehensive
  Optimization", 831 lines, sha256 `3547d5efee0e92f26977231b6425e869859369ec367efcb70ecf05d3f51e8ed3`, read in full to its
  final section "Overall Objective").
- **Branch:** `research/vg-l0-shadow-eligibility` (main checkout), created from `6eb85160` — NL0 1.0.0 and standard 2.1.0
  committed, **before** the trading-session study's experimental engine change `e3b0ae37` — plus the documentation-only
  `main` (`2346a1b5`). Every historical engine file therefore keeps its original executable identity here (Priority 3's
  evaluation digest = its sealed `147cad7c…`, checked by stage V and the freeze).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.1.0`, sha256 `ac5c2c69987faa8d2b0dba7dfd452e278658167fa172ab210a8a2e8de7696f9b` (the registered current version) |
| Read / adopted (UTC) | read in full 2026-11-12T11:30Z; adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-l0-shadow-eligibility`; every stage, the pilot included, calls `requireStandardAdoption` in code) |
| Scope | `optimization` |
| Reference method (§4.8) | `docs/research/methods/NEW_L0_METHOD.md`, id `NL0`, version `1.0.0`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` (`referenceMethod` in the manifest; checked by the preflight; recorded in the freeze) |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5, §3.2 | adaptation | NL0's primary rule, applied twice: each **track's primary** = the actual-profit role of its own qualified C24 members; the study's **nominee** = the actual-profit role of the **final selectable set** (every track's qualified C24 members + New L0 under all eight toggle combinations, C4, C4-refined, C85: the qualifying-incumbent fallback; an unchanged incumbent is a valid outcome). Every role is kept. | — (NL0 §3.5; brief Phase 5.3 "Preserve the original NL0 selection methodology"; "No automatic replacement") |
| AD2 | §4.1, §3.4 | adaptation | Architecture A only (one exclusive funded slot), lifecycle L0, the frozen same-instant order D1 first, then GDX before VGT; the shadow-eligibility tie rules (§5.2) are fixed before any search; no priority or allocation search. | — (brief §1.6 "Do not let the optimizer change priority rules") |
| AD3 | §4.1, §4.8 | adaptation | Fixed structure **V** (D1·GDX + D1·VGT + Growth·VGT; Growth·GDX OFF) as in the trading-session study: 5B's structure cells are omitted and their budgets reassigned through their own schedules to three sub-cells per replicate (V1 = 5B's V schedule, V2 = G's, V3 = B's). The sequential tracks' first step uses the **D** structure (the D1 pair alone; both Growth books disabled), a new inclusion level; their second step V with the D1 books pinned. | — (brief "Keep the active combination limited to VGT D1, GDX D1, and VGT Growth"; Phase 3.3, 3.5) |
| AD4 | §4.7 | adaptation | 5B's both-Growth protections cannot apply (no B structure): its promotion shares and shortlist slot fall through; its protected island is ordinary; its both-Growth refinement start (V3, informed lanes) becomes a second profit start `profit-2` (as the trading-session study). Participation is reported (§2.9). | — |
| AD5 | §4.2, §4.8 | adaptation | **Effort by replicates** of NL0's unchanged per-lane schedules (§8): B1 32 replicates × 3 sub-cells per cutoff (configured base 131,072 proposals per cutoff = 3B's); B2 16 (step d1) + 2 × 8 (step g, one block per D1 finalist) replicates × 3 sub-cells; A1 28 informed replicates; A2 14 (d1) + 2 × 7 (g). Job caps scale NL0's per-lane contract (415,000 per 18 independent lanes; 370,000 per 6 informed lanes). | — (brief Phase 4.2 "substantial … independent … fairly matched budgets"; "at least the original Priority 3B-scale broad-search effort") |
| AD6 | §4.5 | adaptation | Extension per lane (its own position); NL0's triggers (5%), island caps (6 / 6 / 12 independent, 8 informed) and resource guard (finishing reserve 8,000 per independent lane, 30,000 per informed lane, the job cap). | — |
| AD7 | §3.3, §1.9, §4.4 | adaptation | Informed seeds (§4.2): A1 = the trading-session study's seed set (5B's V seeds; its B seeds projected to V; New L0 as a focus seed), every toggle OFF; A2 step d1 = their 5 distinct D1 pairs (focus: VG #2's pair and New L0's); A2 step g = their 7 distinct Growth·VGT vectors on each frozen D1 finalist (focus: #4, C4-refined's, New L0's). Each seed is also evaluated under every combination of its lane's free toggles; its near, broad and focus designs take the combinations round-robin. Provenance: informed. | — (brief Phase 3.2, 3.3) |
| AD8 | §2.3, §4.3 | adaptation | **The toggles are structural parameters** (three categorical genes, §6): protected equal coverage of every combination in every screen (the fastest-varying stratum index), every informed seed under every combination; varied by the islands' categorical operators; one refinement move per free toggle (switched); fixed in numeric neighbourhoods (standard §5.3 categorical rule). In a D lane the disabled Growth books' genes are pinned (inert). | — (brief Phase 4.3, 1.5) |
| AD9 | §1.8, §3.3 | **departure** | As in NL0 (5B AD9): the earlier-cutoff repetition covers the **fresh** tracks (B1, B2) only; the informed tracks (A1, A2: seeds chosen with data through 2024, New L0 among them) run at C24 only and make no chronological claim. | Brief Phase 5.1 "Use chronological development folds within training according to the established methodology" and Phase 3.1 "Preserve the original methodology wherever applicable" (NL0 §3.6 records 5B's agreed departure AD9) |
| AD10 | §5.3 | adaptation | NL0's qualification evidence per member: centre, selection 2 × 128, fresh confirmation 3 × 128, the frozen stresses and the causal removals, common random numbers across every member of a cutoff (the track never enters a draw label). | — |
| AD11 | §1.4 | adaptation (stricter) | As NL0: FULL is never opened before `FROZEN_SELECTION.json` is sealed and committed, not even for New L0's known full-history figures: New L0's development figures reproduce exactly before any experiment (stage V); its full-history figures are verified now from the sealed artifacts (§2) and reproduced through this study's engine as the validation's first check. | — (brief Phase 5.1 "Preserve validation access restrictions until the optimization procedures and finalists have been frozen") |
| AD12 | §3.4 | adaptation | The method comparisons the brief commissions — joint vs sequential (A1 vs A2, B1 vs B2) and informed vs fresh (A1 vs B1, A2 vs B2) — with matched replicate-scaled budgets and identical gates; a method claim needs matched budgets and repeated, chronologically separated evidence: only B1 vs B2 has it (four cutoffs, two sequential paths); the informed comparisons are single-cutoff and labelled so. | — (brief Phase 3, 6.2) |

## 1. Question, objective and outcomes

- **Question.** Can allocator-level **shadow-position entry eligibility** make New L0's VGT D1 + GDX D1 + VGT Growth
  shared-capital portfolio materially better — and if so, from which toggles, by which optimization architecture (joint vs
  sequential) and starting point (incumbent-informed vs from scratch), and why?
- **Objective (§2.2).** Development net profit (realized + marked, after costs and interest) under the $35,000 maximum
  minute drawdown ceiling on the fixed $100,000 principal budget, with neighbourhood robustness, chronological evidence
  and capital-use diagnostics beside it.
- **Outcomes.** (1) the implementation and its verification; (2) the fixed-parameter comparison of the eight toggle
  combinations on New L0 (§9.0); (3) four optimization tracks, each with a frozen primary and roles; (4) the study's
  nominee under the frozen rule (AD1) — possibly New L0 itself; (5) frozen comparison labels (§11.1); (6) the one-time
  validation on previously examined history; (7) the recorded next decision (brief Phase 8), not taken.

## 2. Prior knowledge and provenance

- **New L0** (NL0 §1): Priority 5B `C24/L0/informed/R1#1 profit`, cfg `67cfdd9b62d1e16f`, Priority 3 quad
  `a2e385640ca61012`; D1·VGT [237,9,73,15,72,42,103,41], D1·GDX [277,1,61,13,232,25,152,10], Growth·VGT `6b5f909b30cfa516`;
  development $382,721.46 / DD $19,459.83 (34 lots); validation (examined) $96,883.72 / reset DD $20,385.99; full history
  $479,605.18 / DD $20,385.99, realized $485,169.93, unrealized −$5,564.76. Verified from three sealed artifacts: 5B
  `results/validation/validation.json` (`83931139…`, row R01), the trading-session study's `results/validation/validation.json`
  (`f474c421…`, A row) and Strategy Lab's parity (`docs/strategy-lab/reports/2026-11-11-pooled-candidates/parity.json`,
  `59424ff9…`; FULL data VGT `2ee06310…`, GDX `77dba9b2…`).
- **Earlier eligibility evidence.** Priority 1 (VG #2 D1 entry eligibility with an age and extension limit): no useful
  benefit; the cost came from capital displacement, not the delayed trade. Priority 5A/5B (Growth lifecycles L1/L2): L2's
  one retained refusal helped one combination and hurt others; L0 kept. This study's rule differs (no expiry or price
  guard; the hypothetical trade's own lifetime; all three books; a fresh independent position).
- **Engineering exposure (disclosed).** While building the engine (before this protocol), New L0's eight toggle
  combinations were each run once on D24 (centres only, a smoke test): every combination with a D1 toggle ON earned far
  less than all-OFF (e.g. D1·VGT ON $267,557.86 vs $382,721.46) and Growth·VGT alone changed nothing. These are
  development figures; they shaped no frozen choice: every search gives every combination the same protected coverage,
  and the fixed-parameter stage (§9.0) runs after the freeze and removes nothing.
- **Validation history.** 2025-01-02 → 2026-10-30 was examined by Priorities 3–8 and Strategy Lab; New L0's own result
  was known. Validation here is "validation on previously examined history, not an untouched holdout" (§1.6).
- **Lineage.** The informed seeds carry the lineage of NL0 §1.2 (3B's informed-joint lane, 5B's informed lane); that
  lineage effort is not re-executed.

## 3. Data, doors and windows

- Canonical minute data `data/VGT/data.csv` (`2ee06310…412e`) and `data/GDX/data.csv` (`77dba9b2…5049`), Priority 3's
  pins and split handling; doors D19, D21, D23, D24 (byte prefixes through 2019-12-31, 2021-12-31, 2023-12-29,
  2024-12-31; size, sha256 and last row verified before parsing) and FULL (2016-01-04 → 2026-10-30, the common complete
  endpoint) behind this study's guard (`FROZEN_SELECTION.json` sealed, committed, unchanged) and Priority 3's own guard.
- Development 2016-01-04 → 2024-12-31 for every choice; validation 2025-01-02 → 2026-10-30 for frozen selections only;
  every opening logged in `results/doors.jsonl`.
- Folds (fresh tracks): C19 → slice 2020–2021 (door D21), C21 → 2022–2023 (D23), C23 → 2024 (D24); C24 → FULL once.

## 4. Controls, seeds and configurations

### 4.1 Exact controls (`CONTROL_MANIFEST.json`, sealed before the freeze)

| Key | Definition | Selectable |
|---|---|---|
| NL0 | New L0, every toggle OFF (**A**, the historical control) | yes |
| NL0/sh⟨bits⟩ | New L0's frozen parameters with the toggles ⟨bits⟩ (D1·GDX, D1·VGT, Growth·VGT): the seven fixed-parameter variants **F(⟨bits⟩)** | yes |
| C4, C4R, C85 | 5B's controls (VG #2 + #4; VG #2 + C4-refined's Growth; VG #2 + 08500a60), toggles OFF | yes |
| IJ1 | 3B `informed-joint#1 profit` (New L0's lineage seed), toggles OFF | report-only |
| D | VG #2 Balanced's D1 pair alone (structure D) | report-only |

Every vector is read from sha256-pinned sealed records (5B's frozen selection and 5B's verified loader); identities are
checked in code (New L0 `67cfdd9b62d1e16f` with toggles OFF).

### 4.2 The informed seeds (`controls.ts`)

| Track / step | Seeds | Focus seeds |
|---|---|---|
| A1 (V) | C4, C4R, C85, IJ1, IJ3→V, IP→V, NL0 (the trading-session study's set) | C4, C4R, NL0 |
| A2 step d1 (D) | the 5 distinct D1 pairs of the A1 seeds: VG #2's (C4 = C4R = C85), IJ1's, IJ3's, IP's, NL0's | VG #2's, NL0's |
| A2 step g (V, D1 pinned to a finalist) | the 7 distinct Growth·VGT vectors of the A1 seeds on the finalist's D1 books and D1 toggles | #4 (C4), C4R's, NL0's |

Every seed is evaluated under every combination of its lane's free toggles (A1 8, d1 4, g 2); designs (near 12 at 1.5×,
broad 12 at 3×, focus 64 at 0.5× and 64 at 1.0×) take the combinations round-robin.

### 4.3 The comparisons (§11)

A = New L0 all OFF; F(sh) = New L0 with toggles sh; P(T) = track T's primary; the nominee; the architecture pairs (A1 vs
A2, B1 vs B2) and the starting-point pairs (A1 vs B1, A2 vs B2).

## 5. Engine, conventions and shadow-position eligibility

### 5.1 Fixed (NL0 §1.1)

Priority 3's canonical virtual books (D1 ShadowBook; Growth 1.4.0) and pool conventions: one exclusive $100,000 slot; a
decision funded only at its own instant iff nothing is open or reserved; a grant reserves the slot until its fill; a
retained Growth remainder keeps the slot; no compounding, preemption or simultaneous funded positions; same-instant order
D1 first, then GDX before VGT; 5 bps per side inside the fill prices; 11% simple interest by calendar day; stops at the
stop or the gapped open; fractional shares; harmonized D1 arming; lifecycle L0 (a refusal never feeds back into a book);
**calendar-day maximum holds** (no other unit exists on this branch).

### 5.2 The eligibility rules (`allocator.ts`; frozen before any search)

1. **Episode start.** A virtual decision of a book whose toggle is ON, refused at its own instant with reason "slot
   occupied" (the slot held by a lot or reserved by an order — of another book, or the book's own delayed lot/order),
   opens an eligibility **episode**. Each book has at most one live episode (a book decides only after its virtual trade
   has exited; a second refusal while the first hypothetical trade is open is asserted impossible).
2. **The shadow position** is the book's own virtual trade, which continues under its canonical rules (L0): its
   hypothetical entry, exits and net are the book's; it never reserves capital and never preempts a funded position.
3. **Eligibility window** = [the refused decision's time, the hypothetical trade's final exit time). It ends at that
   final virtual exit, when it is consumed by a delayed real entry, or at the door's end. No expiry interval, no price
   guard, no re-check of the entry predicates: the open hypothetical position is the eligibility. A never-filled
   hypothetical order stays eligible to the door's end; a partial (retention) exit does not end it.
4. **Release.** The final exit fill of the funded lot at bar k of session s (its symbol) releases the slot; the release is
   known at the end of that minute: the release check instant **D** = the bar's start + 60 s, or the session's close for a
   closing-print exit.
5. **Competition at D.** Decisions stamped ≤ D are taken first in the frozen tie order — **fresh signals first** (Priority
   3's rule for a fresh decision is unchanged). Then, if the slot is still free and D's session is fundable (funding start,
   blackouts), the live episodes whose hypothetical trade is still open strictly after D compete in the **same frozen
   same-instant order** (D1:GDX, D1:VGT, G:GDX, G:VGT); the first whose real position can be placed is granted; the others
   stay live and compete at the next release. A hypothetical exit at or before D has ended its episode.
6. **The delayed real entry** reserves the slot like any order and fills at its book's own fill rule from D (the first
   trade of its symbol at or after D; the closing print only for D before the close; otherwise the next session's first
   trade). It never displaces, preempts or bypasses the one slot. Decisions refused while a delayed lot or order holds the
   slot are recorded as **displaced** by it.

### 5.3 The independent real position (`position.ts`)

A delayed entry is a **new position** of its book, simulated from the order at (s, D) by the book's unchanged exit
machinery: D1's ShadowBook/ExitManager (net-profit trailing stop from the post-fill high, maximum-hold loss exit at the
open, buffered intraday loss with its overnight carry; no exit on the entry session) and Growth's ShadowBook with
`exitParamsOf` plus the canonical PositionRules when the initial stop or retention is ON (the initial stop's ATR checked
at D and fixed at the fill; retention's partial sales). Entry time and price, shares, cost basis, trailing stop, holding
clock, interest, initial stop and retention state all start at the delayed fill; nothing is inherited from the shadow
trade, and the shadow trade never closes the funded lot. Verified: re-simulated from every virtual trade's own decision
the harness reproduces the trade exactly (tests, stage V G8).

### 5.4 Chronology cases (brief §1.6)

| Case | Rule |
|---|---|
| Several live shadows at one release | the frozen tie order; losers stay live |
| A shadow and a fresh signal at one instant | the fresh signal first |
| Two books of one symbol (D1·VGT, Growth·VGT) | independent episodes; the tie order (D1 before Growth) |
| Same-minute funded exit and eligibility check | the check runs at the end of the release minute |
| A hypothetical exit at or near the release | eligible only if the hypothetical trade is open strictly after D |
| Several refusals of one book | impossible while its hypothetical trade is open (asserted); a later refusal opens a new episode |
| A shadow overlapping a funded position | allowed; a refusal by the book's own delayed lot opens a new episode (no duplicate position: one slot) |
| Eligibility ending while the pool stays occupied | the episode ends at its hypothetical exit ("expired while occupied") |
| Blackouts / funding start (diagnostics) | they refuse delayed entries as they refuse fresh ones (no later re-check) |

### 5.5 Implementation and integrity

- `allocator.ts` is a study-local copy of Priority 3's `runPool` (`src/vg-d1-growth-joint/pool.ts`, sha256 `8f5f2ec0…`) with
  every insertion marked `SHADOW`; with every toggle OFF no SHADOW code runs and the result equals `runPool` field for field
  (tests; stage V G2, G6). Priority 3's files and every other historical engine file are unchanged; Priority 3's evaluation
  digest stays its sealed `147cad7c…` (brief §0.2).
- The toggles are an evaluation input (`evaluate.ts`): '000' keeps Priority 3's archive key and record; any other value
  appends `|sh<bits>` to the key and adds the shadow summary to the record.

### 5.6 Shadow diagnostics (persisted; kept apart from funded results)

Per episode: book, symbol, original signal time and decision price, refusal reason and occupant (and whether it was a
delayed lot or the book's own), hypothetical entry and exit (time, price, reason, hypothetical net — descriptive only),
eligibility start and end and the end reason, release checks taken part in and losses (competing fresh entry, higher-
priority shadow, blackout, not executable), whether it persisted to a release, and any delayed entry (decision instant,
fill time and price, lot id, the lot's own net, exit reason, waiting sessions and calendar days). Per delayed lot: its
displaced decisions. Ledgers (JSON sealed + CSV) for the fixed-parameter subjects, the diagnostics' principal rows and the
validation's principal rows (§9.0, §11.3, §11.5).

## 6. Space (`config.ts`; NL0's, identities unchanged when every toggle is OFF)

- Genome: inclusion (V, G, B, D) + **three toggle genes** (D1·GDX, D1·VGT, Growth·VGT; 0/1) + Priority 3's 17 categorical and
  116 ordinal genes; D1 8 genes per book on Study 8's box (hold 3–30 calendar days), Growth 1.4.0 on growth140's boxes; coarse
  grids for the fresh screens and islands, fine grids for the informed lanes, refinement and every neighbourhood.
- Identity: cfgId = sha256(16) of `inc:<inc>#<canonical quad>` (+ `#sh:<bits>` when any toggle is ON); a disabled Growth book
  carries the placeholder and its toggle is canonical 0; behavioural equivalence = the funded-lot ledger signature.
- Distance: normalized L∞ over the enabled books' active numeric coordinates; 1 across inclusions or toggle combinations.
- Neighbourhoods (NL0 §3.5): D1 radii in grid units (X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10, W ±20);
  Growth 10% of each box; one Latin hypercube per family; common random numbers; clip to the box widened to include the
  centre; categorical inputs **and the toggles** fixed; inactive inputs untouched; duplicates dropped.

## 7. Tracks, lanes and search (`search.ts`, `stages.ts`)

### 7.1 The four tracks

| Track | Start | Architecture | Cutoffs | Lanes per cutoff |
|---|---|---|---|---|
| **A1** | incumbent-informed | joint: every gene of the three books + the three toggles | C24 | 28 informed lanes (V) |
| **A2** | incumbent-informed | sequential: step d1 (D1 pair + 2 toggles, Growth OFF) → 2 D1 finalists → step g (Growth·VGT + its toggle beside each frozen finalist) | C24 | d1: 14 informed lanes (D); g: 2 × 7 informed lanes (V, D1 pinned) |
| **B1** | from scratch | joint | C19, C21, C23, C24 | 32 replicates × V1, V2, V3 (V) |
| **B2** | from scratch | sequential (as A2) | C19, C21, C23, C24 | d1: 16 × 3 (D); g: 2 × 8 × 3 (V, D1 pinned) |

The fresh tracks use no incumbent anywhere: no seed, no centre, no narrowed range (the boxes are NL0's broad boxes); their
seeds are this study's own labels (`<cutoff>/<B1|B2-d1|B2-g/F<f>>/R<r>/<sub-cell>`).

### 7.2 One lane (NL0 §3.3–§3.4, unchanged)

Independent lane: Latin-supercube Sobol screen (V1, V2 512; V3 1,024; coarse; strata round-robin) → plausibility (centre
net > 0, DD ≤ $35,000, the pool's families funded) → promotion (V1, V2 64; V3 128: ¼ centre net, ¼ constrained rank, ⅛ per
entry pattern, the rest max-min L∞ diversity; one per ledger) → rung 1 (16, centre-first) → NSGA-II islands (2 / 2 / 4
base × 256 new proposals; population 32; NL0's operators, stagnation and triggers) → rung 2 (12 / 12 / 16 × 64) → rung 3 (6
/ 6 / 8 × 128) → refinement (robust, profit, and profit-2 in V3; one pass; NL0's moves + the toggle switches) → shortlist
(3 / 3 / 4). Informed lane: the seed designs (§4.2) → rung 1 → 4 islands × 384 (every free gene free) → rungs 16 × 64, 8 ×
128 → refinement (robust, profit, profit-2, and focus-profit / focus-robust at every focus seed, two passes) → shortlist 6.

### 7.3 The sequential steps

- **Step d1** searches the D structure (Growth disabled; its genes pinned; toggles D1·GDX, D1·VGT free; Growth·VGT inert).
  Plausibility and Q6 there mean "D1 funded". Its qualification (§9) freezes **two D1 finalists**: F1 = the actual-profit
  role holder; F2 = the robust-profit role holder if it is another member at L∞ ≥ 0.10 from F1, otherwise the next qualified
  member in the profit order at L∞ ≥ 0.10 (a materially different pair, possibly the same D1 vectors with other toggles).
  No qualified member → no finalist → the track has no primary at that cutoff (a procedure failure, reported).
- **Step g** searches Growth·VGT and its toggle on the full V pool beside each finalist (its D1 vectors and D1 toggles
  pinned: never changed in step g), half of the step's replicates per finalist; the track's primary is the actual-profit
  role of all step-g qualified members (both finalists pooled). Growth is never optimized for standalone profit.

### 7.4 Toggle coverage (brief §4.3)

Each screen's stratum index varies the free toggles fastest: in every screen each combination of the lane's free toggles
gets exactly the same number of proposals (V: 8 × 64 in a 512-proposal screen; D: 4; step g: 2), crossed with 5B's Growth
strata (Rise × gate × eligibility, breakout × gate). After that the original algorithm allocates effort by its own rules.
Coverage by combination (screened, plausible, promoted, rung-1 centres, feasible) is recorded per lane (`bySh`).

### 7.5 Extension and stopping (frozen; development only)

After the base islands, a lane runs one more island iff its last island raised its hypervolume of (−robust net, p90 DD)
against (0, $35,000), its best feasible robust net or best feasible centre net by > 5%, or produced a new feasible
funded-component pattern — up to 6 / 6 / 12 (independent) or 8 (informed) islands, subject to the resource guard (requested
so far + the round's worst case + the finishing reserve × lanes ≤ the job cap). The record names each lane's stop
(triggers not met; extension cap reached — budget-bound; resource guard). Budget-bound is not convergence.

## 8. Budgets (`budgets.ts`, `stages.ts`; frozen)

### 8.1 Distinct proposals (configured base / maximum, refinement moves apart)

| Track | Per cutoff | Cutoffs | Total |
|---|---:|---:|---:|
| B1 | 131,072 / 262,144 | 4 | 524,288 / 1,048,576 |
| B2 | d1 65,536 / 131,072 + g 65,536 / 131,072 | 4 | 524,288 / 1,048,576 |
| A1 | ≈ 60,000 designs + islands / ≈ 103,000 | 1 | ≈ 60,000 / ≈ 103,000 |
| A2 | d1 ≈ 27,000 / ≈ 49,000 + g ≈ 29,400 / ≈ 52,000 | 1 | ≈ 56,500 / ≈ 101,000 |

### 8.2 Backend evaluations and the equivalence (standard §4.8)

- **Job caps** (unique fresh simulations, NL0's per-lane contract): B1 96 lanes × 23,056 = 2,213,376 per cutoff; B2 d1 and g
  48 lanes × 23,056 = 1,106,688 each; A1 28 × 61,667 = 1,726,676; A2 d1 and g 14 × 61,667 = 863,338 each; qualification 700
  per member; phase 2 60,000; ablation 120,000; diagnostics 40,000; validation neighbourhoods 30,000; engineering 400,000.
  Worst-case ceiling ≈ 23.9 M; expected ≈ 17 M (≈ 46 k requested per independent replicate, ≈ 45–59 k per informed
  replicate, as measured by the trading-session study).
- **Against Priority 3B** (the brief's reference, `research/vg-d1-growth-expanded/REPORT.md` §2.2): 3B's independent base
  was 131,072 proposals per cutoff and its independent searches requested 1,212,750 / 1,169,417 / 1,178,935 / 1,308,569
  fresh evaluations at C19 / C21 / C23 / C24 (4,869,671), + qualifications 285,368; whole study 602,111 proposals and
  5,834,395 evaluations (informed 679,356 included). The comparable work for a from-scratch track is 3B's independent search
  + qualification (5,155,039). **B1 and B2 each get 3B's configured base per cutoff (131,072) and ≈ 1.47 M requested
  evaluations per cutoff (≈ 5.9 M search + ≈ 0.8 M qualification each, ≥ 5.83 M).** Executed figures are reported beside
  these targets; nothing is claimed for units not recorded.
- **Against NL0's effective budget** (5B's L0 arm: 8,192 independent base proposals per cutoff; informed 4,034 executed;
  489,695 requested search evaluations in all): B1 and B2 are 16× its independent base per cutoff; A1 and A2 ≈ 14× its
  informed lane.
- **Matching.** Joint and sequential get the same lane count per cutoff (B1 96 = B2 48 + 48; A1 28 = A2 14 + 14) under the
  same per-lane schedules and caps; fresh and informed get comparable C24 effort (B1 C24 ≈ 1.47 M, A1 ≈ 1.3–1.7 M); the fresh
  tracks are never smaller than the informed ones. No track is funded by terminating another.
- **Pilot sizing.** The bench (14 workers, D24) measured 92.8 evaluations/s, 149 ms per evaluation per worker, 8.9 GB peak:
  the plan is ≈ 50 hours of compute. This is accepted as the brief's "substantial computational budget"; if a resource
  guard or failure prevents a planned job, it is recorded as such, never silently reduced.

## 9. Robustness instrument, qualification, roles and selection (`qualify.ts`, `folds.ts`)

### 9.0 The fixed-parameter comparison (`phase2.ts`; brief Phase 2; D24; after the freeze; diagnostic)

New L0 under all eight combinations: the complete detailed replay (net, DD, annual P&L and reset DD, trades and win rate,
gross, costs, interest, capital utilization, per-strategy attribution fresh vs delayed, shadow ledger and episode counts,
recovered entries' P&L, worst trade and excursion, waiting durations, displaced decisions, the funded-lot difference against
all-OFF — lots lost and added — and the year-by-year difference) and the qualification instrument (§9.1). The 2³ factorial
(each toggle alone, main effects, interactions). Labels against A (Dev, Risk). It never removes a combination from any search.

### 9.1 Gates (all must hold; NL0 §3.5)

Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 fresh confirmation p90 DD ≤ $35,000; Q4 fresh confirmation p10 > 0; Q5 at 10 bps
per side: centre net > 0 and DD ≤ $35,000; Q6 the pool's families receive capital at the centre (D1 and Growth; D1 in a D
pool). Evidence: centre; selection 2 × 128 (ranking only); confirmation 3 × 128 = 384 (qualification only; labels
('confirm', rep, cutoff)); stresses 10 / 20 bps, 14% interest, +25 bps stop slippage, next-open stops (report-only except
Q5); causal removals (each family, symbol and component). No activity, concentration or tail gate.

### 9.2 Roles (selection families)

Actual-profit = highest centre net (ties: selection robust, lower centre DD, label); robust-profit = highest selection
robust; balanced = highest selection robust ÷ selection p90 DD; lower-drawdown = lowest selection p90 DD with robust ≥ 50% of
the actual-profit holder's. Pareto set on centre net, centre DD, selection p10, selection p90 DD.

### 9.3 Sets and primaries

- Each (cutoff, track, step) is qualified in its own job; seed-level (each replicate), sub-cell and per-finalist roles are
  reported (search variability), never selecting.
- Fold primaries (C19, C21, C23): each fresh track's actual-profit role (B2: step g's).
- C24: each track's primary (AD1); the controls (§4.1) qualified with the same instrument; the **final selection** (no new
  evaluation) — the nominee = the actual-profit role of the final selectable set; the roles of the final set and of the
  informed, fresh, joint and sequential unions are kept.

### 9.4 Comparisons (reported, never selection inputs)

Every C24 member against New L0, C4 and C4-refined: Δ centre net, DD, confirmation median, p10, p90 DD, selection robust, 10
/ 20 bps; dominance; higher-profit trade-off; stronger local stability.

## 10. Chronological procedure test (fresh tracks only)

- Order: for C19, then C21, then C23: B1 search and selection; B2 step d1, its finalists, step g and its selection — all
  sealed and **committed before the slice opens**; then the fold evaluation (each fresh track's exports — its four role
  holders and each replicate's actual-profit holder — and the controls, descriptively, one continuous run per phenotype on
  the evaluation door with the cutoff as boundary). Guard: an earlier cutoff's fresh search never runs after a later
  cutoff's fresh selection exists.
- The sequential path per procedure (B1, B2) chains its fold primaries over 2020–2021, 2022–2023 and 2024 (continuous runs;
  5 bps on $100,000 per open lot closed or adopted at a boundary). Verdict: **supported** iff every fold produced a primary,
  the sequential net > 0 and the sequential minute DD ≤ $35,000; otherwise unsupported or incomplete. Role, replicate and
  fixed-control paths are descriptive.

## 11. Labels, ablation, diagnostics, the frozen selection and the validation

### 11.1 Frozen comparison labels (`labels.ts`; development and folds only; computed in the frozen selection)

Band $2,500 (report-only materiality). Dev: ΔF = centre net difference, ΔP10 = confirmation p10 difference; for a searched X,
replication: ≥ ⌈2R/3⌉ of its track's R replicates' seed-level actual-profit holders beat Y's centre net by > band. '+' iff
ΔF > band, ΔP10 ≥ −band (and replication); '−' iff ΔF < −band and ΔP10 ≤ band; '0' iff |ΔF| ≤ band; else 'mixed'. Risk:
'worse' iff X's confirmation p90 DD or centre DD exceeds Y's by > band; 'better' iff X's p90 DD is lower by > band and its
centre DD not higher by > band. Chron (only where both sides have a sequential path: B1 vs B2; a fresh track or a nominee
from one against the original 5B L0 path, −$29,358.01 / DD $67,214.22, unsupported): '+' iff X's path is supported and (Y's
is not or X's net > Y's + band); '−' iff (Y supported and X not) or (same verdict and X's net < Y's − band). Labels: repeatable
improvement (Dev '+', Chron '+', Risk not worse); harmful ((Dev '−' and Chron not '+') or (Chron '−' and Dev not '+') or (Dev
'0', Chron '0', Risk worse)); no material difference (Dev '0', Chron '0', Risk same); conditional profit/risk trade-off ((Dev
'+' and Chron not '−') or (Dev '0' and (Chron '+' or Risk better))); inconclusive otherwise. Without a chronological test a
Dev '+' with Risk not worse carries the qualifier "development improvement (no chronological test)". Pairs: F(sh) vs A (7);
each P(T) vs A; the nominee vs A; B1 vs B2; A1 vs A2; A1 vs B1; A2 vs B2.

### 11.2 The ablation cross-test (`ablation.ts`; C24, D24; report-only)

Export set (frozen rule; sealed `exports.json` before any evaluation): the nominee and the final set's role holders; each
track's role holders and replicate-level actual-profit holders; the sequential tracks' D1 finalists; New L0, C4, C4-refined,
C85, IJ1, D. Every row under every combination of its enabled books' toggles (the phenotype × toggles matrix); for the
principal rows (nominee, each track primary, New L0) under all OFF and their own toggles: the confirmation family (3 × 128)
and a rerun with the cell's own leading winning episode blacked out. The decomposition X − A = toggles (New L0 with X's
toggles − A) + parameters (X all OFF − A) + interaction.

### 11.3 Diagnostics (`diagnostics.ts`; D24; report-only; sealed before the frozen selection)

For the principal rows under their own toggles and all OFF, and New L0 under their toggles: the detailed views (§5.6
ledgers, annual figures, attribution, utilization, trade statistics, top-trade concentration), the matched-lot comparisons
against New L0 and against the same phenotype all OFF (lots in both, only in one; reconciled to the net difference: what was
recovered, displaced, retimed or newly admitted), and the participation by stage (decisions, refusals, episodes,
recoveries, funded lots by book).

### 11.4 The frozen selection (`FROZEN_SELECTION.json`, sealed and committed before FULL opens)

The nominee and every track primary and role with complete effective settings; A and the seven F(sh); the D1 finalists; the
labels (§11.1) and decompositions; the pins of every sealed record and of the code; the validation subjects (the ablation
export rows) and plan. No futility stop.

### 11.5 Validation (FULL, once, under the guard)

Every export row under its own toggles (principal rows also all OFF), New L0 under the eight combinations and the controls,
unchanged, each in one continuous run 2016-01-04 → 2026-10-30 (state and marks preserved across 2024-12-31): V1 validation
P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000. First check: New L0 all OFF reproduces its known
figures exactly (§2). Report-only: stresses (10 / 20 bps, 14%), the confirmation rep 1 (128 draws) on FULL and full-history
ledgers, annual figures and attribution for the principal rows. A failed validation is a result: no new winner, no rescue
search, no retuning, no relabelling.

## 12. Engineering gates (stage V, `parity.ts`; sealed before the freeze; a failure stops every dependent stage)

G1 the controls (toggles OFF) = 5B's sealed L0 C24 centres field for field; New L0 = $382,721.46 / $19,459.83 / 34 lots; VG #2
native = $260,223.13 / $17,280.74 / 36 lots / 14 refusals. G2 ≥ 900 archived 5B L0 records (D19–D24; V, G, B) identical through
this study's allocator with toggles OFF; Priority 3's evaluation digest = its historical seal. G3 fast = detail under every
combination. G4 causal prefix with every toggle ON (D19, D21, D23 vs D24: funding records, lots — delayed lots included —,
episodes, daily marks). G5 accounting (Σ lot nets, interest, costs; principal ≤ $100,000; one slot; realized + unrealized).
G6 '000' = Priority 3's runPool and record; the toggles bind. G7 the eligibility rules on real data (§5.2: toggled books,
live at D, D at the release minute's end, fill ≥ D, fills = a fresh re-simulation from D, fresh first, tie order). G8 the
position harness re-simulates every virtual trade exactly (> 500 trades). G9 the regression anchors: the D1·VGT signal
refused on 2022-12-20 (D1·GDX holding the slot) ends at its hypothetical maximum-hold exit on 2023-01-04, with no D1·VGT
delayed entry after the 2023-04-19 release; at least one genuinely persistent episode funded later. G10 keys. G11 single-book
pools. Unit tests (`tests/allocator.test.ts`, `tests/position.test.ts`, `tests/study.test.ts`) cover the state transitions.

## 13. Resources and recoverability (NL0 §3.7; standard §6)

Slice `vgl0se.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); transient units via `npm run vg-l0se -- launch`;
14 child-process workers (bench: 12 / 14 / 16 measured), book cache 48 per book per worker, gc every 64 evaluations or above
256 MB of ArrayBuffers, pressure stop at 36 GiB of cgroup memory (checkpoint and exit 75). Every evaluation is archived per
job (SQLite bound to the study, job, door pin and evaluation digest); a rerun of the same command replays the job exactly;
extension decisions are taken at barriers. The pilot (P18 pseudo-fold on D19; pilot budgets; every stage path) tests a
graceful stop, a worker SIGKILL and a unit SIGKILL with identical resumption. No automatic restart.

## 14. Integrity

`results/protocol-freeze.json` (sealed before any study stage) records the protocol, amendments, brief, adoption manifest,
control manifest, stage V and reference-method hashes, the evaluation digest (Priority 3's evaluation files + this study's
allocator, position, evaluation, worker and doors), Priority 3's evaluation digest (= its historical seal), the code closure,
door pins, budgets, replicates, caps and resources. Every later stage checks the evaluation code against it; a change needs
an amendment with its own sealed stage V. Sealed records are read-only with their sha256 in `results/seals.jsonl`. Changes
after the freeze go to `AMENDMENTS.md` (append-only); no criterion is loosened once results it governs exist.

## 15. Reporting commitments (brief Phases 2, 6, 7 and Final Deliverables)

`REPORT.md` and `results/tables/*.md` (+ machine-readable `results/tables/summary.json`): the implementation and its
verification; the eight fixed combinations (net, DD, annual, trades, episodes generated / persisted / recovered, recovered P&L
and excursion, waiting, utilization, displaced, lots lost and added, factorial); each track's budget accounting (configured and
executed proposals, islands, refinement starts and moves, requested evaluations, unique fresh, archive hits, stops) against
3B and NL0; coverage by toggle combination; the finalists' training, validation and full-history net, gross, costs, DD,
annual profit and DD, trades and win rate, utilization, recovered entries and their net, displaced trades, neighbourhood
robustness (selection and confirmation statistics, p90 / p95 / worst-10% mean DD, breach share with its Wilson interval,
mean excess, worst), walk-forward results, risk-ceiling breaches and severity, toggles; per-strategy attribution; the
answers to the brief's questions (6.1–6.3, Final Deliverables 1–12); the final comparison table; limitations; the
recommendation (nothing deployed or adopted).

## 16. Documentation and roadmap

- `docs/research/ROADMAP.md`: a row for this study and the recorded unresolved decision of brief Phase 8 (the future
  calendar-day vs trading-session from-scratch comparison: A — hold the selected eligibility configuration fixed under both
  conventions, or B — optimize the three toggles independently under both; symmetric treatment; the user's decision after
  reviewing this study; not started).
- `README.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md` (the checkpoint), `AMENDMENTS.md`.
