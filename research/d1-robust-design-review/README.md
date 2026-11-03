# D1 robust pool discovery — Phase 1 experimental-design review (2026-10-25)

**What this is.** A critical review of the prior D1 shared-pool research (the joint 16-ETF study and the
portfolio-aware study) and a complete, implementation-grade protocol for a future study that searches for stable
combinations of ETF trading books and D1 parameters over an expanded universe. **Nothing was executed:** no code,
phenotype, registry, frozen manifest or data file was modified; no data were downloaded; no optimization, backtest of a
novel configuration, or holdout/final evaluation was run. The only files written are the nine documents in this
directory.

**Who reads it.** The user, then an independent reviewer, then the Phase 2 implementation agent (Opus 5.5).

## Executive summary

1. **The 16-ETF study's binding gate (T6) was a diagnostic, not a standard.** Its dollar-valued neighbourhood medians
   (B5 $215,130; R1 $246,610; R4 $249,932 against peaks of $388k/$468k/$372k) are the most honest training figures the
   programme has produced; its 75% retention ratio was uncalibrated (perturbation mass grows with cardinality, the
   denominator is the selected peak, clamping flattered boundary vectors) and could not be met by any optimized pool.
   The new design makes the **dollar neighbourhood median the search objective**, drops the ratio as a gate, puts
   neighbourhood risk in absolute dollars, and calibrates only a materiality margin and the discovery sample size from
   random, unoptimized controls by rules written before the pilot runs.
2. **The only clean time-ordered evidence available is a walk-forward test of the selection procedure**: two rounds
   (search ends 2020-06-30 and 2021-12-31), each pick scored on the following 1.5–2 years against random-control
   percentiles and against the same search run with the old peak-net objective (the ablation). A preregistered
   procedure gate decides whether anything can be nominated at all. B4/B5 are in-sample references there, not bars.
3. **2024–2026 is a locked historical confirmation that can only block** (no reversal, not materially worse than B4,
   risk ceilings), never validate. Genuine forward evidence starts after 2026-10-13.
4. **The universe is expanded by category under data-quality rules** (28 Tier 1 and 20 Tier 2 proposed symbols across
   sectors, factors, non-US equity, rates/credit and real assets; late-inception and structurally unsuitable products
   excluded by rule), with a coverage floor so a mechanism ignored by early selection pressure is still explored.
   Standalone profit never prunes anything.
5. **R1/R4 are inspect-only comparators, not seeds.** Their `all` runs become an opt-in, labelled, read-only
   diagnostic implemented in Phase 2 from archived vectors, after the new protocol is frozen.
6. **Accounting is made symmetric for comparisons** (no lot distributions for any book in the gated portfolio
   comparisons; the frozen VGT-lot convention is kept beside it), fills are unchanged, costs remain a 0/2/5/10 bps
   friction model, and every figure carries an evidence grade (E0 peak, E1 smoothed, E2 procedure persistence, E3
   inspected confirmation, E4 forward — none exists).
7. **No advancement remains a first-class outcome**, and the strongest possible verdict is "primary forward-test
   candidate".

## The most important changes from the 16-ETF protocol

| 16-ETF protocol | Proposed |
|---|---|
| peak-net discovery/refinement, neighbourhood battery on 20 finalists | neighbourhood fitness J = P50 − $5,000·k at every stage (n_D in discovery, 64 at promotion, 32 in refinement, 2 × 128 for finalists) |
| T6: P50 ≥ 0.75 × peak, 75% feasible neighbours | no ratio gate; DDmed ≤ $35k and DD90 ≤ $45k; Q25 ≥ 0; materiality M vs the benchmarks' *smoothed* figures |
| perturbation seeded per configuration, clamped at bounds | common random numbers per (window, stage, draw); reflection; independent confirmation batches |
| Pareto on (net, DD, books) → inert members on fronts | scalar constrained ranking; activity floor; non-inert members |
| F1/F2/F3 attribution periods of one run | two genuine walk-forward rounds with random-control baselines, raw-net ablation and a procedure gate |
| controls in every library | controls excluded from fold libraries, flagged in the final one; R1/R4 never seeds |
| 16 symbols | ≈ 40–60 symbols under predeclared eligibility; coverage floor; category-stratified starts |
| price-only lots except VGT lots in the portfolio | both conventions reported; gates on the symmetric one |
| 2024–2026 as acceptance window versus B5 with a positive margin | confirmation that can only block; no positive margin versus an inspected benchmark |

