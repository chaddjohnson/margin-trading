# Assignment 2 handoff — a fair, risk-aware comparison of D1 risk-control structures (protocol draft)

**Status: draft for the user's review. Nothing here is precommitted, executed or binding.** It turns Assignment 1's
foundation into options for Assignment 2 (exit-family and candidate-selection experiments) and Assignment 3 (joint
optimization and successor nomination). Every number below is a proposal or an estimate, labelled as such. The
binding choices (boxes, budgets, stopping rules, the primary rule, the verdict's consequence) belong in Assignment 2's
own frozen protocol, written from `docs/research/STUDY_PROTOCOL_TEMPLATE.md` under standard **2.2.0**.

Read first: `SPECIFICATION.md` (the mechanics), `PROTOCOL.md` and `REPORT.md` (what was verified),
`docs/research/OPTIMIZATION_STANDARD.md` 2.2.0 (especially §1.8 and §5.9), `docs/research/methods/NEW_L0_METHOD.md`
(NL0 1.0.0), and `research/vg-l0-walk-forward-diagnostic/REPORT.md`.

## 0. What Assignment 1 hands over

| Item | Where | State |
|---|---|---|
| Standard 2.2.0 | `docs/research/OPTIMIZATION_STANDARD.md` (sha256 `0085cff2…`) | current; the preflight enforces `chronologicalConsequence` for optimization and continuation studies |
| Controls engine | `src/d1-risk-controls/` (`runWithControls`, `evaluateWithControls`, `riskId`, `riskEvalKey`, `parseRiskConfig`) | legacy parity verified (gates G1–G4); invariants on real data (G5); 74 synthetic tests |
| Specification | `SPECIFICATION.md` (RC 1) | written before the code; any behavioural change needs RC 2 |
| New L0 reference | `tools/vg-l0-risk-controls-foundation/common.ts` `newL0()`; `results/gates/g1-g3-new-l0.json` (the full funded trade list) | reproduced to the cent on FULL and D19–D24 |
| What was **not** done | No control was evaluated for performance on real data (protocol AD7). Assignment 2's boxes are not informed by any outcome seen here. | — |

## 1. The structural comparison (brief §4.1)

### 1.1 Structures

Per D1 book (D1·VGT and D1·GDX independently), four exit families × the decline gate:

| Family | Protective stop | Hold | New numeric genes |
|---|---|---|---|
| A legacy | off | legacy (calendar) | none |
| B protected | on | legacy | stop distance d |
| C unlimited | on | disabled | d (hold and buffer become inactive) |
| D adaptive | on | progress-extended | d, extended bound H_max, progress g |
| × gate | off / on | — | gate: K, r, cooldown C |

That is 8 structures per book. Growth·VGT keeps its own rule family and genes; Growth·GDX stays disabled.

### 1.2 Cell designs (choose one in the protocol)

| Option | Cells | For | Against |
|---|---:|---|---|
| **S1 symmetric** (both books share the family and the gate state; numeric values are independent per book) | 8 | small; every family gets a full, equal budget | cannot find a GDX-stop / VGT-legacy mix unless a second stage allows it |
| **S2 full cross** (each book's structure independent) | 64 | covers every mix | 8× the budget of S1 for the same depth per cell; thin cells |
| **S3 staged** (S1 broad; then the best-supported family per book is crossed in a second, pre-budgeted stage) | 8 + ≤ 4 | coverage first, mixes where evidence points | the second stage is informed by the first (label it; keep its budget fixed in advance) |

**Proposal:** S3. It is fair to every family at the first stage and avoids 64 starved cells.

### 1.3 Fairness rules (each family optimizes its own numbers)

- **Equal, protected budgets per cell** at the broad stage (standard §4.3 cells/strata). Report proposals and
  evaluations per cell (§4.2).
- **No transplanted values.** Every cell searches the D1 genes (X, Y, stop, hold, L, buffer, P, W) **jointly with** its
  control genes, so that a family that wants different D1 parameters can find them. New L0's vectors may seed an
  *informed* lane only (§3.3), never the independent lanes.
- **Inactive genes** are respected in identity, de-duplication and neighbourhoods: under C, `maximumHoldDays` and
  `intradayLossBuffer` are inactive (masked by `riskId`); under A and B, the adaptive genes are absent.
- **Neighbourhoods:** control genes join the perturbation instrument with declared radii in grid units (proposal:
  d ±10 tenths, H_max ±2 days, g ±10 tenths, K fixed (categorical-like: separate toggles), r ±50 tenths,
  C ±10 sessions). Structure is fixed inside a neighbourhood (standard §5.3 default).
- **Identity:** `riskId` (rc1) and `riskEvalKey`. Legacy cells keep Priority 3's identity and key, so archived legacy
  evaluations remain valid cache hits only if the evaluation digest matches (§2.4 below).

### 1.4 Boxes (options to precommit; engineering validity is wider)

| Gene | Validity (RC 1) | Proposed research box | Grid (coarse / fine) | Note |
|---|---|---|---|---|
| d (stop distance) | 0.1–99.9% | 3.0–25.0% | 1.0 / 0.1 points | below ~3% the stop meets daily noise; the diagnostic's worst crash MAEs were 8–45% |
| H_max (adaptive) | > base, ≤ 365 days | base + 3 … 60 days | 3 / 1 days | the base is the D1 hold gene (box 3–30) |
| g (progress) | 0.1–99.9% | 1.0–15.0% | 1.0 / 0.1 points | relative to the entry fill |
| K (gate losses) | 1–20 | 1–4 | 1 | integer; few levels: enumerate |
| r (gate recovery) | 0.1–100% | 10–100% | 10 / 1 points | 38% is the old D1 recovery reset's value (a reference, not a default) |
| C (gate cooldown) | 1–1000 sessions | 5–250 sessions | 5 / 1 | bounds the lockout |

These boxes are proposals. Assignment 2 fixes them before searching. **No threshold is chosen here.**

## 2. Stages, budget and stopping (brief §4.2)

### 2.1 Stage plan

1. **Broad structural coverage** (independent lanes, per cell, every cutoff): NL0 1.0.0's per-lane schedule (§3.3:
   Latin/Sobol screen → promotion with the ¼ centre-profit share → rung 1 → NSGA-II islands → rungs 2–3 → refinement
   → shortlist), structure pinned per cell exactly as 5B pinned V/G/B. The small control-gene spaces are covered by the
   screen's quasi-random design; K is enumerated through strata (standard §4.1: small spaces are enumerated).
2. **Qualification** of every cell's shortlist under the same gates (Q1–Q6 as NL0 §3.5, or Assignment 2's), with the
   confirmation family.
