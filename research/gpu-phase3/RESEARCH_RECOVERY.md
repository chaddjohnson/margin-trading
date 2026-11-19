# RESEARCH_RECOVERY — gpu-phase3 (GPU Phase 3: host-pipeline acceleration, final acceptance, merge, handoff)

## Top screen

- **Updated:** 2026-11-19T14:42Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — Stage 1 (profiling of the accepted Phase 2 path) running; Stage 2/4 code written and
  staged (new files committed in `b4424384`; edits of existing backend files staged in the scratchpad, applied after the
  chain — see "On disk versus in memory").
- **Authority:** `brief/BRIEF.md` sha256 `925e97e80dd8bca0bbc470fe07ef31388efcbae8ca26f9153efb10d02933f6be` (the user's
  handoff, read in full, 267 lines, final section "Final success criterion" present). `PROTOCOL.md` FROZEN
  2026-11-19T14:21:42Z (`results/protocol-freeze.json` sha256 `42d41b249a83aa3e1cc9794afe94ca401e519880bc7e830d5c1956a94f944475`,
  protocol `952da32c…1a1b`); no amendments. Standard 3.0.0 adopted (scope diagnostic); preflight PASS.
- **Running:** systemd unit `gpup3-baseline` (slice `gpup3.slice`), chain `research/gpu-phase3/chains/baseline.sh`,
  log `research/gpu-phase3/results/logs/baseline-chain.txt`, started 2026-11-19T14:09:07Z. Steps: p2-a3-r1, p2-a3-r2
  (A3 C19 broad1), p2-a2-r1 (A2 C19 base), p2-mini-r1..3, comparisons. Finished cleanly iff the log ends with
  "chain complete"; a "FAILED [step]" line marks a failure. **Do not edit any file the chain imports while it runs**
  (tools/gpu-phase3/{replay,compare,a2lab}.ts, src/gpu-phase3/*, src/gpu-backend/*).
- **Next:** when the chain completes: record the Stage 1 profile tables, then implement Priority A (new files) and switch
  GpuPool only after the baseline chain is finished.
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
| S1 profile Phase 2 path | running | `chains/baseline.sh` (unit gpup3-baseline) → `results/optimizer/p2-*` | p2-a3-r1: 1,131.1 s, identical to sealed (5.22×), main-thread ELU 0.70 (active 791 s: encode 161, decode 292, archive 70, rest ≈ 268), GPU server 347 s |
| S1 plan + benchmark protocol | complete | `PROTOCOL.md` frozen 14:21:42Z | — |
| S2 Priority A host workers | not started | — | — |
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
- Plan at the swap: move `config/gpu-backend/acceptance.json` (Phase 2, schema 1, sha256 b7df366a…) to
  `results/superseded/acceptance-gpu-phase2.json` (official runs blocked during development, as they must be).

## Disclosures

- 2026-11-19T14:51:50Z (incident, no content change): while validating the kernel-identity method, `objcopy
  --dump-section` (which rewrites its input in place when no output file is given) was run directly on Phase 2's local
  build artifacts. `research/gpu-phase2/build/gb2-stale` and `gb2-perturbed` were rewritten with byte-identical content
  (sha256 still `a120ab2a…dd0b26b4` and `dcd18c6e…cef78e8a3`, = Phase 2's negative-final.json record); only their mtimes
  changed (15:51:50/51 CET). `gb2` (busy: the baseline was running it) was not touched (sha256 `3fe09e67…13fc`). These
  files are git-ignored; no record changed. `tools/gpu-phase3/build-final.sh` now runs objcopy only on temporary copies.
  Method validated: gb2 and gb2-stale (different compiled-in digests) have identical .nv_fatbin and SASS; gb2-perturbed
  differs.
