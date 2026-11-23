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

| Item | CTRL | EXP |
|---|---|---|
| Search requested (official GPU) | 922,165 | 1,107,112 |
| Lanes budget-bound after the search | 8 / 64 (all `GB0.VD1`) | **41 / 64 (64.1 %)** — 9 `GA0.VA0`, all 32 `GB0.VD1` |
| Extension block (triggered: EXP 64.1 % > 25 %) | 8 lanes re-run | 41 lanes re-run; 1,219,867 requested (both arms) |
| Budget-bound after the extension | 0 | **31 / 64 (48.4 %)** — 30 `GB0.VD1` + `GA0.VA0/R8` |
| Qualification union (with the informed lanes) | 192 members + 91 informed | 192 members + 362 OFF projections + 188 informed + 326 informed projections (+ 2 benchmarks; 1,237 members, 808,998 requested) |
| Mean V (median; min–max) | $180,345 ($180,119; $114,671–$241,225) | $189,106 ($187,508; $141,928–$238,352) |

- **Gate R: identical** (32/32).
- **Primary statistic: D̄ = +$8,761, 80 % interval [L90 +$4,059, U90 +$13,475]; not material** (mean below $10,000).
  Per cell `GA0.VA0` +$8,684, `GB0.VD1` +$8,838; 42 positive / 22 negative; **R3–R18 +$16,191 vs R19–R34 +$1,332** —
  the two halves of the replicates disagree by $14,859, so the C24 mean is driven by the Stage B seeds; D p10 / median
  / p90 −$31,975 / +$9,160 / +$51,471.
- **Mechanism: confirmed at C24** — 45/64 representatives use S1 (70 %, Wilson 95 % 58–80 %); mean advantage over their
  own all-OFF projection on D24 **+$7,174** (L90 +$4,654, U90 +$9,982). 19 representatives are OFF (14 of them OFF
  projections of ON members). The CPU replays of the 46 ON/OFF pairs (`tables/selection-C24-mechanism.md`): 41 better, 3
  identical, 2 worse; mean Δ net +$6,955 = changed exits +$3,258 + displacement (newly − no longer funded) +$3,697;
  mean forfeited trends −$2,237; mean Δ interest −$1,775 (less time funded); mean Δ marked DD −$2,139.
- **Risk: non-inferior on all five metrics, none clearly worse.** Means (EXP − CTRL; 80 % interval): centre marked DD
  +$205 [−$501, +$905]; confirmation p90 DD +$646 [−$36, +$1,331]; breach share +0.35 pp [−0.18, +0.90]; trade principal
  loss (liq.) −$497 [−$1,024, +$29]; banked-capital DD (liq.) −$41 [−$793, +$710].
- **Pooled P0 primaries (D24):** CTRL `C24/broad/GB0.VD1/R29#1` **$241,225** (DD $23,468); EXP
  `C24/broad/GB0.VD1/R4#1` with **D1·GDX (A 39.5 %, τ₂ 3.7 %) and D1·VGT (A 37.0 %, τ₂ 2.0 %) staged** **$238,352**
  (DD $26,301) — the EXP primary is **below** the CTRL primary; its all-OFF projection $232,478 (S1 adds $5,874 on D24,
  all in 2019). Both primaries are far below the frozen incumbents on the same door (New L0 $382,721, N/original
  $388,031; DD $19,460).
- **Validation (2025-01-02 → 2026-10-30, FULL, opened once after the committed frozen selection; retrospective,
  previously inspected history):** CTRL primary +$55,308 (reset DD $25,430); **EXP primary +$60,162 (DD $20,373) vs its
  own all-OFF projection +$75,051 (DD $21,701): S1 cost $14,889 in 2025** (a staged exit that forfeited the rest of a
  trend; see `RISK_REPORT.md` §4); New L0 +$96,884, N/original +$94,670 (DD $20,386 each). Lane representatives: mean
  validation P&L CTRL $41,938 vs EXP $36,782 — **T3 paired mean Δ −$5,156 [L90 −$10,505, U90 +$101]**; T2 interval-DD Δ
  U90 +$2,224 (non-inferior). **The 45 ON representatives vs their own all-OFF projections on the validation window:
  mean −$1,398** (17 better, 20 identical, 8 worse; worst −$64,128, best +$23,148).

### 4.1 Informed lanes I1–I4 (C24; separately labelled diagnostics, no chronological claim; PROTOCOL.md §10)

Every informed lane stopped on "triggers not met" (none budget-bound); 1,588,312 requested (EXP 1,046,127 over 32 lanes,
CTRL 542,185 over 16).

