#!/bin/bash
# The engineering pilot (PROTOCOL.md §13): every stage path on pilot budgets (pseudo-fold P18 on D19), then the
# interruption tests (graceful stop, worker kill, unit kill) with identical resumption. Pilot job names only
# (`pilot-<run>-`), outputs in the git-ignored cache; only mechanics, timings, memory and equality are read.
# Fail-fast: every step's status is tested explicitly.
R=/home/chad/projects/margin-trading
cd "$R" || exit 1
W=${W:-14}
step() {
  local unit="$1"; shift
  echo "[$(date -u +%H:%M:%SZ)] $unit: $*"
  npm run vg-exp -- launch --unit "$unit" --wait -- "$@" --workers "$W" > /dev/null 2>&1
  local st=$?
  echo "[$(date -u +%H:%M:%SZ)] $unit: exit $st"
  return $st
}
expect() { # expect <log pattern> <unit> <args...>: the step must fail (non-zero) and its log must show the pattern
  local pat="$1"; shift
  local unit="$1"; shift
  echo "[$(date -u +%H:%M:%SZ)] $unit (expect failure: $pat): $*"
  npm run vg-exp -- launch --unit "$unit" --wait -- "$@" --workers "$W" > /dev/null 2>&1
  local st=$?
  echo "[$(date -u +%H:%M:%SZ)] $unit: exit $st"
  [ "$st" != 0 ] || { echo "UNEXPECTED success"; exit 1; }
  grep -q "$pat" "$R/research/vg-d1-growth-expanded/results/logs/$unit.log" || { echo "pattern not in the log"; exit 1; }
}
case "${1:-ref}" in
  ref)
    step vgexp-pilot-ref-indep search --cutoff P18 --arm indep --pilot ref || exit 1
    step vgexp-pilot-ref-informed search --cutoff P18 --arm informed --pilot ref || exit 1
    step vgexp-pilot-ref-qualify qualify --cutoff P18 --pilot ref || exit 1
    step vgexp-pilot-ref-fold fold-eval --cutoff P18 --pilot ref || exit 1
    step vgexp-pilot-ref-seq sequential --pilot ref || exit 1
    ;;
  interrupt)
    # graceful: stop after 6,000 fresh evaluations (exit 75), then resume to the end
    expect 'stopped (stop-after' vgexp-pilot-grace-1 search --cutoff P18 --arm indep --pilot grace --stop-after 6000 || exit 1
    step vgexp-pilot-grace-2 search --cutoff P18 --arm indep --pilot grace || exit 1
    # worker death: one worker SIGKILLs itself after 400 evaluations; the job must fail promptly (no hang), then resume
    expect 'pool failure: worker' vgexp-pilot-wkill-1 search --cutoff P18 --arm indep --pilot wkill --kill-worker-after 400 || exit 1
    step vgexp-pilot-wkill-2 search --cutoff P18 --arm indep --pilot wkill || exit 1
    # unit kill: SIGKILL the whole unit mid-search (after ≥ 8,000 fresh evaluations), then resume
    P="$R/.cache/vg-d1-growth-expanded/jobs/pilot-ukill-search-P18-indep/progress.json"
    echo "[$(date -u +%H:%M:%SZ)] vgexp-pilot-ukill-1: search (to be SIGKILLed)"
    npm run vg-exp -- launch --unit vgexp-pilot-ukill-1 -- search --cutoff P18 --arm indep --pilot ukill --workers "$W" > /dev/null 2>&1 || exit 1
    for i in $(seq 1 300); do
      f=$(python3 -c "import json;print(json.load(open('$P'))['body']['fresh'])" 2>/dev/null || echo 0)
      [ "$f" -ge 8000 ] && break
      sleep 2
    done
    systemctl --user kill --signal=SIGKILL vgexp-pilot-ukill-1.service
    echo "[$(date -u +%H:%M:%SZ)] vgexp-pilot-ukill-1: SIGKILL sent at $f fresh"
    for i in $(seq 1 60); do systemctl --user is-active --quiet vgexp-pilot-ukill-1.service || break; sleep 1; done
    step vgexp-pilot-ukill-2 search --cutoff P18 --arm indep --pilot ukill || exit 1
    npm run vg-exp -- pilot-compare ref grace wkill ukill || exit 1
    echo DONE-interrupt
    ;;
esac
echo DONE
