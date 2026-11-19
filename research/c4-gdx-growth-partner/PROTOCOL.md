# Protocol — Priority 3C: a fixed-anchor GDX Growth partner search beside C4-refined, C4 and VGT Growth #4

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
substantive search). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

**Written before any search, qualification, selection, fold or validation result of this study existed.** Known before
it (all previously sealed elsewhere, or engineering only): the anchors' and controls' sealed records of Priorities 3,
3A, 5A and 3B (their development centres, 3B's fresh-confirmation statistics and the 2025–2026 outcomes reported
there); this study's sealed control manifest and archive audit (the development centre of the newly combined control
C4-refined + Appendix A, read only after the manifest had frozen it); the throughput bench (timings, memory, the share
of plausible random centres); the engineering pilot on the pseudo-fold P18 (D19, pilot budgets; `results/pilot/PILOT.md`:
every stage path, the interruption tests with identical resumption, mechanics, timings and memory; amendment R1) and the
**sealed engineering gates on the final evaluation code** (`results/parity/parity.json`: 146 checks, 0 failed).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` (the registered current version; registry checked) |
| Read / adopted (UTC, from `date -u`) | read in full 2026-11-10T12:16Z (with the registry, the template, the adoption template, the roadmap and the context-recovery guide) / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/c4-gdx-growth-partner/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/c4-gdx-growth-partner`; every stage, the pilot included, calls `requireStandardAdoption` in code before it runs) |
| Scope | `optimization` |
| Brief | `research/c4-gdx-growth-partner/brief/BRIEF.md`, sha256 `c98a3e42e8c24849102d4d7882aa10d3dd5de24613830d9c2184cb7f68815b4d` (the 2026-11-10 revision; 112 lines, read in full through "Delivery and roadmap") |
| Branch / base commit | `research/c4-gdx-growth-partner` in the main checkout, from `84ae46b3` (the end of Priority 3B, pushed); code `src/c4-gdx-growth-partner/`; `npm run c4gdx -- <command>` from the repository root |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5, §3.2 | adaptation | Three separate objectives (arms R, O, G), each with its own selectable set: the arm's baseline (its anchors with GDX Growth OFF — a real member, never an invalid result), the arm's Appendix A control and its searched GDX partners. Each arm's primary is its **actual-profit** role (§9.3). The baseline is the arm's no-improvement fallback; a frozen prudent-recommendation rule decides whether the evidence supports adding GDX Growth (§9.4). | — (brief "Exact experiments and controls") |
| AD2 | §4.1, §3.4 | adaptation | One allocation architecture (A: one exclusive funded slot, no allocation genes); the same-instant order is fixed (D1 first, then GDX before VGT — the controls' harmonized order), never searched. | — (brief "Funding, dates and economics") |
| AD3 | §4.1, §2.4 | adaptation | Study 8's pipeline on the **Growth·GDX genome only** (58 genes at the schema's fine step); promotion reserves ¼ for centre net and ¼ for robust net (profit-based promotion kept beside robust promotion), the rest constrained rank or max-min diversity. | — (brief "Bounded search") |
| AD4 | §5.3 | adaptation | Two neighbourhood scopes with common random numbers across every member and arm of a cutoff: **whole-portfolio** (every enabled book moves, the anchors included) and **GDX-only** (anchors at their frozen values). Search rungs use the whole-portfolio scope; qualification uses both (Q3/Q4 whole-portfolio, Q7 GDX-only, §9.2). Rows keep their index so a member and its baseline are compared on identical draws. | — (brief "Qualification and measuring improvement") |
| AD5 | §4.2, §4.5 | adaptation | Unequal budgets by arm, as the brief weights them (base 16,384 / 4,096 / 4,096 new GDX centre proposals per cutoff; development-only extensions to 2×). Extension triggers are measured in dollars and hypervolume (§7.5); there is no "new funded pattern" trigger because every feasible configuration funds the same components by construction. Disclosed: the unequal allocation is a priority choice, never a method comparison. | — (brief "Bounded search") |
| AD6 | §4.1, §5.3 | adaptation | Centre-first fidelity (as Priority 3B AD7): a rung-1 or refinement proposal whose centre is not plausible (net ≤ 0, DD > $35,000, an anchor family unfunded or **Growth·GDX unfunded**) gets no neighbours and is infeasible; rungs 2 and 3 and qualification always evaluate every neighbour. A GDX book that is never funded is behaviourally the baseline: it is never a partner, never shortlisted and never counted as useful coverage. | — |
| AD7 | §5.1 | adaptation | Priority 3's pooled engine is reused **unchanged** (evaluation digest `147cad7c…4e88`, re-verified by every stage). This study's gates E1–E8 (§12) re-verify it through the 3C configuration path. | — |
| AD8 | §1.4, §1.6 | adaptation (stricter) | FULL is never opened before `FROZEN_SELECTION.json` is sealed and committed, not even for the known full-history targets of C4, C4-refined and VG #2 (compared in the frozen validation only). | — |
| D1 | §4.4, §1.9, §0.3 | **departure** | **No independent discovery lane exists.** Every configuration carries anchors chosen with later data in view (VG #2 by Study 8 F24 and the user, #4 in the browser with 2016–2026 in view, C4-refined by Priority 3B's informed lane); the "broad" GDX lanes are broadly initialized but conditional on those anchors, so they are labelled **anchor-conditional (informed)**, never independent. The earlier-cutoff repeats (§10) are performed with the same budgets but are **descriptive fixed-anchor repeats**, never chronological evidence of a procedure; anchors are not regenerated or retuned to make an independence claim. | Brief "Funding, dates and economics": "This is incumbent-informed research on previously examined history … Even a broadly initialized GDX search conditional on these anchors is not a fully independent chronological discovery procedure … label fixed-anchor repeats as descriptive; they cannot erase anchor provenance. Do not regenerate or retune the anchors merely to make an independence claim." |

## 1. Question, objective and outcomes

- **Question.** Under the current funding lifecycle L0, in one shared $100,000 slot, can a new GDX Growth phenotype —
  searched alone, every other book's parameters frozen — improve (R) C4-refined, (O) original C4, or (G) VGT Growth #4
  alone, within a maximum minute drawdown of **$35,000** on the fixed $100,000 principal (35% of that fixed budget, not of
  peak equity)? Does the same GDX phenotype transfer between those objectives, and how much baseline opportunity does
  it displace?
- **Objective.** Actual net profit (realized + marked unrealized, after costs and interest) of the actual pooled
  portfolio, with credible local stability (both scopes) and costs, within the ceiling. Historical compliance does not
  guarantee future drawdown.
- **Primary-selection rule:** per arm, actual profit (AD1, §9.3). **Roles:** actual-profit, robust-profit, balanced,
  lower-drawdown (§9.3), ranked on the whole-portfolio selection families; the fresh confirmation families decide
  qualification only.
- **Pareto set** per arm: centre net ↑, centre DD ↓, selection p10 net ↑, selection p90 DD ↓.
- **Valid outcomes:** a frozen primary per arm (a partner or the baseline); "GDX OFF remains preferable" for any arm; a
  risk/profit trade-off; no improvement; failed qualification; a failed validation; descriptive fold results either way.
  A negative result is a result.

## 2. Prior knowledge and provenance

- **Already examined** (2016-01-04 → 2026-10-30, by Priorities 3, 3A, 5A, 3B, Study 8, growth140 and the user's
  browser):
  - **C4** (`f324035d15f69610`): development $302,785.91 / DD $17,332.09; 3B fresh confirmation p10 $204,977.07, p90 DD
    $24,519.07; validation +$99,081.34 (reset DD $21,536.85); full $401,867.24 / $21,536.85. The user's preferred
    configuration, chosen with these outcomes in view.
  - **C4-refined** = Priority 3B `C24/informed-fixed#1 profit` (3B id `0f017f0ab9b26f24`, Priority 3 quad
    `07443ffaeef41e85`): development $360,569.71 / $17,280.74; 3B fresh confirmation p10 $222,241.29, p90 DD $24,708.71;
    validation $91,512.65 / $19,477.66; full $452,082.36 / $19,477.66. Qualified and passed validation in 3B; the user
    is considering it as a new favourite (no preference is recorded here).
  - **A** (C4 + Appendix A, `d4cde31356e2306a`): $310,383.36 / $20,801.07; fails Q3 in Priority 3 (p90 $36,277.63) and
    under 3B's instrument (p90 $35,879.73); validation +$139,887.46. **E** (VG #2 + Appendix A): $326,336.29 /
    $20,801.07, fails 3B's Q3 ($35,057.52); validation +$115,494.92. **VGT #4 alone** (`90f84e00063dcc76`): $92,575.71 /
    $14,578.10 / 11 lots (5A). **GP4** (#4 + Appendix A, Growth only): $79,459.91 / $21,972.42 (5A). **D** (VG #2 alone):
    $268,487.02 / $20,801.07.
  - **C4-refined + Appendix A** (the newly combined control, frozen in `CONTROL_MANIFEST.json` before evaluation): the
    archive audit found it in 3B's informed archive (a refinement move) — development $361,319.81 / $20,801.07, 7 GDX
    lots — and re-evaluated it identically. No other result of it is known.
  - Priority 3A / 5A / 3B: GDX Growth went unfunded through silent books (trend-filter and gate blocks), capital
    competition and promotion attrition; a funded GDX lot can refuse a VGT Growth trend entry and leave the slot idle for
    hundreds of sessions; Appendix A has a GDX timing cliff (trailing stop 7% → 7.3%).
- **Therefore 2025-01-02 → 2026-10-30 is validation on previously examined history, not an untouched holdout.** The
  anchors, the controls, the methodology and the user's interest in C4-refined were all informed by it.
- **Provenance of the anchors and seeds** (`CONTROL_MANIFEST.json`): VG #2 (Study 8 F24, development-selected, chosen by
  the user with later data in view); #4 (browser, 2016–2026 in view); C4-refined (3B's informed fixed-D1 lane, 2016–2024
  development, seeded with #4); Appendix A (browser, 2016–2026 in view); Priority 3 and 3B GDX books (their selections,
  data through their cutoffs).

