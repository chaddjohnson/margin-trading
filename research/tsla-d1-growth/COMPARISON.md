# COMPARISON: D, G, C, J, S and the controls (brief §7; one table per evidence period)

**The same basis for every row.**
- One exclusive $100,000 TSLA slot on the same Alpaca SIP minute data and the same accepted engine.
- 5 bps per executed side inside the fills; 11 % simple interest on outstanding principal by calendar day.
- Marked minute drawdown in dollars of the $100,000 allocation.
- **The same selection rule for every arm**: NL0's original rule, the qualified member with the highest centre net.
- The same qualification gates Q1–Q6 and the same neighbourhood instrument.

**The controls.**
- *External controls:* New L0's and N/original's VGT books, projected unchanged onto TSLA. Arm D projects their D1
  book, arm G their Growth book, arm J both.
- *Buy-and-hold:* $100,000 of TSLA bought at the first regular-minute open (+5 bps), financed at the same 11 % or
  unfinanced.
  - The **fresh-purchase** rows put $100,000 in at the start of each period: one slot's exposure for that period.
  - The continuous 2016 holding is not exposure-comparable: by 2024 the position was worth many times the $100,000 slot.

Detailed per-candidate metrics are in `ROBUSTNESS_AND_RISK.md` and the arm reports.

## A. Development (2016-01-04 → 2024-12-31; the C24 selection; every choice was made on this data)

| Row | Selected (C24) | Net | Gross | Interest | Costs | Marked DD (% of $100k) | Lots (W/L) | Confirmation p10 net / p90 DD | Q1–Q6 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| **D** — D1 standalone | `D.B1/R103#1` | $319,654 | $343,750 | $18,926 | $5,169 | $25,587 (25.6 %) | 50 (34/16) | $79,447 / $34,819 | pass |
| **G** — Growth standalone | `G.h2.s1/R101#1` | $340,913 | $356,787 | $12,597 | $3,277 | $28,655 (28.7 %) | 31 (22/9) | $222,806 / $32,572 | pass |
| **C** — fixed pair | `DF1×GF3` (D primary × G balanced) | $498,120 | $531,863 | $26,581 | $7,162 | $26,288 (26.3 %) | 69 (48/21) | $298,234 / $32,456 | pass (1 of 9 pairs) |
| **J** — fully joint | `J.B1.h2.s1/R104#1` | $435,551 | $459,736 | $19,258 | $4,928 | $27,882 (27.9 %) | 47 (34/13) | $254,243 / $33,240 | pass |
| **S** — D1-first sequential | `S.C24F1.h1.s1/R101#1` | $540,641 | $576,275 | $28,449 | $7,185 | $26,288 (26.3 %) | 69 (49/20) | $327,862 / $34,452 | pass |
| New L0 on TSLA (D1 book; arms D, J) | external control | $118,509 | $174,326 | $46,381 | $9,436 | $97,606 (97.6 %) | 94 (54/39) | $87,861 / $110,247 | fails Q2 Q3 Q5 |
| N/original on TSLA (D1 book; arms D, J) | external control | $101,986 | $162,101 | $47,586 | $12,528 | $98,507 (98.5 %) | 125 (71/53) | $63,016 / $124,038 | fails Q2 Q3 Q5 |
| New L0 on TSLA (Growth book; arm G) | external control | −$5,531 | −$4,710 | $723 | $98 | $11,869 (11.9 %) | 1 (0/1) | −$16,183 / $21,268 | fails Q1 Q4 Q5 |
| N/original on TSLA (Growth book; arm G) | external control | −$5,669 | −$4,848 | $723 | $98 | $11,852 (11.9 %) | 1 (0/1) | −$16,412 / $22,245 | fails Q1 Q4 Q5 |
| TSLA buy-and-hold from 2016, financed | report-only | $2,423,939 | — | $98,969 | 5 bps | $2,041,223 | 1 | — | — |
| TSLA buy-and-hold from 2016, unfinanced | report-only | $2,522,908 | — | — | 5 bps | $2,028,324 | 1 | — | — |

