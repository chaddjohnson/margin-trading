# REPORT — New L0 shadow-position entry eligibility: implementation, fixed-parameter comparison and four optimization tracks

Research only, not deployed. **New L0 primary: VGT + GDX** (Priority 5B `C24/L0/informed/R1#1 profit`: D1·VGT + D1·GDX +
VGT Growth in one shared $100,000 slot; Growth·GDX OFF; calendar-day maximum holds; 5 bps per side; 11% interest) gained an
experimental, allocator-level **shadow-position entry eligibility** with three independent toggles (D1·GDX, D1·VGT,
Growth·VGT), and was re-optimized in four tracks with the recovered reference method NL0 1.0.0: **A1** incumbent-informed
joint, **A2** incumbent-informed sequential (D1 pair, then Growth), **B1** from-scratch joint, **B2** from-scratch
sequential. **DD** = the maximum minute drawdown of the marked net on the fixed $100,000 (ceiling $35,000). Development and
every choice: 2016-01-04 → 2024-12-31; validation 2025-01-02 → 2026-10-30, **previously examined history, not an untouched
holdout** (Priorities 3–8 and Strategy Lab examined it; New L0's own result was known). Every figure comes from sealed
records (`results/`, 90 records verified against `results/seals.jsonl`); complete tables in `results/tables/` (and
`summary.json`). No charts (standard §7.7).

## 1. Bottom line

**Shadow eligibility does not make New L0 materially better, and nothing here warrants replacing it.**

- **On New L0's own parameters** eligibility never helps: Growth·VGT alone changes nothing (its refused opportunities never
  outlive the occupying lot), and every combination with a D1 toggle is *harmful* (−$50,827 to −$137,628 on development):
  delayed D1 entries occupy the one slot when New L0's larger fresh trades arrive (D1·VGT alone: −$75,049 in 2020 and
  −$40,114 in 2022, although its 7 recovered lots earned +$35,452).
- **Re-optimized with eligibility**, the best candidates are New L0's close relatives with **Growth·VGT eligibility only**:
  the study's nominee (A1) earns **+$3,654.58** on development and A2's primary **+$1,400.61**. Frozen labels: nominee vs New
  L0 **inconclusive** (12 of 28 replicates beat New L0 by more than $2,500 where 19 were required, and its confirmation p10 is
  $9,487 lower); A2 vs New L0 **no material difference**. Their gain is one delayed Growth entry in 2023 (+$18,339 /
  +$18,611) offset by parameter changes that cost $12,975 / $9,177 without eligibility.
- **From scratch** (B1, B2), with each track's search at least Priority 3B's scale (≈ 6.8–7.0 M evaluations), the best
  phenotypes are very different and far worse (−$150,639 and −$67,280 on development: *harmful*), and both procedures fail the
  chronological test (sequential DD $80,475 / $74,307 over 2020–2024).
- **Joint vs sequential:** no material difference among the informed tracks; among the fresh tracks the sequential B2 won at
  C24 (+$83,359 over B1) but lost the chronological path (−$11,517 against +$71,407; both unsupported) — no method claim.
  **Informed vs fresh:** informed wins by $70–155k on development (and again on the examined validation).
- **Validation (examined):** New L0 reproduced exactly ($96,883.72; full history $479,605.18). Nominee $94,336.06 (−$2,548),
  full $480,712.10 (+$1,107); A2 $100,436.47 (+$3,553), full $484,558.55 (+$4,953) with a lower drawdown ($19,459.83 vs
  $20,385.99). Both differences are inside the search variability and the development labels stand unchanged.

**Recommendation:** keep New L0 (all toggles OFF). Do not adopt any D1 toggle. If the user wants to keep watching the idea,
the only defensible observation candidate is **A2's primary** (Growth·VGT eligibility, New L0-like D1 pair): qualified,
validation and drawdown slightly better than New L0, but its development gain is not material and rests on one event.
Nothing is deployed or adopted.

