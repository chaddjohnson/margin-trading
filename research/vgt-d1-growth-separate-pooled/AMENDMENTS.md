# AMENDMENTS — vgt-d1-growth-separate-pooled

Append-only. Each entry: ID, UTC time, what changed, why, which results existed, and its effect. Nothing here changes a
case, a comparator, a neighbourhood family or a statistic after a result exists. Engineering entries are `E*`,
operational entries `O*`.

- **E1 (2026-11-08T21:55Z, reporting label only; after S4 was sealed).**
  - **The defect.** In `results/neighbourhood.json` (sealed, sha256 `8b77e6f5…`), the descriptive `reused[].scope` text
    reads "joint" for the three standalone controls (D1 primary alone, Growth #4 alone, Growth 08500a60 alone). In
    Priority 2 those controls were qualified with a single-family scope: `stages.ts` line 251 sets `need` to the
    enabled family, and `scopeOfNeed` maps it to D1-only or Growth-only perturbations.
  - **What is unaffected.** The statistics in the record are Priority 2's sealed evidence, copied verbatim; only the
    label was computed here, from `kind`, which is `control` for all of them.
  - **The correction.** The sealed record is not rewritten. `tools/vgt-d1-growth-separate-pooled/tables.ts` derives the
    scope by Priority 2's rule, and the report uses the corrected labels.
  - **Effect.** No number, case, comparator or statistic changes.
