# Strategy comparison: development versus holdout, and the cross-sector chronology

Generated inputs: `results/tables/holdout_comparison.md`, `results/tables/development_comparison.md`,
`results/tables/cross_sector_chronology.md` (every entry of the control and the primary of each ticker over the full
continuous run, with the other tickers long at that moment). No shared-capital or allocation simulation was run; the
chronology is descriptive material for the next assignment only.

## 1. Development versus holdout, every ticker and role

| Ticker | Role | Parameters | Dev net | Dev minute DD | Dev entries | Holdout net | Holdout minute DD | Holdout entries | Holdout W/L | Holdout Δ vs D1 | Dev Δ vs D1 | Generalized? | Combined net | Combined minute DD |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| XBI | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $35,145 | $68,829 | 45 | −$745 | $22,473 | 2 | 2/1 | — | — | — | $34,400 | $68,829 |
| XBI | primary | X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29 | $151,799 | $27,885 | 24 | $54,247 | $12,963 | 1 (1 open) | 0/0 | +$54,993 | +$116,653 | yes (both positive) | $206,046 | $27,885 |
| XBI | alternate-lowDd | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | $118,055 | $12,837 | 29 | $0 | $0 | 0 | 0/0 | +$745 | +$82,910 | yes (both positive) | $118,055 | $12,837 |
| IWM | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $13,778 | $39,694 | 12 | $29,105 | $10,223 | 1 (1 open) | 0/0 | — | — | — | $42,883 | $39,694 |
| IWM | primary | X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127 | $120,856 | $14,910 | 38 | $13,783 | $7,911 | 3 | 3/0 | −$15,322 | +$107,078 | no (dev gain, holdout loss) | $134,639 | $14,910 |
| IWM | alternate-lowDd | X 28.3% Y 0.5% L 211 stop 3.3% hold 13 buffer 5.9% P 5.5% W 96 | $106,642 | $13,303 | 33 | $15,732 | $8,067 | 3 | 3/0 | −$13,373 | +$92,864 | no (dev gain, holdout loss) | $122,373 | $13,303 |
| XRT | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $41,132 | $41,800 | 34 | $20,597 | $11,073 | 3 (1 open) | 2/0 | — | — | — | $61,729 | $41,800 |
| XRT | primary | X 24.4% Y 2.0% L 49 stop 7.7% hold 9 buffer 2.8% P 6.5% W 103 | $145,468 | $23,383 | 24 | $20,261 | $10,408 | 2 (1 open) | 1/0 | −$336 | +$104,336 | no (dev gain, holdout loss) | $165,729 | $23,383 |
| XRT | alternate-lowDd | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120 | $127,705 | $19,966 | 18 | $20,730 | $11,679 | 1 | 1/0 | +$133 | +$86,574 | yes (both positive) | $148,436 | $19,966 |
| KRE | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $4,950 | $55,799 | 32 | $15,012 | $15,483 | 6 (1 open) | 3/2 | — | — | — | $19,962 | $55,799 |
| KRE | primary | X 29.9% Y 2.8% L 233 stop 3.1% hold 5 buffer 2.8% P 9.4% W 100 | $171,785 | $26,271 | 70 | $23,262 | $7,402 | 5 | 4/1 | +$8,251 | +$166,835 | yes (both positive) | $195,048 | $26,271 |
| KRE | alternate-lowDd | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | $158,512 | $22,725 | 73 | $15,635 | $7,402 | 4 | 3/1 | +$624 | +$153,562 | yes (both positive) | $174,148 | $22,725 |
| XLY | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $72,921 | $29,065 | 17 | $21,788 | $8,722 | 2 (1 open) | 0/1 | — | — | — | $94,709 | $29,065 |
| XLY | primary | X 21.3% Y 3.5% L 112 stop 3.1% hold 10 buffer 0.8% P 8.4% W 175 | $112,490 | $16,972 | 30 | −$3,360 | $11,650 | 3 | 2/2 | −$25,148 | +$39,569 | no (dev gain, holdout loss) | $109,130 | $16,972 |
| XLY | alternate-lowDd | X 21.4% Y 4.1% L 126 stop 3.0% hold 6 buffer 1.4% P 9.1% W 188 | $86,163 | $11,366 | 34 | −$4,922 | $10,227 | 3 | 2/1 | −$26,711 | +$13,243 | no (dev gain, holdout loss) | $81,241 | $14,125 |
| IWN | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,255 | $41,879 | 10 | $10,155 | $9,454 | 1 | 1/0 | — | — | — | $30,410 | $41,879 |
| IWN | primary | X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191 | $111,181 | $16,875 | 38 | $6,158 | $6,593 | 3 | 3/0 | −$3,996 | +$90,925 | no (dev gain, holdout loss) | $117,339 | $16,875 |
| IWN | alternate-lowDd | X 27.4% Y 0.4% L 96 stop 3.5% hold 4 buffer 5.9% P 12.7% W 191 | $84,673 | $15,180 | 22 | $8,917 | $6,827 | 2 | 2/0 | −$1,238 | +$64,418 | no (dev gain, holdout loss) | $93,590 | $15,180 |
| XLF | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,729 | $32,211 | 14 | $0 | $0 | 0 | 0/0 | — | — | — | $20,729 | $32,211 |
| XLF | primary | X 25.4% Y 1.6% L 200 stop 4.0% hold 8 buffer 0.6% P 4.1% W 19 | $121,499 | $17,071 | 30 | $0 | $0 | 0 | 0/0 | +$0 | +$100,770 | no (dev gain, holdout loss) | $121,499 | $17,071 |
| XLF | alternate-lowDd | X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.8% P 7.3% W 15 | $99,222 | $12,762 | 30 | $0 | $0 | 0 | 0/0 | +$0 | +$78,494 | no (dev gain, holdout loss) | $99,222 | $12,762 |
| XLE | control | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $26,974 | $72,402 | 32 | $0 | $0 | 0 | 0/0 | — | — | — | $26,974 | $72,402 |
| XLE | primary | X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47 | $154,448 | $24,861 | 23 | $0 | $0 | 0 | 0/0 | +$0 | +$127,473 | no (dev gain, holdout loss) | $154,448 | $24,861 |
| XLE | alternate-lowDd | X 29.7% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.2% W 62 | $120,741 | $22,438 | 25 | $0 | $0 | 0 | 0/0 | +$0 | +$93,766 | no (dev gain, holdout loss) | $120,741 | $22,438 |


