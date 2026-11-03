# Baseline reconciliation — B4 and B5 (frozen), C0 (no margin)

Rendered by `npm run robustness-audit -- report` from `results/baseline/baseline.json` and `results/analysis.json`.
Protocol: `PROTOCOL.md` (sha256 `{{v.protocolSha}}`). Data window: {{v.window}}.

## Verdict

**The frozen baselines reproduce exactly, so the comparative audit proceeds.** The audit runner (`src/b4-b5-robustness/run.ts`) passed {{v.baselineChecks}} checks. Three of them carry the result:

- **Identical to `runPoolOn`.** Field for field, the audit runner equals the existing pools code path
  (`src/pools/run.ts` `runPoolOn`): every lot, signal, virtual trade, daily row, ledger event and drawdown is
  bit-identical. This holds for B4 and B5 fixed, and for their portfolios under both dividend conventions.
- **Anchors and controls.** It reproduces every regression anchor of the brief and pool configs: money to the cent,
  percentages to 0.01 pp. It also equals the frozen controls (`research/joint-16-etf-d1/results/controls/controls.json`)
  in every compared field, including the C0 no-margin control.
- **Before the audit.** The existing verifier `npm run pools -- verify` also passed all of its checks
  (`results/logs/pools-verify.log`), before any audit code existed.

No measurement or infrastructure defect was found. No frozen code, configuration, phenotype or record was changed.

## Regression anchors

{{t.anchors}}

## Frozen baselines in full

**Fixed pool:**
- one funded slot of $100,000, never compounded;
- shadow policy;
- 5 bps per side;
- 11% simple interest on a 365-day year;
- stops fill at the stop.

{{t.baselineFixed}}

**Dynamic portfolio:**
- $300,000 at 2016-01-04: 60% VOOG, 40% VGT;
- each funded trade borrows 20% of marked equity;
- profits are reinvested 60/40, and losses are funded by core sales;
- the **frozen** dividend convention: open VGT lots receive VGT distributions.

The **symmetric** convention (no lot receives a distribution) is shown as a sensitivity. Percent drawdowns are the
largest fall from the running peak of marked equity, from the engine's `PercentTracker`. The audit recomputed each
from the daily equity series and got identical results. The dollar columns are the engine's largest-dollar episodes.
They occur in later, larger-equity years and are not the same episodes as the percentage maxima.

{{t.baselinePortfolio}}

## Reconciliation notes

- **No discrepancy.** Every reference value of the brief (B4 $284,244.74 / $28,659.34 / $3,608,484.05 / 34.65%;
  B5 $486,207.77 / $26,509.97 / $5,410,976.72 / 29.67%) is reproduced exactly under the frozen provenance:
  - the canonical `all` files, at the hashes pinned in `config/pools/*.json`;
  - 5 bps per side and 11% interest;
  - the frozen dividend convention.
- **B5 minute % DD 31.09% and B4 37.01%** (the brief cites B5 only) are the engine's minute-sampled running-peak
  maxima. Both fall in the 2020-02-19 → 2020-03 crash.
- **Two different drawdown definitions apply.** The fixed-pool drawdowns ($28,659 / $26,510, i.e. % of the $100,000
  notional) are drawdowns of the margin book alone. They are never portfolio drawdowns. The portfolio percentages are
  of total account equity.
- **The symmetric dividend convention** lowers both end equities by well under 1% (see the table). It moves the %
  drawdowns by at most a few hundredths of a point, so the conclusions do not depend on the dividend convention.

## The checks

{{t.baselineChecks}}
