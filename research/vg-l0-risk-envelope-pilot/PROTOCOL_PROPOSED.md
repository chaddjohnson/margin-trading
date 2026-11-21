# PROPOSED protocol — risk-envelope pilot (NL0-R pilot) — FOR REVIEW, NOT AUTHORIZED, NOT FROZEN

> **Status: DRAFT FOR THE USER'S REVIEW.** Nothing here is adopted, frozen, preflighted, implemented as a search or run.
> No `STANDARD_ADOPTION.json` exists for this namespace on purpose (it is written only after authorization, from
> `docs/research/STUDY_PROTOCOL_TEMPLATE.md`). The optimization standard (3.0.0), NL0 1.0.0 and every optimizer default are
> unchanged. Every choice marked **[D-n]** is an open decision in `DECISION_REGISTER.md`; where this draft proposes a
> value it says so and the decision remains the user's. **PILOT NOT STARTED.**

Prepared by `research/gpu-phase7/` (the readiness assignment, brief §5 and §9). Infrastructure it relies on: the GPU
risk-envelope delivery and the acceptance record of GPU Phase 7 (`research/gpu-phase7/PREREQUISITES_READY.md`).

## 1. Research questions and hypotheses

- **Q1.** With the same strategy combination, engine, search schedule, seeds and budget, does replacing the original
  envelope (marked DD ≤ 35 % of C0) by the approved experimental envelope (marked DD ≤ 40 % of C0, trade principal loss
  ≤ 25 % of funded principal, banked-capital DD ≤ 25 % of C0) change what the NL0 pipeline finds at the C21 and C24
  cutoffs — qualified centre net, robust net, neighbourhood tails, structure?
- **Q2.** Does the experimental envelope admit the giveback-dominated regions that the $35,000 gate excluded at C21
  (`research/vg-l0-risk-metrics/SELECTION_PIPELINE_AUDIT.md` §2.3: $196k–$249k training nets, DD $35.1k–$36.6k, trade PL ≤
  $6.1k, banked DD ≤ $7k), and does it exclude the clustered principal-loss configurations seen at C23/C24?
- **Q3.** How do the two arms' selections behave on the following, previously examined history (C21 → 2022–2023; C24 →
  2025-01-02 … 2026-10-30), in conventional DD, principal loss, banked DD and the D1–D3 diagnostics?
- **Hypotheses (directional, each with its null):**
  - H1: the experimental arm's best qualified centre net at C21 exceeds the control's by > $2,500 (null: within $2,500 or
    lower). H1′: the same at C24.
  - H2: every experimental qualified member satisfies the envelope by construction; at least one experimental member is
    giveback-dominated (D3 unbanked-giveback share ≥ ½ of its conventional DD) with DD > 35 % of C0 (null: none).
  - H3: the experimental arm's next-slice conventional DD of its C21 primary is not worse than the control's by > $5,000
    (null: worse), reported with principal loss and banked DD of the slice.
- **Valid outcomes:** no improvement; an improvement confined to one cutoff; an improvement with worse tails. **A pilot
  result is never a deployment decision, never nominates a New L0 replacement and never changes the standard**; a promising
  result recommends a separately authorized, separately funded optimization (§15).

## 2. Exact risk metrics and normalization

`src/risk-envelope/policy.ts` (`risk-envelope@1.0.0`) is the only interpretation (specification:
`research/gpu-phase7/RISK_METRIC_INTEGRATION_SPEC.md`). With C0 = the fixed initial trading allocation ($100,000 for the
primary research):

| Metric | Value | Denominator | Control limit | Experimental limit |
|---|---|---|---|---|
| Marked DD | record `dd`: max_t [peak(t) − M(t)], strict tracker, every regular-session minute close while held and every session close, whole training door | **C0** (never peak equity) | 35 % → **$35,000** | 40 % → **$40,000** |
| Trade principal loss | `principalLossLiquidation` [D-3]: max over funded lots of max(0, −min λ_i) over the lot's life and exit | the lot's **funded entry principal** (= C0 per lot in the fixed slot) | report-only (original convention: none) | 25 % → **$25,000** |
| Banked-capital DD | `bankedDdLiquidation` [D-3]: max_t [H(t) − M^L(t)], H = max(0, best banked net so far) | **C0** | report-only (none) | 25 % → **$25,000** |

