# Implementation audit — D1 diverse-pool discovery

**Status: final (2026-10-26).** The independent final audit (`reviews/final-audit.md`) found no material defect; its
minor findings and their dispositions are in §9.

## 1. Code, data and environment

| Item | Value |
|---|---|
| Branch / `HEAD` | `research/trailing-buy-four-family-optimization` / `348f100b` (unchanged; nothing committed) |
| Worktree | main checkout (no separate worktree) |
| Node | v24.21.0 (`.node-version`), 12 GB heap, `--expose-gc` |
| Machine | Apple M1 Pro, 10 cores, 16 GB; 8 workers; trace cache 150,000 |
| Code manifest at the freeze | `fd549635…` — every `src/**/*.ts` except tests, `generated/` and `src/d1-diverse/report.ts` |
| Code manifest after amendment 1 | `42d2dd47…` (405 files; only `src/d1-diverse/final.ts` differs: `eb20e15e…` → `3a156064…`) |
| Protocol / context | `PROTOCOL.md` `6e4df57a…`; `src/d1-diverse/context.ts` `98428dac…` (unchanged since the freeze) |
| Canonical data | 64 `data/<SYMBOL>/data.csv` + splits, distribution ledger, partitions: hashes in `results/baseline/`, re-verified unchanged at 07:47:01Z (`PROTOCOL_FREEZE.json`), at 10:53Z (`results/audit-final/data-csv-check.txt`, `config-check.txt`: 64/64 + 3/3 OK) and again by the independent audit |

**New and changed files (none committed):**
- New: `src/d1-diverse/` (28 modules + tests), `src/app/diverseD1.ts`, `research/d1-diverse-pool-discovery/`,
  `CLAUDE.md`, `docs/claude/context-recovery.md`.
- Changed:
  - `package.json` (+1 script `diverse-d1`);
  - `.gitignore` (+4 lines: 2 comment lines and 2 archive-log patterns);
  - `src/phenotype/strategies.ts` (+1 registry line);
  - `config/phenotypes/COMPATIBILITY.md` (+1 generated row).

## 2. Integrity chain (write-once records, body hashes)

1. Design commitment: 2026-10-26T03:08:18Z, body `bc6fcdf2…`, before any P&L of this study.
2. Change 1: 03:50:14Z, `17c8e445…`, the independent design review's findings 1–22 plus the CLI flag bug. It was
   made before any control, search, selection or validation record existed.
3. Protocol freeze: 04:20:08Z, body `918c221b…`. It binds the M1 check records, each stamped with its code state.
4. Controls: 04:27, 04:35 and 04:46Z.
5. Fold-a: search 05:02, `PICKS.json` 05:15:37, validation 05:19:38Z.
6. Fold-b: search 05:59, `PICKS.json` 06:16:55, validation 06:21:16Z.
7. `PROCEDURE_GATE.json`: 06:21:18Z, body `9b343385…`.
8. Final search: 06:40:39 → 08:48:34Z, body `77f553e5…`.
9. Amendment 1 (`final.ts` only): 08:49:19Z, `7a0aa610…`, anchored to the freeze body.
10. Final selection: 08:49:38 → 10:21:13Z, body `26b29f03…`.
11. Pre-selection-freeze review: 10:25 → 10:44Z.
12. `FROZEN_SELECTION.json`: 10:44:31Z, body `ae20e984…`, no advancement.
13. confirm-B: 10:49:13Z, `e4916bbb…`, 36 rows; it verified its inputs against the frozen records.
14. Evaluation record: 10:49:40Z, `87018fa9…`, no nominee, no data loaded.

## 3. Independent reviews (agents that did not write the code)