3. **Focused refinement** of the qualified cells (a pre-budgeted second stage; S3's crossed mixes here), labelled as
   informed by stage 1.
4. **Chronology** (§5) and the **§5.9 disclosures** for every fold primary and final candidate.

### 2.2 Budget (estimates for sizing, not commitments)

- NL0's effective L0-arm budget per cutoff: 9,472–13,824 executed proposals and 92,774–103,378 requested evaluations
  (NL0 §4.1).
- **Proposal (S1 broad stage):** 8 cells × 2 replicates × NL0's per-cell schedule, with base 512 screen proposals and
  2 islands per cell. That is about 8 × 2 × (512 + 2 × 256) ≈ 16,000 base proposals per cutoff. With rungs and
  refinement at NL0's executed shares (rung 1 66–75%, refinement 15–19%), this is ≈ 160,000–200,000 requested
  evaluations per cutoff, × 4 cutoffs (C19, C21, C23, C24) ≈ 0.7–0.8 M, plus qualification ≈ 0.1 M.
- **Cost driver:** a controlled D1 book is rebuilt for every distinct (grid, controls) pair (the cache keys both).
  Growth books stay cached. Measure throughput in the pilot (standard §6.3) before freezing the caps.
- **Stopping rules:** the standard's extension triggers (§4.5: 5% hypervolume, 5% robust net, new feasible behaviour),
  caps per lane and a job cap with a resource guard as in 5B. "Budget exhausted" is not convergence.

## 3. Old versus risk-aware candidate selection on the same populations (brief §4.3)

Separate the **ranking** effect from the **mechanics** effect with a 2 × 2 on one archive per cutoff:

| | Old selection (NL0 §3.5: actual-profit role among Q1–Q6 qualifiers) | Risk-aware selection (precommitted by Assignment 2) |
|---|---|---|
| Legacy mechanics (cell A only) | baseline | ranking effect alone |
| All families (A–D × gate) | mechanics effect alone | both |

- Both selection rules are frozen before any search and applied to the **same archived candidate populations** of the
  same cutoff (every evaluated centre and its neighbourhood statistics are archived per job, as in 5B). No candidate is
  re-searched for either rule.
- A "risk-aware selection" proposal is a precommitted rule that **ranks** with information available at the cutoff.
  Examples: a robust-profit or banded rule; ranking on net after marking open lots at their protective-stop exit
  (the walk-forward diagnostic's recommendation 2). Under standard 2.2.0 the §5.9 items are report-only. Using one as a
  ranking input needs Assignment 2's explicit rule and the user's agreement (a departure) or a later standard version.
- Report, per cutoff and sequentially: each rule's fold primaries, their slice results, and the 2 × 2 decomposition.
  One historical pair never proves a method superior (standard §3.4).

## 4. Preserving NL0 (Priority 3B broad search, 5B refinement) as references (brief §4.4)

- Pin NL0 1.0.0 (sha256 `9b387bb4…`) as `referenceMethod` if the protocol reproduces its schedules (standard §4.8).
  Map every stage and state each adaptation:
  - **new discrete genes** (the family, the gate state, K) are pinned per cell, like 5B's inclusion cells V/G/B;
  - **new numeric genes** (d, H_max, g, r, C) are appended to the genome on declared grids;
  - neighbourhood radii are added for them;
  - identity uses `riskId`.
- Scale by **replicates** of the unchanged per-lane schedules, never by enlarging one stage (NL0 §7.4).
- NL0 and the 3B/5B code stay unchanged. A new study namespace (for example `src/vg-l0-risk-families/`) builds its
  search on `src/d1-risk-controls/` and on copies of the 5B pipeline's orchestration where needed. It never edits
  `src/vg-lifecycle-matched-optimization/` or `src/vg-d1-growth-expanded/`.

## 5. The later joint optimization (Assignment 3, brief §4.5)

- One genome for D1·VGT + D1·GDX + Growth·VGT, with **independent** D1 risk structures per book (S2 or S3's crossed
  cells), Growth·VGT's own genes, one funded slot and the frozen allocator.
- **Two lanes, budgeted apart (§3.3):**
  - **independent** (fresh screens, no seeds from later-selected settings): it carries the chronological evidence;
  - **informed:** seeds are New L0, C4, C4-refined, IJ1, each projected onto every family. A seed's controls take
    values from a precommitted grid of starting points, not one transplanted value.
- **So that inherited parameters do not dominate:**
  - equal budgets for the two lanes;
  - promotion shares reserved for the independent lane's centres;
  - lane provenance carried into every role and the report;
  - the informed lane's primary labelled "no independent chronological test" (2.2.0 §1.8).
- The qualifying-incumbent fallback (§3.2) keeps New L0 in the selectable set: a weaker searched candidate never
  silently replaces it.

## 6. Chronology, stress and disclosure (brief §4.6)

- **Folds:**
  - C19, C21, C23 as in NL0, each with its own door and sealed selection before its slice;
  - optionally more and shorter folds (the diagnostic's recommendation 7: for example yearly cutoffs C19–C23), if the
    budget allows a full search per cutoff.
- **Verdict:** the default rule of standard §1.8, with the **consequence precommitted**. Proposed: the 2.2.0 default
  ("no chronological support: not a deployment-qualified candidate without an explicit user decision").
- **§5.9 disclosures for every fold primary and final candidate:**
  - the open-lot share of training net;
  - the largest open lot's market-value multiple and its give-back on the next slice;
  - the per-lot MAE distribution and loss severity;
  - the training neighbourhood on the next slice (D7 method: 256 replays per fold);
  - the **D1 hold-window tail stress** on a declared reference history.
- **The reference history (a data task for the protocol):** the canonical files start on 2016-01-04. VGT (2004) and
  GDX (2006) traded earlier, and pre-2016 data of these symbols (or declared peers) would be disjoint from every
  search window. The options:
  - (a) acquire and validate pre-2016 minute or daily data;
  - (b) a declared proxy (peer ETFs);
  - (c) an in-sample stress over 2016–2024, labelled as such.

  Data acquisition is outside Assignment 1.
- **Regime and tail stresses** (report-only): the 10 and 20 bps costs, 14% interest, +25 bps stop slippage (applied to
  protective fills too), next-open stops, and causal removals (each book), plus the 2020 and 2022 episode tables.

## 7. Against the frozen New L0, and "no qualifying successor" (brief §4.7)

- New L0 is reproduced to the cent (G1) and stays in every table: development, each slice, sequential, and validation.
- **A "qualifying successor" must be defined before searching.** Proposed form:
  - it passes every gate;
  - its chronological verdict is *supported*, or the user explicitly accepts the §1.8 consequence;
  - on the development window it is not dominated by New L0 on (centre net, centre DD) and on (selection p10,
    selection p90 DD);
  - its compromise against New L0 is stated in dollars (standard §3.2).
- **Valid outcomes:**
  - a successor;
  - "no qualifying successor", in which case New L0 remains the reference;
  - "no chronological support for any procedure".

  None is presented as a failure of the study.

## 8. Why 2020, 2022 and 2025–2026 cannot become an untouched holdout (brief §4.8)

- They have been examined by many studies, the browser and reports, and New L0 itself was chosen with 2020–2024, and
  partly 2025–2026, in view. Relabelling dates does not remove that knowledge from the designers, the seeds, the boxes
  or the gates (standard §1.6).
- They remain useful **retrospective** evidence: does a mechanism behave as specified in a fast crash and a slow bear?
  How do its tails compare? But they are not a test of prospective robustness.
- **Genuinely new evidence** comes only from data that did not exist when the protocol froze:
  - a prospective shadow comparison of the frozen candidates from the freeze date forward (the repository's precedent:
    `research/prospective-b4-b5-shadow/`);
  - disjoint pre-2016 history for the tail stress (§6).

## 9. What requires the user's decision before Assignment 2 starts

1. Approve or edit this design: the cell design (S1, S2 or S3), the boxes, the radii, the budgets and caps, the stage
   plan.
2. The primary-selection rule(s) and the risk-aware selection rule for the 2 × 2 (§3), and whether any §5.9 item may
   become a ranking input (a departure under 2.2.0).
3. The chronological consequence (2.2.0 default proposed) and the definition of a qualifying successor (§7).
4. The reference history for the D1 tail stress (§6: acquire pre-2016 data, a proxy, or an in-sample stress).
5. Whether `main` should receive the 2.2.0 documents (done here if clean; see `REPORT.md`) and when the research
   branch with `src/d1-risk-controls/` may be reviewed for merging (never merged automatically).

Out of scope here and kept separate: the TSLA/MSFT optimizations and the Strategy Lab drag-to-measure chart bug.
