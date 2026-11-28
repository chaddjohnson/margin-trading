# Risk-envelope pilot NL0-REP 1.0.0 — report

Pilot research only. Written analysis and tables (no visuals). Every figure below is read from a sealed record of this
study (`results/seals.jsonl`) or from the generated tables `results/tables/TABLES.md` / `summary.json`; the CPU
diagnostics are nonbinding. The searched histories and both next intervals are **retrospective, previously inspected
history** — never a pristine holdout. Nothing here adopts the envelope, changes the optimization standard, nominates a
New L0 replacement or deploys anything.

## 0. Executive summary

- **Question.** With identical data, search algorithm, seeds, schedules, costs and execution, does replacing the NL0
  marked-DD gate (≤ 35 % of the fixed $100,000 allocation C0) by the envelope **marked DD ≤ 40 % of C0, funded-trade
  principal loss ≤ 25 %, banked-capital DD ≤ 25 % of C0** (liquidation basis) change what the NL0 / Assignment 3 broad
  search discovers and qualifies? Two cells (`GA0.VA0`, hash-selected `GB0.VD1`) × R1/R2 × two arms × C21, C24.
- **The pilot ran completely and as frozen**: 16 official GPU search lanes, two union qualifications, two next
  intervals, **291,392 requested evaluations** (bound 693,652; ceiling 700,000), 0 CPU-scored official evaluations,
  every stage sealed and committed in the frozen order. CTRL reproduced Assignment 3 exactly (E2: 8/8 lanes; 27/27
  qualification records). One post-freeze defect fix (A1: a crash in the selection-record helper, before any selection
  output) is documented; no criterion changed.
- **Outcome label (precommitted rule, PROTOCOL §15): _worse_.** EXP's best qualified centre net is lower than CTRL's at
  both cutoffs: **Δ21 = −$4,456**, **Δ24 = −$21,830** (H1, H1′ fail). H3 (C21 interval non-inferiority, margin $5,000)
  holds: EXP P0's 2022–2023 interval DD $32,168 vs CTRL P0's $45,820. H2 holds narrowly (one EXP-only qualified,
  giveback-dominated member with DD $35,686).
- **Why.** The envelope is not a relaxation in practice. Its **25 % banked-capital DD gate (liquidation basis) was the
  most frequent binding constraint** (it failed 24.6 % / 48.3 % of the profitable, funded centres EXP requested at C21 /
  C24, versus 20.7 % / 42.9 % for DD > 40 %). At C21 the 40 % DD admitted 768 centres CTRL rejected, and three
  EXP-only members qualified (DD $35.7k–$38.3k), but none was the most profitable; the search paths diverged and EXP's
  lanes did not re-find CTRL's best region. At C24 the banked-DD gate **excluded CTRL's best phenotype** ($218,842; its
  confirmation p90 banked DD $26,313 > $25,000) and EXP's lanes settled in a lower-profit, low-occupancy region
  ($197,012; occupancy 22.6 %).
