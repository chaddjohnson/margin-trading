# Chronological fold comparison — A0 versus A1 / A2 / A3, every pool and K

**Evidence level: retrospective, period-correct method replay (inspected history).** Each procedure chose its nominee
from its fold's training data only (sealed `results/libraries/<fold>/SELECTION.json` before any later bar opened, by
the calendar door); the windows were inspected by earlier studies; **ARCH results are the weakest evidence**: A0's
fold outcomes were published by the standalone audit (and read by this study's designer before the protocol) and ARCH
outcomes are derivable by subtracting published archive nets (PROTOCOL §0). Records: `results/analysis/ANALYSIS.json`
(sealed), `results/tables/comparisons.md|csv`, `verdicts.md`, `across-etf.md`, `ablations.md`, `nominees.csv`,
`ledgers.csv`. V = the window's liquidation-equivalent increment of one continuous run from 2016 (each ETF alone in
its own $100,000 slot); an ETF without a nominee contributes 0 (an idle slot).

## 1. The verdicts (predeclared rules, PROTOCOL §9.3; first matching rule applies)

| Pool | A1 (wide, original J_s scoring) | A2 (wide, tail-compatible T) | A3 (wide, neighbourhood risk) |
|---|---|---|---|
| **ARCH** (like-for-like candidates) | no evidence of improvement | mixed / inconclusive | **demonstrably worse or risk-incompatible** |
| NEW | mixed / inconclusive | **demonstrably worse or risk-incompatible** | no evidence of improvement |
| NEW-S | no evidence of improvement | **demonstrably worse or risk-incompatible** | **demonstrably worse or risk-incompatible** |
| ALL | no evidence of improvement | **demonstrably worse or risk-incompatible** | **demonstrably worse or risk-incompatible** |

