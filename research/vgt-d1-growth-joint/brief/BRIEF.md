# Priority 2 — Joint optimization of D1 + Growth for VGT in one shared capital pool

## User objective and authorization

Build and thoroughly evaluate a combined **VGT D1 + VGT Growth** strategy using one shared capital pool. **Jointly optimize the D1 parameters, Growth parameters and the defined capital-allocation choices.** This is a full strategy optimization, not merely a test of fixed independently selected phenotypes or a small search over a new option.

The requested combined system uses **both D1 and Growth**. Single-family strategies are essential controls, not substitutes for the requested combined product. Do not force equal trade counts, profit shares or time invested, but do not present a system that never funds one family as a successful combination.

The aim is greater net profit within a maximum minute drawdown of **35% of a fixed $100,000 trading capital budget: $35,000**. Profit includes realized and marked unrealized P&L after costs and interest. Do not require greater profit with equal or lower drawdown as the only acceptable outcome; report worthwhile profit–risk trade-offs, lower-drawdown alternatives and uncertainty.

Proceed through repository inspection, implementation, verification, a substantial bounded joint search, qualification, validation and reporting. Resolve normal engineering choices autonomously and document them. Do not deploy, merge into main, change the user's Strategy Lab settings or saved runs, or automatically start the next priority. Preserve unrelated work. Use an isolated research branch/worktree as appropriate. Do not push or publish unless separately authorized in this session.

## Roadmap and standing date rule

1. **Completed:** bounded D1 entry eligibility in VG #2 Balanced. No useful benefit was demonstrated at the fixed control parameters; retain eligibility OFF.
2. **CURRENT:** jointly optimize D1 + Growth for VGT in one shared pool.
3. Next, after review: jointly optimize D1 + Growth for VGT + GDX in one pool.
4. Then: jointly optimize D1 + Growth for GDX alone.
5. Then: investigate other ETFs for Growth.

For **every priority**, use **2016–2024 for backtesting, optimization and selection**, and **2025–2026 for validation of frozen selections**. For this study the intended endpoints are 2016-01-04, 2024-12-31 and 2026-10-30; use an earlier endpoint only if canonical data are incomplete, and disclose it. Do not silently extend the endpoint or imply that November–December 2026 were evaluated.

No validation outcomes may determine ranges, architecture changes, ranking, stopping, candidate refinement or a new winner. A failed validation is a result to report, not permission to retune. Previously known 2025–2026 results must be disclosed: this is validation on previously examined history, **not an untouched holdout**.

## Read the prior work and incorporate its lessons

Locate the current Apollo margin-trading repository, inspect applicable repository instructions and the working tree, and read the actual code and research records. Paths may require adjustment for branches/worktrees:

- `research/study8-expanded-regime-d1/`, especially `PROTOCOL.md`, selection and results; `src/study8-expanded-regime-d1/` and `src/study8-runners/README.md`.
- `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json` and the associated VGT phenotype.
- `research/growth140-vgt-stable/`, especially `REPORT.md`, `PROTOCOL.md` and `FROZEN_SELECTION.json`; its source adapter and canonical Growth 1.4.0 engine.
- `research/growth140-vgt-s8m/` and `src/growth140-vgt-s8m/space.ts` (`control4`).
- `research/vg-balanced-entry-eligibility/`, especially the report, protocol, matched trade comparison and memory/pilot records; its isolated funded-lot implementation where useful.
- The canonical D1 shadow book, pools engine, ledgers, calendar/session handling and data provenance.

Use these as implementation evidence, not authority to silently inherit outdated selection rules.

Lessons to apply:

