# Validation persistence audit — did higher training pass rates predict better outcomes?

**Question 5 and the test half of question 6. Limited to already-sealed test results.**

- **Population:** the only configurations with sealed test records are the **36 shortlist members of each fold**
  (180 in all; `results/test/<FOLD>/test.json`).
- **Training figures:** each fold's own confirmation evidence (3 × 128 neighbours on its training door; the
  qualification records).
- **No new door was opened.** No archive configuration was replayed on 2025–2026 or on any other test window.
- **Exposure:** all of 2016-01-04 → 2026-10-29, every test window included, had been inspected by the research
  programme before Study 8 (PROTOCOL.md §3.4). These are retrospective procedural statistics, not validation.
- **Generated:** `scripts/persistence.py` → `outputs/persistence.md` (every per-fold table and the F24 member list) and
  `outputs/persistence.json`.

## 1. Selection and survivorship bias (read before the numbers)

- **The tested configurations are survivors.** Each was chosen from about 15,000 rung-1 evaluations of its track-fold
  *because* its training neighbourhood was broad.
  - Their training shares are compressed into 0.86–1.00 (lowest 0.8646). Range restriction attenuates every
    correlation below.
  - Nothing here describes the untested 99.96% of the archive (180 of 440,126 rung-1 configurations were tested).
- **Members are not independent.** Members of a track share books and often near-identical vectors. The folds overlap
  (every fold starts in 2016; F20's 2022 is F21's first test year). The six track means are a very small sample.
- **Test windows differ** in length (1.0–2.0 years) and regime. F19–F21 contain a drawdown regime absent from their
  training (2020; 2022); F23 (2024) was nearly inactive for D1; F24 (2025–2026) was favourable for D1 generally.
- **The shares are of sampled parameter neighbourhoods on one market history.** They are not probabilities of future
  drawdown safety.

## 2. Failure rates and outcomes by training-share band

### F24 (trained 2016–2024; tested 2025-01-02 → 2026-10-29, 1.82 years)

| training share band | members | T-failed (rate; exact 90% CI) | of which holders | median test-window net / yr | median run DD | run DD ≥ $35k | median test share | median test p90 |
|---|---|---|---|---|---|---|---|---|
| <90% | 3 | 3 (100%; 90% CI 37%–100%) | 0 | $19,997 | $27,051 | 0 | 85.2% | $35,722 |
| 90–93% | 6 | 4 (67%; 90% CI 27%–94%) | 3 | $24,391 | $27,562 | 0 | 91.0% | $34,631 |
| 93–95% | 2 | 1 (50%; 90% CI 3%–97%) | 1 | $21,875 | $32,398 | 0 | 93.9% | $34,525 |
| 95–98% | 7 | 1 (14%; 90% CI 1%–52%) | 6 | $28,205 | $22,887 | 0 | 95.8% | $31,048 |
| 98–100% | 18 | 5 (28%; 90% CI 12%–50%) | 16 | $19,863 | $22,020 | 1 | 99.7% | $26,510 |

### F23 + F24 pooled (training contains both 2020 and 2022)

| training share band | members | T-failed (rate; exact 90% CI) | of which holders | median test-window net / yr | median run DD | run DD ≥ $35k | median test share | median test p90 |
|---|---|---|---|---|---|---|---|---|
| <90% | 3 | 3 (100%; 90% CI 37%–100%) | 0 | $19,997 | $27,051 | 0 | 85.2% | $35,722 |
| 90–93% | 8 | 6 (75%; 90% CI 40%–95%) | 5 | $24,391 | $26,831 | 0 | 91.0% | $34,780 |
| 93–95% | 4 | 2 (50%; 90% CI 10%–90%) | 3 | $24,235 | $27,430 | 0 | 94.1% | $33,930 |
| 95–98% | 10 | 4 (40%; 90% CI 15%–70%) | 8 | $27,286 | $22,811 | 0 | 97.0% | $30,914 |
| 98–100% | 47 | 34 (72%; 90% CI 60%–83%) | 36 | $0 | $20,806 | 1 | 100.0% | $24,757 |

### F19–F21 pooled (test window contains a regime absent from training)

