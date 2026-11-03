# Signal overlap, collisions and denials

Source: `results/tables/overlap.md` (generated from `results/overlap/*.csv`, `overlap_summary.json`) and
`results/tables/fixed_attribution.md`. Every run here is an exploratory comparison on inspected 2016–2025 history.
**Virtual trades are the books' standalone trades. A refused virtual trade is HYPOTHETICAL: it was never funded,
and no figure here adds refused trades to an executable P&L.**

## 1. The collisions are the strategy, not an accident

All four books arm on deep declines from rolling highs, so they want capital in the same market-wide sell-offs.
Daily close-to-close return correlations from 2017-06-15 to 2025-10-13:

| | VOOG | VGT | XBI | XRT | KRE |
|---|---:|---:|---:|---:|---:|
| VOOG | 1.00 | 0.97 | 0.65 | 0.65 | 0.54 |
| VGT | 0.97 | 1.00 | 0.65 | 0.63 | 0.51 |
| XBI | 0.65 | 0.65 | 1.00 | 0.58 | 0.44 |
| XRT | 0.65 | 0.63 | 0.58 | 1.00 | 0.65 |
| KRE | 0.54 | 0.51 | 0.44 | 0.65 | 1.00 |

VGT and VOOG (the core) move almost together (0.97): a VGT lot adds to an exposure the core already has. The sector
ETFs are less correlated with the core (0.44–0.65) but crash with it.

How many books hold a virtual position at each eligible close (2,094 sessions):

| Configuration | 0 books | 1 | 2 | 3 | 4 |
|---|---:|---:|---:|---:|---:|
| all-primary | 979 | 452 | 291 | 299 | 73 |
| all-lowDd | 1,059 | 487 | 423 | 113 | 12 |

With all-primary phenotypes, two or more books want the single pool on 663 sessions (32% of eligible sessions), all
four on 73.

## 2. Independent episodes are few

Grouping every virtual trade into connected components of overlapping holdings (`results/overlap/episodes.csv`):

| Configuration | Virtual trades | Episodes | Episodes with ≥ 2 symbols | Trades with distinct timing (no other book holding at any moment) and their net per $100k |
|---|---:|---:|---:|---:|
| all-primary | 146 | 48 | 12 | 36 ($71,347) |
| all-lowDd | 145 | 52 | 14 | 38 ($106,722) |

By named calendar window (entry date; descriptive labels only):

| Configuration | 2018 Q4 | 2020 COVID crash and rebound | 2022 bear market | 2023 regional-bank stress | 2025 tariff shock |
|---|---:|---:|---:|---:|---:|
| all-primary: virtual trades (net per $100k) | 5 ($60,051) | 43 ($257,598) | 39 ($72,633) | 15 ($11,747) | 8 ($130,880) |
| all-lowDd | 3 ($43,572) | 49 ($188,073) | 34 ($80,374) | 17 ($9,746) | 7 ($82,505) |

The all-primary component that starts on 2020-03-09 chains 49 virtual trades (KRE 34, XRT 8, VGT 4, XBI 3) worth
$363,454 per $100k of each, until 2021-02-23; the single pool funded **11** of them ($58,161). Most of the history's
value sits in a handful of correlated crash-and-rebound episodes (2018 Q4, 2020, 2022, April 2025); there are far fewer
independent observations than trades, and the 2020 episode alone dominates every configuration. 36 all-primary trades
had timing distinct from every other book; together they netted $71,347 per $100k.

## 3. Pairwise overlap of the virtual holdings (all-primary)

| Pair | Trades | Overlapping pairs | Trades overlapping (a / b) | Overlap days | Share of held time concurrent (a / b) |
|---|---|---:|---|---:|---|
| VGT–XBI | 20 / 25 | 22 | 15 / 16 | 665 | 60.1% / 77.5% |
| VGT–XRT | 20 / 26 | 21 | 15 / 17 | 550 | 49.7% / 77.7% |
| VGT–KRE | 20 / 75 | 41 | 11 / 39 | 287 | 26.0% / 50.8% |
| XBI–XRT | 25 / 26 | 27 | 16 / 21 | 438 | 51.0% / 61.9% |
| XBI–KRE | 25 / 75 | 41 | 10 / 40 | 284 | 33.0% / 50.1% |
| XRT–KRE | 26 / 75 | 35 | 12 / 34 | 153 | 21.7% / 27.1% |

