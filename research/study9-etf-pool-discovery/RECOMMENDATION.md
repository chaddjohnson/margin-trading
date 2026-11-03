# Recommendation — Study 9, Phase A (ETF-pool discovery, training only)

**Status:** Phase A is complete.

- Every computation stage (S0–S3) is sealed in the local hash chain, and these reports are sealed as phase
  `report-phase-a`.
- **No joint optimization was run.**
- The study stops at the review checkpoint. Phase B needs your approval (see "Request for approval" at the end).

## Executive summary

1. **One credible new pool family was found: the G family's KRE + GDX core.**
   - **KRE+GDX+ILF+MTUM**, with fixed *generic* vectors, earns **$25.9k/yr robust profit** on the 2016–2024 training
     window. That is Study 8's 384-point instrument, the same one on which the *optimized* VG #2 balanced earns
     $26.8k/yr and VG #1 $29.4k/yr.
   - **What it meets.** Its fixed generic configuration meets Study 8's C1–C7 constraints on Phase A's 384-point
     decisive neighbourhood. That is a screening measurement, not Study 8's qualification gate, which only Phase B can
     apply. It also passes:
     - every stress (10 bps, 14%, next-open, +25 bps);
     - the pre-registered complementarity test: every book adds ≥ $1,000/yr against its leave-one-out subset; the
       smallest margin is MTUM's $2,141.
   - It is positive in both time halves ($26.6k/yr 2017–2020, $24.9k/yr 2021–2024) and earns $18.4k/yr ex-2020.
   - Its stratum has the study's lowest overfitting probability (PBO 0.18). G4 is a beam stratum, where PBO is only a
     lower bound.
   - **Its risks:**
     - the share sits at the 90% edge (90.9%, Wilson bound 88.2%), below your 95% preference. The seed variation of
       the 384-point instrument is about ±1.6 points (§ comparison below), so the share could fall on either side of
       90%;
     - p90 DD $31.6k;
     - the in-box check fails;
     - ILF is a thin ETF;
     - GDX's 2025–2026 path is already known to the project (Study 8's G2026 drawdowns).
   - **Why it is complementary:** KRE and GDX are each unusable alone (centre DD $43k and $38k, neighbourhood shares
     14% and 5%). Their timing barely overlaps: the α decision match is 0.22–0.32 and the daily return correlation 0.06. In one
     slot each fills much of the other's idle time. The pool's DD falls to about $25k while each adds $10–15k/yr of robust profit.