| training share band | members | T-failed (rate; exact 90% CI) | of which holders | median test-window net / yr | median run DD | run DD ≥ $35k | median test share | median test p90 |
|---|---|---|---|---|---|---|---|---|
| <90% | 0 | — | — | — | — | — | — | — |
| 90–93% | 3 | 3 (100%; 90% CI 37%–100%) | 1 | −$55 | $56,153 | 2 | 2.1% | $58,452 |
| 93–95% | 4 | 4 (100%; 90% CI 47%–100%) | 2 | −$20,139 | $66,181 | 4 | 3.9% | $90,276 |
| 95–98% | 8 | 8 (100%; 90% CI 69%–100%) | 4 | −$10,889 | $46,585 | 8 | 6.4% | $54,140 |
| 98–100% | 93 | 93 (100%; 90% CI 97%–100%) | 67 | −$1,082 | $45,206 | 77 | 8.6% | $54,473 |

**Reading the tables:**

1. **F19–F21: training breadth gave no protection.**
   - Every member failed, in every band: 108 of 108, 93 of them in the 98–100% band.
   - 77 of the 93 breached $35k over the run, and median test shares were 2–9%.
   - A 98–100% training share did not prevent the 2020 or 2022 drawdowns.
2. **F23 + F24: risk persisted; failures were mostly economic.**
   - Only 1 of 72 members breached $35k.
   - The 98–100% band had the most failures by count: 34 of 47 (72%; 90% CI 60–83%).
     - By rate, the < 90% (3 of 3) and 90–93% (6 of 8) bands failed more often.
     - Its failing gates were T3 34, T4 29, T6 25 (T5 3; T1, T2, T2b 1 each).
     - Its median test-window net was $0/yr: on F23 because 2024 was nearly empty; on F24 four of its five failures
       were economic.
   - **The F24 98–100% failures:**
     - #19 G balanced and #22 G robust (100% training share): T3; #19 also T4, after a test-window loss of $815.
     - #16 VXR balanced and #20 VXR extra (100%): T3, test-window net $10.5k and $17.7k against the $18.2k floor.
     - #4 VXRG balanced (99.7%): the one risk collapse (run DD $37.7k, test share 21.1%).
3. **F24: the 95–98% band did best.**
   - 1 failure in 7 (90% CI 1–52%), the highest median test-window net ($28.2k/yr) and a median run DD of $22.9k.
   - But n = 7, and the confidence intervals of every band overlap.

## 3. Rank correlations (Spearman, approximate 90% interval)

