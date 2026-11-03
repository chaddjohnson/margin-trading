# Joint search results (training only, 2016-01-04 → 2023-12-29)

Every figure here is from the training partition (books arming 2017-06-15), fixed $100,000 per funded lot, 11% simple
interest, 5 bps per side unless stated. Records: `results/robust/robust.json` (shortlist batteries, gates, ranking),
`results/refine/refine.json`, `results/diagnostics/diagnostics.json` (post hoc, non-decisional); tables
[results/tables/robust.md](results/tables/robust.md) (every shortlisted configuration's eight parameters per member,
per-member lots and net, gates, exclusions, ties) and [results/tables/refine.md](results/tables/refine.md).

## 1. Outcome under the frozen rules: no configuration advances

**None of the 20 shortlisted configurations passed all ten training gates, so no nominee was frozen** (FROZEN_SELECTION
.json, outcome "no advancement", manifest `699e2186…`). The binding gate is **T6, the parameter plateau** — specifically
its joint-perturbation clause (P50, the median training net of 48 configurations with every member's every parameter
moved by −m, 0 or +m grid steps, must be ≥ 75% of the configuration's net). **It is failed by every shortlisted
configuration and by all three benchmarks, including the previously accepted B5**: the observed P50 ÷ net ranges from
0.20 to 0.73 (B1 0.70, B4 0.58, B5 0.55). The one-parameter clause of T6 is met almost everywhere (probe medians 95–100%
of net). Other gates removed configurations too (T8 benchmark materiality 19 of 20, T3 cost retention 6, T7 a member with
non-positive marginal net 10, T2 portfolio drawdown above 35% 6), but T6 alone would have excluded all of them.

| Config | Members | Net@5 | Minute DD | Net ÷ DD | Joint P50 ÷ net (feasible share) | Probe median ÷ net | Portfolio daily / minute % DD | Gates failed |
|---|---|---:|---:|---:|---|---:|---|---|
| B1 | VGT | $135,359 | $19,534 | 6.9 | 0.70 (100%) | 0.95 | 32.78% / 35.21% | T6 T8 T9 |
| B4 | VGT XBI XRT KRE | $242,196 | $28,659 | 8.5 | 0.58 (42%) | 0.97 | 34.65% / 37.01% | T6 T7 T8 T9 |
| B5 | VGT XBI XRT KRE GDX | $388,489 | $26,510 | 14.7 | 0.55 (25%) | 0.99 | 29.67% / 31.09% | T6 T8 |
| **R1** | **XBI XRT KRE GDX** | **$467,806** | **$21,626** | **21.6** | **0.53 (40%)** | 0.98 | **29.01% / 30.33%** | **T6 only** |
| R3 | VGT XBI XRT KRE GDX XLY | $418,267 | $26,453 | 15.8 | 0.52 (23%) | 0.99 | 29.66% / 31.08% | T6 T8 |
| R5 | XBI XRT GDX IWN XLY | $398,276 | $17,281 | 23.0 | 0.56 (73%) | 0.99 | 27.21% / 28.54% | T6 T8 |
| R4 | XBI KRE GDX XLF | $371,690 | $21,691 | 17.1 | 0.67 (50%) | 0.99 | 29.01% / 30.42% | T6 T8 |
| R6 | VGT XBI XRT GDX | $357,251 | $20,652 | 17.3 | 0.63 (73%) | 0.99 | 28.79% / 30.79% | T3 T6 T8 |
| R2 | 9 books (no VGT) | $288,741 | $33,210 | 8.7 | 0.20 (0%) | 1.00 | 35.03% / 37.37% | T1 T2 T6 T8 T9 |
| A3 | XRT KRE GDX GLD XLF XLY | $329,038 | $23,642 | 13.9 | 0.73 (92%) | 1.00 | 34.09% / 36.51% | T3 T6 T7 T8 |

(The full 23-row table, the contenders C1–C6 and archive picks A1–A8, is in `results/tables/robust.md`. R = refined
contender, C = contender as discovered, A = further diverse archive configuration.)

Because the outcome is "no advancement", **no configuration of this study was run on holdout, final or `all`**, and
none will be: the protocol (§9) and the brief forbid evaluating, rescuing or re-ranking after the gates. R1, which
failed T6 alone, is described below as the search's leading training result, not as a candidate.

## 2. What the search found in training

- **Small subsets win; broad ones cannot meet the risk limit.** Best feasible training net by cardinality: 1 book
  $162,662 (KRE); 2 $280,127 (KRE GDX); 3 $375,179 (XRT KRE GDX); **4 $467,855 (XBI XRT KRE GDX)**; 5 $467,806 (+ an
  inert GLD); 6 $428,639; 7 $422,285; 8 $303,259; 9–11 ≤ $290,590; **12–16: no feasible subset**. With one lot or
  reservation at a time, more books mean the pool is taken by whichever book signals first; past five or six books the
  additions are mostly marginal or losing lots that block better ones, and the drawdown rises.
- **A recurring core: {XBI, XRT, KRE, GDX}.** All top 200 configurations by Q (net − $5,000 × books) contain these four;
  none contains VGT; 95% have ≤ 4 books. Two islands started from uniformly random genomes (I1, I2) reached the same core
  as the benchmark-seeded island (I8), with nets $416,819–$442,365 before refinement.
- **It is mostly the incumbents' own vectors.** The frozen KRE `lowDd` vector is the KRE member of nearly every leader
  (it supplies $160k of R1's net); the XBI, XRT and GDX members are close neighbours of the frozen XBI/XRT `lowDd` and
  GDX `portfolioAware` vectors (R1: XBI X 28.0% L 44 vs 30.0%/49; GDX Y 0.2% buffer 0.1% W 73 vs 0.4%/3.6%/81). These
  were optimized on the same training years by earlier studies, so their strength here is partly inherited in-sample
  fit, and their 2024–2026 behaviour has already been seen.
- **Non-core ETFs** (EWZ, GLD, IWM, IWN, TLT, VOOG, XLE, XLF, XLU, XLY, XOP) appear in shortlisted configurations only as
  small additions (funded net: IWN +$40k and XLY +$32k in R5, XLF +$3k in R4, XLY +$2k in R3) or in the broad, drawdown-infeasible
  c2/R2 family. XLE and XOP carry large drawdowns (their greedy starts: $35k and $91k net at $67k and $77k minute DD), EWZ
  was feasible in only 154 of its 2,071 subsets, and no subset that kept them was competitive at ≤ $35,000.

### R1 (refined c1): XBI XRT KRE GDX — the leading training result, failed T6

| Member | X | Y | L | Stop | Hold | Buffer | P | W | Funded lots | Funded net | Marginal (net − net without it) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| XBI | 28.0% | 0.2% | 44 | 3.1% | 5 | 0.1% | 6.4% | 59 | 17 | $56,848 | +$92,708 |
| XRT | 24.4% | 4.7% | 56 | 8.0% | 17 | 3.6% | 4.9% | 121 | 7 | $101,284 | +$106,438 |
| KRE | 29.9% | 2.7% | 230 | 3.1% | 4 | 2.3% | 9.4% | 60 | 39 | $159,908 | +$143,933 |
| GDX | 27.4% | 0.2% | 100 | 7.1% | 18 | 0.1% | 19.1% | 73 | 10 | $149,765 | +$155,131 |

73 lots (54 winners), worst lot −$8,258, interest $27,907, costs $7,548, pool occupied 39% of eligible days. Folds F1
$22,971 / F2 $267,265 / F3 $177,570; years 2018 $3k, 2019 $20k, **2020 $200k (43%)**, 2021 $67k, 2022 $91k, 2023 $86k;
largest regime R8 2020 recovery $102k (22%); two largest lots 19% of net; net minus the best regime $365,630. At 0/2/10
bps $475,605 / $472,485 / $408,166 (the 10 bps retention, 87%, passes T3 narrowly). Training portfolio (20%): ending
equity $2,645,257 vs B5 $2,270,264, max % DD 29.01% daily / 30.33% minute, borrowing $257.4M-days vs B5's $271.2M (so
the comparison is not driven by more borrowing; B5's ladder at R1's borrowing gives $2,212,085). Every one of T0–T5 and
T7–T9 passed.

**Why R1 beats B5 in training — the timing interaction.** The two pools share 40 identical funded lots. B5's 42 other
lots made +$169,769 (VGT 9 lots +$66,868, XBI 16 +$53,064, GDX 3 +$57,750, KRE 13 −$7,405); R1's 33 other lots made
+$249,085 (XRT 5 +$87,174, GDX 4 +$57,959, XBI 17 +$56,848, KRE 7 +$47,103). Without VGT, and with XRT's continuation
pullback cut from 6.2% to 4.9% and lookback from 48 to 56, the free pool is taken in 2020 by XRT and GDX lots that VGT
or the old XRT vector had blocked or missed: **of R1's +$79,317 advantage, +$75,356 is 2020** (+$123,126 vs +$47,771).
It is a different path through one crash and recovery, the specific pattern the brief warns against, and T6 shows the
path is not stable: moving every parameter by one small step cuts the median training net to 53% of R1's.

## 3. The robustness finding (T6): every D1 pool sits on a sharp training peak

- **Not an artefact.** A zero perturbation reproduces the base exactly; perturbed configurations agree between the replay
  and the full engine (4 of 4, 0 differences); and on 12 configurations **nobody optimized** (random subsets of random
  library vectors, 1–16 books) the same perturbations land above the base about as often as below (share above base
  0.02–0.85, average ≈ 0.5). The machinery is unbiased; the optimized configurations are peaks.
- **The landscape is rough everywhere.** Even unoptimized pools move by tens of thousands of dollars under these small
  moves (median − base from −$83k to +$55k): a 0.5-point change of a stop or one day of holding re-times one lot, which
  re-times which signal finds the pool free, and the change cascades through the shared pool.
- **Peaks, not plateaus, after selection.** For the optimized configurations almost no single-member perturbation beats
  the base (share above base 0–12% per member), and the joint median is 52–67% of the base for five of the six refined
  configurations (20% for the broad R2). B5 — accepted by the previous study on one-parameter probes alone — has P50 0.55 and only 25% of its
  joint neighbours keep the minute drawdown ≤ $35,000.
- **What carries the loss** (each parameter moved alone on every member, −m / +m, as a share of base net): R1 hold
  0.71/0.79, stop 0.75/0.77, L 0.80/0.92; B5 hold 0.63/0.85, stop 0.90/0.71, P 0.96/0.79; per member, each member's own
  joint perturbation alone costs 9–16% (R1: XBI 0.85, XRT 0.86, KRE 0.84, GDX 0.91).
- **Implication.** Under a joint-neighbourhood standard of 75%, no D1 shared pool built from training-optimized vectors
  is robust — the benchmarks included. The training nets of every optimized configuration, B5's $388,489 and R1's
  $467,806 alike, are best read as one lucky path of a noisy function; the joint-neighbourhood medians (B5 $215,130, R1
  $246,610, R4 $249,932) are the more honest training-level summaries, and they differ far less than the peaks.

## 4. Other gates

- **T8 (benchmark materiality)** — net ≥ B5 + $25,000, P50 ≥ B5's P50 + $25,000 and net ÷ DD ≥ 0.90 × B5's — passed only
  by R1 (P50 $246,610 vs the $240,130 bar). R3, R4 and R5 beat B5's raw net but not its smoothed one by $25,000.
- **T3 (costs)** failed by R6, C5, C6, A2, A3, A5: their net at 10 bps keeps < 85% of the 5 bps net (many short XBI/XRT
  lots).
- **T7 (membership)** failed by B4 and ten shortlisted configurations: some member's marginal training net is ≤ 0 (B4's
  includes a member that adds nothing; several archive picks carry an inert or harmful extra member).