Reading: the development gains (+$40k to +$167k per ticker) were produced by phenotypes that trade more often with
tighter stops; in the single holdout episode those stops cut the April 2025 rebound short on IWM, XLY and IWN, where
frozen D1's wider stop kept the position and earned more. The primaries are ahead on XBI (one open trade) and KRE, tied
on XRT, and untested on XLF and XLE (no trade). "Generalized" is a sign comparison on 1–6 trades, not a test.

## 2. Phenotypes worth keeping distinct (for later research, not as recommendations)

| Phenotype | Tickers and roles | Signature | Development | Holdout behaviour |
|---|---|---|---|---|
| D1 as shipped | control on all eight | X 21.6%, stop 7.3%, hold 8 | $5k–$73k net, $29k–$72k DD; long losing holds in 2018, 2020, 2022 | the only phenotype that held April 2025 entries through the recovery (IWM +$29k, XLY +$22k open; XRT +$17k) |
| tight-stop scalp | IWM, KRE, XLY, IWN, XLF primaries; IWM, KRE, XLY, XLF, XBI, IWN lowDd | X 21–30%, stop 3.0–4.0%, hold 4–13, L 96–243, many continuation re-entries | $86k–$172k net, $11k–$26k DD, 22–73 trades, win rate 65–90% | small quick wins ($0.3k–$8k) and small losses; cost-fragile; underperformed D1 where the rebound ran |
| deep-dip trend ride | XBI, XRT, XLE primaries; XRT, XLE lowDd | X 24–30%, stop 5.2–10.4%, hold 3–17, few trades | $121k–$154k net, $20k–$28k DD, 18–25 trades, one or two trades = half the net | XBI +$54k on one open 2025-04-09 position; XRT = D1; XLE never armed |

## 3. Cross-sector chronology of the holdout window (descriptive)

Frozen D1, entries inside or across the 2024 boundary (full table in `results/tables/cross_sector_chronology.md`):

