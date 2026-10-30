# Five-book joint neighbourhoods and fixed book interactions (Part A, PROTOCOL.md §6.3–§6.4)

**Sources:**
- `results/partA/A3-{W23,W13,W29,WDEV}.json`;
- `results/partA/A4-decomposition-{W29,W23,WDEV}.json` and the matching CSVs;
- `results/partA/A3/*/pair.csv`.

All points are unique: no joint draw repeats another or the centre. "Share" means the share with minute DD below
$35,000.

## 1. The joint gate on the full five-book pool (all 40 parameters)

| Design | Window | n (unique) | Share < $35k | p90 DD | Median DD | Median net (p10) |
|---|---|---:|---:|---:|---:|---:|
| **N1 clip rep 1 (decisive)** | W23 / W13 / W29 | 128 | **21.9%** | **$55,573** | — | — |
| N1 clip reps 1–5 | W29 | 5 × 128 | 21.9 / 28.1 / 27.3 / 28.9 / 27.3% | $52,948–$57,115 | — | — |
| N1 clip pooled | W29 | 640 | 26.7% ± 1.7 | $55,439 | $38,946 | $240,006 ($156,384) |
| N1 in-box pooled | W29 | 640 | 32.3% | $60,022 | $38,987 | $241,458 |
| N2 (2× radius) pooled | W29 | 192 | 17.7% | $67,826 | $46,209 | $193,472 |
| N1 clip pooled, **development window only** | WDEV (→ 2021-12-31) | 640 | 59.1% | $40,002 | $33,559 | $132,272 |

- **The gate: centre DD passes; the share and p90 fail.**
  - The neighbourhood's median drawdown ($38,946) is already above the ceiling.
  - Only 4 of the 640 neighbours have a lower drawdown than the centre's $26,510 (0 equal it). The centre is at
    the favourable extreme of its neighbourhood in risk as well as in profit.
- **Profit:** every joint neighbour is profitable. The median keeps 49.5% of the centre's $484,637, and no neighbour
  beats the centre.

## 2. Does KRE-alone fragility predict joint fragility? (H6)

Each joint point was replayed with **one book reset to frozen** and with **only one book perturbed**. These are paired
variants of the same 640 points. Breach = DD ≥ $35,000.

| Book | W29 importance (breaches removed by reset) | W29 "only this book" breaches | WDEV importance |
|---|---:|---:|---:|
| **KRE** | **56.3%** (264 of 469) | 229 (sufficient on its own) | **97.7%** (256 of 262) |
| GDX | 34.8% (163) | 49 | 4.6% |
| VGT | 17.7% (83) | 7 | 29.8% |
| XBI | 12.6% (59) | 5 | 1.5% |
| XRT | 6.4% (30) | 0 | 0.4% |

**Breach classes (W29, 469 breaches):**

| Class | Count |
|---|---:|
| KRE-only perturbation already breaches | 229 |
| Breach needs KRE (KRE reset removes it) | 264 |
| Breach survives with KRE reset | **205** (44%) |
| No single book's perturbation breaches on its own | 206 (interaction) |

The importances sum to more than 100% because many breaches need two or more perturbed books.

**H6 is confirmed narrowly (56.3% > 50%).**
- In the development window, KRE explains essentially all joint breaches: the COVID-2020 slot sequence.
- On the full history, 44% of joint breaches persist without perturbing KRE. They come from GDX, VGT and XBI
  re-entering through the 2022 bear market and the 2023 regional-bank stress.
- KRE-alone fragility therefore predicts the 2020 breaches, but not the 2022–2023 ones.
- Breach troughs by year: 2020 148, 2022 118, 2023 203.

## 3. Fixed preregistered pairs (16-D, the other three books frozen; 3 × 64 points)

| Pair | Share < $35k | p90 | Median DD | Median net | Independence benchmark (1 − p_KRE)(1 − p_b) | Reading |
|---|---:|---:|---:|---:|---:|---|
| KRE + GDX | **41.7%** | $51,218 | $35,251 | $330,299 | 51.4% | **super-additive**: perturbed GDX adds 2022 losses on top of the KRE 2020 path |
| KRE + XRT | 53.1% | $36,459 | $33,085 | $382,422 | 57.5% | mild interaction (XRT alone never breaches) |
| KRE + VGT | 57.8% | $39,607 | $34,009 | $368,507 | 56.2% | ≈ independent |
| KRE + XBI | 58.3% | $35,251 | $33,065 | $357,510 | 56.8% | ≈ independent |

No pair was searched for a winning combination; the four pairs were fixed in the protocol.

## 4. What determines the joint risk

The predeclared mechanism classifier was applied to the minute series of each joint rep-1 breach (100 breaches).

| Class | Count |
|---|---:|
| KRE own excursion (KRE lots ≥ 50% of the decline) | 47 |
| Enabled/displaced ETF (lots frozen B5 never funded ≥ 50%) | 45 |
| Compound | 8 |

No class exceeds 50%. The walkthroughs (`DRAWDOWN_EVENT_LEDGER.md`) show three distinct sources:
1. **Queue contention and changed opportunity allocation (2020-Q1).** A KRE exit one day earlier hands the slot to
   VGT during the crash, which displaces the GDX windfall.
2. **Direct price risk of re-entries during long declines (2020-Q3 KRE; 2022 GDX and XBI; 2023 KRE).** Small
   parameter changes make a book re-enter repeatedly and lose on maximum-hold exits. Frozen B5's books happen to avoid
   most of these re-entries.
3. **Path dependence.** Every joint walkthrough's earliest divergence is in **December 2018**, a KRE or VGT setup a
   few minutes apart. The funded ledgers then differ from the first lot on, and the 2022–2023 drawdowns are measured
   from different peaks.

No single determinant dominates. The pool's risk depends on which book holds the one slot during each decline, and
on that ordering surviving small parameter changes; for frozen B5 it does not.
