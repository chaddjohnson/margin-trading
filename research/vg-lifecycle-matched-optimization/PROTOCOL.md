# Protocol — Priority 5B: matched optimization of the VGT + GDX D1 + Growth portfolio under the L0, L1 and L2 Growth funding lifecycles

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
search, qualification, selection, fold or validation result of this study exists). Afterwards it is never edited;
changes go to `AMENDMENTS.md` (append-only).

**Written before any search result of this study existed.** Known before it (sealed elsewhere, development or examined
history): every record of Priorities 3, 3A, 5A, 3B, 3C, 4A and the process audit (the controls' development centres,
neighbourhoods, fold paths and 2025–2026 outcomes reported there); this study's engineering evidence, which printed
mechanics only — the stage V dry runs (check counts, simulation counts, fixed-point rounds), the bench (throughput,
memory, and that 1 of 96 random D24 centres has a drawdown ≤ $35,000) and the pilot (§13).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` (the registered current version; registry checked) |
| Read / adopted (UTC, from `date -u`) | read in full 2026-11-11T08:56Z (with the registry, the template and the roadmap) / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/vg-lifecycle-matched-optimization/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-lifecycle-matched-optimization`; every study stage, the pilot included, calls `requireStandardAdoption` in code) |
| Scope | `optimization` |
| Brief | `research/vg-lifecycle-matched-optimization/brief/BRIEF.md`, sha256 `224480b4b0e39e9647e4403dbc7963f1c0c3f5f9c17883bce23776ec0dae06d9` (161 lines, read in full through its final section) |
| Branch / base commit | `research/vg-lifecycle-matched-optimization` in the main checkout, from `b8a5a058` (end of the process audit); code `src/vg-lifecycle-matched-optimization/`; `npm run vg-lmo -- <command>` from the repository root |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5, §3.2 | adaptation | **Per arm** (lifecycle), the primary is **actual profit**: the highest development centre net among the qualified members of that arm's final selectable set; the controls C4, C4-refined, C85, E, A and B are members under the same gates and rule (the qualifying-incumbent fallback). The arm's independent primary and its other roles are kept (§9). | — (brief "Selection, confirmation and cross-testing") |
| AD2 | §4.1, §3.4 | adaptation | One allocation architecture (architecture A: one exclusive funded slot) and a **fixed** same-instant order — D1 first, then GDX before VGT, the verified incumbent convention — in every arm; no allocation or priority search. | — (brief: "Freeze deterministic same-instant priority … do not introduce allocation optimization") |
| AD3 | §4.1, §2.4 | adaptation | Priority 3B's pipeline with three NSGA-II objectives (−centre net, −robust net, p90 DD). Promotion reserves ¼ centre net, ¼ robust net, ⅛ both-Growth funded (B structure, informed lane) and ⅛ per Growth entry pattern (Rise/breakout protection); the rest constrained rank / diversity. | — |
| AD4 | §4.7 | adaptation | Protected both-Growth exploration: in the B structure and the informed lane every fourth island (index 3, 7, 11) requires a B configuration funding D1 and both Growth books; reserved promotion share, a refinement start and a shortlist slot. Its members compete under the same gates and primary rule; it is not equal activity and no winner must fund every component. | — (brief "Portfolio scope and controls") |
| AD5 | §5.1 | adaptation | The pooled engine is Priority 3's, unchanged (evaluation digest `147cad7c…4e88`, verified before every stage); L1/L2 are Priority 5A's lifecycle adapter, unchanged, reached through a study-local copy of 5A's `runCoupled` that adds stresses, blackouts and minute marks (§5.4). Stage V (§12) verifies the path: L0 and L1/L2 reproduction of sealed records, path identity with 5A's `runCoupled`, the fixed point's uniqueness and its consistency with Priority 3's independent reference pool. | — |
| AD6 | §5.3, §4.1 | adaptation | Centre-first fidelity (Priority 3B's AD7): a rung-1 or refinement proposal whose centre is not plausible (net ≤ 0, DD > $35,000 or a family unfunded) gets no neighbours. A profit-type refinement start from a feasible point measures neighbours only for moves whose centre net reaches the current net + $2,000 (only those can be chosen: identical selection). Rungs 2–3, qualification and every report family evaluate every neighbour. | — |
| AD7 | §5.3 | adaptation | Neighbourhoods move only the enabled books' active inputs (a disabled Growth book is inert and canonicalized to Priority 3's placeholder; 3B's AD8). D's families move its two D1 books (scope d1). | — |
| AD8 | §4.2, §4.6 | adaptation | Budgets are the brief's planning values per arm: independent 8,192 base / 16,384 maximum distinct proposals per cutoff; informed ≤ 4,034 base / ≤ 7,106 maximum at C24 (≤ the brief's 4,096 / 8,192: the designs fill what the seed list allows). The brief's hard ceiling of 3,000,000 fresh simulations is enforced by frozen per-job caps (§7.4). A per-cutoff resource guard may stop extension rounds before the nominal maximum, identically for the three arms; §7.4 states the coverage implication. | — (brief "Matched search and bounded effort": reduce symmetrically before the freeze if the planning values do not fit) |
| AD9 | §1.8, §3.3 | **departure** | The earlier-cutoff repetition covers the **independent** lanes only. The informed lane (seeded with C4, C4-refined and other incumbents chosen with later data) runs at C24 only and has no chronological test; no chronological claim is made for it. | Brief: "Incumbent-informed discovery/refinement at C24 … Clearly label provenance; do not mix these results into an independent chronological claim." |
| AD10 | §5.3 | adaptation | Qualification evidence per member: centre, selection 2 × 128, fresh confirmation 3 × 128 (identical draws in every arm), the frozen stresses and the causal removals. The half- and 1.5×-radius families (tail severity, §5.8) are computed for the export rows only (§11.2), not for every member; no family scopes or categorical toggles. | — |
| AD11 | §5.3 | adaptation | Search variability: every lane runs under **two search seeds** (replicates R1, R2) with equal budgets; each arm's selection pools both; seed-level roles are reported and never select. | — (brief: "at least two search seeds within each arm") |
| AD12 | §1.4 | adaptation (stricter) | FULL is never opened before `FROZEN_SELECTION.json` (all C24 selections, the cross-test subjects, the frozen evidence labels, the validation tests and the report-only perturbations) is sealed and committed — not even for known full-history targets. There is **no futility stop**: the validation always runs once. | — |

