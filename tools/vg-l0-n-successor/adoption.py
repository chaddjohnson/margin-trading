#!/usr/bin/env python3
# Writes research/vg-l0-n-successor/STANDARD_ADOPTION.json (standard 3.0.0 §7.2) with the CURRENT sha256 of PROTOCOL.md.
# Run (python3 -I) after the last pre-freeze edit of the protocol; the preflight checks the pin. Times are UTC.
import hashlib, json, os, sys

root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
study = 'research/vg-l0-n-successor'
sha = lambda p: hashlib.sha256(open(os.path.join(root, p), 'rb').read()).hexdigest()
read_at = '2026-11-24T11:33:00Z'
adopted_at = sys.argv[1] if len(sys.argv) > 1 else None
if not adopted_at:
    raise SystemExit('usage: adoption.py <adoptedAt UTC, from date -u>')

dev = [
    ('AD1', '§4.1, §4.3, §4.8', "Assignment 3's 92-gene full joint space (64 D1 risk-control cells x Growth·VGT's complete Growth 1.4.0 genome) imported unchanged; Growth·GDX OFF; S1 absent from the engine (the S1-free GPU Phase 7 revision); shadow-entry eligibility OFF; calendar-day holds.", 'The brief fixes this scope (§1).'),
    ('AD2', '§4.2, §4.8', 'Effort by replicates of NL0\'s unchanged per-lane schedules: Track F 4 base replicates per cell and cutoff, 4 refinement lanes per refined cell, Track N R_N replicates per family pair by Assignment 3\'s matching rule.', 'NL0 §7.4 scaling; the brief requires an independently sufficient budget for both tracks (§3.3).'),
    ('AD3', '§4.5, §4.8', "Two-tier island extension (NL0's full trigger up to NL0's caps 6/8, then performance components only up to 16 islands) and convergence-driven replicate rounds (one replicate of every structure while the track's union improves > 2 % or a structure gets its first feasible fit; <= 4 rounds).", 'Brief §3.3.4-§3.3.7 (caps high enough to avoid Priority 4\'s 48 % budget-bound outcome; multiple predeclared extension rounds); Phase A: the class component alone kept 142/185 Assignment 3 lanes at their caps with ~0 performance gain.'),
    ('AD4', '§1.8', "The sequential drawdown statistic is computed exactly from GPU outputs (each slice's minute reset drawdown, every session close, every lot's minute minimum); the CPU reference exact minute chain is reported beside it, non-official.", 'The accepted GPU path returns no minute mark series; a CPU-scored official statistic is forbidden (§9.2). Gate E6 measures the gap.'),
    ('AD5', '§1.2, §1.4', 'FULL is read before the frozen selection only for the known-target reproduction of New L0 and N/original (gate E2, equality output only).', "Assignment 3 AD3 / GPU Phase 1 AD3 precedent; the references' full-history figures are published."),
    ('AD6', '§2.3, §2.5, §5.9', "NL0's original rule is the only selector; Assignment 3's RA1/RA2 (which needed a user-agreed departure) are not used; the refinement plan's RA1 slot is replaced by NL0's balanced statistic.", 'No departure is granted by this brief.'),
    ('AD7', '§4.4, §3.2, §3.3, §1.9', "Track N (incumbent-informed, C24 only): Assignment 3's informed machinery with N/original as its only seed projected onto every family pair; N/original and New L0 are incumbent members of N and U.", 'Brief §3.1.'),
    ('AD8', '§5.3', "The neighbourhood instrument, seed namespace and labels are Assignment 3's, so the references' C24 evidence reproduces Assignment 3's sealed evidence (gate E2).", 'Comparability with Assignment 3; confirmation draws never rank.'),
    ('AD9', '§5.1', 'Two report-only stresses beside Assignment 3\'s six: cost 2 bps per side and stop slippage +10 bps.', 'Brief §6 (0/2/5/10/20 bps; slippage).'),
    ('AD10', '§1.8, §2.5', 'Precommitted successor determination against N/original (material improvement P or R with $10,000 / $5,000 / $2,500 bands, replication across seeds, V1-V3) — governance labels only.', 'Brief §7 (material improvement and uncertainty criteria before optimization).'),
    ('AD11', '§5.9', 'No disjoint pre-2016 data: the hold-window tail stress uses in-sample, same-period proxy (XLK, GDXJ) and synthetic gap scenarios.', 'Assignment 3 AD11.'),
]

