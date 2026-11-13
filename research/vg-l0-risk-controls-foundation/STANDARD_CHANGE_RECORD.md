# Optimization standard 2.2.0 — change record

| Item | Value |
|---|---|
| Version | **2.2.0** (minor), effective 2026-11-13 |
| File | `docs/research/OPTIMIZATION_STANDARD.md`, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` |
| Previous | 2.1.0, sha256 `ac5c2c69987faa8d2b0dba7dfd452e278658167fa172ab210a8a2e8de7696f9b` (kept in the registry, as are 2.0.0, 1.1.0 and 1.0.0) |
| Registry | `docs/research/optimization-standard.versions.json` (`current: 2.2.0`) |
| Approval | the user, in the Assignment 1 brief (`brief/BRIEF.md` §1: "the user has approved these diagnostic/governance safeguards") |
| Evidence | `research/vg-l0-walk-forward-diagnostic/REPORT.md` §3–§4, recommendations 1–4 and its "Proposed narrowly scoped amendment" |

## 1. Why minor

Standard §7.4 rules: a **major** version adds, removes or changes a mandatory [M] rule; a **minor** version adds guidance,
defaults or [S]/[R] items; a **patch** changes wording only. 2.2.0 adds one [S] item and one [R] item, plus one-line
pointers, and changes no [M] rule. So 2.1.0 → **2.2.0** is the next appropriate version. Existing item numbers are kept:
the consequence is a sub-item of §1.8, and the disclosure is the new §5.9.

## 2. Exact changes

| Where | Class | Change |
|---|---|---|
| Header | — | Version 2.2.0, effective 2026-11-13; earlier versions listed as registered |
| §1.8 | **[S] new sub-item "Consequence"** | Before any search, the protocol states what a failed or uncomputable independent chronological verdict means for the final selection. Default: *"no chronological support: the final selection is not a deployment-qualified candidate without an explicit user decision"*. It is governance (a label and a user decision point), never a fitness term, ranking input, objective weight or gate, and it never changes a sealed gate verdict (§2.8). "No qualifying candidate" is a valid outcome. An informed lane's selection is labelled "no independent chronological test" and never claims the independent folds; the consequence applies to it unless the protocol justifies otherwise. Earlier-pinned studies keep their labels. |
| §1 amendment items | — | Adds "the verdict's consequence (from 2.2.0)" |
| §5.4 | pointer | One sentence: §5.9 reports the training-selected neighbourhood on the next slice |
| §5.9 | **[R] new item "Chronological exposure disclosure"** | For every fold primary and final candidate: (1) the open-lot share of training net at each cutoff close (numerator = Σ open lots' marked value, as the marked net §0.3; denominator = the training net; "undefined (training net ≤ 0)" with both dollar amounts when the net is ≤ 0; negative and > 100% shares reported as they are); (2) the largest open lot's market-value ÷ original principal multiple, with book, entry date and price; (3) that lot's give-back on the next slice (mark at the cutoff, later highest and lowest marks with dates, change to its exit or slice end, exit date, reason, raw price); (4) the per-lot MAE distribution (count, median, p90, worst) and loss severity (worst lot net, mean losing-lot net), for training and next slice; (5) the D1 maximum-hold-window tail stress on a **declared reference history** (preferably disjoint data, else a labelled proxy or in-sample stress), with the worst gap through any price stop; (6) the training neighbourhood replayed on the next slice (breach share with a Wilson interval, median and worst slice DD). Report-only: never a selection, ranking, stopping or qualification input, fitness adjustment or tolerance, with no threshold attached by this version. Evidence limits are stated: previously examined history (2020, 2022, 2025–2026), the $35,000 ceiling as a research criterion rather than an enforceable loss limit, stops not being loss caps, one market history. |
| §5 amendment items | — | Adds "the §5.9 reference history (from 2.2.0)" |
| §8 change log | — | The 2.2.0 row: rationale, evidence, implications |

What did **not** change: every [M] rule, every gate, window, budget and instrument, the objective and its roles, the
$35,000 ceiling and its denominator, and NL0 1.0.0 (`docs/research/methods/NEW_L0_METHOD.md`, unchanged: it records
what was executed before these items existed).

## 3. Companions

| File | Change |
|---|---|
| `docs/research/optimization-standard.versions.json` | 2.2.0 appended with its sha256 and summary; `current` = 2.2.0 |
| `docs/research/STUDY_PROTOCOL_TEMPLATE.md` | §10: the verdict's consequence (with the informed-lane label and "no qualifying candidate"); §15: the §5.9 disclosure and its evidence limits |
| `docs/research/templates/STANDARD_ADOPTION.template.json` | new field `chronologicalConsequence` |
| `src/research-standard/preflight.ts` | `chronologicalConsequence` is **required** from studies with scope `optimization` or `continuation` that pin 2.2.0 or later. It is not required of diagnostics, but must be non-empty if given. Earlier pins are untouched (version-gated by `compareVersions`). This is the mechanical counterpart of the new [S] item and applies only to new adopters. |
| `src/research-standard/tests/preflight.test.ts` | 5 new tests (ordering of versions; missing consequence fails for optimization; declared consequence passes, also for continuation, and a blank one fails; a diagnostic needs none but refuses an empty statement; a 2.1.0 pin is not held to it) and repository tests for the 2.0.0/2.1.0 registry hashes and the three 2.1.0-pinned studies' retained-pin notices. 26/26 pass. |
| `docs/research/ROADMAP.md` | current version 2.2.0; row A1 |

## 4. Migration and adoption

- **New studies from 2026-11-13** adopt 2.2.0:
  - read the standard in full;
  - write `STANDARD_ADOPTION.json` from the template, including `chronologicalConsequence` for an optimization or
    continuation;
  - state the consequence and the §5.9 reference history in the protocol (template §10, §15);
  - pass `npm run research-preflight -- --study research/<study>`.
- **Frozen and completed studies** keep their pins (1.0.0 … 2.1.0). The preflight passes them with a retained-pin
  notice (checked: 14/14 studies pass, `results/gates/g7-frozen-a3.json`). They are never re-labelled, re-hashed or
  rerun. A continuation either records "retained pinned standard x.y.z" or migrates by amendment (§7.5).
- **First adopter:** this study (scope `diagnostic`; preflight PASS).

## 5. Integration status

- **Research branch:** `research/vg-l0-risk-controls-foundation` carries the standard, its companions and the preflight
  change together with this study.
- **`main`:** a documentation-only commit applying the four standard documents, plus the brief and this record so that
  the change log's references resolve. It contains no engine code; see `REPORT.md` §6 for the commit and its push
  verification. `main` does not carry `src/research-standard/` (as for 2.1.0, precedent `2346a1b5`), so the
  preflight change stays on the research line until the user merges it.
