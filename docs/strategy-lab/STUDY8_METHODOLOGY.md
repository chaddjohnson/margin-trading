# Study 8 methodology — the template for future Claude-led optimisation

Study 8 ("expanded-regime stability-first D1 reoptimization", `research/study8-expanded-regime-d1/`) produced the
**#2 VG balanced** candidate (`s8-vg-balanced`, sealed id `S8-VG-F24-3`, books `VGT:d1-bd80e32ee4` +
`GDX:d1-7b99d2833d`). This note records what the study **actually did**, from its own documents and code, so that a
later optimisation of Strategy Lab entry mechanisms can follow the same discipline. Paths are relative to
`research/study8-expanded-regime-d1/` unless they start with `src/` or `config/`.

> Strategy Lab never runs a study like this. Optimisation, sweeps and selection run only as Claude/CLI research
> workflows with their own frozen protocol, and Strategy Lab may later *import* their finished records for display
> (see [ARCHITECTURE.md](ARCHITECTURE.md) §Optimisation imports).

## 1. Question and what was optimised

- **Question** (PROTOCOL.md §1.1): can GDX, VGT, or a jointly optimised 2–5-ETF D1 shared-slot pool, "selected only
  on 2016–2024", earn substantial net profit with acceptable minute drawdowns and broad neighbourhoods, "**and**
  retain acceptable results on 2025-01-02 → 2026-10-29?"
- **Tracks** (§1.3): G (8 dimensions), V (8), VG (16), VXR (24), VXRG (32), VXRKG (40). All eight parameters of every
  book vary jointly and are scored on the "actual executed shared-pool replay"; "Standalone P&L is never summed."
- **Fixed contracts** (§1.5):
  - D1 rules unchanged;
  - one funded $100,000 slot, no compounding, shadow books, "first executable signal wins", no preemption;
  - 11% simple interest on a 365-day year, 5 bps per side;
  - stops fill at the stop or the gapped open; arming on 2017-06-15.
  - Parameter box: X 8–30%, Y 0.1–5%, stop 3–15%, hold 3–30, L 20–250, buffer 0–6%, P 3–20%, W 10–200.
- **"Stability-first"** is in the title only. The brief's operating principle was "robust PROFIT, not stability
  through inactivity" (brief/ASSIGNMENT.md §6).

## 2. Data, folds and doors

- **Data:** 2,722 sessions from 2016-01-04 to 2026-10-29; the data files are hash-pinned (§2.1).
- **Primary fold F24** (§3.1): trains on 2016-01-04 → 2024-12-31 and tests **once** on 2025-01-02 → 2026-10-29. The
  test is one continuous causal run from 2016: "Nothing is liquidated or reset at 2024-12-31".
- **Expanding-window diagnostic folds** (§3.3): F19 (train to 2019-12-31, test 2020–21), F20 (to 2020-12-31, test
  2021–22), F21 (to 2021-12-31, test 2022–23), F23 (to 2023-12-29, test 2024). Each has its own optimiser and
  shortlist. They are "retrospective procedural diagnostics, not independent repeated trials".
- **Doors** (§3.2; logged in `results/doors.jsonl`):
  - `search-F*` doors read data only up to the fold's cutoff. They refuse once `selection` is sealed or once any test
    trace exists.
  - `test-F*` doors require sealed `selection` and `audit` and open in a fixed order: F19 → F20 → F21 → F23 → F24.
- **Exposure** (§3.4): all of 2016-01-04 → 2026-10-29 had been inspected before the study. The test is "an
  algorithmically closed door on previously inspected market history … not a holdout".

## 3. Search

Per track × fold (§7.1), in order:

1. A Sobol screen: 8,192 vectors for G/V, 4,096 per book for pools.
2. Plausible-book combinations and joint Latin-hypercube points.
3. Rung 1: 16-point neighbourhoods.
4. NSGA-II: 4 islands (up to 8), population 64–160, at most 40 generations, SBX η15 (p 0.9), PM η20.
5. Rung 2 (top 192 at n = 64), then rung 3 (top 48 at n = 128).
6. Local refinement.
7. A shortlist of at most 6 candidates at L∞ ≥ 0.10 from one another.

Further details:

- **Objectives** (§6): a constrained Pareto search.
  - Maximise centre net/yr, neighbourhood median/yr and p10/yr.
  - Minimise the neighbourhood p90 minute drawdown.
  - Constraints C1–C7, e.g. neighbour share ≥ 0.90, p90 < $35k, median ≥ $10k/yr, ≥ $11k per occupied capital-year.
- **Seeds:** derived per purpose (`deriveSeed('study8-expanded-regime-d1', …labels)`, §5).
- **Executed** (SEARCH_AND_COMPUTE.md): 30 jobs, 440,126 configurations at rung 1, 9,983,389 point evaluations, 55.4
  CPU-hours.

## 4. Qualification, neighbourhoods and selection

- **Neighbourhood instrument** (§5):
  - a joint Latin hypercube over every coordinate of every book, with radii X ±1.0 pt, Y ±0.2, stop ±1.0, hold ±2,
    L ±10, buffer ±1.0, P ±1.0, W ±20;
  - clipped to the box and de-duplicated;
  - gate: the share of neighbours with drawdown < $35k must be ≥ 0.90, and the p90 drawdown < $35k.
