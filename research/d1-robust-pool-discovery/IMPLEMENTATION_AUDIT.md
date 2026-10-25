# Implementation audit (PROTOCOL.md §18, §22) — 2026-10-25

What was built, how it was checked, what two independent reviews found and what was done about it, and the state of
the repository at the end. Code: `src/d1-robust/` (study modules), `src/app/robustD1.ts` (entry), `npm run robust-d1`.
Node v24.21.0 (fnm) throughout.

## 1. Code discipline

- **Write-once sealed records** (`writeSealed`/`readSealed`, body sha256): the protocol freeze, the three pilot
  freezes, both folds' `PICKS.json` and `validation.json`, `GWF.json`, `FROZEN_SELECTION.json`. A sealed record refuses
  to be rewritten and fails to read if any byte changes (tested).
- **The code manifest** — sha256 of every `src/**/*.ts` except tests, `generated/` and the table writer
  `src/d1-robust/report.ts` (the study's modules and every reused engine, strategy and helper: 376 files at the freeze)
  — is bound by the sealed protocol freeze. Every outcome stage calls `requireProtocolFrozen`, which throws unless the
  protocol, `context.ts` and the manifest equal the head of the hash-chained amendment log, and verifies the universe,
  tier, split registry, distribution ledger, partitions and every canonical data file against their audited hashes.
- **Amendments** are recorded with `amend`, anchored to the current head, and refused if any listed output of the
  affected stage exists (a post-outcome amendment must say so explicitly, with a justification). Two were recorded:

| # | Recorded | Stage(s) | Before → after (protocol / code) | Nature |
|---|---|---|---|---|
| 1 | 18:31:51Z | pilot | `9ec36890` / `02ed10c9` → `03025d98` / `eb9b60b6` | **post-outcome, disclosed**: the shareAbove machinery check pools active controls (PILOT_CALIBRATION §1) |
| 2 | 20:12:40Z | search, freeze-selection, confirm-b, evaluate, research-run | `03025d98` / `eb9b60b6` → `3becd349` / `f32d5e5a` | the pre-search review's fixes (§5 below), before any output of those stages and after `GWF.json` |

- `report.ts` (Markdown tables generated from the records) sits outside the manifest by design and was extended after
  the freeze (walk-forward, coverage and later tables; negative amounts printed with a minus sign). It reads records
  only.

## 2. Correctness gates (CACHE_AND_CAUSAL_PARITY.md)

- Controls: B1/B4/B5/C0 reproduce the 16-ETF study's records to the cent in the expanded load and on `all` (56/56).
- Parity matrix: 658 comparisons, 0 differences (P0, P1 on every eligible symbol alone and on random 2–24-book pools
  incl. every split symbol and the sparsest, P1 at both fold cuts, P2 portfolio consistency under both dividend
  conventions), P3 lookahead (thin in the frozen stage; a supplementary 12-pool check with 25–75 earlier decisions
  each: every earlier decision unchanged), P4 worker pool = in-process runner.
- In every assessment: replay = full engine field for field at 0/2/5/10 bps (G1); the identity tie order reproduces
  the canonical run.
- In every validation: the windowed minute drawdown is recomputed from lots and bars and checked equal to the replay's
  whole-run figure (49 checks in fold-a, 47 in fold-b, all equal).

## 3. Determinism (§18)

`results/determinism/determinism.json` (2026-10-25T20:16Z, on the amendment-2 head): the round library and the first
2,000 fold-a arm-J discovery evaluations re-run in a fresh process with the 8-worker pool and with the in-process
single-thread runner: both byte-identical to the original log (sha256 `c86d9f3a…` over 2,000 lines). This also shows
that amendment 2 changed nothing in discovery. The pilot re-run after amendment 1 reproduced each window's
`controls.jsonl` byte for byte. The synthetic pipeline test runs a fold round twice and compares the archives byte for
byte.

## 4. Leakage barriers (§13.5)

Physical truncation at load (`endDate` = the round's search end; the loaded last date asserted and each symbol's bars
hashed into the round's door record); window-specific trace keys; per-round archives and pilot constants; seeds by
(`'robust-d1'`, window, stage, index); no control vectors in fold libraries; `PICKS.json` written and sealed before any
validation load (the validation door refuses otherwise and records the PICKS hash); the evaluation door requires the
sealed selection. The mutation test (fixture CSVs through the real loader, post-cutoff prices shifted +3%) gives
byte-identical archives and picks, with a sensitivity control showing the same shift before the cutoff does change
them. An import-graph test keeps `retrospective.ts` out of every search, pilot, promotion, refinement, assessment and
selection module.

## 5. Independent reviews

**Before the freeze** (a separate agent; 3 material, 20 minor findings, all fixed before the freeze and listed in
APPROVED_DEVIATIONS §9 X1–X8 and `results/changes-since-commitment.txt`): diversity families refined, not just
promoted; the code manifest and provenance hashes; the G-WF comparator floor; grid-based keys; the Q tie rule; re-run
guards; G-WF read from its sealed record; the retrospective ordering guard; and others.

**Before the final search** (a separate agent that had not written the code; it read the protocol, the final-round,
selection, confirmation and retrospective modules and the fold records, and ran only read-only checks). It found
nothing that would make the final search, promotion, refinement, assessment, gates, ranking or nominations deviate
from §8–§14 (it verified budgets 24,000 per arm, island cap 2,550, reserve 3,600, floors 600/225; separate arm
archives; the seeded population; the final library of 1,045 vectors with no R1/R4 vector; pooled promotion with the
§10.4 requirements; refinement and assessment constants; G1–G8 including the conditional materiality and the paired
lower bound; the M ÷ 2 ranking; nominations; G-WF emptying nominees; the doors; every `context.ts` constant against
the protocol). Its findings and their disposition (amendment 2 unless stated):

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | material (M4, nominee path) | `evaluate` skipped the §16 nominee dividend treatment (histories, the fully accounted diagnostic or bounds, "unresolved" marks) | `evaluate` now refuses nominees until that diagnostic exists (fail closed). Moot here: G-WF failed, so no nominee can exist; with none it writes only its no-advancement record. |
| 2 | material (conditional, M4) | the recommendation could crown a capacity-limited or box-constrained alternate; alternates without a primary were not labelled | only a primary-eligible nominee can be the primary forward-test candidate; such alternates carry "no primary-eligible finalist". Moot here for the same reason. |
| 3 | minor | the C0 same-dates drawdown matched a close time against a session's midnight time and was always NaN | matched on the session close time; the final-round smoke test asserts it is finite. The fold assessments keep their NaN (disclosed; descriptive only). |
| 4 | minor | the inspected-vector label relied on the archive's first-recorded origin (the seeded arm's benchmark books carried 'benchmark:' origins); "neighbour of an inspected configuration" was not implemented | grid-based inspected-vector label against the final library's controls; the neighbour label (≥ half the membership shared with B1/B4/B5, shared grids within 2 step units); tested. |
| 5 | minor | the selection freeze was thinner than §15.1 and copied nominees from the unsealed candidates file; freeze/confirm-b/evaluate skipped the controls/parity checks; `evaluate` did not re-verify hashes | budgets, evaluation counts, seeds, benchmark books and the hashes of `round.json`, both arms' discovery records and logs, promotion and both validations added; nominees recomputed from the pooled assessment and compared; controls/parity required; `evaluate` re-verifies the frozen hashes and withholds a recommendation on any parity failure. |
| 6 | minor | confirm-B P50/Q25 had no intervals; R1/R4 vectors were read without the §21 hash check | intervals added; `robust.json` verified against the 16-ETF `FROZEN_SELECTION.json` before use. |
| 7 | minor | ordering: a no-advancement freeze authorized only `confirm-b` although the retrospective runner needs `evaluation.json`; `evaluate --confirm` with no nominee rewrote the record; `evaluate` did not require `confirmB.json`; the retrospective runner skipped the freeze check, kept provenance only at its root, compared symmetric-convention runs with frozen-convention B4/B5 and set `frozenFilesUnchanged` before checking | all fixed as listed (the no-advancement freeze authorizes `confirm-b`, `evaluate` and the four §21 runs). |
| 8 | minor | the G7 extrapolation mark appeared only in a detail string | also a label. |
| 9 | minor | no final-round code had ever run, even on fixtures; a crash before `selection-candidates.json` would overwrite a partial run | a synthetic final-round smoke test (both arms, the seeded population, pooled promotion, G6/G7, nominations); a partial earlier run is moved to `results/final-aborted-<time>/`. The capacity read goes around the training door (training partition, search-end date, hash-checked; no leak) — recorded, unchanged. |
| 10 | observation | the §14 tie rule lets the key decide between configurations up to $12,500 apart (it did in fold-a); with different M the leader's M sets the window | as written; not changed after a fold outcome. Reported in WALK_FORWARD_RESULTS §3. |

**Before the selection freeze**: §6.

## 6. Pre-selection-freeze review

A second separate agent (fresh context) reviewed amendment 2's code and the final-round records before
`freeze-selection`. It ran only read-only checks:
- a dry replica of `runFreezeSelection` with the write replaced by an in-memory body;
- the R1/R4 training reproduction (training only; it deliberately did not open the `all` window);
- recomputations of the families, labels and paired bootstraps;
- tsc and the two affected test files.

**Its conclusions.**
- No material defect.
- The remaining four commands were safe to run in order.
- The families were correctly applied: all 295 feasible pooled candidates are seeded, zero have ≤ 3 books, zero are
  ≥ 0.75 from B5, and the unseeded best of $199,387 is below the 300th pooled entry's $284,583.
- The finalist's G1–G8 were recomputed (paired bootstrap bit for bit; G6 at M = $25k because 29.23% ≤ 30%; G7 by
  hand).
