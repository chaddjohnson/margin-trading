# Recommendation

## Verdict: no nomination in either study; keep frozen B5 as the reference, and treat everything here as research

**Study A (standalone GDX D1): no phenotype is nominated.** No vector found by a broad, replicated search (20,194
vectors, three GA seeds per fold) passed the predeclared robustness gates: every shortlisted vector's ±2-step
neighbourhood breaches the $35,000 minute-drawdown ceiling in more than 10% of points over 2017–2023, mainly through
the 2022 gold-miner bear. The best region (X ≈ 26%, L ≈ 215–228, stop ≈ 6.2%, hold 5, P 7.6%, W 12–14; three
near-identical vectors that failed only that gate) is reported with runnable research commands, **not as a
recommendation**: its full-history minute DD is $30.6k–$34.2k (a $0.8k–$4.4k cushion), about half of its neighbours
exceed $35,000, and 54% of its net comes from 2020.

**Study B (VGT/KRE/GDX pool): no configuration is nominated.**
- The faithful B5 method (Track 1) re-run on the restricted universe chose new GDX vectors that pass the original
  training gates. They fail the joint-neighbourhood risk gate, earned less than the frozen ablation in the exposed
  2024–2026 window, and T1-P breached $35,000 in 2026 ($39,623).
- The walk-forward replication of the same method one fold earlier added a GDX book that **reduced** the pool's
  2020–2021 net against VGT + KRE alone.
- Staged/joint re-optimization (Track 2a) overfit the development path badly (validation down $79k–$128k against C3).

**The frozen three-ETF ablation (B5's own VGT/KRE/GDX books, no retuning) remained the best restricted pool on every
exposed figure** — FX +$96,152, full history $417,105, minute DD $26,510. It is not a new discovery: its books were
selected with 2016–2023 data and its 2024–2026 GDX results were already published. It also fails the same joint
neighbourhood risk gate as every other configuration (24% of neighbours below $35,000), as B5 itself did in earlier
audits.

## Profitability vs drawdown (full history to 2026-10-29, 5 bps, fixed $100,000)

| Configuration | Status | FULL net | FX (exposed) | VAL | Max minute DD | Joint/N1 share < $35k (→2023) |
|---|---|---:|---:|---:|---:|---:|
| C5 frozen B5 (5 ETFs) | historical control | $484,637 | $97,719 | $170,945 (in-sample) | $26,510 | (B5 earlier audits: fails) |
| C3 frozen ablation (VGT/KRE/GDX) | control, in-sample on VAL | $417,105 | $96,152 | $119,070 | $26,510 | 24% |
| T1-S (Track 1, GDX Track S vector) | not nominated (fails PG2) | $343,347 | $91,470 | $61,393 | $30,087 | 34% |
| T1-P (Track 1, GDX Track P vector) | not nominated (fails PG2; FULL DD breach) | $371,476 | $75,429 | $74,231 | **$39,623** | 29% |
| Best Track 2a (T2-s3-coord) | candidate, fails 4 gates | $378,331 | $48,694 | $39,776 | $30,605 | 1% |
| C2 VGT + KRE | base | $236,278 | $40,483 | $65,916 | $27,544 | 35% |
| GDX `portfolioAware` alone | control | $197,029 | $55,670 | $39,282 | $34,134 | 19% |
| GDX near-miss 1 (`d1-ac0aaa704c`) alone | not nominated (fails G2) | $262,020 | $32,297 | $39,212 | $30,616 | 65% |
| GDX near-miss 2 (`d1-a8e252df46`) alone | not nominated (fails G2) | $255,319 | $37,493 | $36,512 | $30,834 | 65% |
| GDX near-miss 3 (`d1-143e245fb1`) alone | not nominated (fails G2) | $252,772 | $36,592 | $37,243 | $34,239 | 54% |

## What is still unproven, and what forward testing would add

- **No period in this repository is clean any more for these books.** 2016–2023 trained every earlier study;
  2024-01-02 → 2026-10-13 was inspected for every B5 book and its neighbourhoods; the 12 appended sessions are too few
  to say anything (one GDX lot, entered 2026-10-22, open).
- GDX D1's value rests on a handful of deep-dip episodes (March 2020 above all; 2022 gave losses and the drawdowns).
  Validation had 1–2 deep GDX dips; no test here can separate skill from those episodes.
- If the user wants to pursue GDX further, the defensible step is **prospective paper observation**, not more
  backtest search: run the frozen ablation (`B5-3ETF-ablation`) and, separately labelled, `S5-T1S` and the
  standalone near-miss region side by side on bars after 2026-10-29, with the drawdown ceiling monitored at minute
  resolution. A forward record of several GDX dip episodes would add evidence; any further optimization would have to
  treat 2016–2026 as observed data and could not produce a holdout.
- The KRE `lowDd` book (X at the 30.0% box ceiling, 3.1% stop, 4-day hold) is the most fragile component of every
  restricted pool; that, not GDX, is where a risk review should look.

## Appendix: data exposure of the periods used (summary of the audit in PROTOCOL.md §3.4)

| Period | Earlier use for these books | Status in Study 5 |
|---|---|---|
| 2016-01-04 → 2017-06-14 | warm-up in every study | warm-up only |
| 2017-06-15 → 2021-12-31 | training of every D1 study; folds of d1-robust/diverse/ranked-preemption, Studies 1, 2 and 4 | DEV (search) |
| 2022-01-03 → 2023-12-29 | training of every D1 study (B5 books in-sample; Study 2: B5 GDX book +$58.2k here) | VAL (within-study validation, not unseen) |
| 2024-01-02 → 2025-10-16 | multi-etf-d1 KRE holdout; portfolio-aware holdout (GDX); B4/B5 pools; b4-b5 robustness audit (perturbations); VGT programs | FX (previously exposed) |
| 2025-10-17 → 2026-10-13 | portfolio-aware final (GDX); B4/B5 pools; b4-b5 robustness audit; vgt-standalone robustness | FX (previously exposed) |
| 2026-10-14 → 2026-10-29 | none (appended 2026-10-30; the prospective B4/B5 protocol has zero observations) | RECENT (12 sessions; reported only) |
