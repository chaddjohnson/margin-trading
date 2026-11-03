# Independent review of the audit reports (2026-11-02) and its resolution

**How the review was done.** A fresh read-only agent checked the prose claims of the eight reports.

- It compared them with `outputs/`, and checked about 40 directly against the sealed search, archive, qualification,
  test and selection records.
- It modified nothing.
- It found no error that changes a conclusion. It found ten wording or precision discrepancies, all corrected in the
  reports as below.
- The embedded tables were machine-filled and were not in question.

| # | finding (reviewer) | severity | resolution |
|---|---|---|---|
| 1 | "The only sealed configuration in or near the 93–95% band is #1": #26 V extra (94.0% confirmation, ambiguous) is in the band and #3 VXRG is near it. #1's five shares span 93.2–97.3% (incl. 97.3% selection, 95.7% T2), about 4 points | medium | RECOMMENDATION §2 and README rewritten: #26 is named (robust $7,352/yr, low-profit), #3 is listed, and all five of #1's measurements are given (≈ 4-point spread) |
| 2 | "same fidelity" claims hold at rung 3 but not at rung 2 (VG 41 above #2's rung-2 value, up to +8.3%; VXRG 5, +4.0%; VXR 3, +1.9%) | medium | the "highest retained fidelity" rule is now stated explicitly. Rung-2 exceedances are reported with their counts, and those re-measured at rung 3 (VG 16; all VXR, VXRG) fell back. Changed in RECOMMENDATION §1, PROFIT §2, OPTIMIZER §2, README |
| 3 | not every G exclusion was by a risk criterion: `GDX:d1-f99216b79e` (+8% at rung 3, 90.6%, p90 $34,848) was excluded by L∞ distinctness from the profit pick | low–medium | named in RECOMMENDATION §3, OPTIMIZER §2.3 and its conclusion, PROFIT §2, README. Its 384-point status is reported as unknown |
| 4 | the 0.98 cost "≤ 1%" ignores VXRG's 2.3% at confirmation | low | corrected in PROFIT §5 |
| 5 | the "98–100% band failed most often" is true by count, not rate; T4 omitted | low–medium | VALIDATION §2: count versus rate stated; gates T3 34, T4 29, T6 25, T5 3 |
| 6 | "0.84–1.00" (lowest 0.8646) and "untested 99.8%" (180 of 440,126) | low | 0.86–1.00 and 99.96% |
| 7 | "T2 rescored eight configurations per job" | low | T2 fired in 18 of 30 jobs; 8 rescored in 17, 2 in V-F19 (ARCHIVE §4) |
| 8 | "within ±2%" for the formula sensitivity (VXR p10-only −2.6%) | low | "within 3%, largest −2.6%" (PROFIT §4, OPTIMIZER §2.3) |
| 9 | "most are within L∞ 0.10 … or not reached" | low | the exact reasons of the 20 pooled rows are given: 9 not reached, 7 below top 48, 3 within L∞ 0.03 of a rung-3 configuration, 1 within L∞ 0.10 of a shortlisted pick |
| 10 | "−4% … +6%" against "−3% … +6%"; the lots–share ρ quoted only where negative | low | "−3% … +6%" (each track's best) everywhere; all six lots–share ρ given |
| data door | OPTIMIZER called the return-rank "the one exception", but two other labelled sealed-member statuses also appear | low | its data line now lists all three labelled exceptions |

**The reviewer verified as correct** (against sealed records, among others):

- the archive totals;
- the F24 inventory;
- the 305 rung-1 leads and their 15/16 versus 16/16 split;
- the fidelity shrinkage;
- that no C3, C4, C6 or C7 violation occurs at rungs 2–3;
- the shortlist gaps;
- every rank correlation;
- the band outcomes;
- the #1 versus #2 figures;
- PBO, L∞ and island stops;
- the F24 test failures;
- the threshold views;
- the data coverage.

It found no training comparison that uses a test-window figure, and no claim that a never-tested configuration is
validated.
