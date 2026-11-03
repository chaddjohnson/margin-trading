#!/usr/bin/env bash
# Study 9 Phase B job orchestrator (PROTOCOL.md §7.3; Study 8's run_jobs.sh, ported). Usage, from anywhere:
#   research/study9-phase-b/scripts/run_jobs.sh <jobs-file> <max-parallel>
# Each non-empty line of <jobs-file> is: <log-name> <s9b.sh arguments…>. Every job runs from the repository root with
# its own log results/runlogs/<log-name>.txt, whose last line is "exit <code>". A job whose log already ends in "exit 0"
# is skipped; an interrupted job resumes from its persistent point cache (identical output), its earlier log kept as
# <log-name>.attempt-<UTC>.txt (a resumed job opens its door twice, so `seal` then needs --acknowledge <ID>).
set -u
R=/home/chad/projects/margin-trading
S=$R/research/study9-phase-b
L=$S/results/runlogs
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
mkdir -p "$L"
# No-progress watchdog: a job whose log and point cache (results/cache/<log-name>.jsonl, flushed every 30 s while new
# points are computed) have both been idle for STUDY9B_IDLE_SECONDS (default 2700 = 45 min) is stopped (SIGTERM: the
# job flushes its cache) and its log ends "exit timeout". Rerunning this script resumes it from its cache.
IDLE=${STUDY9B_IDLE_SECONDS:-2700}
run_one() {
  name=$1
  shift
  if [ -f "$L/$name.txt" ] && tail -1 "$L/$name.txt" | grep -q '^exit 0$'; then
    echo "skip $name (done)"
    return 0
  fi
  if [ -f "$L/$name.txt" ]; then
    mv "$L/$name.txt" "$L/$name.attempt-$(date -u +%Y%m%dT%H%M%SZ).txt"
  fi
  echo "start $name $(date -u +%H:%M:%SZ)"
  (cd "$R" && exec setsid "$S/scripts/s9b.sh" "$@" > "$L/$name.txt" 2>&1) &
  pid=$!
  cache="$S/results/cache/$name.jsonl"
  while kill -0 "$pid" 2>/dev/null; do
    sleep 60
    now=$(date +%s)
    last=$(stat -c %Y "$L/$name.txt" 2>/dev/null || echo "$now")
    if [ -f "$cache" ]; then
      c=$(stat -c %Y "$cache")
      [ "$c" -gt "$last" ] && last=$c
    fi
    if [ $((now - last)) -gt "$IDLE" ] && kill -0 "$pid" 2>/dev/null; then
      echo "watchdog: idle $((now - last)) s at $(date -u +%H:%M:%SZ); stopping" >> "$L/$name.txt"
      kill -TERM -- "-$pid" 2>/dev/null
      sleep 20
      kill -KILL -- "-$pid" 2>/dev/null
      wait "$pid" 2>/dev/null
      echo "exit timeout" >> "$L/$name.txt"
      echo "end $name $(date -u +%H:%M:%SZ) exit timeout"
      return 0
    fi
  done
  wait "$pid"
  code=$?
  echo "exit $code" >> "$L/$name.txt"
  echo "end $name $(date -u +%H:%M:%SZ) exit $code"
}
export -f run_one
export R S L PATH IDLE
grep -v '^\s*$' "$1" | xargs -P "$2" -L 1 bash -c 'run_one "$@"' _
echo "all jobs finished $(date -u +%Y-%m-%dT%H:%M:%SZ)"
