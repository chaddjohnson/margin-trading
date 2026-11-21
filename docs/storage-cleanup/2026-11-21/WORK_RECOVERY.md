# Storage cleanup 2026-11-21 — recovery checkpoint

**Status: COMPLETE.** Updated 2026-11-21T19:15Z (UTC, from `date -u`).

- The brief: the user's "Storage Cleanup: High-Confidence Removal + Selected Lossless Compression" (2026-11-21). It
  builds on the audit `docs/storage-audit/2026-11-21/` (`87e456a0`).
- Done: Phase 1 H1–H6 (verified quarantine bundles, then removal) and Z1–Z3 (lossless zstd, verified, originals
  removed). Net recovered **322.03 GiB**: the repository went from 561.39 to 239.36 GiB, and free space from 287.33
  to 609.35 GiB.
- Not done, because the brief did not authorize it: C1–C7, Z4–Z8, Phase 3 and the risk-envelope pilot (NOT STARTED).
- Branch `cleanup/storage-2026-11-21`, created from `87e456a0`. The checkout is restored to `research/gpu-phase2`
  after the push. No worktree; no tracked file outside this directory was changed (the git index digest is identical).
- Work root (git-ignored): `.cache/storage-cleanup-2026-11-21/`.
  - `quarantine/`: H1–H6 bundles, 5.80 GiB. Keep until at least 2026-12-21; purging is a **manual decision that
    needs the user's authorization**.
  - `logs/`: npm-test and chain logs.
  - `scratch/`: scratch Strategy Lab builds and empty restore-test directories; disposable.

## Stages
| Stage | Status |
|---|---|
| 0 Recovery of the audit, refs, processes, disk | complete 17:08Z |
| 1 Pre-cleanup baselines | complete 17:25Z (VERIFY.md §1) |
| 2 Dry-run manifest + exclusions | complete: DRY_RUN_MANIFEST.json, 17:25:38Z |
| 3 Phase 1 H1–H6 | complete 17:27–17:29Z; integrity 5/5 + verifier after each group |
| 4 Z1–Z3 | complete 17:29–18:55Z: 78/78, 0 skips. Restore tests: 3 isolated, Z2 in place with scan, H6 in place |
| 5 Post verification | complete 19:14Z: all checks equal to baseline (VERIFY.md §3) |
| 6 Report, commit, push | this commit; push verified with `git ls-remote` (see the final report) |

## Deliverables
REPORT.md, DRY_RUN_MANIFEST.json, ACTIONS.jsonl (append-only), ARCHIVE_MANIFEST.json, summary.json, VERIFY.md,
ROLLBACK.md, tools/, verify/.

## Guards
- Do-not-rerun: H1–H6 and Z1–Z3 are complete; the tools skip anything ACTIONS.jsonl records as removed.
- Never delete the `archive.sqlite.zst` files: they are the archives now.
- Restore an archive (ROLLBACK.md §2) before any replay, audit or resume of Assignments 2 and 3 or of the
  shadow-eligibility study.
- Next gate, which needs the user: purge of the quarantine (after 2026-12-21), and any of C1–C7, Z4–Z8 or Phase 3.
