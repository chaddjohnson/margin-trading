# Adaptive re-entry program — consolidated comparison

Coordinator deliverable, 2026-10-12. Sources: the eight stage reports (file index at the end), the
machine-readable outputs they were audited against (`comparison/all_records.csv`, 600 records;
`comparison/aggregated.csv`; every family `results/summary.json`), and the complete pre-registration
registry (`HYPOTHESES.md`, **188 configurations**, append-only, registered before evaluation).
Every number in this document was taken from, and cross-checked against, the machine-readable
outputs; the per-report audits are described in §8.

**Read this first.** All results use the same four heavily reused datasets (plus six fresh
instruments in validation). The program's shared history contains only ~7 independent market
episodes, two of which (2000–02, 2007–09) carry most of the risk mass; VGT/QQQ are correlated
within each era. 188 configurations were evaluated under that much selection pressure, so most
in-sample edges of +$15–40k on strategies with $25–90k drawdowns are the expected magnitude of a
winner's curse. The validation stage (§6) separates what survives from what does not. Nothing here
is a validated expectation of future performance.

## 1. Reference points (Σ over the four frozen datasets; net / worst-dataset max DD)

| | Σ net | worst DD | bear-window Σ | recovery-window Σ |
|---|---:|---:|---:|---:|
| Original baseline | 286,876 | 149,561 | −159,157 | 404,083 |
| Existing 3% rule (REF_lower3) | 380,979 | 91,469 | +13,805 | 404,012 |

Per dataset (net/DD): baseline 11,602/73,404 · −2,886/149,561 · 161,772/38,323 · 116,388/39,237;
existing 3%: 26,384/54,279 · 40,258/91,469 · 182,094/28,687 · 132,242/23,564.

## 2. Headline candidates (strategy level, deduplicated across directories)

Net / max DD per dataset (VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26), Σ net, and the validation verdict:

| Candidate (mechanism) | VGT05-15 | QQQ99-15 | VGT16-26 | QQQ16-26 | Σ net | Validation verdict |
|---|---|---|---|---|---:|---|
| **G8**: material-loss trigger (−1%) + 3% + 38%-retrace reset | 26,600/50,883 | 87,890/65,407 | 200,595/28,208 | 130,897/30,446 | **445,982** | survives vs its own legs; only config additive out of design; trade-off vs A2_material_05; cutoff −1% one step from a 2022 cascade |
| **C6_retrace_38**: 3% + reset at 38% retrace of ref-high→low | 22,980/50,127 | 64,997/70,917 | 215,011/28,687 | 134,055/26,851 | 437,043 | parameter plateau (0.34–0.50, cliff at 0.30); transfers 4/1 fresh; small systematic 2022-grind tax |
| G4: material-loss trigger + stall-decay + frozen-high reset | 28,363/54,279 | 87,165/63,294 | 184,948/29,336 | 122,206/29,106 | 422,682 | **does not survive**: whole edge = one trade, dies at (20,80) and ages ≥25; ≡ A2_material_1 on all six fresh instruments |
| D7_tiny: tiny losses (<$2k) re-enter at the exit price | 30,734/58,645 | 73,678/69,850 | 195,238/28,436 | 122,725/31,521 | 422,374 | mechanism transfers (5/1 fresh); the $2k bound is an **isolated peak** (adjacent bounds flip 3 datasets) |
| A2_material_1: arm only on price loss ≤ −1% | 28,363/54,279 | 67,162/78,370 | 184,948/29,336 | 122,206/29,106 | 402,679 | old-era plateau; new-era deltas are knife-edge residue |
| B7_stall: 3% decaying once the episode low is 20 sessions old | =REF | 61,425/70,302 | =REF | =REF | 402,146 | one-episode mechanism (QQQ 2000–02 basing) on a binary parameter cliff; inert on 5/6 fresh |
| A2_material_05: arm only on price loss ≤ −0.5% | 28,363/54,279 | 51,812/93,720 | 180,663/29,336 | 133,745/29,106 | 394,583 | **strongest standalone**: only candidate improving on the 3% rule on all six fresh instruments; simplest mechanism; SPY-2025 counterexample shows it is two-sided |
| C11_graduated: discount 1.5% after an 8% rebound off the low | 42,538/54,279 | 55,454/73,125 | =REF | =REF | 412,328 | **demoted**: 2008 transfer failure (XLK −77k); "never below C1" does not survive composition or fresh data |
| B2_inverse: severe loss ⇒ smaller extra discount (floor 0.5%) | 26,602/52,761 | 54,819/72,722 | 228,043/28,687 | 93,608/29,423 | 403,072 | **demoted**: floor is a knife edge; uniform 2007–09 harm on fresh instruments (2/4 transfer) |

