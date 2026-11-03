# Study 9 Phase B — final independent audit

**Auditor statement.** I am an independent, read-only auditor (a fresh agent, launched with
`reviews/FINAL_AUDIT_BRIEF.md`). I did not take part in the study. I wrote only this file. I modified no source, report,
table, record, configuration or data file, ran no git write operation, accessed no network or broker, and ran no study
stage other than `s9b.sh verify-chain`. My only runner calls were the two the brief permits, with their outputs written
outside the repository.

**Time (UTC, from `date -u`):** audit started 2026-11-03T09:38:52Z; chain verified 09:39:06Z and again 09:59:06Z;
report written 2026-11-03T10:00Z.

**Scope:** the brief `brief/ASSIGNMENT.md` (sha256 `3158751595d1fc35…`), `PROTOCOL.md`, `AMENDMENTS.md` (A0, E1–E4),
`RESEARCH_RECOVERY.md`, the ten reports, the sealed records of chain entries 1–18, `results/doors.jsonl`, the generated
tables, `results/runner/*.txt`, the earlier reviews, and the relevant code in `src/study9-phase-b/` and
`src/study9b-runners/`.

Result: CLEARED WITH NOTES

**Summary.** 0 blocking and 16 non-blocking findings. The integrity chain, the door order, the training-door cut-offs,
every T-gate status, the mechanical nomination, the confirmatory and family-wise bootstrap verdicts, the preference
bands and the NOT DEPLOYED decision all match the sealed records. I recomputed more than 25 headline figures with
read-only scripts, and they match to the dollar or to the stated rounding.

The findings are errors and gaps in the descriptive narrative. Several narrative statements contradict the sealed
records: findings 1–4, 6 and 10. Others are missing or inaccurate disclosures: findings 12–14. None changes a sealed
record, a gate, the nomination or the conclusion about VG #2. **They should all be corrected before
`seal report-final`**, because that phase seals these reports as they stand.

## Commands run

Every command ran from `/home/chad/projects/margin-trading` with Node v24.21.0 on `PATH`. The scratch folder is
`/tmp/claude-1000/-home-chad-projects-margin-trading/7754e7dc-70cd-4ab4-9a0b-94f7745baa71/scratchpad/final-audit/`,
written `<S>` below.

- **Clock and git (read-only):** `date -u` (several times); `git status --short`; `git rev-parse HEAD`;
  `git branch --show-current`; `git diff package.json`; `git diff --stat`; `git worktree list`; `git stash list`;
  `git log -1`; `git ls-files …`; `git check-ignore -v …`.
- **Chain check (twice):** `research/study9-phase-b/scripts/s9b.sh verify-chain`.
- **Hashes:** `sha256sum` of the 22 files whose hashes `RESEARCH_RECOVERY.md` quotes.
- **Record checks:** read-only `python3` scripts (stdin heredocs, writing nothing) that read
  - `results/chain.jsonl` and `results/doors.jsonl`;
  - every `search.json`, every `qualification.json` and `FROZEN_SELECTION.json`;
  - the five `test.json`, `confirm.json` and the `test-lots.jsonl.gz` ledgers;
  - `slice-2026-10-30.json`, `diagnostics.json`, `preference.json` and `parity.json`;
  - Study 8's sealed `results/test/F24/test.json`;
  - `data/VGT/data.csv`, to count sparse sessions.
- **Runner:**
  - `npm run study9b-run -- list > <S>/list.txt` (exit 0);
  - `npm run study9b-run -- run s9b-nominee --end 2026-10-29 --out <S>/nominee-2026-10-29 > <S>/nominee-run.txt`
    (exit 0, 13 s).
- **Inspection:** `cat`, `sed -n`, `grep`, `ls`, `stat` and `find -newermt '2026-11-02T22:06:00Z'` on files in the
  study, `src/` and the runner logs under the git-ignored `evaluations/study9b-runs/`, plus `cmp` of the two F24 lot
  ledgers.

After my runner run, `git status --short` was unchanged (16 entries) and `verify-chain` still passed. The chain and the
door log kept their hashes (`d638143800003617`, `8b93e1ac7010269b`; still 114 door openings).

## Findings

Every finding below is **non-blocking**. The study's own facts are quoted from the sealed records.

### 1. `POOL_COMPLEMENTARITY_AND_LEDGER.md` misstates the sealed diagnostics

