# The original B5 optimization method: reconstruction, reproduction, and the controlled comparison track (Track O)

**Sources:**
- `results/parity/p4.json`, `results/parity/r-om.json` (+ `r-om/`);
- `results/partB/trackO/o-pa.json` (+ CSVs);
- `results/partB/trackO/o-me.json` (+ `o-me/`);
- `patches/multi-etf-d1-dev-window.patch`;
- Study 5's `METHOD_RECONSTRUCTION.md`, which this file extends to KRE.

## 1. How frozen B5 was produced (a chain, not one optimization)

| Step | Book(s) | Program | Method | Data used |
|---|---|---|---|---|
| 1 | VGT `primary` | vgt-recovery-eligibility / vgt-d1-refinement | D1's shipped constants, kept as a local maximum (standalone VGT) | VGT 2016–2025 |
| 2 | **KRE `lowDd`** (and XBI/XRT `lowDd`) | **research/multi-etf-d1** (`b3facfe`) | **standalone** per-ticker search (frictionless, 11%, $100k): 4,096 scrambled-Sobol vectors + one NSGA-II per chronological fold (fold1–fold4, final; population 96, ≤ 40 generations, ≤ 3,000 new, patience 12); selection §7: feasible (DD ≤ $35k, entries ≥ ⌈0.75 × years⌉), beats D1, ±1/±2-step plateau check; `primary` = highest-net plateau candidate with DD ≤ $25k; **`lowDd`** = lowest-DD plateau candidate with net ≥ 75% of the primary's | development 2017-06-15 → 2023-12-29 |
| 3 | the allocator (all-lowDd shadow, one slot) | research/multi-etf-allocator | comparison of predeclared configurations (no parameter search) | 2016–2025 |
| 4 | GDX `portfolioAware` | research/portfolio-aware-d1-optimization ("the B5 optimizer") | incremental search for one new book against the frozen four-book base S0: Stage A common pool (512 Sobol + 7 controls, 4 costs), Stage B NSGA-II per track (S standalone, P Δ vs S0; population 48, ≤ 1,000 new, patience 8), robust selection R1–R5, Stage C gates T1–T3 (+ T4/T5 20%-portfolio) | 2017-06-15 → 2023-12-29 |

- No step optimized the five-book pool jointly.
- No step scored a neighbourhood: plateau checks were one-parameter probes of the centre.
- The step-4 optimizer never re-optimized the existing books.
- Capital competition entered only in step 4, as the new book's Δ in the full chronological replay, and in step 3's
  policy choice. ETF priority is the allocator's: the first executable signal wins, and same-minute ties go
  alphabetically.
- Cost levels: step 2 searched at 0 bps. Step 4 searched at 5 bps and checked 0/2/10.

## 2. Faithful reproduction (engineering gates, before any Part B search)

| Gate | What was run | Result |
|---|---|---|
| **R-OM** | The **original multi-etf-d1 code**, unchanged (repository `HEAD` `b4f9857`; only dataset plumbing has changed since `b3facfe`), in a detached worktree on its archived inputs, `node … src/app.ts multiEtfD1 search --symbols KRE --workers 8`, with the worktree's own sealed KRE records removed so that it recomputed | **PASS:** 22,349 candidates (sealed: 22,349); identical GA hypervolume trajectories on every fold; `primary` **d1-1956f5b4ca** and `lowDd` **d1-a389037400** (B5's KRE book) with identical development net ($171,785.29 / $158,512.40), minute DD and entries; 70 s |
| **P4** | This study's **symbol-parametrized** step-4 implementation (`trackO.ts` `paCore`, built from the unchanged Study 5 Track 1 blocks and the original constants and seed rule), run on GDX with the original base S0 and window | **PASS:** Track P selects **d1-51ea8d4bd6** (B5's GDX book) and Track S d1-68ebf55a55; feasible counts 1,085 / 821 = sealed; identical 21-generation hypervolume trajectories; identical objectives at 0/2/5/10 bps |

Both methods behind frozen B5's KRE (step 2) and its last book (step 4) are therefore reproduced bit for bit by the
code that Track O uses.

## 3. The controlled comparison track (search door only: 2017-06-15 → 2021-12-31)

### 3.1 O-ME — the method that produced KRE `lowDd`, on the development window

