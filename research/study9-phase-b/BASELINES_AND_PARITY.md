# Study 9 Phase B — baselines and engineering parity

Every figure in §1–§2 comes from the sealed parity record `results/parity/parity.json` (file sha256
`878c2d5fac0215ac…`; chain entry 3 `parity`, `42c722d3fbc6…`), produced by `scripts/s9b.sh parity` **attempt 2**,
2026-11-03T00:03:15Z → 00:31:22Z (1,684 s). Every door ended on or before 2024-12-31 on the training projection (or a
leakage-test copy of it); no bar after 2024-12-31 entered any strategy computation before the selection. The
test-door parity of §3 runs inside the test stages.

**Attempt 1** (2026-11-02T23:32:30Z → 2026-11-03T00:02:21Z, run folder `results/parity/run-2026-11-02T233235904Z/`)
passed every gate except N2, whose cache-header comparison included the door's label (`doorKey`), which differs by
design between the projection-side and the injected-copy door; every data, record, fit, search and power check of N2
passed. Fixed as amendment **E1** (`AMENDMENTS.md`; chain entry 2 `code-E1`). Nothing was sealed by attempt 1.

Accounting throughout: one fixed $100,000 funded slot, 11% simple interest on the principal (365-day year), 5 bps per
side unless stated, stops at the stop or the gapped open, accounting from the close of 2016-01-04, arming 2017-06-15.

## 1. Gates (PROTOCOL.md §10) — all passed

| Gate | Result | What was checked |
|---|---|---|
| PA | pass | Phase A's own `verify-chain` (head `a1e912a2b5fd2556`); Study 8's sealed chain files all hash to its chain |
| S8C | pass | the 159 live Study 8 code and engine files (including `src/lib`) equal Study 8's last sealed acknowledgement `code-E1.json` |
| RB | pass | the 12 imported rulebook groups equal the values sealed in Study 8's `FROZEN_SELECTION.json`; the period list, years, half-years and primary fold are Study 8's own objects |
| E1 | pass | the 13 projection files equal Phase A's manifest and are byte prefixes of the canonical files; the five B5 files' Study 8-pinned-length prefixes equal Study 8's pins; 0 canonical bytes after 2026-10-30 in all 13 files |
| P1 | pass, **348 comparisons, 0 differences** | the production replay (`P9Evaluator`) against the authoritative `runNAllocator`: all seven memberships × 5 configurations × 0/5/10 bps × W19/W21/W24 (315); the 14% / next-open / +25 bps stresses on one configuration per membership at W24 (21); a tie-heavy identical-vector pool per membership at 5 bps W24 (7); and frozen B1, B5, VG and Study 8 VG #1/#2 at 5 bps W24 (5). Refusals in every membership (221–2,580 per membership); same-minute decisions 114 in total (G4-EWW 30, V3-IWM 48, VG3-IWM 30, N2-SMH 4, N3-EDV 2; none arose in G4-ILF and N2-EDV) |
| P2 | pass | this evaluator equals Study 8's on every record field, base and next-open, for B1, B5, VG, VG #1, VG #2 and four random B5-subset configurations |
| P3 | pass, **61/61** | every Study 8 sealed F24 training-door centre (candidates and controls of its six tracks) to the cent: net, minute and daily DD, lots, episodes |
| P6 | pass | the minute-series port equals Study 6's on the five frozen configurations; it reproduces the tracker and the replay's lots on all seven memberships |
| A1 | pass | the ported space and designs under Study 8's namespace return Study 8's own Sobol screens, joint LHS and clip / in-box / 0.5r / 1.5r / k = 8 / k = 16 / norm-matched / per-book neighbourhoods exactly |
| A2 | pass | the ported evidence under Study 8's namespace reproduces Study 8's sealed F24 qualification evidence and gates of VG #1 and VG #2 exactly (floors included) |
| A3 | pass | the ported optimizer under Study 8's namespace reproduced Study 8's sealed VG-F19 search record field for field (screen, islands, triggers, rungs 2–3, refinement, shortlist, controls) and its archive, in 1,459 s |
| A4 | pass, 10/10 rows | the ported test stage under Study 8's namespace reproduced Study 8's sealed F23 and F21 test records — evidence, sensitivities, gap risk, gates, status, Study 7-equivalent gates — for the first G, VG and VXRG holder and two lite members (one pooled) per fold |
| N1 | pass, 108 checks | at 2019-12-31, 2020-12-31, 2021-12-31 and 2023-12-29: closed lots, entries, refusals and daily marks through the cut session, and per-book closed trades, equal the full training run's (base, next-open, +25 bps) |
| N2 | pass, 5 cuts | a copy of all 13 projection files with every bar after the cut replaced by a synthetic crash gave identical door ids, prefix hashes, point records (30 per cut, including a configuration holding a lot open at the cut), full marks, lots, refusals, rung-1 fits for all seven memberships, cache identities and (2019-12-31, 2024-12-31) smoke-search bodies; read past the cut outside the door, results changed (power) |
| C1 | pass | 200 cached records reloaded identically and recomputed equal; a foreign job, door id or engine hash is refused |
| D1 | pass | a smoke-budget search fresh twice and stopped after 3,000 points and resumed: identical bodies and archives (`d41abf210dfa…`) |
| T0 | pass | the test-stage pipeline twice on a parity door (F23 geometry, primary branches): identical sealed forms; every holder carries the minute series, gap risk and 8 bootstraps |
| G1 | pass | 12 refusals, each with its expected reason (search before parity, test doors, the pilot after the freeze, an end after 2024-12-31, a fixed-end override, slice, post, a smoke door, a foreign symbol, a leak root on a search door) |
| L1 | pass | only `door.ts`, `integrity.ts`, `parity.ts`, `context.ts` and the post-test `diagnostics.ts` name the data root or call the loader |