| | A: New L0 (all OFF) | Nominee = A1 primary | A2 primary | B1 primary | B2 primary |
|---|---:|---:|---:|---:|---:|
| Toggles | none | Growth·VGT | Growth·VGT | none | Growth·VGT |
| Training net 2016–2024 | $382,721.46 | **$386,376.04** | $384,122.07 | $232,082.54 | $315,441.49 |
| Training DD | $19,459.83 | $19,459.83 | $19,459.83 | $21,542.48 | $21,632.01 |
| Confirmation p10 / p90 DD (384 draws) | $203,648.26 / $30,677.36 | $194,160.91 / $32,238.36 | **$220,989.50** / $30,884.55 | $106,611.56 / $29,762.56 | $131,320.50 / $34,433.23 |
| Validation P&L (examined) | $96,883.72 | $94,336.06 | **$100,436.47** | $25,035.48 | $89,792.72 |
| Reset validation DD | $20,385.99 | $20,385.99 | **$17,744.98** | $24,826.82 | $21,776.54 |
| Full history net | $479,605.18 | $480,712.10 | **$484,558.55** | $257,118.02 | $405,234.22 |
| Full history DD | $20,385.99 | $20,385.99 | **$19,459.83** | $34,375.20 | $21,776.54 |
| Recovered (delayed) lots, development (net) | — | 2 (+$16,050.58) | 3 (+$24,175.78) | — | 2 (+$2,080.73) |
| Frozen label vs A | — | inconclusive | no material difference | harmful | harmful |

## 2. Phase 0 — documentation preserved; historical integrity kept

- `main` now holds NL0 1.0.0 (`docs/research/methods/`), standard 2.1.0 with its registry, template and adoption template,
  the roadmap and the trading-session study's complete records (`research/vg-l0-session-hold/`): commit `2346a1b5`, a
  fast-forward of the previous `main` (`aa5754d4`), 105 files, documentation and records only — no source file and **not**
  the experimental trading-session engine change. Built without checking out `main` (the live Strategy Lab server was not
  touched); pushed and verified (`git ls-remote`). The research branch `research/vg-l0-session-hold` and its history are
  unchanged.
- This study's branch starts **before** the trading-session engine change (`6eb85160`) and implements eligibility only in
  new files: Priority 3's evaluation digest here is its historical sealed `147cad7c…` (checked by stage V and the freeze); no
  historical integrity check was weakened, bypassed or repinned.
- New L0 verified (§3 of the protocol): development $382,721.46 / $19,459.83 / 34 lots reproduced through this study's engine
  before any experiment; full-history figures verified from three sealed artifacts and reproduced exactly by the validation
  ($96,883.72 / $20,385.99; $479,605.18; realized $485,169.93; unrealized −$5,564.76).

## 3. The implementation (Phase 1; `IMPLEMENTATION.md`)

- **Allocator-level, isolated:** `allocator.ts` is a copy of Priority 3's `runPool` with marked `SHADOW` insertions; with
  every toggle OFF no shadow code runs. The books are Priority 3's canonical virtual books (unchanged): a refused entry's
  **shadow position** is the book's own virtual trade.
- **Eligibility:** an episode starts at a "slot occupied" refusal of a toggled book and lasts exactly while its hypothetical
  trade is open (no expiry interval, no price guard); it ends at the hypothetical exit, at consumption, or at the door's end.
- **Release ordering:** the check runs at the end of the minute in which the funded lot's final exit fills (or the close);
  fresh signals stamped at or before it go first; live shadows compete in the frozen same-instant order (D1:GDX, D1:VGT,
  G:GDX, G:VGT); a shadow whose hypothetical trade exits at or before the check is not eligible.
- **Independent real position** (`position.ts`): the delayed entry fills at its book's own fill rule and is managed by the
  unchanged ShadowBook / ExitManager / PositionRules from its own fill — own price, shares, costs, trailing stop, holding
  clock, interest, initial stop and retention; the shadow trade never closes it.
