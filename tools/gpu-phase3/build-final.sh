#!/usr/bin/env bash
# gpu-phase3: builds the FINAL evaluator binary from the committed tree and seals results/final-binary.json —
#   - research/gpu-phase3/build/gb3 with the tree's compatibility digest, built twice (reproducible: equal sha256);
#   - gb3-dev (the same binary; the dev role enables test hooks at run time), gb3-perturbed (GB_TEST_PERTURB, the
#     negative tests' wrong kernel) and gb3-stale (another digest, the negative tests' stale build);
#   - kernel identity with the accepted Phase 2 binary (research/gpu-phase2/build/gb2): the device code section
#     (.nv_fatbin) and its SASS disassembly byte for byte — the CUDA sources are unchanged, only the host digest string
#     compiled into the server differs, so Phase 2's kernel evidence (incl. its 8 h endurance run) applies to the kernels.
#   tools/gpu-phase3/build-final.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TK=${GPU_BACKEND_CUDA_HOME:-/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit}
B=research/gpu-phase3/build
P2=research/gpu-phase2/build/gb2
mkdir -p "$B"
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "commit the source first" >&2; exit 1; }
D=$("$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh "$B/gb3" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb3-rebuild" "$D" > /dev/null
cp -f "$B/gb3" "$B/gb3-dev"
GB_EXTRA_DEFINES=-DGB_TEST_PERTURB tools/gpu-backend/build.sh "$B/gb3-perturbed" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb3-stale" stale-digest-for-negative-test > /dev/null
S=research/gpu-phase3/cache/kernel-identity; rm -rf "$S"; mkdir -p "$S"
for x in gb3 gb2; do
  f=$([ $x = gb2 ] && echo "$P2" || echo "$B/gb3")
  # objcopy rewrites its input in place: it only ever runs on a temporary copy
  cp "$f" "$S/$x.elf"
  objcopy --dump-section .nv_fatbin="$S/$x.fatbin" "$S/$x.elf"
  "$TK/bin/cuobjdump" -sass "$S/$x.elf" | grep -v "^\s*$" > "$S/$x.sass"
done
sha() { sha256sum "$1" | cut -d' ' -f1; }
python3 - "$B" "$P2" "$D" "$S" "$(git rev-parse HEAD)" "$("$TK/bin/nvcc" --version | tail -2 | head -1)" <<'PY'
import hashlib, json, os, sys, datetime
B, P2, D, S, head, nvcc = sys.argv[1:]
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
rec = {
  'kind': 'gpu-phase3 final binary',
  't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
  'sourceCommit': head,
  'binary': {'path': f'{B}/gb3', 'sha256': sha(f'{B}/gb3')},
  'compat': {'digest': D},
  'builds': [sha(f'{B}/gb3'), sha(f'{B}/gb3-rebuild')],
  'reproducible': sha(f'{B}/gb3') == sha(f'{B}/gb3-rebuild'),
  'testBinaries': {'dev': sha(f'{B}/gb3-dev'), 'perturbed': sha(f'{B}/gb3-perturbed'), 'stale': sha(f'{B}/gb3-stale')},
  'nvcc': nvcc,
  'kernels': {
    'phase2Binary': {'path': P2, 'sha256': sha(P2)},
    'fatbin': {'gb3': sha(f'{S}/gb3.fatbin'), 'gb2': sha(f'{S}/gb2.fatbin'), 'bytes': os.path.getsize(f'{S}/gb3.fatbin')},
    'fatbinIdenticalToPhase2': sha(f'{S}/gb3.fatbin') == sha(f'{S}/gb2.fatbin'),
    'sass': {'gb3': sha(f'{S}/gb3.sass'), 'gb2': sha(f'{S}/gb2.sass'), 'lines': sum(1 for _ in open(f'{S}/gb3.sass'))},
    'sassIdenticalToPhase2': sha(f'{S}/gb3.sass') == sha(f'{S}/gb2.sass')
  }
}
out = 'research/gpu-phase3/results/final-binary.json'
if os.path.exists(out): os.chmod(out, 0o644)
open(out, 'w').write(json.dumps(rec, indent=1) + '\n')
os.chmod(out, 0o444)
with open('research/gpu-phase3/results/seals.jsonl', 'a') as f:
    f.write(json.dumps({'t': rec['t'], 'file': out, 'sha256': sha(out)}) + '\n')
print(json.dumps({k: rec[k] for k in ('binary', 'reproducible')} | {'kernelsIdentical': rec['kernels']['fatbinIdenticalToPhase2'] and rec['kernels']['sassIdenticalToPhase2']}))
PY
rm -rf "$S" "$B/gb3-rebuild"
