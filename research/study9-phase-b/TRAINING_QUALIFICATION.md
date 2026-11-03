# Study 9 Phase B — training qualification and the frozen selection

**Sources:** the 35 sealed qualification records `results/qualify/<TRACK>/<FOLD>/qualification.json` (chain entry 6
`qualify`, `3a0d1a924c93…`) and `FROZEN_SELECTION.json` (chain entry 7 `selection`, `2cc50fbeaa20…`, file sha256
`1a2e6222b4bbd84c…`). Tables: `results/tables/qualify-*.md`, `selection-*.md`. **Everything here is in-sample** (each
fold's own training window, the confirmation seed families 3 × 128 that the search never used); qualification is a
veto, never a ranking; the ranking uses the confirmation figures, which also gave the veto (a winner's-curse bias).

## 1. Qualification (Q1–Q8, E1–E3; Study 8's `qualificationOf`, imported)

- **180 of 210 shortlist members qualified.** The failures: Q8 (confirmation median < 60% of the centre) 17, Q2b
  (in-box neighbourhood for near-bound candidates) 9, infeasible on training 8, Q6 (top lot > 25%) 6, E1 (median <
  $10k/yr or p10 ≤ 0) 6, Q2 2, E3 1.
- **Per fold and track** (qualified of 6 · CSCV PBO over the 64 best rung-2 configurations; F19's 4 and F20's 6
  half-year blocks give 6 and 20 splits, so their PBO values are coarse, often exactly 0 or 1):

| Fold | G4-ILF | G4-EWW | N3-EDV | N2-SMH | V3-IWM | N2-EDV | VG3-IWM |
|---|---:|---:|---:|---:|---:|---:|---:|
| F19 | 5/6 · 0.00 | 4/6 · 1.00 | 4/6 · 1.00 | 3/6 · 0.83 | 4/6 · 0.00 | 0/6 · 0.50 | 6/6 · 0.67 |
| F20 | 6/6 · 0.85 | 6/6 · 0.35 | 1/6 · 0.55 | 6/6 · 0.65 | 5/6 · 0.45 | 6/6 · 1.00 | 6/6 · 0.60 |
| F21 | 6/6 · 0.34 | 6/6 · 0.46 | 6/6 · 0.39 | 6/6 · 0.39 | 5/6 · 0.49 | 4/6 · 0.50 | 6/6 · 0.36 |
| F23 | 6/6 · 0.43 | 6/6 · 0.71 | 5/6 · 0.43 | 6/6 · 0.74 | 5/6 · 0.78 | 6/6 · 0.33 | 6/6 · 0.55 |
| F24 | 6/6 · 0.86 | 6/6 · 0.84 | 5/6 · 0.92 | 6/6 · 0.76 | 5/6 · 0.70 | 5/6 · 0.61 | 6/6 · 0.82 |

- **Overfitting probability is high on the primary fold:** PBO 0.61–0.92 on F24 for every track. Within each F24
  rung-2 set, the best in-sample half-year combination usually ranks below the median on the held-out half-years
  (within training). PBO exceeds 0.5 in 20 of Phase B's 35 track-folds (Study 8: 20 of 30); the training rank is a
  selection rule, not a forecast.
- **The two EDV pools on F19** (training through 2019) found no rung-1-feasible region; N2-EDV-F19's six members were
  infeasible on training and none qualified (empty F19 roles).
- **Controls on the F24 training door** (G4-EWW's confirmation labels; other tracks' labels give slightly different
  figures): Study 8 **VG #2 balanced** robust $26.6k/yr, share 98.4%, centre DD $17.3k, qualifies; VG #1 profit
  $29.2k/yr, 94.8%, qualifies; B1 $8.2k/yr, 100%, fails Q6 and Q8; B5 $19.7k/yr, 27.1%, fails Q2, Q2b, Q5, Q8.

## 2. Selection (Study 8's `assignRoles`, imported; training-only)

- **Role holders:** F19 22, F20 24, F21 31, F23 29, **F24 32** (every F24 role of every track filled; 3 empty roles on
  F19 and 2 on F20). Every F24 holder is in the "strong" tier (its confirmation robust profit ≥ B1's under the same
  labels, $7.8–8.2k/yr).
- **The sealed F24 training-only ranking** (the global ranking; confirmation families, 384 unique points each; robust =
  ½ median + ½ p10 per year, 2017-06-15 → 2024-12-31, y = 7.536):

| Rank | Track | Role | Robust/yr | Share (n = 384) | Wilson LB | p90 DD | Training band | VG #2 robust/yr, same labels |
|---:|---|---|---:|---:|---:|---:|---|---:|
| 1 | VG3-IWM | profit | $31,103 | 97.1% | 95.4% | $23,613 | preferred | $26,690 |
| 2 | G4-EWW | profit | $31,024 | 99.2% | 98.1% | $26,424 | preferred | $26,635 |
| 3 | G4-EWW | extra | $29,542 | 96.1% | 94.1% | $32,366 | preferred | $26,635 |
| 4 | G4-EWW | robust | $28,090 | 100.0% | 99.3% | $25,760 | preferred | $26,635 |
| 5 | G4-EWW | balanced | $27,931 | 99.2% | 98.1% | $25,987 | preferred | $26,635 |
| 6 | G4-EWW | extra | $27,061 | 99.0% | 97.7% | $26,449 | preferred | $26,635 |
| 7 | G4-ILF | profit | $26,480 | 95.6% | 93.5% | $34,000 | preferred | $26,990 |
| 8 | G4-ILF | balanced | $26,264 | 99.7% | 98.8% | $32,223 | preferred | $26,990 |
| 9 | VG3-IWM | balanced | $25,895 | 99.2% | 98.1% | $20,201 | preferred | $26,690 |
| 10 | VG3-IWM | extra | $24,836 | 94.5% | 92.3% | $30,202 | conditional | $26,690 |
| 11 | G4-ILF | extra | $24,529 | 93.8% | 91.4% | $32,256 | conditional | $26,990 |
| 12 | G4-ILF | extra | $21,618 | 97.7% | 96.0% | $30,736 | preferred | $26,990 |
| 13 | N2-SMH | extra | $19,441 | 97.9% | 96.3% | $30,141 | preferred | $26,975 |
| 14 | N2-SMH | profit | $19,340 | 100.0% | 99.3% | $31,317 | preferred | $26,975 |
| 15 | VG3-IWM | robust | $18,082 | 100.0% | 99.3% | $17,383 | preferred | $26,690 |
| 16 | VG3-IWM | extra | $18,058 | 100.0% | 99.3% | $18,047 | preferred | $26,690 |
| 17 | G4-ILF | robust | $16,659 | 100.0% | 99.3% | $29,328 | preferred | $26,990 |
| 18 | N2-SMH | balanced | $15,654 | 100.0% | 99.3% | $15,893 | preferred | $26,975 |
| 19 | N2-SMH | robust | $15,626 | 100.0% | 99.3% | $15,588 | preferred | $26,975 |
| 20 | N3-EDV | profit | $15,119 | 97.7% | 96.0% | $19,551 | preferred | $26,950 |
| 21 | N3-EDV | extra | $14,809 | 97.9% | 96.3% | $29,070 | preferred | $26,950 |
| 22 | N2-EDV | profit | $14,203 | 98.7% | 97.3% | $22,359 | preferred | $27,046 |
| 23 | V3-IWM | profit | $13,967 | 100.0% | 99.3% | $28,718 | preferred | $26,835 |
| 24 | N2-SMH | extra | $13,572 | 100.0% | 99.3% | $21,399 | preferred | $26,975 |
| 25 | V3-IWM | extra | $13,346 | 98.7% | 97.3% | $29,285 | preferred | $26,835 |
| 26 | V3-IWM | balanced | $13,234 | 98.7% | 97.3% | $17,790 | preferred | $26,835 |
| 27 | N2-EDV | balanced | $12,835 | 100.0% | 99.3% | $17,629 | preferred | $27,046 |
| 28 | N2-EDV | robust | $12,623 | 100.0% | 99.3% | $16,810 | preferred | $27,046 |
| 29 | N2-EDV | extra | $12,557 | 98.7% | 97.3% | $30,703 | preferred | $27,046 |
| 30 | V3-IWM | robust | $12,206 | 100.0% | 99.3% | $17,253 | preferred | $26,835 |
| 31 | N3-EDV | balanced | $11,807 | 100.0% | 99.3% | $16,235 | preferred | $26,950 |
| 32 | N3-EDV | robust | $9,783 | 100.0% | 99.3% | $16,303 | preferred | $26,950 |

- **Reading it (training only).** Joint optimization lifted most pools above their Phase A generic-vector screen:
  - VG3-IWM from $12.7k/yr (89% share, infeasible) to $31.1k/yr at 97.1%;
  - G4-EWW from $27.2k to $31.0k at 99.2%;
  - G4-ILF only marginally, from $25.9k (90.9%) to $26.5k at 95.6%;
  - the N and V pools from $9–10k to $14–19k.

  **Only the G4-EWW holders #2–#6 ($27.1–31.0k) and VG3-IWM #1 ($31.1k) exceed VG #2's training robust profit under
  the same labels** ($26.6k and $26.7k), by about $4.4k/yr for the top two. No G4-ILF holder does: its best, #7, has
  $26.5k against $27.0k. The N and V pools' best holders earn 52–72% of VG #2 in training: N2-SMH $19.4k (72%), N3-EDV
  $15.1k, N2-EDV $14.2k, V3-IWM $14.0k.

  These are in-sample optima with PBO 0.6–0.9; the one-time test decides
  persistence, and only vetoes.
- **The exploratory VG3-IWM track** ranks first. It was added by the user as an exploratory test of a generic-screen
  false negative, not as a Phase A nominee (PROTOCOL.md §1.2); its rank comes from the frozen rule, not from a choice.
- **Preference bands (training confirmation only; the user-preference band is the lower of this and the F24 test
  band, §9.2):** 30 of 32 F24 holders are in the preferred band (≥ 95%); #10 VG3-IWM extra (94.5%) and #11 G4-ILF extra
  (93.8%) are conditional. No F24 holder is marginal under Q2.