doc = {
    'kind': 'optimization-standard-adoption',
    'schema': 1,
    'study': study,
    'scope': 'optimization',
    'standard': {'path': 'docs/research/OPTIMIZATION_STANDARD.md', 'version': '3.0.0', 'sha256': sha('docs/research/OPTIMIZATION_STANDARD.md')},
    'readAt': read_at,
    'adoptedAt': adopted_at,
    'protocol': {'path': f'{study}/PROTOCOL.md', 'sha256': sha(f'{study}/PROTOCOL.md')},
    'dateSplit': {'development': {'from': '2016-01-04', 'to': '2024-12-31'}, 'validation': {'from': '2025-01-01', 'to': '2026-10-30'}, 'commonCompleteEndpoint': '2026-10-30'},
    'objective': {
        'prioritizes': 'actual-profit',
        'primaryRule': "NL0 1.0.0 §3.5 original rule: the actual-profit role among the Q1-Q6 qualified members (highest centre net; ties: higher selection robust net, lower centre DD, label); per cutoff for Track F's populations (F: the procedure; L, B report-only) and at C24 for N and U (U's primary = the study's formal C24 primary). The successor determination (PROTOCOL.md §12) is a separate precommitted governance label.",
        'roles': ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown'],
    },
    'risk': {'maximumMinuteDrawdown': 35000, 'principalBudget': 100000, 'denominator': 'one fixed $100,000 initial trading allocation (not peak account equity); P0 = 35 % of it; trade principal loss, banked-capital DD and giveback are report-only'},
    'budget': {
        'distinctProposals': 262144 * 4 * 2,
        'backendEvaluations': 80000000,
        'notes': "Distinct candidate proposals (centres; refinement moves apart): Track F configured base 256 lanes x (512 + 2 x 256) = 262,144 per cutoff (4 cutoffs: 1,048,576) plus refinement and Track N designs and islands (PROTOCOL.md §7.6); the figure above is a planning order (base Track F proposals x 2). Backend evaluations: the hard ceiling of 80,000,000 requested official evaluations (archive hits included; fresh and hits reported separately; ledger over the sealed stage records); every stage is bounded deterministically by its lanes' worst cases (PLC broad 90,000 / refine 174,000 / informed 171,000), 655 per qualified member, 306 per slice subject.",
    },
    'referenceMethod': {'id': 'NL0', 'path': 'docs/research/methods/NEW_L0_METHOD.md', 'version': '1.0.0', 'sha256': sha('docs/research/methods/NEW_L0_METHOD.md')},
    'evaluationBackend': {
        'policy': 'gpu-required',
        'purpose': 'official-optimization',
        'acceptance': 'config/gpu-backend/acceptance.json',
        'notes': 'Every official evaluation (search, replicate rounds, qualification, fold slices, validation) runs only through openOfficialGpuSession -> GpuPool -> EvalLab on the accepted GPU Phase 7 evaluator (record sha256 bb0e3fcf..., binary gb7 cb2ff30b..., RTX 5090 GPU-ae5f222c...), node --no-maglev, one held job per stage; no CPU fallback. Engineering gates, the pilot and report-only diagnostics are non-official (parity-test / benchmark / cpu-reference / diagnostic).',
    },
    'chronologicalConsequence': "Standard 3.0.0 §1.8 default, adopted: a failed or uncomputable independent verdict of the F/original procedure means 'no chronological support: the selection is not a deployment-qualified candidate without an explicit user decision'; every Track N and U selection is 'incumbent-informed; no independent chronological test' with the same consequence. Governance only. 'No material improvement' is a valid outcome.",
    'deviations': [{'id': i, 'section': s, 'kind': 'adaptation', 'description': d, 'justification': j, 'userAgreement': None} for (i, s, d, j) in dev],
}

with open(os.path.join(root, study, 'STANDARD_ADOPTION.json'), 'w') as f:
    json.dump(doc, f, indent=1, ensure_ascii=False)
    f.write('\n')
print(doc['protocol']['sha256'])
