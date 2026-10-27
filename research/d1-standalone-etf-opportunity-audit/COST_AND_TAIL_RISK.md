# Costs, financing and tail risk (Stage C3)

**Evidence tier: T-train (2016-01-04 → 2023-12-29).** Fixed $100,000 non-compounding slot, one ETF at a time. Every
scenario is **re-simulated** (D1's net-profit stop and its continuation window — opened only after a profitable exit —
change with cost), never recosted. The 19 scenarios are the completed audits' definitions: base 11%/5 bps; r08/r14/r18
(financing); f00–f45 (per-side friction; f15 = 5 fee + 10 slippage, f30/f45 add 25 slippage); s10–s100 (stop
overshoot); nxo (stops fill at the next trade after the trigger minute); C1 (14%, 10 + 10 bps), C2 (18%, 20 + 25), C3
(C2 + 50 bps overshoot). Machine-readable: `results/tables/costs.csv`. Net = gross − interest − friction per lot
(checked for every base lot: largest error below one cent).

## Fixed net under the cost scenarios

| Phenotype | base | f00 | f10 | f20 | f45 | r14 | r18 | s50 | s100 | nxo | C1 | C2 | C3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT primary (control) | $135,359 | $137,223 | $133,497 | $129,778 | $82,463 | $127,822 | $84,228 | $128,505 | $121,651 | $136,199 | $85,731 | $68,996 | $64,957 |
| VGT research rep. (procedure-matched control) | $125,218 | $127,075 | $123,364 | $119,661 | $110,435 | $117,016 | $106,079 | $119,966 | $114,714 | $124,895 | $111,458 | $74,440 | $69,844 |
| XME:representative | $216,940 | $179,789 | $214,705 | $210,241 | $42,587 | $211,704 | $51,235 | $207,646 | $198,352 | $214,452 | $49,336 | $39,653 | $35,795 |
| XME:alternative-1 | $133,319 | $139,675 | $127,071 | $114,798 | $77,560 | $128,208 | $115,632 | $107,252 | $82,427 | $130,896 | $103,485 | $66,841 | $40,483 |
| GDX:representative | $185,534 | $190,955 | $172,513 | $172,324 | $138,528 | $171,078 | $169,513 | $173,700 | $161,866 | $185,910 | $166,064 | $123,815 | $112,594 |
| GDX:alternative-1 | $172,184 | $175,520 | $160,094 | $159,115 | $135,505 | $159,231 | $159,972 | $162,044 | $151,905 | $172,149 | $153,320 | $124,223 | $115,178 |
| KBE:representative | $137,138 | $144,199 | $130,280 | $116,243 | $75,767 | $131,681 | $124,668 | $118,941 | $100,743 | $136,727 | $110,794 | $55,670 | $40,844 |
| KBE:alternative-1 | $123,681 | $123,056 | $107,457 | $97,205 | $75,317 | $106,842 | $103,623 | $106,438 | $89,196 | $121,674 | $95,984 | $63,591 | $48,025 |
| SLV:representative | $103,793 | $87,777 | $101,178 | $96,093 | $80,923 | $100,666 | $56,330 | $89,463 | $75,067 | $103,615 | $93,055 | $39,379 | $32,106 |
| FXI:representative | $89,172 | $90,072 | $88,273 | $86,477 | $82,004 | $86,344 | $82,575 | $85,668 | $82,165 | $89,021 | $83,650 | $75,407 | $71,931 |
| FXI:alternative-1 | $86,277 | $87,277 | $85,278 | $83,284 | $78,315 | $82,718 | $77,973 | $82,740 | $79,204 | $86,343 | $79,725 | $70,010 | $66,502 |
| IJH:representative | $87,166 | $89,668 | $84,667 | $79,676 | $56,676 | $83,525 | $79,009 | $63,543 | $54,621 | $86,885 | $76,686 | $52,025 | $43,174 |
| IJH:alternative-1 | $79,382 | $84,083 | $69,453 | $60,504 | $36,539 | $68,999 | $64,117 | $66,247 | $53,113 | $79,161 | $57,840 | $20,894 | $8,866 |
| XLB:representative | $84,008 | $85,333 | $84,293 | $75,624 | $65,451 | $75,952 | $73,597 | $75,031 | $66,055 | $83,996 | $71,645 | $45,250 | $28,221 |
| MTUM:representative | $69,881 | $71,565 | $68,198 | $64,836 | $56,462 | $66,034 | $60,905 | $61,961 | $54,041 | $69,530 | $60,990 | $47,487 | $39,630 |
| MTUM:alternative-1 | $62,298 | $47,897 | $57,559 | $37,725 | $24,841 | $38,856 | $20,823 | $54,326 | $46,353 | $62,004 | $30,475 | $16,309 | $10,529 |
| XHB:representative | $134,145 | $136,310 | $131,982 | $127,662 | $115,731 | $124,544 | $105,222 | $125,777 | $117,410 | $134,275 | $118,304 | $77,351 | $71,274 |
| EWW:representative | $104,277 | $108,205 | $100,353 | $92,517 | $65,469 | $98,367 | $90,488 | $87,592 | $70,907 | $105,407 | $86,607 | $53,551 | $37,018 |
| EWW:alternative-1 | $94,311 | $98,524 | $90,102 | $82,069 | $57,969 | $90,106 | $84,002 | $75,191 | $56,071 | $93,718 | $77,491 | $47,268 | $29,315 |
| EDV:representative | $62,727 | $63,801 | $61,655 | $59,514 | $54,180 | $60,007 | $56,379 | $59,486 | $56,244 | $65,212 | $56,794 | $49,567 | $46,351 |
| EDV:alternative-1 | $55,381 | $57,448 | $53,312 | $49,188 | $39,549 | $53,200 | $49,496 | $49,600 | $43,819 | $55,409 | $47,011 | $34,976 | $29,738 |
| B4 (pool) | $242,196 | $249,174 | $233,867 | $194,785 | $129,273 | $231,157 | $171,878 | $198,357 | $175,669 | $243,151 | $156,364 | $110,992 | $81,396 |
| B5 (pool) | $388,489 | $396,715 | $379,867 | $335,102 | $265,467 | $378,182 | $325,206 | $346,101 | $317,276 | $390,199 | $296,262 | $246,229 | $209,934 |

## Path changes

"lots changed" counts base lots that disappear plus new lots that appear (same entry, exit and reason) — the cost
changes the trade path, not only the net.

| Phenotype | lots changed vs base: f10 / f20 / C1 / C3 | min. DD at C1 | C1 ÷ base | port. over C0 at C1 |
| --- | ---: | ---: | ---: | ---: |
| VGT primary (control) | 0 / 0 / 4 / 13 | $18,206 | 0.63 | $148,193 |
| VGT research rep. (procedure-matched control) | 0 / 0 / 0 / 2 | $23,339 | 0.89 | $201,582 |
| XME:representative | 0 / 0 / 12 / 14 | $21,837 | 0.23 | $94,272 |
| XME:alternative-1 | 0 / 0 / 9 / 13 | $24,713 | 0.78 | $219,116 |
| GDX:representative | 4 / 7 / 7 / 21 | $29,433 | 0.90 | $392,038 |
| GDX:alternative-1 | 4 / 3 / 5 / 19 | $32,614 | 0.89 | $361,147 |
| KBE:representative | 0 / 2 / 2 / 19 | $27,995 | 0.81 | $221,442 |
| KBE:alternative-1 | 6 / 6 / 12 / 16 | $32,919 | 0.78 | $178,124 |
| SLV:representative | 0 / 0 / 0 / 18 | $18,516 | 0.90 | $209,410 |
| FXI:representative | 0 / 0 / 0 / 0 | $17,080 | 0.94 | $170,374 |
| FXI:alternative-1 | 0 / 0 / 0 / 0 | $19,641 | 0.92 | $159,987 |
| IJH:representative | 0 / 0 / 1 / 6 | $17,597 | 0.88 | $161,881 |
| IJH:alternative-1 | 12 / 22 / 26 / 36 | $22,478 | 0.73 | $100,163 |
| XLB:representative | 4 / 7 / 5 / 9 | $11,949 | 0.85 | $155,952 |
| MTUM:representative | 0 / 0 / 0 / 0 | $17,942 | 0.87 | $125,804 |
| MTUM:alternative-1 | 2 / 6 / 7 / 7 | $19,138 | 0.49 | $54,121 |
| XHB:representative | 0 / 0 / 2 / 8 | $24,322 | 0.88 | $253,639 |
| EWW:representative | 0 / 0 / 0 / 13 | $23,701 | 0.83 | $189,094 |
| EWW:alternative-1 | 0 / 2 / 2 / 5 | $23,184 | 0.82 | $168,577 |
| EDV:representative | 0 / 0 / 0 / 2 | $12,044 | 0.91 | $121,291 |
| EDV:alternative-1 | 2 / 2 / 4 / 8 | $15,907 | 0.85 | $99,174 |

## Trades, tails and concentration (base; concentration is an annotation, never a gate)

| Phenotype | wins / losses | avg win / avg loss | profit factor | best / worst lot | worst MAE (P10) | top-1 / 3 / 5 share | net − top 1 / 3 / 5 (attribution) | exposure | longest underwater | exit reasons |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| VGT primary (control) | 13 / 4 | $11,120 / −$2,299 | 15.72 | $51,264 / −$3,544 | -10.8% (-4.6%) | 38% / 66% / 84% | $84,095 / $46,256 / $22,269 | 38% | 270 sessions (2022-12-01 → 2023-12-29 (open)) | trailing stop 10 ($123,617); trailing stop gap 2 ($20,902); maximum hold 5 (−$9,160) |
| VGT research rep. (procedure-matched control) | 10 / 7 | $13,989 / −$2,096 | 9.54 | $46,991 / −$4,617 | -11.7% (-5.0%) | 38% / 74% / 96% | $78,227 / $32,566 / $4,822 | 42% | 358 sessions (2021-08-30 → 2023-02-02) | trailing stop 9 ($124,183); maximum hold 7 (−$14,670); open 1 ($15,704) |
| XME:representative | 16 / 4 | $15,012 / −$5,814 | 10.33 | $46,781 / −$14,776 | -20.9% (-6.5%) | 22% / 47% / 63% | $170,159 / $114,468 / $79,285 | 27% | 338 sessions (2022-08-25 → 2023-12-29 (open)) | maximum hold 4 (−$23,256); trailing stop 14 ($220,908); trailing stop gap 2 ($19,287) |
| XME:alternative-1 | 48 / 14 | $4,187 / −$4,834 | 2.97 | $12,011 / −$18,336 | -20.1% (-7.2%) | 9% / 24% / 38% | $121,308 / $101,790 / $83,265 | 27% | 167 sessions (2021-09-27 → 2022-05-26) | trailing stop gap 9 ($27,795); buffered intraday loss 2 (−$832); maximum hold 10 (−$64,356); trailing stop 41 ($170,712) |
| GDX:representative | 22 / 32 | $11,167 / −$1,880 | 4.08 | $36,676 / −$6,574 | -7.2% (-4.4%) | 20% / 47% / 70% | $148,858 / $98,435 / $56,287 | 37% | 275 sessions (2017-09-07 → 2018-10-11) | maximum hold 29 (−$50,816); trailing stop 16 ($173,391); trailing stop gap 5 ($72,096); buffered intraday loss 4 (−$9,137) |
| GDX:alternative-1 | 20 / 25 | $10,604 / −$1,596 | 5.32 | $36,676 / −$6,960 | -7.2% (-4.0%) | 21% / 51% / 72% | $135,508 / $85,085 / $47,941 | 29% | 268 sessions (2019-02-20 → 2020-03-16) | maximum hold 19 (−$33,059); trailing stop 13 ($139,373); trailing stop gap 5 ($72,096); buffered intraday loss 8 (−$6,226) |
| KBE:representative | 32 / 37 | $7,136 / −$2,465 | 2.50 | $19,991 / −$17,568 | -17.3% (-5.2%) | 15% / 40% / 61% | $117,147 / $81,792 / $53,836 | 27% | 297 sessions (2021-03-12 → 2022-05-17) | trailing stop gap 11 ($74,974); maximum hold 34 (−$85,531); trailing stop 23 ($150,397); buffered intraday loss 1 (−$2,702) |
| KBE:alternative-1 | 34 / 22 | $6,861 / −$4,982 | 2.13 | $21,454 / −$24,232 | -26.5% (-10.1%) | 17% / 44% / 68% | $102,227 / $68,687 / $39,552 | 34% | 267 sessions (2019-05-03 → 2020-05-27) | maximum hold 20 (−$106,716); trailing stop 26 ($170,292); trailing stop gap 6 ($62,782); buffered intraday loss 4 (−$2,677) |
| SLV:representative | 21 / 4 | $5,313 / −$1,945 | 14.34 | $22,913 / −$5,194 | -10.3% (-6.2%) | 22% / 49% / 63% | $80,880 / $53,091 / $38,197 | 17% | 282 sessions (2022-11-14 → 2023-12-29 (open)) | trailing stop gap 10 ($26,563); trailing stop 13 ($83,042); maximum hold 1 (−$5,194); buffered intraday loss 1 (−$619) |
| FXI:representative | 6 / 2 | $15,171 / −$926 | 49.13 | $40,292 / −$956 | -5.5% (-2.9%) | 45% / 84% / 101% | $48,880 / $13,878 / −$765 | 15% | 425 sessions (2020-07-08 → 2022-03-16) | trailing stop gap 3 ($75,294); trailing stop 3 ($15,731); maximum hold 2 (−$1,853) |
| FXI:alternative-1 | 6 / 3 | $15,991 / −$3,222 | 9.92 | $36,885 / −$5,284 | -5.4% (-4.9%) | 43% / 84% / 109% | $49,393 / $13,407 / −$8,041 | 18% | 325 sessions (2020-11-27 → 2022-03-16) | trailing stop gap 3 ($72,870); trailing stop 3 ($23,075); maximum hold 3 (−$9,667) |
| IJH:representative | 19 / 5 | $4,960 / −$1,415 | 13.32 | $17,391 / −$3,285 | -12.3% (-5.7%) | 20% / 46% / 67% | $69,776 / $46,919 / $28,539 | 19% | 311 sessions (2022-10-04 → 2023-12-29 (open)) | trailing stop 12 ($49,969); trailing stop gap 9 ($40,897); maximum hold 3 (−$3,700) |
| IJH:alternative-1 | 24 / 22 | $5,554 / −$2,451 | 2.47 | $17,009 / −$7,734 | -10.5% (-5.3%) | 21% / 60% / 84% | $62,373 / $31,722 / $12,438 | 26% | 325 sessions (2020-10-23 → 2022-02-09) | trailing stop 19 ($94,114); maximum hold 20 (−$50,549); trailing stop gap 6 ($19,782); open 1 ($16,035) |
| XLB:representative | 16 / 2 | $5,273 / −$183 | 230.47 | $11,947 / −$358 | -7.6% (-4.8%) | 14% / 40% / 61% | $72,061 / $50,392 / $32,593 | 16% | 390 sessions (2021-03-17 → 2022-10-04) | trailing stop 13 ($53,480); trailing stop gap 4 ($30,885); maximum hold 1 (−$358) |
| MTUM:representative | 15 / 1 | $4,716 / −$856 | 82.60 | $19,207 / −$856 | -12.2% (-6.4%) | 27% / 50% / 65% | $50,674 / $34,841 / $24,605 | 20% | 445 sessions (2020-04-17 → 2022-01-24) | trailing stop 12 ($62,382); trailing stop gap 3 ($8,355); maximum hold 1 (−$856) |
| MTUM:alternative-1 | 14 / 8 | $5,624 / −$2,054 | 4.79 | $17,602 / −$6,221 | -12.2% (-6.6%) | 28% / 57% / 82% | $44,696 / $26,501 / $10,962 | 28% | 441 sessions (2022-03-29 → 2023-12-29 (open)) | trailing stop gap 7 ($37,919); trailing stop 8 ($38,862); maximum hold 7 (−$14,482) |
| XHB:representative | 15 / 5 | $9,842 / −$2,696 | 10.95 | $17,628 / −$4,742 | -15.6% (-9.8%) | 13% / 38% / 61% | $116,517 / $83,734 / $51,773 | 42% | 302 sessions (2021-05-07 → 2022-07-21) | trailing stop 12 ($116,561); trailing stop gap 3 ($31,066); maximum hold 5 (−$13,482) |
| EWW:representative | 28 / 10 | $4,764 / −$2,912 | 4.58 | $17,259 / −$7,025 | -8.9% (-6.8%) | 17% / 43% / 61% | $87,018 / $59,948 / $40,630 | 30% | 389 sessions (2020-12-04 → 2022-06-24) | maximum hold 6 (−$15,939); trailing stop gap 8 ($12,447); trailing stop 24 ($107,769) |
| EWW:alternative-1 | 32 / 9 | $3,985 / −$3,690 | 3.84 | $11,791 / −$11,402 | -11.1% (-6.9%) | 13% / 35% / 55% | $82,520 / $61,463 / $42,649 | 23% | 403 sessions (2020-11-09 → 2022-06-17) | maximum hold 4 (−$15,793); trailing stop 23 ($78,836); trailing stop gap 14 ($31,268) |
| EDV:representative | 7 / 3 | $9,405 / −$1,035 | 21.20 | $22,999 / −$1,150 | -5.2% (-3.6%) | 37% / 82% / 94% | $39,729 / $11,152 / $3,628 | 14% | 576 sessions (2020-08-04 → 2022-11-16) | trailing stop 5 ($39,362); maximum hold 3 (−$3,105); trailing stop gap 1 ($3,472); open 1 ($22,999) |
| EDV:alternative-1 | 10 / 10 | $6,750 / −$1,212 | 5.57 | $17,407 / −$3,792 | -3.6% (-3.5%) | 31% / 80% / 98% | $37,974 / $11,000 / $859 | 14% | 613 sessions (2020-06-11 → 2022-11-16) | trailing stop 6 ($39,550); trailing stop gap 5 ($11,779); maximum hold 8 (−$11,538); open 1 ($15,590) |

"net − top N" is **attribution only**: removing a winner from a path-dependent strategy would change later state, so
it is not a counterfactual backtest.

## Findings

- **XME's fitted net is cost-fragile in a way none of the others is.** Its representative earns $216,940 at 5 bps but
  $179,789 at **0** bps, $42,587 at f45, $51,235 at 18% interest and $49,336 under C1 (23% of base; **F6**), with 12
  lots changed under C1. The cause is path dependence, not cost arithmetic: a small change in one exit's net decides
  whether the continuation window opens, and XME's large 2020–2022 continuation chain depends on it.
- **The same mechanism shows elsewhere at smaller scale:** SLV earns less at 0 bps ($87,777) than at 5 bps ($103,793)
  and falls to $56,330 at 18%; MTUM alt falls to 49% of base under C1 (**F6**); VGT primary to 63% under C1 ($85,731)
  and to $82,463 at f45. XHB's fold-a representative (Stage D) loses its entire 2020–2021 continuation chain at 10 bps
  because one June 2020 exit turns from +$33 to −$68, and XME's fold-b vector gains $15,100 at 5 bps but $57,271 at
  10 bps.
- **The most cost-robust records:** FXI (C1 94% of base, 0 lots changed), GDX (C1 89.5%, C3 $112,594), EDV (C1 90.5%),
  the procedure-matched VGT control (C1 89%), XHB (88%), IJH (88%), EWW (83%, 0 lots changed under C1).
- **Tails.** Worst base lots: KBE alt −$24,232, KBE −$17,568, XME alt −$18,336, XME −$14,776 and EWW alt −$11,402
  raise **F2**; KBE alt's MAE reaches −26.5%. VGT primary's worst lot is −$3,544; EWW's −$7,025; GDX's −$6,574;
  FXI's −$956. **No phenotype's fixed minute drawdown exceeds $35,000 at base or under C1** (the largest: KBE alt
  $31,953 base, $32,919 under C1); KBE alt's F3 comes from its portfolio max daily DD (35.5%).
