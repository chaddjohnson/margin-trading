<!-- Verbatim handback of the independent final-audit agent (general-purpose subagent, ~10:55Z to 2026-10-26T11:18:06.099Z, after every study stage was sealed). Extracted unchanged from the session transcript on 2026-10-26. Brief: final-audit.PROMPT.md. Dispositions: IMPLEMENTATION_AUDIT.md section 9. -->

# Final audit: D1 diverse-pool discovery (`research/d1-diverse-pool-discovery/`)

Auditor: an independent read-only agent, 2026-10-26, about 10:55–11:15Z. I edited no repository file. My only write was the permitted `npm run diverse-d1 -- legacy-check`, which created `results/legacy/legacy-check-after-freeze-2026-10-26T11-00-38-078Z.json` (sha256 `3f7df76f…`). `npm test` also rewrote the same git-ignored fixtures that the study's own test runs regenerate (see observation 6). My scripts are in `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/010d3095-ab38-45a6-a34b-fb43ed1c0d12/scratchpad/audit/`.

## 1. Checks I ran

### Integrity chain
I recomputed `sha256(JSON.stringify(body))` with Node, the same rule as `src/d1-robust/freeze.ts:28,50-63`.

- **All 16 body-hash records verify:**
  - `design_commitment` `bc6fcdf2…`
  - `protocol_freeze` `918c221b…`
  - three calibrations: `7bec4b6b…`, `d8919f74…`, `2bf44343…`
  - three round search manifests: `6b4442ec…`, `75178c0e…`, `77f553e5…`
  - two `PICKS`: `206466c4…`, `0f6cdcdc…`
  - two validations: `1e96c85c…`, `0e7fd4e2…`
  - `PROCEDURE_GATE` `9b343385…`
  - `rounds/final/selection.json` `26b29f03…`
  - `FROZEN_SELECTION` `ae20e984…`
  - root `PROTOCOL_FREEZE.json` `1f11e7fe…`
- **Change log:** change 1 `17c8e445…` chains to the commitment body. The freeze binds the commitment and the change head (count 1). The freeze's protocol and code equal change 1's `protocolAfter` and `codeAfter`.
- **Amendment log:** amendment 1 `7a0aa610…` chains to the freeze body. Its `codeBefore` equals the freeze code `fd549635…`.
- **Code manifest:** recomputed today, 405 files, `42d2dd47…`, which equals amendment 1's `codeAfter`.
- **Amendment scope:** amendment 1's `codeFiles` differ from the freeze's in `src/d1-diverse/final.ts` only (`eb20e15e…` → `3a156064…`). It left the protocol and context unchanged. The guard at `freeze.ts:405` limits post-validation amendments to `final.ts`, `cli.ts` and `stages.ts`. `final.ts` is imported only by the `freeze-selection`, `confirm-b` and `evaluate` commands (`cli.ts:45-47`), not by `select`.
- **Protocol and context:** `PROTOCOL.md` `6e4df57a…` and `context.ts` `98428dac…` equal the frozen hashes.
- **Freeze-bound inputs and checks:** universe, tier, schedule, splits, ledger, partitions, legacy, reproduce and parity all equal their frozen hashes.
- **`FROZEN_SELECTION.json`:** all 108 records verify (body hashes or file sha256, as appropriate), and so do all 61 data hashes.
- **confirm-B and evaluation:** these two have no `bodyHash`. Their file hashes match the quoted ones (`e4916bbb…`, `87018fa9…`), and each `manifestHash` equals the `FROZEN_SELECTION` body.
- **Other bound files:** all 10 `archive.jsonl` files equal their sealed `logSha256`, and all 3 `controls.jsonl` files equal `controlsSha256`.

### Chronology
I checked `generatedAt` and the provenance fields. Every record comes after the record it binds:

- commitment 03:08:18; change 1 03:50:14; M1 checks 03:50–04:19, all stamped with code `fd549635`; freeze 04:20:08
- controls 04:27, 04:35, 04:46
- fold-a: search 05:02:51 → `PICKS` 05:15:37 → validation 05:19:38
- determinism 05:39
- fold-b: search 05:59:56 → `PICKS` 06:16:55 → validation 06:21:16
- gate 06:21:18
- final search sealed 08:48:34 → amendment 08:49:19 → selection 10:21:13 (code `42d2dd47`) → `FROZEN_SELECTION` 10:44:31 → confirm-B 10:49:13 → evaluation 10:49:40

