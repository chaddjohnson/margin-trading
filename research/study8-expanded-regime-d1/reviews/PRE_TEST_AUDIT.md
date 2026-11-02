# Study 8 pre-test audit (independent, read-only)

**Auditor:** a fresh read-only agent with no prior context. **Audit completed:** 2026-11-01T21:37:46Z (UTC).
**Worktree:** `/home/chad/projects/margin-trading-study8`, branch `research/study8-expanded-regime-d1`, HEAD `bce526f`. Study files are uncommitted, as the brief requires.
**State audited:** chain head is entry 6, `selection`, `77e37e7466cc02301f60bf2dae29497b41ffcdfad840fbf3b63521a6888e05a0`.
- `FROZEN_SELECTION.json`: file sha256 `88d079d1…`, body `5d266eeaccb3…`.
- `results/doors.jsonl`: 84 lines, sha256 `72770b1c…`, which equals the binding sealed in entries 5 and 6.

## Verdict

**CLEARED. The test doors may open in the documented order F19 → F20 → F21 → F23 → F24.**

- **Chain and seals:** the hash chain, all 101 sealed files, the door-log bindings and the integrity pins verify, both through `verify-chain` and through my own Python recomputation.
- **Doors:** no test door has opened and `results/test/` does not exist. Each of the 60 search and qualification jobs opened only its own fold's training door, exactly once, with `lastDate` at or before the cutoff.
- **Post-freeze code:** the only change is E1, and it is functionally exactly what AMENDMENTS E1 describes.
- **Selection:** I recomputed the role assignment for all 30 track-folds (129 role rows) and the tier and ranking for all five folds from the sealed qualification records. Both match `FROZEN_SELECTION.json` exactly.
- **Gates:** every Q/E gate flag, `qualified` flag and `marginal` flag of all 180 shortlist members and all controls reproduces from the sealed evidence.
- **Seed families:** selection, confirmation and test families are distinct, and the stage order is correct (shortlist, then selection families, then confirmation).
- **Parity and controls:** parity attempt 2 passed every gate. The controls are exactly the frozen books.
- **Rulebook:** sealed identically in the freeze and in the selection.

Nothing found is blocking. The findings below are minor, operational or interpretive. Finding 1 materially limits what any test pass can mean.

## Findings

1. **Major (interpretive, not blocking): multiplicity and overfitting diagnostics. Any F24 pass is weak evidence.**
   - **Search scale:** 440,126 configurations evaluated at rung 1 and 9,983,389 fresh neighbour evaluations, in 55.4 job-hours (single-threaded per job). Qualification added 502,260 points in 2.3 job-hours.
   - **Triggers:** T1 fired in 5 jobs (VXRKG-F19, G-F20, VXRG-F20, VXRG-F21, VG-F24), T2 in 18 and T3 in none. I checked each T1 decision against its hypervolume log, and each island count, for consistency.
   - **Per fold** (shortlisted / qualified / role holders / "strong" tier):

     | Fold | Shortlisted | Qualified | Role holders | Strong |
     |---|---:|---:|---:|---:|
     | F19 | 36 | 26 | 19 | 19 |
     | F20 | 36 | 34 | 27 | 23 |
     | F21 | 36 | 35 | 28 | 26 |
     | F23 | 36 | 32 | 26 | 25 |
     | F24 | 36 | 27 | 26 | 25 |

     Marginal qualified members: F19 2, F23 2, F24 3. The three marginal F24 holders are #12 G profit, #23 V profit and #24 V balanced.
   - **PBO (`qualify/*/*/qualification.json` `pbo.pbo`):** values above 0.5 in **20 of 30** track-folds.

     | Fold | G | V | VG | VXR | VXRG | VXRKG | Splits |
     |---|---:|---:|---:|---:|---:|---:|---:|
     | F19 | 0.833 | 0.333 | 0.833 | 1.0 | 0.667 | 0.667 | 6 (coarse) |
     | F20 | 0.10 | 0.75 | 0.85 | 0.50 | 0.75 | 0.90 | 20 |
     | F21 | 0.571 | 0.471 | 0.771 | 0.771 | 0.843 | 0.90 | 70 |
     | F23 | 0.406 | 0.316 | 0.749 | 0.56 | 0.379 | 0.593 | 924 |
     | **F24** | **0.641** | **0.814** | **0.395** | **0.492** | **0.872** | **0.140** | 3432 |

     Among the near-top rung-2 configurations, the training rank carries little or no information from one half-year block to the next.
   - **Selection versus confirmation:** the Spearman correlation is 0.71–1.0 (`decay.spearman`). Fresh seeds on the same history are not fresh evidence.
   - **The tier barely discriminates:** 25 of 26 F24 holders are "strong". B1's confirmation robust/yr is $7,905–$8,222 by track, against $7,352–$29,314 for the holders. B1's exposure to 2024–2025 is already disclosed in PROTOCOL §1.4.
   - **Action:** the final report should present each F24 survivor as one that survived a sequential veto among 26 holders (36 members). That veto came after about 10 million evaluations, on a closed but previously inspected window. Quote the PBO table beside any nomination, and do not read the F24 rank order as a predictive ordering.

