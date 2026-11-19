# RESEARCH_RECOVERY — gpu-phase2 (GPU acceleration Phase 2: complete parity, mandatory GPU optimization)

## Top screen

- **Updated:** 2026-11-19T03:04Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — FINAL binary frozen; final gates RUNNING (chain `gpup2-final-gates`).
- **Authority:** `brief/BRIEF.md` sha256 `25c1fa47…459d` (283 lines, read in full). `PROTOCOL.md` FROZEN
  2026-11-19T00:25Z (`results/protocol-freeze.json` sha256 `b274caab…f999`, sealed 0444; protocol commit `8dad359e`).
  Standard 2.2.0 adopted (scope diagnostic; retained pinned standard 2.2.0 after 3.0.0 was registered), preflight PASS.
  `AMENDMENTS.md`: none.
- **FINAL binary:** `build/gb2` sha256 `3fe09e6791ff9996bc4f463c43e7d8dff46600ca3bcbf0d7777be155301e13fc`, compat digest
  `f67dcb3bcc3ba89647610e7cce548c97ea288df920e71b777fd94478d83adaea` (sources at `42a0694f`; build.sh strips symbols →
  reproducible: three builds gave the same sha). Sealed identity: `results/final-binary.json` (seals.jsonl,
  sha256 `eec62aec…cafaa`). Test builds: gb2-dev = same sha; gb2-perturbed `dcd18c6e…`; gb2-stale `a120ab2a…`.
  **DO NOT edit any file in the compat closure** (`compat.ts --manifest`: 94 CPU files, CUDA sources, host
  client/encode/dataset/layout/canon/compat/toolchain/pool) until the acceptance is written — it would invalidate the
  binary and every final gate.
- **Running:** unit `gpup2-final-gates-4` (02:37:59Z, START=3; earlier: `-3` from 02:05Z) = `chains/final-gates.sh` (log
  `results/logs/final-gates-chain.txt`): 1 A3 C19 broad1 GPU replay **run 2** (sub-unit `gpup2-a3-c19b1-r2`, out
  `results/optimizer/a3-C19-broad1/gpu/`) + compare vs the sealed record → 2 qualify-replay (A3 C19 broad qualification
  on the GPU vs sealed) → 3 bench → 4 sanitizer-final → 5 negative-final → 6 mini-opt g7f → 7 parity FINAL (+SUMMARY) →
  8 stress 24.05 h; sub-units `gpup2-a3-qualify|bench|sanitizer|negative|mini-opt-f|par-<n>-<name>|stress`. Fail-fast;
  relaunch a failed chain with `START=<step>` under a NEW unit name (never rerun a passed step). Check:
  `systemctl --user list-units 'gpup2*'`; `grep -E "start|end|FAILED" results/logs/final-gates-chain.txt`.
- **Step 1 PASSED (02:24:55Z):** replay run 2 identical to the sealed A3 C19 broad1 (64 lanes, 0 differences, fresh
  1,242,714 and archive hits 7,607 equal); 1,130.6 s vs 5,900.8 s = 5.22×; peak 10.5 GB
  (`results/optimizer/compare-a3-C19-broad1.json`).
- **Step 2 PASSED (02:28:56Z):** A3 C19 broad qualification replayed on the GPU identical (385 members, 377 qualified,
  251,405 fresh, 0 evidence differences); 238.5 s vs 1,249.5 s = 5.24×
  (`results/optimizer/compare-a3-C19-broad-qualification.json`).
