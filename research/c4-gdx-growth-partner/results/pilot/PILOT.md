# Pilot — Priority 3C (engineering only; no study record)

Every pilot job carries a `pilot-` name and writes only into the git-ignored cache (`.cache/c4-gdx-growth-partner/`).
Only timings, memory, counts, mechanics and equality were read. All units ran in `c4gdx.slice` (MemoryHigh 44G,
MemoryMax 48G, MemorySwapMax 0); no `memory.high`, `memory.max` or OOM event occurred in any of them.

## Throughput bench (D24; standard §6.3)

A representative rung-1 mix: random GDX books beside each arm's anchors (128 per arm), each centre with its 16
whole-portfolio neighbours (6,528 evaluations after a warm-up batch), per-worker book caches of 1,024 entries.

| Workers | Evaluations/s | Centres/s | Worker ms per evaluation | Peak job cgroup |
|---:|---:|---:|---:|---:|
| 12 | 135.2 | 137.5 | 87 | 7.7 GiB |
| **14 (chosen)** | **135.4** | 138.0 | 101 | 9.0 GiB |
| 16 | 133.4 | 134.6 | 117 | 10.2 GiB |

Throughput saturates at 12–14 workers on the 8 physical cores (16 threads). In-process, a GDX Growth book costs ≈ 35 ms
and the pooled replay ≈ 6–15 ms on D24; the anchor books are cache hits after their first use (common random numbers).
Plausible random centres (net > 0, DD ≤ $35,000, anchors' families and Growth·GDX funded): R 74 / 128, O 47 / 128,
G 40 / 128. A small first bench (96 centres) gave 107/s (start-up dominated).

## Reference run (pseudo-fold P18 on D19, pilot budgets; every stage path)

| Stage | Unit | Result |
|---|---|---|
| search (9 lanes, 3 arms) | `c4gdx-pilot-ref-search` | **hung** with every worker idle after 26,540 fresh evaluations (12:49Z → stopped 13:01:52Z, SIGTERM → exit 75, archive committed); cause: three lanes of an arm submitted the arm's baseline key at once and the pool kept one callback per key (amendment R1). Fixed in `lab.ts`; the same command resumed it: 15,048 fresh + 27,424 archive hits, every finished lane replayed identically; sealed |
| qualify | `c4gdx-pilot-ref-qualify` | 26 members (both scopes, the anchors scope, small/wide, stresses, toggles, removals, 3B's instrument); 47,095 fresh; 3.8 min |
| fold evaluation, sequential | `c4gdx-pilot-ref-fold`, `-seq` | per-arm fold primaries, baseline, roles and controls on the "slice" 2019; sequential policies and both descriptive verdicts |
| transfers | `c4gdx-pilot-ref-transfers` | the frozen transfer set placed beside the other arms' anchors (full instrument); 31,090 fresh; 2.5 min |
| diagnostics | `c4gdx-pilot-ref-diagnostics` | increment decomposition: matched lots reconcile to $0.00 for every GDX-enabled subject; refusals behind Growth·GDX; subperiods; blackout reruns |
| frozen selection, validation | `c4gdx-pilot-ref-freeze`, `-validate` | the pilot's frozen selection and validation on D19 (boundary 2018-12-31), stresses and paired validation neighbourhoods (1,280 fresh) |
| tables | `tools/c4-gdx-growth-partner/tables.ts --pilot ref` | every table rendered |

Peak job cgroup 6.3–6.9 GiB; worker ArrayBuffers ≤ 28.3 MiB (GC every 64 evaluations).

## Interruption tests (identical resumption; standard §6.4)

| Test | What happened | Resumed result |
|---|---|---|
| graceful stop | `--stop-after 3000`: stopped at 3,027 fresh, exit 75 | resumed to completion (38,558 fresh, 3,886 hits) |
| worker kill | one worker SIGKILLed itself after 300 evaluations: the job failed promptly (`pool failure: worker … exited (SIGKILL)`, exit 1; 4,084 fresh), no hang | resumed to completion (37,501 fresh, 4,943 hits) |
| unit kill | the whole unit SIGKILLed at 4,040 fresh | resumed to completion (37,545 fresh, 4,899 hits) |

`npm run c4gdx -- pilot-compare ref grace wkill ukill`: **identical lane results** for all three against the reference
(itself a stopped-and-resumed run).

## What the pilot changed before the freeze

- R1: one in-flight evaluation per key across concurrent lanes (`lab.ts`), the hang above.
- The search evaluation cap was raised from the draft's 900,000 to 1,000,000 per cutoff (total 5,000,000) because the
  worst case at every extension cap with every rung-1 centre measured is ≈ 0.9 M (R2). No budget, rule or gate changed.