**Study outcome (§9.4): no demonstrated improvement.** No arm "improves" on any pool; not every arm is "worse" on
ARCH; no arm is favourable at K = 16 in both folds on any pool. Across-ETF verdicts (top 5 vs the baseline's top 5):
ARCH A1 worse, A2 mixed, A3 worse; NEW all mixed; NEW-S A1 mixed, A2 worse, **A3 improves**; ALL all mixed (§4). The
outcome applies §9.4 to the within-ETF verdicts; on the alternative reading noted in
`MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md` §4, NEW-S A3's across-ETF "improves" would make it "mixed / inconclusive".

Comparison states per K (F favourable, U unfavourable, · neither, i insufficient, R risk-incompatible), fold A | fold B:

| Pool | Arm | K = 8 / 16 / 32 / 64, fold A | fold B |
|---|---|---|---|
| ARCH | A1 | U U U U | · · · · |
| ARCH | A2 | **F F F F** | U U U U |
| ARCH | A3 | U ·R U U | U U UR UR |
| NEW | A1 | U U U U | **F F F F** |
| NEW | A2 | U UR UR UR | UR UR UR UR |
| NEW | A3 | · · ·R ·R | F · · · |
| NEW-S | A1 | · · · · | U U UR UR |
| NEW-S | A2 | · · · · | UR UR UR UR |
| NEW-S | A3 | **F F F F** | ·R UR UR UR |
| ALL | A1 | U U U U | · · · · |
| ALL | A2 | · ·R ·R ·R | U U U U |
| ALL | A3 | U · · U | ·R ·R · UR |

**Every favourable result in one fold is reversed or absent in the other**: A2 on ARCH is favourable at every K in fold
A and unfavourable at every K in fold B; A1 on NEW the opposite; A3 on NEW-S favourable in fold A and risk-incompatible in
fold B. This is the pattern of regime dependence, not of a better selection rule.

## 2. Primary design point K = 16 (Σ V over 61 ETFs, 5 bps unless stated)

Fold A — 2020-07-01 → 2021-12-31 (training through 2020-06-30):

| Pool | Arm | Nominees | Window lots | Σ V 0 / 2 / 5 / 10 bps | Mean ΔV vs baseline (5 / 10) | W / L / identical | Clusters W / L | DD > $35k |
|---|---|---:|---:|---|---|---|---|---:|
| ARCH | **A0** (sealed) | 49 | 195 | $306,094 / $298,341 / **$295,657** / $249,607 | baseline | — | — | 0 |
| ARCH | A1 | 54 | 155 | … / **$187,259** / $180,152 | −$1,777 / −$1,139 | 15 / 18 / 17 | 3 / 11 | 0 |
| ARCH | A1n | 53 | 188 | … / $236,717 / $198,797 | −$966 / −$833 | 8 / 13 / 36 | 4 / 7 | 0 |
| ARCH | A2 | 56 | 177 | $362,630 / $364,513 / **$355,439** / $323,290 | **+$980 / +$1,208** | 27 / 16 / 8 | 9 / 6 | 0 |
| ARCH | A3 | 47 | 137 | … / $292,626 / $278,955 | −$50 / +$481 | 23 / 18 / 10 | 7 / 7 | **3** |
| NEW | A0r | 50 | 151 | … / $208,014 / $179,886 | baseline | — | — | 0 |
| NEW | A1 | 51 | 119 | … / $75,731 / $74,863 | −$2,169 / −$1,722 | 7 / 15 / 27 | 4 / 6 | 0 |
| NEW | A2 | 53 | 138 | … / $108,839 / $100,705 | −$1,626 / −$1,298 | 13 / 25 / 13 | 6 / 7 | 3 |
| NEW | A3 | 48 | 106 | … / $234,526 / $207,229 | +$435 / +$448 | 20 / 21 / 9 | 8 / 6 | 2 |
| NEW-S | A0r | 51 | 150 | … / $119,226 / $96,722 | baseline | — | — | 1 |
| NEW-S | A3 | 47 | 105 | … / **$321,041** / $294,777 | **+$3,308 / +$3,247** | 27 / 17 / 10 | 8 / 4 | 2 |
| ALL | A0r | 51 | 197 | … / $302,422 / $255,794 | baseline | — | — | 0 |
| ALL | A2 | 55 | 186 | … / $337,894 / $314,313 | +$582 / +$959 | 23 / 22 / 7 | 8 / 7 | 3 |

Fold B — 2022-01-03 → 2023-12-29 (training through 2021-12-31):

| Pool | Arm | Nominees | Window lots | Σ V 0 / 2 / 5 / 10 bps | Mean ΔV vs baseline (5 / 10) | W / L / identical | Clusters W / L | DD > $35k |
|---|---|---:|---:|---|---|---|---|---:|
| ARCH | **A0** (sealed) | 54 | 595 | −$95,476 / −$118,914 / **−$159,268** / −$165,415 | baseline | — | — | 11 |
| ARCH | A1 | 56 | 507 | −$26,726 / … / **−$78,358** / −$110,544 | +$1,326 / +$900 | 19 / 21 / 13 | 8 / 6 | 8 |
| ARCH | A1n | 55 | 616 | … / −$124,244 / −$137,440 | +$574 / +$459 | 12 / 10 / 34 | 6 / 6 | 8 |
| ARCH | A2 | 56 | 499 | −$366,342 / … / **−$403,517** / −$447,148 | −$4,004 / −$4,619 | 17 / 26 / 11 | 6 / 9 | 12 |
| ARCH | A3 | 50 | 457 | … / −$238,865 / −$276,539 | −$1,305 / −$1,822 | 24 / 27 / 7 | 6 / 9 | 13 |
| NEW | A0r | 50 | 441 | … / −$286,516 / −$321,978 | baseline | — | — | 12 |
| NEW | A1 | 52 | 448 | … / −$236,240 / −$271,935 | **+$824 / +$820** | 19 / 15 / 22 | 9 / 5 | 12 |
| NEW | A2 | 53 | 466 | … / −$494,700 / −$547,708 | −$3,413 / −$3,700 | 15 / 28 / 14 | 4 / 10 | **16** |
| NEW | A3 | 49 | 393 | … / −$85,718 / −$112,519 | +$3,292 / +$3,434 | 25 / 18 / 10 | 7 / 7 | 12 |
| NEW-S | A0r | 50 | 445 | … / −$151,290 / −$209,755 | baseline | — | — | 9 |
| NEW-S | A3 | 47 | 452 | … / −$277,181 / −$316,046 | −$2,064 / −$1,742 | 23 / 24 / 11 | 6 / 8 | **17** |
| ALL | A0r | 54 | 577 | … / −$114,423 / −$119,216 | baseline | — | — | 10 |
| ALL | A2 | 57 | 521 | … / −$327,358 / −$382,497 | −$3,491 / −$4,316 | 18 / 28 / 10 | 5 / 10 | 10 |

(Every pool × arm × K row, with 0/2 bps and medians: `results/tables/comparisons.md`.)

- **Fold B lost money for every procedure.** 2022–2023 was a bear market followed by a partial recovery; D1 bought
  many dips that kept falling (595 lots for A0 on ARCH, 343 losers; 11 of 54 nominees breached $35,000 of windowed
  minute drawdown). Fold A (the 2020–2021 rebound) was profitable for every procedure.
- **A2 (tail-compatible) helps when large rebounds follow and hurts most when they don't:** best of all arms on ARCH
  in fold A (+$59,782 over A0), worst in fold B (−$244,249 vs A0); on NEW it is the worst arm in both folds.
- **A1 (wide, same J_s)** loses to the narrow rule in fold A on ARCH (−$108,398) and gains in fold B (+$80,910); its
  J_nb second stage re-ranks families, but which way that pays depends on the window.
- **A3** has the most drawdown breaches in fold B (13 on ARCH, 17 on NEW-S) and therefore fails the risk condition
  (B_arm ≥ B_base + 3) in several cells.
- Costs: the engine is re-run at each cost (stops and continuation eligibility change, so V at 0 bps is not V at
  5 bps plus friction); the favourable condition requires both 5 and 10 bps; 10 bps flips two near-zero comparisons
  at K = 16 (fold A ARCH A3, fold B ALL A1) and no verdict.

## 3. Where the differences come from (descriptive; PROTOCOL §9.2)

Four-way split of A2 vs A0 on ARCH at K = 16 (ETFs: n, W/L, Σ ΔV):

| Fold | identical | both nominate, different vectors | only A2 nominates | only A0 nominates | mean ΔV without the largest cluster |
|---|---|---|---|---|---|
| A | 8 | 44: 21 / 15, −$57,026 | 8: 6 / 1, **+$116,808** | 1: 0 / 0, $0 | +$1,726 |
| B | 11 | 48: 17 / 24, **−$187,162** | 2: 0 / 2, −$57,087 | 0 | −$2,561 |

A2's fold-A "favourable" rests on the 8 ETFs where it nominated and A0 abstained (A0's J_s rule had declined them);
where both nominated, A2's choices were worse (−$57k). The largest cluster contributions: fold A US financials −$38,602,
US broad/size/factor +$31,422, healthcare/biotech −$28,667, precious metals +$23,707; fold B US broad −$111,088,
US tech/growth −$83,460, US cyclical +$44,116.

