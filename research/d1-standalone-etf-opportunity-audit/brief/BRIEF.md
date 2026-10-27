# Claude Opus 5.5 (Extra High) — D1 standalone ETF opportunity-capture and robustness audit

## Assignment — execute the complete study, not merely design it

Conduct a **separate, diagnostic-only research project** to discover whether any of the **61 previously optimized ETFs**, traded **standalone** with the existing D1 strategy, has more compelling historical evidence than **VGT `primary`** for repeatedly capturing major dip-and-recovery opportunities at acceptable drawdown and borrowing cost. Compare the strongest *historically defensible* standalone candidates with VGT `primary` and the unchanged B4/B5 shared-pool benchmarks. **Do not perform another blanket optimization, change D1, build momentum entries, or optimize a new pool.** This study is wholly separate from the proposed momentum-entry study.

**Core premise:** D1 was intentionally designed to capture **infrequent, unusually profitable rebounds** after substantial declines. **Profit concentrated in a few exceptional trades is expected, not an automatic defect or reason to eliminate an ETF.** The decisive questions are whether the rules identify economically meaningful correction/recovery episodes **reliably across nearby parameter configurations**, whether the gains compensate for losing trades, interest and execution costs, and whether drawdowns remain acceptable. Do not optimize for a smooth, evenly distributed annual equity curve or mechanically reject candidates based on top-three-profit concentration. Low trade count still limits confidence in repeatability; distinguish that evidentiary issue from supposed strategy invalidity.

**Execute all authorized stages in this assignment**, write reproducible results and an independent review, and present an appropriately skeptical final recommendation. It is acceptable—indeed important—to conclude that none of the 61 has sufficient evidence to replace VGT or B5. Do not ask for approval between routine milestones. **Do not deploy trades or connect to a brokerage.**

## 0. Repository state, safety, and project instructions

1. Start by inspecting `pwd`, Git branch/status/upstream, README, root `CLAUDE.md`, the imported `docs/claude/context-recovery.md` (or equivalent actual location), and the relevant research-recovery records. Follow the repository's persistent instructions. Maintain a task-specific `RESEARCH_RECOVERY.md` checkpoint so another Claude session can resume after compaction. Do not assume the path or branch from an earlier discussion is necessarily current.
2. Preferred parent is the most recently completed and pushed `research/vgt-standalone-vs-pooled-robustness` branch, **if verified to contain** the completed VGT standalone and B4/B5 robustness audits and existing ranked-preemption standalone artifacts. Create a distinct branch named `research/d1-standalone-etf-opportunity-robustness` from the verified parent. If the parent cannot be verified or a branch of that name already exists, investigate safely; do not overwrite, reset or force checkout. Carry across **no** uncommitted unrelated work. Protect any pre-existing local `research/btcusdt-d1/` work and ignored dataset files.
3. Read only, and preserve byte-for-byte, all existing `config/` phenotypes/pools and their data pins; the 61-ETF ranked-preemption records and manifests; the B4/B5 robustness audit; the VGT standalone audit; all prospective/frozen protocols and their bound code; canonical `data/<SYMBOL>/data.csv` files and metadata; and earlier frozen research. No changes to the existing engine's semantics, portfolios, stop rules, accounting conventions or prior study records. Do not add research-only candidates to the production phenotype registry, or make them eligible for live trading by default.
4. Put new code under `src/d1-standalone-opportunity-audit/` (or an equally isolated verified namespace) and outputs under `research/d1-standalone-etf-opportunity-audit/`. If a new `package.json` script is useful, keep that change minimal. Never call the old studies' write/optimization commands or rewrite their sealed results.
5. **Git delivery:** after completing this independent research and passing verification, commit **only this study's reviewed files**, then push **only this new research branch** to `origin` and verify remote HEAD and upstream. This is a research-branch archival push, not a merge, PR approval, live deployment, or change to default configurations. If the working tree contains unrelated or sensitive files, exclude them; if safe delivery is blocked, stop the Git step and explain precisely. No force-push. (The user's recent workflow requests completed research branches to be committed and pushed.)
6. No network data downloads, broker actions, .env/secret reads, machine-level hooks, new global Claude settings, or accidental inclusion of giant raw datasets. Existing local canonical minute data are the only input. Preserve reproducibility using hashes/seeds; do not require machine-specific absolute paths.

## 1. Ground truth and existing studies to read first

