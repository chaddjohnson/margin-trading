# Margin Trading repository — storage audit and cleanup proposal

**Scope:** read-only audit of `/home/chad/projects/margin-trading` on Apollo (2026-11-21, UTC; HEAD `3606f4b3`).
**Status:** proposal for the user's review. **Nothing was deleted, moved, compressed, truncated, re-permissioned
or reconfigured.** No job, test, verifier, preflight, build or `git gc` was run. The only new files are in this
directory (`REPORT.md`, `inventory.json`, `WORK_RECOVERY.md`).

Units: GiB/MiB of **allocated blocks** (`du -x`, `stat %b`), i.e. what deletion would actually return. The tree
has **no hard links** (every file has link count 1) and only 21 small symlinks (Strategy Lab `node_modules/.bin`
and one registry link), so nothing below is double-counted. Times are UTC unless marked otherwise.

---

## A. Executive summary

| Item | Size |
|---|---:|
| Repository on disk (`du -x .`) | **561 GiB** |
| Git-tracked files (23,433 files, allocated) | 3.0 GiB |
| `.git` (5 packs 983 MiB + 86 MiB loose; no garbage, nothing prune-packable) | 1.1 GiB |
| Git-ignored files (everything else) | **≈ 557 GiB (99.3 %)** |
| Untracked, not ignored | 0 files |
| Git LFS | not used (not installed, no `.gitattributes`) |
| Filesystem | 1007 G, 669 G used (70 %), 288 G free |

Largest areas: `.cache/` 345 GiB (the five New L0 / L0-family study archives alone are 300 GiB), `research/` 204 GiB
(GPU phases 2–6: 165 GiB of `cache/` plus 14 GiB of `results/raw-large/`), `data/` 11 GiB, `state/` 1.1 GiB.

**Main finding 1 — almost all large data is SQLite evaluation archives and GPU replay archives,** not sealed
evidence. No accepted GPU record, sealed study record or verifier needs them to *verify* (with the exceptions
listed in §D). They are memoization caches/full evaluation histories that a deterministic replay regenerates, at a
cost from minutes (GPU replays) to 28–44 CPU-hours per study (L0 searches).

**Main finding 2 — those archives compress about 15–18× losslessly.** Measured on real files (stdout only, nothing
written): a 9.4 GiB Assignment 2 search archive → 5.5 % (10 s with `zstd -3 -T12`); a 5.4 GiB GPU replay archive →
6.8 %; a 0.73 GiB pilot archive → 5.6 %; a JSONL point cache (study9-phase-b) → 21.8 %. Compression is
byte-exactly reversible, so every sha256 pin still verifies after decompression. That makes it possible to recover
most of the space **without losing any history**.

**Estimated recoverable space**

| Phase | What | Recovered | Cumulative |
|---|---|---:|---:|
| 1 | High-confidence removals (superseded GPU benchmark replays, pilot jobs, rebuildable door copies, obsolete Phase 1 exports, scratch) | **≈ 60 GiB** | 60 GiB |
| 2a | Conditional removals (superseded/unaccepted GPU replays, duplicate qualify archives, raw dumps, exported SQLite copies) | ≈ 80 GiB | 140 GiB |
| 2b | Conditional **lossless compression** of large completed-study archives (L0 families, accepted-phase replays, older study caches) | ≈ 340–355 GiB (estimate from samples) | **≈ 480–495 GiB** |
| 3 | Future, after the risk-envelope pilot and the next acceptance: optionally delete instead of compress, and handle vintages | up to ≈ 20–25 GiB more | — |

**Main risks and uncertainties**
1. `research/vg-l0-risk-metrics/PROPOSED_METHOD.md:47` ("G5-style parity of selectors on **archived populations**")
   may mean Assignment 3's (`.cache/vg-l0-full-joint`) search archives. **Ask before deleting them;** compression
   keeps them available.
2. Rebuilt SQLite archives will be *logically* identical (the committed `rowsSha256` digests prove that for GPU
   replays) but not byte-identical. Some later studies pin **byte** sha256s of specific archives (Priority 3 C24,
   3B, 4A). Those must never be deleted, only compressed if at all.
3. 46 pilot files under `.cache/vg-d1-growth-joint/pilot/` and `.cache/vgt-d1-growth-joint/pilot/` are listed in
   sealed `seals.jsonl` manifests. The Phase 6 integrity check (`tools/gpu-phase6/integrity.ts:74-80`) requires the
   seal-protection counts to equal their baseline exactly, so deleting them would make that check fail. **They are
   excluded from every proposal.**
4. Whatever opened `.cache/vg-l0-full-joint/jobs/qualify-C24-broad` on 2026-11-18 (it gained `-wal`/`-shm` files)
   was not identified in code. This is probably the risk-metrics Stage 4 session or an ad-hoc read; it is harmless,
   but it is evidence of recent use.
5. Your size list predates the latest work: `research/gpu-phase3/cache` is now **80 GiB** (not 33), and phases 4/5/6
   added another 70 GiB.

---

## B. Largest directories

Git status: **I** = git-ignored, **T** = tracked. "Last activity" = newest file mtime (UTC). No file in any of these
directories was open at audit time, and no `node` or evaluation process was running (15:40Z).

