# Protocol — Priority 4A: standalone GDX Growth optimization

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
substantive search). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

**Written before any search, qualification, selection, fold or validation result of this study existed.** Known before
it: the prior studies' sealed records and reports (§2); this study's sealed control manifest; the **sealed engineering
gates** (`results/parity/parity.json`, 294 checks, 0 failed), which include the 2016–2024 standalone centres of the 14
controls (§2); the throughput bench (timings, memory, the share of plausible random centres); and the engineering pilot
on the pseudo-fold P18 (D19, pilot budgets; `results/pilot/PILOT.md`: every stage path, the interruption tests with
identical resumption, the duplicate-key test, mechanics, timings and memory; amendments R1–R2).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` (the registered current version; registry checked 2026-11-10T16:49Z) |
| Read / adopted (UTC, from `date -u`) | read in full 2026-11-10T16:49Z–16:58Z (with the registry, the template, the adoption template, the roadmap, `CLAUDE.md`, `AGENTS.md` and the context-recovery guide) / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/gdx-growth-standalone/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/gdx-growth-standalone`; every stage, the pilot included, calls `requireStandardAdoption` in code before it runs) |
| Scope | `optimization` |
| Brief | `research/gdx-growth-standalone/brief/BRIEF.md`, sha256 `b7a784210452f59bf30622f68ca48be86bb75edeaa8d8bd1bd371a3f5cfcbac6` (the user's Priority 4A brief of 2026-11-10; 145 lines, read in full through "Stop after delivery for user review.") |
| Branch / base commit | `research/gdx-growth-standalone` in the main checkout, from `b7ebfdc6` (the pushed end of Priority 3C, which contains standard 2.0.0 and every reused runner); code `src/gdx-growth-standalone/`; `npm run gdxg -- <command>` from the repository root |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5, §3.2 | adaptation | The formal primary is the **actual-profit** role of the C24 selectable set: the independent and informed shortlists **and** the qualifying informed controls (Appendix A, P01–P13) under the same gates — so a qualifying incumbent holding the highest centre net is the primary (the qualifying-incumbent fallback, §3.2 option a). The independent lane's own actual-profit holder is identified separately (the independent primary) for the chronological assessment. Robust-profit, balanced and lower-drawdown are reported as substantive alternatives. | — (brief "Selection, risk and strength of evidence") |
| AD2 | §4.1, §2.4, §4.3 | adaptation | Study 8's pipeline on the Growth·GDX genome only (58 genes at the schema's fine step) as Priorities 3, 3B and 3C used it: protected entry cells (rise, breakout) with 64 / 32 protected structural strata; promotion reserves ¼ for centre net and ¼ for constrained rank (screen) or robust net (rungs), the rest diversity or rank; the shortlist keeps profit, robust, balanced, gate-alternative and exits-alternative slots. | — |
| AD3 | §5.3 | adaptation | One perturbation scope (the book itself; it is the whole portfolio) with common random numbers across every member of a cutoff (the matched instrument). Priority 5A's standalone family-level instrument (its own namespace) is added at C24 as a **report-only** matched comparison with 5A's published standalone figures; it is never a gate or a ranking input. | — |
| AD4 | §4.1, §5.3 | adaptation | Centre-first fidelity (as 3B and 3C): a rung-1 or refinement proposal whose centre is not plausible (net ≤ 0, centre DD > $35,000 or no GDX lot) gets no neighbours and is infeasible; rungs 2 and 3, qualification and confirmation always evaluate every neighbour. | — |
| AD5 | §5.1 | adaptation | Priority 3's pooled engine is reused **unchanged** with only Growth·GDX enabled (a single book is never refused, so the pooled run is the canonical standalone run); gates E1–E7 (§12) re-verify it trade by trade against the canonical `runRiseTrading` + `summarizeSimulation` path. | — |
| AD6 | §1.4, §1.6 | adaptation (stricter) | FULL is never opened before `FROZEN_SELECTION.json` is sealed and committed, not even for Appendix A's known full-history target (the brief: "reproduce the full-history target only at the frozen final stage"). | — |
| AD7 | §4.5 | adaptation | Extension triggers finer than the 5% defaults (3C's): best feasible rung-1 centre net + $2,000, best robust net + $2,000, hypervolume > 1%, or a **new competitive feasible stratum** (a stratum with no feasible rung-1 member becomes feasible with a best centre net ≥ 50% of the lane's best feasible centre net). | — |
| AD8 | §1.8, §1.9, §3.3 | adaptation | The informed lane runs at C24 only (its seeds carry later data); the earlier-cutoff repeats run the complete **independent** search and selection with the same budgets and extension policy. Appendix A appears at the earlier cutoffs only as a descriptive, non-selectable comparator. | — (brief "Dates, data access and chronological testing") |
| AD9 | §4.7, §2.7, §2.9 | adaptation | Not applicable as written: one component (Growth·GDX) has no capital competitor. Participation attribution is replaced by the GDX decision funnel (signals, filter and gate blocks, eligibility arming / expiry / invalidation, signals during the book's own position), as the brief directs. | — |

No departure from an [M] rule.

## 1. Question, objective and outcomes

- **Question** (brief). Can Growth produce a profitable **GDX-only** phenotype with a stable parameter neighbourhood
  and credible performance across successive periods, within the agreed risk budget — a maximum minute drawdown of
  **$35,000 on one fixed $100,000 principal budget** (35% of fixed principal, not of peak equity)?
- **Objective.** Actual net profit (realized + marked unrealized, after costs and interest) of the standalone GDX Growth
  account, assessed beside neighbourhood risk and stability; historical compliance does not guarantee future drawdown.
- **Primary-selection rule** (AD1): the highest development centre net among qualified members of the C24 selectable
  set; ties by the higher selection robust net, the lower centre DD, then the label (Priority 3's `profitOrder`).
  **Roles** (§9.3): actual-profit, robust-profit, balanced, lower-drawdown, ranked on the selection families; the fresh
  confirmation families decide qualification only.
- **Pareto set:** centre net ↑, centre DD ↓, selection p10 net ↑, selection p90 DD ↓ (qualified members).
- **Valid outcomes:** a searched primary; a qualifying control as primary (the fallback); **no supported standalone
  candidate** (no member qualifies); a primary that fails validation; a chronologically unsupported procedure. A
  negative result is a result; no winner is manufactured.

## 2. Prior knowledge and provenance

- **Already examined** (2016-01-04 → 2026-10-30): Priorities 3, 3A, 5A, 3B and 3C, growth140 and the user's browser.
  - **Appendix A** (`07cac3329fc7a520`, browser-selected with 2016–2026 in view): standalone development $53,816.50 /
    DD $17,709.96 / 13 lots (5A, re-verified here, E2); standalone 2025–2026 P&L **$87,340.87** and full history
    $141,157.37 / $17,709.96 (5A's full table and Priority 3's Appendix A target — both known); 5A's standalone
    neighbourhood: median −$10,436.77, p10 −$26,071.59, p90 DD $52,938.76, 52.1% of draws above $35,000 ("locally
    fragile"); its timing cliff (trailing stop 7% → 7.3%, 3A).
  - **The prior GDX vectors** (P01–P13): their pooled development and validation results in 3B and 3C (3C's R/O
    partners added little or nothing in 2025–2026 beside their anchors; 3B's G books' pooled validation); their
    **standalone development centres** became known through gate E3 before this protocol: P07 $126,406.73 / $18,500.58,
    P08 $121,008.75, P09 $100,056.17, P13 $55,345.40, P01 $34,751.49, P03 $34,911.79, P06 $34,872.80, P04 $33,223.29,
    P02 $17,327.01, P05 $15,362.24, P10/P11 $6,772.78, P12 $6,927.65. Their standalone validation is unknown.
  - The user **declined** 3C's GDX partner (not adopted beside C4-refined or C4); its vectors are research controls and
    informed seeds here, never approved additions.
- **Therefore 2025-01-02 → 2026-10-30 is validation on previously examined history, not an untouched holdout**:
  Appendix A, the instrument, the design and prior outcomes (including Appendix A's own standalone validation) are known.
- **Provenance:** Appendix A — browser (later data); P01–P09 — 3C's C24 role holders (pooled, 2016–2024, beside anchors
  chosen with later data); P10–P13 — 3B's C24 inclusion-G/B role holders (pooled, 2016–2024, beside VG #2's D1 books).
  All are **informed**; none ever enters the independent lane.

## 3. Data, doors and windows

- **Canonical file** (git-ignored, pinned): `data/GDX/data.csv` sha256 `77dba9b2…5049`, 2016-01-04 → 2026-10-30, last
  row 2026-10-30T23:59Z (the dataset report's `lastTimestamp`; identical to Priority 3's pin). The reused door loader also
  reads `data/VGT/data.csv` (`2ee06310…412e`) for its common calendar; no VGT book is ever enabled.
- **Common complete endpoint: 2026-10-30.** November–December 2026 do not exist and are never implied.
- **Doors:** Priority 3's physical byte-prefix doors D19 (→ 2019-12-31), D21 (→ 2021-12-31), D23 (→ 2023-12-29), D24
  (→ 2024-12-31), each verified by size, sha256 and last row before parsing (`npm run gdxg -- doors`). FULL opens only
  behind this study's sealed and committed `FROZEN_SELECTION.json` (and Priority 3's frozen-selection guard). Every
  opening is logged in `results/doors.jsonl`.
- **Windows:** development 2016-01-04 → 2024-12-31 (all search, refinement and selection); validation 2025-01-02 →
  2026-10-30; earlier cutoffs C19, C21, C23 (§10).
- **Continuity:** every run is one continuous causal run from 2016-01-04; nothing is liquidated or reset at a boundary.
  Validation P&L = the marked net at 2026-10-30 − the marked net at the 2024-12-31 close; the reset validation DD and
  the whole-run DD are both reported.

## 4. Controls, incumbents and comparison arms

`CONTROL_MANIFEST.json` (sealed 2026-11-10T17:07:19Z, sha256 `f59ca6f6…e912`, before any evaluation): complete
effective vectors, inactive-field treatment, identities and source pins.

| Key | Configuration | Role | Source (sha256-pinned) |
|---|---|---|---|
| **A** | Appendix A `07cac3329fc7a520` (Rise 3% / 22 bars; trend price change 30 / −2%; eligibility time-limited 20; recovery gate 60 / 10% / 49% / 2; trailing stop 7%; hold OFF; initial stop 2 × ATR(20); retention OFF; shallow-pullback continuation 60 / 50 / 10 / 0% / 1.5–8% / 2%) | exact control; selectable at C24; descriptive at C19–C23 | Priority 3 `CONTROL_MANIFEST.json` `incumbents.appendixA.effective` |
| P01–P09 | 3C's C24 role holders of arms R, O, G (9 distinct Rise books) | prior controls / informed seeds; selectable at C24 | 3C `FROZEN_SELECTION.json` (`ef1da770…031e`) |
| P10–P13 | 3B's C24 inclusion-G role holders (3 breakouts) and inclusion-B role holder (1 Rise), GDX book funded at its centre | prior controls / informed seeds; selectable at C24 | 3B `FROZEN_SELECTION.json` (`f7629968…422e`) |
| CASH | no position | zero reference; never selectable | — |

- **Prior-set rule** (frozen in the manifest; development roles only, no validation figure read): (a) every distinct
  GDX vector holding a formal role in 3C's C24 role sets of arms R, O, G; (b) every distinct GDX vector holding a formal
  role in 3B's C24 inclusion-G and inclusion-B role sets whose GDX book was funded at its development centre.
- **Appendix A reproduction:** development parity first (E2: 5A's sealed L0 centre of "SG alone", field for field);
  the native full-history target ($141,157.37 net, $17,709.96 maximum minute DD, 19 closed trades 17 / 2, flat at the
  end) only in the frozen validation.
- **Not benchmarks:** VGT Growth #4 and `08500a60` are methodological context only (5A's instrument figures are quoted
  report-only); their post-cutoff information never enters an independent GDX lane.
- **Method arms:** not applicable (one component, no pooling); the informed and independent lanes are separately
  budgeted and labelled; no method-superiority claim is made.

## 5. Engine and conventions

- **Engine:** Priority 3's pooled engine, unchanged (`src/vg-d1-growth-joint/evaluate.ts`, `pool.ts`, `books.ts`,
  `data.ts`; evaluation digest `147cad7c…4e88`), with **only Growth·GDX enabled**: Growth 1.4.0's `runRiseTrading` body
  on the door's GDX Dataset and daily bars through the Strategy Lab request mapping; a single book is never refused;
  D1·GDX, D1·VGT and Growth·VGT are disabled (Priority 3's placeholders, never run or funded). Growth 1.4.0 is the
  canonical Growth behaviour; no production engine change.
- **Economics:** one fixed $100,000 principal budget, no compounding; 5 bps per executed side; $0 commission; 11%
  simple annual interest on outstanding principal by calendar day (365-day year); stops at the stop or the gapped open;
  fractional shares; price only. Canonical sizing, partial exits (retention), repayments, reservations (a decision
  reserves the slot until its fill), minute marks and execution.
- **Native → harmonized:** Appendix A's native (browser) run — 2016-01-04 start, no warm-up history (indicators start
  from the first session), forward split adjustment (no GDX split event exists in `config/market-events/splits.json`,
  so prices are unadjusted), funding from the first session — **is** the harmonized convention here: nothing differs
  (no D1 arming date applies). The pooled and canonical paths are proven equal (E3).
