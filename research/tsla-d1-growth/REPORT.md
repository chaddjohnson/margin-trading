# REPORT — Priority 6: TSLA D1 + Growth, comprehensive GPU research (P6-TSLA 1.0.0)

Study `research/tsla-d1-growth/`, branch `research/tsla-d1-growth`. Protocol `PROTOCOL.md` (frozen 2026-11-25T12:21Z,
sha256 `d5d462dc…`), optimization standard 3.0.0, NL0 1.0.0. One exclusive $100,000 TSLA slot, 5 bps per side, 11 % simple
interest, marked minute drawdown ≤ $35,000 (35 % of the fixed allocation).

**Evidence labels.** *Development*: 2016-01-04 → 2024-12-31, every choice. *Independently chronological*: the three folds
(each selection made on earlier data only, sealed and committed before the next period opened). *Retrospective*: every
period after 2019, including the 2025-01-02 → 2026-10-30 validation, which is previously examined broader-market
history, not a pristine holdout. *Report-only*: sub-populations, roles, controls, diagnostics. **There is no prospective
unseen period.** Nothing here is adopted, deployed or merged.

## 1. Result

**NO QUALIFYING TSLA CANDIDATE** (`results/outcome.json`, sealed 2026-11-25T22:33:27Z, commit `45ab7699`).

- **No arm's selection procedure is chronologically supported** (`results/sequential.json`, sealed before C24's
  training door opened). Over 2020–2024 every arm's chained fold primaries made money ($25,172 to $99,581), and every
  chain's drawdown broke the $35,000 limit ($36,079 to $82,547). Under the frozen determination (PROTOCOL §12), no
  finalist could therefore be a TSLA research candidate, whatever its validation showed.
- **At C24** (2016–2024) every arm's primary passed Q1–Q6.
- **In the one validation** (2025-01-02 → 2026-10-30, retrospective):
  - G (+$10,703) and C (+$71) passed V1–V3;
  - D (−$8,979), J (−$10,751) and S (−$2,412) failed V1.

  G's and C's primaries are therefore **development-qualified without chronological support: not deployment-qualified
  without an explicit user decision**. The sealed outcome record omits this list because of a join defect in
  `outcome.ts` (`AMENDMENTS.md` D1). The list is reproduced from the two sealed files by finalist id
  (`reports/tables/outcome-join.json`).
- **The combined architectures' in-sample advantage did not carry over.** At C24, C, J and S are material improvements
  over the better standalone primary (G) under PROTOCOL §12, J and S replicated. Out of sample they had deeper
  sequential drawdowns than G on the folds, and made less than G in the validation.
- Nothing was adopted, deployed or merged. TSLA was not combined with any other instrument or portfolio. MSFT was not
  started.

## 2. What was fixed, and what was searched

**Fixed (PROTOCOL §5; decision register P2).** The program's accepted engine, unchanged: one exclusive, fully funded $100,000
trading slot, granted only at a decision's own instant when nothing is open or reserved; at a same instant D1 decides first,
then Growth; no compounding, preemption or forced switch; 5 bps per executed side inside the fill prices; 11 % simple
interest on outstanding principal by calendar day; stops at the stop level or the gapped open; fractional shares; calendar-day
maximum holds; D1's shadow lifecycle and Growth lifecycle L0; shadow-entry eligibility OFF; S1 absent. Both engine slots
carry one TSLA data door; the VGT-slot books (D1·VGT, Growth·VGT) trade TSLA and the GDX books are disabled, so no evaluation
file changed (gates E1, E4, E6). Risk is the marked minute drawdown in dollars of the fixed $100,000 allocation (P0: ≤ $35,000
= 35 %), never a percentage of peak equity.

**Searched (PROTOCOL §6–§7).** The original parameter domains: Study 8's D1 box, Assignment 2's RC 2 control families,
Growth 1.4.0's complete genome on growth140's boxes (75 genes: 11 categorical, 64 ordinal). Five arms, each with protected
cells that get identical budgets:

