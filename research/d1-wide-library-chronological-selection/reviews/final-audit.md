<!-- Verbatim final report of the independent, read-only final implementation-and-results auditor (a subagent of this
session), as received at 2026-10-28T02:40Z with only the delivery channel's two-space indentation removed. The auditor
created, modified and deleted no repository file, made no state-changing git call and ran no study stage.
Dispositions: FINAL_AUDIT_DISPOSITIONS.md. -->

# Final implementation-and-results audit: `d1-wide-library-chronological-selection-v1` (Study 1 of 3)

**Auditor:** independent and read-only. I did not create, modify or delete any repository file. I made no state-changing git call, used no network and ran no study stage.

**Time:** 2026-10-28T02:38Z (UTC, from `date -u`). **HEAD:** `6489a63d` on branch `research/d1-wide-library-chronological-selection`. Nothing is committed yet.

**What I ran:**
- `npm run d1-library-study -- verify`: exit 0, 362 PASS lines, "all checks passed".
- The views `status`, `nested`, `folds`, `discarded --symbol GDX --fold A`, and `show --symbol VGT --fold B --method A2 --library-size 16 --pool ARCH`. These write only to the git-ignored `evaluations/d1-wide-library-selection/`. I redirected their console output to my session scratchpad, outside the repository.
- `python3` reads of the sealed JSON, CSV and gz records, `sha256sum`, and the read-only git commands `status`, `diff`, `ls-files -s` and `worktree list`.
- `git status --short` was identical before and after the audit.

**Files that changed while I worked.** The main session updated `RESEARCH_RECOVERY.md` (now `98cc50d6…`, 02:22Z). It also created `IMPLEMENTATION_AUDIT.md` (`81dc7007…`) and `results/logs/final-{tsc,eslint,…}.log`. I reviewed those versions.

**Report versions reviewed (sha256 prefixes):**

| File | Hash |
|---|---|
| README | `6b6eda05` |
| SOURCE_ARCHIVES | `abe3c961` |
| LIBRARY_CONSTRUCTION | `0a2c4433` |
| NEW_SEARCH | `a80a81df` |
| CHRONOLOGICAL | `090dd9a8` |
| NESTED | `5c3349cd` |
| DIP | `c52895f6` |
| MULTIPLE_TESTING | `f731a587` |
| FINAL | `ec1b9856` |
| PROTOCOL | `8fc3ba56` |
| ANALYSIS.json | file `ef5b076d`, body `3f6ddbd5` |

## Overall assessment

The implementation does what PROTOCOL v2.1 §7–§11 says, and the sealed records support the headline results.

- **Rules and arms.** The decision rules match §9.2–§9.4: the five insufficiency floors, favourable, unfavourable and risk-incompatible, the K rule (same K in both folds), precedence, the nested primary cell and the study outcome. So do the arms A0, A0r, A1, A1n, A2, A3 and A4, the bounded-diameter families, the order-independent support and the J′ displacement measure.
- **Accounting and doors.** V is the liquidation-mark difference. The fail-closed boundary, cross-phase, nested-boundary and engine-equals-fast identities are in place, and so are the doors and calendar door.
- **Records.** Every sealed record verifies and carries its freeze stamps. The chronology holds: each evaluation started after the SELECTION and seals it used, and each nested selection was made after its selection-window evaluation and before any later window opened.
- **Independent recomputation from raw records:**
  - every training-only nominee for folds A and B (2 × 4,880 pool × arm × K × ETF slots), plus the A0r rule;
  - all 488 T1 A4 picks;
  - the ARCH A2-vs-A0 paired statistics in both folds.

  There were 0 mismatches.