- **Evidence (`results/diagnostics/diagnostics.json`, `rows[*].complementarity`):**
  - **MTUM, line 53** ("MTUM in the G4 pools ($8–17k whole run, no test-window lots)"). This is true only of #2 and #3.
    - Across the 10 G4 holders MTUM's leave-one-out (LOO) contribution runs $7,963–$111,417: #12 $111,417 (its largest
      book), #11 $97,638, #6 $77,006, #5 $64,835, #17 $56,177, #4 $51,789.
    - MTUM's test-window Shapley value is non-zero in 8 of the 10 (e.g. #12 $14,729, #17 $13,210, #8 $11,117, #6 $6,820).
  - **IWM, line 54** ("IWM in the VG3-IWM holders ($31–53k …)"). IWM's LOO is $17,849 (#9), $18,547 (#10), $31,346
    (#15), $45,220 (#16) and $52,717 (#1).
  - **GDX, line 56** ("GDX dominates every pool that holds it (Shapley $82–181k)").
    - GDX's Shapley value across the 15 GDX holders runs $41,278 (#17) to $215,883 (#10).
    - GDX is not the largest book in #7 or #8 (KRE $121,111 / $115,428), #15 (VGT $89,889) or #17 (ILF $61,153).
  - **Lines 35–36** ("The other G4-EWW holders show the same structure … MTUM again $0 in the test window"). Only #3 is
    shown. MTUM's test-window Shapley is #4 $239, #5 −$1,193 and #6 $6,820.
  - **Line 12** says "All 15 non-empty membership subsets", but the table shows 9. KRE+EWW, EWW+GDX, KRE+MTUM, EWW+MTUM,
    KRE+EWW+MTUM and GDX+MTUM are omitted; the record has all 15.
  - **Line 46**, "the VGT book halves the pool's drawdown": $36,160 → $21,304 is −41%.
- **Correction:**
  - Restate the low-contribution books per holder: MTUM is low only in #2 and #3, and is the largest LOO book in #12.
  - Give the true ranges: IWM LOO $18–53k; GDX Shapley $41–216k. Say that GDX is the top book in 11 of 15 GDX holders.
  - Either list all 15 subsets or say "selected subsets; all 15 in `diag-complementarity.md`".
  - Replace "halves" with "cuts by about 40%".

### 2. "GDX drives the deepest drawdowns of every GDX pool" is false for six of the 15 GDX holders and for B5

- **Where:** `RECOMMENDATION.md:135`; similarly `EXECUTION_RISK_AND_LIQUIDITY.md:187` ("most of the deep drawdowns of
  every GDX pool").
- **Evidence (`diagnostics.json` `risk.episodes[0].bySymbol`):**
  - #7: KRE −$26,179 vs GDX −$5,503;
  - #8: KRE −$19,702 vs GDX −$4,896;
  - #11: KRE −$18,177 vs GDX −$8,161;
  - #12: KRE −$15,192 vs GDX −$8,227;
  - #16: VGT −$15,696 vs GDX −$4,021;
  - #2, the nominee, in March 2020: GDX −$12,881 and KRE −$10,094;
  - B5: KRE −$18,023 and VGT −$8,487.
- **Correction:** limit the statement to the G4-EWW holders #3–#6, VG3-IWM #1/#9/#10/#15, VG #2 and VG #1, whose worst
  episodes are 100% GDX in 2026.

### 3. `TRAINING_QUALIFICATION.md` reports defined PBO values as "undefined"

- **Where:** lines 14–23. The table shows "—" for G4-ILF F19, G4-EWW F19, N3-EDV F19, V3-IWM F19 and N2-EDV F20.
- **Evidence:** the sealed records (`results/qualify/<TRACK>/<FOLD>/qualification.json`, `pbo.pbo`) give 0.000, 1.000,
  1.000, 0.000 and 1.000 (6 splits on F19, 20 on F20). `SEARCH_AND_COMPUTE.md:73–78` and `results/tables/qualify-pbo.md`
  print these values. The "—" hides three of the worst possible PBO values (1.0).
- **Correction:** print the values, with a note that 4 or 6 half-year blocks give coarse estimates.

### 4. `TRAINING_QUALIFICATION.md:77–81` overstates the training lift and the comparison with VG #2

- **Evidence:**
  - "lifted every pool well above its Phase A generic-vector screen": G4-ILF went from $25.9k to $26.5k/yr (+2%).
  - "Only the KRE + GDX pools and the VGT + GDX + IWM pool exceed VG #2's training robust profit": no G4-ILF holder
    does. Its best is #7 at $26,480 against VG #2's $26,990 under G4-ILF labels. Only G4-EWW #2–#6 ($27,061–$31,024 vs
    $26,635) and VG3-IWM #1 ($31,103 vs $26,690) exceed it.
  - "the N and V pools earn about half": N2-SMH is at 72% ($19,441 vs $26,975).
- **Correction:** name G4-EWW and VG3-IWM #1, not "the KRE + GDX pools"; qualify "well above" and "about half".

### 5. The quoted test-door "opening" times are stage start times

- **Where:** `CHRONOLOGICAL_VALIDATION.md:10–11` (F19 06:26:48Z … F24 07:43:56Z) and `RECOMMENDATION.md:15` ("opened
  2026-11-03T07:43:56Z").
- **Evidence:**
  - These are the `start` lines of `results/runlogs/orchestrator-test.txt`, which equal the previous stage's seal time.
  - The doors actually opened at 06:27:18.899Z, 06:39:32.015Z, 06:54:59.112Z, 07:17:40.399Z and 07:44:40.015Z
    (`results/doors.jsonl` lines 106–110).
  - The order and the once-each property are correct (see "Verified", §1).
- **Correction:** call them stage start times, or quote the door-log times.

### 6. `CHRONOLOGICAL_VALIDATION.md:108–109` misplaces the nominee's worst drawdown

- **Evidence:** "(the worst drawdown is inside the test window)" is false for the nominee.
  - Its run maximum, $22,975, runs from 2020-03-17 11:14 to 2020-03-23 09:46 (`test.json` holder #2
    `deep.series.peak` / `trough`; `diagnostics.json` `episodes[0]`).
  - Its test-window maximum is $22,188 (2026-06-17 → 2026-07-31).
  - `POOL_COMPLEMENTARITY_AND_LEDGER.md:31–32` states this correctly.
  - The parenthesis is true of VG #2 (its $21,304 episode is 2026-04-01 → 2026-07-17).
- **Correction:** move the parenthesis to VG #2.

### 7. Several wording slips and number errors in `RECOMMENDATION.md`

- **Lines 92–95 mix up two separate tests.**
  - They explain "not economically compelling" (§9.3) with the conditional-band compelling-case items (§9.2), which
    apply only to the 93–95% band; no non-failed holder is in that band.
  - They say "Most fail the training criterion too" and then "Every admitted holder fails item 1". The record has item 1
    false in all 32 rows (`preference.json` `rows[*].compellingCase.items`).
  - The §9.3 reason is that no holder shows a bootstrap advantage, and that #8 and #12 also fail the fill criterion and
    #12 the contribution criterion.
- **Line 65** says "every other holder … 32 comparisons". The max-T family has 32 members, including the nominee and the
  19 failed holders (`comparisons.testWindowFamilywise` = 32).
- **Line 102** says "the lowest run DD among the high earners ($21.3k)". #15 ($67.0k test net, $19,172 DD), #16
  ($64.8k, $19,717) and Study 8 VXRG #3 ($65.3k, $21,192) are lower.
- **Line 110** says the G4-EWW pools have "the weakest test economics of the passing tracks". G4-ILF's passing holders
  are weaker: #8 $22,750 and #12 $19,307, against G4-EWW's $26,228–$45,407.
- **Lines 120–121** say rank information was "none on F19–F23 (0.08 / 0.19 / 0.44 / −0.14)". F21's ρ is 0.44 (0.57
  against the test median), which is not "none".
- **Lines 76–78:** "In 2026 YTD they earned about what VG #2 did ($26.5–29.9k)" is true of G4-EWW only. The G4-ILF
  holders made −$1,270 to $11,784.
- **Line 64:** "earned reliably less". It is one inspected window and a 90% two-tailed interval. Suggest "earned less on
  this window; the 5–95% interval excludes zero".

### 8. Caveats about the comparator are missing, and the VG #2 wording is a little strong

- **Evidence:**
  - The B1/B5 hindsight disclosure (PROTOCOL.md:376–377) does not appear in `RECOMMENDATION.md` or
    `CHRONOLOGICAL_VALIDATION.md`.
  - Neither report says that VG #2 became the user's favourite after Study 8's 2025–2026 results were known. That
    favours the comparator on the very window used to compare against it.
  - For #14, #15 and #16 the difference from VG #2 is statistically indistinguishable: Δ −$3,384 (SE $41,801),
    −$12,886 (SE $29,622) and −$15,088 (SE $33,023).
  - The protocol's taxonomy labels these "no advantage", which is true. The brief (§9) says intervals that overlap zero
    "must be reported as inconclusive".
- **Assessment of the main claim.** "No Phase B pool beats VG #2 balanced" is supported on the stated basis:
  - no holder out-earned VG #2's $79,925 on F24 (the highest is $76,540);
  - the nominee is significantly below it (5–95% from −$93,738 to −$9,108);
  - the smallest family-wise p is 0.958.

  It supports "no demonstrated advantage". It does not support "VG #2 is demonstrably better than every holder".
- **Correction:**
  - In `README.md:18`, `RECOMMENDATION.md:4–5` and `:168`, phrase the result as "no Phase B holder showed an advantage
    over VG #2"; add that the #14, #15 and #16 differences are inconclusive in either direction.
  - Add the B1/B5 hindsight caveat and the comparator-selection caveat.

### 9. `SEARCH_AND_COMPUTE.md:87` labels the test-window rank correlations "Out of sample"

- **Evidence:** the label covers F24's 0.57. The brief (§12) and PROTOCOL §15 forbid presenting 2025–2026 as untouched
  or out-of-sample validation.
- **Correction:** rename it "On the test windows (retrospective; 2025–2026 inspected before Phase B)".

### 10. `NEIGHBORHOOD_ROBUSTNESS.md` has slips and leaves required items out

- **Slips (shares from `test.json`):**
  - Line 62 says "G4-ILF's six". There are five G4-ILF holders (#7, #8, #11, #12, #17).
  - Line 72 says "95–100% for … the V and N pools" at 1.5r. The N-pool holders include #13 at 74.2% and #29/#21/#22 at
    93.8–94.5%.
  - Line 65 says "one neighbour in five". #9's breach rate is 12.8%.
- **Partly done.**
  - Per-book perturbations (`evidence.perBook`, 64 points per book) and "behaviourally relevant dimensions" are
    computed and sealed but reported nowhere. Brief §4 and PROTOCOL.md:470–471 require them.
  - This report also lacks the per-holder and per-control median, p10, p90 and minimum net, the profitable share and the
    worst DD (brief §4). Some are in `F24-tracks.md` and `diag-neighbourhood.md`. Run p90 net and worst DD
    (`evidence.decisive.nb.p90Net` and `.worstDd`) are not tabulated.
- **Correction:** fix the counts. Add a per-book table and a short "behaviourally relevant dimensions" paragraph from the
  sealed fields, and point to or extend the distribution tables.

### 11. EDV sparse-session and EWW/MTUM participation wording in `EXECUTION_RISK_AND_LIQUIDITY.md`

- **Evidence:**
  - **Line 87, "934 such sessions":** this sums sparse sessions over the 8 EDV holders' lots, and those lots overlap.
    `diag-participation.md` says lot counts "add over holders". The 62 distinct EDV lots hold 894. By entry year the 934
    split as 2022: 575 and 2023: 309.
  - **Phase A conflict:** Phase A (`DATA_AND_UNIVERSE_AUDIT.md:123`) says EDV was "thin until 2022, liquid since 2023",
    and `SEARCH_AND_COMPUTE.md:42–43` quotes it. The large 2023 sparse holdings are not reconciled with that statement.
  - **Line 186, "a third to a half of $100k":** in the G4-EWW holders the median feasible size at 10% participation is
    $46,467–$61,554 for EWW and $31,613–$78,964 for MTUM.
- **Correction:** say "934 holder-lot sessions (overlapping)", reconcile the 2023 count with Phase A, and give the actual
  ranges.

### 12. The runner was written during the test stage, and this is not disclosed

- **Evidence:**
  - `src/study9b-runners/` file birth times (UTC, `stat`): `configs.ts` 06:30:18, `resolve.ts` 06:31:10, `run.ts`
    06:31:47, `main.ts` 06:32:24, `tests/runners.test.ts` 06:32:42, `aliases.ts` 06:33:02, `README.md` 06:44:33.
  - That is during test-F19 (06:26:48–06:38:59Z) and test-F20. The test stage completed at 09:00:31Z.
  - Brief §10 ("Implement only after the selection records are sealed and the test stage is complete"), PROTOCOL §12
    ("after the test stage") and `RUN_COMMANDS.md:42` ("after the sealed F24 test") say otherwise.
  - Later runner work also overlapped the sealed diagnostics stage (09:01:35–09:10:26Z) and the preference stage:
    `research-configs` at 09:01:55Z, `pins.ts` at 09:02:43Z, `data.ts` at 09:03:50Z, `npm test` 09:03–09:05Z and the
    reconciliation 09:06–09:09Z.
  - The `data.ts` fix is recorded only in `RUN_COMMANDS.md:95`.
- **Exposure: none found.**
  - Selection was sealed at 06:09:03Z and the audit at 06:26:42Z.
  - The runner reads sealed records only and opens no door.
  - The earliest runner output folder is 09:09Z, and the research configurations were written at 09:01:55Z.
- **Correction:** add an `AMENDMENTS.md` entry (E5) disclosing the drafting time and the overlap, and correct the
  `RUN_COMMANDS.md` heading.

### 13. Amendment-log entries that do not match the files

- **E3 (`AMENDMENTS.md:91–92`)** says `BASELINES_AND_PARITY.md` was updated to state that the P1 stresses ran on one
  configuration per membership (21 rows). `BASELINES_AND_PARITY.md:25` still does not say so.
  - `parity.json` `P1.detail.rows` has 7 rows each for rate14, nextOpen and slip25, all on W24.
  - The frozen controls ran at 5 bps W24 only.
  - The pre-test audit raised the same note (`PRE_TEST_AUDIT.md:290`).
- **E4 (`AMENDMENTS.md:100–101`)** says "no other line changed". `git diff package.json` also adds a trailing comma to
  the existing `study9` line.
- **E4 (`AMENDMENTS.md:97`)** says "All sealed stages … were complete before any of these changes".
  - `RUN_COMMANDS.md:95–97` records `npm run study9b-run …` at 09:01:55Z and 09:06–09:09Z, before preference was sealed
    at 09:11:06Z. That requires the npm script in `package.json`.
  - `package.json`'s birth and modification times are 09:26:13Z and 09:26:32Z.
  - `tools/runner_edge_cases.sh` prints `$ npm run study9b-run -- …` but runs `node … src/study9b-runners/main.ts`
    directly (lines 11, 17–18).
  - Either the npm script was added while sealed stages were still running, or the recorded commands were direct `node`
    calls. Say which.
- **Cache sizes:**
  - `SEARCH_AND_COMPUTE.md:21` still says "14.8 GB". The manifest total is 15,928,085,660 bytes, which is 14.83 GiB or
    15.9 GB (pre-test audit note 5).
  - `RESEARCH_RECOVERY.md:44` says "35 point caches, 16 GB". There are 70 cache files (35 search, 35 qualification),
    16.79 GB, with two manifests.
- **Correction:** fix the four statements.

### 14. The runner acceptance evidence that will be sealed is incomplete, and the reconciliation scope is understated

- **The acceptance transcript lacks the evidence for two claims.**
  - `results/runner/edge-cases.txt` has no "not applicable" reconciliation label for the `default-end`, `cost-10` and
    `end-2024` cases.
  - It has no refusal reason for `unknown-member` and `empty-role`; only "exit 2" appears.
  - The cause: `tools/runner_edge_cases.sh:20` greps a case-sensitive `reconciliation`, but the runner prints
    `RECONCILIATION`.
  - The full logs show the labels and reasons: `evaluations/study9b-runs/edge-cases-20261103T093208Z/logs/cost-10.log:259`
    "RECONCILIATION: not applicable …", `unknown-member.log:1` and `empty-role.log:1`. Those logs are git-ignored.
  - The claims in `BASELINES_AND_PARITY.md:77–80` rest on them.
- **The reconciliation scope is wider than stated.**
  - Of the 1,854 reconciled lots, 116 (`vgt-primary` 21, `b5-frozen` 95) are reconciled against Study 7's sealed final
    door, not Phase B's F24 ledger: `reconcile-2026-10-29.txt` has 34 "totals and trade by trade" PASS blocks and
    2 "Study 7's sealed final door" PASS blocks.
  - The other 9 F24 controls are not runner-reconciled: frozen VG, VXR, VXRG, G-PA and Study 8 #3, #8, #12, #15, #25.
    TP2 reproduced their centres inside the test stage.
  - Brief §10 asks for reconciliation of "every role holder, control and lot".
- **The "best" aliases.**
  - `s9b-n3-edv-best` and `s9b-n2-edv-best` resolve to failed holders (#20, #22). They are labelled T FAIL, but brief §10
    says "avoid claiming one exists".
  - `RECOMMENDATION.md:25` calls the fallback to a failed holder "the frozen rule". PROTOCOL §8.4 nominates non-failed
    holders only.
- **VG #1's status is not explained.** Phase B's test families give VG #1 "ambiguous" (family 3 at 0.8984). Its Study 8
  sealed status is "pass" (share 0.9323), and `study9b-run -- list` shows "T PASS", Study 8's status.
- **Correction:**
  - Make the grep case-insensitive and include the refusal messages. Rerun the acceptance script into a new
    `evaluations/` folder and replace `edge-cases.txt`, or append the cited log lines.
  - State the reconciliation references and the controls not covered.
  - Relabel or refuse "-best" for tracks without a non-failed holder, and call the fallback a runner convention.
  - Add one sentence on VG #1's status difference.

### 15. Inherited open lots at the F24 boundary are not reported

- **Evidence:** brief §6 asks for inherited open lots and state carry-over at each test boundary. No report mentions
  them. `results/test/F24/test-lots.jsonl.gz` shows G4-ILF #7, #8 and #17 carrying an ILF lot entered 2024-12-19 09:31
  into 2025: exits 2025-02-26 (+$7,067), 2025-01-14 (−$365) and 2025-01-14 (−$365).
- **Correction:** add a short "inherited at 2025-01-02" table, and the equivalent for F19–F23 if any.

### 16. Minor presentation items

- `README.md:11–12`: "reports and the final audit are in `reviews/`". The reports are in the study root. "Every stage is
  sealed" should read "every research stage is sealed" (the report seal is pending).
- `CHRONOLOGICAL_VALIDATION.md:37` refers to "Hypothesis H1", which is Study 8's and undefined in Phase B's protocol.
  Line 120 defers the confirmation result to the checkpoint; state "IDENTICAL" there.
- `SEARCH_AND_COMPUTE.md:12`: no record or log in the study supports "per-job resident memory 1.3–1.9 GB".
- `SEARCH_AND_COMPUTE.md` does not describe the Pareto frontiers, population diversity or distinct-centre counts that
  brief §11 lists. Only island hypervolume is tabulated (`search-islands.md`). Add a sentence or mark them not
  reported.

## Verified and found correct (with the figures I recomputed)

### 1. Integrity

- **Chain:** `verify-chain` printed "chain OK: 18 entries; integrity OK (code 051bb8ed140a, engine f1f833a3177f,
  accepted by E3; canonical bytes after 2026-10-30: {})", at 09:39:06Z and again at 09:59:06Z.
- **Checkpoint hashes:** all 22 sha256 prefixes quoted in `RESEARCH_RECOVERY.md` match `sha256sum`. The chain entry
  hashes match its stage table.
- **Door order:** `doors.jsonl` has 114 lines.
  - The test doors opened once each, in order, on the expected roots and ends:
    - line 106 `test-F19`, end 2021-12-31, chain head 9 (`audit`);
    - line 107 `test-F20`, end 2022-12-30, head 10;
    - line 108 `test-F21`, end 2023-12-29, head 11;
    - line 109 `test-F23`, end 2024-12-31, head 12;
    - line 110 `test-F24`, canonical `data`, end 2026-10-29, head 13.
  - All of them followed `selection` (chain 7, 06:09:03Z) and `audit` (chain 9, 06:26:42Z).
  - Line 111 is the F24 confirmation (head 14). Line 112 is the slice (end 2026-10-30, head 15). Lines 113–114 are the
    post doors (end 2026-10-29).
- **Training cut-offs:** all 105 training and engineering doors read `data/vintages/study9-train-2024` with end and last
  date ≤ 2024-12-31 (7 pilot, 28 parity, 70 search/qualification). Each track × fold door opened twice: search at head 3,
  qualification at head 5.
- **Projection:** its files end on New York date 2024-12-31.
- **Seed namespace:** all 76 search, qualification, test and confirmation records record `namespace: study9-phase-b`.
- **F24 confirmation:** `confirm.json` equals `test.json` in every field except stage, at, seconds, lots path,
  confirmation and bodyHash. The two lot ledgers are byte-identical (sha256 `710368d75076484e…`).

### 2. Numbers (recomputed from the sealed JSON)

1. **The nominee, #2 G4-EWW profit** (independently reproduced by my own runner run, reconciliation PASS):
   - run net $291,397.07, minute DD $22,975.42, daily DD $18,805.96, 102 lots;
   - test net $31,530.13: 2025 $2,123.26, 2026 $29,406.87, 14 new lots;
   - test share 0.984375 (n 384), Wilson 0.9701, p90 DD $27,180;
   - test-window minute DD $22,188.49.
2. **VG #2:**
   - run $340,147.67, test $79,924.54 (2025 $47,239; 2026 $32,685), DD $21,303.61;
   - share 0.98177, equal to Study 8's sealed 0.98177; test median $72,081, p10 $59,741.
3. **The other controls:**
   - VG #1: $308,742 / $64,166 / DD $31,225 / 0.9427, ambiguous;
   - B1: $176,260 / $40,901, fails T5;
   - B5: $484,637 / $71,986 / 0.2682, fails T2 and T2b;
   - frozen VG: $278,266 / $70,420 / 0.6953.
4. **Every row of the `CHRONOLOGICAL_VALIDATION.md` F24 table matches `test.json`** (run and test net, 2025, 2026, new
   lots, run and test-window DD, share, median), including:
   - #1 $306,403 / $47,536 / 0.8047;
   - #14 $76,540 (2025 $75,993, 4 lots, DD $30,112);
   - #15 $67,039 / $19,172;
   - #16 $64,837 / $19,717.
5. **T gates:** T1, T2 and T3, and the status rule, recomputed for all 45 F24 rows (32 holders and 13 controls): 0
   mismatches with the sealed `gates`. yTest is 1.8175, giving test floors of 3 lots and 1 episode.
6. **Nomination:** 13 nominations (ranks 2, 3, 4, 5, 6, 8, 10 ambiguous, 12, 14, 15, 16, 23, 25). This is exactly
   `FROZEN_SELECTION.json` `rankedByFold.F24` filtered to non-failed holders, in the sealed order; the primary nominee is
   #2. F24 holders and frozen ranks are identical, 32 of 32.
7. **Confirmatory bootstrap:**
   - observed −$48,394.41 = $31,530.13 − $79,924.54;
   - p05 −$93,737.54, p50 −$47,428.67, p95 −$9,108.18;
   - share above zero 0.0206; verdict "no advantage".
8. **Family-wise test:** 32 comparisons; the smallest adjusted p is 0.9582 (#14, Δ −$3,384, SE $41,801). #15 p 0.9868,
   Δ −$12,886.
9. **Per-holder bootstraps for the nominee:**
   - vs VG #1: −$32,636 (−$85,350; +$16,565);
   - vs B1: −$9,371 (−$70,576; +$54,554);
   - vs B5: −$40,456 (−$86,011; +$1,683).
10. **Training economics under G4-EWW labels:** the nominee's median $33,461, p10 $28,587, robust $31,024, centre
    $34,484.7/yr, against VG #2's $29,493, $23,778, $26,635 and $34,532. The centre misses by $47.3/yr.
11. **Preference bands:**
    - 12 holders admitted, all preferred: #2–#6, #8, #12, #14, #15, #16, #23, #25.
    - #10 is diagnostic (min(0.9453, 0.9271)); no holder is conditional.
    - `economicallyCompelling` is empty.
    - Fill shares: #8 0.1278, #12 0.2717, nominee 0.0246 (5 of 203 fills); #12 KRE LOO −$32,557; #26 IWM LOO −$9,443.
12. **Folds:**
    - holders not failed 0/22, 0/24, 1/31, 6/29, 13/32 (the F21 survivor is #28 N2-SMH robust);
    - members with run DD ≥ $35k: 31, 21, 28, 0, 0;
    - median member test net $3,120, −$9,531, −$4,694, −$1,773, $16,662;
    - VG #2 on F19–F23: $132,702, $52,703, $63,209, $28,625;
    - Study 7-equivalent passes 0, 1, 3, 8, 30.
13. **Spearman, selection vs test centre:** F19–F24 0.083, 0.188, 0.443, −0.138, 0.574. F24 against the test median is
    0.652; the within-track range on F24 is −0.60 to +0.31.
14. **PBO on F24:** G4-ILF 0.862, G4-EWW 0.843, N3-EDV 0.920, N2-SMH 0.758, V3-IWM 0.699, N2-EDV 0.609, VG3-IWM 0.818.
    PBO > 0.5 in 20 of 35 track-folds.
15. **Search:**
    - 498,579 rung-1 configurations; 11,427,952 fresh points; 60.87 CPU-hours (per job 0.27–5.18);
    - T1 fired in G4-ILF-F24, N2-EDV-F20 and VG3-IWM-F21; 146 islands (144 stopped on budget, 2 on stagnation);
    - T2 fired in 21 of 35 jobs, T3 in none; 88 accepted refinements (0–10 per job); 35 shortlists of 6.
16. **Qualification:**
    - 180 of 210 members qualified;
    - failures: Q8 17, Q2b 9, infeasible 8, Q6 6, E1 6, Q2 2, E3 1;
    - qualification CPU 11,156 s (3.10 h);
    - controls (G4-EWW F24): VG #2 $26,635/yr, 98.4%, DD $17,281; VG #1 $29,172, 94.8%; B1 $8,194, fails Q6 and Q8;
      B5 $19,689, 27.1%.
17. **Neighbourhood table:** all 32 holder rows and 5 control rows of `NEIGHBORHOOD_ROBUSTNESS.md` §1 match `test.json`
    and the qualification records in every column. For example:
    - #1: 97.1 → 80.5%, Wilson 76.9%, p90 $38,376, families 80/80/81;
    - #2: 1.5r 87.5%, clipping 374/384, 9 coordinates near a bound;
    - VG #2: 98.2%, Wilson 96.7%, p90 $25,111.
18. **Funded-sequence diagnostics, nominee:** median kept share 0.1863, Jaccard 0.1038, 83 displaced, 82 added; the
    low-Jaccard median net is $289,869; `sequenceDependent` is false.
19. **Nominee complementarity:**
    - Shapley GDX $172,226, KRE $78,817, EWW $30,125, MTUM $10,230;
    - LOO GDX $170,089, KRE $77,792, EWW $41,050, MTUM $7,963;
    - the nine tabulated subsets match;
    - refusals KRE 24/64, EWW 6/25, GDX 6/44, MTUM 3/8 (39 in all).
    - VG #2 subsets: VGT $150,010 / $47,239; GDX $218,762 / $32,685 / DD $36,160.
20. **Stresses:**
    - all 8 × 9 cells of the `EXECUTION_RISK_AND_LIQUIDITY.md` §1 table match `deep.sensitivities`;
    - every holder's test net is below VG #2's under every one of the 11 sensitivities (0 exceptions);
    - T4 fails exactly #18, #19, #27 and #28;
    - arming sensitivities: nominee $283,336 / $283,977; VG #2 $331,731.
21. **Gap risk:**
    - nominee: 46 stops, 15 gapped (2 in the test window), $20,783.83 beyond the stop (KRE 7 / $10,736, EWW 3 / $6,011,
      GDX 5 / $4,038), worst $3,121;
    - #14: 14 / 7 / 0, $5,818; #15: 17 / 10 / 3, $18,127;
    - VG #2: 24 / 9 / 1, $13,505 (all GDX).
22. **Liquidity:**
    - per-ETF fill shares match the table (ILF 50.0–78.3% below $100k; EDV 35.7–71.4%; sparse-lot shares ILF 41.2%,
      EDV 95.3%, VGT 52.8%);
    - 0 missing fill bars in all 36 rows;
    - VGT sparse sessions are 78 in 2024 and 48 in 2025, recounted from `data/VGT/data.csv`.
23. **Risk and events:**
    - nominee: daily DD $18,806; five worst MAEs −$12,353 to −$6,975; largest lot loss −$10,094; longest losing
      streak 6 (VG #2: 2);
    - M2020 $68,095 (23.4% of run net; VG #2 $93,264, 27.4%);
    - ex-2020 $155,157 against VG #2's $230,062;
    - 2020 is the best year of all nine configurations shown;
    - nominee episodes: $22,975, $22,188, $17,902, $17,747, $15,891, with the stated attribution.
24. **Slice (2026-10-30):**
    - nominee −$4,276 (0 entered / 1 exited / 0 open; session DD $4,276);
    - VG #2 and VG #1 −$5,236 (0 / 0 / 1; $6,734); B5 −$5,173; B1 $0;
    - the run DD did not change for any of the 45 rows; `consistency.equal` is true for all.
25. **Test-door parity:** TP1 had 71, 77, 98, 92 and 109 comparisons with 0 differences; TP2 reproduced 13 of 13.
26. **Engineering parity (`parity.json`):**
    - P1: 348 comparisons, 0 differences; refusals 221–2,580 per membership; 114 same-minute decisions (G4-EWW 30,
      V3-IWM 48, VG3-IWM 30, N2-SMH 4, N3-EDV 2);
    - P3 61/61; S8C 159 files; RB 12 groups; N1 108 checks; G1 12 refusals;
    - A3 replay 1,459.4 s; A4 10 rows; D1 archives identical (`d41abf210dfa…`);
    - attempt 2 took 1,683.6 s.
27. **Runner reconciliation:**
    - `reconcile-2026-10-29.txt` has 36 PASS blocks; the lots compared sum to 1,854, each block with 0 mismatches;
    - `study9b-run -- list` exits 0 and shows membership, track, role, rank, config ID, T status and the research-only
      label;
    - the refusals and labels in the full edge-case logs are as claimed.
28. **`npm test`:** 943 tests, 932 pass, 7 fail, 4 skipped, 0 cancelled. The 7 failures are at the cited locations
    (6 ENOENT on `src/app/allin-original.ts`; `study7-runners/tests/runners.test.ts:148`).
29. **Wall time:**
    - the tests took 12.2, 15.4, 22.7, 26.9 and 38.0 min, and the confirmation 38.6 min;
    - search 00:31:39 → 05:48:42Z;
    - total ≈ 67.2 CPU-hours.

### 3. The three decisions

- **Mechanical nomination:** it follows the sealed training-only F24 order, restricted to non-failed holders.
- **User-preference assessment:**
  - it lists rows in mechanical order;
  - it applies the 95/93/90 bands to min(confirmation, test) as PROTOCOL §9.2 specifies;
  - it reorders nothing;
  - its `label` reads "descriptive assessment in the mechanical order; not an independently selected winner".
- **Deployment:** "RESEARCH ONLY — NOT DEPLOYED". No margin order is proposed.

### 4. Language

Apart from findings 8 and 9, 2025–2026 is consistently called "retrospective chronological persistence, not an
untouched holdout", and the slice "not a gate, not a holdout, not prospective". The whole-run comparisons are labelled
in-sample and descriptive, and the ex-post reading is labelled descriptive. The $35k ceiling is stated not to be a broker
stop (`EXECUTION_RISK_AND_LIQUIDITY.md:11–13`). The portfolio-context caveat is present (§6). The runner prints
RETROSPECTIVE and LATER LOCAL DATA labels.

### 5. Methodology

I found no departure from the frozen thresholds, seeds, door order, fold windows or role ranking in the records:
- RB, S8C and A1–A4 pass;
- the recomputed gates match;
- E1–E3 changed engineering checks and the seal path only;
- E4 changed reporting and tooling only.

E4 discloses the effect of `package.json` on Phase A's `verify-chain` (`AMENDMENTS.md:100–109`), apart from the timing
question in finding 13. The ILF/EDV "not realistically executable" conclusion is supported (ILF median feasible size
$4,381–$13,824; EDV $7,189–$18,488).

### 6. Repository hygiene

- `git status --short` is identical to the session start: 16 entries.
- `config/market-events/distributions.csv` and `distributions.manifest.json` have mtime 2026-10-30T18:44:26Z, before
  Phase B.
- The seven `._.DS_Store` files have mtimes 2026-11-02 08:26–21:08Z, before the branch was created at 22:09Z.
- `package.json` differs from HEAD only by the two script lines and one trailing comma.
- `git worktree list` shows only the main checkout.
- Outside the Phase B paths, the only files modified after 2026-11-02T22:06Z are `package.json` and files that the
  inherited `npm test` rewrote at 09:03:38–09:03:49Z: git-ignored `src/four-family/generated/*` and two tracked
  `research/vgt-minute-optimizer/tmp/test-variants/*.ts`, which are byte-identical to HEAD (no `git diff`).
- The reports contain no secrets and no personal paths other than the repository root. The inherited test output
  contains `/tmp` scratch paths.
