# RESEARCH_RECOVERY — bounded optimization-process audit (archive reselection)

## Top screen

- **Updated:** 2026-11-10T23:23Z (UTC, from the clock). **Status: COMPLETE** — awaiting the user's review. Do not
  rerun any stage.
- **Result:** no demonstrated improvement (P1, P2, P3 all "no demonstrated improvement"); **futility stop** — the C24
  choices are frozen and committed, `stage4 validate` was not run, no FULL door opened.
- **Task:** the user's bounded optimization-process audit brief (`brief/BRIEF.md`, sha256
  `75842bfb3e0fa849cc298ed0da897c73bfe1daf289a1d75f9358adfc621062f1`, 147 lines, read in full to "Stop for review.").
- **Branch:** `research/optimization-process-audit` (main checkout), from `f52deea7`. The final commit and its push
  are recorded below once made.
- **Authority:** `PROTOCOL.md` (sha256 `e5f42a4e160b71b9…`) FROZEN by `results/protocol-freeze.json`
  (`a4b95fa3671da47a…`, commit `6933fbf5`); `AMENDMENTS.md` head **A3** (A1 G7 check bug, A2 POLICIES.md erratum,
  A3 futility stop recorded); `POLICIES.md` (`218335ec75ceda9c…`) frozen with `results/stage2/POLICY_FREEZE.json`.
- **Stages:** 0–3 complete; 4 — C24 freeze complete, validation **not run by rule** (futility).
- **Running processes:** none. **Next action:** none; the follow-up gate is the user's review of `REPORT.md` and
  `PROCESS_PROPOSAL.md` (nothing starts automatically; 4B and funding research deferred; Priority 6 pending).

## Audited deliverables (sha256 prefix, recomputed 2026-11-10T23:22Z)

| File | sha256 |
|---|---|
| REPORT.md | `29c055a27f993d9a` |
| PROCESS_PROPOSAL.md | `d6ac1db71d44451e` |
| POLICIES.md (frozen) | `218335ec75ceda9c` |
| PROTOCOL.md (frozen) | `e5f42a4e160b71b9` |
| AMENDMENTS.md | `41be051ff2669b5a` (before this checkpoint's commit) |
| results/stage1/inventory.json | `94c69898b40b1b38` |
| results/stage1/reproduction.json | `fcb4cc1562edcb2a` (G1–G6 pass; G7 check bug, A1) |
| results/stage1/g7-recheck.json | `98eaf312e7a62211` (0 failed) |
| results/stage1/mechanism.json | `7f4b2243d322553f` |
| results/stage2/POLICY_FREEZE.json | `3d24db3d9f1b0b53` |
| results/stage3/CHOICES.json | `84df484303132c79` |
| results/stage3/outcomes.json | `385c31430cdb6b6e` |
| results/stage3/analysis.json | `1e06826f4f358729` |
| results/stage4/C24_FREEZE.json | `7bb448dbc785371c` |
| SOURCE_MANIFEST.json | `e46fe8700b9fb9eb` |

`npm run opa -- verify` → 11 sealed records verify. Tables: `results/tables/*.md` (regenerate with
`tools/optimization-process-audit/tables.ts`).

## Environment

- Repository root `/home/chad/projects/margin-trading`; Node 24.21.0; runner `npm run opa -- <command>` (package.json).
- Subjects (read-only, unchanged): 3B `research/vg-d1-growth-expanded/` (19 sealed records verify), 4A
  `research/gdx-growth-standalone/` (20 verify); preflights PASS. Evaluation digests 3B `41bf69bf…`, 4A `74173d33…`.
- Standard 2.0.0 and its registry unchanged (sha256 `2005a88c…`); this study's preflight PASS.
- Data pins: GDX `77dba9b2…5049`, VGT `2ee06310…412e`. Archive pins in `results/protocol-freeze.json`.
- Local, git-ignored: `.cache/optimization-process-audit/` (scans, cohort job archives, pilot) and `results/logs/`.

## Compute and resources

- Fresh simulations 4,866 of 100,000; next-slice / full-history 618 of 800 (42 reproduction + 576 cohort); 0 new
  search proposals; archive scans 3,635,233 archive reads (hits, not fresh). Ledger `results/compute.jsonl`.
- Every stage ran in `opa.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0); peak unit memory 1.7 GiB; no OOM.
- Full `npm test` (unit `opa-npm-test`): 1,405 tests, 1,394 pass, 7 fail (the known pre-existing: intraday-study ×1,
  minute-optimizer ×1, study7-runners ×1, trailing-buy ×4), 4 skipped; this study added 16 passing tests.

## Guards (do not rerun)

- Every sealed stage record above; the cohort archives; the scans. Sealed records are never rewritten.
- FULL stays closed for this study (futility). A later validation of the frozen C24 choices would need the user's
  explicit decision and would be a new, labelled study step.
- Never write into the subject or context study directories.

## Disclosures

- A1: the first G7 check compared the sealed `"__-Inf"` encoding with `null`; failed record kept; recheck 0 failures.
- A2: POLICIES.md rationale ranges corrected by erratum (no formula affected).
- Two experimental choices coincide with published role holders whose outcomes were known (4A C19 P2, 4A C21 P1).
- 3B's blackout window here starts at the episode's first decision session (4A's convention), not 3B's first entry.
- The full test suite reads other studies' data files (their own regression tests); no audit candidate was evaluated.