| Arm | What it searches | Cells | Base replicates | Base broad lanes per cutoff |
|---|---|---:|---:|---:|
| D — D1 standalone | D1·TSLA (Growth off): D1 family A–D × decline gate | 8 | 4 | 32 |
| G — Growth standalone | Growth·TSLA (D1 off): exit protection {hold off; hold on, buffer off; hold on, buffer on} × initial ATR stop | 6 (`G.h0.s0` = unrestricted) | 8 | 48 |
| C — fixed combination | every pair of D's and G's finalists (≤ 3 each), vectors unchanged, one slot — **no search** | ≤ 9 pairs | — | — |
| J — fully joint | D1 and Growth together | 48 (8 × 6) | 4 | 192 |
| S — D1-first sequential | arm D's finalists frozen (≤ 3: primary, robust-profit, balanced role), Growth searched in the shared slot against them | 6 per frozen D1 | R_S(F) = max(4, ⌈160 ÷ 6F⌉) | ≥ 160 (with D's 32 lanes ≥ J's 192) |

Each lane is the New L0 method's (NL0 1.0.0) unchanged per-lane schedule (screen 512 → plausibility → promotion 64 → rung 1 →
islands → rungs 2 and 3 → refinement → shortlist), with Priority 5's two-tier stopping. **Tier 1:** a lane runs another
island while NL0's trigger fires, up to NL0's caps (6 broad, 8 refinement), and beyond them up to 16 islands only while a
performance component (> 5 %) fires. **Tier 2:** a replicate round of every cell of an arm runs while the last replicate
raised the arm's union of feasible fits by > 2 % (≤ 4 rounds). A stage-2 refinement then runs 4 informed lanes in each of up
to D 8 / G 6 / J 16 / S 12 cells chosen by a frozen rule from the arm's qualified broad members. A search with > 10 % of its
lanes at the 16-island cap, or one that ends at the replicate cap, is labelled "budget-limited (not converged)".
**Budget exhausted is never described as convergence.** Hard ceiling: 120 M requested official evaluations (a safeguard).

**Qualification and selection (PROTOCOL §9–§10).** Every member that reaches a lane's shortlist is qualified on its own
cutoff's development door with gates Q1–Q6: Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 confirmation p90 DD ≤ $35,000 over
3 × 128 neighbourhood draws; Q4 confirmation p10 net > 0; Q5 at 10 bps per side centre net > 0 and DD ≤ $35,000; Q6 every
family of the arm funded at the centre. **The same selection rule applies to every arm** — NL0's original rule: the primary
is the qualified member with the highest centre net (ties: selection robust net, lower DD, label); roles robust-profit,
balanced and lower-drawdown from the selection families. RA1, an experimental risk-aware rule, is computed on the identical
populations and is report-only. External controls (New L0's and N/original's VGT books projected unchanged onto TSLA) are
qualified and replayed beside the arms, never selected.

**Chronology (PROTOCOL §3, §11–§12).** Development 2016-01-04 → 2024-12-31; data doors are byte prefixes, opened in order.
Folds: C19 (data through 2019) → slice 2020–2021; C21 → 2022–2023; C23 → 2024. At each fold the complete
search-and-selection procedure of every arm ran on the data before the cutoff only; its selection was sealed and committed;
then one official job replayed every subject on the next period without retuning (continuous runs from 2016; slice P&L from
the cutoff close; reset slice DD beside the whole-run DD). Each arm's **independent chronological verdict** chains its three
fold primaries: *supported* iff every fold produced a primary, the sequential net > 0 and the sequential drawdown ≤ $35,000.
C24 (data through 2024) gives the finalists; `FROZEN_SELECTION.json` sealed the finalists, their development and
chronological labels before the 2025-01-02 → 2026-10-30 period was opened **once** (V1 validation P&L > 0; V2 reset
validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000). A finalist is a *TSLA research candidate for the user's review* only if
it passes Q1–Q6 at C24, is its arm's primary with a *supported* verdict, and passes V1–V3. The 2025–2026 period is
**retrospective, previously examined broader-market history** (examined by many of this program's studies), never a
pristine holdout; there is no prospective unseen period.

**Architecture comparisons (PROTOCOL §12).** For each combined arm K ∈ {C, J, S} against the better standalone primary B (D or
G), and J against S both ways, on C24 development evidence with the same instrument and draws: K is a *material improvement*
iff both are qualified and either type P (centre net ≥ B + $10,000, confirmation robust ≥ B + $5,000, centre DD and
confirmation p90 DD each ≤ B + $2,500) or type R (confirmation p90 DD ≤ B − $2,500, centre DD ≤ B + $2,500, centre net and
confirmation robust each ≥ B − $2,500) holds **and replicates** (qualified members of K from ≥ 2 replicate numbers meet the
same type; arm C has no seeds, so not applicable). A single historical comparison never proves an architecture superior.

## 3. Data (`TSLA_DATA_AUDIT.md`)

- Alpaca SIP minute bars, raw, 2016-01-04 → 2026-10-30, from the existing account (no purchase): 2,723 of 2,723 NYSE
  sessions; 1,975,254 rows; sha256 `8ed7f7d0…`. In development, 607 regular minutes (0.07 %) have no trade, hence no
  bar; in validation, none. There are 7 halts, kept as they are (none filled), including the 2018-08-07 "funding secured"
  halt and the March 2020 circuit breakers.
- Two splits: 5:1 on 2020-08-31 and 3:1 on 2022-08-25. Both are documented in the issuer's 8-K filings (plus an OCC memo
  for 2022), explain the raw gaps exactly, and agree with an independent daily source within 0.12 %. They are kept in a
  study-local ledger, `data/TSLA-splits.json`, because the central ledger is pinned by frozen records (decision U2). No
  other split-sized gap exists, and TSLA paid no dividend.
