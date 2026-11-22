# Risk-envelope pilot — prerequisites readiness (deliverable A)

**Verdict: the infrastructure is READY FOR THE PILOT'S REVIEW. The pilot is NOT authorized and has NOT started.**
The GPU path delivers the four risk-envelope inputs bit-identically to the CPU reference through the official
`openOfficialGpuSession` → `GpuPool` → `EvalLab` path, fails closed, does not change any search decision, and holds a
fresh ACCEPTED acceptance record (full §2 cycle) on this branch. Execution is blocked, as intended, on the user's
decisions (below) and on the pilot code, which by design does not exist yet.

Branch `research/gpu-phase7-risk-envelope-readiness` (from the post-cleanup `cleanup/storage-2026-11-21` `d89b9dec` =
`main` `3606f4b3` + 2 docs-only commits); not merged. Apollo, RTX 5090 `GPU-ae5f222c…`, Node v24.21.0 `--no-maglev`.

## 1. Final readiness gate (brief §12)

| Requirement | Status | Evidence |
|---|---|---|
| Verified post-cleanup repository lineage | **met** | RESTORATION_REPORT §1–§2; baseline verifier VERIFIED on `d89b9dec`; 21,092 tracked research blobs unchanged |
| Correct handling of the compressed Assignment 3 archives | **met** | only 2 of 14 restored, to git-ignored scratch, read-only; 10/10 checks each (sha256 = pre-compression original, `integrity_check` ok, row counts); `.zst` originals unchanged; scratch deleted at completion (re-creatable) — RESTORATION_REPORT §4–§6 |
| Preserved historical New L0 and N/original results | **met** | reproduced exactly on D24 by CPU and GPU: New L0 $382,721.46 / DD $19,459.83; N/original $388,031.02 / DD $19,459.83 (PARITY_REPORT §2); Strategy Lab portfolio parity ALL VERIFIED; sealed files 1,053 unchanged |
| Correct pilot risk-metric delivery | **met** | RISK_METRIC_INTEGRATION_SPEC; R1–R3 on 4 runs (3,048 subjects, 12,384 items): 0 differing; envelope orderings enforced; mismatches fail the job (negative 6/6 risk cases, tamper T21–T23) |
| Exact supported CPU/GPU parity | **met** | 54-run campaign 144,795/144,795 identical (64,033 envelopes); finalists 96/96; mini-optimizations 9/9; Q1 61,498/61,498; reliability 2 × 32 min 0 mismatches — PARITY_REPORT |
| Valid GPU acceptance | **met (this branch)** | record `bb0e3fcf…` ACCEPTED, verifier VERIFIED (rebuild + device + out-of-band pin), live official gate OPEN — ACCEPTANCE_EVIDENCE. `main` still holds Phase 6's record (valid for `main`); merging is decision D-14 |
| Correct percentage normalization and denominators | **met** | limits = C0 × pct / 100 on the fixed allocation C0 (never peak equity); value = limit passes; unit tests 14/14; scaling $100k / $250k / $500k: chronology and decisions identical, deviation ≤ 2.8e-15 × C0 (SCALING_CHECKS) |
| Preserved original optimization search behaviour | **met** | Assignment 3 C19 broad1 replay with the envelope requested on all 1,242,714 evaluations = the sealed record (envelopes stripped); mini risk = plain; the control policy reproduces the $35,000 rule bit for bit |
| No unexpected Strategy Lab regressions | **met** | typecheck, lint, Vitest 314/314, build, Playwright 81/81, portfolio parity; state and live dist untouched |
| Clean or fully explained Git state | **met** | committed and pushed (RESEARCH_RECOVERY final top screen); amendments D0, D1, A1, A2 explain every deviation |
| Reproducible official job configuration | **met for the infrastructure** | gb7 reproducible; job identities, paths, seeds and commands in EXECUTION_PLAN; the pilot's own code and adoption manifest are deliberately absent (blocker B2) |
| A complete pilot protocol ready for user review | **met** | `research/vg-l0-risk-envelope-pilot/PROTOCOL_PROPOSED.md` with DECISION_REGISTER (D-0 … D-15; D-15 resolved), DIAGNOSTICS_SPEC, SCALING_CHECKS, IMPLEMENTATION_PLAN, EXECUTION_PLAN |
| No actual pilot optimization started | **met** | no pilot code, adoption manifest, job, attestation or result exists; only non-official parity / benchmark jobs ran |

## 2. What was done

1. **Delivery (Phase B).** `EvalLab.evalMany` items may set `risk: true`; such an item has its own archive identity
   (`…|risk`) and returns `{ ...record, envelope }` with `principalLossMarked`, `principalLossLiquidation`,
   `bankedDdMarked`, `bankedDdLiquidation` (dollars). Plain items are byte-for-byte as before. `GpuPool` withholds a batch
   whose envelopes do not match the requests; `checkEnvelope` validates every write and read. No CUDA, CPU-engine or
   trading change (CPU and CUDA groups unchanged; gb7's device code = gb5's).
