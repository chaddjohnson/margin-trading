# Implementation audit

Branch `research/trailing-buy-four-family-optimization`, started at HEAD `121cd347` with a clean tree. **Nothing is
committed.** No live order, broker call or account access exists anywhere in this work.

## Checks

| Check | Before (HEAD) | After |
|---|---|---|
| `npm test` | 446 tests, 446 pass, 0 fail, 0 skipped | **462 tests, 462 pass, 0 fail, 0 cancelled, 0 skipped** (131 suites) |
| `npx tsc --noEmit` | clean | clean |
| `npx eslint` | 0 errors, 15 warnings | 0 errors, the same 15 warnings (none in files of this work) |
| `npm run legacy-archive -- verify` | 11 of 11 | not affected (no archive input or pin touched) |
| `npm run datasets -- verify` | — | 16 of 16 verified |
| `npm run market-events -- verify` | ledger identical; 2 splits; 4 unrecorded moves | ledger identical; **6 splits verified; 0 unrecorded** |
| Determinism | — | a full rerun of audit, screen, diagnose, parity and regression reproduced every JSON record (apart from timestamps) and every CSV byte for byte |

No existing test was deleted, loosened or regenerated. One assertion was updated deliberately: the registry test
that pinned exactly two splits now pins the six documented ones and their source documents.

## Files

**New**
- `src/complementary-etf-d1/` — `context.ts` (every protocol constant), `data.ts` (training-only access through the
  shared loader; the D1 research view; the audit loader), `audit.ts`, `screen.ts` (Stage A), `diagnose.ts` (post hoc
  diagnostics), `parity.ts` (D1 file vs engine), `regression.ts` (old-horizon gate), `freeze.ts` (protocol and
  candidate freezes), `stageC.ts`, `cli.ts`; tests `tests/screen.test.ts` (6) and `tests/data.test.ts` (4).
- `src/app/complementaryEtfD1.ts`; npm script `complementary-etf-d1`.
- `src/multi-etf-allocator/tests/crossPath.test.ts` (2): standalone and allocator paths across a split.
- `config/market-events/raw/split-sources-2026-10-24/` — the XOP Form 8937 and the XLE/XLU/XLY OCC memos.
- `research/complementary-etf-d1/` — this package.

**Modified**
- `config/market-events/splits.json` — four entries added (XOP 0.25, XLE/XLU/XLY 2); VGT/VOOG unchanged.
- `src/lib/tests/corporateActions.test.ts` — the registry assertion (above); a reverse- and successive-split test.
- `src/phenotype/tests/splitRun.test.ts` — the synthetic economy parametrized (VGT defaults unchanged); a position held
  across XOP's 1:4 reverse split, with the unadjusted artifact shown.
- `src/multi-etf-allocator/tests/dataset.test.ts` — the fixture's `rows` takes optional split ratios, dip and fall
  dates (defaults unchanged); a KRE lot held across a synthetic 1:4 reverse split in both modes.
- `src/multi-etf-allocator/tests/regression.test.ts` — B 32.7% and All-lowDd 34.6% maximum percentage drawdowns
  (2020-02-19 → 2020-03-23) against the 25.3%/25.2% largest-dollar depths, on the frozen inputs.
- `src/phenotype/strategies.ts` + regenerated `config/phenotypes/COMPATIBILITY.md` — one registry line for the new
  program entry (the phenotype registry test requires every `src/app` entry to be listed).
- `README.md` — the corporate-action section (six splits, units).
- `package.json` (the script), `.gitignore` (the duplicate regression run directories).

**Unchanged, verified:** every file under `research/` outside this package; `config/phenotypes/D1/*.json`;
`config/allocator/multi-etf-allocator.json`; the D1 source `src/app/allIn-trailingBuy-postExitContinuation.ts`; the
allocator engine and its frozen protocol path (no `--dataset` default changed); `data/partitions.json`; every
canonical data file (sha256 equal before and after); the legacy archive; the distribution ledger and its manifest. The
allocator was **not** extended: with no frozen candidate there was nothing to register.

## Data access, by command

| Command | Reads | Access |
|---|---|---|
| `audit` | all 16 files, every partition | integrity and corporate actions only; no strategy |
| `screen`, `diagnose`, `parity` | training partition of the 7 candidates, VOOG and the 4 books | `access: 'optimization'` (refuses anything else before reading); research views end 2023-12-29 |
| `regression` | VOOG, VGT, XBI, XRT, KRE through 2025-10-13 | manual evaluation of the frozen controls only |
| `stage-c` | `FROZEN_CANDIDATES.json` | no market data |

## Commands run (with their headline output)

```text
npm run market-events -- verify            6 × "SPLIT … adjusted overnight move" (−3.18% … +0.66%), no UNRECORDED line
npm run datasets -- verify                 16 of 16 symbol(s) verified
npm run complementary-etf-d1 -- audit      16 files, 6 splits, 52 overnight gaps ≥ 8% (12 idiosyncratic), 1 minute jump, 11 volume shifts
npm run complementary-etf-d1 -- freeze-protocol   sha256 4b7c6e94… at 2026-10-24T11:31:13Z
npm run complementary-etf-d1 -- screen     baseline 71 lots $249,174; selected: none
npm run complementary-etf-d1 -- diagnose   unchanged D1 first-order incremental −$9,094 (GDX) … −$117,211 (XOP); XLE optimized 1 fundable of 23
npm run complementary-etf-d1 -- parity     7 of 7 candidates: file = engine, 0 differences (XOP 82 trades across the reverse split)
npm run complementary-etf-d1 -- regression F-VGT $183,043.82 / $19,330.69; F-all-lowDd $294,675.77 / $27,968.03;
                                           B $2,346,272.33, 32.7%; C-all-lowDd $2,891,290.87, 34.6%; every CSV identical
npm run complementary-etf-d1 -- freeze-candidates  0 candidates, manifest ae035671…
npm run complementary-etf-d1 -- stage-c    no frozen candidate: nothing unlocked, nothing run
```

## Known limitations

- The `src/multi-etf-d1` search and selection were not exercised on canonical data (nothing selected); their reuse is
  prepared (`trainingTickerData` returns the `TickerData` they take) but untested end to end here.
- `results/regression/<control>/` is kept local (git-ignored): byte-identical copies of the committed frozen runs.
- The issuer distribution pages of the candidates were not machine-readable from this session; GDX's annual December
  schedule comes from a third-party history and is used only in a sensitivity.
