#!/bin/bash
# gpu-phase4 stage B2r (PROTOCOL.md §5, §8): the repeat (r2) of the best allocation (rule R2 on B2) of each k ≥ 2, then
# R2/R3 over every B2 and B2r run (results/decisions/b2r.json: the per-k allocations and the Mode A candidate k*).
source /home/chad/projects/margin-trading/research/gpu-phase4/chains/lib.sh
D=research/gpu-phase4/results/decisions/b2.json
V=$(T -e 'console.log(require("./research/gpu-phase4/results/bench/ftw1-r1/gate.json").admissionNext.vramMiB)')
R=$(T -e 'console.log(require("./research/gpu-phase4/results/bench/ftw1-r1/gate.json").admissionNext.rssMiB)')
C=(MODE=ss JOB=a3:C19:broad1 B=8192 STOP=300000 VRAM="$V" RSS="$R")
G=ss1-w8,ss2-w8,ss2-w4,ss3-w8,ss3-w5,ss3-w3,ss4-w8,ss4-w4,ss4-w2,ss1-w8-r2
for k in 2 3 4; do
  w=$(T -e 'const d=require("./'"$D"'"); console.log(d.perK.find(p=>p.k==='"$k"').best.w)')
  bench "ss$k-w$w-r2" K=$k HW="$w" "${C[@]}"
  G="$G,ss$k-w$w-r2"
done
T tools/gpu-phase4/decide.ts --groups "$G" --out research/gpu-phase4/results/decisions/b2r.json
echo "$(ts) chain b2r complete"
