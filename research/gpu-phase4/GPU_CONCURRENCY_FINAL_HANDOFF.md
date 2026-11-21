# GPU Phase 4 — concurrency, batching, final acceptance: handoff (start here)

For the original Margin Trading conversation. Self-contained; details in the four companion reports (§8).
**Risk-envelope pilot NOT STARTED.**

## 1. Verdict

- **Two simultaneous optimizations are the most productive use of the RTX 5090; three or four are not worth it.**
  Separate GPU processes time-slice the device (their kernels never run at the same time), so a second job only fills
  the idle gaps one optimizer job leaves. Measured on the Assignment 3 joint search (D1·VGT + D1·GDX + Growth·VGT, Growth
  searched): aggregate **1.25× at two jobs** (3,345 vs 2,683 ev/s), 1.30× at three, 1.29× at four; each job runs 1.6×
  slower at two. On the Growth-fixed Assignment 2 job (main-thread-bound): 1.55× at two, 1.72× at three. Small-batch and
  device-saturated work: ≈ 1.0×.
- **One study does not get faster by splitting it into parallel jobs** (+6–7 % at two parts, −9 % at three, −25 % at four):
  each part's batches are smaller and the kernels are latency-bound.
- **The accepted default stays best for a single job:** batch 8,192, 8 host workers — 583.1 / 584.0 s for the complete
  Assignment 3 C19 broad1 job (Phase 3: 582–584 s; ≈ 10× the original CPU job). Batch 4,096 is 15.5 % slower, 16,384
  4.5 % slower.
- **The device's real compute is mostly idle** (GPM SM activity 34 % at one job, ≈ 46 % at most; SM occupancy ≈ 1 %).
  Merging two jobs' batches into one launch would deliver **1.22×** what two time-sliced processes do (measured on the
  production pool) — a shared GPU queue or CUDA MPS is the next lever; neither is built (needs authorization).
- **Every benchmark result is bit-identical** to the canonical CPU engine or the accepted sealed records: 86 jobs,
  27,420,154 archived evaluations and 832 lane results compared, 0 mismatches; failures in one job (GPU server killed,
  host worker died, VRAM refusal, abrupt kill) never affected its neighbour, and every failure failed closed.
