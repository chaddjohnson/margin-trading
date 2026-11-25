# Chronological validation — P6-TSLA (folds, sequential verdicts, the one validation)

**Evidence labels used here.** *Development* = 2016-01-04 → 2024-12-31 (every choice). *Independently chronological* = the
fold evidence (§1–§5): at each cutoff the complete search-and-selection procedure of every arm ran on the data before the
cutoff only; its selection was sealed and committed before the next period's data door opened; the next period was
replayed without retuning. *Retrospective* = every period after 2019: 2020, 2022 and 2025–2026 are broad-market
episodes examined by many of this program's studies, so none of it is a pristine holdout; there is **no prospective
unseen period**. *Report-only* = sub-populations, roles, controls and diagnostics (never a selection input).

## 1. Order of events (door log `results/doors.jsonl`; commits on `research/tsla-d1-growth`)

| Step | Commit (UTC) | Next door opened (UTC) |
|---|---|---|
| Protocol P6-TSLA 1.0.0 frozen | `b2667d83` 12:21:37Z | D19 training (C19-D-broad) 12:21:59Z |
| C19 selection of every arm sealed | `0c1a4a13` 14:20:50Z | D21 for the C19 slice 14:20:53Z |
| C19 slice (2020-01-02 → 2021-12-31) sealed | `7f9c09c5` 14:21:12Z | D21 training (C21) after it |
| C21 selection sealed | `1e256ff6` 16:31:07Z | D23 for the C21 slice 16:31:12Z |
| C21 slice (2022-01-03 → 2023-12-29) sealed | `6e570f56` 16:31:37Z | D23 training (C23) after it |
| C23 selection sealed | `6da330d7` 19:42:53Z | D24 for the C23 slice 19:42:58Z |
| C23 slice (2024-01-02 → 2024-12-31) sealed | `4ad0c595` 19:43:20Z | — |
| Sequential paths and verdicts sealed | `8ab3f216` 19:43:21Z | D24 training (C24) 19:46:18Z |
<!-- PENDING-C24: C24 selection, FROZEN_SELECTION, FULL authorization, validation, outcome rows -->

Before the freeze, the engineering gates read the development doors D19–D24 for CPU/GPU equality, determinism and
identity checks (counts and hashes only), and the pilot ran 72 lanes on D21 for counts, timings and stop reasons
(PROTOCOL §2 "Real-data exposure before this freeze": no box, threshold, budget, cell or rule was derived from a TSLA
profit or drawdown). The FULL door entries before the validation are gate E3's reproductions of New L0 / N/original on
their **own VGT/GDX data** (sha256 keys VGT and GDX in the log); TSLA's 2025–2026 file is opened only by the validation.
<!-- PENDING-C24: confirm the first TSLA FULL entry is the validation's -->

## 2. What each arm's procedure selected at each cutoff (training evidence, centre configuration)

NL0's original rule (the qualified member with the highest centre net) for every arm; $ of the fixed $100,000 slot.

| Arm | C19 (2016–2019) net / DD | C21 (2016–2021) net / DD | C23 (2016–2023) net / DD |
|---|---:|---:|---:|
| D — D1 | `D.B1/R102#1` $210,046 / $15,892 | `D.C1/R102#1` $297,254 / $25,375 | `D.D1/R102#1` $235,330 / $20,969 |
| G — Growth | `G.h1.s1/R102#1` $150,160 / $24,038 | `G.h1.s1/R101#1` $303,551 / $32,292 | `G.h1.s1/R103#1` $302,508 / $30,186 |
| C — fixed pair | `DF1×GF3` $242,090 / $15,892 | `DF2×GF1` $329,170 / $32,292 | `DF3×GF2` $403,641 / $32,506 |
| J — joint | `J.B1.h1.s0/R102#1` $238,403 / $15,352 | `J.D1.h2.s1/R104#1` $410,874 / $31,918 | `J.C1.h0.s0/R104#1` $401,482 / $31,670 |
| S — D1-first | `S.C19F1.h1.s1/R104#1` $294,785 / $15,342 | `S.C21F3.h0.s1/R104#1` $542,170 / $32,292 | `S.C23F3.h2.s1/R102#1` $449,917 / $32,506 |

