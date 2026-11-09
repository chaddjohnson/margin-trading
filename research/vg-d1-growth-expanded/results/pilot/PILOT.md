# Engineering pilot and throughput bench (before the freeze)

Engineering only. Pilot budgets, `pilot-` job names, the pseudo-fold P18 (search door D19, development data), outputs in
the git-ignored cache (`.cache/vg-d1-growth-expanded/pilot/`). Only mechanics, timings, memory, counts and equality were
read; pilot figures are not study results and changed no rule except where an `R` amendment says so (R1).

## Throughput bench (D24; `npm run vg-exp -- bench`)

Representative rung-1 mix: 192 random configurations spread over the 8 cells (all three inclusion choices), each with
its 16 joint neighbours (3,264 evaluations), timed after a warm-up batch; each run its own unit in `vgexp.slice`.

| Workers | Book cache | GC every | Evaluations/s | ms per evaluation per worker | Job cgroup peak |
|---:|---:|---:|---:|---:|---:|
| 4 (smoke) | 48 | 64 | 47.3 | 83 | 2.5 GiB |
| 8 | 48 | 64 | 75.8 | 105 | 5.1 GiB |
| 12 | 48 | 64 | 77.6 | 153 | 7.7 GiB |
| **14** | **48** | **64** | **78.7** | 175 | **8.9 GiB** |
| 16 | 48 | 64 | 78.5 | 201 | 10.2 GiB |
| 16 | 256 | 64 | 78.1 | 202 | 10.0 GiB |
| 16 | 48 | 32 | 73.8 | 214 | 10.1 GiB |

- **Choice:** 14 workers, GC every 64 evaluations (or above 256 MiB of ArrayBuffers), book cache 48 — the fastest
  stable setting; throughput saturates at the 8 physical cores (SMT adds ≈ 4%). A larger cache or more frequent GC
  does not help. Host headroom at 14 workers: ≈ 44 GiB of 59 GiB.
- Only 3 of 192 random centres were plausible (net > 0, DD ≤ $35,000, both families funded): centre-first fidelity
  (AD7) spends neighbours only where they can matter.

## Pilot paths (pilot `ref`, 14 workers)

| Stage | Fresh evaluations | Wall | Job cgroup peak | Result (mechanics) |
|---|---:|---:|---:|---|
| independent search, 8 lanes concurrently | 52,975 (+679 archive hits) | 3.9 min | 6.4 GiB | 8 lanes sealed; extension decisions recorded |
| informed search, 2 lanes concurrently | 20,566 (+4,190 hits) | 1.7 min | 6.2 GiB | 87 / 88 seeds, focus designs, C4 refinement starts, inclusion moves |
| qualification (32 members) | 56,160 | 5.4 min | 6.5 GiB | gates, roles, C4 labels, archived instrument, near misses |
| fold evaluation, sequential | (in-process) | 4 s | — | slice records, verdict |
| diagnostics (18 subjects) | (in-process) | 10 s | — | ledgers, funnels, refusals, blackout reruns, GDX admission cost, matched lots |
| frozen selection, validation (on D19) | 256 | 15 s | 6.2 GiB | V1–V3, recommendation rule, report-only neighbours |
| tables | — | — | — | every Markdown table renders |

## Interruption tests (identical resumption)

| Test | What happened | Resumed result |
|---|---|---|
| graceful stop | `--stop-after 6000`: dispatch stopped, in-flight work finished, archive committed, exit 75 (46 s) | identical lane results to the straight run |
| worker death | one worker SIGKILLed itself after 400 evaluations: the job failed promptly (exit 1, 44 s, no hang) | identical |
| unit kill | the whole unit SIGKILLed at 9,106 fresh evaluations | identical |

`npm run vg-exp -- pilot-compare ref grace wkill ukill`: every resumed P18 independent search sealed lane results equal
to the uninterrupted run's (8 lanes, every count, island log, rung, refinement and shortlist).

## What the pilot changed

- **R1:** the extension rule's "new behaviour" trigger became a new funded-component pattern in the cell (the first
  pilot showed the drafted gate × eligibility × funded key firing on combinatorics alone).
- No other rule changed. The pilot also confirmed the stage guards (a stale adoption manifest refused a stage).