- Data doors are byte prefixes opened in chronological order: D19, D21, D23, D24, then FULL once. The door log is
  `results/doors.jsonl`.

## 4. Development evidence at C24 (2016–2024)

| Arm | C24 primary | Centre net / DD | Selection robust / p90 DD | Confirmation robust / p10 / p90 DD | Lots (D1 + Growth) | Qualified / members | Cells with a feasible fit |
|---|---|---:|---:|---:|---:|---:|---:|
| D | `D.B1/R103#1` (stop 5.8 %, decline gate) | $319,654 / $25,587 | $110,667 / $35,592 | $113,825 / $79,447 / $34,819 | 50 + 0 | 150 / 155 | 4 / 8 (gate on) |
| G | `G.h2.s1/R101#1` (hold, buffer, initial stop) | $340,913 / $28,655 | $241,973 / $33,387 | $244,587 / $222,806 / $32,572 | 0 + 31 | 196 / 278 | 6 / 6 |
| C | `DF1×GF3` (D primary × G balanced) | $498,120 / $26,288 | $322,585 / $33,064 | $327,911 / $298,234 / $32,456 | 47 + 22 | 1 / 9 pairs | — |
| J | `J.B1.h2.s1/R104#1` | $435,551 / $27,882 | $289,823 / $32,566 | $284,613 / $254,243 / $33,240 | 25 + 22 | 511 / 550 | 23 / 48 (gate on) |
| S | `S.C24F1.h1.s1/R101#1` (frozen D1 = D's primary) | $540,641 / $26,288 | $353,171 / $34,703 | $355,669 / $327,862 / $34,452 | 48 + 21 | 652 / 747 | 18 / 18 |

The roles of every arm are listed in `FINAL_CANDIDATES.md`, and the parameter vectors of the primaries as well. The
selection p90 DD of D's primary ($35,592) is above $35,000. Q3 tests the confirmation family ($34,819), as frozen.

**Architecture comparisons (PROTOCOL §12; C24 development; in-sample).** B is G's primary.
- C: +$157,207 centre net, type P; replication not applicable.
- J: +$94,638, type P, replicated.
- S: +$199,729, type P, replicated.

All three are material improvements. S over J is material too (+$105,090, replicated); J over S is not. A single
historical comparison never proves an architecture superior (standard §3.4). §7 sets these comparisons beside the
folds and the validation.

## 5. Chronological evidence (`CHRONOLOGICAL_VALIDATION.md`)

| Arm | 2020–2021 | 2022–2023 | 2024 | Sequential net | Sequential DD | Verdict |
|---|---:|---:|---:|---:|---:|---|
| D — D1 | +$20,368 | −$7,376 | +$12,231 | $25,172 | $40,170 | unsupported |
| G — Growth | +$30,546 | $0 | +$12,401 | $42,947 | $36,079 | unsupported (by $1,079) |
| C — fixed pair | +$45,465 | −$11,309 | −$7,567 | $26,589 | $61,092 | unsupported |
| J — joint | +$82,512 | −$16,452 | +$33,520 | $99,581 | $67,635 | unsupported |
| S — D1-first | +$92,527 | −$25,876 | +$17,654 | $84,305 | $82,547 | unsupported |

- **Shrinkage.** In sample, the fold primaries earned $29,000–$90,000 per year of data. Out of sample they earned $5,000
  (D, C), $8,600 (G), $16,900 (S) and $19,900 (J) a year, and every sequential drawdown exceeded every training drawdown
  of the same arm.
- **The out-of-sample drawdowns are realized losses, not give-backs.** They come from single $100,000 lots:
  - D1 protective stops near −$24,400 (2020-03 and 2021-02). The C19 D1 primary's protective stop is 24.1 % of entry,
    near the top of Assignment 2's 3–25 % box.
  - Growth lots that ran to their maximum hold at about −$30,000 (J, 2020-02 and 2021-02).
  - Repeated −$18,500 to −$20,400 D1 stops in 2022 (S).

  The training lots' worst adverse excursions were −$7,500 to −$14,000.
- **Training neighbourhood robustness did not transfer.** In training, 0–11 % of confirmation draws breached $35,000.
  On the next slice, up to 256 of 256 did.
- Report-only: D-A (plain D1 family A) had no qualified candidate at C21 or C23. Every protected and unrestricted
  sub-population is unsupported. Unrestricted Growth's chains reach drawdowns of $85,703–$111,944, more than the slot
  itself, by giving back marked gains of lots that grew several-fold in 2020–2021. Only two descriptive role chains (G
  balanced, G lower-drawdown) pass the numeric test. They are not the frozen selector, so they are not promoted.

## 6. Validation 2025-01-02 → 2026-10-30 (once, after the frozen selection; retrospective)

One continuous run from 2016 per subject, on FULL, after `FROZEN_SELECTION.json` and the FULL authorization were
committed. Validation P&L is measured from the 2024-12-31 close, and the reset DD restarts there. Job `C24-validation`:
9,044 official GPU evaluations. The first TSLA FULL entry in the door log is this one.

| Arm | Validation P&L | Reset DD | Whole-run DD | V1 V2 V3 | Lots | Roles (P&L range) |
|---|---:|---:|---:|---|---|---|
| D | −$8,979 | $13,924 | $27,742 | ✗ ✓ ✓ | 2 D1 | −$6,544 to −$16,974, all ✗ ✓ ✓ |
| G | **+$10,703** | $18,255 | $28,655 | ✓ ✓ ✓ | 4 Growth | +$3,669 to +$9,050, all ✓ ✓ ✓ |
| C | **+$71** | $25,953 | $26,288 | ✓ ✓ ✓ | 2 D1 + 4 Growth | (the pair holds every role) |
| J | −$10,751 | $29,253 | $29,253 | ✗ ✓ ✓ | 3 D1 + 2 Growth | −$915 to −$25,035; the robust-profit role's whole-run DD is $42,923 (✗ ✓ ✗) |
| S | −$2,412 | $26,869 | $26,869 | ✗ ✓ ✓ | 2 D1 + 4 Growth | −$2,049 to −$19,940, all ✗ ✓ ✓ |

**Controls on the same period:**
- New L0 on TSLA: −$6,797 / reset DD $57,154.
- N/original: +$5,060 / $58,047 (both fail V2 and V3).
- The arm G projections did not trade.
- A fresh $100,000 TSLA purchase at the 2025-01-02 open: −$17,628 financed / +$2,443 unfinanced, DD $59,788 / $57,377.

**What happened.** Few trades. Every Growth vector caught one trend, 2025-09-12 → 10-03 (+$18,167 to +$18,674), then
took two initial stops in November and December 2025. D1 lost on 2–3 lots per primary. C's pair is exactly D's primary
plus G's balanced role, because the two never collided in the validation. C's +$71 becomes −$531 at 10 bps per side.
The validation drawdowns stayed below $35,000 because the C24 vectors' single-lot losses were small (worst lot
−$6,045 to −$8,575 per primary). On the folds they had been −$18,500 to −$31,800 under the wider stops then selected.
Details: `CHRONOLOGICAL_VALIDATION.md` §6–§7.

