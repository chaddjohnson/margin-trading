# RESEARCH_RECOVERY — gpu-phase3 (GPU Phase 3: host-pipeline acceleration, final acceptance, merge, handoff)

## Top screen

- **Updated:** 2026-11-19T21:31Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — Stage 5 final campaign **COMPLETE** (unit `gpup3-final`, 17:22:05 → 21:05:34Z, all 31
  steps status 0, Result=success). Post-final chain RUNNING. Final binary `research/gpu-phase3/build/gb3` sha256
  `06a4a04a83265616ab363632c02bf5d7737f34ec12156655cf95e135dde0dc23` (compat `30824182…2998`; `results/final-binary.json`
  sealed `e60e91e2…a583`).
- **Authority:** `brief/BRIEF.md` sha256 `925e97e80dd8bca0bbc470fe07ef31388efcbae8ca26f9153efb10d02933f6be` (the user's
  handoff, read in full, 267 lines, final section "Final success criterion" present). `PROTOCOL.md` FROZEN
  2026-11-19T14:21:42Z (`results/protocol-freeze.json` sha256 `42d41b249a83aa3e1cc9794afe94ca401e519880bc7e830d5c1956a94f944475`,
  protocol `952da32c…1a1b`); amendments A1–A2 (`AMENDMENTS.md`, 21:25Z: enforcement-only reruns; a root type-check finding disclosed). Standard 3.0.0 adopted (scope diagnostic); preflight PASS.
- **Running:** unit `gpup3-post-final` (`chains/post-final.sh`, START=1), log `results/logs/post-final-chain.txt`,
  started 21:05:51Z: 1 tests (`chains/tests.sh`: npm test, root tsc, ESLint, Strategy Lab; `results/tests/`), 2 CPU
  baseline A3 C19 broad1 on 12 workers (`results/optimizer/final-a3-cpu/cpu`, ≈ 98 min), 3 its sealed compare, 4 bench
  summary. Finished iff the log ends with "chain complete" (its own; the unit then exits). Resume: `START=<n>`.
- **Final campaign results (all pass):** offline 7/7; parity 54 runs, 144,795/144,795 identical, 176 determinism runs 0;
  finalists D24 96/96 (sealed 48/48), FULL 96/96; A3 broad1 583.9 / 581.8 s identical (10.1×); A3 qualification 163.7 s
  identical (377/385 qualified); A2 base 724.8 / 726.5 s identical (6.5×); mini CPU = GPU = resumed = w1 = w0 = Phase 2
  path; sanitizer 0 errors ×4 (97/97); negative 45/45; tamper 14/14; sustained 45.3 min, 3.77 M evaluations, 0 failures,
  parity 5,520/0, repeat 15/0.
- **Next:** (1) wait for `gpup3-post-final` ("chain complete"; tests step done 21:16:48Z, pass; CPU A3 baseline running
  from 21:16:48Z). (2) amendment A1: `tools/gpu-phase3/launch.sh gpup3-reruns
  /home/chad/projects/margin-trading/research/gpu-phase3/results/logs/reruns-chain.txt -- /usr/bin/env START=1 /bin/bash
  research/gpu-phase3/chains/acceptance-reruns.sh` (negative, tamper, npm test, root tsc on the committed tree; ≈ 8 min).
  (3) `GPU_POLICY_PURPOSE=parity-test $NODE tools/gpu-phase3/accept.ts` → commit record + evidence; record sha256 kept
  out of band. (4) Stage 7 (merge-audit, `git switch main; git merge --no-ff research/gpu-phase3`, post-merge.sh with
  RECORD_SHA, ff branches, bundle, push, restore research/gpu-phase2).
- **Never:** start/implement/run the risk-envelope pilot; change strategies, fitness, genome, budgets, seeds or
  selection; touch sealed studies' records; CPU fallback; a new 8 h/24 h endurance run (only one 30–60 min sustained run).

## Stage 0 — state recorded before any change (2026-11-19T13:55Z)

- Checkout `/home/chad/projects/margin-trading`, initial branch **`research/gpu-phase2`** at
  `a183640793ddc6635a0ac9be4b1f4b5b1db7bfb9` (= `origin/research/gpu-phase2`, 0 ahead / 0 behind), working tree and
  index clean (only ignored files: data/, caches, builds), no stash, one worktree (the main checkout), no other Claude or
  node process running (only this session), no submodules.