| Path | Size | Git | Purpose | Last activity | Recommendation |
|---|---:|---|---|---|---|
| `.cache/vg-l0-risk-families` (Assignment 2) | 148.7 G | I | SQLite evaluation archives of 16 search + 8 qualify jobs (30.8 M + 3.5 M evaluations), plus pilots and folds | 2026-11-15 | Pilots: delete (P1). Search/qualify: **compress** (P2b). Keep `folds/`, `lot-rows/`. |
| `.cache/vg-l0-full-joint` (Assignment 3) | 86.1 G | I | 14 search + 9 qualify archives (17.5 M + 1.6 M evaluations), read by risk-metrics Stage 4 | 2026-11-18 | Pilots: delete (P1). Search/qualify: **compress, do not delete** until you answer risk 1. |
| `research/gpu-phase3/cache` | 80.0 G | I | GPU replay archives (26 runs), captures, datasets | 2026-11-19 | Benchmark/pre-final replays: delete (P1). Final replays: conditional (P2a). Keep `captures/` and sidecars. |
| `.cache/vg-l0-shadow-eligibility` | 56.9 G | I | 15 search + 16 qualify archives (CPU-only feature) | 2026-11-13 | Pilots: delete. Search/qualify: compress. Keep `folds/study/` (pinned). |
| `research/gpu-phase4/cache` | 24.0 G | I | Replays on the **never-accepted** gb4 binary, pool/sustained copies | 2026-11-20 | Conditional delete (P2a). |
| `research/gpu-phase5/cache` | 23.8 G | I | Raw state behind the **accepted** Phase 5 evidence | 2026-11-21 | Compress (P2b). Keep `a3-qualify`. |
| `research/gpu-phase6/cache` | 21.8 G | I | Phase 6 campaign jobs (job-isolation tests), shared datasets | 2026-11-21 | Compress archives only (P2b). Keep `dataset/`, `shared-datasets/`, locks. |
| `research/study9-phase-b/results/cache` | 15.6 G | I | Point caches (sha256s sealed in `cache-manifest.json`) | 2026-11-03 | Retain. Compress only with explicit approval (code says "retained, never deleted as cleanup"). |
| `.cache/vg-d1-growth-expanded` (3B) | 13.4 G | I | 8 hash-pinned jobs + informed job + pilots | 2026-11-10 | Pilots: delete. Pinned jobs: retain, or compress. |
| `research/gpu-phase2/cache` | 13.2 G | I | Mini-optimization A3 archives (gb2), qualify, datasets | 2026-11-19 | Conditional delete (P2a). |
| `.cache/growth-etf-screening` | 10.5 G | I | `doors/` 8.1 G (exact byte-prefix copies of `data/`), jobs 2.3 G | 2026-11-11 | Doors: delete (P1). Jobs: compress. |
| `data/` | 10.7 G | I | Market data (live) + vintages + legacy test inputs | 2026-11-05 | **Do not remove** `data/<SYM>`, `archive/`. Vintages: retain (P3 option). |
| `research/gpu-phase3/results/raw-large` | 6.8 G | I | Record dumps; 1.33 G are reference maps for committed Phase 4/5 bench verifications | 2026-11-19 | Non-reference part: conditional (P2a). |
| `.cache/vg-d1-growth-joint` (Priority 3) | 5.0 G | I | Doors (in active use), **byte-pinned C24 archives**, sealed pilot files | 2026-11-10 | **Do not remove** doors, folds, C24 archives, `pilot/`. Pilot *jobs* only: delete. |
| `.cache/vg-lifecycle-matched-optimization` (5B) | 4.7 G | I | New L0's origin study; read by two parity gates | 2026-11-12 | Pilots + discarded job: delete. Search archives: **retain uncompressed**. |
| `research/study7-stability-first-d1/results/cache` | 4.4 G | I | Point caches ("local, regenerable", ≈16 CPU-h) | 2026-11-01 | Compress (P2b). |
| `.cache/vg-l0-session-hold` | 4.0 G | I | Session-hold study archives (code only on its branch) | 2026-11-12 | Pilots: delete. Search: compress. Keep `folds/study/`. |
| `.cache/c4-gdx-growth-partner` | 3.9 G | I | 3C archives, no downstream readers | 2026-11-10 | Pilots: delete. Jobs: compress. |
| `.cache/growth140-vgt-stable` | 3.7 G | I | SQLite jobs **already exported losslessly to tracked gzip JSONL** | 2026-11-07 | Pilots/logs: delete. SQLite: conditional delete (P2a). |
| `.cache/vgt-d1-growth-joint` (Priority 2) | 3.5 G | I | Jobs, doors, sealed pilot files | 2026-11-08 | Pilot jobs: delete. Keep `pilot/`, `doors/`. Jobs: compress. |
| `research/gpu-phase{4,5,6}/results/raw-large` | 1.9 G each | I | Record dumps; Phase 5/6 dumps feed committed evidence | 2026-11-21 | P4: conditional. P5/P6: retain. |
| `.cache/gdx-growth-standalone` (4A) | 1.8 G | I | 8 hash-pinned jobs + informed + pilots | 2026-11-10 | Pilots: delete. Pinned jobs: retain. |
| `research/study4-two-tier-d1-allocator/results/archive` | 1.7 G | I | Archives whose sha256s are in every sealed record | 2026-10-30 | Retain (or compress). |
| `.git` | 1.1 G | — | History, packs | 2026-11-21 | **No action** (see §G). |
| `state/strategy-lab` | 1.1 G | I | Strategy Lab live state; `preview-cache/` is self-capped | 2026-11-17 | **Do not remove.** |
| `research/study9-etf-pool-discovery/results/cache` | 1.1 G | I | Point cache, "kept until the user's Phase B decision" | 2026-11-02 | Conditional delete (Phase B has run). |
| `.cache/growth140-vgt-s8m` | 1.0 G | I | `jobs/search` exported to tracked archive | 2026-11-07 | Pilots: delete. SQLite: conditional. |
| `research/gpu-phase1-feasibility/cache` | 0.4 G | I | Obsolete `.gp1ds` exports | 2026-11-18 | Delete (P1). |
| `apps/strategy-lab` (`node_modules` 193 M, `dist` 3 M), root `node_modules` 102 M | 0.3 G | I | Live application and tooling | — | **Do not remove.** |
| `evaluations/` | 0.15 G | I | Older study runs, read by code and tests | 2026-11-07 | Retain. |

