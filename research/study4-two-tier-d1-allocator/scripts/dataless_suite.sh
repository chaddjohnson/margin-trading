#!/usr/bin/env bash
# Runs the repository-wide test suite in a data-less git worktree (the generic suite reads full-history data files, which
# would include embargoed 2024–2026 bars in the main checkout; here data/ holds only partitions.json).
#
#   research/study4-two-tier-d1-allocator/scripts/dataless_suite.sh <worktree> <output-file> [base|study4]
#
# <worktree> must be a git worktree of this repository (detached at the Study 4 base commit) with node_modules linked.
# `base` runs the suite as committed at the base commit (inherited failures); `study4` first copies in the Study 4 source
# and research namespaces and package.json from the main checkout (read-only for the main checkout).
set -euo pipefail

worktree=$1
out=$2
mode=${3:-study4}
repo=$(git rev-parse --show-toplevel)

if [ -n "$(find "$worktree/data" -type f ! -name partitions.json | head -1)" ]; then
  echo "refused: $worktree/data holds market data" >&2
  exit 1
fi

if [ "$mode" = study4 ]; then
  rsync -a --delete "$repo/src/study4-two-tier-d1-allocator/" "$worktree/src/study4-two-tier-d1-allocator/"
  rsync -a --delete --exclude results/archive "$repo/research/study4-two-tier-d1-allocator/" "$worktree/research/study4-two-tier-d1-allocator/"
  cp "$repo/package.json" "$worktree/package.json"
fi

cd "$worktree"
{
  date -u +%Y-%m-%dT%H:%M:%SZ
  git rev-parse HEAD
  echo "mode $mode"
  node --version
  nice -n 19 node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-concurrency=4 \
    --test-timeout=180000 'src/**/*.test.ts' && echo "exit 0" || echo "exit $?"
  date -u +%Y-%m-%dT%H:%M:%SZ
} > "$out" 2>&1