- **Spot-checks.** 38 report-versus-record checks, covering more than 150 figures. 33 pass; 5 fail. None of the failures changes a verdict, the study outcome ("no demonstrated improvement") or the nested verdict ("validation selection is worse").
- **What is wrong.** The problems are in reporting and delivery, not in the computation:
  - The README overstates what the commit lets a reader check. It says the tracked records are enough, but the per-member window figures are git-ignored. This is the one MATERIAL finding, and it is cheap to fix before committing.
  - One factual claim in DIP §2 and FINAL Q5 is false: "no arm captured more dips than the baseline".
  - One per-K row in CHRONOLOGICAL §1 has a typo.
  - The trade ledgers leave out the lot already open at the window start, so they do not add up to V.
  - Some computed event diagnostics and the across-ETF results never reach the README or FINAL.
  - A few disclosures are inconsistent between documents.
- **Claims.** Nothing claims future profitability, out-of-sample validation, independent folds, or that the drawdown gate caps losses. The required status, evidence-level, inspected-history, survivorship and no-nomination statements are all present.

## Findings

**1. MATERIAL (delivery only; the results are correct): the README's reproducibility claim is inaccurate.**
- **Where:** `README.md:79–82` says the tracked records "suffice to check every conclusion". But the study's `.gitignore` excludes:
  - `results/evaluation/*/fast.jsonl.gz` (line 7): 8 files, about 5.0 MB in total, holding every library member's window V, drawdowns and lots;
  - `results/libraries/*/members-*.json.gz` (line 6): about 13.5 MB.
- **What the commit alone cannot support:**
  - re-deriving A4's nested picks, which is the argmax of selection-window V over each A2(K) library and the basis of the headline "validation selection is worse";
  - the discarded-group audit (2,164 and 2,807 vectors);
  - the library random-pick and oracle means;
  - the training-versus-window rank correlation (ρ).

  The committed record holds these only as aggregates in ANALYSIS.json. The picks' later V *is* tracked (`nominees.csv`), and the training selection paths can be rebuilt from the tracked `libraries.csv.gz`.
- **Why it matters:** brief §3 requires an accurate statement of whether the commit suffices, and §11 requires that a user can "reproduce a selection path without trusting narrative summaries".
- **Fix, before the commit:** track the eight `fast.jsonl.gz` files, and preferably `members-*.json.gz`. Their sha256 are already in the sealed records. Otherwise, rewrite README:79–82 to name exactly which results need regeneration.
- **Checked locally:** all 488 T1 A4 picks recomputed from the local fast rows match the sealed picks, with 0 mismatches.

**2. MINOR: a factual error in a final answer.**
- **Where:** `DIP_EVENT_CAPTURE_AND_TAIL_RISK.md:43` and `FINAL_COMPARISON_AND_RECOMMENDATION.md:40` say "No arm captured more independent dips than the (narrow) baseline."
- **What the data show:**
  - In fold B on NEW, A3 dip-captured 50 of 156 families (36 major) against A0r's 40 (27). DIP's own table, lines 39 and 41, shows this.
  - On ALL in fold B, A3 captured 57 (43) against 53 (36).
  - On NEW in fold B, A1 captured 46 (33).
  - In T1-later on NEW, A2 captured 60 (37) against 52 (32).
  - A3's 36 major families on NEW exceed the sealed A0's 34.
  - These counts are summed over 61 correlated ETFs, so they are not "independent dips".
- **Fix:** "In fold A no wide arm captured more dip families than its baseline. In fold B several did on the new pools (A3 on NEW 50 vs 40, on ALL 57 vs 53) without a better V. Counts are summed across correlated ETFs."

**3. MINOR: one row of the per-K state table is wrong.**
- **Where:** `CHRONOLOGICAL_FOLD_COMPARISON.md:34`.
- **Problem:** the row shows NEW/A3 fold A as `· ·R · ·R`. ANALYSIS.json gives `· · ·R ·R`. At K = 16 the breaches are 2 against 0, which is not risk-incompatible; the R belongs at K = 32 and K = 64.
- **Why it matters:** as printed, an R at K = 16 would mean the verdict "worse", which contradicts the "no evidence of improvement" cell shown above it. The other 23 fold-rows match.
- **Fix:** correct the row.

