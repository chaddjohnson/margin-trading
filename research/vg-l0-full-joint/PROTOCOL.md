# Protocol — Assignment 3: New L0 risk-aware successor, full joint optimization

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
search). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

Research only. Nothing here adopts, deploys or replaces New L0, changes a production setting, merges experimental engine
code into `main`, or opens broker access. Growth·GDX stays OFF; shadow-position delayed-entry eligibility stays OFF (no
path exists in the engine used). Calendar-day maximum holds (every enabled hold, D1 and Growth) and calendar-day interest
throughout. Reports are written analysis, Markdown tables and machine-readable results only (standard §7.7).

- **Study:** `research/vg-l0-full-joint/`; code `src/vg-l0-full-joint/`; `npm run vg-l0fj -- <command>` from the
  repository root. RC 2 (`src/d1-risk-controls-rc2/`), RC 1 and Assignment 2's evaluation path, fitness, qualification
  helpers and selectors (`src/vg-l0-risk-families/`) are reused UNCHANGED (imported, never copied or edited).
- **Brief:** `brief/BRIEF.md` (the user's "Claude Code — Assignment 3: New L0 Risk-Aware Successor, Full Joint
  Optimization", 296 lines, 30,356 bytes, sha256 `5620330a52e569f73e18d397cda1d7725f0275b2db464e2c67f7c322340ad9ba`, read in
  full to its final "Success criterion").
- **Branch:** `research/vg-l0-full-joint` (main checkout) from `73d3a74818ab97d0fe69b59b10bebf6ec2ba849d` (the verified tip
  of `research/vg-l0-risk-families` = its remote; it contains `main` = `108c241b`).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.2.0`, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` (registered current) |