- `runBenchmark` is equivalent to `runFrozen` in the frozen convention.
- R1/R4 reproduce their archived training figures exactly.

**What it warned of.** `evaluate` pins the protocol's hash at the freeze, so any later amendment would block M4.
Its minor findings were therefore fixed **before** the freeze as amendment 3:

| # | Finding | Disposition |
|---|---|---|
| 1 | an amendment after the freeze would block `evaluate` and the R1/R4 runs | none recorded after the freeze |
| 2 | nominees were compared, not recomputed | recomputed with `rankPassing` + `nominate` and required equal to both stored lists (amendment 3) |
| 3 | the freeze silently dropped missing files from its hash lists | refuses a missing file (amendment 3) |
| 4 | the freeze did not bind the refinement, pilot and determinism records | bound (amendment 3); the final-round JSON records carry no provenance block of their own (pre-existing; the code at search time is the unchanged amendment-2 head) |
| 5 | label wording: "at least half" against the strict "< 0.5" | reports state the finalist's descent from B5 explicitly; the 2-unit test fails under either reading |
| 6 | the C0 lookup matches the session close time, not the "New York date" wording | equivalent (calendar-derived); the stored value is C0's drawdown on the candidate's dates, not an excess |
| 7 | the R1/R4 runner did not check that `evaluation.json` belongs to this freeze, nor that confirm-b ran; its provenance lacked study hashes; the window end was not asserted | all added (amendment 3) |
| 8 | the R1/R4 runner hashed 3 files, and only before writing | the whole `research/joint-16-etf-d1/` directory is hashed before the run and after the outputs are written (amendment 3) |
| 9 | the R1/R4 runs had no write-once guard; `confirmB.json` is unsealed | each run refuses an existing output directory (amendment 3); `confirmB.json` carries a digest of its rows, and its sha256 is in `results/records.sha256` (§8) |
| 10 | observation: the pooled top 300 let the seeded arm fill every slot; the finalist's feasShare is 0.53 and its portfolio neighbours reach 36.4% | reported in POOL_FAMILIES_AND_REFINEMENT and NEIGHBORHOOD_ROBUSTNESS |

