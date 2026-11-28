# Storage cleanup 2026-11-21 — Phase 1 (H1–H6) and lossless compression of Z1–Z3

**Scope:** the user's brief "Storage Cleanup: High-Confidence Removal + Selected Lossless Compression"
(2026-11-21), executed on Apollo on branch `cleanup/storage-2026-11-21`. The starting proposal is the audit
`docs/storage-audit/2026-11-21/` (commit `87e456a0`).
**Outcome:** both authorized parts are complete, every item verified, nothing skipped. **322.03 GiB was recovered,
measured net of every retained rollback file.** No engine, acceptance, protocol, sealed record, `.gitignore`,
Strategy Lab state or Git history was changed. The risk-envelope pilot remains **NOT STARTED**.

## 1. Executive summary

| Measure (allocated blocks) | Before (17:08Z) | After (19:05Z) | Change |
|---|---:|---:|---:|
| Repository (`du -x -s`) | 602,784,608,256 B = **561.39 GiB** | 257,008,529,408 B = **239.36 GiB** | **−322.03 GiB** |
| Filesystem free (`df`) | 308,514,660,352 B = 287.33 GiB (70 % used) | 654,289,121,280 B = 609.35 GiB (37 % used) | +322.03 GiB |
| `.cache/` | 345 GiB (audit) | 66.14 GiB (includes the 5.80 GiB quarantine) | |
| `research/` | 204 GiB (audit) | 159.79 GiB | |

The free-space gain (`df`) and the repository reduction (`du`) agree to the byte: 345,776,078,848 B.

| Part | Items | Raw removed | Kept for rollback | Net recovered |
|---|---|---:|---:|---:|
| Phase 1 H1–H6 (quarantine bundle, then removal) | 6 groups, 2,382 files | 60.37 GiB | 5.80 GiB (`.cache/storage-cleanup-2026-11-21/quarantine/H*.tar.zst`) | **54.57 GiB** |
| Z1–Z3 (lossless zstd, `.zst` beside each original) | 78 databases | 287.70 GiB | 20.23 GiB (`archive.sqlite.zst`) | **267.47 GiB** |
| **Total** | | **348.07 GiB** | **26.03 GiB** | **322.03 GiB** |

The quarantine bundles stay until at least **2026-12-21**. Deleting them later, a manual decision needing your
authorization, would free another 5.80 GiB. The `.zst` files are permanent: they are now the archives.

## 2. Completed groups

### Phase 1: removed after a verified quarantine bundle

| ID | What (exact paths in `DRY_RUN_MANIFEST.json`) | Files | Raw | Bundle | Net |
|---|---|---:|---:|---:|---:|
| H1 | `research/gpu-phase3/cache/replay/{s2-a3-w4-b8192, s2-a3-w8-b8192, s2-a3-w12-b8192, s2-a3-w8-b16384, p2-a3-r1, p2-a3-r2, p2-a2-r1, p2-mini-r1..3, dev-a-mini, dev-b-mini, smoke-a2, smoke-mini}`, the 14 runs of audit §C.1 (the directory held exactly these 14 plus the protected `final-*`) | 58 | 42.39 GiB | 2.74 GiB | 39.65 GiB |
| H2 | All 276 `.cache/<study>/jobs/pilot-*` job directories of 17 completed studies | 1,498 | 7.62 GiB | 0.56 GiB | 7.06 GiB |
| H3 | `.cache/growth-etf-screening/doors` (61 ETFs × 4 prefix doors) | 244 | 8.09 GiB | 1.91 GiB | 6.18 GiB |
| H4 | `.cache/vg-balanced-entry-eligibility/doors`, `.cache/growth140-vgt-stable/doors` | 16 | 0.41 GiB | 0.10 GiB | 0.31 GiB |
| H5 | `research/gpu-phase4/cache/{pool,sustained,barrier,staged,strategy-lab-scratch}`, `research/gpu-phase3/cache/{strategy-lab-scratch,staged}`, `research/gpu-phase6/cache/{strategy-lab-scratch,barriers}`, the old Phase 1 exports in `research/gpu-phase1-feasibility/cache` (directory kept) | 222 | 1.71 GiB | 0.42 GiB | 1.29 GiB |
| H6 | `.cache/growth-vgt-study8` | 344 | 0.14 GiB | 0.07 GiB | 0.07 GiB |

### Z1–Z3: compressed in place