In development, the combined arms show the highest nets, and the in-sample comparisons of PROTOCOL §12 call them
material improvements (§D). The controls' D1 books on TSLA fail the drawdown gates. Their arm J projection equals the arm D
projection to the cent (94 lots, all D1): the Growth book's single TSLA lot does not occur in the shared slot.

## B. Folds (independently chronological; each selection made on earlier data only; 2020–2024)

Each arm's fold primaries, chained (C19's primary in 2020–2021, C21's in 2022–2023, C23's in 2024). Every row starts
from $0 at the 2019 close. Each cell gives P&L / reset DD.

| Row | 2020–2021 | 2022–2023 | 2024 | Over 2020–2024 | Drawdown over 2020–2024 | Verdict (PROTOCOL §11.2) |
|---|---:|---:|---:|---:|---:|---|
| **D** | +$20,368 / $40,170 | −$7,376 / $13,332 | +$12,231 / $11,051 | $25,172 | $40,170 | **unsupported** |
| **G** | +$30,546 / $21,991 | $0 / $0 | +$12,401 / $26,796 | $42,947 | $36,079 | **unsupported** (by $1,079) |
| **C** | +$45,465 / $34,558 | −$11,309 / $17,561 | −$7,567 / $37,608 | $26,589 | $61,092 | **unsupported** |
| **J** | +$82,512 / $67,635 | −$16,452 / $30,242 | +$33,520 / $17,490 | $99,581 | $67,635 | **unsupported** |
| **S** | +$92,527 / $43,801 | −$25,876 / $64,512 | +$17,654 / $32,166 | $84,305 | $82,547 | **unsupported** |
| New L0 on TSLA (D1 book; fixed vector) | +$66,044 / $75,933 | +$24,725 / $97,606 | −$1,315 / $37,888 | $89,454 (sum of the slices) | ≥ $97,606 | fixed vector; not a procedure |
| N/original on TSLA (D1 book; fixed vector) | +$83,032 / $74,761 | −$657 / $98,507 | +$799 / $34,114 | $83,174 (sum of the slices) | ≥ $98,507 | fixed vector; not a procedure |
| Fresh $100k TSLA buy-and-hold per period, financed | +$1,122,590 / $424,438 | −$56,931 / $89,499 | +$50,354 / $48,064 | three separate purchases | — | report-only |
| The same, unfinanced | +$1,144,560 / $423,263 | −$35,082 / $78,439 | +$61,324 / $44,719 | three separate purchases | — | report-only |

In-sample, the fold primaries earned $29,000–$90,000 per year of training data. Out of sample they earned $5,000 (D, C),
$8,600 (G), $16,900 (S) and $19,900 (J) a year. TSLA's 2020–2021 rise made a fresh buy-and-hold position worth about 12 times
its cost (unfinanced +$1,144,560), so no strategy here approaches buy-and-hold over 2020–2021. Buy-and-hold also lost $56,931 (financed)
in 2022–2023, with a drawdown of $89,499.

## C. Final period: the validation, 2025-01-02 → 2026-10-30 (once, after the frozen selection; retrospective)

| Row | Validation P&L | Reset DD | Whole-run DD | V1 V2 V3 | Validation lots | Determination (PROTOCOL §12) |
|---|---:|---:|---:|---|---|---|
| **D** | −$8,979 | $13,924 | $27,742 | ✗ ✓ ✓ | 2 D1 | not a candidate |
| **G** | +$10,703 | $18,255 | $28,655 | ✓ ✓ ✓ | 4 Growth | development-qualified, **no chronological support** |
| **C** | +$71 | $25,953 | $26,288 | ✓ ✓ ✓ | 2 D1 + 4 Growth | development-qualified, **no chronological support** |
| **J** | −$10,751 | $29,253 | $29,253 | ✗ ✓ ✓ | 3 D1 + 2 Growth | not a candidate |
| **S** | −$2,412 | $26,869 | $26,869 | ✗ ✓ ✓ | 2 D1 + 4 Growth | not a candidate |
| New L0 on TSLA (D1 book) | −$6,797 | $57,154 | $97,606 | ✗ ✗ ✗ | 15 D1 | control |
| N/original on TSLA (D1 book) | +$5,060 | $58,047 | $98,507 | ✓ ✗ ✗ | 23 D1 | control |
| Controls' Growth books (arm G) | $0 (no trade) | $0 | $11,869 / $11,852 | — | 0 | control |
| Fresh $100k TSLA buy-and-hold from 2025-01-02, financed | −$17,628 | $59,788 | — | — | 1 | report-only |
| The same, unfinanced | +$2,443 | $57,377 | — | — | 1 | report-only |
| Continuous buy-and-hold from 2016, financed | −$44,889 | $1,457,606 (from the 2024 close) | $2,041,223 | — | 1 | report-only |

