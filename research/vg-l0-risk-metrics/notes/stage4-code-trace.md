# Working note — Stage 4 code trace (subagent output, 2026-11-18; to be spot-checked before it is relied on)

Produced by a read-only subagent of this session from the code on `research/vg-l0-risk-metrics` (= Assignment 3's code).
Every claim must be spot-checked against the cited lines before SELECTION_PIPELINE_AUDIT.md states it. Paths:
FJ = `src/vg-l0-full-joint/`, A2 = `src/vg-l0-risk-families/`, P3 = `src/vg-d1-growth-joint/`, 5B =
`src/vg-lifecycle-matched-optimization/`.

## Where each risk quantity acts

| Quantity | Discovery (screen → shortlist) | Qualification | Selection / refine plan | Folds / final |
|---|---|---|---|---|
| centre marked DD vs $35k | plausibility (A2 fitness.ts:18-19); feasibility violation term (A2 fitness.ts:21-32,45-61); NOT an NSGA objective | Q2, Q5 | tie-break only | sequential DD ≤ 35k; V2/V3; successor (c),(d) |
| neighbourhood p90 DD | feasibility term; NSGA objective 3; hypervolume axis; banded order; balanced pick | Q3 (confirmation) | roles; refine-plan lower-DD slot | successor (c) |
| worst-10% mean DD | — | report-only | RA1 S4 | successor (d) |
| marked centre net | plausibility, feasibility, objective 1, promotion, moves, shortlist | Q1, Q5 | original rule key 1 | sequential net, V1 |
| realized/unrealized split, open lot | none | report-only | RA1 S1, S2, conservative net | switch charge counts open lots |
| worst trade / MAE | none (MAE needs detail mode; search runs without it) | detailed centre only | RA1 S3 | successor (d) |
| stop level, giveback, realized-only curve | never | never | never | fold giveBack report-only |
| occupancy | none | detailed centre | RA1 step 2 | — |
| both families funded | plausibility; violation +0.5 per unfunded family | Q6 | via qualified | — |

- Plausible = `net > 0 && dd <= 35000 && mixed` (A2 fitness.ts:18-19). Screen violation = net part + max(0, dd−35k)/35k +
  0.5 if not mixed (FJ search.ts:442-446). Implausible screen proposals can still be promoted by the constrained-rank
  share (after every plausible one) or the diversity fill, but **an implausible centre can never become feasible** (its
  net/DD/structure terms are centre-only); it can only act as an island parent.
- Rung-1 neighbours are measured only for plausible centres (FJ search.ts:339-378); unmeasured → p90 term 1, objectives
  [−net, 100000, 1e9]. Feasible ⇔ net > 0, centre DD ≤ 35k, measured p90 ≤ 35k, both families funded.
- NSGA-II: Deb's constrained domination (src/optimizer/nsga2.ts:16-42); objectives [−centre net, −robust, p90 DD];
  (μ+λ) survival fills whole fronts — an infeasible member survives only if < 32 feasible exist.
- Rungs 2/3, refinement (feasible moves, ≥ $2,000 gain; FJ search.ts:816-856), shortlist (feasible only, FJ
  search.ts:872): every later stage requires centre DD ≤ $35k and measured p90 ≤ $35k.
- Verified example: lane C24/broad/GA0.VA0/R1 — 14 of 512 screen proposals plausible; screenReasons 84/253/161/14.

## Engineering recipes (for bounded, read-only evidence)

- Screen proposals of a Track I lane: `screenGenomes(512, 'coarse', 'screen', seedKey).map((g, i) => pinStratum(g, cell,
  i, 512))`, decode (skip invalid), dedupe by cfgId (FJ space.ts:526-560, 661-681; search.ts:404-427). Their records:
  archive `points` key = `evalKeyOf(door, cfg, vOptions)` (FJ space.ts:394), records encoded (decode with
  growth140-vgt-s8m/store.ts). The `configs` table (key = cfgId) holds every fitted centre of a job (no lane attribution).
- Record fields: `worstLoss` = min(0, min lot final net) (not intratrade); `peakValue` = max market value of a held lot;
  `lossSum`, `largestWin`, `realized`, `unrealized`, `periods` ([] in search records).

## Flags raised (uncertain impact)

1. Occupancy counts sessions with a lot held at the start, intrasession or at the close (pool.ts:433,523,581,587); prose
   says "at the close".
2. Feasibility rounds violations to 1e-6 (a p90 in (35,000, 35,000.0175] is feasible in search; Q3 strict).
3. Diversity fill tie handling (FJ search.ts:500-505) can accept a candidate below the best minimum distance (5B same).
4. Stagnation test with bestNet = −∞ yields NaN (FJ search.ts:734).
