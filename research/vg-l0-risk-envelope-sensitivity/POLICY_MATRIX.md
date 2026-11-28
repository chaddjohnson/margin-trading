# POLICY_MATRIX — Stage A risk-envelope sensitivity audit (RES-A 1.0.0)

**Predeclared** before any comparative result of this audit was computed (committed with `PROTOCOL.md`; the commit is
recorded in `RESEARCH_RECOVERY.md`). Nothing here is an approved constraint, a change of the optimization standard, a
change of NL0 1.0.0 or a deployment rule. P0 stays the authoritative reference; every other policy is a retrospective,
exploratory counterfactual on candidates that were already evaluated.

## 1. The nine policies

Every percentage is a whole percent of a **named denominator** and becomes a dollar limit by `src/risk-envelope/policy.ts`
`limitOf(pct, denominator) = (denominator × pct) / 100` (exact in binary64). `C0 = $100,000`, the one fixed,
non-compounding funded slot. "—" = no separate gate (the value is still reported).

| Policy | id (this audit) | Marked max DD / C0 | Trade principal loss / funded principal (liquidation) | Banked-capital DD / C0 (liquidation) | Dollar limits at C0 = $100,000 | Role |
|---|---|---:|---:|---:|---|---|
| **P0** | `nl0-control@1.0.0` (= `policy.ts NL0_CONTROL`, unchanged) | 35 % | — | — | $35,000 / — / — | original NL0 control; the reference |
| **P1** | `sens-p1-dd40@1.0.0` | 40 % | — | — | $40,000 / — / — | primary: isolates the marked-DD relaxation |
| **P2** | `re-40-25-25@1.0.0` (= `policy.ts RE_EXPERIMENTAL`, unchanged) | 40 % | 25 % | 25 % | $40,000 / $25,000 / $25,000 | primary: reproduces the completed pilot's EXP arm |
| **P3** | `sens-p3-40-25-30@1.0.0` | 40 % | 25 % | **30 %** | $40,000 / $25,000 / $30,000 | primary: principal protection, less restrictive banked gate |
| **P4** | `sens-p4-40-25-35@1.0.0` | 40 % | 25 % | **35 %** | $40,000 / $25,000 / $35,000 | primary: the highest authorized banked sensitivity |
| **P5** | `sens-p5-40-pl25@1.0.0` | 40 % | 25 % | — | $40,000 / $25,000 / — | diagnostic ablation: the PL gate alone |
| **P6** | `sens-p6-40-bd25@1.0.0` | 40 % | — | 25 % | $40,000 / — / $25,000 | diagnostic ablation: the banked gate alone at 25 % |
| **P7** | `sens-p7-40-bd30@1.0.0` | 40 % | — | 30 % | $40,000 / — / $30,000 | diagnostic ablation: the banked gate alone at 30 % |
| **P8** | `sens-p8-40-bd35@1.0.0` | 40 % | — | 35 % | $40,000 / — / $35,000 | diagnostic ablation: the banked gate alone at 35 % |

- **P0–P4 are the primary decision comparisons; P5–P8 are diagnostic ablations.** They are nine views of one fixed
  candidate population, never nine independent optimization studies, and none is promoted to a standard.
- **No banked-capital ceiling above 35 % is considered** (brief §2).
- The P3–P8 objects are constructed in the audit's own tool (`tools/vg-l0-risk-envelope-sensitivity/policies.ts`) as
  `RiskEnvelopePolicy` values and passed to the unchanged `policy.ts assess`; `policy.ts` itself (and its `POLICIES`
  registry) is not edited. A test in the tool asserts that the P0 and P2 objects are deep-equal to `NL0_CONTROL` and
  `RE_EXPERIMENTAL`.

## 2. Metric bases (the canonical record fields; no improvised equivalents)

| Metric | Gated value | Reported twin | Denominator | Definition |
|---|---|---|---|---|
| Marked conventional maximum DD | record `dd` | DD^L only where the pilot's CPU diagnostic already has it | C0 | strict running-peak tracker of the marked net, every regular-session minute close while held and every session close, from the door's first session (standard §0.3) |
| Trade principal loss (PL) | `envelope.principalLossLiquidation` | `envelope.principalLossMarked` | each funded lot's entry principal (= C0 in the fixed slot) | max over funded lots of max(0, −min λ_i), λ = marked lot P&L − the open shares' exit cost, with the engine's costs and interest |
| Banked-capital DD (BD) | `envelope.bankedDdLiquidation` | `envelope.bankedDdMarked` | C0 | max_t [H(t) − M^L(t)], H(t) = max(0, best realized net so far), M^L the liquidation-equivalent portfolio value; can arise within one position; not a streak of realized losses |

- Every comparison is made in **dollars on the unrounded archived record values**; ratios (% of C0) are reported, never
  compared. **A value exactly equal to its limit passes** (`value ≤ limit`).