## 4. Across-ETF selection (top 5 by each arm's own score, each in its own slot; descriptive Δ vs the baseline's top 5)

| Pool | Arm | Δ Σ V, fold A, K = 8 / 16 / 32 / 64 | fold B | Verdict |
|---|---|---|---|---|
| ARCH | A1 | −$9k / −$9k / −$3k / −$3k | −$9k (all K) | worse |
| ARCH | A2 | +$23k / −$17k / −$17k / −$17k | +$14k (all K) | mixed |
| ARCH | A3 | −$28k / −$36k / −$45k / −$40k | −$22k / −$18k / −$15k / +$38k | worse |
| NEW | A1 | −$17k (all K) | +$14k (all K) | mixed |
| NEW | A2 | −$52k (all K) | +$18k (all K) | mixed |
| NEW | A3 | −$52k / −$16k / −$17k / −$17k | +$49k / +$84k / +$52k / +$82k | mixed |
| NEW-S | A3 | +$30k / +$23k / +$23k / −$5k | +$84k / +$62k / +$15k / +$49k | **improves** |
| ALL | A2 | −$50k (all K) | +$14k (all K) | mixed |

The baseline's ARCH top 5 by J_nb was GDX, XHB, SMH, XLY, IJR in fold A (Σ V +$29,517) and GDX, XHB, KBE, XRT, VGT in
fold B (−$3,560) — the across-ETF A0 is a study construct, not the source's R1/R2 ranking. **NEW-S A3's across-ETF
"improves" is one of 12 across-ETF cells and sits beside a within-ETF verdict of "demonstrably worse or
risk-incompatible" for the same arm and pool**; with the extra selection layer across 61 ETFs and 12 chances, it is not
evidence that A3 selects ETFs better (see `MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md`). Sensitivity to the number of ETFs
searched (top 5 drawn from 50 seeded subsets): on ARCH, the median Δ vs A0 is negative for every arm at subset sizes 15
and 30 in both folds (share of subsets with Δ > 0: 14–46%; `results/tables/etf-subsets.md`).

## 5. Ablations (descriptive; never in a verdict)

