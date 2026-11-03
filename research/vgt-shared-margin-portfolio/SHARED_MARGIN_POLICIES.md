# Shared-margin policies (Track II)

One margin account, one borrowing allowance of 20% of equity at each entry decision, two frozen strategies (D1 and
swing-low C2) whose fills are gated by a policy. The control is **B — D1 alone** under the same account rules.
Every figure is from `results/scenario_summary.csv`, `results/tables/attribution.md`,
`results/tables/competing_signals_P2.md` and `results/tables/takeovers_*.md`, produced by
`npm run shared-margin -- run` and `report`. Evidence grade: computed on observed data (an inspected historical
backtest), with the semantics comparisons as predeclared sensitivities (PROTOCOL.md §5.2, §5.5).

## 1. The policies as run

| Key | Rule at an entry decision | Declined strategy | Same-bar tie |
|---|---|---|---|
| B | D1 alone, 20% of equity | — | — |
| S | swing-low alone, 20% (reference) | — | — |
| P1 | D1 priority: D1 is granted even while swing-low owns the lot — the swing lot is **sold at the next trade after D1's decision and D1 buys at that trade** with a fresh 20% principal (a displacement with two trades); swing-low is declined while D1 holds | hold | D1 |
| P2 | first signal wins: whoever holds the lot keeps it under its own exit rules; the other is declined | hold | D1 |
| P2c | P2 with **cancel** semantics | cancel | D1 |
| P2s | P2 with **shadow (paper-book) semantics**: each strategy runs its own standalone state machine, phantom positions included; the account executes a standalone trade only if the pool is free at its fill minute and exits it at that trade's standalone exit | shadow | D1 |
| P3 | dedicated split: each strategy sized at 10% of equity; both may be open | — | both |
| P4 | dynamic sharing: an entrant takes 20% × equity − the other lot's principal, declined below 10%; no top-ups | hold | D1 |
| P5-T1 / P5-T2a / P5-T2b | D1 takeover: when D1 signals while a swing lot is open, the lot's management transfers to D1 with no trade (T1: continuous accounting; T2a: exit reference reset, original hold clock; T2b: reset and the hold clock restarted at the takeover) | hold (swing while D1 holds) | D1 |
| P5-T1-B2 | P5-T1 with the gross-breakeven D1 | hold | D1 |

The three declined-signal semantics (PROTOCOL.md §5.2) matter because the frozen machines are stateful: a D1 setup
that cannot fill either keeps re-testing its rebound until the pool frees (**hold**), is dropped and must re-arm
on a fresh X decline (**cancel**), or goes on as a paper position and only its later standalone signals are offered
to the account (**shadow**). Hold is the literal "the strategy is unchanged, only the fill is gated" reading;
shadow is what a live deployment running each strategy on its own paper book would do.

## 2. Results

From `results/tables/scenario_comparison.md` (dollars at the 2025-10-13 close; the daily drawdown is exact, the
minute-sampled one has VOOG forward-filled):

