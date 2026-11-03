# Pairwise signal timing and overlap (61×61, Level D — descriptive)

**Evidence level:** descriptive timing of real D1 decisions from the frozen engine on inspected history; no pooled
causal claim. Sources: `results/leveld/LEVELD.json` (sealed, bodyHash `1467a835efc9…`), its payloads
`results/leveld/<view-window>.json.gz` (all 3,721 ordered pairs per view-window with numerators and denominators),
the metric matrices `results/leveld/matrices/<view-window>-<metric>.csv` (61×61, `NA` where undefined), and the
heatmaps `results/tables/heatmaps/*.svg`. Read-only CLI: `npm run d1-signal-complementarity -- pair --view U --a VGT
--b GDX --window T`, `overlap --view U --window T --metric s5`. Definitions: PROTOCOL §6.3.

## 1. What a cell means

For ordered pair (i, j) in one view-window: **armed share** = minutes i was armed while j was also armed ÷ i's armed
minutes; **decision match share** at a tolerance = i's decisions matched one-to-one to a j decision ÷ i's decisions
(exact minute, same session, ±5, ±20 sessions; the matching is computed once per unordered pair, so (i, j) and (j, i)
share the matched count and differ only by denominator); **holding share** / **Jaccard** = overlap of the
capital-holding intervals (decision → exit); **ρ** = daily log-return correlation. A cell is **NA** when its
denominator is zero **or the partner has no events of that kind** (no vector, no decision, never armed): "no
coincidence with nothing" is never shown as independence. Six view-windows: U-T (VGT `primary` on all 61, training era
2017-06-15 → 2023-12-29), U-A, U-B (the fold windows), P-A, P-B (the fold A0 nominees on their own fold windows) and
P-F (final-window survivors, in-sample context).

## 2. Summary

| View-window | Ordered pairs (a ≠ b) with a defined ±5-session share | Mean ±5 share (both orientations) | Ordered pairs ≥ 0.5 | Mean ρ (unordered) | Mean holding Jaccard (unordered) |
|---|---:|---:|---:|---:|---:|
| U-T | 2,970 of 3,660 | 0.51 | 1,460 | 0.47 | 0.254 |
| U-A | 420 | 0.23 | 96 | 0.36 | 0.225 |
| U-B | 1,190 | 0.40 | 465 | 0.48 | 0.241 |
| P-A | 1,190 | 0.26 | 265 | 0.36 | 0.155 |
| P-B | 1,980 | 0.40 | 692 | 0.48 | 0.256 |
| P-F (context) | 2,756 | 0.41 | 941 | 0.47 | 0.238 |

(`results/tables/pair-statistics.md`; ρ and Jaccard are symmetric, so their means are over unordered pairs,
`results/tables/leveld.md`.) Under the uniform rule, the
61 ETFs made 816 decisions in the training era; 6 made none (AGG, GLD, IAU, IEF, SHY, TIP — VGT `primary`'s 21.6%
arming depth is never reached by bonds or gold), 45 made at least 4.

## 3. Strongest and weakest timing pairs (U-T, both ETFs ≥ 4 decisions)

- **Most coincident** (the smaller of the two ±5 shares): IWD–RSP 1.00, IWD–SPLV 1.00, RSP–SPLV 1.00, VPU–XLU 1.00,
  IJR–IWN 0.91, IJH–KIE 0.88, KBE–KRE 0.84, INDA–IWD/RSP/SPLV 0.83, IJH–XLI 0.80, IWF–VOOG 0.80 — near-duplicate
  exposures (ρ 0.6–0.99).
