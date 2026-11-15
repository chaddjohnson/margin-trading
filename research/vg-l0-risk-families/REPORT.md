# REPORT — Assignment 2: D1 risk-control families and risk-aware candidate selection

Research only. Nothing was deployed, adopted, merged into `main` or used to replace New L0. **DD** = the maximum minute
drawdown of the marked net on the fixed $100,000 principal; the research ceiling is $35,000 (a criterion on historical
paths, **not** an enforceable loss limit). Every figure below comes from sealed records (`results/seals.jsonl`); full
tables are in `results/tables/` (no visuals, standard §7.7). All of 2016-01-04 → 2026-10-30 is **previously examined
history**: every fold and the validation are retrospective evidence, not virgin out-of-sample proof.

## 1. Bottom line

**No qualifying successor.** Under the frozen rule (PROTOCOL.md §11.4) a successor needed a chronologically supported
procedure, and **all nine population × selector procedures are chronologically unsupported** (each breaches $35,000 in
the 2020 crash slice, most also in the 2022 bear). New L0 stays the reference; it was reproduced to the cent.

The study still produced clear, repeatable-looking but **retrospective** findings:

1. **RC 2 works as specified.** The post-fill entry-day stop was implemented without a compatibility or lookahead defect
   (35 synthetic tests; stage V 0 failures in 25,933 checks; New L0 identical on FULL to the foundation's sealed trade
   list, funding log and 547,753 minute marks).
2. **Every D1 family stays competitive after proper optimization**; none dominates and none can be pruned. At C24 the
   best qualified members of the 16 GDX × VGT family pairs span $277,878–$374,627 of development net; asymmetric pairs
   lead (`GA0.VB1e`, `GD0e.VD1`, `GB0e.VC1`). The mechanisms that changed the finalists' results were the **hold
   policies** (unlimited and adaptive holds) and the **decline gate**; the protective stops (9–25%) and their activation
   were almost never reached on 2016–2026.
3. **Entry-day activation shows no detectable effect** at this budget: the 132 onset cells split evenly against their
   next-session counterparts (median Δ best net −$1,901 to +$1,789 per cutoff), far inside the search noise of two
   independent replicates of one cell (median $9,093–$15,808).
4. **Selection mattered more than mechanics.** On identical populations the risk-aware rule RA1 beat the original
   NL0 rule chronologically: over all 196 cells, sequential **+$100,002 / DD $39,855 versus −$29,466 / DD $80,622**
   (frozen label "risk improvement"); with legacy mechanics only it made no clear difference ("mixed"). Under the
   original profit-first rule the new mechanics made the path *worse* (−$63,161, "profit sacrifice without clear
   benefit"); under RA1 they made it better (+$67,252). RA2 (RA1's valuation alone, without its screens and occupancy
   band) lost $100,711 against RA1.