## 3. Data, doors and windows

- **Canonical files** (git-ignored, pinned): `data/VGT/data.csv` sha256 `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b2…5049`, both 2,723 sessions 2016-01-04 → 2026-10-30 on one calendar, last row 2026-10-30T23:59Z (verified
  2026-11-10 by `npm run c4gdx -- doors`; identical to Priority 3's pins).
- **Common complete endpoint: 2026-10-30.** November–December 2026 do not exist and are never implied.
- **Doors:** Priority 3's physical byte-prefix doors D19 (→ 2019-12-31), D21 (→ 2021-12-31), D23 (→ 2023-12-29), D24
  (→ 2024-12-31), each verified by size, sha256 and last row before parsing. FULL opens only behind this study's sealed
  and committed `FROZEN_SELECTION.json` (and Priority 3's frozen-selection guard its loader requires). Every opening is
  logged in `results/doors.jsonl`.
- **Windows:** development 2016-01-04 → 2024-12-31 (all search, refinement and selection); validation 2025-01-02 →
  2026-10-30; earlier cutoffs C19, C21, C23 (§10).
- **Continuity:** every run is one continuous causal run from 2016-01-04; nothing is liquidated or reset at a boundary;
  actual and virtual states continue through it. Validation P&L = the marked net at 2026-10-30 − the marked net at the
  2024-12-31 close; the reset validation DD and the whole-run DD are both reported.

## 4. Controls, anchors and comparison arms

### 4.1 Exact anchors and controls (`CONTROL_MANIFEST.json`, sealed before any evaluation; vectors immutable)

Read from Priority 5A's verified loader (Priority 3's sha256-pinned records) and Priority 3B's sealed and committed
`FROZEN_SELECTION.json` (sha256 `f7629968…422e`), and built through this study's configuration path; each must hash to its
published Priority 3 identity (checked in code, E2 and the tests).

| Key | Composition | Arm | Role | Priority 3 id |
|---|---|---|---|---|
| **R0** | **C4-refined**: VG #2's D1 books + C4-refined's VGT Growth; GDX Growth OFF | R | baseline (lead) | `07443ffaeef41e85` |
| RA | C4-refined + Appendix A (`07cac3329fc7a520`) — the newly combined control | R | selectable control | `68e9ab372b4ba734` |
| **O0** | **C4**: VG #2 + VGT Growth #4 (`420cd989e4fa7749`); GDX Growth OFF | O | baseline | `f324035d15f69610` |
| OA | A: C4 + Appendix A | O | selectable control | `d4cde31356e2306a` |
| **G0** | **VGT Growth #4 alone** (no D1; Priority 3's Growth-only convention) | G | baseline | `90f84e00063dcc76` |
| GA | GP4: VGT #4 + Appendix A, Growth only | G | selectable control | `0f17bddbd7f63a56` |
| E | VG #2 + Appendix A; VGT Growth OFF | — | contextual | `c45f4efa028203e9` |
| D | VG #2 D1 only | — | contextual | `7a377d49c2b9aa55` |

C4-refined's VGT Growth book differs from #4 in far more than the trend filter (OFF) and the trailing stop (5.7%): its
complete effective vector (`CONTROL_MANIFEST.json` `c4Refined.differencesFromGrowth4`) also has the initial stop OFF,
Rise 5.8% over 80 bars, eligibility age 21, gate 64 / 12.4% / 48.9% / 5, loss buffer 2.8%, and the shallow-pullback
continuation 43 / 9 / 3.9% / 3% / 7.9% / 2.73%. It is an alias of the 3B phenotype, never a new one.

### 4.2 Candidate consideration (standard §2.8)

| Candidate | Original gate verdict (as sealed) | Descriptive evidence | User-directed consideration |
|---|---|---|---|
| A = OA (`d4cde313…`) | fails Q3 (Priority 3: p90 $36,277.63; 3B: $35,879.73) | Priorities 3A, 5A, 3B; this study's instrument (reported beside, never relabelling) | Priority 3A/3B briefs: considered despite small neighbourhood misses; research only |
| E (`c45f4efa…`) | not qualified (3B: fails Q3, $35,057.52) | as above | 3B brief §4 control; here contextual |

### 4.3 The arms

- **R (lead):** C4-refined's anchors frozen; Growth·GDX searched; scored against R0.
- **O:** C4's anchors frozen; Growth·GDX searched; scored against O0.
- **G (companion):** VGT #4 alone frozen (no D1); Growth·GDX searched; the two-book Growth pool scored against G0.
- **Cross-transfers** (§9.5): a development-frozen set of each arm's GDX finalists placed unchanged beside the other
  arms' anchors (complete pooled reruns, no tuning; report-only).
- Refinement of an anchor is never done: neither VGT vector, nor VG #2's D1 vectors, is ever mutated.

## 5. Engine and conventions

- **Engine:** Priority 3's pooled engine, unchanged (`src/vg-d1-growth-joint/evaluate.ts`, `pool.ts`, `books.ts`,
  `data.ts`): four canonical virtual books on one merged minute timeline; a disabled book is never run or funded.
