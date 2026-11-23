#!/usr/bin/env bash
# gpu-phase8 (PROTOCOL.md §5 gate B1): builds the FINAL evaluator binary (protocol v3, staged-stop@1) from the committed
# tree and seals results/final-binary.json (after tools/gpu-phase7/build-final.sh, with this study's namespace) —
#   - research/gpu-phase8/build/gb8 with the tree's compatibility digest, built twice (reproducible: equal sha256);
#   - gb8-dev (the same binary; the dev role enables test hooks at run time), gb8-perturbed (GB_TEST_PERTURB, the
#     negative tests' wrong kernel) and gb8-stale (another digest, the negative tests' stale build);
#   - the previous accepted binary research/gpu-phase7/build/gb7 (protocol v2, sha256 cb2ff30b…) is checked unchanged:
#     the negative suite uses it as the OLD server that must refuse a v3 batch. The kernels CHANGED (the staged rule at
#     the D1 and Growth entry and after-session sites): no kernel-identity claim is made; the device code is verified by
#     this study's own parity campaign, sanitizer and mini-optimization.
#   tools/gpu-phase8/build-final.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TK=${GPU_BACKEND_CUDA_HOME:-/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit}
B=research/gpu-phase8/build
P7=research/gpu-phase7/build/gb7
mkdir -p "$B" research/gpu-phase8/results
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "commit the source first" >&2; exit 1; }
[ "$(sha256sum "$P7" | cut -d' ' -f1)" = cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82 ] || { echo "the accepted Phase 7 binary changed" >&2; exit 1; }

D=$("$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh "$B/gb8" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb8-rebuild" "$D" > /dev/null
cp -f "$B/gb8" "$B/gb8-dev"
GB_EXTRA_DEFINES=-DGB_TEST_PERTURB tools/gpu-backend/build.sh "$B/gb8-perturbed" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb8-stale" stale-digest-for-negative-test > /dev/null
python3 -I - "$B" "$P7" "$D" "$(git rev-parse HEAD)" "$("$TK/bin/nvcc" --version | tail -2 | head -1)" <<'PY'
import hashlib, json, os, sys, datetime
B, P7, D, head, nvcc = sys.argv[1:]
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
rec = {
  'kind': 'gpu-phase8 final binary',
  't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
  'sourceCommit': head,
  'protocolVersion': 3,
  'binary': {'path': f'{B}/gb8', 'sha256': sha(f'{B}/gb8')},
  'compat': {'digest': D},
  'builds': [sha(f'{B}/gb8'), sha(f'{B}/gb8-rebuild')],
  'reproducible': sha(f'{B}/gb8') == sha(f'{B}/gb8-rebuild'),
  'testBinaries': {'dev': sha(f'{B}/gb8-dev'), 'perturbed': sha(f'{B}/gb8-perturbed'), 'stale': sha(f'{B}/gb8-stale')},
  'previousAccepted': {'path': P7, 'sha256': sha(P7), 'protocolVersion': 2},
  'nvcc': nvcc,
  'kernels': 'changed: the staged-stop@1 rule (gb_common.cuh Staged; gb_d1.cuh fill / after-session; gb_growth.cuh gOnEntry / after-session / exit events)'
}
out = 'research/gpu-phase8/results/final-binary.json'
if os.path.exists(out): os.chmod(out, 0o644)
open(out, 'w').write(json.dumps(rec, indent=1) + '\n')
os.chmod(out, 0o444)
with open('research/gpu-phase8/results/seals.jsonl', 'a') as f:
    f.write(json.dumps({'t': rec['t'], 'file': out, 'sha256': sha(out)}) + '\n')
print(json.dumps({x: rec[x] for x in ('binary', 'reproducible')}))
PY
rm -f "$B/gb8-rebuild"
