# REPORT — Priority 3B: larger VGT + GDX D1/Growth pooled search, with C4 as the preferred benchmark

Research only, not deployed. VG #2's two D1 books (D1·GDX, D1·VGT) plus Growth — **V** (VGT Growth only), **G** (GDX
Growth only) or **B** (both) — in **one shared $100,000 slot** under the current funding lifecycle **L0** (a refused
entry keeps its virtual trade; funding never feeds back; freed capital never revives a refusal), one exclusive funded
slot, no compounding, no preemption, 5 bps per side, $0 commission, 11% simple interest (365-day basis). **DD** is the
maximum **minute** drawdown of the marked net; DD % = DD ÷ the fixed $100,000 (not peak equity). The ceiling is
**$35,000**; historical compliance with it is not a guarantee of future drawdown.

- **Development and every selection:** 2016-01-04 → 2024-12-31. **Validation:** 2025-01-02 → 2026-10-30 (the verified
  common complete endpoint), opened once after the frozen selection was committed. It is **validation on previously
  examined history, not an untouched holdout**: C4, E, A, B, VG #2 and Priority 3's candidates were all chosen or
  studied with 2025–2026 in view, and the user chose C4 knowing its outcomes.
- **C4** = VG #2 Balanced (`S8-VG-F24-3`) + VGT Growth #4 (`420cd989e4fa7749`), GDX Growth OFF — the user's preferred
  benchmark and no-improvement fallback. Its archived phenotype was never changed; refinement around it was a separate
  experiment.
- Every figure below comes from sealed records (`results/`); complete tables are in `results/tables/`. No charts
  (standard 2.0.0 §7.7).

## 1. Conclusion

**Keep C4.** The larger search found configurations that earn more than C4 on development — the formal primary by
**+$79,377.88** — but **no qualified candidate dominates C4** on the frozen development metrics, so by the frozen
prudent-recommendation rule there is no replacement candidate. In validation, every searched role holder trailed C4.

| | C4 (benchmark) | **Formal primary** `C24/informed-joint#1 profit` | Closest challenger `C24/informed-fixed#1 profit` |
|---|---:|---:|---:|
| Inclusion / what changed | V; VG #2 + #4 | V; D1 books slightly refined, VGT Growth a #4 relative | V; VG #2's D1 books **unchanged**, VGT Growth a #4 relative |
| Development net / DD | $302,785.91 / $17,332.09 | **$382,163.79** / $19,459.83 | $360,569.71 / **$17,280.74** |
| Selection robust net | $223,112.16 | $230,981.79 | $243,142.66 |
| Fresh confirmation median / p10 | $243,175.60 / $204,977.07 | $253,823.82 / $205,124.54 | $261,084.48 / **$222,241.29** |
| Fresh confirmation p90 DD / > $35,000 | $24,519.07 / 1.3% | **$31,814.77 / 5.7%** | $24,708.71 / 1.0% |
| Label against C4 | — | higher-profit trade-off | higher-profit trade-off (p90 DD $189.64 worse) |
| Validation P&L / reset DD | **$99,081.34** / $21,536.85 | $95,627.06 / $20,385.99 | $91,512.65 / $19,477.66 |
| Full history net / DD | $401,867.24 / $21,536.85 | $477,790.85 / $20,385.99 | $452,082.36 / $19,477.66 |

- **The formal primary** (the frozen actual-profit rule) is a **higher-profit trade-off**, not a credible replacement:
  its neighbourhood tail is clearly worse than C4's (p90 DD +$7,295.70; 5.7% against 1.3% of draws above $35,000) and
  it earned $3,454.28 less than C4 in validation. Its larger full-history net comes entirely from development.
- **The closest challenger** keeps VG #2's D1 books unchanged and refines only the VGT Growth book. It beats C4 on
  centre net (+$57,783.80), centre DD (−$51.35) and confirmation p10 (+$17,264.22), and misses dominance only on the
  fresh p90 DD, by $189.64. That miss is inside the finite-draw uncertainty: the p90 95% order-statistic intervals are
  $24,208.77–$26,154.92 against C4's $24,149.09–$25,834.95. Under Priority 3's archived instrument (report-only) it
  *would* dominate (p90 $24,408.06 against $24,448.95). The frozen rule uses the fresh instrument, so it is not a
  replacement candidate. It then trailed C4 in validation by $7,568.69 with a lower DD. **Read: development parity or
  slight improvement, not a demonstrated improvement.**
