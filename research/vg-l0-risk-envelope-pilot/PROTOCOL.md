# Protocol NL0-REP 1.0.0 — the bounded risk-envelope pilot (authorized)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (sealed and committed before any
official pilot evaluation). Afterwards it is never edited; every change goes to `AMENDMENTS.md` (append-only). Pilot
research only: nothing here adopts the experimental envelope into the optimization standard, nominates a New L0
replacement, deploys a strategy, merges into `main` or opens broker access.

- **Study:** `research/vg-l0-risk-envelope-pilot/`; code `src/vg-l0-risk-envelope-pilot/` (official GPU entrypoint) and
  `tools/vg-l0-risk-envelope-pilot/` (non-official engineering and diagnostic tools); `npm run vg-l0rep -- <command>`.
- **Authority:** the user's authorization `brief/BRIEF.md` (sha256 `5a9dfe8f68d227be2dd429508691bf65574df6a975fa104e5d05c27e747723dd`,
  216 lines, read in full to its "Final instructions"). It supersedes the readiness assignment's "PILOT NOT STARTED"
  solely for this pilot. The readiness proposal is preserved byte-identical in `history/` (`history/TRANSITION.md`).
- **Lineage (D-14):** branch `research/vg-l0-risk-envelope-pilot`, created from the accepted Phase 7 lineage
  `research/gpu-phase7-risk-envelope-readiness` `fc027eed1efb7e7b8b67022d8f9553f5bf27c394`; GPU acceptance record
  `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7,
  ACCEPTED, out-of-band pin `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json`);
  never merged into or pushed to `main`.

## 0. Adoption, decisions and deviations

### 0.1 Standard and reference method

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version **3.0.0**, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (registered current), read in full 2026-11-22T09:43Z |
| Adoption manifest | `STANDARD_ADOPTION.json` — scope `optimization`, `evaluationBackend: { policy: gpu-required, purpose: official-optimization }`; every official stage calls `requireStandardAdoption` in code |
| Reference method | `docs/research/methods/NEW_L0_METHOD.md`, NL0 **1.0.0**, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` — through Assignment 3's broad lane, which is NL0's independent V-cell schedule |
| Search code reused | Assignment 3 (`src/vg-l0-full-joint/`, frozen; its sealed records `research/vg-l0-full-joint/`), Assignment 2's evaluation path, qualification helpers and selectors (`src/vg-l0-risk-families/`), Priority 3's engine — imported, never edited |
| Risk interpretation | `src/risk-envelope/policy.ts` (`risk-envelope@1.0.0`): `nl0-control@1.0.0`, `re-40-25-25@1.0.0` — the single interpretation |

### 0.2 The user's decisions (all approved; `DECISION_REGISTER.md` records the provenance)

D-0 authorize · D-1 two cells `GA0.VA0` + hash-selected `GB0.VD1`, R1/R2 · D-2 expected ≈ 270k–380k, ceiling 700,000
requested, **no 450k stop rule** · D-3 the two new gates on the liquidation basis, marked reported · D-4 p90 of each of
the three metrics for rung feasibility and Q3 · D-5 no extra promotion reserve · D-6 NL0's island objectives and
mechanics unchanged · D-7 New L0 and N/original descriptive benchmarks only, no informed lane · D-8 original RA1 (S4 35 %
of C0) in both arms + envelope-adapted RA1 (S4 40 % of C0) in EXP, on the same populations · D-9 bounded / open-ended
Growth labelled and reported, domain unchanged · D-10 EXP Q5 = the full envelope at 10 bps + net > 0 · D-11 DD^L a CPU
report-only diagnostic · D-12 every distinct selected primary of every arm and selector on its next interval · D-13
D1–D3 nonbinding diagnostics only · D-14 the Phase 7 lineage, no merge · D-15 resolved (scratch restores deleted).

### 0.3 Adaptations and departures (standard §7.3)

