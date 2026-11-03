# Stage B — optimization and freeze

**No ETF was optimized.** Stage A (`OPPORTUNITY_SCREEN.md`) selected none of the seven candidates, and the protocol
optimizes only selected ETFs (PROTOCOL.md §4: "at most two", "zero selections is a valid outcome"). No search budget
was spent, no candidate vector exists, and nothing was promoted to `config/phenotypes/D1/`.

## What was frozen

`FROZEN_CANDIDATES.json` (`npm run complementary-etf-d1 -- freeze-candidates`, once; a second run refuses) freezes
that outcome **before any holdout, final or `all` figure of a candidate was computed**, so no candidate can be added to
Stage C afterwards:

- body sha256 **`ae03567105a0b915ab3a1eb1e8ff085651286b3b9bb4aa62824164438da9c7f4`**, frozen
  2026-10-24T11:50:03Z at git HEAD `121cd347` (working tree carrying this study, uncommitted);
- the protocol: sha256 `4b7c6e94…`, identical to its freeze of 2026-10-24T11:31:13Z (no amendment);
- `candidates: []`, `screen.selected: []`, the seven candidates' gate results and composites, and the selection
  decisions;
- scenarios: S0 only (the unchanged All-lowDd shadow baseline), with the note that no S1–S3 exists;
- the acceptance constants of PROTOCOL.md §6 (not exercised);
- sha256 of the inputs (the screen, diagnostics, parity, regression and audit records; `data/partitions.json`;
  `splits.json`; the distribution ledger; the allocator configuration; the four frozen phenotypes), of all 16 canonical
  data files, and of 20 code files (this study, the D1 file, the d1-refinement engine and evaluator, the eight-ETF
  search/selection/space/evaluation, the corporate-action and evaluation loaders, the allocator engine).

`npm run complementary-etf-d1 -- stage-c` verifies the body hash and, with no frozen candidate, records
`results/stageC/status.json` and stops: nothing is unlocked and nothing is run.

## What Stage B would have done (unchanged machinery, for the record)

Had a candidate passed: the eight-ETF D1 search (`src/multi-etf-d1/search.ts`, `selection.ts`, `space.ts`) on the
study's training view (`trainingTickerData`, split-adjusted, research view ending 2023-12-29): 4,096 scrambled-Sobol
candidates + D1, five chronological folds each with one NSGA-II run (population 96, ≤ 40 generations, ≤ 3,000 new
simulations), the plateau selection rule, then the predeclared cost gate (beat the unchanged-D1 control at 2 and
5 bps, positive at 10 bps, positive without the best trade) and the training complementarity choice between primary
and lowDd. The prerequisite that **was** verified for all seven candidates: the d1-refinement engine reproduces the
shipped D1 file on each candidate's canonical training partition trade for trade (`results/parity/parity.json`, 0
differences; XOP's 82 trades across its reverse split included).

## Existing optimized vectors (reused, not re-optimized)

The only candidate with an earlier optimization is XLE (`research/multi-etf-d1/FROZEN_CANDIDATES.json`, manifest
`d3645e1e…`): primary X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47 (development $154,448 / minute DD
$24,861 / 23 entries), whose walk-forward failed and which never traded in the 2024–2025 holdout. Against the
All-lowDd training pool only **1 of its 23** training trades is fundable (OPPORTUNITY_SCREEN.md §5). It was not
evaluated beyond training here.
