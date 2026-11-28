# Protocol P5-NS 1.0.0 — Priority 5: comprehensive N/original successor optimization

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
official evaluation). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only). Research only: nothing
here adopts a candidate, changes an official configuration, replaces New L0 or N/original, merges into `main`, deploys or
touches a broker. Reports are written analysis, Markdown tables and machine-readable results only (standard §7.7).

- **Study:** `research/vg-l0-n-successor/`; official code `src/vg-l0-n-successor/` started by `npm run vg-l0ns -- <command>`
  through `src/gpu-backend/officialRunner.ts`; non-official engineering, pilot and report-only tools in
  `tools/vg-l0-n-successor/` (`npm run vg-l0ns-eng`).
- **Brief:** `brief/BRIEF.md` (the user's "Claude Code — Priority 5: Comprehensive N/original Successor Optimization",
  356 lines, 33,735 bytes, sha256 `7163f8db78ca520ff1d20c76ee395f652bdcde4f910b7988cd7bd9e29a34ec79`, read in full to its
  §10 acceptance criteria and closing statement).
- **Branch:** `research/vg-l0-n-original-successor` (main checkout) from `5d587bb28860967327a9f1b1263154b26f144e8c`, the tip
  of `research/vg-l0-trailing-stop-audit`: the last S1-free revision, whose evaluation code equals GPU Phase 7's accepted
  tree (only new study directories were added since `fc027eed`). The Priority 4 branch (S1 engine, Phase 8 record) is NOT
  an ancestor: no S1 code exists in this branch's engine.
- **Phase A evidence:** `METHOD_AND_BUDGET_RECONSTRUCTION.md` (written before this protocol; pinned in the freeze).

## 0. Standard adoption, reference method, adaptations and departures

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` **3.0.0**, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`, read in full 2026-11-24T11:33Z |
| Adoption manifest | `STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-l0-n-successor`); every official stage calls `requireStandardAdoption` (`stages.ts officialGuards`) |
| Scope | `optimization` |
| Evaluation backend (§9) | official evaluations only through `openOfficialGpuSession` → `GpuPool` → `EvalLab`; acceptance `config/gpu-backend/acceptance.json` (GPU Phase 7, sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`, binary `research/gpu-phase7/build/gb7` `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82`, device `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`), its sha256 kept out of band; no CPU fallback; `node --no-maglev` |
| Reference method (§4.8) | `docs/research/methods/NEW_L0_METHOD.md` id `NL0` version `1.0.0`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`, executed through Assignment 3's lane (its GPU form, the pilot's generated lane) exactly as Assignment 3, Stage B and Priority 4's CTRL arm ran it; stage map §7.8 |

