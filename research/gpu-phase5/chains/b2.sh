#!/bin/bash
# gpu-phase5 stage B2 (PROTOCOL.md §5): the steady-state matrix on the Assignment 3 job — k identical independent jobs,
# each a 300,000-fresh-evaluation prefix of the complete job, k = 1 → 2 → 3 → 4 with the declared worker allocations,
# then the k = 1 drift check. Admission needs from B1's gate (1.15 × measured). Fail-fast: a failed verification,
# admission or safety margin stops the higher levels.
source /home/chad/projects/margin-trading/research/gpu-phase5/chains/lib.sh
V=$(T -e 'console.log(require("./research/gpu-phase5/results/bench/ftw1-r1/gate.json").admissionNext.vramMiB)')
R=$(T -e 'console.log(require("./research/gpu-phase5/results/bench/ftw1-r1/gate.json").admissionNext.rssMiB)')
echo "$(ts) admission needs per job: VRAM $V MiB, host $R MiB"
C=(MODE=ss JOB=a3:C19:broad1 B=8192 STOP=300000 VRAM="$V" RSS="$R")
bench ss1-w8 K=1 HW=8 "${C[@]}"
bench ss2-w8 K=2 HW=8 "${C[@]}"
bench ss2-w4 K=2 HW=4 "${C[@]}"
bench ss3-w8 K=3 HW=8 "${C[@]}"
bench ss3-w5 K=3 HW=5 "${C[@]}"
bench ss3-w3 K=3 HW=3 "${C[@]}"
bench ss4-w8 K=4 HW=8 "${C[@]}"
bench ss4-w4 K=4 HW=4 "${C[@]}"
bench ss4-w2 K=4 HW=2 "${C[@]}"
bench ss1-w8-r2 K=1 HW=8 "${C[@]}"
T tools/gpu-phase5/decide.ts --groups ss1-w8,ss2-w8,ss2-w4,ss3-w8,ss3-w5,ss3-w3,ss4-w8,ss4-w4,ss4-w2,ss1-w8-r2 \
  --out research/gpu-phase5/results/decisions/b2.json
echo "$(ts) chain b2 complete"
