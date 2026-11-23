# Priority 4 — staged trailing stops (S1): executive report

**Study:** `research/vg-l0-staged-stop/`, protocol P4-S1 1.0.0, frozen 2026-11-23T18:17:12Z. **Branch:**
`research/vg-l0-staged-trailing-stop`; `main` is untouched. **Outcome label: INCONCLUSIVE (budget).**
**Recommendation: keep S1 OFF; no Priority 5 successor optimization of S1; New L0 and N/original preserved unchanged.**
No strategy is adopted, deployed or merged, and no order was sent.

Written analysis and tables only. Every number is from a sealed official GPU record unless it is marked as a
report-only CPU diagnostic.

## Question and hypothesis

**Question.** Does a later, tighter second trailing-stop stage improve the New L0 family as a whole portfolio? The
stage is S1, `staged-stop@1`:
- once a lot's high reaches entry × (1 + A), the trailing stop tightens to τ₂ below the high;
- it applies per book (D1·GDX, D1·VGT, Growth·VGT);
- A and τ₂ are in integer tenths of a percent, with a no-early-lock minimum.

The improvement must hold against the same search with S1 forced OFF, without worse risk, and be attributable to the
rule itself.

**Hypothesis (H1).** Allowing S1 raises the best qualified whole-portfolio training net of independent search lanes by
≥ $10,000, with L90 > 0, at C21 and C24. Risk must be non-inferior, and the gain must come through S1 (mechanism test).

## What was done

1. **Engineering (E0–E5): all gates passed.**
   - The rule specification was frozen before any code.
   - CPU reference: 70/70 gate tests. The OFF path is exact: New L0 and N/original reproduce their sealed figures to the
     cent.
   - CUDA port: protocol v3, capability bits 36/37.
   - GPU Phase 8 acceptance: ACCEPTED, record `c02a8a92…`. Parity covered 159,240 subjects, 155,600 of them random
     genomes, with 0 mismatches. Sanitizer, negative tests (82/82), tamper tests (23/23), sustained runs and fixed-seed
     mini-optimizations all passed.
   - The record is pinned out of band.
   - Every evaluating process ran `node --no-maglev`. There was no CPU fallback.
2. **Stage A: fixed-parameter ablations on D24** (144 points × 4 frictions). No point is a material improvement. Best
   +$3,837, median −$43,247; losses grow as A falls and as τ₂ tightens. The risk envelope never improves.
3. **Paired GPU search** (C19 secondary, C21 and C24 primary).
   - 128 lanes per fold: 2 cells × 32 replicates × CTRL/EXP, paired by seed.
   - Gate R was identical at every fold: CTRL R3–R18 reproduce Stage B's sealed lanes exactly.
   - The extension block triggered at every fold.
   - Qualification union with OFF projections. Lanes I1–I4 were incumbent-informed diagnostics.
   - The decomposition was run on D24.
   - The 2025-01-02 → 2026-10-30 validation was opened once on FULL, after the committed frozen selection.
4. **Official GPU compute:** 14,316,362 evaluations requested (14,001,785 fresh GPU, 307,823 archive hits) in 3 h 10 min
   of GPU time, against the 25,000,000 ceiling. On top of that came the Phase 8 acceptance campaign (4 h 36 min) and
   the E5 benchmark (125,108).

## Outcomes

| Fold | D̄ = V(EXP) − V(CTRL), mean (L90 / U90) | Material | Risk (5 metrics) | Mechanism (ON share; advantage over own all-OFF) | EXP budget-bound after the extension |
|---|---|---|---|---|---|
| C19 (secondary) | +$2,340 ($560 / $4,168) | no | non-inferior | 78 %; +$8,411 | 50.0 % |
| C21 | +$6,684 ($3,809 / $9,605) | no | non-inferior | 81 %; +$10,655 | 48.4 % |
| C24 | +$8,761 ($4,059 / $13,475) | no | non-inferior | 70 %; +$7,174 | 48.4 % |

- **Label: INCONCLUSIVE (budget)** (PROTOCOL.md §1.4, applied mechanically and sealed).
  - Rule 1, harmful, does not fire.
  - Rule 2 fires: more than 25 % of EXP's lanes were still budget-bound after the extension block at C21 and C24. CTRL
    had 0 %.
  - Separately, the primary effect is below the $10,000 materiality line at every fold, and the replicate halves
    disagree: C24 R3–R18 +$16,191, R19–R34 +$1,332.