5. **Still no support:** RA1's best path breached the ceiling by $4,855 in March 2020; 2024 carried no D1 information
   (no fold primary's D1 book traded); the evidence is one examined history with three correlated slices, and RA1 was
   designed after a diagnostic examined those very slices.

| | New L0 (frozen; informed, chosen with later data) | L/original (legacy cell, NL0 rule) | F/original (all cells, NL0 rule) | F/RA1 (all cells, risk-aware) |
|---|---:|---:|---:|---:|
| C24 primary | — | `GA0.VA0` | `GA0.VB1e` | `GD0e.VC0` |
| Development net / DD (2016–2024) | **$382,721.46** / $19,459.83 | $297,130.10 / $17,979.96 | $374,626.77 / $17,641.20 | $347,171.73 / $17,744.39 |
| Confirmation p10 / p90 DD (384) | $252,219.39 / $30,342.61 | $188,074.15 / $24,259.58 | $216,849.78 / $31,592.95 | $227,864.61 / **$24,123.57** |
| Confirmation p95 / worst-10% mean / worst DD | $33,738.10 / $34,336.58 / $47,936.82 | $40,581.05 / $34,213.78 / $40,795.26 | $39,964.22 / $38,493.20 / $43,278.21 | **$25,422.81 / $25,717.91 / $31,301.20** |
| Worst per-lot adverse excursion (development) | −$8,046.67 | −$7,541.48 | −$6,540.51 | **−$4,857.05** |
| Procedure's sequential path 2020–2024 | (fixed, descriptive) $302,751.28 / $19,459.83 | $33,694.72 / $69,823.14 | −$29,466.30 / $80,621.62 | **$100,002.36 / $39,855.06** |
| Chronological verdict | none (informed) | unsupported | unsupported | unsupported |
| Validation 2025-01-02 → 2026-10-30 (examined): P&L / reset DD | $96,883.72 / $20,385.99 | $74,066.59 / $19,289.03 | $68,111.29 / $25,242.70 | $92,950.76 / $22,615.51 |
| Full history 2016-01-04 → 2026-10-30: net / DD | **$479,605.18** / $20,385.99 | $371,196.68 / $19,289.03 | $442,738.06 / $25,242.70 | $440,122.49 / $22,615.51 |
| Status | reference | research-only (no chronological support) | research-only | research-only |

## 2. RC 2 — the entry-day protective stop (brief §1)

- **Semantics** (`SPECIFICATION_RC2.md`): an optional, per-book `activation` of RC 1's protective stop. `next-session`
  (default) is RC 1 unchanged; `entry-day` lets the stop trigger later in the fill's own session from observations
  demonstrably after the fill: the fill minute's low (strictly below its opening print, hence a later trade) and every
  later minute's open and low. Minutes before the fill are never read; a closing-print fill observes nothing that
  session. RC 1's fill conventions, inclusive threshold, slippage stress and gate/continuation interactions apply; no
  other exit acts on the entry session.
- **Compatibility:** RC 1's files are byte-identical; RC 1 configurations keep RC 1's identity, key and record (300
  random configurations); entry-day configurations are versioned (`rc2-…`, `|rc2:` keys). Priority 3's, 5B's and the
  shadow study's evaluation digests are unchanged.
- **Verification** (`TEST_REPORT.md`): 35 synthetic tests (every fill kind, causality, same-session adverse moves, a
  fill-minute exit through the unchanged pool, an 8% stop losing 13% and 22% through gaps); stage V on real data
  (sealed, 0 failures): New L0 reproduced on FULL and D19–D24, RC 2 = Priority 3 for legacy and = RC 1 for next-session
  configurations, 132 random entry-day configurations with every exit re-derived from the raw bars (86 entry-day exits;
  615 pre-fill lows below a level correctly ignored). The full suite: 1,610 tests, only the 7 known pre-existing
  failures.
- **A protective stop is not a loss cap.** On real data the 2020-03-12 and 2020-03-16 opens, and 2024-08-05, filled
  protective stops up to 7.4 points of the entry price beyond their levels (`results/diagnostics/tail-stress.json`,
  `fold-primaries.json`); entry-day activation cannot remove gap or execution risk.

## 3. Design and executed budget (brief §2–§3)

- **Cells:** 14 structures per D1 book (A0, A1, B/C/D × gate × activation) → **196 cells** = the 64 RC 1 base cells + 132
  entry-day onset cells; the two books never share a forced structure. **Every cell got the identical budget at every
  cutoff:** NL0's V-cell schedule (512 Sobol screen proposals, 2–6 NSGA-II islands of 256, rungs 16/64/128, one
  refinement pass, shortlist 3) × **2 independent replicates**, with the decline gate's K protected by screen strata.
  Growth·VGT was New L0's, frozen (brief §2.3).
- **Stage-2 refinement:** a frozen rule picked 13–14 cells per cutoff (the legacy cell, the 4 best by profit and by
  robust net, 2 lowest-drawdown, 2 best under RA1, plus family/gate/activation/asymmetry coverage) for NL0's informed
  schedule seeded only with that cutoff's own qualified members (2 replicates each).
- **Executed** (`results/tables/budget.md`, `coverage.md`): 2,333,780 executed proposals; **34.21 M fresh pooled
  simulations** (30.75 M search, 3.46 M qualification of 4,707 broad and 599 refinement members, 3,584 next-slice
  neighbourhood replays), ≈ 31.0 hours of chain wall time (2026-11-14T02:12:30Z → 2026-11-15T09:09:33Z), peak 19.7 GiB in `vgl0rf.slice`, no OOM, no restart.
  Per cutoff 7.7–7.9 M requested evaluations; 548,106–607,286 proposals.
- **Against the references:** the broad stage alone is 49× NL0's effective independent base per cutoff (8,192) and
  3.1× Priority 3B's (131,072); per cell and replicate it equals NL0's V cell exactly. The executed stage allocation was
  ≈ 79% rung 1, ≈ 10% rungs 2–3, ≈ 8% refinement, ≈ 3% screen (NL0: 66–75%, ≈ 11–14%, 15–19%, ≈ 4%).
