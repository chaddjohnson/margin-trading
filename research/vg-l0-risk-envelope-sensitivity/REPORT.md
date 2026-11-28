# Stage A risk-envelope sensitivity audit (RES-A 1.0.0) — report

Retrospective, exploratory and read-only. Nothing here runs a new search, proposes a new phenotype, tunes a parameter,
changes a trading rule, adopts a candidate, changes the optimization standard or NL0 1.0.0, or authorizes Stage B. The
original NL0 method (**P0**: marked DD ≤ 35 % of C0 = $35,000) remains the authoritative reference. The 30 % and 35 %
banked-capital levels were proposed **after** the pilot's outcome was known, so this audit is not prospective
validation. Every figure comes from `results/analysis-C2x.json` (generated tables: `results/TABLES.md`); dollars are
rounded for display, every decision compared unrounded record values.

## 0. Executive summary

- **What was analysed.** The pilot's *complete* search populations, not its finalists: every centre either arm
  evaluated at C21 and C24 (11,462 and 13,899 unique configurations; 9,644 and 11,243 profitable, funded and with a
  complete risk record), every measured search-stage neighbourhood (6,837 and 5,512), the 26 qualification members per
  cutoff with all 384 confirmation draws, plus a CPU confirmation gap fill for the 40 non-shortlisted rung-3 fits per
  cutoff. All of it was rebuilt from copies of the pilot's own archives with **zero evaluations**; the reconstruction
  reproduced every sealed pilot result exactly (232 checks, 0 failures: lanes, census, qualification verdicts,
  selections).
- **25 % BD was restrictive — at C24.** On the 24 shortlisted members common to both arms, the 25 % banked gate removes
  the control's two best C24 members ($218,842 and $205,661) and lowers the best qualified member from $218,842 to
  $197,012 (−$21,830). At C21 it removes one control member ($188,316) and changes nothing at the top ($216,732).
- **30 % BD gets back exactly what the control had; 35 % adds nothing.** Under P3 (40 / 25 / 30) and P4 (40 / 25 / 35)
  the best qualified member equals P0's at both cutoffs ($216,732; $218,842). P3 restores all four members that 25 %
  removed. No member's verdict differs between P3 and P4 (or between the BD-only ablations P7 and P8).
- **No relaxation finds anything better than the control.** At every level — centre, search-stage neighbourhood,
  qualification, and the 64-configuration extended rung-3 set — the most profitable eligible candidate under P1, P3 or
  P4 is the same one P0 already selects. The 40 % marked-DD relaxation admits about 1,200 more centres per cutoff (17 %
  and 20 % more), but none more profitable than P0's best eligible candidate at the same stage.
- **PL and BD.** In this one-slot portfolio banked DD ≥ trade principal loss by construction, so the 25 % PL gate is
  fully redundant under BD 25 % (P2 ≡ P6 at every level). With BD at 30 % or 35 %, PL starts to bind on its own (88 / 67
  centres at BD 30 %; 141 / 87 at BD 35 %), but never at rung 3 and never for a qualification member.
- **The pilot's shortfall.** C21 (Δ −$4,456) is **entirely search path**: the constraint changes nothing on either
  arm's vectors. At C24 (Δ −$21,830), the 25 % gate removing the control's best accounts for −$29,499 on the control's
  vectors, partly offset (+$7,669) by EXP's better search path at P2. Measured in the other order, it is all search path
  (−$21,830) and the gate costs EXP's own vectors nothing.
- **Recommendation.** Keep P0. If the envelope is pursued at all, use **30 % BD, not 25 %**, and test it only as a
  replicated **non-inferiority** study of P3 against P0 (`STAGE_B_OPTION.md`: about 1.15 M requested evaluations and
  about 2.1 measured GPU-hours, **not run**). The evidence does not justify a Stage B as a search for higher profit, and
  pausing risk-envelope work to return to staged trailing stops is a defensible default (§9).

## 1. Scope, authority and what the audit can show

