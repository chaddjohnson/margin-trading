# Approved deviations from the Phase 1 design (Fable 5.1) — traceability table

The nine Phase 1 documents in `research/d1-robust-design-review/` are unmodified. This table maps every place where
the authoritative `PROTOCOL.md` differs from them to its reason: **U** = an explicit instruction in the user's Phase 2
assignment (section cited), **T** = a technical resolution made before any outcome (an ambiguity, contradiction or
scale issue in the design), **K** = kept as designed (listed where a reader might expect a change). Fable references:
PP = PROPOSED_PROTOCOL.md, NO = NEIGHBORHOOD_AND_OBJECTIVES.md, WF = WALK_FORWARD_AND_EVIDENCE.md, EU =
ETF_UNIVERSE_AND_DATA_INGESTION.md, RR = R1_R4_RESEARCH_RUN_DESIGN.md, OD = OPEN_DECISIONS.md.

## 1. Risk gates and the neighbourhood penalty

| # | Fable clause | Fable text (abridged) | Protocol | Basis |
|---|---|---|---|---|
| R1 | NO §6.1 F2; PP §10 G2 | DDmed ≤ $35k and DD90 ≤ $45k as hard feasibility (provisional at small n, settled at promotion) and a finalist gate | **Removed as a hard rule.** Replaced by the soft, dollar-denominated penalty in S (PROTOCOL §6.2) with references R_m, R_t calibrated from unoptimized pilot controls by a rule fixed before the pilot (§6.3: Q75 of eligible controls per cardinality stratum, floors $35k/$45k, caps $55k/$75k, sparse-stratum pooling, 'uncalibrated' fallback to the floors, 'extreme' flag); α_m = 1.0, α_t = 0.5 | U §2.2 (1)–(5) |
| R2 | NO §6.1 F1; PP G2 | centre DD ≤ $35k at 5 and 10 bps | **Kept and binding** (discovery at 5 bps; 10 bps from promotion; G2 at both) | U §2.2 (1) |
| R3 | NO §7; PP G2 | portfolio daily % DD ≤ 35% from promotion on | **Kept and binding** (F-P from promotion, G2, C4) | U §2.2 (1) |
| R4 | NO §8.5 (3) | if F2 is met by < 10% of controls, report it as severe and keep it | Severity of the original F2 is still diagnosed and published (PROTOCOL §7.2); it no longer vetoes anything | U §2.2 (2), (4) |
| R5 | NO §6.1 F4 | Q25 ≥ 0 as a (provisional) discovery feasibility constraint | Q25 is a discovery tie-breaker only; Q25_A ≥ 0 remains a finalist gate (G5) | U §2.3 last bullet (distinguish ranking from disqualification); T (Q25 at n_D is the 3rd–6th order statistic) |
| R6 | — | J = P50 − λk is the objective | S (risk-aware) is the objective in discovery, promotion and refinement; **J0 = P50 − λk is reported beside S** everywhere | U §2.2 (5) |

## 2. Materiality and sampling uncertainty

