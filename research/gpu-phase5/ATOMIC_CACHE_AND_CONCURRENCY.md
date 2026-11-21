# Atomic dataset export and concurrent-job isolation (GPU Phase 5)

## 1. The problem (Phase 4's isolation test I7)

`src/gpu-backend/dataset.ts` `exportDataset` wrote `<cacheDir>/<door>.gb2ds` and its sidecar **in place** on every call.
Several processes exporting one door into one directory therefore overwrote the file while another process's GPU server
was reading it: Phase 4 measured 34 of 100 loads refused (short file, size mismatch), none accepted wrongly. Reproduced
today with the same harness and reader processes added (`results/cache/race-d19-legacy-inplace.json`, the old
publication step on the same bytes): 100 loads → 23 verified, **77 refused**, 0 wrong; of 3,716 plain reads of the shared
file by two reader processes, **3,665 saw a partial file**.

## 2. The change: write-once, atomic publication

Only the publication step changed; the bytes are built exactly as before (§4).

1. The dataset is built in memory and its sha256 computed.
2. **An existing target** must be a regular file holding exactly these bytes: then it is **reused untouched** (no write
   at all — a concurrent reader is never disturbed). A complete dataset with *other* content under the same name is an
   explicit `DATASET_CACHE_CONFLICT`; anything else (truncated, corrupt, foreign, a symbolic link, a directory) is an
   explicit `DATASET_CACHE_INVALID`. **Nothing is ever overwritten.**
3. Otherwise the bytes go to a **unique temporary file in the same directory** (`.<name>.gb2ds.tmp-<pid>-<time>-
   <random>`), created with `O_CREAT | O_EXCL` (an existing path or link is never opened), written, **flushed
   (`fsync`)**, closed, **read back and verified** (length, sha256, header, payload checksum).
4. It is published with **`link(2)`**, which creates the target only if it does not exist — an atomic
   compare-or-publish without a lock. Losing that race means another writer published first; its file is then verified
   like any existing target: identical content converges on one file, different content is the explicit conflict. The
   temporary file is removed in every case; the directory entry is flushed best-effort.
5. The sidecar (`.json`, derived metadata) is published the same way after the data file; a sidecar that describes
   another dataset than a correct data file is a conflict.

Why `link` and not `rename`: `rename` replaces, so two writers of different content would silently be last-writer-wins;
`link` cannot replace. No cross-process lock is needed, so there is no waiting and no deadlock.

| Situation | Behaviour |
|---|---|
| concurrent writers, identical content | one creates, the others verify and reuse; one inode |
| concurrent writers, different content under one name (another door, data revision, dataset version) | the first complete writer publishes; every other writer gets `DATASET_CACHE_CONFLICT` naming both sha256 values and the existing sidecar's identity |
| concurrent readers | see no file, or the complete verified file — never a partial one |
| writer killed at any instant | at most a temporary file is left; the target is absent or a previously published valid file |
| restart / resumed job | the export verifies the published file by content and reuses it, or publishes |
| stale temporary files | removed by a later export when older than 15 minutes, owned by this user and their writer's process is gone (at most 32 per call; best effort; a recent file, a live writer's file and any file that is not an export temporary are never touched) |
| existing corrupt or incomplete target (a leftover of the old in-place writer, disk damage) | `DATASET_CACHE_INVALID`, the file left as it is; the operator removes it or uses a fresh directory |
| power loss | the data is flushed before it is linked, so on a journaling file system the target is absent or complete afterwards; the directory flush is best-effort, so a just-published entry may be absent (the next export republishes) |
| the reader's own check | unchanged: the GPU server still verifies size and payload checksum at every load (fail closed) |

A consequence to know: a persistent cache directory that holds a door's dataset from an **older data revision** (for
example `FULL` after the market data were extended) now refuses with the explicit conflict instead of silently
overwriting. That is the intended behaviour (one name, one dataset); the remedy is in the message.

## 3. Tests