| ID | Standard § | Kind | What and why | User agreement |
|---|---|---|---|---|
| RD1 | §2.1, §2.3 | **departure** | The EXP arm replaces the $35,000 marked-DD research ceiling by the envelope DD ≤ 40 % of C0, trade principal loss ≤ 25 % of funded principal, banked DD ≤ 25 % of C0 in every stage of its search, qualification and selection. The CTRL arm keeps the standard's $35,000 rule exactly. The standard is not changed. | brief §2 ("Test whether replacing … with a 40 % marked DD / 25 % … / 25 % … envelope"), D-0, D-3, D-4, D-10 |
| RD2 | §1.8, §1.9 | **departure** | Two cutoffs (C21, C24) with one next interval each, not the C19 → C21 → C23 repeat with a sequential verdict; no fold path. Consequence (§1.8): every selection is "no chronological support: not a deployment-qualified candidate without an explicit user decision". | brief §4 ("Four independent search blocks"; C21 → 2022–2023; C24 → 2025–2026) |
| RD3 | §4.4, §3.2 | **departure** | No incumbent-informed lane; New L0 and N/original are descriptive benchmarks, never selectable and never injected. | D-7 |
| RD4 | §4.3, §4.8 | adaptation | Reduced structural scope: 2 of Assignment 3's 64 cells (GA0.VA0 and the outcome-independent hash-selected GB0.VD1), no stage-2 refinement lanes, no Track N. No claim of equal effort with Assignment 3 or NL0; the omitted cells' budgets are not reassigned (a pilot, not a reproduction). | D-1, brief §4 |
| RD5 | §5.9, §0.2 | **departure** (Assignment 3's AD5, kept) | RA1 (original and adapted) ranks on §5.9-type training quantities (open-lot multiple and share, worst lot MAE, selection worst-10 % mean DD, occupancy). | D-8; Assignment 3 brief §4 |
| RD6 | §5.3, §5.8 | adaptation | The EXP arm's neighbourhood gates compare UNROUNDED p90s of all three metrics; CTRL keeps Priority 3's cent-rounded p90 DD (the frozen instrument, required for CTRL = Assignment 3). They can differ only within $0.005 of a limit; every such case is reported. | brief §2 ("decisions on unrounded quantities"), D-4 |
| RD7 | §6.3 | adaptation | No new worker/batch tuning benchmark: the GPU execution shape (8 host workers, batch 8,192, linger 30 ms) is Phase 7's measured shape (`research/gpu-phase7/results/bench/benchmark.json`); timings select nothing. | brief §8 |
| RD8 | §1.4, §1.2 | adaptation (stricter) | D24 is opened by the C24 CTRL phase before the C21 selection exists (E2 must precede every EXP evaluation, §13); the CTRL lanes are Assignment 3's sealed lanes (known outcomes) and no C21 stage reads a C24 record (code guards). D23 and FULL open only behind their sealed and committed selections. | brief §7 (E2 before EXP), EXECUTION_PLAN (searches before qualifications) |

Differences from the readiness proposal (all decided before any outcome; `AMENDMENTS.md` P1–P9): the job structure
(one job per cutoff run in a CTRL phase and an EXP phase, so that E2 precedes every EXP evaluation); the union
qualification per cutoff (identical draws for both arms); RA1-adapted; no 450k rule; the budget accounting definitions;
the arm-specific neighbourhood statistic (RD6); the violation's 1e-6 rounding retained in both arms; the slice
evaluation's exact content; the outcome-label rule (§15).

## 1. Research question and hypotheses

**Question.** With the same strategy combination, engine, data, search algorithm, seeds, stage schedules, costs and
execution rules, does replacing the conventional NL0 marked-DD gate (≤ 35 % of the fixed $100,000 allocation C0) by the
envelope (marked DD ≤ 40 % of C0, every funded trade's principal loss ≤ 25 % of its funded entry principal, banked-capital
DD ≤ 25 % of C0) change the discovery and qualification of profitable, robust shared-capital phenotypes at C21 and C24 —
and how do the selected phenotypes behave on the following (retrospective) interval?

**Precommitted hypotheses** (evidence, not adoption criteria):

- **H1 (C21)**: Δ21 = centre net of EXP's P0 primary − centre net of CTRL's P0 primary > **$2,500** (P0 = the highest
  centre net among the arm's qualified members). Not computable if either arm has no qualified member (reported).
- **H1′ (C24)**: the same at C24 (Δ24).
- **H2**: every EXP-qualified member satisfies the envelope (by construction), and at least one EXP-qualified member has
  a centre marked DD > 35 % of C0 and is giveback-dominated (D3 unbanked-giveback share ≥ ½ of its conventional DD).
- **H3 (C21 non-inferiority)**: the 2022–2023 interval DD (reset at the 2021-12-31 close) of EXP's P0 primary ≤ that of
  CTRL's P0 primary + **$5,000**; reported with the interval's principal loss and banked DD. Not computable without both
  primaries.

**Outcome label (§15):** experimental improvement · approximately equivalent · worse · inconclusive. A pilot result is
never a deployment decision, never nominates a New L0 replacement and never changes the standard.

## 2. Risk metrics, denominators and the one interpretation

| Measure | Value (dollars, unrounded record values) | Denominator | CTRL `nl0-control@1.0.0` | EXP `re-40-25-25@1.0.0` |
|---|---|---|---|---|
| Marked conventional maximum DD | record `dd`: the strict tracker of the marked net, every regular-session minute close while held and every session close, from the door's first session | **C0 = $100,000** (never peak equity) | ≤ 35 % → $35,000 | ≤ 40 % → $40,000 |
| Max funded-trade principal loss | `principalLossLiquidation` = max over funded lots of max(0, −min λ_i), λ = marked lot P&L − the open shares' exit cost | the lot's funded entry principal (= C0 in the one fixed slot) | delivered, reported, never read by a decision | ≤ 25 % → $25,000 (liquidation basis) |
| Max banked-capital DD | `bankedDdLiquidation` = max_t [H(t) − M^L(t)], H = max(0, best realized net so far) | C0 | delivered, reported | ≤ 25 % → $25,000 (liquidation basis) |

- Limits are `(denominator × pct) / 100` (`policy.ts limitOf`), exact in binary64; **a value equal to its limit passes**;
  decisions compare dollars on unrounded values; ratios are reported, never compared. The marked twins of the two new
  metrics are always reported (D-3). These are **optimizer eligibility constraints on historical paths — never stops or
  exits**; trading behaviour is unchanged.
- **Not a relaxation:** EXP admits marked DD in ($35k, $40k] when both 25 % gates pass, and rejects proposals the control
  accepts when a 25 % gate fails. Every comparison reports both directions: both pass / CTRL-only / EXP-only / neither,
  with the failing metric.
- The envelope is requested (`EvalLab` item `risk: true`, archive key `…|risk`) on **every** official evaluation of both
  arms; CTRL's decisions never read the two new metrics (they are validated by `checkEnvelope` like every delivered
  value).

## 3. Arms, controls and benchmarks

| Key | Definition | Role |
|---|---|---|
| **CTRL** | NL0 / Assignment 3's broad lanes of the two cells under `nl0-control` | control arm; must reproduce Assignment 3's sealed lanes exactly (E2) |
| **EXP** | the same lanes, seeds, schedules under `re-40-25-25` | experimental arm |
| New L0 | Assignment 3's control configuration (cell GA0.VA0, 5B's frozen vectors; id `a2e385640ca61012`) | descriptive benchmark at C21 and C24 (qualified with both arms' gates; never selectable, never injected: D-7) |
| N/original | Assignment 3's N/original primary `C24/informed/GD.VB/R2#1 profit` (`rc1-f1a8b57cb02455c3`, cell GD1.VB0; Assignment 3 `FROZEN_SELECTION.json` sha256 `4080d4b1…`) | descriptive benchmark, likewise (informed: chosen with 2016–2024 in view) |

## 4. Strategy scope and fixed assumptions (unchanged from Assignment 3)

D1·VGT + D1·GDX + Growth·VGT jointly evaluated through ONE $100,000 shared-funded slot; Growth·GDX OFF; shadow
delayed-entry eligibility OFF; calendar-day maximum holds; Priority 3's pool (a decision funded only at its own instant
when nothing is open or reserved; same-instant order D1 first, GDX before VGT; no compounding or preemption); RC 1/RC 2
optional D1 controls as genes; Growth 1.4.0's complete genome; 5 bps per side inside the fill prices; 11 % simple interest
by calendar day; stops at the stop or the gapped open; fractional shares; harmonized D1 arming from 2016-01-04. The
92-gene genome, boxes, grids, identities and the neighbourhood instrument are Assignment 3's (its PROTOCOL §6, §9). No
new objective, phenotype family, exit, trade priority or Growth restriction (D-9: bounded / open-ended Growth labelled
only).