**Adapter.** `patches/multi-etf-d1-dev-window.patch` (sha256 `797922a2…`), applied in a fresh detached worktree at
`1d9f6a4`. It changes only the protocol constants: development end 2023-12-31 → 2021-12-31, and folds fold1 (→ 2019,
validated on 2020), fold2 (→ 2020, validated on 2021) and final (→ 2021). Everything else is the original code. It
evaluated 15,059 candidates (three GA folds, each ending on the 3,072-evaluation budget) in 30 s.

| Role | Vector | DEV standalone (frictionless) |
|---|---|---|
| `lowDd` (B5's role) | **d1-a5d661f44b**: X 29.0% Y 2.6% stop 3.1% **hold 4** L 225 buffer 2.7% P 9.0% W 96 | net $100,790, DD $22,201, 43 entries |
| `primary` | **d1-5b0d6e35ed**: X 24.3% Y 3.2% stop 10.4% hold 4 L 21 buffer 1.4% P 16.5% W 36 | net $126,366, DD $24,314, only 8 entries |

On development data alone, the original method rediscovers essentially the **frozen KRE `lowDd` region**: X ≈ 29–30%,
stop 3.1%, **hold 4**, L ≈ 225–230. Configurations **O-ME-lowDd** and **O-ME-primary** are B5 with KRE replaced.

### 3.2 O-PA — the B5 optimizer applied to KRE inside the five-ETF pool

- Base: frozen VGT, XBI, XRT and GDX. Its DEV net at 5 bps is $166,357 and its DD $19,534.
- The original common pool: 512 Sobol vectors, the same seed.
- The original controls, **minus KRE's own `primary` and `lowDd`**. Those were fitted on 2017–2023, which includes
  VAL, so they were evaluated only as labelled controls.
- The original seed rule `deriveSeed('portfolio-aware-d1','KRE',track,'nsga2')`.
- Folds D1/D2/D3 and regimes R1–R9 of the development window.
- 12,228 replays, 78 s.

| Track | Feasible | Shortlist checked | Robust (R1–R5) | Selected | Stage C (T1–T3) |
|---|---:|---:|---:|---|---|
| S (KRE standalone net) | 642 | 20 | 20 | **d1-cf8e24c0cb**: X 27.9% Y 3.4% stop 5.2% hold 4 L 236 buffer 5.3% P 5.0% W 64 (standalone $113,325) | **fails T1, T2, T3**: Δ vs base only +$2,937 at 5 bps (< $15,000), pool DD $32,201 |
| P (Δ vs the four-book base) | 836 | 40 (extended) | **0** (fails: R5 35, R2 27) | **none** | — |

**Excluded controls** (labelled, at 5 bps, DEV):

| Control | KRE standalone net / DD | Δ vs base | Pool DD |
|---|---:|---:|---:|
| KRE `lowDd` (frozen B5's book) | $99,682 / $23,514 | **+$51,187** | $26,510 |
| KRE `primary` | $94,739 / $26,552 | +$35,224 | $33,065 |

The P track's best feasible vectors (Δ up to +$62,154, pool DD $30,266) fail R5: pool net ÷ DD below 0.95 × the
base's 8.5. Many also fail R2: positive in fewer than 2 of 3 folds. The original method therefore nominates nothing
for KRE in the five-ETF pool. Its Track S pick is carried as the comparator **O-PA-S**.

### 3.3 Departures from the original (forced, stated)

1. **Window.** Search on 2017-06-15 → 2021-12-31 (2022–2023 is this study's validation), not 2017–2023. O-ME has two
   folds plus final instead of four plus final. O-PA has three ~1.5-year folds and regimes R1–R9.
2. **Base and target.** O-PA searches KRE against the four other frozen books. The original searched a new ETF
   against S0.
3. **Controls.** KRE's own vectors are excluded from Stage A (in-sample on VAL).
4. **Gates.** O-PA's T4/T5 (20% portfolio) are not applied: that mode is out of scope.
5. **Scoring.** Every Track O configuration is scored against this study's gates (PROTOCOL.md §11) exactly like
   Tracks K and J (`CANDIDATE_ROBUSTNESS.md`). The original methods' own verdicts are reported beside them.

## 4. What the original method does and does not do (relevant to robustness)

- It scores the **centre only**. Plateau checks are one-parameter probes (step 2) or one-parameter probes plus folds
  and regimes (step 4). Neither looks at joint, multi-book neighbourhoods or at the shared slot's sequence under
  perturbation, which is exactly where frozen B5 fails (`JOINT_INTERACTIONS.md`).
- Re-run on development data, it returns to the same KRE region (hold 4, X ≈ 29–30%). That region's hold is
  knife-edge in the five-book pool (`KRE_SENSITIVITY.md` §2).