## 7. Other findings recorded during execution

- **G-WF clause (iii)** is coded to fail a fold without a J pick; the protocol says that only of clause (ii). Read
  literally, (iii) holds. The sealed `GWF.json` is unchanged and the outcome is the same ((i) and (ii) fail on their
  own). Disclosed in WALK_FORWARD_RESULTS §4.
- **A test hazard**: `src/d1-robust/tests/records.test.ts` asserted that an acknowledged R1/R4 call is refused before the
  selection freeze; after the freeze and the evaluation record it would have performed a real retrospective run during
  `npm test`. The assertion now runs only while `FROZEN_SELECTION.json` is absent (tests are outside the manifest).
- Ingestion incidents (connection-reset retries; 11 ingest records rebuilt from attempt logs after a `--resolve`
  overwrote them; no data affected) — INGESTION_RUNS.md. The IJR prospectus supplement was fetched from sec.gov with the
  user's email address in the HTTP User-Agent header (SEC asks for a contact); not repeated.

## 8. Final audit (2026-10-25T22:10Z, Node v24.21.0, head = amendment 3)

| Check | Result |
|---|---|
| `npm test` | **521 / 521 pass** (baseline before the study: 485 on Node 24.21.0; +36 study tests incl. the final-round smoke test) |
| `npx tsc --noEmit` | clean |
| `npx eslint .` | 0 errors, 15 warnings (= the baseline's 15) |
| Existing canonical data (`results/audit/baseline-2026-10-25/data-before.sha256`, 49 files) | all identical |
| Tracked files (`tracked-before.sha256`, 12,251 files) | identical except the intended edits: `config/market-events/splits.json` (13 splits appended), `config/phenotypes/COMPATIBILITY.md` (generated row), `src/lib/tests/corporateActions.test.ts` (the 13 splits, strict equality kept), `src/phenotype/strategies.ts` (entry `robustD1`); also `.gitignore` (the study's regenerable logs) and `package.json` (script `robust-d1`, no `.env` autoload), which the baseline list did not cover |
| `research/joint-16-etf-d1/`, `research/d1-robust-design-review/`, phenotype JSONs, frozen engines and strategies | unchanged (git clean; the R1/R4 runner's whole-directory digest `28f95152…` before and after each run) |
| Staging and quarantine | no `data/<SYMBOL>.csv` left; no `data/quarantine/` |
| Records | `results/records.sha256` (99 files: every study JSON record, `FROZEN_SELECTION.json` and every retrospective output); `results/jsonl-records.sha256` (every JSON-lines record, incl. the git-ignored discovery logs) |
| Processes | none running |
| git | nothing committed; branch `research/trailing-buy-four-family-optimization`, HEAD `0e2df80d` |
| Credentials | never printed, logged or put on a command line; only the download child received them; no order, broker connection or money movement |
