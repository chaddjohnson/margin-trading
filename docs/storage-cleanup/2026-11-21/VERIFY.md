# Storage cleanup 2026-11-21 — verification

Commands ran from the repository root with Node 24.21.0 (`node --no-maglev …`) in contained systemd user units.
Raw outputs are in `verify/pre/` and `verify/post/`; the commands are in `tools/after-group.sh`,
`tools/sl-check.sh` and `tools/post-suite.sh`. Times are UTC.

## 1. Before any change (17:08–17:25Z)

| Check | Command (abbreviated) | Result |
|---|---|---|
| Independent acceptance verifier | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 3610caaf…` | **VERIFIED**: every pinned file, the evaluation digest, the binary `f444c521…`, a reproducible rebuild, device `GPU-ae5f222c…`, record sha256 = the out-of-repository pin (`~/.local/share/margin-trading-gpu/acceptance-pins/pins.jsonl`) |
| Phase 6 historical integrity | `tools/gpu-phase6/integrity.ts --out …` | **5/5**: 20,888 tracked research files unchanged, 22 study preflights PASS as at baseline (incl. every affected study), sealed-file protection counts as at baseline, B4/B5 forward freeze, GPU digests |
| GPU/CPU parity mini-set (non-official) | `GPU_POLICY_PURPOSE=parity-test tools/gpu-phase6/parity.ts --fixture 3 --sessions 420 --options all --random 300 …` | **328/328 identical, 0 mismatches**, 327 envelopes; subjects and result equal to Phase 6's sealed `results/parity/S3-all.json`. Fixture dataset and tracked files untouched |
| Strategy Lab portfolio parity | `apps/strategy-lab/scripts/portfolio-parity.ts --out …` | **ALL VERIFIED**: the 5 frozen pooled candidates to the cent, every record field and ledger |
| Strategy Lab Vitest / build / Playwright | `tools/sl-check.sh` (scratch build; e2e on a temporary state) | **314/314; build ok; 81/81** |
| Repository tests | `npm test` | 1,723 tests: 1,712 pass, **7 fail = the known pre-existing set** (6 × lowercase `allin-original.ts`, Study 7 data end); list in `verify/pre/npm-test-failing.txt` |
| Assignment 3 archived population (read-only) | `tools/vg-l0-risk-metrics/exclusions.ts scan --dry` on the original archives | 4 cutoffs × 128 lanes, 0 reason mismatches, DD-excluded **17,626 / 56,929 / 96,742 / 105,484**, which equals the sealed `research/vg-l0-risk-metrics/results/pipeline/exclusions-scan.json` |
| Strategy Lab state and live dist | sha256 of sorted (path, size, mtime) | recorded (`verify/pre/fingerprints.txt`) |
| Git | `git ls-files -s` digest, `git status` | recorded; tree clean apart from this new directory |

## 2. During the cleanup

- **After each Phase 1 group** (H1…H6): integrity **5/5** and the verifier **VERIFIED**
  (`verify/post/integrity-after-H*.txt`, `verify-after-H*.txt`).
- **Per database** (78): quick_check ok; row count = job-end archived count (78/78); streamed-decompression sha256 and
  byte count equal to the original's before removal (ACTIONS.jsonl `z-verified`).
- **Isolated restore tests**: Z1 `search-C19-base`, Z3 `search-C19-B1` and Z2 `search-C19-broad1`. Each had sha256
  equal, full `PRAGMA integrity_check` = ok, row count, mode and mtime (ACTIONS.jsonl `z-restore-test`).
- **Z2 in place** (`verify/post/z2-inplace-restore.txt`, `z2-exclusions-scan-dry.txt`):
  - all 14 search archives were restored to their original paths, and all 14 were identical;
  - the risk-metrics scan was re-run on them. Its per-cutoff output was identical to the pre-cleanup scan and to the
    sealed record, and its printed record differed only in the run timestamp `at`;
  - the `-wal`/`-shm` contents were identical to the pre-cleanup state;
  - the restored copies were removed again after their sha256 was re-confirmed (19:03:01Z).
- **H6 in place** (`verify/post/rollback-test-H6.txt`): restored to its original location, 344/344 files verified
  against the manifest, removed again through the guarded tool.
- **Fail-closed lookup** (`verify/post/fail-closed-lookup.txt`): a read-only `node:sqlite` open of a compressed job's
  `archive.sqlite` is refused ("unable to open database file") and creates no file.

## 3. After everything (19:03–19:14Z)

| Check | Result |
|---|---|
| Verifier `--rebuild --device --expect-record-sha256 3610caaf…` | **VERIFIED** (`verify/post/verify-acceptance.txt`) |
| Integrity | **5/5** (`verify/post/integrity.json`) |
| GPU fixture parity S3 | **328/328, 0 mismatches**, equal to the pre run and to Phase 6's sealed result |
| Strategy Lab portfolio parity | **ALL VERIFIED** |
| Strategy Lab Vitest / build / Playwright | **314/314; ok; 81/81** |
| `npm test` | 1,723 tests: 1,712 pass, 7 fail; **failing set identical to the baseline** (`diff verify/pre/npm-test-failing.txt verify/post/npm-test-failing.txt` empty) |
| Strategy Lab `state/strategy-lab` and live `apps/strategy-lab/dist` | **unchanged** (fingerprints equal) |
| Git index | **identical** to the pre-cleanup digest; no tracked file modified; only `docs/storage-cleanup/2026-11-21/` added |
| Acceptance record / binary | `config/gpu-backend/acceptance.json` sha256 `3610caaf…`, `gb5` `f444c521…`, both unchanged |
| Phase 6 job namespaces | 36 `job.lock`/`owner.json`/`complete.json` files present; nothing under `research/gpu-phase6/cache/jobs` modified since the audit |
| Processes | no Node, zstd or GPU job running; every cleanup unit ended successfully |
| Risk-envelope pilot | **NOT STARTED** (nothing prepared, configured or run) |

## 4. Pre-existing failures (not caused by the cleanup)

The 7 `npm test` failures are the same before and after, and match the repository's known list. Six open
`src/app/allin-original.ts` (lowercase; the file is `allIn-original.ts`), and one is the Study 7 runner parity, whose
sealed data end is 2026-10-29. No other check failed at any point.

## 5. Not run, and why

- **The live official preflight** (`tools/gpu-backend/official-preflight.ts`) would append to a completed study's
  tracked `results/doors.jsonl` and allocate a job in that study's namespace. Its components were covered without
  writing: the verifier (record, tree, binary, rebuild, device), integrity (digests) and the fixture parity mini-set
  through the accepted binary and host path.
- **No long or official GPU campaign.** The brief does not require one: no engine or evaluation file changed, and the
  evaluation digest is unchanged.
