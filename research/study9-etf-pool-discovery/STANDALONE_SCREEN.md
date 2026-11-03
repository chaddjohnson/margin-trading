# S1 — standalone opportunity screen (training only)

**Scope:**

- every eligible ETF (61) on the training door, 2016-01-04 → 2024-12-31, with arming on 2017-06-15;
- a fixed $100,000 lot, 11% simple interest and 5 bps per side;
- the D1 rules unchanged.

**What this is.** A cheap **measurement instrument**, not an optimization:

- the same 64 generic vectors for every ETF: two independently scrambled 32-point Sobol nets over Study 8's box;
- no earlier phenotype or result seeded them.

**The rules:**

- Study 8's fitness, constraints C1–C7 and robust profit (½ median + ½ p10 of the neighbourhood, per year) are applied
  unchanged;
- 16-point neighbourhood shares are reported with their n, and never banded.

**Records:**

- `results/s1/etf/<SYMBOL>.json` (chain phase `s1`, `8b0b937e…`);
- tables: `results/tables/s1-etf-summary.csv`, `s1-vectors.csv` (3,904 vectors), `s1-walkforward.csv` and
  `s1-funnel.md`.

## 1. Funnel

| Step | ETFs |
|---|---:|
| Eligible | 61 |
| ≥ 1 *plausible* vector (Study 8's screen rule: standalone DD < $35k, net > 0, ≥ 2 lots) | **55** |
| ≥ 1 vector meeting Study 8's full feasibility (C1–C7) at 16 points | **0** |
| ≥ 1 vector meeting it at the final precision (80 points for each ETF's best, up to 16 re-measured) | **0** |

**Measured:** 3,904 vectors and 99,584 neighbourhood points.

**No plausible vector:** AGG, EWZ, IEF, SHY, XLE and XOP. Either their generic vectors lose money, or they hold the
slot through drawdowns ≥ $35k (XLE, XOP, EWZ in 2020).

**No ETF has a generic vector that is Study 8-feasible on its own.** The binding constraints, across all 3,904
vectors:

| Constraint | Violated by |
|---|---:|
| C7 top lot ≤ 25% of net | 3,892 |
| C7 ex-best-year economy ≥ $5k/yr | 3,785 |
| C5 neighbourhood median ≥ $10k/yr | 3,779 |
| C7 best year ≤ 75% | 3,404 |
| C6 capital efficiency | 2,807 |
| C2 share / p90 | ≈ 2,460 |

For each ETF's best vector, C5 (57 of 61) and C7 top lot (53) bind most often.

**This is consistent with Study 8,** whose fully optimized VGT search found only 11 of 48 rung-3 configurations
feasible on the same window, and where frozen B1 itself fails C7. A single D1 book rarely earns ≥ $10k/yr in the
neighbourhood median without one trade dominating. So the S1 opportunity score (best *feasible* robust/yr) is −∞ for
every ETF. As the protocol prescribes, the N seeds and the protected list fall back to the constrained order of each
ETF's best vector (lowest violation first).

## 2. Per-ETF measurements

Sorted by the **non-selected** opportunity measure: the median centre net/yr over all 64 generic vectors.

- **Breadth:** the share of the 64 vectors with net > 0 and DD < $35k.
- **The best vector:** the first by the constrained order, i.e. the smallest violation, since none is feasible.
- **Share:** below $35k, on 80 points for re-measured vectors. A measurement, not a band.

| ETF | Cluster | Quality | Plausible / 64 | Breadth | Median centre net/yr (all 64) | Best vector: centre net/yr | Centre DD | Lots | Share (n) | Robust/yr | M2020 share |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| SMH | us-tech-growth | good | 12 | 19% | $6,445 | $5,951 | $22,429 | 16 | 99% (80) | $4,781 | 15% |
| VGT | us-tech-growth | good | 20 | 33% | $5,823 | $10,013 | $27,957 | 30 | 66% (80) | $6,065 | 2% |
| XLK | us-tech-growth | good | 27 | 44% | $5,648 | $8,855 | $27,086 | 29 | 69% (80) | $5,927 | 3% |
| XHB | us-cyclical | good | 9 | 14% | $5,621 | $8,030 | $29,504 | 13 | 98% (80) | $7,586 | 37% |
| SLV | precious-metals | good | 20 | 31% | $4,881 | $6,840 | $23,846 | 15 | 64% (80) | $4,342 | 21% |
| IWF | us-tech-growth | good | 23 | 38% | $4,669 | $5,033 | $24,653 | 14 | 94% (80) | $2,491 | 18% |
| IGV | us-tech-growth | sparse | 7 | 12% | $4,270 | $4,580 | $18,981 | 21 | 100% (80) | $3,120 | 23% |
| VOOG | us-tech-growth | sparse | 25 | 41% | $3,455 | $5,341 | $25,330 | 13 | 55% (80) | $1,794 | 32% |
| GDX | precious-metals | good | 3 | 5% | $3,253 | $13,248 | $38,257 | 28 | 5% (80) | $13,014 | 66% |
| XME | materials-metals-mining | good | 4 | 6% | $3,069 | $10,021 | $24,654 | 65 | 41% (80) | $3,476 | 22% |
| XLY | us-cyclical | good | 16 | 25% | $2,610 | $9,183 | $35,454 | 44 | 15% (80) | $5,720 | 1% |
| XRT | us-cyclical | good | 5 | 8% | $2,191 | $9,529 | $40,722 | 28 | 15% (80) | $2,587 | -8% |
| XLI | us-cyclical | good | 18 | 28% | $2,171 | $4,548 | $36,450 | 31 | 20% (80) | $4,071 | -19% |
| MTUM | us-tech-growth | good | 28 | 45% | $2,089 | $3,994 | $11,242 | 10 | 100% (80) | $2,685 | 64% |
| QUAL | us-tech-growth | sparse | 27 | 45% | $2,018 | $11,211 | $32,251 | 5 | 95% (80) | $7,635 | 15% |
| XOP | energy | good | 0 | 0% | $1,773 | $8,063 | $57,320 | 28 | 0% (80) | $1,332 | 30% |
| VIG | us-broad-size-factor | good | 30 | 56% | $1,707 | $5,870 | $8,870 | 8 | 100% (80) | $3,480 | 41% |
| XLV | us-healthcare-biotech | good | 35 | 80% | $1,695 | $4,269 | $11,784 | 8 | 100% (80) | $1,420 | 64% |
| XLB | materials-metals-mining | good | 27 | 44% | $1,639 | $5,519 | $34,310 | 12 | 76% (80) | $3,338 | 7% |
| IYT | us-cyclical | sparse | 17 | 27% | $1,623 | $9,322 | $29,444 | 36 | 52% (80) | $4,656 | 6% |
| RSP | us-broad-size-factor | good | 22 | 36% | $1,501 | $3,715 | $16,321 | 12 | 100% (80) | $1,323 | 27% |
| IJH | us-broad-size-factor | good | 18 | 28% | $1,497 | $6,269 | $27,463 | 13 | 76% (80) | $3,933 | 7% |
| KRE | us-financials | good | 1 | 2% | $970 | $11,571 | $42,979 | 41 | 14% (80) | $9,320 | -14% |
| IJR | us-broad-size-factor | good | 15 | 23% | $950 | $8,450 | $29,856 | 17 | 57% (80) | $4,572 | -1% |
| INDA | em-asia | good | 15 | 23% | $894 | $3,314 | $36,886 | 19 | 0% (80) | $762 | -44% |
| XLE | energy | good | 0 | 0% | $726 | $7,579 | $58,167 | 21 | 0% (80) | $3,528 | 14% |
| IWN | us-broad-size-factor | good | 12 | 19% | $622 | $4,979 | $44,704 | 20 | 51% (80) | $3,735 | -49% |
| DBC | broad-commodities | thin | 15 | 23% | $442 | $4,890 | $12,480 | 9 | 100% (80) | $2,568 | -13% |
| XLP | us-defensive | good | 25 | 55% | $404 | $4,440 | $13,610 | 14 | 100% (80) | $2,480 | 43% |
| KBE | us-financials | good | 4 | 6% | $390 | $11,826 | $32,518 | 39 | 72% (80) | $9,159 | -2% |
| USMV | us-broad-size-factor | good | 24 | 45% | $343 | $4,243 | $18,968 | 22 | 100% (80) | $1,158 | 24% |
| EWJ | developed-ex-us | good | 21 | 41% | $272 | $1,406 | $19,033 | 6 | 100% (80) | $1,170 | -28% |
| IWD | us-broad-size-factor | good | 24 | 39% | $263 | $3,588 | $30,444 | 25 | 55% (80) | $147 | 3% |
| VPU | us-defensive | sparse | 28 | 48% | $251 | $1,652 | $24,981 | 8 | 100% (80) | $838 | 1% |
| KIE | us-financials | sparse | 13 | 20% | $176 | $4,001 | $20,596 | 15 | 100% (80) | $893 | 9% |
| XLF | us-financials | good | 16 | 25% | $169 | $7,222 | $16,097 | 26 | 100% (80) | $6,557 | 37% |
| IWM | us-broad-size-factor | good | 14 | 22% | $145 | $8,922 | $19,958 | 23 | 100% (80) | $4,541 | 18% |
| XLU | us-defensive | good | 27 | 45% | $134 | $1,963 | $27,563 | 7 | 100% (80) | $1,333 | 34% |
| SPLV | us-broad-size-factor | good | 27 | 45% | $71 | $3,662 | $13,808 | 10 | 100% (80) | $2,214 | 40% |
| AGG | rates-credit | good | 0 | 0% | $0 | $-682 | $13,115 | 7 | 100% (80) | $-975 | — |
| GLD | precious-metals | good | 13 | 22% | $0 | $2,700 | $10,997 | 16 | 100% (80) | $1,281 | 32% |
| IAU | precious-metals | good | 14 | 23% | $0 | $2,733 | $11,551 | 16 | 100% (80) | $1,187 | 29% |
| IBB | us-healthcare-biotech | good | 21 | 34% | $0 | $4,897 | $26,478 | 19 | 57% (80) | $1,275 | 44% |
| IEF | rates-credit | good | 0 | 0% | $0 | $-1,251 | $11,502 | 9 | 100% (80) | $-1,488 | — |
| LQD | rates-credit | good | 5 | 17% | $0 | $-237 | $18,220 | 8 | 100% (80) | $-491 | — |
| SHY | rates-credit | good | 0 | 0% | $0 | $0 | $0 | 0 | 100% (80) | $0 | — |
| TIP | rates-credit | good | 1 | 2% | $0 | $-744 | $16,298 | 10 | 100% (80) | $-1,032 | — |
| HYG | rates-credit | good | 5 | 16% | $-40 | $-428 | $16,655 | 6 | 100% (80) | $-886 | — |
| IEMG | em-broad | good | 13 | 25% | $-290 | $2,619 | $7,655 | 9 | 100% (80) | $1,731 | 55% |
| EFA | developed-ex-us | good | 16 | 27% | $-361 | $786 | $10,316 | 12 | 100% (80) | $1,961 | 54% |
| VGK | developed-ex-us | good | 15 | 23% | $-518 | $3,624 | $8,782 | 7 | 100% (80) | $4,037 | 54% |
| EMB | rates-credit | good | 3 | 14% | $-743 | $1,076 | $8,654 | 5 | 100% (80) | $513 | 45% |
| EEM | em-broad | good | 12 | 23% | $-762 | $1,759 | $10,133 | 9 | 100% (80) | $1,520 | 81% |
| EWY | em-asia | good | 7 | 11% | $-1,186 | $2,580 | $25,957 | 5 | 88% (80) | $2,206 | 41% |
| XBI | us-healthcare-biotech | good | 3 | 5% | $-1,522 | $6,006 | $32,079 | 26 | 35% (80) | $1,622 | 52% |
| TLT | rates-credit | good | 7 | 12% | $-1,711 | $-713 | $29,186 | 23 | 100% (80) | $-742 | — |
| ILF | em-latam | thin | 1 | 2% | $-3,144 | $6,679 | $29,617 | 30 | 91% (80) | $4,038 | -7% |
| EWW | em-latam | good | 4 | 6% | $-3,305 | $3,892 | $32,176 | 15 | 92% (80) | $2,014 | -12% |
| EWZ | em-latam | good | 0 | 0% | $-3,468 | $7,661 | $52,102 | 26 | 0% (80) | $3,252 | -44% |
| EDV | rates-credit | sparse | 10 | 16% | $-4,130 | $4,801 | $17,231 | 10 | 100% (80) | $1,122 | 43% |
| FXI | em-asia | good | 10 | 16% | $-4,740 | $5,352 | $18,555 | 17 | 82% (80) | $1,401 | 0% |

**What it shows:**

- **US tech and growth have the broadest generic opportunity.** SMH, VGT, XLK, IWF, IGV, VOOG, QUAL and MTUM lead the
  non-selected median, but no tech ETF's best vector earns more than about $11k/yr at the centre.
- **GDX, KRE and KBE have the most profitable best vectors** ($11.6–13.2k/yr at the centre) on very **narrow**
  parameter regions:
  - only 1–4 of 64 vectors are plausible;
  - GDX's best vector has a 5% share and a $38k centre DD.

  This is the profit-versus-breadth tension Study 8 found for G.
- **Rates, credit and most non-US equity are weak** under D1.
  - Most have medians ≤ $0 across the 64 vectors. The exceptions among non-US equity are INDA ($894) and EWJ ($272).
  - Their best vectors are small: EDV, ILF, EWW, FXI, EWY, EEM, IEMG, EFA, VGK, EWJ, INDA, EWZ and EMB have positive
    best vectors, all below $8k/yr at the centre.
  - The pure rates and credit funds (AGG, IEF, LQD, TIP, HYG, TLT, SHY) have none above zero.
- **Event concentration is high.** For EEM, GDX, MTUM, XLV, IEMG, EFA, VGK and XBI, half or more of the best
  vector's net comes from the March–April 2020 window.

## 3. Uncertainty and time persistence (training-only diagnostics)

- **Precision.** For the 519 re-measured vectors, robust/yr moves by a median of −$14 (mean −$39) from 16 to 64
  points. The Spearman correlation between the two precisions, within each ETF's re-measured set, has a median of
  0.95. The 16-point screen ranks well; it does not classify bands.
- **Time persistence across vectors (EARLY 2017-06-15 → 2020 against LATE 2021 → 2024).** The median Spearman over
  the 64 vectors of an ETF is **0.10**: which generic vector works in one half says almost nothing about the other.
- **Expanding-fold walk-forward (TD3).** For each fold end, the vectors ranked by their neighbourhood robust
  attribution so far, against the next calendar year:

| Fold end → next year | Median Spearman over the 64 vectors (61 ETFs) | Median next-year percentile of the vector best to the fold end |
|---|---:|---:|
| TO-F19 → 2020 | -0.00 | 42% |
| TO-F20 → 2021 | 0.17 | 59% |
| TO-F21 → 2022 | -0.11 | 30% |
| TO-F22 → 2023 | -0.03 | 33% |
| TO-F23 → 2024 | 0.12 | 25% |


**The vector that looked best so far does not, as a rule, stay best the next year.** Its next-year rank is at or below
the median in four of five folds. This is the S1-level form of the earlier studies' finding that neighbourhood scores
do not predict the next period (Spearman 0.023 in the d1-robust pilot).

## 4. Opportunity sources and the exploration list

**Distinct from VGT and GDX** (from S2's ±5-session decision match, α vectors):

- SHY (no decisions), EWW, USMV, RSP, VIG, XLB, FXI, IJR, EWZ, XBI, XHB and XLE match at most 31% of either anchor's
  decisions;
- VGT and GDX themselves match only 14% / 25% of each other's (each direction).

Distinct timing is common. Profitable distinct timing is rare (§2).

**Protected exploration list** (best ETF per cluster by the ETF order, never VGT, GDX or their proxies): DBC, EFA,
FXI, IEMG, ILF, XLE, XLB, SLV, EDV, IWM, IYT, XLP, XLF, IBB, SMH.

**The frozen "weak but distinct" rule is uninformative in this study.** It covers ETFs with no Study 8-feasible
vector, ≥ 1 plausible vector and α distinctness ≥ 0.5. Because no ETF has a feasible vector, the rule admits 43 ETFs,
VGT and GDX included. The anchors are still excluded wherever a family forbids them, so nothing is invalidated, but:

- the list does not distinguish ETFs;
- S3's cluster-diverse stream ("at least one protected or weak-but-distinct member") is close to unconstrained.

This is a consequence of the frozen rule, not changed after the fact (see `RECOMMENDATION.md`).

**Weak but distinct, materially** (the brief's request), judged from §2 and S2 rather than the degenerate list:

- EWW, FXI, ILF and EDV: low overlap with VGT/GDX, positive best vectors, negative medians;
- XLB and XHB: moderate opportunity, distinct timing;
- XBI: distinct timing, weak economics.

They stay available to S3's exploratory streams.

## 5. What S1 does and does not show

- **It shows** where generic D1 vectors find opportunity on 2017–2024. It does **not** rank ETFs by what an optimized
  pool would earn: no vector was optimized, and every best vector is infeasible under Study 8's rules.
- **The earlier studies' negative standalone findings hold under this fresh design.** No ETF has a stronger standalone
  case than the incumbents' (B1 alone earned $135,359 on this window with its optimized vector, about $18k/yr against
  the best generic $13k/yr). Opportunity concentrates in a few events.
- **S1 removed nothing.** All 61 ETFs go to S2 and S3. The pooled question is answered there.
