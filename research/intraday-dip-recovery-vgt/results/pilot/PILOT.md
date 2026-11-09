# Pilot — throughput, memory and recoverability (engineering, before the protocol freeze)

Run 2026-11-09 18:49–19:08Z (UTC) in transient systemd user units inside `diprecovery.slice` (MemoryHigh 44G,
MemoryMax 48G, MemorySwapMax 0; set before every launch), one unit at a time. Pilot outputs live in the git-ignored
`.cache/intraday-dip-recovery-vgt/pilot/` and are never study records. Only timings, memory, counts and equality
booleans were used for decisions. Machine: AMD Ryzen 7 9800X3D (8 cores, 16 threads), 59 GiB RAM visible, Node 24.21.0.

**Data read by the pilot.** The bench used the D24 development door. The pilot searches used the pseudo-fold P18 (a
prefix inside D19 through 2018-12-31), and the pilot fold, sequential, freeze and validate paths used D19, with 2017
and 2018 standing in for 2024 and 2025 so that FULL never opened. Every opening is in `results/doors.jsonl`. The pilot
logs print P18 and D19 (2016–2019) development results of pilot-budget candidates. These are inside every later
cutoff's training window and inform no choice.

## 1. Bench (D24, the rung-1 mix)

The rung-1 mix is centres of every family and cell from the stratified screen, each with 16 neighbours. Throughput is
steady state after the workers are ready, and includes clock building. Raw rows are in `bench.jsonl`.

| Label | Workers | GC every | Evaluations | Seconds | Evaluations/s | Job cgroup peak |
|---|---:|---:|---:|---:|---:|---:|
| w14-a (96 centres) | 14 | 256 | 1,632 | 8.9 | 183.1 | 9.49 GiB |
| w8-b | 8 | 256 | 6,528 | 25.6 | 254.7 | 6.15 GiB |
| w10-b | 10 | 256 | 6,526 | 24.9 | 262.0 | 7.65 GiB |
| w12-b | 12 | 256 | 6,527 | 23.2 | 281.1 | 8.58 GiB |
| w14-b | 14 | 256 | 6,526 | 25.0 | 261.4 | 10.09 GiB |
| w15-b | 15 | 256 | 6,527 | 26.6 | 245.7 | 10.73 GiB |
| w12-g64 | 12 | 64 | 6,525 | 29.1 | 224.5 | 8.63 GiB |
| w12-g1024 | 12 | 1,024 | 6,526 | 23.0 | 284.2 | 8.87 GiB |

- **Choice:** **12 workers, GC every 1,024 evaluations** (plus an ArrayBuffer trigger at 256 MiB). This was the fastest
  stable setting. More workers contend for the 8 physical cores and run slower. RAM is not the bottleneck: under
  9 GiB of the 48 GiB cap at peak, which leaves about 35 GiB of host headroom.
- **Pressure guard:** 32 GiB of the job cgroup (well below MemoryHigh 44G). Dispatching stops there, in-flight work
  finishes, the archive is flushed and the job exits 75.
- **Cost profile** (single thread, D24, development configurations): from about 3 ms (deep dips with long periods) to
  about 150 ms (shallow dips at B ≤ 5, with about 46,000 trades over nine years). The cost scales with turnover.
- **Compute estimate** for the frozen budgets: about 2.1M evaluations at 280–650 evaluations/s (D24 to D19), so about
  2 hours of contained compute, and up to about 3 hours with every extension island.

## 2. Pilot searches (P18, pilot budget) and the interruption tests

| Record | Proposals | Evaluations requested | Fresh | Archive or cache hits | Loaded at start | Seconds |
|---|---:|---:|---:|---:|---:|---:|
| indep-F1 | 1,180 | 12,188 | 11,705 | 483 | 0 | 13.9 |
| indep-F2 | 1,199 | 13,293 | 13,123 | 170 | 0 | 13.4 |
| indep-F3 | 1,155 | 12,426 | 12,300 | 126 | 0 | 12.9 |
| indep-F4 | 1,216 | 13,342 | 13,239 | 103 | 0 | 14.9 |
| informed-F1 | 730 | 11,685 | 10,808 | 877 | 0 | 8.0 |
| informed-F4 | 779 | 13,104 | 12,971 | 133 | 0 | 14.6 |
| explore2-F1 | 1,136 | 11,345 | 10,777 | 568 | 0 | 12.5 |
| indep-F2-graceful (resumed) | 1,199 | 13,293 | 6,196 | 7,097 | 6,927 | 8.0 |
| indep-F1-graceful2 (resumed) | 1,180 | 12,188 | 5,419 | 6,769 | 6,286 | 9.5 |
| indep-F3-unitkill (resumed) | 1,155 | 12,426 | 5,941 | 6,485 | 6,359 | 9.0 |
| indep-F4-workerkill (resumed) | 1,216 | 13,342 | 9,731 | 3,611 | 3,508 | 12.0 |

Each resumed record was compared with its uninterrupted twin on every decision field (counts, coverage, islands,
refinement, shortlist, infeasible diagnostics, rung-3 fits, extension stop and hypervolume):

| Test | What happened | Result |
|---|---|---|
| Graceful stop, all processes signalled (`systemctl --user kill -s TERM`, F2) | The orchestrator stopped dispatching and archived its progress. The workers were also signalled and exited, which failed the pool. The job exited and the rerun resumed from the archive. | **IDENTICAL** |
| Graceful stop, orchestrator only (`--kill-whom=main -s TERM`, F1) | Dispatching stopped, in-flight work finished and the archive was flushed (6,286 evaluations). The unit exited **75/TEMPFAIL**, and the rerun read the 6,286 evaluations back. | **IDENTICAL** |
| Abrupt unit kill (`systemctl --user kill -s KILL`, F3) | Every process was killed at once. A torn last line, if any, is ignored. The rerun read 6,359 archived evaluations. | **IDENTICAL** |
| Abrupt worker kill (`--kill-after 300`: one worker SIGKILLs itself, F4) | The pool failed the job **promptly** (it ended 9 s after launch, status 1, "worker … exited (SIGKILL)"). There was no hang and no restart. The rerun read 3,508 archived evaluations. | **IDENTICAL** |

## 3. Other paths exercised on pilot budgets

These were exercised on development data only, with outputs in the cache: qualification of the P18 fold (14 members,
with the full evidence of selection 2 × 128, confirmation 3 × 128, scopes, radius families, stresses and toggles), the
fold selection seal, the fold evaluation on the 2019 slice, the sequential procedure, the L0–L5 ablation (on P18),
controls (on P18), diagnostics (ledgers, years, concentration, cost curves, capacity), the frozen selection and the
validation path (on D19 as above).

The expected refusals both held. A non-pilot `search` refused (the preflight fails before the adoption manifest
exists), and `validate` refused (preflight).

## 4. What the pilot changed before the freeze

Three changes were made. The bench set the worker count (12), the GC cadence (1,024) and the pressure threshold
(32 GiB). Pilot modes were added for the sequential, freeze and validate paths, so that FULL never opens in a test. A
parameter name clash in `post.ts` `windowsOf` was fixed. No budget was shrunk below the declared base. The pilot
budget is a separate small schedule (`budgets.ts` `pilot`).
