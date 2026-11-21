#!/usr/bin/env bash
# gpu-phase5 (PROTOCOL.md §10.1): builds the FINAL evaluator binary from the committed tree and seals
# results/final-binary.json (a copy of tools/gpu-phase3/build-final.sh with this study's namespace) —
#   - research/gpu-phase5/build/gb5 with the tree's compatibility digest, built twice (reproducible: equal sha256);
#   - gb5-dev (the same binary; the dev role enables test hooks at run time), gb5-perturbed (GB_TEST_PERTURB, the
#     negative tests' wrong kernel) and gb5-stale (another digest, the negative tests' stale build);
#   - kernel identity with the accepted Phase 3 binary (research/gpu-phase3/build/gb3, sha256 06a4a04a…) and the Phase 2
#     binary (research/gpu-phase2/build/gb2): the device code section (.nv_fatbin) and its SASS disassembly byte for
#     byte — the CUDA sources are unchanged, only the host digest string compiled into the server differs, so the
#     accepted kernel evidence (Phase 2's campaign and 8 h run, Phase 3's campaign) applies to the kernels.
#   tools/gpu-phase5/build-final.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TK=${GPU_BACKEND_CUDA_HOME:-/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit}
B=research/gpu-phase5/build
P3=research/gpu-phase3/build/gb3
P2=research/gpu-phase2/build/gb2
mkdir -p "$B"
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "commit the source first" >&2; exit 1; }
[ "$(sha256sum "$P3" | cut -d' ' -f1)" = 06a4a04a83265616ab363632c02bf5d7737f34ec12156655cf95e135dde0dc23 ] || { echo "the accepted Phase 3 binary changed" >&2; exit 1; }
D=$("$NODE" --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning src/gpu-backend/compat.ts --digest)
tools/gpu-backend/build.sh "$B/gb5" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb5-rebuild" "$D" > /dev/null
cp -f "$B/gb5" "$B/gb5-dev"
GB_EXTRA_DEFINES=-DGB_TEST_PERTURB tools/gpu-backend/build.sh "$B/gb5-perturbed" "$D" > /dev/null
tools/gpu-backend/build.sh "$B/gb5-stale" stale-digest-for-negative-test > /dev/null
S=research/gpu-phase5/cache/kernel-identity; rm -rf "$S"; mkdir -p "$S"
for x in gb5 gb3 gb2; do
  case $x in gb5) f="$B/gb5" ;; gb3) f="$P3" ;; gb2) f="$P2" ;; esac
  # objcopy rewrites its input in place: it only ever runs on a temporary copy
  cp "$f" "$S/$x.elf"
  objcopy --dump-section .nv_fatbin="$S/$x.fatbin" "$S/$x.elf"
  "$TK/bin/cuobjdump" -sass "$S/$x.elf" | grep -v "^\s*$" > "$S/$x.sass"
done
python3 - "$B" "$P3" "$P2" "$D" "$S" "$(git rev-parse HEAD)" "$("$TK/bin/nvcc" --version | tail -2 | head -1)" <<'PY'
import hashlib, json, os, sys, datetime
B, P3, P2, D, S, head, nvcc = sys.argv[1:]
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()
rec = {
  'kind': 'gpu-phase5 final binary',
  't': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
  'sourceCommit': head,
  'binary': {'path': f'{B}/gb5', 'sha256': sha(f'{B}/gb5')},
  'compat': {'digest': D},
  'builds': [sha(f'{B}/gb5'), sha(f'{B}/gb5-rebuild')],
  'reproducible': sha(f'{B}/gb5') == sha(f'{B}/gb5-rebuild'),
  'testBinaries': {'dev': sha(f'{B}/gb5-dev'), 'perturbed': sha(f'{B}/gb5-perturbed'), 'stale': sha(f'{B}/gb5-stale')},
  'nvcc': nvcc,
  'kernels': {
    'phase3Binary': {'path': P3, 'sha256': sha(P3)},
    'phase2Binary': {'path': P2, 'sha256': sha(P2)},
    'fatbin': {'gb5': sha(f'{S}/gb5.fatbin'), 'gb3': sha(f'{S}/gb3.fatbin'), 'gb2': sha(f'{S}/gb2.fatbin'), 'bytes': os.path.getsize(f'{S}/gb5.fatbin')},
    'fatbinIdenticalToPhase3': sha(f'{S}/gb5.fatbin') == sha(f'{S}/gb3.fatbin'),
    'fatbinIdenticalToPhase2': sha(f'{S}/gb5.fatbin') == sha(f'{S}/gb2.fatbin'),
    'sass': {'gb5': sha(f'{S}/gb5.sass'), 'gb3': sha(f'{S}/gb3.sass'), 'gb2': sha(f'{S}/gb2.sass'), 'lines': sum(1 for _ in open(f'{S}/gb5.sass'))},
    'sassIdenticalToPhase3': sha(f'{S}/gb5.sass') == sha(f'{S}/gb3.sass'),
    'sassIdenticalToPhase2': sha(f'{S}/gb5.sass') == sha(f'{S}/gb2.sass')
  }
}
out = 'research/gpu-phase5/results/final-binary.json'
if os.path.exists(out): os.chmod(out, 0o644)
open(out, 'w').write(json.dumps(rec, indent=1) + '\n')
os.chmod(out, 0o444)
with open('research/gpu-phase5/results/seals.jsonl', 'a') as f:
    f.write(json.dumps({'t': rec['t'], 'file': out, 'sha256': sha(out)}) + '\n')
k = rec['kernels']
print(json.dumps({x: rec[x] for x in ('binary', 'reproducible')} | {'kernelsIdenticalToPhase3': k['fatbinIdenticalToPhase3'] and k['sassIdenticalToPhase3'], 'kernelsIdenticalToPhase2': k['fatbinIdenticalToPhase2'] and k['sassIdenticalToPhase2']}))
PY
rm -rf "$S" "$B/gb5-rebuild"
