# Study 8 — neighbourhood robustness

**Instrument:** Study 7's, unchanged (PROTOCOL.md §5). The decisive design is a joint N1 clip Latin hypercube over
every coordinate of every book. The radii are X ±1.0 pt, Y ±0.2 pt, stop ±1.0 pt, hold ±2, L ±10, buffer ±1.0 pt,
P ±1.0 pt and W ±20, on Study 7's grid and box, with duplicates removed.

**Gate:** share of neighbours with minute DD < $35,000 ≥ 0.90, and their p90 DD < $35,000.

**Seed families:**
- **Training:** confirmation, 3 × 128.
- **Test:** 3 × 128 fresh `test` families, shared by every configuration of the same dimension in a fold.

A parameter-neighbourhood pass rate is **not** a probability of future market safety, and a 40-D pool has far more
simultaneous perturbation opportunity than an 8-D standalone.

## 1. F24 holders: training (confirmation, to 2024-12-31) versus test (run to 2026-10-29)

| Rank | Track / role | Train share | Train p90 DD | Test share | Wilson LB | Test p90 DD | In-box | k = 8 | k = 16 | 0.5r | 1.5r | Norm-matched | Decisive points clipped | Coordinates within r of a bound | T |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | VG profit | 96.4% | $28,310 | 93.2% | 90.8% | $33,063 | 95.7% | 98.8% | — | 100% | 79.7% | 100% | 255/384 | 3 | pass |
| 2 | VG balanced | 97.9% | $24,082 | 98.2% | 96.7% | $24,463 | 99.6% | 99.6% | — | 100% | 83.6% | 100% | 264/384 | 3 | pass |
| 3 | VXRG profit | 96.6% | $30,381 | 95.8% | 93.8% | $30,117 | 96.1% | 99.2% | 100% | 100% | 83.6% | 99.2% | 362/384 | 9 | pass |
| 4 | VXRG balanced | 99.7% | $23,620 | **21.1%** | 17.9% | $38,224 | 22.3% | 3.5% | 14.1% | 0% | 41.4% | 0% | 366/384 | 8 | **fail** |
| 8 | VXRKG profit | 98.2% | $32,249 | 99.0% | 97.7% | $31,964 | 97.3% | 100% | 99.2% | 100% | 85.2% | 100% | 366/384 | 9 | pass |
| 12 | G profit | 91.9% | $33,914 | 91.9% | 89.3% | $34,552 | 93.0% | 93.4% | — | 100% | 54.7% | — | 0/384 | 0 | ambiguous |
| 15 | VXR profit | 98.4% | $27,153 | 99.2% | 98.1% | $27,573 | 98.4% | 99.6% | 100% | 100% | 96.1% | 99.2% | 274/384 | 5 | pass |
| 18 | VXRKG extra | 95.3% | $29,732 | 90.1% | 87.3% | $34,904 | **88.3%** | 100% | 100% | 100% | 71.1% | 100% | 337/384 | 11 | fail (T2b) |
| 23 | V profit | 90.6% | $34,371 | **89.8%** | 87.0% | $34,867 | 87.1% | 89.1% | — | 100% | 85.9% | — | 0/384 | 0 | fail (T2, T5) |
| 25 | V robust | 96.6% | $34,604 | 97.1% | 95.4% | $34,604 | 97.7% | 97.7% | — | 100% | 82.8% | — | 144/384 | 1 | pass |

Every holder is in `results/test/F24/test.json`; the training figures are in `results/qualify/<TRACK>/F24/`.

**Controls on the same test sets:**

| Control | Test share | Test p90 DD | In-box | k = 8 | 0.5r | 1.5r |
|---|---:|---:|---:|---:|---:|---:|
| B1 | 100.0% | $28,320 | 100% | 100% | 100% | 98.4% |
| **B5** | **29.2%** | $53,941 | 32.8% | 87.5% | 53.9% | 25.0% |
| Frozen VG | 71.9% | $42,220 | 70.3% | 90.2% | 93.0% | 68.0% |
| Frozen VXR | 93.0% | $33,755 | 88.7% | 100% | 96.1% | 85.9% |
| Frozen VXRG | 65.1% | $46,457 | 58.2% | 97.3% | 90.6% | 59.4% |
| G-PA | 15.4% | $49,322 | 16.0% | 16.4% | 21.9% | 19.5% |
| Study 7 #1 VG profit | 96.9% | $33,261 | 99.2% | 99.2% | 98.4% | 85.2% |

## 2. What the instrument shows