Outside the repository (for context only, not in scope for any cleanup):
- `~/.local/share/margin-trading-gpu` is 3.2 G: CUDA toolkit 2.2 G, venv 464 M, downloads 578 M, handoffs 22 M and
  acceptance pins 108 K. **Keep it.** It holds the out-of-band acceptance hashes and the toolchain needed for
  `--rebuild`.
- Docker has 717 MB of unused images and no volumes with data. The repository has no Docker or MongoDB dependency,
  so this is not related.

---

## C. Recommended cleanup candidates

"Regeneration" means a deterministic replay with the study's frozen code (at its own commit where its digest is
pinned), run under an explicit non-official purpose (`GPU_POLICY_PURPOSE=cpu-reference`) or through the GPU replay
tools where they exist. None of the outputs below is official optimization evidence by itself.

### C.1 High-confidence cleanup (Phase 1, ≈ 60.4 GiB)

**H1. Superseded Phase 3 benchmark and pre-final GPU replays: 42.4 GiB**
- Paths (in `research/gpu-phase3/cache/replay/`):
  - `s2-a3-w4-b8192`, `s2-a3-w8-b8192`, `s2-a3-w12-b8192` and `s2-a3-w8-b16384`: the host-worker/batch sweep,
    4 × 5.4 G.
  - `p2-a3-r1` and `p2-a3-r2` (5.4 G each), `p2-a2-r1` (9.4 G), and `p2-mini-r{1,2,3}`.
  - `dev-a-mini`, `dev-b-mini`, `smoke-a2` and `smoke-mini`.
- **Contents:** SQLite archives of A3 C19-broad1 / A2 C19-base replays made with the Phase 3 binary during
  benchmarking and before the final campaign.
- **Evidence:**
  - Their results and digests are committed. The A3 `rowsSha256 9c2d7108…` is the same in Phases 2–5 and in Phase 6's
    `results/jobs/c3-a3/archive-digest.json`.
  - `acceptance.json` lists 50 evidence paths. All are tracked files under `research/gpu-phase5/results/` and
    `research/gpu-phase6/results/`, and none is in `cache/` or `raw-large/`.
  - `verify-acceptance.sh` reads only the record, the pinned files, the evidence, git and `research/gpu-phase5/build/gb5`.
  - No code in `src/`, `tools/` or `config/` reads `research/gpu-phase3/cache/replay`. The grep hits are only Phase 3's
    own manifest description, `captures/` and dataset sidecars.
  - The Phase 3 acceptance record itself is superseded (Phase 5 `49e95d7a…`, then Phase 6 `3610caaf…`).
- **Dependencies checked:** acceptance record, verifier, `official.ts`, `jobs.ts`, `tools/gpu-phase{3,4,5,6}/*`,
  `npm test` (tests use temporary roots only).
- **Regeneration:** ≈ 10 min per A3 run and ≈ 12–18 min per A2 run on the current GPU binary. The exact Phase 3
  binary replays would need `research/gpu-phase3/build/` (12 MB, keep it).
- **Confidence:** high.
- **Verify before deletion:**
  1. Re-grep for `gpu-phase3/cache/replay`.
  2. Confirm no process has files open (`lsof +D research/gpu-phase3/cache/replay`).
  3. Confirm the committed compare JSONs exist for each run.

**H2. Pilot jobs across `.cache/*/jobs/pilot-*`: 7.6 GiB**
- Per study:

  | Study | Pilot jobs |
  |---|---:|
  | `vg-l0-full-joint` | 2.0 G |
  | `vg-d1-growth-expanded` | 790 M |
  | `vg-d1-growth-joint` | 776 M |
  | `vg-lifecycle-matched-optimization` | 649 M |
  | `vg-l0-risk-families` | 621 M |
  | `vgt-d1-growth-joint` | 597 M |
  | `c4-gdx-growth-partner` | 558 M |
  | `vg-l0-shadow-eligibility` | 476 M |
  | `gdx-growth-standalone` | 379 M |
  | `vg-l0-session-hold` | 357 M |
  | `growth140-vgt-stable` | 215 M |
  | `growth-etf-screening` | 132 M |
  | `growth140-vgt-s8m` | 130 M |
  | Smaller ones | about 55 M |

- **Contents:** pre-freeze calibration and dry-run archives.
- **Evidence:**
  - Every study is COMPLETE, and no `RESEARCH_RECOVERY.md` is INCOMPLETE.
  - No `seals.jsonl` lists any `jobs/pilot-*` path. The only `.cache` paths in seal manifests are the `pilot/`
    *directories* of Priorities 2 and 3, which are excluded here.
  - Pilot jobs are opened only by each study's own `pilot` commands, which refuse to run after the freeze.
  - `src/gdx-growth-standalone`'s archive manifest explicitly excludes pilots.
