# Execution and integrity

Sources: `results/parity/parity.json` (body `795fc0c209a7…`, file `e2a0e289…`), `results/protocol_freeze.json`,
`results/doors.jsonl`, `AMENDMENTS.md`, the test logs under `results/runlogs/`. All figures come from those records.

## 1. Engine and conventions (unchanged)

- **Fast path:** each book's virtual-trade trace (`src/portfolio-aware-d1/trace.ts` `traceBook`) is computed with the
  run's own cost, interest, stop fill and stop slippage, then funded by the causal fixed-pool replay
  (`replay.ts` `replayFixedPool`). Friction and interest therefore enter the path-dependent exits, as in the engine.
  Nothing is subtracted afterwards.
- **Authoritative engine:** `runNAllocator` (`src/portfolio-aware-d1/nbook/engine.ts`, the engine of
  `npm run pools`).
- **Allocator:** one funded $100,000 slot; shadow books that commit every signal; first executable signal wins;
  same-minute ties alphabetical; no compounding.
- **Financing and fills:** 11% simple interest on a 365-day year; 5 bps per side; stops fill at the stop or at the
  gapped open.
- **Calendar:** arming 2017-06-15; accounting from the close of 2016-01-04.
- Study 7 adds only its own evaluator records (`src/study7-stability-first-d1/evaluate.ts`). No engine file was
  edited.

## 2. Engineering gates (stage `parity`, 2026-10-31T23:45–23:50Z; all passed)

| Gate | What was compared | Result |
|---|---|---|
| **P1** replay = full N-book engine | Compared field by field: lots, signals, virtual trades, daily rows, both drawdowns and net. Configurations: B1, VG, VXR, VXRG, B5, GDX `portfolioAware` alone and Study 5 near-miss 1 alone, at 0/5/10 bps on W23 and W29; 8 random joint perturbations each of VG, VXR and VXRG (W29, 5 bps); VG and VXR at 8% and 14% interest, `next-open` stops and 25 bps stop slippage | 74 comparisons, **0 differences**; the Study 7 evaluator equals the engine on every one |
| **P2** Study 7 records = Study 5 evaluator | net, minute DD, daily DD and lots on the same 74 runs | all equal |
| **P3** anchors | `npm run pools -- fixed B5 --end 2026-10-13` = $486,207.77 / $26,509.97 / 94 lots (the B5 regression anchor), and the evaluator equals it. B5 W29 = $484,636.97 / $26,509.97 / 95 lots, equal to Study 6 A2. B1 W29 = $176,260.47 / $19,534.41 / 21 lots and B1 W23 = $135,359.04, equal to Study 6 A5 | passed |
| **P4** data | sha256 of the five files (below); prefixes through 2026-10-13 equal the B5 pins; 2,722 sessions ending 2026-10-29 | passed |
| **P5** GDX control provenance | Vector IDs of G-PA, G-TS, G-SR, G-NM1–3, G-T1P and G-T1S equal the recorded IDs. Grids equal Study 5's sealed Study A evidence and its Study B `FROZEN_SELECTION.json`. DEV net, VAL net and minute DD of the six Study A controls equal Study 5's sealed validation record to the cent. The frozen grids equal `config/phenotypes/D1/*.json` for the B5 roles | passed |
| **N1** no-lookahead | 60 random single-book traces (12 per symbol, 1,152 closed trades) and 7 pools (188 funded lots), on a run truncated at 2021-12-31 (training partition) against the full-history run. Every trade and funded lot closed by the cut is identical, the decisions agree, and the daily marks are equal to the cut | passed |
| **C1** cache invalidation | The trace key changes with cost, rate, stop fill, slippage, arming, window end and data hash. The point-cache header refuses another door identity and another engine hash. 200 cached records equal a fresh recomputation byte for byte | passed |
| **D1** deterministic restart | A reduced-budget VG search on the `parity-F19` door, run twice from empty caches and a third time stopped after 3,000 fresh points then resumed. Body sha256 `b7600d69…` and archive sha256 `e7097b48…` are identical in all three runs | passed |
| **G1** door order | During parity, `diag`, `search-M`, `search-L`, `test-M`, `final` and `pilot` all refused to open | passed |

The first parity attempt crashed in P5 before writing any record, on a field-name bug in the registry check. It was
fixed and the stage re-run from the start (`AMENDMENTS.md` E1). P1–P4 had already passed in the crashed attempt.

## 3. Data (append-only integrity)

| Symbol | Rows | sha256 (first 16) | Prefix through 2026-10-13 = B5 pin |
|---|---:|---|---|
| VGT | 934,959 | `624e4094a988bd01` | yes |
| XBI | 1,180,065 | `83b71f75a58a01c8` | yes |
| XRT | 1,073,016 | `c625ca57b1bf6219` | yes |
| KRE | 1,131,568 | `fd7ab8aa365cbb86` | yes |
| GDX | 1,489,753 | `134b74506f190f43` | yes |

- **Calendar:** 2,722 NYSE sessions, 2016-01-04 → 2026-10-29.
- **Market-event files:** splits `e5bde427…`; partitions `43893f3d…`.
- **Distributions:** the distribution ledger read by the loader is the user's uncommitted
  `config/market-events/distributions.csv` (`30feaa99…`). It was never written. The fixed pool books no
  distributions, and the ledger's hash is part of every door identity.

