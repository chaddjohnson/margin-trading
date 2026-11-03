# Implementation audit

## 1. What was added, what was preserved

**Preserved unchanged** (verified by `git status`: no modification): every file under `src/app/` except the new
`src/app/sharedMargin.ts`, in particular `allIn-trailingBuy-postExitContinuation.ts` (D1),
`allIn-trailingBuy-postExitContinuation-stopGrossBreakeven.ts` (B2), `allIn-trailingBuy-swingLow.ts` (C2) and
`allIn-trailingBuy-bufferedLoss-noReentry.ts` (Set 2); every earlier research directory; the data files; the
D1-refinement, recovery-eligibility, four-family and trailing-buy-variants modules this program imports from
(`Dataset`/`fixtureDataset`/`computeReferenceHighs`, `computeReferenceLows`/`simulate`, `replay`).

**Added** (all new files; sha256 at the time of writing, 2026-10-22):

| File | Lines | Purpose | sha256 (first 16) |
|---|---:|---|---|
| `src/shared-margin-portfolio/data.ts` | ~330 | VGT dataset, aligned VOOG sessions, distribution ledger, hashes, price-path shifts, the data audit | `6612220432ce8350` |
| `src/shared-margin-portfolio/strategy.ts` | ~560 | D1 / B2 / B3 / swing-low / Set 2 as minute-stepped entry machines and the exit manager (ported from the files) | `0407559247569b2f` |
| `src/shared-margin-portfolio/account.ts` | ~330 | the margin-account ledger: core shares, lots, cash, receivables, funding payable, event log, reconciliation | `4d159be396b2f41c` |
| `src/shared-margin-portfolio/engine.ts` | ~1,000 | the chronological scenario engine: capital gate, policies, takeover transfer, displacement, core orders, dividends, forced sales, daily and minute-sampled marks | `d464979e0d6b9bbc` |
| `src/shared-margin-portfolio/scenarios.ts` | ~300 | the predeclared catalogue, shadow-trade extraction, per-scenario and combined outputs | `9dbe745e63c9725d` |
| `src/shared-margin-portfolio/metrics.ts` | ~430 | summary, year-by-year rows, trade records, adverse excursions, CSV helpers | `429b1f62f649b9f7` |
| `src/shared-margin-portfolio/overlap.ts` | ~330 | Track I overlap statistics, competing signals, T1/T2 counterfactuals | `efa0a3a503f7527` |
| `src/shared-margin-portfolio/replay.ts` | ~170 | lot replays under own rules on shocked paths and under transferred rules | `997530a08d41be37` |
| `src/shared-margin-portfolio/stress.ts` | ~330 | gap tables, correlated stress, interest split | `4c7b34ec2b9a41e3` |
| `src/shared-margin-portfolio/parity.ts` | ~300 | regression against the files' outputs and the D1-refinement engine | `a631a514a63c37ac` |
| `src/shared-margin-portfolio/audit.ts` | ~190 | independent recomputation of a scenario's ledger | `a24f3eccdaaef888` |
| `src/shared-margin-portfolio/report.ts` | ~500 | Markdown tables rendered from the result files | `fd7fac6aba703896` |
| `src/shared-margin-portfolio/cli.ts` | ~330 | the commands | `24679f0a5aaf7382` |
| `src/shared-margin-portfolio/tests/fixtures.ts`, `tests/engine.test.ts` | ~430 | synthetic sessions and 14 tests | `25b3ec069b7c105e`, `e21037cfc2752be0` |
| `src/app/sharedMargin.ts` | 7 | the `npm run shared-margin` entry | `248b74f202a2694e` |
| `package.json` | +1 line | the `shared-margin` script | — |
| `.gitignore` | +7 lines | per-minute signal logs and sensitivity ledgers (regenerable) | — |

The hashes above were taken before the final prettier pass over `scenarios.ts`, `report.ts` and `cli.ts`; the
current values are `shasum -a 256 src/shared-margin-portfolio/*.ts`.