Standard 2.0.0 §7.7 applies unchanged: written analysis, Markdown tables and machine-readable results only.

## 1. Question, objective and outcomes

- **Question.** When the D1 + Growth portfolio (VG #2's two D1 books, D1·VGT and D1·GDX, plus Growth on VGT, GDX or
  both, in one shared $100,000 slot) is optimized separately for each Growth funding lifecycle — L0 (the current
  virtual book), L1 (actual funding, fresh canonical opportunities only) and L2 (L1 plus one retained refused base
  opportunity) — with matched effort, can L1 or L2 produce a useful improvement over a freshly optimized L0 portfolio?
  Which part of any difference is the lifecycle itself, which part the settings optimized for it, and which their
  interaction?
- **Objective (every arm).** Actual net profit (realized + marked unrealized, after costs and interest) with credible
  local stability and costs, within a maximum minute drawdown of **$35,000 on the fixed $100,000 principal** (35% of
  that fixed budget, not of peak equity). Historical compliance does not guarantee future drawdown.
- **Primary rule (per arm):** actual profit (AD1, §9.3). **Roles:** actual-profit, robust-profit, balanced,
  lower-drawdown, ranked on the selection families; the fresh confirmation family decides qualification only.
- **Pareto set (reported per set):** centre net ↑, centre DD ↓, selection p10 net ↑, selection p90 DD ↓.
- **Valid outcomes:** each arm's frozen primary and roles; "no qualified combined result" in an arm; failed
  qualification of controls; a failed validation; an unsupported independent procedure; and for the comparison the
  frozen labels (§11.1): repeatable improvement, conditional profit/risk trade-off, no material difference, harmful,
  inconclusive. A negative or inconclusive result is a valid completion. D (D1 only) is a comparator: the conclusion
  that no combined candidate improves on it is allowed, and it is never relabelled as the combined product.

## 2. Prior knowledge and provenance

- **Already examined:** all of 2016-01-04 → 2026-10-30, by Priorities 3, 3A, 5A, 3B, 3C, 4A, the process audit, Study
  8, the growth140 studies, Priority 2 and the user's browser. Known outcomes include: C4 development $302,785.91 /
  $17,332.09 (L0), +$3,000.27 under L1/L2 (5A); C4 validation +$99,081.34, full $401,867.24; C4-refined development
  $360,569.71 / $17,280.74, validation +$91,512.65, full $452,082.36; 5A's L1/L2 centre effects for C4, C85, E, A, B,
  GP4, GP85, V4, V85, IP, XP, SP and the 27 finalists, its neighbourhoods and its full-history arms (every 2025–2026 P&L
  identical under L0, L1, L2); 3B's L0 search (independent procedure chronologically unsupported, sequential DD
  $60,874.87); 3C's and 4A's results; the audit's finding that neighbourhoods reproduced one episode and that three
  re-ranking formulas did not improve later periods.
- **Therefore 2025-01-02 → 2026-10-30 is validation on previously examined history, not an untouched holdout.** The
  design, the controls and the informed seeds were all chosen with it in view. Fresh seeds are not fresh market history.
- **Provenance of the controls and informed seeds** (`CONTROL_MANIFEST.json`): VG #2 (Study 8 F24, development-selected,
  informed for this study); Growth #4 (browser, 2016–2026 in view); 08500a60 (growth140-vgt-stable, 2016–2024); Appendix
  A (browser, 2016–2026 in view); C4-refined and the 3B seeds (3B C24 lanes, 2016–2024, chosen after C4); Priority 3's
  IP (its C24 informed lane). None ever enters an independent lane or an earlier cutoff.
- **The user's decisions kept:** C4 and C4-refined stay distinct, immutable baselines (no final preference recorded);
  the 3C GDX partner stays declined; 5A stays complete and unchanged; L0 stays the production model; no experimental
  lifecycle becomes a default.

## 3. Data, doors and windows

- **Canonical files** (git-ignored, pinned): `data/VGT/data.csv` sha256 `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b2…5049`, both 2,723 sessions 2016-01-04 → 2026-10-30 on one calendar, the last row 2026-10-30T23:59Z
  (re-verified 2026-11-11 from the files; identical to Priority 3's pins).
- **Common complete endpoint: 2026-10-30.** November–December 2026 do not exist and are never implied.
- **Doors:** Priority 3's physical byte-prefix doors D19 (→ 2019-12-31), D21 (→ 2021-12-31), D23 (→ 2023-12-29), D24
  (→ 2024-12-31), each verified by size, sha256 and last row before parsing; FULL (→ 2026-10-30) only behind this
  study's sealed and committed `FROZEN_SELECTION.json` (and Priority 3's own frozen-selection guard). Every opening is
  logged in `results/doors.jsonl`.
- **Windows:** development 2016-01-04 → 2024-12-31 (all search, refinement, ranking and choices); validation
  2025-01-02 → 2026-10-30; earlier cutoffs C19, C21, C23 (§10).
- **Continuity:** every run is one continuous causal run from 2016-01-04 (actual and virtual positions, L2 retained
  opportunities and every state carried across every boundary; nothing liquidated or reset). Validation P&L = the marked
  net at 2026-10-30 − the marked net at the 2024-12-31 close; the reset validation DD and the whole-run DD are both
  reported.

## 4. Controls, seeds and comparison arms

### 4.1 Exact controls (`CONTROL_MANIFEST.json`, sealed before the freeze)

Read from Priority 5A's verified loader (Priority 3's pinned records) and Priority 3B's pinned `FROZEN_SELECTION.json`
(sha256 `f7629968…422e`); each identity is checked in code.

