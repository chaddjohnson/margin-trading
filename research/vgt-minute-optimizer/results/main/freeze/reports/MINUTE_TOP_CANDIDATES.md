# VGT minute optimizer: top candidates (pre-holdout)

Final development run `final-2016-2023`: training window 2016-10-07 → 2023-12-29 (1819 sessions, 7.23 years), flat start with 2016-01-04 onwards as reference-high history. Ranked by the pre-declared policy (MINUTE_OPTIMIZER_DESIGN.md) at **5 bp per side**. Every figure here is **in-sample** for these candidates: they were chosen on this window. Money is per $100,000 margin allocation.

**Rank 1 (primary candidate, frozen before the final evaluation): `c134ab0f37d75`, dip 1.7%, stop 2.7%, maximum hold 9 calendar days, lookback 10 sessions, material loss 0.8%, lower re-entry 6.3%, reset 9.1%.**

## Selection summary

16,116 distinct vectors from the search (4096 Sobol, GA 0: 6012 new over 47 generations, budget; GA 1: 6008 new over 47 generations, budget), 19,213 including neighbourhood and perturbation probes. 7415 passed gates G1–G7; 105 of the 105 pool members passed G8 and were ranked. Gate rejections (a vector can fail several): drawdown 4921, trades 3160, profitable 821, yearConsistency 30, costRobust 1923, exposure 2493, notSingleTrade 2553, neighbourhoodDrawdown 0.

## Ranked shortlist

| Rank | ID | Dip | Stop | Hold (cal. days) | Lookback (sessions) | Material loss | Lower re-entry | Reset | Style | Trades | Exposure | Merit (P25 net) | Origin | Inclusion | Same-phenotype dupes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | `c134ab0f37d75` | 1.7% | 2.7% | 9 | 10 | 0.8% | 6.3% | 9.1% | shallow dip, tight stop | 132 | 80.1% | $103,189 | ga | merit | 1 |
| 2 | `cbb271678f869` | 1.9% | 2.7% | 9 | 11 | 1.8% | 6.3% | 12.5% | shallow dip, tight stop | 131 | 79.1% | $98,975 | ga | merit | 1 |
| 3 | `c338d1ab3468d` | 2.4% | 2.1% | 8 | 69 | 0.7% | 4.5% | 59.5% | shallow dip, tight stop | 125 | 57.8% | $93,183 | ga | merit | 0 |
| 4 | `cad41cac6a161` | 2.3% | 2.1% | 8 | 69 | 0.8% | 2.5% | 56.7% | shallow dip, tight stop | 152 | 65.8% | $93,070 | ga | merit | 0 |
| 5 | `c7be76b01d2d3` | 1.9% | 2.7% | 9 | 11 | 1.8% | 8.0% | 5.0% | shallow dip, tight stop | 132 | 80.8% | $90,463 | ga | merit | 0 |
| 6 | `c100a6791197e` | 2.6% | 2.2% | 8 | 206 | 1.8% | 3.1% | 56.7% | shallow dip, tight stop | 136 | 59.5% | $87,599 | ga | merit | 0 |
| 7 | `c7701a2caa45c` | 2.4% | 2.1% | 8 | 243 | 0.7% | 2.0% | 48.4% | shallow dip, tight stop | 148 | 62.6% | $86,656 | ga | merit | 0 |
| 8 | `cf0fbb4858ae4` | 2.4% | 2.1% | 8 | 165 | 1.3% | 4.8% | 46.3% | shallow dip, tight stop | 134 | 60.4% | $86,106 | ga | merit | 0 |
| 9 | `cc3b9d50785f5` | 2.3% | 2.1% | 8 | 166 | 1.7% | 3.1% | 76.8% | shallow dip, tight stop | 138 | 60.5% | $85,059 | ga | merit | 0 |
| 10 | `c0cdd6f12a664` | 2.4% | 2.1% | 8 | 71 | 1.9% | 3.0% | 77.8% | shallow dip, tight stop | 137 | 60.4% | $84,297 | ga | merit | 0 |

### Profit, costs and risk (development window, literal working-copy replays)

Each row was replayed through `src/app/allIn-minute-optimizable.ts` (the literal copy of `allIn.ts`) and checked field by field against the fast engine. Drawdowns are peak-to-trough falls of the mark to market from $0 at the window start; minute-sampled DD marks every regular-session minute close and the official close, daily DD only the closes.

