# RESEARCH_RECOVERY — Priority 4: staged trailing stops (S1), GPU implementation and paired optimization

## Top screen

- **Updated:** 2026-11-23T21:58Z (clock). **Status: INCOMPLETE — every official stage COMPLETE and sealed; reports and
  regression COMPLETE; ZIP and push remain.** E0–E5 sealed (`results/engineering/gates.json` sha256 `c38cacbe…`, commit
  `234f05c9`); PROTOCOL P4-S1 1.0.0 FROZEN 18:17:12Z (`results/protocol-freeze.json` sha256 `ea75d7ed…`, protocol sha256
  `bd57ea2a476be9735e3f199749e511d184f247b9c903dd5853e847899de8b6f7`, code digest `431493de…`, acceptance `c02a8a92…`;
  commit `5ff3bc0a`). Stage A COMPLETE (`11a12b26`, A0 PASS); fold C19 COMPLETE (`d57146c3` … `142a1a4f`); fold C21
  COMPLETE (`e26011bd` … `63d49e9c`); fold C24 COMPLETE 19:56:32–21:30:31Z (`d52157d2` … `490325a3`: search, gate R
  IDENTICAL, extension, informed I1–I4, qualification, selection, decomposition D24, FROZEN_SELECTION `4210775b…`, FULL
  authorization, validation on FULL once, outcome). **Sealed outcome (`results/outcome.json` sha256 `949756c9…`): label
  INCONCLUSIVE — more than 25 % of an arm's lanes budget-bound after the extension block (EXP C21 48.4 %, C24 48.4 %);
  never to be changed.** 26/26 seals verify (21:33Z). GPU Phase 8 ACCEPTED (record sha256
  `c02a8a928946b5acc4df61a7fceb3e5656bf6d12ee33749d615edc7c54fad126`, verified and pinned out of band).
