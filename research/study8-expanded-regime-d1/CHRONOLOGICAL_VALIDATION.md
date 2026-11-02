# Study 8 — chronological validation (one-time test doors)

The five test records are `results/test/<FOLD>/test.json`, chain entries 8–12; F24's deterministic confirmation is
entry 13. Tables are generated in `results/tables/test-*.md`, `folds-*.md` and `F24-*.md`.

**What these runs are:**
- Every test is one continuous causal run from the close of 2016-01-04 to the fold's test end, with nothing reset at
  the cutoff.
- The shortlists, roles, ranks and every rule were sealed before any test door opened, and the doors opened once each,
  in the order F19 → F20 → F21 → F23 → F24.
- Test results only **vetoed**: no candidate was re-ranked, replaced or rescued.

**Status of the evidence.** All of 2016-01-04 → 2026-10-29 was inspected before Study 8. The 2025-01-02 → 2026-10-29
window is an algorithmically closed door on previously inspected history: a retrospective chronological test, **not**
an untouched holdout. The folds are procedural diagnostics on overlapping, previously inspected windows, not
independent trials.

## 1. Fold by fold (every shortlist member and role holder evaluated; `folds-persistence.md`)

| Fold | Training → | Test window | yTest | Holders not failed | Members not failed | Members with run DD ≥ $35k | Median member test-window net | Gates that failed most (members) |
|---|---|---|---:|---:|---:|---:|---:|---|
| F19 | 2019-12-31 | 2020-01-02 → 2021-12-31 | 2.00 | **0/19** | 0/36 | 29/36 | $3,579 | T2 36, T2b 34, T3 32, T4 30, T1 29 |
| F20 | 2020-12-31 | 2021-01-04 → 2022-12-30 | 2.00 | **0/27** | 0/36 | 32/36 | −$19,009 | T3 36, T4 35, T2 33, T2b 33, T1 32, T5 29 |
| F21 | 2021-12-31 | 2022-01-03 → 2023-12-29 | 1.99 | **0/28** | 0/36 | 30/36 | −$11,621 | T2 36, T3 35, T2b 35, T4 34, T1 30 |
| F23 | 2023-12-29 | 2024-01-02 → 2024-12-31 | 1.00 | **1/26** | 1/36 | 0/36 | $0 | T3 34, T4 30, T6 28 |
| **F24** | 2024-12-31 | **2025-01-02 → 2026-10-29** | 1.82 | **18/26** | 22/36 | 1/36 | $42,681 | T2 5, T3 5, T2b 4, T4 4, T5 3 |

**Study 7-equivalent gates** (Study 7's Q/E gates on the run to the test end, report-only), members passing: F19 0/36,
F20 0/36, F21 0/36, F23 2/36, F24 23/36. The `insufficient evidence` rule was not triggered for any fold: every fold
has role holders, and their new test-window lots total ≥ 3.

**Reading it:**
- **Every candidate failed on test windows containing a drawdown regime absent from its training.**
  - F19 was trained without the 2020 crash. F20 and F21 were trained without the 2022 bear market (and, for F21, the
    2022 GDX path).
  - In each, 29–32 of 36 members breached the $35,000 minute-drawdown ceiling on the run through the test window
    (median run DD $44k–$55k). They lost money in the test window (median −$19k on F20, −$12k on F21).
  - **Detail:**
    - Not every failure is that regime's drawdown: 4 of 19 F19 holders' worst drawdowns bottomed in 2021, and 3 F21
      holders' in 2023, all at or above $35k.
    - Some holders failed only on other gates (2 in F19, 2 in F20, 5 in F21).
  - **Hypothesis H1 is supported, descriptively**, as in Study 7. Three overlapping, previously inspected folds are
    procedural diagnostics, not a causal test.
- **Once training contained both 2020 and 2022, drawdown control persisted.**
  - On F23 and F24, 0 and 1 of 36 members breached the ceiling.
  - On F23 most candidates failed on **economics, not risk**. 2024 was nearly empty for D1: frozen B1 made $0,
    frozen VXR $0, and so did the median member. So T3 (net ≥ $10k × yTest) and T6 (≥ 2 new lots) failed for most.
  - 4 of 26 F23 holders did earn at least $10k at the centre: #1 VXRG $29,009, #3 $28,938, #10 VG $25,260 (the one
    pass) and #11 G $25,874. #1 and #3 failed T3 on a $0 neighbourhood median; #11 failed T2b.
  - On F24, 2025–2026 was a rich window for D1 generally (below), and 18 of 26 holders passed.
