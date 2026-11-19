# Protocol — GPU acceleration Phase 2: complete parity, mandatory GPU optimization, verified performance

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
real-data parity or benchmark run). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

This study completes the GPU evaluator for the repository's official optimization domain, proves CPU/GPU parity for it,
institutes the user's permanent **GPU-only, fail-closed, parity-gated** policy for official optimization (documentation
**and** executable enforcement), and measures real end-to-end performance on Apollo's RTX 5090 now that vLLM is gone.
It is an **engineering study**: it does not search for, select, rank, adopt or deploy any trading configuration, does
not run the deferred 40% / 25% / 25% risk-envelope pilot or any official optimization, and changes no trading rule,
fitness, budget, random stream, selection rule or sealed result.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.2.0`, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` (read in full, §0–§8, 2026-11-19) |
| Adoption manifest | `research/gpu-phase2/STANDARD_ADOPTION.json`; preflight `npm run research-preflight -- --study research/gpu-phase2` |
| Scope | `diagnostic` (bounded engineering runs of frozen identities and seeded test configurations; one parity-only fixed-seed mini-search, AD8) |
| Brief | `research/gpu-phase2/brief/BRIEF.md`, sha256 `25c1fa47b1d806c5d9d38950a81934b11f65f97e64ebf346e957d163bdd2459d` |
| Branch / base | `research/gpu-phase2` from `727681c06de4bbd06d56f1bd063cdef0d4f632f5` (tip of `research/gpu-phase1-feasibility`) |
| Standard change made by this study | the brief (§1) authorizes the GPU policy as normative text: a **new major version 3.0.0** (a mandatory rule is added, standard §7.4), registered with its change-log entry. This study itself keeps its pinned 2.2.0 (it is not an official optimization); studies adopting 3.0.0 or later are bound by it. |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | No roles, no primary: nothing is selected. Outcomes are engineering gates (§9) and a readiness verdict (§10). |
| AD2 | §4, §1.8 | adaptation | No official search, no earlier-cutoff repeat, no chronological verdict (a diagnostic never searches); the only search-shaped run is the parity-only mini-optimization (AD8). |
| AD3 | §1.2, §1.4 | adaptation | FULL (2016-01-04 → 2026-10-30) is opened for the frozen reference identities (published, sealed figures) and, for parity and timing only, seeded test configurations — as Phase 1 AD3, through Priority 3's loader under its guard, quietly, logged in this study's `results/doors.jsonl`. All of 2016–2026 is previously examined history. |
| AD4 | §5.1 | adaptation | The TypeScript/CPU engine is the unmodified canonical reference. The CUDA evaluator is a second implementation that must match it bit for bit (zero tolerance) on every supported feature (§9 G-gates). |
| AD5 | §5.9 | adaptation | Not applicable: no fold primary or final candidate. The §5.9 inputs that need historical evaluation data (open-lot share, per-lot MAE, exposure) are produced by the GPU detailed record and gated for parity (G3). |
| AD6 | §6.3 | adaptation | No worker tuning for a search. The CPU baseline is Assignment 3's production configuration (12 child-process workers, its own `Pool`) and, for context, 8 and 16. Heavy runs are contained in systemd units under one slice (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0). |
| AD7 | §1.5 | adaptation | Stricter: no money figure of any non-reference configuration is reported; seeded and searched configurations appear only as parity booleans, counts, hashes and timings. Timings never select, tune or rank trading parameters. |
| AD8 | §4 | adaptation | A bounded, **non-official, parity-only** fixed-seed mini-optimization (brief §4.2) runs Assignment 3's unchanged search code twice from the same seeds — once with the CPU worker pool, once with the GPU pool — on a reduced schedule (§7). Its outcomes are compared by identity and hash only; they are never selected, reported as performance, or used as a seed, range or incumbent anywhere. |

## 1. Question, objective and outcomes

- **Question A (correctness):** does the CUDA evaluator reproduce the canonical CPU engine **bit for bit** for every
  feature reachable by the official optimization domain (§3), including Growth 1.4.0 executed on the GPU?
