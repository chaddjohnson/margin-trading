#!/bin/bash
# gpu-phase2 AMENDMENTS A1: end the G8 stress at 8 h from its original start (04:55:53.744Z → 12:55:53.744Z) at the
# first round boundary after the deadline — SIGTERM to the run's main process right after that round's summary is
# saved — then the closure record and the post-stress steps (npm test, the Assignment 3 finalists parity, run-log
# copies, an acceptance dry run). One GPU job at a time: nothing else starts before the stress process has exited.
cd /home/chad/projects/margin-trading
NODE=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
L=/home/chad/projects/margin-trading/research/gpu-phase2/results/logs
T=research/gpu-phase2/results/tests
DIR=${DIR:-research/gpu-phase2/results/stress}
DEADLINE=${DEADLINE:-2026-11-19T12:55:53.744Z}
STRESS_UNIT=${STRESS_UNIT:-gpup2-stress}
U() { local unit=$1 log=$2; shift 2; tools/gpu-phase2/launch.sh "$unit" "$log" --wait -- "$@"; }
echo "$(date -u +%FT%TZ) armed: deadline $DEADLINE"
python3 - "$DEADLINE" "$DIR" "$STRESS_UNIT" <<'PY' || { echo "$(date -u +%FT%TZ) FAILED [stop]"; exit 1; }
import json, os, signal, subprocess, sys, time, datetime
deadline = datetime.datetime.fromisoformat(sys.argv[1].replace('Z', '+00:00')).timestamp()
d = sys.argv[2]
unit = sys.argv[3]
now = lambda: datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
active = lambda: subprocess.run(['systemctl', '--user', 'is-active', '--quiet', unit]).returncode == 0
def rounds():
    try:
        return json.load(open(os.path.join(d, 'summary.json')))['rounds']
    except Exception:
        return None
stop = {'deadline': sys.argv[1], 'method': 'SIGTERM to the main process at the first round boundary after the deadline (summary saved)'}
while time.time() < deadline:
    if not active():
        stop['endedOnItsOwn'] = now(); break
    time.sleep(2)
if active():
    pid = int(subprocess.check_output(['systemctl', '--user', 'show', '-p', 'MainPID', '--value', unit]).decode().strip())
    r0 = rounds(); stop['roundsAtDeadline'] = r0; stop['deadlineReachedAt'] = now(); stop['mainPid'] = pid
    while True:
        r = rounds()
        if r is not None and r0 is not None and r > r0:
            os.kill(pid, signal.SIGTERM)
            stop['sigtermAt'] = now(); stop['roundsSaved'] = r
            break
        if not active():
            stop['endedOnItsOwn'] = now(); break
        time.sleep(0.1)
    for _ in range(600):
        if not active(): break
        time.sleep(1)
    stop['unitInactiveAt'] = now()
    time.sleep(5)
    ps = subprocess.run(['ps', '-eo', 'pid,comm'], capture_output=True, text=True).stdout
    stop['gb2StillRunning'] = any(l.split()[-1] == 'gb2' for l in ps.strip().split('\n')[1:])
    q = subprocess.run(['nvidia-smi', '--query-gpu=memory.used,utilization.gpu', '--format=csv,noheader,nounits'], capture_output=True, text=True).stdout.strip()
    stop['gpuAfter'] = {'memoryUsedMiB': int(q.split(', ')[0]), 'utilizationPct': int(q.split(', ')[1])}
    stop['computeApps'] = subprocess.run(['nvidia-smi', '--query-compute-apps=pid,process_name,used_memory', '--format=csv,noheader'], capture_output=True, text=True).stdout.strip()
json.dump(stop, open(os.path.join(d, 'stop.json'), 'w'), indent=1)
print(json.dumps(stop))
PY
echo "$(date -u +%FT%TZ) stopped"
[ -n "${STOP_ONLY:-}" ] && exit 0
"$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/stress-close.ts --dir "$DIR"; rc=$?
[ $rc -eq 0 ] || { echo "$(date -u +%FT%TZ) FAILED [closure] rc=$rc"; exit 1; }
echo "$(date -u +%FT%TZ) start [npm-test]"
U gpup2-npm-test "$L/npm-test.txt" /bin/bash -c "npm test > $PWD/$T/npm-test.txt 2>&1; echo exit=\$? >> $PWD/$T/npm-test.txt"
echo "$(date -u +%FT%TZ) end [npm-test] $(tail -1 $T/npm-test.txt)"
echo "$(date -u +%FT%TZ) start [finalists]"
U gpup2-finalists "$L/parity-finalists.txt" "$NODE" --expose-gc --max-old-space-size=14000 --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/parity-finalists.ts --out research/gpu-phase2/results/parity/final-finalists.json; rc=$?
[ $rc -eq 0 ] || { echo "$(date -u +%FT%TZ) FAILED [finalists] rc=$rc"; exit 1; }
echo "$(date -u +%FT%TZ) end [finalists]"
mkdir -p research/gpu-phase2/results/runlogs/final
for f in final-gates-chain parity-final-chain a3-replay-C19-broad1 a3-replay-C19-broad1-run1 a3-qualify-replay-C19 bench sanitizer-final negative-final mini-opt-g7f stress strategy-lab-regression parity-finalists npm-test stress-stop; do
  [ -f "$L/$f.txt" ] && cp "$L/$f.txt" "research/gpu-phase2/results/runlogs/final/$f.txt"
done
[ -d "$L/parity-final" ] && mkdir -p research/gpu-phase2/results/runlogs/final/parity-final && cp "$L"/parity-final/*.txt research/gpu-phase2/results/runlogs/final/parity-final/
"$NODE" --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase2/accept.ts --dry-run
echo "$(date -u +%FT%TZ) stress-stop complete"