- **Retrospective next intervals (descriptive, single pair, previously inspected):** EXP's P0 primaries did better than
  CTRL's at both cutoffs — 2022–2023 −$13,230 vs −$27,810; 2025–2026 +$58,652 vs +$16,049 — with lower interval DD; the
  RA1 variants were mixed (EXP's C21 RA1 primary was the worst subject, −$37,039, DD $60,375). Every searched primary
  stayed far below the informed benchmarks New L0 / N/original (+$87k–$97k per interval, DD ≈ $19.5k–$20.4k).
- **Envelope-adapted RA1 changed nothing**: at both cutoffs it chose the same phenotype as original RA1.
- **Recommendation: keep the original NL0 method.** The pilot gives no evidence that the 40/25/25 envelope helps the
  optimizer discover more profitable robust phenotypes; it does not justify a full N/original-scale successor search.
  If the user wants to pursue the interval signal or the banked-DD finding, only a separately authorized, replicated
  study would be informative (§13).

## 1. What was run

| Item | Value |
|---|---|
| Authority | `brief/BRIEF.md` (sha256 `5a9dfe8f…723dd`); decisions D-0 … D-15 resolved (`DECISION_REGISTER.md`) |
| Protocol | `PROTOCOL.md` NL0-REP 1.0.0, sha256 `723eea5d96fb986bb3d285b62201895052d573b2e6154a6fe94e8302c5ef2e78`, frozen by `results/protocol-freeze.json` (`627017dc…`, commit `8b06986e`, pushed before any official evaluation) |
| Standard / method | optimization standard 3.0.0 (`4e8244e6…`), scope optimization, `evaluationBackend: gpu-required`; NL0 1.0.0 (`9b387bb4…`); departures RD1–RD3, RD5 with the user's agreement, adaptations RD4, RD6–RD8 |
| Lineage | branch `research/vg-l0-risk-envelope-pilot` from the accepted Phase 7 lineage `fc027eed`; acceptance record `bb0e3fcf…` (Phase 7, ACCEPTED), binary gb7 `cb2ff30b…`, RTX 5090 `GPU-ae5f222c…`; `main` untouched (`3606f4b3`) |
| Arms | CTRL `nl0-control@1.0.0`; EXP `re-40-25-25@1.0.0` — the single interpretation `src/risk-envelope/policy.ts` |
| Lanes | Assignment 3's broad lane (NL0 V-cell schedule) on `GA0.VA0` and `GB0.VD1`, R1/R2, Assignment 3's seed keys (the arm never enters a seed) |
| Code | `src/vg-l0-risk-envelope-pilot/` — the lane is **generated** from Assignment 3's frozen `search.ts` by 19 declared substitutions (byte-equality test); the arm changes only plausibility, violation and the hypervolume reference |
| Order | CTRL C21 → CTRL C24 → E2 → EXP C21 → EXP C24 → qualification C21, C24 → E2-qualification → C21 selection (committed) → D23 interval → C24 selection, frozen-selection manifest, FULL authorization (committed) → FULL validation once |

## 2. Engineering gates and parity

| Gate | Result | Evidence |
|---|---|---|
| E1 | Phase 7 record ACCEPTED; independent verifier **VERIFIED** (19 PASS: out-of-band pin, all groups, 42 evidence files, reproducible rebuild, device) on the pilot branch; the official runner refuses a process without `--no-maglev` and a non-official purpose; policy + enforcement tests 16/16 | `results/engineering/E1/` |
| E2 | **8/8 CTRL lanes identical** to Assignment 3's sealed lane results (envelopes stripped; requested 71,314 / 62,488 exactly); **27/27 CTRL members' qualification evidence identical** to Assignment 3's sealed evidence (13 at C21, 14 at C24; N/original at C21 had no Assignment 3 reference) | `results/engineering/E2-*.json` |
| E3 | mini-pilot (D19, both arms, non-official): GPU = CPU in lane results, qualification evidence, selections and **all 12,909 archived records with envelopes**; graceful stop + resume and SIGKILL + resume = uninterrupted; the pilot's CTRL lane = Assignment 3's own lane (GPU and CPU); threshold-edge subjects (1,000 per door, 2 option sets): records, envelopes, every decision and the constrained rankings GPU = CPU; the archive refuses another backend or code digest | `results/engineering/E3/summary.json` |
| E4 | 26/26 tests at the freeze (27/27 after A1): DD $38k flips CTRL fail → EXP pass; PL $26k / BD $26k flip CTRL pass → EXP fail; exact boundaries (value = limit passes, +1 ulp fails); Q3 and Q5 on all three metrics; CTRL = the frozen fitness bit for bit on 20,000 records; stage wiring through the whole lane on synthetic records; RA1-adapted ≡ RA1 at 35 % on every sealed Assignment 3 population; no hidden 35k rule (static); the derived lane = a fresh derivation | `results/engineering/E4/` |
| E5 | study preflight PASS (3.0.0, optimization, gpu-required, NL0 pinned) | `results/engineering/E5/` |
| E6 | live official gate **OPEN** on D21 and D24 (18/18 parity subjects; attestations) | `results/engineering/E6/`, `results/gpu-attestations/` |

Every official stage then passed the gate again (one attestation per job phase, `results/gpu-attestations/`), with
receipts on every batch and the conservation invariant (CPU-scored 0, failed 0) — `results/jobs/*/telemetry.jsonl`.
The census replayed both arms of each cutoff from a copy of the job archive with a pool that refuses any evaluation:
**the replays reproduce the sealed lane results exactly** (determinism). The CPU diagnostic replays match the official
GPU records exactly: 26/26 qualification centres per cutoff (net, DD and the four envelope values to the cent) and every
interval subject (interval net and reset DD, bit for bit).

**Incidents (all disclosed in `AMENDMENTS.md`):** D1 (pre-freeze, engineering only): the E3 chain's SIGKILL step
expected exit 137 but `timeout` reports 124; the kill had happened; the expectation was corrected and the chain resumed.
**A1 (post-freeze defect fix):** the C21 selection step crashed because `sealedEvidence` assumed per-lot rows that the
sealed qualification record had already dropped; the crash happened before any selection output was printed or written
and before any next door opened; the helper was made idempotent, the guards accept the new code digest only through
the sealed, committed amendment record `results/amendments/A1.json` (changed: `main.ts`, `stages.ts`; `select.ts`
byte-identical); tests 27/27; the chain resumed at step 9.

## 3. Budget and compute

| Stage | Cutoff | Arm | Requested | Fresh | Archive hits | GPU wall |
|---|---|---|---:|---:|---:|---:|
| search | C21 | CTRL | 71,314 | 70,756 | 495 | 5.8 min |
| search | C21 | EXP | 66,228 | 61,534 | 4,658 | 5.7 min |
| search | C24 | CTRL | 62,488 | 61,955 | 496 | 8.3 min |
| search | C24 | EXP | 54,502 | 51,578 | 2,901 | 8.0 min |
| qualification (union, 26 members) | C21 | both | 16,978 | 16,978 | 0 | 18 s |
| qualification (union, 26 members) | C24 | both | 16,978 | 16,978 | 0 | 24 s |
| next interval (6 subjects, D23) | C21 | both | 1,584 | 1,584 | 0 | 5 s |
| validation (5 subjects, FULL once) | C24 | both | 1,320 | 1,320 | 0 | 6 s |
| **total pilot research evaluations** | | | **291,392** | 282,683 | 8,550 | ≈ 29 min |

Bound 693,652; ceiling 700,000; no lane approached its 41,000 cap (largest 24,653). EXP requested 120,730 search
evaluations vs CTRL 133,802. Separately (not pilot
research evaluations): E3 engineering: four mini runs of 12,909 archived evaluations each (GPU, CPU, stopped + resumed, killed + resumed)
and 4,000 edge-subject evaluations per door and backend; nonbinding CPU diagnostics 418 population replays, 22 primary replays, 4,224 confirmation
neighbourhood replays and 132 scaling replays. Resources: peak VRAM 6.1 GB (C24 search), host unit peaks 3.0–4.0 GB,
GPU ≤ 53 °C / ≤ 136 W.

## 4. Search coverage and rejection by metric

| Cutoff | Arm | Lane | Requested | Islands | Stop | Screen plausible (of 512) | Rung-1 centres | Rung-1 feasible | Rung-3 feasible (of 6) | Best shortlisted net / DD |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---|
| C21 | CTRL | GA0.VA0/R1 | 12,946 | 2 | triggers not met | 48 | 576 | 271 | 5 | $188,316 / $25,262 |
| C21 | CTRL | GA0.VA0/R2 | 18,170 | 4 | triggers not met | 40 | 1,088 | 564 | 6 | $189,175 / $18,379 |
| C21 | CTRL | GB0.VD1/R1 | 15,685 | 3 | triggers not met | 68 | 832 | 424 | 6 | $216,732 / $30,150 |
| C21 | CTRL | GB0.VD1/R2 | 24,513 | 6 | triggers not met | 56 | 1,600 | 770 | 6 | $212,165 / $27,554 |
| C21 | EXP | GA0.VA0/R1 | 11,756 | 2 | triggers not met | 47 | 576 | 273 | 5 | $202,274 / $35,731 |
| C21 | EXP | GA0.VA0/R2 | 10,908 | 2 | triggers not met | 51 | 576 | 284 | 6 | $212,276 / $26,325 |
| C21 | EXP | GB0.VD1/R1 | 18,911 | 4 | triggers not met | 68 | 1,088 | 575 | 5 | $203,026 / $32,390 |
| C21 | EXP | GB0.VD1/R2 | 24,653 | 6 | triggers not met | 58 | 1,600 | 629 | 5 | $209,269 / $18,701 |
| C24 | CTRL | GA0.VA0/R1 | 8,584 | 2 | triggers not met | 14 | 576 | 58 | 6 | $205,661 / $24,446 |
| C24 | CTRL | GA0.VA0/R2 | 19,922 | 6 | extension cap reached | 13 | 1,600 | 409 | 2 | $176,610 / $25,270 |
| C24 | CTRL | GB0.VD1/R1 | 16,933 | 6 | extension cap reached | 8 | 1,600 | 204 | 4 | $162,957 / $25,073 |
| C24 | CTRL | GB0.VD1/R2 | 17,049 | 6 | triggers not met | 4 | 1,600 | 211 | 6 | $218,842 / $25,818 |
| C24 | EXP | GA0.VA0/R1 | 12,610 | 4 | triggers not met | 9 | 1,088 | 135 | 6 | $197,012 / $17,281 |
| C24 | EXP | GA0.VA0/R2 | 9,289 | 2 | triggers not met | 9 | 576 | 138 | 6 | $163,798 / $19,679 |
| C24 | EXP | GB0.VD1/R1 | 16,513 | 6 | extension cap reached | 7 | 1,600 | 262 | 6 | $167,547 / $26,444 |
| C24 | EXP | GB0.VD1/R2 | 16,090 | 6 | extension cap reached | 5 | 1,600 | 211 | 5 | $176,287 / $23,004 |

(From each lane's sealed counts, `results/search/C2x/<arm>.json`; rung-1 centres include island children, fillers and promoted screen centres.) "Extension cap reached" lanes are
budget-bound, not converged. Rejection by metric among the **profitable, both-families-funded centres each arm
requested** (census):

| Cutoff | Arm | Centres (profitable, funded) | Plausible | Fail DD (> 35 % / > 40 %) | Fail PL > 25 % | Fail BD > 25 % |
|---|---|---:|---:|---:|---:|---:|
| C21 | CTRL | 5,502 | 72.6 % | 27.4 % | (not gated) | (not gated) |
| C21 | EXP | 5,218 | 71.9 % | 20.7 % | 6.3 % | 24.6 % |
| C24 | CTRL | 6,379 | 53.0 % | 47.0 % | (not gated) | (not gated) |
| C24 | EXP | 6,007 | 48.7 % | 42.9 % | 8.2 % | 48.3 % |

Growth boundedness (D-9; bounded = Growth maximum hold or initial stop ON): fitted centres C21 CTRL 3,866 bounded /
1,232 open-ended, EXP 3,215 / 1,613; C24 CTRL 5,720 / 743, EXP 5,076 / 826; shortlists C21 CTRL 8 / 4, EXP 6 / 6; C24
CTRL 9 / 3, EXP 9 / 3. Primaries: CTRL C21 P0 bounded, RA1 open-ended; EXP C21 P0 open-ended, RA1 bounded; C24 CTRL P0
bounded, RA1 open-ended; EXP C24 P0 bounded.

## 5. Policy disagreement — both directions

Plausibility (net > 0, both families funded, the arm's centre envelope) of the identical screen proposals and of every
centre either arm evaluated (census, `results/analysis/census-C2x.json`):

| Cutoff | Set | Centres | Both pass | CTRL-only | EXP-only | Neither |
|---|---|---:|---:|---:|---:|---:|
| C21 | screen (2,048 identical proposals) | 2,048 | 171 | 41 | 53 | 1,783 |
| C21 | all centres (union of both arms) | 11,462 | 6,720 | 337 | 768 | 3,637 |
| C24 | screen | 2,048 | 23 | 16 | 7 | 2,002 |
| C24 | all centres | 13,899 | 5,640 | 502 | 486 | 7,271 |

- **EXP-only** is always "DD in ($35k, $40k] with PL and BD within 25 %" (C21 768, C24 486 centres).
- **CTRL-only** is "DD ≤ $35k but banked DD > $25k" (C21 311, C24 484) or "PL and BD both > $25k" (26, 18). **A
  principal-loss failure never occurred without a banked-DD failure** in either cutoff — in this one-slot portfolio a
  trade losing > 25 % of its principal also erodes > 25 % of banked capital.
- Among centres both arms reject, the most common pattern is "CTRL: DD > $35k; EXP: DD > $40k and BD > $25k" (C21 834,
  C24 2,966) and "CTRL: DD > $35k; EXP: BD > $25k only" (C21 314, C24 647): many giveback-heavy centres that the 40 % DD
  would have admitted are stopped by the banked-DD gate.
- Rung-3 fits, refinement endpoints and shortlists assessed under both arms (128-draw neighbourhoods): **C21** — CTRL's
  32 fits: 31 feasible under CTRL, 31 under EXP; EXP's: 29 under EXP, only 17 under CTRL (EXP moved into DD > 35k
  regions); **C24** — CTRL's: 26 under CTRL, 20 under EXP (banked DD); EXP's: 31 under EXP, 30 under CTRL (EXP stayed
  in conservative regions).

EXP is therefore neither "looser" nor "safer": it was more permissive than CTRL at the C21 screen and more restrictive
at the C24 screen.

## 6. Qualification (union per cutoff; every member under both arms)

| Cutoff | Both qualify | CTRL-only | EXP-only | Neither | CTRL population qualified | EXP population qualified |
|---|---:|---:|---:|---:|---:|---:|
| C21 | 19 | 1 | 3 | 1 | 12 / 12 | 11 / 12 |
| C24 | 19 | 2 | 2 | 1 | 11 / 12 | 12 / 12 |

- **C21 EXP-only:** `GA0.VA0/R1#1 profit` ($202,274, DD $35,731, PL/BD $22,381), `GA0.VA0/R1#2 robust` ($169,804, DD
  $38,299), `GA0.VA0/R2#3` ($186,760, DD $35,686) — the giveback admitted by the 40 % DD. **C21 CTRL-only:**
  `GA0.VA0/R1#1 profit` (CTRL lane; confirmation p90 BD $25,690 > $25,000).
- **C24 CTRL-only:** CTRL's own best `GB0.VD1/R2#1 profit` ($218,842; Q3 p90 BD $26,313) and `GA0.VA0/R1#3` (Q3 p90 BD
  $25,596). **C24 EXP-only:** two EXP members with confirmation p90 DD $35.7k / $36.7k.
- The benchmarks qualify under both arms at both cutoffs (New L0 C24: $382,721, DD $19,460, PL $8,093, BD $10,384).
- Full member table with centre and confirmation p90 of all three metrics: `results/tables/TABLES.md`.

## 7. Selection — P0, original RA1 and envelope-adapted RA1 on identical populations

| Cutoff | Arm | Selector | Primary | Centre net | Centre DD | PL (liq) | BD (liq) | Sel. robust | Sel. p90 DD | Sel. worst-10 % DD | Occupancy |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C21 | CTRL | P0 | GB0.VD1/R1#1 profit | $216,732 | $30,150 | $6,569 | $15,342 | $167,851 | $33,082 | $35,778 | 91.5 % |
| C21 | CTRL | RA1 (S4 35 %) | GB0.VD1/R2#1 profit | $212,165 | $27,554 | $5,896 | $5,896 | $161,353 | $30,153 | $34,088 | 91.1 % |
| C21 | EXP | P0 | GA0.VA0/R2#1 profit | $212,276 | $26,325 | $11,203 | $11,203 | $172,893 | $27,903 | $29,990 | 87.4 % |
| C21 | EXP | RA1 (S4 35 %) = RA1 (S4 40 %) | GB0.VD1/R2#1 profit | $209,269 | $18,701 | $5,193 | $5,193 | $172,068 | $25,294 | $27,940 | 78.2 % |
| C24 | CTRL | P0 | GB0.VD1/R2#1 profit | $218,842 | $25,818 | $12,752 | $15,626 | $133,240 | $32,350 | $37,516 | 65.6 % |
| C24 | CTRL | RA1 (S4 35 %) | GB0.VD1/R2#3 Growth gate alt. | $189,343 | $18,745 | $6,713 | $10,523 | $130,120 | $28,196 | $29,585 | 66.7 % |
| C24 | EXP | P0 = RA1 (35 %) = RA1 (40 %) | GA0.VA0/R1#1 profit | $197,012 | $17,281 | $9,660 | $9,660 | $161,872 | $27,095 | $30,342 | 22.6 % |

- The adapted S4 (40 %) picked the same phenotype as the original RA1 in both EXP populations: no EXP-qualified member's
  rank depended on a worst-10 % mean DD between 35 % and 40 % of C0.
- The C21 EXP RA1 primary is a different phenotype from EXP's P0; at C24 every EXP selector agrees.
- NL0 roles and Pareto sets per arm: `results/selection/C2x.json`.

## 8. Precommitted hypotheses and the label

| Item | Value | Holds |
|---|---|---|
| H1: Δ21 = EXP P0 − CTRL P0 centre net > $2,500 | −$4,456.27 | no |
| H1′: Δ24 > $2,500 | −$21,830.38 | no |
| H2: every EXP-qualified member satisfies the envelope, and ≥ 1 has DD > 35 % of C0 and is giveback-dominated | 23 EXP-qualified, all satisfy; one (C21 `GA0.VA0/R2#3`, DD $35,686, D3 unbanked giveback ≥ ½ DD) | yes (narrowly) |
| H3: C21 2022–2023 interval DD of EXP P0 ≤ CTRL P0's + $5,000 | $32,168.18 vs $45,819.69 | yes |
| **Label (PROTOCOL §15)** | both Δ < −$2,500, neither > $2,500 | **worse** |

Distinguishing profit from permissiveness: the envelope **did** make qualification more permissive for giveback-heavy
C21 proposals (3 EXP-only qualified members, H2), but those were not more profitable; and it made qualification **less**
permissive for banked-capital erosion (it removed CTRL's best C24 phenotype). Neither cutoff produced a more profitable
qualified phenotype under EXP.

## 9. Chronological outcomes (retrospective; previously inspected history; reset DD at the cutoff close)

| Cutoff → interval | Subject | Selected by | Interval net | Interval DD | Interval BD (liq) ¹ | Max new-lot PL (liq) ¹ | Nbhd draws DD > 35 % C0 (Wilson 95 %) | Nbhd median / worst DD |
|---|---|---|---:|---:|---:|---:|---|---|
| C21 → 2022–23 | GB0.VD1/R1#1 | CTRL P0 | −$27,810 | $45,820 | $28,960 | $14,202 | 160/256 (56–68 %) | $38,905 / $67,174 |
| C21 → 2022–23 | GB0.VD1/R2#1 | CTRL RA1 | −$22,489 | $55,459 | $37,603 | $37,603 | 121/256 (41–53 %) | $34,146 / $60,383 |
| C21 → 2022–23 | GA0.VA0/R2#1 | EXP P0 | −$13,230 | $32,168 | $19,545 | $13,197 | 109/256 (37–49 %) | $33,631 / $63,103 |
| C21 → 2022–23 | GB0.VD1/R2#1 | EXP RA1 (both) | −$37,039 | $60,375 | $50,915 | $8,963 | 251/256 (96–99 %) | $53,747 / $71,620 |
| C21 → 2022–23 | New L0 | benchmark | +$87,238 | $19,460 | $10,384 | $8,093 | 11/256 (2–8 %) | $20,366 / $46,888 |
| C21 → 2022–23 | N/original | benchmark | +$92,082 | $19,460 | $10,384 | $8,093 | 5/256 (1–5 %) | $20,116 / $45,204 |
| C24 → 2025–26 | GB0.VD1/R2#1 | CTRL P0 | +$16,049 | $23,563 | $22,427 | $12,372 | 1/256 (0–2 %) | $23,011 / $36,467 |
| C24 → 2025–26 | GB0.VD1/R2#3 | CTRL RA1 | +$34,357 | $35,925 | $29,398 | $2,985 ² | 252/256 (96–99 %) | $35,925 / $35,925 |
| C24 → 2025–26 | GA0.VA0/R1#1 | EXP P0 = RA1 (both) | +$58,652 | $16,832 | $10,361 | $10,361 | 0/256 (0–2 %) | $16,755 / $29,739 |
| C24 → 2025–26 | New L0 | benchmark | +$96,884 | $20,386 | $13,525 | $11,114 | 0/256 (0–2 %) | $21,907 / $30,111 |
| C24 → 2025–26 | N/original | benchmark | +$94,670 | $20,386 | $13,525 | $11,114 | 0/256 (0–2 %) | $22,284 / $31,894 |

¹ CPU diagnostic window metrics (banked DD with the high reset at the boundary's banked level; principal loss of lots
entered after the boundary). ² CTRL's C24 RA1 primary carried a Growth·VGT lot bought 2024-09-27 into the interval; its
lifetime principal loss (liquidation) reached $29,398 (29 % of principal) before it recovered to +$9,542 at its exit
(2026-02-05).

- Every searched primary **lost money in 2022–2023**; the bear market dominates that fold. EXP P0 lost least and had
  the lowest interval DD among searched subjects (H3). EXP's RA1 primary was the worst subject (DD $60,375).
- In 2025–2026 EXP's single primary earned the most among searched subjects (+$58,652, DD $16,832), but less than
  either benchmark.
- Whole-run envelope through the interval end (2016 → interval end, report-only): only EXP's P0 primaries and the two
  benchmarks still satisfy both policies; CTRL's P0 primaries fail both (C21: whole-run DD $47,360; C24: whole-run banked
  DD $26,725).
- §5.9 items: the carried lot at C21 is a Growth·VGT lot for every searched primary (market-value multiple at the cutoff
  1.19–1.97×; give-back to exit −$8,452 to −$16,617); New L0 / N/original carried a D1·GDX lot (−$6,826).
- These are two correlated, previously inspected intervals with one seed pair per cell; they are descriptive evidence,
  never a validation of the envelope.

## 10. Alternative drawdown policies (nonbinding diagnostics; coefficients illustrative)

Recorded populations of both arms (every rung-2/3, refinement-endpoint, shortlisted, top-net, frontier and
visible-infeasible centre, the qualified members and the benchmarks; CPU replays, `results/diagnostics/population-C2x.json`):

| View | C21 (222 centres) | C24 (196 centres) |
|---|---:|---:|
| CTRL policy | 200 | 166 |
| EXP policy (40/25/25) | 218 | 170 |
| D1 peak-equity DD ≤ 40 % | 222 | 196 |
| D2 capped hybrid utilization ≤ 1 (40/30/60) | 222 | 194 |
| D3 illustrative (DD ≤ 60 % C0 ∧ BD ≤ 25 % ∧ PL ≤ 25 %) | 221 | 176 |
| giveback-dominated (unbanked giveback ≥ ½ DD) | 184 | 82 |
| excluded by both arms, net > 0, admitted by D2 or D3 | 3 | 10 |

- **D1** never binds on this history: profitable paths raise peak equity, so a 40 % of-peak limit admits everything (the
  primaries' D1 values are 9.6–18.8 %).
- **D2** (illustrative 40/30/60) admits nearly everything too; the primaries' utilizations are 0.29–0.63 (floor or
  peak-proportional regime, New L0 and C24 EXP P0 in the cap regime).
- **D3**: at C21 the searched primaries' training DDs are almost entirely unbanked giveback (U 76–100 %); at C24 CTRL's
  P0 DD splits into $12,475 giveback and $13,342 banked erosion (U 48 %). In 2022–2023 the interval drawdowns are
  almost entirely **capital loss below the boundary equity** (F ≈ 96–98 %), not giveback.
- **Excluded-but-promising** (both arms reject; net > 0; D2 or D3 admits): the strongest C21 cases are centres with DD
  $40.6k–$43.1k and net $177k–$189k (EXP visible-infeasible, banked DD up to $23.3k), and at C24 ten centres
  (`results/tables/summary.json` `diagnosticsC2x.excludedButPromising`). They are DD-heavy giveback paths beyond the
  40 % cap; nothing indicates a higher-profit region that a different envelope would unlock. A separate optimization is
  not warranted on this evidence.
- **DD^L** (liquidation-basis conventional DD, CPU): within $50 of the marked DD for every primary and benchmark (e.g.
  C21 CTRL P0 $30,136 vs $30,150) and within $101 for every population centre (it can be lower or higher than the marked
  DD: the exit cost lowers both the peak and the trough when a lot is open at both).

## 11. Scaling, stresses, tails and account risk

- **$100k / $250k / $500k proportional replays** (CPU, all 11 frozen subjects, training door and interval door):
  identical trade chronology and identical CTRL/EXP decisions at every size; DD, PL and BD as % of C0 identical; worst
  dollar deviation ≤ 2.3 × 10⁻¹⁵ × C0 (`results/diagnostics/primaries-C2x.json`). The thresholds scale exactly: 35 % →
  $87.5k / $175k; 40 % → $100k / $200k; 25 % → $62.5k / $125k.
- **Cost / interest stresses** (report-only, from qualification): every primary stays profitable at 20 bps and 14 %
  interest on training; Q5 (10 bps) held under each arm's own envelope for every primary. Interval nets at 20 bps:
  `results/tables/TABLES.md`.
- **D1 maximum-hold-window tail stress** (in-sample daily-bar approximation on the training door): the worst loss of a
  $100,000 D1 lot held over its hold window is −$22.9k to −$39.4k without a protective stop (entries in February–March
  2020); with the configured protective stop −$12.0k to −$26.5k, the worst gap through the stop 3–7 % beyond it (2020-03-12
  / 03-16). Synthetic opening gaps of −10 / −20 / −30 % produce losses up to −$30,070 even with a stop: **a stop is not a
  loss cap.**
- **Account-level margin (illustrative only; not the user's account, not a broker rule):** a $100,000 position bought
  on a $100,000 loan inside an account with other equity B: with B = $50,000 a common decline of 28.6 % (30 %
  maintenance) or 33.3 % (25 %) reaches the requirement; with B = $25,000 the account is at or below the requirement from
  the start under 25–50 % maintenance; with B = $100,000 no deficiency occurs before a total loss. The fixed-slot
  simulation cannot infer account-level maintenance or liquidation risk.

## 12. Uncertainty and limitations

- **One market history, two cutoffs, two cells, two seeds per cell.** Assignment 2 measured replicate noise of
  $9–16k median per cell (Assignment 3 PROTOCOL §2); Δ21 (−$4.5k) is inside it, Δ24 (−$21.8k) is larger but comes from one replicate's
  phenotype per arm. No method claim is possible from one pair (standard §3.4).
- **Search paths diverge.** With paired seeds the two arms see identical screens, but every feasibility decision
  feeds the NSGA-II islands, so after the first generation the arms explore different regions; part of Δ is search
  path-dependence, not the envelope's admissibility per se (CTRL's best C21 phenotype qualified under EXP too but was
  never proposed by EXP's lanes).
- **Budget-bound lanes:** 4 of 16 lanes stopped at the extension cap (not converged).
- **Previously inspected history.** 2022 and 2025–2026 have been examined by many studies; the envelope itself was
  motivated by archives of C21–C24. The intervals are retrospective descriptions, never pristine validation.
- **Thresholds.** The 40/25/25 envelope, the liquidation basis and the p90 neighbourhood form were fixed by the user
  before the pilot; the results do not identify better thresholds and were not used to tune any.
- **Not modelled:** account-level margin, taxes, market impact, whole shares.
- **Defects found:** A1 (crash before any selection output) and D1 (an engineering test-script expectation); neither
  changed a decision.

## 13. Assessment and recommendation

**Outcome: worse** (precommitted rule). The revised envelope did not help the optimizer discover more profitable robust
phenotypes at either cutoff; the 25 % banked-capital DD gate (liquidation basis) proved to be the dominant constraint
and largely offset the 40 % DD relaxation; the principal-loss gate added little that the banked-DD gate did not already
catch. The adapted RA1 was indistinguishable from the original. The retrospective intervals favoured EXP's P0 at both
cutoffs, but that rests on one phenotype per cutoff, on previously inspected history, and does not reach the informed
benchmarks.

- **Keep the original NL0 method** (35 % marked DD of C0) as the reference; do not adopt the envelope.
- **A full N/original-scale successor search under this envelope is not warranted** by this pilot.
- If the user still wants to study the question, the informative next step would be a separately authorized,
  **replicated** pilot (more seeds per cell, more cells, ideally an earlier cutoff), possibly asking specifically about
  the banked-DD gate (its basis or level) — a new question, not a continuation of this one.
- Nothing here authorizes a change of the optimization standard, a deployment, or a replacement of New L0 /
  N/original.

## 14. Repository status and reproduction

- Branch `research/vg-l0-risk-envelope-pilot` (pushed); `main` untouched (`3606f4b3`), never merged. Key commits:
  `1f5093d6` code and protocol, `4cabc0ff` engineering evidence, `8b06986e` gates + freeze (pushed before any official
  evaluation), `ce91c2c7` CTRL + E2, `92fd04bb` EXP, `3be30d10` qualification + E2-qualification, `36b0a3e6` / `27ee51a6`
  amendment A1, `124d7248` C21 selection, `4ad7098f` C21 interval, `b0ae2c0f` C24 selection, `df827761` frozen
  selection, `37406602` FULL authorization, `556de8b3` validation; later commits add the census, diagnostics, tables,
  the regression record, the report and the handoff.
- Exact commands: `RUN_COMMANDS.md`, `EXECUTION_PLAN.md`, `chains/official.sh`; sealed records and sha256:
  `results/seals.jsonl`; checkpoint: `RESEARCH_RECOVERY.md`.
- Git-ignored state kept for audit until the user's review: the job archives (`research/vg-l0-risk-envelope-pilot/cache/
  jobs/C2x-*/archive.sqlite`, ≈ 0.4–0.7 GB each), the engineering and analysis archives, the per-lot row caches.
- Regression suites: §15.

## 15. Regression (final tree; `results/regression/`, chain `chains/regression.sh`, run after the sealed FULL validation)

| Suite | Result |
|---|---|
| `npm test` (full) | 1,764 tests: 1,752 pass, 8 fail, 4 skipped. **7 = the known pre-existing failures** (`allin-original.ts` case ×6: intraday-study ×1, minute-optimizer ×1, trailing-buy ×4; Study 7 data end ×1). **1 new = this pilot's own static door-guard test**, written for the pre-selection state and stale once the C21 selection was committed (disclosure D2): corrected to check the guards against the actual stage state; the pilot tests then pass 27/27 (`pilot-tests-after-D2.txt`). No other new failure |
| root `tsc --noEmit` | 0 errors |
| ESLint (pilot code and tools) | 0 errors; 194 `prettier/prettier` formatting warnings (left: reformatting the pilot sources would change the frozen code digest) |
| study preflights (`--all`) | every study PASS |
| sealed files (every study's `seals.jsonl`) | 1,073 sealed files, 1,019 read-only (Phase 7's 999 + this study's 20), 0 writable, 0 content differences |
| integrity diff since the Phase 7 base `fc027eed` (outside the pilot's namespaces) | only `.gitignore` (+5) and `package.json` (three npm scripts) |
| Strategy Lab portfolio parity | ALL VERIFIED (the five frozen pooled candidates incl. New L0) |
| Strategy Lab typecheck / lint / Vitest / build (scratch dir) | pass / pass / 314 of 314 / pass |
| Strategy Lab Playwright | 80/81 then 81/81 on the rerun (the failure `candles.spec.ts:439` is a known timing race; the pilot changed nothing under `apps/`) |
| Strategy Lab state / live dist | fingerprint identical before and after; live `dist` untouched |