1. **Optimize the actual pool.** Independently optimized ETF/strategy components need not form a good shared-capital system. Do not require standalone success before a component may enter the joint search.
2. **Capital displacement matters.** Priority 1's delayed trade lost only $522.64, yet displaced and newly admitted trades reduced portfolio profit by about $28,245. Extra-trade profits alone are not an objective.
3. **Do not suppress structural diversity.** Earlier Growth promotion excluded Rise and gate-enabled designs. Allocate explicit search and promotion budgets across relevant Growth structures and pool architectures; record rejected/promoted counts and reasons.
4. **Do not impose arbitrary activity or concentration vetoes.** Few trades and large winning episodes warrant uncertainty and stress diagnostics. They do not automatically disqualify a candidate.
5. **Test neighborhoods and the selection procedure.** Candidate `08500a60ec56cfae` had attractive neighborhood results, while the broader search procedure struggled chronologically. These are different kinds of evidence.
6. **Use both independent discovery and informed refinement.** Exact known settings belong in reproducibility controls and informed seeds; independent search and historical selection must not inherit future-selected vectors.
7. **Treat partial exits as consequential.** Retention changed standalone Growth profit, drawdown and capital occupancy. Its pooled value must be measured through actual accounting and displaced trades.
8. **Bound memory and make resumption reliable.** Reuse proven infrastructure where suitable; do not repeat the original worker/typed-array OOM failure.

## Controls: reproduce, then compare on common conventions

Extract complete canonical configurations, including inactive/default values and costs, into versioned machine-readable fixtures. Verify supplied values rather than silently guessing missing parameters.

### D1 controls

Use both the shipped VGT D1 `primary` and the VGT component of **Study 8 rank #2 VG Balanced**. The latter is `s8-vg-balanced` / `S8-VG-F24-3`, VGT candidate `d1-bd80e32ee4`. Do not confuse the configuration suffix 3 with rank 2 or use Study 7's similarly named alias.

| D1 parameter | Shipped VGT primary | VG #2's VGT component |
|---|---:|---:|
| targetPercentChange | 21.6% | 23.5% |
| trailingBuyPercentage | 0.3% | 0.9% |
| trailingStopPercentage | 7.3% | 7.4% |
| maximumHoldDays | 8 | 15 |
| tickWindowSize | 74 | 78 |
| intradayLossBuffer | 2.9% | 4.4% |
| pullback | 9.0% | 11.0% |
| continuationWindow | 60 | 55 |

Run the VG #2 VGT component by itself for the VGT-only comparison; do not attribute the VGT+GDX pool's entire profit to VGT. The full VG #2 pool can appear as clearly labeled external context, not the primary like-for-like benchmark for a VGT-only task.

### Growth controls

Candidate **`08500a60ec56cfae`**, Growth 1.4.0:

```json
{
  "entryMethod": "rise_from_recent_low",
  "advanceFromRecentLowPercent": 1,
  "recentLowLookbackBars": 80,
  "trendFilterEnabled": true,
  "trendMethod": "price_change",
  "trendChangeLookbackSessions": 10,
  "trendChangeMinimumReturnPercent": -5,
  "eligibilityEnabled": true,
  "eligibilityPolicy": "reset_renew",
  "eligibilityMaxAgeSessions": 24,
  "eligibilityResetDropPercent": 5.5,
  "eligibilityRenewalReboundPercent": 5,
  "drawdownRecoveryGateEnabled": true,
  "dipLookbackSessions": 90,
  "dipThresholdPercent": 2,
  "recoveryRetracementPercent": 30,
  "recoveryConfirmationSessions": 4,
  "trailingStopPercent": 9,
  "maximumHoldEnabled": false,
  "initialStopEnabled": true,
  "initialStopAtrSessions": 55,
  "initialStopAtrMultiple": 1,
  "retentionEnabled": true,
  "retentionSellPercent": 50,
  "retentionSmaSessions": 160,
  "retentionClosesBelow": 1,
  "continuationEnabled": true,
  "continuationMethod": "ma_cross",
  "continuationWindowSessions": 50,
  "crossSmaBars": 110,
  "crossRisingBars": 19,
  "crossMinimumSlopePercent": 0.4,
  "crossMarginPercent": 2.75,
  "costBpsPerSide": 5
}
```

