# GPU engine — final handoff (start here)

For the original Margin Trading conversation and its reviewer. Self-contained; details in the five companion reports
listed in §9. **Risk-envelope pilot NOT STARTED.**

## 1. Outcome

FILL (verdict, acceptance record, merge status).

## 2. What was done

| Stage | What | Result |
|---|---|---|
| 0 | State recorded before any change (branch `research/gpu-phase2` at `a1836407`, clean; `main` `10ca3422`; Phase 2 acceptance verified live) | `RESEARCH_RECOVERY.md` §Stage 0 |
| 1 | Profiled the accepted Phase 2 path on real jobs: Assignment 3 C19 broad1 (×2), Assignment 2 C19 base, the small-batch control (×3) — all identical to their sealed records / each other | the Phase 2 handoff's figures reproduced (5.22× / 5.24×; server 347 s, encode 161 s, decode 292 s) |
| 2 | **Priority A**: one batch codec for both host paths; worker threads encode and decode shards of every batch; the receipt verified on the main thread; results released in dispatch order | 1.94× faster than Phase 2 on the Assignment 3 job (583.8 / 581.7 s final), 2.26× on the Assignment 2 job; bit-identical |
| 3 | Priority B measured and rejected; Priority C deferred | archive JSON 1.5 % of the wall; kernels latency-bound, unchanged |
| 4 | Enforcement hardened: manifest v2 (host path + pinned enforcement group), acceptance schema 2 (source revision), independent re-hash and committed-source checks in the gate, official npm-runner wrapper, independent verifier, file-classification rule, tamper suite | `GPU_ENFORCEMENT_INTEGRITY.md` |
| 5 | One final acceptance campaign on the final binary `06a4a04a…` (2026-11-19 17:22–21:05Z; tests 21:05–21:16Z) | all gates pass: parity 144,795 / 0 mismatches, sealed replays identical, sanitizer clean, 45/45 negative, 14/14 tamper, 45-min sustained run, npm test = known failures only, Strategy Lab 314 + 81 |
| 6 | Performance verdict | Growth-searched job ≈ 10× the 12-worker CPU job (10.1× the sealed run; 9.94–9.98× this machine's re-measurement) (the brief's "≈ 10–15×, excellent if exact" band; parity exact); Growth-fixed 6.45×; small batches 1.89×. The pipeline is the default; performance work stopped (no chase of 20–30×) |
| 7 | Merge into `main`, branch restoration | FILL |

## 3. Measured speed (wall time of complete optimizer jobs)

| Job | CPU (original sealed run) | Phase 2 path (before) | Final (after) | after vs Phase 2 | after vs CPU |
|---|---:|---:|---:|---:|---:|
| Assignment 3 C19 broad1 search — Growth searched, 64 lanes, 1.24 M evaluations | 5,900.8 s (12 workers); re-measured on this machine: 5,803.6 s | 1,131.1 / 1,126.8 s | 583.8 / 581.7 s | **1.94×** | **10.1×** (9.94–9.98× vs the re-measurement) |
| Assignment 3 C19 broad qualification — 385 members, 251 k evaluations | 1,249.5 s (12 workers) | 238.5 s | 163.7 s | 1.46× | **7.6×** |
| Assignment 2 C19 base search — Growth fixed, 128 lanes, 2.20 M evaluations | 4,681.1 s (14 workers) | 1,641.0 s | 724.8 / 726.4 s | **2.26×** | **6.45×** |
| Small-batch control — 16 lanes, 30,749 evaluations, median batch 376 | 123.2 s (12 workers) | 72.8 s (×3) | 65.2 s (×3) | 1.12× | 1.89× |

Every run is reported (`GPU_PERFORMANCE_BEFORE_AFTER.md`). Sustained production-pool throughput rose 1.6–2.4× per
door and mix (45-min run). GPU idle time between batches fell from 775 s to 228 s on the Assignment 3 job; what remains
is the optimizer's own round-trip (lanes wait for their batch) and kernel latency.

## 4. Why the CPU/GPU equivalence is credible

1. **The kernels did not change.** The final binary's device code and SASS are byte-identical to the Phase 2 binary
   accepted after 144,795 bit-exact campaign candidates, two sealed-job replays, 48 sealed finalists and an 8 h run.
2. **The host path changed only where work runs.** One batch codec (`src/gpu-backend/batch.ts`) is used by the serial and
   the parallel path; on 7 real captured Phase 2 batches the new code rebuilds the Phase 2 request byte for byte and
   reproduces every result's hash (records, books, pooled replay, RC counters, envelopes) with 1–12 workers.