- **Verification (sealed stage V, 730 checks, 0 failed, on the frozen code):** 1,000 / 1,000 archived 5B records and every
  control reproduce with the toggles OFF; '000' equals Priority 3's `runPool` field for field; causal prefixes (D19–D23 vs
  D24) with every toggle ON; accounting; 616 delayed lots obey every rule (459 exit on their own path ≠ the hypothetical
  exit); 1,982 virtual trades re-simulated exactly by the position harness; **the regression anchor**: the D1·VGT signal
  refused on 2022-12-20 (D1·GDX holding the slot) ends at its hypothetical maximum-hold exit on 2023-01-04 and is **not**
  entered at the 2023-04-19 release; genuinely persistent episodes are funded (e.g. refused 2022-05-20, entered 2022-06-09).
  32 unit tests (chronology cases of brief §1.6, the harness, the study's logic) pass; the full suite: 1,471 tests, 1,460
  pass, 7 fail = the known pre-existing set (6 golden-master / byte checks of `allIn.ts` / `allin-original.ts`, Study 7's
  data-end parity), 4 skipped.

## 4. The fixed-parameter comparison (Phase 2; D24; `results/tables/fixed.md`)

| Toggles | Net | Δ vs OFF | DD | Lots | Episodes | Recovered lots (net) | Decisions displaced | New L0 lots lost (their net) | Conf. p10 | Conf. p90 DD | Qualified | Label vs A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| none (A) | $382,721.46 | — | $19,459.83 | 34 | 0 | — | 0 | — | $203,648.26 | $30,677.36 | yes | — |
| D1·GDX | $331,894.78 | −$50,826.68 | $32,231.24 | 41 | 21 | 8 ($9,985.53) | 6 | 4 ($54,131.63) | $180,682.06 | $36,090.48 | no (Q3) | harmful |
| D1·VGT | $267,557.86 | −$115,163.60 | $23,639.35 | 33 | 9 | 7 ($35,452.42) | 17 | 9 ($145,537.23) | $122,870.20 | $27,950.23 | yes | harmful |
| Growth·VGT | $382,721.46 | $0.00 | $19,459.83 | 34 | 3 | 0 | 0 | 0 | $201,502.28 | $30,442.95 | yes | no material difference |
| D1·GDX + D1·VGT | $246,335.09 | −$136,386.37 | $42,661.05 | 39 | 40 | 18 ($57,744.69) | 23 | 13 ($194,131.06) | $105,257.22 | $50,359.56 | no (Q2, Q3, Q5) | harmful |
| D1·GDX + Growth·VGT | $330,652.98 | −$52,068.48 | $32,231.24 | 42 | 25 | 9 ($8,743.73) | 6 | 4 ($54,131.63) | $180,561.18 | $36,104.88 | no (Q3) | harmful |
| D1·VGT + Growth·VGT | $267,557.86 | −$115,163.60 | $23,639.35 | 33 | 12 | 7 ($35,452.42) | 17 | 9 ($145,537.23) | $119,394.82 | $27,851.79 | yes | harmful |
| all three | $245,093.28 | −$137,628.18 | $42,661.05 | 40 | 44 | 19 ($56,502.89) | 23 | 13 ($194,131.06) | $104,762.68 | $50,359.56 | no (Q2, Q3, Q5) | harmful |

- **Factorial (centre net):** main effects D1·GDX −$36,646, D1·VGT −$100,362, Growth·VGT −$621; D1·GDX × D1·VGT +$14,802 (the
  two D1 toggles' harms overlap); every other interaction ≈ 0.
- **Why:** the recovered entries themselves are mostly profitable (D1·VGT: 7 lots, +$35,452; waiting 8 sessions median), but
  they hold the slot into stretches where New L0's own fresh trades arrive — 9 of New L0's lots worth $145,537 are lost under
  D1·VGT, and its 2020 and 2022 results fall by $75,049 and $40,114. **Recovered-entry profit is not incremental value**:
  the chronological replay shows the net is far lower. Growth·VGT's 3 episodes all expire while the slot stays occupied
  (its refused Growth opportunities are short). Capital utilization barely changes (sessions held 61–64%).
- **Best fixed combination:** all OFF (Growth·VGT alone is identical). No combination improves profit or drawdown without
  re-optimization. In 2025–2026 every variant earns exactly New L0's validation P&L (eligibility never triggers there for
  this phenotype); the two all-D1 variants fail V3 on their development drawdown ($42,661).

## 5. The four tracks: method, budget and coverage (Phases 3–4; `budget.md`, `coverage.md`)

| Track | Start / architecture | Cutoffs | Lanes per cutoff | Distinct proposals | Search requested | Search fresh | Archive hits | Qualification fresh | Total fresh | Wall |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| **B1** | fresh / joint | C19, C21, C23, C24 | 96 (32 × V1–V3) | 628,224 | 5,757,694 | 5,958,976 | 57,185 | 833,280 | **6,792,256** | 12.0 h |
| **B2** | fresh / sequential | C19, C21, C23, C24 | 48 d1 + 48 g | 582,912 | 5,948,192 | 6,155,434 | 53,021 | 831,325 | **6,986,759** | 7.2 h |
| **A1** | informed / joint | C24 | 28 | 60,032 | 1,591,976 | 1,092,948 | 498,973 | 87,645 | 1,180,593 | 3.7 h |
| **A2** | informed / sequential | C24 | 14 d1 + 14 g | 55,292 | 1,107,890 | 925,237 | 182,537 | 87,081 | 1,012,318 | 1.9 h |

- **Against Priority 3B** (5.83 M evaluations in all; its comparable independent search 4,869,671 + qualification 285,368):
  B1 and B2 each exceed it (6.79 M / 6.99 M fresh). Per cutoff, B1 used 1,666,266 / 1,712,642 / 1,314,271 / 1,265,797 fresh
  evaluations at C19 / C21 / C23 / C24 against 3B's 1,212,750 / 1,169,417 / 1,178,935 / 1,308,569 — every cutoff above 3B's
  except C24 (−3.3%: the lanes stopped on their own triggers; no cap or guard bound). **Against NL0's effective budget** (5B's
  L0 arm: 489,695 requested search evaluations, 49,346 proposals): B1 and B2 ≈ 12×, A1 ≈ 3×.
