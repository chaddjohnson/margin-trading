# The Phase 4 parity mismatch — root cause (GPU Phase 5)

## 1. Verdict

**RESOLVED** by the rule frozen before any reproduction result existed (`PROTOCOL.md` §4.7), with the attribution limit
of §8 stated plainly.

- **The cause is a defect of the JavaScript engine, not of the GPU evaluator, the CUDA kernels, the host codec, the
  trading logic or the hardware.** Under Node v24.21.0 (V8 13.6.233.17) with V8's mid-tier compiler **Maglev** enabled,
  two objects created by one object literal can end up **sharing the storage of their number fields**: the first
  object silently takes the numbers of the next one. It depends on when optimized code is installed (so it is
  timing-dependent, far more frequent on a loaded machine, and not reproducible on demand); it happens early in a
  freshly started process and can persist there.
- **It reproduces the historical signature on the historical candidate.** In cold processes running the CPU parity
  reference exactly as a campaign worker does, `O-fund:coarse:28` — as the *second* evaluation of its process, its
  position in Phase 4's worker 8 — came out with the **correct books hash, the correct pool hash, the correct
  envelope and a wrong record hash**. The first differing fields, from the original objects: `record.virtual['D1:GDX']
  .net` and `.dd` held the numbers of `record.virtual['D1:VGT']` (53,994.45 and 67,422.29 instead of −48,558.44 and
  103,786.91). The literal is `virtual[b.book] = { trades, net, dd, first }` in `recordOf`
  (`src/vg-d1-growth-joint/evaluate.ts`), unchanged canonical code.
- **With `--no-maglev` it does not occur:** 0 of 1,170 cold processes against 9 of 1,180 with the default engine, run
  side by side under the same load (§5).
- **The fix** (smallest causal): every process that produces an official result or parity evidence runs its JavaScript
  **without Maglev** — required and checked by the official gate and the official runner, inherited by the host
  worker threads, used by the parity-reference workers and by the whole acceptance campaign (§7). No comparison, hash,
  tolerance, engine source or trading rule changed.
- **The GPU side was never wrong in any capture.** In every captured event the GPU's value equalled the correct one;
  the device's raw response was byte-identical in every repetition; the GPU host path's own soak was clean.