Read the actual artifacts and verify their location, timestamps, schema, constraints, eligibility and hash status rather than blindly trusting these illustrative paths. At minimum inspect:

- `research/d1-ranked-preemption/STANDALONE_SCREENING.md` and/or the actual equivalent; its original `PROTOCOL.md`, `MANIFEST.json`, `results/standalone/{fold-a,fold-b,final}/STAGE_A.json`, per-symbol `standalone/<window>/<SYMBOL>.json`, the phenotype library `standalone/<window>/phenotypes/`, archive metadata, and `results/tables/standalone-<window>.md`.
- The existing ranked-preemption frozen R1/R2 rankings as **descriptive source records only**. They are **not** the scoring objective or a new priority allocator. See `FROZEN_PRIORITY_RANKINGS.md` where available.
- `research/vgt-standalone-vs-pooled-robustness/{VGT_PHENOTYPE_INVENTORY,FINAL_COMPARISON_AND_RECOMMENDATION,PARAMETER_STABILITY,TRADES_YEARS_AND_REGIMES,PORTFOLIO_RISK_AND_CAPITAL_EFFICIENCY,PROTOCOL}.md` and its manifest/records.
- `research/b4-b5-robustness-audit/{PROTOCOL,FINAL_ASSESSMENT,PARAMETER_STABILITY,ETF_ABLATION,COST_AND_EXECUTION_STRESS,TRADE_CONCENTRATION}.md` and their canonical stored results.
- `config/phenotypes/D1/VGT.json` `primary` (the only registered/frozen standalone VGT D1 phenotype), `config/pools/B4.json` and `config/pools/B5.json`, the existing `npm run vgt-robustness` and `npm run pools` CLIs, and existing shared-runner/parity tests.

**Known verified context to reconcile, not overwrite:**

- The prior ranked-preemption procedure gave **all 61 eligible ETFs** initial standalone D1 optimization in three windows. The previous summary reports **2,048 Sobol parameter vectors per ETF per window**, local refinement, neighborhood screening of up to eight vectors, and a library of up to four behaviorally distinct research-only standalone phenotypes. The search ends were **2020-06-30 (fold-a), 2021-12-31 (fold-b), and 2023-12-29 (final)**. Verify the archived counts and selection rules, including the recorded failure of the *pooled* exploration-reserve eligibility rule; do not carry that rule into standalone screening.
- Historical chronological validation windows, where previously computed, were **2020-07-01 to 2021-12-31** (fold-a) and **2022-01-01 to 2023-12-29** (fold-b). The 2024–2026 history has already been repeatedly inspected, and old final-round research candidates were not authorized for post-2023 evaluation. **Do not circumvent any stored study's restriction** on running its sealed research-only finalists on later data.
- VGT standalone `primary` (S), B4, B5 and core-only (C0) anchors from the completed audit at 5 bps per side, 11% interest, on the full **previously inspected** 2016-01-04 to 2026-10-13 dataset:

  | Baseline | Fixed $100k net | Fixed minute max DD | Funded lots | Portfolio end equity | Portfolio max daily / minute DD |
  |---|---:|---:|---:|---:|---:|
  | S, VGT `primary` | $176,260.47 | $19,534.41 | 21 | $2,958,025.76 | 32.78% / 35.21% |
  | B4 | $284,244.74 | $28,659.34 | 76 | $3,608,484.05 | 34.65% / 37.01% |
  | B5 | $486,207.77 | $26,509.97 | 94 | $5,410,976.72 | 29.67% / 31.09% |
  | C0, 60/40 VOOG/VGT, no margin | n/a | n/a | n/a | $2,279,768.98 | 33.89% / 35.76% |

  These are **full-inspected-history regression anchors**, **not comparable evidence for new final-round research-only ETF picks restricted to 2023**. Verify to the cent under exactly the same costing, adjustment and date conventions before any new conclusions.
- VGT `primary` has **no registered VGT `lowDd`**. Old VGT `lowDd` labels are unregistered research vectors and must not be presented as alternate deployed phenotypes. VGT `primary` was historically profitable with only 21 funded lots; top three winners were 65.7% of total net. That concentration is **compatible with D1's intended payoff distribution** and is not an exclusion threshold. The completed audit found 100% of its sampled eight-parameter neighbors historically profitable, with ~70% median retention; these samples are not future-evidence probabilities.

