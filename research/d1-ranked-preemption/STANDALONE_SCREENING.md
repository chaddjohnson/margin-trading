# Stage A — standalone discovery and screening

Every one of the 61 eligible ETFs (the October 25 audited universe, re-audited identical: `results/audit/
universe.json`) received the same procedure in each window, on that window's training data only (PROTOCOL §6–§7):
2,048 paired Sobol vectors, a local search from the 4 best credible starts (10 rounds × 12 moves), a 16-draw
neighbourhood check of the 8 best credible vectors with distinct trades, the representative (best neighbourhood
median of J_s), a library of up to 4 behaviourally distinct phenotypes, and the screening. One $100,000 slot, 5 bps
per side, 11% simple interest, books armed 2017-06-15. Incumbent phenotypes (config/phenotypes/D1) were never seeds.

| Window (search end) | Evaluations | Credible floor | Survivors (uncertain) | Screened-down | Reserve | Rejected | Unrankable | Sealed record |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| fold-a (2020-06-30) | 144,782 | 4 trades | 49 (22) | 8 | 0 | 4 | 2 | `results/standalone/fold-a/STAGE_A.json` body `46b91ce1…` |
| fold-b (2021-12-31) | 146,211 | 5 trades | 54 (11) | 3 | 0 | 4 | 1 | `…/fold-b/STAGE_A.json` body `fb025f3f…` |
| final (2023-12-29) | 147,689 | 7 trades | 53 (5) | 6 | 0 | 2 | 1 | `…/final/STAGE_A.json` body `180e6498…` |

- **Rejected** (no credible vector — net ≤ 0, drawdown > $35,000 or too few trades in every evaluated vector):
  fold-a and fold-b AGG, IEF, SHY, TIP; final SHY, TIP (short and intermediate Treasuries and TIPS rarely or never
  fall 8–30% from a 20–250-session high, so D1 hardly arms). Unrankable (no trade in any vector): IEF and SHY in
  fold-a, SHY in fold-b and final.
- **Screened-down** (credible vectors, but the representative's neighbourhood median J_nb or its own J_s ≤ 0):
  fold-a EEM EWZ INDA IWN KIE SPLV XLE XOP; fold-b HYG IEMG SPLV; final AGG DBC IEF SPLV VGK XOP.
- **Exploration reserve: empty in every window.** The frozen rule admits a screened-down ETF only if at least half
  of its representative's held sessions fall when *no* survivor representative holds a trade; with 49–54 survivors
  their holdings cover almost every session, so every screened-down ETF's idle share was 0 except final VGK's
  (0.022), all far below ½. The reserve was therefore empty by construction: measuring idleness against the union of
  49–54 survivors cannot admit anyone — a design defect of the frozen rule that the pre-freeze reviews did not catch,
  recorded as an outcome. The Stage D universe was the survivors alone (49, 54, 53), so the brief's exploration
  reserve was met only nominally.
- **Uncertain** (survivors whose representative has fewer than 10 trades): fold-a 22 (incl. VGT, VOOG, XRT, GLD,
  TLT, XLU, VPU), fold-b 11 (incl. VGT, XLK, XLU, TLT), final 5 (EMB, FXI, HYG, IAU, LQD). They stayed in the universe
  with the label.
- Every survivor and reserve candidate kept up to 4 library phenotypes whose entry sessions differ by Jaccard ≥ 0.5;
  library sizes were 1–4.

## B5 members standalone (the representative of each window)

| Symbol | fold-a trades / net / mean | fold-b trades / net / mean | final trades / net / mean | Status |
|---|---|---|---|---|
| VGT | 7 / $78,881 / $11,269 | 7 / $106,278 / $15,183 | 17 / $125,218 / $7,366 | survivor (uncertain in both folds) |
| XBI | 15 / $71,747 / $4,783 | 31 / $87,321 / $2,817 | 30 / $85,550 / $2,852 | survivor |
| XRT | 9 / $48,283 / $5,365 | 20 / $88,830 / $4,442 | 41 / $93,378 / $2,278 | survivor (uncertain in fold-a) |
| KRE | 19 / $59,166 / $3,114 | 31 / $85,042 / $2,743 | 71 / $109,514 / $1,542 | survivor |
| GDX | 15 / $152,012 / $10,134 | 14 / $165,035 / $11,788 | 54 / $185,534 / $3,436 | survivor |

## Files

- Per symbol and window: `standalone/<window>/<SYMBOL>.json` (profile: status, sample label, reasons, credible
  floor, evaluated and credible counts, idle share, representative with all metrics and its neighbourhood, the
  library, the 8 neighbourhood-checked candidates, data hashes).
- Every library phenotype (and each non-credible ranking representative) as its own versioned JSON:
  `standalone/<window>/phenotypes/<SYMBOL>-<role>-<candidateId>.json` (schema `ranked-preemption-standalone-phenotype`
  v1: the eight exact parameters as grid integers and as the registry's notation, window, search end, loaded-data
  hashes, the universe record's hash, budget, seeds, costs, interest, metrics, provenance). 130 (fold-a), 142
  (fold-b) and 156 (final) files. No earlier phenotype file was touched.
- Run any representative alone: `npm run ranked-preemption -- fixed standalone:<window>:<SYMBOL>` (its window's
  training data only).
- Every evaluated vector (compact): `results/standalone/<window>/archive.jsonl.gz` (hash in the sealed record).
- Full per-symbol tables: `results/tables/standalone-<window>.md`.
