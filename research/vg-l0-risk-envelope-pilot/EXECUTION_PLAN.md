# Execution plan — risk-envelope pilot (deliverable G) — PROPOSED COMMANDS, **DO NOT EXECUTE**

None of these commands can run today: the pilot code (`src/vg-l0-risk-envelope-pilot/`, `IMPLEMENTATION_PLAN.md`), its
npm scripts and its adoption manifest do not exist, by design. They are written in full so that the user can review the
exact shape of the run. Execution needs (1) the user's authorization of the protocol and the decision register, (2) the
implementation and its engineering gates, (3) a committed tree whose acceptance record is ACCEPTED (GPU Phase 7).

## 1. Prerequisites (each a recorded step)

```bash
cd /home/chad/projects/margin-trading
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 <the Phase 7 record sha256>   # VERIFIED
npm run research-preflight -- --study research/vg-l0-risk-envelope-pilot                                       # PASS, gpu-required
npm run vg-l0rep -- verify            # engineering gates E2–E4: CTRL = Assignment 3's sealed lanes, wiring tests, mini CPU = GPU
GPU_POLICY_PURPOSE=official-optimization node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  tools/gpu-backend/official-preflight.ts --study research/vg-l0-risk-envelope-pilot --door D21                # E6 (and --door D24)
```

## 2. Job identities, doors and paths

| Job | Door | Content | Lanes / members | Purpose |
|---|---|---|---|---|
| `C21-search` | D21 | CTRL + EXP lanes: cells GA0.VA0, GB0.VD1 [D-1] × R1, R2 × 2 arms | 8 lanes | official-optimization |
| `C24-search` | D24 | the same at C24 | 8 lanes | official-optimization |
| `C21-qualify` / `C24-qualify` | D21 / D24 | Q1–Q6 per arm for ≤ 12 shortlisted members per arm + New L0 + N/original | ≤ 28 members each | official-optimization |
| `C21-slice` | D23 | the C21 primaries (2 arms × 2 selectors) and their selection neighbourhoods on 2022-01-03 … 2023-12-29 (retrospective) | ≤ 4 primaries | official-optimization (validation of an optimization) |
| `C24-validation` | FULL | the C24 primaries once, after `FROZEN_SELECTION.json` is sealed and committed (retrospective, examined history) | ≤ 4 primaries | official-optimization |
| `diagnostics` | D21, D24, D23, FULL (after the freeze) | D1–D3, DD^L, the $250k/$500k scaling replays of the frozen primaries | — | `diagnostic` (CPU, non-official, nonbinding) |

Records `research/vg-l0-risk-envelope-pilot/results/jobs/<job>/` (identity, events, receipts, telemetry, results);
state `research/vg-l0-risk-envelope-pilot/cache/jobs/<job>/` (archive, checkpoint, lock, dataset; git-ignored);
attestations `results/gpu-attestations/<job>-<time>.json`; sealed stage records under `results/` with `seals.jsonl`.

## 3. Proposed official commands (in order; each stage sealed and committed before the next)

```bash
# Unit containment: transient units in vgl0rep.slice (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0)
npm run vg-l0rep -- launch --unit vgl0rep-C21-search --wait -- search --cutoff C21
npm run vg-l0rep -- launch --unit vgl0rep-C24-search --wait -- search --cutoff C24     # may run concurrently with C21 (Mode A; measured gain only 5 %)
npm run vg-l0rep -- launch --unit vgl0rep-C21-qualify --wait -- qualify --cutoff C21
npm run vg-l0rep -- launch --unit vgl0rep-C24-qualify --wait -- qualify --cutoff C24
npm run vg-l0rep -- select --cutoff C21 && git commit …                                # sealed C21 selection BEFORE its slice opens
npm run vg-l0rep -- launch --unit vgl0rep-C21-slice --wait -- slice --cutoff C21
npm run vg-l0rep -- select --cutoff C24 && npm run vg-l0rep -- freeze-selection && git commit …
npm run vg-l0rep -- launch --unit vgl0rep-C24-validation --wait -- validate            # FULL, once
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0rep-diag -- all                             # nonbinding diagnostics, CPU
npm run vg-l0rep -- report
# resume an interrupted stage: the same command + --resume (identical job definition; archives read back)
```

## 4. Budget allocation and expected resource use

### 4.1 Budget (protocol §7; [D-1], [D-2])

