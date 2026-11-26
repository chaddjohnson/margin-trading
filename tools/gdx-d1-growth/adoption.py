#!/usr/bin/env python3
"""Writes research/gdx-d1-growth/STANDARD_ADOPTION.json from the protocol (its sha256 at writing time) — run after the
protocol text is final and before the freeze; the preflight checks the hashes.
  python3 -I tools/gdx-d1-growth/adoption.py --repo <repo> --adopted <UTC>
"""
import hashlib, json, os, sys
a = sys.argv[1:]
opt = lambda k: a[a.index(k) + 1]
os.chdir(opt('--repo'))
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
S = 'research/gdx-d1-growth'
pilot = json.load(open(f'{S}/results/engineering/pilot.json'))
rs = pilot['sequentialReplicates']['byF']['3']
deviations = [
  ("AD1", "§4.1, §4.3, §4.8", "The GDX space: P6-TSLA's space unchanged (Assignment 3's genome semantics on one trading slot: the accepted engine's VGT-named slot carries GDX; the second slot's books disabled; no evaluation file changed); arms D (8 D1 cells), G (6 Growth exit-protection cells), J (48), S (frozen D1 x 6), C (fixed pairs). S1 absent; shadow eligibility OFF; calendar-day holds.", "Brief Phase 1.2, Phase 3."),
  ("AD2", "§4.2, §4.5, §4.8", f"Effort by replicates of NL0's unchanged per-lane schedules: P6-TSLA's executed allocation x 1.5 in every stage (base D 6, G 12, J 6, S R_S(F) = max(6, ceil(240 / (6F))) = {rs} for F = 3; 6 refinement lanes per refined cell), Priority 5's two-tier island rule and convergence-driven replicate rounds (<= 4, 2 %).", "Brief Phase 2/4 (generous GPU effort, convergence-driven extensions); standard §4.8 proportional scaling."),
  ("AD3", "§1.8", "Priority 5's exact sequential drawdown statistic from GPU marks; one procedure per arm.", "The accepted GPU path returns no minute mark series; a CPU-scored official statistic is forbidden (§9.2)."),
  ("AD4", "§2.3, §2.5", "NL0's original rule is THE selector; RA1 computed on the identical populations as a separately labelled report-only experimental selector (never selects).", "Brief Phase 2 (the established algorithms faithfully; the fitness never adapted)."),
  ("AD5", "§3.4", "Method comparison: C (separately optimized, pooled), J (joint), S (D1-first sequential), with D and G standalone; matched rules; effort matched by the frozen R_S rule (S + its D1 step >= J) and disclosed per arm.", "Brief Phase 3."),
  ("AD6", "§5.3", "Assignment 3's instrument on the trading slot in this study's seed namespace, common random numbers across centres and arms; arm S's design neighbourhoods never move the frozen D1.", "Brief Phase 3 item 6."),
  ("AD7", "§5.1", "Priority 5's eight stresses (cost 0/2/10/20 bps, 14 % interest, stop slippage +10/+25 bps, next-open stops).", "Brief Phase 6 item 4."),
  ("AD8", "§1.8, §2.5", "Precommitted determination: finalists with immutable (population, id) identities and labels sealed before FULL; the outcome joins validation records by (population, id) via src/research-outcome/identityJoin.ts and fails closed; architecture comparisons with Priority 5's bands and replication; 'no qualifying GDX candidate' valid.", "Brief Phase 0 item 4, Phase 7."),
  ("AD9", "§5.9", "D1 hold-window tail stress on pre-2016 GDX daily data (2006-05-22 -> 2015-12-31, Yahoo; disjoint) plus in-sample.", "Standard §5.9's preferred disjoint reference history."),
  ("AD10", "§0.3, §1.3", "The common complete endpoint is 2026-10-30 (the program's horizon; GDX, VOOG, VGT complete on it).", "Brief Phase 1.1."),
  ("AD11", "§3.1-§3.3, §4.4, §1.9", "GDX incumbents (N/original's, New L0's, VG #2's GDX D1 books; 4A's GDX Growth export set) are exact controls at every cutoff; a separately labelled incumbent-informed lane at C24 for arms D and G; informed populations D+, G+, C+ (incumbents are members, standard §3.2) with no independent chronological test.", "Brief Phase 3 item 3."),
  ("AD12", "§2.7, §4.7", "Combined arms require both GDX books funded (Q6); protected and unrestricted Growth structures protected by cells and reported as sub-populations.", "Brief Phase 3 items 1-2."),
  ("AD13", "§5.6", "GDX has no split in the window: the central split ledger applies (no GDX event; one there fails the doors closed); the price-only convention of every strategy is unchanged and its effect reported in the portfolio stage.", "Brief Phase 1.1."),
  ("AD14", "§0.2 [R], §7.7", "The matched total-portfolio comparison (PROTOCOL §15) is a precommitted report-only stage after the outcome, on frozen subjects; it never selects.", "Brief Phase 5, Phase 6 item 7."),
]
out = {
  "kind": "optimization-standard-adoption",
  "schema": 1,
  "study": S,
  "scope": "optimization",
  "standard": {"path": "docs/research/OPTIMIZATION_STANDARD.md", "version": "3.0.0", "sha256": sha("docs/research/OPTIMIZATION_STANDARD.md")},
  "readAt": "2026-11-26T14:57:00Z",
  "adoptedAt": opt('--adopted'),
  "protocol": {"path": f"{S}/PROTOCOL.md", "sha256": sha(f"{S}/PROTOCOL.md")},
  "dateSplit": {"development": {"from": "2016-01-04", "to": "2024-12-31"}, "validation": {"from": "2025-01-01", "to": "2026-10-30"}, "commonCompleteEndpoint": "2026-10-30"},
  "objective": {
    "prioritizes": "actual-profit",
    "primaryRule": "NL0 1.0.0 §3.5 original rule: the actual-profit role among the Q1-Q6 qualified members (highest centre net; ties: higher selection robust net, lower centre DD, label), per independent arm population (D, G, C, J, S) at every cutoff and per informed population (D+, G+, C+) at C24; RA1 report-only. The determination (PROTOCOL.md §12) is a separate precommitted governance label.",
    "roles": ["actual-profit", "robust-profit", "balanced", "lower-drawdown"]
  },
  "risk": {"maximumMinuteDrawdown": 35000, "principalBudget": 100000, "denominator": "one fixed $100,000 initial trading allocation (not peak account equity); P0 = 35 % of it; trade principal loss, banked-capital DD and giveback are report-only"},
  "budget": {
    "distinctProposals": 4 * (48 + 72 + 288 + 18 * rs) * 1024,
    "backendEvaluations": 160000000,
    "notes": f"Distinct candidate proposals: the configured base broad lanes x (512 screen + 2 x 256 island) per cutoff — D 48, G 72, J 288, S 18 x {rs} lanes (F = 3) — over 4 cutoffs, before refinement and informed designs, extension islands and replicate rounds (PROTOCOL.md §7.7). Backend evaluations: the hard ceiling of 160,000,000 requested official evaluations (archive hits included; fresh and hits reported separately; ledger over the sealed stage records); deterministic per-lane bounds of budget.ts laneCaps, 650/652 per qualified member, 306 per slice subject."
  },
  "referenceMethod": {"id": "NL0", "path": "docs/research/methods/NEW_L0_METHOD.md", "version": "1.0.0", "sha256": sha("docs/research/methods/NEW_L0_METHOD.md")},
  "evaluationBackend": {"policy": "gpu-required", "purpose": "official-optimization", "acceptance": "config/gpu-backend/acceptance.json",
    "notes": "Every official evaluation (searches, replicate rounds, informed lanes, qualification, fold slices, validation) runs only through openOfficialGpuSession -> GpuPool -> EvalLab on the accepted GPU Phase 7 evaluator (record sha256 bb0e3fcf..., binary gb7 cb2ff30b..., RTX 5090 GPU-ae5f222c...), node --no-maglev, one held job per stage; no CPU fallback. Engineering gates, data tools, the pilot, report-only diagnostics and the total-portfolio stage are non-official (parity-test / benchmark / diagnostic)."},
  "chronologicalConsequence": "Standard 3.0.0 §1.8 default, adopted: a failed or uncomputable independent verdict of an arm's procedure — and every informed selection (no independent chronological test) — means 'no chronological support: the selection is not a deployment-qualified candidate without an explicit user decision'. Governance only. 'No qualifying GDX candidate' is a valid outcome.",
  "deviations": [{"id": i, "section": s, "kind": "adaptation", "description": d, "justification": j, "userAgreement": None} for i, s, d, j in deviations]
}
json.dump(out, open(f'{S}/STANDARD_ADOPTION.json', 'w'), indent=1, ensure_ascii=False)
open(f'{S}/STANDARD_ADOPTION.json', 'a').write('\n')
print(out['protocol']['sha256'], out['budget']['distinctProposals'])