| ID | Root | Databases | Raw | `.zst` | Ratio | Net |
|---|---|---:|---:|---:|---:|---:|
| Z1 | `.cache/vg-l0-risk-families/jobs/{search,qualify}-*` (Assignment 2) | 24 | 147.95 GiB | 9.64 GiB | 6.5 % | 138.31 GiB |
| Z2 | `.cache/vg-l0-full-joint/jobs/{search,qualify}-*` (Assignment 3) | 23 | 83.92 GiB | 6.35 GiB | 7.6 % | 77.56 GiB |
| Z3 | `.cache/vg-l0-shadow-eligibility/jobs/{search,qualify}-*` | 31 | 55.83 GiB | 4.23 GiB | 7.6 % | 51.60 GiB |

Only `archive.sqlite` was compressed. Every other file in these job directories is untouched, and so is everything
else under the three roots: `folds/` (including the walk-forward-pinned `folds/study/*-closes.json`), `lot-rows/`,
`lanes/`, `progress.json*`, `runs.jsonl`, the `fold-*` jobs, and the 15 Assignment 3 `-wal` (0 bytes) / `-shm`
sidecars.

## 3. How safety was established

- **Before anything changed**, a full baseline was recorded (VERIFY.md §1):
  - verifier VERIFIED with a reproducible rebuild, the device and the out-of-repository pin `3610caaf…`;
  - Phase 6 integrity 5/5 (20,888 tracked research files, 22 study preflights, seal-protection counts, forward freeze,
    GPU digests);
  - GPU fixture parity 328/328, identical to Phase 6's sealed S3 run;
  - Strategy Lab portfolio parity ALL VERIFIED;
  - Vitest 314/314, Playwright 81/81 against a scratch build;
  - `npm test` 1,723 tests with the 7 known failures;
  - Assignment 3's risk-metrics Stage 4 scan reproducing its sealed record.
- **Re-verification of the audit** (`tools/manifest.py` → `DRY_RUN_MANIFEST.json`, generated 17:25:38Z):
  - every target enumerated as an exact path (2,382 H files with sha256, mode, mtime_ns; 78 Z databases with SQLite
    header, WAL/SHM/journal state and job-end record);
  - checked against a protected-prefix list (brief §4 and audit §D), every study's `seals.jsonl` (the 46 sealed
    Priority 2/3 pilot files included), the acceptance record's evidence and the Phase 5 seal-protection rows;
  - no symlinks, no hard links, nothing modified after the audit;
  - code-reference greps (`verify/pre/dependency-greps.txt`) found no reader of any H target. The hits are comments,
    door builders that recreate missing doors, and pilot commands that refuse to run after a freeze. The only reader of
    Z archives is `tools/vg-l0-risk-metrics/exclusions.ts`, which reads Assignment 3's search archives.
- **One new finding**, handled conservatively: `npm test` (`src/gpu-phase1/tests/gpu.test.ts`) writes, and then
  removes, temporary `unit-test*` exports in `research/gpu-phase1-feasibility/cache`. The directory was kept and only
  the old Phase 1 export files were removed.
- **Phase 1 removal** (`tools/quarantine.py`):
  1. Re-check every entry against the dry run (type, size, mtime_ns) and lsof.
  2. Write a `tar --zstd` bundle from the exact list (`--no-recursion`, POSIX format, relative names).
  3. Verify the bundle: `zstd -t`, then a streamed read of every member against the manifest (name, size, sha256,
     mode, mtime).
  4. Remove each file only after re-checking its lstat; remove directories with `rmdir` only, never recursively.
  5. After each group, integrity 5/5 and the verifier VERIFIED (`verify/post/*-after-H*`).
- **Z compression** (`tools/zcompress.py`, one database at a time). For each database:
  1. Check that the job is complete: the last `runs.jsonl` event is `job-end` and the progress stage is `done`.
  2. Check WAL mode with an empty or absent WAL and no journal; check that nothing has the file open.
  3. Run `PRAGMA quick_check` through a read-only immutable URI, which creates or changes nothing. The `points` row
     count equals the job's archived count for all 78 databases.
  4. Take the sha256 in the same single read that feeds `zstd -3`.
  5. Run `zstd -t`, then a streamed decompression whose sha256 and byte count must equal the original's.
  6. Give the `.zst` the original's mode and mtime.
  7. Re-check the source unchanged and unopened, then remove only `archive.sqlite`.
