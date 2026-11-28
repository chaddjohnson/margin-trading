#!/usr/bin/env python3
"""Writes research/msft-d1-growth/STANDARD_ADOPTION.json (standard 5.0.0) from the protocol (its sha256 at writing time) —
run after the protocol text is final and before the freeze; the preflight checks the hashes and the data pin.
  python3 -I tools/msft-d1-growth/adoption.py --repo <repo> --adopted <UTC>
"""
import hashlib, json, os, sys
a = sys.argv[1:]
opt = lambda k: a[a.index(k) + 1]
os.chdir(opt('--repo'))
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
S = 'research/msft-d1-growth'
pilot = json.load(open(f'{S}/results/engineering/pilot.json'))
rs = pilot['sequentialReplicates']['byF']['3']
BRIEF = 'research/msft-d1-growth/brief/BRIEF.md (sha256 562e12eb3ab85ae1013bcda139cc7329e42ad80508bc9b1957f38ae116e6aad5)'
deviations = [
  ("AD1", "§4.1, §4.3, §4.8", "adaptation", "The MSFT space: P6-TSLA's / P8-GDX's space unchanged (Assignment 3's genome semantics on the one trading slot; the accepted engine's VGT slot carries MSFT; the GDX-named slot's books disabled; no evaluation file changed); arms D (8 D1 cells), G (6 Growth exit-protection cells), J (48), S (frozen D1 x 6), C (fixed pairs). S1 absent; shadow eligibility OFF; calendar-day holds.", "Brief Phase 2 (five arms, existing allocator and semantics; S1 and shadow eligibility OFF).", None),
  ("AD2", "§4.2, §4.5, §4.8", "adaptation", f"Effort by replicates of NL0's unchanged per-lane schedules: P8-GDX's executed allocation x 4/3 in every stage and Growth's base replicates x 2 — base D 8, G 24, J 8, S R_S(F) = max(8, ceil(320 / (6F))) = {rs} for F = 3; 8 refinement lanes per refined cell — with Priority 5's two-tier island rule and convergence-driven replicate rounds (<= 4, 2 %).", "Brief Phase 3 items 2-5 and Phase 5 (substantial, fairly allocated effort, multiple seeds, do not starve Growth or the joint arm); P8-GDX's measured Growth seed dispersion 49-63 %; NL0 §7.4 scaling.", None),
  ("AD3", "§1.8", "adaptation", "Priority 5's exact sequential drawdown statistic from GPU marks; one procedure per arm.", "The accepted GPU path returns no minute mark series; a CPU-scored official statistic is forbidden (§9.2).", None),
  ("AD4", "§2.3, §2.5", "adaptation", "NL0's original rule is THE selector; RA1 computed on the identical populations as a separately labelled report-only experimental selector (never selects).", "Brief Phase 2 (the original NL0/P0 selector remains the official selector) and Phase 3 item 6.", None),
  ("AD5", "§3.4", "adaptation", "Method comparison: C (separately optimized, pooled), J (joint), S (D1-first sequential), with D and G standalone; matched rules; effort matched by the frozen R_S rule (S + its D1 step >= J) and disclosed per arm.", "Brief Mission item 4, Phase 2, Phase 3 item 2.", None),
  ("AD6", "§5.3", "adaptation", "Assignment 3's instrument on the MSFT slot in this study's seed namespace, common random numbers across centres and arms; arm S's design neighbourhoods never move the frozen D1.", "Brief Phase 2 arm S (D1 parameters must not move).", None),
  ("AD7", "§5.1", "adaptation", "Priority 5's eight stresses (cost 0/2/10/20 bps, 14 % interest, stop slippage +10/+25 bps, next-open stops).", "Brief Phase 3 item 9.", None),
  ("AD8", "§1.8, §2.5", "adaptation", "Precommitted determination: finalists, development, chronological and sufficiency labels sealed before FULL; architecture comparisons with Priority 5's bands ($10,000 / $5,000 / $2,500) and replication; the outcome joins validation records by (arm, id) and fails closed; 'no qualifying MSFT candidate' valid.", "Brief Phase 0 (outcome identity), Phase 3 item 10, Phase 5F.", None),
  ("AD9", "§5.9", "adaptation", "D1 hold-window tail stress on pre-2016 MSFT daily data (1986-03-13 -> 2015-12-31, Yahoo split-adjusted closes; disjoint) plus in-sample.", "Standard §5.9's preferred disjoint reference history.", None),
  ("AD10", "§0.3, §1.3", "adaptation", "The common complete endpoint is 2026-10-30 (R1's validation end; the program's); no later MSFT row was downloaded.", "Brief Phase 1 item 2.", None),
  ("AD11", "§3.1-§3.3, §4.4", "adaptation", "No MSFT incumbent: no informed lane or population; New L0's and N/original's VGT books are external controls only (never seeds, members or finalists); NL0's informed-lane budget reassigned to the stage-2 refinement.", "Brief Phase 0 (independent MSFT search, references isolated and labelled).", None),
  ("AD12", "§2.7, §4.7", "adaptation", "Combined arms require both MSFT books funded (Q6); protected and unrestricted Growth structures protected by cells and reported as sub-populations.", "Brief Phase 2 (protected and unrestricted alternatives fairly represented) and Phase 5B.", None),
  ("AD13", "§5.6", "adaptation", "MSFT has no split in the window: the doors apply the central split ledger (no MSFT event; an event fails closed). Price-only convention unchanged; dividends reported, never credited.", "Brief Phase 1 items 4 and 8.", None),
  ("AD14", "§0.2", "adaptation", "Buy-and-hold comparators (financed/unfinanced; price-only/with dividends) and per-lot dividend entitlement are report-only, after the outcome.", "Brief Phase 2 'Research comparators', Phase 6.", None),
  ("DP1", "§2.6", "departure", "Evidence-sufficiency thresholds ES1-ES3 bind the final candidate determination (never the search, Q1-Q6, ranking or selection): >= 10 funded lots (C, J, S also >= 3 of each family), >= 5 independent pool-level episodes and funded entries in >= 4 calendar years, largest winning episode <= 50 % of the development net; a primary failing them is not a research candidate.", "The brief asks for precommitted trade/episode/concentration thresholds that are not lowered for MSFT; §2.6 forbids activity floors and largest-winner caps from eliminating candidates, so binding them on the candidate label departs from it.", f"{BRIEF} Phase 3 item 7: 'Thresholds for sufficient independent trades/episodes, concentration of gains, eligibility and participation for D, G, and combined arms. Do not lower trade-count/risk requirements simply because MSFT is less volatile or has fewer qualifying D1 opportunities. No qualified candidate is an acceptable finding.'; Phase 5B: 'Do not let a single enormous winner satisfy robustness requirements by itself.'"),
]
pin = json.load(open(f'{S}/data/DOOR_PINS.json'))['doors']['FULL']
out = {
  "kind": "optimization-standard-adoption",
  "schema": 1,
  "study": S,
  "scope": "optimization",
  "standard": {"path": "docs/research/OPTIMIZATION_STANDARD.md", "version": "5.0.0", "sha256": sha("docs/research/OPTIMIZATION_STANDARD.md")},
  "readAt": "2026-11-28T08:20:00Z",
  "adoptedAt": opt('--adopted'),
  "protocol": {"path": f"{S}/PROTOCOL.md", "sha256": sha(f"{S}/PROTOCOL.md")},
  "dateSplit": {"development": {"from": "2016-01-04", "to": "2024-12-31"}, "validation": {"from": "2025-01-01", "to": "2026-10-30"}, "commonCompleteEndpoint": "2026-10-30"},
  "dateRanges": {"file": "config/research/date-ranges.json", "id": "R1"},
  "dataPins": {"MSFT": {"file": "data/MSFT/data.csv", "bytes": pin['bytes'], "sha256": pin['sha256'], "through": "2026-10-30"}},
  "objective": {
    "prioritizes": "actual-profit",
    "primaryRule": "NL0 1.0.0 §3.5 original rule: the actual-profit role among the Q1-Q6 qualified members (highest centre net; ties: higher selection robust net, lower centre DD, label), per arm population (D, G, C, J, S) at every cutoff; RA1 report-only. The determination (PROTOCOL.md §12: (a) Q1-Q6, (b) chronological support, (c) V1-V3, (d) ES1-ES3) is a separate precommitted governance label.",
    "roles": ["actual-profit", "robust-profit", "balanced", "lower-drawdown"]
  },
  "risk": {"maximumMinuteDrawdown": 35000, "principalBudget": 100000, "denominator": "one fixed $100,000 initial trading allocation (not peak account equity); P0 = 35 % of it; trade principal loss, banked-capital DD and giveback are report-only"},
  "budget": {
    "distinctProposals": 4 * (64 + 144 + 384 + 18 * rs) * 1024,
    "backendEvaluations": 250000000,
    "notes": f"Distinct candidate proposals: the configured base broad lanes x (512 screen + 2 x 256 island) per cutoff — D 64, G 144, J 384, S 18 x {rs} lanes (F = 3) — over 4 cutoffs, before refinement designs, extension islands and replicate rounds (PROTOCOL.md §7.6). Backend evaluations: the hard ceiling of 250,000,000 requested official evaluations (archive hits included; fresh and hits reported separately; ledger over the sealed stage records); deterministic per-lane bounds (budget.ts laneCaps), 650/652 per qualified member, 306 per slice subject; the pilot's expected effort in the freeze record."
  },
  "referenceMethod": {"id": "NL0", "path": "docs/research/methods/NEW_L0_METHOD.md", "version": "1.0.0", "sha256": sha("docs/research/methods/NEW_L0_METHOD.md")},
  "evaluationBackend": {"policy": "gpu-required", "purpose": "official-optimization", "acceptance": "config/gpu-backend/acceptance.json",
    "notes": "Every official evaluation (searches, replicate rounds, qualification, fold slices, validation) runs only through openOfficialGpuSession -> GpuPool -> EvalLab on the accepted GPU Phase 9 evaluator (record sha256 9ebb33ce8620dead..., binary gb9 36dcc251..., RTX 5090 GPU-ae5f222c...), node --no-maglev, one held job per stage; no CPU fallback. Engineering gates, data tools, the pilot and report-only diagnostics are non-official (parity-test / benchmark / diagnostic)."},
  "chronologicalConsequence": "Standard §1.8 default, adopted: a failed or uncomputable independent verdict of an arm's procedure means 'no chronological support: the selection is not a deployment-qualified candidate without an explicit user decision' (brief Phase 5F: development-qualified only, not independently deployment-qualified). Governance only. 'No qualifying MSFT candidate' is a valid outcome. There is no informed lane.",
  "deviations": [{"id": i, "section": s, "kind": k, "description": d, "justification": j, "userAgreement": u} for i, s, k, d, j, u in deviations]
}
json.dump(out, open(f'{S}/STANDARD_ADOPTION.json', 'w'), indent=1, ensure_ascii=False)
open(f'{S}/STANDARD_ADOPTION.json', 'a').write('\n')
print(out['protocol']['sha256'], out['budget']['distinctProposals'])