| Key | Composition | Structure | Selectable (C24, every arm) | Identity |
|---|---|---|---|---|
| **C4** | VG #2 + VGT Growth #4 `420cd989e4fa7749`; GDX Growth OFF | V | yes | P3 `f324035d15f69610`, cfg `2f49a1cc226b4ece` |
| **C4R** (C4-refined) | 3B `C24/informed-fixed#1 profit` — VG #2's D1 books unchanged + refined VGT Growth `c3c1c0d56c4ee3b0` (17 active settings differ from #4, the initial stop OFF among them; 5 more become inactive); GDX Growth OFF. Not `informed-joint#1`. | V | yes | P3 `07443ffaeef41e85`, cfg `0f017f0ab9b26f24` |
| D | VG #2 Balanced `S8-VG-F24-3` / `s8-vg-balanced`, D1·GDX `d1-7b99d2833d` + D1·VGT `d1-bd80e32ee4`; Growth OFF | — | no (D1-only comparator) | P3 `7a377d49c2b9aa55` |
| C85 | VG #2 + VGT Growth `08500a60ec56cfae` | V | yes | P3 `3688e97b90639d60` |
| E | VG #2 + Appendix A `07cac3329fc7a520` | G | yes | P3 `c45f4efa028203e9` |
| A | VG #2 + #4 + Appendix A (both Growth symbols) | B | yes (fails Q3 as sealed; considered) | P3 `d4cde31356e2306a` |
| B | VG #2 + 08500a60 + Appendix A (both Growth symbols) | B | yes (fails Q3 as sealed; considered) | P3 `676731bfd4ec280f` |
| IP | Priority 3's informed primary (VGT breakout; 5A: −$83,057.12 under L1) | B | no (5A mechanism control) | P3 `575545f4d6438577` |
| GP85 | Growth only: 08500a60 + Appendix A (5A: the L2 re-entry of 2020-04-16) | — | no (5A mechanism control) | P3 `008233e872d69f92` |

The 5A mechanism set that exercised refusals (E, C4, C85, A, B, IP, GP85; D as the no-refusal reference) reproduces 5A's
sealed L0/L1/L2 development centres in stage V; C4, C4-refined and these controls form the fixed-control rows of the
cross-test matrix under every lifecycle (§11.2). They are research controls, never adopted portfolios.

**Candidate consideration (standard §2.8):** A — original gate verdict "fails Q3" (Priority 3: confirmation p90 DD
$36,277.63; 3B: $35,879.73); B — "fails Q3" ($35,131.47; 3B $35,149.46); E — not qualified by Priority 3 (archived p90
$35,245.92; 3B fails Q3 at $35,057.52). User-directed consideration: Priority 3A and 3B briefs (research only). This
study reports each arm's verdict beside the original one, never relabelling it.

### 4.2 The informed seeds (identical in every arm; `controls.ts informedSeedKeys`)

C4 (focus), C4-refined (focus), C85, E, A, 3B `informed-joint#1 profit` (`940fdaf770eedc9d`, V with refined D1 books),
3B `informed-joint#3 both Growth funded` (`f6b797363d32ec8b`, B), 3B `indep/G_GDX-breakout#1 profit`
(`043d1cab196c7f78`, G with a GDX breakout) and Priority 3's IP (B with a VGT breakout): nine structurally diverse
existing combinations, each entering unchanged with its own D1 vectors in its own structure. Every vector, D1
included, may adapt under the same bounds. Provenance: informed (chosen with 2016–2024 and, for some, 2025–2026 in
view).

### 4.3 The comparison arms

- **Three lifecycle arms** L0, L1, L2, each with the identical search space, structures, same-instant priority,
  budgets, seeds, instruments, gates, roles and evaluation conditions. Proposals adapt to each arm's evaluations.
- **Lanes per arm:** independent discovery (C19, C21, C23, C24) and informed discovery/refinement (C24 only).
- **Fixed controls × L0/L1/L2** (§4.1) and the **cross-test matrix** of exported phenotypes (§11.2), report-only.

## 5. Engine, conventions and the lifecycles

### 5.1 Fixed in every arm

Priority 3's pooled engine (`src/vg-d1-growth-joint/pool.ts`, `books.ts`, `evaluate.ts`, `data.ts`), unchanged: one
exclusive funded $100,000 slot; a decision is funded only at its own instant iff nothing is open or reserved; a grant
reserves the slot until its fill; a retained Growth remainder after a partial exit keeps the slot until its final exit;
no compounding, no preemption, no forced replacement or early liquidation, no simultaneous funded positions, no
reservations by family; same-instant decisions D1 first, then GDX before VGT (AD2). Economics: 5 bps per executed side,
$0 commission, 11% simple annual interest on outstanding principal by calendar day (365-day year), stops at the stop or
the gapped open, fractional shares, canonical prices, signal resolution, execution, reservations and minute marks.
Harmonized arming: funding and D1 arming from 2016-01-04 (each D1 machine arms once its reference high exists); the
native VG #2 bridge (Study 8 arming 2017-06-15) is reproduced under L0 only. **D1's canonical shadow lifecycle is
unchanged in every arm** (a D1 refusal never feeds back).

### 5.2 The Growth lifecycles (Priority 5A's protocol §5.4–§5.6 and implementation, unchanged)

- **L0** — the current virtual book: a refused Growth entry becomes an unfunded virtual position and waits for its
  virtual exit; funding never feeds back; virtual continuation rights are kept.
- **L1** — actual funding: a refused Growth request leaves no order or position and consumes that attempted
  opportunity (the decision-time transitions stay canonical); later entries need fresh canonical opportunities (a new
  Rise crossing, a new breakout session, a newly armed native eligibility opportunity, or a continuation window opened
  by an **actual** funded exit). No manufactured crossing, no silent native-eligibility retry, no inherited
  hypothetical price, high or holding age, no continuation rights from an unfunded profit. Market observation continues
  causally.
- **L2** — L1 plus at most one preserved refused **base** opportunity per Growth book with 5A's **fixed** constants
  (20 sessions, 5% price extension): native expiry bounds, invalidation (the 5% guard, the Rise predicate or the native
  policy's own condition, the breakout's trend conditions and level), supersession by a newer refused base request,
  the blocking gates (trend filter, Drawdown Recovery Gate, initial-stop availability), daily reassessment after the
  canonical decisions of the instant, current-price execution at the next eligible trade. Refused continuations follow
  L1. No replay of the original price, no reset of the clock while waiting.
- **Native eligibility versus L2's preservation.** Native eligibility (a searchable Growth gene, identical in every
  arm) is the book's own rule for arming and deciding opportunities before any funding request; L2's retained
  opportunity is a funding-refusal rule applied only after a request was refused. Reports keep them apart.
- L2's policy constants are never optimized or changed here.

### 5.3 The coupling (5A's fixed point)

Under L1/L2 a Growth book's path depends on the allocator's answers: the books run with an oracle of answers, Priority
3's unchanged `runPool` replays them, the earliest inconsistent answer is fixed and the iteration repeats (5A protocol
§5.7). A run that does not converge within 5,000 rounds, or ends inconsistent, **throws**: the evaluation fails and its
job fails with it (an explicit engine failure, never a fitness or a skipped candidate; the failure is reported).

