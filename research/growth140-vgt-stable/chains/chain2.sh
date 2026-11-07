#!/bin/bash
R=/home/chad/projects/margin-trading; cd $R
L() { u=$1; shift; npm run -s growth140-stable -- launch --unit "$u" --wait -- "$@" > /dev/null; s=$?; echo "$(date -u +%T) $u status $s"; [ $s -eq 0 ] || { echo "CHAIN-FAILED at $u"; exit 1; }; }
L growth140-stable-parity-r1 parity --workers 4
L growth140-stable-audit-reeval-r1 audit-reeval --workers 14
L growth140-stable-sensitivity-r1 sensitivity --workers 14
npm run -s growth140-stable -- seeds || { echo "CHAIN-FAILED at seeds"; exit 1; }
echo "$(date -u +%T) CHAIN-DONE"