| # | Fable clause | Fable text | Protocol | Basis |
|---|---|---|---|---|
| M1 | NO §8.5 (1); PP §4 | M_w = max($25,000, median MAD of k ≤ 6 controls), pilot-calibrated | **M = $25,000 fixed** (doubled to $50,000 when the candidate's training portfolio daily % DD ∈ (30%, 35%]); not pilot-dependent; MAD is never used as a standard error of a difference | U §2.3 |
| M2 | NO §5 | "indistinguishable when confirmation P50 intervals overlap"; M ≈ 2 × pooled SE + economic minimum | **Paired bootstrap** of the difference of medians on identical CRN draw indices (10,000 resamples); G6 requires the 90% interval's lower bound > 0 in addition to Δ ≥ M | U §2.3 |
| M3 | PP §10 G6 | Q25_A(C) ≥ Q25_A(B5) and P50/DDmed ≥ 0.90 × B5's | Both **dropped as gates** (reported); replaced by S_A(C) ≥ S_A(B) so that materiality cannot be bought with neighbourhood risk | U §2.3 (avoid duplicate vetoes); T |
| M4 | PP §10 G6 | materiality versus B5 and B4 | versus **both** B4 and B5 under identical data, costs, windows and draws (kept) | K / U §2.3 |
| M5 | PP §10 G1 | confirm-A/B P50 differ by ≤ 2 × pooled SE (a gate) | **Removed from the gates.** confirm-B is computed only after `FROZEN_SELECTION.json` (`confirm-b` command) and only reported, with the A/B disagreement | U §2.1 ("a selector cannot see its independent reported confirmation B samples"), §2.3 ("must not be used to re-rank or rescue") |
| M6 | PP §8 | refinement accepts a move when J rises by more than M/5 (≥ $5,000) | δ = **$5,000 fixed** (paired CRN) | T (follows M1) |
| M7 | PP §7 (3) | promotion ties within M/2 | ties within **$12,500** (= M/2 at M = $25k) | T (follows M1) |

## 3. Activity and evidence

| # | Fable clause | Fable text | Protocol | Basis |
|---|---|---|---|---|
| A1 | NO §3.2, §6.1 F3 | every member ≥ 3 virtual trades and ≥ 2 funded lots, and ≥ 12 funded lots in ≥ 3 years, as feasibility in discovery | **Not a discovery exclusion.** Rare books compete under λ. At nomination: pool ≥ 12 lots in ≥ 3 years (folds ≥ 8 in ≥ 2); every member's smoothed leave-one-out marginal S_A(C) − S_A(C∖i) > 0 (removes inert and harmful members); member evidence graded 'standard' (≥ 3 virtual trades, ≥ 2 funded lots, lots in ≥ 2 regimes) or 'thin' (labelled, never called robust) | U §2.4 |
| A2 | PP §10 G3 | smoothed marginal (J with − J without, n = 64) > 0 | the same on the `confirm-A` draws with S | T (one instrument) |
| A3 | PP §9 | one-member exclusions | additionally record each member's funding/refusal conflicts, funded lots by regime episode, and net/DD without it | U §2.4 |

## 4. Walk-forward

| # | Fable clause | Fable text | Protocol | Basis |
|---|---|---|---|---|
| W1 | WF §2 | folds a (≤ 2020-06-30) and b (≤ 2021-12-31) | kept exactly | K / U §2.5 |
| W2 | WF §2 fold a0 | optional descriptive pre-crash round | **decided before any search: not run** (too few eligible lots; an extra look at 2020) | U §2.5 ("decide and freeze whether to run it") |
| W3 | WF §5 | ablation arm Q in discovery and promotion; "refinement is not ablated" | arm Q runs the **same architecture** (discovery, promotion, refinement, assessment) with the peak objective, identical seeds and configuration budgets | U §4.E ("same optimizer architecture and adequately comparable compute budgets") |
| W4 | WF §3 (3) | the round's pick(s) from "assessment exactly as in the final round" | explicit fold pick rule: the final gates without the benchmark gates (G6, G7: B4/B5 saw the validation years), activity floor ≥ 8 lots in ≥ 2 years; arm Q by the gates' centre analogues | T (Fable leaves the fold pick rule implicit) |
| W5 | WF §6 | G-WF (i)–(iii) | kept; a fold with no J pick fails (ii); validation DD defined with the peak reset at the search end | T |
| W6 | WF §4 B5 | universe from whole-file integrity scans | kept; disclosed | K |
| W7 | WF §4 mutation test | fixture universe, post-cutoff prices +3% | through the real loader on fixture CSVs in a temporary data directory | T |

## 5. Universe and ingestion

| # | Fable clause | Fable text | Protocol | Basis |
|---|---|---|---|---|
| D1 | OD D5; EU §3 | Tier 1 mandatory; Tier 2 if within the ingestion budget | Tier 1 and **Tier 2 both attempted** (breadth authorized); AGG chosen over BND before data | U §3.1 |
| D2 | EU §2 D4 | exclude funds with an index/strategy change documented inside the window | **objective or asset-class changes** exclude; routine reconstitution and GICS reclassification (which affected VGT/XLK/XLY/XLF alike) do not — otherwise the rule would exclude VGT, which the user requires eligible | U §3.1 (VGT eligible on equal terms); T |
| D3 | EU §2 D3 | the verifier's 30% split rule | kept, plus an audit listing of unexplained overnight moves beyond ±15% (a 5:4 split would escape the 30% rule) | T |
| D4 | EU §8.1 step 7 | on failure keep staging and logs; "import already guarantees no partial canonical file" | additionally: a newly created, unverified `data/<SYMBOL>/` (the import CLI writes `dataset-report.json` even on a failed import) is moved atomically to `data/quarantine/` with a reason file | U §3.2 |
| D5 | EU §8.1 step 0 | export the variables from `.env` in the shell | the Node orchestrator reads `.env` itself and passes the two values only in the child's environment; logs are redacted; a dummy-credential leak test | U §3.2 |
| D6 | EU §4 | top-up islands alphabetical until the 15% reserve is exhausted | the reserve is **shared equally** among under-covered symbols (≥ 100, ≤ 1,000 each) | T (alphabetical exhaustion would starve late-alphabet symbols) |
| D7 | PP §6 | 16,000 configurations per final arm for |U| ≈ 40 | 16,000 × max(1, \|U\|÷40) per arm (folds half), coverage floor scaled likewise — set before |U| is known | T (keeps configurations per symbol at Fable's density; U §6 permits a predeclared larger tier) |
| D8 | PP §6 I7 | singletons: each symbol with 2 library vectors | 48 distinct symbols in a seeded order (population 48 < 2 × \|U\|); coverage top-up covers the rest | T |
| D9 | PP §6 migration | 4 genomes from the source's first front | 4 genomes from the source's best 12 by the scalar ranking (there is no Pareto front) | T |

## 6. Dividends, costs, brokerage

| # | Fable clause | Fable text | Protocol | Basis |
|---|---|---|---|---|
| V1 | EU §7; OD D6 | symmetric portfolio convention for gates, frozen reported | kept | K / U §2.6 |
| V2 | EU §7 | omission bounds at 1/3/6%; optional ex-date calendar | for nominees and benchmarks after the freeze: issuer histories, else Alpaca corporate actions, and a fully accounted fixed-pool diagnostic when complete for all compared lot symbols; otherwise bounds; decisions dividend treatment could reverse are marked unresolved | U §2.6 |
| V3 | — | — | an explicit duplicate-cost audit (engine vs replay cost totals) | U §2.6 |

## 7. Freeze order and source authority

| # | Fable clause | Fable text | Protocol | Basis |
|---|---|---|---|---|
| F1 | PP preamble and §13 S0 | `freeze-protocol` **before** ingestion; universe written after ingestion "and frozen with the protocol" (contradictory) | **Resolved:** the complete protocol text is written and its hash committed (`protocol_draft_commitment.json`) before any download; the freeze (`protocol_freeze.json`) is taken after ingestion, the integrity audit and the unit-cost benchmark, and binds protocol + context + universe.json + tier.json; no candidate outcome exists before it | U §2.7 (1)–(3) |
| F2 | OD D3; RR §7 | R1/R4 `all` runs after the protocol freeze, before the search | **after the selection freeze and the locked confirmation** (RR §7's alternative) | U §2.7 (6) |
| F3 | PP §15 | amendments before a stage's first outcome | kept, append-only, mirrored in `results/amendments.jsonl`; technical only, never economic criteria | U §2.7 (3) |
| F4 | PP §12 | tier rule: full if ≤ 36 h single-core or ≥ 6 cores | three predeclared tiers (E extended, F Fable full, R fallback); the first whose conservative projection (no neighbour-trace reuse) is ≤ 20 h wall-clock and ≤ 13 GB; Tier E enlarges independent draws (promotion 96, refinement 48, confirmation 2 × 256), not generations | U §6 |
| F5 | IMPLEMENTATION_HANDOFF §1 | Node 23.6 versus `engines ≥ 24.21.0` unresolved | the study runs on **Node v24.21.0** (installed via fnm); the suite is run on 24.21.0 and 23.6.1; benchmark reproductions to the cent on 24.21.0 are the compatibility check | U §5 |

## 8. Kept as designed (for the record)

Step units, reflection, CRN over the full candidate universe, N1/N1-A2/N2/N3/N0 classes, λ = $5,000, the pilot strata
and per-class draws, the machinery checks, the persistence diagnostic, family clustering thresholds (Jaccard 0.5,
funded overlap 0.5, regime Spearman 0.7), promotion diversity constraints, refinement passes (the membership pass is
bounded to one vector per added symbol and four swap targets per member so the coordinate passes are reached within
the cap — T), confirm-A as the selection batch, C1–C4, evidence grades E0–E4, capacity threshold 0.10, the
retrospective label and isolation, the stop rules.

## 9. Technical additions from the independent pre-freeze code review (T; before any outcome)

| # | Clause | Change |
|---|---|---|
| X1 | PP §7 (3) / §8 | the diversity requirements (compact family, family far from B5, unseeded in the top three) apply to the **refined** set, so a required family is refined and assessed rather than promoted and dropped; a required family is never evicted |
| X2 | PP §7 (2) | families are formed among candidates passing F1 at 5/10 bps and F-P only (infeasible ones cannot chain two families) |
| X3 | WF §6 | a fold with fewer than 10 eligible controls, or a non-finite control quantile, has no comparator and fails G-WF (i)–(ii) |
| X4 | NO §8.3 | the pilot's shareAbove machinery check counts exact ties (neighbours whose net equals the base) one half (mid-rank); strict share and tie share reported |
| X5 | PP §12, IMPLEMENTATION_HANDOFF §6 | a code manifest (every `src/**/*.ts` except tests and the report writer) is bound by the sealed protocol freeze; amendments are hash-chained from the frozen head and refused once the affected stage has an output; every outcome stage verifies data files against audited hashes, the split registry, ledger and partitions, and that controls and parity passed |
| X6 | NO §4 | configuration and cache keys use the full eight-value grid; the D1 candidate ID (a 40-bit hash prefix) is a label only |
| X7 | PP §6 | island cap = (arm budget − 15% top-up reserve) ÷ 8 (the reserve is part of the arm budget) |
| X8 | WF §5 | the Q arm ranks by Q, ties by centre drawdown then key (§6.4), not by the J arm's M/2 tie rule |

## 10. Amendment after the freeze

| # | Clause | Change |
|---|---|---|
| A-1 | NO §8.3 ("shareAbove pooled over active controls") | the frozen protocol had pooled *eligible* (drawdown-feasible) controls — an unlisted transcription deviation that conditioned the check on a centre outcome and failed it in all three windows; amendment 1 (POST-OUTCOME, disclosed in PROTOCOL §24) restores Fable's "active controls". No constant, gate or selection is affected. |
| A-2 | this protocol §12, §14–§17, §21 (implementation of the final round, freeze, confirm-b, evaluate and the R1/R4 runner; no Fable clause changes) | amendment 2 (PROTOCOL §24; before any output of those stages): technical fixes from the independent pre-search review — `evaluate` fails closed on nominees without the §16 dividend diagnostic; only a primary-eligible nominee can be the forward-test candidate; the C0 same-dates drawdown is computed; inspected-vector, inspected-neighbour and G7-extrapolation labels; a fuller, cross-checked selection freeze; confirm-B intervals and the R1/R4 hash check; ordering guards; the retrospective runner's convention, provenance and freeze checks; partial final runs kept. No search, objective, constant, gate, ranking or selection rule changes. |
| A-3 | this protocol §15.1, §21 | amendment 3 (PROTOCOL §24; after the final search, before the selection freeze): the freeze binds every record it lists (refusing a missing one) incl. refinement, pilot and determinism records and recomputes the nominations; the R1/R4 runner checks that the evaluation record belongs to this freeze and that confirm-b ran, asserts the window end, is write-once per run, and hashes the whole 16-ETF study directory before and after. Integrity only. |
