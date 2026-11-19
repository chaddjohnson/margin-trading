# RESEARCH_RECOVERY — vgt-d1-growth-separate-pooled (Priority 2 follow-up: the separately optimized pair, pooled; the optimization standard)

## Top screen

- **Updated:** 2026-11-08T22:02Z (UTC, from `date -u`). File listings on this host show local time (UTC+1).
- **Status: COMPLETE.** Task A (the frozen-pair comparison) and Task B (the optimization standard, the adoption
  preflight, the instruction links and the roadmap) are both done.
  - The follow-up gate is the user's review: `REPORT.md` §10 lists the decision points before Priority 3.
  - **Priority 3 is not started.**
- **Authority:**
  - `PROTOCOL.md`: `a82513520c658579…`.
  - `COMPARISON_MANIFEST.json` (sealed): `8d01c734027bd936…`, committed `63352297` before any pair evaluation.
  - `STANDARD_ADOPTION.json`: `90140a3945d15a63…` (standard 1.0.0, `8c38ac1528575324…`; preflight PASS).
  - `AMENDMENTS.md` head: E1 (a label correction only).
- **Running:** nothing. The last unit, `vgtpair-npm-test`, finished at about 22:00Z.
- **Next command:** none. Await the review, and do not rerun anything. The branch is pushed (see Guards).
- **Verification at closing:**
  - `npm run vgt-pair -- verify`: all 3 seals ok;
  - `npm run research-preflight -- --all`: PASS;
  - Priority 2's 19 sealed records still verify, and `git status` shows no change under `research/vgt-d1-growth-joint/`
    or `src/vgt-d1-growth-joint/`.

## Deliverables (sha256 prefixes recomputed 2026-11-08T22:02Z)

| File | sha256 |
|---|---|
| `REPORT.md` | `e07e3e71a89d7f4f…` |
| `results/comparison.json` (sealed) | `66bb9912c6a8663f…` |
| `results/neighbourhood.json` (sealed) | `8b77e6f552d003ca…` |
| `docs/research/OPTIMIZATION_STANDARD.md` (1.0.0) | `8c38ac1528575324…` (= the registry) |
| `docs/research/STUDY_PROTOCOL_TEMPLATE.md` | `73eb62e7b351d233…` |
| `docs/research/optimization-standard.versions.json` | `073c270fa0365a49…` |
| `docs/research/ROADMAP.md` | `590377afde336963…` |
| `CLAUDE.md` / `AGENTS.md` | `25d06935ce535ec9…` / `11459d984b87798c…` |

## Results (details in REPORT.md)

- **Pair A · D1-first** (also A · Growth-first and B 100/100, which have identical trades):

  | Window | Net | DD |
  |---|---:|---:|
  | Development | $145,470.37 | $29,272.36 |
  | Validation | +$23,858.51 | $33,522.58 (reset) |
  | Full | $169,328.88 | $34,336.64 |

- **B 50/50:** half the two standalones: development $104,189.67, full $118,976.58. Its whole-run DD of $35,524.07 is
  above the ceiling.
- **Against the comparators:**
  - joint primary: −$24,251.70 development, +$1,606.87 validation, −$22,644.83 full;
  - D1 primary + #4 · A: −$59,469.84 / −$42,726.61 / −$102,196.45;
  - D1 primary + 08500a60 · A: −$46,338.08 / −$36,692.69 / −$83,030.77.
- **Neighbourhood** (development, 384 confirmation draws): median $147,724.36, p10 $111,014.45, p90 DD $33,768.13,
  breaches 7.0%. The joint primary's: $153,033.64 / $123,759.00 / $25,391.45, breaches 0.5%.
- **Tests:**
  - full `npm test` (unit `vgtpair-npm-test`, `results/logs/npm-test.log`): 1,294 tests, 1,283 pass, the 7 known
    failures, 4 skipped;
  - the study's 6 and the preflight's 14 tests pass;
  - `tsc` is clean, and ESLint reports 0 problems on the new code.

## Stage table (PROTOCOL.md §9)

| Stage | Status | Command | Output |
|---|---|---|---|
| S1 manifest | complete | `npm run vgt-pair -- manifest` | `COMPARISON_MANIFEST.json` (`8d01c734…`) |
| S2 pilot | complete | `bash research/vgt-d1-growth-separate-pooled/chains/pilot.sh` | `.cache/vgt-d1-growth-separate-pooled/pilot/`, `results/logs/pilot-chain.log` (`PILOT-DONE`) |
| S3 comparison | complete | `npm run vgt-pair -- launch --unit vgtpair-compare --wait -- compare` | `results/comparison.json` (`66bb9912…`), `results/ledgers/` |
| S4 neighbourhood | complete | `npm run vgt-pair -- launch --unit vgtpair-nbhd --wait -- neighbourhood --workers 8` | `results/neighbourhood.json` (`8b77e6f5…`) |
| S5 report | complete | `tools/vgt-d1-growth-separate-pooled/tables.ts`, charts | `results/tables/`, `results/charts/`, `REPORT.md` |

Every sealed stage refuses a rerun.

## Environment

- **Checkout:** the main checkout. Branch `research/vgt-d1-growth-separate-pooled` from `47422d04`; no extra worktree.
- **Runtime:** Node v24.21.0. Data: `data/VGT/data.csv` `2ee06310…412e`.
- **Containment:** `vgtpair.slice` (44G / 48G / swap 0).
- **Archives** (git-ignored, regenerable): `.cache/vgt-d1-growth-separate-pooled/` (job and pilot archives).

## Guards

- **Never edit** anything under `research/vgt-d1-growth-joint/` or `src/vgt-d1-growth-joint/`.
- **Never rewrite** this study's sealed records, protocol or manifest. Changes go to `AMENDMENTS.md`.
- **No search, no Priority 3, no Strategy Lab.**
- **Push (done):** asked once at the end; the user chose commit and push. Branch
  `research/vgt-d1-growth-separate-pooled` was pushed to origin at `743cc8f2` (2026-11-08T22:04Z, confirmed with
  `git ls-remote`); there is no merge into main. This record is a follow-up commit, pushed the same way.

## Disclosures

- E1: a label-only correction (`results/neighbourhood.json` `reused[].scope` for the three standalone controls).
- The neighbourhood seeds are Priority 2's C24 seeds (common random numbers). The components' own confirmation seeds are
  the same LHS columns in their single-family scopes; they were used for qualification only.
- Leftover temporary fixture folders `/tmp/preflight-*` from early preflight test runs (before the tests cleaned up after
  themselves) are left in place. Removing them is the user's call.
