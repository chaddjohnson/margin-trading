# Data and universe audit (PROTOCOL.md §3.4) — 2026-10-25

**What decides eligibility.** One set of integrity and tradability rules for all 64 candidates (the 16 existing datasets
and the 48 ingested), evaluated by `npm run robust-d1 -- audit` from the verified canonical files only — no strategy,
P&L or ranking enters (§2.7 (2)). Result: `results/audit/universe.json` (frozen with the protocol).

| Rule | Criterion |
|---|---|
| D1 history | first regular bar on the 2016-01-04 session; a regular bar on every NYSE session through 2026-10-13 |
| D2 integrity | `datasets -- verify` status verified; the file hashes to its verified report |
| D3 corporate actions | no split-sized (30%) overnight move without a registered split and a source document |
| D4 structure | no leveraged/inverse/volatility/single-commodity-futures fund, ETN, or objective/asset-class change |
| D5 tradability | training median regular-session daily dollar volume ≥ $10M; whole-file median minute coverage ≥ 25% |

## Outcome

**61 eligible** (all 16 existing symbols and 45 of the 48 new ones), on one calendar of **2,710 sessions** from
2016-01-04 to 2026-10-13.

| Cohort | Symbols | Reason |
|---|---|---|
| eligible (61) | sector-industry 23, factor-size 13, non-US 11, rates-credit 9, real assets 5 | all of D1–D5 |
| late cohort (2) | GDXJ, OIH | D1: the SIP minute data begin on 2016-05-02 (both VanEck funds); recorded, not used (one engine calendar) |
| excluded (1) | XLRE | D1: no regular-session bar on 2016-01-25 and 2016-02-16 (thin trading after its October 2015 launch); the engine cannot mix calendars |

No symbol failed D2, D4 or D5. The thinnest eligible books in training: KIE ($11.4M median daily dollar volume),
EDV ($15.6M), VOOG ($15.8M; 41% minute coverage, median 134 bars per session — the known sparse case), VPU ($21.5M),
DBC ($27.4M). These pass the floor; whether a $100,000 lot (or a 20%-of-equity portfolio lot) is a realistic size in
their minutes is measured per finalist by the capacity rule (§17), not here.

## Corporate actions

Thirteen splits new to the registry, each with an issuer or OCC document copied to
`config/market-events/raw/split-sources-2026-10-25/` (sha256 in each registry entry), appended to
`config/market-events/splits.json` without changing any existing entry:

| Symbol | Effective | Ratio (new per old) | Source | Inside |
|---|---|---:|---|---|
| EWJ | 2016-11-07 | 0.25 (1-for-4 reverse) | OCC #39966 | training (before arming) |
| IJR | 2017-01-19 | 2 | iShares 497 supplement 2016-12-16; OCC #40437 | training (before arming) |
| KIE | 2017-11-30 | 3 | OCC #42157 | training |
| IBB | 2017-12-01 | 3 | OCC #42137 | training |
| OIH | 2020-04-15 | 0.05 (1-for-20 reverse) | VanEck release 2020-04-01 | late cohort, not used |
| IAU | 2021-05-24 | 0.5 (1-for-2 reverse) | OCC #48664 | training |
| SMH | 2023-05-05 | 2 | VanEck release (corrected) 2023-04-17 | training |
| IJH | 2024-02-22 | 5 | OCC #53923 (BOX 206391) | holdout |
| IGV | 2024-03-07 | 5 | OCC #53935 (BOX 206422) | holdout |
| IYT | 2024-03-07 | 4 | OCC #53941 (BOX 206419) | holdout |
| XLB | 2025-12-05 | 2 | OCC #57732 | final |
| XLK | 2025-12-05 | 2 | OCC #57735 | final |
| IWF | 2026-04-29 | 4 | OCC #58763 (BOX 207666) | final |

`npm run market-events -- verify` then confirmed all 19 registered splits against the raw data and listed no
unexplained split-sized move in any file. Every split is forward-adjusted once by the shared loader for whatever window
is read; a split after a round's search end is never read by that round.

**Overnight moves beyond ±15% that no split explains** (listed by rule, inspected):

| Symbol | Date | Move | Reading |
|---|---|---:|---|
| XLF | 2016-09-19 | ×0.819 | the in-kind distribution of real-estate holdings when XLRE was carved out of XLF — a corporate action, not a market move (below) |
| EWZ | 2017-05-18 | ×0.822 | the Brazil political crisis ("Temer tape"), a market move |
| EWZ, ILF, XLE, XLF, XOP, OIH, GDXJ | 2020-03-09 → 03-24 | ×0.76 – ×1.28 | the COVID crash and its rebounds |
| SLV | 2026-01-30 | ×0.846 | a silver crash (after training) |

**The XLF distribution cannot create a fake signal.** It happened before books arm (2017-06-15), but a reference high
looks back up to 250 sessions. Checked on the canonical file: for every session from arming on and every lookback
L ≤ 250 that reaches back across 2016-09-19, the highest post-distribution session high exceeds the highest
pre-distribution high by at least $0.66 (pre-distribution maximum in reach $24.64; post-distribution maximum before arming
$25.30), so no reference high used by any book is set by a pre-distribution price. No position is held before arming.
XLF was also in the 16-ETF universe on the same data.

## Distributions

Only VGT and VOOG have a verified distribution ledger (`config/market-events/distributions.csv`); the fixed pool is
price-only for every lot, and the gated portfolio comparisons use the symmetric convention (no lot receives
distributions; the core receives its VGT/VOOG distributions). Income-heavy eligible books (TLT, IEF, SHY, AGG, LQD, HYG,
EMB, TIP, EDV, XLU, VPU, KRE, KBE …) are therefore understated by their cash yield while held; per-finalist omission
bounds, and a fully accounted diagnostic where a reliable history exists, follow §16. Ex-dividend price drops are in the
raw prices and can trigger exits (a signal effect, not only an accounting one).

## Limitations

- D4 rests on the funds' published structure (all candidates are unleveraged, long-only ETFs or grantor trusts; DBC is
  a diversified commodity-futures fund kept with its roll-yield caveat). No exhaustive review of every index-methodology
  document was made; GICS reclassifications (2016 real estate, 2018 communication services) affected VGT, XLK, XLY and
  XLF alike and are not treated as breaks.
- The two late-cohort funds and XLRE are not studied; a shorter-calendar cohort would need its own protocol.
- Raw SIP minute bars include extended-hours bars; the engine reads regular-session bars and the closing print only.

## Per-symbol table

[results/tables/universe.md](results/tables/universe.md) (rule outcomes, dates, sessions, dollar volume, coverage,
bars per session, splits, moves, reasons); hashes in `results/audit/universe.json`.
