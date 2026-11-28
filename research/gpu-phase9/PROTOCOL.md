# GPU Phase 9 — acceptance renewal for the research-date-boundaries integration (acceptance protocol)

- **Brief:** `brief/BRIEF.md`: the user's "Assignment 2 of 2 — Final Integration, GPU Re-acceptance, and Strategy Lab
  Service", verbatim, 409 lines, sha256 `a674ced6cab508f80791f6d1c900d66c9b7e2623a84c4c93321c9232f3669e30`. Its §1.5 and
  §7.2 authorize this official GPU re-acceptance, including the small fixed-seed engineering mini-optimization, and
  supersede Assignment 1's prohibition of that exercise.
- **Standard:** 5.0.0 (`docs/research/OPTIMIZATION_STANDARD.md`, sha256
  `68487de7b67cd9ccbf70478f51d12f5ef19287d6fa34a737c69f4b49b277eeaf`), scope **diagnostic** (engineering acceptance;
  `STANDARD_ADOPTION.json`), research date range R1 (`config/research/date-ranges.json`, sha256 `818be325…`).
- **Checklist:** `docs/gpu/PARITY_CHECKLIST.md` **§2**, a full cycle, because files of the evaluation manifest changed.
- **Namespace.** `gpu-phase9`. `gpu-phase8` is the staged-stop branch's acceptance study, which this integration excludes
  (`docs/data-updates/2026-11-27-assignment-2/STAGED_STOP_DISPOSITION.md`).
- **What this is not.** It is not an optimization study:
  - nothing is searched for selection, ranked for a decision, qualified or selected;
  - no trading rule, fitness, parameter, search space, candidate selection, CUDA source, numerical precision or build flag
    changes;
  - no post-validation data is read: every door ends at or before 2026-10-30, and FULL is the verified byte prefix;
  - nothing of the risk-envelope pilot or any other research runs;
  - nothing produced here is promoted or fed into a research selection.

## 1. Baseline (verified 2026-11-27T22:40Z)

