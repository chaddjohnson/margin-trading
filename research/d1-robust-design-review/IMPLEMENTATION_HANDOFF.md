# Implementation handoff for the Phase 2 agent (Opus 5.5) — a checklist, not a permission

**This document does not authorize implementation.** It is the ordered engineering plan the Phase 2 agent follows
once the user has approved OPEN_DECISIONS.md and a separate implementation assignment has been written. Every
command, path and figure below was read from the repository on 2026-10-25 and must be re-verified at implementation
time, not assumed.

## 1. Prerequisites to verify before writing code

| Item | How to verify | Expected (2026-10-25) |
|---|---|---|
| Branch and tree | `git status --short`, `git log --oneline -3` | branch `research/trailing-buy-four-family-optimization`, clean, HEAD `4276e55b` |
| Node | `node --version`; `package.json` `engines` | v23.6.1 was in use; `engines` says ≥ 24.21.0 — resolve the discrepancy (document which Node runs the study; both the 16-ETF study and tests ran on 23.6) |
| Tests, types, lint baseline | `npm test`, `npx tsc --noEmit`, `npx eslint` | 485/485 passing; tsc clean; eslint 0 errors, 15 warnings |
| Data verifiers | `npm run datasets -- verify`, `npm run market-events -- verify`, `npm run legacy-archive -- verify` | 16/16 verified; no unexplained split gaps; 11/11 archive files |
| Frozen research intact | sha256 of `research/joint-16-etf-d1/FROZEN_SELECTION.json` body; `records` hashes of `results/*.json` | all match |
| Credentials present (names only) | `grep -c '^ALPACA_API_KEY=' .env; grep -c '^ALPACA_SECRET_KEY=' .env` (counts, never values) | 1 and 1 |
| Tools for the downloader | `which curl jq` | both present |
| Memory | `free`/Activity Monitor; `--max-old-space-size` in the npm script | 16 GB machine; 10 GB heap flag used by `joint-16-etf-d1` |

## 2. Modules and interfaces to inspect first (read, do not modify)

| Path | Why |
|---|---|
| `src/portfolio-aware-d1/nbook/engine.ts`, `ledger.ts`, `margin.ts`, `universe.ts` | the authoritative full engine, `NRunConfig.lotDividends`, `loadNUniverse` (members, partition, access, warmupSessions, **endDate**) |
| `src/portfolio-aware-d1/trace.ts`, `replay.ts`, `parity.ts`, `compare.ts`, `stageC.ts` (`figuresOfRun`, `interpolate`) | fast path, trace key, replay-vs-engine comparison, ladder interpolation |
| `src/joint-16-etf-d1/*` | the template for every stage: `context.ts` (constants pattern), `data.ts` (doors), `space.ts` (Sobol library, controls with provenance, `jointPerturbation` to be replaced by reflection + CRN), `genome.ts` (operators), `evaluator.ts` (trace cache, canonical order, tie aliases, metrics), `archive.ts`, `discovery.ts`, `refine.ts`, `robust.ts`, `selection.ts`, `evaluation.ts` (`run --config`, segment attribution, bridges), `freeze.ts`, `report.ts`, tests |
| `src/multi-etf-d1/context.ts`, `space.ts` | the box, probes, grid conversions, candidate IDs |
| `src/lib/dataset.ts`, `evaluation.ts`, `partitions.ts`, `corporateActions.ts` | access guard, windows, warm-up, splits |
| `src/data-partition/cli.ts`, `canonical.ts`, `scan.ts`; `scripts/download.sh`; `src/market-events/cli.ts` | ingestion tools (import/append/verify semantics, temp file + rename, `--keep-source`, unexplained split gaps) |
| `src/optimizer/rng.ts`, `sobol.ts`, `nsga2.ts` (`sbx`, `polynomialMutation`, `selectSurvivors`, `tournament`), `worker.ts` | seeding, sampling, operators, an existing worker pattern |
| `src/multi-etf-allocator/segments.ts`, `shadow.ts`, `context.ts` (`protocol`) | segment attribution, ShadowBook semantics, the frozen constants (rate, notional, initial core) |
| `config/phenotypes/README.md`, `D1/*.json`; `src/phenotype/strategies.ts` | phenotype registration format; the registry test that requires every `src/app` entry to be listed |
| `research/joint-16-etf-d1/results/robust/robust.json`, `refine/refine.json`, `FROZEN_SELECTION.json` | R1/R4 provenance (R1_R4_RESEARCH_RUN_DESIGN §3) |

## 3. Work packages, in dependency order

**WP0 — Scaffold and protocol text** (no data read). `src/d1-robust/` with `context.ts` holding every constant of
PROPOSED_PROTOCOL.md (copy the 16-ETF pattern), `cli.ts`, `src/app/robustD1.ts` entry, `package.json` script
`robust-d1` (with the 10 GB heap flag), the `src/phenotype/strategies.ts` entry-point line, `.gitignore` lines for
regenerable logs. `research/d1-robust-pool-discovery/PROTOCOL.md` from this review with the user's decisions
applied. Tests: constants ↔ protocol consistency (a test that parses numbers in the protocol's tables against
`context.ts` is optional but recommended).