| Scenario | End equity | vs B | vs A | CAGR | Daily max DD | Minute max DD | Strategy net (realized) | Trades D1 / swing | Interest | Min equity/LMV | Core turnover |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B (control) | $2,346,272 | — | +$561,684 | 23.42% | $484,116 (25.3%) | $561,090 (29.3%) | +$314,382 (+$172,969) | 20 / 0 | $55,902 | 82.0% | $215,738 |
| S | $2,196,707 | −$149,565 | +$412,119 | 22.59% | $503,358 (26.3%) | $578,645 (30.2%) | +$197,122 (+$197,122) | 0 / 32 | $37,191 | 81.8% | $262,633 |
| P1 | $2,383,061 | +$36,789 | +$598,473 | 23.62% | $515,970 (26.3%) | $593,261 (30.1%) | +$374,054 (+$230,312) | 20 / 28 | $92,763 | 81.9% | $500,056 |
| P2 | $2,376,575 | +$30,303 | +$591,987 | 23.58% | $514,086 (26.3%) | $591,054 (30.2%) | +$361,178 (+$228,190) | 15 / 25 | $91,360 | 78.9% | $450,818 |
| P2c | $2,493,788 | +$147,516 | +$709,200 | 24.19% | $542,002 (26.3%) | $623,148 (30.2%) | +$416,369 (+$265,980) | 15 / 22 | $78,848 | 81.8% | $372,311 |
| P2s | $2,567,929 | +$221,657 | +$783,341 | 24.57% | $558,017 (26.3%) | $641,584 (30.2%) | +$447,899 (+$293,023) | 18 / 20 | $87,493 | 81.8% | $400,356 |
| P3 | $2,273,611 | −$72,661 | +$489,023 | 23.02% | $492,573 (25.8%) | $567,836 (29.6%) | +$257,111 (+$186,442) | 20 / 32 | $46,673 | 82.3% | $240,791 |
| P4 | $2,376,575 | +$30,303 | +$591,987 | 23.58% | $514,086 (26.3%) | $591,054 (30.2%) | +$361,178 (+$228,190) | 15 / 25 | $91,360 | 78.9% | $450,818 |
| P5-T1 | $2,419,970 | +$73,698 | +$635,382 | 23.81% | $523,920 (26.3%) | $602,398 (30.1%) | +$394,352 (+$248,389) | 23 / 20 | $92,302 | 80.7% | $479,474 |
| P5-T2a | $2,419,970 | +$73,698 | +$635,382 | 23.81% | $523,920 (26.3%) | $602,398 (30.1%) | +$394,352 (+$248,389) | 23 / 20 | $92,302 | 80.7% | $479,474 |
| P5-T2b | $2,457,294 | +$111,022 | +$672,706 | 24.01% | $532,038 (26.3%) | $611,723 (30.1%) | +$407,700 (+$259,492) | 22 / 19 | $93,925 | 79.7% | $457,442 |
| P5-T1-B2 | $2,419,724 | +$73,452 | +$635,136 | 23.81% | $523,920 (26.3%) | $602,398 (30.1%) | +$394,177 (+$248,229) | 23 / 20 | $92,301 | 80.7% | $479,634 |

"Trades D1 / swing" counts lots by the strategy managing the exit; a taken-over lot counts as D1. Every scenario
ends with one open lot (the 2025-04-22 D1 entry or its P2 counterpart), marked and not realized.

Three identities are worth stating because they are findings, not coincidences:

- **P4 = P2.** Under the dynamic rule the first entrant always takes the whole unused allowance (20%), leaving
  nothing above the 10% minimum for the other, and there are no top-ups; the dynamic policy collapses to first
  signal wins. A genuinely different dynamic policy would need top-ups of open lots or a smaller first take, both
  of which change exit arithmetic and were not predeclared.
- **P5-T1 = P5-T2a.** The two transfer definitions give identical trades. D1's stop is eligible only while a fill
  at the stop would net a profit after interest; 9 of the 12 takeovers happened with the swing lot in loss (net at
  the decision −$379 to −$20,999), so neither the carried high (T1) nor the reset high (T2) put the stop above
  cost — both were inactive and the lots left on the maximum-hold exit at the same minute. For the three
  profitable takeovers (2018-12-27 +$2,130, 2022-10-12 +$268, 2025-04-11 +$5,672) the T1 and T2 stop levels were
  both still below cost (for example 152.18 and 153.43 against a 156.77 cost on 2018-12-27), and once the price made
  a new high above the carried high the two reference highs coincided. The identity is a property of the
  net-profit stop rule on this history; under the gross-breakeven D1 (P5-T1-B2) one lot differs by $160.
- **B2 = B** at every rate and fill rule, as in the earlier program.

## 3. Trade attribution: what each policy displaces, alters and adds

From `results/tables/attribution.md` (scenario dollars; the reference net is the same trade in B or S, itself
dynamically sized there, so compare signs and magnitudes, not cents):