- **In-sample qualification** (§8.1), on the training door with 3 × 128 confirmation families:
  - Q1 centre drawdown; Q2 share gate; Q4 concentration; Q5 activity; Q6 top lot ≤ 25%; Q7 stresses;
  - Q8 confirmation median ≥ 60% of the centre;
  - E1–E3, where E3 requires that B1 not dominate.
- **Robust profit** = ½ median + ½ p10 of the neighbourhood (§8.2).
- **Roles** (§8.2, `src/study8-expanded-regime-d1/select.ts` `assignRoles`). Each role goes to the first qualified
  candidate at L∞ ≥ 0.10 from the holders already taken:
  - *profit*: maximum robust profit/yr;
  - *robust*: share, among candidates with a median ≥ 50% of the profit holder's;
  - ***balanced***: robust profit/yr ÷ p90 drawdown;
  - *extra*: up to two more, also requiring ledger Jaccard < 0.5.
- **F24 ranking** (§8.2): "the study's training-only global ranking". Tier "strong" if the confirmation robust
  profit/yr is ≥ B1's, then ordered by robust profit/yr within the tier.
- **One-time test gates** (§8.4):
  - T1 run drawdown < $35k; T2/T2b test-family share; T3 test net ≥ $10k × yTest and test median ≥ $5k × yTest;
  - T4 stresses; T5 concentration; T6 activity; T7 ≥ $11k per capital-year.
  - "test outcomes may only veto. They never reorder, replace or rescue."

## 5. Integrity

- **Protocol** frozen (sha256 `22eebc37…`, `results/protocol_freeze.json`) and never edited afterwards.
- **Amendments** in an append-only `AMENDMENTS.md`: R0, E1–E4, the only code change being E1, a parity fix.
- **Hash chain** `results/chain.jsonl`, 13 entries: protocol → code-E1 → parity → search → qualify → selection → audit
  → five test folds → test-F24-confirm. It is "not a signature, an external notarization or a commit-backed record".
- **Audits:** a pre-test audit (CLEARED) before any test door opened; a final audit ("PASS WITH CORRECTIONS").
- **Declaration:** results are a "research nomination: retrospectively chronologically persistent, research-only …
  never called independently validated", labelled **NOT DEPLOYED**.

## 6. #2 VG balanced

- **Selection** (`FROZEN_SELECTION.json` `primaryRanked[1]`):
  - F24 rank 2, role balanced, tier strong;
  - confirmation robust profit $27,098/yr (B1 $7,950); confirmation share 97.9% (n = 384); p90 $24,082.
- **Training centre** (`results/tables/qualify-candidates.md`): net $260,223, drawdown $17,281, 36 lots.
- **One-time test** (`CHRONOLOGICAL_VALIDATION.md` §2; `results/test/F24/test.json` `holders[1]`): **PASS**.
  - Run net $340,148 and test net $79,925.
  - 48 lots over the run (VGT 6, GDX 42) and 14 refused signals.
  - Run minute drawdown $21,304 (2026-04-01 → 07-17).
- **Status label** (`config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json`): "RESEARCH ONLY — NOT
  DEPLOYED — TRAINING RANK 2 (TIER STRONG, ROLE BALANCED); 2025–2026 ONE-TIME T GATES: PASS".
- **Relation to #1** (RECOMMENDATION.md §2): "#2 had the better risk profile in the one-time window. This is a
  single window's observation, not a selection"; "#1 remains the primary nominee."

## 7. Limitations the study states

- The test window was previously inspected (PROTOCOL.md §3.4); B1 and B5 are not out of sample (§1.4).
- The probability of backtest overfitting (PBO) was above 0.5 in 20 of 30 track-folds.
- Training rank carried no out-of-sample information in F19–F23 (Spearman −0.32 to +0.11) and little in F24
  (RECOMMENDATION.md §3).
- No F19–F21 holder survived regimes absent from its training (CHRONOLOGICAL_VALIDATION.md §1).
- The 2025–26 window favoured D1 generally, and every nominee leans on 2020.
- "A parameter-neighbourhood pass rate is not a probability of future safety"; the $35k ceiling is "not an
  enforceable stop".
- Follow-up rule for future studies: "Mark 2025–2026 as exposed" (RECOMMENDATION.md §4).

## 8. What a future entry-mechanism optimisation should carry over

A Claude-led study of Strategy Lab entry mechanisms, run from the CLI, should:

- write and freeze a protocol before searching: hypotheses, criterion, folds, doors, budgets, seeds;
- search on **training doors only**, with expanding-window diagnostic folds;
- score **neighbourhoods**, not points (joint perturbation radii, share and tail gates, robust = ½ median + ½ p10);
- qualify in-sample, then assign **roles** (profit / robust / balanced) with diversity constraints;
- rank on training only; open each **test door once**, in order, after a recorded pre-test audit, and let test results
  only **veto**;
- keep everything append-only and hash-chained, and declare outcomes as research nominations;
- treat 2025–2026 as **exposed**.

Its finished records (configurations, metrics, roles, test outcomes, record hashes) can then be imported into Strategy
Lab as a read-only optimisation batch. The batch is displayed in the UI and never launched from it.