- **Concentration (annotation).** Top-3 share ranges from 24% (XME alt) to 84–85% (FXI's two phenotypes) and
  80–82% (EDV's); VGT primary 66%. D1 is designed for this; it is reported, never used. FXI's eight lots and EDV's ten are thin evidence regardless.
- **Underwater spells** of the fixed mark last 167–613 sessions; several end "open" at 2023-12-29 (VGT primary since
  2022-12-01, XME since 2022-08-25, SLV since 2022-11-14, IJH since 2022-10-04): D1 can sit idle or flat for over a year.

## Broker and execution caveats

No simulated margin call or forced sale; house requirements change; real quotes, queue position, liquidity and
capacity are not modelled; minute bars do not fix the order inside a minute (stop fills are idealised; `nxo` and the
overshoot scenarios bound part of it). EDV (minute coverage 47%, ~$16M a day) is the least reliable fill model here.
No test shifts *entry* timing.

## Every base trade

Entry and exit at minute resolution, reasons, gross, interest, friction, net, MAE and the episode attribution are in
`results/tables/base_trades.csv` and `npm run standalone-opportunity-audit -- fixed <ID>` (research phenotypes to
2023-12-29 only).

### VGT primary (control)

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-12-21 | 160.42 | 2019-05-13 | 200.02 | trailing stop | 143 | $24,672 | $4,310 | $112 | $20,250 | -3.6% | VGT-E03 (decline, dip) |
| 2 | continuation | 2019-08-05 | 203.65 | 2020-02-24 | 252.18 | trailing stop gap | 203 | $23,819 | $6,118 | $112 | $17,589 | -0.2% | — |
| 3 | continuation | 2020-02-28 | 226.94 | 2020-03-06 | 232.86 | trailing stop | 7 | $2,608 | $211 | $101 | $2,295 | -0.9% | VGT-E05 (decline, dip) |
| 4 | deep | 2020-03-12 | 205.22 | 2020-03-20 | 198.64 | maximum hold | 8 | −$3,205 | $241 | $98 | −$3,544 | -10.8% | VGT-E05 (decline, dip) |
| 5 | deep | 2020-03-23 | 185.73 | 2020-04-01 | 203.18 | trailing stop | 9 | $9,391 | $271 | $105 | $9,015 | -3.4% | VGT-E06 (decline, dip) |
| 6 | deep | 2020-04-02 | 202.36 | 2020-09-04 | 315.87 | trailing stop | 155 | $56,063 | $4,671 | $128 | $51,264 | -1.2% | VGT-E06 (rebound, dip) |
| 7 | continuation | 2020-10-28 | 304.01 | 2021-02-23 | 354.79 | trailing stop | 118 | $16,695 | $3,556 | $108 | $13,031 | -3.0% | VGT-E08 (decline, dip) |
| 8 | continuation | 2021-03-05 | 337.17 | 2021-05-11 | 355.50 | trailing stop gap | 67 | $5,435 | $2,019 | $103 | $3,313 | -0.2% | VGT-E09 (decline, dip) |
| 9 | deep | 2022-03-14 | 367.27 | 2022-04-07 | 398.20 | trailing stop | 24 | $8,417 | $723 | $104 | $7,590 | -0.4% | VGT-E10 (decline, dip) |
| 10 | continuation | 2022-04-26 | 366.26 | 2022-05-06 | 363.42 | maximum hold | 10 | −$775 | $301 | $100 | −$1,176 | -1.1% | VGT-E11 (decline, dip) |
| 11 | deep | 2022-05-12 | 332.71 | 2022-06-10 | 342.66 | trailing stop | 29 | $2,988 | $874 | $101 | $2,013 | -1.7% | VGT-E11 (decline, dip) |
| 12 | deep | 2022-06-13 | 328.51 | 2022-06-21 | 325.72 | maximum hold | 8 | −$850 | $241 | $100 | −$1,191 | -4.5% | VGT-E11 (decline, dip) |
| 13 | deep | 2022-06-22 | 324.92 | 2022-07-01 | 326.24 | maximum hold | 9 | $406 | $271 | $100 | $35 | -1.2% | VGT-E11 (rebound, dip) |
| 14 | deep | 2022-07-05 | 322.29 | 2022-08-26 | 363.01 | trailing stop | 52 | $12,629 | $1,567 | $106 | $10,956 | -0.2% | VGT-E11 (rebound, dip) |
| 15 | continuation | 2022-09-16 | 329.27 | 2022-09-26 | 319.77 | maximum hold | 10 | −$2,884 | $301 | $99 | −$3,284 | -4.2% | VGT-E12 (decline, dip) |
| 16 | deep | 2022-10-10 | 306.40 | 2022-11-03 | 310.69 | trailing stop | 24 | $1,399 | $723 | $101 | $575 | -4.8% | VGT-E12 (decline, dip) |
| 17 | deep | 2022-11-04 | 306.91 | 2022-12-15 | 331.37 | trailing stop | 41 | $7,967 | $1,236 | $104 | $6,628 | -1.1% | VGT-E12 (rebound, dip) |

### VGT research rep. (procedure-matched control)

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-12-26 | 160.24 | 2019-05-13 | 198.94 | trailing stop | 138 | $24,139 | $4,159 | $112 | $19,868 | -1.1% | VGT-E03 (rebound, dip) |
| 2 | deep | 2020-03-12 | 207.36 | 2020-03-20 | 198.64 | maximum hold | 8 | −$4,203 | $241 | $98 | −$4,542 | -11.7% | VGT-E05 (decline, dip) |
| 3 | deep | 2020-03-23 | 188.43 | 2020-04-01 | 202.15 | trailing stop | 9 | $7,279 | $271 | $104 | $6,904 | -4.8% | VGT-E06 (decline, dip) |
| 4 | deep | 2020-04-03 | 206.98 | 2020-09-04 | 314.16 | trailing stop | 154 | $51,758 | $4,641 | $126 | $46,991 | -3.4% | VGT-E06 (rebound) |
| 5 | continuation | 2020-11-03 | 305.44 | 2021-02-23 | 352.88 | trailing stop | 112 | $15,523 | $3,375 | $108 | $12,040 | -0.9% | VGT-E08 (rebound, dip) |
| 6 | continuation | 2021-05-14 | 363.28 | 2021-10-04 | 396.72 | trailing stop | 143 | $9,200 | $4,310 | $105 | $4,786 | -2.9% | — |
| 7 | deep | 2022-05-13 | 343.46 | 2022-05-23 | 339.16 | maximum hold | 10 | −$1,251 | $301 | $99 | −$1,652 | -4.8% | VGT-E11 (decline, dip) |
| 8 | deep | 2022-05-25 | 345.03 | 2022-06-10 | 345.50 | maximum hold | 16 | $136 | $482 | $100 | −$446 | -1.5% | VGT-E11 (decline, dip) |
| 9 | deep | 2022-06-15 | 331.58 | 2022-06-23 | 329.29 | maximum hold | 8 | −$690 | $241 | $100 | −$1,031 | -5.4% | VGT-E11 (decline, dip) |
| 10 | deep | 2022-07-06 | 332.99 | 2022-07-14 | 328.24 | maximum hold | 8 | −$1,426 | $241 | $99 | −$1,766 | -2.5% | VGT-E11 (rebound, dip) |
| 11 | deep | 2022-07-19 | 347.28 | 2022-08-26 | 361.05 | trailing stop | 38 | $3,965 | $1,145 | $102 | $2,717 | -1.2% | VGT-E11 (rebound, dip) |
| 12 | deep | 2022-09-02 | 351.14 | 2022-09-13 | 350.50 | maximum hold | 11 | −$184 | $332 | $100 | −$615 | -3.9% | VGT-E12 (decline, dip) |
| 13 | deep | 2022-10-03 | 317.95 | 2022-10-11 | 304.34 | maximum hold | 8 | −$4,278 | $241 | $98 | −$4,617 | -4.4% | VGT-E12 (decline, dip) |
| 14 | deep | 2022-10-13 | 302.33 | 2022-11-03 | 309.01 | trailing stop | 21 | $2,209 | $633 | $101 | $1,475 | -0.7% | VGT-E12 (decline, dip) |
| 15 | deep | 2022-11-07 | 314.30 | 2022-12-15 | 329.57 | trailing stop | 38 | $4,856 | $1,145 | $102 | $3,608 | -1.7% | VGT-E12 (rebound, dip) |
| 16 | deep | 2023-01-03 | 322.14 | 2023-08-09 | 426.82 | trailing stop | 218 | $32,479 | $6,570 | $116 | $25,793 | -3.8% | VGT-E13 (rebound, dip) |
| 17 | continuation | 2023-11-01 | 411.67 | 2023-12-29 | 484.00 | open | 58 | $17,561 | $1,748 | $109 | $15,704 | -0.6% | VGT-E14 (rebound, dip) |

### XME:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2020-03-09 | 19.59 | 2020-03-13 | 16.74 | maximum hold | 4 | −$14,563 | $121 | $93 | −$14,776 | -20.9% | XME-E11 (decline, dip) |
| 2 | deep | 2020-03-16 | 14.94 | 2020-03-18 | 16.13 | trailing stop | 2 | $8,011 | $60 | $104 | $7,846 | -4.7% | XME-E11 (decline, dip) |
| 3 | deep | 2020-03-19 | 14.03 | 2020-03-20 | 14.78 | trailing stop | 1 | $5,354 | $30 | $103 | $5,221 | 0.0% | XME-E11 (decline, dip) |
| 4 | deep | 2020-03-23 | 14.60 | 2020-03-27 | 15.64 | trailing stop | 4 | $7,120 | $121 | $104 | $6,896 | -3.8% | XME-E11 (decline, dip) |
| 5 | deep | 2020-03-30 | 15.84 | 2020-04-15 | 17.99 | trailing stop gap | 16 | $13,566 | $482 | $107 | $12,978 | -2.7% | XME-E11 (rebound, dip) |
| 6 | continuation | 2020-05-13 | 18.48 | 2020-06-11 | 22.08 | trailing stop | 29 | $19,469 | $874 | $110 | $18,486 | -5.3% | XME-E12 (decline, dip) |
| 7 | continuation | 2020-06-24 | 20.37 | 2020-09-21 | 24.34 | trailing stop | 89 | $19,501 | $2,682 | $110 | $16,710 | -1.7% | XME-E13 (decline, dip) |
| 8 | continuation | 2020-10-29 | 23.54 | 2021-01-15 | 35.14 | trailing stop | 78 | $49,256 | $2,351 | $125 | $46,781 | -0.9% | XME-E14 (rebound, dip) |
| 9 | continuation | 2021-01-27 | 31.41 | 2021-02-26 | 36.88 | trailing stop | 30 | $17,391 | $904 | $109 | $16,378 | -0.1% | XME-E15 (decline, dip) |
| 10 | continuation | 2021-03-23 | 38.13 | 2021-06-17 | 44.26 | trailing stop | 86 | $16,057 | $2,592 | $108 | $13,357 | -6.4% | XME-E16 (decline, dip) |
| 11 | continuation | 2021-07-19 | 39.35 | 2021-08-19 | 42.24 | trailing stop gap | 31 | $7,347 | $934 | $104 | $6,310 | -1.8% | XME-E17 (decline, dip) |
| 12 | continuation | 2021-09-20 | 40.40 | 2021-11-18 | 44.11 | trailing stop | 59 | $9,187 | $1,778 | $105 | $7,304 | -1.7% | XME-E18 (decline, dip) |
| 13 | continuation | 2021-11-30 | 40.59 | 2022-01-20 | 44.61 | trailing stop | 51 | $9,906 | $1,537 | $105 | $8,264 | -2.0% | XME-E19 (decline, dip) |
| 14 | continuation | 2022-01-24 | 40.27 | 2022-03-09 | 55.84 | trailing stop | 44 | $38,650 | $1,326 | $119 | $37,205 | -0.7% | XME-E20 (decline, dip) |
| 15 | continuation | 2022-03-15 | 53.73 | 2022-03-29 | 58.92 | trailing stop | 14 | $9,659 | $422 | $105 | $9,133 | -0.8% | — |
| 16 | continuation | 2022-04-22 | 59.30 | 2022-04-26 | 57.36 | maximum hold | 4 | −$3,262 | $121 | $98 | −$3,481 | -7.5% | XME-E21 (decline, dip) |
| 17 | deep | 2022-05-12 | 48.15 | 2022-06-09 | 52.87 | trailing stop | 28 | $9,804 | $844 | $105 | $8,855 | -1.0% | XME-E21 (decline, dip) |
| 18 | continuation | 2022-06-14 | 47.69 | 2022-06-21 | 47.48 | maximum hold | 7 | −$440 | $211 | $100 | −$751 | -4.5% | XME-E22 (decline, dip) |
| 19 | deep | 2022-07-05 | 41.42 | 2022-08-30 | 49.82 | trailing stop | 56 | $20,271 | $1,688 | $110 | $18,473 | -3.8% | XME-E22 (decline, dip) |
| 20 | continuation | 2022-09-15 | 46.38 | 2022-09-19 | 44.51 | maximum hold | 4 | −$4,030 | $121 | $98 | −$4,248 | -4.8% | XME-E23 (decline, dip) |

### XME:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-10-26 | 29.94 | 2018-11-09 | 30.98 | trailing stop gap | 14 | $3,472 | $422 | $102 | $2,948 | -1.3% | XME-E07 (decline, dip) |
| 2 | deep | 2018-11-20 | 29.29 | 2018-12-04 | 29.32 | buffered intraday loss | 14 | $102 | $422 | $100 | −$420 | -5.5% | XME-E07 (decline, dip) |
| 3 | deep | 2018-12-06 | 28.22 | 2018-12-19 | 27.51 | maximum hold | 13 | −$2,515 | $392 | $99 | −$3,005 | -4.4% | XME-E07 (decline, dip) |
| 4 | deep | 2018-12-20 | 26.72 | 2019-01-02 | 25.70 | maximum hold | 13 | −$3,815 | $392 | $98 | −$4,305 | -6.2% | XME-E07 (decline, dip) |
| 5 | deep | 2019-01-03 | 26.18 | 2019-01-15 | 27.66 | trailing stop | 12 | $5,650 | $362 | $103 | $5,186 | -1.1% | XME-E07 (rebound, dip) |
| 6 | deep | 2019-01-16 | 28.06 | 2019-01-22 | 28.29 | trailing stop | 6 | $826 | $181 | $100 | $544 | -0.5% | XME-E07 (rebound, dip) |
| 7 | deep | 2019-01-23 | 28.74 | 2019-02-07 | 29.89 | trailing stop | 15 | $3,986 | $452 | $102 | $3,432 | -1.4% | XME-E07 (rebound, dip) |
| 8 | deep | 2019-02-08 | 29.76 | 2019-02-28 | 31.22 | trailing stop | 20 | $4,896 | $603 | $102 | $4,191 | -0.7% | XME-E07 (rebound, dip) |
| 9 | deep | 2019-03-08 | 28.96 | 2019-03-20 | 29.19 | trailing stop | 12 | $764 | $362 | $100 | $302 | -1.0% | XME-E08 (decline, dip) |
| 10 | deep | 2019-03-25 | 29.17 | 2019-04-11 | 29.87 | trailing stop | 17 | $2,399 | $512 | $101 | $1,785 | -0.5% | XME-E08 (decline, dip) |
| 11 | deep | 2019-05-13 | 26.98 | 2019-05-28 | 25.61 | maximum hold | 15 | −$5,075 | $452 | $97 | −$5,625 | -6.0% | XME-E08 (decline, dip) |
| 12 | deep | 2019-05-29 | 25.04 | 2019-06-24 | 27.51 | trailing stop | 26 | $9,859 | $784 | $105 | $8,971 | -3.2% | XME-E08 (decline, dip) |
| 13 | continuation | 2019-08-15 | 24.48 | 2019-08-23 | 24.90 | trailing stop | 8 | $1,703 | $241 | $101 | $1,361 | -0.2% | XME-E09 (decline, dip) |
| 14 | deep | 2019-08-26 | 24.87 | 2019-09-18 | 27.22 | trailing stop | 23 | $9,455 | $693 | $105 | $8,657 | -0.7% | XME-E09 (rebound, dip) |
| 15 | deep | 2019-10-02 | 24.94 | 2019-10-31 | 26.40 | trailing stop | 29 | $5,861 | $874 | $103 | $4,884 | -0.9% | XME-E10 (decline, dip) |
| 16 | continuation | 2020-01-27 | 25.60 | 2020-02-07 | 26.05 | trailing stop | 11 | $1,776 | $332 | $101 | $1,344 | -3.0% | XME-E11 (decline, dip) |
| 17 | continuation | 2020-02-27 | 22.73 | 2020-03-11 | 18.67 | maximum hold | 13 | −$17,853 | $392 | $91 | −$18,336 | -20.1% | XME-E11 (decline, dip) |
| 18 | deep | 2020-03-12 | 15.89 | 2020-03-13 | 16.39 | trailing stop | 1 | $3,148 | $30 | $102 | $3,017 | -0.9% | XME-E11 (decline, dip) |
| 19 | deep | 2020-03-16 | 14.94 | 2020-03-18 | 16.15 | trailing stop gap | 2 | $8,131 | $60 | $104 | $7,967 | -4.7% | XME-E11 (decline, dip) |
| 20 | deep | 2020-03-19 | 14.03 | 2020-03-20 | 15.39 | trailing stop | 1 | $9,689 | $30 | $105 | $9,554 | 0.0% | XME-E11 (decline, dip) |
| 21 | deep | 2020-03-23 | 14.19 | 2020-03-25 | 15.61 | trailing stop | 2 | $10,028 | $60 | $105 | $9,863 | -0.6% | XME-E11 (decline, dip) |
| 22 | deep | 2020-03-26 | 16.60 | 2020-04-08 | 17.15 | trailing stop gap | 13 | $3,312 | $392 | $102 | $2,818 | -7.2% | XME-E11 (rebound, dip) |
| 23 | deep | 2020-04-09 | 18.17 | 2020-04-15 | 17.99 | trailing stop gap | 6 | −$990 | $181 | $99 | −$1,270 | -1.0% | XME-E11 (rebound, dip) |
| 24 | deep | 2020-04-16 | 17.71 | 2020-04-24 | 18.20 | trailing stop | 8 | $2,765 | $241 | $101 | $2,422 | -3.8% | XME-E11 (rebound, dip) |
| 25 | deep | 2020-04-27 | 17.92 | 2020-04-30 | 19.69 | trailing stop | 3 | $9,850 | $90 | $105 | $9,655 | -0.5% | XME-E11 (rebound, dip) |
| 26 | deep | 2020-05-01 | 19.02 | 2020-05-06 | 19.17 | trailing stop | 5 | $788 | $151 | $100 | $537 | -2.3% | XME-E11 (rebound, dip) |
| 27 | deep | 2020-05-07 | 19.09 | 2020-05-11 | 19.55 | trailing stop | 4 | $2,388 | $121 | $101 | $2,166 | -0.7% | XME-E11 (rebound, dip) |
| 28 | deep | 2020-05-12 | 19.70 | 2020-05-21 | 20.21 | trailing stop | 9 | $2,573 | $271 | $101 | $2,200 | -11.2% | XME-E12 (decline, dip) |
| 29 | deep | 2020-05-22 | 20.12 | 2020-05-29 | 20.95 | trailing stop | 7 | $4,124 | $211 | $102 | $3,811 | -0.1% | — |
| 30 | deep | 2020-06-01 | 21.15 | 2020-06-10 | 23.03 | trailing stop | 9 | $8,906 | $271 | $104 | $8,530 | -0.4% | — |
| 31 | deep | 2020-06-11 | 22.11 | 2020-06-24 | 21.00 | maximum hold | 13 | −$5,018 | $392 | $97 | −$5,507 | -8.5% | XME-E13 (decline, dip) |
| 32 | deep | 2020-06-25 | 20.30 | 2020-07-01 | 20.54 | trailing stop | 6 | $1,206 | $181 | $101 | $924 | -1.3% | XME-E13 (decline, dip) |
| 33 | deep | 2020-07-02 | 21.30 | 2020-07-30 | 22.96 | trailing stop | 28 | $7,777 | $844 | $104 | $6,829 | -5.1% | XME-E13 (rebound, dip) |
| 34 | deep | 2020-07-31 | 22.67 | 2020-08-07 | 24.00 | trailing stop | 7 | $5,862 | $211 | $103 | $5,548 | -0.4% | XME-E13 (rebound) |
| 35 | continuation | 2020-09-24 | 22.65 | 2020-09-29 | 23.26 | trailing stop | 5 | $2,676 | $151 | $101 | $2,424 | -0.6% | XME-E14 (rebound, dip) |
| 36 | continuation | 2021-01-27 | 31.63 | 2021-01-29 | 32.54 | trailing stop | 2 | $2,875 | $60 | $101 | $2,713 | -0.3% | XME-E15 (decline, dip) |
| 37 | continuation | 2021-03-25 | 36.12 | 2021-03-30 | 38.77 | trailing stop gap | 5 | $7,348 | $151 | $104 | $7,094 | -0.0% | XME-E16 (rebound, dip) |
| 38 | continuation | 2021-07-19 | 39.35 | 2021-08-02 | 44.28 | trailing stop | 14 | $12,539 | $422 | $106 | $12,011 | -1.8% | XME-E17 (decline, dip) |
| 39 | continuation | 2021-09-21 | 40.06 | 2021-09-29 | 41.46 | trailing stop | 8 | $3,484 | $241 | $102 | $3,141 | -0.4% | XME-E18 (decline, dip) |
| 40 | continuation | 2021-11-30 | 40.72 | 2021-12-02 | 40.47 | trailing stop gap | 2 | −$614 | $60 | $100 | −$774 | -1.1% | XME-E19 (decline, dip) |
| 41 | deep | 2022-05-09 | 51.28 | 2022-05-23 | 51.73 | maximum hold | 14 | $877 | $422 | $100 | $355 | -7.1% | XME-E21 (decline, dip) |
| 42 | deep | 2022-05-24 | 51.50 | 2022-05-31 | 53.65 | trailing stop | 7 | $4,180 | $211 | $102 | $3,867 | -0.9% | XME-E21 (rebound, dip) |
| 43 | deep | 2022-06-10 | 51.29 | 2022-06-23 | 45.41 | maximum hold | 13 | −$11,458 | $392 | $94 | −$11,944 | -12.0% | XME-E22 (decline, dip) |
| 44 | deep | 2022-06-24 | 44.43 | 2022-06-29 | 46.08 | trailing stop | 5 | $3,709 | $151 | $102 | $3,457 | -0.2% | XME-E22 (decline, dip) |
| 45 | deep | 2022-06-30 | 43.03 | 2022-07-13 | 42.14 | maximum hold | 13 | −$2,067 | $392 | $99 | −$2,558 | -7.4% | XME-E22 (decline, dip) |
| 46 | deep | 2022-07-14 | 41.59 | 2022-07-22 | 43.58 | trailing stop | 8 | $4,768 | $241 | $102 | $4,425 | -1.2% | XME-E22 (rebound, dip) |
| 47 | deep | 2022-07-25 | 44.30 | 2022-08-02 | 46.67 | trailing stop | 8 | $5,341 | $241 | $103 | $4,998 | -0.1% | XME-E22 (rebound, dip) |
| 48 | deep | 2022-08-03 | 47.26 | 2022-08-15 | 50.93 | trailing stop | 12 | $7,779 | $362 | $104 | $7,313 | -1.8% | XME-E22 (rebound, dip) |
| 49 | deep | 2022-08-17 | 51.11 | 2022-08-29 | 51.30 | trailing stop gap | 12 | $372 | $362 | $100 | −$90 | -3.9% | XME-E22 (rebound) |
| 50 | deep | 2022-08-30 | 49.48 | 2022-09-13 | 49.11 | maximum hold | 14 | −$747 | $422 | $100 | −$1,269 | -5.5% | XME-E23 (decline, dip) |
| 51 | deep | 2022-09-14 | 47.34 | 2022-09-27 | 41.81 | maximum hold | 13 | −$11,676 | $392 | $94 | −$12,162 | -13.9% | XME-E23 (decline, dip) |
| 52 | deep | 2022-09-28 | 42.50 | 2022-09-29 | 42.73 | trailing stop | 1 | $541 | $30 | $100 | $411 | -0.4% | XME-E23 (rebound, dip) |
| 53 | deep | 2022-09-30 | 42.75 | 2022-10-07 | 46.08 | trailing stop | 7 | $7,783 | $211 | $104 | $7,468 | -0.8% | XME-E23 (rebound, dip) |
| 54 | deep | 2022-10-10 | 46.03 | 2022-10-27 | 48.61 | trailing stop | 17 | $5,596 | $512 | $103 | $4,981 | -5.5% | XME-E23 (rebound, dip) |
| 55 | deep | 2022-10-28 | 48.80 | 2022-11-09 | 49.60 | trailing stop | 12 | $1,641 | $362 | $101 | $1,178 | -6.6% | XME-E23 (rebound) |
| 56 | deep | 2022-11-10 | 49.98 | 2022-11-14 | 50.94 | trailing stop gap | 4 | $1,920 | $121 | $101 | $1,698 | -0.7% | XME-E23 (rebound) |
| 57 | deep | 2022-11-17 | 49.97 | 2022-11-28 | 50.99 | trailing stop | 11 | $2,032 | $332 | $101 | $1,599 | -1.2% | XME-E23 (rebound) |
| 58 | deep | 2022-12-12 | 51.25 | 2022-12-14 | 52.03 | trailing stop | 2 | $1,527 | $60 | $101 | $1,366 | -0.8% | XME-E24 (decline, dip) |
| 59 | deep | 2022-12-15 | 50.22 | 2022-12-28 | 50.26 | buffered intraday loss | 13 | $80 | $392 | $100 | −$412 | -3.5% | XME-E24 (decline, dip) |
| 60 | deep | 2022-12-29 | 49.97 | 2023-01-19 | 54.04 | trailing stop gap | 21 | $8,141 | $633 | $104 | $7,404 | -2.5% | XME-E24 (rebound, dip) |
| 61 | continuation | 2023-03-15 | 48.99 | 2023-03-23 | 49.59 | trailing stop | 8 | $1,217 | $241 | $101 | $875 | -1.4% | XME-E25 (decline, dip) |
| 62 | continuation | 2023-05-24 | 46.12 | 2023-06-12 | 47.71 | trailing stop | 19 | $3,445 | $573 | $102 | $2,771 | -4.2% | XME-E25 (decline, dip) |

### GDX:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2017-06-15 | 22.25 | 2017-06-19 | 21.86 | maximum hold | 4 | −$1,774 | $121 | $99 | −$1,994 | -1.8% | GDX-E08 (decline, dip) |
| 2 | deep | 2017-06-21 | 22.00 | 2017-06-30 | 21.92 | maximum hold | 9 | −$363 | $271 | $100 | −$734 | -0.5% | GDX-E08 (decline, dip) |
| 3 | deep | 2017-07-05 | 21.66 | 2017-07-10 | 21.04 | maximum hold | 5 | −$2,883 | $151 | $99 | −$3,133 | -3.1% | GDX-E08 (decline, dip) |
| 4 | deep | 2017-07-11 | 21.51 | 2017-09-18 | 23.64 | trailing stop | 69 | $9,878 | $2,079 | $105 | $7,694 | -0.2% | GDX-E08 (rebound, dip) |
| 5 | continuation | 2017-10-27 | 22.54 | 2017-10-30 | 22.53 | maximum hold | 3 | −$44 | $90 | $100 | −$235 | -0.7% | GDX-E09 (decline, dip) |
| 6 | deep | 2018-09-05 | 18.04 | 2018-09-10 | 17.90 | maximum hold | 5 | −$748 | $151 | $100 | −$998 | -2.5% | GDX-E10 (decline, dip) |
| 7 | deep | 2018-09-11 | 17.50 | 2018-10-25 | 18.95 | trailing stop | 44 | $8,289 | $1,326 | $104 | $6,859 | -1.1% | GDX-E10 (decline, dip) |
| 8 | continuation | 2018-11-13 | 18.47 | 2019-03-01 | 21.90 | trailing stop | 108 | $18,555 | $3,255 | $109 | $15,191 | -0.7% | GDX-E10 (rebound, dip) |
| 9 | continuation | 2019-04-18 | 21.73 | 2019-04-22 | 21.35 | maximum hold | 4 | −$1,748 | $121 | $99 | −$1,967 | -2.5% | GDX-E11 (decline, dip) |
| 10 | deep | 2020-03-12 | 22.30 | 2020-03-13 | 23.00 | trailing stop | 1 | $3,107 | $30 | $102 | $2,975 | -0.8% | GDX-E15 (decline, dip) |
| 11 | deep | 2020-03-16 | 17.12 | 2020-03-18 | 23.43 | trailing stop | 2 | $36,854 | $60 | $118 | $36,676 | -5.5% | GDX-E15 (rebound, dip) |
| 12 | deep | 2020-03-19 | 19.94 | 2020-03-20 | 22.74 | trailing stop gap | 1 | $14,035 | $30 | $107 | $13,898 | -1.3% | GDX-E16 (decline, dip) |
| 13 | deep | 2020-03-23 | 21.68 | 2020-03-27 | 25.14 | trailing stop | 4 | $15,961 | $121 | $108 | $15,732 | -2.6% | GDX-E16 (rebound, dip) |
| 14 | continuation | 2020-03-30 | 23.46 | 2020-04-15 | 29.66 | trailing stop gap | 16 | $26,426 | $482 | $113 | $25,830 | -2.0% | GDX-E17 (decline, dip) |
| 15 | continuation | 2020-05-01 | 31.67 | 2020-05-26 | 34.64 | trailing stop | 25 | $9,376 | $753 | $105 | $8,518 | 0.0% | — |
| 16 | continuation | 2020-06-03 | 32.84 | 2020-06-08 | 32.52 | maximum hold | 5 | −$974 | $151 | $99 | −$1,224 | -4.9% | GDX-E18 (decline, dip) |
| 17 | deep | 2021-02-18 | 33.37 | 2021-02-22 | 33.14 | maximum hold | 4 | −$689 | $121 | $100 | −$909 | -2.5% | GDX-E22 (decline, dip) |
| 18 | deep | 2021-02-23 | 33.19 | 2021-02-26 | 32.07 | maximum hold | 3 | −$3,373 | $90 | $98 | −$3,561 | -3.8% | GDX-E22 (decline, dip) |
| 19 | deep | 2021-03-02 | 31.11 | 2021-03-30 | 31.86 | trailing stop | 28 | $2,425 | $844 | $101 | $1,480 | -1.5% | GDX-E22 (rebound, dip) |
| 20 | deep | 2021-03-31 | 32.26 | 2021-06-16 | 37.08 | trailing stop | 77 | $14,952 | $2,321 | $107 | $12,524 | -0.3% | GDX-E22 (rebound, dip) |
| 21 | continuation | 2021-06-21 | 34.57 | 2021-06-28 | 34.23 | maximum hold | 7 | −$983 | $211 | $99 | −$1,293 | -1.0% | GDX-E23 (decline, dip) |
| 22 | deep | 2021-09-20 | 30.41 | 2021-09-23 | 30.27 | maximum hold | 3 | −$444 | $90 | $100 | −$634 | -1.0% | GDX-E23 (decline, dip) |
| 23 | deep | 2021-09-24 | 29.93 | 2021-09-27 | 29.73 | maximum hold | 3 | −$685 | $90 | $100 | −$875 | -0.9% | GDX-E23 (decline, dip) |
| 24 | deep | 2021-09-28 | 29.31 | 2021-10-04 | 29.45 | maximum hold | 6 | $477 | $181 | $100 | $196 | -1.6% | GDX-E23 (decline, dip) |
| 25 | deep | 2021-10-05 | 29.50 | 2021-11-02 | 31.37 | trailing stop | 28 | $6,335 | $844 | $103 | $5,388 | -0.1% | GDX-E23 (rebound, dip) |
| 26 | continuation | 2021-11-22 | 32.95 | 2021-11-26 | 32.63 | maximum hold | 4 | −$986 | $121 | $99 | −$1,206 | -2.4% | GDX-E24 (decline, dip) |
| 27 | deep | 2022-01-28 | 29.20 | 2022-03-09 | 36.77 | trailing stop gap | 40 | $25,912 | $1,205 | $113 | $24,593 | -1.0% | GDX-E25 (decline, dip) |
| 28 | continuation | 2022-03-14 | 36.71 | 2022-04-21 | 38.44 | trailing stop | 38 | $4,718 | $1,145 | $102 | $3,471 | -2.8% | — |
| 29 | continuation | 2022-04-25 | 35.73 | 2022-04-28 | 34.70 | maximum hold | 3 | −$2,881 | $90 | $99 | −$3,070 | -3.0% | GDX-E26 (decline, dip) |
| 30 | deep | 2022-05-12 | 30.02 | 2022-06-10 | 30.64 | trailing stop gap | 29 | $2,081 | $874 | $101 | $1,106 | -0.3% | GDX-E26 (decline, dip) |
| 31 | deep | 2022-06-14 | 29.75 | 2022-06-23 | 29.19 | buffered intraday loss | 9 | −$1,882 | $271 | $99 | −$2,252 | -1.9% | GDX-E27 (decline, dip) |
| 32 | deep | 2022-06-24 | 29.16 | 2022-06-29 | 29.18 | maximum hold | 5 | $86 | $151 | $100 | −$165 | -1.2% | GDX-E27 (decline, dip) |
| 33 | deep | 2022-06-30 | 27.86 | 2022-07-05 | 27.90 | maximum hold | 5 | $161 | $151 | $100 | −$89 | -3.7% | GDX-E27 (decline, dip) |
| 34 | deep | 2022-07-06 | 26.34 | 2022-07-13 | 26.13 | maximum hold | 7 | −$778 | $211 | $100 | −$1,089 | -1.1% | GDX-E27 (decline, dip) |
| 35 | deep | 2022-07-14 | 25.25 | 2022-07-25 | 25.35 | maximum hold | 11 | $396 | $332 | $100 | −$36 | -0.8% | GDX-E27 (decline, dip) |
| 36 | deep | 2022-07-26 | 25.01 | 2022-08-18 | 25.48 | trailing stop | 23 | $1,894 | $693 | $101 | $1,100 | -0.8% | GDX-E27 (rebound, dip) |
| 37 | deep | 2022-08-22 | 25.15 | 2022-08-29 | 24.67 | maximum hold | 7 | −$1,908 | $211 | $99 | −$2,218 | -1.9% | GDX-E28 (decline, dip) |
| 38 | deep | 2022-08-30 | 24.18 | 2022-09-02 | 23.56 | maximum hold | 3 | −$2,563 | $90 | $99 | −$2,752 | -5.0% | GDX-E28 (decline, dip) |
| 39 | deep | 2022-09-06 | 24.18 | 2022-09-15 | 24.16 | maximum hold | 9 | −$62 | $271 | $100 | −$433 | -3.7% | GDX-E28 (rebound, dip) |
| 40 | deep | 2022-09-16 | 23.39 | 2022-09-23 | 22.99 | maximum hold | 7 | −$1,710 | $211 | $99 | −$2,020 | -1.9% | GDX-E29 (decline, dip) |
| 41 | deep | 2022-09-26 | 22.37 | 2022-10-10 | 23.98 | trailing stop gap | 14 | $7,194 | $422 | $104 | $6,668 | -3.8% | GDX-E29 (decline, dip) |
| 42 | deep | 2022-10-11 | 24.24 | 2022-10-14 | 23.49 | maximum hold | 3 | −$3,093 | $90 | $98 | −$3,281 | -7.2% | GDX-E30 (decline, dip) |
| 43 | deep | 2022-10-18 | 23.75 | 2022-10-21 | 23.22 | maximum hold | 3 | −$2,239 | $90 | $99 | −$2,428 | -4.1% | GDX-E30 (rebound, dip) |
| 44 | deep | 2022-10-24 | 23.97 | 2022-11-02 | 23.50 | buffered intraday loss | 9 | −$1,960 | $271 | $99 | −$2,330 | -2.0% | GDX-E30 (rebound, dip) |
| 45 | deep | 2022-11-03 | 22.91 | 2022-12-16 | 28.14 | trailing stop | 43 | $22,819 | $1,296 | $111 | $21,412 | -1.4% | GDX-E30 (rebound, dip) |
| 46 | deep | 2022-12-20 | 28.18 | 2023-02-03 | 30.81 | trailing stop | 45 | $9,315 | $1,356 | $105 | $7,854 | -0.2% | — |
| 47 | deep | 2023-02-10 | 29.80 | 2023-02-13 | 29.55 | maximum hold | 3 | −$855 | $90 | $100 | −$1,045 | -1.5% | GDX-E31 (decline, dip) |
| 48 | deep | 2023-02-14 | 29.43 | 2023-02-17 | 28.11 | maximum hold | 3 | −$4,516 | $90 | $98 | −$4,704 | -4.5% | GDX-E31 (decline, dip) |
| 49 | deep | 2023-02-21 | 28.48 | 2023-02-24 | 26.66 | maximum hold | 3 | −$6,387 | $90 | $97 | −$6,574 | -6.4% | GDX-E31 (decline, dip) |
| 50 | deep | 2023-02-27 | 27.32 | 2023-03-07 | 26.80 | buffered intraday loss | 8 | −$1,902 | $241 | $99 | −$2,243 | -1.9% | GDX-E31 (decline, dip) |
| 51 | deep | 2023-03-08 | 27.30 | 2023-04-21 | 33.36 | trailing stop | 44 | $22,174 | $1,326 | $111 | $20,736 | -2.6% | GDX-E31 (decline, dip) |
| 52 | continuation | 2023-05-12 | 33.67 | 2023-05-16 | 32.97 | buffered intraday loss | 4 | −$2,092 | $121 | $99 | −$2,312 | -2.1% | GDX-E32 (decline, dip) |
| 53 | deep | 2023-10-03 | 26.11 | 2023-10-31 | 27.87 | trailing stop | 28 | $6,729 | $844 | $103 | $5,782 | -1.9% | GDX-E33 (decline, dip) |
| 54 | continuation | 2023-11-09 | 27.75 | 2023-11-13 | 27.16 | maximum hold | 4 | −$2,125 | $121 | $99 | −$2,344 | -2.6% | GDX-E33 (rebound, dip) |

### GDX:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-09-05 | 18.04 | 2018-09-10 | 17.90 | maximum hold | 5 | −$748 | $151 | $100 | −$998 | -2.5% | GDX-E10 (decline, dip) |
| 2 | deep | 2018-09-11 | 17.50 | 2018-10-25 | 18.95 | trailing stop | 44 | $8,289 | $1,326 | $104 | $6,859 | -1.1% | GDX-E10 (decline, dip) |
| 3 | continuation | 2018-11-13 | 18.47 | 2019-03-01 | 21.90 | trailing stop | 108 | $18,555 | $3,255 | $109 | $15,191 | -0.7% | GDX-E10 (rebound, dip) |
| 4 | continuation | 2019-04-02 | 22.07 | 2019-04-15 | 21.95 | maximum hold | 13 | −$550 | $392 | $100 | −$1,042 | -1.3% | GDX-E11 (decline, dip) |
| 5 | deep | 2020-03-12 | 22.30 | 2020-03-13 | 23.00 | trailing stop | 1 | $3,107 | $30 | $102 | $2,975 | -0.8% | GDX-E15 (decline, dip) |
| 6 | deep | 2020-03-16 | 17.12 | 2020-03-18 | 23.43 | trailing stop | 2 | $36,854 | $60 | $118 | $36,676 | -5.5% | GDX-E15 (rebound, dip) |
| 7 | deep | 2020-03-19 | 19.94 | 2020-03-20 | 22.74 | trailing stop gap | 1 | $14,035 | $30 | $107 | $13,898 | -1.3% | GDX-E16 (decline, dip) |
| 8 | deep | 2020-03-23 | 21.68 | 2020-03-27 | 25.14 | trailing stop | 4 | $15,961 | $121 | $108 | $15,732 | -2.6% | GDX-E16 (rebound, dip) |
| 9 | continuation | 2020-03-30 | 23.46 | 2020-04-15 | 29.66 | trailing stop gap | 16 | $26,426 | $482 | $113 | $25,830 | -2.0% | GDX-E17 (decline, dip) |
| 10 | continuation | 2020-05-01 | 31.67 | 2020-05-26 | 34.64 | trailing stop | 25 | $9,376 | $753 | $105 | $8,518 | 0.0% | — |
| 11 | continuation | 2020-05-27 | 32.93 | 2020-06-03 | 32.76 | buffered intraday loss | 7 | −$516 | $211 | $100 | −$827 | -1.1% | GDX-E18 (decline, dip) |
| 12 | deep | 2021-02-18 | 33.37 | 2021-02-22 | 33.14 | maximum hold | 4 | −$689 | $121 | $100 | −$909 | -2.5% | GDX-E22 (decline, dip) |
| 13 | deep | 2021-02-23 | 33.19 | 2021-02-26 | 32.07 | maximum hold | 3 | −$3,373 | $90 | $98 | −$3,561 | -3.8% | GDX-E22 (decline, dip) |
| 14 | deep | 2021-03-02 | 31.11 | 2021-03-05 | 30.94 | buffered intraday loss | 3 | −$540 | $90 | $100 | −$730 | -1.5% | GDX-E22 (rebound, dip) |
| 15 | deep | 2021-03-08 | 31.79 | 2021-03-30 | 32.06 | maximum hold | 22 | $849 | $663 | $100 | $86 | -1.9% | GDX-E22 (rebound, dip) |
| 16 | deep | 2021-03-31 | 32.26 | 2021-06-16 | 37.08 | trailing stop | 77 | $14,952 | $2,321 | $107 | $12,524 | -0.3% | GDX-E22 (rebound, dip) |
| 17 | continuation | 2021-06-18 | 35.02 | 2021-06-21 | 34.57 | maximum hold | 3 | −$1,284 | $90 | $99 | −$1,474 | -2.6% | GDX-E23 (decline, dip) |
| 18 | deep | 2021-09-30 | 29.23 | 2021-10-04 | 29.45 | maximum hold | 4 | $752 | $121 | $100 | $531 | -0.4% | GDX-E23 (rebound, dip) |
| 19 | continuation | 2021-10-29 | 32.09 | 2021-11-01 | 31.60 | maximum hold | 3 | −$1,542 | $90 | $99 | −$1,731 | -1.7% | GDX-E23 (rebound, dip) |
| 20 | deep | 2022-01-28 | 29.20 | 2022-03-09 | 36.77 | trailing stop gap | 40 | $25,912 | $1,205 | $113 | $24,593 | -1.0% | GDX-E25 (decline, dip) |
| 21 | continuation | 2022-03-14 | 36.71 | 2022-04-21 | 38.44 | trailing stop | 38 | $4,718 | $1,145 | $102 | $3,471 | -2.8% | — |
| 22 | continuation | 2022-04-25 | 35.73 | 2022-04-28 | 34.70 | maximum hold | 3 | −$2,881 | $90 | $99 | −$3,070 | -3.0% | GDX-E26 (decline, dip) |
| 23 | deep | 2022-05-12 | 30.02 | 2022-06-10 | 30.64 | trailing stop gap | 29 | $2,081 | $874 | $101 | $1,106 | -0.3% | GDX-E26 (decline, dip) |
| 24 | deep | 2022-06-14 | 29.75 | 2022-06-23 | 29.62 | buffered intraday loss | 9 | −$453 | $271 | $100 | −$824 | -1.4% | GDX-E27 (decline, dip) |
| 25 | deep | 2022-06-24 | 29.16 | 2022-06-28 | 29.00 | buffered intraday loss | 4 | −$531 | $121 | $100 | −$752 | -0.5% | GDX-E27 (decline, dip) |
| 26 | deep | 2022-06-30 | 27.86 | 2022-07-05 | 27.90 | maximum hold | 5 | $161 | $151 | $100 | −$89 | -3.7% | GDX-E27 (decline, dip) |
| 27 | deep | 2022-07-06 | 26.34 | 2022-07-12 | 26.22 | buffered intraday loss | 6 | −$436 | $181 | $100 | −$717 | -0.5% | GDX-E27 (decline, dip) |
| 28 | deep | 2022-07-13 | 26.46 | 2022-07-18 | 26.12 | maximum hold | 5 | −$1,284 | $151 | $99 | −$1,534 | -5.8% | GDX-E27 (decline, dip) |
| 29 | deep | 2022-07-19 | 26.07 | 2022-07-22 | 25.98 | maximum hold | 3 | −$326 | $90 | $100 | −$516 | -3.3% | GDX-E27 (decline, dip) |
| 30 | deep | 2022-07-26 | 24.73 | 2022-08-18 | 25.48 | trailing stop | 23 | $3,047 | $693 | $101 | $2,252 | -0.1% | GDX-E27 (rebound, dip) |
| 31 | deep | 2022-08-22 | 25.15 | 2022-08-26 | 25.00 | buffered intraday loss | 4 | −$576 | $121 | $100 | −$796 | -0.6% | GDX-E28 (decline, dip) |
| 32 | deep | 2022-08-29 | 24.94 | 2022-09-01 | 23.25 | maximum hold | 3 | −$6,773 | $90 | $97 | −$6,960 | -6.8% | GDX-E28 (decline, dip) |
| 33 | deep | 2022-09-02 | 23.54 | 2022-09-06 | 23.41 | buffered intraday loss | 4 | −$531 | $121 | $100 | −$751 | -0.5% | GDX-E28 (rebound, dip) |
| 34 | deep | 2022-09-07 | 23.64 | 2022-09-15 | 23.76 | trailing stop | 8 | $469 | $241 | $100 | $128 | -0.4% | GDX-E28 (rebound, dip) |
| 35 | deep | 2022-09-16 | 23.39 | 2022-09-23 | 22.99 | maximum hold | 7 | −$1,710 | $211 | $99 | −$2,020 | -1.9% | GDX-E29 (decline, dip) |
| 36 | deep | 2022-09-26 | 22.37 | 2022-10-10 | 23.98 | trailing stop gap | 14 | $7,194 | $422 | $104 | $6,668 | -3.8% | GDX-E29 (decline, dip) |
| 37 | deep | 2022-10-11 | 24.24 | 2022-10-14 | 23.49 | maximum hold | 3 | −$3,093 | $90 | $98 | −$3,281 | -7.2% | GDX-E30 (decline, dip) |
| 38 | deep | 2022-10-18 | 23.75 | 2022-10-21 | 23.22 | maximum hold | 3 | −$2,239 | $90 | $99 | −$2,428 | -4.1% | GDX-E30 (rebound, dip) |
| 39 | deep | 2022-10-24 | 23.97 | 2022-11-02 | 23.86 | buffered intraday loss | 9 | −$459 | $271 | $100 | −$830 | -2.0% | GDX-E30 (rebound, dip) |
| 40 | deep | 2022-11-03 | 22.91 | 2022-12-16 | 28.14 | trailing stop | 43 | $22,819 | $1,296 | $111 | $21,412 | -1.4% | GDX-E30 (rebound, dip) |
| 41 | deep | 2022-12-20 | 28.18 | 2023-02-03 | 30.81 | trailing stop | 45 | $9,315 | $1,356 | $105 | $7,854 | -0.2% | — |
| 42 | deep | 2023-02-10 | 29.80 | 2023-02-13 | 29.55 | maximum hold | 3 | −$855 | $90 | $100 | −$1,045 | -1.5% | GDX-E31 (decline, dip) |
| 43 | deep | 2023-02-16 | 28.46 | 2023-02-21 | 28.34 | maximum hold | 5 | −$421 | $151 | $100 | −$672 | -2.4% | GDX-E31 (decline, dip) |
| 44 | deep | 2023-10-03 | 26.11 | 2023-10-31 | 27.87 | trailing stop | 28 | $6,729 | $844 | $103 | $5,782 | -1.9% | GDX-E33 (decline, dip) |
| 45 | continuation | 2023-11-09 | 27.75 | 2023-11-13 | 27.16 | maximum hold | 4 | −$2,125 | $121 | $99 | −$2,344 | -2.6% | GDX-E33 (rebound, dip) |

### KBE:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-12-26 | 36.04 | 2019-03-07 | 44.06 | trailing stop gap | 71 | $22,242 | $2,140 | $111 | $19,991 | -1.2% | KBE-E04 (rebound, dip) |
| 2 | continuation | 2019-03-27 | 41.37 | 2019-05-09 | 44.12 | trailing stop gap | 43 | $6,644 | $1,296 | $103 | $5,245 | -0.5% | KBE-E05 (rebound, dip) |
| 3 | continuation | 2019-06-04 | 42.07 | 2019-06-18 | 42.19 | maximum hold | 14 | $285 | $422 | $100 | −$237 | -0.2% | KBE-E06 (decline, dip) |
| 4 | deep | 2020-03-10 | 32.65 | 2020-03-16 | 27.00 | maximum hold | 6 | −$17,296 | $181 | $91 | −$17,568 | -17.3% | KBE-E07 (decline, dip) |
| 5 | deep | 2020-03-17 | 27.31 | 2020-03-18 | 26.90 | trailing stop gap | 1 | −$1,501 | $30 | $99 | −$1,630 | -1.5% | KBE-E08 (decline, dip) |
| 6 | deep | 2020-03-19 | 24.93 | 2020-03-20 | 26.58 | trailing stop | 1 | $6,620 | $30 | $103 | $6,487 | -1.1% | KBE-E08 (decline, dip) |
| 7 | deep | 2020-03-23 | 23.33 | 2020-03-27 | 27.54 | trailing stop gap | 4 | $18,036 | $121 | $109 | $17,806 | -1.8% | KBE-E08 (decline, dip) |
| 8 | deep | 2020-03-30 | 27.52 | 2020-04-03 | 25.46 | maximum hold | 4 | −$7,482 | $121 | $96 | −$7,698 | -9.5% | KBE-E09 (decline, dip) |
| 9 | deep | 2020-04-06 | 26.59 | 2020-04-08 | 27.53 | trailing stop | 2 | $3,543 | $60 | $102 | $3,381 | -0.7% | KBE-E09 (rebound) |
| 10 | deep | 2020-04-09 | 30.59 | 2020-04-13 | 29.83 | buffered intraday loss | 4 | −$2,483 | $121 | $99 | −$2,702 | -2.6% | KBE-E09 (rebound) |
| 11 | deep | 2020-04-17 | 27.45 | 2020-04-21 | 27.14 | trailing stop gap | 4 | −$1,129 | $121 | $99 | −$1,349 | -1.5% | KBE-E10 (rebound, dip) |
| 12 | deep | 2020-04-23 | 27.79 | 2020-04-30 | 31.66 | trailing stop | 7 | $13,902 | $211 | $107 | $13,584 | -1.7% | KBE-E10 (rebound, dip) |
| 13 | deep | 2020-05-05 | 30.25 | 2020-05-11 | 29.35 | maximum hold | 6 | −$2,974 | $181 | $98 | −$3,253 | -6.6% | KBE-E11 (decline, dip) |
| 14 | deep | 2020-05-14 | 25.58 | 2020-05-19 | 28.18 | trailing stop | 5 | $10,164 | $151 | $105 | $9,909 | -0.2% | KBE-E11 (rebound, dip) |
| 15 | deep | 2020-05-21 | 29.62 | 2020-05-28 | 32.18 | trailing stop | 7 | $8,659 | $211 | $104 | $8,344 | -3.4% | KBE-E11 (rebound) |
| 16 | deep | 2020-06-01 | 32.11 | 2020-06-09 | 36.60 | trailing stop | 8 | $13,990 | $241 | $107 | $13,642 | -1.6% | — |
| 17 | deep | 2020-06-12 | 33.05 | 2020-06-17 | 33.57 | trailing stop | 5 | $1,566 | $151 | $101 | $1,314 | -5.9% | KBE-E12 (decline, dip) |
| 18 | deep | 2020-06-18 | 33.60 | 2020-06-22 | 32.29 | maximum hold | 4 | −$3,897 | $121 | $98 | −$4,115 | -4.3% | KBE-E12 (decline, dip) |
| 19 | deep | 2020-06-25 | 31.20 | 2020-06-29 | 30.25 | maximum hold | 4 | −$3,043 | $121 | $98 | −$3,262 | -5.1% | KBE-E12 (decline, dip) |
| 20 | deep | 2020-06-30 | 31.49 | 2020-07-06 | 31.03 | maximum hold | 6 | −$1,460 | $181 | $99 | −$1,740 | -4.2% | KBE-E12 (decline, dip) |
| 21 | deep | 2020-07-10 | 29.11 | 2020-07-14 | 29.49 | trailing stop | 4 | $1,308 | $121 | $101 | $1,087 | -1.5% | KBE-E12 (rebound, dip) |
| 22 | deep | 2020-07-15 | 31.24 | 2020-07-20 | 30.02 | maximum hold | 5 | −$3,903 | $151 | $98 | −$4,152 | -3.9% | KBE-E12 (rebound, dip) |
| 23 | deep | 2020-07-21 | 31.28 | 2020-07-28 | 30.94 | maximum hold | 7 | −$1,086 | $211 | $99 | −$1,397 | -1.9% | KBE-E12 (rebound, dip) |
| 24 | deep | 2020-07-29 | 31.62 | 2020-08-03 | 31.11 | maximum hold | 5 | −$1,612 | $151 | $99 | −$1,862 | -3.7% | KBE-E12 (rebound, dip) |
| 25 | deep | 2020-08-05 | 31.57 | 2020-08-12 | 33.33 | trailing stop | 7 | $5,564 | $211 | $103 | $5,250 | -2.1% | KBE-E12 (rebound, dip) |
| 26 | deep | 2020-08-14 | 33.56 | 2020-08-18 | 32.65 | maximum hold | 4 | −$2,725 | $121 | $99 | −$2,944 | -3.0% | KBE-E13 (decline, dip) |
| 27 | deep | 2020-08-24 | 31.91 | 2020-09-01 | 31.50 | maximum hold | 8 | −$1,284 | $241 | $99 | −$1,625 | -1.3% | KBE-E13 (decline, dip) |
| 28 | deep | 2020-09-03 | 32.69 | 2020-09-08 | 32.41 | maximum hold | 5 | −$856 | $151 | $100 | −$1,106 | -1.9% | KBE-E13 (decline, dip) |
| 29 | deep | 2020-09-14 | 31.59 | 2020-09-18 | 31.18 | maximum hold | 4 | −$1,297 | $121 | $99 | −$1,517 | -2.5% | KBE-E13 (decline, dip) |
| 30 | deep | 2020-09-24 | 28.72 | 2020-10-14 | 32.05 | trailing stop | 20 | $11,606 | $603 | $106 | $10,898 | -2.9% | KBE-E13 (rebound, dip) |
| 31 | deep | 2020-10-15 | 32.39 | 2020-10-26 | 33.51 | trailing stop | 11 | $3,465 | $332 | $102 | $3,032 | -1.1% | KBE-E13 (rebound) |
| 32 | deep | 2020-10-29 | 32.46 | 2020-11-04 | 33.85 | trailing stop | 6 | $4,284 | $181 | $102 | $4,001 | -1.4% | — |
| 33 | deep | 2020-11-05 | 34.37 | 2020-11-11 | 37.58 | trailing stop | 6 | $9,364 | $181 | $105 | $9,079 | -2.5% | — |
| 34 | continuation | 2020-12-01 | 39.80 | 2021-01-21 | 45.40 | trailing stop | 51 | $14,069 | $1,537 | $107 | $12,425 | -1.4% | — |
| 35 | continuation | 2021-02-02 | 44.02 | 2021-02-26 | 50.69 | trailing stop gap | 24 | $15,145 | $723 | $108 | $14,314 | -0.4% | — |
| 36 | continuation | 2021-03-05 | 52.14 | 2021-03-19 | 53.75 | trailing stop gap | 14 | $3,086 | $422 | $101 | $2,563 | -3.8% | — |
| 37 | continuation | 2021-03-24 | 51.77 | 2021-03-30 | 51.86 | maximum hold | 6 | $174 | $181 | $100 | −$107 | -4.6% | — |
| 38 | deep | 2022-05-13 | 45.98 | 2022-05-19 | 45.73 | maximum hold | 6 | −$543 | $181 | $100 | −$824 | -1.6% | KBE-E16 (decline, dip) |
| 39 | deep | 2022-05-23 | 46.86 | 2022-06-09 | 47.80 | trailing stop | 17 | $2,000 | $512 | $101 | $1,386 | -2.4% | KBE-E16 (decline, dip) |
| 40 | continuation | 2022-06-15 | 45.21 | 2022-06-21 | 44.28 | maximum hold | 6 | −$2,056 | $181 | $99 | −$2,336 | -5.8% | KBE-E16 (decline, dip) |
| 41 | deep | 2022-06-24 | 44.11 | 2022-06-30 | 43.46 | maximum hold | 6 | −$1,473 | $181 | $99 | −$1,753 | -1.6% | KBE-E16 (rebound, dip) |
| 42 | deep | 2022-07-05 | 44.60 | 2022-07-11 | 44.48 | maximum hold | 6 | −$269 | $181 | $100 | −$550 | -1.5% | KBE-E16 (rebound, dip) |
| 43 | deep | 2022-07-15 | 44.04 | 2022-08-22 | 50.23 | trailing stop gap | 38 | $14,048 | $1,145 | $107 | $12,796 | -1.1% | KBE-E16 (rebound, dip) |
| 44 | continuation | 2022-09-08 | 47.49 | 2022-09-13 | 47.73 | trailing stop | 5 | $511 | $151 | $100 | $260 | -0.0% | KBE-E17 (decline, dip) |
| 45 | continuation | 2022-09-28 | 45.41 | 2022-10-03 | 44.82 | maximum hold | 5 | −$1,293 | $151 | $99 | −$1,543 | -3.2% | KBE-E17 (decline, dip) |
| 46 | deep | 2022-10-13 | 45.33 | 2022-10-19 | 46.49 | trailing stop | 6 | $2,565 | $181 | $101 | $2,283 | -0.2% | KBE-E17 (rebound, dip) |
| 47 | deep | 2022-10-24 | 46.33 | 2022-11-03 | 47.06 | trailing stop gap | 10 | $1,575 | $301 | $101 | $1,173 | -0.8% | KBE-E17 (rebound, dip) |
| 48 | continuation | 2022-11-22 | 49.01 | 2022-11-28 | 49.00 | maximum hold | 6 | −$10 | $181 | $100 | −$291 | -0.7% | KBE-E18 (decline, dip) |
| 49 | deep | 2023-03-13 | 36.30 | 2023-03-14 | 37.04 | trailing stop | 1 | $2,029 | $30 | $101 | $1,898 | -1.4% | KBE-E19 (decline, dip) |
| 50 | deep | 2023-03-15 | 36.70 | 2023-03-17 | 37.16 | trailing stop gap | 2 | $1,253 | $60 | $101 | $1,092 | -3.3% | KBE-E19 (decline, dip) |
| 51 | deep | 2023-03-21 | 37.73 | 2023-03-27 | 37.46 | maximum hold | 6 | −$715 | $181 | $100 | −$996 | -9.0% | KBE-E19 (decline, dip) |
| 52 | deep | 2023-03-30 | 37.69 | 2023-04-03 | 37.22 | maximum hold | 4 | −$1,246 | $121 | $99 | −$1,466 | -3.0% | KBE-E19 (decline, dip) |
| 53 | deep | 2023-04-10 | 36.55 | 2023-04-17 | 36.24 | maximum hold | 7 | −$848 | $211 | $100 | −$1,158 | -1.2% | KBE-E19 (decline, dip) |
| 54 | deep | 2023-04-19 | 37.75 | 2023-04-24 | 36.88 | maximum hold | 5 | −$2,303 | $151 | $99 | −$2,553 | -3.0% | KBE-E19 (decline, dip) |
| 55 | deep | 2023-04-27 | 36.27 | 2023-05-02 | 35.54 | maximum hold | 5 | −$2,012 | $151 | $99 | −$2,261 | -2.0% | KBE-E19 (decline, dip) |
| 56 | deep | 2023-05-04 | 31.92 | 2023-05-09 | 32.95 | trailing stop gap | 5 | $3,225 | $151 | $102 | $2,973 | -1.5% | KBE-E19 (decline, dip) |
| 57 | deep | 2023-05-15 | 33.02 | 2023-05-24 | 35.01 | trailing stop | 9 | $6,021 | $271 | $103 | $5,647 | -0.8% | KBE-E19 (rebound, dip) |
| 58 | deep | 2023-06-01 | 34.77 | 2023-06-12 | 36.98 | trailing stop | 11 | $6,351 | $332 | $103 | $5,916 | -0.6% | KBE-E19 (rebound, dip) |
| 59 | deep | 2023-06-14 | 38.26 | 2023-06-20 | 36.88 | maximum hold | 6 | −$3,605 | $181 | $98 | −$3,884 | -3.7% | KBE-E19 (rebound, dip) |
| 60 | deep | 2023-06-27 | 35.78 | 2023-07-06 | 35.58 | maximum hold | 9 | −$559 | $271 | $100 | −$930 | -1.8% | KBE-E19 (rebound, dip) |
| 61 | deep | 2023-07-10 | 36.95 | 2023-08-02 | 40.92 | trailing stop | 23 | $10,737 | $693 | $105 | $9,939 | -1.3% | KBE-E19 (rebound, dip) |
| 62 | continuation | 2023-08-24 | 38.66 | 2023-08-28 | 38.50 | maximum hold | 4 | −$414 | $121 | $100 | −$634 | -2.5% | KBE-E20 (decline, dip) |
| 63 | deep | 2023-09-11 | 38.62 | 2023-09-15 | 38.27 | maximum hold | 4 | −$906 | $121 | $99 | −$1,126 | -1.9% | KBE-E20 (decline, dip) |
| 64 | deep | 2023-09-29 | 37.07 | 2023-10-03 | 35.77 | maximum hold | 4 | −$3,505 | $121 | $98 | −$3,724 | -3.6% | KBE-E20 (decline, dip) |
| 65 | deep | 2023-10-05 | 36.13 | 2023-10-09 | 36.01 | maximum hold | 4 | −$332 | $121 | $100 | −$552 | -1.7% | KBE-E20 (decline, dip) |
| 66 | deep | 2023-10-17 | 37.07 | 2023-10-23 | 34.83 | maximum hold | 6 | −$6,040 | $181 | $97 | −$6,317 | -6.2% | KBE-E20 (decline, dip) |
| 67 | deep | 2023-10-26 | 35.09 | 2023-10-30 | 35.15 | maximum hold | 4 | $171 | $121 | $100 | −$50 | -2.1% | KBE-E20 (rebound, dip) |
| 68 | deep | 2023-11-02 | 36.09 | 2023-11-08 | 37.31 | trailing stop | 6 | $3,368 | $181 | $102 | $3,085 | -0.1% | KBE-E20 (rebound, dip) |
| 69 | deep | 2023-11-14 | 38.36 | 2023-12-19 | 45.54 | trailing stop | 35 | $18,713 | $1,055 | $109 | $17,549 | -0.3% | KBE-E20 (rebound, dip) |

### KBE:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-12-18 | 37.96 | 2018-12-31 | 37.27 | maximum hold | 13 | −$1,817 | $392 | $99 | −$2,308 | -8.0% | KBE-E04 (decline, dip) |
| 2 | deep | 2019-01-02 | 36.99 | 2019-03-06 | 44.24 | trailing stop | 63 | $19,597 | $1,899 | $110 | $17,588 | -0.6% | KBE-E04 (rebound, dip) |
| 3 | continuation | 2019-03-22 | 41.03 | 2019-05-09 | 44.12 | trailing stop gap | 48 | $7,527 | $1,447 | $104 | $5,977 | -2.4% | KBE-E05 (decline, dip) |
| 4 | continuation | 2019-05-31 | 41.01 | 2019-06-25 | 41.79 | trailing stop | 25 | $1,912 | $753 | $101 | $1,057 | -0.6% | KBE-E06 (decline, dip) |
| 5 | continuation | 2019-08-05 | 41.61 | 2019-08-19 | 41.40 | maximum hold | 14 | −$504 | $422 | $100 | −$1,026 | -4.8% | KBE-E06 (decline, dip) |
| 6 | deep | 2020-03-09 | 32.78 | 2020-03-23 | 25.00 | maximum hold | 14 | −$23,722 | $422 | $88 | −$24,232 | -26.5% | KBE-E07 (decline, dip) |
| 7 | deep | 2020-03-24 | 24.68 | 2020-03-27 | 27.54 | trailing stop gap | 3 | $11,583 | $90 | $106 | $11,386 | -1.1% | KBE-E08 (rebound, dip) |
| 8 | deep | 2020-03-30 | 26.84 | 2020-04-08 | 27.56 | trailing stop | 9 | $2,686 | $271 | $101 | $2,314 | -10.2% | KBE-E09 (decline, dip) |
| 9 | deep | 2020-04-09 | 29.89 | 2020-04-21 | 27.05 | maximum hold | 12 | −$9,497 | $362 | $95 | −$9,954 | -14.2% | KBE-E09 (rebound) |
| 10 | deep | 2020-04-22 | 27.90 | 2020-04-30 | 31.69 | trailing stop | 8 | $13,571 | $241 | $107 | $13,223 | -3.5% | KBE-E10 (rebound, dip) |
| 11 | deep | 2020-05-01 | 30.25 | 2020-05-13 | 27.25 | maximum hold | 12 | −$9,912 | $362 | $95 | −$10,369 | -10.0% | KBE-E11 (decline, dip) |
| 12 | deep | 2020-05-14 | 25.21 | 2020-05-19 | 28.21 | trailing stop | 5 | $11,897 | $151 | $106 | $11,640 | -1.7% | KBE-E11 (rebound, dip) |
| 13 | deep | 2020-05-20 | 28.80 | 2020-05-28 | 32.22 | trailing stop | 8 | $11,860 | $241 | $106 | $11,513 | -0.6% | KBE-E11 (rebound, dip) |
| 14 | deep | 2020-05-29 | 31.48 | 2020-06-09 | 36.64 | trailing stop | 11 | $16,391 | $332 | $108 | $15,952 | -1.2% | — |
| 15 | deep | 2020-06-10 | 35.27 | 2020-06-22 | 32.29 | maximum hold | 12 | −$8,445 | $362 | $96 | −$8,902 | -11.8% | KBE-E12 (decline, dip) |
| 16 | deep | 2020-06-23 | 33.27 | 2020-07-06 | 31.03 | maximum hold | 13 | −$6,729 | $392 | $97 | −$7,218 | -11.0% | KBE-E12 (decline, dip) |
| 17 | deep | 2020-07-07 | 30.01 | 2020-07-17 | 30.51 | trailing stop | 10 | $1,665 | $301 | $101 | $1,263 | -6.1% | KBE-E12 (decline, dip) |
| 18 | deep | 2020-07-20 | 29.99 | 2020-07-27 | 31.00 | trailing stop | 7 | $3,352 | $211 | $102 | $3,039 | -1.0% | KBE-E12 (rebound, dip) |
| 19 | deep | 2020-07-28 | 31.04 | 2020-08-12 | 33.36 | trailing stop | 15 | $7,477 | $452 | $104 | $6,922 | -1.9% | KBE-E12 (rebound, dip) |
| 20 | deep | 2020-08-13 | 33.12 | 2020-08-25 | 32.79 | maximum hold | 12 | −$996 | $362 | $99 | −$1,457 | -6.7% | KBE-E13 (decline, dip) |
| 21 | deep | 2020-08-26 | 32.32 | 2020-09-08 | 32.19 | buffered intraday loss | 13 | −$391 | $392 | $100 | −$883 | -3.1% | KBE-E13 (decline, dip) |
| 22 | deep | 2020-09-09 | 31.60 | 2020-09-21 | 29.96 | maximum hold | 12 | −$5,187 | $362 | $97 | −$5,646 | -5.3% | KBE-E13 (decline, dip) |
| 23 | deep | 2020-09-22 | 29.39 | 2020-10-13 | 32.13 | trailing stop | 21 | $9,301 | $633 | $105 | $8,564 | -5.4% | KBE-E13 (decline, dip) |
| 24 | deep | 2020-10-14 | 32.49 | 2020-10-26 | 33.55 | trailing stop | 12 | $3,254 | $362 | $102 | $2,791 | -3.5% | KBE-E13 (rebound) |
| 25 | deep | 2020-10-27 | 33.71 | 2020-11-04 | 33.89 | trailing stop | 8 | $523 | $241 | $100 | $182 | -6.8% | — |
| 26 | deep | 2020-11-05 | 33.33 | 2020-11-11 | 37.62 | trailing stop | 6 | $12,876 | $181 | $106 | $12,589 | -0.1% | — |
| 27 | continuation | 2021-01-27 | 43.35 | 2021-02-26 | 50.69 | trailing stop gap | 30 | $16,923 | $904 | $108 | $15,911 | -1.8% | — |
| 28 | continuation | 2021-03-22 | 52.00 | 2021-04-06 | 52.38 | maximum hold | 15 | $730 | $452 | $100 | $178 | -5.0% | — |
| 29 | continuation | 2021-06-18 | 50.90 | 2021-06-30 | 51.15 | maximum hold | 12 | $491 | $362 | $100 | $29 | -2.1% | KBE-E14 (decline, dip) |
| 30 | continuation | 2021-07-19 | 47.82 | 2021-08-03 | 48.91 | trailing stop | 15 | $2,284 | $452 | $101 | $1,731 | -2.0% | KBE-E14 (decline, dip) |
| 31 | continuation | 2021-09-20 | 48.79 | 2021-10-13 | 53.60 | trailing stop | 23 | $9,859 | $693 | $105 | $9,061 | -1.1% | KBE-E14 (rebound, dip) |
| 32 | continuation | 2021-11-30 | 53.76 | 2021-12-13 | 53.72 | buffered intraday loss | 13 | −$74 | $392 | $100 | −$566 | -1.4% | KBE-E15 (decline, dip) |
| 33 | deep | 2022-06-13 | 44.08 | 2022-06-29 | 44.08 | buffered intraday loss | 16 | $11 | $482 | $100 | −$571 | -3.3% | KBE-E16 (decline, dip) |
| 34 | deep | 2022-06-30 | 43.32 | 2022-07-14 | 43.09 | maximum hold | 14 | −$531 | $422 | $100 | −$1,052 | -1.1% | KBE-E16 (rebound, dip) |
| 35 | deep | 2022-07-15 | 44.04 | 2022-08-22 | 50.23 | trailing stop gap | 38 | $14,048 | $1,145 | $107 | $12,796 | -1.1% | KBE-E16 (rebound, dip) |
| 36 | continuation | 2022-09-06 | 46.46 | 2022-09-13 | 47.78 | trailing stop | 7 | $2,845 | $211 | $101 | $2,533 | -1.0% | KBE-E17 (decline, dip) |
| 37 | continuation | 2022-09-23 | 45.03 | 2022-10-07 | 45.71 | trailing stop | 14 | $1,519 | $422 | $101 | $996 | -2.4% | KBE-E17 (decline, dip) |
| 38 | deep | 2022-10-13 | 44.09 | 2022-10-19 | 46.54 | trailing stop | 6 | $5,558 | $181 | $103 | $5,274 | -0.4% | KBE-E17 (rebound, dip) |
| 39 | continuation | 2022-12-06 | 46.40 | 2022-12-19 | 43.73 | maximum hold | 13 | −$5,751 | $392 | $97 | −$6,240 | -6.0% | KBE-E18 (decline, dip) |
| 40 | deep | 2023-03-13 | 36.44 | 2023-03-14 | 37.08 | trailing stop | 1 | $1,743 | $30 | $101 | $1,612 | -3.7% | KBE-E19 (decline, dip) |
| 41 | deep | 2023-03-15 | 35.70 | 2023-03-17 | 37.16 | trailing stop gap | 2 | $4,088 | $60 | $102 | $3,925 | -0.6% | KBE-E19 (decline, dip) |
| 42 | deep | 2023-03-20 | 36.76 | 2023-04-03 | 36.71 | buffered intraday loss | 14 | −$136 | $422 | $100 | −$658 | -6.6% | KBE-E19 (decline, dip) |
| 43 | deep | 2023-04-04 | 36.64 | 2023-04-17 | 36.24 | maximum hold | 13 | −$1,091 | $392 | $99 | −$1,582 | -3.5% | KBE-E19 (decline, dip) |
| 44 | deep | 2023-04-18 | 37.13 | 2023-05-01 | 36.45 | maximum hold | 13 | −$1,830 | $392 | $99 | −$2,321 | -5.4% | KBE-E19 (decline, dip) |
| 45 | deep | 2023-05-02 | 35.43 | 2023-05-15 | 32.45 | maximum hold | 13 | −$8,407 | $392 | $96 | −$8,894 | -12.9% | KBE-E19 (decline, dip) |
| 46 | deep | 2023-05-16 | 33.37 | 2023-05-24 | 35.05 | trailing stop | 8 | $5,019 | $241 | $102 | $4,675 | -1.9% | KBE-E19 (rebound, dip) |
| 47 | deep | 2023-05-25 | 34.77 | 2023-06-12 | 37.01 | trailing stop | 18 | $6,439 | $542 | $103 | $5,793 | -3.2% | KBE-E19 (rebound, dip) |
| 48 | deep | 2023-06-13 | 37.16 | 2023-06-26 | 35.07 | maximum hold | 13 | −$5,622 | $392 | $97 | −$6,110 | -6.7% | KBE-E19 (rebound, dip) |
| 49 | deep | 2023-06-27 | 35.02 | 2023-07-06 | 35.45 | trailing stop | 9 | $1,226 | $271 | $101 | $855 | -0.4% | KBE-E19 (rebound, dip) |
| 50 | deep | 2023-07-07 | 36.03 | 2023-08-02 | 40.96 | trailing stop gap | 26 | $13,676 | $784 | $107 | $12,786 | -0.5% | KBE-E19 (rebound, dip) |
| 51 | continuation | 2023-08-16 | 39.00 | 2023-08-28 | 38.50 | maximum hold | 12 | −$1,281 | $362 | $99 | −$1,742 | -4.0% | KBE-E20 (decline, dip) |
| 52 | deep | 2023-09-21 | 36.99 | 2023-10-03 | 35.77 | maximum hold | 12 | −$3,297 | $362 | $98 | −$3,756 | -3.4% | KBE-E20 (decline, dip) |
| 53 | deep | 2023-10-04 | 35.09 | 2023-10-13 | 36.02 | trailing stop | 9 | $2,641 | $271 | $101 | $2,269 | -0.3% | KBE-E20 (decline, dip) |
| 54 | deep | 2023-10-16 | 36.46 | 2023-10-30 | 35.15 | maximum hold | 14 | −$3,591 | $422 | $98 | −$4,111 | -6.8% | KBE-E20 (decline, dip) |
| 55 | deep | 2023-10-31 | 35.31 | 2023-11-08 | 37.34 | trailing stop | 8 | $5,746 | $241 | $103 | $5,402 | -1.1% | KBE-E20 (rebound, dip) |
| 56 | deep | 2023-11-09 | 37.13 | 2023-12-19 | 45.59 | trailing stop | 40 | $22,771 | $1,205 | $111 | $21,454 | -1.8% | KBE-E20 (rebound, dip) |

### SLV:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2020-03-16 | 12.11 | 2020-03-30 | 13.07 | trailing stop gap | 14 | $7,923 | $422 | $104 | $7,398 | -10.3% | SLV-E08 (decline, dip) |
| 2 | deep | 2020-04-02 | 13.43 | 2020-04-15 | 14.32 | trailing stop | 13 | $6,635 | $392 | $103 | $6,140 | -0.7% | SLV-E08 (rebound, dip) |
| 3 | continuation | 2020-04-22 | 14.04 | 2020-05-21 | 15.92 | trailing stop | 29 | $13,375 | $874 | $107 | $12,394 | -2.2% | SLV-E08 (rebound, dip) |
| 4 | continuation | 2020-06-10 | 16.70 | 2020-07-23 | 20.76 | trailing stop | 43 | $24,321 | $1,296 | $112 | $22,913 | -5.4% | SLV-E08 (rebound) |
| 5 | continuation | 2020-07-29 | 22.49 | 2020-08-07 | 26.04 | trailing stop | 9 | $15,773 | $271 | $108 | $15,394 | -4.8% | — |
| 6 | continuation | 2020-08-12 | 24.16 | 2020-08-14 | 24.98 | trailing stop | 2 | $3,409 | $60 | $102 | $3,247 | -3.2% | SLV-E09 (rebound, dip) |
| 7 | continuation | 2020-08-20 | 25.59 | 2020-09-02 | 25.71 | trailing stop gap | 13 | $469 | $392 | $100 | −$23 | -5.2% | SLV-E09 (rebound) |
| 8 | deep | 2020-09-24 | 21.22 | 2020-09-30 | 21.98 | trailing stop | 6 | $3,595 | $181 | $102 | $3,313 | -0.5% | SLV-E10 (rebound, dip) |
| 9 | continuation | 2020-10-08 | 22.44 | 2020-10-13 | 22.69 | trailing stop gap | 5 | $1,114 | $151 | $101 | $862 | -1.9% | SLV-E10 (rebound, dip) |
| 10 | continuation | 2020-10-30 | 22.07 | 2020-11-09 | 22.78 | trailing stop gap | 10 | $3,215 | $301 | $102 | $2,813 | -1.3% | SLV-E10 (rebound, dip) |
| 11 | continuation | 2020-12-01 | 21.89 | 2020-12-09 | 22.38 | trailing stop | 8 | $2,215 | $241 | $101 | $1,873 | -0.2% | SLV-E11 (rebound, dip) |
| 12 | continuation | 2020-12-28 | 24.68 | 2021-01-06 | 24.92 | trailing stop | 9 | $957 | $271 | $100 | $585 | -2.3% | — |
| 13 | continuation | 2021-01-08 | 23.57 | 2021-02-02 | 25.54 | trailing stop gap | 25 | $8,354 | $753 | $104 | $7,496 | -3.1% | SLV-E12 (decline, dip) |
| 14 | continuation | 2021-02-05 | 24.95 | 2021-02-23 | 25.44 | trailing stop | 18 | $1,980 | $542 | $101 | $1,336 | -0.1% | SLV-E13 (decline, dip) |
| 15 | continuation | 2021-03-09 | 24.04 | 2021-04-05 | 23.01 | maximum hold | 27 | −$4,282 | $814 | $98 | −$5,194 | -7.9% | SLV-E13 (decline, dip) |
| 16 | deep | 2021-09-30 | 20.55 | 2021-10-26 | 22.24 | trailing stop | 26 | $8,242 | $784 | $104 | $7,355 | -0.3% | SLV-E14 (rebound, dip) |
| 17 | continuation | 2021-11-04 | 22.13 | 2021-11-19 | 22.75 | trailing stop | 15 | $2,800 | $452 | $101 | $2,247 | -0.7% | SLV-E14 (rebound, dip) |
| 18 | continuation | 2021-12-16 | 20.63 | 2022-01-06 | 20.38 | trailing stop gap | 21 | −$1,211 | $633 | $99 | −$1,943 | -1.2% | SLV-E15 (rebound, dip) |
| 19 | deep | 2022-07-18 | 17.45 | 2022-08-05 | 18.16 | trailing stop gap | 18 | $4,037 | $542 | $102 | $3,393 | -3.3% | SLV-E16 (decline, dip) |
| 20 | deep | 2022-09-02 | 16.80 | 2022-09-13 | 17.85 | trailing stop | 11 | $6,249 | $332 | $103 | $5,815 | -1.6% | SLV-E17 (rebound, dip) |
| 21 | deep | 2022-09-16 | 18.08 | 2022-10-05 | 18.69 | trailing stop gap | 19 | $3,372 | $573 | $102 | $2,698 | -6.7% | SLV-E17 (rebound) |
| 22 | deep | 2022-10-17 | 17.39 | 2022-10-28 | 17.54 | trailing stop | 11 | $862 | $332 | $100 | $431 | -2.8% | SLV-E18 (rebound, dip) |
| 23 | continuation | 2022-11-04 | 18.77 | 2022-11-17 | 19.25 | trailing stop gap | 13 | $2,556 | $392 | $101 | $2,063 | -0.6% | SLV-E18 (rebound) |
| 24 | continuation | 2022-12-07 | 21.00 | 2022-12-15 | 21.45 | trailing stop gap | 8 | $2,150 | $241 | $101 | $1,808 | -0.5% | — |
| 25 | continuation | 2023-01-09 | 22.05 | 2023-02-02 | 22.10 | buffered intraday loss | 24 | $204 | $723 | $100 | −$619 | -5.1% | — |

### FXI:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2020-03-18 | 33.71 | 2020-07-16 | 42.17 | trailing stop gap | 120 | $25,084 | $3,616 | $112 | $21,355 | -1.8% | FXI-E07 (decline, dip) |
| 2 | deep | 2022-03-14 | 27.66 | 2022-04-11 | 31.70 | trailing stop gap | 28 | $14,599 | $844 | $107 | $13,648 | -5.5% | FXI-E11 (decline, dip) |
| 3 | deep | 2022-04-25 | 28.93 | 2022-05-06 | 29.37 | trailing stop | 11 | $1,520 | $332 | $101 | $1,088 | -1.3% | FXI-E12 (decline, dip) |
| 4 | deep | 2022-05-09 | 28.33 | 2022-06-13 | 31.69 | trailing stop | 35 | $11,866 | $1,055 | $106 | $10,705 | -1.8% | FXI-E13 (decline, dip) |
| 5 | continuation | 2022-08-10 | 29.45 | 2022-08-19 | 29.30 | maximum hold | 9 | −$526 | $271 | $100 | −$897 | -1.0% | FXI-E14 (decline, dip) |
| 6 | deep | 2022-10-24 | 21.17 | 2023-02-06 | 30.40 | trailing stop gap | 105 | $43,578 | $3,164 | $122 | $40,292 | -1.4% | FXI-E14 (decline, dip) |
| 7 | continuation | 2023-05-31 | 25.80 | 2023-06-23 | 27.03 | trailing stop | 23 | $4,733 | $693 | $102 | $3,938 | -0.1% | FXI-E15 (decline, dip) |
| 8 | continuation | 2023-10-06 | 25.83 | 2023-10-19 | 25.71 | maximum hold | 13 | −$464 | $392 | $100 | −$956 | -0.7% | FXI-E16 (decline, dip) |

### FXI:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2020-03-18 | 33.48 | 2020-07-16 | 42.17 | trailing stop gap | 120 | $25,943 | $3,616 | $113 | $22,213 | -1.1% | FXI-E07 (decline, dip) |
| 2 | continuation | 2020-09-25 | 40.50 | 2020-12-14 | 45.63 | trailing stop | 80 | $12,668 | $2,411 | $106 | $10,151 | -0.0% | FXI-E08 (decline, dip) |
| 3 | continuation | 2021-02-26 | 49.03 | 2021-03-16 | 48.26 | maximum hold | 18 | −$1,580 | $542 | $99 | −$2,221 | -3.9% | FXI-E09 (decline, dip) |
| 4 | deep | 2022-03-14 | 27.63 | 2022-04-11 | 31.70 | trailing stop gap | 28 | $14,723 | $844 | $107 | $13,772 | -5.4% | FXI-E11 (decline, dip) |
| 5 | continuation | 2022-04-25 | 28.75 | 2022-05-06 | 29.34 | trailing stop | 11 | $2,059 | $332 | $101 | $1,626 | -0.7% | FXI-E12 (decline, dip) |
| 6 | deep | 2022-05-09 | 28.15 | 2022-06-13 | 31.66 | trailing stop | 35 | $12,459 | $1,055 | $106 | $11,298 | -1.1% | FXI-E13 (decline, dip) |
| 7 | continuation | 2022-07-14 | 31.32 | 2022-08-01 | 29.86 | maximum hold | 18 | −$4,644 | $542 | $98 | −$5,284 | -4.7% | FXI-E14 (decline, dip) |
| 8 | deep | 2022-10-24 | 21.68 | 2023-02-06 | 30.40 | trailing stop gap | 105 | $40,169 | $3,164 | $120 | $36,885 | -3.8% | FXI-E14 (decline, dip) |
| 9 | continuation | 2023-02-27 | 28.27 | 2023-03-17 | 27.84 | maximum hold | 18 | −$1,520 | $542 | $99 | −$2,162 | -4.5% | FXI-E15 (decline, dip) |

### IJH:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-12-26 | 157.75 | 2019-03-06 | 188.70 | trailing stop | 70 | $19,610 | $2,110 | $110 | $17,391 | -1.0% | IJH-E02 (rebound, dip) |
| 2 | continuation | 2019-05-29 | 183.27 | 2019-08-01 | 192.80 | trailing stop | 64 | $5,200 | $1,929 | $103 | $3,169 | -1.6% | IJH-E02 (rebound) |
| 3 | deep | 2020-03-10 | 161.79 | 2020-03-11 | 164.60 | trailing stop | 1 | $1,738 | $30 | $101 | $1,607 | -0.3% | IJH-E03 (decline, dip) |
| 4 | deep | 2020-03-12 | 142.68 | 2020-03-13 | 146.50 | trailing stop | 1 | $2,672 | $30 | $101 | $2,541 | -0.8% | IJH-E03 (decline, dip) |
| 5 | deep | 2020-03-16 | 137.48 | 2020-03-17 | 136.46 | trailing stop gap | 1 | −$742 | $30 | $100 | −$871 | -5.8% | IJH-E03 (decline, dip) |
| 6 | deep | 2020-03-18 | 134.37 | 2020-03-27 | 140.78 | trailing stop gap | 9 | $4,768 | $271 | $102 | $4,394 | -12.3% | IJH-E03 (decline, dip) |
| 7 | deep | 2020-03-30 | 140.26 | 2020-04-01 | 136.97 | trailing stop gap | 2 | −$2,344 | $60 | $99 | −$2,504 | -2.3% | IJH-E03 (rebound, dip) |
| 8 | deep | 2020-04-02 | 136.43 | 2020-04-08 | 147.74 | trailing stop gap | 6 | $8,286 | $181 | $104 | $8,001 | -3.4% | IJH-E03 (rebound, dip) |
| 9 | deep | 2020-04-09 | 157.16 | 2020-04-20 | 152.67 | maximum hold | 11 | −$2,855 | $332 | $99 | −$3,285 | -6.1% | IJH-E03 (rebound, dip) |
| 10 | deep | 2020-04-21 | 149.33 | 2020-04-30 | 165.40 | trailing stop | 9 | $10,755 | $271 | $105 | $10,379 | -1.1% | IJH-E03 (rebound, dip) |
| 11 | deep | 2020-05-01 | 159.60 | 2020-05-12 | 162.37 | trailing stop | 11 | $1,732 | $332 | $101 | $1,300 | -2.7% | IJH-E03 (rebound, dip) |
| 12 | deep | 2020-05-13 | 157.94 | 2020-05-29 | 175.92 | trailing stop gap | 16 | $11,378 | $482 | $106 | $10,791 | -5.7% | IJH-E03 (rebound, dip) |
| 13 | continuation | 2020-06-11 | 177.84 | 2020-06-17 | 179.18 | trailing stop | 6 | $750 | $181 | $100 | $469 | -4.9% | IJH-E04 (decline, dip) |
| 14 | continuation | 2020-09-21 | 182.03 | 2020-10-26 | 195.27 | trailing stop | 35 | $7,268 | $1,055 | $104 | $6,110 | -3.3% | — |
| 15 | continuation | 2021-03-25 | 249.18 | 2021-05-11 | 268.56 | trailing stop gap | 47 | $7,774 | $1,416 | $104 | $6,253 | -0.7% | — |
| 16 | continuation | 2021-07-19 | 255.61 | 2021-08-19 | 263.92 | trailing stop gap | 31 | $3,249 | $934 | $102 | $2,214 | -0.3% | — |
| 17 | continuation | 2021-11-30 | 271.29 | 2021-12-13 | 273.62 | trailing stop | 13 | $860 | $392 | $100 | $368 | -2.0% | IJH-E05 (decline, dip) |
| 18 | continuation | 2022-01-21 | 262.03 | 2022-02-03 | 262.68 | maximum hold | 13 | $248 | $392 | $100 | −$244 | -5.1% | IJH-E05 (decline, dip) |
| 19 | deep | 2022-06-16 | 220.89 | 2022-06-29 | 229.47 | trailing stop | 13 | $3,882 | $392 | $102 | $3,388 | -1.3% | IJH-E06 (decline, dip) |
| 20 | deep | 2022-07-05 | 223.58 | 2022-07-13 | 225.58 | trailing stop gap | 8 | $894 | $241 | $100 | $553 | -0.3% | IJH-E06 (rebound, dip) |
| 21 | deep | 2022-07-14 | 224.26 | 2022-08-22 | 254.21 | trailing stop gap | 39 | $13,348 | $1,175 | $107 | $12,066 | -0.9% | IJH-E06 (rebound, dip) |
| 22 | continuation | 2022-09-01 | 239.37 | 2022-09-13 | 245.77 | trailing stop | 12 | $2,672 | $362 | $101 | $2,209 | -1.4% | IJH-E07 (decline, dip) |
| 23 | continuation | 2022-09-23 | 223.88 | 2022-10-07 | 227.38 | trailing stop | 14 | $1,561 | $422 | $101 | $1,038 | -2.9% | IJH-E07 (decline, dip) |
| 24 | continuation | 2022-12-16 | 241.53 | 2022-12-27 | 242.16 | maximum hold | 11 | $261 | $332 | $100 | −$171 | -2.1% | IJH-E07 (rebound) |

### IJH:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-10-26 | 177.28 | 2018-11-14 | 183.64 | trailing stop | 19 | $3,584 | $573 | $102 | $2,909 | -0.5% | IJH-E02 (decline, dip) |
| 2 | deep | 2018-12-10 | 177.07 | 2018-12-17 | 172.38 | maximum hold | 7 | −$2,647 | $211 | $99 | −$2,956 | -2.8% | IJH-E02 (decline, dip) |
| 3 | deep | 2018-12-18 | 170.81 | 2018-12-24 | 159.90 | maximum hold | 6 | −$6,384 | $181 | $97 | −$6,662 | -6.5% | IJH-E02 (decline, dip) |
| 4 | deep | 2018-12-26 | 157.08 | 2019-03-07 | 187.35 | trailing stop | 71 | $19,258 | $2,140 | $110 | $17,009 | -0.6% | IJH-E02 (rebound, dip) |
| 5 | deep | 2020-02-28 | 179.88 | 2020-03-05 | 183.50 | trailing stop | 6 | $2,012 | $181 | $101 | $1,731 | -1.6% | IJH-E03 (decline, dip) |
| 6 | deep | 2020-03-06 | 177.82 | 2020-03-11 | 164.50 | maximum hold | 5 | −$7,487 | $151 | $96 | −$7,734 | -10.5% | IJH-E03 (decline, dip) |
| 7 | deep | 2020-03-12 | 142.68 | 2020-03-13 | 145.50 | trailing stop | 1 | $1,973 | $30 | $101 | $1,842 | -0.8% | IJH-E03 (decline, dip) |
| 8 | deep | 2020-03-16 | 137.48 | 2020-03-17 | 136.46 | trailing stop gap | 1 | −$742 | $30 | $100 | −$871 | -5.8% | IJH-E03 (decline, dip) |
| 9 | deep | 2020-03-18 | 134.37 | 2020-03-23 | 124.52 | maximum hold | 5 | −$7,327 | $151 | $96 | −$7,574 | -10.3% | IJH-E03 (decline, dip) |
| 10 | deep | 2020-03-24 | 129.15 | 2020-03-27 | 140.78 | trailing stop gap | 3 | $9,005 | $90 | $104 | $8,810 | -0.5% | IJH-E03 (rebound, dip) |
| 11 | deep | 2020-03-30 | 140.26 | 2020-04-01 | 136.97 | trailing stop gap | 2 | −$2,344 | $60 | $99 | −$2,504 | -2.3% | IJH-E03 (rebound, dip) |
| 12 | deep | 2020-04-02 | 136.43 | 2020-04-08 | 146.61 | trailing stop | 6 | $7,458 | $181 | $104 | $7,173 | -3.4% | IJH-E03 (rebound, dip) |
| 13 | deep | 2020-04-09 | 157.40 | 2020-04-14 | 156.99 | maximum hold | 5 | −$260 | $151 | $100 | −$511 | -3.7% | IJH-E03 (rebound, dip) |
| 14 | deep | 2020-04-15 | 151.62 | 2020-04-21 | 149.21 | maximum hold | 6 | −$1,589 | $181 | $99 | −$1,869 | -2.7% | IJH-E03 (rebound, dip) |
| 15 | deep | 2020-04-22 | 150.31 | 2020-04-30 | 164.13 | trailing stop | 8 | $9,190 | $241 | $105 | $8,844 | -0.1% | IJH-E03 (rebound, dip) |
| 16 | deep | 2020-05-01 | 160.73 | 2020-05-13 | 158.90 | maximum hold | 12 | −$1,138 | $362 | $99 | −$1,599 | -3.4% | IJH-E03 (rebound, dip) |
| 17 | deep | 2020-05-14 | 151.68 | 2020-05-29 | 174.71 | trailing stop | 15 | $15,176 | $452 | $108 | $14,616 | -1.8% | IJH-E03 (rebound, dip) |
| 18 | deep | 2020-06-01 | 176.75 | 2020-06-10 | 187.13 | trailing stop | 9 | $5,869 | $271 | $103 | $5,495 | -0.1% | IJH-E03 (rebound) |
| 19 | deep | 2020-06-11 | 177.84 | 2020-06-18 | 177.14 | maximum hold | 7 | −$393 | $211 | $100 | −$704 | -4.9% | IJH-E04 (decline, dip) |
| 20 | deep | 2020-06-19 | 180.79 | 2020-06-24 | 176.80 | maximum hold | 5 | −$2,206 | $151 | $99 | −$2,455 | -3.2% | IJH-E04 (decline, dip) |
| 21 | deep | 2020-06-25 | 171.80 | 2020-07-09 | 174.61 | trailing stop | 14 | $1,636 | $422 | $101 | $1,114 | -0.8% | IJH-E04 (decline, dip) |
| 22 | deep | 2020-07-10 | 174.68 | 2020-09-03 | 189.82 | trailing stop | 55 | $8,664 | $1,658 | $104 | $6,902 | -0.5% | IJH-E04 (rebound, dip) |
| 23 | deep | 2020-09-21 | 181.74 | 2020-10-28 | 190.33 | trailing stop gap | 37 | $4,724 | $1,115 | $102 | $3,507 | -3.2% | — |
| 24 | deep | 2022-01-27 | 251.90 | 2022-02-11 | 263.43 | trailing stop | 15 | $4,573 | $452 | $102 | $4,019 | -1.3% | IJH-E05 (decline, dip) |
| 25 | deep | 2022-02-24 | 248.93 | 2022-03-04 | 258.53 | trailing stop | 8 | $3,856 | $241 | $102 | $3,513 | -0.2% | IJH-E05 (decline, dip) |
| 26 | deep | 2022-03-08 | 252.37 | 2022-04-05 | 266.51 | trailing stop | 28 | $5,601 | $844 | $103 | $4,654 | -1.0% | IJH-E05 (rebound, dip) |
| 27 | deep | 2022-04-27 | 251.03 | 2022-05-02 | 250.02 | maximum hold | 5 | −$402 | $151 | $100 | −$653 | -0.9% | IJH-E06 (decline, dip) |
| 28 | deep | 2022-05-03 | 252.03 | 2022-05-09 | 243.84 | maximum hold | 6 | −$3,248 | $181 | $98 | −$3,527 | -3.4% | IJH-E06 (decline, dip) |
| 29 | deep | 2022-05-10 | 241.08 | 2022-05-19 | 237.21 | maximum hold | 9 | −$1,604 | $271 | $99 | −$1,975 | -3.8% | IJH-E06 (decline, dip) |
| 30 | deep | 2022-05-20 | 236.15 | 2022-06-09 | 246.82 | trailing stop | 20 | $4,516 | $603 | $102 | $3,811 | -1.5% | IJH-E06 (decline, dip) |
| 31 | deep | 2022-06-10 | 242.34 | 2022-06-15 | 229.19 | maximum hold | 5 | −$5,423 | $151 | $97 | −$5,671 | -7.0% | IJH-E06 (decline, dip) |
| 32 | deep | 2022-06-16 | 222.37 | 2022-06-22 | 220.94 | maximum hold | 6 | −$643 | $181 | $100 | −$923 | -2.0% | IJH-E06 (decline, dip) |
| 33 | deep | 2022-06-23 | 223.86 | 2022-06-29 | 227.60 | trailing stop | 6 | $1,670 | $181 | $101 | $1,388 | -1.1% | IJH-E06 (rebound, dip) |
| 34 | deep | 2022-06-30 | 224.09 | 2022-07-14 | 224.49 | maximum hold | 14 | $178 | $422 | $100 | −$344 | -0.9% | IJH-E06 (rebound, dip) |
| 35 | deep | 2022-07-15 | 227.59 | 2022-08-22 | 254.21 | trailing stop gap | 38 | $11,691 | $1,145 | $106 | $10,440 | -0.3% | IJH-E06 (rebound, dip) |
| 36 | deep | 2022-09-01 | 240.44 | 2022-09-06 | 240.22 | maximum hold | 5 | −$91 | $151 | $100 | −$342 | -1.1% | IJH-E07 (decline, dip) |
| 37 | deep | 2022-09-07 | 238.64 | 2022-09-13 | 244.10 | trailing stop | 6 | $2,286 | $181 | $101 | $2,004 | -0.3% | IJH-E07 (decline, dip) |
| 38 | deep | 2022-09-16 | 237.40 | 2022-09-22 | 234.08 | maximum hold | 6 | −$1,398 | $181 | $99 | −$1,678 | -1.6% | IJH-E07 (decline, dip) |
| 39 | deep | 2022-09-23 | 223.78 | 2022-09-28 | 220.86 | maximum hold | 5 | −$1,304 | $151 | $99 | −$1,554 | -2.9% | IJH-E07 (decline, dip) |
| 40 | deep | 2022-09-29 | 219.53 | 2022-10-07 | 225.73 | trailing stop | 8 | $2,824 | $241 | $101 | $2,482 | -0.4% | IJH-E07 (decline, dip) |
| 41 | deep | 2022-10-10 | 226.95 | 2022-10-21 | 224.97 | maximum hold | 11 | −$872 | $332 | $100 | −$1,303 | -3.8% | IJH-E07 (rebound, dip) |
| 42 | deep | 2022-10-24 | 231.80 | 2022-11-03 | 233.66 | trailing stop gap | 10 | $802 | $301 | $100 | $400 | -1.1% | IJH-E07 (rebound, dip) |
| 43 | deep | 2022-11-04 | 238.71 | 2022-11-17 | 246.24 | trailing stop | 13 | $3,154 | $392 | $102 | $2,661 | -1.2% | IJH-E07 (rebound, dip) |
| 44 | deep | 2023-03-24 | 234.88 | 2023-04-26 | 242.03 | trailing stop | 33 | $3,042 | $995 | $101 | $1,946 | -0.1% | IJH-E08 (rebound, dip) |
| 45 | deep | 2023-10-25 | 235.26 | 2023-10-30 | 234.64 | maximum hold | 5 | −$266 | $151 | $100 | −$516 | -1.6% | IJH-E09 (decline, dip) |
| 46 | deep | 2023-10-31 | 235.01 | 2023-12-29 | 277.15 | open | 59 | $17,922 | $1,778 | $109 | $16,035 | -0.4% | IJH-E09 (rebound, dip) |

### XLB:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2020-03-12 | 43.55 | 2020-03-13 | 44.79 | trailing stop | 1 | $2,844 | $30 | $101 | $2,712 | -1.1% | XLB-E04 (decline, dip) |
| 2 | deep | 2020-03-16 | 40.26 | 2020-03-17 | 41.63 | trailing stop | 1 | $3,402 | $30 | $102 | $3,271 | -3.1% | XLB-E04 (decline, dip) |
| 3 | deep | 2020-03-18 | 41.30 | 2020-03-27 | 44.17 | trailing stop gap | 9 | $6,941 | $271 | $103 | $6,566 | -7.6% | XLB-E04 (decline, dip) |
| 4 | deep | 2020-03-30 | 45.11 | 2020-04-13 | 49.79 | trailing stop | 14 | $10,363 | $422 | $105 | $9,836 | -6.0% | XLB-E04 (rebound, dip) |
| 5 | continuation | 2020-04-15 | 49.14 | 2020-05-01 | 50.98 | trailing stop gap | 16 | $3,743 | $482 | $102 | $3,159 | -3.3% | XLB-E04 (rebound, dip) |
| 6 | continuation | 2020-05-13 | 50.39 | 2020-06-11 | 56.85 | trailing stop gap | 29 | $12,814 | $874 | $106 | $11,833 | -4.1% | XLB-E04 (rebound) |
| 7 | continuation | 2020-06-12 | 54.68 | 2020-06-22 | 55.62 | trailing stop | 10 | $1,718 | $301 | $101 | $1,316 | -2.5% | XLB-E04 (rebound) |
| 8 | continuation | 2020-06-24 | 54.67 | 2020-07-09 | 56.61 | trailing stop | 15 | $3,538 | $452 | $102 | $2,984 | -1.4% | XLB-E04 (rebound) |
| 9 | continuation | 2020-07-30 | 60.11 | 2020-09-03 | 63.88 | trailing stop | 35 | $6,262 | $1,055 | $103 | $5,104 | -0.8% | — |
| 10 | continuation | 2020-09-21 | 62.97 | 2020-10-26 | 64.49 | trailing stop | 35 | $2,416 | $1,055 | $101 | $1,260 | -3.2% | — |
| 11 | continuation | 2020-10-28 | 62.01 | 2020-11-10 | 69.73 | trailing stop | 13 | $12,445 | $392 | $106 | $11,947 | -0.8% | — |
| 12 | continuation | 2020-11-12 | 67.77 | 2021-01-15 | 74.89 | trailing stop | 64 | $10,505 | $1,929 | $105 | $8,471 | -0.1% | — |
| 13 | continuation | 2021-01-25 | 73.06 | 2021-03-23 | 76.60 | trailing stop | 57 | $4,839 | $1,718 | $102 | $3,019 | -4.2% | — |
| 14 | continuation | 2021-05-13 | 85.92 | 2021-06-11 | 86.45 | maximum hold | 29 | $617 | $874 | $100 | −$358 | -0.6% | — |
| 15 | deep | 2022-09-23 | 68.21 | 2022-10-07 | 70.18 | trailing stop | 14 | $2,892 | $422 | $101 | $2,368 | -2.0% | XLB-E08 (decline, dip) |
| 16 | deep | 2022-10-13 | 67.36 | 2022-10-14 | 68.26 | trailing stop | 1 | $1,332 | $30 | $101 | $1,201 | -0.7% | XLB-E08 (rebound, dip) |
| 17 | continuation | 2022-11-03 | 71.91 | 2022-11-17 | 79.00 | trailing stop gap | 14 | $9,855 | $422 | $105 | $9,328 | -0.5% | XLB-E08 (rebound, dip) |
| 18 | continuation | 2022-12-15 | 80.06 | 2023-01-19 | 80.98 | trailing stop | 35 | $1,147 | $1,055 | $101 | −$8 | -4.2% | — |

### MTUM:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-12-24 | 94.18 | 2019-08-02 | 118.66 | trailing stop | 221 | $25,980 | $6,660 | $113 | $19,207 | -1.4% | MTUM-E03 (decline, dip) |
| 2 | continuation | 2020-02-28 | 119.43 | 2020-03-05 | 125.34 | trailing stop | 6 | $4,949 | $181 | $102 | $4,666 | -2.5% | MTUM-E04 (decline, dip) |
| 3 | deep | 2020-03-12 | 106.09 | 2020-03-13 | 107.94 | trailing stop | 1 | $1,745 | $30 | $101 | $1,614 | -1.8% | MTUM-E04 (decline, dip) |
| 4 | deep | 2020-03-16 | 98.72 | 2020-03-17 | 102.07 | trailing stop gap | 1 | $3,392 | $30 | $102 | $3,260 | -1.6% | MTUM-E04 (decline, dip) |
| 5 | deep | 2020-03-18 | 101.16 | 2020-03-27 | 104.81 | trailing stop gap | 9 | $3,606 | $271 | $102 | $3,233 | -12.2% | MTUM-E04 (decline, dip) |
| 6 | deep | 2020-03-30 | 107.82 | 2020-04-21 | 114.65 | trailing stop | 22 | $6,336 | $663 | $103 | $5,570 | -7.3% | MTUM-E04 (rebound, dip) |
| 7 | deep | 2022-01-24 | 154.65 | 2022-01-27 | 157.58 | trailing stop | 3 | $1,891 | $90 | $101 | $1,700 | -2.1% | MTUM-E07 (decline, dip) |
| 8 | deep | 2022-01-28 | 155.54 | 2022-02-11 | 166.16 | trailing stop | 14 | $6,824 | $422 | $103 | $6,299 | -0.2% | MTUM-E07 (decline, dip) |
| 9 | deep | 2022-02-24 | 149.85 | 2022-03-04 | 156.53 | trailing stop | 8 | $4,453 | $241 | $102 | $4,110 | -0.2% | MTUM-E07 (decline, dip) |
| 10 | deep | 2022-03-08 | 150.88 | 2022-04-05 | 166.70 | trailing stop | 28 | $10,483 | $844 | $105 | $9,534 | -1.2% | MTUM-E07 (decline, dip) |
| 11 | continuation | 2022-05-02 | 146.87 | 2022-05-05 | 149.56 | trailing stop | 3 | $1,833 | $90 | $101 | $1,642 | -0.0% | MTUM-E08 (decline, dip) |
| 12 | deep | 2022-05-12 | 135.43 | 2022-05-18 | 138.67 | trailing stop | 6 | $2,389 | $181 | $101 | $2,107 | -0.8% | MTUM-E08 (decline, dip) |
| 13 | deep | 2022-05-19 | 137.80 | 2022-06-10 | 141.42 | trailing stop gap | 22 | $2,626 | $663 | $101 | $1,861 | -3.3% | MTUM-E08 (decline, dip) |
| 14 | deep | 2022-06-13 | 137.18 | 2022-07-11 | 137.30 | maximum hold | 28 | $87 | $844 | $100 | −$856 | -5.5% | MTUM-E08 (decline, dip) |
| 15 | deep | 2022-07-13 | 135.52 | 2022-08-30 | 142.36 | trailing stop | 48 | $5,045 | $1,447 | $102 | $3,496 | -2.2% | MTUM-E08 (rebound, dip) |
| 16 | continuation | 2023-03-15 | 134.01 | 2023-05-02 | 139.36 | trailing stop | 48 | $3,987 | $1,447 | $102 | $2,439 | -1.5% | MTUM-E10 (decline, dip) |

### MTUM:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-12-24 | 94.25 | 2019-08-05 | 117.32 | trailing stop gap | 224 | $24,465 | $6,751 | $112 | $17,602 | -1.5% | MTUM-E03 (decline, dip) |
| 2 | continuation | 2019-10-03 | 116.05 | 2020-02-24 | 131.25 | trailing stop gap | 144 | $13,091 | $4,340 | $106 | $8,645 | -0.3% | — |
| 3 | continuation | 2020-02-27 | 124.67 | 2020-03-06 | 122.66 | trailing stop gap | 8 | −$1,611 | $241 | $99 | −$1,952 | -6.6% | MTUM-E04 (decline, dip) |
| 4 | deep | 2020-03-12 | 106.09 | 2020-03-13 | 107.72 | trailing stop | 1 | $1,534 | $30 | $101 | $1,403 | -1.8% | MTUM-E04 (decline, dip) |
| 5 | deep | 2020-03-16 | 98.72 | 2020-03-17 | 102.07 | trailing stop gap | 1 | $3,392 | $30 | $102 | $3,260 | -1.6% | MTUM-E04 (decline, dip) |
| 6 | deep | 2020-03-18 | 101.16 | 2020-04-01 | 102.42 | trailing stop gap | 14 | $1,245 | $422 | $101 | $722 | -12.2% | MTUM-E04 (decline, dip) |
| 7 | deep | 2020-04-02 | 101.38 | 2020-04-08 | 107.57 | trailing stop | 6 | $6,103 | $181 | $103 | $5,819 | -1.4% | MTUM-E04 (rebound, dip) |
| 8 | deep | 2020-04-13 | 110.97 | 2020-04-21 | 114.37 | trailing stop | 8 | $3,062 | $241 | $101 | $2,720 | -0.5% | MTUM-E04 (rebound, dip) |
| 9 | continuation | 2020-06-12 | 126.33 | 2020-07-14 | 136.39 | trailing stop gap | 32 | $7,963 | $964 | $104 | $6,894 | -3.3% | MTUM-E04 (rebound) |
| 10 | continuation | 2020-07-24 | 136.61 | 2020-09-03 | 150.64 | trailing stop | 41 | $10,263 | $1,236 | $105 | $8,922 | -0.4% | — |
| 11 | continuation | 2020-09-04 | 142.55 | 2020-09-17 | 142.44 | maximum hold | 13 | −$77 | $392 | $100 | −$569 | -1.9% | MTUM-E05 (decline, dip) |
| 12 | deep | 2022-01-24 | 154.65 | 2022-01-27 | 157.25 | trailing stop | 3 | $1,679 | $90 | $101 | $1,488 | -2.1% | MTUM-E07 (decline, dip) |
| 13 | deep | 2022-01-28 | 155.54 | 2022-02-11 | 165.94 | trailing stop | 14 | $6,680 | $422 | $103 | $6,155 | -0.2% | MTUM-E07 (decline, dip) |
| 14 | continuation | 2022-02-18 | 159.54 | 2022-03-02 | 159.69 | maximum hold | 12 | $91 | $362 | $100 | −$371 | -7.1% | MTUM-E07 (decline, dip) |
| 15 | deep | 2022-03-08 | 150.88 | 2022-04-05 | 166.31 | trailing stop | 28 | $10,222 | $844 | $105 | $9,273 | -1.2% | MTUM-E07 (decline, dip) |
| 16 | continuation | 2022-04-25 | 152.50 | 2022-05-09 | 143.80 | maximum hold | 14 | −$5,702 | $422 | $97 | −$6,221 | -5.8% | MTUM-E08 (decline, dip) |
| 17 | deep | 2022-05-10 | 142.40 | 2022-05-23 | 138.06 | maximum hold | 13 | −$3,046 | $392 | $98 | −$3,536 | -6.4% | MTUM-E08 (decline, dip) |
| 18 | deep | 2022-05-24 | 136.82 | 2022-06-10 | 141.42 | trailing stop gap | 17 | $3,360 | $512 | $102 | $2,746 | -0.5% | MTUM-E08 (decline, dip) |
| 19 | deep | 2022-06-13 | 137.28 | 2022-06-27 | 137.52 | maximum hold | 14 | $178 | $422 | $100 | −$344 | -5.6% | MTUM-E08 (decline, dip) |
| 20 | deep | 2022-06-29 | 138.06 | 2022-07-11 | 137.30 | maximum hold | 12 | −$550 | $362 | $100 | −$1,012 | -3.5% | MTUM-E08 (rebound, dip) |
| 21 | deep | 2022-07-13 | 135.77 | 2022-08-30 | 142.06 | trailing stop | 48 | $4,631 | $1,447 | $102 | $3,082 | -2.3% | MTUM-E08 (rebound, dip) |
| 22 | continuation | 2022-09-22 | 138.58 | 2022-10-04 | 135.85 | maximum hold | 12 | −$1,969 | $362 | $99 | −$2,430 | -5.4% | MTUM-E09 (decline, dip) |

### XHB:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-10-30 | 33.33 | 2018-12-06 | 33.80 | trailing stop | 37 | $1,417 | $1,115 | $101 | $201 | -0.4% | XHB-E03 (rebound, dip) |
| 2 | deep | 2018-12-26 | 32.00 | 2019-05-29 | 38.79 | trailing stop | 154 | $21,221 | $4,641 | $111 | $16,469 | -2.2% | XHB-E04 (rebound, dip) |
| 3 | deep | 2020-03-12 | 32.84 | 2020-03-13 | 33.43 | trailing stop | 1 | $1,794 | $30 | $101 | $1,663 | 0.0% | XHB-E05 (decline, dip) |
| 4 | deep | 2020-03-17 | 28.39 | 2020-03-30 | 29.91 | trailing stop | 13 | $5,358 | $392 | $103 | $4,864 | -15.6% | XHB-E05 (decline, dip) |
| 5 | deep | 2020-04-06 | 28.35 | 2020-04-13 | 32.52 | trailing stop | 7 | $14,684 | $211 | $107 | $14,366 | -0.7% | XHB-E06 (rebound, dip) |
| 6 | deep | 2020-04-17 | 32.64 | 2020-05-01 | 35.26 | trailing stop gap | 14 | $8,023 | $422 | $104 | $7,497 | -6.0% | — |
| 7 | deep | 2020-05-05 | 36.19 | 2020-06-11 | 42.54 | trailing stop gap | 37 | $17,538 | $1,115 | $109 | $16,314 | -7.5% | — |
| 8 | continuation | 2020-06-15 | 42.47 | 2020-09-04 | 51.04 | trailing stop | 81 | $20,179 | $2,441 | $110 | $17,628 | -2.1% | — |
| 9 | continuation | 2020-09-22 | 53.12 | 2020-10-26 | 54.43 | trailing stop | 34 | $2,467 | $1,025 | $101 | $1,341 | -4.4% | — |
| 10 | continuation | 2020-11-03 | 54.63 | 2021-01-29 | 60.25 | trailing stop | 87 | $10,282 | $2,622 | $105 | $7,555 | -2.2% | — |
| 11 | continuation | 2021-03-01 | 63.86 | 2021-05-12 | 75.41 | trailing stop | 72 | $18,070 | $2,170 | $109 | $15,791 | -6.9% | — |
| 12 | continuation | 2021-05-26 | 74.64 | 2021-06-23 | 71.86 | maximum hold | 28 | −$3,723 | $844 | $98 | −$4,665 | -7.0% | XHB-E07 (decline, dip) |
| 13 | deep | 2022-04-12 | 63.27 | 2022-05-10 | 62.56 | maximum hold | 28 | −$1,122 | $844 | $99 | −$2,065 | -5.3% | XHB-E08 (decline, dip) |
| 14 | deep | 2022-05-12 | 60.26 | 2022-06-10 | 60.44 | maximum hold | 29 | $299 | $874 | $100 | −$676 | -6.2% | XHB-E08 (decline, dip) |
| 15 | deep | 2022-06-23 | 53.77 | 2022-08-22 | 63.50 | trailing stop | 60 | $18,087 | $1,808 | $109 | $16,169 | -0.6% | XHB-E08 (rebound, dip) |
| 16 | deep | 2022-09-08 | 60.88 | 2022-10-06 | 58.57 | maximum hold | 28 | −$3,800 | $844 | $98 | −$4,742 | -11.9% | XHB-E09 (decline, dip) |
| 17 | deep | 2022-10-13 | 56.51 | 2022-12-16 | 61.19 | trailing stop | 64 | $8,271 | $1,929 | $104 | $6,238 | -6.2% | XHB-E09 (decline, dip) |
| 18 | deep | 2023-01-04 | 62.20 | 2023-02-21 | 67.68 | trailing stop gap | 48 | $8,806 | $1,447 | $104 | $7,255 | -1.6% | XHB-E09 (rebound) |
| 19 | continuation | 2023-03-21 | 66.81 | 2023-08-17 | 79.43 | trailing stop | 149 | $18,874 | $4,490 | $109 | $14,275 | -4.5% | XHB-E10 (decline, dip) |
| 20 | continuation | 2023-10-10 | 76.69 | 2023-11-07 | 76.39 | maximum hold | 28 | −$391 | $844 | $100 | −$1,335 | -9.6% | XHB-E11 (decline, dip) |

### EWW:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-05-21 | 45.93 | 2018-06-18 | 44.70 | maximum hold | 28 | −$2,666 | $844 | $99 | −$3,608 | -5.2% | EWW-E06 (decline, dip) |
| 2 | deep | 2018-06-19 | 44.53 | 2018-08-10 | 50.20 | trailing stop gap | 52 | $12,714 | $1,567 | $106 | $11,041 | -0.5% | EWW-E06 (rebound, dip) |
| 3 | continuation | 2018-10-31 | 42.18 | 2018-11-08 | 44.28 | trailing stop | 8 | $4,976 | $241 | $102 | $4,633 | -0.5% | EWW-E07 (decline, dip) |
| 4 | deep | 2018-11-09 | 41.19 | 2018-11-12 | 41.88 | trailing stop | 3 | $1,663 | $90 | $101 | $1,471 | -0.8% | EWW-E07 (decline, dip) |
| 5 | deep | 2018-11-13 | 41.05 | 2018-12-10 | 40.64 | maximum hold | 27 | −$998 | $814 | $99 | −$1,911 | -8.6% | EWW-E07 (decline, dip) |
| 6 | deep | 2018-12-12 | 40.53 | 2019-02-11 | 43.93 | trailing stop | 61 | $8,384 | $1,838 | $104 | $6,441 | -3.1% | EWW-E07 (rebound, dip) |
| 7 | deep | 2019-02-14 | 43.02 | 2019-02-28 | 43.46 | trailing stop | 14 | $1,020 | $422 | $100 | $498 | -0.1% | EWW-E07 (rebound, dip) |
| 8 | deep | 2019-03-08 | 41.92 | 2019-03-22 | 43.52 | trailing stop | 14 | $3,807 | $422 | $102 | $3,283 | -0.0% | EWW-E07 (rebound, dip) |
| 9 | deep | 2019-03-28 | 43.50 | 2019-05-02 | 45.52 | trailing stop | 35 | $4,649 | $1,055 | $102 | $3,492 | -0.6% | EWW-E07 (rebound, dip) |
| 10 | deep | 2019-05-31 | 42.71 | 2019-06-07 | 43.21 | trailing stop gap | 7 | $1,170 | $211 | $101 | $859 | -0.6% | EWW-E08 (decline, dip) |
| 11 | continuation | 2019-08-15 | 38.41 | 2019-10-02 | 42.13 | trailing stop | 48 | $9,696 | $1,447 | $105 | $8,144 | -0.1% | EWW-E08 (rebound, dip) |
| 12 | continuation | 2020-02-28 | 39.63 | 2020-03-05 | 42.46 | trailing stop | 6 | $7,148 | $181 | $104 | $6,863 | -0.0% | EWW-E09 (decline, dip) |
| 13 | deep | 2020-03-09 | 35.64 | 2020-03-11 | 36.48 | trailing stop | 2 | $2,356 | $60 | $101 | $2,194 | -0.2% | EWW-E09 (decline, dip) |
| 14 | deep | 2020-03-12 | 32.30 | 2020-03-16 | 30.10 | trailing stop gap | 4 | −$6,808 | $121 | $97 | −$7,025 | -6.8% | EWW-E09 (decline, dip) |
| 15 | deep | 2020-03-17 | 29.87 | 2020-03-18 | 28.59 | trailing stop gap | 1 | −$4,283 | $30 | $98 | −$4,411 | -4.3% | EWW-E09 (decline, dip) |
| 16 | deep | 2020-03-19 | 27.52 | 2020-03-20 | 27.62 | trailing stop | 1 | $360 | $30 | $100 | $230 | -1.2% | EWW-E09 (decline, dip) |
| 17 | deep | 2020-03-23 | 25.89 | 2020-03-27 | 28.62 | trailing stop gap | 4 | $10,539 | $121 | $105 | $10,314 | -3.3% | EWW-E09 (decline, dip) |
| 18 | deep | 2020-03-30 | 27.43 | 2020-04-01 | 27.05 | trailing stop gap | 2 | −$1,385 | $60 | $99 | −$1,544 | -1.4% | EWW-E10 (decline, dip) |
| 19 | deep | 2020-04-02 | 27.10 | 2020-04-08 | 27.29 | trailing stop | 6 | $711 | $181 | $100 | $430 | -6.9% | EWW-E10 (decline, dip) |
| 20 | deep | 2020-04-09 | 28.53 | 2020-05-01 | 28.69 | trailing stop gap | 22 | $561 | $663 | $100 | −$203 | -7.8% | EWW-E10 (rebound) |
| 21 | deep | 2020-05-04 | 28.28 | 2020-05-13 | 29.87 | trailing stop | 9 | $5,604 | $271 | $103 | $5,230 | -0.3% | EWW-E10 (rebound) |
| 22 | deep | 2020-05-14 | 28.85 | 2020-05-19 | 29.35 | trailing stop | 5 | $1,723 | $151 | $101 | $1,471 | -0.1% | — |
| 23 | deep | 2020-05-20 | 30.08 | 2020-05-29 | 31.20 | trailing stop | 9 | $3,722 | $271 | $102 | $3,348 | -0.9% | — |
| 24 | deep | 2020-06-01 | 32.11 | 2020-06-09 | 34.83 | trailing stop | 8 | $8,478 | $241 | $104 | $8,133 | -0.3% | — |
| 25 | deep | 2020-06-10 | 34.40 | 2020-07-06 | 33.58 | maximum hold | 26 | −$2,383 | $784 | $99 | −$3,265 | -8.9% | EWW-E11 (decline, dip) |
| 26 | deep | 2020-07-09 | 32.32 | 2020-08-04 | 32.20 | maximum hold | 26 | −$371 | $784 | $100 | −$1,254 | -5.0% | EWW-E11 (decline, dip) |
| 27 | deep | 2020-08-05 | 33.11 | 2020-08-26 | 33.66 | trailing stop | 21 | $1,653 | $633 | $101 | $919 | -0.7% | EWW-E11 (rebound, dip) |
| 28 | deep | 2020-08-28 | 33.64 | 2020-09-23 | 32.04 | maximum hold | 26 | −$4,754 | $784 | $98 | −$5,635 | -4.9% | EWW-E11 (rebound, dip) |
| 29 | deep | 2020-09-24 | 31.37 | 2020-10-02 | 32.55 | trailing stop gap | 8 | $3,760 | $241 | $102 | $3,417 | -0.5% | EWW-E11 (rebound, dip) |
| 30 | deep | 2020-10-06 | 34.20 | 2020-10-15 | 34.59 | trailing stop | 9 | $1,136 | $271 | $101 | $765 | -2.3% | EWW-E11 (rebound) |
| 31 | deep | 2020-10-16 | 35.47 | 2020-12-09 | 42.21 | trailing stop | 54 | $18,996 | $1,627 | $109 | $17,259 | -5.8% | EWW-E11 (rebound) |
| 32 | deep | 2022-06-16 | 45.29 | 2022-06-30 | 46.05 | trailing stop | 14 | $1,680 | $422 | $101 | $1,157 | -0.7% | EWW-E15 (decline, dip) |
| 33 | deep | 2022-07-05 | 45.63 | 2022-08-02 | 45.94 | maximum hold | 28 | $679 | $844 | $100 | −$265 | -4.0% | EWW-E15 (decline, dip) |
| 34 | deep | 2022-08-03 | 45.25 | 2022-08-26 | 46.79 | trailing stop | 23 | $3,403 | $693 | $102 | $2,608 | -0.5% | EWW-E15 (decline, dip) |
| 35 | deep | 2022-09-01 | 44.22 | 2022-09-16 | 45.92 | trailing stop | 15 | $3,846 | $452 | $102 | $3,292 | -0.3% | EWW-E15 (decline, dip) |
| 36 | deep | 2022-09-27 | 44.35 | 2022-11-30 | 52.37 | trailing stop | 64 | $18,067 | $1,929 | $109 | $16,030 | -0.7% | EWW-E15 (rebound, dip) |
| 37 | deep | 2023-10-06 | 53.71 | 2023-10-18 | 54.43 | trailing stop | 12 | $1,335 | $362 | $101 | $872 | -0.4% | EWW-E16 (decline, dip) |
| 38 | deep | 2023-10-23 | 53.12 | 2023-11-09 | 58.23 | trailing stop | 17 | $9,622 | $512 | $105 | $9,005 | -0.6% | EWW-E16 (decline, dip) |

### EWW:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2018-05-21 | 45.85 | 2018-06-14 | 44.95 | maximum hold | 24 | −$1,962 | $723 | $99 | −$2,784 | -5.0% | EWW-E06 (decline, dip) |
| 2 | deep | 2018-06-19 | 44.39 | 2018-07-02 | 46.01 | trailing stop | 13 | $3,652 | $392 | $102 | $3,158 | -0.2% | EWW-E06 (rebound, dip) |
| 3 | continuation | 2018-10-31 | 42.59 | 2018-11-08 | 44.74 | trailing stop | 8 | $5,049 | $241 | $102 | $4,705 | -2.3% | EWW-E07 (decline, dip) |
| 4 | deep | 2018-11-09 | 41.10 | 2018-11-12 | 42.28 | trailing stop gap | 3 | $2,870 | $90 | $101 | $2,678 | -0.5% | EWW-E07 (decline, dip) |
| 5 | deep | 2018-11-13 | 40.86 | 2018-12-07 | 40.87 | maximum hold | 24 | $24 | $723 | $100 | −$799 | -8.2% | EWW-E07 (decline, dip) |
| 6 | deep | 2018-12-10 | 40.48 | 2019-01-22 | 44.19 | trailing stop | 43 | $9,168 | $1,296 | $105 | $7,768 | -2.9% | EWW-E07 (rebound, dip) |
| 7 | deep | 2019-02-14 | 42.86 | 2019-02-27 | 43.91 | trailing stop | 13 | $2,453 | $392 | $101 | $1,960 | -0.0% | EWW-E07 (rebound, dip) |
| 8 | deep | 2019-03-05 | 43.20 | 2019-03-22 | 43.97 | trailing stop | 17 | $1,782 | $512 | $101 | $1,169 | -4.2% | EWW-E07 (rebound, dip) |
| 9 | deep | 2019-03-28 | 43.35 | 2019-04-24 | 46.00 | trailing stop | 27 | $6,104 | $814 | $103 | $5,187 | -0.3% | EWW-E07 (rebound, dip) |
| 10 | deep | 2019-05-31 | 42.70 | 2019-06-07 | 43.21 | trailing stop gap | 7 | $1,182 | $211 | $101 | $870 | -0.6% | EWW-E08 (decline, dip) |
| 11 | deep | 2019-08-15 | 38.24 | 2019-09-25 | 42.57 | trailing stop | 41 | $11,326 | $1,236 | $106 | $9,985 | 0.0% | EWW-E08 (rebound, dip) |
| 12 | continuation | 2020-02-28 | 40.52 | 2020-03-05 | 42.83 | trailing stop gap | 6 | $5,698 | $181 | $103 | $5,414 | -3.5% | EWW-E09 (decline, dip) |
| 13 | deep | 2020-03-09 | 35.51 | 2020-03-11 | 36.80 | trailing stop gap | 2 | $3,631 | $60 | $102 | $3,469 | -0.2% | EWW-E09 (decline, dip) |
| 14 | deep | 2020-03-12 | 33.35 | 2020-03-16 | 30.10 | trailing stop gap | 4 | −$9,740 | $121 | $95 | −$9,956 | -9.7% | EWW-E09 (decline, dip) |
| 15 | deep | 2020-03-17 | 30.38 | 2020-03-18 | 28.59 | trailing stop gap | 1 | −$5,889 | $30 | $97 | −$6,016 | -5.9% | EWW-E09 (decline, dip) |
| 16 | deep | 2020-03-19 | 27.44 | 2020-03-20 | 27.91 | trailing stop | 1 | $1,701 | $30 | $101 | $1,570 | -0.9% | EWW-E09 (decline, dip) |
| 17 | deep | 2020-03-23 | 25.81 | 2020-03-27 | 28.62 | trailing stop gap | 4 | $10,882 | $121 | $105 | $10,656 | -3.0% | EWW-E09 (decline, dip) |
| 18 | deep | 2020-03-30 | 27.29 | 2020-04-01 | 27.05 | trailing stop gap | 2 | −$879 | $60 | $100 | −$1,039 | -0.9% | EWW-E10 (decline, dip) |
| 19 | deep | 2020-04-02 | 27.10 | 2020-04-08 | 27.58 | trailing stop | 6 | $1,760 | $181 | $101 | $1,478 | -6.9% | EWW-E10 (decline, dip) |
| 20 | deep | 2020-04-09 | 28.89 | 2020-04-30 | 29.45 | trailing stop | 21 | $1,951 | $633 | $101 | $1,218 | -8.9% | EWW-E10 (rebound) |
| 21 | deep | 2020-05-01 | 27.96 | 2020-05-06 | 29.22 | trailing stop | 5 | $4,509 | $151 | $102 | $4,256 | -0.4% | EWW-E10 (rebound, dip) |
| 22 | deep | 2020-05-07 | 29.77 | 2020-05-12 | 30.18 | trailing stop | 5 | $1,365 | $151 | $101 | $1,114 | -0.4% | EWW-E10 (rebound) |
| 23 | deep | 2020-05-14 | 28.71 | 2020-05-19 | 29.65 | trailing stop | 5 | $3,283 | $151 | $102 | $3,030 | -0.2% | — |
| 24 | deep | 2020-05-20 | 29.92 | 2020-05-29 | 31.52 | trailing stop | 9 | $5,362 | $271 | $103 | $4,988 | -0.4% | — |
| 25 | deep | 2020-06-01 | 32.03 | 2020-06-04 | 33.73 | trailing stop | 3 | $5,295 | $90 | $103 | $5,102 | -0.1% | — |
| 26 | deep | 2020-06-05 | 35.32 | 2020-06-29 | 31.58 | maximum hold | 24 | −$10,584 | $723 | $95 | −$11,402 | -11.1% | — |
| 27 | deep | 2020-06-30 | 31.69 | 2020-07-07 | 32.57 | trailing stop gap | 7 | $2,776 | $211 | $101 | $2,463 | -0.6% | EWW-E11 (decline, dip) |
| 28 | deep | 2020-07-08 | 32.02 | 2020-07-30 | 32.82 | trailing stop | 22 | $2,496 | $663 | $101 | $1,732 | -4.1% | EWW-E11 (decline, dip) |
| 29 | deep | 2020-07-31 | 32.48 | 2020-08-20 | 34.01 | trailing stop | 20 | $4,703 | $603 | $102 | $3,998 | -1.4% | EWW-E11 (rebound, dip) |
| 30 | deep | 2020-08-24 | 34.27 | 2020-09-17 | 34.27 | maximum hold | 24 | $15 | $723 | $100 | −$809 | -5.8% | EWW-E11 (rebound) |
| 31 | deep | 2020-09-21 | 32.44 | 2020-10-02 | 32.55 | trailing stop gap | 11 | $354 | $332 | $100 | −$77 | -5.0% | EWW-E11 (rebound, dip) |
| 32 | deep | 2020-10-05 | 34.20 | 2020-10-15 | 34.66 | trailing stop gap | 10 | $1,344 | $301 | $101 | $942 | -2.3% | EWW-E11 (rebound) |
| 33 | deep | 2020-10-16 | 35.38 | 2020-10-27 | 35.62 | trailing stop | 11 | $673 | $332 | $100 | $242 | -1.8% | EWW-E11 (rebound) |
| 34 | deep | 2020-10-28 | 34.30 | 2020-11-10 | 38.04 | trailing stop gap | 13 | $10,898 | $392 | $105 | $10,401 | -2.6% | — |
| 35 | deep | 2022-06-16 | 45.15 | 2022-06-29 | 46.52 | trailing stop | 13 | $3,044 | $392 | $101 | $2,551 | -0.4% | EWW-E15 (decline, dip) |
| 36 | deep | 2022-07-05 | 45.49 | 2022-08-02 | 45.77 | trailing stop gap | 28 | $615 | $844 | $100 | −$329 | -3.7% | EWW-E15 (decline, dip) |
| 37 | deep | 2022-08-03 | 45.10 | 2022-08-05 | 45.41 | trailing stop | 2 | $677 | $60 | $100 | $517 | -0.1% | EWW-E15 (decline, dip) |
| 38 | deep | 2022-08-30 | 45.32 | 2022-09-13 | 46.40 | trailing stop | 14 | $2,382 | $422 | $101 | $1,859 | -3.7% | EWW-E15 (decline, dip) |
| 39 | deep | 2022-09-26 | 44.83 | 2022-11-03 | 50.68 | trailing stop gap | 38 | $13,043 | $1,145 | $106 | $11,791 | -2.3% | EWW-E15 (decline, dip) |
| 40 | deep | 2023-10-06 | 53.53 | 2023-10-13 | 54.99 | trailing stop | 7 | $2,734 | $211 | $101 | $2,422 | -0.1% | EWW-E16 (decline, dip) |
| 41 | deep | 2023-10-20 | 53.73 | 2023-11-08 | 58.84 | trailing stop | 19 | $9,506 | $573 | $105 | $8,829 | -2.4% | EWW-E16 (decline, dip) |

### EDV:representative

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2020-03-13 | 155.00 | 2020-03-17 | 161.62 | trailing stop | 4 | $4,275 | $121 | $102 | $4,052 | -1.8% | EDV-E04 (decline, dip) |
| 2 | deep | 2020-03-18 | 146.84 | 2020-03-31 | 166.07 | trailing stop | 13 | $13,090 | $392 | $106 | $12,592 | -3.4% | EDV-E04 (decline, dip) |
| 3 | continuation | 2020-06-09 | 160.00 | 2020-08-12 | 168.50 | trailing stop | 64 | $5,307 | $1,929 | $103 | $3,275 | -0.9% | EDV-E05 (rebound, dip) |
| 4 | continuation | 2020-10-28 | 162.50 | 2020-11-23 | 162.36 | maximum hold | 26 | −$86 | $784 | $100 | −$970 | -5.2% | EDV-E06 (decline, dip) |
| 5 | deep | 2022-05-10 | 101.34 | 2022-06-06 | 101.10 | maximum hold | 27 | −$237 | $814 | $100 | −$1,150 | -1.8% | EDV-E07 (decline, dip) |
| 6 | deep | 2022-10-25 | 76.80 | 2022-12-19 | 90.44 | trailing stop | 55 | $17,751 | $1,658 | $109 | $15,985 | -1.4% | EDV-E08 (rebound, dip) |
| 7 | continuation | 2023-01-03 | 85.55 | 2023-02-07 | 89.50 | trailing stop | 35 | $4,615 | $1,055 | $102 | $3,458 | -1.7% | EDV-E09 (rebound, dip) |
| 8 | continuation | 2023-03-03 | 86.13 | 2023-03-14 | 89.49 | trailing stop gap | 11 | $3,905 | $332 | $102 | $3,472 | -1.0% | EDV-E10 (rebound, dip) |
| 9 | continuation | 2023-05-31 | 86.14 | 2023-06-29 | 86.13 | maximum hold | 29 | −$12 | $874 | $100 | −$986 | -2.2% | EDV-E11 (decline, dip) |
| 10 | deep | 2023-10-23 | 64.75 | 2023-12-29 | 81.03 | open | 67 | $25,130 | $2,019 | $113 | $22,999 | -2.5% | EDV-E11 (rebound, dip) |

### EDV:alternative-1

| # | setup | entry | entry px | exit | exit px | reason | days | gross | interest | friction | net | MAE | episode (phase) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | deep | 2020-03-18 | 144.57 | 2020-03-24 | 161.45 | trailing stop | 6 | $11,670 | $181 | $106 | $11,384 | -1.9% | EDV-E04 (decline, dip) |
| 2 | continuation | 2020-06-05 | 155.06 | 2020-06-16 | 160.17 | trailing stop gap | 11 | $3,291 | $332 | $102 | $2,857 | -0.6% | EDV-E05 (decline, dip) |
| 3 | continuation | 2020-11-12 | 157.64 | 2020-12-02 | 157.26 | maximum hold | 20 | −$241 | $603 | $100 | −$944 | -0.4% | EDV-E06 (decline, dip) |
| 4 | deep | 2021-02-25 | 129.05 | 2021-03-08 | 129.22 | maximum hold | 11 | $131 | $332 | $100 | −$301 | -1.9% | EDV-E06 (decline, dip) |
| 5 | deep | 2021-03-22 | 125.12 | 2021-05-11 | 126.57 | maximum hold | 50 | $1,158 | $1,507 | $101 | −$449 | -0.6% | EDV-E06 (rebound, dip) |
| 6 | deep | 2022-04-20 | 107.99 | 2022-05-02 | 104.39 | maximum hold | 12 | −$3,332 | $362 | $98 | −$3,792 | -3.4% | EDV-E07 (decline, dip) |
| 7 | deep | 2022-05-09 | 99.98 | 2022-05-17 | 99.97 | trailing stop gap | 8 | −$8 | $241 | $100 | −$349 | -0.3% | EDV-E07 (decline, dip) |
| 8 | deep | 2022-05-18 | 102.38 | 2022-06-01 | 102.70 | maximum hold | 14 | $312 | $422 | $100 | −$210 | -1.2% | EDV-E07 (decline, dip) |
| 9 | deep | 2022-06-15 | 95.90 | 2022-06-27 | 96.12 | trailing stop gap | 12 | $229 | $362 | $100 | −$232 | -3.2% | EDV-E07 (rebound, dip) |
| 10 | deep | 2022-06-29 | 97.77 | 2022-07-07 | 98.91 | trailing stop | 8 | $1,165 | $241 | $101 | $824 | -0.3% | EDV-E07 (rebound, dip) |
| 11 | deep | 2022-07-11 | 98.64 | 2022-08-03 | 102.00 | trailing stop | 23 | $3,405 | $693 | $102 | $2,610 | -0.8% | EDV-E07 (rebound, dip) |
| 12 | continuation | 2022-09-07 | 93.69 | 2022-09-19 | 91.43 | maximum hold | 12 | −$2,411 | $362 | $99 | −$2,871 | -3.5% | EDV-E08 (decline, dip) |
| 13 | deep | 2022-10-24 | 75.36 | 2022-11-04 | 77.47 | trailing stop | 11 | $2,805 | $332 | $101 | $2,372 | -1.7% | EDV-E08 (decline, dip) |
| 14 | deep | 2022-11-08 | 77.34 | 2022-12-09 | 91.62 | trailing stop | 31 | $18,451 | $934 | $109 | $17,407 | -1.7% | EDV-E08 (rebound, dip) |
| 15 | continuation | 2022-12-29 | 84.34 | 2023-01-23 | 89.44 | trailing stop gap | 25 | $6,044 | $753 | $103 | $5,188 | -2.2% | EDV-E09 (rebound, dip) |
| 16 | continuation | 2023-03-03 | 85.43 | 2023-03-14 | 89.49 | trailing stop gap | 11 | $4,750 | $332 | $102 | $4,316 | -0.7% | EDV-E10 (rebound, dip) |
| 17 | continuation | 2023-08-04 | 78.53 | 2023-08-15 | 76.99 | maximum hold | 11 | −$1,960 | $332 | $99 | −$2,391 | -2.0% | EDV-E11 (decline, dip) |
| 18 | deep | 2023-10-04 | 66.60 | 2023-10-16 | 66.52 | maximum hold | 12 | −$120 | $362 | $100 | −$582 | -3.6% | EDV-E11 (decline, dip) |
| 19 | deep | 2023-10-23 | 63.80 | 2023-11-06 | 67.30 | trailing stop | 14 | $5,478 | $422 | $103 | $4,953 | -1.0% | EDV-E11 (rebound, dip) |
| 20 | deep | 2023-11-10 | 69.15 | 2023-12-29 | 81.03 | open | 49 | $17,175 | $1,477 | $109 | $15,590 | -2.2% | EDV-E11 (rebound, dip) |