### 5.4 This study's evaluation path (`life.ts`)

`evaluateMode(door, quad, options, lifecycle)`: L0 → Priority 3's `evaluate` (the exact 3B path); L1/L2 →
`recordOf(runLife(…))`, a line-for-line copy of 5A's `runCoupled` that also passes cost / interest / stop stresses to
the lifecycle Growth books exactly as Priority 3's `booksOf` passes them to the canonical books (with the next-open
fallback for books with an initial stop or retention), accepts blackouts (a pool refusal reaching the book like any
refusal) and records minute marks. With no stress the books are built exactly as 5A built them. The archive key is the
lifecycle + Priority 3's evaluation key. One minute-DD fidelity and one record (`recordOf`) for every arm.

## 6. Space (`config.ts`; 3B's, identities unchanged)

- **Configuration:** the structure (V: Growth·VGT only; G: Growth·GDX only; B: both) with VG #2's architecture — D1·GDX
  and D1·VGT always enabled — and every enabled book's vector: D1 8 genes per book on Study 8's common box (X 8.0–30.0%,
  Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200); Growth 1.4.0 8 structural +
  50 conditional numeric genes per book on growth140's boxes (entry Rise | breakout; trend filter off | 5 methods;
  eligibility off | 5 policies (Rise only); recovery gate off | on; exits hold OFF | hold ON buffer OFF | ON; initial stop;
  retention; continuation off | 4 methods). Coarse grid for the independent screens and islands, fine grid (0.1
  percentage point, 1 session) for the informed lane, refinement and every neighbourhood. Every control and informed seed
  is exactly representable on the fine grid (tested).