- **Matching:** joint and sequential got identical lane counts and per-lane schedules (B1 96 = B2 48 + 48 per cutoff; A1 28 =
  A2 14 + 14) and NL0's per-lane caps; no job cap or resource guard bound: every lane stopped on "triggers not met" except 5 of
  824 that reached their island cap with a trigger still firing (B1: 1 at C19, 2 at C23, 1 at C24; B2 step d1: 1 at C24 —
  budget-bound, not converged). The executed effort differs by what the schedules produce: B2 ≈ B1 (fresh 6.16 M vs
  5.96 M search); A2 received ≈ 70% of A1's requested evaluations (its D1-only first step is a smaller space with fewer
  designs and cheaper neighbourhoods). Fresh tracks got more than the informed ones (B1 at C24: 1.27 M fresh vs A1 1.09 M fresh /
  1.59 M requested). **Budget-bound is not convergence**: no search is described as converged.
- **Toggle coverage:** every fresh screen gave each combination of its free toggles exactly the same number of proposals (B1:
  8,192 per combination per cutoff); every informed seed was evaluated under every combination. After that the algorithm
  allocated effort by its own rules: at C24 the qualified members of A1 and A2 carry only "none" or "Growth·VGT" (D1 toggles
  were explored and never survived), while B1 and B2 kept all combinations among their qualified members.
- **Method preserved:** NL0's stage order (C19 → C21 → C23 with each selection committed before its slice, then C24),
  lane schedules, operators, triggers, rungs, refinement, shortlists, instrument, gates Q1–Q6, roles and the actual-profit
  primary with the qualifying-incumbent fallback. Adaptations (toggle genes, the D1-only first step, two D1 finalists, toggle
  refinement switches) are listed in `PROTOCOL.md` §0; the one departure is NL0's own: the informed tracks have no
  chronological test (AD9).

## 6. Results by track (`selections.md`, `phenotypes.md`)

| Track | Primary (C24) | Toggles | D1·VGT [X,Y,stop,hold,L,buf,P,W] | D1·GDX | Growth·VGT | Replicate bests (min / median / max) |
|---|---|---|---|---|---|---|
| New L0 | — | none | [237,9,73,15,72,42,103,41] | [277,1,61,13,232,25,152,10] | Rise 5.6%/84, trail 5.7%, hold 22 d, eligibility 20, gate 11.9%/46.2%, initial stop 16 × 1.2, classic continuation | — |
| A1 | `C24/A1/R26#1 profit` | Growth·VGT | [240,6,73,15,72,42,103,51] | [277,1,61,13,232,25,157,16] | Rise 5.6%/84, trail 5.7%, hold 22 d, gate 12.6%/48.3%, **no initial stop, breakout continuation 58** | $382,721 / $385,173 / $386,376 (28) |
| A2 | `C24/A2-g/F1/R2#1 profit` | Growth·VGT | [235,9,73,16,72,42,93,64] | [277,1,63,13,249,25,152,10] | Rise 5.6%/83, trail 5.7%, hold 20 d, eligibility 18, gate 13.1%/55.4%, shallow-pullback continuation 54 | $382,250 / $383,537 / $384,122 (7, step g) |
| B1 | `C24/B1/R15/V3#1 profit` | none | [224,13,76,10,66,17,102,60] | [240,29,67,26,29,33,107,82] | **trend breakout**, trail 6%, hold 28 d, trend filter, initial stop 20 × 4.5, retention | $163,842 / $193,487 / $232,083 (32) |
| B2 | `C24/B2-g/F1/R7/V1#1 profit` | Growth·VGT | [217,2,63,26,76,8,187,96] | [269,12,74,7,245,43,119,11] | Rise 8.5%/90, trail 6.5%, hold 28 d, trend filter, gate 14.5%/50% | $291,243 / $313,177 / $315,441 (8, step g) |

