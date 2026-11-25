# REPORT — Priority 6: TSLA D1 + Growth, comprehensive GPU research (P6-TSLA 1.0.0)

Study `research/tsla-d1-growth/`, branch `research/tsla-d1-growth`. Protocol `PROTOCOL.md` (frozen 2026-11-25T12:21Z,
sha256 `d5d462dc…`), optimization standard 3.0.0, NL0 1.0.0. One exclusive $100,000 TSLA slot, 5 bps per side, 11 % simple
interest, marked minute drawdown ≤ $35,000 (35 % of the fixed allocation).

**Evidence labels.** *Development*: 2016-01-04 → 2024-12-31, every choice. *Independently chronological*: the three folds
(each selection made on earlier data only, sealed and committed before the next period opened). *Retrospective*: every
period after 2019, including the 2025-01-02 → 2026-10-30 validation, which is previously examined broader-market
history, not a pristine holdout. *Report-only*: sub-populations, roles, controls, diagnostics. **There is no prospective
unseen period.** Nothing here is adopted, deployed or merged.

## 1. Result

<!-- PENDING-OUTCOME: the sealed determination (results/outcome.json), the C24 finalists, V1–V3 -->

**No arm's selection procedure is chronologically supported** (`results/sequential.json`, sealed before C24's training
door opened). Over 2020–2024 every arm's chained fold primaries made money ($25,172 to $99,581), and every chain's drawdown
broke the $35,000 limit ($36,079 to $82,547). Under the frozen determination (PROTOCOL §12), no finalist can therefore be
a TSLA research candidate, whatever its validation shows.

## 2. Method

<!-- PENDING-ASSEMBLY: reports/narrative/METHOD.md (§2 "What was fixed, and what was searched") is inserted here -->

## 3. Data (`TSLA_DATA_AUDIT.md`)

- Alpaca SIP minute bars, raw, 2016-01-04 → 2026-10-30, from the existing account (no purchase): 2,723 of 2,723 NYSE
  sessions; 1,975,254 rows; sha256 `8ed7f7d0…`. In development, 607 regular minutes (0.07 %) have no trade, hence no
  bar; in validation, none. There are 7 halts, kept as they are (none filled), including the 2018-08-07 "funding secured"
  halt and the March 2020 circuit breakers.
- Two splits: 5:1 on 2020-08-31 and 3:1 on 2022-08-25. Both are documented in the issuer's 8-K filings (plus an OCC memo
  for 2022), explain the raw gaps exactly, and agree with an independent daily source within 0.12 %. They are kept in a
  study-local ledger, `data/TSLA-splits.json`, because the central ledger is pinned by frozen records (decision U2). No
  other split-sized gap exists, and TSLA paid no dividend.
- Data doors are byte prefixes opened in chronological order: D19, D21, D23, D24, then FULL once. The door log is
  `results/doors.jsonl`.

## 4. Development evidence at C24 (2016–2024)

<!-- PENDING-C24: per-arm primary and roles: centre net / DD, selection & confirmation robust and p90 DD, lots, families; qualification counts; the §12 architecture comparisons -->

## 5. Chronological evidence (`CHRONOLOGICAL_VALIDATION.md`)

| Arm | 2020–2021 | 2022–2023 | 2024 | Sequential net | Sequential DD | Verdict |
|---|---:|---:|---:|---:|---:|---|
| D — D1 | +$20,368 | −$7,376 | +$12,231 | $25,172 | $40,170 | unsupported |
| G — Growth | +$30,546 | $0 | +$12,401 | $42,947 | $36,079 | unsupported (by $1,079) |
| C — fixed pair | +$45,465 | −$11,309 | −$7,567 | $26,589 | $61,092 | unsupported |
| J — joint | +$82,512 | −$16,452 | +$33,520 | $99,581 | $67,635 | unsupported |
| S — D1-first | +$92,527 | −$25,876 | +$17,654 | $84,305 | $82,547 | unsupported |

- **Shrinkage.** In sample, the fold primaries earned $29,000–$90,000 per year of data. Out of sample they earned $5,000
  (D, C), $8,600 (G), $16,900 (S) and $19,900 (J) a year, and every sequential drawdown exceeded every training drawdown
  of the same arm.
- **The out-of-sample drawdowns are realized losses, not give-backs.** They come from single $100,000 lots:
  - D1 protective stops near −$24,400 (2020-03 and 2021-02). The C19 D1 primary's protective stop is 24.1 % of entry,
    near the top of Assignment 2's 3–25 % box.
  - Growth lots that ran to their maximum hold at about −$30,000 (J, 2020-02 and 2021-02).
  - Repeated −$18,500 to −$20,400 D1 stops in 2022 (S).

  The training lots' worst adverse excursions were −$7,500 to −$14,000.
- **Training neighbourhood robustness did not transfer.** In training, 0–11 % of confirmation draws breached $35,000.
  On the next slice, up to 256 of 256 did.
