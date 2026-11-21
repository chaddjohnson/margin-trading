# Concurrent-job isolation (GPU Phase 6)

Code: `src/gpu-jobs/jobs.ts` (`openJob`, `claimJobDirectory`, `ownerProblem`, `labOptionsOf`, `poolFilesOf`,
`jobStatus`, `listJobs`), `src/gpu-jobs/lock.ts` (`OwnershipLock`), `src/gpu-jobs/cli.ts`; integration in
`src/gpu-backend/lab.ts` (EvalLab ownership) and `src/gpu-backend/official.ts` (`preflight-job`); tests
`src/gpu-jobs/tests/jobs.test.ts` (10). Operations: `docs/gpu/README.md` §4c.

## 1. What was wrong before

- Isolation lived in each tool: Phase 5's `tools/gpu-phase5/replay.ts` assembled its directories by hand and took a pid
  lock file with a check-then-write race (two processes could both find a "stale" lock and remove each other's), and
  PID reuse could make a dead owner look alive. The EvalLab itself had no lock: two processes opening one job name
  wrote one SQLite archive.
- The official gate took a caller-supplied `cacheDir` and `runId`: separate dataset caches and job names were a
  practice to remember, not a default.

## 2. The design

| Requirement (brief §2) | How |
|---|---|
| unique job identity | `results/jobs/<job>/job.json`: study, name, the runner's job DEFINITION (canonical JSON, key order irrelevant) and its sha256, the dataset-cache mode; written once (`wx`) under the lock. No name given → `<label>-<UTC>-<6 hex>` allocated |
| dedicated research-output namespace | `research/<study>/results/jobs/<job>/` (identity, events, receipts, telemetry, the runner's records, `complete.json`; `logs/` git-ignored) |
| dedicated dataset cache by default | `research/<study>/cache/jobs/<job>/dataset/`; the official gate exports there unless the job declared a shared cache; Phase 5's atomic write-once export unchanged |
| independent checkpoint / recovery | the EvalLab's archive and progress checkpoint live in `research/<study>/cache/jobs/<job>/` (`labOptionsOf(job)`) |
| independent logs and diagnostics | `events.jsonl` (open, resume, barrier, attestation, complete, release with outcome), `logs/job.log`, receipts and telemetry per job (`poolFilesOf(job)`) |
| safe ownership | a kernel lock: an exclusive SQLite transaction on `cache/jobs/<job>/job.lock` held for the owner's lifetime. Another process → `JOB_ACTIVE` (after ≤ 1.5 s so a status probe never fails a real start); a second open in the same process → `JOB_ACTIVE`; released by the kernel on any exit (SIGKILL included): no stale-lock logic, no PID comparison. `owner.json` is informational only |
| resume without self-conflict | `resume: true` + the identical definition → the job's own identity, archive and checkpoint are read back (`resume` event); a different definition → `JOB_IDENTITY_CONFLICT`; absent → `JOB_NOT_FOUND` |
| reject conflicts, never overwrite | existing name without resume → `JOB_EXISTS`; directories with state but no identity → `JOB_FOREIGN_STATE` (never adopted); the Lab refuses a second writer; the gate refuses an official run without a held job of its study, or with a foreign run id or dataset cache (`preflight-job`) |
| one job's failure cannot corrupt another | every write of a job is inside its own two directories; shared inputs are read-only (market data) or write-once (a declared shared dataset cache) |
| determinism | names, instances and paths never reach a seed or the search order (seeds derive from lane keys) — verified bit for bit (§3) |
| no duplication of market data | every job reads `data/<SYMBOL>/` in place; only the derived ≈ 34 MB dataset is exported per job; `datasetCache: { shared }` when even that is unwanted |
| backward compatibility | completed studies untouched; non-official tools that open an EvalLab without a job keep working (the Lab locks its own directory); the gate's test mode (`allowUnaccepted`) still accepts `runId` + `cacheDir` |

Placement: the module is enforcement, not evaluation. It lives outside `src/gpu-backend/` because a new file there
needs `compat.ts`, which is part of the evaluation digest compiled into the binary; `acceptance.ts`
(`ENFORCEMENT_EXTRAS`) makes every acceptance record pin it, and the merge gate refuses an unclassified file in it.

## 3. Evidence (results/)

See `GPU_INFRASTRUCTURE_HARDENING_REPORT.md` §5 for the tables. Records: `campaign/summary.json` (the isolation audit),
`compare/*.json`, `campaign/attempt-*.txt`, `campaign/status-after-kill.json`, `runtime/process-samples-a2.txt`,
`jobs/<job>/` for every campaign job.

## 4. Limitations

- Local file systems only (fcntl locks are not relied on over NFS).
- The pool's receipt and telemetry paths are given by the runner (`poolFilesOf(job)`): `pool.ts` belongs to the host
  path of the evaluation digest and was not changed, so it cannot itself check that its ledger is the job's.
- A job's records under `results/jobs/<job>/` are never deleted by a tool; `cli.ts remove-cache` deletes only the
  git-ignored state of an inactive job (its empty lock file stays, deliberately).
- A refused start can leave an empty lock file in a fresh state directory; status reports it as absent and the name stays
  usable.