- **L0 (preserved exactly).** A refused entry still starts the component's virtual trade; the component waits for that
  virtual exit before it decides again; funding never feeds back into a book; freed capital never revives a refusal;
  canonical virtual exits and continuation rights are kept. GDX Growth's native eligibility is a searched option (a
  genuine later decision of the virtual book); D1's delayed-entry eligibility stays OFF.
- **Funding (architecture A):** one exclusive funded $100,000 slot; a decision is funded only at its own instant iff
  nothing is open or reserved; a grant reserves the slot until its fill; a retained Growth remainder after a partial
  exit keeps the slot until its final exit; no compounding, no preemption, no simultaneous funded positions, no sizing,
  sharing, capital reservation by family or funding-aware behaviour. Same-instant decisions: D1 first, then GDX before
  VGT (fixed, AD2). Anchor **parameters** are frozen, not their executed trade calendars: a GDX lot can displace an
  anchor trade, and the real portfolio runs continuously to measure it. No future VGT/D1 entry date is ever used to
  forbid a GDX entry or to schedule an exit; no input knows the length of an idle interval; no parameter is keyed to a
  named historical event.
- **Economics:** one fixed $100,000 principal budget; 5 bps per executed side; $0 commission; 11% simple annual interest
  on outstanding principal by calendar day on a 365-day year; stops at the stop or the gapped open; fractional shares;
  price only.
- **Native → harmonized bridge.** Native VG #2 (Study 8: D1 arming 2017-06-15) is reproduced first (development
  $260,223.13 / $17,280.74 / 36 lots / 14 refusals; full $334,911.93 / $21,303.61 in the frozen validation only).
  Harmonized (every comparison): funding and D1 arming from 2016-01-04. The only change is D1's arming date.

## 6. Space (`src/c4-gdx-growth-partner/space.ts`)

### 6.1 The configuration

- **Arm** (R, O, G) — its anchors fixed (§4.1) — and **Growth·GDX**: OFF (the baseline) or ON with a Growth 1.4.0 vector
  on growth140's genes and broad canonical boxes: entry Rise | breakout; trend filter off | 5 methods; native
  eligibility off | 5 policies (Rise only); recovery gate off | on; exits hold OFF | hold ON buffer OFF | hold ON buffer
  ON; initial stop off | on; retention off | on; continuation off | 4 methods; 50 conditional numeric inputs.