| Type | Centre | Free genes (EXP) | Mean V CTRL | Mean V EXP | Mean D_I (L90 / U90) | EXP reps ON | EXP primary (D24) | its all-OFF | Validation: EXP primary vs incumbent |
|---|---|---|---|---|---|---|---|---|---|
| I1 | New L0 | 9 staged genes | $382,721 (New L0) | $390,489 | +$7,767 ($7,249 / $8,259) | 8/8 | GDX (A 30.6 %, τ₂ 4.7 %) + VGT (A 48.8 %, τ₂ 5.2 %): $392,021 | $382,721 | **+$102,353 vs +$96,884 (+$5,469)** |
| I2 | N/original | 9 staged genes | $388,031 (N/original) | $395,564 | +$7,533 ($7,259 / $7,809) | 8/8 | GDX (A 23.9 %, τ₂ 4.8 %) + VGT (A 46.8 %, τ₂ 5.8 %) [a single-book OFF projection of a 3-book member]: $396,648 | $388,031 | **+$82,820 vs +$94,670 (−$11,850)** |
| I3 | New L0 | staged + D1 / Growth exit genes | $383,403 | $386,978 | +$3,576 ($3,436 / $3,716) | 8/8 | GDX (A 27.5 %, τ₂ 5.1 %): $386,978 | $382,721 | +$98,298 vs +$96,884 (+$1,414); CTRL I3 primary +$96,884 |
| I4 | N/original | as I3 + 12 RC genes | $389,296 | $389,139 | −$157 (−$307 / −$55) | 0/8 | OFF: $390,638 | — | +$94,670 (= N/original) |

- Around the incumbents the staged genes add +$3.6k to +$7.8k on D24 (≈ 1–2 %), every time below the $10,000
  materiality line that the independent arms use, with tight intervals (the 8 replicates share one centre). With the
  exit genes also free (I4), the EXP lanes chose S1 OFF in all 8 replicates.
- On the 2025–2026 validation window the informed EXP primaries split: I1 +$5,469 and I3 +$1,414 over New L0, I2
  −$11,850 under N/original (2026: $35,185 vs $49,501). There is no consistent out-of-sample gain.

## 5. Synthesis across the folds

| Fold | D̄ (L90 / U90) | Material | EXP budget-bound after the extension | Mechanism (ON share; advantage) | Risk | Next interval: EXP primary vs its all-OFF | ON reps vs own all-OFF on the interval (mean; + / = / −) | T3 paired interval Δ (L90 / U90) |
|---|---|---|---|---|---|---|---|---|
| C19 (secondary) | +$2,340 ($560 / $4,168) | no | 50.0 % | 78 %; +$8,411 | non-inferior | +$76,321 vs +$73,962 (+$2,359) | −$1,864; 11 / 27 / 12 | +$2,490 (−$4,700 / +$9,748) |
| C21 | +$6,684 ($3,809 / $9,605) | no | 48.4 % | 81 %; +$10,655 | non-inferior | −$12,168 vs −$12,168 ($0) | +$3,099; 12 / 38 / 2 | +$4,030 (−$108 / +$8,165) |
| C24 | +$8,761 ($4,059 / $13,475) | no | 48.4 % | 70 %; +$7,174 | non-inferior | +$60,162 vs +$75,051 (−$14,889) | −$1,398; 17 / 20 / 8 | −$5,156 (−$10,505 / +$101) |

1. **Precommitted label: INCONCLUSIVE (budget)** — the second rule of PROTOCOL.md §1.4 fires: after the extension block
   more than 25 % of EXP's lanes were still budget-bound at C21 (48.4 %) and at C24 (48.4 %). The first rule (harmful)
   does not fire: neither C21 nor C24 has U90 < 0 and no risk metric is clearly worse. The label is sealed in
   `results/outcome.json` and is not reinterpreted here.
2. **Independently of the budget caveat, no fold reached materiality.** The mean gap grew with the training window
   ($2.3k → $6.7k → $8.8k) but stayed below $10,000 each time, and at C21 and C24 the replicate halves disagree by $7k
   and $15k.
3. **The training-door advantage is genuinely S1's** (mechanism confirmed at every fold: ON representatives beat their
   own all-OFF projections by $7–11k on the training door, through changed exits and the capital they free).
4. **It does not carry into the following periods.** On the three next intervals the ON representatives gained −$1,864,
   +$3,099 and −$1,398 on average over their own all-OFF projections, and in many lanes S1 never armed. The EXP
   primaries' leads over the CTRL primaries on the intervals come from their base genes, not from S1 (C19 +$2,359 of
   +$99,905; C21 $0; C24 −$14,889 against a +$4,854 lead).
5. **Search economics:** allowing S1 makes the search harder — EXP lanes were budget-bound 5–16 times as often as CTRL
   lanes and needed 16–23 % more evaluations, and the `GB0.VD1` cell stayed budget-bound even with the island cap at 9.
   A larger budget is the only route to a definite primary verdict; the interval evidence (point 4) gives no reason to
   expect a material out-of-sample effect.
6. **Chronological check (§9.3):** passed by neither arm (largest fold-primary interval DD CTRL $63,636, EXP $55,987
   > $35,000; Σ interval P&L CTRL $19,622, EXP $124,315). Every selection is "no chronological support: not a
   deployment-qualified candidate without an explicit user decision".