## 7. Architecture comparison (brief §7; one transparent table)

The same data, engine, instrument and selection rule for every arm. Every row is one $100,000 slot at 11 % interest
and 5 bps per side. Full tables with gross, interest, costs and the controls: `COMPARISON.md`.

| Arm | Development C24: net / DD | §12 vs G (C24) | Folds 2020–2024: sequential net / DD | Verdict | Validation: P&L / reset DD | Outcome |
|---|---:|---|---:|---|---:|---|
| D — D1 | $319,654 / $25,587 | (standalone) | $25,172 / $40,170 | unsupported | −$8,979 / $13,924 | not a candidate |
| G — Growth | $340,913 / $28,655 | B (the better standalone) | $42,947 / $36,079 | unsupported (by $1,079) | +$10,703 / $18,255 | development-only |
| C — fixed pair | $498,120 / $26,288 | +$157,207, material (P) | $26,589 / $61,092 | unsupported | +$71 / $25,953 | development-only |
| J — joint | $435,551 / $27,882 | +$94,638, material (P, replicated) | $99,581 / $67,635 | unsupported | −$10,751 / $29,253 | not a candidate |
| S — D1-first | $540,641 / $26,288 | +$199,729, material (P, replicated) | $84,305 / $82,547 | unsupported | −$2,412 / $26,869 | not a candidate |
| New L0 on TSLA (D1 book) | $118,509 / $97,606 | fails Q2 Q3 Q5 | slices +$66,044, +$24,725, −$1,315 | fixed vector | −$6,797 / $57,154 | control |
| N/original on TSLA (D1 book) | $101,986 / $98,507 | fails Q2 Q3 Q5 | slices +$83,032, −$657, +$799 | fixed vector | +$5,060 / $58,047 | control |
| Fresh $100k TSLA buy-and-hold, financed | — | — | slices +$1,122,590, −$56,931, +$50,354 | — | −$17,628 / $59,788 | control |

