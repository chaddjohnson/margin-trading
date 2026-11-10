# Amendments — Priority 3B (vg-d1-growth-expanded)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Entries `R*` precede the
protocol freeze; after it, `A*` (substantive) or `O*` (operational). Criteria are never loosened by amendment once
results they govern exist.

## Before the freeze

### R1 — 2026-11-09T18:05Z — the extension rule's "new behaviour" trigger is a new funded-component pattern

- **Change.** §7.5's new-behaviour trigger was drafted as a new feasible class keyed by cell × gate pair × eligibility
  pair × funded-component set. It is now a new feasible **funded-component pattern** within the lane's cell (which D1
  and Growth books receive capital at the centre).
- **Why.** The first engineering pilot (`pilot-p1`, P18 on D19, pilot budgets) showed the drafted key firing on
  combinatorics alone ("5 new feasible behaviour classes" with 0.0% hypervolume, robust and net progress), which would
  push every lane to its extension cap regardless of progress. A new participation pattern is the behaviour that
  matters here (e.g. the first feasible pool funding both Growth books).
- **Results that existed.** Pilot mechanics only (counts and trigger strings on D19 with pilot budgets); no study
  record.
- **Effect.** Extensions now follow real progress or genuinely new participation; caps unchanged.

### R2 — 2026-11-09T18:09Z — post-freeze completion of the post-C24 stages' code declared (§14)

- **Change.** §14 now states that the diagnostics, frozen-selection, validation and report-table code may be completed
  after the freeze, before those stages run, never touching the evaluation code, with an `O*` amendment recording the
  new code closure.
- **Why.** The searches take most of the wall-clock; implementing those stages while they run does not change any rule
  (they implement §11 as written).
- **Results that existed.** None of the study.
- **Effect.** Operational; no rule changed.

### R3 — 2026-11-09T18:14Z — exact informed design counts

- **Change.** §7.4's informed-lane figures were approximate (≈ 21,800 / ≈ 38,200); they are now the exact counts of the
  frozen seed designs: 4,775 (fixed) and 4,824 (joint) distinct designs, i.e. 21,159 / 37,543 and 21,208 / 37,592
  distinct proposals at base / cap.
- **Results that existed.** None (the counts are computed from the seeds and labels only).
- **Effect.** Wording only.

### R4 — 2026-11-09T18:33Z — the header records the sealed gates and the pilot; E4's count; re-adoption

- **Change.** The protocol header now cites the sealed engineering gates (`results/parity/parity.json`, 233 checks, 0
  failed) and the pilot record (`results/pilot/PILOT.md`); §12's E4 states the count that ran (96 random
  configurations, 12 per cell: 24 V, 24 G, 48 B) instead of "48 of each inclusion choice"; `STANDARD_ADOPTION.json`
  re-adopted with the new protocol sha256.
- **Results that existed.** Engineering only (gates, pilot mechanics); no search, qualification or fold result of the
  study.
- **Effect.** Wording only; no rule changed.

## After the freeze (disclosures; no rule, record or result changed)

### A1 — 2026-11-10T10:40Z — the fixed-D1 lane's search neighbourhoods perturbed the Growth books only

- **What the code did.** In `informed-fixed`, every search-time neighbourhood (rungs 1–3 and refinement fits) restored
  VG #2's D1 vectors after the perturbation (`search.ts` `fitMany` applies the lane's `fixedUp` to each neighbour), so
  those rung statistics moved only the enabled Growth books — effectively scope `g` — while §8.2 lists the joint scope
  for the rung families. The near and broad seed designs were likewise Growth-only after the reset (intended: the lane
  freezes D1).
- **What it did not affect.** Qualification (selection, fresh confirmation, scopes, small/wide, archived instrument)
  used the joint instrument for every member of every lane, so every gate verdict, role and C4 label is on the common
  instrument. The other lanes are unaffected.
- **Found:** while auditing the sealed informed search record after the chain (the C4 refinement's robust net differs
  between the two lanes at the same start).
- **Effect.** A disclosure: the fixed lane's search-internal promotion measured robustness to Growth perturbations only;
  its shortlist members were then qualified on the joint instrument like everyone else.

### A2 — 2026-11-10T10:40Z — refinement could switch a B configuration to V or G in the independent B cells

- **What the code did.** The refinement move set (`config.ts` `movesOf`) adds the inclusion moves B → V and B → G for
  every B configuration, not only in the informed lanes as §7.3 states ("the inclusion moves of the informed lanes").
  The V/G → B moves (which need a partner vector) were informed-only, as stated.
- **Where it mattered.** Across C19, C21, C23 and C24 exactly one shortlisted independent member left its cell's
  inclusion: C24 `B_GDX-breakout_VGT-breakout#1 profit` is a V configuration (its profit refinement dropped Growth·GDX);
  it failed Q3 and holds no role. No fold role holder and no fold primary was affected; the independence of the procedure
  (no incumbent, control or later vector) is unaffected.
- **Effect.** A disclosure; reported in the coverage and near-miss tables with its actual inclusion.