- `main` = `origin/main` = `10ca342234eb73db79f8691ea32c88f3e32dcc80` (documentation-only integration of Phase 2);
  merge base of `main` and `research/gpu-phase2` = `10ca3422` (main is an ancestor: research/gpu-phase2 is 310 commits
  ahead, 0 behind). The 310 commits carry ~20 completed studies (Priority 3 … Assignment 3, Phase 1, Phase 2) that were
  never merged into `main` — the GPU engine's canonical CPU reference (the 94-file closure) lives in them.
  `git diff --stat main research/gpu-phase2`: 4,519 files. Branch protection on `main`: none (GitHub API 404 "Branch
  not protected", no rulesets); no CI workflows (`.github/` holds only the PR template).
- Accepted Phase 2 state verified live: `compat.ts` digest `f67dcb3bcc3ba89647610e7cce548c97ea288df920e71b777fd94478d83adaea`
  (cpu `c8a9f416…`, 94 files; cuda `d8899061…`; host `d781b0d7…`) = the acceptance record's; binary
  `research/gpu-phase2/build/gb2` sha256 `3fe09e6791ff9996bc4f463c43e7d8dff46600ca3bcbf0d7777be155301e13fc` (= gb2-dev);
  `checkAcceptance({binary, uuid})` → ACCEPTED, no reasons. `config/gpu-backend/acceptance.json` sha256
  `b7df366a847a4655a1a40a060c4242144e2da150065bd09c3bb1090c4649dd0f`; `entrypoints.json` `bd5b5688…f9d620`.
- Apollo: RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07 / CUDA 13.2, 774 MiB used (desktop:
  gnome-remote-desktop 504, gnome-shell 189, Xwayland 8), 31,335 MiB free, 34 °C, P8; 16 hardware threads, 59 GiB RAM
  (53 available), swap 7 GiB; disk 451 GB free; Node v24.21.0. Toolkit `/home/chad/.local/share/margin-trading-gpu/
  cuda-13.2-toolkit` (nvcc 13.2.86).
- Branch to restore at the end: **`research/gpu-phase2`** (the branch active at the start).
- Work branch: **`research/gpu-phase3`** created from `a1836407` (no worktree).

## Environment

- Main checkout, branch `research/gpu-phase3`. Node v24.21.0; units use the absolute node path
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Containment: `tools/gpu-phase3/launch.sh <unit> <abs log> [--wait] -- <cmd>` (gpup3.slice MemoryHigh 44G, MemoryMax
  48G, MemorySwapMax 0).
- Study harness: `src/gpu-phase3/` (copies of Phase 2's harness with this study's namespace: door log
  `research/gpu-phase3/results/doors.jsonl`, seeds `deriveSeed('gpu-phase3', …)`); tools `tools/gpu-phase3/`.
- Git-ignored: `research/gpu-phase3/{build,cache,results/raw-large}`.
- Development captures (git-ignored): `research/gpu-phase3/cache/captures/*.{json,req.bin,res.bin}` — 7 real batches
  from the Phase 2 binary (D19 base 4,101; D24 detail+risk 928; D24 all options 512; D24 periods 428; D24 blackout +
  trades + series 256; fixture S3 all options 256; FULL base 1,029), each with the serial path's canonical hashes.

## Stage table

| Stage | Status | Command / output | Result |
|---|---|---|---|
| S0 state, inventory | complete | this file | see Stage 0 |
| S1 profile Phase 2 path | complete | `chains/baseline.sh` (unit gpup3-baseline, 14:09–15:17Z; the A2 step's final dump failed after its job-end, recovered by `tools/gpu-phase3/archive-digest.ts`, minis run by hand 15:20–15:24Z) → `results/optimizer/p2-*`, compares `compare-p2-*` | A3 r1 1,131.1 s / r2 1,126.8 s, identical to sealed (5.22×/5.24× vs 5,900.8 s), ELU 0.70 (active 791: encode 161, decode 292, archive 70, rest ≈ 268), GPU server 347; A2 C19 base 1,641.0 s identical to sealed (2.85× vs 4,681.1 s on 14 CPU workers), ELU 0.80 (active 1,306: encode 278, decode 505, archive 126), server 353; mini 72.8 s ×3 identical, ELU 0.27, server 53.5 (GPU-latency-bound, median batch 376) |
| S2 Priority A wiring | complete | commit `37f67004`; offline check `results/dev/offline-check-a.json` | 7/7 captures identical (serial codec and 1/2/3/8 workers), refusals correct; 17/17 backend tests |
| S1 plan + benchmark protocol | complete | `PROTOCOL.md` frozen 14:21:42Z | — |
| S2 targeted GPU checks | complete | `chains/devcheck.sh` TAG=a (15:25Z: mini FAILED closed — start race) and TAG=b (15:54–16:02Z, after `cb7d129c`) → `results/dev/`, `results/optimizer/dev-b-mini`, `compare-dev-b-mini-vs-p2.json` | b: offline 7/7; unit 17/17; parity D24 all-options 633/633 + fixture S0 305/305, determinism 0 (batches 1/7/64, shuffled, reversed, repeat, host workers 1/3/12, restart); mini w8 identical to the Phase 2 path (30,749 records, configs, lanes), 65.4 s vs 72.8 s |
| S2 measurement sweep | complete | `chains/sweep.sh` TAG=s2 (16:02–16:46Z) → `results/optimizer/s2-a3-*`, `compare-s2-a3-*-vs-sealed.json` | all four identical to the sealed record; wall w4 611.7 s, **w8 583.9 s (10.1× sealed CPU, 1.93× Phase 2 path)**, w12 582.1 s, w8 b16384 608.6 s (fewer, longer rounds). GPU idle 775 → 228 s. Chosen: 8 host workers, batch 8,192 |
| S3 Priority B / C decision | complete | measured: archive JSON encode 7.1 µs/record ≈ 8.8 s/job (1.5 %); SQLite commits ≈ 58 s inside the pinned legacy Store; main-thread ELU 0.62 | **stop after Priority A**: B rejected (no separable overhead worth its complexity), C deferred (GPU kernels ≈ 60 % of the wall, latency-bound; a kernel change needs new kernel parity + sanitizer burden) |
| S3 optional orchestration | not started | — | — |
| S4 enforcement hardening | not started | — | — |
| S5 final acceptance campaign | not started | — | — |
| S6 verdict | not started | — | — |
| S7 merge into main, branch restoration | not started | — | — |
| S8 bundle | not started | — | — |

## On disk versus in memory

- Staged edits (copies in `research/gpu-phase3/cache/staged/`, git-ignored, and the session scratchpad):
  `client.ts.new` (delegates to batch.ts), `pool.ts.new` (host pipeline, in-order release), `official.ts.new` (host-path
  step, parity mini-set through the pipeline, independent pin re-hash, source check), `compat.ts.new` (manifest v2: host
  group + policy group), `acceptance.ts.new` (schema 2), `policy.test.ts.new`. They are applied only after the baseline
  chain ends (the chain imports those files). If the scratchpad is lost, they must be rewritten from this description.
- New files (committed or written in place, not imported by the chain): `src/gpu-backend/{batch,hostDoor,hostWorker,
  hostPipeline,doors,officialRunner}.ts`, `src/gpu-backend/tests/{hostPipeline,enforcement}.test.ts`,
  `tools/gpu-backend/verify-acceptance.sh`, `tools/gpu-phase3/*` (replay, compare, capture, offline-check, parity,
  parity-summary, parity-finalists, a3-qualify-replay, sanitize, negative, tamper*, sustained, accept),
  `chains/{baseline,devcheck,parity}.sh`.
- Done at the swap (commit `37f67004`): `config/gpu-backend/acceptance.json` (Phase 2, schema 1, sha256 b7df366a…)
  moved to `results/superseded/acceptance-gpu-phase2.json` — official runs are blocked until the new acceptance.

## Disclosures

- 2026-11-19T15:33Z (defect found and fixed in development): the first dev check's mini replay on 8 host workers failed
  closed — a TypeError in `HostPipeline.complete`, nothing released, CPU-scored 0, the job stopped. Cause: `EvalLab`
  marks the pool started before awaiting `pool.start()`, so concurrent lanes ran while the pipeline was still starting
  and one batch was prepared on the serial path and completed on the pipeline. Fix (`cb7d129c`): `run()` waits for the
  pipeline before queueing, each batch captures one host path; plus two shutdown edge cases found while diagnosing (a
  pool closed while its pipeline starts; workers not yet ready at close). Regression tests in
  `src/gpu-backend/tests/hostPipeline.test.ts` (GpuPool with a stand-in server). The rerun (TAG=b) passed.

- 2026-11-19T15:17:39Z: the Phase 2-path A2 baseline replay (`p2-a2-r1`) completed its job (runs.jsonl "job-end",
  2,196,920 fresh) but the replay tool's final dump of the 2.2 M-row key → hash map as one JSON string exceeded V8's string
  limit (RangeError), so its archive digest and the chain's remaining steps did not run. Recovery: the digest and the raw
  map were recomputed from the job's own archive (`tools/gpu-phase3/archive-digest.ts`, read-only) and the sealed
  comparison run by hand (identical); the replay tool now streams the map (JSONL) and digests incrementally (the same
  bytes: sorted "key=hash" lines joined by newlines); the three Phase 2-path minis ran by hand before the code swap.

- 2026-11-19T14:51:50Z (incident, no content change): while validating the kernel-identity method, `objcopy
  --dump-section` (which rewrites its input in place when no output file is given) was run directly on Phase 2's local
  build artifacts. `research/gpu-phase2/build/gb2-stale` and `gb2-perturbed` were rewritten with byte-identical content
  (sha256 still `a120ab2a…dd0b26b4` and `dcd18c6e…cef78e8a3`, = Phase 2's negative-final.json record); only their mtimes
  changed (15:51:50/51 CET). `gb2` (busy: the baseline was running it) was not touched (sha256 `3fe09e67…13fc`). These
  files are git-ignored; no record changed. `tools/gpu-phase3/build-final.sh` now runs objcopy only on temporary copies.
  Method validated: gb2 and gb2-stale (different compiled-in digests) have identical .nv_fatbin and SASS; gb2-perturbed
  differs.
