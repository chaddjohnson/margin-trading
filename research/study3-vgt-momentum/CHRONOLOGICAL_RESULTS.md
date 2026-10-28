# Chronological results — fold-by-fold replay of the frozen procedure

Sealed records: `results/records/develop-{A,B,C,D,H}.json`, `evaluate-{A,B,C,D}.json`, `analysis.json`; tables in
`results/tables/` (`fold-windows.md`, `pstar-folds.md`, `selections.md`, `family-labels.md`, `control-labels.md`). All
figures are fixed-slot ($100,000), price-only, after 11% simple interest and 5 bps per side; V is the window's
liquidation-equivalent increment from one continuous run since 2016 (an open lot at the boundary is carried, not
re-entered); window drawdowns restart at the boundary mark. Evidence level: retrospective, chronology-respecting —
each fold's selection was sealed before its window was loaded (code-enforced), but every window had been inspected by
earlier studies.

## 1. The procedure, fold by fold

| Fold | Development data | M1 families passing | Evaluations | P\* | Window | V | Window minute DD | Lots entered + carried | First / re-entries |
|---|---|---:|---:|---|---|---:|---:|---|---|
| A | 2016-01-04 → 2019-12-31 | 6 of 12 | 7,765 | E06-9ee2ce7bd5 (calm advance: v_in 19.1%, v_gap 36.7%, N 149, h 10.9%, t 23.9%) | 2020 | +$18,608 | $25,298 | 1 + 1 | 1 / 0 |
| B | → 2020-12-31 | 12 | 15,614 | E04-86b6d59a31 (CUSUM: κ 0.12, h_in 1.0, h_out 7.8, h 7.7%, t 19.4%) | 2021 | +$14,577 | $24,808 | 1 + 1 | 1 / 0 |
| C | → 2021-12-31 | 12 | 15,614 | E04-b4a27ac53b (CUSUM: κ 0.13, h_in 1.1, h_out 7.9, h 7.9%, t 24.6%) | 2022 | −$57,578 | $63,078 | 3 + 1 | 2 / 1 |
| D | → 2022-12-30 | 10 | 13,024 | E06-47640253c0 (calm advance: v_in 31.5%, v_gap 19.1%, N 95, h 13.2%, t 22.5%) | 2023 | +$24,646 | $18,359 | 3 + 0 | 3 / 0 |

Per-fold accounting of each pick (carried-lot share, realised and open nets, price gain, interest, friction, profit
factor, holds, MAE/MFE, principal exposure) is in `results/tables/pstar-accounting.md` (amendment A2). Fold A's six failures were all g1 (fewer than 6 closed trades or 3 campaigns in three trading years); in fold D, E04
failed g4 (no default exit profitable on 2017–2022) and E09 failed g3 (default minute drawdown above $50,000); in H,
E09 failed g3. The sealed development value equalled each replay's liquidation mark at the boundary (b-mark checks, all
pass). Every window had at least one lot entered or carried, so no window is "insufficient evidence".

