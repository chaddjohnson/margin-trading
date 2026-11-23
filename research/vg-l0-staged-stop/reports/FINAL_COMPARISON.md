# Priority 4 — final comparison and qualified recommendation

Written analysis and tables only.

Sources:
- **Sealed official GPU records:** `results/outcome.json`, `selection/`, `qualification/`, `intervals/` and
  `decomposition/`.
- **Report-only CPU diagnostics** (purpose `diagnostic`; each reproduces the sealed GPU whole-run net and marked DD to
  the cent): the lot-level tables `tables/lots-*.md` and `diagnostics/lots-C24-FULL-all.json` (195/195 equal).
- **Generated tables:** `tables/annual-train-validate.md` and `tables/abc-decomposition.md`.

**No phenotype is adopted, deployed or merged. New L0 and N/original are preserved unchanged.**

## 1. The precommitted outcome

**Label: INCONCLUSIVE (budget).** The label is sealed in `results/outcome.json`, sha256 `949756c9…`. The order of
PROTOCOL.md §1.4 was applied mechanically:

1. **Harmful? No.** C21 has U90 +$9,605 and C24 has U90 +$13,475, both above 0. No risk metric is clearly worse at C21
   or C24.
2. **Inconclusive (budget)? Yes.** After the extension block, 48.4 % of EXP's lanes were still budget-bound at both C21
   and C24, above the 25 % threshold. CTRL had 0 % at both.
3. The material, no-difference and one-fold-only rules were therefore not reached. **Taken alone, though, the primary
   statistic is not material at any fold:**
   - C21: D̄ $6,684, L90 $3,809.
   - C24: D̄ $8,761, L90 $4,059.
   - C19, secondary: D̄ $2,340.
   - Every mean is below the $10,000 line.
4. **Chronological check: not passed by either arm.** Every selection is "no chronological support: not a
   deployment-qualified candidate without an explicit user decision".

## 2. Training and validation of every compared candidate

All windows are retrospective, previously inspected history. The incumbents were chosen with all of these windows in
view.

| Fold | Candidate | S1 | Training door | Training-door net (DD) | Next interval | Interval P&L (reset DD) |
|---|---|---|---|---|---|---|
| C19 | New L0 / N/original | OFF | D19 2016–2019 | $79,970 ($10,633) / $80,437 ($10,691) | 2020–2021 | +$171,403 / +$171,402 ($17,281) |
| C19 | CTRL primary R15#1 | OFF | D19 | $127,622 ($18,217) | 2020–2021 | −$23,584 ($63,636) |
| C19 | EXP primary R5#1 | VGT (A 13.5 %, τ₂ 10.5 %) | D19 | $150,713 ($15,402) | 2020–2021 | +$76,321 ($37,941) |
| C19 | EXP primary all-OFF | OFF | D19 | $148,970 ($17,145) | 2020–2021 | +$73,962 ($39,934) |
| C21 | New L0 / N/original | OFF | D21 2016–2021 | $251,373 / $251,839 ($17,281) | 2022–2023 | +$87,238 / +$92,082 ($19,460) |
| C21 | CTRL primary R34#1 | OFF | D21 | $236,003 ($28,004) | 2022–2023 | −$12,102 ($39,387) |
| C21 | EXP primary R24#1 | GDX (A 47.0 %, τ₂ 6.4 %) | D21 | $252,819 ($17,744) | 2022–2023 | −$12,168 ($55,987) |
| C21 | EXP primary all-OFF | OFF | D21 | $252,079 ($17,744) | 2022–2023 | −$12,168 ($55,987) |
| C24 | New L0 / N/original | OFF | D24 2016–2024 | $382,721 / $388,031 ($19,460) | 2025-01 → 2026-10 | +$96,884 / +$94,670 ($20,386) |
| C24 | CTRL primary R29#1 | OFF | D24 | $241,225 ($23,468) | validation | +$55,308 ($25,430) |
| C24 | EXP primary R4#1 | GDX (A 39.5 %, τ₂ 3.7 %) + VGT (A 37.0 %, τ₂ 2.0 %) | D24 | $238,352 ($26,301) | validation | +$60,162 ($20,373) |
| C24 | EXP primary all-OFF | OFF | D24 | $232,478 ($26,301) | validation | +$75,051 ($21,701) |
| C24 | informed I1 EXP primary (New L0 + staged) | GDX (A 30.6 %, τ₂ 4.7 %) + VGT (A 48.8 %, τ₂ 5.2 %) | D24 | $392,021 ($19,460) | validation | +$102,353 ($20,386) |
| C24 | informed I2 EXP primary (N/original + staged) | GDX (A 23.9 %, τ₂ 4.8 %) + VGT (A 46.8 %, τ₂ 5.8 %) | D24 | $396,648 ($19,460) | validation | +$82,820 ($20,386) |
| C24 | informed I3 EXP primary (New L0 + staged + exit genes) | GDX (A 27.5 %, τ₂ 5.1 %) | D24 | $386,978 ($19,460) | validation | +$98,298 ($20,386) |
| C24 | informed I3 CTRL primary (exit genes only) | OFF | D24 | $383,682 ($19,460) | validation | +$96,884 ($20,386) |
| C24 | informed I4 CTRL = EXP primary | OFF | D24 | $390,638 ($19,460) | validation | +$94,670 ($20,386) |

