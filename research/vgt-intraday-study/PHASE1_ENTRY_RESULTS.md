# Phase 1: intraday entry timing, with the incumbent's daily stop unchanged

**Question.** If the strategy may buy during the session instead of only one minute before the close, does it capture profitable intraday opportunities without giving up net profit, minute drawdown, execution realism, or behaviour in selloffs?

**Short answer: no.**

- **Every one of the ten predeclared earlier-entry policies** loses money relative to the incumbent `CLOSE_1M`:
  - −$53,420 to −$101,208 over 2016-10-07 → 2025-10-13 (5 bp/side, `stop` fill);
  - essentially the same under the `next-open` fill and at every cost level.
- Every one of them **breaches the $30,000 minute-drawdown gate** in at least one cost/fill scenario. At the primary 5 bp setting, minute drawdown is $27.6k–$37.2k, against the incumbent's $25.9k.
- The earlier entries do capture intraday dips that reverse before the close, and those trades make money on their own.
- But the policies' main effect is different. On days the incumbent would also have bought, they buy *earlier* and usually *higher*, ahead of further selling. The changed entry also shifts every later stop, restriction and re-entry.
- The result is negative in **most calendar years** and in **0–5 of 29 staggered start dates**. The only exception is the February–April 2020 crash.

Scope and conventions, all fixed in [PROTOCOL.md](PROTOCOL.md):

- **Run:** the warm-start continuous run, 2016-10-07 → 2025-10-13, with 78-session reference highs from 2016-01-04.
- **Accounting:** $100,000 per position, 11% interest, 5 bp per side primary.
- **Fills:** the `stop` fill for intraday stop triggers is primary, with `next-open` as the sensitivity.
- **Exits:** the exit rules are exactly the incumbent's (`STOP_DAILY`).
- **What varies:** only the entry decision.
- **Reading the tables:** Δ always means the variant minus `CLOSE_1M` on the same window, fill and cost. Trade counts include the position open at the end, marked at the close net of interest and an assumed liquidation fee.

## 1. Full variant table (5 bp/side, `stop` fill)

<!-- include: tables/entry_summary_daily.md -->
| Policy | Trades | Win % | Mean trade | Median trade | Worst trade | Gross price P&L | Interest | Fees | Turnover | Net (5 bp) | Δ vs CLOSE_1M | Minute DD | Δ minute DD | Daily DD | Sessions held | Mean days | Same-session exits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | 171 | 66.5% | $1,089 | $890 | −$9,775 | $265,970 | $62,564 | $17,233 | $34.5M | $186,172 | — | $25,914 | — | $21,934 | 1604 | 12.1 | 0 |
| `FIRST_0935` | 203 | 62.4% | $614 | $506 | −$11,542 | $213,560 | $68,562 | $20,407 | $40.8M | $124,592 | −$61,580 | $34,328 | +$8,414 | $31,648 | 1775 | 11.2 | 0 |
| `FIRST_1000` | 204 | 62.6% | $524 | $427 | −$11,567 | $195,281 | $67,838 | $20,498 | $41.0M | $106,945 | −$79,227 | $35,557 | +$9,643 | $33,478 | 1762 | 11.0 | 0 |
| `FIRST_1200` | 189 | 61.9% | $605 | $861 | −$16,307 | $199,617 | $66,271 | $19,000 | $38.0M | $114,346 | −$71,827 | $30,737 | +$4,823 | $28,639 | 1713 | 11.6 | 0 |
| `FIRST_1400` | 199 | 59.8% | $603 | $601 | −$11,334 | $207,376 | $67,296 | $20,004 | $40.0M | $120,076 | −$66,096 | $30,264 | +$4,349 | $27,942 | 1732 | 11.2 | 0 |
| `PERSIST_15` | 194 | 61.3% | $551 | $593 | −$16,984 | $188,375 | $62,022 | $19,494 | $39.0M | $106,859 | −$79,314 | $36,022 | +$10,107 | $33,970 | 1620 | 10.6 | 0 |
| `PERSIST_30` | 170 | 59.8% | $500 | $704 | −$16,621 | $155,505 | $53,463 | $17,078 | $34.2M | $84,964 | −$101,208 | $37,225 | +$11,310 | $35,471 | 1405 | 10.4 | 0 |
| `STABLE_15` | 197 | 62.4% | $674 | $751 | −$16,699 | $218,260 | $65,699 | $19,809 | $39.6M | $132,753 | −$53,420 | $31,272 | +$5,358 | $29,200 | 1706 | 11.1 | 0 |
| `STABLE_30` | 163 | 58.0% | $629 | $577 | −$10,265 | $172,646 | $53,764 | $16,386 | $32.8M | $102,495 | −$83,677 | $27,646 | +$1,731 | $24,966 | 1390 | 10.9 | 0 |
| `REBOUND_03` | 199 | 61.1% | $575 | $559 | −$11,723 | $197,277 | $62,836 | $19,999 | $40.0M | $114,443 | −$71,729 | $30,739 | +$4,825 | $28,767 | 1645 | 10.5 | 0 |
| `REBOUND_05` | 190 | 62.6% | $683 | $652 | −$16,263 | $209,490 | $60,605 | $19,105 | $38.2M | $129,780 | −$56,392 | $34,286 | +$8,371 | $32,316 | 1595 | 10.6 | 0 |
| `BAND_STABILIZE` | 176 | 61.1% | $800 | $534 | −$10,372 | $220,343 | $61,901 | $17,710 | $35.4M | $140,731 | −$45,441 | $25,625 | −$289 | $22,970 | 1594 | 11.7 | 0 |
| `BAND_PERSIST` | 177 | 61.9% | $739 | $829 | −$9,775 | $210,659 | $62,022 | $17,805 | $35.6M | $130,831 | −$55,341 | $27,906 | +$1,992 | $27,113 | 1600 | 11.6 | 0 |
| `BAND_LATE_DEEP` | 173 | 65.7% | $1,027 | $890 | −$9,775 | $259,066 | $63,981 | $17,430 | $34.9M | $177,656 | −$8,517 | $25,914 | $0 | $21,934 | 1636 | 12.3 | 0 |
<!-- /include -->

