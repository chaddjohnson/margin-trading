# Storage preservation report — Priority 5's official job archives (brief §0A)

**Outcome: all 29 official Priority 5 GPU job archives were compressed losslessly, verified and restorable; only after every
check passed was each original (git-ignored cache) copy removed. 179.8 GB recovered. The other ≈ 22.6 GB of Priority 5
caches were audited read-only; nothing else was deleted.** No tracked Priority 5 file, seal, record, code or acceptance pin
was changed.

## 1. Scope and preconditions (recorded before any irreversible step)

| Item | Value |
|---|---|
| Study | `research/vg-l0-n-successor/` (Priority 5; sealed outcome `results/outcome.json` `75531dd7…`; branch `research/vg-l0-n-original-successor`, final commit `dc023c3b`, verified as this branch's base) |
| Manifest | `research/vg-l0-n-successor/reports/diagnostics/job-archives.sha256` (29 rows; sha256 of the manifest in `storage/INVENTORY.json`) |
| Inventory | `storage/INVENTORY.json` (2026-11-25T10:27:03Z, committed in `3be39b65` before the first removal): 29/29 present, sizes = manifest, every job complete (`results/jobs/<job>/complete.json` and a final `job-end` run event), SQLite journal mode `delete` (no -wal/-shm/-journal sidecars), no process holding any file (`lsof`), no Node / SQLite / zstd process running, 284 GB free |
| Tool | `storage/tools/p5zstd.py` (adapted from the verified 2026-11-21 cleanup tool `docs/storage-cleanup/2026-11-21/tools/zcompress.py`), driven by `storage/tools/chain.sh` in the contained systemd user unit `tsla-p5-zstd` |
| Compressor | `*** Zstandard CLI (64-bit) v1.5.7, by Yann Collet ***`, options `-3 -T8` (per file, `nice -n 10 ionice -c2 -n7`) |

## 2. Procedure (per archive, one at a time, restartable; every event in `storage/ACTIONS.jsonl`)

1. Re-check against the inventory: size, mtime, mode, single link, job complete, no sidecar, no opener.
2. One streaming read computes the original's sha256 **and** feeds `zstd` (into `archive.sqlite.zst.partial`, fsynced). The
   sha256 **must equal the Priority 5 manifest** (otherwise BLOCKER, original untouched).
3. `zstd -t`; then the **documented restore command** `zstd -d -q <zst> -o <isolated scratch>/archive.sqlite`; the restored
   copy's sha256 and bytes must equal the original's.
4. On the restored copy: full `PRAGMA integrity_check`; the exact schema (tables meta, points, configs, fits); row counts;
   meta identity (study, job; door, door pin, code digest and backend recorded); a **reproducibility smoke test**: every
   sealed `(id, net, dd)` triple that Priority 5's sealed records attribute to this job is looked up in the restored
   archive and must match exactly. The scratch copy is deleted.
5. The `.zst` takes the original's mode and mtime and is renamed into place (atomic; directory fsynced); the documented
   command is run again on the final `.zst` (sha256, bytes, mode, mtime equal). Record `z-verified`.
6. Re-check the original unchanged and unopened and the `.zst` unchanged; remove **only** `archive.sqlite`; record
   `z-removed` with its restore command.

**Every archive** (not only representatives) received the full restore test of steps 3–5: 29 isolated restores, 29 full
integrity checks, 41,610,787 `points` rows, 2,941,949 `configs` rows, and **10,495 sealed `(id, net, dd)` triples
reproduced exactly** from the restored archives.

## 3. Results

| Measure | Value |
|---|---|
| Archives | 29 compressed, 29 verified, 29 originals removed; final independent pass `storage/POST_VERIFY.json`: **29/29 OK** (`.zst` present with the recorded sha256 and bytes, `zstd -t` passes, no original left) |
| Original bytes | 195,953,471,488 (196.0 GB; allocated 195,953,487,872) |
| Compressed bytes | 16,148,379,429 (16.1 GB; 8.24 %; per file 6.1–10.0 %) |
| **Recovered** | **179,805,092,059 bytes (179.8 GB; 167.5 GiB)** of allocated space |
| Disk free | 265 GB (`df -h`) before → 462 GB after the TSLA import (1,007 GB filesystem) |
| Priority 5 cache | 218.6 GB → 38.8 GB (16.1 GB of `.zst` + the 22.6 GB of other caches, untouched) |
| Compute | 2,269 s of compression and verification in total |

Per archive (bytes, compressed bytes, ratio, points rows, sealed triples reproduced):

| Job | Original | .zst | Ratio | Points | Sealed triples |
|---|---:|---:|---:|---:|---:|
| C19-broad1 | 11,314,388,992 | 837,346,967 | 0.0740 | 2,423,302 | 372 |
| C19-broad2 | 12,434,579,456 | 929,135,908 | 0.0747 | 2,593,932 | 384 |
| C19-qualify-broad | 3,449,589,760 | 211,650,995 | 0.0614 | 755,870 | 1,135 |
| C19-qualify-refine | 938,741,760 | 62,753,185 | 0.0669 | 205,660 | 295 |
| C19-refine | 11,875,405,824 | 831,965,037 | 0.0701 | 2,520,916 | 298 |
| C19-rx1 | 6,126,702,592 | 456,383,467 | 0.0745 | 1,294,234 | 189 |
| C19-rx2 | 5,985,337,344 | 443,951,978 | 0.0742 | 1,265,628 | 189 |
| C19-slice | 13,430,784 | 1,108,177 | 0.0825 | 2,980 | 6 |
| C21-broad1 | 12,065,071,104 | 1,020,205,293 | 0.0846 | 2,586,429 | 372 |
| C21-broad2 | 13,230,600,192 | 1,131,399,230 | 0.0855 | 2,762,373 | 384 |
| C21-qualify-broad | 2,302,636,032 | 177,475,450 | 0.0771 | 504,350 | 757 |
| C21-qualify-refine | 934,330,368 | 67,100,384 | 0.0718 | 206,924 | 295 |
| C21-refine | 11,753,701,376 | 925,906,106 | 0.0788 | 2,521,276 | 296 |
| C21-slice | 13,185,024 | 1,151,205 | 0.0873 | 2,980 | 6 |
| C23-broad1 | 9,920,950,272 | 861,782,824 | 0.0869 | 2,109,441 | 372 |
| C23-broad2 | 9,805,938,688 | 856,864,484 | 0.0874 | 2,024,283 | 382 |
| C23-qualify-broad | 2,298,851,328 | 198,612,525 | 0.0864 | 503,040 | 755 |
| C23-qualify-refine | 862,089,216 | 74,374,745 | 0.0863 | 188,633 | 268 |
| C23-refine | 10,564,354,048 | 921,294,471 | 0.0872 | 2,240,036 | 269 |
| C23-slice | 15,196,160 | 1,284,420 | 0.0845 | 3,384 | 8 |
| C24-broad1 | 9,687,842,816 | 851,950,089 | 0.0879 | 2,055,622 | 368 |
| C24-broad2 | 9,592,565,760 | 843,276,836 | 0.0879 | 1,978,578 | 384 |
| C24-informed1 | 16,596,443,136 | 1,440,555,903 | 0.0868 | 3,595,211 | 350 |
| C24-informed2 | 17,766,035,456 | 1,565,141,129 | 0.0881 | 3,750,072 | 352 |
| C24-qualify-broad | 2,292,776,960 | 202,305,052 | 0.0882 | 501,730 | 753 |
| C24-qualify-informed | 2,135,842,816 | 201,361,249 | 0.0943 | 468,980 | 702 |
| C24-qualify-refine | 834,842,624 | 71,216,011 | 0.0853 | 182,731 | 256 |
| C24-refine | 11,087,183,872 | 955,342,068 | 0.0862 | 2,350,222 | 258 |
| C24-validation | 54,857,728 | 5,484,241 | 0.1000 | 11,970 | 40 |

Original sha256 (= the Priority 5 manifest), `.zst` sha256, mode and mtime of every archive: `storage/ACTIONS.jsonl`
(`z-verified` rows) — the **restoration manifest**.

## 4. Disclosure: one conservative blocker, resolved

`C24-qualify-informed` first stopped at step 4 (2026-11-25T11:03:06Z, `z-blocker`: "1 sealed id not reproduced"); its
original was left untouched and the partial `.zst` discarded, as designed. Cause: Priority 5's informed qualification
record carries **two copied incumbent rows** (`copiedEvidence: 2`, `stage: incumbent`: N/original and New L0), whose
evaluations live in `C24-qualify-broad` (where its own smoke test had verified them). The smoke test's attribution was
corrected to exclude such copies (`p5zstd.py`, comment in `sealed_triples`), checked on the original (702/702 own triples
reproduced), and the restartable tool was rerun for that archive alone (11:07:48Z: verified, removed). The blocker record
stays in `ACTIONS.jsonl`.

## 5. Restoration

```bash
# one archive (keeps the .zst; restores mode and mtime), then check it against the manifest
A=research/vg-l0-n-successor/cache/jobs/C24-refine/archive.sqlite
test ! -e "$A" && zstd -t -q "$A.zst" && zstd -d -q "$A.zst" -o "$A"
grep " cache/jobs/C24-refine/archive.sqlite" research/vg-l0-n-successor/reports/diagnostics/job-archives.sha256
sha256sum "$A"   # must equal the manifest's sha256 (and the z-verified row's "sha256")

# all 29
for z in research/vg-l0-n-successor/cache/jobs/*/archive.sqlite.zst; do a=${z%.zst}; test -e "$a" || zstd -q -d "$z" -o "$a"; done
(cd research/vg-l0-n-successor && sha256sum -c <(awk '{print $1"  "$3}' reports/diagnostics/job-archives.sha256))
```

Restoring is needed before any read of a job archive (a replay or a Lab resume of a Priority 5 job; none is planned: every
Priority 5 stage is sealed and refuses to rerun). A Lab opened on a job whose `archive.sqlite` is absent would start an
empty archive: restore first (the documented command was executed and verified for all 29 archives). Each job's other
state (`progress.json`, `runs.jsonl`, `owner.json`, `job.lock`, `dataset/`) was not touched. Requirement: ≈ 196 GB free to
restore everything at once (each archive can be restored alone: the largest is 17.8 GB).

## 6. The other ≈ 22.6 GB of Priority 5 caches (audited read-only; NOTHING deleted)

`storage/OTHER_CACHE_AUDIT.json` (tool `storage/tools/other_caches.py`): 22,626,482,211 bytes in groups, plus ≈ 2 MB of job
state files under `cache/jobs/` (not candidates). Priority 5's own hash list of these files
(`reports/diagnostics/other-caches.sha256`): **38/38 still verify**.

| Group | Bytes | Regenerable | Recommendation |
|---|---:|---|---|
| `cache/pilot/jobs/pilot-broad-D21` (benchmark lanes, BENCH seeds) | 12,696,322,169 | yes (deterministic rerun at `7d911b4b`) | removal candidate (or zstd) |
| `cache/pilot/jobs/pilot-informed-D24` | 4,698,838,793 | yes | removal candidate (or zstd) |
| `cache/pilot/datasets` | 130,090,162 | yes (`exportDataset`) | removal candidate |
| `cache/engineering/jobs/*` without `-final` that have a `-final` twin (superseded pre-final gate runs) | see JSON | yes | removal candidate |
| `cache/engineering/jobs/*-final` (archives behind the sealed gates) | see JSON | yes | keep (or zstd): audit trail |
| `cache/engineering/datasets` | 328,293,264 | yes | removal candidate |
| `cache/jobs/*/dataset` (29 exported GPU datasets) | 1,765,370,472 | yes (attestations record their sha256) | removal candidate |
| `cache/diagnostics` | 175,774,615 | yes (diagnostics rerun) | keep (small; backs a published diagnostic) |
| `cache/lot-rows` | 18,836,489 | only by replay | keep (lot-level evidence) |
| `cache/strategy-lab-scratch` | 3,044,404 | yes (build) | removal candidate |
| **Removal candidates** | **20,965,263,140** | | for the user's separate decision |
| **Keep** | **1,661,219,071** | | |

No independent cleanup authorization covers these files, so the brief's rule applies: report, do not delete.

## 7. Post-operation verification

- `storage/POST_VERIFY.json`: 29/29 OK (read-only re-hash of every `.zst`, `zstd -t`, no original left).
- GPU acceptance re-verified after the archive work (gate E1: `verify-acceptance.sh --rebuild --device --expect-record-sha256
  bb0e3fcf…` VERIFIED); the archive work touched no evaluation file, binary or record (it is not evidence about trading
  behaviour; the CPU/GPU gates E2–E6 were run independently).
- Priority 5's sealed results are unaffected: its seals live in tracked files; `research/vg-l0-n-successor` has no tracked
  change (`git status`), and its reference figures reproduce (gate E3: New L0 and N/original = their sealed development and
  full-history figures on the GPU and the CPU).
- The compressed archives and these manifests are kept; nothing recursive was run against a shared directory.
