# B4/B5 frozen-strategy robustness audit — recovery checkpoint

## Top screen

- **Updated:** 2026-10-27T11:42:05Z (UTC)
- **Status:** **COMPLETE.** Every stage is done, reports are rendered, and tests pass. **Committed** at the user's
  request as `3c0ee0f3` on branch `research/b4-b5-robustness-audit` (not pushed). No process is running.
- **Authoritative protocol:** `PROTOCOL.md` sha256 `739134130ef2f058303422dda0cb90abff16372c8bdb19bb8757dbfabd2d95bf`.
  - Frozen 2026-10-27T09:56:01Z by `PROTOCOL_FREEZE.json` (sha256 `13fbc2ec…`).
  - Amendments: none.
- **Prospective criteria:** `PROSPECTIVE_VALIDATION_CRITERIA.md` sha256 `e6cdab66…`, frozen 10:36:56Z in
  `PROSPECTIVE_CRITERIA_FREEZE.json`, with forward observations = 0. They are recommended only, and the user adopts
  them.
- **Verdicts (FINAL_ASSESSMENT.md):** B4 Conditional (material fragility); B5 Conditional (material fragility),
  preferred.
- **Next step:** none required. Pushing needs the user's explicit request. Never rerun `run` to "refresh"; stored
  records are final.

## Environment

- Repo root is the working directory for every command. Branch `research/b4-b5-robustness-audit`; the study was
  built on `40da6ddf` and committed as `3c0ee0f3` (this checkpoint update follows in a separate commit).
- **Working tree:**
  - committed in `3c0ee0f3`: `package.json` (the npm script `robustness-audit`, the only change to a previously
    tracked file), `src/b4-b5-robustness/` (code + tests) and `research/b4-b5-robustness-audit/`;
  - `results/logs/` stays local under the repository's `logs/` ignore rule;
  - `?? research/btcusdt-d1/`: pre-existing, not ours, leave it.
- **Node v24.21.0:** `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`. Do not use
  the Homebrew v23.
- **Machine:** 10 cores, 16 GB. The batch used 8 worker threads.
- No credentials, network or broker.

## Authority and frozen inputs (read-only; verified unchanged)

| File | sha256 |
|---|---|
| `config/pools/B4.json` | `4ca5aa1a900bc9596007c914a333ff13b0a0e14df32e3d8ba5b7ce16638edf40` |
| `config/pools/B5.json` | `deef53ca531118064925a64e25288c927f3a71d8a05311075b439087960020fe` |
| `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` (body `407a669b…`) | `0dabd97e2b3d50fe9946b773bd9b845b07da1934eb4a797ecc9a59af129c3be2` |
| `research/joint-16-etf-d1/results/controls/controls.json` | `2bd521dcd95a1a2ed39234f62eab131da20e2e0afe587ca339149a6e69af5e5e` |
| phenotypes, partitions, splits, distributions, package-lock | see `MANIFEST.json` `fingerprints` |

- **Data.** The canonical `all` 2016-01-04 → 2026-10-13 (2,710 sessions) equals the pools' pinned hashes for VOOG,
  VGT, XBI, XRT, KRE and GDX (MANIFEST `data`).
- **Freeze.** `npm run pools -- forward status` printed "freeze … verifies" after all audit code existed
  (10:36:56Z).

## Stage table

