# RESEARCH RECOVERY — Priority 3: VGT + GDX, D1 + Growth in one shared $100,000 pool

## Top screen

- **Updated:** 2026-11-09T06:07Z (UTC, from the clock). **Status: COMPLETE** — every stage sealed, the validation run
  once, the report written. **Follow-up gate:** the user's review before Priority 4 (nothing started; see the review
  points at the end of `REPORT.md`).
- **Conclusion:** a negative result.
  - The frozen primary `C24/informed#1 profit` ($338,642.84 / $20,393.61 on development) lost $32,190.25 on
    2025–2026, with a $57,568.06 DD (V1–V3 fail).
  - The independent procedure is chronologically unsupported (−$61,544.61, sequential DD $102,257.90).
  - No combined system credibly improved on VG #2.
- **Brief:** `brief/BRIEF.md`, sha256 `4554b859e71eda0cbb66ba8dc2c085ab38c208c6facff9fd8fb7c2a03513aac7`.
- **Branch:** `research/vg-d1-growth-joint` (main checkout), from `d61e6bea`. **Pushed** (CLAUDE.md delivery
  instruction, no confirmation needed): `git push origin research/vg-d1-growth-joint` at 2026-11-09T06:07:17Z, new
  remote branch, first attempt, outside the sandbox; `git ls-remote` = local = `45b16e34f6c91f616a173435ab9855c887a4e7a8`.
  No merge, no PR, no deployment. This push record is its own follow-up commit, pushed the same way.
- **Running processes:** none (`systemctl --user list-units 'vgjoint-*'` is empty).
- **Next step:** none in this study. A new question needs a new study namespace; completed records are never rerun or
  edited.

## Authority and sealed records (sha256)

| Record | sha256 | Commit |
|---|---|---|
| `PROTOCOL.md` (frozen) | `f9f8b79a49f833263d898126c7c27f82d43af05731686b81abbc3b8a1edcbfc8` | `6cf50085` |
| `results/protocol-freeze.json` (frozen 2026-11-09T00:16:54Z) | `69d30c4183850698b138b1d9f168d7704c0ef83a6709f205b8829867090eb704` | `634c75a0` |
| `CONTROL_MANIFEST.json` (before any combined control was evaluated) | `0f40efd76aec8ec10a504fb2cf508891a572061df51db065363a910fb68adaa1` | `1c867708` |
| `results/parity/parity.json` (495 checks, 0 failed) | `ff27c91d…` | `6cf50085` |
| `results/search/C19/indep.json`, `folds/C19/selection.json` | `a8cb4905…`, `e7b8def9…` | `686e9075` (before the C19 slice) |
| `results/search/C21/indep.json`, `folds/C21/selection.json` | `78e185f4…`, `65159c76…` | `dc611c07` (before the C21 slice) |
| `results/search/C23/indep.json`, `folds/C23/selection.json` | `21454d06…`, `bdb782a5…` | `1eb54415` (before the C23 slice) |
| `results/folds/C19|C21|C23/evaluation.json`, `folds/sequential.json` | `53e2ed20…`, `58b34deb…`, `a233a677…`, `5c66b9a7…` | `99d8d161` |
| `results/search/C24/indep.json`, `search/C24/gpair.json`, `gpair/C24/selection.json` | `813fb96a…`, `ffe03d0e…`, `c833c85d…` | `6d6f86c1` |
| `results/search/C24/informed.json`, `folds/C24/selection.json`, `diagnostics/D24/diagnostics.json` | `b30fd648…`, `32953b91…`, `3e18a20f…` | `ea7c85b6` |
| `FROZEN_SELECTION.json` | `e29e35e290c1f9a424410b02c048889021fa818f16c324085bae8bf5bdcebfe2` | `52a2ecb9` (before the validation) |
| `results/validation/validation.json` | `77328e9c…` | `1cf2bb8a` |

