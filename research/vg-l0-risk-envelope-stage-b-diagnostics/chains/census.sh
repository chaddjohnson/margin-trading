#!/bin/bash
# RES-BD 1.0.0 S2 for one cutoff (CUT=C19|C21|C24): verified archive copies, the census replay and the qualification
# replay — fail-fast (set -e: any failing step stops the chain). Zero evaluations.
set -euo pipefail
R=/home/chad/projects/margin-trading
cd "$R"
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F=(--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=16384)
T=tools/vg-l0-risk-envelope-stage-b-diagnostics
export GPU_POLICY_PURPOSE=diagnostic
echo "[$(date -u +%FT%TZ)] chain census $CUT start"
"$N" "${F[@]}" src/gpu-backend/legacyRunner.ts vg-l0rebd-archive $T/archive.ts copy --job "$CUT-search"
"$N" "${F[@]}" src/gpu-backend/legacyRunner.ts vg-l0rebd-archive $T/archive.ts copy --job "$CUT-qualify"
"$N" "${F[@]}" src/gpu-backend/legacyRunner.ts vg-l0rebd-census $T/census.ts --cutoff "$CUT"
"$N" "${F[@]}" src/gpu-backend/legacyRunner.ts vg-l0rebd-qualification $T/qualification.ts --cutoff "$CUT"
echo "[$(date -u +%FT%TZ)] chain census $CUT done"