- **Brief:** `brief/BRIEF.md` (verbatim copy of the user's upload), sha256
  `720e0b36e815b111a5deac41c7454bd497224dd78c10adaa01fa8017d78998ae`, 295 lines / 30,788 bytes; final line
  "**PRIORITY 4 COMPLETE — NO STRATEGY ADOPTED OR DEPLOYED — AWAITING REVIEW**" present (not truncated).
- **Authorized:** E0–E5 engineering, ablations, paired CTRL/EXP search, informed lanes, qualification, chronological
  checks, reports, ZIP, commit and push of the research branch. **Not authorized:** adoption, merging into `main`,
  deployment, broker access, editing frozen New L0 / N/original research.
- **Running processes:** none (fold C24's unit `vgl0ss-fold-C24` inactive since 21:30:31Z; post.sh finished 21:32:11Z).
  No further official GPU stage is authorized or planned.
- **Priority 4 code (committed, not frozen):** `src/vg-l0-staged-stop/{budget,qualify,select,stats,stages,main}.ts`,
  tests `tests/study.test.ts` (18 pass) + `tests/space.test.ts`; tools `tools/vg-l0-staged-stop/{common,bench}.ts`,
  `engineering.sh`, `launch.sh`; chain `research/vg-l0-staged-stop/chains/fold.sh`; DRAFT `PROTOCOL.md` (§6 budget
  numbers to fill from the E5 benchmark), `STANDARD_ADOPTION.json` (preflight blocked only by the stale record).
- **Post-freeze report-only work:** `post.sh` ran 21:31:36–21:32:11Z (log `reports/diagnostics/post.log`): analyze
  tables, `pairs`/`diagnose` selection C24 (D24) and decomposition (D24, FULL), mechanism tables, lots C24 FULL (CPU =
  sealed GPU whole-run net and DD 24/24; re-run 21:40Z after de-duplicating role names), tails (re-run after naming the
  benchmarks by their benchmark origin), census. Tools `tools/vg-l0-staged-stop/{lots,tails,census}.ts`, `post.sh`,
  `bundle.sh`. Committed in the "post-fold diagnostics" commit after this update.
- **Key C24 facts (sealed; for the reports):** primary D̄ C24 +$8,761 [L90 $4,059, U90 $13,475] not material; risk
  non-inferior (none clearly worse); mechanism confirmed (45/64 ON, advantage +$7,174, L90 $4,654); EXP 64.1 % budget-bound
  → extension → 48.4 % still. Validation 2025-01-02…2026-10-30 (FULL, once): CTRL primary +$55,308 (DD $25,430); EXP
  primary +$60,162 (DD $20,373) vs its all-OFF projection +$75,051 (S1 cost −$14,889 on validation); New L0 +$96,884,
  N/original +$94,670; informed EXP primaries I1 +$102,353, I2 +$82,820, I3 +$98,298, I4 = OFF +$94,670. ON reps vs own
  all-OFF on validation: mean −$1,398 (17+/20=/8−). T3 C24 −$5,156 [−$10,505, +$101]. Chronological check: not passed for
  either arm. Ledger 14,307,206 / 25,000,000 (+ decomposition 9,156).
- **Reports (written):** `REPORT.md` (executive), `DECISION_REGISTER.md`, `READ_FIRST.md`, `reports/FINAL_COMPARISON.md`,
  `reports/SEARCH_REPORT.md` (§1–§5), `reports/RISK_REPORT.md`, `reports/ABLATION_REPORT.md`,
  `reports/IMPLEMENTATION_VERIFICATION.md` (§1–§7), `reports/REPRODUCIBILITY.md`; tables incl. `abc-decomposition.md`,
  `annual-train-validate.md`; tools `annual.ts`, `abc.ts`. Recommendation: S1 OFF; no Priority 5 successor; incumbents preserved.
- **Regression (21:49–21:55Z):** npm test 1,875 / 1,862 pass / 9 fail (7 known + 2 declared P5A) / 4 skipped; research
  preflight PASS; verify-acceptance VERIFIED; logs `reports/diagnostics/regression/`. Job archives hashed
  (`reports/diagnostics/job-archives.sha256`, 18 files ≈ 66 GB).
- **Next steps (in order):** (1) commit the reports; (2) `tools/vg-l0-staged-stop/bundle.sh /tmp/claude-1000/vgl0ss-bundle`
  (trial build OK: 690 files, checksums OK); copy the ZIP to `research/vg-l0-staged-stop/bundle/` (committed, the
  repository convention) and to `~/.local/share/margin-trading-gpu/handoffs/` (+ `.sha256`); (3) final checkpoint COMPLETE,
  commit, push unsandboxed (`git push origin research/vg-l0-staged-trailing-stop`), verify with `git ls-remote`.

## Environment

- Main checkout (no extra worktree). Branch `research/vg-l0-staged-trailing-stop`, created 2026-11-23T11:49Z from
  `research/vg-l0-trailing-stop-audit` `5d587bb28860967327a9f1b1263154b26f144e8c` (clean). `main` = `3606f4b3`.
- Node 24.21.0 (`.node-version`); every evaluating process `node --no-maglev`.
- GPU: RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, 763 MiB used at start.
- Acceptance in force at start: `config/gpu-backend/acceptance.json` sha256
  `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED, binary gb7 `cb2ff30b…`).
  It becomes STALE at the first edit of an evaluation-manifest file (expected; a new acceptance study is required).

## Planned namespaces

- Study: `research/vg-l0-staged-stop/` (protocol, amendments, adoption, seals, reports) with code in
  `src/vg-l0-staged-stop/` and non-official tools in `tools/vg-l0-staged-stop/`.
- Acceptance study for the staged-stop GPU delivery: `research/gpu-phase8/` (tools in `tools/gpu-phase8/`).
- CPU rule modules: `src/staged-stop/`, `src/d1-risk-controls-rc3/`, Growth 1.5.0 in `src/growth-trading/`.

## Stage table

| Stage | Status | Output |
|---|---|---|
| E0 read + spec freeze | complete 2026-11-23T12:00Z | `RULE_SPECIFICATION.md` (commit `3aa51963`; later wording-only edits none) |
| E1 CPU reference + OFF parity | complete (CPU side) 2026-11-23 | Growth 1.4.0 baseline fixture `62574e98` (captured on the unedited engine, sha256 `f7b50992…`); `src/staged-stop/`, `src/d1-risk-controls-rc3/`, Growth engine revision 1.5.0 (`riseTrading.ts`, `optionalRules.ts`), `books.ts` pass-through. Tests: config 12/12, RC 3 book 13/13, Growth staged 7/7, Growth OFF parity 9/9 (fixture), pooled D24 3/3 (New L0 $382,721.46 / $19,459.83 and N/original $388,031.02 / $19,459.83 reproduced), existing D1/RC/Growth/pool suites 420/420 |
| E2 CUDA port | complete 2026-11-23 (dev binary) | protocol v3 (`gb.h` 144/344/1080/104/656 bytes, bits 36/37), `gb_common.cuh` Staged rule, `gb_d1.cuh`/`gb_growth.cuh` hooks; host `encode/batch/lab/layout/domain/official/compat/toolchain`; entrypoint `gpu-phase8`. Dev checks: staged smoke 64/64 (D24), 112/112 (D21); T fixtures 6×20 identical (threshold arms at = and not one ulp below); mixed staged S3 456, D19 edges 361, book-disabling option sets 5×233 identical; Stage B lane C19/GA0.VA0/R3 replayed by the derived lane = sealed (0 differences); staged mini GPU = CPU (6,869 archived). The staged Growth runner lives in `src/d1-risk-controls-rc3/growth.ts` (a copy of Priority 3's runGrowthBook: `src/vg-d1-growth-joint/` is a frozen legacy-runner directory, its `books.ts` edit was reverted) |
| E3/E4 Phase 8 acceptance campaign | complete 13:02:15Z → 17:38:36Z (`aac6c0e1`); tests chain 17:40–17:52Z (`8c464ac6`); record ACCEPTED 18:03Z (`0d61e71b`, sha256 `c02a8a92…`), verified + pinned (`ec1aa238`) | `research/gpu-phase8/` (PROTOCOL.md frozen; preflight PASS); chain `chains/final.sh` (B1, E3, E4, A1 parity ≈155,600 random genomes, A2, R1–R3, A3 incl. Stage B lanes sb-C19/C21/C24, A4 incl. p4 mini set, Q1, A5, A6); then `chains/tests.sh`, `tools/gpu-phase8/accept.ts` |
| E3 parity campaign | complete | A1 63 runs / 159,240 subjects / 0 mismatches (155,600 random genomes); staged mini GPU = CPU; Q1; sanitizer; sustained |
| E4 acceptance + regression | record done; P4 E4 evidence running | npm test 1,875 / 1,859 pass / 12 fail = 7 known + 3 record-in-force (pass after the record) + 2 declared consequences (Priority 5A byte pin; Phase 8 E3); Strategy Lab 314 Vitest, 81/81 e2e; portfolio parity; integrity 5/5 |
| E4 (P4 evidence) | complete 18:04–18:06Z | `results/engineering/E4/` verify-acceptance VERIFIED; runtime refusals; official gate open D19/D21/D24 |
| E5 benchmark + protocol freeze | complete 18:06–18:17Z | `E5/bench.json` (125,108 requested, 539 s, 232/s at 8 lanes); gates sealed `234f05c9`; protocol frozen `5ff3bc0a` |
| Ablations | complete 18:17:25–18:17:45Z (`11a12b26`) | `results/ablation/`: 146 subjects × 4 frictions = 584 GPU evaluations; A0 PASS (incumbents OFF = sealed figures) |
| Fold C19 (secondary) | complete 18:18:01–18:58:22Z | search 2,456,999 requested / 1,118 s (`d57146c3`); gate R identical (`ddacfd64`); extension TRIGGERED (EXP 32/64 = 50 % budget-bound, all GB0.VD1; CTRL 2) 1,182,219 requested, EXP GB0.VD1 still 32/32 budget-bound (`918a2fd1`); qualification 469,572 (`486fc5a0`); selection (`7e231a96`): D̄ $2,340 [L90 $560, U90 $4,168], not material; mechanism confirmed (78 % ON, advantage $8,411, L90 $6,089); risk non-inferior; interval D21 47,700 (`142a1a4f`) |
| Fold C21 (primary) | complete 18:58:53–19:54:41Z | search 2,600,440 requested (`e26011bd`); gate R identical 32/32 (`53d9da91`); extension TRIGGERED (EXP 34/64 = 53.1 %, CTRL 4/64) 1,303,677 requested, after it EXP 31/64 = 48.4 % still budget-bound (all GB0.VD1 but R5), CTRL 0 (`f0fcea6d`); qualification 499,656 (`740a9645`); selection (`a1c189dc`): D̄ $6,684 [L90 $3,809, U90 $9,605], not material (mean < $10k); mechanism confirmed (52/64 = 81 % ON, advantage $10,655, L90 $7,032); risk non-inferior on all five (principalLossLiq +$887, L90 $376; bankedDdLiq +$871, L90 $114); pooled P0: CTRL R34#1 $236,003 / DD $28,004, EXP R24#1 D1:GDX A 47.0 % τ₂ 6.4 % $252,819 / DD $17,744; interval D23 (2022–2023) 48,230 (`63d49e9c`). Records sha256 (first 16): search `735b7112…`, gate-r `2ca1a225…`, extend `fac36c51…`, qualification `2d18e555…`, selection `5d35a12e…`, intervals `70c09d58…` |
| Fold C24 (primary) + informed | complete 19:56:32–21:30:31Z | search 2,029,277 requested (`d52157d2`, sha `dff693ef…`); gate R identical 32/32 (`1d5e04a2`); extension TRIGGERED (EXP 41/64 = 64.1 %, CTRL 8/64) 1,219,867 requested, after it EXP 31/64 = 48.4 % still budget-bound, CTRL 0 (`743027f0`, `c69d6695…`); informed I1–I4 1,588,312 requested, every lane "triggers not met" (`6e53f91e`, `85097475…`); qualification 808,998 (1,237 members; `aa115493`, `643fd676…`); selection (`1eefbf18`, `52660d03…`): D̄ $8,761 [L90 $4,059, U90 $13,475] not material; mechanism confirmed (45/64 ON, $7,174, L90 $4,654); risk non-inferior; pooled P0 CTRL R29#1 $241,225 / DD $23,468, EXP R4#1 GDX+VGT $238,352 / DD $26,301 (all-OFF $232,478); decomposition D24 9,156 (`fbc52ddd`, `eb1e5dc8…`) |
| Freeze, FULL validation, outcome | complete 21:28:46–21:30:31Z | FROZEN_SELECTION (`9184d683`, `4210775b…`); FULL authorization (`1556eefa`, `8baa3540…`); validation 2025-01-02…2026-10-30 on FULL once, 51,675 requested (`498ef801`, `284dc1d5…`); outcome (`490325a3`, `949756c9…`): **inconclusive (budget)** |
| Report-only post-fold analyses | complete 21:31:36–21:32:11Z | `tools/vg-l0-staged-stop/post.sh` → `reports/diagnostics/`, `reports/tables/` (log `reports/diagnostics/post.log`) |
| Reports, regression | complete 21:33–21:58Z | reports listed in the top screen; regression logs `reports/diagnostics/regression/` |
| ZIP, push | running | see Next steps |

## Guards

- Do not edit any completed study's files (`research/vg-l0-full-joint/`, Stage B, audit, …).
- Do not open FULL or any next-interval door before the corresponding sealed, committed selection.
- No official evaluation before a new ACCEPTED acceptance record and a frozen, committed protocol.

## Disclosures (for the final report)

- 2026-11-23T12:20–12:21Z: the development smoke tool `tools/gpu-phase8/smoke-staged.ts` first opened D24 and D21
  through Priority 3's logging `openDoor`, appending two lines to the completed study's
  `research/vg-d1-growth-joint/results/doors.jsonl`. Detected at 12:4xZ, restored with `git checkout` (only those two
  lines differed; never committed); the tool now uses `src/gpu-phase8/context.ts openDoor` (Phase 8's own log).

- 2026-11-23T12:40Z: an engineering check of the staged mini-optimization (job `dev-p4-gpu`, Phase 8 mini schedule, 4 lanes
  on D19 = the C19 training door) printed the mini lanes' shortlist centre nets and staged settings to the terminal. This
  is engineering output of a non-study schedule, viewed after the E0 freeze of the rule and domains and before the
  protocol freeze; no protocol choice depends on it. Engineering checks print equality/coverage only from here on.

- 2026-11-23T13:30Z: a smoke test of the report-only CPU diagnostic tool (`tools/vg-l0-staged-stop/diagnose.ts`, door D19
  opened with use `engineering`, logged in `results/doors.jsonl`) printed one comparison: New L0 versus New L0 with all
  three books staged at A 30 % and τ₂ = round(0.5 τ₁), on D19 (the C19 training door): Δ net −$14,482, Δ marked DD
  +$5,385, 2 staged exits, 1 forfeited trend, 4 newly funded / 1 no longer funded lot. Engineering output of a tool
  test, viewed before the protocol freeze; the rule, domains, search spaces and decision criteria were frozen earlier
  (E0) or are written independently of it; no protocol choice depends on it. It is one of the ablation's predeclared
  points (on D19 instead of D24).

- GPU Phase 8 (the acceptance study for this delivery) read every door including FULL (2016–2026-10-30) for CPU/GPU
  equality (A1 parity, the T fixtures, R1–R3, the sustained run) and the repository's npm test reads whole data files.
  These are engineering equality/regression checks required by standard 3.0.0 §9 before any official evaluation; their
  outputs are equality counts and pass/fail. They are not study evaluations, never opened a study door through
  `src/vg-l0-staged-stop/doors.ts`, and no staged/CTRL comparison on FULL or on an interval was viewed.
- npm test at HEAD has two failures of the completed Priority 5A study (`src/vg-growth-funding-lifecycle/tests/parity.test.ts`:
  its byte pin of `riseTrading.ts` v1.4.0 and the line-range diff against it) — a consequence by construction of the
  declared Growth engine revision 1.5.0. Not relaxed; verified at its own commit (Phase 8 amendment E3: base pin and
  orchestrator diff hold at `5d587bb2`; its D24 behavioural test and the 1.5.0 OFF-parity fixture pass at HEAD). A merge
  into `main` would inherit the two failures: a review decision (follow-up).
- GPU Phase 8 incidents: the acceptance generator had two copy defects found by its first dry run (E4: negative and
  tamper rerun on the final pinned files); one acceptance attempt failed on a timing-dependent positive control of the
  Maglev probe and passed on an unchanged rerun (E5).