| When (UTC) | Scope | Verdict | Record |
|---|---|---|---|
| 03:05–03:31Z (transcript timestamps), spanning the design commitment at 03:08Z; before change 1 and the freeze. The first M1 checks had started; all were re-run under the change-1 code | design, protocol, all code, tests | safe to freeze once findings 1–6 are fixed; 22 findings → change 1 | `reviews/design-review.md`; dispositions D-13 |
| 06:22–06:40Z, after `PROCEDURE_GATE.json`, before the final search | GP recomputed from the records; fold records; final-round code paths; whether the diversification machinery preserved alternatives | no material finding; minor 1–4 → amendment 1, 5–7 → report wording, 8–12 → disclosures | `reviews/pre-final-round-review.md` |
| 10:25–10:44Z, after the sealed final selection, before `freeze-selection` | final selection records recomputed independently (families, cliques, slots, refinement/pruning, gates, scores, rankings, labels); amendment 1 against its patch; read-only dry run of freeze-selection; leakage; preservation of alternatives | no material finding; safe to run freeze-selection, confirm-b, evaluate. Minor 1–3 (record labelling and completeness) and 4–5 (slot wording, no selection door record) handled in report wording, not amended | `reviews/pre-selection-freeze-review.md` (brief `…PROMPT.md`) |
| 10:55–11:18Z, after every stage was sealed | integrity chain (16 body hashes, change and amendment chains, code manifest), chronology, data and isolation, doors, 150+ report figures against the records, security grep, instruction import and checkpoint, tests | no material finding; 7 minor findings and 9 report-number mismatches, all corrected or disclosed (§9) | `reviews/final-audit.md` (brief `final-audit.PROMPT.md`) |

**Not done:** no review was held between sealing each fold's `PICKS.json` and opening its validation. The full brief
asks for one "preferably", but it arrived after both validations.

## 4. Budgets and actuals

Wall-clock below is the command's own "done in" line in `results/logs/` (the records' internal `seconds` timers are
slightly shorter, e.g. final search 7,482 s). RSS is the per-arm figure recorded at the end of each arm.

| Stage | Projected (tier E) | Actual wall-clock | RSS |
|---|---|---|---|
| M1: audit / benchmark / reproduce / parity / legacy-check | — | 215 / 284 / 306 / 946 / 5 s | — |
| Controls (3 windows) | — | 413 + 506 + 621 s | — |
| fold-a search / select / validate | — | 902 / 766 / 241 s | 3.7–4.2 GB per arm |
| determinism re-run | — | 1,143 s | — |
| fold-b search / select / validate | — | 1,228 / 1,019 / 261 s | 2.9–3.2 GB per arm |
| final search (4 arms × 47,032) | — | 7,675 s (2.13 h) | 1.9–3.1 GB per arm |
| final select (4 arms) | — | 5,495 s (1.53 h) | — |
| freeze-selection / confirm-b / evaluate | — | 3 / 266 / 0.3 s | — |
| **Total of the sealed stages** | 14.2 h, 5.9 GB resident | **22,293 s = 6.2 h** | **max 4.2 GB** (fold-a Q-u) |

The tier projection was conservative by design (§19). Superseded pre-freeze runs are excluded from the total: the
M1 checks before change 1 and a first parity run (952 s).

## 5. Tests and checks

- Unit/design tests (`src/d1-diverse/tests/design.test.ts`, synthetic fixtures), covering:
  - coverage contracts;
  - schedule determinism;
  - no chaining in families;
  - per-arm protection;
  - generic pruning cases;
  - exact ties;
  - the temporal score;
  - near-reference bar;
  - seeded arms.
- Leakage tests (`leakage.test.ts`, the real loader on fixture CSVs): fold door, validation and evaluation doors, and
  the post-cutoff mutation test.
- Parity P0–P5 (672 comparisons), the reproduction to the cent, and the determinism re-run: see
  `BASELINE_AND_PARITY.md`.
