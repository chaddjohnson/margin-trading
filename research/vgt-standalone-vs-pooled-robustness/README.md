# Frozen standalone VGT versus B4/B5: a robustness audit

**What it is.** A controlled, diagnostic-only comparison of the existing frozen standalone VGT D1 strategy with the
frozen B4/B5 shared pools. It asks whether the simpler standalone is a more dependable way to deploy opportunistic
margin, even with lower historical profit.

**What it is not:**
- not an optimisation: nothing was tuned, searched, promoted or written to `config/`;
- not out-of-sample evidence: the window is the already-inspected 2016-01-04 → 2026-10-13.

**Start with `FINAL_COMPARISON_AND_RECOMMENDATION.md`.**

**The verdicts.**

| Conclusion | Verdict |
|---|---|
| (a) Historical profitability of standalone VGT | plausible but thinly evidenced |
| (b) Standalone more robust than pooled allocation on matched 8-D tests | no — the pools are more robust |
| (c) Prospective observation of S | merited; live deployment is not concluded |
| Predeclared overall outcome | **both worth parallel observation** |

- **On (b):** VGT's own parameters are the fragile part, and pooling damps that fragility.
- **On the overall outcome:** the "B5 preferable" rule failed only its drawdown condition, by 0.06 pp on the deciding
  seed.
- **Defaults unchanged:** B4 stays the default and B5 the leading pool.

## Documents

| File | Contents |
|---|---|
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | headline table, the three conclusions, the overall outcome, the strongest contrary evidence, limitations, recommendation, commands |
| `VGT_PHENOTYPE_INVENTORY.md` | every VGT configuration in the repo. Only `VGT/primary` is registered; **no VGT lowDd exists** |
| `PROTOCOL.md`, `PROTOCOL_FREEZE.json` | the pre-registered procedure (frozen before any new run) and amendment A1 |
| `BASELINE_AND_COMPARABILITY.md` | the anchors and the parity checks; the shadow identity; S's 21 lots in each structure |
| `PARAMETER_STABILITY.md` | OAT, matched 8-D (paired), S joint 8-D, and the separately labelled system-level 32/40-D stresses; traced paths |
| `TRADES_YEARS_AND_REGIMES.md` | ledgers, MAE/MFE, concentration, years, regimes, the prior ablation context, the bootstrap |
| `COST_AND_FILL_SENSITIVITY.md` | the 19 cost and fill scenarios: S fresh, B4/B5 from stored records |
| `PORTFOLIO_RISK_AND_CAPITAL_EFFICIENCY.md` | the $300k portfolio against C0, efficiency, VGT duplication, neighbourhood risk, margin proximity |
| `MANIFEST.json` | commit, protocol head, read-only input hashes, every design point, run keys, record-file hashes |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint |
| `templates/` | report narratives with `{{…}}` placeholders, filled from `results/analysis.json` |
| `results/` | runs, detail ledgers, baseline and parity records, `analysis.json`, CSV tables (see below) |

## Scope, provenance and dependencies

**Tested configurations:**
- **S** = `config/phenotypes/D1/VGT.json` `primary` (`d1-ebc9f639b3`), run as the one-book pool `[VGT primary]`;
- **B4** and **B5** = `config/pools/B4.json` and `B5.json`;
- **C0** = the 60/40 VOOG/VGT core alone.

**Engine and runner.** The frozen N-book engine (`src/portfolio-aware-d1/nbook/engine.ts`), through the completed
B4/B5 audit's pure runner (`src/b4-b5-robustness/run.ts`). Both are imported read-only. No engine code is copied.

**Reused records** (read-only, never rewritten): `research/b4-b5-robustness-audit/`. Its protocol `73913413…` is
checked by every command.

**Data:**
- canonical `data/<SYMBOL>/data.csv`, the `all` partition, at the hashes pinned by `config/pools/B5.json`;
- 2,710 sessions, splits forward-adjusted, arming from 2017-06-15;
- no bar after 2026-10-13 is read.

**Unchanged:**
- every file in `config/`;
- every file bound by the prospective freeze (`research/prospective-b4-b5-shadow/`);
- every prior research directory.

The only tracked file changed outside this directory and `src/vgt-standalone-robustness/` is `package.json`, which
gained the separate `vgt-robustness` script.

## Requirements

