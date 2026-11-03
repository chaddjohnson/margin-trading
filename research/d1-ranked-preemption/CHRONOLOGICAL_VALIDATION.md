# Chronological validation (fold-a, fold-b) — evidence grade E2

**Both validation folds are inspected years** (2020–2023 were examined repeatedly by earlier studies in this
programme). A sealed walk-forward pick evaluated on them is reused retrospective evidence, not independent proof.
B5 and B4 were themselves chosen with 2016–2026 hindsight, which makes the incumbent comparison conservative for
the new procedures. Procedure: PROTOCOL §13.

## 1. What each fold did

Each fold re-ran the whole procedure on its own training data only — Stage A on all 61 ETFs, the two rankings, the
diagnostic, Stage D for both rankings, the controls — and sealed its picks before the validation door opened. The
door refuses fold-b before fold-a's sealed validation verifies, and the final window before the sealed procedure gate.

| Fold | Training (books armed 2017-06-15) | Validation | Picks sealed (`PICKS.json` body) | Validation run (`VALIDATION.json` body) |
|---|---|---|---|---|
| fold-a | 2016-01-04 → 2020-06-30 | 2020-07-01 → 2021-12-31 (1.50 years) | 18:35:49Z (`ff8a7a6a…`) | 18:35:59Z → 18:37:24Z (`a2c27d0c…`) |
| fold-b | 2016-01-04 → 2021-12-31 | 2022-01-01 → 2023-12-29 (1.99 years) | 18:54:47Z (`ea5ba863…`) | 18:54:48Z → 18:56:48Z (`7f5a4e77…`) |

(2026-10-26, UTC.) The trained objects differed by fold:

| Fold | B5 priority under R1 | B5 priority under R2 | C_R1 | C_R2 | D\*_R1 | D\*_R2 |
|---|---|---|---|---|---|---|
| fold-a | VGT > GDX > XRT > XBI > KRE | KRE > XBI > XRT > GDX > VGT | VGT GDX VPU XLU GLD | IYT XLU VPU VOOG XLB | EDV EWW FXI GDX IAU IGV XHB XLY | EDV EWW EWY FXI GDX ILF VIG XHB |
| fold-b | VGT > GDX > XRT > XBI > KRE | KRE > GDX > XRT > XBI > VGT | XLK VGT XME GDX XLI | XOP IWN VGK IWM KRE | EWW FXI GDX IBB ILF KRE SMH TLT XLY XOP XRT | EWZ FXI GDX GLD INDA IWF KRE XBI XME XOP XRT |

Exact vectors: `results/walkforward/<fold>/PICKS.json` and `config/research-pools/d1-ranked-preemption/<fold>/`.

