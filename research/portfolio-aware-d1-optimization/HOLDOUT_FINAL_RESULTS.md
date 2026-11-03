# Holdout and final: the frozen configurations on one continuous `all` run

`npm run portfolio-aware-d1 -- evaluate`, run **once** after `FROZEN_SELECTION.json` (manifest `2eb9defc…`, frozen
2026-10-24T15:37:44Z) verified; record `results/evaluation/evaluation.json` (digest `91d39a77…`), per-run lots and
daily marks `results/evaluation/runs/`, bridges `results/evaluation/bridges/`, tables `results/tables/evaluation.md`.
The permitted deterministic confirmation (`evaluate --confirm`, 2026-10-24T15:44:50Z) reproduced the record exactly
(`results/evaluation/confirmation.json`: identical digest).

- One continuous run per configuration on the full N-book engine, 2016-01-04 → **2026-10-13** (2,710 sessions, the
  last common session; nothing extended or filled), books arming 2017-06-15, every position, setup, stop,
  continuation window, debt and drawdown carried across 2024-01-01 and 2025-10-17. Segments are attributions of that
  run from the marked equity at the boundary closes: **development** = training (2016-01-05 → 2023-12-29),
  **holdout** 2024-01-02 → 2025-10-16, **final** 2025-10-17 → 2026-10-13. No isolated window was run.
- Fixed $100,000 pool and 20% portfolio, each at 0/2/5/10 bps; S0's ladder at 5 bps. The cached replay was re-checked
  against the full engine on every fixed `all` run (24 comparisons): **exact**.
- **Evidence grades.** S0's holdout and final were inspected in earlier work. The candidate configurations' holdout and
  final figures are a **newly locked comparison**: no candidate vector of this study had been evaluated there (the one
  previously inspected vector, XLE's eight-ETF `primary`, did not reach Stage C). Not independent of general hindsight
  about 2024–2026 markets (gold miners rose strongly); the selection was mechanical and frozen before this run.

## 1. Fixed $100,000 pool (5 bps; the other costs in `results/tables/evaluation.md`)

| Config | Status | Development | Holdout | Final | Full `all` | Minute DD (all) | Lots (new) |
|---|---|---:|---:|---:|---:|---:|---|
| S0 | control | $242,196 | $44,003 | −$1,954 | $284,245 | $28,659 | 76 |
| P-add-GDX | nominated | $388,489 (+$146,293) | $68,584 (**+$24,581**) | $29,135 (**+$31,089**) | $486,208 (+$201,963) | $26,510 | 94 (16) |
| S-add-GDX | comparator | $280,278 (+$38,082) | $42,558 (−$1,445) | $20,635 (+$22,589) | $343,470 (+$59,225) | $26,510 | 99 (34) |
| P-add-XOP | nominated | $323,464 (+$81,268) | $44,003 (**$0**) | −$1,954 (**$0**) | $365,513 (+$81,268) | $34,816 | 81 (13) |
| S-add-XOP | comparator | $269,498 (+$27,302) | $44,003 ($0) | −$1,954 ($0) | $311,546 (+$27,302) | $31,730 | 78 (3) |
| P-comb-GDX-XOP | comparator | $436,891 (+$194,695) | $68,584 (+$24,581) | $29,135 (+$31,089) | $534,610 (+$250,365) | **$39,877** | 98 (28) |

Post-training (holdout + final) Δ at 0 / 2 / 5 / 10 bps: P-add-GDX **+$56,431 / +$56,126 / +$55,670 / +$54,909**;
S-add-GDX +$22,282 / +$21,772 / +$21,144 / +$19,036; P-add-XOP and S-add-XOP exactly $0 at every cost; P-comb equals
P-add-GDX. The fixed results are insensitive to costs from 0 to 10 bps.

### The trade-attribution bridge (5 bps): Δ = new book's funded net + baseline lots gained − S0 lots displaced

| Config | Training | Holdout | Final |
|---|---|---|---|
| P-add-GDX | +$149,556 + $49,670 − $52,933 | +$24,581 + 0 − 0 | +$31,089 + 0 − 0 |
| S-add-GDX | +$90,897 − $1,857 − $50,958 | −$1,445 + 0 − 0 | +$22,589 + 0 − 0 |
| P-add-XOP | +$62,173 + $68,639 − $49,545 | 0 | 0 |
| S-add-XOP | +$24,580 + $7,203 − $4,481 | 0 | 0 |
| P-comb-GDX-XOP | +$185,951 + $118,310 − $109,566 | +$24,581 + 0 − 0 | +$31,089 + 0 − 0 |

(Residuals below 1e-9.) After 2023 no configuration displaces or gains a single S0 lot: S0's own five post-training
lots (KRE 2024-02-01; VGT 2025-04-04, 2025-04-11, 2025-04-22 → 2025-11-07 +$44,315; XRT 2025-11-12 → 2026-03-03) are
funded identically in every configuration, and the new books trade only in S0's idle time.

**P-add-GDX's post-training lots** (GDX, 5 bps): 2024-02-13 → 2024-04-15 trailing stop **+$24,581** (the holdout's only
lot); 2026-03-19 → 04-02 +$9,359; 05-19 → 06-08 maximum hold −$6,711; 06-09 → 06-18 +$4,782; 06-22 → 07-10 maximum
hold −$8,015; 07-13 → 07-31 +$27; 08-03 → 08-31 trailing stop **+$31,646**. Seven lots, four winners; the two largest
make $56,227 of the $55,670 post-training Δ — **without them the post-training Δ is −$557**. The holdout verdict
"persists" rests on one trade.