## 2. The research question and evidence boundaries

The principal questions:

1. Among the **already generated** 61-ETF standalone D1 research phenotypes, are there specific ETFs with stronger **robustness of major-opportunity capture**, after costs, than VGT `primary`?
2. Are the promising results broad to modest parameter perturbations, alternative research representatives **selected without fresh result peeking**, and distinct historical dip/recovery episodes rather than one exceptionally timed execution?
3. What downside exposure, margin-interest burden, trade scarcity, and portfolio duplication/concentration accompany each candidate?
4. Do any candidates provide a more compelling **historical research case**, for their intended use, than VGT standalone? How do they compare descriptively with **unchanged B4/B5** under a fair common time window, and what remains unknowable until prospective data?

**This is not new performance discovery or an optimization contest.** Evaluate the existing frozen research population, choose an **auditable shortlist based on the existing archive**, and run a **bounded diagnostic audit** of those existing vectors. Never promote the 'best perturbation', replace a candidate with its most successful neighbor, adjust perturbation bounds after seeing results, tune exits to an episode, or retroactively expand the shortlist because of outcomes.

**Evidence tiers must be explicit in every report:**

- **Previously inspected training / development:** all original standalone search and ranking outcomes, the 2016–2023 study data, and all other inspected backtests.
- **Previously inspected walk-forward history:** previously sealed fold-a and fold-b validation records can be reused **as retrospective process checks**, if the source procedure and its permitted uses are verified. Do not manufacture a validation by running a final-2023 selected vector backward and labelling an earlier slice 'out of sample'.
- **Historically inspected 2024–2026:** known B4/B5/VGT references may be reported, but do **not** run research-only final-round ETF phenotypes beyond **2023-12-29** unless a prior controlling protocol expressly permits that specific run. In this assignment **default is no post-2023 runs for new final-round candidates**, even if a generic CLI can do so. Do not peek at data strictly after the candidate's authorized horizon during its assessment.
- **Genuinely prospective:** only new data after 2026-10-13, once collected prospectively under a separate, adopted, frozen validation protocol. Do not load or inspect such bars here. This study produces **no prospective certification** and cannot independently prove that a historical standout will outperform in the future.

A candidate's previously seen validation failures cannot be erased by selecting only its best window or different historical regime. Include negative and inconclusive evidence.

## 3. Stage A — audit the complete existing 61-ETF standalone research archive

Before executing **any new candidate-return or perturbation experiments**:

1. Verify eligibility/universe identity across the three windows, data quality, instrument type, survivorship limitations, splits, timestamp handling, trade eligibility and original cost conventions. Do not silently exclude a disliked, thinly traded or unsuccessful ETF from the catalog. Flag semiconductor funds separately as **research-only/not presumed eligible for the user's eventual holdings**, consistent with the user's desire to avoid adding sector-semiconductor ETFs; don't distort the original study's universe.
2. Construct a full machine-readable **61 × three-window inventory**: ETF, research survivor/screened-down/rejected/uncertain status; original phenotype IDs/parameters and **library alternatives**; trade counts; net after interest and fees; maximum minute DD; worst trade and available MAE/MFE; held days; interest cost; neighborhood median/P10 and profitable share; time-period/episode breadth; original fold evaluation status and unavailable metrics. Clearly distinguish metrics actually stored from metrics the study must compute. Do not invent missing information.
3. Verify provenance for every ranked candidate: **was the vector chosen before or after a particular period was observed?** Do not use a final-window phenotype to claim temporal stability from older fold windows unless separately retrieved period-correct search outcomes support that claim. Multiple snapshots of nearly the same historical opportunity are not separate market episodes.
4. Independently reproduce a **bounded, preregistered sample** of the prior standalone engine outputs (representatives from VGT, GDX, XBI, KRE, XRT, a weak or low-vol ETF, and multiple symbol types) at the original training cutoffs and costs. Require exact parameter identity, data hash, lot counts, gross/interest/friction/net and drawdown parity within explicitly set tolerances; fail closed on material inconsistencies. Reconcile version differences rather than assuming identical engines.
5. Create a **source-of-evidence matrix** showing which original histories/metrics are available and which are barred by prior protocol. Do not re-run optimization.

Produce `ALL_61_STANDALONE_INVENTORY.md` and `.csv`/`.json`, `SOURCE_AND_EVIDENCE_BOUNDARIES.md`, plus a concise parity report.

