# READ FIRST — P8-GDX: GDX-only D1 + Growth and the matched total-portfolio comparison

**GDX STUDY COMPLETE — RESEARCH ONLY — NO STRATEGY ADOPTED OR DEPLOYED.** Nothing was merged into `main`, transmitted to
a broker or deployed. The MSFT study was not started.

## Executive conclusions

1. **No qualifying GDX candidate.** The outcome was sealed before any portfolio analysis.
   - All five GDX-only architectures fail the chronological test: D1, Growth, the fixed pair, joint and D1-first
     sequential, each in the one $100,000 margin-funded slot. Each fold's 2016-to-cutoff selection, traded on the later
     2020–2024 slices, breached the $35,000 (35 %) drawdown ceiling.
   - Two primaries pass the single 2025–2026 validation without chronological support: Growth `f13f3e1d64379748` and the
     fixed pair `rc1-5beecb91ea91c775`. They are labelled development-only. Their validation neighbourhoods breach in
     21–30 % of draws. Not recommended.
2. **GDX-only never beats N/original in the trading slot.** The best GDX-only finalist earns $358,459 over 2016–2026
   against N/original's $482,701 (−25.7 %). The development-only ones earn $171,751 and $278,245.
3. **GDX-only does not reduce total-portfolio risk.** Under the identical 60 % VOOG / 40 % VGT core (illustrative $500,000;
   quarterly rebalancing; distributions reinvested), every GDX-only overlay leaves:
   - a slightly larger maximum drawdown than core + N/original (+$3k to +$28k, +0.5 % to +4.6 %);
   - equal or worse margin headroom;
   - $124k–$443k less terminal wealth.

   The precommitted label is "no material difference" throughout. GDX-only's lower correlation with the core did not help:
   N/original's overlay earned money inside the core's worst episode (2022), and the GDX-only overlays mostly earned less or
   lost.
4. **The evidence is retrospective.** GDX 2016–2026 had been examined by the program before; the validation is not a
   holdout. All official evaluation ran on the accepted GPU (81 jobs, 0 CPU-scored, parity 1,458/1,458). The outcome was
   reconciled independently (507/507 checks, 13/13 mutation tests).

## Reading order

1. **REPORT.md**: the outcome, the answers to the brief's eight questions and the disclosures.
2. **COMPARISON.md**: GDX-only against N/original on the two decision axes, trading sleeve and whole portfolio.
3. **TOTAL_PORTFOLIO_COMPARISON.md**: the matched core-only / core + N/original / core + GDX-only accounts (Phase 5).
4. **FINAL_CANDIDATES.md** and **CHRONOLOGICAL_VALIDATION.md**: every finalist by (population, id), the folds, the
   sequential verdicts, the validation and the data-door timeline.
5. **ROBUSTNESS_AND_RISK.md**: neighbourhoods, stresses, validation neighbourhoods, lot-level risk and attribution.
6. The arm reports: **STANDALONE_D1_REPORT.md**, **STANDALONE_GROWTH_REPORT.md**, **FIXED_COMBINATION_REPORT.md**,
   **JOINT_REPORT.md**, **SEQUENTIAL_REPORT.md**.
7. **BASELINES_AND_ABLATION.md**, **GDX_DATA_AUDIT.md**, **GPU_PARITY_AND_ACCEPTANCE.md**,
   **SEARCH_AND_CONVERGENCE_REPORT.md**, **OUTCOME_IDENTITY_RECONCILIATION.md**.
8. Governance: **PROTOCOL.md** (frozen) and **PROTOCOL_FREEZE.json**, **AMENDMENTS.md**, **DECISION_REGISTER.md**
   (§R report choices, §U decisions for you), **STANDARD_ADOPTION.json**, **FROZEN_SELECTION.json**.
9. Reproduction: **RUN_COMMANDS.md**, **RESEARCH_RECOVERY.md**, **IDENTITY.txt**, **OMITTED_ARTIFACTS.md** and
   `SHA256SUMS.txt`.

## What is in the ZIP

- **Top level:** the documents above.
- **`study/`:** every committed file of `research/gdx-d1-growth/`, including:
  - sealed records, attestations and job descriptors;
  - tables and diagnostics;
  - the portfolio series;
  - the chain log.

  It omits the per-lane search and qualification records (429 MB, in git; listed with sha256 in OMITTED_ARTIFACTS.md).
- **`source/`:** the study's code, the npm scripts and the branch's code patch against its base.
- **`reference/`:** unchanged inputs it cites, such as the standard, the acceptance record and the event ledgers.

No market data, database, archive, binary or credential is included. A secrets and personal-data scan ran at packaging.

## The decisions that are yours (DECISION_REGISTER §U)

- Whether anything should follow at all. The study recommends no adoption and no live use of the two development-only
  configurations.
- Whether to commission a new, prospectively monitored study, for example GDX D1 families with protective stops only and
  Growth with exit protection only.
- When to review and merge the branch's non-trading changes, if ever. The identity-join module is already on this lineage.
- The retention of the 25 GB of compressed job archives kept on Apollo.