The conditional policies (`BAND_*`) are Phase 3 policies. They are shown here because they share the run; they are analysed in [PHASE3_CONDITIONAL_POLICIES.md](PHASE3_CONDITIONAL_POLICIES.md).

### Cost and stop-fill sensitivity

<!-- include: tables/entry_sensitivity_daily.md -->
| Policy | Net 0 bp | Net 5 bp | Net 10 bp | Net 20 bp | Δ 5 bp (stop fill) | Net 5 bp next-open | Δ 5 bp next-open | Δ 20 bp next-open | Minute DD stop | Minute DD next-open | Max minute DD any cost/fill | ≥ $30k? |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | $203,405 | $186,172 | $168,939 | $134,473 | — | $185,451 | — | — | $25,914 | $25,914 | $27,078 | no |
| `FIRST_0935` | $144,999 | $124,592 | $104,185 | $63,371 | −$61,580 | $123,751 | −$61,700 | −$71,222 | $34,328 | $34,202 | $47,910 | **yes** |
| `FIRST_1000` | $127,443 | $106,945 | $86,448 | $45,453 | −$79,227 | $106,136 | −$79,315 | −$89,109 | $35,557 | $35,574 | $48,745 | **yes** |
| `FIRST_1200` | $133,345 | $114,346 | $95,346 | $57,346 | −$71,827 | $114,189 | −$71,263 | −$76,564 | $30,737 | $30,949 | $32,706 | **yes** |
| `FIRST_1400` | $140,080 | $120,076 | $100,073 | $60,065 | −$66,096 | $118,748 | −$66,703 | −$75,015 | $30,264 | $30,715 | $32,283 | **yes** |
| `PERSIST_15` | $126,353 | $106,859 | $87,364 | $48,376 | −$79,314 | $106,496 | −$78,955 | −$85,739 | $36,022 | $36,181 | $38,831 | **yes** |
| `PERSIST_30` | $102,042 | $84,964 | $67,887 | $33,731 | −$101,208 | $84,144 | −$101,308 | −$100,842 | $37,225 | $37,413 | $55,251 | **yes** |
| `STABLE_15` | $152,562 | $132,753 | $112,943 | $73,325 | −$53,420 | $132,931 | −$52,520 | −$60,250 | $31,272 | $31,419 | $33,476 | **yes** |
| `STABLE_30` | $118,882 | $102,495 | $86,109 | $53,336 | −$83,677 | $102,015 | −$83,436 | −$80,896 | $27,646 | $27,647 | $37,268 | **yes** |
| `REBOUND_03` | $134,441 | $114,443 | $94,444 | $54,447 | −$71,729 | $114,186 | −$71,266 | −$79,563 | $30,739 | $30,552 | $44,697 | **yes** |
| `REBOUND_05` | $148,885 | $129,780 | $110,675 | $72,466 | −$56,392 | $130,000 | −$55,452 | −$61,068 | $34,286 | $34,433 | $36,785 | **yes** |
| `BAND_STABILIZE` | $158,441 | $140,731 | $123,021 | $87,601 | −$45,441 | $139,824 | −$45,627 | −$47,058 | $25,625 | $25,634 | $28,833 | no |
| `BAND_PERSIST` | $148,637 | $130,831 | $113,026 | $77,415 | −$55,341 | $130,162 | −$55,289 | −$57,007 | $27,906 | $27,890 | $41,363 | **yes** |
| `BAND_LATE_DEEP` | $195,085 | $177,656 | $160,226 | $125,367 | −$8,517 | $176,957 | −$8,494 | −$9,084 | $25,914 | $25,914 | $27,078 | no |
<!-- /include -->