| Rank | Gross (0 bp) | Interest | Net 0 bp | Net 5 bp | Net 10 bp | Net 20 bp | Turnover | Minute DD 0 bp | Daily DD 0 bp | Minute DD 5 bp | Daily DD 5 bp | Minute − daily DD | Break-even vs incumbent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $234,286 | $64,011 | $170,275 | $156,958 | $143,641 | $117,007 | $26,634,286 | $22,288 | $20,617 | $24,079 | $22,368 | $1,671 | ahead at any cost up to 500 bp |
| 2 | $230,967 | $63,649 | $167,318 | $154,103 | $140,887 | $114,456 | $26,430,967 | $17,840 | $16,323 | $18,232 | $17,075 | $1,517 | ahead at any cost up to 500 bp |
| 3 | $212,487 | $46,019 | $166,468 | $153,862 | $141,255 | $116,043 | $25,212,487 | $17,451 | $16,378 | $17,542 | $16,470 | $1,073 | ahead at any cost up to 500 bp |
| 4 | $245,822 | $52,348 | $193,474 | $178,151 | $162,828 | $132,182 | $30,645,822 | $17,626 | $16,606 | $18,012 | $17,664 | $1,020 | ahead below 142.3 bp |
| 5 | $236,901 | $64,825 | $172,076 | $158,758 | $145,439 | $118,802 | $26,636,901 | $18,699 | $17,775 | $19,190 | $18,667 | $924 | ahead at any cost up to 500 bp |
| 6 | $218,289 | $47,104 | $171,185 | $157,476 | $143,767 | $116,348 | $27,418,289 | $17,395 | $14,217 | $17,487 | $14,310 | $3,178 | ahead at any cost up to 500 bp |
| 7 | $232,070 | $49,967 | $182,103 | $167,187 | $152,271 | $122,439 | $29,832,070 | $17,626 | $14,512 | $17,717 | $14,604 | $3,115 | ahead below 143.3 bp |
| 8 | $217,599 | $48,099 | $169,500 | $155,992 | $142,483 | $115,465 | $27,017,599 | $17,420 | $14,539 | $17,511 | $14,732 | $2,881 | ahead at any cost up to 500 bp |
| 9 | $239,254 | $48,189 | $191,065 | $177,145 | $163,225 | $135,386 | $27,839,254 | $17,420 | $16,503 | $17,866 | $17,497 | $917 | ahead at any cost up to 500 bp |
| 10 | $236,013 | $47,707 | $188,306 | $174,488 | $160,670 | $133,034 | $27,636,013 | $17,420 | $14,217 | $17,511 | $14,310 | $3,203 | ahead at any cost up to 500 bp |
| incumbent | $202,867 | $49,847 | $153,020 | $139,119 | $125,217 | $97,415 | $27,802,867 | $19,370 | $17,543 | $19,661 | $17,834 | $1,827 | - |
| deep-dip | $161,625 | $42,433 | $119,193 | $116,412 | $113,631 | $108,069 | $5,561,625 | $26,287 | $23,826 | $26,574 | $24,115 | $2,461 | behind at 0 bp; ahead above 15.2 bp |

Break-even: the extra cost per side at which the candidate's net P&L equals the incumbent's (costs scale with turnover, so net(c) = net(0) − c × turnover).

### Stop-fill sensitivity (`next-open`: an intraday stop fills at the next observed trade, not the stop price)

| Rank | Net 5 bp, stop fill | Net 5 bp, next-open | Change | Minute DD next-open (0 bp) |
|---|---|---|---|---|
| 1 | $156,958 | $155,646 | -$1,313 | $22,690 |
| 2 | $154,103 | $153,148 | -$955 | $17,840 |
| 3 | $153,862 | $152,973 | -$889 | $17,533 |
| 4 | $178,151 | $176,998 | -$1,153 | $17,626 |
| 5 | $158,758 | $157,392 | -$1,365 | $18,699 |
| 6 | $157,476 | $156,926 | -$550 | $17,509 |
| 7 | $167,187 | $165,815 | -$1,372 | $17,626 |
| 8 | $155,992 | $155,509 | -$483 | $17,533 |
| 9 | $177,145 | $175,716 | -$1,429 | $17,533 |
| 10 | $174,488 | $173,455 | -$1,033 | $17,533 |
| incumbent | $139,119 | $138,348 | -$771 | $19,256 |
| deep-dip | $116,412 | $116,223 | -$189 | $26,280 |

### Net P&L by calendar year at 5 bp/side (daily mark to market, open positions included)

