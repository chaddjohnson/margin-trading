# Chronological evidence and selection bias (Stage D)

**Evidence tier: T-retro (inspected walk-forward history), weaker than a true walk-forward.** Each fold
representative was chosen by the source study on data through its fold's search end (fold-a 2020-06-30, fold-b
2021-12-31) and is run here, unchanged, through that fold's validation end (2021-12-31, 2023-12-29) — exactly what the
source study's own read-only door permits after its sealed validation. Those validation years were inspected by
earlier studies, and the source procedure itself was designed with 2016–2026 known. **No final-window vector is run on
an earlier slice and called out-of-sample**; the fold vectors are generally *different vectors* from the final ones.

**V** = the liquidation-equivalent strategy mark at the validation end minus the same at the search-end close. The mark
at the search-end close equals the stored Stage A net for every one of the 119 fold vectors (checked; `analyze`
stops otherwise). There are 119 fold vectors, not the 122 that PROTOCOL §9.1 states (and 238 runs, not §12's 244):
IEF in fold-a and SHY in both folds had no trade in any evaluated vector, so the source study has no representative for
them (reporting amendment A1). Machine-readable: `results/tables/folds.csv`.

## The cross-section of 61 ETFs (the less biased view)

{{chrono.selection}}

Rank stability of the stored training nets across windows (Spearman): {{chrono.rank}}.

Each fold's ten best training ETFs and their validation increment V:

{{chrono.top10}}

- **Training rank says little about the next 18–24 months.** The Spearman correlation between a fold's training net and
  its V is 0.23 (fold-a) and 0.22 (fold-b) — positive but weak (descriptive only; ETFs, trades and years are not
  independent, so no p-value is computed).
- **The fold-b window (2022–2023) was hard for the procedure:** the median V is −$211, half of the 60 vectors lost
  money, and only a third gained. Fold-a's (2020-07 → 2021-12) median V is +$2,402, with 58% positive.
- **Training ranks are persistent** (0.80–0.85 across windows): the same ETFs look good in every training window, which
  is consistent both with durable D1-friendliness and with overlapping training data (fold-b contains fold-a's).

## The shortlisted ETFs and VGT (period-correct fold representatives)

{{chrono.shortlisted}}

Columns: V at 5 / 10 bps (lots entered after the boundary, lots open across it); the final-window net percentile among
the 61; the step-unit distance from each fold vector to the final vector (X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5,
W 10 grid units).

- **Only IJH, EWW, XME and GDX have V > 0 in both folds.** IJH +$12,403 / +$14,023; EWW +$2,249 / +$17,506; XME
  +$30,130 / +$15,100; GDX only +$1,133 / +$4,196 despite the largest training nets of all.
- **SLV, FXI, MTUM, XHB, KBE, XLB and EDV have a negative fold** (F8 negative): SLV −$9,989, FXI −$9,931, MTUM −$11,095,
  XHB −$7,200 in fold-b; KBE −$1,346 and XLB −$261 in fold-a; EDV negative in both (−$16,837, −$9,218).
- **Fold V can flip with cost:** XME's fold-b vector gains $15,100 at 5 bps but $57,271 at 10 bps, and XHB's fold-a
  vector gains $23,350 at 5 bps but nothing at 10 bps — one exit's sign decides whether D1's continuation window opens.
- **VGT's own period-correct fold representatives:** +$11,905 (fold-a) and **−$20,933** (fold-b). VGT primary's stored
  fold increments ({{chrono.vgtPrimary}}) are not a test: VGT primary was chosen with those years known.
- An F8 pass for a shortlisted ETF is conditioned on its selection (the shortlist used final-window records that
  contain 2020–2023); the 61-ETF cross-section above is the less biased reading.

## Stored pooled fold records (membership only; per-ETF validation attribution was never stored)

{{chrono.pooled}}

Every source procedure failed its fold gates. In fold-a, EDV, EWW, FXI, GDX and XHB sat in both D picks; in fold-b, FXI
and GDX sat in both D picks, EWW in D-R1 and XME in D-R2 and C-R1. Pooled validation results mix shared-slot effects and say nothing about a standalone vector.

## Selection bias, stated plainly

- **Instrument selection:** the 11 ETFs were chosen from 61 by inspecting stored 2016–2023 outcomes; the merit picks
  (XME, GDX, KBE) were chosen *because* their stored nets beat VGT primary's — the winner's curse applies most to them.
- **Phenotype selection:** each vector is the best of ~2,300 evaluated per ETF and window (2,048 Sobol plus local
  search), chosen by a neighbourhood score over 16 draws. The local robustness measured here does not undo that search.
- **The comparison is asymmetric:** the candidates were fitted to this window; VGT primary was not. The
  procedure-matched VGT control shows what the same procedure finds on VGT: its joint median net is $60,635 (against
  VGT primary's $71,174), it raises F4, F8 (negative), F9 and F10, and its fold-b vector lost $20,933 — the source
  procedure's own VGT pick looks worse than VGT primary on the neighbourhood and capture tests (though more
  cost-robust: C1 keeps 89% of its net against VGT primary's 63%).
- **No bootstrap, p-value, PBO or deflated Sharpe** is reported: the trials are neither independent nor complete.

## All 119 fold vectors

{{chrono.all}}