| Test | Result |
|---|---|
| unit tests `src/gpu-backend/tests/dataset.test.ts` (9, no GPU, synthetic doors, temporary directory): golden byte identity; reuse (same inode and times); conflict; truncated / empty / foreign / bit-flipped target; symbolic link, dangling link and directory at the target; exclusive creation; stale-temporary cleanup (dead writer removed; recent, live and unrelated kept); six writers killed at arbitrary instants; 4 writers × 20 rounds with 2 readers; 2 + 2 writers of two datasets × 12 rounds | 9 / 9 pass |
| the original 4 × 25 reproduction on D19 with the GPU server's load and two reader processes (`tools/gpu-phase5/dataset-race.ts race --mode atomic`, `results/cache/race-d19-atomic.json`) | **100 of 100 loads verified, 0 refused**, 1 created + 99 reused, 0 partial reads of 230, no temporary file left |
| forced termination on the real 34 MB dataset (`… kill`, `results/cache/kill-d19.json`): 40 writer processes SIGKILLed 45–398 ms into their export loops | 78 directories: 59 complete targets, 19 with only a temporary file, **0 partial targets**; all 78 complete after a restart |
| conflicting identities on real doors (`… conflict`, `results/cache/conflict.json`): 2 writers of D19 and 2 of D21 under one name, 10 rounds, then the GPU server loads the published file | one dataset published per round, 20 explicit conflicts, the server's load verifies, sidecar consistent |
| **the same two tests repeated on the final binary in the acceptance campaign** (gate A10; `results/final/race-d19-atomic.json`, `results/final/conflict.json`) | race: **100 of 100 loads verified, 0 refused**, 1 created + 99 reused, 0 partial reads of 241; conflict: 10 rounds, 20 explicit conflicts, one dataset published per round |
| a first run of the race tool counted one verified legacy load as "wrong" because it re-read the file after the load while another process was rewriting it; the classification was corrected (a "wrong" load is one the server accepted with another shape) and both first outputs are kept, labelled (`race-d19-legacy-inplace-run1-misclassified.json`, `race-d19-atomic-run1.json`) | disclosed |

## 4. A cache change is not a market-data change

- Unit level: the exported sha256 of three synthetic doors equals golden values produced by the exporter of commit
  `0ac3e4e2` (the old code, run from a scratch copy).
- Real doors (`tools/gpu-phase5/dataset-identity.ts`, `results/cache/dataset-identity.json`): D19, D21, D23, D24, FULL,
  the four regime windows, the three episodes and both studies' eight adversarial fixtures — **28 datasets, 40
  comparisons with the sidecars the old exporter left in Phase 3's and Phase 4's caches: all equal** (sha256 and size);
  a second export into the same directory reuses the file untouched.
- The acceptance campaign's parity, replays and the device's dataset loads run on datasets published by the new
  exporter (`GPU_ACCEPTANCE_REPORT.md`).

## 5. Job isolation and the operating modes (unchanged recommendations)

Atomic publication removes the start-up refusals of jobs that share a cache directory; it does **not** make sharing the
recommended practice:

- **each job its own dataset cache directory and its own job namespace** (archive `cacheRoot/jobs/<job>`, run id,
  receipts, telemetry). The archive store has no inter-process lock: two processes must never use one job name. Nothing
  here writes an archive across jobs or reuses a live job name;
- **Mode S** (fastest single optimization): one job, batch 8,192, 8 host workers;
- **Mode A** (most total throughput): two independent jobs at once, batch 8,192, 8 host workers each, separate cache
  and job namespaces, one parent slice with the aggregate memory cap and a per-job cap; admit a job only with the VRAM
  and host memory it needs free (Phase 4's figures and `tools/gpu-phase4/admit.ts`);
- every job passes its own official gate (which now also requires the engine to run without Maglev,
  `PARITY_ROOT_CAUSE.md` §7) and exports its own dataset.

The isolation and failure tests of Phase 4 were repeated on the final candidate in the acceptance campaign
(`GPU_ACCEPTANCE_REPORT.md`, gate A10; `results/isolation/`, `results/bench/{i1,i2}`), each beside a neighbour job that
had to finish identical to its reference:

| Test | What happens | Result |
|---|---|---|
| I1 | a job's whole unit is killed (SIGKILL) mid-run and the job resumed while a neighbour runs | resumed job (5,002 rows reused from its archive) and neighbour identical to the reference |
| I2 | a job stops gracefully at a set point (exit 75) and is resumed beside a neighbour | both identical |
| I3, I4, I5 | a failure in one job (its GPU server killed; a host-worker fault; a VRAM refusal) | the failing job exits 3, records the failure and its reason, scores nothing on the CPU, releases no unfinished round; the neighbour completes identical |
| I6 | namespace guards | a live job's name is refused, a finished job's name is refused for reuse without `--resume`, the test tool refuses an official purpose |
| I7 | four processes exporting one dataset into one shared directory, 25 loads each, with two readers | the table of §3: 100 of 100 verified |

**Are separate namespaces still required?** Yes for job names (mandatory: the archive store has no inter-process lock,
and the guards of I6 refuse a shared or reused name). For dataset cache directories they are no longer needed for
correctness — a shared directory now converges on one verified file and refuses a different revision explicitly — and
remain the recommended practice, because a per-job directory keeps a job's inputs independent of any other job's
data revision and of its cleanup.