- **Node v24.21.0** (`.node-version`). Every command refuses another major version. With fnm:
  `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.
- **Data:** the canonical data files above (git-ignored; their hashes are in `MANIFEST.json`).
- **Nothing external:** no `.env`, credentials, network or broker.

## Reproduce (from the repository root)

```bash
npm run pools -- verify                        # the existing regression (about 1.5 min)
npm run vgt-robustness -- baseline             # the parity checks (about 45 s): 47 on first run, which stores the two S base records; 49 on a rerun, which checks them instead
npm run vgt-robustness -- run --workers 8      # every protocol run not yet stored (623 in all; about 2 min on 8 workers)
npm run vgt-robustness -- status               # stored versus pending runs per family
npm run vgt-robustness -- analyze              # results/analysis.json + CSV tables (about 30 s)
npm run vgt-robustness -- report               # renders the six data reports from templates/
npm run vgt-robustness -- manifest             # MANIFEST.json
npm run vgt-robustness -- verify               # read-only inputs, prior audit, prospective freeze, records = MANIFEST.json
```

**Resuming and re-running:**
- `run` skips every stored run whose specification hash still matches, so an interrupted batch resumes.
- Runs are deterministic. To recompute a family from scratch, move its `results/runs/<family>.jsonl` aside.
- The stored records are final. Do not re-run `run` "to refresh".
- `run`, `status`, `manifest`, `analyze` and `report` refuse to start unless `PROTOCOL.md` hashes to its recorded
  amendment head and the prior audit's protocol is unchanged.

## Commands I can run

```bash
npm run vgt-robustness -- fixed VGT-primary                  # one $100,000 lot on `all`, 5 bps, 11%: every trade + summary
npm run vgt-robustness -- fixed VGT-primary --cost-bps 10    # at another per-side cost
npm run vgt-robustness -- portfolio VGT-primary              # $300,000 60/40 core, 20% of equity per lot
npm run vgt-robustness -- compare                            # S, B4, B5, C0 side by side (add --cost-bps N)
npm run app -- allIn-trailingBuy-postExitContinuation VGT all --phenotype primary   # the existing CLI (0 bps)
npm run pools -- fixed B5
npm run pools -- compare B4 B5
npm run pools -- forward status                              # the prospective freeze verifies
```

- **Outputs.** `fixed`, `portfolio` and `compare` print to the terminal. `fixed` and `portfolio` also write
  `trades.csv`, `trades.json` and `summary.json` under `evaluations/vgt-robustness/` (git-ignored); writing into
  `research/` is refused.
- **lowDd.** There is no VGT lowDd, and `fixed lowDd` is refused.

## Tests

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/vgt-standalone-robustness/tests/*.test.ts'
```

**`rules.test.ts`** (no data needed):
- the protocol constants match the prior audit's;
- the matched designs equal the prior per-book VGT designs;
- design determinism, legality and quantization;
- no variant mutates a phenotype or pool config;
- the run counts and keys;
- lot-path identity and preservation;
- the retention, tally and tie rules;
- the cost layers.

**`regression.test.ts`** (canonical data; skipped if the hashes differ):
- S equals the frozen B1 controls;
- S at 0 bps equals the standalone CLI ledger;
- the shadow identity inside B4;
- cost changes alter the profit-dependent exits (a path, not only a subtraction);
- gross − friction − interest = net;
- determinism;
- equality with the stored base records.

## Layout

**Code:** `src/vgt-standalone-robustness/`.

| Module | Role |
|---|---|
| `context.ts` | constants, imported from the prior audit where shared |
| `specs.ts` | run specifications |
| `store.ts` | the JSON-lines store |
| `baseline.ts` | the parity checks |
| `cli.ts`, `main.ts` | the commands |
| `analysis.ts` | the analysis |
| `tables.ts`, `render.ts` | the reports |
| `manifest.ts`, `verify.ts` | the manifest and the verifier |
| `tests/` | the tests |

**Results** (`results/`):

| Path | Contents |
|---|---|
| `runs/<family>.jsonl` | one compact record per run |
| `detail/` | S's base fixed and portfolio ledgers |
| `baseline/baseline.json` | the parity record |
| `parity/` | the existing CLI's trade list and summary |
| `analysis.json` | every analysed figure |
| `P_*.csv` | parameter stability |
| `E_*.csv` | execution paths |
| `T_*.csv` (+ `T_trades_VGT-primary_fixed.json`) | trades, years and regimes, including the chronological funded-trade ledgers of S in both modes |
| `C_costs.csv` | the cost scenarios |
| `R_*.csv` | portfolio and episodes |
| `logs/` | run logs; local only, under the repository's `logs/` ignore rule |

**Run families:**

| Family | Runs |
|---|---:|
| `s-base` | 2 |
| `s-control` (0/2/10 bps, symmetric dividends) | 7 |
| `s-cost` | 36 |
| `s-oat` | 64 |
| `s-paired` | 128 |
| `s-joint` | 256 |
| `p-path` (pooled VGT design points re-executed with their lots, each equal to its prior record) | 130 |

## Limitations

- **One inspected history.** Nothing is independent validation. PBO and the deflated Sharpe ratio are not computed.
- **Small samples.** S has 21 lots, and neighbourhood designs are sensitivity designs, not probabilities.
- **Not modelled:**
  - margin calls, forced sales and house-requirement changes;
  - the Vanguard 30-day rule;
  - quote-level fills.
- **Not like-for-like.** The 8-D against 32/40-D joint comparison is not a like-for-like stability measure, and it is
  labelled as such throughout.