| # | Stage | Status | Command | Output / record | Notes |
|---|---|---|---|---|---|
| 1 | Inspection | complete | — | this file | engine `src/portfolio-aware-d1/nbook/engine.ts` via `src/pools/run.ts` |
| 2 | Existing verifier | complete 09:47:14→09:48:49Z | `npm run pools -- verify` | `evaluations/pools/verify/verify.json` `74c7407f…`; `results/logs/pools-verify.log` | all passed |
| 3 | Protocol freeze | complete 09:56:01Z | — | `PROTOCOL.md` `73913413…`, `PROTOCOL_FREEZE.json` `13fbc2ec…` | before any audit run |
| 4a | Baseline (audit runner) | complete 10:02:28Z | `npm run robustness-audit -- baseline` | `results/baseline/baseline.json` `1fc93b66…` | 74/74 (runPoolOn parity bit-for-bit, anchors, controls incl. C0, identities, determinism incl. worker thread) |
| 5 | Batch runs | complete 10:04:06→10:12:35Z (489 s) | `npm run robustness-audit -- run --workers 8` | `results/runs/*.jsonl` (hashes below) | 1,755 stored; `status` n/n |
| 5b | Manifest + analysis | complete (last 10:37Z) | `… manifest`, `… analyze` | `MANIFEST.json` `794a6ffd…`; `results/analysis.json` `331bc9a6…` | regenerable (they contain timestamps) |
| 6 | Reports | complete 10:37Z | `… report` | 9 rendered `.md` (hashes below) from `templates/` | no placeholder missing |
| 7 | Tests | complete 10:35:41→10:36:40Z | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/b4-b5-robustness/tests/*.test.ts' 'src/pools/tests/*.test.ts'` | `results/logs/tests.log` | 51/51 pass, 0 skipped |

**`results/runs` sha256:**

| File | sha256 |
|---|---|
| ablation | `bb1fed3a…` |
| base | `6b0997aa…` |
| book | `07ef28b1…` |
| boundary | `192328a0…` |
| control | `a0147a52…` |
| cost | `6a9c6e18…` |
| dividends | `d4f01048…` |
| joint | `ee158a7f…` |
| oat | `8be209e6…` |

**Rendered reports sha256** (they change only if templates or the analysis change):

| File | sha256 |
|---|---|
| BASELINE_RECONCILIATION | `b0c9a914…` |
| COST_AND_EXECUTION_STRESS | `1bbdf4fe…` |
| DYNAMIC_PORTFOLIO_RISK | `ed2deed8…` |
| ETF_ABLATION | `5d026a7a…` |
| FINAL_ASSESSMENT | `97916c3a…` |
| PARAMETER_STABILITY | `1b6450f2…` |
| README | `9fccf24c…` |
| TRADE_CONCENTRATION | `6ea1f371…` |
| YEAR_AND_REGIME_ANALYSIS | `29c72a26…` |

## Constants

Everything is in `PROTOCOL.md` and `src/b4-b5-robustness/context.ts`:
- seeds: `deriveSeed('b4-b5-robustness-audit-v1', …)`;
- joint designs: N = 64 × 2 seeds; per-book designs: N = 32;
- 19 cost scenarios;
- VOOG ≥ 15% regime windows;
- gate thresholds.

## Headline results (from analysis.json)

- **Gate A FLAG, both pools.** The joint median net is 47% of frozen. All 256 joint samples are profitable, and none
  beats the frozen pool.
- **Gate B:** no flag.
- **Gate C:** no flag. B5 − B4 is $172.6k–$205.8k in every cost scenario. 2020 is 43.6% of it and R2 48.5%.
- **Gate D.**
  - B4: D35, D30 and D+ (34.65% / 37.01% against C0's 33.89% / 35.76%).
  - B5: D30 only (29.67% / 31.09%).
- **Gate E:** no flag.
- **Gate F:** no flag.
- **B5's drawdown advantage is not robust.** The joint median is 35.2%, and 118/128 neighbours' worst drawdown is in
  2022. The frozen 2022 gains of $57k / $85k are not reproduced: the neighbour median is about $7k.

## Disclosures

- **Analysis-stage fixes.** Before the reports, neither affecting any run or stored record:
  1. The detail `daily.csv` had no session index, so the bootstrap read 0 sessions. Fixed in `readDetail`, with a
     calendar-alignment check and a non-empty assertion.
  2. A naive CSV split broke quoted OAT fields. Replaced by an RFC-4180 parser with a round-trip test.
- **The narrative was proofread against the data.** Unverified mechanism claims were removed or verified: the 2022
  robustness claim was found **false** and reversed, and the exit-flip counts were verified.
- **`package.json` gained one npm script.** The prospective freeze binds only the `pools` script string and the
  imports map, and still verifies.

## Guards

- **Do not rerun:** the batch (`run`), the baseline record or the protocol freeze. Never edit `PROTOCOL.md`; a change
  is an amendment.
- **Never write diagnostic variants to `config/`.**
- **Re-rendering is safe.** `analyze` and `report` are deterministic apart from timestamps.
