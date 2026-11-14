# Protocol — Assignment 2: D1 risk-control families and risk-aware candidate selection

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
search). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

Research only. Nothing here replaces New L0, deploys a strategy, changes production execution, introduces Growth·GDX or
shadow-position delayed-entry eligibility, or merges experimental engine code into `main`. Calendar-day maximum holds
(when a hold is enabled) and calendar-day interest throughout. Reports are written analysis, Markdown tables and
machine-readable results only (standard §7.7).

- **Study:** `research/vg-l0-risk-families/`; code `src/vg-l0-risk-families/` (stages) and `src/d1-risk-controls-rc2/`
  (RC 2); `npm run vg-l0rf -- <command>` from the repository root.
- **Brief:** `brief/BRIEF.md` (the user's "Claude Code — Assignment 2: D1 Risk-Control Families and Risk-Aware Candidate
  Selection", 268 lines, 29,946 bytes, sha256 `aaf36fbc390b59e3f9ca3a21936aac93eef2ac3374cb3dceca94197d9d89cac8`, read in
  full to its final "Success criterion").
- **Branch:** `research/vg-l0-risk-families` (main checkout) from `26014af179cab39436a385862946c7f843e04eac` (the
  verified tip of `research/vg-l0-risk-controls-foundation`, which contains `main` = `108c241b`).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.2.0`, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` (registered current) |
