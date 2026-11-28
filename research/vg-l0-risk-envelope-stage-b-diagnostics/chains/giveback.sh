#!/bin/bash
# RES-BD 1.0.0 S3 for one cutoff (CUT=C19|C21|C24): the bounded CPU replays of Diagnostic B (purpose diagnostic;
# never official evidence) — needs S2's qualification intermediate for the bit-for-bit parity. Fail-fast.
set -euo pipefail
R=/home/chad/projects/margin-trading
cd "$R"
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F=(--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192)
T=tools/vg-l0-risk-envelope-stage-b-diagnostics
export GPU_POLICY_PURPOSE=diagnostic
export VGL0REBD_WORKERS=${VGL0REBD_WORKERS:-8}
echo "[$(date -u +%FT%TZ)] chain giveback $CUT start (${VGL0REBD_WORKERS} workers)"
"$N" "${F[@]}" src/gpu-backend/legacyRunner.ts vg-l0rebd-giveback $T/giveback.ts --cutoff "$CUT"
echo "[$(date -u +%FT%TZ)] chain giveback $CUT done"
