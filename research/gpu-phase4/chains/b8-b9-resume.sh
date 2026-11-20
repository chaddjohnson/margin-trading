#!/bin/bash
# gpu-phase4 stages B8–B9 RESUMED after amendment A2 (the FULL guard file read-only again): the remaining lines of
# chains/b3-b9.sh, unchanged except the B8 group names (r1b-w8, r2b-w<w2>: reruns of the refused r1-w8).
source /home/chad/projects/margin-trading/research/gpu-phase4/chains/lib.sh
D=./research/gpu-phase4/results/decisions/b2r.json
W2=$(T -e 'const d=require("'"$D"'"); console.log(d.perK.find(p=>p.k===2).best.w)')
RX="--door FULL --mix detail+risk --tasks 16384 --rounds 3 --parity-n 24"
bench r1b-w8 TOOL=poolbench K=1 MODE=pool JOB=pool:FULL:detail+risk HW=8 B=8192 VRAM=9216 RSS=10240 MEMMAX=14 EXTRA="$RX"
AGAINST=r1b-w8 bench "r2b-w$W2" TOOL=poolbench K=2 MODE=pool JOB=pool:FULL:detail+risk HW="$W2" B=8192 VRAM=9216 RSS=10240 MEMMAX=14 EXTRA="$RX"
/bin/bash research/gpu-phase4/chains/b9.sh || { echo "$(ts) FAILED b9"; exit 1; }
echo "$(ts) chain b8-b9-resume complete"
