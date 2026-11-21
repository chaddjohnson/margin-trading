#!/bin/bash
# gpu-phase5 stages B3–B9 (PROTOCOL.md §5) with the allocations decided by the frozen rules on B2 + B2r
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

# ---- B3: single-job batching (complete jobs) and batching at k = 2
bench b4096-r1  K=1 MODE=ftw HW=8 B=4096  "${A3[@]}"
bench b16384-r1 K=1 MODE=ftw HW=8 B=16384 JOB=a3:C19:broad1 VRAM=12288 RSS="$R"
bench ftw1-r2   K=1 MODE=ftw HW=8 B=8192  "${A3[@]}"
wall() { T -e 'console.log(require("./research/gpu-phase5/results/bench/'"$1"'/summary.json").makespanSeconds)'; }
M8=$(T -e 'console.log(('"$(wall ftw1-r1)"'+'"$(wall ftw1-r2)"')/2)')
for b in 4096 16384; do
  if T -e 'process.exit('"$(wall b$b-r1)"' <= '"$M8"'*0.97 ? 0 : 1)'; then
    echo "$(ts) batch $b is ≥ 3 % faster than 8,192 in run 1: second run (rule R1)"
    if [ $b = 16384 ]; then bench b16384-r2 K=1 MODE=ftw HW=8 B=16384 JOB=a3:C19:broad1 VRAM=12288 RSS="$R"; else bench b4096-r2 K=1 MODE=ftw HW=8 B=4096 "${A3[@]}"; fi
  fi
done
bench ss2-b4096  K=2 MODE=ss HW="$W2" B=4096  STOP=300000 "${A3[@]}"
bench ss2-b16384 K=2 MODE=ss HW="$W2" B=16384 STOP=300000 JOB=a3:C19:broad1 VRAM=12288 RSS="$R"

# ---- B4: fixed total work — the one job split by lane into k complete jobs
bench ftw2 K=2 MODE=ftw HW="$W2" B=8192 "${A3[@]}"
bench ftw3 K=3 MODE=ftw HW="$W3" B=8192 "${A3[@]}"
bench ftw4 K=4 MODE=ftw HW="$W4" B=8192 "${A3[@]}"
if [ "$KS" -gt 1 ]; then WS=$(best "$KS"); bench "ftw$KS-r2" K="$KS" MODE=ftw HW="$WS" B=8192 "${A3[@]}"; fi

# ---- B5: the Growth-fixed Assignment 2 job, steady state
A2=(MODE=ss JOB=a2:C19:base B=8192 STOP=400000 VRAM="$V" RSS="$R")
bench a2-ss1-w8 K=1 HW=8 "${A2[@]}"
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
echo "$(ts) chain b3-b9 complete"
