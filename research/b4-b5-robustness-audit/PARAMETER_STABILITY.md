# Workstream A — parameter fragility (diagnostic-only, no optimisation)

Every configuration in this report other than the frozen B4 and B5 is **diagnostic-only**:
- it was never written to `config/`;
- it never became a candidate, benchmark or default;
- no "best" variant was selected or promoted.

All variants run on the same inspected 2016–2026 history, so neighbours are **not independent validation**. They
describe the shape of the in-sample response surface around the frozen choice.

Machine-readable results:
- `results/A_oat.csv`: every OAT point, with infeasible points and their reasons;
- `results/A_joint_samples.csv`: every joint sample with its parameter values;
- `results/runs/{oat,boundary,joint,book}.jsonl`;
- `MANIFEST.json`: every sampled configuration.

## Design (pre-registered in PROTOCOL.md §3)

- **Scope.** All eight D1 parameters of every book. GDX has no extra controls.
- **Rule.** Distances are percentage points for percentages ≥ 2.0%, a relative rule for the four percentage values
  below 2.0%, and ±10% / ±20% for integers.
- **Grid.** Points are kept on the engine's legal grid, with 0.1-pp quantization.
- **Joint neighbourhoods.** Latin hypercubes over all books at once (32 dimensions for B4, 40 for B5), N = 64 per
  seed, with 2 seeds. There are also per-book hypercubes of N = 32.
- **Modes.** Every point was re-run through the full shared allocator, in fixed and portfolio mode.

The distances and joint ranges of B5's books are below. B4's four books are the same as B5's first four.

| Book | Parameter | Frozen | Small | Moderate | Joint range (legal values) | Rule |
|---|---|---:|---:|---:|---|---|
| VGT | X (targetPercentChange) | 21.6% | ±0.5 pp | ±1.0 pp | 20.6% – 22.6% | ±0.5 / ±1.0 pp |
| VGT | Y (trailingBuyPercentage) | 0.3% | ±0.1 pp | ±0.2 pp | 0.1% – 0.5% | v < 2.0%: ±max(0.1 pp, 25%·v) / ±max(0.2 pp, 50%·v) |
| VGT | stop (trailingStopPercentage) | 7.3% | ±0.5 pp | ±1.0 pp | 6.3% – 8.3% | ±0.5 / ±1.0 pp |
| VGT | hold (maximumHoldDays) | 8 | ±1 | ±2 | 6 – 10 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| VGT | L (tickWindowSize) | 74 | ±7 | ±15 | 59 – 89 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| VGT | buffer (intradayLossBuffer) | 2.9% | ±0.5 pp | ±1.0 pp | 1.9% – 3.9% | ±0.5 / ±1.0 pp |
| VGT | P (pullback) | 9.0% | ±0.5 pp | ±1.0 pp | 8.0% – 10.0% | ±0.5 / ±1.0 pp |
| VGT | W (continuationWindow) | 60 | ±6 | ±12 | 48 – 72 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| XBI | X (targetPercentChange) | 30.0% | ±0.5 pp | ±1.0 pp | 29.0% – 30.0% (truncated by the grid) | ±0.5 / ±1.0 pp |
| XBI | Y (trailingBuyPercentage) | 1.2% | ±0.3 pp | ±0.6 pp | 0.6% – 1.8% | v < 2.0%: ±max(0.1 pp, 25%·v) / ±max(0.2 pp, 50%·v) |
| XBI | stop (trailingStopPercentage) | 3.1% | ±0.5 pp | ±1.0 pp | 2.1% – 4.1% | ±0.5 / ±1.0 pp |
| XBI | hold (maximumHoldDays) | 5 | ±1 | ±2 | 3 – 7 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| XBI | L (tickWindowSize) | 49 | ±5 | ±10 | 39 – 59 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| XBI | buffer (intradayLossBuffer) | 0.1% | ±0.1 pp | ±0.2 pp | 0.0% – 0.3% (truncated by the grid) | v < 2.0%: ±max(0.1 pp, 25%·v) / ±max(0.2 pp, 50%·v) |
| XBI | P (pullback) | 8.2% | ±0.5 pp | ±1.0 pp | 7.2% – 9.2% | ±0.5 / ±1.0 pp |
| XBI | W (continuationWindow) | 54 | ±5 | ±11 | 43 – 65 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| XRT | X (targetPercentChange) | 24.4% | ±0.5 pp | ±1.0 pp | 23.4% – 25.4% | ±0.5 / ±1.0 pp |
| XRT | Y (trailingBuyPercentage) | 4.7% | ±0.5 pp | ±1.0 pp | 3.7% – 5.7% | ±0.5 / ±1.0 pp |
| XRT | stop (trailingStopPercentage) | 8.0% | ±0.5 pp | ±1.0 pp | 7.0% – 9.0% | ±0.5 / ±1.0 pp |
| XRT | hold (maximumHoldDays) | 17 | ±2 | ±3 | 14 – 20 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| XRT | L (tickWindowSize) | 48 | ±5 | ±10 | 38 – 58 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| XRT | buffer (intradayLossBuffer) | 3.6% | ±0.5 pp | ±1.0 pp | 2.6% – 4.6% | ±0.5 / ±1.0 pp |
| XRT | P (pullback) | 6.2% | ±0.5 pp | ±1.0 pp | 5.2% – 7.2% | ±0.5 / ±1.0 pp |
| XRT | W (continuationWindow) | 120 | ±12 | ±24 | 96 – 144 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| KRE | X (targetPercentChange) | 29.9% | ±0.5 pp | ±1.0 pp | 28.9% – 30.0% (truncated by the grid) | ±0.5 / ±1.0 pp |
| KRE | Y (trailingBuyPercentage) | 2.7% | ±0.5 pp | ±1.0 pp | 1.7% – 3.7% | ±0.5 / ±1.0 pp |
| KRE | stop (trailingStopPercentage) | 3.1% | ±0.5 pp | ±1.0 pp | 2.1% – 4.1% | ±0.5 / ±1.0 pp |
| KRE | hold (maximumHoldDays) | 4 | ±1 | ±2 | 2 – 6 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| KRE | L (tickWindowSize) | 230 | ±23 | ±46 | 184 – 276 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| KRE | buffer (intradayLossBuffer) | 2.3% | ±0.5 pp | ±1.0 pp | 1.3% – 3.3% | ±0.5 / ±1.0 pp |
| KRE | P (pullback) | 9.4% | ±0.5 pp | ±1.0 pp | 8.4% – 10.4% | ±0.5 / ±1.0 pp |
| KRE | W (continuationWindow) | 60 | ±6 | ±12 | 48 – 72 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| GDX | X (targetPercentChange) | 27.4% | ±0.5 pp | ±1.0 pp | 26.4% – 28.4% | ±0.5 / ±1.0 pp |
| GDX | Y (trailingBuyPercentage) | 0.4% | ±0.1 pp | ±0.2 pp | 0.2% – 0.6% | v < 2.0%: ±max(0.1 pp, 25%·v) / ±max(0.2 pp, 50%·v) |
| GDX | stop (trailingStopPercentage) | 7.1% | ±0.5 pp | ±1.0 pp | 6.1% – 8.1% | ±0.5 / ±1.0 pp |
| GDX | hold (maximumHoldDays) | 18 | ±2 | ±4 | 14 – 22 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| GDX | L (tickWindowSize) | 100 | ±10 | ±20 | 80 – 120 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |
| GDX | buffer (intradayLossBuffer) | 3.6% | ±0.5 pp | ±1.0 pp | 2.6% – 4.6% | ±0.5 / ±1.0 pp |
| GDX | P (pullback) | 19.1% | ±0.5 pp | ±1.0 pp | 18.1% – 20.0% (truncated by the grid) | ±0.5 / ±1.0 pp |
| GDX | W (continuationWindow) | 81 | ±8 | ±16 | 65 – 97 | ±max(1, 10%·v) / ±max(s+1, 20%·v) |

