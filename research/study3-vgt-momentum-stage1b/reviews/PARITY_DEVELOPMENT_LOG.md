# Parity development log (synthetic markets only; before `stage parity` and the code freeze)

Fast engine (`engine.ts`) against the independent reference (`reference.ts`, written in a separate context from the
frozen texts; notes `REFERENCE_AUTHOR_NOTES.md`) on `tests/synthetic.ts` markets, through every parity set of
`stages.ts paritySets` (single runs, random vectors over every exit box, 64 vectors per pairing box, sizing variants,
controls, stresses, S1/S2/S3 chains in both financing modes). Harness: a scratch script printing field-level detail; no
market data is read. Each difference is resolved against PROTOCOL.md / ENGINE_CONTRACT.md, never by matching one engine
to the other.

## Round 1 — 2026-10-29T00:19Z (seed 21; 3,720 runs; 33 runs differ in 3 fields)

| Field | Runs | Cause | Resolution |
|---|---|---|---|
| `window.grossDollarDays` | 9 chains (S1/S2/S3, net and slot) | **fast-engine defect**: the overnight b → b+1 was credited to the window ending at b; contract §9 credits sessions b … e−1 to (b, e] | fast engine fixed (A1.7) |
| `minuteDd` | 19 runs with trims or Z3 | the reference also marked entry, trim and conversion fills (its note N2, reading PROTOCOL §3.3 "at each fill"); contract §2/§8 mark only exit fills; Stage 1's engine marks only exit fills | A1.1 (exit fills only); reference to be updated |
| `kind` | C-ALR (both modes) | contract §10 did not label ZR segments | A1.4 (Stage 1's convention); reference to be updated |
| — (no observed difference) | — | XS arming (N10), the `sessions` hurdle (N9), conversions (N15) | A1.2, A1.3 (fast fixed to Stage 1's 0.11), A1.5 |

After the fast-engine fixes: Stage 1 parity (fold-A data, Stage 1 configurations) still 1,586 runs / 0 differences;
fixture tests 27 / 27.

## Round 2 — 2026-10-29T00:22Z (after A1 on both engines; reference sha256 50d34873…)

Seeds 21 and 5: 3,720 runs each, **0 differences** (max |Δ| 8.7 × 10⁻¹¹ and 7.3 × 10⁻¹¹). The reference author's own
self-tests (3,420 single-policy and 2,886 schedule/ZR runs, ~30 hand cases) pass after A1. Next: `stage parity` on
fold-A market data (difference counts only).

## Sealed `parity` stage and coverage — 2026-10-29T00:24Z

`results/records/parity.json`: pass; (a) Stage 1 engine 1,626 runs / 0 differences (max |Δ| 2.8 × 10⁻¹¹); (b)
reference 3,728 runs / 0 differences (3.6 × 10⁻¹¹); prefix / poisoned-future / truncated-run guards at 2017-12-29 and
2018-12-31: 0 differences; door requests 2024-01-02, 2025-12-31, 2026-01-02 refused. Four coverage counters did not
fire on fold-A data: fill-bar stop (fixture F2), trim with the loan to zero (F8), S3 sell branch (F13), **S2 across two
boundaries (no fixture — disclosed deviation from PROTOCOL §12 (c))**. Dev evidence for the last two on a hand-built
20-session path (A → B → C at sessions 5 and 10): S2 carries A across both boundaries to its own stop at session 17 and
then adopts C; S3 converts twice (sell branch); fast = reference with 0 differences in all six transition × financing
runs. A fixture could not be added after the parity stage without breaking the parity-pinned code manifest.
