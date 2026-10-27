# Chronological validation — both folds fail; the holdout stays sealed

Sealed records: `results/folds/fold-a/VALIDATION.json` (body `8cb6585b…`), `results/folds/fold-b/VALIDATION.json`
(body `df8be43b…`), `results/PROCEDURE_GATE.json` (body `7764f57b…`, **pass = false**). Each fold's picks were
sealed (`PICKS.json`) from bars before its validation window, before that window was read. Every validation run is
one continuous cash account arming from 2019-02-11; the validation figures are the change of marked equity and the
drawdown inside the window (USDT at the principal costs unless stated). Validation windows are reused BTC history,
not prospective evidence.

## 1. Gate results (PROTOCOL.md §8, rank-1 pick)

| Test | Fold A (2021-12-01 → 2023-02-28) | Fold B (2023-03-01 → 2024-06-30) |
|---|---|---|
| Rank-1 pick | `506-95-65-29-127-27-68-234`: X 50.6%, Y 9.5%, stop 6.5%, hold 29, L 127, buffer 2.7%, P 6.8%, W 234 | `526-20-46-47-68-117-73-75`: X 52.6%, Y 2.0%, stop 4.6%, hold 47, L 68, buffer 11.7%, P 7.3%, W 75 |
| In-sample (selection) net / mDD | 311,117 / 16.7% (34,169) | 277,935 / 25.7% (26,210) |
| Validation net > 0 | **−29,145 ✖** | **0 ✖** |
| Net > 0 at conservative costs (20 + 10) | −31,788 ✖ | 0 ✖ |
| Net > 0 with worst-case stop fills | −29,416 ✖ | 0 ✖ |
| Net minus the largest trade (entered or carried in) > 0 | −41,582 ✖ | 0 ✖ |
| Minute peak-to-trough ≤ 35% | 15.7% ✔ | 0% ✔ |
| Minute drawdown ≤ 35,000 USDT | **70,457 ✖** | 0 ✔ |
| Entries ≥ ⌈3 × years⌉ | 9 ≥ 4 ✔ | **0 < 5 ✖** |
| **Fold gate** | **FAIL** | **FAIL** |

**Procedure gate: FAIL** (both folds fail; one failing fold would already have failed it). Consequently the
**final holdout (2024-07-01 → 2026-08-24) was never read by any engine run**; `npm run btc-d1 -- holdout` refuses,
and every phenotype's data door ends on 2024-06-30.

## 2. Why the folds failed

- **Fold A — the in-sample edge reversed.** The pick earned 311,117 USDT in 2019-02 → 2021-11 with 40 entries. In the
  2022 decline it entered at about 36,100 (January), re-entered four times on continuation pullbacks (February to
  April, at 39,700, 37,600, 40,800 and 42,400) and four times in the June–August lows (21,500–24,600): 9 entries, 6
  wins and 3 losses, the worst −28,688. The window's first third made +19,199, the second −48,344. Its account had grown to 411,117 USDT,
  so the 70,457 USDT drawdown was only 15.7% of the account's peak: the USDT ceiling, not the percentage, caught it.
  Ranks 2 and 3 also lost (−14,191 and −25,720; rank 3's loss came from a position carried into the window, −10,922 in
  December 2021, and its one entry, −14,799), and so did the raw-net centre of the shortlist (−32,677); only 2 of 32 fresh
  radius-1 neighbours of the rank-1 pick made money (median −25,843).
- **Fold B — the picks did not trade.** All three picks arm only after a 51.7–58.8% fall below a 48–133-day high.
  From 2023-03 to 2024-06 they made no entry at all, neither in the continuous run nor from a flat start on
  2023-03-01, so the validation net is exactly 0 and the entries test fails. Their in-sample profit (2019–2022) came
  from deep declines that this window did not contain. A strategy that only acts in rare crashes cannot be validated
  on a window without one, and it cannot be relied on to act when the protocol needs evidence.
- **The diagnostic** (the unchanged ETF D1 vector, not a candidate) lost 50,339 USDT in fold A (52.8% peak-to-trough,
  98,392 USDT) and made 56,947 in fold B (9.0%, 18,199 USDT): its behaviour also flips with the regime, and its
  drawdowns far exceed the risk reference.

## 3. Fold A detail


| pick | key | net USDT | return | mDD% | mDD USDT | dDD% | entries | W/L | worst | costs | carried in | open at end | exposure |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---|---|---:|
| rank 1 | 506-95-65-29-127-27-68-234 | -29,145 | -29.1% | 15.7% | 70,457 | 15.1% | 9 | 6/3 | -28,688 | 2,659 | no | no | 32% |
| rank 2 | 525-6-102-25-123-45-47-26 | -14,191 | -14.2% | 10.0% | 39,040 | 7.7% | 4 | 2/2 | -5,035 | 1,199 | yes | no | 23% |
| rank 3 | 507-82-109-29-67-118-197-211 | -25,720 | -25.7% | 14.3% | 36,819 | 10.9% | 1 | 0/1 | -14,799 | 278 | yes | no | 13% |
| centre | 497-95-70-29-127-27-68-234 | -32,677 | -32.7% | 15.8% | 72,239 | 15.3% | 9 | 6/3 | -28,688 | 2,654 | no | no | 32% |
| diagnostic | 216-3-73-8-74-29-90-60 | -50,339 | -50.3% | 52.8% | 98,392 | 50.5% | 37 | 12/24 | -34,969 | 10,966 | yes | yes | 93% |

