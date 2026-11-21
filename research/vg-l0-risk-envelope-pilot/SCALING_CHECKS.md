# Position-size normalization checks — $100,000 / $250,000 / $500,000 (brief Phase E)

**Purpose:** verify that the percentage constraints scale correctly with the trading allocation under the existing model.
Not a search; three independent genetic optimizations are **not** run. Account-level margin maintenance is a separate
illustrative assessment, never a pilot fitness constraint.

## Limits by allocation (exact: (C0 × pct) / 100)

| C0 | Marked DD 35 % (control) | Marked DD 40 % | Trade principal loss 25 % | Banked-capital DD 25 % |
|---:|---:|---:|---:|---:|
| $100,000 | $35,000 | $40,000 | $25,000 | $25,000 |
| $250,000 | $87,500 | $100,000 | $62,500 | $62,500 |
| $500,000 | $175,000 | $200,000 | $125,000 | $125,000 |

These are research qualification limits on historical paths; they do not imply such absolute losses are acceptable for
live deployment.

## The check performed (GPU Phase 7, non-official CPU diagnostic)

`tools/gpu-phase7/scaling-check.ts` (purpose `diagnostic`, `node --no-maglev`): the canonical CPU pool
(`src/vg-d1-growth-joint/pool.ts runPool`, `PoolOptions.budget`) replays each configuration at C0 = $100,000, $250,000 and
$500,000 on the same door; the envelope comes from the canonical reference (`src/gpu-phase7/envelope.ts`); both policies
are assessed with `capitalContext(C0)`. Subjects per door: Assignment 3's 48 sealed finalists (New L0, N/original, C4,
C4-refined among them), 75 threshold-edge engineering subjects, 25 fresh random genomes — 148.

| Door | Subjects | Trade chronology and DD instants identical | Policy decisions identical | Worst dollar deviation (÷ C0) | Worst deviation (÷ value) | Record |
|---|---:|---|---|---:|---:|---|
| D24 | 148 | 148 / 148 at both sizes | yes (0 differ; 0 near a limit) | 2.8 × 10⁻¹⁵ | 2.0 × 10⁻¹⁰ (a lot net near $0) | `research/gpu-phase7/results/scaling/scaling-D24.json` (sha256 `450e0193…`) |
| D21 | 148 | 148 / 148 | yes | 1.5 × 10⁻¹⁵ | 3.8 × 10⁻¹² | `…/scaling-D21.json` (`6bd4fb0d…`) |

Example — New L0 on D24: $100,000: net $382,721.46, DD $19,459.83, trade PL (liq.) $8,092.81, banked DD (liq.) $10,383.82; at
$250,000 every figure × 2.5 within 9.3 × 10⁻¹⁶ relative, both policies pass at both sizes.

## What scales and why (the model)

- Shares = C0 ÷ entry fill (fractional), principal = C0, interest = principal × 11 % × days ÷ 365, costs in bps, partial
  sales by fraction: every dollar amount is homogeneous of degree 1 in C0, so marked DD, trade PL and banked DD scale
  exactly with C0 in real arithmetic, and their ratios to C0 are invariant.
- Decisions are scale-free: the D1 net-profit trailing-stop policy (q × level − p − I > 0) and every other rule compare
  quantities of the same degree; the virtual books are budget-independent; funding grants the whole slot.
- **Nonlinearities found: none in the model.** Floating-point: rounding of multiplications by 2.5 and 5 (≤ 3 × 10⁻¹⁵ of C0;
  relative errors of differences near zero are larger but immaterial). A decision could flip only for a value within one
  ulp of its limit (none occurred; the check would report it).
- **Not proportional (outside this model, reported only):** whole shares (refused by the qualification module), market
  impact and liquidity at larger sizes, account margin requirements (concentration rates), taxes — none is modelled.

## Limits of the official path

The accepted GPU path evaluates at the fixed $100,000 budget only (`EvalOptions` has no budget; the encoder takes the
budget from `poolOptionsOf`, which sets none). The pilot's $250k/$500k checks are therefore CPU diagnostics of frozen
selections (allowed: non-official, nonbinding). An official search at another C0 would need a new evaluation option, its
CUDA encoding and a full acceptance cycle.

## Proposed pilot use

Replay the pilot's frozen primaries (both arms, both selectors, both cutoffs) and New L0 / N/original at $250,000 and
$500,000 on their training doors and next slices; report the envelope in dollars and as % of C0, the decisions, and the
deviations; no selection or ranking uses them.
