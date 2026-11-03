# Chronological and multiple-testing limits

## 1. What the chronology protects — and what it does not

- **Data doors.** Every Study 2 load is the training partition with access `optimization`, an explicit end and audited
  hashes (`doors.ts`); nothing after 2023-12-29 was read by any Study 2 run. Fold-a source vectors were never run past
  2021-12-31, fold-b and final-window vectors past 2023-12-29 (refusals tested). The screens read only runs ending at
  their cutoffs (2020-06-30, 2021-12-31) and were sealed before any run feeding Level D, Level C or a table; a
  post-cutoff mutation of VGT's and XOP's files left the loaded bars and ledgers through the cutoff unchanged; the
  signal ledgers at both cutoffs hash equal to the screens' (determinism).
- **Execution causality.** The frozen engine decides on completed minutes and fills at the next eligible trade; no
  study code changes a decision (observer = engine and gate replay = engine checked on every run).
- **What it does not restore: independent evidence.** 2016–2023 was inspected by earlier studies and by the designer
  (PROTOCOL §0): the 61-survivor universe, the B4/B5 incumbents (chosen with 2016–2026 known; B5's GDX book fitted by a
  full-pool-replay objective on 2016–2023), VGT `primary` (selected by VGT programs that also inspected 2024–2025), the
  G1–G13 regimes and the seven `designer-seen` ETFs (GDX, XOP, XLE, EWZ, TLT, XLU, GLD, whose View-U-on-B4 training
  rows were published) all embed hindsight. Every fold replay is **retrospective with an incumbent-hindsight
  comparator**; none is an out-of-sample validation of anything.
- **No holdout claim.** 2024-01-02 → 2026-10-13 stayed closed; B4/B5 full-history anchors are cited only from
  published records. Forward observations: 0.

## 2. How much was examined

| Layer | Count |
|---|---|
| Standalone runs (engine + observer, all checked equal) | 667 in Stages 3–4 (screens 110 + 115; signals 110 + 164 + 168) plus 206 fold-V parity runs and 5 incumbent books in Stage 2; the risk stage re-ran 61 × 3 + 103 standalone books on the engine |
| View-windows with 61×61 matrices | 6 (U-T, U-A, U-B, P-A, P-B, P-F) × 3,721 ordered pairs × 7 exported metrics |
| Per-ETF Level D summaries | 61 ETFs × 6 view-windows × 2 baselines |
| Screens | 2 folds × 2 baselines × 2 views = 8 cells; 18 roles filled |
| Level C scenarios | 18 fold replays + 3 incumbent diagnostics + 4 in-sample, each at 0/2/5/10 bps, s25 and the portfolio (≈ 150 engine runs plus 24 shared baseline runs) |
| Rubric outcomes | 18 fold replays × 9 flags; 61 × 2 × 3 labels |

The 61 ETFs are not independent: one sell-off is seen by dozens of them (66% of the uniform rule's 816 training-era
decisions fall in 21 market-wide families). Pair counts, episode counts and label counts are therefore **not evidence
counts**, and no p-value or confidence level is reported. The verdict rests on 18 replays in two regimes, with the
screens' selections fixed in advance.

## 3. Source provenance limits

- View U is a **counterfactual** vector for 60 of the 61 ETFs; it arms only on ≥ 21.6% declines from a 74-session high,
  so six low-volatility ETFs never trade (AGG, GLD, IAU, IEF, SHY, TIP) and many trade rarely. Conclusions about those
  ETFs are "not evaluable", not "no opportunity".
- View P nominees exist for 49 (fold A) and 54 (fold B) ETFs; 12 / 7 have no nominee and are NA, never substituted.
  Their pre-cutoff economics are in-sample to their own fit (`sa_net > 0` is nearly guaranteed), which is why the screen
  needs idle-clean evidence too. The source-library alternates were omitted by design.
- The final-window survivors (P-F) are in-sample context only and enter no screen, replay or verdict.
- F7-thin ETFs (DBC, EDV, ILF, IYT, KIE, VOOG, VPU) are flagged; the only positive idle-clean total under View U (ILF)
  is one of them, in one event.
- Prices are split-adjusted and price-only (no distributions on lots); income ETFs are understated.

## 4. Structural survivorship and selection

The 61 ETFs are those with complete minute data 2016-01-04 → 2026-10-13 (GDXJ, OIH, XLRE excluded), i.e. survivors.
B4's and B5's books were themselves the winners of earlier searches over overlapping history; any candidate is compared
with a hindsight-advantaged incumbent, which biases the comparison against candidates, not for them. The screen's
thresholds were set before outcomes but by a designer who knew the published XOP/GDX/XLE results; the SRC rule's use
of R2 rather than R1 is what made the designer-seen XOP the fold-B SRC (disclosed; R1 would have given XLK and XME).

## 5. Disclosed incidents and deviations

- Two independent methodology reviews before the freeze; every finding accepted (protocol v1 → v2 → v2.1).
- Instrumentation checks on published scalars were run before the protocol freeze (B4/B5 anchors, XOP/GDX/XLE map
  rows); they are reproductions of published figures.
- An outcome-free smoke test of the later stages ran before the code freeze on data ending 2018-06-29 (not a study
  window); it printed only structural "ok" lines.
- A test caught a screen-code deviation from protocol v2 (an `fo_net > 0` gate the protocol had removed) before the
  code freeze; fixed before any screen ran.
- **Correction amendment C1** (after the sealed analysis): three label/rubric-bookkeeping deviations in
  `analysisStage.ts` (NC replays excluded from labels; a too-loose reshuffle count; stray qualifiers), demonstrated by
  `tests/rubric.test.ts`, fixed under code freeze v2, analysis rerun as `ANALYSIS-2.json`; the verdict is identical and
  cannot depend on the correction (`AMENDMENTS.md`).
- **Correction amendment C2** (test only): the study's protected-input test raced with another study's golden-master
  test writing transient files under `research/vgt-minute-optimizer/tmp/` in the full suite; the test now ignores that
  directory (code freeze v3). No record changed.
- An independent results and implementation review (`reviews/RESULTS_REVIEW.md`) recomputed every Level D summary
  (0 mismatches), the replay attributions and the rubric, confirmed the verdict, and corrected report statements (e.g.
  the S1 losses are mostly direct, not cascade; the idle-stretch figures recomputed minute-precisely; the scenario risk
  table added); all dispositions in `reviews/RESULTS_REVIEW_DISPOSITIONS.md`. Earlier drafts had also been corrected
  against the records before the review (the solo-family net, the exit-reason wording).
- Note N1: the code's materiality floor uses the worst own **loss** magnitude; identical to PROTOCOL §9.1's
  "|worst own lot|" on every replay (no positive worst own lot exceeds $5,000).
