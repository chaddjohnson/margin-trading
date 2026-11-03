# Exact shared-pool counterfactuals (Level C)

**Evidence level:** simulator counterfactuals on inspected history — the frozen engine run twice per scenario, the
unchanged baseline and baseline + one candidate book, each one continuous run from 2016-01-04 to the window's data
end (fold A: 2021-12-31, fold B: 2023-12-29), every cost fully re-simulated. Every fold replay is **retrospective
with an incumbent-hindsight comparator** (B4/B5 were chosen with 2016–2026 known; B5's GDX book was fitted to the
training pool path); the candidates were chosen ex ante by the sealed screens (`results/screen/SCREEN-{A,B}.json`).
Sources: `results/replays/REPLAYS.json` (sealed, bodyHash `22ebb7b55d60…`) and one payload per scenario
(`results/replays/*.json.gz`: funded lots and every decision of both runs, risk, attribution, portfolio), tables
`results/tables/replays.{md,csv}`, flags `results/analysis/ANALYSIS-2.json`. CLI: `npm run d1-signal-complementarity --
replays`. ΔV = window increment of B + c minus that of B (liquidation-equivalent). Every fixed run passed the
gate-replay check (engine funded set = the shadow rule restated), every attribution summed exactly to ΔV, and the
window shares summed exactly to V.

## 1. The menu that the sealed screens produced (18 fold replays, 25 scenarios in all)

| Cell | Fold A (cutoff 2020-06-30) | Fold B (cutoff 2021-12-31) |
|---|---|---|
| B4 × View U | S1 GDX°, NC XOP° (S2: none passed) | S1 GDX°, NC XOP° |
| B5 × View U | S1 none passed any gate; NC XOP° | S1 none; NC EWZ° |
| B4 × View P | S1 GDX° (fold-a A0), SRC XLB, NC XME | S1 FXI, SRC XOP°, NC IJR |
| B5 × View P | S1 IGV, SRC XLB, NC XME | S1 SMH, SRC XOP°, NC IJR |