- **Step 3 (bench)** failed once (02:30Z, tool bug: double close of a pool's server) → fixed with a keep-open proxy in
  bench.ts and stress.ts (the stress tool had the same flaw), both dry-run clean (scratch outputs); chain relaunched as
  unit **`gpup2-final-gates-4`** with START=3 at 02:37:59Z.
- **Step 3 bench complete (02:59Z):** `results/bench/bench.json`; projections `results/bench/projections.json`; TR1
  `results/tr1-tranche-gate.json`; report `GPU_PHASE2_BENCHMARKS.md`.
- **Step 4 sanitizer-final PASSED (03:00Z):** 4 tools 0 errors, 97/97 identical (`results/sanitizer-final/`).
- **Step 5 negative-final PASSED (03:00:39Z):** 35/35 (`results/policy/negative-final.json`).
- **Step 6 mini-opt g7f** running since 03:00:39Z (unit `gpup2-mini-opt-f`, log `results/logs/mini-opt-g7f.txt`). Branch pushed (backup) at
  `a9ae79ec` (ls-remote verified).
- **Replay run 1** (01:43–02:03Z): 5.21× (1,132.5 s vs 5,900.8 s), counts identical, but its record wrote ±Inf/NaN as
  null (91 fields, all encoding-only) → kept as a timing sample (`results/optimizer/a3-C19-broad1-run1/NOTE.md`); fixed
  `src/gpu-phase2/context.ts` writeJson + mini-opt row hashes to the store's encoding (compat digest unchanged).
- **Done (dev evidence):** pre-final D24-core 2,325/2,325 + determinism (batch 1…128, shuffled, repeat, restart) 0;
  G7 CPU = GPU = interrupted+resumed (g7, g7p); negative tests 34/35 dev (defect fixed); standard 3.0.0 registered.
- **The "hang" (resolved, no defect):** batch-size-1 determinism = 256 single-candidate kernels of 3–5 s each; the
  earlier units were stopped before that ~13-minute stage finished. Kept as defence: kernel watchdog, loop guards,
  pool batch timeout.
- **Next (while the chain runs):** reports and docs; during the stress (step 7): `npm test` in a capped unit with PATH,
  Strategy Lab regression; after the chain: `tools/gpu-phase2/accept.ts`, final reports, MANIFEST, bundle ZIP,
  commit/push, docs-only main integration.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/gpu-phase2` from `727681c0` (no worktree).
  Commits: `8dad359e` (protocol), `2f5bc24c` (evaluator v2 + first probes).
- Node v24.21.0; units use `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Apollo: RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, 31,342 MiB free at start, driver 595.91.07, CUDA 13.2;
  no vLLM, no containers (`results/inventory/s0-start.json`). Monitor on the RTX 5090.
- Toolkit: `/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit` (redist 13.2.2: nvcc 13.2.86,
  compute-sanitizer 2026.1.1 (13.2.87), CUPTI, Nsight Compute 2026.1.1; `INSTALL_MANIFEST.json`; installer
  `tools/gpu-phase2/install-toolkit.sh`; uninstall = delete that dir and `…/downloads-13.2.2`). Build:
  `tools/gpu-backend/build.sh <out> <compat digest>` (flags -O3 sm_120 --fmad=false IEEE div/sqrt, -ffp-contract=off).
- Containment: `tools/gpu-phase2/launch.sh` (gpup2.slice 44G/48G/0).

## Code map

- `src/gpu-backend/` (durable backend): `cuda/gb.h` (protocol v2), `gb_common.cuh`, `gb_d1.cuh` (Phase 1 D1 port),
  `gb_growth.cuh` (Growth 1.4.0 port), `gb_pool.cuh` (pool + options + risk envelope), `gb_server.cu`, `v8math.cuh`
  (V8 log/exp); `layout.ts` (+ `tests/layout.test.ts`), `dataset.ts`, `encode.ts`, `client.ts`, `compat.ts`,
  `toolchain.ts`.
- `src/gpu-phase2/` (study harness): `context.ts`, `subjects.ts`, `fixtures.ts`, `doorSpec.ts`, `canon.ts`,
  `cpuRefWorker.ts`, `cpuRefPool.ts`. Tools: `tools/gpu-phase2/{probe,throughput-probe,sanitize,parity}.ts`,
  `tools/gpu-backend/{build.sh,layout-dump.cpp,v8math-check.cu,check-v8math.ts}`.

## Stage table

| Stage | Status | Command / output | Result |
|---|---|---|---|
| S0 setup, inventory | complete | `results/inventory/s0-start.json` | vLLM absent, 31.3 GiB free |
| S1 toolkit + sanitizer | complete | `tools/gpu-phase2/install-toolkit.sh`; control `results/sanitizer/control.txt` | full-layout sanitizer instruments processes (catches an injected OOB) |
| T0 sanitizer on real kernels (dev binary) | complete (re-run on final binary pending) | `tools/gpu-phase2/sanitize.ts --door W-QUIET --per 1` → `results/sanitizer/sanitizer.json` | memcheck(leak) 0, racecheck 0, initcheck 0, synccheck 0; 33/33 identical. Fixed on the way: full struct init (initcheck), device frees at exit (leaks), zeroed period slots |
| V8 math | complete | `tools/gpu-backend/check-v8math.ts` → `results/parity/v8math.json` | 10,000,000 inputs, 0 mismatches GPU and host |
| S3/S5/S6 evaluator v2 incl. full Growth | built | probes: W-CRASH 13/13, D24 125/125 (64 random + every Growth structural value), all-options W-CRASH 65/65 incl. detail, risk envelope, determinism 0 | — |
| S7a pre-final parity campaign | running | `chains/parity.sh` → `results/parity/prefinal/*.json` | — |
| S2 policy + enforcement | not started | — | — |
| S4 GpuPool/GpuLab, parallel decode | not started | — | — |
| S7 mini-optimization, negative tests, 24 h, npm test, Strategy Lab | not started | — | — |
| S8 benchmarks | not started (throughput probe: ~1,092 ev/s at batch 16,384 on D24, client decode-bound) | — | — |
| S9 reports, bundle, commit/push, docs-only main integration | not started | — | — |

## Guards

- Do not run the deferred 40% / 25% / 25% risk-envelope pilot or any official optimization; no strategy, fitness,
  budget, random-stream or selection change; no merge of GPU engine code into `main`; no deployment or broker access.
- Do not edit completed studies or Phase 1 code (imported only). Do not touch `state/strategy-lab/`. No model
  reinstall; no display/driver/BIOS/boot change; do not modify the `ai-trading` project.
- No visuals. AD7: no money figure for non-reference configurations.
- The parity evidence that counts for acceptance is the FINAL campaign on the frozen final binary; pre-final records are
  development evidence (kept, labelled).

## Disclosures

- One GPU job at a time (PROTOCOL §8) was not kept during development: the g7 mini-opt GPU arm and the dev negative
  tests overlapped the pre-final D24-core GPU stage (01:25–01:40Z). Effect: timing only (all of them passed; results do
  not depend on co-scheduling). The final gates run strictly sequentially.
- Investigated as a possible hang (00:5xZ–01:36Z): see the top screen; units stopped: gpup2-par-1-D24-core (first
  pre-final run), gpup2-repro-d24core; no record was sealed from them.
- Chain units: `gpup2-final-gates` (stopped in step 1 to insert the qualification replay), `gpup2-final-gates-2`
  (step 1 FAILED on the replay record's lossy ±Inf encoding), `gpup2-final-gates-3` (current).
- G7 runs g7 and g7p hashed archive rows with plain JSON.stringify (±Inf/NaN → null): their identity holds for finite
  values; the final G7 (g7f) hashes in the store's encoding.
- G7 resume attempt 1 (01:30Z) refused by the archive binding because host code (`pool.ts`) was edited between the
  interrupt and the resume (backend digest changed): the guard works; the resume test was rerun (g7p).
- Development fixes before any gate record: FNV-64 offset-basis typo in the server (smoke/receipt checks caught it);
  sanitizer findings (leaks at exit; uninitialized padding copied by pack kernels; unwritten period slots) — none
  changed a result (all sanitized results were bit-identical), all fixed.
