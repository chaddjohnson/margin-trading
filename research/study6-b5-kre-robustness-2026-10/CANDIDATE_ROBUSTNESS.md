# Candidate robustness: centre vs neighbourhood, validation, final, Pareto, rejection reasons

**Sources:**
- `results/partB/validation.json` (+ `validation.csv`), `FROZEN_SELECTION.json`;
- `results/partB/final/final.json`, identical to `confirmation.json`, and `final/lots.csv`;
- the configuration files `config/research-pools/study6-b5-kre-robustness/S6-*.json`.

**Conventions:**
- Fixed $100,000 per funded trade, 11%, 5 bps per side.
- DD = minute-sampled maximum drawdown in dollars; % of the $100,000 allocation = DD ÷ 1,000.
- "Share" = unique joint-N1 neighbours with DD < $35,000.
- V = validation seeds, run to 2023-12-29. C1–C3 = confirmation seeds on the full history to 2026-10-29.
- Every configuration contains all five ETFs (C5−KRE is a diagnostic control).

## 1. Verdict

**No candidate passes the hard risk gate, at validation or retrospectively.**

| Measure | Frozen B5 (C5) | Best candidate |
|---|---:|---:|
| V1 share | 30.5% | 39.8% (O-PA-S) |
| C1 share | 31.2% | 35.9% (K1) / 35.2% (O-PA-S) |
| p90 | — | at best $50,008 (O-PA-S, against $35,000) |