- Report-only: D-A (plain D1 family A) had no qualified candidate at C21 or C23. Every protected and unrestricted
  sub-population is unsupported. Unrestricted Growth's chains reach drawdowns of $85,703–$111,944, more than the slot
  itself, by giving back marked gains of lots that grew several-fold in 2020–2021. Only two descriptive role chains (G
  balanced, G lower-drawdown) pass the numeric test. They are not the frozen selector, so they are not promoted.

## 6. Validation 2025-01-02 → 2026-10-30 (once, after the frozen selection; retrospective)

<!-- PENDING-VALIDATION: V1–V3 per finalist; validation P&L, reset DD, whole DD; controls on the same period -->

## 7. Architecture comparison (brief §7; one transparent table)

<!-- PENDING-C24: D, G, C, J, S and the controls side by side — development (C24), folds (sequential), validation; §12 comparisons with bands and replication -->

## 8. Risk (`ROBUSTNESS_AND_RISK.md`)

<!-- PENDING-DIAG: giveback vs principal loss; banked-capital DD; neighbourhood median/p10/p90/p95 and tails (small/wide radii); cost and slippage (10 bps, removal, stresses); gap through stops (tail stress, pre-2016); margin scenarios (illustrative); occupancy and displacement -->

## 9. Controls

<!-- PENDING-DIAG: TSLA buy-and-hold (financed 11 % and unfinanced; development, validation, full; fresh $100,000 per fold slice and for the validation) and New L0 / N/original projected on TSLA -->

## 10. Search effort and convergence (`SEARCH_AND_CONVERGENCE_REPORT.md`)

<!-- PENDING-C24: totals over C19–C24 -->

## 11. GPU parity and acceptance (`GPU_PARITY_AND_ACCEPTANCE.md`)

<!-- PENDING-C24: final job totals (gpu-jobs.py) -->

## 12. Wins from a change of basis or coverage (brief §7)

- **Combined arms.** J's and S's higher in-sample nets come partly from the shared-slot chronology, not only from better
  parameters. At C21 and C23 J's D1 component earned more in sample ($380,777; $332,204) than anything arm D found alone
  ($297,254; $235,330) from the same D1 box. S at C21 and C23 paired Growth with arm D's balanced-role D1, not its
  primary.
  <!-- PENDING-DIAG: displacement attribution of the C24 finalists -->
- **Unrestricted Growth.** G-U's, J-U's and S-U's large 2020–2021 slice gains come from holding TSLA through a tenfold rise
  with no exit protection. That is exposure to one episode, not a better rule; their drawdowns exceed the slot.
- **Controls.** The external controls are VGT phenotypes projected onto TSLA. On the arm G projection they hardly trade
  TSLA (−$5,531 over 2016–2024, no trade after 2019), so a comparison with them says nothing about Growth on TSLA.
- **Buy-and-hold.** A continuous 2016 holding grows to many times $100,000. Only the fresh $100,000 purchases (§9) are
  exposure-comparable with the strategies.

## 13. Disclosures

- **Code amendment A1 (after the freeze).** At 13:58Z, C19-S-refine stopped before any job or evaluation: the arm S
  refinement-lane builder did not register the sealed frozen D1 finalists. A three-line fix was sealed (`AMENDMENTS.md`
  A1; `results/amendments/A1.json`; allowed code digest `418a8758…` → `fb7e6ddc…`). No rule or result changed, and the
  chain resumed with the same command.
- **Real-data exposure before the freeze** (PROTOCOL §2):
  - the data audit, with no 2025–2026 returns;
  - a development-only suitability analysis;
  - the engineering gates, which read D19–D24 for equality counts and hashes;
  - the pilot on D21, for counts, timings and stop reasons.

  No box, threshold, budget, cell or rule was derived from a TSLA profit or drawdown. The FULL entries in the door log
  before the validation are gate E3's reproductions of New L0 / N/original on their own VGT/GDX data.
- **Report-only tool changes after the freeze** (`DECISION_REGISTER.md` §F): the exposure-table fix for carried lots with
  partial exits, and the fresh-purchase buy-and-hold control. Neither is a selection input.
- The external controls were chosen on VGT/GDX with 2016–2026 in view (PROTOCOL §4). They are descriptive only.
- Playwright e2e timing races in Strategy Lab's test code are reported beside gate E8 (`AMENDMENTS.md` E1). Strategy Lab
  itself is unchanged.

## 14. What this study does not show

- It is not a forecast or a deployment test. Every period is historical, and the 2020–2026 episodes were examined
  broadly before this study.
- The $35,000 ceiling is a research criterion on historical marked paths. It is **never an enforceable loss limit**:
  stops fill at the gapped open, and single lots lost $24,000–$32,000 out of sample.
- "Converged by the frozen rules" describes the stopping rules. Seeds found materially different optima in the same cell
  (`SEARCH_AND_CONVERGENCE_REPORT.md` §D), so better in-sample vectors may exist, and on this evidence they would most
  likely shrink out of sample as these did.
- TSLA was not combined with MSFT, VGT, GDX or the user's portfolio (brief §7).

## 15. Decisions for the user

<!-- PENDING-OUTCOME: U-items (DECISION_REGISTER.md U) -->
