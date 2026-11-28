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
| Sequential paths and verdicts sealed | `8ab3f216` 19:43:21Z | D24 training (C24-D-broad) 19:46:23Z |
| C24 selection of every arm sealed | `1b77da5c` 22:32:48Z | — |
| `FROZEN_SELECTION.json` sealed (finalists, pre-determination, validation plan) | `46e42cb8` 22:32:49Z | — |
| FULL door authorization sealed | `5b041bb5` 22:32:49Z | FULL (TSLA) for the validation 22:32:55Z |
| Validation 2025-01-02 → 2026-10-30 sealed (once) | `567dfe78` 22:33:26Z | — |
| Outcome sealed | `45ab7699` 22:33:27Z | FULL for the report-only diagnostics 22:39:07Z (buy-and-hold) and 22:39:16Z (lot replays) |

Before the freeze, the engineering gates read the development doors D19–D24 for CPU/GPU equality, determinism and
identity checks (counts and hashes only), and the pilot ran 72 lanes on D21 for counts, timings and stop reasons
(PROTOCOL §2 "Real-data exposure before this freeze": no box, threshold, budget, cell or rule was derived from a TSLA
profit or drawdown). The FULL door entries before the validation are gate E3's reproductions of New L0 / N/original on
their **own VGT/GDX data** (sha256 keys VGT and GDX in the log); TSLA's 2025–2026 file is opened only by the validation.
**Confirmed from the door log:** the first entry for TSLA's FULL file (sha256 `8ed7f7d0…`) is the validation's, at
22:32:55.712Z, after the committed FULL authorization; the only later TSLA FULL entries are the two report-only
diagnostics after the sealed outcome. The small/wide neighbourhood diagnostic used D24 only.

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
| Fresh $100,000 TSLA buy-and-hold at the slice's first open, financed 11 % (report-only) | +$1,122,590 / $424,438 | −$56,931 / $89,499 | +$50,354 / $48,064 |
| The same, unfinanced (report-only) | +$1,144,560 / $423,263 | −$35,082 / $78,439 | +$61,324 / $44,719 |

The fresh-purchase rows (`reports/diagnostics/buy-and-hold.json` `freshPurchase`; `DECISION_REGISTER.md` R2) put
$100,000 into TSLA at each slice's first regular-minute open (+5 bps) and hold it to the slice's end: exposure-comparable
with one strategy slot, not a strategy. Their drawdowns are of the same marked-minute kind but unbounded by any exit.

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

## 6. The C24 finalists and the one validation (2025-01-02 → 2026-10-30; retrospective)

At C24 every arm ran its complete procedure on 2016–2024 (door D24). The selections were sealed, and
`FROZEN_SELECTION.json` (finalists, the (a)/(b) pre-determination, the validation plan) was committed before FULL
opened. The validation then evaluated every C24 primary and role of every arm and sub-population, and the external
controls, **once** (job `C24-validation`, 9,044 official GPU evaluations): one continuous run from 2016, validation P&L
from the 2024-12-31 close, reset DD restarted at that close, whole-run DD beside it (`results/validation/validation.json`
`b0f65400…`).

