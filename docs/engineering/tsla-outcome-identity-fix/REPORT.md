# REPORT — TSLA outcome-reporting identity fix (pre-GDX engineering assignment)

**Engineering and verification only.** No strategy was evaluated, no search or optimization ran, and no data door was
opened. Nothing was traded, deployed or merged. **The sealed Priority 6 research is unchanged.**

## 1. The defect, reconstructed from the code and the sealed records

`src/tsla-d1-growth/outcome.ts` at `421e4c87`:

1. `finalistsOf('C24')` builds each finalist with its stable `id`, its `arm` and its candidate `label` (the member label,
   e.g. `C24/G/refine/G.h2.s1/R101#1 profit`). Several roles of one member are merged into one finalist. Arm C's pair
   holds four roles.
2. `preDetermination` spreads each finalist and then **overwrites `label` with a governance label**, for example
   "development-qualified, NO chronological support: …" or "descriptive role holder (not a nominee)". This went into
   `FROZEN_SELECTION.json` (sealed, `0ebb6b62…`).
3. `outcomeOf` joined the validation rows with `rows.find((r) => r.label === f.label && r.arm === f.arm)`. A validation
   row's `label` is the candidate label, so **no row could ever match**. The code then mapped the missing row to
   `validation: null` and `c: false` without any error.

The sealed `results/outcome.json` (`a414631e…`, commit `45ab7699`) therefore has `validation: null` and `c: false` for all
17 finalists, and an empty `developmentOnly` list.

**Reproduction.**

- **Unit test, before the fix:** two tests, both failing for the expected reason (`evidence/repro-before-fix.txt`):
  - the governance-relabelled finalist got `validation: null`;
  - the sealed TSLA inputs gave `developmentOnly: []` instead of G and C.
- **Replay:** a verbatim copy of the pre-fix function, applied to the sealed `preDetermination` and the sealed rows,
  reproduces the sealed `outcome.json` **exactly**:
  - every finalist object, the empty lists, the comparisons and the verdict text;
  - test "the label join … reproduces results/outcome.json exactly", and replay checks 2–3.

**Effect on the binding conclusion: none.** `results/sequential.json` records *unsupported* for all five architectures,
because every fold drawdown is above $35,000 (D $40,170; G $36,079; C $61,092; J $67,635; S $82,547). So criterion (b)
is false for every finalist, and `candidate = a ∧ b ∧ c` is false whatever the join returns. The bug emptied only the
*development-only* list.

## 2. The fix

| File | Change |
|---|---|
| `src/research-outcome/identityJoin.ts` (new, 154 lines) | Generic `joinByIdentity(finalists, rows, {what, eligible, conflict})`. Every finalist must match exactly one eligible row with the same (arm, id). It throws `IdentityJoinError`, listing every problem at once, on: invalid identity, duplicate finalist identity, duplicate row identity, missing row (reported as *cross-arm* when the id exists only under another arm), a row consumed twice, or a caller-reported conflict. The key is `JSON.stringify([arm, id])`, so no separator collision is possible. It imports nothing from any study. |
| `src/tsla-d1-growth/outcome.ts` | (i) `governedFinalists`, a pure function extracted unchanged from `preDetermination`'s mapping. It keeps `label` = governance label (the sealed meaning) and adds `candidateLabel` and `governanceLabel`. (ii) `outcomeOf` joins by (arm, id) through `joinByIdentity`, with: only `selected` rows eligible; a conflict if a pre-fix finalist's `candidateLabel` differs from the row's label, if the row has no label, or if V1–V3 are not booleans. (iii) Candidates and development-only finalists are listed by **candidate** label, in canonical order (arm D, G, C, J, S, then id). (iv) Explicit `GovernedFinalist`, `ValidationRow` and `ValidationFlags` types. |
| `src/research-outcome/tests/identityJoin.test.ts` (new) | 12 tests of the generic join. |
| `src/tsla-d1-growth/tests/outcome.test.ts` (new) | 25 tests: 16 synthetic (`outcomeOf` and `governedFinalists`) and 9 for the read-only replay of the sealed TSLA records. |
| `tools/tsla-outcome-identity-fix/replay.ts` (new) | The report-only replay, with 18 cross-checks. It writes only to this directory and refuses any path under `research/`. |
| `tools/tsla-outcome-identity-fix/fingerprint.ts` (new) | The read-only fingerprint of everything that must not change. |

**Not changed:** strategy signals, trading state, event order, costs, margin, interest, risk metrics, parameter domains,
search and optimization algorithms, candidate selection, the qualification and outcome rules, every threshold, the
CPU/GPU evaluator, the pinned dependencies, Strategy Lab, and every file under `research/`.

The thresholds `bands` and the materiality rule (`materialType`, `compare`) are byte-identical. The rule text of
`preDetermination` is unchanged. `finalistsOf`, `runFreezeSelection` and `runOutcome` are unchanged; `runOutcome`
already passes the sealed rows, which carry `kind`.

## 3. Behaviour before and after

