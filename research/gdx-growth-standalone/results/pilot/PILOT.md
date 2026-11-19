# Pilot — Priority 4A (engineering only)

Engineering pilot and throughput bench, run before the protocol freeze (2026-11-10T17:09Z → 17:42Z). Job names carry
`pilot-`; outputs are in the git-ignored cache (`.cache/gdx-growth-standalone/pilot/`, `…/jobs/pilot-*`); only
mechanics, timings, memory and equality were read. The pseudo-fold P18 searches on D19 (2016–2019) with pilot budgets
(independent 512 / 768, informed 384 / 512 proposals); its figures are never study results.

## Bench (D24, the largest development door; rung-1 mix: random standalone GDX centres + 16 neighbours each)

Every row is a contained unit in `gdxg.slice` (MemoryHigh 44G / MemoryMax 48G / swap 0) after a warm-up batch of 8
centres.

| Label | Workers | Book cache | GC every | Fresh evaluations | Seconds | Evaluations/s | Worker ms/eval | Peak cgroup (GiB) | Plausible centres |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| w8 | 8 | 256 | 64 | 4,352 | 28.3 | 153.9 | 51 | 5.18 | 21 / 256 |
| w10 | 10 | 256 | 64 | 4,352 | 27.2 | 160.0 | 61 | 6.44 | 21 / 256 |
| w12 | 12 | 256 | 64 | 4,352 | 27.0 | 161.3 | 73 | 7.64 | 21 / 256 |
| w14 | 14 | 256 | 64 | 4,352 | 27.4 | 158.8 | 86 | 8.92 | 21 / 256 |
| w16 | 16 | 256 | 64 | 4,352 | 27.7 | 157.2 | 99 | 10.21 | 21 / 256 |
| w12-c1024 | 12 | 1,024 | 64 | 4,352 | 26.9 | 161.9 | 73 | 7.62 | 21 / 256 |
| w12-gc128 | 12 | 256 | 128 | 4,352 | 25.4 | 171.0 | 69 | 7.60 | 21 / 256 |
| w12-gc64-b | 12 | 256 | 64 | 6,528 | 40.5 | 161.2 | 73 | 7.63 | 26 / 384 |
| w12-gc128-b | 12 | 256 | 128 | 6,528 | 38.4 | 170.0 | 69 | 7.65 | 26 / 384 |
| **w12-gc256-b** | **12** | **256** | **256** | 6,528 | 36.8 | **177.5** | 66 | 7.66 | 26 / 384 |

- **CPU-bound at ≈ 160 evaluations/s** from 10 to 16 workers (8 physical cores, 16 threads): more workers only lengthen
  each evaluation (51 → 99 worker-ms) and add memory (≈ 0.64 GiB per worker: both minute files of the reused door).
- **The book cache does not matter** for one book (a centre and its neighbours are different vectors): 256 and 1,024
  entries give the same throughput and memory.
- **Worker ArrayBuffers stay flat at ≈ 62.5 MiB** (the door's Datasets; books are built on the cached Dataset, so no
  per-run garbage accumulates); external ≈ 11 MiB. A full GC every 256 evaluations is ≈ 10% faster than every 64 at
  the same memory; the 256 MiB ArrayBuffer trigger stays as a guard.
- **Chosen:** 12 workers, GC every 256 evaluations or above 256 MiB of ArrayBuffers, book cache 256 — ≈ 170–178
  evaluations/s on D24 at ≈ 7.7 GiB (17% of MemoryHigh). Earlier doors are faster (P18 searches on D19 ran ≈ 330/s).
- **Plausibility:** only 8% (21 / 256, 26 / 384) of uniformly random standalone GDX centres are plausible (net > 0, DD
  ≤ $35,000, ≥ 1 lot), so most screened proposals cost one evaluation (centre-first fidelity).
- Other workloads during the bench: none in research slices (all 0 tasks); mongod and a vLLM server outside; host
  `MemAvailable` ≈ 49 GiB.

## Stage paths (pilot `ref`, then `ref2` after the fixes below; P18 on D19)

| Stage | Unit | Result |
|---|---|---|
| independent search | `gdxg-pilot-ref-search` | 9,181 fresh, 146 hits, 28 s; peak cgroup 5.4 GiB; 2 cells, extension caps reached (pilot caps) |
| informed search | `gdxg-pilot-ref-informed` | 10,354 fresh, 1,765 hits, 37 s |
| qualification (with 5A's instrument) | `gdxg-pilot-ref-qualify` | 21 members, 30,911 fresh, 72 s |
| fold evaluation, sequential | `…-fold`, `…-seq` | ok (first attempt refused by the preflight: the protocol had been edited, re-adopted; the guard working) |
| diagnostics, frozen selection, validation | `…-diagnostics`, `…-freeze`, `…-validate` | ok |
| full rerun `ref2` (17:27:04Z → 17:29:42Z) | `gdxg-pilot-ref2-*` | every stage exit 0; its independent lane results byte-identical to `ref` |

No `memory.high`, `memory.max` or OOM event in any pilot unit; worker ArrayBuffers ≤ 28.7 MiB on D19.

## Interruption tests (independent search, P18; `chains/pilot.sh interrupt`, 17:29:56Z → 17:31:53Z)

| Test | First run | Resume | Lane results vs the straight run |
|---|---|---|---|
| graceful stop (`--stop-after 1500`) | exit 75 (stop requested, archive committed) | exit 0 | **identical** |
| worker SIGKILL (`--kill-worker-after 200`) | exit 1 promptly ("pool failure: worker … exited"), no hang | exit 0 | **identical** |
| whole-unit SIGKILL at 3,267 fresh | killed | exit 0 | **identical** |
| duplicate concurrent keys (`dup-keys`, three overlapping concurrent requests) | resolved 16 / 16 / 4; 25 distinct keys evaluated once; 11 waits | — | pass, 2.5 s |

## Defects found and fixed before the freeze (amendment R1)

1. **The causal no-new-funding window** (diagnostics) started at the episode's first entry fill; the engine refuses
   decisions by their decision session, and a Rise decision is made at the close before its fill, so the opening
   decision escaped the blackout (a pilot subject showed a $0.00 causal contribution). The window now starts at the
   first lot's decision session (`ref2`: the same subject's causal contribution is $19,234.17).
2. **Fold role labels:** a fold's non-Appendix-A controls were labelled "Appendix A (descriptive)" (pilot-only path;
   the study's earlier folds carry only Appendix A and cash). Now "control (descriptive)".
3. **The duplicate-key test's watchdog timer** kept its unit alive for 10 minutes after the test had passed (and would
   then have raised an unhandled rejection); it is now cleared and unreferenced (rerun `dupkeys2`: 3 s, pass).
4. **Report tables:** structure class strings contain `|`; cells now escape it (tables tool, outside the closure).