- **Regeneration:** minutes each (pilots are small budgets).
- **Confidence:** high.
- **Exclusions:**
  - Do **not** include `.cache/vg-d1-growth-joint/pilot/` or `.cache/vgt-d1-growth-joint/pilot/` (18 M, 46 sealed
    files).
  - Do not include `folds/pilot-*` directories: they are a few MB and add nothing.
- **Verify:**
  1. Re-run the seal-manifest grep, `grep -h '"file":".cache' research/*/results/seals.jsonl`, and confirm no hit
     under `jobs/pilot-`.
  2. List the exact directories to remove first, as a dry-run file.

**H3. ETF screening door copies `.cache/growth-etf-screening/doors/`: 8.1 GiB**
- **Contents:** 61 ETFs × D19/D21/D23/D24 prefix copies of `data/<SYM>/data.csv`.
- **Evidence:**
  - The copies are byte prefixes of the canonical data. I verified this for `IWM/D21.csv` with `cmp -n`, and the
    investigation verified all 61 sources against `results/doors/DOORS.json`.
  - No other study reads them.
  - The builder (`src/growth-etf-screening/doors.ts:69-98`) recreates missing doors in seconds.
- **Confidence:** high.
- **Verify:** recompute the sha256 of the 61 `data/<SYM>/data.csv` files against `DOORS.json`, so a rebuild is
  guaranteed to give identical doors.

**H4. Other rebuildable prefix doors: 0.41 GiB**
- Paths: `.cache/vg-balanced-entry-eligibility/doors` (303 M) and `.cache/growth140-vgt-stable/doors` (122 M).
- Same reasoning as H3.
- **Do not** include `.cache/vg-d1-growth-joint/doors`: it is read by every L0 study, the GPU path and the
  walk-forward tools.
- **Do not** include `.cache/vgt-d1-growth-joint/doors`: `vgt-d1-growth-separate-pooled` replays use it.

**H5. GPU scratch, unaccepted-phase dataset copies and obsolete exports: 1.8 GiB**
- `research/gpu-phase4/cache/{pool,sustained,barrier,staged,strategy-lab-scratch}`: 1.33 G of gb4-era per-job
  dataset copies and minis; gb4 was never accepted.
- `research/gpu-phase1-feasibility/cache`: 386 M of obsolete `.gp1ds` exports. Phase 1 "completed… never searched";
  only `src/gpu-phase1/context.ts:19` refers to it.
- `research/gpu-phase{3,6}/cache/strategy-lab-scratch` and `barriers`: 7 M of build scratch.
- **Confidence:** high.
- **Keep** the top-level `*.gb2ds.json` sidecars in phases 3 and 4. `tools/gpu-phase5/dataset-identity.ts:4` reads
  them, and they are the source of accepted evidence item 26.

**H6. Reverted attempt `.cache/growth-vgt-study8`: 144 MiB**
- **Contents:** output of an attempt whose code was reverted in `7c7bcab0`.
- **Evidence:** no code reads it; its OOM failure is documented in `research/growth140-vgt-s8m/PROTOCOL.md:90`.
- **Confidence:** high. Keep it only if you value it as forensics.

**H7. Leftover SQLite side files and `.prev` checkpoints: under 1 MiB**
- 22 empty `-wal` files, 22 `-shm` files of 32 KB, and 163 `progress.json.prev` files.
- Not worth an action on their own. Remove them only together with their parent archive.

### C.2 Conditional cleanup (Phase 2a, ≈ 80 GiB)

**C1. Phase 3 final replays except the CPU replay: 30.6 GiB**
- Paths: `research/gpu-phase3/cache/replay/final-a3-r{1,2}`, `final-a2-r{1,2}` and `final-mini*`.
- **Why removable:** they are the raw state behind the Phase 3 acceptance, which is now superseded twice. The digests
  and compare records are committed.
- **Condition:** you accept that the Phase 3 acceptance campaign can only be re-verified by replay, not by re-reading
  its archives.
- **Keep `final-a3-cpu`** (5.4 G). It is the most expensive to regenerate (96.7 min of CPU). Compress it in Phase 2b.
- **Confidence:** medium–high.

**C2. Phase 4 replays: 21.2 GiB**
- Path: `research/gpu-phase4/cache/replay`.
- **Why removable:** these are gb4 replays and gb4 was never accepted. The ROADMAP's G4 row says "acceptance renewal
  pending… no merge", and Phase 5 found the root cause and re-accepted.
- **Condition:** confirm that no Phase 4 finding is still open for review. The ROADMAP marks it complete.
- **Confidence:** medium–high.

**C3. Phase 2 mini-optimization archives: 11.8 GiB**
- Path: `research/gpu-phase2/cache/mini-opt`.
- **Contents:** two full A3 C19-broad1 archives (5.5 G each) and 144 M of G7 minis. The g7 and g7p runs used older
  hashing.
- Results are committed. An exact gb2 replay needs `research/gpu-phase2/build/`, which should be kept.
- **Confidence:** medium–high.

**C4. Duplicate A3 qualification archives in phases 2, 3 and 4: 3.2 GiB**
- Paths: `research/gpu-phase{2,3,4}/cache/a3-qualify`.
- **Evidence:** all four phases (2–5) have identical byte sizes and the same committed digests.
- **Keep the Phase 5 copy.** Accepted evidence item 14 rests on it.
- **Verify:** compare the sha256 of the four `archive.sqlite` files (4 × 1.1 G, about 1 min) before deleting the three
  older ones.

