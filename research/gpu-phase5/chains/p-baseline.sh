#!/bin/bash
# gpu-phase5 stage P (PROTOCOL.md §6.1): the baselines of the performance audit, one job at a time, every group verified
# bit-identical before its timing is used (lib.sh bench: group → verify → summarize → gate).
#   p3-*  the ACCEPTED configuration: this branch's unmodified host path (byte-identical emitted JavaScript to Phase 3's),
#         the accepted binary gb3, V8's Maglev enabled (ENGINE="") — as Phase 3 was accepted and Phase 4 benchmarked;
#   nm-*  the root-cause fix alone: the same host path and binary under --no-maglev;
#   prof-* a CPU-profiled 300,000-evaluation prefix (never a timing).
#   tools/gpu-phase5/launch.sh p5chain-pbase <abs log> -- /bin/bash research/gpu-phase5/chains/p-baseline.sh
source /home/chad/projects/margin-trading/research/gpu-phase5/chains/lib.sh
GB3=/home/chad/projects/margin-trading/research/gpu-phase3/build/gb3
PROF=/home/chad/projects/margin-trading/research/gpu-phase5/results/raw-large/cpuprof
mkdir -p "$PROF"
bench p3-a3-r1 K=1 MODE=ftw JOB=a3:C19:broad1 HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE= GPU_BACKEND_BINARY=$GB3
bench nm-a3-r1 K=1 MODE=ftw JOB=a3:C19:broad1 HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE=--no-maglev GPU_BACKEND_BINARY=$GB3
bench nm-a3-r2 K=1 MODE=ftw JOB=a3:C19:broad1 HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE=--no-maglev GPU_BACKEND_BINARY=$GB3
bench p3-s-r1  K=1 MODE=ftw JOB=mini HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE= GPU_BACKEND_BINARY=$GB3
bench nm-s-r1  K=1 MODE=ftw JOB=mini HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE=--no-maglev GPU_BACKEND_BINARY=$GB3
bench p3-s-r2  K=1 MODE=ftw JOB=mini HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE= GPU_BACKEND_BINARY=$GB3
bench nm-s-r2  K=1 MODE=ftw JOB=mini HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE=--no-maglev GPU_BACKEND_BINARY=$GB3
bench prof-a3-nm K=1 MODE=ss JOB=a3:C19:broad1 HW=8 B=8192 STOP=300000 VRAM=7000 RSS=7168 ENGINE=--no-maglev GPU_BACKEND_BINARY=$GB3 "NODE_EXTRA=--cpu-prof --cpu-prof-dir=$PROF"
bench nm-a2-r1 K=1 MODE=ftw JOB=a2:C19:base HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE=--no-maglev GPU_BACKEND_BINARY=$GB3
bench p3-a2-r1 K=1 MODE=ftw JOB=a2:C19:base HW=8 B=8192 VRAM=7000 RSS=7168 ENGINE= GPU_BACKEND_BINARY=$GB3
echo "$(ts) chain p-baseline complete"
