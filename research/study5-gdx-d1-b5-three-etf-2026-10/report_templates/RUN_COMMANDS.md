# Run commands (each executed in this checkout on 2026-10-30, exit status 0)

Environment: repository root `/home/chad/projects/margin-trading`, branch `research/study5-gdx-d1-b5-three-etf`,
Node v24.21.0 (`.node-version`), the canonical files `data/<SYMBOL>/data.csv` ending **2026-10-29** (GDX
`134b7450…`, VGT `624e4094…`, KRE `fd7ab8aa…`, XBI `83b71f75…`, XRT `c625ca57…`). No command reads `.env`
(`npm run app` loads it if present but these runs need no credential), contacts a broker or downloads anything.
`npm run app` first runs the project's `eslint && tsc --noEmit` (`preapp`), which takes ≈ 20 s. Logs of the verified
runs: `results/logs/commands/` (index with start times and exit codes in `index.txt`); the script that ran them all:
`scripts/verify_commands.sh`.

**Status of what these commands run:** `B5` is the frozen incumbent; `B5-3ETF-ablation` is a control (frozen books,
XBI/XRT removed); `portfolioAware` is B5's frozen GDX book; every `s5…` phenotype and `S5-…` pool is a **research
configuration that Study 5 did NOT nominate** (it failed a predeclared robustness gate; see RECOMMENDATION.md).

## Standalone GDX D1

```bash
# Baseline: B5's GDX book alone, the existing D1 runner, full history 2016-01-04 → 2026-10-29 (0 bps; the runner has
# no friction option): net $199,794, minute DD $33,555
npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype portfolioAware

# Study 5 research vectors (NOT nominated; failed G2), same runner, 0 bps:
#   near-miss 1 d1-ac0aaa704c: $270,872 / minute DD $29,636; near-miss 2 d1-a8e252df46: $264,151 / $29,854;
#   near-miss 3 d1-143e245fb1: $272,282 / $32,856
npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5StandaloneNearMiss1 --phenotype-file config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1/GDX.json
npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5StandaloneNearMiss2 --phenotype-file config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1/GDX.json
npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5StandaloneNearMiss3 --phenotype-file config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1/GDX.json
# Track 1's GDX P-vector alone (standalone; for reference): $185,546 / minute DD $44,423 (breach)
npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype s5Track1P --phenotype-file config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1/GDX.json

# The same vectors at 5 bps per side with the funded-trade ledger (one-book pools; pools engine and report unchanged):
#   portfolioAware $197,028.85 / $34,133.92; near-miss 1 $262,019.78 / $30,615.72; 2 $255,319.34 / $30,833.96;
#   3 $252,771.51 / $34,238.68
npm run study5 -- pool fixed S5-GDX-portfolioAware
npm run study5 -- pool fixed S5-GDX-NearMiss1
npm run study5 -- pool fixed S5-GDX-NearMiss2
npm run study5 -- pool fixed S5-GDX-NearMiss3
```

Other windows: add a partition after `GDX` (`training`, `holdout`, `final`; isolated windows with warm-up) or, for
the pool runner, `--dataset training|holdout|final`, `--end YYYY-MM-DD`, `--cost-bps N`, `--out DIR`, `--json`.

## Shared pools

```bash
# Frozen B5 (five ETFs) on the current files through 2026-10-29: $484,636.97, minute DD $26,509.97, 95 lots
# (one GDX lot open since 2026-10-22, marked −$1,570.80)
npm run pools -- fixed B5
# Frozen B5 on the pinned historical snapshot (the frozen anchor): $486,207.77, minute DD $26,509.97, 94 lots
npm run pools -- fixed B5 --end 2026-10-13
# B5-3ETF-frozen-ablation: VGT primary + KRE lowDd + GDX portfolioAware, no XBI/XRT: $417,104.58, minute DD $26,509.97
npm run pools -- fixed B5-3ETF-ablation
# Study 5 research pools (NOT nominated; failed PG2):
#   Track 1 P configuration $371,476.19, minute DD $39,623.25 (breach in 2026); Track 1 S $343,347.39, $30,086.79
npm run study5 -- pool fixed S5-T1P
npm run study5 -- pool fixed S5-T1S
# Validation of every pool config (B4, B5 and B5-3ETF-ablation)
npm run pools -- validate
```

Each pool run prints the funded-trade ledger, per-ETF summaries, totals, drawdowns, open positions and the
reconciliation checks, and writes `report.txt`, `summary.json`, `trades.csv`, `trades.json`, `signals.csv`,
`daily.csv`, `yearly.csv`, `monthly.csv` under `evaluations/` (git-ignored). Options as for `npm run pools -- fixed`.

## Reproducing the study (write-once stages refuse to re-run; outputs under `results/`)

```bash
npm run study5 -- freeze-protocol        # done 2026-10-30T20:41:48Z (refuses again)
npm run study5 -- parity                 # P1 replay = full engine, P2 = app runner, P4 original search reproduced
npm run pools -- fixed B5 --end 2026-10-13 --out evaluations/study5/P3-B5-fixed-2026-10-13   # P3
npm run study5 -- a-search main          # and: a-search wf20
npm run study5 -- track1 main            # and: track1 wf20
npm run study5 -- a-validate main        # and: a-validate wf20 (needs the search records)
npm run study5 -- track2                 # needs track1 main
npm run study5 -- b-candidates           # needs track2
npm run study5 -- b-validate             # needs b-candidates
npm run study5 -- freeze-selection       # done 2026-10-30T20:54:55Z (refuses again)
npm run study5 -- final                  # done once; npm run study5 -- final --confirm re-runs it identically
npm run study5 -- track1-wf20-test       # reporting: Track 1's WF20 picks on 2020–2021
python3 research/study5-gdx-d1-b5-three-etf-2026-10/scripts/report_tables.py   # tables from the sealed records
python3 research/study5-gdx-d1-b5-three-etf-2026-10/scripts/build_reports.py   # the root reports from report_templates/
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study5-gdx-b5-three-etf/tests/*.test.ts
```

To re-run a write-once stage elsewhere (for example in a fresh clone), delete nothing here: copy the study to a new
namespace. The large deterministic archives (`results/studyA/*/screen.jsonl`, `ga-r*.jsonl`, `results/track1/*/*.jsonl`,
`results/track2/archive.jsonl`) are git-ignored; their sha256 are in the sealed records. Every stage is seeded and single-threaded; determinism was
verified for the final evaluation (the confirmation re-run is identical) and for the parity reproduction of the original
search, not by re-running the write-once search stages.
