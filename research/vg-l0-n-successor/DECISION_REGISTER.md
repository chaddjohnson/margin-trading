# DECISION REGISTER — Priority 5 (P5-NS)

Every decision of the study, its basis and where it is recorded. **D** = accepted scope decision (the brief's), **A** =
study adaptation (frozen in PROTOCOL.md §0 before any search), **O** = operational choice, **F** = an outstanding decision
for the user. Research only: nothing here adopts, deploys, merges or touches a broker.

## Scope decisions (from the brief; accepted as given)

| ID | Decision | Basis |
|---|---|---|
| D1 | The portfolio is exactly D1·VGT + D1·GDX + Growth·VGT in one exclusive $100,000 slot; Growth·GDX OFF; no new securities | brief §1 |
| D2 | N/original is the preferred incumbent and Track N's only seed; New L0 is the immutable original benchmark; I1 is a fixed, S1-enabled external comparator (sealed figures only, never searched around) | brief §1 table |
| D3 | P0: marked minute DD ≤ $35,000 = 35 % of the fixed $100,000 initial allocation; principal loss, banked-capital DD, giveback, gaps and margin are report-only | brief §1 |
| D4 | S1 staged trailing stops OFF for every searched candidate; shadow delayed-entry eligibility OFF; calendar-day holds; existing allocator, exit order, economics | brief §1 |
| D5 | Two tracks: F (independent, every cutoff C19–C24) and N (N/original-informed, C24 only, no chronological claim) | brief §3.1 |
| D6 | 2025–2026 is previously examined validation history, opened once after the sealed, committed frozen slate | brief §3.4 |
| D7 | Substantial GPU compute authorized, convergence-driven, with finite safeguards; no fixed deadline | brief §3.3 |
| D8 | Commit and push the research branch; no merge into `main`; portable ZIP handoff | brief §8–§9; CLAUDE.md |

## Branch and engine

| ID | Decision | Basis |
|---|---|---|
| O1 | Branch `research/vg-l0-n-original-successor` from `5d587bb2` (tip of the trailing-stop audit): the last S1-free revision, evaluation code identical to GPU Phase 7's accepted tree; acceptance `bb0e3fcf…` (gb7) VERIFIED with a reproducible rebuild and the out-of-band pin. The Priority 4 branch (S1 engine, Phase 8 record `c02a8a92…`, two declared Priority 5A test failures) is not used, so no S1 code reaches this study and no identity check is weakened | brief §4 "Source branch choice"; E1 |
| O2 | Work in the main checkout (no extra worktree folder); the Priority 4 branch's ignored caches present on disk are excluded locally and never staged | the user's standing preference (no extra worktree folders) |

## Adaptations (PROTOCOL.md §0; no departure)

| ID | Adaptation | Why |
|---|---|---|
| A1 (AD1) | Assignment 3's 92-gene space imported unchanged | brief §1 ("preserve all existing feature coverage") |
| A2 (AD2) | Replicates ×2 (Track F 4 per cell, refinement 4 per cell); Track N by Assignment 3's matching rule | NL0 §7.4; brief §3.3.1–2 |
| A3 (AD3) | Two-tier island rule (NL0's trigger to NL0's caps; performance components to 16 islands) and replicate rounds (≤ 4, 2 % union trigger) | brief §3.3.4–7; Phase A §7 (class component alone behind 142/185 A3 and 84/94 P4 capped lanes) |
| A4 (AD4) | Sequential drawdown from GPU-exact marks (minute inside slices, session closes, lot minima); the CPU exact chain report-only and one-directional (can only qualify, never grant support) | GPU returns no minute mark series; E6 measured the gap |
| A5 (AD5) | FULL before the freeze only for the references' known-target reproduction (E2) | Assignment 3 AD3 precedent |
| A6 (AD6) | NL0's original rule only; RA1/RA2 not used; the refinement plan's RA1 slot → NL0's balanced statistic | RA1 needed a user-agreed departure not granted here |
| A7 (AD7) | Track N: Assignment 3's informed machinery with N/original as the only seed, projected onto all 16 family pairs (native + 3 grid variants per gate state; rotating focus) | brief §3.1 |
| A8 (AD8) | Assignment 3's neighbourhood instrument and seed labels (references reproduce Assignment 3's sealed C24 evidence) | comparability; E2 |
| A9 (AD9) | Report-only stresses cost 2 bps and stop slippage +10 bps | brief §6 |
| A10 (AD10) | Precommitted successor criteria: profit (+$10,000 centre, +$5,000 confirmation robust, risk within $2,500) or risk (−$2,500 confirmation p90 DD, profit within $2,500), not dominated, replicated across two seeds, V1–V3 | brief §7 |
| A11 (AD11) | Tail stress on in-sample, same-period proxy and synthetic paths (no disjoint pre-2016 data) | Assignment 3 AD11 |