**Validation run.** One continuous run from 2016-01-04 through the validation end; state, marks, virtual books and
any open lot carry across the search end. V = liquidation-equivalent mark at the validation end − the same at the
search-end close (an open lot's exit friction deducted at both ends). Windowed drawdowns restart at the boundary. The
derived engine recomputed V at 5 and 10 bps, the windowed daily drawdown and the lots from its own daily marks and
matched the replay (F1's windowed minute drawdown comes from the replay alone; the engine-checked daily drawdown is a
lower bound for it); the continuous run's boundary mark equalled the training-only run's for the 9 incumbent and
procedure configurations (`continuity` in the record; the ablations are not in that check).

## 2. Training versus validation (fixed $100,000 pool, 5 bps)

| ID | fold-a training (E0) | per year | fold-a V (E2) | per year | fold-b training (E0) | per year | fold-b V (E2) | per year |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A = B5 (P0) | $170,986 | $56.2k | $46,506 | $30.9k | $217,492 | $47.9k | $170,997 | $85.8k |
| B4 (P0) | $67,209 | $22.1k | $62,161 | $41.4k | $129,370 | $28.5k | $112,826 | $56.6k |
| B-R1 | $123,702 | $40.7k | $70,462 | $46.9k | $194,164 | $42.7k | $121,764 | $61.1k |
| B-R2 | $128,332 | $42.2k | $71,062 | $47.3k | $203,869 | $44.9k | $107,540 | $54.0k |
| C-R1 (control) | $166,773 | $54.8k | $11,362 | $7.6k | $122,214 | $26.9k | −$19,116 | −$9.6k |
| C-R2 (control) | $56,267 | $18.5k | −$2,622 | −$1.7k | $138,379 | $30.4k | $6,464 | $3.2k |
| D-R1 | $344,192 | $113.2k | $22,944 | $15.3k | $434,184 | $95.5k | −$39,909 | −$20.0k |
| D-R2 | $303,618 | $99.8k | $24,209 | $16.1k | $421,787 | $92.8k | $9,323 | $4.7k |

Per-year rates divide by the active span (training from the 2017-06-15 arming: 3.04 / 4.54 years). The joint picks
fell from roughly $93k–$113k a year in training to −$20k…+$16k a year in validation. B5's rate halved in fold-a and
nearly doubled in fold-b; B4's rose in both.

### Validation risk and activity

| ID | fold-a V minute DD | daily DD | lots | V at 10 bps | switches executed (aborted) in the window | fold-b V minute DD | daily DD | lots | V at 10 bps | switches executed (aborted) |
|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---|
| A | $16,557 | $14,848 | 20 | $44,451 | — | $17,269 | $13,874 | 42 | $166,614 | — |
| B4 | $17,702 | $16,011 | 12 | $60,889 | — | $22,327 | $15,284 | 49 | $106,850 | — |
| B1 (VGT alone) | $14,894 | $13,299 | 2 | $32,458 | — | $17,421 | $14,344 | 9 | $21,217 | — |
| B-R1 | $17,702 | $16,011 | 13 | $69,082 | 1 | $17,269 | $14,591 | 43 | $117,330 | 5 |
| B-R2 | $15,930 | $11,918 | 26 | $68,387 | 2 | $22,327 | $15,284 | 53 | $101,169 | 8 |
| C-R1 | $28,677 | $27,874 | 11 | $10,240 | 0 | $41,856 | $40,152 | 16 | $6,122 | 2 |
| C-R2 | $14,277 | $12,741 | 3 | −$2,921 | 1 | $27,537 | $26,429 | 32 | $3,254 | 1 |
| D-R1 | $18,061 | $16,493 | 23 | $25,254 | 6 | **$55,955** | $54,869 | 54 | −$37,538 | 17 (1) |
| D-R2 | $20,442 | $18,511 | 21 | $22,072 | 3 | **$42,833** | $39,322 | 44 | $8,864 | 11 (1) |

Ablations and sensitivities in the validation windows (`results/tables/validation-<fold>.md`): D-R1 under P0
−$5,135 / −$53,694 (DD $77,118 in fold-b); D-R2 under P0 $22,745 / $55,572; P0R = A exactly for B in both folds;
P1-B250/B500 changed B-R1 only in fold-b with B500 ($124,433), B-R2 never, and D by at most $4.4k.

### 20% portfolio (continuous; validation segment; frozen dividends)

| ID | fold-a start → end equity | return | daily % DD | strategy net | productivity | fold-b start → end equity | return | daily % DD | strategy net | productivity |
|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| A | $926,964 → $1,667,618 | 79.9% | 12.48% | $111,169 | 1,557 | $1,667,618 → $2,270,264 | 36.1% | 26.11% | $528,239 | 3,503 |
| B4 | $753,934 → $1,373,268 | 82.1% | 13.39% | $107,494 | 1,822 | $1,373,268 → $1,677,751 | 22.2% | 26.68% | $279,168 | 2,692 |
| B1 | $775,515 → $1,333,325 | 71.9% | 12.54% | $46,710 | 1,153 | $1,333,325 → $1,375,791 | 3.2% | 31.87% | $43,370 | 1,071 |
| B-R1 | $841,962 → $1,557,043 | 84.9% | 13.38% | $142,921 | 1,956 | $1,557,043 → $1,934,875 | 24.3% | 30.29% | $344,418 | 2,649 |
| B-R2 | $858,818 → $1,624,503 | 89.2% | 12.48% | $162,056 | 3,872 | $1,636,087 → $1,983,299 | 21.2% | 29.29% | $316,303 | 2,455 |
| C-R1 | $919,423 → $1,521,524 | 65.5% | 13.44% | $12,766 | 144 | $1,329,952 → $1,284,284 | −3.4% | 36.76% | −$35,774 | −427 |
| C-R2 | $756,546 → $1,237,805 | 63.6% | 13.17% | −$5,240 | −451 | $1,458,495 → $1,452,881 | −0.4% | 33.32% | $21,690 | 448 |
| D-R1 | $1,320,291 → $2,258,471 | 71.1% | 12.45% | $57,275 | 362 | $2,537,978 → $2,265,141 | −10.8% | 39.24% | −$185,969 | −809 |
| D-R2 | $1,225,911 → $2,100,523 | 71.3% | 13.45% | $52,408 | 363 | $2,545,335 → $2,505,804 | −1.6% | 36.94% | $18,167 | 75 |

Portfolio equity includes the VOOG/VGT core, so equity return mostly reflects the market; the strategy net and the
productivity (dollars per $1M of borrowing dollar-days) isolate the D1 books. Never gating.

## 3. Fold gates and the procedure gate

F1 validation minute DD ≤ $35,000; F2 V(X) − max(V(B5), V(B4)) ≥ $5,000 at 5 bps **and** V(X) ≥ that maximum at
10 bps; F3 ≥ 3 lots entered in the window.

| Procedure | fold-a: V − better incumbent ($62,161 = B4) | F1 / F2 / F3 | fold-b: V − better incumbent ($170,997 = B5) | F1 / F2 / F3 | GP |
|---|---:|---|---:|---|---|
| B-R1 | +$8,301 (10 bps: +$8,193) | ✓ ✓ ✓ → success | −$49,233 | ✓ ✗ ✓ → fail | **fail** |
| B-R2 | +$8,901 (10 bps: +$7,498) | ✓ ✓ ✓ → success | −$63,457 | ✓ ✗ ✓ → fail | **fail** |
| D-R1 | −$39,216 | ✓ ✗ ✓ → fail | −$210,906 | ✗ ✗ ✓ → fail | **fail** |
| D-R2 | −$37,952 | ✓ ✗ ✓ → fail | −$161,675 | ✗ ✗ ✓ → fail | **fail** |

`results/walkforward/PROCEDURE_GATE.json` (body `d2bd6ebd…`): no procedure passed both folds, so the final window
could only be reported, and nothing was nominated.

## 4. Controlled comparisons (descriptive, never gating)

| Difference in V | fold-a | fold-b |
|---|---:|---:|
| B-R1 − A (preemption on B5, R1) | +$23,956 | −$49,233 |
| B-R2 − A (R2) | +$24,556 | −$63,457 |
| D-R1 − C-R1 (joint vs standalone-ranked, R1) | +$11,582 | −$20,793 |
| D-R2 − C-R2 (R2) | +$26,831 | +$2,859 |
| D-R1 under P1 − under P0 | +$28,079 | +$13,785 |
| D-R2 under P1 − under P0 | +$1,464 | −$46,249 |
| R1 − R2, procedure B | −$600 | +$14,224 |
| R1 − R2, procedure D | −$1,265 | −$49,232 |

H2 (joint beats standalone-ranked) is "supported" by the frozen definition only for R2 (V(D) > V(C) in both folds),
and only descriptively: D-R2 itself lost $161.7k to B5 in fold-b and broke the drawdown ceiling.

## 5. Year attribution (calendar-year change of the marked P&L; regimes)

The sealed records carry, for each run, the calendar-year change of the fixed pool's marked P&L (realized plus the
open lot's mark: mark at the year's last session − mark at the previous year's end). 2021 (= regime G9) lies wholly
in fold-a's validation; 2022 (G10 bear market through October, G11 from November) and 2023 (G11–G13) wholly in
fold-b's. In fold-b the two years sum to V up to an open lot's exit friction at the boundary (at most $77).

| ID | 2021 (fold-a) | 2022 (fold-b) | 2023 (fold-b) |
|---|---:|---:|---:|
| A = B5 | $15,696 | $84,884 | $86,060 |
| B4 | $15,696 | $57,017 | $55,757 |
| B1 | $1,957 | $22,145 | $0 |
| B-R1 | $23,997 | $35,651 | $86,060 |
| B-R2 | $35,008 | $42,340 | $65,148 |
| C-R1 | −$4,223 | −$25,368 | $6,175 |
| C-R2 | $0 | $625 | $5,840 |
| D-R1 | $4,406 | **−$38,521** | −$1,391 |
| D-R1 under P0 | −$6,408 | −$55,427 | $1,738 |
| D-R2 | $2,651 | $525 | $8,742 |
| D-R2 under P0 | $6,004 | $43,053 | $12,464 |

- **B-R1's fold-b shortfall is entirely in 2022:** its 2023 mark change equals A's to the dollar ($86,060), its 2022
  change is $49.2k lower. B-R2 trails A by $42.5k in 2022 and $20.9k in 2023.
- **D-R1's fold-b loss sits in the 2022 bear-market year:** its marked P&L fell $38.5k in 2022 (−$55.4k under P0).
  The same D-R2 vectors gained $43.1k in 2022 under P0 and $0.5k under P1.
- Fold-a's validation is dominated by the second half of 2020 (the 2020 recovery, G8): V minus the 2021 change is
  about half (B-R2) to three-quarters (B4) of the incumbents' and B's V, and 81–89% of D's. B-R1's second-half-2020
  increment equals B4's to the dollar ($46,465): its fold-a edge over B4 came in 2021 ($23,997 vs $15,696), with one
  executed switch in the window (KRE→GDX, 2021-09-28).
- Finer regime splits inside 2022–2023 (G10–G13) and per-symbol validation contributions were not stored in the
  sealed records. The doors would permit a read-only CLI run of the fold pools through their sealed validation ends,
  but it would be descriptive only and was not run for this report.

## 6. Limits of this evidence

- **Reused, inspected years (E2).** The folds test the procedure chronologically, but their years were seen before
  this study was designed.
- **Small activity.** B's fold-a success rests on one (R1) or two (R2) switches inside an 18-month window plus a
  different holding state carried across the boundary; one fold reversed it.
- **Multiple comparisons.** Four procedures × two folds; a single fold pass is weak evidence by construction, which is
  why the gate requires both.
- **Latency assumption.** Nearly every executed switch bought the replacement in the minute of the sale (PROTOCOL
  §0(f)); a real implementation would see different fills.
- **Path dependence.** Friction, the buffer and the priority change which liquidations pass, which switches happen
  and every later trade; small differences compound across a continuous run.