## 4. Determinism and resumption in the real runs

- **`final --confirm`** repeated the whole final stage from an empty in-memory cache. Its nominations, controls,
  shortlists, W13 figures and flags are **identical** to `final.json`: "IDENTICAL to final.json", `results/runlogs/
  final-confirm.txt`. Sealed bodies: final `cc609b0d62a0…`, confirmation `827f635f472e…`. They differ only in the
  stage name, timestamps, run statistics and the lots-file name.
- **The unchanged pools engine reproduces the final record.** Rank-1 nominee `S7-VG-L-19`, run as `npm run study7 --
  pool fixed S7-VG-L-19`, gives $284,271.14 net, $28,297.09 minute DD and 63 lots, equal to `final.json`.
- **No job was interrupted.**
  - All 18 Phase B searches, 16 validations, 45 Phase A jobs and both final runs ended `exit 0` on their first run,
    except the parity attempt of `AMENDMENTS.md` E1.
  - The resume path is proven by gate D1 (stop after 3,000 points, resume, identical output).

## 5. Tests and regression checks

| Check | Result | Log |
|---|---|---|
| Study 7 unit tests | 8 pass, 0 fail. They cover the constants against the protocol tables, floors, designs (clip, in-box, count- and norm-matched), the violation with the strict ceiling, the Wilson bound, budgets, control IDs, door refusal | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study7-stability-first-d1/tests/study7.test.ts` |
| `npx tsc --noEmit -p .` | clean | — |
| Inherited suite, data-less worktree, Study 6 head `418208e` | 831 tests: 780 pass / 8 fail / 28 cancelled / 15 skipped | `results/runlogs/tests-inherited-dataless-base.txt.gz` |
| Inherited suite, data-less worktree, Study 7 lock `e6aebab` | 839 tests: 788 pass / 8 fail / 28 cancelled / 15 skipped. The **failure set is identical** to the base, and the 8 new tests are Study 7's | `results/runlogs/tests-inherited-dataless-head.txt.gz`, `tests-inherited-failures-{base,head}.txt` |

- **Why the inherited suite fails in the worktrees:** the 8 failures and 28 cancellations are inherited suites that
  need `data/`. The suite was run only in data-less worktrees (repository memory: `npm test` reads post-2023 bars when
  `data/` is present).
- The worktrees were removed after the run.

## 6. Data doors (`results/doors.jsonl`)

| Door | Openings | By |
|---|---:|---|
| `pilot` | 2 | the pre-freeze pilot; the pre-freeze evidence smoke test |
| `search-F19` | 7 | 3 pre-freeze optimizer smoke tests (made before the door keys were split into `smoke-F19`; PROTOCOL.md preamble item 3); the 4 fold-F19 searches |
| `parity`, `parity-M`, `parity-F19` | 6, 1, 4 | both parity attempts; the N1 truncated run; the D1 restart probes |
| `diag` | 45 | Phase A (frozen configurations only) |
| `search-F20`, `search-M`, `search-L` | 4, 5, 9 | each fold's searches (Track V in M and L); fold-L validation (4) |
| `test-F19`, `test-F20`, `test-M` | 4 each | validation, opened after every search was sealed (01:14Z) |
| `final` | 4 | the final stage (W29 and W13) and its `--confirm` repeat, after `FROZEN_SELECTION.json` (01:24:05Z) |

No search, validation or selection process opened any bar after 2023-12-29. The first opening of the full history for
a Study 7 candidate was the final door at 2026-11-01T01:24:33Z.

## 7. End-of-study hashes (unchanged from the start)

| Object | Hash (first 16) |
|---|---|
| `data/VGT/data.csv` | `624e4094a988bd01` |
| `data/XBI/data.csv` | `83b71f75a58a01c8` |
| `data/XRT/data.csv` | `c625ca57b1bf6219` |
| `data/KRE/data.csv` | `fd7ab8aa365cbb86` |
| `data/GDX/data.csv` | `134b74506f190f43` |
| `config/phenotypes/D1/{GDX,KRE,VGT,XBI,XRT}.json` | `ed98c23c…`, `6b8889e2…`, `3e77a419…`, `453c4fd0…`, `d7b7f222…` |
| `config/pools/B4.json`, `B5.json` | `4ca5aa1a900bc959`, `deef53ca53111806` |
| `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` | `0dabd97e2b3d50fe` |
| Study 5 / Study 6 `FROZEN_SELECTION.json` | `3837d814b29cd645` / `8761419813287e56` |
| splits / partitions / distributions (user-modified, untouched) | `e5bde427…` / `43893f3d…` / `30feaa99…` |

**Code after the freeze** (`results/protocol_freeze.json` digest against the end):
- `parity.ts`: the field-name fix (AMENDMENTS E1), before the parity record was sealed;
- `commands.ts`: two tooling commands registered;
- `poolrun.ts`: added (tooling).

Every module that produced a sealed Phase A, B, D or final record is byte-identical to the frozen digest: `evaluate`,
`fitness`, `designs`, `search`, `evidence`, `validate`, `select`, `final`, `phaseA`, `data`, `gates`, `context`,
`space`, `stats`, `records`.