3. **End-to-end identity on real optimizers:** Assignment 3's sealed C19 broad1 search (twice), its C19 broad
   qualification (385 members, 377 qualified) and Assignment 2's sealed C19 base search (twice) replayed through the final
   path identical to their sealed records — every lane, promotion, extension round, refinement, shortlist and
   qualification verdict; the fixed-seed mini-optimization gives the same 30,749 archived records on the CPU arm, on the
   GPU, on the GPU interrupted and resumed, on 1 and 0 host workers and on the accepted Phase 2 path.
4. **A fresh parity campaign** through the final host path against the canonical CPU engine: 54 runs, 144,795
   candidates (141,600 random, 64,054 risk envelopes), **0 mismatches** in every compared field; 176 determinism runs, 0
   differences; Assignment 3's 48 sealed finalists 96/96 on D24 (the sealed figures 48/48 to the cent) and 96/96 on FULL.
5. **Determinism** across batch sizes 1…large, shuffled and reversed input order, host workers 0/1/3/12, restarts: 0
   differences.

## 5. Safety constraints that hold

- Official optimization is GPU-only, fail-closed, with no CPU fallback; the serial host path is a GPU path, not a CPU one.
- Every batch's receipt (UUID, nonce, device counters, checksum) is verified before any result is released; a worker
  failure, a hang or a corrupted response fails the job (checkpointed) — tested.
- Same strategy, optimizer, candidates, fitness, qualification and results; no genome, rule, precision, risk metric or
  allocator change; Strategy Lab's CPU engine and UI untouched.

## 6. Merge and branch status

FILL.

## 7. Limitations (stated plainly)

- **10×, not more.** The Growth-searched job sits at the lower edge of the 10–15× hypothesis; the Growth-fixed job at
  6.5× (main-thread lane logic and archive now dominate it); small batches gain little (GPU latency). Further gains
  need kernel work (Priority C, deferred: new GPU-level parity and sanitizer burden) or search designs with more
  concurrent lanes.
- **Sustained operation is proven for 45 minutes** of the new host path (no 8 h or 24 h run, by instruction). The
  kernels and server are byte-identical to Phase 2's, whose 8 h run is reused for them only.
- **The trust boundary is Git review plus an out-of-band record hash**, not a cryptographic signature: a malicious
  committer who weakens a gate and regenerates the record passes every in-repository check (tamper case T14); only the
  record sha256 kept outside the repository (and its comparison by an unmodified verifier) catches it.
- **One type-only regression** in the root TypeScript check (`hostPipeline.ts:196`, the DOM name `Transferable`);
  no runtime effect; deferred to the next acceptance cycle because the file is in the binary's evaluation digest.
- **Hardware binding.** The acceptance is for this RTX 5090 (UUID `GPU-ae5f222c…`), this driver and toolkit; another GPU
  or driver needs the parity checklist again.
- **Pilot inputs not yet delivered** by the official pool (§8).

## 8. The pilot

**Risk-envelope pilot NOT STARTED.** Read-only readiness review: `GPU_PILOT_READINESS.md` — the evaluation and its
risk-envelope inputs are on the GPU and bit-exact, but the official pool/Lab does not yet request or deliver the envelope
to a search; that small host-path change needs a fresh acceptance (≈ 4–5 h on Apollo) before an optimizer can gate on
25 % principal loss / 25 % banked-capital DD. The decision belongs to the original conversation.

## 9. The reports

| File | Content |
|---|---|
| `GPU_PERFORMANCE_BEFORE_AFTER.md` | Phase 2 vs final timings, CPU baseline, every run, bottlenecks, decisions |
| `GPU_FINAL_PARITY_AND_ACCEPTANCE.md` | scope, campaign, optimizer identity, sanitizer, negative/tamper, sustained run, the record |
| `GPU_ENFORCEMENT_INTEGRITY.md` | the trust-boundary audit, covered paths, root of trust, tamper tests, limits |
| `GPU_INTEGRATION_AND_OPERATIONS.md` | branches and commits, merge evidence, checkout, how to run official GPU research, recovery |
| `GPU_PILOT_READINESS.md` | what is ready, what is missing, what the original conversation must authorize |
| `MANIFEST.json`, `CHECKSUMS.sha256` | inventory with sha256 of every file; provenance |
