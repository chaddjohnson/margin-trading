#!/bin/bash
# The engineering pilot (PROTOCOL.md §13): every stage path on pilot budgets (pseudo-fold P18 on D19), then the
# interruption tests (graceful stop, worker kill, unit kill) with identical resumption. Pilot job names only
# (`pilot-<run>-`), outputs in the git-ignored cache; only mechanics, timings, memory and equality are read.
# Fail-fast: every step's status is tested explicitly.
R=/home/chad/projects/margin-trading
cd "$R" || exit 1
W=${W:-14}
LOGS=$R/research/c4-gdx-growth-partner/results/logs
step() {
  local unit="$1"; shift
  echo "[$(date -u +%H:%M:%SZ)] $unit: $*"
  npm run c4gdx -- launch --unit "$unit" --wait -- "$@" --workers "$W" > /dev/null 2>&1
  local st=$?
  echo "[$(date -u +%H:%M:%SZ)] $unit: exit $st"
  return $st
}
expect() { # expect <log pattern> <unit> <args...>: the step must fail (non-zero) and its log must show the pattern
  local pat="$1"; shift
  local unit="$1"; shift
  echo "[$(date -u +%H:%M:%SZ)] $unit (expect failure: $pat): $*"
  npm run c4gdx -- launch --unit "$unit" --wait -- "$@" --workers "$W" > /dev/null 2>&1
  local st=$?
  echo "[$(date -u +%H:%M:%SZ)] $unit: exit $st"
  [ "$st" != 0 ] || { echo "UNEXPECTED success"; exit 1; }
  grep -q "$pat" "$LOGS/$unit.log" || { echo "pattern not in the log"; exit 1; }
}
case "${1:-ref}" in
  ref)
    step c4gdx-pilot-ref-search search --cutoff P18 --pilot ref || exit 1
    step c4gdx-pilot-ref-qualify qualify --cutoff P18 --pilot ref || exit 1
    step c4gdx-pilot-ref-fold fold-eval --cutoff P18 --pilot ref || exit 1
    step c4gdx-pilot-ref-seq sequential --pilot ref || exit 1
    step c4gdx-pilot-ref-transfers transfers --pilot ref || exit 1
    step c4gdx-pilot-ref-diagnostics diagnostics --pilot ref || exit 1
    step c4gdx-pilot-ref-freeze freeze-selection --pilot ref || exit 1
    step c4gdx-pilot-ref-validate validate --pilot ref || exit 1
    ;;
  interrupt)
    # graceful: stop after N fresh evaluations (exit 75), then resume to the end
    expect 'stopped (stop-after' c4gdx-pilot-grace-1 search --cutoff P18 --pilot grace --stop-after "${GRACE:-3000}" || exit 1
    step c4gdx-pilot-grace-2 search --cutoff P18 --pilot grace || exit 1
    # worker death: one worker SIGKILLs itself after 300 evaluations; the job must fail promptly (no hang), then resume
    expect 'pool failure: worker' c4gdx-pilot-wkill-1 search --cutoff P18 --pilot wkill --kill-worker-after 300 || exit 1
    step c4gdx-pilot-wkill-2 search --cutoff P18 --pilot wkill || exit 1
    # unit kill: SIGKILL the whole unit mid-search (after >= N fresh evaluations), then resume
    P="$R/.cache/c4-gdx-growth-partner/jobs/pilot-ukill-search-P18/progress.json"
    echo "[$(date -u +%H:%M:%SZ)] c4gdx-pilot-ukill-1: search (to be SIGKILLed)"
    npm run c4gdx -- launch --unit c4gdx-pilot-ukill-1 -- search --cutoff P18 --pilot ukill --workers "$W" > /dev/null 2>&1 || exit 1
    f=0
    for i in $(seq 1 300); do
      f=$(python3 -c "import json;print(json.load(open('$P'))['body']['fresh'])" 2>/dev/null || echo 0)
      [ "$f" -ge "${UKILL:-4000}" ] && break
      sleep 2
    done
    systemctl --user kill --signal=SIGKILL c4gdx-pilot-ukill-1.service
    echo "[$(date -u +%H:%M:%SZ)] c4gdx-pilot-ukill-1: SIGKILL sent at $f fresh"
    for i in $(seq 1 60); do systemctl --user is-active --quiet c4gdx-pilot-ukill-1.service || break; sleep 1; done
    step c4gdx-pilot-ukill-2 search --cutoff P18 --pilot ukill || exit 1
    npm run c4gdx -- pilot-compare ref grace wkill ukill || exit 1
    echo DONE-interrupt
    ;;
esac
echo DONE
