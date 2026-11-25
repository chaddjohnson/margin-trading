#!/usr/bin/env python3
"""Writes research/tsla-d1-growth/STANDARD_ADOPTION.json from the protocol (its sha256 at writing time) — run after the
protocol text is final and before the freeze; the preflight checks the hashes.
  python3 -I tools/tsla-d1-growth/adoption.py --repo <repo> --adopted <UTC>
"""
import hashlib, json, os, sys
a = sys.argv[1:]
opt = lambda k: a[a.index(k) + 1]
os.chdir(opt('--repo'))
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
S = 'research/tsla-d1-growth'
pilot = json.load(open(f'{S}/results/engineering/pilot.json'))
rs = pilot['sequentialReplicates']['byF']['3']
deviations = [
  ("AD1", "§4.1, §4.3, §4.8", "The TSLA space: Assignment 3's genome semantics on the one trading slot (the accepted engine's VGT slot carries TSLA; GDX books disabled; no evaluation file changed); arms D (8 D1 cells), G (6 Growth exit-protection cells), J (48), S (frozen D1 × 6), C (fixed pairs). S1 absent; shadow eligibility OFF; calendar-day holds.", "Brief §1, §3, §6."),
  ("AD2", "§4.2, §4.5, §4.8", f"Effort by replicates of NL0's unchanged per-lane schedules (D 4, G 8, J 4, S R_S(F) = max(4, ceil(160 / (6F))) = {rs} for F = 3 base replicates; 4 refinement lanes per refined cell) with Priority 5's two-tier island rule and convergence-driven replicate rounds (<= 4, 2 %).", "Brief §4 (substantial, fair, convergence-driven effort); NL0 §7.4 scaling; Priority 5 AD2/AD3."),
  ("AD3", "§1.8", "Priority 5's exact sequential drawdown statistic from GPU marks; one procedure per arm.", "The accepted GPU path returns no minute mark series; a CPU-scored official statistic is forbidden (§9.2)."),
  ("AD4", "§2.3, §2.5", "NL0's original rule is THE selector; RA1 computed on the identical populations as a separately labelled report-only experimental selector (never selects).", "Brief §4.8."),
  ("AD5", "§3.4", "Method comparison: C (separately optimized, pooled), J (joint), S (D1-first sequential), with D and G standalone; matched rules; effort matched by the frozen R_S rule (S + its D1 step >= J) and disclosed per arm.", "Brief §1, §4.6, §6."),
  ("AD6", "§5.3", "Assignment 3's instrument on the TSLA slot in this study's seed namespace, common random numbers across centres and arms; arm S's design neighbourhoods never move the frozen D1.", "Brief §6 Stage E ('Do not let D1 drift')."),
  ("AD7", "§5.1", "Priority 5's eight stresses (cost 0/2/10/20 bps, 14 % interest, stop slippage +10/+25 bps, next-open stops).", "Brief §7 (robustness to costs and slippage)."),
  ("AD8", "§1.8, §2.5", "Precommitted determination: finalists, development and chronological labels sealed before FULL; architecture comparisons with Priority 5's bands ($10,000 / $5,000 / $2,500) and replication; 'no qualifying TSLA candidate' valid.", "Brief §4.11, §7."),
  ("AD9", "§5.9", "D1 hold-window tail stress on pre-2016 TSLA daily data (2010-06-29 -> 2015-12-31, Yahoo; disjoint) plus in-sample.", "Standard §5.9's preferred disjoint reference history."),
  ("AD10", "§0.3, §1.3", "The common complete endpoint is TSLA's 2026-10-30 (the program's); later sessions not downloaded.", "Brief §2."),
  ("AD11", "§3.1-§3.3, §4.4", "No TSLA incumbent: no informed lane; New L0's and N/original's VGT books are external controls only.", "Brief §3."),
  ("AD12", "§2.7, §4.7", "Combined arms require both TSLA books funded (Q6); protected and unrestricted Growth structures protected by cells and reported as sub-populations.", "Brief §3, §6 Stage B."),
  ("AD13", "§5.6", "TSLA's split ledger is the study's own file in the central schema, applied by the canonical function (the central splits.json is sha-pinned by frozen studies).", "Frozen studies' integrity guards; brief §2 ('use existing corporate-action adjustment pipelines')."),
]
out = {
  "kind": "optimization-standard-adoption",
  "schema": 1,
  "study": S,
  "scope": "optimization",
  "standard": {"path": "docs/research/OPTIMIZATION_STANDARD.md", "version": "3.0.0", "sha256": sha("docs/research/OPTIMIZATION_STANDARD.md")},
  "readAt": "2026-11-25T10:20:00Z",
  "adoptedAt": opt('--adopted'),
  "protocol": {"path": f"{S}/PROTOCOL.md", "sha256": sha(f"{S}/PROTOCOL.md")},
  "dateSplit": {"development": {"from": "2016-01-04", "to": "2024-12-31"}, "validation": {"from": "2025-01-01", "to": "2026-10-30"}, "commonCompleteEndpoint": "2026-10-30"},
  "objective": {
    "prioritizes": "actual-profit",
    "primaryRule": "NL0 1.0.0 §3.5 original rule: the actual-profit role among the Q1-Q6 qualified members (highest centre net; ties: higher selection robust net, lower centre DD, label), per arm population (D, G, C, J, S) at every cutoff; RA1 report-only. The determination (PROTOCOL.md §12) is a separate precommitted governance label.",
    "roles": ["actual-profit", "robust-profit", "balanced", "lower-drawdown"]
  },
  "risk": {"maximumMinuteDrawdown": 35000, "principalBudget": 100000, "denominator": "one fixed $100,000 initial trading allocation (not peak account equity); P0 = 35 % of it; trade principal loss, banked-capital DD and giveback are report-only"},
  "budget": {
    "distinctProposals": 4 * (32 + 48 + 192 + 18 * rs) * 1024,
    "backendEvaluations": 120000000,
    "notes": f"Distinct candidate proposals: the configured base broad lanes x (512 screen + 2 x 256 island) per cutoff — D 32, G 48, J 192, S 18 x {rs} lanes (F = 3) — over 4 cutoffs, before refinement designs, extension islands and replicate rounds (PROTOCOL.md §7.6). Backend evaluations: the hard ceiling of 120,000,000 requested official evaluations (archive hits included; fresh and hits reported separately; ledger over the sealed stage records); deterministic bounds 90,000 per broad lane, 179,000 per refinement lane, 650/652 per qualified member, 306 per slice subject."
  },
  "referenceMethod": {"id": "NL0", "path": "docs/research/methods/NEW_L0_METHOD.md", "version": "1.0.0", "sha256": sha("docs/research/methods/NEW_L0_METHOD.md")},
  "evaluationBackend": {"policy": "gpu-required", "purpose": "official-optimization", "acceptance": "config/gpu-backend/acceptance.json",
    "notes": "Every official evaluation (searches, replicate rounds, qualification, fold slices, validation) runs only through openOfficialGpuSession -> GpuPool -> EvalLab on the accepted GPU Phase 7 evaluator (record sha256 bb0e3fcf..., binary gb7 cb2ff30b..., RTX 5090 GPU-ae5f222c...), node --no-maglev, one held job per stage; no CPU fallback. Engineering gates, data tools, the pilot and report-only diagnostics are non-official (parity-test / benchmark / diagnostic)."},
  "chronologicalConsequence": "Standard 3.0.0 §1.8 default, adopted: a failed or uncomputable independent verdict of an arm's procedure means 'no chronological support: the selection is not a deployment-qualified candidate without an explicit user decision'. Governance only. 'No qualifying TSLA candidate' is a valid outcome.",
  "deviations": [{"id": i, "section": s, "kind": "adaptation", "description": d, "justification": j, "userAgreement": None} for i, s, d, j in deviations]
}
json.dump(out, open(f'{S}/STANDARD_ADOPTION.json', 'w'), indent=1, ensure_ascii=False)
open(f'{S}/STANDARD_ADOPTION.json', 'a').write('\n')
print(out['protocol']['sha256'], out['budget']['distinctProposals'])
