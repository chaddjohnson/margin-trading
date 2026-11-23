# RESEARCH_RECOVERY — Priority 4: staged trailing stops (S1), GPU implementation and paired optimization

## Top screen

- **Updated:** 2026-11-23T19:58Z (clock). **Status: INCOMPLETE — E0–E5 sealed (`results/engineering/gates.json` sha256
  `c38cacbe…`, commit `234f05c9`); PROTOCOL P4-S1 1.0.0 FROZEN 18:17:12Z (`results/protocol-freeze.json` sha256
  `ea75d7ed…`, protocol sha256 `bd57ea2a476be9735e3f199749e511d184f247b9c903dd5853e847899de8b6f7`, code digest
  `431493de…`, acceptance `c02a8a92…`; commit `5ff3bc0a`). Stage A COMPLETE (`11a12b26`, A0 PASS); fold C19 COMPLETE 18:18–18:58Z (`d57146c3` … `142a1a4f`); fold C21 COMPLETE 18:58:53–19:54:41Z (`e26011bd` … `63d49e9c`); fold C24 (with informed lanes, decomposition and the single FULL validation) is next (outer unit `vgl0ss-fold-C24`, log `results/logs/fold-C24.txt`). Earlier Stage A units:
  `vgl0ss-fold-ABLATE` (log `results/logs/fold-ABLATE.txt`), inner unit `vgl0ss-ablation` (log `results/logs/ablation.log`),
  started 18:17:27Z.** GPU Phase 8 ACCEPTED (record sha256 `c02a8a928946b5acc4df61a7fceb3e5656bf6d12ee33749d615edc7c54fad126`,
  verified and pinned out of band).
- **Brief:** `brief/BRIEF.md` (verbatim copy of the user's upload), sha256
  `720e0b36e815b111a5deac41c7454bd497224dd78c10adaa01fa8017d78998ae`, 295 lines / 30,788 bytes; final line
  "**PRIORITY 4 COMPLETE — NO STRATEGY ADOPTED OR DEPLOYED — AWAITING REVIEW**" present (not truncated).
- **Authorized:** E0–E5 engineering, ablations, paired CTRL/EXP search, informed lanes, qualification, chronological
  checks, reports, ZIP, commit and push of the research branch. **Not authorized:** adoption, merging into `main`,
  deployment, broker access, editing frozen New L0 / N/original research.
- **Running processes:** `research/vg-l0-staged-stop/chains/fold.sh` (CUT=C24) in unit `vgl0ss-fold-C24` once launched; it runs
  each official stage as its own unit (`vgl0ss-<step>`) and commits each sealed block itself (only `results/`). Check
  `systemctl --user is-active vgl0ss-fold-C24` and the log for "FOLD C24 COMPLETE" / "FAILED". Do NOT launch another
  GPU job, edit any pinned file (the chain, tools, docs, code) or commit while a chain runs (index lock).
- **Priority 4 code (committed, not frozen):** `src/vg-l0-staged-stop/{budget,qualify,select,stats,stages,main}.ts`,
  tests `tests/study.test.ts` (18 pass) + `tests/space.test.ts`; tools `tools/vg-l0-staged-stop/{common,bench}.ts`,
  `engineering.sh`, `launch.sh`; chain `research/vg-l0-staged-stop/chains/fold.sh`; DRAFT `PROTOCOL.md` (§6 budget
  numbers to fill from the E5 benchmark), `STANDARD_ADOPTION.json` (preflight blocked only by the stale record).
- **Next steps (in order):** (5) Stage A, C19 and C21 complete; fold C24 (run from the repository root):
  `tools/vg-l0-staged-stop/launch.sh vgl0ss-fold-C24 /home/chad/projects/margin-trading/research/vg-l0-staged-stop/results/logs/fold-C24.txt -- /usr/bin/env CUT=C24 /bin/bash research/vg-l0-staged-stop/chains/fold.sh`
  (search, gate-r, extend, informed, qualify, select, decompose, freeze-selection, authorize-full, validate, outcome); resume after a failure with `START=<step>` (+ `RESUME=1` for an interrupted job), never
  rerunning a sealed stage; (6) report-only analyses (RUN_COMMANDS.md §4: `analyze`, `pairs`, `diagnose`), reports
  (REPORT, IMPLEMENTATION_VERIFICATION §5, ablation, search, risk, final comparison, DECISION_REGISTER, READ_FIRST),
  regression, ZIP with SHA256SUMS (+ copy to `~/.local/share/margin-trading-gpu/handoffs/`), final checkpoint, push
  (unsandboxed; verify `git ls-remote origin research/vg-l0-staged-trailing-stop`).

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
| Fold C21 (primary) | complete 18:58:53–19:54:41Z | search 2,600,440 requested (`e26011bd`); gate R identical 32/32 (`53d9da91`); extension TRIGGERED (EXP 34/64 = 53.1 %, CTRL 4/64) 1,303,677 requested, after it EXP 31/64 = 48.4 % still budget-bound (all GB0.VD1 but R5), CTRL 0 (`f0fcea6d`); qualification 499,656 (`740a9645`); selection (`a1c189dc`): D̄ $6,684 [L90 $3,809, U90 $9,605], not material (mean < $10k); mechanism confirmed (52/64 = 81 % ON, advantage $10,655, L90 $7,032); risk non-inferior on all five (principalLossLiq +$887, L90 $376; bankedDdLiq +$871, L90 $114); pooled P0: CTRL R34#1 $236,003 / DD $28,004, EXP R24#1 D1:GDX A 47.0 % τ₂ 6.4 % $252,819 / DD $17,744; interval D24 48,230 (`63d49e9c`). Records sha256 (first 16): search `735b7112…`, gate-r `2ca1a225…`, extend `fac36c51…`, qualification `2d18e555…`, selection `5d35a12e…`, intervals `70c09d58…` |
| Fold C24 (primary) + informed | not started | — |
| Qualification / selection / intervals / validation | not started | — |
| Reports, ZIP, push | not started | — |

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
