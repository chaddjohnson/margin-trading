# Mode A — fixed $100,000 shared pool

A trading-strategy research ledger: one $100,000 borrowed pool (two $50,000 slots for `split`), 11% simple interest,
no core portfolio, no compounding, price-only, 2016-01-04 → 2025-10-13 (first arming 2017-06-15). It makes **no
margin or collateral claim**: there is no posted equity behind its loan. Exploratory, inspected-history comparison
(PROTOCOL.md §1). Sources: `results/scenario_summary.csv`, `results/tables/fixed_pool.md`,
`results/tables/fixed_attribution.md`, `results/runs/*/F-*/` (trades, signals, refusals, daily, annual, monthly).

## 1. The control

VGT D1 alone under exactly these conventions: **$183,043.82 net, $19,330.69 minute-sampled drawdown, 20 entries**
($136,334 realized + $46,709 on the lot open at 2025-10-13; $33,362 interest; daily drawdown $15,611; net ÷ minute DD
9.47; a lot open on 36.5% of eligible sessions). Its drawdown runs from 2020-02-19 to 2020-03-18.

## 2. Every predeclared run against VGT D1

Main comparison **all-primary/shadow**; low-DD sensitivity all-lowDd; the six other combinations are reported in full
in `results/tables/fixed_pool.md` (29 rows) and summarized here.

| Run | Net | vs VGT D1 | Realized / open | Interest | Daily DD | Minute DD (÷ $100k) | Net ÷ minute DD | Funded lots | W/L | Refused virtual trades (HYPOTHETICAL net) | Exposure |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **VGT D1 alone** | **$183,044** | — | $136,334 / $46,709 | $33,362 | $15,611 | $19,331 (19.3%) | **9.47** | 20 | 14/5 | — | 36.5% |
| **all-primary / shadow** | **$249,580** | **+$66,536** | $202,871 / $46,709 | $43,789 | $27,681 | **$30,140 (30.1%)** | **8.28** | 74 | 40/33 | 72 (+$496,130) | 47.6% |
| all-primary / priority | $249,580 | +$66,536 | identical to shadow (no decisive tie) | | | | | | | | |
| all-primary / split ($50k + $50k) | $231,202 | +$48,158 | $182,635 / $48,567 | $36,842 | $17,606 | $20,525 (20.5%) | 11.26 | 97 | 54/41 | 49 (+$283,307) | 53.1% |
| all-primary / cancel (control) | $196,591 | +$13,547 | $196,591 / $0 | $39,751 | $31,680 | $34,958 (35.0%) | 5.62 | 68 | 38/30 | 895 refusals, no virtual trades | 43.4% |
| all-primary / hold (diagnostic) | $229,629 | +$46,585 | $190,572 / $39,057 | $47,556 | $35,768 | $36,426 (36.4%) | 6.30 | 77 | 38/38 | 532,588 refused re-tests | 51.9% |
| **all-lowDd / shadow** | **$294,676** | **+$111,632** | $247,966 / $46,709 | $42,915 | $24,575 | $27,968 (28.0%) | 10.54 | 75 | 46/28 | 70 (+$329,007) | 46.6% |
| all-lowDd / priority | $299,988 | +$116,944 | $253,279 / $46,709 | $43,156 | $24,575 | $27,968 (28.0%) | 10.73 | 73 | 46/26 | 72 (+$323,695) | 46.9% |
| all-lowDd / split | $231,372 | +$48,328 | $208,017 / $23,355 | $29,384 | $14,400 | $18,068 (18.1%) | 12.81 | 125 | 76/48 | 20 (+$160,939) | 49.1% |
| all-lowDd / cancel | $259,341 | +$76,297 | $259,341 / $0 | $31,945 | $27,486 | $31,267 (31.3%) | 8.29 | 89 | 56/33 | refusals only | 34.6% |
| all-lowDd / hold | $200,955 | +$17,911 | $161,898 / $39,057 | $46,682 | $35,315 | $38,366 (38.4%) | 5.24 | 77 | 40/36 | re-tests only | 51.0% |

Across the 8 combinations: shadow nets **$238,387 – $300,302**, minute DD **$27,968 – $31,284**; split nets
**$228,944 – $247,840**, minute DD **$17,941 – $20,525**. All 28 allocator runs (shadow, priority, split for every
combination, plus the cancel/hold controls of the two main ones) end above VGT D1's net; **16 of 28** beat its net ÷
minute DD of 9.47 (`results/tables/strategy_comparison.md`): every split run, the shadow/priority runs of the four
configurations with XBI lowDd, and none of the shadow runs with XBI primary.

**By the rule fixed in PROTOCOL.md §12 (net and net ÷ minute DD must both rise for all-primary/shadow), the allocator
does not improve fixed-pool performance**: +$66,536 of net is bought with +$10,809 of minute drawdown (19.3% → 30.1%
of the pool), and the ratio falls from 9.47 to 8.28. The low-DD combination and the split pass both tests on this
history; neither was selected after seeing it, and both are sensitivities.

