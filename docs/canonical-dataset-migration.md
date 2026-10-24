# Canonical OHLCV files, partition metadata and warm-up (2026-10-24)

The record of the change from four physical minute files per symbol (`data/<SYMBOL>/{training,holdout,final,all}/data.csv`,
commit 53ca8f55) to one canonical file per symbol plus `data/partitions.json`, with partition warm-up, the multi-ETF
allocator's `--dataset` mode, test remediation and research reproducibility. How to use the result is in the
[README](../README.md#market-data); this file is the evidence. No strategy was tuned, and no strategy or allocator ran on
the `final` or `all` partitions of the real data.

## 1. Starting point

- Branch `research/trailing-buy-four-family-optimization`, HEAD 53ca8f55, clean working tree (the interrupted task's
  code changes were reverted; an empty `src/legacy-archive/` directory was left).
- `data/` (git-ignored) still held, from the interrupted task, `data/archive/legacy-research-inputs/` (11 files written
  2026-10-24 01:00–01:01). They were not trusted by provenance: every one was checked against the sha256 pins in
  `research/`, `config/` and `src/`, and the 10 minute files against the row prefixes of today's `all` files (all
  matched), then rebuilt from their sources by the new tool (section 6).
- Baseline tests at HEAD, run in an isolated git worktree with the same `data/` and git-ignored artifacts:
  **385 tests, 338 pass, 29 fail, 8 cancelled, 10 skipped** (106 suites, 4 failing at suite level).
- Pre-change reference outputs (HEAD, four-file layout): all 22 minute strategy files on VGT `training`; four dated
  training windows (2019-01-02 → 2023-12-29); D1 on KRE and XBI `training`; four runs on the archived legacy files.

## 2. Canonical migration

