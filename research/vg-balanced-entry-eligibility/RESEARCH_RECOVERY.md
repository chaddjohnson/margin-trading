# RESEARCH_RECOVERY — vg-balanced-entry-eligibility (Priority 1: bounded D1 entry eligibility for VG #2 Balanced)

## Top screen

- **Updated:** 2026-11-07T23:48Z (UTC, from `date -u`)
- **Status:** **COMPLETE** — every stage S0–S11 is done. Result: **no useful benefit**; the frozen selection keeps OFF.
- **Authority:** `brief/BRIEF.md` sha256 `55718a6892d07fb1cc95309eff6c843f82d1619da51385ee7dc2e1ed168a76eb`.
  `PROTOCOL.md` sha256 `9636fc1f2ffef03aa579c68a4be6671345de04e3f837f41a28046470736213b4`, frozen 2026-11-07T23:19:00Z
  (`results/protocol-freeze.json` sha256 `0532f2a67254138eb00e3d57957dfe24b8ac48e5edb2802a7aa7e6a07b505075`).
  Amendment head: E2.
- **Sealed:** `FROZEN_SELECTION.json` sha256 `8aba2d5ecdd0f2bdc6d7694bf9c7e54baa42bf03d85e3ebfc1dcc91857214943`,
  read-only, committed in `8dc2710` before validation. The validation is sealed (`results/seals.jsonl`).
- **Running processes:** none (every unit `vgbe-*` has finished).
- **Next action:** none authorized. The follow-up gate is the user's (and ChatGPT's) decision on REPORT.md's
  "Priority 1 review — decision before Priority 2". Pushing the branch also needs the user's answer: the brief forbids
  pushing, while the wrapper mentions a push.

## Environment

- Main checkout `/home/chad/projects/margin-trading`; no extra worktree.
- Branch `research/vg-balanced-entry-eligibility`, from `b3689d9`. Commits: `33efd7d` (freeze), `8dc2710` (selections,
  diagnostics, frozen selection), and the final commit (report and validation).
- Node v24.21.0 (`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`).
- Host: 59 GiB RAM, 16 CPUs. Units capped at `MemoryHigh=44G MemoryMax=48G MemorySwapMax=0`, run one at a time.
- Data, unchanged throughout:
  - `data/VGT/data.csv` `2ee06310…412e`
  - `data/GDX/data.csv` `77dba9b2…5049`
  - `data/partitions.json` `43893f3d…efa6`
  - Both files end on 2026-10-30.
- Physical doors D19/D21/D23/D24 are pinned in `results/doors-pins.json` (`46136dd4…b614`); the door files themselves
  are in `.cache/vg-balanced-entry-eligibility/doors/` (git-ignored, regenerable with `build-doors`).

## Stage table

| Stage | Status | Command / output | Do not rerun? |
|---|---|---|---|
| S0 setup | complete | branch, brief copy, checkpoint | — |
| S1 control | complete | Study 8 runner, dev, full and 2026-10-29 (reconciliation PASS); `results/control/` | read-only |
| S2 parity | complete | `parity` (exact, 5 doors, 2 paths), `runner-parity` (byte-identical); `results/parity/` | safe |
| S3 Phase A | complete | `audit` → `results/audit/` (14 refusals; 1 first-order survivor) | safe |
| S4 freeze | complete | `freeze` 23:19:00Z | **never** (refuses) |
| S5 pilot | complete | `results/pilot/PILOT.md` | pilot- only |
| S6 searches | complete | C19 `3d2e6a35…`, C21 `882cee53…`, C23 `efe5f317…`, C24 `350c5107…` (sealed): OFF everywhere | **never** (refuses) |
| S7 fold evaluations | complete | `folds/C19|C21|C23/evaluation.json` (sealed) | **never** |
| S8 diagnostics | complete | `results/diagnostics/D24/` (report-only) | — |
| S9 frozen selection | complete | `FROZEN_SELECTION.json` | **never** (refuses) |
| S10 validation | complete | `results/validation/validation.json` (sealed `c2716bd1…`): OFF = reference in 2025–2026 ($74,688.80, Δ 0) | **never** (one opening) |
| S11 report and checks | complete | `REPORT.md`, `README.md`, `RUN_COMMANDS.md`, `results/charts/charts.html`, example explore-9, tests, `results/MANIFEST.sha256` | — |

Seeds: `deriveSeed('vg-balanced-entry-eligibility', …labels)`. The labels are in PROTOCOL.md §6 and §9; for example
`('explore', fold, set, A, e)` and `('d1', 'confirm')`.

## Final checks

- Study tests: 25 pass, 0 fail (`node --test src/vg-balanced-entry-eligibility/tests/*.test.ts`).
- `tsc --noEmit`: clean. ESLint (study and tools): 0 errors, 2 warnings (`no-use-before-define` on a closure).
- Repository suite (`npm test` in unit `vgbe-s11-npm-test`, 23:43–23:48Z, log `results/logs/npm-test.log`): 1,255 tests,
  1,244 pass, 7 fail, 4 skipped. The 7 failures are the known pre-existing ones: the lowercase `allin-original.ts` path
  ×6 (`intraday-study`, `minute-optimizer` and 4× `trailing-buy` golden masters), and the Study 7 runner's
  reconciliation pinned to a 2026-10-29 data end. They are not regressions; the count is 1,230 + this study's 25.
- Strategy Lab: no server process was running at the end; `state/strategy-lab/` was last modified 22:26Z, before this
  task, and was not touched.

## Disclosures

- Before the protocol, the existing control run (made before this task) showed 14 refusals, all in 2020–2022 and none
  in 2023–2026. The validation was therefore expected not to exercise the feature (PROTOCOL.md §3).
- R1: the Phase A field-name defect, fixed before use. R2: report-only engine options. R3: the period-tracker start
  defect (report-only). E1: the pool's dead-worker hang, found by the pilot (the first kill test was vacuous; redone).
  E2: diagnostics and validation code written after the freeze; with no role holder, the reference stood in for the
  report-only validation perturbations.
- The pilot's archives (D24, eligibility ON) were compared for equality only and never read for results.
