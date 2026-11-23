# Priority 4 — the paired GPU search: CTRL (S1 forced OFF) vs EXP (S1 allowed)

Written analysis and tables only. Every number below is read from a sealed record under `results/`, unless a line says it
comes from a report-only CPU diagnostic (`reports/diagnostics/`, purpose `diagnostic`, never official evidence). The
generated tables are in `reports/tables/`: `search-budget.md`, `search-compute.md`, `gate-r.md`, `extension.md`,
`primary.md`, `primary-halves.md`, `risk.md`, `mechanism.md`, `staged-patterns.md`, `pooled.md`, `lanes.md`,
`census.md` (from `analyze.ts`); `census-population.md` (`census.ts`); `tails.md` (`tails.ts`); `selection-C*-mechanism.md`
(`mechanism.ts`); `lots-*.md` (`lots.ts`).

## 1. Design (PROTOCOL.md §1–§8; frozen before any search)

- **Question.** Does *allowing* S1 improve the best qualified whole-portfolio training net of independent search lanes,
  against the very same procedure with S1 forced OFF, without worse risk and through the rule itself?
- **Arms.** CTRL = Assignment 3's 92-gene New L0 space with S1 OFF (Stage B's CTRL arm exactly). EXP = the same space
  plus three staged switches (D1·GDX, D1·VGT, Growth·VGT) and six staged genes (activation and stage-2 distance per
  book; 101 genes). Both arms use the same P0 policy (`nl0-control@1.0.0`), the same schedule, seeds and qualification.
- **Lanes.** Per cutoff: 2 cells (`GA0.VA0`, `GB0.VD1`) × 32 replicates (R3–R34) × 2 arms = 128 lanes, each the broad NL0
  lane (screen 512 → promote 64 → islands → rungs → refinement → shortlist 3). Paired by (cell, replicate): both arms
  draw the same seeds for every shared gene.
- **Gate R.** In every fold, CTRL lanes R3–R18 must reproduce Stage B's sealed CTRL lanes exactly (determinism and the
  unchanged OFF path of the new engine) before qualification.
- **Extension block (§6.3).** If more than 25 % of either arm's 64 lanes end budget-bound ("extension cap reached" with a
  trigger still firing), every budget-bound lane of **both** arms is re-run once with the island cap 6 → 9.
- **Statistic.** D_u = V(EXP lane) − V(CTRL lane), V = the best qualified training-door centre net among the lane's
  selectable members (EXP: its shortlist and the OFF projections of its ON members). Stratified paired bootstrap
  (B = 100,000). **Material** = mean ≥ $10,000 and L90 > $0. Risk non-inferiority on five paired risk metrics (margins
  +$2,500 / +2 pp). Mechanism: ≥ 50 % of EXP representatives use S1 and their advantage over their own all-OFF projection
  has L90 > $0 (at C21 and C24).
- **Folds.** C19 (secondary; train 2016–2019, next interval 2020–2021), C21 (primary; train 2016–2021, interval
  2022–2023), C24 (primary; train 2016–2024, validation 2025-01-02 → 2026-10-30 on FULL, opened once). Every interval
  is retrospective, previously inspected history.

## 2. Fold C19 (secondary; never enters the outcome label)

| Item | CTRL | EXP |
|---|---|---|
| Search requested (official GPU) | 1,136,128 | 1,320,871 |
| Lanes budget-bound after the search | 2 / 64 | **32 / 64 (50 %)** — every `GB0.VD1` lane |
| Extension block (triggered: EXP 50 % > 25 %) | 2 lanes re-run | 32 lanes re-run; 1,182,219 requested (both arms) |
| Budget-bound after the extension | 0 | **32 / 64** (all `GB0.VD1`) |
| Qualification union | 192 members | 192 members + 334 OFF projections (+ 2 benchmarks; 718 members, 469,572 requested) |
| Mean V (median; min–max) | $95,224 ($94,064; $82,906–$127,622) | $97,564 ($95,105; $85,228–$150,713) |

- **Gate R: identical** (CTRL R3–R18 = Stage B, 32/32 lanes, envelopes included).
- **Primary statistic: D̄ = +$2,340, 80 % interval [L90 +$560, U90 +$4,168]; not material** (below $10,000). Per cell
  `GA0.VA0` +$2,667, `GB0.VD1` +$2,012; 33 positive / 31 negative pairs; Stage B seeds R3–R18 +$1,683, new seeds R19–R34
  +$2,997.
- **Mechanism (report-only at C19): confirmed in form** — 50/64 EXP representatives use S1 (78 %, Wilson 95 % 67–87 %);
  their mean advantage over their own all-OFF projection on the training door is **+$8,411** (L90 +$6,089). 8
  representatives are themselves OFF projections.
