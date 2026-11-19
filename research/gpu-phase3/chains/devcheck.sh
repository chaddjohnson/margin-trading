#!/bin/bash
# gpu-phase3 Stage 2 targeted checks of the parallel host path (PROTOCOL.md §6), sequential, fail-fast. Each step's
# output lands in research/gpu-phase3/results/dev/ (development evidence; the acceptance evidence is the final campaign).
#   HW=8 TAG=a /bin/bash research/gpu-phase3/chains/devcheck.sh
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
HW=${HW:-8}
TAG=${TAG:-a}
export GPU_POLICY_PURPOSE=parity-test
N() { "$NODE" --expose-gc --max-old-space-size=20000 --experimental-transform-types --disable-warning=ExperimentalWarning "$@"; }
step() { local name=$1; shift; echo "$(date -u +%FT%TZ) start [$name]"; "$@"; local st=$?; echo "$(date -u +%FT%TZ) end [$name] status $st"; [ $st -eq 0 ] || { echo "FAILED [$name]"; exit 1; }; }
D=research/gpu-phase3/results/dev
O=research/gpu-phase3/results/optimizer
mkdir -p $D
step offline N tools/gpu-phase3/offline-check.ts --workers 1,2,3,8 --out $D/offline-check-$TAG.json
step unit N --test --test-reporter=tap src/gpu-backend/tests/hostPipeline.test.ts src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/layout.test.ts
step parity-d24 N tools/gpu-phase3/parity.ts --door D24 --options all --refs --random 600 --strata 1 --detail --risk --host-workers $HW --batches 1,7,64 --worker-counts 1,3,12 --determinism-subset 96 --label dev-$TAG --out $D/parity-d24-all-$TAG.json
step parity-s0 N tools/gpu-phase3/parity.ts --fixture 0 --options all --refs --random 300 --detail --risk --host-workers $HW --batches 13 --worker-counts 2 --determinism-subset 64 --label dev-$TAG-s0 --out $D/parity-s0-all-$TAG.json
step mini N tools/gpu-phase3/replay.ts --backend gpu --run dev-$TAG-mini --job mini --host-workers $HW
step cmp-mini N tools/gpu-phase3/compare.ts arms p2-mini-r1/gpu dev-$TAG-mini/gpu --out $O/compare-dev-$TAG-mini-vs-p2.json
echo "$(date -u +%FT%TZ) chain complete"
