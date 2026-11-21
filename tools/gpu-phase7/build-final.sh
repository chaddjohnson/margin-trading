#!/usr/bin/env bash
# gpu-phase7 (PROTOCOL.md §6 gate B1): builds the FINAL evaluator binary from the committed tree and seals
# results/final-binary.json (a copy of tools/gpu-phase5/build-final.sh with this study's namespace) —
#   - research/gpu-phase7/build/gb7 with the tree's compatibility digest, built twice (reproducible: equal sha256);
#   - gb7-dev (the same binary; the dev role enables test hooks at run time), gb7-perturbed (GB_TEST_PERTURB, the
#     negative tests' wrong kernel) and gb7-stale (another digest, the negative tests' stale build);
#   - kernel identity with the accepted Phase 5/6 binary (research/gpu-phase5/build/gb5, sha256 f444c521…): the device
#     code section (.nv_fatbin) and its SASS disassembly byte for byte — the CUDA sources are unchanged (the change is the
#     host path's pool.ts and the default binary path in toolchain.ts), only the host digest string compiled into the
#     server differs, so the device code the earlier campaigns verified is the device code of gb7.
#   tools/gpu-phase7/build-final.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TK=${GPU_BACKEND_CUDA_HOME:-/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit}
B=research/gpu-phase7/build
P5=research/gpu-phase5/build/gb5
mkdir -p "$B" research/gpu-phase7/results
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "commit the source first" >&2; exit 1; }
[ "$(sha256sum "$P5" | cut -d' ' -f1)" = f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e ] || { echo "the accepted Phase 5 binary changed" >&2; exit 1; }
D=$("$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh "$B/gb7" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb7-rebuild" "$D" > /dev/null
cp -f "$B/gb7" "$B/gb7-dev"
GB_EXTRA_DEFINES=-DGB_TEST_PERTURB tools/gpu-backend/build.sh "$B/gb7-perturbed" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb7-stale" stale-digest-for-negative-test > /dev/null
S=research/gpu-phase7/cache/kernel-identity; rm -rf "$S"; mkdir -p "$S"
for x in gb7 gb5; do
  case $x in gb7) f="$B/gb7" ;; gb5) f="$P5" ;; esac
  # objcopy rewrites its input in place: it only ever runs on a temporary copy
  cp "$f" "$S/$x.elf"
  objcopy --dump-section .nv_fatbin="$S/$x.fatbin" "$S/$x.elf"
  "$TK/bin/cuobjdump" -sass "$S/$x.elf" | grep -v "^\s*$" > "$S/$x.sass"
done
python3 -I - "$B" "$P5" "$D" "$S" "$(git rev-parse HEAD)" "$("$TK/bin/nvcc" --version | tail -2 | head -1)" <<'PY'
import hashlib, json, os, sys, datetime
B, P5, D, S, head, nvcc = sys.argv[1:]
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
rec = {
  'kind': 'gpu-phase7 final binary',
  't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
  'sourceCommit': head,
  'binary': {'path': f'{B}/gb7', 'sha256': sha(f'{B}/gb7')},
  'compat': {'digest': D},
  'builds': [sha(f'{B}/gb7'), sha(f'{B}/gb7-rebuild')],
  'reproducible': sha(f'{B}/gb7') == sha(f'{B}/gb7-rebuild'),
  'testBinaries': {'dev': sha(f'{B}/gb7-dev'), 'perturbed': sha(f'{B}/gb7-perturbed'), 'stale': sha(f'{B}/gb7-stale')},
  'nvcc': nvcc,
  'kernels': {
    'phase5Binary': {'path': P5, 'sha256': sha(P5)},
    'fatbin': {'gb7': sha(f'{S}/gb7.fatbin'), 'gb5': sha(f'{S}/gb5.fatbin'), 'bytes': os.path.getsize(f'{S}/gb7.fatbin')},
    'fatbinIdenticalToPhase5': sha(f'{S}/gb7.fatbin') == sha(f'{S}/gb5.fatbin'),
    'sass': {'gb7': sha(f'{S}/gb7.sass'), 'gb5': sha(f'{S}/gb5.sass'), 'lines': sum(1 for _ in open(f'{S}/gb7.sass'))},
    'sassIdenticalToPhase5': sha(f'{S}/gb7.sass') == sha(f'{S}/gb5.sass')
  }
}
out = 'research/gpu-phase7/results/final-binary.json'
if os.path.exists(out): os.chmod(out, 0o644)
open(out, 'w').write(json.dumps(rec, indent=1) + '\n')
os.chmod(out, 0o444)
with open('research/gpu-phase7/results/seals.jsonl', 'a') as f:
    f.write(json.dumps({'t': rec['t'], 'file': out, 'sha256': sha(out)}) + '\n')
k = rec['kernels']
print(json.dumps({x: rec[x] for x in ('binary', 'reproducible')} | {'kernelsIdenticalToPhase5': k['fatbinIdenticalToPhase5'] and k['sassIdenticalToPhase5']}))
PY
rm -rf "$S" "$B/gb7-rebuild"
