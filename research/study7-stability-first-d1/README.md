# Study 7 — stability-first D1 optimization: GDX standalone, VGT control, smaller shared-margin pools (2026-10-31 → 11-01)

Branch `research/study7-stability-first-d1`, from the Study 6 head `418208e`.

- **Brief:** `brief/ASSIGNMENT.md` (sha256 `53291b3a…`).
- **Protocol:** `PROTOCOL.md`, frozen 2026-10-31T23:42:49Z (sha256 `6590ecfe…`). Disclosures are in `AMENDMENTS.md`;
  no rule was amended.
- **Status: COMPLETE** (see `RESEARCH_RECOVERY.md`).

## Answer in brief

- **Scope:** fixed one-slot $100,000 shadow pools; 11% interest; 5 bps per side.
- **Gate:** minute DD < $35,000 at the centre, and ≥ 90% of a joint N1 neighbourhood below $35,000 with its p90 below
  $35,000.

| Finding | Detail |
|---|---|
| Chronological validation | **Failed for every track.** Stability-first search, on neighbourhood fitness from the first screen, found GDX, VGT+GDX, VGT+XBI+XRT and four-book configurations whose 2017–2021 neighbourhoods were 100% below $35k. All 22 fold-M finalists failed on 2022–2023. So did every fold-F19/F20 finalist. **No Class M nomination.** |
| Retrospective (fold L) | A search including 2022–2023 found robust configurations. All 12 role holders keep 97.7–100% of their full-history neighbourhoods below $35k on new seeds and were not blocked on the exposed 2024–2026 window. **12 Class L research nominations**, labelled weaker: in-sample selection plus a block-only exposed check. |
| Best analyst-assessed trade-off | **VGT+GDX "robust" and "balanced" (#2, #5):** FULL net $275k / $244k, minute DD $26.0k / $21.0k, neighbourhood p90 $30.7k / $22.8k, 2024–2026 net +$58k / +$69k. This is frozen-VG-like profit with far more robust neighbourhoods, about $100k above B1 and about $210k–$240k below frozen B5. |
| GDX standalone | Not chronologically. In hindsight of 2022 it is robust but crash-dependent and low-yield: 61–72% of net from 2020, $7k–$10k in 2024–2026. |
| Frozen subsets | VXR ≈ plateau (marginal: 87.5–90.4% by seed family). VG worse than B1 (73%). VXRG 65% against B5 28%. Dimension-matched (k = 8) designs remove most of the gap except for VG. |
| VGT | `primary` (B1) passes everything. Standalone re-optimization was not warranted: the trigger did not fire (1.07× < 1.25×). Inside pools VGT's parameters change materially. |
| Recommendation | Deploy nothing. Keep frozen B1 and B5 as benchmarks. If wanted, observe two or three Class L nominees prospectively under a separately approved research-only addendum (`RECOMMENDATION.md`). |

## Read in this order

1. [RECOMMENDATION.md](RECOMMENDATION.md): mechanical nomination, analyst assessment, gating failures, the `none`
   option.
2. [PROTOCOL.md](PROTOCOL.md), with §16 the independent pre-freeze review; [AMENDMENTS.md](AMENDMENTS.md).
3. [BASELINES_AND_FIXED_SUBSETS.md](BASELINES_AND_FIXED_SUBSETS.md): Phase A, the five frozen configurations.
4. [GDX_STANDALONE.md](GDX_STANDALONE.md): the mandatory GDX track and every earlier GDX vector.
5. [VGT_CONTROL_AND_ROLE.md](VGT_CONTROL_AND_ROLE.md): the B1 evidence, the trigger, VGT inside pools.
6. [OPTIMIZATION_AND_COMPUTE.md](OPTIMIZATION_AND_COMPUTE.md): objectives, coverage, budgets, triggers, value of
   compute.
7. [NEIGHBORHOOD_ROBUSTNESS.md](NEIGHBORHOOD_ROBUSTNESS.md): every finalist under every design; controls.
8. [WALK_FORWARD_AND_VALIDATION.md](WALK_FORWARD_AND_VALIDATION.md): the folds, out-of-fold results, PBO, multiplicity.
9. [TRADE_SEQUENCING.md](TRADE_SEQUENCING.md): funded lots, displacement, interactions, drawdowns, paired bootstrap.
10. [EXECUTION_AND_INTEGRITY.md](EXECUTION_AND_INTEGRITY.md): parity, no-lookahead, caches, restart, tests, hashes.
11. [RUN_COMMANDS.md](RUN_COMMANDS.md) and [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md).

## Records

| Path | Content |
|---|---|
| `results/protocol_freeze.json`, `results/pilot/pilot.json`, `results/parity/parity.json` | freeze, pre-freeze pilot, engineering gates |
| `results/phaseA/*.json`, `*-points.jsonl.gz`, `baseline_manifest.json` | Phase A (sealed and committed before Phase B) |
| `results/phaseB/<track>/<fold>/search.json`, `search-archive.csv.gz` | every search: islands, rungs, refinement, shortlist, selection evidence; every rung-1 configuration |
| `results/phaseD/<track>/<fold>/validation.json` | confirmation evidence, gates, PBO, decay |
| `FROZEN_SELECTION.json` | roles, qualification tables, the ranked list (sealed 2026-11-01T01:24:05Z) |
| `results/final/final.json`, `confirmation.json`, `*-lots.jsonl.gz` | the final door (once) and its identical repeat; funded-lot ledgers |
| `results/tables/*.md` | tables generated from the sealed records (`scripts/build_tables.py`) |
| `results/doors.jsonl`, `results/runlogs/` | every data-door opening; every stage log |

**Code:** `src/study7-stability-first-d1/` (npm script `study7`). It imports the frozen engines unchanged: trace,
replay, the N-book engine, the Study 5/6 design and record helpers.

**Research configurations:** `config/research-pools/study7-stability-first-d1/` and
`config/research-phenotypes/study7-stability-first-d1/D1/`, labelled research only.
