#!/usr/bin/env bash
set -u
R=/home/chad/projects/margin-trading
SP=/tmp/claude-1000/-home-chad-projects-margin-trading/7754e7dc-70cd-4ab4-9a0b-94f7745baa71/scratchpad
export STUDY9B_SMOKE=1 STUDY9B_SMOKE_DIR=$SP/smoke/results STUDY9B_SMOKE_TRACKS=N2-SMH,G4-ILF STUDY9B_SMOKE_FOLDS=F23
W=$R/research/study9-phase-b/scripts/s9b.sh
L=$SP/smoke/logs; mkdir -p $L
echo "start $(date -u +%T)"
( $W search N2-SMH F23 > $L/s1.txt 2>&1; echo "search N2-SMH exit $?" ) &
( $W search G4-ILF F23 > $L/s2.txt 2>&1; echo "search G4-ILF exit $?" ) &
wait
( $W qualify N2-SMH F23 > $L/q1.txt 2>&1; echo "qualify N2-SMH exit $?" ) &
( $W qualify G4-ILF F23 > $L/q2.txt 2>&1; echo "qualify G4-ILF exit $?" ) &
wait
$W freeze-selection > $L/sel.txt 2>&1; echo "freeze-selection exit $?"
$W test F23 > $L/t.txt 2>&1; echo "test F23 exit $?"
echo "errors: $(cat $L/*.txt | grep -c -E 'Error|error:')"
echo "end $(date -u +%T)"
