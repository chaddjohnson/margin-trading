#!/bin/bash
# Assignment 2: give the integration worktree the git-ignored inputs of the main checkout (temporary; removed with the
# worktree at the end). Read-only towards the main checkout: it only reads from it, never writes there.
#   - node_modules (root and Strategy Lab): REAL copies (GPU Phase 9 amendment A2: Strategy Lab's implementation-
#     fingerprint tests trace every module a run loads and refuse paths outside the checkout, so links fail them)
#   - state/strategy-lab/imports/study8: a read-only copy of the live state's Study 8 imports (amendment A2: the e2e server
#     imports the latest vg-balanced replay from there into its own temporary state; without it 9 e2e tests skip)
#   - src/four-family/generated: copies (self-ignored generated sources)
#   - data/<SYM>/ and data/archive/: REAL copies (a repo-copy test writes through symlinks); data/vintages/ is not copied
#   - .cache: a directory of links to the main checkout's per-study caches (the same exposure as running the suite there)
#   - git-ignored research inputs except raw-large/, logs/, cache/ and the staged-stop branch's leftovers: real copies
#   - the 0444 mode of every tracked file that is 0444 in the main checkout, after a content check
set -euo pipefail
M=/home/chad/projects/margin-trading
W=/home/chad/.local/share/margin-trading-worktrees/a2-integration
cd "$W"
[ "$(git rev-parse --show-toplevel)" = "$W" ] || { echo "not the worktree"; exit 1; }
rm -rf node_modules apps/strategy-lab/node_modules
cp -a "$M/node_modules" node_modules
cp -a "$M/apps/strategy-lab/node_modules" apps/strategy-lab/node_modules
mkdir -p state/strategy-lab/imports && rm -rf state/strategy-lab/imports/study8 && cp -a "$M/state/strategy-lab/imports/study8" state/strategy-lab/imports/study8
cp -a "$M"/src/four-family/generated/. src/four-family/generated/
mkdir -p data
for d in "$M"/data/*/; do
  n=$(basename "$d"); [ "$n" = vintages ] && continue
  rm -rf "data/$n"; cp -a "$d" "data/$n"
done
for f in "$M"/data/*.json "$M"/data/*.log "$M"/data/download.sh; do [ -f "$f" ] && cp -a "$f" data/; done
# .cache: a real (ignored) directory of per-study links (a bare symlink would show as untracked)
mkdir -p .cache
for d in "$M"/.cache/*/; do n=$(basename "$d"); ln -sfn "$M/.cache/$n" ".cache/$n"; done
( cd "$M" && git status --ignored --porcelain | awk '/^!!/{print $2}' | grep '^research/' \
    | grep -v -E '^research/(gpu-phase8|vg-l0-staged-stop)/|raw-large|/logs/?$|/cache/?$|/cache/|DS_Store' ) > "$W/.git-ignored-inputs.txt" || true
while read -r p; do
  mkdir -p "$(dirname "${p%/}")"
  cp -a "$M/${p%/}" "$(dirname "${p%/}")/"
done < "$W/.git-ignored-inputs.txt"
rm -f "$W/.git-ignored-inputs.txt"
# sealed modes: every tracked 0444 file of the main checkout whose bytes equal the worktree's
python3 -I - "$M" "$W" <<'PY'
import os, subprocess, filecmp, stat, sys
M, W = sys.argv[1:]
n = bad = 0
for f in subprocess.run(['git', '-C', M, 'ls-files', '-z'], capture_output=True).stdout.split(b'\0'):
    if not f: continue
    f = f.decode(); p = os.path.join(M, f)
    try: st = os.lstat(p)
    except FileNotFoundError: continue
    if stat.S_ISREG(st.st_mode) and (st.st_mode & 0o777) == 0o444:
        q = os.path.join(W, f)
        if filecmp.cmp(p, q, shallow=False): os.chmod(q, 0o444); n += 1
        else: bad += 1; print('mode not mirrored (content differs):', f)
print('0444 mirrored', n, 'differing', bad)
PY
# the accepted Phase 7 dataset-export metadata (the manual-eval test compares FULL's export with it)
mkdir -p research/gpu-phase7/cache && cp -a "$M"/research/gpu-phase7/cache/*.gb2ds.json research/gpu-phase7/cache/
for s in VGT GDX; do cmp -s "$M/data/$s/data.csv" "data/$s/data.csv" && echo "data/$s identical"; done