The annual marked net of every row is in `tables/annual-train-validate.md` and `RISK_REPORT.md` §6.2.

**No material, structurally distinct alternative exists.**
- The independently searched fold primaries of both arms are structurally different from the incumbents, but they lag
  them badly on every door (C24: $238–241k against $383–388k) and on every interval.
- The informed finalists are the incumbents plus a few staged genes. Their D24 gains of +$3.6k to +$8.6k are below the
  materiality line.

## 3. A/B/C decomposition per frozen incumbent

Rows per incumbent and finalist (`tables/abc-decomposition.md`):
- **A:** the incumbent with S1 OFF.
- **B:** the incumbent with the finalist's staged genes and no re-optimization.
- **C:** the finalist as jointly optimized.
- **C-OFF:** the finalist projected to S1 OFF.

The D24 columns come from the sealed decomposition record. The FULL and validation columns come from the sealed
validation run of the same configurations. Time funded, lots, staged exits and retained share come from the
report-only FULL replays. Pooled whole-portfolio figures only; no standalone trade profits are added.

### 3.1 New L0

| Row | D24 net | D24 DD | FULL 2016 → 2026-10 net | FULL DD | Validation P&L | PL liq. / BD liq. (FULL) | Time funded | Lots | Staged exits (gap / placement) | Retained share |
|---|---|---|---|---|---|---|---|---|---|---|
| A New L0 OFF | $382,721 | $19,460 | $479,605 | $20,386 | $96,884 | $11,114 / $13,525 | 63.2 % | 46 | 0 | 60.8 % |
| B + EXP pooled primary's genes | $354,647 | $19,460 | $441,493 | $20,386 | $86,846 | $11,114 / $13,525 | 56.7 % | 47 | 5 (3 / 0) | 61.3 % |
| B + I1's genes (= C I1) | $392,021 | $19,460 | $494,374 | $20,386 | $102,353 | $11,114 / $13,525 | 63.1 % | 46 | 6 (2 / 0) | 62.5 % |
| B + I2's genes | $389,480 | $19,460 | $474,577 | $20,386 | $85,097 | $11,114 / $13,525 | 62.7 % | 47 | 9 (2 / 1) | 61.7 % |
| B + I3's genes (= C I3) | $386,978 | $19,460 | $485,277 | $20,386 | $98,298 | $11,114 / $13,525 | 63.2 % | 46 | 4 (0 / 0) | 61.5 % |
| C EXP pooled primary | $238,352 | $26,301 | $298,514 | $26,301 | $60,162 | $10,862 / $14,483 | 46.3 % | 33 | 3 (2 / 0) | 60.5 % |
| C-OFF EXP pooled primary | $232,478 | $26,301 | $307,530 | $26,301 | $75,051 | $10,862 / $14,483 | 49.7 % | 33 | 0 | 59.6 % |

### 3.2 N/original

| Row | D24 net | D24 DD | FULL net | FULL DD | Validation P&L | PL liq. / BD liq. (FULL) | Time funded | Lots | Staged exits (gap / placement) | Retained share |
|---|---|---|---|---|---|---|---|---|---|---|
| A N/original OFF | $388,031 | $19,460 | $482,701 | $20,386 | $94,670 | $11,114 / $13,525 | 62.6 % | 44 | 0 | 61.8 % |
| B + EXP pooled primary's genes | $360,122 | $19,460 | $447,335 | $20,386 | $87,213 | $11,114 / $13,525 | 56.3 % | 45 | 5 (2 / 0) | 62.6 % |
| B + I1's genes | $386,572 | $21,100 | $486,667 | $21,100 | $100,094 | $11,114 / $14,904 | 61.6 % | 45 | 7 (2 / 0) | 63.7 % |
| B + I2's genes (= C I2) | $396,648 | $19,460 | $479,467 | $20,386 | $82,820 | $11,114 / $13,525 | 62.1 % | 45 | 9 (3 / 1) | 62.5 % |
| B + I3's genes | $384,980 | $19,137 | $481,067 | $20,386 | $96,087 | $11,114 / $13,525 | 62.5 % | 45 | 5 (0 / 0) | 62.4 % |

**Reading the decomposition:**

- **Transplanting the independently searched EXP primary's staged genes into either incumbent costs money.** On D24
  this is −$28,074 for New L0 and −$27,909 for N/original. On FULL it is −$38,112 and −$35,366, and on validation
  −$10,038 and −$7,457.
