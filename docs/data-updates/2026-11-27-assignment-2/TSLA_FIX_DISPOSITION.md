# TSLA outcome identity fix (`fix/tsla-outcome-identity-join`): disposition — INTEGRATED

**Decision: integrated** by the merge commit `efd7454b`, which merges `b0a18659` (= origin) into the integration
branch. The original branch is unchanged.

## 1. The problem and the intended behaviour

- **Where:** `src/tsla-d1-growth/outcome.ts` at `421e4c87`.
- **The defect:**
  - It joined validation rows to finalists by `label`.
  - Before the join, `preDetermination` had replaced each finalist's candidate label with its *governance* label.
  - No row could match, and a missing row became `validation: null` and `c: false` silently.
- **Its effect on the sealed outcome:**
  - `research/tsla-d1-growth/results/outcome.json` (`a414631e…`) has `validation: null` for all 17 finalists and an
    empty development-only list.
  - The binding conclusion is unaffected: every architecture's fold DD exceeds $35,000, so no finalist could be a
    candidate. The result stays **NO QUALIFYING TSLA CANDIDATE**.
- **The fix:**
  - `src/research-outcome/identityJoin.ts` `joinByIdentity` joins by `(arm, id)` (key `JSON.stringify([arm, id])`). It
    fails closed with `IdentityJoinError` on an invalid, duplicate, missing, cross-arm or consumed-twice identity, and on
    a caller-reported conflict: a candidate-label mismatch, a missing label or malformed V1–V3.
  - Only `selected` rows are eligible; controls never join.
  - The output schema is additive only: `candidateLabel` and `governanceLabel`; `label` keeps its sealed meaning.

The full account is the fix's own record, `docs/engineering/tsla-outcome-identity-fix/` (REPORT, SOURCE_DIFF,
TEST_REPORT, OUTCOME_RECONCILIATION, DECISION_REGISTER).

## 2. The reported conflict was not real

- **Assignment 1's claim:** `CROSS_BRANCH.md` predicted "a likely merge conflict" in `identityJoin.ts` and its test.
- **What is actually on both sides:**
  - The lineage (`research/gdx-d1-growth`) had cherry-picked the fix's first commit `aca31b5f` as `a33c6ff1`.
  - Both files are byte-identical on both sides: `identityJoin.ts` blob `85cb8e09`, the test `cd841239`.
  - `src/tsla-d1-growth/outcome.ts` was untouched on the lineage since the merge base `421e4c87`.
- **Result:** `git merge-tree --write-tree f2c414ef b0a18659` exits 0 with no conflicted path. Nothing needed resolving,
  and both sides' changes coexist unchanged:
  - the date-boundaries changes;
  - the GDX study's own use of `joinByIdentity` (`src/gdx-d1-growth/outcome.ts`);
  - the TSLA correction.

## 3. Verification in the combined tree (integration worktree, after the merge)

| Check | Result |
|---|---|
| `node --test src/research-outcome/tests/*.test.ts src/tsla-d1-growth/tests/*.test.ts` | **55 / 55 pass**. They include the generic join's duplicate, missing, cross-arm, ambiguous, mismatched-label and malformed-flag cases (fail closed); the reproduction of the sealed pre-fix outcome by the old function; and the corrected join on the sealed inputs |
| `node … tools/tsla-outcome-identity-fix/replay.ts --out <scratch>` (report-only, refuses `research/`) | sha256 `6b923ff290b6ccc6…` = the committed `replay/outcome.corrected.report-only.json`: byte-identical |
| `git diff f2c414ef efd7454b -- research` | empty: no sealed record or study file changed |
| GPU evaluation and enforcement manifests | none of the merged files is in them (`compat.ts --manifest`; the fix's own TEST_REPORT §3) |
| `npm run tsla -- verify` (sealed records, 163) | refused before the new GPU record, because the official runner fails closed while the record is stale. Re-run after the acceptance: see `TESTS_AND_INTEGRITY.md` |

**Previously correct configurations are unchanged.** No other study's outcome code changed. GDX already used the identity
join; P5-NS's `outcomeOf` joins by `id`, fails open on a missing row, and its sealed outcome has 0 of 40 rows with
`validation: null`, so it is unaffected (observation O1 of the fix). **The intentional TSLA-only difference** is the
corrected development-only list (G, C), which exists only as the report-only replay. The sealed
`results/outcome.json` is not regenerated, re-sealed or relabelled.

## 4. Provenance of artifacts produced by the defective path

| Artifact | Status | Warning |
|---|---|---|
| `research/tsla-d1-growth/results/outcome.json` (sealed `a414631e…`) | defective fields: `validation: null` ×17, `developmentOnly: []` | **Already disclosed by the study itself** ("Disclosure D1", found 2026-11-25T22:38Z) in `READ_FIRST.md`, `DECISION_REGISTER.md` and `FINAL_CANDIDATES.md`. They point to the correct join `reports/tables/outcome-join.json` (by finalist id), which the corrected replay reproduces exactly. No further warning inside the frozen study is added: its files are not edited |
| `research/tsla-d1-growth/REPORT.md` tables | they list G and C as "development-only", from the correct join | none needed |
| GDX study outcome | uses `joinByIdentity`: 2 development-only, 0 candidates | none needed |
| P5-NS outcome | fail-open pattern, 0/40 null | none needed (unaffected) |

**Scope:** report-only, the TSLA study's development-only list. No trading, selection, qualification or GPU evaluation is
affected. No new TSLA optimization was run, and none is needed.
