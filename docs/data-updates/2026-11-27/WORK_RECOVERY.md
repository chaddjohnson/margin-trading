# Work recovery checkpoint — explicit research date boundaries, VGT/GDX data update, N/original full-history run

## Top screen

- **Updated:** 2026-11-27T14:30Z (UTC, from the clock). **Status: INCOMPLETE — stage B (implementation) running.**
  Stage A complete: `AUDIT.md`, the brief verbatim in `BRIEF.md`. Stage B so far (uncommitted, all verified):
  `src/lib/csv.ts` (maxBytes), `src/lib/evaluation.ts` (pin; access development/validation), new
  `src/lib/canonicalPrefix.ts`, `src/lib/researchRanges.ts`, `config/research/date-ranges.json` (R1, sha256 `818be325…`),
  `config/market-data/vintages.json` (`6a6e39be…`, 3 verified vintages each of VGT/GDX), Priority 3's FULL door and builder
  verify the pinned prefix (`src/vg-d1-growth-joint/{context,data}.ts`). Evidence: `evidence/fingerprint-0-before-change.json`
  (`44de9e60…`) = `evidence/fingerprint-1-after-code-change.json` (`432f97c1…`) for FULL and D24 doors and the N/original /
  New L0 replays (tools/data-boundaries/fingerprint.ts).
  Done since (≈15:05Z): append tool (prefix proof, vintage record) + `datasets prefix` / `datasets vintages`
  (`src/data-partition/{canonical,cli}.ts`); preflight range checks + 4.0.0 rules (`src/research-standard/preflight.ts`,
  tests 33 pass, 1 fails by design: "every study … passes" because 5 official GPU studies are BLOCKED by the stale
  acceptance); standard 4.0.0 written and registered (sha256 `c4743fd5…`); `src/manual-eval/{door,report}.ts`,
  `tools/manual-eval/pooled.ts`, npm script `manual-eval`. Pre-append check: `--window all` on the 10-30 files reproduces
  every sealed N/original figure (net, dev, val, interest, costs, banked DD, trade-principal loss).
  Remaining B: Growth off-parity tests append-proof, new tests, entrypoints registry, Strategy Lab check, docs.
  Data are still the 2026-10-30 files (unchanged).
- **GPU decision (recorded):** the change touches the evaluation digest (src/lib, Priority 3 door) and the policy group
  (preflight) → acceptance STALE on this branch. A §2 re-acceptance includes a fixed-seed mini-optimization, which the
  brief forbids ("Do not run a new optimization merely to test these infrastructure changes"), so it is the follow-up
  gate; a non-official GPU-vs-CPU check of fixed configurations on the post-append FULL door is run instead.
- **Task:** the user's brief of 2026-11-27 ("Explicit Research Date Boundaries and Continuously Updated Market Data"):
  audit → explicit research date ranges (shared definition, enforced at data access) → standard update → reproducibility
  protections → append VGT/GDX through the latest complete session → N/original continuous manual run → tests → report.
  No optimization, no strategy/phenotype/allocator change, no extension of a sealed validation window.
- **Branch:** `feature/research-date-boundaries`, created from `research/gdx-d1-growth` at `03f3500c` (clean tree).
  Main checkout, no extra worktree.
- **Next step:** finish the audit (stage A), write `AUDIT.md`, then design.

## Stage table

| Stage | Status | Notes |
|---|---|---|
| A. Audit | running | three read-only sweeps (N/original provenance; Strategy Lab data/caching; hash pins, doors, GPU data path) |
| B. Implementation (date ranges, door prefix verification, tests) | not started | |
| C. Data update (VGT, GDX) | not started | must not start before B's protections and tests pass |
| D. N/original continuous run | not started | after C's integrity checks |
| E. Verification, report, commit, push | not started | |

## Facts verified so far (from files, 2026-11-27)

- `data/VGT/data.csv`: 53,395,054 bytes, 935,608 rows, sha256 `2ee06310f2fa8926…`, 2016-01-04T13:00Z → 2026-10-30T23:59Z;
  equals `data/VGT/dataset-report.json` (verify, 2026-11-02). mtime 2026-11-06 but bytes unchanged.
- `data/GDX/data.csv`: 80,036,100 bytes, 1,490,494 rows, sha256 `77dba9b21c4b6849…`, 2016-01-04T11:15Z → 2026-10-30T23:59Z.
- Last complete session of both: **2026-10-30** (not 2026-10-23). Appended 2026-11-02 by Study 9's refresh
  (`data/datasets-append-run.json`; increments `data/vintages/study9-refresh-2026-11-02/increments/`).
- Every STANDARD_ADOPTION.json (31 studies) declares development 2016-01-04 → 2024-12-31, validation 2025-01-01 →
  2026-10-30, endpoint 2026-10-30.
- Alpaca reads a date-only `end` as 00:00Z of that date (Study 9 DATA_MANIFEST.md). In EST the extended session of
  2026-11-25 ends 01:00Z on 2026-11-26, so the download end must be `2026-11-27` (Thanksgiving 2026-11-26 has no bars;
  2026-11-27's pre-market starts 09:00Z).
- GPU: `config/gpu-backend/acceptance.json` ACCEPTED (2026-11-22). `src/lib/*.ts` and `src/vg-d1-growth-joint/data.ts`
  are in the evaluation digest compiled into the binary; `src/research-standard/*` is in the policy group. Editing either
  makes the acceptance STALE (§2 or §2a re-acceptance before merge or official use).

## Guards

- Do not run any optimization. Do not modify sealed records under `research/`. Do not modify `data/*/data.csv` before
  stage B is complete and tested. Never delete `data/vintages/` or the archive.
