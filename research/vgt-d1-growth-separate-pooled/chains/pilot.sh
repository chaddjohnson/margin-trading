#!/usr/bin/env bash
# S2 pilot (PROTOCOL.md §9, standard §6.4): interruption tests of the neighbourhood stage on development data only.
# Pilot jobs are named pilot-<name>-neighbourhood; nothing is sealed; outputs in .cache/vgt-d1-growth-separate-pooled/pilot/.
#   p1: a worker SIGKILLs itself after 300 of its evaluations (2 workers) -> the job must fail promptly (status != 0);
#       the same pilot rerun with 8 workers must complete from its archive.
#   p2: the coordinator receives SIGTERM mid-run -> exit 75; rerun -> complete.
# Fail-fast: every step's status is tested explicitly.
R=/home/chad/projects/margin-trading
cd "$R" || exit 1
L() { npm run --silent vgt-pair -- launch --unit "$1" --wait -- "${@:2}"; }
need() { if [ "$1" != "$2" ]; then echo "$(date -u +%T) FAILED: $3 (status $1, expected $2)"; exit 1; fi; echo "$(date -u +%T) ok: $3 (status $1)"; }

t0=$(date +%s)
L vgtpair-pilot-p1a neighbourhood --pilot p1 --workers 2 --kill-worker-after 300; s=$?
echo "$(date -u +%T) p1a ended after $(( $(date +%s) - t0 )) s"
if [ "$s" = 0 ]; then echo "FAILED: p1a should have failed"; exit 1; fi
need "$s" "$s" "p1a worker kill failed the job"
L vgtpair-pilot-p1b neighbourhood --pilot p1 --workers 8; need $? 0 "p1b resume"

M=$R/research/vgt-d1-growth-separate-pooled/results/memory/pilot-p2-neighbourhood.jsonl
L vgtpair-pilot-p2a neighbourhood --pilot p2 --workers 8 &
pid=$!
for i in $(seq 1 120); do
  sleep 2
  c=$( [ -f "$M" ] && tail -1 "$M" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read())["evaluations"]["completed"])' 2>/dev/null || echo 0)
  if [ "${c:-0}" -ge 300 ]; then break; fi
done
echo "$(date -u +%T) p2a: $c completed, sending SIGTERM to the coordinator"
systemctl --user kill --kill-whom=main --signal=SIGTERM vgtpair-pilot-p2a.service
wait $pid; need $? 75 "p2a graceful stop"
L vgtpair-pilot-p2b neighbourhood --pilot p2 --workers 8; need $? 0 "p2b resume"

python3 - <<'PY'
import json
a=json.load(open('/home/chad/projects/margin-trading/.cache/vgt-d1-growth-separate-pooled/pilot/p1/neighbourhood.json'))
b=json.load(open('/home/chad/projects/margin-trading/.cache/vgt-d1-growth-separate-pooled/pilot/p2/neighbourhood.json'))
same = a['pair']['evidence'] == b['pair']['evidence'] and a['reproduction'] == b['reproduction']
print('p1 == p2 (pair evidence, reproduction):', same)
print('compute p1', a['compute'], 'p2', b['compute'])
raise SystemExit(0 if same else 1)
PY
need $? 0 "p1 and p2 records equal"
echo "$(date -u +%T) PILOT-DONE"
