# CENSUS_REPORT — Diagnostic A: the complete Stage B search-archive census (zero evaluations)

This is a post hoc, report-only supplement. It is never official Stage B search evidence, and it changes no sealed
Stage B result. Stage B's label (*P3 non-inferior and superior* on paired training profit at C21 / C24) and its
recommendation (do not adopt P3) stand unchanged.
- **Source tables:** `results/analysis/TABLES.md` §A1–§A9.
- **Records:** `results/census/census-C2x.json`, `centres-C2x.csv.gz`, `rungs-C2x.csv.gz` and
  `results/qualification/draws-C2x.json` (schemas in `DATA_SCHEMAS.md`).

## 1. Method

The method is the existing `census.ts` design (RES-B PROTOCOL §10), with Stage A's established capture (PROTOCOL.md §3).

**1. Copies.**
- Each cutoff's official search archive (4.39–5.24 GB) and qualification archive (0.56 GB) were copied into
  git-ignored scratch.
- Each copy's sha256 equals the original's committed baseline, and each passes `PRAGMA integrity_check` = `ok`.
- The originals were never opened by SQLite. All 12 Stage B job archives were re-hashed at the end: unchanged.

**2. Lane replay.** The 64 lanes of both arms were replayed with Stage B's own runner (`stages.ts runLanes`): one
barrier loop, the official plan, budget, lane cap and finishing reserve.
- The Lab was bound exactly like the official job, to the copy. A different code digest or backend is refused (tested).
- Its pool **refuses and counts every evaluation**.
- Every replayed lane equals its sealed lane. They are compared in the store's encoding; Stage B's untested original
  had two defects here, AMENDMENTS D1 / D2. The requested totals equal the sealed `requestedByArm`.

**3. Capture.**
- Every centre request (screen, rung 1, refinement, rung 2, rung 3 / endpoint) was captured with its arm, lane and
  stage, and de-duplicated by canonical identity (`cfgId`) with every source kept.
- Every measured rung neighbourhood was regenerated exactly (common random numbers, labels `[rung, cutoff]`) and read
  back. Each fitting arm got back its own search violation exactly.

**4. Both policies, applied with the frozen functions:**
- `plausibleArm` / `assessArm` at the centre;
- `violationArm` at the rung fits;
- Stage B's sealed Q1–Q6 verdicts for finalists. The qualification replay reproduces the sealed evidence and every
  pooled family statistic exactly.

**Three levels are kept apart throughout. A plausible centre is not a qualified finalist.**
1. *Centre plausibility:* the centre's own DD, PL and BD.
2. *Rung-fit feasibility:* the centre plus the measured neighbourhood's p90 gates.
3. *Finalist qualification:* Q1–Q6 on 384 confirmation draws, the 10 bps stress and the rest.

## 2. Coverage and zero-evaluation evidence (TABLES §A1, §A2)

| | C19 | C21 | C24 |
|---|---:|---:|---:|
| Archived evaluation rows (= the sealed fresh count of the search) | 1,120,604 | 1,142,375 | 948,677 |
| Lanes replayed = sealed | 64 / 64 | 64 / 64 | 64 / 64 |
| Requested, CTRL / EXP-30 (= sealed `requestedByArm`) | 571,767 / 596,373 | 602,894 / 581,227 | 458,526 / 518,904 |
| Requests answered from the archive | 1,168,140 | 1,184,121 | 977,430 |
| Neighbourhood draws read back (regenerated) | 1,025,280 | 1,047,200 | 845,344 |
| **New evaluations / refusing-pool calls** | **0 / 0** | **0 / 0** | **0 / 0** |
| Archive rows before → after the replay | unchanged | unchanged | unchanged |
| Unique centres visited | 98,339 | 97,779 | 106,318 |
| … requested by CTRL lanes only / EXP-30 only / both | 40,133 / 41,812 / 16,394 | 41,912 / 39,478 / 16,389 | 43,620 / 46,304 / 16,394 |
| Excluded from scope: a family unfunded / net ≤ 0 / error | 19,266 / 6,478 / 0 | 12,960 / 1,951 / 0 | 13,612 / 4,329 / 0 |
| **Scope** (profitable, both families funded, valid envelope) | **72,595** | **82,868** | **88,377** |
| Measured rung neighbourhoods (r1 / refine / r2 / r3) | 48,271 / 9,045 / 767 / 462 | 49,378 / 8,912 / 768 / 511 | 36,083 / 9,615 / 768 / 508 |

- **Shared centres.** The "both" centres are almost all screen proposals. Both arms of a pair screen identical
  configurations, so 16,384 screen proposals per arm are shared.
- **Search-path split.** After the screen the arms' centres overlap only marginally, so the populations differ by search
  path.
