# Research recovery checkpoint — New L0 shadow-position eligibility (vg-l0-shadow-eligibility)

## Top screen

- **Updated:** 2026-11-12T12:23Z (UTC, from the clock). **Status: INCOMPLETE — engine and pipeline implemented and
  tested; protocol drafted (not frozen); engineering pilot RUNNING. No study stage, search or FULL door has run.**
- **Task:** the user's brief "New L0 Shadow-Position Eligibility: Implementation and Comprehensive Optimization"
  (`brief/BRIEF.md`, 831 lines, sha256 `3547d5efee0e92f26977231b6425e869859369ec367efcb70ecf05d3f51e8ed3`, read in full
  to its final section "Overall Objective"; not truncated).
- **Branch:** `research/vg-l0-shadow-eligibility` (main checkout), from `6eb85160` (NL0 1.0.0 + standard 2.1.0, before
  the trading-session engine change `e3b0ae37`) + merge of `main` `2346a1b5` (`cb82958b`); engine commit `0b73570c`.
- **Authority:** `PROTOCOL.md` (draft; not frozen), `AMENDMENTS.md` (none), `STANDARD_ADOPTION.json` (standard 2.1.0
  `ac5c2c69…`, NL0 1.0.0 `9b387bb4…`; preflight PASS).
- **Running:** the pilot chain `bash research/vg-l0-shadow-eligibility/chains/pilot.sh` (harness background task
  `b0bnsktcv`), log `.cache/vg-l0-shadow-eligibility/logs/pilot-chain.log`, unit logs
  `.cache/vg-l0-shadow-eligibility/logs/vgl0se-pilot-*.log`; outputs `.cache/vg-l0-shadow-eligibility/pilot/`. Finished
  cleanly iff the chain log ends with "PILOT DONE". Resume: `bash …/pilot.sh <sNN>` (sealed pilot records refuse to rerun).
- **Next step:** after "PILOT DONE": `npm run vg-l0se -- control-manifest`; stage V
  (`npm run vg-l0se -- launch --unit vgl0se-parity --wait -- parity`); `readopt` if the protocol changed; commit; 
  `npm run vg-l0se -- freeze-protocol`; commit; then launch `bash research/vg-l0-shadow-eligibility/chains/chain1.sh`
  (≈ 50 h of compute).

## Phase 0 (complete)

- **0.1 Documentation integration into `main`:** commit `2346a1b5` (parent `aa5754d4` = previous `main` =
  `origin/main` before the push; fast-forward) adds only `docs/research/{OPTIMIZATION_STANDARD.md,
  optimization-standard.versions.json, STUDY_PROTOCOL_TEMPLATE.md, templates/, methods/, ROADMAP.md}` and
  `research/vg-l0-session-hold/` (105 files, additions only) taken unchanged from `research/vg-l0-session-hold`
  `18674b39`. Not integrated: any `src/` change (the session-hold engine option `e3b0ae37`; the preflight tool, whose tests
  read research-line studies). Built with a temporary index (no checkout of `main`; the live Strategy Lab server
  `server/main.ts`, PID 2277059, was not disturbed). Pushed 2026-11-12T11:36Z (outside the sandbox): `git ls-remote` →
  `main` = `docs/nl0-method-standard-integration` = `2346a1b589e881631c3ad54a487149f8e5a531e4`.
- **0.2 Historical integrity:** this branch does not contain `e3b0ae37`; Priority 3's evaluation digest here =
  `147cad7c17eff3fa…` = its historical sealed digest (checked 2026-11-12T12:0xZ); the new feature lives only in new files.
- **0.3 New L0 verified:** development $382,721.46 / DD $19,459.83 / 34 lots reproduced through this study's engine on D24
  (engineering smoke and stage V dry run); full-history figures ($479,605.18 / DD $20,385.99; validation $96,883.72 /
  reset DD $20,385.99; realized $485,169.93; unrealized −$5,564.76) verified from 5B `validation.json` (`83931139…`),
  the session-hold `validation.json` (`f474c421…`) and Strategy Lab parity (`59424ff9…`); reproduced through this engine
  at the validation stage (FULL stays closed until the frozen selection: PROTOCOL AD11).

## Engineering results so far (not sealed)

- Unit tests: `src/vg-l0-shadow-eligibility/tests/{allocator,position,study}.test.ts` — 32 pass.
- Stage V dry run (2026-11-12T12:08Z, unit `vgl0se-dryv1`, 102 s, 1,363 simulations): 730 checks, 0 failed (G1 9, G2 2
  incl. ≈ 1,000 archived 5B records identical through the new allocator, G3 48, G4 36, G5 540, G6 61, G7 2, G8 1, G9 5,
  G10 2, G11 24).
- Bench (D24, 96 centres × 17): 12 workers 90.4 ev/s (7.7 GiB), **14 → 92.8 ev/s** (149 ms/eval, 8.9 GiB), 16 → 92.3 ev/s;
  files `.cache/vg-l0-shadow-eligibility/pilot/bench/w*-strata.json`.
- Engineering smoke (D24, New L0 centres, disclosed in PROTOCOL §2): every D1-toggle combination far below all-OFF.

## Disclosures

- The New L0 × 8 combination centres on D24 were seen during engineering, before the protocol (PROTOCOL §2); no
  combination is excluded from any search.