`npm run vg-joint -- verify`: 21 sealed records ok (2026-11-09T06:06Z). Standard 1.0.0 (`8c38ac15…639d`); the
preflight passes (the §1.8 departure D1 is recorded with the brief's agreement).

## Stage table (all complete; sealed stages refuse a rerun)

| Stage | Unit | Time (UTC, 2026-11-09) | Fresh evaluations |
|---|---|---|---:|
| Parity (sealed) | vgjoint-parity | 00:14:53 → 00:15:59 | 495 checks |
| Pilot | vgjoint-pilot-* (`chains/pilot.sh`) | 2026-11-08T23:39 → 00:14 | — |
| C19 arm-D search / qualification / fold evaluation | vgjoint-search-C19-indep, -qualify-C19, -eval-C19 | 00:17 → 00:59 | 340,770 + 21,455 |
| C21 | … | 00:59 → 01:58 | 328,647 + 22,894 |
| C23 | … | 01:58 → 03:19 | 350,673 + 22,908 |
| Sequential | vgjoint-sequential | 03:19 | — |
| C24 arm D | vgjoint-search-C24-indep | 03:19 → 04:48 | 367,836 |
| C24 arm B and its selection | vgjoint-search-C24-gpair, -qualify-gpair-C24 | 04:48 → 05:25 | 171,712 + 16,359 |
| C24 arm C | vgjoint-search-C24-informed | 05:25 → 05:48 | 91,839 |
| C24 qualification, diagnostics | vgjoint-qualify-C24, -diagnostics | 05:48 → 05:57 | 42,123 |
| Frozen selection (by hand, inspected, committed) | vgjoint-freeze-selection | 05:57:44 | — |
| Validation (FULL, once) | vgjoint-validate | 05:58:14 → 05:59:08 | 924 |
| Full `npm test` (contained) | vgjoint-npm-test | 06:00 → 06:05 | 1,314 tests: 1,303 pass, 7 known pre-existing failures, 4 skipped |

## Constants

Seeds `deriveSeed('vg-d1-growth-joint', …labels)` (PROTOCOL.md §10); budgets `src/vg-d1-growth-joint/budgets.ts`
(PROTOCOL.md §11.5); doors and pins `src/vg-d1-growth-joint/context.ts`; ceiling $35,000 on the fixed $100,000.

## Environment

- Host apollo (8 cores / 16 threads, 59 GiB RAM visible). Node v24.21.0.
- Canonical data (git-ignored): `data/VGT/data.csv` `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049`; common complete endpoint 2026-10-30.
- Local caches (git-ignored): `.cache/vg-d1-growth-joint/` (doors, job archives, pilot); `results/logs/` (unit logs,
  git-ignored by the repository's `logs/` rule).

## Deliverables

`REPORT.md`; `results/tables/*.md` (from `tools/vg-d1-growth-joint/tables.ts`); `FROZEN_SELECTION.json` (every
member's full vector); `results/diagnostics/D24/ledgers/` and `results/validation/ledgers/` (lot, funding and daily
ledgers); `PROTOCOL.md`, `AMENDMENTS.md` (R1–R3, O1), `STANDARD_ADOPTION.json`, `CONTROL_MANIFEST.json`,
`fixtures/controls.json`; `RUN_COMMANDS.md`, `chains/`; `results/pilot/PILOT.md`; code `src/vg-d1-growth-joint/`
(20 tests); `docs/research/ROADMAP.md` (the user's agreed order); `CLAUDE.md` / `AGENTS.md` /
`docs/claude/context-recovery.md` (the standing delivery instruction).

## Disclosures

- Validation on previously examined history (not an untouched holdout); the incumbents' outcomes were known.
- Pre-freeze: the dry parity computed VG #2 and the Growth controls alone (known incumbents); the pilot evaluated
  controls on development with pilot budgets; pilot figures were printed once while building the table tool. No rule
  changed in response.
- Appendix A had no backend archive. It was mapped from the transcription and reproduced its target exactly at the
  final stage.
- Every arm-D C24 cell and the informed lane hit their island cap with an extension trigger still firing: budget-bound,
  not converged.
