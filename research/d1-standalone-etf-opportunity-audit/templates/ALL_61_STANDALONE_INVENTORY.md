# All 61 standalone D1 research records — census (Stage A)

**Evidence tier: T-train (inspected training).** Every figure below is a *stored* output of the ranked-preemption
study (`research/d1-ranked-preemption/`), read from its sealed, hash-verified records; nothing on this page was re-run
or optimised. Derived columns (top-3 share, per-day ratios) are arithmetic on stored fields. The machine-readable
census, one row per symbol × window, is `results/inventory/census.json` (complete records) and
`results/inventory/census.csv` (flat columns).

## Source and its procedure (verified, not assumed)

Each of the 61 eligible ETFs (the October 25 audited universe; GDXJ and OIH are late, XLRE excluded) received the
same procedure in each window on that window's training data only: 2,048 paired Sobol vectors over the source box,
a local search from the four best credible starts, a 16-draw neighbourhood check of the eight best credible vectors
with distinct trades, the **representative** (the best neighbourhood median of J_s = net − best trade − max(0,
minute DD − $20,000)), and a **library** of up to four phenotypes whose entry sessions differ by Jaccard distance
≥ 0.5. One $100,000 slot, 5 bps per side, 11% simple interest, books armed 2017-06-15. "Credible" = trades ≥
max(4, ⌈eligible years⌉) (fold-a 4, fold-b 5, final 7), minute DD ≤ $35,000 and net > 0.

{{inventory.counts}}

- The source's **exploration reserve was empty in every window** — a defect of its pooled rule (idleness measured
  against 49–54 simultaneously active survivors). That rule is not used here: standalone screening has no cross-symbol
  idleness rule.
- Library files: {{inventory.libraryCount}} across the three windows (representatives included).

### Source checks (`results/inventory/source-checks.json`)

{{inventory.checks}}

## Final window (search end 2023-12-29) — the representative of every symbol

Status a/b/final: `surv` survivor, `*` uncertain (< 10 trades), `scr-down` screened-down. "nb" = the stored
16-draw neighbourhood of the representative; its scores are J_s values (not nets) and its credible count is the
number of draws that were credible. "Sobol credible" = the share of the symbol's 2,048 Sobol vectors that were credible
(the breadth of the credible region over the whole box). R1/R2 = the frozen source rankings (descriptive only; they
are not this study's objective).

{{inventory.final}}

## Fold windows — the period-correct representatives

The fold-a and fold-b representatives were chosen on data through 2020-06-30 and 2021-12-31; they are generally
**different vectors** from the final-window representative of the same ETF. A final-window vector says nothing about
an earlier fold's out-of-sample years.

{{inventory.folds}}

## What the source never stored (must be computed, never assumed)

{{inventory.unavailable}}

These are computed in Stage C for the shortlisted phenotypes only (`OPPORTUNITY_*`, `COST_AND_TAIL_RISK.md`,
`PORTFOLIO_AND_CAPITAL_EFFICIENCY.md`) and, for the fold representatives of all 61, in Stage D
(`CHRONOLOGICAL_EVIDENCE_AND_SELECTION_BIAS.md`).

## Instrument notes

- **Semiconductors:** SMH is the only semiconductor fund in the universe. It stays in this census with all its
  records; it is research-only and not presumed eligible for the user's holdings, so the shortlist scores it but never
  places it.
- **Liquidity:** minute coverage below 75% (EDV, IYT, VOOG, VPU) or training median dollar volume below $50M
  (DBC, EDV, ILF, IYT, KIE, VOOG, VPU) is noted per row; fills at "the first trade after the decision" can lag in thin
  minutes.
- **Survivorship:** the universe is today's listed funds with complete 2016–2026 data; funds that closed or launched
  later are absent, and the universe was chosen by an earlier study.
- **Splits** are forward-adjusted from `config/market-events/splits.json`; distributions exist only for VGT/VOOG.
