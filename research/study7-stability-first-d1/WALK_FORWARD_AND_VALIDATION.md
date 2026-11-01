# Walk-forward and validation

## Sources

- `results/phaseB/<track>/<fold>/search.json`: each fold's own optimizer, run on its training door.
- `results/phaseD/<track>/<fold>/validation.json`: the fold's evidence, using confirmation seed families never seen
  by any search.
- `FROZEN_SELECTION.json`, sealed 2026-11-01T01:24:05Z.
- `results/tables/phaseD-*.md`.

## Ground rules

- **The whole program is retrospective.** Every period through 2026-10-29 was seen before this study.
- **Nested folds are a procedural overfit check, not independent market histories.** Each fold ran its own optimizer
  and sealed its shortlist from its training window alone.
- **Test doors stayed closed until every search of every fold was sealed** (gate G1, `gates.ts`).

## 1. Outer folds

| Fold | Training (search door) | Out-of-fold window | Role |
|---|---|---|---|
| F19 | 2017-06-15 → 2019-12-31 (y = 2.54) | 2020–2021 | procedure evidence |
| F20 | → 2020-12-31 (y = 3.55) | 2021-01-01 → 2022-12-30 | procedure evidence |
| M | → 2021-12-31 (DEV, y = 4.55) | 2022–2023 (VAL) | Class M nominations |
| L | → 2023-12-29 (y = 6.54) | 2024-01-02 → 2026-10-29, final door only, block-only | Class L nominations |

**Gates.** Qualification (Q1–Q8, E1–E3; PROTOCOL.md §11.1) is measured on the continuous run to the fold's
evaluation end. The decisive set is three confirmation families of 128 points each, pooled to about 384 unique points.

## 2. What each fold's optimizer chose, and what happened out of fold

| Track | Fold | Qualified / shortlist | Most frequent failures | Shortlist median, test-window centre net | Shortlist median, test-window neighbourhood median | Confirmation share (median of shortlist) | PBO (CSCV, half-years) | ρ(training robust profit, test median) |
|---|---|---|---|---:|---:|---:|---:|---:|
| G | F19 | 0 / 6 | Q1, Q2, Q2b, Q7 (3); Q6 (3) | $37,086 | $39,172 | 0.50 | 0.76 | −0.77 |
| G | F20 | 0 / 6 | Q1, Q2, Q3, Q7 (6) | −$929 | −$3,780 | 0.00 | 0.43 | −0.89 |
| G | **M** | **0 / 6** | Q1, Q2, Q2b, Q7 (6); Q3 (3) | $126 | $3,166 | 0.03 | 0.83 | 0.09 |
| G | L | 4 / 6 (in-sample) | Q2b (2) | — | — | 1.00 | 0.29 | — |
| VG | F19 | 0 / 6 | Q2, Q2b (6); Q1, Q7 (5) | $9,651 | $13,049 | 0.31 | 0.73 | 0.20 |
| VG | F20 | 0 / 6 | Q2, Q2b, Q3 (6) | −$23,808 | −$10,381 | 0.07 | 0.71 | −0.09 |
| VG | **M** | **0 / 6** | Q2, Q2b (5); Q3 (3) | $2,703 | $5,056 | 0.63 | 0.63 | −0.77 |
| VG | L | 6 / 6 (in-sample) | — | — | — | 0.99 | 0.79 | — |
| VXR | F19 | 0 / 6 | Q2, Q2b (6); Q1, Q7 (5) | $15,534 | $13,504 | 0.23 | 0.23 | −0.66 |
| VXR | F20 | 0 / 6 | Q1, Q2, Q3, Q7 (6) | −$7,289 | −$16,766 | 0.06 | 0.71 | 0.20 |
| VXR | **M** | **0 / 6** | Q1, Q2, Q2b, Q7 (6); Q3 (4) | −$6,795 | −$11,722 | 0.01 | 0.45 | 0.14 |
| VXR | L | 4 / 6 (in-sample) | Q8 (2) | — | — | 1.00 | 0.83 | — |
| VXRG | F19 | 0 / 4 | Q2, Q2b, Q6, Q7 (4) | $58,832 | $43,066 | 0.21 | 0.83 | 0.40 |
| VXRG | F20 | 0 / 4 | Q2, Q2b, Q3, Q4 (4) | −$18,560 | −$28,986 | 0.02 | 0.69 | −1.00 |
| VXRG | **M** | **0 / 4** | Q2, Q2b (4); Q1, Q7 (3) | −$12,754 | −$836 | 0.07 | 0.34 | 0.40 |
| VXRG | L | 4 / 4 (in-sample) | — | — | — | 1.00 | 0.69 | — |

Readings:

1. **The main chronological test fails completely.** Fold M trains on DEV and validates on 2022–2023. None of its 22
   shortlisted candidates qualifies:
   - 21 fail Q2, the 90% neighbourhood gate on the run to 2023-12-29, with pooled shares of 0–0.65 against 1.00 on
     DEV;
   - most of those also breach $35,000 at their own centre (Q1);
   - the 22nd (VG `d1-fd7e60d5fe`, share 0.987) is a low-profit vector that fails Q3, Q4 and E3;
   - the shortlists' test-window medians are about zero or negative;
   - **no Class M role could be filled.**

   This is H1/H3's predicted failure: DEV contains no market like the 2022 bear (GDX −46%, XBI and XRT re-entries),
   so a DEV-only stability-first search cannot see it.
2. **The earlier folds agree.**
   - **F20:** every candidate fails, with negative test medians in 2021–2022.
   - **F19:** candidates fail too, although the 2020–2021 test window was profitable (the March 2020 rebound). The
     shortlists were too risky in the 2020 crash itself: centre DDs of $34k–$46k.
   - **Ranking:** training robust profit does **not** rank out-of-fold results. ρ ranges from −1.00 to +0.40 across
     folds, with no consistent sign.
   - **Overfitting:** PBO is 0.23–0.83, so roughly half or more of the CSCV splits pick an out-of-sample loser.
3. **Fold L qualifies 18 candidates — in-sample.** Its training window includes 2022–2023, so the optimizer could
   avoid the failure mode, and its qualification evidence lies in the same window. The only out-of-fold evidence for
   fold L is the block-only final door on the exposed 2024–2026 window (§4).

### Controls on the same windows (Q-gate quantities; the frozen books are in-sample on every window ≤ 2023)

| Fold (test window) | B1 test net / pooled share | Frozen VG | Frozen VXR | Frozen VXRG | GDX `portfolioAware` |
|---|---|---|---|---|---|
| F19 (2020–21) | $77,253 / 1.00 | $67,885 / 0.99 | $88,091 / 0.99 | $130,396 / 0.98 | $103,648 / 0.99 |
| F20 (2021–22) | $24,102 / 1.00 | $54,203 / 0.76 | $51,920 / 0.94 | $87,038 / 0.66 | $12,110 / 0.23 |
| M (2022–23) | $22,145 / 1.00 | $79,419 / 0.76 | $61,956 / 0.95 | $124,933 / 0.66 | $39,282 / 0.19 |

The frozen subsets beat every fold-M candidate on VAL by $55k–$140k. They were selected with 2017–2023 data, so on VAL
they are in-sample and the comparison is biased in their favour. It shows that DEV-only selection loses the 2022–2023
information that the frozen books embed. It does not show that the frozen books have out-of-sample skill.

## 3. Statistical precision near the gate

The decisive pooled sets have n = 383–384 unique points, and 88 shortlisted candidates were tested at Q2. Margins,
not noise, decide every outcome except two:

- **Q2 failures in F19/F20/M (62 of 66):** every failing share is ≤ 0.747, more than 5 standard errors below 0.90.
- **Q2 passes in F19/F20/M (4 of 66), all failing other gates:**
  - three G-F19 members (1.000): they fail Q6, a single lot above 25% of net;
  - one VG-M member (0.987): it fails Q3, Q4 and E3.
- **The two candidates near the boundary** are both in G-L:
  - `d1-37afcc4bf8`: 0.904, Wilson lower bound below 0.90;
  - `d1-e174aa43b7`: 0.927.

  Both have a coordinate within r of a bound and failed Q2b (in-box). They were not qualified.
- **The 18 fold-L qualifiers** have pooled shares of 0.958–1.000 and one-sided 95% Wilson lower bounds of
  0.938–0.993. The lowest are two VG-L members at 0.958 (bound 0.938).
- **False passes:** the expected number of false passes at the boundary among these tests is ≈ 0.

## 4. Independent confirmation and the final door

- **Seed families.** Search used r1/r2/r3/refine, shortlisting used select 1–2, qualification used confirm 1–3 (plus
  alternates), and the final door uses final 1–3 (plus alternates). All are distinct, fixed in PROTOCOL.md §5.3, and
  never chosen by their results.
- **Final door.** It opened once, after `FROZEN_SELECTION.json`, for the 12 Class L role holders, the 40 fold-M/L
  shortlist members (centre only) and the 15 controls. See `NEIGHBORHOOD_ROBUSTNESS.md` and `RECOMMENDATION.md` for
  its flags.
- **Rules.** The final door only flags F1–F4 (block-only, §11.3). The ranking was sealed before it opened, from
  figures ending 2023-12-29.

## 5. Anti-overfit and multiple-testing notes

- 137,859 configurations were scored at rung 1 across 18 track-fold searches, and 96 were shortlisted.
- The Class L role holders are the best training-side picks of a 6.5-year in-sample window. With PBO 0.29–0.83 on
  that window, they carry selection bias even though their neighbourhoods are robust **within** it.
- Training-side neighbourhood figures replicate across independent seed families: rung 3, then selection, then
  confirmation (`OPTIMIZATION_AND_COMPUTE.md` §3). The overfitting is to the **calendar path**, not to the perturbation
  sample. Earlier studies found the same; this study measures it with neighbourhood fitness active from the start.
- **Nothing was re-tuned, re-searched or re-selected after any test or final result.** No extra validation look was
  taken.
