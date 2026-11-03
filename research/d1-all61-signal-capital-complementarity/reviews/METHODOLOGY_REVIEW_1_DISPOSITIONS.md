# Dispositions of methodology review 1 (protocol draft v1 → v2, before the freeze)

Every finding of `METHODOLOGY_REVIEW_1.md` is accepted; none is rejected. No Study 2 result-bearing output existed
when these changes were made (2026-10-28 UTC). The confirmation of the engine rules (busy/idle and gate replay exactly
right, with the ∞ convention of finding 3) is recorded in PROTOCOL v2 §5.2.

| # | Severity | Disposition (PROTOCOL v2 section) |
|---|---|---|
| 1 | blocker | Accepted. The XOP "19 lots / $125,958" anchor is the full-replay **lost** set (baseline lots absent from the scenario) with 9 gained; class counts 49/17/12 are reproduced under the map's own convention (same-minute decisions busy regardless of symbol) and reported under the protocol convention with the number of same-minute ties. All seven published "unchanged D1" rows (GDX, XOP, XLE, EWZ, TLT, XLU, GLD) become parity anchors (§10.2). |
| 2 | major | Accepted. §0 lists all seven published U-vs-B4 rows, the 0 bps first-order diagnostic and the "best Track P" rows; GDX, XOP, XLE, EWZ, TLT, XLU and GLD carry a `designer-seen (T, B4)` mark in every table and label (§0, §9.2). |
| 3 | major | Accepted. E_b := +∞ and F_b := +∞ for baseline lots open, or reservations pending, at a data end (§5.2, §6.5); test added (§10.1). |
| 4 | major | Accepted. SRC is defined with a robustness filter fixed now — source status survivor, source sample label `adequate` (≥ 10 trades in the source's labels), not F7-flagged — on the source's R2 ranking (justified: R2 is capital efficiency per occupied day, the quantity that matters for a shared slot, and the source found R2 markedly more persistent across windows than R1, Spearman 0.72 vs 0.41). Identities written now: **fold A XLB** (R2 position 6), **fold B XOP** (position 2) for both baselines; XOP is `designer-seen`. If SRC = S1, SRC is the next eligible R2 symbol (§7.1). |
| 5 | major | Accepted. New order: code freeze → **screen A** (runs ending 2020-06-30 only) sealed → **screen B** (runs ending 2021-12-31 only) sealed → only then any run ending later than a cutoff that feeds Level D, Level C or tables. Stage 2 parity compares scalars with published values and persists comparisons only (no ledgers) (§11). |
| 6 | major | Accepted. NC never supports a positive verdict; an NC that passes C flags its cell `screen non-discriminating` and a counting candidate must beat NC's ΔV@5. Materiality: ΔV > 0 at 0, 2, 5 and 10 bps and ΔV@5 ≥ max($5,000, |worst own candidate lot in the window|). Thin test: ΔV@5 minus the largest positive scenario-only lot share ≤ 0 ⇒ thin; thin-only positives give `inconclusive`. k of n reported (§9.3). |
| 7 | major | Accepted. Ordered decision list per view (U-T; P-A; P-B), C aggregated as all/any over replayed folds, P replays update only P labels, `insufficient (single idle-clean event)` added, R a qualifier of label 5, positive lot net = Σ max(net, 0) (§9.2). |
| 8 | major | Accepted (declared not computed). Portfolio minute % drawdown is reported exactly for whole runs (window T) and, for fold windows, only as the whole-history figure to the window end, labelled; the windowed portfolio test R is daily-only (§7.3, §9.1). |
| 9 | minor | Accepted. `fo_net > 0` removed from the gates (kept in the score); H2 is tested through NC, SRC, the B4→B5 diagnostic, the in-sample replays and the first-order-vs-full-path comparison of every replay (§7.1). |
| 10 | minor | Accepted. `shock-only` qualifier; `several credible` needs ≥ 1 off-shock idle-clean positive event per ETF (§9). |
| 11 | minor | Accepted. `several credible` requires the same view in both folds (§9.3). |
| 12 | minor | Accepted. A post-freeze instrumentation correction is a labelled amendment: code re-frozen, affected stages rerun into new records, disclosed; the screen seal is untouched unless the defect is in screen code, in which case the screens are recomputed and disclosed (§10.3). |
| 13 | minor | Accepted. E = `VirtualTrade.exitTime` (closing print = session close); portfolio-mode refusals listed separately (no gate parity claimed there); first-order classes recomputed at every cost (§5.2, §7.3). |
| 14 | minor | Accepted. Every fold replay is labelled "retrospective with an incumbent-hindsight comparator"; VGT primary's own hindsight (2024–2025 inspected by VGT programs) disclosed (§0, §12). |
| 15 | minor | Accepted; every listed ambiguity is closed in §6–§7 (costs, years, indep_pos descriptive only, inclusive windows, family membership, "first" by decision time, first return, F7 allowed but flagged, tolerances). |
| 16 | minor | Accepted. Q1 thresholds predeclared (§6.6). |
| 17 | minor | Accepted. Added: lot-held overlap; overlap with B4/B5 by regime; ΔV by regime and without the best lot; same-minute tie refusals; capacity cost of losing lots; the Q7 split of idle minutes; exposure-cluster concentration; the deliverables/CLI list; Study 1 and B4 occupancy anchors (§6, §7.3, §8, §10.2, §11). |
| 18 | note | Accepted; disclosed (§12). |
| 19 | note | Accepted. The published-anchor replays are parity-only and enter no table or verdict (§7.2). |