**4. MINOR: an undisclosed wording ambiguity that could change the headline label, and across-ETF results missing from README and FINAL.**
- **The ambiguity.** PROTOCOL §9.4(3) says "some arm is 'improves' on a pool other than ARCH". That is the same token as the across-ETF verdict label ("improves", §9.3, and `decisionRules.acrossEtf` in the matrix).
- **What the code does.** `analysis.ts:314–347`, called at `:999`, uses only the within-ETF verdicts. This is the better reading: the matrix names the within-ETF rule "improves", and the other §9.4 clauses ("worse" on ARCH, "insufficient evidence" on ARCH) only make sense for within-ETF verdicts.
- **Why it matters.** NEW-S/A3's across-ETF verdict is "improves". Under the literal alternative reading, the study outcome would be "mixed / inconclusive" rather than "no demonstrated improvement".
- **The omission.** README and FINAL do not mention the across-ETF layer at all: neither the 12 across-ETF verdicts nor the nested across-ETF verdicts. Brief §7 ("Selection scope") requires both within-ETF and across-ETF results.
- **Fix:** add one sentence to README and FINAL, saying that:
  - the within-ETF verdicts define §9.4;
  - there is one across-ETF "improves" (NEW-S A3, beside a within-ETF "worse" for the same arm and pool);
  - under the literal reading it would change the label only to "mixed / inconclusive".

**5. MINOR: the trade ledgers do not add up to V.**
- **Where:** `tables.ts:608` keeps only lots *entered* inside the window, so the lot open at the window start is missing.
- **Example:** A/DBC `226.42.36.30.222.31.196.23` has V5 = $28,944.57 and `openAtStart` = 1, but its ledger's cumulative net is $23,999.81.
- **Extent:** in 680 of 1,785 nominee-window ledgers, the final `cumulativeNet` differs from V5 by more than $1. The window lot metrics have the same scope: interest, friction, worst lot and the expected-shortfall (ES) proxy.
- **Why it matters:** brief §5 and §11 stress P&L for positions open at the boundary, and DIP:10–11 calls the ledgers "every window lot". Separately, 895 of 14,298 ledger rows have an empty `episode` field.
- **Fix:** add a carried-in-lot row (its window share, from the engine marks at the window start) or a reconciling column. At minimum, state the non-reconciliation in DIP and README.

**6. MINOR: T2-later has no event attribution, and this is not disclosed.**
- **Why it happens:** phase B's capture window starts at 2021-12-31 (`evaluation.ts:104`), so `captureMatches` (`analysis.ts:517`) yields `events = null` for all 85 T2-later metrics.
- **What still works:** the event-count floor still applies, because there is a catalog for each window start.
- **What is disclosed:** S21's missing events are disclosed (CHRONOLOGICAL:164); T2-later's are not.
- **Fix:** add one line in NESTED and DIP.

**7. MINOR: gaps in `verify`, and a statement in IMPLEMENTATION_AUDIT that is broader than the check.**
- **(a) Protected files.** `views.ts:393–413` re-hashes only `data.sha256` (65 files) and `key-inputs.sha256` (20 files).
  - It never compares `protected-tracked.ls-files.txt` or `git-ls-files-stage.txt` with the git index.
  - Yet `IMPLEMENTATION_AUDIT.md:14` says "`results/baseline/*`; `verify` re-hashes them".
  - I checked by hand: `git ls-files -s` is identical to the baseline manifest, and only `package.json` is modified (by exactly one added script). So nothing is wrong; the sentence just claims more than the check does.
- **(b) Tables.** No record seals or hashes `results/tables/*` (`ledgers.csv` `cad1e0d5…`, `comparisons.csv` `9fa76a82…`, `nominees.csv` `244af23c…`). The `tables` command can be re-run and overwrites them.
- **(c) Analysis inputs.** Neither `verify` nor `chronology.ts` checks that the analysis record matches the current evaluations, or that the analysis started after the last of them. I checked both by hand: ANALYSIS.json's `inputs` equal the current evaluation body hashes, and the analysis started 02:10:34Z, after the last evaluation finished at 02:02:37Z. The analysis record does not store the SELECTION or nested body hashes it read.
- **Fix:**
  - record the table and ANALYSIS.json hashes in IMPLEMENTATION_AUDIT and the checkpoint;
  - either narrow that sentence or add the index comparison to `verify`;
  - add the analysis input and timing check as a report-only amendment.

