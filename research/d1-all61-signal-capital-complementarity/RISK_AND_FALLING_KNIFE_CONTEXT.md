# Risk and the falling-knife question

**Evidence level:** retrospective, matched horizons, the frozen engine's own marks and lots (5 bps, 11%). Sources:
`results/risk/RISK.json` (sealed, bodyHash `29e6251b8e77…`) and its payload (every standalone slot of View U on T, A, B
and View P on its fold), `results/tables/risk.md`, `results/tables/risk-standalone.csv`; scenario risk in the replay
payloads. **Falling-knife episode** (Study 1's definition): a price-catalog episode (zigzag 10%) with ≥ 1 lot entered at
or before its trough whose attributed net is ≤ 0. The $35,000 is a historical research reference, not a stop. Stop
fills at the stop price and gap fills at the opening trade are model assumptions — no quote data exist; s25 (25 bps
extra slippage on stop exits) is the only adverse stress.

## 1. The direct answer

> Do the many 2022–2023 falling-knife labels imply unacceptable loss risk for B4/B5, or are they largely contained by
> the existing exits and constrained funding?

**On the funded B4/B5 paths they are largely contained.** The 63–87 falling-knife episodes Study 1 reported for 2022–23
are a sum over **61 separate $100,000 slots**; this study reproduces that tally exactly for the fold-b A0s (87 episodes
across 54 slots, 11 slots with a windowed minute drawdown above $35,000, worst lot −$19,998). The one shared slot that
B4 or B5 actually funds saw, in the same window:

| Fold B, 2022-01-03 → 2023-12-29 | B4 | B5 | 54 separate P-B slots (Study 1's unit) | 61 separate U slots |
|---|---:|---:|---:|---:|
| Falling-knife episodes among funded lots | **1** (VGT, Aug–Oct 2022, −$3,284) | **0** | 87 | 55 |
| Worst closed lot | −$5,200 | −$5,200 | −$19,998 | −$18,142 |
| Worst MAE (open mark before exit) | −$9,822 | −$7,879 | | |
| Losing lots / funded lots | 19 / 49 | 13 / 42 | | |
| Max consecutive losing lots | 6 | 4 | | |
| Worst 30 / 60 / 90-day change | −$10,130 / −$13,811 / −$10,538 | −$9,127 / −$7,502 / −$2,059 | | |
| Max **minute** drawdown of the slot | **$22,327** (22.3%) | **$17,269** (17.3%) | 11 slots > $35k | 7 slots > $35k |
| Max daily drawdown | $15,284 | $13,874 | | |
| Window net | +$112,826 | +$170,997 | | |

Why: (1) **funding is constrained** — one slot means most of the 61 ETFs' decline-phase signals are refused while an
incumbent holds the pool (68–71% of View U / P decisions arrive busy against B5); (2) **the incumbents' own exits cut
losers** — of the fold-B exits, maximum hold (armed only when the lot is losing at the session's open; it sells at the next trade,
so it can close slightly positive — 2 of B4's 24 training-era maximum-hold exits did) accounts for 19 of
49 (B4) and 12 of 42 (B5) lots, the buffered intraday loss for 1 each, and trailing-stop or gap exits (armed only once
the stop price is in profit) for the rest; on losing lots the worst open mark before exit was about twice the realized
loss (Σ MAE ÷ Σ loss ≈ 2.0); (3) losses are not summed across ETFs because the slot holds one lot at a time.

**Caveats that remain.** The profit-conditional trailing stop does not protect a losing position: a loser is held
until the maximum hold (8 days for VGT, 4–17 for the others) or the buffered loss, and its MAE can be about twice the
final loss. Stop and gap fills are model prices; live slippage, halts and house-margin changes are unmodelled, so the
risk cannot be settled beyond the s25 stress (`EXACT_SHARED_POOL_COUNTERFACTUALS.md`; the B4/B5 robustness audit's s50
and s100 stresses remove lots and cut net by 16–24% on full history).

## 2. Matched-horizon risk of the fixed slot

| Window | Pool | V | Lots (W/L) | Worst closed lot | Sum of losses | Worst MAE | Max consec. losses | Worst 30-day | Minute DD | Daily DD | Falling-knife episodes (net) | Time in market |
|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---:|
| T | S (VGT primary) | $135,359 | 17 (13/4) | −$3,544 | −$9,195 | −$10,867 | 1 | −$14,971 | $19,534 | $15,817 | 1 (−$1,249) | 38.5% |
| T | B4 | $242,196 | 71 (45/26) | −$10,094 | −$55,388 | −$17,982 | 6 | −$22,799 | $28,659 | $25,268 | 4 (−$20,134) | 51.2% |
| T | B5 | $388,489 | 82 (54/28) | −$8,258 | −$59,136 | −$17,982 | 4 | −$21,370 | $26,510 | $23,789 | 3 (−$19,644) | 52.1% |
| A | S | $32,698 | 2 (2/0) | +$3,313 | $0 | −$3,081 | 0 | −$11,249 | $14,894 | $13,299 | 0 | 45.0% |
| A | B4 | $62,161 | 12 (8/3) | −$852 | −$2,117 | −$6,582 | 2 | −$10,326 | $17,702 | $16,011 | 0 | 61.1% |
| A | B5 | $46,506 | 20 (12/7) | −$3,336 | −$10,896 | −$6,582 | 2 | −$10,149 | $16,557 | $14,848 | 0 | 56.1% |
| B | S | $22,145 | 9 (6/3) | −$3,284 | −$5,651 | −$4,873 | 1 | −$9,077 | $17,421 | $14,344 | 0 | 29.5% |
| B | B4 | $112,826 | 49 (30/19) | −$5,200 | −$33,803 | −$9,822 | 6 | −$10,130 | $22,327 | $15,284 | 1 (−$3,284) | 58.3% |
| B | B5 | $170,997 | 42 (29/13) | −$5,200 | −$21,001 | −$7,879 | 4 | −$9,127 | $17,269 | $13,874 | 0 | 67.9% |

(Lots entered in the window; one lot open at the end of A in both pools. Worst 30-day change of the daily mark; the
60- and 90-day figures are in `risk.md` — e.g. B4's worst 60-day change in fold B is −$13,811 to 2022-10-14, and every
pool's worst 90-day change on T and A is −$13,655 to 2021-07-16.) The training-era
falling-knife episodes of the funded pools are all in the COVID crash (KRE Dec 2019 → Mar 2020, −$8,258; KRE Mar 2020,
−$7,477 (B4); KRE Mar–Apr 2020, −$1,745 (B5); KRE Jun–Jul 2020, −$9,640 over 9 entries (B5); XBI −$1,115 (B4)) plus
VGT's Aug–Oct 2022 −$3,284 (B4). The
largest funded-pool drawdowns are the COVID crash (B4 minute DD peak 2020-02-19, trough 2020-03-23, recovered by
2020-04-28), not 2022.

**Per independent event and cumulatively.** The worst cumulative losses are 30-day windows of −$21k to −$23k in March
2020 (T) and, in fold B, −$9.1k (B5) / −$10.1k (B4) ending 2023-01-03 (B4's worst 60-day: −$13.8k to 2022-10-14): a smaller individual loss can still consume a multiple of itself when
several follow each other (B4: 6 consecutive losing lots in fold B).

## 3. Capacity cost of losing lots

| Window | Pool | Losing lots (net) | Share of slot time | Decisions refused while a losing lot held the slot | of which profitable standalone | Their standalone net |
|---|---|---|---:|---:|---:|---:|
| T | B4 | 26 (−$55,388) | 10.7% | 9 | 3 | −$1,885 |
| T | B5 | 28 (−$59,136) | 10.8% | 13 | 7 | +$20,050 |
| A | B4 | 3 (−$2,117) | 9.8% | 2 | 2 | +$10,180 |
| A | B5 | 7 (−$10,896) | 12.8% | 3 | 3 | +$10,863 |
| B | B4 | 19 (−$33,803) | 22.5% | 4 | 0 | −$4,969 |
| B | B5 | 13 (−$21,001) | 14.0% | 5 | 1 | −$9,117 |

Losing lots held the slot 10–23% of the time; the incumbent decisions they blocked were small and, in fold B, net
losers themselves. The opportunity cost of losing lots is real but modest on these paths.

## 4. Portfolio overlay ($300,000 60/40 VOOG/VGT core, 20% of marked equity per trade)

| Window | C0 (core only) | S | B4 | B5 |
|---|---|---|---|---|
| T: max daily % DD (minute) | **33.89%** (35.76%) | 32.78% (35.21%) | 34.65% (37.01%) | 29.67% (31.09%) |
| A: windowed max daily % DD | 11.70% | 12.54% | 13.39% | 12.48% |
| B: windowed max daily % DD | **33.39%** | 31.87% | 26.68% | 26.11% |
| B: equity increment | −$7,439 | +$42,466 | +$304,483 | +$602,646 |

**The core alone already breaches the 30% preferred target** (33.9% daily, 35.8% minute over the training era; 33.4%
in 2022 alone). B5 is the only configuration under 30% on T; in fold B both pools lowered the drawdown versus the core
(their 2022 lots were net profitable). The fold-window minute % drawdown of the portfolio is not computed (declared);
the whole-history minute figures to each window end are in `risk.md`.

## 5. Candidate additions and the 61-slot fallacy

Side-by-side risk of every replay (baseline and baseline + candidate: V, lots, worst lot, MAE, consecutive losses,
30/60/90-day changes, minute and daily drawdown, falling knives, time in market, portfolio start equity, increment and
windowed drawdown) is in `results/tables/scenario-risk.{md,csv}`. Adding a candidate raised the funded slot's risk in
most replays: B5 + EWZ (fold B) minute DD $38,471 (from $17,269;
3 falling-knife episodes from 0); B4 + FXI (fold B) $39,826 (from $22,327); B4 + U-GDX (fold B) 6 falling-knife
episodes from 1 and a portfolio drawdown of 32.0% vs 26.7%; and the in-sample B4 + U-XOP (training era) **$88,442**
(worst lot −$27,186; 13 falling-knife episodes) for its +$48,199. The decline-phase signals that the shared slot
normally refuses are exactly what an added book lets through.

**Never sum standalone slots as one account:** the 61 View U slots over the training era show 145 falling-knife
episodes, 22 slots above $35,000 and a worst lot of −$35,850 — none of which describes B4 or B5.
