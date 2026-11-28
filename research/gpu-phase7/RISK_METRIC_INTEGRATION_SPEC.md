# Risk-metric integration specification — the risk-envelope delivery of `GpuPool` / `EvalLab` (GPU Phase 7)

Deliverable B of the brief. Scope: the smallest backward-compatible interface that delivers the device's risk-envelope
inputs to official GPU optimization research, and the one module that interprets them. **No trading signal, entry, exit,
position state, CUDA kernel, numerical formula or precision changes.** The definitions are
`research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md` §3–§5 (authoritative); the CUDA computation is Phase 2's
(`src/gpu-backend/cuda/gb_pool.cuh`, risk mode), parity-verified against the CPU reference since Phase 2.

## 1. What existed and what was missing

| Layer | Before (Phase 6) | Now (Phase 7) |
|---|---|---|
| Device | computes `bdMarked, bdLiq, plMarked, plLiq` for a task with `risk` (capability bit `RISK_METRICS`) | unchanged (CUDA sources byte-identical; gb7's device code and SASS = gb5's) |
| Decoder (`batch.ts`) | `TaskResult.envelope` set iff the task requested risk | unchanged |
| Pool (`pool.ts`) | forwarded `risk` into the task, but handed the caller **only `r.record`** | a risk task's value is **`{ ...record, envelope }`**; a mismatch fails the job |
| Lab (`lab.ts`) | `evalMany` items `{ cfg, options, detail }`; no risk flag; no key suffix | items may add **`risk: true`**; own key suffix **`|risk`**; validated on write and read |
| Interpretation | none (each study would have written its own) | **`src/risk-envelope/policy.ts`** (the one interpretation) and `diagnostics.ts` |

## 2. The interface

### 2.1 `EvalLab.evalMany(items, tag)` (`src/gpu-backend/lab.ts`)

```ts
items: readonly { cfg: Cfg; options: EvalOptions; detail?: boolean; risk?: boolean }[]
```

| Item | Archive key | Task sent to the pool | Value returned and archived |
|---|---|---|---|
| plain (no `risk`) | `evalKeyOf(door, cfg, options)` + (`|detail` if detail) — **exactly as before** | `{ k, quad, controls, options, detail }` — **the same object shape as before** (no `risk` property) | the canonical record (SRec or DRec), **the same object as before** |
| `risk: true` | the same + **`|risk`** (after `|detail`) | the same + `risk: true` | `RiskRec = record & { envelope: Envelope }` |

- A plain item and a risk item of the same configuration are **two distinct archive identities**; a resumed job reads each
  back under its own key. The archive binding (study, job, door, door pin, evaluation-code digest, backend) is unchanged.
- In-flight de-duplication, archive hits, the fresh cap, checkpoints and resume semantics are unchanged.
- Exports: `RISK_KEY_SUFFIX = '|risk'`, `ENVELOPE_FIELDS`, `type RiskRec`, `checkEnvelope(e, where)`.

### 2.2 `GpuPool.run(tasks, onResult)` (`src/gpu-backend/pool.ts`)

- `tasks[i].risk?: boolean` (typed; it was already forwarded). For a risk task `onResult` receives
  `{ ...r.record, envelope: r.envelope }`; for any other task `r.record` itself.
- Before any result of a batch is released, every successful result must satisfy *requested ⇔ envelope present*;
  otherwise the batch is withheld and the job fails with `PolicyError('risk-envelope-mismatch', …)` (the server is
  stopped; nothing is archived; no CPU fallback). Capacity retries keep the flag.

### 2.3 The envelope (`Envelope`, `src/gpu-backend/batch.ts`) — units and definitions

All four are **dollars**, ≥ 0, computed on the device from the pooled replay of the whole door (risk mode):

| Field | Definition (METRIC_SPECIFICATION) | Basis |
|---|---|---|
| `principalLossMarked` | max over funded lots of max(0, −min π_i) over every mark of the lot's life and its exit (§4 `principalLossMarked`) | marked (no exit cost on open marks) |
| `principalLossLiquidation` | the same with λ_i = π_i − q_i·x·cost (§4 `principalLossLiq`, PL_max) | liquidation-equivalent |
| `bankedDdMarked` | max_t [H(t) − M(t)], H(t) = max(0, max_{u≤t} R(u)) (§5 BD) | marked |
| `bankedDdLiquidation` | max_t [H(t) − M^L(t)] (§5 BD^L) | liquidation-equivalent |

The conventional marked maximum minute drawdown is the record's own `dd` (the strict tracker; standard §0.3), unchanged.
Its liquidation twin DD^L is **not** delivered by the device (it is not needed by the approved thresholds; available from
the CPU diagnostic `src/vg-l0-risk-metrics/metrics.ts markedDrawdown(pts, 'liquidation')`; decision register D-11).

**Exact orderings (enforced):** the device computes `liq = pnl − (mv × costBps) / 10000` and both banked series share one
high H, so `principalLossLiquidation ≥ principalLossMarked` and `bankedDdLiquidation ≥ bankedDdMarked` hold exactly in
binary64 (equal at 0 bps; verified on every parity record and by `risk-parity` at 0 bps).

### 2.4 Validation (`checkEnvelope`, fail closed)

Throws on: a missing envelope or a non-object; any field set other than exactly the four; a non-number, NaN, ±∞ or
negative value; liquidation < marked for either pair. Used by the Lab on every **write** (the delivered value) and every
**read** (the archived value: a damaged or foreign archive row is refused), and by `policy.ts` on every assessment. A plain
key whose record carries an `envelope` is refused (mixing). Not-applicable values are never computed NaNs (Phase 5's
lesson): a run without lots has 0 for every field (the device initializes them to 0; the CPU reference returns 0).

