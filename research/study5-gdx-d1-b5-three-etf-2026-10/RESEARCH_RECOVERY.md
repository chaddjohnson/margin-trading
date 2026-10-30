# Research recovery checkpoint — Study 5: GDX standalone D1 + B5 three-ETF (VGT/KRE/GDX) re-optimization

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root.

- **Updated:** 2026-10-30T21:11Z. **Status: COMPLETE** (every stage ran and is sealed; reports generated; commit and
  push of the study branch are the last step — their hashes are recorded below by a follow-up commit).
- **Outcome:** Study A — **no nominee** (all 32 shortlisted vectors fail G2; near-misses failing only G2:
  `d1-ac0aaa704c`, `d1-a8e252df46`, `d1-143e245fb1`). Study B — **no nominee** (all candidates and C3 fail PG2; Track 1
  T1-P/T1-S fail only PG2 and are "Track 1 nominated" under the original T1–T3). Frozen B5 remains the reference.
- **Brief:** `brief/ASSIGNMENT.md` (sha256 `50b4d77d…`, 170 lines, read in full 2026-10-30T20:17Z). It authorizes
  implementation, execution, verification, and a Git commit and push.
- **Authority:** `PROTOCOL.md` frozen 2026-10-30T20:41:48Z (`results/protocol_freeze.json` body `b28abf0f…`, file
  `c9c52f9a…`; frozen-text sha256 `b25b8d33…`); amendment A1 (reporting only, 20:54Z) + disclosure D1 appended →
  current sha256 `c09923c3a6479ba96521470199aaaf368313a51beb65e6f103de47ab9b54784e`.
- **Selection:** `FROZEN_SELECTION.json` 2026-10-30T20:54:55Z, body `202f19e8cbe12f8e857a356c5b759fd90998a8478d2d649dd1a10757dd2ac6ac`,
  file `3837d814…`.