**Reading.** The architecture ranking in development is S > C > J > G > D. On the folds, ranked by sequential
drawdown, it is G < D < C < J < S, and no arm meets the limit. In the validation it is G > C > S > D > J. The shared-slot
in-sample advantage comes from the slot's idle time and the allocator's chronology (§12; `ROBUSTNESS_AND_RISK.md` §7).
It did not repeat on later data.

## 8. Risk (`ROBUSTNESS_AND_RISK.md`)

- **Give-back versus principal loss.** In development the drawdowns ($25,587–$28,655) are mostly give-back. The worst
  single-lot principal loss is $6,171–$11,197. G's, C's, J's and S's development drawdown is the same **profitable**
  Growth lot: entered 2020-01-23, marked +$71,179, exited +$45,500. The ledger reconstruction matches the sealed DD to
  the cent. Out of sample the drawdowns were realized losses on single lots (−$18,500 to −$31,800 on the folds).
- **Banked-capital DD** (development): $12,664 (J) to $16,246 (D, C, S); over 2016–2026, $14,157 (G) to $21,695 (J).
- **Neighbourhoods** (development).
  - D's centre is 2.2 × its confirmation median ($148,203), a sharp optimum. The others are 1.3–1.4 ×.
  - The p95 DD is above $35,000 for D, G and S, and every worst draw is above it.
  - The wide (1.5×) family breaches in 10–27 % of draws, the small (0.5×) family in 0–0.8 %.
- **Costs and fills.** 20 bps per side costs 3.0–3.5 % of development net. D1 depends on intraday stop fills: stops at
  the next open cut D's development net by 23 %. C's validation profit turns negative at 10 bps.
- **Gaps through stops.** TSLA has opened 9–11 % below a 5.8–7.1 % stop (2015-08-24, 2020-03-09), so a lot can lose
  about 16 % of the slot under the C24 stops. Under C19's 24.1 % stop it lost −$24,400, twice. A stop is not a loss cap.
- **Margin (illustrative; full financing; maintenance m of market value).** Cash needed at the worst mark: $29,641–$33,398
  at m = 25 %, up to $55,599 at m = 50 %.
- **Occupancy and displacement.**
  - Occupancy: D 16.6 %, G 12.1 %, J 17.5 %, C 24.5 %, S 26.3 % of sessions.
  - In development, C and S lose $133,117 and $97,734 to slot displacement. J's books never collide.
  - No combined primary exceeds the sum of the two standalone primaries ($660,567).

Full tables: `ROBUSTNESS_AND_RISK.md`.

## 9. Controls

