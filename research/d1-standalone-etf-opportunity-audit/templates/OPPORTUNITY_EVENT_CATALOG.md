# Opportunity event catalog (price-only, bound before any run)

**Evidence tier: T-train window (2016-01-04 → 2023-12-29), daily closes only.** The catalog was built from each
audited ETF's own split-adjusted daily closes and VOOG's, **before any strategy run**, and bound by the protocol freeze
(`results/catalog/catalog.json`); the analysis recomputes it and stops if anything differs. Labels are retrospective
and diagnostic: they never enter a trade decision (the frozen engine reads only completed minutes). Machine-readable:
`results/catalog/catalog.json` (every episode and family) and the event-by-event ledger
`results/tables/capture_ledger.csv`.

## Construction (PROTOCOL.md §7)

1. **Zigzag pivots, 10% reversal.** A running high becomes a confirmed *peak* when a close falls 10% below it; a
   running low becomes a confirmed *trough* when a close rises 10% above it. A decline still in progress at the cutoff
   has an unconfirmed trough.
2. **Episode** = a confirmed peak and the following trough. Depth = 1 − trough ÷ peak (≥ 10% by construction). Each
   episode gets **one** depth band by its own depth — [10,15), [15,20), [20,30), ≥ 30% — so a 45% crash is one episode
   in the ≥ 30% band, never four overlapping threshold events. **Major** = depth ≥ 20%.
3. **Rebound end:** the first close back at the peak (*recovered*), else the next confirmed peak (*partial*), else the
   cutoff (*open*). The rebound high is the highest close in (trough, end].
4. **Family (one dip event):** an episode joins the current family while its trough is within 126 sessions of the
   family's first trough; otherwise it starts a new one. Anchored, not chained.
5. **Independent events** (used by F1 and the families axis): among the families a run dip-captured, those whose
   anchor troughs are at least 252 sessions apart, counted greedily in time.
6. **Eligible** iff the trough is on or after 2017-06-15 (the books arm then). Earlier episodes are *ineligible*,
   never misses, and never count toward a family.
7. **Coverage:** the share of eligible sessions inside any episode span (peak, rebound end] — a reminder that "a trade
   inside an episode" is weak evidence by itself, hence the stricter *dip entry* (decline phase, or at least 50% of the
   episode's depth below its peak).

### Disclosed revision before the freeze

The first catalog (`results/catalog/catalog-v1-superseded.json`) chained families until a recovered episode was
followed by a 63-session gap. On its price-only output it merged all of 2016–2023 into one family for GDX, XME and SLV
(the families tests would have failed for them by construction), so it was replaced by the anchored 126-session rule
before the freeze. The 126-session window was chosen after seeing those counts; it can split one long bear market
(2022; March and September 2020) into two families, which is why independence is counted with the stricter 252-session
spacing.

## Per ETF

{{ev.catalog}}

Realised volatility is the annualised standard deviation of daily close-to-close log returns, 2016-01-04 →
2023-12-29. The perturbation designs' relative sizes should be read against it (`PARAMETER_NEIGHBORHOOD_ROBUSTNESS.md`).

## Eligible families (dates and deepest running-peak drawdown inside the family)

{{ev.families}}

## Common-market context

VOOG's own catalog (same algorithm) is the market context: every ETF episode lists the VOOG episodes it overlaps in
`results/tables/capture_ledger.csv` (`voog_overlap`). The family dates above show where an ETF's corrections differ
from VOOG's (VOOG has 5 eligible families, 4 major); the catalog never assumes they coincide.