| Read / adopted (UTC) | read in full 2026-11-15T11:53Z; adopted at `adoptedAt` of the manifest |
| Adoption manifest | `STANDARD_ADOPTION.json`; every stage calls `requireStandardAdoption` in code (`stages.ts studyGuards`) |
| Scope | `optimization` |
| Reference method (§4.8) | `docs/research/methods/NEW_L0_METHOD.md`, id `NL0`, version `1.0.0`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` (stage map §7.7) |
| Controls engine | RC 2 = `research/vg-l0-risk-families/SPECIFICATION_RC2.md` on RC 1 (`research/vg-l0-risk-controls-foundation/SPECIFICATION.md`), both unchanged |
| Source proposal | `research/vg-l0-risk-families/ASSIGNMENT3_HANDOFF.md` (sha256 `4f3aa85d…`): evidence and a proposal, not a binding protocol; every choice below is made here |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §4.1, §4.3, §4.8 | adaptation | **64 structural cells, the full joint genome.** A Track I lane pins one cell (D1·GDX family × gate, D1·VGT family × gate: 4 × 4 × 2 × 2). The protective stop's activation is a per-book categorical gene (B/C/D books), protected by the screen strata, not a cell (brief §2.1). Growth·VGT's complete Growth 1.4.0 genome (8 structural + 50 conditional numeric genes) is searched in every lane with NL0's V-cell protections (the six Growth strata, ⅛ entry-pattern share, entry- and gate-alternative slots); Assignment 2's K protections (strata, ⅛ share, K-alternative slot) are kept and extended to the activation ("control pattern"). 5B's both-Growth items have no object (Growth·GDX OFF). | — (brief §2.1, §2.2, §3) |
| AD2 | §4.2, §4.8 | adaptation | **Effort by replicates of NL0's unchanged per-lane schedules:** Track I broad = the V-cell schedule × 2 replicates per cell per cutoff; Track I stage-2 refinement = NL0's informed schedule × 2 replicates per refined cell; Track N = NL0's informed schedule × R_N replicates per family pair (§8.3). Budget equivalence against NL0's effective budget, Priority 3B and Assignment 2 is reported. | — (brief §3.1–§3.2) |
| AD3 | §1.2, §1.4 | adaptation (one exception, otherwise stricter) | FULL opens before the frozen selection only in stage V, only for the frozen New L0 under legacy defaults (its full-history figures are published), through `openFullForBaseline`, refused once any search record exists (Assignment 2's AD3). No searched configuration, no other incumbent and no search output runs on FULL before `FROZEN_SELECTION.json` is sealed and committed. | — (brief §0.2) |
| AD5 | §5.9 and §5.8 [R]; §0.2 | **departure (study-specific)** | The experimental selector **RA1** (§10.2, Assignment 2's code unchanged) uses §5.9/§5.8-type quantities computed at the cutoff — the largest open lot's market-value multiple, the open-lot share of training net, the worst per-lot adverse excursion, the selection family's worst-10% mean DD — and the training occupancy as ranking inputs; RA2 (its ablation) uses the conservative net. Only RA1 and RA2 use them; the original rule, Q1–Q6, the roles and the refinement plan's profit/robust/drawdown slots do not. Standard 2.2.0 is **not** changed; no [M] rule is weakened; no other study is bound. | Brief §4: "Register a study-scoped, precommitted departure permitting RA1 to use them for selection, as Assignment 2 did. Do not change the standard globally during this search." |
| AD6 | §5.3 | adaptation | **Neighbourhood instrument of the joint genome:** every active numeric input is perturbed — D1 genes in Study 8's N1 grid radii, the active control genes in Assignment 2's radii, Growth·VGT's active inputs by 10% of their box in value units rounded to the fine step (NL0's Growth instrument); K and every categorical input (cell, activation, Growth structure) fixed. New L0's local statistics under it are not comparable with 5B's (different seeds, no Growth·GDX columns) nor with Assignment 2's (Growth was fixed there). | — |
| AD7 | §4.5, §4.6, §6 | adaptation | **Extension and the resource guard:** NL0's per-lane triggers (5%), island caps (6 broad, 8 informed/refinement) and finishing reserves; but the job cap is the **sum of the lanes' worst cases** under the unchanged schedules (`budgets.ts laneWorstCase`), so the resource guard can no longer stop an extending lane before NL0's island cap. Assignment 2's 117–155 resource-bound lanes per cutoff (brief §3.3) cannot recur; lanes stop on "triggers not met" or "extension cap reached" (budget-bound, not converged). | — (brief §3.3 "Address that bottleneck in the proposed budget and job-cap design") |
| AD8 | §4.4, §3.2, §3.3, §1.9 | adaptation | **Track N (incumbent-informed, C24 only):** one lane per D1 FAMILY PAIR (16) × R_N replicates, NL0's informed schedule, the two D1 gates free categorical genes inside the lane (NL0's informed islands freed the structure likewise), every phenotype vector free; seeds = New L0, IJ1, C4, C4-refined projected onto the pair's four gate states through the precommitted grid of §7.5; the four incumbents are members of the informed selectable sets N and U under the same gates and rules (the qualifying-incumbent rule). Its own budget and job caps; every Track N result is labelled "incumbent-informed; no independent chronological test". | — (brief §3.2) |
| AD9 | §2.3, §2.5 | adaptation | **Two frozen selection procedures on identical populations** (§10): the original NL0 rule and Assignment 2's RA1 (thresholds unchanged), plus RA2 as a secondary ablation, applied to L, B, F (Track I, every cutoff) and N, U (C24). NL0 stays the canonical historical reference method; RA1 is a co-equal experimental arm, not a new permanent primary. | — (brief §4) |
| AD10 | §4.1, §4.3 | adaptation | **Track I stage-2 refinement** (§7.3): a frozen rule picks up to 16 cells + the legacy cell from the cutoff's own qualified broad members (structural and Growth-family coverage safeguards); their lanes are seeded only with those same-cutoff members. Part of the independent procedure at every cutoff; labelled "refinement (same-cutoff seeds)". | — (brief §3.1) |
| AD11 | §5.9 (reference history) | adaptation | No disjoint pre-2016 VGT/GDX data exist on the machine; none is downloaded or bought (brief §0.3). The hold-window tail stress uses an **in-sample stress** over 2016–2024, the **same-period peer proxies** XLK and GDXJ (labelled "proxy, same period, not disjoint") and **synthetic gap scenarios**. | — |
| AD12 | §5.1 | adaptation | The engineering gates are stage V (§12): New L0 parity, random full joint parity against Priority 3 and RC 1, canonical Growth parity and Growth signal causality, entry-day invariants, causality and accounting, worker reproducibility, module tests and frozen-work verification. | — |
| AD13 | §1.8, §2.5 | adaptation | **The qualifying-successor rule** (§11.4) adds to Assignment 2's rule a precommitted condition of materially stronger downside risk than New L0 (brief Mission), measured on the C24 evidence with Assignment 2's frozen $2,500 band. | — (brief Mission, §5.2) |

Assignment 2's AD4 (conditionally independent chronology, Growth·VGT fixed) does **not** apply here: every Track I lane
searches Growth·VGT fresh from its own cutoff's door, so the Track I verdicts are independent chronological tests of the
full joint procedure (brief §2.2).

## 1. Question, objective and outcomes

- **Question:** does a fresh, full joint search of D1·VGT, D1·GDX (with their risk-control structures) and Growth·VGT
  (its whole genome), scored on one causal shared-capital replay and selected chronologically by NL0's rule or by RA1,
  find a successor that keeps as much of New L0's profit as possible with materially stronger downside risk and credible
  chronological selection evidence?
- **Objective (§2.2):** development net profit (realized + marked, after costs and interest) under the $35,000 maximum
  minute drawdown on the fixed $100,000 principal, with neighbourhood robustness, chronological evidence and exposure
  diagnostics beside it. A lower-profit but better-supported risk profile can be preferable — only under the frozen rules.
- **Hypotheses** (each may fail; a null is a result):
  - **H1 (joint Growth).** Optimizing Growth·VGT jointly improves on Assignment 2's frozen-Growth procedures: a Track I
    procedure's sequential path (2020–2024) is better than the same population × selector procedure of Assignment 2 by
    the frozen label rule (§11.3; report-only, Assignment 2's verdicts were conditional and its instrument differed).
    Null: no material difference, or worse.
  - **H2 (independent vs informed).** At C24 Track N's best qualified centre net exceeds Track I's by more than $2,500
    (an informed advantage). Null: the independent search reaches a comparable region.
  - **H3 (selection).** On identical populations RA1's sequential path is a "risk improvement" over the original rule's
    (§11.3). Null: no material difference, or a profit sacrifice without clear benefit.
  - **H4 (chronology).** At least one Track I procedure is chronologically supported. Null (expected from history: every
    earlier independent procedure failed): none is.
  - **H5 (successor).** A qualifying successor exists (§11.4). Null: "no qualifying successor".
- **Valid outcomes:** a qualifying successor (a research nomination only); research-only improvements; **"no qualifying
  successor"**; "no chronological support for any procedure". None is a failure of the study.

## 2. Prior knowledge and provenance

- **New L0** (NL0 §1.1): 5B `C24/L0/informed/R1#1 profit`, cfg `67cfdd9b62d1e16f`, Priority 3 quad `a2e385640ca61012`;
  D1·VGT [237,9,73,15,72,42,103,41], D1·GDX [277,1,61,13,232,25,152,10], Growth·VGT `6b5f909b30cfa516`, Growth·GDX OFF.
  Development $382,721.46 / DD $19,459.83 / 34 lots; validation $96,883.72 / reset DD $20,385.99; full history
  $479,605.18 / DD $20,385.99 / 46 lots (5B `results/validation/validation.json` `83931139…`; the foundation's sealed
  `g1-g3-new-l0.json` `b05b5c78…` with its trade-list, funding and mark hashes). **Chosen with later data (informed lane);
  not an independently validated production strategy.**
- **The lineage incumbents** (5B's sealed FROZEN_SELECTION.json `cd223a0d…`, crossTestSubjects; identities checked in
  `nl0.ts`): IJ1 (R14, `940fdaf770eedc9d`, development $382,163.79), C4 (R20, `2f49a1cc226b4ece`, $302,785.91),
  C4-refined (R21, `0f017f0ab9b26f24`, $360,569.71); every one informed (chosen with 2016–2026 or 2016–2024 in view).
- **Assignment 2** (`research/vg-l0-risk-families/REPORT.md`): no qualifying successor; all 9 procedures unsupported;
  F/RA1 sequential +$100,002.36 / DD $39,855.06 (a $4,855 breach in March 2020) versus F/original −$29,466.30 / $80,621.62;
  the hold policies and the decline gate did the work, the protective stops (9–25%) were almost never reached; entry-day
  activation showed no detectable effect; replicate noise $9–16k median per cell; 117–155 resource-bound lanes per cutoff
  from C21 on. Its verdicts were conditional on New L0's fixed Growth·VGT. **RA1's thresholds were designed after the
  walk-forward diagnostic examined 2020–2024**; they are used here unchanged, never tuned on that evidence.