| Item | Value |
|---|---|
| Candidate branch | `integration/research-date-boundaries-a2` from `feature/research-date-boundaries` `f2c414ef` (= `main` `3606f4b3` + the GPU Phase 7 lineage + the research-date-boundaries work); worktree `/home/chad/.local/share/margin-trading-worktrees/a2-integration` (the main checkout serves the user's live Strategy Lab and is not switched) |
| Integrated before the campaign | `efd7454b` merge of `fix/tsla-outcome-identity-join` (no evaluation file); `00e1425c` the renamed-path fix of the six legacy tests (no evaluation file; the entrypoint registry's two legacy digests) |
| Record in force | `config/gpu-backend/acceptance.json` (study gpu-phase7), sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`; out-of-band copy `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json`. **STALE on the candidate** (the evaluation and enforcement files below) |
| Binary in force | `research/gpu-phase7/build/gb7` `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82` (kernels = gb5); its evaluation digest `d1a2e490…`; the candidate's `1a007e8c…` before this study's toolchain change |
| Device / runtime | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, CUDA 13.2 (user-space toolkit), Node v24.21.0, `--no-maglev` |
| Data | VGT `data/VGT/data.csv` 53,976,698 B (`dfde0f77…`), GDX 80,741,665 B (`aa23522d…`), both through 2026-11-25; R1 prefixes through 2026-10-30: VGT 53,395,054 B `2ee06310…`, GDX 80,036,100 B `77dba9b2…` (= the data of Phase 7's FULL export `6e977ccd…`) |
| Tests at the base | `npm test` 1,909 tests, 1,896 pass, 9 fail (the six lowercase `allin-original.ts`, the three record-in-force tests), 4 skipped |

## 2. The change and its classification

Against the record in force (Phase 7):

1. **CPU closure (the research-date-boundaries work, already on the lineage):**
   - changed: `src/lib/csv.ts`, `src/lib/evaluation.ts`, `src/vg-d1-growth-joint/context.ts`,
     `src/vg-d1-growth-joint/data.ts`;
   - new in the closure: `src/lib/canonicalPrefix.ts`, `src/lib/researchRanges.ts`.

   The FULL door reads a verified byte prefix of the appended canonical files, and the loaders take `pin` / `maxBytes`
   bounds. Trading rules, fills, costs and the engines are unchanged.
2. **Host group:** `src/gpu-backend/toolchain.ts` only. This study's binary `research/gpu-phase9/build/gb9` becomes the
   default.
3. **CUDA sources:** unchanged. The binary differs from gb7 only by the compiled evaluation digest (gate B1 proves the
   device code and the SASS byte-identical).
4. **Enforcement group:**
   - `src/research-standard/preflight.ts` (standards 4.0.0 and 5.0.0);
   - `config/gpu-backend/entrypoints.json` (the legacy digests of `minute-optimizer` and `trailing-buy` after the path
     fix, and this study's non-official declaration);
   - `src/gpu-backend/entrypoints.ts` (the declaration);
   - the generator `tools/gpu-phase9/accept.ts`.
5. **Classification: full cycle (§2).** All kernel, parity, optimizer, sanitizer and reliability evidence is fresh on gb9.
   - **New gate D1:** every real-data door's GPU dataset must equal GPU Phase 7's accepted export, byte for byte.
   - **Carried, each with its unchanged-file condition checked by the generator:** Phase 5's V8 root-cause evidence
     (R1–R3), the offline codec equivalence (A2), the atomic dataset export (A10, four entries) and Phase 6's
     job-isolation campaign (E2), exactly as Phase 7 carried them.

## 3. Resource contract

- **Containment:** slice `gpup9.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0; `tools/gpu-phase9/launch-slice.sh`);
  every heavy step is its own transient unit.
- **Node:** `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --no-maglev`.
- **GPU jobs:** batch 8,192, 8 host workers; at most two GPU jobs at once (the concurrency pair, the reliability run).
- **Shared machine:** the GPU is otherwise idle; the user's Strategy Lab server (CPU only) keeps running from the main
  checkout and is never touched.
- **Not done:** no endurance run, no reboot, no machine-wide change.

## 4. Data access

- **Development doors:** D19, D21, D23 and D24, plus the windows of the parity campaign.
- **FULL and the 2025 episode window:** opened only by the parity campaign's identity comparisons, as in every earlier
  acceptance campaign. No money figure of FULL is reported.
- **Restricted to R1:** the doors end at or before 2026-10-30. The appended rows after it are never read.
- **Archives:** two of the compressed Assignment 3 search archives (`search-C21-broad1`, `search-C24-broad1`) are
  restored read-only into `cache/restore/` (git-ignored) and verified against the storage cleanup's manifest
  (`tools/gpu-phase9/restore-archives.py`). They supply the threshold-edge engineering subjects and the sealed-archive
  reproduction check of R2; nothing is selected from them.

## 5. The campaign (`chains/final.sh`, then `tools/gpu-phase9/accept.ts`; commands in `RUN_COMMANDS.md`)

The steps are those of GPU Phase 7's campaign, with this study's namespace and fresh seeds, plus D1.

| Step | Content | Gate |
|---|---|---|
| 1 | final binary gb9 (twice: reproducible), gb9-dev / -perturbed / -stale, kernel identity with gb7 | B1 |
| 2–3 | parity campaign `chains/parity.sh` (54 runs, ≥ 100,000 seeded random genomes, every door, option set, fixtures, determinism incl. host-worker counts; detail + risk runs compare the envelope) and its summary | A1 |
| 4 | the GPU input: every real-data run's dataset = Phase 7's (38 runs) | D1 |
| 5 | Assignment 3's 48 sealed finalists on D24: CPU = GPU = sealed C24 figures | A2 |
| 6–9 | risk-delivery parity through the EvalLab: threshold edges of the restored C21/C24 archives on D21/D24 (base, 10 bps), the finalists on D24 (base, 10 bps, 0 bps, 14 %), 1,000 fresh random genomes on D19 (base, 0 bps) | R1–R3 |
| 10–13 | sealed replays: Assignment 3 C19 broad1 plain and with the envelope requested (= sealed with envelopes stripped), Assignment 2 C19 base | A3 |
| 14–23 | **the fixed-seed engineering mini-optimization** (development door D19; Phase 2's G7 schedule: eight Assignment 3 broad lanes at reduced counts, seeds derived from the study name, a fixed budget): GPU (8, 1, 0 host workers), CPU, stopped + resumed, SIGKILLed + resumed, risk GPU and risk CPU, two jobs at once (plain + risk); comparisons | A4 |
| 24 | qualification and ranking parity on the risk mini archives | Q1 |
| 25 | compute-sanitizer (memcheck, racecheck, initcheck, synccheck) | A5 |
| 26–27 | negative suite and source-tamper suite (sandbox clone) | E3, E4 |
| 28 | bounded reliability run, Mode A: two processes × 32 min | A6 |
| 29 | `npm test`, root tsc, ESLint (GPU directories), Strategy Lab (typecheck, lint, Vitest, scratch build, Playwright; portfolio parity), integrity | E7–E10 |
| then | the generator (P1, P5 policy tests), commit; post-record: the record-in-force tests, the independent verifier with rebuild and device, the live official gate on this study | — |

The mini-optimization is engineering verification only. Its archives are compared with each other by identity. Its
candidates are never reported as findings, ranked for a decision, promoted or used by any study.

## 6. Gates (all must pass; zero tolerance)

Every gate is the generator's (`tools/gpu-phase9/accept.ts`):

| Group | Gates |
|---|---|
| Record and change | S0 the superseded record's pin; S1 the declared change only (§2); S2 the carried set (11 entries) |
| Binary and evidence runtime | A0 every evidence record under `--no-maglev`; B1 |
| Parity | D1; A1; A2; R1–R3 (four runs); A3 (three replays) |
| Mini-optimization | A4 (nine comparisons); Q1 |
| Robustness | A5; A6 (two processes) |
| Enforcement | E3; E4 |
| Suites and integrity | E7; E8 (npm test: no failure except, before the record, the three record-in-force tests; root tsc 0 errors); E9; E10 (against the base commit `f2c414ef`: tracked research files, the 31 study preflights, sealed-file modes, the B4/B5 forward freeze's failure list and the evaluation groups) |
| Policy | P1 (standard 5.0.0 current); P5 |

A failed gate keeps the record in force unchanged: the generator writes only `results/acceptance-not-accepted.json`. The
failure is reported, diagnosed within the approved scope and followed by a rerun of the applicable complete procedure.
It blocks the integration into `main`.

**A finding of the baseline (recorded before the freeze).** The prospective B4/B5 shadow protocol
(`research/prospective-b4-b5-shadow/`, frozen 2026-10-26, no snapshot imported, zero observations) binds a code closure
that includes `src/lib/csv.ts` and `src/lib/evaluation.ts`. At the base commit its freeze check therefore names the four
research-date-boundaries loader files as changed, in addition to the reasons it already failed for before (the appended
canonical files, the `pools` script, the market-event files; GPU Phase 7's baseline). The check fails closed as
designed; its records are unchanged and it remains reproducible at its own commit. E10 requires the base commit's
failure list exactly, and its code line must name those four files only.

## 7. Adaptations (`STANDARD_ADOPTION.json`)

- **AD1:** no roles, no primary, nothing selected.
- **AD2:** no search for selection. Sealed jobs are replayed with their own frozen code and seeds, and the mini schedule is
  a parity device.
- **AD3:** the data access of §4.
- **AD4:** the canonical CPU engine is the unmodified reference.
- **AD5:** §5.9 not applicable.
- **AD6:** no tuning benchmark.
- **AD7:** no money figure of a searched configuration is a finding.
- **AD8:** bounded reliability (≈ 32 min, two processes).
- **AD9:** no risk-envelope pilot or other research runs, and nothing here is promoted.
- **AD10:** the campaign runs in a linked worktree of the repository.
  - **Why:** the main checkout serves the user's live Strategy Lab.
  - **Git-ignored inputs:** real copies of `data/` (without `data/vintages/`) and of the small git-ignored research
    inputs, links to the per-study caches under `.cache/`, and the sealed files' 0444 mode mirrored after a content check
    (`docs/data-updates/2026-11-27-assignment-2/scripts/worktree-env.sh`).
  - **Equivalence:** the worktree's baseline suite equals the main checkout's (1,909 / 1,896 / 9 / 4).
