# Research recovery checkpoint — d1-wide-library-chronological-selection-v1 (Study 1 of 3)

## Top screen (read this first)

All times UTC (`date -u`). File listings on this host show local time (CET, UTC+1).

- **Updated:** 2026-10-28T03:00Z. **Status: COMPLETE — every stage, the analysis (outcome: no demonstrated
  improvement; nested: validation selection is worse), tables, reports, verifiers, the final independent audit and
  its dispositions are done; the study is committed (`1891d32d9e7c0e5952c5f0034f64a57305485fe9`) and pushed to
  `origin/research/d1-wide-library-chronological-selection` (remote head verified with `git ls-remote` at
  03:00:05Z); this checkpoint update is a follow-up commit on the same branch.** Study 2 and Study 3 are **not
  started**.
- **Brief:** `brief/BRIEF.md` sha256 `f6743100d09682858f7bf316efb2a33e7830a3d9eb54d1f0e4bf32ce83868b74`.
- **Authority:** `PROTOCOL_FREEZE.json` (file `c8e276419f1d1944…`, body `d45fc4118639b29b…`, 2026-10-27T23:48:53.178Z,
  50 files; PROTOCOL.md `8fc3ba56b25dbce9…`). `results/CODE_FREEZE.json` (file `b5b2a35cc74e4035…`, body
  `84ff5a4a64f83e7f…`, 23:48:53.442Z, 27 files, outcome digest `53c1c9416f7156e3…`). **Amendment head: 2**
  (`results/amendments.jsonl` file `58c78aac12c3…`; both reporting, `views.ts` only: 1 `68953830c83a…` exact
  package.json check; 2 `2a49c5e972ea…` baseline-HEAD path check and analysis input/timing check).
- **Sealed outcome:** `results/analysis/ANALYSIS.json` file `ef5b076d0652…`, body `3f6ddbd53bc8…`
  (02:10:34→02:10:36Z).
- **Running processes:** none. The final auditor (subagent `a66ba08cd87706157`) finished at 02:38Z; no stage runs.
- **Next command:** none for Study 1. Studies 2 and 3 need their own briefs and protocols (new namespaces); nothing
  here authorizes starting them.

## Environment

- Repository root: the main checkout of `margin-trading` (all paths below are repository-relative). Branch
  `research/d1-wide-library-chronological-selection`, created before this session at
  `6489a63d86c0e745377da60ba57cd590ec8ca74a` (= the pushed head of `research/d1-standalone-etf-opportunity-robustness`,
  the completed standalone audit). No upstream before this study's push.