2. **Minor: the E1 text is slightly incomplete.**
   - **Evidence:** I diffed live `src/study8-expanded-regime-d1/parity.ts` against the copy in `results/freeze/code-protocol.tar.gz`. The diff shows the header comment (line 8), the two P5 key reads `DEV`/`VAL` → `TRAIN-F21`/`TEST-F21` (lines 421–422), the two `near()` checks (lines 425–426), **and two added inline comment lines (419–420)** that E1 does not mention.
   - **No other differences:** all other 20 `.ts` files in the namespace equal the tarball. The live code equals `code-E1.tar.gz` exactly, and its recomputed code digest `3d0cb5b82ca1…` equals `code-E1.json`. The 140 engine and import-closure files equal their pins (digest `2b5c5dc4a113…`, unchanged from the freeze).
   - **Action:** optionally append a one-line disclosure. It has no functional effect.

3. **Minor: one post-freeze file outside the pins is not disclosed.**
   - **Evidence:** `research/study8-expanded-regime-d1/scripts/build_tables.py` is in neither code tarball, and E1's "also after the freeze" list does not name it.
   - **What it does:** it reads sealed records and writes only `results/tables/*.md`. It decides nothing.
   - **Already disclosed:** the other post-freeze items (`src/study8-runners/`, `config/research-pools/study8-local-runners/`, the `study8-run` script in `package.json`).
   - **Action:** append a disclosure entry to AMENDMENTS.md.

4. **Minor: the checkpoint quotes only the superseded code digest.**
   - **Evidence:** `RESEARCH_RECOVERY.md` lines 19 and 79 quote only the freeze digest `b94fc38b413d…`. The live, E1-accepted digest is `3d0cb5b82ca1…` (the `verify-chain` output reads "accepted by E1").
   - **Action:** add the accepted digest to the checkpoint's top screen.

5. **Minor (operational): the test stage has a sealing gap and does not count door openings.**
   - **The gap:** `commands.ts` `test` writes `test.json` through `runTest` and only then calls `appendPhase`. If `appendPhase` fails after the record is written:
     - the fold refuses to rerun (the file exists);
     - `seal` accepts only `search|qualify`;
     - the next test door refuses.

     Recovering would need a code change after exposure.
   - **No count:** test-door openings are not counted at sealing, unlike search and qualify. A rerun after a crash (PROTOCOL §7.3) therefore relies on the author to disclose it.
   - **Action:**
     - run `verify-chain` immediately before each fold;
     - check free disk space;
     - after any crash or rerun, write an AMENDMENTS entry before continuing;
     - run one fold at a time and confirm its chain entry before starting the next.

6. **Note: several holders sit close to the drawdown ceiling.** Confirmation p90 DD (training door):
   - V holders: $33,392–$34,732;
   - G profit: $33,914;
   - VXRKG profit: $32,249.

   T2, T4 and the "ambiguous" outcome are likely to be decisive for these holders. This is not an integrity issue.

7. **Note: parity gate T0 used the F23 test-family labels before any test.**
   - **Evidence:** `parity.ts` lines 718–803 ran `testStageOn(dry, 'F23', …)`. That used the labels `('test','sets','F23',rep)` on frozen configurations only (VG, G-NM1, B5, B1, G-PA), on a parity door ending 2024-12-31. Only booleans and counts were kept, and the logs print "done" lines only (`runlogs/parity.txt` lines 158–176).
   - **Why it is harmless:** the offsets depend on the labels, not on data, and no Study 8 candidate was evaluated.
   - **Action:** mention it in the report.

