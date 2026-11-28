# STAGE_B_OPTION — a replicated GPU optimization, proposed as an option only (NOT executed, NOT authorized)

**Status: proposal for the user's review. Nothing here has been run, frozen or authorized.** It exists because the
predeclared rubric (PROTOCOL.md §6.4) proposes a Stage B when its item 1 holds at one cutoff at least — and item 1 holds
at C24 (`REPORT.md` §6). It also records the rubric's own qualifier: **item 2 does not hold at either cutoff**, so on the
fixed candidates BD 30 % removes the cost of BD 25 % **without showing any gain over the original 35 % control**. A
Stage B could therefore only test the *search-path* hypothesis — that a search run under the relaxed envelope explores
regions the control does not — for which the pilot itself provides no supporting evidence (its EXP lanes never re-found
the control's best C21 region, and at C24 they settled in a lower-profit region). The audit's recommendation
(`DECISION_REGISTER.md` R5–R7) is that Stage B is **optional and low priority**: worth running only if the user wants
the envelope's principal and banked-capital protection for its own sake and therefore needs a replicated
**non-inferiority** test of it against the control, not a search for higher profit.

## 1. The question a Stage B would answer

> With the same NL0 / Assignment 3 broad lane, cells, schedules, costs, data and doors, and **new, paired, replicated
> seeds**, is the best qualified centre net found under P3 (marked DD ≤ 40 % of C0, trade PL ≤ 25 % of funded principal,
> BD ≤ 30 % of C0, liquidation basis) non-inferior to the one found under P0 (marked DD ≤ 35 % of C0), and how do the
> two arms' selections behave on the following retrospective intervals?

## 2. Arms — the smallest defensible set

| Arm | Policy | Why |
|---|---|---|
| **CTRL** | P0 `nl0-control@1.0.0` | mandatory: the authoritative reference (brief §7.5) |
| **EXP-30** | P3 `sens-p3-40-25-30@1.0.0` | the smallest relaxation that kept **every** control candidate the 25 % gate removed (1 member at C21, 3 at C24), with the 25 % principal-loss gate retained |

Not proposed, with the reason:
- **P4 (BD 35 %)** — on these candidates it changes no qualification verdict relative to P3 at either cutoff, and its
  extra centre-level admissions are lower-profit (`REPORT.md` §4, §6). Add it only if the user explicitly wants the upper
  authorized bound tested (+50 % compute).
- **P1 (DD 40 % only)** — removes the principal / banked protection that motivates the envelope; on these candidates it
  produced the same best outcomes as P3.
- **P2 (BD 25 %)** — already run once by the pilot; its 25 % gate is the documented cause of the C24 exclusion.
- P5–P8 — diagnostic ablations, not candidate policies.

## 3. Design

| Item | Proposal | Rationale |
|---|---|---|
| Search code | the pilot's generated lane (`src/vg-l0-risk-envelope-pilot/search.ts`) with P3 as the experimental policy — a new, separately frozen study namespace; no change to the lane, the schedules, the instrument, the objectives (−net, −robust, p90 DD) or the selectors | the only intended difference is the risk policy |
| Cells | `GA0.VA0` and `GB0.VD1` (the pilot's predeclared cells) | comparability with the pilot; adding cells is a separate decision |
| Cutoffs | **C21 and C24** (as the pilot), each fold's selection sealed and committed before its interval opens; optional **C19** (→ 2020–2021) for a third chronological slice | more chronological evidence; C19's CTRL R1/R2 lanes are Assignment 3's sealed lanes |
| Seeds | **8 new paired replicates per cell and cutoff: R3–R10** in Assignment 3's seed namespace (`<cutoff>/broad/<cell>/R<r>`; the arm never enters a seed). R1/R2 (already known: Assignment 3 and the pilot) are reported separately and excluded from the decision statistic | genuinely new, paired search paths; Assignment 3 used only R1/R2 for these cells (verified: `research/vg-l0-full-joint/results/search/C2x/broad1.json`) |
| Lanes | 2 arms × 2 cutoffs × 2 cells × 8 replicates = **64 lanes** (96 with C19) | |
| Budget | per-lane cap 41,000 (unchanged); matched schedules; expected ≈ 17,200 requested per lane at C21 and ≈ 14,600 at C24 (the pilot's means over both arms) → **≈ 1.02 M** search + qualification of the union shortlists (≈ 96 members + 2 benchmarks per cutoff × 653 ≈ 128,000) + intervals ≈ **1.15 M requested** (deterministic bound ≈ 2.8 M; a ceiling set before the freeze) | |
| Qualification / selection | union qualification per cutoff (identical draws for both arms); Q1–Q6 per arm; the NL0 P0 rule and RA1-original per arm; New L0 / N/original descriptive only | as the pilot |
| GPU path | official only: `openOfficialGpuSession` → `GpuPool` → `EvalLab` on the ACCEPTED Phase 7 record (`bb0e3fcf…`), risk envelope on every evaluation, `node --no-maglev`, one GPU job at a time, `vgl0*.slice` 44G / 48G | standard 3.0.0 §9 |

## 4. Precommitted decision statistics (to be frozen in Stage B's own protocol before any search)

- **Lane-pair statistic** per (cutoff, cell, replicate): D = (best qualified centre net in the EXP-30 lane's shortlist
  under P3) − (the same for the CTRL lane under P0); 16 pairs per cutoff.
- **Non-inferiority of P3:** the lower 90 % bound (paired bootstrap) of mean D > −$5,000 at both cutoffs.
- **Superiority:** mean D > +$2,500 at both cutoffs with its lower 90 % bound > 0.
- **Population statistic:** the P0 rule on each arm's pooled shortlist per cutoff (the pilot's Δ), with the pilot's
  $2,500 margin; reported beside D, never replacing it.
- **Chronology (retrospective, previously inspected):** each arm's primary on 2022–2023 (C21) and 2025–2026 (C24),
  interval DD with the pilot's $5,000 non-inferiority margin; reported, never used to choose a threshold.
- **Power, stated honestly:** if lane-level best nets differ by ≈ $9–16k between replicates (the replicate noise the
  pilot cites from Assignment 2), D has a standard deviation of ≈ $13–23k for nearly independent search paths, so the
  standard error of mean D over 16 pairs per cutoff is ≈ $3–6k. Stage B can detect differences of roughly $10k; it
  **cannot** resolve a $2,500 difference. Doubling to 16 replicates (≈ 2.3 M evaluations, ≈ 4 GPU-hours) lowers the
  standard error only by √2, to ≈ $2–4k.

## 5. Measured GPU-time estimate

Throughput measured by the pilot on the accepted evaluator (sealed `results/search/C2x/<arm>.json` `compute`; one GPU job,
4 concurrent lanes, batch 8,192, 8 host workers):

| Phase (4 lanes) | Requested | Fresh | Wall |
|---|---:|---:|---:|
| C21 CTRL | 71,314 | 70,756 | 338 s |
| C21 EXP | 66,228 | 61,534 | 329 s |
| C24 CTRL | 62,488 | 61,955 | 480 s |
| C24 EXP | 54,502 | 51,578 | 463 s |
| qualification, 26 members (each cutoff) | 16,978 | 16,978 | 18–24 s |

At that measured rate (≈ 84 s per lane at C21, ≈ 118 s per lane at C24, run four lanes at a time): 32 lanes at C21 ≈ 45
min, 32 lanes at C24 ≈ 63 min, qualification ≈ 3 min, intervals < 1 min, plus gates, preflights and attestations ≈ 15 min
→ **≈ 2.1 GPU-hours** for the 64-lane design (≈ 2.9 h with C19, assuming C19's shorter door is no slower than C21). This is an extrapolation of the pilot's measured
4-lane throughput; running more lanes per job could be faster but is not measured, and is not assumed.

## 6. Safeguards

- The 30 % level was chosen **after** the pilot's outcome; Stage B must freeze it (and every other item) before its first
  search and may not tune it afterwards. A favourable Stage B would still be one replicated study on one market history
  with two correlated, previously inspected intervals — evidence for a user decision, never an automatic change of the
  standard, NL0 1.0.0 or the deployed reference.
- The control (P0) stays the authoritative method; New L0 and N/original stay descriptive benchmarks, never injected.
- Every engineering gate of the pilot is repeated (E1–E6 equivalents: acceptance, CTRL = Assignment 3 on R1/R2 replays,
  CPU = GPU mini-pilot, stage-wiring tests for P3's 30 % limit, preflight, live gate).
- D23 and FULL open only behind sealed, committed selections; FULL once.

## 7. What Stage B would not tell

It would not show that any envelope controls future losses (the limits are eligibility constraints on historical
paths, never stops), and it would not compare against staged trailing-stop ideas, which change trading behaviour and are
a separate line of work.
