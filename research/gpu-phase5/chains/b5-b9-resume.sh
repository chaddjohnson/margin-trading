#!/bin/bash
# gpu-phase5 stages B5–B9 RESUMED after amendment A1 (the verifier fix): the remaining lines of chains/b3-b9.sh from
# a2-ss2, unchanged, with the allocations decided by the frozen rules on B2 + B2r
# (results/decisions/b2r.json): per k its best host workers per job, k* the Mode A candidate.
source /home/chad/projects/margin-trading/research/gpu-phase5/chains/lib.sh
D=./research/gpu-phase5/results/decisions/b2r.json
best() { T -e 'const d=require("'"$D"'"); const p=d.perK.find(p=>p.k==='"$1"'); console.log(p.best.w)'; }
W2=$(best 2); W3=$(best 3); W4=$(best 4)
KS=$(T -e 'const d=require("'"$D"'"); console.log(d.modeA.k)')
V=$(T -e 'console.log(require("./research/gpu-phase5/results/bench/ftw1-r1/gate.json").admissionNext.vramMiB)')
R=$(T -e 'console.log(require("./research/gpu-phase5/results/bench/ftw1-r1/gate.json").admissionNext.rssMiB)')
echo "$(ts) allocations: k=2 w$W2, k=3 w$W3, k=4 w$W4; Mode A candidate k*=$KS; admission V=$V R=$R"
A3=(JOB=a3:C19:broad1 VRAM="$V" RSS="$R")

A2=(MODE=ss JOB=a2:C19:base B=8192 STOP=400000 VRAM="$V" RSS="$R")
bench "a2-ss2-w$W2" K=2 HW="$W2" "${A2[@]}"
bench "a2-ss3-w$W3" K=3 HW="$W3" "${A2[@]}"

# ---- B6: the small-batch mini schedule (complete jobs)
MI=(JOB=mini B=8192 VRAM=3072 RSS=4096)
bench s1-w8  K=1 MODE=ss  HW=8 "${MI[@]}"
bench s2-w4  K=2 MODE=ss  HW=4 "${MI[@]}"
bench s4-w2  K=4 MODE=ss  HW=2 "${MI[@]}"
bench sf2-w4 K=2 MODE=ftw HW=4 "${MI[@]}"

# ---- B7: the kernel batch-size curve and the shared-queue question (the production pool, D19, joint, fixed tasks)
KX="--door D19 --mix joint --tasks 32768 --rounds 3"
bench k-b8192 TOOL=poolbench K=1 MODE=pool JOB=pool:D19:joint HW=8 B=8192 VRAM=7168 RSS=8192 EXTRA="$KX"
for b in 2048 4096 16384 32768; do
  vb=$(( b <= 8192 ? 7168 : (b == 16384 ? 12288 : 21504) ))
  AGAINST=k-b8192 bench "k-b$b" TOOL=poolbench K=1 MODE=pool JOB=pool:D19:joint HW=8 B=$b VRAM=$vb RSS=8192 EXTRA="$KX"
done
AGAINST=k-b8192 bench k2-b8192 TOOL=poolbench K=2 MODE=pool JOB=pool:D19:joint HW=8 B=8192 VRAM=7168 RSS=8192 EXTRA="$KX"

# ---- B8: the large-door detailed-risk stress (FULL, detail + risk)
RX="--door FULL --mix detail+risk --tasks 16384 --rounds 3 --parity-n 24"
bench r1-w8 TOOL=poolbench K=1 MODE=pool JOB=pool:FULL:detail+risk HW=8 B=8192 VRAM=9216 RSS=10240 MEMMAX=14 EXTRA="$RX"
AGAINST=r1-w8 bench "r2-w$W2" TOOL=poolbench K=2 MODE=pool JOB=pool:FULL:detail+risk HW="$W2" B=8192 VRAM=9216 RSS=10240 MEMMAX=14 EXTRA="$RX"

# ---- B9: isolation, restart and failure tests
/bin/bash research/gpu-phase5/chains/b9.sh || { echo "$(ts) FAILED b9"; exit 1; }
echo "$(ts) chain b5-b9-resume complete"