| Read / adopted (UTC) | read in full 2026-11-14T01:10Z; adopted at `adoptedAt` of the manifest |
| Adoption manifest | `STANDARD_ADOPTION.json`; every stage calls `requireStandardAdoption` in code (`stages.ts studyGuards`) |
| Scope | `optimization` |
| Reference method (§4.8) | `docs/research/methods/NEW_L0_METHOD.md`, id `NL0`, version `1.0.0`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` (stage map §7.5) |
| Specification | RC 2 = `SPECIFICATION_RC2.md` (entry-day activation) on RC 1 (`research/vg-l0-risk-controls-foundation/SPECIFICATION.md`, unchanged) |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §4.1, §4.3, §4.8 | adaptation | **Structural cells pinned per lane.** NL0 pinned the inclusion (V/G/B) per cell; here each lane pins one of the 196 D1 risk structures (§6.1). Growth·VGT is New L0's and frozen, Growth·GDX disabled: the genome is the D1 pair + the active control genes (no categorical gene). NL0's Growth-specific protections have no object: the entry-pattern promotion share, the entry-alternative and gate-alternative shortlist slots become the **K pattern** (the gate's K per gated book) in gated cells and fall through elsewhere; 5B's both-Growth items do not apply. | — (brief §2.1, §2.3, §3.4 "Maintain the original NL0 search machinery … adapting explicitly to discrete cells") |
| AD2 | §4.2, §4.8 | adaptation | **Effort by replicates of NL0's unchanged V-cell schedule:** 2 replicates per cell per cutoff (§8); the refinement stage uses NL0's informed-lane schedule, 2 replicates per refined cell. Budget equivalence against NL0's effective budget and Priority 3B is reported. | — (brief §3.1 "at least 512 … per cell per cutoff per replicate, with two independent replicates") |
| AD3 | §1.2, §1.4 | adaptation (one exception, otherwise stricter) | FULL opens **before** the frozen selection only in stage V, only for the frozen New L0 under **legacy defaults** (its full-history figures are published), through `openFullForBaseline`, refused once any search record exists — the foundation's AD3 precedent. No non-default control, no searched configuration and no search output runs on FULL before `FROZEN_SELECTION.json` is sealed and committed. | — (brief §0 "Recover and reproduce the frozen New L0 baseline before changing anything … through the verified 2026-10-30 endpoint") |
| AD4 | §1.9, §0.3 (independent lane) | **departure** | **Conditionally independent chronology.** No seed, range or vector of any D1 lane comes from New L0 or another later-selected configuration (the boxes are the foundation's handoff proposals, audited in §6.3 before any real-data result of a control). But every pool contains New L0's **Growth·VGT, a later-selected component, frozen by the brief.** The fold verdicts therefore test the D1 risk-control search-and-selection procedure *conditional on that fixed Growth book*; they are labelled "conditionally independent (fixed later-selected Growth·VGT)", never a fully independent test of the portfolio. | Brief §2.3 "VGT Growth's original New L0 phenotype is frozen in Assignment 2" and §5.1 "Follow NL0's precommitted C19/C21/C23/C24 development cutoffs and fold doors" |
| AD5 | §5.9 and §5.8 [R]; §0.2 | **departure (study-specific)** | The **experimental selector RA1** (§10.2) uses §5.9/§5.8-type quantities computed at the cutoff — the largest open lot's market-value multiple, the open-lot share of training net, the worst per-lot adverse excursion, the selection family's worst-10% mean DD — and the training occupancy as ranking inputs. Only RA1 and its secondary ablation RA2 use them; the original rule, the gates Q1–Q6, the roles and the refinement plan's profit/robust/drawdown slots do not. Standard 2.2.0 is **not** changed; no [M] rule is weakened; no other study is bound by these thresholds. | Brief Mission: "A study-specific, documented experimental use of otherwise report-only exposure/risk diagnostics in an alternative candidate-selection rule"; §4.1 "The user has authorized a scoped experimental departure for this study only" |
| AD6 | §5.3 | adaptation | **Neighbourhood instrument:** perturbs every **active searched gene** (D1 in Study 8's N1 grid radii; control genes in the radii of §8); Growth·VGT is fixed and never perturbed; the gate's K is fixed in neighbourhoods (categorical-like; K ± 1 are refinement moves and report-only toggles); the cell (families, gates, activations) is fixed. New L0's local statistics under this instrument are therefore not comparable with 5B's sealed ones (which perturbed Growth too). | — |
| AD7 | §4.5 | adaptation | Extension per lane (its own position), as in the shadow-eligibility study; NL0's triggers (5%), caps (6 islands broad, 8 refinement) and resource guard (finishing reserve 8,000 per broad lane, 30,000 per refinement lane). | — |
| AD8 | §4.4, §3.2, §3.3 | **departure** | **No incumbent-informed lane in this assignment**; New L0 is a fixed control and comparator at every cutoff (never selectable), and the qualifying-incumbent fallback does not arise (nothing is selected from an informed lane). The informed lane (New L0, C4, C4-refined, IJ1 projected onto the families) is handed to Assignment 3. | Brief §3.4 "If you add an incumbent-informed lane as a controlled secondary comparison …" (optional) and §6 item 8 (Assignment 3: "including fresh and incumbent-informed lanes") |
| AD9 | §2.3, §2.5 | adaptation | **Two frozen selection procedures on identical populations** (§10): the original NL0 rule and the precommitted risk-aware RA1, each applied to the populations L (legacy cell), B (64 base cells) and F (all 196). The study's headline selection is F/original (the faithful NL0 rule over all mechanics); F/RA1 is the experimental arm with equal prominence; L/original is the legacy baseline. Every C24 primary's successor status follows the frozen rule of §11.4. | — (brief §4) |
| AD10 | §4.1, §4.3 | adaptation | **Stage-2 refinement** (§7.3): a frozen rule picks up to 16 cells + the legacy cell from the cutoff's own qualified broad members; their refinement lanes are seeded only with those same-cutoff members. They are part of the independent procedure at every cutoff (no later data), labelled "refinement (same-cutoff seeds)". | — (brief §3.3) |
| AD11 | §5.9 (reference history) | adaptation | No disjoint pre-2016 VGT/GDX data exist on the machine (every dataset in `data/` and `/srv/ai-trading/data` starts 2016-01-04); none is downloaded or bought (brief §5.4). The hold-window tail stress uses (a) an **in-sample stress** over 2016–2024 on the symbols themselves (labelled "in-sample stress"), (b) **peer proxies** XLK (for VGT) and GDXJ (for GDX) over the same years (labelled "proxy, same period, not disjoint"), (c) **synthetic gap scenarios** (§13.3). | — (brief §5.4) |
| AD12 | §5.1 | adaptation | The engineering gates are RC 2's stage V (§12): legacy parity with Priority 3, RC 1 parity, entry-day invariants with independent re-derivation, causality, accounting, tests and frozen-work verification. | — |

## 1. Question, objective and outcomes

- **Questions (the brief's nine):** whether a post-fill same-session protective stop can be implemented and verified
  without a compatibility or lookahead defect; which D1 exit families and gate settings stay competitive after proper
  optimization (asymmetric pairs included); whether entry-day activation improves tail behaviour enough to justify it;
  whether any family reduces severe pre-hold D1 losses and repeated bear-market entries without displacing too much
  profitable pooled activity; whether, on identical populations, RA1 improves subsequent chronological risk or only
  sacrifices profit; the sensitivity of the conclusions; which findings are candidate evidence; what Assignment 3 should
  investigate; whether "no qualifying successor" is the correct result.
- **Objective (§2.2):** development net profit (realized + marked, after costs and interest) under the $35,000 maximum
  minute drawdown on the fixed $100,000 principal, with neighbourhood robustness, chronological evidence and exposure
  diagnostics beside it.
- **Hypotheses** (each may fail; a null is a result):
  - H1 (families): at least one non-legacy cell yields qualified candidates not dominated by the legacy cell's best on
    (centre net, centre DD) and (selection p10, selection p90 DD) at C24. Null: legacy remains as good.
  - H2 (activation): entry-day activation, on equal budgets, lowers the tail (worst-lot MAE, p95 and worst-10% mean DD,
    gap-through-stop losses) at comparable profit. Null: no material difference, or worse profit.
  - H3 (pre-hold losses and bear re-entries): protected families and the gate reduce the worst per-lot losses and the
    losing D1 re-entries of 2022 without losing more profit than they save in drawdown. Null: they do not.
  - H4 (selection): on identical populations RA1's fold primaries have lower next-slice drawdowns than the original
    rule's without a larger profit sacrifice (label rule §11.3). Null: no material difference, or profit sacrifice
    without clear benefit.
  - H5 (chronology): at least one procedure is chronologically supported. Null (expected from history: every earlier
    independent procedure failed): none is.
- **Valid outcomes:** a qualifying successor (§11.4); research-only improvements; **"no qualifying successor"**; "no
  chronological support for any procedure". None is a failure of the study.

## 2. Prior knowledge and provenance

- **New L0** (NL0 §1.1): 5B `C24/L0/informed/R1#1 profit`, cfg `67cfdd9b62d1e16f`, Priority 3 quad `a2e385640ca61012`;
  D1·VGT [237,9,73,15,72,42,103,41], D1·GDX [277,1,61,13,232,25,152,10], Growth·VGT `6b5f909b30cfa516`, Growth·GDX OFF.
  Development $382,721.46 / DD $19,459.83 / 34 lots; validation $96,883.72 / reset DD $20,385.99; full history
  $479,605.18 / DD $20,385.99 / 46 lots (5B `results/validation/validation.json` `83931139…`; the foundation's sealed
  `g1-g3-new-l0.json` `b05b5c78…` with its trade-list, funding and mark hashes). **Chosen with later data (informed lane);
  not an independently validated production strategy.**
