# READ FIRST — Stage A risk-envelope sensitivity audit (RES-A 1.0.0)

**Status: COMPLETE (Stage A only). No new optimization was run.** This is a retrospective, read-only re-assessment of
the candidates the completed risk-envelope pilot already evaluated. Nothing was adopted, deployed or merged. The
original NL0 method (P0: marked DD ≤ 35 % of C0) remains the authoritative reference; the pilot's outcome (**worse**)
stands as sealed.

## Executive conclusion

1. **The 25 % banked-capital limit was restrictive — at C24.** On the 24 shortlisted members common to both pilot
   arms, BD 25 % removes the control's two best C24 phenotypes ($218,842; $205,661). It lowers the best qualified member
   from $218,842 to $197,012. At C21 it changes nothing at the top ($216,732).
2. **BD 30 % recovers exactly the control's outcome; BD 35 % adds nothing.** Under 40 / 25 / 30 (P3) and 40 / 25 / 35
   (P4) the best qualified member equals P0's at both cutoffs. Every member that BD 30 % rescues is a control member with
   confirmation p90 BD of $25.6k–$28.5k. No member needs 35 %.
3. **No relaxation beats the original control** on these candidates: not at the centre, at the 128-draw search stage,
   after full Q1–Q6 qualification, nor in the extended rung-3 set (G1, CPU-confirmed). The 40 % marked-DD relaxation
   adds about 1,200 eligible centres per cutoff, none better than P0's best eligible candidate at the same stage.
4. **PL vs BD.** In the one-slot portfolio BD ≥ PL by construction, so the 25 % PL gate was fully redundant in the
   pilot (P2 ≡ P6 everywhere). With BD at 30 / 35 % PL binds alone for 0.6–1.5 % of centres, never decisively.
5. **The pilot's shortfall.** C21 is all search path. At C24 the 25 % gate removed the control's winner (−$29,499 on the
   control's vectors), partly offset by EXP's search path (+$7,669). This is a matched-candidate counterfactual, not
   evidence of what a BD-30 % search would find.
6. **Recommendation: keep P0; no further optimization is justified for profit.** If the envelope is wanted for its
   protections, use **BD 30 %** (not 25 %) and test it only through the replicated P0-vs-P3 non-inferiority design of
   `STAGE_B_OPTION.md`: about 1.15 M requested evaluations, about 2.1 measured GPU-hours, **not run, not authorized**.
   Returning to staged trailing-stop work is the default suggestion.

## What was actually analysed

- **The complete search populations of both arms.** These are 11,462 (C21) and 13,899 (C24) unique centres, of which
  9,644 / 11,243 are profitable, funded and have a complete risk record, with 6,837 / 5,512 measured search-stage
  neighbourhoods. They were rebuilt from sha256-verified copies of the pilot's archives with **zero evaluations**.
- **Every qualification member** (26 per cutoff), with all 384 confirmation draws.
- **G1:** CPU confirmation for the 40 non-shortlisted rung-3 configurations per cutoff (30,880 evaluations).
- **G2:** CPU drawdown attribution for the 3,238 centres whose verdict changes across policies.
- **Reproduction and parity.** The reconstruction reproduced every sealed pilot result (232 / 232 checks). Every CPU
  record (3,830) equals the archived official GPU record bit for bit.
- **Nine predeclared policies P0–P8** (`POLICY_MATRIX.md`, committed before any comparison at `93bc76a3`).

## Evidence grades

| Finding | Grade |
|---|---|
| Eligibility changes, PL ≤ BD identity, P2 ≡ P6, BD 30 % recovers the control's candidates, BD 35 % adds nothing | strong on these fixed candidates; exploratory (levels chosen after the pilot) |
| "No relaxation beats P0" | strong for the candidates the two searches proposed; silent on what a new search would find |
| Attribution of the pilot's Δ | moderate (exact arithmetic; one seed pair per cell; order dependent) |
| Next-interval behaviour | weak (two correlated, previously inspected intervals; on 2025–2026 P2's pick did better: +$58,652 vs +$16,049) |

## Unresolved decisions (the user's; `DECISION_REGISTER.md` §3)

U1 Stage B or not (default: not) · U2 the banked level for any future envelope work (suggested 30 %) · U3 keep the PL
gate (risk preference) · U4 return to staged trailing stops (suggested yes) · U5 branches stay unmerged · U6 the
git-ignored caches (≈ 1.4 GB of audit copies; the pilot's own archives) · U7 no change of the standard or NL0.

## Reading order

1. `REPORT.md` — methods, coverage, all policy comparisons, qualification and robustness, attribution, the answers to
   the brief's seven questions, the Stage B go / no-go.
2. `POLICY_MATRIX.md` (exact P0–P8 definitions), `PROTOCOL.md` (the predeclared plan), `AMENDMENTS.md` (N1–N4).
3. `POPULATION_AND_PROVENANCE.md`, `METHOD_AND_CHECKS.md`.
4. `DECISION_REGISTER.md`, `STAGE_B_OPTION.md`.
5. `results/TABLES.md`, `results/summary.json`, then the machine-readable results:
   - `analysis-C2x.json`;
   - `centres-C2x.csv.gz` (candidate-level, every policy);
   - `rungs-C2x.csv.gz`;
   - `qualification-C2x.csv`, `neighbourhood-C2x.csv`, `extended-C2x.csv`;
   - `replays/`, `policies.json`, `MANIFEST.sha256`.
6. `tools/vg-l0-risk-envelope-sensitivity/` (every script), `RESEARCH_RECOVERY.md`, `brief/BRIEF.md`.

## Identity

| Item | Value |
|---|---|
| Branch / source | `research/vg-l0-risk-envelope-sensitivity`, created from the pilot's final commit `7f69d0d2`; predeclaration `93bc76a3`; final commit in `RESEARCH_RECOVERY.md` and the ZIP's `IDENTITY.txt` |
| `main` | untouched, never merged |
| GPU acceptance | `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc…` (Phase 7, ACCEPTED) untouched and **still valid on this lineage** (no evaluation-manifest, enforcement or job-module file changed); no GPU job ran |
| Standard / method | 3.0.0 `4e8244e6…` (scope diagnostic; preflight PASS); NL0 1.0.0 `9b387bb4…` (described, not re-executed) |
| Brief | `brief/BRIEF.md` sha256 `5a99e0e0600e674aa398cf31cd2d727e223e5e3c5bf66efcdc10e8d9080ecc43` |
| Doors | D21 and D24 only (CPU replays); D23 and FULL never opened |

**STAGE A COMPLETE — NO NEW OPTIMIZATION RUN — awaiting review and separate Stage B authorization**