- **D1 finalists (sequential tracks, C24):** A2 — F1 $334,652 (D1 pair alone; New L0-like), F2 $293,558; both toggles OFF. B2 —
  F1 $260,533 (toggles OFF), F2 $190,717 (D1·VGT ON). The B2 and A2 primaries both sit beside F1.
- **The final selectable set** (678 of 743 qualified): the first 71 places are A1 / A2 members (69 with Growth·VGT
  eligibility, 2 A1 members without), all within $3,655 of New L0 (the 71st ties it); New L0 and its identical Growth·VGT
  twin rank 72nd–73rd, C4-refined 146th, C4 258th.

## 7. Where the differences come from (Phase 6.3; `labels.md`, `diagnostics.md`, `ablation.md`)

Decomposition on D24 (X − A = toggles on New L0's parameters + parameter change with toggles OFF + interaction):

| Row | Total | Toggles on New L0 | Parameters (toggles OFF) | Interaction (= eligibility within X) | Driver |
|---|---:|---:|---:|---:|---|
| Nominee / A1 | +$3,654.58 | $0.00 | −$12,975.05 | +$16,629.63 | interaction |
| A2 | +$1,400.61 | $0.00 | −$9,176.58 | +$10,577.19 | no material total effect |
| B1 | −$150,638.92 | $0.00 | −$150,638.92 | $0.00 | parameters |
| B2 | −$67,279.97 | $0.00 | −$77,401.45 | +$10,121.48 | parameters |

- **Recovered opportunities:** the nominee's 2 delayed Growth lots (+$16,050.58: 2018 −$2,288, **2023 +$18,339**) are its whole
  eligibility effect; A2's 3 (+$24,175.78: 2017 +$6,824, 2018 −$1,259, **2023 +$18,611**); B2's 2 (+$2,081, 2021). The 2023 entry
  is the same market episode in both informed primaries — the gain is **concentrated in one event**. In 2025–2026 the nominee
  recovered nothing (validation −$2,548 vs New L0); A2 recovered one losing entry (2026, −$3,498) but earned +$9,442 more than
  its own all-OFF variant in validation.
- **Displaced / lost:** the nominee displaced 1 decision and lost 1 lot of its own all-OFF run (−$579); A2 displaced 2 decisions
  and lost 1 lot (+$13,599, a real cost). Delayed lots added 4–8% of principal-days.
- **Parameters:** the informed primaries' parameter changes alone (toggles OFF) are **worse** than New L0 (−$12,975, −$9,177): the
  search found a joint optimum of slightly different parameters + Growth eligibility, not an improvement of either alone. The
  fresh primaries' gaps are entirely parameters (different phenotype families).
- **Which strategy benefits:** only Growth·VGT, and only with re-tuned Growth settings (the nominee drops the initial stop and
  switches to a breakout continuation); D1 eligibility is negative everywhere it was measured at C24 and on the fixed phenotype.
- **Concentration and regimes:** the leading winning episode (2020-03-12 → 2020-09-04) is worth $119,290 for the nominee
  ($120,348 for New L0); with it blacked out the nominee earns $267,086 against New L0's $262,373. The largest single winner is 13%
  of net, the top five 43% (New L0 14% / 43%).

## 8. Optimization architecture and starting point (Phase 6.2)

| Pair | Dev | Risk | Chron | Frozen label |
|---|---|---|---|---|
| A1 vs A2 (informed: joint vs sequential) | 0 (+$2,254) | same | n/a | **no material difference** |
| B1 vs B2 (fresh: joint vs sequential) | − (−$83,359) | better | 0 (both unsupported; B1 +$71,407 vs B2 −$11,517) | **harmful** (for joint) |
| A1 vs B1 (joint: informed vs fresh) | + (+$154,294) | same | n/a | conditional trade-off (development improvement, no chronological test) |
| A2 vs B2 (sequential: informed vs fresh) | + (+$68,681) | better | n/a | conditional trade-off (development improvement, no chronological test) |

- **Joint vs sequential:** no consistent winner. With incumbent seeds both land on the same New L0 neighbourhood (A2's D1 step
  re-found a New L0-like pair; A1 nudged New L0 itself). From scratch the sequential B2 did better at C24 — its D1 step found a
  strong D1 pool ($260,533 alone) that its Growth step then complemented — but B1's earlier-cutoff primaries outperformed B2's in
  2020–2024, and **both** procedures are chronologically unsupported. Under standard §3.4 no method claim is made: one favourable
  cutoff is not repeated, chronologically separated evidence.
- **Informed vs fresh:** informed searches reach New L0's region and stay there (seed variability only $1,872–$3,655 across
  replicates); fresh searches at ≥ 3B's scale find **materially different** phenotypes (breakout Growth with retention and an
  initial stop in B1; long holds and a trend filter in B2) but $67–151k worse, with large seed variability ($24–68k). This repeats
  NL0's lesson: New L0's quality comes from the incumbent lineage; more independent effort did not reach that region. There is no
  evidence that the incumbent seeds *constrained* discovery — the fresh tracks, unconstrained, found nothing better.