## 3. The nine rankings (brief §16)

Strategy-level, over the four frozen datasets, diagnostics excluded, duplicates deduplicated;
sensitivity grid points are never ranked (selecting among them would be optimization). Mechanical
inputs: `comparison/rankings_raw.md`.

1. **Best absolute historical net profit:** G8 445,982 · C6_retrace_38 437,043 · B7_decay120
   427,086 · G4 422,682 · D7_tiny 422,374 — all vs REF 380,979 and baseline 286,876. (B7_decay120's
   entire VGT-new edge is one 0.09% knife-edge entry; G4's edge is one trade.)
2. **Lowest absolute maximum drawdown (worst dataset):** among serious candidates: lower8 49,587 ·
   G4 63,294 · G8 65,407 · D7_tiny 69,850 · B7_stall/C6 ~70,3–70,9k · vs REF 91,469 and baseline
   149,561. Caveat: most DD reduction is deleveraging — §4's matched controls are the honest lens;
   B1_vol_k3's 44,630 comes with Σ net 199,660 and a recreated 2020 miss.
3. **Best profit/drawdown (worst dataset):** A2_material_2 0.91 · C11_graduated 0.76 · G10 0.55 ·
   D7_tiny 0.52 ≈ G8/G4/A2 0.52 · vs REF 0.44. A2_material_2 is an old-era artifact (new-era
   negative, see its family report); C11 is demoted on transfer.
4. **Best vs matched-exposure controls:** vs the matched BASELINE control (Σ profit diff):
   C11 +190,720/−25,354 DD · C6 +182,267/−46,719 · B7_stall +181,504/−21,454 · B7_decay120
   +179,782 · G8 +176,650/−84,034. Vs the matched EXISTING-3% control only four candidates have a
   positive Σ: C11 +26,156 · B7_stall +19,773 · lower5 +5,658 · B7_decay120 +4,777 — and the first
   two are exactly the candidates validation demoted or found inert, a textbook selection warning.
   On individual datasets, G8 and G4 beat BOTH controls on both dimensions on QQQ-old by wide
   margins (G4 +89,409/−52,984 vs matched baseline); no Phase-2 config beats both controls on both
   dimensions in the new era except standalone B2_inverse on VGT-new.
5. **Best bear-market protection (Σ bear-window P&L):** the old fixed −5% rule, lower5, +69,807 ·
   B1_vol_k1 +37,916 · B7_stall +34,995 · G4 +30,493 · C11 +26,900 · vs REF +13,805 and baseline
   −159,157. Bear protection remains cheapest to buy with wider fixed discounts — at the price of
   recoveries (lower5 Σ net 297,486; recovery Σ 279,654, the worst of any serious config).
6. **Best recovery participation (Σ recovery-window P&L):** C4_rebound_10 453,105 (but −47.7k in
   2000–02) · D7_higher_low_base 452,648 · C5_atr_rebound_3 451,355 · **C6_retrace_38 448,922** ·
   D3_tolerance_deep 446,532 · G8 430,730 · vs baseline 404,083 and REF 404,012. C6 is the only
   one of these that also improves bear windows and survived validation.
7. **Best consistency across periods:** G8 and C6 beat the existing 3% on net AND on drawdown on
   3 of 4 frozen datasets each (no config on 4/4; G8's miss is QQQ-new, C6's is VGT-old net).
   Across the ~7 independent episodes no candidate is uniformly positive
   (`validation/results/episode_consistency.md`); every restriction-relaxing mechanism pays
   something in 2022-style grinds, and the two extended bears (2000–02 vs 2007–09) disagree for
   C11 and B2_inverse.
8. **Simplest robust mechanism (judgment):** **A2_material_05** — one parameter (arm the
   unchanged 3% rule only when the trade's PRICE return is ≤ −0.5%), one line of logic, the only
   candidate that improved on the existing 3% rule on all six fresh instruments, an old-era
   plateau, and an independently replayed 2009-SPY rescue. Its honest caveats: on the frozen
   datasets its DD never beats REF; the exemption is two-sided (SPY-2025: a financing-only arming
   REF took was worth +$16.3k; A2 sat it out and lost); and the −0.5% boundary sits 0.008pp from
   the 2022-11-03 loss that decides VGT-2023.
9. **Best candidate for further validation (judgment):** **G8's mechanism** (material-loss trigger
   + fixed 3% + retrace reset) with **A2_material_05 as the simple fallback**. Stage-2 observed —
   as an observation, not a selected optimum — that a −0.5% cutoff with retrace 0.38–0.42
   dominated the registered (−1%, 0.38) on the weak spots; that specific neighborhood is what a
   future, genuinely out-of-sample test should examine. G4, D7's $2k bound, C11, B2_inverse and
   B7_stall should not advance (stage-2/stage-1 verdicts).

## 4. What the matched-exposure comparisons say overall

The restriction family cuts exposure 30–70%; most raw drawdown reduction is deleveraging. Within
the frozen datasets, genuine timing value (beating both matched controls on both dimensions)
is concentrated on QQQ 1999–2015 — the dataset with the 2000–02 cascade the mechanism was designed
for — and appears in the new era only for isolated configs. On the six fresh instruments
(validation Finding 1), the existing 3% rule **never** improves both dimensions against an
equally-exposed baseline, wins net only on VOOG and XLK, and is catastrophic on leveraged QLD
(−$21.6k vs +$264.1k baseline); the raw baseline's fresh-instrument Σ net (709,718) towers over
every restricted strategy (best: G8 460,461). The candidates narrow this gap; none close it.
**The restriction framework's measured advantage is era- and instrument-local; combinations
inherit that ceiling.**

## 5. Erratum carried from the prior study

`lower-price-reentry/REPORT.md` §10 stated that "three of the four decisive misses had intraday
lows through the trigger level". Family F's per-occurrence diagnostic shows this was wrong: 7 of
the 9 named config-episodes never printed their level intraday at all; only VGT-2020 @5% and
VGT-2010-08 @3% printed (and only the first is economically material — via a knife-edge chain).
The frozen report is left unmodified per the no-overwrite rule; this erratum is the correction of
record. Family F's broader verdict: a legitimate resting-limit execution model makes the strategy
WORSE on 10 of 12 dataset×threshold pairs — the same-close approximation has been subsidizing the
strategy, not hiding fills from it.

## 6. Validation chain (what was independently verified)

- **Phase 1:** production `allIn.ts` ≡ frozen Python research, trade-for-trade, daily-MTM and
  state-row level, 8/8 cases, max |diff| < 6e-11 (re-confirmed after the session resume);
  13/13 frozen checksums intact.
- **Framework calibration:** `common/selftest.py` — defaults reproduce the verified 3% strategy
  exactly (trades and state logs) on all four datasets.
- **Cross-implementation agreement:** E2 ≡ B3 to the dollar (independent authors); all six G
  ablation legs ≡ their family-of-origin results; G9b ≡ Family C's C2 to the dollar; validation
  re-implementations ≡ family trades on all four datasets.
- **Independent replay:** all 7 standalone candidates × 4 datasets re-derived from raw prices +
  rule text only — 36,238 checks, zero findings (stage 1); G8/G4 likewise — 5,995 checks, zero
  findings (stage 2).
- **Report audits:** every family report's headline numbers, COMBINATIONS.md (all cells, identity
  claims, Σ ranking, window figures) and ROBUSTNESS.md (all sensitivity and episode tables) were
  checked against `summary.json` data by the coordinator; two wording imprecisions in
  ROBUSTNESS.md §3 were corrected (see its audit addendum).