- **Risk:** non-inferior on all five metrics (none clearly worse); see `tables/risk.md`.
- **Pooled P0 primaries (training door D19):** CTRL `C19/broad/GA0.VA0/R15#1` $127,622 (marked DD $18,217); EXP
  `C19/broad/GA0.VA0/R5#1` with **D1·VGT staged (A 13.5 %, τ₂ 10.5 %)** $150,713 (DD $15,402). The EXP primary's own
  all-OFF projection: $148,970 — S1 adds $1,743 of its $23,091 lead over CTRL; the rest is its base genes.
- **Next interval (2020–2021, D21; retrospective):** EXP primary +$76,321 (reset DD $37,941), its all-OFF projection
  +$73,962 (DD $39,934), CTRL primary −$23,584 (DD $63,636); New L0 / N/original +$171,403 / +$171,402 (DD $17,281;
  both chosen with this history in view). Lane representatives: mean interval P&L CTRL $36,262 vs EXP $38,752; paired
  mean Δ +$2,490, Δ interval DD +$2,672. **On the interval, the 50 ON representatives beat their own all-OFF projections
  by a mean of −$1,864** (11 better, 27 identical, 12 worse): the training advantage of S1 did not carry into 2020–2021.

## 3. Fold C21 (primary)

| Item | CTRL | EXP |
|---|---|---|
| Search requested (official GPU) | 1,164,380 | 1,436,060 |
| Lanes budget-bound after the search | 4 / 64 | **34 / 64 (53 %)** |
| Extension block (triggered: EXP 53 % > 25 %) | 4 lanes re-run | 34 lanes re-run; 1,303,677 requested (both arms) |
| Budget-bound after the extension | 0 | **31 / 64 (48.4 %)** — every `GB0.VD1` lane except R5 |
| Qualification union | 192 members | 192 members + 378 OFF projections (+ 2 benchmarks; 764 members, 499,656 requested) |
| Mean V (median; min–max) | $203,818 ($205,571; $134,402–$236,003) | $210,502 ($209,545; $186,390–$252,819) |

- **Gate R: identical** (32/32).
- **Primary statistic: D̄ = +$6,684, 80 % interval [L90 +$3,809, U90 +$9,605]; not material** (the mean is below
  $10,000 although L90 > 0). Per cell `GA0.VA0` +$8,569, `GB0.VD1` +$4,798; 38 positive / 26 negative; R3–R18 +$10,187,
  R19–R34 +$3,181 (the halves disagree by $7,000: the replicate spread is large relative to the effect).
- **Mechanism: confirmed at C21** — 52/64 representatives use S1 (81 %, Wilson 95 % 70–89 %); mean advantage over their
  own all-OFF projection **+$10,655** (L90 +$7,032, U90 +$14,505). 13 representatives are OFF projections.
- **Risk: non-inferior on all five metrics, none clearly worse.** Means (EXP − CTRL; 80 % interval): centre marked DD
  −$888 [−$1,915, +$129]; confirmation p90 DD +$554 [−$304, +$1,401]; breach share +0.24 pp [−0.31, +0.78]; trade
  principal loss (liq.) **+$887 [+$376, +$1,411]**; banked-capital DD (liq.) **+$871 [+$114, +$1,636]**. The two envelope
  metrics are higher with S1 (both 80 % intervals above 0) but well inside the +$2,500 margin.
- **Pooled P0 primaries (D21):** CTRL `C21/broad/GB0.VD1/R34#1` $236,003 (DD $28,004); EXP `C21/broad/GB0.VD1/R24#1`
  with **D1·GDX staged (A 47.0 %, τ₂ 6.4 %)** $252,819 (DD $17,744); its all-OFF projection $252,079 — S1 adds $740 of
  its $16,816 lead. In the pooled run S1 arms once (2020-03, GDX) — see `tables/lots-C21-D23.md`.
- **Next interval (2022–2023, D23; retrospective):** EXP primary −$12,168 (reset DD $55,986) — **identical to its all-OFF
  projection** (S1 never armed in 2022–2023); CTRL primary −$12,102 (DD $39,387); New L0 +$87,238, N/original +$92,082
  (DD $19,460 each). Lane representatives: mean interval P&L CTRL −$13,898 vs EXP −$9,868 (paired Δ +$4,030; Δ interval
  DD +$188). **On the interval the 52 ON representatives beat their own all-OFF projections by a mean of +$3,099**
  (12 better, 38 identical, 2 worse): in 38 of 52 the stage never armed in 2022–2023.

## 4. Fold C24 (primary) and the informed lanes

*(filled after the C24 fold — see §4 below once written)*

## 5. Synthesis across the folds

*(filled after the C24 fold)*