2. **One interpretation.** `src/risk-envelope/policy.ts`: `nl0-control` (DD ≤ 35 % C0) and `re-40-25-25` (DD ≤ 40 % C0,
   trade principal loss (liquidation) ≤ 25 % of funded principal, banked DD (liquidation) ≤ 25 % C0); `diagnostics.ts`
   for the nonbinding D1–D3.
3. **Acceptance renewed (Phase F).** Full §2 campaign on the final binary (`chains/final.sh`, 2026-11-21T20:23Z →
   2026-11-22T00:13Z), the generator, the independent verifier, the record-in-force tests and the live gate.
4. **Pilot package (Phases C–E, G).** Proposed protocol, decision register, diagnostics, scaling checks (performed),
   execution plan with measured throughput.

## 3. Failures and incidents (all resolved, none affecting evidence)

| Item | What happened | Resolution |
|---|---|---|
| Campaign step 26 (tamper) refused | an untracked helper written during the run made the tree dirty | helper moved out, chain resumed at step 26 (AMENDMENTS D1); 23/23 |
| Integrity 4/5 at step 28 | the sealed-file sub-check compared totals that necessarily included this study's own two new seals | scope corrected (other studies = baseline exactly; own seals verified 0444), integrity rerun 5/5 (AMENDMENTS A2) |
| Scaling check first run | value-relative criterion inflated by a near-zero net | C0-relative criterion (A1, diagnostic only) |
| Dev negative run | a dev binary built before formatting had a stale digest | rebuilt; dev artefacts disclosed, not evidence (D0, D1) |

## 4. Caveats for the review

- **Budget.** The proposed pilot expects ≈ 0.27–0.38 M evaluations; the worst case (0.70 M) exceeds the approved
  0.3–0.5 M band. D-2 proposes a stop before qualification if the searches exceed 450,000.
- **Not a pure relaxation.** On near-threshold engineering subjects, 20.5 % (D21) and 23.7 % (D24) passed exactly one of
  the two policies; banked DD > 25 % of C0 was the most frequent experimental failure (PARITY_REPORT §4).
- **Structural exception.** Banked DD (marked) exceeded marked DD in 4 engineering subjects (partial sales under water),
  as the audit's relation allows; GPU = CPU in each.
- **DD^L** (liquidation-basis conventional DD) is not delivered by the GPU; report-only CPU diagnostic (D-11).
- **Throughput.** Pilot-shaped 8-lane jobs are latency-bound (367 and 227 evaluations/s at C21 and C24 with the envelope; concurrency gains 5 %): the whole pilot needs ≈ 16–23 min of GPU time, ≈ 42 min worst case (EXECUTION_PLAN §4.2). Requesting the envelope costs +16.7 % wall on a full 64-lane replay.
- **Acceptance scope.** The Phase 7 record is valid on this branch. An official pilot run needs this branch's tree or a
  reviewed merge that carries the record (INTEGRATION_PLAN; never the code without the record).

## 5. Blockers to pilot execution (by design)

- **B1** the user's review and authorization of the protocol and of every open decision D-0 … D-14 (D-15 resolved: scratch copies deleted)
  (`research/vg-l0-risk-envelope-pilot/DECISION_REGISTER.md`), in the original conversation.
- **B2** the pilot code (`IMPLEMENTATION_PLAN.md`), its adoption manifest and engineering gates E2–E6 — written only after
  authorization.
- **B3** decision D-14 (merge of the backend change and its record into `main`, or running from this branch).

## 6. Deliverables

| | Document |
|---|---|
| A | this file |
| B | `research/gpu-phase7/RISK_METRIC_INTEGRATION_SPEC.md` |
| C | `research/gpu-phase7/PARITY_REPORT.md` |
| D | `research/gpu-phase7/ACCEPTANCE_EVIDENCE.md` |
| E | `research/vg-l0-risk-envelope-pilot/PROTOCOL_PROPOSED.md` (+ `DECISION_REGISTER.md`, `DIAGNOSTICS_SPEC.md`, `SCALING_CHECKS.md`, `IMPLEMENTATION_PLAN.md`) |
| F | `research/gpu-phase7/RESTORATION_REPORT.md` |
| G | `research/vg-l0-risk-envelope-pilot/EXECUTION_PLAN.md` — **do not execute** |
| H | `research/gpu-phase7/READINESS_MANIFEST.json` (`pilot.executionAuthorized: false`) |
| I | `research/gpu-phase7/bundle/gpu-phase7-risk-envelope-readiness.zip` (copy in `~/.local/share/margin-trading-gpu/handoffs/`) |

The standard (3.0.0), NL0 1.0.0, New L0's status and every optimizer default are unchanged; no replacement for New L0
is nominated; nothing is deployed.

**PILOT NOT STARTED — awaiting original-conversation review and separate authorization**