Distinct ETFs per baseline × view across both folds: B4 U 2, B5 U 2, B4 P 6, B5 P 6 (budget ≤ 6). Plus the incumbent
diagnostic B4 → B5 (B5's own GDX book) on T, A, B and four in-sample View U replays on T (never in the verdict).

## 2. Results (5 bps unless stated; every cost re-simulated)

| Replay | B's V | ΔV 0 / 2 / **5** / 10 bps | ΔV s25 | First-order Δ | Own idle-clean | Own other lots | Incumbents gained | Incumbents lost | Δ minute DD | Flags |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|
| B4+U:GDX°@A (S1) | $62,161 | −10,060 / −10,217 / **−10,452** / −10,844 | | −17,469 | −4,975 | +2,272 | 0 | −7,750 | +$883 | ¬C |
| B4+U:XOP°@A (NC) | $62,161 | +29,207 / +23,544 / **+22,930** / +21,909 | | −11,933 | −348 | +53,470 | +5,800 | −35,992 | +$2,948 | fails complement-type **and** not-thin (largest gained lot $31,354 > ΔV) |
| B5+U:XOP°@A (NC) | $46,506 | +44,078 / +38,728 / **+38,585** / +38,346 | | −13,232 | −348 | +53,470 | +5,146 | −19,684 | +$4,093 | **reshuffle gain** |
| B4+P-A:GDX°@A (S1) | $62,161 | −15,986 / … / **−16,172** / −16,359 | | −17,301 | −538 | −732 | +1,129 | −16,031 | +$5,084 | ¬C |
| B4+P-A:XLB@A (SRC) | $62,161 | +497 / +497 / **+496** / +496 | | +496 | 0 | −261 | 0 | +757 | −$1,145 | not material |
| B4+P-A:XME@A (NC) | $62,161 | +3,913 / … / **+3,809** / +3,705 | | +3,809 | +3,809 | 0 | 0 | 0 | 0 | complement-type, not material, thin |
| B5+P-A:IGV@A (S1) | $46,506 | −18,464 / … / **−18,646** / −18,829 | | −4,595 | −4,008 | +9,158 | +654 | −24,450 | +$4,064 | ¬C |
| B5+P-A:XLB@A (SRC) | $46,506 | +497 / … / **+496** / +496 | | +496 | 0 | −261 | 0 | +757 | 0 | not material |
| B5+P-A:XME@A (NC) | $46,506 | +4,179 / … / **+4,374** / +4,569 | | +3,809 | +3,809 | +3,624 | +683 | −3,742 | 0 | not material, thin |
| B4+U:GDX°@B (S1) | $112,826 | −51,444 / −51,505 / **−47,656** / −46,758 | | −33,961 | −3,961 | +6,440 | +7,203 | −57,339 | +$6,528 | ¬C |
| B4+U:XOP°@B (NC) | $112,826 | +44,723 / +44,784 / **+44,877** / +26,055 | | +5,132 | +1,503 | +60,591 | 0 | −17,217 | −$5,448 | **reshuffle gain** |
| B5+U:EWZ°@B (NC) | $170,997 | −53,362 / … / **−52,815** / −51,864 | | −32,838 | 0 | +9,390 | −1,436 | −60,769 | +$21,202 | ¬C, ¬R |
| B4+P-B:FXI@B (S1) | $112,826 | −20,698 / … / **−20,780** / −19,484 | | −27,709 | −12,781 | +13,886 | 0 | −21,886 | +$17,499 | ¬C, ¬R |
| B4+P-B:XOP°@B (SRC) | $112,826 | −1,319 / … / **−1,418** / −1,517 | | −1,418 | −1,418 | 0 | 0 | 0 | 0 | ¬C |
| B4+P-B:IJR@B (NC) | $112,826 | −23,520 / … / **−23,996** / −24,472 | | −16,772 | −5,679 | +5,389 | −1,436 | −22,269 | 0 | ¬C |
| B5+P-B:SMH@B (S1) | $170,997 | −36,474 / … / **−36,843** / −36,808 | | −34,776 | +3,798 | −5,427 | +206 | −35,420 | +$4,826 | ¬C |
| B5+P-B:XOP°@B (SRC) | $170,997 | −1,319 / … / **−1,418** / −1,517 | | −1,418 | −1,418 | 0 | 0 | 0 | 0 | ¬C |
| B5+P-B:IJR@B (NC) | $170,997 | −18,669 / … / **−18,751** / −18,832 | | −16,033 | −3,540 | +6,456 | −1,436 | −20,230 | +$3,732 | ¬C |

(dollars; "own other" = the candidate's idle-displacing lots plus its lots that were busy against the unchanged
baseline but funded on the new path; "lost" = direct + cascade; s25 per replay in `replays.csv`.)

**Rubric (PROTOCOL §9.1, `ANALYSIS-2.json`): 0 of 18 fold replays meet C; 16 meet R; 7 have ΔV > 0 at every cost, 3
are material, 2 complement-type, 3 not thin; 2 are `pool-path gain (reshuffle)` (the XOP timing-only control, B5 fold
A and B4 fold B); no NC met C.** Verdict: **no demonstrated economically useful complementarity.**

## 3. What the full path shows that first-order bookkeeping cannot

1. **Every candidate the ex-ante screen preferred lost money in its evaluation window**, in both folds, both views and
   both baselines: S1 GDX −$10.5k (A) and −$47.7k (B) against B4 under View U; S1 GDX −$16.2k, IGV −$18.6k, FXI
   −$20.8k, SMH −$36.8k under View P. Their idle-clean lots were small and mostly negative; the dominant term is
   **incumbent lots lost** (−$7.7k to −$57.3k): the candidate's lots take the slot and the incumbents' later trades
   are refused.
2. **The material gains are not complementarity.** The XOP timing-only control (chosen because it had idle-clean
   decisions but was ex-ante uneconomic) added +$22.9k (A, B4), +$38.6k (A, B5) and +$44.9k (B, B4) — but its own
   idle-clean lots contributed −$348 to +$1,503; the gain is XOP lots that were **busy against the unchanged baseline**
   yet funded on the new path (fold A +$46.1k / +$48.8k, fold B +$29.8k) plus its idle-displacing lots (+$7.4k / +$4.7k,
   fold B +$30.7k), net of the incumbents they displaced — XOP's earlier lots shift the sequence. Two of the three are
   formal `pool-path gain (reshuffle)` (B5 fold A, B4 fold B); B4 fold A fails the thin test as well (one gained lot of
   $31,354 exceeds its ΔV). This is H2: a coincident book that changes *which* trades the slot funds. It is not complementarity
   (the slot is not used more when idle), it is not stable (B5 + U-XOP over the whole training era: **−$19,932**;
   fold B at 10 bps: +$26k vs +$45k at 5 bps), and it comes with risk (B4 + U-XOP over T: minute drawdown **$88,442** vs
   $28,659; worst lot −$27,186).
3. **First-order and full path disagree in sign in 2 of 18 fold replays** (XOP fold A, both baselines: first-order
   −$11.9k / −$13.2k, full path +$22.9k / +$38.6k) and in magnitude in most of the rest (e.g. GDX fold B −$34.0k vs
   −$47.7k; IGV −$4.6k vs −$18.6k: the cascade of lost incumbent trades is invisible to first-order arithmetic).
4. **Source-selected candidates were inert.** XLB (fold A) +$496; XOP's fold-b A0 −$1,418 (one idle-clean decision —
   its only funded lot, entered 2022-08-31 — and 4 busy ones; nothing displaced).