- **Restore tests:**
  - One representative per study was restored into an isolated scratch directory: sha256 equal, full
    `PRAGMA integrity_check` ok, row count, mode and mtime. This covered Z1 `search-C19-base` (2,196,920 rows), Z3
    `search-C19-B1` (1,666,266 rows) and Z2 `search-C19-broad1` (1,242,714 rows).
  - **Z2 in place:** all 14 Assignment 3 search archives were restored to their original paths (all identical). The
    risk-metrics Stage 4 scan then reproduced, per cutoff, the same lanes, 0 reason mismatches and DD-excluded counts
    17,626 / 56,929 / 96,742 / 105,484 as the pre-cleanup scan and the sealed `exclusions-scan.json`. The restored
    copies were then removed again.
  - **H6 in place:** restored to its original location, 344/344 files verified, removed again (ROLLBACK.md).
  - **Fail-closed lookup:** a read-only open of a compressed job is refused and creates nothing.
- **After everything:** the full baseline was repeated (VERIFY.md §2).

## 4. Disclosures

- The scan of Assignment 3's archives (run once before and once after the cleanup, as the brief asked) opens the WAL-mode
  databases with `node:sqlite` read-only. Each run updates the **mtime** of the 12 scanned jobs' `-shm` index files;
  their contents stayed byte-identical (`verify/{pre,post}/z2-sidecars-*.txt`). The Assignment 3 Stage 4 run of
  2026-11-18 had created these sidecars in the first place.
- The first checkpoint entry carried an estimated time ("17:40Z"). It was corrected from the clock in the next update.
- The live official preflight (`tools/gpu-backend/official-preflight.ts`) was **not** run. It appends to the
  preflighted study's tracked `results/doors.jsonl` and allocates a job in that study's namespace, which would change
  a completed study's tracked records. Its components were covered instead:
  - acceptance and binary: the verifier, with rebuild and device;
  - pinned tree and digests: integrity;
  - the device and the GPU host path: the non-official fixture parity mini-set. It ran on an already-exported fixture
    (no door log and no new dataset file) and was identical to Phase 6's sealed result.
  None of the files removed or compressed is read by the official gate.
- The quarantine bundles live on the same disk as the repository, inside the git-ignored work root. They protect
  against a wrong deletion, not against disk failure.
- Three scratch Strategy Lab builds and the empty restore-test directories are in
  `.cache/storage-cleanup-2026-11-21/scratch/`, all ignored. The working Strategy Lab `dist` and `state` were
  fingerprinted before and after and are unchanged.

## 5. Remaining exclusions (untouched, as the brief required)

- **Not authorized here, and so left alone:**
  - Phase 2a C1–C7: Phase 3 `final-*` replays, Phase 4 replays, Phase 2 mini-opt, the older qualification copies,
    raw-large dumps, the growth140 SQLite copies, the Study 9 pool-discovery cache.
  - Z4–Z8: GPU Phase 5/6 archives, 3B jobs, the Study 9B cache, Study 7 and the smaller caches, among them
    `.cache/vg-l0-session-hold`, `c4-gdx-growth-partner` and `vgt-d1-growth-joint`.
  - Phase 3 of the proposal.
- **Protected (brief §4):**
  - The accepted GPU record and its evidence; `gb5` and the earlier build directories; the CUDA toolkit and the
    out-of-repository pins.
  - `.cache/gpu-backend`; the Phase 6 job namespaces, datasets, locks and owner/complete files; Phase 3 `captures/`
    and the Phase 3/4 dataset sidecars.
  - Priority 3's doors, folds, sealed `pilot/` and C24 archives; Priority 2's sealed `pilot/` and doors; all L0
    `folds/` and `lot-rows/`.
  - The 5B search archives; the 3B/4A pinned jobs.
  - `data/` (including `BTCUSDT` and the vintages), `state/`, `apps/`, `evaluations/` and `node_modules`.
  - `.git`.

## 6. Records in this directory

| File | Content |
|---|---|
| `DRY_RUN_MANIFEST.json` | the pre-execution inventory of every target (paths, sizes, hashes, checks, protected prefixes) |
| `ACTIONS.jsonl` | append-only per-item outcomes (171 records: bundle-verified/removed per H group; z-verified, z-restore-test, z-removed per database) |
| `ARCHIVE_MANIFEST.json` | per quarantine group and per compressed database: hashes, sizes, modes, mtimes, sidecars, exact restore commands |
| `summary.json` | the measured totals computed from ACTIONS.jsonl |
| `VERIFY.md` | pre/post verification results |
| `ROLLBACK.md` | the exact restore commands and the tested restorations |
| `WORK_RECOVERY.md` | the checkpoint |
| `tools/` | the scripts used: manifest, quarantine, zcompress, z-chain, after-group, sl-check, post-suite, build-records, verify-restore, verify-z-restore |
| `verify/pre/`, `verify/post/` | raw outputs of every check |
