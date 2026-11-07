# Memory: the earlier crash, the measured growth, the safeguards (growth140-vgt-s8m)

## 1. The incident (evidence, not assumption)

- **Kernel journal** (`journalctl -k`; journal times are CET, +01:00, verified with `timedatectl`):
  - 2026-11-07 11:26:09 CET = **10:26:09 UTC**, a global OOM (`constraint=CONSTRAINT_NONE`, `global_oom`);
  - victim PID 388644 `MainThread`, anon-rss 55,864,992 kB, total-vm 192,540,436 kB, page tables 430,812 kB;
  - in `user@1000.service/tmux-spawn-b58267bc-….scope`, where the kill was triggered by thread 388648 (`V8Worker`,
    a V8 platform thread of the same process);
  - free swap 0 kB of 8 GB at the time;
  - the scope then failed (`oom-kill`, "54G memory peak"), taking the Claude session with it.
- **Process attribution.**
  - The OOM report's task list gives the tree `claude` 372424 → bash 388603 → bash 388605 → `npm run growth-…` 388607
    → `sh` 388643 → 388644.
  - The failed session's transcript (`~/.claude/projects/-home-chad-projects-margin-trading/8fd4f917-….jsonl`) shows
    the command: `node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288
    src/growth-vgt-study8/main.ts search`, started 10:25:39Z.
  - Its log line "development door opened for search … 743918 rows" was written at 10:25:42Z, and `ps` listed 388644 at
    10:26:04Z. The kill came **≈ 27 s after the door opened**: an explosive start, not a slow leak.
- **The failed design** (read from the reverted commit `dd2f07f`, not re-run): `ParallelLab` started
  `min(14, cores − 2)` = 14 `worker_threads` in that one process. Each loaded the development door itself and
  evaluated batches through the canonical `runRiseTrading`. Each had `resourceLimits.maxOldGenerationSizeMb: 3072`.
  Results were cached in an unbounded `Map`.

## 2. What was measured here (the canonical engine, inside capped transient units)

- **Per isolate.**
  - Loading the development door: 1.7 s, a heap of ≈ 156 MB, RSS ≈ 393 MB.
  - One canonical run takes 25–70 ms and allocates ≈ 28 MB of ArrayBuffers: `runRiseTrading` builds a fresh
    `fixtureDataset` (typed arrays over 743,918 minutes) on every call.
- **Without explicit GC**, V8 lets that garbage accumulate.

  | Probe (no data figures printed) | After | ArrayBuffers | RSS | heapUsed |
  |---|---:|---:|---:|---:|
  | A: main thread, default limits | 250 runs | 7.0 GB | 7.8 GB | 0.57 GB |
  | B: one worker thread, `maxOldGenerationSizeMb: 3072` (the failed setting) | 250 runs | 5.3 GB | 6.0 GB (process) | 0.42 GB |
  | C: main thread, `gc()` every 10 runs | 400 runs | ≤ 0.28 GB | 0.73 GB | 0.16 GB |
  | D: one worker thread, `gc()` every 10 runs | 400 runs | ≤ 0.28 GB | 0.75 GB | 0.16 GB |

- **What follows.** The V8 old-space limits (`--max-old-space-size`, `maxOldGenerationSizeMb`) never engage, because
  the heap stays small. The growth is ArrayBuffer backing stores (external memory), which those limits do not cover.
  - Fourteen such workers in one process, plus the main thread's door and caches, plausibly demand ≈ 14 × 4–6 GB,
    which exceeds the host's RAM within seconds of starting.
- **Attribution.** This is the crash mechanism the evidence supports: the per-run typed-array garbage of the canonical
  engine, multiplied by 14 concurrent isolates, unbounded by their heap limits.
  - The failed code was not re-run, so its exact peak composition (load transients, the result `Map`, the batching of
    queued messages) is not attributed beyond this.
  - The Study 8 evaluator's 30,000-entry trace cache and its whole-file `PointCache` are **not** on this path. Neither
    the Growth engine nor the failed adapter (which imported only a type from Study 8's `evaluate.ts`) uses them, and
    the new study does not import them.

## 3. Safeguards implemented (`src/growth140-vgt-s8m/`, PROTOCOL.md §3)

| Source of growth | Safeguard | Measured in the pilot |
|---|---|---|
| Per-run typed-array garbage (the cause above) | each worker is a child process with `--expose-gc --max-old-space-size=1024`; a full GC after every 8 evaluations or above 256 MiB of ArrayBuffers (`worker.ts`) | worker ArrayBuffers ≤ 197 MiB; worker RSS 440–480 MiB median, ≤ 685 MiB max |
| Duplicated door data | the coordinator holds no market data; each worker one copy (≈ 389 MiB), started one at a time | ≈ 0.5 GiB per added worker (cgroup 0.78 → 6.52 GiB from 1 to 12 workers) |
| Result cache | SQLite archive per job (32 MiB page cache) + LRU ≤ 50,000 compact records + write buffer ≤ 500 rows / 2 s (`store.ts`); namespace-bound | coordinator RSS ≤ 200 MiB; LRU of 256 (eviction) reproduced the output exactly |
| Retained traces / ledgers | none retained: compact records only; minute curves and ledgers regenerated on demand for selected configurations (`detailOf`) | — |
| Cache loading | records read by key on demand; tables iterated in bounded pages | reload test B: 10,066 disk reads, 0 fresh evaluations, identical output |
| Queued work / promises | ≤ 2 tasks in flight per worker; a batch enters the queue ≤ 4,096 keys at a time; centres fitted 256 at a time | in flight ≤ 2 × workers; queue ≤ 3,942 keys |
| Aggregate job | transient systemd user service: MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0, KillMode=mixed, no restart; pressure threshold 16 GiB → stop, checkpoint, exit 75 | no `high`/`max`/OOM events, swap 0 |
| Interruption | atomic, hash-validated checkpoints every boundary/generation and ≥ once a minute; deterministic resume | stop-after (D) and SIGKILL (E) resumes reproduced the uninterrupted run exactly; qualification and validation stop/resume likewise |

Per-phase figures: `results/pilot/memory-summary.json`; every 10-second sample: `results/memory/<job>.jsonl`; the
driver records: `results/pilot/pilot-driver.json`, `pilot-driver-2.json`, `pilot-restart-checks.json`.
