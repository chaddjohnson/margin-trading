# Workstream C — books (leave-one-book-out) and the B5 − B4 difference

Each ablation removes one book and keeps everything else frozen:
- the other books' phenotypes;
- the shadow allocator (one slot, alphabetical same-minute ties);
- the costs, interest, data window and portfolio conventions.

The pool is then re-run as a whole. Removing a book does more than delete its trades. It frees the single slot, so
other books fund signals that were refused before ("gained") and lose lots they held before ("lost"). The book's
**increment** is therefore the parent pool minus the ablated pool, not the book's own P&L.

Machine-readable results:
- `results/C_ablation.csv`;
- `results/C_bridge_B5_vs_B4.csv`;
- `results/runs/ablation.jsonl`.

## Fixed pool ($100,000 slot, 5 bps, 11%)

| Pool | Removed | Fixed net | Book increment (parent − ablated) | Removed book's own lots / net | Other books: lots gained / net | Other books: lots lost / net | Max minute DD | DD change from the book | Time with lot |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 | VGT | $263,483 | +$20,762 | 14 / $166,516 | 37 / $146,425 | 1 / $671 | $23,514 | +$5,145 | 24.2% |
| B4 | XBI | $236,223 | +$48,022 | 17 / $40,341 | 7 / $3,309 | 2 / $10,990 | $27,544 | +$1,115 | 45.2% |
| B4 | XRT | $274,568 | +$9,677 | 6 / $15,028 | 4 / $5,351 | 0 / $0 | $28,659 | +$0 | 42.7% |
| B4 | KRE | $228,475 | +$55,770 | 39 / $62,360 | 3 / $5,475 | 2 / −$1,115 | $19,534 | +$9,125 | 39.6% |
| B5 | VGT | $439,596 | +$46,612 | 12 / $110,095 | 16 / $63,483 | 0 / $0 | $25,774 | +$736 | 32.8% |
| B5 | XBI | $418,508 | +$67,700 | 16 / $53,064 | 11 / −$3,646 | 2 / $10,990 | $26,510 | +$0 | 52.1% |
| B5 | XRT | $471,514 | +$14,694 | 4 / $12,842 | 2 / −$1,852 | 0 / $0 | $26,510 | +$0 | 48.6% |
| B5 | KRE | $389,427 | +$96,780 | 46 / $104,981 | 7 / $55,924 | 3 / $47,723 | $25,774 | +$736 | 48.6% |
| B5 | GDX | $284,245 | +$201,963 | 16 / $205,225 | 19 / $52,933 | 21 / $49,670 | $28,659 | −$2,149 | 45.5% |

## Dynamic portfolio ($300,000, 60/40 core, 20% borrowing)

"Book effect on % DD" is the parent's max % DD minus the ablated pool's. Positive means the book **adds** drawdown;
negative means it **reduces** drawdown.

| Pool | Removed | End equity | Book increment to end equity | Max daily % DD | Book effect on daily % DD | Max minute % DD | Book effect on minute % DD | Ablated pool vs C0 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 | VGT | $3,701,800 | −$93,316 | 34.01% | +0.64 pp | 35.98% | +1.03 pp | +$1,422,031 |
| B4 | XBI | $3,307,433 | +$301,051 | 34.50% | +0.15 pp | 36.87% | +0.15 pp | +$1,027,664 |
| B4 | XRT | $3,548,590 | +$59,894 | 34.65% | +0.00 pp | 37.01% | +0.00 pp | +$1,268,821 |
| B4 | KRE | $3,247,257 | +$361,227 | 32.78% | +1.87 pp | 35.21% | +1.80 pp | +$967,488 |
| B5 | VGT | $5,126,846 | +$284,131 | 29.01% | +0.66 pp | 30.85% | +0.24 pp | +$2,847,077 |
| B5 | XBI | $4,764,018 | +$646,958 | 33.17% | −3.50 pp | 35.54% | −4.45 pp | +$2,484,249 |
| B5 | XRT | $5,269,921 | +$141,055 | 29.67% | +0.00 pp | 31.09% | +0.00 pp | +$2,990,152 |
| B5 | KRE | $4,487,796 | +$923,180 | 32.57% | −2.90 pp | 34.47% | −3.39 pp | +$2,208,027 |
| B5 | GDX | $3,608,484 | +$1,802,493 | 34.65% | −4.98 pp | 37.01% | −5.93 pp | +$1,328,715 |

## What each book contributes

