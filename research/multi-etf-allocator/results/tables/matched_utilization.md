# Incremental value versus VGT-only B at matched borrowing and matched drawdown

B run at 10/15/20/25% of equity (risk-only) gives a frontier of end equity against borrowing-dollar-days and against the maximum daily drawdown; each allocator point is compared with B linearly interpolated at the same borrowing-dollar-days and at the same drawdown. Matching on drawdown is nearly uninformative here: the portfolio drawdown is the core's (2025-01-23 → 2025-04-08 in every run), and B's moves only from 25.0% to 25.5% across the ladder, so a drawdown match lands on B at roughly 10%. Borrowing-dollar-days is the meaningful utilization match.

| Fraction | B end equity | B daily DD | B borrowing $-days | B min equity ÷ LMV |
| --- | ---: | ---: | ---: | ---: |
| 10% | $2,049,137 | 25.0% | 86.3M | 90.2% |
| 15% | $2,193,434 | 25.2% | 134.2M | 85.9% |
| 20% | $2,346,272 | 25.3% | 185.5M | 82.0% |
| 25% | $2,508,066 | 25.5% | 240.4M | 78.4% |

| Run | Fraction | End equity | Daily DD | Borrowing $-days | B at the same $-days (difference) | B at the same DD (difference) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| C-all-primary-shadow | 10% | $2,162,978 | 24.9% | 126.3M | $2,169,799 (−$6,821) | $1,989,292 (+$173,687) |
| C-all-primary-shadow | 15% | $2,376,693 | 25.1% | 198.3M | $2,384,111 (−$7,418) | $2,109,804 (+$266,890) |
| C-all-primary-shadow | 20% | $2,608,223 | 25.2% | 276.7M | beyond B's ladder; linear extrapolation $2,615,160 (−$6,937) | $2,236,808 (+$371,415) |
| C-all-primary-shadow | 25% | $2,858,730 | 25.3% | 361.9M | beyond B's ladder; linear extrapolation $2,866,270 (−$7,539) | $2,373,530 (+$485,201) |
| C-all-lowDd-shadow | 10% | $2,276,138 | 24.9% | 124.9M | $2,165,385 (+$110,753) | $1,985,366 (+$290,772) |
| C-all-lowDd-shadow | 15% | $2,566,638 | 25.1% | 199.4M | $2,387,409 (+$179,230) | $2,104,567 (+$462,071) |
| C-all-lowDd-shadow | 20% | $2,891,291 | 25.2% | 283.4M | beyond B's ladder; linear extrapolation $2,634,752 (+$256,539) | $2,230,279 (+$661,012) |
| C-all-lowDd-shadow | 25% | $3,253,744 | 25.3% | 377.7M | beyond B's ladder; linear extrapolation $2,912,749 (+$340,995) | $2,365,901 (+$887,843) |
