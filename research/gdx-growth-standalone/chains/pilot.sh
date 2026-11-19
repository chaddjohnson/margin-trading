#!/bin/bash
# The engineering pilot (PROTOCOL.md §13): every stage path on pilot budgets (pseudo-fold P18 on D19), then the
# interruption tests (graceful stop, worker kill, unit kill) with identical resumption, and the duplicate-concurrent-key
# test. Pilot job names only (`pilot-<run>-`), outputs in the git-ignored cache; only mechanics, timings, memory and
# equality are read. Fail-fast: every step's status is tested explicitly.
R=/home/chad/projects/margin-trading
cd "$R" || exit 1
W=${W:-12}
LOGS=$R/research/gdx-growth-standalone/results/logs
step() {
  local unit="$1"; shift
  echo "[$(date -u +%H:%M:%SZ)] $unit: $*"
  npm run gdxg -- launch --unit "$unit" --wait -- "$@" --workers "$W" > /dev/null 2>&1
  local st=$?
  echo "[$(date -u +%H:%M:%SZ)] $unit: exit $st"
  return $st
}
expect() { # expect <log pattern> <unit> <args...>: the step must fail (non-zero) and its log must show the pattern
  local pat="$1"; shift
  local unit="$1"; shift
  echo "[$(date -u +%H:%M:%SZ)] $unit (expect failure: $pat): $*"
  npm run gdxg -- launch --unit "$unit" --wait -- "$@" --workers "$W" > /dev/null 2>&1
  local st=$?
  echo "[$(date -u +%H:%M:%SZ)] $unit: exit $st"
  [ "$st" != 0 ] || { echo "UNEXPECTED success"; exit 1; }
  grep -q "$pat" "$LOGS/$unit.log" || { echo "pattern not in the log"; exit 1; }
}
case "${1:-ref}" in
  ref)
    step gdxg-pilot-${PILOT:-ref}-search search --cutoff P18 --lane independent --pilot "${PILOT:-ref}" || exit 1
    step gdxg-pilot-${PILOT:-ref}-informed search --cutoff P18 --lane informed --pilot "${PILOT:-ref}" || exit 1
    step gdxg-pilot-${PILOT:-ref}-qualify qualify --cutoff P18 --pilot "${PILOT:-ref}" || exit 1
    step gdxg-pilot-${PILOT:-ref}-fold fold-eval --cutoff P18 --pilot "${PILOT:-ref}" || exit 1
    step gdxg-pilot-${PILOT:-ref}-seq sequential --pilot "${PILOT:-ref}" || exit 1
    step gdxg-pilot-${PILOT:-ref}-diagnostics diagnostics --pilot "${PILOT:-ref}" || exit 1
    step gdxg-pilot-${PILOT:-ref}-freeze freeze-selection --pilot "${PILOT:-ref}" || exit 1
    step gdxg-pilot-${PILOT:-ref}-validate validate --pilot "${PILOT:-ref}" || exit 1
    ;;
  interrupt)
    # graceful: stop after N fresh evaluations (exit 75), then resume to the end
    expect 'stopped (stop-after' gdxg-pilot-grace-1 search --cutoff P18 --lane independent --pilot grace --stop-after "${GRACE:-1500}" || exit 1
    step gdxg-pilot-grace-2 search --cutoff P18 --lane independent --pilot grace || exit 1
    # worker death: one worker SIGKILLs itself after 200 evaluations; the job must fail promptly (no hang), then resume
    expect 'pool failure: worker' gdxg-pilot-wkill-1 search --cutoff P18 --lane independent --pilot wkill --kill-worker-after 200 || exit 1
    step gdxg-pilot-wkill-2 search --cutoff P18 --lane independent --pilot wkill || exit 1
    # unit kill: SIGKILL the whole unit mid-search (after >= N fresh evaluations), then resume
    P="$R/.cache/gdx-growth-standalone/jobs/pilot-ukill-search-P18-independent/progress.json"
    echo "[$(date -u +%H:%M:%SZ)] gdxg-pilot-ukill-1: search (to be SIGKILLed)"
    npm run gdxg -- launch --unit gdxg-pilot-ukill-1 -- search --cutoff P18 --lane independent --pilot ukill --workers "$W" > /dev/null 2>&1 || exit 1
    f=0
    for i in $(seq 1 300); do
      f=$(python3 -c "import json;print(json.load(open('$P'))['body']['fresh'])" 2>/dev/null || echo 0)
      [ "$f" -ge "${UKILL:-2500}" ] && break
      sleep 2
    done
    systemctl --user kill --signal=SIGKILL gdxg-pilot-ukill-1.service
    echo "[$(date -u +%H:%M:%SZ)] gdxg-pilot-ukill-1: SIGKILL sent at $f fresh"
    for i in $(seq 1 60); do systemctl --user is-active --quiet gdxg-pilot-ukill-1.service || break; sleep 1; done
    step gdxg-pilot-ukill-2 search --cutoff P18 --lane independent --pilot ukill || exit 1
    npm run gdxg -- pilot-compare ref grace wkill ukill || exit 1
    # duplicate concurrent keys (3C's R1 path): three overlapping concurrent requests must all resolve
    npm run gdxg -- launch --unit gdxg-pilot-dupkeys --wait -- dup-keys --door D19 --workers 4 --label dupkeys > /dev/null 2>&1 || { echo "dup-keys failed"; exit 1; }
    grep "duplicate keys" "$LOGS/gdxg-pilot-dupkeys.log"
    echo DONE-interrupt
    ;;
esac
echo DONE
