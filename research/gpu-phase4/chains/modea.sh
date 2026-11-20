#!/bin/bash
# gpu-phase4 amendment A3: the Mode A confirmation with COMPLETE jobs — two identical complete Assignment 3 C19 broad1
# jobs at once (k = 2, 8 host workers, batch 8,192), on the ACCEPTED Phase 3 binary (the final binary is not accepted,
# A4; the device code is byte-identical), verified like every group.
source /home/chad/projects/margin-trading/research/gpu-phase4/chains/lib.sh
export GPU_BACKEND_BINARY=/home/chad/projects/margin-trading/research/gpu-phase3/build/gb3
bench modeA-complete K=2 MODE=ss JOB=a3:C19:broad1 HW=8 B=8192 VRAM=6144 RSS=5888 MEMMAX=14
echo "$(ts) chain modea complete"