| Rank | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | Without 2020 | Best trade | Positive years |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | $1,715 | $19,390 | $12,183 | $29,044 | $55,287 | $11,594 | -$1,898 | $29,644 | $101,672 | $16,752 | 7 / 8 |
| 2 | $1,715 | $20,477 | $8,394 | $25,191 | $56,891 | $13,593 | -$736 | $28,577 | $97,212 | $16,752 | 7 / 8 |
| 3 | $3,756 | $3,757 | $18,778 | $35,639 | $33,271 | $11,736 | $23,960 | $22,966 | $120,591 | $12,946 | 8 / 8 |
| 4 | $2,522 | $4,750 | $9,771 | $38,492 | $64,785 | $18,539 | $15,439 | $23,853 | $113,366 | $12,946 | 8 / 8 |
| 5 | $1,715 | $20,477 | $7,206 | $30,285 | $53,440 | $13,593 | $1,435 | $30,606 | $105,318 | $16,752 | 8 / 8 |
| 6 | $3,488 | $4,078 | $3,577 | $39,838 | $63,132 | $28,475 | $11,000 | $3,887 | $94,344 | $11,275 | 8 / 8 |
| 7 | $3,756 | $3,757 | $18,518 | $41,953 | $50,309 | $10,739 | $14,492 | $23,664 | $116,878 | $12,946 | 8 / 8 |
| 8 | $3,756 | $4,735 | $22,883 | $25,659 | $38,152 | $15,658 | $20,891 | $24,257 | $117,839 | $12,946 | 8 / 8 |
| 9 | $2,522 | $4,750 | $12,316 | $35,343 | $65,103 | $20,007 | $11,681 | $25,423 | $112,042 | $11,275 | 8 / 8 |
| 10 | $3,756 | $4,735 | $23,178 | $41,106 | $65,103 | $12,732 | $12,162 | $11,717 | $109,385 | $11,275 | 8 / 8 |
| incumbent | $3,756 | $11,738 | $14,786 | $36,961 | $33,225 | $17,325 | $13,499 | $7,829 | $105,894 | $11,275 | 8 / 8 |
| deep-dip | $0 | $0 | -$935 | $24,738 | $55,311 | -$652 | -$5,417 | $43,367 | $61,100 | $47,570 | 5 / 8 |

### Parameter-neighbourhood stability

Over the candidate, its 14 one-step neighbours (each parameter moved by its radius: dip and stop ±0.5 pp, hold ±2 days, lookback ±10 sessions, material loss ±0.3 pp, lower re-entry ±0.5 pp, reset ±5 pp) and 16 joint perturbations (all parameters moved at once within those radii). "Same trades" is the share of those 30 vectors that make exactly the candidate's trades.

| Rank | P25 net (merit) | Median net | Worst net | Worst one-step neighbour | Median minute DD (one-step) | Worst minute DD (one-step) | Feasible share | Same trades | Bound flags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | $103,189 | $122,139 | $72,021 | $97,785 | $24,079 | $45,327 | 43% | 3% | lookbackSessions at/near lower bound (10 vs 10) |
| 2 | $98,975 | $111,621 | $64,643 | $101,126 | $19,284 | $38,464 | 47% | 7% | lookbackSessions at/near lower bound (11 vs 10) |
| 3 | $93,183 | $122,908 | $25,996 | $26,485 | $17,542 | $33,178 | 87% | 0% | - |
| 4 | $93,070 | $126,199 | $40,114 | $56,227 | $18,012 | $40,235 | 77% | 3% | - |
| 5 | $90,463 | $106,190 | $41,184 | $83,600 | $25,263 | $39,208 | 33% | 0% | lookbackSessions at/near lower bound (11 vs 10) |
| 6 | $87,599 | $121,056 | $6,421 | $78,220 | $17,487 | $30,119 | 90% | 7% | - |
| 7 | $86,656 | $115,546 | $25,582 | $45,624 | $17,717 | $34,107 | 77% | 3% | - |
| 8 | $86,106 | $112,868 | $45,438 | $45,438 | $17,511 | $28,160 | 90% | 3% | - |
| 9 | $85,059 | $99,345 | $28,426 | $69,726 | $17,866 | $31,426 | 90% | 3% | - |
| 10 | $84,297 | $124,971 | $29,581 | $63,724 | $17,511 | $26,948 | 94% | 3% | - |

### Trade profile

