# OUTCOME_RECONCILIATION — P6-TSLA outcome, sealed (label join) versus corrected (identity join)

**Report-only engineering replay. Not a sealed record. It does not replace `research/tsla-d1-growth/results/outcome.json`,
which stays the historical record the precommitted code produced (disclosure D1).**

- **Output:** `docs/engineering/tsla-outcome-identity-fix/replay/outcome.corrected.report-only.json`, sha256
  `6b923ff290b6ccc6576aeb32c22272ea19449b1ad2929684cfe4899d98ed86c6`. A fresh process reproduces it byte for byte; so does
  a clean clone of the fix commit (`TEST_REPORT.md` §4).
- **Producer:** `tools/tsla-outcome-identity-fix/replay.ts`. It applies the corrected `outcomeOf` to the **sealed**
  `preDetermination` (`FROZEN_SELECTION.json`) and the **sealed** validation rows. It evaluates nothing, opens no data
  door, and refuses to write under `research/`.
- **Inputs:** each one is checked against its pinned sha256 before it is used.

  | Input | sha256 |
  |---|---|
  | `research/tsla-d1-growth/FROZEN_SELECTION.json` | `0ebb6b62ad95b1bdb9b6fb14a4a50f38ddceb49ba86b045d3cd34ef53e1a8791` |
  | `research/tsla-d1-growth/results/validation/validation.json` | `b0f654009960fbaca6debdb0a803885083d2a5428e206ff3234b647e126ff63f` |
  | `research/tsla-d1-growth/results/sequential.json` | `2a1079a0a9d1e6dea4cd9d809e1a0413794ccc41152a02a975105c7210f28ce8` |
  | `research/tsla-d1-growth/results/outcome.json` (sealed outcome, compared only) | `a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79` |
  | `research/tsla-d1-growth/reports/tables/outcome-join.json` (D1 reconstruction, compared only) | `df18bd93e85f145419ab83342707e9de51025f7f2c741cda186870c144ca0cb2` |

## 1. The determination

| | Sealed `results/outcome.json` (label join) | Corrected replay (identity join) |
|---|---|---|
| Finalists with `validation: null` | **17 of 17** | 0 of 17 |
| Candidates | none | none (**unchanged**) |
| Development-only | none (the join was empty) | **G** `C24/G/refine/G.h2.s1/R101#1 profit` (`d375f8105c15ad72`); **C** `C24/C/pair DF1×GF3` (`rc1-99c7a25e9144531e`) |
| Verdict | NO QUALIFYING TSLA CANDIDATE | **NO QUALIFYING TSLA CANDIDATE** (the sealed text is the exact prefix of the corrected text) |

The corrected outcome text is:

> NO QUALIFYING TSLA CANDIDATE: no arm primary is development-qualified AND chronologically supported AND passes V1–V3;
> development-qualified without chronological support (not deployment-qualified without an explicit user decision):
> G C24/G/refine/G.h2.s1/R101#1 profit; C C24/C/pair DF1×GF3

It is identical, character for character, to the `determination` of the report-only D1 reconstruction
(`reports/tables/outcome-join.json`) and to the corrected label written in `AMENDMENTS.md` D1.

## 2. Why the verdict could not change

Criterion (b) requires a primary whose arm has a *supported* independent chronological verdict. `results/sequential.json`
records the verdict **unsupported** for all five architectures. In every case the fold drawdown exceeds the $35,000
ceiling:

| Arm | Sequential net | Sequential drawdown | Supported |
|---|---:|---:|---|
| D | $25,172.11 | $40,169.52 | no |
| G | $42,946.62 | $36,078.92 | no |
| C | $26,588.76 | $61,092.43 | no |
| J | $99,580.95 | $67,635.07 | no |
| S | $84,304.82 | $82,546.54 | no |

`candidate = a ∧ b ∧ c` is therefore false for every finalist, whatever the validation join returns. The defect could only
empty the *development-only* list (`a ∧ primary ∧ ¬b ∧ c`), and that is exactly what it did.

## 3. Every finalist, joined by (arm, id)

- **(a)** Q1–Q6 at C24. **(b)** Primary with a supported chronological verdict. **c** V1 ∧ V2 ∧ V3.
- V1–V3 are P (pass) or F (fail), as sealed per row in `validation.json`.
- The money columns are the sealed validation figures: validation P&L, reset validation drawdown, and whole-run drawdown.
- Every one of the 17 finalists in the sealed outcome had validation = null, c = no and dev-only = no.

