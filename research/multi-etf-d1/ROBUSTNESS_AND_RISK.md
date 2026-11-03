# Robustness and risk

Generated inputs: `results/tables/robustness.md`, `results/selection/<TICKER>/selection.json` (plateau statistics,
exit reasons, concentration), `results/holdout/holdout.json` (the predeclared sensitivities on the development and
holdout windows of the same continuous run) and `results/audit/` (data quality).

## 1. Drawdown

- The $35,000 minute-sampled screen was applied in development to the window judged (PROTOCOL.md 7.1). Unchanged D1
  breaches it on six of eight tickers in development ($40k–$72k); every nomination is inside it ($11k–$28k), and the
  primaries of XBI, XRT, KRE and XLE sit in the $23k–$28k band rather than under the preferred $25k. In the holdout
  window every contender's drawdown was $6k–$22k (one episode). None of this is a loss limit: the screen is a historical
  filter, and the next deep dip can exceed any figure here on a single position.
- Daily-close drawdowns are $1k–$4k below the minute-sampled ones for the nominations and up to $3k below for D1; both
  are reported everywhere. "Minute-sampled" always means marked at every regular-session minute close.

## 2. Trade concentration, exit mix, gaps

| Ticker | Role | Closed trades | Trailing stop | Stop gap | Maximum hold | Buffered loss | Worst trade | Worst excursion | Max losing streak |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | control (D1) | 44 | 13 | 2 | 26 | 3 | −$12,431 | −$14,875 | 6 |
| XBI | primary | 24 | 7 | 0 | 9 | 8 | −$5,471 | −$8,912 | 8 |
| XBI | alternate-lowDd | 29 | 11 | 12 | 5 | 1 | −$5,105 | −$7,953 | 2 |
| IWM | control (D1) | 12 | 3 | 3 | 6 | 0 | −$21,101 | −$24,239 | 2 |
| IWM | primary | 38 | 25 | 6 | 7 | 0 | −$6,256 | −$8,926 | 2 |
| IWM | alternate-lowDd | 33 | 21 | 7 | 5 | 0 | −$2,475 | −$7,549 | 2 |
| XRT | control (D1) | 34 | 12 | 3 | 16 | 3 | −$19,037 | −$22,154 | 5 |
| XRT | primary | 24 | 10 | 2 | 12 | 0 | −$15,167 | −$18,925 | 3 |
| XRT | alternate-lowDd | 18 | 7 | 3 | 8 | 0 | −$8,060 | −$19,663 | 3 |
| KRE | control (D1) | 32 | 12 | 1 | 19 | 0 | −$19,646 | −$22,386 | 4 |
| KRE | primary | 70 | 35 | 10 | 25 | 0 | −$19,601 | −$19,626 | 4 |
| KRE | alternate-lowDd | 73 | 33 | 10 | 29 | 1 | −$10,004 | −$18,031 | 6 |
| XLY | control (D1) | 17 | 7 | 2 | 8 | 0 | −$7,776 | −$18,562 | 2 |
| XLY | primary | 29 | 20 | 7 | 2 | 0 | −$10,336 | −$10,609 | 1 |
| XLY | alternate-lowDd | 34 | 19 | 8 | 7 | 0 | −$5,118 | −$7,656 | 1 |
| IWN | control (D1) | 10 | 2 | 3 | 5 | 0 | −$21,857 | −$23,311 | 2 |
| IWN | primary | 38 | 17 | 7 | 9 | 5 | −$6,537 | −$11,608 | 4 |
| IWN | alternate-lowDd | 22 | 12 | 6 | 4 | 0 | −$6,537 | −$6,537 | 2 |
| XLF | control (D1) | 14 | 3 | 4 | 7 | 0 | −$12,084 | −$18,686 | 3 |
| XLF | primary | 30 | 16 | 5 | 6 | 3 | −$3,917 | −$12,261 | 2 |
| XLF | alternate-lowDd | 30 | 13 | 7 | 7 | 3 | −$6,702 | −$8,055 | 2 |
| XLE | control (D1) | 32 | 10 | 2 | 20 | 0 | −$35,785 | −$35,900 | 6 |
| XLE | primary | 23 | 16 | 1 | 5 | 1 | −$9,596 | −$16,743 | 2 |
| XLE | alternate-lowDd | 25 | 13 | 7 | 4 | 1 | −$9,596 | −$16,743 | 2 |

- D1's development nets are one or two trades deep on five tickers (net without the best trade 3% of the net on XBI,
  negative on IWM, KRE, IWN). The scalp nominations spread their net over many small winners (77–90% of the net
  remains without the best trade); the trend-ride nominations (XBI, XRT, XLE primaries) keep 53–77%.
- Gap susceptibility: stop-gap exits (the session opens through an active stop) are 1–4 per contender in development;
  the worst single-trade adverse excursion is −$8k to −$20k for the nominations against −$15k to −$36k for D1. D1's
  largest loss, XLE 2020-03-06 → 03-16 (−$35,785, a 36% excursion on $100,000), is the kind of event no stop of this
  architecture prevents, because the stop is inactive below breakeven and the hold exit waits for the hold day.