- **Question B (policy):** can official optimization be made GPU-only and fail-closed, with every historical evaluation
  attested as GPU-executed, CPU fallback impossible on the enforced path, and future CPU-engine changes blocked until
  their GPU parity evidence exists?
- **Question C (performance):** what are the measured end-to-end speed-ups, VRAM/RAM use and throughput against the
  production 12-worker CPU configuration, and the measured-derived runtimes of the requested workloads?
- **Outcomes:** ACCEPTED (official GPU optimization may be authorized by the user), or NOT ACCEPTED with the exact
  blockers. A slower or narrower evaluator is an acceptable result; an incorrect one is not. Parity is never waived to
  obtain a speed-up, and a CPU/GPU hybrid is never declared compliant with the GPU-only policy.

## 2. Prior knowledge (Phase 1, to be re-measured, never assumed)

- Phase 1 (`research/gpu-phase1-feasibility/`, CONDITIONAL GO): bit-exact D1 books + RC 1/RC 2 + L0 pool on 1,658
  market subjects and 960 fixtures; Growth on the CPU; hybrid 1.65–1.97× joint, 4.7–6.9× Growth-fixed, all at
  ≈ 2.8 GiB of free VRAM beside vLLM. Growth ≈ 50–64% of a D24 evaluation's CPU time (43.6 ms of ≈ 87 ms).
- Assignment 3 (`research/vg-l0-full-joint/`): 17.53 M fresh search simulations + 1.64 M qualification in 44 h 24 min
  on 12 workers. Assignment 2: 34.21 M in ≈ 31 h.
- The reference identities' sealed targets: as Phase 1 PROTOCOL §2 (New L0 FULL net $479,605.18, DD $20,385.99, 46 lots,
  signature `7b17578108747911`; N/original FULL $482,700.73, 44 lots, `54d1c2e07c2dbbfd`).

## 3. The official optimization domain (what the GPU must cover)

The domain is the latest optimizer's complete evaluation path and every option its search, qualification, robustness
and validation stages use (Assignment 3, `src/vg-l0-full-joint/` → `src/vg-l0-risk-families/evaluate.ts` →
`src/d1-risk-controls-rc2/run.ts` → `src/vg-d1-growth-joint/{books,pool,evaluate}.ts` → `src/growth-trading/`), plus
the risk-envelope inputs the deferred pilot needs (`research/vg-l0-risk-metrics/PROPOSED_METHOD.md` §1):

1. D1 books (both symbols): deep entry, trailing buy, post-exit continuation, flat-since-open, net-profit trailing stop,
   calendar maximum hold, buffered loss and its carry, gap/open/low stop fills (`stop` and `next-open`), arming start,
   costs, slippage, interest — with RC 1/RC 2 families A–D, both activations, the decline gate, every control gene.
