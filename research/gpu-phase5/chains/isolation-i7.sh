#!/bin/bash
# gpu-phase5 gate A10 — continuation of chains/isolation.sh (amendment A4). In the campaign's first pass
# (2026-11-21T03:02:40Z–03:09:29Z) the tests I-ref, I3, I4, I5, I1, I2 and I6 passed; the first I7 line then failed with
# a SHELL error (rc 127: `check i7-race GPU_POLICY_PURPOSE=benchmark T …` hands the environment assignment to `check`
# as a command name) — the dataset tests never ran. I1–I6 are NOT rerun. This script runs the two I7 tests with the
# arguments chains/isolation.sh names, the purpose exported instead, and the cleanup that script ends with.
source /home/chad/projects/margin-trading/research/gpu-phase5/chains/lib.sh
export GPU_POLICY_PURPOSE=benchmark
check() { local name=$1; shift; "$@"; local rc=$?; echo "$(ts) [$name] rc=$rc"; [ $rc -eq 0 ] || { echo "$(ts) FAILED isolation test $name"; exit 1; }; }
F=research/gpu-phase5/results/final
mkdir -p "$F"
echo "$(ts) I7 concurrent dataset export into one shared directory (the atomic exporter; Phase 4: 34 of 100 loads refused)"
check i7-race T --max-old-space-size=8000 tools/gpu-phase5/dataset-race.ts race --mode atomic --procs 4 --loops 25 --door D19 --out "$F/race-d19-atomic.json"
check i7-conflict T --max-old-space-size=8000 tools/gpu-phase5/dataset-race.ts conflict --rounds 10 --out "$F/conflict.json"
for r in i1-a i1-b i2-a i2-b i6-x; do rm -rf "research/gpu-phase5/cache/replay/$r" "research/gpu-phase5/results/raw-large/optimizer/$r"; done
echo "$(ts) chain isolation complete"
