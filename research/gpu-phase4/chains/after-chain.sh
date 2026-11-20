#!/bin/bash
# gpu-phase4: run a chain only after another chain unit has ended AND its log says "chain <name> complete" (fail
# closed otherwise: a failed or stopped chain never starts the next one).
#   after-chain.sh <previous unit> <previous chain log (absolute)> <name> <chain script>
prev=$1; log=$2; name=$3; chain=$4
cd /home/chad/projects/margin-trading
while systemctl --user is-active --quiet "$prev"; do sleep 5; done
if ! grep -q "chain $name complete" "$log"; then echo "$(date -u +%FT%TZ) NOT STARTING $chain: $prev did not complete ($log)"; exit 1; fi
echo "$(date -u +%FT%TZ) $prev completed: starting $chain"
exec /bin/bash "$chain"
