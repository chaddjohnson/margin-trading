# GDX-only against N/original — the two axes of the decision basis (brief Phase 5.5; PROTOCOL §15.8)

The trading sleeve and the whole investment portfolio are compared separately. Every figure is retrospective, previously
examined history (2016-01-04 → 2026-10-30). N/original was itself chosen with all of it in view, which favours it in any
comparison over this window. The GDX-only finalists were chosen on 2016–2024 only. No profitability ceiling is imposed in
either direction.

## Axis 1 — the trading sleeve (one fixed $100,000 margin-funded slot)

| Overlay | Full net | Δ vs N/original | Development | Validation | Full minute DD | Worst realized lot | Confirmation robust (dev) | Chronology | V1 V2 V3 | Occupancy | Net per borrowing-$-day |
|---|---:|---:|---:|---:|---:|---:|---:|---|:---:|---:|---:|
| **N/original** | **$482,700.73** | — | $388,031.02 | $94,669.70 | $20,385.99 | −$9,114 | (benchmark) | chosen with 2016–2026 in view | — | 62.6 % | $0.0020 |
| New L0 | $479,605.18 | −$3,096 | $382,721.46 | $96,883.72 | $20,385.99 | −$9,114 | (benchmark) | same | — | 63.2 % | $0.0020 |
| Ablation (N/original GDX D1 alone) | $189,573.30 | −$293,127 (−60.7 %) | $163,924.96 | $25,648.34 | $27,053.38 | −$10,070 | $132,886 | descriptive control | ✓ ✓ ✓ | 24.3 % | $0.0021 |
| D primary | $255,524.87 | −$227,176 (−47.1 %) | $270,779.57 | −$15,254.70 | $30,362.06 | −$19,102 | $137,911 | unsupported | ✗ ✓ ✓ | 27.1 % | $0.0025 |
| G primary (development-only) | $171,750.86 | −$310,950 (−64.4 %) | $161,456.75 | $10,294.11 | $17,744.39 | −$3,108 | $71,400 | unsupported | ✓ ✓ ✓ | 9.5 % | $0.0055 |
| C primary (development-only) | $278,245.43 | −$204,455 (−42.4 %) | $273,035.02 | $5,210.41 | $27,397.97 | −$14,732 | $180,034 | unsupported | ✓ ✓ ✓ | 24.0 % | $0.0033 |
| J primary | $238,487.94 | −$244,213 (−50.6 %) | $230,410.14 | $8,077.80 | $60,065.70 | −$40,493 (open) | $142,544 | unsupported | ✓ ✗ ✗ | 34.2 % | $0.0019 |
| S primary | $358,458.94 | −$124,242 (−25.7 %) | $336,819.26 | $21,639.68 | $59,791.70 | −$39,467 (open) | $178,012 | unsupported | ✓ ✗ ✗ | 43.0 % | $0.0022 |
| G+ primary (informed) | $178,522.74 | −$304,178 (−63.0 %) | $178,522.74 | $0 | $16,154.78 | −$643 | $71,841 | no independent test | ✗ ✓ ✓ | 17.3 % | $0.0027 |
| C+ primary (informed) | $282,007.58 | −$200,693 (−41.6 %) | $297,262.28 | −$15,254.70 | $30,362.06 | −$19,102 | $152,446 | no independent test | ✗ ✓ ✓ | 30.3 % | $0.0025 |

**No GDX-only configuration outperforms N/original in the slot**, in the full window, in development (best S $336,819 vs
$388,031) or in the validation (best independent primary S +$21,640 vs +$94,670). Among all 29 finalists, the best full net
is S's primary at $358,459, $124,242 (25.7 %) short of N/original. The two development-only primaries are short by
$310,950 (G) and $204,455 (C).

Per borrowing-dollar-day, several GDX-only overlays out-earn N/original: G 2.8×, C 1.7× and D 1.25× its $0.0020. They use the
slot far less. An idle slot earns nothing here, so the time-in-market normalization explains the shortfall but does not
remove it. The GDX-only sleeves also carry the larger risks: minute DDs $27k–$60k against $20,386, and two open
unrestricted Growth lots near −$40k at the endpoint (ROBUSTNESS_AND_RISK.md §4).

## Axis 2 — the whole investment portfolio (identical 60 % VOOG / 40 % VGT core; $500,000 illustrative core)

