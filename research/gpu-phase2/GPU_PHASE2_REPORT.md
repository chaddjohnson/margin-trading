# GPU Acceleration Phase 2 — report

Study `research/gpu-phase2/` on branch `research/gpu-phase2` (Apollo, RTX 5090). Brief: `brief/BRIEF.md` (sha256
`25c1fa47…459d`). Protocol: `PROTOCOL.md`, frozen 2026-11-19T00:25Z (`results/protocol-freeze.json`); no amendments.
Standard: pinned 2.2.0 (scope diagnostic; this study searches nothing); it **creates** standard 3.0.0.

## 1. Executive verdict

VERDICT_SECTION

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
| G4 reference identities, Growth on the GPU | FINALISTS_GATE | campaign (`--refs`), `results/parity/final-finalists.json` |
| G5 determinism | **pass** — 121 runs (batch 1 … 128, large, shuffled, repeat, restart), 0 | campaign |
| G6 coverage ≥ 100,000 random genomes + strata, zero mismatches | **pass** — 144,795 candidates, 141,600 random, 0 mismatches | `results/parity/final/SUMMARY.json` |
| G7 fixed-seed mini-optimization (+ resume) | **pass** — identical CPU vs GPU and after an interrupt/resume; plus two complete Assignment 3 jobs replayed identically | `results/optimizer/` |
| G8 ≥ 24 h stress | STRESS_GATE | `results/stress/summary.json` |
| G9 `npm test` = baseline + new; Strategy Lab on its CPU engine, suites pass, state untouched | G9_GATE | `results/tests/` |
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
  ACCEPTANCE_STATUS
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
- OPEN_ITEMS

## 9. Incidents and deviations (all disclosed in `RESEARCH_RECOVERY.md`)

| When (UTC) | What | Effect |
|---|---|---|
| 00:57–01:36 | a suspected GPU "hang" (D24-core determinism stage) | not a defect: batch size 1 runs 256 single-candidate kernels of 3–5 s; earlier units were stopped too soon; a kernel watchdog and loop guards were added as defence |
| 01:25–01:40 | development jobs overlapped on the GPU (PROTOCOL §8: one GPU job at a time) | timing only; all final gates ran strictly sequentially |
| 01:30 | first G7 resume refused (host code edited between interrupt and resume) | the archive binding worked as designed; rerun |
| 02:03 | A3 replay run 1's record encoded ±Infinity/NaN as null (91 fields, encoding only) | kept as a timing sample; run 2 with the sealed encoding is identical; study records now use the sealed encoding |
| 02:30 | bench tool closed a shared server twice | tool fix (keep-open proxy, also in the stress tool) before the final run; both dry-run clean |
| 03:10 | the campaign's reference set lacked Assignment 3's 48 sealed finalists (PROTOCOL §5 R) | added a dedicated finalists parity run after the stress (`parity-finalists.ts`) |

## 10. Source commits

COMMITS_SECTION