- Comparison in dollars on unrounded values; **value = limit passes**; limits = (C0 × pct)/100 (exact).
- Not stop-loss rules: these are qualification constraints on historical paths; trading behaviour is unchanged.
- Structural relations on one slot (`SELECTION_PIPELINE_AUDIT.md` §3): trade PL (marked) ≤ marked DD exactly; banked DD ≤
  marked DD barring partial sales under water. Hence under the control the new metrics can never bind at 35 %; under the
  experimental envelope the 25 % gates bind **inside** the 40 % DD cap. **The experimental envelope is not a pure
  relaxation:** a member with DD $30k and trade PL $28k passes the control and fails the experimental arm. On the 1,000
  near-threshold engineering configurations per door of GPU Phase 7's risk-delivery parity (archived DD near $35k/$40k),
  about a quarter passed exactly one of the two policies, and banked DD > $25k was the most frequent experimental failure
  (figures: `research/gpu-phase7/PARITY_REPORT.md` §4; engineering subjects, not candidates).

## 3. Arms

| Arm | Envelope | Selectors |
|---|---|---|
| **CTRL** (original control) | `nl0-control@1.0.0` | P0 (NL0 actual-profit) and P1 (RA1, unchanged) |
| **EXP** (experimental) | `re-40-25-25@1.0.0` | P0 and P1 |

- P2 is **not** an arm (not promoted silently). New L0 and N/original are controls at both cutoffs (replayed, qualified
  with each arm's instrument, descriptive; never selectable in the independent lanes) [D-7 for whether they are
  selectable in a C24 informed comparison — proposed: not; no informed lane in the pilot].
- **The control arm reproduces Assignment 3 exactly.** CTRL uses Assignment 3's own seed keys
  (`<cutoff>/broad/<cell>/R<r>`) and schedule, so its lanes must equal Assignment 3's sealed lanes for the chosen cells —
  verified as an engineering gate before EXP opens (§12), on the GPU. EXP uses the **same seed keys** (paired common random
  numbers: the arm label never enters a seed), so the two arms see identical screens and identical random streams; every
  difference is caused by the envelope.

## 4. Alternative diagnostic policies (nonbinding; separate from the primary comparison)

D1 peak-equity drawdown, D2 capped hybrid, D3 profit-component partition — `DIAGNOSTICS_SPEC.md`. Computed on the common
populations of both arms after the search, by CPU diagnostic replays (purpose `diagnostic`); never a gate, ranking,
promotion, exit or search input in the pilot.

## 5. Parameter domains and selection methodology

- **Strategy combination:** D1·VGT + D1·GDX + Growth·VGT, one shared fixed-capital slot; Growth·GDX OFF; shadow delayed-entry
  eligibility OFF; calendar-day holds; the existing exits, allocator, costs (5 bps/side) and interest (11 %) — Assignment 3's
  engine and evaluation path, unchanged.
- **Genome and grids:** Assignment 3's (92 genes; coarse screens/islands, fine neighbourhoods/refinement; RC 1/RC 2 D1
  controls; the complete Growth 1.4.0 genome), unchanged.
- **Cells [D-1]:** proposed **2 cells**: `GA0.VA0` (New L0's D1 mechanics, the legacy cell) and `GB0.VD1` (drawn
  without outcomes: the minimum of sha256("vg-l0-risk-envelope-pilot/cell/" + id) over the other 63 cells). Alternatives:
  K = 3–4 cells (budget §7), or cells chosen from Assignment 3's results (informed; would need the label "structure-informed").
