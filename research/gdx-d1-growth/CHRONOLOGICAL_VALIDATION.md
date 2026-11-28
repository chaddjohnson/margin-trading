# Chronological validation (brief Phase 6; PROTOCOL §10–§12)

**Every window here is retrospective, previously examined history.** GDX 2016-01-04 → 2026-10-30 was examined by the
program before this study: N/original's and New L0's GDX D1 books were chosen with all of it in view, 4A optimized GDX
Growth on 2016–2024 and validated once on 2025–2026, and Appendix A was chosen in a browser with 2016–2026 in view (PROTOCOL
§2). The folds and the 2025–2026 validation test this study's *procedure* on later data. They are not a pristine holdout
and give no prospective evidence.

## 1. Design (frozen before any official evaluation)

| Fold | Training door (development through) | Next slice (evaluated once, after the fold's selection was sealed and committed) |
|---|---|---|
| C19 | D19 (2019-12-31; 1,006 sessions) | 2020-01-02 → 2021-12-31 (on D21) |
| C21 | D21 (2021-12-31; 1,511) | 2022-01-03 → 2023-12-29 (on D23) |
| C23 | D23 (2023-12-29; 2,012) | 2024-01-02 → 2024-12-31 (on D24) |
| C24 | D24 (2024-12-31; 2,264) | **validation** 2025-01-02 → 2026-10-30 (on FULL, once) |

Each slice is evaluated as **one continuous run from 2016-01-04**, with state, open lots and marks preserved across the
boundary. Slice P&L is the change of marked net from the boundary close. Slice DD is the strict minute tracker restarted at
the boundary close; the whole-run DD is reported beside it. The ceiling is **$35,000 marked drawdown = 35 % of the initial
$100,000 trading allocation** (a research criterion on historical paths, never an enforceable loss limit).

A population's **sequential procedure** is each fold's primary traded over its own next slice, chained 2020-01-02 →
2024-12-31, with a 5 bps charge per switched lot and an exact drawdown. It is **supported** iff every fold has a primary,
the chained net is > 0 and the chained DD is ≤ $35,000. Condition b of the outcome requires this for an independent
population's primary.

## 2. Fold primaries on their next slice

| Arm | C19 → 2020–2021: P&L / reset DD | C21 → 2022–2023 | C23 → 2024 |
|---|---|---|---|
| D | `C19/D/refine/D.A1/R103#1` **−$14,658.87 / $48,176.70 ✗** | `C21/D/refine/D.A0/R101#1` +$24,823.42 / $20,743.57 | `C23/D/refine/D.B1/R106#1` +$16,747.47 / $9,858.27 |
| G | `C19/G/refine/G.h1.s1/R106#1` **−$24,021.04 / $39,799.97 ✗** | `C21/G/refine/G.h2.s0/R101#1` **−$12,605.77 / $42,827.68 ✗** | `C23/G/refine/G.h2.s0/R104#1` $0 / $0 (no lot) |
| C | `DF3×GF1` **−$14,775.87 / $42,961.30 ✗** | `DF1×GF1` +$9,261.01 / **$42,452.21 ✗** | `DF1×GF1` +$16,747.47 / $9,858.27 |
| J | `J.B0.h1.s0/R102#1` +$13,600.97 / **$45,937.90 ✗** | `J.D1.h1.s0/R102#1` +$13,124.68 / **$44,709.23 ✗** | `J.A1.h0.s1/R106#1` $0 / $0 (no lot) |
| S | `S.C19F1.h1.s1/R103#1` +$26,270.60 / **$48,176.70 ✗** | `S.C21F1.h2.s1/R104#1` +$26,413.96 / $26,030.57 | `S.C23F1.h2.s0/R104#1` +$16,747.47 / $9,858.27 |

**35 % breaches, reported as such (brief Phase 6):** 8 of the 15 independent fold-primary slices breach the ceiling. These
are all five arms in 2020–2021, and G, C and J in 2022–2023. None breaches in 2024. The D-bearing breaches of 2020–2021 are
one lot, a maximum-hold D1·GDX lot entered 2020-03-05 and closed 2020-03-18 (worst mark −$44,743, exit −$19,933), inside
the March-2020 crash. The book (family A1: no protective stop, 13-day maximum hold) had shown the exposure in the
disjoint pre-2016 daily tail stress (worst −$42,205 on 2008-10-14; `reports/diagnostics/tail-stress.json`). That stress is a
report-only diagnostic that no selection used.

## 3. The sequential procedures (sealed `results/sequential.json`, commit `3f414d7d`)

| Procedure | Net 2020–2024 | DD | Worst DD | Verdict |
|---|---:|---:|---|---|
| D | $26,912.02 | $48,176.70 | inside 2020–2021 | **unsupported** |
| G | −$36,676.81 | $62,458.44 | 2021 → 2022 | **unsupported** |
| C | $11,182.61 | $52,064.96 | 2021 → 2022 | **unsupported** |
| J | $26,675.65 | $45,937.90 | 2019 → 2020 | **unsupported** |
| S | $69,432.03 | $48,176.70 | inside 2020–2021 | **unsupported** |
| D-A (report-only) | $80,437 | $36,931 | | unsupported |
| G-U (report-only) | $46,320 | $39,790 | | unsupported |
| J-U (report-only) | $44,145 | $75,470 | | unsupported |
| S-U (report-only) | $8,779 | $56,872 | | unsupported |

**No independent procedure is supported**, so no finalist can satisfy b. This was sealed before the D24 training door
opened, and so before any C24 selection or any look at 2025–2026. The descriptive role paths include one path under the
ceiling, G's robust-profit role ($21,009 / $25,960). It is descriptive only and never a nomination.

**Controls, labelled.** The external incumbents' paths over the same slices are mostly under the ceiling: N/original's GDX
D1 book alone (the ablation) earned $163,608.79 / $27,053.38, 4A's primary $139,668 / $17,484, and the J controls about
$173k–$194k / $27k. New L0's GDX D1 ($35,975) and VG #2's ($36,160) are not. **These are not an independent test:** every
incumbent was chosen with 2016–2026 in view, so its passing these slices is partly selection on them (PROTOCOL §2).

## 4. The validation: C24 → 2025-01-02 → 2026-10-30 on FULL, once

| Population | C24 primary | Development net / DD | Validation P&L | Validation reset DD | Whole-run DD | V1 V2 V3 |
|---|---|---:|---:|---:|---:|:---:|
| D | `C24/D/refine/D.D1/R103#1 profit` | $270,779.57 / $17,594.58 | **−$15,254.70** | $30,362.06 | $30,362.06 | ✗ ✓ ✓ |
| G | `C24/G/refine/G.h1.s1/R105#1 profit` | $161,456.75 / $17,744.39 | +$10,294.11 | $10,279.18 | $17,744.39 | ✓ ✓ ✓ |
| C | `C24/C/pair DF2×GF1` | $273,035.02 / $18,640.92 | +$5,210.41 | $27,397.97 | $27,397.97 | ✓ ✓ ✓ |
| J | `C24/J/refine/J.B1.h0.s0/R102#1 profit` | $230,410.14 / $20,510.18 | +$8,077.80 | **$60,065.70** | $60,065.70 | ✓ ✗ ✗ |
| S | `C24/S/refine/S.C24F1.h0.s0/R106#1 profit` | $336,819.26 / $28,007.62 | +$21,639.68 | **$59,791.70** | $59,791.70 | ✓ ✗ ✗ |
| D+ (informed) | = D's primary | | −$15,254.70 | $30,362.06 | $30,362.06 | ✗ ✓ ✓ |
| G+ (informed) | `C24/G/informed/G.h1.s1/R101#1 profit` | $178,522.74 / $16,154.78 | $0 (no lot) | $0 | $16,154.78 | ✗ ✓ ✓ |
| C+ (informed) | `C24/C+/pair D+F1×G+F2` | $297,262.28 / $17,976.68 | −$15,254.70 | $30,362.06 | $30,362.06 | ✗ ✓ ✓ |

**Two of the five independent primaries breach the ceiling in 2025–2026: J ($60,066) and S ($59,792).** Their validation
neighbourhoods breach in 100 % and 64.5 % of draws, so the breach belongs to the region, not only to the centre.

**Context for 2025–2026.** GDX more than doubled: a fresh $100,000 bought on 2025-01-02 was +$123,597 by 2026-10-30
unfinanced (+$103,526 at 11 %), with a $136,496 drawdown from its peak on the way (`reports/diagnostics/buy-and-hold.json`).
The D1 books, which buy declines, found no entry in 2025. The D primary's only validation trades came in 2026 and lost.
Over the same window N/original earned $94,670 and its GDX D1 book alone +$25,648. These benchmarks were chosen with this
window in view.

The validation was evaluated once: job `C24-validation`, 13,300 evaluations (the 50 rows' centres, stresses and 256-draw
validation neighbourhoods), 38 s on the accepted GPU, attested.

## 5. Data-door timeline (`results/doors.jsonl`; all times UTC)

| Event | Time | Record |
|---|---|---|
| FULL opened for **data integrity, equality only** (E2: this study's GDX door = the GDX slot of N/original's own door; E3: N/original / New L0 known-target reproduction and the ablation identity) | 2026-11-26T15:22:18Z – 15:23:18Z | 12 door entries; engineering gates (`results/engineering/E2-data.json`, `E3-references.json`) |
| D19, D21, D23, D24 opened by the engineering gates for CPU/GPU parity, determinism and identities (equality only) | 2026-11-26T15:22:12Z – 15:52:06Z (99 entries) | E3–E6 |
| **Protocol frozen** | 2026-11-26T16:03:15Z | commit `2bd8153d` |
| First official job (C19 D broad) | 2026-11-26T16:03:35Z | attestation 16/16 |
| C19 selection sealed → D21 opened for the C19 slice | 18:47:34Z → 18:47:36.9Z | `8fc8fa04` → `ac2b03b3` |
| C21 selection sealed → D23 opened for the C21 slice | 22:17:29Z → 22:17:33.4Z | `e3ce300e` → `9e970406` |
| C23 selection sealed → D24 opened for the C23 slice | 2026-11-27T02:33:32Z → 02:33:37.4Z | `71ebfe98` → `ed77809c` |
| Sequential verdicts sealed, before D24 training | 02:34:06Z | `3f414d7d` |
| C24 selection sealed | 07:02:01Z | `bd39995c` |
| FROZEN_SELECTION.json sealed; FULL door authorized | 07:02:02Z | `1ce56feb`, `76393753` |
| **FULL opened for the validation (the first post-freeze FULL read)** | 07:02:08.8Z | `f100a147` (07:02:42Z) |
| Outcome sealed | 07:02:43Z | `4615a33b` |
| FULL opened report-only for the portfolio stage and the diagnostics | 07:11:42Z onwards | after the sealed outcome |

**Disclosure: GDX's FULL file was opened before the freeze, for equality checks only.** P6-TSLA's study symbol's FULL file
was first opened by its validation. Here GDX's FULL door was read pre-freeze by the data-integrity gates E2 and E3. Both
compare records for bit equality: the study's GDX door against N/original's own door, and the reproduction of N/original's
sealed FULL figures. **No box, threshold, budget, cell or rule was derived from any GDX profit or drawdown** (PROTOCOL §2,
"real-data exposure before this freeze"). GDX's 2025–2026 path was in any case known to the program from earlier studies.
The pre-freeze engineering reads of D19–D24 are likewise equality-only parity evidence.