- Working tree after the commit: clean except two untracked macOS metadata files `._.DS_Store`, `._data` (not this
  study's; never staged, never deleted). The study's commit holds its two folders and the one package.json script.
- Node v24.21.0 (system `node`; `.node-version`), Linux, 16 logical cores, 59 GB RAM; stage heap
  `--max-old-space-size=24576` (the npm script); 14 worker threads.
- Disposable detached worktrees in the session scratchpad (for verifying earlier studies at their own commits only):
  `wt-40da6ddf` (ranked-preemption), `wt-6489a63d` (standalone audit); both clean, removed with
  `git worktree remove --force` at 03:00:21Z (`git worktree list` shows only the main checkout).
- Credentials: none used (no `.env`, network, download or broker call by any stage).

## Baseline (results/baseline/, 2026-10-27T22:15Z)

- `data.sha256` (64 data.csv + partitions.json) — identical, file for file, to the standalone audit's baseline.
- `key-inputs.sha256` (B4/B5, phenotypes, prospective freeze, splits, distributions, source universe, source STAGE_A
  records and archives, package.json `1e5efbb8…`, package-lock.json `ee4c73e3…`).
- `protected-tracked.ls-files.txt` (975 tracked files under config/ and the five protected research folders),
  `git-ls-files-stage.txt` (13,847 tracked files), `head.txt`.
- Prior verifiers (logs in `results/logs/baseline-*.log`): `pools verify` all passed; `pools forward status` freeze
  `407a669b…` verifies, observations 0; `vgt-robustness verify` all passed; ranked-preemption verify fails only its
  code freeze on this branch (pre-existing) and passes (67 ok) at its own commit 40da6ddf; standalone-audit verify
  fails only its isolation check on this branch (pre-existing: the two untracked `._*` files) and passes at 6489a63d;
  `robustness-audit` has no verify command (its records are covered by `pools verify` and the hash manifests).

## Pre-freeze stage table

| # | Stage | Status | Command | Output |
|---|---|---|---|---|
| 0 | State audit, baselines, prior verifiers | complete 22:20Z | see above | `results/baseline/*`, `results/logs/baseline-*` |
| 1a | Archive field inventory (counts/hashes only; all 3 windows) | complete 22:24Z | `npm run d1-library-study -- archive-inventory` | `results/archive/INVENTORY.json` `2d1b3eae…` |
| 1b | fold-a archive reconstruction (137,486 rows re-evaluated on 2016-01-04→2020-06-30, 9 fields, 0 mismatches; loaded bars = source Stage A door) | complete 22:26:38→22:30:16Z | `reconstruct --window fold-a --workers 14` | `results/archive/fold-a/RECONSTRUCTION.json` file `96c47e5a…` body `33db1732…`; `candidates.jsonl.gz` `5be8c45f…` (25 MB, 28,067 credible) |
| 1c | fold-a census v1 — superseded by the post-freeze v2 census (review finding 11) | complete 22:33Z | `census --window fold-a --workers 14` | `results/archive/fold-a/CENSUS-prefreeze-v1.json` file `bac3ea6a…` body `067ea907…` |
| 1d | Anchors (incumbents only) | complete 22:39Z, 579/579 | `anchors --workers 14` | `results/parity/ANCHORS.json` file `e5a417c8…` body `a42a0ddf…`; superseded v1 `ANCHORS-v1-superseded.json` `a21257f4…` |
| 1e | Outcome-free collision count (0 in every window) | complete 23:10Z | scratch script (grid keys only) | `results/archive/NEW_SOBOL_COLLISIONS_PREFREEZE.json` |
| 1f | Methodology review → protocol v2; confirmatory review → v2.1 | 22:47→23:45Z | subagents | `reviews/*` |
| 1g | Training-only S18 dry run (scratch root; capped at 2018-12-31; mode removed before the freeze) | 23:26→23:34Z | removed mode | `results/dryrun-S18-prefreeze/DRYRUN_DIGESTS.json` |
| 1h | Protocol and code freeze | 23:48:53Z | `freeze-protocol`, `freeze-code` | as in the top screen |

## Post-freeze stage table (scripts/run-stages.sh; one log per step in results/logs/stage-<n>-*.log)

Every stage is write-once and refuses to rerun; each record is stamped with the protocol body, code body and outcome
digest. Resume semantics (no longer needed): a failed step left no sealed record and is rerun whole with the same
command; `scripts/run-stages.sh <n+1>` resumes after step n.

| # | Stage | Status (UTC, 2026-10-27/28) | Record (file sha256 / body hash, 12 hex) |
|---|---|---|---|
| 1 | S18 search | 23:49:24→23:51:56Z | `results/search/S18/SEARCH.json` `4ceba9dd6f44` / `a8269dcfc471` |
| 2 | S18 sample parity | 23:51:57→23:54:11Z | `results/parity/SAMPLE_PARITY_S18.json` `0be08ea25360` / `1469552d677c` |
| 3 | S18 libraries | 23:54:12→23:56:49Z | `results/libraries/S18/SELECTION.json` `d39d5e912c13` / `57b2282f5c6f` |
| 4 | S19 search | 23:56:49→23:59:33Z | `results/search/S19/SEARCH.json` `5601c0665094` / `b73f70d5a618` |
| 5 | S19 sample | 23:59:33→00:01:51Z | `results/parity/SAMPLE_PARITY_S19.json` `fd94ff81f985` / `11bb0163fc7b` |
| 6 | S19 libraries | 00:01:52→00:05:15Z | `results/libraries/S19/SELECTION.json` `b3899bd6ca9f` / `fa80f619ac66` |
| 7 | fold-a census v2 | 00:05:15→00:07:34Z | `results/archive/fold-a/CENSUS.json` `58c779558e67` / `45cbbc3df17d` |
| 8 | A search | 00:07:34→00:10:26Z | `results/search/A/SEARCH.json` `fb657534b0fb` / `b17e54ca5ea7` |
| 9 | A sample | 00:10:26→00:12:56Z | `results/parity/SAMPLE_PARITY_A.json` `8ca0e86895e3` / `2d4502453545` |
| 10 | A libraries | 00:12:57→00:20:20Z | `results/libraries/A/SELECTION.json` `882f220a655c` / `322b362aea25` |
| 11 | S20 search | 00:20:21→00:23:19Z | `results/search/S20/SEARCH.json` `8ea3ae98eee9` / `9cdaf5b75393` |
| 12 | S20 sample | 00:23:19→00:25:44Z | `results/parity/SAMPLE_PARITY_S20.json` `6b0fa959ef7c` / `1c7b73eea606` |
| 13 | S20 libraries | 00:25:44→00:29:48Z | `results/libraries/S20/SELECTION.json` `085d3c6d9bc8` / `dd06304d3ccb` |
| 14 | phase A evaluation | 00:29:49→00:41:05Z | `results/evaluation/A/EVALUATION.json` `d46bb843e7ff` / `e819219af3d9` |
| 15 | T1 nested selection | 00:41:05Z | `results/nested/T1/SELECTION.json` `3b23a552215e` / `a7a00a5e7b51` |
| 16 | fold-b reconstruction | 00:41:35→00:45:42Z | `results/archive/fold-b/RECONSTRUCTION.json` `9b5d3d0183ee` / `4f4c8f65a15f` |
| 17 | fold-b census | 00:45:43→00:48:07Z | `results/archive/fold-b/CENSUS.json` `077cf8bc64a8` / `cb8e5c17f0bb` |
| 18 | B search | 00:48:07→00:51:19Z | `results/search/B/SEARCH.json` `bf028674ae91` / `f29955a007c2` |
| 19 | B sample | 00:51:20→00:53:58Z | `results/parity/SAMPLE_PARITY_B.json` `f7f302ddfb90` / `8c10756aec78` |
| 20 | B libraries | 00:53:58→01:03:56Z | `results/libraries/B/SELECTION.json` `49ef52775c32` / `7f577b0c3e6a` |
| 21 | phase B-sel (S21) evaluation | 01:03:56→01:06:37Z | `results/evaluation/B-sel/EVALUATION.json` `9385b4ef3ea6` / `9de088611b6f` |
| 22 | T2 nested selection | 01:06:38Z | `results/nested/T2/SELECTION.json` `7de692e16fe0` / `38bda1539480` |
| 23 | S22 search | 01:06:38→01:10:04Z | `results/search/S22/SEARCH.json` `dc14b7c39dd8` / `bca0c922a378` |
| 24 | S22 sample | 01:10:04→01:12:35Z | `results/parity/SAMPLE_PARITY_S22.json` `14276802ff94` / `638de3d552e3` |
| 25 | S22 libraries | 01:12:36→01:17:31Z | `results/libraries/S22/SELECTION.json` `801ba2183597` / `e2d46e55723e` |
| 26 | phase B evaluation (incl. T2-later) | 01:17:31→01:36:04Z | `results/evaluation/B/EVALUATION.json` `96c37a9896f7` / `9252011a5e02` |
| 27 | phase T1-later evaluation | 01:36:04→01:45:21Z | `results/evaluation/T1-later/EVALUATION.json` `33bdb4f4fd10` / `b8bbeb8b9c8a` |
| 28 | phase S18 evaluation | 01:45:21→01:48:19Z | `results/evaluation/S18/EVALUATION.json` `dbc063c22468` / `9d3ef624447d` |
| 29 | phase S19 evaluation | 01:48:19→01:52:08Z | `results/evaluation/S19/EVALUATION.json` `2ee2e52fd4af` / `9f53c4b84312` |
| 30 | phase S20 evaluation | 01:52:09→01:56:54Z | `results/evaluation/S20/EVALUATION.json` `0dae04fc0471` / `0ad086f067fd` |
| 31 | phase S22 evaluation | 01:56:54→02:02:37Z | `results/evaluation/S22/EVALUATION.json` `8a5de318680c` / `4e6e835e84a9` |
| 32 | final-window reconstruction | 02:02:37→02:07:34Z | `results/archive/final/RECONSTRUCTION.json` `9ea8b230bb42` / `05211dc56063` |
| 33 | final-window census | 02:07:34→02:10:05Z | `results/archive/final/CENSUS.json` `391fc7dee059` / `371b21cb3927` |
| 34 | analysis | 02:10:34→02:10:36Z: **no demonstrated improvement; validation selection is worse** | `results/analysis/ANALYSIS.json` `ef5b076d0652` / `3f6ddbd53bc8` |
| 35 | tables | 02:12Z | `results/tables/*` (hashes in `IMPLEMENTATION_AUDIT.md`; `ledgers.csv` `cad1e0d5f85d736c`, `comparisons.csv` `9fa76a82d649c9de`, `nominees.csv` `244af23ca0ae90ff`) |
| 36 | reports, CLI demonstrations, `verify`, earlier verifiers, npm test, tsc, eslint | ≈02:20Z | `results/logs/final-*.log`, `cli-*.log` |
| 37 | final independent audit (subagent `a66ba08cd87706157`, read-only) | 02:38Z, "conforms" | `reviews/final-audit.md` `8048b7e628f0ba41` |
| 38 | dispositions: tracked member/window records, report corrections, `scripts/reconcile_ledgers.py` (`ledger-reconciliation.csv` `54db79792ef3af9d`), `scripts/event_families.py` (`event-families.csv` `b76e5a71f2998fc8`), amendment 2, `verify` 364/364, study tests 32/32, tsc clean, eslint 0 errors | 02:44→02:59Z | `reviews/FINAL_AUDIT_DISPOSITIONS.md`; `results/logs/verify-after-amendment-2.log`, `post-audit-*.log` |
| 39 | commit and push | complete 03:00Z: commit `1891d32d…` (159 files), `git push -u origin research/d1-wide-library-chronological-selection`, `git ls-remote` = `1891d32d…`; `verify` on the committed tree 364/364; scratch worktrees removed 03:00:21Z | branch `research/d1-wide-library-chronological-selection` |

Determinism: the official S18 search candidates (`797c5c13…`), nominee digest (`3f0ff3ea…`), library digest
(`f346367d…`), members and CSV are byte-identical to the pre-freeze dry run. Every phase's boundary, cross-phase,
nested-boundary and engine-equals-fast identities passed (fail closed); e.g. phase A: boundary parity 20,591 vectors,
engine = fast for 876 nominees × 4 costs, 10,672 capture draws.

## Constants

Seeds, budgets, folds, data-access cutoffs, thresholds and decision rules: `PROTOCOL.md` v2.1 §2–§9 and
`EXPERIMENT_MATRIX.json` (both protocol-frozen). Data cutoffs: no bar after 2023-12-29 for any candidate; archived
fold-a vectors only through 2021-12-31, fold-b vectors through 2023-12-29, final-window vectors only on their own
training span.

## On disk versus in memory

Everything the reports rely on is on disk. Committed: every sealed record, the member records and per-vector window
rows, engine rows, tables and exports, reports, reviews. Local only (git-ignored): the training candidate rows
(`results/archive/*/candidates.jsonl.gz`, `results/search/*/candidates.jsonl.gz`, about 149 MB; sha256 in the sealed
records), `results/tables/metrics.json` and `results/logs/`.

## Guards / next authorised step

- **Do not rerun** any stage 1–35 or any pre-freeze stage; do not edit any sealed record, the protocol, the code
  freeze's files (except by a hash-chained amendment) or the dry-run records.
- Never edit config/, data/, any earlier research/ folder, the prospective freeze's code closure, the `pools` script,
  the package.json `imports` map or package-lock.json. Only the one package.json script was added.
- Never evaluate a source fold-a vector after 2021-12-31, a fold-b vector after 2023-12-29, or any final-window vector
  on any window other than its own training span; never read any bar after 2023-12-29 for any research candidate.
- **Commit and push (brief §13): done** (stage 39). Commands run from the repository root:
  `git add research/d1-wide-library-chronological-selection src/d1-wide-library-selection package.json`, `git commit`,
  `git push -u origin research/d1-wide-library-chronological-selection`,
  `git ls-remote origin refs/heads/research/d1-wide-library-chronological-selection`. No merge, force push, PR or tag.
- **Next authorised step:** none within Study 1. Do not reopen any window, rerun a stage or start Study 2 / Study 3
  without the user's request and a new protocol.

## Disclosures

1. The branch existed (at the audit head) before this session; no study file existed.
2. Anchors v1 (22:37Z) failed 33 of 531 checks, all at nonzero cost and all convention mismatches in this study's
   own check code: (a) the audit's liquidation-view friction includes the exit friction of a lot open at the cutoff,
   the sealed `costs` does not; (b) the audit's `windowedOf` daily DD uses liquidation marks, the sealed windowed DD
   the engine's raw daily marks. Every net, V, minute DD, lot count and interest figure matched to the cent. v1 is
   preserved (`ANCHORS-v1-superseded.json`); v2 compares like with like: 579/579.
3. The pre-freeze fold-a census (training through 2020-06-30 only) informed the design, including the family diameter
   d ≤ 0.5 (PROTOCOL §6.2): median 40 families per ETF; ≥ 8/16/32/64 families in 53/48/36/11 ETFs; T-a 18%, T-b 93%.
   Its reconstruction read bars through 2020-06-30, which contain S18's 2019 window and half of S19's 2020 window
   (archived ARCH grids on their own training span only; PROTOCOL §3.2). No fold-B or final-window outcome was
   computed or inspected before the freeze.
4. **Incident:** the baseline run (≈22:13Z) of `npm run standalone-opportunity-audit -- verify` in the main checkout
   rewrote that study's tracked `results/verify.json` (2 lines: its isolation check). Detected by `git status` at
   22:58Z and restored with `git checkout --` to the committed blob `70dcc513…` (= the baseline manifest); afterwards
   that verifier ran only in its own-commit worktree. No other protected file changed.
5. `npm test` on this Linux host: 700/710 pass before the freeze (log ends 2026-10-27T22:59:37Z,
   `results/logs/npm-test-prefreeze.log`) and 712/722 at the end (≈02:20Z). The 10 failures are pre-existing and
   environmental: four legacy test files open `src/app/allin-original.ts` while the tracked file is
   `src/app/allIn-original.ts`; they fail identically at the baseline commit 6489a63d in a clean worktree. The
   pre-freeze log predates the study tests added after the confirmatory review; the final run passes the frozen 32.
6. Methodology review (finding 3): the designer read the standalone audit's published per-ETF fold V of every A0
   representative (both folds) before writing the protocol; disclosed in PROTOCOL §0.
7. **The pre-freeze S18 dry run** (2026-10-27T23:26–23:34Z; training only, every load capped at 2018-12-31; a mode,
   removed before the freeze, that bypassed the freezes; structural counts only were looked at; PROTOCOL §0). The
   official S18 records reproduce its digests byte for byte. Its frozen record
   `results/dryrun-S18-prefreeze/SEARCH-dryrun.json` contains the absolute path of the session scratch directory it
   wrote to (one string, which includes the local user name); it is bound by the protocol freeze hash and is left
   unedited (17 files already tracked in the repository contain similar local paths).
8. **Known defect (descriptive only):** the selection flag "training trade signature equals an archived vector" also
   fires for archive-provenance members of the ALL pool (215 in fold A, 290 in fold B; all self-matches; 0 for new
   provenance); no rule uses it; reports cite the new-provenance count.
9. The first worktree verifier runs at the end used a relative log path inside the worktrees and did not start; they
   were rerun with absolute paths (both pass).
10. The final audit's findings (one delivery gap, reporting errors, wording slips) were corrected in reports, exports
    and a reporting amendment before the commit (`reviews/FINAL_AUDIT_DISPOSITIONS.md`); no sealed record changed.