| Item | Value |
|---|---|
| Authority | `brief/BRIEF.md` (sha256 `5a99e0e0…80ecc43`, read in full) |
| Predeclaration | `POLICY_MATRIX.md` (`345896881e45a55d…`), `PROTOCOL.md` (`f22f20e1619dd388…`), committed and pushed at `93bc76a3` **before any comparative result**; clarification N2 recorded before the comparison |
| Standard | 3.0.0 (`4e8244e6…`), scope **diagnostic**, `evaluationBackend: non-official-cpu / diagnostic`; preflight PASS |
| Subject | the completed pilot NL0-REP 1.0.0 (`research/vg-l0-risk-envelope-pilot/`, outcome **worse** by its frozen rule — unchanged here) |
| Lineage | branch `research/vg-l0-risk-envelope-sensitivity` from the pilot's final commit `7f69d0d2`; `main` untouched |
| Policies | P0–P8 (`POLICY_MATRIX.md`): P0 control 35 %; P1 40 % only; P2 the pilot's 40 / 25 / 25; P3 40 / 25 / **30**; P4 40 / 25 / **35**; ablations P5 (PL only), P6–P8 (BD 25 / 30 / 35 % only). PL and BD on the liquidation basis; marked twins reported |

**What can be known.** Requalifying archived candidates shows **eligibility changes on vectors the CTRL or EXP search
happened to propose**. It cannot show which regions a search run under P1, P3 or P4 would have explored, or what such a
search would select. It also says nothing about future losses: the limits are eligibility constraints on historical
paths, never stops.

## 2. Method in brief (details: `METHOD_AND_CHECKS.md`)

1. **Population replay (zero evaluations).** Both arms' lanes were replayed with the pilot's frozen lane code over
   *copies* of the official search archives (sha256-verified, integrity-checked; originals never opened), with a pool
   that refuses any evaluation. The replayed lane results equal the sealed ones. Every centre request and every
   `fitMany` call was captured, and every measured rung neighbourhood was regenerated exactly (common random numbers)
   and read back.
2. **Qualification replay (zero evaluations).** The pilot's `qualifyMembers` was re-run over the qualification-archive
   copy: its evidence equals the sealed evidence, and all 384 confirmation draws per member were read back.
