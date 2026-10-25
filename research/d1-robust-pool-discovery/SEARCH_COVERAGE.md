# Search coverage (PROTOCOL.md §9) — 2026-10-25

How the predeclared discovery budgets were spent, per round and arm, and how evenly the 61 eligible symbols were
searched. Full per-symbol tables: `results/tables/coverage.md` (configurations and distinct vectors per symbol after
the islands and at the end, centre-feasible counts, floor met or not; islands and stop reasons; descriptive PBO).

## 1. Budgets (all spent exactly; predeclared, never changed)

| Round / arm | Configurations | Island cap × 8 | Coverage reserve | Generations per island | Cache hits | Discovery time |
|---|---:|---|---:|---|---:|---:|
| fold-a J | 12,000 | 1,275 × 8 | 1,800 | 26 | 58 | 154 s |
| fold-a Q | 12,000 | 1,275 × 8 | 1,800 | 26 | 107 | 17 s |
| fold-b J | 12,000 | 1,275 × 8 | 1,800 | 26 | 114 | 209 s |
| fold-b Q | 12,000 | 1,275 × 8 | 1,800 | 26 | 75 | 22 s |
| final unseeded (primary arm) | 24,000 | 2,550 × 8 | 3,600 | 53–55 | 416 | 731 s |
| final benchmark-seeded | 24,000 | 2,550 × 8 | 3,600 | 53 | 171 | 669 s |

Every island stopped on its budget (none stalled). Q arms are fast because they need no neighbourhoods. Total
discovery: 96,000 configurations; with promotion (300 × 96 draws per group), refinement and assessment, the final
round took 50 minutes and each fold round 15–17 minutes on 8 workers.

## 2. Coverage against the floor

The floor per symbol and arm is ≥ 400 × (budget ÷ 16,000) configurations containing the symbol and ≥ 150 × (budget ÷
16,000) distinct vectors on it: 300 / 113 in a fold arm, 600 / 225 in a final arm. Symbols under the floor after the
islands share the 15% reserve equally, each at least 100 evaluations, served alphabetically when the reserve cannot
give 100 to all.

| Round / arm | Under the floor after the islands | Served by the top-up (100 each) | Still under the floor at the end | Configurations per symbol: min / median / max |
|---|---:|---:|---:|---|
| fold-a J | 22 | 18 | 4 (EWZ XLI XME XOP) | 116 (XOP) / 491 / 6,204 (GDX) |
| fold-a Q | 22 | 18 | 2 | 135 (XOP) / 505 / 7,367 (GDX) |
| fold-b J | 30 | 18 | 6 | 145 (XOP) / 427 / 2,621 (GDX) |
| fold-b Q | 23 | 18 | 4 | 137 (XOP) / 472 / 4,628 (GDX) |
| final unseeded | 48 | 36 | **29** | 191 (XOP) / 623 / 8,546 (SLV) |
| final seeded | 44 | 36 | **25** | 215 (XOP) / 653 / 12,760 (GDX) |

**The floor was not met for many symbols in the final round.** The evolutionary islands concentrate quickly on a few
symbols (GDX above all; SLV, XLK, FXI and XLI in the unseeded final arm), and the reserve rule (≥ 100 per served
symbol) can lift at most 36 symbols by 100 each, too little to close gaps of 200–400. This is the protocol working as
written, not a defect, but it means the search is **not** an even exploration of the 61-symbol space: in the unseeded
final arm, XBI appeared in only 222 of 24,000 configurations, XRT in 304, KRE in 386 and GDX in 432 — the region the
seeded arm (started from B1/B4/B5) found to be the best was barely visited by the unseeded arm. Every symbol was
searched at least 116 times in every arm, and the final round's under-covered symbols are listed in the table above
and in `coverage.md`; no symbol was excluded from any arm.

## 3. Where the arms went

| Round / arm | Best configurations at discovery (S at n = 12, or Q) |
|---|---|
| fold-a J | EDV GDX XRT / EDV GDX KRE / GDX IJH SMH families (GDX in every refined family) |
| fold-a Q | EWZ GDX, GDX XHB, GDX XLI, GDX IWN (30 families among the top 300) |
| fold-b J | one family: every top-300 configuration contains GDX and XRT (with SLV and/or IBB) |
| fold-b Q | GDX VGT XHB, EWZ GDX XBI XLK, GDX XBI XLK, GDX USMV XLK |
| final unseeded | FXI SLV XLI XLK (S ≈ $199k) |
| final seeded | GDX KRE VGT XBI and relatives (S ≈ $297k), i.e. B5 without XRT, then GDX KRE XBI XLE |

GDX is in every fold pick and in the final finalist: across 2016–2023 a gold-miner D1 book is the most valuable single
member of a shared pool under this instrument, in every window. Whether that is a durable property or a feature of
these eight years cannot be told from inside them.

## 4. Overfitting diagnostics (descriptive only; no stage reads them)

PBO by CSCV on the quarterly attribution of each archive's top 1,000 (S = 8 and 16 blocks):

| | fold-a J | fold-a Q | fold-b J | fold-b Q | final unseeded | final seeded |
|---|---|---|---|---|---|---|
| PBO (S = 8 / 16) | 0.63 / 0.78 | 0.60 / 0.70 | 0.49 / 0.61 | 0.94 / 0.97 | 0.51 / 0.44 | 0.76 / 0.74 |

Values near or above 0.5 say that the configuration best in one half of the quarters is typically below median in the
other half: the archives' top ranks are not stable across time even inside training. The peak arm in fold-b (0.94) is
the most overfit; the seeded final arm (0.74–0.76) more than the unseeded one (0.44–0.51).
