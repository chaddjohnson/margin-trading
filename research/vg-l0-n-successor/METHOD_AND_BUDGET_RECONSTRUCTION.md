# METHOD AND BUDGET RECONSTRUCTION — Priority 5 (P5-NS), Phase A

Written 2026-11-24 **before** the protocol was drafted and before any official evaluation of this study. It reconstructs,
from executed code and sealed records, how the optimizations behind New L0 and N/original actually searched and why
lanes ended budget-bound, and derives this study's budget design from that evidence (brief §2, §3.3). Nothing here uses a
2025–2026 outcome. Factual sections are marked **[V]** (verified from a sealed record or the executed code) or **[R]**
(reconstructed or inferred).

**Sources.** Three read-only reconstructions written for this study and checked by spot recomputation (below):

| Draft | sha256 | Scope |
|---|---|---|
| `reports/phase-a/3B-5B.md` | `4a135aab803ba6abb111b1239e956d9c1d1851df4f04b2d94e189d579df4e88d` | Priority 3B and Priority 5B (L0 arm), against NL0 1.0.0 §4 |
| `reports/phase-a/A3.md` | `295ebbaf45242ce922ad6160b3aca1ccdae595560d9bad46abedb35ff3acfd64` | Assignment 3, every one of its 680 lanes (CSV appendix) |
| `reports/phase-a/P4-StageB-GPU.md` | `0f1e11ca07db84d01dbc7f5786ddfa0c52d459df726576841d44405594e194b9` | Priority 4 (CTRL/EXP), Stage B, GPU throughput and resources |

Every sealed record those drafts used matched its study's `seals.jsonl` entry (47 Assignment 3 seals, 26 Priority 4,
Stage B's and 3B/5B's search and qualification seals). Independent spot check by this session (2026-11-24T12:2xZ, from
`research/vg-l0-full-joint/results/search/*/broad*.json`): broad lanes by number of decline gates ON 0 / 1 / 2 = 128 / 256
/ 128, budget-bound 5 / 48 / 110; 120 of the 163 budget-bound broad lanes had no performance component firing on their
last island — identical to the A3 draft.

## 1. The NL0 1.0.0 pipeline as executed [V]

Registered `docs/research/methods/NEW_L0_METHOD.md` (sha256 `9b387bb4…`), §3–§4; the 3B-5B draft verified its §4.1–§4.3
tables against 5B's sealed records with no numeric error (three clarifications: "requested" in §4.1 excludes the 16,384
screen evaluations; 25,422 is a per-member requested count; the 1,679,368 pool-job total includes 25,227 cross-test
evaluations).

- **Independent lane (V cell):** Latin-supercube scrambled-Sobol screen 512 → plausibility → promotion 64 (¼ centre net,
  ¼ constrained rank, ⅛ entry pattern, ⅛ control pattern, rest max-min diversity) → rung 1 (16 draws, centre-first) → 2
  base NSGA-II islands × 256 new proposals (population 32) → extension islands while NL0's trigger fires (> 5 % gain in
  island hypervolume of (−robust, p90 DD), best feasible robust net or best feasible centre net, or a new feasible
  behaviour class), cap 6 → rung 2 12 × 64 → rung 3 6 × 128 → one refinement pass from the robust and profit starts
  ($2,000 rule) → shortlist 3.
- **Informed lane:** seeds + 12 near (×1.5) + 12 broad (×3) designs, focus seeds + 64 (×0.5) + 64 (×1.0); 4 base islands ×
  384, cap 8; rung 2 16 × 64, rung 3 8 × 128; one pass from robust / profit / profit-2, two passes from the focus starts;
  shortlist 6.
- **Qualification:** Q1–Q6 (centre net > 0; centre DD ≤ $35,000; confirmation p90 DD ≤ $35,000; confirmation p10 > 0;
  10 bps net > 0 and DD ≤ $35,000; D1 and Growth funded); selection 2 × 128 (ranking), confirmation 3 × 128
  (qualification only); roles actual-profit, robust-profit, balanced, lower-drawdown; primary = actual-profit.
- **Chronology:** C19 → C21 → C23 folds, each selection committed before its slice; sequential verdict; C24 then FULL once.

## 2. Priority 3B: what the ≈ 5.83 M evaluations were [V]

