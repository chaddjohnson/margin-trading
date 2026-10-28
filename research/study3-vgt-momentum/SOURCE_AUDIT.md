# Source audit — Study 3, Stage 1

Written 2026-10-28 before any momentum outcome; facts below come from the repository files named, not from the brief.

## 1. Source hierarchy (what governs this study)

1. **The brief** `brief/BRIEF.md` (byte copy of the user's attachment, sha256
   `aa09a2e9cfa8a1780a835fd3675b483d8067c107af926448cec73417820cc103`; 331 lines; the final heading "§13 Exact stop
   point and future authorization" and its final line were read, so the file is complete).
2. **Repository instructions**: root `CLAUDE.md` (imports `docs/claude/context-recovery.md`); no `.claude/`,
   `AGENTS.md` or `.claude/rules` exist; no user-level `~/.claude/CLAUDE.md`.
3. **This study's frozen protocol** (`PROTOCOL.md` v1.1 + catalog + matrix + FP + selection, once frozen), then
   amendments, then sealed records. The checkpoint `RESEARCH_RECOVERY.md` points to them and never replaces them.
4. **Completed studies** (read-only): Study 1 `research/d1-wide-library-chronological-selection/`, Study 2
   `research/d1-all61-signal-capital-complementarity/`, the prospective B4/B5 freeze
   `research/prospective-b4-b5-shadow/`, and the registered phenotypes/pools under `config/`.

## 2. Git state at the start

- Branch at start: `research/d1-all61-signal-capital-complementarity`, HEAD `70312f298742fa6f9ae493ef3828aa5621f19e54`
  ("Recorded the Study 2 commit and push…"), working tree clean; `git ls-remote origin` shows the same hash for that
  branch (**Study 2 remote commit confirmed**). Study 2's study commit is `1accc9a`.
- The user's intervening fix `a37feae` ("Bad file reference fix") changed only `src/optimizer/goldenMaster.ts` (2 lines)
  and is an ancestor of HEAD; it is preserved.
- New branch `research/study3-vgt-momentum-first-principles` created from that HEAD (main checkout, no extra worktree).
- The recovery policy commit `57b5375` (root `CLAUDE.md` + `docs/claude/context-recovery.md`) is on the research
  branches but **not on `origin/main`**.

## 3. Brief claims checked against the repository

| Claim in the brief | Repository | Status |
|---|---|---|
| Study 1: K = 8/16/32/64; 413,280 new search evaluations; best-trade penalty excluded right-tail families; wider libraries not better; A4 worse | `research/d1-wide-library-chronological-selection/PROTOCOL.md` l.72, 228; `README.md` l.55; `FINAL_COMPARISON_AND_RECOMMENDATION.md` | consistent |
| Study 2: 0 of 18 predefined fold replays met complementarity | Study 2 `FINAL_COMPARISON_AND_RECOMMENDATION.md` (verdict line) | consistent |
| 59 idle-clean nonmember signals against B5, −$52,477 | same, answer 3 | consistent |
| B5 2022–23 matched replay +$170,997, 0 falling-knife episodes, worst closed lot −$5,200, minute DD $17,269 | same, answer 6 | consistent |
| D1 VGT `primary` made no decision in 2017 or 2023 | Study 2 answer 7; Study 2's sealed View-U VGT ledger (`results/signals/signals-2023-12-29.json.gz`): 17 trades 2018-12-21 → 2022-12-15, none in 2017 or 2023 | consistent |
| Known `allin-original.ts` vs `allIn-original.ts` case failures | `src/app/allIn-original.ts` exists; tests open `src/app/allin-original.ts` (§5) | consistent |

No discrepancy between the brief and the repository was found. One addition the brief does not mention: Study 2's
real-data test `src/d1-signal-capital-complementarity/tests/realData.test.ts:83` ("the protected inputs are
unchanged") fails on **any** branch that adds files outside Study 2's folders (§5).

## 4. Constraints inherited from Studies 1 and 2 (and how Study 3 honours them)

- Completed studies are frozen: nothing under their folders is edited, re-hashed or rerun. Study 3 only *reads*
  Study 2's sealed View-U VGT ledger (D1 anchor and the descriptive D1-idle overlap) and imports Study 2's read-only
  D1 run path (`loadUniverse`, `standaloneRun`, `bookOf`) to reproduce the D1 anchor — it changes none of them.
- Study 1's lesson (more choice did not predict later quality; validation-max selection was worse) shapes Study 3's
  capped budgets, neighbourhood-median selection, the no-search reference P0, and per-fold re-selection.
- Study 2's lesson (idle capital sits in calm advances; standalone arithmetic is not pool evidence) frames the
  question but **no Stage 2–4 combined test is run here**; the D1-idle overlap is descriptive timing only.
- The data door of the earlier studies (training partition, access `optimization`, end ≤ 2023-12-29) is reused through
  the shared loader; 2024–2025 and 2026 are never read. VGT's 2024–2025 was inspected by earlier VGT programs (README),
  which does not matter here because Stage 1 reads none of it.
- No candidate vector from a prior study is relabelled: every Study 3 candidate is a new momentum mechanism with its
  own ID (`<family>-<sha256 prefix of its parameters>`).

## 5. Test status before any study edit

`npm test` at 16:23–16:25Z (log `audit/tests/baseline-full-suite-before.txt`): **744 tests, 737 pass, 7 fail.**

| Failing test | Cause | Class |
|---|---|---|
| `src/trailing-buy/tests/goldenMaster.test.ts:39, :43, :49, :58` | open `src/app/allin-original.ts` (file is `allIn-original.ts`) | known filename-case maintenance issue (pre-existing) |
| `src/minute-optimizer/tests/goldenMaster.test.ts:36` | same | pre-existing |
| `src/intraday-study/tests/study.test.ts:19` | same | pre-existing |
| `src/d1-signal-capital-complementarity/tests/realData.test.ts:83` | Study 2's protected-input guard rejects untracked files outside its folders; at the time of the run the only such files were this study's three new files (`brief/BRIEF.md`, the checkpoint and the log being written). Its manifest showed **no** tracked change and **no** prospective-freeze mismatch. It passes at Study 2's own commit with a clean tree and fails on every later branch by design. | branch-bound guard, not a regression |

The user's `a37feae` fix (in `src/optimizer/`) is not among the failures. The after-study run is in
`audit/tests/` (`IMPLEMENTATION_AUDIT.md`).

## 6. Input provenance and hashes

| Input | sha256 | Role |
|---|---|---|
| `data/VGT/data.csv` (local, git-ignored) | `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` | the only market data; loaded through 2023-12-29 (stage records hold the loaded-bar hash per door) |
| `data/partitions.json` | in `results/records/audit.json` | partition boundaries (training ends 2023-12-31) |
| `config/market-events/splits.json` | in the audit record | no VGT split inside 2016–2023 |
| `config/market-events/distributions.csv` | in the audit record | distribution diagnostic only |
| `config/phenotypes/D1/VGT.json` | in the audit record | D1 `primary` (context anchor) |
| `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` | in the audit record | unchanged (protected) |
| Study 2 `results/signals/signals-2023-12-29.json.gz` | in the parity record | sealed D1 anchor ledger |

S0 data QA (`results/records/audit.json`): 2,012 sessions 2016-01-04 → 2023-12-29 (252/251/251/252/253/252/251/250 per
year), 655,270 regular-session minute bars (134–390 per session, median 327: VGT has many minutes without a trade, and
missing minutes are never imputed), 15 early closes, 3 sessions without a closing print, largest overnight gap −12.0%
(2020-03-16), no split-sized move. The first decision close 2017-01-03 exists.