3 OAT points fall outside the legal grid. They are recorded with their reason and were not
run or replaced:

| Pool | Book | Param | Point | Value | Reason |
|---|---|---|---|---:|---|
| B4 | XBI | buffer | -m | -0.1% | below the engine grid minimum 0 (not run, not replaced) |
| B5 | XBI | buffer | -m | -0.1% | below the engine grid minimum 0 (not run, not replaced) |
| B5 | GDX | P | +m | 20.1% | above the engine grid maximum 200 (not run, not replaced) |

XBI's X = 30.0% sits on the engine-grid ceiling, and KRE's X = 29.9% one step below it. Their upward points were run
outside the grid as **supplementary boundary probes**, which are excluded from every statistic:

| Pool | Book | Param | Value (outside the grid) | Fixed net | Δ vs frozen | Portfolio end | Daily % DD |
|---|---:|---:|---:|---:|---:|---:|---:|
| B4 | XBI | X | 30.0% → 30.5% | $282,569 | −$1,675 | $3,599,538 | 34.65% |
| B4 | XBI | X | 30.0% → 31.0% | $272,440 | −$11,804 | $3,539,417 | 34.65% |
| B4 | KRE | X | 29.9% → 30.4% | $284,245 | +$0 | $3,608,484 | 34.65% |
| B4 | KRE | X | 29.9% → 30.9% | $284,245 | +$0 | $3,608,484 | 34.65% |
| B5 | XBI | X | 30.0% → 30.5% | $484,532 | −$1,675 | $5,397,486 | 29.67% |
| B5 | XBI | X | 30.0% → 31.0% | $461,599 | −$24,609 | $5,176,345 | 29.67% |
| B5 | KRE | X | 29.9% → 30.4% | $486,208 | +$0 | $5,410,977 | 29.67% |
| B5 | KRE | X | 29.9% → 30.9% | $486,208 | +$0 | $5,410,977 | 29.67% |