- **Hypothesis H2** ("broader training persists better") is **consistent with the data but not established.**
  - It rests on two test windows (2024, 2025–26). Neither contained a drawdown regime as severe and as new as 2020 or
    2022 were for F19–F21.
  - The persistence rates are confounded with test-window length, regime and opportunity.
  - The comparison is descriptive (PROTOCOL.md §1.1); no threshold for "materially improves" was set.
- **Hypothesis H3** (no five-book configuration passes the full 40-D gate) is **not supported**.
  NEIGHBORHOOD_ROBUSTNESS.md §2 item 7 gives the figures: VXRKG #8, #9, #10 and #14 pass T2 at 95–99.5% in the full
  40-D design on F24.

## 2. The primary one-time evaluation (F24: trained 2016–2024, tested 2025-01-02 → 2026-10-29)

**Mechanical result: outcome class _qualified_.**
- 18 research nominations (16 pass, 2 ambiguous) among 26 role holders, in the sealed training order.
- **Primary nominee: #1 VG profit** (`VGT:d1-f41ebcd961` + `GDX:d1-016d8e4257`).

**F24 holders** (excerpt; full table `results/tables/test-F24-holders.md`):

| Rank | Track / role | T status | Run net | Test net | 2025 | 2026 YTD | New lots | Run minute DD | Test share (n) | Test median |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | VG profit | PASS | $308,742 | $64,166 | $50,865 | $13,302 | 16 | $31,225 | 93.2% (384) | $67,359 |
| 2 | VG balanced | PASS | $340,148 | $79,925 | $47,239 | $32,685 | 12 | $21,304 | 98.2% (384) | $72,213 |
| 3 | VXRG profit | PASS | $252,513 | $65,312 | $39,122 | $26,190 | 12 | $21,192 | 95.8% (384) | $53,627 |
| 4 | VXRG balanced | FAIL (T1,T2,T2b,T3,T4) | $258,457 | $921 | −$18,014 | $18,935 | 10 | $37,722 | 21.1% (384) | $22,252 |
| 8 | VXRKG profit | PASS | $258,886 | $34,414 | $22,698 | $11,716 | 10 | $25,616 | 99.0% (384) | $33,980 |
| 12 | G profit | AMBIGUOUS | $190,647 | $31,441 | $0 | $31,441 | 13 | $30,359 | 91.9% (384) | $29,840 |
| 15 | VXR profit | PASS | $234,146 | $67,745 | $28,562 | $39,183 | 5 | $22,020 | 99.2% (384) | $60,026 |
| 25 | V robust | PASS | $174,488 | $41,715 | $43,934 | −$2,219 | 4 | $21,330 | 97.1% (384) | $42,808 |

**Failures:**
- #4 VXRG balanced: a test-window drawdown of $36.9k.
- #16 and #20 VXR, and #22 G robust: test-window net below $10k × 1.82 (T3).
- #18 VXRKG extra: in-box share (T2b).
- #19 G balanced: a test-window loss (T3, T4).
- #23 V profit: share and top-lot concentration (T2, T5).
- #24 V balanced: top-lot concentration (T5).

## 3. The window was favourable for everything: the comparison with controls

Same run and test sets (`test-F24-controls.md`):

| Configuration | Status vs the T gates | Test-window net (2025-01-02 → 2026-10-29) | Run minute DD | Test share < $35k |
|---|---|---:|---:|---:|
| B1 (VGT `primary`, frozen) | fail (T5: concentration) | $40,901 | $19,534 | 100.0% |
| Frozen VG | fail (T2, T2b) | $70,420 | $25,774 | 71.9% |
| Frozen VXRG / **B5** | fail (T2, T2b) | $71,986 / **$71,986** | $25,774 / $26,510 | 65.1% / 29.2% |
| G-PA (GDX `portfolioAware`) | fail (T2, T2b, T4) | $29,518 | $34,134 | 15.4% |
| Study 7 #1 / #2 / #5 / #6 (trained through 2023) | **pass** | $60,074 / $57,593 / $42,740 / $67,043 | $28,297 / $26,018 / $21,020 / $26,104 | 96.9–100% |
| Study 7 #7 / #10 / #11 (GDX) | fail (T3) | $11,112 / $6,853 / $7,442 | ≤ $18,333 | 100% |