2. **Five broader but modest pools were found:** N2 SMH+XHB, N2 EDV+XHB, N2 IWM+SMH, V3 VGT+IWM+XLF and N3
   EDV+IWM+XLF.
   - $8–10k/yr robust with generic vectors, at 92–98% shares (EDV+XHB's Wilson bound is 89.6%), every stress passed,
     complementary.
   - Their p90 DDs ($31.8–33.1k) sit only $1.9–3.2k below the ceiling.
   - They earn about what optimized B1 earns ($8.0k/yr on the same instrument). They earn well below the optimized VG,
     VXRG and VXRKG holders ($22.8–29.4k), and about half of Study 8's #12 G ($19.9k) and #15 VXR ($17.2k) holders.
   - **Why they appear complementary:** their books' D1 timing rarely overlaps.

     | Pair | α decision match | Daily return correlation |
     |---|---:|---:|
     | SMH–XHB | 0.31 | 0.64 |
     | EDV–XHB | 0.15 | 0.01 |
     | VGT–IWM | 0.13 | 0.78 |
     | VGT–XLF | 0.12 | 0.67 |
     | EDV–IWM | 0.13 | −0.14 |
     | EDV–XLF | 0.07 | −0.27 |

     EDV, a long-duration Treasury fund, enters at different times from equity books. Each pool's leave-one-out
     margins are positive ($1.3–7.9k/yr per book).
   - **SMH in the N family.** SMH is in VGT's cluster (us-tech-growth): daily-return correlation 0.90 with VGT,
     decision match 0.50 (α) / 0.56 (β). It sits below the frozen near-duplicate thresholds, so it is not a VGT
     proxy and N admits it. The N family excludes only VGT's *direct* proxies (XLK, IWF, VOOG). Two of the three N2
     nominees (SMH+XHB, IWM+SMH) therefore carry VGT-like tech exposure. They should not be read as "VGT-free".
   - Whether joint optimization lifts them enough to matter is open. Optimization lifted Study 8's own sets
     ×1.45–×5.
3. **VG: no new candidate (negative).**
   - With generic vectors, no VG pool of 2–5 books is Study 8-feasible: adding books to {VGT, GDX} raises the DD past
     $35k first.
   - This says nothing against the optimized VG #1/#2, which remain among the strongest known configurations.
4. **The earlier 61-ETF studies' negative findings largely still dominate:**
   - **standalone:** no ETF has a Study 8-feasible generic vector on its own;
   - **events:** 70% of all decisions fall in 26 market-wide event families, 2020 and 2022 above all;
   - **pool size:** the share of pools in which every book adds money falls from 59–81% at two books to 11–14% at five;
   - **time:** neighbourhood rankings persist only weakly over time (TD2 and TD3 mostly near zero).

   The exception is the KRE + GDX economy, where shared-slot complementarity is real in the replay and persists
   better than elsewhere.
5. **Fixed-vector limitation, the main uncertainty.**
   - Generic screens rank pools only weakly by their optimized potential: ρ ≈ 0.26 between generic and optimized
     robust profit across Study 8's six sets.
   - The order of the six nominations may change under joint optimization.
   - Whether any of them beats VG #2 *after* optimization, at ≥ 95% breadth and with sound 2025–2026 behaviour, is
     exactly what Phase B must establish. Phase A cannot.

**Comparison with the frozen controls** (training window, identical instrument; not an independent validation).

The incumbents' figures here use Phase A's own per-pool 384-point seeds, so they differ slightly from Study 8's sealed
confirmations, which parity P3 reproduced exactly:

| Holder | Study 8 sealed | Here |
|---|---|---|
| #1 | 96.4% / $29.3k | 94.8% / $29.4k |
| #2 | 97.9% / $27.1k | 97.7% / $26.8k |

That roughly 1.6-point seed variation is the precision of any single 384-point share.

| Configuration | Vectors | Robust/yr | Share | p90 DD |
|---|---|---:|---:|---:|
| VG #2 balanced (your preference) | optimized | $26.8k | 97.7% | $24.3k |
| VG #1 | optimized | $29.4k | 94.8% | $29.0k |
| B5 | frozen | $19.2k | 27.6% | $56.4k |
| B1 | frozen | $8.0k | 100% | $28.1k |
| KRE+GDX+ILF+MTUM | generic | $25.9k | 90.9% | $31.6k |

**Exposure of the controls:**

- The incumbents are in-sample optima (Study 8) or hindsight-selected (B1, B5).
- The new pools are the best of a counted search of 1,303 pools × ≤ 9 generic assignments on the same history.

## Dataset freshness and universe

- **Refresh:** Alpaca SIP, repository pipeline. All 64 local files now run through **Friday 2026-10-30**, the latest
  complete session; the refresh ran on Monday 2026-11-02, mid-session.
- **Integrity:** every file's prior bytes are unchanged (prefix-verified), and the prior vintage is kept read-only.
- **Eligible ETFs: 61 of 64,** the canonical 61. Not canonical: GDXJ and OIH (late starters) and XLRE (missing 2016
  sessions).
- **Quality labels:** seven sparse ETFs (EDV, IGV, IYT, KIE, QUAL, VOOG, VPU) and two thin (DBC, ILF). They are
  labelled, not excluded; no corruption was found.
- **Phase A data:** a read-only training projection that physically ends at 2024-12-31. No post-2024 strategy figure
  was computed for anything.

## What was screened

| Stage | Scope |
|---|---|
| S1 | 61 ETFs × 64 generic vectors; 99,584 neighbourhood points |
| S2 | 1,830 pairs × 2 vectors; 26 market-wide event families; 718 anchor-contention replays against all four family anchors (N with three generic seed anchors: XLF, IWM, XLB) |
| S3 | **1,303 pools** of 2–5 books in 16 family × size strata (equal budgets; 22% exploratory); 11,427 unique configurations; 576 null pools; 103 pools re-measured on Study 8's 384-point instrument; 6 nominations |

**Best per family:**

| Family | Best pool(s) | Robust/yr (generic) | Share | Status |
|---|---|---:|---:|---|
| G | KRE+GDX+ILF+MTUM | $25.9k | 91% | nominated |
| N | SMH+XHB / EDV+IWM+XLF | ≈ $10k | 96–97% | nominated |
| V | VGT+IWM+XLF | $9.3k | 98% | nominated |
| VG | none | — | — | negative |

## Recommended next step

**Phase B, option C** (`PHASE_B_OPTIMIZATION_PROPOSAL.md`): a fresh, from-scratch joint optimization of the five
distinct frozen nominations of batches A and B:

- KRE+GDX+ILF+MTUM;
- EDV+IWM+XLF;
- SMH+XHB;
- VGT+IWM+XLF;
- EDV+XHB.

The details:

- **Method:** Study 8's **unchanged** fitness, schedule, qualification, stresses, folds and T-gates.
- **Optional reserve:** KRE+EWW+GDX+MTUM (option D), as the G-family sensitivity test.
- **Cost:** about **49 CPU-hours (≈ 6–7 h wall)** for option C; about 68 CPU-hours for option D.
- **What Phase B should tell you:** whether the KRE + GDX economy, once optimized, beats VG #2 balanced on training at
  ≥ 95% breadth, and how it behaves on the exposed 2025–2026 window. That window is retrospective; it is not blind
  for GDX.

**No fitness change is proposed.**

- S1 shows that Study 8's C5 and C7 make *standalone* generic vectors infeasible.
- That is the rule working as intended for one-book economies, not a reason to change it.

**Stopping is also defensible.** Outside the KRE + GDX core, nothing found approaches the optimized incumbents.

## What still needs Phase B (cannot be concluded from Phase A)

1. Optimized robust profit, breadth (≥ 95% preferred) and the full Study 8 384-point gate for each pool.
2. Qualification Q1–Q8, E1–E3, PBO, and per-fold persistence.
3. The one-time 2025-01-02 → 2026-10-29 retrospective test (T1–T7), and the 2026-10-30 later slice.
4. Then, after a freeze, prospective forward observation: the only genuinely independent evidence.

## Where to look

**Reports:**

- `POOL_MARGINAL_CONTRIBUTION.md` (S3);
- `SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md` (S2);
- `STANDALONE_SCREEN.md` (S1);
- `DATA_AND_UNIVERSE_AUDIT.md` (S0);
- `PHASE_B_OPTIMIZATION_PROPOSAL.md`.

**Tables:** `results/tables/` (`s3-nominations.md`, `s3-comparators.md`, `s3-queue.md`, `s3-high.csv`,
`s3-proposals.csv`, …).

**Verification:** `npm run study9 -- verify-chain`; commands in `RUN_COMMANDS.md`.

**Disclosures:** `AMENDMENTS.md`:

- **A0, the pre-freeze record** (the smoke tests and the two reviews):
  - after smoke run 2, training-data toy runs showed short candidate lists, and two fail-safes were added before the
    freeze: the ETF order fallback for the N seeds and the protected list, and the risk-flagged fill;
  - because no ETF turned out to have a feasible standalone vector, those fail-safes are what chose the N seeds (XLF,
    IWM, XLB) and the protected list;
  - the frozen protocol's header says no design choice depended on the smoke test; that is true of every rule except
    these fail-safes, which A0 records;
  - only training data was involved.
- **E1:** one post-freeze code fix that changed no rule and had no exposure.
- **E2:** a non-substantive note on the value of y.

**Limitations:**

- the degenerate "weak but distinct" rule (`STANDALONE_SCREEN.md` §4);
- the weak generic-to-optimized rank correlation;
- the known GDX 2025–2026 exposure;
- ILF's thin liquidity;
- one market history with a few dominant events.

**Phase A is research only.** Nothing is deployed and no orders were placed.

## Request for approval

**May I proceed to Phase B: full, from-scratch joint optimization with Study 8's unchanged fitness?**

- **The batch:** option C (the five frozen nominations of batches A and B), or the option or subset you choose:
  A, B or D.
- **The cost:** about 49 CPU-hours (≈ 6–7 h of wall time) on this machine.
- **The windows:** the training, exposed and later-slice windows of `PHASE_B_OPTIMIZATION_PROPOSAL.md` §5.

Nothing will be optimized until you say so. You may also stop here: outside the KRE + GDX core, Phase A found no
Study 8-feasible generic pool above about $11k/yr.