- **Stops (not convergence):** at C19 406 of 418 lanes stopped on "triggers not met" (6 at the resource guard); from C21 on **117–155 lanes per
  cutoff were stopped by NL0's resource guard** (the per-lane job cap) while a trigger still fired — **budget-bound, not
  converged** — and 6 reached the 6-island cap at C19. No cell was without a shortlist or a qualified member at any
  cutoff (the gates barely bind on these windows: 1,163–1,174 of 1,177 broad members qualified).

## 4. The 64-cell base comparison and the families (brief §3.1–§3.2; question 2)

`results/tables/families.md`, `cells.md`. Development evidence of each cutoff; best qualified member by centre net.

| C24 pair (best cell) | Net | DD | Conf. p90 DD | Conf. worst-10% mean | Worst lot |
|---|---:|---:|---:|---:|---:|
| GDX A × VGT A `GA0.VA0` (legacy) | $297,130.10 | $17,979.96 | $24,259.58 | $34,213.78 | −$7,541.48 |
| GDX A × VGT B `GA0.VB1e` | $374,626.77 | $17,641.20 | $31,592.95 | $38,493.20 | −$6,540.51 |
| GDX B × VGT C `GB0e.VC1` | $354,898.38 | $17,785.75 | $34,376.78 | $39,773.54 | −$7,660.01 |
| GDX C × VGT C `GC0.VC0e` | $334,920.76 | $22,223.42 | $29,167.93 | $37,824.91 | −$6,580.23 |
| GDX D × VGT C `GD0e.VC0` | $347,171.73 | $17,744.39 | $24,123.57 | $25,717.91 | −$4,857.05 |
| GDX D × VGT D `GD0e.VD1` | $357,166.61 | $17,833.82 | $28,482.87 | $30,608.26 | −$8,863.75 |
| GDX B × VGT A `GB1e.VA1` (lowest pair) | $277,878.42 | $20,588.21 | $31,989.69 | $36,257.04 | −$11,716.43 |

- **Every family and both gate states produced qualified members in every cell at every cutoff;** all 16 family pairs
  are within ≈ $100k of one another at C24, which is the scale of search noise between replicates (§5). No structural
  region may be pruned on this evidence.
- **H1 (families):** at C24, 435 non-legacy qualified members are not dominated by the legacy cell's best and 4 beat it
  on both pairs (C19 13, C21 14, C23 10). The legacy cell's best independent member ($297,130) stays far below New L0
  ($382,721, informed); the best independent members of other cells come close ($374,627).
- **Gates:** the best gated cells trailed the best ungated ones at C24 (GDX gate ON $335,749 vs OFF $374,627), and
  on gated books the gate blocked 299–326 sessions on development for the B-population primaries (`GA1.*`).
- **Pre-hold losses (question 4):** in the 2022 bear the legacy-cell fold primaries made 10–12 losing D1 entries and
  9–12 maximum-hold exits (2022 DD $36,872–$49,986), while F/RA1's protected primary `GC1e.VD0` made 6 losing entries,
  4 protective and 1 protective-gap exit (2022 DD $23,785). But the protected **C24 primaries** recorded **no**
  protective exit on 2016–2024 (stops at 9.1–16.9% were never reached in sample): their development advantage came
  from different D1 parameters and the hold policies, and their stops are untested insurance on this history.

## 5. The activation study (brief §2.2, §3.3; question 3)

Fully crossed and balanced: each of the 132 onset cells had the same budget as its next-session base counterpart at
every cutoff (`results/tables/activation.md`).

| Cutoff | Pairs | Onset net higher (> $2,500) / lower | Worst-10% mean lower / higher | Worst lot better / worse | Median Δ net | Median Δ worst-10% | Median Δ worst lot |
|---|---:|---:|---:|---:|---:|---:|---:|
| C19 | 132 | 65 / 53 | 45 / 51 | 31 / 35 | +$1,789.05 | +$125.29 | −$154.41 |
| C21 | 132 | 59 / 52 | 43 / 50 | 17 / 18 | +$1,371.84 | +$721.90 | −$69.86 |
| C23 | 132 | 56 / 64 | 37 / 57 | 24 / 37 | −$1,901.24 | +$1,821.94 | −$791.46 |
| C24 | 132 | 58 / 64 | 53 / 40 | 29 / 32 | −$502.77 | −$1,378.69 | −$532.02 |

