<!-- Rendered by `npm run vgt-robustness -- report` from templates/COST_AND_FILL_SENSITIVITY.md and results/analysis.json; edit the template, not this file. -->
# Costs, financing and fills

**What was run:**
- **S:** re-simulated fresh under the prior audit's 19 scenarios, in fixed and portfolio mode, with unchanged
  definitions.
- **B4/B5:** taken from the prior audit's stored `cost` records (not re-run).

**How the costs are layered:**
- **Per-side cost:** fee/spread and extra fill slippage both enter the one per-side `costBps`. A 10-bps run therefore
  stands for 10 + 0 or 5 + 5.
- **Stop overshoot:** applied only on stop and stop-gap exits.
- **`nxo`:** fills stops at the first trade after the trigger minute. It is an execution-rule stress, not a cost.

**Why every scenario is re-simulated.** Rate and per-side cost change D1's net-profit trailing stop and its
continuation window, so paths change. The table therefore separates:
- **the same-trade re-cost:** the base lots under the scenario's costs, with no path change;
- **the path effect:** the scenario's actual net minus that re-cost.

C0 trades nothing, so it is the same in every scenario ($2,279,769; 33.89% / 35.76%).

**Limitations:**
- No break-even rate or cost exists inside the tested ranges: every scenario stays profitable for all three. None is
  extrapolated.
- Minute OHLCV cannot show quote-level fills or the order of events inside a minute.

## 1. Fixed $100,000

| Scenario | S net (Δ) | S lots +/− (exits changed) | S same-trade re-cost / path effect | B4 net (Δ) | B4 lots +/− | B5 net (Δ) | B5 lots +/− |
|---|---:|---:|---:|---:|---:|---:|---:|
| base: base: 11%, 5 bps | $176,260 (+0.0%) | +0/−0 (0) | $176,260 / +$0 | $284,245 (+0.0%) | +0/−0 | $486,208 (+0.0%) | +0/−0 |
| r08: financing 8% | $186,189 (+5.6%) | +0/−0 (0) | $186,189 / +$0 | $296,884 (+4.4%) | +1/−1 | $500,433 (+2.9%) | +1/−1 |
| r14: financing 14% | $168,477 (−4.4%) | +1/−1 (1) | $166,332 / +$2,146 | $270,493 (−4.8%) | +1/−1 | $471,800 (−3.0%) | +0/−0 |
| r18: financing 18% | $121,705 (−31.0%) | +2/−4 (2) | $153,093 / −$31,388 | $209,188 (−26.4%) | +5/−10 | $414,944 (−14.7%) | +5/−9 |
| f00: friction 0 bps/side | $178,574 (+1.3%) | +0/−0 (0) | $178,574 / +$0 | $291,775 (+2.6%) | +1/−1 | $495,747 (+2.0%) | +1/−1 |
| f02: friction 2 bps/side | $177,648 (+0.8%) | +0/−0 (0) | $177,648 / +$0 | $289,005 (+1.7%) | +0/−0 | $492,173 (+1.2%) | +0/−0 |
| f10: friction 10 bps/side (10 fee, or 5 fee + 5 slippage) | $173,949 (−1.3%) | +0/−0 (0) | $173,949 / +$0 | $275,364 (−3.1%) | +1/−1 | $476,274 (−2.0%) | +0/−0 |
| f15: friction 15 bps/side (5 fee + 10 slippage) | $171,220 (−2.9%) | +1/−1 (1) | $171,640 / −$420 | $242,606 (−14.6%) | +5/−8 | $438,416 (−9.8%) | +4/−6 |
| f20: friction 20 bps/side (20 fee, or 10 fee + 10 slippage) | $171,464 (−2.7%) | +1/−1 (1) | $169,333 / +$2,131 | $235,180 (−17.3%) | +6/−9 | $428,888 (−11.8%) | +5/−7 |
| f30: friction 30 bps/side (5 fee + 25 slippage) | $128,055 (−27.3%) | +2/−4 (2) | $164,726 / −$36,671 | $185,519 (−34.7%) | +10/−14 | $377,741 (−22.3%) | +8/−11 |
| f45: friction 45 bps/side (20 fee + 25 slippage) | $121,902 (−30.8%) | +2/−4 (2) | $157,833 / −$35,931 | $166,923 (−41.3%) | +11/−17 | $352,726 (−27.5%) | +9/−13 |
| s10: stop overshoot 10 bps | $174,638 (−0.9%) | +0/−0 (0) | $174,638 / +$0 | $279,065 (−1.8%) | +0/−0 | $479,502 (−1.4%) | +0/−0 |
| s25: stop overshoot 25 bps | $172,204 (−2.3%) | +0/−0 (0) | $172,204 / +$0 | $271,295 (−4.6%) | +0/−0 | $469,444 (−3.4%) | +0/−0 |
| s50: stop overshoot 50 bps | $168,148 (−4.6%) | +0/−0 (0) | $168,148 / +$0 | $239,148 (−15.9%) | +0/−2 | $440,192 (−9.5%) | +1/−2 |
| s100: stop overshoot 100 bps | $160,036 (−9.2%) | +0/−0 (0) | $160,036 / +$0 | $215,201 (−24.3%) | +0/−4 | $407,740 (−16.1%) | +1/−3 |
| nxo: stops fill at the next trade after the trigger minute | $176,860 (+0.3%) | +10/−10 (10) | $176,260 / +$599 | $284,959 (+0.3%) | +33/−33 | $487,267 (+0.2%) | +43/−43 |
| C1: combined: 14% + 10 fee + 10 slippage | $125,033 (−29.1%) | +2/−4 (2) | $159,404 / −$34,371 | $195,621 (−31.2%) | +10/−15 | $387,521 (−20.3%) | +9/−13 |
| C2: combined: 18% + 20 fee + 25 slippage | $102,873 (−41.6%) | +7/−8 (5) | $134,666 / −$31,792 | $143,892 (−49.4%) | +15/−20 | $325,495 (−33.1%) | +14/−17 |
| C3: combined: 18% + 20 fee + 25 slippage + 50 bps stop overshoot | $97,586 (−44.6%) | +7/−8 (5) | $126,618 / −$29,032 | $113,048 (−60.2%) | +15/−21 | $285,602 (−41.3%) | +14/−18 |