| Entry | Ticker | Exit | Reason | Net | Window | Other tickers long at entry |
|---|---|---|---|---:|---|---|
| 2023-11-10 | XBI | 2024-01-17 | trailing stop | +$30,850 | spanning | — |
| 2024-01-16 | KRE | 2024-02-01 | buffered intraday loss | −$3,002 | holdout | XBI |
| 2024-03-14 | XBI | 2024-03-25 | maximum hold | −$1,259 | holdout | — |
| 2025-03-10 | KRE | 2025-04-03 | maximum hold | −$2,389 | holdout | — |
| 2025-03-13 | XRT | 2025-04-03 | maximum hold | +$72 | holdout | KRE |
| 2025-04-04 | IWM | open | open | +$29,105 | holdout | IWN KRE XBI XLY XRT |
| 2025-04-04 | IWN | 2025-08-01 | trailing stop | +$10,155 | holdout | IWM KRE XBI XLY XRT |
| 2025-04-04 | KRE | 2025-04-10 | trailing stop | +$1,785 | holdout | IWM IWN XBI XLY XRT |
| 2025-04-04 | XBI | 2025-05-06 | trailing stop | +$3,876 | holdout | IWM IWN KRE XLY XRT |
| 2025-04-04 | XLY | 2025-04-17 | maximum hold | −$392 | holdout | IWM IWN KRE XBI XRT |
| 2025-04-04 | XRT | 2025-08-01 | trailing stop | +$17,485 | holdout | IWM IWN KRE XBI XLY |
| 2025-04-11 | KRE | 2025-05-23 | trailing stop gap | +$13,153 | holdout | IWM IWN XBI XLY XRT |
| 2025-04-21 | XLY | open | open | +$22,180 | holdout | IWM IWN XBI XRT KRE |
| 2025-08-01 | KRE | 2025-10-10 | trailing stop | +$4,937 | holdout | IWM IWN XRT XLY |
| 2025-10-10 | XRT | open | open | +$3,039 | holdout | IWM XLY KRE |
| 2025-10-16 | KRE | open | open | +$528 | holdout | IWM XLY XRT |

Months with at least three tickers long at some point: 2018-12 (IWM IWN KRE XBI XLE XLF XLY XRT); 2019-01 (IWM IWN KRE XBI XLE XLF XLY XRT); 2019-02 (IWM IWN KRE XBI XLE XLF XLY XRT); 2019-03 (IWM IWN KRE XBI XLE XLF XLY XRT); 2019-04 (IWM XBI XLE XLY); 2019-05 (IWM IWN KRE XBI XLE XLY XRT); 2019-06 (IWN XBI XLE); 2019-07 (IWN XBI XLE); 2019-08 (IWM IWN XBI XLE); 2020-03 (IWM IWN KRE XBI XLE XLF XLY XRT); 2020-04 (IWM IWN KRE XBI XLE XLF XLY XRT); 2020-05 (IWM IWN KRE XBI XLE XLF XLY XRT); 2020-06 (IWM IWN KRE XLE XLF XLY XRT); 2020-07 (IWN KRE XBI XLE XLF); 2020-08 (KRE XBI XLE); 2021-03 (XBI XLE XRT); 2022-01 (IWM XBI XRT); 2022-02 (IWM XBI XLY XRT); 2022-03 (XBI XLY XRT); 2022-04 (XBI XLY XRT); 2022-05 (KRE XBI XLF XLY XRT); 2022-06 (IWM KRE XBI XLE XLF XLY XRT); 2022-07 (IWM KRE XBI XLE XLF XLY XRT); 2022-08 (IWM XBI XLE XLF XLY XRT); 2022-09 (IWM XLE XLF XLY XRT); 2022-10 (XLE XLY XRT); 2022-11 (XLE XLY XRT); 2022-12 (XLE XLY XRT); 2023-03 (KRE XBI XRT); 2023-04 (KRE XBI XRT); 2023-05 (KRE XBI XRT); 2023-06 (KRE XBI XRT); 2023-07 (KRE XBI XRT); 2023-10 (KRE XBI XRT); 2025-04 (IWM IWN KRE XBI XLY XRT); 2025-05 (IWM IWN KRE XBI XLY XRT); 2025-06 (IWM IWN XLY XRT); 2025-07 (IWM IWN XLY XRT); 2025-08 (IWM IWN KRE XLY XRT); 2025-09 (IWM KRE XLY); 2025-10 (IWM KRE XLY XRT); 2025-11 (IWM KRE XLY XRT); 2025-12 (IWM KRE XLY XRT).

Primary nominations, the same window:

| Entry | Ticker | Exit | Reason | Net | Window | Other tickers long at entry |
|---|---|---|---|---:|---|---|
| 2023-11-01 | XLY | 2024-01-02 | trailing stop | +$13,519 | spanning | KRE |
| 2024-02-01 | KRE | 2024-02-06 | maximum hold | −$850 | holdout | — |
| 2024-04-24 | XLY | 2024-05-23 | buffered intraday loss | −$834 | holdout | — |
| 2025-04-04 | IWM | 2025-04-08 | trailing stop | +$3,322 | holdout | IWN KRE XLY |
| 2025-04-04 | IWN | 2025-04-08 | trailing stop | +$336 | holdout | IWM KRE XLY |
| 2025-04-04 | KRE | 2025-04-08 | trailing stop | +$3,552 | holdout | IWM IWN XLY |
| 2025-04-04 | XLY | 2025-04-10 | trailing stop | +$788 | holdout | IWM IWN KRE |
| 2025-04-07 | XRT | 2025-08-01 | trailing stop | +$18,681 | holdout | IWM IWN KRE XLY |
| 2025-04-09 | IWM | 2025-04-10 | trailing stop gap | +$6,082 | holdout | XLY XRT IWN KRE XBI |
| 2025-04-09 | IWN | 2025-04-10 | trailing stop gap | +$5,104 | holdout | XLY XRT IWM KRE XBI |
| 2025-04-09 | KRE | 2025-04-10 | trailing stop gap | +$4,148 | holdout | XLY XRT IWM IWN XBI |
| 2025-04-09 | XBI | open | open | +$54,247 | holdout | XLY XRT IWM IWN KRE |
| 2025-04-11 | IWN | 2025-04-21 | trailing stop | +$718 | holdout | XRT XBI KRE |
| 2025-04-11 | KRE | 2025-04-24 | trailing stop gap | +$8,253 | holdout | XRT XBI IWN |
| 2025-04-14 | XLY | 2025-04-24 | maximum hold | −$1,712 | holdout | XRT XBI IWN KRE |
| 2025-08-01 | IWM | 2025-08-20 | trailing stop | +$4,380 | holdout | XRT XBI |
| 2025-08-04 | KRE | 2025-09-08 | trailing stop | +$8,159 | holdout | XBI IWM |
| 2025-10-13 | XRT | open | open | +$1,580 | holdout | XBI |

Months with at least three tickers long at some point: 2018-12 (IWM IWN KRE XBI XLE XLF XLY); 2019-01 (IWM IWN KRE XBI XLE XLF XLY); 2019-02 (IWM IWN XBI XLE XLF XLY); 2019-03 (IWM IWN KRE XBI XLE XLF XLY); 2019-04 (KRE XBI XLE XLF); 2019-05 (IWM KRE XLE XLF); 2019-08 (IWN KRE XLF); 2020-03 (IWM IWN KRE XBI XLE XLF XLY XRT); 2020-04 (IWM IWN KRE XBI XLE XLF XLY XRT); 2020-05 (IWM IWN KRE XBI XLE XLF XRT); 2020-06 (IWM IWN KRE XBI XLE XLF XRT); 2020-07 (IWM IWN KRE XBI XLE XLF XRT); 2020-08 (IWN KRE XLF XRT); 2020-09 (IWM IWN KRE XBI XLF XLY XRT); 2020-10 (IWM IWN KRE XBI XLE XLF XLY XRT); 2020-11 (IWM KRE XBI XLE XLF XLY XRT); 2020-12 (XBI XLF XRT); 2021-01 (IWM XBI XLF XRT); 2021-02 (IWM KRE XBI XLE XLF XRT); 2021-03 (IWM KRE XBI XLF XLY XRT); 2021-04 (IWM XLE XLF XRT); 2021-05 (IWM XBI XLF XRT); 2021-06 (IWM KRE XBI); 2021-07 (IWM IWN KRE XBI XRT); 2021-12 (IWM IWN KRE); 2022-01 (IWN KRE XBI XRT); 2022-02 (KRE XBI XLY XRT); 2022-03 (KRE XBI XLY XRT); 2022-04 (KRE XBI XLY XRT); 2022-05 (IWM IWN XBI XLY XRT); 2022-06 (IWM IWN XBI XLF XLY XRT); 2022-07 (IWM IWN XBI XLE XLF XLY XRT); 2022-08 (IWM IWN XBI XLE XLF XLY XRT); 2022-09 (IWM IWN XBI XLE XLF XLY XRT); 2022-10 (IWM IWN XLE XLF XLY XRT); 2022-11 (IWM IWN XLE XLF XLY XRT); 2022-12 (IWM XLF XRT); 2023-01 (IWM XLF XLY XRT); 2023-02 (IWM XLY XRT); 2023-03 (IWM IWN KRE XLY XRT); 2025-04 (IWM IWN KRE XBI XLY XRT); 2025-08 (IWM KRE XBI XRT).

What the chronology says for the eventual shared-capital question, without simulating it: D1-style signals on these
eight sector ETFs **cluster**. In the development run, 2018-12-17 → 12-31, 2020-03-09 → 04-16 and 2022 saw six to
eight tickers armed or long within days of each other, and in the holdout every traded ticker entered between
2025-04-04 and 2025-04-23. A shared pool would therefore face its demands simultaneously, not opportunistically, and
its capacity rule (which ticker gets the money on 2025-04-04?) would decide most of the outcome. Overlap is not
evidence of executable shared-margin profit; the earlier shared-margin program found a seven-fold spread in results
from the refused-signal semantics alone.
