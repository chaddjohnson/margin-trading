# All-61-ETF D1 signal timing, opportunity overlap and shared-capital complementarity (Study 2 of 3)

Study `d1-all61-signal-capital-complementarity-v1`. Question: of the 61 audited ETFs, do any offer **genuinely
distinct and economically useful D1 opportunities under one shared $100,000 margin slot** — when B4/B5's slot is idle,
or by competing for it — rather than dipping in the same market shocks? What do real entries, exits, occupancy and
full allocator paths show that return correlation and standalone profit cannot?

**Status: COMPLETE. Outcome (frozen rubric): no demonstrated economically useful complementarity.** Study 1 completed;
**Study 2 completed**; Study 3 (independent momentum-entry research) **not started**. Nothing was promoted, registered or
changed in any pool, phenotype, default, prospective protocol or deployment.

## One-page outcome

- **Signals cluster in shocks.** Under the uniform rule (VGT `primary` on all 61 ETFs, View U), 66% of the 816
  training-era decisions fall in 21 market-wide event families (COVID crash, Q4 2018, 2022); the 19 asynchronous
  ("solo") families belong to XOP, XBI, EWZ, XME and GDX and net +$4,718. 88 ordered ETF pairs with daily return
  correlation ≤ 0.3 still share most entries within ±5 sessions (`PAIRWISE_SIGNAL_TIMING_AND_OVERLAP.md`,
  `INDEPENDENT_EVENT_FAMILIES_AND_REGIMES.md`).
- **The profitable signals arrive when the slot is busy.** B4/B5 hold the slot ~51–52% of the training era. Against
  B5, 68% of the other ETFs' decisions arrive while it is held (their standalone trades sum to +$1.33M across 56
  separate slots); the 59 idle-clean ones lose −$52,477; no ETF has a positive idle-clean total in two independent
  events. Fitted per-ETF phenotypes (View P) show the same (`BASELINE_OCCUPANCY_AND_IDLE_OPPORTUNITIES.md`).
- **Full chronological pool replays (Level C).** 18 predeclared fold replays, candidates chosen ex ante by sealed
  screens: every screen-preferred candidate lost in its evaluation window (−$10k to −$48k); source-selected ones were
  inert (+$496, −$1,418); the only material gains (+$23k to +$45k) came from the XOP timing-only control and are path
  effects, not complementarity (its own idle-clean lots ≈ $0; two are formal reshuffles, the third is also thin),
  unstable across baselines and costs. 0 of 18 meet the complementarity test;
  first-order bookkeeping got the sign wrong in 2 (`EXACT_SHARED_POOL_COUNTERFACTUALS.md`).
- **GDX/XOP/XLE reconciled.** The opportunity map's XOP +$48,199 (reproduced to $0.40) and the screen's first-order
  −$117k measure different things; the gain is a reshuffle that is −$19,932 against B5 and comes with an $88k minute
  drawdown. B5's own GDX book: −$15.7k in fold A, +$58.2k in fold B.
- **Falling knives are contained on the funded pools.** 2022–23: B4 1 falling-knife episode (−$3,284), B5 0; worst lot
  −$5,200; minute drawdown $22,327 / $17,269 — against 87 episodes summed over 54 separate slots (Study 1's unit,
  reproduced). The 60/40 core alone breaches a 30% drawdown (33.9%) (`RISK_AND_FALLING_KNIFE_CONTEXT.md`).
- **Idle capital sits in calm advances** (2017-06 → 2018-12: 384 idle sessions; 2019; 2021; late 2023), when about a
  fifth of the idle time has no deep dip on any ETF and the signals that do arrive lose. This frames Study 3 without
  starting it (`FINAL_COMPARISON_AND_RECOMMENDATION.md`).

**Evidence level:** retrospective, period-correct method replays on inspected history (2016-01-04 → 2023-12-29) with
hindsight-advantaged incumbents; every candidate selection was sealed before its evaluation window was run; no bar
after 2023-12-29 was read; no holdout claim; forward observations: 0.

## Reports