- **Replicates:** R1 and R2 (Assignment 3's two independent seed streams).
- **Selection** per (cutoff, arm): the qualified set (§9 gates); P0 = highest centre net; P1 = RA1 (`src/vg-l0-risk-families/
  select.ts`, unchanged; its S4 threshold [D-8]: proposed 35 % of C0 under CTRL, 40 % under EXP). Roles (actual-profit,
  robust-profit, balanced, lower-drawdown) and the Pareto set reported as NL0 §3.5.

## 6. Search-stage implementation plan (where the envelope acts)

Every stage that reads the $35,000 rule in Assignment 3 / NL0 (`SELECTION_PIPELINE_AUDIT.md` §1) reads **the arm's
policy** instead — never a final-ranking adjustment over an unchanged search. Stage by stage (file plan in
`IMPLEMENTATION_PLAN.md`):

| # | NL0 stage | CTRL (unchanged) | EXP |
|---|---|---|---|
| 1 | Sobol/Latin screen, strata | Assignment 3's | identical proposals (paired seeds) |
| 2 | Plausibility | net > 0 ∧ DD ≤ $35k ∧ funded | net > 0 ∧ funded ∧ `assess(centre, EXP).pass` (DD ≤ $40k, PL ≤ $25k, BD ≤ $25k) |
| 3 | Screen promotion (¼ net, ¼ constrained rank, ⅛ entry, ⅛ control, diversity) | as is | the same shares; constrained rank by the EXP violation [D-5: no extra "low-PL/high-giveback" reserve, proposed] |
| 4 | Rung-1 fit (centre-first), NSGA-II islands | feasibility: centre + p90 DD ≤ $35k | feasibility: centre EXP pass + neighbourhood p90 marked DD ≤ $40k, p90 PL ≤ $25k, p90 BD ≤ $25k [D-4]; objectives unchanged (−net, −robust, p90 marked DD) [D-6] |
| 5 | Extension triggers (HV vs (0, ceiling), +5 %) | (0, $35k) | (0, $40k); triggers unchanged |
| 6 | Rungs 2–3 | feasibility $35k | feasibility EXP (as 4) |
| 7 | Refinement (one pass; $2,000 rule) | violation 0 under CTRL | violation 0 under EXP |
| 8 | Shortlist (feasible; one per ledger; L∞ ≥ 0.10) | CTRL-feasible | EXP-feasible |
| 9 | Qualification Q1–Q6 | as Assignment 3 | §9 |
| 10 | Selection | P0, RA1 | P0, RA1 (S4 [D-8]) |

Both arms request the envelope for **every** evaluation (`risk: true`), so the diagnostics and the cross-reporting (each
arm's members assessed under the other policy) need no re-evaluation; CTRL's decisions never read it (proven equal to
the plain path by GPU Phase 7, gate A3).

## 7. Exact proposed evaluation budget and seeds

Per lane: Assignment 3's broad schedule (screen 512 → promote 64; 2–6 islands × 256; rung 2 12 × 64; rung 3 6 × 128; one
refinement pass from the robust and profit starts; shortlist 3), per-lane cap = its worst case **41,000** (never binding
in Assignment 3: max executed 27,439). Seeds: Assignment 3's `deriveSeed('vg-l0-full-joint', …)` lane keys (CTRL
reproduces Assignment 3) — identical for EXP.

| Block | Lanes | Proposals (configured / max) | Evaluations: expected | Worst case |
|---|---:|---:|---:|---:|
| C21 CTRL (2 cells × R1, R2) | 4 | 4 × (512 + 512…1,536) = 4,096 / 8,192 | **71,314** (= Assignment 3's sealed lanes: 12,946 + 18,170 + 15,685 + 24,513) | 164,000 |
| C21 EXP | 4 | the same | 50,000–110,000 (unknown: plausibility differs) | 164,000 |
| C24 CTRL | 4 | 4,096 / 8,192 | **62,488** (8,584 + 19,922 + 16,933 + 17,049) | 164,000 |
| C24 EXP | 4 | the same | 45,000–95,000 | 164,000 |
| Qualification (≤ 3 shortlisted per lane → ≤ 12 members per (cutoff, arm), + New L0 and N/original per cutoff and arm) | — | — | ≤ (48 + 8) × 700 = **39,200** | 39,200 |
| **Total** | 16 | 16,384 / 32,768 | **≈ 270,000–380,000** | 695,200 |

- **Fairness.** Identical schedules, seeds, caps, doors and qualification instrument for both arms; proposals are equal by
  construction until a lane's extension triggers differ; evaluations differ only because plausibility differs (centre-first
  fitting). Both are reported per arm and lane (proposals, islands, refinement moves, requested, fresh, archive hits). No
  arm is stopped by a budget the other did not face; a lane that reaches its 41,000 cap is labelled budget-bound.
