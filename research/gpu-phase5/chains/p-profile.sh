#!/bin/bash
# gpu-phase5 stage P (PROTOCOL.md §6.1): the CPU-profiled 300,000-evaluation prefix of the Assignment 3 job (never a
# timing) — the fix's configuration (--no-maglev) on the accepted binary; V8 writes one .cpuprofile per thread.
#   tools/gpu-phase5/launch.sh p5chain-pprof <abs log> -- /bin/bash research/gpu-phase5/chains/p-profile.sh
source /home/chad/projects/margin-trading/research/gpu-phase5/chains/lib.sh
GB3=/home/chad/projects/margin-trading/research/gpu-phase3/build/gb3
PROF=/home/chad/projects/margin-trading/research/gpu-phase5/results/raw-large/cpuprof
mkdir -p "$PROF"
bench prof-a3-nm K=1 MODE=ss JOB=a3:C19:broad1 HW=8 B=8192 STOP=300000 VRAM=7000 RSS=7168 ENGINE=--no-maglev GPU_BACKEND_BINARY=$GB3 "NODE_EXTRA=--cpu-prof --cpu-prof-dir=$PROF"
echo "$(ts) chain p-profile complete"