- **Exclusions.** Every centre is counted. The census excludes only the out-of-scope centres above, and every one of
  them is counted with its reason.

## 3. Centre plausibility on the identical candidate set (TABLES §A3)

| Scope centres | C19 | C21 | C24 |
|---|---:|---:|---:|
| Plausible under both | 66,314 | 62,410 | 47,285 |
| **P0 only** (pass P0, fail P3) | **284** | **514** | **375** |
| **P3 only** | **2,256** | **5,918** | **7,534** |
| Neither | 3,741 | 14,026 | 33,183 |
| **Screen proposals** (identical in both arms; pure eligibility): both / P0 only / P3 only | 3,891 / 64 / 565 | 1,659 / 43 / 863 | 236 / 8 / 154 |
| Post-screen centres of **CTRL** lanes: P3 only / P0 only | 769 / 126 | 1,967 / 305 | 2,748 / 229 |
| Post-screen centres of **EXP-30** lanes: P3 only / P0 only | 1,085 / 100 | 3,508 / 198 | 4,941 / 154 |

- **A check against Stage B.** The screen rows reproduce Stage B's sealed screen plausibility exactly (REPORT §6).
  P0-plausible screens are 3,955 / 1,702 / 244 and P3-plausible screens 4,456 / 2,522 / 390.
- **P0-only centres exist, but only at the centre level.** 284 / 514 / 375 centres (0.4–0.6 % of scope) pass P0 and
  fail P3, mostly through BD > $30k (218 / 301 / 262) and some through PL > $25k (68 / 222 / 121).
  - **Their stage:** none progressed past refinement.
  - **Their net:** at most $57k / $191k / $179k, with medians of $18k / $81k / $63k.
  - **So:** Stage B's finding "CTRL-only = 0" holds at the finalist level. It is not literally true of the searched
    population; P3's extra gates did remove a small, early-stage, lower-profit set.
- **P3-only centres are 3–9 % of scope.** They are exactly the centres with DD in ($35k, $40k] whose PL and BD pass.
  - **Their stage:** most die at rung 1. A few reached rung 2, rung 3 or the shortlist: 1 / 0 / 0 at C19, 8 / 7 / 6 at
    C21, 18 / 19 / 9 at C24.
- **Eligibility versus search path.**
  - **At the screen,** the only difference between the arms is eligibility. P3 admits 565 / 863 / 154 extra proposals.
  - **After the screen,** EXP-30's lanes requested **more** P3-only centres than CTRL's lanes: 1,085 vs 769, 3,508 vs
    1,967, and 4,941 vs 2,748.
  - **So:** the P3 search moved toward the ($35k, $40k] band. That is the search-path effect Stage B's sealed
    decomposition found (REPORT §5: "judged under P0, EXP-30's own candidates are worse"). The census shows it in the
    whole visited population, not only in finalists.

## 4. Which limits bind (TABLES §A4)

| Scope centres | C19 | C21 | C24 |
|---|---:|---:|---:|
| Marked DD > $35k (fails P0) | 5,997 | 19,944 | 40,717 |
| Marked DD > $40k | 2,911 | 11,818 | 30,291 |
| PL (liq.) > $25k | 160 | 4,002 | 6,091 |
| BD (liq.) > $30k | 3,057 | 9,984 | 28,980 |
| P3's binding metric among P3 failures (largest normalized excess): DD / PL / BD | 1,403 / 111 / 2,511 | 6,213 / 2,124 / 6,203 | 10,847 / 2,729 / 19,982 |
| **DD in ($35k, $40k]** | **3,086** | **8,126** | **10,426** |
| … admitted by P3 | 2,256 (73 %) | 5,918 (73 %) | 7,534 (72 %) |
| … **excluded by P3's PL / BD gates** (PL, BD; a centre can fail both) | 830 (51, 787) | 2,208 (935, 1,685) | 2,892 (440, 2,618) |
| … excluded band centres that reached rung 2 or beyond | 0 | 0 | 0 |
| Median / max centre net: band admitted | $35,516 / $99,804 | $101,142 / $228,007 | $92,956 / $224,752 |
| Median / max centre net: band excluded by PL / BD | $14,767 / $81,536 | $64,717 / $189,233 | $69,566 / $213,839 |

- **The search versus the finalists.** P3's PL and BD gates bind materially in the searched population: about 27 % of
  the 40 %-band centres are excluded, mostly by BD. Yet they bind almost never among finalists (Stage B: 0 / 0 / 1).
  The census explains why: every excluded band centre was a screen or early-rung centre, and they were less profitable
  than the admitted ones.
- **BD as the binding constraint.** Banked-capital DD is the most frequent binding P3 limit among the centres P3
  rejects at C19 and C24, and is tied with DD at C21. It usually fails together with DD > $40k (the
  `markedDd+bankedDd` class leads: 2,033 / 5,679 / 20,910).