| # | Arm | Role(s) | Finalist id | Candidate label | (a) | (b) | Corrected V1 / V2 / V3 | c | Candidate | Dev-only | Validation P&L | Reset DD | Whole-run DD |
|---:|---|---|---|---|---|---|---|---|---|---|---:|---:|---:|
| 1 | D | primary D | `rc1-f00a493c6989369c` | `C24/D/refine/D.B1/R103#1 profit` | yes | no | F / P / P | no | no | no | −8,978.57 | 13,923.62 | 27,742.34 |
| 2 | D | D/robust-profit | `rc1-04e818dc2da0f0c5` | `C24/D/refine/D.C1/R103#2 robust` | yes | no | F / P / P | no | no | no | −16,973.99 | 27,237.18 | 27,237.18 |
| 3 | D | D/balanced | `rc1-3699da64e5c37f84` | `C24/D/refine/D.C1/R102#2 robust` | yes | no | F / P / P | no | no | no | −15,883.65 | 25,829.51 | 25,829.51 |
| 4 | D | D/lower-drawdown | `rc2-d3ea1b93dcfdb6aa` | `C24/D/refine/D.B1/R101#6 profit order` | yes | no | F / P / P | no | no | no | −6,544.39 | 6,623.53 | 13,189.33 |
| 5 | G | **primary G** | `d375f8105c15ad72` | `C24/G/refine/G.h2.s1/R101#1 profit` | yes | no | P / P / P | yes | no | **yes** | 10,702.95 | 18,255.00 | 28,655.41 |
| 6 | G | G/robust-profit | `51d3061568fd995b` | `C24/G/refine/G.h2.s1/R102#2 robust` | yes | no | P / P / P | yes | no | no (role holder) | 8,444.86 | 19,498.78 | 28,655.41 |
| 7 | G | G/balanced | `e1226bf45c9ef230` | `C24/G/refine/G.h2.s1/R101#3 balanced` | yes | no | P / P / P | yes | no | no (role holder) | 9,049.62 | 19,908.33 | 28,655.41 |
| 8 | G | G/lower-drawdown | `5ea4e2c1d6ac0f47` | `C24/G/refine/G.h0.s1/R103#6 profit order` | yes | no | P / P / P | yes | no | no (role holder) | 3,668.93 | 15,813.71 | 25,375.45 |
| 9 | C | **primary C**, C/robust-profit, C/balanced, C/lower-drawdown | `rc1-99c7a25e9144531e` | `C24/C/pair DF1×GF3` | yes | no | P / P / P | yes | no | **yes** | 71.05 | 25,953.17 | 26,287.97 |
| 10 | J | primary J | `rc2-70a7fb69bdc928fb` | `C24/J/refine/J.B1.h2.s1/R104#1 profit` | yes | no | F / P / P | no | no | no | −10,750.75 | 29,252.99 | 29,252.99 |
| 11 | J | J/robust-profit | `rc1-6c96293115dd8261` | `C24/J/refine/J.B1.h2.s1/R103#2 robust` | yes | no | F / P / F | no | no | no | −25,034.98 | 28,923.42 | 42,923.40 |
| 12 | J | J/balanced | `rc2-daa883f0f39a042e` | `C24/J/refine/J.B1.h2.s1/R101#3 balanced` | yes | no | F / P / P | no | no | no | −915.09 | 22,765.48 | 29,746.04 |
| 13 | J | J/lower-drawdown | `rc1-3e2490707853af5e` | `C24/J/refine/J.D1.h1.s1/R102#2 balanced` | yes | no | F / P / P | no | no | no | −3,902.12 | 13,260.41 | 17,334.87 |
| 14 | S | primary S | `rc1-fb65b443dc62e31b` | `C24/S/refine/S.C24F1.h1.s1/R101#1 profit` | yes | no | F / P / P | no | no | no | −2,411.85 | 26,869.48 | 26,869.48 |
| 15 | S | S/robust-profit | `rc1-dc4d194f34160658` | `C24/S/refine/S.C24F3.h0.s1/R102#2 robust` | yes | no | F / P / P | no | no | no | −4,418.30 | 26,438.30 | 28,466.47 |
| 16 | S | S/balanced | `rc1-d5c6c8799e284d02` | `C24/S/refine/S.C24F3.h0.s1/R101#3 balanced` | yes | no | F / P / P | no | no | no | −2,049.13 | 15,996.29 | 21,030.69 |
| 17 | S | S/lower-drawdown | `rc1-a0137c369e159e72` | `C24/S/broad/S.C24F3.h2.s1/R101#2 Growth gate alternative` | yes | no | F / P / P | no | no | no | −19,939.87 | 29,885.73 | 29,885.73 |

