# GPU Phase 2 — handoff for the Margin Trading conversation

**Forward this document first.** It is self-contained; the detailed reports are listed at the end.

## 1. What was asked and what was done

The Phase 2 brief asked for (a) a complete CUDA evaluator for everything the current official optimizer can reach —
D1 with the risk controls, **Growth 1.4.0 in full**, the one-slot L0 pool with every option, and the risk-envelope
inputs — bit-exact with the TypeScript engine; (b) **mandatory GPU-only official optimization with no CPU fallback**,
enforced in code and written into the repository's rules; (c) a permanent parity policy for every future strategy
change; (d) verification (parity, determinism, sanitizer, negative tests, a fixed-seed optimizer comparison, a 24 h
stress test, the repository and Strategy Lab suites); and (e) real benchmarks and projections. All of it was built and
run on Apollo's RTX 5090 (vLLM absent, ≈ 31 GB free), on branch `research/gpu-phase2`.

**Verdict:** **ACCEPTED.** Every gate of the frozen protocol passed on the final binary (the endurance gate at 8 h by the user's amendment A1). The evaluator is complete for the reachable domain, bit-exact, ≈ 5× faster end to end on real optimizer jobs, and official optimization is GPU-only with no CPU fallback. No official optimization was started.

## 2. Decisions made (and why)

| Decision | Reason |
|---|---|
| TypeScript stays the authoritative engine and Strategy Lab's evaluator; CUDA C++ mirrors it (no Python, no shared source) | the brief; it keeps every study reproducible on the CPU |
| One GPU thread per (candidate, book), D1 and Growth on two streams, then the pool; records computed by the **unchanged** CPU reductions of the GPU's books and pooled replay | exactness first: the fitness inputs are produced by the same code as on the CPU |
| binary64, no FMA, IEEE div/sqrt, JavaScript operation order, V8's `log`/`exp` ported | bit-exactness (a 1-ULP difference would be a defect, not a tolerance) |
| A separate server process with device receipts (UUID, nonce, execution counters, output checksum) | an evaluation cannot be attributed to the GPU without proof; corruption and stalls are detected |
| A single official gate with a live preflight (real kernel, device, digests, capability coverage of the whole reachable domain, VRAM, parity mini-set) and an acceptance record | "official optimization must never spend days on the CPU": every failure mode refuses before work starts |
| Standard **3.0.0** (major) with a new §9, rather than editing an older version | a mandatory rule was added; frozen studies keep their pins |
| Every legacy CPU research script now needs an explicit non-official purpose | a CPU optimizer can no longer start by accident or be mistaken for an official run |
| Assignment 3's own search and qualification code runs unchanged on the GPU pool | no optimizer method changed; replays of its sealed jobs prove it |

## 3. Requirements: satisfied / missing

| Requirement | Status |
|---|---|
| Every reachable D1, RC, Growth (all 8,640 structures and conditional genes), pool, option, record and risk-envelope feature on the GPU | **satisfied** — no reachable official feature is unported; out-of-domain features are refused by capability bit |
| Bit-exact parity | **satisfied** — 0 mismatches in 144,795 campaign candidates (141,600 random genomes, every door, window, episode, fixture and option set), two complete sealed Assignment 3 jobs replayed identically, Assignment 3's 48 sealed finalists identical (and equal to their sealed figures to the cent) |
| Determinism | **satisfied** — 121 runs (batch 1 … 128, large, shuffled, repeat, restart): 0 differences |
| Fixed-seed optimizer identity (incl. resume) | **satisfied** — CPU = GPU = interrupted/resumed GPU |
| No CPU fallback, fail closed, refusal before expensive work | **satisfied** — 35/35 negative tests on the final binary; the gate refuses today (no acceptance record yet existed during the tests) |
| Working compute-sanitizer on the real kernels | **satisfied** — memcheck, racecheck, initcheck, synccheck: 0 errors |
| ≥ 24 h stress with CPU parity samples | **satisfied at 8 h** (shortened from 24 h by the user, amendment A1): 8.009 h, 23,953,408 evaluations, 0 GPU errors, 35,040 CPU parity samples and 117 repeatability checks with 0 mismatches, peak VRAM 7,454 MiB, host memory flat (+1.9 MiB/h), throughput variation ≤ 2 %, ≤ 59 °C, no throttling |
| `npm test` and Strategy Lab regression | **satisfied** — `npm test` 1,690 tests, 1,679 pass, only the 7 known pre-existing failures, 4 skipped (= baseline + 10 new passing tests); Strategy Lab: typecheck, lint, 314/314 unit tests, 81/81 e2e, live UI build and `state/strategy-lab/` untouched |
| Policy in `CLAUDE.md` and the standard, templates, PR/contribution checklists, executable enforcement and tests | **satisfied** on the research branch; documentation also on `main` (`main` commit `10ca3422`, documentation only) |
| Benchmarks and projections | **satisfied** — see §4 |

## 4. Measured speed and memory

| Measurement | Result |
|---|---|
| Assignment 3's sealed C19 broad1 search (64 lanes, 1.24 M evaluations), replayed on the GPU | **18.8 min vs 98.3 min on 12 CPU workers = 5.22×**, identical result |
| Assignment 3's sealed C19 broad qualification (385 members, 251 k evaluations) | **238.5 s vs 1,249.5 s = 5.24×**, identical evidence |
| Same tasks, one batch of 8,192, end-to-end | D19 7.9×, D24 9.2×, FULL 6.4× (D1-only / Growth-fixed 4.2×, detail + risk 6.9×) |
| Peak VRAM | 5.9 GB in optimizer jobs; 29.6 GB at the largest measured batch (49,152; ≈ 0.54 MB per candidate) |
| Peak host RAM | ≤ 10.5 GB per optimizer job (the 12-worker CPU pool needs 9–20 GB) |
| Power / temperature | ≤ 281 W of 600 W, ≤ 55 °C |
| What limits the speedup | the single Node.js main thread (encode, decode, optimizer logic ≈ 69 % of a job); the GPU is busy ≈ 31 % |

## 5. Projected runtimes (estimates from the measurements)

| Workload | CPU | GPU |
|---|---:|---:|
| Risk-envelope pilot, 0.3–0.5 M evaluations in total (incl. the 35 % control and the 40 / 25 / 25 % arms, qualification, gate preflights) | ≈ 57–95 min | **≈ 18–26 min** |
| Priority 3B scale, 5.83 M | 16.0 h | **2.5–3.1 h** |
| Assignment 3 scale, 17.5 M search + 1.6 M qualification | 44.3 h | **8.3–9.6 h** |
| Assignment 2 scale, 34 M (Growth fixed; the CPU caches the fixed book, the GPU recomputes it) | 31 h | **12.9–14.0 h** |
| Staged trailing-stop studies | — | ≈ 2–4× (D1-focused) to ≈ 5× (joint) faster than the CPU |
| TSLA / MSFT | — | unknown until their doors, data checks and a parity campaign exist |

## 6. Policy status

- Root `CLAUDE.md` (read by every new session) opens with the mandatory GPU-only / parity section; standard
  **3.0.0** §9 is the normative text; `docs/gpu/` holds the checklist, the feature matrix and the operations guide.
- **ACCEPTED** (2026-11-19T13:02Z): `config/gpu-backend/acceptance.json` on `research/gpu-phase2` pins binary `3fe09e67…`, the RTX 5090 `GPU-ae5f222c…`, the compatibility digest of the 94 CPU sources + CUDA + host path, and 11 evidence files; the official gate opens on it (its parity mini-set 18/18 identical). Any change to an evaluation dependency makes it STALE until the parity checklist is repeated (the merge-gate test enforces this).
- Merges and approvals still needed: (1) merging the GPU engine and enforcement code into `main` (only documentation is there now; until then official GPU optimization runs from `research/gpu-phase2`); (2) authorizing each official study (none was started).

## 7. Concerns

- The speedup is ≈ 5× end-to-end, not the 10–30× the kernels alone could give: the host main thread is the limit.
  Worker-thread encode/decode is the next step; it changes the host path, so it needs the full checklist and a new
  acceptance.
- Growth-fixed searches (like Assignment 2) gain only ≈ 2–4×.
- Complete jobs were measured on D19; longer doors are projected from measured throughput.
- The entrypoint audit is marker-based; a deliberately disguised CPU optimizer could evade it (review remains
  necessary).
- The endurance test ran 8 h, not 24 h (your amendment): faults rarer than about once per 8 h are not excluded.
- One lint style error and 130 formatting warnings remain in host-path files of the compatibility manifest (fixing them needs a re-acceptance).

## 8. Next actions (the user's decisions)

1. Review this handoff and `GPU_PHASE2_REPORT.md`.
2. Decide whether to merge the GPU engine and enforcement code into `main` (recommended before the next official study; otherwise run it from `research/gpu-phase2`).
3. **The deferred risk-envelope pilot can now be authorized** — acceptance is not blocked. It needs a study that adopts standard 3.0.0 (`evaluationBackend: gpu-required`), passes `npm run research-preflight`, and runs through `openOfficialGpuSession` → `GpuPool` → `EvalLab` (Assignment 3's search and qualification code already run unchanged on them). Projected ≈ 20–30 min of GPU time for 0.3–0.5 M evaluations. It was **not** started.
4. Optional engineering (needs the parity checklist and a new acceptance): worker-thread encode/decode for ≈ 1.5–2× more end-to-end speed.

## 9. Where everything is

- Branch `research/gpu-phase2` (pushed; final commit in the final reply). Study directory `research/gpu-phase2/`.
- Reports: `GPU_PHASE2_REPORT.md` (full report), `GPU_PHASE2_PARITY.md`, `GPU_PHASE2_BENCHMARKS.md`,
  `GPU_PHASE2_FEATURE_MATRIX.md`, `GPU_PHASE2_POLICY_AND_ENFORCEMENT.md`, `GPU_PHASE2_OPERATIONS.md`,
  `PHASE2_SCOPE_AND_FEATURE_MATRIX.md`, `PROTOCOL.md`, `MANIFEST.json`, `RUN_COMMANDS.md`.
- Portable bundle: `research/gpu-phase2/bundle/gpu-phase2-report-bundle.zip` (documents, machine-readable evidence,
  manifest and checksums; no market data, secrets, binaries or toolchain).