## 4. Stage B — construct and freeze a diverse shortlist **before** new auditing

Use a **predeclared, inspectable** selection rule applied to the *saved Stage A records*. The shortlist should ordinarily be **8–12 ETF symbols, plus VGT `primary` as a frozen external control**; retain at most **2 distinct existing research phenotypes per shortlisted ETF** (a third only where the preregistered rule demonstrates a genuinely distinct entry/episode footprint), and preserve enough diversity to avoid a top-profit-only list. These are **targets, not a requirement to fill slots if evidence is weak**.

The shortlist must reflect **D1's intended asymmetrical payoff**:

- **Positive standalone net return after interest/friction** with credible downside under the original training procedure; 11% interest and 5 bps per side for the baseline. Reserve a reasonable uncertainty label for few-trade samples; don't overclaim on 2–4 trades. The user's reference risk target is **$35,000 maximum fixed-pool minute DD per $100k**, with portfolio daily DD ideally ≤30%, and up to 35% conditionally. No backtest DD is a future cap.
- **Major-opportunity capture**, not an even distribution of profits. Favor candidates with evidence of capturing one or more substantive independent dip/recovery episodes, reasonable hold times, and nearby configurations that also capture meaningful portions of those opportunities. A large 2020 or 2022 winner may be a sign of the strategy working as designed, not a defect.
- **Parameter-neighborhood resilience** based on the available *preexisting* metrics, prioritizing broad credible performance regions rather than a sharp isolated optimum. Do not require smooth P&L across all years.
- **Tail-loss resilience:** losing-trade and intratrade adverse excursion, financing exposure, stop-rule limitations, and whether one new deep decline could erase several wins.
- **Economic efficiency** including net per trade, net per occupied day and net per borrowed dollar-day, but do not mechanically downrank long successful holds just because they are long.
- **Evidence breadth**: distinguish repeat captures across truly separate drawdown/recovery regimes from repeatedly slicing one episode or many near-duplicate parameter variants.
- **Diverse inclusion**: consider at least one well-supported but lower-ranked robust or contrasting ETF and one higher-upside sparse-trade candidate with an explicit uncertainty flag. Avoid the old pooled reserve defect that scored idleness against 49–54 simultaneously active survivor books; **standalone screening has no single-slot cross-symbol idleness rule**. The purpose is genuine comparison, not a requirement to prefer low-profile candidates.

Do **not** use historical top-3 profit-share as a hard veto or as a monotonic penalty. Report it to quantify reliance on rare opportunities and the strength of evidence. Also don't choose an ETF merely because it was a notable rally winner in 2025–2026; selection must be reproducible from the original research records and allowed training periods.

Write `SHORTLIST_RULES_AND_CANDIDATES.md`, `SHORTLIST.json`, including every eligible symbol's score, reason, missing fields, rejected reason, candidate ID and relevant evidence cutoffs. Require **independent read-only review of the shortlist rule and frozen candidate list**, then seal/hash the list and the complete Stage C/D test plan **before running any fresh candidate robustness result**. Changes afterward must be tracked as amendments and **cannot** use newly seen performance to promote replacements. If an implementation defect invalidates the freeze, stop, document and rerun an honestly new protocol; do not silently repair selection after peeking.

**Benchmark policy:** VGT `primary`, B4, B5 and C0 must be predeclared unchanged. Candidate ETFs have their own original standalone phenotypes; their JSON vectors may be used by this isolated diagnostic runner but must remain **research-only and non-deployable**.

## 5. Stage C — opportunity-centric robustness testing of shortlisted standalone phenotypes

Re-use the completed VGT/B4/B5 audit's **tested** methods, data loader, quantization, cost and drawdown conventions. Compare like with like where practical. Do not copy/alter the underlying engine. If an existing subroutine cannot safely support the selected ETF or historical cutoff, expose the issue rather than implement a divergent semantics engine.

### C1. One-at-a-time and joint local parameter neighborhoods

For each shortlisted *preexisting* standalone phenotype, evaluate:

- Every one of the **eight D1 parameters** at fixed, predeclared small and moderate legal-grid perturbations (OAT). Use 0.1-percentage-point legal grid and integer parameter handling exactly as in the existing `b4-b5-robustness` and `vgt-robustness` protocols; if ranges must differ because original candidate settings differ, preregister a common transformation **blind to resulting P&L**.
- At least **two deterministic, distinct-seed eight-dimensional joint neighborhoods** using a modest predefined sample budget (e.g., 64 per seed, if compute feasible after a blind runtime benchmark). **All eight parameters move together**, as with VGT's prior 8-D test. Record the local neighborhood P10, median, P90, worst, percentage net-profitable, fixed-pool minute DD, share respecting the $35k ceiling, net/borrowing days and portfolio DD when applicable.
- If exact original phenotypes sit at legal grid boundaries, record truncated intervals and supplementary boundary probes only if pre-authorized; never change legal bounds to chase better results.
- **Very important:** the local robustness metric is **not** simply “how close is the median P&L to the selected winner?” It must include **episode-capture stability and downside** (C2). Do not classify a candidate as overfit just because a handful of huge rebound trades produce most of its aggregate gain.
- Record the complete perturbation vectors and outcome distributions. No neighbor becomes a candidate. Do not use the joint results to reorder phenotypes, invent a 'robustness-optimized' vector, or add extra samples because the first seed looks unfavorable.

**Comparability warning:** A single standalone ETF's eight-parameter distribution must be compared primarily with **VGT's eight-parameter neighborhoods** on the same parameter perturbation definitions. B4/B5 32-/40-dimensional neighborhoods measure another property (total pool complexity) and may only be reported separately, not blended into an equal-dimensional stability ranking.

### C2. Major drawdown-and-recovery opportunity capture (**primary scientific diagnostic**)

For each audited ETF, construct a **reproducible catalog of its own objectively defined historical correction/recovery episodes** using only the data through the candidate's permitted cutoff. Include a range of material depths relevant to D1 (e.g., 10%, 15%, 20%, 30%) and distinguish overlapping thresholds on the **same event** from genuinely distinct episodes. Pre-register the event construction, high/trough/recovery/timeout criteria, duplicate coalescing, minimum separation, recovery completion and treatment of incomplete episodes. Do not let profitable trades themselves define the boundaries; avoid selecting winners by hindsight.

It is permissible to identify a market episode's eventual trough/recovery **retrospectively for diagnostic labeling**, but it is **never permissible to use that future trough or price path in entry/exit decisions**. Verify all strategy signals remain causal and minute-fill accurate. Event labels are not a predictive indicator.

For each material episode and for the frozen phenotype plus its neighbors, measure:

- Did it arm on the decline? Was a legally actionable trailing-buy entry produced, and was a trade actually funded? A dip with no entry, a failed rebound, a missed opportunity and an entry that lost money are **different outcomes**.
- Distribution across neighbors of **capture rate / participation**, entry timing/price dispersion, share of available rebound captured (with clear feasible definition and no lookahead-driven trading), net trade P&L, interest and transaction costs, exits/holding time, and worst adverse excursion before exit.
- How often a **major opportunity remains capturable** after plausible changes in parameters rather than requiring one fortuitous minute or exact threshold? If an episode is unavailable because of warm-up, inception, or already-open lot state, label it ineligible rather than a failure.
- Distinguish profitable captures of the same 2020 crash from genuinely separate opportunity families across 2018, 2020, 2022, 2025 etc., where these fall within the allowed training window; **do not evaluate final-round candidates on post-2023 periods**. Do not assume each ETF's key corrections coincide with VOOG's; use ETF-specific data and report common-market context separately.
- How many losses or severe intratrade adverse excursions arose from attempting to enter an ongoing collapse? Identify plausible downside scenarios and how they compare with captured rebound gains.
- Distinguish *number of events* from *number of trades*; several entries inside one correlated event do not equal independent proof. When few qualifying opportunities exist, classify **insufficient episodes** rather than artificially penalizing concentration or declaring robustness.

Create a clear **event-by-event heatmap/table** with the original phenotype and neighborhood capture distributions, optionally a reproducible chart if genuinely useful. Trade-by-trade ledgers must be traceable back to exact bar times/entry/exit reasons and data hashes. Report positive and negative events and episodes with no entry; no success-only case studies.

### C3. Economic and risk stress

Replicate the relevant B4/B5 and VGT audit diagnostics at comparable definition and cost basis:

- Fixed **$100,000 noncompounding one-slot standalone**, one ETF at a time, **11% simple interest**, **5 bps per side** baseline, plus predeclared 0/2/10/15/20 bps cost variations, 8%/14%/18% interest and realistic stop/slippage and combined stress scenarios. Use the existing 19-scenario definitions where available. Re-simulate each path because D1's profitability-conditional stop and continuation logic change with cost; no simple cost subtraction.
- Net and gross per trade; financing, friction, win/loss counts, win sizes, loss sizes, MAE/MFE with minute-data limitations, tail losses, longest drawdowns, trade concentration (descriptive, **not a hard gate**), profit factor, exposure, drawdown (minute and daily) as both **$ and % of $100k**, and duration/interest of open trades.
- Trades and marked-to-market attribution by year/regime; follow source windows rigorously. The base strategy's tail events cannot simply be omitted from the series to calculate a realistic counterfactual because that would change later state. Any 'minus top-N winners' statistic is **attribution only**, not a new backtest.
- Portfolio mode where supported: exact same **$300k, 60% VOOG / 40% VGT core**, margin lots at 20% of marked equity, same dividend convention, same borrowing requirements and passive-only maintenance checks as the frozen comparisons. Report end equity, incremental over C0, max daily/minute **portfolio** DD (not interchangeable with fixed-pool DD), exposure and capital efficiency. If symbol datasets do not line up with the common core calendar, disclose and correct only with allowed chronological intersection and consistent warm-up, not silently.
- **Broker caveats:** no simulated forced sale/margin call, changing house requirement or real quotes; Vanguard 30-day loan-value restriction for VGT/VOOG and real-world ETF liquidity/slippage/capacity. Do not call the strategy 'safe' just because backtest DD fits a threshold. A roughly $35k fixed minute-DD reference is not a stop or guarantee.

Use bounded compute budgets, cache reproducible records outside prior studies, and require exact full-engine parity for tested vectors. Any significant engine mismatch blocks strategy ranking and must be diagnosed, not patched by silently modifying protected source.

## 6. Stage D — chronological / selection-bias analysis (without laundering past data)

This stage must give a frank answer on **temporal evidence**:

1. Reuse any **already computed and protocol-permitted** fold-a and fold-b full-procedure validation for each candidate, with their actual *fold-specific selected phenotypes*, not final-2023 vectors. Show both positive and negative outcomes and whether an ETF's mechanism appears repeatedly in period-correct portfolios. Explicitly label these reused windows inspected retrospective evidence, not fresh forward validation.
2. Quantify **selection among 61 ETFs**: rank stability across fold-a, fold-b and final, variation in entry mechanisms/episode capture when training length changes, and the winner's advantage relative to the cross-sectional distribution. Avoid invalid p-values that assume independent ETFs, independent trades or independent neighboring parameter vectors. Bootstrap, if used, is purely a description of the inspected sample, never a calibrated probability of future success.
3. Assess **research-phenotype selection bias** separately from instrument selection: all original search candidates were optimized to historical data, and the shortlist was chosen by inspecting those stored outcomes. Evaluate local flatness/episode capture but do not claim it removes the original 2,048-vector multiple-testing problem.
4. **Common-window comparison is mandatory** for performance claims. To compare a final-round research ETF through 2023 against VGT `primary` or B4/B5, compute the untouched incumbents under precisely the same **authorized 2016–2023 horizon**, same ETF-calendar and arming policy, same execution costs and fixed/portfolio conventions. Separately present the known full-history 2016–2026 B4/B5/VGT anchors for context only. **Never subtract or compare $ from unequal horizons as an apples-to-apples ranking.** If required prior policies forbid even a same-window computation, report limitation and avoid quantitative head-to-head claims.
5. Keep any already-registered VGT/B4/B5 2024–2026 history and prospective freeze separate. Do not authorize newly selected standalone candidates for 2024–2026 or forward simulation by writing a new config. **No candidate is certified, adopted, or registered.** If there are zero new post-cutoff observations, say zero.
6. The portfolio-core results are economically meaningful but should **not** be treated as a way to search 61 funds and then choose whichever added the most historical wealth after viewing all results. The primary question is whether a candidate's **entry/exit mechanism** shows stable capture and bounded risk in its original allowed training sample.

## 7. Interpretation and selection principles

The final report must answer separately for each leading candidate:

- **Opportunity thesis:** What types of declines/rebounds does D1 try to exploit in this ETF? Does that description make economic sense, or is it just a statistical after-the-fact fit?
- **Capture robustness:** How much of the candidate's important recoveries are captured across nearby phenotypes and across distinct eligible episodes? Are apparently profitable trades dependent on highly precise entry/exit timing?
- **Downside:** Are loss magnitude and intratrade adverse excursion tolerable at the user's $100k lot scale? Could a single unprotected crash trade reasonably erase prior exceptional gains?
- **Evidence sufficiency:** How many meaningful *distinct* events and funded trades exist? If few, report 'promising but unproven', not 'invalid due to concentration'.
- **Economic merit:** Is it robustly net profitable after costs and 11% interest, and is the return attractive per borrowed dollar-day and after full-core risk?
- **Standing:** Compared with VGT `primary` and the already-established B5 strategy, is the candidate (i) a compelling **research-only standalone alternative**, (ii) interesting but weakly evidenced, or (iii) unsupported by the available data? Do not force a numerical winner; major opportunity capture + downside control can be more important than aggregate net.

Predefine **broad categories and warning flags**, rather than an arbitrary weighted score that silently rewards smooth equity curves. Suggested distinct warnings: too few **independent** episodes, bad tail losses, severe drawdowns, neighborhood missing most major opportunities, opportunity strength relies on one minute, cost-driven path instability, uncertain data/entry liquidity and inconclusive temporal evidence. Concentration by top trades is an **exposure/evidence annotation** rather than an automatic rejection.

**No promotion gate based on “top three winners < 50%” is allowed**: such a gate contradicts D1's intended fat-right-tail payoff. Historical net of zero or negative, drawdown breaches and causal/accounting failures still matter. Even a highly profitable, historically robust ETF is not automatically approved for margin deployment or presumed safe.

## 8. Research outputs, tests, review, and usable commands

Deliver a complete, coherent new study directory with (names can be refined for established repo conventions):

- `README.md`: exact reproducible workflow, Node version, artifacts and commands.
- `PROTOCOL.md`, frozen protocol hash/manifest, amendments, data/code fingerprints, cutoff and budget rules.
- `RESEARCH_RECOVERY.md`: exact commands, completed milestones, data hashes, frozen shortlist, processes/log paths, what must not be rerun and context-compaction recovery.
- `SOURCE_AND_EVIDENCE_BOUNDARIES.md`, `ALL_61_STANDALONE_INVENTORY.md` and a machine-readable complete census.
- `SHORTLIST_RULES_AND_CANDIDATES.md`, immutable `SHORTLIST.json`, every symbol's inclusion/exclusion rationale; independent read-only selection review.
- `BASELINE_AND_PARITY.md` plus stored parity evidence for VGT `primary`, B4/B5 and representative existing standalone symbols.
- `OPPORTUNITY_EVENT_CATALOG.md`, `OPPORTUNITY_CAPTURE_AND_TIMING.md` (with per-event successes, misses, losses and parameter-neighbor distributions), and supporting CSV/JSON event-by-event ledgers.
- `PARAMETER_NEIGHBORHOOD_ROBUSTNESS.md`, complete 8-D/OAT outputs and vectors, distributions, diagnostics and event-level stability.
- `COST_AND_TAIL_RISK.md`, `YEAR_AND_REGIME_ANALYSIS.md`, `PORTFOLIO_AND_CAPITAL_EFFICIENCY.md`.
- `CHRONOLOGICAL_EVIDENCE_AND_SELECTION_BIAS.md`, preserving original fold provenance and negative outcomes.
- `FINAL_COMPARISON_AND_RECOMMENDATION.md`: an executive summary table with at least VGT primary, B4/B5 and the shortlisted standalone ETFs on **same-window** comparable metrics, a separate full-history incumbent panel, explanations for any non-comparable cells, strongest evidence for/against each candidate, and an explicit 'none' option.
- `IMPLEMENTATION_AUDIT.md`, independent reviewer response/dispositions, deterministic integrity checks, and final Git commit/push confirmation.

Provide a read-only CLI (e.g. `npm run standalone-opportunity-audit -- inventory|shortlist|show|compare|verify|report`) and optionally a **research-only `fixed` view** to print a selected existing phenotype's trade ledger, date range, costs and net results **strictly limited to its authorized cutoff**. An evaluator CLI must **refuse** attempts to run restricted research-only candidates beyond their permitted training window or to mistake a research-only JSON for a registered production phenotype. Document actual, tested command syntax; no placeholder flags advertised as working.