## What Phase 1 reviewed (verified in the repository)

Read in full: `research/joint-16-etf-d1/` (README, PROTOCOL, SEARCH_COVERAGE, JOINT_SEARCH_RESULTS,
DATA_AND_ENGINE_AUDIT, CACHE_AND_CAUSAL_PARITY, IMPLEMENTATION_AUDIT, HOLDOUT_FINAL_RESULTS, RECOMMENDATION,
FROZEN_SELECTION.json, `results/tables/robust.md`, and the R1/R4/B1/B4/B5 batteries and unoptimized-neighbourhood
diagnostics extracted from `results/robust/robust.json`, `results/refine/refine.json`,
`results/diagnostics/diagnostics.json`); `research/portfolio-aware-d1-optimization/` (PROTOCOL,
PORTFOLIO_AWARE_OPTIMIZATION, HOLDOUT_FINAL_RESULTS, RECOMMENDATION); the study code `src/joint-16-etf-d1/` (context,
space, genome, evaluator, robust, discovery head, data, evaluation, figures, cli), `src/portfolio-aware-d1/` (trace,
replay head, nbook/universe, nbook/engine head, freeze head), `src/multi-etf-d1/context.ts` and `space.ts`,
`src/multi-etf-allocator/context.ts`, `shadow.ts` head, `segments.ts` head, PROTOCOL head,
`src/shared-margin-portfolio/strategy.ts` (entry machine, levels), `src/lib/dataset.ts`, `evaluation.ts`,
`partitions.ts` head, `src/data-partition/cli.ts`, `canonical.ts`, `scan.ts` head, `scripts/download.sh`,
`data/download.sh`, `src/market-events/cli.ts` (grep), `data/partitions.json`, `data/VGT/` metadata files,
`config/market-events/splits.json`, the distribution manifest head, `config/phenotypes/README.md` and `D1/GDX.json`,
`package.json`, `README.md`, `.gitignore`, `docs/canonical-dataset-migration.md` head. Every figure quoted in these
documents was checked against those sources.

**Not available / not verified:** the draft `CLAUDE_D1_ROBUST_NEIGHBORHOOD_AND_ETF_POOL_DISCOVERY.md` is not in the
checkout (critiqued only as restated in the brief); inception dates, liquidity and structural histories of the proposed
new ETFs come from general knowledge and are labelled PROPOSED/UNVERIFIED; `.env` was not opened (only the presence of
the two variable names is required); the `engines` field (Node ≥ 24.21) disagrees with the Node 23.6 the studies ran
on — flagged for Phase 2; compute estimates extrapolate the 16-ETF study's measured unit costs.

## What Phase 1 deliberately did not execute

Any download (`scripts/download.sh`), import, optimization, pilot, neighbourhood computation, benchmark re-run, R1/R4
run on any partition, phenotype registration, protocol freeze, or commit. The retrospective runner, the ingestion
orchestrator and the study code are specified, not written.

## Document map (read in this order)

1. [METHODOLOGY_CRITIQUE.md](METHODOLOGY_CRITIQUE.md) — what the prior studies established, why T6 was miscalibrated
   yet valuable, search pressure, R1/B5, folds, data assumptions, the brief's remedies, remaining value of 2016–2023,
   and the failure-mode table (§9).
2. [NEIGHBORHOOD_AND_OBJECTIVES.md](NEIGHBORHOOD_AND_OBJECTIVES.md) — metric, perturbation classes, statistics,
   seeds/CRN, sampling error, feasibility F1–F4, objective J, risk aggregation, the pilot and its freeze rules.
