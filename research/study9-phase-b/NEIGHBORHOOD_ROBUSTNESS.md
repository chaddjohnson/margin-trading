# Study 9 Phase B — neighbourhood robustness

**Instrument:** Study 8's, unchanged (PROTOCOL.md §5): a joint N1 clip Latin hypercube over every coordinate of every
book (radius X ±1.0 pt, Y ±0.2 pt, stop ±1.0 pt, hold ±2, L ±10, buffer ±1.0 pt, P ±1.0 pt, W ±20; Study 8's grid,
quantization and clipping; duplicates removed). **Gate:** share of neighbours with minute DD < $35,000 ≥ 0.90 and
their p90 DD < $35,000. **Training:** the confirmation families, 3 × 128 (≈ 384 unique), on 2016-01-04 → 2024-12-31.
**Test:** 3 × 128 fresh `test` families (Phase B namespace) on the continuous run to 2026-10-29, shared by every
configuration of the same dimension. Sources: the sealed qualification records and `results/test/F24/test.json`.

A neighbourhood pass rate is cumulative historical simulator robustness, **not a probability of future safety** and not
a claim that later-window drawdowns are independent. A 32-D pool has far more simultaneous perturbation exposure than
a 16-D pool or the 8-D B1; the k = 8 count-matched and norm-matched columns are the dimension-matched views.

## 1. F24 role holders: training (confirmation) versus test (run to 2026-10-29)

