# Pilot — Priority 7A (engineering only; before the freeze)

Pilot names (`pilot-…` jobs, `getf-pilot-…` units), the pseudo-fold P18 (search on D19 = 2016-01-04 → 2019-12-31; its
"slice" 2019), outputs in `.cache/growth-etf-screening/pilot/` (git-ignored). Mechanics, timings, counts and memory only:
no pilot outcome is read for any choice. Every pilot simulation is counted against the 2,000,000 ceiling
(`results/budget-ledger.jsonl`). All runs were transient units inside `getf.slice` (MemoryHigh 44G, MemoryMax 48G,
MemorySwapMax 0).

## Bench (XLK, D24; 192 random centres + 8 neighbours each, after 8 warm-up centres; GC every 256)

| Workers | Start batch | Evaluations | Seconds | Evaluations/s | Worker ms / evaluation | Peak job cgroup |
|---:|---:|---:|---:|---:|---:|---:|
| 8 | 4 | 1,728 | 12.4 | 139.5 | 56 | 3.70 GiB |
| 12 | 4 | 1,728 | 13.0 | 132.7 | 88 | 5.54 GiB |
| 14 | 4 | 1,728 | 12.6 | 136.7 | 100 | 6.42 GiB |
| 16 | 4 | 1,728 | 13.3 | 129.5 | 120 | 7.36 GiB |
| 12 | 12 | 1,728 | — | 135.8 | — | 5.45 GiB |

CPU-bound on the 8 physical cores; hyperthreads add nothing within one job. Starting all workers at once cut the
start-up from 9.1 s to 5.6 s. **Choice (R2):** 8 workers per ETF job, 2 ETF jobs at a time (the barriers of one job are
filled by the other), start batch 8.

## Straight run of every stage path (`ref2`, final code; IJR, GDX, TLT, XLK; pilot budgets)

screen (2 jobs at a time) → selection → fold evaluation (P18 → 2019 on D19) → sequential (replays on D24, cross-checked
against the sealed fold evaluation) → transfer lane → final selection → diagnostics (small / wide families, causal
top-episode reruns, neighbour episode reproduction, busy-day overlaps, buy-and-hold references): every step exit 0.
(An earlier straight run, `ref`, on the pre-R4 code also passed; its outputs are kept and not used.)

## Sizing (`size2`: study budgets on P18, XLK alone; `size`: XLK and TLT concurrently, pre-R4 code)

| Run | Proposals | Fresh simulations (job) | Archive hits | Wall | Peak cgroup |
|---|---:|---:|---:|---:|---:|
| size2 XLK (alone) | 1,024 | 5,787 | 342 | 18.7 s | 2.74 GiB |
| size XLK (2 concurrent) | 1,024 | 5,787 | 342 | 32.3 s | 5.0 GiB (unit) |
| size TLT (2 concurrent) | 1,024 | 5,188 | 353 | 28.5 s | 5.0 GiB (unit) |

The worst case of a study job is 6,821; D19 jobs used 76–85% of it (island children are mostly plausible). Projection:
≈ 5,500–6,500 per ETF × cutoff → ≈ 1.3–1.6 M for the 240 screens, within the frozen worst case; ≈ 30–60 s per ETF job
pair on D19–D24 → ≈ 2–2.5 h for the study.

## Interruption tests (final code; `size2` is the reference; XLK P18, study budgets)

| Test | What happened | Resume | Result |
|---|---|---|---|
| graceful (`int3-graceful`) | `--stop-after 2000`: stop requested at 2,015 fresh; in-flight work finished, archive committed, exit 75 | rerun of the same command: exit 0 (3,772 fresh, 2,357 archive hits) | search and qualification records **identical** to size2 |
| worker kill (`int3-worker`) | `--kill-worker-after 150`: worker SIGKILLed itself at 1,138 fresh; the pool failed the job within 1 s (exit 1, no hang) | rerun: exit 0 (4,649 fresh, 1,480 hits) | **identical** |
| unit kill (`int3-unit`) | `systemctl --user kill -s SIGKILL` at 15 s while active; 3,695 evaluations archived, no record written | rerun: exit 0 (2,092 fresh, 4,037 hits) | **identical** |
| duplicate concurrent keys (`dk2`) | three concurrent `evalMany` calls with overlapping keys on one pool | — | all resolved; 25 distinct keys evaluated once each (25 fresh, 11 hits); pass |

Void and repeated (recorded in R3/R4): the first worker-kill and unit-kill tests on pilot budgets ended before the kill
(`int-worker`, `int-unit`); the first study-size unit-kill test stopped at the preflight because the protocol draft was
edited while it ran (`int2-unit`).

## Findings fixed before the freeze

R3: the ETF shortlist's seed-alternative slot (unit test); the single-ETF entry points run the stage guards; the
study-size sizing option. R4: island children equal to a screened centre are duplicates, so every ETF receives exactly
1,024 distinct proposals per cutoff.

## Compute

Engineering before the freeze (universe scan aside): parity 730 checks; bench; dry-run parity; pilot straight runs,
sizing, interruption and duplicate-key tests — **59,751 fresh simulations** (15,272 archive hits) by the ledger at
2026-11-11T21:14:43Z.