1. **Training-window robustness largely persisted out of sample on F24.**
   - Of 26 holders, 25 kept a test share within about 5 points of their training share. For example #1 went from
     96.4% to 93.2% and #8 from 98.2% to 99.0%; the largest move apart from #4 is #18, from 95.3% to 90.1%.
   - 24 of 26 passed T2 on the test families. The two that failed are #4 (21.1%) and #23 (89.8%).
   - #4 VXRG balanced collapsed from 99.7% to 21.1%: on the run through 2026, most of its neighbourhood went above the
     ceiling.
2. **On the procedure folds the same instrument failed out of sample.**
   - F19–F21 members' test-family shares collapsed: T2 failed for 36, 33 and 36 of 36 members.
   - That was **largely** because the centres themselves breached the ceiling (T1 failed for 29, 32 and 30). But 7, 1
     and 6 members failed T2 with a centre below $35k.
   - Neighbourhood breadth on the training window did not protect against the drawdown regimes of those test windows
     (2020 for F19, 2022 for F20 and F21).
3. **The frozen pools are fragile in the full joint design and less so under count-matched perturbation.**
   - B5's share is 29.2% in the full 40-D design and 87.5% when only 8 coordinates move. That is still below the 0.90
     gate, and B5 is only 53.9% even at half the radius.
   - Dimension alone does not explain B5's fragility: the VXRKG nominees reach 95–99.5% under the same full 40-D
     design. Both views are reported; the full-dimensional design is the decisive one.
4. **The nominees are robust in both views.** At 1.5r, the pooled nominees keep 80–99% (79.7% for #1 to 99.2% for
   #21). The single-book G profit drops to 54.7%.
5. **Clipping is heavy.**
   - **Pools:** in 194–370 of 384 decisive neighbours, at least one coordinate was clipped to the box. The pooled
     nominees sit with 2–13 coordinates within one radius of a bound.
   - **Most common near-bound coordinates** across the 18 nominees:
     - trailing stop near its 3% minimum (17 times);
     - X at its 30% maximum (13);
     - Y at its minimum (11);
     - loss buffer at its minimum (10);
     - W split, 9 at its maximum and 7 at its minimum.
   - **In-box pair (T2b):** therefore decisive. It passed for every pooled holder except #4 (22.3%) and #18 (88.3%).
   - **Single-book holders:** 0–3 coordinates within a radius of a bound. Clipping still touches 144–239 of 384
     decisive points for #19, #22, #25 and #26; only #12, #23 and #24 have none.
6. **Drawdown margins are thin for several nominees.**
   - #1 has a test-family p90 DD of $33,063.
   - Its pooled share is 358 of 384 neighbours (93.2%), just above the 0.93 "ambiguous" line: one neighbour fewer
     below $35k (357/384 = 92.97%) would have made it ambiguous.
   - Its weakest test family (91.4%) is the closest to failing on its own among the pass-status holders.
   - #12 G profit (91.9%, p90 $34,552; its family 1 fails on its own at 88.3%) and #26 V extra (centre DD $34,472) are
     ambiguous by rule.
   - These holders pass a strict backtest screen by small margins. A neighbourhood pass is not a stop-loss guarantee.
7. **Hypothesis H3 is not supported.** H3 was that the five-book track finds no configuration passing the full 40-D
   joint gate.
   - On the F24 training window five VXRKG candidates qualified, with confirmation shares of 95.3–99.0%.
   - On the test families VXRKG #8, #9, #10 and #14 pass T2 in the full 40-D design (99.0%, 99.5%, 98.4% and 95.1%).
   - The 40-D search found broad neighbourhoods. Its holders earned less in the test window ($22k–$48k) than the VG
     and VXRG holders.

## 3. Funded-sequence diagnostics (pools; first test family)

- **#1 VG profit:**
  - Its neighbours keep a median 14% of the centre's funded lots (median ledger Jaccard 0.08). Small parameter
    changes re-route which signals the single slot funds.
  - The neighbours with Jaccard below 0.5 (all of them here) still have a median whole-run net of $295,879, against
    the centre's $308,742. So `sequenceDependent` is **false**: profit does not hinge on the centre's exact funded
    sequence.
  - Per-trade attribution of a single run is not stable: the median absolute own-P&L versus funding interaction is
    $25.4k.
- The same holds for the other pooled nominees (`results/tables/qualify-sequence.md` for the training window).

## 4. Fold-level neighbourhood statistics

See `results/tables/folds-persistence.md` and `results/tables/test-<FOLD>-members.md`. On F24, 22 of 36 shortlist
members did not fail the T gates. 19 of the 27 training-qualified members did not fail: 18 role holders and 1 qualified
member without a role (VXRG #6). So did 3 of the 9 non-qualified members (VG #4 ambiguous, VG #5 and VXR #4 pass), which
failed qualification on the training window. Training qualification is not a strong filter in this favourable window
either.
