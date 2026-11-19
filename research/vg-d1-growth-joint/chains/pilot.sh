#!/bin/bash
# The engineering pilot (PROTOCOL.md §13.3): pilot budgets and `pilot-` job names only; outputs in the git-ignored
# cache; development doors only. Fail-fast: every step's exit status is tested explicitly.
R=/home/chad/projects/margin-trading; cd $R || exit 1
J() { node --experimental-transform-types --disable-warning=ExperimentalWarning src/vg-d1-growth-joint/main.ts "$@"; }
L() { u=$1; shift; J launch --unit "$u" --wait -- "$@" > /dev/null; s=$?; echo "$(date -u +%T) $u status $s"; return $s; }
need() { [ "$1" -eq "$2" ] || { echo "PILOT-FAILED: $3 (status $1, expected $2)"; exit 1; }; }
P=.cache/vg-d1-growth-joint/pilot
W=15

# A: the straight run of every C24-shaped path on the pseudo-fold P18 (D19; slice 2019)
L vgjoint-pilot-a-indep search --cutoff P18 --arm indep --pilot a --workers $W; need $? 0 "A indep"
L vgjoint-pilot-a-gpair search --cutoff P18 --arm gpair --pilot a --workers $W; need $? 0 "A gpair"
L vgjoint-pilot-a-qgpair qualify-gpair --cutoff P18 --pilot a --workers $W; need $? 0 "A qualify gpair"
L vgjoint-pilot-a-informed search --cutoff P18 --arm informed --pilot a --workers $W; need $? 0 "A informed"
L vgjoint-pilot-a-qualify qualify --cutoff P18 --pilot a --workers $W; need $? 0 "A qualify"
L vgjoint-pilot-a-eval fold-eval --cutoff P18 --pilot a; need $? 0 "A fold evaluation"
L vgjoint-pilot-a-diag diagnostics --pilot a --workers $W; need $? 0 "A diagnostics"
L vgjoint-pilot-a-freeze freeze-selection --pilot a; need $? 0 "A freeze-selection"
L vgjoint-pilot-a-validate validate --pilot a --workers $W; need $? 0 "A validation path (D24 only)"

# F: the fold path at the real cutoffs (pilot budgets, development doors) and the sequential policies
for F in C19 C21 C23; do
  L vgjoint-pilot-f-search-$F search --cutoff $F --arm indep --pilot f --workers $W; need $? 0 "F search $F"
  L vgjoint-pilot-f-qualify-$F qualify --cutoff $F --pilot f --workers $W; need $? 0 "F qualify $F"
  L vgjoint-pilot-f-eval-$F fold-eval --cutoff $F --pilot f; need $? 0 "F fold evaluation $F"
done
L vgjoint-pilot-f-sequential sequential --pilot f; need $? 0 "F sequential"

# B: a graceful stop after 1,500 fresh evaluations (exit 75), then the same command resumes
L vgjoint-pilot-b-indep search --cutoff P18 --arm indep --pilot b --workers $W --stop-after 1500; need $? 75 "B stop"
L vgjoint-pilot-b-indep2 search --cutoff P18 --arm indep --pilot b --workers $W; need $? 0 "B resume"

# C: SIGKILL of the whole unit after 40 s, then the same command resumes
J launch --unit vgjoint-pilot-c-indep -- search --cutoff P18 --arm indep --pilot c --workers $W > /dev/null
sleep 40; systemctl --user kill --signal=SIGKILL vgjoint-pilot-c-indep.service; echo "$(date -u +%T) C killed"
for i in $(seq 1 30); do systemctl --user is-active --quiet vgjoint-pilot-c-indep.service || break; sleep 2; done
L vgjoint-pilot-c-indep2 search --cutoff P18 --arm indep --pilot c --workers $W; need $? 0 "C resume"

# D: one worker dies (SIGKILL) after 200 evaluations: the job must fail (exit 1) promptly, then resume
t0=$(date +%s)
L vgjoint-pilot-d-indep search --cutoff P18 --arm indep --pilot d --workers 8 --kill-worker-after 200; s=$?
echo "$(date -u +%T) D failed after $(( $(date +%s) - t0 )) s"; need $s 1 "D worker death"
L vgjoint-pilot-d-indep2 search --cutoff P18 --arm indep --pilot d --workers 8; need $? 0 "D resume"

# the four independent searches must be identical (every lane's result)
node -e '
const fs=require("fs");const P=process.argv[1];
const lanes=r=>JSON.stringify(JSON.parse(fs.readFileSync(`${P}/${r}/search/P18/indep.json`,"utf8")).lanes);
const a=lanes("a");const out={};for(const r of ["b","c","d"]) out[r]=lanes(r)===a;
console.log("PILOT-COMPARE",JSON.stringify(out));if(!Object.values(out).every(Boolean)) process.exit(1);' $P; need $? 0 "compare"

# E: expected refusals (in process): a sealed search rerun; study stages before the freeze; FULL without the guard
J search --cutoff P18 --arm indep --pilot a --workers 2 > /dev/null 2>&1; s=$?; [ $s -ne 0 ]; need $? 0 "E sealed rerun refused"
J search --cutoff C19 --arm indep --workers 2 > /dev/null 2>&1; s=$?; [ $s -ne 0 ]; need $? 0 "E study search before the freeze refused"
J validate --workers 2 > /dev/null 2>&1; s=$?; [ $s -ne 0 ]; need $? 0 "E validation without a frozen selection refused"
node --experimental-transform-types --disable-warning=ExperimentalWarning -e '
import("/home/chad/projects/margin-trading/src/vg-d1-growth-joint/data.ts").then(async (m) => {
  try { await m.openDoor("FULL", "pilot: FULL without the guard must be refused"); process.exit(1); } catch (e) { console.log("refused:", String(e.message)); process.exit(0); }
});'; need $? 0 "E FULL without the guard refused"
echo "$(date -u +%T) PILOT-DONE"
