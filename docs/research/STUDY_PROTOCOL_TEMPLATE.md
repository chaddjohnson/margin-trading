# Protocol — <study name>

<!--
Template for research/<study>/PROTOCOL.md under docs/research/OPTIMIZATION_STANDARD.md. Replace every <…>, delete
sections that do not apply (say "not applicable: <why>"), keep the numbering. Keep each answer exact: values,
formulas, paths, seeds. "Optimize robustly" is not an answer.
-->

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before the
governed work). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

## 0. Standard adoption (optimization standard read and adopted)

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `<x.y.z>`, sha256 `<64 hex>` |
| Read / adopted (UTC, from `date -u`) | `<read time>` / `<adoption time>` |
| Adoption manifest | `research/<study>/STANDARD_ADOPTION.json` (checked by `npm run research-preflight -- --study research/<study>`) |
| Scope | `optimization` \| `continuation` \| `diagnostic` |
| Brief | `research/<study>/brief/BRIEF.md`, sha256 `<…>` |
| Branch / base commit | `<branch>` from `<sha>` |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| `<AD1>` | `<§>` | adaptation \| departure | `<exact change and justification>` | `<brief line or session instruction>` |

## 1. Question, objective and outcomes

- **Question:** `<one sentence>`.
- **Objective:** net profit (realized + marked unrealized, after costs and interest), with a maximum minute DD
  ≤ `<$35,000>` on `<one fixed $100,000 principal budget>` (standard §2.1).
- **Primary-selection rule:** `<actual profit | robust profit | compromise: formula>`. Ranking uses the selection
  families; confirmation decides qualification only.
- **Roles:** actual-profit, robust-profit, balanced, lower-drawdown. Give each one's exact formula (standard §2.3).
- **Pareto set:** centre net, centre DD, neighbourhood p10 net, neighbourhood p90 DD (reported).
- **Valid outcomes:** `<e.g. a frozen primary; none; failed qualification>`. A negative result is a result.

## 2. Prior knowledge and provenance

- **Already examined:** `<which windows, studies and outcomes>`. The validation window is therefore `<previously examined
  history | untouched>`.
- **Incumbents:** each one, with its source path and sha256, and how it was chosen (independent, informed,
  browser-chosen, and with which data in view).

## 3. Data, doors and windows

- **Canonical files:** `<path>`, sha256 `<…>`, per instrument.
- **Common complete endpoint:** `<date>`, verified by `<how>`.
- **Windows:**
  - development 2016-01-04 → 2024-12-31;
  - validation 2025-01-02 → `<endpoint>`;
  - earlier cutoffs `<C19/C21/C23>` with their doors (sizes, sha256, last rows).
- **Continuity:** continuous runs, no reset at a boundary. Period P&L = the change of the marked net between boundary
  closes. Report the reset and the whole-run DD.
- **The door log:** `results/doors.jsonl`. Validation data stay closed until `<the guard record>` is sealed and committed.

## 4. Controls, incumbents and comparison arms

- **Exact controls** with reproduction targets to the cent, native and harmonized.
- **Informed studies:**
  - the selectable incumbents and fixed combinations, **or**
  - the no-improvement fallback (standard §3.2).
- **Method arms where relevant:** fixed pooled; separately optimized then pooled; joint; staged. For each arm give its
  budget and provenance.

## 5. Engine and conventions

- **Engines and their parity targets:** `<paths>`.
- **Economics:** principal budget; per-side costs; interest (rate, day count); stop fills; shares (fractional or whole);
  dividends.
- **Native → harmonized bridge:** start, arming, warm-up, friction, split handling.
- **Funding rules:** for a pool, the architecture, priority, reservations and minimum allocation.

## 6. Space

- **Parameters:** boxes and grids, with exact incumbent values representable on them.
- **Structure:** dependencies and inactive genes; identity and behavioural equivalence (the ledger signature);
  cells/strata with protected budgets.

## 7. Search, budget and stopping (search studies)

| Lane | Distinct proposals | Backend evaluations (centres / neighbours / folds) | Stages | Cap |
|---|---:|---:|---|---|
| `<independent cell × n>` | `<…>` | `<…>` | `<screen, islands, rungs, refinement>` | `<…>` |
| `<informed>` | `<…>` | `<…>` | `<…>` | `<…>` |

- **Extension policy:** the triggers (frontier, robust objective, new behaviour), the caps, and progress per 10,000
  evaluations.
- **Stopping conditions,** with the recorded condition. Budget exhausted is not convergence.
- **Promotion shares:** centre-profit, robust and diversity (standard §2.4).

## 8. Robustness instrument

- **Neighbours:** radii, the distribution, boundary treatment, categorical inputs, dependent inputs, normalization.
- **Seeds:** the derivation (`deriveSeed('<study>', …labels)`). Confirmation seeds are independent of ranking.
- **Fidelities and statistics:** robust = ½ median + ½ p10; the p90 DD; breaches (share, mean excess, worst);
  distinct ledgers; draws equal to the centre; clipping.

## 9. Qualification gates (all must hold) and report-only evidence

| Gate | Requirement |
|---|---|
| `<Q1…>` | `<exact rule>` |

**Report-only evidence:** stresses, toggles, causal family removal, episode concentration, participation labels.

## 10. Chronological procedure tests

- **Cutoffs and doors:** the fold selections are sealed and committed before their slices.
- **Sequential policy and switch charges:** `<…>`.
- **The frozen verdict rule:** `<…>`.

## 11. Validation plan (frozen before validation data open)

- **What runs:** the frozen members, the controls, tests V1…, report-only perturbations and stresses.
- **Fixed in advance:** what a failure means. No new winner, no rescue search.

## 12. Engineering gates

- **Gates:** parity, causality, accounting identities, single-family identities and synthetic tests (standard §5.1,
  §5.6).
- A parity failure stops dependent stages.

## 13. Resources and recoverability

- **Containment:** the slice with MemoryHigh 44G / MemoryMax 48G / swap 0; units one at a time, or under that aggregate
  cap.
- **Execution settings:** workers, caches, the pressure threshold and the gc cadence.
- **Pilot:** the benchmark (optimization studies) and the interruption tests (graceful, unit kill, worker kill).

## 14. Integrity

- **The freeze records:** the protocol, amendments, brief and fixtures sha256; the code digest; the data and door pins;
  `HEAD`; budgets; the resource contract.
- **Sealed records:** write-once with `seals.jsonl`.
- **Checkpoint:** `RESEARCH_RECOVERY.md` per [context-recovery.md](../claude/context-recovery.md).

## 15. Reporting commitments

- **Windows:** development, validation and full-history net, each with the realized/unrealized split.
- **Drawdown:** DD in dollars and as a percentage of the fixed budget, with its dates.
- **Activity and costs:** trades, wins/losses, exposure, interest and costs; family contributions (booked and
  causal); open positions; funding refusals.
- **Robustness:** neighbourhoods and the breach disclosure.
- **Chronology:** fold and sequential results, including procedure failures.
- **Search:** coverage and attrition; the stopping condition.
- **Compute and resources:** compute, and the observed memory and CPU use.
- **Limitations:** uncertainty and limitations, including "historical compliance is not a guarantee".