3. [WALK_FORWARD_AND_EVIDENCE.md](WALK_FORWARD_AND_EVIDENCE.md) — rounds, mechanics, leakage barriers B1–B10, the
   ablation, procedure gate G-WF, multiple testing, the 2024–2026 role and rules C1–C4, evidence grades E0–E4.
4. [ETF_UNIVERSE_AND_DATA_INGESTION.md](ETF_UNIVERSE_AND_DATA_INGESTION.md) — eligibility D1–D5, Tier 1/2 shortlist
   and exclusions, breadth-versus-depth, capacity rule, brokerage notes, dividends, the staging → canonical → verified
   cleanup workflow with retries and protections.
5. [R1_R4_RESEARCH_RUN_DESIGN.md](R1_R4_RESEARCH_RUN_DESIGN.md) — the four-command interface, provenance from
   `robust.json`, training reproduction first, isolation, label, staging, interpretation rules.
6. [PROPOSED_PROTOCOL.md](PROPOSED_PROTOCOL.md) — the complete procedure: mapping table, invariants, stages S0–S11,
   gates G1–G8, nominations, freeze/evaluation, compute schedule and tiers, order of execution, reports, stop rules.
7. [IMPLEMENTATION_HANDOFF.md](IMPLEMENTATION_HANDOFF.md) — prerequisites, modules to inspect, work packages WP0–WP8,
   invariants with tests, commands to verify, reproducibility, completion criteria, independent review checklist.
8. [OPEN_DECISIONS.md](OPEN_DECISIONS.md) — nine decisions for the user with defaults and consequences.

## Implementation dependency order (Phase 2)

WP0 scaffold → WP1 retrospective runner (tests) → WP2 ingestion (then ingest Tier 1/2) → WP3 neighbourhood engine →
WP4 doors/audit/controls/parity and **protocol freeze** → RR the four R1/R4 runs → WP5 pilot → WP7 walk-forward rounds
(both folds) → WP6 final-round search/promotion/refinement/assessment → WP8 selection freeze, locked confirmation,
reports.

## Principal risks of the design itself

- **Two folds are thin.** G-WF can catch a procedure that clearly fails to persist; it cannot certify one that passes.
- **Calibration on the same period.** M and n_D describe 2017–2023 roughness; passing calibrated gates is not
  out-of-sample robustness.
- **Breadth increases search size.** More symbols mean more correlated trials; the archive's PBO and the random-control
  baselines make the extra overfitting propensity visible rather than removing it.
- **Compute.** Neighbourhood fitness multiplies evaluations by n_D + 1; the full tier needs worker threads
  (≈ 4–5 h on 8 cores) or ≈ 25–30 h single-core; the fallback tier is predeclared.
- **Analyst hindsight** of 2020–2023 shaped the fold boundaries and gates; they are fixed here, before any run, which is
  the only available remedy.

## Internal consistency check (the brief's ten points)

1. All 16 existing ETFs, VGT and VOOG included, are eligible under the same D1–D5 rules as new symbols; no book is
   compulsory (PROTOCOL §2 item 1, §3). 2. The 60/40 VOOG/VGT core is fixed in the portfolio whatever the pool (§2
   item 2). 3. The objective is the shared pool's causally funded outcome; standalone figures are diagnostics; no
   standalone track (§2 item 3, §5). 4. Neighbourhood quality guides discovery, promotion and refinement (§6–§8). 5. R1/R4 `all`
   runs are postponed to Phase 2 with the 16-ETF manifest untouched and the retrospective label (R1_R4 §5–§6).
6. Optimization reads training only, truncated per round; holdout/final/all open only through the benchmark,
   evaluation and retrospective doors (§3; WALK_FORWARD §4). 7. No data were downloaded in Phase 1; Phase 2 follows
   the staging → `import --keep-source` → verify → cleanup workflow (ETF_UNIVERSE §8). 8. No secret value appears in
   any document, command or planned output; only the two variable names are referenced. 9. Fixed $100k and the 20%
   compounded portfolio are separate analyses, the latter with the core and margin accounting (§2.9, §9). 10. No
   configuration is declared a future-proof winner; no advancement is an explicit outcome (§1, §10, §11).
