# GPU Acceleration Phase 2 — report

Study `research/gpu-phase2/` on branch `research/gpu-phase2` (Apollo, RTX 5090). Brief: `brief/BRIEF.md` (sha256
`25c1fa47…459d`). Protocol: `PROTOCOL.md`, frozen 2026-11-19T00:25Z (`results/protocol-freeze.json`); no amendments.
Standard: pinned 2.2.0 (scope diagnostic; this study searches nothing); it **creates** standard 3.0.0.

## 1. Executive verdict

**ACCEPTED** (`config/gpu-backend/acceptance.json`, written 2026-11-19T13:02:54Z by `tools/gpu-phase2/accept.ts` after
every gate of PROTOCOL.md §10 passed; G8 under amendment A1).

- **Every official optimization evaluation is GPU-executed:** the only official path is `openOfficialGpuSession` →
  `GpuPool` → `EvalLab`; it contains no CPU evaluation code, every batch carries a device receipt, and the conservation
  invariant (CPU-scored = 0) withholds any batch that violates it. Legacy CPU runners refuse `official-optimization`.
- **Refusal before expensive work:** the gate checks purpose, acceptance, build, device, the whole reachable domain's
  capabilities, a live smoke kernel, VRAM and a parity mini-set before a single search evaluation (35/35 negative tests).
- **Growth 1.4.0 is fully GPU-supported** (all 8,640 structures and every conditional gene of the reachable genome),
  with D1/RC, the pool with every option and the risk-envelope inputs.
- **Bit-exact:** 0 differences anywhere (campaign 144,795 candidates; two complete sealed Assignment 3 jobs; 48 sealed
  finalists; fixed-seed mini-optimization; 35,040 endurance parity samples); no documented difference remains.
- **Speed:** ≈ 5.2× end-to-end on complete optimizer jobs (5.22× search, 5.24× qualification), 5.4–9.2× on large
  batches; bounded by the Node main thread, not the GPU.
- **Endurance:** 8 h (shortened from 24 h by the user, A1): 23.95 M evaluations, 0 GPU errors, stable memory and
  throughput.
- Official GPU optimization **may now be authorized by the user**; this study started none (the deferred risk-envelope
  pilot was not started).

## 2. What was built

| Component | Content | Where |
|---|---|---|
| CUDA evaluator (protocol v2) | separate server process, framed binary IPC; D1/RC books (both symbols), the complete **Growth 1.4.0** book (both symbols), the one-slot L0 pool with every option, the detailed record's evidence and the risk-envelope inputs; device receipts (UUID, nonce, execution counters, FNV-1a-64 output checksum); smoke kernel; kernel watchdog; loop guards; capacity statuses; test-only fault hooks | `src/gpu-backend/cuda/` (3,537 lines: `gb_growth.cuh` 1,360, `gb_d1.cuh` 587, `gb_pool.cuh` 391, `gb_server.cu` 644, `gb.h`, `gb_common.cuh`, `v8math.cuh`) |
| Bit-exact numerics | binary64, no FMA contraction, IEEE div/sqrt, JavaScript operation order, `Math.max/min` NaN/±0 semantics, V8's fdlibm `log`/`exp` port, host-computed percentages | `v8math.cuh`, `encode.ts` |
| Host client | dataset export of the CPU loader's exact arrays (dataset v2), encoder, decoder with receipt verification, the canonical records by the UNCHANGED CPU reductions | `src/gpu-backend/{client,encode,dataset,layout,canon}.ts` |
| Optimizer integration | `GpuPool` (Assignment 3's `Pool` contract: batching across lanes, pipelining, GPU-only capacity retries, receipt ledger, conservation, telemetry, batch timeout) and `EvalLab` (Assignment 3's Lab semantics, backend in the archive binding); Assignment 3's search and qualification code runs on them unchanged | `src/gpu-backend/{pool,lab}.ts` |
| Policy and enforcement | execution purposes, the official gate `openOfficialGpuSession` with the live preflight and attestation, acceptance record, compatibility manifest, reachable-domain capabilities, legacy-runner purpose gate on every research npm script, entrypoint registry, preflight §9 rules, policy and merge-gate tests | `src/gpu-backend/{official,acceptance,compat,domain,purpose,legacyRunner,entrypoints}.ts`, `src/research-standard/gpuPolicy.ts`, `config/gpu-backend/` |
| Documentation | root `CLAUDE.md` mandatory section; standard **3.0.0** §9 (registry, change log, templates); PR template; CONTRIBUTING; `docs/gpu/` (operations, parity checklist, feature matrix) | see `GPU_PHASE2_POLICY_AND_ENFORCEMENT.md` |
| Study harness and tools | parity campaign, sanitizer, negative tests, mini-optimization, A3 job replays, benchmarks, stress, acceptance, manifest, bundle | `src/gpu-phase2/`, `tools/gpu-phase2/`, `tools/gpu-backend/`, `research/gpu-phase2/chains/` |