Raising KRE's X above the ceiling leaves the funded ledger unchanged, and raising XBI's X lowers net slightly. So
neither boundary solution suggests that a better optimum was cut off by the grid. The optimiser did, however, push
both books to the deepest arming threshold it was allowed.

## One-at-a-time (OAT)

| Pool | OAT points | Run | Infeasible (not run) | Boundary probes | Profitable | Median net (÷ frozen) | P10 net | Worst net (÷ frozen) | Above frozen / equal | Lot set changed |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 | 128 | 123 | 1 | 4 | 100% | $275,692 (97%) | $256,225 | $220,699 (78%) | 14 / 27 | 78% |
| B5 | 160 | 154 | 2 | 4 | 100% | $474,416 (98%) | $431,844 | $326,687 (67%) | 11 / 35 | 77% |

- **Every** single-parameter change stays profitable: 123 of B4's points and 154 of B5's.
- The median OAT point keeps 97% (B4) and 98% (B5) of the frozen net.
- The worst keeps 78% and 67%.
- Only a few points beat the frozen net ("above / equal" column), so the frozen vector sits at or near the top of each
  single-parameter line.
- The lot set changes at most points: single parameters move the shared allocator's trade sequence.

The most sensitive parameters are ranked by the swing of fixed net across their four points:

**B4**

| Rank | Book | Parameter | Frozen | Points | Lowest net (Δ) | Highest net (Δ) | Swing | Portfolio end range |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | VGT | X | 21.6% | 4 | $220,699 (−22.4%) | $286,850 (+0.9%) | $66,151 | $3,290,640 – $3,624,374 |
| 2 | VGT | hold | 8 | 4 | $268,748 (−5.5%) | $329,286 (+15.8%) | $60,538 | $3,506,492 – $3,872,832 |
| 3 | VGT | P | 9.0% | 4 | $269,091 (−5.3%) | $317,218 (+11.6%) | $48,127 | $3,518,937 – $3,804,800 |
| 4 | VGT | stop | 7.3% | 4 | $255,697 (−10.0%) | $302,454 (+6.4%) | $46,757 | $3,436,850 – $3,859,338 |
| 5 | KRE | hold | 4 | 4 | $248,797 (−12.5%) | $284,730 (+0.2%) | $35,933 | $3,377,214 – $3,595,019 |
| 6 | XBI | L | 49 | 4 | $244,099 (−14.1%) | $279,816 (−1.6%) | $35,717 | $3,353,187 – $3,582,884 |
| 7 | VGT | Y | 0.3% | 4 | $249,281 (−12.3%) | $283,166 (−0.4%) | $33,885 | $3,408,603 – $3,604,324 |
| 8 | KRE | buffer | 2.3% | 4 | $256,065 (−9.9%) | $284,245 (+0.0%) | $28,180 | $3,411,674 – $3,608,484 |
| 9 | XRT | P | 6.2% | 4 | $260,911 (−8.2%) | $284,386 (+0.0%) | $23,475 | $3,451,686 – $3,609,445 |
| 10 | KRE | L | 230 | 4 | $261,983 (−7.8%) | $284,245 (+0.0%) | $22,261 | $3,451,450 – $3,608,484 |
| 11 | XBI | hold | 5 | 4 | $256,864 (−9.6%) | $278,928 (−1.9%) | $22,064 | $3,429,856 – $3,571,910 |
| 12 | KRE | W | 60 | 4 | $263,452 (−7.3%) | $284,245 (+0.0%) | $20,793 | $3,460,842 – $3,608,484 |
| 13 | VGT | W | 60 | 4 | $264,361 (−7.0%) | $284,245 (+0.0%) | $19,884 | $3,485,983 – $3,608,484 |
| 14 | KRE | Y | 2.7% | 4 | $246,280 (−13.4%) | $265,316 (−6.7%) | $19,035 | $3,339,311 – $3,482,336 |
| 15 | KRE | stop | 3.1% | 4 | $252,390 (−11.2%) | $271,331 (−4.5%) | $18,940 | $3,380,698 – $3,519,805 |

**B5**