## Operational choices

| ID | Choice | Basis |
|---|---|---|
| O3 | One official GPU job at a time (Mode S: batch 8,192, 8 host workers); Track F broad in two 128-lane jobs run one after another (splitting one stage gains only 1.07×) | Phase A §6 (GPU Phase 4) |
| O4 | Hard ceiling 80 M requested official evaluations; launch rule 1.5 × expected; 60 GiB disk reserve (≈ 4.8 KB per archived evaluation) | Phase A §6; 469 GB free at start |
| O5 | Job archives kept uncompressed on Apollo; compression or cleanup only after the user's review | brief §9 |

## Outcome decisions (precommitted rules applied; no discretion)

| ID | Decision | Record |
|---|---|---|
| R1 | Track F (independent) at C19/C21/C23: **unsupported** chronologically (sequential net −$35,958.68, DD $90,945.51 > $35,000); its C24 selection carries "no chronological support: not a deployment-qualified candidate without an explicit user decision" | `results/sequential.json` |
| R2 | Successor pre-determination (before FULL): **no candidate** met type P (+$10,000 centre, +$5,000 confirmation robust, risk within $2,500) or type R (−$2,500 confirmation p90 DD, profit within $2,500); the best informed improvement was +$3,821 centre / +$8,265 robust | `FROZEN_SELECTION.json`, `results/selection/C24.json` |
| R3 | Outcome: **NO MATERIAL IMPROVEMENT — keep N/original as the preferred research incumbent and New L0 as the frozen benchmark** (recommendation 2 of the brief) | `results/outcome.json` |

## Outstanding decisions for the user (F)

| ID | Decision | Notes |
|---|---|---|
| F1 | Review this handoff before any successor decision; nothing is adopted | the study recommends keeping N/original as the preferred research incumbent and New L0 frozen |
| F2 | Whether to merge the research branch `research/vg-l0-n-original-successor` into `main` (research files only; no official config changes) | not done: needs separate authorization |
| F3 | Job archives on Apollo: `research/vg-l0-n-successor/cache/` (≈ 204 GB; 29 job archives listed with sha256 in `reports/diagnostics/job-archives.sha256`) — keep, compress (zstd, verified) or delete | kept uncompressed until your review, as the brief requires; compression is lossless and keeps replays possible after restore |
| F4 | Next research hypothesis (instead of another budget expansion): the independent search repeatedly converges ≈ $100k below the informed region and fails chronologically; more compute did not change that. Candidate directions: a prospective (paper/live-shadow) evaluation of N/original from 2026-11 onward; or a study of *why* the 2020–2023 regime breaks the independently selected D1 parameters (regime-conditional gates) under a new protocol | none is started; each needs your brief |
| F5 | N's robust-profit holder `C24/informed/GA.VC/R101#2 robust` (−$19,249 centre, −$4,838 p90 DD, −$31,929 on 2025–26) is the only distinct lower-tail trade-off in the informed region; it failed the precommitted profit band and is shown for information only | `FINAL_CANDIDATES.md` §2 |