- The four envelope values are validated by `src/gpu-backend/lab.ts checkEnvelope` on every read (finite, ≥ 0,
  liquidation ≥ marked); a missing or invalid envelope where a policy needs it fails closed (it is never defaulted).
- **Basis.** The gated PL and BD are always the liquidation basis (pilot decision D-3). The marked twins are reported
  beside them; the count of centres whose verdict would differ on the marked basis is reported descriptively and is
  never a decision input.
- **No ordering is assumed** between BD and the conventional DD: partial sales can make a banked high exceed the marked
  running peak, so BD > DD is possible and is counted, not "corrected".

## 3. Where each policy is applied (the only counterfactual is the risk-envelope policy)

| Level | Rule under policy P | Source of the values |
|---|---|---|
| Centre eligibility ("plausibility") | `!error ∧ net > 0 ∧ assess(centre, P).pass ∧ both families funded` (the pilot's `plausibleArm`, with P as the arm policy) | the archived centre record and envelope |
| Search-stage (rung) feasibility | the pilot's `violationArm(centre, nb, nbRecs, arm(P)).violation === 0` — net, every gated centre metric, every gated neighbourhood p90 and structure; the violation total keeps NL0's 1e-6 rounding (pilot P6) | the archived rung neighbourhoods (rung 1 = 16, rung 2 = 64, rung 3 / refinement endpoints = 128, refinement = 16 draws), regenerated exactly (`neighbourhood(cfg, {name: rung, n, labels: [rung, cutoff]})`) and read from the archive |
| Qualification Q1–Q6 | Q1 centre net > 0; **Q2** `assess(centre, P).pass`; **Q3** confirmation p90 of every metric P gates ≤ its limit; Q4 confirmation p10 net > 0; **Q5** at 10 bps per side: net > 0 ∧ `assess(10 bps record, P).pass`; Q6 a D1 book and Growth·VGT both funded at the centre | the sealed qualification evidence (`results/qualification/C2x.json`) and the confirmation draws (3 × 128) read back from the qualification archive |
| Selection (counterfactual selectors) | NL0's P0 rule (`originalOrder`) and Assignment 2's RA1-original (`ra1Order`, S4 35 % of C0), imported unchanged, applied to the members qualified under P | the sealed evidence |

Everything except the risk policy is held fixed: Q1, Q4, Q6, the stresses, the instrument (radii, draws, seeds,
fidelities), the selectors and their thresholds, the trading rules, the engine, costs and interest.

## 4. The neighbourhood statistic per policy (CTRL's cents versus EXP's unrounded p90)

| Policy | Q3 / rung p90 statistic | Q4 p10 statistic |
|---|---|---|
| P0 | Priority 3's `nbStats` p90 DD **rounded to cents** — the frozen NL0 / Assignment 3 instrument (CTRL) | `nbStats` p10 (cents) |
| P1–P8 | the **unrounded** p90 of every gated metric over the family (`fitness.ts envNbStats`; a failed neighbour = +∞) — the EXP instrument | the unrounded p10 (a failed draw = −C0) |

For every member and every policy the audit also computes the verdict under the **other** instrument and reports every
case in which the two differ (they can differ only when a p90 lies within $0.005 of a limit). Such a case is
investigated and disclosed, never silently normalized. Quantiles interpolate linearly between order statistics
(`src/vg-d1-growth-joint/fitness.ts quantile`).

## 5. Boundary, rounding and failure rules

- `value ≤ limit` passes; +1 ulp above fails. No display rounding enters any decision; tables round for display only.
- The violation total's 1e-6 rounding applies only to the search-stage feasibility (it is NL0's mechanics, pilot P6); a
  stage verdict that differs between the rounded and the exact comparison is counted and reported.
- An evaluation error is never eligible (Q1/Q2 fail; a failed neighbour counts as +∞ in every metric).
- A record without a valid envelope where P gates on it throws (fail closed); the population inventory reports any such
  record (expected: none — every pilot evaluation requested the envelope).

## 6. Binding metric and distance from a threshold

For a centre that fails P, the **binding metric** is the gated metric with the largest dollar excess over its limit
(ties: DD, then PL, then BD); every failing metric is also listed. For a centre that passes, the **closest metric** is the
gated metric with the smallest dollar slack. Distances are reported in dollars and in % of C0 (PL's denominator equals
C0 in the fixed slot, so its dollar distance is also % of its funded principal × 1,000).

## 7. Growth boundedness and giveback attribution (descriptive labels)

- **Bounded Growth** = Growth maximum hold ON or initial stop ON; **open-ended** otherwise (pilot D-9).
- **Giveback-dominated** = the D3 account partition's unbanked-profit giveback U ≥ ½ of the conventional marked DD
  (`src/risk-envelope/diagnostics.ts componentDrawdown`, marked basis; `DIAGNOSTICS_SPEC.md`). U, E (banked-profit
  erosion) and F (starting-capital loss) are reported in dollars. They need a portfolio path, which the archive does not
  hold: they come from the bounded CPU diagnostic replays declared in `PROTOCOL.md` §5 (G2).