| Rank | Book | Parameter | Frozen | Points | Lowest net (Δ) | Highest net (Δ) | Swing | Portfolio end range |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | VGT | X | 21.6% | 4 | $326,687 (−32.8%) | $489,264 (+0.6%) | $162,578 | $4,010,847 – $5,439,621 |
| 2 | KRE | hold | 4 | 4 | $355,581 (−26.9%) | $475,360 (−2.2%) | $119,779 | $4,106,373 – $5,295,006 |
| 3 | GDX | L | 100 | 4 | $383,102 (−21.2%) | $483,757 (−0.5%) | $100,654 | $4,465,615 – $5,385,193 |
| 4 | VGT | hold | 8 | 4 | $446,843 (−8.1%) | $535,565 (+10.2%) | $88,722 | $4,914,329 – $5,849,178 |
| 5 | GDX | buffer | 3.6% | 4 | $415,576 (−14.5%) | $486,208 (+0.0%) | $70,632 | $4,744,607 – $5,410,977 |
| 6 | XRT | P | 6.2% | 4 | $439,040 (−9.7%) | $508,457 (+4.6%) | $69,417 | $4,952,436 – $5,638,225 |
| 7 | VGT | stop | 7.3% | 4 | $443,542 (−8.8%) | $506,748 (+4.2%) | $63,206 | $5,012,694 – $5,635,911 |
| 8 | GDX | hold | 18 | 4 | $429,078 (−11.8%) | $484,353 (−0.4%) | $55,275 | $4,825,535 – $5,392,085 |
| 9 | KRE | Y | 2.7% | 4 | $399,166 (−17.9%) | $443,544 (−8.8%) | $44,378 | $4,528,437 – $4,964,646 |
| 10 | XBI | L | 49 | 4 | $440,933 (−9.3%) | $481,779 (−0.9%) | $40,847 | $4,964,607 – $5,372,419 |
| 11 | VGT | P | 9.0% | 4 | $444,958 (−8.5%) | $485,133 (−0.2%) | $40,175 | $5,024,001 – $5,401,702 |
| 12 | KRE | stop | 3.1% | 4 | $420,673 (−13.5%) | $459,735 (−5.4%) | $39,062 | $4,778,141 – $5,126,365 |
| 13 | GDX | X | 27.4% | 4 | $423,509 (−12.9%) | $462,179 (−4.9%) | $38,670 | $4,686,961 – $5,043,463 |
| 14 | GDX | P | 19.1% | 3 | $448,236 (−7.8%) | $485,309 (−0.2%) | $37,072 | $5,034,435 – $5,401,172 |
| 15 | VGT | Y | 0.3% | 4 | $451,742 (−7.1%) | $485,627 (−0.1%) | $33,885 | $5,112,267 – $5,406,480 |

VGT's arming depth X (21.6%) dominates both pools, and both directions lose.

- **At −1.0 pp (20.6%)** B4 loses 22% and B5 loses 33%. VGT arms on shallower dips and takes more lots: 20 instead of
  14 in B4, and 16 instead of 12 in B5. Those lots earn less in total ($110k against $167k in B4), and they displace
  other books from the single slot. In B5, GDX falls from 16 lots and $205k to 13 lots and $109k.
- **At +0.5 pp and +1.0 pp** B4 loses 12% at the larger move.

In B5, KRE's 4-day hold and GDX's 100-session lookback are the next most sensitive parameters. Single-parameter
sensitivity is therefore concentrated in a few parameters that govern **which book holds the slot**.

<details><summary>Full OAT grid (fixed net at each point)</summary>

**B4**