- **The independent procedure is chronologically unsupported** (sequential DD $60,874.87), as in Priority 3, and its C24
  best ($306,507.59) has a much weaker neighbourhood than C4 (p10 $149,854.90).
- **GDX Growth** contributes causally where a GDX book is substantively funded (A, B, IP, informed-joint#3, and a few
  independent members such as `G_GDX-rise#3`: 10 lots, causal +$72,567.76). The B cases cost VGT Growth trend entries,
  and none of these pools approached C4's profit and stability together. Most searched GDX books were token or never
  funded (§4).

### The brief's six questions

1. **Did any qualified candidate improve on C4, and by which measures?** On development, yes in profit: 13 qualified
   final-set members earn more at the centre. Several also beat C4 on local stability (higher confirmation p10 and
   lower p90 DD): informed-joint#2, #3 and #6, and informed-fixed#3. But **none dominates C4**: each is worse on centre
   DD or on confirmation p90 DD (table in §3). None beat C4's validation P&L. **Verdict:** no credible replacement. The
   formal primary is a higher-profit trade-off with a heavier tail. The closest challenger (`informed-fixed#1`) is
   development parity or slightly better, within instrument noise, and did not lead in validation.
2. **Which Growth inclusion choice worked best under each frozen role? Did GDX Growth contribute causally?**
   - **Final set:** actual-profit, robust-profit and balanced are all **V** (VGT Growth only). Lower-drawdown is a
     nominal **B** whose GDX book never decided (effectively V).
   - **Within each inclusion choice:**
     - V: informed-joint#1, $382,163.79;
     - B: informed-joint#3, $346,078.06, the only role holder funding all four books;
     - G: independent `G_GDX-breakout#1`, $260,326.41, whose GDX Growth booked one losing lot (−$1,648.19).
   - **GDX causality:**
     - It is real in informed-joint#3: removing Growth·GDX costs $37,081.39. But the GDX book cost VGT Growth
       $11,670.72 (a 2020-09-25 VGT entry refused behind it), and that member **failed validation** (reset DD
       $37,172.62).
     - In the independent G cells GDX Growth was token in 7 of 10 shortlisted members (1–2 lots, causal −$7,462.31 to
       +$6,927.65). It was substantive in three GDX-rise members (5–10 lots, causal +$30,536.70 to +$72,567.76),
       none of which holds a role (each earned $82,637.60–$94,668.42 less than C4).
     - In 9 of 19 independent B shortlisted members the GDX book was never funded.
3. **Did keeping VG #2 fixed work as well as changing its D1 vectors? Did refinement improve on the unchanged seeds?**
   - **Fixed against joint:** they performed about equally, with different trade-offs. The joint lane's best earned
     +$21,594.08 more ($382,163.79 against $360,569.71), with a worse tail (p90 DD $31,814.77 against $24,708.71) and a
     higher centre DD. In validation it earned +$4,114.41 more ($95,627.06 against $91,512.65); both trailed C4.
   - **Refinement against the unchanged seeds:** refinement improved on them on development. The C4 profit refinement
     raised C4 to $321,825.62 (fixed lane, 2 passes) and to $331,015.79 (joint lane, 4 passes). The islands found more
     (+$57,783.80 fixed, +$79,377.88 joint). The common change from #4 was **turning its trend filter OFF** with a
     5.7% trailing stop.
   - This is one informed history. It is not a method claim (departure D1).
4. **Did the larger search find new useful funded behaviour, or mainly refine known regions? Was it still
   budget-bound?**
   - **Mainly refined known regions.** The top of the final ranking is #4-like VGT Growth around VG #2's D1 books.
   - **Independent discovery** produced new qualified V, G and B configurations, both-Growth-funded pools among them
     (1,167–4,227 feasible both-funded rung-1 centres per B cell). None was as stable as C4, and the procedure failed
     chronologically.
   - **Budget:** no lane reached its extension cap. Every lane ended on "triggers not met": its last island added
     < 5% hypervolume, robust or centre net and no new funded pattern. So the search was **not budget-bound at the
     lane level**.
   - It was **not converged** either: every island ended on its proposal budget, never on stagnation.
5. **Did the independent selection procedure work at earlier cutoffs? Did the frozen selections pass validation?**
   - **Earlier cutoffs: no.** The C19 → C21 → C23 fold primaries earned +$14,619.98, −$14,870.14 and +$13,505.87.
     Sequential net was +$13,105.71, but the sequential DD of **$60,874.87** breached the ceiling. Every role's
     sequence breached too.
   - **Validation:**
     - 20 of 25 rows pass V1–V3, including the formal primary (+$95,627.06), C4, C85, E, A, B, D and the independent
       C24 primary (+$55,329.36).
     - Failed: the B role holder informed-joint#3 (reset DD $37,172.62), the G actual-profit and robust-profit
       holders (DD $43,367.49 / $41,206.73), and Priority 3's IP and SP (historical).
