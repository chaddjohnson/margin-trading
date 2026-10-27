# B4/B5 frozen-strategy robustness audit

An independent, reproducible robustness and overfitting audit of the two frozen D1 shared pools:
- **B4** (`config/pools/B4.json`: VGT primary, XBI/XRT/KRE lowDd);
- **B5** (`config/pools/B5.json`: B4 + GDX portfolioAware).

It is a diagnostic, not a search:
- nothing is optimised, selected or promoted;
- every variant is diagnostic-only and never written to `config/`;
- no frozen file is changed;
- the prospective B4/B5 freeze (`research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`) still verifies.

**Start with `FINAL_ASSESSMENT.md`.**

| Document | Contents |
|---|---|
| `PROTOCOL.md`, `PROTOCOL_FREEZE.json` | the pre-registered plan, scenarios, regimes and gates (sha256 `{{v.protocolSha}}`), frozen before any audit run |
| `MANIFEST.json` | commit, config/data fingerprints, date coverage, conventions, parameter bounds, every OAT point and sampled configuration, scenarios, seeds, run keys |
| `BASELINE_RECONCILIATION.md` | B4/B5/C0 reproduced exactly (anchors, `runPoolOn` parity, frozen controls) |
| `PARAMETER_STABILITY.md` | Workstream A: OAT, joint and per-book neighbourhoods |
| `YEAR_AND_REGIME_ANALYSIS.md` | Workstream B: years, leave-one-year-out attribution, regimes, bootstrap |
| `ETF_ABLATION.md` | Workstream C: leave-one-book-out, B5 − GDX = B4, the B5 − B4 bridge |
| `COST_AND_EXECUTION_STRESS.md` | Workstream D: financing, friction, slippage, stops; cost versus path effects |
| `TRADE_CONCENTRATION.md` | Workstream E: trade quality, concentration, MAE/MFE, episode lots |
| `DYNAMIC_PORTFOLIO_RISK.md` | Workstream F: C0/B4/B5 portfolios, drawdowns, margin proximity |
| `FINAL_ASSESSMENT.md` | verdicts, evidence, failure modes, the prospective plan |
| `PROSPECTIVE_VALIDATION_CRITERIA.md`, `PROSPECTIVE_CRITERIA_FREEZE.json` | frozen forward decision criteria (the user's to adopt) and their hash |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint (stage table, hashes, guards) |

## Requirements

- **Node v24.21.0** (`.node-version`); every command refuses another major version. With fnm:
  `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.
- **The canonical data files** `data/{VOOG,VGT,XBI,XRT,KRE,GDX}/data.csv` at the hashes pinned in
  `config/pools/B5.json`, covering 2016-01-04 → 2026-10-13. The data are git-ignored, so the hashes are in
  `MANIFEST.json`. The runner refuses other data.
- **No credentials, network or broker.** The script loads no `.env`.

## Commands (from the repository root)

```bash
npm run pools -- verify                      # the existing regression verifier (about 1.5 min)
npm run robustness-audit -- baseline         # audit runner = runPoolOn, anchors, frozen controls, identities (about 1 min)
npm run robustness-audit -- run --workers 8  # every protocol run not yet stored; resumable (1,748 runs: about 8 min)
npm run robustness-audit -- status           # stored versus pending runs per family
npm run robustness-audit -- manifest         # MANIFEST.json
npm run robustness-audit -- analyze          # results/analysis.json + CSV tables (about 20 s)
npm run robustness-audit -- report           # renders the Markdown reports from templates/ + analysis.json
```

**Subsets and reruns:**
- `run --family F` runs one family: `base`, `control`, `dividends`, `cost`, `ablation`, `oat`, `boundary`, `joint`
  or `book`.
- `run --local` runs without worker threads.
- `run` skips every stored run whose specification hash still matches, so an interrupted batch resumes. To recompute
  a family from scratch, move its `results/runs/<family>.jsonl` aside. Runs are deterministic, so they reproduce
  identically.
- Every command refuses to start if `PROTOCOL.md` no longer hashes to the frozen value.

## Tests

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/b4-b5-robustness/tests/*.test.ts'
```

**`rules.test.ts`:**
- the pre-registered distance rules on every frozen value;
- infeasible and boundary OAT points;
- Latin-hypercube determinism, bounds and coverage;
- immutability of the pool configs while variants are generated;
- the run counts;
- the cost layers (fee + slippage = costBps);
- re-costing signs and scaling;
- drawdown episodes and running-peak percentages;
- break-even interpolation without extrapolation;
- the paired stationary bootstrap.

**`engine.test.ts`**, on synthetic data:
- fee and interest signs and scaling on the same trade;
- stop overshoot exact on stop exits and absent on other exits;
- a never-arming book changing nothing (the ablation identity);
- gross − friction − interest = net;
- yearly attribution summing to the total;
- MAE/MFE windows (the exit bar's range excluded).

**`regression.test.ts`**, on the canonical data (skipped if the hashes differ):
- B4/B5 fixed anchors to the cent;
- B5 − GDX = B4 in every figure;
- determinism;
- equality with the stored base records.

## Layout

- **Code:** `src/b4-b5-robustness/`. Read-only imports of the frozen engine (`src/portfolio-aware-d1/nbook/engine.ts`)
  and the pools loader; no frozen file is edited. Entry point: `main.ts`, npm script `robustness-audit`.
- **Results:** `results/`
  - `runs/<family>.jsonl`: one compact record per run;
  - `detail/`: full lot and daily ledgers of the base, control and symmetric-dividend runs;
  - `baseline/baseline.json`;
  - `analysis.json`;
  - CSV tables `A_*`, `B_*`, `C_*`, `D_*`, `E_*`, `F_*`;
  - `logs/`.
- **Templates:** `templates/*.md`. They hold the reports' narrative, and their `{{…}}` placeholders are filled from
  `analysis.json` by `src/b4-b5-robustness/tables.ts`. A missing value fails the render.

## Conventions and assumptions

- **Window:** {{v.window}}. Continuous `all` runs only, with no isolated `final` partition and no warm-up splice.
- **Fixed pool:** one slot of $100,000, never compounded; shadow policy; 5 bps per side; 11% simple interest
  (365-day year); stops fill at the stop.
- **Portfolio:** $300,000 at 60/40 VOOG/VGT; 20% of marked equity borrowed per funded trade; the frozen dividend
  convention (symmetric reported as a sensitivity); no calls or forced sales modelled.
- **Drawdowns:**
  - Fixed-pool drawdowns are dollars and % of the $100,000 notional.
  - Portfolio drawdowns are the largest % fall of total equity from its running peak, at the daily close and
    minute-sampled.
  - The two are never interchanged.
- **Disclosed fix.** During analysis (before any report) the detail daily ledger lacked a session-index column, and
  the bootstrap read zero sessions. The reader now derives the index from row order and checks it against the
  calendar; the analysis asserts a non-empty series. No run or stored record was affected.

## Runtime (measured on 10 cores / 16 GB, 2026-10-27)

| Step | Time |
|---|---|
| `baseline` | about 75 s |
| the 1,748-run batch on 8 worker threads | 489 s |
| `analyze` | about 20 s |
| `report` | seconds |