| Book | Param | Frozen | −m | −s | +s | +m |
|---|---|---:|---:|---:|---:|---:|
| VGT | X | 21.6% | 20.6%: $220,699 | 21.1%: $249,189 | 22.1%: $286,850 | 22.6%: $249,689 |
| VGT | Y | 0.3% | 0.1%: $273,224 | 0.2%: $273,166 | 0.4%: $283,166 | 0.5%: $249,281 |
| VGT | stop | 7.3% | 6.3%: $302,454 | 6.8%: $292,293 | 7.8%: $263,714 | 8.3%: $255,697 |
| VGT | hold | 8 | 6: $329,286 | 7: $277,783 | 9: $271,510 | 10: $268,748 |
| VGT | L | 74 | 59: $285,420 | 67: $284,245 | 81: $273,271 | 89: $268,035 |
| VGT | buffer | 2.9% | 1.9%: $281,706 | 2.4%: $284,245 | 3.4%: $284,245 | 3.9%: $284,245 |
| VGT | P | 9.0% | 8.0%: $269,091 | 8.5%: $283,170 | 9.5%: $315,891 | 10.0%: $317,218 |
| VGT | W | 60 | 48: $264,361 | 54: $264,361 | 66: $284,245 | 72: $284,245 |
| XBI | X | 30.0% | 29.0%: $265,906 | 29.5%: $266,194 | 30.5%: $282,569 (probe) | 31.0%: $272,440 (probe) |
| XBI | Y | 1.2% | 0.6%: $265,849 | 0.9%: $279,496 | 1.5%: $278,511 | 1.8%: $262,916 |
| XBI | stop | 3.1% | 2.1%: $284,541 | 2.6%: $285,488 | 3.6%: $272,957 | 4.1%: $267,894 |
| XBI | hold | 5 | 3: $263,217 | 4: $278,928 | 6: $261,466 | 7: $256,864 |
| XBI | L | 49 | 39: $244,099 | 44: $279,816 | 54: $267,099 | 59: $266,217 |
| XBI | buffer | 0.1% | -0.1%: infeasible | 0.0%: $284,245 | 0.2%: $283,840 | 0.3%: $283,840 |
| XBI | P | 8.2% | 7.2%: $279,096 | 7.7%: $283,574 | 8.7%: $284,245 | 9.2%: $285,730 |
| XBI | W | 54 | 43: $284,245 | 49: $284,245 | 59: $284,245 | 65: $284,245 |
| XRT | X | 24.4% | 23.4%: $279,571 | 23.9%: $281,171 | 24.9%: $275,705 | 25.4%: $274,139 |
| XRT | Y | 4.7% | 3.7%: $278,399 | 4.2%: $281,347 | 5.2%: $274,270 | 5.7%: $269,352 |
| XRT | stop | 8.0% | 7.0%: $273,148 | 7.5%: $271,355 | 8.5%: $262,824 | 9.0%: $271,345 |
| XRT | hold | 17 | 14: $283,847 | 15: $284,245 | 19: $286,360 | 20: $284,176 |
| XRT | L | 48 | 38: $274,126 | 43: $275,692 | 53: $284,245 | 58: $277,845 |
| XRT | buffer | 3.6% | 2.6%: $284,245 | 3.1%: $284,245 | 4.1%: $284,245 | 4.6%: $284,245 |
| XRT | P | 6.2% | 5.2%: $284,386 | 5.7%: $284,386 | 6.7%: $260,911 | 7.2%: $261,893 |
| XRT | W | 120 | 96: $284,245 | 108: $284,245 | 132: $284,245 | 144: $284,245 |
| KRE | X | 29.9% | 28.9%: $264,143 | 29.4%: $266,291 | 30.4%: $284,245 (probe) | 30.9%: $284,245 (probe) |
| KRE | Y | 2.7% | 1.7%: $265,316 | 2.2%: $248,404 | 3.2%: $246,280 | 3.7%: $249,383 |
| KRE | stop | 3.1% | 2.1%: $271,331 | 2.6%: $254,983 | 3.6%: $260,388 | 4.1%: $252,390 |
| KRE | hold | 4 | 2: $248,797 | 3: $262,960 | 5: $284,730 | 6: $267,207 |
| KRE | L | 230 | 184: $265,251 | 207: $284,245 | 253: $261,983 | 276: $261,983 |
| KRE | buffer | 2.3% | 1.3%: $256,065 | 1.8%: $263,234 | 2.8%: $284,245 | 3.3%: $284,245 |
| KRE | P | 9.4% | 8.4%: $260,709 | 8.9%: $271,627 | 9.9%: $263,452 | 10.4%: $263,452 |
| KRE | W | 60 | 48: $263,452 | 54: $263,452 | 66: $284,245 | 72: $284,245 |

**B5**