- **GDX (B5):** the largest and cleanest contribution.
  - Fixed: +$201,963. Portfolio: +$1,802,493.
  - Max daily % DD −4.98 pp, max minute % DD −5.93 pp: it lowers the drawdown.
  - GDX's own 16 lots earn +$205,225. Its occupancy also reshuffles the other
    books. When GDX is removed, they fund lots they could not fund before (19 lots, +$52,933), and they lose
    lots that GDX's timing had enabled (21 lots, +$49,670). The two nearly cancel.
- **KRE:** a large gross contributor and the main source of fixed-pool drawdown.
  - B4: +$55,770 fixed and +$361,227 portfolio. It adds +$9,125
    of fixed minute DD and +1.87 pp of portfolio daily DD.
  - In B5 its effect on the portfolio drawdown reverses (−2.90 pp). Removing KRE from B5 raises the
    drawdown, because the March-2020 slot sequence changes.
- **XBI:** a modest fixed contributor (+$48,022 in B4, +$67,700 in B5).
  - In B5 it is a strong drawdown **reducer** (−3.50 pp daily): without XBI, the March-2020 slot
    sequence changes and B5's drawdown rises to 33%.
  - This is the same slot-sequence fragility the parameter neighbourhoods show.
- **XRT:** small but clean. +$9,677 (B4) and +$14,694 (B5), with no drawdown effect.
- **VGT in B4 is nearly redundant in fixed terms.**
  - Its own 14 lots earn +$166,516. Removing it lets the other books fund
    37 lots, +$146,425 instead, so its increment is only +$20,762.
  - In the portfolio its increment is **negative** (−$93,316), and it adds +0.64 pp of
    daily DD.
  - Its lots are long VGT on top of a core that is 40% VGT, and they hold the slot for long stretches. The median
    VGT lot lasts about a month, against about 5 days for KRE and XBI.
  - In B5, VGT's increment is positive (+$46,612 fixed, +$284,131 portfolio), but it
    still adds +0.66 pp of daily DD.

**None of this makes a book "redundant" in a forward sense.** Each increment is a single path through one shared slot,
and small timing changes reorder who holds it (see the neighbourhood results). The ablations identify **interactions**,
not book quality:
- slot competition (the refusal matrices below);
- freed capacity;
- the correlation of VGT lots with the core.

## Is "B5 without GDX" operationally B4?

Yes. B5 − GDX is identical to B4 in every stored figure, in both modes (fixed net $284,244.74 = $284,244.74; portfolio end $3,608,484.05 = $3,608,484.05). Book order, same-minute tie order (alphabetical), funding and accounting depend only
on the set of books, so removing GDX reproduces B4 exactly. All differences between B5 and B4 are therefore caused
by the GDX book: its own lots plus the slot displacements it causes.

## The B5 − B4 bridge (fixed pool)

The bridge matches lots by (book, decision time). Lots both pools funded are identical in fixed mode. The bridge's
residual against the net difference is 2.33e-10.

| Component (fixed pool) | Lots | Contribution to B5 − B4 |
|---|---:|---:|
| GDX lots (only B5 can take them) | 16 | +$205,225 |
| Other books’ lots only B5 funded (enabled by GDX occupying the slot) | 21 | +$49,670 |
| Lots only B4 funded (displaced in B5) | 19 | −$52,933 |
| Lots both funded (identical in fixed mode) | 57 | +$0 |
| **Total = B5 − B4 fixed net** |  | **+$201,963** |

By exit year:

| Exit year | GDX lots | Other only-B5 lots | Only-B4 lots (negative = B4 gain lost) | Total |
|---|---:|---:|---:|---:|
| 2020 | +$91,998 | +$49,095 | −$52,972 | +$88,122 |
| 2022 | +$26,195 | +$575 | +$1,098 | +$27,868 |
| 2023 | +$31,362 | +$0 | −$1,059 | +$30,303 |
| 2024 | +$24,581 | +$0 | +$0 | +$24,581 |
| 2026 | +$31,089 | +$0 | +$0 | +$31,089 |

By the regime of the lot's entry (§4 windows; "outside R1–R4" includes 2026):

| Regime of the lot entry | Total contribution | Of which GDX lots |
|---|---:|---:|
| R2 | +$84,962 | +$91,998 |
| outside R1–R4 | +$34,249 | +$31,089 |
| R3 | +$82,752 | +$82,138 |
| R1 | +$0 | +$0 |
| R4 | +$0 | +$0 |

The 20 largest bridge rows by absolute contribution:

| # | Kind | Book | Entry | Exit | Exit reason | Regime | Lot net | Contribution |
|---:|---|---|---|---|---|---|---:|---:|
| 1 | only B4 | VGT | 2020-04-02 | 2020-09-04 | trailing stop | R2 | +$51,264 | −$51,264 |
| 2 | only B5 | GDX | 2020-03-16 | 2020-03-18 | trailing stop | R2 | +$37,416 | +$37,416 |
| 3 | only B5 | GDX | 2026-08-03 | 2026-08-31 | trailing stop | outside R1–R4 | +$31,646 | +$31,646 |
| 4 | only B5 | GDX | 2020-04-01 | 2020-04-15 | trailing stop gap | R2 | +$27,571 | +$27,571 |
| 5 | only B5 | GDX | 2024-02-13 | 2024-04-15 | trailing stop | R3 | +$24,581 | +$24,581 |
| 6 | only B5 | GDX | 2023-02-24 | 2023-04-21 | trailing stop | R3 | +$23,559 | +$23,559 |
| 7 | only B5 | GDX | 2022-11-03 | 2022-12-15 | trailing stop | R3 | +$22,376 | +$22,376 |
| 8 | only B5 | KRE | 2020-04-21 | 2020-04-30 | trailing stop gap | R2 | +$16,508 | +$16,508 |
| 9 | only B5 | GDX | 2020-03-23 | 2020-03-27 | trailing stop gap | R2 | +$16,091 | +$16,091 |
| 10 | only B5 | KRE | 2020-06-01 | 2020-06-09 | trailing stop gap | R2 | +$15,286 | +$15,286 |
| 11 | only B5 | XBI | 2020-05-01 | 2020-05-13 | trailing stop gap | R2 | +$12,893 | +$12,893 |
| 12 | only B5 | GDX | 2020-03-19 | 2020-03-20 | trailing stop gap | R2 | +$10,921 | +$10,921 |
| 13 | only B5 | KRE | 2020-05-20 | 2020-05-28 | trailing stop | R2 | +$10,785 | +$10,785 |
| 14 | only B4 | KRE | 2020-03-18 | 2020-03-23 | maximum hold | R2 | −$10,094 | +$10,094 |
| 15 | only B5 | GDX | 2026-03-19 | 2026-04-02 | trailing stop gap | outside R1–R4 | +$9,359 | +$9,359 |
| 16 | only B4 | VGT | 2020-03-23 | 2020-04-01 | trailing stop | R2 | +$9,015 | −$9,015 |
| 17 | only B5 | KRE | 2020-05-13 | 2020-05-19 | trailing stop | R2 | +$8,158 | +$8,158 |
| 18 | only B5 | GDX | 2026-06-22 | 2026-07-10 | maximum hold | outside R1–R4 | −$8,015 | −$8,015 |
| 19 | only B5 | GDX | 2023-10-04 | 2023-10-31 | trailing stop | R3 | +$7,803 | +$7,803 |
| 20 | only B5 | KRE | 2020-08-05 | 2020-08-12 | trailing stop | outside R1–R4 | +$7,595 | +$7,595 |

**Diversification or a few big trades?**

- **The advantage is mostly GDX's own trades.** GDX's 16 lots (14 winners) earn $205,225,
  slightly **more** than the whole difference. The displaced and enabled lots of the other books net to about −$3k.
  So B5's advantage is not a diversification effect on the other books' trades.
- **It is concentrated in a few of those trades.** The top GDX lot provides 18.5% of the difference, the top
  three 47.8% and the top five 71.7%. Four GDX lots in March–April 2020 provide about $92k.
- **The portfolio drawdown benefit is a real diversification effect, but a path-dependent one.** GDX was the book
  making money in March 2020, while the core and the equity-sector books were falling. That is a gold-miner/equity
  diversification story with an economic rationale. But it rests on that one episode, and on GDX winning the single
  slot at the right minutes.

## Slot competition (signals refused, by holder; fixed pool)

**B4**

| Refused book ↓ / slot holder → | VGT | XBI | XRT | KRE |
|---|---:|---:|---:|---:|
| VGT | 0 | 3 | 3 | 1 |
| XBI | 10 | 0 | 0 | 2 |
| XRT | 8 | 4 | 0 | 2 |
| KRE | 34 | 3 | 1 | 0 |

**B5**

| Refused book ↓ / slot holder → | VGT | XBI | XRT | KRE | GDX |
|---|---:|---:|---:|---:|---:|
| VGT | 0 | 3 | 1 | 1 | 4 |
| XBI | 5 | 0 | 0 | 5 | 3 |
| XRT | 6 | 4 | 0 | 3 | 3 |
| KRE | 9 | 5 | 1 | 0 | 16 |
| GDX | 4 | 2 | 0 | 3 | 0 |

In B4, VGT's long holds refuse 34 KRE signals. In B5, GDX holds the slot instead at several of those moments: GDX
refuses 16 KRE signals, and VGT only 9.