- **G and C primaries** are development-qualified (a). They have no chronological support (¬b) and pass V1–V3, so they
  are *development-qualified without chronological support: not deployment-qualified without an explicit user decision*
  (`DECISION_REGISTER.md` U5 of the study).
- **The D, J and S primaries fail V1**: their validation P&L is ≤ 0.
- **Role holders** are descriptive, never nominees. This holds even when they pass V1–V3 (rows 6–8).
- **Arm C:** one identity holds four roles (primary and three role holders). It is one finalist, joined to one validation
  row and listed once.

## 4. Identity accounting

- **Finalists:** 17, unique by (arm, id). Each matched exactly one `kind: selected` validation row, and 17 distinct rows
  were consumed. Every finalist's (arm, id, candidate label) equals the `finalists` list of `FROZEN_SELECTION.json`.
- **Roles:** every finalist role is carried by its matched row (`primary X` ↔ `primary X/original`; `role X/r` ↔
  `role X/r`). The validation row of arm G's primary also carries the G-P sub-population's roles. That is one row and one
  identity, joined once.
- **Selected rows that no finalist claims:** 11. These are the sub-populations' (G-U, J-U, S-U) primaries and role
  holders. They are report-only and never finalists (PROTOCOL §12):

  | Arm | Row id | Roles |
  |---|---|---|
  | G | `354a1525266f17ca` | primary G-U/original, role G-U/actual-profit, role G-U/balanced |
  | J | `rc1-790aa818db22fe25` | primary J-U/original, role J-U/actual-profit |
  | S | `rc1-34cb7880892d877b` | primary S-U/original, role S-U/actual-profit |
  | G | `5aca3b6cf57ee932` | role G-U/robust-profit |
  | G | `c25b397582c40dfb` | role G-U/lower-drawdown |
  | J | `rc1-d8a12f6fa108a947` | role J-U/robust-profit |
  | J | `rc1-3b65a8b682df6c35` | role J-U/balanced |
  | J | `rc1-5731c5f4b60a34b5` | role J-U/lower-drawdown |
  | S | `rc1-da58344c54901b99` | role S-U/robust-profit |
  | S | `rc1-29584eafea595aef` | role S-U/balanced |
  | S | `rc1-5a6d6d6a7cd133e4` | role S-U/lower-drawdown |

- **Control rows excluded from the join (`kind: control`):** 6. These are New L0 and N/original on TSLA, in arms D, G
  and J.

## 5. The replay's cross-checks (all 18 pass)

| # | Check | Result |
|---:|---|---|
| 1 | The sealed outcome names the pinned frozen-selection and validation records | pass |
| 2 | Defect reproduced: the label join matches no validation row for any of the 17 finalists | pass |
| 3 | Defect reproduced: the sealed outcome has validation null and c false everywhere, and an empty development-only list | pass |
| 4 | The chronology gate failed for all five architectures | pass |
| 5 | Every finalist matches exactly one selected row by (arm, id); 17 distinct rows | pass |
| 6 | Finalist identities equal `FROZEN_SELECTION.json` finalists (arm, id, candidate label) | pass |
| 7 | Roles agree (one identity, several roles → one row) | pass |
| 8 | Per finalist, V1–V3, c, candidate and dev-only equal `outcome-join.json` | pass |
| 9 | Candidate and dev-only lists equal `outcome-join.json` | pass |
| 10 | The determination text equals `outcome-join.json` | pass |
| 11 | Only validation-dependent fields differ from the sealed outcome | pass |
| 12 | The architecture comparisons equal the sealed outcome's | pass |
| 13 | The candidate list is unchanged (empty) | pass |
| 14 | The verdict is unchanged (the sealed text is the prefix of the corrected text) | pass |
| 15 | G and C primaries: development-only | pass |
| 16 | D, J and S primaries fail V1 | pass |
| 17 | The D1 figures (G +$10,702.95 / $18,255.00 / $28,655.41; C +$71.05 / $25,953.17 / $26,287.97) | pass |
| 18 | Reversing the finalists and the rows changes no classification, list or verdict | pass |

Check 11 means that the fields `label` (the governance label), `a`, `b`, `primary`, `roles`, `chronology` and every
development metric equal the sealed outcome. Only `validation`, `c`, `candidate`, `developmentOnly` and the new
`candidateLabel` differ.