- **Final checks** (10:51–10:54Z, `results/audit-final/`; repeated independently by the final audit):
  - `npm test`: 547/547 pass, 161 suites;
  - `npx tsc --noEmit`: 0;
  - `npx eslint src/d1-diverse`: 0;
  - legacy-check: the October 25 manifest `d8b9b900…` is equal; protected trees clean; hash lists 99/99 and 13/13;
  - all 64 data CSVs and 3 config files equal the baseline;
  - `git ls-files -s` is byte-identical to the baseline (`f3125ec6…`).
- **Instruction import**, checked in a fresh tool-less headless session (`results/audit-final/import-check.md`): it
  quoted the guide's §2.7 and §3 verbatim from its loaded context, so `CLAUDE.md`'s `@docs/claude/context-recovery.md`
  import is live.

## 6. Code changes after the design commitment

- **Change 1** (pre-freeze; record above). It included one bug fix found while recording it: the CLI passed
  `--name` to `option()`, which adds the dashes itself, so no flag was read. Nothing had run with flags before the fix.
- **Amendment 1** (post-validation; `final.ts` only; pre-final-round review minor 1–4), recorded 08:49:19Z, after the
  final search sealed and before the final selection started. It changed:
  - the score is recomputed from the stored draws;
  - rankings, labelled hypothetical nominations, seeds, budgets, evaluation counts and the parity signature are
    recorded;
  - `benchmarks.json` and the `refine-f*.json` files are bound;
  - data are hashed sequentially;
  - confirm-b verifies its inputs.

  The third review verified that the current `final.ts` equals the prettier-formatted patch of the frozen file, with
  no other edit.
- **No further amendment.** The third review's minor 1–3 were optional `final.ts` amendments. They are disclosed
  instead:
  - 1: the `records` map mixes body and file hashes (`FINAL_CANDIDATES_AND_GATES.md` explains how to verify each);
  - 2: thin hypothetical lists;
  - 3: `budgets.tierRecord` is the context constant, while the sealed tier record is bound through provenance.
- **Test edits after the freeze's test-manifest hash:** `design.test.ts` was edited at 07:36Z, after both
  validations, so the freeze's non-gating `tests.digest` (`3d419d31…`) no longer matches (now `1c0758de…`).
  - The pruning test was made generic: it no longer uses the October 25 study's symbols and −$1,897 as its scenario.
  - The tie test (5) still uses that study's EDV GDX KRE/XRT labels and its $6,493 gap. It is a synthetic test of the
    tie rule, not a fixture of a result.
  - Tests sit outside the code manifest.
- **Outside the manifest:**
  - `src/d1-diverse/report.ts` (tables; `[object Object]` PBO cell fixed);
  - supplementary scripts under `scripts/`: `protocol-freeze-index.ts`, `ledgers.ts`, `coverage_summary.py`. They
    write descriptive outputs only and reconcile each figure with a sealed one.

## 7. Incidents and disclosures

1. **The brief arrived truncated (at §13).** The full text (§13 remainder, §13A, §14, §15) was supplied at 07:35:16Z,
   after the commitment, the freeze, both validations and the procedure gate. Its report names, the
   `PROTOCOL_FREEZE.json` index, ledgers, the old-vs-new table and the §13A test are adopted as reporting items. No
   selection rule changed.
2. **A zsh word-splitting slip** made the first fold-a launch run nothing ("Unknown command"); the relaunch used the
   same command.
3. **The review reports were first held only in the conversation.** They were saved verbatim to `reviews/` at 07:43Z,
   after the §13A recovery test flagged it.