| Book | Param | Frozen | −m | −s | +s | +m |
|---|---|---:|---:|---:|---:|---:|
| VGT | X | 21.6% | 20.6%: $326,687 | 21.1%: $442,776 | 22.1%: $489,264 | 22.6%: $447,275 |
| VGT | Y | 0.3% | 0.1%: $474,846 | 0.2%: $474,871 | 0.4%: $485,627 | 0.5%: $451,742 |
| VGT | stop | 7.3% | 6.3%: $480,019 | 6.8%: $506,748 | 7.8%: $450,192 | 8.3%: $443,542 |
| VGT | hold | 8 | 6: $535,565 | 7: $446,843 | 9: $479,865 | 10: $477,103 |
| VGT | L | 74 | 59: $464,517 | 67: $486,208 | 81: $475,234 | 89: $469,998 |
| VGT | buffer | 2.9% | 1.9%: $483,669 | 2.4%: $486,208 | 3.4%: $486,208 | 3.9%: $486,208 |
| VGT | P | 9.0% | 8.0%: $444,958 | 8.5%: $485,133 | 9.5%: $470,963 | 10.0%: $472,322 |
| VGT | W | 60 | 48: $466,324 | 54: $466,324 | 66: $486,208 | 72: $486,208 |
| XBI | X | 30.0% | 29.0%: $467,869 | 29.5%: $468,157 | 30.5%: $484,532 (probe) | 31.0%: $461,599 (probe) |
| XBI | Y | 1.2% | 0.6%: $469,503 | 0.9%: $483,016 | 1.5%: $480,434 | 1.8%: $452,894 |
| XBI | stop | 3.1% | 2.1%: $486,369 | 2.6%: $487,451 | 3.6%: $475,216 | 4.1%: $470,495 |
| XBI | hold | 5 | 3: $438,297 | 4: $467,447 | 6: $463,429 | 7: $453,697 |
| XBI | L | 49 | 39: $440,933 | 44: $481,779 | 54: $469,062 | 59: $468,180 |
| XBI | buffer | 0.1% | -0.1%: infeasible | 0.0%: $486,208 | 0.2%: $485,803 | 0.3%: $485,803 |
| XBI | P | 8.2% | 7.2%: $481,730 | 7.7%: $486,208 | 8.7%: $486,208 | 9.2%: $487,693 |
| XBI | W | 54 | 43: $486,208 | 49: $486,208 | 59: $486,208 | 65: $486,208 |
| XRT | X | 24.4% | 23.4%: $484,607 | 23.9%: $486,208 | 24.9%: $473,080 | 25.4%: $471,514 |
| XRT | Y | 4.7% | 3.7%: $479,668 | 4.2%: $491,871 | 5.2%: $467,685 | 5.7%: $471,665 |
| XRT | stop | 8.0% | 7.0%: $473,985 | 7.5%: $472,755 | 8.5%: $441,560 | 9.0%: $450,629 |
| XRT | hold | 17 | 14: $485,810 | 15: $486,208 | 19: $485,576 | 20: $483,391 |
| XRT | L | 48 | 38: $471,501 | 43: $473,067 | 53: $486,208 | 58: $486,173 |
| XRT | buffer | 3.6% | 2.6%: $486,208 | 3.1%: $486,208 | 4.1%: $486,208 | 4.6%: $486,208 |
| XRT | P | 6.2% | 5.2%: $508,457 | 5.7%: $486,349 | 6.7%: $439,040 | 7.2%: $440,022 |
| XRT | W | 120 | 96: $486,208 | 108: $486,208 | 132: $486,208 | 144: $486,208 |
| KRE | X | 29.9% | 28.9%: $484,060 | 29.4%: $486,208 | 30.4%: $486,208 (probe) | 30.9%: $486,208 (probe) |
| KRE | Y | 2.7% | 1.7%: $423,335 | 2.2%: $403,191 | 3.2%: $443,544 | 3.7%: $399,166 |
| KRE | stop | 3.1% | 2.1%: $421,669 | 2.6%: $420,673 | 3.6%: $459,735 | 4.1%: $426,265 |
| KRE | hold | 4 | 2: $355,581 | 3: $383,711 | 5: $475,360 | 6: $420,313 |
| KRE | L | 230 | 184: $467,214 | 207: $486,208 | 253: $481,900 | 276: $481,900 |
| KRE | buffer | 2.3% | 1.3%: $465,278 | 1.8%: $472,447 | 2.8%: $486,208 | 3.3%: $486,208 |
| KRE | P | 9.4% | 8.4%: $473,558 | 8.9%: $473,590 | 9.9%: $472,665 | 10.4%: $472,665 |
| KRE | W | 60 | 48: $472,665 | 54: $472,665 | 66: $486,208 | 72: $486,208 |
| GDX | X | 27.4% | 26.4%: $423,509 | 26.9%: $462,179 | 27.9%: $460,120 | 28.4%: $461,311 |
| GDX | Y | 0.4% | 0.2%: $487,015 | 0.3%: $486,501 | 0.5%: $453,402 | 0.6%: $454,185 |
| GDX | stop | 7.1% | 6.1%: $449,542 | 6.6%: $470,606 | 7.6%: $480,969 | 8.1%: $452,601 |
| GDX | hold | 18 | 14: $442,059 | 16: $429,078 | 20: $439,945 | 22: $484,353 |
| GDX | L | 100 | 80: $383,102 | 90: $415,576 | 110: $483,757 | 120: $483,757 |
| GDX | buffer | 3.6% | 2.6%: $486,208 | 3.1%: $486,208 | 4.1%: $415,576 | 4.6%: $415,576 |
| GDX | P | 19.1% | 18.1%: $448,236 | 18.6%: $485,309 | 19.6%: $455,158 | 20.1%: infeasible |
| GDX | W | 81 | 65: $461,627 | 73: $486,208 | 89: $486,208 | 97: $486,208 |

</details>

## Joint local neighbourhoods

These are the primary designs for gate A. "Frozen percentile" is the share of neighbours below the frozen pool.