| pick | f5/i0 | f5/i5 | f5/i10 | f5/i20 | f10/i0 | f10/i5 | f10/i10 | f10/i20 | f20/i0 | f20/i5 | f20/i10 | f20/i20 | f30/i0 | f30/i5 | f30/i10 | f30/i20 | stop-level | low-fill | flat start |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rank 1 | -39,927 | -40,787 | -29,130 | -30,871 | -40,807 | -29,145 | -30,016 | -31,756 | -30,046 | -30,918 | -31,788 | -33,000 | -31,820 | -32,690 | -33,033 | -41,170 | -29,044 | -29,416 | -28,183 (9) |
| rank 2 | -13,411 | -13,798 | -14,184 | -14,955 | -13,804 | -14,191 | -14,577 | -15,348 | -14,591 | -14,977 | -15,363 | -16,133 | -15,378 | -15,764 | -16,149 | -16,919 | -14,053 | -14,478 | -1,741 (4) |
| rank 3 | -25,559 | -25,633 | -25,708 | -25,856 | -25,646 | -25,720 | -25,795 | -25,943 | -25,821 | -25,895 | -25,969 | -15,239 | -25,995 | -15,169 | -15,254 | -26,292 | -25,720 | -25,720 | -14,784 (1) |
| centre | -30,923 | -31,792 | -32,660 | -40,564 | -31,808 | -32,677 | -39,823 | -41,344 | -39,863 | -40,625 | -41,385 | -42,904 | -41,426 | -42,187 | -42,947 | -44,464 | -32,456 | -39,911 | -30,882 (9) |
| diagnostic | -37,454 | -39,985 | -50,270 | -69,051 | -40,005 | -50,339 | -59,389 | -77,570 | -59,508 | -69,237 | -77,613 | -81,676 | -77,656 | -80,385 | -81,718 | -83,148 | -48,571 | -55,591 | -48,821 (37) |

| pick | calendar-year attribution (net USDT / entries) | neighbours: median net, share > 0, range |
|---|---|---|
| rank 1 | 2021: 0 / 0; 2022: -29,145 / 9; 2023: 0 / 0 | -25,843, 6%, -50,711 … 7,069 |
| rank 2 | 2021: -12,784 / 0; 2022: -1,407 / 4; 2023: 0 / 0 | -7,076, 31%, -25,665 … 22,107 |
| rank 3 | 2021: -10,922 / 0; 2022: -14,799 / 1; 2023: 0 / 0 | -18,307, 3%, -49,278 … 934 |
| centre | 2021: 0 / 0; 2022: -32,677 / 9; 2023: 0 / 0 | -29,325, 13%, -63,600 … 9,251 |
| diagnostic | 2021: -25,830 / 4; 2022: -59,647 / 32; 2023: 35,138 / 1 | -45,276, 0%, -82,387 … -6,543 |


## 4. Fold B detail


| pick | key | net USDT | return | mDD% | mDD USDT | dDD% | entries | W/L | worst | costs | carried in | open at end | exposure |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---|---|---:|
| rank 1 | 526-20-46-47-68-117-73-75 | 0 | 0.0% | 0.0% | 0 | 0.0% | 0 | 0/0 | 0 | 0 | no | no | 0% |
| rank 2 | 517-97-46-28-48-86-93-29 | 0 | 0.0% | 0.0% | 0 | 0.0% | 0 | 0/0 | 0 | 0 | no | no | 0% |
| rank 3 | 588-39-62-23-133-34-104-271 | 0 | 0.0% | 0.0% | 0 | 0.0% | 0 | 0/0 | 0 | 0 | no | no | 0% |
| diagnostic | 216-3-73-8-74-29-90-60 | 56,947 | 56.9% | 9.0% | 18,199 | 6.8% | 7 | 4/3 | -6,999 | 2,193 | yes | no | 28% |

| pick | f5/i0 | f5/i5 | f5/i10 | f5/i20 | f10/i0 | f10/i5 | f10/i10 | f10/i20 | f20/i0 | f20/i5 | f20/i10 | f20/i20 | f30/i0 | f30/i5 | f30/i10 | f30/i20 | stop-level | low-fill | flat start |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| rank 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) |
| rank 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) |
| rank 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (0) |
| diagnostic | 58,435 | 57,676 | 56,918 | 53,686 | 57,705 | 56,947 | 56,190 | 47,537 | 56,246 | 53,703 | 47,499 | 43,774 | 47,460 | 48,441 | 43,736 | 32,801 | 58,218 | 55,659 | 60,400 (7) |

| pick | calendar-year attribution (net USDT / entries) | neighbours: median net, share > 0, range |
|---|---|---|
| rank 1 | 2023: 0 / 0; 2024: 0 / 0 | 0, 0%, 0 … 0 |
| rank 2 | 2023: 0 / 0; 2024: 0 / 0 | 0, 0%, 0 … 0 |
| rank 3 | 2023: 0 / 0; 2024: 0 / 0 | 0, 0%, 0 … 0 |
| diagnostic | 2023: 61,004 / 4; 2024: -4,057 / 3 | 27,212, 66%, -4,221 … 147,460 |


## 5. Notes

- Cost columns are fee/impact in bps per side. Some rows are not monotone in cost because D1's profit tests are net
  of costs, so a different cost changes which trades happen (e.g. fold A rank 3).
- "Flat start" re-runs the pick with a fresh 100,000 USDT account from the validation start (warm-up from earlier
  bars only); it is descriptive and was not used by any gate.
- Calendar-year attribution is descriptive; no parameter was chosen with it.
- The fold B centre (highest raw net in its shortlist) is its rank-1 pick, so it has no separate row.
- The holdout was not opened, so there is no locked-holdout evidence for any phenotype.
