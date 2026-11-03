# Implementation audit

## Code and isolation

- New code only in `src/d1-wide-library-selection/` (context, doors, freeze, records, candidates, fast, families,
  library, search, archive, census, anchors, engine, sample, selection, evaluation, nested, chronology, analysis,
  matrix, stats, tables, views, cli, main; tests in `tests/`). The only change outside the study's two folders is one
  `package.json` script (`d1-library-study`; `verify` checks that package.json differs from the baseline HEAD by
  exactly that). Engines, replays, loaders, the neighbourhood instrument, the episode catalog and the full-engine
  runner are imported read-only from the source study, the standalone audit and the frozen engine; nothing is copied
  or edited. No `.env`, credential, network, download, broker call or account action.
- Protected inputs unchanged: 64 canonical data files + `data/partitions.json` (identical to the standalone audit's
  baseline), B4/B5, every registered phenotype, splits, distributions, the source universe, the source STAGE_A records
  and archives, the prospective freeze. What `verify` checks: it re-hashes the files in `results/baseline/data.sha256`
  (65) and `results/baseline/key-inputs.sha256` (20); it checks package.json exactly (amendment 1); and, since
  reporting amendment 2, that no tracked path outside the study's two folders and package.json differs from the
  baseline HEAD `6489a63d` (`git diff --name-only`). The final auditor also compared `git ls-files -s` with
  `results/baseline/git-ls-files-stage.txt` by hand: identical.

## Parity, reproduction and fail-closed identities (every check passed)