- **Identity:** a disabled Growth book = Priority 3's placeholder (`1af5b55987a56e2f`); `first` = D1. cfgId = sha256(16)
  of the structure and the canonical quad (3B's): inactive genes never create a second configuration; duplicates are
  never evaluated twice in a job. Behavioural equivalence = the funded-lot ledger signature: promotions and shortlists
  keep one configuration per ledger; distinct configurations and distinct ledgers are reported separately.
- **Cells (the three protected structures):** V, G, B. Inside a cell every gene evolves, the entry methods included.
- **Screen strata:** per enabled Growth book (GDX first) six options — Rise·gate off·eligibility off, Rise·off·on,
  Rise·on·off, Rise·on·on, breakout·gate off, breakout·gate on — round-robin over 6 (V, G) or 36 (B) strata; an "on"
  eligibility stratum keeps the quasi-random policy if it is one, otherwise policy 1 + (round mod 5). Exits, retention,
  the initial stop, trend filters and continuation stay quasi-random and are reported per class.
- **Rise/breakout protection beyond the screen:** ⅛ of the screen promotion and of every rung promotion is reserved per
  entry pattern (round-robin, the best of each pattern); the shortlist has an "entry alternative" slot.
- **Protected both-Growth exploration (AD4):** in B and in the informed lane: ⅛ of the screen promotion (B) and of each
  rung promotion for feasible configurations funding both Growth books; every fourth island (index 3, 7, 11) requires a
  B configuration funding D1 and both Growth books (need `all`); a refinement start; a shortlist slot.

## 7. Search, budget and stopping (`search.ts`, `stages.ts`, `budgets.ts`)

### 7.1 Lanes

- **Independent (C19, C21, C23, C24; identical schedule):** per arm, two replicates × three cells. Sobol
  Latin-supercube screen (this study's seed namespace; structure pinned; strata round-robin) → plausibility (centre net
  > 0, DD ≤ $35,000, both families funded) → screen promotion → rung 1 (16 draws, centre-first) → NSGA-II islands
  (population 32) with the synchronized extension rule → rung 2 (64) → rung 3 (128) → refinement (robust, profit and,
  in B, both-Growth starts; one pass; 16 draws; inclusion never changes) → the cell shortlist. No incumbent, control,
  archive or later-selected vector or range enters; the boxes are the broad design boxes 3B's independent lanes used.
  The independence concerns configuration discovery; the research design itself is informed by examined history.
- **Informed (C24):** per arm, two replicates. The nine seeds unchanged, their near (scale 1.5, 12 each) and broad
  (scale 3, 12 each) designs, C4's and C4-refined's focused designs (64 at scale 0.5 and 64 at 1.0 each) → rung 1 →
  islands with every free gene free (structure and inclusion included) → rungs → refinement (robust, profit,
  both-Growth with one pass each, and profit and robust starts at C4 and at C4-refined with ≤ 2 passes; inclusion moves
  allowed: B → V/G, V/G → B with Appendix A, #4 or 08500a60 as partner) → the shortlist.
- **Paired seeds:** every seed label of a lane is its seed key `<cutoff>/<lane>/R<r>/<cell>` — never the lifecycle —
  so the three arms share their screens, genetic-algorithm streams, designs and every neighbourhood family; the
  replicates differ by their seed keys. Adaptive proposals then diverge by arm, as they should.
- **Order:** C19 search → qualify → seal and **commit** the fold selection → C19 cross-test (training door) → fold
  evaluation; then C21; then C23; the sequential paths; then the C24 independent and informed searches and the C24
  qualification. A fold evaluation never feeds a later search; no earlier cutoff runs after a later cutoff's selection
  exists (guard in code).

### 7.2 Island, promotion, refinement and shortlist rules (3B's, §7.3 there)

NSGA-II: binary crowded tournaments; categorical genes uniform crossover (p 0.9) and random reset (1/free categorical
genes); ordinal genes SBX (η 15, p 0.9) and polynomial mutation (η 20, 1/active ordinal genes) on grid indices; (μ + λ)
survivors; every child fitted at rung 1 (centre-first). Islands start from the rung-1 archive split by rank (rank k →
island k mod base islands; protected islands by the rank order under need `all`). Stagnation: 8 generations without a
1e-3 relative gain of the island hypervolume of (−robust, p90) against (0, $35,000) or of the lane's best feasible centre
net. Screen promotion: ¼ centre net among the plausible, ¼ constrained rank on (−net, DD), ⅛ both-funded (B), ⅛ entry
pattern, the rest max-min L∞ diversity (one per ledger in the first four). Rung promotion: ¼ centre net, ¼ robust net,
⅛ both-funded (protected strata), ⅛ entry pattern, the rest constrained rank; one per ledger; L∞ ≥ 0.02 (rung 2) / 0.03
(rung 3). Refinement moves: every active numeric input of the enabled books ±R/2 and ±R and every enabled optional
Growth rule OFF; robust start: the banded-best feasible move raising robust net by ≥ $2,000; profit start: the feasible
move with the highest centre net raising it by ≥ $2,000; both start: the same under need `all`; from an infeasible
start the move lowering the violation most by ≥ 0.01; endpoints refitted at rung 3. Shortlist (feasible, one per ledger,
L∞ ≥ 0.10): profit, robust, balanced (robust ÷ p90), both-Growth funded (protected), best V / G / B (informed), entry
alternative, gate alternative, then centre-net order; the five most profitable infeasible centres stay visible.

### 7.3 Budgets per arm (frozen, `budgets.ts`)

| Lane (per arm) | Distinct base proposals | Maximum with extensions | Composition |
|---|---:|---:|---|
| Independent, per cutoff | **8,192** | **16,384** | 2 replicates × [V 1,024 (screen 512 + 2 islands × 256) + G 1,024 + B 2,048 (screen 1,024 + 4 islands × 256)]; extensions up to 6 islands (V, G) and 12 (B) |
| Informed, C24 | ≤ 4,034 | ≤ 7,106 | 2 replicates × [designs ≤ 481 + 4 islands × 384]; extensions up to 8 islands |
| Rungs / refinement / shortlist | | | rung 2: V/G 12 × 64, B 16 × 64, informed 16 × 64; rung 3: 6/6/8/8 × 128; refinement one pass per start (the informed focus starts at C4 and C4-refined ≤ 2); shortlist V 3, G 3, B 4, informed 6 per replicate |

Across the three arms: base 3 × (4 × 8,192 + ≤ 4,034) ≤ 110,406 distinct proposals (the brief's 110,592 less the
informed designs the seed list does not fill), up to 3 × (4 × 16,384 + 7,106) = 217,926. Refinement moves are counted
apart. Fillers (if an island's start is short) are counted as proposals. **Refinement passes (a measured reduction, R1):**
the pilot showed refinement neighbourhoods are ≈ 2/3 of a lane's evaluations (≈ 11 evaluations per move, ≈ 120–200 moves
per start and pass), so every start makes one pass (3B: two) and the informed focus starts two (3B: four); identical in
every arm. Coverage implication: at most one accepted local move per start (two at the focus starts).

### 7.4 Simulation caps and the resource guard (the brief's 3,000,000 ceiling)

Frozen per-job caps on unique fresh simulations (all three arms together; a job exceeding its cap fails — an amendment
matter): engineering (stage V, bench, pilot) 320,000; each independent search job 415,000 (× 4); the informed search
370,000; each earlier-cutoff qualification 75,000 (× 3); the C24 qualification 110,000; each earlier-cutoff cross-test
25,000 (× 3); the C24 cross-test 60,000; diagnostics 30,000; the validation neighbourhoods 15,000; in-process fold,
diagnostic and validation runs are counted in their records. Sum of caps 2,865,000 ≤ 3,000,000. Archive hits are counted
apart.

**Resource guard (extension rounds).** Before an extension round the job checks: the evaluations its lanes requested so
far + the round's worst case (every new proposal plausible: 256 or 384 × 17 per extending lane) + a finishing reserve
of 8,000 per independent lane or 30,000 per informed lane ≤ the job cap. If not, every still-extending position stops with "resource guard" (all three arms
identically). **Coverage implication (stated before any result):** at the pilot's measured costs (≈ 300,000 evaluations
per cutoff for the base budgets of the three arms; ≈ 50,000 per full synchronized round) the independent caps allow about
two full rounds per cutoff, and the informed cap about one, before the guard binds — far below the nominal maxima (4
rounds for V/G, 8 for B). A search stopped by the guard with a trigger firing is **budget-bound**, never converged, and
the unexplored headroom is reported.

### 7.5 Synchronized extension and stopping (frozen; development progress only)

After its last base island, and after every extension island, each lane records whether that island raised by more
than **5%** its union hypervolume of (−robust, p90) against (0, $35,000), its best feasible rung-1 robust net or its best
feasible rung-1 centre net, or produced a **new feasible behaviour** (a funded-component pattern at the centre not yet
feasible in the lane). A **position** — the same cutoff, lane type, replicate and cell (informed: replicate) under L0, L1
and L2 — runs one more island in **all three arms** iff **any** of its three lanes fired, up to the common cap (6 / 12 /
8 islands) and the resource guard. Independent and informed budgets stay separate. Recorded stopping conditions: per
position "triggers not met", "extension cap reached (budget-bound, not converged)" or "resource guard"; per island
"budget", "stagnation", "no new configurations" or "generations". Progress per island (hypervolume, best robust, best net,
hypervolume gain per 10,000 evaluations) is recorded. No validation-based extension, no extra seeds after disappointment,
no extra tuning of any arm. Nothing is re-searched after a fold, a qualification, a cross-test or the validation.

## 8. Robustness instrument (`config.ts neighbourhood`, `qualify.ts`)

- **Radius:** D1 — Study 8's N1 radius in grid units (X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10, W ±20)
  per book; Growth — 10% of each box in value units rounded to the fine step, per book.
- **Draws:** one Latin hypercube of n rows over the 116 numeric columns per seed family (common random numbers across a
  cutoff's centres and across the three arms); a neighbour = centre + u × scale × radius for every active numeric input
  of the scope's enabled books, rounded to the grid, clipped to the box widened to include the centre (clipping
  counted); categorical inputs and the structure fixed; inactive inputs untouched; orders repaired; duplicates of the
  centre or of earlier rows dropped.
- **Families** (`deriveSeed('vg-lifecycle-matched-optimization', 'nbhd', …labels)`): rung 1 / refinement 16
  (`('r1', cutoff)`, `('refine', cutoff)`); rung 2 64, rung 3 128; **selection 2 × 128** (`('select', rep, cutoff)`,
  ranking and roles); **fresh confirmation 3 × 128 = 384** (`('confirm', rep, cutoff)`, qualification only, never
  ranking); small (0.5) and wide (1.5) 128 each (`('small', cutoff)`, `('wide', cutoff)`; export rows). The same draws in
  every arm (matching per-gene perturbations).
- **Statistics:** median, p10, p90 net; robust net = ½ median + ½ p10; median, p90, p95 DD (linear interpolation); breach
  count and share (DD > $35,000) with its Wilson 95% interval; mean excess among breaches; worst DD; worst-10% mean DD
  (mean of the ⌈0.1 n⌉ largest); distinct ledgers; draws equal to the centre; clipped draws. Report-only beyond the
  gates; perturbation frequencies on one history, not probabilities of future losses.

## 9. Qualification, roles and the primaries (`qualify.ts`, `folds.ts`)

### 9.1 Gates (all must hold; identical in every arm; 3B's)

| Gate | Requirement |
|---|---|
| Q1 | centre net > 0 |
| Q2 | centre maximum minute DD ≤ $35,000 |
| Q3 | fresh confirmation p90 DD ≤ $35,000 (the interpolated 0.9 quantile of the pooled 384 draws) |
| Q4 | fresh confirmation p10 net > 0 |
| Q5 | at 10 bps per side: centre net > 0 and centre DD ≤ $35,000 |
| Q6 | both families (D1 and Growth) receive capital at the centre (a combined candidate genuinely funds D1 and Growth) |

No activity floor, trade-count floor, equal-activity rule, annual-profit floor, concentration veto, automatic
worst-episode deletion or tail-severity gate. The audit's failed tail-severity, best-year-excluded and
top-episode-excluded formulas are **not** adopted. Near misses (failing only Q3, Q4 or Q5) are tabled with their
severity. Token participation (< 5% of the pool's funded principal-days) and unfunded enabled components are labelled.
Report-only stresses: 20 bps, 14% interest, +25 bps stop slippage, next-open stops; causal removals: without D1, without
Growth, without each symbol, without each enabled component.

### 9.2 Roles (per set; ranked on the selection families)

actual-profit = the highest centre net (ties: selection robust net, lower centre DD, label); robust-profit = the
highest selection robust net; balanced = the highest selection robust net ÷ selection p90 DD; lower-drawdown = the
lowest selection p90 DD among those with selection robust net ≥ 50% of the actual-profit holder's.

### 9.3 Sets and primaries (per arm)

- **Every cutoff:** `independent` (both replicates, all structures), `independent R1`, `independent R2` (seed-level,
  reporting only), `independent V/G/B`. At C19, C21 and C23 the **fold primary** = the `independent` actual-profit role.
- **C24:** `final` (selectable: the independent and informed shortlists and C4, C4-refined, C85, E, A, B under the arm's
  lifecycle), `informed`, `informed R1/R2`, `controls`, `final V/G/B`. **The arm's primary** = `final`'s actual-profit
  role; its **independent primary** = `independent`'s. D is evaluated (scope d1) as the comparator. No qualified member →
  "no qualified combined result" (a fold without a primary is flat in its slice).
- **Comparisons with C4 and C4-refined** (per arm, the same lifecycle's control evidence): dominates (centre net ≥,
  centre DD ≤, confirmation p10 ≥, confirmation p90 DD ≤, one strict), higher-profit trade-off, stronger local stability.
  They are reported, never selection inputs; C4 and C4-refined are never modified.

## 10. Chronological procedure tests (independent lanes only)

| Cutoff | Training door | Committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- **Fold exports (frozen rule):** per arm, the `independent` set's four role holders and each replicate's actual-profit
  holder. Every exported phenotype is evaluated on the slice under **all three** lifecycles (report-only cross rows),
  and C4, C4-refined and D descriptively.
- **Sequential paths — one separate continuous path per arm:** the arm's fold primaries trade their slices in turn under
  the arm's lifecycle (flat without one), each slice from a continuous run on the evaluation door (actual and virtual
  positions and L2 state carried from 2016; nothing reset at the boundary); a switch between different configurations at
  a boundary is charged 5 bps on $100,000 per open lot it closes or adopts. No lifecycle is chosen per slice; no fourth
  switching policy exists. Reported per arm: net, charges, the strict minute DD of the concatenated slice marks with
  peak/trough/recovery and the lots open in the major drawdowns; the same for each role, each replicate alone and the
  controls.
- **Verdict (frozen, per arm):** *chronologically supported* iff every fold produced a primary, the sequential net > 0
  and the sequential minute DD ≤ $35,000; *incomplete* if a fold had none; *unsupported* otherwise. A failed path stays a
  failure even if the final informed candidate looks attractive.

## 11. Comparison rules, cross-tests, diagnostics, the frozen selection and the validation

### 11.1 Frozen evidence labels (`labels.ts`; development and folds only; computed in the frozen selection)

For X ∈ {L1, L2} against L0, with the report-only materiality band B = $2,500:
- **Dev:** ΔF = X's primary centre net − L0's; ΔR_r = X's replicate-r independent best − L0's (r = 1, 2; seed-paired);
  ΔP10 = X's primary confirmation p10 − L0's. '+' iff ΔF > B, ΔR_1 > 0, ΔR_2 > 0 and ΔP10 ≥ −B; '−' iff ΔF < −B,
  ΔR_1 < 0, ΔR_2 < 0 and ΔP10 ≤ B; '0' iff |ΔF| ≤ B; else 'mixed'.
- **Risk:** 'worse' iff X's primary confirmation p90 DD or centre DD exceeds L0's by > B; 'better' iff its p90 DD is
  lower by > B and its centre DD not higher by > B; else 'same'.
- **Chron:** '+' iff X's sequential verdict is supported and (L0's is not, or X's sequential net > L0's + B); '−' iff
  L0 supported and X not, or the same verdict and X's net < L0's − B; else '0'.