The logs confirm that each `validate` started only after "PICKS.json sealed": `fold-a.log:84-86` and `fold-b.log:98-100`.

### Data and isolation
- All 64 `data/*/data.csv` files plus partitions, splits and the distributions ledger pass `shasum -c` against `results/baseline/`. The baseline list equals the 64 CSVs on disk.
- `git ls-files -s` is byte-identical to `results/baseline/git-ls-files-stage.txt` (`f3125ec6…`).
- `HEAD` is `348f100b`. The reflog shows no newer commit, and there are no stashes.
- Status: modified `.gitignore`, `package.json`, `src/phenotype/strategies.ts` and `config/phenotypes/COMPATIBILITY.md`. Untracked: `CLAUDE.md`, `docs/claude/`, the study directory, `src/app/diverseD1.ts` and `src/d1-diverse/`.
- `legacy-check` passes: manifest `d8b9b900…` (376 files), protected trees clean, hash lists 99/99 and 13/13.
- A filesystem sweep for anything newer than the baseline, outside the new namespaces, found only test byproducts.

### Data doors
- Door records end at the correct dates:
  - fold-a search 2020-06-30 (1,131 sessions); validation 2021-12-31 (1,511)
  - fold-b search 2021-12-31 (1,511); validation 2023-12-29 (2,012)
  - final controls and search 2023-12-29 (2,012). Final search bar hashes equal the final calibration's and the reproduce training door's.
- `evaluate` wrote its record without loading data (`final.ts:440-456`; log "no nominee", 0.3 s).
- The fold attribution ledgers reconcile V to 1e-6 for every row. The final ledgers reconcile all 30 finalists to their assessments, and I verified B1/B4/B5 against `select/benchmarks.json` exactly.

### Reports versus records
I checked well over 150 figures across all ten reports listed in the brief, and sampled the October 25 study's records:

- old `validation.json` percentiles 0.40, 0.025, 0.00
- `GWF.json`: +$4,189, −$30,323, −$39,158
- `results/tables/coverage.md`: 29/25 symbols under the floor, minimum 191, fold minimum 116
- `POOL_FAMILIES_AND_REFINEMENT.md`: 295 of 295 and 298 of 298 chained

### Security
- I grepped all new and changed files (274 files, plus the ten archives) for e-mail addresses, credential keywords and personal names. I found no e-mail, no credential and no account identifier.
- The only "ALPACA" hits are `[REDACTED:…]` placeholders in `npm-test.log`. They come from the existing d1-robust ingest test, which uses a fake curl script.
- A transitive import closure of `src/d1-diverse` (127 files) contains no `fetch`, http, net or ws module and no broker or order code. `child_process` is used only for `git` (`legacy.ts:13`).
- The `diverse-d1` npm script does not load `.env`.

### Permanent instructions
- `CLAUDE.md:5` carries `@docs/claude/context-recovery.md` outside backticks. The guide loaded into this very session, and `results/audit-final/import-check.md` independently confirms the import.
- The guide covers every element of the brief (§§2.1–2.8 and §3).
- No `.claude/`, `AGENTS.md` or other instruction file exists in the repository.
- `~/.claude/settings.json` was last modified on 2026-10-25, before the study, and has no `hooks` key. There is no `settings.local.json`.
- `CLAUDE.md` and `docs/claude/` are untracked and not ignored.

### Tests
- `npm test`: 547/547 pass.
- `npx tsc --noEmit`: 0.
- `npx eslint src/d1-diverse`: 0.
- The tests match each row of `DESIGN_DIFF.md`:
  - `design.test.ts` (1)–(6), the schedule, the temporal score and seeded arms;
  - `leakage.test.ts` covers the fold door, the validation and evaluation doors, and the +3% mutation through `searchCore` + `selectCore`.

## 2. Material findings

None. Every sealed record and chain verifies. The data doors held. No configuration of this study read bars after 2023-12-29. The "no advancement" outcome follows from the sealed `PROCEDURE_GATE` (J fails clause iii, fold-b DD $48,269 > $45,000; T fails clauses i and ii).

## 3. Minor findings

