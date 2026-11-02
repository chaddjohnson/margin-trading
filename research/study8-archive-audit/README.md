# Study 8 archive audit — profitable, genuinely robust D1 candidates overlooked by selection?

A **read-only, report-only** audit of the sealed Study 8 records (`research/study8-expanded-regime-d1/`).

**What was not done:**

- no optimization, search, T1 extension or GA;
- no new pool or ETF backtest and no replay;
- no new test door;
- no change to the fitness, thresholds, protocol, nominations or sealed records.

Every number is a field of an archived record or a deterministic function of such fields
(`scripts/run_all.py` → `outputs/`, verified by `outputs/MANIFEST.sha256`).

## Research question

Did the stability-first optimizer, or its screening, shortlisting and gating rules, overlook D1 configurations that
are materially **more profitable** than the selected candidates, with parameter neighbourhoods that are still
acceptably robust?

The user's stated preference:

- **default:** a 95–100% historical neighbourhood drawdown-pass rate;
- **exception:** 93–95% only with a compelling, evidence-backed economic case and positive validation;
- **never:** nominating a configuration with poorer chronological evaluation merely for higher training profit.

## Data actually available

`ARCHIVE_INVENTORY.md` gives the details.

- **Searches:** 30 sealed search records (6 tracks × 5 folds) with their rung-1 archives — 440,126 configurations
  and 9,983,389 point evaluations, all re-derived and consistent with the sealed counts.
- **Fidelity:**
  - rung 1 keeps 16-point neighbourhood summaries only;
  - rungs 2 and 3 (5,760 and 1,514 records) keep full centre and 64/128-point summaries;
  - the 180 shortlist members have 384-point confirmation evidence on their training door, and sealed test records.
- **Lost:** the point caches (in the removed temporary worktree), per-neighbour results, the rung-1 inputs of C3
  lot-years / C4 / C6 / C7, island origin, T2-rescored values for non-shortlisted configurations, and the
  unpromoted screen vectors (counts only).
- **Data doors:**
  - training comparisons use F24 training records only (2016-01-04 → 2024-12-31);
  - test-window figures appear only for the 180 sealed-tested members, descriptively;
  - all of 2016 → 2026-10-29 had been inspected before Study 8.

## Bottom line

1. **No overlooked high-profit, robust candidate at ≥ 64-point precision.**
   - In the pooled tracks, each configuration taken at its highest retained fidelity, the best risk-feasible
     non-holder per track sits within −3% … +6% of the best sealed holder.
   - At rung 3 none exceeds it. At rung 2 some do by up to +8% (VG), but those re-measured at rung 3 fell back.
   - The shortlist step lost nothing at the top: the best excluded configuration is 0.2–6.1% below the best
     shortlisted one.
   - G's more profitable vectors sit on the **risk** boundary: 88–92% shares, p90 within about $1k of the $35k
     ceiling. Three failed risk or stress gates. One (+8%) was excluded by distinctness from a same-region pick that
     failed Q2, and was never measured at 384 points.
   - (`PROFIT_ROBUSTNESS_FRONTIER.md`, `OPTIMIZER_SELECTION_AUDIT.md`.)
2. **Rung-1 leads exist but are noise-level.**
   - 305 configurations exceed their holders' 16-point values (223 of them in G).
   - Measured on the same configurations, 16-point robust profit shrinks 5–6.5% at 64 points, and a 15/16 share
     holds ≥ 0.90 only 52% of the time.
   - Below rung 2, the archive cannot settle individual cases.
3. **The user's ≥ 95% preference costs almost nothing in the pooled tracks and about 25% in GDX alone** (training
   frontier). It is not a profit predictor.
   - On the sealed members, a higher training share predicted persistence of the neighbourhood and lower drawdowns
     once training covered 2020 and 2022 (F23 + F24: ρ = +0.90 for the share; −0.60 for run DD).
   - It also predicted *lower* test-window profit (ρ = −0.48), and gave no protection on F19–F21, where every member
     failed (`VALIDATION_PERSISTENCE_AUDIT.md`).
4. **No 93–95% exception emerges from the archive.**
   - The sealed #1 VG profit measures between 93.2% and 97.3% across five neighbourhood sets (128–384 points,
     test included). #26 V extra (94.0%) is low-profit.
   - #2 VG balanced meets the ≥ 95% default at every measurement. Its training robust profit is 8% lower.
   - That is an observation for the user, not a reranking.
5. **The search was budget-bound in 32-D and 40-D, but more of it would mainly add multiple testing:**
   - the top of the frontier is flat within noise;
   - PBO exceeds 0.5 in 20 of 30 track-folds;
   - the optimum moves L∞ 0.42–0.97 across folds.
6. **No change to the fitness is recommended.** If a new study is wanted, start with the replay-based ETF-combination
   screening of `FUTURE_ETF_POOL_DISCOVERY_DESIGN.md` (training only; four VGT/GDX families). More local exploration
   is not recommended.

## Files

| file | content |
|---|---|
| `ARCHIVE_INVENTORY.md` | Q1: retained coverage, fidelity and gaps per track, fold and stage |
| `PROFIT_ROBUSTNESS_FRONTIER.md` | Q2, Q4, Q6 (training): overlooked candidates, frontier by share band, threshold cost |
| `OPTIMIZER_SELECTION_AUDIT.md` | Q3, Q7: exclusion funnel, criteria, saturation, compute |
| `VALIDATION_PERSISTENCE_AUDIT.md` | Q5, Q6 (sealed test): bands, failure rates, rank correlations, bias |
| `FUTURE_ETF_POOL_DISCOVERY_DESIGN.md` | Q8: design-only proposal over the 61 canonical ETFs |
| `RECOMMENDATION.md` | answers and prioritized next actions |
| `RUN_COMMANDS.md` | exact commands to reproduce |
| `RESEARCH_RECOVERY.md` | the task checkpoint |
| `scripts/` | read-only audit scripts (standard-library Python) |
| `outputs/` | generated tables (`.md`, `.csv`, `.json`), `MANIFEST.sha256`, and the baseline hash manifest of the protected files |
