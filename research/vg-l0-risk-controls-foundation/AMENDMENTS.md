# AMENDMENTS — Assignment 1: New L0 risk-aware successor foundation

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect.

## A1 — 2026-11-13T23:12:32Z — G3's lookup of 5B's sealed C24 evidence (tool fix)

- **Change.** `tools/vg-l0-risk-controls-foundation/gates.ts` (stage `newl0`, G3 on D24) looked for 5B's sealed record
  of New L0 by its funded-lot ledger signature anywhere in `results/folds/C24/selection.json`. That signature is shared
  by the member's stress records (10 bps cost, 14% interest, +25 bps stop slippage), which have the same lots at
  different prices, so the check compared the D24 record with them too and failed. The lookup now takes only the
  member's `centre` record. No criterion, field list, tolerance, subject or door changes.
- **Why.** A tool error, not an engine difference: a read-only debug run (`evaluate` on D24, legacy, nothing written)
  showed `evidence[60].centre` equal in all 33 common fields and the three stress records differing only in their
  stressed figures, as they should.
- **Results existing at this time.** Sealed: protocol freeze, G0, demonstrations. The first `newl0` unit
  (2026-11-13T23:10Z) computed G1 (FULL) and G3's legacy parity on D19, D21, D23 and D24 and **passed them** before it
  stopped at this lookup; it sealed nothing (the stage seals only at the end). The stage is rerun in full, unchanged
  otherwise, after this amendment. No non-default control has run on real data.

## A2 — 2026-11-13T23:15:00Z — G5's causality check: a trade is "closed" only when it has no open remainder (tool fix; G5 rerun)

- **Change.** In `gates.ts` stage `invariants`, check (b) compared, between the D21 and D24 runs, the trades whose
  last fill lies inside D21. A Growth·VGT trade with a retention **partial** exit inside D21 and its final exit after
  it is open on D21 (one partial fill) and closed on D24 (two fills), so it entered only one of the two lists. The
  check now takes trades with no open remainder (`!open`) whose last fill lies inside D21. The stage takes
  `--rerun a2` and writes `results/gates/g5-invariants-a2.json`. No subject, seed, control draw or other check changes.
- **Why.** A tool error. The sealed first run (`results/gates/g5-invariants.json`, `6b128086…`, kept as the record
  of a failed gate) has 7 failures, all "causality G:VGT" (pairs #50, #56, #58, #69, #72, #88, #98). A read-only rerun
  of pairs #50, #56 and #58 showed exactly this pattern (retention ON: D21 fills `1181p` open, D24 `1181p, 1524f`).
  Growth·VGT is Priority 3's unchanged canonical book. Every D1 causality comparison passed, and so did every other
  check: the per-index causal prefix 395/395 (Growth included), determinism 120/120, accounting 3 × 120,
  independence 209/209, protective 3 × 935, disabled hold 737/737, adaptive hold 808/808, gate 3 × 123.
- **Results existing at this time.** Sealed: freeze, G0, demonstrations, G1–G3 (`b05b5c78…`), G4 (120/120 equal),
  the failed G5 record. Its content holds pass counts and hashes only (AD7). No outcome of a non-default control was
  read beyond pass/fail.

## A3 — 2026-11-13T23:16:48Z — G7's seal paths are repository-relative (tool fix; G7 rerun)

- **Change.** In `gates.ts` stage `frozen`, a `seals.jsonl` path that did not start with `research/` was re-prefixed
  with `research/<study>/`. Priority 3's ledger also seals its pilot records under `.cache/vg-d1-growth-joint/pilot/`
  (repository-relative), so those 22 entries were looked up at a wrong path and reported "bad". Paths are now used as
  recorded. The stage takes `--rerun a3` and writes `results/gates/g7-frozen-a3.json`.
- **Why.** A tool error. The sealed first run (`results/gates/g7-frozen.json`, kept) shows every preflight passing (14
  studies) and every committed sealed record verifying: 5B 28/28, shadow 90/90, walk-forward 10/10, session 27/27,
  Priority 3 21/21 research records. A read-only check of the 22 pilot entries at their real paths found 22 equal, 0
  differing, 0 missing.
- **Results existing at this time.** As A2, plus the passing G5 rerun (`f698f6be…`) and the first G7 record.

## A4 — 2026-11-13T23:21:52Z — synthetic tests added after the freeze (no engine change)

- **Change.** Seven synthetic tests were added after the freeze. They close two gaps found while mapping the brief's
  §3.1–§3.2 acceptance criteria to tests (`TEST_REPORT.md` §2). No engine file changed: `src/d1-risk-controls/`
  config/exit/book/run keep their frozen sha256.
  - `src/d1-risk-controls/tests/gate.test.ts` (5 tests): the decline gate's recovery boundary is inclusive, the
    cooldown ends exactly at maxBlockSessions, no re-anchoring, net exactly 0 counts as a failure, the profitable-exit
    reset, and one refusal event per session.
  - `exit.test.ts` (2 tests, "shortened sessions and boundary timestamps"): a buffered signal in the last minute of an
    early-close session is carried overnight; a protective gap then takes the next opening trade.
- **Results existing at this time.** Every gate record (G0–G7, demonstrations) is sealed. The full `npm test` ran
  before these tests existed (1,551 tests: 1,540 pass, 7 known pre-existing failures, 4 skipped). All 81 module tests
  pass afterwards. No real-data run is affected.