**8. MINOR: brief §5 and §9 items that are computed but never reported.**
- **Present in ANALYSIS.json for every cell, but absent from the reports and from `events-tails-portfolio.md`:**
  - first-entry offsets from the trough. For fold B ARCH A0 the median is −20 sessions, meaning entries come about 20 sessions before the trough, which bears directly on the falling-knife finding;
  - major families missed by the nominees (13 for that cell);
  - continuation trades high in the rebound;
  - holding-day, exit-reason and MAE/MFE distributions;
  - the episodes behind the largest winners, and the spread of entry depths.
- **Also missing:** there is no by-event-family summary (brief §11). The rolling-year event counts (S18 35/14, S19 81/55, S20 51/12, S22 79/23) appear only in the tables.
- **Fix:** add a table to DIP and a by-family export.

**9. MINOR: disclosures are not consistent across documents.**
- **(a) The checkpoint.** `RESEARCH_RECOVERY.md`'s Disclosures list (from line 95) has no item for the pre-freeze S18 dry run; there is only a determinism sentence at line 83. Yet CONFIRMATORY_DISPOSITIONS N1(a) says the dry run is disclosed "in PROTOCOL §0 and the checkpoint", and `IMPLEMENTATION_AUDIT.md:79` says "all disclosed in the checkpoint". The flag defect (finding 10) appears only as a "Known defect" line.
- **(b) Evidence-level paragraphs.** The README and FINAL evidence-level paragraphs omit the dry run. They also omit that the family diameter (d ≤ 0.5) was chosen after the fold-a census (PROTOCOL §6.2); that fact is also missing from LIBRARY_CONSTRUCTION and MULTIPLE_TESTING.
- **(c) The rolling track.** PROTOCOL §3.2 discloses that the pre-freeze fold-a reconstruction and census, run through 2020-06-30, covered S18's whole evaluation window and the first half of S19's. CHRONOLOGICAL §6, where the rolling track is reported, does not repeat this.
- **(d) Numbering.** The checkpoint's disclosures are numbered out of order: 1, 2, 4, 6, 5, 3.
- **Fix:** add one disclosure entry or line for each.

**10. NOTE: the flag defect (already disclosed).**
- **Where:** `selection.ts:376–411` applies the "new nominee shares an archived training signature" flag to every non-ARCH pool, including the archive-provenance nominees of ALL.
- **Verified:** all 215 (fold A) and 290 (fold B) flags are archive-provenance vectors matching themselves. New-provenance flags: 0. No incumbent-grid matches.
- **Impact:** descriptive only; no rule uses the flag.
- **Fix, in any successor code:** keep only nominees whose member provenance is `'new'`.

**11. NOTE: numeric and wording slips (none affects a verdict).**
- `LIBRARY_CONSTRUCTION:79` says "38–55". The correct range is 36–55: in S18, A2 and A3 each have 25 nominees identical to the baseline.
- `CHRONOLOGICAL:137` says A1 vs A1n in fold B is "neither or favourable". On NEW at K = 64 it is unfavourable.
- `SOURCE_ARCHIVES:58–60` says "most sealed libraries hold one family (median 1)". In fold-b only 27 of the 57 ETFs with credible vectors hold one family; the median over those 57 is 2.
- `README:15` says "one family … filled the old top 32". T-b means the family holds at least 50%; it holds 100% in only 29 (fold-a) and 24 (fold-b) ETFs. The "~1.5 behaviours" figure is 1.5 in fold-a but 1.7 in fold-b.
- `FINAL:20–21` says "On the new pools A1 is unfavourable in fold A and favourable in fold B ('mixed')". That is true only for NEW. On NEW-S (·/U) and ALL (U/·) the verdict is "no evidence".
- `MULTIPLE_TESTING:16` says "≈ 10k capture draws per engine phase". The actual range is 1,376–13,200.
- `DIP:45` defines a falling knife as "a decline-phase entry lost money". The code (`analysis.ts:594`) counts episodes with at least one decline entry and an episode net ≤ 0, which is not the same thing.
- `RESEARCH_RECOVERY:111` dates the pre-freeze test run 23:02Z. The log ends at 22:59:37Z.
- "Nominee ≈ random member" compares a mean over all 61 ETFs (idle slots counted as 0) with a mean over only the ETFs that have a library.