- **Examined history.** 2016-01-04 → 2026-10-30 has been examined by Priorities 3–8, the shadow and session studies, the
  walk-forward diagnostic, Assignments 1–2 and Strategy Lab; 2020, 2022 and 2025–2026 repeatedly. Every fold and the
  validation here are **retrospective procedural evidence on previously examined history, not virgin out-of-sample
  proof** (§1.6); more folds or seeds do not create independent market histories.
- **Real-data exposure before this protocol:** stage V's dry runs (pass/fail and hashes only; New L0 and the four
  incumbents' known figures), the bench and the pilot (timings, memory, counts). No box, threshold, quota, budget or rule
  here was informed by a searched configuration's real-data performance.

## 3. Data, doors and windows

- Canonical minute data `data/VGT/data.csv` (`2ee06310…412e`) and `data/GDX/data.csv` (`77dba9b2…5049`); Priority 3's
  byte-prefix doors D19, D21, D23, D24 (through 2019-12-31, 2021-12-31, 2023-12-29, 2024-12-31; size, sha256 and last
  row verified before parsing) and FULL (2016-01-04 → **2026-10-30**, the common complete endpoint, re-verified by
  `npm run vg-l0fj -- doors`); no November–December 2026 data exist and none is implied.
- Development 2016-01-04 → 2024-12-31 for every choice; validation 2025-01-02 → 2026-10-30 for frozen selections only.
- Folds: C19 → slice 2020-01-02 → 2021-12-31 (door D21), C21 → 2022-01-03 → 2023-12-29 (D23), C23 → 2024 (D24); C24 →
  FULL once. Every run is continuous from 2016-01-04 (no liquidation or reset at a boundary); slice P&L = the change of
  the marked net from the cutoff close; slice DD resets at the cutoff close; whole-run DD is reported beside it.
- Every door opening is logged in `results/doors.jsonl`. Split handling: the development doors contain no VGT or GDX
  split; FULL applies forward adjustment (VGT 8:1 on 2026-04-21).
- Proxy data for the tail stress only (§13, report-only): `data/XLK/data.csv`, `data/GDXJ/data.csv` (2016–2024 part).

## 4. Controls and comparison arms

| Key | Definition | Role |
|---|---|---|
| New L0 | frozen New L0 under legacy defaults (cell GA0.VA0, its D1 vectors and Growth·VGT) | control at every cutoff (qualified with the same instrument, descriptive; never selectable in Track I); comparator of the successor rule; a selectable member of N and U at C24 (incumbent) |
| IJ1, C4, C4-refined | the lineage incumbents under legacy defaults | Track N seeds (projected, §7.5) and selectable members of N and U at C24 (incumbents) |
| The legacy population L | Track I's cell GA0.VA0 (family A, gate OFF on both books: New L0's D1 mechanics) searched fresh, Growth free | the legacy-structure baseline |
| Assignment 2's procedures | its sealed F/original, F/RA1, L/original, L/RA1 primaries and paths (Growth·VGT frozen; conditional) | report-only comparison rows, labelled "Growth-frozen and conditional" |

