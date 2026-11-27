#!/usr/bin/env bash
# gpu-phase9 (PROTOCOL.md §6 gate B1): builds the FINAL evaluator binary from the committed tree and seals
# results/final-binary.json (a copy of tools/gpu-phase7/build-final.sh with this study's namespace) —
#   - research/gpu-phase9/build/gb9 with the tree's compatibility digest, built twice (reproducible: equal sha256);
#   - gb9-dev (the same binary; the dev role enables test hooks at run time), gb9-perturbed (GB_TEST_PERTURB, the
#     negative tests' wrong kernel) and gb9-stale (another digest, the negative tests' stale build);
#   - kernel identity with the binary of the record in force, GPU Phase 7's research/gpu-phase7/build/gb7 (sha256
#     cb2ff30b…, whose kernels Phase 7 proved identical to Phase 5's gb5): the device code section (.nv_fatbin) and its
#     SASS disassembly byte for byte. The CUDA sources are unchanged (the change is in the CPU closure: the FULL door's
#     verified byte prefix and the loaders' bounds, and the default binary path in toolchain.ts); only the evaluation
#     digest string compiled into the server differs, so the device code the earlier campaigns verified is gb9's.
#   tools/gpu-phase9/build-final.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TK=${GPU_BACKEND_CUDA_HOME:-/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit}
B=research/gpu-phase9/build
P7=research/gpu-phase7/build/gb7
mkdir -p "$B" research/gpu-phase9/results
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "commit the source first" >&2; exit 1; }
[ "$(sha256sum "$P7" | cut -d' ' -f1)" = cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82 ] || { echo "the accepted Phase 7 binary changed" >&2; exit 1; }
D=$("$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh "$B/gb9" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb9-rebuild" "$D" > /dev/null
cp -f "$B/gb9" "$B/gb9-dev"
GB_EXTRA_DEFINES=-DGB_TEST_PERTURB tools/gpu-backend/build.sh "$B/gb9-perturbed" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb9-stale" stale-digest-for-negative-test > /dev/null
S=research/gpu-phase9/cache/kernel-identity; rm -rf "$S"; mkdir -p "$S"
for x in gb9 gb7; do
  case $x in gb9) f="$B/gb9" ;; gb7) f="$P7" ;; esac
  # objcopy rewrites its input in place: it only ever runs on a temporary copy
  cp "$f" "$S/$x.elf"
  objcopy --dump-section .nv_fatbin="$S/$x.fatbin" "$S/$x.elf"
  "$TK/bin/cuobjdump" -sass "$S/$x.elf" | grep -v "^\s*$" > "$S/$x.sass"
done
python3 -I - "$B" "$P7" "$D" "$S" "$(git rev-parse HEAD)" "$("$TK/bin/nvcc" --version | tail -2 | head -1)" <<'PY'
import hashlib, json, os, sys, datetime
B, P7, D, S, head, nvcc = sys.argv[1:]
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
rec = {
  'kind': 'gpu-phase9 final binary',
  't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
  'sourceCommit': head,
  'binary': {'path': f'{B}/gb9', 'sha256': sha(f'{B}/gb9')},
  'compat': {'digest': D},
  'builds': [sha(f'{B}/gb9'), sha(f'{B}/gb9-rebuild')],
  'reproducible': sha(f'{B}/gb9') == sha(f'{B}/gb9-rebuild'),
  'testBinaries': {'dev': sha(f'{B}/gb9-dev'), 'perturbed': sha(f'{B}/gb9-perturbed'), 'stale': sha(f'{B}/gb9-stale')},
  'nvcc': nvcc,
  'kernels': {
    'phase7Binary': {'path': P7, 'sha256': sha(P7)},
    'fatbin': {'gb9': sha(f'{S}/gb9.fatbin'), 'gb7': sha(f'{S}/gb7.fatbin'), 'bytes': os.path.getsize(f'{S}/gb9.fatbin')},
    'fatbinIdenticalToPhase7': sha(f'{S}/gb9.fatbin') == sha(f'{S}/gb7.fatbin'),
    'sass': {'gb9': sha(f'{S}/gb9.sass'), 'gb7': sha(f'{S}/gb7.sass'), 'lines': sum(1 for _ in open(f'{S}/gb9.sass'))},
    'sassIdenticalToPhase7': sha(f'{S}/gb9.sass') == sha(f'{S}/gb7.sass')
  }
}
out = 'research/gpu-phase9/results/final-binary.json'
if os.path.exists(out): os.chmod(out, 0o644)
open(out, 'w').write(json.dumps(rec, indent=1) + '\n')
os.chmod(out, 0o444)
with open('research/gpu-phase9/results/seals.jsonl', 'a') as f:
    f.write(json.dumps({'t': rec['t'], 'file': out, 'sha256': sha(out)}) + '\n')
k = rec['kernels']
print(json.dumps({x: rec[x] for x in ('binary', 'reproducible')} | {'kernelsIdenticalToPhase7': k['fatbinIdenticalToPhase7'] and k['sassIdenticalToPhase7']}))
PY
rm -rf "$S" "$B/gb9-rebuild"