**Outcome: NO QUALIFYING TSLA CANDIDATE.** No arm's selection procedure is chronologically supported. G's and C's
primaries pass V1–V3 and are *development-qualified without chronological support*; the sealed outcome omits that list
because of a join defect (`AMENDMENTS.md` D1; `reports/tables/outcome-join.json`).

## D. The architecture comparisons of PROTOCOL §12 (C24 development; in-sample; bands and replication)

B is the better standalone primary, **G**, with centre net $340,913. A *material improvement* needs, for type P: centre
net ≥ B + $10,000, confirmation robust ≥ B + $5,000, and centre DD and confirmation p90 DD each ≤ B + $2,500. It must
also replicate: qualified members from ≥ 2 replicate numbers meet the same type.

| Comparison | Δ centre net | Δ confirmation robust | Δ centre DD | Δ confirmation p90 DD | Type | Replicated | Material | Then: folds (sequential net / DD) | Then: validation |
|---|---:|---:|---:|---:|---|---|---|---|---|
| C vs G | +$157,207 | +$83,324 | −$2,367 | −$116 | P | n/a (no seeds) | **yes** | C $26,589 / $61,092 vs G $42,947 / $36,079 | +$71 vs +$10,703 |
| J vs G | +$94,638 | +$40,025 | −$774 | +$667 | P | yes (R101–R104) | **yes** | J $99,581 / $67,635 vs G | −$10,751 vs +$10,703 |
| S vs G | +$199,729 | +$111,082 | −$2,367 | +$1,879 | P | yes (9 replicate numbers) | **yes** | S $84,305 / $82,547 vs G | −$2,412 vs +$10,703 |
| J vs S | −$105,090 | −$71,056 | +$1,594 | −$1,212 | — | — | no | J $99,581 / $67,635 vs S $84,305 / $82,547 | −$10,751 vs −$2,412 |
| S vs J | +$105,090 | +$71,056 | −$1,594 | +$1,212 | P | yes | **yes** | (as above) | −$2,412 vs −$10,751 |

**Reading.** Every in-sample architecture win of §12 was followed, out of sample, by a deeper sequential drawdown than
the standalone G arm's. In the validation, every combined primary made less than G's. These are single historical
comparisons on one stock (standard §3.4): they do not show that any architecture is better. They show that the
shared-slot in-sample advantage did not repeat on later data. The source of that advantage is in
`ROBUSTNESS_AND_RISK.md` §7:
- more of the slot's idle time used;
- displacement losses of $98,000–$133,000 at C24 in C and S;
- at C21 and C23, a D1 vector inside J that could only stay under the limit because Growth occupied the slot.

## E. Wins that come from a change of basis or coverage (brief §7)

- **Combined arms.** Their in-sample nets rise partly because a second book fills the slot's idle time, and at C21 and
  C23 because the shared chronology let J and S use more aggressive D1 vectors. This is allocator chronology, not
  better strategy parameters. At C24 each book of J alone earns less than the standalone primary.
- **Unrestricted Growth (G-U, J-U, S-U; report-only).** The large 2020–2021 gains come from holding TSLA through its
  tenfold rise with no exit protection. Drawdowns exceed the slot.
- **Buy-and-hold from 2016.** It compounds one position to many times the slot. Only the fresh-purchase rows are
  comparable with one $100,000 slot.
- **External controls on arm G.** The VGT phenotypes' Growth book traded TSLA once, so the comparison says nothing
  about Growth on TSLA.