**C5. Raw record dumps not used as references: 8.4 GiB**
- Paths:
  - `research/gpu-phase2/results/raw-large` (1.0 G). Only `tools/gpu-phase2/mini-opt-compare.ts` read it, and its
    output is committed.
  - `research/gpu-phase3/results/raw-large/optimizer/{s2-*,p2-*,final-a3-r*,final-a2-r2,dev-b-mini,final-mini-*}`
    (5.5 G).
  - `research/gpu-phase4/results/raw-large` (1.9 G).
- **Keep** `research/gpu-phase3/results/raw-large/optimizer/{final-a3-cpu,final-mini,final-a2-r1}` (1.33 G).
  Committed Phase 4/5 `results/bench/*/verify.json` files name them as `map` references.
- **Verify:** grep every committed `verify.json` and compare tool for `raw-large` paths and keep each one named.

**C6. SQLite copies already exported to tracked archives: 4.0 GiB**
- Paths:
  - `.cache/growth140-vgt-stable/jobs/*` except pilots (3.2 G). They are exported losslessly to the tracked
    `research/growth140-vgt-stable/results/archive/` (35 files), whose `MANIFEST.json` records each `sqliteSha256`.
  - `.cache/growth140-vgt-s8m/jobs/search` (799 M). It is exported to the tracked
    `research/growth140-vgt-s8m/results/archive/`. `src/growth140-vgt-stable/audit.ts:38-48` hash-checks it *only if
    present*.
- **Verify:** stream-count the rows in each exported shard against the SQLite `points` count.
- **Alternative:** compress instead of deleting.
- **Confidence:** medium–high.

**C7. Study 9 ETF pool-discovery point cache: 1.1 GiB**
- Path: `research/study9-etf-pool-discovery/results/cache`.
- **Why removable:** `PROTOCOL.md:684` says "kept until the user's Phase B decision. Deleting it changes no sealed
  result", and Phase B has since been run.
- **Condition:** confirm that Phase B is closed. The protocol makes this your decision.
- **Confidence:** medium.

### C.3 Conditional lossless compression (Phase 2b, ≈ 340–355 GiB estimated)

**Procedure for each archive:**
1. `zstd -3 -T12 archive.sqlite -o archive.sqlite.zst`.
2. `zstd -t` on the result.
3. Check that the sha256 of `zstd -dc archive.sqlite.zst` equals the sha256 of the original.
4. Record both hashes in a manifest.
5. Only then remove the original.

Restoring is `zstd -d`. Every byte pin (study manifests, `SOURCE_MANIFEST.json`, `cache-manifest.json`) then verifies
again. Throughput measured here was about 1 GB/s per archive.

Any code that opens a compressed archive fails closed with "file not found". It cannot silently start a fresh job,
because every listed study is complete and its runners refuse reruns. Decompress before any replay or audit.

| Candidate | Current | Expected after | Saved | Notes |
|---|---:|---:|---:|---|
| `.cache/vg-l0-risk-families/jobs/{search,qualify}-*` | 148.0 G | ≈ 8.2 G | ≈ 140 G | Rebuild otherwise ≈ 31 CPU-h; GPU replay covers only base jobs |
| `.cache/vg-l0-full-joint/jobs/{search,qualify}-*` | 83.9 G | ≈ 4.6 G | ≈ 79 G | Keeps risk-metrics Stage 4 (`tools/vg-l0-risk-metrics/exclusions.ts:27`) re-auditable after decompression |
| `.cache/vg-l0-shadow-eligibility/jobs/{search,qualify}-*` | 55.9 G | ≈ 3.1 G | ≈ 53 G | CPU-only feature (`FEATURE_MATRIX.md:84`); rebuild ≈ 28 CPU-h |
| `research/gpu-phase6/cache/jobs/*/archive.sqlite` | 21.4 G | ≈ 1.5 G | ≈ 20 G | Keep `dataset/`, `shared-datasets/`, `job.lock`, `owner.json`, `complete.json` uncompressed (`tools/gpu-phase6/campaign-verify.ts:55-103`). Do not use `gpu-jobs remove-cache`: it also deletes `dataset/` and appends to tracked `events.jsonl` |
| `research/gpu-phase5/cache/replay` | 21.1 G | ≈ 1.4 G | ≈ 20 G | Raw state behind the accepted evidence (11–18) |
| `.cache/vg-d1-growth-expanded/jobs/*` (non-pilot) | 12.5 G | ≈ 0.7 G | ≈ 12 G | 8 jobs byte-pinned by optimization-process-audit; compression preserves the pins |
| `research/study9-phase-b/results/cache` | 15.6 G | ≈ 3.4 G | ≈ 12 G | JSONL, ratio 0.22. **Needs explicit approval:** `src/study9-phase-b/context.ts:58` says "retained, never deleted as cleanup" |
| `research/study7-stability-first-d1/results/cache` | 4.4 G | ≈ 1 G | ≈ 3.4 G | Ratio assumed similar to JSONL; not measured |
| `.cache/vg-l0-session-hold/jobs/{search,qualify}-*`, `c4-gdx-growth-partner`, `vgt-d1-growth-joint`, `growth-etf-screening/jobs`, `gdx-growth-standalone/search-C24-informed`, `research/gpu-phase3/cache/replay/final-a3-cpu`, `study4…/results/archive` | ≈ 19 G | ≈ 1.5–3 G | ≈ 16 G | Smaller completed-study archives |

The totals are estimates: three SQLite samples (ratios 0.055–0.068) and one JSONL sample (0.218) were extrapolated.
Before committing to the plan, a cleanup assignment should measure every file (`zstd -c | wc -c`, which writes
nothing).