**WP1 — Retrospective runner** (R1_R4_RESEARCH_RUN_DESIGN). `retrospective.ts`, `retrospectiveUniverse` door,
provenance extraction and hash checks, training reproduction, `all` runs, label, outputs. Tests: refuses without the
flag; refuses keys other than R1/R4 and partitions other than `all`; provenance mismatch stops; import-graph isolation
(no search module imports it); frozen 16-ETF files unchanged before/after. **Run the four commands only after WP4's
protocol freeze** (default staging) or after S10 (alternative; OPEN_DECISIONS D3).

**WP2 — Ingestion orchestrator** (ETF_UNIVERSE §8). `ingest.ts`: preconditions, staging check, download via
`scripts/download.sh` with a common END, classified retries with validated cleanup, `import --dry-run` then
`import --keep-source`, `datasets -- verify <SYMBOL>`, `market-events -- verify`, verified cleanup, attempt log,
eligibility audit D1–D5 → `results/audit/universe.json`. Tests: adversarial deletion paths refused; dummy-credential
leak test; a simulated failed import leaves no canonical file; END constant enforced. Then ingest Tier 1 (and Tier 2 if
within budget), one symbol at a time, recording every outcome. Register any split found with its source document
(the XOP/XLE/XLU/XLY pattern) before the symbol is admitted.

**WP3 — Neighbourhood engine** (NEIGHBORHOOD §1–§5). `neighbourhood.ts`: step units, reflection, CRN draw generation
for the full universe per (window, stage, draw), classes N0–N3 and A2, statistics (P50, Q25, P10, Q75, MAD,
shareAbove, DDmed, DD90, feasShare, moved), bootstrap intervals. Tests: reflection never leaves the box; boundary move
frequency 2/3; CRN — two configurations sharing a symbol get identical steps on it for the same draw; stage labels
disjoint; zero amplitude reproduces the centre; statistics on fixtures.

**WP4 — Doors, audit, controls, parity, protocol freeze.** `data.ts` with the four doors (training with `endDate`,
benchmark, evaluation, retrospective), `audit.ts` (universe rules D1–D5, calendars, splits once, coverage/volume,
capacity inputs), `controls.ts` (B1/B4/B5/C0 to the cent in the expanded load), `parity.ts` (P0–P2, P4 on U),
`freeze.ts` (protocol + context + universe hashes, write-once). Tests: training door refuses non-training partitions
and loads nothing after `endDate`; benchmark door refuses non-members; evaluation door refuses without a verified
manifest; freeze write-once and tamper detection. **Freeze the protocol here.**

**WP5 — Pilot** (NEIGHBORHOOD §8). `pilot.ts`: 360 configurations per window, all classes, machinery checks,
persistence diagnostic, `pilot_freeze.json` with M_w and n_D,w by the stated rules. Tests: stratified generation is
seeded and reproducible; the freeze rule functions are pure and unit-tested on synthetic statistics.

**WP6 — Library, discovery, promotion, refinement, assessment** (PROTOCOL §5–§9). Extend the 16-ETF modules:
`JointEvaluator` → adds neighbourhood evaluation with the trace cache; `archive.ts` → records neighbourhood fields;
`discovery.ts` → scalar constrained ranking by J, arm labels, category-stratified and arm-specific islands, coverage
top-up; `promote.ts` → families (Jaccard, funded-overlap, regime correlation), n = 64 re-evaluation, portfolio
constraint; `refine.ts` → passes on J with M/5 acceptance; `assess.ts` → confirmation batches, classes, exclusions with
smoothed marginal, ladders, both dividend conventions, capacity flags, PBO. Worker threads for neighbour evaluations
with sorted-key reduction. Tests: ranking key is J (a fixture where the peak-net leader has the lower P50 must rank
below); inert member → infeasible; feasibility at small n is provisional; promotion diversity constraints; refinement
acceptance uses paired CRN draws; determinism of S3–S4 across two processes; end-to-end synthetic pipeline (as in
`pipeline.test.ts`) including both arms and a fold round.

**WP7 — Walk-forward** (WALK_FORWARD §2–§7). `walkforward.ts`: round windows, fold library without controls, arms J
and Q, `PICKS.json` write-once before validation load, validation runs (continuous attribution + isolated), control
and ablation comparators, G-WF record write-once. Tests: B1 (`endDate` truncation, last-date assertion, bar hash), B2
(trace keys differ across windows), mutation test on fixtures at smoke budget (post-search-end prices shifted → identical
picks and archives), G-WF function on synthetic inputs.

**WP8 — Selection freeze, evaluation, reports.** `selection.ts`, `evaluation.ts` (C1–C4, bridges, two-largest-lots,
omitted distributions, replay parity), `report.ts` (tables with evidence grades and labels), README/RECOMMENDATION
templates with the no-advancement branch written first.

## 4. Invariants with their tests (summary; each must exist before the protocol freeze)