- **Least coincident** (ordered by the larger of the two shares; EDV's own share first): EDV–IJR 0.04 / 0.09, EDV–XLI
  0.04 / 0.10, EDV–IWN 0.04 / 0.10, EDV–KIE 0.04 / 0.12, EDV–IJH 0.04 / 0.12, DBC–EDV 0.12 / 0.04, EDV–EWW 0.09 / 0.13,
  EWW–FXI 0.13 / 0.12, EDV–SLV 0.13 / 0.16, EDV–IWM 0.09 / 0.17, EDV–INDA 0.04 / 0.17 (`pair-statistics.md`) —
  long-duration Treasuries (EDV, ρ ≈ −0.2 with equities) are the only clearly separate timing source, and their own
  decisions fall mostly in the 2022 rate sell-off.
- Per ETF, the lowest mean share against the other active ETFs: XOP 0.15 (78 decisions), XBI 0.18, EDV 0.21, EWZ 0.23,
  GDX 0.23, KRE 0.28, XLE 0.28, XRT 0.29, KBE 0.30, XME 0.30 (a share of the ETF's own decisions, so prolific
  signallers score lower by construction); the highest: EEM 0.82, RSP/IWD 0.80, SPLV 0.79, QUAL 0.75.

## 4. Return correlation versus entry overlap (secondary contrast)

Across the 990 active unordered pairs of U-T, the Spearman correlation between ρ and the ±5-session match share is
**0.445** using the alphabetically first ETF's share (0.46 with the smaller, 0.48 with the larger, 0.59 with the mean of
the two shares; `pair-statistics.md`): correlated ETFs tend to signal together, but correlation is a weak guide to
entry timing.

- **Low correlation, colliding entries** (ρ ≤ 0.3, ±5 share ≥ 0.5; PROTOCOL §6.6): **88 ordered pairs**, e.g. DBC→SMH
  (ρ 0.28, 0.75), EEM→GDX (ρ 0.28, 1.00), EWY→GDX (0.24, 0.91), INDA→GDX (0.17, 0.67), EDV→XBI (−0.06, 0.57),
  FXI→EDV (−0.09, 0.56). Low daily correlation did **not** imply independent buy opportunities: deep D1 dips cluster in
  the same shocks whatever the day-to-day co-movement.
- **High correlation, separate entries** (ρ ≥ 0.7, ±5 share ≤ 0.2): **45 ordered pairs**, e.g. EDV→TLT (ρ 0.98, 0.17),
  FXI→EEM (0.86, 0.19), SMH→QUAL (0.83, 0.15), KBE→IWD (0.84, 0.16), VGT→IWD (0.79, 0.18) — the more volatile member of
  a correlated pair reaches the 21.6% arming depth in shocks the calmer one never does, so the pair "diversifies" only
  in the sense that one of them is not trading at all.

## 5. Occupancy overlap

Capital-holding Jaccard averages 0.25 on U-T: two active ETFs that both trade are holding a position at the same time
for about a quarter of their combined holding minutes. Holding overlap with B4/B5 by regime is in the per-ETF
`regimeOverlap` field of the U-T payload (each ETF's share of capital-holding minutes overlapping B's holding, per G1–G13).

## 6. U versus P (H3)

On the fold windows, the timing structure of the fitted per-ETF phenotypes is different from the uniform rule's: the
Spearman correlation of ±5-session match shares between U and P over common pairs is **−0.01 on window A** (272
pairs) and **0.40 on window B** (930 pairs). In the 2020–21 rebound the fitted vectors' coincidences bear no relation to
the uniform rule's — but the uniform rule is sparse there (97 decisions, 9 ETFs with ≥ 4), so this says only that the
fitted vectors coincide differently, not that parameters explain the pattern; in the 2022–23 decline,
coincidence is substantially driven by the common price path (both views signal into the same sell-off). P-A pairs are
also the least overlapping (mean ±5 share 0.22, holding Jaccard 0.155), but that separation did not translate into
idle-clean profit (`BASELINE_OCCUPANCY_AND_IDLE_OPPORTUNITIES.md` §3).

## 7. Caveats

The 61 ETFs are not independent series; pair counts are not evidence counts. Shares rest on few decisions for many
pairs (NA when a side has none). View U is a counterfactual for 60 of the 61 ETFs; View P vectors were fitted on each
ETF's own pre-fold data. Matrices are descriptive and never a selection input.