**Rubric (frozen; `analysis.json`):** Σ V = +$253 (T(i) fails), positive (≥ +$2,000) in 3 of 4 (T(ii) passes), the 2022
window's minute drawdown $63,078 > $35,000 (T(iii) fails), min V −$57,578 < −$15,000 (T(iv) fails), the chained path Π
draws down $63,569 (T(v) fails) → **no demonstrated standalone edge**. For the record: E fails (Σ excess over
exposure-matched C-ALR −$52,820), R fails (R0 stress sums −$579 / −$8,591 / −$199 / +$693 for 10 bps / 14% / 25 bps
stop slippage / +1 minute; D's pick fails r3 with 69% of joint draws), K fails against all three controls.

## 2. Incremental window ledger (V, window minute DD)

| Run | 2020 | 2021 | 2022 | 2023 | Σ |
|---|---:|---:|---:|---:|---:|
| **P\*** | +$18,608 ($25,298) | +$14,577 ($24,808) | −$57,578 ($63,078) | +$24,646 ($18,359) | **+$253** |
| P0 (best TPL default, no search) | E09 +$22,533 ($49,584) | E09 +$6,595 | E09 −$52,441 ($56,227) | E05 +$11,424 | −$11,890 |
| Champion E03 (directional efficiency) | +$35,727 | +$15,895 | −$30,575 ($32,108) | +$20,473 | +$41,519 |
| Champion E06 (calm advance) | +$18,608 | +$24,665 | −$25,045 ($26,888) | +$24,646 | +$42,874 |
| Champion E07 (breakout acceptance) | +$32,197 | +$9,898 | −$32,640 ($40,197) | +$16,953 | +$26,408 |
| Champion E04 (CUSUM) | +$38,908 ($38,855) | +$14,577 | −$57,578 ($63,078) | — (failed M1) | −$4,093 |
| Champion E09 (trailing buy) | +$22,342 ($38,727) | +$13,500 | −$54,814 ($62,526) | — (failed M1) | −$18,971 |
| Champion E10 (breakout trailing buy) | +$8,268 | −$2,384 | −$6,897 | +$1,221 | +$208 |
| C-SMA | +$22,847 ($38,334) | +$34,121 | −$38,850 ($40,792) | +$25,980 | +$44,098 |
| C-DON | +$24,562 | −$3,811 | −$16,501 | +$17,493 | +$21,744 |
| C-TSM | +$17,204 ($52,756) | +$33,690 | −$47,798 ($62,120) | +$18,407 | +$21,503 |
| C-TSM/TPL | +$28,145 | +$7,059 | −$10,718 | +$7,693 | +$32,180 |
| C-ALR | +$30,797 ($39,444) | +$15,859 | −$42,884 ($50,995) | +$32,931 | +$36,702 |
| D1 primary (context) | +$75,298 | +$2,015 | +$22,145 | $0 | +$99,458 |

Every champion and default of all twelve families, and every TPL default, is in `results/tables/fold-windows.md`
(families E01, E02, E05, E08, E11, E12 had no fold-A champion because they failed M1 there).

## 3. Regimes (descriptive; the histories are known)

- **2020 (shock and recovery).** The fold-A pick (E06), long since 2019-03-12, exited on its own volatility OUT on
  2020-03-06 — after the fall from the 2020-02-19 peak had begun — and re-entered on 2020-06-04, 51 sessions after the
  2020-03-23 closing low; window drawdown $25,298. The picks of other families drew down $18–39k. D1, the crash-rebound machine,
  earned +$75,298 here.
- **2021 (continuation).** Exposure paid: the fold-B pick (E04) was invested all year (+$14,577); C-SMA and C-TSM,
  invested all year, made +$34,121 and +$33,690. Breakout rules with tight exits lost to chop (C-DON −$3,811, E07
  default −$7,104, E10 default −$3,176).
- **2022 (extended decline, three bear-market rallies of 16–24%).** Every trading rule lost. The fold-C pick (E04) lost
  −$57,578, of which **−$33,954 came from one carried lot**: decided at the 2020-03-13 close (an +11% day; the
  CUSUM's fast up-detection, h_in 1.1) and filled at the 2020-03-16 opening trade at $193.27 after a −12% gap, five
  sessions before the 2020-03-23 closing low, its fixed 517 shares were worth $236,944 at the 2021-12-31 boundary —
  2.37× the slot — and VGT fell 14% before its own OUT (the CUSUM exit: cumulated standardised down-moves net of κ reached h_out = 7.9 at the
  2022-01-21 close) sold it at the 2022-01-24 opening trade ($393.88). Two fresh entries in rallies were then stopped at the opening gap by the 7.9% hard stop (−$10,609 on
  2022-02-24, −$9,699 on 2022-10-13), and an R3F re-entry was still open at −$3,316. Low-exposure defaults lost least
  (E03 −$4,814, E10 −$6,897). Under a flat start at the boundary instead of the continuous replay, the three
  lots entered in 2022 alone lost −$23,624, so T(iv) (−$15,000 floor) would still fail.
- **2023 (new advance, D1 idle; E06's presence partly reflects Study 2's finding of D1-idle calm advances incl. 2023).**
  Most trend rules earned (the pick +$24,646 in three first entries, C-ALR +$32,931,
  C-SMA +$25,980); E12 (pullback continuation) lost (default −$5,713, champion −$6,100) and E08/E10 earned little.

## 4. Generalisation failure and selection-leakage limits

- **Exposure drift of long-held lots.** The fixed-slot convention (D1's: buy $100,000 of shares at entry, hold the
  shares) lets a momentum lot held for years grow to two or more times the slot's exposure without any new borrowing.
  D1's short holds rarely notice; a trend rule's long holds do. It is why the 2022 loss and Π's drawdown exceed what
  a $100,000 position could lose in the same decline, and why the in-sample H pick's holds of up to 453 sessions earn
  large right tails (`STANDALONE_RISK_AND_EXECUTION_STRESS.md`). A periodic re-size to $100,000 (as C-ALR does) would
  bound it; it was not part of the frozen template and is a candidate for any later, separately frozen study.
- **Cross-family selection amplified regime exposure.** On 2017–2020 and 2017–2021 data the highest neighbourhood
  median belonged to E04 settings that were long almost continuously (fold-B pick 100% exposure in 2021); the same
  selection rule then carried the most exposed rule into 2022. The within-family neighbourhood median protected against
  isolated parameter spikes but not against regime dependence.
- **Family-level labels are uninformative here.** "Positive in ≥ 3 windows" was earned by 3 of 12 champions, 4 of 12
  TPL defaults and 6 of 8 trading controls (including C-AL and C-ALR, which simply hold): with three advancing windows
  out of four, exposure alone earns it (reference rates in `family-labels.md`, `control-labels.md`).
- **No post-hoc family choice is legitimate.** E06's and E03's champions summed +$42,874 and +$41,519 with window
  drawdowns ≤ $32,108; picking them now would be choosing among twelve on the evaluation windows.
- **Design knowledge.** The fold layout, defaults and boxes were set by a designer who knew 2016–2023
  (`PROTOCOL.md` §1); only the execution was blind. The verdict would not become validation even if it had been
  positive.
- **Concentration of the development scores.** The largest single lot was 68%, 67%, 76% and 51% of the fold-A–D
  picks' development nets (for B and C, the lot bought in March 2020); for H-P\* the top two lots are 67% of +$120,096.
  The neighbourhood median protects against parameter spikes, not against one lot dominating a score.
- **Search scale.** 66,366 evaluations across five histories (7,765 / 15,614 / 15,614 / 13,024 / 14,349), within the
  frozen caps; every point is archived (`results/payloads/develop-*/archive.jsonl.gz`).