- **Label (first match):** *repeatable improvement* (Dev '+', Chron '+', Risk not worse); *harmful* (Dev '−' and Chron
  not '+'; or Chron '−' and Dev not '+'; or Dev '0', Chron '0', Risk worse); *no material difference* (all '0' /
  same); *conditional profit/risk trade-off* (Dev '+' and Chron not '−'; or Dev '0' with Chron '+' or Risk better);
  *inconclusive* (everything else).

Validation is reported beside the label and never changes it; no winner is reclassified after validation.

### 11.2 The cross-test matrix (`crosstest.ts`; report-only)

- **Export set (frozen rule, sealed as `results/crosstest/<cutoff>/exports.json` before any cross-test evaluation):**
  C24 — per arm the `final` set's four role holders, the independent and informed actual-profit holders, each
  replicate's independent actual-profit holder and the final best V, G and B; earlier cutoffs — the fold exports (§10).
  Rows = the union over arms (one row per exact phenotype) + the fixed controls (C24: C4, C4-refined, D, C85, E, A, B,
  IP, GP85; earlier: C4, C4-refined, D).
- **Every row × L0/L1/L2:** the centre on the cutoff's training door. **Principal rows** (each arm's primary — at C24
  also its independent primary — and, at C24, C4 and C4-refined): the fresh confirmation family (identical draws in
  every column) and a causal rerun with the cell's own leading winning episode blacked out. C24 export rows also get
  the small and wide families under their own lifecycle(s).