| Control | Development 2016–2024 | 2020–2021 | 2022–2023 | 2024 | Validation 2025–2026 |
|---|---:|---:|---:|---:|---:|
| TSLA buy-and-hold from 2016, financed 11 % (continuous; not exposure-comparable) | +$2,423,939 / DD $2,041,223 | — | — | — | −$44,889 |
| The same, unfinanced | +$2,522,908 / $2,028,324 | — | — | — | −$24,758 |
| Fresh $100,000 per period, financed | — | +$1,122,590 / $424,438 | −$56,931 / $89,499 | +$50,354 / $48,064 | −$17,628 / $59,788 |
| Fresh $100,000 per period, unfinanced | — | +$1,144,560 / $423,263 | −$35,082 / $78,439 | +$61,324 / $44,719 | +$2,443 / $57,377 |
| New L0 on TSLA (VGT D1 book, unchanged) | $118,509 / $97,606 | +$66,044 | +$24,725 | −$1,315 | −$6,797 |
| N/original on TSLA (same) | $101,986 / $98,507 | +$83,032 | −$657 | +$799 | +$5,060 |
| Their VGT Growth books on TSLA (arm G) | −$5,531, −$5,669 (one 2016–2019 lot each) | 0 | 0 | 0 | 0 |

The fresh-purchase rows are the exposure-comparable ones: one $100,000 position per period. Buy-and-hold beat every
strategy over 2020–2021 by an order of magnitude. Over 2022–2023 (−$56,931) and the validation (−$17,628, financed) it
lost money, with drawdowns of $89,499 and $59,788 on the position. The external controls' TSLA projections fail the
drawdown gates at every cutoff. They are descriptive only, chosen on VGT/GDX.

## 10. Search effort and convergence (`SEARCH_AND_CONVERGENCE_REPORT.md`)

- **Search lanes:** 2,560 over C19–C24, requesting **41,858,535** official evaluations (34.9 % of the 120 M hard ceiling)
  in 8.67 h of GPU wall time. Shares: J 38.8 %, S 36.0 %, G 13.9 %, D 11.2 %. S's lanes plus D's (19.78 M) exceed J's
  (16.25 M).
- **Stopping:** every lane stopped on its triggers except one coverage-limited lane. No lane reached the 16-island cap,
  so the budget-bound share is 0 %. 20 lanes (0.8 %) ran beyond NL0's own cap on a performance component, at most 9
  islands. The replicate rounds stopped on their trigger.
- **Label:** every arm at every cutoff is "converged by the frozen rules" (H4 holds).
- **Seed dependence is material:** the median relative range of a cell's best fit across seeds is 10–66 %, widest
  in J.

## 11. GPU parity and acceptance (`GPU_PARITY_AND_ACCEPTANCE.md`)

Accepted evaluator `bb0e3fcf…` (binary `cb2ff30b…`, RTX 5090 `GPU-ae5f222c…`), unchanged by this study. Gates E1–E9
pass.
- **82 official jobs**, each attested: 1,312 checks, 0 failed. Live parity mini-sets: **1,476 / 1,476 identical**.
- **44,161,845 evaluations**, all GPU-returned: **0 CPU-scored, 0 failed**. There were 15 capacity retries, all on the
  GPU.
- Kernel 6.73 h, job wall 9.57 h. Maglev disabled everywhere.
- Strategy Lab and the GPU backend are unchanged on this branch (`git diff` against the base: 0 lines in `apps/`,
  `src/gpu-backend/`, `config/gpu-backend/`).

## 12. Wins from a change of basis or coverage (brief §7)

- **Combined arms.** J's and S's higher in-sample nets come partly from the shared-slot chronology, not only from better
  parameters. At C21 and C23 J's D1 component earned more in sample ($380,777; $332,204) than anything arm D found alone
  ($297,254; $235,330) from the same D1 box. S at C21 and C23 paired Growth with arm D's balanced-role D1, not its
  primary.
  At C24 (`ROBUSTNESS_AND_RISK.md` §7):
  - C's pair loses $133,117 to displacement against its two parts alone, and S loses $97,734.
  - J's books never collide, but each earns much less alone than the standalone primary.
  - The combined nets are higher because the slot is used 24.5–26.3 % of sessions (C, S) instead of 12.1–16.6 % (G, D).
    No combined primary exceeds the sum of the two standalone primaries.
- **Unrestricted Growth.** G-U's, J-U's and S-U's large 2020–2021 slice gains come from holding TSLA through a tenfold rise
  with no exit protection. That is exposure to one episode, not a better rule; their drawdowns exceed the slot.
- **Controls.** The external controls are VGT phenotypes projected onto TSLA. On the arm G projection they hardly trade
  TSLA (−$5,531 over 2016–2024, no trade after 2019), so a comparison with them says nothing about Growth on TSLA.