6. **What does the evidence imply for 4A and 4B?**
   - Pooled search did not produce a GDX Growth book that is both substantive and competitive. Most G-only discoveries
     carried token GDX books; the few substantive ones trailed C4 by $82,637.60–$94,668.42 of centre net. The
     substantive GDX books near the top came from Appendix A or Priority 3's IP lineage.
   - The existing GDX Growth (E) **failed Q3 again** under a fresh instrument: p90 DD $35,057.52, 10.4% of draws above
     $35,000, worst $65,442.52.
   - A funded GDX book keeps costing VGT trend entries:
     - A: 2016-06-28, $42,826.37 virtual;
     - B: 2016-07-06;
     - informed-joint#3: 2020-09-25.
   - **4A (standalone GDX Growth discovery) is the right next step:** a GDX book with a stable standalone neighbourhood
     does not exist yet in any of the evidence.
   - **4B (GDX-only D1 + Growth)** then tests coexistence with D1·GDX without VGT's competition. Neither should assume
     that standalone superiority carries into the shared pool.

## 2. What was run

### 2.1 Space, engine, controls and verification

- **Configuration.** The inclusion choice (V, G, B) with VG #2's two D1 books always enabled. Each enabled book carries
  its own vector on Priority 3's four-book genome: D1, 8 genes per book on Study 8's common box; Growth 1.4.0, 8
  structural and 50 conditional numeric genes per book on growth140's boxes.
  - A disabled Growth book carries Priority 3's placeholder vector (`1af5b55987a56e2f`) and is canonicalized out of the
    identity, so inert genes never create a second configuration.
  - The same-instant order is fixed: D1 first, then GDX before VGT (AD2).
- **Engine.** Priority 3's pooled engine, unchanged (evaluation digest `147cad7c…4e88`, the code its 495-check parity
  verified).
- **Controls.** Read from Priority 5A's verified loader. Each control's canonical configuration hashes to its own
  Priority 3 identity: C4 `f324035d15f69610`, E `c45f4efa028203e9`, A `d4cde31356e2306a`, B `676731bfd4ec280f`, C85
  `3688e97b90639d60`, D `7a377d49c2b9aa55`, IP, XP, SP, V4, V85.
  - Every control and all 87/88 informed seeds are exactly representable on the fine grid.
  - The settings are in `CONTROL_MANIFEST.json` (`2ed9cec0…41dc`) and `results/tables/settings.md`.
- **Engineering gates** (sealed before the freeze, `results/parity/parity.json`: **233 checks, 0 failed**):

| Gate | Checks | Result |
|---|---:|---|
| E1 engine digest | 1 | Priority 3's evaluation code = its sealed parity's |
| E2 L0 reproduction | 12 | C4 $302,785.91 / $17,332.09 / 38 lots and every other control equal Priority 5A's sealed development centres field for field; VG #2 native = Study 8 F24 ($260,223.13 / $17,280.74 / 36 lots / 14 refusals) |
| E3 archived instrument | 2 | C4's archived confirmation statistics reproduced exactly (median $244,936.82, p10 $202,108.24, p90 DD $24,448.95, 1.3%); A's too (p90 $36,277.63, 13.3%) |
| E4 independent reference | 96 | random configurations of all 8 cells: funded set exact, money and DD within $1e-6, Σ lots = net, one slot, principal ≤ $100,000, disabled books never funded |
| E5 single-family identities | 26 | D1 pairs = `runNAllocator` (both armings); Growth books = `runRiseTrading` (both symbols) |
| E6 prefix causality | 72 | D19, D21, D23 runs = D24 runs through the shorter door |
| E7 canonicalization | 24 | a disabled book's vector never changes identity or record |

- **Tests:** this study's 18 tests and Priority 3's 20 pool/space tests. They cover reservations, same-instant
  ordering, partial exits holding the slot, gap exits, year boundaries, open remainders and the persistent unfunded
  virtual trade.
- **Native → harmonized bridge** (the only change is D1's arming date): VG #2 native $260,223.13 / $17,280.74 (full
  history **$334,911.93 / $21,303.61**, reproduced at the final stage); harmonized $268,487.02 / $20,801.07 (full
  $343,175.82 / $21,303.61).