1. **The checkpoint top screen is stale.** `RESEARCH_RECOVERY.md:9,30,37` still says "Updated 10:54Z" and lists the §13A re-test (attempt 3) as incomplete and as next step 1. §6 and the stage table record attempt 3 as complete (SUFFICIENT, 10:55:07Z). §3 (`:101-102`) still calls the report `WALK_FORWARD_RESULTS.md` "to be renamed". A fresh session would be told to repeat the §13A test, which is harmless but ambiguous.
2. **The final ledgers are misdated in the checkpoint.** `RESEARCH_RECOVERY.md:88` says "~10:45Z", but `final-finalists.json` was generated at 10:26:04Z. That is after the sealed selection (10:21Z) and before `freeze-selection` (10:44:31Z). The work is descriptive and training-only, so it could not affect the sealed selection, but the timing should be stated correctly.
3. **confirm-B and evaluation carry no body hash.** `results/confirmB/confirmB.json` and `results/evaluation/evaluation.json` are plain JSON (write-once by code). Their integrity rests on the file sha256 quoted in the reports and checkpoint; both match. confirm-B and the selection also write no door record of their own. Both use `trainingUniverse('final')`, which asserts the end date (`data.ts:77,82`); `BASELINE_AND_PARITY.md` §3 discloses this for the selection.
4. **The tests changed after the freeze.** `src/d1-diverse/tests/design.test.ts` was edited at 07:36Z, after both validations, so the freeze's non-gating `tests.digest` (`3d419d31…`) no longer matches (now `1c0758de…`). This is disclosed in `IMPLEMENTATION_AUDIT.md` §6. The tie test (5) still uses the October 25 study's EDV GDX KRE/XRT labels and the exact $6,493 gap.
5. **The benchmark ledger rows only claim reconciliation.** In `scripts/ledgers.ts:218`, B1/B4/B5 rows are labelled "reconciledWith: … results/reproduce", but the script performs no comparison for them. I checked the values and they equal `select/benchmarks.json` exactly.
6. **The amendment patch header names the wrong review.** `amendments/amend1_final.py:1` says "pre-selection-freeze review minor findings 1-4". The amendment record and `IMPLEMENTATION_AUDIT.md` correctly attribute it to the pre-final-round review; the pre-selection-freeze review ran later, at 10:25Z.
7. **`IMPLEMENTATION_AUDIT.md` is still a draft.** Sections are marked _pending_ (lines 3, 16, 52, 66, 84, 138). This is expected before this audit. The checks I ran (above) can fill them.

## 4. Report-number mismatches

| File:line | Report says | Records say |
|---|---|---|
| `NEIGHBORHOOD_AND_RISK.md:84` | at 2u, medians "$82k–$217k for every finalist and benchmark", feasible "12–83%" | B1 (a benchmark in `select/benchmarks.json`) has A2 P50 $67,324 with feasible share 100%. The range holds only for finalists plus B4/B5. |
| `README.md:37`; `RESEARCH_RECOVERY.md:101` | "GP(T) failed (clause i)" | T also fails clause (ii): no fold has V ≥ ctl_0.75 and > 0. `CHRONOLOGICAL_METHOD_COMPARISON.md` §3 shows this correctly. |
| `IMPLEMENTATION_AUDIT.md:62-63` ("Actual wall-clock") | fold-a 727 s / 586 s; fold-b 1,045 s / 834 s | These are internal record timers. The log wall-clock is 902 / 766 s and 1,228 / 1,019 s, which is what `CHRONOLOGICAL…:30` uses ("15 + 13", "20 + 17" min). Line 64's final 7,675 s is wall-clock (the record says 7,482 s), so the basis is mixed. |
| `IMPLEMENTATION_AUDIT.md:23` | `.gitignore` "+2 lines" | The diff adds 4 lines: 2 comments and 2 patterns. |
| `RESEARCH_RECOVERY.md:88` | final ledgers "~10:45Z" | `generatedAt` 10:26:04Z |
| `COVERAGE_AND_DIVERSITY.md:60` | least-searched "about 1,030–1,056" | 1,026 (XME, T-s) to 1,056 (XOP, T-u) |
| `CHRONOLOGICAL_METHOD_COMPARISON.md:77-78` | fold-a T and Q: Centre / P50 shown as "—" | The values are recorded: T-u-f2 $140,671 / $137,964; Q-u-f3 $178,051 / $135,883. This is an omission, not a wrong number. |
| `CHRONOLOGICAL_METHOD_COMPARISON.md:204` | SLV marginals "−$3,575 to −$8,053, each below δ = $5,000" | Two of the three prune-batch marginals (−$6,755, −$8,053) exceed δ in magnitude. The "below δ" refers to the refinement batch's estimate, which is not shown. This is a wording issue. |
| `DESIGN_DIFF.md:32` | "≈ 46,900 per final arm; ≈ 319,000 total" | 47,032 per final arm; 320,840 total. This is a design-time approximation. |

