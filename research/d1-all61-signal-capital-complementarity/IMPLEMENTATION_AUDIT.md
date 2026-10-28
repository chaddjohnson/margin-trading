# Implementation audit

## 1. Scope and isolation

- Branch `research/d1-all61-signal-capital-complementarity`, created 2026-10-28 from `a37feae` (Study 1's HEAD
  including the user's test-name fix). Changes: `research/d1-all61-signal-capital-complementarity/` (this study),
  `src/d1-signal-capital-complementarity/` (28 modules + `tests/` with 4 test files and fixtures) and **one**
  `package.json` script line `d1-signal-complementarity` (→ `src/d1-signal-capital-complementarity/main.ts`, not
  `src/app.ts`). Nothing else in the repository was edited; the untracked macOS files `._.DS_Store`, `._data` are not
  study files and are not committed.
- The frozen engine and the completed audits' helpers are imported read-only (`runNAllocator`, `ShadowBook`,
  `EntryMachine`, `ExitManager`, `FixedLedger`, `Tracker`, `loadNUniverse`, `loadPool`, `compactLotsOf`, `excursionOf`,
  `catalogOf`, `capturesOf`, `independentOf`, `writeSealed`/`readSealed`, the prospective freeze's
  `normalizedCalendarHash`). No engine semantics changed; the observer only reads a book's state and is checked equal to
  the engine on every run.
- **Protected inputs** (`results/audit/AUDIT.json` → `protected`; rechecked before every stage and by `verify`): no
  tracked file outside the study folders and `package.json` differs from `a37feae`; no untracked file outside them
  (macOS `._*` resource files excepted); `package.json` differs only by the study's script line; all 148 files pinned by
  `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` hash as pinned (the NYSE calendar by that freeze's own
  normalized append-only hash), the `pools` script line and the `imports` map unchanged; sha256 of the 61 canonical data
  files and `partitions.json` and of the 91 git-ignored files of earlier studies unchanged.
