# S5 pilot (2026-11-07T23:19Z → 23:24Z; `pilot-` jobs on D24 only; infrastructure, never read by a study stage)

Every job ran in its own transient unit (`systemd-run --user --collect -p MemoryHigh=44G -p MemoryMax=48G
-p MemorySwapMax=0 -p KillMode=mixed`, absolute Node binary). Each job log shows its cgroup
`…/app.slice/vgbe-pilot-*.service` with `memory.high 47244640256` (44 GiB), `memory.max 51539607552` (48 GiB),
`swap.max 0`. tmux and the Claude session stayed outside.

| Job | Specs | Workers | Peak cgroup memory | Peak RSS (coordinator + workers) | Test |
|---|---:|---:|---:|---:|---|
| pilot-straight | 12 | 2 | 1.56 GB | 1.65 GB | reference |
| pilot-restart | 12 | 2 | 1.60 GB | 1.71 GB | `--stop-after 5`: stop requested, in-flight finished, 6 archived, checkpoint written, exit 75; rerun: 6 fresh + 6 archived; **identical** to pilot-straight (6,578 values) |
| pilot-grid-straight | 61 | 2 | 1.57 GB | 1.65 GB | reference |
| pilot-kill | 61 | 1 | 0.85 GB | 0.91 GB | **vacuous**: the trigger fired during worker start-up (before any evaluation); the job failed at start; rerun completed. It exposed the defect below. |
| pilot-kill-b | 61 | 1 | 0.87 GB | 0.94 GB | worker `SIGKILL`ed after 15 completed: job failed cleanly (16 archived, checkpoint, monitor sample "failed: worker … exited (SIGKILL)", exit 1, no restart); rerun: 45 fresh + 16 archived; **identical** to pilot-grid-straight (33,136 values) |
| pilot-sigterm | 61 | 1 | 0.88 GB | 0.92 GB | `systemctl --user stop` after 15 completed: SIGTERM → stop path, 17 archived, checkpoint, exit 75; rerun: 44 fresh + 17 archived; **identical** (33,136 values) |

Per worker ≈ 0.7 GB (two loaded ETFs, typed arrays) with `gc()` every 8 evaluations. The study's stages use ≤ 6
workers (≈ 4.5 GB expected), far below the 44 GiB high mark; the job's stop threshold stays at 12 GiB (`resources.pressure`).
Records: `results/memory/pilot-*.jsonl`, `results/pilot/compare-*.json`, `results/pilot/logs/`.

Defect found and fixed (AMENDMENTS E1): a worker that died with a task in flight left that task "busy", so the pool's
run loop could never end; the dead worker's tasks are now dropped and the job fails through the commit-and-checkpoint
path (verified by pilot-kill-b). Worker start-up is now inside the same failure path.