The Phase 4 verdict is not rewritten: its campaign's parity gate FAILED, its record `research/gpu-phase4/results/
parity/final/D24-fund.json` and diagnostics are untouched, and the acceptance was correctly not renewed there.

## 2. The historical event (from Phase 4's records, unchanged)

Run `D24-fund` (door D24, option set `fund`, `--refs --random 1500 --strata 2 --label O-fund --detail --risk`; 1,561
tasks; 12 CPU reference worker processes with chunks of 4; the GPU side one batch through the 8-worker host pipeline;
binary `b01f4362…`), 2026-11-20T11:43:40Z: 1,560 identical, 1 mismatch — task index 33, `O-fund:coarse:28`: books hash
equal, pool hash equal, four envelope numbers equal, **record hash different**. The run kept booleans, not hashes. The
tool's in-process re-evaluation found no field difference; 26 GPU and 4 CPU-path reproductions, the labelled rerun and
1,560 cache pairs were identical.

## 3. Where a record-only difference can come from (code-path map, verified by reading)

| | CPU reference (`src/gpu-phase4/cpuRefWorker.ts` `reference`) | GPU (`src/gpu-backend/batch.ts` `decodeRange`) |
|---|---|---|
| books hash, pool hash, envelope | execution E1: `runWithControls2(…, { cache: false })` — D1 books fresh, Growth book from Priority 3's cache, one pool run | the device's one execution, decoded in a host worker thread, structured-cloned to the main thread, hashed there |
| record hash | `evaluateDetail`: a **second** execution of both D1 books (through `d1Cache2`), a second pool run (detail) for `risk`, a **third** pool run (non-detail) for every scalar, `virtual`, `rc`; then `recordOf` and `riskInputsOf` | `recordOf` and `riskInputsOf` on the same decoded books and pool, in the worker thread; the record cloned to the main thread and hashed there |
| what only the record covers | everything computed by E2/E3 and by the two reductions | the eight RC counters per D1 book (device, inside the checksummed struct) and the two reductions |
| position of task 33 | the second task ever of a freshly started child process (worker 8's first chunk 32–35: `CpuRefPool.run` gives chunk *i* to worker *i*, deterministically) | the 34th candidate of worker thread 0's first shard, in a freshly started thread |

So the two reductions `recordOf` / `riskInputsOf` — the same unchanged functions — run in a cold JavaScript context on
**both** sides, and on the CPU side so do two more whole executions.

## 4. What was excluded first

| Hypothesis | Finding |
|---|---|
| `canonHash` input not a pure function of the value (NaN bits) | True in general and verified on this Node: a computed NaN's bits depend on source and tier (`Math.max(0, ...[NaN])` gives `fff8…` unoptimized and `7ff8…` optimized; `Math.min(x, NaN)` flips at run-dependent iterations), and a worker-thread structured clone canonicalizes every NaN to `7ff8000000000000`. But the record of task 33 has exactly two NaNs (`ddRecoveryT`, `topEpisodeShare`), both NaN *literals*, whose bits are stable: the CPU record hash is `f17d66f4…` under seven tier configurations (`tools/gpu-phase5/diag-bits.ts`), and the independent review's replica of both flows stayed canonical over 6,407 samples. **Not the cause; a latent hazard** for any future record field that is a *computed* NaN (§9). |
| cache-key identity (`d1Cache2`, Priority 3's book caches), aliasing between the pool runs | The task's in-process history is fixed (one predecessor) and was replayed exactly by Phase 4 without failure; `runPool` never mutates a book. Excluded as a deterministic cause. |
| worker scheduling, result ordering, buffer lifetime in the host pipeline | The response is copied once into a SharedArrayBuffer before dispatch and never written again; results are keyed, not ordered by arrival. Excluded by reading and by the host soak (§5). |
| device nondeterminism, stale device memory | `initKernel` zeroes every output struct and the D1 state is zeroed; the raw device response (everything after the receipt) had the **same sha256 in all 36 fresh-server repetitions** of the original 1,561-task batch (`results/rootcause/fresh-loop-p4/cycles.jsonl`). |
| hardware transient | No machine-check, EDAC or hardware-error line in the kernel log. (Correction to Phase 4's report: the log does hold 12 `Xid 43` entries since 2026-11-18 — every one from a deliberately faulted test binary during a negative suite, none from a production binary, none within 12 h before the mismatch.) With a software cause demonstrated, hardware is not needed to explain the event; it cannot be excluded for any single event on non-ECC parts (§10). |

## 5. The capture, the dissection and the experiments

Every figure below is of this study; each file is under `research/gpu-phase5/results/rootcause/`. "Cold process" = a
freshly started Node process (a cold V8 isolate). Load matters and is stated.

**(a) First capture, in the campaign's own configuration** — `fresh-loop-p4/` (`tools/gpu-phase5/fresh-loop.ts`: each
cycle 12 fresh CPU reference workers on the original first chunks, then a fresh GPU server and host pipeline on the
original batch). Cycle 16, task 3 `R:C4`, CPU worker 0 (its fourth task): the CPU envelope's two banked-drawdown inputs
were 101,060.43759030467 and 101,108.57625063331; the GPU, the CPU's first cycle, the same worker's re-evaluation, a
fresh process and the parent all gave 10,335.726877955836 and 10,383.816891783063; books, pool and record hashes equal
(`mismatch-c16-i3.json`, with both sides' original records leaf by leaf). 36 cycles ran: 432 fresh CPU workers, 36
fresh GPU contexts, 56,196 GPU evaluations, 0 GPU differences. Another tool of mine was loading the CPU at that moment
(disclosed; it is part of the finding).

**(b) Exact arithmetic** — `tools/gpu-phase5/diag-envelope.ts --search`: 101,060.43759030467 is *exactly*
117,489.45321713819 (the realized net after lot 7 closes, 2020-05-14) minus 16,429.01562683351 (the marked net at path
point 35,271, 2020-03-12). An early point of the rebuilt portfolio path carried a later value.

**(c) Object-level dissection** — `tools/gpu-phase5/envelope-stress.ts` (cold processes running worker 0's first chunk
with the path kept): in three captures the path built by the unchanged `portfolioPath`
(`src/vg-l0-risk-metrics/metrics.ts`) had **exactly one wrong point**: the lot-0 exit point, created by
`{ t: f.t, date: f.date, m: before, liq: before, r: before, lot: null }`, held the four *numbers* (`t`, `m`, `liq`, `r`)
of the lot-1 exit point while keeping its own date string; the path was no longer sorted in time; the same ledger
rebuilt gave the right path. In other captures the wrong pass was the second (warm) one, and once the envelope did not
move (caught only by comparing the path point by point).

**(d) The historical signature on the historical candidate** — `tools/gpu-phase5/record-stress.ts` (cold processes
running worker 8's chunk through the worker's own `referenceFull`, three passes, every pass compared with a ground
truth produced by one `--no-maglev` child that agrees with itself and with Phase 4's diagnostics):

| File | Engine | Processes (evaluations) | Processes with a wrong evaluation | Wrong evaluations by part |
|---|---|---:|---:|---|
| `record-stress-truth-default.json` | default | 234 (5,616) | **1** | record 13 (**record only 11**), books 2, pool 0, envelope 0; cold pass 3, second 5, third 5 |
| `record-stress-truth-no-maglev.json` | `--no-maglev` | 231 (5,544) | **0** | — |
| `record-stress-default.json` (first version: each pass against the process's own last pass, see amendment A1) | default | 358 (8,592) | **3** | relative counts; two processes show the event below against the known-good hashes |
| `record-stress-no-maglev.json` | `--no-maglev` | 357 (8,568) | **0** | — |

In three separate cold processes (one in the first table row, two in the third) the first wrong evaluation was
`O-fund:coarse:28` in the cold pass at ordinal 1: books `d35779dd…` (= truth), pool `da74e7df…` (= truth), envelope =
Phase 4's four values, record ≠ `f17d66f4…`, with `$.virtual.D1:GDX.net` = 53,994.45 and `$.virtual.D1:GDX.dd` =
67,422.29 — flagged by the tool as aliases of `$.virtual.D1:VGT.net` / `.dd`. Later evaluations in those processes show
the same aliasing in `virtual` and, for some tasks, in the D1 books' `standalone` object (`$[0].standalone.*` =
`$[1].standalone.*`, a books-hash difference), and it persisted through the later passes.

**(e) Is Maglev the cause?** Side-by-side arms under the same concurrent load (each arm's processes interleaved with
the other's):

| Experiment | default: processes with a wrong result / processes | `--no-maglev` |
|---|---:|---:|
| `envelope-stress-default2` / `-no-maglev` (7 + 7 + 7 processes at a time, 7 min) | 2 / 145 | 0 / 144 |
| `envelope-stress-ab-default` / `-ab-no-maglev` (12 + 12, 15 min) | 3 / 443 | 0 / 438 |
| `record-stress-default` / `-no-maglev` (10 + 10 and the host soak, 20 min) | 3 / 358 | 0 / 357 |
| `record-stress-truth-default` / `-truth-no-maglev` (10 + 10, 12 min) | 1 / 234 | 0 / 231 |
| **Pooled** | **9 / 1,180** | **0 / 1,170** |

If the flag made no difference, the chance that all nine fall in the default arm is about (1,180 / 2,350)⁹ ≈ 0.002.
Other default-engine runs: 2 / 160 (`envelope-stress-default`, 20 at a time), 1 / 528 (`-traced`, with V8's tiering
trace on), and a third arm `--no-turbofan` 0 / 93 (too small to conclude anything about TurboFan). Upstream context
(not evidence of this study): Node issue reports describe Maglev faults that appear only when hot code tiers up on a
CPU-starved machine and disappear with `--no-maglev`.

**(f) What did not trigger it:** a synthetic ledger passed to `portfolioPath` back to back (`v8-alias-repro.ts`, 0 of
855 processes) and the engine on a synthetic door (`alias-hunt.ts`, 0 of 765 processes, 30,600 paths). It needs the real
flow: long hot loops before the literal and a busy compile queue.

**(g) The GPU host path** — `host-soak-default-full.json` (`tools/gpu-phase5/host-soak.ts`): 161 fresh host pipelines
(1,288 cold worker threads, Maglev enabled, under the load of the record stress) decoded one real device response of
the original batch; 251,321 results compared with the serial reference: **0 mismatches**. The host path runs the same
reductions under the same engine, so the defect is not excluded there; it was not observed.

## 6. The independent review

A second reviewer (a fresh agent of the same model family, given the code, the facts and no hypothesis of mine, read
only) mapped the record path as §3, verified that both sides' in-process histories are fixed, verified the NaN behaviour
of §4 with its own commands and found the two NaNs of this record stable, and ranked: a V8 tiering transient in the cold
CPU child first (30 %), a host hardware transient second (25 %), a V8 transient in the GPU host path third (20 %), the
device last. It recommended exactly the cold-start soak that found the event. Its other observations are in §9. Its
claims were used only where code or an experiment of this study confirms them.

## 7. The fix and its regression evidence

| Item | Change |
|---|---|
| `src/gpu-backend/runtime.ts` (new; enforcement group) | the engine configuration: `--no-maglev`; `maglevDisabled()` (the flag present and no other Maglev option), `requireEngineRuntime()`, `engineRuntime()` |
| `src/gpu-backend/official.ts` | gate check `runtime` right after the purpose: a process not started with `--no-maglev` is refused (`preflight-runtime`); the attestation records `runtime` (Node, V8, Maglev, options). V8 options are process-wide, so the host pipeline's worker threads share them |
| `src/gpu-backend/officialRunner.ts` | refuses (exit 3, `runtime-maglev`) before importing a runner |
| `src/gpu-phase5/cpuRefPool.ts`, `cpuEvalPool.ts` | the reference workers inherit the parent's setting (`--no-maglev` when the parent has it — every acceptance run; the default engine otherwise — the reproductions above) |
| `tools/gpu-phase5/*`, `research/gpu-phase5/chains/*` | every campaign tool runs under `--no-maglev` and records `runtime` in its evidence; the acceptance generator requires it |
| tests | `src/gpu-backend/tests/policy.test.ts`: the flag logic, the gate and runner wiring, the runner refusing without the flag or with Maglev re-enabled; the negative suite's live `engine` cases; the tamper suite's case T15 (the requirement removed → STALE, refused, not verified) |

- **Regression that fails on the original bug:** the stress instruments themselves — with the default engine they
  produce wrong evaluations (9 of 1,180 processes; the historical signature three times), with the fix none (0 of
  1,170). A deterministic unit test cannot exist for a defect that depends on compile timing; the campaign therefore
  repeats the fresh-context loop at its full budget on the fixed configuration (gate A3) and the stress as a gate.
- **Not changed:** no file of the canonical CPU closure, no CUDA source, no comparison or hash, no tolerance.
- **Cost:** `--no-maglev` removes one optimizing tier (Sparkplug and TurboFan remain). Its measured effect on complete
  jobs is in `PERFORMANCE_AUDIT.md`.

## 8. Attribution to the historical event — what is proven and what is inferred

- **Proven:** the mechanism; that it produces a record-hash-only mismatch with correct books, pool and envelope on
  `O-fund:coarse:28` at the second evaluation of a cold CPU reference process; the first differing fields; that the
  correct value is the GPU's; that it disappears without Maglev.
- **Inferred:** that the event of 2026-11-20T11:43:40Z was this mechanism. The historical run kept no hashes and no
  record, so its own differing field cannot be read. The inference rests on the same candidate, the same position in a
  cold process, the same signature, and the absence of any other mechanism after the code review of both sides.
- **Which side then?** The captures here are all on the CPU reference side, which also has by far the larger exposure
  (two extra executions per task). The host path runs the same two reductions in cold threads and showed nothing in
  1,288 of them. The most probable reading is a CPU-reference transient with a correct GPU result; a host-path
  occurrence cannot be excluded for that one event. The fix covers both.
- **Difference from the historical conditions:** the reproductions ran 14–24 concurrent cold processes on 16 hardware
  threads (the campaign: 12 workers started in groups of four) and the aliasing here often persisted in the process,
  whereas the historical worker produced one wrong record among its ≈ 130. Under the campaign's own configuration this
  study captured one transient in 432 cold workers (the envelope event), not a record event.

## 9. Other defects and hazards noticed (none changed here unless stated)

1. **`canonHash` hashes a NaN's raw bits**, which V8 does not hold constant across tiers for computed NaNs, and the two
   sides take different paths (a clone canonicalizes on the GPU side). No record, book or pool field is a computed NaN
   today (verified for this record; the campaigns' ≈ 436,000 candidates never met it). A future field that is one would
   produce intermittent false mismatches. Not changed: canonicalizing would alter the comparison's contract and is not
   needed for this cause; it is a decision for a future acceptance cycle.
2. **The device checksum covers only the fixed per-candidate structs** (Phase 2's design, disclosed since Phase 3):
   trades, lots, funding, periods and the daily series are not integrity-checked in transfer.
3. **`ResponseLayout` byte offsets are `Int32Array`** (`batch.ts`): a response of 2 GiB or more would wrap. The largest
   measured (batch 32,768 on D19, records only) is ≈ 1.2 GiB; the accepted batch is 8,192.
4. **The defect is not specific to the parity harness.** It corrupted the D1 books' `standalone` object too — engine
   output. Any Node process of this repository that runs the engine with Maglev enabled (legacy CPU runners, Strategy
   Lab's server) is exposed, at a rate this study measured only under load. The bound from real work: 27.4 M archived
   GPU records compared with CPU archives in Phase 4 without one difference, and three campaigns of ≈ 145,000 candidates
   with one event. Extending `--no-maglev` to those entry points is recommended and is outside this assignment (no
   Strategy Lab or legacy-runner file was changed).

## 10. Device and host diagnostics (bounded)

Results and limits are in `GPU_ACCEPTANCE_REPORT.md` §"Diagnostics": compute-sanitizer memcheck, racecheck, initcheck
and synccheck on the final binary; the VRAM and host-memory pattern tests; the kernel log; the transfer and
serialization evidence (the response digest identical across fresh servers; the host soak). On a non-ECC GeForce RTX 5090
and non-ECC host RAM no test can prove the absence of a one-off bit error; none is needed to explain this event.

## 11. Confirmation on the final candidate (the acceptance campaign, 2026-11-21)

Everything below ran on the final tree (commit `bc428d8b`, evaluation digest `3a6eacde…`) with the final binary gb5
(`f444c521…`; device code byte-identical to the accepted gb3), every process under `--no-maglev`, through the parallel
host path. Evidence paths are relative to `research/gpu-phase5/`.

| Check | Result | Evidence |
|---|---|---|
| The original failing run, Phase 4's `D24-fund` with Phase 4's own subject seeds and arguments, twice | **1,561 of 1,561 identical, twice**; `O-fund:coarse:28` identical | `results/parity/original/D24-fund-p4seeds-r1.json`, `-r2.json` |
| The fresh-context loop at its full budget (amendment A1): each cycle 12 fresh CPU reference workers on the original first chunks (task 33 the second task of worker 8) and a fresh GPU server and 8-worker pipeline on the original 1,561-task batch | 170 cycles, **2,040 fresh CPU workers, 170 fresh GPU contexts, 265,370 GPU evaluations, 8,160 parity comparisons: 0 mismatches**; every CPU and GPU result equal to the first cycle's; the device response digest `1047014f…` unchanged in all 170 cycles; candidate 33's books, pool, record and envelope equal Phase 4's diagnostics on both sides | `results/rootcause/fresh-loop-final/summary.json` |
| The host path cold, under CPU load (12 burner processes): fresh pipelines decoding the original batch's device response | 150 pipelines, 1,200 cold worker threads, 234,150 results: 0 mismatches | `results/rootcause/host-soak-final.json` |
| The full parity campaign with this study's seeds | 54 runs, **144,795 of 144,795 candidates identical**, 64,050 risk envelopes, 176 determinism runs | `results/parity/final/SUMMARY.json` |
| The reliability run (two jobs at once, 32 minutes) | 3,276,800 GPU evaluations, 4,800 CPU parity samples: 0 mismatches | `results/sustained/p0`, `p1` |

No mismatch of any kind was captured on the fixed configuration. The unfixed configuration's defect evidence (§5) and
this table together are the regression pair of §4.7 item 3: the defect present with the default engine, absent with the
fix, in the original run configuration.

