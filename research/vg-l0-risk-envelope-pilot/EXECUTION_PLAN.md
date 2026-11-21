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
npm run vg-l0rep -- launch --unit vgl0rep-C24-search --wait -- search --cutoff C24     # may run concurrently with C21 (Mode A)
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

MEASURED_THROUGHPUT_SECTION

### 4.3 Resources

RTX 5090 (≈ 6–8 GB VRAM per job at batch 8,192 incl. the dataset); host RAM per job ≈ 5–8 GB (8 host workers);
both jobs inside one slice (44G/48G caps); CPU diagnostics ≈ 12 workers for minutes. Disk: job archives ≈ 0.6–0.9 GB per
search job with envelopes (≈ 150,000 rows × ≈ 4.7 kB/row, Assignment 3's measured row size: 4.6–9.7 GB for 1.0–2.0 M rows).