## 3. Plateau versus needle

Every nomination passed the predeclared plateau check (≥ 75% of the one-parameter probes feasible, median probe net ≥
70% of the candidate's), with medians of 88–98%. The *minimum* probe net share is the weak point: 12% (IWN lowDd),
21–25% (XRT), 23% (XBI primary), 32–37% on five others. Those minima are usually the hold or the stop probe (hold 3 →
5, stop 3.1 → 3.6%), i.e. the phenotypes are ridges along one or two parameters rather than plateaus in all eight.

## 4. Cost and fill sensitivity (predeclared; costs applied causally inside the engine)

| Ticker | Role | Dev net (base) | next-open | 2 bps | 5 bps | 10 bps | Dev DD (base) | Dev DD at 10 bps |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| XBI | control | $35,145 | $34,726 | $33,350 | $33,631 | $29,470 | $68,829 | $71,178 |
| XBI | primary | $151,799 | $151,105 | $151,023 | $145,802 | $95,853 | $27,885 | $34,675 |
| XBI | alternate-lowDd | $118,055 | $118,049 | $117,251 | $115,438 | $112,577 | $12,837 | $13,027 |
| IWM | control | $13,778 | $13,834 | $13,288 | $12,554 | $11,331 | $39,694 | $40,248 |
| IWM | primary | $120,856 | $122,277 | $117,462 | $115,223 | $106,146 | $14,910 | $23,316 |
| IWM | alternate-lowDd | $106,642 | $108,029 | $103,312 | $101,263 | $86,813 | $13,303 | $20,946 |
| XRT | control | $41,132 | $41,189 | $41,010 | $41,458 | $41,220 | $41,800 | $42,547 |
| XRT | primary | $145,468 | $148,154 | $144,443 | $78,656 | $68,322 | $23,383 | $22,630 |
| XRT | alternate-lowDd | $127,705 | $129,050 | $126,928 | $125,763 | $124,492 | $19,966 | $19,946 |
| KRE | control | $4,950 | $4,983 | $3,663 | $1,733 | −$4,335 | $55,799 | $58,130 |
| KRE | primary | $171,785 | $170,524 | $146,515 | $142,640 | $136,188 | $26,271 | $26,833 |
| KRE | alternate-lowDd | $158,512 | $156,691 | $155,524 | $157,209 | $120,927 | $22,725 | $24,303 |
| XLY | control | $72,921 | $72,942 | $70,606 | $69,475 | $67,590 | $29,065 | $29,259 |
| XLY | primary | $112,490 | $112,285 | $111,263 | $109,424 | $106,361 | $16,972 | $17,557 |
| XLY | alternate-lowDd | $86,163 | $86,628 | $78,830 | $76,737 | $73,251 | $11,366 | $14,206 |
| IWN | control | $20,255 | $20,274 | $19,844 | $19,228 | $18,201 | $41,879 | $42,429 |
| IWN | primary | $111,181 | $110,297 | $97,185 | $95,040 | $91,530 | $16,875 | $30,506 |
| IWN | alternate-lowDd | $84,673 | $83,632 | $83,757 | $82,384 | $77,047 | $15,180 | $18,409 |
| XLF | control | $20,729 | $20,654 | $20,157 | $23,927 | $22,494 | $32,211 | $32,577 |
| XLF | primary | $121,499 | $122,138 | $120,324 | $118,636 | $99,433 | $17,071 | $31,367 |
| XLF | alternate-lowDd | $99,222 | $99,071 | $98,045 | $97,964 | $88,063 | $12,762 | $12,953 |
| XLE | control | $26,974 | $27,123 | $32,341 | $30,391 | $27,143 | $72,402 | $73,103 |
| XLE | primary | $154,448 | $150,266 | $153,516 | $152,038 | $149,733 | $24,861 | $25,199 |
| XLE | alternate-lowDd | $120,741 | $121,420 | $119,745 | $118,169 | $115,649 | $22,438 | $22,617 |

- The scalp phenotypes are **cost-fragile**: 5 bps per side removes 46% of XRT's primary development net ($145k →
  $79k) and 15% of KRE's at 2 bps ($172k → $147k); 10 bps removes 37% of XBI's and 12% of IWM's (whose drawdown rises
  from $15k to $23k) and 21% of XLE's. Frozen D1 loses 1–16% at 10 bps. The reason is mechanical: a 3% trailing stop
  and a 3–5-day hold make 20 bps round-trip a tenth of the typical winner.
- Next-open stop fills (the adverse fill) change the development nets by under 2% everywhere; the stop-level fill
  assumption is not where the fragility lies.
