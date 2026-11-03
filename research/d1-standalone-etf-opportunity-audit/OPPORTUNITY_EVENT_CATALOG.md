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

| ETF | realised vol. | eligible episodes | by band 10-15 / 15-20 / 20-30 / 30+ | major | eligible families | major families | coverage |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EDV | 20.3% | 10 | 4 / 2 / 1 / 3 | 4 | 6 | 3 | 96% |
| EWW | 26.1% | 12 | 4 / 6 / 1 / 1 | 2 | 8 | 2 | 71% |
| FXI | 27.2% | 13 | 3 / 3 / 4 / 3 | 7 | 9 | 6 | 83% |
| GDX | 37.3% | 26 | 11 / 9 / 5 / 1 | 6 | 10 | 5 | 85% |
| IJH | 22.0% | 8 | 4 / 1 / 2 / 1 | 3 | 5 | 3 | 58% |
| KBE | 31.1% | 18 | 7 / 5 / 3 / 3 | 6 | 9 | 4 | 82% |
| MTUM | 20.7% | 9 | 4 / 1 / 3 / 1 | 4 | 6 | 3 | 64% |
| SLV | 26.6% | 21 | 11 / 6 / 2 / 2 | 4 | 10 | 4 | 91% |
| VGT | 24.3% | 13 | 7 / 1 / 5 / 0 | 5 | 7 | 4 | 40% |
| VOOG | 20.7% | 6 | 1 / 1 / 3 / 1 | 4 | 5 | 4 | 42% |
| XHB | 27.4% | 9 | 3 / 2 / 1 / 3 | 4 | 6 | 3 | 52% |
| XLB | 21.7% | 9 | 4 / 2 / 2 / 1 | 3 | 5 | 3 | 59% |
| XME | 34.4% | 22 | 11 / 4 / 5 / 2 | 7 | 10 | 5 | 86% |

Realised volatility is the annualised standard deviation of daily close-to-close log returns, 2016-01-04 →
2023-12-29. The perturbation designs' relative sizes should be read against it (`PARAMETER_NEIGHBORHOOD_ROBUSTNESS.md`).

## Eligible families (dates and deepest running-peak drawdown inside the family)

