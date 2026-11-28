# Repository and archive restoration report (deliverable F)

## 1. Post-cleanup Git revisions (verified 2026-11-21T19:49Z; `git ls-remote origin` at 20:36Z)

| Ref | Local | origin | Note |
|---|---|---|---|
| `main` | `3606f4b3` | `3606f4b3` | GPU Phase 6 merge + its handoff bundle |
| `research/gpu-phase2` (checked out at session start) | `3606f4b3` | — | = `main` (Phase 6 fast-forwarded it) |
| `audit/storage-2026-11-21` | `87e456a0` | `87e456a0` | the read-only storage audit (docs) |
| `cleanup/storage-2026-11-21` | `d89b9dec` | `d89b9dec` | the cleanup's records, rollback and verification (docs only, 86 files under `docs/storage-cleanup/2026-11-21/`); **2 commits ahead of `main`, not merged** |
| `research/gpu-phase7-risk-envelope-readiness` | from `d89b9dec` | pushed at completion | this task |

Worktrees: one (the main checkout). No optimization job, GPU job or chain was running at the start (`ps`, `systemctl --user`).

## 2. What the cleanup changed and did not change (verified against this assignment's needs)

| Item | Finding | Evidence |
|---|---|---|
| Commit / branch identity | `main` unchanged; cleanup records on their own branch (pushed); this branch builds on them | §1 |
| GPU acceptance dependencies | unchanged: every pinned evaluation and enforcement file hashes to the Phase 6 record | `results/baseline/verify-acceptance-baseline.txt` (VERIFIED, 19 PASS lines) |
| GPU source / binary hashes | binary `gb5` `f444c521…` unchanged; reproducible rebuild from the pinned sources = it | same |
| Dataset caches / data | `data/GDX`, `data/VGT` = Priority 3's pins; D19–D24 prefix doors = pins and canonical prefixes | Phase A check (PROTOCOL §1) |
| Research archive availability | the 14 Assignment 3 search archives exist only as `archive.sqlite.zst` (Z2 of the cleanup; 9 qualification archives likewise); sidecars and lane files untouched | `.cache/vg-l0-full-joint/jobs/*/` |
| Sealed records | 1,053 sealed files, 999 protected, 0 writable, 0 differing — identical to Phase 6's baseline | `results/baseline/seals-check.json` |
| Study preflights | 22 studies PASS, as at Phase 6's baseline | `results/baseline/preflights.txt` |
| Official launch paths / build dependencies | unchanged (`officialRunner.ts`, `official.ts`, toolchain, CUDA 13.2 user-space toolkit, Node v24.21.0) | verifier, Phase A |

## 3. Compressed archives inspected

The cleanup's `ARCHIVE_MANIFEST.json` (in commit `d89b9dec`, 78 compressed databases) lists for each archive the
original's sha256, size, mode, mtime, the `.zst` sha256 and size, the `points` row count and the restore command. The
14 Assignment 3 **search** archives (`search-C{19,21,23,24}-{broad1,broad2,refine}`, `search-C24-informed{1,2}`) were
inspected in the manifest; only those this assignment needs were restored.

## 4. Archives temporarily restored (and why only these)

| Archive | Why needed | Restored to (git-ignored scratch, read-only 0444) |
|---|---|---|
| `search-C21-broad1` | C21 threshold-edge engineering subjects (archived DD near $35k/$40k) and the sealed-archive reproduction check of the risk-delivery parity on D21 | `research/gpu-phase7/cache/restore/search-C21-broad1.sqlite` |
| `search-C24-broad1` | the same for C24 on D24 | `research/gpu-phase7/cache/restore/search-C24-broad1.sqlite` |

Not restored: the other 12 search archives, the 9 Assignment 3 qualification archives, every Assignment 2 and shadow
archive — the sealed-replay checks compare against sealed **JSON** records (`results/search/**.json`,
`FROZEN_SELECTION.json`), not archives, and the pilot reads no archive.

## 5. Hash and SQLite verification (`tools/gpu-phase7/restore-archives.py` → `results/restore/restore-record.json`)

| Check (each archive) | search-C21-broad1 | search-C24-broad1 |
|---|---|---|
| original path holds no `archive.sqlite` before and after | PASS | PASS |
| `.zst` sha256 / size = manifest `zstSha256` / `zstBytes` | PASS | PASS |
| `zstd -d <.zst> -o <scratch>` exit 0 (the `.zst` is only read) | PASS | PASS |
| restored sha256 = manifest `sha256` (pre-compression original) | `99b5406d5f48…` PASS | `cec9aed96828…` PASS |
| restored size = manifest `bytes` | 5,949,161,472 PASS | 4,763,426,816 PASS |
| `PRAGMA integrity_check` (read-only immutable URI) | ok PASS | ok PASS |
| `points` rows = manifest `pointsRows` | 1,276,425 PASS | 1,013,181 PASS |
| `.zst` unchanged after (sha256, size, mode, mtime) | PASS | PASS |
| namespace binding (meta) | study vg-l0-full-joint, job search-C21-broad1, door D21, code digest `2aeeee42…` | … search-C24-broad1, D24 |

Use: read-only `SELECT`s through an immutable URI (`tools/gpu-phase7/edge-subjects.py`), which creates no sidecar. The
1,000 + 1,000 selected records were then reproduced **bit for bit** by the GPU's plain records through the EvalLab
(`risk-parity` R2 archive check: 1,000/1,000 per door) — an independent confirmation that the restored archives are
exact and that today's engine reproduces Assignment 3's evaluations.

## 6. Temporary storage

- Scratch restores: 10,712,588,288 B (9.98 GiB) in `research/gpu-phase7/cache/restore/` (git-ignored); filesystem free
  ≈ 609 GiB at the start. Build artefacts (`research/gpu-phase7/build/`, git-ignored): ≈ 15 MB. Job archives of the
  campaign (`research/gpu-phase7/cache/jobs/`, git-ignored): see the final checkpoint.
- Disposal: **done 2026-11-22T00:47:30Z** — both scratch copies deleted (they were copies; the `.zst` originals are the
  archives and were re-verified immediately before: sha256 `495a0bcf…` / `020d0b50…`, size, mode 0644 and mtime equal to
  the restore record). `research/gpu-phase7/cache/restore/` no longer exists. Re-creatable with
  `python3 -I tools/gpu-phase7/restore-archives.py search-C21-broad1 search-C24-broad1`.
- Disk after the task: filesystem free 624,348,323,840 B (≈ 581 GiB); this study's git-ignored state:
  `research/gpu-phase7/cache/` 27.6 GB (the campaign's and benchmark's job archives and dataset caches — kept as the
  evidence's backing state, never historical artefacts of other studies), `results/raw-large/` 2.2 GB (key maps), `build/`
  26 MB.

## 7. Preservation

The cleanup's compressed originals, quarantine bundles (`.cache/storage-cleanup-2026-11-21/quarantine/`, kept until at
least 2026-12-21), rollback records and verification records were not modified. No archive was restored into its original
location. No historical artifact was deleted or overwritten.

## 8. Final Git / working-tree status

Branch `research/gpu-phase7-risk-envelope-readiness`, working tree clean after the final commit, pushed to `origin`
(no force, `main` untouched); the final HEAD and the `git ls-remote` verification are in `RESEARCH_RECOVERY.md`'s final top
screen (they postdate this file's last commit).
