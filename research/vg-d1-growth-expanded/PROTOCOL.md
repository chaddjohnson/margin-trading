# Protocol — Priority 3B: larger VGT + GDX D1/Growth search in one shared $100,000 pool, C4 as the preferred benchmark

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
substantive search). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

**Written before any search, qualification, selection, fold or validation result of this study existed.** Known
before it (all previously sealed elsewhere, development or examined history): the controls' and incumbents' sealed
records of Priorities 3, 3A and 5A (their development centres, archived neighbourhood statistics and the 2025–2026
outcomes reported there), the throughput bench of this study (timings, memory and the count of plausible random
centres only), the engineering pilot on the pseudo-fold P18 (D19, development, pilot budgets; `results/pilot/PILOT.md`:
every stage path, the interruption tests with identical resumption, mechanics, timings and memory) and the **sealed
engineering gates on the final code** (`results/parity/parity.json`: 233 checks, 0 failed).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` (the registered current version; registry checked) |
| Read / adopted (UTC, from `date -u`) | read in full 2026-11-09T17:32Z (with the registry, the template, the adoption template and the roadmap) / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/vg-d1-growth-expanded/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-d1-growth-expanded`; every stage, the pilot included, calls `requireStandardAdoption` in code before it runs) |
| Scope | `optimization` |
| Brief | `research/vg-d1-growth-expanded/brief/BRIEF.md`, sha256 `803df2048c5443ebf7c8918caec7603d8cc9f1908082336d52a1685c870e4188` (190 lines, read in full through §10) |
| Branch / base commit | `research/vg-d1-growth-expanded` in the main checkout, from `8c20f855` (end of Priority 5A); code `src/vg-d1-growth-expanded/`; `npm run vg-exp -- <command>` from the repository root |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | The formal primary is **actual profit**: the highest development centre net among the qualified members of the final selectable set, deterministic tie-breaks (§9.3). C4 is a member under the same gates and is the user's preferred **no-improvement fallback** (§9.4); a frozen, separate **prudent-recommendation rule** decides whether the evidence supports replacing C4. | — (brief §7) |
| AD2 | §4.1, §3.4 | adaptation | One allocation architecture (architecture A: one exclusive funded slot, no allocation genes). The same-instant order is **fixed** — D1 first, then GDX before VGT (the controls' harmonized order) — not searched (brief §2: preserve deterministic ordering; no allocation searches). The other order is a report-only toggle. | — (brief §2) |
| AD3 | §4.1, §2.4 | adaptation | Study 8's pipeline with three NSGA-II objectives (−centre net, −robust net, p90 DD); promotion reserves ¼ for centre net and ¼ for robust net, and ⅛ for configurations funding both Growth books in the protected stratum (§7). | — (brief §5) |
| AD4 | §4.7 | adaptation | Protected both-Growth stratum (§6.4): in every B cell and both informed lanes, every fourth island requires a B configuration funding D1 and both Growth books; reserved promotion share, refinement start and shortlist slot. Its members compete under the same gates and primary rule. | — (brief §5) |
| AD5 | §5.1 | adaptation | The pooled engine is Priority 3's, **unchanged** (its sealed parity: 495 checks, 0 failed; evaluation digest `147cad7c…4e88`, re-verified before every stage). This study's engineering gates (§12) re-verify it through the 3B configuration path: control reproduction to the cent, the independent reference on all three inclusion choices, single-family identities, prefix causality, the archived instrument and inclusion canonicalization. | — |
| AD6 | §1.4, §1.6 | adaptation (stricter) | FULL is never opened before `FROZEN_SELECTION.json` is sealed and committed, not even for the known full-history targets of C4 and VG #2: those are compared in the frozen final stage only (brief §4). | — |
| AD7 | §5.3, §4.1 | adaptation | Centre-first fidelity: a rung-1 or refinement proposal whose centre is not plausible (net ≤ 0, DD > $35,000 or a family unfunded) gets no neighbours and is infeasible (§8.3); rungs 2 and 3 and qualification always evaluate every neighbour. It is the brief's "successive neighborhood fidelity" and saves the 16 neighbours of proposals that cannot be feasible. | — (brief §5) |
| AD8 | §5.3 | adaptation | Neighbourhoods move only the **enabled** books' active inputs (a disabled Growth book is inert and canonicalized to the placeholder). Priority 3's archived instrument moved disabled books' inert inputs too; it is reproduced exactly as a report-only instrument (§8.5). | — |
| AD9 | §4.2, §4.6 | adaptation | The independent base is **131,072** distinct proposals per cutoff (4.57× Priority 3's 28,672), as the brief plans. The extension cap is **196,608** per cutoff (1.5× base) instead of the brief's approximate 262,144: at the measured 78.7 evaluations/s the brief's cap could take ≈ 35 hours in all; §7.4 states the coverage implication. | — (brief §6 allows a measured, explained reduction) |
| D1 | §1.8 | **departure** | The earlier-cutoff repetition covers the **independent procedure** only. The informed lanes (seeded with C4, C85, E, A, B and Priority 3's development-selected candidates, all chosen with later data) run at C24 only and have no chronological test; no chronological claim is made for them or for fixed-versus-joint D1 refinement. | Brief §8: "Only the independent procedure supplies chronological procedure evidence. … That extra method contest is not required here; limit claims instead." |

## 1. Question, objective and outcomes

- **Question.** Under the current funding lifecycle L0, in one shared $100,000 slot, can a configuration of VG #2's
  two D1 books (fixed or refined) plus Growth — VGT Growth only, GDX Growth only, or both — selected only on
  2016-01-04 → 2024-12-31, credibly improve on **C4** (VG #2 + VGT Growth #4, GDX Growth OFF) in profit and stability,
  within a maximum minute drawdown of **$35,000** on the fixed $100,000 principal (35% of that fixed budget, not of peak
  equity)?
- **Objective.** Actual net profit (realized + marked unrealized, after costs and interest) with credible local
  stability and costs, within the ceiling. Historical compliance does not guarantee future drawdown.
- **Primary-selection rule:** actual profit (AD1, §9.3). **Roles:** actual-profit, robust-profit, balanced,
  lower-drawdown (§9.3), ranked on the selection families; the fresh confirmation family decides qualification only.
- **Pareto set:** centre net ↑, centre DD ↓, selection p10 net ↑, selection p90 DD ↓ (reported per set).
- **Valid outcomes:** a frozen primary and roles; C4 kept (no credible improvement); "no qualified combined result";
  failed qualification of controls; a failed validation; an unsupported independent procedure. Keeping C4 is a valid
  successful outcome (brief §10). A D1-only system is never relabelled as the requested combined product.

## 2. Prior knowledge and provenance

- **Already examined** (all of 2016-01-04 → 2026-10-30, by Priorities 3, 3A and 5A, Study 8, the growth140 studies,
  Priority 2 and the user's browser):
  - **C4** (`f324035d15f69610`): development $302,785.91 / DD $17,332.09; archived confirmation median $244,936.82,
    p10 $202,108.24, p90 DD $24,448.95, 1.3% of draws above $35,000; validation +$99,081.34 (reset DD $21,536.85); full
    history $401,867.24 / $21,536.85. **The user's preferred configuration**, chosen with these outcomes in view.
  - **E** (`c45f4efa028203e9`): development $326,336.29 / $20,801.07, archived p90 DD $35,245.92 (11.5% breaches);
    validation +$115,494.92. **A** (`d4cde31356e2306a`): $310,383.36 / $20,801.07, fails Priority 3's Q3 (p90
    $36,277.63), validation +$139,887.46. **B** (`676731bfd4ec280f`): $291,868.34, fails Q3 (p90 $35,131.47),
    validation +$117,030.20. **C85** (`3688e97b90639d60`): $263,681.27 / $18,119.12, validation +$76,224.08. **D**
    (VG #2 alone): $268,487.02 / $20,801.07, validation +$74,688.80.
  - Priority 3's informed primary IP (validation −$32,190.25), independent primary XP (+$76,802.05; procedure
    chronologically unsupported) and staged primary SP (−$6,699.40).
  - Priority 3A: GDX Growth went unfunded through silent books (gates), real capital competition and promotion
    attrition; A's and B's Q3 misses come from Appendix A's GDX timing cliff. Priority 5A: L1/L2 do not help; the cost
    of GDX to VGT is the refusal at VGT's trend entry.
- **Therefore 2025-01-02 → 2026-10-30 is validation on previously examined history, not an untouched holdout.** The
  methodology, the controls and C4's selection by the user were all informed by it. Fresh seeds are not fresh market
  history.
- **Provenance of the incumbents and seeds** (`CONTROL_MANIFEST.json`): VG #2 (Study 8 F24, development-selected,
  informed for this study); Growth #4 (browser, 2016–2026 in view); Growth 08500a60 (growth140-vgt-stable, 2016–2024);
  Appendix A (browser, 2016–2026 in view); Priority 3's primaries and finalists (its C24 lanes, development). None is
  ever an independent-lane or earlier-cutoff seed.

## 3. Data, doors and windows

- **Canonical files** (git-ignored, pinned): `data/VGT/data.csv` sha256 `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b2…5049`, both 2,723 sessions 2016-01-04 → 2026-10-30 on one calendar, the last row 2026-10-30T23:59Z
  (verified 2026-11-09 by `npm run vg-exp -- doors`; identical to Priority 3's pins).
- **Common complete endpoint: 2026-10-30.** November–December 2026 do not exist and are never implied.
- **Doors:** Priority 3's physical byte-prefix doors D19 (→ 2019-12-31, 1,006 sessions), D21 (→ 2021-12-31, 1,511),
  D23 (→ 2023-12-29, 2,012), D24 (→ 2024-12-31, 2,264), each verified by size, sha256 and last row before parsing
  (`src/vg-d1-growth-joint/context.ts` pins). FULL (2016-01-04 → 2026-10-30, partition `all`, forward split adjustment)
  opens only behind this study's sealed and committed `FROZEN_SELECTION.json` (and Priority 3's own frozen-selection
  guard that its loader requires). Every opening is logged in `results/doors.jsonl`.
- **Windows:** development 2016-01-04 → 2024-12-31 (all search, refinement and selection); validation 2025-01-02 →
  2026-10-30; earlier cutoffs C19, C21, C23 (§10).
- **Continuity:** every run is one continuous causal run from 2016-01-04; nothing is liquidated or reset at a boundary.
  Validation P&L = the marked net at 2026-10-30 − the marked net at the 2024-12-31 close; the reset validation DD
  (tracker restarted at that close) and the whole-run DD are both reported.

## 4. Controls, incumbents and comparison arms

### 4.1 Exact controls (`CONTROL_MANIFEST.json`, sealed before the freeze; vectors immutable)

Every vector, enabled mask and sealed centre is read from Priority 5A's verified loader
(`src/vg-growth-funding-lifecycle/subjects.ts`: Priority 3's sha256-pinned records and `CONTROL_MANIFEST.json`, through
Priority 3A's loader) and mapped to a 3B configuration whose canonical quad must hash to the subject's own Priority 3
identity.

| Label | Composition | Inclusion | Selectable | Priority 3 id |
|---|---|---|---|---|
| **C4** | VG #2 + VGT Growth #4 `420cd989e4fa7749`; GDX Growth OFF — **the preferred benchmark** | V | yes | `f324035d15f69610` |
| C85 | VG #2 + VGT Growth `08500a60ec56cfae`; GDX Growth OFF | V | yes | `3688e97b90639d60` |
| E | VG #2 + existing GDX Growth (Appendix A `07cac3329fc7a520`); VGT Growth OFF | G | yes | `c45f4efa028203e9` |
| A | VG #2 + #4 + Appendix A | B | yes (fails Q3 as sealed; considered) | `d4cde31356e2306a` |
| B | VG #2 + 08500a60 + Appendix A | B | yes (fails Q3 as sealed; considered) | `676731bfd4ec280f` |
| D | VG #2 D1 only (`S8-VG-F24-3`, books `d1-7b99d2833d` GDX, `d1-bd80e32ee4` VGT) | — | no (D1-only control) | `7a377d49c2b9aa55` |
| IP, XP, SP | Priority 3's informed, independent and staged primaries | B | no (historical comparisons) | `575545f4…`, `86d25530…`, `d3bc1484…` |
| V4, V85 | VGT only: shipped D1 primary + #4 / 08500a60 (Priority 2) | — | no (smaller universe) | `dbe7be81…`, `51da785f…` |

All controls are D1-first (the harmonized order). A disabled Growth book carries Priority 3's placeholder vector
(identity `1af5b55987a56e2f`) and is never run or funded.

### 4.2 Candidate consideration (standard §2.8)

| Candidate | Original gate verdict (as sealed) | Descriptive evidence | User-directed consideration |
|---|---|---|---|
| A (`d4cde313…`) | fails Q3 (Priority 3: confirmation p90 DD $36,277.63) | Priority 3A, 5A; this study's fresh instrument (report beside, never relabelling) | Priority 3A brief and this brief §7: "The user accepts considering A/B despite small historical neighborhood threshold misses"; scope: research consideration only |
| B (`676731bf…`) | fails Q3 (p90 $35,131.47) | as above | as above |
| E (`c45f4efa…`) | not qualified by Priority 3 (new in 5A; archived p90 $35,245.92) | Priority 5A | this brief §4 (control) |

Consideration never relabels a gate, changes a sealed outcome, approves deployment, sets a tolerance or changes the
$35,000 budget. In this study every control's **3B verdict** comes from the fresh instrument and is reported in a
separate field beside its original verdict.

### 4.3 The comparison arms

- **Controls** (§4.1): evaluated, never searched, never overwritten.
- **Informed fixed-D1 lane** (`informed-fixed`, C24): VG #2's two D1 vectors frozen; the inclusion choice and the
  enabled Growth vectors searched.
- **Informed joint lane** (`informed-joint`, C24): the D1 vectors, the inclusion choice and the enabled Growth vectors
  searched jointly.
- **Independent discovery** (`indep`, C19, C21, C23, C24): eight cells over the three inclusion choices, both D1 vectors
  and the enabled Growth vectors mutable; no incumbent, control, archive or later-selected vector or range.

Refinement around C4 is an additional experiment, never a modification of the benchmark: C4's archived phenotype is
never changed or replaced by an approximation.

## 5. Engine and conventions

- **Engine:** Priority 3's pooled engine, unchanged (`src/vg-d1-growth-joint/evaluate.ts`, `pool.ts`, `books.ts`,
  `data.ts`): four canonical virtual books — D1·GDX and D1·VGT (the frozen `ShadowBook` under shadow semantics) and
  Growth·GDX and Growth·VGT (`runRiseTrading`'s body, Growth 1.4.0) — on one merged minute timeline.
- **L0 (preserved exactly).** A refused entry still starts the component's virtual trade; the component waits for that
  virtual exit before it decides again; funding never feeds back into a book; freed capital never revives a refusal;
  canonical virtual exits and continuation rights are kept. No L1, L2, canonical capacity hook or other funding-aware
  substitute. Growth's native eligibility is a legitimate searched option (a genuine later decision of the virtual
  book); D1's delayed-entry eligibility stays OFF.
- **Funding (architecture A):** one exclusive funded $100,000 slot; a decision is funded only at its own instant,
  before any trade stamped then, iff nothing is open or reserved; a grant reserves the slot until its fill; a retained
  Growth remainder after a partial exit keeps the slot until its final exit; no compounding, no preemption, no
  simultaneous funded positions, no reservations by family, sharing, dynamic sizing, ranking or allocation search.
  Same-instant decisions: D1 first, then GDX before VGT (fixed, AD2).
- **Economics:** one fixed $100,000 principal budget; 5 bps per executed side; $0 commission; 11% simple annual
  interest on outstanding principal by calendar day on a 365-day year; stops at the stop or the gapped open; fractional
  shares; price only. Marked net = realized + the open lot marked at the last price net of accrued interest.
- **Native → harmonized bridge.** Native VG #2 (Study 8): accounting from the close of 2016-01-04, D1 arming
  2017-06-15 — reproduced first (development $260,223.13 / $17,280.74 / 36 lots / 14 refusals; full history
  $334,911.93 / $21,303.61 in the final stage). Harmonized (every comparison): funding and D1 arming from 2016-01-04
  (each D1 machine arms once its reference high exists) — VG #2 $268,487.02 / $20,801.07 / 45 lots. The only change is
  D1's arming date (Priority 3/5A's verified bridge).

## 6. Space (`src/vg-d1-growth-expanded/config.ts`)

### 6.1 The configuration

- **Inclusion choice:** V (Growth·VGT only), G (Growth·GDX only), B (both). D1·GDX and D1·VGT are always enabled.
- **D1 ×2** (8 genes each): Study 8's common box on the registry grid (X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold
  3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200; tenths of a percentage point, days, sessions).
- **Growth ×2** (8 structural + 50 conditional numeric genes each, growth140's genes and boxes): entry Rise |
  breakout; trend filter off | 5 methods; eligibility off | 5 policies (Rise only); recovery gate off | on; exits hold
  OFF | hold ON buffer OFF | hold ON buffer ON; initial stop off | on; retention off | on; continuation off | 4 methods.
  The **coarse** box grid for the independent screens and islands; the **fine** schema grid (0.1 percentage point, 1
  session or bar) for the informed lanes, refinement and every neighbourhood.
- **Exact representability (checked by a test):** every control and every informed seed decodes back to itself on the
  fine grid (VG #2's D1 books, #4, 08500a60, Appendix A, Priority 3's candidates — e.g. 45% recovery retracement and
  the existing loss buffers).
- **Dependencies:** eligibility needs Rise; the loss buffer needs the maximum hold; method inputs are active only under
  their method; momentum S < L is repaired; the trailing stop is mandatory.

### 6.2 Identity and equivalence

- **Canonical configuration:** a disabled Growth book = Priority 3's placeholder; the order D1-first. **Identity** =
  sha256(16) of the inclusion choice and Priority 3's canonical quad text; Priority 3's quadId is kept beside it.
  Inactive genes never create a second configuration; duplicates are never evaluated twice in a job (archive key =
  door, options including the enabled mask, quad identity).
- **Behavioural equivalence:** the funded-lot ledger signature. Promotions and shortlists keep one configuration per
  ledger; distinct configurations and distinct ledgers are counted and reported separately.

### 6.3 The genome

[inclusion (3 levels)] + Priority 3's genome (17 categorical, 116 ordinal). A disabled book's genes stay in the genome
as a dormant vector (an informed island that switches the inclusion recovers a real vector); the decoded configuration
canonicalizes them away. The order gene is pinned to D1-first.

### 6.4 Cells and protected strata (independent lanes)

| Cell | Inclusion | Entry pins | Screen strata (round-robin) |
|---|---|---|---|
| `V_VGT-rise`, `V_VGT-breakout` | V | Growth·VGT entry | VGT gate off/on × (Rise) VGT eligibility off/on |
| `G_GDX-rise`, `G_GDX-breakout` | G | Growth·GDX entry | GDX gate off/on × (Rise) GDX eligibility off/on |
| `B_GDX-{rise,breakout}_VGT-{rise,breakout}` (4) | B | both entries | both gates × each Rise book's eligibility |

An "on" eligibility stratum keeps the quasi-random policy if it is one, otherwise takes policy 1 + (round mod 5).
Exits, retention, the initial stop, trend filters and continuation stay quasi-random (uniform per option) and are
reported per class. The split gives V 25%, G 25% and B 50% of every independent budget (B has four entry pairs).

**Protected both-Growth stratum (standard §4.7):** in each B cell and each informed lane, (a) ⅛ of the screen promotion
(B cells) goes to the highest-net plausible configurations funding both Growth books; (b) every fourth island (islands
3, 7) is a protected island whose feasibility requires a **B configuration funding D1 and both Growth books** (need
`all`); (c) rung promotions reserve ⅛ for feasible both-Growth-funded configurations; (d) a refinement start from the
best feasible both-funded rung-3 fit; (e) a shortlist slot "both Growth funded". Budget: ¼ of the island proposals of
every B cell and informed lane (§7). Its members compete under the same gates and primary rule. Not equal activity,
not a minimum trade count, not a rule that the winner fund every component.

## 7. Search, budget and stopping (`search.ts`, `budgets.ts`, `stages.ts`)

### 7.1 Lanes

- **indep, per cell, at C19, C21, C23 and C24 (identical schedule):** Sobol Latin-supercube screen (this study's seed
  namespace; cell pinned; strata round-robin) → plausibility (centre net > 0, DD ≤ $35,000, both families funded) →
  promotion (§7.3) → rung 1 → NSGA-II islands with the frozen extension rule → rung 2 → rung 3 → refinement → the cell
  shortlist. No incumbent, control, archive or later-selected vector or range enters; the boxes are the broad design
  boxes Priority 3's independent arm used (Study 8's common D1 box; growth140's Growth boxes, designed on VGT and
  applied to both symbols), not narrowed around any incumbent. The independence concerns configuration discovery; the
  research design itself is informed by previously examined history.
- **informed-fixed and informed-joint, C24 only:** the seeds (§7.2), their near (scale 1.5, 24 each) and broad (scale
  3, 24 each) Latin-hypercube designs, and C4's focused designs (256 at scale 0.5, 256 at scale 1.0) → rung 1 →
  islands with every free gene free (structure and **inclusion** included; informed-fixed pins VG #2's D1 genes) →
  rungs → refinement (robust, profit, both-Growth, and two starts at **C4 itself**: profit and robust, up to 4 passes
  each — the focused C4 neighbourhood investigation; moves include switching the inclusion: B → V, B → G, and V/G → B
  with Appendix A or #4/08500a60 as the added partner) → shortlist.
- **Order:** C19 search → qualify → seal and **commit** the fold selection → fold evaluation; then C21; then C23; the
  sequential policy; then C24 independent and informed searches and the C24 qualification. A fold evaluation never
  feeds a later search; no earlier cutoff ever runs after a later cutoff's selection exists (guard in code).

### 7.2 Informed seeds (every unchanged seed preserved)

Sources: C4, C85, E, A, B, IP, XP, SP, Priority 3's 15 distinct independent finalists (I02–I16) and 12 Growth-pair
finalists (G01–G12). Each source enters in every inclusion variant its Growth books allow (both, VGT only, GDX only),
with a disabled book's real vector kept dormant in the genome; informed-fixed uses VG #2's D1 vectors for every seed;
informed-joint keeps a source's own D1 vectors (VG #2's for the Growth-only pairs). Growth-first sources become
D1-first (AD2). 87 (fixed) and 88 (joint) distinct seeds; C4 is the focus seed. Every seed is evaluated unchanged and
stays in the lane's archive; the controls also stay members of the final set in their own right.

### 7.3 Islands, promotions and refinement

- **NSGA-II islands:** population 64; binary crowded tournaments; categorical genes: uniform crossover (p 0.9), random
  reset with probability 1/(free categorical genes); ordinal genes: SBX (η 15, p 0.9) and polynomial mutation (η 20,
  probability 1/(active ordinal genes)) on grid indices; (μ + λ) survivors; every child fitted at rung 1
  (centre-first). Base islands split the rung-1 archive by rank order (rank k → island k mod 4); protected islands by
  the rank order under need `all`; Latin-supercube fillers of the cell when short. **Stagnation:** 8 generations
  without a 1e-3 relative gain of the island's hypervolume of (−robust, p90) against (0, $35,000) or of the lane's
  best feasible centre net (the both-Growth best in a protected island).
- **Screen promotion (per cell, 128):** ¼ by centre net among the plausible, ¼ by constrained rank on (−net, DD), ⅛
  (B cells) by centre net among plausible configurations funding both Growth books, the rest max-min L∞ diversity; the
  first three take one configuration per funded ledger.
- **Rung promotion** (rung 2 from the rung-1 archive, rung 3 from rung 2): ¼ centre net (feasible), ¼ robust net
  (feasible), ⅛ both-Growth funded (feasible; protected strata), the rest constrained rank; one per ledger; picks at
  L∞ ≥ 0.02 (rung 2) / 0.03 (rung 3).
- **Refinement** (fine grid, 16 draws, centre-first): ≤ 2 passes (C4 starts ≤ 4) over the moves (every active numeric
  input of the movable enabled books ±R/2 and ±R; every enabled optional Growth rule OFF; the inclusion moves of the
  informed lanes). Robust start: accept the banded-best feasible move raising robust net by ≥ $2,000; profit (and C4
  profit) start: the feasible move with the highest centre net raising it by ≥ $2,000; both-Growth start: the same
  under need `all`; C4 robust start: as the robust start. From an infeasible start, the move lowering the violation
  most by ≥ 0.01. Endpoints are refitted at rung 3.
- **Shortlist** (per lane; feasible only, one per ledger, picks at L∞ ≥ 0.10): profit, robust, balanced (robust ÷
  p90), both-Growth funded (protected strata), best V / best G / best B (informed lanes), gate-alternative, then centre
  net order; cap 5 per independent cell, 8 per informed lane. The five most profitable infeasible centres stay visible.

### 7.4 Budgets (frozen; `budgets.ts`)

| Lane | Distinct proposals (base / cap) | Composition | Rungs 2 / 3 | Refinement | Shortlist |
|---|---:|---|---|---|---:|
| indep, per cell (× 8), every cutoff | 16,384 / 24,576 | screen 8,192; promote 128; islands 4 × 2,048 (+ ≤ 4 × 2,048 by extension); population 64 | 24 × 64 / 8 × 128 | robust, profit (+ both-Growth in B cells); ≤ 2 passes; 16 draws | 5 |
| indep, per cutoff | **131,072 / 196,608** | V 25%, G 25%, B 50%; protected both-Growth islands = ¼ of the B cells' islands | | | 40 |
| informed-fixed (C24) | 21,159 / 37,543 | 87 seeds × (1 + 24 + 24) + 512 C4 designs = 4,775 distinct designs (D1 reset to VG #2's); islands 4 × 4,096 (+ ≤ 4 × 4,096) | 32 × 64 / 10 × 128 | robust, profit, both-Growth, C4 profit, C4 robust | 8 |
| informed-joint (C24) | 21,208 / 37,592 | 88 seeds, the same design = 4,824 distinct designs | 32 × 64 / 10 × 128 | as above | 8 |

- **Priority 3's actual counts** (its sealed coverage): per independent cutoff 16,384 screened + 12,288 base island
  proposals (16,384 with every extension) + ≈ 2,400–3,000 refinement moves; 1,777,216 fresh evaluations in all (four
  cutoffs, three arms, neighbours included); every C24 cell exhausted its island cap with a trigger still firing.
- **3B's comparable distinct-centre exploration** is 131,072 per cutoff at base (4.57×) and up to 196,608 with every
  extension (6.9×), plus the informed lanes (42,367 base, 75,135 cap together, against Priority 3's 5,242).
- **The reduction from the brief's ≈ 262,144 cap** (AD9): the extension headroom is 50% of the base instead of 100%.
  Coverage implication: each cell may run at most 8 islands instead of 12; if triggers still fire at the cap, the
  search is reported as **budget-bound** (not converged) and the unexplored headroom is stated.
- **Evaluation estimate** (bench: 78.7 evaluations/s on D24 at 14 workers; one 4-book evaluation ≈ 105 ms on a core;
  earlier doors faster in proportion to their sessions): per independent cutoff ≈ 0.9–1.1 M evaluations at base and up
  to ≈ 1.9 M at the cap (rung-1 fits ≈ 1 + 16 × the plausible share per island proposal); C24 ≈ 3.6 h base, ≈ 6.5 h at
  the cap; all four cutoffs ≈ 11 h base, ≈ 20 h at the cap; informed lanes ≈ 2.2–4 h; qualifications ≈ 1–1.5 h;
  in total **≈ 15 h base, ≤ ≈ 26 h** with every extension. **Ceilings (enforced by the cap structure):** no lane exceeds
  its proposal cap; the pilot's measured cost per proposal is recorded before the freeze (§13).
- **Counted separately** (lab tallies): screen centres; rung-1, rung-2, rung-3 and refinement centres and neighbours;
  qualification evaluations; fold and sequential evaluations; validation; retries; archive hits; worker compute time.
  Archive reads of earlier studies (the archived instrument's replay checks) are never counted as exploration.

### 7.5 Extension policy and stopping (frozen; development progress only)

After the base islands of a lane, and after every extension island, one more island runs (up to the cap of 8) iff the
last island raised by more than **5%** the lane's union hypervolume of (−robust, p90) against (0, $35,000), or its best
feasible rung-1 robust net, or its best feasible rung-1 **centre net** — or produced a **new feasible behaviour**: a
funded-component pattern at the centre (which D1 and Growth books receive capital) not yet feasible in the lane's cell. Progress per
island is recorded (hypervolume, best robust and best net trajectories; hypervolume gain per 10,000 evaluations).
**Stopping conditions recorded:** per lane "triggers not met" or "extension cap reached"; per island "budget",
"stagnation", "no new configurations" or "generations". A cap reached with a trigger firing is **budget-bound, not
converged**. Nothing is re-searched after a fold, a qualification or the validation.

## 8. Robustness instrument (`config.ts` `neighbourhood`, `qualify.ts`)

### 8.1 Perturbation

- **Radius:** D1 — Study 8's N1 radius in grid units (X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10, W ±20)
  per book; Growth — 10% of each box in value units rounded to the fine step, per book.
- **Draws:** one Latin hypercube of n rows over the 116 numeric columns per seed family (common random numbers across a
  cutoff's centres); a neighbour = centre + u × scale × radius for every active numeric input of the scope's
  **enabled** books, rounded to the grid, clipped to the box widened to include the centre (clipping counted).
- **Categorical inputs** (structure, inclusion, order) stay fixed; categorical alternatives are report-only toggles.
  Inactive inputs untouched; orders repaired; duplicates of the centre or of earlier rows dropped; distinct
  configurations, distinct ledgers and draws equal to the centre reported.
- **Dimensions** differ by inclusion choice (D1 16 inputs + each enabled Growth book's active inputs); the active-input
  count per scope and the clipping are reported per member.

### 8.2 Families and seeds (`deriveSeed('vg-d1-growth-expanded', 'nbhd', …labels)`)

| Family | Labels | n | Scope / scale | Use |
|---|---|---:|---|---|
| rung 1 / refinement | `('r1', cutoff)`, `('refine', cutoff)` | 16 | joint / 1 | search (centre-first) |
| rung 2, rung 3 | `('r2', cutoff)`, `('r3', cutoff)` | 64, 128 | joint / 1 | search |
| selection | `('select', rep, cutoff)`, rep 1–2 | 2 × 128 | joint / 1 | **ranking and roles** |
| confirmation (fresh) | `('confirm', rep, cutoff)`, rep 1–3 | 3 × 128 = 384 | joint / 1 | **qualification only** |
| scopes | `('scope', s, cutoff)`, s ∈ d1, g, vgt, gdx | 128 each | that family or symbol | report |
| small, wide | `('small', cutoff)`, `('wide', cutoff)` | 128 each | joint / 0.5, 1.5 | report (radius sensitivity) |

No label of this namespace was used before. The confirmation draws are never used for ranking, promotion or any search
decision. They are not resampled: a member's verdict is computed once.

### 8.3 Fidelity

Rung 1 = 16 draws (centre-first: none for an implausible centre), rung 2 = 64, rung 3 = 128, refinement = 16;
selection 2 × 128; confirmation 3 × 128 (pooled, de-duplicated; the actual count reported). A 16-draw estimate is never
a confirmation.

### 8.4 Statistics

Median, p10, p90 of net; robust net = ½ median + ½ p10; median and p90 DD (linear interpolation between order
statistics); breach count and share (DD > $35,000); and report-only tail severity (standard §5.8): p95 DD, worst-10%
mean DD (the mean of the ⌈0.1 n⌉ largest), the breach share's Wilson 95% interval, the mean excess among breaches, the
worst DD, distinct ledgers behind the breaches, and the half- and 1.5×-radius families. Breach frequencies are
perturbation frequencies on one history, not probabilities of future losses.

### 8.5 The archived instrument (report-only)

Priority 3's own confirmation instrument (its namespace `vg-d1-growth-joint`, labels `('confirm', rep, 'C24')`, its
joint scope including disabled books' inert inputs) is reconstructed exactly (Priority 5A's `coreDraws`) and applied at
C24 to every final-set member, control and historical comparison. It must reproduce C4's archived statistics (median
$244,936.82, p10 $202,108.24, p90 DD $24,448.95, 1.3% above $35,000) to the cent (engineering gate E3); it is a
like-for-like comparison and never a gate or ranking input.

## 9. Qualification, roles, the primary and the C4 rule (`qualify.ts`, `folds.ts`)

### 9.1 Evidence (every member, the cutoff's training door only)

The centre; selection; fresh confirmation; scopes; small and wide; the archived instrument (C24); **stresses** (10 and
20 bps per side, 14% interest, +25 bps stop slippage, next-open stop fills — Growth books with the initial stop or
retention keep stop-level fills, recorded); **toggles** (Growth-first order; every enabled optional Growth rule OFF);
**causal removals** (without D1; without Growth; without GDX; without VGT; without each enabled component).

### 9.2 Gates (all must hold; thresholds fixed before any candidate result; verified against Priority 3's §12.2)

| Gate | Requirement |
|---|---|
| Q1 | centre net > 0 |
| Q2 | centre maximum minute DD ≤ $35,000 |
| Q3 | fresh confirmation p90 DD ≤ $35,000 (the interpolated 0.9 quantile of the 384 draws; never inferred as a breach count) |
| Q4 | fresh confirmation p10 net > 0 |
| Q5 | at 10 bps per side: centre net > 0 and centre DD ≤ $35,000 (the doubled-cost check) |
| Q6 | both families (D1 and Growth) receive capital at the centre (standard §2.7) |

No activity floor, annual-profit floor, largest-winner cap, equal-component rule or breach-rate veto. Rare but severe
tails stay prominent in the report (p95, worst-10% mean, mean excess, worst DD, Wilson interval) and are never gates.
Gates are never relaxed after results. **Near misses** (members failing only Q3, Q4 or Q5) are tabled with their exact
failed gates and severity (dollars beyond the threshold); they are not qualified.

### 9.3 Roles and the formal primary (ranked on the selection families)

Among the qualified members of a set:
- **actual-profit** = the highest centre net; ties by the higher selection robust net, the lower centre DD, then the
  label (Priority 3's `profitOrder`);
- **robust-profit** = the highest selection robust net;
- **balanced** = the highest selection robust net ÷ selection p90 DD;
- **lower-drawdown** = the lowest selection p90 DD among those with selection robust net ≥ 50% of the actual-profit
  holder's.

**Sets at C24:** `final` (selectable: C4, E, A, B, C85, the independent shortlist, both informed shortlists),
`independent`, `informed-fixed`, `informed-joint`, `controls`, and the final set restricted to each inclusion choice
(V, G, B; report). **The formal primary** = `final`'s actual-profit role. **At an earlier cutoff** the fold primary =
the actual-profit role of the independent members. **Fallback (frozen):** no qualified final member → no primary
("no qualified combined result"; a fold without one is flat in its slice).

### 9.4 C4: benchmark, fallback and the prudent-recommendation rule

- **C4 comparison labels** (development; the fresh confirmation family; every C24 member):
  - **dominates C4:** centre net ≥, centre DD ≤, confirmation p10 ≥ and confirmation p90 DD ≤ C4's, one strictly;
  - **higher-profit trade-off:** centre net > C4's without dominating it;
  - **stronger local stability:** confirmation p10 > C4's and confirmation p90 DD < C4's (any centre net);
  - **supported across later periods** (assessed only in the frozen validation stage): V1–V3 pass and validation
    P&L ≥ C4's validation P&L.
  Paired differences from C4 are reported for centre net and DD, selection robust, confirmation median/p10/p90 DD,
  costs (10/20 bps) and the validation window.
- **Replacement candidate** (frozen in `FROZEN_SELECTION.json`, development only): the qualified final-set member
  other than C4 with the highest centre net among those labelled *dominates C4*; none if no member dominates.
- **Prudent recommendation (frozen):** replace C4 only if the replacement candidate exists **and** passes V1–V3 **and**
  is supported across later periods; otherwise **C4 remains the preferred configuration** (no-improvement fallback).
  No second candidate is promoted if the first fails; validation never chooses a different winner. A formal primary
  that is not the recommendation is reported as such (e.g. "higher-profit trade-off").
- **If fresh confirmation fails C4,** that is disclosed; C4 keeps its preferred-benchmark status without being declared
  newly qualified, and the recommendation rule then reads "no qualified replacement demonstrated; C4 retained as the
  user's preference, unqualified under the fresh instrument".

## 10. Chronological procedure tests (independent procedure only)

| Cutoff | Training door (search, qualification, selection) | Committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 (2016–2019) | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 (2016–2021) | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 (2016–2023) | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 (2016–2024) | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- **Frozen members of a fold:** its independent role holders; the controls (and D) are evaluated on each slice
  descriptively (chosen with later data).
- **Sequential policy:** the fold primaries trade their slices in turn (flat without one), one continuous run per
  member on the evaluation door (nothing reset at the boundary); a switch between different configurations at a
  boundary is charged **5 bps on $100,000 per open lot it closes or adopts**. Reported: net, charges and the strict
  minute DD of the concatenated slice marks; the same for each role and each control.
- **Verdict (frozen):** *chronologically supported* iff every fold produced a primary, the sequential net > 0 and the
  sequential minute DD ≤ $35,000; *incomplete* if a fold had none; *unsupported* otherwise. Failures are reported even
  if the final neighbourhood looks attractive; local stability is not chronological reliability.

## 11. Diagnostics, the frozen selection and the one-time validation

### 11.1 Diagnostics (development D24; report-only; sealed before the frozen selection)

For the final role holders, the independent primary, each informed lane's actual-profit holder, the replacement
candidate, C4, E, A, B, C85 and D: funded-lot, funding and refusal ledgers (occupant of every refusal); participation
attribution by stage for every enabled Growth book (signals and crossings, filter and gate blocks, eligibility armed /
decided / expired / invalidated, capital refusals by occupant, virtual-state waiting and idle closes; standard §2.9);
the largest pool-level winning episode and its causal blackout rerun; matched lots against C4 (newly admitted,
displaced, retimed; reconciled to the cent) — displacement is interpreted only through complete replays; for B
members, the **GDX admission cost** (the complete rerun without Growth·GDX: Δ net, Δ VGT Growth booked, Δ D1 booked);
**VGT trend-entry refusals** (each refused Growth·VGT decision: occupant, the refused virtual trade's own net
(descriptive) and idle closes during its unfunded hold). Search and promotion attrition by inclusion and funding class
come from the sealed search records. No named future date and no hand-coded exclusion is used anywhere.

### 11.2 The frozen selection (sealed and committed before FULL opens)

The primary, every set's roles, rank orders and Pareto sets, the shortlists, every member's complete effective
configuration (all genes, inactive flags, the inclusion and allocator settings), the C4 labels, the replacement
candidate, the near misses, the chronological verdict, the code and data pins and the validation plan.

### 11.3 Validation (FULL, once, under the guard)

Every frozen member (the final primary and role holders, the independent C24 role holders, each informed lane's role
holders, the per-inclusion actual-profit holders, the replacement candidate) and every control (C4, C85, E, A, B, D,
IP, XP, SP, V4, V85) and VG #2 native: one continuous run 2016-01-04 → 2026-10-30. Reported: validation P&L with its
realized/unrealized parts, the reset validation DD, the whole-run DD and their dates, 2025 and 2026, lots after the
boundary, open remainders, refusals. **V1** validation P&L > 0; **V2** reset validation DD ≤ $35,000; **V3** whole-run
DD ≤ $35,000. **Report-only:** 10 / 20 bps and 14% interest on FULL for the primary, the replacement candidate and C4;
fresh confirmation rep 1 (128 draws) on FULL for the same (median validation P&L, share positive, p90 validation DD).
**The known full-history targets are compared here only:** C4 (development $302,785.91 / $17,332.09; validation
$99,081.34 / $21,536.85; full $401,867.24 / $21,536.85) and VG #2 native ($334,911.93 / $21,303.61). A failed
validation is a result: no new winner, no rescue search, no retuning.

## 12. Engineering gates (sealed `results/parity/parity.json` before the freeze; a failure stops every dependent stage)

| Gate | Requirement |
|---|---|
| E1 | Priority 3's evaluation files hash to its sealed parity digest `147cad7c…4e88` (the engine is the verified one). |
| E2 | L0 control reproduction (D24, through the 3B configuration path): C4, C85, E, A, B, IP, XP, SP equal their sealed development centres field for field (Priority 3 / 5A records); VG #2 harmonized and native equal $268,487.02 / $20,801.07 and $260,223.13 / $17,280.74 / 36 lots / 14 refusals. |
| E3 | The archived instrument reproduces C4's archived confirmation statistics exactly, and 16 archived confirmation draws of C4 and of A equal Priority 3's archive records field for field. |
| E4 | The independent reference (Priority 3's `reference.ts`) on 96 random configurations, 12 per cell (24 V, 24 G, 48 B; D24): the funded set exactly, money and drawdowns within $1e-6; identities on every one: Σ lots = net, never two lots, principal ≤ $100,000, a disabled book never funded, a funded lot copies its virtual trade's fills. |
| E5 | Single-family identities: VG #2's D1 pair and random D1 pairs equal Study 8's `runNAllocator`; random Growth books on both symbols equal `runRiseTrading` (Priority 3's checks). |
| E6 | Prefix causality: 24 random configurations (all inclusion choices) on D19, D21 and D23 equal their D24 runs through the shorter door (funding decisions, lots, daily marks). |
| E7 | Inclusion canonicalization: a configuration with a disabled book's vector replaced by any other vector has the same identity and an identical record; the disabled book is never funded. |

Synthetic tests (`tests/`): Priority 3's pool tests (cross-symbol calendars, merged order, decisions before trades,
reservations, same-instant ordering, the persistent unfunded virtual trade, the one slot, partial exits holding the
slot, gap exits, disabled components, year boundaries, period drawdowns, open remainders) rerun unchanged; this study's
tests of identity, inclusion canonicalization, genome round trips, incumbent representability, cells and strata,
neighbourhood determinism and masks, centre-first fidelity, roles, the primary, the fallback and the C4 labels.

## 13. Resources and recoverability

- **Containment:** every heavy stage is a transient systemd user unit inside `vgexp.slice` with **MemoryHigh=44G,
  MemoryMax=48G, MemorySwapMax=0** (re-applied before every launch; the unit carries the same limits, `KillMode=mixed`,
  `Restart=no`); heavy units run one at a time; Claude and tmux outside.
- **Execution settings (from the bench, `results/pilot/PILOT.md`):** 14 child-process workers (`--expose-gc`, 1.5 GiB
  old space), one door each, started four at a time; a full GC every 64 evaluations or above 256 MiB of ArrayBuffers;
  ≤ 2 tasks in flight per worker; queue chunks ≤ 4,096; per-worker book caches of 48 entries; a per-job SQLite archive
  (WAL; LRU ≤ 100,000 records) bound to the study, job, door pin and evaluation-code digest; a 10-second memory monitor
  (job cgroup, RSS, heap, external and ArrayBuffers per process); **dispatch stops at 36 GiB of job cgroup memory**
  (in-flight work finishes, the archive commits, exit 75).
- **Recoverability:** every evaluation is archived as it returns; a progress checkpoint (stage, per-lane island,
  generation, RNG state, counters) is written at every generation boundary and at least once a minute; a rerun of the
  same command replays deterministically from the archive (a kept lane result must equal its replay). A worker death
  fails the job promptly (its in-flight tasks dropped; no hang); no automatic restart; no OOM restart loop.
- **The pilot** (pilot budgets, `pilot-` job names, the pseudo-fold P18 on D19, outputs in the cache): the bench; a
  straight run; a graceful stop then resume; a worker SIGKILL then resume; a unit SIGKILL then resume — identical
  results; every stage path on pilot budgets; the expected refusals.

## 14. Integrity

The freeze records this file's, the amendments', the brief's, the adoption and the control manifests' sha256, the
sealed engineering gates, the evaluation digest and Priority 3's, the code closure and its digest, the door pins, the
canonical data, git `HEAD`, the budgets and the resource contract. Stages refuse to run unless the preflight passes,
the freeze is sealed and committed, the engineering gates are sealed with 0 failures and the evaluation code is the
frozen one. Records are sealed write-once (0444; `results/seals.jsonl`; `npm run vg-exp -- verify`). Fold selections
are committed before their slices; `FROZEN_SELECTION.json` before FULL. The checkpoint is `RESEARCH_RECOVERY.md`.

**Code completed after the freeze (declared now).** The searches, qualification, fold evaluation, sequential policy
and engineering gates are implemented, tested and piloted before the freeze. The diagnostics (§11.1), the frozen
selection (§11.2), the validation (§11.3) and the report tables implement this protocol as written; their code is
completed while the searches run, before any of those stages runs, and is piloted on pilot records first. It never
touches the evaluation code (the evaluation digest is checked by every stage); the change of the code closure is
recorded as an operational amendment (`O*`) with the new closure digest before the first of those stages runs.

## 15. Reporting commitments

- **Format** (standard 2.0.0 §7.7): written analysis, Markdown tables and machine-readable results (JSON, JSONL, CSV)
  only; no charts, plots, SVGs, screenshots, images, dashboards, HTML reports or PDFs; dollars with commas and two
  decimals.
- **Tables:** development, validation and full history for every frozen member and control, **C4 first**, then E, A,
  B, C85 and D: marked and realized net, open P&L, maximum minute DD in dollars and as % of the fixed $100,000 with
  dates, exposure and principal-days, funded trades, wins/losses (partial exits counted apart, never as independent
  episodes), holding periods, interest and costs.
- **Evidence:** selection and fresh confirmation, the archived instrument, tail severity, stresses, causal
  contributions, displacement, participation attribution, the GDX admission cost and VGT trend-entry refusals; complete
  effective JSON settings for every frozen member, control and inclusion choice.
- **Search:** coverage by class and inclusion, proposals and evaluations by kind (centres, neighbours by rung,
  refinement, qualification, folds, validation, retries, archive hits) with evaluation time, progress, extensions and
  stopping reasons; distinct configurations and distinct ledgers.
- **Chronology:** fold and sequential results, including procedure failures.
- **Answers** to the brief's six questions, the consideration fields of A, B and E, protocol changes and integrity
  incidents, and limitations (previously examined history; historical compliance is not a guarantee).