**12. NOTE: some interpretations are stronger than two regimes support.**
- `FINAL:58` ("treat the best-trade deduction as a regime bet, not a defect") and SOURCE §7 ("regime-dependent") rest on two correlated market regimes. Phrase them as "consistent with".
- FINAL Q6 answers "Yes". Add that the procedures' design (thresholds, diameter, arms) was informed by the inspected history; only their execution was blind to it.

**13. NOTE: the supporting evidence will not be committed.**
- `results/logs/` is ignored by the root `.gitignore` (`logs/`). The test, tsc, eslint, `verify` and earlier-verifier logs, and the CLI demonstrations, stay local only.
- No log shows the frozen 32-test suite passing before the first post-freeze stage. The pre-freeze log (22:59Z) predates the tests added after the confirmatory review (N12). The final run (02:20Z) passes the same frozen test files: 712 of 722 overall, the 10 failures being the pre-existing `allin-original.ts` case mismatch.
- tsc exits 0. eslint reports 12 warnings and 0 errors.
- **Fix:** keep the short summaries in IMPLEMENTATION_AUDIT (mostly done already).

**14. NOTE: the checkpoint is coarse in places.**
- It collapses stages 16–33 into one row with no record hashes.
- It gives no hash for ANALYSIS.json or the tables.
- It records the running audit without a task ID.
- Separately: W and L are counted at 5 bps only, where the protocol leaves the cost implicit (the code's reading is reasonable). B-sel's lack of an engine run is by design and is cross-checked against phase B at all four costs.

## Conformance summary (audit questions 1–6)

**1. Implementation against PROTOCOL v2.1. Conforms**, apart from findings 5–7 and 10.
- **Paired comparison:** `compare` (`analysis.ts:170–271`) matches §9.2. The floors are W+L<10, CW+CL<5, fewer than 10 active ETFs for the arm or for the baseline, and fewer than 10 window families. Favourable, unfavourable and risk-incompatible are as written, and B is counted from the fast-path windowed minute drawdown at 5 bps.
- **Verdicts:** `verdictOf` (283–311) applies improves → worse → insufficient → no evidence → mixed, with the K rule K = 8 ∧ 16 ∧ (32 ∨ 64) using the same K in both folds.
- **Study outcome:** `studyOutcome` matches §9.4 (finding 4 covers the one ambiguity).
- **Nested and rolling:** `nestedCellVerdict`, `nestedStudyVerdict`, the nested across-ETF rule (966–979) and the rolling track (981–997) match §9.3.
- **A4:** `nested.ts:61–80` uses the A2(K) library, requires ≥ 1 lot and minute DD ≤ $35,000, takes the maximum V_sel if V > 0, breaks ties by T_nb then key, and flags single-lot picks as thin evidence.
- **Training arms:** `library.ts:200–275` and `414–524` implement A0r, A1, A1n, A2 and A3 as in §7 and RULES §4. My recomputation over 9,760 slots found 0 mismatches, and the library ordering and one-member-per-family invariants hold.
- **Families:** `families.ts` uses complete linkage, so there is no chaining. Support and the J′ displacement measure follow §4.4 and §6.2.
- **V and parity:** the boundary parity is at `evaluation.ts:484–496`. The cross-phase and nested-boundary identities run at 5 bps for all vectors and at 0/2/10 bps for nominees (498–554). Engine-versus-fast checks V, windowed daily drawdown and lots at all four costs (590–618). Every failure stops the stage (747–754).
- **Doors and freezes:** `doors.ts` provides the calendar door, the 2023-12-29 cap, the source caps and the later-window pool check. `freeze.ts` provides the stamps, the outcome digest in force at a record's start and the hash-chained amendments.

**2. Records.**
- `verify` passes: 362 checks.
- I recomputed the freeze hashes myself: 50 files in the protocol freeze and 27 in the code freeze all match, except `views.ts`. Its current hash, `ed06b519…`, equals amendment 1: a reporting amendment at 02:17:16Z, with a valid hash chain, touching no outcome-defining code.
- Every post-freeze record is stamped with protocol body `d45fc411…`, code body `84ff5a4a…`, outcome digest `53c1c941…` and amendment null.
- **Timestamps (UTC):**
  - protocol freeze 23:48:53.178Z, code freeze 23:48:53.442Z, first stage 23:49:24Z;
  - SELECTION A finished 00:20:20Z, phase A ran 00:29:49–00:41:05Z, T1 was sealed 00:41:05.749Z;
  - the fold-b reconstruction started 00:41:35Z and SELECTION B finished 01:03:56Z;
  - B-sel ran 01:03:56–01:06:37Z and T2 was sealed 01:06:38Z;
  - phase B started 01:17:31Z, after S22 was sealed; T1-later started 01:36:04Z;
  - the final-window census finished 02:10:05Z, before the analysis started at 02:10:34Z.
- Each evaluation's `selection.bodyHash` and door seals equal the current files.
- The S18 dry-run digests are reproduced byte for byte.
- The git index is identical to the baseline manifest.

**3. Results:** see the spot-check table below.

**4. Claims.**
- I found no claim of future profitability, out-of-sample validation or independent folds, and no claim that the $35,000 gate caps losses; FINAL:51 explicitly denies these.
- "Study 1 completed; Study 2 not started; Study 3 not started" appears at README:8–10 and FINAL:13–14.
- Every report states its evidence level.
- The inspected-history and survivorship caveats are in MULTIPLE §3 and SOURCE §3.
- No production configuration is nominated.
- Overstatements are covered by findings 2, 11 and 12.

**5. Brief coverage.**
- All §11 reports exist. IMPLEMENTATION_AUDIT is a draft that awaits this audit.
- The JSON libraries and selections are tracked; the member files are not (finding 1).
- The ledgers have every column the brief asks for, but do not reconcile to V (finding 5).
- All 10 CLI commands exist, and the ones I ran work.
- There are 32 study tests, covering chronology, determinism, K-nesting and deduplication, the bounded search, boundary accounting and forbidden reads.
- The earlier studies' verifiers pass before and after, according to the logs.
- Matching-window references: VGT primary, B4 and B5 for folds A and B; VGT for every rolling year. There are no B4/B5 figures for T2-later or the rolling years (NOTE).
- Gaps are covered by findings 1, 4 and 8.
- The commit and push (brief §3, §13) have not happened yet, so I could not audit them.

**6. Disclosures.** All of these are disclosed:
- the dry run;
- the flag defect;
- anchors v1 (498 of 531 checks passed, superseded by v2 at 579 of 579);
- the overwritten `verify.json` of the standalone audit, restored from git;
- the 10 pre-existing test failures;
- the pre-freeze exploration (the fold-a census and its use in setting the diameter);
- that the designer had read A0's published fold outcomes before writing the protocol.

The consistency gaps are in finding 9.

## Spot-check table (report figure → record → result)

| # | Figure checked | Record | Result |
|---|---|---|---|
| 1 | Study outcome "no demonstrated improvement"; nested "validation selection is worse" | ANALYSIS `outcome`, `nestedVerdict` | PASS |
| 2 | 12 within-ETF verdicts (CHRONOLOGICAL §1) | `verdicts`, verdicts.md | PASS 12/12 |
| 3 | 12 across-ETF verdicts | `acrossVerdicts` | PASS |
| 4 | Per-K states, 24 fold-rows | `comparisons` | 23 PASS, **1 FAIL** (finding 3) |
| 5 | Fold A ARCH A0: Σ V $306,094 / $298,341 / $295,657 / $249,607; 49 nominees; 195 lots | metrics | PASS |
| 6 | Fold A ARCH A2: $355,439; mean ΔV +$980 / +$1,208; W/L/I 27/16/8; CW/CL 9/6; B 0 | metrics, comparisons, my recomputation from SELECTION + fast rows | PASS |
| 7 | Fold B ARCH A2: −$403,517; −$4,004 / −$4,619; 17/26/11; 6/9; B 12 vs 11 | same, recomputed | PASS |
| 8 | +$59,782, −$244,249, −$108,398, +$80,910 (CHRONOLOGICAL:90–91) | arithmetic on metrics | PASS |
| 9 | Fold B NEW A2 −$494,700 / −$547,708, B 16; NEW-S A3 −$277,181, B 17; NEW-S A3 fold A $321,041, +$3,308 / +$3,247, 27/17/10 | metrics | PASS |
| 10 | Four-way split, A2 vs A0 on ARCH (8; 44: 21/15, −$57,026; 8: 6/1, +$116,808; 1 ∣ 11; 48: −$187,162; 2: −$57,087); mean without largest cluster +$1,726 / −$2,561 | `comparisons.split` | PASS |
| 11 | Largest cluster contributions (−$38,602 … +$44,116) | `byCluster` | PASS |
| 12 | A1(8) vs A0: −$1,950 (15/18), +$852 (20/20); ARCH-S vs NEW-S, 8 values | ablations | PASS |
| 13 | A1 vs A1n: fold A −$811 / −$988 / −$1,037; "fold B neither or favourable" | ablations | **FAIL** (wording; NEW K = 64 is U) |
| 14 | Baseline top 5 (GDX, XHB, SMH, XLY, IJR: +$29,517; GDX, XHB, KBE, XRT, VGT: −$3,560); NEW-S A3 across-ETF Δ at 5 and 10 bps | `across` | PASS |
| 15 | ETF subsets: share positive 14–46%; all medians negative | `subsets` | PASS |
| 16 | Discarded groups (128: $4,184 / $1,940 / 71 … 2,807: −$3,780 / −$769 / 871) | `discardedGroups`, discarded-groups.md | PASS |
| 17 | T1/NEW K = 16: 51 picks; +$25,416 / −$5,512; 15 positive; 16 thin; ρ −0.13; Σ −$281,110 / −$129,913 / −$163,595; −$2,479 / −$1,926; W/L 23/27 | metrics, comparisons; A4 recomputed 488/488 | PASS |
| 18 | T2 rows and the nested cell states (T1 NEW-S "no evidence", T2 ARCH and NEW-S "worse") | metrics, `nestedCells` | PASS |
| 19 | Rolling track: A0r Σ V ($177,433 … $45,425) and 15 states / mean ΔV | `rolling`, comparisons | PASS |
| 20 | Window families 74/24 and 156/78; T1-later 156/78 | events | PASS |
| 21 | DIP capture and tails table (13 rows × 8 columns) | metrics | PASS |
| 22 | "No arm captured more (independent) dips than the baseline" | events | **FAIL** (finding 2) |
| 23 | Winners-robustness table (6 rows) | `winners` | PASS |
| 24 | Portfolio overlay (5 rows, e.g. +$52,936 / 11.7%, −$15,061 / 34.0% / 54 and 23) | `portfolio` | PASS |
| 25 | Census: rows 137,486 / 138,915 / 140,137; credible 28,067 / 27,913 / 25,122 (local 11,099 / 11,558 / 12,413); families 2,530 / 3,776 / 4,159; medians 40 / 59 / 68; ≥ K counts; T-a 18 / 15 / 10%; T-b 93 / 89 / 92%; 0 mismatches; A0 reproduced 61/61 in each window | CENSUS, RECONSTRUCTION | PASS |
| 26 | Discard reasons (63,298 … 14; 50,870 … 17); displaced 44/33, 77/40, 60/38; best trade's share of net 74 / 82 / 65% vs 32 / 26 / 23% | census rows | PASS |
| 27 | "Most sealed libraries hold one family"; "filled the old top 32"; "~1.5 behaviours" | census | **FAIL** (wording; finding 11) |
| 28 | New search: evaluations, Sobol, refinements, credible, ETFs with none, starts, 0 collisions, redraws per fold; total 413,280; 14 workers / 16 cores | SEARCH.json | PASS |
| 29 | Parity sample: 9,330 checks on 933 vectors, 0 failures | SAMPLE_PARITY_* | PASS |
| 30 | Library table (medians over 61, ≥ K, nominee counts, A0 ≠ A0r = 0) and power table | SELECTION.json | PASS; "38–55" FAIL (finding 11) |
| 31 | Draws 71,200 … 180,157 (1,768,515 in all) | `drawEvaluations` | PASS |
| 32 | Random-pick vs nominee ($3,070 / $3,641; $5,827 / $5,352; −$1,285 / −$2,582; −$6,615 / −$4,306); oracle ranges; ρ −0.14 to +0.25 | `metrics.library` | PASS |
| 33 | VGT primary: +$32,698 (DD $14,894); +$22,145 ($17,421); 2019 $32,310; 2020 $75,298; 2021 $2,015; 2023 $0. B4 / B5: $62,161 / $46,506 and $112,826 / $170,997 | fast and engine rows; ANCHORS (579/579) | PASS |
| 34 | S18 determinism (797c5c13, 3f0ff3ea, f346367d, members 65e30aa2, csv d9dfe275) | DRYRUN_DIGESTS vs official records | PASS |
| 35 | Flags 215 / 290, all archive provenance; 0 of new provenance | members-ALL | PASS |
| 36 | Ledger cumulative net reconciles to window V | ledgers.csv vs nominees.csv | **FAIL** (680 of 1,785 differ; finding 5) |
| 37 | Two cost sign-flips at K = 16; 5 → 10 bps lowers fold-B Σ V by $6k–$53k (ARCH, NEW); 8–17 breaches per arm | comparisons, metrics | PASS |
| 38 | Every training-only nominee and the A0r rule, recomputed (folds A and B) | members + SELECTION | PASS (0 of 9,760 mismatched) |

## What I could not verify

- I did not run `npm test`, `tsc`, `eslint`, the earlier studies' verifiers (pools, forward status, vgt-robustness, ranked-preemption at `40da6ddf`, standalone audit at `6489a63d`) or any stage. I relied on `results/logs/final-*.log`, which are git-ignored and therefore local only.
- I did not re-execute the fast path or the full engine. The parity figures rest on the sealed fail-closed records. Byte-for-byte regeneration of the ignored artifacts is evidenced only by the S18 dry-run comparison.
- I did not review line by line `census.ts`, `archive.ts`, `anchors.ts`, the internals of `search.ts`, or the source-study and audit engines, catalog and neighbourhood code the study imports.
- I could not verify what the designer looked at before the freeze (the dry run's "structural counts only", the reading of A0's published outcomes). I can confirm only that these are disclosed.
- I checked the coverage and liquidity labels for 3 of the 7 ETFs (EDV, KIE, VOOG).
- I could not audit the commit, the push, the remote head or the final clean/dirty state; none has happened yet. The worktrees `wt-40da6ddf` and `wt-6489a63d` are still present in the session scratchpad.
- `IMPLEMENTATION_AUDIT.md` is a draft written during this audit. Its final version, and the dispositions of this audit, are outside what I reviewed.
