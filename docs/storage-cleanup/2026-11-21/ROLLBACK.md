# Storage cleanup 2026-11-21 — rollback

Everything removed by this cleanup can be restored to its original paths, byte for byte, from files that are kept
on the same disk:

| What was removed | Kept for rollback | Exact record |
|---|---|---|
| Phase 1 groups H1–H6 (raw files) | `.cache/storage-cleanup-2026-11-21/quarantine/H{1..6}.tar.zst` (+ `.members.json`, `.list`) | `ARCHIVE_MANIFEST.json` `quarantine[]` (bundle sha256, sizes); per-file sha256/mode/mtime in `DRY_RUN_MANIFEST.json` `groups[id=H*].entries` |
| Z1–Z3 `archive.sqlite` (78 completed jobs) | `archive.sqlite.zst` **next to each original path** (same directory) | `ARCHIVE_MANIFEST.json` `compressedArchives[]` (original sha256, bytes, mode, mtime, zst sha256) |

The quarantine bundles must be kept **at least until 2026-12-21** (30 days). Purging them is a manual decision that
needs the user's separate authorization; nothing is scheduled. The `.zst` files of Z1–Z3 are the archives now: they
are never to be deleted.

All commands run from the repository root (`cd /home/chad/projects/margin-trading`). No command here overwrites an
existing file: `tar --keep-old-files` refuses to replace one, and the Z commands test for absence first.

## 0. Before restoring anything

1. Make sure no job or reader is using the target:
   - `ps -eo pid,uunit,args | grep -E '[n]ode|[z]std|[t]ar '`
   - `lsof +D <target dir>` should print nothing.
   - A Phase 6 / official GPU job's `job.lock` is held by its process (docs/gpu/README.md §4c); never touch a job
     namespace that is held.
2. Check that there is free space for the restored raw size: `df -B1G .`. The raw sizes are in `ARCHIVE_MANIFEST.json`.
3. Never restore onto a path that a newer job has recreated. If the target exists, stop and investigate.

## 1. Restore a Phase 1 group (H1–H6) to its original locations

```bash
G=H3                                     # H1 … H6
Q=.cache/storage-cleanup-2026-11-21/quarantine
sha256sum $Q/$G.tar.zst                  # must equal ARCHIVE_MANIFEST.json quarantine[group=$G].bundleSha256
zstd -t $Q/$G.tar.zst
zstd -dc $Q/$G.tar.zst | tar -tvf - | head  # optional: inspect; all member names are repository-relative
zstd -dc $Q/$G.tar.zst | tar -C . -xpf - --keep-old-files
python3 -I docs/storage-cleanup/2026-11-21/tools/verify-restore.py \
  --manifest docs/storage-cleanup/2026-11-21/DRY_RUN_MANIFEST.json --group $G   # every file: bytes, sha256, mode, mtime
```

- GNU tar strips any leading `/` and refuses `..` members. The bundle's members were verified at creation to be
  exactly the manifest's repository-relative paths.
- `-p` restores the modes, and the POSIX tar format restores nanosecond mtimes.

**Tested:** H6 was restored this way to its original location on 2026-11-21T17:34Z. All 344 files were verified
(0 problems) and then removed again through the guarded tool: `verify/post/rollback-test-H6.txt`.

## 2. Restore a compressed archive (Z1–Z3)

One job:

```bash
A=.cache/vg-l0-full-joint/jobs/search-C19-broad1/archive.sqlite     # any compressedArchives[].original
test ! -e $A && zstd -t $A.zst && zstd -d $A.zst -o $A               # keeps the .zst; copies mode + mtime
sha256sum $A                                                         # must equal compressedArchives[].sha256
```

A whole study (for example Assignment 3 before re-running its risk-metrics reader):

```bash
for z in .cache/vg-l0-full-joint/jobs/*/archive.sqlite.zst; do a=${z%.zst}; test -e "$a" || zstd -q -d "$z" -o "$a"; done
python3 -I docs/storage-cleanup/2026-11-21/tools/verify-z-restore.py --group Z2   # sha256 of every restored file
```

- **SQLite sidecars:** every compressed database was in WAL mode with an empty or absent WAL. The `-wal` (0 bytes)
  and `-shm` (32 KiB index) files of the 15 Assignment 3 jobs that had them were **left in place, untouched**. Their
  sha256 values are recorded per archive (`sidecarSha256`). Nothing else needs restoring: the database file alone
  holds all committed data. SQLite rebuilds the `-shm` index from the (empty) WAL on open.
- Restored files are byte-identical: the sha256 of the original was taken during the single read that produced the
  `.zst`, and verified again by a streamed decompression before the original was removed.
- **Tested:**
  - Each of Z1, Z2 and Z3 had one representative restored into an isolated scratch directory. Each was checked for
    sha256, a full `PRAGMA integrity_check`, the row count, the mode and the mtime (ACTIONS.jsonl `z-restore-test`).
  - Assignment 3's search archives were also restored **in place** and re-read by the risk-metrics Stage 4 scan; see
    VERIFY.md. Those restored copies were removed again after their sha256 values were confirmed.
- **Until it is restored, a compressed job cannot be read.** A read-only open fails ("unable to open database file")
  and creates nothing (`verify/post/fail-closed-lookup.txt`). The study runners refuse to rerun a stage whose sealed
  record exists (e.g. `src/vg-l0-risk-families/stages.ts:3-5`), so a job cannot be silently recomputed. Restore the
  archives before any replay, audit or resume of these studies.

## 3. Undo everything

Run §1 for H1–H6 and the whole-study loop of §2 for the three roots:
- `.cache/vg-l0-risk-families/jobs`
- `.cache/vg-l0-full-joint/jobs`
- `.cache/vg-l0-shadow-eligibility/jobs`

This needs about 350 GiB of free space for the raw files. Then run the checks of VERIFY.md (verifier, integrity
5/5, `npm test` with its 7 known failures, Strategy Lab).
