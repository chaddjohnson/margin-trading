#!/bin/bash
# The engineering pilot (PROTOCOL.md §10.3): pilot budgets and pilot job names only; outputs in the git-ignored cache.
# Fail-fast: every step's exit status is tested explicitly (no `set -e` inside a tested list).
R=/home/chad/projects/margin-trading; cd $R || exit 1
J() { npm run -s vgt-joint -- "$@"; }
L() { u=$1; shift; J launch --unit "$u" --wait -- "$@" > /dev/null; s=$?; echo "$(date -u +%T) $u status $s"; return $s; }
need() { [ "$1" -eq "$2" ] || { echo "PILOT-FAILED: $3 (status $1, expected $2)"; exit 1; }; }
P=.cache/vgt-d1-growth-joint/pilot

# A: the straight run (search → qualify → fold evaluation) on the pseudo-fold P18
L vgtj-pilot-a-search search --cutoff P18 --pilot a --workers 8 --lanes indep; need $? 0 "A search"
L vgtj-pilot-a-qualify qualify --cutoff P18 --pilot a --workers 8; need $? 0 "A qualify"
L vgtj-pilot-a-eval fold-eval --cutoff P18 --pilot a; need $? 0 "A fold evaluation"

# B: a graceful stop after 4,000 fresh evaluations (exit 75), then the same command resumes
L vgtj-pilot-b-search search --cutoff P18 --pilot b --workers 8 --lanes indep --stop-after 4000; need $? 75 "B stop"
L vgtj-pilot-b-search2 search --cutoff P18 --pilot b --workers 8 --lanes indep; need $? 0 "B resume"

# C: SIGKILL of the whole unit after 45 s, then the same command resumes (12 workers)
J launch --unit vgtj-pilot-c-search -- search --cutoff P18 --pilot c --workers 12 --lanes indep > /dev/null
sleep 45; systemctl --user kill --signal=SIGKILL vgtj-pilot-c-search.service; echo "$(date -u +%T) C killed"
for i in $(seq 1 30); do systemctl --user is-active --quiet vgtj-pilot-c-search.service || break; sleep 2; done
L vgtj-pilot-c-search2 search --cutoff P18 --pilot c --workers 12 --lanes indep; need $? 0 "C resume"

# D: one worker dies (SIGKILL) after 300 evaluations: the job must fail (exit 1) promptly, then resume
t0=$(date +%s)
L vgtj-pilot-d-search search --cutoff P18 --pilot d --workers 8 --lanes indep --kill-worker-after 300; s=$?
echo "$(date -u +%T) D failed after $(( $(date +%s) - t0 )) s"; need $s 1 "D worker death"
L vgtj-pilot-d-search2 search --cutoff P18 --pilot d --workers 8 --lanes indep; need $? 0 "D resume"

# the four searches must be identical (every lane's result)
node -e '
const fs=require("fs");const P=process.argv[1];
const lanes=r=>JSON.stringify(JSON.parse(fs.readFileSync(`${P}/${r}/search/P18/search.json`,"utf8")).lanes);
const a=lanes("a");const out={};for(const r of ["b","c","d"]) out[r]=lanes(r)===a;
console.log("PILOT-COMPARE",JSON.stringify(out));if(!Object.values(out).every(Boolean)) process.exit(1);' $P; need $? 0 "compare"
echo "$(date -u +%T) PILOT-ABCD-DONE"