**Deliberately excluded from compression (keep as plain files):**
- The 5B search archives, which two completed studies' parity gates read.
- The Priority 3 C24 archives, whose sha256 is re-verified at `src/vg-growth-funding-lifecycle/stages.ts:120` and
  `src/vg-d1-growth-diagnostic/context.ts:39`.
- The 4A pinned jobs (1.3 G).
- `research/gpu-phase5/cache/a3-qualify`.
- Everything in §D.

---

## D. Files and directories to retain

**Do not remove: required to run, verify or operate**

| Path | Size | Why |
|---|---:|---|
| `config/gpu-backend/acceptance.json` + its 50 tracked evidence files | small | The ACCEPTED record (`3610caaf…`) |
| `research/gpu-phase5/build/gb5` (ignored) | 13 M | The accepted binary `f444c521…`; read by the verifier and the runtime (`toolchain.ts:15`) |
| `research/gpu-phase{2,3,4}/build/` | ≈ 37 M | Earlier binaries; the only way to reproduce earlier-phase replays exactly |
| `~/.local/share/margin-trading-gpu/` (outside repo) | 3.2 G | CUDA toolkit for `--rebuild`, the out-of-band acceptance pins, handoff bundles |
| `.cache/gpu-backend/datasets` | 75 M | Shared dataset cache of the live official preflight (`tools/gpu-backend/official-preflight.ts:44`) |
| `research/gpu-phase6/cache/shared-datasets`, `jobs/*/dataset/`, `job.lock`, `owner.json`, `complete.json` | ≈ 0.4 G | Needed by `tools/gpu-phase6/campaign-verify.ts` (evidence 28) and by the job-ownership model (README §4c) |
| `research/gpu-phase3/cache/captures` | 209 M | Input to `tools/gpu-phase{4,5}/offline-check.ts` (evidence 6); not regenerable without gb2 and the same batches |
| `research/gpu-phase{3,4}/cache/*.gb2ds.json` sidecars (and their `.gb2ds`) | ≈ 0.6 G | Read by `tools/gpu-phase5/dataset-identity.ts` (evidence 26) |
| `research/gpu-phase3/results/raw-large/optimizer/{final-a3-cpu,final-mini,final-a2-r1}` | 1.33 G | `map` references of committed bench verifications |
| `research/gpu-phase5/results/raw-large`, `research/gpu-phase6/results/raw-large/jobs` | 3.8 G | Inputs of the compare tools that produced accepted evidence 34–42; retain until the next acceptance supersedes them |
| `research/gpu-phase5/cache/{a3-qualify,identity,sustained,pool}` | 2.3 G | Raw state behind accepted evidence 14, 20, 21, 27 (small; compress at most) |
| `.cache/vg-d1-growth-joint/{doors,folds,pilot}` and its C24 archives (`search-C24-{indep,gpair,informed}`, `qualify-C24`, `qualify-gpair-C24`) | ≈ 1.9 G | Doors are used by all L0 studies and the GPU path; the C24 archives are **byte-pinned** by two later studies; `pilot/` holds 22 sealed files |
| `.cache/vgt-d1-growth-joint/{pilot,doors}` | ≈ 0.13 G | 21 sealed files + 3 already absent (counts frozen in the Phase 6 integrity baseline); doors used by `vgt-d1-growth-separate-pooled` |
| `.cache/vg-l0-*/folds/` (especially `folds/study/C{19,21,23}-closes.json`), `lot-rows/`, `fold-*` jobs | ≈ 1.3 G | The walk-forward diagnostic pins the closes files by hash (`research/vg-l0-walk-forward-diagnostic/results/gates/gates.json:248-256`) |
| `.cache/vg-lifecycle-matched-optimization/jobs/search-*` | 3.3 G | New L0's origin (`docs/research/methods/NEW_L0_METHOD.md:371`); read by `src/vg-l0-shadow-eligibility/parity.ts:72,283-290` and the session-hold parity gate |
| `.cache/vg-d1-growth-expanded` 8 pinned jobs + `folds/study`; `.cache/gdx-growth-standalone` 8 pinned jobs; `.cache/optimization-process-audit/scan` | ≈ 14 G | sha256 in `research/optimization-process-audit/SOURCE_MANIFEST.json` / `protocol-freeze.json` and 4A's archive manifest |
| `.cache/phenotype`, `.cache/frozen-sources` | 1.3 M | Used by code and `npm test` (`src/phenotype/tests/registry.test.ts:44`, `src/lib/frozenSource.ts:249`) |
| `data/<SYM>/data.csv` (67 symbols) | ≈ 4.1 G | Canonical market data for everything, including Strategy Lab (`server/prices.ts:210`) |
| `data/archive/legacy-research-inputs` | 526 M | Used by `npm test` (`docs/canonical-dataset-migration.md:128-141`) |
| `data/stooq`, `data/trailing-buy-entry`, `data/vintages/study9-refresh-2026-11-02` | ≈ 41 M | Inputs/increments with provenance |
| `state/strategy-lab` (incl. `preview-cache/` 1.1 G) | 1.1 G | Live state. The preview cache is self-capped (2,048 MB / 200 entries, `apps/strategy-lab/server/config.ts:183-191`); trim only via the server |
| `apps/strategy-lab/{node_modules,dist}`, root `node_modules` | 0.3 G | Live application and tooling |
| `evaluations/` | 153 M | Read by `src/portfolio-aware-d1/controls.ts:214` and two tests |
| All tracked research records, `.git` | 4.1 G | Sealed results and history |