3. **Policy substitution only.** Each policy's verdicts come from the pilot's own functions with the policy substituted:
   `plausibleArm` (centre), `violationArm` (search stage, with NL0's 1e-6 violation rounding), `verdictOf` (Q1–Q6),
   and Assignment 2's frozen `originalOrder` / `ra1Order` (selectors). Q1, Q4, Q6, the stresses, the instrument and the
   selectors are unchanged. P0 uses CTRL's cent-rounded p90 DD; P1–P8 use EXP's unrounded p90s. Both forms were
   computed for every member and never disagree (0 cases).
4. **Bounded CPU replays** (predeclared; non-official, `diagnostic`). G1 fills the confirmation gap for the 40
   non-shortlisted rung-3 fits / endpoints per cutoff (30,880 CPU evaluations). G2 attributes the drawdowns of the
   1,534 / 1,704 centres whose verdict changes across policies (D3 account partition). G3 is a parity sample (512
   draws). **Every CPU record equals the archived official GPU record bit for bit** (3,830 centres and draws).

## 3. Population coverage (`POPULATION_AND_PROVENANCE.md`)

| | C21 | C24 |
|---|---:|---:|
| Archive rows (unique evaluations, both arms) | 132,290 | 113,533 |
| Unique centres (CTRL / EXP / both) | 11,462 (6,890 / 6,620 / 2,048) | 13,899 (8,255 / 7,694 / 2,050) |
| **Scope: profitable, funded, complete risk record** | **9,644** | **11,243** |
| Scope by highest stage: screen / rung 1 / refinement move / rung 2 / rung 3 or endpoint / shortlist | 828 / 6,730 / 1,974 / 48 / 40 / 24 | 940 / 8,091 / 2,100 / 48 / 40 / 24 |
| Measured neighbourhoods r1 (16) / refinement (16) / r2 (64) / r3 (128) | 5,546 / 1,131 / 96 / 64 | 4,170 / 1,182 / 96 / 64 |
| Confirmation (384 draws): qualification members + G1 | 26 + 40 | 26 + 40 |

No centre lacks a valid envelope; no Assignment 3 archive had to be restored. Unique evaluated vectors,
repeated requests, centres, neighbour perturbations, measured fits, shortlist members and qualified finalists are
counted separately (TABLES §2). The pilot ZIP's 222 / 196 "diagnostic centres" are a subset of these populations.

## 4. Centre level (brief §4.1)

### 4.1 Eligibility of the same centres under each policy

| Policy | C21 pass (of 9,644) | max / top-10 mean net | C24 pass (of 11,243) | max / top-10 mean net |
|---|---:|---|---:|---|
| P0 35 % | 7,057 (73.2 %) | $229,867 / $212,432 | 6,142 (54.6 %) | $219,693 / $214,514 |
| P1 40 % | 8,254 (85.6 %) | $229,867 / $213,260 | 7,344 (65.3 %) | $219,693 / $214,514 |
| P2 40/25/25 | 7,488 (77.6 %) | $229,867 / $213,260 | 6,126 (54.5 %) | $219,693 / $214,514 |
| P3 40/25/30 | 7,929 (82.2 %) | $229,867 / $213,260 | 6,971 (62.0 %) | $219,693 / $214,514 |
| P4 40/25/35 | 8,090 (83.9 %) | $229,867 / $213,260 | 7,241 (64.4 %) | $219,693 / $214,514 |
| P5 40/PL25 | 8,113 | $229,867 | 7,257 | $219,693 |
| P6 40/BD25 | 7,488 | $229,867 | 6,126 | $219,693 |
| P7 40/BD30 | 8,017 | $229,867 | 7,038 | $219,693 |
| P8 40/BD35 | 8,231 | $229,867 | 7,328 | $219,693 |

The most profitable centres pass every policy. The relaxations change counts, not the top of the distribution. (The
$229,867 and $219,693 centres are rung-1 centres whose neighbourhoods fail; they never reach rung 3.)

Overlap with the references (alternative-only / reference-only, scope): versus P0 — P1 +1,197 / 0 (C21) and +1,202 / 0
(C24); P2 +768 / −337 and +486 / −502; P3 +930 / −58 and +874 / −45; P4 +1,059 / −26 and +1,117 / −18. Versus P2 —
P3 +441 and +845, P4 +602 and +1,115 (P2 excludes nothing that P3 or P4 admits). Full matrices: TABLES §4.

### 4.2 What moves when the limits move (TABLES §7)

| Set (scope) | C21 centres | best net | C24 centres | best net |
|---|---:|---:|---:|---:|
| admitted by DD 40 % alone (P1 ∧ ¬P0) | 1,197 | $213,642 | 1,202 | $200,209 |
| excluded from P1 by BD > 25 % | 766 | $188,368 | 1,218 | $206,492 |
| excluded from P1 by BD > 30 % | 237 | $164,813 | 306 | $178,528 |
| excluded from P1 by BD > 35 % | 23 | $140,704 | 16 | $113,011 |
| excluded from P1 by PL > 25 % | 141 | $188,368 | 87 | $206,492 |
| rescued by BD 30 % (P3 ∧ ¬P2) | 441 | $170,095 | 845 | $204,974 |
| rescued by BD 35 % over 30 % (P4 ∧ ¬P3) | 161 | $164,813 | 270 | $178,528 |
| P0-eligible centres P3 excludes | 58 | $188,368 | 45 | $206,492 |

The best centres admitted by DD 40 % alone ($213,642; $200,209) are rung-1 centres. Almost every centre that changes
verdict sits at rung 1 or below: of the 1,197 / 1,202 newly admitted by P1, 11 / 2 reached rung 2 or beyond. The 25 %
banked gate excludes 766 / 1,218 of P1's centres; at 30 % that falls to 237 / 306 and at 35 % to 23 / 16.

**Giveback attribution (G2, D3 marked account partition; giveback-dominated = unbanked giveback U ≥ ½ DD):**

| Set | C21 giveback-dominated | C21 mean U / E / F | C24 giveback-dominated | C24 mean U / E / F |
|---|---:|---|---:|---|
| admitted by DD 40 % alone | 188 of 1,197 | 37 % / 47 % / 16 % | 116 of 1,202 | 32 % / 58 % / 10 % |
| excluded from P1 by BD > 25 % | 18 of 766 | 20 % / 36 % / 44 % | 20 of 1,218 | 22 % / 63 % / 16 % |
| rescued by BD 30 % | 16 of 441 | 23 % / 34 % / 43 % | 14 of 845 | 23 % / 63 % / 14 % |
| rescued by BD 35 % over 30 % | 1 of 161 | 14 % / 22 % / 64 % | 4 of 270 | 17 % / 67 % / 16 % |

(U = unbanked-profit giveback, E = banked-profit erosion, F = loss below starting capital; shares of the summed DD.)
The DD-40 % admissions are mixed: about a sixth (C21) and a tenth (C24) are giveback-dominated, and most of the rest is
erosion of banked profit. The banked gate does what it was designed to do: what it excludes is mostly banked erosion
and loss of starting capital, not giveback. What BD 35 % adds over 30 % is mainly starting-capital loss at C21
(F 64 %) and banked erosion at C24 (E 67 %).

### 4.3 Failure reasons and the binding metric (TABLES §6)

- **P2:** among failing centres the binding metric (largest dollar excess) is BD for 1,349 (C21) / 3,445 (C24), DD for
  653 / 1,498, and PL for 154 / 174. The PL labels are ties: PL = BD under equal limits, broken towards PL by the
  predeclared order. Near misses: 295 / 514 BD failures are within $2,500 of $25,000.
- **P3:** BD binds for 550 / 1,488 failing centres (127 / 213 within $2,500 of $30,000), DD for 952 / 2,488 and PL for
  213 / 296.
- **Combinations under P2:** "DD + BD" is the largest failing class (834 / 2,966), then "BD only" (625 / 1,131), "DD + PL
  + BD" (311 / 705), "DD only" (245 / 228) and "PL + BD" (141 / 87). **"PL only" never occurs under P2.**

### 4.4 Are PL and BD redundant?

- **Structural identity.** With one fixed slot and no capital flows, a lot's loss below its entry principal is also a
  fall of the account below the banked high at its entry (H ≥ the realized level when the slot is free), so **BD ≥ PL**
  on both bases. In the data, PL never exceeds BD by more than 1.5 × 10⁻¹¹ (floating-point noise) in any of the
  20,887 scope centres.
- Hence **P6 ≡ P2 exactly**: 0 disagreements at C21 and C24 among centres, rung rows (r1, refinement, r2, r3) and
  qualification members. **The 25 % PL gate added nothing to the pilot's envelope.**
- **At BD 30 % / 35 % PL binds on its own.** P3 vs P7: 88 / 67 centres (56 / 20 rung-1 rows, 2 / 0 rung-2 rows, 0 rung-3
  rows, 0 members). P4 vs P8: 141 / 87 centres. Their best nets ($188,368 C21; $206,492 C24) are rung-1 centres whose
  worst trade lost $25,044 — a recurring single-trade loss just over the 25 % line. PL is therefore an independent
  but low-impact constraint here: a risk preference that caps one trade's loss of principal, with no effect on the best
  qualified outcome.

### 4.5 Other properties (TABLES §16)

- **Ordering of BD and DD.** The record stores DD to the cent; the envelope is full binary64. Beyond the half-cent
  resolution, **marked BD never exceeds marked DD** in these populations: 0 cases, with or without partial sales.
  Marked BD equals marked DD to the cent in 15 / 4 centres. Liquidation BD exceeds marked DD in 21 / 5 centres, because
  of the exit cost. No ordering was assumed or forced.
- **Basis.** The liquidation basis is the stricter one. On the marked basis P2 would admit 9 (C21) / 16 (C24) more
  centres, P3 2 / 2, P4 0 / 1; there are no disagreements in the other direction.
- **Boundary.** No centre lies exactly on any policy limit, so the "equal passes" rule decided nothing.
- **Growth boundedness.** Bounded / open-ended Growth centres passing P0 → P3: C21 5,161 → 5,562 bounded and 1,896 →
  2,367 open-ended. C24 5,490 → 6,234 and 652 → 737. At C21 the net additions are disproportionately open-ended (+471
  of +872, against a 28 % open-ended share of the scope); at C24 they are not (+85 of +829, against 13 %). All three
  P0-rule picks of §8 have bounded Growth (pilot §4).

## 5. Search-stage neighbourhoods (TABLES §9)

Feasibility uses the search's own rule: centre gates, the neighbourhood p90 of every gated metric, net and structure,
over the recorded 16 / 64 / 128 draws.

| Rung (draws) | C21 P0 / P2 / P3 / P4 feasible (best net) | C24 P0 / P2 / P3 / P4 feasible (best net) |
|---|---|---|
| r2 (64), 96 fits | 73 / 86 / 92 / 92 ($207,700 for all) | 77 / 69 / 90 / 93 ($206,986; P2 $189,343) |
| **r3 (128), 64 fits** | 48 / 60 / 63 / 63 (**$216,732 for all**) | 56 / 51 / 62 / 64 (**$218,842; P2 $197,012**) |

- At rung 3 — the fidelity whose feasibility the shortlists use — **the best feasible centre is identical under P0,
  P1, P3 and P4 at both cutoffs.** Under P2 / P6 it drops at C24, because the control's best has a rung-3 p90 BD of
  $27,817.
- The 64 rung-3 configurations include the best centre net reached at rung 3 by either arm ($216,732; $218,842). No
  rung-3 configuration of either arm is more profitable than P0's eligible best (rubric item 4 fails).
- **Unmeasured gap.** Rung 1 is centre-first, so a centre that neither arm found plausible has no measured
  neighbourhood. The relaxed policies admit such centres at rung 1: P3 353 / 719, P4 459 / 971, P1 583 / 1,061. Their
  best nets ($172,715 at C21; $204,974–$206,492 at C24) are below P0's rung-3 best. They are counted, never filled.

## 6. Qualification and robustness (brief §4.2)

### 6.1 The common population (24 shortlisted members; Q1–Q6 per policy)

| Policy | C21 qualified | C21 best qualified | C24 qualified | C24 best qualified |
|---|---:|---:|---:|---:|
| P0 | 20 / 24 | $216,732 | 21 / 24 | $218,842 |
| P1 | 23 / 24 | $216,732 | 24 / 24 | $218,842 |
| P2 | 22 / 24 | $216,732 | 21 / 24 | **$197,012** |
| P3 | 23 / 24 | $216,732 | 24 / 24 | $218,842 |
| P4 | 23 / 24 | $216,732 | 24 / 24 | $218,842 |
| P5 / P7 / P8 | 23 / 24 | $216,732 | 24 / 24 | $218,842 |
| P6 | 22 / 24 | $216,732 | 21 / 24 | $197,012 |

Centre pass (Q1, Q2, Q6): P0 21 / 24 at C21 (three EXP members have DD > $35k), 24 / 24 for every relaxed policy. Q5
(10 bps) never decided anything that Q2 did not. The two benchmarks (New L0, N/original) qualify under all nine policies
at both cutoffs. They stay descriptive.

### 6.2 Which members change verdict (TABLES §11)

| Change | C21 | C24 |
|---|---|---|
| P2 → P3 (BD 25 → 30 %) | `CTRL GA0.VA0/R1#1 profit` $188,316 (conf. p90 BD $25,690) | `CTRL GB0.VD1/R2#1 profit` $218,842 (p90 BD $26,313); `CTRL GA0.VA0/R1#1 profit` $205,661 ($28,462); `CTRL GA0.VA0/R1#3` $161,748 ($25,596) |
| P3 → P4 (BD 30 → 35 %) | none | none |
| P0 → P1 / P3 / P4 | `EXP GA0.VA0/R1#1` $202,274, `EXP GA0.VA0/R1#2` $169,804, `EXP GA0.VA0/R2#3` $186,760 (centre DD $35.7k–$38.3k) | `CTRL GA0.VA0/R1#1` $205,661 (conf. p90 DD $35,365), two EXP members $129,826 / $120,945 |
| PL failing alone under P2 / P3 / P4 | none | none |

Every member that BD 30 % rescues is a **control** member, and every one has a confirmation p90 BD between $25,000 and
$30,000. None needs 35 %.

### 6.3 Neighbourhood risk of the members that decide the comparison (384 confirmation draws; TABLES §12)

| Member | conf. p90 / p95 / worst BD (liq) | draws BD > 25k (Wilson 95 %) · mean excess | draws BD > 30k · mean excess | p90 / worst DD | draws DD > 35k |
|---|---|---|---|---|---|
| C24 CTRL GB0.VD1/R2#1 ($218,842) | $26,313 / $31,083 / $45,152 | 54 (10.9–17.9 %) · $5,096 | 23 (4.0–8.8 %) · $4,815 | $32,123 / $51,462 | 27 |
| C24 CTRL GA0.VA0/R1#1 ($205,661) | $28,462 / $33,784 / $55,048 | 59 (12.1–19.3 %) · $7,667 | 31 (5.8–11.2 %) · $7,369 | $35,365 / $59,179 | 42 |
| C21 CTRL GA0.VA0/R1#1 ($188,316) | $25,690 / $28,768 / $37,121 | 45 (8.9–15.3 %) · $3,598 | 13 (2.0–5.7 %) · $1,835 | $34,777 / $46,656 | 38 |
| C24 EXP GA0.VA0/R1#1 ($197,012, P2's best) | $19,615 / $25,169 / $33,018 | 20 (3.4–7.9 %) · $3,171 | 3 · $2,231 | $27,194 / $42,045 | 14 |
| C21 EXP GA0.VA0/R1#1 ($202,274, DD-40 % admission) | $23,318 / $23,318 / $32,241 | 2 · $7,232 | 2 · $2,232 | $36,217 / $43,202 | 124 (27.8–37.1 %) |
| New L0 at C24 (benchmark) | $22,728 / $27,364 / $35,822 | 33 (6.2–11.8 %) · $3,344 | 5 · $2,495 | $30,658 / $42,791 | 15 |

A p90 gate allows up to 10 % of draws over the limit, and these members use that allowance. The members BD 30 %
rescues have BD past $30,000 in 3–8 % of their draws (Wilson upper bounds up to 11 %), with worst draws of $37k–$55k. The C21 member admitted by DD 40 %
breaches 35 % DD in a third of its draws. These are report-only facts (standard §5.5, §5.8): neither p90 nor breach
frequency alone makes one candidate safer than another.

### 6.4 The regression example (C24 control winner, `rc2-0d2a9a0a7f132779`)

| Quantity | Exact (unrounded) |
|---|---|
| Centre net / marked DD | $218,842.05 / $25,817.60 |
| Centre PL (liq / marked) | $12,752.32 / $12,708.30 |
| Centre BD (liq / marked) | $15,625.73 / $15,580.10 |
| Confirmation p90 DD (cents / unrounded) | $32,122.94 / $32,122.941 |
| **Confirmation p90 BD (liq / marked)** | **$26,312.71** / $26,265.79 |
| Confirmation p90 PL (liq) / p10 net | $16,794.42 / $104,778.43 |
| Rung-3 p90 BD (liq) | $27,817.09 (P2-infeasible at the shortlist stage too) |
| 10 bps: net / DD / BD liq | $186,512.07 / $26,415.21 / $15,911.47 |

It passes every policy at the centre. After full qualification it is **qualified under P0, P1, P3, P4, P5, P7 and P8**
and fails only P2 and P6 (Q3 p90 BD > $25,000). Its whole-run banked DD through 2026 was $26,725 (pilot record). This
one favourable case is **not** used to choose a threshold: §6.2 and §6.5 show every member and configuration that
changes verdict.

### 6.5 Extended descriptive set (G1: the 40 non-shortlisted rung-3 fits / endpoints per cutoff, CPU confirmation)

| Policy | C21 G1 qualified | combined 64: qualified / best | C24 G1 qualified | combined 64: qualified / best |
|---|---:|---|---:|---|
| P0 | 29 | 49 / $216,732 | 31 | 52 / $218,842 |
| P2 | 34 | 56 / $216,732 | 31 | 52 / **$197,012** |
| P3 | 38 | 61 / $216,732 | 38 | 62 / $218,842 |
| P4 | 38 | 61 / $216,732 | 40 | 64 / $218,842 |

- The best G1 configuration qualifies under P0 at both cutoffs ($207,700; $206,986) and stays below the shortlisted
  best.
- At C24 the 25 % gate also removes the second-best control candidate (`rc2-2a165bb5fc06225f`, $206,986, p90 BD $26,259).
- In the extended set, P4 qualifies two lower-profit configurations that P3 does not ($135,706 and $134,935; p90 BD
  $31.6k / $31.4k).
- G1 configurations are never selectable. Three C21 G1 configurations share a funded-lot ledger with a shortlisted
  member (for example `37b1e0e3…`, $188,316, the same ledger as `CTRL GA0.VA0/R1#1`); no C24 one does. The set is
  descriptive only.

## 7. Attribution of the pilot's result (brief §4.3)

Best qualified centre net by the NL0 P0 rule on fixed populations (TABLES §14):

| Effect | C21 | C24 |
|---|---:|---:|
| Pilot Δ = EXP population @ P2 − CTRL population @ P0 | −$4,456 | −$21,830 |
| Order A — constraint on CTRL's vectors (CTRL @ P2 − CTRL @ P0) | $0 | −$29,499 |
| Order A — search path at P2 (EXP @ P2 − CTRL @ P2) | −$4,456 | +$7,669 |
| Order B — search path at P0 (EXP @ P0 − CTRL @ P0) | −$4,456 | −$21,830 |
| Order B — constraint on EXP's vectors (EXP @ P2 − EXP @ P0) | $0 | $0 |
| Common population (matched candidates): P0 / P2 / P3 / P4 | $216,732 for all | $218,842 / $197,012 / $218,842 / $218,842 |

- **Constraint effect** (same vectors): zero at C21. At C24 it is −$21,830 on the common population under P2 and $0 under
  P3 / P4.
- **Search-path effect** (same policy, different vectors): at C21 the control's lanes found a better qualified phenotype
  under every policy (−$4,456 for EXP). At C24, under any policy that keeps the control's winner, EXP's lanes are
  −$21,830 behind. Under P2 they are +$7,669 ahead, because P2 removes the control's two best.
- **Selection effect** (same population and policy): RA1-original picks a different phenotype from the P0 rule
  (C21: $209,269 vs $216,732; C24: $197,012 vs $218,842 on the common population). The exception is P2 / P6 at C24,
  where both pick $197,012. RA1's own pick does not change across policies.
- So the 25 % gate explains **part** of the pilot's result — the C24 exclusion — and nothing at C21. A matched-candidate
  counterfactual shows that BD 30 % would have kept the control's C24 winner. It does **not** show that an optimizer
  running BD 30 % would have found it: EXP's search, even with that gate, settled elsewhere.

## 8. Counterfactual selectors and chronology (brief §5; retrospective, previously inspected)

On the common population, the NL0 P0 rule and RA1-original (frozen; labelled *counterfactual selectors*) pick:

| Cutoff | Policies | P0-rule pick | centre net / DD | next interval (sealed pilot record) |
|---|---|---|---|---|
| C21 | all nine | `CTRL GB0.VD1/R1#1 profit` | $216,732 / $30,150 | 2022–2023: −$27,810, DD $45,820 |
| C24 | P0, P1, P3–P5, P7, P8 | `CTRL GB0.VD1/R2#1 profit` | $218,842 / $25,818 | 2025–2026: +$16,049, DD $23,563 |
| C24 | P2, P6 | `EXP GA0.VA0/R1#1 profit` | $197,012 / $17,281 | 2025–2026: +$58,652, DD $16,832 |
| C21 / C24 | all nine (RA1-original) | `EXP GB0.VD1/R2#1` / `EXP GA0.VA0/R1#1` | $209,269 / $197,012 | −$37,039 (DD $60,375) / +$58,652 |

Every counterfactual pick is one of the pilot's own sealed primaries, so no interval had to be (or was) evaluated, and
no `not evaluated` case arose. On the previously inspected 2025–2026 interval, the phenotype P2 picks (+$58,652) did
better than the one P0, P3 and P4 pick (+$16,049). That interval information is **not** used to choose a threshold. It
is one correlated pair on inspected history, and it cuts against the profit-based reading of §6. Every searched pick
remains far below the informed benchmarks (New L0 / N/original +$87k–$97k per interval).

Trade / risk characteristics of the P0-rule picks (sealed evidence; `analysis-C2x.json` `selectors`):

| Pick | Funded lots | Capital occupancy | Largest episode ÷ centre net |
|---|---:|---:|---:|
| C21, every policy (`CTRL GB0.VD1/R1#1`) | 13 | 91.5 % | 84 % |
| C24, P0 / P1 / P3 / P4 (`CTRL GB0.VD1/R2#1`) | 50 | 65.6 % | 39 % |
| C24, P2 / P6 (`EXP GA0.VA0/R1#1`) | 25 | 22.6 % | 49 % |

The C21 pick depends heavily on one episode (84 % of its net). The C24 pick that P3 restores is the most diversified of
the three.

## 9. Answers to the brief's decision questions (§7) and the Stage B decision

1. **Is 25 % BD excessively restrictive, and do 30 % / 35 % increase qualified quality, not just counts?** On these
   candidates 25 % is restrictive at C24: it costs $21,830 of best qualified centre net, and $29,499 on the control's
   own vectors. 30 % removes that cost entirely, and 35 % adds nothing over 30 %. Neither raises quality **above P0's**:
   they restore P0's outcome. Counts rise (P3 qualifies 23 / 24 and 24 / 24 vs P0's 20 and 21), but the added members
   are DD-heavy and less robust (§6.3).