Neither the fill model nor the cost level changes the conclusion:

- **Fill model.** Switching to `next-open` moves no policy's Δ by more than about $1,000. Intraday stop-fill realism is not what separates these policies.
- **Costs.** At 20 bp/side every early-entry policy is $71k–$101k behind. Most of them trade more often (189–204 trades vs 171), so they also pay more fees.

## 2. Missed opportunities and what the earlier entries did with them

**How many opportunities does waiting for the final minute miss?** Take the incumbent's own continuous run.

- **Starting point:** it starts 833 sessions flat.
- **Intraday dips:** in 432 of those sessions some completed minute between 09:35 and the decision closed at least 2.5% below the reference high.
- **Final decision:** in 375 of them, the final decision itself qualified.
- **Missed:** that leaves **57 dip-and-recovery sessions**. These are intraday qualifying moves that had recovered by the 15:58 minute. 56 of them were also unrestricted at the start, and 52 qualified again at or after 10:00.
- **Depth:** all 57 were SHALLOW (2.5–5%) at the first qualifying minute, and 55 stayed SHALLOW at their deepest.
- **Timing:** they are spread over every year, with 1–10 per year.

<!-- include: tables/missed_opportunities.md -->
Sessions flat at the start (CLOSE_1M, daily stop, continuous run): 833
… with a qualifying completed minute in [09:35, close − 1 min]: 432
… with a qualifying final decision (CLOSE_1M's own signal): 375
Dip-and-recovery sessions (intraday qualifying, final decision not): 57 (56 also unrestricted at the start; 52 qualifying again from 10:00)

| Band | by first qualifying minute | by deepest minute |
|---|---:|---:|
| SHALLOW | 57 | 55 |
| MODERATE | 0 | 2 |
| DEEP | 0 | 0 |
| EXTREME | 0 | 0 |

| Year | Dip-and-recovery sessions |
|---|---:|
| 2016 | 2 |
| 2017 | 6 |
| 2018 | 10 |
| 2019 | 2 |
| 2020 | 5 |
| 2021 | 10 |
| 2022 | 1 |
| 2023 | 8 |
| 2024 | 10 |
| 2025 | 3 |
<!-- /include -->

How the earlier entries used them, trade by trade (5 bp):

<!-- include: tables/entry_opportunity_daily.md -->
| Policy | Reversal captures | Their net | Same-opportunity entries | Their net | Mean price improvement vs close fill | Premature + continued selling | Their net | CLOSE_1M trades avoided | Their net (in CLOSE_1M) | Rising-path trades / net | Falling-path trades / net | Setup sessions w/o entry | Sessions with gate-blocked candidates (minutes) | No-fill |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | 0 | $0 | 171 | $186,172 | 0.00% | 0 | $0 | — | — | 85 / $52,422 | 86 / $133,750 | 204 | 203 (203) | 1 |
| `FIRST_0935` | 34 | $21,495 | 169 | $103,097 | -0.05% | 44 | −$151,309 | 83 | $90,119 | 111 / $142,439 | 92 / −$17,848 | 160 | 170 (54705) | 0 |
| `FIRST_1000` | 33 | $23,188 | 171 | $83,758 | -0.08% | 44 | −$149,862 | 83 | $91,116 | 112 / $152,747 | 92 / −$45,801 | 165 | 175 (52359) | 0 |
| `FIRST_1200` | 27 | $29,514 | 162 | $84,832 | -0.18% | 41 | −$141,221 | 70 | $69,798 | 93 / $111,861 | 96 / $2,484 | 205 | 214 (43671) | 0 |
| `FIRST_1400` | 18 | $3,942 | 181 | $116,135 | -0.06% | 37 | −$92,556 | 49 | $51,025 | 105 / $53,799 | 94 / $66,277 | 150 | 155 (16740) | 0 |
| `PERSIST_15` | 24 | $30,279 | 170 | $76,580 | -0.14% | 40 | −$134,478 | 72 | $88,585 | 106 / $133,044 | 88 / −$26,185 | 206 | 183 (20101) | 0 |
| `PERSIST_30` | 13 | $16,978 | 157 | $67,986 | -0.13% | 38 | −$126,112 | 101 | $87,572 | 86 / $81,573 | 84 / $3,391 | 309 | 149 (10504) | 0 |
| `STABLE_15` | 25 | $21,474 | 172 | $111,278 | -0.14% | 43 | −$126,747 | 69 | $67,968 | 108 / $149,454 | 89 / −$16,702 | 181 | 145 (10466) | 0 |
| `STABLE_30` | 13 | $11,610 | 150 | $90,885 | -0.18% | 36 | −$92,901 | 100 | $95,481 | 83 / $64,358 | 80 / $38,137 | 338 | 133 (6671) | 0 |
| `REBOUND_03` | 25 | $25,816 | 174 | $88,627 | 0.01% | 41 | −$140,003 | 79 | $105,754 | 111 / $133,910 | 88 / −$19,468 | 191 | 172 (35559) | 0 |
| `REBOUND_05` | 20 | $28,102 | 170 | $101,678 | -0.05% | 36 | −$123,004 | 74 | $116,238 | 109 / $135,718 | 81 / −$5,937 | 203 | 152 (24960) | 0 |
| `BAND_STABILIZE` | 0 | $0 | 176 | $140,731 | -0.06% | 25 | −$70,806 | 46 | $76,074 | 92 / $88,416 | 84 / $52,315 | 264 | 142 (7522) | 0 |
| `BAND_PERSIST` | 0 | $0 | 177 | $130,831 | -0.14% | 29 | −$99,524 | 39 | $71,309 | 85 / $104,368 | 92 / $26,463 | 263 | 175 (12702) | 0 |
| `BAND_LATE_DEEP` | 0 | $0 | 173 | $177,656 | 0.08% | 12 | −$29,149 | 18 | $46,048 | 91 / $84,671 | 82 / $92,985 | 243 | 185 (4327) | 0 |
<!-- /include -->

Definitions:

- **Reversal captures** are entries on sessions whose final decision did *not* qualify: the intraday dip had reversed by the close.
- **Same-opportunity entries** are on sessions where the incumbent's final decision also qualified. Their price improvement is (close-rule fill − entry) / close-rule fill, on the same session. Positive means the earlier entry was cheaper.
- **Premature + continued selling** counts same-opportunity entries that paid *more* than that session's close-rule fill and then lost money.
- **Rising/falling path** means the session closed above/below the fill.

What the table shows:

- **Reversal captures are real and profitable as trades.** There are 13–34 of them per policy, with +$3,942 to +$30,279 of trade-level net. Every unconditional policy satisfies the protocol's *opportunity* criterion O.
- **Same-opportunity entries buy at about the close price on average** (mean improvement −0.18% to +0.01%). But they include **36–44 premature entries per policy that lost $92,556 to $151,309 in total**: bought hours before more selling, then stopped or held out at a loss. The incumbent buys these same declines a few hours later at a lower price. Its same-opportunity trades net $186,172.
- **Falling-path entries carry the damage.** For example, `FIRST_1000`'s 92 falling-path trades net −$45,801.
- **Trade-level sums do not explain the path difference by themselves.** Changing one entry moves later stops, restriction states and re-entries. Section 3 measures the full-path effect instead.

## 3. Full-path attribution (divergence episodes)

Each divergence episode starts at the first session where the variant and the incumbent act differently. It ends when the two end a session in identical state with equal equity changes. The sum of episode contributions equals Δnet exactly; the residual is below $2×10⁻¹⁰.

Each episode is typed by what happened on its first session. Each cell gives the number of episodes and their total contribution (5 bp, `stop` fill).

<!-- include: tables/entry_attribution_daily.md -->
| Policy | Δ net | Episodes | VARIANT_ENTRY_REVERSAL (n / $) | VARIANT_ENTRY_OTHER (n / $) | BOTH_ENTER_EARLIER_LOWER (n / $) | BOTH_ENTER_EARLIER_HIGHER (n / $) | REFERENCE_ENTRY_ONLY (n / $) | EXIT_DIFFERENCE (n / $) | OTHER (n / $) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `FIRST_0935` | −$61,580 | 37 | 10 / −$15,596 | 5 / +$12,927 | 5 / −$13,192 | 17 / −$45,719 | – | – | – |
| `FIRST_1000` | −$79,227 | 38 | 12 / −$12,046 | 4 / +$13,654 | 5 / −$322 | 17 / −$80,514 | – | – | – |
| `FIRST_1200` | −$71,827 | 44 | 13 / +$1,143 | 3 / +$4,277 | 10 / −$39,846 | 18 / −$37,400 | – | – | – |
| `FIRST_1400` | −$66,096 | 51 | 10 / −$6,515 | 5 / +$18,891 | 15 / −$23,538 | 21 / −$54,934 | – | – | – |
| `PERSIST_15` | −$79,314 | 43 | 9 / −$2,340 | 5 / +$11,660 | 8 / −$26,570 | 19 / −$33,345 | 2 / −$28,719 | – | – |
| `PERSIST_30` | −$101,208 | 41 | 3 / −$18,353 | 1 / +$21,440 | 7 / −$24,415 | 18 / −$37,081 | 12 / −$42,800 | – | – |
| `STABLE_15` | −$53,420 | 44 | 9 / −$188 | 1 / +$2,678 | 8 / −$25,699 | 23 / −$28,046 | 3 / −$2,165 | – | – |
| `STABLE_30` | −$83,677 | 44 | 3 / −$8,315 | 1 / +$7,680 | 8 / −$23,601 | 15 / −$14,202 | 17 / −$45,237 | – | – |
| `REBOUND_03` | −$71,729 | 41 | 6 / −$7,616 | 3 / −$4,469 | 12 / −$20,280 | 15 / −$17,041 | 5 / −$22,323 | – | – |
| `REBOUND_05` | −$56,392 | 45 | 5 / −$6,070 | 1 / −$6,355 | 15 / −$62,918 | 15 / +$17,860 | 9 / +$1,091 | – | – |
| `BAND_STABILIZE` | −$45,441 | 30 | – | 4 / −$21,402 | 10 / −$7,308 | 12 / −$5,699 | 4 / −$11,032 | – | – |
| `BAND_PERSIST` | −$55,341 | 31 | – | 5 / −$10,260 | 9 / −$2,918 | 16 / −$27,620 | 1 / −$14,543 | – | – |
| `BAND_LATE_DEEP` | −$8,517 | 24 | – | – | 12 / −$2,755 | 10 / −$5,641 | 2 / −$121 | – | – |
<!-- /include -->

- **The largest losses come from buying earlier at a higher price than the close-rule fill on days the incumbent would also have bought** (`BOTH_ENTER_EARLIER_HIGHER`). This costs −$14k to −$81k for nine of the ten unconditional policies.
  - `REBOUND_05` is the exception, at +$17.9k. Its losses sit instead in the episodes where it bought earlier at a *lower* price (−$62.9k).
  - This is the "intraday entry before further deep declines" effect the brief asks about. It occurs in 15–23 episodes per policy.
  - Example: on 2022-04-22 `FIRST_1000` bought at 10:00 at 381.73, against a close-rule fill of 372.67. On 2022-06-06 it bought at 365.64, against 360.21, and the 8-day loss exit sold at 324.71 for −$11,530.
  - Over 2022 that episode chain alone cost −$21,272. See [DIVERGENCE_ANALYSIS.md](DIVERGENCE_ANALYSIS.md).
- **Buying earlier at a *lower* price does not reliably help either** (`BOTH_ENTER_EARLIER_LOWER`, −$0.3k to −$63k). A different entry day starts a different stop and hold clock. The lower fill can be followed by an earlier stop-out or a maximum-hold sale that the incumbent's entry avoided.
- **Reversal captures add little or lose once the full path is counted** (`VARIANT_ENTRY_REVERSAL`, −$18.4k to +$1.1k). A captured rebound occupies the single position slot and moves the next stop and restriction states. That displaces later close-time entries the incumbent made instead.
- **The confirmation rules** (`PERSIST_30`, `STABLE_30`, `REBOUND_*`) also skip some sessions the incumbent buys (`REFERENCE_ENTRY_ONLY`, up to 17 episodes and −$45k for `STABLE_30`). Waiting for confirmation that never arrives forfeits close-time trades that would have worked.

## 4. Years, regimes and windows

Year-end changes in marked equity, given as Δ versus the incumbent (the incumbent's own row is its level):

<!-- include: tables/entry_years_daily.md -->
| Policy | 2016 (Q4) | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 (to 10-13) | Years + | Best year | Δ ex best year |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` (level) | $3,756 | $11,738 | $14,786 | $36,961 | $33,225 | $17,325 | $13,499 | $7,829 | $28,584 | $18,469 |  |  |  |
| `FIRST_0935` (Δ) | −$1,038 | −$8,611 | −$11,868 | −$10,944 | +$12,215 | −$9,328 | −$38,104 | +$1,014 | −$2,235 | +$7,318 | 3/10 | 2020 | −$73,796 |
| `FIRST_1000` (Δ) | −$461 | −$8,198 | −$16,191 | −$10,173 | +$4,247 | −$12,409 | −$37,381 | +$531 | −$1,502 | +$2,310 | 3/10 | 2020 | −$83,474 |
| `FIRST_1200` (Δ) | −$899 | −$2,802 | −$21,423 | −$6,494 | −$11,857 | −$7,790 | −$6,456 | +$7,093 | −$1,540 | −$19,659 | 1/10 | 2023 | −$78,920 |
| `FIRST_1400` (Δ) | −$1,371 | −$7,133 | −$15,875 | −$7,631 | +$4,752 | −$16,580 | −$10,953 | +$8,277 | −$7,109 | −$12,472 | 2/10 | 2023 | −$74,373 |
| `PERSIST_15` (Δ) | +$247 | −$1,689 | −$31,984 | −$1,536 | +$10,798 | −$14,570 | −$14,394 | −$919 | −$1,523 | −$23,744 | 2/10 | 2020 | −$90,111 |
| `PERSIST_30` (Δ) | +$198 | −$8,983 | −$26,964 | −$12,971 | +$6,015 | −$16,719 | −$39,024 | +$4,219 | +$14,762 | −$21,741 | 4/10 | 2024 | −$115,970 |
| `STABLE_15` (Δ) | +$309 | −$2,459 | −$16,280 | +$418 | +$8,244 | −$10,959 | −$14,021 | −$412 | −$4,332 | −$13,928 | 3/10 | 2020 | −$61,664 |
| `STABLE_30` (Δ) | −$279 | −$9,829 | −$21,014 | −$12,124 | +$328 | −$637 | −$26,283 | −$4,267 | +$8,519 | −$18,092 | 2/10 | 2024 | −$92,195 |
| `REBOUND_03` (Δ) | −$208 | −$7,003 | −$32,505 | −$3,707 | +$17,440 | −$11,939 | −$34,736 | +$156 | +$1,060 | −$289 | 3/10 | 2020 | −$89,170 |
| `REBOUND_05` (Δ) | +$83 | −$10,149 | −$21,965 | −$3,554 | +$20,418 | −$3,948 | −$15,744 | −$5,420 | +$6,034 | −$22,148 | 3/10 | 2020 | −$76,810 |
| `BAND_STABILIZE` (Δ) | $0 | +$511 | −$7,337 | −$12,922 | +$6,036 | −$879 | −$27,659 | +$8,432 | −$9 | −$11,614 | 3/10 | 2023 | −$53,873 |
| `BAND_PERSIST` (Δ) | $0 | +$368 | −$17,475 | −$174 | +$8,851 | −$8,706 | −$32,659 | +$6,454 | −$2,392 | −$9,609 | 3/10 | 2020 | −$64,192 |
| `BAND_LATE_DEEP` (Δ) | $0 | +$511 | −$5,128 | +$1,166 | −$9,049 | −$879 | +$848 | +$3,345 | −$3,310 | +$3,981 | 5/10 | 2025 | −$12,497 |
<!-- /include -->

Difficult regimes (sum of daily equity changes inside each window) and two objective labels. The labels use information through the previous close and are used for analysis only:

- **DD15:** the previous close is ≥ 15% below the 252-session max close.
- **HIVOL:** 20-day realized volatility is ≥ 30%.

<!-- include: tables/entry_regimes_daily.md -->
| Policy | Q4_2018 | COVID_2020 | Y2022 | SPRING_2025 | DD15 | HIVOL |
|---|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` (level) | −$10,156 | −$7,646 | $13,499 | −$619 | $53,906 | $36,950 |
| `FIRST_0935` (Δ) | −$3,411 | +$13,638 | −$38,104 | +$6,644 | −$6,590 | −$4,255 |
| `FIRST_1000` (Δ) | −$3,513 | +$10,864 | −$37,381 | +$1,654 | −$12,772 | −$21,099 |
| `FIRST_1200` (Δ) | −$11,956 | −$3,625 | −$6,456 | −$20,672 | −$30,130 | −$55,108 |
| `FIRST_1400` (Δ) | −$8,242 | +$10,565 | −$10,953 | −$12,336 | −$7,815 | −$30,587 |
| `PERSIST_15` (Δ) | −$12,087 | +$17,001 | −$14,394 | −$26,350 | −$23,751 | −$41,938 |
| `PERSIST_30` (Δ) | −$11,272 | +$18,125 | −$39,024 | −$23,366 | −$48,948 | −$57,153 |
| `STABLE_15` (Δ) | −$4,558 | +$16,462 | −$14,021 | −$21,119 | −$6,634 | −$29,226 |
| `STABLE_30` (Δ) | −$4,982 | +$16,017 | −$26,283 | −$16,469 | −$33,118 | −$30,667 |
| `REBOUND_03` (Δ) | −$15,318 | +$19,819 | −$34,736 | −$269 | −$10,710 | −$26,769 |
| `REBOUND_05` (Δ) | −$2,682 | +$19,811 | −$15,744 | −$24,419 | −$231 | −$17,426 |
| `BAND_STABILIZE` (Δ) | −$2,503 | +$16,524 | −$27,659 | −$14,339 | −$17,000 | −$31,765 |
| `BAND_PERSIST` (Δ) | −$11,063 | +$16,951 | −$32,659 | −$13,934 | −$30,954 | −$36,099 |
| `BAND_LATE_DEEP` (Δ) | −$294 | $0 | +$848 | $0 | +$4,656 | −$833 |
<!-- /include -->

<!-- include: tables/entry_windows_daily.md -->
| Policy | Dev 2016-10-07→2023-12-29 net | Dev Δ | Dev minute DD | 2024–25 on continuous run: net | Δ | 2024–25 flat start: net | Δ | Flat-start minute DD | Flat-start trades |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | $139,119 | — | $19,661 | $47,053 | — | $47,053 | — | $25,914 | 33 |
| `FIRST_0935` | $72,455 | −$66,664 | $34,328 | $52,137 | +$5,084 | $52,137 | +$5,084 | $25,848 | 43 |
| `FIRST_1000` | $59,084 | −$80,035 | $35,557 | $47,862 | +$808 | $47,862 | +$808 | $25,571 | 42 |
| `FIRST_1200` | $88,491 | −$50,627 | $26,985 | $25,854 | −$21,199 | $25,854 | −$21,199 | $30,737 | 37 |
| `FIRST_1400` | $92,604 | −$46,515 | $30,264 | $27,472 | −$19,581 | $27,472 | −$19,581 | $30,155 | 38 |
| `PERSIST_15` | $85,072 | −$54,046 | $26,078 | $21,786 | −$25,267 | $21,786 | −$25,267 | $36,022 | 36 |
| `PERSIST_30` | $44,890 | −$94,229 | $37,225 | $40,075 | −$6,979 | $40,075 | −$6,979 | $33,866 | 31 |
| `STABLE_15` | $103,959 | −$35,160 | $22,216 | $28,794 | −$18,260 | $28,794 | −$18,260 | $31,272 | 33 |
| `STABLE_30` | $65,015 | −$74,104 | $24,382 | $37,480 | −$9,573 | $37,480 | −$9,573 | $27,646 | 29 |
| `REBOUND_03` | $66,618 | −$72,501 | $30,739 | $47,825 | +$772 | $47,825 | +$772 | $27,143 | 42 |
| `REBOUND_05` | $98,841 | −$40,278 | $24,424 | $30,940 | −$16,114 | $30,940 | −$16,114 | $34,286 | 36 |
| `BAND_STABILIZE` | $105,300 | −$33,819 | $23,138 | $35,431 | −$11,622 | $35,431 | −$11,622 | $25,625 | 33 |
| `BAND_PERSIST` | $95,779 | −$43,340 | $27,906 | $35,053 | −$12,001 | $35,053 | −$12,001 | $25,221 | 33 |
| `BAND_LATE_DEEP` | $129,932 | −$9,187 | $19,030 | $47,724 | +$670 | $47,724 | +$670 | $25,914 | 33 |
<!-- /include -->

- **Positive years are rare.** No unconditional policy is positive in more than 4 of the 10 calendar years (2016 and 2025 are partial).
- **2020 is the exception.** The **February–April 2020 crash** is the only difficult regime in which earlier entry helps. Nine of the ten unconditional policies gain +$10.6k to +$19.8k there; `FIRST_1200` is the exception at −$3.6k.
- **The other difficult regimes go the other way.** Earlier entries lose in Q4 2018, in 2022 (−$6k to −$39k) and, for most policies, in spring 2025.
- **The 2024–25 segment is not a clean test.** It was inspected repeatedly in earlier studies and is not out-of-sample. On it, `FIRST_0935` (+$5,084), `FIRST_1000` (+$808) and `REBOUND_03` (+$772) are slightly ahead; the rest are behind.
- **The flat-start and continuous figures for 2024–25 are identical** for every policy, because every policy was flat and unrestricted on 2024-01-02. Nothing was selected from this segment.

## 5. Concentration and robustness

The ensemble columns come from 29 staggered flat starts, one at the first session of every quarter from 2016-10-07 to 2023-10-02, all ending 2025-10-13. The starts share their later history, so they are not independent samples. They show how much a result depends on the starting state.

<!-- include: tables/entry_robustness_daily.md -->
| Policy | Δ net | First divergence | Largest + episode | Largest − episode | Δ ex largest + episode | Δ ex best year | Net ex best trade | Ensemble median Δ (stop) | Starts Δ>0 | Ensemble range | Ensemble median Δ (next-open) | Starts Δ>0 (next-open) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `FIRST_0935` | −$61,580 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-06 +$18,611 | 2022-04-14 −$21,007 | −$80,192 | −$73,796 | $114,711 | −$33,711 | 5/29 | −$61,580 … +$9,879 | −$33,904 | 5/29 |
| `FIRST_1000` | −$79,227 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-06 +$14,934 | 2022-04-14 −$21,272 | −$94,161 | −$83,474 | $96,455 | −$48,451 | 5/29 | −$79,227 … +$5,051 | −$49,149 | 4/29 |
| `FIRST_1200` | −$71,827 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2024-01-02 +$5,363 | 2025-01-29 −$20,688 | −$77,189 | −$78,920 | $104,534 | −$40,206 | 0/29 | −$74,924 … −$10,708 | −$39,673 | 0/29 |
| `FIRST_1400` | −$66,096 | 2016-11-01 (VARIANT_ENTRY_REVERSAL) | 2020-03-18 +$30,096 | 2021-01-27 −$18,527 | −$96,192 | −$74,373 | $110,105 | −$37,043 | 0/29 | −$66,096 … −$8,951 | −$37,777 | 0/29 |
| `PERSIST_15` | −$79,314 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-06 +$19,585 | 2024-12-10 −$26,647 | −$98,898 | −$90,111 | $96,478 | −$44,349 | 0/29 | −$85,061 … −$20,225 | −$43,874 | 0/29 |
| `PERSIST_30` | −$101,208 | 2016-11-02 (BOTH_ENTER_EARLIER_HIGHER) | 2020-03-06 +$21,440 | 2022-08-22 −$23,471 | −$122,647 | −$115,970 | $73,453 | −$58,503 | 2/29 | −$101,406 … +$4,020 | −$58,817 | 2/29 |
| `STABLE_15` | −$53,420 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-09 +$20,284 | 2021-01-27 −$17,432 | −$73,704 | −$61,664 | $121,933 | −$35,898 | 0/29 | −$59,454 … −$13,516 | −$35,016 | 0/29 |
| `STABLE_30` | −$83,677 | 2016-11-02 (BOTH_ENTER_EARLIER_HIGHER) | 2020-03-09 +$20,109 | 2022-08-22 −$19,083 | −$103,786 | −$92,195 | $89,463 | −$44,577 | 1/29 | −$83,677 … +$555 | −$44,330 | 1/29 |
| `REBOUND_03` | −$71,729 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-09 +$23,465 | 2022-04-14 −$19,889 | −$95,194 | −$89,170 | $103,098 | −$30,300 | 4/29 | −$71,729 … +$5,106 | −$30,010 | 4/29 |
| `REBOUND_05` | −$56,392 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-09 +$28,465 | 2025-01-29 −$24,245 | −$84,857 | −$76,810 | $118,839 | −$27,043 | 0/29 | −$56,475 … −$15,761 | −$26,169 | 0/29 |
| `BAND_STABILIZE` | −$45,441 | 2017-06-29 (BOTH_ENTER_EARLIER_LOWER) | 2020-03-09 +$21,167 | 2022-05-20 −$17,468 | −$66,608 | −$53,873 | $127,698 | −$31,729 | 0/29 | −$50,242 … −$681 | −$32,269 | 0/29 |
| `BAND_PERSIST` | −$55,341 | 2017-06-29 (BOTH_ENTER_EARLIER_LOWER) | 2020-03-09 +$20,901 | 2022-04-14 −$14,543 | −$76,242 | −$64,192 | $117,331 | −$43,512 | 0/29 | −$62,609 … −$849 | −$43,285 | 0/29 |
| `BAND_LATE_DEEP` | −$8,517 | 2017-06-29 (BOTH_ENTER_EARLIER_LOWER) | 2025-05-22 +$3,981 | 2020-09-04 −$10,774 | −$12,497 | −$12,497 | $166,381 | −$3,899 | 12/29 | −$9,391 … +$6,950 | −$3,927 | 12/29 |
<!-- /include -->

- **Removing a large gain makes things worse.** Removing each policy's largest positive episode worsens Δ to −$74k to −$123k. That episode is in March 2020 for nine of the ten unconditional rules; `FIRST_1200`'s is 2024-01-02. Removing the best calendar year gives −$62k to −$116k.
- **Leave-one-out views.** "Net ex best trade" is the descriptive leave-out of the best single trade. These leave-outs are not new strategy simulations: removing a trade from a path-dependent sequence is not a strategy that could have been run.
- **The ensemble agrees.** The median Δ across the 29 starts is −$27k to −$59k. At most 5 of 29 starts are positive (`FIRST_0935`, `FIRST_1000`); five policies have 0 of 29.

## 6. Phase 1 conclusion (predeclared categories, [PROTOCOL.md](PROTOCOL.md) §10)

All ten unconditional early-entry policies are **"argues against further optimization"** under the daily stop:

- **Opportunity (O): yes.** Real reversal captures with positive trade-level P&L.
- **Economic benefit (E): no.** Δnet −$53k to −$101k under both fills, and minute DD worse by $1.7k–$11.3k.
- **Repeatability (Rp): no.** At most 4 of 10 years are positive, and the ensemble medians are negative.

They also breach the materiality thresholds. Δnet is far below +$5,000, and minute DD is worse by more than $5,000 for `FIRST_0935`, `FIRST_1000`, `PERSIST_15`, `PERSIST_30`, `STABLE_15` and `REBOUND_05`. Every unconditional policy breaches $30,000 minute DD in at least one cost/fill scenario. See [tables/classification.md](tables/classification.md).

Interpretation, kept separate from the predeclared verdict: within this strategy, *waiting until the close is itself the filter that works*.

- A 2.5% intraday dip that recovers by the close is a modest, real opportunity: 57 sessions, all shallow.
- A 2.5% dip that is still there at the close is usually bought more cheaply at the close than at its first intraday touch.
- Committing earlier swaps that price advantage for exposure to the rest of the session's decline.