- **Signal resolution and accounting:** daily signal bars (1d) and minute-based execution and marks, as the engine
  defines them; nothing suppresses opportunities to match a prior pooled trade calendar.
- **Funding lifecycle:** L0 is irrelevant for one book (no refusal); the causal no-new-funding rerun (§11.1) uses the
  engine's blackout: decisions inside the window are refused and the book's virtual state continues (L0 semantics).

## 6. Space (`src/gdx-growth-standalone/space.ts`)

### 6.1 Genes and boxes

- **8 structural genes:** entry Rise | breakout; trend filter off | price change | regression slope | rising SMA |
  higher highs/lows | momentum; native persistent eligibility (Rise only) off | time-limited | minimum strength |
  maximum extension | deterioration | reset-renew; drawdown-recovery gate off | on; exits: maximum losing hold OFF | ON
  without loss buffer | ON with loss buffer; initial stop off | on; trend retention (partial exit) off | on;
  continuation off | classic D1 | breakout | shallow pullback | MA cross. The trailing stop is mandatory.
- **50 conditional numeric genes** on growth140's canonical boxes (`src/growth140-vgt-s8m/space.ts`): the Growth 1.4.0
  schema's own `search` hints where it has them, growth140's declared ranges otherwise (e.g. advance 1–20%, lookback
  10–250 bars, trailing stop 3–15%, maximum hold 3–30 days, loss buffer 0–6%, continuation window 10–200 sessions). They
  were set for Growth generally and are **not narrowed around any GDX winner**. Every value lies on the schema's fine
  step (0.1 percentage point, 1 session or bar; 0.05 where the coarse step needs it), so Appendix A and P01–P13 are
  exactly representable (checked).