- **Effect on earlier studies' guards (expected, not relaxed):** several earlier studies verify a code manifest over
  all of `src/**/*.ts` (e.g. ranked-preemption's `codeManifest`) or an isolation check against their own baseline HEAD
  (the standalone audit's `isolationProblems`, Study 1's doors); the new study files make those checks report changes.
  Per `CLAUDE.md`, verify a historical study at its own commit (e.g. a detached `git worktree` at `1891d32` for Study 1)
  rather than relaxing its guard.

## 2. Freezes, records and hashes

| Record | bodyHash | file sha256 |
|---|---|---|
| `PROTOCOL_FREEZE.json` (protocol v2.1 sha256 `bf58bbda…`, brief `d0db822a…`) | `a8180f13dbc4…` | `10f0a2abd080…` |
| `results/audit/AUDIT.json` | `35c26a68c0f4…` | `f69989bff68e…` |
| `results/registry/candidate-registry.json` | `eba74760b628…` | `d9c4266c6d17…` |
| `results/parity/PARITY.json` (512 checks) | `64412204e364…` | `0f42f3a1fe16…` |
| `results/code_freeze.json` (v1, 32 files, digest `1679c859…`) | `9f3488b0b2c1…` | `dbf99835c8d1…` |
| `results/screen/SCREEN-A.json` | `79726cfad81f…` | `9171090fe17b…` |
| `results/screen/SCREEN-B.json` | `c0c36470d976…` | `b6ae83c50b90…` |
| `results/signals/SIGNALS-2020-06-30.json` | `e67e34ba0a92…` | `e87ef4c215e1…` |
| `results/signals/SIGNALS-2021-12-31.json` | `824ae6c75359…` | `0d29227705d5…` |
| `results/signals/SIGNALS-2023-12-29.json` | `b367c26ab81a…` | `b6513bba86aa…` |
| `results/leveld/LEVELD.json` | `1467a835efc9…` | `44afbc1d35f3…` |
| `results/replays/REPLAYS.json` | `22ebb7b55d60…` | `05e29a31d7e1…` |
| `results/risk/RISK.json` | `29e6251b8e77…` | `c2c540743de3…` |
| `results/analysis/ANALYSIS.json` (v1, superseded by C1) | `8d62993c8953…` | `d1577168056e…` |
| `results/code_freeze-2.json` (v2, amendment C1) | `5032a9a8b367…` | `1c6764382634…` |
| `results/analysis/ANALYSIS-2.json` (governing) | `b857e2800f46…` | `ec52aa4ec1c0…` |
| `results/code_freeze-3.json` (v3, amendment C2, test only) | `7c551d3d7767…` | see `verify` |

Every record is write-once (`writeSealed`: the body hash covers the JSON-safe body; a second write is refused), lists
its guards (protocol-freeze and code-freeze body hashes) and the sha256 of every payload it wrote (`.json.gz`, `.csv`).
`npm run d1-signal-complementarity -- verify` rechecks every seal, every payload hash, the freezes and the protected
inputs, and recomputes nothing. Chronology (UTC): protocol frozen 13:59:38, parity 14:02:38–14:10:18, code frozen
14:12:44, screen A 14:12:56–14:15:21, screen B –14:17:50, signals –14:25:31, Level D –14:25:35, replays –14:28:35,
risk –14:33:57, analysis 14:34:00, C1 logged 14:38:30, code freeze v2 and analysis v2 immediately after; results review
≈14:45–15:05; C2 logged and code freeze v3 at 15:12:58.

## 3. Tests

- **Study tests:** 22 (19 at the code freeze + 3 for C1; C2 changed one test's filter), all pass (`node --experimental-transform-types
  --disable-warning=ExperimentalWarning --test 'src/d1-signal-capital-complementarity/tests/*.test.ts'`); list in
  `SIGNAL_GENERATION_AND_ENGINE_PARITY.md` §5.
- **Repository suite** (`npm test`): before the study 722 tests, 716 pass, **6 fail** (2026-10-28T13:24Z); after: see
  §7 (the 22 new tests added; the same 6 pre-existing failures). All six pre-existing failures open or import the
  lowercase `src/app/allin-original.ts` from `src/trailing-buy/goldenMaster.ts`, `src/minute-optimizer/goldenMaster.ts`
  and `src/intraday-study/` — files the user's partial fix `a37feae` (which corrected `src/optimizer/goldenMaster.ts`)
  did not touch. They are not study defects and were not fixed here (the brief excludes unrelated test refactors);
  the user's correction is preserved.
- Lint (`npx eslint src/d1-signal-capital-complementarity`) and type check (`npx tsc --noEmit -p .`) clean for the
  study's files.

## 4. Parity and fail-closed checks

`SIGNAL_GENERATION_AND_ENGINE_PARITY.md`: 512 scalar parity checks against published anchors (B4/B5 training and
fold windows to the cent, windowed drawdowns, VGT primary, all 206 View P fold-V runs exact, the seven published
View-U-on-B4 rows, post-cutoff mutation, door refusals, split adjustment, determinism); observer = engine on 667
standalone runs; gate replay = engine on 155 fixed runs; minute-drawdown re-derivation, window-share and attribution
identities on every reported run; screen-vs-signal ledger determinism at both cutoffs.

## 5. Reviews and dispositions

| Review | When | Outcome | Disposition |
|---|---|---|---|
| Methodology review 1 (`reviews/METHODOLOGY_REVIEW_1.md`) | before the freeze, protocol v1 | 1 blocker, 7 major, 11 minor; confirmed the gate and busy rules against the engine | all accepted → v2 (`…_DISPOSITIONS.md`) |
| Confirmatory review 2 (`reviews/METHODOLOGY_REVIEW_2.md`) | before the freeze, v2 | 0 blockers, 1 major (thin test by regime), 10 minor/notes; verified the SRC identities and every parity anchor | all accepted → v2.1, frozen |
| Results and implementation review (`reviews/RESULTS_REVIEW.md`) | after the analysis | 3 major (pending C2 / C1 scope disclosure; S1 losses mis-described as cascade; missing scenario risk table), 18 minor/notes on report text; recomputed all 732 Level D summaries (0 mismatches), every replay identity, the screens and the rubric; verdict confirmed | all accepted (`reviews/RESULTS_REVIEW_DISPOSITIONS.md`); reporting fixes only, plus C2 |

## 6. Incidents and deviations (all disclosed)

1. Before the protocol: instrumentation checks reproduced published scalars only (B4/B5 anchors, VGT on VGT, the
   XOP/GDX/XLE map rows).
2. Before the code freeze: an outcome-free smoke test of the later stages on data ending 2018-06-29 (not a study
   window), printing only structural "ok" lines; a unit test caught `screen.ts` still applying an `fo_net > 0` gate that
   protocol v2 had removed — fixed before any screen ran.
3. The parity stage ran on code that was later edited only outside its import closure (the code-freeze record lists
   both sets; no overlap).
4. **Correction amendment C1** after the sealed analysis (its code freeze also covered `freeze.ts` and `cli.ts` —
   the amendment machinery — disclosed late, at the results review): label and reshuffle-count bookkeeping in `analysisStage.ts`
   did not follow PROTOCOL §9.1–9.2 (NC replays excluded from labels; a looser reshuffle definition; stray qualifiers);
   demonstrated by `tests/rubric.test.ts` (2 of 3 failed on the frozen code), fixed, code re-frozen (v2, amends v1; no
   file of parity's import closure changed), analysis rerun as `ANALYSIS-2.json`. The verdict is unchanged and could
   not change (NC never counts; no replay met C). Every other record is unchanged.
5. **Correction amendment C2** (test only): the protected-input test raced with `src/minute-optimizer`'s
   golden-master test (transient files under `research/vgt-minute-optimizer/tmp/`) in the full suite; fixed, code
   freeze v3; no record changed.
6. Note N1: the materiality floor uses the worst own loss's magnitude (identical to PROTOCOL's "|worst own lot|" on all
   18 replays).
7. Report drafts were checked against the sealed records before delivery; corrected statements are listed in
   `CHRONOLOGICAL_AND_MULTIPLE_TESTING_LIMITS.md` §5 and in the results review's dispositions.

## 7. Final state (2026-10-28, before the commit)

- `npm run d1-signal-complementarity -- verify` (15:13Z, under code freeze v3): every check passed — protocol and code
  unchanged since their freezes, protected inputs unchanged, all 18 sealed records verify, every listed payload hashes
  as sealed.
- Study tests 22 / 22 pass. Repository suite (`npm test`, 15:14–15:16Z, log `results/logs/final-tests-2.log`, local):
  **744 tests, 738 pass, 6 fail** — exactly the 6 pre-existing failures (`src/trailing-buy/tests/goldenMaster.test.ts`
  4, `src/minute-optimizer/tests/goldenMaster.test.ts` 1, `src/intraday-study/tests/study.test.ts` 1; all the
  lowercase `allin-original.ts` reference). Before: 722 / 716 / 6. Difference: +22 study tests, all passing.
- Commit and push: recorded in `RESEARCH_RECOVERY.md` after they happen.
