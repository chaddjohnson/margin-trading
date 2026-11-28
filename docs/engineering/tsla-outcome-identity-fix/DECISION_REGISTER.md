# DECISION_REGISTER — TSLA outcome identity fix

## A. Decisions taken in this engineering task (within the brief)

| ID | Decision | Why |
|---|---|---|
| E1 | The join key is **(arm, id)**. `id` is the finalist's Evidence id, carried unchanged by `FROZEN_SELECTION.json` (`finalists`, `preDetermination.finalists`) and by every validation row. All 28 selected rows are unique by (arm, id). | It is the stable identity the sealed records already share. Labels are display or governance text and were overwritten. |
| E2 | **Fail closed.** `IdentityJoinError` lists every problem at once: invalid identity, duplicate finalist, duplicate row, missing row, cross-arm row, conflicting candidate label, or malformed V1–V3. There is no `validation: null` path left. | Brief §2.2. A failed join can no longer look like a failed validation. |
| E3 | Rows of `kind` ≠ `selected` (the six external controls) never join a finalist. Rows that no finalist claims (the 11 sub-population rows) are allowed and returned. | The validation plan covers controls and sub-populations that are never finalists (PROTOCOL §12). |
| E4 | `preDetermination` keeps its sealed output shape: `label` is still the **governance** label. It adds `candidateLabel` and `governanceLabel`. `outcomeOf` adds `candidateLabel` to each finalist and lists candidates and development-only finalists by candidate label. | Brief §2.4: backward compatibility, with status labels kept apart from identity. The schema change is additive only (`REPORT.md` §4). |
| E5 | The candidate and development-only lists are sorted canonically: arm order D, G, C, J, S, then id. The finalists array keeps the frozen order. | Brief §3: reordering inputs must not change results. On the sealed inputs this order equals the frozen order. |
| E6 | The generic join lives in a **new module**, `src/research-outcome/identityJoin.ts`, which imports nothing from any study. | Reusable by the GDX and MSFT studies without copying (brief §2.5). It sits outside every GPU evaluation and enforcement manifest. |
| E7 | **No code amendment is sealed** for the TSLA study. `outcome.ts` is in the study's code closure, so its digest moves from `fb7e6ddc…` to `de6d626a…`, outside the sealed chain {`418a8758…`, `fb7e6ddc…`}. Every official TSLA stage is therefore refused (fail closed). | Sealing an amendment would add a sealed record to a completed study (brief §3: no repinning or unsealing). No further official TSLA stage is authorized or needed. The historical study verifies at `421e4c87`. |
| E8 | Nothing under `research/` changes. The engineering record, the replay output and the evidence live in `docs/engineering/tsla-outcome-identity-fix/`. The tools live in `tools/tsla-outcome-identity-fix/`. | Brief §3: a new, unsealed engineering-report directory that does not conflict with any existing path. |
| E9 | The CUDA backend is **not** recertified. | The change lies outside the accepted evaluation dependency graph: the compat digest is unchanged, the 113 evaluation files and the 29 pinned policy files contain no changed file, and `verify-acceptance.sh` reports VERIFIED (`TEST_REPORT.md` §3). |

## B. Outstanding integration decisions (the user's)

| ID | Decision | Recommendation |
|---|---|---|
| **I1** | **Whether to bring the bugfix to `main`.** `main` (`3606f4b3`, gpu-phase6) is 302 commits behind the TSLA lineage and has no `src/tsla-d1-growth/`. Merging this branch would also merge the unmerged TSLA research and everything before it (gpu-phase7, Priority 5 and others). | **Recommended: yes, for the reusable part only.** Cherry-pick the module commit (`src/research-outcome/identityJoin.ts` and its tests; it only adds files and imports nothing from the repository) onto `main` after a review, so that the GDX study inherits it. Do **not** merge `fix/tsla-outcome-identity-join` into `main`. The `outcome.ts` patch should travel with the TSLA lineage whenever the user decides to integrate that research. The commit split and the exact command are in `RESEARCH_RECOVERY.md` §5. |
| I2 | Whether to add a cross-reference to the frozen study's documents (an append-only note in `research/tsla-d1-growth/AMENDMENTS.md` saying that U6 is resolved by this branch). | Optional, and **not done here**: the brief forbids altering the completed study. If wanted, append one dated line to `AMENDMENTS.md` in a separately reviewed commit. That would change the study's git tree, but no sealed record or hash. |
| I3 | The status of the corrected development-only list. | Cite it as **report-only**: this replay together with D1 and `reports/tables/outcome-join.json`, which agree exactly. Never re-seal `results/outcome.json`. Under PROTOCOL §12, G and C remain *not deployment-qualified without an explicit user decision*. The study's own U5 recommendation (take no action) is unchanged. |
| I4 | Whether any official TSLA stage should ever run again. | No. If one ever must, run it at `421e4c87` (a detached checkout), or seal a code amendment with the user's explicit approval. The current refusal is intended. |
| I5 | How the GDX study uses the join. | Precommit in its protocol that the outcome joins validation records by (arm, id) via `joinByIdentity` and fails closed, and add its own replay test. |
| I6 | The study's other open decisions (U1–U5, U7 in `research/tsla-d1-growth/DECISION_REGISTER.md`). | Unchanged by this task. **U6 is answered by this fix**, pending I1. |

## C. Observation (no action taken)

- **O1.** Priority 5's `outcomeOf` (`src/vg-l0-n-successor/successor.ts`, the study TSLA was modelled on) already joins
  by `id`, but it maps a missing row silently to `validation: null` (fail open). Its sealed outcome
  (`research/vg-l0-n-successor/results/outcome.json`) has **0 of 40 rows with `validation: null`**, so its result is not
  affected. Nothing was changed there. New studies should use `joinByIdentity` instead of either pattern.

## D. Carried forward (not started; not authorized here)

- **The next research assignment** is the separately authorized **GDX-only D1 + Growth study**, before MSFT. Its required
  comparisons, recorded here from the brief:
  - GDX-only and **N/original**, each against the **same** 60 % VOOG / 40 % VGT core portfolio (whole-portfolio
    comparison);
  - their isolated trading-slot metrics, side by side.

  A GDX-only result need not exceed N/original's trading profit if it demonstrably reduces whole-portfolio risk.
  Exceeding it is welcome too.
- Not started by this task: GDX optimization, MSFT, any new TSLA search, genetic optimization, paper trading, broker
  activity, deployment.