- **S stays profitable in every scenario.** The lowest net is $97,586 under C3.
- **Combined stresses** cost S −29.1% (C1), −41.6% (C2) and −44.6%
  (C3).
  - That is about B5's proportional degradation: −20.3% / −33.1% /
    −41.3%.
  - It is milder than B4's: −31.2% / −49.4% / −60.2%.
- **Single stresses short of very high rates or frictions cost S little:**
  - +10 bps per side: −1.3%;
  - 14% interest: −4.4%;
  - 100 bps of stop overshoot: −9.2%;
  - next-trade stop fills: +0.3%.
- **Losses are path-driven and lumpy.** S's large losses at r18, f30, f45 and C1–C3 are mostly **path effects**:
  - C1 −$34,371, r18 −$31,388, f30 −$36,671;
  - higher costs delay the net-profit stop's activation and remove a few lots (the "+/−" column);
  - with only 21 lots, one lost winner is a large share of net.
- **The pools' path effects are similar in dollars but come from slot reshuffling.** About
  −$54,506 at C1 for B5 and −$52,043 for B4.

**Net ÷ fixed minute drawdown:**

| Scenario | S fixed minute DD | S net ÷ minute DD (Δ) | B4 net ÷ DD (Δ) | B5 net ÷ DD (Δ) |
|---|---:|---:|---:|---:|
| base | $19,534 | 9.02 (+0.0%) | 9.92 (+0.0%) | 18.34 (+0.0%) |
| r08 | $19,386 | 9.60 (+6.4%) | 10.44 (+5.2%) | 18.97 (+3.4%) |
| r14 | $19,682 | 8.56 (−5.1%) | 9.37 (−5.5%) | 17.71 (−3.4%) |
| r18 | $18,081 | 6.73 (−25.4%) | 8.68 (−12.5%) | 15.50 (−15.5%) |
| f00 | $19,331 | 9.24 (+2.4%) | 10.43 (+5.2%) | 18.84 (+2.7%) |
| f02 | $19,412 | 9.15 (+1.4%) | 10.23 (+3.2%) | 18.65 (+1.7%) |
| f10 | $19,738 | 8.81 (−2.3%) | 9.38 (−5.4%) | 17.83 (−2.8%) |
| f15 | $19,941 | 8.59 (−4.8%) | 8.08 (−18.6%) | 16.29 (−11.2%) |
| f20 | $20,144 | 8.51 (−5.7%) | 7.65 (−22.8%) | 15.75 (−14.1%) |
| f30 | $18,400 | 6.96 (−22.9%) | 6.95 (−29.9%) | 12.51 (−31.8%) |
| f45 | $18,986 | 6.42 (−28.8%) | 5.87 (−40.8%) | 10.18 (−44.5%) |
| s10 | $19,761 | 8.84 (−2.1%) | 9.56 (−3.6%) | 17.93 (−2.2%) |
| s25 | $20,100 | 8.57 (−5.1%) | 9.05 (−8.8%) | 17.34 (−5.5%) |
| s50 | $20,665 | 8.14 (−9.8%) | 7.64 (−23.0%) | 15.93 (−13.2%) |
| s100 | $21,797 | 7.34 (−18.6%) | 6.34 (−36.1%) | 14.04 (−23.5%) |
| nxo | $19,187 | 9.22 (+2.2%) | 10.07 (+1.5%) | 18.62 (+1.5%) |
| C1 | $18,206 | 6.87 (−23.9%) | 7.62 (−23.1%) | 13.95 (−23.9%) |
| C2 | $19,318 | 5.33 (−41.0%) | 4.80 (−51.6%) | 9.06 (−50.6%) |
| C3 | $19,869 | 4.91 (−45.6%) | 3.13 (−68.4%) | 7.32 (−60.1%) |