`npm run datasets -- migrate` (`src/data-partition/canonical.ts`), first as `--dry-run`, then for real. Per symbol:
`all` = training ‖ holdout ‖ final by sha256 and row count; a full scan of `all` (six comma-delimited fields, ISO UTC
timestamps, strictly ascending, no duplicates, every row inside a partition); each physical file's row count equal to
the rows `partitions.json` assigns to its partition; copy of `all` to a temporary file, sha256 check, rename to
`data/<SYMBOL>/data.csv`, sha256 check; only then removal of the four files (directories only when empty).
`data/<SYMBOL>/partition-report.json` (the former partitioning's report) was kept. 16 of 16 symbols migrated.

The canonical sha256 equals three independent records: the previous migration's `all` hash
(`data/partition-run.json`), the hash taken immediately before the move, and a fresh hash of the canonical file. Each
partition's row hash from the new scan also equals the old physical file's hash.

| Symbol | Rows | training / holdout / final rows | Coverage (NY dates) | Canonical SHA-256 | Matches | Anomalies (reported, not fatal) |
|---|---|---|---|---|---|---|
| EWZ | 1,198,263 | 888,710 / 196,014 / 113,539 | 2016-01-04 → 2026-10-13 | `b1cf63a676c2696cc5f68a432f0d601510a1900d014b600b3a52dfb7c1c7439a` | yes | 0 missing sessions; 0 sparse; 145,884 ext-hours bars |
| GDX | 1,481,880 | 1,047,761 / 264,574 / 169,545 | 2016-01-04 → 2026-10-13 | `86ce101fede1a412dd452fcc29dc87b69ade4ad67629230172fde878b7c2c320` | yes | 0 missing sessions; 0 sparse; 428,959 ext-hours bars |
| GLD | 1,485,247 | 1,038,957 / 255,106 / 191,184 | 2016-01-04 → 2026-10-13 | `d3dd1beb35bc9beeb8085bd803609d56e2403662bf29c052450ee2e89400a9cc` | yes | 0 missing sessions; 0 sparse; 432,682 ext-hours bars |
| IWM | 1,759,157 | 1,230,727 / 336,462 / 191,968 | 2016-01-04 → 2026-10-13 | `44a919f997c1eeaf8a80c9424209c71131f276a97bf5cdd7f7cf970a7691471d` | yes | 0 missing sessions; 0 sparse; 706,144 ext-hours bars |
| IWN | 970,861 | 730,920 / 159,278 / 80,663 | 2016-01-04 → 2026-10-13 | `34cc798c020a152aec9565e680927f6b08828fcfd1a0296f016e7fe8e6da5808` | yes | 0 missing sessions; 0 sparse; 7,584 ext-hours bars |
| KRE | 1,126,493 | 821,957 / 199,061 / 105,475 | 2016-01-04 → 2026-10-13 | `40e7bd6c72c1dffb343b265bed16d69c964ba5bee81ad297a15e6d8a5607e01a` | yes | 0 missing sessions; 0 sparse; 74,226 ext-hours bars |
| TLT | 1,478,738 | 982,849 / 323,446 / 172,443 | 2016-01-04 → 2026-10-13 | `f4df3690714ee876ac643067f8567f973d80b701629f5142db15d791df16818b` | yes | 0 missing sessions; 0 sparse; 426,819 ext-hours bars |
| VGT | 928,192 | 663,135 / 147,391 / 117,666 | 2016-01-04 → 2026-10-13 | `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` | yes | 0 missing sessions; 0 sparse; 35,696 ext-hours bars |
| VOOG | 483,645 | 290,213 / 98,270 / 95,162 | 2016-01-04 → 2026-10-13 | `a7aa42aeebd9e83f94368f0ee7761410ffacf734524f3cc7655af32354de51ab` | yes | 0 missing sessions; 1,798 sparse; 13,312 ext-hours bars |
| XBI | 1,174,798 | 859,813 / 202,748 / 112,237 | 2016-01-04 → 2026-10-13 | `9afecc0606330d68ca12f7b0c331f75a150f64d0dad2e6ff910538a667b0c031` | yes | 0 missing sessions; 0 sparse; 124,018 ext-hours bars |
| XLE | 1,322,426 | 962,949 / 210,497 / 148,980 | 2016-01-04 → 2026-10-13 | `57d013b051ccb20570e64a3058cd91959bac56dc2bd5533137d13f962d37f214` | yes | 0 missing sessions; 0 sparse; 269,423 ext-hours bars |
| XLF | 1,332,122 | 971,398 / 231,633 / 129,091 | 2016-01-04 → 2026-10-13 | `845e7b603edf0f4e9d923c58f9dfc838ce568d6fcb7fcd6b42a7290ab28af31e` | yes | 0 missing sessions; 0 sparse; 279,107 ext-hours bars |
| XLU | 1,122,603 | 821,321 / 188,913 / 112,369 | 2016-01-04 → 2026-10-13 | `ab2787a4198289317fb5324248ea8abb356925f5e6857c67ac2594aaae0fc1c3` | yes | 0 missing sessions; 0 sparse; 69,719 ext-hours bars |
| XLY | 1,081,319 | 800,191 / 180,655 / 100,473 | 2016-01-04 → 2026-10-13 | `7a80d7f22b5b9f79c4136c653f0ed14f7e45b2908614e312226ab9e9bcf02955` | yes | 0 missing sessions; 0 sparse; 28,874 ext-hours bars |
| XOP | 1,163,994 | 875,087 / 182,466 / 106,441 | 2016-01-04 → 2026-10-13 | `cb8f4d8852b2f7141d5a6fdc0ea5f7598d6d0ca9620899f0016aa2de6f049855` | yes | 0 missing sessions; 0 sparse; 112,019 ext-hours bars |
| XRT | 1,068,251 | 792,337 / 178,080 / 97,834 | 2016-01-04 → 2026-10-13 | `ca0fdc6a4c77a97d047bb710bcefc24fe7fdbd0dc117794725008b33700a0752` | yes | 0 missing sessions; 0 sparse; 18,760 ext-hours bars |

"Sparse" counts sessions with fewer than half their scheduled regular minutes (VOOG trades thinly). BTCUSDT
(`data/BTCUSDT/BTCUSDT-2017-2026.csv`, a different format) was never in the partition layout and was left alone.
`data/partitions.json` sha256: `43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6`.

Session-level parity, before the old files were removed: for every symbol and partition, the sessions grouped from the
physical partition file deep-equal the sessions selected from the canonical bytes, and the bounded loader with a
120-session warm-up equals the full load (64 of 64 checks).

## 3. Loader, CLI and warm-up

- `src/lib/partitions.ts`: the schema, strict validation and New York date semantics of `data/partitions.json`
  (versioned in git through a `.gitignore` exception; the rest of `data/` stays local).
- `src/lib/dataset.ts`: `canonicalDataFile`, `resolveDataset` (a partition resolves to the canonical file plus its
  interval and the metadata hash; an explicit file is unchanged; a former partition path is refused with its
  replacement), `selectDataset` (logs the dataset with the data file's sha256), `optimizationDataset` and
  `assertOptimizationPartition` (training only), and the unchanged `expandDatasetArguments`.
- `src/lib/evaluation.ts`: `selectRunSessions` / `strategyRunSessions` (the evaluation window, dates validated inside
  the partition, and up to `warmupSessions` strictly earlier sessions as `history`), `loadDatasetSessions` (the same
  from the file, keeping only rows near the window and none after it), the window report, and the access mode
  (`'optimization'` refuses everything but training before reading data).
- `src/lib/csv.ts`: optional time bounds on `loadCsvMinuteBacktestData` (every row is still parsed and order-checked).

**Strategy files (22 minute strategies).** The same mechanical change in each, checked to match exactly once: the
dataset resolver, `strategyRunSessions` after `tickWindowSize`, the reference-high window (and the swing-low window)
read from `history` at `warmup + index`, the first-session skip and the arming guard counting warm-up sessions, the
summary's `dataset` record, and the header comment. `allIn-minute-optimizable.ts` feeds the same warm-up into its
existing `warmup`/`startIndex` mechanism for partition runs and is otherwise unchanged.

**Initialization contract.**

| Strategy files | Warmed up from history (observational) | Never inherited (trading-derived; starts empty in an isolated run) |
|---|---|---|
| allIn-trailingBuy, -noReentry, -bufferedLoss, -bufferedLoss-noReentry, -depthRebound, -invalidation, -persistence, -progressHold, -staged, -episodeBudget | the `tickWindowSize`-session reference high | position, stop, armed/pending setup, loss restriction and its episode low, buffered-loss carry, staged legs, invalidation level, episode budget |
| -postExitContinuation and its four stop variants, -alwaysArmed, -dualMode, -episodeLatch, -troughRecovery, -troughRecovery-postExitContinuation | the reference high | as above, plus continuation windows (need a profitable exit) and correction episodes/latches/troughs (start at a deep arming, which needs being flat) |
| -swingLow | the `swingLookback`-session rolling low (arming) and the reference high (reports only): warm-up = max of both | as above |
| allIn.ts | the reference high (it has no arming warm-up; a cold run uses a partial window) | position, stop, restriction |
| allIn-minute-optimizable.ts | the reference high, via its own warmup history | as above |

Isolated runs start flat with no orders, fills, interest, P&L, marks, trade counts or drawdown before the window, and
nothing after the window is read. `all` is one continuous run. A `holdout`/`final` run is not expected to equal the
matching segment of `all`. Shown by synthetic strategy runs (`src/lib/tests/strategyWarmup.test.ts`): a dip on the
third holdout session arms only with the warm-up; a position bought in November 2023 is carried by `all` but not
inherited by `holdout`, which reports $0 and only window dates.

**Parity against the pre-change outputs** (training and pre-2025-10-17 data only):

| Runs | Result |
|---|---|
| 22 strategy files, VGT `training`; D1 on KRE and XBI `training` | every `trades.csv`, `daily.csv`, `states.csv`, `episodes.csv`, `setups.csv` byte-identical; `summary.json` differs only in `dataFile` (the canonical path) and the added `dataset` record |
| allIn-trailingBuy, D1, allIn on the archived legacy VGT file (2016-10-07 → 2025-10-13); D1 on the legacy KRE file | every file byte-identical, `summary.json` included |
| Dated windows 2019-01-02 → 2023-12-29 (allIn-trailingBuy, D1, swingLow, allIn) | **intentionally different**: the same 1,258 window sessions, now with a warmed reference high instead of a cold start (allIn-trailingBuy 20 → 21 closed trades, D1 14 → 17, allIn 21 → 22; swingLow trades identical, only its report-only reference high in `daily.csv` changed) |
| Multi-ETF allocator, `--dataset training` vs the frozen engine on the archived files cut at 2023-12-29 (fixed and portfolio × all-lowDd and all-primary) | identical: calendars, eligibility index, funded lots, every summary field and daily row |

## 4. Multi-ETF allocator

- Without `--dataset`, nothing changed: the frozen protocol reads the archived files with their pinned hashes, cuts
  at `protocol.commonEnd`, arms from 2017-06-15, and the regression suite reproduces every recorded figure.
- `--dataset training|holdout|final|all` on `fixed` and `portfolio` (`src/multi-etf-allocator/dataset.ts`): canonical
  files for VOOG and the books' symbols over one window with one warm-up (the books' longest lookback, 230 sessions
  for all-lowDd), aligned calendars, sparse-session counts, eligibility max(window start, 2017-06-15), accounting from
  the close of the window's first session (new `accountingStartIndex` in the engine; the default 0 is the protocol's),
  distribution coverage check, output to `evaluations/multi-etf-allocator/<dataset>/<key>/` with `evaluation.json`.
  The eight frozen studies refuse `--dataset`. Tested on synthetic data (routing, refusals, accounting start, loader);
  no real `final`/`all` evaluation was run. One real `holdout` dry run printed the windows and was refused for
  distribution coverage, as designed.

