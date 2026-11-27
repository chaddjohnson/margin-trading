# Work recovery checkpoint — explicit research date boundaries, VGT/GDX data update, N/original full-history run

## Top screen

- **Updated:** 2026-11-27T15:30Z (UTC, from the clock). **Status: COMPLETE** (stages A–E). The final commit and its
  verified push are recorded under "Delivery".
- **Task:** the user's brief of 2026-11-27 (`BRIEF.md`, verbatim).
- **Branch:** `feature/research-date-boundaries`, created from `research/gdx-d1-growth` at `03f3500c`. Main checkout; no
  extra worktree.
- **Report:** `REPORT.md`. Audit: `AUDIT.md`. Commands: `RUN_COMMANDS.md`.
- **Follow-up gate (the user's):**
  1. Review standard 4.0.0, R1 and the report.
  2. Decide on the §2 GPU re-acceptance. The acceptance record is STALE on this branch, so official GPU optimization is
     blocked here. The re-acceptance includes a fixed-seed mini-optimization, which the brief excluded.
  3. Do not merge into an official-research branch before the re-acceptance.
- **Nothing is running.** The contained units `rdb-npm-test` and `rdb-npm-test-final` have finished.

## Environment

- Node 24.21.0 (`.node-version`); every evaluating process ran with `--no-maglev`.
- Credentials are read from `.env` (Alpaca) and were never printed.
- GPU: RTX 5090 `GPU-ae5f222c…`, binary `research/gpu-phase7/build/gb7` (`cb2ff30b…`, the accepted one), used
  non-officially (`parity-test`).

## Authority

- `BRIEF.md`; standard 4.0.0 (`docs/research/OPTIMIZATION_STANDARD.md`, sha256 `c4743fd53135ab74…`, registered).
- `config/research/date-ranges.json` R1 (`818be325520d29cb…`).
- `config/market-data/vintages.json` (`951d4cafd7fbdcd5…`): 4 vintages each of VGT and GDX.
- Sealed inputs read (never modified):
  - `research/vg-l0-full-joint/FROZEN_SELECTION.json` (`4080d4b1…`, 0444);
  - `research/vg-d1-growth-joint/FROZEN_SELECTION.json` (`e29e35e2…`, 0444).

## Stages

| Stage | Status | Record |
|---|---|---|
| A. Audit | complete | `AUDIT.md` (§1 corrected for Alpaca's end semantics during C) |
| B. Implementation and tests | complete | commit `7a41ff0b` (plus fixes in the final commit: the CLI verb, the Study 7 test assumption, `tools/data-boundaries/gpu-check.ts`, docs) |
| C. Data update (VGT, GDX → 2026-11-25) | complete, 2026-11-27T14:57:45–14:58:05Z | `evidence/data-update-2026-11-27.json` (`fc91e26e…`); local run records `data/vintages/data-update-2026-11-27/` |
| D. N/original continuous run | complete, 15:09Z | `n-original/all-through-2026-11-25/` (summary `f41e2fd5…`, ledger `2cf02848…`); `n-original/research-through-2026-10-30/` |
| E. Verification, report, commit, push | complete | see below |

## Key results (sealed elsewhere: none; all are report-only manual evaluation)

- **Data:**
  - VGT 53,976,698 B / 945,821 rows / `dfde0f77…`; GDX 80,741,665 B / 1,503,833 rows / `aa23522d…`.
  - Both run to 2026-11-25, 2,741 sessions, 0 missing; +10,213 and +13,339 rows; 18 sessions each.
  - The 2026-10-30 files are exact prefixes of the new ones.
- **Doors:** `evidence/fingerprint-0-before-change.json` (`44de9e60…`) = `-1-after-code-change` (`432f97c1…`) =
  `-2-after-append` (`83fcd8d2…`) for the FULL and D24 contents and the N/original / New L0 replays.
- **N/original:**
  - A (→ 2026-10-30) = sealed: $482,700.73 / DD $20,385.99 / 44 lots.
  - B (2026-11-02 → 11-25): −$5,697.90, reset DD $25,794.56, 3 lots (lot 44 carried in +$11,048.24; lot 45 −$16,225.15;
    lot 46 −$520.99), flat at the end; D1·GDX trade 49 virtually open (refused 11-23).
  - C: $477,002.83 / $25,794.56 / 46 lots.
  - The trajectory through 10-30 equals FULL decision for decision.
- **GPU (non-official):** 204 of 204 bit-identical with the CPU; FULL's GPU dataset is `6e977ccd…`, the accepted one
  (`evidence/gpu-nonofficial-check.json`, `8c4662f2…`).
- **Tests:**
  - New and updated tests pass.
  - Strategy Lab vitest: 314 of 314.
  - Final `npm test`: see "Final npm test".

## Guards

- **Do not re-run the append:** it would report "unchanged". Do not delete `data/vintages/` or the legacy archive.
- **Do not edit R1.** A later window is a new range with the user's authorization.
- The completed studies' whole-file pins are untouched by design. Reproduce them at their own commit from the verified
  prefix (`npm run datasets -- prefix`).
- No optimization was run; no sealed record was changed.

## Disclosures

- The GPU acceptance is STALE on this branch. Six pinned files changed: `src/lib/{csv,evaluation}.ts`,
  `src/vg-d1-growth-joint/{context,data}.ts`, `src/research-standard/preflight.ts`,
  `config/gpu-backend/entrypoints.json`. `tools/gpu-backend/verify-acceptance.sh`: NOT VERIFIED (3 failures, exactly
  these). Five official GPU studies are BLOCKED in the preflight.
- Alpaca reads a date-only `end` as the end of that UTC day. The inherited Study 9 note said otherwise. The first
  download attempt with `end=2026-11-27` was refused (403) and wrote nothing.
- `npm run app`'s `preapp` lint fails on git-ignored Strategy Lab scratch bundles under `research/*/cache/`
  (pre-existing).

## Final npm test

Contained unit `rdb-npm-test-final` (2026-11-27T15:24:33Z → ~15:31Z, after the append and every code change):
**1,904 tests, 1,890 pass, 10 fail, 0 cancelled, 4 skipped.**

- **7 known pre-existing failures:** intraday-study ×1, minute-optimizer ×1, trailing-buy ×4 (the lowercase
  `allin-original.ts`), and the Study 7 sealed-door parity (data end 2026-10-29).
- **3 by design while the acceptance is STALE:** enforcement "the recorded acceptance re-verifies independently";
  policy "MERGE GATE"; preflight "every study … passes the preflight", with 5 official GPU studies BLOCKED.
- The earlier run (`rdb-npm-test`, 15:12Z) had an 11th failure, the Study 7 end-validation assumption, fixed in
  `src/study7-runners/tests/runners.test.ts`.

## Delivery

- Commits on `feature/research-date-boundaries` (from `03f3500c`): `7a41ff0b` (implementation and tests, before the data
  update), `1bb425cc` (data update, N/original, report, docs, fixes), and this checkpoint record.
- Pushed with `git push -u origin feature/research-date-boundaries` (a new remote branch, no force), outside the sandbox,
  first attempt. Verified 2026-11-27T15:30:00Z: `git ls-remote origin feature/research-date-boundaries` = `1bb425cc…`
  = local HEAD. The checkpoint commit is pushed the same way.
- No merge into `main`, no PR, no deployment. `main` and other branches are untouched.