- **"PL only" is rare:** 109 / 736 / 387 centres.

## 5. Profitability on the common population (TABLES §A5)

This is centre plausibility, not qualification.

| Centre net | C19 | C21 | C24 |
|---|---:|---:|---:|
| Max, P0-plausible = max, P3-plausible | $127,622 | $247,284 | $248,578 |
| Top-10 mean, P0 = P3 | $123,683 | $235,998 | $240,032 |
| Median P0-plausible / P3-plausible | $59,774 / $58,910 | $128,824 / $126,699 | $112,316 / $109,543 |
| P3-only: median / p90 / max | $35,516 / $62,646 / $99,804 | $101,142 / $167,185 / $228,007 | $92,956 / $163,081 / $224,752 |
| **Finalists:** best qualified centre net, P0 / P3 (sealed verdicts) | $127,622 / $127,622 | $247,284 / $247,284 | $248,578 / $248,578 |
| Finalists (192 members): both / P0 only / P3 only / neither | 183 / 0 / 6 / 3 | 160 / 0 / 30 / 2 | 152 / 0 / 36 / 4 |

- **The top is shared.** At every cutoff the most profitable centre is one configuration, plausible and qualified under
  both policies. P3 widens the middle of the distribution and does not move its top.
- **Who found it.** It was verified by identity in `centres-C2x.csv.gz` against the sealed selections.
  - At C19 it is CTRL's pooled P0 primary, GA0.VA0/R15#1, found by a CTRL lane.
  - At C21 and C24 it is **EXP-30's** pooled P0 primary, GA0.VA0/R13#1 and GA0.VA0/R5#1, found by an EXP-30 lane.
  - Those two are themselves P0-plausible and P0-qualified. Stage B's pooled-level advantage of EXP-30 at C21 and C24
    (+$16,135 and +$20,703) is therefore a **search-path** difference, not an eligibility difference: P0 would have
    admitted these candidates, and the CTRL searches did not find them.
- **Caveat.** These are training-period maxima of a path-dependent search on one market history.

## 6. Rung-fit feasibility under both policies (TABLES §A6)

| Measured fits: feasible under both / CTRL only / EXP-30 only / neither | C19 | C21 | C24 |
|---|---|---|---|
| Rung 1 (16 draws) | 37,026 / 465 / 4,439 / 6,341 | 31,605 / 526 / 7,046 / 10,201 | 11,756 / 144 / 5,836 / 18,347 |
| Refinement (16) | 8,672 / 0 / 60 / 313 | 7,980 / 1 / 879 / 52 | 7,156 / 5 / 1,555 / 899 |
| Rung 2 (64) | 719 / 1 / 27 / 20 | 641 / 3 / 102 / 22 | 493 / 3 / 178 / 94 |
| Rung 3 (128) | 444 / 0 / 14 / 4 | 428 / 1 / 77 / 5 | 368 / 0 / 115 / 25 |
| EXP-30-only fits failing CTRL on the neighbourhood **p90 DD** (all in ($35k, $40k]) | 4,371 + 59 + 27 + 14 | 6,954 + 876 + 101 + 76 | 5,767 + 1,551 + 178 + 115 |

- **What P3 enlarges.** At every rung, the EXP-30-only feasible fits are those whose neighbourhood p90 marked DD lies in
  ($35k, $40k]. P3 enlarges the feasible set almost entirely through the 40 % marked-DD allowance on the neighbourhood
  p90.
- **CTRL-only feasible fits are rare:** 0–3 at rungs 2–3.
- **The P3 failures.** Where P3 rejects a rung fit, its p90 BD and p90 DD parts dominate (TABLES §A6, last column).

## 7. A zero-evaluation giveback bound on every centre (TABLES §A7)

**The bound.** U ≥ max(0, DD − BD_marked) (PROTOCOL §3.4). It is checked against the exact partition on all 199
replayed subjects and holds to two cents (cent rounding). It is a **lower bound** on the unbanked-profit-giveback share
of a centre's maximum-DD window; the true share can be higher.

| Mean bound share of DD (share of centres provably giveback-dominated) | C19 | C21 | C24 |
|---|---:|---:|---:|
| All scope | 59.7 % (65.0 %) | 41.5 % (34.3 %) | 31.5 % (13.4 %) |
| Plausible under both | 62.4 % (69.6 %) | 45.2 % (41.8 %) | 37.4 % (22.2 %) |
| **P3 only** (the 40 % admissions) | **45.5 % (33.1 %)** | **40.5 % (20.6 %)** | **35.7 % (9.6 %)** |