8. **Note: `testRules` abbreviates PROTOCOL §8.4.**
   - **Evidence:** in `FROZEN_SELECTION.json`, the T5 text omits the ex-best denominator max(1, y − 1). The T6 text omits "yTest rounded to 0.01" and the definition of new episodes.
   - **The code matches the full protocol text:** `test.ts` `testGatesOf` lines 94–156 and `testFloorsOf` lines 72–79, which give 3 lots / 1 episode on F19–F21 and F24, and 2 / 1 on F23. The sealed PROTOCOL.md is authoritative.
   - Every number in `testRules` equals the protocol and the sealed constants: T1–T7, ambiguous, block-only, nomination, the outcome classes, persistence, insufficient evidence, 0.93 / $33,000, $10,000 and $5,000 per test year, and $11,000.
   - **Action:** none.

9. **Note: the G and V search records carry unused budget fields.** Their `budget` objects list `combos: 4096, lhs: 1024`. The single-book code path (`search.ts` lines 317–323) uses only the 8,192-vector Sobol screen; the counts confirm `screen` = 8192 and no combinations. All dimension-scaled budgets match PROTOCOL §7.1 exactly. This is cosmetic.

10. **Note: the local seal has limits.** Everything is uncommitted, and deleting the chain and the door log together cannot be detected locally (disclosed in PROTOCOL §2.3). **Action:** before opening `test-F19`, give the user the audit-phase chain head and this report's sha256 in the conversation, so there is a record outside the worktree.

11. **Note: the inherited suite logs are not sealed or in the checkpoint.**
    - `results/runlogs/suite-base.txt` and `suite-head.txt` were written at 21:31Z, after the selection freeze.
    - They ran without data: they show ENOENT on data files.
    - Base: 847 tests, 9 fail, 17 skipped. Head: 862 tests, the same 9 fail, 17 skipped, so 15 more tests pass.
    - **Action:** record them in the checkpoint as inherited failures.

## Checks performed

