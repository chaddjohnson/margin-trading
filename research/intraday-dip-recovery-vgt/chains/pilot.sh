#!/usr/bin/env bash
# The engineering pilot (PROTOCOL.md §13.3): pilot budgets on the pseudo-fold P18 (door P18 inside D19; slice 2019 on
# D19), outputs in .cache/intraday-dip-recovery-vgt/pilot/ (never a study record). Run from the repository root.
set -u
R="npm run --silent dip-recovery --"
LOG=research/intraday-dip-recovery-vgt/results/logs
P=.cache/intraday-dip-recovery-vgt/pilot
rm -rf "$P/search" "$P/qualify" "$P/folds" "$P/ablation" "$P/controls" "$P/diagnostics" .cache/intraday-dip-recovery-vgt/jobs/pilot-P18-*
st() { echo "[pilot $(date -u +%H:%M:%SZ)] $*"; }
same() { # compare two pilot search records (decisions only, not timings or counters)
  python3 - "$1" "$2" <<'PY'
import json,sys
a,b=[json.load(open(f)) for f in sys.argv[1:3]]
keys=['counts','coverage','islands','refinement','shortlist','infeasibleDiagnostics','r3','extensionStop','hypervolume']
strip=lambda x:{k:x[k] for k in keys}
for i in a['islands']+b['islands']: pass
ok=json.dumps(strip(a),sort_keys=True)==json.dumps(strip(b),sort_keys=True)
print('IDENTICAL' if ok else 'DIFFERENT', sys.argv[1], sys.argv[2])
PY
}
st "straight searches"
for f in F1 F2 F3 F4; do $R launch --unit dip-pilot-indep-$f --wait -- search --pilot --cutoff P18 --lane indep --family $f; done
$R launch --unit dip-pilot-informed-F4 --wait -- search --pilot --cutoff P18 --lane informed --family F4
$R launch --unit dip-pilot-informed-F1 --wait -- search --pilot --cutoff P18 --lane informed --family F1
$R launch --unit dip-pilot-explore2-F1 --wait -- search --pilot --cutoff P18 --lane explore2 --family F1

st "graceful stop then resume (F2, tag graceful)"
$R launch --unit dip-pilot-graceful -- search --pilot --cutoff P18 --lane indep --family F2 --tag graceful
sleep 9; systemctl --user kill -s TERM dip-pilot-graceful.service; sleep 6
grep -E "stopped|exit|Error" $LOG/dip-pilot-graceful.log | tail -3
$R launch --unit dip-pilot-graceful-resume --wait -- search --pilot --cutoff P18 --lane indep --family F2 --tag graceful
same $P/search/P18/indep-F2.json $P/search/P18/indep-F2-graceful.json

st "abrupt unit kill then resume (F3, tag unitkill)"
$R launch --unit dip-pilot-unitkill -- search --pilot --cutoff P18 --lane indep --family F3 --tag unitkill
sleep 9; systemctl --user kill -s KILL dip-pilot-unitkill.service; sleep 3
$R launch --unit dip-pilot-unitkill-resume --wait -- search --pilot --cutoff P18 --lane indep --family F3 --tag unitkill
same $P/search/P18/indep-F3.json $P/search/P18/indep-F3-unitkill.json

st "abrupt worker kill fails the job promptly, then resume (F4, tag workerkill)"
t0=$(date +%s)
$R launch --unit dip-pilot-workerkill --wait -- search --pilot --cutoff P18 --lane indep --family F4 --tag workerkill --kill-after 300
echo "worker-kill job ended after $(( $(date +%s) - t0 )) s"
grep -E "pool failure|exited" $LOG/dip-pilot-workerkill.log | head -2
$R launch --unit dip-pilot-workerkill-resume --wait -- search --pilot --cutoff P18 --lane indep --family F4 --tag workerkill
same $P/search/P18/indep-F4.json $P/search/P18/indep-F4-workerkill.json

st "qualification, fold selection and fold evaluation (pilot)"
# the pilot qualification reads every lane P18 would have at C24 only if present; P18 is fold-shaped (indep only)
$R launch --unit dip-pilot-qualify --wait -- qualify --pilot --cutoff P18
$R seal-fold --pilot --cutoff P18
$R fold-eval --pilot --cutoff P18
$R ablation --pilot
$R controls --pilot
$R diagnostics --pilot

st "expected refusals"
$R search --cutoff C19 --lane indep --family F1 2>&1 | grep -m1 -E "preflight|frozen|Error" || echo "NO REFUSAL"
$R validate 2>&1 | grep -m1 -E "preflight|frozen|committed|Error" || echo "NO REFUSAL"
st "pilot done"