- **Omissions (declared):** values outside the boxes (the schema allows e.g. trailing stops to 50% and holds to 3,650
  days; the boxes keep the meaningful canonical ranges); whole-share sizing, costs and interest (economics, not genes);
  Growth 1.4.0 has no trade-spacing input. Every switch is searched in both states and every method / policy is
  available; not every Cartesian combination is screened (§6.3).
- **Dependencies (canonical):** eligibility needs Rise; the loss buffer needs the maximum hold; method inputs are
  active only under their method; momentum S < L is repaired; inactive inputs are absent from the effective vector.

### 6.2 Identity and equivalence

- **Identity** = sha256(16) of the enabled mask and Priority 3's canonical quad text (3C's `pointId`); the GDX vector's
  browser identity (`gId`) is kept beside it. Inactive genes never create a second configuration (E6); duplicates are
  never evaluated twice in a job.
- **Behavioural equivalence:** the funded-lot ledger signature. Promotions and shortlists keep one configuration per
  ledger and never one with cash's (empty) ledger. Distinct configurations, distinct ledgers and cash-equivalent
  proposals (a book that never trades) are counted and reported.

### 6.3 Cells and protected strata (coverage plan)

- **Independent cells:** rise and breakout, each with its own protected budget.
- **Screen strata (round-robin within a cell):** recovery gate off/on × trend filter off/on × (Rise) eligibility
  off/on × maximum losing hold off/on × initial stop off/on × retention off/on — **64 Rise strata, 32 breakout strata**;
  an "on" stratum keeps the quasi-random method, policy or buffer if it is one, otherwise method 1 + (round mod its
  count). Continuation (5 options), the trailing stop and every numeric input stay quasi-random and are reported per
  class.