| fold | pair | overall | within-track | between-track |
|---|---|---|---|---|
| F19 | training share → test share | +0.13 [-0.16, +0.40] (n=36) | +0.23 [-0.06, +0.49] (n=36) | +0.06 [-0.73, +0.78] (n=6) |
| F19 | training share → test-window net/yr | +0.05 [-0.24, +0.33] (n=36) | +0.18 [-0.11, +0.44] (n=36) | +0.12 [-0.70, +0.80] (n=6) |
| F19 | training share → whole-run DD | -0.30 [-0.54, -0.02] (n=36) | -0.32 [-0.55, -0.03] (n=36) | -0.20 [-0.83, +0.65] (n=6) |
| F19 | training p90 DD → test p90 DD | +0.33 [+0.04, +0.56] (n=36) | -0.04 [-0.33, +0.25] (n=36) | +0.26 [-0.61, +0.85] (n=6) |
| F19 | training robust/yr → test-window net/yr | -0.24 [-0.49, +0.05] (n=36) | -0.22 [-0.48, +0.07] (n=36) | -0.37 [-0.88, +0.53] (n=6) |
| F20 | training share → test share | +0.08 [-0.21, +0.36] (n=36) | +0.33 [+0.05, +0.57] (n=36) | -0.43 [-0.89, +0.48] (n=6) |
| F20 | training share → test-window net/yr | +0.44 [+0.17, +0.64] (n=36) | +0.36 [+0.08, +0.59] (n=36) | +0.31 [-0.57, +0.86] (n=6) |
| F20 | training share → whole-run DD | -0.30 [-0.54, -0.01] (n=36) | -0.37 [-0.59, -0.09] (n=36) | -0.03 [-0.76, +0.74] (n=6) |
| F20 | training p90 DD → test p90 DD | +0.22 [-0.08, +0.47] (n=36) | +0.79 [+0.65, +0.88] (n=36) | +0.09 [-0.71, +0.79] (n=6) |
| F20 | training robust/yr → test-window net/yr | -0.33 [-0.57, -0.05] (n=36) | -0.31 [-0.55, -0.03] (n=36) | -0.09 [-0.79, +0.71] (n=6) |
| F21 | training share → test share | +0.36 [+0.08, +0.59] (n=36) | +0.10 [-0.19, +0.38] (n=36) | +0.76 [+0.02, +0.96] (n=6) |
| F21 | training share → test-window net/yr | +0.01 [-0.27, +0.30] (n=36) | -0.09 [-0.37, +0.20] (n=36) | +0.46 [-0.45, +0.90] (n=6) |
| F21 | training share → whole-run DD | -0.05 [-0.33, +0.24] (n=36) | +0.06 [-0.23, +0.34] (n=36) | -0.21 [-0.83, +0.64] (n=6) |
| F21 | training p90 DD → test p90 DD | +0.35 [+0.07, +0.58] (n=36) | +0.50 [+0.25, +0.69] (n=36) | +0.54 [-0.35, +0.92] (n=6) |
| F21 | training robust/yr → test-window net/yr | -0.12 [-0.39, +0.17] (n=36) | -0.14 [-0.41, +0.16] (n=36) | -0.26 [-0.85, +0.61] (n=6) |
| F23 | training share → test share | +0.83 [+0.71, +0.90] (n=36) | +0.91 [+0.85, +0.95] (n=36) | +0.81 [+0.15, +0.97] (n=6) |
| F23 | training share → test-window net/yr | -0.38 [-0.60, -0.10] (n=36) | -0.64 [-0.79, -0.44] (n=36) | -0.87 [-0.98, -0.34] (n=6) |
| F23 | training share → whole-run DD | -0.45 [-0.65, -0.19] (n=36) | -0.48 [-0.67, -0.22] (n=36) | +0.20 [-0.65, +0.83] (n=6) |
| F23 | training p90 DD → test p90 DD | +0.99 [+0.98, +1.00] (n=36) | +1.00 [+0.99, +1.00] (n=36) | +1.00 (n=6) |
| F23 | training robust/yr → test-window net/yr | +0.11 [-0.19, +0.38] (n=36) | +0.34 [+0.06, +0.57] (n=36) | +0.14 [-0.68, +0.81] (n=6) |
| F24 | training share → test share | +0.88 [+0.79, +0.93] (n=36) | +0.64 [+0.44, +0.78] (n=36) | +0.43 [-0.48, +0.89] (n=6) |
| F24 | training share → test-window net/yr | -0.09 [-0.36, +0.21] (n=36) | -0.48 [-0.68, -0.23] (n=36) | +0.31 [-0.57, +0.86] (n=6) |
| F24 | training share → whole-run DD | -0.57 [-0.74, -0.34] (n=36) | -0.36 [-0.59, -0.08] (n=36) | -0.77 [-0.96, -0.05] (n=6) |
| F24 | training p90 DD → test p90 DD | +0.84 [+0.73, +0.91] (n=36) | +0.74 [+0.58, +0.85] (n=36) | +0.94 [+0.66, +0.99] (n=6) |
| F24 | training robust/yr → test-window net/yr | +0.26 [-0.03, +0.51] (n=36) | +0.19 [-0.10, +0.45] (n=36) | +0.49 [-0.42, +0.91] (n=6) |
| F23+F24 | training share → test share | +0.90 [+0.86, +0.94] (n=72) | +0.71 [+0.59, +0.79] (n=72) | +0.37 [-0.53, +0.88] (n=6) |
| F23+F24 | training share → test-window net/yr | -0.48 [-0.62, -0.31] (n=72) | -0.60 [-0.71, -0.45] (n=72) | +0.26 [-0.61, +0.85] (n=6) |
| F23+F24 | training share → whole-run DD | -0.60 [-0.72, -0.46] (n=72) | -0.63 [-0.74, -0.49] (n=72) | -0.60 [-0.93, +0.28] (n=6) |
| F23+F24 | training p90 DD → test p90 DD | +0.92 [+0.88, +0.94] (n=72) | +0.92 [+0.88, +0.94] (n=72) | +0.94 [+0.66, +0.99] (n=6) |
| F23+F24 | training robust/yr → test-window net/yr | +0.19 [-0.02, +0.37] (n=72) | +0.08 [-0.13, +0.27] (n=72) | +0.43 [-0.48, +0.89] (n=6) |

