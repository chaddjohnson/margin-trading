# The six legacy test failures (`allin-original.ts`): resolved

## Reproduction at the baseline

`npm test` at `f2c414ef` (integration worktree, `evidence/npm-test-baseline-f2c414ef-worktree.log`) fails 9 tests:
- 3 record-in-force tests (the stale GPU record), resolved by the GPU Phase 9 acceptance;
- the 6 legacy failures below.

| # | File | Test | Error |
|---:|---|---|---|
| 1 | `src/intraday-study/tests/study.test.ts` | match the hashes recorded when the study started, except the recorded post-study changes | `ENOENT … 'src/app/allin-original.ts'` |
| 2 | `src/minute-optimizer/tests/goldenMaster.test.ts` | src/app/allIn.ts and src/app/allin-original.ts are byte-for-byte unchanged | `ENOENT` |
| 3 | `src/trailing-buy/tests/goldenMaster.test.ts` | the original is untouched | `ENOENT` |
| 4 | same | checked-in settings (0.5% / 3%) on the repository default file | `ERR_MODULE_NOT_FOUND … src/app/allin-original.ts` |
| 5 | same | brief settings (1% / 2%) on the research file, whole and from 2014 | `ENOENT` |
| 6 | same | volatile synthetic walks with gaps exercise every exit path, restrictions and resets | `ENOENT` |

## Cause (from Git history)

- **The rename:** `src/app/allin-original.ts` was renamed by the user to `src/app/allIn-original.ts` in two commits on
  2026-10-17: `86d2b2d9` "Temp renaming file" (→ `allin-original2.ts`) and `fb499e51` "Fixed file naming"
  (→ `allIn-original.ts`).
- **The content never changed:** both renames are R100 (identical bytes). The file still hashes to the pin
  `42f2b7e7be4ef99e1af6c4fe113dd8da9ed4d329d2fe0564463db80b87f449e2` that the three studies recorded. Only its path
  changed, and Linux's case-sensitive filesystem has no `allin-original.ts`.
- **The earlier partial fix:** on 2026-10-28 the user fixed one caller, `src/optimizer/goldenMaster.ts` (`a37feaeb`
  "Bad file reference fix"). The repository recorded the rest as known
  (`src/d1-signal-capital-complementarity/stages.ts:35`).
- **No source was missing:** nothing needed recovering or reconstructing.

## The fix (`00e1425c`)

| File | Change |
|---|---|
| `src/trailing-buy/constants.ts` | `originalFile = 'src/app/allIn-original.ts'` (comment: the study's historical name and the rename commits) |
| `src/trailing-buy/phase0.ts` | its baseline B0c uses `originalFile` instead of the old literal |
| `src/minute-optimizer/goldenMaster.ts` | the protected entry reads `src/app/allIn-original.ts`; the same pin |
| `src/intraday-study/cli.ts` | `readFrom` maps the study's recorded name `src/app/allin-original.ts` to the renamed file. The study's start-hash records, its `postStudyChanges` entry and every sealed record keep the historical name |
| `config/gpu-backend/entrypoints.json` | the entrypoint audit's digests of the two edited legacy runners (`minute-optimizer`, `trailing-buy`), regenerated with `src/gpu-backend/entrypoints.ts --write`; nothing else |

**What is not changed:**
- the pins, the golden masters, the expected results and the test files;
- every sealed record, the original strategy file itself, and any skip.

**Provenance:** the three studies' records still name `allin-original.ts`. The code reads the same bytes under their
current name.

**Effect on other freezes:**
- The three source files are pinned by `research/d1-diverse-pool-discovery`'s code manifest (405 files). That manifest
  already differed from HEAD in 7 files before this change, so its guard already refused at HEAD. The study remains
  reproducible at its own commit (`tools/historical-repro/env.ts`).
- No other study's pins include these files at their current bytes.
- None of the files is in the GPU evaluation manifest.

## Verification

- `node --test src/intraday-study/tests/study.test.ts src/minute-optimizer/tests/goldenMaster.test.ts
  src/trailing-buy/tests/goldenMaster.test.ts`: **11 / 11 pass**. They include "legacy mode reproduces the immutable
  original byte for byte" and the trailing-buy golden masters, which execute the original strategy.
- ESLint: 0 problems in the four files before and after.
- The full suite, final: `TESTS_AND_INTEGRITY.md`. No `allin-original` failure remains.