- **Grid:** the schema's **fine** step everywhere (0.1 percentage point, 1 session or bar), so Appendix A and every prior
  GDX phenotype is exactly representable (checked for every seed).
- **Dependencies:** eligibility needs Rise; the loss buffer needs the maximum hold; method inputs are active only under
  their method; momentum S < L is repaired; the trailing stop is mandatory.

### 6.2 Identity and equivalence

- **Identity** = sha256(16) of the enabled mask and Priority 3's canonical quad text (a disabled book carries Priority 3's
  placeholder vector; D1 placeholders for the Growth-only arm), with Priority 3's quadId kept beside it. Inactive genes
  never create a second configuration; duplicates are never evaluated twice in a job.
- **Behavioural equivalence:** the funded-lot ledger signature. Promotions and shortlists keep one configuration per
  ledger, and never one with the baseline's ledger (an unfunded GDX book). Distinct configurations, distinct ledgers and
  baseline-equivalent proposals are counted and reported.

### 6.3 Cells, strata and the participation statement (standard §4.7)

- **Cells:** per arm, the GDX entry (rise | breakout) is a protected broad lane; a third, seeded lane holds the informed
  seeds (entry free).
- **Screen strata (round-robin, broad lanes):** recovery gate off/on × trend filter off/on × (Rise) eligibility off/on ×
  maximum hold off/on — 16 Rise strata, 8 breakout strata; an "on" stratum keeps the quasi-random method, policy or
  buffer if it is one, otherwise method 1 + (round mod its count). Continuation, initial stop and retention stay
  quasi-random and are reported per class.
- **§4.7 statement.** Every feasible configuration funds the anchors' families **and** Growth·GDX by construction
  (feasibility and Q6), so the whole search is the protected multi-component stratum; there is no unconstrained
  alternative inside an arm (GDX OFF is the baseline). This is not an activity or equal-share rule: a partner may be
  token, and token participation is labelled.

## 7. Search, budget and stopping (`search.ts`, `budgets.ts`, `stages.ts`)

### 7.1 Lanes (every cutoff, every arm; the three arms' nine lanes run concurrently on one worker pool)

- **broad-rise, broad-breakout:** a Latin-supercube scrambled Sobol screen of the GDX genome (this study's namespace;
  entry pinned; strata round-robin) → plausibility (centre net > 0, DD ≤ $35,000, the anchors' families and Growth·GDX
  funded) → promotion (§7.3) → rung 1 → NSGA-II islands with the frozen extension rule → rung 2 → rung 3 → refinement →
  the lane shortlist. No incumbent GDX vector, control or archive seed enters these lanes (they are anchor-conditional,
  D1).
- **seeded:** the cutoff's informed GDX seeds (§7.2), each unchanged, plus `near` GDX-only designs at scale 1.5 and
  `broad` designs at scale 3 around it → rung 1 → islands (entry free) → rungs → refinement → shortlist.
- **Only Growth·GDX is ever mutated** (screens, islands, designs and refinement moves act on the GDX genome; every
  evaluated configuration is checked to carry its arm's exact anchors).
- **Order:** C19 search → qualify → seal and **commit** the fold selection → fold evaluation; then C21; then C23; the
  sequential policies; then C24 search → C24 qualification → transfers → diagnostics → frozen selection (committed) →
  validation. A fold evaluation never feeds a later search; no earlier cutoff ever runs after a later cutoff's selection
  exists (guard in code).

### 7.2 Informed seeds (provenance-restricted per cutoff; `CONTROL_MANIFEST.json` `seeds`)

- **C24:** Appendix A (browser) + the GDX books of Priority 3's mechanism controls and finalists (IP, XP, SP, I02–I16,
  G01–G12) + every GDX-enabled member of Priority 3B's sealed C24 selection + the archive audit's new exact-anchor GDX
  books (none: §2) — 59 distinct GDX books.
- **C19, C21, C23:** only GDX books whose own selection used data through that cutoff: the GDX-enabled members of
  Priority 3's and Priority 3B's sealed independent fold selections at that cutoff (44, 45, 43 distinct). Appendix A and
  every C24 source are excluded there.
- Prior archive selection and new discovery are counted separately (proposal origin: seed, design, screen, island,
  filler, refine).

### 7.3 Islands, promotions and refinement

- **NSGA-II islands:** binary crowded tournaments on (−centre net, −robust net, p90 DD) with constraint domination;
  categorical genes: uniform crossover (p 0.9), random reset with probability 1/(free categorical genes); ordinal genes:
  SBX (η 15, p 0.9) and polynomial mutation (η 20) on grid indices of the active inputs; (μ + λ) survivors; every child
  fitted at rung 1 (centre-first). Islands split the rung-1 archive by rank order (rank k → island k mod base); Latin
  fillers of the lane when short. **Stagnation:** 8 generations without a 1e-3 relative gain of the island's hypervolume
  of (−robust, p90) against (0, $35,000) or of the lane's best feasible centre net.
- **Screen promotion:** ¼ by centre net among the plausible, ¼ by constrained rank on (−net, DD), the rest max-min L∞
  diversity; one configuration per funded ledger, never the baseline's ledger.
- **Rung promotion** (rung 2 from rung 1, rung 3 from rung 2): ¼ centre net (feasible), ¼ robust net (feasible), the rest
  constrained rank; one per ledger; picks at L∞ ≥ 0.02 (rung 2) / 0.03 (rung 3).
