# RETROSPECTIVE — INSPECTED HISTORY — NOT AN INDEPENDENT HOLDOUT — NOT ACCEPTED.

# R1 and R4 on `all` (PROTOCOL.md §21) — 2026-10-25

R1 (GDX KRE XBI XRT, the 16-ETF study's "refined c1") and R4 (GDX KRE XBI XLF, "refined c4") were that study's leading
training results. Both failed its preregistered gates and were never nominated. The user asked to see them on the full
history. These four runs are that inspection, run after this study's selection freeze (`2b56ed01…`, 21:39:36Z), its
reporting batch and its evaluation record, exactly as §20–§21 order. **Nothing here validates anything.** The
2024-01-02 → 2026-10-13 window has been examined repeatedly by this research programme (B5's GDX book was accepted on
it). These figures entered no fitness, ranking, gate or selection of this study, and they must not inform a later one.

Outputs: `evaluations/robust-d1/retrospective/<config>-<mode>-all-5bps-frozen/` (summary.json, report.txt, lots.csv,
daily.csv, signals.csv, bridge-B4.csv, bridge-B5.csv, PROVENANCE.json). Every file begins with the label above. Run log
and shared provenance: `evaluations/robust-d1/retrospective/PROVENANCE.json`.

## 1. Provenance and reproduction

- The vectors were read from `research/joint-16-etf-d1/results/robust/robust.json` and cross-checked against
  `results/refine/refine.json`. Both files' sha256 equal the records in that study's verified `FROZEN_SELECTION.json`,
  and every vector ID is the D1 candidate ID of its grid.
- On the full engine, before any post-training bar was read, each configuration reproduced the archived training
  figures **exactly**: fixed net, minute and daily drawdown, lots, and the portfolio's end equity, daily and minute
  % drawdown and borrowing-dollar-days. Training replay parity showed 0 differences.
- On `all`, fixed-mode replay parity was 0 differences in both configurations.
- The whole `research/joint-16-etf-d1/` directory (32 files) hashed identically before each run and after its outputs
  were written (digest `28f95152…`).
- Each run's provenance records this study's frozen-selection, evaluation-record, protocol and code-manifest hashes.

## 2. Fixed $100,000 pool (5 bps per side; price-only lots; strategy P&L by segment)

| | Development (≤ 2023-12-31) | Holdout (2024-01-01 → 2025-10-16) | Final (2025-10-17 → 2026-10-13) | Post-training (holdout + final) | Full `all` | Minute DD (full) | Funded lots |
|---|---:|---:|---:|---:|---:|---:|---:|
| R1 | $467,806 | $40,020 | $30,330 | **$70,350** | $538,155 | $25,774 | 86 |
| R4 | $371,690 | $39,969 | $31,089 | **$71,058** | $442,748 | $25,774 | 92 |
| B4 (frozen comparator) | $242,196 | $44,003 | −$1,954 | $42,049 | $284,245 | $28,659 | — |
| B5 (frozen comparator) | $388,489 | $68,584 | $29,135 | $97,719 | $486,208 | $26,510 | — |

- **Versus B4 after training:** R1 +$28,301, R4 +$29,009.
- **Versus B5 after training:** R1 −$27,369, R4 −$26,661.
- **The holdout gap to B5.** Both R1 and R4 trail B5 in the holdout ($40k versus $69k) and match it in the final
  segment.
- **Two shared lots.** The two largest post-training lots that R1 and R4 hold and B5 does not are the same in both
  configurations:
  - a GDX lot of 2024-02-13 → 2024-04-15, +$24,750;
  - a KRE lot of 2025-04-11 → 2025-04-24, +$8,145.

  The GDX vectors differ but fund the same dip, and the KRE vector is identical.
- **Drawdown.** R1 and R4 have the same full-period minute drawdown, $25,774. Their worst episode comes from the
  members they share.
- **What training rank predicted.** R1's training lead over B5 (+$79k) did not carry over: after 2023 it earned
  $27k less than B5. That is one more instance of a training-peak lead failing to persist; one window cannot say more.

**Omitted distributions (bounds, not estimates).** Fixed lots are price-only. Across members, the distributions omitted
for the full period would total, at yields of 1% / 3% / 6%:

| | 1% | 3% | 6% |
|---|---:|---:|---:|
| R1 | $3,381 | $10,142 | $20,285 |
| R4 | $2,682 | $8,047 | $16,093 |

These are lot-days × $100,000 × yield ÷ 365. B4 and B5 omit their own (their VGT lots are price-only in the fixed
pool too). None of the comparisons above is close enough to the bounds to be reversed except possibly R1/R4 versus B5
in the final segment alone.

## 3. 20% portfolio (5 bps; frozen dividend convention)

| | End equity 2026-10-13 | Max daily % DD | Max minute % DD | Development return | Holdout return | Final return |
|---|---:|---:|---:|---:|---:|---:|
| R1 | $6,132,353 | 29.01% | 30.33% | 781.8% | 71.5% | 35.2% |
| R4 | $5,181,741 | 29.01% | 30.42% | 643.3% | 71.5% | 35.5% |
| B4 | $3,608,484 | 34.65% | 37.01% | 459.3% | 68.4% | 27.7% |
| B5 | $5,410,977 | 29.67% | 31.09% | 656.8% | 76.5% | 35.0% |

- **What drives the end equity.** The 60/40 VOOG/VGT core dominates the portfolio. R1's higher end equity comes from
  its training years (it compounds from a larger base), not from 2024–2026. In the holdout, R1 and R4 return 71.5%
  against B5's 76.5%, and in the final segment about the same as B5.
- **Dividend convention.** In the frozen convention VGT lots receive VGT's distributions. R1 and R4 hold no VGT lot, so
  for them frozen and symmetric are the same. B4 and B5 get their VGT-lot distributions, a small advantage to the
  benchmarks.

## 4. Reading

- **R1/R4 against the benchmarks.** After training they beat B4 and trail B5 in the fixed pool, with drawdowns inside
  the $35,000 ceiling. That is consistent with what the 16-ETF study's gates said: "not shown to be better than B5".
- **Training versus post-training.** R1's training peak ($467,806 against B5's $388,489) and its smoothed P50 under
  this study's instrument (confirm-B $262,061 against B5's $204,393; `results/tables/final.md`) were both higher than
  B5's. Its post-training P&L was lower.
- **What this does not settle.** This is one historical path over 2.8 years, with two shared lots carrying much of
  the difference. No conclusion about future performance follows, and neither configuration is accepted, nominated or
  registered.
