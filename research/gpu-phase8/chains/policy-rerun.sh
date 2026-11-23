#!/bin/bash
# gpu-phase8 amendment E4: the E3 negative and E4 tamper suites rerun on the FINAL pinned files (the generator
# tools/gpu-phase8/accept.ts, a pinned policy file, was fixed after the campaign). The same commands as chains/final.sh
# steps 2–3, on the committed tree (the tamper suite clones HEAD). The superseded outputs are kept in
# results/policy/superseded-54261ea0/.
#   tools/gpu-phase8/launch-slice.sh p8chain-policy <abs log> -- /bin/bash research/gpu-phase8/chains/policy-rerun.sh
cd /home/chad/projects/margin-trading || exit 1
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
TS="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning"
R=research/gpu-phase8/results
LOG=/home/chad/projects/margin-trading/$R/logs/final
say() { echo "$(date -u +%FT%TZ) $*"; }
fail() { say "FAILED: $1"; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || fail "the tree has uncommitted tracked changes"
say "policy rerun at $(git rev-parse HEAD)"
"$NODE" $TS --max-old-space-size=14000 tools/gpu-phase8/negative.ts --out $R/policy/negative-final.json --host-workers 3 > "$LOG/negative-rerun.txt" 2>&1 || fail negative
say "negative $(tail -1 "$LOG/negative-rerun.txt")"
"$NODE" $TS --max-old-space-size=14000 tools/gpu-phase8/tamper.ts --out $R/policy/tamper-final.json > "$LOG/tamper-rerun.txt" 2>&1 || fail tamper
say "tamper $(tail -1 "$LOG/tamper-rerun.txt" | cut -c1-200)"
say "policy rerun complete"
