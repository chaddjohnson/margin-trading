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
| 2 | **Priority A**: one batch codec for both host paths; worker threads encode and decode shards of every batch; the receipt verified on the main thread; results released in dispatch order | ≈ 1.93× faster than Phase 2 on the Assignment 3 job (FILL final), bit-identical |
| 3 | Priority B measured and rejected; Priority C deferred | archive JSON 1.5 % of the wall; kernels latency-bound, unchanged |
| 4 | Enforcement hardened: manifest v2 (host path + pinned enforcement group), acceptance schema 2 (source revision), independent re-hash and committed-source checks in the gate, official npm-runner wrapper, independent verifier, file-classification rule, tamper suite | `GPU_ENFORCEMENT_INTEGRITY.md` |
| 5 | One final acceptance campaign on the final binary | FILL |
| 6 | Performance verdict | FILL |
| 7 | Merge into `main`, branch restoration | FILL |

## 3. Measured speed (wall time of complete optimizer jobs)

FILL.

## 4. Why the CPU/GPU equivalence is credible

1. **The kernels did not change.** The final binary's device code and SASS are byte-identical to the Phase 2 binary
   accepted after 144,795 bit-exact campaign candidates, two sealed-job replays, 48 sealed finalists and an 8 h run.
2. **The host path changed only where work runs.** One batch codec (`src/gpu-backend/batch.ts`) is used by the serial and
   the parallel path; on 7 real captured Phase 2 batches the new code rebuilds the Phase 2 request byte for byte and
   reproduces every result's hash (records, books, pooled replay, RC counters, envelopes) with 1–12 workers.
3. **End-to-end identity on real optimizers:** FILL (sealed replays, mini-optimization CPU = GPU = resumed, worker counts).
4. **A fresh parity campaign** through the final host path against the canonical CPU engine: FILL.
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

FILL.

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