- **EDV:** EDV-F02 2017-12-15→2019-05-30 (18%); EDV-F03 2019-08-28→2020-08-04 (19%); EDV-F04 2020-08-04→2021-12-03 (30%, major); EDV-F05 2021-12-03→2022-12-07 (50%, major); EDV-F06 2022-12-07→2023-04-06 (13%); EDV-F07 2023-04-06→2023-12-29 (32%, major)
- **EWW:** EWW-F03 2017-08-25→2018-08-07 (24%); EWW-F04 2018-08-07→2019-04-17 (29%, major); EWW-F05 2019-04-17→2020-01-16 (19%); EWW-F06 2020-01-17→2020-10-23 (48%, major); EWW-F07 2021-01-08→2021-04-05 (11%); EWW-F08 2021-08-31→2022-05-27 (14%); EWW-F09 2022-05-27→2022-11-11 (18%); EWW-F10 2023-07-28→2023-12-13 (19%)
- **FXI:** FXI-F03 2018-01-26→2019-01-31 (29%, major); FXI-F04 2019-04-05→2020-01-13 (18%); FXI-F05 2020-01-13→2020-07-06 (25%, major); FXI-F06 2020-07-08→2020-11-04 (11%); FXI-F07 2021-02-17→2022-04-04 (50%, major); FXI-F08 2022-04-04→2022-05-31 (18%); FXI-F09 2022-06-08→2023-01-26 (39%, major); FXI-F10 2023-01-26→2023-07-31 (22%, major); FXI-F11 2023-07-31→2023-12-29 (25%, major)
- **GDX:** GDX-F03 2017-02-08→2017-08-28 (17%); GDX-F04 2017-09-07→2018-01-24 (16%); GDX-F05 2018-01-24→2019-02-20 (29%, major); GDX-F06 2019-02-20→2019-12-30 (15%); GDX-F07 2020-02-24→2020-08-17 (39%, major); GDX-F08 2020-08-17→2021-05-17 (28%); GDX-F09 2021-05-17→2022-02-14 (27%, major); GDX-F10 2022-04-18→2022-11-08 (47%, major); GDX-F11 2023-01-25→2023-07-18 (20%); GDX-F12 2023-07-18→2023-12-29 (21%, major)
- **IJH:** IJH-F02 2018-08-29→2019-12-20 (24%, major); IJH-F03 2020-02-20→2020-08-12 (42%, major); IJH-F04 2021-11-16→2022-08-16 (24%, major); IJH-F05 2022-08-16→2023-07-19 (17%); IJH-F06 2023-07-31→2023-12-14 (15%)
- **KBE:** KBE-F02 2017-03-01→2017-11-29 (14%); KBE-F03 2018-03-09→2019-05-03 (32%, major); KBE-F04 2019-05-03→2019-11-05 (14%); KBE-F05 2019-12-17→2020-08-11 (52%, major); KBE-F06 2020-08-11→2020-10-22 (17%); KBE-F07 2021-06-01→2022-01-06 (15%); KBE-F08 2022-01-14→2022-11-10 (29%, major); KBE-F09 2022-11-10→2023-08-07 (37%, major); KBE-F10 2023-08-07→2023-12-04 (18%)
- **MTUM:** MTUM-F02 2018-01-26→2018-06-06 (10%); MTUM-F03 2018-10-01→2019-06-20 (22%, major); MTUM-F04 2020-02-19→2020-12-04 (34%, major); MTUM-F05 2021-02-12→2021-08-05 (16%); MTUM-F06 2021-11-03→2022-08-25 (33%, major); MTUM-F07 2022-08-25→2023-12-12 (13%)
- **SLV:** SLV-F03 2017-04-13→2018-01-24 (16%); SLV-F04 2018-01-24→2019-02-20 (21%, major); SLV-F05 2019-02-20→2019-07-18 (11%); SLV-F06 2019-09-04→2020-07-08 (39%, major); SLV-F07 2020-08-10→2021-02-01 (22%); SLV-F08 2021-02-01→2021-05-17 (17%); SLV-F09 2021-05-17→2022-03-01 (24%, major); SLV-F10 2022-03-08→2022-11-08 (33%, major); SLV-F11 2023-01-13→2023-08-29 (18%); SLV-F12 2023-08-29→2023-12-29 (15%)
- **VGT:** VGT-F02 2018-01-26→2018-02-26 (10%); VGT-F03 2018-10-03→2019-07-01 (24%, major); VGT-F04 2020-02-19→2020-04-06 (32%, major); VGT-F05 2020-09-02→2021-04-09 (13%); VGT-F06 2021-12-27→2022-08-15 (32%, major); VGT-F07 2022-08-15→2023-01-26 (23%, major); VGT-F08 2023-07-18→2023-11-20 (13%)
- **VOOG:** VOOG-F01 2018-10-01→2019-04-23 (21%, major); VOOG-F02 2020-02-19→2020-07-02 (32%, major); VOOG-F03 2020-09-02→2020-12-04 (11%); VOOG-F04 2021-12-27→2022-08-15 (31%, major); VOOG-F05 2022-08-15→2023-07-17 (21%, major)
- **XHB:** XHB-F03 2018-01-22→2019-01-31 (34%, major); XHB-F04 2020-02-20→2020-04-08 (50%, major); XHB-F05 2021-05-07→2021-11-04 (12%); XHB-F06 2021-12-10→2023-01-31 (40%, major); XHB-F07 2023-02-02→2023-05-18 (11%); XHB-F08 2023-08-01→2023-12-01 (18%)
- **XLB:** XLB-F02 2018-01-26→2019-02-25 (26%, major); XLB-F03 2019-12-31→2020-07-22 (38%, major); XLB-F04 2021-05-17→2022-04-20 (12%); XLB-F05 2022-04-20→2022-11-22 (26%, major); XLB-F06 2023-02-01→2023-12-26 (13%)
- **XME:** XME-F03 2017-02-13→2017-12-20 (20%); XME-F04 2018-01-11→2018-06-06 (16%); XME-F05 2018-06-06→2019-07-24 (37%, major); XME-F06 2019-07-24→2019-12-04 (15%); XME-F07 2019-12-12→2020-08-05 (52%, major); XME-F08 2020-09-18→2021-04-26 (13%); XME-F09 2021-06-01→2022-01-12 (17%); XME-F10 2022-01-12→2022-08-25 (37%, major); XME-F11 2022-08-25→2023-01-12 (23%, major); XME-F12 2023-03-03→2023-12-19 (25%, major)

## Common-market context

VOOG's own catalog (same algorithm) is the market context: every ETF episode lists the VOOG episodes it overlaps in
`results/tables/capture_ledger.csv` (`voog_overlap`). The family dates above show where an ETF's corrections differ
from VOOG's (VOOG has 5 eligible families, 4 major); the catalog never assumes they coincide.
