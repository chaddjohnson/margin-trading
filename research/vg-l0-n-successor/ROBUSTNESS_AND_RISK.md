# ROBUSTNESS AND RISK — P5-NS

Report-only analyses of the C24 finalists and the references (PROTOCOL.md §16): **none is a gate, a ranking input or a
tolerance**; the sealed selection and outcome do not depend on them. Accounting basis everywhere: the fixed $100,000
trading allocation in one exclusive slot, marked net (realized + open lots marked, after 5 bps per side and 11 % simple
interest), minute marked drawdown (P0: ≤ $35,000 = 35 % of the allocation). Development = D24 (2016-01-04 → 2024-12-31);
validation and full history on FULL (→ 2026-10-30; previously examined). Sources: `results/selection/C24.json` (sealed
qualification evidence incl. the risk envelope), `results/validation/validation.json` (sealed), and the non-official
diagnostics `reports/diagnostics/{lots-D24,lots-FULL,tail-stress,families,chain-cpu}.json` (CPU reference or non-official
GPU, purposes cpu-reference / diagnostic). All finalists: `reports/tables/{risk,stresses,annual,finalists}.md`.

## 1. Profit and portfolio behaviour (development, D24)

| | U primary `GB.VA/R103#1` | N/original | New L0 | N robust-profit `GA.VC/R101#2` | F primary `GA0.VB1/R102#1` |
|---|---:|---:|---:|---:|---:|
| Net (realized / open) | $391,852 ($391,852 / $0) | $388,031 ($388,031 / $0) | $382,721 ($382,721 / $0) | $368,782 ($368,782 / $0) | $289,141 ($269,798 / **$19,342 open**) |
| Interest / costs | $61,449 / $3,427 | $61,479 / $3,425 | $62,112 / $3,623 | $56,929 / $3,413 | $77,121 / $3,421 |
| Lots (wins) | 32 (28) | 32 (28) | 34 (29) | 32 (28) | 33 (25) |
| Booked by book: D1·GDX / D1·VGT / Growth·VGT | $196,736 / $105,628 / $89,488 | $195,842 / $102,701 / $89,488 | $193,865 / $99,368 / $89,488 | $198,262 / $99,527 / $70,993 | $153,601 / $66,721 / $68,819 |
| Granted / refused decisions (GDX, VGT, Growth) | 18/19, 7/3, 7/3 | 18/19, 7/4, 7/3 | 22/22, 5/6, 7/3 | 23/16, 4/4, 5/3 | 22/14, 5/3, 6/8 |
| Occupancy (sessions with a funded lot) | 63.3 % | 63.4 % | 64.1 % | 58.8 % | 79.2 % |
| Largest lot / its episode's share of net | $51,264 / 30.6 % | $51,264 / 30.9 % | $51,724 / 31.5 % | $51,724 / 32.5 % | $40,687 / 47.2 % |
| 2020 marked P&L (the crash and rebound) | $139,236 | $138,876 | $138,878 | $138,332 | $116,433 |

Every enabled book (D1·GDX, D1·VGT, Growth·VGT; Growth·GDX is OFF by scope) of every reference and Track N finalist is
funded; two Track F finalists fund no D1·VGT lot (`C24/refine/GB1.VB0/R103#3 balanced`, `C24/refine/GB1.VC0/R104#1
profit`). Win rate 87.5 % (U primary, N/original, N robust), 85.3 % (New L0), 78.8 % (F primary); mean hold D1·GDX ≈ 25
days, D1·VGT 74 days, Growth·VGT 153 days (U primary and N/original). The U primary and N/original have the same lot counts
by book and identical annual results except 2020 (+$360), 2021 (+$895) and 2022 (+$2,566): **a numerical parameter
refinement of essentially the same funded-trade chronology** (the ledger signatures differ in a few lot exits), not a new
chronology. All their development profit is realized (no open lot at 2024-12-31); the F primary's includes $19,342 of
open marks (one D1·VGT lot entered 2024-08-05, value/principal 1.19 at the cutoff). Causal removals (U primary): without D1 $79,672, without Growth $299,744, without GDX $192,418, without VGT $173,268 —
both families and both symbols contribute causally, as for N/original ($80,242 / $289,296 / $180,918 / $163,925).