| Rank | Track / role | Train share | Train p90 DD | Test share (n = 384) | Wilson LB | Test p90 DD | Families 1/2/3 | In-box | k = 8 | k = 16 | 0.5r | 1.5r | Norm-matched | Points clipped | Coords near a bound | T |
|---:|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | VG3-IWM profit | 97.1% | $23,613 | 80.5% | 76.9% | $38,376 | 80/80/81 | 80.5% | 91.0% | 78.9% | 95.3% | 71.1% | 90.6% | 219/384 | 3 | fail |
| 2 | G4-EWW profit | 99.2% | $26,424 | 98.4% | 97.0% | $27,180 | 99/98/98 | 99.2% | 100.0% | 100.0% | 100.0% | 87.5% | 100.0% | 374/384 | 9 | pass |
| 3 | G4-EWW extra | 96.1% | $32,366 | 95.1% | 92.9% | $32,517 | 98/92/95 | 93.8% | 99.2% | 99.2% | 100.0% | 80.5% | 100.0% | 317/384 | 8 | pass |
| 4 | G4-EWW robust | 100.0% | $25,760 | 99.2% | 98.1% | $29,456 | 99/100/98 | 100.0% | 100.0% | 100.0% | 100.0% | 89.1% | 100.0% | 376/384 | 9 | pass |
| 5 | G4-EWW balanced | 99.2% | $25,987 | 99.5% | 98.4% | $28,237 | 99/100/99 | 99.6% | 100.0% | 99.2% | 100.0% | 85.9% | 100.0% | 366/384 | 7 | pass |
| 6 | G4-EWW extra | 99.0% | $26,449 | 98.4% | 97.0% | $28,779 | 98/99/98 | 99.6% | 100.0% | 100.0% | 100.0% | 86.7% | 100.0% | 375/384 | 11 | pass |
| 7 | G4-ILF profit | 95.6% | $34,000 | 95.3% | 93.2% | $34,220 | 95/97/94 | 96.9% | 100.0% | 99.2% | 100.0% | 71.1% | 100.0% | 346/384 | 6 | fail |
| 8 | G4-ILF balanced | 99.7% | $32,223 | 99.7% | 98.8% | $32,223 | 99/100/100 | 99.6% | 100.0% | 100.0% | 100.0% | 80.5% | 100.0% | 355/384 | 10 | pass |
| 9 | VG3-IWM balanced | 99.2% | $20,201 | 87.2% | 84.2% | $36,032 | 84/88/90 | 89.1% | 93.4% | 85.9% | 86.7% | 76.6% | 92.2% | 278/384 | 6 | fail |
| 10 | VG3-IWM extra | 94.5% | $30,202 | 92.7% | 90.2% | $32,914 | 93/93/92 | 91.4% | 99.2% | 93.0% | 100.0% | 82.8% | 100.0% | 255/384 | 4 | ambiguous |
| 11 | G4-ILF extra | 93.8% | $32,256 | 94.8% | 92.6% | $32,572 | 98/91/95 | 96.5% | 100.0% | 99.2% | 100.0% | 79.7% | 100.0% | 357/384 | 6 | fail |
| 12 | G4-ILF extra | 97.7% | $30,736 | 98.4% | 97.0% | $31,358 | 98/98/99 | 98.4% | 100.0% | 99.2% | 100.0% | 85.9% | 98.4% | 315/384 | 5 | pass |
| 13 | N2-SMH extra | 97.9% | $30,141 | 81.0% | 77.5% | $36,679 | 80/81/82 | 78.9% | 81.2% | — | 78.1% | 74.2% | 71.9% | 241/384 | 3 | fail |
| 14 | N2-SMH profit | 100.0% | $31,317 | 100.0% | 99.3% | $31,694 | 100/100/100 | 100.0% | 100.0% | — | 100.0% | 98.4% | 100.0% | 262/384 | 3 | pass |
| 15 | VG3-IWM robust | 100.0% | $17,383 | 100.0% | 99.3% | $20,796 | 100/100/100 | 100.0% | 100.0% | 100.0% | 100.0% | 99.2% | 100.0% | 328/384 | 6 | pass |
| 16 | VG3-IWM extra | 100.0% | $18,047 | 99.2% | 98.1% | $22,507 | 98/99/100 | 99.2% | 100.0% | 100.0% | 100.0% | 95.3% | 100.0% | 315/384 | 6 | pass |
| 17 | G4-ILF robust | 100.0% | $29,328 | 99.5% | 98.4% | $29,114 | 100/98/100 | 98.4% | 100.0% | 100.0% | 100.0% | 80.5% | 100.0% | 289/384 | 5 | fail |
| 18 | N2-SMH balanced | 100.0% | $15,893 | 100.0% | 99.3% | $24,969 | 100/100/100 | 100.0% | 100.0% | — | 100.0% | 99.2% | 100.0% | 275/384 | 4 | fail |
| 19 | N2-SMH robust | 100.0% | $15,588 | 100.0% | 99.3% | $24,000 | 100/100/100 | 100.0% | 100.0% | — | 100.0% | 100.0% | 100.0% | 303/384 | 3 | fail |
| 20 | N3-EDV profit | 97.7% | $19,551 | 98.4% | 97.0% | $22,469 | 98/98/98 | 99.6% | 99.6% | 99.2% | 99.2% | 98.4% | 96.9% | 328/384 | 6 | fail |
| 21 | N3-EDV extra | 97.9% | $29,070 | 98.4% | 97.0% | $29,114 | 98/99/98 | 97.7% | 100.0% | 100.0% | 100.0% | 94.5% | 100.0% | 284/384 | 5 | fail |
| 22 | N2-EDV profit | 98.7% | $22,359 | 99.0% | 97.7% | $22,946 | 98/100/99 | 97.3% | 99.6% | — | 100.0% | 94.5% | 100.0% | 280/384 | 4 | fail |
| 23 | V3-IWM profit | 100.0% | $28,718 | 99.5% | 98.4% | $28,812 | 100/100/98 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 343/384 | 6 | pass |
| 24 | N2-SMH extra | 100.0% | $21,399 | 100.0% | 99.3% | $23,285 | 100/100/100 | 100.0% | 100.0% | — | 100.0% | 95.3% | 100.0% | 129/384 | 1 | fail |
| 25 | V3-IWM extra | 98.7% | $29,285 | 96.4% | 94.4% | $29,325 | 94/98/98 | 97.7% | 99.2% | 100.0% | 99.2% | 99.2% | 100.0% | 238/384 | 4 | pass |
| 26 | V3-IWM balanced | 98.7% | $17,790 | 99.2% | 98.1% | $26,860 | 99/99/99 | 99.6% | 98.8% | 99.2% | 95.3% | 96.1% | 94.5% | 304/384 | 4 | fail |
| 27 | N2-EDV balanced | 100.0% | $17,629 | 100.0% | 99.3% | $17,674 | 100/100/100 | 100.0% | 100.0% | — | 100.0% | 100.0% | 100.0% | 339/384 | 5 | fail |
| 28 | N2-EDV robust | 100.0% | $16,810 | 100.0% | 99.3% | $16,914 | 100/100/100 | 100.0% | 100.0% | — | 100.0% | 100.0% | 100.0% | 295/384 | 5 | fail |
| 29 | N2-EDV extra | 98.7% | $30,703 | 99.0% | 97.7% | $30,703 | 99/100/98 | 98.8% | 99.6% | — | 100.0% | 93.8% | 100.0% | 188/384 | 3 | fail |
| 30 | V3-IWM robust | 100.0% | $17,253 | 100.0% | 99.3% | $26,978 | 100/100/100 | 100.0% | 100.0% | 100.0% | 100.0% | 97.7% | 100.0% | 347/384 | 4 | fail |
| 31 | N3-EDV balanced | 100.0% | $16,235 | 99.7% | 98.8% | $16,227 | 99/100/100 | 99.6% | 100.0% | 100.0% | 100.0% | 95.3% | 100.0% | 370/384 | 8 | fail |
| 32 | N3-EDV robust | 100.0% | $16,303 | 100.0% | 99.3% | $16,419 | 100/100/100 | 100.0% | 100.0% | 100.0% | 100.0% | 99.2% | 100.0% | 310/384 | 5 | fail |