- **The extra admissions are not more giveback-like than the shared population.** Their provable giveback share is
  equal or lower, and it falls as the training window lengthens.
- **What the bound does not say.** It never shows that a drawdown is mostly erosion: the true U can exceed the bound.

## 8. Confirmation draws of the representatives (zero evaluations; TABLES §A8, §A9)

This is the level where P0 rejected the P3 selections (Stage B §5). The draws are the 3 × 128 sealed confirmation draws
of each of the 32 representatives per arm, regenerated and read back. They reproduce the sealed family statistics and
Stage B's breach counts exactly.

| | C19 | C21 | C24 |
|---|---:|---:|---:|
| Draws > $35k DD, CTRL / EXP-30 | 213 / 434 | 276 / 1,085 | 403 / 1,621 |
| … provably giveback-dominated (bound ≥ ½ DD), CTRL / EXP-30 | 42 / 139 | 47 / 345 | 28 / 160 |
| … mean bound share, CTRL / EXP-30 | 26.5 % / 35.7 % | 36.1 % / 46.9 % | 27.8 % / 37.4 % |
| … mean BD_marked (an upper bound on E + F of each draw's window), CTRL / EXP-30 | $30,579 / $29,137 | $25,484 / $20,350 | $28,255 / $24,393 |
| Paired mean Δ confirmation **p90 DD** (80 % interval) | +$2,186 (+612 … +3,738) | +$4,562 (+3,446 … +5,684) | +$3,568 (+2,446 … +4,700) |
| Paired mean Δ p90 of the **giveback bound** | +$2,397 (+530 … +4,255) | +$2,341 (+1,037 … +3,643) | +$2,678 (+1,505 … +3,856) |
| Paired mean Δ p90 **BD_marked** | +$531 (−1,456 … +2,535) | +$2,325 (+673 … +3,925) | +$1,076 (−126 … +2,303) |
| Paired mean Δ p90 **trade PL (liq.)** | −$371 (−1,630 … +912) | +$3,204 (+1,745 … +4,640) | +$957 (−168 … +2,109) |

The quantiles do not add up; they are reported beside each other.
- **What is P3-specific.** EXP-30's breaching draws are somewhat more giveback-like than CTRL's: a higher bound share and
  lower BD. P3 caps BD at the p90.
- **What is not shown.** For both arms the bound proves giveback-dominance for only 7–32 % of the breaching draws, and BD
  stays at $20k–$31k among them. Breaching neighbourhood draws are therefore **not** shown to be mostly profit giveback.
- **C21 is the clear exception to a giveback-only reading.** Its neighbourhood p90 banked-capital DD (+$2.3k) and p90
  trade principal loss (+$3.2k) rose with the p90 DD (+$4.6k), and both 80 % intervals exclude zero.

## 9. Answers for the census question

1. **Pass only P3, only P0, both, neither** (searched centres, scope): 2,256 / 284 / 66,314 / 3,741 (C19); 5,918 / 514 /
   62,410 / 14,026 (C21); 7,534 / 375 / 47,285 / 33,183 (C24). Finalists: P3 only 6 / 30 / 36; P0 only 0 / 0 / 0.
2. **Binding limits.**
   - P0 binds only on marked DD.
   - P3 binds on DD > $40k and BD > $30k, often both. PL binds rarely alone.
   - In the ($35k, $40k] band, P3's PL and BD gates exclude about 27 % of centres, all of them early-stage and less
     profitable. They therefore almost never constrain finalists.
3. **P0-pass / P3-fail.**
   - **Centres: yes,** 284 / 514 / 375, through BD (mostly) or PL. All are at refinement or earlier.
   - **Finalists: none.**
4. **What changed.** P3 admitted the 40 % marked-DD band. EXP-30's searches then spent more of their path there; the
   top of the profit distribution is the same configuration under both policies. Nothing in the census changes Stage
   B's attribution, which stays as sealed: the gain is eligibility for ($35k, $40k] neighbourhood-p90 candidates, not
   protection.

## 10. Limitations

- **Training-door records only.** One market history and two cells. The cutoffs are nested, so the per-cutoff results
  are not independent replications.
- **Coverage gaps.**
  - Centre-level verdicts ignore the neighbourhood.
  - The rung-fit counterfactual is computed only where a neighbourhood was measured. Neighbours are drawn only for
    centres plausible under the fitting lane's arm, so a CTRL-implausible centre has no measured neighbourhood unless an
    EXP-30 lane fitted it too.
- **The giveback bound** is a bound, not a decomposition. The exact decomposition exists only for the replayed centres
  (`GIVEBACK_REPORT.md`).
- **"Unique centre"** means a unique canonical configuration. Behaviourally identical configurations with different
  identities are counted separately (the census does not group by ledger signature).
