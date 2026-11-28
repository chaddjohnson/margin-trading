#!/usr/bin/env python3
# gpu-phase9: writes the PROTOCOL FREEZE once, on the committed tree, before the campaign (PROTOCOL.md §5; as GPU Phase 7's
# results/protocol-freeze.json): the sha256 of the protocol, the adoption, the brief, the chains, the generator, the
# campaign tools, the edge subjects and the baseline, with the commit and the record in force. Sealed (0444) and appended
# to results/seals.jsonl. Refuses when the record exists or the source is not committed.
#   python3 -I tools/gpu-phase9/protocol-freeze.py
import datetime, glob, hashlib, json, os, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(REPO)
OUT = 'research/gpu-phase9/results/protocol-freeze.json'
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
git = lambda *a: subprocess.run(['git', *a], capture_output=True, text=True, check=True).stdout.strip()
if os.path.exists(OUT):
    sys.exit(f'{OUT} exists: the protocol is frozen once')
dirty = git('status', '--porcelain', '--', 'src', 'tools', 'config', 'research/gpu-phase9')
if dirty:
    sys.exit(f'commit first:\n{dirty}')
t = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
files = lambda pattern: {f: sha(f) for f in sorted(glob.glob(pattern))}
rec = {
    'kind': 'gpu-phase9 protocol freeze',
    't': t,
    'protocol': {'path': 'research/gpu-phase9/PROTOCOL.md', 'sha256': sha('research/gpu-phase9/PROTOCOL.md')},
    'adoption': {'path': 'research/gpu-phase9/STANDARD_ADOPTION.json', 'sha256': sha('research/gpu-phase9/STANDARD_ADOPTION.json')},
    'brief': {'path': 'research/gpu-phase9/brief/BRIEF.md', 'sha256': sha('research/gpu-phase9/brief/BRIEF.md')},
    'chains': files('research/gpu-phase9/chains/*'),
    'generator': {'path': 'tools/gpu-phase9/accept.ts', 'sha256': sha('tools/gpu-phase9/accept.ts')},
    'tools': files('tools/gpu-phase9/*'),
    'support': files('src/gpu-phase9/*.ts'),
    'edgeSubjects': {os.path.basename(f): sha(f) for f in sorted(glob.glob('research/gpu-phase9/results/risk-parity/edge-subjects-*.json'))},
    'baseline': {
        'files': files('research/gpu-phase9/results/baseline/*'),
        'baseCommit': json.load(open('research/gpu-phase9/results/baseline/baseline.json'))['baseCommit'],
        'recordInForce': sha('config/gpu-backend/acceptance.json'),
    },
    'restore': {'path': 'research/gpu-phase9/results/restore/restore-record.json', 'sha256': sha('research/gpu-phase9/results/restore/restore-record.json')},
    'source': {'commit': git('rev-parse', 'HEAD'), 'tree': git('rev-parse', 'HEAD^{tree}'), 'branch': git('rev-parse', '--abbrev-ref', 'HEAD')},
}
with open(OUT, 'w') as f:
    f.write(json.dumps(rec, indent=1) + '\n')
os.chmod(OUT, 0o444)
with open('research/gpu-phase9/results/seals.jsonl', 'a') as f:
    f.write(json.dumps({'t': t, 'file': OUT, 'sha256': sha(OUT)}) + '\n')
print(json.dumps({'frozen': OUT, 'sha256': sha(OUT), 'commit': rec['source']['commit'][:12], 't': t}))