2. **Are PL and BD redundant?** Under BD 25 %, yes, completely (P6 ≡ P2; BD ≥ PL by construction). At BD 30 % / 35 %, PL
   binds alone for 0.6–1.5 % of scope centres, never at rung 3 or qualification. Keeping it is a risk preference, not a profit
   question.
3. **Does 40 % marked DD admit desirable, robust, high-profit candidates?** It admits about 1,200 more centres per
   cutoff and three more C21 members. None is more profitable than P0's best at the same stage. The best newly
   qualified one ($202,274) has a confirmation p10 of $78.6k and breaches 35 % DD in a third of its draws.
4. **How much of the pilot's result is gates versus search path / seeds?** C21: all search path. C24: the 25 % gate,
   seen on the control's vectors (−$29,499), partly offset by EXP's search path (+$7,669); in the other order, all
   search path. One seed pair per cell cannot separate seed noise from systematic path effects.
5. **The smallest defensible replicated set:** **P0 and P3**. P4 is indistinguishable from P3 here; P1 removes the
   principal protection; P2 is already measured and shown restrictive.
6. **Design, budget and safeguards:** in `STAGE_B_OPTION.md` — 2 arms × 2 cells × 2 cutoffs × 8 new paired replicates
   = 64 lanes, matched schedules and caps. About 1.15 M requested evaluations; **about 2.1 GPU-hours from the pilot's
   measured throughput** (84 s per lane at C21, 118 s at C24, four lanes at a time). Decision statistics, power and
   chronological safeguards are frozen before any search. Its power is limited: it can detect differences of about
   $10k, not $2.5k.