Everything else I checked matched to the rounding shown:

- **README:** the old-versus-new table, including the old-study figures.
- **`FINAL_CANDIDATES_AND_GATES.md`:** all 30 scores, gate marks, the G6/G4/G8 details, the §6 table, the rejection ledger and the runner-up interval.
- **`NEIGHBORHOOD_AND_RISK.md`:** the §2 rows sampled across all arms, the whole confirm-B table, the ranges −$7.1k to +$5.5k, 6 of 33 flagged, $25k–$59k and $34k–$116k, and the J-u-f4 / T-u-f5 claims (84% and 90%, 23.5 and 42 lots).
- **`CHRONOLOGICAL_METHOD_COMPARISON.md`:** picks, percentiles, DDs, portfolio returns and DDs, annual attribution, Spearman values, and the 12-of-16 fold-b DD count.
- **`COVERAGE_AND_DIVERSITY.md`:** every per-arm minimum, protected example, size band, distinct-membership count and family share.
- **`FAMILY_SELECTION.md`:** every refinement gain, membership move and prune marginal and bound.
- **`BASELINE_AND_PARITY.md`:** every reproduction figure to the cent, P0–P5 counts and the door sessions.
- **`RECOMMENDATION.md`** and **`HISTORICAL_CONFIRMATION.md`**.

On wording: no report calls anything validated, proven or an expected return. `RECOMMENDATION.md:25-27` explicitly disclaims CAGR as IRR. `README.md:44` ("a success as a test of the method") is defensible only as "the search machinery behaved as designed". The folds did not distinguish T from J, so I suggest that narrower wording.

## 5. Observations

1. **Disclosed process deviations.**
   - The full brief arrived at 07:35Z, after the freeze, both validations and the gate. Its items were adopted as reporting only, and the commitment's brief hash `c9ef0b91…` is of the truncated text.
   - No review was held between `PICKS` and validation.
   - M1 checks that started before change 1 were rerun and overwritten (pre-freeze, not write-once).
   - None of these affects a sealed outcome.
2. **The only post-2023 reads were benchmark reproductions.** B1/B4/B5/C0 were reproduced before the freeze through `benchmarkUniverse`, whose symbols are fixed in code. This is disclosed in `PROTOCOL.md` §2.7 and `HISTORICAL_CONFIRMATION.md`. `validationUniverse` relies on the loader's `endDate` and does not assert the last date itself; the door records show the correct ends.
3. **Some study files contain machine-specific paths** (`/Users/chad/…` or `/private/tmp/claude-502/…`): `results/logs/fold-a.log:7-9` (a stack trace), `reviews/pre-selection-freeze-review.md:9`, and `results/recovery-test/RESEARCH_RECOVERY.snapshot-20261026T073810Z.md:21`. There are no secrets. `CLAUDE.md`, the guide and the live checkpoint are clean.
4. **Headless session metadata is stored.** `results/recovery-test/fresh-session-*.json` and `results/audit-final/import-check.json` hold session IDs and cost metadata. They contain no credentials. `import-check.*` (10:56Z) is not referenced in the checkpoint.
5. **The checkpoint has no explicit constants section.** It has no seeds, budgets or data-cutoffs section. With every stage sealed, the pointers to `PROTOCOL.md` and `FROZEN_SELECTION.json` (seeds, budgets) suffice, but the guide's §1 lists this section.
6. **`npm test` has pre-existing side effects.** It rewrites git-ignored `data/trailing-buy-entry/**` and `src/four-family/generated/**`, and rewrites the tracked `research/vgt-minute-optimizer/tmp/test-variants/*.ts` with identical content (`git diff` is clean).
7. **Git state for the user.** `CLAUDE.md` and `docs/claude/context-recovery.md` are new, untracked and not ignored. They are visible to future sessions in this checkout and need a user-authorised commit to reach other worktrees or clones. Nothing has been committed.

## 6. Verdict

The study's sealed records, data doors, isolation and tests all verify, and the "no advancement" outcome is sound. There are no material findings: only minor report and checkpoint corrections (a stale checkpoint top screen, the T-clause wording, the timing basis, the B1 amplitude range), none of which changes a result.