- **T1/T2** failed by the broad configurations (R2/C2, 9–10 books: minute drawdown above $35,000 at 10 bps and portfolio
  daily DD above 35%) and by the four three-book KRE + GDX + one archive picks (portfolio daily DD 35.3–35.5%).
- **Ties** were immaterial: 0–1 contested same-minute grants for the leaders; reversing the tie order changed R1's net by
  $7,224 and R5's by $61,946 (one contested 2020 grant).

## 5. Answers to the brief's dependence questions (training)

| Question | Answer |
|---|---|
| Do top solutions depend on GDX? | Yes: GDX is in all top 200 by Q; it is the largest marginal member of R1 (+$155k). |
| On VGT? | No — the opposite: none of the top 200 contains VGT; removing VGT from B5's books is R1's main structural change. |
| On more than eight symbols? | No: no subset of ≥ 12 books was feasible; the best 9–11-book subset made $290,590 at a $33,210 drawdown. |
| On 2020? | Partly: 2020 is 43% of both R1's and B5's net; R1's edge over B5 is 95% a 2020 re-timing. |
| On one giant trade? | No: the two largest lots are 19% of R1's net (B5 17%); the worst lot −$8,258. |
| Is the ranking path-fitted? | Yes, by T6: one-step joint perturbations halve the leaders' nets; 2,026 configurations beat B5's training net. |

## 6. Joint refinement

Refinement raised every contender's J (c1 $442,365 → $467,806; c3 $375,362 → $418,267; c5 $343,020 → $398,276; c2
$194,230 → $288,741) with 92 accepted moves, almost all one-parameter coordinate moves (77), plus 12 membership moves
(dropping an inert or harmful member, or swapping one) and 3 joint moves; it retuned several members per contender
(c2 eleven, c5 four, c3 four, c1 three). It changed the funded interaction materially — c1 kept 51 of 82 lots and
exchanged 31 for 22 others (+$25k net), c2 exchanged 29 of 50 — but its gains are exactly the kind T6 measures: local
peak-climbing on one training path. The refined configurations' joint P50 shares (0.20–0.67) are no better than the
contenders' (0.38–0.63).