- **Decomposition (report-only):** for X's and L0's primaries p_X, p_0: total = v(p_X, X) − v(p_0, L0); lifecycle effect
  = v(p_0, X) − v(p_0, L0); phenotype effect = v(p_X, L0) − v(p_0, L0); interaction = the remainder; v = centre net, and
  the confirmation median for principal rows. The driver is the largest component when |total| > B. "Within search
  variability" iff |total| ≤ the larger replicate spread. "Concentrated in one episode" iff, with each cell's leading
  episode blacked out, the total changes sign or falls below half. The same for the independent and fold primaries.
- Cross-tests never select, tune or swap a primary. If a book gets no funding or no refusals, lifecycle equality is
  expected and is never counted as evidence for a funding rule.

### 11.3 Diagnostics (`diagnostics.ts`; D24; report-only; sealed before the frozen selection)

For each arm's primary and independent primary, C4, C4-refined and D, **under every lifecycle**: the funded-lot ledger
with each lot's source; the Growth request log (granted / refused / waiting by kind); L2's retained opportunities
(waits, gate blocks, expiry, invalidation, supersession, entries); refusals with occupants; the canonical decision
outcomes of each Growth book (signals, filter and eligibility vetoes, deferrals, fills); pool time (held / reserved /
idle closes); L0's unfunded virtual holds with their idle overlap; holding periods; the deepest drawdown episodes;
matched lots (newly admitted, displaced, retimed; reconciled) against the same phenotype under L0 and, for the arms'
primaries, against L0's primary. Hypothetical trade profits are never summed as achievable; a late entry uses the
actual later price, stop and clock. **Episode dependence** (the audit's lesson, reporting only): for each arm's C24
primaries and fold primaries, its 128 selection rep-1 neighbours rerun under its lifecycle — the share whose leading
winning episode overlaps the centre's, the distribution of their net share earned by lots entered inside the centre's
leading window (net ≤ 0 counted apart), distinct ledgers and clipping; no overlap threshold gates anything.

### 11.4 The frozen selection (`FROZEN_SELECTION.json`, sealed and committed before FULL opens)

Every arm's C24 primary and independent primary with complete effective settings; every set's roles, rank orders and
Pareto sets; the seed-level roles; the C4 / C4-refined comparisons; the near misses; the consideration fields of A, B, E;
the fold selections' and the sequential record's pins and verdicts; the cross-test subjects and record; the diagnostics'
pin; **the frozen evidence labels**; the code and data pins; the validation plan.

### 11.5 Validation (FULL, once, under the guard; no futility stop)

Every cross-test subject (the C24 export rows and the fixed controls) under L0, L1 and L2, and VG #2 native: one
continuous run 2016-01-04 → 2026-10-30. Reported: validation P&L with its realized/unrealized parts, the reset
validation DD, the whole-run DD and their dates, 2025 and 2026, lots after the boundary, positions crossing it, open
remainders, refusals. **V1** validation P&L > 0; **V2** reset validation DD ≤ $35,000; **V3** whole-run DD ≤ $35,000.
Report-only: 10 / 20 bps and 14% interest, and the fresh confirmation rep 1 (128 draws) on FULL, for each arm's primary
and independent primary (own lifecycle) and C4 / C4-refined (every lifecycle). Known targets compared here only: C4 (L0
development $302,785.91; validation $99,081.34 / reset DD $21,536.85; full $401,867.24 / $21,536.85), C4-refined (L0
validation $91,512.65 / $19,477.66; full $452,082.36), VG #2 native ($334,911.93 / $21,303.61) and 5A's full-history
L0/L1/L2 figures of C4, C85, E, A, B, GP85, IP and D. A failed validation is a result: no new winner, no rescue search, no
retuning, no relabelling.

## 12. Engineering gates (stage V, `parity.ts`; sealed `results/parity/parity.json` before the freeze; a failure stops every dependent stage)

| Gate | Requirement |
|---|---|
| V1 | L0 reproduction through this study's path: D, C4, C85, E, A, B, IP, GP85 = 5A's sealed L0 centres field for field; C4-refined and the three 3B seeds = 3B's sealed C24 evidence centres; the fast and detail L0 paths agree; VG #2 native = $260,223.13 / $17,280.74 / 36 lots / 14 refusals; harmonized = $268,487.02 / $20,801.07 |
| V2 | L1/L2 reproduction: the same eight 5A subjects = 5A's sealed L1 and L2 centres field for field |
| V3 | Path identity on 48 random configurations (16 per structure, D24): L0 fast = detail; L1/L2 `runLife` = 5A's `runCoupled` (record, funding records, rounds, Growth simulations) |
| V4 | Stress identities: a lifecycle Growth book whose every request is granted = the canonical book under each stress (both symbols); standalone Growth pools under each stress identical under L0/L1/L2 and never refused |
| V5 | Single-family identities: D and random D1 pairs identical under L0/L1/L2; standalone Growth books identical, never refused, equal to the canonical book |
| V6 | Causal prefix: random configurations under L0, L1, L2 on D19, D21, D23 = their D24 runs through the shorter door (funding records, Growth requests, lots and fills, daily marks) |
| V7 | The fixed point on random configurations under L1/L2: identical from three starting guesses (occupancy, all available, all refused); rounds ≤ requests + 1; consistent with Priority 3's independent reference pool (funded and refused sets, net and DD within $0.005); failure detection (a forced wrong answer never converges and throws; a round cap below the needed rounds throws) |
| V8 | Accounting on every run above: Σ lot nets = net, Σ lot interest = interest, Σ lot costs = costs, peak principal ≤ $100,000, lots never overlap (one slot), realized + unrealized = net |
| V9 | The archive key carries the lifecycle |

**Synthetic tests** (`npm test` subset, recorded in the checkpoint): this study's `tests/` (labels, decomposition,
strata, inclusion-preserving refinement, paired seeds, symmetric budgets, caps, control identities, minimum-strength
eligibility under L0/L1/L2, L2 supersession, the eligibility documentation evidence); Priority 5A's lifecycle tests
(refusal/release, zero and fresh crossings, repeated refusal, native-eligibility consumption, breakout decisions, L2
entry/waiting/5% guard/invalidation/expiry, a next-open gap across a year boundary, precedence, no continuation from an
unfunded profit, a two-book tie); Priority 3's pool tests (calendars, reservations, simultaneous decisions, partial
exits holding the slot, gap exits, year boundaries, period drawdowns, open remainders). The full `npm test` runs once
in a contained unit; known pre-existing failures are distinguished from regressions.

