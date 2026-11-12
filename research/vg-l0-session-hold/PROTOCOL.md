# Protocol — New L0 trading-session re-optimization: the VGT + GDX D1 + Growth portfolio of New L0 re-optimized with reference method NL0 under trading-session maximum holds

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
search, qualification, selection, fold or validation result of this study exists). Afterwards it is never edited;
changes go to `AMENDMENTS.md` (append-only).

**Written before any search result of this study existed.** Known before it: every record of Priorities 3–7A (in
particular 5B's sealed search, selection, fold, cross-test, diagnostic and validation records, which produced New L0);
this study's Phase 1–3 records (`recovery/original-recovery.json`: New L0's development centre and 5B's confirmation
statistics reproduced; `recovery/backward-compat.json`: 1,500 archived 5B records reproduced at the default unit, and
125 configurations whose session-unit records differ — counts only, no session-unit result was ranked, compared or
reported); the engineering evidence of stage V dry runs, the bench and the pilot (mechanics and counts).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.1.0`, sha256 `ac5c2c69987faa8d2b0dba7dfd452e278658167fa172ab210a8a2e8de7696f9b` (the registered current version; registry checked) |
| Read / adopted (UTC, from `date -u`) | 2.0.0 read in full 2026-11-12T02:20Z; 2.1.0 (this study's own minor revision, Phase 2) read in full 2026-11-12T02:55Z / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/vg-l0-session-hold/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-l0-session-hold`; every stage, the pilot included, calls `requireStandardAdoption` in code) |
| Scope | `optimization` |
| Reference method (standard §4.8) | `docs/research/methods/NEW_L0_METHOD.md`, id `NL0`, version `1.0.0`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` (also `referenceMethod` in the adoption manifest; checked by the preflight and recorded in the freeze) |
| Brief | `research/vg-l0-session-hold/brief/BRIEF.md`, sha256 `df4856db43331f9054916ac479cebfa7f187c9181c5aa663b0ec2179287c2bd2` (462 lines, read in full through its final section "Final Priority") |
| Branch / base commit | `research/vg-l0-session-hold` in the main checkout, from `a1a9675d` (end of Priority 7A); code `src/vg-l0-session-hold/`; `npm run vg-l0sh -- <command>` from the repository root |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5, §3.2 | adaptation | NL0's primary rule: **actual profit** — the highest development centre net among the qualified members of the **final selectable set**: the independent and informed shortlists and the controls **New L0, C4, C4-refined and C85 under the session unit** (the qualifying-incumbent fallback; New L0 under the session unit is the brief's configuration B). The independent primary and the other roles are kept (§9). | — (NL0 §3.5; brief Phase 6 "Apply the original New L0 candidate-selection methodology") |
| AD2 | §4.1, §3.4 | adaptation | One allocation architecture (A: one exclusive funded slot) and the fixed same-instant order D1 first, then GDX before VGT; lifecycle L0 only; no allocation, priority or lifecycle search. | — (brief Phase 4.1 "the same shared-capital allocator … allocation priorities and conflict rules") |
| AD3 | §4.1, §4.8 | adaptation | **Fixed structure V** (D1·GDX + D1·VGT + Growth·VGT; Growth·GDX OFF): 5B's structure cells V, G and B (a strategy-combination choice) are **omitted**; their budgets are reassigned through their own schedules to three V sub-cells per replicate (V1 = 5B's V schedule, V2 = G's, V3 = B's). The inclusion gene is pinned to V in every lane, the informed lane included (5B let its informed lane move B ↔ V/G). | — (brief Phase 4.1 "Use only the VGT/GDX D1/Growth combination that produced New L0 … do not reopen …"; Phase 4.2 "Document their omission and how their budget is reassigned") |
| AD4 | §4.7 | adaptation | 5B's protected both-Growth exploration cannot apply to V: its ⅛ promotion shares and shortlist slot fall through to the next rules (as 5B's code does for an empty list), its every-fourth island is an ordinary island, and its refinement start in V3 and the informed lane is reassigned to a second profit start (`profit-2`, the next feasible rung-3 configuration by centre net at L∞ ≥ 0.05 from the earlier starts) so that those lanes keep 5B's three starts. Multi-component participation is reported (§2.9). | — |
| AD5 | §4.2, §4.8 | adaptation | **Effort scaled by replicates:** 6 search seeds (R1–R6) instead of 5B's 2 per arm (= 5B's 3 arms × 2), each lane with 5B's unchanged per-lane schedule, so the stage allocation is preserved by construction and the base equals 5B's whole-study base schedule; jobs keep 5B's lane counts (18 independent, 6 informed) and 5B's per-job caps. | — (brief Phase 4.3 "equal or greater … preserve the original balance") |
| AD6 | §4.5 | adaptation | Extension: a lane is its own position (5B synchronized a position across its three lifecycle arms, a matching device with no counterpart here); 5B's triggers (5%), caps (6 / 6 / 12 / 8 islands) and resource guard (8,000 per independent lane, 30,000 per informed lane, the job cap) unchanged. | — |
| AD7 | §3.3, §1.9 | adaptation | Informed seeds (§4.2): 5B's V seeds unchanged (C4, C4-refined, C85, IJ1), its B seeds projected to V by 5B's own informed inclusion move (IJ3 → V, IP → V; A → V is C4, a duplicate), its G seeds (E, GB1) omitted (no VGT Growth book); **New L0 added as a third focus seed** (5B's focus seeds were its incumbents C4 and C4-refined, kept). Provenance: informed. | — (brief: re-optimize New L0's combination) |
| AD8 | §3.5 | adaptation | The convention under test (standard 2.1.0 §3.5): the maximum-hold unit. Configurations A (New L0, calendar days), B (New L0, sessions) and C (this study's primary, sessions); the decomposition and cross rows; calendar days stay the engine default (verified, §12 G2). | — (brief Phases 3, 5) |
| AD9 | §1.8, §3.3 | **departure** | As in NL0 (5B AD9): the earlier-cutoff repetition covers the **independent** lanes only; the informed lane (seeded with candidates chosen with later data, New L0 among them) runs at C24 only and has no chronological test; no chronological claim is made for it. | Brief Phase 4.2 "Preserve its … validation safeguards … Reuse the methodology recovered and documented in Phases 1–2" (NL0 §3.6 records 5B's departure AD9, agreed in 5B's brief: "Incumbent-informed discovery/refinement at C24 … do not mix these results into an independent chronological claim") |
| AD10 | §5.3 | adaptation | NL0's qualification evidence per member: centre, selection 2 × 128, fresh confirmation 3 × 128, the frozen stresses and the causal removals; small and wide families for the export rows only (§11.2). | — |
| AD11 | §1.4 | adaptation (stricter) | As NL0: FULL is never opened before `FROZEN_SELECTION.json` is sealed and committed — not even for known full-history targets of New L0 (Phase 1 reproduced its development figures only); no futility stop. | — |
| AD12 | §5.1, §6.3 | adaptation | The engine change (Phase 3) touched Priority 3's evaluation files and the shared exit engines: its sealed evaluation digest (`147cad7c…`) no longer matches by design. Stage V G2 replaces that equality: 5B's archived records reproduce at the default unit (bound to the current digest); the freeze records both digests. | — (brief Phase 3 "The original calendar-day behavior must remain available and continue producing the same results") |

Standard §7.7 applies unchanged: written analysis, Markdown tables and machine-readable results only.

## 1. Question, objective and outcomes

- **Question.** If New L0's VGT + GDX D1 + Growth portfolio (D1·GDX + D1·VGT + Growth·VGT, one shared $100,000 slot,
  lifecycle L0) measures every maximum hold in **NYSE trading sessions** instead of calendar days, and is re-optimized
  with the recovered New L0 method (NL0 1.0.0) with at least its effort, is the result a better shared-capital
  strategy? How much of any difference is the convention itself (B − A) and how much the re-optimization (C − B)?
- **Objective.** Actual net profit (realized + marked unrealized, after costs and interest) with credible local
  stability and costs, within a maximum minute drawdown of **$35,000 on the fixed $100,000 principal** (35% of that
  fixed budget, not of peak equity). Historical compliance does not guarantee future drawdown.
- **Primary rule:** actual profit (AD1, §9.3). **Roles:** actual-profit, robust-profit, balanced, lower-drawdown, ranked
  on the selection families; the fresh confirmation family decides qualification only.
- **Pareto set (reported per set):** centre net ↑, centre DD ↓, selection p10 net ↑, selection p90 DD ↓.
- **Configurations (brief Phase 5):** **A** New L0 frozen, calendar days; **B** New L0 frozen, trading sessions; **C**
  the frozen primary under trading sessions.
- **Valid outcomes:** C = an unchanged control (B or another incumbent: "re-optimization found nothing better"); "no
  qualified combined result"; failed qualification of controls; a failed validation; an unsupported independent
  procedure; and the frozen comparison labels (§11.1): repeatable improvement, conditional profit/risk trade-off, no
  material difference, harmful, inconclusive. A negative or inconclusive result is a valid completion. **New L0 stays the
  frozen benchmark whatever the outcome; nothing replaces it automatically.**

## 2. Prior knowledge and provenance

- **Already examined:** all of 2016-01-04 → 2026-10-30, by Priorities 3–7A, Study 8, the growth140 studies, Priority 2,
  Strategy Lab (Priority 6) and the user's browser. Known outcomes include New L0's development $382,721.46 /
  $19,459.83, validation +$96,883.72 (reset DD $20,385.99) and full $479,605.18; C4's validation +$99,081.34; 5B's L0
  independent procedure unsupported (−$29,358.01, DD $67,214.22).
- **Therefore 2025-01-02 → 2026-10-30 is validation on previously examined history, not an untouched holdout.** The
  design, the controls and the informed seeds were chosen with it in view. Fresh seeds are not fresh market history.
  The session unit was never evaluated on 2025–2026 before this study's validation.
- **Provenance of the controls and seeds:** New L0 (5B C24 informed L0 R1, 2016–2024; its lineage — 3B's
  informed-joint lane — had 2016–2024 in view, and 3B's seeds C4 (browser Growth #4, 2016–2026 in view)); C4-refined and
  IJ1 (3B C24 informed lanes, 2016–2024); C85 (growth140-vgt-stable); IJ3 and IP (3B, Priority 3). None enters an
  independent lane or an earlier cutoff.
- **The user's decisions kept:** New L0 is preserved as a frozen benchmark (brief Phase 7); C4 and C4-refined stay
  distinct baselines; L0 is the working funding model; the 3C GDX partner stays declined.

## 3. Data, doors and windows

- **Canonical files** (git-ignored, pinned): `data/VGT/data.csv` sha256 `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b2…5049`, 2,723 sessions 2016-01-04 → 2026-10-30 on one calendar (Priority 3's pins; re-verified by the door
  stage).
- **Common complete endpoint: 2026-10-30.** November–December 2026 do not exist and are never implied.
- **Doors:** Priority 3's physical byte-prefix doors D19 (→ 2019-12-31), D21, D23 (→ 2023-12-29), D24 (→ 2024-12-31),
  each verified by size, sha256 and last row before parsing; FULL only behind this study's sealed and committed
  `FROZEN_SELECTION.json` (and Priority 3's own frozen-selection guard). Every opening is logged in `results/doors.jsonl`.
- **Windows:** development 2016-01-04 → 2024-12-31 (all search, refinement, ranking and choices); validation
  2025-01-02 → 2026-10-30; earlier cutoffs C19, C21, C23 (§10).
- **The session calendar:** NYSE sessions of `src/lib/calendar.ts` (holidays incl. the 2018-12-05 and 2025-01-09 days of
  mourning; coverage 2016-01-01 → 2026-12-31). The canonical files hold every NYSE session of 2016-01-04 → 2026-10-30
  (stage V checks that each data session is an NYSE session; a missing genuine session would still be counted).
- **Continuity:** every run is one continuous causal run from 2016-01-04; validation P&L = the marked net at 2026-10-30 −
  the marked net at the 2024-12-31 close; the reset validation DD and the whole-run DD are both reported.

## 4. Controls, seeds and configurations

### 4.1 Exact controls (`CONTROL_MANIFEST.json`, sealed before the freeze)

| Key | Composition | Selectable (C24, session unit) | Identity |
|---|---|---|---|
| **NL0** | New L0 primary (5B `FROZEN_SELECTION.json` `crossTestSubjects[R01]`, pinned sha256 `cd223a0d…5793`): D1·VGT [237,9,73,15,72,42,103,41] + D1·GDX [277,1,61,13,232,25,152,10] + VGT Growth `6b5f909b30cfa516`; GDX Growth OFF | **yes** (= B); under 'cal' it is **A**, never selectable | cfg `67cfdd9b62d1e16f`, P3 `a2e385640ca61012` |
| C4 | VG #2 + VGT Growth #4 | yes | P3 `f324035d15f69610` |
| C4R | C4-refined (3B `C24/informed-fixed#1 profit`) | yes | P3 `07443ffaeef41e85` |
| C85 | VG #2 + VGT Growth `08500a60ec56cfae` | yes | P3 `3688e97b90639d60` |
| IJ1 | 3B `informed-joint#1 profit` (New L0's lineage seed) | no (report-only row; it may enter through a shortlist) | cfg `940fdaf770eedc9d` |
| D | VG #2 Balanced D1 only | no (D1-only comparator) | P3 `7a377d49c2b9aa55` |

All are evaluated under both units with the same instrument; the 'cal' rows are never selectable. Read through 5B's
verified loader (5A's subjects over Priority 3's pinned records, 3B's pinned frozen selection); identities checked in
code.

### 4.2 The informed seeds (`controls.ts informedSeeds`; AD7)

C4 (focus), C4-refined (focus), C85, IJ1, IJ3 → V, IP → V, **New L0 (focus)**: seven V configurations, each entering
unchanged with its own D1 vectors. Omitted 5B seeds: A (→ V is C4), E and GB1 (no VGT Growth). Every vector may adapt
under the same bounds. Provenance: informed.

### 4.3 The comparison

- One searched arm: the **session unit** ('ses'). Lanes: independent discovery (C19, C21, C23, C24) and informed
  discovery/refinement (C24 only).
- **Unit cross-test** (§11.2): every exported phenotype and control under both units (report-only), which yields A, B,
  C, C under calendar days, and the decomposition.

## 5. Engine, conventions and the hold unit

### 5.1 Fixed (NL0 §1.1)

Priority 3's pooled engine (`src/vg-d1-growth-joint/pool.ts`, `books.ts`, `evaluate.ts`, `data.ts`), lifecycle L0: one
exclusive funded $100,000 slot; a decision is funded only at its own instant iff nothing is open or reserved; a grant
reserves the slot until its fill; a retained Growth remainder keeps the slot until its final exit; no compounding,
preemption, forced replacement or simultaneous funded positions; same-instant decisions D1 first, then GDX before VGT.
5 bps per executed side, $0 commission, 11% simple annual interest on outstanding principal by **calendar** day (365-day
year; unchanged by the hold unit), stops at the stop or the gapped open, fractional shares, harmonized D1 arming from
2016-01-04. D1's canonical shadow lifecycle and Growth's L0 virtual book are unchanged. **No change to entry rules,
trailing stops, continuation rules, allocation logic or costs** (brief Phase 3).

### 5.2 The hold unit (Phase 3; `src/lib/tradingSessions.ts`, `strategy.ts holdAge`)

- **Definition.** A position's hold age at session s is the number of NYSE trading sessions strictly after its **hold
  session** (the entry fill's session) up to and including s. The entry session is age 0; the next trading session is age
  1; weekends and exchange holidays never count; a genuine session missing from a data file still counts.
- **Unchanged conditions.** The maximum hold "applies from" the first session whose age reaches `maximumHoldDays`: (1)
  the maximum-hold loss exit — if the position is losing at that session's open, it sells at the first trade after the
  opening minute; (2) the buffered intraday loss (where enabled) applies from that age on. Under the calendar unit the
  age is the calendar days between the session dates (unchanged).
- **Where.** Every enabled book: D1·GDX and D1·VGT (`maximumHoldDays`) and Growth·VGT (`maximumHoldDays` with the hold ON;
  Growth's ExitManager path and its optional-rules evaluator). Growth's other windows (eligibility age, continuation
  window, recovery confirmation) were already in sessions and are unchanged.
- **Option.** `EvalOptions.holdUnit = 'sessions'` (unit.ts `'ses'`); absent = calendar days, byte-identical keys and
  records (§12 G2). The archive key carries the unit.
- **Boxes.** The numeric boxes and grids of both hold genes are unchanged (3–30, step 1; D1 radius ±2): under 'ses' they
  are sessions. (A 15-session hold spans ≈ 21 calendar days.)

## 6. Space (`config.ts`; NL0's, identities unchanged)

- **Configuration:** structure V with VG #2's architecture — D1·GDX and D1·VGT always enabled, Growth·VGT enabled,
  Growth·GDX the placeholder (never run or funded) — and every enabled book's vector: D1 8 genes per book on Study 8's
  common box (X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200);
  Growth 1.4.0 structural and conditional numeric genes on growth140's boxes (entry Rise | breakout; trend filter off | 5
  methods; eligibility off | 5 policies (Rise only); recovery gate off | on; exits hold OFF | hold ON buffer OFF | ON;
  initial stop; retention; continuation off | 4 methods). Coarse grid for the independent screens and islands, fine
  grid for the informed lane, refinement and every neighbourhood. Every control and seed is exactly representable on the
  fine grid (checked in code).
- **Identity:** NL0's (5B's): cfgId = sha256(16) of the inclusion and Priority 3's canonical quad; inactive genes never
  create a second configuration; duplicates are never evaluated twice in a job; behavioural equivalence = the funded-lot
  ledger signature.
- **Sub-cells (AD3):** V1, V2, V3 (5B's V, G, B schedules). **Screen strata:** Growth·VGT's six options (Rise × gate ×
  eligibility, breakout × gate), round-robin; the rest quasi-random, reported per class.
- **Rise/breakout protection:** ⅛ of the screen promotion and of every rung promotion per entry pattern; the shortlist's
  entry-alternative slot (NL0).

## 7. Search, budget and stopping (`search.ts`, `stages.ts`, `budgets.ts`)

### 7.1 Lanes (NL0 §3.3–§3.4)

- **Independent (C19, C21, C23, C24; identical schedule):** 6 replicates × 3 sub-cells. Sobol Latin-supercube screen
  (this study's seed namespace `vg-l0-session-hold`; structure pinned; strata round-robin) → plausibility (centre net
  > 0, DD ≤ $35,000, both families funded) → screen promotion → rung 1 (16 draws, centre-first) → NSGA-II islands
  (population 32) → extension (§7.5) → rung 2 (64) → rung 3 (128) → refinement (robust and profit; in V3 also profit-2;
  one pass; 16 draws) → the sub-cell shortlist. No incumbent, control, archive or later-selected vector or range enters.
- **Informed (C24):** 6 replicates. The seven seeds unchanged, their near (scale 1.5, 12 each) and broad (scale 3, 12
  each) designs, the focus seeds' focused designs (64 at scale 0.5 and 64 at 1.0 each) → rung 1 → 4 islands × 384 with
  every free gene free except the inclusion (V) → rungs → refinement (robust, profit, profit-2 with one pass each; profit
  and robust starts at each focus seed — C4, C4-refined, New L0 — with ≤ 2 passes) → the shortlist (6).
- **Seeds:** every seed label is the lane's seed key `<cutoff>/<lane>/R<r>[/<sub-cell>]` in this study's namespace.
- **Order (NL0 §3.1):** C19 search → qualify → seal and **commit** the fold selection → C19 cross-test (training door) →
  fold evaluation; then C21; then C23; the sequential path; then the C24 independent and informed searches and the C24
  qualification (commit); the unit cross-test; the diagnostics; the frozen selection (commit); the validation. A fold
  evaluation never feeds a later search; no earlier cutoff runs after a later cutoff's selection exists (guard in code).

### 7.2 Island, promotion, refinement and shortlist rules

NL0 §3.3 unchanged (NSGA-II operators and parameters, start populations, stagnation, promotion shares and distinctness,
refinement moves and acceptance, shortlist slots), with AD4's conversions.

### 7.3 Budgets (frozen, `budgets.ts`) and the equivalence with the original

| Lane | Distinct base proposals | Maximum with extensions | Composition |
|---|---:|---:|---|
| Independent, per cutoff | **24,576** | **49,152** | 6 replicates × [V1 1,024 (screen 512 + 2 islands × 256) + V2 1,024 (the same) + V3 2,048 (screen 1,024 + 4 islands × 256)]; extensions up to 6 / 6 / 12 islands |
| Informed, C24 | ≤ 12,570 | ≤ 21,786 | 6 replicates × [designs ≤ 559 (7 seeds × 25 + 3 focus × 128) + 4 islands × 384]; extensions up to 8 islands |
| Rungs / refinement / shortlist | | | rung 2: V1/V2 12 × 64, V3 16 × 64, informed 16 × 64; rung 3: 6/6/8/8 × 128; refinement one pass per start (focus starts ≤ 2); shortlist V1 3, V2 3, V3 4, informed 6 per replicate |

Totals: base ≤ 4 × 24,576 + 12,570 = **110,874** distinct proposals, maximum ≤ 4 × 49,152 + 21,786 = 218,394.
Refinement moves are counted apart.

**Equivalence with the original (standard §4.8; NL0 §4):**

| Unit | Original L0 arm (the effective budget that produced New L0) | Original whole 5B study (3 arms) | This study |
|---|---:|---:|---:|
| Configured base proposals | 36,802 (4 × 8,192 + 4,034) | 110,406 | **110,874** (3.01× the L0 arm) |
| Executed proposals | 49,346 (C19 9,472; C21 9,728; C23 12,288; C24 13,824; informed 4,034) | 148,038 | base alone ≥ every original L0 lane's executed count (independent 24,576 per cutoff ≥ 13,824; informed ≥ 12,102 ≥ 4,034); executed reported |
| Per-replicate lane schedules | 5B's | 5B's | identical (V1 = V, V2 = G, V3 = B; informed unchanged) |
| Lane runs per position and job | 18 independent, 6 informed per job (3 arms) | — | 18 and 6 (6 replicates) |
| Refinement starts per independent replicate and cutoff | 7 (2 + 2 + 3) | — | 7 (2 + 2 + 3: profit-2 replaces both-Growth) |
| Informed refinement starts per replicate | 7 (robust, profit, both + 2 focus × 2) | — | 9 (robust, profit, profit-2 + 3 focus × 2) |
| Requested evaluations (search) | 489,695 | 1,463,415 | reported (expected ≈ 3× the L0 arm) |
| Qualification evaluations | 64,554 requested | 189,747 unique fresh | reported |
| Unique fresh simulations per job / caps | — | 1,679,368 pool jobs; caps 415,000 / 370,000 per search job | the same caps per job |

Coverage implication: equal per-replicate schedules mean equal stage proportions at the base; the executed allocation
(rung-1 66–75%, refinement 15–19% of fresh simulations in 5B) is expected to recur and is reported. The original L0
arm's extension islands partly came from L1/L2 triggers (synchronization); here only each lane's own trigger extends it
(AD6), so executed extensions may be fewer per lane, but the base alone exceeds the L0 arm's executed work.

### 7.4 Simulation caps and the resource guard (5B's)

Frozen per-job caps on unique fresh simulations (a job exceeding its cap fails — an amendment matter): engineering
(stage V, bench, pilot) 320,000; each independent search job 415,000 (× 4); the informed search 370,000; each
earlier-cutoff qualification 75,000 (× 3); the C24 qualification 110,000; each earlier-cutoff cross-test 25,000 (× 3);
the C24 cross-test 60,000; diagnostics 30,000; the validation neighbourhoods 15,000; in-process fold, diagnostic and
validation runs counted in their records. Sum of caps 2,865,000 ≤ 3,000,000. **Resource guard:** before an extension
round, the evaluations the job's lanes requested so far + the round's worst case (every new proposal plausible: 256 or
384 × 17 per extending lane) + a finishing reserve of 8,000 per independent lane or 30,000 per informed lane ≤ the job
cap; otherwise every still-extending lane stops with "resource guard". A guard-stopped lane with a trigger firing is
**budget-bound**, never converged.

### 7.5 Extension and stopping (frozen; development progress only)

After its last base island, and after every extension island, a lane records whether that island raised by more than
**5%** its union hypervolume of (−robust, p90) against (0, $35,000), its best feasible rung-1 robust net or its best
feasible rung-1 centre net, or produced a **new feasible behaviour** (a funded-component pattern not yet feasible in the
lane). The lane runs one more island iff its trigger fired, up to its cap (6 / 6 / 12 / 8 islands) and the resource
guard (AD6). Recorded stopping conditions per lane: "triggers not met", "extension cap reached (budget-bound, not
converged)" or "resource guard"; per island "budget", "stagnation", "no new configurations" or "generations". No
validation-based extension, no extra seeds after disappointment, no extra tuning. Nothing is re-searched after a fold,
a qualification, a cross-test or the validation.

## 8. Robustness instrument (NL0 §3.5; `config.ts neighbourhood`, `qualify.ts`)

- **Radius:** D1 — Study 8's N1 radius in grid units (X ±10, Y ±2, stop ±10, **hold ±2**, L ±10, buffer ±10, P ±10, W
  ±20) per book; Growth — 10% of each box in value units rounded to the fine step.
- **Draws:** one Latin hypercube of n rows over the 116 numeric columns per seed family (common random numbers across a
  cutoff's centres and across both units); clip to the box widened to include the centre (clipping counted);
  categorical inputs and the structure fixed; inactive inputs untouched; duplicates dropped.
- **Families** (`deriveSeed('vg-l0-session-hold', 'nbhd', …labels)`): rung 1 / refinement 16, rung 2 64, rung 3 128;
  **selection 2 × 128** (`('select', rep, cutoff)`); **fresh confirmation 3 × 128 = 384** (`('confirm', rep, cutoff)`,
  qualification only); small (0.5) and wide (1.5) 128 each (export rows). The same draws for A, B and C.
- **Statistics:** median, p10, p90 net; robust = ½ median + ½ p10; median, p90, p95 DD; breach count and share with its
  Wilson 95% interval; mean excess; worst DD; worst-10% mean DD; distinct ledgers; draws equal to the centre; clipping.
  Report-only beyond the gates.

## 9. Qualification, roles and the primaries (`qualify.ts`, `folds.ts`)

### 9.1 Gates (NL0's Q1–Q6, all must hold)

Q1 centre net > 0; Q2 centre maximum minute DD ≤ $35,000; Q3 fresh confirmation p90 DD ≤ $35,000; Q4 fresh confirmation
p10 net > 0; Q5 at 10 bps per side centre net > 0 and DD ≤ $35,000; Q6 D1 and Growth both funded at the centre. No
activity, trade-count, equal-activity, annual-profit, concentration, worst-episode or tail gate. Near misses (failing
only Q3, Q4 or Q5) are tabled with their severity; token participation (< 5% of funded principal-days) and unfunded
components are labelled. Report-only stresses: 20 bps, 14% interest, +25 bps stop slippage, next-open stops; causal
removals: without D1, without Growth, without each symbol, without each enabled component.

### 9.2 Roles (selection families)

actual-profit = the highest centre net (ties: selection robust net, lower centre DD, label); robust-profit = the highest
selection robust net; balanced = the highest selection robust net ÷ selection p90 DD; lower-drawdown = the lowest
selection p90 DD among those with selection robust net ≥ 50% of the actual-profit holder's.

### 9.3 Sets and primaries

- **Every cutoff:** `ses/independent` (all replicates and sub-cells), `ses/independent R1…R6` and `ses/independent
  V1/V2/V3` (reporting only). At C19, C21 and C23 the **fold primary** = the `ses/independent` actual-profit role.
- **C24:** `ses/final` (selectable: the independent and informed shortlists and New L0, C4, C4-refined, C85 under 'ses'),
  `ses/informed`, `ses/informed R1…R6`, `ses/searched` (every searched member, no control; reporting), `ses/controls`,
  `cal/controls`. **The primary C** = `ses/final`'s actual-profit role; the **independent primary** = `ses/independent`'s;
  the **informed primary** = `ses/informed`'s. If C is an unchanged control, the report says so and shows the searched
  primary beside it. No qualified member → "no qualified combined result".
- **Comparisons** (reported, never selection inputs): every member against A, B, C4 and C4-refined: dominates (centre
  net ≥, centre DD ≤, confirmation p10 ≥, confirmation p90 DD ≤, one strict), higher-profit trade-off, stronger local
  stability.

## 10. Chronological procedure test (independent lanes only)

| Cutoff | Training door | Committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- **Fold exports (frozen rule):** the `ses/independent` set's four role holders and each replicate's actual-profit holder;
  each evaluated on the slice under **both** units (the 'cal' rows report-only), with New L0 (A, B), C4, C4-refined and D
  descriptively.
- **Sequential path:** the fold primaries trade their slices in turn under 'ses' (flat without one), each slice from a
  continuous run on the evaluation door; a switch between configurations is charged 5 bps on $100,000 per open lot it
  closes or adopts. Reported: net, charges, the strict minute DD of the concatenated slice marks, roles, replicates
  alone, the same fold primaries under 'cal' and the fixed controls (descriptive).
- **Verdict (frozen):** *chronologically supported* iff every fold produced a primary, the sequential net > 0 and the
  sequential minute DD ≤ $35,000; *incomplete* if a fold had none; *unsupported* otherwise. The original procedure's
  path (5B L0 arm, calendar): −$29,358.01, DD $67,214.22, unsupported (pinned, §11.1).

## 11. Comparison rules, cross-test, diagnostics, the frozen selection and the validation

### 11.1 Frozen comparison labels (`labels.ts`; development and folds only; computed in the frozen selection)

Band B = $2,500 (report-only materiality, not a gate). For X vs Y with X, Y ∈ {A, B, C}:
- **Dev:** ΔF = X centre net − Y's; ΔP10 = X confirmation p10 − Y's (the same draws); replication, where X = C: at least 4
  of the 6 informed replicates' seed-level actual-profit holders beat Y's centre net by more than B. '+' iff ΔF > B,
  ΔP10 ≥ −B (and replication); '−' iff ΔF < −B and ΔP10 ≤ B; '0' iff |ΔF| ≤ B; else 'mixed'.
- **Risk:** 'worse' iff X's confirmation p90 DD or centre DD exceeds Y's by > B; 'better' iff its p90 DD is lower by > B
  and its centre DD not higher by > B; else 'same'.
- **Chron (C vs A only):** the session study's independent sequential path against the original 5B L0 path: '+' iff the
  session path is supported and (the original is not, or its net > the original's + B); '−' iff (the original supported
  and the session path not) or (the same verdict and the session net < the original's − B); else '0'. (The original
  path had one third of this study's search effort; disclosed.)
- **Label (first match):** repeatable improvement (Dev '+', Chron '+', Risk not worse); harmful (Dev '−' and Chron not
  '+'; or Chron '−' and Dev not '+'; or Dev '0', Chron '0', Risk worse); no material difference (all '0' / same);
  conditional profit/risk trade-off (Dev '+' and Chron not '−'; or Dev '0' with Chron '+' or Risk better); inconclusive
  (else). For B vs A and C vs B (no procedure path, Chron '0') a Dev '+' is qualified "development improvement (no
  chronological test applies)".
- Labels: **B vs A** (the convention on the fixed phenotype), **C vs A** (re-optimized vs frozen New L0), **C vs B** (the
  re-optimization effect). Validation is reported beside them and never changes them.

### 11.2 The unit cross-test (`crosstest.ts`; report-only)

- **Export set (frozen rule, sealed as `results/crosstest/<cutoff>/exports.json` before any cross-test evaluation):**
  C24 — the `ses/final` set's four role holders, the independent and informed actual-profit holders, each replicate's
  independent and informed actual-profit holder; earlier cutoffs — the fold exports. Rows + controls (C24: New L0, C4,
  C4-refined, C85, IJ1, D; earlier: New L0, C4, C4-refined, D).
- **Every row × {cal, ses}:** the centre on the cutoff's training door. **Principal rows** (C24: C, the independent and
  informed primaries, New L0, C4, C4-refined; earlier: the fold primary and New L0): the fresh confirmation family
  (identical draws in both columns) and a causal rerun with the cell's own leading winning episode blacked out. C24
  export rows (and New L0) also get the small and wide families under 'ses'.
- **Decomposition (report-only):** total = v(pC, ses) − v(pA, cal) = C − A; unit effect = v(pA, ses) − v(pA, cal) =
  B − A; phenotype effect = v(pC, cal) − v(pA, cal); interaction = the remainder; re-optimization effect = C − B; v =
  centre net, and the confirmation median for principal rows; "within search variability" iff |effect| ≤ the spread of
  the informed replicates' bests; "concentrated in one episode" iff, with each cell's leading episode blacked out, the
  effect changes sign or falls below half.

### 11.3 Diagnostics (`diagnostics.ts`; D24; report-only; sealed before the frozen selection)

For C, the independent and informed primaries, New L0 (A, B), C4, C4-refined and D under both units: the funded-lot
ledger (component, entry, exit, reason, sessions and calendar days held, interest, costs, net, MAE / MFE); funding
decisions and refusals by occupant; holding periods; exit reasons; the deepest drawdown episodes; matched lots between
the units of the same phenotype (unchanged; retimed exits — extended or shortened by the unit; retimed; newly admitted;
displaced; reconciled) and C against A. **Episode dependence** (NL0 lesson; reporting only): for C, the independent
primary and each fold primary, the 128 selection rep-1 neighbours under 'ses'.

### 11.4 The frozen selection (`FROZEN_SELECTION.json`, sealed and committed before FULL opens)

A, B and C with complete effective settings (both units for C), the independent, informed and searched primaries, every
set's roles, rank orders and Pareto sets, the seed-level roles, the comparisons, the near misses, the fold selections'
and the sequential record's pins and verdict, the cross-test subjects, the diagnostics' pin, **the frozen comparison
labels**, the code, data and reference-method pins, the validation plan.

### 11.5 Validation (FULL, once, under the guard; no futility stop)

Every cross-test subject under both units, and VG #2 native: one continuous run 2016-01-04 → 2026-10-30. Reported:
validation P&L with realized/unrealized parts, the reset validation DD, the whole-run DD and their dates, 2025 and 2026,
lots after the boundary, positions crossing it, open remainders, refusals. **V1** validation P&L > 0; **V2** reset
validation DD ≤ $35,000; **V3** whole-run DD ≤ $35,000. Report-only: 10 / 20 bps and 14% interest; the fresh
confirmation rep 1 (128 draws) on FULL for A, B, C and the independent primary; full-history ledgers, annual P&L and
annual reset drawdowns, refusals with occupants, exit reasons, holding periods (sessions and calendar days) and matched
lots (B vs A, C vs A, C vs B, C vs C under calendar days). **Known targets compared here only:** New L0 = A
(development $382,721.46 / $19,459.83; validation $96,883.72 / reset DD $20,385.99; full $479,605.18 / $20,385.99), C4
($302,785.91; $99,081.34 / $21,536.85; $401,867.24), C4-refined ($360,569.71; $91,512.65 / $19,477.66; $452,082.36), D
($268,487.02; $74,688.80; $343,175.82), VG #2 native ($334,911.93 / $21,303.61). A failed validation is a result: no new
winner, no rescue search, no retuning, no relabelling.

## 12. Engineering gates (stage V, `parity.ts`; sealed `results/parity/parity.json` before the freeze; a failure stops every dependent stage)

| Gate | Requirement |
|---|---|
| G1 | Calendar reproduction through this study's path: New L0, C4, C4-refined, C85, D and IJ1 = 5B's sealed L0 C24 evidence centres field for field; VG #2 native = $260,223.13 / $17,280.74 / 36 lots / 14 refusals |
| G2 | Backward compatibility: ≥ 900 archived 5B L0 records (its own search archives on D19, D21, D23, D24; V, G, B) re-evaluated at the default unit = archived, field for field; bound to Priority 3's current evaluation digest |
| G3 | Path identity under 'ses': fast = detail on 48 random V configurations (D24) |
| G4 | Causal prefix under 'ses': random configurations on D19, D21, D23 = their D24 runs through the shorter door (funding records, lots and fills, daily marks) |
| G5 | Accounting on every run above, both units: Σ lot nets = net, Σ interest, Σ costs, peak principal ≤ $100,000, one slot, realized + unrealized = net |
| G6 | Unit separation: interleaved cal → ses → cal evaluations in one process reproduce the first calendar record; session records differ where a hold binds; options never carry the unit themselves |
| G7 | The hold rule on real data: every maximum-hold and buffered-loss exit at an age ≥ the hold, counted independently from the dates in each unit; New L0 under 'ses' never exits by the hold before its calendar hold |
| G8 | Single-component identities under 'ses': a pool with one component enabled funds exactly that book's trades |
| G9 | The archive key carries the hold unit |

**Synthetic tests** (recorded in the checkpoint): `src/lib/tests/tradingSessions.test.ts` (weekends, holidays incl.
days of mourning, entries before holidays, the entry session as age 0, an independent day-by-day count over the whole
coverage, missing data versus non-trading days, fail-closed cases); `src/shared-margin-portfolio/tests/holdUnit.test.ts`
(D1: entry before a holiday, exact boundaries N − 1 / N, weekends, the loss-at-open condition, the buffered loss from the
hold age, a missing genuine session, a data session on a holiday, default = calendar); `src/growth-trading/tests/holdUnit.test.ts`
(Growth: both exit evaluators); `src/vg-d1-growth-joint/tests/holdUnit.test.ts` (keys); this study's `tests/`. The full
`npm test` runs once in a contained unit after the validation; known pre-existing failures are distinguished from
regressions.

## 13. Resources and recoverability (NL0 §3.7)

- **Containment:** every heavy stage is a transient systemd user unit inside `vgl0sh.slice` with **MemoryHigh=44G,
  MemoryMax=48G, MemorySwapMax=0** (re-applied before every launch; the unit carries the same limits, `KillMode=mixed`,
  `Restart=no`); heavy units run one at a time; Claude and tmux outside.
- **Execution:** child-process workers (`--expose-gc`, 1.5 GiB old space), one door each; a full GC every 64 evaluations
  or above 256 MiB of ArrayBuffers; ≤ 2 tasks in flight per worker; queue chunks ≤ 4,096; Priority 3's per-worker book
  caches (48, keyed by the unit); a per-job SQLite archive (WAL; LRU ≤ 100,000) bound to the study, job, door pin and
  evaluation digest; duplicate concurrent keys submitted once; a 10-second memory monitor; **dispatch stops at 36 GiB**
  of job cgroup memory (in-flight work finishes, the archive commits, exit 75). **14 workers** — the bench's fastest
  stable setting (amendment R1: the D24 session-unit rung-1 mix of 96 random V centres × 17, after a warm-up, ran 95.6 /
  96.8 / 95.4 evaluations/s at 12 / 14 / 16 workers, peak job cgroup memory 7.5 / 8.8 / 10.0 GiB; CPU-bound on the 8
  physical cores).
- **Recoverability:** every evaluation is archived as it returns; checkpoints at every generation boundary and at least
  once a minute; a rerun of the same command replays deterministically from the archive (a kept lane result must equal
  its replay; extension decisions at barriers). A worker death fails the job promptly; no automatic restart; no OOM
  restart loop. Each job keeps `runs.jsonl`.
- **The pilot** (pilot budgets, `pilot-` job names, the pseudo-fold P18 on D19, outputs in the cache): every stage path;
  a straight run; a graceful stop then resume; a worker SIGKILL then resume; a unit SIGKILL then resume — identical
  lane results.

## 14. Integrity

The freeze records this file's, the amendments', the brief's, the adoption and the control manifests' sha256, the
reference method's pin, the sealed engineering gates, the evaluation digest (the import closure of the worker) and
Priority 3's evaluation digest now and historical (AD12), the code closure and its digest, the door pins, the canonical
data, git `HEAD`, the budgets, caps and resource contract. Stages refuse to run unless the preflight passes, the freeze is
sealed and committed, the engineering gates are sealed with 0 failures and the evaluation code is the frozen one.
Records are sealed write-once (0444; `results/seals.jsonl`; `npm run vg-l0sh -- verify`). Fold selections are committed
before their slices; `FROZEN_SELECTION.json` before FULL. The checkpoint is `RESEARCH_RECOVERY.md`. Report tables are
produced by `tools/vg-l0-session-hold/` (outside the pinned code). Any later change of the study code is an operational
amendment (`O*`) with the new closure digest before the next stage runs; the evaluation code never changes.

## 15. Reporting commitments (brief Phase 6)

- **Format:** written analysis, Markdown tables and machine-readable results only (standard §7.7); dollars with commas
  and two decimals; complete effective parameters for A, B, C and every frozen phenotype under both units.
- **A / B / C tables, separately for training (2016–2024), validation (2025–2026) and full history:** net profit, gross
  profit (Σ winning lots) and gross loss, margin interest and costs, maximum minute DD (dollars and % of $100,000) with
  dates, trades, win rate, average holding duration in sessions (and calendar days), capital utilization (funded
  principal-days ÷ available, and share of sessions with capital deployed), training net, validation net; annual profit
  and annual reset drawdowns; intratrade (MAE) and mark-to-market drawdowns; the worst individual trades; performance by
  symbol and strategy family; changes in entry/exit chronology; capital-pool conflicts (refusals by occupant) and missed
  opportunities; trades extended or shortened by the unit; parameter changes of C against A; overfitting and instability
  evidence (neighbourhoods and tails, replicate spreads, folds, episode dependence, validation).
- **Search:** budgets side by side with the original (§7.3), coverage, distinct configurations and ledgers, promotion
  attrition, extensions and stopping causes, seed-level results, resources.
- **Answers** to the brief's Phase 7.6 questions; the frozen labels; limitations (previously examined history; one
  history dominated by few episodes; local stability is not chronological reliability; the informed seeds carry a
  calendar-optimized lineage; historical compliance is not a guarantee). No deployment approval is implied; New L0 is not
  replaced.

## 16. Documentation and roadmap (part of the delivery)

- The reference method NL0 1.0.0 and standard 2.1.0 (Phase 2, committed before this protocol).
- The roadmap records this study as a separate, user-commissioned follow-up (after Priority 7A, with 7B still pending
  the user's review); nothing starts automatically.
