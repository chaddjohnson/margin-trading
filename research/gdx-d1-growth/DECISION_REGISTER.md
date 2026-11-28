# DECISION_REGISTER — P8-GDX (Priority 8: GDX-only D1 + Growth and the matched total-portfolio comparison)

## A. Decisions taken before the freeze (within the brief; frozen in PROTOCOL.md 1.0.0, sha256 `27dcba9a…`)

| ID | Decision | Why |
|---|---|---|
| A1 | **Phase 0:** the identity-join module was integrated by cherry-picking `aca31b5f` alone onto the study base (`a33c6ff1`). The TSLA fix branch, the TSLA research history and the TSLA `outcome.ts` patch were not merged. `main` is untouched; a dry run onto `main` is clean | Brief Phase 0 item 2: "integrate only the reusable generic module and its tests … into that lineage instead". The correct study base is P6-TSLA's final commit `421e4c87`, the accepted GPU Phase 7 lineage that holds P6-TSLA's study code. `main` carries GPU Phase 6's record and no D1 + Growth single-symbol study code |
| A2 | **GDX trades in the engine's VGT-named slot**, as P6-TSLA's TSLA did; the second slot's books are disabled | Assignment 3's configuration type (whose genome, identities and GPU domain the accepted evaluator covers) searches one Growth book. Gate E3 proves the projection exact: the ablation matches lot by lot, and 4A's incumbents match to the cent |
| A3 | **Incumbents:** three GDX D1 books (N/original's = the ablation, New L0's, VG #2's) and 4A's five-member GDX Growth export set, read only from sealed, sha256-pinned records | Brief Phase 3 item 3. They are versioned and sourced; each is exactly representable on the fine grid |
| A4 | **Informed lanes at C24 only** for arms D and G (30 lanes), plus the **informed populations D+, G+, C+**. Their selections are labelled "no independent chronological test" | Standard §3.2–§3.3, §4.4 and §1.8; NL0 ran its informed lane at C24 only. Keeping D, G, C, J, S purely independent keeps the folds' chronological evidence clean (brief: "without displacing or constraining independent global searches") |
| A5 | **No informed J or S lane** | No GDX D1 + Growth incumbent pair exists. The combined architectures meet the incumbents through C+ (fixed informed pairs) and the five descriptive J controls |
| A6 | **Budget = P6-TSLA's executed allocation × 1.5 in every stage**: base D 6, G 12, J 6, S by the matching rule (14 at F = 3); 6 lanes per refined or informed cell. The hard ceiling is 160 M | Brief Phase 2/4: generous GPU effort and more seed diversity (P6-TSLA measured a material seed dependence). Standard §4.8 calls for proportional scaling (no stage enlarged alone). The pilot estimates ≈ 66 M requested and ≈ 19 GPU-hours |
| A7 | **The outcome joins by (population, id)** and fails closed; finalists' identities are written immutably into `FROZEN_SELECTION.json` before FULL | Brief Phase 0 item 4, Phase 7 |
| A8 | **The closing-print proxy finding** (2020-03-17/18) is disclosed, not repaired | It is the frozen data path of every study and of the accepted evaluator |
| A9 | **The total-portfolio stage (§15)** is precommitted and report-only, and runs after the outcome. Its primary settings: $500,000 initial core (illustrative), quarterly rebalancing, DRIP proxy, cash at 0 %, negative cash at 11 %, overlay = the engine's marked net (interest charged once). Report labels: ≥ $5,000 and ≥ 10 % in both the full and the development period | Brief Phase 5. Every scenario shares the identical core and assumptions |

## R. Report choices (after the outcome; never selection inputs)

All entries are post-outcome, report-only tooling in `tools/gdx-d1-growth/`, outside the frozen code closure. **No sealed
record, selection, threshold or outcome was changed.**

| ID | Choice or correction | Why / effect |
|---|---|---|
| R1 | **Reconciler fixes** (`reconcile.py`). It now reads the validation from its sealed location `results/validation/validation.json`; the draft had pointed at `results/slices/C24.json`. It also computes the primary, informed and b flags for every re-derived finalist, independently of the frozen list | The path was wrong in the pre-outcome draft. The flag fix came from the mutation tests: a finalist missing from the frozen list made the reconciler crash instead of failing a check. Both fixes were made before the reconciliation result (507/507) was relied on |
| R2 | **The portfolio tool registers the frozen D1 finalists** (`ensureAllFrozen`) before reading S configurations | The S cells name a sealed frozen D1 finalist (`S.C24F1…`). The pre-freeze engineering test of the tool used only the three references, so this path was never exercised. The first run stopped with "frozen D1 C24F1 is not registered" before writing anything |
| R3 | **Yahoo distribution units.** The chart API states every historical amount per current share, adjusted for the 2026-04-21 splits (VOOG 6:1, VGT 8:1). The tool now converts each amount back to the ex-date share basis before comparing or substituting, and records the Yahoo figure beside it | Without the conversion the ledger check showed differences of up to about 8× (ledger ÷ Yahoo), and the three VOOG 2016 "estimated" amounts would have been replaced by values 6× too small. The stage was rerun; the first run's output was overwritten and never reported. Effects: the core is identical in every scenario, and the overlay-distribution table is report-only and never added to trading results |
| R4 | **Report generators added:** `portfolio-md.py`, `final-md.py`, `reconcile-mutations.py`, and `diag.sh` (the precommitted diagnostics chain, fail-fast) | Every number in the reports is generated from sealed or report-only records. Hand-written narratives (`reports/narrative/*.md`) sit above the generated sections |
| R5 | **GDX-only rows name the trading slot by what it holds** (`D1:VGT` → `D1·GDX`, `G:VGT` → `Growth·GDX`) in the reports' funding-refusal columns. N/original's and New L0's rows keep their real VGT / GDX book names | Design A2: the engine's VGT-named slot carries GDX |
| R6 | **Duplicated overlays are listed once** in the portfolio tables. An informed population can share an identical configuration with an independent finalist (S22 = S4, S23 = S5, S24 = S6, S27 = S9, S28 = S10, S31 = S13); the labels table keeps every key | Avoids double counting the same account |
| R7 | **Negative overlay cash** (the ablation and three J configurations) is reported with its 11 % interest beside the incremental terminal wealth | PROTOCOL §15.4's identity: total − core = overlay net − the negative-cash interest |
| R8 | The independent distribution events were fetched after the sealed outcome, as precommitted (RUN_COMMANDS.md): Yahoo's public chart API with a generic client name, no account, git-ignored, not redistributed | Brief Phase 5.2: no distribution was invented, and no comparison is blocked |

## U. Outstanding decisions for the user

| ID | Decision | The study's position |
|---|---|---|
| U1 | Whether either development-only configuration (G `f13f3e1d64379748`, C `rc1-5beecb91ea91c775`) should receive any further status | **No.** Both have unsupported chronology, sharp optima, 21–30 % validation-neighbourhood breach shares and cost-path-dependent Growth trades. Any status needs your explicit decision and new, prospective evidence |
| U2 | Whether to commission a new study, for example GDX D1 restricted to protective-stop families and Growth restricted to exit-protected structures, or a prospective paper-monitoring record of N/original against a GDX-only overlay | Optional. These are research questions arising from the failure modes found here (stop-less 2020 D1 lots, unrestricted 2026 Growth lots), not candidates |
| U3 | Whether and when to review and merge this branch's non-trading code (the study tools; the identity-join module is already on this lineage) | Not done. No merge into `main` is authorized |
| U4 | Retention of the 25 GB of zstd-compressed official job archives on Apollo (`cache/jobs/`, git-ignored; actions log `storage/GDX8_JOB_ACTIONS.jsonl`) | Keep at least until the handoff has been reviewed. Without them, reproduction means recomputation, which is deterministic (gate E5) |
| U5 | The MSFT study | Not started, as instructed |