| Invariant | Test |
|---|---|
| Optimizer reads training only, truncated at the round's end | door test + loaded-universe last-date assertion + bar hash |
| No cross-window cache hit | trace key test across windows |
| Fitness ranks by J; centre net ranks nothing | fixture ranking test |
| CRN pairing and disjoint stage labels | neighbourhood tests |
| Reflection, boundary frequency, zero amplitude exact | neighbourhood tests |
| Inert member → infeasible; activity floor enforced | feasibility tests |
| Replay = full engine for mixed membership incl. VOOG, XOP, no-VGT, 16+ books | parity P1 on U (real data, after the freeze) + fixture tests |
| Lookahead immunity | existing test extended to a 6-book fixture |
| Portfolio consistency incl. `lotDividends: false` | P2 extended with the symmetric convention |
| Freezes write-once; tampering detected | existing pattern |
| Retrospective runner isolated and flag-gated | import-graph test; CLI tests |
| Ingestion deletion restricted; no canonical file left partial; no credential in outputs | ingestion tests |
| Determinism | byte-identical S3–S4 logs across processes |
| Frozen 16-ETF and portfolio-aware artifacts unchanged | hash check at study start and end |

## 5. Commands to verify (names as read today; confirm from source or `--help` before relying on them)

```bash
npm test; npx tsc --noEmit; npx eslint
npm run datasets -- verify [SYMBOL]            # src/data-partition/cli.ts
npm run datasets -- import SYMBOL --dry-run     # then: --keep-source
npm run market-events -- verify                 # src/market-events/cli.ts
scripts/download.sh SYMBOL 2016-01-04 2026-10-13   # needs ALPACA_API_KEY / ALPACA_SECRET_KEY in the shell env
npm run joint-16-etf-d1 -- run --config B5 --mode fixed --dataset all --cost 5   # existing benchmark reproduction
npm run portfolio-aware-d1 -- run --config P-add-GDX --mode fixed --dataset all --cost 5
# to implement:
npm run robust-d1 -- freeze-protocol | ingest SYMBOL | audit | controls | parity | benchmark | pilot --window a|b|final
npm run robust-d1 -- research-run --config R1|R4 --mode fixed|portfolio --dataset all --cost 5 --acknowledge-retrospective
npm run robust-d1 -- walkforward --round a|b | search --round final | freeze-selection | evaluate [--confirm] | tables
```

## 6. Reproducibility requirements

- Every stage seeded from (`'robust-d1'`, window, stage, indices); no `Math.random`; single-threaded decision logic;
  worker results reduced in sorted order; byte-identical re-run of S3–S4 demonstrated and recorded.
- Every record carries: protocol/context/universe hashes, data file hashes, partitions hash, splits and ledger hashes,
  code hashes of the engine files, git HEAD and tree state, Node version, tier, timings.
- Git-ignored logs have their sha256 in the selection manifest; regenerable by the same commands.
- Nothing under `research/<earlier study>/`, `config/phenotypes/D1/*.json` (existing phenotypes), `config/market-events/
  distributions.csv`, `data/<existing SYMBOL>/data.csv` is modified; new splits are appended to `splits.json` with
  sources (the only permitted config change besides new phenotype files after acceptance).

## 7. Completion criteria

1. All WPs merged on a research branch (no commit without the user's instruction; the user decides when to commit).
2. Protocol frozen before any expanded-universe candidate figure; `pilot_freeze.json`, `PICKS.json` (per fold), `GWF.json`,
   `FROZEN_SELECTION.json`, `evaluation.json` each written once.
3. All invariants' tests present and passing; suite/tsc/eslint at or above baseline; no existing test weakened.
4. Reports complete for both branches of the outcome; every figure carries its evidence grade and labels.
5. The four R1/R4 retrospective runs delivered under the label, in `evaluations/`, with provenance.
6. Universe audit lists every attempted symbol with its rule outcome; staging files cleaned or explained.

## 8. Independent code-review checklist (for a reviewer who did not write the code)

- Does any search module import a door other than `trainingUniverse`? Does `trainingUniverse` pass `endDate` and
  `access: 'optimization'` in every round?
- Does any ranking, acceptance or promotion read the centre net instead of J/P50? Grep for `.net` in those paths.
- Are neighbourhood seeds free of the configuration key? Is reflection used everywhere `jointPerturbation` was?
- Are confirm-A/confirm-B labels used only in assessment, and is the reported figure batch B's?
- Are control vectors absent from fold libraries and flagged in the final library?
- Are `PICKS.json` and `GWF.json` written before any validation universe is loaded (check call order and tests)?
- Is `lotDividends: false` the convention used in G6/G7 comparisons, and is the frozen convention also reported?
- Does the retrospective module appear in any import of `search`, `pilot`, `promote`, `refine`, `assess`, `selection`?
- Does the ingestion deletion helper accept any path other than `data/<SYMBOL>.csv` of the symbol in progress?
- Could any log, JSON or report contain environment values? Run the dummy-credential test.
- Were budgets, thresholds or windows changed after the protocol freeze without an amendment entry?
- Do the published tables show E0 and E1 side by side with grades, and is "no advancement" written as a result, not a
  failure?
