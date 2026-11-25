#!/usr/bin/env python3
"""Priority 6 Phase 0A.7: READ-ONLY audit of Priority 5's other (non-archive) caches — path, bytes, file count, what it is,
regenerability, dependency, likely future usefulness, recommendation — and a re-verification of Priority 5's own hash list
of the files over 1 MB (reports/diagnostics/other-caches.sha256). Nothing is deleted, moved or rewritten.
  python3 -I other_caches.py --repo <repo> --out <json>
"""
import hashlib, json, os, sys, time
a = sys.argv[1:]
opt = lambda k: a[a.index(k) + 1]
REPO = os.path.realpath(opt('--repo')); os.chdir(REPO)
P5 = 'research/vg-l0-n-successor'
def size(p):
    if os.path.isfile(p): return os.path.getsize(p), 1
    t = n = 0
    for root, _, files in os.walk(p):
        for f in files:
            t += os.path.getsize(os.path.join(root, f)); n += 1
    return t, n
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 22), b''): h.update(b)
    return h.hexdigest()
groups = []
def add(path, what, regen, dep, useful, rec, conf):
    b, n = size(path)
    groups.append({'path': path, 'bytes': b, 'files': n, 'what': what, 'regenerable': regen, 'dependency': dep, 'futureUsefulness': useful, 'recommendation': rec, 'confidence': conf})
jobs = f'{P5}/cache/engineering/jobs'
eng = sorted(os.listdir(jobs))
final = {j for j in eng if j.endswith('-final')}
superseded = [j for j in eng if not j.endswith('-final') and f'{j}-final' in final]
add(f'{P5}/cache/pilot/jobs/pilot-broad-D21', 'non-official pilot benchmark archive (128 broad lanes on D21, BENCH seed keys never used by the study)', 'yes — deterministic rerun of the pilot at commit 7d911b4b (identical seeds and code)', 'none: results/engineering/pilot.json holds the sealed planning figures', 'low (planning figures only)', 'removal candidate (or zstd if kept); not deleted here', 'high')
add(f'{P5}/cache/pilot/jobs/pilot-informed-D24', 'non-official pilot benchmark archive (16 Track N lanes on D24, BENCH seed keys)', 'yes — deterministic rerun at commit 7d911b4b', 'none: results/engineering/pilot.json', 'low', 'removal candidate (or zstd if kept); not deleted here', 'high')
add(f'{P5}/cache/pilot/datasets', 'exported GPU datasets of the pilot doors (.gb2ds)', 'yes — exportDataset of the canonical doors (write-once, verified by hash)', 'none', 'none', 'removal candidate', 'high')
for j in superseded:
    add(f'{jobs}/{j}', f'engineering job {j}: a pre-final run superseded by {j}-final (the gates were rerun on the final code; E5 disclosure in Priority 5)', 'yes — deterministic at its own commit', 'none: the sealed gates cite the -final runs', 'none', 'removal candidate (superseded)', 'high')
for j in sorted(final):
    add(f'{jobs}/{j}', f'engineering job {j}: the archive behind a sealed engineering gate (results/engineering/*.json)', 'yes — deterministic rerun at commit 7d911b4b', 'the sealed gate record cites it (counts and hashes); re-audit of the gate', 'medium (audit trail of the gates)', 'keep (or zstd)', 'medium')
others = [j for j in eng if j not in final and j not in superseded]
for j in others:
    add(f'{jobs}/{j}', f'engineering job {j} (no -final twin)', 'yes — deterministic at its own commit', 'the engineering gate records', 'medium', 'keep', 'medium')
add(f'{P5}/cache/engineering/datasets', 'exported GPU datasets of the engineering doors', 'yes — exportDataset', 'none', 'none', 'removal candidate', 'high')
jd = sorted(f'{P5}/cache/jobs/{j}/dataset' for j in os.listdir(f'{P5}/cache/jobs') if os.path.isdir(f'{P5}/cache/jobs/{j}/dataset'))
b = sum(size(d)[0] for d in jd)
groups.append({'path': f'{P5}/cache/jobs/*/dataset ({len(jd)} directories)', 'bytes': b, 'files': sum(size(d)[1] for d in jd), 'what': 'each official job’s exported GPU dataset (.gb2ds + .json), used only to resume that job', 'regenerable': 'yes — exportDataset of the same door (the attestation records each dataset sha256)', 'dependency': 'resuming a sealed job (never: every stage is sealed and refuses to rerun)', 'futureUsefulness': 'none unless a job archive is restored and replayed (then regenerated on the fly)', 'recommendation': 'removal candidate (regenerable; keep the .json sidecars)', 'confidence': 'high'})
add(f'{P5}/cache/diagnostics', 'report-only diagnostics archive (families-D24) and its D24 dataset', 'yes — rerun of tools/vg-l0-n-successor/diagnostics.ts', 'reports/diagnostics/families.json', 'medium (backs a published diagnostic)', 'keep (small)', 'high')
add(f'{P5}/cache/lot-rows', 'per-lot rows of every qualified member (the qualification evidence keeps only counts)', 'only by replaying qualification evaluations', 'the reports’ lot-level analyses (giveback, MAE tables)', 'high (lot-level evidence of sealed members)', 'keep', 'high')
add(f'{P5}/cache/strategy-lab-scratch', 'a scratch Strategy Lab build used once for the catalog check', 'yes — npm build', 'none', 'none', 'removal candidate', 'high')
# Priority 5's own hash list of the files over 1 MB
hl = []
for line in open(f'{P5}/reports/diagnostics/other-caches.sha256'):
    s, n, rel = line.split()
    p = rel if rel.startswith('research/') else f'{P5}/{rel}'
    ok = os.path.isfile(p) and os.path.getsize(p) == int(n) and sha(p) == s
    hl.append({'file': p, 'bytes': int(n), 'ok': ok})
tot = sum(g['bytes'] for g in groups)
cand = sum(g['bytes'] for g in groups if g['recommendation'].startswith('removal'))
out = {'kind': 'P5 other-cache audit (read-only; nothing deleted)', 'written': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
       'groups': groups, 'totals': {'bytes': tot, 'removalCandidateBytes': cand, 'keepBytes': tot - cand},
       'p5HashList': {'file': f'{P5}/reports/diagnostics/other-caches.sha256', 'files': len(hl), 'ok': sum(x['ok'] for x in hl), 'failed': [x['file'] for x in hl if not x['ok']]},
       'policy': 'brief §0A.7: report removal candidates; delete nothing in this assignment (no independent cleanup authorization)'}
json.dump(out, open(opt('--out'), 'w'), indent=1); open(opt('--out'), 'a').write('\n')
print(json.dumps(out['totals']), json.dumps({k: v for k, v in out['p5HashList'].items() if k != 'failed'}), out['p5HashList']['failed'][:3])