**Retain for now: valuable for near-term research**
- `.cache/vg-l0-full-joint/jobs/search-*` (82.7 G raw). Assignment 3 is New L0's risk-aware successor lineage, the
  risk-metrics Stage 4 reads it, and `PROPOSED_METHOD.md:47` may intend to reuse it. Compression is fine; deletion
  should wait until the risk-envelope pilot's protocol is frozen and states what it reuses.
- `research/study9-phase-b/results/cache` (15.6 G). An explicit retention statement in code; compress only with your
  approval.
- `data/vintages/{pre-study9-2026-11-02,study9-train-2024}` (6.3 G). Every file is an exact byte prefix of today's
  `data/<SYM>/data.csv` (all 125 checked with `cmp -n`), so they could be rebuilt with `head -c <bytes>`. But Study 9
  doors and `DATA_MANIFEST.md` reference them, and a future append to `data/` changes nothing about them. Phase 3
  option: compress, or write a rebuild script first.
- `research/study4-two-tier-d1-allocator/results/archive` (1.7 G, its `superseded/` included). Every sealed record
  lists its sha256.

**Needs investigation**
- `data/BTCUSDT` (431 M, 2026-10-20). It is in a different format and outside the partition layout. No code reads it
  and the ETF universe excludes it (`src/growth-etf-screening/universe.ts:328`). Its origin and value are unknown, and
  it cannot be rebuilt without re-downloading. Ask before touching it.
- `PROPOSED_METHOD.md:47` ("archived populations"): your answer decides whether Assignment 3's archives may ever be
  deleted, as opposed to compressed.
- The unidentified reader of `.cache/vg-l0-full-joint/jobs/qualify-C24-broad` on 2026-11-18.
- `~/.local/share/margin-trading-gpu/downloads` (578 M, outside the repo). Probably the installer downloads for the
  toolkit. Keep it unless you confirm that rebuild reproducibility does not need the original installers.

---

## E. Proposed cleanup order

Each phase should be a separately authorized assignment that first writes a **dry-run manifest** (exact paths,
sizes, sha256 where a pin exists), then executes it, then runs the §F checks.

1. **Phase 1, high-confidence and low-risk: ≈ 60.4 GiB, cumulative ≈ 60 GiB (disk use 70 % → ≈ 60 %).**
   - H1: Phase 3 benchmark and pre-final replays, 42.4 G.
   - H2: `jobs/pilot-*`, 7.6 G.
   - H3 + H4: rebuildable doors, 8.5 G.
   - H5: GPU scratch, Phase 1 exports and the Phase 4 pool/sustained copies, 1.8 G.
   - H6: `growth-vgt-study8`, 0.14 G.
   - Recommended form: **compress-then-delete quarantine**. Write `tar --zstd` bundles of each group to a dated
     quarantine directory, plus a manifest of member sha256s, so the net recovery is about 55 GiB. Keep them for 30
     days, then delete. Moving files within the same filesystem frees nothing, so a rename-only quarantine is useful
     only as a soak test.
2. **Phase 2, conditional on the §C conditions and your answers.**
   - **2a, removals: ≈ 80 GiB, cumulative ≈ 140 GiB.** C1 30.6 G, C2 21.2 G, C3 11.8 G, C4 3.2 G, C5 8.4 G, C6 4.0 G
     and C7 1.1 G. The same quarantine form applies; replay archives compress to about 6–7 %.
   - **2b, lossless compression: ≈ 340–355 GiB, cumulative ≈ 480–495 GiB (disk use ≈ 70 % → ≈ 18–20 %).** Order the work
     by size: Assignment 2 (≈ 140 G), Assignment 3 (≈ 79 G), shadow-eligibility (≈ 53 G), Phase 6 jobs and Phase 5
     replays (≈ 40 G), 3B (≈ 12 G), Study 9B only if approved (≈ 12 G), then the small ones. 2b alone recovers the
     most space at the lowest risk to reproducibility. If you want space quickly with no deletion at all, run 2b
     before 2a.
3. **Phase 3, after the risk-envelope pilot and the next GPU acceptance.**
   - Decide per study whether the compressed L0 archives are worth keeping at all. Deleting them would free another
     ≈ 15 G.
   - Once a newer acceptance supersedes Phase 5/6, re-classify their raw state: `research/gpu-phase5/cache` and
     `raw-large`, and `research/gpu-phase6/cache/jobs` and `raw-large`. That is about 6–8 G after compression.
   - `data/vintages`: compress (≈ 6 G → about 1 G), or replace with a verified `head -c` rebuild script.
   - `.cache/vg-d1-growth-expanded` informed job, `growth-etf-screening/jobs`, and similar: delete if never revisited.

---

## F. Verification and rollback plan (for a later, authorized cleanup)

**Before any action**
1. Confirm that nothing is running:
   - `ps -eo pid,uunit,args | grep -E '[n]ode|[g]b5'`
   - `systemctl --user list-units --state=running`
   - `lsof +D <target>` for each target
   - the Phase 6 job locks: no `job.lock` held. Use `src/gpu-jobs/cli.ts` read-only listing, never `remove-cache`.
2. Record a baseline in the cleanup's `WORK_RECOVERY.md`:
   - `git status --short` (expected clean) and HEAD
   - `tools/gpu-backend/verify-acceptance.sh` (expected VERIFIED)
   - `npm run research-preflight` for the active study set (22 PASS at the Phase 6 baseline)
   - `node --no-maglev … tools/gpu-phase5/seal-protect.ts --check`, with the counts recorded (`sealedFiles 1052`,
     `absent 11`, `untrackedOrModified 43` as recorded in `research/gpu-phase5/results/seals/apply.json`)
   - the walk-forward `folds/study` hashes against `gates.json:248-256`
