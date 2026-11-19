#!/usr/bin/env bash
# gpu-backend: an INDEPENDENT re-verification of the GPU acceptance record — written in Python and git, sharing no code
# with the TypeScript validator (src/gpu-backend/acceptance.ts), so a change to that validator cannot silence it. It
# checks: schema 2; status ACCEPTED; every pinned file (CPU closure, CUDA, host path, enforcement) hashes to its pin; the
# evaluation digest recomputed from the pins equals the record's (the digest compiled into the binary); the policy
# digest; every evidence file; the accepted source revision is an ancestor of HEAD and the pinned files are committed
# and unmodified; optionally the binary (sha256, or a reproducible rebuild with --rebuild) and the GPU (--device).
#
#   tools/gpu-backend/verify-acceptance.sh [--record config/gpu-backend/acceptance.json] [--binary <path>] [--rebuild]
#     [--device] [--expect-record-sha256 <sha256 kept outside the repository>]
#
# A pass means the working tree is what the record says was verified. It is not a signature: whoever can commit can
# rewrite a file and its pin together, so the reviewed Git history (and the record's sha256 kept outside the
# repository, e.g. in a handoff) remains the root of trust.
set -euo pipefail
cd "$(dirname "$0")/../.."
RECORD=config/gpu-backend/acceptance.json
BINARY=""
REBUILD=0
DEVICE=0
EXPECT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --record) RECORD=$2; shift 2 ;;
    --binary) BINARY=$2; shift 2 ;;
    --rebuild) REBUILD=1; shift ;;
    --device) DEVICE=1; shift ;;
    --expect-record-sha256) EXPECT=$2; shift 2 ;;
    *) echo "unknown argument $1" >&2; exit 2 ;;
  esac
done
python3 - "$RECORD" "$BINARY" "$REBUILD" "$DEVICE" "$EXPECT" <<'PY'
import hashlib, json, os, subprocess, sys, tempfile
record, binary, rebuild, device, expect = sys.argv[1], sys.argv[2], sys.argv[3] == '1', sys.argv[4] == '1', sys.argv[5]
fails = []
def check(name, ok, detail=''):
    print(f"{'PASS' if ok else 'FAIL'} {name}{'' if ok else ' — ' + detail}")
    if not ok: fails.append(name)
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
def gdigest(files):
    return hashlib.sha256('\n'.join(f"{f['path']}:{f['sha256']}" for f in files).encode()).hexdigest()
def js(x):  # JSON.stringify of plain values
    return json.dumps(x, separators=(',', ':'), ensure_ascii=False)

if not os.path.exists(record):
    check('record exists', False, record); sys.exit(1)
r = json.load(open(record))
if expect:
    check('record sha256 equals the out-of-band pin', sha(record) == expect, f"{sha(record)[:16]} vs {expect[:16]}")
check('kind and schema 2', r.get('kind') == 'gpu-backend acceptance' and r.get('schema') == 2, f"kind {r.get('kind')} schema {r.get('schema')}")
check('status ACCEPTED', r.get('status') == 'ACCEPTED', f"{r.get('status')}: {r.get('blockers')}")
groups = {k: r['compat'][k] for k in ('cpu', 'cuda', 'host')}
groups['policy'] = r['policy']
for g, grp in groups.items():
    bad = [f['path'] for f in grp['files'] if not os.path.exists(f['path']) or sha(f['path']) != f['sha256']]
    check(f"{g} files ({len(grp['files'])}) hash to their pins", not bad, ', '.join(bad[:8]))
    check(f"{g} group digest", gdigest(grp['files']) == grp['digest'], 'the digest does not match the file list')
c = r['compat']
ev = hashlib.sha256(js({'v': c['version'], 'p': c['protocolVersion'], 'd': c['datasetVersion'], 'nvcc': c['nvcc'], 'flags': c['nvccFlags'], 'cpu': groups['cpu']['digest'], 'cuda': groups['cuda']['digest'], 'host': groups['host']['digest']}).encode()).hexdigest()
check('evaluation digest recomputed from the pins', ev == c['digest'], f"{ev[:16]} vs {c['digest'][:16]}")
bad = [e['path'] for e in r['evidence'] if not e['pass'] or not os.path.exists(e['path']) or sha(e['path']) != e['sha256']]
check(f"evidence files ({len(r['evidence'])}) intact and passed", not bad, ', '.join(bad[:8]))
src = r['source']['commit']
anc = subprocess.run(['git', 'merge-base', '--is-ancestor', src, 'HEAD'], capture_output=True, text=True)
check(f"source revision {src[:12]} is an ancestor of HEAD", anc.returncode == 0, anc.stderr.strip() or 'not in this history')
pinned = [f['path'] for g in groups.values() for f in g['files']]
st = subprocess.run(['git', 'status', '--porcelain', '--', *pinned], capture_output=True, text=True)
check('pinned files committed and unmodified', st.returncode == 0 and st.stdout.strip() == '', st.stdout.strip()[:300])
changed = subprocess.run(['git', 'diff', '--name-only', src, 'HEAD', '--', *pinned], capture_output=True, text=True)
check('pinned files unchanged since the source revision', changed.returncode == 0 and changed.stdout.strip() == '', changed.stdout.strip()[:300])
b = binary or r['binary']['path']
if os.path.exists(b):
    check(f"binary {b} sha256", sha(b) == r['binary']['sha256'], sha(b)[:16])
else:
    print(f"SKIP binary {b} (not built here: tools/gpu-backend/build.sh {b} {c['digest']})")
if rebuild:
    with tempfile.TemporaryDirectory() as d:
        out = os.path.join(d, 'gb')
        subprocess.run(['tools/gpu-backend/build.sh', out, c['digest']], check=True, capture_output=True)
        check('reproducible rebuild from the pinned sources', sha(out) == r['binary']['sha256'], sha(out)[:16])
if device:
    u = subprocess.run(['nvidia-smi', '--query-gpu=uuid', '--format=csv,noheader'], capture_output=True, text=True).stdout.strip().split('\n')[0]
    check(f"device {u}", u == r['device']['uuid'], f"accepted {r['device']['uuid']}")
print('VERIFIED' if not fails else f"NOT VERIFIED ({len(fails)} failure(s))")
sys.exit(1 if fails else 0)
PY