- No candidate qualified at validation, so no role was assigned and **no research nomination exists**.
- The predeclared go/no-go (§11.4) records **"partial improvement only"**: O-PA-S and O-ME-primary improve frozen B5's
  V1 p90 by ≥ $5,000. That improvement is small, both still fail the gate by a wide margin, and O-ME-primary's gain
  nearly vanishes on the full history (C1 p90 $55,061 against C5's $55,952).

## 2. Centre vs neighbourhood — every configuration

| Key | Track | Full net W29 (÷ C5) | W13 net | Centre DD (trough) | **V1 share / p90** | **C1 / C2 / C3 share** | C1 p90 | C1 median net | FX net 2024 → 2026-10-13 | Profit line |
|---|---|---:|---:|---:|---|---|---:|---:|---:|---|
| **C5 frozen B5** | control | **$484,637** (100%) | $486,208 | $26,510 (2020-03-12) | 30.5% / $57,088 | 31.2 / 28.9 / 28.9% | $55,952 | $238,947 | $97,719 | 100% |
| C5−KRE | diagnostic | $387,857 (80.0%) | $389,427 | $25,774 (2026-07-17) | 65.6% / $46,619 | 61.7 / 60.2 / 65.6% | $43,745 | $220,056 | $98,137 | < 90% |
| K1 | K | $445,248 (91.9%) | $446,818 | $33,065 (2020-03-16) | 33.6% / $58,212 | 35.9 / 27.3 / 32.0% | $58,174 | $244,358 | $98,998 | ≥ 90% |
| K2 | K | $459,507 (94.8%) | $461,078 | $33,065 (2020-03-16) | 25.8% / $61,797 | 28.1 / 25.8 / 25.8% | $60,165 | $237,156 | $97,746 | ≥ 90% |
| K3 | K | $418,032 (86.3%) | $419,602 | $30,584 (2020-08-07) | 34.4% / $54,459 | 30.5 / 31.2 / 39.1% | $52,328 | $228,741 | $98,137 | < 90% |
| K4 | K | $434,890 (89.7%) | $436,460 | $33,085 (2020-03-16) | 18.8% / $67,466 | 21.9 / 18.8 / 21.9% | $71,799 | $235,398 | $98,751 | < 90% |
| K5 | K | $426,801 (88.1%) | $428,372 | $33,085 (2020-03-16) | 24.2% / $67,817 | 21.1 / 19.5 / 21.9% | $70,058 | $226,938 | $97,538 | < 90% |
| K6 | K | $418,568 (86.4%) | $420,139 | $33,065 (2020-03-16) | 31.2% / $63,166 | 29.7 / 19.5 / 27.3% | $62,888 | $230,449 | $98,998 | < 90% |
| J1 | J | $373,144 (77.0%) | $374,714 | $28,890 (2025-04-08) | 30.5% / $62,907 | 31.2 / 32.8 / 27.3% | $65,527 | $238,940 | $62,746 | < 90% |
| J2 | J | $364,135 (75.1%) | $365,706 | $26,923 (2025-04-08) | 28.1% / $68,420 | 33.6 / 29.7 / 28.1% | $65,843 | $231,301 | $63,087 | < 90% |
| J3 | J | $399,860 (82.5%) | $401,430 | $34,224 (2023-05-04) | 23.4% / $73,961 | 22.7 / 19.5 / 18.0% | $74,307 | $234,431 | $109,693 | < 90% |
| J4 | J | $372,526 (76.9%) | $374,097 | $28,134 (2025-04-08) | 27.3% / $68,988 | 33.6 / 34.4 / 33.6% | $70,423 | $230,374 | $62,333 | < 90% |
| O-PA-S | O (B5 optimizer) | $422,935 (87.3%) | $424,505 | $32,201 (2020-03-16) | **39.8% / $51,700** | 35.2 / 34.4 / 35.2% | **$50,008** | $251,504 | $98,015 | < 90% |
| O-ME-primary | O (multi-etf-d1) | $453,199 (93.5%) | $454,770 | $26,653 (2020-03-12) | 30.5% / $51,659 | 27.3 / 24.2 / 25.8% | $55,061 | $243,690 | $98,137 | ≥ 90% |
| O-ME-lowDd | O (multi-etf-d1) | $466,088 (96.2%) | $467,659 | $26,510 (2020-03-12) | 21.9% / $60,340 | 22.7 / 21.1 / 22.7% | $61,235 | $237,048 | $98,194 | ≥ 95% |

- **Every centre passes $35,000** (centre DD $26,510–$34,224). **Every neighbourhood fails:** at most 40% of
  neighbours stay below $35,000 on any seed set, and p90 is never below $50,008.
- **This is the study's central point:** a safe centre says nothing about its neighbourhood.
- The 90/95/100% profit reference lines are relative to C5's centre net; they are reference lines, not pass criteria.
  Only O-ME-lowDd (≥ 95%), K1, K2 and O-ME-primary (≥ 90%) keep ≥ 90% of frozen B5's centre net. None of them improves
  the neighbourhood.
- **RECENT (2026-10-14 → 2026-10-29)** is −$1,571 for every configuration: the same open GDX lot, entered 2026-10-22.
  The slice is reported separately and is too short to mean anything.

## 3. Five-book interactions per candidate (final, per-book N1 on the full history, C1 labels, 64 points)

| Key | VGT | XBI | XRT | KRE | GDX |
|---|---|---|---|---|---|
| C5 | 95% / $29.5k | 100% / $28.4k | 100% / $26.5k | **58% / $35.3k** | 89% / $35.1k |
| K1 | 80% / $35.4k | 100% / $33.1k | 88% / $37.4k | 72% / $36.7k | 89% / $35.1k |
| K3 | 95% / $30.6k | 100% / $30.6k | 88% / $44.2k | 66% / $37.0k | **47%** / $39.7k |
| J1 | 100% / $32.1k | **58%** / $45.6k | 100% / $30.6k | **100%** / $29.2k | 84% / $36.6k |
| J4 | 97% / $31.4k | 89% / $34.9k | 100% / $29.7k | 100% / $32.1k | **66%** / $44.5k |
| O-PA-S | 91% / $34.9k | 100% / $32.2k | 100% / $32.9k | 75% / $35.4k | 94% / $34.7k |
| O-ME-lowDd | 94% / $29.9k | 100% / $27.9k | 88% / $59.4k | 53% / $35.3k | **47%** / $53.4k |

Each cell is the share of that book's neighbours below $35k / their p90. All rows are in `final.json`.

The table shows the whack-a-mole:
- Changing KRE (Track K) moves the centre's margin and makes **other books' neighbourhoods fragile**: XRT and GDX for
  K3, VGT for K1.
- Changing KRE + VGT (Track J) makes **KRE** robust (100%), but **XBI** (J1) or **GDX** (J4) fragile, because the
  slot sequence in 2022–2023 changes.
- No configuration found makes every book's neighbourhood safe at once.

## 4. Validation → final (where the improvements went)

| Key | DEV-side share (search seeds) | V1 share (→ 2023) | C1 share (→ 2026-10-29) |
|---|---:|---:|---:|
| C5 | 58.6% | 30.5% | 31.2% |
| K3 (best K at DEV) | 82.0% | 34.4% | 30.5% |
| J1 / J4 (best J at DEV) | 94.5% / 97.7% | 30.5% / 27.3% | 31.2% / 33.6% |
| O-PA-S | — | 39.8% | 35.2% |

- The DEV-side gains in neighbourhood share disappear once 2022–2023 is in the run. Adding 2024–2026 changes little.
- **Track J's DEV robustness came from VGT's shorter hold** (4–5 days instead of 8). VGT then earns less in the 2024–2026
  rally: FX net $62k–$63k against $98k.

## 5. Pareto frontiers (all 13 candidates and both controls)

| Frontier | Non-dominated configurations |
|---|---|
| Full-history centre net (max) vs C1 p90 DD (min) | **C5**, O-ME-primary, O-PA-S, C5−KRE |
| Robust profit S_V (max) vs V1 p90 (min) | O-PA-S, C5−KRE |
| Full-history centre net (max) vs centre DD (min) | **C5**, C5−KRE |

- **Frozen B5 is on the net-vs-risk frontier**, and no five-ETF candidate dominates it.
- The candidates that lower the neighbourhood p90 (O-PA-S −$5.9k, O-ME-primary −$0.9k) give up 6.5–12.7% of net,
  and they still breach.
- C5−KRE lowers the p90 most ($43.7k), but drops a book, which the protocol forbids. It is a diagnostic only, and
  still fails (61.7%).

## 6. Rejection reasons (frozen at validation; final classification not reached — no roles)

| Key | Fails | Also |
|---|---|---|
| K1, K2, O-ME-lowDd | Q2 (joint N1 gate) | — |
| K3–K6 | Q2, E1 (robust profit < 90% of C5's) | — |
| J1 | Q2, Q4 (2020 = 54.3% of DEV+VAL net) | — |
| J2–J4 | Q2, Q4, E1 | — |
| O-PA-S | Q2 | meets the partial-improvement rule (V1 p90 −$5,388) |
| O-ME-primary | Q2, Q4, Q5 (only 3 KRE lots over DEV+VAL), E1 | meets the partial-improvement rule (V1 p90 −$5,429) |

Context for C5 itself: it fails Q2 only. Every other gate passes (Q1, Q3–Q8). Its weakness is exactly the
neighbourhood.

## 7. Other evidence (final record; descriptive)

- **Execution sensitivities** (0/2/10/20 bps, 8/14%, next-open, 10/25 bps slippage, two arming shifts):
  - every centre stays profitable;
  - every centre except J3 stays below $35,000 in every setting. J3 breaches at 0 bps ($35.7k), 2 bps ($36.0k) and 8%
    interest ($35.8k).
- **Paired stationary block bootstrap of daily mark differences against C5** (block 21 sessions, 5,000 resamples):
  - every candidate's observed full-history difference is negative, from −$18,549 (O-ME-lowDd) to −$120,502 (J2);
  - the share of resamples above zero is 0.2–24.6%.
  - Descriptive only: the series is path-dependent.
- **Concentration:**
  - largest calendar year (2020) 29.7–46.0% of net; J1, J2 and J4 are the most 2020-dependent (44.8–46.0%; C5 34.2%);
  - largest lot 9.5–11.2% of net (C5 9.1%).
- **Capital use:**
  - net per occupied $100k-year ranges from $85k to $98k for the candidates, against C5's $100,507;
  - margin interest is $44k–$56k.

## 8. Endpoints

All configurations, both endpoints, from the same continuous runs. The only difference is the GDX lot opened
2026-10-22, still open and marked −$1,571 at 2026-10-29.

| Key | W13 net (→ 2026-10-13) | W29 net (→ 2026-10-29) | DD (same at both) |
|---|---:|---:|---:|
| C5 | $486,208 | $484,637 | $26,510 |
| O-PA-S | $424,505 | $422,935 | $32,201 |
| O-ME-lowDd | $467,659 | $466,088 | $26,510 |
| K1 | $446,818 | $445,248 | $33,065 |
| J1 | $374,714 | $373,144 | $28,890 |