| Scenario | Terminal wealth | Incremental vs core | Max marked DD (% of peak) | Δ max DD vs N/original: full / development | Max LTV | Min headroom (30 %) | Mean / max technology share | §15.8 label |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Core only | $3,389,172 | — | $631,158 (33.7 %) | +$18,771 / +$22,821 | 0 % | $314,290 | VGT sleeve 40 % at each quarterly rebalance (not tabulated) | — |
| **Core + N/original** | **$3,871,873** | **$482,701** | **$612,387** (21.1 %; 2022: $608,337) | — | 16.4 % | $314,290 | 42.7 % / 51.7 % | — |
| Core + ablation | $3,577,728 | $188,556 | $635,512 (32.5 %) | +$23,125 / +$27,175 | 16.5 % | $314,290 | 39.4 % / 42.9 % | no material difference |
| Core + D primary | $3,644,697 | $255,525 | $617,494 (30.1 %) | +$5,107 / +$9,158 | 15.1 % | $314,290 | 39.3 % / 42.4 % | no material difference |
| Core + G primary | $3,560,923 | $171,751 | $631,158 (31.0 %) | +$18,771 / +$22,821 | 18.0 % | $292,459 | 39.8 % / 43.5 % | no material difference |
| Core + C primary | $3,667,418 | $278,245 | $624,243 (30.0 %) | +$11,856 / +$15,907 | 18.0 % | $292,459 | 39.4 % / 42.9 % | no material difference |
| Core + J primary | $3,627,616 | $238,444 | $640,341 (31.6 %) | +$27,954 / +$32,004 | 16.2 % | $314,290 | 39.2 % / 42.5 % | no material difference |
| Core + S primary | $3,747,631 | $358,459 | $617,494 (29.2 %) | +$5,107 / +$9,158 | 17.8 % | $292,863 | 38.7 % / 42.5 % | no material difference |
| Core + G+ primary | $3,567,695 | $178,523 | $630,271 (32.0 %) | +$17,884 / +$21,934 | 10.8 % | $314,290 | 39.8 % / 43.5 % | no material difference |
| Core + C+ primary | $3,671,180 | $282,008 | $615,412 (30.0 %) | +$3,025 / +$7,075 | 15.1 % | $314,290 | 39.2 % / 42.2 % | no material difference |

**Switching from N/original to GDX-only does not reduce total-account drawdown or margin risk.**

- **Drawdown.** Every GDX-only scenario's maximum drawdown is larger. Over 2016–2026 the excess is +$3,025 to +$27,954, i.e.
  +0.5 % to +4.6 % relative; over 2016–2024 it is +$7,075 to +$32,004 (+1.2 % to +5.3 %). Every scenario sits inside the
  precommitted "no material difference" band of ≥ $5,000 and ≥ 10 % in both windows.
- **Margin.** Maximum LTV and minimum headroom are equal or slightly worse.
- **Terminal wealth.** It is $124,242 to $443,452 lower.
- **Technology share.** GDX-only lowers it by 2.5–4 points on average and 8–9.5 points at its maximum. That lowers the
  exposure on paper, but in this history N/original held its VGT lots mostly near the core's highs and stood aside in the
  2022 decline (TOTAL_PORTFOLIO_COMPARISON.md §H, §J).

The result holds at $250,000 and $1,000,000 initial core, and under the drift convention. At the $250,000 core and under drift,
two GDX-only primaries (D and C+) show a $4,952 smaller DD, still below the materiality rule. It also holds when realized
profits are swept into the core: there the S primary's terminal wealth exceeds N/original's by $54,522, a timing effect of its
2016 Growth profit, with a $26,504 larger DD.

## Verdict on the trade-off

Under this history and these assumptions, **a lower trading return is not justified by diversification**. GDX-only gives
up $124k–$443k of terminal wealth and buys no reduction in total-account drawdown, maximum debt or headroom. Its lower
correlation with the core is real (primaries 0.05–0.19 vs 0.41) but too small, and too badly timed in 2022, to matter at a $100,000
overlay beside a $500,000 core.

GDX-only was better in specific episodes:
- 2016: the Growth-bearing primaries' gold-miner rally;
- inside the 2020 crash;
- 2018-Q4;
- the 2025 spring sell-off.

It was worse in others:
- the core's deepest episode, 2022;
- 2017, 2021 and 2023–2024;
- 2026;
- the 2026-Q2 VGT/GDX divergence.

One favourable episode is never a claim of superiority (standard §3.4). The sector label "non-technology" is not a hedge
(PROTOCOL §15.8).
