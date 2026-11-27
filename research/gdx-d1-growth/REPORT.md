# REPORT — Priority 8: GDX-only D1 + Growth and the matched total-portfolio comparison (P8-GDX)

**Research only. No strategy is adopted, merged into production, transmitted to a broker or deployed.** Protocol P8-GDX
1.0.0 (frozen 2026-11-26T16:03:15Z, sha256 `27dcba9a…`), optimization standard 3.0.0, method NL0 1.0.0. The accepted GPU
evaluator was GPU Phase 7 (record `bb0e3fcf…`). Branch `research/gdx-d1-growth`; `main` untouched.

## 1. Outcome

**NO QUALIFYING GDX CANDIDATE** (sealed `results/outcome.json`, sha256 `647afac4…`, commit `4615a33b`).

- None of the five independent GDX-only architectures produced a chronologically supported procedure:
  - D1 standalone;
  - Growth standalone;
  - the fixed pair;
  - the joint search;
  - the D1-first sequence.
- Every one breached the precommitted $35,000 (35 % of the $100,000 allocation) drawdown ceiling when its fold selections
  were traded over the later 2020–2024 slices.
- Two primaries are development-qualified and pass V1–V3 on 2025–2026 without chronological support. In the outcome's
  terms they are "not deployment-qualified without an explicit user decision":
  - **G** `f13f3e1d64379748` (`C24/G/refine/G.h1.s1/R105#1 profit`);
  - **C** `rc1-5beecb91ea91c775` (`C24/C/pair DF2×GF1`).
- The study does not recommend either.

**In the matched total portfolio, GDX-only does not reduce risk.**
- With the same 60 % VOOG / 40 % VGT core (illustrative $500,000), every GDX-only overlay leaves the account with a slightly
  larger maximum drawdown than core + N/original (+$3,025 to +$27,954; +0.5 % to +4.6 %).
- Every GDX-only overlay also leaves $124,242 to $443,452 less terminal wealth.
- Every scenario is labelled **"no material difference"** by the precommitted rule.

## 2. What was done

| Phase | Result | Where |
|---|---|---|
| 0 | Integrated only the identity-join module (cherry-pick `a33c6ff1` of `aca31b5f`, 12/12 tests). Nothing else from the TSLA fix branch or TSLA research was merged. P6-TSLA's 163 seals still verify; `main` was not touched | DECISION_REGISTER A1, GPU_PARITY_AND_ACCEPTANCE.md §1 |
| 1 | GDX data audit: 2,723 / 2,723 sessions, 0 defects; one disclosed closing-print finding (2020-03-17/18). Reproduced N/original $482,700.73 / $20,385.99 and New L0 $479,605.18 to the cent on GPU and CPU. Ran the GDX-only N/original ablation and proved it identical to the projected control | GDX_DATA_AUDIT.md, BASELINES_AND_ABLATION.md |
| 2 | Protocol frozen before any official evaluation, including the total-portfolio protocol (§15) and the outcome rule (§12) | PROTOCOL.md, `results/protocol-freeze.json` |
| 3 | Five arms (D, G, C, J, S) plus informed populations D+, G+, C+ at C24. Incumbents enter only as controls and informed members. J is truly joint; S is scored against its full pool | PROTOCOL.md §4–§7, the five arm reports |
| 4 | All official evaluation ran on the accepted GPU: 81 jobs, 76,965,697 evaluations, 0 CPU-scored, parity 1,458/1,458, 0 attestation failures. Searches requested 72.8 M (45.5 % of the 160 M ceiling) | GPU_PARITY_AND_ACCEPTANCE.md, SEARCH_AND_CONVERGENCE_REPORT.md |
| 5 | Matched total-portfolio comparison of 32 scenarios × 3 leverage levels × 3 conventions, after the outcome | TOTAL_PORTFOLIO_COMPARISON.md, COMPARISON.md |
| 6 | Folds C19 / C21 / C23 and the sequential verdicts were sealed before the C24 door opened. C24 → 2025–2026 was validated once. The report covers stresses, neighbourhoods and attribution | CHRONOLOGICAL_VALIDATION.md, ROBUSTNESS_AND_RISK.md |
| 7 | Finalist identities were frozen, the outcome joined by (population, id), and an independent reconciliation passed 507/507 with 13/13 mutation tests. A handoff ZIP was built | FINAL_CANDIDATES.md, OUTCOME_IDENTITY_RECONCILIATION.md |

