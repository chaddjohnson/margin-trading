# Research recovery checkpoint — D1 ranked preemption (study `ranked-preemption`)

## Top screen (read this first)

All times UTC (`date -u`); `ls`/`stat` show local time (CET = UTC+1). Run every command from the repository root with
Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.

- **Updated:** 2026-10-26T21:31Z. **Status: COMPLETE.** All outcome stages sealed; reports written; final independent audit
  done (`reviews/final-audit.md`, verbatim; dispositions `reviews/FINAL_AUDIT_DISPOSITIONS.md`: 14 minor + 1 note,
  none MATERIAL; report text corrected, no sealed record changed). **Decision: NO ADVANCEMENT** (B4 default, B5
  leading incumbent). Historical check refused (no nominee); no prospective registration; **forward observations
  0**. **Committed** at the user's request as `9400593d` (761 files: this study, its src/ and research pools,
  the package.json script); not pushed. Re-checked at 21:31Z after the commit: `ranked-preemption verify` exit 0,
  `pools verify` all checks passed, `pools forward status` freeze `407a669b…` verifies, observations 0. CLI logs
  under `results/logs/` are on disk only (the repository's `logs/` ignore rule); run outputs under `evaluations/`.
- **Recovery performed:** context compaction before 19:29Z; reread `CLAUDE.md`, `docs/claude/context-recovery.md`
  and this file; no process was running; sealed hashes in §4 recomputed at 19:47Z (match).
- **Brief:** `brief/BRIEF.md` sha256 `e784c557…` (46,444 characters, all §0–§10).
- **Authority:** `PROTOCOL_FREEZE.json` (file `3713ec3f…`, body `e7f6f5fa…`, 18:09:47Z; binds `PROTOCOL.md`
  `154ef7d7…`, `context.ts` `1e6cf762…` and 19 more files). `results/code_freeze.json` (file `117bcac6…`, body
  `ca324dfe…`, 18:20:46Z; 451 files, digest `71c0a9e3…`). **Amendment head:** amendment 1 (reporting, `tables.ts`
  labels only), hash `40a936a4…`, 19:19:37Z. Parity `results/parity/PARITY.json` body `adb60092…` PASS.
- **Complete stages:** every stage in §4 (sealed, verify ok). Reports: README, FINAL_COMPARISON_AND_RECOMMENDATION,
  STANDALONE_SCREENING, FROZEN_PRIORITY_RANKINGS, OVERLAP_AND_PREEMPTION_DIAGNOSTIC, JOINT_SEARCH_AND_DIVERSITY,
  CHRONOLOGICAL_VALIDATION, IMPLEMENTATION_AUDIT. Final checks done 19:40–19:47Z: `npm test` 607/607, tsc clean,
  eslint 0 errors (15 pre-existing warnings), `ranked-preemption verify` ok, `pools verify` 66 PASS, `pools forward
  status` verifies (observations 0), baseline data 64/64.
- **Running:** nothing.
- **Next action:** none in this study. Pushing or merging needs the user's explicit request. Do not rerun anything.
- **Never:** rerun any stage command; run `historical-check`; edit any file in the prospective freeze's code closure
  (134 files: import closure of `src/app/pools.ts`, `src/pools/cli.ts`, `src/pools/forward/cli.ts`), the `pools` npm
  script, the package.json `imports` map or `package-lock.json`; edit files bound by `PROTOCOL_FREEZE.json` (incl.
  `reviews/DISPOSITIONS.md` and the three review files) or by the code freeze (any `src/**/*.ts`) except through
  `amend`; edit `config/pools/`, `config/phenotypes/`, `data/`, `config/market-events/`, any earlier `research/` study;
  evaluate any diverse-d1 finalist on bars after 2023-12-29; commit/push/merge without the user's request; broker,
  credentials (`.env`), downloads, network.

## 1. Environment (task start 2026-10-26T16:10Z)

- Branch `research/trailing-buy-four-family-optimization`, `HEAD` `9b0ab947`, working tree clean at start (only this
  study's new files since). Study commit `9400593d` (2026-10-26, on this branch, parent `9b0ab947`).
- Node v24.21.0 (fnm path above; `/opt/homebrew/bin/node` is v23.6.1 and must not be used).
- Machine: Apple M1 Pro, 10 cores, 16 GB.

## 2. Baseline hashes (`results/baseline/`, written 16:12Z)

- `data-csv.sha256`: 64 canonical `data/*/data.csv`; the list file hashes to `335a8450…` = the diverse-d1 baseline
  list (identical per-file hashes).
- `config.sha256`: splits `e5bde427…`, distributions `3b4342eb…`, partitions `43893f3d…`, `config/pools/B4.json`
  `4ca5aa1a…`, `B5.json` `deef53ca…`, phenotypes GDX `ed98c23c…` KRE `6b8889e2…` VGT `3e77a419…` XBI `453c4fd0…`
  XRT `d7b7f222…`, prospective `PROTOCOL_FREEZE.json` `0dabd97e…` (body `407a669b…`, verifies), its `PROTOCOL.md`
  `f2bca114…`, universe audit `research/d1-robust-pool-discovery/results/audit/universe.json` `ea7011ff…`, controls
  `research/joint-16-etf-d1/results/controls/controls.json` `2bd521dc…`, `package.json` `8e463958…` (will change:
  one new script), `package-lock.json` `ee4c73e3…` (must not change).
- `git-ls-files-stage.txt` (12,836 tracked files) sha256 `eede9f2d…`; `head.txt` `9b0ab947…`.

## 3. Audit findings (what exists, reused read-only)

- Engine: `src/portfolio-aware-d1/nbook/engine.ts` `runNAllocator` (fixed and portfolio; frozen shadow policy:
  one lot or reservation; same-minute ties alphabetical; per bar: core VOOG, virtual exits, core VGT, virtual fills,
  decisions, marks). Books: `src/multi-etf-allocator/shadow.ts` `ShadowBook` (shadow semantics: the book commits
  every signal; funding never feeds back). D1 machine: `src/shared-margin-portfolio/strategy.ts`.
- Fast path: `src/portfolio-aware-d1/trace.ts` (per-book trace) + `replay.ts` `replayFixedPool` (fixed mode only),
  proved equal to the engine by the earlier parity suites. Worker pool pattern: `src/d1-robust/{pool,worker}.ts`.
- Loader/doors: `src/portfolio-aware-d1/nbook/universe.ts` `loadNUniverse` (partition, access, endDate truncation);
  doors pattern `src/d1-robust/data.ts`; universe 61 eligible (`research/d1-robust-pool-discovery/results/audit/
  universe.json`). Box/grid: `src/multi-etf-d1/space.ts` (X 80–300, Y 1–50, stop 30–150, hold 3–30, L 20–250,
  buffer 0–60, P 30–200, W 10–200; tenths of a point). Neighbourhood instrument: `src/d1-robust/neighbourhood.ts`.
- Pools CLI: `npm run pools -- list|show|validate|fixed|portfolio|compare|costs|verify|research|forward`
  (`docs/pools/README.md`); the funded-trade ledger (`src/pools/trades.ts` `tradeLedgerOf`/`formatTradeLedger`)
  exists and is printed by default for `fixed`. B4/B5 anchors reproduced by `npm run pools -- verify` (64 checks).
- Prospective B4/B5 freeze (`research/prospective-b4-b5-shadow/`) is COMPLETE and verifies; observation count 0.
- Consequence: the preemption allocator is a **derived engine** in the new namespace (the frozen engine cannot be
  edited without invalidating the prospective freeze); its P0 path must equal the frozen engine exactly.

## 4. Stage table

Every stage command is `npm run ranked-preemption -- <command>` from the repository root (Node v24.21.0); each is
write-once (refuses if its sealed record exists) and checks the protocol freeze (and, from the parity stage on, the
code freeze or the latest amendment). **Resume semantics:** no stage resumes mid-way; an interrupted stage leaves no
sealed record and would rerun completely with the same configuration and seeds (labelled as a rerun). All stages
below are **complete**; none may be rerun.

| Stage | Command | Start → end (UTC) | Sealed output (file / body) | Log |
|---|---|---|---|---|
| universe re-audit | `audit` | 16:44Z | `results/audit/universe.json` `26e71c4c…` | `results/logs/audit.log` |
| compute benchmark (timings only) | `benchmark --workers 8` | 16:53Z → 16:55Z | `results/benchmark/tier.json` `9eb2af22…` (T1) | `benchmark.log` |
| protocol freeze | `freeze-protocol` | 18:09:47Z | `PROTOCOL_FREEZE.json` `3713ec3f…` / `e7f6f5fa…` | (not logged to a file; the record verifies) |
| parity gate | `parity` | 18:10:07Z → 18:16:53Z | `results/parity/PARITY.json` `0ebb80c6…` / `adb60092…` | `parity.log` |
| code freeze | `freeze-code` | 18:20:46Z | `results/code_freeze.json` `117bcac6…` / `ca324dfe…` | (not logged to a file; the record verifies) |
| fold-a Stage A | `standalone --window fold-a` | 18:21:02Z → 18:26:30Z | `results/standalone/fold-a/STAGE_A.json` `7de15ca8…` / `46b91ce1…` | `standalone-fold-a.log` |
| fold-a rankings | `rank --window fold-a`; `recheck-rankings --window fold-a` | 18:26Z; → 18:30Z | `rankings/fold-a/R1.json` `ac68653e…` / `e41be4a2…`; `R2.json` `15e0bae8…` / `15696c20…`; `results/rankings-check/fold-a.json` (59/59) | `rank-fold-a.log`, `recheck-rankings-fold-a.log` |
| fold-a diagnostic | `diagnostic --window fold-a` | 18:30:44Z | `results/diagnostic/fold-a/DIAGNOSTIC.json` `5d1769fa…` / `12495851…` | `diagnostic-fold-a.log` |
| fold-a joint | `joint --window fold-a` | 18:31:01Z → 18:34:14Z | `results/joint/fold-a/R1/JOINT.json` `fe027a6c…` / `396fcdde…`; `R2` `e2685b7c…` / `5303dcdb…` | `joint-fold-a.log` |
| fold-a controls | `controls --window fold-a` | 18:34:34Z → 18:35:48Z | `results/controls/fold-a/CONTROLS.json` `0d3b3ee6…` / `3c2215ef…` | `controls-fold-a.log` |
| fold-a picks | `picks --window fold-a` | 18:35:49Z | `results/walkforward/fold-a/PICKS.json` `c4c964d4…` / `ff8a7a6a…` | `picks-fold-a.log` |
| fold-a validation | `validate --fold fold-a` | 18:35:59Z → 18:37:24Z | `results/walkforward/fold-a/VALIDATION.json` `f9bb3c2e…` / `a2c27d0c…` | `validate-fold-a.log` |
| fold-b Stage A … validation | the same ten commands with `fold-b` | 18:38:35Z → 18:56:48Z | STAGE_A `ed262c96…` / `fb025f3f…`; R1 `8f6b36c8…` / `f9f06524…`; R2 `d9f7f800…` / `0f58ae76…` (recheck 60/60); DIAGNOSTIC `a7b12bdd…` / `32b8fec7…`; JOINT R1 `fef84b06…` / `431321d1…`, R2 `79e522d0…` / `fc8be32f…`; CONTROLS `9f27296f…` / `5452b372…`; PICKS `1e393f20…` / `ea5ba863…`; VALIDATION `51ab0990…` / `7f5a4e77…` | `*-fold-b.log`, `chain-fold-b.log` |
| procedure gate | `procedure-gate` | 18:57:21Z | `results/walkforward/PROCEDURE_GATE.json` `c6f218d8…` / `d2bd6ebd…` (all four fail) | `procedure-gate.log` |
| final Stage A … controls | `standalone`, `rank`, `recheck-rankings`, `diagnostic`, `joint`, `controls` with `--window final` | 18:57:40Z → 19:17:44Z | STAGE_A `e2ca76b1…` / `180e6498…`; R1 `eddd09e8…` / `d78064c4…`; R2 `43f2f80e…` / `db4f4682…` (recheck 60/60); DIAGNOSTIC `e8b57af8…` / `61d537c5…`; JOINT R1 `f08273d0…` / `bfcace33…`, R2 `dabc266e…` / `8189f487…`; CONTROLS `e83b8e0b…` / `238f3368…` | `*-final.log`, `chain-final.log` |
| selection | `select` | 19:18:25Z | `FROZEN_SELECTION.json` `450e6f7f…` / `ee251d7a…` (no advancement) | `select.log` |
| research pools | `export-pools --window fold-a|fold-b|final` | 19:18Z | 20 JSONs under `config/research-pools/d1-ranked-preemption/` (verify ok) | `export-pools-*.log` |
| historical check | `historical-check` | refused (no nominee) | none | `historical-check-refusal.log` |
| reporting amendment 1 | `amend --stage reporting …` | 19:19:37Z | `results/amendments.jsonl` line 1, hash `40a936a4…` (file `2a17325d…`) | — |
| CLI demonstrations | read-only (`list`, `show`, `fixed`, `portfolio`, `preemptions`, `compare`, `prospective`, `verify`, refusals) | 19:20Z → 19:23Z; 19:46Z → 19:47Z | `evaluations/ranked-preemption/` (git-ignored) | `results/logs/cli-*.log` |
| reports | written by hand from the sealed records and tables | 19:25Z → 19:47Z | the eight reports; `results/tables/joint-diversity.md` (`3f29773b…`) from `scripts/joint_diversity.mjs` (`26de3af6…`) | — |
| final checks | `npm test`, `npx tsc --noEmit`, `npx eslint`, `npm run pools -- verify`, `npm run pools -- forward status` | 19:40Z → 19:47Z | — | `npm-test-final.log`, `tsc-final.log`, `eslint-final.log`, `pools-verify-final.log`, `pools-forward-status-final.log` |
| final independent audit | read-only subagent | about 19:42Z → about 20:08Z (25.5 min) | `reviews/final-audit.md` (verbatim), `reviews/FINAL_AUDIT_DISPOSITIONS.md` | — |
| audit follow-up | `preemptions RP-final-<B|C|D>-<R1|R2>` (read-only, training data) for the switching costs; report corrections; `verify` | 20:08Z → 20:16Z | `scripts/switching_costs.py`; reports; `results/logs/cli-preemptions-RP-final-*.log`, `cli-verify-final.log` (67 ok) | — |

## 5. Constants

All in the frozen `src/d1-ranked-preemption/context.ts` (`1e6cf762…`) and `PROTOCOL.md` §4–§16: windows and search
ends (fold-a 2020-06-30, fold-b 2021-12-31, final 2023-12-29; validation ends 2021-12-31, 2023-12-29), arming
2017-06-15, costs 0/2/5/10 bps (5 principal), 11% interest, $100,000 slot; seeds derived from stage labels
(`standalone:<window>:<SYMBOL>`, `joint:<window>:<arm>`, `promotion:<window>:<ranking>`,
`assessment:<window>:<ranking>`, `nomination:final:<ranking>`); budgets from tier T1 (Stage A 2,048 Sobol + local
search per ETF; Stage D 10,000 evaluations per arm in the folds, 16,000 in the final window); thresholds (credible DD
$35,000, J penalties, fold margin $5,000, N3 share 75%, historical tolerance $10,000).

## 6. Running work

- None.

## 7. On disk versus in memory

- Everything is on disk: sealed records, reports, the final audit and its dispositions. Nothing exists only in the
  conversation.

## 8. Guards

- **Do not rerun:** every stage in §4 (sealed); `historical-check` (no nominee); the prospective B4/B5 freeze is
  separate and must not be touched. Never reopen the validation windows or read post-2023 bars for any new
  configuration.
- **Next authorised step:** none. Commit only on the user's explicit request.

## 9. Disclosures (for the final report)

1. The benchmark (16:53Z, before the freeze) timed loads and evaluations on the final window's training span —
   timings only, disclosed in PROTOCOL §0; refused after the freeze.
2. A shell loop with an unquoted variable passed "rank --window fold-a" as one argument; the CLI refused it as an
   unknown command (nothing ran or was written); rerun with explicit arguments.
3. The fold-b/final chain scripts reported exit status 1 although every stage exited 0 (a `[[ … ]] && exit` artifact
   on the last line); per-stage exit codes are in `chain-*.log`.
4. `freeze-protocol` and `freeze-code` output was not captured to log files; their records verify.
5. Reporting amendment 1 (`tables.ts` column labels only) after all outcomes were sealed.
6. The header comment of `parity.ts` still says "final window" for checks (ii)–(iii); the code uses fold-a's
   training data (frozen file, left unchanged).
7. `reviews/DISPOSITIONS.md` quotes test counts as of 17:37Z (scenarios 14 at that time; 15 at the freeze; 36 study
   tests in total) — bound by the protocol freeze, unchanged.
8. Regime attribution inside 2022–2023 (G10–G13) was not stored in the sealed validation records; not reconstructed.
9. eslint flagged `console` in the new `.mjs` helper (no Node globals for `.mjs` in the lint config); fixed with
   `/* global console */`; output byte-identical.
10. Context compaction occurred before 19:29Z; recovery performed (see top screen).
11. After the final audit, report text was corrected (14 minor findings; `reviews/FINAL_AUDIT_DISPOSITIONS.md`) and
    the switching frictions and interest were computed from read-only CLI runs of the six final picks on training
    data. The research-pool JSONs' evidence labels ("E0/E1 training only", C role "procedure") and two ledger-header
    texts from the frozen pools formatter are known inaccuracies, documented in `README.md`, files unchanged.
12. The B4-as-comparator fix (confirmatory review finding 1) was made before the freeze without a further re-review;
    the final audit verified its implementation.
13. The exploration reserve was empty by construction (frozen rule; design defect not caught before the freeze).