### 2.2 Searches, budgets and stopping (`results/tables/coverage.md`)

| Job | Distinct proposals (screen / designs + island) | Refinement moves | Extension islands fired | Fresh evaluations | Wall | Lane stops |
|---|---:|---:|---:|---:|---:|---|
| C19 independent | 137,216 | 5,195 | 3 | 1,212,750 | 2.42 h | 8/8 triggers not met |
| C21 independent | 133,120 | 5,289 | 1 | 1,169,417 | 2.74 h | 8/8 triggers not met |
| C23 independent | 137,216 | 6,104 | 3 | 1,178,935 | 3.47 h | 8/8 triggers not met |
| C24 independent | 149,504 | 6,016 | 9 | 1,308,569 | 4.60 h | 8/8 triggers not met |
| C24 informed (fixed + joint) | 45,055 (9,599 designs + 35,456 island) | 2,986 | 3 | 679,356 | 2.07 h | 2/2 triggers not met |
| Qualifications (C19, C21, C23, C24) | 40, 40, 40, 64 members | — | — | 285,368 | 0.72 h | — |
| **Total** | **602,111** | 25,590 | 19 | **5,834,395** (+22,493 archive hits) | **16.0 h** (218 worker-hours) | — |

- **Larger than Priority 3:**
  - Base independent exploration was **131,072 distinct proposals per cutoff**, against Priority 3's 28,672 (4.57×).
  - At C24, 149,504 + 6,016 refinement moves against Priority 3's 36,395 (4.3×). The informed lanes had 45,055
    proposals against Priority 3's 5,242.
  - Evaluations: 5.83 M against Priority 3's 1.78 M.
- **Allocation:** V 25%, G 25%, B 50% of every independent budget. The protected both-Growth stratum was every fourth
  island of each B cell and informed lane, plus reserved promotion slots, a refinement start and a shortlist slot.
- **Evaluations by kind (C24 independent, fresh):**

  | Kind | Evaluations |
  |---|---:|
  | Screen centres | 65,536 |
  | Rung-1 centres | 85,280 |
  | Rung-1 neighbours | 1,036,078 |
  | Rung-2 neighbours | 12,288 |
  | Rung-3 neighbours | 10,592 |
  | Refinement centres | 5,974 |
  | Refinement neighbours | 92,821 |

  - Centre-first fidelity measured 78–88% of rung-1 proposals.
  - The other cutoffs are in `coverage.md`.
- **Distinct configurations versus ledgers.** For example, C24 independent: 92,278 distinct centres and 81,301 distinct
  funded-lot ledgers. Promotions and shortlists keep one configuration per ledger.
- **Stopping.**
  - Every island stopped on its proposal budget.
  - Every lane stopped on "triggers not met" before its cap. In the last island the hypervolume, best robust and best
    centre-net gains were all < 5%, with no new funded pattern.
  - This is neither budget-bound at the lane level nor converged; the remaining extension headroom is reported unused.
- **The reduction from the brief's ≈ 262,144 cap to 196,608** (AD9, before the freeze) did not bind: no cell reached
  even 8 islands.

### 2.3 Integrity and amendments

- **Before the freeze** (pilot evidence, wording):
  - R1: the extension trigger's "new behaviour" became a new funded-component pattern;
  - R2: post-C24 code may be completed after the freeze (it was not needed: the code closure, 252 files, is unchanged
    since the freeze);
  - R3: exact informed design counts;
  - R4: the header and E4's count.
- **After the results, two implementation disclosures** (no record changed):
  - **A1:** in the fixed-D1 lane the search-time neighbourhoods restored VG #2's D1 vectors after perturbation, so the
    lane's rung statistics measured robustness to Growth perturbations only. Every member was qualified on the common
    joint instrument.
  - **A2:** refinement moves could switch a B configuration to V or G in independent cells, not only in the informed
    lanes. This happened once in four cutoffs: C24 `B_GDX-breakout_VGT-breakout#1 profit` became V. It failed Q3 and
    holds no role.
- **Commits.** Protocol frozen and committed before any search (`1997c2d0`). Fold selections were committed before
  their slices (`583fac45`, `b63418d2`, `878b9b6e`). `FROZEN_SELECTION.json` (`f7629968…422e`) was committed
  (`21f86b86`) before FULL opened; the validation was then sealed and committed (`e3e8a321`).
- **Seals:** `npm run vg-exp -- verify` → 19 records.