- **Examined history.** 2016-01-04 → 2026-10-30 has been examined by Priorities 3–8, the shadow and session studies, the
  walk-forward diagnostic and Strategy Lab; 2020, 2022 and 2025–2026 repeatedly. Every fold and the validation here are
  **retrospective evidence on previously examined history, not virgin out-of-sample proof** (§1.6).
- **The motivating diagnostic** (`research/vg-l0-walk-forward-diagnostic/REPORT.md`): every anchor procedure failed
  chronologically; D1 lots had no loss exit before their maximum hold; carried open winners were 33–53% of C21 training
  nets at 1.5–2.5× exposure; local neighbourhoods breached 0–8% on training and 54–100% on the failing slices. **RA1's
  design (§10.2) was formed after that diagnostic examined 2020–2024**: its fold results are retrospective and cannot
  establish that RA1 generalizes.
- **Real-data exposure of the controls before this protocol:** Assignment 1 ran random non-default controls only for
  pass/fail invariants (its AD7, no performance figure); this study ran 24 random RC 2 evaluations on D24 for timing only
  (ms per evaluation; nothing else printed or recorded, door log 2026-11-14T01:27Z). No box, threshold, quota or rule
  here was informed by a control's real-data performance.

## 3. Data, doors and windows

- Canonical minute data `data/VGT/data.csv` (`2ee06310…412e`) and `data/GDX/data.csv` (`77dba9b2…5049`); Priority 3's
  byte-prefix doors D19, D21, D23, D24 (through 2019-12-31, 2021-12-31, 2023-12-29, 2024-12-31; size, sha256 and last
  row verified before parsing) and FULL (2016-01-04 → **2026-10-30**, the common complete endpoint, re-verified by
  `npm run vg-l0rf -- doors`); no November–December 2026 data exist and none is implied.
- Development 2016-01-04 → 2024-12-31 for every choice; validation 2025-01-02 → 2026-10-30 for frozen selections only.
- Folds: C19 → slice 2020-01-02 → 2021-12-31 (door D21), C21 → 2022-01-03 → 2023-12-29 (D23), C23 → 2024 (D24); C24 →
  FULL once. Every run is continuous from 2016-01-04 (no liquidation or reset at a boundary); slice P&L = the change of
  the marked net from the cutoff close; slice DD resets at the cutoff close; whole-run DD is reported beside it.
- Every door opening is logged in `results/doors.jsonl`. Split handling: the development doors contain no VGT or GDX
  split; FULL applies forward adjustment (VGT 8:1 on 2026-04-21).
- Proxy data for the tail stress only (§13.3, report-only): `data/XLK/data.csv`, `data/GDXJ/data.csv` (2016–2024 part).

## 4. Controls and comparison arms

