#!/usr/bin/env bash
# Study 7 job orchestrator (PROTOCOL.md §12.4). Usage, from anywhere:
#   research/study7-stability-first-d1/scripts/run_jobs.sh <jobs-file> <max-parallel>
# Each non-empty line of <jobs-file> is: <log-name> <npm run study7 arguments…>. Every job runs from the repository root
# with its own log results/runlogs/<log-name>.txt, whose last line is "exit <code>". A job whose log already ends in
# "exit 0" is skipped; a search job that was interrupted resumes from its persistent point cache (identical output).
set -u
R=/home/chad/projects/margin-trading
L=$R/research/study7-stability-first-d1/results/runlogs
mkdir -p "$L"
run_one() {
  name=$1
  shift
  if [ -f "$L/$name.txt" ] && tail -1 "$L/$name.txt" | grep -q '^exit 0$'; then
    echo "skip $name (done)"
    return 0
  fi
  echo "start $name $(date -u +%H:%M:%SZ)"
  (cd "$R" && npm run study7 -- "$@" > "$L/$name.txt" 2>&1; echo "exit $?" >> "$L/$name.txt")
  echo "end $name $(date -u +%H:%M:%SZ) $(tail -1 "$L/$name.txt")"
}
export -f run_one
export R L
grep -v '^\s*$' "$1" | xargs -P "$2" -L 1 bash -c 'run_one "$@"' _
echo "all jobs finished $(date -u +%Y-%m-%dT%H:%M:%SZ)"