**Reading it:**

- **The neighbourhood property itself persisted once training covered 2020 and 2022.**
  - F23 + F24 pooled: training share → test-family share **ρ = +0.90**; training p90 DD → test p90 DD **ρ = +0.92**.
  - Both hold within tracks (+0.71, +0.92).
- **A higher training share went with a lower whole-run drawdown:** ρ = −0.60 (within-track −0.63).
- **But with lower test-window profit:** ρ = −0.48 (within-track −0.60).
  - The broadest neighbourhoods were the least active and least profitable out of sample.
  - This is consistent with the training-side lots–share correlation in Study 8's threshold-sensitivity table. It is
    negative in G (−0.75), VG (−0.46) and VXRKG (−0.39), but V +0.25, VXR −0.09, VXRG 0.00.
- **Training robust profit barely ranked test profit:** ρ = +0.19 [−0.02, +0.37] pooled; +0.26 on F24; negative on
  F19–F21.
- **Between tracks (n = 6), nothing is estimable with useful precision.** Most intervals span zero.
- **F19–F21:** training share → test share is ρ = +0.08 to +0.36, the level being near zero anyway. Training robust →
  test net is −0.12 to −0.33.

## 4. Q6 (test half) — report-only threshold view on the sealed F24 members

| min training share | members | holders | T-failed | fail rate | median test-window net | worst test-window net | median run DD | worst run DD | lowest test share |
|---|---|---|---|---|---|---|---|---|---|
| all | 36 | 26 | 14 | 39% | $42,681 | −$815 | $22,887 | $37,722 | 21.1% |
| ≥ 0.90 | 33 | 26 | 11 | 33% | $45,480 | −$815 | $22,887 | $37,722 | 21.1% |
| ≥ 0.93 | 27 | 23 | 7 | 26% | $47,151 | −$815 | $22,020 | $37,722 | 21.1% |
| ≥ 0.95 | 25 | 22 | 6 | 24% | $47,922 | −$815 | $22,020 | $37,722 | 21.1% |
| ≥ 0.98 | 18 | 16 | 5 | 28% | $36,101 | −$815 | $22,020 | $37,722 | 21.1% |

**Reading it:**

- **Raising the minimum training share from 0.90 to 0.95 among the 36 F24 members:**
  - removes 8 members, 5 of them T-failed;
  - leaves 25 members with a 24% fail rate (33% at ≥ 0.90);
  - raises the median test-window net from $45.5k to $47.9k;
  - lowers the median run DD from $22.9k to $22.0k.
- **At ≥ 0.98 the median test-window net falls to $36.1k,** reflecting the economically weak near-inert members above.
- The worst outcomes are unchanged at every threshold: −$815 test net and #4's $37.7k DD / 21.1% test share are at
  ≥ 0.98.
- **None of this is a selection.** The members were chosen by the sealed rules; the window is exposed; n is small.

## 5. Answer to Q5

- **Did higher training pass rates predict better subsequent outcomes?**
  - **For drawdown behaviour, yes, conditionally:** when the training window contained the stress regimes (F23, F24),
    the training share and p90 DD ranked the test share and p90 DD strongly. Higher shares went with lower run
    drawdowns.
  - **When the test held a new regime (F19–F21), no:** every member failed regardless of band.
  - **For profit, no:** higher training shares went with *lower* test-window profit, and the near-100% band contains
    near-inert configurations that fail the economic gates.
- **The evidence favours the user's ≥ 95% preference as a risk filter only alongside the activity and economic gates,
  never as a profit predictor.** The single most informative sample, F24's 95–98% band, is too small (n = 7) to rank
  it above 93–95% (n = 2) or 98–100% (n = 18) with confidence.
