# RESEARCH_RECOVERY — Priority 4: staged trailing stops (S1), GPU implementation and paired optimization

## Top screen

- **Updated:** 2026-11-23T13:27Z (clock). **Status: INCOMPLETE — E0–E2 done; GPU Phase 8 acceptance campaign attempt 2 RUNNING
  (unit `p8chain-final`, started 13:02:15Z at `54261ea0`, log `research/gpu-phase8/results/logs/final-chain.txt`;
  attempt 1 failed at the negative suite, Phase 8 amendment E1). Priority 4 study code written and tested (not frozen).**
- **Brief:** `brief/BRIEF.md` (verbatim copy of the user's upload), sha256
  `720e0b36e815b111a5deac41c7454bd497224dd78c10adaa01fa8017d78998ae`, 295 lines / 30,788 bytes; final line
  "**PRIORITY 4 COMPLETE — NO STRATEGY ADOPTED OR DEPLOYED — AWAITING REVIEW**" present (not truncated).
- **Authorized:** E0–E5 engineering, ablations, paired CTRL/EXP search, informed lanes, qualification, chronological
  checks, reports, ZIP, commit and push of the research branch. **Not authorized:** adoption, merging into `main`,
  deployment, broker access, editing frozen New L0 / N/original research.
- **Running processes:** `research/gpu-phase8/chains/final.sh` in systemd user unit `p8chain-final` (slice
  `gpup8.slice`); check `systemctl --user is-active p8chain-final` and the log tail; a harness watcher waits for
  "chain final complete|FAILED". Do NOT launch another GPU job while it runs. Do NOT edit
  `src/vg-l0-staged-stop/{search,space,context,derive}.ts`, `src/gpu-phase8/`, the CPU closure or `src/gpu-backend/`
  while it runs (the p4/sb jobs import them). Do NOT commit `research/gpu-phase8/results/` mid-campaign. Keep the tree
  otherwise clean (campaign-verify audits `git status` outside research/gpu-phase8/).
- **Priority 4 code (committed, not frozen):** `src/vg-l0-staged-stop/{budget,qualify,select,stats,stages,main}.ts`,
  tests `tests/study.test.ts` (18 pass) + `tests/space.test.ts`; tools `tools/vg-l0-staged-stop/{common,bench}.ts`,
  `engineering.sh`, `launch.sh`; chain `research/vg-l0-staged-stop/chains/fold.sh`; DRAFT `PROTOCOL.md` (§6 budget
  numbers to fill from the E5 benchmark), `STANDARD_ADOPTION.json` (preflight blocked only by the stale record).
- **Next steps (in order):** (1) campaign completes → commit `research/gpu-phase8/results`; (2) run
  `research/gpu-phase8/chains/tests.sh` (E7–E10; integrity dry run 5/5 PASS with amendment E2) → `tools/gpu-phase8/accept.ts`
  → commit record → out-of-band pin → `results/tests/record-in-force-after.txt` (policy, enforcement, preflight tests and
  every study preflight PASS); (3) `REC=<sha> tools/vg-l0-staged-stop/launch.sh vgl0ss-eng <log> -- /bin/bash
  tools/vg-l0-staged-stop/engineering.sh`; (4) fill PROTOCOL §6 from `E5/bench.json`, re-record the adoption, commit,
  `npm run vg-l0ss -- gates`, commit, `npm run vg-l0ss -- freeze`, commit; (5) `CUT=ABLATE`, then `CUT=C19|C21|C24`
  `research/vg-l0-staged-stop/chains/fold.sh` in launch units; (6) analysis, reports, ZIP, push.

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
| E3/E4 Phase 8 acceptance campaign | running | `research/gpu-phase8/` (PROTOCOL.md frozen; preflight PASS); chain `chains/final.sh` (B1, E3, E4, A1 parity ≈155,600 random genomes, A2, R1–R3, A3 incl. Stage B lanes sb-C19/C21/C24, A4 incl. p4 mini set, Q1, A5, A6); then `chains/tests.sh`, `tools/gpu-phase8/accept.ts` |
| E3 parity campaign | not started | — |
| E4 acceptance + regression | not started | — |
| E5 benchmark + protocol freeze | not started | — |
| Ablations | not started | — |
| Paired search C19/C21/C24 + informed | not started | — |
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