## 3. Answers to the final questions

### Q1. Can GDX D1 standalone, GDX Growth standalone or their pooled combinations become chronologically qualified, robust trading candidates?

**Not in this study.** The chained fold procedures, each traded on later, previously examined data, all fail:

| Procedure | Net | Drawdown | Breach |
|---|---:|---:|---|
| D | $26,912 | $48,177 | the March-2020 D1 lot |
| G | −$36,677 | $62,458 | |
| C | $11,183 | $52,065 | |
| J | $26,676 | $45,938 | |
| S | $69,432 | $48,177 | |

8 of the 15 independent fold-primary slices breach the 35 % ceiling, and all five arms breach in 2020–2021. On 2025–2026:

- the D primary lost $15,255;
- the J and S primaries breached at $60,066 and $59,792, through an unrestricted Growth·GDX lot still open at −$40k at the
  endpoint;
- only the G and C primaries passed V1–V3.

Neither of those two is robust:
- their centre nets are 1.4–1.8× their neighbourhood medians;
- 21–30 % of their 2025–2026 neighbourhood draws breach;
- their development nets depend non-monotonically on the cost assumption.

### Q2. Does GDX Growth contribute measurable incremental value beyond GDX D1, after capital contention and costs?

**Not credibly.** In development, Growth adds value over the D primary through S (+$66,040 with two 2016 lots, +$10,413 DD)
and the fixed pair (+$2,255 centre net, +$42,122 confirmation robust). Through J it subtracts (−$40,369).

The increment is concentrated in one episode, the 2016 gold-miner rally, and in the pair it rests on a cost-path-dependent
trade. Chronologically, adding Growth raised the sequential net (S $69,432 vs D $26,912) but not the drawdown ($48,177
both). On 2025–2026 the Growth-bearing S and J primaries breached, while the C pair's Growth book made +$5,210 overall.
Shared-slot contention is small: at most 10 refused decisions per run.

### Q3. Does independently optimized GDX-only ever outperform N/original in the fixed $100,000 slot? If not, how large is the trade-off?

**Never** — not in the full window, not in development, not in the validation. Against N/original's $482,701 over
2016–2026:

| GDX-only configuration | Full net | Shortfall |
|---|---:|---:|
| Best finalist (S primary) | $358,459 | $124,242 (25.7 %) |
| D primary | $255,525 | $227,176 (47.1 %) |
| G primary (development-only) | $171,751 | $310,950 (64.4 %) |
| C primary (development-only) | $278,245 | $204,455 (42.4 %) |

In the validation window N/original earned $94,670 against at most $21,640 for an independent GDX-only primary.

Per borrowing-dollar-day some GDX-only overlays earn more (G $0.0055, C $0.0033, D $0.0025 vs $0.0020), because they occupy
the slot 9.5–43 % of sessions against 62.6 %. The idle slot earns nothing, so the shortfall is real.

N/original was chosen with 2016–2026 in view, which flatters it. The ablation shows its GDX D1 book alone is $293,127 weaker,
so most of N/original's edge comes from its VGT books and from their filtering of the GDX book.

### Q4. Under the same 60/40 core, does switching from N/original to GDX-only reduce total-account drawdown or margin risk? By how much?

**No.** At the $500,000 illustrative core, quarterly rebalancing and a $100,000 maximum overlay:

