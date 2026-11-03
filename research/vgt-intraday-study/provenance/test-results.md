# Test results

## Before the study (2026-10-15 16:13Z, no study code present)

`npm test`: **102 tests, 99 pass, 3 fail** ([npm-test-before-study.txt](npm-test-before-study.txt)).

The 3 failures existed before this study. All three are protected-file checks of earlier studies, and they fail because `src/app/allin-original.ts` has an uncommitted working-tree edit (sha256 `38bd247b…`) that predates this study.

| Test | File |
|---|---|
| "src/app/allIn.ts and src/app/allin-original.ts are byte-for-byte unchanged" | `src/minute-optimizer/tests/goldenMaster.test.ts` |
| "matches the committed bytes (sha256 and git blob)" | `src/optimizer/tests/goldenMaster.test.ts` |
| "has no uncommitted changes" | `src/optimizer/tests/goldenMaster.test.ts` |

The edit changes the default data file from `VGT-2016-2026.csv` to `VGT-2026.csv`. This study did not modify, reset or "fix" that file.

## After the study (2026-10-15 16:56Z)

`npm test`: **135 tests, 132 pass, 3 fail** ([npm-test-after-study.txt](npm-test-after-study.txt)).

- The 3 failures are the same pre-existing ones listed above.
- **The study's own 33 tests all pass** (`node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/intraday-study/tests/*.test.ts'`).
- No test failure was introduced by this study.

Other checks:

- `tsc --noEmit` passes over the whole repository.
- `eslint src/intraday-study src/app/intradayStudy.ts` reports 0 problems.
- The full study pipeline (`intradayStudy all`) passed the golden master. A complete rerun into a temporary directory was byte-identical across all 352 result files ([determinism.json](determinism.json)).
- The independent Python replay (`replay/replay.py --compare`) matches all 8 checked configurations exactly.