Native daily-signal reproduction targets: development net $115,509.15 and max minute DD $19,344.80; full-history net $160,974.09, realized $151,597.87, unrealized remainder $9,376.22 and max minute DD $19,344.80, with 5 closed winners, 3 closed losers and 1 open position. Reported validation net is $45,464.93; separately rounded period totals may differ by a cent. Recover the exact effective configuration from the frozen study; an inactive loss-buffer value must not accidentally become active.

Also use Growth **#4**, ID `420cd989e4fa7749`, extracted from canonical `control4`: Rise 5%, recent-low lookback 90, price-change trend 30 sessions / −2%, time-limited eligibility 20 sessions, drawdown gate 60 / 10% / 45% / 2 sessions, trailing stop 6%, maximum losing hold 21 days, intraday buffer 2.9%, initial ATR stop 20 sessions × 1.5, retention OFF, shallow-pullback continuation with window 60, SMA 50, slope period 10, minimum rise 0%, pullback 1.5–8%, recovery 1%, costs 5 bps/side. Verify the complete fixture from source. Native targets: development net $92,575.71 / DD $14,578.10; full net $145,468.46 / DD $14,578.10.

These full-history targets are already-known engineering checks, not optimization feedback. Isolate parity output from search selection; do not inspect new validation behavior during development.

### Date and accounting harmonization

First reproduce each source under its **native** conventions. Study 8 normally arms on 2017-06-15, while the Growth controls trade from the 2016 window. This mismatch must not remain hidden.

For the primary joint study use a common earliest permitted funding date of **2016-01-04**, with each indicator requiring its real causal history. Do not invent pre-window history, backfill missing indicators from future observations, or optimize the start date. If pre-2016 warm-up data exist, freeze a common available warm-up policy and use it in every paired control. Otherwise warm up from the loaded 2016 data and record when each family first becomes eligible. Native D1 reproduction remains separate from this explicitly harmonized start-date experiment. Include the common 2017-06-15 funding start as a prespecified sensitivity, not a replacement chosen after results.

Primary costs: 5 bps per executed side, $0 commission; 11% simple annual interest on actual outstanding principal, 365 calendar-day basis. One fixed $100,000 budget, no compounding or external capital. Reconcile any differences between canonical D1 and Growth cost/share conventions explicitly. Use a single documented pooled ledger for comparable economics; show any resulting bridge from native source figures to harmonized controls. Do not call a deliberate convention change a parity match.

## Phase 1 — Define and verify the combined engine

Use one chronological minute timeline and a portfolio-level cash/principal ledger. Growth retains its canonical daily signal bars, while its minute-level gate and exits remain minute-level; preserve D1's canonical signal timing. Do not coarsen minute risk evaluation to speed the search without separately demonstrating exact equivalence.

Evaluate two limited allocation architectures, each with independently optimized trading parameters:

**A. Exclusive slot:** one funded family at a time, $100,000 initial principal. A retained Growth remainder continues to occupy the slot until its final exit; repaid principal stays idle meanwhile. No forced switches.

**B. Shared residual capacity:** at most one live funded lot per family, potentially simultaneous holdings of the same ETF. A partial exit releases its repaid principal for a subsequent valid opportunity. Initial per-family target sizes are search parameters chosen from a modest frozen grid of fractions of the original $100,000 budget; actual admissions cannot exceed available principal capacity. A larger target may not be topped up later. Specify a sensible minimum executable allocation and round-share convention before results, and report how much those choices bind. Keep funds fungible: do not accidentally turn this into two permanently segregated accounts.

For B, retain 100%-target first-entry designs so that a Growth partial sale can naturally admit a smaller D1 lot. Also permit smaller initial targets so a first trade need not occupy all capacity. No profit reinvestment: available principal capacity equals $100,000 minus outstanding funded principal and pending reservations. Marked appreciation is not extra capacity. Report peak market-value exposure separately; 100% principal allocation is not a cap on appreciated market value or drawdown.

Across both architectures:

- Define event order, reservations, next-trade execution and close/open handling precisely; no reuse of a bar's future range to justify an earlier decision or fill.
- Fresh earlier executable signals take available capacity first. Restrict same-time priority to a small declared discrete choice (D1-first versus Growth-first); jointly search this where it changes behavior. Do not add an unconstrained learned allocator, hindsight ranking or preemption in this study.
- Choose and document a consistent canonical signal-lifecycle contract for each family. D1's shadow trades and Growth's invested/flat state affect subsequent eligibility and continuation. Use independently maintained canonical virtual books as the initial signal-source design; funding refusals must not silently rewrite them. Each actual funded lot must nevertheless have its own correct shares, costs, interest and exits. Demonstrate when a funded lot can track its canonical virtual lot and when it must diverge. Never inherit gains or a holding age from before actual funding. Distinguish virtual exits/continuation from real capital releases.
- Do not replay a previously refused signal merely because capital later frees. Priority 1's delayed D1 funding feature stays OFF. Growth's native persistent eligibility remains an available Growth parameter, with its own causal lifecycle; specify how a genuine later Growth eligibility decision differs from replaying a refused funding event. Prevent repeated funding of one opportunity and any duplication while that family already holds a real lot.
- Each family manages its own lot with its own exits. One family's stop does not liquidate the other. No pyramiding within a family, synthetic netting that hides gross exposure, or double counting of the same shares.
- When both families request more than available capital, log the demand, grant, refusal or downsize and reason. No later knowledge may change the allocation.
- Any additional architecture beyond A/B requires a justified protocol amendment before its results; do not turn disappointing results into unlimited design search.

Before substantive optimization, prove singleton/feature-OFF parity, event causality, funding caps, partial-sale accounting, independent exits, actual-entry initialization, simultaneous decisions, terminal marking and continuous year-boundary accounting. Show a small ledger example of partial release followed by another family's admission. Fully test the finalist qualification/validation pipeline on synthetic or development-only pilot cases, including expected failures, before relying on it.

## Phase 2 — Joint search: Study 8 scale, adapted to this problem

Each candidate encodes **all active D1 parameters + all active Growth parameters + allocation architecture/parameters**. Every fitness evaluation is a complete pooled replay. Do not optimize each family separately and merely combine the winners. Independent screens may accelerate initialization, but allocate substantial direct joint exploration and allow combinations whose components would fail standalone filters.

Search all eight D1 coordinates and the meaningful Growth 1.4.0 entry, trend, eligibility, recovery gate, initial stop, losing-hold, loss-buffer, trailing stop, retention and continuation choices. Respect conditional dependencies and supported bounds. Include both Rise and breakout Growth entries, and gate ON/OFF. Canonicalize inactive parameters and behaviorally duplicate candidates. Retain exact incumbent settings and use finer supported resolution around promising regions; do not omit values such as 45% retracement or a 2.9% buffer merely because the coarse grid misses them.

Read Study 8's actual Sobol/LHS, NSGA-II, constrained ranking, successive neighborhood rungs and refinement implementation. A suitable starting scale is its VG schedule: thousands of screen proposals, at least four independent evolutionary islands with population around 64 and roughly 2,048 new joint proposals per island, followed by 16/64/128-point neighborhood rungs, diverse refinement starts and independent finalist confirmation. **These are a planning reference, not a claim that 16-dimensional budgets adequately cover this larger conditional space.** Use the pilot to size and freeze explicit budgets per architecture/entry structure, actual fresh joint proposal counts, neighborhood evaluations, generations and compute estimates. Do not replace this with Priority 1's 60-setting enumeration or stop at a fixed-configuration comparison.

Separate:

1. **Independent search:** broad joint initialization without incumbent vectors or archive-selected seeds. It can use prespecified schema-based ranges and a frozen methodological design.
2. **Informed search:** joint exploration around the known Growth candidate, #4, D1 controls and useful development-only archives. Both families' parameters must remain mutable; do not permanently lock one component to its seed.

Give both lanes meaningful budgets and disclose their provenance. Within them protect exploration and promotion across A/B, Rise/breakout, recovery gate ON/OFF, and relevant exit structures. Do not require every stratum to supply a finalist if none qualifies. Show coverage and attrition rather than reporting only a large aggregate evaluation count.

