# The engineering pilot (2026-11-08, 07:42–08:47Z; PROTOCOL.md §10.3)

Pilot budgets (`src/vgt-d1-growth-joint/budgets.ts` `pilot`), `pilot-` job names, outputs in the git-ignored
`.cache/vgt-d1-growth-joint/pilot/<run>/`. Every heavy step ran in its own unit inside `vgtjoint.slice`
(MemoryHigh 44 GiB, MemoryMax 48 GiB, swap 0, verified on each unit: `app.slice`-style path
`vgtjoint.slice/vgtj-pilot-*.service`). Logs: `pilot-chain.log`, `pilot2-chain.log`, `../logs/vgtj-pilot-*.log`.

| Step | What | Result |
|---|---|---|
| A | straight run on the pseudo-fold P18 (D19, boundary 2018-12-31): search (8 independent cells) → qualify → fold evaluation | exit 0 / 0 / 0; 25,156 evaluations in 3.0 min (8 workers) |
| B | search with a graceful stop after 4,000 fresh evaluations, then the same command | exit **75**, then 0 (4,305 archive hits) |
| C | search, the whole unit SIGKILLed after 45 s, then the same command (12 workers) | resumed, exit 0 (5,367 archive hits) |
| D | one worker SIGKILLs itself after 300 evaluations | the job failed with exit **1 after 20 s** (no hang), then resumed, exit 0 |
| A=B=C=D | every lane's result of the four searches | **identical** (`PILOT-COMPARE {"b":true,"c":true,"d":true}`) |
| X1 | rerun of a sealed search | refused (exit 1) |
| X2 | a failing step inside a chain | the chain stops (exit 1) |
| X3 | FULL without the frozen-selection guard | refused: "the frozen selection does not exist" |
| E | the C24-shaped path on D24: every lane (8 independent cells, informed with 30 seeds, D1 alone, 4 Growth-alone cells) → qualify (40 members) → diagnostics | exit 0 / 0 / 0; search 42,518 evaluations in 7.9 min (14 workers); diagnostics' matched-trade decompositions reconcile (check = 0); a real partial-release ledger example found |
| G | the frozen-selection and validation paths on development only (pilot E, D24, boundary 2023-12-29, pilot frozen file) | written; validation sealed; a second validation refused |
| F | the chronology path: C19, C21, C23 (independent cells) → qualify → fold evaluation, then the sequential policies | all exit 0; searches 3.2 / 4.0 / 4.5 min |
| bench | 2,000 fixed configurations | D24: 47.0 / 41.0 / 38.3 per s at 8 / 12 / 14 workers **including the serial worker start-up (≈ 2 s each)**; D19 69.9/s at 14 |

**Throughput.** Excluding start-up, ≈ 80–90 evaluations/s on D24 with 14 workers (pilot E's search: 90/s); ≈ 130–150/s on
D19. The cost is dominated by the canonical Growth engine (≈ 62 ms per run, one thread). The pooled replay was then made
faster (≈ 17 → 5.6 ms, bit-exact; AMENDMENTS R1) and the island budget sized at 768 proposals (R2).

**Memory** (`../memory/pilot-*.jsonl`; summary below): worker RSS ≤ 0.43 GiB, worker ArrayBuffers ≤ 29 MiB (the door is
built once per worker; the Growth path no longer allocates a dataset per run), job peaks ≤ 6.4 GiB at 14 workers; no
`memory.high`, `memory.max` or OOM event; no swap.

**What was read.** Timings, memory, counts, exit statuses and equality booleans. The path checks also printed pilot
figures (pilot-budget candidates on development data, e.g. the P18 roles and pilot F's sequential verdict
"unsupported", sequential drawdown ≈ $47.7k for tiny pilot budgets). The protocol's rules, criteria and verdict rule were
written before the pilot; no rule, range or design choice was changed because of a pilot figure (R2 changed the island
budget for compute time only). Disclosed in the report.
| job | samples | workers | peak cgroup (GiB) | peak RSS total (GiB) | max worker RSS (GiB) | max worker ArrayBuffers (MiB) | events (high/max/oom) | fresh / archive hits |
|---|---:|---:|---:|---:|---:|---:|---|---:|
| pilot-a-qualify-P18 | 28 | 8 | 2.70 | 3.08 | 0.34 | 13 | 0/0/0 | 36332 / 0 |
| pilot-a-search-P18 | 20 | 8 | 2.41 | 2.81 | 0.33 | 13 | 0/0/0 | 25156 / 290 |
| pilot-b-search-P18 | 24 | 8 | 2.42 | 2.82 | 0.33 | 13 | 0/0/0 | 21141 / 4305 |
| pilot-bench-bench-D19-w14 | 5 | 14 | 3.68 | 4.41 | 0.33 | 13 | 0/0/0 | 2000 / 0 |
| pilot-bench-bench-D24-w12 | 7 | 12 | 4.74 | 5.34 | 0.43 | 29 | 0/0/0 | 2000 / 0 |
| pilot-bench-bench-D24-w14 | 8 | 14 | 5.51 | 6.19 | 0.43 | 29 | 0/0/0 | 2000 / 0 |
| pilot-bench-bench-D24-w8 | 7 | 8 | 3.20 | 3.61 | 0.43 | 29 | 0/0/0 | 2000 / 0 |
| pilot-c-search-P18 | 23 | 12 | 3.47 | 4.08 | 0.33 | 13 | 0/0/0 | 20080 / 5367 |
| pilot-d-search-P18 | 23 | 8 | 2.52 | 2.92 | 0.33 | 13 | 0/0/0 | 22711 / 2735 |
| pilot-dbg1-qualify-P18 | 48 | 8 | 4.46 | 2.99 | 0.34 | 13 | 0/0/0 | 36332 / 0 |
| pilot-dbg1-search-P18 | 27 | 4 | 3.59 | 1.53 | 0.33 | 13 | 0/0/0 | 25156 / 290 |
| pilot-e-qualify-C24 | 53 | 14 | 5.79 | 6.41 | 0.43 | 29 | 0/0/0 | 43880 / 0 |
| pilot-e-search-C24 | 50 | 14 | 5.79 | 6.42 | 0.43 | 29 | 0/0/0 | 42518 / 476 |
| pilot-e-validate-perturbations | 4 | 4 | 2.09 | 2.24 | 0.43 | 29 | 0/0/0 | 396 / 0 |
| pilot-f-qualify-C19 | 27 | 14 | 4.01 | 4.68 | 0.33 | 13 | 0/0/0 | 36340 / 0 |
| pilot-f-qualify-C21 | 35 | 14 | 4.87 | 5.52 | 0.37 | 19 | 0/0/0 | 35177 / 0 |
| pilot-f-qualify-C23 | 41 | 14 | 5.53 | 6.17 | 0.42 | 26 | 0/0/0 | 35140 / 0 |
| pilot-f-search-C19 | 22 | 14 | 4.09 | 4.78 | 0.33 | 13 | 0/0/0 | 26200 / 373 |
| pilot-f-search-C21 | 27 | 14 | 4.85 | 5.52 | 0.37 | 19 | 0/0/0 | 26610 / 286 |
| pilot-f-search-C23 | 30 | 14 | 5.50 | 6.15 | 0.42 | 26 | 0/0/0 | 25214 / 335 |
