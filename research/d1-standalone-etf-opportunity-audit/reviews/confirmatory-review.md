# Confirmatory review: D1 standalone ETF opportunity audit (pre-freeze)

> Saved verbatim from the independent read-only reviewer (the same agent as `methodology-review.md`), received
> 2026-10-27 ≈ 16:27Z. Dispositions of N1–N5: `METHODOLOGY_DISPOSITIONS.md` (section "Confirmatory review").

**Reviewer:** independent, read-only. Nothing was written and no backtest was run.
**Checked at:** 2026-10-27, about 16:25Z.
**State checked:**
- HEAD `b21ed711`; still uncommitted
- `PROTOCOL.md` `0ee71a96…`, `SHORTLIST.json` `6ca7c91d…`
- `results/catalog/catalog.json` (v2), `catalog-v1-superseded.json`, `results/designs/designs.json` (21 phenotypes, 128 joint vectors each)
- Code: `standing.ts`, `analysis.ts`, `events.ts`, `catalogs.ts`, `batch.ts`, `freeze.ts`, `specs.ts`, `cli.ts` and both test files

## Status of each original finding

| # | Status | Reason |
|---|---|---|
| C1 | **Resolved** | Flags, F4/F8 states, standing, axes, ties, "stronger" and the ETF rule are pure functions in `standing.ts`. `standing.ts`, `analysis.ts`, `events.ts`, `catalogs.ts`, both test files, the catalog and the designs are all bound in `freeze.ts`. §11 leaves only report text unbound. Small gaps: N3 and N4 below. |
| C2 | **Resolved** | `etfStandingOf`: the representative decides; an unsupported (iii) alternative demotes an ETF from (i) to (ii); the better alternative never promotes. Tested. |
| C3 | **Resolved** | `checkBaseParity`/`requireBaseParity` fail closed. They check all 19 phenotypes and the procedure-matched control against their stored Stage A records, and VGT primary against the sealed B1 control. Every other Stage C family and `analyze` refuse until it passes. |
| M1 | **Resolved** (see N1) | Dip-entry and dip-capture are defined, with the breakdown by setup. F4 works on major families. F4 "insufficient" blocks (i). Coverage is in the bound catalog (40–96%). |
| M2 | **Resolved** | F10 (neighbourhood drawdown) added; it blocks (i). |
| M3 | **Resolved** | The procedure-matched control (VGT's final research representative) is loaded with its hash checked. Axes are reported against both controls. "Stronger" also needs at least 2 axes against the matched control. |
| M4 | **Mostly resolved** (see N2) | F8 now separates negative, no evidence, and hindsight (not assessable). The VGT instrument gets a period-correct F8. The conditioning of F8 on selection is disclosed. |
| M5 | **Resolved** | KRE/XLE/EWZ text corrected. The 96-second v1→v2 reaction is disclosed. The counterfactual list is published. KBE is described as marginal. |
| M6 | **Resolved** | Every OAT point and joint vector, with relative shifts and each ETF's volatility, is bound before any result; the confounding is disclosed. |
| M7 | **Resolved** | `requireFrozen` now refuses on any tracked change outside the study, any untracked file outside it, or any `package.json` change beyond the one script line. |
| M8 | **Resolved** (see N1) | An axis must hold on the pooled samples and on each seed. Ties count as met but not as strictly better. "Stronger" needs one strictly better axis. Joint designs now use common random numbers (tested), and VGT primary's vectors are unchanged. |
| M9 | **Resolved** | The §0 bias disclosures are present. |

## Catalog v1 → v2 (anchored 126-session families)

**Legitimate: yes.**
- The change is price-only and was made before the freeze, when no strategy outcome existed.
- v1 is kept and bound, and the change is disclosed in §7.
- The motivation is about whether the measure means what it claims (an eight-year "family" is not one dip event), not about results.
- The new rule does not decide which ETF passes: every catalog now has at least 2 eligible major families, and the parts that do discriminate (dip captures, neighbour capture) depend on runs that do not yet exist.

**Sensible: partly.** It goes from too coarse to somewhat too fine. Family counts in v1 → v2:

| Symbol | v1 families | v2 families (eligible / eligible major) |
|---|---:|---|
| FXI | 3 | 11 (9 / 6) |
| GDX, XME, SLV | 1 each | 12 each (10 / 4–5) |
| VOOG | 3 | 5 |
| VGT | 7 | 8 |

- A 6-month anchor makes two legs of one bear market (2022; March 2020 and September 2020) count as two independent events. The brief warns against exactly this ("multiple snapshots of nearly the same historical opportunity are not separate market episodes").
- It also mechanically raises the raw "dip families" axis for volatile ETFs: 10 eligible families for GDX, XME and SLV against 7 for VGT.
- See N1 for the fix.

## New problems introduced by the changes

**N1. Independence in F1 and the families axis is loose under v2.**
- Add a predeclared, pure-function stricter count: base dip families whose troughs are at least 252 sessions apart (greedy, chronological).
- Require F1's "≥ 2" to hold on that count, and use it for the families axis.
- Keep the 126-session families for F4 and the tables.
- Disclose that 126 was chosen after seeing v1's price-only counts.

**N2. "Stronger" can be granted with no period-correct fold evidence at all.**
- F8 "no evidence" never blocks, even when both folds have no lot. A sparse ETF could therefore be labelled a "stronger historical case than VGT" with zero T-retro evidence.
- Leaving "no evidence" non-blocking for (i) is defensible given how rarely D1 trades. But "stronger" should require F8 = pass, or at least one fold with V > 0 and none negative.
- Show the F8 state beside every (i).

**N3. The capture definitions have no unit tests.**
- `isDipEntry`, `dipCaptured`, `familyNetOf` (eligible episodes only) and `coverageOf` feed F1, F4 and the families axis.
- Add synthetic tests for these cases:
  - a decline-phase entry
  - rebound-phase entries just above and just below 50% of the episode's depth
  - an ineligible episode's lots excluded from its family net
- The test files are bound, so do this before the freeze.

**N4. Stale comment in a bound file.**
- `events.ts` lines 9–10 (and line 13) still describe the chained 63-session family rule and the old "captured" definition.
- Fix the comment now; otherwise it becomes a post-freeze amendment.

**N5. Fold-run parity only runs in `verify`.**
- Fold boundary parity (mark at the search end equals the stored Stage A net) is checked only in `verify`, after `analyze` has already used fold V to set F8.
- `analyze` should throw if any fold's boundary parity is below 100%. This is a fail-closed precondition, like base parity.

**Chronology and isolation:** no regression found.
- `catalogs.ts` and `analysis.ts` read prices only through `candidateUniverse` (≤ 2023-12-29).
- The recomputed catalog must equal the bound one, or `analyze` stops.
- The full-history door is still used only for registered targets, and there is a test that GDX, VGT-research and registry-file requests are refused.
- `standing.ts` logic matches §10 as written. I found no misclassification bug beyond N1 and N2.

## Ready to freeze

**Yes, conditional on one of these, done before running `freeze`:** apply N1–N5 (each a few lines, and no outcome exists yet), or record a reasoned decision to decline them in `METHODOLOGY_DISPOSITIONS.md`. None of N1–N5 is a validity blocker in the way the original C1–C3 were.