**Why the XOP configurations are exactly zero after 2023** (post hoc, non-decisional:
`npm run portfolio-aware-d1 -- post-hoc` → `results/evaluation/post-hoc-new-book-signals.csv`): the XOP P-vector
produced only two post-training signals, 2025-04-07 (the tariff crash; its virtual trade would have made +$13,647)
and 2025-10-23 (virtual −$2,193), and both arrived while a **VGT lot held the pool** — refused under the unchanged
first-signal-wins rule; the S-vector's single signal (2025-04-07) likewise. Every one of P-add-GDX's seven
post-training signals arrived while the pool was idle and was funded.

## 2. 20% portfolio ($300,000 VOOG/VGT core)

| Config (5 bps) | Ending equity 2026-10-13 | Max % DD daily / minute (all) | Holdout return | Final return | Holdout max % DD | Final max % DD |
|---|---:|---|---:|---:|---:|---:|
| S0 | $3,608,484 | 34.65% / 37.01% | 68.42% | 27.70% | 25.21% | 16.02% |
| P-add-GDX | $5,410,977 | **29.67% / 31.09%** | 76.50% | 35.04% | 25.13% | 15.22% |
| S-add-GDX | $4,013,523 | 30.41% / 32.46% | 67.97% | 32.65% | 25.19% | 15.29% |
| P-add-XOP | $4,100,385 | 34.65% / 37.01% | 68.48% | 27.58% | 25.17% | 16.00% |
| S-add-XOP | $3,809,896 | 35.04% / 37.39% | 68.44% | 27.66% | 25.20% | 16.01% |
| P-comb-GDX-XOP | $5,782,285 | 29.67% / 31.08% | 76.53% | 34.97% | 25.10% | 15.21% |

Segment returns are the equity change over the segment ÷ the equity at its start, so they compare the strategies'
post-training contribution on each configuration's own base. P-add-GDX adds about **+8.1 points** in the holdout and
**+7.3 points** in the final window to S0's return; P-add-XOP adds nothing (+0.06 / −0.12 points, from lot sizes, not
trades). The full-history maximum percentage drawdown of P-add-GDX (29.67% daily, 2020) is below S0's 34.65% and below
the user's 30% ideal — a training-period effect (a GDX lot held the pool through March 2020 instead of losing S0 lots).

**A weakness in a frozen rule, stated as found.** Rule 5 of §7.4 ("portfolio post-training ending-equity Δ@5 > 0",
frozen as "the equity gap to S0 widens over holdout + final") is measured in dollars, so it is dominated by the
compounding of the training-period head start: P-add-XOP passes it (+$261,982) with **no** post-training trade at all,
P-add-GDX's +$1,209,980 is mostly the core compounding on a $592,513 larger base. It is therefore uninformative; it
did not decide anything here (P-add-XOP fails the fixed rules; P-add-GDX passes every rule, and its segment returns
above confirm a real post-training contribution). The matched-borrowing comparison on `all` is likewise extrapolated
beyond S0's 25% ladder point and inflated by the same compounding; it is reported in the tables, not relied on.

Distributions: candidate lots are price-only. GDX lots were held 62 lot-days in the holdout and 107 in the final window:
each 1% of annual yield would be worth $170 and $293 — immaterial. XOP held nothing after 2023.

## 3. Classification and acceptance (PROTOCOL.md §7; fixed, 5 bps)

| Config | Status | Holdout Δ | Final Δ | Post-training Δ@5 / @10 | Fixed minute DD (all) | Portfolio daily % DD (all) | Accepted |
|---|---|---|---|---|---:|---:|---|
| P-add-GDX | nominated | +$24,581 **persists** | +$31,089 **persists** | +$55,670 / +$54,909 | $26,510 | 29.67% | **yes** |
| P-add-XOP | nominated | $0 disappears | $0 disappears | $0 / $0 | $34,816 | 34.65% | no (post-training Δ not > 0; holdout does not persist) |
| S-add-GDX | comparator | −$1,445 disappears | +$22,589 persists | +$21,144 / +$19,036 | $26,510 | 30.41% | not eligible (comparator) |
| S-add-XOP | comparator | $0 | $0 | $0 | $31,730 | 35.04% | not eligible |
| P-comb-GDX-XOP | comparator | +$24,581 persists | +$31,089 persists | +$55,670 / +$54,909 | **$39,877** | 29.67% | not eligible (failed T2: minute DD) |

**Outcome under the frozen rules: P-add-GDX is accepted and, as the highest-ranked accepted configuration, it is the
protocol's recommendation.** P-add-XOP's training improvement **disappeared** (no XOP lot after 2023). No
configuration reversed.

## 4. Track S versus Track P after the freeze

| ETF | Training Δ@5, S / P | Post-training Δ@5, S / P | Holdout | Final |
|---|---|---|---|---|
| GDX | +$38,082 / +$146,293 | +$21,144 / **+$55,670** | S −$1,445 vs P +$24,581 | S +$22,589 vs P +$31,089 |
| XOP | +$27,302 / +$81,268 | $0 / $0 | no funded lot | no funded lot |

On GDX both books took the **same first dip** (decision 2024-02-13): the S-vector (stop 5.4%, hold 8, buffer 1.4%)
left on a buffered intraday loss after nine days (−$1,445); the P-vector (stop 7.1%, hold 18, buffer 3.6%) rode the
March–April 2024 miners' rally (+$24,581). In 2026 the S-vector traded 12 times for +$22,589, the P-vector 6 times for
+$31,089. Track P's out-of-sample edge on GDX is real in these numbers but rests on two exits; on XOP neither track has
any out-of-sample evidence. One ETF, nine post-training trades, one market regime (a strong gold-miner advance): this
favours Track P without establishing it.