| Key | Definition | Role |
|---|---|---|
| New L0 | frozen New L0 under legacy defaults (cell GA0.VA0, its D1 vectors, New L0's Growth·VGT) | control at every cutoff (qualified with the same instrument, descriptive); comparator of the successor rule; **never selectable** |
| The legacy population L | the cell GA0.VA0 (family A, gate OFF on both books: New L0's D1 mechanics) searched fresh | the 2 × 2 baseline mechanics |

The 2 × 2 (brief §4): {L, F} × {original, RA1} on identical archived candidate populations per cutoff; B (base cells,
RC 1 mechanics only) and RA2 are secondary rows. No selector launches a search. Mechanics-versus-parameters ablations
(§13.2) are report-only.

## 5. Engine and conventions (unchanged except RC 2's optional controls)

- Priority 3's pooled engine: one exclusive funded $100,000 slot, granted only at a decision's own instant when nothing
  is open or reserved; same-instant order D1 first, then GDX before VGT; no compounding, preemption or forced switches;
  5 bps per side inside the fill prices, $0 commission; 11% simple interest on outstanding principal by calendar day
  (365-day year); stops at the stop level or the gapped open; fractional shares; harmonized D1 arming from 2016-01-04;
  D1's shadow (virtual-book) lifecycle; Growth lifecycle L0; shadow-entry eligibility OFF (no path exists); Growth·GDX
  disabled.
- D1 books: deep entry, post-exit continuation ON, net-profit trailing-stop policy (New L0's D1 structure), with RC 2
  controls (RC 1's protective stop, hold policies and decline gate, plus the entry-day activation). Calendar-day holds.
- Evaluation path (`evaluate.ts`): RC 2's `evaluateWithControls2` (Priority 3's books, pool and record); the record's
  identity is RC 2's `riskId2`; legacy configurations keep Priority 3's identity and key.

## 6. Space

### 6.1 Structures (brief §2.1–§2.2)

Per D1 book, **14 structures**: family A (no protective stop, legacy calendar hold) with the decline gate OFF/ON (A0, A1);
B (protective stop, legacy hold), C (protective stop, hold disabled), D (protective stop, adaptive progress-extended hold)
× gate OFF/ON × activation next-session / entry-day (B0, B1, B0e, B1e, C0 … D1e). **Cells** = GDX structure × VGT
structure: **196 cells**, of which the **64 base cells** use next-session activation only (RC 1 mechanics; the brief's
64-cell base comparison) and the **132 onset cells** contain at least one entry-day book. The two books are never forced
to share a structure. An unlimited hold without the protective stop is invalid and does not exist in the design (C
requires the stop). **Every one of the 196 cells receives the identical broad budget** (§8): the activation study is the
fully crossed, balanced design, not a nested screen; its 132 onset cells are budgeted in their own jobs, apart from the
64 base cells.

### 6.2 Genome, grids and active genes (`space.ts`)

28 ordinal genes, one integer grid each (NL0's D1 genes use one grid at both resolutions; the control genes follow it):

| Gene | Unit | Box | Step | Neighbourhood radius (grid units) | Active when |
|---|---|---|---|---|---|
| D1 X, Y, stop, hold, L, buffer, P, W (per book) | tenths / days / sessions | Study 8's box (X 80–300, Y 1–50, stop 30–150, hold 3–30, L 20–250, buffer 0–60, P 30–200, W 10–200) | 1 | N1: 10, 2, 10, 2, 10, 10, 10, 20 | always, except hold and buffer under C |
| d protective-stop distance | tenths of a point of the raw entry fill | 30–250 (3.0–25.0%) | 1 | 10 | B, C, D |
| hx adaptive extended hold | calendar days | 6–60, repaired to ≥ the book's hold + 3 | 1 | 2 | D |
| g adaptive progress | tenths of a point above the raw entry fill | 10–150 (1.0–15.0%) | 1 | 10 | D |
| k gate losses K | failed attempts | 1–4 | 1 | 0 (fixed; refinement ± 1) | gate ON |
| r gate recovery | tenths of the decline | 100–1000 (10–100%) | 10 | 5 (= 50 tenths) | gate ON |
| c gate cooldown | trading sessions | 5–250 | 1 | 10 | gate ON |

- Inactive genes are pinned at index 0, never varied or perturbed, and masked in the identity (RC 1/RC 2 mask the hold
  and buffer under a disabled hold; an absent control has no gene). Inactive genes consume no proposal (de-duplication by
  identity).
- **Identity:** `riskId2` of the quad (the D1 pair + New L0's two Growth vectors) and the canonical controls; the
  controls determine the cell. Behavioural equivalence: the funded-lot ledger signature (one configuration per ledger in
  promotions and shortlists).
- **Distance:** normalized L∞ over the cell's active genes; 1 across cells.

### 6.3 Audit of the research boxes (brief §2.3; before any real-data result of a control)

- Engineering validity (RC 1/RC 2): d 1–999, extended hold > the book's hold and ≤ 365, g 1–999, K 1–20, r 1–1000,
  cooldown 1–1000. Every research box lies inside it; the adaptive repair (≥ hold + 3 ≤ 33) keeps hx ≤ 60 ≤ 365.
- d 3–25%: below ~3% a stop meets daily noise; 25% exceeds the diagnostic's typical crash MAEs while staying below the
  deep-entry box's largest decline (30%). It is independent of the trailing stop (3–15%): a protective stop may lie
  inside or outside the trailing distance.
- hx base+3 … 60 days: bounded (adaptive must stay finite), above every base hold (3–30); g 1–15%: from a token
  confirmation to a large one, inside the D1 entry scale (X 8–30%).
- K 1–4 (few levels, protected by strata), r 10–100% of the decline, cooldown 5–250 sessions (one week to one year;
  the cooldown is the only bound on a lockout).
- These are the foundation's nonbinding proposals, adopted unchanged after this audit; they are not evidence that any
  range is optimal, and no future result adjusts them.

## 7. Search (`search.ts`, `stages.ts`)

### 7.1 Broad stage (every cutoff, every cell, 2 replicates)

One lane = NL0's independent V-cell schedule on one cell: Latin-supercube scrambled-Sobol screen of **512** proposals
(strata: the K of each gated book varies fastest, so every K value — pair — gets the same count) → plausibility
(centre net > 0, centre DD ≤ $35,000, D1 and Growth both funded) → promotion of **64** (¼ centre net among the
plausible, ¼ constrained rank on (−net, DD), ⅛ per K pattern in gated cells with several, the rest max-min L∞
diversity; one per ledger in the first three) → rung 1 (16 neighbours, centre-first: an implausible centre gets none and
the unmeasured penalty) → **2 base NSGA-II islands × 256 new proposals** (population 32; objectives (−centre net, −robust
net, p90 DD); binary crowded tournaments; SBX η 15 p 0.9 and polynomial mutation η 20 on grid indices of the active
genes; (μ+λ) survivors; children fitted at rung 1; start populations = the rung-1 archive split by rank; stagnation 8
generations without a 1e-3 relative gain of the hypervolume of (−robust, p90) against (0, $35,000) or of the best
feasible centre net; ≤ 200 generations) → extension islands (§7.4) → rung 2 (12 × 64; ¼ centre net, ¼ robust, ⅛ K
pattern, the rest constrained rank; one per ledger; L∞ ≥ 0.02) → rung 3 (6 × 128; L∞ ≥ 0.03) → refinement (robust and
profit starts, NL0's moves: every active gene ± R/2 and ± R, K ± 1; robust start accepts the banded best feasible move
raising robust net ≥ $2,000, profit start the feasible move with the highest centre net raising it ≥ $2,000; one pass;
endpoints refitted at rung 3) → shortlist **3** (profit, robust, balanced, the K alternative in gated cells, then
centre-net order; feasible, one per ledger, L∞ ≥ 0.10). Seed keys `<cutoff>/broad/<cell>/R<r>`.

Jobs per cutoff: `base` (the 64 base cells, 128 lanes), `onset1` and `onset2` (the 132 onset cells in allCells order,
66 cells / 132 lanes each).

### 7.2 Broad qualification

Every broad lane's shortlist (≤ 3 per lane, de-duplicated by identity) and New L0 (control) are qualified (§9) on the
cutoff's door. Each cell therefore advances up to 6 of its strongest diverse candidates through the same gates.

### 7.3 Stage-2 refinement (every cutoff; frozen rule `select.ts refineCells`)

From the cutoff's qualified broad members only, in this order, up to **16 cells + the legacy cell**: (1) the legacy cell
GA0.VA0 always (seeded from its qualified members, else its shortlisted members); (2) the 4 cells with the best qualified
centre net; (3) the 4 with the best qualified selection robust net; (4) the 2 with the lowest selection p90 DD among
members with robust ≥ 50% of the cutoff's best; (5) the 2 best cells under RA1; (6) coverage, each if not yet covered,
by the best qualified centre net: every family A–D on D1·GDX and on D1·VGT, a gated and an ungated cell, an entry-day and
a next-session protective cell, an asymmetric cell. Cells without a qualified member are not eligible (reported).
Each refined cell gets **2 refinement lanes** with NL0's informed schedule seeded by the cell's own qualified broad
members (each seed + 12 near (scale 1.5) + 12 broad (3) designs; focus seeds = the cell's actual-profit and robust-profit
members + 64 (0.5) + 64 (1.0)); 4 base islands × 384 (extension ≤ 8); rung 2 16 × 64; rung 3 8 × 128; refinement from
robust, profit, profit-2 (one pass) and focus-profit / focus-robust at each focus seed (two passes); shortlist 6. Seed
keys `<cutoff>/refine/<cell>/R<r>`. The refinement shortlists are qualified like the broad ones (a configuration already
qualified in the broad stage keeps its broad evidence).

### 7.4 Extension and stopping (frozen; development only)

After its base islands a lane runs one more island iff its last island raised its hypervolume, its best feasible robust
net or its best feasible centre net by > 5%, or produced a new feasible behaviour class (K pattern × funded components),
up to 6 (broad) / 8 (refinement) islands, subject to the resource guard (requested so far + the round's worst case + the
finishing reserve × lanes ≤ the job cap), decided at barriers. The record names each lane's stop: triggers not met;
extension cap reached (budget-bound, not converged); resource guard. **Budget exhausted is not convergence.**

### 7.5 Stage map against NL0 1.0.0 (§4.8)

| NL0 stage | Here | Adaptation |
|---|---|---|
| Independent lanes V/G/B, 2 replicates per cutoff | 196 cells × 2 replicates, each the V-cell schedule | AD1, AD2 (the G and B cells' schedules have no object: Growth is fixed) |
| Informed lane (C24) | none (AD8); its place for local search is the same-cutoff stage-2 refinement (AD10) | AD8, AD10 |
| Qualification Q1–Q6, roles, actual-profit primary | unchanged; plus RA1/RA2 on the same evidence | AD5, AD9 |
| Folds C19 → C21 → C23, commits before slices, sequential verdict | unchanged; 9 procedures (3 populations × 3 selectors) | AD4 |
| Frozen selection, FULL once | unchanged | AD3 |

## 8. Budgets (`budgets.ts`; frozen)

| Stage | Distinct proposals per cutoff (configured base / maximum) | Backend evaluations (cap per job) |
|---|---:|---|
| Broad base job (128 lanes) | 131,072 / 262,144 | 128 × 23,056 = 2,951,168 |
| Broad onset jobs (2 × 132 lanes) | 270,336 / 540,672 | 132 × 23,056 = 3,043,392 each |
| Broad total | **401,408 / 802,816** (= 2 × 512 screen + 2–6 islands × 256 per cell) | 9,037,952 |
| Broad qualification (≤ 1,176 members + New L0) | — | members × 700 |
| Refinement (≤ 17 cells × 2 lanes) | ≈ 66,000 / ≈ 118,000 | lanes × 61,667 (≤ 2,096,678) |
| Refinement qualification (≤ 204 members) | — | members × 700 |
| Fold evaluation (next-slice neighbourhoods) | — | 60,000 |

Four cutoffs: **1,605,632 base / 3,211,264 maximum broad proposals** and ≈ 264,000 / ≈ 473,000 refinement proposals;
worst-case evaluation caps ≈ 48 M, expected ≈ 20–28 M (NL0's executed ≈ 15k requested per V lane). Against NL0's
effective budget (5B's L0 arm: 8,192 independent base proposals per cutoff, 489,695 requested search evaluations in
all) the broad stage is 49× its independent base per cutoff; against Priority 3B (131,072 independent base per cutoff)
3.1×; per cell and replicate (512 screen + 2 × 256 island proposals) it equals NL0's V cell exactly. Counted separately:
screen, rung-1/2/3 and refinement centres and neighbours, qualification, folds, retries (`runs.jsonl`) and archive hits.
The pilot (§13) measures throughput; it never resizes a stage or a box, and a reduction would be an amendment.

## 9. Robustness instrument, qualification and roles (`qualify.ts`)

- **Neighbourhoods** (AD6): one Latin hypercube of u ∈ [−1, 1] over the 28 gene columns per family (`deriveSeed(
  'vg-l0-risk-families', 'nbhd', …labels)`), common random numbers across a cutoff's centres; a neighbour moves every
  active gene with a radius by round(u × radius) grid units, clipped to the box (widened to include the centre); K and
  inactive genes fixed; the adaptive bound repaired; duplicates dropped (counts reported). Families: rung 1 / refinement
  16, rung 2 64, rung 3 128, **selection 2 × 128** (labels ('select', rep, cutoff): ranking), **confirmation 3 × 128 =
  384** (('confirm', rep, cutoff): qualification only).
- **Statistics:** median, p10, p90 net; robust = ½ median + ½ p10; p90 DD (linear interpolation); breach share with its
  Wilson interval, mean excess, worst DD, p95 DD, worst-10% mean DD (report-only except in RA1, AD5).
- **Gates Q1–Q6 (all must hold):** Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000; Q4
  confirmation p10 > 0; Q5 at 10 bps per side centre net > 0 and DD ≤ $35,000; Q6 D1 and Growth both funded at the
  centre. No activity, concentration or tail gate.
- **Report-only evidence per member:** stresses 10 and 20 bps, 14% interest, +25 bps stop slippage (protective fills
  included), next-open stops (entry-day stops included); causal removals (without D1, without Growth, without GDX,
  without VGT, without D1·VGT); participation labels (token < 5% of funded principal-days).
- **Detailed training centre** (every member; `evaluate.ts riskInputsOf`, the cutoff's door): the marked training net
  and its realized/unrealized split, the **conservative training net** (realized + the open lot's mark only when
  negative), the open lot at the cutoff close (book, entry, multiple = market value ÷ original principal, mark), the
  open-lot share of training net (undefined when net ≤ 0), occupancy (sessions with a funded lot at the close ÷ sessions),
  per-lot MAE = min(lowest minute mark during the lot's life, its final net) — distribution (count, median, 10% tail,
  worst) and per book — worst realized lot, mean losing lot.
- **NL0's roles** (per population): actual-profit = highest centre net (ties: selection robust, lower centre DD, label);
  robust-profit = highest selection robust; balanced = highest selection robust ÷ selection p90 DD; lower-drawdown =
  lowest selection p90 DD with robust ≥ 50% of the actual-profit holder's. Pareto set on centre net, centre DD,
  selection p10, selection p90 DD.

## 10. Selection (`select.ts`; frozen before any search)

### 10.1 Populations and inputs

Per cutoff, every qualified member of the broad and refinement stages (de-duplicated by identity; New L0 excluded) forms
the populations **L** (cell GA0.VA0), **B** (the 64 base cells) and **F** (all 196 cells). Every selector reads ONLY the
cutoff's training evidence (the centre and its detailed replay on the cutoff's door, the selection family and the gates);
never a confirmation family for ranking, a later slice, a next-slice neighbourhood or the validation. Both selectors see
identical populations and identical evidence; neither launches a search.

### 10.2 The rules

- **Original (NL0 1.0.0 §3.5, unchanged):** the actual-profit role — the highest centre net among the qualified; ties:
  higher selection robust net, lower centre DD, label.
- **RA1 — the primary experimental risk-aware rule** (AD5): four screens on the training evidence at the cutoff close,
  - **S1 exposure:** the open lot's market value ÷ its original principal ≤ **1.50** (no open lot: pass);
  - **S2 open-profit concentration:** the open lot's mark ÷ the training net ≤ **25%** (no open lot, or a negative
    mark: pass);
  - **S3 adverse-excursion severity:** the worst per-lot MAE over the training funded lots ≥ **−$17,500** (½ × the
    $35,000 research ceiling: no single lot may have consumed half of the drawdown budget);
  - **S4 neighbourhood tail:** the selection family's worst-10% mean DD ≤ **$35,000**;

  then the order: (1) **fewest failed screens**; (2) within that group, the members whose **conservative training net**
  is within **5%** of the group's best (NL0's band) → the **lowest training occupancy**; (3) ties: higher conservative
  net, higher selection robust net, lower centre DD, label. Units: dollars; multiples and shares are ratios; occupancy is
  a share of sessions. Missing data: a qualified member always has a positive training net, funded lots and a selection
  family; an open-lot item without an open lot passes. A member passing every screen always outranks one failing any; a
  population without a qualified member has no primary (a fold without a primary). RA1 converts no profit into a weighted
  score: it is lexicographic, with profit measured conservatively (open gains not credited) and capital occupancy used
  only inside the 5% profit band. The $35,000 ceiling is the existing historical research constraint, not a future cap.
- **RA2 — secondary ablation** (reported, never a verdict of RA1): the highest conservative training net among the
  qualified (ties as RA1 step 3). It separates the valuation part of RA1 from its screens and occupancy band.
- **Archive:** for every cutoff, population and selector the sealed selection records the primary, the top 10 with every
  input (`selectionSummary`), and the failed screens; the report states why the two rules ranked differently.

## 11. Chronology, consequence and the successor rule

### 11.1 Folds

For C19, then C21, then C23: broad searches → broad qualification → refinement plan → refinement searches → refinement
qualification → selection, all sealed and **committed before the next door opens**; then the fold evaluation on the next
door (each population × selector primary, the populations' roles and New L0, one continuous run per row with the cutoff
as boundary). Guard in code: an earlier cutoff never runs after a later cutoff's selection exists.

### 11.2 Sequential paths and verdicts

Each of the 9 procedures (L, B, F × original, RA1, RA2) chains its fold primaries over 2020–2021, 2022–2023 and 2024
(continuous slice marks; 5 bps of $100,000 per open lot closed or adopted at a switch). **Verdict:** *supported* iff every
fold produced a primary, the sequential net > 0 and the sequential minute DD ≤ $35,000; otherwise *unsupported* or
*incomplete*. The **primary verdicts are the 2 × 2** (L/original, L/RA1, F/original, F/RA1); B and RA2 are secondary.
Every verdict carries AD4's label "conditionally independent (fixed later-selected Growth·VGT)".

### 11.3 Frozen comparison labels (development and folds; band $2,500)

For a population P, RA1 versus original over the three folds: **risk improvement** iff the sequential DD(RA1) <
DD(original) − $2,500 and in every fold RA1's slice DD ≤ the original's + $2,500; **profit sacrifice without clear
benefit** iff the sequential net(RA1) < net(original) − $2,500 and not a risk improvement; **no material difference** iff
both sequential differences are within $2,500; otherwise **mixed**. The same rule compares F with L under each selector
(the mechanics effect) and F/RA1 with L/original (combined). One market history and three correlated slices: every label
is retrospective procedural evidence, never proof that a rule generalizes (standard §3.4).

### 11.4 Consequence (§1.8) and the qualifying successor (brief §5.2)

- **Consequence (2.2.0 default, adopted):** a procedure whose chronological verdict fails or cannot be computed gives
  "no chronological support: not a deployment-qualified candidate without the user's explicit decision". It is a label
  and a decision point, never a fitness term, ranking input or gate.
- **Qualifying successor:** the C24 primary X of a population × selector procedure is a qualifying successor iff (a) X
  passes Q1–Q6 at C24; (b) the procedure's sequential verdict is *supported*; (c) X is not dominated by New L0 (C24
  evidence, same instrument) on (centre net, centre DD) nor on (confirmation p10, confirmation p90 DD); (d) X passes V1–V3
  once on FULL. Otherwise X is **research-only** with its reason. Deployment would still need the user's decision.
  **"No qualifying successor" is a valid, successful outcome.**

## 12. Engineering gates (stage V, `parity.ts`; sealed before the freeze; a failure stops every dependent stage)

V0 isolation (only `src/d1-risk-controls-rc2/**` and `src/vg-l0-risk-families/**` changed in src/apps/config since
`26014af1`; research changes only here; RC 1's engine files = the foundation's freeze; Priority 3, 5B and shadow
evaluation digests = sealed). V1 New L0 legacy through RC 2's runner = Priority 3 (books, lots, funding, every mark
change, drawdowns, record) on FULL (AD3) and D19–D24; FULL $479,605.18 / $20,385.99 / 46 lots and the foundation's sealed
trade-list, funding and mark hashes; D24 $382,721.46 / $19,459.83 / 34 lots. V2 40 random D1 pairs legacy = Priority 3
(D21, D24). V3 64 random RC 1 configurations (every base structure) RC 2 = RC 1 (D21, D24). V4 132 random entry-day
configurations: determinism, causality (D21 vs D24), accounting, every entry-day exit re-derived from the bars (first
eligible post-fill observation, same session, at L or a minute open ≤ L, after the fill), no missed trigger, no other
exit on an entry session, protective nets < 0. V5 module tests (RC 1, RC 2, this study). V6 the preflight of every study
and the foundation's sealed records. Pass/fail counts and hashes only (no performance figure of a non-default control).
The full `npm test` runs in a contained unit beside stage V (known pre-existing failures: 7).

## 13. Report-only diagnostics (after the validation; never a selection input; tooling may be added post-freeze)

1. **§5.9 for every fold primary and every C24 finalist:** open-lot share of training net and the largest open lot's
   multiple at each cutoff; the carried lot's give-back on the next slice; per-lot MAE distribution and loss severity
   (training and next slice) with attribution to D1·GDX / D1·VGT / Growth·VGT; the training selection neighbourhood on
   the next slice (fold evaluation: breach share with Wilson interval, median and worst slice DD).
2. **Mechanics versus parameters** (C24 finalists): X's D1 vectors under legacy mechanics (parameter effect), New L0's
   D1 vectors under X's controls (mechanics effect), X − New L0 decomposed; each protected book's activation flipped
   (report-only toggle); funded/displaced lots against New L0 (matched lots).
3. **Tail stress (AD11):** for each D1 book of each finalist, the loss of a $100,000 lot bought at every session close
   and held for its hold window (configured days; adaptive: hx; disabled: 60 days, the adaptive box's bound), worst and
   p95 with dates, on (a) 2016–2024 in-sample, (b) XLK/GDXJ proxies; the worst gap through each protective level; and
   (c) synthetic gaps of −10%, −20%, −30% at an open through the stop: the realized loss per stop distance.
4. **Episodes:** the 2020 crash and the 2022 bear (DD, losses by book, losing D1 re-entries in 2022, protective and
   gap-through-stop exits, occupancy and displaced trades) for fold primaries and finalists.
5. **The activation study:** each onset cell against its base counterpart at each cutoff (qualified counts, best
   centre net, robust, p90/p95/worst-10% mean DD, worst-lot MAE, entry-day exits), per book (GDX-only, VGT-only, both).
6. **Coverage:** per cell and cutoff, proposals, plausible, feasible, shortlisted and qualified, failure reasons
   (intrinsic validity versus metrics), stop conditions; the budget equivalence against NL0 and 3B.

## 14. Resources, recoverability and integrity

- Slice `vgl0rf.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) for every heavy unit (`npm run vg-l0rf --
  launch`); child-process workers (count from the pilot bench, default 14), RC 2 D1-book cache 64 and Growth cache 48 per
  worker, gc every 64 evaluations or above 256 MiB of ArrayBuffers, pressure stop at 36 GiB (checkpoint, exit 75). Every
  evaluation is archived per job (SQLite bound to the study, job, door pin and evaluation digest); a rerun of the same
  command replays the job exactly; extension decisions at barriers; no automatic restart. The pilot (P18 pseudo-fold on
  D19, 4 cells, pilot budgets, `pilot-` names, cache only) exercises every stage and a graceful stop, a worker SIGKILL and
  a unit SIGKILL with identical resumption, and the bench measures 10–16 workers; it reads only timings, memory and
  plausibility shares.
- `results/protocol-freeze.json` records the protocol, amendments, brief, adoption manifest, RC 2 specification and
  reference-method hashes, the evaluation digest, the decision digest (search, space, fitness, qualify, select,
  budgets, folds, final, stages, nl0), Priority 3's evaluation digest (= its sealed historical value), door pins, budgets
  and resources. Every stage checks both digests; a change needs an amendment. Sealed records are read-only with their
  sha256 in `results/seals.jsonl`; per-lot rows stay in the cache. Checkpoint: `RESEARCH_RECOVERY.md`.

## 15. Reporting commitments

`REPORT.md`, `results/tables/*.md` and machine-readable summaries: the RC 2 specification and verification; per-cell
and per-seed budgets and coverage; the 64-cell base comparison and the activation study with explicit coverage
statements; the selection 2 × 2 fold by fold with winners, inputs and why they differ; the sequential verdicts and the
consequence; C24 finalists against New L0 (development, folds, validation, full history); §5.9, tail severity, stresses,
removals, episodes, gap-through-stop losses; mechanics versus parameters versus selection; uncertainty and the evidence
limits (examined history; the ceiling is a research criterion, not a loss limit; **a protective stop is not a loss
cap**); the Assignment 3 handoff; the repository status and every unmerged item. No visuals.
