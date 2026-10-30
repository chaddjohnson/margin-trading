# Method reconstruction: how frozen B5 was optimized, and how Study 5 reproduces it on VGT/KRE/GDX

Written 2026-10-30 before any Study 5 candidate was evaluated. Sources are the sealed records and code of the earlier
studies at the commits listed; nothing here is inferred from labels. "Frozen B5" is `config/pools/B5.json`
(sha256 `deef53ca…`, commit `158f3ac`, 2026-10-26): VGT `primary`, XBI/XRT/KRE `lowDd`, GDX `portfolioAware`, one
shared $100,000 funded slot, shadow policy, 5 bps per side, 11% simple interest, books arming 2017-06-15.

## 1. B5 was not optimized as one pool: it is a chain of four separately frozen decisions

| Step | What was chosen | Program (first commit) | Method | Data used for the choice |
|---|---|---|---|---|
| 1 | VGT `primary` (X 21.6 Y 0.3 stop 7.3 hold 8 L 74 buf 2.9 P 9.0 W 60) | `research/vgt-recovery-eligibility` (`c636e40`), `research/vgt-d1-refinement` (`6ff260d`), 2026-10-22 | D1 = the shipped constants of `src/app/allIn-trailingBuy-postExitContinuation.ts`, kept as a local maximum by the VGT refinement study (standalone VGT) | VGT 2016–2025 (2024–2025 inspected by several VGT programs) |
| 2 | XBI/XRT/KRE `primary` and `lowDd` vectors | `research/multi-etf-d1` (`b3facfe`, 2026-10-23), `FROZEN_CANDIDATES.json` sha256 `94b0b646…` (body `d3645e1e…`) | **Standalone** per-ticker search: 4,096 scrambled Sobol vectors + one NSGA-II per chronological fold (population 96, ≤ 40 generations, ≤ 3,000 new runs, patience 12, objectives net and minute DD, constraint DD ≤ $35,000 and entries ≥ ⌈0.75 × years⌉); selection rule §7 (feasible, beats D1, net list / drawdown list, plateau check with ±1/±2-step one-parameter probes: ≥ 75% feasible and median ≥ 70% of the center; primary = highest-net plateau candidate with DD ≤ $25,000; `lowDd` = lowest-DD plateau candidate with net ≥ 75% of the primary's) | development 2017-06-15 → 2023-12-29; holdout 2024-01-02 → 2025-10-16 opened once (KRE included) |
| 3 | The allocator: four shadow books, one shared slot, "first executable signal wins", **all-lowDd** roles | `research/multi-etf-allocator` (`a6c1f6f`…`d5dae5b`, 2026-10-23) | Comparison of predeclared configurations (all-primary / all-lowDd × five policies); no parameter search | 2016–2025 (inspected; All-lowDd's 2024–2026 later inspected again by `docs/all-lowdd-full-history-evaluation.md`) |
| 4 | GDX `portfolioAware` (X 27.4 Y 0.4 stop 7.1 hold 18 L 100 buf 3.6 P 19.1 W 81, `d1-51ea8d4bd6`, origin `ga:P:21`) | `research/portfolio-aware-d1-optimization` (`96d7535`, 2026-10-24/25); `PROTOCOL.md` sha256 `ba67af02…`, frozen 2026-10-24T14:54:55Z; `FROZEN_SELECTION.json` sha256 `16c91895…` (body `2eb9defc…`, 2026-10-24T15:37:44Z) | **Portfolio-aware** addition to the frozen four-book S0 (= B4); details in §2 | training 2017-06-15 → 2023-12-29 only; holdout/final opened once after the freeze |

The four frozen books were **never re-optimized** in step 4 ("The four frozen phenotypes are never re-optimized",
portfolio-aware PROTOCOL.md §1). B5 = S0 + the step-4 book. The pool configuration was operationalized, with no
parameter change, by `docs/pools/` (`158f3ac`, 2026-10-26) and reproduced to the cent ($486,207.77 / minute DD
$26,509.97 on `all` through 2026-10-13; `npm run pools -- verify` 64/64).

## 2. Step 4 in detail (the "B5 optimizer"; `src/portfolio-aware-d1/`, PROTOCOL.md §3–§7)

- **Engine.** Fast path: each book's virtual-trade trace (`trace.ts` `traceBook`, the frozen `ShadowBook` over its own
  symbol) and a causal fixed-pool replay (`replay.ts` `replayFixedPool`); parity gates E1–E3 proved replay = N-book
  engine (`nbook/engine.ts` `runNAllocator`) = frozen allocator on every compared field. Every reported configuration
  was re-run on the full engine (E4).
- **Space.** The eight-ETF box (`src/multi-etf-d1/context.ts`): X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30
  calendar days, L 20–250 sessions, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200 sessions; tenths of a point, integer days
  and sessions.
- **Stage A (common pool).** 512 unique quantized vectors from one scrambled Sobol stream, seed
  `deriveSeed('portfolio-aware-d1','common-pool','sobol-scramble')` = `[3958730257, 953049871, 361004370, 3789834329]`,
  plus 7 controls (D1's constants; the XBI/XRT/KRE `primary` and `lowDd` vectors), the same for all seven candidate
  ETFs; each evaluated at 0/2/5/10 bps as **Track S** (the book alone in a fixed $100,000 pool: net, minute DD, closed
  trades, years with a closed trade) and **Track P** (Δ = net(S0 + book) − net(S0) from the full chronological replay,
  pool minute DD, the book's funded lots and the years they were entered in). Feasibility: S — standalone DD ≤ $35,000,
  ≥ 8 closed trades, ≥ 3 years; P — pool DD ≤ $35,000, ≥ 5 funded lots in ≥ 3 years. A finalist rule (§4.7) chose
  GDX, XOP, XLE among seven ETFs.
- **Stage B (per finalist, per track).** NSGA-II (`src/optimizer/nsga2.ts`): population 48, crossover 0.9, SBX η 15,
  polynomial mutation η 20; initial population = the track's 48 best pool vectors by constrained domination with the
  normalized-L∞ ≥ 0.02 diversity rule; ≤ 1,000 new unique vectors at 5 bps; ≤ 40 generations; early stop after 8
  generations without a relative hypervolume gain > 1e-4 (reference (0, 35,000)); objectives (−objective@5, DD@5),
  violation S = (DD − 35k)⁺/35k + (8 − trades)⁺/8 + (3 − years)⁺/3, P = (pool DD − 35k)⁺/35k + (5 − lots)⁺/5 + (3 − lot
  years)⁺/3; seeds `deriveSeed('portfolio-aware-d1', ETF, track, 'nsga2')`. Every GDX search ended on the budget (21
  generations), none converged.
- **Robust selection (§5.3).** The track's 20 best feasible vectors by objective@5 (pool ∪ own search); each evaluated
  at 0/2/10 bps and probed with the one-parameter probes (X ±5/±10, Y ±1/±2, stop ±5/±10, hold ±1/±2, L ±5/±10, buffer
  ±5/±10, P ±5/±10, W ±10/±20 grid units, in-box only). Robust = R1 objective > 0 at 0/2/10 bps; R2 > 0 in ≥ 2 of 3 folds
  (F1 2017-06-15 → 2019-12-31, F2 2020–2021, F3 2022–2023); R3 objective − largest positive regime contribution > 0
  (regimes R1–R13); R4 ≥ 75% of probes feasible, probe median > 0 and ≥ 50% of the objective; R5 (P only) pool net ÷
  pool DD ≥ 0.95 × S0's. Selected = highest objective@5 among robust (shortlist extends once to 40). For GDX all 20 of
  each track passed (the rules did not discriminate; PORTFOLIO_AWARE_OPTIMIZATION.md §1).
- **Stage C (configurations, ≤ 8).** Additions P-add/S-add per finalist; substitutions (replace one of XBI/XRT/KRE when
  ≥ 3 conflicts; kept only if it beats the addition by ≥ $5,000); one two-ETF combination; optional co-refinement.
  Gates T1 Δ@5 ≥ $15,000 and Δ > 0 at 0/2/10; T2 DD@5 ≤ $35,000 and net ÷ DD ≥ 0.95 × S0's; T3 ≥ 5 lots in ≥ 3 years,
  Δ > 0 in ≥ 2 of 3 folds, Δ − best regime > 0; T4/T5 20%-portfolio gates. P-add-GDX was the only configuration
  nominated and accepted.
- **Freeze and evaluation.** One continuous `all` run per frozen configuration, holdout/final attributed, acceptance
  rules (post-training Δ > 0 at 5 and 10 bps, holdout "persists" ≥ +$2,500, final not "reverses", DD limits).

Training figures of the selected vector (5 bps, 2017-06-15 → 2023-12-29): standalone $142,930 / minute DD $34,134 /
18 trades; pool Δ +$146,293 (own lots $149,556 − S0 displaced $52,933 + baseline gained $49,670); folds $0 / +$88,122 /
+$58,171; 59% of Δ from the COVID regime R7. The Track S vector `d1-68ebf55a55` (X 25.8 Y 1.0 stop 5.4 hold 8 L 172 buf
1.4 P 17.6 W 199): standalone $155,422 / $29,880 / 43 trades; pool Δ +$38,082.

## 3. What Study 5 reproduces ("Track 1", faithful) and what it must change

**Faithful Track 1 = step 4 re-run on the restricted universe.** Base **C2 = VGT `primary` + KRE `lowDd`** (B5's own
VGT and KRE books; the three-ETF analogue of S0 = B5 without XBI, XRT and GDX); the GDX book is searched for its
incremental executable effect on C2 (Track P) and standalone (Track S), with the **same space, the same 512 common-pool
vectors (identical seed), the same 7 controls, the same NSGA-II settings and seeds, the same feasibility rules,
violations, robust-selection rules R1–R5, probes, shortlist sizes and Stage C gates T1–T3**, on the same engine
(`traceBook` + `replayFixedPool`, re-verified against `runNAllocator`).

Departures, each forced and stated:

1. **Data partition.** The original searched on 2017-06-15 → 2023-12-29. Every later period (2024-01-02 → 2026-10-13)
   has since been inspected for these books, so there is no unseen holdout; Study 5 reserves 2022–2023 as its own
   validation period. Track 1 therefore searches on **2017-06-15 → 2021-12-31** only (PROTOCOL.md §3). Consequences:
   (a) the original folds F1/F2/F3 become three ≈1.5-year folds inside that window (D1 2017-06-15 → 2018-12-31,
   D2 2019-01-01 → 2020-06-30, D3 2020-07-01 → 2021-12-31; "≥ 2 of 3 positive" kept); (b) the regime partition is the
   original R1–R9 (R10–R13 lie in validation); (c) the feasibility counts (≥ 8 trades / ≥ 5 lots in ≥ 3 years) are kept
   unchanged although the window is shorter — a stricter test, stated rather than rescaled.
2. **Base pool.** S0 (four books) becomes C2 (two books): XBI and XRT are excluded by the brief. Δ, R5 and T2 are
   measured against C2. The original step 4 never re-optimized VGT or KRE; Track 1 keeps them frozen likewise.
3. **Stage A's finalist rule** chose among seven ETFs; with GDX the only addition it has nothing to choose and is not
   run. Stage C's substitution step would remove KRE (VGT is never removed), producing a two-ETF VGT+GDX pool; it is run
   as a **labelled diagnostic only** (not a three-ETF candidate). The two-ETF combination and co-refinement steps need
   two finalists and do not apply.
4. **Portfolio gates T4/T5** (the 20% VOOG/VGT portfolio) are not applied: the brief's objective is the fixed
   $100,000 pool, VOOG was not appended, and the distribution ledger in the working tree carries uncommitted user edits.
   Track 1's training gates are T1–T3 only.
5. **The B5 GDX vector is not a seed.** It was selected on data that include Study 5's validation period, so it is
   evaluated only as a labelled control and never enters any population, shortlist or neighbourhood centre of a
   search (it is a separate fixed control C3).
6. **Steps 1–3 are inherited, not re-run.** VGT `primary` and KRE `lowDd` came from standalone programs whose choice
   does not depend on which other ETFs share the pool; re-deriving them would only re-fit standalone vectors to a
   shorter window, which is not a test of the XBI/XRT exclusion. Re-optimizing VGT and KRE *for the restricted pool* is
   done by Track 2 (supplemental), not attributed to the original method.

**Track 2 (supplemental, new methods)** — staged coordinate optimization over all three books with randomized order
and seeds plus a joint step; and robust plateau selection over joint and per-book neighbourhoods with validation.
These are new procedures, labelled as such everywhere (PROTOCOL.md §6).

**Study A's standalone method** reuses step 2's design elements (Sobol coverage + NSGA-II with net/DD objectives, the
±1/±2 probe plateau rule) on GDX, adds multi-seed GA replicates, LHS neighbourhood medians, a validation period and a
walk-forward replication of the whole procedure (PROTOCOL.md §5).

## 4. Can the old machinery run unchanged?

- The engines (`traceBook`, `replayFixedPool`, `runNAllocator`, `loadNUniverse`), the operators (`nsga2.ts`,
  `sobol.ts`, `rng.ts`), the box and probes (`multi-etf-d1/space.ts`), `candidateBook` and the pools runner are reused
  **unchanged** (imported, never edited).
- `src/portfolio-aware-d1/stageA.ts`–`stageC.ts` cannot run unchanged on the restricted universe: `StudyEvaluator`
  hard-codes S0 = the four B4 books (`baselineBooks`), `trainingUniverse()` hard-codes the eleven-symbol training
  universe through 2023-12-31, and the stages write into the sealed `research/portfolio-aware-d1-optimization/results/`
  and refuse to run without that study's protocol freeze. Study 5 therefore re-implements the same loop in its own
  namespace (`src/study5-gdx-b5-three-etf/track1.ts`) with the base and window as parameters, line-for-line on the
  original's settings (`study.search`, `study.selection`, `study.gates`, `study.probeOffsets`, imported from
  `src/portfolio-aware-d1/context.ts` where they apply). The smallest compatible adapter, not a new algorithm.
- Unresolved differences: none. **Verified (parity P4, `results/parity/parity.json`):** the re-implementation, run on
  the original base S0 (VGT primary, XBI/XRT/KRE lowDd) and the original training window 2017-06-15 → 2023-12-29,
  reproduced the sealed GDX search of `research/portfolio-aware-d1-optimization` exactly — Track P selected
  `d1-51ea8d4bd6` (B5's GDX book) and Track S `d1-68ebf55a55`, with the same feasible counts (1,085 / 821), the
  identical hypervolume trajectories of all 21 generations (`results/stageB/champions.json`) and the identical
  objectives at 0/2/5/10 bps, folds and best-regime figures (`results/stageB/GDX/track-*/selection.json`). (The Stage A
  JSONL logs of that study are not on disk in this checkout; its committed selection and champions records were used.)
