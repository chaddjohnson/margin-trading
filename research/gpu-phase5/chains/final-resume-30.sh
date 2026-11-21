#!/bin/bash
# gpu-phase5 stage A — resume of chains/final.sh after its step 29 stopped on a shell error of chains/isolation.sh
# (amendment A4): the two I7 dataset tests through chains/isolation-i7.sh (I1–I6 passed and are not rerun), then
# chains/final.sh from step 30 (unchanged; steps 1–28 passed and are not rerun).
#   tools/gpu-phase5/launch.sh p5chain-final-r1 <abs log> -- /bin/bash research/gpu-phase5/chains/final-resume-30.sh
cd /home/chad/projects/margin-trading
echo "$(date -u +%FT%TZ) start 29b [isolation-i7]"
/bin/bash research/gpu-phase5/chains/isolation-i7.sh
st=$?
echo "$(date -u +%FT%TZ) end 29b [isolation-i7] status $st"
[ $st -eq 0 ] || { echo "FAILED 29b [isolation-i7]"; exit 1; }
exec /usr/bin/env START=30 MODEA_K=2 MODEA_W=8 /bin/bash research/gpu-phase5/chains/final.sh