- **Buy-and-hold.** A continuous 2016 holding grows to many times $100,000. Only the fresh $100,000 purchases (§9) are
  exposure-comparable with the strategies.

## 13. Disclosures

- **Code amendment A1 (after the freeze).** At 13:58Z, C19-S-refine stopped before any job or evaluation: the arm S
  refinement-lane builder did not register the sealed frozen D1 finalists. A three-line fix was sealed (`AMENDMENTS.md`
  A1; `results/amendments/A1.json`; allowed code digest `418a8758…` → `fb7e6ddc…`). No rule or result changed, and the
  chain resumed with the same command.
- **Real-data exposure before the freeze** (PROTOCOL §2):
  - the data audit, with no 2025–2026 returns;
  - a development-only suitability analysis;
  - the engineering gates, which read D19–D24 for equality counts and hashes;
  - the pilot on D21, for counts, timings and stop reasons.

  No box, threshold, budget, cell or rule was derived from a TSLA profit or drawdown. The FULL entries in the door log
  before the validation are gate E3's reproductions of New L0 / N/original on their own VGT/GDX data.
- **Report-only tool changes after the freeze** (`DECISION_REGISTER.md` §F):
  - R1: the exposure-table fix for carried lots with partial exits.
  - R2: the fresh-purchase buy-and-hold control.
  - R3: the job and search aggregations.
  - R4: the outcome join by id.
  - R5: the slot-key display.

  None of them is a selection input or an evaluation.
- The external controls were chosen on VGT/GDX with 2016–2026 in view (PROTOCOL §4). They are descriptive only.
- Playwright e2e timing races in Strategy Lab's test code are reported beside gate E8 (`AMENDMENTS.md` E1). Strategy Lab
  itself is unchanged.
- **The sealed outcome's validation join is empty** (`AMENDMENTS.md` D1, found after the outcome). `outcome.ts` joins
  the validation rows to the finalists by a label that `preDetermination` had replaced. The sealed `outcome.json`
  therefore shows `validation: null` and an empty development-only list. The candidate list is unaffected. By finalist
  id, the frozen rule lists G's and C's primaries as development-qualified without chronological support
  (`tools/tsla-d1-growth/outcome-join.py`; decision register R4). No sealed record was rewritten.
- Engine slot keys: the books are named `D1:VGT` / `G:VGT` inside the engine and the sealed records, because the
  accepted engine's VGT slot carries TSLA (PROTOCOL AD1). The reports show them as D1·TSLA / Growth·TSLA (R5).
- The pre-2016 tail stress uses an independent Yahoo Finance daily series (2010-06-29 → 2015-12-31, split-adjusted),
  disjoint from every door. It is not redistributed.

## 14. What this study does not show

- It is not a forecast or a deployment test. Every period is historical, and the 2020–2026 episodes were examined
  broadly before this study.
- The $35,000 ceiling is a research criterion on historical marked paths. It is **never an enforceable loss limit**:
  stops fill at the gapped open, and single lots lost $24,000–$32,000 out of sample.
- "Converged by the frozen rules" describes the stopping rules. Seeds found materially different optima in the same cell
  (`SEARCH_AND_CONVERGENCE_REPORT.md` §D), so better in-sample vectors may exist, and on this evidence they would most
  likely shrink out of sample as these did.
- TSLA was not combined with MSFT, VGT, GDX or the user's portfolio (brief §7).

## 15. Decisions for the user

From `DECISION_REGISTER.md` §U. None of them is needed to read this study's results.

- **U5.** G's and C's C24 primaries are development-qualified without chronological support. Adopting either would need
  your explicit decision. **The study's recommendation is no action**: three fold failures outweigh one retrospective
  22-month pass (G: one trend lot net of two stops; C: +$71).
- **U3.** Whether TSLA D1/Growth deserves a *new* study with a different, precommitted question. The folds show the
  binding failure is single-lot loss size (stop and hold domains), for example a domain that bounds it before the
  search. Nothing here is retuned.
- **U4.** Whether to start the MSFT study. It was not started.
- **U6.** Whether to fix the `outcome.ts` join for future use. A fix would never rewrite the sealed outcome.
- **U7.** Keep or retire this study's 82 compressed job archives (12.33 GB). Keeping them is recommended.
- **U1, U2** (from the start of the study). The 20.97 GB of other Priority 5 removal candidates, and whether to register
  TSLA's splits in the central ledger.