| Pool | Design | n | Median net | Median ÷ frozen | P10 – P90 net | Worst net | Net > 0 | Net ≥ ½ frozen | Net > frozen | Frozen percentile | Median minute DD | Median net ÷ DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 | joint, all books (seed 1, primary) | 64 | $133,373 | 47% | $78,299 – $180,899 | $3,758 | 100% | 41% | 0% | 100% | $44,868 | 3.02 |
| B4 | joint, all books (seed 2) | 64 | $132,919 | 47% | $91,019 – $183,935 | $65,595 | 100% | 41% | 0% | 100% | $42,239 | 3.30 |
| B4 | one book: VGT | 32 | $259,971 | 91% | $221,584 – $303,990 | $202,276 | 100% | 100% | 19% | 81% | $28,454 | 9.04 |
| B4 | one book: XBI | 32 | $241,318 | 85% | $214,197 – $264,280 | $206,894 | 100% | 100% | 0% | 100% | $29,926 | 8.24 |
| B4 | one book: XRT | 32 | $270,635 | 95% | $259,206 – $281,076 | $252,612 | 100% | 100% | 9% | 91% | $28,659 | 9.43 |
| B4 | one book: KRE | 32 | $220,844 | 78% | $199,580 – $238,752 | $191,566 | 100% | 100% | 0% | 100% | $39,617 | 5.41 |
| B5 | joint, all books (seed 1, primary) | 64 | $229,955 | 47% | $131,692 – $309,427 | $94,955 | 100% | 47% | 0% | 100% | $40,797 | 5.79 |
| B5 | joint, all books (seed 2) | 64 | $221,132 | 45% | $156,072 – $289,663 | $82,999 | 100% | 39% | 0% | 100% | $41,364 | 5.29 |
| B5 | one book: VGT | 32 | $461,410 | 95% | $404,185 – $485,970 | $361,387 | 100% | 100% | 13% | 88% | $26,801 | 16.87 |
| B5 | one book: XBI | 32 | $433,792 | 89% | $415,528 – $456,732 | $396,155 | 100% | 100% | 0% | 100% | $26,721 | 16.25 |
| B5 | one book: XRT | 32 | $471,514 | 97% | $458,461 – $514,748 | $411,444 | 100% | 100% | 25% | 75% | $26,510 | 17.78 |
| B5 | one book: KRE | 32 | $388,852 | 80% | $339,387 – $429,018 | $326,728 | 100% | 100% | 0% | 100% | $33,065 | 12.54 |
| B5 | one book: GDX | 32 | $375,903 | 77% | $339,912 – $450,498 | $326,160 | 100% | 100% | 0% | 100% | $26,559 | 13.91 |

**Profitability is broad, but the magnitude is an isolated in-sample peak:**

- **Profitable everywhere.** All 128 joint samples of each pool are net-profitable (two seeds of 64). The worst B4
  sample still earns $3,758, and the worst B5 sample $82,999.
- **About half the frozen net.** The median joint neighbour earns only 47% (B4, seed 1;
  47% seed 2) and 47% (B5, seed 1; 45% seed 2)
  of the frozen net. The two seeds agree, so this is not sampling noise.
- **Never beaten.** **No** joint neighbour of either pool beats the frozen net (the frozen percentile is 100%).
  Perturbing every book at once by up to the moderate distance halves the profit. That is the expected signature of
  a configuration selected as the maximum of a large search over the same history.
- **This is gate A's flag.** Earlier stages evaluated about 20,000–22,500 candidate vectors per ETF
  (`research/multi-etf-d1`), plus 14,540 GDX/pool evaluations (`research/portfolio-aware-d1-optimization`). The
  joint median sits just below the pre-registered 50% threshold, so **gate A raises a flag for both pools**:
  100% profitable, median 46.9% of frozen → **FLAG** (B4); 100% profitable, median 47.3% of frozen → **FLAG** (B5).
- **Some books are sharper than others.** The per-book neighbourhoods show which books are sharply tuned:
  - B4: KRE's neighbours keep 78% and XBI's 85%, while VGT's keep
    91% and XRT's 95%;
  - B5: GDX keeps 77%, KRE 80%, XBI 89%, VGT
    95% and XRT 97%.

  KRE and GDX (and XBI) sit at the 100th percentile of their own neighbourhoods. VGT and XRT sit on flatter ground.
- **GDX against frozen B4.** Every GDX-perturbed B5 still beats the frozen B4. The lowest of 32 earns
  $326,160 against B4's $284,245, and the lowest portfolio end is $3,890,108 against B4's
  $3,608,484.

## Portfolio risk across the neighbourhoods