| ID | Standard § | Kind | What and why | Agreement |
|---|---|---|---|---|
| AD1 | §4.1, §4.3, §4.8 | adaptation | **Assignment 3's 92-gene full joint space** (64 D1 risk-control cells × Growth·VGT's complete Growth 1.4.0 genome), imported unchanged; Growth·GDX OFF; S1 absent from the engine; shadow-entry eligibility OFF; calendar-day holds. The brief fixes this scope (§1) | — |
| AD2 | §4.2, §4.8 | adaptation | **Effort by replicates of NL0's unchanged per-lane schedules:** Track F 4 base replicates per cell and cutoff (Assignment 3: 2), 4 refinement lanes per refined cell (2), Track N R_N replicates per family pair by Assignment 3's matching rule (§7.6) | — |
| AD3 | §4.5, §4.8 | adaptation | **Two-tier island extension** (§7.5): NL0's full trigger up to NL0's own caps (6 / 8), then up to 16 islands on NL0's PERFORMANCE components only; and **convergence-driven replicate rounds** (§7.5) — instead of NL0's "more replicates only". The brief requires caps that avoid Priority 4's ≈ 48 % budget-bound outcome and multiple predeclared extension rounds (§3.3.4–§3.3.7); Phase A §7 shows the class component alone kept 142/185 Assignment 3 lanes and 84/94 Priority 4 lanes at their caps with ≈ 0 performance gain | brief §3.3 (adaptation; no [M] rule changed) |
| AD4 | §1.8 | adaptation | **The sequential drawdown statistic** (§11.2) is the strict drawdown of the chained path over every mark the accepted GPU path returns exactly (each slice's minute reset drawdown, every session close, every lot's minute minimum); the GPU returns no minute mark series and a CPU-scored official statistic is forbidden (§9.2). The CPU reference value of Assignment 3's exact minute chain is reported beside it, non-official | — |
| AD5 | §1.2, §1.4 | adaptation (one exception, otherwise stricter) | FULL is read before the frozen selection **only** for the known-target reproduction of the frozen references New L0 and N/original (gate E2: equality with their published full-history figures; no other output), through the door guard's engineering use, refused after the freeze (Assignment 3 AD3, GPU Phase 1 AD3) | — |
| AD6 | §2.3, §2.5, §5.9 | adaptation | **NL0's original rule only:** Assignment 3's experimental RA1/RA2 selectors are NOT used (they read §5.9 quantities as ranking inputs — Assignment 3's user-agreed departure AD5, not granted here); its refinement plan's RA1 slot is replaced by NL0's balanced statistic (§7.2) | — |
| AD7 | §4.4, §3.2, §3.3, §1.9 | adaptation | **Track N** (incumbent-informed, C24 only): Assignment 3's informed machinery with **N/original as its only seed** projected onto every family pair (§7.4); N/original and New L0 are incumbent members of the informed sets N and U (the qualifying-incumbent rule) | brief §3.1 |
| AD8 | §5.3 | adaptation | The neighbourhood instrument, its seed namespace and labels are **Assignment 3's** (`deriveSeed('vg-l0-full-joint', 'nbhd', …)`; families ('select' \| 'confirm', rep, cutoff)): the references' C24 evidence reproduces Assignment 3's sealed evidence exactly (gate E2), and members are comparable with Assignment 3's. Confirmation draws were never a ranking input in either study | — |
| AD9 | §5.1 | adaptation | Two report-only stresses beside Assignment 3's six: cost **2 bps** per side and stop slippage **+10 bps** (brief §6: 0/2/5/10/20 bps and slippage); never a gate, role or ranking input | brief §6 |
| AD10 | §1.8, §2.5 | adaptation | **The successor determination** (§12): precommitted material-improvement criteria against N/original (profit or risk type, non-inferiority bands, replication across seeds), the support labels and the outcome labels — governance labels, never a fitness term, ranking input or gate | brief §7 |
| AD11 | §5.9 | adaptation | No disjoint pre-2016 VGT/GDX data exist on the machine; none is acquired. The hold-window tail stress uses an in-sample stress over 2016–2024, same-period proxies XLK and GDXJ (labelled "proxy, same period, not disjoint") and synthetic gaps (Assignment 3 AD11) | — |

No [M] rule is changed: there is **no departure**.

## 1. Question, hypotheses, objective and outcomes

- **Question (brief §0).** Does a substantially larger, convergence-driven, GPU-accelerated joint optimization of D1·VGT +
  D1·GDX + Growth·VGT — an independent from-scratch track and an N/original-informed track — find a materially stronger
  and more robust successor to N/original, under fixed strategy behaviour and the unchanged NL0 method?
- **Objective (standard §2.2).** Development net profit (realized + marked, after costs and interest) with a maximum minute
  marked drawdown ≤ **$35,000 = 35 % of the fixed $100,000 initial trading allocation** (P0; never of peak equity), beside
  neighbourhood robustness, chronological evidence and exposure diagnostics.
- **Hypotheses** (each may fail; a null is a result):
  - **H1 (independent discovery).** Track F's C24 best qualified member reaches N/original's region (centre net within
    $10,000 of N/original's, or above). Null: the independent search stays in a lower region (as in Assignment 3, −$75,291).
  - **H2 (informed refinement).** Track N finds a qualified member that is a successor worthy of consideration (§12).
    Null: no material improvement over N/original.
  - **H3 (chronology).** The independent procedure F/original is chronologically supported (§11.2). Null (expected from
    every earlier independent procedure under NL0's rule): unsupported.
  - **H4 (convergence).** With the two-tier rule the residual budget-bound share (a performance component still firing at
    16 islands) is ≤ 10 % of lanes in every track and cutoff, and the replicate rounds stop on their trigger. Null: the
    search is budget-limited and is reported as such.
- **Valid outcomes:** a successor worthy of consideration (research nomination only); **no material improvement: keep
  N/original as the preferred research incumbent and New L0 as the frozen benchmark**; no chronological support for the
  independent procedure. None is a failure of the study.

## 2. Prior knowledge and provenance

- **N/original** — Assignment 3 `C24/informed/GD.VB/R2#1 profit`, id `rc1-f1a8b57cb02455c3`, cell GD1.VB0 (D1·GDX family D:
  protective stop 15.9 %, adaptive hold 13 → 28 days at 7.0 % progress, decline gate K 3 / r 700 / c 60; D1·VGT family B:
  protective stop 12.0 %; both next-session activation; Growth·VGT New L0's structure with three fine changes); the
  primary of Assignment 3's populations N and U under NL0's original rule; read only from Assignment 3's sealed
  `FROZEN_SELECTION.json` (`4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7`). Sealed figures: development
  $388,031.02 / DD $19,459.83 / 32 lots; full 2016-01-04 → 2026-10-30 $482,700.73 / $20,385.99 / 44 lots, signature
  `54d1c2e07c2dbbfd`; validation (examined) +$94,669.70. **Incumbent-informed: its seeds (New L0, IJ1, C4, C4-refined)
  were chosen with 2016–2026 or 2016–2024 in view; no independent chronological test.**
- **New L0** — 5B `C24/L0/informed/R1#1 profit`, Priority 3 quad `a2e385640ca61012` (legacy cell GA0.VA0): development
  $382,721.46 / $19,459.83 / 34 lots; full $479,605.18 / $20,385.99 / 46 lots, signature `7b17578108747911`. The immutable
  original benchmark; never altered.
- **I1** — Priority 4's informed EXP primary (New L0 with staged trailing stops, S1 ON; branch
  `research/vg-l0-staged-trailing-stop`, `research/vg-l0-staged-stop/`): a **fixed, S1-enabled external comparator** that
  this S1-free engine cannot evaluate. It is reported only from its own sealed records, in its own sealed context, labelled
  S1-enabled; never a seed, member, finalist or nominee here.
- **Examined history.** All of 2016-01-04 → 2026-10-30 has been examined by Priorities 3–8, Assignments 1–3, the
  risk-envelope studies, Priority 4 and Strategy Lab; 2020, 2022 and 2025–2026 repeatedly. Every fold and the validation are
  **retrospective procedural evidence on previously examined history, not a pristine holdout**; more seeds or folds do not
  create independent market histories.
- **Real-data exposure before this freeze:** the engineering gates (equality counts, hashes and the references' sealed
  figures only), the pilot (counts, timings, stop reasons; BENCH seed keys never used by the study) and Phase A (sealed
  records of earlier studies). No box, threshold, budget or rule here was informed by a searched configuration's profit.

## 3. Data, doors and windows

- Canonical minute data `data/VGT/data.csv` and `data/GDX/data.csv`; Priority 3's verified byte-prefix doors **D19, D21,
  D23, D24** (through 2019-12-31, 2021-12-31, 2023-12-29, 2024-12-31; size, sha256 and last row verified before parsing; pins
  recorded in the freeze) and **FULL** 2016-01-04 → **2026-10-30** (the common complete endpoint, verified by the door
  loader; VGT's 8:1 split on 2026-04-21 forward-adjusted); no November–December 2026 data exist and none is implied.
- Development 2016-01-04 → 2024-12-31 for every choice; validation 2025-01-02 → 2026-10-30 only for the frozen slate, once.
- Folds: **C19** → slice 2020-01-02 → 2021-12-31 (D21); **C21** → 2022-01-03 → 2023-12-29 (D23); **C23** → 2024-01-02 →
  2024-12-31 (D24); **C24** → FULL once. Every run is continuous from 2016-01-04 (no liquidation or reset at a boundary);
  slice P&L = the marked change from the cutoff close; slice DD resets at the cutoff close; whole-run DD beside it.
- Every opening goes through `doors.ts` (guards in its header) and is logged in `results/doors.jsonl`.
- Proxy data for the tail stress only (report-only): `data/XLK/data.csv`, `data/GDXJ/data.csv` (2016–2024 part).

## 4. Controls, incumbents and comparison rows

| Key | Role |
|---|---|
| N/original | the preferred research incumbent: Track N's only seed; a descriptive **control** qualified at every cutoff with the study's instrument (never a Track F member); at C24 an incumbent member of N and U (the qualifying-incumbent fallback); the reference of the successor determination (§12) |
| New L0 | the frozen original benchmark: a descriptive control at every cutoff; at C24 an incumbent member of N and U |
| I1 | S1-enabled external comparator, sealed Priority 4 figures only (§2) |
| Assignment 3's procedures and Track N primaries | report-only comparison rows from their sealed records (Assignment 3 had half the replicates, NL0's caps and RA1) |

## 5. Engine and conventions (unchanged)

Priority 3's pooled engine through RC 2 (`src/d1-risk-controls-rc2/`) as Assignment 3 used it, on the accepted GPU
evaluator (the TypeScript engine stays the reference): one exclusive funded $100,000 slot granted only at a decision's own
instant when nothing is open or reserved; same-instant order D1 first, then GDX before VGT; no compounding, preemption or
forced switches; 5 bps per side inside the fill prices, $0 commission; 11 % simple interest on outstanding principal by
calendar day (365-day year); stops at the stop level or the gapped open; fractional shares; harmonized D1 arming from
2016-01-04; D1's shadow lifecycle and Growth lifecycle L0; shadow-entry eligibility OFF; Growth·GDX disabled (Priority 3's
placeholder, never run or funded); calendar-day maximum holds. Every evaluation requests the risk envelope (trade
principal loss, banked-capital DD; marked and liquidation): report-only, never read by a decision.

## 6. Space (Assignment 3's, unchanged; `src/vg-l0-full-joint/space.ts`)

- 14 categorical + 78 ordinal = **92 genes**: per D1 book family A–D (A no protective stop, legacy hold; B stop, legacy
  hold; C stop, hold disabled; D stop, adaptive hold) × decline gate OFF/ON (64 cells); activation per protected book;
  Growth·VGT's 8 structural + 50 conditional numeric genes; D1 genes on Study 8's box; control genes d, hx, g, K, r, c on
  Assignment 2's audited boxes; Growth on growth140's boxes (maximum hold 3–30 calendar days).
- Coarse grid for Track F's screens and broad islands; fine grid for refinement and Track N lanes, every refinement move
  and every neighbourhood; N/original and New L0 are exact fine-grid points (gate E3 and the seed tests).
- Inactive genes masked; identity `riskId2` of the quad and canonical controls; behavioural equivalence = the funded-lot
  ledger signature (one configuration per ledger in promotions and shortlists); distance = normalized L∞ over active
  numeric inputs, 1 across cells, activation patterns or Growth structures.
- **Coverage protection** (standard §4.3, §4.7): every cell gets the identical Track F budget; the screen strata
  (activation × K × Growth stratum) and the promotion/rung ⅛ shares per Growth entry pattern and per control pattern are
  NL0's / Assignment 3's. Growth·GDX does not exist here, so standard §4.7's both-Growth protection has no object.

## 7. Search, budgets and stopping

### 7.1 Track F broad lanes (independent; every cutoff)

One lane = NL0's V-cell schedule on one cell (Assignment 3 §7.1): screen 512 (coarse, structure pinned, strata) →
plausibility → promotion 64 → rung 1 (16, centre-first) → **2 base islands × 256** (population 32, NSGA-II operators of
NL0) → extension islands (§7.5) → rung 2 12 × 64 → rung 3 6 × 128 → refinement (robust and profit starts, one pass,
$2,000 rule) → shortlist 3. Seed key = lane key `<cutoff>/broad/<cell>/R<r>` in Assignment 3's seed namespace, replicates
**R101–R104** (never Assignment 3's R1–R2 or Stage B's / Priority 4's R3–R34). No incumbent, control, archive or
later-selected vector or range enters. Jobs: `<C>-broad1` (cells 1–32 of `allCells` order × R101–R104: 128 lanes) and
`<C>-broad2` (cells 33–64), one after the other.

### 7.2 Track F stage-2 refinement (every cutoff; frozen rule `select.ts refineCells`)

From the cutoff's qualified broad members only: up to 16 cells + the legacy cell GA0.VA0 — (1) GA0.VA0 always; (2) the 4
cells with the best qualified centre net; (3) the 4 with the best selection robust net; (4) the 2 with the lowest
selection p90 DD among members with robust ≥ 50 % of the best; (5) **the 2 best by selection robust ÷ selection p90 DD**
(NL0's balanced statistic; replaces Assignment 3's RA1 slot, AD6); (6) coverage of every D1 family on both books, a gated
and an ungated cell, an asymmetric cell, a protected cell, both Growth entry methods and both Growth recovery-gate states.
Each refined cell gets **4 lanes** (R101–R104) of NL0's informed schedule seeded by the cell's qualified broad members
(each + 12 near + 12 broad designs; focus seeds = the cell's actual-profit and robust-profit members + 64 + 64): 4 base
islands × 384, extensions §7.5, rung 2 16 × 64, rung 3 8 × 128, refinement robust / profit / profit-2 (one pass) and focus
starts (two passes), shortlist 6; fine grid; the cell fixed. Job `<C>-refine`.

### 7.3 Order per cutoff

broad1 → broad2 → replicate rounds of Track F (§7.5) → qualification `broad` (+ the controls) → refinement plan →
refinement → qualification `refine` → [C24: Track N informed1 → informed2 → its replicate rounds → qualification
`informed` (+ the incumbents)] → selection (sealed and **committed** before the next door) → the slice evaluation (C19–C23)
or, at C24, the frozen selection → FULL authorization → validation → outcome. An earlier cutoff never runs after a later
cutoff's stage exists (`foldGuard`).

### 7.4 Track N (N/original-informed; C24 only; `informed.ts`)

One lane per D1 family pair (16) and replicate (R101 … R(100 + R_N)): NL0's informed schedule (as §7.2), fine grid,
families pinned, both gates, activations, Growth structure and every numeric gene free (NL0's informed islands freed the
structure). **Seeds (16 per lane): N/original's own D1 vectors and Growth·VGT on each of the pair's 4 gate states × 4
control variants** — variant 0 NATIVE (N/original's own control values where its book has them; missing ones from
Assignment 3's precommitted grid; N/original's activations), variants 1–3 from Assignment 3's grid and activation
formulas with the incumbent index replaced by the variant; dormant gate controls kept. In pair GD.VB the native projection
at gate state 1 **is N/original exactly** (tested). **Focus seeds (2 per lane):** the native projection at gate states
(1 + R − 1) mod 4 and (1 + R + 1) mod 4 (R = replicate index 1, 2, …), so across replicates each gate state is focused and
N/original itself is a focus seed of every odd replicate of its own pair. Designs ≤ 16 × 25 + 2 × 128 = 656 per lane.
Refinement with gate switches; shortlist 6 including the best member of each gate state. Jobs `C24-informed1` (GDX
families A, B) and `C24-informed2` (C, D). Track N never feeds Track F; New L0 and I1 are never seeds (brief §3.1).

### 7.5 Extension and stopping (frozen; development only; `lanes.ts`, `budget.ts`)

**Tier 1 — islands, per lane.** After each measured island a lane runs one more island iff:
- it has run fewer than **NL0's cap** (6 broad; 8 refinement and informed) and NL0's trigger fired on its last island: the
  island raised the lane's hypervolume of (−robust net, p90 DD) against (0, $35,000), its best feasible robust net or its
  best feasible centre net by **> 5 %** (the *performance* components), or produced a new feasible behaviour class (cell ×
  control pattern × funded components; the *class* component); or
- it has run at least NL0's cap and fewer than **16 islands**, and a **performance** component fired.

The components are recomputed exactly from the island's full-precision before/after states and must agree with the
lane's own decision. Decisions are taken at barriers and depend only on the lane, so a lane's result is independent of
its job. **Stop reasons** (recorded per lane): *triggers not met* (NL0's per-island stagnation rule); *class trigger only
beyond NL0's cap* (**coverage-limited**: performance converged by NL0's 5 % rule while feasible classes still grow);
*extension cap reached* (a performance component still fired at 16 islands: **budget-bound, not converged**); *resource
guard* (the job cap; it cannot bind because the job cap is the sum of the lanes' worst cases).

**Tier 2 — replicate rounds, per track and cutoff** (`round` stage). After the base replicates (Track F: R101–R104 of
every cell; Track N: R101 … R(100 + R_N) of every pair) and after each round, one more replicate of **every** structure
(Track F: 64 lanes; Track N: 16 lanes) runs iff the **last** replicate raised the union of the track's feasible rung-3 and
shortlist fits — its hypervolume of (−robust net, p90 DD) against (0, $35,000), its best robust net or its best centre net —
by **> 2 %**, or gave a structure (Track F: a cell; Track N: a cell of a pair) its first feasible fit; at most **4 rounds**
per track and cutoff. Stop: *replicate triggers not met* (converged across seeds by this rule) or *replicate cap reached*
(budget-bound across seeds). Each decision record is sealed before its lanes run.

**Progress per unit of compute** (hypervolume gain per 10,000 evaluations per island; union gain per round) is recorded.
**Budget exhausted is never described as convergence.** Precommitted response (brief §3.3.10): if more than **10 %** of a
track's lanes at a cutoff end *extension cap reached*, or a track ends *replicate cap reached*, the cutoff's search is
labelled **"budget-limited (not converged)"** in every report, all its records are kept, and no further search is run in
this study (a further search would be a separate decision of the user). *Coverage-limited* lanes are reported with their
share; they are not budget-bound by performance and not converged in class coverage.

### 7.6 Budgets (`budget.ts`; frozen)

| Stage (per cutoff unless noted) | Lanes | Distinct proposals configured base / maximum | Requested-evaluation bound |
|---|---:|---|---|
| Track F broad | 256 (+ 64 per round, ≤ 4 rounds) | 256 × (512 + 2 × 256) = 262,144 / 512 × (512 + 16 × 256) = 2,359,296 | lanes × PLC_broad |
| Track F qualification `broad` | ≤ 3 × 512 shortlisted + 2 controls | — | members × per-member (§9) |
| Track F refinement | ≤ 17 cells × 4 = 68 | ≤ 68 × (856 designs + 4 × 384) / ≤ 68 × (856 + 16 × 384) | lanes × PLC_refine |
| Track F qualification `refine` | ≤ 6 × 68 | — | members × per-member |
| Track N (C24) | 16 × R_N (+ 16 per round, ≤ 4) | 16 × R_N × (≤ 656 + 4 × 384) / (R_N + 4) × 16 × (656 + 16 × 384) | lanes × PLC_informed |
| Track N qualification (C24) | ≤ 6 × lanes + 2 incumbents | — | members × per-member |
| Slice (C19–C23) / validation (C24) | subjects ≤ 5 primaries + 12 roles + finalists + 2 controls | — | subjects × per-subject |

- **PLC** = a lane's deterministic worst case (every centre plausible, every island to 16 with a full filler population,
  every refinement pass over the largest move set of 230 moves), rounded up to 1,000: **PLC_broad 90,000, PLC_refine
  174,000, PLC_informed 171,000** (computed by `budget.ts laneCaps`, recorded in the freeze). Per member **655** requested
  evaluations (2 centres, 8 stresses, 5 removals, 2 × 128 + 3 × 128); per slice subject **≤ 306** (2 centres, 8 stresses,
  2 × 128, ≤ 40 session-close evaluations of 16 boundaries).
- **R_N (Assignment 3 §8.3's rule):** the smallest integer ≥ 4 such that 16 × R_N × (the pilot's expected informed lane at
  C24) ≥ the expected Track F C24 search (256 broad lanes + 17 refined cells × 4 lanes). Computed by the pilot (§13, E9)
  and frozen in code (`replicates.informedBase`); the pilot record shows the computation. **The pilot gives R_N = 8**
  (expected Track F C24 search 7,424,752 requested; 16 × 8 × 65,211 = 8,347,008 ≥ it, 16 × 7 × 65,211 = 7,303,632 < it):
  **128 Track N lanes** (16 pairs × R101–R108). Track N thereby gets at least the independent track's C24 search effort
  in requested evaluations — it is not starved to subsidize Track F.
- **Hard ceiling (resource safeguard, never convergence): 80,000,000 requested official evaluations** over the whole
  study (ledger over the sealed stage records). A stage launches only if the remaining ceiling covers **1.5 ×** its
  expected cost and the disk keeps **60 GiB** free after its archive (≈ 4,800 bytes per fresh evaluation); each stage's Lab
  gets maxFresh = min(its bound, the remaining ceiling). If the safeguard stops a stage, the study stops at that
  checkpoint, labels the stop **resource/operational**, reports what was not run and never selects from partial results.
- **Expected effort** (planning figures, never a decision input; `results/engineering/pilot.json`, recorded in the freeze's
  `expected`): requested per lane = Assignment 3's sealed mean at the cutoff × the pilot's ratio under the two-tier rule
  (broad 1.031, measured on D21; informed 1.008, measured on D24; refinement as informed + 2,550 for the larger seed set):
  broad 20,581 / 21,103 / 16,789 / 15,982 (D19 / D21 / D23 / D24); refinement 46,586 / 53,307 / 50,352 / 49,020; informed
  65,211 (D24). Planning totals: Track F ≈ 8–10 M requested per cutoff (256 broad + ≤ 68 refinement lanes + qualification),
  Track N ≈ 8.7 M, the whole study ≈ 44 M without replicate rounds and ≤ ≈ 70 M with every round, ≈ 8–13 h of GPU time at
  1,100–2,200 requested/s and ≈ 210–330 GB of archives (4,741 bytes per fresh evaluation, measured). The pilot's 144 lanes
  under the frozen rule ended 106 *triggers not met*, 38 *coverage-limited* and **0 budget-bound**; peak memory 20.3 GB
  (128 lanes, page cache included).

### 7.7 Stage map against NL0 1.0.0 (§4.8) and budget equivalence

| NL0 stage | Here | Adaptation |
|---|---|---|
| Independent lanes V/G/B, 2 replicates per cutoff | 64 cells × 4 base replicates (+ rounds), each NL0's V-cell schedule; the G and B cells' structures do not exist (Growth·GDX OFF) and their budgets are reassigned through the V-cell schedule to the 64 cells (as Assignment 3) | AD1, AD2 |
| Island extension to cap 6 / 8 | tier 1: NL0's trigger to NL0's cap, performance components to 16 | AD3 |
| (none) | tier 2 replicate rounds | AD3 |
| (none) | Track F stage-2 refinement (Assignment 3 AD10), 4 lanes per cell | AD2, AD6 |
| Informed lane (C24), 2 replicates, 9 seeds | Track N: 16 pairs × R_N replicates, N/original projected | AD7 |
| Qualification Q1–Q6, roles, actual-profit primary | unchanged; Assignment 3's instrument and seeds | AD8 |
| Final selectable set = independent + informed + incumbents | population U | — |
| Folds C19 → C21 → C23, commits before slices, sequential verdict | unchanged; the drawdown statistic adapted | AD4 |
| Frozen selection, FULL once | unchanged | AD5 |

Equivalence in common units (requested, fresh, proposals, islands, refinement starts and moves, archive hits) is reported
side by side with 3B, 5B's L0 arm, Assignment 3 and Priority 4's CTRL arm in `SEARCH_AND_CONVERGENCE_REPORT.md`; equal or
greater effort is claimed only in units both studies record (Phase A §8).

## 8. Robustness instrument (Assignment 3's, unchanged; AD8)

One Latin hypercube of u ∈ [−1, 1] over the 78 numeric columns per family (`deriveSeed('vg-l0-full-joint', 'nbhd', …)`),
common random numbers across a cutoff's centres (labels never contain the cell, stage or track); radii: D1 genes Study 8's
N1 grid radii, control genes Assignment 2's radii, Growth inputs 10 % of their box in value units rounded to the fine step;
clipped to the box widened to include the centre (clipping counted); K and every categorical input fixed; inactive inputs
untouched; the adaptive bound repaired; duplicates dropped. Families: rung 1 / refinement 16, rung 2 64, rung 3 128,
**selection 2 × 128** ('select', rep, cutoff: ranking), **confirmation 3 × 128 = 384** ('confirm', rep, cutoff:
qualification only). Statistics: median, p10, p90 net; robust = ½ median + ½ p10; p90 DD (Priority 3's cent-rounded
statistic); breach share with Wilson interval, mean excess, worst DD, p95 and worst-10 % mean DD (report-only).

## 9. Qualification (per cutoff and stage; `qualify.ts`)

Gates (all must hold; P0): **Q1** centre net > 0; **Q2** centre DD ≤ $35,000; **Q3** confirmation p90 DD ≤ $35,000; **Q4**
confirmation p10 > 0; **Q5** at 10 bps per side centre net > 0 and DD ≤ $35,000; **Q6** a D1 book and Growth·VGT funded at
the centre. No activity, concentration, tail or envelope gate. Report-only per member: stresses cost 0 / 2 / 10 / 20 bps,
14 % interest, stop slippage +10 / +25 bps, next-open stops; causal removals (without D1, without Growth, without GDX,
without VGT, without D1·VGT); participation labels (token < 5 % of funded principal-days); the detailed training centre
(realized / unrealized split, conservative net, open lot and its multiple, open-lot share, occupancy, per-lot MAE, worst
realized lot, mean losing lot); the risk envelope of every evaluation. A configuration already qualified at a cutoff keeps
its evidence; Track N members identical to a Track F member get a copy under their own label and track; a Track N lane that
re-shortlists N/original or New L0 is represented by the incumbent row.

## 10. Selection (no evaluation; `select.ts`)

- **Rule (NL0 1.0.0 §3.5, the only selector):** the actual-profit role — the highest centre net among the Q1–Q6 qualified;
  ties: higher selection robust net, lower centre DD, label. A population without a qualified member has no primary.
- **Populations** (controls excluded): **F** (Track F, all 64 cells: *the* independent procedure), **L** (F ∩ GA0.VA0) and
  **B** (F without an entry-day book) — report-only secondary procedures, never nominating; at C24 **N** (Track N members +
  the incumbents N/original and New L0) and **U** = F ∪ N (NL0's final selectable set; the study's formal C24 primary is U's).
- **Roles per population** (selection families): actual-profit; robust-profit = highest selection robust; balanced =
  highest selection robust ÷ selection p90 DD; lower-drawdown = lowest selection p90 DD with robust ≥ 50 % of the
  actual-profit holder's. Pareto set on centre net, centre DD, selection p10, selection p90 DD (reported).
- Each cutoff's selection record (primaries, top-10 rankings, roles, the slice subjects, the controls; at C24 the finalists
  and the successor pre-determination) is sealed and **committed before the next door opens**.

## 11. Chronology and the consequence

### 11.1 Fold slices (C19, C21, C23)

After a fold's selection is committed, one official job on the next door evaluates every subject (the primaries and roles
of F, L, B and the two controls): the detailed centre and the centre with the cutoff as boundary (slice P&L, reset slice
DD, whole-run figures), the 8 stresses, the training selection family (2 × 128, regenerated exactly) replayed on the slice
(standard §5.9: breach share with Wilson interval, median and worst slice DD), and the session-close series of the run
(16-boundary evaluations at every session of the slice).

### 11.2 Sequential paths and the verdict (AD4)

Each procedure (F, L, B under the original rule) chains its three fold primaries over 2020–2021, 2022–2023 and 2024: each
slice the primary's own continuous run, its path relative to its boundary equity; **5 bps of $100,000 per open lot closed
or adopted at a switch** (none when the configuration continues); a fold without a primary is flat. **Sequential
drawdown** D = max over slices k of max(DD_k, P_<k − (O_k + m_k)) — DD_k the slice's minute reset drawdown; O_k the chain
offset at slice k after its switch charge; P_<k the chain's running maximum over 0 and every earlier session close; m_k the
slice's minimum over its session closes and the exact minute minimum of every lot inside it (`sequential.ts`). D is a
lower bound of Assignment 3's minute statistic, exact except for an intraday cross-boundary peak or trough that no session
close or lot minimum shows (gate E6 measures the gap on engineering configurations). **Verdict:** *supported* iff every
fold produced a primary, the sequential net > 0 and D ≤ $35,000; otherwise *unsupported* or *incomplete*. F/original's
verdict is the study's independent chronological test; L and B are secondary; roles and the controls' fixed paths are
descriptive. The CPU reference value of the exact minute chain of the same paths is computed afterwards (non-official,
purpose cpu-reference) and reported beside it; it never replaces the verdict and **can never grant support**. Precommitted
qualifier (one-directional): if the GPU statistic gives *supported* but the CPU reference exact chain exceeds $35,000, every
report and the successor's support label state "supported by the GPU statistic; the exact minute chain (CPU reference)
breaches by $X — the support is not robust to intraday cross-boundary marks", and no report calls the procedure supported
without that qualifier. (Gate E6 measured gaps of $0 for both references and up to $3,762.36 on random engineering
configurations.)

### 11.3 Consequence (standard §1.8, default adopted)

A failed or uncomputable independent verdict means **"no chronological support: the selection is not a
deployment-qualified candidate without an explicit user decision"**. Every Track N and U selection is
**"incumbent-informed; no independent chronological test"** with the same consequence; it never claims Track F's folds.
The consequence is governance only: never a fitness term, ranking input, objective weight or gate.

## 12. Finalists and the successor determination (AD10; `successor.ts`; frozen before any search)

- **Finalists (C24):** the primary of every population (F, L, B, N, U); NL0's four roles of F, N and U; the best qualified
  member of every D1 family pair in Track F and in Track N; the two references (controls). Behaviourally identical
  finalists (equal ledger signature) are reported as equivalent.
- **A finalist X (never an incumbent or control) is a SUCCESSOR WORTHY OF CONSIDERATION iff**, against N/original's own C24
  evidence (same instrument, same draws):
  - (a) X passes Q1–Q6 at C24;
  - (b) N/original does not dominate X on (centre net, centre DD) nor on (confirmation p10, confirmation p90 DD);
  - (c) a **material improvement** of one type — **P (profit):** centre net ≥ N/original's **+ $10,000** and confirmation
    robust net (½ median + ½ p10 of the 384 draws) ≥ N/original's **+ $5,000**, with centre DD and confirmation p90 DD
    each ≤ N/original's + $2,500; or **R (risk):** confirmation p90 DD ≤ N/original's **− $2,500** and centre DD ≤
    N/original's + $2,500, with centre net and confirmation robust net each ≥ N/original's − $2,500;
  - (d) **replicated:** at least two lanes of X's track with different replicate numbers (independent seed streams)
    contain a qualified member meeting (b) and (c) with the same type;
  - (e) V1–V3 pass on FULL: validation P&L > 0, reset validation DD ≤ $35,000, whole-run DD ≤ $35,000.
- **Justification of the thresholds:** $10,000 ≈ 2.6 % of N/original's development net and above the median replicate
  noise of Track N in Assignment 3 ($1,225) while far below Track F's ($23,858 at C24): a profit claim must also show in the
  neighbourhood (+ $5,000 robust) and must not cost risk ($2,500 = Assignment 2/3's frozen band); Priority 4 used the same
  $10,000 materiality. Risk type R requires the band on the p90 drawdown, the standard's own gate statistic (§5.8 tail
  statistics stay report-only). (d) addresses search variability: a single-seed gain is not evidence (the shadow study's
  "+$3,654.58, not replicated" precedent).
- **Support label:** Track F — F/original's sealed verdict with the §11.3 consequence; Track N — "incumbent-informed; no
  independent chronological test" with the consequence. A successor worthy of consideration is a research nomination for
  the user's review only — never adoption or deployment.
- **Outcome label (sealed after the validation):** *SUCCESSOR WORTHY OF CONSIDERATION* (with each one's type and support)
  if any finalist meets (a)–(e); otherwise *NO MATERIAL IMPROVEMENT: keep N/original as the preferred research incumbent and
  New L0 as the frozen benchmark*. (a)–(d) are sealed in the C24 selection before FULL opens; the validation adds (e) only
  and never changes a rank, a role, a finalist or a criterion.

## 13. Engineering gates and the pilot (sealed in `results/engineering/gates.json` before the freeze)

| Gate | Evidence |
|---|---|
| E1 | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…` VERIFIED; the out-of-band pin; the entrypoint audit clean |
| E2 | New L0 and N/original through this study's path: GPU = CPU in every record field (detailed and compact, the envelope) on D19, D21, D23, D24 and FULL (AD5); = their sealed development and full-history figures; their C24 qualification evidence on the GPU = Assignment 3's sealed evidence field by field |
| E3 | Assignment 3's sealed CPU lanes reproduced by this study's lane runner on the GPU with Assignment 3's schedules: 8 broad lanes of 8 structurally different cells (C19, R1), the legacy refinement lane (C19, R1) and **N/original's own lane** `C24/informed/GD.VB/R2` (which must shortlist N/original) — every lane-result field identical (the envelope removed) |
| E4 | CPU/GPU parity of every record field on random configurations of the reachable domain (64 cells, coarse and fine, Growth strata) and the references, under base, every stress (incl. 2 bps and +10 bps), every removal, a cutoff boundary and a 16-boundary series, on D19–D24 |
| E5 | determinism: a mini lane set with the two-tier rule (3 broad cells, one N/original-seeded informed lane) on the GPU twice — once interrupted and resumed — and on the CPU reference: identical |
| E6 | the sequential statistic from GPU slice rows against Assignment 3's exact CPU minute chain: a lower bound; nets and slice figures equal; gaps reported |
| E7 | the study's unit tests (seeds, informed projection, doors, budget bounds, two-tier rule, chain, successor rule) and the reused modules' suites pass |
| E8 | the full `npm test` (the 7 known pre-existing failures only; it reads whole data files and feeds no decision) and Strategy Lab's regression (Vitest; portfolio parity) |
| E9 | the pilot (§7.6): 128 broad lanes (64 cells × 2, BENCH seed keys) on D21 and 16 Track N lanes on D24 with the frozen schedules — expected costs, R_N, throughput, memory, bytes per evaluation |

Every official job opens the gate itself (purpose, acceptance, pins, source, job, binary, compat, device, capability
coverage of the risk-envelope pilot domain = Assignment 3's domain + the envelope, smoke, memory, host path, live parity
mini-set) and writes an attestation; receipts, conservation (CPU-scored = 0) and archive provenance per standard §9.5.

## 14. Stage order and commands (exact commands: `RUN_COMMANDS.md`; chain `chains/chain.sh`, fail-fast)

0. Brief, Phase A report, this protocol, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`: committed. Code and tests committed;
   gates E1–E9 run; `gates` sealed; `freeze` sealed; committed **before any official evaluation**.
1. C19: broad1 → broad2 → rounds F → qualify broad → refine-plan → refine → qualify refine → select → **commit** → slice →
   commit. 2. C21 the same. 3. C23 the same. 4. sequential → **commit**. 5. C24: Track F as above → Track N informed1 →
   informed2 → rounds N → qualify informed → select → **commit** → freeze-selection → commit → authorize-full → commit →
   validate (FULL once) → commit → outcome → commit. 6. Report-only diagnostics, reports, regression, ZIP, commit, push.

## 15. Resources and recoverability

Transient units in `vgl0ns.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); **one official GPU job at a time**;
`node --no-maglev`; the accepted evaluator's Mode S (8 host workers, batch 8,192, linger 30 ms); every evaluation archived
as it returns (archive bound to the study, job, door pin, evaluation digest and backend); a resumed job passes the whole
gate again and replays from its archive (`--resume`); job identities refuse a different definition; no automatic restart;
the chain runs as its own unit and commits each sealed block. Job archives stay on Apollo (`cache/`, git-ignored), hashed
in the reports; none is deleted or compressed by this study.

## 16. Report-only analyses (after the validation unless stated; never a selection input)

Search coverage and convergence (per cutoff, track, cell and replicate: proposals, plausible, feasible, shortlisted,
qualified; islands and stop reasons by tier; budget-bound and coverage-limited shares; trigger components at the stop;
progress per 10,000 evaluations; replicate distributions, first versus second half of the replicates; budget equivalence);
§5.9 exposure for every fold primary and finalist; tail severity (p95, worst-10 % mean, breach shares, small 0.5× and wide
1.5× families for the finalists); stresses; causal removals; risk decomposition (marked DD, principal loss marked and
liquidation, banked-capital DD, giveback with per-lot attribution, open-profit share, gap fills); annual and episode
results (2018 Q4, 2020-02/03, 2022, 2025-04); participation attribution for rarely funded books; account/margin scenarios
with explicit collateral assumptions (report-only); the CPU exact minute chain beside the verdict. Report-only replays of
frozen subjects may use the non-official GPU path or the CPU reference under purpose `diagnostic`, labelled.

## 17. No-go rules and amendments

A failed engineering gate, any CPU-scored official evaluation, a stale acceptance, a request beyond a bound, a door opened
out of order, a change after the freeze without an amendment, a criterion loosened after an outcome, or a recomputed
trigger that disagrees with a lane's decision stops the study. `AMENDMENTS.md` is append-only: pre-freeze `E*` refine the
implementation; after the freeze disclosures `D*`, operational `O*` and code `A*` (defect fixes changing no rule, each with
a sealed record of the changed digest). Criteria are never loosened, and no track, cell, cutoff, replicate, statistic,
margin or threshold is added, removed or changed once a result it governs exists. A failure is a result.
