# RESEARCH RECOVERY — Priority 5A (brought forward): Growth funding lifecycle and fixed portfolio combinations

## Top screen

- **Updated:** 2026-11-09T16:00Z (UTC, from the clock). **Status: INCOMPLETE** — pre-freeze engineering (stage 0): code and synthetic tests written; engineering pilots next.
- **Task:** `brief/BRIEF.md` (sha256 `26be1bceb44c28bf4cfee1cd902365e3fa287bd4d20ed65099f26635bbf970e3`, 236 lines,
  read in full including §11). Bounded fixed-arm comparison (L0/L1/L2 Growth refusal lifecycles) on unchanged
  phenotypes, matched neighbourhoods, standalone neighbourhood assessment. No search. No Strategy Lab, no broker.
- **Branch:** `research/vg-growth-funding-lifecycle` in the main checkout, from `927cd0ab` (end of Priority 3A).
- **Authority:** the brief; the protocol is not written yet (no freeze, no substantive result exists).
- **Running processes:** none.
- **Next step:** engineering pilots (`npm run vg-life -- launch --unit vgflc-pilot-ref --wait -- pilot ref`, then the
  graceful / worker-kill / unit-kill resumption tests), then PROTOCOL.md, STANDARD_ADOPTION.json, preflight, manifest,
  freeze, commit; then stages V → C → N → S → P → (commit, full-manifest, commit) → F.

## Done so far (pre-freeze, no L1/L2 performance figure has been viewed)

- Standard **2.0.0** written and registered (§7.7 [M] no-visuals reporting; sha256 `2005a88c…40105`); template §5/§15,
  `CLAUDE.md` reporting preference, preflight test (17/17 pass; 3A passes with a retained-pin 1.1.0 notice).
- Code `src/vg-growth-funding-lifecycle/`: `lifecycle.ts` (copied orchestrator + LifecycleBook + L2 retained state;
  diff against canonical = only the 7 LIFECYCLE insertions), `growthBook.ts`, `coupled.ts` (fixed point over unchanged
  runPool), `evaluate.ts`, `subjects.ts` (43 subjects), `instruments.ts`, `jobs.ts`/`worker.ts`, `stages.ts`,
  `verdicts.ts`, `manifest.ts`, `main.ts`, `pilot.ts`; `npm run vg-life`.
- Tests: `tests/lifecycle.test.ts` 23/23 (synthetic).
- Engineering on D24 so far: A, B, GP4 L0 parity (book + sealed centre: equal) and L1/L2 request/round counts only.
- Known prior figure seen: E's L0 development centre = A's sealed removal record 'without G:VGT' (Priority 3).

## Design decisions so far (pre-freeze, from code audit only; no performance result seen)

- Canonical capacity hook `GateRuntime.capacity` (src/growth-trading/entryGates.ts `check`): checked FIRST (before the
  trend filter, drawdown gate and initial-stop availability); a block of a crossing with eligibility OFF vetoes it
  (consumed); a block of a continuation trigger ends the episode (consumed); a block of an eligibility opportunity
  leaves it ARMED and re-evaluated at every later bar (an automatic funding retry = L2-like). So the hook does not match
  L1 for eligibility books and asks before the other gates. Not reused; a study-local adapter is used instead.
- Adapter: a study-local copy of `simulateTrading` (orchestrator only) whose ShadowBook is a subclass that consults a
  funding oracle at `commit` (every Growth request: base crossing, latched/renewal/release, continuation). A refused
  request: the decision-time transitions stay canonical (the opportunity is consumed, a renewal watch cancelled, an open
  continuation episode closed by base priority / a triggered episode ended), but no order or position is created; the
  D1 machine inside the book is cleared as under D1's cancel semantics. L2 adds one retained base opportunity.
- Coupling: fixed-point iteration over the unchanged Priority 3 `runPool` (refused requests and L2 waiting
  reassessments are fed as unfillable decisions; each must receive the oracle's answer). The earliest mismatch is fixed
  each iteration; the consistent fixed point equals the online simulation (by induction on time).
- Canonical engine files are NOT modified (frozen studies' digests cover them).