3. Write the dry-run manifest: path, bytes, mtime, sha256 for any pinned file, classification and condition.

**After each phase**

| Check | Expected result |
|---|---|
| GPU optimization works | `npm run research-preflight` live gate OPEN with a held job (as in Phase 6), and `verify-acceptance.sh` VERIFIED. For a functional test without official status, use a fixed-seed mini job in a scratch job namespace under `GPU_POLICY_PURPOSE=benchmark`, equal to its committed digest |
| CPU/GPU parity | A small parity mini-set (`docs/gpu/PARITY_CHECKLIST.md`), 0 mismatches. Nothing in Phase 1/2 touches the evaluation manifest, so the acceptance must stay ACCEPTED, not STALE |
| Strategy Lab | The server starts from `dist` with `--no-maglev`. The five pooled candidates replay to their archived figures, and the Playwright suite passes (re-run the whole suite before suspecting the known timing races) |
| Research preflight | Same PASS list as the baseline |
| Seal integrity | `seal-protect.ts --check` counts identical to the baseline, and `tools/gpu-phase6/integrity.ts` 5/5 |
| Historical reproducibility | `npm test`: only the 7 known failures. Each study's `verify` (seals) passes. For compressed archives, decompress one sample per study, check its sha256 against the manifest, and run that study's read-only audit (e.g. risk-metrics `exclusions.ts` on a decompressed copy) |
| Active jobs and checkpoints | No `RESEARCH_RECOVERY.md` changes state; the `job.lock`/`owner.json` files in Phase 6 jobs are untouched |

**Rollback**
- **Quarantined bundles:** `tar --zstd -xf <bundle> -C <repo>`, then verify the member sha256s against the manifest.
- **Compressed archives:** `zstd -d --rm archive.sqlite.zst`, then verify the sha256 against the manifest.
- **Anything deleted outright:** restore by the regeneration procedure in §C (replay at the study's commit with its
  frozen seeds, labelled as a regeneration). This is the reason for preferring quarantine or compression for
  anything costing over an hour.

---

## G. Long-term storage recommendations (proposals only; nothing implemented)

1. **Write archives compressed, or compress them at study close.** A study's final checkpoint step would
   `zstd`-compress its `jobs/*/archive.sqlite` files and record the sha256s in its manifest. This alone would have
   kept `.cache` under about 30 G.
2. **Pilots in a separate root.** For example `.cache/<study>/pilot-jobs/`, swept automatically when the study is
   frozen, with the frozen protocol stating that pilots are disposable. Never seal pilot outputs into `seals.jsonl`;
   that is what makes Priority 2/3's pilot files undeletable today.
3. **Benchmark replays get a time-to-live.** GPU engineering phases should keep only the final campaign's raw state,
   and should write `s2-*`/`p2-*` sweeps to a scratch root with a documented deletion point (for example at the
   phase's acceptance).
4. **Doors on demand.** Prefix doors are free to rebuild. Builders could verify `data/` hashes and rebuild into a
   shared, size-capped door cache instead of a copy per study (8.5 G now).
5. **A `storage-report` command** with `--dry-run` by default. It would list every cache root with size, newest
   mtime, owning study, study status, pin status (byte-pinned / logically pinned / unpinned) and an A–E class, and
   flag roots over a threshold (for example 10 G) or untouched for 30 days. A non-dry-run mode would only ever act on
   a reviewed manifest.
6. **Disk monitoring.** A warning in `research-preflight` (or a user systemd timer) when the filesystem is more than
   80 % used or `.cache` grows past a budget. Large official runs (Assignment-3 scale writes about 80 G of archives)
   should check free space before they start.
7. **Leave `.git` alone for now.** It is 1.1 G with no garbage. A future `git gc` might consolidate the 5 packs for a
   few hundred MB at most, which is not worth the risk while seals and acceptance pin Git revisions.

---

## Concise summary

- **Safely recoverable:** about **60 GiB** now with high confidence (Phase 1). About **140 GiB** after the conditional
  removals (Phase 2a). About **480–495 GiB** if the large completed-study archives are also losslessly compressed
  (Phase 2b), with no loss of history.
- **Clean first:** Phase 3's benchmark and pre-final GPU replays (42 G), every `jobs/pilot-*` (7.6 G), and the ETF
  screening door copies (8.1 G).
- **Leave untouched:**
  - The accepted GPU record, its evidence and `gb5`.
  - The CUDA toolkit and acceptance pins in `~/.local/share`.
  - `.cache/gpu-backend`, Phase 6 datasets, locks and job records.
  - Phase 3 `captures/` and the dataset sidecars.
  - All of `.cache/vg-d1-growth-joint`'s doors, C24 archives and sealed `pilot/`, and Priority 2's sealed `pilot/`.
  - The L0 `folds/`, the 5B search archives, and the 3B/4A pinned jobs.
  - `data/`, `state/`, `apps/`, `evaluations/` and `.git`.
- **Needs your explicit approval or more verification:**
  - Every Phase 2a item.
  - All compression, especially Study 9B, which carries an in-code retention statement.
  - Anything in `.cache/vg-l0-full-joint`: first answer whether the risk-envelope pilot reuses "archived populations".
  - `data/BTCUSDT`.
  - Whether earlier-phase GPU acceptances need to stay re-verifiable from raw state rather than by replay.
