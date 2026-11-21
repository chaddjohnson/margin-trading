# GPU Phase 7 — risk-envelope delivery, acceptance renewal and risk-envelope pilot readiness (acceptance protocol)

- **Brief:** `brief/BRIEF.md` (the user's assignment "GPU Risk-Envelope Pilot Prerequisites and Readiness Verification",
  verbatim, 633 lines). **Standard:** 3.0.0 (`docs/research/OPTIMIZATION_STANDARD.md`, sha256
  `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`), scope **diagnostic** (engineering acceptance;
  `STANDARD_ADOPTION.json`). **Checklist:** `docs/gpu/PARITY_CHECKLIST.md` **§2** (a full cycle: an evaluation-manifest
  file changes).
- **What this is not.** Not an optimization study: nothing is searched for selection, ranked for a decision, qualified
  or selected; no trading rule, fitness, parameter search, candidate selection, CUDA source, numerical precision or build
  flag changes. **The risk-envelope pilot is NOT run:** its protocol is prepared for review only
  (`research/vg-l0-risk-envelope-pilot/PROTOCOL_PROPOSED.md`), no pilot job, preflight or attestation exists, and the
  optimization standard is not changed.

## 1. Baseline (verified 2026-11-21T19:50Z, `results/baseline/`)

| Item | Value |
|---|---|
| Branch / base | `research/gpu-phase7-risk-envelope-readiness` from `cleanup/storage-2026-11-21` `d89b9dec` = `main` `3606f4b3` + the storage audit and cleanup records (docs only) |
| Record in force | `config/gpu-backend/acceptance.json` (study gpu-phase6) sha256 `3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3`; out-of-band copy `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase6-3610caaf.json` |
| Binary | `research/gpu-phase5/build/gb5` `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e`; evaluation digest `3a6eacde…` |
| Verifier / integrity | `verify-acceptance.sh --rebuild --device --expect-record-sha256 3610caaf…`: VERIFIED; Phase 6 integrity 5/5; this study's own baselines (tracked research blobs 21,092; 22 preflights PASS; 1,053 sealed files, 999 protected; 9 pre-existing forward-freeze failures; compat groups) |
| Device / runtime | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, CUDA 13.2.86, Node v24.21.0 / V8 13.6.233.17, `--no-maglev` |
| Data | GDX `77dba9b2…`, VGT `2ee06310…` (Priority 3 pins); doors D19–D24 verified against their pins and as canonical prefixes |

## 2. The change and its classification