| Situation | Before (label join) | After (identity join) |
|---|---|---|
| A finalist's `label` overwritten by its governance label | `validation: null`, `c: false`, without notice | Joined by (arm, id); V1–V3 from its own row |
| A validation row missing | `validation: null`, `c: false` | `IdentityJoinError`: "missing validation row for finalist (arm X, id …)" |
| Two rows with one identity | the first one in array order wins | `IdentityJoinError`: "duplicate validation identity" |
| A row under the wrong arm | `validation: null` | `IdentityJoinError`: "cross-arm identity: … its id occurs under arm J" |
| Two finalists with one identity | both silently take one row | `IdentityJoinError`: "duplicate finalist identity … (merge its roles)" |
| A candidate label disagreeing with the row | not detected | `IdentityJoinError`: "candidate label conflict" |
| Malformed V1–V3 | treated as false | `IdentityJoinError`: "malformed V1–V3" |
| A control with the same identity as a finalist | could be matched | never matched (`kind: control`) |
| `candidates` / `developmentOnly` entries | `label` = governance label (whenever the join worked) | `label` = candidate label |
| Input order | the first label match wins | results independent of the finalist and row order |
| **Sealed TSLA inputs** | 17 × `validation: null`; `developmentOnly: []` | 17 rows joined; `developmentOnly` = **G, C**; `candidates` = []; **NO QUALIFYING TSLA CANDIDATE** |

## 4. Output schema (additive only)

- **`preDetermination(...).finalists[]`:** every sealed field keeps its value and meaning. `label` is still the
  governance label: recomputed from the sealed `FROZEN_SELECTION.json` finalists, the existing fields equal the sealed
  `preDetermination.finalists` field for field (test). The fix **adds** `candidateLabel` and `governanceLabel`.
- **`outcomeOf(...).finalists[]`:** the fix **adds** `candidateLabel`, the label of the matched row. `validation` is
  always an object and never `null`. Every other field is unchanged.
- **`outcomeOf(...).candidates[]` and `.developmentOnly[]`:** `{arm, label, id}`, where `label` is the candidate's own
  label. That is the meaning the outcome text and `reports/tables/outcome-join.json` always used; the old code would
  have put the governance label there.
- **Consumers.** `tools/tsla-d1-growth/analyze.ts` reads the sealed `FROZEN_SELECTION.json` (`finalists[].label`, the
  candidate label), so it is unaffected. `outcome-join.py` reads only sealed files. No other module imports `outcomeOf`
  or `preDetermination`: `stages.ts` only, through `runFreezeSelection` and `runOutcome`, both of which refuse to run for
  this study (E7).

## 5. The sealed research is untouched (explicit confirmation)

- **`results/outcome.json` was not regenerated, overwritten, repinned, re-hashed or chmod-ed.** It is still sha256
  `a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79`, mode 0444. The same holds for every other sealed
  record of the study: **163 of 163** `seals.jsonl` entries verify by hash and read-only mode, before and after
  (`TEST_REPORT.md` §3).
- **No path under `research/` differs from `421e4c87`.** `git diff 421e4c87 HEAD -- research/` is empty. The git tree of
  `research/` is `06032071eb528351d45ea55a2610fc57f4253d7b` at both ends; `research/tsla-d1-growth/` is `181594ff…` and
  `research/vg-l0-n-successor/` (New L0 / N/original) is `2423792b…`, both unchanged.
- **New L0 and N/original are numerically and chronologically unchanged.** None of their code or records was touched.
  The GPU evaluation digest `d1a2e490…` is unchanged. Strategy Lab's portfolio parity re-verifies the frozen pooled
  candidates against their sealed records (`TEST_REPORT.md` §2).
- **The corrected outcome exists only as a report-only engineering artifact:**
  `docs/engineering/tsla-outcome-identity-fix/replay/outcome.corrected.report-only.json`. Its first field says it is not
  a sealed record.

## 6. Consequence for the frozen study's code digest (disclosed)

The study's code digest (the import closure of `src/tsla-d1-growth/main.ts`) now includes the edited `outcome.ts` and
the new `identityJoin.ts`. It moves from `fb7e6ddc5dee614b…` (the sealed A1 chain head) to `de6d626ac35cded3…`.
`officialGuards` accepts only the sealed chain {`418a8758…` frozen, `fb7e6ddc…` A1}, so **every official TSLA stage is
refused** on this branch. That is intended (fail closed): the study is complete and nothing may rerun it.

The sealed records are verified by hash (`npm run tsla -- verify`, which does not check the digest). The historical
evaluation context remains reproducible at `421e4c87`. This follows the repository's practice for completed studies
whose code later changed (Priority 3 since 2026-11-12).

## 7. Reuse

`joinByIdentity` is study-independent. The GDX study (and MSFT later) should:

- import it for its own outcome join;
- precommit "join by (arm, id), fail closed" in its protocol;
- copy the replay-test pattern: pinned sealed inputs, plus a reproduction of the old behaviour if any.

Bringing the module to `main` is decision I1 (`DECISION_REGISTER.md`).