| Block | Lanes | Proposals configured / max | Evaluations expected | Worst case |
|---|---:|---:|---:|---:|
| C21 CTRL | 4 | 4,096 / 8,192 | 71,314 (Assignment 3's sealed lanes of these cells) | 164,000 |
| C21 EXP | 4 | 4,096 / 8,192 | ≈ 50,000–110,000 | 164,000 |
| C24 CTRL | 4 | 4,096 / 8,192 | 62,488 | 164,000 |
| C24 EXP | 4 | 4,096 / 8,192 | ≈ 45,000–95,000 | 164,000 |
| Qualification (both cutoffs, both arms) | — | — | ≤ 39,200 | 39,200 |
| Slices / validation (primaries + selection neighbourhoods) | — | — | ≈ 8 × 257 ≈ 2,100 | 2,100 |
| **Total** | 16 | 16,384 / 32,768 | **≈ 0.27–0.38 M** | 0.70 M (guard [D-2] stops before qualification at > 450k searched) |

### 4.2 Compute time (measured on the accepted GPU path in GPU Phase 7)

Measured, non-official (purpose `benchmark`), on the accepted binary gb7 after the record, GPU otherwise idle; every
evaluation with the risk envelope requested; batch 8,192, 8 host workers (records: `research/gpu-phase7/results/bench/
benchmark.json`, the jobs' `profile.json`; the campaign's `a3-plain`/`a3-risk` and mini jobs).

| Job (shape) | Lanes | Fresh evaluations | Wall | Rate | Median batch |
|---|---:|---:|---:|---:|---:|
| Assignment 3 C19 broad1, plain (campaign A3) | 64 | 1,242,714 | 583.9 s | 2,128 /s | 7,980 |
| the same with the envelope requested (campaign A3) | 64 | 1,242,714 | 681.6 s | 1,823 /s (+16.7 % wall) | 7,980 |
| **C21 broad1 lanes 0/8, risk** (pilot shape) | 8 | 138,316 | 377.2 s | 367 /s | 384 |
| **C24 broad1 lanes 0/8, risk** (pilot shape) | 8 | 104,431 | 459.7 s | 227 /s | 368 |
| both at once (Mode A) | 8 + 8 | 242,747 | 796.4 s (pair) | 305 /s combined | 384 / 368 |

- An 8-lane job is **latency-bound**: its lanes submit small batches (median ≈ 380 of 8,192), so the rate is 5–8× below
  the 64-lane replay. Running the two cutoff jobs concurrently saved only 5 % (796 s vs 837 s sequential).
- Each slice's 8 lanes were identical to the same lanes of the sealed Assignment 3 job (envelopes stripped), alone and
  concurrently; alone = concurrent (`results/bench/compare-*`).
- **Pilot estimate** (rates above; C24's longer door is slower):

| Block | Evaluations expected (worst) | Wall expected (worst) |
|---|---:|---:|
| C21 search job (CTRL + EXP) | 121,000–181,000 (328,000) | 5.5–8.2 min (15 min) |
| C24 search job (CTRL + EXP) | 107,000–157,000 (328,000) | 7.9–11.6 min (24 min) |
| qualification (both cutoffs), slices and validation | ≤ 41,300 | ≤ 3 min at the 8-lane rate (larger batches are faster) |
| **Total GPU wall, sequential** | ≈ 0.27–0.38 M (0.70 M) | **≈ 16–23 min (≈ 42 min)** |

  Plus preflights (≈ 10 s each), dataset export and the CPU diagnostics (minutes). The budget, not the compute, is the
  constraint: the worst case is under an hour. Timings select nothing (standard §6.3).

### 4.3 Resources

RTX 5090 (measured in the benchmark: ≈ 4.8 GB device memory used with one job, 9.2 GB with two, at batch 8,192 incl. the
dataset); host memory per job measured 3.3–4.2 GB RSS, unit peak 3.9–4.7 GB (8 host workers);
both jobs inside one slice (44G/48G caps); CPU diagnostics ≈ 12 workers for minutes. Disk: job archives with envelopes measured
4.5–4.6 kB/row (benchmark: 627.6 MB for 138,316 rows, 478.3 MB for 104,431) → ≈ 0.5–0.8 GB per search job expected,
≈ 1.5 GB worst case; filesystem free 572 GB (`df -h /home`, 2026-11-22, after the benchmark).