| Arm | C24 primary | Development net / DD | Validation P&L | Reset DD | Whole-run DD | V1 V2 V3 | Validation lots | (b) chronology | PROTOCOL §12 |
|---|---|---:|---:|---:|---:|---|---|---|---|
| D | `D.B1/R103#1` | $319,654 / $25,587 | −$8,979 | $13,924 | $27,742 | ✗ ✓ ✓ | 2 D1 | unsupported | not a candidate |
| G | `G.h2.s1/R101#1` | $340,913 / $28,655 | +$10,703 | $18,255 | $28,655 | ✓ ✓ ✓ | 4 Growth | unsupported | development-qualified, **no chronological support** |
| C | `DF1×GF3` (D primary × G balanced) | $498,120 / $26,288 | +$71 | $25,953 | $26,288 | ✓ ✓ ✓ | 2 D1 + 4 Growth | unsupported | development-qualified, **no chronological support** |
| J | `J.B1.h2.s1/R104#1` | $435,551 / $27,882 | −$10,751 | $29,253 | $29,253 | ✗ ✓ ✓ | 3 D1 + 2 Growth | unsupported | not a candidate |
| S | `S.C24F1.h1.s1/R101#1` (frozen D1 = D's primary) | $540,641 / $26,288 | −$2,412 | $26,869 | $26,869 | ✗ ✓ ✓ | 2 D1 + 4 Growth | unsupported | not a candidate |

Every primary passed Q1–Q6 at C24 (a). **Determination: NO QUALIFYING TSLA CANDIDATE**, with arm G's and arm C's
primaries *development-qualified without chronological support: not deployment-qualified without an explicit user
decision*. The sealed `results/outcome.json` omits that list because of a join defect in `outcome.ts`
(`AMENDMENTS.md` D1). The list here is the frozen rule applied to the sealed validation rows by finalist id
(`tools/tsla-d1-growth/outcome-join.py` → `reports/tables/outcome-join.json`). The candidate list is the same either way.

**Roles** (descriptive, never nominees):
- D's three lost $6,544 to $16,974.
- G's three made $3,669 to $9,050.
- J's three lost $915 to $25,035; the robust-profit role's whole-run DD of $42,923 also fails V3.
- S's three lost $2,049 to $19,940.

**Controls on the same period:**
- New L0 projected on TSLA (arms D, J): −$6,797, reset DD $57,154.
- N/original: +$5,060 / $58,047. Both fail V2 and V3, as in development. Their arm G projections did not trade.
- A fresh $100,000 TSLA purchase at the 2025-01-02 open: −$17,628 financed / +$2,443 unfinanced, DD $59,788 / $57,377.

**What happened in the 22 months.** There were few trades:
- Arm D's primary made 2 lots: a −$2,934 maximum-hold exit in February 2025 and a −$6,045 protective stop in July 2026.
- Every Growth vector caught the same trend, 2025-09-12 → 10-03 (+$18,167 to +$18,674), then took two initial stops in
  November and December 2025 (−$5,570 to −$8,575). G's +$10,703 is that one lot net of the stops.
- Arm C's pair ran arm D's primary and arm G's balanced role unchanged. They never collided in the validation, so the pair
  is the sum of the two: −$8,979 + $9,050 = +$71.
- J's D1 component lost −$20,342 on three lots.
- S's D1 component traded exactly arm D's validation lots; its Growth component made +$6,567.

**Neighbourhood on the validation.** The primaries' selection draws (2 × 128, regenerated exactly) were replayed on the
validation. Breaches of $35,000:
- D: 0/256 (median −$10,831).
- G: 0/256 (median +$5,520; p10 +$433).
- C: 4/256 (median −$6,753).
- J: 56/256 (median −$10,083; p90 reset DD $38,133).
- S: 4/256 (median −$6,682).

## 7. Interpretation

- **The validation agrees with the folds on the architectures.** In development at C24, all three combined primaries
  are "material improvements" over the better standalone primary, G, under PROTOCOL §12's bands (`results/outcome.json`
  comparisons; type P):
  - C +$157,207 centre net (replication not applicable);
  - J +$94,638 (replicated);
  - S +$199,729 (replicated).

  S also beats J (+$105,090, replicated). Over the validation, C made +$71, J −$10,751 and S −$2,412, against G's
  +$10,703. On the folds no arm was supported, and the combined arms had the deepest sequential drawdowns. A single
  in-sample comparison never proves an architecture superior (standard §3.4). Here the shared-slot advantage is an
  in-sample result that two independent out-of-sample tests did not repeat.
- **Why the validation drawdowns stayed below $35,000.** The selected stop distances differ greatly between cutoffs:
  arm D's primary stop was 24.1 % at C19 and 5.8 % at C24. Under the C24 vectors, each primary's worst validation lot was
  −$6,045 to −$8,575, against −$18,500 to −$31,800 for D, C, J and S on the folds (G: −$11,659). That is one 22-month period with 2–6 lots per
  primary. It does not show that the drawdown problem of §3 is solved.
- **Passing V1–V3 does not repair the chronological failure.** The binding evidence is the arm's procedure re-run at
  three cutoffs, and each time its next period breached the limit (G by $1,079). The 2025–2026 result of one frozen
  vector is a single retrospective period. G's validation profit is one +$18,674 lot net of two stops, and C's is $71.
- **Nothing is promoted.** G's and C's primaries meet (a) and (c) but not (b). Under the frozen rule they are reported for
  the user's information, and adopting either would need the user's explicit decision. This study does not recommend
  it: on the same procedure, the fold evidence shows next-period drawdowns above the limit and out-of-sample returns at
  10–35 % of the in-sample rate.
