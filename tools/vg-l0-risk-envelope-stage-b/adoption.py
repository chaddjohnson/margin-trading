# Writes research/vg-l0-risk-envelope-stage-b/STANDARD_ADOPTION.json with the CURRENT protocol sha256 (run after the
# last protocol edit, before the preregistration commit). Read-only otherwise.
import hashlib, json, sys
R = '/home/chad/projects/margin-trading'
P = f'{R}/research/vg-l0-risk-envelope-stage-b'
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
read_at, adopted_at = sys.argv[1], sys.argv[2]
m = {
  "kind": "optimization-standard-adoption",
  "schema": 1,
  "study": "research/vg-l0-risk-envelope-stage-b",
  "scope": "optimization",
  "standard": {"path": "docs/research/OPTIMIZATION_STANDARD.md", "version": "3.0.0", "sha256": sha(f'{R}/docs/research/OPTIMIZATION_STANDARD.md')},
  "readAt": read_at,
  "adoptedAt": adopted_at,
  "protocol": {"path": "research/vg-l0-risk-envelope-stage-b/PROTOCOL.md", "sha256": sha(f'{P}/PROTOCOL.md')},
  "dateSplit": {
    "development": {"from": "2016-01-04", "to": "2024-12-31"},
    "validation": {"from": "2025-01-01", "to": "2026-10-30"},
    "commonCompleteEndpoint": "2026-10-30"
  },
  "objective": {
    "prioritizes": "actual-profit",
    "primaryRule": "Primary decision statistic (PROTOCOL.md §1): per (cutoff, cell, replicate R3-R18) pair, D = V(EXP-30 lane) - V(CTRL lane), V = the best qualified centre net among the lane's shortlisted members qualified under the lane's own arm (Q1-Q6), V = $0 for a lane with no qualified member; non-inferiority iff the lower one-sided 90% stratified paired-bootstrap bound of mean D > -$5,000 at both C21 and C24; superiority iff mean D > +$2,500 and that bound > 0 at both. Pooled selectors per (cutoff, arm) on the arm's own qualified population: P0 = NL0 1.0.0's original rule, the actual-profit role (highest centre net; ties selection robust, lower centre DD, label); RA1-original = Assignment 2's RA1 unchanged (S4 35% of C0); RA1-adapted (EXP-30 only, S4 40% of C0) descriptive. No selector launches an evaluation.",
    "roles": ["actual-profit", "robust-profit", "balanced", "lower-drawdown"]
  },
  "risk": {
    "maximumMinuteDrawdown": 35000,
    "principalBudget": 100000,
    "denominator": "one fixed $100,000 principal budget (C0, not peak account equity); the CTRL arm keeps the $35,000 rule exactly; the EXP-30 arm's envelope P3 (marked DD <= 40% of C0, trade principal loss <= 25% of the funded entry principal, banked-capital DD <= 30% of C0, liquidation basis) is departure BD1"
  },
  "budget": {
    "distinctProposals": 393216,
    "backendEvaluations": 8800278,
    "notes": "Distinct candidate proposals (centres; refinement moves apart): 192 research lanes x (512 screen + 2-6 islands x 256) = 196,608 configured base / 393,216 maximum (+ 12 reproduction lanes, engineering). Backend evaluations: the deterministic hard bound of REQUESTED official evaluations derived from the frozen schedules (archive hits included): search 192 lanes x the per-lane cap 41,000 = 7,872,000; E2 reproduction 12 x 41,000 = 492,000; qualification 3 cutoffs x <= 194 members x 653 = 380,046; next intervals 3 x <= 71 subjects x 264 = 56,232; total 8,800,278. Expected about 3.7 M. Counted separately per job, arm, lane, rung tag, cutoff and stage: requested, fresh, archive hits; E3's non-official mini-pilot and edge subjects and the report-only CPU diagnostics are not research evaluations."
  },
  "referenceMethod": {"id": "NL0", "path": "docs/research/methods/NEW_L0_METHOD.md", "version": "1.0.0", "sha256": sha(f'{R}/docs/research/methods/NEW_L0_METHOD.md')},
  "evaluationBackend": {
    "policy": "gpu-required",
    "purpose": "official-optimization",
    "acceptance": "config/gpu-backend/acceptance.json",
    "notes": "Every official evaluation (E2 reproduction lanes, search, qualification, next intervals) runs only through openOfficialGpuSession -> GpuPool -> EvalLab on the accepted Phase 7 evaluator (record sha256 bb0e3fcf6bde45cc..., binary gb7 cb2ff30b..., RTX 5090 GPU-ae5f222c...), with the risk envelope requested on every evaluation; no CPU fallback, auto backend or hybrid. CPU runs only under non-official purposes: parity-test (engineering gate E3) and diagnostic (report-only replays of frozen selections)."
  },
  "chronologicalConsequence": "Standard 3.0.0 §1.8 default, adopted: Stage B runs three cutoffs (C19 secondary; C21, C24 primary) each with one next interval and no sequential fold path (departure BD2), so every selection is labelled 'no chronological support: not a deployment-qualified candidate without an explicit user decision'. The next intervals (C19 -> 2020-2021, C21 -> 2022-2023, C24 -> 2025-2026) are retrospective, previously inspected history, never a pristine holdout. 'No qualifying candidate' in a lane or an arm is a valid outcome (V = $0). Governance only: never a fitness term, ranking input or gate.",
  "deviations": [
    {"id": "BD1", "section": "§2.1, §2.3", "kind": "departure", "description": "The EXP-30 arm replaces the $35,000 marked-DD ceiling by P3 (marked DD <= 40% of C0, trade principal loss <= 25% of funded principal, banked-capital DD <= 30% of C0, liquidation basis) in every stage of its search, qualification and selection; the CTRL arm keeps the standard's rule exactly. The standard is not changed.", "justification": "the study's research question", "userAgreement": "brief/BRIEF.md §2 (two search arms: P0 nl0-control@1.0.0 and P3 sens-p3-40-25-30@1.0.0, applied at every feasibility, promotion, refinement, neighbourhood and qualification stage)"},
    {"id": "BD2", "section": "§1.8, §1.9", "kind": "departure", "description": "Three cutoffs (C19 secondary; C21, C24 primary) with one next interval each instead of the C19/C21/C23 repeat with a sequential verdict; consequence: no chronological support for any selection.", "justification": "the brief's matched design", "userAgreement": "brief/BRIEF.md §3 (C21 -> 2022-2023, C24 -> 2025-2026; precommitted secondary C19 -> 2020-2021)"},
    {"id": "BD3", "section": "§4.4, §3.2", "kind": "departure", "description": "No incumbent-informed lane; New L0 and N/original are descriptive frozen benchmarks, never seeds, never selectable or nominated.", "justification": "independent replicated lanes", "userAgreement": "brief/BRIEF.md §2 ('New L0 and N/original are descriptive frozen benchmarks, not seeds, finalists automatically eligible for nomination, or search targets')"},
    {"id": "BD4", "section": "§5.9, §0.2", "kind": "departure", "description": "RA1 (original, and the descriptive envelope-adapted version) ranks on §5.9-type training quantities (open-lot multiple and share, worst lot MAE, selection worst-10% mean DD, occupancy) - Assignment 3's AD5, kept.", "justification": "comparison selectors", "userAgreement": "brief/BRIEF.md §4.5 ('Report the NL0/P0 selector and original RA1 on identical candidates and qualification draws'); Assignment 3 brief §4"},
    {"id": "BA1", "section": "§4.3, §4.8", "kind": "adaptation", "description": "Reduced structural scope: 2 of Assignment 3's 64 cells (GA0.VA0 and the pilot's outcome-independent hash-selected GB0.VD1) x 16 new replicates R3-R18; effort scaled only by replicates; no claim of equal effort with Assignment 3 or NL0.", "justification": "brief §3", "userAgreement": None},
    {"id": "BA2", "section": "§5.3, §5.8", "kind": "adaptation", "description": "The EXP-30 arm's neighbourhood gates (rung feasibility, Q3, Q4) compare unrounded quantiles of all three metrics; CTRL keeps Priority 3's cent-rounded p90 DD (the frozen instrument).", "justification": "the pilot's D-4 / RD6, unchanged", "userAgreement": None},
    {"id": "BA3", "section": "§6.3", "kind": "adaptation", "description": "No new worker/batch tuning benchmark: the execution shape (8 host workers, batch 8,192, linger 30 ms) is the accepted evaluator's measured Mode S (GPU Phases 3/4/7); timings select nothing.", "justification": "docs/gpu/README.md §4-§4a; research/gpu-phase7/results/bench/benchmark.json", "userAgreement": None},
    {"id": "BA4", "section": "§4.5", "kind": "adaptation", "description": "Both arms' 64 lanes of a cutoff run concurrently in one official job; lane results do not depend on the grouping (lane-key seeds, lane-local extension decisions at barriers, deterministic records, a per-lane resource guard that cannot bind); E2 verifies reproduction of the sealed reference lanes.", "justification": "the brief's paired checkpoints; Phase 6 E6", "userAgreement": None}
  ]
}
json.dump(m, open(f'{P}/STANDARD_ADOPTION.json', 'w'), indent=1, ensure_ascii=False)
open(f'{P}/STANDARD_ADOPTION.json', 'a').write('\n')
print(m['protocol']['sha256'])
