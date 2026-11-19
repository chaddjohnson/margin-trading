# GPU readiness for the deferred risk-envelope pilot (read-only review)

**Risk-envelope pilot NOT STARTED.** This GPU engineering study did not implement, search, simulate, qualify, validate or
review anything of the pilot. It created no pilot protocol, study namespace, adoption manifest, preflight attestation,
selection policy, constraint, threshold or fitness change. The original Margin Trading conversation owns the pilot's exact
protocol and its go / no-go decision. This document is a **read-only compatibility review** (brief §7, "Scope boundary").

For reference only (not instructions): the original conversation approved a pilot comparing the legacy control (marked
drawdown ≤ 35% of the initial $100,000) with an experimental envelope (40% marked DD, 25% trade principal loss, 25%
banked-capital DD), plus later diagnostic drawdown policies and proportional-scaling checks. The method's design is in
`research/vg-l0-risk-metrics/PROPOSED_METHOD.md` (§1 risk inputs and their implementation hooks, §2 their roles, §8 the
user's decision points); its metric definitions in `research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md`.

## 1. What is ready

| Item | Status | Evidence |
|---|---|---|
| The evaluation the pilot needs (Assignment 3's genome, both D1 books with RC 2 controls, Growth 1.4.0, the one-slot pool with every option, the detailed record) on the GPU, bit-identical to the CPU engine | ready (accepted) | `GPU_FINAL_PARITY_AND_ACCEPTANCE.md`; Phase 2 |
| Capability coverage of the pilot's reachable domain ("Assignment 3 genome ∪ risk-envelope pilot domain, NL0 controls grid") | ready: every reachable feature implemented; the acceptance record's `domain` names it; `policy.test.ts` asserts it | `config/gpu-backend/acceptance.json` `domain`; `src/gpu-backend/domain.ts` `riskEnvelopePilotDomain` |
| The risk-envelope **inputs** — trade principal loss and banked-capital drawdown, marked and liquidation bases — computed on the device from the pooled replay, as `src/vg-l0-risk-metrics/metrics.ts` defines them | computed and parity-verified (zero tolerance) | Phase 2: 64,063 envelopes; this study's campaign: see `GPU_FINAL_PARITY_AND_ACCEPTANCE.md` §2 (`envelopesCompared`) |
| The marked minute DD (the legacy 35% control's input) | ready: in the compact record (`dd`) delivered to the optimizer | every sealed-job replay |
| The official entry: `openOfficialGpuSession` → `GpuPool` (8 host workers) → `EvalLab`; an official npm script through `src/gpu-backend/officialRunner.ts`; the study preflight with `evaluationBackend: gpu-required` | ready | `GPU_INTEGRATION_AND_OPERATIONS.md` §4 |
| Throughput | Assignment 3-shaped search ≈ 10× the sealed 12-worker CPU job (≈ 1.9× Phase 2); Growth-fixed (Assignment 2-shaped) see `GPU_PERFORMANCE_BEFORE_AFTER.md` | measured |

## 2. What is NOT ready — the delivery of the risk-envelope inputs to an official search

The device computes the envelope only for a task with `risk: true`, and the decoder returns it in `TaskResult.envelope`.
But the official search path neither **requests** nor **delivers** it:

- `EvalLab.evalMany` (`src/gpu-backend/lab.ts`) builds tasks from `{ cfg, options, detail }` — there is no `risk` flag, and
  the archive key has no risk suffix;
- `GpuPool.run` (`src/gpu-backend/pool.ts`) hands the caller only `r.record` (the compact or detailed record), not
  `r.envelope`;
- the detailed record (`DRec.risk`, `src/vg-l0-risk-families/evaluate.ts riskInputsOf`) carries exposure and per-lot
  excursions (MAE), **not** the banked-capital DD or the liquidation-basis trade principal loss.

So an optimizer that must gate on 25% trade principal loss or 25% banked-capital DD per evaluation (centre and
neighbours) cannot obtain those numbers through the accepted official path today. **This is the one source change the
pilot needs on the GPU side.** A minimal design (not implemented here):

1. `EvalLab.evalMany` items gain an optional `risk: boolean` (forwarded into the task; the archive key gains a `|risk`
   suffix so that risk-bearing records never mix with plain ones);
2. `GpuPool` returns the envelope with the record (e.g. the archived value `{ ...record, envelope }` for a risk task);
3. tests: unit tests of the key and delivery; the parity campaign's detail + risk runs already compare the envelope
   bit for bit.

**Acceptance consequence:** `pool.ts` is in the evaluation manifest (its digest is compiled into the binary) and `lab.ts`
in the enforcement group. Both changes make `config/gpu-backend/acceptance.json` STALE (official runs refused, `npm
test`'s merge gate fails) until the parity checklist (`docs/gpu/PARITY_CHECKLIST.md` §2) is repeated: rebuild (the
kernels stay byte-identical), the parity campaign through the host path, the sanitizer, the negative and tamper tests,
the fixed-seed mini-optimization and a sealed-job replay, then a new acceptance record. With this study's tooling
(`research/gpu-phase3/chains/final.sh`, `chains/tests.sh`, `tools/gpu-phase3/accept.ts` adapted to a successor study)
that is ≈ 4–5 h of mostly unattended Apollo time.

There is no complete alternative without an evaluation change: the detailed record's per-lot MAE is a marked-basis,
no-exit-cost excursion, close to but not the approved liquidation-basis trade principal loss, and **no** delivered record
field carries the banked-capital DD. Substituting a delivered quantity for an approved one would be a methodology
decision for the original conversation; it must not be made silently (standard §9.4: no silent change of what an
optimization evaluates).

## 3. What the original conversation still has to authorize, implement and test

1. **Authorize the pilot** as a new study adopting standard 3.0.0 (scope `optimization`), with its own protocol from
   `docs/research/STUDY_PROTOCOL_TEMPLATE.md`, `STANDARD_ADOPTION.json` with `evaluationBackend: { policy:
   "gpu-required", purpose: "official-optimization", acceptance: "config/gpu-backend/acceptance.json" }`, a passing
   `npm run research-preflight -- --study research/<pilot>`.
2. **Decide the risk-input delivery** (§2): implement the minimal delivery change and re-accept (≈ 4–5 h), or define the
   gates on quantities already delivered.
3. **Implement the pilot's selection code** (arms, gates, ranking, qualification, diagnostics, proportional scaling) in
   its own `src/<pilot>/` directory that evaluates only through the official gate (the entrypoint audit then needs no
   registry change), and an npm script through `src/gpu-backend/officialRunner.ts`. Selection code outside the
   canonical evaluation closure does not touch the acceptance; anything that changes what is evaluated does.
4. **Before the first search:** the live official preflight on the pilot's doors
   (`GPU_POLICY_PURPOSE=official-optimization node … tools/gpu-backend/official-preflight.ts --study research/<pilot>
   --door D24 --domain pilot`), which writes the attestation; the pilot's own engineering gates (its protocol's §12).
5. Everything about thresholds, fitness, budgets, folds and the go / no-go remains the original conversation's.