| | Core + N/original | Core + GDX-only (all finalists) |
|---|---:|---:|
| Maximum marked DD | $612,387 (21.1 %) | $615,412–$640,341 |
| Δ DD vs N/original, 2016–2026 | — | **+$3,025 to +$27,954** (+0.5 % to +4.6 %) |
| Δ DD vs N/original, 2016–2024 | — | +$7,075 to +$32,004 (+1.2 % to +5.3 %) |
| Maximum margin debt | $110,789 | $100,151–$110,000 |
| Maximum LTV | 16.4 % | 10.8–18.0 % |
| Minimum headroom at a 30 % illustrative requirement | $314,290 | $292,459–$314,290 |

The precommitted label is "no material difference" in every case; no scenario reaches the ≥ $5,000 / ≥ 10 % reduction in
both windows. The result holds at $250,000 and $1,000,000 core and under the drift and sweep conventions. The only
reductions anywhere are D and C+ at the $250,000 core and under drift, at −$4,952 (1.6 %), below the threshold.

Margin requirements are illustrative, not Vanguard's; no margin call or safety is claimed.

### Q5. Is a lower trading return justified by material and credible diversification? Are there regimes where GDX-only is worse?

**No.** The GDX-only overlays are less correlated with the core: 0.05–0.19 against 0.41 for the primaries, and their
technology share is 2.5–4 points lower on average. But the overlay is small beside the core, and what decides the total
drawdown is the overlay's P&L inside the core's worst episode (2021-12-27 → 2022-10-14). There N/original earned +$22,821
while GDX-only earned −$9,182 to +$15,747. N/original held its VGT lots mostly near the core's highs: the mean core DD on
its VGT-lot sessions was $58,335, against $235,445 on its GDX-lot sessions.

GDX-only is worse:
- in 2022, the deepest episode;
- in 2017, 2021, 2023–2024 and 2026;
- in the 2026-Q2 divergence (VGT +37 %, GDX −18 %): −$13k to −$17k against N/original's +$17k.

GDX-only is better:
- in 2016, through the Growth-bearing primaries;
- inside the 2020 crash;
- in 2018-Q4;
- in the 2025 spring sell-off.

Those are single episodes, never a claim of superiority.

### Q6. Did the search achieve predefined convergence/coverage criteria, or did areas remain budget-limited?

**Converged by the frozen rules, with full coverage.** Every lane stopped on "triggers not met", except one C23 J lane
labelled coverage-limited. No lane hit the 16-island cap; the budget-bound share was 0 %. Every cell of every arm had a
feasible fit at every cutoff. The budget used was 45.5 % of the hard ceiling.

**But seed dependence is material.** The median relative range of a cell's best net across replicates was:
- G 49–63 %;
- J 17–30 %;
- D 15–25 %;
- S 10–22 %.

The Growth optima in particular are poorly located. The binding failures are out-of-sample drawdowns, not a shortage of
search, so no budget-limited area is likely to change the outcome.

### Q7. What uncertainty remains?

- **Repeated inspection.** Every GDX window 2016–2026 had been examined by the program before this study, including
  N/original, New L0, 4A and Appendix A. The folds and the 2025–2026 validation are retrospective, not a holdout. GDX's FULL
  file was also opened before the freeze, for equality checks only. There is no prospective evidence.
- **Distributions.** Trading results are price-only, the frozen convention of every program strategy. The overlay lots'
  distributions ($0–$8,364 per scenario) are reported, never added. The core ledger matches an independent source at a
  median 0.50 % (maximum 8.54 %). The three estimated VOOG 2016 amounts were replaced by observed ones.
- **Margin.** All requirements and stresses are illustrative. No broker-specific account data was used. The $500,000 core is
  a normalization, not the user's balance.
- **Execution.** Fills are minute bars at 5 bps per side and stops at the bar or gapped open. Capacity at $100,000 of GDX is
  not separately measured. The closing-print proxy is uncertain on 2020-03-17/18. Fast markets could fill worse than the
  +25 bps stress.
- **Model.** The results show seed dependence, sharp development optima and cost-path dependence of the Growth trades.

### Q8. Does any configuration merit further research consideration?