**What these gates establish.** The fast replay is the authoritative N-book engine for the seven memberships
(P1); the evaluator is Study 8's (P2, P3); and the ported optimizer, neighbourhood designs, evidence and test stage are
Study 8's literally (A1–A4: under Study 8's own seed namespace they reproduce Study 8's sealed records). Only the seed
namespace, the book order, the tracks, the doors and the comparators differ in production. No training door can see
a later bar (N1, N2).

## 2. Data and conventions

- **Data:** the 13 symbols' training projection files (`data/vintages/study9-train-2024/`, Phase A) and canonical
  files (`data/<SYMBOL>/data.csv`, all ending 2026-10-30) are pinned at the freeze (full projection hashes; canonical
  prefixes through the last 2026-10-30 bar).
- **Distributions:** no distribution ledger is loaded; the user's modified `config/market-events/distributions.csv`
  enters no computation (the fixed one-slot engine books none).
- **Inherited suite:** `npm test` reads post-2024 data in this checkout; it is run only after `test-F24-confirm`
  (§4).

## 3. Test-door parity (TP1 on every fold, TP2 on F24)

Each test stage ran its parity before computing any test evidence and refuses to seal on a difference; the results
are in each record's `testParity` (`results/test/<FOLD>/test.json`).

| Fold | TP1 comparisons (production replay vs `runNAllocator`, every field and lot) | Differences | TP2 |
|---|---|---:|---|
| F19 | 71 = 22 role holders × (base, next-open, +25 bps) + 5 controls (base) | 0 | — |
| F20 | 77 = 24 × 3 + 5 | 0 | — |
| F21 | 98 = 31 × 3 + 5 | 0 | — |
| F23 | 92 = 29 × 3 + 5 | 0 | — |
| F24 | 109 = 32 × 3 + 13 controls | 0 | **13/13**: B1, B5, frozen VG, VXR, VXRG, G-PA and Study 8's seven sealed F24 holders reproduce Study 8's sealed F24 test centres to the cent (net, minute and daily DD, lots, episodes, ledger signature, test-window net) |

The F24 stage was then repeated in a fresh memory cache (`s9b.sh test F24 --confirm`, chain entry 15):
`results/test/F24/confirm.json` is **IDENTICAL** to `test.json`.