7. **Pause and return to staged trailing stops?** The rubric (PROTOCOL §6) proposes a Stage B because item 1 holds at
   C24, with its own qualifier: item 2 fails at both cutoffs, so BD 30 % removes the cost of BD 25 % without showing any
   gain over P0, and a Stage B would test only the search-path hypothesis. The pilot's own EXP lanes are evidence
   against that hypothesis, not for it. **Stage A therefore recommends: no further optimization for profit. Return to
   staged trailing-stop work as the default next step. Run the P0-vs-P3 non-inferiority Stage B only if the user wants
   the envelope's principal and banked-capital guarantees for their own sake.** "No further optimization justified" is
   a fully acceptable reading of this evidence.

**Stage B go / no-go: no-go by default; conditional go (P0 vs P3, non-inferiority) at the user's discretion.**

## 10. Alternative risk policies (brief §6; context only, no coefficient changed)

From the pilot's sealed CPU diagnostics (222 / 196 recorded centres):

- **Peak-equity DD ≤ 40 %** admits every recorded centre. Profitable paths raise peak equity, so it never binds here.
- **The capped hybrid 40 / 30 / 60** admits 222 / 194.
- **The profit-component view (D3)** shows the C21 primaries' training DDs as mostly unbanked giveback, and the
  2022–2023 interval DDs as mostly capital loss.