- **Refinement** (16 draws, centre-first): ≤ 2 passes over the GDX moves (every active GDX input ±R/2 and ±R; every
  enabled optional GDX rule OFF). Robust start: the banded-best feasible move raising robust net by ≥ $2,000; profit
  start: the feasible move with the highest centre net raising it by ≥ $2,000; from an infeasible start, the move
  lowering the violation most by ≥ 0.01. Endpoints are refitted at rung 3.
- **Shortlist** (per lane; feasible only, one per ledger, never the baseline's ledger, picks at L∞ ≥ 0.10): profit,
  robust, balanced (robust ÷ p90), gate-alternative, then centre-net order; cap 4 per lane in R, 3 in O and G. The five
  most profitable infeasible centres stay visible.

### 7.4 Budgets (frozen; `budgets.ts`)

| Arm | Base new GDX centre proposals per cutoff (share) | Composition (base) | Cap with extensions | Rungs 2 / 3 | Shortlist |
|---|---:|---|---:|---|---:|
| **R** C4-refined | **16,384 (66.7%)** | seeded: seeds + 4 near + 4 broad designs each, 2 islands × 1,024; broad-rise and broad-breakout: screen (the remainder, halved) + 4 islands × 1,024 each; population 64 | 32,768 (seeded ≤ 6 islands, broad ≤ 10 each) | 24 × 64 / 8 × 128 per lane | 4 per lane |
| O C4 | 4,096 (16.7%) | seeded: seeds + 1 near + 1 broad each, 1 island × 512; broad: screen + 2 islands × 512 each; population 32 | 8,192 (seeded ≤ 3, broad ≤ 5 each) | 12 × 64 / 6 × 128 | 3 |
| G VGT #4 alone | 4,096 (16.7%) | as O | 8,192 | 12 × 64 / 6 × 128 | 3 |

- The exact per-cutoff composition (seeded designs, screens) is recorded in the freeze (`npm run c4gdx -- plan`); e.g.
  C24 R: 59 seeds → 531 seeded designs + 2,048 island proposals; screens 2,807 + 2,806; broad islands 8,192.
- The same schedule runs at C19, C21, C23 and C24 (standard §1.8: the same budget at each cutoff).
- **Evaluation caps (fresh evaluations; archive hits counted apart; a job exceeding its cap fails — an amendment matter):**
  search ≤ 1,000,000 per cutoff (the worst case at every extension cap with every rung-1 centre measured is ≈ 0.9 M);
  qualification ≤ 160,000 per cutoff; transfers ≤ 160,000; validation neighbourhoods ≤ 5,000; **total ≤ 5,000,000**
  including every neighbourhood, control check, fold evaluation and confirmation (each job's cap counts the fresh
  evaluations of one run of it). The bench measured ≈ 135 evaluations/s on D24 with 14 workers (earlier doors are
  faster); the expected total is ≈ 1.5–3 M evaluations (≈ 3–7 hours).
- **Counted separately** (lab tallies): screen centres; rung-1, rung-2, rung-3 and refinement centres and neighbours;
  qualification; transfers; folds; validation; retries; archive hits; worker compute time — per arm and per origin.

### 7.5 Extension policy and stopping (frozen; development progress only)

After the base islands of a lane, and after every extension island, one more island runs (up to the lane's cap) iff the
last island raised the lane's best feasible rung-1 **centre net by ≥ $2,000**, or its best feasible rung-1 **robust net
by ≥ $2,000**, or the union **hypervolume** of (−robust, p90) against (0, $35,000) by **more than 1%**. Progress per
island (hypervolume, best robust and best net trajectories; hypervolume gain per 10,000 evaluations) is recorded.
**Stopping conditions recorded:** per lane "triggers not met" or "extension cap reached"; per island "budget",
"stagnation", "no new configurations" or "generations". A cap reached with a trigger firing is **budget-bound, not
converged**. Nothing is re-searched after a fold, a qualification or the validation.

## 8. Robustness instrument (`space.ts` `rowsOf`, `qualify.ts`)

### 8.1 Perturbation

- **Radius:** D1 — Study 8's N1 radius in grid units (X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10, W ±20)
  per book; Growth — 10% of each box in value units rounded to the fine step, per book.
- **Draws:** one Latin hypercube of n rows over the 116 numeric columns (Priority 3's layout) per seed family, common
  random numbers across every centre and **every arm** of a cutoff; a row moves every active numeric input of the
  scope's **enabled** books by u × scale × radius, rounded to the grid, clipped to the box widened to include the centre
  (clipping counted).
- **Scopes:** `joint` (**whole portfolio**: every enabled book, the anchors included); `gdx` (**GDX-only**: Growth·GDX's
  active inputs, the anchors at their frozen values); `anchors` (the enabled anchor books only, Growth·GDX at its centre;
  report). A baseline's joint rows move its anchors exactly as a partner's joint rows do, row by row (E8); its GDX-only
  rows are the centre itself.
- **Categorical inputs** stay fixed (toggles are report-only); inactive inputs untouched; orders repaired. Duplicates of
  the centre or of earlier rows are dropped from the statistics but kept, by row index, for the paired differences.
- **Dimensions** (active inputs per scope), clipping, distinct ledgers and draws equal to the centre are reported per
  member.

### 8.2 Families and seeds (`deriveSeed('c4-gdx-growth-partner', 'nbhd', …labels)`)

| Family | Labels | n | Scopes / scale | Use |
|---|---|---:|---|---|
| rung 1 / refinement | `('r1', cutoff)`, `('refine', cutoff)` | 16 | joint / 1 | search (centre-first) |
| rung 2, rung 3 | `('r2', cutoff)`, `('r3', cutoff)` | 64, 128 | joint / 1 | search |
| selection | `('select', rep, cutoff)`, rep 1–2 | 2 × 128 | joint and gdx / 1 | **ranking and roles** (joint) |
| confirmation (fresh) | `('confirm', rep, cutoff)`, rep 1–3 | 3 × 128 = 384 | joint and gdx / 1 | **qualification only** |
| anchors | `('confirm', 1, cutoff)` | 128 | anchors / 1 | report (decomposition) |
| small, wide | `('small', cutoff)`, `('wide', cutoff)` | 128 each | joint / 0.5, 1.5 | report (radius sensitivity) |
| 3B instrument | 3B's `('confirm', rep, 'C24')` in 3B's namespace | 384 | 3B joint | report (C24; D1 arms and E) |

No label of this namespace was used before. The confirmation draws are never used for ranking, promotion or any search
decision, and are never resampled: a member's verdict is computed once.

### 8.3 Fidelity and statistics

Rung 1 = 16 draws (centre-first), rung 2 = 64, rung 3 = 128, refinement = 16; selection 2 × 128; confirmation 3 × 128
(pooled, de-duplicated; the actual count reported). Median, p10, p90 of net; robust net = ½ median + ½ p10; median and
p90 DD (linear interpolation); breach count and share (DD > $35,000); report-only tail severity (standard §5.8): p95 DD,
worst-10% mean DD (⌈0.1 n⌉ largest), the breach share's Wilson 95% interval, the mean excess among breaches, the worst
DD, the distinct ledgers behind the breaches, the p90's 95% order-statistic interval, and the half- and 1.5×-radius
families. Breach frequencies are perturbation frequencies on one history, not probabilities of future losses.

### 8.4 Paired increments (report-only)

For each member against its arm's baseline: on the 384 identical whole-portfolio confirmation rows, the median, p10,
p90 and mean of Δnet, the share of rows with a higher net, the median and p90 of ΔDD, the share of rows with a higher DD
and the breach overlap (both / member only / baseline only); and on the member's 384 GDX-only rows against the
baseline centre, the same. These are never gates.

## 9. Qualification, roles, the primary, the baseline rule and transfers (`qualify.ts`, `stages.ts`, `transfers.ts`)

### 9.1 Evidence (every member, the cutoff's training door only)

The centre; selection and fresh confirmation in both scopes; the anchors scope; small and wide; at C24 the 3B instrument;
**stresses** (10 and 20 bps per side, 14% interest, +25 bps stop slippage, next-open stop fills — Growth books with the
initial stop or retention keep stop-level fills, recorded); **toggles** (every enabled optional GDX rule OFF; report);
**causal removals** (without D1; without Growth; without GDX; without VGT; without each enabled component — removing
Growth·GDX from a partner gives exactly its baseline).

### 9.2 Gates (all must hold; thresholds fixed before any candidate result)

| Gate | Requirement |
|---|---|
| Q1 | centre net > 0 |
| Q2 | centre maximum minute DD ≤ $35,000 |
| Q3 | whole-portfolio fresh confirmation p90 DD ≤ $35,000 (the interpolated 0.9 quantile of the 384 draws) |
| Q4 | whole-portfolio fresh confirmation p10 net > 0 |
| Q5 | at 10 bps per side: centre net > 0 and centre DD ≤ $35,000 |
| Q6 | participation: every family of the member's books receives capital at the centre, and a GDX-enabled member's Growth·GDX receives capital (standard §2.7) |
| Q7 | GDX-enabled members: GDX-only fresh confirmation p90 DD ≤ $35,000 and p10 net > 0 |

No activity floor, annual-profit floor, largest-winner cap, equal-component rule or breach-rate veto. Rare but severe
tails stay prominent in the report and are never gates. Gates are never relaxed after results. **Near misses** (members
failing only Q3, Q4, Q5 or Q7) are tabled with their exact failed gates and severity.

### 9.3 Roles and the primaries (ranked on the whole-portfolio selection families)

Among the qualified members of an arm's selectable set (baseline, Appendix A control, searched partners):
- **actual-profit** = the highest centre net; ties by the higher selection robust net, the lower centre DD, then the
  label (Priority 3's `profitOrder`);
- **robust-profit** = the highest selection robust net;
- **balanced** = the highest selection robust net ÷ selection p90 DD;
- **lower-drawdown** = the lowest selection p90 DD among those with selection robust net ≥ 50% of the actual-profit
  holder's.

**Each arm's primary** = its actual-profit role. **Fallback:** if no member qualifies, no primary ("no qualified
result"); if the baseline is the actual-profit holder, the primary is the baseline (GDX OFF). A report-only set of the
GDX-enabled members alone is ranked beside it.

### 9.4 The baseline comparison and the prudent recommendation (per arm; development; fresh whole-portfolio confirmation)

- **Labels** (every member against its arm's baseline): **dominates** — centre net ≥, centre DD ≤, confirmation p10 ≥ and
  confirmation p90 DD ≤ the baseline's, one strictly; **higher-profit trade-off** — centre net > the baseline's without
  dominating; **stronger local stability** — confirmation p10 > and confirmation p90 DD < the baseline's. Report-only
  beside them: the paired increments (§8.4) and whether the two p90 95% order-statistic intervals overlap ("within
  finite-draw uncertainty"). No global tolerance is introduced; a small p90 difference inside that uncertainty is
  described as such.
- **Partner candidate** (frozen in `FROZEN_SELECTION.json`): the qualified GDX-enabled selectable member with the highest
  centre net among those that dominate the baseline; none if none dominates.
- **Economic class** (frozen, development): *stable addition* if a partner candidate exists; otherwise *risk/profit
  trade-off* if a qualified partner is a higher-profit trade-off or locally more stable; otherwise *no improvement*.
  The gate verdict and the economic assessment are reported separately.
- **Prudent recommendation (frozen):** add GDX Growth to an arm's baseline only if the partner candidate exists **and**
  passes V1–V3 **and** is supported across later periods (V1–V3 pass and validation P&L ≥ the baseline's validation
  P&L); otherwise **GDX Growth OFF remains preferable** (the no-improvement fallback). No second candidate is promoted if
  the first fails; validation never chooses a different member. A lower validation profit is not a failed validation;
  qualification is kept distinct from outperforming the baseline.
- Neither baseline's favoured status is proof of superiority, and 3B's sealed verdicts (C4-refined qualified and passed
  validation; the independent procedure's $60,874.87 sequential DD belonged to other configurations) are preserved.

### 9.5 Cross-transfers (C24; report-only)

The transfer set is a deterministic function of the sealed C24 selection: per source arm, the GDX books of its
GDX-enabled role holders, its partner candidate and its highest-net qualified GDX-enabled member (distinct GDX books).
Each is placed **unchanged** beside each other arm's anchors (a book already a member there — Appendix A — is not
repeated) and evaluated with the full instrument of §9.1 (complete pooled reruns, no tuning). Each transfer is labelled
against the target arm's baseline (§9.4) and is never selectable there. The transfers are sealed before the diagnostics
and included in the validation (report-only).

## 10. Fixed-anchor repeats at earlier cutoffs (descriptive; departure D1)

| Cutoff | Training door (search, qualification, selection) | Committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 (2016–2019) | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 (2016–2021) | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 (2016–2023) | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 (2016–2024) | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- **The same complete search and selection** (§7, §9) at each cutoff, with that cutoff's provenance-restricted seeds
  (§7.2); 3B's instrument and the transfers run at C24 only.
- **Frozen members of a fold:** per arm its baseline, its role holders and its Appendix A control; one continuous run
  per member on the evaluation door (nothing reset at the boundary).
- **Sequential policies (per arm):** the fold primaries trade their slices in turn; the baseline in every slice; each
  role; the Appendix A control. A switch between different configurations at a boundary is charged 5 bps on $100,000
  per open lot it closes or adopts. Reported: net, charges and the strict minute DD of the concatenated slice marks.
- **Verdicts (frozen, both descriptive):** the standard rule (every fold produced a primary, sequential net > 0,
  sequential DD ≤ $35,000) and the incremental reading (the fold primaries' sequential net against the baseline's over
  the same slices, with the DD). Neither is chronological evidence of an independent procedure; both are reported even
  if unfavourable.

## 11. Diagnostics, the frozen selection and the one-time validation

### 11.1 Diagnostics (development D24; report-only; sealed before the frozen selection)

For each arm's baseline, role holders, partner candidate, best qualified partner and Appendix A control, and E and D:
funded-lot, funding and refusal ledgers (the occupant of every refusal); holding periods; drawdown episodes; the
Growth·GDX participation funnel by stage (signals, filter and gate blocks, eligibility, refusals by occupant, virtual-state
waiting; standard §2.9). For every GDX-enabled subject, **the increment over its baseline through complete reruns**:
matched lots (newly admitted, displaced, retimed exits; reconciled to the cent); Δ booked by book; Δ interest and costs;
Δ final open marks; the anchor decisions refused while Growth·GDX held the slot (occupant, the refused virtual trade's own
net — descriptive, never an achievable sum — and the idle closes during its unfunded hold); the increment by year and by
development subperiod (2016–2019, 2020–2021, 2022–2023, 2024); the largest pool-level winning episode and the causal
blackout rerun of the subject and the baseline over it. More exposure or more trades alone is not success.

### 11.2 The frozen selection (sealed and committed before FULL opens)

Per arm the primary, every set's roles and rank orders and Pareto sets, the baseline labels, the partner candidate, the
economic class, the near misses; the transfer set and its development results; the descriptive fold verdicts; every
frozen member's complete effective configuration (all genes, inactive flags, the enabled mask and allocator settings);
the code and data pins; the recommendation rules and the validation plan.

### 11.3 Validation (FULL, once, under the guard)

Every frozen member (each arm's baseline, role holders, partner candidate, best qualified partner and Appendix A
control; E; D), every transfer, and VG #2 native: one continuous run 2016-01-04 → 2026-10-30. Reported: validation P&L
with its realized/unrealized parts, the reset validation DD, the whole-run DD and dates, 2025 and 2026, lots and GDX lots
after the boundary, open remainders, refusals. **V1** validation P&L > 0; **V2** reset validation DD ≤ $35,000; **V3**
whole-run DD ≤ $35,000. **Report-only:** 10 / 20 bps and 14% interest on FULL, and the fresh whole-portfolio
confirmation rep 1 (128 draws) on FULL paired with the baseline on identical rows, for each arm's primary, partner
candidate, best qualified partner, Appendix A control and baseline. **Known targets compared here only:** C4 (development
$302,785.91 / $17,332.09; validation $99,081.34 / $21,536.85; full $401,867.24 / $21,536.85), C4-refined ($360,569.71 /
$17,280.74; $91,512.65 / $19,477.66; $452,082.36 / $19,477.66) and VG #2 native ($334,911.93 / $21,303.61). A failed
validation is a result: no new winner, no rescue search, no retuning, no swap of the primary.

## 12. Engineering gates (sealed `results/parity/parity.json` before the freeze; a failure stops every dependent stage)

| Gate | Requirement |
|---|---|
| E1 | Priority 3's evaluation files hash to its sealed parity digest. |
| E2 | Through this study's configuration path, field for field: C4-refined = 3B's sealed development centre; C4, A, VGT #4 alone, GP4, E, D = 5A's sealed L0 centres; the known development targets of C4 and C4-refined to the cent; VG #2 native = Study 8 F24 ($260,223.13 / $17,280.74 / 36 lots / 14 refusals). |
| E3 | 3B's fresh confirmation instrument reproduces 3B's sealed statistics of C4 (p10 $204,977.07, p90 DD $24,519.07) and C4-refined (p10 $222,241.29, p90 DD $24,708.71) exactly. |
| E4 | Priority 3's independent reference on 48 random configurations (16 per arm): the funded set exactly, money and drawdowns within $1e-6; Σ lots = net; never two lots; principal ≤ $100,000; a disabled book never funded; funded lots copy their virtual fills. |
| E5 | Single-family identities: VG #2's D1 pair (both armings) = Study 8's `runNAllocator`; VGT #4, C4-refined's VGT book and 12 random GDX books = `runRiseTrading`. |
| E6 | Prefix causality: 18 random configurations (6 per arm) on D19, D21 and D23 equal their D24 runs through the shorter door (funding decisions, lots, daily marks). |
| E7 | GDX OFF identity: a partner with Growth·GDX disabled equals its baseline field for field (bar the id); inactive GDX genes never change the identity; an unfunded GDX book leaves the baseline's ledger. |
| E8 | Paired draws: identical anchor moves row by row between a partner and its baseline; GDX-only rows keep the anchors; the GDX move is the same in both scopes; the anchors really move. |

Synthetic and unit tests: Priority 3's pool tests (cross-symbol calendars, merged order, decisions before trades,
reservations, same-instant ordering, the persistent unfunded virtual trade, the one slot, partial exits holding the
slot, gap exits, disabled components, year boundaries, period drawdowns, open remainders) rerun unchanged; this study's
tests (`tests/space.test.ts`) of anchors and identities, GDX canonicalization, seed provenance and representability,
budgets, strata, the genome, GDX-only moves, paired draws, removals, paired increments and the baseline labels.

## 13. Resources and recoverability

- **Containment:** every heavy stage is a transient systemd user unit inside `c4gdx.slice` with **MemoryHigh=44G,
  MemoryMax=48G, MemorySwapMax=0** (re-applied before every launch; the unit carries the same limits, `KillMode=mixed`,
  `Restart=no`); heavy units run one at a time; Claude and tmux outside. No other study's heavy work runs (checked:
  every other slice had 0 tasks on 2026-11-10; the separate short-term dip-recovery project is finished by the user's
  report and is not restarted).
- **Execution settings (from the bench, `results/pilot/PILOT.md`):** 14 child-process workers (`--expose-gc`, 1.5 GiB old
  space), one door each, started four at a time; a full GC every 64 evaluations or above 256 MiB of ArrayBuffers; ≤ 2
  tasks in flight per worker; queue chunks ≤ 4,096; per-worker book caches of 1,024 entries per book (the anchor books of
  the common-random-number rows repeat across centres); a per-job SQLite archive (WAL; LRU ≤ 100,000) bound to the
  study, job, door pin and evaluation-code digest; a 10-second memory monitor; **dispatch stops at 36 GiB of job cgroup
  memory** (in-flight work finishes, the archive commits, exit 75).
- **Recoverability:** every evaluation is archived as it returns; a progress checkpoint (stage, per-lane island,
  generation, RNG state, counters) at every generation boundary and at least once a minute; a rerun of the same command
  replays deterministically from the archive (a kept lane result must equal its replay). A worker death fails the job
  promptly (its in-flight tasks dropped; no hang); no automatic restart; no OOM restart loop.
- **The pilot** (pilot budgets, `pilot-` job names, the pseudo-fold P18 on D19, outputs in the cache): the bench; a
  straight run; a graceful stop then resume; a worker SIGKILL then resume; a unit SIGKILL then resume — identical lane
  results; every stage path on pilot budgets.

## 14. Integrity

The freeze records this file's, the amendments', the brief's, the adoption, the control manifest's and the archive
audit's sha256, the sealed engineering gates, the evaluation digest and Priority 3's, the code closure and its digest,
the door pins, the canonical data, git `HEAD`, the per-cutoff proposal plans, the evaluation caps and the resource
contract. Stages refuse to run unless the preflight passes, the freeze is sealed and committed, the engineering gates are
sealed with 0 failures, the audit is sealed and the evaluation code is the frozen one. Records are sealed write-once
(0444; `results/seals.jsonl`; `npm run c4gdx -- verify`). Fold selections are committed before their slices;
`FROZEN_SELECTION.json` before FULL. The checkpoint is `RESEARCH_RECOVERY.md`. All stage code (diagnostics, transfers,
frozen selection, validation) is implemented and piloted before the freeze; report tables are produced by
`tools/c4-gdx-growth-partner/tables.ts` (outside the pinned code closure).

## 15. Reporting commitments

- **Format** (standard 2.0.0 §7.7): written analysis, Markdown tables and machine-readable results (JSON, JSONL, CSV)
  only; no charts, plots, SVGs, screenshots, images, dashboards, HTML reports or PDFs; dollars with commas and two
  decimals.
- **Order:** the C4-refined experiment (R) first, then original C4 (O) as the matched comparison, then the Growth-only
  companion (G) and the transfers. This reporting priority does not assert that the user replaced the incumbent.
- **Tables:** development, validation and full-history marked net with realized/open parts; maximum minute DD in dollars
  and % of the fixed $100,000 with dates; exposure and principal-days; funded lots (partial exits counted apart, never
  as independent episodes); wins/losses; independent episodes; interest and costs; GDX lots and booked P&L; paired
  increments over each baseline in both scopes; breaches and tail severity; stresses; causal removals; displacement and
  refused anchor opportunities; subperiod and episode concentration; complete effective settings.
- **Search:** coverage by class, origin and lane; proposals and evaluations by kind per arm (actual per-arm effort, with
  the unequal allocation disclosed); distinct configurations, distinct ledgers and baseline-equivalent proposals;
  extensions and stopping reasons; archive-audit results counted apart.
- **Answers** to the brief's questions; the consideration fields; protocol changes and integrity incidents;
  limitations (previously examined history; anchor provenance; one history; historical compliance is not a guarantee).
