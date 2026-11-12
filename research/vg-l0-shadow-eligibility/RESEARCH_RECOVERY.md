# Research recovery checkpoint — New L0 shadow-position eligibility (vg-l0-shadow-eligibility)

## Top screen

- **Updated:** 2026-11-12T11:40Z (UTC, from the clock). **Status: INCOMPLETE — Phase 0 done; Phase 1 design and
  implementation starting. No study stage, search or data door has run.**
- **Task:** the user's brief "New L0 Shadow-Position Eligibility: Implementation and Comprehensive Optimization"
  (`brief/BRIEF.md`, 831 lines, sha256 `3547d5efee0e92f26977231b6425e869859369ec367efcb70ecf05d3f51e8ed3`, read in full
  to its final section "Overall Objective"; not truncated).
- **Branch:** `research/vg-l0-shadow-eligibility` (main checkout), created from `6eb85160` (NL0 1.0.0 + standard 2.1.0
  committed, **before** the experimental trading-session engine change `e3b0ae37`, so every historical engine keeps its
  original executable identity) + merge of `main` (`cb82958b`).
- **Authority (to be written):** `PROTOCOL.md` (not yet written), standard 2.1.0 (`ac5c2c69…`), reference method NL0 1.0.0
  (`9b387bb4…`).
- **Running processes:** none.
- **Next step:** finish the engine design (allocator-level shadow eligibility in a new study namespace, Priority 3's
  engine files untouched), implement, test, then Phase 0.3 control reproduction.

## Phase 0 (complete)

- **0.1 Documentation integration into `main`:** commit `2346a1b5` (parent `aa5754d4` = previous `main` =
  `origin/main` before the push; fast-forward, no merge of code) adds only `docs/research/{OPTIMIZATION_STANDARD.md,
  optimization-standard.versions.json, STUDY_PROTOCOL_TEMPLATE.md, templates/, methods/, ROADMAP.md}` and
  `research/vg-l0-session-hold/` (105 files, additions only) taken unchanged from `research/vg-l0-session-hold`
  `18674b39`. Hashes on main: NEW_L0_METHOD.md `9b387bb4…` and the standard `ac5c2c69…` (= registry). Not integrated:
  any `src/` change (the session-hold engine option `e3b0ae37`, the preflight tool whose tests read research-line
  studies). Built with a temporary index (no checkout of `main` in the working tree; the live Strategy Lab server
  `server/main.ts` PID 2277059 was not disturbed). Pushed 2026-11-12T11:36Z (outside the sandbox):
  `git ls-remote` → `main` = `docs/nl0-method-standard-integration` = `2346a1b589e881631c3ad54a487149f8e5a531e4`.
- Git state checked before: no extra worktrees; `origin/main` = `aa5754d4`, `origin/research/vg-l0-session-hold` =
  `18674b39` (= local); no later commits on either.
- **0.2 Historical integrity:** this branch does not contain `e3b0ae37`; Priority 3's engine files are unchanged here;
  the new feature lives in this study's own namespace (new files only).

## Disclosures

- (none yet)