- **Search noise:** the two independent broad replicates of the same cell differ in best qualified centre net by a
  median $11,175 / $9,093 / $15,141 / $15,808 (p90 $38,227 / $25,610 / $39,297 / $44,005) at C19 / C21 / C23 / C24. The
  activation differences sit far inside it; GDX-only, VGT-only and both-book patterns behave alike.
- **Answer:** entry-day activation does **not** improve tail behaviour enough to justify its added complexity on this
  evidence; nor does it hurt clearly. The C24 F/original primary happens to use it (`GA0.VB1e`, VGT entry-day), and
  F/RA1's uses it on GDX (`GD0e.VC0`); neither had an entry-day exit on development. Coverage is exhaustive for the 196
  cells at the declared budget; it is not convergence (§3).

## 6. Original versus risk-aware selection on identical populations (brief §4; question 5)

`results/tables/selection.md`. Both rules saw the same qualified members and the same training evidence; neither
searched.

| Fold | Population | Original primary → next slice net / DD | RA1 primary → next slice net / DD | Why they differ |
|---|---|---|---|---|
| C19 → 2020–21 | L | `GA0.VA0` $25,329.65 / $53,274.78 | `GA0.VA0` (another member) same slice | same behaviour |
| | F | `GC1.VD1e` −$27,962.28 / $53,037.87 | `GC1.VA0` $31,553.38 / $39,855.06 | all screens passed by both; RA1 took a higher conservative net at lower occupancy (76% vs 79%) |
| C21 → 2022–23 | L | `GA0.VA0` −$6,945.50 / $37,074.07 | `GA0.VA0` −$7,889.94 / $49,985.80 | lower occupancy (67% vs 72%) did not help |
| | F | `GC1.VC1` −$16,764.59 / $48,893.54 | `GC1e.VD0` **$53,138.41 / $23,785.28** | occupancy 66% vs 75% within the 5% conservative-net band |
| C23 → 2024 | L, F | identical slices ($15,460.57 / $7,938.68): no D1 lot in 2024 | | the original's primaries failed S4 (selection worst-10% mean DD > $35,000) |

Frozen labels (§11.3, band $2,500):

| Comparison | Label | Δ sequential net | Δ sequential DD |
|---|---|---:|---:|
| RA1 vs original, legacy cell (L) | mixed | −$944.44 | +$8,021.42 |
| RA1 vs original, base cells (B) | risk improvement | +$38,731.54 | −$36,037.20 |
| RA1 vs original, all cells (F) | **risk improvement** | **+$129,468.66** | **−$40,766.56** |
| Mechanics F vs L, original rule | profit sacrifice without clear benefit | −$63,161.02 | +$10,798.48 |
| Mechanics F vs L, RA1 | risk improvement | +$67,252.08 | −$37,989.50 |
| Activation F vs B, original rule | risk improvement (−$20,784 net) | −$20,784.12 | −$4,309.12 |
| Combined F/RA1 vs L/original | risk improvement | +$66,307.64 | −$29,968.08 |
| RA2 vs RA1 within F | profit sacrifice without clear benefit | −$100,711.19 | +$33,364.10 |

- RA1 never changed which members qualified; in C19 and C21 every fold primary passed all four screens, so RA1 acted
  through its **conservative valuation band and lowest occupancy**; at C23 and C24 the original rule's F primaries
  **failed S4** (worst-10% mean of the selection neighbourhood above $35,000; RA1 ranked them 1,110th and 1,088th).
- Training neighbourhoods on the next slice (§5.9): C19 primaries breached in 33–100% of 256 draws (training 0–4%); at
  C21 RA1's F primary breached in 11% against 62–93% for the others.
- **Limits:** three correlated slices, one of them (2024) uninformative for D1; RA1's thresholds were chosen after the
  walk-forward diagnostic examined 2020–2023; the labels are retrospective procedural evidence and do not show that RA1
  generalizes (standard §3.4).

## 7. Chronology, consequence and the successor rule (brief §5; questions 7, 9)

All 9 procedures are **unsupported** (`results/folds/sequential.json`): sequential DDs $39,855.06 (F/RA1, March 2020)
to $84,930.74; nets −$29,466 to +$100,002. Every verdict is "conditionally independent" (AD4: the pools contain New L0's
later-selected Growth·VGT). Under the precommitted consequence, **no C24 primary is a deployment-qualified candidate**,
and the frozen selection recorded "no chronological support" for all nine before FULL opened. The validation ran once
afterwards as precommitted: New L0 reproduced exactly; all 25 finalists passed V1–V3 (validation P&L $37,478–$99,630,
reset DD $9,944–$27,424; full-history DD $14,112–$28,227), none above New L0's full-history net (best `GB0e.VC1`
$454,527.89; its 2025–2026 +$99,629.51 with reset DD $18,706.12 exceeds New L0's +$96,883.72 / $20,385.99, on examined
history, and is not a qualification). **"No qualifying successor" is the correct result of this stage.**

