# CHRONOLOGICAL VALIDATION — P5-NS

All of 2016-01-04 → 2026-10-30 is **previously examined history**: the folds are retrospective procedural tests and
2025–2026 is previously inspected validation history, not a pristine holdout. Every fold selection was sealed and
committed before its next slice opened (`results/doors.jsonl` records every opening). Figures are from the sealed
records `results/selection/C*.json`, `results/slices/C*.json` and `results/sequential.json` (sha256 in
`results/seals.jsonl`). DD = maximum minute marked drawdown on the fixed $100,000 allocation; slice DD resets at the cutoff
close; each run is continuous from 2016-01-04 (open lots carried across the boundary).

## 1. The independent procedure F/original fold by fold

| Fold | Training door | F primary (NL0's original rule) | Training net / DD | Next slice | Slice P&L / reset DD | Training neighbourhood on the slice: breaches > $35k [Wilson 95 %] (training share) |
|---|---|---|---:|---|---:|---|
| C19 | D19 (2016–2019) | `C19/refine/GD1.VA1/R102#1 profit` | $178,920 / $24,891 | 2020-01-02 → 2021-12-31 | **−$31,152 / $51,066** | 88.3 % [83.8, 91.7] (5.1 %) |
| C21 | D21 (2016–2021) | `C21/refine/GB0.VA1/R103#1 profit` | $268,206 / $20,277 | 2022-01-03 → 2023-12-29 | **−$5,132 / $54,128** | 99.6 % [97.8, 99.9] (3.1 %) |
| C23 | D23 (2016–2023) | `C23/refine/GA1.VA0/R101#1 profit` | $286,928 / $27,370 | 2024-01-02 → 2024-12-31 | +$475 / $18,783 | 0.0 % [0.0, 1.5] (5.5 %) |

Qualified Track F members per fold: 1,447 (C19), 1,076 (C21), 1,029 (C23). Every fold primary came from a stage-2
refinement lane. At every cutoff each primary carried one lot open over the boundary (the §5.9 exposure item).

## 2. Sequential paths and the frozen verdicts (2020–2024; `results/sequential.json`)

| Procedure | Verdict | Sequential net | Sequential DD (GPU statistic, AD4) | Where |
|---|---|---:|---:|---|
| **F/original (THE independent procedure)** | **unsupported** | **−$35,958.68** | **$90,945.51** | C21 slice, from the 2020–2021 peak across the boundary |
| L/original (legacy cell; secondary) | unsupported | +$60,256.84 | $44,257.10 | C21, across the boundary |
| B/original (no entry-day book; secondary) | unsupported | −$70,406.98 | $93,377.79 | C21, across the boundary |
| F: role robust-profit (descriptive) | — | −$46,585.11 | $75,662.81 | |
| F: role balanced (descriptive) | — | +$20,874.02 | $62,219.74 | |
| F: role lower-drawdown (descriptive) | — | +$40,005.61 | $46,095.20 | |
| N/original fixed (descriptive: chosen with later data) | — | +$307,594.16 | $19,459.83 | |
| New L0 fixed (descriptive: chosen with later data) | — | +$302,751.28 | $19,459.83 | (Assignment 3's CPU exact value: $302,751.28 / $19,459.83 — equal) |

**Consequence (standard §1.8, precommitted):** the independent procedure is chronologically **unsupported**, so its
selection carries **"no chronological support: not a deployment-qualified candidate without an explicit user
decision"**. The verdict does not depend on the AD4 statistic: the C19 and C21 slices alone breach $35,000 by their
minute reset drawdowns ($51,066, $54,128). Track N and population U have **no independent chronological test** by
construction (C24 only, seeded from N/original, which was chosen with 2016–2024 in view); they never borrow these folds.

## 3. What the folds show

- The independent search found, at each cutoff, portfolios that earn far more than N/original *on the training window*
  (C19 $178,920 vs $80,437; C21 $268,206 vs $251,839) — and lost money on the next regime with drawdowns 1.5× the
  ceiling. The training neighbourhoods breached in 3–5 % of draws in training but in 88–100 % of draws on the 2020–2021
  and 2022–2023 slices: **local stability did not transfer** (standard §5.4), exactly as in Assignment 3, the walk-forward
  diagnostic and Priority 4.
- 2024 (C23's slice) carried little D1 activity: the primary earned +$475; not a test of the breaking regimes.
- The fixed references' hindsight paths are descriptive: they were selected with 2016–2024 (New L0, N/original) in view.

## 4. The C24 validation: 2025-01-02 → 2026-10-30, opened once (previously examined history)

FULL was opened once, by the official validation job `C24-validation` (2026-11-24T22:56Z; 11,970 fresh GPU evaluations,
0 CPU-scored; attestation `results/gpu-attestations/C24-validation-*.json`), **after** the sealed frozen selection
`FROZEN_SELECTION.json` (commit `308703d1`) and the sealed FULL authorization (commit `d48b0d77`); record
`results/validation/validation.json` (commit `7f4968f3`); outcome `results/outcome.json` (commit `f08e0279`). Every
subject is one continuous run from 2016-01-04 (open lots and marks carried); validation P&L is the change of marked net
from the 2024-12-31 close; the reset DD restarts the strict minute tracker at that close. No threshold, domain, budget or
rule was changed after this window opened (no amendment exists).

| Subject | 2025 / 2026 P&L | **Validation P&L / reset DD** | Full net / DD | Lot open at the boundary | Training neighbourhood on 2025–26 (256 draws): median P&L, p90 / worst reset DD, breaches > $35k [Wilson 95 %] (training share) | V1–V3 |
|---|---:|---:|---:|---|---|---|
| U primary `C24/informed/GB.VA/R103#1 profit` | $45,169 / $49,501 | **$94,669.70 / $20,385.99** | $486,521.87 / $20,385.99 | none | $81,957; $26,056 / $33,673; 0.0 % [0.0, 1.5] (1.2 %) | pass |
| N/original | $45,169 / $49,501 | **$94,669.70 / $20,385.99** | $482,700.73 / $20,385.99 | none | $79,745; $27,193 / $31,894; 0.0 % [0.0, 1.5] (3.1 %) | pass |
| New L0 | $47,531 / $49,353 | **$96,883.72 / $20,385.99** | $479,605.18 / $20,385.99 | none | $83,571; $24,549 / $30,111; 0.0 % [0.0, 1.5] (7.0 %) | pass |
| N robust-profit `C24/informed/GA.VC/R101#2 robust` | $38,178 / $24,564 | $62,740.79 / $20,746.93 | $431,522.72 / $23,083.79 | none | $64,025; $26,494 / $35,806; 0.4 % [0.1, 2.2] (2.0 %) | pass |
| F primary `C24/refine/GA0.VB1/R102#1 profit` | $37,525 / −$6,515 | $31,010.33 / **$34,380.49** | $320,150.86 / $34,380.49 | D1·VGT (2024-08-05; +$8,446 at its exit) | $44,849; $35,983 / $41,624; **18.0 % [13.8, 23.1]** (4.7 %) | pass (DD $620 under the ceiling) |
| L/original `C24/refine/GA0.VA0/R101#1 profit` | $3,019 / $23,835 | $26,854.03 / $22,868.86 | $291,446.54 / $23,483.92 | none | $27,059; $27,331 / $36,013; 1.6 % [0.6, 3.9] (2.0 %) | pass |
| B/original `C24/refine/GA0.VB1/R101#4 control alternative` | $37,204 / $8,487 | $45,690.31 / $28,183.91 | $316,170.49 / $28,183.91 | D1·VGT (same lot) | $50,903; $35,460 / $43,553; 11.7 % [8.3, 16.2] (0.8 %) | pass |
| I1 (Priority 4, sealed; S1-enabled; not evaluated here) | — | $102,353.23 / $20,385.99 | $494,374.00 / $20,385.99 | — | — | (P4's own record) |

Across the 40 finalists: Track N 19/19 pass V1–V3 (median validation P&L $92,661); Track F refinement 11/15 and broad
4/6 pass (medians $30,905 and $23,769); the six failures are all Track F (negative P&L or a reset DD above $35,000:
`FINAL_CANDIDATES.md` §3).

**Reading.** The U primary's 2025–2026 path is N/original's to the cent: all its +$3,821 of development advantage
came from 2020–2022 and adds nothing on the inspected later window. The informed region again held up on 2025–2026
(as it did when Assignment 3 and Priority 4 first inspected it — so this window is not independent evidence for any
member of it). The independent F primary passed V1–V3 narrowly (reset DD $34,380, $620 under the ceiling) and its
training neighbourhood breached in 18 % of draws on the window against 4.7 % in training — the same transfer failure as
the folds. **No successor qualified before the window opened** (the precommitted pre-determination, sealed in
`FROZEN_SELECTION.json`, listed no candidate), so V1–V3 could only confirm or refuse an empty set; the outcome is
*no material improvement*.