| File | Contents |
|---|---|
| `PROTOCOL.md`, `PROTOCOL_FREEZE.json`, `AMENDMENTS.md` | frozen protocol v2.1 (views, windows, doors, metrics, screen, replay menu, rubric), its freeze, the amendment ledger (one correction, C1) |
| `SOURCE_AND_CONFLICTS_AUDIT.md` | what each earlier study measured, apparent conflicts and why they differ |
| `CANDIDATE_REGISTRY.md` + `results/registry/candidate-registry.{json,csv}` | all 61 ETFs under every view: vectors, status, provenance, caps, flags, NA reasons |
| `SIGNAL_GENERATION_AND_ENGINE_PARITY.md` | engine, observer, gate rule, parity (512 checks), tests |
| `PAIRWISE_SIGNAL_TIMING_AND_OVERLAP.md` | 61×61 matrices, strongest/weakest pairs, correlation vs entry overlap, U vs P |
| `INDEPENDENT_EVENT_FAMILIES_AND_REGIMES.md` | cross-ETF families, solo events, regimes, lead/lag |
| `BASELINE_OCCUPANCY_AND_IDLE_OPPORTUNITIES.md` | B4/B5 occupancy, idle stretches, busy / idle-clean / idle-displacing economics |
| `EXACT_SHARED_POOL_COUNTERFACTUALS.md` | the 25 full-path replays, attribution, first-order vs full path, portfolio |
| `RISK_AND_FALLING_KNIFE_CONTEXT.md` | matched-horizon risk, the falling-knife answer, capacity cost, portfolio drawdowns |
| `CHRONOLOGICAL_AND_MULTIPLE_TESTING_LIMITS.md` | doors, hindsight, comparison counts, disclosures |
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | answers to the eight questions, per-ETF labels, recommendation, Study 3 handoff |
| `IMPLEMENTATION_AUDIT.md` | tests, anchors, freezes, reviews and dispositions, git scope, hashes |
| `RESEARCH_RECOVERY.md` | the task checkpoint |
| `reviews/` | two pre-freeze methodology reviews, the results review (verbatim) with dispositions; superseded protocol drafts |
| `audit/PRIOR_STUDY_NOTES.md`, `brief/STUDY_2_BRIEF.md` | Stage 0 notes; the brief, verbatim |
| `results/` | every sealed stage record and payload (below); `results/tables/` readable tables, CSV exports, SVG heatmaps |
| `scripts/report_tables.py` | read-only reporting (writes only `results/tables/`, verifies every payload hash) |

## Reproducing (repository root, Node v24.21.0; local canonical data; no `.env`, network or broker)

Read-only (sealed records only; nothing is recomputed or rewritten):

```sh
npm run d1-signal-complementarity -- status                       # every stage record and whether it verifies
npm run d1-signal-complementarity -- verify                       # freezes, seals, payload hashes, protected inputs
npm run d1-signal-complementarity -- sources                      # source files, freezes, prospective-freeze check
npm run d1-signal-complementarity -- universe                     # the 61-ETF registry
npm run d1-signal-complementarity -- signals --view U --symbol XOP --end 2023-12-29
npm run d1-signal-complementarity -- pair --view U --a VGT --b GDX --window T
npm run d1-signal-complementarity -- overlap --view P-B --window B --metric s5
npm run d1-signal-complementarity -- occupancy --baseline B5 --window T
npm run d1-signal-complementarity -- candidate --symbol XOP --baseline B4 --view U --window T
npm run d1-signal-complementarity -- events --view U --window T
npm run d1-signal-complementarity -- replays
npm run d1-signal-complementarity -- risk
npm run d1-signal-complementarity -- analysis
python3 -I research/d1-all61-signal-capital-complementarity/scripts/report_tables.py
node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/d1-signal-capital-complementarity/tests/*.test.ts'
```

Write-once stages (in the order they ran; each refuses to rerun and verifies its predecessors): `stage audit`,
`freeze-protocol`, `parity`, `freeze-code`, `screen-A`, `screen-B`, `signals-2020-06-30`, `signals-2021-12-31`,
`signals-2023-12-29`, `leveld`, `replays`, `risk`, `analysis`, then the correction `freeze-code-correction --amendment
C1` and `analysis` again (→ `ANALYSIS-2.json`).

**What the commit holds:** every sealed record and payload — the registry, parity comparisons, both screens with their
ledgers, every standalone trade/setup/continuation ledger of every view and data end, the baselines' funded lots and
every decision, daily closes and price catalogs, all Level D payloads (3,721 ordered pairs per view-window with
numerators and denominators, families, per-ETF summaries with each trade's first-order class), 61×61 matrix CSVs, every
replay's lots, decisions, attribution, risk and portfolio, the risk payload, both analyses, and the tables. From these a
reader can recheck every figure in the reports without trusting a narrative. **Not committed:** command logs
(`results/logs/`, git-ignored by the repository's `logs/` rule; outcomes summarized in `IMPLEMENTATION_AUDIT.md`) and
the canonical minute data (local, `data/` is not versioned; every loaded file's sha256 is in the stage records'
`door` fields and the audit's protected-input manifest). Rerunning a stage needs that data and a fresh copy of this
study tree (stages refuse to overwrite sealed records); the determinism checks (screen ledgers = signal ledgers;
repeated-run hashes) indicate byte-identical regeneration.