All-lowDd pairs and both concurrency tables are in `results/tables/overlap.md`. The low-DD XBI phenotype (3.1% stop)
holds far less time concurrently with VGT (10.4% of VGT's held time) than the primary XBI (60.1%).

## 4. What the single pool funded and refused (shadow policy, fixed $100k)

Per symbol (`results/tables/fixed_attribution.md`); "standalone" = the book's own virtual trades:

| Configuration | Symbol | Standalone trades (net) | Funded | Funded net | Refused (HYPOTHETICAL net) |
|---|---|---:|---:|---:|---:|
| all-primary | VGT | 20 ($183,044) | 11 | $81,557 | 9 (+$101,487) |
| all-primary | XBI | 25 ($202,223) | 12 | $73,398 | 13 (+$128,824) |
| all-primary | XRT | 26 ($165,396) | 12 | $45,333 | 14 (+$120,063) |
| all-primary | KRE | 75 ($195,048) | 39 | $49,291 | 36 (+$145,756) |
| all-lowDd | VGT | 20 ($183,044) | 14 | $170,357 | 6 (+$12,687) |
| all-lowDd | XBI lowDd | 29 ($118,055) | 17 | $41,679 | 12 (+$76,376) |
| all-lowDd | XRT lowDd | 19 ($148,436) | 5 | $16,307 | 14 (+$132,128) |
| all-lowDd | KRE lowDd | 77 ($174,148) | 39 | $66,332 | 38 (+$107,816) |

- The pool funds **74 of 146** all-primary virtual trades and **75 of 145** all-lowDd ones. The sum of the four
  standalone nets (all-primary $745,710 per $100k of each trade) is not an achievable figure for one $100k pool: the
  funded total is $249,580.
- Under all-primary, **VGT keeps only 11 of its 20 trades** (44.6% of its standalone net): earlier sector signals,
  mostly XBI's, occupy the pool when VGT's best entries arrive (4 VGT refusals while XBI held the pool were worth
  +$83,035 hypothetical). Under all-lowDd, the tight-stop sector phenotypes release the pool quickly and VGT keeps 14
  trades and 93.1% of its standalone net.
- Who blocked whom (all-primary, refusals and hypothetical net per $100k): KRE blocked by XBI 26 (+$91,187), by VGT 8
  (+$45,517); XRT blocked by VGT 6 (+$80,190), by XBI 6 (+$51,264); VGT blocked by XBI 4 (+$83,035), by XRT 4 (+$21,899).
  The full matrix, including split and all-lowDd, is in `results/tables/overlap.md`.
- **Same-minute ties**: exactly one pair of decisions per shadow configuration landed in the same minute. With XRT
  primary it is 2020-05-13 13:17 ET (KRE and XRT, both refused because an XBI lot held the pool: the tie decided
  nothing). With XRT lowDd it is the 2023-03-30 09:30 ET bar (XRT lowDd and KRE, pool free): alphabetical order funds
  KRE, the priority order funds XRT. That is why `priority` differs from `shadow` in exactly the four configurations
  with XRT lowDd and equals it in the other four.
- Refused signals never filled later (shadow semantics); the cancel control (refused setups dropped and re-armed) and
  the hold diagnostic (refused setups re-tested every minute, filling late) change the trade lists completely:
  all-primary fixed net $196,591 (cancel) and $229,629 (hold) versus $249,580 (shadow), with 895 refusals under cancel
  (each cancellation re-arms on the next deep close and is refused again). As in the earlier VGT program, what a
  refused strategy does next is a first-order modelling choice, not a detail.

## 5. Funded versus hypothetical

The allocator's profit is always the funded trades' P&L. The table below separates the two quantities that are easy to
confuse (fixed pool, per $100k):

| Configuration | Σ standalone nets (HYPOTHETICAL; never simultaneously executable) | Funded net (executable) | Funded net − VGT D1 alone |
|---|---:|---:|---:|
| all-primary/shadow | $745,710 | $249,580 | +$66,536 |
| all-lowDd/shadow | $623,683 | $294,676 | +$111,632 |

The difference between the two columns is the opportunity cost of one shared pool; it is not an executable return
of any account in this study.