## 7. Negative findings of record (do not lose these)

1. Entry-price anchoring is economically perverse after losses (B3/E2: −118,054 net, DD 182,189 on
   QQQ-old — worse than no strategy change); richer correction memory added failure modes, never
   removed them (Family E).
2. No reset at all deadlocks for up to 13 years off a single small loss (C0); exit-price resets
   rebuild the repeated-entry catastrophe (C2, confirmed again as G9b); time-only resets fail.
3. The reset guard never binds on retrace/exit resets — the reset-priority inversion is real but
   belongs to time/rebound resets only (C10/D1).
4. Rebound/turn-gated alternative entries buy 2001-style bear rallies (D4 −65k, D7_confirm −56k);
   "fresh-leg" and stabilization signals did not work.
5. Combining two permissive mechanisms on entry and reset sides rebuilds the 2000–02 cascade in
   miniature (G3/G5's QQQ-2022: 12 losers, window −38,182) — and G5's third component literally
   never acted ("full stack" is a fiction).
6. Volatility scaling is procyclical (NATR widens in crashes ⇒ B1 recreates the 2020 miss);
   loss-proportional severity rebuilds the −5/−8% misses (A4, B2_loss, E4's saturated form).
7. Intraday execution is substantially a mirage (§5).
8. The knife-edge problem is conserved, not solved: every adaptive rule relocated the decisive
   0.1–2% gap to a new place (B7_decay120's 0.09%, G10's rebuilt 1.3% miss, A2's 0.008pp cutoff
   margin, D7's $2k bound).
9. Micro-loss armings are net POSITIVE more often than not (E5 lost to REF everywhere; SPY-2025);
   the right fix is arming gently or on materiality, not never arming.

## 8. Report and artifact index

| Stage | Report | Results |
|---|---|---|
| Phase 1 | `PHASE1_VERIFICATION.md` | `phase1/` (regression test, TS outputs, comparison.json) |
| Spec & registry | `ADAPTIVE_SPEC.md`, `HYPOTHESES.md` (188 entries) | family `registry.jsonl` files |
| A loss classification | `loss-classification/LOSS_CLASSIFICATION.md` | `loss-classification/results/` |
| B adaptive discounts | `adaptive-discounts/ADAPTIVE_DISCOUNTS.md` | `adaptive-discounts/results/` |
| C recovery resets | `recovery-resets/RECOVERY_RESETS.md` | `recovery-resets/results/` |
| D recovery opportunities | `recovery-opportunities/RECOVERY_OPPORTUNITIES.md` + `D6_FAILURE_MECHANISMS.csv` | `recovery-opportunities/results/` |
| E correction memory | `state-memory/CORRECTION_MEMORY.md` | `state-memory/results/` |
| F intraday feasibility | `execution-feasibility/INTRADAY_FEASIBILITY.md` | `execution-feasibility/results/` |
| G combinations | `combinations/COMBINATIONS.md` | `combinations/results/` |
| Validation 1+2 | `validation/ROBUSTNESS.md`, `validation/RESULTS_STAGE2.md` | `validation/results/` (replay, sensitivity, fresh, stage2) |
| Consolidation | this file, `RECOMMENDATIONS.md` | `comparison/` (all_records.csv, aggregated.csv, rankings_raw.md, build_*.py) |

Reproduction: each directory's `run*.py` with the venv recorded in `ADAPTIVE_SPEC.md` rule 7;
Phase 1 via `phase1/regression_test.py`; consolidated tables via `comparison/build_tables.py` and
`comparison/build_hypotheses.py`.
