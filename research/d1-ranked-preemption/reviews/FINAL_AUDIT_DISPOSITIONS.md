# Final audit — dispositions

The final audit (`final-audit.md`, verbatim) was made by an independent read-only reviewer after every outcome was
sealed and the reports were drafted. Verdict: the "no advancement" decision is sound; the reports are accurate
enough to rely on; 14 minor findings and one note, none MATERIAL. Each finding was checked against the code and the
records before it was acted on. **Only report text and two read-only helper scripts changed; no sealed record,
protocol, frozen code file, research-pool JSON or configuration was modified.** The pre-freeze `DISPOSITIONS.md` is
bound by the protocol freeze and was not edited.

| # | Finding | Checked | Disposition |
|---|---|---|---|
| 1 | Year attribution is a calendar-year mark change, not lot nets by exit year; the years sum to V | confirmed (`evaluate.ts` `attribute`, line 90; fold-b sums equal V within $77.19) | **Fixed** in `CHRONOLOGICAL_VALIDATION.md` §5: relabelled, "do not sum" removed, "exits" → mark change; figures unchanged |
| 2 | "$300k–$543k on training" includes the never-validated final window | confirmed | **Fixed** in `README.md` and `FINAL_COMPARISON_AND_RECOMMENDATION.md` §4: fold picks $304k–$434k; final window's $431k–$543k labelled never validated |
| 3 | "That is why B trails A" is unsupported | confirmed (hindsight neither equals nor bounds the shortfall) | **Fixed** in `OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md` §2: "part of the cost"; path dependence stated |
| 4 | Speculative fold-a explanation; imprecise same-minute wording | confirmed (one in-window switch, KRE→GDX 2021-09-28; B-R1's 2020-H2 increment = B4's $46,465) | **Fixed** in `FINAL_COMPARISON_AND_RECOMMENDATION.md` §4 (boundary-state fact; "while the slot was free"); the fact also added to `CHRONOLOGICAL_VALIDATION.md` §5 |
| 5 | Buffer effect described wrongly | confirmed (B-R1 executed count unchanged 1/2/5; fold-a D-R2 B500 $304,295 > $303,618) | **Fixed** in `OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md` §3 |
| 6 | Spearman figures computed over all 61 positions, labelled "ranked symbols" | confirmed (`summary.py` keeps the unrankable tail) | **Fixed**: ranked-only values recomputed independently over the symbols ranked in both windows — R1 0.41 / 0.39 / 0.09, R2 0.72 / 0.60 / 0.57, R1 vs R2 0.44 / 0.46 / 0.38 (the auditor's fold-a-vs-final R1 is 0.10; the difference is the common-symbol convention) — quoted with the all-positions values in `FROZEN_PRIORITY_RANKINGS.md`; `FINAL_COMPARISON_AND_RECOMMENDATION.md` uses the ranked-only values |
| 7 | Screened-down representatives are credible; VGK's idle share 0.022; XRT uncertain in fold-a | confirmed | **Fixed** in `FROZEN_PRIORITY_RANKINGS.md` and `STANDALONE_SCREENING.md` |
| 8 | "Every gate input" overstates the engine cross-check | confirmed (minute DD replay-only; continuity covers 9 configurations) | **Fixed** in `CHRONOLOGICAL_VALIDATION.md` §1 |
| 9a | Exploration reserve empty by construction | confirmed | **Acknowledged** as a design defect of the frozen rule, met only nominally (`STANDALONE_SCREENING.md`); cannot change after the freeze; D missed F2 by $37,952–$210,906, so GP is unaffected |
| 9b | Switching costs and interest not reported | confirmed | **Fixed**: computed from the engine exports of `npm run ranked-preemption -- preemptions RP-final-<id>` (read-only, training data; logs `results/logs/cli-preemptions-RP-final-*.log`; `scripts/switching_costs.py`); counts and preempted nets equal the sealed controls; table added to `FINAL_COMPARISON_AND_RECOMMENDATION.md` §3 |
| 9c | Per-regime diagnostic counts pointer wrong | confirmed | **Fixed** pointer (`DIAGNOSTIC.json` `pools[*].regimes`) in `OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md` |
| 9d | No per-symbol or regime split for validation; reason misstated | confirmed (the doors permit a read-only CLI run after the seal) | **Partly**: statement corrected; the descriptive runs were not made (they change no gate or conclusion) |
| 9e | Multiple testing, latency and hindsight caveats missing from README / FINAL_COMPARISON | confirmed | **Fixed** in both |
| 10 | Research-pool JSONs say "E0/E1 training only"; C pools' role "procedure" | confirmed | **Documented, files unchanged**: each JSON carries a `contentSha256`, is checked by `verify` and was written once by `export-pools`; `README.md` states the correct status (fold pools E2, failed; C a control) |
| 11 | CLI header text (signals.csv, "never compounded"); README's `--end` and file-set statements | confirmed (header text from `src/pools/report.ts`, in the prospective freeze's code closure) | **Documented** in `README.md` (header text cannot be edited without breaking the prospective freeze); README statements **fixed** |
| 12 | IMPLEMENTATION_AUDIT: PARITY has no guard field; amendment hash type; second stale parity comment; §9 unfilled | confirmed | **Fixed**; §9 filled; the audit files now exist |
| 13 | Checkpoint stale | confirmed (the audit read the earlier version) | **Fixed**: `RESEARCH_RECOVERY.md` rewritten (top screen, stage table, constants, guards, disclosures) |
| 14 | $1 rounding; cross-window Jaccard covers consecutive windows only | confirmed | **Fixed** (−$39,216, −$161,675; fold-a vs final 0.20 / 0.36) |
| 15 | Note: no portfolio-drawdown gate; survivorship in eligibility; B4-comparator fix made after the confirmatory review without re-review | confirmed (the auditor verified max(B5, B4) in F2, N2, N3, N4 and the historical check) | **Disclosed** in `FINAL_COMPARISON_AND_RECOMMENDATION.md` §4 caveats and the final report |