**Interpretation:**
- **Profit in the window was not distinctive.**
  - 2025–2026 paid D1 broadly: frozen B5 made $72.0k, B1 $40.9k, and 96% of the training-qualified members (and all
    the non-qualified ones) had a positive test window.
  - The Study 8 nominees' test-window profit ($19.5k–$83.8k) is of the same order as B5's. Paired block bootstraps of the
    daily test-window P&L put #1 at −$7,820 against B5 (5–95%: −$35.6k to +$19.0k; 33% of resamples above 0) and
    +$23,265 against B1 (80% above 0).
- **What persisted is neighbourhood robustness.** It is the property the selection optimized.
  - On the run through 2026-10-29, 91.9–100% of the nominees' 384 fresh test-family neighbours stayed below $35k.
  - Under the same sets, B5 had 29%, frozen VG 72% and G-PA 15%.
  - The frozen pools earn similar money but sit on fragile parameter neighbourhoods; the nominees earn similar money on
    broad ones.
- **Study 7's VG and VXR references pass Study 8's gates too; its GDX references fail T3.**
  - **Non-decisional** (PROTOCOL.md §8.6): the comparison is only descriptive; full table
    `results/tables/F24-study7-comparison.md`.
  - Study 7's VG and VXR candidates (#1, #2, #5, #6) were trained only through 2023, and Study 7 exposed their
    2024–2026 window.
  - That they pass suggests the F24 outcome reflects the architecture's behaviour in a favourable window at least as
    much as anything learned from 2024 specifically. 2024 itself was nearly inactive.
  - Study 7's GDX references (#7, #10, #11) earned only $6.9k–$11.1k in the window and fail T3.
- **B1 is not out of sample here either** (PROTOCOL.md §1.4): its registry records that the VGT programs that chose it
  inspected 2024–2025. That favours B1 in the tier, E3 and the bootstrap comparisons.

## 4. 2025 and 2026 YTD separately (partial year to 2026-10-29; counted as a year everywhere)

**2025:**
- Most nominees made most of their test-window profit in 2025: #1 $50.9k of $64.2k.
- Their 2025 profit includes the March–June 2025 tariff episode (period T2025Q2, chosen with hindsight and
  report-only): #1 +$33.6k, B1 +$30.2k, B5 +$30.2k.

**2026 YTD:**
- Smaller and mixed: #1 +$13.3k, #2 +$32.7k, B1 −$6.6k, B5 +$26.3k.
- The March–July 2026 GDX drawdowns (G2026) cost #1 −$4.4k. They produced its **worst drawdown of the whole run**:
  $31,225, from 2026-05-11 to 2026-07-17, made of seven GDX lots. That is 89% of the ceiling, reached out of sample.

**Concentration** (leave one year out, 2026 included): every nominee depends heavily on 2020 (the COVID crash and
rebound).
- Removing 2020 cuts #1's whole-run net from $308.7k to $197.9k, #3's from $252.5k to $134.9k and #8's from $258.9k
  to $122.1k.
- The best-year share is 24–59% of net, within the 75% cap. The best year is 2020 for every nominee except #26 V extra
  (2025).

## 5. Return-rank diagnostic (does training order predict test order? `folds-return-rank.md`)

| Fold | ρ(selection robust/yr, test centre net) | ρ(selection robust/yr, test median) |
|---|---:|---:|
| F19 | −0.20 | −0.23 |
| F20 | −0.32 | −0.25 |
| F21 | −0.12 | −0.05 |
| F23 | 0.11 | −0.00 |
| F24 | 0.27 | 0.39 |

The correlations are over 36 members per fold. Training rank carried no information out of sample in F19–F23. On F24
the relation is weakly positive (+0.27 to +0.39). Within tracks it is noisy (−0.94 to +0.66). This matches the high
PBO values found in training (> 0.5 in 20 of 30 track-folds; `qualify-pbo.md`). **The F24 rank order is not a
predictive ordering.** The primary nominee is "#1" by the frozen training-only rule, not because it is expected to
outperform #2 or #3.

## 6. Confirmation

`npm run study8 -- test F24 --confirm` repeated the F24 stage deterministically in a fresh memory cache
(`results/test/F24/confirm.json`; see `EXECUTION_AND_INTEGRITY.md`). It can only detect computational mistakes; it
cannot change any ranking, parameter or criterion.