## 3. Where the incremental P&L came from (executable trades only)

Bridge from VGT D1 alone to the allocator (fixed pool, per symbol, `results/tables/fixed_attribution.md`). Each funded
trade earns exactly its standalone P&L, so the bridge is exact:

| | all-primary / shadow | all-lowDd / shadow | all-primary / split |
|---|---:|---:|---:|
| VGT D1 alone | $183,044 | $183,044 | $183,044 |
| − VGT trades lost to the shared pool | −$101,487 (9 of 20) | −$12,687 (6 of 20) | (lots are $50k: see note) |
| + XBI funded | +$73,398 (12 of 25) | +$41,679 (17 of 29) | +$98,977 (20 of 25) |
| + XRT funded | +$45,333 (12 of 26) | +$16,307 (5 of 19) | +$20,165 (15 of 26) |
| + KRE funded | +$49,291 (39 of 75) | +$66,332 (39 of 77) | +$26,071 (43 of 75) |
| = allocator net | **$249,580** | **$294,676** | **$231,202** (VGT kept $85,988 on 19 half-size lots) |

- Under all-primary the incremental +$66,536 is the net of **losing 55% of VGT's own value** (its 2020 and 2023–24
  entries arrive while XBI or XRT lots hold the pool) and adding $168,022 of sector trades. VGT's standalone edge is
  largely displaced, not complemented.
- Under all-lowDd the tight-stop sector phenotypes release the pool quickly: VGT keeps 93% of its standalone net and
  the sector books add $124,318.
- The refused virtual trades' hypothetical nets (+$496,130 for all-primary) are opportunity costs of one pool, not an
  achievable return: the four standalone books together would need four pools (`SIGNAL_OVERLAP_AND_DENIALS.md`).

## 4. Drawdown, exposure and losses

- Every full-pool drawdown sits in the 2020 crash: all-primary/shadow 2020-02-19 → 2020-03-18 (daily low 2020-03-16,
  recovered 2020-04-09), all-lowDd 2020-02-19 → 2020-03-23 (recovered 2020-04-14), VGT D1 2020-02-19 → 2020-03-18.
  Adding sector books deepened the same episode rather than diversifying it.
- Worst single trades: −$19,601 (all-primary; VGT D1's worst is −$3,447), −$10,004 (all-lowDd), −$9,801 (all-primary
  split, half-size lots). Worst intratrade adverse excursion −$19,626 (all-primary) versus −$11,003 for VGT D1.
- Time on margin rises from 36.5% of eligible sessions (VGT) to 46–48% (full pool) and 49–53% (split); capital
  utilization (principal × days ÷ pool × days) 47.8% for all-primary/shadow, 40.2% for its split.
- Win/loss: VGT D1 14/5; all-primary/shadow 40/33; all-lowDd/shadow 46/28. The added trades are many small,
  near-coin-flip scalps with a few large winners.

## 5. Sensitivities that matter for this mode (`results/tables/sensitivities.md`)

| Variant | VGT D1 net (vs base) | all-primary / shadow net (vs base) |
|---|---:|---:|
| base | $183,044 | $249,580 |
| 2 bps per side | $182,188 (−$856) | $222,941 (**−$26,639**) |
| 5 bps | $180,904 (−$2,139) | $218,421 (−$31,159) |
| 10 bps | $178,767 (−$4,277) | $200,429 (−$49,151; minute DD $36,884) |
| 25 bps | $133,321 (−$49,722) | $159,189 (−$90,391; minute DD $40,449) |
| next-open stop fills | $183,757 (+$713) | $247,897 (−$1,683) |
| +50 bps on stop fills | $175,676 (−$7,368) | $207,879 (−$41,701) |
| 8% interest | $192,142 (+$9,099) | $261,429 (+$11,849) |
| 14% interest | $173,945 (−$9,099) | $214,169 (−$35,411) |

The allocator's advantage is **fragile to execution costs**: 2 bps per side removes 40% of its +$66,536 advantage,
10 bps removes 74% and raises its drawdown to $36,884; at 25 bps it is still above VGT D1 ($159,189 vs $133,321) only
because VGT D1 itself loses two trades. Costs (and interest) feed D1's net-profit tests, so they change the sector
books' trade lists (146 virtual trades → 139 at 2 bps, 129 at 25 bps: `results/stress/sensitivity_trade_differences.csv`),
mostly KRE's 3.1%-stop exits whose stop activation is marginal. VGT D1's list is unchanged below 25 bps.

## 6. Verdict for the fixed pool

On inspected 2016–2025 data the shared allocator raises the fixed-pool net in every predeclared configuration
(+$55,343 to +$117,258 for the shadow and priority runs, +$45,900 to +$64,796 for the split), but for the main configuration it does so with a 56% larger drawdown
and a lower net ÷ drawdown, it displaces most of VGT D1's own trades, and its advantage shrinks by 40% at 2 bps of
cost. The improvement is not robust enough to be called one by the predeclared rule.
