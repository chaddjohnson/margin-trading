# Portfolio and capital efficiency (Stage C3)

**Evidence tier: T-train (2016-01-04 → 2023-12-29).** The frozen comparisons' 20% portfolio: $300,000 at 60% VOOG /
40% VGT; each funded lot borrows 20% of marked equity at the decision; profits reinvested 60/40, losses funded by core
sales; 11% simple interest, 5 bps; frozen dividend convention (core VOOG/VGT and open VGT lots receive distributions;
other ETFs' distributions are not in the data); Reg T and U35 at entry; maintenance ratios passive only. C0 is the same
core without margin. Portfolio % drawdowns are **not** interchangeable with fixed-slot dollar drawdowns.

{{port.table}}

"Productivity" = strategy net per $1M of borrowing dollar-days. C0's own max daily drawdown on this window is 33.89%
(the 2020 crash), so most of every configuration's portfolio drawdown is the core's; the increment over C0 is shown in
parentheses.

## Findings

- **Every overlay adds wealth over C0** ($1,116,262 end equity): from +$118,735 (EDV alt) to +$529,066 (XME) for the
  single-ETF phenotypes, +$259,529 for VGT primary, and +$561,490 for B4 and +$1,154,003 for B5 (pools trade far more
  often). Ending wealth on one 8-year path compounds early luck; it is not read as an expected return.
- **Drawdown is mostly the core's.** Max daily DD ranges from 31.3% (FXI alt) to 35.5% (KBE alt) against C0's 33.9%;
  VGT primary 32.8% (−1.1 pp versus C0). Only KBE alt exceeds 35% (F3). GDX and FXI end with the lowest portfolio
  drawdowns (about −2.5 pp versus C0) — an observation on one path, not a mechanism. A non-VGT lot adds no VGT
  exposure; VGT primary's lots add to the core's 40% VGT.
- **Borrowing efficiency:** XME (3,181), FXI (2,669), SLV (2,231) and B5 (3,102) earn the most per $1M borrowing
  dollar-days; VGT primary 1,351; EWW 1,515; the procedure-matched VGT control 1,110 (fixed-slot figures:
  `COST_AND_TAIL_RISK.md` and the same-window table in `FINAL_COMPARISON_AND_RECOMMENDATION.md`).
- **Maintenance:** the passive U35 minimum equity ÷ requirement stays at 2.28–2.36 for every phenotype (well above
  1); no margin call would have been triggered under the modelled schedule — which models no house changes, no forced
  sales and no Vanguard 30-day restriction.

## Distributions not credited (order of magnitude)

Lots in ETFs other than VGT/VOOG receive no distribution in the engine, while prices are raw (not total-return), so an
income-paying ETF is understated whenever a lot is held over an ex-date. Upper bound if every held day accrued the
yield (principal × yield × occupied days ÷ 365; yields are rough assumptions, not data):

| Phenotype | occupied days (fixed) | assumed yield | fixed-slot upper bound | portfolio upper bound (borrowing $-days × yield ÷ 365) |
|---|---:|---:|---:|---:|
| EDV representative | 331 | ~3.5% | ~$3,200 | ~$5,500 |
| KBE representative | 664 | ~2.5% | ~$4,500 | ~$7,900 |
| XLB representative | 392 | ~2.0% | ~$2,100 | ~$3,600 |

These are small next to the nets ($62,727, $137,138, $84,008) and change no flag.

## Broker caveats (always)

No margin call, forced sale, changing house requirement or real quote is simulated; newly bought VGT/VOOG are not
marginable for 30 days at Vanguard; ETF liquidity, slippage and capacity are idealised. A backtest drawdown is not a
cap and a fit to a threshold is not safety.