Every primary passed Q1–Q6 on its own cutoff's data. The procedure changed its phenotype at every fold in every arm
except G (cell `G.h1.s1` three times, with different vectors): D moved through D1 families B → C → D; J through
B1·h1 → D1·h2 → C1·h0; S's frozen D1 itself changed with each cutoff's arm D selection.

## 3. The next periods, without retuning (continuous runs from 2016; slice P&L from the cutoff close; reset slice DD)

| Arm | 2020–2021 P&L / reset DD | 2022–2023 P&L / reset DD | 2024 P&L / reset DD |
|---|---:|---:|---:|
| D | +$20,368 / $40,170 | −$7,376 / $13,332 | +$12,231 / $11,051 |
| G | +$30,546 / $21,991 | $0 / $0 (no trade) | +$12,401 / $26,796 |
| C | +$45,465 / $34,558 | −$11,309 / $17,561 | −$7,567 / $37,608 |
| J | +$82,512 / $67,635 | −$16,452 / $30,242 | +$33,520 / $17,490 |
| S | +$92,527 / $43,801 | −$25,876 / $64,512 | +$17,654 / $32,166 |
| Control New L0 (VGT phenotype on TSLA; arm D/J) | +$66,044 / $75,933 | +$24,725 / $97,606 | −$1,315 / $37,888 |
| Control N/original (same) | +$83,032 / $74,761 | −$657 / $98,507 | +$799 / $34,114 |
<!-- PENDING-DIAG: fresh $100,000 TSLA buy-and-hold per slice (financed / unfinanced), reports/diagnostics/buy-and-hold.json freshPurchase -->

Arm G's projections of the external controls trade TSLA only in 2016–2019 (whole run −$5,531 / DD $11,869) and never
in a slice.

**Where the slice drawdowns came from (sealed slice lots).** In development the binding drawdowns were mostly
give-backs of unrealized gains (for example the shared $32,291.84 of C21: one Growth lot marked at $190,508 on
2020-07-13 at 09:45 ET that reversed the same day and still exited profitably). The out-of-sample drawdowns are
mostly **realized principal losses on single $100,000 lots**:

- 2020–2021: D1 protective stops of −$24,387 (2020-03-06 → 03-13, the COVID crash) and −$24,507 (2021-02-22 → 03-05) in
  D, C and S; in J two Growth lots that ran to their maximum hold at a loss, −$31,799 (2020-02-20 → 03-09; worst mark
  −$32,077) and −$27,600 (2021-02-16 → 03-08; worst mark −$34,632), plus a D1 stop of −$16,444 (2020-03-11 → 03-13).
- 2022–2023: S's frozen D1 (C21F3 = arm D's C21 *balanced* role `D.D1/R103#3`) lost −$20,385, −$18,557 and −$18,526 on three 2022 protective stops;
  D, C and J lost $4,800–$6,400 per stop on several small trades; G (the C21 primary) never entered.
- 2024: a D1 protective stop of −$15,305 (2024-01-16 → 01-25) in C and S; Growth initial stops of −$10,633 to −$11,659
  (2024-10-28 → 11-04) in G, C and S; G's last lot (entered 2024-12-26) was marked −$13,420 at the slice end.

The training lots' adverse excursions were small by comparison (median −$1,400 to −$3,100, worst −$7,500 to −$14,000
per lot; arm reports §I): the protective-stop distances the search chose were wide enough to admit −24 % single-lot
losses, which 2016–2019 rarely tested and 2020–2022 did.