Use multiple deterministic seeds, appropriate mixed/discrete operators, behavioral deduplication and a frozen bounded saturation-extension rule. Publish the budget and protocol before substantive searches. Stop when the prespecified search/refinement/saturation budget is exhausted; no repeated validation-driven extensions. Keep all results, including failed or dominated configurations.

## Objectives, robustness and selection

Rank the **pooled** profit–drawdown frontier. Keep center net profit visible, and prominently use neighborhood median/lower-tail profit and upper-tail DD. For example, the prior Growth study's robust-profit statistic, half median plus half 10th percentile, is a reasonable declared ranking dimension, not a replacement for actual dollars. Freeze precise objectives, constraint handling, role selection and tie-breaking before results.

- Historical center maximum minute DD must be **≤ $35,000** for a risk-qualified candidate.
- Use a transparent neighborhood risk criterion such as p90 DD ≤ $35,000, reporting the breach fraction, magnitude and worst observed DD. Do not require every exploratory neighbor to pass by default; that can recreate unintended exclusions.
- Do not impose arbitrary minimum trade counts, $/year floors, 25%-largest-winner caps or equal-family profit requirements.
- Both families must actually receive capital during development for a mixed candidate to be described as such. This is a structural check, not a high activity quota. Identify effectively single-family and merely token participation explicitly. Report paired removal/rerun evidence for each family's contribution; removing a family changes available capital, so subtraction of its booked P&L is insufficient. A negative contribution must remain visible even if the combination qualifies on other criteria.
- Qualification and comparison against controls must be predeclared. Report mixed candidates even if none improves the controls; distinguish a working combination, an attractive historical trade-off, robust improvement and failed qualification.
- Select and freeze a small diverse shortlist and a primary using development only. Preserve high-profit, balanced, lower-DD and structurally distinct useful alternatives. Do not silently select the validation winner afterward.

Perturb all active trading and numerical allocation parameters jointly, and also one family at a time. Check categorical toggles and alternative allocation architectures separately; they are not tiny numerical neighbors. Include small and wider perturbations, boundary/clipping diagnostics and independent random designs for exploration versus confirmation. Use at least **384 independent confirmation draws per finalist**, unless a measured compute constraint is documented before selection and the reduction is explicitly disclosed. Deduplicate and report how many draws actually change trades.

Stress fees (including 10 and 20 bps/side), interest (including 14%), stop slippage and execution timing using correct causal fill assumptions. Measure full-lot and partial-fill costs, lost opportunities, drawdown duration, gap losses and return dependence on the largest winning market episodes. Do not treat repeated trades in the same market move as independent diversification. Distinguish arithmetic contribution removal from causal reruns that change funding availability.

## Phase 3 — Chronological procedure tests and frozen validation

Rerun the **complete independent joint search and selection** at earlier cutoffs within development, e.g. through 2019, 2021 and 2023, followed by evaluations on 2020–2021, 2022–2023 and 2024. Use matched declared budgets and physically restricted data inputs. Do not merely evaluate full-development winners retrospectively on those slices. If a fold has no qualified mixed candidate, report that failure and apply only a predeclared fallback; do not force a favorable narrative.

Known incumbents were selected with later information. They may be descriptive controls at earlier cutoffs, but do not seed the independent historical searches with them. Historical informed searches must use only seeds discoverable by that cutoff, or be labeled retrospective diagnostics and excluded from independent procedure evidence. The methodology itself was designed after examining this history; disclose that limitation.

After the final 2016–2024 selection, freeze settings, role order, primary, test definitions, neighborhoods and code/data hashes. Evaluate the frozen set on **2025–2026 once**, through the agreed endpoint. Predeclared validation perturbations and stresses are permissible but cannot feed back into tuning. Run from the original start continuously across 2024/2025: do not liquidate, reset opportunity states or restart capital at the boundary. Validation P&L is marked-equity change from the 2024 close. Report both boundary-reset validation DD and whole-run DD, including episodes crossing the split. No new validation winner or unplanned rescue search.