| # | Check | Result |
|---|---|---|
| 1 | `npm run study8 -- verify-chain` | "chain OK: 6 entries; integrity OK (code 3d0cb5b82ca1, engine 2b5c5dc4a113, accepted by E1)". Order: protocol, code-E1, parity, search, qualify, selection. No `test-*` or `audit` phase; `results/test/` and `results/audit/` absent |
| 1a | Entry hashes, `prev` links and door-log prefix bindings recomputed in Python; 101 sealed file sha256s with `sha256` | all match; 0 mismatches |
| 1b | Door log | 84 lines, none with `door` starting `test-`. No running study process (`ps`) |
| 1c | E1 diff against `code-protocol.tar.gz` (extracted to scratch) | only `parity.ts` differs, as in finding 2; live code equals `code-E1.tar.gz`; `scripts/` differs only by `build_tables.py`; `package.json` only by the `study8-run` script |
| 1d | AMENDMENTS.md append-only | `results/freeze/AMENDMENTS-protocol.md` (`6a031cfc…`) and `AMENDMENTS-code-E1.md` are byte prefixes of the live file |
| 1e | Config pins: splits, `distributions.csv` and its manifest | hashes equal the freeze. Data-file pins verified through `verify-chain`; I read nothing under `data/`, as instructed |
| 2 | Doors per job (doors.jsonl lines 25–84) | 30 search and 30 qualification openings, exactly 1 per job. Each on `search-<fold>` with `end` and `lastDate` = the fold cutoff: 2019-12-31, 2020-12-31, 2021-12-31, 2023-12-29 or 2024-12-31. Chain heads 3 and 4 respectively |
| 2a | Session calendars | identical whatever the member count |
| 2b | Records | all 60 search and qualification records verify their `bodyHash`. Each states `door.key` = `search-<fold>` and `door.last` = the cutoff. Each qualification binds its search `bodyHash`. Qualification candidates equal the search shortlist, in order |
| 2c | Resumes and job exits | `cacheLoaded` = 0 everywhere (no resume); all 60 job logs end `exit 0` |
| 2d | Post-cutoff figures | `FROZEN_SELECTION.json` holds no TEST-*, Y2025, Y2026YTD, T2025Q2 or G2026 figure; the only date in 2025 or later is `frozenAt`. Period labels such as `TEST-F19~partial` inside F20 records are sub-windows of that fold's own training door |
| 2e | Loader | `lib/evaluation.ts` `loadBounded` stops reading at the window end, so no later bar is kept |
| 3a | Roles, independently reimplemented from PROTOCOL §8.2 (L∞ over box spans, Jaccard < 0.5, robust filter at 50% of the selection median, extras in shortlist order) | **0 mismatches across all 30 track-folds.** Holders: F19 19, F20 27, F21 28, F23 26, F24 26. Three empty roles, all in V-F19 (0 qualified) |
| 3b | Tier and ranking, recomputed from the confirmation `nb` and each track's B1 control | **all five folds match `rankedByFold`.** `primaryRanked` = F24; `testPlan.roleHolders` and `shortlists` match; F24 #1 is VG profit `VGT:d1-f41ebcd961+GDX:d1-016d8e4257` |
| 3c | Q1–Q8, E1–E3, floors, near-bound lists, `marginal`, the infeasible-on-training veto | recomputed from evidence for 180 candidates and all controls: 0 discrepancies |
| 4 | Seed families | the code uses `('select',rep,track,fold)` (search.ts:909), `('confirm',track,fold,rep)` and variants (qualify.ts:105, evidence.ts) and `('test','sets',fold,rep)` (test.ts:217), with test bootstrap `('test',fold,'bootstrap',…)`. `deriveSeed` hashes the joined labels with sha256. Records: selection `select1+2` n = 256, confirmation `confirm 1–3` n = 384; selection and confirmation medians differ for all 180 |
| 4a | Order of stages | shortlist formed from rung-3/refinement fits (search.ts 832–891) before the selection families. Search sealed 21:08:49Z; first qualification door 21:09:14Z. Roles ordered only by `trainingSelection`; `qualified` used only as a filter |
| 4b | Seeding | no candidate book vector (480 checked) equals a frozen, GDX-control or Study 7 reference vector. Controls are evaluated in search only after the shortlist |
| 5 | Multiplicity | see finding 1 |
| 6 | Parity | `results/parity/parity.json` body verifies; `passed: true`; gates P1–P5, N1, C1, D1, T0 and G1 all true. P1: 147 comparisons, 0 differences. P2: 147 equal. P3: B5 anchors $486,207.77 / 94 lots, CLI equals evaluator, 27/27 W29 and 27/27 W13 rows equal. P5: 10 controls plus registry 5/5. N1: 110 checks equal, including five-book pools under next-open and +25 bps at both cuts. D1: three identical bodies. T0 identical. G1: all five doors refuse |
| 6a | Parity attempt 1 | body `d0f05d9e09d4…`; failed P5 only, with undefined period figures, exactly as E1 says |
| 6b | Control grids in every search and qualification record | equal `study6` `frozenGrids` (via Study 7) and Study 7 `gdxControls`; the five frozen books match `config/phenotypes/D1/*.json` |
| 6c | Test controls | `test.ts` reads the Study 7 references by rank (1, 2, 5, 6, 7, 10, 11 are VG profit/robust/balanced, VXR profit, G profit/balanced/robust) from Study 7's committed, unmodified `FROZEN_SELECTION.json` |
| 7 | Rulebook | `constants.sha256` `ff6e9d57b6e8…` = the freeze's integrity constants sha, and the values are identical. Engine digest and files in the selection equal the freeze; code digest and files equal `code-E1.json` |
| 7a | `testRules` against PROTOCOL §8.4 | substantively matches; see finding 8 |
| 8 | test.ts against PROTOCOL §8.4–§8.5 | T1–T7, the ambiguous rule, nominations (F24 only, sealed order, veto only), outcome classes, persistence, insufficient evidence, return rank, fresh memory cache, statuses logged only after `writeSealed`, `--confirm` comparison: all match |
| 8a | Gates and door order | `gates.ts`: a test door requires `selection`, `audit` and the earlier folds in order; training doors are closed now that the selection is sealed |
| 8b | Partial-period labels | `evaluate.ts` labels a period `~partial` only if its end is more than 3 days after the door's last session; every `TEST-<fold>` ends on its door's last session, so the T3 test median is computable |
| 8c | `study8-run` adapter | cannot resolve Study 8 aliases until `test-F24` is sealed (`src/study8-runners/resolve.ts` line 97) |

**Recommended before `record-audit`:** append the disclosures in findings 2 and 3 to AMENDMENTS.md, and update the checkpoint for findings 4 and 11. None of these touches a sealed file or the pinned code.