The banked gate is the only envelope component that discriminated. This audit's G2 attribution (§4.2) shows that it
mainly removes banked erosion and starting-capital loss, which is the behaviour it was meant to target. Nothing here
argues for re-opening those alternatives now. A separate, prospectively specified study is the only route if the user
wants them.

## 11. Limitations and evidence grades

| Statement | Grade |
|---|---|
| Eligibility counts, overlaps, transitions, PL ≤ BD identity, P6 ≡ P2 | **strong** (complete populations, exact reproduction) |
| Best qualified / stage-feasible candidates per policy on the fixed set | **strong for these candidates**; exploratory (thresholds chosen after the outcome) |
| Attribution of the pilot's Δ | **moderate**: exact arithmetic, but one seed pair per cell and order dependent |
| What a search under P3 / P4 would find | **not knowable from archives** (only Stage B) |
| Chronological behaviour | **weak**: two correlated, previously inspected intervals, and the pilot's sealed subjects only |

Further limits:

- One market history, two cutoffs, two cells.
- Rung 1 is centre-first, so its gap is unmeasured.
- G1 has no selection family, so RA1 was not computed for it.
- The 30 % / 35 % levels were proposed after the pilot's outcome; no threshold was tuned on these results.
- No account-level margin or tax modelling.

## 12. Repository status

- Branch `research/vg-l0-risk-envelope-sensitivity` (from `7f69d0d2`), never merged. `main` untouched.
- Files are added only under `research/vg-l0-risk-envelope-sensitivity/` and `tools/vg-l0-risk-envelope-sensitivity/`;
  nothing under `src/`, `config/`, `docs/`, `apps/` or the pilot's directory changed.
- **GPU acceptance:** `config/gpu-backend/acceptance.json` (`bb0e3fcf…`, Phase 7, ACCEPTED) is untouched. The audit
  changed no file of the evaluation manifest, the enforcement group or the job module, so **the acceptance remains valid
  on this lineage**. No GPU job ran; no official gate was opened.
- Doors opened: D21 and D24 only, for the CPU replays (`results/doors.jsonl`).
- Git-ignored state (kept for the review): the archive copies, CPU archives and intermediates in
  `.cache/vg-l0-risk-envelope-sensitivity/` (≈ 1.4 GB).
- Exact commands are in `METHOD_AND_CHECKS.md`; the checkpoint is `RESEARCH_RECOVERY.md`.
