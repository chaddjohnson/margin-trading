# VGT minute optimizer: final evaluation (2024–2025)

> **Workflow-held-out, historically previously inspected.** These 2024–2025 dates were held out of every search, selection and report in this workflow (enforced in code, and run only after the freeze), but they are **not** pristine out-of-sample data: the same dates have been examined before in earlier daily and minute backtests, and the incumbent itself was chosen by the daily study with 2024–2026 as its own holdout. Only sessions after 2025-10-13 would be genuinely new evidence.

Attempt 1 (2026-10-15T14:10:30.348Z, reason: first run). Freeze 2026-10-15T14:10:25.828Z, freeze hash `96c0339ad74ed4eb`. Only the frozen rank 1 is evaluated, against the unchanged incumbent; the deep-dip control is shown as a labelled diagnostic. Nothing was re-ranked.

Window 2024-01-02 → 2025-10-13 (447 sessions, 1.78 years). Flat start on the first session, with all earlier sessions as reference-high history; an open position at the end is marked to the last close net of accrued interest. Money per $100,000 margin allocation at 11% interest. Cash dividends are not modeled (raw Alpaca prices).

## Parameters

| Strategy | Dip / stop / hold / lookback / material loss / lower re-entry / reset |
|---|---|
| frozen rank 1 (`c134ab0f37d75`) | 1.7% / 2.7% / 9 d / 10 s / 0.8% / 6.3% / 9.1% |
| incumbent (`incumbent`) | 2.5% / 2.1% / 8 d / 78 s / 2.2% / 4.0% / 36.7% |
| deep-dip (diagnostic) (`deep-dip`) | 10.0% / 8.0% / 15 d / 90 s / 1.0% / 2.0% / 38.0% |

## Results (independent flat-start test)

| Strategy | Trades | Exposure | Gross (0 bp) | Interest | Net 0 bp | Net 5 bp | Net 10 bp | Net 20 bp | Minute DD 0 bp | Daily DD 0 bp | Minute DD 5 bp | Daily DD 5 bp |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| frozen rank 1 | 34 | 76.7% | $28,962 | $15,279 | $13,682 | $10,268 | $6,853 | $25 | $31,610 | $29,904 | $33,102 | $31,491 |
| incumbent | 33 | 64.4% | $63,103 | $12,718 | $50,385 | $47,053 | $43,722 | $37,059 | $25,526 | $21,545 | $25,914 | $21,934 |
| deep-dip (diagnostic) | 6 | 79.2% | $65,022 | $15,611 | $49,411 | $48,779 | $48,146 | $46,881 | $32,084 | $28,542 | $32,269 | $28,729 |

Frozen rank 1 minus incumbent: -$36,702 at 0 bp, -$36,785 at 5 bp, -$36,868 at 10 bp, -$37,034 at 20 bp.

## Execution sensitivity: `next-open` stop fills

| Strategy | Net 0 bp | Net 5 bp | Net 20 bp | Minute DD 0 bp | Change vs stop fill at 5 bp |
|---|---|---|---|---|---|
| frozen rank 1 | $13,810 | $10,396 | $152 | $31,610 | $128 |
| incumbent | $50,435 | $47,104 | $37,109 | $25,526 | $50 |
| deep-dip (diagnostic) | $49,628 | $48,995 | $47,097 | $31,906 | $216 |

## By calendar year (5 bp/side, daily mark to market)

| Strategy | 2024 | 2025 (to the last session) |
|---|---|---|
| frozen rank 1 | $11,466 | -$1,198 |
| incumbent | $28,584 | $18,469 |
| deep-dip (diagnostic) | $22,169 | $26,610 |

## Additional diagnostic: continuous run from 2016-10-07

The fixed vector run without interruption from 2016-10-07, so a position or restriction can carry across 2023-12-31; 2024–2025 P&L is the change in daily mark-to-market equity between the 2023 year-end close and the last session, never a sum of trades exiting in the window. This is not the primary test.

| Strategy | 2024–2025 net 0 bp | 5 bp | 10 bp | 20 bp |
|---|---|---|---|---|
| frozen rank 1 | $12,723 | $9,309 | $5,895 | -$933 |
| incumbent | $50,385 | $47,053 | $43,722 | $37,059 |
| deep-dip (diagnostic) | $48,432 | $47,798 | $47,164 | $45,897 |

## Integrity

Every figure above was computed by the fast engine and replayed through the literal working copy of allIn.ts (`src/app/allIn-minute-optimizable.ts`); they agree field for field (6 checks). Trade, daily-equity, state and episode files for each strategy and stop fill are in `results/<experiment>/final-evaluation/<id>/<stop fill>/`.
