#!/bin/bash
# gpu-phase5: runs one benchmark job inside its transient unit and records its exit status in <status file> (a unit
# started with --collect is garbage-collected after it exits, so its status would otherwise be lost).
#   tools/gpu-phase5/job.sh <status file> <command> [args...]
status=$1; shift
echo "$(date -u +%FT%TZ) job start (pid $$): $*"
"$@"
rc=$?
echo "$rc" > "$status"
echo "$(date -u +%FT%TZ) job end status $rc"
exit "$rc"