## Required comparisons and interpretation

On identical harmonized conventions report:

- the fixed D1 and Growth controls;
- fixed combined controls, with both families actually simulated in the pool;
- independently optimized single-family controls with transparent compute budgets, selected only on development, to distinguish a benefit of combining from a benefit of simply retuning;
- jointly optimized mixed finalists and the frozen primary;
- family-removal and allocation/partial-release ablations as predeclared diagnostics, without reselecting on validation.

A weak fixed combination must **not** prevent the joint search. For every important pair, match unchanged, retimed, newly admitted and displaced trades. Show whether improved profit comes from better entries, longer exposure, changed risk, lower interest, released capital or blocking harmful trades. Report family P&L attribution while emphasizing that its causal contribution differs from its booked profit.

Tables must include development, validation and full-history net, realized/unrealized split, maximum minute DD in dollars and stated percentage, DD dates/recovery duration, trade counts and wins/losses, losing-trade dollars, interest/costs, holding times, funded and market-value exposure, family allocation and open remainders. Use proper currency formatting. Report annual and chronological-fold results, neighborhood distributions, concentration and uncertainty. With overlapping VGT positions, do not claim cross-asset diversification.

## Safe execution and recoverability

Apollo has 64 GB RAM. Use isolated research jobs with **MemoryHigh=44G, MemoryMax=48G**, outside the Claude/tmux session, verified against the actual host. Cap the aggregate workload: independent concurrent units each capped at 48G are not safe together. Serialize heavy stages or place their full process trees under one bounded parent. Account for other host services; reduce concurrency as needed. Keep swap policy explicit; do not alter host-wide security/OOM settings or rely solely on Node old-space limits.

Use bounded queues, bounded caches, disk-backed results, checkpointed island RNG/generations, safe worker processes, controlled garbage collection/recycling where measured necessary, and monitoring of cgroup use, RSS and external/ArrayBuffer memory. Typed arrays caused the earlier OOM and are not adequately bounded by old-space limits. Checkpoint at least once per minute and every generation/stage, and stop gracefully before the hard cap. No automatic crash loop.

Before scaling, pilot load, parallelism, failure paths and full result persistence. Test graceful interruption, abrupt worker death and research-unit termination; resumption must yield the same configurations, selection and results as uninterrupted execution. A worker failure must fail/checkpoint the job rather than hang. Parity/test failures stop dependent research immediately. Record peak aggregate memory, OOM events, worker counts and completed versus cached evaluations. Do not let long jobs depend on an SSH connection remaining open.

## Deliverables and stopping point

Create a new research directory such as `research/vgt-d1-growth-joint/` with:

1. `README.md`, frozen `PROTOCOL.md`, `AMENDMENTS.md`, `REPORT.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`, exact frozen selection and control fixtures.
2. A documented allocation/state-transition specification, canonical-to-harmonized accounting bridge, parity evidence, causal tests and meaningful repository checks. Distinguish known pre-existing failures from new defects.
3. Complete machine-readable configuration/evaluation records, seeds, code/data hashes, rejected/promoted counts, search coverage, compute/memory logs, archive manifests and deterministic resume instructions. Follow repository policy for large regenerable archives.
4. Funded-lot, partial-fill, funding-request/refusal and state-transition ledgers; pooled equity/DD plots; family contribution, opportunity displacement and allocation-use tables; chronological and perturbation evidence.
5. A clear comparison of the frozen primary and alternatives with controls, using correctly formatted dollar values and explicit denominators. State what the research supports and what remains unproven. Do not imply live deployability or guaranteed risk limits.
6. A section **“Priority 2 review — decision before Priority 3”** stating whether the jointly optimized VGT combination demonstrated useful improvement, whether both families participated substantively, which allocation design was supported, what chronological evidence said, and which lessons carry forward.

Do not start Priority 3. That is the separately reviewed **joint D1 + Growth VGT+GDX pool**, not a second stage to run automatically after validation. Return the report, exact settings, branch and artifact locations so the user and ChatGPT can assess Priority 2 first.