- **Running process:** none.
- **Follow-up gate (the user's decision):** whether to start forward (paper) observation of `B5-3ETF-ablation` and the
  labelled research configurations after 2026-10-29; any further search would have to treat 2016–2026 as observed.

## 1. Environment

- Checkout `/home/chad/projects/margin-trading` (the brief's `~/projects/ai-trading` does not exist). Branch
  `research/study5-gdx-d1-b5-three-etf`, created 2026-10-30T20:20Z from `research/study4-two-tier-d1-allocator` at
  `23e55a04264c3b88a017528394787fe1bfd8a590`. No other worktree.
- User changes present at start and never touched or committed: `config/market-events/distributions.csv`,
  `config/market-events/distributions.manifest.json` (modified), `config/market-events/raw/vanguard-20261030T184421Z/`
  and six `._.DS_Store` files (untracked).
- Node v24.21.0, 16 CPUs, 59 GB RAM; every stage single-process, single-threaded.

## 2. Data

`data/{GDX,VGT,KRE,XBI,XRT}/data.csv` through 2026-10-29 (appended by the user 2026-10-30T18:40Z; prefixes through
2026-10-13 = the frozen B5 pins). Current sha256: GDX `134b7450…`, VGT `624e4094…`, KRE `fd7ab8aa…`, XBI `83b71f75…`,
XRT `c625ca57…` (DATA_AUDIT.md). Every door opening is in `results/doors.jsonl` (20 entries).

## 3. Stage table (all complete; write-once stages refuse to re-run)

| Stage | Command | Record (file / body sha256, first 16) |
|---|---|---|
| S1 protocol freeze | `npm run study5 -- freeze-protocol` | `results/protocol_freeze.json` `c9c52f9a38a63f90` / `b28abf0fb4fb6556` |
| S2 parity P1/P2/P4 | `npm run study5 -- parity` (rerunnable) | `results/parity/parity.json` `ff873c58592888b7` / `fa657bd998f5a4b7` |
| S2b P3 | `npm run pools -- fixed B5 --end 2026-10-13 --out evaluations/study5/P3-B5-fixed-2026-10-13` | $486,207.77 / $26,509.97 / 94 lots (log `results/logs/P3-…log`) |
| S3 Study A search | `a-search main`, `a-search wf20` | main `9e0e6cde9b81e0e5` / `66ae4a8d0666c64f`; wf20 `aa476a685dbef9b9` / `6de81c522d7eba93` |
| S4 Track 1 | `track1 main`, `track1 wf20` | main `e3f0378034e7c15d` / `2fcc7bd65a645efa`; wf20 `e6979c2d278f351b` / `cc0289581f40a9fe` |
| S5 Study A evidence | `a-validate main`, `a-validate wf20` | main `65e316a20fbbff19` / `2b5c1b5de8493a7a`; wf20 `fd32004423ddbae8` / `69ea187d09d51193` |
| S6 Track 2a | `track2` | `results/track2/track2.json` `129549c6a3bcc0e4` / `f76905ea219fea60` |
| S6b candidates | `b-candidates` | `results/studyB/candidates.json` `dba5a7a01290d209` / `604ac358a3bb8c9a` |
| S6c Track 2b evidence | `b-validate` | `results/studyB/validation.json` `646b423c2ecf43a1` / `95d18342219f999c` |
| S7 selection freeze | `freeze-selection` | `FROZEN_SELECTION.json` `3837d814b29cd645` / `202f19e8cbe12f8e` |
| S8 final (once) | `final` (20:55:37–20:56:33Z) | `results/final/final.json` `00dd15cf8499af0f` / `3fef22137fc910e7` |
| S8 confirmation | `final --confirm` (identical figures) | `results/final/confirmation.json` `5ccc04c29487ec79` / `be005420d4c40eb4` |
| S8b Track 1 WF20 test (reporting) | `track1-wf20-test` | `results/track1/wf20/test.json` `d2900938c65a3f88` / `b01e146a93927935` |
| S8c configs + commands | `scripts/verify_commands.sh` | 15/15 exit 0, `results/logs/commands/index.txt` |
| S9 reports | `scripts/report_tables.py`, `scripts/build_reports.py` | root `*.md` generated from `report_templates/` |
| S9 tests | `node --test src/study5-gdx-b5-three-etf/tests/*.test.ts src/pools/tests/*.test.ts` | 33 pass, 0 fail, 2 skipped (B4/B5 anchors: data appended; P3 covers) |

## 4. Guards

- **Do not rerun** any write-once stage (S1, S3–S8); do not edit sealed records, `PROTOCOL.md` above §11, or the
  generated root reports (edit `report_templates/` and rebuild).
- Never edit `config/phenotypes/D1/*.json`, `config/pools/B4.json`/`B5.json`, `data/`, market events, or earlier
  studies' records; never commit the user's market-events changes or `._.DS_Store` files.
- Commit only the study's files (`package.json`, `.gitignore`, `src/study5-gdx-b5-three-etf/`,
  `research/study5-gdx-d1-b5-three-etf-2026-10/` incl. force-added `results/logs/`, `config/pools/B5-3ETF-ablation.json`,
  `config/research-phenotypes/study5-gdx-d1-b5-three-etf/`, `config/research-pools/study5-gdx-d1-b5-three-etf/`);
  push the study branch only; no merge, no PR, no force-push.

## 5. Disclosures

- A1 (reporting-only amendment) and D1 (Pareto-extra duplicates) — PROTOCOL.md §11.
- Track 1's WF20 test window (PROTOCOL.md §3.2) was omitted by the first implementation and added after the selection
  freeze as a reporting-only command (`track1-wf20-test`, DEV data only, no decision).
- The search stages were not re-run for determinism (write-once); determinism was shown for the final evaluation and by
  the exact reproduction of the original search (P4).
- `npm run app` invocations load `.env` if present (`--env-file-if-exists`); no credential is used by these runs.
