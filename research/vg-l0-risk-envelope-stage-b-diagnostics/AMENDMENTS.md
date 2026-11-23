# AMENDMENTS — RES-BD 1.0.0 (append-only)

These are the deviations, incidents and diagnostic-code corrections after the diagnostic plan (`PROTOCOL.md`) was
committed.
- **Entry fields.** Each entry gives an ID, the UTC time (from `date -u`), what changed and why, which results existed
  at the time, its impact and its evidence.
- **Kinds.** `D*` entries are disclosures, incidents and tool defects with their fixes. `O*` entries are operational
  changes that select nothing.
- **Never changed by an entry:** Stage B's metric definitions, policy gates, seeds, doors, sealed selection criteria or
  frozen results.

The plan was committed before any diagnostic tool ran on a real Stage B record (see `RESEARCH_RECOVERY.md`).

- **D1 (2026-11-23T07:46:41Z; a defect in Stage B's committed, never-run `tools/vg-l0-risk-envelope-stage-b/census.ts`; fixed in this
  namespace's tool).**
  - **The defect.** `census.ts` hashes the original and the copied search archive with `fs.readFileSync`. Node refuses
    files above 2 GiB, and the Stage B search archives are 4.39–5.24 GB. The census would therefore have stopped with
    `ERR_FS_FILE_TOO_LARGE` before replaying anything.
  - **How it was confirmed.** The same call was made on the C24 search archive between 07:35Z and 07:39Z (between two clock readings; no exact time was taken): `File size (4389294080) is
    greater than 2 GiB`. This opened the original read-only and failed at the size check; no byte was read or written.
    The archive's sha256 was re-verified afterwards (`archive.ts` before every copy, `verify-all` at the end).
  - **The fix.** A streaming sha256 (`common.ts sha256Stream`). Regression test: `tests/tools.test.ts` "D1" (a sparse
    2 GiB + 1 MiB file: `readFileSync` refuses it, and the streaming hash equals `sha256sum`).
  - **Impact.** No metric, gate, seed, door or frozen result is involved.
- **D2 (2026-11-23T07:46:41Z; a second defect in the same tool; fixed).**
  - **The defect.** `census.ts` compares each replayed lane with its sealed lane as
    `deepDiff(JSON.parse(JSON.stringify(sealed)), JSON.parse(JSON.stringify(replayed)))`. The sealed record was written
    in the store's encoding (`textOf` → `plain`), where non-finite numbers are the strings `"__Inf"`, `"__-Inf"` and
    `"__NaN"`. `JSON.stringify` turns them into `null`.
  - **Its reach.** Every lane holding a non-finite value would show a spurious difference. In the sealed C19 search, 30
    of 64 lanes hold one (48 `__Inf`, 18 `__-Inf`, 14 `__NaN`), so the census would have stopped on a false
    mismatch.
  - **The fix.** Compare `deepDiff(sealed, plain(replayed))`, in the encoding the record was sealed in. Stage A's
    established tools (`tools/vg-l0-risk-envelope-sensitivity/`) used the same form. Regression test: "D2". It shows
    that the old form reports a spurious difference, that the new form reports none, and that a real difference is
    still detected.
  - **Applied the same way:** the bit-for-bit giveback parity compares the CPU record in the store's encoding
    (`plain`), the archive's own form.
- **O1 (2026-11-23T07:46:41Z; operational, selects nothing) — where the existing designs write, and what was added.** Stage B's
  `census.ts` and `giveback.ts` were executed as their designs prescribe, in new files under
  `tools/vg-l0-risk-envelope-stage-b-diagnostics/`. The originals are left unchanged as committed history. Differences
  from the originals:
  - **Outputs** go to this namespace's `results/` and git-ignored scratch `.cache/vg-l0-risk-envelope-stage-b-diagnostics/`.
    They do not go to Stage B's `results/analysis/` or `cache/census/`.
  - **Door openings** are logged in this namespace's `results/doors.jsonl`. They still go through Stage B's own
    `doorGuard` (use `diagnostic`).
  - **The census adds Stage A's established capture** (`fitMany` and the regenerated neighbourhoods, `population.ts`)
    and the zero-evaluation qualification replay (`qualification.ts`). These provide the rung-level and finalist
    levels the brief asks to keep apart.
  - **The giveback tool adds** the bit-for-bit parity, the ledger detail (the lots of each window, every trade) and the
    benchmarks.
  - **Unchanged:** the census's replay of the 64 lanes through Stage B's `runLanes` with a refusing pool, and its
    both-policy assessment (`plausibleArm`, `assessArm`). Also unchanged is the giveback row of `giveback.ts`
    (`diag-core diagnose`, its to-the-cent check, its paired `summarize` labels).
- **D3 (2026-11-23T07:51:38Z; an incident in this namespace's new giveback tool; fixed and rerun).**
  - **What happened.** The first C19 run (unit `vgl0rebd-giveback-C19`, 07:50:03–07:50:16Z) stopped before writing
    any result. `results/giveback/PARITY-FAILURE-C19-attempt1.json` preserves the failure.
  - **What failed.** For all 67 subjects, the financial parity was clean: 0 to-the-cent mismatches and 0 bit-for-bit
    differences against the archived GPU records. The stop came from an extra internal consistency check this
    namespace added. That check required the ledger-path maximum DD to equal the engine's `result.dd.max` with exact
    floating-point equality, and 18 subjects failed it.
  - **Why the check was wrong.** That is stricter than the repository's established reconciliation
    (`src/vg-l0-risk-metrics/engine.ts reconcile`; `research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md` §1: the
    rebuilt maximum DD within 1e-6 relative, with identical peak and trough instants). The rebuilt path is a sum of
    lot P&Ls, so it can differ from the engine's own running total in the last bits.
  - **The fix.** The check now uses the established rule. It also records each subject's absolute difference and
    whether the instants are equal (`results/giveback/parity-<cut>.json`), and still requires the D3 partition to add
    up to the path DD it partitions (residual < 1e-6).
  - **Impact.** No metric definition changes. D3's U / E / F always partition the ledger-path DD (as in diag-core and
    Stage A). The reported `dd` is the engine's, equal to the GPU's bit for bit. Any float-level gap between the two is
    reported, never hidden. The run was repeated with the same subjects and code otherwise unchanged (unit
    `vgl0rebd-giveback-C19-r2`).