## 2. Portfolio

Each cell is end equity, with the increment over C0 in brackets, and the daily-close / minute-sampled max % drawdown.

| Scenario | S end equity (vs C0) | S daily / minute % DD | B4 end equity (vs C0) | B4 daily / minute | B5 end equity (vs C0) | B5 daily / minute |
|---|---:|---:|---:|---:|---:|---:|
| base | $2,958,026 (+$678,257) | 32.78% / 35.21% | $3,608,484 (+$1,328,715) | 34.65% / 37.01% | $5,410,977 (+$3,131,208) | 29.67% / 31.09% |
| r08 | $3,005,156 (+$725,387) | 32.74% / 35.18% | $3,686,097 (+$1,406,328) | 34.60% / 36.97% | $5,548,821 (+$3,269,052) | 29.64% / 31.05% |
| r14 | $2,924,227 (+$644,458) | 32.81% / 35.25% | $3,524,811 (+$1,245,042) | 34.69% / 37.06% | $5,274,360 (+$2,994,591) | 29.70% / 31.12% |
| r18 | $2,704,675 (+$424,906) | 32.74% / 35.05% | $3,163,773 (+$884,004) | 34.07% / 36.44% | $4,766,040 (+$2,486,271) | 29.02% / 30.44% |
| f00 | $2,970,718 (+$690,949) | 32.73% / 35.17% | $3,661,933 (+$1,382,164) | 34.55% / 36.92% | $5,513,978 (+$3,234,209) | 29.64% / 31.03% |
| f02 | $2,965,633 (+$685,864) | 32.75% / 35.19% | $3,642,263 (+$1,362,494) | 34.59% / 36.96% | $5,475,253 (+$3,195,484) | 29.65% / 31.05% |
| f10 | $2,945,395 (+$665,626) | 32.82% / 35.25% | $3,546,472 (+$1,266,703) | 34.74% / 37.11% | $5,305,597 (+$3,025,828) | 29.70% / 31.14% |
| f15 | $2,930,382 (+$650,613) | 32.86% / 35.29% | $3,321,355 (+$1,041,586) | 34.83% / 37.20% | $4,917,228 (+$2,637,459) | 29.73% / 31.20% |
| f20 | $2,932,911 (+$653,142) | 32.90% / 35.33% | $3,273,464 (+$993,695) | 34.93% / 37.29% | $4,825,477 (+$2,545,708) | 29.75% / 31.26% |
| f30 | $2,724,599 (+$444,830) | 32.90% / 35.20% | $2,999,722 (+$719,953) | 34.40% / 36.76% | $4,408,352 (+$2,128,583) | 29.05% / 30.98% |
| f45 | $2,693,429 (+$413,660) | 33.20% / 35.49% | $2,892,219 (+$612,450) | 34.62% / 36.98% | $4,195,000 (+$1,915,231) | 29.35% / 31.77% |
| s10 | $2,949,990 (+$670,221) | 32.80% / 35.24% | $3,573,932 (+$1,294,163) | 34.71% / 37.08% | $5,343,284 (+$3,063,515) | 29.70% / 31.13% |
| s25 | $2,937,974 (+$658,205) | 32.84% / 35.28% | $3,522,703 (+$1,242,934) | 34.81% / 37.17% | $5,243,307 (+$2,963,538) | 29.74% / 31.19% |
| s50 | $2,918,051 (+$638,282) | 32.91% / 35.34% | $3,308,632 (+$1,028,863) | 34.98% / 37.33% | $4,948,547 (+$2,668,778) | 29.81% / 31.30% |
| s100 | $2,878,537 (+$598,768) | 33.05% / 35.47% | $3,165,137 (+$885,368) | 35.31% / 37.65% | $4,656,400 (+$2,376,631) | 29.95% / 31.51% |
| nxo | $2,959,442 (+$679,673) | 32.73% / 35.17% | $3,611,119 (+$1,331,350) | 34.60% / 36.97% | $5,421,868 (+$3,142,099) | 29.62% / 31.04% |
| C1 | $2,714,554 (+$434,785) | 32.85% / 35.15% | $3,069,321 (+$789,552) | 34.27% / 36.64% | $4,504,770 (+$2,225,001) | 29.04% / 30.63% |
| C2 | $2,611,755 (+$331,986) | 33.85% / 36.11% | $2,782,179 (+$502,410) | 34.66% / 37.01% | $3,995,568 (+$1,715,799) | 30.02% / 32.41% |
| C3 | $2,589,328 (+$309,560) | 33.98% / 36.24% | $2,629,970 (+$350,201) | 34.86% / 37.21% | $3,710,818 (+$1,431,049) | 30.93% / 33.29% |

- **S's portfolio stays above C0 in every scenario.** The smallest increment is +$309,560.
- **Drawdown.** S's drawdown rises from 32.78% to at most 33.98% daily and 36.24%
  minute (C3), against C0's 33.89% / 35.76%.
- **B5** stays the strongest in absolute terms in every scenario. **B4** keeps its excess drawdown over C0 in every
  scenario.

## 3. Prior-audit gate E (W3) under these scenarios

| | Lowest net in r14/f15/f20/C1 | Lowest increment over C0 in the same | C1 change | C1 net ÷ DD change | W3 |
|---|---:|---:|---:|---:|---|
| S | $125,033 | +$434,785 | −29.1% | see table | no flag |
| B4 | $195,621 | +$789,552 | −31.2% | see table | no flag |
| B5 | $387,521 | +$2,225,001 | −20.3% | see table | no flag |

(For all three, C1 is the binding scenario of the four.) **Costs are not what separates S from the pools.**