## 3. The one interpretation: `src/risk-envelope/policy.ts`

### 3.1 Policies (proposals for the pilot; nothing is adopted)

| Policy | Marked DD | Trade principal loss | Banked-capital DD |
|---|---|---|---|
| `nl0-control@1.0.0` | ≤ 35 % of C0 | report-only | report-only |
| `re-40-25-25@1.0.0` | ≤ 40 % of C0 | ≤ 25 % of the lot's funded principal, **liquidation basis** | ≤ 25 % of C0, **liquidation basis** |

The basis of the two new gates is decision D-3 (the liquidation basis is the conservative proposal; the marked twins are
always reported).

### 3.2 Denominators and limits

- **C0** = the initial trading allocation = the pool's fixed budget (`CapitalContext.initialAllocation`; research
  $100,000). Marked DD and banked DD are compared with **pct % of C0 — never with peak equity**.
- **Funded principal** of a lot = its entry principal; in the fixed-slot model every funded lot's principal equals C0
  (fractional shares; no compounding or downsizing — `fundedPrincipal: 'fixed-budget'`). The device delivers the maximum
  dollar loss over lots, so max_i PL_i ÷ P_i = PL_max ÷ C0 exactly under this model. **Whole shares break the identity
  and are refused** (`assertSupportedOptions`), as is any other funded-principal model.
- Limits are computed as **(C0 × pct) / 100** with whole-percent thresholds: exact in binary64 for whole-dollar C0
  ($40,000.00, $25,000.00; $100,000 / $62,500 at $250,000; $200,000 / $125,000 at $500,000 — tested).

### 3.3 Decision, boundary and violation

- A gated check passes iff **value ≤ limit**, in dollars on the unrounded record value (a value equal to the limit
  passes, one ulp above fails — tested). Ratios (value ÷ denominator) are reported, never compared.
- `violation` = Σ over the gated checks of max(0, value − limit) ÷ limit (0 iff all pass). Under `nl0-control` it is
  **bit-identical** to Assignment 2's normalized DD violation term, and `pass` equals the original plausibility DD test
  `dd ≤ 35,000` (tested on 20,000 random and edge values) — so the control policy reproduces the original rule exactly.
- `envelopeNbStats(neighbours, policy)`: p90, p95, worst and worst-10 % mean of each input with the neighbourhood DD's
  quantile (linear interpolation), and the share of neighbours failing the policy.
- Every assessment names `policy@version`, `risk-envelope@1.0.0`, the capital context and every check (metric, basis,
  value, denominator and its name, ratio, pct, limit, pass, excess): the metadata needed to reproduce a decision.

### 3.4 Nonbinding diagnostics (`src/risk-envelope/diagnostics.ts`)

D1 peak-equity drawdown, D2 capped hybrid allowance, D3 profit-component partition — specified in
`research/vg-l0-risk-envelope-pilot/DIAGNOSTICS_SPEC.md`; pure functions with tests; never used by a search.

## 4. Compatibility guarantees (each verified)

| Guarantee | Evidence |
|---|---|
| A plain item's key, task object and archived record are unchanged | unit test `labRisk.test.ts` ("a plain item …"); the sealed replays a3:C19:broad1 and a2:C19:base = the sealed records (gate A3); the mini schedule = its isolated reference (A4) |
| Requesting the envelope changes no record field and no search decision | `risk-parity` R2 (risk value minus `envelope` = the plain record, both backends, every subject); a3:C19:broad1 **with** `--risk` = the sealed record with envelopes stripped (A3); mini with `--risk` = mini plain (A4) |
| CPU and GPU deliver the same values and the same decisions | `risk-parity` R1/R3 (four runs incl. threshold edges), the risk mini CPU = GPU (A4), Q1 on every archived evaluation |
| Historical rankings and results unchanged with the capability disabled | the sealed replays and finalists (A2, A3); the 2,000 archived Assignment 3 edge records reproduced bit for bit (R2 archive) |
| Fail closed | `labRisk.test.ts`, `policy.test.ts`; the negative suite's `risk` group (6 cases on the GPU); tamper T21–T23 |

## 5. Cache, archive and acceptance identity

- Archive identity: `…|risk` keys (distinct, stable); a job's identity (`openJob` definition) includes `risk: true` when a
  runner requests it for every item (`tools/gpu-phase7/job.ts --risk`), so a risk job never resumes a plain one.
- Dataset cache: unchanged (the envelope is computed from the same exported dataset).
- Acceptance: `pool.ts` and `toolchain.ts` are in the host group of the evaluation digest (compiled into the binary:
  new binary `research/gpu-phase7/build/gb7`); `lab.ts`, `entrypoints.ts`, `hostPipeline.test.ts` and
  `config/gpu-backend/entrypoints.json` in the enforcement group. Hence a full checklist §2 cycle (this study). The
  research module `src/risk-envelope/` is deliberately **not** in the manifest: it never evaluates; a study pins it through
  its own code digest.

## 6. Not delivered / limits

- DD^L (liquidation-basis conventional DD), per-lot principal-loss lists, the drawdown attribution and the D1–D3 path
  diagnostics are CPU diagnostics (non-official, report-only), not device outputs.
- The official GPU path evaluates at the fixed $100,000 budget only (`EvalOptions` has no budget field); other
  allocations are CPU-only diagnostics (`tools/gpu-phase7/scaling-check.ts`).
- The envelope is a whole-door statistic; window (fold-slice) versions are CPU diagnostics.