The runner (`src/study9b-runners/`, `npm run study9b-run`) reproduced the sealed figures through the unchanged pools
engine at 2026-10-29 / 5 bps: 36 configurations and 1,854 funded lots, 0 mismatches
(`results/runner/reconcile-2026-10-29.txt`). The references differ by configuration:
- **The 32 role holders, VG #2 and VG #1 (34 configurations):** reconciled, totals and every lot, against Phase B's
  sealed F24 test record and its lot ledger.
- **B1 (`vgt-primary`, 21 lots) and B5 (`b5-frozen`, 95 lots):** the delegated Study 7 runner reconciles them against
  Study 7's sealed final door, which ends on the same 2026-10-29 with the same conventions. The figures equal Phase B's
  F24 record (TP2 above).
- **The other nine F24 controls** (frozen VG, VXR, VXRG, G-PA and Study 8 #3, #8, #12, #15, #25): not
  runner-reconciled. TP2 reproduced their centres inside the test stage.
- **Shortlist members without a role:** compared on totals only (no sealed per-lot ledger exists for them).

Its acceptance runs (`results/runner/edge-cases.txt`, from `tools/runner_edge_cases.sh` at 10:13Z after the final
runner changes; full logs in the git-ignored `evaluations/study9b-runs/edge-cases-20261103T101302Z/logs/`):
- **Refused (exit 2):** a future `--end`, an impossible date, an unknown member, an empty role, the `-best` of a
  track whose holders all failed, and an existing `--out`. Each case shows its message.
- **Reconciled (PASS):** `--end 2026-10-29` on the nominee and on `s8-vg-balanced`.
- **Labelled "RECONCILIATION: not applicable":** the default end (2026-10-30, also labelled LATER LOCAL DATA),
  `--cost-bps 10` and `--end 2024-12-31`.
- **`compare --all`:** ran 9 configurations: the 5 tracks with a non-failed holder and the 4 comparators. N3-EDV and
  N2-EDV have no best candidate.
- **Synthetic unit test:** incomplete sessions, later ends and missing files, on Phase B-only ETFs
  (`src/study9b-runners/tests/runners.test.ts`).
- **Pin statuses:** appended and changed-history data pins are reported as such (`pins.ts`; unit-tested).

## 4. Known inherited failures and tests

- **Phase B unit tests:** `src/study9-phase-b/tests/study9b.test.ts` (14) and `src/study9b-runners/tests/runners.test.ts`
  (5, including the synthetic incomplete-session test): 19/19 pass (last run 2026-11-03T10:15Z, after the final
  runner changes of E4/E5).
- **Static checks:** `npx tsc --noEmit -p .` exit 0; `npx eslint src/study9-phase-b src/study9b-runners` 0 errors,
  0 warnings; `npx prettier --check` clean.
- **Inherited suite `npm test`** (run once the embargo ended, after `test-F24-confirm`; it finished
  2026-11-03T09:05:14Z after 119.6 s; output `results/runner/npm-test.txt`): **943 tests, 932 pass, 7 fail, 4 skipped,
  0 cancelled.** Every failure is pre-existing and unrelated to Phase B:
  - **6 failures** read `src/app/allin-original.ts`, which the user's commit `86d2b2d` ("Temp renaming file",
    2026-10-17) renamed to `allin-original2.ts`:
    - `src/intraday-study/tests/study.test.ts:19`;
    - `src/minute-optimizer/tests/goldenMaster.test.ts:36`;
    - `src/trailing-buy/tests/goldenMaster.test.ts:39`, `:49`, `:58` and the checked-in-settings case.
  - **1 failure,** the Study 7 runner's "parity with the sealed Study 7 final door"
    (`src/study7-runners/tests/runners.test.ts:148`). It runs `gdx-robust` to the default end, which since Phase A's
    2026-10-30 append is 2026-10-30, after the Study 7 runner's sealed end (2026-10-29). Its reconciliation is
    therefore "not applicable" and the test's `applicable === true` assertion fails. This is a data-vintage effect from
    before Phase B; Phase B changed no data.
  - **The 4 skips** are tests whose own guards skip them when frozen canonical data are absent or changed (the
    2026-10-30 append), or that are marked SKIP.
  - Nothing was "fixed" to make the suite green: the renamed file belongs to the user, and the Study 7 runner is
    frozen.