## 8. Finalists against New L0, stresses and attribution (brief §4.2, §5.3)

- **Development and stresses (C24 evidence):** every one of the 25 finalists stayed within $35,000 at 10 and 20 bps per
  side, 14% interest, +25 bps stop slippage and next-open stops (worst stressed DD $26,410.94; lowest stressed net
  $131,471.70); e.g. F/RA1 `GD0e.VC0`: $343,669 /
  $329,980 / $331,662 / $339,151 / $346,832 with DD ≤ $17,744; F/original `GA0.VB1e`: $369,296 / $348,128 / $358,632 /
  $365,974 / $374,813, DD ≤ $19,114.
- **Causal removals (development):** removing both D1 books leaves $80,212 (Growth·VGT alone, DD $17,036) for every
  configuration; removing D1·VGT from F/original's primary lifts its DD to $39,160 (D1·VGT occupied the slot in a
  crash), from F/RA1's to $30,913.
- **Booked profit (development):** F/RA1 D1·GDX $174,914, D1·VGT $82,770, Growth·VGT $89,488 (31 lots; occupancy 59%);
  F/original D1·GDX $200,494 (40 virtual maximum-hold exits), D1·VGT $98,669, Growth·VGT $75,464 (49 lots; 61%).
- **Which mechanism did the work** (`results/diagnostics/finalists.json`, `results/tables/finalists.md`; development
  2016–2024 and FULL): across the 25 finalists, flipping a protected book's **activation changed the result in 1 of 31
  tests** and removing the **protective stop in 2 of 21** (at most a few hundred dollars on development): with stops of
  9–25% the selected configurations essentially never reached them. The **hold policies** did the work — reverting a
  disabled hold to the legacy calendar hold cost $32,821–$64,544 on development in 10 of 10 tests, an adaptive hold up to
  $60,382 (6 of 12) — and the **gate** mattered (removal −$40,303 to +$12,506 in 10 of 17; its K ± 1 up to −$80,216 in 18 of
  29: K is a sensitive, coarse gene). Under a disabled hold the protective stop is the only loss exit, so the gain on this
  history came from losing lots that eventually recovered; **an unlimited hold whose stop is never reached carries open-
  ended holding time and interest** (SPECIFICATION §10).
