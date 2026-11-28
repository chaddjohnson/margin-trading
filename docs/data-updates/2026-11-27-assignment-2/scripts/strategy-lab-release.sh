#!/bin/bash
# Assignment 2 Stage F: prepares an immutable Strategy Lab RELEASE checkout of an accepted `main` commit for the permanent
# systemd user service. The release is a detached, LOCKED git worktree of the repository, so the service never runs a
# mutable research checkout. It shares only what must be shared: the canonical market data and the live state.
#   strategy-lab-release.sh <commit>            prints the release directory on success
# What it does (nothing in the main checkout is written):
#   1. git worktree add --detach ~/.local/share/strategy-lab/releases/<sha12> <commit>; git worktree lock
#   2. node_modules (root, Strategy Lab): REAL copies of the main checkout's (same package-lock.json, verified), never links
#   3. src/four-family/generated: copies (self-ignored generated sources)
#   4. data/<SYMBOL> -> the main checkout's data/<SYMBOL> (ONE canonical file per symbol; the server only reads them; no
#      test ever runs here; data/partitions.json is the release's own tracked copy); .cache/<study> -> the main
#      checkout's per-study caches (the shared cache, as when the server ran there)
#   5. the sealed files' 0444 mode, mirrored from the main checkout after a content check (Priority 3's FULL door and
#      the portfolio runner refuse writable seals)
#   6. the UI: vite build into the release's apps/strategy-lab/dist
set -euo pipefail
M=/home/chad/projects/margin-trading
COMMIT=$(git -C "$M" rev-parse --verify "${1:?usage: strategy-lab-release.sh <commit>}^{commit}")
REL=/home/chad/.local/share/strategy-lab/releases/${COMMIT:0:12}
[ -e "$REL" ] && { echo "release exists: $REL" >&2; exit 1; }
mkdir -p "$(dirname "$REL")"
git -C "$M" worktree add --detach "$REL" "$COMMIT" >&2
git -C "$M" worktree lock --reason "Strategy Lab service release of $COMMIT (Assignment 2 Stage F); do not prune" "$REL"
cd "$REL"
for f in package-lock.json apps/strategy-lab/package-lock.json; do
  cmp -s "$M/$f" "$REL/$f" || { echo "the main checkout's $f differs from the release's: node_modules cannot be copied" >&2; exit 1; }
done
cp -a "$M/node_modules" node_modules
cp -a "$M/apps/strategy-lab/node_modules" apps/strategy-lab/node_modules
cp -a "$M"/src/four-family/generated/. src/four-family/generated/
cmp -s "$M/data/partitions.json" data/partitions.json || { echo "data/partitions.json differs from the main checkout's" >&2; exit 1; }
for d in "$M"/data/*/; do n=$(basename "$d"); [ "$n" = vintages ] && continue; ln -s "$M/data/$n" "data/$n"; done
mkdir -p .cache
for d in "$M"/.cache/*/; do n=$(basename "$d"); ln -s "$M/.cache/$n" ".cache/$n"; done
python3 -I - "$M" "$REL" <<'PY'
import os, subprocess, filecmp, stat, sys
M, R = sys.argv[1:]
n = bad = 0
for f in subprocess.run(['git', '-C', M, 'ls-files', '-z'], capture_output=True).stdout.split(b'\0'):
    if not f: continue
    f = f.decode(); p = os.path.join(M, f); q = os.path.join(R, f)
    try: st = os.lstat(p)
    except FileNotFoundError: continue
    if stat.S_ISREG(st.st_mode) and (st.st_mode & 0o777) == 0o444 and os.path.isfile(q):
        if filecmp.cmp(p, q, shallow=False): os.chmod(q, 0o444); n += 1
        else: bad += 1
print(f'sealed 0444 mirrored: {n}; content differs (left writable): {bad}', file=sys.stderr)
PY
# the seals the main checkout does not have yet (e.g. research/gpu-phase9/): the repository's own tool restores 0444 on
# exactly the hash-verified, tracked, unmodified sealed files of every study's seals.jsonl
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/seal-protect.ts --apply --out "$REL/.seal-protect.json" >&2
rm -f "$REL/.seal-protect.json"
(cd apps/strategy-lab && npx vite build >&2)
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "the release is not a clean checkout of $COMMIT" >&2; exit 1; }
echo "$REL"
