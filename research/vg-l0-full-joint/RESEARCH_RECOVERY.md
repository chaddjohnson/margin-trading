# RESEARCH_RECOVERY — Assignment 3: New L0 risk-aware successor, full joint optimization

## Top screen

- **Updated (UTC):** 2026-11-15T12:40Z (from `date -u`).
- **Status:** **INCOMPLETE.** Stage: **pre-freeze engineering** — implementation done and committed (`8b762e6e`); stage
  V dry runs pass (0 failed of 18,087); bench running; then the pilot, the calibration, the sealed stage V, the protocol
  freeze. **No search has run; no protocol is frozen.**
- **Authority:** brief `brief/BRIEF.md` sha256 `5620330a52e569f73e18d397cda1d7725f0275b2db464e2c67f7c322340ad9ba` (296
  lines, read in full); protocol `PROTOCOL.md` (DRAFT; becomes authoritative when `results/protocol-freeze.json` records
  its sha256); amendments: R1 (pre-freeze, stage V gate V3(b)); standard 2.2.0 `0085cff2…`; NL0 1.0.0 `9b387bb4…`.
- **Running processes:** the bench units `vgl0fj-bench-w10` … `w16` (sequential; harness task `bxta147tr`; outputs
  `.cache/vg-l0-full-joint/pilot/bench/w*.json`, logs `.cache/vg-l0-full-joint/logs/vgl0fj-bench-w*.log`).
- **Next step:** read the bench; run `research/vg-l0-full-joint/chains/pilot.sh` as a unit (straight pilot + interruption
  tests); then the study-fidelity calibration (`VGL0FJ_PILOT_BUDGET=study`) to size R_N (PROTOCOL §8.3) and record §8.4.

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree), branch `research/vg-l0-full-joint` from
  `73d3a74818ab97d0fe69b59b10bebf6ec2ba849d` (verified tip of `research/vg-l0-risk-families` = its remote; contains
  `main` = `108c241b`). Commits: `8b762e6e` pre-registration draft. Working tree: only this study's files and the
  `vg-l0fj` npm script.
- Node v24.21.0; host 16 logical CPUs, 59 GiB; slice `vgl0fj.slice` (44G/48G/swap 0), set by `npm run vg-l0fj -- launch`.

## Implementation (committed `8b762e6e`)

- `src/vg-l0-full-joint/`: context, nl0 (New L0, IJ1, C4, C4-refined from 5B's pinned FROZEN_SELECTION.json, identities
  checked), space (64 cells, 92-gene genome, masking, balanced strata, neighbourhoods, moves, projections), search (Track
  I broad/refine and Track N informed lanes), budgets (per-lane worst-case caps 41,000 / 110,000 / 114,000), informed
  (Track N seed grid), qualify, select (Assignment 2's selectors imported unchanged), stages, folds, final, parity (stage
  V), freeze, bench, lab/workers/worker/launch/records/doors (study-bound copies), main; re-exports of Assignment 2's
  evaluate.ts and fitness.ts.
- Tests (`src/vg-l0-full-joint/tests/`): gaps 24/24 (−10/−20/−30% gaps, halts, next-open), space 13/13, select 7/7
  (re-derives all 36 of Assignment 2's sealed primaries).
- Stage V dry runs (`.cache/vg-l0-full-joint/logs/vgl0fj-parity-dry{1,2,3}.log`): dry1 1 failed (provisional threshold),
  dry2 14 failed (incomplete fill fingerprint), dry3 **0 failed of 18,087** (AMENDMENTS R1).

## Guards

- Do not edit any earlier study's files; Assignment 1/2 sealed records stay as they are (stage V V8 verifies them).
- FULL opens only for New L0 under legacy defaults in stage V (AD3; dry runs included) and otherwise only after this
  study's `FROZEN_SELECTION.json` is sealed and committed.
- No merge into `main`, no deployment, no broker access. Push at completion (standing preference), unsandboxed with retries.

## Disclosures (so far)

- Engineering diagnostics on D24 (`.cache/vg-l0-full-joint/reach-diag*.ts`): counts only (which Growth genes change
  trades/logs); no performance figure read.
- Stage V dry runs opened FULL for New L0 under legacy defaults only (the AD3 exception), three times.