- **The root TypeScript error is fixed** (`hostPipeline.ts`: Node's own `Transferable` type; type-only, byte-identical
  emitted JavaScript; root `tsc` 0 errors), **but the acceptance was NOT renewed**: the one campaign on the final code
  passed 24 of 25 gates, and the parity gate found **one unattributed, non-reproducible mismatch** in 146,356 candidates
  (one candidate's detailed-record hash; 25 reproductions on both sides identical; no hardware error logged). Zero
  tolerance is not loosened here: the renewal is the user's decision (§5). **The Phase 3 acceptance stays in force on
  `main`; nothing was merged.** The final code is runtime-identical to the accepted engine, so the event concerns the
  accepted engine (or its CPU reference, or the machine) equally.

## 2. The two recommendations

| | **Mode S — fastest single optimization** | **Mode A — most total throughput** |
|---|---|---|
| Jobs on the GPU | 1 | **2** independent jobs at once |
| Batch / host workers | 8,192 / 8 | 8,192 / 8 per job |
| GPU memory | 5,138 MiB per A3-shaped job's server (6,524 MiB FULL detail + risk); plan ≤ 8 GiB | 11,053 MiB in use for two A3 jobs (≥ 21,055 MiB free) |
| Throughput (measured) | A3 job 583–584 s (2,130 ev/s), steady 2,683 ev/s; A2 steady 3,101 ev/s | A3 3,345 ev/s (1.25×); A2 4,821 ev/s (1.55×) |
| Each job's completion | baseline | measured with two complete A3 jobs: 887 s each instead of 584 s (1.52× longer); both together in 888 s instead of 1,167 s (1.31×) |
| When | one study's turnaround matters; small-batch or device-saturated jobs | several independent studies / jobs queued |

Details, admission rules, fail-closed conditions and the shared-queue design: `GPU_OPERATING_RECOMMENDATIONS.md`.

## 3. What was done

| Stage | Result |
|---|---|
| 0 Verify Phase 3 | `main` = `research/gpu-phase2` = `research/gpu-phase3` = `3a52cc63` on origin; acceptance record sha256 `b08738be…` = the out-of-band value (copy kept outside Git); binary `06a4a04a…`; independent verifier VERIFIED; root `tsc` error still present |
| 1 Protocol | benchmark plan frozen 06:04:19Z before any measurement (`PROTOCOL.md`, standard 3.0.0, scope diagnostic); environment recorded (no other GPU client, no LLM service) |
| 2 Concurrency (B1, B2, B2r, B4, B5, B6) | k = 1–4, 3 worker allocations per k, repeats; fixed-total-work splits; the Growth-fixed job; the small-batch mini — on the ACCEPTED Phase 3 engine (re-verified afterwards) |
| 3 Batching (B3, B7) | 4,096 / 8,192 / 16,384 single and at k = 2; the kernel curve 2,048–32,768 and the shared-queue comparison |
| 4 Stress, isolation (B8, B9) | FULL detail + risk at k = 1, 2; seven isolation/failure/restart tests — all pass |
| 5 Corrective work + acceptance | CC1 the type fix, CC2 the new binary path (`research/gpu-phase4/build/gb4`, `b01f4362…`, kernels = gb3; gb3 untouched), CC3 the campaign harness registered; one full campaign: every gate passes (sealed replays identical, sanitizer 0, negative 45/45, tamper 14/14, a 32.6-min reliability run in Mode A with 4,704 CPU samples 0 mismatches, `npm test` = baseline, root `tsc` 0, Strategy Lab all green, no regression) **except parity: 1 mismatch in 146,356** → NOT_ACCEPTED (1 blocker) |
| 6 Integration | **no merge** (the change is not accepted; merging would make `main`'s acceptance stale); `research/gpu-phase4` pushed with everything; `research/gpu-phase2` checked out again (unchanged = `main`, contains the accepted Phase 3 engine) |

Amendments (append-only, none changed a rule or result): A1 the verifier streams its maps (a 2.2 M-row map exceeded V8's
string limit); A2 the FULL door's guard file made read-only again (Phase 3's branch switches had dropped the read-only bit
of every sealed file; content verified); A3 one declared confirmation run of Mode A with complete jobs.

## 4. Acceptance and merge

| Item | State |
|---|---|
| Acceptance in force | Phase 3's record on `main`, sha256 **`b08738bea6f40aa2fb04f92e8601d035ec3dd11a33dcaf924d73d33777805214`** (unchanged; verified VERIFIED with this out-of-band value), binary `06a4a04a…` |
| New acceptance | **not issued** — `tools/gpu-phase4/accept.ts --dry-run`: NOT_ACCEPTED, 1 blocker (parity), every other gate PASS (`results/acceptance-dry-run.txt`) |
| Final candidate (awaiting the decision) | `research/gpu-phase4`, binary `research/gpu-phase4/build/gb4` sha256 `b01f4362383526c78d0621d1573dc9937bb1a85711e23cfd375670d19fa7441e`, evaluation digest `3594f002…`; its tree holds no acceptance record (official runs blocked there by design) |
| Merge | none (`main` = `research/gpu-phase2` = `research/gpu-phase3` = `3a52cc63` on origin, unchanged) |
| Restored branch | `research/gpu-phase2`, clean |

Details, digests, the campaign table and the merge procedure for later: `GPU_ACCEPTANCE_AND_MERGE.md`.

## 5. Outstanding decisions for the user

0. **The acceptance renewal (the main open decision).** One unattributed, non-reproducible parity mismatch blocks it
   under zero tolerance. Options: (a) approve a documented departure for this one event (standard §7.3) — then the
   generator issues the record on the final tree and the change is merged by the documented procedure; (b) ask for more
   evidence first (a second parity campaign with the new automatic attribution, ≈ 2 h; a GPU memory test; a host memory
   test, which needs a reboot); (c) keep the Phase 3 acceptance and defer the TypeScript fix. Independently: whether to
   add in-run CPU parity sampling to official runs, and (a future CUDA change) a device checksum over the
   variable-length output sections.
1. **Whether to run two optimizations at once in practice** (Mode A), or keep one at a time (Mode S). Both are measured;
   the trade-off is 1.25–1.31× total throughput (A3-shaped; 1.55× for A2-shaped) against each job taking ≈ 1.5–1.6× longer.
2. **Whether to investigate concurrent-kernel execution** (a shared GPU queue merging jobs' batches, ≈ 1.22× measured on
   the device; or CUDA MPS) — each needs separate authorization, a design, and a full acceptance campaign.
3. **Sealed files' read-only bits:** GPU Phase 3's branch switches (2026-11-19T23:04Z) recreated every file under
   `research/` with mode 664 (Git does not track the read-only bit; contents unchanged). This study restored 0444 only on
   Priority 3's ten pinned records (`research/vg-d1-growth-joint/`; contents verified against their pins; amendments A2,
   A5), which the FULL door's guard and 23 repository tests require. Restoring the seals' read-only mode repository-wide (e.g. from each study's `seals.jsonl`) is a housekeeping decision — and any future full checkout
   switch will clear them again.
4. **Optional hardening for a future acceptance cycle:** an atomic dataset export (temporary file + rename) would remove
   the fail-closed start-up collision of jobs that share a cache directory (today: give each job its own cache
   directory).
5. **The risk-envelope pilot:** unchanged and NOT STARTED; `research/gpu-phase3/GPU_PILOT_READINESS.md` still describes the
   one host-path delivery change it needs (and a fresh acceptance) — a decision for the original conversation.

## 6. Limits (stated plainly)

- Steady-state concurrency figures come from 300,000-evaluation prefixes of the Assignment 3 job (its dominant phase);
  complete-job concurrency was measured for the fixed-total-work splits and the Mode A pair (1.31×, one run).
- A2's three-job gain and the batch alternatives at k = 2 are single runs; k = 2 and k = 4 repeats agree within 0.3 %,
  k = 3 within 3.3 %.
- GPM counters were read as the driver reports them without enabling the GPM stream; SM occupancy and DRAM read
  ≈ 1 % and 0 % (consistent with latency-bound kernels, but not independently cross-checked — no Nsight tools installed).
- One machine, one driver: another GPU, driver or display configuration needs its own measurement.

## 7. Scope boundary

No trading rule, candidate, risk gate, objective, genome, optimizer algorithm, budget, seed or research finding changed;
no official optimization ran; nothing was deployed; no broker was contacted. **Risk-envelope pilot NOT STARTED** — no
pilot study, protocol, branch, preflight, delivery change or optimizer command was created or run.

## 8. The reports

| File | Content |
|---|---|
| `GPU_CONCURRENCY_BENCHMARKS.md` | every group: 1/2/3/4 jobs, worker allocations, batching, splits, A2, mini, kernel curve, stress; utilization, VRAM, power, temperature, CPU, memory; methods |
| `GPU_CONCURRENCY_CORRECTNESS.md` | identity of every group, ordering and isolation, the seven failure/restart tests, the acceptance campaign |
| `GPU_ACCEPTANCE_AND_MERGE.md` | old/new acceptance, digests, integrity checks, tests, Git revisions, the merge |
| `GPU_OPERATING_RECOMMENDATIONS.md` | Mode S, Mode A, scheduling rules, headroom, fail-closed conditions, shared queue / MPS |
| `results/bench/SUMMARY.json`, `groups.csv`, `jobs.csv`, `results/decisions/*.json` | machine-readable |
| `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`, `RUN_COMMANDS.md`, `MANIFEST.json`, `CHECKSUMS.sha256` | method, changes, commands, inventory |