- **Total budget rule [D-2]:** proposed — the expected total (≈ 0.27–0.38 M) lies in the approved 0.3–0.5 M band; the
  worst case (0.70 M) does not. Proposed safeguard: a study-level guard that stops **before qualification** (never
  mid-search, never one arm only) if the four search blocks together requested more than 450,000, and reports the pilot
  as budget-exceeded; the user then decides. Alternative: K = 1 cell (≈ 0.14–0.2 M) or K = 3 (≈ 0.4–0.57 M).
- **Not in the pilot** (declared reduced scope): Assignment 3's stage-2 refinement lanes (≈ 46–50k each), Track N, C19/C23,
  the other 62 cells. Their omission is stated in every report; no claim of equal effort with Assignment 3.

## 8. Candidate retention and diversification

NL0's rules, unchanged in both arms: one configuration per funded-lot ledger in promotions and shortlists; L∞ thresholds
(0.02, 0.03, 0.10); the promotion shares and the diversity fill; Assignment 3's protected strata (activation, K, Growth
structure). Proposed [D-5]: no new reserved share for "low principal loss, high giveback" proposals (it would change NL0's
schedule; PROPOSED_METHOD §3 suggested it — the user decides).

## 9. Qualification gates (per arm)

| Gate | CTRL (= Assignment 3) | EXP (proposed [D-4]) |
|---|---|---|
| Q1 | centre net > 0 | same |
| Q2 | centre DD ≤ $35k | `assess(centre, EXP).pass` (DD ≤ $40k, PL ≤ $25k, BD ≤ $25k) |
| Q3 | confirmation (3 × 128, independent seeds) p90 DD ≤ $35k | confirmation p90 marked DD ≤ $40k ∧ p90 PL ≤ $25k ∧ p90 BD ≤ $25k |
| Q4 | confirmation p10 net > 0 | same |
| Q5 | at 10 bps: centre net > 0 ∧ DD ≤ $35k | at 10 bps: centre net > 0 ∧ EXP envelope at 10 bps |
| Q6 | D1 and Growth both funded at the centre | same |

Report-only for both: 20 bps, 14 % interest, +25 bps stop slippage, next-open stops, causal removals, every member's
assessment under the **other** arm's policy, tails (§10), D1–D3.

## 10. Chronological windows and data doors

- **Training doors:** C21 → D21 (2016-01-04 … 2021-12-31), C24 → D24 (… 2024-12-31): Priority 3's byte-prefix doors (size,
  sha256, last row verified; GPU Phase 7 re-verified them on 2026-11-21).
- **Next slices (retrospective, previously examined history):** C21 primaries (both arms × both selectors) on 2022-01-03 …
  2023-12-29 through D23 (continuous runs, slice DD reset at the cutoff close); C24 primaries on FULL 2025-01-02 …
  2026-10-30 **once**, after the pilot's frozen selection is sealed and committed (door guard).