## 3. Development: the final set against C4 (`results/tables/c4.md`, `qualify-C24.md`, `tails-C24.md`)

Fresh confirmation = 3 × 128 = 384 draws, independent of every ranking; selection = 2 × 128 (ranking only). Every
member's verdict was computed once.

| Member | Inc. | Centre net | Δ net vs C4 | Centre DD | Conf. p10 | Conf. p90 DD | > $35k [Wilson 95%] | Worst DD | Worst-10% mean | Label vs C4 |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| **C4** | V | $302,785.91 | — | $17,332.09 | $204,977.07 | $24,519.07 | 1.3% [0.6%, 3.0%] | $52,505.73 | $28,455.88 | (qualified) |
| informed-joint#1 profit (**formal primary**) | V | $382,163.79 | +$79,377.88 | $19,459.83 | $205,124.54 | $31,814.77 | 5.7% [3.8%, 8.5%] | $42,635.51 | $35,224.74 | higher-profit trade-off |
| informed-fixed#1 profit | V | $360,569.71 | +$57,783.80 | $17,280.74 | $222,241.29 | $24,708.71 | 1.0% [0.4%, 2.6%] | $53,495.21 | $28,844.27 | higher-profit trade-off |
| informed-joint#3 both Growth funded | B | $346,078.06 | +$43,292.15 | $19,459.83 | $222,514.49 | $23,475.41 | 1.3% [0.6%, 3.0%] | $44,755.59 | $27,920.41 | trade-off; stronger local stability |
| informed-joint#6 profit order (final balanced) | V | $344,950.91 | +$42,165.00 | $19,244.74 | $235,319.91 | $23,699.22 | 0.8% [0.3%, 2.3%] | $41,992.97 | $26,788.63 | trade-off; stronger local stability |
| informed-joint#2 robust (final robust-profit) | V | $317,806.08 | +$15,020.17 | $22,690.19 | $239,243.62 | $24,099.10 | 3.4% [2.0%, 5.7%] | $46,274.26 | $29,892.36 | trade-off; stronger local stability |
| indep B_GDX-rise_VGT-rise#1 (independent primary) | B | $306,507.59 | +$3,721.68 | $20,820.26 | $149,854.90 | $29,995.40 | 3.4% [2.0%, 5.7%] | $43,393.30 | $34,040.49 | higher-profit trade-off |
| E | G | $326,336.29 | +$23,550.38 | $20,801.07 | $172,263.20 | **$35,057.52** | 10.4% [7.7%, 13.9%] | $65,442.52 | $38,948.97 | **fails Q3** |
| A | B | $310,383.36 | +$7,597.45 | $20,801.07 | $178,244.31 | **$35,879.73** | 12.2% [9.3%, 15.9%] | $70,572.15 | $39,975.30 | **fails Q3** |
| B | B | $291,868.34 | −$10,917.57 | $20,801.07 | $181,374.77 | **$35,149.46** | 10.7% [8.0%, 14.2%] | $65,442.52 | $39,535.21 | **fails Q3** |
| C85 | V | $263,681.27 | −$39,104.64 | $18,119.12 | $202,546.47 | $24,406.05 | 1.6% [0.7%, 3.4%] | $53,026.66 | $28,182.13 | (qualified) |

- **Formal roles of the final selectable set** (53 of 61 qualified):
  - actual-profit **informed-joint#1** (V);
  - robust-profit **informed-joint#2** (V);
  - balanced **informed-joint#6** (V);
  - lower-drawdown **indep B_GDX-rise_VGT-breakout#2 robust**: nominally B, but its GDX book never decided.
- **No member dominates C4; no replacement candidate.** Every member that beats C4 at the centre is worse on centre DD
  or confirmation p90 DD. informed-joint#2, #3 and #6 beat C4 on local stability but each has a higher centre DD
  (+$1,912.65 to +$5,358.10).
- **Costs.** At 10 / 20 bps per side the formal primary keeps +$79,693.32 / +$78,068.38 over C4. Under next-open stops
  C4 earns $301,204.14 and the primary $381,068.20.