## 2. Risk decomposition (development; dollars)

| | U primary | N/original | New L0 | N robust | F primary |
|---|---:|---:|---:|---:|---:|
| **Marked minute DD (P0; % of $100,000)** | $19,459.83 (19.5 %) | $19,459.83 (19.5 %) | $19,459.83 (19.5 %) | $19,459.83 (19.5 %) | $28,508.07 (28.5 %) |
| Worst realized lot | −$6,455 | −$6,455 | −$6,455 | −$6,455 | −$3,988 |
| Worst lot MAE (marked) | −$8,047 | −$8,047 | −$8,047 | −$8,047 | −$13,833 |
| Trade principal loss, marked / liquidation | $8,047 / $8,093 | $8,047 / $8,093 | $8,047 / $8,093 | $8,047 / $8,093 | $13,833 / $13,876 |
| Banked-capital DD, marked / liquidation | $10,336 / $10,384 | $10,336 / $10,384 | $10,336 / $10,384 | $10,336 / $10,384 | $13,833 / $13,876 |
| Open-lot share of training net at 2024-12-31 | 0 % (none open) | 0 % | 0 % | 0 % | 6.7 % |
| Peak position market value | $167,686 | $167,686 | $168,181 | $168,181 | $183,798 |
| Largest unrealized-profit giveback (lot; % of its peak accrued profit) | $11,812 (D1·VGT 2020-04-02; 19 % of $63,076) | $11,812 (same lot; 19 %) | $11,846 (D1·VGT 2020-04-02; 19 %) | $11,846 (19 %) | **$24,749 (Growth·VGT 2016-07-13; 42 % of $59,326)** |
| Sum of lot givebacks (peak-to-exit) | $250,217 | $252,835 | $261,746 | $253,432 | $274,683 |

On FULL (2016 → 2026-10-30) the U primary's and N/original's envelopes are identical: principal loss liquidation $11,114,
banked-capital DD liquidation $13,525; marked DD $20,385.99. The largest unrealized-profit giveback on FULL is a D1·VGT
lot entered 2025-04-21 ($12,154 from its peak to its exit, both); the worst lot on FULL is a D1·GDX maximum-hold exit
entered 2026-07-07 (−$9,114); the longest Growth·VGT hold is 359 days (both). The F primary carries a Growth·VGT lot of up
to 838 days and gives back up to $24,749 on one Growth lot (2016) — Growth's open-ended exposure (Assignment 3's finding)
reappears in the independent region.

## 3. Neighbourhoods (the study's instrument; selection 2 × 128, confirmation 3 × 128; report-only 0.5× / 1.5×)

| | U primary | N/original | New L0 | N robust | F primary |
|---|---:|---:|---:|---:|---:|
| Confirmation median / p10 / robust | $231,217 / $171,335 / **$201,276** | $225,594 / $160,427 / **$193,011** | $250,614 / $206,312 / **$228,463** | $263,828 / $218,121 / **$240,974** | $190,662 / $145,666 / **$168,164** |
| p90 DD bootstrap interval (near-boundary sensitivity) | [$26,202, $28,849] | [$26,790, $29,173] | [$29,276, $33,840] | [$23,069, $23,533] | [$32,817, $34,277] |
| Worst draw net; draws with positive net | $79,770; 100 % | $97,980; 100 % | $136,996; 100 % | $131,500; 100 % | $94,964; 100 % |
| Confirmation p90 / p95 / worst-10 % mean DD | **$27,015** / $30,496 / $30,824 | **$28,012** / $29,965 / $31,605 | $30,658 / $34,487 / $34,808 | **$23,174** / $24,348 / $26,491 | $33,500 / $35,412 / $37,905 |
| Breaches > $35k of 384 [Wilson 95 %]; worst DD | 0.8 % [0.3, 2.3]; $37,982 | 2.1 % [1.1, 4.1]; $42,275 | 3.9 % [2.4, 6.3]; $42,791 | 1.6 % [0.7, 3.4]; $41,219 | 5.5 % [3.6, 8.2]; $59,085 |
| Half radius (0.5×): robust / p90 DD / breaches | $255,225 / $24,354 / 0 % | $256,635 / $24,760 / 0 % | $267,915 / $24,023 / 0 % | $275,649 / $21,106 / 0 % | $202,451 / $30,740 / 0 % |
| 1.5× radius: robust / p90 DD / breaches / worst | $166,129 / $31,954 / 5 % / $48,775 | $161,337 / $31,887 / 6 % / $49,963 | $195,754 / $38,255 / 15 % / $50,421 | $208,373 / $31,755 / 9 % / $55,861 | $139,721 / $42,581 / 29 % / $68,008 |

