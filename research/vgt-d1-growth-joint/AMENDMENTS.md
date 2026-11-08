# AMENDMENTS — vgt-d1-growth-joint

Append-only. Each entry: ID, UTC time, what changed, why, whether any result existed, and its effect. Criteria are
never loosened here. Pre-freeze entries (R*) record changes made while the protocol was being written; post-freeze
entries (E* engineering, O* operational) follow the freeze.

## Pre-freeze (R)

- **R1 (2026-11-08T08:49Z, engine speed, no result existed).** After the pilot bench, the pooled replay gained a
  bit-exact fast path for a held session with no decision, fill or exit (`allocator.ts`: the regular minutes marked in
  a tight loop with the same per-lot expressions in the same order). The replay went from ≈ 17 ms to ≈ 5.6 ms on D24.
  The evaluation digest changed (`a9e7c186…` → `7281e003…`), so parity was re-sealed as `results/parity/parity-2.json`
  (sha256 `c82f2b8f…c387`, 341 checks, 0 failed); `results/parity/parity.json` (the first seal, same checks, 0 failed)
  is kept as history. The pilot ran on the earlier digest; its equality and interruption results concern the
  coordinator and resume logic, which did not change.
- **R2 (2026-11-08T08:52Z, budget sizing from the pilot, as §6.4 requires).** The drafted 1,024 new proposals per island
  (independent cells, informed islands, D1 alone) were set to 768 after the bench measured ≈ 90 evaluations/s on D24
  (≈ 5 h → ≈ 3.5–4.5 h). No search result existed.
- **R3 (engineering record).** Before the pilot, a debug dry run (`pilot dbg1`, in the tmux scope, not a unit) hit an
  engine guard: the next-open stop stress on a Growth book with optional rules (Growth's canonical optional exits
  assume stop-level fills). Fixed: a disabled family's book is not built, and next-open applies to Growth only where its
  engine supports it (recorded as not applicable otherwise). The dbg1 files were deleted; its two memory logs remain in
  `results/memory/`.
- **R4 (pilot coverage).** The frozen-selection and validation code paths were parameterized so the pilot could run
  them on development data only (pilot E: D24 with a 2023-12-29 boundary and a pilot frozen file). The study path is
  unchanged: FULL with the 2024-12-31 boundary, the committed `FROZEN_SELECTION.json` and the guard.

- **R5 (2026-11-08T08:52Z, formatting, no result existed).** One ESLint error fixed (`main.ts`: a `break` after
  `process.exit` in the `launch` case) and the study's code formatted with the repository's Prettier configuration.
  Formatting changed the bytes of evaluation files (digest `7281e003…` → `c936f691…`), so parity was re-sealed once
  more as `results/parity/parity-3.json` (sha256 `c61415c9…b336`, 341 checks, 0 failed). **`parity-3.json` is the
  parity record of the frozen code**; `parity.json` and `parity-2.json` are kept as history (all three: 0 failures).

## Post-freeze (E, O)

(none yet)
