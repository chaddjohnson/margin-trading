# Source-of-evidence matrix and evidence boundaries

## Evidence tiers used in every report

| Tier | Span | What it can show | What it cannot |
|---|---|---|---|
| **T-train** (inspected training) | 2016-01-04 → 2023-12-29 | how the stored vectors behaved on the data they were optimised on; local flatness; episode capture | out-of-sample merit; the 2,048-vector search and the choice among 61 ETFs are not undone |
| **T-retro** (inspected walk-forward) | fold-a validation 2020-07-01 → 2021-12-31; fold-b 2022-01-01 → 2023-12-29 | whether a vector chosen *before* those years kept working in them (period-correct process check) | fresh validation — those years were inspected by earlier studies |
| **T-2024** (inspected 2024–2026) | 2024-01-02 → 2026-10-13 | the unchanged incumbents' known full-history anchors (context only) | anything about the research candidates: **no research phenotype is run after 2023-12-29** |
| **T-prospective** | after 2026-10-13 | — | nothing exists; forward observations: **0** |

## What is available, computed, or barred

| Evidence | Fold-a vectors | Fold-b vectors | Final vectors (the candidates) | VGT primary, B4, B5, C0 |
|---|---|---|---|---|
| Stored Stage A aggregates (net, trades, DD, best/worst, nets by exit year, 16-draw J_s neighbourhood) | stored | stored | stored | B1/B4/B5 stored as source controls |
| Per-trade ledger, MAE/MFE, episodes | computed here (fold check) | computed here (fold check) | computed here (Stage C) | computed here |
| Run through the fold's validation end | **permitted** (source CLI door after its sealed validation) — computed here (§9.1) | **permitted** — computed here | n/a | stored source increments (B1/A/B4) |
| Run after 2023-12-29 | barred | barred | **barred** (no controlling record authorises it) | full-history anchors only (already inspected) |
| Run a final vector on an earlier slice and call it out-of-sample | — | — | **barred** (laundering) | — |
| Pooled fold validation (C/D picks under R1/R2) | stored: membership and pooled V only; per-ETF validation attribution **not stored** | stored, same | — | stored |
| Portfolio (20%) mode | not stored | not stored | computed here | computed here (same window) and anchors |
| Cost stress beyond 5 bps / 11% | not stored | not stored | computed here | computed here (same window) |

## Doors (`src/d1-standalone-opportunity-audit/data.ts`)

- `candidateUniverse`: the source study's own `inspectionUniverse('final', …)` (its chronology and audited file
  hashes), refusing any end after 2023-12-29 before a byte is read.
- `foldUniverse`: the same source door for a fold, through at most that fold's validation end.
- `fullHistoryUniverse`: VOOG VGT XBI XRT KRE GDX on `all`, pinned to `config/pools/B5.json`, for the unchanged
  incumbents only. It restricts *symbols*, so research vectors of those symbols (GDX, VGT, XBI, XRT, KRE) are kept off
  it by their cutoff check in the CLI (tested: `fixed GDX:representative --end 2026-10-13` is refused) and by the fact
  that no Stage 3–4 code path calls it.
- The CLI's `fixed` view refuses research phenotypes after their cutoff and never treats a research JSON as a
  registered phenotype.

## Restrictions inherited from the source study (verified in its `PROTOCOL.md` §4.4 and §14)

- The final window's research pools and phenotypes may be read through 2023-12-29 only ("no evaluation after
  2023-12-29"); the 2024–2026 door opened only for a nominee, and there was none (`FROZEN_SELECTION.json`: no
  advancement).
- A fold's data may be read through its validation end only after that fold's validation was sealed (it was).
- The 15 diverse-d1 finalists are never used; nothing here touches them.

## Chronological facts per window

| Window | Vectors chosen with data through | Validation years (inspected) | Source's pooled verdict |
|---|---|---|---|
| fold-a | 2020-06-30 | 2020-07-01 → 2021-12-31 | the procedure gate failed (`PROCEDURE_GATE.json`) |
| fold-b | 2021-12-31 | 2022-01-01 → 2023-12-29 | the same |
| final | 2023-12-29 | none | no advancement (B4 default, B5 leading incumbent) |