| Scenario | D1 trades preserved (net) | D1 trades displaced (B's net) | D1 trades at a different entry (net) | Swing trades as in S (net) | Swing trades altered or not in S (net) | Taken-over lots (net) |
|---|---:|---:|---:|---:|---:|---:|
| P1 | 20 (+$314,420) | 0 | 0 | 16 (+$114,370) | 12 (−$54,736; 10 displaced by D1 at −$4,591 to −$20,934 each, two unrelated) | — |
| P2 / P4 | 7 (+$84,616) | 13 (+$229,854, incl. 2020-04-02 +$56,352 and the open 2025-04-22 +$141,413) | 8 (+$149,153, incl. 2020-04-01 +$54,037 and the open 2025-04-16 +$132,988; four maximum-hold losses −$43,021) | 19 (+$126,032) | 6 (+$1,378) | — |
| P2c | 14 (+$265,218) | 6 (+$57,699: 2018-12-21, 2019-08-05, 2020-02-28, 2022-05-12, 2022-10-10, 2022-11-04) | 1 (+$12,010) | 21 (+$140,083) | 1 (−$942) | — |
| P2s | 18 (+$309,834) | 2 (+$21,610: 2018-12-21, 2022-05-12) | 0 | 20 (+$138,065) | 0 | — |
| P3 | 20 at half size (+$156,724) | 0 | 0 | 32 at half size (+$100,386) | 0 | — |
| P5-T1 / T2a | 9 (+$232,738) | 11 (+$86,154, incl. 2020-04-02 +$56,352 and 2022-11-04 +$12,587) | 2 (+$6,439) | 19 (+$127,756) | 1 (+$19,431) | 12 (+$7,987) |
| P5-T2b | 11 (+$288,930) | 9 (+$31,933) | 1 (+$11,795) | 17 (+$125,129) | 2 (+$19,919) | 10 (−$38,072) |

Reading:

- **Where the uplift comes from.** In every shared policy the positive increment over B is swing-low's own trades in
  periods when D1 is flat: 2018-02/10/11, 2019-05, 2021-10, 2022-01/02/03, 2023-08/09/10, 2024-04/08 and 2025-02/03
  (+$114k to +$140k in all policies). S alone adds +$412,119 over A with the same account rules. The combination is
  worth more than B only if the conflicts cost less than those trades earn.
- **What the conflicts cost under hold semantics (P2).** 13 of 20 D1 trades are displaced (their B net +$229,854)
  and replaced by 8 D1 entries at other prices (+$149,153). The mechanism is visible in
  `competing_signals_P2.md`: D1 setup 1 was refused on 2018-12-21 at 160.41 and, held, filled on 2019-03-08 at
  187.30 (the session swing-low exited), 17% higher; D1 setup 4 (2020-03-12 at 205.16) filled 2020-04-01 at
  205.29 after 5,313 refused minutes; four of the eight replacement entries ended on the maximum hold at a loss
  (−$43,021). Hold is the literal gating of the frozen machine and it is the worst way to run the pair.
- **Cancel (P2c) and shadow (P2s) semantics** keep 14 and 18 of D1's 20 trades. Shadow loses only 2018-12-21
  (+$17,438 in B; swing-low entered 2018-12-17 and held until 2019-03-08) and 2022-05-12 (+$4,172), and adds every
  swing trade of S that did not collide. Its +$221,657 over B is the best of the set, with a drawdown one point
  higher (26.3% vs 25.3%) and $31,591 more interest.
- **Displacement (P1)** keeps all 20 D1 trades exactly, so it protects D1 completely, but the 10 displaced swing lots
  were sold at a loss in 9 cases (−$75,859 together, offset by two unrelated swing trades); net +$36,789 over B
  with $500,056 of core turnover (vs $215,738) and $92,763 of interest (vs $55,902).
- **Dedicated split (P3)** halves both strategies: every D1 and every swing trade happens at 10% of equity; the
  result is below B (−$72,661) with the lowest strategy drawdown ($27,482 daily / $39,327 minute) and the least
  interest of the shared policies. Halving D1 to fund swing-low is a worse use of the allowance than D1 alone.
- **Takeover (P5).** 12 transfers (T1/T2a), 10 (T2b). The transferred lots netted +$7,987 together under T1 and
  −$38,072 under T2b, yet T2b ends higher because restarting the hold clock let two losing taken-over lots exit
  later at smaller losses and kept two more D1 trades intact (11 preserved vs 9). The takeover's main effect is
  not the transferred lots: it is that D1's own entries are consumed by the transfer (11 D1 trades displaced in T1,
  B's +$86,154), most prominently 2020-04-02 (+$56,352 in B) which became the 2020-04-01 swing lot managed by D1
  (+$54,607), and 2018-12-21 (+$17,438) which became the 2018-12-17 swing lot sold on the maximum hold at −$6,760
  four sessions later. Against the no-takeover control with the same hold semantics (P2), takeover adds $43,395
  (T1) or $80,719 (T2b); against the cancel or shadow controls it is $74k to $148k worse.

## 4. The takeover events

From `results/tables/takeovers_P5-T1.md`:

| Date | From | Lot net at decision | High before | Stop before → after | Lot | Exit (reason) | Lot net |
|---|---|---:|---:|---:|---|---|---:|
| 2018-12-21 17:35Z | swing | −$4,596 | 173.00 | 166.08 → 160.37 | 2018-12-17 @168.67 ($91,598) | 2018-12-26 @156.68 (maximum hold) | −$6,760 |
| 2018-12-27 15:35Z | swing | +$2,130 | 164.16 | 157.59 → 152.18 | 2018-12-26 @156.77 ($83,635) | 2019-05-13 @200.02 (trailing stop) | +$19,594 |
| 2020-03-12 13:32Z | swing | −$15,833 | 237.22 | 227.73 → 219.90 | 2020-03-06 @233.65 ($127,955) | 2020-03-16 @191.00 (maximum hold) | −$23,742 |
| 2020-04-02 13:33Z | swing | −$379 | 204.88 | 196.68 → 189.92 | 2020-04-01 @203.02 ($107,321) | 2020-09-04 @315.87 (trailing stop) | +$54,607 |
| 2022-04-26 19:45Z | swing | −$20,999 | 406.01 | 389.77 → 376.37 | 2022-04-07 @398.44 ($241,945) | 2022-04-27 @369.43 (maximum hold) | −$19,069 |
| 2022-05-12 13:42Z | swing | −$17,100 | 369.02 | 354.26 → 342.08 | 2022-05-06 @360.54 ($213,215) | 2022-05-16 @347.67 (maximum hold) | −$8,254 |
| 2022-06-13 13:34Z | swing | −$8,675 | 344.69 | 330.90 → 319.53 | 2022-06-10 @342.83 ($201,808) | 2022-06-21 @325.72 (maximum hold) | −$10,739 |
| 2022-06-22 13:32Z | swing | −$501 | 330.60 | 317.37 → 306.46 | 2022-06-21 @325.74 ($189,984) | 2022-07-01 @326.24 (maximum hold) | −$281 |
| 2022-10-10 15:14Z | swing | −$8,757 | 331.77 | 318.50 → 307.55 | 2022-09-26 @319.75 ($191,343) | 2022-10-11 @304.34 (maximum hold) | −$10,087 |
| 2022-10-12 13:36Z | swing | +$268 | 307.32 | 295.03 → 284.88 | 2022-10-11 @302.11 ($180,584) | 2022-11-03 @310.69 (trailing stop) | +$3,876 |
| 2022-11-04 13:54Z | swing | −$2,034 | 312.06 | 299.58 → 289.28 | 2022-11-03 @310.37 ($183,277) | 2022-12-15 @331.37 (trailing stop) | +$10,084 |
| 2025-04-11 13:36Z | swing | +$5,672 | 514.05 | 493.49 → 476.52 | 2025-04-10 @498.00 ($313,157) | 2025-04-21 @497.68 (maximum hold) | −$1,243 |

Edge cases observed (PROTOCOL.md §5.4): a D1 signal with the swing lot in profit (3 of 12) and in loss (9 of 12);
no T1 stop sat above the next open (D1's 7.3% level is below swing-low's 4% level by construction, and the
net-profit test kept it inactive on losing lots); every takeover's exit came from D1's own rules at least one
session later, none retroactively; D1's continuation window opened only after taken-over lots that exited at a
true net profit (2018-12-27, 2020-04-02, 2022-10-12, 2022-11-04); multiple takeovers of one swing position cannot
occur (D1 then owns the lot) but swing-low re-entered on the exit session of a taken-over lot three times
(2018-12-26, 2022-10-11, 2022-11-03) and was taken over again the next session; the swing machine was flat after
each transfer and re-armed under its own rules. Under hold semantics swing-low was refused 10 setups while D1
owned the lot (`signals_declined_setups`).

## 5. Margin use and financing

| Scenario | Max LMV/equity | Max debt/equity | Min equity/LMV (daily) | Interest | Exposure (sessions with a lot) | Borrowing $-days |
|---|---:|---:|---:|---:|---:|---:|
| B | 1.219× | 21.9% | 82.0% (2020-03-16) | $55,902 | 36.5% | $185.5M |
| P1 | 1.220× | 22.1% | 81.9% (2022-01-27) | $92,763 | 55.7% | $307.8M |
| P2 / P4 | 1.267× | 26.7% | 78.9% (2020-03-23) | $91,360 | 53.5% | $303.2M |
| P2c | 1.222× | 22.2% | 81.8% (2018-12-24) | $78,848 | 42.4% | $261.6M |
| P2s | 1.222× | 22.2% | 81.8% (2018-12-24) | $87,493 | 49.0% | $290.3M |
| P3 | 1.215× | 21.5% | 82.3% (2018-12-24) | $46,673 | 52.0% | $154.9M |
| P5-T1 | 1.239× | 24.4% | 80.7% (2020-03-12) | $92,302 | 54.8% | $306.3M |
| P5-T2b | 1.255× | 25.5% | 79.7% (2020-03-16) | $93,925 | 55.0% | $311.7M |

No policy approached any maintenance requirement (lowest 78.9%); none breached Reg T at an entry. The shared
policies roughly double the time with a lot open, the interest bill and the borrowing-dollar-days relative to B.
P2/P4's 1.267× is the 2020-03-23 session: a lot sized at 20% of a higher pre-crash equity, marked after the fall.

## 6. Answers

- **Does any policy improve on D1 alone?** On this history, yes for every policy except the dedicated split, by
  +$30k (hold) to +$222k (shadow), always with a higher drawdown (26.3% vs 25.3% daily; 30.1–30.2% vs 29.3%
  minute-sampled), 40–65% more interest, and about twice the time on margin. The gain is swing-low's standalone
  trading in the years D1 is flat, not a synergy; it inherits swing-low C2's evidence grade (an in-sample
  refinement from `research/vgt-d1-refinement/`, not credited there), and its size depends on a deployment detail
  the brief did not fix — what a refused strategy does next — by a factor of seven ($30k to $222k).