The main comparison is {L, F} × {original, RA1} on identical archived populations per cutoff (B and RA2 secondary), and
at C24 the independent F against the informed N under both selectors (U as NL0's combined set). No selector launches a
search. Ablations (§13.2) are report-only and never nominate a candidate.

## 5. Engine and conventions (unchanged)

- Priority 3's pooled engine: one exclusive funded $100,000 slot, granted only at a decision's own instant when nothing is
  open or reserved; same-instant order D1 first, then GDX before VGT; no compounding, preemption or forced switches;
  5 bps per side inside the fill prices, $0 commission; 11% simple interest on outstanding principal by calendar day
  (365-day year); stops at the stop level or the gapped open; fractional shares; harmonized D1 arming from 2016-01-04;
  D1's shadow (virtual-book) lifecycle; Growth lifecycle L0 (a refused Growth entry is an unfunded virtual position);
  shadow-entry eligibility OFF; Growth·GDX disabled (Priority 3's placeholder `1af5b55987a56e2f`, never run or funded).
- D1 books: deep entry, post-exit continuation ON, net-profit trailing-stop policy (New L0's D1 structure), with RC 2's
  optional controls (protective stop with next-session or entry-day activation, the hold policies, the decline gate).
  Growth·VGT: Growth 1.4.0 on 1d signal bars, warm-up 0, every rule of its genome; its maximum hold in calendar days.
- Evaluation path (`evaluate.ts` = Assignment 2's, unchanged): RC 2's `evaluateWithControls2` (Priority 3's books, pool
  and record); identity RC 2's `riskId2`; a legacy configuration keeps Priority 3's identity and evaluation key.

## 6. Space

### 6.1 Structures (brief §2.1)

Per D1 book, **8 book structures**: family A (no protective stop, legacy calendar hold), B (protective stop, legacy hold),
C (protective stop, hold disabled), D (protective stop, adaptive progress-extended hold) × the decline gate OFF/ON
(A0 … D1). **Cells** = GDX structure × VGT structure: **64 cells**, every one with the identical Track I budget; the two
books are never forced to share a structure (asymmetric cells are 56 of 64). An unlimited hold without the protective
stop does not exist in the design (C requires the stop). The activation (next-session / entry-day) is a per-book
categorical gene active only on a B/C/D book; the decline gate's K is an ordinal gene active only with the gate ON. Track
N's lane structure is the **family pair** (16): the families pinned, the two gates free.

### 6.2 Genome, grids and active genes (`space.ts`)

| Block | Genes | Unit / levels | Box | Grid (coarse / fine) | Neighbourhood radius | Active when |
|---|---|---|---|---|---|---|
| structure | fam GDX, fam VGT | A–D | — | pinned per lane | fixed | always |
| structure | gate GDX, gate VGT | OFF/ON | — | pinned (Track I) / free (Track N) | fixed | always |
| activation | act GDX, act VGT | next-session / entry-day | — | categorical | fixed | family B, C, D |
| Growth·VGT structure | entry, trend, elig, gate, exits, istop, retain, cont | growth140's options (2, 6, 6, 2, 3, 2, 2, 5) | — | categorical | fixed | always (elig only with Rise) |
| D1 (per book) | X, Y, stop, hold, L, buffer, P, W | tenths / days / sessions | Study 8's box (X 80–300, Y 1–50, stop 30–150, hold 3–30, L 20–250, buffer 0–60, P 30–200, W 10–200) | integer (one grid) | N1: 10, 2, 10, 2, 10, 10, 10, 20 | always, except hold and buffer under C |
| controls (per book) | d | tenths of the raw entry fill | 30–250 | 1 | 10 | B, C, D |
| | hx | calendar days | 6–60, repaired to ≥ hold + 3 | 1 | 2 | D |
| | g | tenths above the raw entry fill | 10–150 | 1 | 10 | D |
| | K | failed attempts | 1–4 | 1 | 0 (fixed; refinement ± 1) | gate ON |
| | r | tenths of the decline | 100–1000 | 10 | 5 grid units | gate ON |
| | c | sessions | 5–250 | 1 | 10 | gate ON |
| Growth·VGT numeric | 50 conditional inputs | growth140's | growth140's boxes | coarse = growth140's box steps; fine = the schema step | 10% of the box, value units, fine-step rounding | iff Growth's own structure activates the input |

- 14 categorical + 78 ordinal = 92 genes; verified count: Growth 1.4.0 = 8 structural + 50 conditional numeric genes
  (`growth140-vgt-s8m/space.ts`). Resolution (NL0 §3.2): **coarse** for Track I's screens and islands; **fine** for the
  stage-2 refinement and Track N lanes, every refinement move and every neighbourhood. Every incumbent, every control
  value of the seed grid and every Growth vector of the incumbents is exactly representable on the fine grid (tested).
- **Inactive genes** are masked: an inactive D1/control gene is pinned at index 0 in Track I (never varied or perturbed);
  Growth's inactive inputs and Track N's gate controls of a gate-OFF book stay **dormant** in the genome (varied only by
  crossover; mutated only when active; never perturbed); an A book's activation is inert. Masked genes never create a
  second configuration (identity by the effective Growth vector and the canonical controls; tested).
- **Identity:** `riskId2` of the quad (D1 pair, Growth·GDX placeholder, the configuration's Growth·VGT, D1 first) and the
  canonical controls (Priority 3's quadId when legacy, `rc1-…`, `rc2-…`). Behavioural equivalence: the funded-lot ledger
  signature (one configuration per ledger in promotions and shortlists). **Distance:** normalized L∞ over the active
  numeric inputs; 1 across cells, activation patterns or Growth structures.

### 6.3 Audit of the boxes (brief §2.3; before any real-data result of a searched configuration)

- The D1 and control boxes are Assignment 2's audited boxes, adopted unchanged (its PROTOCOL §6.3: engineering validity
  d 1–999, extended hold > hold and ≤ 365, g 1–999, K 1–20, r 1–1000, cooldown 1–1000; every research box lies inside;
  the adaptive repair keeps hx ≤ 60). They were not redesigned in light of Assignment 2's winners.
- The Growth boxes are NL0's (growth140's) documented domains, unchanged; the Growth maximum hold 3–30 calendar days.
- Version check: Growth 1.4.0's schema (`apps/strategy-lab/shared/strategies.ts`) validates every decoded vector
  (`effectiveOf`); no genuine version change since NL0. No technical invalidity was found; no adaptation of a box.

## 7. Search (`search.ts`, `stages.ts`)

### 7.1 Track I broad stage (every cutoff, every cell, 2 replicates)

One lane = NL0's independent V-cell schedule on one cell: Latin-supercube scrambled-Sobol screen of **512** proposals
over the whole genome (coarse grid; structure pinned; strata §7.2) → plausibility (centre net > 0, centre DD ≤ $35,000,
D1 and Growth both funded) → promotion of **64** (¼ centre net among the plausible, ¼ constrained rank on (−net, DD), ⅛
per Growth entry pattern, ⅛ per control pattern — each only with more than one pattern present — the rest max-min L∞
diversity; one per ledger in the first four) → rung 1 (16 neighbours, centre-first: an implausible centre gets none and
the unmeasured penalty) → **2 base NSGA-II islands × 256 new proposals** (population 32; objectives (−centre net, −robust
net, p90 DD); binary crowded tournaments; categorical uniform crossover p 0.9 and reset at 1 / free categorical genes;
ordinal SBX η 15 p 0.9 and polynomial mutation η 20 at 1 / active ordinal genes on grid indices; (μ+λ) survivors;
children fitted at rung 1; start populations = the rung-1 archive split by rank; stagnation 8 generations without a 1e-3
relative gain of the hypervolume of (−robust, p90) against (0, $35,000) or of the best feasible centre net; ≤ 200
generations) → extension islands (§7.6) → rung 2 (12 × 64; ¼ centre net, ¼ robust, ⅛ entry pattern, ⅛ control pattern,
the rest constrained rank; one per ledger; L∞ ≥ 0.02) → rung 3 (6 × 128; L∞ ≥ 0.03) → refinement (robust and profit
starts; NL0's moves §7.4; one pass; endpoints refitted at rung 3) → shortlist **3** (profit, robust, balanced, the
Growth entry, Growth gate and control-pattern alternatives, then centre-net order; feasible, one per ledger, L∞ ≥ 0.10).
Seed keys `<cutoff>/broad/<cell>/R<r>`; no incumbent, control, archive or later-selected vector or range enters.

Jobs per cutoff: `broad1` (cells 1–32 in `allCells` order, 64 lanes) and `broad2` (cells 33–64, 64 lanes).

### 7.2 Protected strata (every Track I screen and island filler)

Factors: the activation of each protected book (2 levels), the gate's K of each gated book (4 levels), Growth·VGT's
structural stratum (NL0's six: rise·gate off·elig off, rise·off·on, rise·on·off, rise·on·on, breakout·gate off,
breakout·on). P = the product (6 … 384). A screen of n takes ⌊n / P⌋ full cycles (mixed radix: activation fastest, then K,
then Growth) and a remainder of n mod P strata chosen greedily for balance (each next stratum minimizes the sum of its
factor levels' counts, ties by its pairwise counts, then its index). Every stratum gets ≥ ⌊n / P⌋ proposals and every
level of every factor within one of every other level (tested for all 64 cells). "elig on" keeps a quasi-random policy
when the screen drew one, else policy 1 + (its Growth stratum's occurrence count mod 5). Every family, gate, activation,
K value and Growth stratum therefore gets protected initial coverage in every cell, asymmetric cells included.

### 7.3 Track I stage-2 refinement (every cutoff; frozen rule `select.ts refineCells`)

From the cutoff's qualified broad members only, in this order, up to **16 cells + the legacy cell**: (1) GA0.VA0 always
(seeded from its qualified members, else its shortlisted members); (2) the 4 cells with the best qualified centre net; (3)
the 4 with the best selection robust net; (4) the 2 with the lowest selection p90 DD among members with robust ≥ 50% of
the cutoff's best; (5) the 2 best cells under RA1; (6) coverage, each if not yet covered, by the best qualified centre
net: every family A–D on D1·GDX and on D1·VGT, a gated and an ungated cell, an asymmetric cell, a protected cell, and
among the chosen cells' members both Growth entry methods and both Growth recovery-gate states. Cells without a qualified
member are not eligible (reported). Each refined cell gets **2 lanes** of NL0's informed schedule seeded by the cell's own
qualified broad members (each seed + 12 near (scale 1.5) + 12 broad (3) designs; focus seeds = the cell's actual-profit
and robust-profit members + 64 (0.5) + 64 (1.0)); 4 base islands × 384 (extension ≤ 8); rung 2 16 × 64; rung 3 8 × 128;
refinement from robust, profit, profit-2 (one pass) and focus-profit / focus-robust at each focus seed (two passes);
shortlist 6 (profit, robust, balanced, the alternatives, centre-net order). Fine grid; the cell fixed; the activation and
Growth's structure free. Seed keys `<cutoff>/refine/<cell>/R<r>`. The refinement shortlists are qualified like the broad
ones (a configuration already qualified at the cutoff keeps its evidence).

### 7.4 Refinement moves (NL0's, every lane type)

Every active D1 and control gene with a radius by ± R/2 and ± R grid units; K ± 1; every active Growth input by ± R/2 and
± R in value units (fine step); every enabled optional Growth rule switched OFF; each protected book's activation
switched; in Track N only, each D1 gate switched (ON with K 2, r 500, c 60 — the middle level of §7.5's grid). The cell
never moves in Track I. Robust starts accept the banded best feasible move raising robust net ≥ $2,000; profit starts the
feasible move with the highest centre net raising it ≥ $2,000 (neighbours measured only for moves whose centre could be
chosen); infeasible starts the move with the least violation (≥ 0.01 lower).

### 7.5 Track N — incumbent-informed (C24 only; `informed.ts`)

One lane per D1 family pair (16) and replicate (R_N, §8.3): NL0's informed schedule, fine grid, families pinned, gates,
activations and every phenotype vector free. Its **16 projected seeds** = 4 incumbents (i = New L0, IJ1, C4, C4-refined)
× the pair's 4 gate states (j = OFF/OFF, ON/OFF, OFF/ON, ON/ON): the incumbent's own D1 vectors and Growth·VGT on the cell,
with control levels GDX a = (i + j) mod 4 and VGT b = (i + 2j + 1) mod 4 of the precommitted grid

| level | 0 | 1 | 2 | 3 |
|---|---:|---:|---:|---:|
| d (tenths) | 80 | 120 | 160 | 200 |
| hx (days over the book's hold h, ≤ 60) | h + 3 | h + 9 | h + 15 | h + 21 |
| g (tenths) | 20 | 40 | 70 | 100 |
| K | 1 | 2 | 3 | 4 |
| r (tenths) | 300 | 500 | 700 | 900 |
| c (sessions) | 20 | 60 | 120 | 240 |

and the activation entry-day for GDX iff i + j is odd, for VGT iff i + ⌊j / 2⌋ is odd (each grid level 4 times per book
and lane; each activation 8 times; tested). A gate-OFF book keeps its grid K, r, c as dormant genome values. **Focus
seeds** (2 per lane): New L0 at gate state (R − 1) mod 4 and C4-refined at gate state (R + 1) mod 4 — across replicates
each covers every gate state, so the focus is not concentrated on New L0's own legacy structure. Designs: each seed + 12
near (1.5) + 12 broad (3); each focus seed + 64 (0.5) + 64 (1.0) (≤ 656 per lane); rung 1; 4 base islands × 384
(extension ≤ 8; the gates evolve by the categorical operators); rungs 16 × 64 and 8 × 128; refinement robust, profit,
profit-2 (one pass) and the focus starts (two passes) with gate switches; shortlist 6 (profit, robust, balanced, the best
member of each of the pair's gate states not yet represented, the alternatives, centre-net order). Seed keys
`C24/informed/<pair>/R<r>`. Jobs `informed1` (GDX families A, B: 8 pairs) and `informed2` (C, D). The incumbents are
qualified with Track N's shortlists (New L0's C24 control evidence is reused for its incumbent row). Track N never feeds
Track I: no Track I stage reads a Track N record.

### 7.6 Extension and stopping (frozen; development only)

After its base islands a lane runs one more island iff its last island raised its hypervolume, its best feasible robust
net or its best feasible centre net by > 5%, or produced a new feasible behaviour class (cell × control pattern × funded
components), up to 6 (broad) / 8 (refinement, informed) islands, subject to the resource guard (requested so far + the
round's worst case + the finishing reserve × lanes ≤ the job cap; AD7 makes it non-binding), decided at barriers. The
record names each lane's stop: triggers not met; extension cap reached (budget-bound, not converged); resource guard.
**Budget exhausted is not convergence.** Progress per 10,000 evaluations is recorded per island.

### 7.7 Stage map against NL0 1.0.0 (§4.8)

| NL0 stage | Here | Adaptation |
|---|---|---|
| Independent lanes V/G/B, 2 replicates per cutoff | 64 cells × 2 replicates, each the V-cell schedule (the G and B cells' structures do not exist: Growth·GDX OFF; their budgets are reassigned through the V-cell schedule to the 64 cells) | AD1, AD2 |
| Informed lane (C24), 2 replicates | Track N: 16 family pairs × R_N replicates of the informed schedule; seeds projected | AD8 |
| (none) | Track I stage-2 refinement, same-cutoff seeds | AD10 |
| Qualification Q1–Q6, roles, actual-profit primary | unchanged; plus RA1/RA2 on the same evidence | AD5, AD9 |
| Final selectable set = independent + informed + incumbents | population U; Track I's own primaries L/B/F beside it | AD9 |
| Folds C19 → C21 → C23, commits before slices, sequential verdict | unchanged; 9 Track I procedures | — |
| Frozen selection, FULL once | unchanged | AD3 |

## 8. Budgets (`budgets.ts`; frozen)

### 8.1 Per cutoff

| Stage | Lanes | Distinct proposals (configured base / maximum) | Backend evaluations (job cap = Σ lane worst case) |
|---|---:|---:|---:|
| Track I broad (`broad1`, `broad2`) | 128 | 131,072 / 262,144 (2 × 64 × (512 + 2–6 × 256)) | 128 × PLC_broad |
| Track I broad qualification (≤ 384 members + New L0) | — | — | members × 700 |
| Track I refinement (≤ 17 cells × 2) | ≤ 34 | ≤ 66,028 / ≤ 118,252 (≤ 406 designs + 4–8 × 384 per lane) | lanes × PLC_refine |
| Track I refinement qualification (≤ 204 members) | — | — | members × 700 |
| Fold evaluation (next-slice neighbourhoods; C19–C23) | — | — | 60,000 |

### 8.2 C24 only: Track N

| Stage | Lanes | Distinct proposals | Backend evaluations |
|---|---:|---:|---:|
| Track N informed (`informed1`, `informed2`) | 16 × R_N | 16 × R_N × (≤ 656 designs + 4–8 × 384) | lanes × PLC_informed |
| Track N qualification (≤ 6 × lanes members + 3 incumbents) | — | — | members × 700 |

PLC = the per-lane cap = the lane's worst case under its schedule, rounded up to 1,000 (`laneWorstCase`: every centre
plausible, every island to the cap with a full filler population, every refinement pass over the largest move set of 230
moves): PLC_broad, PLC_refine and PLC_informed are recorded in the freeze (§8.4).

### 8.3 Matching Track N to Track I at C24 (brief §3.2)

R_N = the smallest integer ≥ 4 such that the expected Track N requested evaluations (16 × R_N × the pilot's mean
informed-lane cost) are at least the expected Track I C24 search evaluations (128 × the pilot's mean broad-lane cost + 34
× its mean refinement-lane cost), each from the study-fidelity calibration on D19 (§8.4). Proposals, islands, refinement
starts and moves, requested and fresh evaluations and archive hits are reported for both tracks side by side; the
residual differences (different schedules, informed seeds, no screen in Track N) are stated, and no claim of equal effort
is made beyond the units that match.

### 8.4 Measured before the freeze (pilot, cache only; timings and counts only)

(filled in from the bench and the calibration before the freeze; recorded in `AMENDMENTS.md` R-entries)

Against NL0's effective budget (5B's L0 arm: 8,192 independent base proposals per cutoff, 489,695 requested search
evaluations in all) the Track I broad stage is 16× its independent base per cutoff; against Priority 3B (131,072
independent base per cutoff) 1×; per cell and replicate (512 screen + 2–6 × 256 island proposals) it equals NL0's V cell
exactly. Counted separately: screen, rung-1/2/3 and refinement centres and neighbours, qualification, folds, retries
(`runs.jsonl`) and archive hits. The pilot measures throughput; it never resizes a stage or a box, and a reduction after
the freeze would be an amendment. **If a budget proves infeasible, the study stops and reports the constraint** instead of
underfunding a comparator.

## 9. Robustness instrument, qualification and roles (`qualify.ts`)

- **Neighbourhoods** (AD6): one Latin hypercube of u ∈ [−1, 1] over the 78 numeric columns per family (`deriveSeed(
  'vg-l0-full-joint', 'nbhd', …labels)`), common random numbers across a cutoff's centres (labels never contain the cell,
  stage or track); clipped to the box widened to include the centre (clipping counted); K and categorical inputs fixed;
  inactive inputs untouched; the adaptive bound repaired; duplicates dropped (counts reported). Families: rung 1 /
  refinement 16, rung 2 64, rung 3 128, **selection 2 × 128** (labels ('select', rep, cutoff): ranking), **confirmation 3
  × 128 = 384** (('confirm', rep, cutoff): qualification only).
- **Statistics:** median, p10, p90 net; robust = ½ median + ½ p10; p90 DD (linear interpolation); breach share with its
  Wilson interval, mean excess, worst DD, p95 DD, worst-10% mean DD (report-only except in RA1, AD5).
- **Gates Q1–Q6 (all must hold):** Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000; Q4
  confirmation p10 > 0; Q5 at 10 bps per side centre net > 0 and DD ≤ $35,000; Q6 D1 and Growth both funded at the centre.
  No activity, concentration or tail gate. A stop is not a dollar-loss cap.
- **Report-only evidence per member:** stresses 0, 10 and 20 bps per side, 14% interest, +25 bps stop slippage
  (protective fills included), next-open stops (entry-day stops included); causal removals (without D1, without Growth,
  without GDX, without VGT, without D1·VGT); participation labels (token < 5% of funded principal-days); boundary inputs
  (active inputs on a box bound).
- **Detailed training centre** (every member; `evaluate.ts riskInputsOf` on the cutoff's door): the marked training net
  and its realized/unrealized split, the **conservative training net** (realized + the open lot's mark only when
  negative), the open lot at the cutoff close (book, entry, multiple = market value ÷ original principal, mark), the
  open-lot share of training net (undefined when net ≤ 0), occupancy (sessions with a funded lot at the close ÷ sessions),
  per-lot MAE = min(lowest minute mark during the lot's life, its final net) — distribution and per book — worst realized
  lot, mean losing lot, every lot's holding days (cache).
- **NL0's roles** (per population): actual-profit = highest centre net (ties: selection robust, lower centre DD, label);
  robust-profit = highest selection robust; balanced = highest selection robust ÷ selection p90 DD; lower-drawdown =
  lowest selection p90 DD with robust ≥ 50% of the actual-profit holder's. Pareto set on centre net, centre DD, selection
  p10, selection p90 DD.

## 10. Selection (`select.ts`; frozen before any search)

### 10.1 Populations and inputs

Per cutoff every qualified member (de-duplicated; the New L0 control excluded) forms **L** (Track I, cell GA0.VA0), **B**
(Track I, no entry-day book: RC 1 mechanics) and **F** (Track I, all 64 cells); at C24 also **N** (Track N's members and
the four incumbents) and **U** (F ∪ N: NL0's final selectable set). Every selector reads ONLY the cutoff's training
evidence (the centre and its detailed replay on the cutoff's door, the selection family and the gates); never a
confirmation family for ranking, a later slice, a next-slice neighbourhood or the validation. Both main selectors see
identical populations and identical evidence; neither orders an extra simulation or launches a search.

### 10.2 The rules (Assignment 2's code, imported unchanged; stage V and `tests/select.test.ts` re-derive every one of Assignment 2's 36 sealed primaries with it)

- **Original (NL0 1.0.0 §3.5):** the actual-profit role — the highest centre net among the qualified; ties: higher
  selection robust net, lower centre DD, label.
- **RA1 — the experimental risk-aware rule** (AD5): four screens on the training evidence at the cutoff close — **S1** the
  open lot's market value ÷ its original principal ≤ **1.50** (no open lot: pass); **S2** the open lot's mark ÷ the
  training net ≤ **25%** (no open lot, or a negative mark: pass); **S3** the worst per-lot MAE over the training funded
  lots ≥ **−$17,500**; **S4** the selection family's worst-10% mean DD ≤ **$35,000** — then (1) fewest failed screens;
  (2) within that group, the members whose conservative training net is within **5%** of the group's best → the lowest
  training occupancy; (3) ties: higher conservative net, higher selection robust net, lower centre DD, label. A member
  passing every screen always outranks one failing any; a population without a qualified member has no primary. RA1
  converts no profit into a weighted score. **No threshold is tuned** (its known March 2020 breach in Assignment 2 is not
  a reason to change it).
- **RA2 — secondary ablation** (reported, never a verdict of RA1, never a successor nomination): the highest conservative
  training net among the qualified (ties as RA1 step 3).
- **Archive:** for every cutoff, population and selector the sealed selection records the primary, the top 10 with every
  input and the failed screens; the report states why the rules ranked differently (trade timing, occupancy, risk inputs,
  displaced trades, realized versus unrealized P&L).

## 11. Chronology, consequence and the successor rule

### 11.1 Folds

For C19, then C21, then C23: broad searches → broad qualification → refinement plan → refinement searches → refinement
qualification → selection, all sealed and **committed before the next door opens**; then the fold evaluation on the next
door (each population × selector primary, the populations' roles and New L0, one continuous run per row with the cutoff
as boundary). C24: Track I as above, then Track N's searches and qualification, then the selection. Guard in code: an
earlier cutoff never runs after a later cutoff's selection exists.

### 11.2 Sequential paths and verdicts

Each of the 9 Track I procedures (L, B, F × original, RA1, RA2) chains its fold primaries over 2020–2021, 2022–2023 and 2024
(continuous slice marks; 5 bps of $100,000 per open lot closed or adopted at a switch). **Verdict:** *supported* iff every
fold produced a primary, the sequential net > 0 and the sequential minute DD ≤ $35,000; otherwise *unsupported* or
*incomplete*. The **primary verdicts are the 2 × 2** (L/original, L/RA1, F/original, F/RA1); B and RA2 are secondary.
Every Track I verdict is an **independent** chronological test of its procedure. Track N and U have **no independent
chronological test** (C24 only; standard §1.8–§1.9); no fold result is ever claimed for them.

### 11.3 Frozen comparison labels (band $2,500; Assignment 2's rule)

For two procedures X and Y over the three folds: **risk improvement** (X over Y) iff sequential DD(X) < DD(Y) − $2,500
and in every fold X's slice DD ≤ Y's + $2,500; **profit sacrifice without clear benefit** iff sequential net(X) < net(Y)
− $2,500 and not a risk improvement; **no material difference** iff both sequential differences are within $2,500;
otherwise **mixed**. Applied to RA1 vs original (L, B, F), F vs L under each selector, F/RA1 vs L/original, RA2 vs RA1,
and (report-only, H1) each Track I procedure against Assignment 2's same population × selector procedure. One market
history and three correlated slices: every label is retrospective procedural evidence, never proof (standard §3.4).

### 11.4 Consequence (§1.8) and the qualifying successor (brief §5.2; AD13)

- **Consequence (2.2.0 default, adopted):** a procedure whose chronological verdict fails or cannot be computed gives
  "no chronological support: not a deployment-qualified candidate without the user's explicit decision"; a Track N or U
  selection is "incumbent-informed; no independent chronological test" with the same consequence. It is a label and a
  decision point, never a fitness term, ranking input or gate, and never changes a sealed gate verdict.
- **Qualifying successor:** the C24 primary X of a Track I procedure (L, B or F × original or RA1) is a qualifying
  successor iff (a) X passes Q1–Q6 at C24; (b) the procedure's sequential verdict is *supported*; (c) X is not dominated
  by New L0 (C24 evidence, same instrument) on (centre net, centre DD) nor on (confirmation p10, confirmation p90 DD);
  (d) **materially stronger downside risk** than New L0 on the C24 evidence: confirmation worst-10% mean DD ≤ New L0's −
  $2,500, centre DD ≤ New L0's + $2,500 and worst per-lot MAE ≥ New L0's − $2,500; (e) X passes V1–V3 once on FULL.
  Otherwise X is **research-only** with its reason; compelling but nonqualifying candidates are preserved separately.
  RA2, N and U primaries are never qualifying successors. A qualifying successor is a research nomination only;
  deployment or replacement of New L0 needs the user's decision. **"No qualifying successor" is a valid, successful
  outcome.**

## 12. Engineering gates (stage V, `parity.ts`; sealed before the freeze; a failure stops every dependent stage)

V0 isolation (only `src/vg-l0-full-joint/**` and the `vg-l0fj` npm script changed under src/apps/config since
`73d3a748`; research changes only here; RC 1/RC 2 = Assignment 2's frozen closure; Priority 3, 5B, shadow and Assignment
2 evaluation digests and Assignment 2's decision digest = sealed). V1 New L0 legacy through this study's path = Priority 3
(books, lots, funding, every mark change, drawdowns, record) on FULL (AD3) and D19–D24; FULL $479,605.18 / $20,385.99 / 46
lots and the foundation's sealed trade-list, funding and mark hashes; D24 $382,721.46 / $19,459.83 / 34; IJ1, C4 and
C4-refined = 5B's sealed D24 nets. V2 random full joint configurations: legacy = Priority 3 (D21, D24); next-session = RC
1. V3 Growth: canonical Growth 1.4.0 parity of random Growth genomes (Priority 3's `checkGrowth`); an active Growth step
changes the identity (always) and Growth's trades (≥ half of the cases); genomes differing only in inactive genes give the
identical configuration and record; funded Growth lots = Growth's virtual trades. V4 entry-day invariants (Assignment 2's
V4). V5 causality (D21 vs D24, every book) and accounting. V6 worker vs in-process identity; JSON round trips. V7 module
tests (RC 1, RC 2, Assignment 2, this study). V8 the preflight of every study; Assignment 1's and 2's sealed records verify.
Pass/fail counts and hashes only. The full `npm test` runs in a contained unit beside stage V (known pre-existing
failures: 7; it reads whole data files, as in Assignment 2, and never feeds a study decision).

## 13. Report-only diagnostics (after the validation; never a selection input; tooling may be added post-freeze)

1. **§5.9 for every fold primary and every C24 finalist:** open-lot share of training net and the largest open lot's
   multiple at each cutoff; the carried lot's give-back on the next slice; per-lot MAE distribution and loss severity
   (training and next slice) with attribution to D1·GDX / D1·VGT / Growth·VGT; the training selection neighbourhood on
   the next slice (breach share with Wilson interval, median and worst slice DD).
2. **Causal ablations** (C24 finalists): controls disabled (each D1 book reverted to legacy), Growth·VGT frozen at New
   L0's, D1 vectors at New L0's, activation flipped, each family/symbol removed; the decomposition of X − New L0 into new
   mechanics, changed D1 parameters, changed Growth parameters and allocator occupancy; matched funded/displaced lots.
3. **Tail stress (AD11):** for each D1 book of each finalist, the loss of a $100,000 lot bought at every session close and
   held for its hold window (configured days; adaptive: hx; disabled: 60 days, the adaptive box's bound), worst and p95
   with dates, on (a) 2016–2024 in-sample, (b) XLK/GDXJ proxies; the worst gap through each protective level; (c)
   synthetic gaps of −10%, −20%, −30% at an open through the stop (the realized loss per stop distance).
4. **Disabled-hold family:** longest holds, open positions at cutoffs and the end, cumulative financing cost, exposure
   under sustained declines, and the conditions that make a protective stop fire or fail to contain a loss.
5. **Episodes:** the 2020 crash and the 2022 bear (DD, losses by book, losing D1 re-entries, protective and
   gap-through-stop exits, occupancy and displaced trades) for fold primaries and finalists.
6. **Coverage and search accounting:** per cell, stratum and cutoff — proposals, plausible, feasible, shortlisted and
   qualified; failure reasons; stop conditions; duplicate ledgers; clipped and boundary candidates; replicate variability;
   selection frequencies of families, activations, gates, K and Growth strata across seeds and folds; Track I versus
   Track N effort; the budget equivalence against NL0, 3B and Assignment 2.
7. **Ledgers:** trade and capital-pool event ledgers and provenance-complete phenotype manifests of the finalists.

## 14. Resources, recoverability and integrity

- Slice `vgl0fj.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) for every heavy unit (`npm run vg-l0fj --
  launch`); the worker count, Growth and D1 caches and gc cadence chosen by the bench (§8.4) and recorded in the freeze;
  pressure stop at 36 GiB (checkpoint, exit 75). Every evaluation is archived per job (SQLite bound to the study, job, door
  pin and evaluation digest); a rerun of the same command replays the job exactly; extension decisions at barriers; no
  automatic restart. The pilot (P18 pseudo-fold on D19, 4 cells and 2 family pairs, pilot budgets, `pilot-` names, cache
  only) exercises every stage and a graceful stop, a worker SIGKILL and a unit SIGKILL with identical resumption; the
  bench measures worker counts; a study-fidelity calibration (`VGL0FJ_PILOT_BUDGET=study`, pilot only) runs the study's
  per-lane schedules on pilot structures. The chain is `chains/chain1.sh` (fail-fast; its own systemd unit; it commits
  each sealed block).
- `results/protocol-freeze.json` records the protocol, amendments, brief, adoption manifest, RC 2 specification and
  reference-method hashes, the evaluation digest, the decision digest (this study's decision files and Assignment 2's
  imported ones), Priority 3's evaluation digest (= its sealed historical value), door pins, budgets, the seed grid and
  resources. Every stage checks both digests; a change needs an amendment. Sealed records are read-only with their sha256
  in `results/seals.jsonl`; per-lot rows stay in the cache. Checkpoint: `RESEARCH_RECOVERY.md`.

## 15. Reporting commitments

`REPORT.md`, `results/tables/*.md` and machine-readable summaries: the engineering/parity report; per-cell, per-stratum
and per-seed coverage and the stage-level execution and resource accounting (proposals, unique phenotypes, simulations,
neighbourhood/qualification evaluations, cache hits, retries, time, stop reasons, budget-bound lanes); the selection
records with NL0 versus RA1 on identical populations fold by fold (winners, inputs, failed screens, why they differ); the
sequential verdicts with their independence labels and the consequence; Track I versus Track N at C24; the C24 finalists
against New L0 and Assignment 2's rows (development, chronological path, previously examined 2025–2026, full history:
net, minute DD, lots, neighbourhood p90/p95/worst-tail, worst perturbation, loss severity, exposure, financing,
utilization); §5.9, tail severity, stresses, removals, episodes, gap-through-stop losses; the ablations; uncertainty and
the evidence limits (examined history; the ceiling is a research criterion, not a loss limit; **a protective stop is not
a loss cap**; few independent adverse events); the explicit answers to the brief's §6 questions; the Assignment 3
conclusion; the repository status and every unmerged item; a note that a prospective paper/shadow comparison needs a
separately authorized setup and future observations (none is scheduled, no order is created). No visuals.