## 5. Lanes, seeds and the search code

- **Cells (D-1):** `GA0.VA0` (the legacy cell: New L0's D1 mechanics) and `GB0.VD1` = argmin over the 63 non-legacy
  cells of sha256(`"vg-l0-risk-envelope-pilot/cell/"` + id) (`0260e9f0…`; outcome-independent; verified in
  `tests/static.test.ts`). Never substituted after results.
- **Lanes:** per (cutoff, arm) 2 cells × R1, R2 = 4; 16 search lanes. Lane key = seed key = Assignment 3's
  `<cutoff>/broad/<cell>/R<r>` in Assignment 3's seed namespace (`deriveSeed('vg-l0-full-joint', …)`): **the arm never
  enters a seed**, so both arms see identical screens, GA streams and neighbourhood draws.
- **Schedule:** Assignment 3's broad lane = NL0's V-cell schedule, unchanged (`src/vg-l0-full-joint/budgets.ts`
  `budgets.study.broad`): screen 512 → promote 64; rung 1 16; 2 base NSGA-II islands × 256 new proposals (population 32;
  extension up to 6 islands on NL0's 5 % triggers or a new feasible behaviour class; stagnation 8 generations at 1e-3;
  ≤ 200 generations); rung 2 12 × 64 (L∞ ≥ 0.02); rung 3 6 × 128 (L∞ ≥ 0.03); one refinement pass from the robust and
  profit starts ($2,000 rule); shortlist 3 (L∞ ≥ 0.10, one per ledger); per-lane cap 41,000 (its worst case 40,642).
- **The pilot lane** (`src/vg-l0-risk-envelope-pilot/search.ts`) is **generated** from Assignment 3's frozen
  `search.ts` by the declared substitutions of `derive.ts` (`tests/static.test.ts` requires byte equality with a fresh
  derivation): imports, the arm and the deterministic lane bound, `risk: true` on every request, the arm's plausibility,
  screen violation and reason, rung-fit violation and the hypervolume reference point; fail-closed bound checks; log and
  checkpoint names. Nothing else differs.

## 6. Where the envelope acts (every stage; never a final-ranking adjustment)

| # | Stage | CTRL (= Assignment 3) | EXP |
|---|---|---|---|
| 1 | Screen (Sobol/Latin, strata) | identical proposals | identical proposals |
| 2 | Plausibility | !error ∧ net > 0 ∧ DD ≤ 35 % C0 ∧ both families funded | !error ∧ net > 0 ∧ `assess(centre, EXP).pass` ∧ both families funded |
| 3 | Screen promotion (¼ net among plausible, ¼ constrained rank on (−net, DD), ⅛ Growth entry, ⅛ control pattern, diversity) | violation: net + max(0, DD − 35k)/35k + structure | violation: net + Σ the centre's gated excesses (DD vs 40k, PL vs 25k, BD vs 25k) + structure |
| 4 | Rung-1 fits (centre-first), NSGA-II islands | feasibility: violation {net, dd, p90 (Priority 3's p90 DD), structure} = 0 | violation {net, dd, pl, bd, p90, p90pl, p90bd, structure} = 0 with the UNROUNDED neighbourhood p90 of each metric (D-4) |
| 5 | Hypervolume, stagnation, extension triggers | reference (0, $35,000) | reference (0, $40,000); triggers unchanged |
| 6 | Rungs 2–3 promotion | feasibility as 4 | as 4 |
| 7 | Refinement acceptance (one pass; $2,000) | violation 0 under CTRL | violation 0 under EXP |
| 8 | Shortlist (feasible; one per ledger) | CTRL-feasible | EXP-feasible |
| 9 | Qualification Q1–Q6 | §9 CTRL | §9 EXP |
| 10 | Selection eligibility | CTRL-qualified | EXP-qualified |

Retained mechanics (both arms, D-6): objectives (−centre net, −robust net, p90 marked DD); operators and parameters;
the unmeasured penalty 1 of a centre without neighbours (one part, whatever the arm); the violation total rounded to
1e-6 (NL0's mechanics: a total excess below 5e-7 of a limit — $0.0175 at $35k, $0.02 at $40k, $0.0125 at $25k — rounds
to 0 in the search's feasibility; plausibility and qualification compare exactly). The absence of a fixed 35k rule in
every pilot module is verified statically and by stage-wiring tests (E4).

## 7. Budget and accounting

**Deterministic upper bound** (`budget.ts bound()`, computed from the frozen schedules; `npm run vg-l0rep -- bound`):

| Component | Bound |
|---|---:|
| Search: 16 lanes × the per-lane cap 41,000 (worst case 40,642) | 656,000 |
| Qualification: 2 cutoffs × ≤ 26 members (≤ 3 per lane × 8 lanes + 2 benchmarks; a member shortlisted twice is evaluated once) × 653 | 33,956 |
| Next intervals: 2 cutoffs × ≤ 7 subjects (≤ 5 distinct primaries + 2 benchmarks) × 264 | 3,696 |
| **Total requested pilot research evaluations** | **693,652 ≤ 700,000** |

- The ceiling applies to **requested** evaluations (every evaluation a stage asks for, archive hits included). Each record
  reports requested, fresh and archive hits per arm, lane, rung tag, cutoff and stage. Engineering verification (E2 reads
  records only; E3's mini-pilot on D19 and edge subjects) and the nonbinding CPU diagnostics are counted separately and
  are not pilot research evaluations.
- Expected: CTRL 71,314 (C21) + 62,488 (C24) (Assignment 3's sealed lanes); EXP unknown; total ≈ 0.27–0.38 M expected.
  A realized total below 300k is acceptable. No evaluation is added to reach a quota; no stage is shortened or moved to
  an uncounted category; both arms face identical schedules and caps. A lane request beyond 41,000, a move set beyond 230
  or a stage beyond its bound fails closed. **No 450k stop rule** (D-2).

## 8. Candidate retention and diversity

NL0's / Assignment 3's rules unchanged in both arms: one configuration per funded-lot ledger in promotions and
shortlists, the L∞ thresholds, the promotion shares and diversity fill, the protected strata (activation, K, Growth
structure). No extra reserve for low-principal-loss / high-giveback proposals (D-5).

## 9. Qualification (per cutoff; both arms on identical draws)

The union of both arms' shortlists + the two benchmarks is qualified ONCE per cutoff with Assignment 3's instrument
(detailed centre, centre, six stresses, five causal removals, selection 2 × 128, confirmation 3 × 128; labels
('select' | 'confirm', rep, cutoff); every evaluation with the envelope), then assessed under each arm:

| Gate | CTRL (Assignment 3 exactly) | EXP |
|---|---|---|
| Q1 | centre net > 0 | same |
| Q2 | centre marked DD ≤ 35 % C0 | `assess(centre, EXP).pass` |
| Q3 | confirmation p90 DD (Priority 3's) ≤ 35 % C0 | unrounded confirmation p90 of marked DD ≤ 40 %, PL (liq.) ≤ 25 %, BD (liq.) ≤ 25 % (D-4) |
| Q4 | confirmation p10 net > 0 | unrounded confirmation p10 net > 0 |
| Q5 | at 10 bps: net > 0 ∧ DD ≤ 35 % C0 | at 10 bps: net > 0 ∧ the full EXP envelope (D-10) |
| Q6 | a D1 book and Growth·VGT funded at the centre | same |

Report-only for every member under both policies: 0/20 bps, 14 % interest, +25 bps stop slippage, next-open stops,
causal removals, envelope p90/p95/worst/worst-10 % mean of the three metrics (both bases) in the selection and
confirmation families, breach counts against 35 %/40 % (DD) and 25 % (PL, BD) with Wilson intervals, the other arm's
verdict and reasons.

## 10. Selection (per cutoff and arm, identical populations)

- **Population of an arm** = the members its own four lanes shortlisted, with the arm's verdict. New L0 and N/original
  are never in a population.
- **P0** = NL0's original rule (actual-profit role); **RA1-original** = Assignment 2's RA1 unchanged (S4 ≤ 35 % of C0);
  **RA1-adapted** (EXP only) = RA1 with only S4's ceiling = 40 % of C0. Original and adapted rank the same EXP
  population; the record states whether they pick the same phenotype. NL0's roles and the Pareto set are reported.
- The selection record (sealed) stores primaries, the top 10 per selector with every input and failed screen, roles,
  counts by cell and the distinct primaries' evidence. It is **committed before the next door opens**.

## 11. Chronology, doors and intervals

- **Training doors:** C21 → D21 (2016-01-04 … 2021-12-31); C24 → D24 (… 2024-12-31): Priority 3's verified byte-prefix
  doors. **Next intervals:** C21 → 2022-01-03 … 2023-12-29 through D23, after the sealed and committed C21 selection; C24
  → 2025-01-02 … 2026-10-30 (the common complete endpoint of the pinned canonical files) through FULL, opened by the
  official validation job **once**, after the sealed and committed C24 selection, `FROZEN_SELECTION.json` and the FULL
  door authorization. Afterwards only nonbinding CPU diagnostics of the same frozen subjects may read FULL (logged).
- **Evaluation of an interval** (per distinct primary of every arm and selector, de-duplicated with attribution, and per
  benchmark): one continuous run from 2016-01-04 with the cutoff close as the boundary (state and marks preserved);
  interval P&L = the marked-net change from the boundary close; interval DD = the strict tracker restarted there; the
  whole-run figures and whole-run envelope beside it; the six stresses on the same basis; the training selection family
  (2 × 128, regenerated exactly) replayed on the interval (breach counts vs 35 % and 40 % of C0 with Wilson intervals,
  median / p90 / worst interval DD). Window versions of principal loss and banked DD are CPU diagnostics (§14).
- **Labels:** "retrospective, previously inspected history (2022, 2025–2026 examined by many studies; the experimental
  envelope itself was motivated by archives of C21–C24)" — never a pristine holdout or independent future validation.
- **No validation feedback:** nothing observed on an interval changes a cell, seed, gate, budget, selector or selection.
- **Consequence (§1.8):** no fold path exists; every pilot selection is "no chronological support: not a
  deployment-qualified candidate without an explicit user decision".

## 12. Stage order, jobs and guards (exact commands: `EXECUTION_PLAN.md`)

1. Engineering gates E1, E3–E6 sealed and committed; protocol freeze sealed and committed; pushed.
2. `search --cutoff C21 --arm CTRL` (job `C21-search`, D21) → `search --cutoff C24 --arm CTRL` (job `C24-search`, D24)
   → `e2` (CTRL = Assignment 3; sealed; committed). **No EXP evaluation before E2 passes.**
3. `search --cutoff C21 --arm EXP` (resumes `C21-search`) → `search --cutoff C24 --arm EXP` → commit.
4. `qualify --cutoff C21` → `qualify --cutoff C24` → `e2-qualification` (CTRL evidence = Assignment 3's) → commit.
5. `select --cutoff C21` → commit → `interval --cutoff C21` (D23) → commit.
6. `select --cutoff C24` → commit → `freeze-selection` → commit → `authorize-full` → commit → `validate` (FULL once) →
   commit.
7. CPU diagnostics (§14) → report → ZIP.

Every official stage: the study preflight, the sealed committed freeze with the frozen code digest and acceptance sha256,
the sealed committed engineering gates, no uncommitted change to the code closure or the protocol documents, the budget
bound; its own `openJob` job → `openOfficialGpuSession` (attestation) → `GpuPool` (receipts, conservation, CPU-scored = 0)
→ `EvalLab` (archive bound to study, job, door, door pin, code digest, backend). A sealed stage refuses to rerun; an
interrupted job resumes with the identical definition (`--resume`; the gate runs again).

## 13. Engineering gates (all before any official EXP evaluation; a failure stops every dependent stage)

| Gate | Requirement | Evidence |
|---|---|---|
| E1 | live Phase 7 ACCEPTED record; independent verifier with rebuild, device and out-of-band pin on the pilot branch; `node --no-maglev` enforced; official GPU only | `results/engineering/E1/` |
| E2 | every CTRL lane (both cutoffs, both cells, both seeds; official GPU, envelope requested) = the sealed Assignment 3 lane result with envelopes stripped (screen/promotion counts, islands, trigger logs, rung fits, refinement paths, shortlists, frontiers, failure reasons); then every CTRL member's qualification evidence = Assignment 3's sealed evidence | `results/engineering/E2-*.json` |
| E3 | fixed-seed mini-pilot of both arms on D19 (non-official): GPU = CPU in lane results, qualification evidence, selections and every archived record and envelope; the pilot CTRL lane = Assignment 3's lane; threshold-edge subjects on D21/D24: records, envelopes, every decision and the constrained rankings GPU = CPU; graceful stop + resume and SIGKILL + resume = uninterrupted; the archive refuses another backend or code digest | `results/engineering/E3/` |
| E4 | stage-wiring tests (DD $38k flips CTRL fail → EXP pass with PL/BD ≤ $25k; PL $26k or BD $26k flip CTRL pass → EXP fail), exact boundaries, Q3 and Q5 on all three metrics, CTRL = the frozen fitness bit for bit (20,000 records), RA1-adapted ≡ RA1 at 35 %, static no-hidden-35k, derived-lane equality | `results/engineering/E4/tests.txt` |
| E5 | `npm run research-preflight -- --study research/vg-l0-risk-envelope-pilot` PASS (3.0.0, gpu-required, NL0 pinned, departures with agreement) | `results/engineering/E5/` |
| E6 | the live official gate opens on D21 and D24 for this study on the committed lineage (attestations); D23/FULL sequencing verified by the door guards when used | `results/engineering/E6/` |

A change to the evaluation dependency closure would make the acceptance stale; this pilot adds no such file (its code
is outside the evaluation manifest and the enforcement group). Strategy Lab and every frozen record stay unchanged.

## 14. Nonbinding diagnostics (after the searches; CPU, purpose `diagnostic`; never a search, gate, ranking or exit input)

Per `DIAGNOSTICS_SPEC.md` (sha256 `c722bc11…`) and `SCALING_CHECKS.md` (`55677725…`), on the recorded populations of
both arms (every distinct rung-2 / rung-3 / refinement-endpoint / shortlisted centre, the qualified members, the top-net
and visible-infeasible centres of each lane, the frozen primaries and benchmarks): **D1** peak-equity percentage DD
(illustrative 40 % comparator), **D2** capped hybrid min(60 % C0, max(40 % C0, 30 % Epeak)) utilization and regime,
**D3** the account interval partition (unbanked giveback / banked erosion / below C0) and the lot-level attribution, an
illustrative nonbinding 25 %/25 % view; DD^L (liquidation-basis conventional DD); marked and liquidation bases. For the
frozen primaries and benchmarks: interval-window principal loss and banked DD; the carried lot's give-back; $100k /
$250k / $500k proportional replays; gap-through-stop (−10/−20/−30 % opens) and D1 maximum-hold-window tail stresses;
capital occupancy and traded notional; illustrative account-level margin examples (`src/vg-l0-risk-metrics/margin.ts`),
separate from every pilot gate. No coefficient is an approved threshold; a promising diagnostic leads only to a
recommendation of a separately authorized study.

## 15. Analysis and the outcome label (precommitted)

The report distinguishes more profitable phenotypes from more permissive qualification: search coverage per arm, cutoff,
cell, replicate, stage and Growth boundedness (bounded = Growth maximum hold or initial stop ON; open-ended otherwise);
per-metric rejection rates; the policy disagreement (both / CTRL-only / EXP-only / neither, with reasons, including "DD
in ($35k, $40k] with PL/BD passing" and "DD ≤ $35k but PL/BD failing") at the screen, the rung fits, the shortlists and
qualification; candidate quality; P0 / RA1-original / RA1-adapted on identical populations; the intervals; D1–D3;
scaling; uncertainty (one pair of seeds per cell, two cells, previously inspected history, budget-bound lanes).

With Δ21, Δ24 (§1) and H3:
- **experimental improvement** — (Δ21 > $2,500 or Δ24 > $2,500), neither Δ < −$2,500, and H3 holds;
- **approximately equivalent** — |Δ21| ≤ $2,500 and |Δ24| ≤ $2,500;
- **worse** — (Δ21 < −$2,500 or Δ24 < −$2,500) and neither Δ > $2,500; or H3 fails while neither Δ > $2,500;
- **inconclusive** — anything else (one cutoff better and the other worse; H1/H1′ with H3 failing; a missing primary; an
  incomplete stage).

The RA1 selectors and the C24 validation are reported beside it with the same $2,500 / $5,000 margins (descriptive). If
EXP appears better the report proposes whether a larger, separately authorized N/original-scale successor search is
worthwhile; otherwise it recommends keeping the original method. Even strong retrospective results authorize nothing.

## 16. Resources and recoverability

Every official stage is a transient systemd user unit in `vgl0rep.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0;
`tools/vg-l0-risk-envelope-pilot/launch.sh`), sequential (one GPU job at a time); 8 host workers, batch 8,192, linger 30
ms; Phase 7 measured ≈ 4.8 GB VRAM and 3.3–4.2 GB RSS per job (estimates). Archives persist every evaluation as it returns;
progress checkpoints; resume = the same command with `--resume`; no automatic restart. GPU, host memory, disk growth and
stage timing are recorded. Assignment 3's `.sqlite.zst` populations are not needed (the comparisons read sealed JSON).

## 17. No-go rules

Any engineering gate fails; any CPU-scored official evaluation; a stale acceptance; a requested-evaluation bound beyond
700,000; a door opened out of order; any change after the freeze without an amendment; a loosened criterion after an
outcome. A blocked stage stops with a verified partial report; nothing is bypassed.

## 18. Reporting and handoff

`REPORT.md` (written analysis and Markdown tables only; no visuals, standard §7.7), machine-readable summaries, the
checkpoint `RESEARCH_RECOVERY.md`, and a single checksum-verified ZIP `vg-l0-risk-envelope-pilot-results.zip` with
`READ_FIRST.md` and a SHA-256 manifest (excluding minute data, `.sqlite.zst` populations and large caches, which are
named with paths and hashes).
