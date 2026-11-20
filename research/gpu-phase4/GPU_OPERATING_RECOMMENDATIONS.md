# Operating the RTX 5090 for independent optimization jobs — recommendations (GPU Phase 4)

How to schedule future research jobs on Apollo's GPU safely and efficiently. **Nothing here launches a job**; every
official run still needs the user's authorization of its study, its own protocol and preflight, and the official gate
(standard 3.0.0 §9). Figures are measured in this study (`GPU_CONCURRENCY_BENCHMARKS.md`); projections are labelled.

## 1. The finding in one paragraph

Separate GPU processes on this card **time-slice** the device: their kernels never run at the same time (two small-batch
mini jobs gain 3 %; a job's per-batch kernel time doubles when a second job runs). A second job therefore only fills the
idle gaps one optimizer job leaves while its lanes compute their next proposals. For an Assignment 3-shaped job that is
worth **1.25×** aggregate throughput at two jobs in the dominant phase (**1.31×** measured with two complete jobs), **1.30×** at three, nothing more at four; for the main-thread-bound
Assignment 2-shaped job **1.55×** at two and **1.72×** at three; for small-batch or device-saturated work ≈ 1.0×. Every
added job slows each job down (A3: 1.6× at two, 2.3× at three). Splitting one study into parallel jobs does **not**
make it faster beyond 7 % (k = 2) and makes it slower at k ≥ 3.

## 2. Mode S — maximum single-optimization performance (the accepted default, confirmed)

| Setting | Value |
|---|---|
| Jobs on the GPU | **one** |
| Batch | **8,192** (4,096: 15.5 % slower; 16,384: 4.5 % slower on the complete Assignment 3 job) |
| Host workers | **8** (Phase 3: 4 → 611.7 s, 8 → 583.9 s, 12 → 582.1 s) |
| Linger | 30 ms (Phase 3's setting; unchanged) |
| GPU memory | the job's server 5,138 MiB at 8,192 on D19 (6,524 MiB on FULL with detail + risk); plan **≤ 8 GiB per job**; the gate refuses a planned batch without 1 GiB headroom |
| Host memory | 5,008 MiB per job (job + server VmHWM); its cgroup also counts the archive's page cache (a complete Assignment 3 job's unit reached 10,392 MiB): give a complete job's unit a MemoryHigh ≥ 12 G, within the 44 G/48 G slice |
| Throughput / latency (measured) | Assignment 3 C19 broad1 (1,242,714 evaluations): **583.1 / 584.0 s** (2,130 ev/s; Phase 3 583.8 / 581.7 s; ≈ 10× the original 12-worker CPU job); Assignment 2 C19 base (2.2 M): 725 s (Phase 3); steady rate on the dominant phase 2,683 ev/s (A3) / 3,101 ev/s (A2) |
| Use when | one study's turnaround matters; one job is all there is; the job is small-batch or device-saturated (concurrency would not help anyway) |

## 3. Mode A — maximum aggregate throughput (rule R3 on the measured data)

| Setting | Value |
|---|---|
| Jobs on the GPU | **two** independent jobs at once (k* = 2: the smallest k within 5 % of the best, 1.24–1.25× over one job in every run) |
| Batch | **8,192** each (16,384: +2.3 %, below the 3 % rule; 4,096: −35 %) |
| Host workers | **8** per job (4 per job: −2.3 %); CPU stays < 20 % of 16 threads |
| GPU memory | 11,053 MiB in use for two Assignment 3 jobs incl. the desktop (≥ 21,055 MiB free); two FULL detail + risk pools 13,825 MiB (18,283 MiB free); per-server refusal budget ⌊28,000 / k⌋ MiB is a safe cap (14,000 MiB at k = 2) |
| Aggregate throughput (measured) | Assignment 3: **3,345 ev/s vs 2,683 (1.25×)** steady state, **1.31×** for two complete jobs; Assignment 2: **4,821 vs 3,101 (1.55×)**; small-batch mini: 1.03×; device-saturated FULL stress: 1.04× |
| Effect on each job (measured with complete jobs) | two complete Assignment 3 jobs at once: **887.4 / 887.6 s each** instead of 583.6 s alone (**1.52× longer**); both together in **887.6 s instead of 1,167 s** one after the other (**1.31×**, 0.76 of the time); in the dominant phase each job runs 1.6× slower (1,670 vs 2,683 ev/s) |
| Capacity limits | at most two Assignment 3-shaped jobs; a third adds ≈ 4 % (not recommended); a fourth adds nothing (3,471 ev/s) with 21,340 MiB of VRAM in use. For **main-thread-bound** jobs (Assignment 2-shaped: GPU busy < 50 % alone) a third job measured +11 % (5,339 ev/s, one run) — an option for the user, not the default |
| Use when | several independent studies (or independent jobs/folds of one study, each with its own job name) queue up and total throughput matters more than any one job's turnaround |

**When not to use Mode A:** to speed up a single study by splitting it (§1); for small-batch jobs (latency-bound: no
gain); while another GPU client (e.g. a vLLM server, ≈ 28 GB) holds the memory.

## 4. Scheduling rules for concurrent official jobs (when the user authorizes them)

1. **Containment.** Every job a transient systemd unit inside **one** parent slice with the aggregate cap (MemoryHigh 44G,
   MemoryMax 48G, MemorySwapMax 0; standard §6.2), each with its **own** MemoryMax (e.g. 11–14 G) so that a runaway job
   meets its own limit, never a neighbour's (B9: a failing job stopped alone every time).
2. **Namespaces.** Each job its own study/job archive (`cacheRoot/jobs/<job>`), its own run id (attestation, receipts,
   telemetry) and **its own dataset cache directory**: the engine's dataset export writes `<cacheDir>/<door>.gb2ds` in
   place, and concurrent exports into one directory make some loads fail closed (isolation test I7: 34 of 100 loads
   refused, 0 wrong) — a start-up refusal, never a wrong dataset. The archive store has no inter-process lock: two
   processes must never use the same job name.
3. **Admission before each additional job** (measured now, not assumed): no foreign GPU compute process; free VRAM ≥ the
   job's need (≈ 6 GiB at 8,192 on D19; ≈ 7 GiB FULL detail + risk; ≈ 10–11 GiB at 16,384) + 3 GiB reserve for the
   compositor and driver; MemAvailable ≥ the job's need + 8 GiB; GPU ≤ ≈ 50 °C at start. If it does not fit, run the
   job later — never force it (`tools/gpu-phase4/admit.ts` is a ready check).
4. **Each job passes its own official gate** (acceptance, binary, device, reachable-domain capabilities, smoke, memory
   for its planned batch + 1 GiB, the parity mini-set through its host path) and records its own attestation; a resumed
   job passes the gate again.
5. **Start-up:** staggering starts by ≈ 30 s avoids the host-worker start-up burst of two pipelines at once (not needed
   for correctness: the barrier-synchronized starts of this study never failed).
6. **Never:** a CPU fallback (none exists); a shared cache directory or job name; more than two Assignment 3-shaped jobs
   by default; an MPS daemon or any driver/display/clock change without the user's separate authorization and new
   acceptance evidence.

## 5. Fail-closed conditions (verified under concurrency in this study)

| Situation | What happens (tested) | Neighbour job |
|---|---|---|
| a job's GPU server killed mid-batch (I3) | the job stops: "GPU evaluator exited (SIGKILL)", none of the batch's 8,192 results released, CPU-scored 0 | finished, identical to its reference |
| a host-pipeline worker dies (I4) | the job stops: "host worker 0 exited", nothing released | identical |
| VRAM budget exceeded (I5) | the server refuses the batch: "batch needs 4,300 MiB > VRAM budget 256 MiB"; nothing evaluated | identical |
| a job killed abruptly (SIGKILL of its unit) (I1) | the archive keeps every committed result (4,464 of the evaluations at the kill); the same command resumes (a stale lock is taken over) and completes **identical** | identical |
| a graceful stop (I2) | exit 75 after the in-flight batch; the resume completes identical while the neighbour runs | identical |
| a second process on a live namespace, a reused namespace, an official purpose on a benchmark tool (I6) | refused | — |
| concurrent dataset exports into one directory (I7) | 34/100 loads refused (short file, size mismatch), 0 accepted wrongly | — |
| anything the official gate checks (stale binary/sources, other device, missing acceptance, capability, smoke, parity mini-set) | refused before any evaluation (Phase 3's 45 negative cases, rerun in this study's acceptance campaign) | — |

## 5a. One open integrity finding (affects how much to trust any single run)

The final acceptance campaign found **one unattributed, non-reproducible parity mismatch** in 146,356 candidates (one
candidate's detailed-record hash; `GPU_CONCURRENCY_CORRECTNESS.md` §5). It concerns the accepted engine's runtime code
as much as the final tree. Until the user decides how to treat it, the prudent operating practice for official runs is
unchanged (one attested session per job, the gate's parity mini-set at every start) plus, optionally, **in-run CPU parity
sampling** (e.g. one candidate per 1,000 re-evaluated by the canonical CPU engine, a mismatch stopping the job) — a design
choice for the user, not implemented here.

## 6. Could a shared GPU queue (or concurrent kernels) do better? — quantified, not built

The kernels are latency-bound: an 8,192-candidate batch occupies ≈ 1 % of the SMs' warp capacity (GPM SM occupancy) and
the SMs are active ≈ 34–46 % of the time even when a kernel is "running". Time-slicing cannot use that idle silicon;
merging work into one launch can: on the production pool (D19, joint) one process at 16,384 delivers **4,580 ev/s**
where two time-sliced processes at 8,192 deliver **3,766** — **1.22×** for the same candidates (device-saturated); 32,768
gives 4,980. For two optimizer jobs (not device-saturated) the *projected* gain over Mode A is ≈ 1.1–1.3×.

Minimal architectures (none implemented; each needs the user's separate authorization and a full acceptance):

1. **One GPU broker per device.** One server process; each job's pool sends its batches to a local broker that merges
   the batches pending from all jobs into one launch (up to 16,384–32,768), splits the results back by job and writes a
   per-job receipt. Batch composition already never changes a result (determinism across batch sizes and input order
   is part of the parity campaign). New work: per-job conservation counters and receipts inside a shared launch, a
   per-job failure boundary (a per-candidate error must not fail the other job's half), fairness, a redesign of the
   attested-session model (today one server per official session), the enforcement pins and a full parity/negative/
   tamper campaign.
2. **CUDA MPS** (the driver's multi-process service; installed, never started here): kernels of separate processes share
   the SMs concurrently, with no code change. It is an environment change: a per-user daemon, a different fault model
   (a fatal fault in one client can affect the others), and the accepted evidence was produced without it — so it
   needs its own parity campaign under MPS, failure-isolation tests and the user's authorization. Its gain was not
   measured here.
3. **No new infrastructure:** give one study more concurrent lanes (fuller batches) — a search-design choice, which
   Phase 3 already identified as the remaining lever.

## 7. Quick reference

| Goal | Run | Expected (measured) |
|---|---|---|
| one study, fastest | Mode S: 1 job, batch 8,192, 8 workers | A3-shaped 584 s; A2-shaped 725 s |
| two or more independent studies, most total work per hour | Mode A: 2 jobs at once, batch 8,192, 8 workers each | A3-shaped 1.25× (steady) / 1.31× (complete jobs), A2-shaped 1.55× aggregate; each A3 job 1.52× longer (887 s) |
| main-thread-bound jobs only, maximum total | 3 jobs at once (3 workers each) | A2-shaped 1.72× (one run) |
| small-batch jobs | one at a time | concurrency ≈ 1.0× |
