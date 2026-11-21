# Implementation plan — risk-envelope pilot code (to be written only after authorization)

The pilot's search code does not exist yet, deliberately: its gates and selectors depend on the open decisions
(`DECISION_REGISTER.md`). This plan fixes how it would be built so that **every stage** reads the arm's envelope and the
control arm stays Assignment 3 exactly.

## 1. Where the $35,000 rule lives today (Assignment 3 → Assignment 2 → Priority 3)

| Stage | Code (read-only references) | Rule |
|---|---|---|
| plausibility | `src/vg-l0-risk-families/fitness.ts` `plausible` | `!error ∧ net > 0 ∧ dd ≤ economics.ceiling ∧ mixed` |
| violation / feasibility | same file `violationOf` | `max(0, dd − c)/c` + p90 term + net + structure |
| islands, rung fits | `src/vg-l0-full-joint/search.ts` (fitOf, constrained domination `src/optimizer/nsga2.ts`) | feasibility = violation 0 |
| extension HV | `search.ts` (reference point (0, ceiling)) | |
| promotion constrained rank | `search.ts` (`src/study8-expanded-regime-d1/search.ts` helper) | violation, then (−net, DD) fronts |
| refinement acceptance | `search.ts` (violation 0 ∧ gain ≥ $2,000) | |
| shortlist | `search.ts` (feasible only) | |
| qualification Q2, Q3, Q5 | `src/vg-l0-full-joint/qualify.ts` | `economics.ceiling` |
| RA1 S4 | `src/vg-l0-risk-families/select.ts` | worst-10 % mean DD ≤ 35k |

These are completed studies' files: **never edited**.

## 2. The pilot namespace

`src/vg-l0-risk-envelope-pilot/` (new; an official GPU entrypoint: it imports `src/gpu-backend/official.ts`, so the
entrypoint audit classifies it without a registry change):

| File | Content |
|---|---|
| `context.ts` | study constants, the two arms `{ CTRL: NL0_CONTROL, EXP: RE_EXPERIMENTAL }` (from `src/risk-envelope/policy.ts`), C0 |
| `fitness.ts` | copies of `plausible`, `violationOf`, `fitOf` taking `policy`: the DD term replaced by `assess(centre, policy)` and the neighbourhood term by the policy's p90 terms (`envelopeNbStats`); objectives unchanged |
| `search.ts` | Assignment 3's `Lane` as a thin subclass/copy whose fitness, HV reference point (0, markedDd limit) and evalMany wrapper (`risk: true` on every item) come from the arm; seeds = Assignment 3's lane keys (the arm never enters a seed) |
| `qualify.ts` | Q1–Q6 with the arm's policy (§9 of the protocol); the cross-policy report |
| `select.ts` | P0 and RA1 (Assignment 2's code imported unchanged; S4's threshold from the arm, [D-8]) |
| `stages.ts`, `main.ts` | jobs per cutoff (`openJob` → `openOfficialGpuSession` → `GpuPool` → `EvalLab`), barriers, the study guard (§7 budget rule), sealed records |
| `diagnostics.ts` | the CPU diagnostic replays (D1–D3, DD^L, scaling) of the frozen populations — purpose `diagnostic`, separate npm script through the legacy-runner purpose gate |
| `tests/` | the stage-wiring tests below |

npm script (to be added): `"vg-l0rep": "node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-pilot src/vg-l0-risk-envelope-pilot/main.ts"`.

## 3. Engineering gates of the pilot code (protocol §16 E1–E6)

1. **CTRL = Assignment 3:** for each chosen cell, replicate and cutoff, the CTRL lane (GPU, `risk: true`) equals
   Assignment 3's sealed lane result with envelopes stripped (`tools/gpu-phase7/compare.ts --strip-envelope` logic).
2. **Wiring tests:** for each stage, a synthetic record set whose decision differs between the arms (e.g. DD $38k → CTRL
   infeasible, EXP feasible; PL $26k → CTRL feasible, EXP infeasible) must flip the stage's outcome accordingly; a grep test
   that no pilot file reads `economics.ceiling` or the literal 35000.
3. **Mini parity:** the pilot code on the fixed-seed mini schedule, CPU vs GPU, both arms: identical archives (records +
   envelopes) and lane results; interrupted + resumed identical.
4. **Preflight and gate:** `STANDARD_ADOPTION.json` (scope optimization, `evaluationBackend: gpu-required`, the pinned
   reference method NL0 1.0.0 and every deviation of the protocol), `npm run research-preflight -- --study
   research/vg-l0-risk-envelope-pilot`, the live official gate on D21 and D24.

## 4. What the implementation must not do

Change Assignment 3, Assignment 2 or Priority 3 files; add a CPU path; alter seeds, schedules, operators or grids; read
validation data before the frozen selection; adopt the experimental envelope into the standard.