## 13. Resources and recoverability

- **Containment:** every heavy stage is a transient systemd user unit inside `vglmo.slice` with **MemoryHigh=44G,
  MemoryMax=48G, MemorySwapMax=0** (re-applied before every launch; the unit carries the same limits, `KillMode=mixed`,
  `Restart=no`); heavy units run one at a time; Claude and tmux outside.
- **Execution (bench, `.cache/…/pilot/bench/`):** the L0/L1/L2 mix on D24 ran 56.3 / 57.2 / 57.0 evaluations/s at 12 /
  14 / 16 workers (peak 8.3 / 9.7 / 11.0 GB): **14 child-process workers** (`--expose-gc`, 1.5 GiB old space), one door
  each, started four at a time; a full GC every 64 evaluations or above 256 MiB of ArrayBuffers; ≤ 2 tasks in flight per
  worker; queue chunks ≤ 4,096; Priority 3's per-worker book caches (48); a per-job SQLite archive (WAL; LRU ≤ 100,000)
  bound to the study, job, door pin and evaluation digest; duplicate concurrent keys submitted once (3C's fix); a
  10-second memory monitor; **dispatch stops at 36 GiB** of job cgroup memory (in-flight work finishes, the archive
  commits, exit 75).
- **Recoverability:** every evaluation is archived as it returns; a checkpoint (stage, island, generation, RNG state,
  counters, extension round) at every generation boundary and at least once a minute; a rerun of the same command replays
  deterministically from the archive (a kept lane result must equal its replay; extension decisions are taken at
  barriers, hence identical). A worker death fails the job promptly (its in-flight tasks dropped); no automatic restart;
  no OOM restart loop. Each job keeps `runs.jsonl` (fresh evaluations per run, so retries are disclosed).
- **The pilot** (pilot budgets, `pilot-` job names, the pseudo-fold P18 on D19, outputs in the cache): every stage path;
  a straight run; a graceful stop then resume; a worker SIGKILL then resume; a unit SIGKILL then resume — identical lane
  results; a duplicate-key concurrency check.

## 14. Integrity

The freeze records this file's, the amendments', the brief's, the adoption and the control manifests' sha256, the
sealed engineering gates, the evaluation digest (the import closure of the worker) and Priority 3's, the code closure and
its digest, the door pins, the canonical data, git `HEAD`, the budgets, caps and resource contract. Stages refuse to run
unless the preflight passes, the freeze is sealed and committed, the engineering gates are sealed with 0 failures and the
evaluation code is the frozen one. Records are sealed write-once (0444; `results/seals.jsonl`; `npm run vg-lmo --
verify`). Fold selections are committed before their slices; `FROZEN_SELECTION.json` before FULL. The checkpoint is
`RESEARCH_RECOVERY.md`. **Code completed after the freeze** (declared now): the stage code for qualification, folds,
cross-tests, diagnostics, the frozen selection and the validation is implemented and piloted before the freeze; report
tables are produced by `tools/vg-lifecycle-matched-optimization/` (outside the pinned code). Any later change of the
study code is an operational amendment (`O*`) with the new closure digest before the next stage runs; the evaluation
code never changes.

## 15. Reporting commitments

- **Format:** written analysis, Markdown tables and machine-readable results only (standard 2.0.0 §7.7); dollars with
  commas and two decimals; complete effective parameters for every frozen phenotype, control and lifecycle.
- **Tables:** development, validation and full history separately for every frozen member and control per lifecycle —
  net (realized / unrealized), maximum minute DD in dollars and % of the fixed $100,000 with dates, exposure and
  principal-days, trades and episodes, wins/losses, holding periods, interest and costs, open marks, refusals.
- **Search:** matched center proposals and actual backend costs per arm (equal proposals do not imply equal CPU), coverage
  by structure and class, distinct configurations and ledgers, promotion attrition, extensions and stopping causes,
  seed-level results, resources per arm.
- **Evidence:** selection and confirmation statistics with tail severity (p10/median net, p90/p95 DD, breach share and
  Wilson interval, mean excess, worst-10% mean, worst DD), stresses, causal removals, participation and token labels,
  episode dependence and clipping, the cross-test matrix and the decomposition, the mechanism chain.
- **Answers** to the brief's six questions; the frozen labels; limitations (previously examined history; one history
  dominated by few episodes; local stability is not chronological reliability; historical compliance is not a
  guarantee). No deployment approval is implied.

## 16. Documentation and roadmap (part of the delivery)

- **Eligibility documentation correction** (not an engine change): `docs/strategy-lab/GROWTH_ENTRY_GATES.md` §3.1 and
  §8 state that without a trend filter eligibility ON = OFF / changes nothing. Verified against the engine
  (`entryGates.ts`), its canonical tests (`entryGates.test.ts` "eligibility ON with nothing blocking …", every policy at
  its defaults; `drawdownGate.test.ts` "eligibility ON: … decided at the … release") and this study's synthetic test: an
  armed opportunity is evaluated at its arming bar, and ON = OFF trade for trade only when **no blocker is active** (no
  trend filter, no Drawdown Recovery Gate, an initial risk stop OFF or available) **and** the policy is valid at every
  arming bar — always for policies 1, 3, 4 and 5, and for policy 2 when its minimum a ≤ X; with a > X a crossing whose
  own advance is below a is invalidated at once. The sentences are corrected to that statement (no other claim changes).
  The optimization standard is not edited.
- **Roadmap:** the process audit complete; this matched lifecycle experiment recorded as the approved next study (5B),
  separate from the failed ranking-formula audit; 5A complete and unchanged; after this study's review, Growth
  suitability screening for other ETFs is the next planned stage, then focused optimization of promising ETFs; 4B and
  broader allocation / reassessment / preemption studies deferred and not prerequisites; nothing starts automatically.