- **Labels:** "retrospective, previously examined history (2020, 2022, 2025–2026 inspected by earlier studies; the
  experimental envelope itself was motivated by archives of C21–C24)"; never "holdout". One fold per cutoff only — the
  pilot has no sequential chronological verdict of the procedure (stated; standard §1.8 consequence: "no chronological
  support: not a deployment-qualified candidate without an explicit user decision").
- **No validation feedback:** nothing observed on a slice changes a cell, seed, gate, budget, selector or selection.

## 11. Robustness and tail-risk reporting

Per qualified member and primary: neighbourhood (selection 2 × 128; confirmation 3 × 128) p90, p95, worst and worst-10 %
mean of marked DD, trade PL and banked DD (`envelopeNbStats`), breach shares with Wilson intervals, the exact drawdown
attribution (lot level) and the D3 account partition, the §5.9 chronological exposure items, the D1 hold-window tail
stress (Assignment 3's `tools/vg-l0-full-joint/tail.ts`), gap-through-stop (−10/−20/−30 % opens) on the trade PL.

## 12. Treatment of unrestricted / open-ended Growth configurations

Growth·VGT may have no maximum hold and no initial stop (open-ended exit), as in Assignment 3. Proposed [D-9]: **no
change to the genome or the search**; every member is labelled `bounded` (maximum hold or initial stop ON) or
`open-ended`, and every table splits by that label; the trade-PL gate applies to both. Alternatives: a protected stratum
(changes the screen), or a requirement (changes the domain) — both need approval.

## 13. Cost and interest stress tests

Q5 (10 bps) as a gate (§9); report-only 20 bps, 14 % interest, +25 bps stop slippage, next-open stops — under both
policies, for every qualified member and primary.

## 14. $250k / $500k scaling checks

Not a search. The frozen primaries and New L0 / N/original are replayed by the CPU engine at C0 = $250,000 and $500,000
(`tools/gpu-phase7/scaling-check.ts`, purpose `diagnostic`; the official GPU path is fixed at $100,000) and assessed with
limits scaled to C0 (40 % → $100k / $200k; 25 % → $62.5k / $125k). Verified already in GPU Phase 7 on 148 configurations
per door: identical trade chronology and decisions; dollar amounts proportional within 3 × 10⁻¹⁵ × C0
(`SCALING_CHECKS.md`). Account-level margin maintenance stays a separate illustrative assessment
(`src/vg-l0-risk-metrics/margin.ts`), never a pilot gate.

## 15. Reproducibility, artifact retention and the follow-up rule

- Every job an `openJob` identity of `research/vg-l0-risk-envelope-pilot`; archives (git-ignored) bound to study, job,
  door pin, evaluation digest and backend; sealed stage records (0444, `seals.jsonl`), committed before the next stage;
  receipts, telemetry and attestations committed; RESEARCH_RECOVERY checkpoint per stage.
- Archives are kept until the user's review (then compressed like Assignment 3's, never deleted without authorization).
- A promising EXP region leads only to a **recommendation** of a separately authorized optimization; the pilot never
  enlarges its own budget.

## 16. Proposed acceptance, qualification and go / no-go criteria

- **Engineering go (before any EXP evaluation):** (E1) the GPU acceptance record ACCEPTED and matching (GPU Phase 7); (E2)
  CTRL lanes of both cutoffs = Assignment 3's sealed lanes (every lane result field; GPU); (E3) the pilot code's
  fixed-seed mini schedule CPU = GPU for both arms (records, envelopes, decisions); (E4) a test that no pilot stage reads
  `economics.ceiling` directly (grep + unit tests per stage); (E5) the study preflight with
  `evaluationBackend: gpu-required`; (E6) the live official gate opens (attestation) on D21 and D24.
- **Research outcome categories (no automatic adoption):** EXP-better (H1 or H1′ holds and tails within the envelope),
  equivalent, worse, inconclusive (budget-exceeded or a gate failure). The pilot report recommends; the user decides.
- **No-go:** any engineering gate fails; any CPU-scored evaluation; any change after the freeze without an amendment.

## 17. Expected GPU resources and compute time

Measured in GPU Phase 7 on the accepted binary (`EXECUTION_PLAN.md` §4, from the campaign's sealed-replay and mini
timings and the pilot-shaped benchmark): see that section for the figures and their derivation. One official job per
cutoff (the two arms of a cutoff share one door and one job: 8 lanes) — or the two cutoff jobs concurrently (Mode A).

## 18. Proposed official execution commands and job identities

`EXECUTION_PLAN.md` §3 (not executable until the pilot code exists and the user authorizes; the npm script does not
exist yet). **Do not run.**
