#!/bin/bash
# The evaluator under NVIDIA compute-sanitizer (gpu-phase1 correctness check): the tool's report goes to a log file so it
# never mixes with the evaluator's framed stdout. Use: GPUP1_BINARY=tools/gpu-phase1/sanitized-gp1.sh GPUP1_SANITIZER_TOOL=memcheck …
CU=/home/chad/.local/share/margin-trading-gpu/cuda-13.2-venv/lib/python3.14/site-packages/nvidia/cu13
R=/home/chad/projects/margin-trading
TOOL=${GPUP1_SANITIZER_TOOL:-memcheck}
LOG=${GPUP1_SANITIZER_LOG:-$R/research/gpu-phase1-feasibility/results/logs/sanitizer-$TOOL-$$.log}
export LD_LIBRARY_PATH=$CU/lib:$CU/bin:${LD_LIBRARY_PATH:-}
exec "$CU/bin/compute-sanitizer" --tool "$TOOL" --log-file "$LOG" --error-exitcode 9 "$R/research/gpu-phase1-feasibility/build/gp1" "$@"
