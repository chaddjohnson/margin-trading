# Outcome identity reconciliation (brief Phase 0 item 4, Phase 7)

**Result: PASS.** The sealed outcome is reproduced by a separate implementation. It joins by the immutable identity
(population, id), never by display labels or status text.

## How the outcome joins (study code)

`FROZEN_SELECTION.json` lists every finalist as (population, id) with its record arm, roles, label and pre-determination
flags a and b. The validation evaluates each identity once on FULL and writes rows that carry the id, the record arm and
the `populations` that claim it. `src/gdx-d1-growth/outcome.ts` expands those rows per population (`rowIdentities`; control
rows become `control:<arm>`) and joins them with `joinByIdentity` (`src/research-outcome/identityJoin.ts`, the Phase 0
module cherry-picked from `aca31b5f`). A missing, duplicated or conflicting identity throws; no `validation: null` can
reach the outcome. The study's unit tests exercise every failure mode (gate E7).

## How it is checked here (independent)

`tools/gdx-d1-growth/reconcile.py` reads only sealed JSON. It re-derives:

- the finalist set of every nominating population from the sealed C24 arm selections (each primary plus its
  non-actual-profit roles);
- a, from Q1–Q6;
- b, from the sequential record's own net, drawdown and fold labels;
- V1–V3, from the validation rows' raw P&L and drawdowns;
- c and the three outcome sets.

It compares all of these with the frozen selection and the sealed outcome. It also re-hashes every record quoted by the
frozen selection and the outcome, and checks their seal-log entries. **507 / 507 checks pass.**

## Mutation tests

`tools/gdx-d1-growth/reconcile-mutations.py` forges one record at a time in a scratch copy and runs the reconciler on it:

- a swapped development-only id;
- a flipped V flag;
- a duplicated validation row;
- a cross-population row;
- a record-arm conflict;
- a raw P&L changed while the flags are kept;
- a finalist dropped from, or renamed in, `FROZEN_SELECTION.json`;
- a forged sequential flag or drawdown;
- an inserted candidate;
- a flipped c.

Every forgery fails on its own semantic check, not merely on its file hash, and the unmodified copy passes (13 / 13). Writing
these tests found and fixed a defect in the reconciler itself: a finalist missing from the frozen list crashed it instead of
being reported. The fix was made before the result above.