- **That primary's tight stage-2 distance (τ₂ 2.0 % on VGT, 3.7 % on GDX) does not suit the incumbents.** In each
  transplant two D1·VGT trends are cut short: entries 2020-04-02 (−$19.6k to −$19.7k) and 2025-04-21 (−$10.9k to
  −$13.5k). The VGT lot of 2020-10-30 is no longer funded (−$15.5k to −$15.9k), two weaker lots are funded instead
  (2019-06-03 VGT, 2021-02-17 GDX: −$2.1k to −$1.6k net), and time funded falls by about 6.5
  points. The S1 benefit of a finalist does not transfer.
- **The informed settings move the incumbents by small amounts of inconsistent sign out of sample.**
  - I1's genes give New L0 +$9,299 on D24 and +$5,469 on validation, with an identical DD.
  - On N/original the same genes give −$1,459 on D24, +$5,424 on validation, and +$1,640 marked DD on D24.
  - I2's genes give N/original +$8,617 on D24 but −$11,850 on validation; New L0 gets +$6,759 and −$11,787.
  - I3's genes give New L0 +$4,257 and +$1,414; N/original gets −$3,051 and +$1,417.
- **Almost no transplant changes the incumbents' marked DD, principal-loss or banked-capital envelope.** The
  exceptions are on D24, both on N/original:
  - I1's genes: marked DD +$1,640, BD +$4,520; on FULL, DD +$714 and BD +$1,379.
  - I3's genes: DD −$323, PL +$574, BD +$339; equal on FULL.
- **The finalist against its own OFF projection (C against C-OFF):**
  - EXP pooled primary: +$5,874 on D24, −$14,889 on validation, −$9,015 on FULL.
  - I1: +$9,299, +$5,469 and +$14,769.
  - I2: +$8,617, −$11,850 and −$3,234.
  - I3: +$4,257, +$1,414 and +$5,672.
  - The sign of S1's contribution changes between D24 and validation in two of the four finalists.

## 4. Is any benefit genuinely attributable to S1?

- **On the training doors, yes, but it is modest.** The preregistered mechanism test is confirmed at every fold: 70–81 %
  of EXP lane representatives use S1. They beat their own all-OFF projections by a mean of $7.2k–$10.7k (L90 > 0),
  through changed exits and the capital freed for new trades.
- **On the following periods, no.**
  - ON representatives against their own all-OFF projections: −$1,864 (2020–21), +$3,099 (2022–23) and −$1,398
    (2025–26).
  - In C24 the mean is ≈ $0 once one lane's −$64k forfeiture is set aside.
  - The interval P&L was identical to the all-OFF projection, meaning S1 made no difference there, in 27/50, 38/52 and
    20/45 of those lanes.
- **The fold primaries' leads over CTRL on the intervals are not S1's.** They come from their base genes: S1's share of
  the lead was +$2,359 of +$99,905 at C19, $0 at C21, and −$14,889 against a +$4,854 lead at C24.
- **Out of sample, forfeiture returns to the unselected rate.** Staged exits that cut a still-running trend were 5–8 %
  of staged exits on the training doors but about 30 % of those added by 2025–2026, as in the unselected Stage A grid
  (30 %).

## 5. Qualified recommendation

1. **Keep New L0 and N/original exactly as they are, with S1 OFF.** None of their sealed research, configurations,
   identities or Strategy Lab behaviour was touched. The OFF path of the new engine reproduces them to the cent.
2. **S1 should remain OFF and should not become a Priority 5 successor optimization.** The reasons:
   - The precommitted label is inconclusive only because of the search budget.
   - The effect size is below the materiality line at every fold, even in-sample.
   - The training-door advantage that is genuinely S1's does not survive into any of the three later windows.
   - Transplanting the independently searched finalist's S1 settings into the incumbents loses money, and the informed
     settings' effects change sign between D24 and validation.
   - S1 adds no drawdown protection: the tails equal its own OFF projections'.
   - A larger budget could settle the label. It cannot fix the out-of-sample pattern, because the extra budget would be
     spent fitting the same training history.
3. **Keep the implementation for possible future use, but do not merge it.** It is fully verified: CPU reference, CUDA
   protocol v3, GPU Phase 8 acceptance `c02a8a92…` and the OFF identity. It stays on the research branch
   `research/vg-l0-staged-trailing-stop`. Merging it into `main` is a separate decision, needing a reviewed merge and
   the parity gate.
4. **Only explicit user decisions could change this:**
   - (a) authorizing a budget-only re-run of the EXP `GB0.VD1` lanes to resolve "inconclusive (budget)". Not
     recommended, for the reason in point 2.
   - (b) a different staged rule. S1 is the only rule this brief authorized.

**Outcome label: INCONCLUSIVE (budget). Recommendation: S1 OFF; no Priority 5 successor optimization of S1; New L0 and
N/original preserved.**
