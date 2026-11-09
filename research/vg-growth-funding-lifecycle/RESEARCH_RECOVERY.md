# RESEARCH RECOVERY — Priority 5A (brought forward): Growth funding lifecycle and fixed portfolio combinations

## Top screen

- **Updated:** 2026-11-09T16:18Z (UTC, from the clock). **Status: INCOMPLETE** — development stages V, C, N, S, P sealed
  (V PASSED); committing them, then the FULL manifest (seal + commit), then stage F.
- **Task:** `brief/BRIEF.md` (sha256 `26be1bce…70e3`, 236 lines, read in full). Bounded fixed-arm comparison (L0/L1/L2)
  on unchanged phenotypes. No search. No Strategy Lab, no broker.
- **Branch:** `research/vg-growth-funding-lifecycle` (main checkout), from `927cd0ab`; freeze commit `6b0ecf10`.
- **Authority:** `PROTOCOL.md` `5db1e08b…`; `STUDY_MANIFEST.json` `b37cf60c…5bbf`; `results/protocol-freeze.json`
  `c95a7709…c7bf`; amendments: none.
- **Sealed:** V `results/verification/verification.json` `4b88dff7eacc2c107f0ca725e87508bc011a57c4cb0f681f3d6b173c70918eb7`
  (PASSED, 353 dev sims); C `results/development/centres.json` `09afda78f6fa40fb18a43557e4e24a3bf7fe159c148cc6858b72b2c31785feb8`
  (130); N `results/development/neighbourhoods.json` `86d14f19876f942cd500071c380302ecb9e54f77dfb894e1fc3e2e2998b1e7ca`
  (12,160 fresh + 5,120 archived; all 24 archived families reproduce Priority 3's sealed statistics); S
  `results/development/standalone.json` `35f28d1851c1cec5872d414c3283423ebb513056324c32b48c69648ba05e7154` (1,920); P
  `results/development/verdicts.json` `3a16a387eb5de81f137d61389174ecbac22284665c759d7449380853368fe319` (R6: neither L1 nor
  L2 recommended for 3B; run 3B under L0 with protected both-symbol exploration). `npm run vg-life -- verify`: 7 ok.
- **Not started:** FULL manifest, F.
- **Running processes:** none.
- **Next commands:** commit; `npm run vg-life -- full-manifest`; commit; `npm run vg-life -- launch --unit vgflc-F --wait
  -- stage F`; tables; report; docs; full npm test (unit); commit; push.
- **Resume semantics:** each stage seals only at its end; an interrupted stage resumes from its job archive
  (`.cache/vg-growth-funding-lifecycle/jobs/<job>/results.jsonl`) when relaunched; a sealed stage refuses to rerun.

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