(Exact confirmation medians and p10 of every finalist: `reports/final-candidates.json`.) The plateau around N/original is
broad and benign at half radius (no breach for any reference or Track N finalist) and degrades at 1.5× (5–15 % breaches).
The U primary's tail is marginally lighter than N/original's (p90 −$997, breaches 0.8 % vs 2.1 %); N's robust-profit holder
is clearly lighter (p90 −$4,838) at −$19,249 of centre net. The independent F primary's tail is the heaviest (5.5 %
breaches; 29 % at 1.5×). Breach frequency is not a probability of a future loss; a rare-but-severe and a frequent-but-mild
tail are shown side by side (standard §5.8).

## 4. Stresses (development; and 2025–2026)

| | U primary | N/original | New L0 | N robust | F primary |
|---|---|---|---|---|---|
| Cost 0 / 2 / (5 = base) / 10 / 20 bps per side: net (DD) | $395,507 / $394,045 / $391,852 / $388,201 / $378,654 ($19,268–$20,036) | $391,682 / $390,221 / $388,031 / $384,383 / $374,844 ($19,268–$20,036) | $386,568 / $385,029 / $382,721 / $378,879 / $368,949 | $372,409 / $370,958 / $368,782 / $365,158 / $353,030 | $282,096 / $280,815 / $289,141 / $285,538 / $274,747 ($28,419–$28,774) |
| 14 % interest | $375,093 ($19,674) | $371,264 ($19,674) | $365,782 | $353,256 | $264,500 ($28,755) |
| Stop slippage +10 / +25 bps | $388,592 / $383,703 | $384,773 / $379,885 | $379,370 / $374,343 | $365,549 / $360,700 | $286,294 / $282,025 |
| Next-open stops | $391,687 ($19,460) | $387,866 ($19,460) | $382,794 | $367,892 | $289,183 |
| 2025–26 at 20 bps / 14 % interest | $90,900 / $91,661 | $90,900 / $91,661 | $93,108 / $93,876 | $56,101 / $60,021 | $28,131 / $27,008 (reset DD $35,071 at 14 %) |

Every stressed development DD of the references and the U primary stays ≤ $20,036. (The F primary's non-monotone cost
response — 0 bps below 5 bps — is path dependence: a different cost changes which signals are funded.)

## 5. D1 maximum-hold-window tail stress (daily-bar approximation; in-sample, proxy and synthetic; AD11)

| Book | U primary | N/original |
|---|---|---|
| D1·GDX (hold; protective stop) | 12 days; 16.3 % | 28-day adaptive bound; 15.9 % |
| worst loss of a $100,000 lot held over the window — unprotected / protected (in-sample 2016–2024) | −$34,154 (2020-03-03) / −$23,166 | −$33,864 (2020-02-21) / −$23,515 |
| GDXJ proxy (same period, not disjoint), unprotected | −$45,031 | −$47,260 |
| worst gap through the stop | 6.58 points beyond the level (2020-03-12) | 6.87 points (2020-03-12) |
| D1·VGT (hold; stop) | 13 days; **none** (family A) | 15 days; 12.0 % |
| worst loss unprotected / protected (in-sample) | −$20,959 (2020-03-03) / — | −$22,855 / −$15,917 |
| XLK proxy, unprotected | −$20,143 | −$21,840 |