- **Risk: non-inferior on all five preregistered metrics at all three folds; none clearly worse.**
  - S1 does not lower any finalist's DD tail; the tails equal its own all-OFF projection's.
  - At C19 and C21, trade principal loss and banked-capital DD are slightly higher with S1 (under $1,200).
- **Attribution: real on the training doors, absent afterwards.**
  - On the training doors, the ON lane representatives beat their own all-OFF projections by $7–11k (L90 > 0).
  - On the following periods they gained −$1,864 (2020–21), +$3,099 (2022–23) and −$1,398 (2025–26). In C24 the mean is
    ≈ $0 without one lane's −$64k forfeiture.
  - The EXP primaries' interval leads over CTRL come from their base genes.
- **Validation 2025-01 → 2026-10** (retrospective, previously inspected history):

  | Subject | Validation P&L |
  |---|---|
  | CTRL primary | +$55,308 |
  | EXP primary | +$60,162 |
  | EXP primary's own all-OFF projection | +$75,051 (S1 cost $14,889: one VGT trend cut short in July 2025) |
  | New L0 | +$96,884 |
  | N/original | +$94,670 |
  | Informed I1 (New L0 + S1) | +$102,353 |
  | Informed I2 (N/original + S1) | +$82,820 |
  | Informed I3 | +$98,298 |

  - Paired lane representatives: T3 −$5,156 (L90 −$10,505, U90 +$101).
  - Chronological check (§9.3): passed by neither arm.
- **Decomposition** (A/B/C per incumbent):
  - Transplanting the EXP primary's S1 settings into New L0 or N/original loses $28k on D24 and $7–10k on validation.
  - The informed settings move the incumbents by −$12k to +$5k on validation, with no consistent sign.
- **How often S1 forfeited a trend.** A staged exit forfeited the rest of a profitable trend in:
  - 30 % of staged exits with fixed settings;
  - 5–8 % with the training-selected settings on their own training door;
  - about 30 % again in 2025–2026.

## Recommendation

1. **Preserve New L0 and N/original exactly**, with S1 OFF. Their research, configurations and Strategy Lab behaviour
   are untouched.
2. **Keep S1 OFF, and do not make it a Priority 5 successor optimization.** The reasons:
   - Its genuine training-door effect is small, and was never material even in-sample.
   - It does not survive into three later windows.
   - It does not transfer to the incumbents.
   - It adds no drawdown protection.
   - Out of sample it gives back trends at its unselected rate.
   - The budget caveat does not change this: more search would fit the same training history harder.
3. **Keep the verified implementation and its acceptance on the research branch only.** Merging into `main` would be a
   separate, reviewed decision.

## Limitations

- **Every interval and the validation window is previously inspected history**, so this is a retrospective
  chronological check, not forward performance. The incumbents were chosen with these windows in view.
- **The primary verdict is budget-inconclusive by the precommitted rule.** The EXP `GB0.VD1` cell stayed budget-bound
  even with the island cap at 9.
- **The informed lanes are diagnostics with tight intervals**: 8 replicates, one shared centre.
- **The lot-level, giveback, forfeiture and regime figures are report-only CPU diagnostics.** They reproduce the sealed
  GPU whole-run net and DD to the cent for every subject (4 + 4 + 24 + 195). They are not official evidence.
- **The 2 declared npm-test failures of the completed Priority 5A study** follow from the Growth engine revision 1.5.0.
  They are not relaxed, and a merge would inherit them (see `reports/IMPLEMENTATION_VERIFICATION.md`).

## Where to read more

| Document | Content |
|---|---|
| `DECISION_REGISTER.md` | every decision, with its evidence |
| `reports/FINAL_COMPARISON.md` | label, candidate table, A/B/C decomposition, attribution, recommendation |
| `reports/SEARCH_REPORT.md` | the paired search per fold, informed lanes, synthesis |
| `reports/RISK_REPORT.md` | tails, envelope, giveback, protection versus realized, forfeiture, stresses, concentration, chronology, regimes |
| `reports/ABLATION_REPORT.md` | Stage A |
| `reports/IMPLEMENTATION_VERIFICATION.md` | code identity, CPU/GPU verification, Phase 8 acceptance, in-study checks, regression |
| `reports/REPRODUCIBILITY.md` | environment, hashes, commands, recovery |
| `RULE_SPECIFICATION.md`, `PROTOCOL.md`, `AMENDMENTS.md` | the frozen rule and protocol |
