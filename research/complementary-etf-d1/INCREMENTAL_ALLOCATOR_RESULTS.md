# Stage C — incremental allocator results

**No additive scenario exists**, so no incremental allocator run was made: Stage A selected no candidate and
`FROZEN_CANDIDATES.json` holds none (`OPTIMIZATION_AND_FREEZE.md`). The allocator was **not extended**; its code,
configuration, phenotypes and every frozen output are unchanged. What follows is the gate the protocol requires before
any new allocator run, and the baseline the additions would have been measured against.

## 1. The gate: the old horizon reproduced exactly on the canonical path

`npm run complementary-etf-d1 -- regression` runs the four frozen controls through the canonical `--dataset all --end
2025-10-13` loader (the corrected split registry in force; no split falls before 2025-10-13) and compares them with
the committed frozen runs in `research/multi-etf-allocator/results/runs/principal/` (read-only). Output:
`results/regression/`.

| Control | Net / ending equity | Largest dollar drawdown | Maximum **percentage** drawdown (daily equity) | Minute-sampled % DD | CSVs byte-identical | Summary differences |
|---|---:|---|---|---|---|---|
| Fixed $100k, VGT D1 alone | **$183,043.82** | minute $19,330.69; daily $15,611.46 (2020-02-19 → 2020-03-16) | — (fixed: % of the $100k allocation) | — | 7 / 7 | 0 |
| Fixed $100k, All-lowDd shadow | **$294,675.77** (75 lots) | minute $27,968.03; daily $24,574.95 (2020-02-19 → 2020-03-23) | — | — | 7 / 7 | 0 |
| $300k portfolio B, VGT D1 only, 20% | **$2,346,272.33** | daily $484,116 (25.3% depth, 2025-01-23 → 2025-04-08) | **32.73%** ($239,550; 2020-02-19 → 2020-03-23, recovered 2020-06-01) | 35.17% | 13 / 13 | 0 |
| $300k portfolio All-lowDd shadow, 20% | **$2,891,290.87** | daily $594,129 (25.2% depth, 2025-01-23 → 2025-04-08) | **34.55%** ($252,851; 2020-02-19 → 2020-03-23, recovered 2020-06-05) | 36.92% | 13 / 13 | 0 |

The 25.3% / 25.2% figures are the depth of the largest-*dollar* episode, never the maximum percentage drawdown; the
latter is March 2020 in both portfolios. A new regression test pins this on the frozen inputs
(`src/multi-etf-allocator/tests/regression.test.ts`, "maximum percentage drawdown versus the largest dollar
drawdown").

## 2. The baseline the additions would have faced (existing, unchanged)

From the full-history evaluation already on file (`docs/all-lowdd-full-history-evaluation.md`; outputs in
`evaluations/multi-etf-allocator/all/`), one continuous run each, 2016-01-04 close → 2026-10-13, 0 bps:

| | Fixed $100k pool | $300k portfolio at 20% |
|---|---:|---:|
| Net (all realized) / ending equity | $291,775 (76 lots) | $3,661,933 (strategy net $629,310; 76 lots) |
| Training (to 2023-12-29) | +$249,174 (71 lots) | strategy +$471,679 |
| Holdout (2024-01-02 → 2025-10-16) | +$44,378 (4 lots) | strategy +$165,715 |
| Final (2025-10-17 → 2026-10-13) | −$1,777 (1 lot) | strategy −$8,083 |
| Largest minute DD | $27,968 | max % DD daily 34.6%, minute 36.9% (March 2020) |

An addition would have had to raise the fixed pool's net by ≥ $15,000 and the portfolio's ending equity by ≥ 2% at
5 bps per side, net of everything it displaced, with ≥ 5 lots in ≥ 3 years and positive out-of-sample evidence
(PROTOCOL.md §6). The training diagnostics (OPPORTUNITY_SCREEN.md §5) show every candidate's fundable D1 trades
displacing more baseline P&L than they add.

## 3. Not produced, and why

Mode A/B scenario tables, the symbol bridge, cost sensitivities, matched borrowing-dollar-day comparisons, ledger
audits of added books and the analytic distribution sensitivity of funded candidate lots all presuppose a frozen
candidate. None exists, so none was computed — not as a blocker, but as the protocol's result.