2. Growth 1.4.0 books (both symbols; Growth·GDX is disabled in the V structure but supported): Rise and trend-breakout
   entries; the five trend filters; the five eligibility policies with the renewal watch; the Drawdown Recovery Gate
   (minute observations, releases); trailing stop, maximum hold, buffer; the ATR initial stop; retention partial sales;
   the four continuation methods; every numeric gene of the 8 + 50 genome (coarse and fine grids); costs, interest,
   slippage, and `next-open` stops where Growth supports them (Priority 3's `growthNextOpenSupported`).
3. The one-slot L0 pool with every `EvalOptions` field: friction stresses, `d1Arm`, `fundFrom`, `enabled`,
   `wholeShares`, `blackouts`, `boundaries` (period drawdowns), `tieOrder`, D1-first/Growth-first; detail mode (lots'
   worst/best marks, funding log) for the detailed record; the compact record and the detailed record (`DRec`).
4. Risk-envelope inputs: maximum trade principal loss (liquidation basis, intratrade) and banked-capital drawdown,
   computed from the pooled replay exactly as `src/vg-l0-risk-metrics/metrics.ts` defines them.

Outside the domain (blocked for official optimization, recorded as such, never CPU-fallback-compliant): L1/L2 funding
lifecycles and shadow-position eligibility (experimental study namespaces), the trading-session hold unit (not on this
branch), D1 swing/breakeven modes and Growth signal resolutions other than `1d` (not reachable by the optimizer's
genome), minute-mark recording (`recordMarks`, chart/slice diagnostics). Each is a capability the GPU refuses explicitly.

## 4. Data, doors and windows

| Door / window | Use | Guard |
|---|---|---|
| D19, D21, D23, D24 | parity, benchmarks, the mini-optimization (D19 or D24) | Priority 3's byte-prefix pins |
| FULL | reference ledgers; parity and timing of seeded configurations (AD3, AD7) | Priority 3's FULL guard |
| W-QUIET, W-CRASH, W-BEAR, W-TREND | regime windows (Phase 1's definitions) | contiguous slices of D24 |
| Episodes 2020, 2022, 2025 | crash, bear and the 2025 slice | slices of FULL/D24 (2025 only from FULL, AD3) |
| Synthetic fixtures | adversarial cases (gaps, holidays, missing minutes, no closing print, equality at thresholds) | seeded generator |

Doors are opened quietly through Priority 3's loaders and logged in `results/doors.jsonl`; no other study's directory is
written. The GPU reads the CPU loader's exact in-memory arrays (and the CPU's own daily signal bars and per-session New
York offsets), exported to a versioned binary file — it never parses CSV or re-derives a price.

## 5. Subjects and coverage

| Set | Content |
|---|---|
| R | New L0, N/original, IJ1, C4, C4-refined and Assignment 3's sealed finalists (read from sealed, sha256-pinned records) |
| A | seeded random Assignment 3 genomes (`decode`, coarse and fine grids), uniform over every gene's levels: every cell, control and Growth structure occurs; **≥ 100,000 in all** over the doors |
| G | Growth-structure strata: every value of each of the 8 structural genes crossed with random numerics, so each trend method, eligibility policy, continuation method, exit structure, initial stop, retention, breakout and gate is exercised many times |
| B | branch-heavy D1 designs and boundary values of every numeric gene (box corners) |
| N | Assignment 3 neighbourhoods of the R set (rung-1 shape) |
| S | synthetic adversarial fixtures (D1 and Growth), seeded |
| O | stress options: cost 10/20 bps, rate 14%, slippage 25 bps, next-open stops, native arming, fundFrom, enabled toggles, wholeShares, blackouts, period boundaries, tie orders, Growth-first |

The exact tested distribution (counts per structure, per door, per option set) is recorded; coverage gaps are disclosed.

## 6. Precision and implementation rules

IEEE-754 binary64 for every price, level, P&L and time; FMA contraction off (`--fmad=false`), IEEE division and square
root, no fast-math; every expression in the CPU code's operation order; JavaScript `Math.max`/`Math.min` NaN and ±0
semantics; `Math.log`/`Math.exp` reproduced by a port of V8's own fdlibm-derived implementations (verified bit for bit
against Node on ≥ 10^7 inputs before use); percentage fractions and other derived constants computed on the host by the
CPU code's own expressions. Fixed per-candidate capacities raise explicit errors (never truncation); an overflowed
candidate is re-evaluated **on the GPU** with larger capacities. Each CPU throw maps to a per-candidate error status.

## 7. The fixed-seed mini-optimization (AD8)

A bounded Assignment 3-shaped job: Assignment 3's `search.ts` (unchanged) over a small declared set of cells on one
door with a reduced, declared schedule (screen, rung fitting, islands, rungs 2–3 and refinement each exercised), run
with (a) Assignment 3's CPU worker pool and (b) the GPU pool, same seeds, same archive binding except the backend field.
Compared: proposal sequences and IDs, every archived record (hash per row), fitness inputs, gates, ranks, promotions,
extension decisions, refinement endpoints, finalists, checkpoints, and a resume after an induced stop. Identity is
required.

## 8. Resources and recoverability

