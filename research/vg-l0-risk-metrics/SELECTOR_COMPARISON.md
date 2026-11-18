# SELECTOR_COMPARISON — Stage 5: P0, P1, P2 on identical archived populations (retrospective)

**Every rule here is experimental and not adopted.** P2 and its variants were frozen in PROTOCOL.md §9 (sha256
`0cfa3238…fb14`, committed `cdb87439`) before any of their results existed; their designer had read Assignment 3's,
Assignment 2's and the walk-forward diagnostic's results (PROTOCOL §2). Records: `results/selection/members-C19…C24.json`,
`selectors.json` (`46cfd342…c9e3`), `folds.json` (`f57968da…1094`); tables `selector-primaries.csv`,
`sequential-paths.csv`, `comparison-labels.csv`, `item9-open-winners.csv`.

## 1. Design and fairness

| Selector | Rule (one line) |
|---|---|
| **P0 / NL0-original** | highest centre marked net among Q1–Q6 qualified (Assignment 3's code, unchanged) |
| **P1 / RA1** | screens S1 open multiple ≤ 1.5, S2 open share ≤ 25%, S3 worst MAE ≥ −$17.5k, S4 selection worst-10% DD ≤ $35k → fewest failures → 5% band of realized + min(0, unrealized) → lowest occupancy (unchanged) |
| **P2 (= P2a, MDD-hard)** | Q1–Q6 ∧ G1 trade principal loss ≤ $35k ∧ G2 banked-capital DD ≤ $35k → bounded-loss-exit tier first → 5% band of the stop-aware conservative net CN* → lowest banked DD |
| **P2b (alternative constraint)** | as P2 but Q2/Q3/Q5's DD parts relaxed to $50k (G1, G2 kept) |
| P2−tier, P2−stop, P2@25k | report-only ablations: no tier; RA1's valuation instead of CN*; G1/G2 at $25k |

- **Identical populations and evidence:** the 2,520 archived members (L, B, F at C19/C21/C23/C24; N, U at C24); each
  member's centre replayed on its own cutoff door (gate **G5a**: all 2,520 equal their archived evidence); P0, P1 and RA2
  re-derived every sealed Assignment 3 primary (**G5b**); the re-chained P0/P1/RA2 paths equal the sealed sequential record
  to the cent (**G5c**). No selector received a larger search, a later slice or a confirmation family for ranking.
- **Training-only inputs:** the stop states use bars up to the cutoff close; CN* credits an open lot only up to its
  armed executable level under a 10% gap; no threshold was set from a slice result.

## 2. The principal gates never bound (and could not)

G1 and G2 removed **0 qualified members in every population at every cutoff**; P2@25k removed 0–3. This is structural
(SELECTION_PIPELINE_AUDIT §3): on a one-slot ledger the conventional DD bounds the marked trade principal loss exactly and
the banked-capital drawdown (barring partial sales under water), so with Q2 ≤ $35k a $35k principal gate is redundant.
Every difference between P2 and P0/P1 therefore comes from the **tier**, the **stop-aware valuation** and the **banked-DD
tie-break**.

## 3. Chronological paths (retrospective; previously examined history)

| Population | Selector | Sequential net | Sequential DD | Verdict (frozen rule) | DD attribution: giveback / principal / charges |
|---|---|---:|---:|---|---|
| L | P0 original | $16,649.15 | $52,530.30 | unsupported | $24,622 / $27,908 / $0 |
| L | P1 RA1 | **$40,600.52** | **$31,318.53** | supported (Assignment 3's independent verdict) | $23,077 / $8,241 / $0 |
| L | **P2** | $28,504.47 | $60,311.75 | unsupported | $10,177 / $50,135 / $0 |
| L | P2b | = P2 | | | |
| B | P0 original | −$29,331.84 | $114,794.33 | unsupported | $45,557 / $69,137 / $100 |
| B | P1 RA1 | **$99,323.64** | **$42,647.60** | unsupported | −$6,232 / $48,830 / $50 |
| B | **P2** | $12,586.79 | $85,107.97 | unsupported | $31,639 / $53,369 / $100 |
| F | P0 original | −$50,121.09 | $117,684.72 | unsupported | $19,661 / $97,924 / $100 |
| F | P1 RA1 | **$74,206.21** | **$46,435.28** | unsupported | −$6,232 / $52,617 / $50 |
| F | **P2** | $12,140.42 | $62,721.94 | unsupported | −$37,585 / $100,207 / $100 |
| F | P2−tier (ablation) | $18,163.18 | $55,840.83 | unsupported | $17,251 / $38,590 / $0 |
| F | P2−stop (ablation) | $55,014.29 | $45,371.19 | unsupported | $5,456 / $39,815 / $100 |
| F | RA2 (Assignment 3's ablation) | $93,717.10 | $22,835.97 | supported (secondary; never nominates) | $13,669 / $9,167 / $0 |

Every sequential-DD attribution closes exactly (giveback + principal + switch charges inside the window = DD, residual
$0.00). Negative giveback = open profit gained inside the window (an offset).

**Frozen comparison labels (band $2,500):**

| Comparison | L | B | F |
|---|---|---|---|
| RA1 vs P0 (check: Assignment 3's sealed labels reproduced) | risk improvement | risk improvement | risk improvement |
| **P2 vs P0** | mixed (+$11,855; DD +$7,781) | mixed (+$41,919; DD −$29,686) | **risk improvement** (+$62,262; DD −$54,963) |
| **P2 vs P1 (RA1)** | **profit sacrifice without clear benefit** (−$12,096; DD +$28,993) | **profit sacrifice without clear benefit** (−$86,737; +$42,460) | **profit sacrifice without clear benefit** (−$62,066; +$16,287) |
| P2b vs P2 | no material difference (identical primaries) | same | same |
| P2−stop vs P2 | risk improvement | risk improvement | risk improvement |
| P2−tier vs P2 | no material difference | no material difference | risk improvement |
| P2@25k vs P2 | no material difference | same | same |

**Result:** P2 is better than the original rule in F but **worse than RA1 in all three populations**; no P2 path is
supported. The stop-aware valuation is the component that hurts (removing it is a "risk improvement" in L, B and F); the
tier's effect is mixed. P2b changes nothing on these populations (they contain nothing it could admit that would win).

## 4. Why the rules differ — the mechanism

**C19 (2020–2021 slice).** The original rule's top-10 in L, B and F are dominated by members carrying a D1·VGT lot bought in
December 2018 at 1.51–1.55× its principal (+$40–43k open). RA1 screens them out (S1, S2). Their **trailing stops were
armed** 12.5–14.3% below the cutoff close, so CN* credits $7.2–10.1k of protected value; P2 therefore ranks them near the
top again (F: the original's #7 becomes P2's primary). In 2020 those stops **worked**: the carried lots gave back only
$6.0–7.9k from their cutoff marks and exited in February 2020 with +$35–38k. The slices still breached ($50.6–63.3k) through
**new lots' losses below principal** in the crash ($27.9–67.2k of each breaching slice's DD was principal loss). The configurations that carried big
winners at the 2019 cutoff were the ones fitted to the 2019 rally, and their dip-buys then lost in the crash. **RA1's
exposure screens acted as a proxy for that regime fit, not because the open lots were unprotected.** Stop-aware
valuation corrects the lot-level judgement and loses the proxy.

**C21 (2022–2023 slice).** In L the original's top-10 carried Growth·VGT winners at 1.59–1.65× that were **retention
remainders with no executable price stop** (trend exit only): CN* credits nothing (−$0.3k to −$2.8k), so the stop-aware
view makes them look riskier than RA1 assumed. In B and F the original's primary `GD0.VA0/R1#1` carried a Growth·VGT
winner at 1.97× with an armed trailing stop (credit +$8.3k), but its Growth book had no maximum hold and no initial stop:
P2's tier ranked it 158th/364th. It went on to give back $25.6k from its cutoff mark and lose **$37,603 below principal on
one lot** in 2022 (slice DD $65,006). P2's C21 primary in B and F (`GB1.VA1/R1#5`, bounded) had a slice DD of $34,293 —
better than RA1's F primary ($38,874, whose unbounded Growth·VGT lot lost $36,289 below principal), worse than RA2's
($19,112, unbounded but lucky).

**C23 (2024 slice).** Small differences; P2's L primary (`GA0.VA0/R2#5`) and the others stayed under $26k.

**C24 (descriptive; FULL is previously examined).** P2's L primary is `GA0.VA0/R1#2 robust` (bounded): 2025–2026 +$50,612
with reset DD $20,297 and full history $262,108 / $32,089, where L/RA1's open-ended Growth lot broke the ceiling
($35,071.88 / $47,493.73). P2's F primary `GB0.VB1/R1#4` did slightly worse than RA1's on 2025–2026 (+$39,115 / $19,570
versus +$48,787 / $19,060). In N and U, P2 = P0 = **N/original** (CN* = its realized net: nothing open at 2024-12-31; it
is bounded and its banked DD ties New L0's). These C24 rows are not chronological evidence: the tier was motivated by
knowledge of exactly L/RA1's 2025 failure (PROTOCOL §2).

## 5. Brief item 9 — high-ranked candidates RA1 rejected mainly for open-position size

| Cutoff, population | P0 top-10 failing only S1/S2 | Their open lot at the cutoff | Stop-aware assessment | Outcome on the next slice |
|---|---:|---|---|---|
| C19 L / B / F | 8 / 5 / 6 | D1·VGT from Dec 2018, 1.51–1.55× | armed trailing 12.5–14.3% below the close; credit +$7.2k to +$10.1k | the lots exited with +$35–38k (giveback $6.0–7.9k); the configurations' slices breached ($50.6–63.3k) except `GC1.VA0/R1#1` ($28,234) — from new-lot principal losses |
| C21 L | 10 | Growth·VGT retention remainders, 1.59–1.65× | **no price protection** (trend exit only); credit −$0.3k to −$2.8k | (the original's L primary: slice DD $24,180) |
| C21 B / F | 7 / 4 | Growth·VGT 1.97× (one D1·VGT 2.21×) | armed trailing (credit +$8.3k to +$53.4k) but **unbounded Growth books** (P2 ranks them 152nd–368th by its tier) | `GD0.VA0`/`GD0.VC0` family: carried-lot giveback $25.6–27.7k; the `GD0.VA0` variants also had one lot $37.6k below principal; slice DDs $65.0–69.0k |

**Answer.** RA1's open-exposure screens rejected two different things: protected winners (C19; the stop-aware view says
they were protected, and they were) and unprotected or open-ended exposure (C21; the stop-aware view agrees with RA1 or is
stricter). The stop-aware evaluation genuinely changes the **lot-level** risk assessment, but on this history the
configurations carrying large protected winners at a cutoff still failed afterwards for other reasons, so a selector that
rewards protected open profit did worse than RA1's blunt screen.

## 6. Is any advantage robust enough to justify a future large search?

No. P2 lost to RA1 in all three populations; its one clear benefit — preferring bounded loss exits — was designed with
knowledge of the failures it avoids, has mixed ablation evidence (F: removing it improved the path) and rests on two
breaking regimes in one examined history. The populations themselves were pruned upstream by the conventional DD gate
(SELECTION_PIPELINE_AUDIT §2), so no final selector can test the "relaxed MDD with principal protection" philosophy on
them: P2b had nothing different to choose. Testing that philosophy requires a search whose plausibility, feasibility and
promotion use the new envelope (PROPOSED_METHOD.md), and its evidence would still be retrospective on 2016–2026.

## 7. Limitations

Retrospective throughout; three correlated slices; 2024 carried almost no D1 information; P2 was designed after the
outcomes were known; the 10% stop-gap stress is a round choice made knowing that 2020 stop fills reached ≈ 8% beyond
their levels; the verdict suffix "(retrospective, AD6)" that `folds.json` prints on every supported path also appears on the
re-chained P0/P1/RA2 controls, whose verdicts are Assignment 3's own (independent) — a labelling artefact of this study's
chain function, not a change of their status.