| Rank | Trades | Win rate | Profit factor | Median trade | Worst trade | Median hold (cal. days) | Stop / gap / max-hold exits | Restrictions (reentries / resets) | No-fill entry decisions |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 132 | 62% | 2.36 | $824 | -$9,364 | 11.0 | 59 / 24 / 48 | 32 (4 / 28) | 0 |
| 2 | 131 | 62% | 2.31 | $898 | -$9,364 | 11.0 | 62 / 22 / 46 | 26 (4 / 22) | 0 |
| 3 | 125 | 70% | 2.83 | $1,132 | -$9,680 | 9.0 | 69 / 19 / 37 | 27 (17 / 10) | 0 |
| 4 | 152 | 69% | 2.71 | $922 | -$9,680 | 8.0 | 83 / 27 / 42 | 32 (25 / 7) | 0 |
| 5 | 132 | 61% | 2.32 | $1,022 | -$9,364 | 11.0 | 59 / 24 / 48 | 27 (2 / 25) | 0 |
| 6 | 136 | 65% | 2.57 | $911 | -$9,680 | 8.0 | 70 / 22 / 44 | 21 (16 / 5) | 0 |
| 7 | 148 | 68% | 2.59 | $1,009 | -$9,680 | 8.0 | 80 / 27 / 41 | 33 (26 / 7) | 1 |
| 8 | 134 | 66% | 2.74 | $1,009 | -$9,680 | 8.5 | 71 / 21 / 42 | 23 (15 / 8) | 0 |
| 9 | 138 | 70% | 2.84 | $995 | -$9,680 | 8.0 | 73 / 28 / 37 | 23 (19 / 4) | 0 |
| 10 | 137 | 68% | 2.77 | $1,132 | -$9,680 | 8.0 | 72 / 26 / 39 | 21 (17 / 4) | 0 |
| incumbent | 138 | 66% | 2.34 | $970 | -$9,680 | 8.0 | 73 / 20 / 45 | 21 (12 / 9) | 1 |
| deep-dip | 27 | 48% | 3.59 | -$293 | -$9,463 | 16.0 | 9 / 4 / 13 | 12 (10 / 2) | 0 |

## The controls under the same selection policy (diagnostic)

The incumbent and the deep-dip control were scored on this window with exactly the gates and neighbourhood merit used for every candidate (`results/<experiment>/final-2016-2023/control-diagnostics.json`). They were not candidates and this does not change any ranking.

| Control | Net 5 bp | Minute DD 5 bp | Failed gates | Merit (P25 net) | Median net | Worst net | Worst one-step neighbour | Worst one-step minute DD | Feasible share | Ranked candidates with higher merit |
|---|---|---|---|---|---|---|---|---|---|---|
| incumbent | $139,119 | $19,661 | none | $75,331 | $102,227 | $18,615 | $56,155 | $32,829 | 71% | 45 |
| deep-dip | $116,412 | $26,574 | none | $70,834 | $102,059 | $55,328 | $65,253 | $33,639 | 48% | 49 |

## Seed stability and the Sobol-versus-random control (diagnostics)

The same final-window procedure, rerun with independent master seeds (different Sobol scrambles and GA streams). Not used for selection.

| Run | Rank 1 | Net 5 bp | Minute DD 5 bp | Merit | Same rank 1 as main? |
|---|---|---|---|---|---|
| final-2016-2023 | 1.7% / 2.7% / 9 d / 10 s / 0.8% / 6.3% / 9.1% | $156,958 | $24,079 | $103,189 | yes |
| replicate-1 | 1.6% / 2.1% / 8 d / 204 s / 1.5% / 2.4% / 79.9% | $176,060 | $23,178 | $94,413 | no |
| replicate-2 | 2.2% / 2.1% / 8 d / 136 s / 1.4% / 2.8% / 73.2% | $177,242 | $20,092 | $106,076 | no |

Same budget and engine, early stopping off for both arms (3 seeds each):

| Initial sampler | Seeds | Exploration hypervolume | Final archive hypervolume | Rank-1 merit |
|---|---|---|---|---|
| sobol | 3 | 0.1204 ± 0.0039 | 0.2826 ± 0.0128 | $108,341 ± $5,155 |
| random | 3 | 0.1111 ± 0.0185 | 0.2906 ± 0.0136 | $102,903 ± $5,988 |

Hypervolume is over feasible (net P&L, minute DD) points at 5 bp/side against the reference (net $0, DD $30,000), in units of the allocation squared.

Files: `minute_top_candidates.json` / `.csv` (full precision), `minute_pareto_archive.csv` (the final run's feasible non-dominated set), `results/<experiment>/final-2016-2023/evaluations.csv.gz` (every evaluated vector), and `results/<experiment>/final-2016-2023/replays/<rank>/{stop,next-open}/` (trades.csv, daily.csv, states.csv, episodes.csv, summary.json from the literal copy).