- **Archived instrument** (report-only, like-for-like with C4's archived figures): every role holder's ordering is the
  same. informed-fixed#1's archived p90 DD ($24,408.06) is *below* C4's ($24,448.95), so on that instrument it would
  dominate; the frozen fresh instrument decides.
- **Candidate consideration (standard §2.8).**

  | Control | Original gate verdict (as sealed) | Under this study's fresh instrument | User-directed consideration |
  |---|---|---|---|
  | A | fails Q3 (Priority 3: confirmation p90 DD $36,277.63) | **fails Q3** again: p90 $35,879.73, 12.2% above $35,000 (miss $879.73) | brief §7: considered despite small historical threshold misses; research only |
  | B | fails Q3 (p90 $35,131.47) | **fails Q3**: p90 $35,149.46 (miss $149.46) | as for A |
  | E | not qualified by Priority 3 (archived p90 $35,245.92) | **fails Q3**: p90 $35,057.52 (miss $57.52) | brief §4 control |

  They are tabled as near misses with their exact severity, never relabelled. Their tails are the Appendix A GDX-timing
  tail of Priority 3A: worst $65,442.52–$70,572.15 and worst-10% mean ≈ $39k, against C4's $52,505.73 and $28,455.88.
- **Rare-but-severe tails.** The formal primary's worst draw ($42,635.51) is lower than C4's ($52,505.73), but it
  breaches more often (5.7% against 1.3%). Neither statistic alone makes one safer.
- **Half and 1.5× radius:** breach shares are 0% / 17.2% for the primary and 0% / 11.7% for C4. Perturbation
  frequencies on one history are not probabilities of future losses.

## 4. Why the pools earn what they do (development diagnostics, `results/tables/participation.md`)

- **Where the formal primary's extra profit over C4 comes from**, by matched lots (complete replays, reconciled):
  - 6 newly admitted lots: +$119,536.12;
  - 10 displaced: −$46,307.22;
  - 9 retimed exits: +$10,965.14.
  - Its D1·VGT booked $98,810.26 against C4's $47,255.10, and its VGT Growth booked $89,488.08.
  - Its largest episode (2020-03-12 → 2020-09-04, $120,179.70) is 31.5% of net; the blackout rerun gives $261,984.10.
- **informed-fixed#1 against C4.** 28 of C4's lots are unchanged. Its 7 newly admitted lots (+$71,213.65) come from the
  refined VGT Growth book: 11 lots, $104,849.16 booked.
- **GDX admission cost** (complete reruns without Growth·GDX; Δ = with − without):

  | Subject | Δ net | Δ VGT Growth booked | Δ D1 booked | GDX Growth booked |
  |---|---:|---:|---:|---:|
  | A | +$7,597.45 | −$56,890.46 | +$16,680.49 | $47,807.42 |
  | B | +$28,187.07 | −$44,456.95 | +$20,799.55 | $51,844.48 |
  | informed-joint#3 | +$37,081.39 | −$11,670.72 | −$1,981.63 | $50,733.73 |
  | IP | +$32,080.62 | −$25,667.48 | +$40,564.94 | $17,183.16 |

  The VGT cost is the refusal at a VGT trend entry while a GDX lot holds the slot:
  - A 2016-06-28 (virtual +$42,826.37, 221 idle closes afterwards);
  - B 2016-07-06 (+$44,456.96);
  - informed-joint#3 2020-09-25 (+$11,670.72, 84 idle closes);
  - IP 2020-06-02 (+$25,667.48).

  These virtual figures are descriptive, never achievable profit.
- **Participation attribution of unfunded GDX books** (standard §2.9):
  - **Signals and filters:** in the independent C24 primary the GDX book saw 37 crossings and made **0 decisions**:
    32 were vetoed by its trend filter and 5 by its recovery gate.
  - **Capital competition:** in `B_GDX-breakout_VGT-breakout#4` its 3 decisions were all refused behind D1·VGT.
  - **Virtual-state waiting:** a refused GDX trade waits out its virtual hold before the book can decide again.
  - **Search and promotion attrition:**
    - Both-Growth-funded configurations were plentiful at rung 1: 1,167–4,227 feasible per B cell, 3,555 (fixed) and
      1,497 (joint).
    - They narrowed at rung 3 (1–8 per lane) and in the shortlists (1–5 per lane).
    - 12 shortlisted members fund both Growth books and qualified, but only informed-joint#3 holds a role.
    - The informed lanes' G configurations never reached rung 3: the "best G" slot stayed empty.
- **The D1 books dominate.** D1·GDX is the largest booked component in the informed role holders ($137,961.37–
  $208,465.45). The largest pool-level winning episode of every subject contains the 2020 crash and is 27–61% of its
  development net.

## 5. Chronological procedure tests (`results/tables/folds.md`)

| Fold | Fold primary (inclusion; funded) | Training net / DD | Fresh conf. p10 / p90 DD | Slice | Slice P&L | Slice DD (reset) |
|---|---|---:|---:|---|---:|---:|
| C19 | `B_GDX-breakout_VGT-breakout#1 profit` (B; GDX Growth unfunded) | $162,277.41 / $18,591.24 | $106,416.31 / $31,261.58 | 2020–2021 | $14,619.98 | **$60,874.87** |
| C21 | `G_GDX-rise#1 profit` (G) | $264,501.50 / $23,402.10 | $167,878.79 / $26,990.11 | 2022–2023 | **−$14,870.14** | **$57,075.51** |
| C23 | `B_GDX-rise_VGT-rise#1 profit` (B; all four funded) | $295,264.76 / $19,966.05 | $140,749.30 / $25,390.58 | 2024 | $13,505.87 | $12,639.84 |

- **Verdict (frozen): chronologically unsupported.** Sequential net +$13,105.71 after $150 of switch charges; sequential
  minute DD **$60,874.87** (2020-02-19 → 2020-03-17). Every fold produced a primary (39, 40, 39 of 40 qualified).
- **Every role's sequence also breached:**
  - robust-profit −$4,919.82 (DD $68,795.52);
  - balanced −$50,006.84 ($97,510.12);
  - lower-drawdown +$5,645.63 ($53,347.94).
- **Controls on the same slices** (descriptive; chosen with later data):

  | Control | Sequential net | Sequential DD |
  |---|---:|---:|
  | C4 | $235,688.78 | $17,280.74 |
  | E | $251,338.05 | — |
  | A | $238,385.39 | — |
  | B | $216,870.11 | — |
  | C85 | $196,072.35 | — |
  | D | $224,535.51 | — |

- **Scope.** Only the independent procedure has chronological evidence. The informed lanes, C4's refinement and the
  fixed-versus-joint comparison are informed (departure D1); no chronological claim is made for them.

## 6. Validation and full history (FULL, once; `results/tables/validation.md`)

C4 first, then E, A, B, C85, D, then the frozen members:

| Subject | Development net | Validation P&L | Reset val. DD | Full net (realized / open) | Whole-run DD (%) | 2025 / 2026 | V1–V3 |
|---|---:|---:|---:|---|---:|---|---|
| **C4** | $302,785.91 | **$99,081.34** | $21,536.85 | $401,867.24 ($407,432.00 / −$5,564.76) | $21,536.85 (21.5%) | $47,239.34 / $51,842.00 | pass |
| E | $326,336.29 | $115,494.92 | $21,303.61 | $441,831.21 | $21,303.61 (21.3%) | $71,546.66 / $43,948.26 | pass |
| A | $310,383.36 | $139,887.46 | $21,536.85 | $450,270.82 | $21,536.85 (21.5%) | $71,546.66 / $68,340.80 | pass |
| B | $291,868.34 | $117,030.20 | $18,972.89 | $408,898.55 | $20,801.07 (20.8%) | $71,546.66 / $45,483.54 | pass |
| C85 | $263,681.27 | $76,224.08 | $16,510.18 | $339,905.35 | $19,821.14 (19.8%) | $47,239.34 / $28,984.74 | pass |
| D (VG #2) | $268,487.02 | $74,688.80 | $21,303.61 | $343,175.82 | $21,303.61 (21.3%) | $47,239.34 / $27,449.46 | pass |
| **Formal primary** informed-joint#1 | $382,163.79 | $95,627.06 | $20,385.99 | $477,790.85 | $20,385.99 (20.4%) | — | pass |
| informed-fixed#1 | $360,569.71 | $91,512.65 | $19,477.66 | $452,082.36 | $19,477.66 (19.5%) | — | pass |
| informed-joint#6 (balanced) | $344,950.91 | $93,196.81 | $24,064.80 | $438,147.72 | $24,064.80 (24.1%) | — | pass |
| informed-joint#2 (robust-profit) | $317,806.08 | $63,831.09 | $24,172.22 | $381,637.18 | $24,172.22 (24.2%) | — | pass |
| informed-joint#3 (B, both funded) | $346,078.06 | $30,257.63 | **$37,172.62** | $376,335.68 | **$37,965.27** | — | **fails V2, V3** |
| indep C24 primary (B) | $306,507.59 | $55,329.36 | $17,960.59 | $361,836.94 | $20,820.26 | $36,296.53 / $19,032.82 | pass |
| indep G actual-profit | $260,326.41 | $19,470.35 | **$43,367.49** | $279,796.76 | **$43,367.49** | — | **fails V2, V3** |
| IP (historical) | $338,642.84 | **−$32,190.25** | **$57,568.06** | $306,452.60 | $57,568.06 | — | fails |
| XP (historical) | $245,220.78 | $76,802.05 | $15,620.02 | $322,022.83 | $17,280.74 | — | pass |

- **Known targets, compared only here, all reproduced to the cent:**
  - C4: development $302,785.91, validation $99,081.34 (reset DD $21,536.85), full $401,867.24 / $21,536.85;
  - VG #2 native: full $334,911.93 / $21,303.61.
- **Recommendation (frozen rule): keep C4.** No qualified member dominates C4 on development, so there was no
  replacement candidate; validation did not change that.
- **"Supported across later periods"** (V1–V3 pass and validation P&L ≥ C4's): no searched member. Among the controls,
  E, A and B earned more than C4 in validation but fail Q3 on development, as sealed. That is previously examined
  history: A's and E's GDX Growth (Appendix A) was browser-chosen with 2025–2026 in view.
- **Report-only validation neighbourhood** (fresh confirmation rep 1 on FULL, 128 draws):

  | | Median validation P&L | Whole-run p90 DD | Draws above $35,000 |
  |---|---:|---:|---:|
  | Primary | $84,306.05 | $33,658.25 | 8 / 128 |
  | C4 | $85,729.74 | $26,778.93 | 1 / 128 |

- **Stresses on FULL** (validation P&L): primary $94,268.39 (10 bps), $91,555.14 (20 bps), $92,610.62 (14%); C4
  $103,614.20, $101,081.83, $101,832.97.

## 7. Resources and recoverability

- **Containment.** Every heavy stage ran as a transient unit in `vgexp.slice` (MemoryHigh 44G, MemoryMax 48G,
  MemorySwapMax 0), one at a time, launched by the chain unit `vgexp-chain` (2026-11-09T18:34:35Z →
  2026-11-10T10:36:45Z).
- **Memory.** Peak job cgroup 12.9 GiB (C24 independent search); worker ArrayBuffers ≤ 78 MiB. No `memory.high`,
  `memory.max` or OOM event in any unit.
- **Execution.** 14 child-process workers, chosen by the bench (78.7 evaluations/s on D24, saturating at the 8
  physical cores); GC every 64 evaluations.
- **Pilot.** A graceful stop, a worker kill and a whole-unit SIGKILL each resumed to lane results identical to the
  straight run (`results/pilot/PILOT.md`). No operational interruption occurred in the study run.

## 8. Limitations

- **Previously examined history.** 2025–2026 had been examined before, and the informed seeds (C4, E, A, B, Priority 3's
  candidates) were chosen with it in view. Fresh seeds are not fresh market history.
- **One history, few episodes.** The largest winning episode (each containing the 2020 crash) is 27–61% of every
  subject's development net. Local
  stability on 2016–2024 is not chronological reliability (§5).
- **Instrument sensitivity.** The fixed-lane challenger's non-dominance rests on a $189.64 p90 difference inside
  finite-draw uncertainty. The dominance labels are deterministic given the frozen instrument but not robust to
  resampling, which is why the recommendation also required validation support.
- **No method claim.** Fixed versus joint D1 and refinement versus unchanged seeds are informed comparisons on one
  history with unmatched provenance (departure D1).
- **Disclosed implementation details:** A1 and A2 (§2.3).
- **Not tested:**
  - other funding lifecycles or allocation designs (Priority 5);
  - standalone GDX Growth (4A);
  - GDX-only D1 + Growth (4B);
  - November–December 2026.

## 9. Reproduce

`RUN_COMMANDS.md` (from the repository root). Sealed stages refuse to rerun; each heavy stage resumes from its job
archive (`.cache/vg-d1-growth-expanded/jobs/`, ≈ 14 GB, local) when relaunched with the same command.

```
npm run research-preflight -- --study research/vg-d1-growth-expanded
npm run vg-exp -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-d1-growth-expanded/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-d1-growth-expanded/tests/*.test.ts
```

## Review points (nothing started)

1. **Accept "keep C4"?** No candidate dominated it on development or led it in validation.
2. **informed-fixed#1** (VG #2's D1 unchanged; #4-like VGT Growth with the trend filter OFF and a 5.7% trailing stop)
   is the one candidate at development parity or better with C4. It is worth a bounded, pre-registered look only if
   the user wants a C4 variant studied; it is not a demonstrated improvement.
3. **Priority 4A next** (standalone GDX Growth), then 4B, as the roadmap orders.