- **Mechanics versus parameters:** the C24 F/original primary `GA0.VB1e` is **behaviourally legacy** — its VGT stop and
  gate never acted (its D1 vectors under legacy mechanics give the identical $374,626.77 on development and $442,738.06 on
  FULL); its advantage over the legacy cell's own primary ($297,130.10) is a **search-coverage** effect, not a mechanics
  effect. For most other finalists the controls are co-adapted with their D1 parameters (mechanics effect on their own
  vectors +$7,150 to +$124,158 on development; −$21,886 for `GA1.VC0`; $0 for the two behaviourally legacy ones), while
  **New L0's D1 vectors lose under 14 of 20 finalists' mechanics** (−$3,697 to −$150,714 on FULL; +$159 or $0 where the
  mechanics are inert for them): transplanting controls onto New L0 does
  not help. The parameter effect (each finalist's vectors under legacy mechanics against New L0) is −$8,095 to −$241,748
  on development: the independent search did not find New L0's informed region.
- **Other report-only items:** the 2020 and 2022 episodes, the 2025–2026 give-back (only `GA1.VC0` carried a lot over
  2024-12-31: D1·VGT marked $11,669.82, then −$7,677.39), per-lot excursions, and the C24 selection neighbourhood on
  2025–2026 (breach shares 0–10%, Wilson upper bounds ≤ 14%).
- **Tail stress** (`results/diagnostics/tail-stress.json`; AD11: in-sample 2016–2024 stress, XLK/GDXJ same-period
  proxies, synthetic gaps; a daily-bar approximation): an unprotected $100,000 D1 lot held over its window lost at worst
  $22,855–$38,737 in sample (every worst window opens in January–March 2020) and up to $51,827 on the GDXJ proxy;
  protected books lost at worst $12,180–$27,470 in sample (up to $29,342 on the proxies), with fills up to 7.4 points
  beyond the stop on gap days.

## 9. Sensitivity and uncertainty (question 6)

- **Search coverage:** replicate noise ($9k–$16k median, $26k–$44k p90 per cell) exceeds most structural and activation
  differences; 117–155 lanes per cutoff from C21 on were budget-bound. More replicates would narrow the cell rankings;
  they would not create chronological support.
- **Regimes:** every procedure breached in the 2020 crash; 2022 separated RA1 from the original rule; 2024 carried no D1
  trade. Conclusions about RA1 rest essentially on one slice (2022–2023).
- **Open-profit concentration:** at the cutoffs the selected primaries mostly had no open lot (open-lot share 0–7%); the
  exposure screens S1/S2 rarely bound for the primaries but failed 1–42% of the qualified members (C19: 552 of 1,322
  failed S1; C21 176; C23 17).
- **Execution:** stresses changed the C24 nets by at most ≈ 7% and never broke $35,000 on development; gap fills beyond
  stop levels are the main unmodellable risk.
- **Neighbourhoods:** training neighbourhoods breach far less than the same regions on the next slice (§6).

## 10. Answers to the brief's final questions

1. **Yes.** The post-fill same-session stop is implemented and verified without a compatibility or lookahead defect
   (§2).
2. **All four families and both gate settings remain competitive** after optimization, with asymmetric pairs leading at
   C24 (`GA0.VB1e`, `GD0e.VD1`, `GB0e.VC1`, `GD0e.VC0`); differences are within search noise; nothing can be pruned (§4).
3. **No.** Entry-day activation shows no detectable tail or profit effect on equal budgets (§5).
4. **Partly, retrospectively.** Protected families cut losing 2022 re-entries and maximum-hold losses for some fold
   primaries (F/RA1 at C21), but every procedure still breached in 2020, and the C24 protected selections never used
   their stops on development (§4, §8).
5. **On these identical populations RA1 improved the subsequent chronological risk** (F: +$129,469 net, −$40,767 DD)
   and, with legacy mechanics only, made no clear difference; this is retrospective evidence from one history, formed
   after the motivating diagnostic, and does not prove generalization (§6).
6. Sensitive to search noise and to which single slice breaks (2020, 2022); robust to cost, interest, slippage and
   next-open stresses on development (§9).
7. **Candidate evidence:** none qualifies. **Retrospective diagnostics:** the folds, the 2 × 2 labels, the validation
   (examined history), the tail stress (in-sample/proxy). **Inadequate:** chronological support (two breaking events),
   independence (fixed later-selected Growth·VGT), convergence (budget-bound lanes), disjoint tail history (none).
8. **For Assignment 3:** keep every family on both books (with entry-day as an optional toggle rather than separate
   cells), carry RA1 forward as a precommitted experimental selector beside NL0's rule, and run the full three-phenotype
   joint optimization with fresh and New-L0-informed lanes (`ASSIGNMENT3_HANDOFF.md`).
9. **Yes — "no qualifying successor" is the correct result of this stage.**

## 11. Limitations

- Previously examined history throughout; three correlated slices; two breaking events (2020, 2022).
- The fixed Growth·VGT was chosen with later data (AD4); the D1 search is independent, the portfolio test is not.
- No informed lane (AD8); New L0's lineage effort is not reproduced; the independent lanes did not reach New L0's
  development net in the legacy cell.
- The tail stress uses no disjoint data (none available; no purchase); it is daily-bar.
- A protective stop is not a loss cap; minute bars do not order intra-minute prices; queue position and latency are not
  modelled.
- RA1's thresholds are round, precommitted numbers but were designed after the walk-forward diagnostic.

## 12. Repository status

| Item | State |
|---|---|
| Branch | `research/vg-l0-risk-families` (from `26014af1`), pushed; every sealed stage committed by the chain (`0eed6af7` … `17938e89`) |
| Not merged into `main` | everything: `src/d1-risk-controls-rc2/`, `src/vg-l0-risk-families/`, `tools/vg-l0-risk-families/`, the study directory, the `vg-l0rf` npm script; also the foundation's `src/d1-risk-controls/` and preflight change remain unmerged |
| Tests | 1,610: 1,599 pass, 4 skipped, **7 pre-existing failures** (allin-original ×6, Study 7 data end); no new failure |
| Frozen work | RC 1 byte-identical; NL0, the standard (2.2.0) and every earlier study untouched; Priority 3/5B/shadow digests unchanged |
| Data | no data acquired or purchased; the pre-2016 data decision is open for the user (`ASSIGNMENT3_HANDOFF.md` §6) |
