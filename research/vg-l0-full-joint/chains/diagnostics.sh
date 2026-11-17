#!/bin/bash
# Report-only diagnostics (PROTOCOL.md §13; after the validation; never a selection input): the record-only analyses,
# the fold-primary and finalist replays (D24 and FULL), the ledgers (FULL), the tail stress, then the tables. Fail-fast.
R=/home/chad/projects/margin-trading
cd $R || exit 1
N="node --expose-gc --max-old-space-size=12288 --experimental-transform-types --disable-warning=ExperimentalWarning"
for t in "analyses.ts all" "replays.ts folds" "replays.ts finalists" "replays.ts ledgers" "tail.ts" "tables.ts"; do
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) start $t"
  $N tools/vg-l0-full-joint/$t
  st=$?
  echo "== $(date -u +%Y-%m-%dT%H:%M:%SZ) end $t exit $st"
  if [ $st -ne 0 ]; then echo "DIAGNOSTICS FAILED at $t"; exit 1; fi
done
echo "DIAGNOSTICS DONE"
