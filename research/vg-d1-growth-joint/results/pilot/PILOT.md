# The engineering pilot (PROTOCOL.md §13.3) — 2026-11-08T23:21Z → 2026-11-09T00:14Z

Engineering only: pilot budgets (`budgets.ts` `pilot`), `pilot-` job and unit names, outputs in the git-ignored
`.cache/vg-d1-growth-joint/pilot/`, development doors only (D19, D21, D23, D24). Only timings, memory, counts,
statuses and equality booleans are used here; no pilot result informed a rule, a budget beyond R1's throughput, a gate,
a role or a range. Every unit ran in `vgjoint.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0), one at a time.
Unit logs: `results/logs/vgjoint-pilot-*.log`; chain log `results/logs/pilot-chain.log`; memory samples
`results/memory/pilot-*.jsonl`.

## 1. The bench (D24; `.cache/vg-d1-growth-joint/pilot/bench.jsonl`)

The rung-1 mix: random four-component centres of every cell and gate pair, each with its 16 joint neighbours.

| Workers | Book cache | GC every | Evaluations | Start-up (s) | Steady state (evaluations/s) | Peak job cgroup |
|---:|---:|---:|---:|---:|---:|---:|
| 8 | 48 | 8 | 3,264 | 10.5 | 47.4 | 5.14 GiB |
| 12 | 48 | 8 | 3,264 | 15.3 | 50.1 | 7.59 GiB |
| 14 | 48 | 8 | 3,264 | 19.9 | 50.8 | 8.96 GiB |
| 15 | 48 | 8 | 3,264 | 20.1 | 50.6 | 9.53 GiB |
| 16 | 48 | 8 | 3,264 | 20.3 | 51.2 | 10.12 GiB |
| 15 | 128 | 8 | 3,264 | 20.2 | 51.2 | 9.52 GiB |
| 15 | 48 | 32 | 3,264 | 20.1 | 61.3 | 9.47 GiB |
| 15 | 48 | 64 | 3,264 | 20.1 | **64.3** | 9.50 GiB |
| 15 (D19) | 48 | 32 | 3,264 | 9.3 | 124.5 | 6.28 GiB |

An earlier run with start-up inside the timing (1,632 evaluations; 8–16 workers; cache 16/48) gave 30–37
evaluations/s — dominated by the start-up, which led to the steady-state bench above. Throughput saturates near the
8 physical cores; the book cache does not matter (joint neighbourhoods rarely reuse a book); a full GC every 64
evaluations is 27% faster than every 8 at the same memory (the 256 MiB ArrayBuffer guard stays). **Choice: 15 workers,
GC every 64** (AMENDMENTS R1). CPU: ≈ 11–12 cores busy at 15–16 workers.

## 2. The paths (all exit statuses as expected)

| Run | What | Fresh evaluations (archive hits) | Minutes | Peak job cgroup |
|---|---|---:|---:|---:|
| A | arm D search, P18 (4 cells) | 33,377 (314) | 2.83 | 6.73 GiB |
| A | arm B Growth-pair search, P18 | 21,923 (218) | 1.85 | 6.54 GiB |
| A | Growth-pair qualification → 2 staged pairs | — | ≈ 1.3 | — |
| A | arm C informed search (4 seeds: 2 unchanged controls + 2 staged) | 8,824 (65) | 0.98 | 6.59 GiB |
| A | C24-shaped qualification (19 members, 5 role sets), fold evaluation, diagnostics (17 subjects, ablations, 16 matched decompositions), freeze-selection, validation path (D24, 3 perturbed subjects) | — | ≈ 3.5 | — |
| F | arm D at C19 / C21 / C23 (pilot budgets), qualification, fold evaluation each, the sequential policies | 33,746 / 32,645 / 31,256 | 2.85 / 3.70 / 5.19 | 6.72 / 7.87 / 9.07 GiB |
| B | P18 search with a graceful stop after 1,500 fresh evaluations → exit 75; the same command resumed → exit 0 | 31,877 (1,814) | 2.67 | 6.67 GiB |
| C | P18 search; the unit SIGKILLed after 40 s; the same command resumed → exit 0 | 28,489 (5,223) | 2.41 | 6.67 GiB |
| D | P18 search (8 workers); one worker SIGKILLs itself after 200 evaluations → the job failed (exit 1) **20 s** after its start, without hanging; resumed → exit 0 | 31,701 (1,990) | 2.50 | 3.81 GiB |

- **Identical resumption:** the lanes of B, C and D equal A's exactly (`PILOT-COMPARE {"b":true,"c":true,"d":true}`).
- **Expected refusals (in process):** a sealed search rerun; a study search before the protocol freeze; a validation
  without a frozen selection; the FULL door without the guard ("FULL needs the frozen selection guard").
- **Memory:** across every pilot and bench unit, no `memory.high`, `memory.max`, OOM or OOM-kill event; the largest job
  cgroup peak was 10.14 GiB (the 16-worker bench).
- **Disclosure.** While writing the report-table tool, pilot A's record fields were printed once (one pilot member's
  development figures on D19 with pilot budgets). They informed nothing; the protocol's rules, gates and roles were
  already written.
