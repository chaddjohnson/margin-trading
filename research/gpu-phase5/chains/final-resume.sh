#!/bin/bash
# gpu-phase5 stage C RESUMED after amendment A4: the rest of the parity campaign (chains/parity-resume.sh: passed runs
# skipped, D24-fund rerun as D24-fund-r2, the remaining runs; a mismatch recorded with its attribution, the chain goes
# on), the parity summary (recorded; it includes the failed run), then the frozen campaign from step 5 (finalists) on.
#   MODEA_K=2 MODEA_W=8 tools/gpu-phase5/launch-slice.sh p5chain-final-resume <abs log> -- /bin/bash research/gpu-phase5/chains/final-resume.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
export GPU_POLICY_PURPOSE=parity-test
L=/home/chad/projects/margin-trading/research/gpu-phase5/results/logs/final
R=research/gpu-phase5/results
[ -z "$(git status --porcelain -- src tools config)" ] || { echo "FAILED: the source is not committed"; exit 1; }
echo "$(date -u +%FT%TZ) start [parity-resume]"
/usr/bin/env HW=8 PARITY_OUT=$R/parity/final PARITY_LOG=$L/parity /bin/bash research/gpu-phase5/chains/parity-resume.sh
echo "$(date -u +%FT%TZ) end [parity-resume]"
"$NODE" --no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase5/parity-summary.ts $R/parity/final
echo "$(date -u +%FT%TZ) parity-summary status $? (recorded; not gating the rest of the evidence)"
/usr/bin/env START=5 MODEA_K=${MODEA_K:-2} MODEA_W=${MODEA_W:-8} /bin/bash research/gpu-phase5/chains/final.sh
echo "$(date -u +%FT%TZ) chain final-resume complete (final.sh status $?)"