- **§4.7:** not applicable (one component; AD9).

## 7. Search, budget and stopping (`search.ts`, `budgets.ts`, `stages.ts`)

### 7.1 Lanes

- **Independent** (every cutoff; `C<yy>/indep-rise`, `C<yy>/indep-breakout`): a Latin-supercube scrambled Sobol screen
  of the GDX genome (this study's namespace; entry pinned; strata round-robin) → plausibility (centre net > 0, centre DD
  ≤ $35,000, ≥ 1 GDX lot) → promotion (§7.3) → rung 1 (16 draws, centre-first) → NSGA-II islands with the frozen
  extension rule → rung 2 (64) → rung 3 (128) → refinement → the cell shortlist. **No incumbent, prior vector, archive
  seed or range derived from a later-selected setting ever enters** (the boxes are the canonical ones; the seeds are
  this study's fresh labels; promotions use only the lane's own development fits).
- **Informed** (C24 only; `C24/informed`): Appendix A and P01–P13 unchanged, plus per seed 8 **fine** (scale 0.5), 16
  **near** (1.5) and 16 **broad** (3) designs (GDX moves of the instrument's radius) → rung 1 → islands (entry free) →
  rungs → refinement (the robust and profit starts **and Appendix A itself**, each with its fine-step moves) → the lane
  shortlist.
- **Separate jobs and accounting:** each lane is its own job with its own archive (`search-<cutoff>-independent`,
  `search-C24-informed`); nothing flows between them.
- **Order:** C19 search → qualify → seal and **commit** the fold selection → fold evaluation; then C21; then C23; the
  sequential policies; then C24 independent search → C24 informed search → C24 qualification → diagnostics → frozen
  selection (committed) → validation. A fold evaluation never feeds a later search; no earlier cutoff runs after a later
  cutoff's selection exists (guard in code).

### 7.2 Islands, promotion, refinement and the shortlist (3C's, unchanged unless stated)

- **NSGA-II islands:** binary crowded tournaments on (−centre net, −robust net, p90 DD) with constraint domination;
  categorical genes: uniform crossover (p 0.9), random reset with probability 1/(free categorical genes); ordinal genes:
  SBX (η 15, p 0.9) and polynomial mutation (η 20) on grid indices of the active inputs; (μ + λ) survivors, population
  64; every child fitted at rung 1 (centre-first). Islands split the rung-1 archive by rank order; Latin fillers of the
  cell when short. **Stagnation:** 8 generations without a 1e-3 relative gain of the island's hypervolume of
  (−robust, p90) against (0, $35,000) or of the lane's best feasible centre net.
- **Screen promotion** (256 per cell): ¼ by centre net among the plausible, ¼ by constrained rank on (−net, DD), the rest
  max-min L∞ diversity; one configuration per funded ledger, never cash's ledger.
- **Rung promotion** (24 to rung 2, 8 to rung 3): ¼ centre net (feasible), ¼ robust net (feasible), the rest constrained
  rank; one per ledger; picks at L∞ ≥ 0.02 (rung 2) / 0.03 (rung 3).
- **Refinement** (16 draws, centre-first): ≤ 2 passes over the moves (every active input ±R/2 and ±R at the fine step;
  every enabled optional rule OFF). Robust start: the banded-best feasible move raising robust net by ≥ $2,000; profit
  start: the feasible move with the highest centre net raising it by ≥ $2,000; from an infeasible start, the move
  lowering the violation most by ≥ 0.01. Endpoints are refitted at rung 3.
- **Shortlist** (per cell 5, informed 6; feasible only, one per ledger, never cash's ledger, picks at L∞ ≥ 0.10):
  profit, robust, balanced (robust ÷ p90), gate-alternative, **exits-alternative** (a different maximum-hold × retention
  structure from the profit pick), then centre-net order. The five most profitable infeasible centres stay visible.

### 7.3 Budgets (frozen; `budgets.ts`)

| Lane | Base new distinct centre proposals | Composition (base) | Cap with extensions | Rungs 2 / 3 | Shortlist |
|---|---:|---|---:|---|---:|
| **Independent**, at each of C19, C21, C23, C24 | **16,384** per cutoff | per cell: screen 4,096 + 4 islands × 1,024 | **32,768** (12 islands per cell) | 24 × 64 / 8 × 128 per cell | 5 per cell |
| **Informed**, C24 only | **8,192** | seeds + designs (14 × 41 − duplicates) + 4 islands sharing the remainder | **16,384** (+8 islands × 1,024) | 24 × 64 / 8 × 128 | 6 |

- 73,728 base proposals across the study (16,384 × 4 + 8,192), at most 147,456 with every extension, plus refinement
  moves (counted apart). The exact per-cutoff plan is recorded in the freeze (`npm run gdxg -- plan`).
- **Evaluation caps** (fresh evaluations; archive hits counted apart; a job exceeding its cap fails — an amendment
  matter): independent search ≤ 750,000 per cutoff; informed search ≤ 400,000; qualification ≤ 120,000 per cutoff;
  validation neighbourhoods ≤ 10,000; **total ≤ 4,000,000** including every neighbourhood, control, fold evaluation,
  stress and confirmation (the brief's planning value). The bench measured ≈ 160–178 evaluations/s on D24 at 10–16
  workers (CPU-bound; earlier doors are faster) and 21–26 plausible of 256–384 random centres; the expected total is
  ≈ 0.7–1.6 M evaluations (≈ 1.5–3.5 hours).
- **Counted separately:** screen centres; rung-1, rung-2, rung-3 and refinement centres and neighbours; qualification
  (centres, selection, confirmation, small/wide, 5A instrument, stresses, toggles); folds; validation; retries; archive
  hits; worker compute time — per lane and per proposal origin.

### 7.4 Extension policy and stopping (frozen; development progress only; AD7)

After a cell's or lane's base islands, and after every extension island, one more island runs (up to the cap) iff the
last island raised the best feasible rung-1 **centre net by ≥ $2,000**, or the best feasible rung-1 **robust net by
≥ $2,000**, or the union **hypervolume** of (−robust, p90) against (0, $35,000) by **more than 1%**, or made a **new
competitive stratum feasible** (no feasible member before; best feasible centre net ≥ 50% of the lane's best). Progress
per island (hypervolume, best robust and best net trajectories; hypervolume gain per 10,000 evaluations) is recorded.
**Stopping conditions recorded:** per lane "triggers not met" or "extension cap reached"; per island "budget",
"stagnation", "no new configurations" or "generations"; per job "resource guard" or "user stop" if they occur. A cap
reached with a trigger firing is **budget-bound, not converged**. Nothing is re-searched after a fold, a qualification
or the validation.

## 8. Robustness instrument (`space.ts` `rowsOf`, `qualify.ts`)

### 8.1 Perturbation

- **Radius:** 10% of each box in value units, rounded to the fine step (growth140's radius), per active numeric input.
- **Draws:** one Latin hypercube of n rows over Priority 3's 116 numeric columns (only the 50 Growth·GDX columns move
  here) per seed family, common random numbers across **every member of a cutoff** (controls and candidates alike); a
  row moves every active numeric input by u × scale × radius, rounded, clipped to the box widened to include the centre
  (clipping counted).
- **Categorical inputs** stay fixed (toggles are report-only); inactive inputs untouched; orders repaired; duplicates of
  the centre or of earlier rows are dropped from the statistics.

### 8.2 Families and seeds (`deriveSeed('gdx-growth-standalone', 'nbhd', …labels)`)

| Family | Labels | n | Scale | Use |
|---|---|---:|---:|---|
| rung 1 / refinement | `('r1', cutoff)`, `('refine', cutoff)` | 16 | 1 | search (centre-first) |
| rung 2, rung 3 | `('r2', cutoff)`, `('r3', cutoff)` | 64, 128 | 1 | search |
| selection | `('select', rep, cutoff)`, rep 1–2 | 2 × 128 | 1 | **ranking and roles** |
| confirmation (fresh) | `('confirm', rep, cutoff)`, rep 1–3 | 3 × 128 = 384 | 1 | **qualification only** |
| small, wide | `('small', cutoff)`, `('wide', cutoff)` | 128 each | 0.5, 1.5 | report (radius sensitivity) |
| 5A instrument (C24) | 5A's `('standalone', family, rep)` in 5A's namespace | 384 + 128 + 128 | 1, 0.5, 1.5 | report (matched with 5A's published figures) |

No label of this namespace was used before. The confirmation draws are never used for ranking, promotion or any search
decision, and are never resampled: a member's verdict is computed once.

### 8.3 Statistics

Median, p10, p90 of net; robust net = ½ median + ½ p10; median, p90 DD (linear interpolation); breach count and share
(DD > $35,000), mean excess, worst DD; report-only tail severity (standard §5.8): p95 DD, worst-10% mean DD (⌈0.1 n⌉
largest), the breach share's Wilson 95% interval, the distinct ledgers behind the breaches, the p90's 95%
order-statistic interval, and the half- and 1.5×-radius families. Breach frequencies are perturbation frequencies on one
history, not probabilities of future losses.

## 9. Qualification, roles, the primary and the comparison with Appendix A (`qualify.ts`, `stages.ts`)

### 9.1 Evidence (every member, the cutoff's training door only)

The centre; selection and fresh confirmation; small and wide; at C24 the 5A instrument; **stresses** (10 and 20 bps per
side, 14% interest, +25 bps stop slippage, next-open stop fills — books with the initial stop or retention keep
stop-level fills, recorded); **toggles** (every enabled optional rule OFF; report).

### 9.2 Gates (all must hold; fixed before any candidate result)

| Gate | Requirement |
|---|---|
| Q1 | centre net > 0 |
| Q2 | centre maximum minute DD ≤ $35,000 |
| Q3 | fresh confirmation p90 DD ≤ $35,000 (the interpolated 0.9 quantile of the pooled 384 draws) |
| Q4 | fresh confirmation p10 net > 0 |
| Q5 | at 10 bps per side: centre net > 0 and centre DD ≤ $35,000 |

No activity floor, annual-profit floor, largest-winner or concentration cap, equal-profit rule or breach-rate veto.
Beating a control is never a gate. Gates are never relaxed after results. **Near misses** (failing only Q3, Q4 or Q5)
are tabled with their exact failed gates and severity.

### 9.3 Sets, roles and the primaries (ranked on the selection families)

- **C24 sets:** *final* (the selectable set: independent and informed shortlists, Appendix A, P01–P13); *independent*
  (the independent shortlists); *informed* (informed shortlist + controls; report); *controls* (A, P01–P13; report).
- **Roles** in each set among qualified members: **actual-profit** = the highest centre net (ties: selection robust net,
  lower centre DD, label); **robust-profit** = the highest selection robust net; **balanced** = the highest selection
  robust ÷ selection p90 DD; **lower-drawdown** = the lowest selection p90 DD among those with selection robust ≥ 50% of
  the actual-profit holder's. Pareto set as §1.
- **The primary** = the final set's actual-profit holder; if it is a control, that is the qualifying-incumbent fallback;
  if no member qualifies: **no supported standalone candidate**. **The independent primary** = the independent set's
  actual-profit holder (the procedure's selection at every cutoff).
- **C19, C21, C23:** the independent set only (the fold primary); Appendix A and cash are evaluated as descriptive,
  non-selectable comparators.

### 9.4 Comparison with Appendix A (descriptive; development; fresh confirmation; never a gate)

For every member against Appendix A: **dominates** (centre net ≥, centre DD ≤, confirmation p10 ≥, confirmation p90 DD
≤, one strictly), **dominated by**, **higher-profit trade-off** (centre net > without dominating), **stronger local
stability** (confirmation p10 > and p90 DD <), and whether the two p90 95% order-statistic intervals overlap ("within
finite-draw uncertainty"). Strict dominance is a descriptive classification; tiny p90 differences inside finite-draw
uncertainty are described as such, and no numeric tolerance is introduced. Original gate verdicts are preserved.

### 9.5 Candidate consideration (standard §2.8)

| Candidate | Original gate verdict (as sealed) | Descriptive evidence | User-directed consideration |
|---|---|---|---|
| 3C's GDX partners (P01–P09) | 3C: qualified as pooled partners (Q1–Q7) | standalone evidence here (report) | the user **declined** adoption (Priority 4A brief, 2026-11-10); research controls and informed seeds only |
| Appendix A | 3B/3C: fails Q3 (pooled, E and A); 5A: standalone neighbourhood fragile (report) | this study's gates and instrument | none beyond its role as the exact control |

## 10. Chronological procedure tests (independent lane)

| Cutoff | Training door (search, qualification, selection) | Committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 (2016–2019) | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 (2016–2021) | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 (2016–2023) | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 (2016–2024) | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- **The same complete independent search and selection** at each cutoff (§7, §9), the same budgets and extension
  policy, fresh labels per cutoff.
- **Frozen members of a fold:** the holders of the independent set's four roles, Appendix A (descriptive) and cash; one
  continuous run per member on the evaluation door (nothing reset at the boundary).
- **Sequential policies:** the procedure (each fold's independent primary trades its slice); each independent role;
  Appendix A fixed (descriptive); cash. Transition treatment: each slice contributes its member's own continuous marks
  after the boundary close (a carried position is the incoming configuration's real exposure); a switch between
  different configurations is charged 5 bps on $100,000 per open lot the outgoing configuration closes and per open lot
  the incoming one adopts; costs and interest are inside the marks. Reported: net, charges, the strict minute DD of the
  concatenated marks with its peak, trough and recovery times and the positions open between peak and trough, and
  whether it recovered. Slice profits and drawdowns are never summed from incompatible initial states.
- **The verdict (frozen):** the procedure is **SUPPORTED** iff every fold produced a primary, the sequential net > 0 and
  the sequential minute DD ≤ $35,000; otherwise **UNSUPPORTED** (reported even if the final candidate looks good). A
  failed sequential path is the procedure's history, never attributed as a particular final phenotype's DD.

## 11. Diagnostics, the frozen selection and the one-time validation

### 11.1 Diagnostics (development D24; report-only; sealed before the frozen selection)

For every holder of a role in the final, independent, informed and controls sets, and Appendix A: the funded-lot
ledger (CSV) and holding periods; wins/losses, partial exits, independent market episodes (a new episode when an entry
comes more than 10 sessions after the latest exit); exposure (sessions held); time under water and its longest run;
open marks; interest and costs; the maximum minute DD with peak, trough, recovery and the positions open between peak
and trough; the five deepest daily-close drawdown episodes with their positions; the GDX decision funnel by stage
(signals and crossing episodes; dispositions: filter and gate blocks, eligibility arming, expiry and invalidation by
reason, signals during the book's own position); the **largest winning episode** (its net and share) and its **causal
no-new-funding rerun** (every decision inside the episode window refused; the book's virtual state continues) beside
the arithmetic subtraction; the result by year and by development subperiod (2016–2019, 2020–2021, 2022–2023, 2024).

### 11.2 The frozen selection (sealed and committed before FULL opens)

The primary, the independent primary, the fallback statement, every set's roles, rank orders and Pareto sets, the near
misses, the labels against Appendix A, the chronological verdict, the diagnostics' seal, the **Priority 4B export set**
(every final role holder, the independent primary and Appendix A, with complete settings and evidence), every frozen
member's complete effective configuration, the code and data pins and the validation plan below.

### 11.3 Validation (FULL, once, under the guard)

Every frozen member, Appendix A, P01–P13 and cash: one continuous run 2016-01-04 → 2026-10-30. Reported: validation P&L
with realized/open parts, the reset validation DD, the whole-run DD with peak, trough, recovery and positions, 2025 and
2026, lots and episodes after the boundary, carried positions, open remainders. **V1** validation P&L > 0; **V2** reset
validation DD ≤ $35,000; **V3** whole-run DD ≤ $35,000. **Report-only:** 10 / 20 bps and 14% interest on FULL; the fresh
confirmation rep 1 (128 draws) on FULL for each frozen subject; Appendix A's native full-history target. Passing
validation and beating a comparator are different questions; both are reported. A failed validation is a result: no
new winner, no rescue search, no retuning, no swap of the primary; the 4B export set is not changed by validation.

## 12. Engineering gates (sealed `results/parity/parity.json` before the freeze; 294 checks, 0 failed)

| Gate | Requirement | Result |
|---|---|---|
| E1 | Priority 3's evaluation files hash to its sealed parity digest | pass |
| E2 | Appendix A through this study's path on D24 = 5A's sealed L0 centre of "SG alone", field for field (bar the quad id) | pass: $53,816.50 / $17,709.96 / 13 lots |
| E3 | trade-by-trade parity with the canonical `runRiseTrading` + `summarizeSimulation` (times, raw and after-cost prices, net and interest per trade; minute and daily DD and their times; every daily mark; money within $1e-6) and the compact record against the canonical summary — Appendix A, P01–P13 and 48 random configurations on D24, 16 on D19 | 78 + 78 pass |
| E4 | prefix causality: 18 random configurations on D19, D21, D23 equal their D24 runs (decisions, lots, daily marks) | 54 pass |
| E5 | accounting: Σ lot net = net; principal ≤ $100,000; never two lots open; no standalone refusal; cash = $0 / $0 / 0 | 79 pass |
| E6 | inactive GDX inputs never change the identity; Appendix A's identity `07cac3329fc7a520` | 2 pass |
| E7 | 5A's standalone instrument reproduces 5A's sealed Appendix A confirmation, small and wide statistics exactly | pass |

Synthetic and unit tests: Priority 3's pool tests (cross-symbol calendars, merged order, decisions before trades,
reservations, same-instant ordering, the one slot, partial exits holding the slot, gap exits, disabled components, year
boundaries, period drawdowns, open remainders) rerun unchanged; this study's tests (`tests/study.test.ts`, 7): the
standalone build and cash, identity under inactive inputs, the controls and the prior-set rule with representability,
the 64 / 32 strata, the budgets, neighbourhood rows, the roles and the descriptive labels; the duplicate-concurrent-key
path is tested by the pilot (`dup-keys`). A parity failure stops every dependent stage.

## 13. Resources and recoverability

- **Containment:** every heavy stage is a transient systemd user unit inside `gdxg.slice` with **MemoryHigh=44G,
  MemoryMax=48G, MemorySwapMax=0** (re-applied before every launch; the unit carries the same limits, `KillMode=mixed`,
  `Restart=no`); heavy units run one at a time; Claude and tmux outside. Other workloads checked first: every other
  study slice had 0 tasks (2026-11-10T17:06Z); mongod and a vLLM server run outside; the dip-recovery slice is idle and
  not touched.
- **Execution settings (from the bench, `results/pilot/PILOT.md`):** 12 child-process workers (`--expose-gc`, 1.5 GiB
  old space), one door each, started four at a time; a full GC every 256 evaluations or above 256 MiB of ArrayBuffers
  (worker ArrayBuffers stayed ≈ 62.5 MiB); ≤ 2 tasks in flight per worker; queue chunks ≤ 4,096; book caches of 256
  entries; a per-job SQLite archive (WAL; LRU ≤ 100,000) bound to the study, job, door pin and evaluation-code digest;
  a 10-second memory monitor; **dispatch stops at 36 GiB of job cgroup memory** (in-flight work finishes, the archive
  commits, exit 75).
- **Recoverability:** every evaluation is archived as it returns; a progress checkpoint (stage, lane, island,
  generation, RNG state, counters) at every generation boundary and at least once a minute; a rerun of the same command
  replays deterministically from the archive (a kept lane result must equal its replay). A worker death fails the job
  promptly (its in-flight tasks dropped; no hang); one in-flight evaluation per key across concurrent lanes (3C's R1);
  no automatic restart; no OOM restart loop.
- **The pilot** (pilot budgets, `pilot-` job names, the pseudo-fold P18 on D19, outputs in the cache): the bench; a
  straight run of every stage path; a graceful stop then resume; a worker SIGKILL then resume; a unit SIGKILL then
  resume — identical lane results; the duplicate-concurrent-key test.

## 14. Integrity

The freeze records this file's, the amendments', the brief's, the adoption manifest's and the control manifest's
sha256, the sealed engineering gates, the evaluation digest and Priority 3's, the code closure and its digest, the door
pins, the canonical data, git `HEAD`, the per-cutoff proposal plans, the evaluation caps and the resource contract.
Stages refuse to run unless the preflight passes, the freeze is sealed and committed, the engineering gates are sealed
with 0 failures, the control manifest is sealed and the evaluation code is the frozen one. Records are sealed
write-once (0444; `results/seals.jsonl`; `npm run gdxg -- verify`). Fold selections are committed before their slices;
`FROZEN_SELECTION.json` before FULL. The checkpoint is `RESEARCH_RECOVERY.md`. Report tables are produced by
`tools/gdx-growth-standalone/tables.ts` (outside the pinned code closure).

## 15. Reporting commitments

- **Format** (standard 2.0.0 §7.7): written analysis, Markdown tables and machine-readable results (JSON, JSONL, CSV)
  only; no charts, plots, SVGs, screenshots, images, dashboards, HTML reports or PDFs; dollars with commas and two
  decimals; unambiguous trial names (lane, cutoff, shortlist slot and identity).
- **The report leads with** the brief's six questions: a qualified, useful phenotype and the role holders' trade-offs;
  the comparison with Appendix A on matched centre, neighbourhood and validation evidence; the independent procedure
  across earlier cutoffs and when and why its worst DD occurred; breadth across episodes and the filters and exits that
  explain the behaviour; the 4B export set and what remains unknown about pooled contribution; why the search stopped.
- **Tables:** development, validation and full-history net with realized/open parts; DD in dollars and % of the fixed
  $100,000 with dates; trades, episodes, wins/losses, holding periods, exposure, time under water, open marks; centre,
  median/p10 and robust net; p90/p95 DD, worst-10% mean, breach share with its Wilson interval, mean excess, worst;
  stresses and toggles; the largest episode and its causal rerun; the decision funnel; folds and the sequential path;
  coverage by class, origin and lane; proposals and evaluations by kind; stopping reasons; complete effective settings.
- **Limitations:** previously examined history; informed provenance of the controls; one history; few GDX episodes;
  historical compliance is not a guarantee; no pooled conclusion (4B's question).