1. **Risk-envelope delivery (reusable backend integration).**
   - `src/gpu-backend/pool.ts` (host group → evaluation digest): a task with `risk: true` is delivered as
     `{ ...record, envelope }` (the device's four dollar inputs); every other task as the unchanged record object. A
     decoded result whose envelope does not match its request withholds the batch and fails the job (`risk-envelope-mismatch`).
   - `src/gpu-backend/lab.ts` (enforcement group): `evalMany` items may carry `risk: true`; such an item has its own
     archive key (`…|risk`) and its task carries `risk: true`; a plain item's key, task and record are those of every
     earlier version. `checkEnvelope` (exactly four finite fields ≥ 0, liquidation ≥ marked) runs on every write and every
     read; a plain key with an envelope, or a `|risk` key without a valid one, throws.
   - `src/gpu-backend/toolchain.ts` (host group): this study's binary `research/gpu-phase7/build/gb7` becomes the default.
   - `src/gpu-backend/entrypoints.ts` + `config/gpu-backend/entrypoints.json` (enforcement): `src/gpu-phase7` declared
     non-official. `src/gpu-backend/tests/hostPipeline.test.ts` (enforcement): the pool contract test expects
     `{ ...record, envelope }` for its risk tasks.
2. **Central qualification logic (research library, not in the manifest):** `src/risk-envelope/policy.ts` (policies,
   exact limits in whole percent of named denominators, the ≤ boundary, the normalized violation, neighbourhood
   statistics, fail-closed validation via `checkEnvelope`) and `src/risk-envelope/diagnostics.ts` (the nonbinding D1–D3
   drawdown-policy diagnostics), with tests. Not used by any official job in this study.
3. **Classification: full cycle (checklist §2).** The CUDA sources and the CPU closure are untouched (gate S1); the
   binary changes only by the compiled host digest (gate B1 proves the device code and SASS byte-identical to gb5). All
   kernel, parity, optimizer, sanitizer and reliability evidence is nevertheless **fresh** on gb7. Carried (each with its
   unchanged-file condition, gate S2): Phase 5's V8 root-cause evidence (R1–R3), the offline codec equivalence (A2), the
   atomic dataset export (A10, four entries) and Phase 6's job-isolation campaign (E2).
4. **Untouched by construction:** the canonical CPU closure, the CUDA sources, the codec and host-pipeline files, the
   dataset export, the job module, every frozen legacy runner, `src/app.ts`, the B4/B5 forward freeze's bound files,
   every completed study's records, the optimization standard and its registry.

## 3. Resource contract

Slice `gpup7.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0; `tools/gpu-phase7/launch-slice.sh`), every heavy
step a transient unit; Node `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --no-maglev`. GPU
jobs batch 8,192, 8 host workers (Phase 4 Mode S); at most two GPU jobs at once (the concurrency pair, the reliability
run). No endurance run (brief: bounded reliability), no reboot, no machine-wide change.

## 4. Data access (AD3)

Development doors D19, D21, D23, D24 and the windows of the parity campaign; FULL and the 2025 episode window are opened
**only** by the parity campaign's identity comparisons (as every earlier acceptance campaign did) — no money figure of
FULL is reported. Archives: two of the fourteen compressed Assignment 3 search archives (`search-C21-broad1`,
`search-C24-broad1`) are restored read-only into `cache/restore/` (git-ignored) and verified against the storage
cleanup's records (`tools/gpu-phase7/restore-archives.py` → `results/restore/restore-record.json`); their compressed
originals are never written. They supply threshold-edge engineering subjects (`tools/gpu-phase7/edge-subjects.py`) and
the sealed-archive reproduction check of R2. Nothing is selected from them.

## 5. The campaign (`chains/final.sh`, then `tools/gpu-phase7/accept.ts`; commands in `RUN_COMMANDS.md`)

| Step | Content | Gate |
|---|---|---|
| 1 | final binary gb7 (twice: reproducible), gb7-dev / -perturbed / -stale, kernel identity with gb5 | B1 |
| 2–3 | parity campaign `chains/parity.sh` (54 runs, ≥ 100,000 seeded random genomes, every door, option set, fixtures, determinism incl. host-worker counts; detail + risk runs compare the envelope) and its summary | A1 |
| 4 | Assignment 3's 48 sealed finalists on D24: CPU = GPU = sealed C24 figures | A2 |
| 5–8 | risk-delivery parity through the EvalLab (`tools/gpu-phase7/risk-parity.ts`): threshold edges of the restored C21/C24 archives on D21/D24 (base, 10 bps), the finalists on D24 (base, 10 bps, 0 bps, 14 %), 1,000 fresh random genomes on D19 (base, 0 bps) | R1–R3 |
| 9–12 | sealed replays: Assignment 3 C19 broad1 plain and **with the envelope requested** (= sealed with envelopes stripped; its wall time is the pilot's throughput measurement), Assignment 2 C19 base | A3 |
| 13–21 | fixed-seed mini-optimization: GPU (8, 1, 0 host workers), CPU, stopped + resumed, SIGKILLed + resumed, risk GPU and risk CPU, two jobs at once (plain + risk); comparisons | A4 |
| 22 | qualification and ranking parity on the risk mini archives (both policies, every evaluation) | Q1 |
| 23 | compute-sanitizer (memcheck, racecheck, initcheck, synccheck) | A5 |
| 24–25 | negative suite (incl. the risk group) and source-tamper suite (T1–T23) | E3, E4 |
| 26 | bounded reliability run, Mode A: two processes × 32 min | A6 |
| 27 | `npm test`, root tsc, ESLint, Strategy Lab (typecheck, lint, Vitest, build, Playwright; portfolio parity), integrity | E7–E10 |
| then | the generator (P1, P5 policy tests), commit; post-record: the record-in-force tests, the independent verifier with rebuild and device, the live official gate on this study | — |

## 6. Gates (all must pass; zero tolerance)

Every gate is the generator's (`tools/gpu-phase7/accept.ts`): S0 superseded record pin; S1 the declared change only;
S2 the carried set; A0 every evidence record under `--no-maglev`; B1; A1; A2; R1–R3 (four runs); A3 (three replays); A4
(nine comparisons); Q1; A5; A6 (two processes); E3; E4; E7; E8 (npm test: only the 7 known failures plus, before the
record, the two record-in-force tests; root tsc 0 errors); E9; E10; P1; P5. A failed gate keeps the record in force
unchanged (the generator writes only `results/acceptance-not-accepted.json`), is reported, and blocks readiness.

## 7. Adaptations (`STANDARD_ADOPTION.json`)

AD1 no roles, no primary, nothing selected. AD2 no search for selection; sealed jobs replayed with their own frozen
code and seeds; the mini schedule is a parity device. AD3 the data access of §4. AD4 the canonical CPU engine is the
unmodified reference. AD5 §5.9 not applicable. AD6 no tuning benchmark; timings are reported (the pilot's compute
estimate) and select nothing. AD7 no money figure of a searched configuration is a finding (the references' sealed
figures are reproduced as identity checks only). AD8 bounded reliability (≈ 32 min, two processes). AD9 the pilot is
prepared for review only, never run.