## 5. Test remediation

**Totals.** Baseline: 385 tests, 338 pass, 29 fail, 8 cancelled, 10 skipped. After: **418 tests, 418 pass, 0 fail, 0 cancelled, 0 skipped** (113 suites).

**Every baseline failure** (29 failing tests, 8 cancelled children, 4 failing suites):

| # | Test | Root cause | Disposition |
|---|---|---|---|
| 1 | d1-refinement `equivalence with the recovery-eligibility engine` (suite) | read the training partition, pinned the legacy VGT hash | updated path: the verified archive; the pin is unchanged; passes |
| 2–6, 8, 10, 11 | four-family synthetic: early close, gap, engine = every copy, maximum hold, buffered exit, 240 random scenarios, sliding maximum, never arms before armStart (cancelled) | parents failed (below) | repaired with their parents; pass |
| 7, 9, 12 | four-family `targeted scenarios`, `random synthetic scenarios against the copies`, `reference highs` (suites) | copies are generated from the strategy files by exact text substitution, and the live files were retuned after the program (bufferedLoss-noReentry `tickWindowSize` 90 → 104 → 74, later the dataset plumbing) | legitimately frozen: copies and "unmodified original" runs read the sources as the program froze them, from git (5b032994; allIn.ts 101756b4), verified against the PARITY_AUDIT.md hashes; pass |
| 13–15 | intraday-study `reproduces every allIn.ts output file` (seeds 1–3) | the study engine is frozen at the a1600985 constants (78 sessions, 2.5% …); the live allIn.ts was changed to 90/10%/8% … on 2026-10-16 | the golden master runs allIn.ts at git a1600985 (sha256 71c5c327…, the study's own pin); the helpers the engine imports are unchanged; pass |
| 16 | intraday-study `are byte-identical to the hashes recorded when the study started` | a during-the-study guard; allIn.ts, allin-original.ts, allIn-minute-optimizable.ts, session.ts and csv.ts changed after the study | legitimately archived as an exact provenance check: the incumbent (frozen revision) and the data (archive) must still be the starting bytes; every other change is recorded in `postStudyChanges` with the revision that still holds the starting bytes (verified), except allin-original.ts, whose starting bytes were an uncommitted edit; any unrecorded change fails. The study's own commands still refuse to rerun |
| 17 | intraday-study `reproduces allIn.ts on 2016-10-07 → 2025-10-13 file for file` | as 13–15, plus the legacy file | frozen revision and archive; reproduces 170 trades, $203,405.21; passes |
| 18 | minute-optimizer `allIn.ts and allin-original.ts are byte-for-byte unchanged` | allIn.ts deliberately changed after the study | the protection now covers what the program executes: allIn.ts read from git a1600985 and required to hash to the pin; allin-original.ts still checked live; passes |
| 19 | minute-optimizer `the working copy reproduces allIn.ts … 171 trades, $203,405 net` | ran the live allIn.ts | frozen original and archived data; passes |
| 20–32 | minute-optimizer variants and 12 scenario tests (`Variant pattern not found: /const tickWindowSize = 78;/`) | variants are generated by regex from the live allIn.ts, which no longer has the frozen constants | variants generated from the frozen text; pass |
| 33–37 | multi-etf-allocator regression (frozen inputs, seven phenotypes trade by trade, portfolio A/B, eight combinations, catalogue headline figures) | read the training partitions, pinned the legacy hashes; then the D1 file's pinned hash (its dataset plumbing was edited) | updated path (archive); the D1 pin is checked by `checkStrategyDefinition`: the pinned revision c636e40e plus exactly the documented plumbing edits must equal today's file byte for byte (a one-character rule edit is refused); all five pass, every recorded figure reproduced |
| 38 | multi-etf-d1 `on the XLF development view …` | training partition vs the audited XLF hash | archive; passes |
| 39 | optimizer golden master `on the repository VGT file through 2023` | `data/VGT/VGT-2016-2026.csv` missing | rebuilt in the archive from the trailing-buy research's pinned daily file (lines 2925–5436, sha256 653b0030…); passes |
| 40 | recovery-eligibility `Set 2 and 24 random lattice vectors on the real data` | 11 trades instead of 14: the training partition is shorter than the research file | archive; passes |
| 41 | trailing-buy golden master `checked-in settings (0.5% / 3%)` | `data/VGT/VGT-2016-2026.csv` missing | archive; passes |

No test was deleted, loosened or regenerated; no golden figure changed. Besides those, the 10 tests skipped at
baseline (phenotype reproduction: "the legacy files are no longer in data/") now run on the archive and pass,
reproducing all seven D1 phenotypes trade by trade.

**New and rewritten tests.** `src/data-partition/tests/datasets.test.ts` (13: schema, boundaries and DST, migration,
refusals that keep every original, dry run, resume, verify, import); `src/lib/tests/dataset.test.ts` (rewritten: the
canonical resolver, former paths refused, missing/invalid metadata, optimizer guard, CLI shorthand);
`src/lib/tests/evaluation.test.ts` (10: both boundaries with weekends and holidays, sparse and early-close sessions,
DST, limited history, dates inside the partition, `all`, explicit files, optimization access, bounded loader);
`src/lib/tests/strategyWarmup.test.ts` (3: a real strategy file through `src/app.ts`); and
`src/multi-etf-allocator/tests/dataset.test.ts` (10: `--dataset` routing and refusals, accounting start, the loader).
The old `src/data-partition/tests/partition.test.ts` tested the removed physical partitioner and was replaced.

## 6. Historical reproducibility

`config/archive/legacy-research-inputs.json` lists 11 legacy inputs; `npm run legacy-archive -- build` rebuilt two of
them from their sources byte for byte during this work (VOOG minute, VGT daily), and `verify` confirms all 11.

| Program / study | Status | Evidence |
|---|---|---|
| multi-etf-allocator (frozen protocol) | reproducible exactly | regression suite, 5/5, including the catalogue's recorded headline figures |
| Phenotype D1 configurations (VGT, XBI, XRT, KRE primary/lowDd) | reproducible exactly | reproduction tests (previously skipped) trade by trade |
| multi-etf-d1 | reproducible exactly (inputs and tested segments) | archived hashes equal FROZEN_CANDIDATES pins; segments test passes; sealed holdout not rerun (not to be rerun) |
| d1-refinement, recovery-eligibility | reproducible exactly (tested stages) | equivalence tests pass on the archive |
| four-family | reproducible exactly (engine against its frozen copies) | synthetic suites pass on the frozen sources; holdout not rerun |
| vgt-minute-optimizer | reproducible exactly (golden master, scenarios) | 30/30 tests on the frozen original and archive; final evaluation not rerun |
| vgt-intraday-study | results reproducible exactly; the study's commands not rerunnable as-is | golden master exact on today's library; its commands refuse because session.ts, csv.ts and allIn-minute-optimizable.ts changed after it (their starting bytes are in git at ded57e83 / 0bebfd06) and allin-original.ts held an uncommitted edit (38bd247b…) that is not recoverable |
| trailing-buy-entry, multi-asset optimizer (the VGT-2016-2026 cases) | reproducible exactly | golden masters pass on the archived daily file |
| multi-asset optimizer cases on `VGT-2005-2026.csv`, `QQQ-1999-2015.csv`; trailing-buy-entry inputs `VGT-2005-2026.csv`, `VGT-2026.csv` | not currently reproducible | files absent from `data/` and not derivable from any pinned file (Stooq cases are present) |
| shared-margin portfolio | inputs exact (minute, VGT daily); VOOG daily audit not reproducible | `VOOG-2016-2026.csv` absent; P2s/D1-only paths read the archive |
| allIn-original, allIn-optimizable, ladderUp, ladderDown | not currently reproducible | their daily files are absent; untouched by this work |

## 7. Files changed

New: `data/partitions.json`, `config/archive/legacy-research-inputs.json`, `src/lib/{partitions,evaluation,archive,frozenSource}.ts`,
`src/data-partition/canonical.ts`, `src/legacy-archive/archive.ts`, `src/app/{datasets,legacyArchive}.ts`,
`src/multi-etf-allocator/dataset.ts`, the tests of section 5, this document.
Removed: `src/data-partition/partition.ts`, `src/app/partitionData.ts`, `src/data-partition/tests/partition.test.ts`
(and the `partition-data` npm script; `datasets` and `legacy-archive` added).
Modified: the 22 minute strategy files and `allIn-minute-optimizable.ts` (dataset plumbing only); `src/lib/{dataset,csv,index}.ts`;
`src/data-partition/{cli,scan}.ts`; `src/app.ts` unchanged; phenotype runner, injection anchors, registry, schema
message and tests; allocator `cli`, `context`, `engine` (`accountingStartIndex`), `phenotypes` (definition check);
research loaders pointed at the archive (`four-family/data`, `minute-optimizer/data`, `intraday-study/constants`,
`trailing-buy/constants`, `multi-etf-d1/context`, `shared-margin-portfolio/data`, `optimizer/data/audit`,
`optimizer/goldenMaster`); frozen-source readers (`four-family/{copies,sourceRun}`, `minute-optimizer/goldenMaster`
and its test helper, `intraday-study/{cli,goldenMaster}` and its test); `README.md`, `config/phenotypes/README.md`,
`config/phenotypes/COMPATIBILITY.md`, `.gitignore`, `package.json`. No file under `research/` was modified.

Local, git-ignored: `data/<SYMBOL>/data.csv` (×16) with `migration-report.json`/`dataset-report.json`,
`data/datasets-migration-2026-10-24.log`, `data/datasets-verify-run.json`, the read-only archive,
`.cache/frozen-sources/`.

## 8. Risks and decisions for review

1. **Dated partition runs now warm up.** `allIn-trailingBuy VGT 2019-01-02 2023-12-29` (training) reads the prior
   sessions instead of starting cold, so its results changed (section 3). Whole-partition and explicit-file runs did
   not. An explicit file gives the old cold start if needed.
2. **The first window session of an allocator `--dataset` run funds the portfolio and is not traded,** mirroring the
   protocol's 2016-01-04. The alternative (funding at the prior close) would use a pre-boundary price.
3. **Distribution coverage is strict:** the ledger can't know distributions after 2025-10-13, so `holdout` (ending
   2025-10-16), `final` and `all` need `--allow-uncovered-distributions`. Extending the ledger is a data task.
4. **Frozen research programs default to the archive,** not to the canonical files: they reproduce what they ran
   and refuse otherwise. New work uses the partitions; the archive is never a fallback.
5. **Frozen sources come from git history.** Rewriting history (or a shallow clone) would make those programs refuse.
6. **Provenance of the pre-existing archive files:** written by the interrupted session; accepted only because their
   hashes equal the research pins and the tool rebuilds them from the canonical files.
7. **The NYSE calendar ends 2026-12-31** (`src/lib/calendar.ts`); a refreshed `final` past it needs the calendar
   extended first.
8. Nothing is committed.

## 9. Final verification

Recorded after the last change: `tsc --noEmit` clean; `eslint` 0 errors (16 warnings, all pre-existing, in files this
work did not touch); `npm test`: 418 tests, 418 pass, 0 fail, 0 cancelled, 0 skipped (113 suites).