- CPU heavy runs: transient systemd user units in `gpup2.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0).
- GPU: re-measured free VRAM; one GPU job at a time; the desktop compositor stays on the RTX 5090.
- Every stage writes its records to `results/` as it completes; reruns are deterministic; this checkpoint
  (`RESEARCH_RECOVERY.md`) is updated at every milestone.

## 9. Gates

| Gate | Requirement |
|---|---|
| T0 | Toolkit installed in user space (no driver/apt/display/Docker change); compute-sanitizer **actually instruments** the real kernels (memcheck, racecheck, initcheck, synccheck) with zero errors; versions recorded |
| P1 | Policy text in root `CLAUDE.md` and standard 3.0.0 (registry, change log, templates, preflight) |
| P2 | One authoritative backend-policy gate used by every official entrypoint; purposes explicit; preflight runs a real kernel, checks device, digests, capabilities for the whole reachable domain, parity mini-set and memory; per-batch receipts and the conservation invariant (CPU-scored official evaluations = 0) |
| P3 | Negative tests (brief §1.2, §4.3): no CUDA, wrong GPU, failed smoke kernel, source-hash mismatch, unsupported Growth structure in the domain, OOM, killed server, corrupt/incomplete batch, invalid timestamps, runtime fault, forced CPU backend, mid-run CPU routing, resume with a changed binary/source/config, missing receipts — each refuses or terminates with no CPU-scored evaluation |
| P4 | A repository test gate fails when a mirrored CPU source changes without regenerated GPU acceptance evidence; the GPU acceptance record is tied to source, binary, compiler and data-schema digests |
| G1 | Growth book parity: every virtual trade (decision, entry, every exit fill, reasons, nets, interest, open state) and the standalone figures bit for bit, per structure stratum |
| G2 | D1 book parity (as Phase 1 G2) on the v2 evaluator |
| G3 | Pool, compact record, detailed record and risk-envelope inputs bit for bit (every option of §3.3–§3.4) |
| G4 | Reference identities (R) on FULL and D24: full ledgers, funding logs and sealed figures, **Growth on the GPU** |
| G5 | Determinism: batch sizes 1, 7, 13, 16, 32, 50, 64, 128 and large; shuffled order; repeats; server restarts |
| G6 | Coverage: ≥ 100,000 seeded random genomes plus strata G, B, N, S, O on the doors of §4, zero mismatches |
| G7 | Fixed-seed mini-optimization identical on both backends (§7), including a resumed run |
| G8 | ≥ 24 h continuous GPU run at production batch sizes with periodic CPU parity samples and repeatability checks, no error, telemetry recorded |
| G9 | Repository suite: `npm test` equals the pre-Phase-2 baseline plus the new tests (known pre-existing failures listed separately); Strategy Lab still evaluates on its CPU engine, its suites pass, `state/strategy-lab/` untouched |
| B1 | Benchmarks (only after G1–G6): fair protocol of brief §5.1; measured-derived projections |
| TR1 | Tranche gate (after Growth tranche 1): measured GPU Growth cost and projected end-to-end acceleration ≥ 3× on an Assignment 3-shaped workload, else stop and document |

Tolerance: zero. Any mismatch is traced to its cause and reported; it blocks acceptance of the feature it touches.

## 10. Verdict

- **ACCEPTED** iff T0, P1–P4 and G1–G9 pass for the whole domain of §3 (Checkpoint B). Then official GPU optimization
  may be authorized by the user; this study never starts one.
- Otherwise **NOT ACCEPTED**: official optimization stays blocked by the enforcement code; the report lists every
  blocker. A partial evaluator is never presented as compliant.

## 11. Integrity

- No sealed record of any study is written. Phase 1 code is imported, never edited. Completed studies are never rerun
  except as declared read-only parity references (their sealed values are compared, not rewritten).
- This study's records carry sha256 in `results/seals.jsonl`; compiled binaries and exported datasets are git-ignored.

## 12. Reporting commitments

Text, Markdown tables and JSON/CSV only (standard §7.7): `GPU_PHASE2_REPORT.md`, `GPU_PHASE2_FEATURE_MATRIX.md`,
`GPU_PHASE2_PARITY.md`, `GPU_PHASE2_BENCHMARKS.md`, `GPU_PHASE2_POLICY_AND_ENFORCEMENT.md`, `GPU_PHASE2_OPERATIONS.md`,
`GPU_PHASE2_HANDOFF.md`, `PHASE2_SCOPE_AND_FEATURE_MATRIX.md`, `MANIFEST.json`, run command logs and
`bundle/gpu-phase2-report-bundle.zip` (verified, with checksums; no market data, secrets or toolchain binaries).