## 9. Robustness, chronology and risk (Phase 5)

| Row | Conf. median | p10 | p90 DD | p95 DD | Worst-10% mean DD | Breach share [Wilson 95%] | Mean excess | Worst DD | FULL nbhd: median validation / draws > $35,000 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| New L0 | $250,019.71 | $203,648.26 | $30,677.36 | $34,673.34 | $35,029.44 | 4.2% [2.6–6.7%] | $2,545.21 | $52,322.02 | $81,818.93 / 3 |
| Nominee (A1) | $254,627.90 | $194,160.91 | $32,238.36 | $36,214.18 | $37,213.41 | 5.7% [3.8–8.5%] | $4,869.22 | $50,215.63 | $84,134.30 / 6 |
| A2 | $266,527.61 | $220,989.50 | $30,884.55 | $34,744.66 | $35,885.89 | 4.4% [2.8–7.0%] | $4,552.83 | $53,202.72 | $83,887.75 / 13 |
| B1 | $145,498.49 | $106,611.56 | $29,762.56 | $31,961.74 | $32,835.93 | 1.8% [0.9–3.7%] | $2,813.79 | $40,129.79 | $29,671.81 / 21 |
| B2 | $200,897.20 | $131,320.50 | $34,433.23 | $40,851.69 | $40,976.46 | 9.9% [7.3–13.3%] | $6,147.90 | $68,803.29 | $73,690.89 / 20 |

- **Every track primary qualifies** (Q1–Q6) and passes V1–V3; the nominee's local tail is slightly weaker than New L0's
  (p10 −$9,487; breach share 5.7% vs 4.2%); A2's is equal or better in p10 and p90. Local stability is not chronological
  reliability (standard §5.4).
- **Chronology:** the fresh procedures' walk-forward paths (each fold primary over its next slice) fail: B1 +$71,407 with a
  $80,475 sequential drawdown; B2 −$11,517 with $74,307; **0 of 32 / 0 of 8** replicate paths supported. The fold primaries
  breach the ceiling inside their slices (2020–2021: $48,255 / $44,645; 2022–2023: $79,664 / $74,307). The original NL0
  procedure also failed (−$29,358, DD $67,214). The informed tracks — which produced the best candidates — have no chronological
  test by construction (AD9). The fixed New L0 path over the same slices is $302,751 / $19,460 (descriptive: chosen with later data).
- **Risk constraints:** no ceiling was weakened. Stresses on FULL (10 / 20 bps, 14% interest) keep every principal row within
  $35,000 except B1 (whole-run $35,006 at 10 bps, $36,420 at 20 bps).

## 10. Answers to the brief's final questions

1. **Correct and baseline-preserving?** Yes: all OFF reproduces New L0 and Priority 3's replay exactly (records, ledgers, keys),
   every eligibility rule holds on real data, the regression anchor behaves as specified, and no historical file or fingerprint
   changed.
2. **Best fixed combination?** All OFF (Growth·VGT alone is identical). 
3. **Improvement without re-optimization?** No — never in profit or drawdown; every D1 combination is harmful.
4. **Joint vs sequential?** No consistent difference: informed A1 ≈ A2 (no material difference); fresh B2 beat B1 at C24 but lost
   chronologically; no method claim.
