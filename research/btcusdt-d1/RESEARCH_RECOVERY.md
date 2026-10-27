# Research recovery checkpoint — BTCUSDT spot D1 study

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root with
Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`
(`/opt/homebrew/bin/node` is v23.6.1 and must not be used).

- **Updated:** 2026-10-27T02:13:28Z
- **Status: TASK COMPLETE (negative verdict).** Every stage is sealed: both folds failed, the procedure gate failed
  (`results/PROCEDURE_GATE.json` body `7764f57b…`), and the holdout was never evaluated. Reports, phenotypes, the CLI
  demonstrations, the final independent audit (`reviews/FINAL_AUDIT.md`) and its dispositions
  (IMPLEMENTATION_AUDIT.md §2) are done. Nothing is committed (no request to commit).
- **Brief:** `research/btcusdt-d1/coordinator/brief_original.md`.
- **Protocol:** `PROTOCOL.md` (sha256 `c6a8e1c8…`), frozen 2026-10-27T01:21:32Z by `PROTOCOL_FREEZE.json` (body
  `a7fd1b50b4e506ee54dde287aecb47bb7b8167e56437997318db047f0e436e92`). Procedure hash `90ff5f56…`;
  outcome-critical code digest `15273626…` (22 files). There is no amendment path.
- **Running processes:** none.
- **Next step:** none required. Any further BTC research is a new study with a new protocol. **Never run
  `holdout`** (it refuses), and do not reopen the holdout for these phenotypes.

## 1. Git provenance (stage S0)

| Item | Value |
|---|---|
| Source branch | `research/trailing-buy-four-family-optimization` |
| Source HEAD | `40da6ddff5d3a59b0850c66b1c1beb85197cfc99` |
| Remote / upstream | `origin` (GitHub, SSH) / `origin/research/trailing-buy-four-family-optimization` |
| State before push | clean tree, no untracked files, no in-progress operation; ahead 2 (`9400593d`, `40da6ddf`) |
| Push | ordinary `git push origin research/trailing-buy-four-family-optimization` at 2026-10-26T23:40:19Z: `9b0ab947..40da6ddf` |
| Push verification | `git ls-remote origin refs/heads/research/trailing-buy-four-family-optimization` = `40da6ddf…cfc99` = local HEAD |
| Pushed content review | 761 files, ~38 MB, no secret patterns; the largest blobs are the ranked-preemption study's gzipped search archives (≤ 6.4 MB each), which its sealed records hash (intentional) |
| New branch | `research/btcusdt-d1-spot`, created 2026-10-26T23:40:35Z from `40da6ddf…cfc99` (no prior `*btc*` branch locally or on origin) |
| Files changed before switching | none |
| New branch upstream | none; not pushed, nothing committed |
| Working tree now | ` M package.json` (one `btc-d1` script line); `??` `src/btcusdt-d1/`, `research/btcusdt-d1/`, `config/research-phenotypes/` |

## 2. Stage table

| Stage | Status | Command | Times (UTC) | Record (body hash) |
|---|---|---|---|---|
| Baseline | complete | `npm test`, `npx tsc --noEmit`, `npx eslint` | 2026-10-26 23:47:42Z → 23:50:43Z | 607/607 pass; tsc clean; 0 errors / 15 warnings (`results/baseline/npm-test.log`, git-ignored) |
| Audit | complete | `npm run btc-d1 -- data-audit` | sealed 00:21:50Z | `results/audit/DATA_AUDIT.json` `f3076ac7…` |
| Snapshot | complete | `npm run btc-d1 -- snapshot` | — | cache `research/btcusdt-d1/cache/btcusdt-d1-snapshot-v1.bin` sha256 `cb7c9cdc…` (git-ignored; rebuilds identically from the sealed prefix) |
| Parity | complete | `npm run btc-d1 -- parity` | 00:22:14Z → 00:24:30Z; rerun r2 01:03:34Z → 01:05:40Z | `results/parity/PARITY.json` `0aa399b4…` (pre-review engine); `PARITY-r2.json` `7663f900…` (the frozen engine closure): 205 runs, 0 differences |
| Benchmark | complete | `npm run btc-d1 -- benchmark` | sealed 00:25:13Z | `results/benchmark/BENCHMARK.json` `42c8d6ec…` (timings only) |
| Review | complete | subagent (read-only) | 00:46Z; follow-up 01:16Z | `reviews/PRE_FREEZE_REVIEW.md`; dispositions `reviews/PRE_FREEZE_DISPOSITIONS.md` |
| Freeze | complete | `npm run btc-d1 -- freeze` | 01:21:32Z | `PROTOCOL_FREEZE.json` `a7fd1b50…` |
| Fold A | complete, **FAIL** | `npm run btc-d1 -- fold fold-a` | 01:21:48Z → 01:24:31Z | SELECTION `3fb3c6c6…`, PICKS `68ee7c14…` (01:24:30.172Z), VALIDATION `8cb6585b…` (01:24:31.136Z) |
| Fold B | complete, **FAIL** | `npm run btc-d1 -- fold fold-b` | 01:25:25Z → 01:29:26Z | SELECTION `f06d34bb…`, PICKS `80a27bb9…` (01:29:25.488Z), VALIDATION `df8be43b…` (01:29:26.046Z) |
| Gate | complete, **FAIL** | `npm run btc-d1 -- gate` | 01:29:52Z | `results/PROCEDURE_GATE.json` `7764f57b…` |
| Final selection | complete (retrospective) | `npm run btc-d1 -- final` | 01:30:04Z → 01:34:59Z | SELECTION `a4e11170…`, PICKS `b106a42c…` |
| Holdout | **not run; never to be run** | (refuses) | — | — |
| Phenotypes | complete | `npm run btc-d1 -- phenotypes` | after 01:34:59Z | `config/research-phenotypes/btcusdt-d1/*.json` (10; doors through 2024-06-30) |
| Demonstrations | complete | see README "Commands" | after the phenotypes | `results/demo/*.txt`; run outputs in git-ignored `evaluations/btcusdt-d1/` |
| Final audit | complete | subagent (read-only) | after the demonstrations | `reviews/FINAL_AUDIT.md`; dispositions IMPLEMENTATION_AUDIT §2 |
| Final verification | complete | `npm test`; `npm run pools -- verify`; `npm run btc-d1 -- verify` | 01:43:42Z → 01:48:13Z; `verify` rerun after the audit fixes | 654/654, then 657/657 after the audit fixes (02:15:00Z → 02:17:56Z); 66/66 PASS; 19/19 (`results/logs/final-*.log`, git-ignored; `results/demo/verify.txt`) |

A crash between a fold's archive/SELECTION and PICKS would need the partial files set aside under
`results/folds/<f>/partial-<UTC>/` and a deterministic rerun with the same seeds, labelled here; it did not happen.

## 3. Data

- Raw: `data/BTCUSDT/BTCUSDT-2017-2026.csv` (git-ignored), 451,326,328 bytes, sha256
  `dd91a2b36d1ea513167861b916723e65ffaeb3f2cc8deefe44e3993c0298de83` (unchanged at the end), venue **unverified**.
- Snapshot end 2026-08-25T00:00Z; prefix 451,271,344 bytes, sha256 `ed0d359a…e7b76`; history start
  2018-02-11T00:00Z; 4,482,236 canonical bars, series sha256 `cb7c9cdc…283f8`.
- Chronology: arming from 2019-02-11; fold A selection → 2021-12-01, validation → 2023-03-01; fold B selection →
  2023-03-01, validation → 2024-07-01; final selection → 2024-07-01; holdout 2024-07-01 → 2026-08-25 (sealed).

## 4. Disclosures

- The preflight diagnostic (the unchanged VGT D1 vector) was run on the development span at 2026-10-27T00:02Z: 105
  trades, +89,223 USDT, 65.7% minute peak-to-trough. The box (`params.ts`, sha256 `663bbbb9…` then), the chronology
  (`calendar.ts` `35e5b26e…`) and the cost scenarios (`costs.ts` `bd746e23…`) had been written at 23:56Z, before it.
  - `params.ts` was later reformatted by Prettier (whitespace only). The pre-diagnostic file is reconstructed byte
    for byte in `coordinator/pre-diagnostic/params.ts.txt` (sha256 `663bbbb9…`).
  - `costs.ts` kept its scenario values; only its stop-fill description strings were rewritten after the review
    (PROTOCOL §12).
  - The gates and the procedure were planned before that run but written down after it.
- The independent pre-freeze review led to pre-freeze changes (PRE_FREEZE_DISPOSITIONS.md). After the freeze only
  report-only files changed (IMPLEMENTATION_AUDIT §1).
- The holdout was never read by any engine run (final audit, check 2).

## 5. Guards

- **Do not rerun** any of the following:
  - the audit, the parity records (both), the benchmark;
  - the freeze, folds A and B, the gate, the final selection, the phenotypes;
  - never `holdout`.
- **Do not** commit or push the branch without a new explicit request. Do not touch `data/` except to read. No
  network, no credentials, no `.env`.
- **Do not edit** files bound by `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`, or this study's
  outcome-critical files (the freeze guard refuses).
- No BTC buy-and-hold benchmark anywhere.