## 2. Inputs

| Input | sha256 | Checked by |
|---|---|---|
| `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f` | `loadProgramData` (refuses to run on a different hash) |
| `data/VOOG/VOOG-2016-2025-1-minute.csv` | `f4ad4d72f39b157fce64e023f644c4648db840be39ce6979ff42a5818d278cc2` | same |
| `research/risk-management/vgt-portfolio-margin/data/distributions.csv` | `30adf087e7f54927928c12a9d23e198d19336a7e6257df2e9be7e3fc70dba923` | same |
| `data/VGT/VGT-2016-2026.csv`, `data/VOOG/VOOG-2016-2026.csv` | `653b0030…`, `958ded64…` | audit only (dividend re-derivation) |

`results/audit/data_audit.json` records the session count (2,459), bar counts (797,115 VGT; 382,275 VOOG), VOOG's
403 sessions without a closing print and median 149 traded minutes, the start prices (106.61 VGT closing print;
101.89 VOOG last trade), the ledger's 78 distributions (3 estimated amounts), and the re-derivation: 35 of 36 VGT
and 35 of 35 VOOG ex-dates with adjusted data matched (VGT's 2020-03-10 re-derives as 2020-03-09), amounts within
±4% per record and 0.48% / 0.57% in aggregate.

## 3. Commands

```
npm run shared-margin -- audit                     # results/audit/data_audit.json
npm run shared-margin -- parity [--file-dir DIR]   # results/parity/parity.json (27 cases with the files' outputs)
npm run shared-margin -- overlap                   # results/position_overlaps.csv, competing_signals.csv, overlap/
npm run shared-margin -- run [--keys A,B,...]      # results/scenarios/<key>/, scenario_summary.*, annual_portfolio.csv,
                                                   #   shared_margin_trades.csv, margin_ledger.csv, portfolio_equity.csv
npm run shared-margin -- stress                    # results/stress/ (gaps, correlated, interest, full-path re-runs)
npm run shared-margin -- audit-ledger [--keys ...] # results/audit/ledger_audit.json
npm run shared-margin -- comparator [--scenario B] # results/comparator/
npm run shared-margin -- report                    # results/tables/*.md
npm run shared-margin -- all [--file-dir DIR]      # everything above (≈40 s on this machine)
npm run shared-margin -- standalone --strategy swing --arm 55
npm test                                           # the whole suite; this program's tests are src/shared-margin-portfolio/tests/
```

The `--file-dir` directory holds the strategy files' own outputs, produced by
`npm run app -- allIn-trailingBuy-postExitContinuation VGT - - - DIR/d1`,
`… -stopGrossBreakeven VGT - - - DIR/bb` and `… allIn-trailingBuy-swingLow VGT - - - DIR/swing` (the files write
`trades.csv`, `daily.csv`, `summary.json`). Without it, `parity` compares only with the D1-refinement engine.

Every command is deterministic; two runs of `all` on 2026-10-22 produced byte-identical CSVs.

## 4. Validation status

| Check | Result |
|---|---|
| Parity with the files' outputs (D1, B2, swing-low): trades, totals, drawdowns, 2,459 daily marks | 3 cases, 0 differences |
| Parity with the D1-refinement engine (D1, B2, B3, swing-low ×2 eligibilities, Set 2; 8% / 11% / 14%; stop and next-open fills) | 24 cases, 0 differences |
| Scenario A against the committed $400k study scaled by 0.75 | $1,784,588.03 vs $1,784,588.25 |
| Ledger identity (assets − liabilities = equity, $0.01) after every event | asserted in every run, never failed |
| Independent ledger audit (`audit.ts`: holdings and cash from event deltas, equity identity per event and per day, every lot's interest and net from first principles, every entitlement from the distribution ledger, sizing fraction, no principal without a lot) | 19 principal scenarios, 3,324–4,796 checks each, 0 failures |
| Synthetic tests (`tests/engine.test.ts`): first-signal-wins decline and later fill, cancel semantics, T1 takeover (no new principal, carried high, hold clock), T2a/T2b (reset reference, restarted clock), same-bar tie, gapped stop at the open, loss funding by proportional core sales, forced liquidation, ex-date and pay-date dividends, closing-print fill, carried order to the next open and an open lot at the end, Reg T decline, split and dynamic sizing, parity with the D1-refinement engine on synthetic data | 14 tests, 14 pass |
| `npm test` (whole repository) | 244 tests: 216 pass, 20 fail, 8 cancelled. The 20 failures and 8 cancellations are the pre-existing ones recorded by the previous two programs (minute-optimizer golden masters and `allIn.ts` byte-identity tests that the earlier parameter change broke); the baseline before this program was 230 tests, 202 pass, 20 fail, 8 cancelled. |
| `npx tsc --noEmit` | clean |
| `npx eslint src/shared-margin-portfolio src/app/sharedMargin.ts` | 0 errors; 1 prettier line-wrap warning |

## 5. Look-ahead and causality

- Entry decisions use completed minutes only; fills are the next observed trade (the files' rule). Sizing uses the
  decision minute's VGT close and VOOG's last *completed* minute at or before the decision time (`bar.time + 60 ≤
  decisionTime`), never a later VOOG print.
- Exits of lots open at a session's start are decided from the pre-session state and the session's bars in the
  files' own order; takeover and displacement cancel a later scheduled exit only from the decision minute forwards
  (an exit at an earlier bar has already executed).
- Reinvestment and loss funding orders fill at the first VGT bar after the exit minute and VOOG's first bar at or
  after that time (or the closing print / the next session's opening trade); cash holds the amount meanwhile.
- Entitlements use the shares held at the previous close; pay-date purchases use the pay session's close.
- Forced sales ordered at a close execute at the next opening trades.
- Daily marks use same-day closes only for end-of-day values.

## 6. Known limitations of the implementation

- The hold semantics logs one refused signal per re-tested minute (tens of thousands of rows for a shared
  scenario); `signals.csv` is compact (one row per refused setup) and the full `signals_minutes.csv` is git-ignored.
- `wholeShares` floors shares at every fill and leaves residual cash; it is a sensitivity (B-whole), not the primary
  convention.
- Costs are a symmetric per-side proportional charge; there is no spread model, no market impact and no
  commission schedule.
- The maintenance rule (lot first, then proportional core, restore m + 5 points at the next open) is generic and
  illustrative; brokers liquidate at their discretion.
- Interest is simple, per lot, paid at exit; a broker capitalizes monthly (the earlier $400k study did), a
  difference of a few hundred dollars per lot-year that is the same in every scenario.
- The stress replays shift every price from a session onwards by a constant factor; a real gap would also change
  volatility, spreads and the arming of later setups in ways a constant shift does not capture.
- Pay dates and three 2016 VOOG distribution amounts are estimates inherited from the earlier study.

## 7. Outputs

`results/` (≈50 MB after the git-ignored logs; `du -sh` 101 MB with them): `scenario_summary.csv/json`,
`annual_portfolio.csv`, `portfolio_equity.csv` (wide daily equity), `shared_margin_trades.csv`, `margin_ledger.csv`,
`position_overlaps.csv`, `competing_signals.csv`; `scenarios/<key>/` (summary.json, trades.csv, daily.csv, ledger.csv,
signals.csv, annual.csv, dividends.csv, takeovers.csv, forced_sales.csv); `overlap/`; `stress/` (stress_gaps.csv,
stress_correlated.csv, stress_interest.csv, stress_full_path.csv, 12 re-run directories); `comparator/`;
`audit/` (data_audit.json, ledger_audit.json); `parity/parity.json`; `tables/*.md`.

Nothing in this program is committed at the time of writing (branch `research/trailing-buy-four-family-optimization`).
