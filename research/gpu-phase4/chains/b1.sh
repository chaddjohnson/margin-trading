#!/bin/bash
# gpu-phase4 stage B1 (PROTOCOL.md §5): the baseline — the complete Assignment 3 C19 broad1 job, one job, 8 host workers,
# batch 8,192 (the accepted default), verified against the canonical CPU archive and the sealed record.
source /home/chad/projects/margin-trading/research/gpu-phase4/chains/lib.sh
bench ftw1-r1 K=1 MODE=ftw JOB=a3:C19:broad1 HW=8 B=8192 VRAM=7000 RSS=7168
echo "$(ts) chain b1 complete"