**Training robustness did not transfer.** The training neighbourhood (confirmation draws around each primary) breached
$35,000 in 0–11 % of draws on the training data; replayed on the next slice, the same draws breached in up to 256 of 256
(C19: D 243/256, C 193/256, J 256/256, S 253/256; C21: S 256/256, J 33/256; C23: C 113/256, S 51/256; arm reports §D).

## 4. The binding test: each arm's sequential verdict (PROTOCOL §11.2; `results/sequential.json` `2a1079a0…`)

Each arm's procedure is chained over the three folds (C19's primary for 2020–2021, C21's for 2022–2023, C23's for 2024;
5 bps of $100,000 per open lot closed or adopted at a switch). Supported iff every fold produced a primary, the sequential
net > 0 and the strict sequential drawdown (every exactly observed GPU mark) ≤ $35,000.

| Arm | Sequential net 2020–2024 | Sequential DD | Where the maximum DD occurs | Verdict |
|---|---:|---:|---|---|
| D | $25,172 | $40,170 | inside the 2020–2021 slice | **unsupported** |
| G | $42,947 | $36,079 | from a January 2020 mark of $48,930 (a lot carried from 2019, exited at +$30,546) to the 2024 low (−$17,695 below the 2023 close); over by $1,079 | **unsupported** |
| C | $26,589 | $61,092 | 2024, from an earlier peak | **unsupported** |
| J | $99,581 | $67,635 | inside the 2020–2021 slice | **unsupported** |
| S | $84,305 | $82,547 | 2024, from an earlier peak | **unsupported** |

**No arm's selection procedure is chronologically supported.** Every sequential net is positive; every sequential
drawdown exceeds the $35,000 limit. Under the frozen determination (PROTOCOL §12) no C24 finalist can therefore be a
*TSLA research candidate*, whatever its validation shows.

Report-only sub-populations: D-A (D1 with a downside control) is chronologically incomplete — no qualified candidate at
C21 or C23; G-P = G; G-U (unrestricted Growth) $300,320 / $111,944; J-P $79,760 / $67,635; J-U $386,935 / $105,479; S-P =
S; S-U $183,722 / $85,703 — all unsupported. The unrestricted variants earn far more in 2020–2021 (they held TSLA through
its tenfold rise) and give it back with drawdowns of $85,000–$112,000 on the $100,000 slot.

Descriptive role chains (never nominating; not the frozen selector): G's *balanced* ($50,723 / $30,339) and
*lower-drawdown* ($70,436 / $17,275) chains meet the numeric test; every other role chain of every arm fails. Choosing
one of them now, after seeing the folds, would be a change of selection rule, so they are reported and not promoted.

**Shrinkage from development to out-of-sample.** Per year of data, the fold primaries' training nets were $29,000–$90,000;
the chained out-of-sample nets are $5,000 (D, C), $8,600 (G), $16,900 (S) and $19,900 (J) per year over 2020–2024 — 10–35 %
of the in-sample rate, with sequential drawdowns larger than any training drawdown of the same arm's primaries
(D $40,170 vs ≤ $25,375; G $36,079 vs ≤ $32,292; C $61,092, J $67,635, S $82,547 vs ≤ $32,506).

## 5. Architecture reading of the folds (descriptive; the binding comparisons are at C24, §12)

- **J and S** have the highest sequential nets ($99,581 and $84,305) and the deepest sequential drawdowns ($67,635 and
  $82,547): the shared-slot optimization found more profit in sample and took more out-of-sample risk; neither is
  supported.
- **C**, the fixed pairing of the standalone finalists, made less than the higher of D or G in two of three folds
  (2022–2023 and 2024) and deepened the 2024 drawdown: no combination benefit is visible out of sample.
- **G** came closest to support ($1,079 over the limit) largely by not trading: no entry in 2022–2023.
- **D** made the least per unit of drawdown ($25,172 for $40,170).
<!-- PENDING-C24: §6 the C24 finalists and the one validation; §7 interpretation -->