- **Does D1 takeover improve outcomes?** Relative to its own hold-semantics control (P2) by +$43k (T1/T2a) and
  +$81k (T2b); relative to the cancel and shadow controls it is worse by $74k–$148k. T1 and T2a are identical on
  this history; T2b differs only through the restarted hold clock. The transferred lots themselves netted +$8k
  (T1) and −$38k (T2b). Winning D1 trades displaced by a takeover: 2020-04-02 (+$56,352 in B, replaced by the
  2020-04-01 swing lot's +$54,607), 2022-11-04 (+$12,587), 2018-12-21 (+$17,438, replaced by −$6,760 and
  +$19,594 across two takeovers), 2022-10-10, 2022-05-12, 2020-03-23, 2022-06-22; swing trades displaced: none
  under takeover (they are transferred, not sold), 10 under displacement (P1).
- **Does swing-low merely create costly conflicts?** Under hold semantics largely yes: 13 refused D1 setups, 8 late
  replacements, four of them maximum-hold losses. Under paper-book semantics the conflicts are rare (2 D1 trades
  lost) and the combination is essentially "S's non-colliding trades added to B".

## 7. Caveats

All figures are one inspected history with both strategies' parameters fixed by earlier in-sample programs.
No policy was tuned; the semantics variants were predeclared. Differences of tens of thousands of dollars on a
$2.3–2.6M end value rest on a handful of trades (2018-12, 2020-03/04, 2022-04/05, 2025-04), which
OVERLAP_ANALYSIS.md lists one by one. Transaction costs, taxes and spreads are excluded here (see
DEPLOYMENT_RISK.md); the shared policies roughly double the number of taxable exits.