4. **Times in early checkpoint versions were local (CET) written as UTC.** They were corrected after the recovery test.
5. **Pre-final review observations 8–12:**
   - a zero-lot member can win on smoothing;
   - distinct families can collapse to near-duplicate finalists;
   - pruning can push a pool below G3's activity floor;
   - one R1/R4 vector (KRE, equal to B5's) sits in the seeded library;
   - G3's member grades are labels, not a pass condition.

## 8. Known limitations

- **Dividends:** lots are price-only. Omission bounds at 1/3/6% replace issuer histories, because no download was
  authorised.
- **Brokerage:** the Vanguard 30-day no-loan-value rule is not modelled.
- **Fold windows:** both were inspected by earlier studies (E2); two folds can stop a procedure, not certify one.
- **Final round:** training-only (E1). The ranking draws (confirm-A) were confirmed by an independent batch
  (confirm-B within ±$7k), but selection on the 2016–2023 window itself cannot be checked inside that window.
- **Capacity:** most finalists are "capacity-unverified" at portfolio scale, and some are "capacity-limited".
- **Neighbourhoods:** at amplitude 2u every configuration's median falls by roughly half, so all plateaus are
  narrow.
- **Record format:** confirm-B and the evaluation record are write-once by code but carry no body hash. Their integrity
  rests on the file sha256 quoted here and in the checkpoint (`e4916bbb…`, `87018fa9…`); each `manifestHash` equals
  the frozen selection body.

## 9. Final-audit findings and dispositions

| # | Finding (`reviews/final-audit.md`) | Disposition |
|---|---|---|
| minor 1 | checkpoint top screen stale after the §13A attempt 3 | rewritten (`RESEARCH_RECOVERY.md`) |
| minor 2 | final ledgers misdated in the checkpoint (~10:45Z) | corrected: first written 10:26:04Z (after the sealed selection at 10:21Z, before `freeze-selection`); regenerated at 11:22Z (minor 5) |
| minor 3 | confirm-B and evaluation have no body hash | disclosed (§8); file hashes quoted |
| minor 4 | tests edited after the freeze's test digest; tie test keeps old labels | disclosed (§6) |
| minor 5 | the ledger claimed B1/B4/B5 reconciliation without checking | fixed: `scripts/ledgers.ts` now compares them with `select/benchmarks.json` (to 1e-6). `final-finalists.json` was regenerated; content is identical except the `reconciledWith` labels, and all 33 CSVs are byte-identical to the first run |
| minor 6 | `amendments/amend1_final.py` header names "pre-selection-freeze review minor 1-4" | the header comment is wrong; the amendment answers the **pre-final-round** review's minor 1–4, as the amendment record states. The applied patch file is left unchanged (its sha256 `203cef2c…` is quoted in the checkpoint) |
| minor 7 | `IMPLEMENTATION_AUDIT.md` still a draft | finalised (this file) |
| mismatch | NEIGHBORHOOD 2u range claimed for every benchmark | B1 excepted ($67k, 100% feasible) |
| mismatch | "GP(T) failed (clause i)" | corrected to clauses i and ii (README, checkpoint) |
| mismatch | stage timings on mixed bases | §4 now uses the commands' wall-clock lines throughout |
| mismatch | `.gitignore` "+2 lines" | +4 (2 comments, 2 patterns) |
| mismatch | least-searched "about 1,030–1,056" | 1,026 (XME, T-s) to 1,056 (XOP, T-u) |
| mismatch | fold-a T and Q centre / P50 shown as "—" | filled: T $140,671 / $137,964; Q $178,051 / $135,883 |
| mismatch | SLV "each below δ" wording | reworded: below δ on the refine batch; the prune-batch marginals −$3,575 to −$8,053 are shown |
| mismatch | DESIGN_DIFF budget "≈ 46,900 / ≈ 319,000" | annotated as a design-time estimate (actual 47,032 / 320,840) |
| wording | README "a success as a test of the method" | narrowed: the search machinery behaved as designed; the folds did not distinguish T from J |
| observation | machine-specific paths in some study files: a stack trace in `results/logs/fold-a.log`, the verbatim third review, the first recovery snapshot | left as is: verbatim records and logs. No secrets. `CLAUDE.md`, the guide and the live checkpoint are clean |
| observation | headless test JSON stores session IDs and cost metadata | no credentials; kept as evidence of the §13A and import tests |
| observation | `npm test` side effects on git-ignored fixtures and an identical-content tracked file | pre-existing repository behaviour; `git diff` clean |
