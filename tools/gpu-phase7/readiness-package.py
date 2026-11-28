#!/usr/bin/env python3
# gpu-phase7 (brief §11 H, I): the machine-readable readiness manifest and the portable ZIP handoff. Read-only over the
# repository except its two outputs: research/gpu-phase7/READINESS_MANIFEST.json and
# research/gpu-phase7/bundle/gpu-phase7-risk-envelope-readiness.zip (+ a copy under ~/.local/share/margin-trading-gpu/
# handoffs/). Every figure is copied from a committed record; nothing is recomputed. No dataset, archive or job state is
# packaged (data hashes only).
#   python3 -I tools/gpu-phase7/readiness-package.py manifest
#   python3 -I tools/gpu-phase7/readiness-package.py zip
import hashlib
import json
import os
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
S = 'research/gpu-phase7'
P = 'research/vg-l0-risk-envelope-pilot'
MANIFEST = f'{S}/READINESS_MANIFEST.json'
ZIPNAME = 'gpu-phase7-risk-envelope-readiness.zip'
ZIP = f'{S}/bundle/{ZIPNAME}'
HANDOFFS = os.path.expanduser('~/.local/share/margin-trading-gpu/handoffs')


def path(p):
    return os.path.join(ROOT, p)


def sha(p):
    h = hashlib.sha256()
    with open(path(p), 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def load(p):
    with open(path(p)) as f:
        return json.load(f)


def git(*a):
    return subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


DELIVERABLES = {
    'A': f'{S}/PREREQUISITES_READY.md',
    'B': f'{S}/RISK_METRIC_INTEGRATION_SPEC.md',
    'C': f'{S}/PARITY_REPORT.md',
    'D': f'{S}/ACCEPTANCE_EVIDENCE.md',
    'E': f'{P}/PROTOCOL_PROPOSED.md',
    'F': f'{S}/RESTORATION_REPORT.md',
    'G': f'{P}/EXECUTION_PLAN.md',
}
SUPPORT = [
    f'{P}/README.md', f'{P}/DECISION_REGISTER.md', f'{P}/DIAGNOSTICS_SPEC.md', f'{P}/SCALING_CHECKS.md',
    f'{P}/IMPLEMENTATION_PLAN.md', f'{S}/INTEGRATION_PLAN.md', f'{S}/PROTOCOL.md', f'{S}/AMENDMENTS.md',
    f'{S}/RUN_COMMANDS.md', f'{S}/RESEARCH_RECOVERY.md', f'{S}/STANDARD_ADOPTION.json', f'{S}/brief/BRIEF.md',
    'config/gpu-backend/acceptance.json', f'{S}/results/superseded/acceptance-gpu-phase6.json',
]


def manifest():
    rec = load('config/gpu-backend/acceptance.json')
    summ = load(f'{S}/results/tables/summary.json')
    g = summ['gates']
    tests = load(f'{S}/results/tests/npm-test.json')
    sl = load(f'{S}/results/tests/strategy-lab.json')
    pp = load(f'{S}/results/tests/strategy-lab-portfolio-parity.json')
    integ = load(f'{S}/results/integrity/integrity.json')
    restore = load(f'{S}/results/restore/restore-record.json')
    bench = load(f'{S}/results/bench/benchmark.json') if os.path.exists(path(f'{S}/results/bench/benchmark.json')) else None
    restore_dir = path(f'{S}/cache/restore')
    scratch_left = sorted(os.listdir(restore_dir)) if os.path.isdir(restore_dir) else []
    code = ['src/gpu-backend/pool.ts', 'src/gpu-backend/lab.ts', 'src/gpu-backend/toolchain.ts', 'src/gpu-backend/entrypoints.ts',
            'config/gpu-backend/entrypoints.json', 'src/gpu-backend/batch.ts', 'src/risk-envelope/policy.ts',
            'src/risk-envelope/diagnostics.ts', 'src/gpu-phase7/envelope.ts', 'src/gpu-backend/cuda/gb_pool.cuh']
    m = {
        'kind': 'gpu-phase7 risk-envelope pilot readiness manifest',
        'schema': 1,
        't': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'pilot': {
            'executionAuthorized': False,
            'started': False,
            'status': 'NOT STARTED — awaiting original-conversation review and separate authorization',
            'protocolStatus': 'PROPOSED for review (not frozen, no adoption manifest, no code, no job)',
            'protocol': {'path': DELIVERABLES['E'], 'sha256': sha(DELIVERABLES['E'])},
            'decisionRegister': {'path': f'{P}/DECISION_REGISTER.md', 'sha256': sha(f'{P}/DECISION_REGISTER.md'),
                                 'openDecisions': [f'D-{i}' for i in range(0, 15)], 'resolved': {'D-15': 'scratch restores deleted 2026-11-22T00:47:30Z'}},
            'budgetProposed': {'expected': '≈ 0.27–0.38 M evaluations', 'worstCase': '0.70 M (above the approved 0.3–0.5 M band; decision D-2)'},
        },
        'readiness': {
            'verdict': 'READY FOR REVIEW — infrastructure prerequisites met; pilot execution blocked on the user decisions below',
            'blockers': [
                'B1 user review and authorization of the pilot protocol and every open decision (D-0 … D-14) in the original conversation',
                'B2 the pilot code (src/vg-l0-risk-envelope-pilot/, IMPLEMENTATION_PLAN.md) does not exist by design; it needs implementation and its engineering gates E2–E6 after authorization',
                'B3 the Phase 7 acceptance record is valid on this branch only; official pilot runs need either this branch or a reviewed merge into main (decision D-14) — main still carries the Phase 6 record for main\'s tree',
            ],
            'caveats': [
                'worst-case pilot budget 0.70 M exceeds the approved 0.3–0.5 M band (D-2 proposes a stop rule)',
                'the experimental envelope is not a pure relaxation of the control (PARITY_REPORT §4)',
                'banked DD (marked) exceeded marked DD in 4 engineering subjects (partial sales under water; expected by SELECTION_PIPELINE_AUDIT §3; GPU = CPU)',
                'the liquidation-basis conventional DD (DD^L) is not delivered by the GPU (report-only CPU diagnostic; D-11)',
                'amendments D0, D1, A1, A2 (AMENDMENTS.md) — disclosures and two corrected check criteria; no evidence changed',
            ],
        },
        'repository': {
            'branch': git('rev-parse', '--abbrev-ref', 'HEAD'),
            'head': git('rev-parse', 'HEAD'),
            'branchBase': {'cleanup/storage-2026-11-21': 'd89b9dec7fa48ceef49f716898211a464fa7ffa3', 'main': git('rev-parse', 'main')},
            'mergedIntoMain': False,
            'statusShort': git('status', '--short') or '(clean)',
        },
        'environment': {'device': rec['device'], 'runtime': rec['runtime'], 'cuda': 'user-space toolkit 13.2 (V13.2.86)', 'host': 'Apollo'},
        'acceptance': {
            'status': rec['status'], 'study': rec['study'], 'acceptedAt': rec['acceptedAt'],
            'recordSha256': sha('config/gpu-backend/acceptance.json'), 'source': rec['source'], 'binary': rec['binary'],
            'evaluationDigest': rec['compat']['digest'], 'groups': {k: rec['compat'][k]['digest'] for k in ('cpu', 'cuda', 'host')},
            'policyDigest': rec['policy'].get('digest'), 'supersedes': rec['supersedes'], 'evidenceEntries': len(rec['evidence']),
            'outOfBandPin': '~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json',
            'verifier': 'VERIFIED (results/post-record/verify-acceptance.txt)',
            'liveOfficialGate': 'GATE OPEN on D24 (results/post-record/official-preflight-D24.txt)',
            'scope': 'this branch; main keeps the Phase 6 record 3610caaf… (valid for main)',
        },
        'requiredFields': {
            'deliveredBy': 'EvalLab.evalMany items { cfg, options, detail?, risk: true } → archive key + "|risk" → value { ...record, envelope }',
            'envelope': {f: 'dollars, finite, ≥ 0' for f in ('principalLossMarked', 'principalLossLiquidation', 'bankedDdMarked', 'bankedDdLiquidation')},
            'orderings': ['principalLossLiquidation ≥ principalLossMarked', 'bankedDdLiquidation ≥ bankedDdMarked'],
            'conventionalDd': 'record.dd (marked maximum minute drawdown, unchanged)',
            'interpretation': 'src/risk-envelope/policy.ts (nl0-control: DD ≤ 35 % C0; re-40-25-25: DD ≤ 40 % C0, PL liq ≤ 25 % C0, BD liq ≤ 25 % C0; value = limit passes; limit = C0·pct/100)',
            'failClosed': 'missing / extra / invalid envelope → PolicyError risk-envelope-mismatch or checkEnvelope failure; no CPU fallback',
        },
        'code': {p: sha(p) for p in code},
        'data': {'GDX': sha('data/GDX/data.csv'), 'VGT': sha('data/VGT/data.csv'), 'note': 'Priority 3 pins; doors D19–D24 verified as canonical prefixes'},
        'tests': {
            'parity': {k: summ['parity'][k] for k in ('pass', 'runs', 'subjects', 'identical', 'mismatches', 'envelopesCompared', 'randomGenomes')},
            'riskParity': {k: {x: v[x] for x in ('pass', 'subjects', 'items', 'r1', 'r2', 'archive', 'r3')} for k, v in summ['riskParity'].items()},
            'compare': {k: v['identical'] for k, v in summ['compare'].items()},
            'qualify': {k: g['qualify'][k] for k in ('assessmentsCompared', 'assessmentsDiffering')},
            'finalists': {'pass': g['finalists']['pass']},
            'sanitizer': [{'tool': r['tool'], 'errors': r['errors'], 'identical': r['identical'], 'subjects': r['subjects']} for r in g['sanitizer']],
            'negative': g['negative'], 'tamper': g['tamper'], 'sustained': g['sustained'],
            'npmTest': tests['summary'], 'strategyLab': sl['summary'], 'portfolioParity': pp['summary'],
            'integrity': integ['summary'], 'scaling': g['scaling'],
            'recordInForceTests': '16/16 after the record (results/post-record/record-in-force-tests.txt)',
        },
        'throughput': bench,
        'archives': {
            'restoredTemporarily': [{'job': a['job'], 'compressed': a['compressed'], 'scratch': a['restored'],
                                     'checksPassed': f"{sum(c['pass'] for c in a['checks'])}/{len(a['checks'])}",
                                     **{c['name']: c['detail'] for c in a['checks'] if 'sha256' in c['name'] or 'rows' in c['name']}}
                                    for a in restore['restores']],
            'compressedOriginalsUnchanged': True,
            'scratchCopiesRemaining': scratch_left,
            'recreate': 'python3 -I tools/gpu-phase7/restore-archives.py search-C21-broad1 search-C24-broad1',
        },
        'deliverables': {k: {'path': p, 'sha256': sha(p)} for k, p in DELIVERABLES.items()},
        'support': {p: sha(p) for p in SUPPORT},
    }
    with open(path(MANIFEST), 'w') as f:
        json.dump(m, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(f'{MANIFEST} {sha(MANIFEST)}')


def zipit():
    files = list(DELIVERABLES.values()) + SUPPORT + [MANIFEST]
    R = f'{S}/results'
    for d in ('tables', 'compare', 'risk-parity', 'qualify', 'sanitizer-final', 'policy', 'tests', 'integrity', 'scaling',
              'diagnostics', 'restore', 'baseline', 'post-record', 'bench', 'superseded'):
        for dp, _dn, fn in os.walk(path(f'{R}/{d}')):
            for n in sorted(fn):
                if n.endswith(('.json', '.md', '.txt')):
                    files.append(os.path.relpath(os.path.join(dp, n), ROOT))
    files += [f'{R}/parity/final/SUMMARY.json', f'{R}/parity/finalists.json', f'{R}/final-binary.json', f'{R}/protocol-freeze.json',
              f'{R}/seals.jsonl', f'{R}/sustained/p0/summary.json', f'{R}/sustained/p1/summary.json']
    files += [os.path.relpath(os.path.join(dp, n), ROOT) for dp, _dn, fn in os.walk(path(f'{R}/jobs')) for n in fn if n in ('profile.json', 'job.json', 'complete.json')]
    files += ['src/risk-envelope/policy.ts', 'src/risk-envelope/diagnostics.ts', 'src/gpu-phase7/envelope.ts',
              'docs/gpu/README.md', 'docs/gpu/PARITY_CHECKLIST.md', 'docs/gpu/FEATURE_MATRIX.md']
    files = sorted(set(f for f in files if os.path.isfile(path(f))))
    diff = git('diff', 'd89b9dec7fa48ceef49f716898211a464fa7ffa3', 'HEAD', '--', 'src/gpu-backend', 'config/gpu-backend/entrypoints.json', '.gitignore')
    os.makedirs(os.path.dirname(path(ZIP)), exist_ok=True)
    listing = []
    with zipfile.ZipFile(path(ZIP), 'w', zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(path(f), f'gpu-phase7-readiness/{f}')
            listing.append(f'{sha(f)}  {f}')
        z.writestr('gpu-phase7-readiness/backend-change.patch', diff + '\n')
        z.writestr('gpu-phase7-readiness/SHA256SUMS', '\n'.join(listing) + '\n')
        z.writestr('gpu-phase7-readiness/README.md', (
            '# GPU Phase 7 readiness package (risk-envelope pilot prerequisites)\n\n'
            'Start with `research/gpu-phase7/PREREQUISITES_READY.md` (deliverable A). Deliverables: A PREREQUISITES_READY, '
            'B RISK_METRIC_INTEGRATION_SPEC, C PARITY_REPORT, D ACCEPTANCE_EVIDENCE (all research/gpu-phase7/), '
            'E PROTOCOL_PROPOSED + DECISION_REGISTER, G EXECUTION_PLAN (research/vg-l0-risk-envelope-pilot/), '
            'F RESTORATION_REPORT, H READINESS_MANIFEST.json (research/gpu-phase7/). `backend-change.patch` = the backend '
            'diff against the post-cleanup base d89b9dec. SHA256SUMS lists every file. No datasets or archives are included.\n\n'
            f'Branch {git("rev-parse", "--abbrev-ref", "HEAD")} at {git("rev-parse", "HEAD")}.\n\n'
            '**PILOT NOT STARTED — awaiting original-conversation review and separate authorization**\n'))
    os.makedirs(HANDOFFS, exist_ok=True)
    shutil.copy2(path(ZIP), os.path.join(HANDOFFS, ZIPNAME))
    print(f'{ZIP} {sha(ZIP)} {os.path.getsize(path(ZIP))} B, {len(files) + 3} entries; copy {os.path.join(HANDOFFS, ZIPNAME)}')


if __name__ == '__main__':
    {'manifest': manifest, 'zip': zipit}[sys.argv[1]]()