- **Diversity vs more trials.** A1 vs A1n (same K, J_s scoring; families vs raw top-K): fold A unfavourable at every K
  on ARCH, NEW and ALL (−$811 to −$1,037 mean ΔV at K = 16), neither on NEW-S; fold B favourable or neither on ARCH,
  ARCH-S and ALL (+$752 on ARCH at K = 16) but unfavourable on NEW-S at every K (−$526 at K = 16) and on NEW at K = 64
  (−$674). The equal-budget diversity comparison A1(8) vs A0: fold A unfavourable (−$1,950 mean ΔV, W/L 15/18), fold B
  neither (+$852, 20/20). **Diversity at equal trials did not help consistently.**
- **Budget-matched pools** (each arm on ARCH-S vs the same arm on NEW-S, K = 16): fold A A0r −$1,470, A1 −$1,152, A2
  +$3,360, A3 −$2,779 mean ΔV; fold B A0r −$752, A1 +$639, A2 +$356, A3 +$1,481. Neither design is better.
- **Complete procedures against the sealed A0 on ARCH** (new pools have half the budget): fold A every NEW/NEW-S arm is
  unfavourable or neither (A0r on NEW −$1,437; A2 on NEW −$3,063 and risk-incompatible); fold B A2 on NEW −$5,499 and
  risk-incompatible, A3 on NEW +$1,206 (neither). **The new search did not produce a better procedure than the archive's
  narrow rule.**
- **Library diagnostics** (ARCH and NEW, K = 16 and 64): the hindsight oracle (the best library member per ETF,
  labelled hindsight) averages $22–36k per ETF in fold A and $13–21k in fold B, against the arms' nominees' −$8.1k to
  +$5.8k; **a nominee did about as well as a random member of its own library** (e.g. fold A ARCH: A1 $3,070 vs a random
  member's $3,641; A2 $5,827 vs $5,352; fold B ARCH: A1 −$1,285 vs −$2,582; A2 −$6,615 vs −$4,306; the nominee figures
  are means over all 61 slots with idle slots at 0, the random-member figures means over the 57 ETFs with a library —
  over the same 57 the nominees' means are $3,285, $6,236, −$1,375 and −$7,079); the rank
  correlation between the arm's training score and window V across library members is −0.14 to +0.25 (most |ρ| <
  0.12). The libraries contain later winners, but nothing in the training data identifies them.

## 6. The rolling one-year track (NEW, K = 16, vs A0r(NEW); supplementary, overlapping)

| Year (fold) | A0r Σ V | A1 | A2 | A3 |
|---|---:|---|---|---|
| 2019 (S18) | $177,433 | neither (−$54) | unfavourable (−$445) | unfavourable (−$817) |
| 2020 (S19) | $6,812 | neither (+$64) | neither, risk-incompatible (+$135) | neither (+$2,176) |
| 2021 (S20) | −$2,391 | **favourable** (+$657) | neither (−$805) | neither (−$136) |
| 2022 (S21, fold B's NEW pool) | −$324,706 | **favourable** (+$105) | unfavourable, risk-incompatible (−$4,638) | neither (+$956) |
| 2023 (S22) | $45,425 | neither (+$58) | unfavourable (−$192) | unfavourable (−$372) |

Mean ΔV per ETF in parentheses. No arm is favourable in ≥ 3 of 5 years (A1: 2 of 5). A2 is unfavourable in three
years. S21 has no full-engine rows (its event attribution is not computed); its fast-path V at 5 and 10 bps is
cross-checked against phase B. **Caveat (PROTOCOL §3.2):** the pre-freeze fold-a reconstruction and census read bars
2016-01-04 → 2020-06-30, which contain all of S18's 2019 window and the first half of S19's 2020 window (archived
fold-a grids on their own training span only; no NEW grid was evaluated); the track's first two years were therefore
not unseen by the designer at the level of the archive's training paths.

## 7. Matching-window references (context only; hindsight-advantaged)

VGT primary run alone in its slot (continuous from 2016): fold A +$32,698 (14,894 windowed minute DD), fold B +$22,145
(17,421), 2019 +$32,310, 2020 +$75,298, 2021 +$2,015, 2022 +$22,145, 2023 $0 (no 2023 lot). These reproduce the
source's sealed validation figures to the cent (ANCHORS). B4 and B5 (pooled, $100,000 shared slot; source VALIDATION):
fold A +$62,161 / +$46,506, fold B +$112,826 / +$170,997. These were chosen with 2016–2026 known; they are not a test
and not comparable to Σ V over 61 separate slots.