5. **From scratch: different or better?** Materially different phenotypes, not better (−$67k to −$151k; harmful;
   chronologically unsupported).
6. **Toggles selected and why?** Growth·VGT ON for the nominee, A2 and B2; none for B1; D1 toggles never selected at C24 — D1
   delayed entries displace the D1 books' own later trades, while a Growth delayed entry occasionally fills an idle stretch.
7. **Improvement from recovered opportunities?** Nominee +$16,051 (2 lots; one 2023 entry +$18,339), but it needed parameter
   changes costing $12,975, leaving +$3,655 — within the search spread ($3,655) and not replicated.
8. **What was displaced?** Fixed phenotype: up to 13 New L0 lots ($194,131) and 23 decisions; the nominee 1 lot (−$579); A2 one
   profitable lot ($13,599).
9. **Robustness?** Locally comparable to New L0 (nominee slightly weaker, A2 slightly stronger); chronologically unsupported for
   every procedure that can be tested; the gain hinges on one 2023 event.
10. **Risk and robustness requirements satisfied?** By the frozen gates, yes for every track primary (Q1–Q6, V1–V3); not by the
    chronological test (fresh procedures fail; informed untestable).
11. **Replacement warranted?** **No.** The nominee is *inconclusive*, A2 *no material difference*, the fresh primaries
    *harmful*.
12. **Remaining uncertainty:** validation on examined history; one-event dependence (2023); search variability comparable to
    the effect; A2 received ≈ 70% of A1's requested evaluations; D1 eligibility's harm is measured on New L0-like phenotypes and
    fresh searches — a different allocator (e.g. preemption, priorities by expected value) could change it but is outside this
    brief; the toggles bind rarely (2–3 delayed lots in nine years for the informed primaries), so their effect is poorly
    estimated.

## 11. The next research decision (brief Phase 8; recorded, not taken)

Recorded in `docs/research/ROADMAP.md`: after reviewing this study, the user decides whether a later from-scratch calendar-day
vs trading-session comparison should (A) hold the selected shadow-eligibility configuration fixed under both conventions, or (B)
optimize the three toggles independently under both, with symmetric treatment of the conventions. Neither option is selected;
that study is not started.

## 12. Reproducibility, integrity and disclosures

- **Authority:** `PROTOCOL.md` (sha256 `fc6dbdcc…`, frozen 2026-11-12T12:47:53Z; code-closure digest `16bd44c0…`), no amendments;
  standard 2.1.0; NL0 1.0.0; `CONTROL_MANIFEST.json`; stage V `results/parity/parity.json` and `parity-frozen-code.json`;
  `FROZEN_SELECTION.json` sealed and committed (`c691bcd6`) before FULL opened; validation sealed once (`998cdcb8`). Commands:
  `RUN_COMMANDS.md`; the chain `chains/chain1.sh` (2026-11-12T12:48Z → 2026-11-13T17:17Z, every block committed by itself).
- **Data:** `data/VGT/data.csv` `2ee06310…`, `data/GDX/data.csv` `77dba9b2…` (local, git-ignored); doors D19–D24 by size, sha256 and
  last row; FULL 2016-01-04 → 2026-10-30 (common complete endpoint).
- **Ledgers:** shadow-episode and funded-lot ledgers (JSON sealed + CSV) in `results/phase2/ledgers/`, `results/diagnostics/ledgers/`,
  `results/validation/ledgers/`; job archives (≈ 17 M evaluations) local in `.cache/vg-l0-shadow-eligibility/jobs/`.
- **Disclosures:** (1) New L0's eight fixed-toggle centres on D24 were seen during engineering, before the protocol; no
  combination was excluded from any search. (2) The pilot's unit-kill test needed three attempts (the first two did not kill a
  running job); the third interrupted a job mid-way and resumed identically; cache-only. (3) Stress and removal reruns are stored
  compactly in the evidence (full records in the job archives). (4) The code was formatted after the first sealed stage V; a second
  sealed stage V on the frozen code passed identically. (5) "Requested" (lane level) excludes the screen centres, as NL0's code does;
  "fresh" counts every unique simulation of a job. (6) B1's C24 search was 3.3% below 3B's C24 figure (triggers, not a cap).