- These are hypothetical per-side costs; no spread was measured. IWN's thin tape (median 1,522 shares a minute, 13–17%
  zero-range minutes) and XRT's (3% zero-range minutes) make the observed-price fill proxy weakest exactly where the
  scalp phenotypes are most cost-sensitive.

## 5. Data quality and uncertainty

- Data (DATA_AUDIT.md): complete, sorted, raw, no missing session, one corporate action (XLF 2016-09-19) before the
  eligibility session and never in a rolling high after it. Distributions are not modelled (price-only, as VGT).
- Sample sizes: 10–45 development entries for D1, 18–73 for the nominations; 0–6 holdout entries. The holdout is one
  episode (April 2025) on eight correlated ETFs; the chronology in `STRATEGY_COMPARISON.md` shows every ticker armed
  within ten sessions of each other. Twenty-four frozen vectors were evaluated; with that many comparisons on that
  little data, a $10k–$25k difference between two contenders has no statistical meaning.
- The search was budget-bound on most folds (30 of 40 NSGA-II runs stopped at the cap); the nominations are the best of
  a bounded search, not optima, and several lie on the box edges (OPTIMIZATION_RESULTS.md §1).

| Ticker | Role | Dev net | Dev DD | Closed trades | Net w/o best / net | Worst trade | Worst excursion | Max losing streak | Plateau feasible / median / min | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| XBI | control (D1) | $35,145 | $68,829 | 44 | 3% | −$12,431 | −$14,875 | 6 | — | no |
| XBI | primary | $151,799 | $27,885 | 24 | 58% | −$5,471 | −$8,912 | 8 | 77% / 96% / 23% | no |
| XBI | alternate-lowDd | $118,055 | $12,837 | 29 | 87% | −$5,105 | −$7,953 | 2 | 100% / 89% / 62% | no |
| IWM | control (D1) | $13,778 | $39,694 | 12 | -2% | −$21,101 | −$24,239 | 2 | — | no |
| IWM | primary | $120,856 | $14,910 | 38 | 84% | −$6,256 | −$8,926 | 2 | 100% / 96% / 35% | no |
| IWM | alternate-lowDd | $106,642 | $13,303 | 33 | 87% | −$2,475 | −$7,549 | 2 | 100% / 97% / 34% | no |
| XRT | control (D1) | $41,132 | $41,800 | 34 | 57% | −$19,037 | −$22,154 | 5 | — | no |
| XRT | primary | $145,468 | $23,383 | 24 | 53% | −$15,167 | −$18,925 | 3 | 97% / 93% / 25% | no |
| XRT | alternate-lowDd | $127,705 | $19,966 | 18 | 50% | −$8,060 | −$19,663 | 3 | 100% / 97% / 21% | no |
| KRE | control (D1) | $4,950 | $55,799 | 32 | -235% | −$19,646 | −$22,386 | 4 | — | no |
| KRE | primary | $171,785 | $26,271 | 70 | 90% | −$19,601 | −$19,626 | 4 | 100% / 89% / 68% | no |
| KRE | alternate-lowDd | $158,512 | $22,725 | 73 | 89% | −$10,004 | −$18,031 | 6 | 93% / 88% / 73% | no |
| XLY | control (D1) | $72,921 | $29,065 | 17 | 60% | −$7,776 | −$18,562 | 2 | — | no |
| XLY | primary | $112,490 | $16,972 | 29 | 87% | −$10,336 | −$10,609 | 1 | 97% / 98% / 32% | no |
| XLY | alternate-lowDd | $86,163 | $11,366 | 34 | 87% | −$5,118 | −$7,656 | 1 | 100% / 89% / 55% | no |
| IWN | control (D1) | $20,255 | $41,879 | 10 | -1% | −$21,857 | −$23,311 | 2 | — | no |
| IWN | primary | $111,181 | $16,875 | 38 | 85% | −$6,537 | −$11,608 | 4 | 100% / 91% / 56% | no |
| IWN | alternate-lowDd | $84,673 | $15,180 | 22 | 77% | −$6,537 | −$6,537 | 2 | 100% / 89% / 12% | no |
| XLF | control (D1) | $20,729 | $32,211 | 14 | 18% | −$12,084 | −$18,686 | 3 | — | no |
| XLF | primary | $121,499 | $17,071 | 30 | 79% | −$3,917 | −$12,261 | 2 | 100% / 90% / 32% | no |
| XLF | alternate-lowDd | $99,222 | $12,762 | 30 | 86% | −$6,702 | −$8,055 | 2 | 96% / 93% / 66% | no |
| XLE | control (D1) | $26,974 | $72,402 | 32 | 12% | −$35,785 | −$35,900 | 6 | — | no |
| XLE | primary | $154,448 | $24,861 | 23 | 77% | −$9,596 | −$16,743 | 2 | 86% / 92% / 37% | no |
| XLE | alternate-lowDd | $120,741 | $22,438 | 25 | 85% | −$9,596 | −$16,743 | 2 | 89% / 96% / 72% | no |


