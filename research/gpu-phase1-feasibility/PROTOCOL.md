# Protocol — GPU acceleration Phase 1: feasibility and proof of concept (RTX 5090)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
real-data run). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

This study measures whether the existing research optimizer (Assignment 3's evaluation path: RC 2's controlled D1
books, Priority 3's Growth books, Priority 3's one-slot pooled replay and compact record) can be accelerated on Apollo's
RTX 5090 **without changing a single research decision**. It builds a research-isolated CUDA proof of concept for a
representative slice, proves CPU/GPU decision-level parity on that slice and measures realistic speed. It does **not**
search, optimize, select, rank, adopt or deploy anything, does not integrate a GPU backend into any research runner,
and does not run the deferred risk-envelope pilot.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.2.0`, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24` |
| Read / adopted (UTC) | read in full (§0–§8) by 2026-11-18T18:19:46Z; adoption time in `STANDARD_ADOPTION.json` |
| Adoption manifest | `research/gpu-phase1-feasibility/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/gpu-phase1-feasibility`) |
| Scope | `diagnostic` (bounded engineering runs of frozen selections and seeded test configurations; no search) |
| Brief | `research/gpu-phase1-feasibility/brief/BRIEF.md`, sha256 `5b95c198d5c1ae8ad8d4e8df9c7896b268fbd7123b63fed858317bd985a68ad4` |
| Branch / base commit | `research/gpu-phase1-feasibility` from `6afbfe67af63ced8b93958c5130d00d7a65aebc2` (tip of `research/vg-l0-risk-metrics`) |
| Reference method | none reproduced. NL0 1.0.0 (`docs/research/methods/NEW_L0_METHOD.md`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`) is read for its budget and stage allocation (whole-study projections) only |

### Adaptations and departures

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | No roles and no primary: nothing is selected (`objective.prioritizes = not-applicable`). Outcomes are engineering gates and a GO / CONDITIONAL GO / NO-GO verdict (§12). |
| AD2 | §4, §1.8 | adaptation | No search, no earlier-cutoff repeat, no chronological verdict (a diagnostic never searches); the §1.8 consequence does not arise. |
| AD3 | §1.2, §1.4 | adaptation | FULL (2016-01-04 → 2026-10-30) is opened for (a) the frozen reference identities New L0 and N/original, whose full-history figures are published and sealed, and (b) seeded test configurations **for parity and timing only** (brief §1: "include the full dataset where feasible"). Opened through Priority 3's loader under its guard (`research/vg-d1-growth-joint/FROZEN_SELECTION.json`, sha256 `e29e35e2…`), quietly, and logged in this study's `results/doors.jsonl`. |
| AD4 | §5.1 | adaptation | The CPU engine is the canonical reference and is not modified. The GPU proof of concept is a second implementation of a declared slice; canonical parity is gates G2–G5 (bit-exact, zero tolerance). |
| AD5 | §5.9 | adaptation | Not applicable: no fold primary or final candidate. |
| AD6 | §6.3 | adaptation | No worker-count tuning for a search. The CPU baseline is measured at the production worker count of Assignment 3 (12, its chain's `--workers 12`) and, for context, at 1, 8, 14 and 16. Heavy runs are contained in systemd units under one slice with MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0. |
| AD7 | — | study rule | **No new performance figure of a non-reference configuration.** Seeded test configurations are reported only as parity booleans, counts (trades, lots, decisions), hashes and timings — never a net, drawdown or P&L. Only New L0 and N/original appear with money figures, and only as reproductions of their sealed values. No timing result is ever used to choose, tune or rank trading parameters (brief §1). |

## 1. Question, objective and outcomes

- **Question:** can Apollo's RTX 5090 evaluate the optimizer's candidates substantially faster than the production CPU
  configuration while reproducing the CPU engine's trades, funding decisions, marks and fitness inputs exactly?
- **Valid outcomes:** GO, CONDITIONAL GO or NO-GO (brief §7), each with its evidence. A slower, less accurate or
  incomplete GPU path is an acceptable result; an incorrect research result is not.

## 2. Prior knowledge and provenance

- Throughput priors (to be re-measured, never assumed): Priority 3 measured one D24 evaluation at ≈106 ms on one quiet
  thread (D1 books ≈20 ms, Growth ≈72 ms, pool ≈14 ms; `research/vg-d1-growth-joint/PROTOCOL.md`). Assignment 3's bench:
  96.7–99.0 evaluations/s at 10–16 workers on D24, flat beyond 10 workers (8 physical cores); its chain ran 12 workers,
  17.53 M fresh search simulations + 1.64 M qualification in 44 h 24 min (`research/vg-l0-full-joint/REPORT.md`).
- The reference identities' sealed targets (FULL): New L0 net $479,605.18, DD $20,385.99, 46 lots, signature
  `7b17578108747911`; N/original net $482,700.73, DD $20,385.99, 44 lots, signature `54d1c2e07c2dbbfd`
  (`research/vg-l0-full-joint/results/validation/validation.json`, `research/vg-l0-risk-metrics/results/baseline/parity.json`).
- All of 2016-01-04 → 2026-10-30 has been examined by earlier studies.

## 3. Data, doors and windows

| Door / window | Sessions | Use | Guard |
|---|---|---|---|
| D19, D21, D23, D24 | 1,006 / 1,511 / 2,012 / 2,264 | profiling, parity, benchmarks | Priority 3's byte-prefix pins (size, sha256, last row) |
| FULL | 2,723 | reference ledgers; parity and timing of seeded configurations (AD3, AD7) | canonical files `data/GDX/data.csv` `77dba9b2…`, `data/VGT/data.csv` `2ee06310…`; Priority 3's guard |
| W-QUIET | 2017-01-03 → 2017-12-29 | regime windows (profiling, parity) | contiguous session slices of D24, built with Priority 3's `fixtureDoorOf` |
| W-CRASH | 2019-10-01 → 2020-12-31 | crash and recovery | as above |
| W-BEAR | 2021-11-01 → 2023-03-31 | extended drawdown | as above |
| W-TREND | 2023-01-03 → 2024-12-31 | strong trend | as above |

Windows start fresh (D1 reference highs and Growth indicators have no earlier history); both engines see the identical
`Dataset`. Doors are opened with `quietLog = true` (no write to any other study) and logged here.

## 4. Subjects

| Set | Content | Seed |
|---|---|---|
| R | New L0 (5B R01, `a2e385640ca61012`) and N/original (A3 `rc1-f1a8b57cb02455c3`), read from their sealed, sha256-pinned records through `src/vg-l0-risk-metrics/subjects.ts` | — |
| A | random genomes of Assignment 3's 92-gene layout (`src/vg-l0-full-joint/space.ts` `decode`, coarse grid), uniform over every gene's levels, so every cell, control and Growth structure occurs | `deriveSeed('gpu-phase1-feasibility', 'A', n)` |
| B | branch-heavy D1 designs: extreme corners of the D1 box (X, Y, stop, hold, L, buffer, P, W at min/max), each RC 2 family A–D with gate on/off and both activations, Growth·VGT from New L0 | fixed list |
| N | neighbourhoods of New L0 and N/original (`space.ts` `neighbourhood`, 'joint' scope, as rung fitting uses) | the space's own derivation with labels `('gpu-phase1', i)` |
| S | synthetic adversarial fixtures (`src/d1-risk-controls/tests/scenarios.ts` crash / recovery / whipsaw paths and purpose-built sessions: gaps through stops, equality at every threshold, missing minutes, early closes, no closing print, open positions and pending orders at the end) | fixed |

## 5. Engine and conventions (unchanged)

The canonical CPU path is `evaluateWithControls2` (`src/d1-risk-controls-rc2/run.ts`) with `vOptions`
(`{ enabled: { 'G:GDX': false } }`), base friction (5 bps per side, 11% simple interest on a 365-day year, stops at the
stop level, no slippage), harmonized arming, D1 first. Nothing in `src/` outside `src/gpu-phase1/` is edited.

## 6. The proof-of-concept slice (declared before implementation)

| Component | Phase 1 GPU | Notes |
|---|---|---|
| D1 virtual book (EntryMachine, ExitManager, ShadowBook runner) | covered | deep entry, trailing buy, continuation, net-profit trailing stop, maximum hold (calendar days), buffered intraday loss and its overnight carry, closing-print fills, carried orders |
| RC 1 / RC 2 controls | covered | protective stop (next-session, entry-day), hold legacy / disabled / adaptive, prolonged-decline gate |
| Friction parameters | covered | cost bps, rate, stop fill `stop` and `next-open`, stop slippage, arming start |
| One-slot pooled replay (`runPool`) | covered | decisions, tie order, reservations, fills, partial exits of supplied trades, minute and session marks, drawdown trackers, daily closes |
| Growth virtual book | **not covered** (CPU) | its trades are computed by the canonical CPU engine and supplied to the GPU pool |
| Pool options blackouts, periods, wholeShares, tieOrder, fundFrom ≠ 0, detail logs, recordMarks | not covered | refused explicitly (error), never silently ignored |
| Compact record (`recordOf`), fitness, search | CPU | `recordOf` is run unchanged on a `PoolResult` rebuilt from GPU outputs |

Precision: IEEE-754 binary64 for every price, level, P&L and time; no FP32 anywhere in a decision; FMA contraction off
(`--fmad=false`), IEEE division and square root, no fast-math; each expression evaluated in the CPU code's order.

## 7–11. Search, robustness, qualification, chronology, validation

Not applicable (AD1, AD2).

## 12. Engineering gates

| Gate | Requirement |
|---|---|
| G0 | Toolchain installed in user space without driver, apt, display or Docker changes; a real computation runs on the GPU; the CPU environment is intact |
| G1 | CPU baseline profile recorded (components, worker counts, memory, data loading) |
| G2 | D1 books: every virtual trade (decision, entry and exit session / bar / time / raw and after-cost price / reason / net / interest / open flag) and the standalone figures equal the CPU's **bit for bit** for every subject in R, A, B, N, S on every door/window used |
| G3 | Pool: every funded lot and fill, every decision count, net / realized / unrealized, both drawdowns with their peak / trough / recovery times, daily closes, marks, peaks and sessions held equal the CPU's bit for bit; the canonical `recordOf` on the rebuilt result deep-equals the CPU record (ledger signature included) |
| G4 | New L0 and N/original reproduce their sealed FULL and D24 values to the cent through the hybrid path |
| G5 | Identical outputs across batch sizes, repeated runs, process restarts and shuffled candidate order |
| G6 | Malformed input, unsupported features, VRAM exhaustion, trade-capacity overflow and GPU/process failure produce explicit errors, never plausible output |
| G7 | Benchmarks only after G2–G6 pass |

Tolerance: zero. Any mismatch is traced to its source and reported with its effect on trades, stops, eligibility and
fitness; it is never hidden behind a tolerance. A failed G2–G6 labels the POC **not ready**.

## 13. Resources and recoverability

- CPU heavy runs: transient systemd user units in `gpup1.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0).
- GPU: the vLLM container holds ≈28 GB of the 32 GB; the POC must run in the remaining ≈2.8 GiB and never stops or
  reconfigures another GPU tenant. GPU memory use is measured and reported.
- Every stage writes its records to `results/` as it completes; reruns are deterministic.

## 14. Integrity

- No sealed record of any study is written; Priority 3's door log is silenced; this study's records carry sha256 in
  `results/seals.jsonl`.
- Compiled binaries and exported bar caches are git-ignored local build artifacts.

## 15. Reporting commitments

Text, Markdown tables and CSV/JSON only (standard §7.7): `GPU_PHASE1_REPORT.md`, `GPU_CPU_PARITY.md`,
`GPU_BENCHMARKS.md`, `GPU_PHASE2_PLAN.md`, `GPU_RESEARCH_HANDOFF.md`, and a portable ZIP with a manifest.
