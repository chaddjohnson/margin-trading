#!/bin/bash
# gpu-phase5: run a chain only after another chain unit has ended AND a named gate passed (fail closed otherwise).
#   after.sh <previous unit> <gate.json that must say pass:true> <chain script>
prev=$1; gate=$2; chain=$3
cd /home/chad/projects/margin-trading
while systemctl --user is-active --quiet "$prev"; do sleep 5; done
if ! /home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node -e 'process.exit(require(process.argv[1]).pass === true ? 0 : 1)' "$PWD/$gate"; then
  echo "$(date -u +%FT%TZ) NOT STARTING $chain: $gate missing or not passed"; exit 1
fi
echo "$(date -u +%FT%TZ) $prev ended and $gate passed: starting $chain"
exec /bin/bash "$chain"