**Required tests and adversarial checks:**

- Histories/hashes, adjusted prices and timestamps agree with source records; no data access beyond cutoff; post-cutoff mutation does not change earlier outcomes; original sealed protocol and manifest hashes remain unchanged.
- Original optimization records and their provenance are reproducibly read, with missing or incompatible fields explicitly reported.
- All candidate selections and metrics arise from stored pre-audit records and the pre-frozen selection rule. Shortlist hash cannot be altered by examining Stage C results.
- Full-engine parity for fixed $100k single-slot trade logs (dates, entries/exits, interest, friction, exit reasons) and portfolio mode, at multiple symbols and cost settings; report any legitimate engine/version differences.
- Episode catalog deterministic; episodes don't multiply when several depth thresholds trigger inside one price event; no lookahead enters trade signals; no success-only event selection.
- Local OAT/joint perturbations legal and deterministic on the 0.1-pp grid; each research result carries provenance, seed, code hash and dataset hash.
- Interest/friction/stop slippage not double-counted; net = gross − financing − friction; daily/minute drawdown formulas and full-core comparisons verified; sampling windows comparable.
- No source, `config/`, protected research artifacts, prospective pipeline, or existing research result is changed; no PBO/deflated-Sharpe metric invented from incomplete trials.

Use a separate independent **read-only** reviewer agent, if available, to challenge: chronology; the 61-ETF selection process; the treatment of rare winners and missed dips; comparison-window equivalence; neighborhood misinterpretation; and source immutability. Correct presentation/engineering defects without changing a sealed research gate after results; disclose deviations and rerun only what an amendment legitimately authorizes. Run repo tests/TS checks/lint as relevant, in addition to audit-specific tests, and verify the original `npm run pools -- verify`, `npm run vgt-robustness -- verify` and prospective freeze where feasible. Any unavailable check should be disclosed, never asserted passed.

## 9. Staging and execution order (important)

**Stage 0:** Audit state, inspect archives and existing protocols, benchmark runtime and storage **without running new candidate-return experiments**.

**Stage 1:** Read and reconcile all 61 prior standalone research records, report eligibility/missingness and demonstrate source-parity.

**Stage 2:** **Pre-register and hash** shortlist selection, actual shortlist, event-catalog algorithm, parameter ranges, cost matrix, compute budget, treatment of prior cutoff restrictions and comparison-window rules. Obtain independent read-only methodology check. **Only then** run Stage 3.

**Stage 3:** Run deterministic, bounded OAT/joint neighborhoods and dip/recovery opportunity analysis for shortlisted existing phenotypes; write trade/capture ledgers and risk/stress results.

**Stage 4:** Analyze period-correct historical fold evidence, selection bias, common-window VGT/B4/B5 comparisons, portfolio overlay results, and limitations. Do not allow results to change the shortlist or frozen criteria.

**Stage 5:** Independently review, verify all artifacts, render final reports, commit and push the dedicated branch as specified in §0, and report exact Git state and tested commands.

Use the task-local recovery checkpoint continuously and reread it after any context compaction; follow persistent repository instructions. Do not stop after merely producing a protocol. **Do not create an optimizer or merge this with the momentum strategy project.** The primary deliverable is a defensible answer about **robust capture of major declines and rebounds by already optimized standalone D1 phenotypes**.

## Final answer to me

Give me a concise executive verdict first. Then include:

1. Which ETF candidates were shortlisted from the 61 and **why**, and which previously promising high-profit ETFs were **not** shortlisted and why;
2. The standalone opportunity-capture and 8-D robustness evidence for each, including **major winners**, missed episodes, losing entries and whether nearby parameters still capture the winners;
3. Identical-horizon comparisons against VGT `primary`, B4 and B5, with clearly isolated already-inspected full-history references;
4. Profitability, max fixed minute DD, max portfolio daily/minute DD, costs, borrowing efficiency, and key tail-risk caveats;
5. What remains unproven because the original optimization and validation history were already inspected;
6. Whether **any** ETF deserves further **research-only prospective observation**—not immediate live trading or a new registry phenotype;
7. Exact commands I can run, study file paths, independent-review verdict, test status, commit hash, branch name and confirmed remote push.

**Keep all prior strategies and forward freezes unchanged. A null result is a successful research outcome.**