| Control | Test share (n) | Wilson LB | Test p90 DD | Families | In-box | k = 8 | 0.5r | 1.5r | T |
|---|---:|---:|---:|---|---:|---:|---:|---:|---|
| S8-VG2-balanced | 98.2% (384) | 96.7% | $25,111 | 98/98/98 | 99.2% | 99.6% | 100.0% | 90.6% | pass |
| S8-VG1-profit | 94.3% (384) | 92.0% | $32,712 | 96/97/90 | 93.0% | 98.0% | 100.0% | 82.8% | ambiguous |
| B1 | 99.5% (384) | 98.4% | $28,866 | 99/100/99 | 100.0% | 99.6% | 100.0% | 98.4% | fail |
| B5 | 26.8% (384) | 23.3% | $57,842 | 26/30/25 | 32.8% | 87.1% | 54.7% | 21.9% | fail |
| VG-frozen | 69.5% (384) | 65.5% | $44,694 | 74/70/65 | 72.3% | 85.9% | 96.9% | 62.5% | fail |

## 2. What the instrument shows

1. **Breadth largely persisted for the KRE + GDX pools; it collapsed for three VGT/SMH-based holders.**
   - G4-EWW's five holders kept 95.1–99.5% (training 96.1–100%); G4-ILF's five kept 94.8–99.7%.
   - **#1 VG3-IWM profit fell from 97.1% to 80.5%** (test p90 DD $38.4k; every family ~80%), #9 VG3-IWM balanced from
     99.2% to 87.2%, and #13 N2-SMH extra from 97.9% to 81.0%: they fail T2/T2b. Their 2026 neighbourhood drawdowns
     (the GDX/VGT and SMH paths of 2026) breached the ceiling for 13–20% of neighbours (#1 19.5%, #13 19.0%, #9
     12.8%).
   - The N and V holders and the conservative VG3-IWM holders (#15, #16) kept 96–100%, but most of them failed on
     economics (T3), not breadth (CHRONOLOGICAL_VALIDATION.md).
2. **Dimension-matched views agree with the full designs** for the pass-status holders (k = 8 and norm-matched
   98–100%). For #1 VG3-IWM profit even k = 8 gives 91.0% and the norm-matched design 90.6%: its fragility is not an
   artefact of dimension.
3. **The 1.5r stress separates the holders:**
   - 87.5% for the nominee #2 G4-EWW profit, and 71–89% for the other KRE + GDX holders;
   - 95–99% for VG3-IWM #15/#16, but 71–83% for VG3-IWM #1/#9/#10;
   - 96–100% for the V3-IWM holders, and 93.8–100% for the N holders except #13 N2-SMH extra (74.2%);
   - 90.6% for VG #2 balanced.
4. **Clipping is heavy for the four-book pools** (289–376 of 384 decisive points clip at least one coordinate; 5–11
   coordinates within one radius of a bound), so the in-box pair (T2b) is decisive there; it passed (93.8–100%) for
   every G4 holder.
5. **VG #2 balanced** kept 98.2% (Wilson bound 96.7%, p90 DD $25.1k) on Phase B's own independent test seeds,
   equal to its Study 8 sealed test share (98.2%, n 384). **B5** keeps 26.8%, B1 99.5%.
6. **Funded-sequence diagnostics (first test family).** The nominee's neighbours keep a median 18.6% of its funded
   lots (median ledger Jaccard 0.10; median 83 displaced and 82 added lots), yet the low-Jaccard neighbours' median
   whole-run net is $289.9k against the centre's $291.4k: `sequenceDependent` is false. Small parameter changes
   re-route which signals the single slot funds without destroying the aggregate profit; the per-lot ledger of any one
   configuration is one realization, not a forecast.

7. **Per-book perturbations and the behaviourally relevant dimensions** (`results/tables/test-F24-perbook.md`: 64
   points per book, one book perturbed at a time, the others at the centre; PROTOCOL.md §11).
   - Only three holders have a book whose own perturbation keeps fewer than 95% of points below $35k, and they are
     exactly the three T2 failures: the **GDX** book of #1 (84.4%) and #9 (82.8%) VG3-IWM, and the **SMH** book of #13
     N2-SMH extra (82.8%). Their fragility sits in one book's parameters, not in the joint dimension. The k = 8,
     k = 16 and norm-matched variants agree (#1: 91.0%, 78.9% and 90.6%).
   - Every per-book share of the nominee is 100%. Perturbing its EWW or MTUM book leaves the median test-window net at
     the centre's $31,530, because those books took no test-window lot. Its KRE book moves it most: median +$6.2k.
   - VG #2: VGT 98.4%, GDX 100%.
8. **Neighbourhood distributions** (`results/tables/test-F24-distribution.md`): for every holder and the main
   controls, the decisive family's whole-run net (median, p10, p90), profitable share, minute DD (median, p90, worst)
   and test-window median and p10 net. For the nominee: median $288.8k, p10 $259.1k, profitable 100%, p90 DD $27.2k.
   For VG #2: median $290.9k, p10 $250.3k, p90 DD $25.1k. The worst-DD column shows the tail that the 384-point share
   summarises.

## 3. User-preference bands (§9.2; the lower of the training and the F24 test band)

The sealed preference record (`results/preference/preference.json`) applies the bands, the predeclared compelling case
for the conditional band and the VG #2 comparison; see RECOMMENDATION.md. On the shares above, every pass-status
holder except #10 VG3-IWM extra (ambiguous; 94.5% training, 92.7% test → the diagnostic band) is in the preferred band on both
instruments.
