#!/bin/bash
# Pilot part 2 (PROTOCOL.md §10.3): the C24-shaped path with every lane and the diagnostics (E), the chronology path
# with the sequential policies (F), expected failures (X) and the throughput bench. Pilot budgets and names only.
R=/home/chad/projects/margin-trading; cd $R || exit 1
J() { npm run -s vgt-joint -- "$@"; }
L() { u=$1; shift; J launch --unit "$u" --wait -- "$@" > /dev/null; s=$?; echo "$(date -u +%T) $u status $s"; return $s; }
need() { [ "$1" -eq "$2" ] || { echo "PILOT-FAILED: $3 (status $1, expected $2)"; exit 1; }; }

# X: expected failures
J search --cutoff P18 --pilot a --workers 2 --lanes indep > /dev/null 2>&1; need $? 1 "X1 a sealed search refuses to rerun"
( need 1 0 "X2 deliberate chain failure" ) > /dev/null; need $? 1 "X2 a failing step stops its chain"
node --experimental-transform-types --disable-warning=ExperimentalWarning -e '
import("/home/chad/projects/margin-trading/src/vgt-d1-growth-joint/data.ts").then(async (m) => {
  try { await m.openFullDoor("pilot X3: must be refused", { file: "/home/chad/projects/margin-trading/research/vgt-d1-growth-joint/FROZEN_SELECTION.json", sha256: "0" }, true); process.exit(0); }
  catch (e) { console.log("X3 refused:", e.message); process.exit(1); } });' ; need $? 1 "X3 FULL without the guard is refused"
echo "$(date -u +%T) X done"

# E: C24-shaped (every lane) on D24, qualification and the diagnostics
L vgtj-pilot-e-search search --cutoff C24 --pilot e --workers 14; need $? 0 "E search"
L vgtj-pilot-e-qualify qualify --cutoff C24 --pilot e --workers 14; need $? 0 "E qualify"
L vgtj-pilot-e-diag diagnostics --pilot e; need $? 0 "E diagnostics"

# F: the chronology path (independent lanes) and the sequential policies
for C in C19 C21 C23; do
  L vgtj-pilot-f-search-$C search --cutoff $C --pilot f --workers 14 --lanes indep; need $? 0 "F search $C"
  L vgtj-pilot-f-qualify-$C qualify --cutoff $C --pilot f --workers 14; need $? 0 "F qualify $C"
  L vgtj-pilot-f-eval-$C fold-eval --cutoff $C --pilot f; need $? 0 "F evaluate $C"
done
L vgtj-pilot-f-sequential sequential --pilot f; need $? 0 "F sequential"

# the bench: 2,000 fixed configurations on D24 at 8 / 12 / 14 workers, and on D19 at 14
for W in 8 12 14; do L vgtj-pilot-bench-w$W bench --door D24 --n 2000 --workers $W --label bench; need $? 0 "bench $W"; done
L vgtj-pilot-bench-d19 bench --door D19 --n 2000 --workers 14 --label bench; need $? 0 "bench D19"
echo "$(date -u +%T) PILOT2-DONE"