Phase 2a (D1/RC/allocator + optimizer integration) and Phase 2b (Growth 1.4.0 in tranches 1–3) are both complete;
the tranche gate TR1 passed (§5). No hybrid (Growth on the CPU) was ever built as an official path.

## 3. Gates (PROTOCOL.md §9)

| Gate | Result | Evidence |
|---|---|---|
| T0 toolkit + sanitizer on the real kernels | **pass** — user-space CUDA 13.2.2 toolkit; memcheck (leak check), racecheck, initcheck, synccheck: 0 errors on the final binary, 97/97 results still identical | `results/sanitizer-final/` |
| P1 policy text | **pass** — `CLAUDE.md`, standard 3.0.0 registered (sha256 `4e8244e6…`), templates, PR template, CONTRIBUTING | `GPU_PHASE2_POLICY_AND_ENFORCEMENT.md` |
| P2 one authoritative gate, live preflight, receipts, conservation | **pass** — demonstrated by the negative tests and the gate's refusal before acceptance | `results/policy/`, `results/runlogs/official-preflight-before-acceptance.txt` |
| P3 negative tests | **pass** — 35/35 on the final binary | `results/policy/negative-final.json` |
| P4 repository gate tied to digests | **pass** — MERGE GATE test, compatibility manifest compiled into the binary, acceptance pinned to source/binary/compiler/schema digests | `src/gpu-backend/tests/policy.test.ts` |
| G1 Growth books bit for bit | **pass** | campaign |
| G2 D1 books bit for bit | **pass** | campaign |
| G3 pool, records, risk inputs, every option | **pass** — 18 option sets, 64,063 envelopes | campaign |
| G4 reference identities, Growth on the GPU | **pass** — the five incumbents in every campaign run; Assignment 3's 48 sealed finalists identical to the CPU on D24 and FULL and equal to their sealed C24 figures to the cent | campaign (`--refs`), `results/parity/final-finalists.json` |
| G5 determinism | **pass** — 121 runs (batch 1 … 128, large, shuffled, repeat, restart), 0 | campaign |
| G6 coverage ≥ 100,000 random genomes + strata, zero mismatches | **pass** — 144,795 candidates, 141,600 random, 0 mismatches | `results/parity/final/SUMMARY.json` |
| G7 fixed-seed mini-optimization (+ resume) | **pass** — identical CPU vs GPU and after an interrupt/resume; plus two complete Assignment 3 jobs replayed identically | `results/optimizer/` |
| G8 stress (**8 h per amendment A1**, user directive; protocol: ≥ 24 h) | **pass** — 8.009 h from the original start, 731 rounds, 23,953,408 evaluations, 0 GPU errors, 35,040 CPU parity samples and 117 repeatability checks with 0 mismatches, VRAM peak 7,454 MiB, host-memory slope +1.9 MiB/h, throughput CV ≤ 2 % | `results/stress/summary.json` |
| G9 `npm test` = baseline + new; Strategy Lab on its CPU engine, suites pass, state untouched | **pass** — `npm test` 1,690 tests, 1,679 pass, 7 fail (the 7 known pre-existing), 4 skipped (baseline 1,680 / 1,669 / 7 / 4 + 10 new passing tests; Phase 1's live GPU test passed); Strategy Lab typecheck, lint, 314/314 unit, 81/81 e2e; live UI build and `state/strategy-lab/` untouched | `results/tests/` |
| B1 benchmarks | **done** | `GPU_PHASE2_BENCHMARKS.md` |
| TR1 tranche gate | **pass** — 5.22× end-to-end measured (≥ 3×) | `results/tr1-tranche-gate.json` |

## 4. Parity

Bit-identical everywhere, zero tolerance, no documented difference: the FINAL campaign (54 runs, 144,795 candidates:
books trade by trade, the pooled replay, compact and detailed records, risk-envelope inputs), two complete
Assignment 3 jobs replayed against their sealed records (search: 64 lanes, 1,242,714 evaluations; qualification: 385
members, 251,405 evaluations), the fixed-seed mini-optimization, 26,400 benchmark records, the sanitizer runs and
121 determinism runs. Details: `GPU_PHASE2_PARITY.md`.

## 5. Performance (measured)

- Complete optimizer jobs (Assignment 3 C19, D19): search **5.22×** (1,130.6 s vs 5,900.8 s; run 1 5.21×),
  qualification **5.24×** (238.5 s vs 1,249.5 s).
- Same tasks, batch 8,192, end-to-end incl. encode/decode: D19 7.9×, D24 9.2×, FULL 6.4× (pipelined pool 7.6× /
  6.5× / 5.4×); D1-only and Growth-fixed 4.2×, Growth-only 5.4×, detail + risk 6.9×.
- The end-to-end limit is the single Node main thread (encode 14 %, decode 26 %, optimizer logic 29 % of a job's wall
  time; GPU busy 31 %).
- Peak VRAM: 5.9 GB in the optimizer jobs (batch 8,192), 10.7–11.6 GB at batch 16,384 / pooled runs, 29.6 GB at the
  largest measured batch (49,152; ≈ 0.535 MiB per candidate). Host RAM: ≤ 10.5 GB for an optimizer job (the 12 CPU
  workers alone use 9–20 GB). Power ≤ 281 W, ≤ 55 °C.
- Projections (estimates): Assignment 3 scale 44.3 h → 8.3–9.6 h; Priority 3B scale 16.0 h → 2.5–3.1 h;
  Assignment 2 scale (Growth fixed) 31 h → 12.9–14.0 h; risk-envelope pilot 0.3–0.5 M evaluations ≈ 18–26 min (CPU
  ≈ 57–95 min). Details and limits: `GPU_PHASE2_BENCHMARKS.md`.

## 6. Policy activation status

- On `research/gpu-phase2`: standard 3.0.0 is the registered current version; the enforcement code is active (every
  research npm script requires a purpose; the official gate refuses without an ACCEPTED acceptance record).
  **The acceptance record exists and is ACCEPTED** (binary `3fe09e6791ff9996…`, device GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4,
  compat `f67dcb3bcc3ba896…`, 11 evidence files pinned); the gate opened on it
  (`results/gpu-attestations/preflight-2026-11-19T13-04-25-800Z.json`). Any change to a file of the compatibility
  manifest makes it STALE (official runs refused, `npm test`'s MERGE GATE fails) until the checklist is repeated.
- On `main`: MAIN_STATUS

## 7. No change to strategies, optimizer methods or frozen research

- None of the 94 files of the canonical evaluation path changed (`git diff 727681c0..HEAD` is empty for every file in
  the compatibility manifest's CPU set); no file under `src/` outside `src/gpu-backend/`, `src/gpu-phase2/` and
  `src/research-standard/` (`gpuPolicy.ts` added, `preflight.ts` calls it) changed; `apps/` unchanged.
- `package.json`: only the research/optimizer scripts' command lines changed (each now starts through the purpose
  gate); utilities, Strategy Lab and tests are unchanged.
- Assignment 3's search and qualification code ran unchanged and reproduced its own sealed records; no fitness,
  objective, budget, seed or selection rule changed; no completed study's protocol, record or fingerprint was edited,
  re-hashed or rerun (the replays wrote only into this study's namespace).
- No trading, no broker access, no deployment; the deferred risk-envelope pilot was not started.

## 8. Limitations and open items

- The end-to-end speedup (≈ 5×) is bounded by the Node main thread; worker-thread encode/decode is the next
  improvement and, being a host-path change, needs the full checklist and a new acceptance.
- Workloads with a fixed Growth book gain only ≈ 2–4× (the CPU caches the fixed book).
- Complete jobs were measured on D19; D21–FULL figures are model estimates from measured throughput.
- The enforcement relies on markers and registries for unregistered scripts (standard §9.12); a deliberately disguised
  CPU optimizer could evade the audit.
- TSLA/MSFT and other symbols need their own doors, data checks and parity campaigns before official use.
- The endurance run was 8 h, not 24 h (A1): faults rarer than about once per 8 h are not excluded.
- One ESLint style error (`client.ts:443`, a ternary used as a statement; behaviour correct) and 130 prettier warnings
  remain in files of the compatibility manifest; fixing them changes the digest, so it waits for the next change cycle.

## 9. Incidents and deviations (all disclosed in `RESEARCH_RECOVERY.md`)

| When (UTC) | What | Effect |
|---|---|---|
| 00:57–01:36 | a suspected GPU "hang" (D24-core determinism stage) | not a defect: batch size 1 runs 256 single-candidate kernels of 3–5 s; earlier units were stopped too soon; a kernel watchdog and loop guards were added as defence |
| 01:25–01:40 | development jobs overlapped on the GPU (PROTOCOL §8: one GPU job at a time) | timing only; all final gates ran strictly sequentially |
| 01:30 | first G7 resume refused (host code edited between interrupt and resume) | the archive binding worked as designed; rerun |
| 02:03 | A3 replay run 1's record encoded ±Infinity/NaN as null (91 fields, encoding only) | kept as a timing sample; run 2 with the sealed encoding is identical; study records now use the sealed encoding |
| 02:30 | bench tool closed a shared server twice | tool fix (keep-open proxy, also in the stress tool) before the final run; both dry-run clean |
| 09:2x | the user shortened the endurance test from 24 h to 8 h from its original start (amendment A1) | the running test was ended at the first round boundary after 12:55:53.744Z (SIGTERM right after a saved round; nothing discarded); G8 judged at 8 h |
| 13:03 | the gate's attestation recorded passed checks with their refusal wording | wording corrected in `official.ts` (outside the manifest); the gate was re-opened and both attestations are kept |
| 03:10 | the campaign's reference set lacked Assignment 3's 48 sealed finalists (PROTOCOL §5 R) | added a dedicated finalists parity run after the stress (`parity-finalists.ts`) |

## 10. Source commits

All on `research/gpu-phase2` (base `727681c0`), newest first; the final commit and push are in the final reply and
`RESEARCH_RECOVERY.md`.

- `b4cffd92` gpu-phase2: ACCEPTED — acceptance record written by accept.ts after every gate passed (T0, P1-P4, G1-G9; G8 per A1); npm test = baseline + 10 new pass
- `d8cc0482` gpu-phase2: G8 endurance run complete at 8 h from its start (A1): 731 rounds, 23.95 M evaluations, 0 GPU errors, 35,040 CPU parity samples and 117 rep
- `67042ed2` gpu-phase2: amendment A1 clarification — the 8 h run is the completed endurance test; no other stress run
- `71970998` gpu-phase2: amendment A1 (user directive) — G8 stress shortened to 8 h from its original start; round-boundary stop chain armed (tested on a stand-in)
- `b1bc97e3` gpu-phase2: handoff draft
- `2d1c9012` gpu-phase2: prepared documentation-only main integration (CLAUDE.md variant, file list)
- `78dd1ae1` gpu-phase2: post-stress chain armed; checkpoint
- `a7fe2495` gpu-phase2: formatting of non-manifest sources (compat digest unchanged; policy tests 10/10); accept.ts parses TAP output and checks the A3 finalists 
- `788eee21` gpu-phase2: Strategy Lab regression passes (typecheck, lint, vitest 314/314, e2e 81/81; live dist and state/strategy-lab untouched)
- `01fcc372` gpu-phase2: final gate 7 — FINAL parity campaign passes (54 runs, 144,795 candidates, 0 mismatches, 141,600 random genomes, 64,063 envelopes, determin
- `fb3f683f` gpu-phase2: Assignment 3 finalists parity tool (reference set R of PROTOCOL §5), CPU dry run reproduces sealed figures
- `38ab416a` gpu-phase2: final gate 6 — fixed-seed mini-optimization identical CPU vs GPU and after interrupt/resume (final binary)
- `7d8f44ac` gpu-phase2: final gates 3-5 — benchmarks (CPU vs GPU on the same tasks, sweeps, mixes, max batch 49,152, display), measured-derived projections, TR1 r
- `8a2f1782` gpu-phase2: bench/stress tools keep a shared GPU server open across pools (dry runs clean); chain relaunched from step 3
- `a9ae79ec` gpu-phase2: final gates 1-2 pass — A3 C19 broad1 search replay identical on the GPU (5.22x end-to-end) and A3 C19 broad qualification replay identical
- `5718aa5a` gpu-phase2: encode ±Inf/NaN in study records and archive hashes as the sealed records do; A3 C19 broad1 replay run 1 kept as a timing sample (5.21x; i
- `3a79f325` gpu-phase2: qualification replay step, live official-preflight CLI (refuses before acceptance; run log), operations guide, scope and feature matrix, m
- `ffb28177` gpu-phase2: FINAL binary frozen (reproducible stripped build 3fe09e67…, compat f67dcb3b…); final-gates chain; bench, stress, parity-summary, accept, A
- `42a0694f` gpu-phase2: standard 3.0.0 (§9 GPU-only official optimization and CPU/GPU parity; registry, templates), PR template, CONTRIBUTING, docs/gpu operations
- `60553b27` gpu-phase2: GPU policy and enforcement (purposes, acceptance record, compatibility manifest, reachable-domain capabilities, official gate with live pr
- `2f5bc24c` gpu-phase2: CUDA evaluator v2 (D1/RC books, Growth 1.4.0 book, pool with all options and risk-envelope inputs, receipts, smoke self-test), V8 log/exp 
- `8dad359e` gpu-phase2: brief, protocol (frozen), standard adoption 2.2.0 (diagnostic), freeze record, inventory, user-space CUDA 13.2.2 toolkit installer, saniti