A protective stop is not a loss cap: −10 / −20 / −30 % synthetic opening gaps through any stop lose about the gap
(`tail-stress.json` `syntheticGaps`). The U primary removes D1·VGT's protective stop (family A with a decline gate) —
its one-lot worst case without a stop is bounded only by the 13-day hold.

**Prolonged-decline re-entry and the capital pool (FULL ledgers, `lots-FULL.json`).** The longest run of consecutive
losing lots in one book is two for every reference and the U primary: D1·GDX 2026-06-22 → 2026-07-07, −$11,525 together
(the 2026 gold decline; the decline gate then blocked further GDX entries); D1·VGT never lost twice in a row (worst single
loser −$963 U primary, −$2,903 N/original, 2022); Growth·VGT never lost. N's robust-profit holder lost twice on D1·VGT in
April 2025 (−$8,494); the F primary twice on Growth·VGT (2021 → 2026, −$6,900) and twice on D1·GDX in October 2026
(−$15,265). Capital-pool interaction: with one exclusive slot every signal that arrives while a lot is open is refused —
19 of 37 D1·GDX decisions, 3 of 10 D1·VGT and 3 of 10 Growth·VGT for the U primary (N/original 19/37, 4/11, 3/10); the
displaced-opportunity counts per book are in `results/selection/C24.json` `centre.books` and `reports/tables/risk.md`.

## 6. Account / margin-maintenance scenario (report-only; explicit assumptions; not a guarantee)

Assumptions: the slot's one lot is bought for $100,000 entirely with a margin loan D = $100,000 (the model charges 11 %
on the full position); the account holds own collateral E in cash and nothing else; maintenance requirement 30 % of the
position's market value V; accrued interest and accumulated strategy profit ignored (both conservative in opposite
directions; profit raises E). A call occurs when E + V − D < 0.3 V, i.e. when the lot has fallen by more than
d* = (E − 0.3 D) / (0.7 D) from its entry:

| Own collateral E | Adverse lot move that triggers a call (d*) | Compared with this study's evidence (U primary = N/original) |
|---:|---:|---|
| $100,000 | 100 % (never) | — |
| $70,000 | 57.1 % | beyond every observed and stressed move |
| $50,000 | 28.6 % | worst marked lot excursion 8.0 % (−$8,047 MAE); the unprotected 12-day D1·GDX window lost 34.2 % in 2020 (the 16.3 % stop would have had to fail); a −30 % synthetic gap through the stop triggers it |
| $40,000 | 14.3 % | inside the unprotected GDX window loss and the 16.3 % stop distance |
| $30,000 | 0 % (at the limit at entry) | — |

A gap or halt can move a lot through its stop (worst observed 6.6 points beyond the GDX stop level on 2020-03-12). These
fixed-slot results do not describe any broker's actual house requirements (Vanguard's included), concentration add-ons
or intraday liquidation practice, and do not guarantee margin safety.

## 7. What the risk evidence says

- The informed region (N/original, the U primary, most Track N finalists) shares one risk profile: development DD
  $19,460, worst lot −$8,047 MAE, banked DD $10,384, every stressed DD ≤ $20,036, 2025–26 reset DD $20,386. The U primary
  is marginally better on neighbourhood tails and marginally richer — inside the bands the protocol fixed for "material".
- New L0 has the strongest confirmation median/p10 of the references but a heavier p90/tail than N/original.
- Lower-risk variants exist only at lower profit (N robust-profit: −$19k centre, −$4.8k p90 DD); the precommitted rule
  treats them as trade-offs, not successors.
- The independent region carries heavier tails, larger open-lot exposure at the cutoff and long Growth holds.
