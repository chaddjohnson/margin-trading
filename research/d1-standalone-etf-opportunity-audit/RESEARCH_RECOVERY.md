# D1 standalone ETF opportunity-capture and robustness audit — recovery checkpoint

## Top screen

- **Updated:** 2026-10-27T17:21Z (UTC). File listings (`ls`, `stat`) show local time (CET = UTC+1).
- **Status:** **COMPLETE** (all stages run, analysed, reported, reviewed and verified). Commit and push: see "Git
  delivery" below (filled by a follow-up commit).
- **Authoritative protocol:** `PROTOCOL.md` (`f9b0810b…` after amendment A1), frozen 2026-10-27T16:28:45Z;
  `PROTOCOL_FREEZE.json` (`16461ab0…` with A1) binds 34 files; **amendment head A1** (17:17:41Z, reporting only:
  fold-vector count 119/238 and the 16:16 shortlist regeneration disclosed; no rule, run or classification changed).
- **Verdict (predeclared rules; `FINAL_COMPARISON_AND_RECOMMENDATION.md`):** no phenotype is "stronger than VGT
  primary"; ETF-level (i) only **EWW** (on three knife-edges — F4 exactly 50%, its 2020 family in M by $1,233 of dip
  net, F5 28% — and a tied axis; the evidence leans to "none"); the other ten ETFs (ii); none (iii); GDX is one flag
  (F10, neighbourhood drawdown) from "stronger"; VGT primary (i) with a self-tie and F8 exempt; procedure-matched VGT
  control (ii). B4/B5 and the prospective freeze unchanged. Forward observations: 0.
- **Running:** nothing.
- **Next step:** none in this study. Any prospective observation (EWW alongside VGT primary) is the user's decision and
  needs its own frozen protocol before any post-2026-10-13 bar.

## Environment

- Branch `research/d1-standalone-etf-opportunity-robustness`, created 2026-10-27T15:14:44Z from `b21ed711` (pushed head
  of `research/vgt-standalone-vs-pooled-robustness`; contains ranked-preemption `9400593d`, B4/B5 audit `3c0ee0f3`, VGT
  audit `91c3b2e7`).
- Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`
  (`/opt/homebrew/bin/node` is v23.6.1). Apple M1 Pro, 10 cores, 16 GB; runs used 8 worker threads.
- Ignored and never staged: `research/btcusdt-d1/` (pre-existing), `data/`, `evaluations/`, `.env`, every `logs/`
  folder (this study's `results/logs/` holds local command logs only).
- Two disposable detached worktrees were created in the session scratchpad (`wt-b21ed711`, `wt-40da6ddf`) only to run
  the ranked-preemption verifier at its own commit; list with `git worktree list`, remove with `git worktree remove
  --force <path>`.
- No credentials, network, broker or downloads.

## Authority and read-only inputs

- Source study `research/d1-ranked-preemption/` (sealed STAGE_A bodies fold-a `46b91ce1…`, fold-b `fb025f3f…`, final
  `180e6498…`), read through its own doors; never written.
- Baselines (`results/baseline/`, 15:15Z): data `4df50bf3…` (64 data.csv + partitions), config `950624…`, prior
  research `45d920…` (824 files), `git-ls-files-stage.txt` `7eacd8…`, head `b21ed711…`. `verify` re-hashes all of them.

## Stage table (all complete; none may be rerun except the deterministic read-only ones)

| # | Stage | When (UTC) | Command (repository root) | Output (sha256) |
|---|---|---|---|---|
| 0 | State audit, baselines, prior verifiers | 15:15–15:24 | `pools verify`, `vgt-robustness verify`, `pools forward status`, `ranked-preemption verify` (own commit) | `results/baseline/*` |
| 1a | Census | 15:24 | `inventory` | `results/inventory/census.json` `6defe321…` |
| 1b | Parity sample (preregistered) | 15:29:21 | — | `results/parity/PARITY_SAMPLE.json` `351b8731…` |
| 1c | Parity 486/486 | 15:32→15:34 | `parity` | `results/parity/PARITY.json` `89f7a49f…` |
| 2a | Shortlist v1 (superseded), v2, labels regenerated 16:16 | 15:36, 15:37, 16:16 | `shortlist [--force]` | `results/shortlist/SHORTLIST-v1-superseded.json` `3b4a6d51…`; `SHORTLIST.json` `6ca7c91d…` |
| 2b | Benchmark (incumbents only) | 15:42 | `benchmark` | `results/benchmark/benchmark.json` `e8b2b902…` |
| 2c | Methodology review → dispositions | 15:49→16:22 | subagent | `reviews/methodology-review.md`, `reviews/METHODOLOGY_DISPOSITIONS.md` |
| 2d | Catalog v1 (superseded), v2, designs | 16:16, 16:18 | `catalog` | `results/catalog/catalog.json` `e857c1f8…`; v1 `23b738ba…`; `results/designs/designs.json` `c4893465…` |
| 2e | Confirmatory review; N1–N5 applied | 16:23→16:28 | subagent | `reviews/confirmatory-review.md` |
| 2f | Freeze | 16:28:45 | `freeze` | `PROTOCOL_FREEZE.json` |
| 3 | Runs, 7,825 (base parity 386/386 first) | 16:29:01→16:54:37 | `run --workers 8` | `results/runs/*.jsonl` (base `7e3b0841…`, incumbent `d6853336…`, cost `9e1ff2cf…`, oat `d03f131a…`, joint `7edc9173…`, fold `4bbd1c88…`); `results/parity/BASE_PARITY.json` `91437f4c…` |
| 4 | Analysis | 16:54:57 (56 s) | `analyze` | `results/analysis.json` `176ba96e…`; `results/tables/*.csv` |
| 5a | Reports | 17:00, final 17:19 | `report` | 14 rendered `.md` from `templates/` |
| 5b | Final checks | 17:03→17:09; re-verified 17:19 | `verify` (all pass), `npm test` 690/690, `tsc`, `eslint`, `pools verify`, `vgt-robustness verify`, `pools forward status` | `results/verify.json`; logs local |
| 5c | CLI demonstrations (incl. 3 refusals) | 17:09→17:12 | `list`, `compare`, `show`, `fixed …` | `evaluations/` (local) |
| 5d | Final independent audit → dispositions; amendment A1 | 17:02→17:19 | subagent; `amend` | `reviews/final-audit.md`, `reviews/FINAL_AUDIT_DISPOSITIONS.md` |
| 5e | Commit and push | see Git delivery | `git` | — |

## Constants

All in `src/d1-standalone-opportunity-audit/context.ts` (bound): windows and cutoffs (candidates ≤ 2023-12-29; folds ≤
their validation ends), arming 2017-06-15, base 11% / 5 bps / $100,000, the 19 cost scenarios (imported), the shortlist
rule, clusters, the joint stream (`'vgt-standalone-joint', 'VGT-primary', seed` 1 and 2; N = 64), the catalog (10%
reversal, bands 10/15/20/30%, major 20%, families 126 sessions, independence 252 sessions), the flag thresholds.

## Guards

- **Do not rerun:** `shortlist`, `catalog`, `benchmark`, `freeze` (all refuse), `run` (stored runs are final). Never
  edit a bound file except through `amend` (technical or reporting only). Safe to rerun: `inventory`, `parity`,
  `analyze`, `report`, `verify`, the views and the tests.
- Never evaluate a final-window research phenotype after 2023-12-29; never write to `config/`, `data/`, an earlier
  `research/` study or the prospective freeze's code closure.

## Disclosures

1. Shortlist v1 → v2 after seeing v1's output (merit slots added); catalog v1 → v2 after seeing the price-only v1
   catalog; both before the freeze, both archived and bound.
2. `SHORTLIST.json` regenerated at 16:16Z (labels, two disclosure fields; same selection); the 15:37 bytes were
   overwritten (amendment A1).
3. Protocol §9.1/§12 miscounted fold vectors (122/244 vs 119/238) — amendment A1.
4. The ranked-preemption verifier fails its code freeze on this branch (pre-existing at `b21ed711`) and passes at its own
   commit `40da6ddf`.
5. The `compare` view (report-only code) crashed on first use and was fixed after the runs.
6. Report text was corrected against `analysis.json` before and after the final audit; no record or classification
   changed.

## Git delivery

(Filled by the follow-up commit.)
