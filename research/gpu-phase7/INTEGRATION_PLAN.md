# Integration plan — how the Phase 7 change could reach `main` (NOT executed; needs the user's authorization)

## Branches and revisions (verified 2026-11-21)

| Ref | Commit | Content |
|---|---|---|
| `main` = `origin/main` = `research/gpu-phase2` = `research/gpu-phase6` | `3606f4b3` | GPU Phase 6 merged; record in force `3610caaf…` (ACCEPTED for main's tree) |
| `audit/storage-2026-11-21` | `87e456a0` | + the read-only storage audit (docs) |
| `cleanup/storage-2026-11-21` | `d89b9dec` | + the storage cleanup records (docs only: `docs/storage-cleanup/2026-11-21/`); **not merged into `main`** |
| `research/gpu-phase7-risk-envelope-readiness` | this branch (from `d89b9dec`) | + the risk-envelope delivery, `src/risk-envelope/`, the acceptance study, the new record (if ACCEPTED), the pilot proposal |

The cleanup commits change no file of the evaluation manifest or the enforcement group (verified: the Phase 6 verifier
VERIFIED on `d89b9dec`), so they did not affect the acceptance.

## The acceptance boundary

- On this branch, after the campaign, `config/gpu-backend/acceptance.json` is the **Phase 7 record** (binary gb7, source
  revision = this branch's acceptance commit). On `main` it stays the **Phase 6 record** (gb5) — valid for `main`'s tree.
- A merge of this branch into `main` carries both the code and its record; the record's source revision is then an
  ancestor of `main`'s HEAD (as it must be). A merge that took the code **without** the record would make `main`'s record
  STALE and block official runs (the merge gate in `npm test` would fail) — never do that.
- Separating "reusable backend" from "pilot-specific" content: the backend part is `src/gpu-backend/{pool,lab,toolchain,
  entrypoints}.ts`, `config/gpu-backend/{entrypoints,acceptance}.json`, `src/gpu-backend/tests/hostPipeline.test.ts`,
  `src/risk-envelope/` (policies are research **proposals** but harmless library code), `src/gpu-phase7/`,
  `tools/gpu-phase7/`, `research/gpu-phase7/`, the docs. The pilot-specific part is only
  `research/vg-l0-risk-envelope-pilot/` (documents, no code, no fitness or selection rule). **No experimental selection or
  fitness rule exists in code**, so nothing pilot-specific could reach `main`'s optimizer.

## Proposed sequence (after the user's approval; mirrors Phase 6's MERGE_AND_RESTORE)

1. Review this branch (the readiness package).
2. `git checkout main && git merge --no-ff research/gpu-phase7-risk-envelope-readiness` (brings the cleanup records too —
   decide whether they belong on `main`; they are docs only).
3. On `main`: `npm test` (merge gate 27/27 + the risk-envelope tests; 7 known failures only), the independent verifier
   `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 <Phase 7 record>`, the live official
   gate on a scratch study, the integrity check, Strategy Lab's suites.
4. Push `main` only with the user's explicit authorization (CLAUDE.md: never merge into `main` without it).
5. Fast-forward `research/gpu-phase2` (the checked-out working branch convention) if the user wants.

**Not done here:** no merge, no push to `main`, no force-push.