| Item | Value |
|---|---|
| Total | 5,834,395 = 5,549,027 search + 285,368 qualification; 22,493 archive hits; 16.03 h wall, 218.4 worker-h, 14 CPU workers |
| Search jobs | C19 1,212,750 · C21 1,169,417 · C23 1,178,935 · C24 independent 1,308,569 · C24 informed 679,356 |
| Proposals | configured 131,072 base / 196,608 cap per independent cutoff; executed 133,120–149,504 per cutoff; 602,111 in all |
| Lanes and seeds | 8 cells per cutoff (V×2, G×2, B×4, entry pinned) × **1 seed stream each**: no replicates |
| Islands | 155 (19 extensions); population 64 / 2,048 new per island / 32 generations (a larger island than NL0's) |
| Stops | all 34 lanes "triggers not met": **0 budget-bound**; every independent island stopped on its proposal cap (133 of 144 still improving when cut, from trajectories [R]) |
| Stage shares (fresh) | rung 1 84–86 % (independent), screen 5–6 %, rungs 2 and 3 ≈ 1 % each, refinement 7.0–8.5 % |
| **V share** (the three-book structure of this study) | 22.8–27.8 % of requested per cutoff: **≈ 1.28 M requested (≈ 1.27 M fresh) over the four cutoffs** |
| IJ1's lane (informed-joint) | 88 seeds; 21,208 configured base proposals (cap 37,592); executed 24,344 (4,824 designs + 19,520 island children); 6 islands (2 extensions; 4 stagnation, 2 budget); 357,475 requested |

The 3B report says every island stopped on its budget; that holds for the independent islands but 8 of the 11 informed
islands stopped on stagnation (3B-5B draft §3B.9).

## 3. Priority 5B (L0 arm, the effective budget that produced New L0) [V]

49,346 executed proposals, 121 islands, 70 refinement starts / 11,137 moves, 489,695 requested search evaluations, as
NL0 §4.1. **Budget-boundness is overstated by its labels:** 13 of 26 L0 lanes were stopped by a cap or the resource
guard (9 guard, 4 extension cap), but only 9 of 26 had L0's own trigger still firing; at C24 only 1 of the 4 "extension
cap reached" lanes was firing on its own trigger (the others were extended because an L1/L2 lane at the same position
fired); 21 of L0's 49 extension islands ran without L0's own trigger. The resource guard stopped extension at round 2 at
C19 and C21; the finishing phases used 82,646 / 87,411 against a 144,000 reserve. 2 replicates per cell, shared by the
three lifecycle arms. Informed lane split (L0, both replicates): designs 14.7 %, islands 51.0 %, rungs 6.0 %, refinement
28.3 % of requested (18.6 % of fresh: the second replicate's focus refinements were archive hits).

## 4. Assignment 3 (the full joint genome; N/original's origin) [V]

| Item | Value |
|---|---|
| Lanes | 680: per cutoff 128 broad (64 cells × 2) + 26 refinement (13 cells × 2); Track N 64 (16 pairs × R_N = 4) at C24 |
| Work | 1,303,708 proposals; 3,302 islands; 2,152 refinement starts / 366,927 moves; **18,265,213 requested, 17,533,469 fresh**, 722,891 hits; 1,644,899 qualification (653 per member) |
| Compute | 12 CPU workers; 44 h 24 min chain; 207 fresh/s (C19) → 106 (C24) → 86 (Track N); peak 18.99 GiB |
| Stops | 495 "triggers not met", 185 "extension cap reached", **0 resource guard** (jobs used 25–43 % of their caps) |
| Budget-bound, Track I | C19 33/154 (21.4 %) · C21 47/154 (30.5 %) · C23 42/154 (27.3 %) · C24 49/154 (31.8 %) — 171/616 (27.8 %); broad 163/512, refinement 8/104 |
| Budget-bound, Track N | 14/64 (21.9 %) |
| By decline gates ON (broad) | 0 gates 5/128 (3.9 %) · 1 gate 48/256 (18.8 %) · **2 gates 110/128 (85.9 %)**; by control patterns: 2.1 % at 2, 26.3 % at 16, 79.2 % at 32, 95.8 % at 64 |
| Why | the trigger still firing at the cap was the **class component alone** in 142 of 185 bound lanes (120/163 broad, 8/8 refinement, 14/14 Track N); median last-island gains 0.04–0.16 % hypervolume, 0.00 % centre net; the class component alone caused 40.2 % of broad, 83.5 % of refinement and 94.6 % of Track N extension islands. Without the class term only 5 broad lanes and no seeded lane would have been bound [R from the logged states] |
| Islands | every island used its full allotment except 11 of 3,302 (stagnation) |
| N/original | profit pick #1 of lane `C24/informed/GD.VB/R2` (job informed2); its best centre net ($388,031.02) appeared during base island 3; refinement found no ≥ $2,000 move; the 4 extension islands added nothing; the lane ran to the cap of 8 on the class trigger alone |
| Replicate noise | median \|best qualified net R1 − R2\| per cell $5,953 / $13,083 / $16,762 / $23,858 at C19–C24 = 6.2 / 6.3 / 8.9 / 12.3 % of the better replicate; Track N across 4 replicates: median $1,225, max $25,348 |
| Genome | 14 categorical + 78 ordinal = 92 genes (`src/vg-l0-full-joint/space.ts`) |

## 5. Stage B and Priority 4 on the GPU (the same lane, official) [V]

| Study / arm | Fold | Budget-bound base (cap 6) | After a 1.5× block (cap 9) |
|---|---|---|---|
| Stage B CTRL (P0, S1 absent) | C19 / C21 / C24 | 0/32 · 3/32 · 3/32 (all GB0.VD1) | — |
| Priority 4 CTRL (S1 OFF, 92 genes) | C19 / C21 / C24 | 2/64 · 4/64 · 8/64 (all GB0.VD1) | **0 · 0 · 0** (converged at 7–9 islands) |
| Priority 4 EXP (S1 allowed, 101 genes) | C19 / C21 / C24 | 32/64 · 34/64 · 41/64 | **32/64 (50.0 %) · 31/64 (48.4 %) · 31/64 (48.4 %)** |

- **What exhausted Priority 4's EXP budgets.** 93 of the 94 still-bound EXP lanes were GB0.VD1 (every EXP GB0.VD1 lane hit
  the base cap in every fold). The staged pattern multiplied the class universe eightfold (EXP GB0.VD1 128–343 feasible
  classes against CTRL's 25–48); the last trigger of all 94 still-bound lanes included the class component and in 84 it
  was the class component alone; in islands 7–9 the median gains were 0–0.6 % hypervolume, 0 % robust and 0 % centre
  net. The CTRL (S1-OFF) lanes are the relevant precedent for this study's genome: they converged by NL0's own rule.
- **The extension block's cost.** Each capped lane was re-run from scratch in a new archive: 56–60 % of the block's
  evaluations replayed the base islands; 24–27 % were new islands.
- **Priority 4 informed lanes I1–I4:** 48 lanes, 1,588,312 requested, all "triggers not met" at 4–5 of 8 islands.
- **Never binding:** no resource guard fired in either study (largest lanes 28.5k of 42k; Priority 4 used 14.3 M of its 25 M
  ceiling; Stage B 3.96 M of an 8.8 M bound).
- **Screen breadth at C24:** only 7–9 of 512 screened configurations per lane were plausible (drawdown over $35,000).

## 6. GPU throughput and resources on the accepted backend [V]

| Door | Search, 128 lanes (Priority 4) | Search, 64 lanes (Stage B) | Qualification | Slice / validation |
|---|---:|---:|---:|---:|
| D19 | 2,197 req/s | 1,808 | 1,222–1,291 | — |
| D21 | 1,671 | 1,339 | 956–969 | 530–735 (interval) |
| D23 | — | — | — | 446–626 |
| D24 | 1,140 | 884 | 733–738 | — |
| FULL | — | — | — | 351–512 |

- Throughput rises with lanes in flight (D24: 4 lanes 126/s, 8 lanes 232/s, 64 lanes 884/s, 128 lanes 1,140/s); device time
  ≈ 0.30 ms per 1,000 candidates per door session; median server time per 8,192 batch 2.3 s (D19) – 4.8 s (D24); gate
  opening 9–19 s per job (dataset export 5–9 s).
- Peak VRAM 5.9–6.3 GiB device-wide; power ≤ 208.5 W; GPU busy 0.61–0.80 of wall; 8 host workers, batch 8,192 (lanes) and
  4,096 (qualification).
- Memory peaks (systemd, page cache included): 128-lane search 16–18 GB; 64-lane 10 GB; qualification ≤ 10.9 GB.
- **Archives: 4,580–4,713 bytes per fresh evaluation**, independent of the door (Priority 4: 65.99 GB for 14.0 M fresh).
- **Concurrency** (GPU Phase 4, gb3, documented; not re-measured on gb7): separate jobs time-slice the GPU; two independent
  jobs give 1.25× (1.31× complete) aggregate, each 1.52× slower; splitting ONE study stage into parallel jobs gives only
  1.07× at two parts and is slower beyond. Every official job of Stage B and Priority 4 ran alone, sequentially.

## 7. What limited the extensions

1. **Not the resource guard** (never fired in Assignment 3, Stage B or Priority 4) and **not islands stopping early**
   (islands always spent their allotment).
2. **The island cap combined with the class component of NL0's trigger.** Where the class universe is large (two gated,
   protected books: up to 64 control patterns × 3 funded combinations; Priority 4's staged patterns: ×8), lanes keep
   finding new feasible classes long after the performance components have stopped improving. This, not performance
   progress, produced most budget-bound lanes in Assignment 3 (142/185) and Priority 4 (84/94 at the cap).
3. **Little genuine improvement late in a lane:** median late-island gains ≈ 0 in robust and centre net; the extension
   islands of N/original's own lane added nothing.
4. **Breadth across seeds was the larger lever:** replicate noise was 6–12 % of the better replicate per cell (Assignment
   3), larger than any late-island gain; 3B had a single seed stream per cell; 5B and Assignment 3 two.
5. **Refinement** allows one pass; at C21/C24 almost every start moved in it (Priority 4), but it never enters a stop
   reason.

## 8. Consequences for this study's budget (adopted in PROTOCOL.md §7)

| Design element | Evidence | Choice |
|---|---|---|
| Per-lane schedules | NL0 1.0.0 / Assignment 3 | unchanged (screen, promotion shares, rung fidelities, island size, operators, stagnation, refinement passes, shortlists) |
| Island extension up to NL0's cap | NL0 | NL0's full trigger (performance + class), exactly as executed |
| Island extension beyond NL0's cap | §4, §5, §7.2–7.3: class-only extensions add ≈ 0 performance; Priority 4 CTRL converged by 7–9 islands | continue to **16 islands** on NL0's **performance** components only; class-only stops reported apart as *coverage-limited* (never as convergence) |
| Seeds | §7.4: replicate noise dominates | Track F **4 base replicates** per cell per cutoff (2× Assignment 3) + up to **4 convergence-driven replicate rounds** (one replicate of every cell each) on a 2 % union trigger |
| Refinement lanes | Assignment 3 AD10 | the same frozen plan rule (RA1 slot → NL0's balanced role), **4 lanes** per refined cell (2× Assignment 3) |
| Track N | Assignment 3 rule (R_N matching Track I at C24) | **R_N by the same matching rule** from the pilot, + up to 4 replicate rounds; seeds = N/original only |
| Job shape | §6: one stage per job, sequential; 128 lanes per job measured stable | broad in two jobs of 128 lanes, run one after another; no concurrent split of a stage |
| Ceiling | §6: 4.7 KB per fresh evaluation; disk 469 GB free at start | hard ceiling 80 M requested (ledger), launch rule (remaining ≥ 1.5 × expected), disk reserve 60 GiB — a resource safeguard, never convergence |

**Common units against the precedents** (expected; the frozen protocol gives the bounds): Track F per cutoff ≈ 256
broad + ≤ 68 refinement lanes ≈ 10 M requested ≈ **2× Assignment 3's Track I** and **≈ 30× 3B's V-structure search per
cutoff** (≈ 0.32 M); base proposals per cutoff 256 × (512 + 2 × 256) = 262,144 (2× 3B's independent base of 131,072,
which spread over eight cells of which only two were V). Equal or greater effort is claimed only in these units.

## 9. Evidence gaps

- Fresh evaluations are tallied per job and stage tag, not per lane (3B, 5B); per-lane fresh figures are estimates.
- Proposal provenance (design or island child, which island and generation) is not recorded in any study; the island
  that produced New L0 or N/original cannot be identified without replay.
- The trigger's class keys are recorded only as counts; GPU utilization only as 30-second samples.
- Concurrency was benchmarked on gb3 (GPU Phase 4), not on the accepted gb7.
- Per-round timings come from git-ignored logs that exist only on Apollo.
