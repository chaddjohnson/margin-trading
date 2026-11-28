#!/bin/bash
# P8-GDX report-only diagnostics (PROTOCOL §16), after the sealed outcome: bh, tail, lots (CPU, purpose diagnostic) and
# nbhd (non-official GPU, purpose diagnostic). Fail-fast: each step's status is tested. Run it contained:
#   tools/gdx-d1-growth/launch.sh gdx8-diag $PWD/research/gdx-d1-growth/cache/logs/diag.log --wait -- /bin/bash $PWD/tools/gdx-d1-growth/diag.sh
# Outputs: research/gdx-d1-growth/reports/diagnostics/. Rerunning overwrites only those report-only outputs.
cd "$(dirname "$0")/../.." || exit 1
export GPU_POLICY_PURPOSE=diagnostic
unset GDX8_DIAG_TEST
for c in bh tail lots nbhd; do
  echo "=== $(date -u +%FT%TZ) begin $c"
  npm run gdx8-diag -- "$c"
  rc=$?
  echo "=== $(date -u +%FT%TZ) end [$rc] $c"
  [ "$rc" -eq 0 ] || { echo "=== DIAG FAILED at $c"; exit "$rc"; }
done
echo "=== DIAG COMPLETE"
