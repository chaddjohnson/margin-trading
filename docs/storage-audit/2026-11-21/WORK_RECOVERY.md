# Storage audit 2026-11-21 — recovery checkpoint

**Status: COMPLETE** (proposal delivered; awaiting the user's review). Updated 2026-11-21T15:53Z (UTC).

- Task: read-only storage audit and cleanup PROPOSAL (user brief, 2026-11-21). No deletion, move, compression,
  permission change, cache clearing, git gc, job or optimization was performed or is authorised.
- Branch `audit/storage-2026-11-21` (created from `research/gpu-phase2` = `main` = `3606f4b3`); only this
  directory is committed. Single worktree. Node 24.21.0. No evaluation processes were running during the audit.

## Deliverables
| File | sha256 (prefix) |
|---|---|
| REPORT.md | 1bc64e23e8f9d6d0… |
| inventory.json | 0fccd95ac7d17fd6… |

## Stages
| Stage | Status |
|---|---|
| 1 Inventory (du -x, hard links, symlinks, git tracked/ignored, .git) | complete |
| 2 Dependency investigation (L0 caches, GPU-phase caches, other caches/data; zstd ratio samples to stdout) | complete |
| 3 REPORT.md + inventory.json | complete |
| 4 Commit + push of this directory | see the git log of the branch |

## Follow-up gate
Any cleanup (Phase 1, 2a, 2b, 3 in REPORT §E) needs a separate, explicit authorization by the user. Open questions
for the user: PROPOSED_METHOD.md:47 "archived populations"; Study 9B cache retention; Study 9 Phase B closed?;
data/BTCUSDT origin; Phase 3/4 replay-only re-verification acceptable?

## Guards
Do not delete or modify anything outside this directory on the basis of this audit alone. Rerunning the read-only
inventory is harmless; measured sizes change as the repository is used.