| Pool | Design | Median end equity | P10 – P90 | Worst | Beats C0 | Frozen percentile | Median daily % DD (range) | Daily > 30% | Daily > 35% | Median minute % DD | Minute > 35% |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 | joint, all books (seed 1, primary) | $2,758,498 | $2,522,766 – $2,991,635 | $2,250,068 | 98% | 100% | 35.3% (32.7% – 37.7%) | 100% | 56% | 37.4% | 98% |
| B4 | joint, all books (seed 2) | $2,754,090 | $2,560,077 – $2,980,465 | $2,436,148 | 100% | 100% | 35.0% (33.1% – 37.5%) | 100% | 45% | 37.2% | 100% |
| B4 | one book: VGT | $3,474,775 | $3,276,008 – $3,750,153 | $3,195,185 | 100% | 63% | 34.0% (32.9% – 35.6%) | 100% | 3% | 36.0% | 97% |
| B4 | one book: XBI | $3,334,240 | $3,177,396 – $3,494,684 | $3,128,967 | 100% | 100% | 34.8% (34.6% – 35.2%) | 100% | 3% | 37.2% | 100% |
| B4 | one book: XRT | $3,518,141 | $3,440,821 – $3,588,654 | $3,388,654 | 100% | 91% | 34.6% (34.6% – 34.6%) | 100% | 0% | 37.0% | 100% |
| B4 | one book: KRE | $3,180,261 | $3,033,265 – $3,286,201 | $3,001,182 | 100% | 100% | 34.7% (33.2% – 35.1%) | 100% | 16% | 37.1% | 100% |
| B5 | joint, all books (seed 1, primary) | $3,299,287 | $2,767,356 – $3,828,522 | $2,587,263 | 100% | 100% | 35.2% (32.0% – 39.3%) | 100% | 55% | 37.2% | 89% |
| B5 | joint, all books (seed 2) | $3,218,599 | $2,889,563 – $3,736,042 | $2,587,520 | 100% | 100% | 35.7% (29.4% – 40.3%) | 97% | 59% | 37.6% | 83% |
| B5 | one book: VGT | $5,165,780 | $4,661,670 – $5,408,328 | $4,410,850 | 100% | 91% | 29.7% (29.0% – 33.8%) | 41% | 0% | 31.7% | 6% |
| B5 | one book: XBI | $4,892,596 | $4,728,475 – $5,119,711 | $4,570,598 | 100% | 100% | 32.4% (29.7% – 35.0%) | 94% | 3% | 34.8% | 47% |
| B5 | one book: XRT | $5,268,673 | $5,147,886 – $5,673,868 | $4,706,191 | 100% | 75% | 29.7% (29.7% – 30.0%) | 0% | 0% | 31.1% | 0% |
| B5 | one book: KRE | $4,396,310 | $3,966,699 – $4,829,832 | $3,871,129 | 100% | 100% | 29.7% (29.6% – 34.9%) | 38% | 0% | 32.9% | 22% |
| B5 | one book: GDX | $4,304,075 | $4,007,269 – $5,048,680 | $3,890,108 | 100% | 100% | 29.7% (29.7% – 34.4%) | 25% | 0% | 31.6% | 9% |

- **Wealth is robust.** Incremental wealth over the no-margin core (C0, $2,279,769) is positive for essentially
  every neighbour.
- **B5's drawdown advantage is not robust.** The frozen B5 has a 29.67% max daily drawdown, but its median joint
  neighbour has 35.2%:
  - 55% of seed-1 neighbours exceed 35% (59% for seed 2);
  - the worst reaches 39.3%.
- **Why.** The low drawdown depends on two things:
  - which book happened to hold the single slot in March 2020 (see `ETF_ABLATION.md` and
    `TRADE_CONCENTRATION.md`);
  - the frozen pool's large 2022 gains (below).

  Perturbing XBI's parameters alone pushes 94% of B5 variants above 30%.
- **B4's drawdown is typical of its neighbourhood.** The frozen B4 has 34.65%, its median neighbour
  35.3%.
- **OAT rarely moves the drawdown; joint perturbation does.** One-at-a-time changes leave B5 below 30% in all but
  9 of 154 points, but almost every simultaneous perturbation does not.

## The crash years across the neighbourhoods

| Pool | Year | Frozen fixed MTM | Joint-neighbour median (seed 1 / seed 2) | Neighbours whose worst portfolio DD starts then |
|---|---:|---:|---:|---:|
| B4 | 2020 | $77,765 | $51,571 / $53,941 | 72 of 128 |
| B4 | 2022 | $57,017 | $7,348 / $8,051 | 56 of 128 |
| B5 | 2020 | $165,888 | $98,745 / $91,044 | 10 of 128 |
| B5 | 2022 | $84,884 | $6,178 / $6,878 | 118 of 128 |

- **2020 is robust.** The 2020 gains are robust in sign and largely in size: the median neighbour makes about
  55–70% of the frozen 2020 profit.
- **2022 is not.** The frozen pools' large 2022 gains are not robust: the median neighbour makes a small fraction of
  them. 70% (B4) and 62% (B5) of neighbours are positive in 2022 at all.
- **Consequence for drawdowns.** In most of B5's neighbourhood the worst portfolio drawdown is the 2022 bear market
  (118 of 128), not the March-2020 crash. B5's historical drawdown advantage therefore needed both its exact
  March-2020 slot sequence **and** its frozen 2022 gains.

## Interpretation

- **A broad profitable plateau with an isolated peak.**
  - The D1 shared pools remain profitable across every tested local neighbourhood and every single-parameter change.
    That is genuine (in-sample) evidence that the edge is not a knife-edge artefact.
  - But the frozen vectors are the plateau's highest point: nearby configurations earn about half as much, with
    larger drawdowns (median fixed minute DD: $44,868 B4, $40,797 B5, against the
    frozen $28,659 and $26,510).
  - A forward expectation anchored on the frozen figures should be discounted heavily. The neighbourhood median is a
    more honest in-sample central estimate, and even it is optimistic, because the plateau itself was chosen on this
    history.
- **B5's sub-30% portfolio drawdown is a property of the exact frozen parameters, not of the strategy family.**
  Treat B5's drawdown as C0-like (about 34–36%) when planning risk.