**Not as a candidate.** The development-only G and C primaries fail the chronological test and have weak, frequently
breaching validation neighbourhoods. Each would need a new, prospectively monitored study before any further claim.

Two findings are worth carrying forward as research questions, not as strategies:
1. The GDX D1 books' drawdowns came from stop-less maximum-hold lots (2020) and the Growth books' from unrestricted exits
   (2026). A protocol that excludes those families could be tested in a new study.
2. In this history, N/original's shared slot acted as a filter: its VGT books kept 20 losing GDX D1 lots out (−$34,332).

**No production adoption is authorized or recommended.**

## 4. Disclosures

1. **GDX FULL was opened before the freeze for equality checks only** (gates E2 and E3: door equality and the
   known-target reproduction). No rule, box or threshold came from a GDX profit or drawdown (PROTOCOL §2;
   CHRONOLOGICAL_VALIDATION.md §5).
2. **Closing-print proxy** (GDX_DATA_AUDIT.md §4). The frozen data path differs from the official close on 2020-03-18
   (5.2 %) and 2020-03-17 (1.2 %). It was disclosed, not repaired.
3. **Post-outcome tool corrections** (report-only; no sealed record changed; DECISION_REGISTER R1–R4):
   - the reconciler's validation path and a crash found by its own mutation tests;
   - the portfolio tool's missing registration of the frozen D1 finalists, needed by the S configurations;
   - the Yahoo per-current-share distribution units (the portfolio stage was rerun).
4. **Independent distribution data** (Yahoo chart API, public, generic client) was fetched after the sealed outcome, as
   precommitted. It is git-ignored and not redistributed. Nothing was bought or subscribed to.
5. **Negative overlay cash** occurred in four scenarios (the ablation and three J configurations). It was charged 11 % in
   the account (−$44 to −$1,750); the identity is total − core = overlay net + that interest.
6. **Unrestricted Growth exposure.** The J and S primaries end 2026-10-30 holding an open Growth·GDX lot marked near −$40k.
   The figures mark it; they do not liquidate it.

## 5. Research-source mapping

| Question | Primary record (sealed) | Report |
|---|---|---|
| Data | `GDX_DATA_AUDIT.json`, `data/DOOR_PINS.json` | GDX_DATA_AUDIT.md |
| Baselines, ablation | `results/engineering/E3-references.json` | BASELINES_AND_ABLATION.md |
| Searches, convergence | `results/search/**`, `results/rounds/**`, `results/qualification/**` (in git; omitted from the ZIP) → `reports/tables/search-summary.json`, `lanes.csv` | SEARCH_AND_CONVERGENCE_REPORT.md |
| Fold selections, slices | `results/selection/C19…C24*.json`, `results/slices/C19…C23.json`, `results/sequential.json` | arm reports, CHRONOLOGICAL_VALIDATION.md |
| Finalists, validation, outcome | `FROZEN_SELECTION.json`, `results/validation/validation.json`, `results/outcome.json` | FINAL_CANDIDATES.md |
| Reconciliation | `reports/tables/outcome-reconciliation*.json` | OUTCOME_IDENTITY_RECONCILIATION.md |
| GPU evidence | `results/gpu-attestations/*`, `results/jobs/*`, `reports/tables/gpu-jobs.json` | GPU_PARITY_AND_ACCEPTANCE.md |
| Total portfolio | `reports/portfolio/portfolio.json`, `reports/portfolio/series/*.csv` | TOTAL_PORTFOLIO_COMPARISON.md, COMPARISON.md |
| Diagnostics | `reports/diagnostics/*.json` | ROBUSTNESS_AND_RISK.md, arm reports §F–§H |

Every sealed record is listed with its sha256 in `results/seals.jsonl`: 156 entries, all re-verified 2026-11-27T07:09Z.
Commands: RUN_COMMANDS.md. Code: `src/gdx-d1-growth/` (the frozen closure, digest `4c2c3fd4…`) and `tools/gdx-d1-growth/`
(report-only tools).
