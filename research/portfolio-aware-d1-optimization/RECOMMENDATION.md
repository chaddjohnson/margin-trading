# Recommendation: GDX (portfolio-aware D1 book) as an optional addition to All-lowDd — accepted, on thin evidence

**Protocol outcome.** Of the six frozen configurations, exactly one passed every frozen training gate and every frozen
post-training acceptance rule: **P-add-GDX** — the unchanged All-lowDd shadow allocator (VGT `primary`, XBI/XRT/KRE
`lowDd`, first executable signal wins) **plus a fifth D1 book on GDX** with the Track P vector
X 27.4% · Y 0.4% · stop 7.1% · hold 18 · L 100 · buffer 3.6% · P 19.1% · W 81 (`d1-51ea8d4bd6`). By the frozen
ranking it is the protocol's recommendation. All-lowDd's own books, phenotypes and rules are unchanged.

**Evidence-weighted view.** Treat it as a **specific optional addition worth a forward test**, not as a demonstrated
improvement. The case for it is consistent across modes and costs, but the out-of-sample record is seven GDX trades in
one market regime, and two of them carry the whole post-training gain. All-lowDd unchanged remains a fully defensible
choice; nothing in this study shows it is wrong.

## The figures (5 bps per side; one continuous run 2016-01-04 → 2026-10-13; full engine)

| | S0 All-lowDd | P-add-GDX | Δ |
|---|---:|---:|---:|
| Fixed $100k, training (2017-06-15 → 2023-12-29) | $242,196 | $388,489 | +$146,293 (in-sample, optimized) |
| Fixed, holdout (2024-01-02 → 2025-10-16) | $44,003 | $68,584 | **+$24,581** (1 GDX lot) |
| Fixed, final (2025-10-17 → 2026-10-13) | −$1,954 | $29,135 | **+$31,089** (6 GDX lots) |
| Fixed, maximum minute-sampled drawdown (all) | $28,659 | $26,510 | −$2,149 |
| Fixed, post-training Δ at 0 / 2 / 5 / 10 bps | | | +$56,431 / +$56,126 / +$55,670 / +$54,909 |
| 20% portfolio, ending equity 2026-10-13 | $3,608,484 | $5,410,977 | +$1,802,493 (mostly the training head start, compounded) |
| Portfolio return, holdout / final | 68.42% / 27.70% | 76.50% / 35.04% | **+8.1 / +7.3 points** |
| Portfolio maximum % drawdown, daily / minute (all) | 34.65% / 37.01% | **29.67% / 31.09%** | −5.0 / −5.9 points (March 2020) |
| Portfolio maximum % drawdown within holdout / final | 25.21% / 16.02% | 25.13% / 15.22% | ≈ unchanged |

**Funded and blocked trades.** In training the GDX book funds 9 lots ($149,556), displaces 19 S0 lots ($52,933) and,
through the changed path, funds 21 other baseline lots ($49,670); VGT's funded lots fall from 11 to 9 (−$56k) while
KRE and XBI gain. After 2023 it displaces nothing and gains nothing: all seven post-training GDX signals arrived while
the pool was idle (S0's five post-training lots are funded identically). **Costs:** insensitive from 0 to 10 bps.
**Distributions:** GDX lots are price-only; at its 169 post-training lot-days each 1% of yield is worth ≈ $460 —
immaterial. **Matched borrowing:** on training P-add-GDX borrows more (271M vs 210M $-days at 20%) and still beats S0's
ladder at the same $-days by $427,073; on `all` the comparison is extrapolated and inflated by compounding, so it is
not relied on.

## Why it might be real

- **Mechanism.** The book buys deep GDX declines (27% from a 100-session high) and rides the rebound with a wider stop
  and longer hold than the standalone optimum. Gold miners' deep declines rarely coincide with the S0 books' busy
  periods after 2023, and in training its gain came from the COVID rebound, late 2022 and spring 2023.
- **Out of sample it did what it did in training, without displacing anything:** both windows positive ("persists"),
  at every cost, lower fixed drawdown.
- **Portfolio-aware beat standalone-first on the same ETF out of sample:** the GDX Track S vector entered the same
  first post-training dip (2024-02-13) and left on a buffered loss after nine days (−$1,445) while the Track P vector
  held to +$24,581; post-training Δ +$21,144 (S) vs +$55,670 (P).

## Why it might not be

- **Two trades.** Without the 2024-02 → 04 (+$24,581) and 2026-08 (+$31,646) lots the post-training Δ is −$557. The
  holdout verdict rests on one lot.
- **In-sample selection pressure.** The vector is the best of ~1,500 evaluated on the very path it is judged on; all 20
  shortlisted vectors of every track passed the robustness rules, so those rules did not discriminate. 59% of its
  training Δ comes from one regime (COVID, +$86k).
- **One regime out of sample.** 2024–2026 was a strong, widely known gold-miner advance: buying deep dips in a rising
  market pays. The selection was mechanical and frozen first, but the evaluation is not independent of that history.
- **The other nominee failed.** P-add-XOP's +$81k training gain disappeared entirely: its two post-training signals came
  while VGT held the pool. XLE's portfolio-aware gain was mostly path reshuffling and was not carried forward.

## Track S versus Track P

| ETF | Training Δ@5 S / P | Post-training Δ@5 S / P | Why |
|---|---|---|---|
| GDX | +$38,082 / +$146,293 | +$21,144 / +$55,670 | P's exits ride rebounds; S's churn (and lose in 2022) |
| XOP | +$27,302 / +$81,268 | $0 / $0 | no post-training XOP lot was fundable |
| XLE | +$21,604 / +$67,122 | not evaluated | S = the eight-ETF in-sample vector, funded once; P = mostly reshuffling of baseline lots |

Portfolio-aware selection genuinely found better *pool* contributions than standalone-first selection on every
finalist in training, and the one out-of-sample comparison (GDX) favours it — for timing and exit reasons that make
economic sense. Part of its training advantage, however, is fitting the exact funded path (XOP's and XLE's "gained"
baseline lots), which is not expected to persist. The earlier daily-proxy screen that rejected every candidate was
wrong in direction for GDX and XOP: their real D1 parameter spaces contain pool-improving phenotypes.

## How to use it

```bash
# the strategy file with the registered phenotype (new file config/phenotypes/D1/GDX.json; the four existing files untouched)
npm run app -- allIn-trailingBuy-postExitContinuation GDX all --phenotype portfolioAware
#   → training $144,885.01 (18 trades, minute DD $33,555.21) = this study's standalone figure; all $201,315.94 (25 trades)

# the allocator with the fifth book (the N-book engine; the frozen multi-etf-allocator CLI holds only VGT/XBI/XRT/KRE)
npm run portfolio-aware-d1 -- run --config P-add-GDX --mode fixed --dataset all --cost 5      # net $486,208
npm run portfolio-aware-d1 -- run --config P-add-GDX --mode portfolio --dataset all --cost 5  # $5,410,977; 29.67% / 31.09%
```

A forward test should hold the frozen vector, the alphabetical tie order (GDX first on a same-minute tie) and the
shadow rule fixed, and judge it only on sessions after 2026-10-13. No order was placed and nothing was committed.