5. **Small complement-type effects exist but are immaterial and thin.** XME's fold-a A0 added +$3.8k against B4,
   entirely from its own idle-clean lots, and +$4.4k against B5 (idle-clean +$3.8k, the rest a small reshuffle) — one
   episode, below the $5,000 floor.

## 4. Reconciling GDX, XOP and XLE with the earlier studies

| | Earlier claim | What Study 2 finds |
|---|---|---|
| XOP, View U (= "unchanged D1") on B4, training | screen first-order −$117,211 (0 bps); map full path +$48,199 | Reproduced: full path **+$48,198.60**, first-order **−$118,582** (5 bps) — the sign flip is real and comes from reshuffling (own idle-clean −$9,346; candidate lots busy against B4 +$76,393; incumbents gained +$82,964, lost −$125,958). The same XOP book is **−$19,932** against B5, gives +$22.9k / +$44.9k against B4 in folds A / B, and takes the minute drawdown to $88k on T. |
| GDX, View U on B4 | screen −$9,094 (0 bps); map +$3,992 | Reproduced (+$3,991.75 on T, first-order +$1,494); in the fold windows as S1 against B4 (period-correct selection, not an independent out-of-sample test — both windows lie inside T): **−$10,452 (A), −$47,656 (B)**. |
| B5's GDX book (B4 → B5) | +$146,293 on training (fitted); B5 fold B +$170,997 | Reproduced on T (+$146,293); **fold A −$15,655, fold B +$58,171**: the book's training advantage did not hold in the 2020–21 rebound and was positive in the 2022–23 decline, where 46k of it came from the late-2022 rebound (G11) and 5k from 2022 (G10). An incumbent diagnostic, fitted with hindsight — not evidence for or against B5 beyond that. |
| XLE | map −$42,190 (unchanged), "mostly path reshuffle" for its fitted XLE-P | Reproduced in parity (−$42,189.62). XLE never passed all of a Study 2 screen's gates: View U had 1 idle-clean decision before either cutoff, idle net −$56.9k to −$73.5k and a standalone minute drawdown of $72,753; its fold-b A0 (no fold-a nominee) had 0 idle-clean decisions before 2022 against B4/B5 (2 idle-displacing against B5, idle net +$7,673) although its pre-cutoff standalone net was +$89,167 — XLE's D1 opportunities all coincide with the pools' own holdings. |

## 5. Portfolio overlay (20% of marked equity, $300,000 60/40 core)

Every replay's portfolio figures, with the **equity at the window start** for the baseline and the scenario, are in
`results/tables/scenario-risk.{md,csv}` (and `replays.csv`). Two cautions: (i) the window increments are **not
like-for-like** — each run is continuous from 2016, so the candidate already traded before the window and the scenario
starts the window with different equity (e.g. B5 + U-EWZ fold B $1,320,371 vs B5 $1,667,618; B4 + U-GDX fold A $849,744
vs B4 $753,934); (ii) the fixed-pool sign **flips in 5 of 18 fold replays** (5 of the 9 in fold A): B4 + U-GDX (A) fixed
−$10,452 / portfolio +$44,573; B4 + P-A GDX (A) −$16,172 / +$27,251; B4 + XME (A) +$3,809 / −$9,911; B5 + XME (A) +$4,374
/ −$106,947; B5 + XLB (A) +$496 / −$27,095 (different compounding and funding paths). Fold A: C0 +$441k, B4 +$619k, B5
+$741k. Fold B: C0 −$7k (the core alone fell 33.4% peak-to-trough in 2022); B4 +$304k; B5 +$603k; the XOP control
+$166k over B4; every fold-B S1 negative (GDX −$130k, FXI −$71k against B4; SMH −$256k against B5). No replay was refused
for margin. R (fixed windowed minute drawdown ≤ $35,000 and windowed daily portfolio drawdown) failed for B5 + EWZ (fold
B, $38,471) and B4 + FXI (fold B, $39,826).

## 6. Limits

The fold replays are few (18), regime-specific (A rebound, B decline) and on inspected history; B4/B5 embed hindsight;
View U is a counterfactual vector for every ETF but VGT; View P candidates were fitted on their pre-fold data. Stop
fills at the stop price and gap fills at the open are model assumptions; s25 (25 bps stop overshoot) is the only
adverse stress. Nothing here is a forecast or a deployment case.