| Check | Result |
|---|---|
| Archive reconstruction: every row of fold-a / fold-b / final re-evaluated on its own training window, 9 fields to the cent | 137,486 / 138,915 / 140,137 rows, **0 mismatches**; loaded bars = the source's Stage A door |
| A0 reproduction (representative, library, checked set + J_nb, evaluated, credible) | 61/61 in each of the three windows |
| Anchors: VGT primary, B5, B4 on fold-a/fold-b training windows and validation increments at 0/2/5/10 bps, fast path and full engine; full-history S/B4/B5 | **579/579** (v1 with a convention defect in this study's own check code, 498/531, superseded and kept) |
| Engine-versus-fast samples on training windows (6 folds) | **9,330 checks, 933 vectors, 0 failures** |
| Boundary parity (mark at the cutoff = sealed training net) | every vector of every phase (≈ 20–22k per primary phase) |
| Engine = fast per nominee (V, windowed daily DD, lots) at 0/2/5/10 bps, every window | every nominee of every engine phase (876 in A, 1,307 in B, …) |
| Cross-phase (B-sel vs B, A vs T1-later) and nested boundary parity, 5 bps all vectors and 0/2/10 bps nominees | passed |
| Determinism: pre-freeze S18 dry run vs official S18 | candidates, nominee digest, library digest, members and CSV byte-identical |
| Chronology (each evaluation from the current sealed SELECTION and seals and after them; each nested selection after its selection-window evaluation) | passed (`verify`, `analyze`, `tables` refuse otherwise) |

## Freezes, stamps, amendments

- `PROTOCOL_FREEZE.json` body `d45fc4118639b29b…` (2026-10-27T23:48:53.178Z; 50 files: protocol v2.1, rules, matrix,
  brief, both reviews and dispositions, superseded v1 documents, pre-freeze records, dry-run digests, baselines, every
  outcome-defining source file). `results/CODE_FREEZE.json` body `84ff5a4a64f83e7f…` (23:48:53.442Z; 27 files;
  outcome digest `53c1c9416f7156e3…`), before any post-freeze data stage.
- Every post-freeze record carries the protocol body, code body and outcome digest and starts after the code freeze;
  every consumer checks the stamps of the records it reads; `verify` checks all of them (362 checks before amendment 2, 364 after; all passed).
- Amendments (`results/amendments.jsonl`, hash-chained; both reporting, both `views.ts` only, both in `verify`):
  **1** (2026-10-28T02:17:16Z, `68953830c83a…`): package.json is checked exactly instead of by its pre-study hash.
  **2** (2026-10-28T02:50Z, `2a49c5e972ea…`, after the final audit's finding 7): `verify` also checks the tracked
  paths against the baseline HEAD and that the analysis inputs equal the current sealed evaluations, each finished
  before the analysis started. `verify` after amendment 2: **364 checks passed**
  (`results/logs/verify-after-amendment-2.log`). No outcome-defining file changed after the code freeze.

## Tables and exports (derived, unsealed; sha256 at the commit)

`results/analysis/ANALYSIS.json` file `ef5b076d0652…`, body `3f6ddbd53bc8…` (sealed). Written by the sealed `tables`
stage from it (02:12Z): `ledgers.csv` `cad1e0d5f85d736c…`, `comparisons.csv` `9fa76a82d649c9de…`, `nominees.csv`
`244af23ca0ae90ff…`, `comparisons.md` `1f2a4bc1f77b482c…`, `verdicts.md` `e797cc0527ea4ab5…`, `ablations.md`
`5a40fbae64728df0…`, `across-etf.md` `79bdb56966555cca…`, `census.md` `a4b6d8b20a890aa6…`, `discarded-groups.md`
`ff47d381ff365796…`, `etf-subsets.md` `766a22862eeb687d…`, `events-tails-portfolio.md` `d4f74b4d848f051b…`,
`libraries.md` `a93dec8ab90725be…`, `new-search.md` `0f05f6de678eaac9…` (`metrics.json`, a duplicate of the analysis
metrics, is git-ignored). Written after the final audit by study-local, read-only, stdlib-only Python scripts:
`ledger-reconciliation.csv` `54db79792ef3af9d…` (`scripts/reconcile_ledgers.py`; 2,818 nominee-windows, residual
non-zero exactly for the 929 with a carried-in lot, 0 identity failures) and `event-families.csv` `b76e5a71f2998fc8…`
(`scripts/event_families.py`; 6,410 rows; its dip-captured totals equal ANALYSIS.json's in all 68 cells it covers;
rerunning it reproduces the same bytes).

## Tests

- Study tests (`src/d1-wide-library-selection/tests/`): **32/32** — path distance and bounded-diameter families (no
  chaining), medoid; the paired comparison (floors, tie problem, breaches, insufficiency), verdict K rule, precedence,
  nested verdicts, study outcome; the calendar door (S18/S19 before fold A; fold A and S20 before fold B; T1 before
  B-sel's window; T2 and S22 before 2023), wrong-fold seals, the evaluation door (sealed selection, nested selection,
  2023-12-29, source caps, later-window pools), phase prerequisites; post-cutoff mutation leaves the training door,
  the new search (Sobol, refinement starts and moves, candidate ids), metrics, families, libraries and nominees
  byte-identical, a pre-cutoff mutation is visible; boundary-state accounting with a lot open across the cutoff
  (fast = engine); K-nesting; test overrides refused.
- After amendment 2 (2026-10-28T02:57Z): the study tests 32/32 again, `tsc` clean, `eslint` 0 errors / 12 warnings
  (`results/logs/post-audit-*.log`).
- `npm test` (whole repository, this Linux host, 2026-10-28 ≈02:20Z): **712/722**; the 10 failures are pre-existing and environmental
  (four legacy golden-master test files open `src/app/allin-original.ts`, the tracked file is `allIn-original.ts`; they
  fail identically at the baseline commit in a clean worktree). `npx tsc --noEmit -p .`: clean. `npx eslint
  src/d1-wide-library-selection`: 0 errors (warnings only: use-before-define of hoisted helpers, unused imports).

## Earlier studies' verifiers (before and after)

| Verifier | Before (2026-10-27 ≈22:13Z) | After (2026-10-28) |
|---|---|---|
| `npm run pools -- verify` | all checks passed | all checks passed |
| `npm run pools -- forward status` | freeze `407a669b…` verifies, observations 0 | same |
| `npm run vgt-robustness -- verify` | all checks passed | all checks passed |
| `ranked-preemption verify` at its own commit 40da6ddf (worktree) | 67 ok | 67 ok |
| `standalone-opportunity-audit verify` at 6489a63d (worktree) | all passed | all passed (9) |

The ranked-preemption verifier fails only its code-freeze check on any later branch (pre-existing: later studies add
`src/` files); the standalone audit's verifier fails only its isolation check in the main checkout (pre-existing: two
untracked macOS `._*` files) and rewrites its own `results/verify.json` when run — see incident 1.

## Reviews

1. Pre-freeze methodology and chronology review (`reviews/methodology-review.md`, verbatim): 6 MATERIAL, 12 MINOR, 5
   NOTE; all fixed before the freeze (`reviews/METHODOLOGY_DISPOSITIONS.md`).
2. Confirmatory review of v2 (`reviews/confirmatory-review.md`, verbatim): 1 MATERIAL (the undisclosed dry run), 11
   MINOR, 4 NOTE; all fixed before the freeze (`reviews/CONFIRMATORY_DISPOSITIONS.md`).
3. Final implementation-and-results audit (`reviews/final-audit.md`, verbatim; read-only subagent, 2026-10-28T02:38Z):
   "conforms" — 38 report-versus-record spot-checks (33 pass, 5 fail), an independent recomputation of every
   training-only nominee in folds A and B (9,760 slots), all 488 T1 A4 picks and the ARCH A2-vs-A0 paired statistics
   (0 mismatches); 1 MATERIAL (delivery: the README overstated what the commit held), 8 MINOR, 5 NOTE; none changes a
   verdict or the outcome. All dispositioned before the commit (`reviews/FINAL_AUDIT_DISPOSITIONS.md`): member
   records and per-vector window rows now committed, report corrections, a ledger reconciliation and a by-family
   export, reporting amendment 2.

## Incidents and deviations (all in the checkpoint's disclosure list)

1. The baseline run of the standalone audit's `verify` in the main checkout rewrote its tracked `results/verify.json`
   (2 lines); restored with `git checkout --` to the committed blob; later runs only in its worktree.
2. Anchors v1: check-convention defect in this study's own check code (friction and windowed daily-DD conventions);
   superseded by v2, 579/579.
3. Protocol v1 → v2 → v2.1 before the freeze, after two independent reviews (v1 kept in `reviews/superseded/`).
4. The pre-freeze S18 dry run (training only, capped at 2018-12-31; mode removed before the freeze; reproduced byte for
   byte by the official run).
5. The descriptive selection flag also fired for archive-provenance members of the ALL pool (505 self-matches; 0 for
   new provenance); no rule uses it.
6. The designer read A0's published fold outcomes before writing the protocol (PROTOCOL §0).
7. Two stage-runner waits used relative log paths inside the verification worktrees; the first worktree verifier runs
   did not start and were rerun with absolute paths (results above).
8. The final audit found reporting errors (finding 2's false dip claim, a per-K typo, wording slips) and a delivery
   gap (finding 1); all corrected in the reports before the commit, none in a sealed record.

## Compute

AMD Ryzen 7 9800X3D (8 cores, 16 threads), 59 GB RAM, Node v24.21.0, 14 worker threads. Archive reconstructions 3–5
min each; new searches 2.5–3.5 min per fold (413,280 evaluations); libraries 2.5–10 min per fold (1.77 M draws);
evaluations 3–19 min per phase; post-freeze stages 23:49Z → 02:10Z.
