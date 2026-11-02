# F24 profit–robustness frontier and overlooked candidates (training-only)

**Questions 2, 4 and the training half of 6.** Everything here uses only F24 **training** records:

- the window is 2016-01-04 → 2024-12-31, with arming on 2017-06-15 and y = 7.536 training years;
- the records are the F24 search records (rung 1, 2, 3, refinement and shortlist values), the F24 qualification
  records (confirmation 3 × 128 neighbours) and the sealed roles in `FROZEN_SELECTION.json`.

The F24 test record is read only to label a sealed holder "nominated" or "failed". No 2025–2026 figure enters any
comparison here. Generated detail: `outputs/f24-overlooked.md`, `outputs/f24-frontier.md`, `outputs/f24-funnel.md`,
`outputs/f24-share-threshold.md` and the CSV files beside them. Every figure below is copied from those files by
`scripts/fill_report_tables.py`.

**Definitions.**

- **Robust profit/yr** = (½·neighbourhood median net + ½·neighbourhood p10 net) ÷ y (the sealed definition).
- **Risk-feasible** = centre minute DD < $35,000, neighbourhood share ≥ 0.90 and p90 DD < $35,000, at the record's own
  fidelity: the original C1/C2 constraints on the joint, full-dimensional N1 design. The non-risk constraints C3–C7
  are not required for this label; they are reported separately.

## 1. Precision first: what each fidelity can and cannot establish

| fidelity | points | a share of 0.90 needs | one-sided 95% Wilson lower bound at share 1.00 / 0.95 / 0.90 | p90 DD upper bound (worst DD) holds with confidence 1 − 0.9ⁿ |
|---|---:|---|---|---|
| rung 1 | 16 | 15/16 (93.75%) or 16/16 | 85.5% / — / — (15/16 → 76.2%) | 81.5% |
| rung 2 | 64 | ≥ 58/64 | 95.9% / 88.4% / 82.1% | 99.88% |
| rung 3 | 128 | ≥ 116/128 | 97.9% / 90.8% / 84.8% | > 99.99% |
| confirmation | 384 | ≥ 346/384 | 99.3% / 92.8% / 87.2% | > 99.99% |

**How much the estimates move when the same configuration is re-measured at the next rung** (all 30 jobs, each on
its own training door; `outputs/saturation.md`):

| step | pairs | jobs | Spearman (median) | Spearman range | median change (all) | median change (top decile) | median change (rest) |
|---|---|---|---|---|---|---|---|
| r1 → r2 | 5760 | 30 | +0.88 | +0.14 … +0.98 | -4.9% | -6.5% | -4.7% |
| r2 → r3 | 1440 | 30 | +0.93 | -0.18 … +0.99 | -0.9% | -1.0% | -0.9% |
| r3 → conf | 180 | 30 | +1.00 | +0.77 … +1.00 | -0.3% | -0.3% | -0.3% |

| step | lower-fidelity share | n | next share ≥ 0.90 | rate | 90% interval |
|---|---|---|---|---|---|
| r1 → r2 | 16/16 | 5248 | 5034 | 95.9% | 95.4% – 96.4% |
| r1 → r2 | 15/16 | 512 | 265 | 51.8% | 48.0% – 55.5% |
| r2 → r3 | 90–93% | 64 | 38 | 59.4% | 48.3% – 69.7% |
| r2 → r3 | 93–95% | 27 | 22 | 81.5% | 64.9% – 92.4% |
| r2 → r3 | 95–98% | 111 | 108 | 97.3% | 93.2% – 99.3% |
| r2 → r3 | 98–100% | 1207 | 1207 | 100.0% | 99.8% – 100.0% |
| r2 → r3 | <90% | 31 | 15 | 48.4% | 32.7% – 64.3% |
| r3 → conf | 90–93% | 10 | 8 | 80.0% | 49.3% – 96.3% |
| r3 → conf | 93–95% | 8 | 8 | 100.0% | 68.8% – 100.0% |
| r3 → conf | 95–98% | 19 | 19 | 100.0% | 85.4% – 100.0% |
| r3 → conf | 98–100% | 141 | 141 | 100.0% | 97.9% – 100.0% |
| r3 → conf | <90% | 2 | 1 | 50.0% | 2.5% – 97.5% |

**What this means:**

- A 16-point share of 15/16 kept ≥ 0.90 at 64 points only about half the time. 16/16 kept it 96% of the time.
- A 64-point share in 90–93% held ≥ 0.90 at 128 points 59% of the time; in 93–95%, 82%; in 95–98%, 97%.
- Robust profit fell by about 5% from rung 1 to rung 2, 6.5% for each job's top decile: the winner's curse of
  selecting on 16 points. It fell by less than 1% between rungs 2, 3 and confirmation.
- **The 93/95/98% band edges are resolvable only at ≥ 128 points, and only roughly.** For example, #1 VG profit
  measured 93.8% at 128 points and 96.4% at 384.

## 2. Q2 — are there risk-feasible configurations materially more profitable than the sealed holders?

**Reference:** the best sealed F24 role holder of the same track, at the same fidelity. Within a job, all centres at
one rung share the same neighbourhood offsets (common random numbers).

| track | rung 1 (16) | rung 2 (64) | rung 3 (128) | confirmation (384) |
|---|---|---|---|---|
| G | $21,179 (GDX:d1-42338b0a9e…) | $20,167 (GDX:d1-42338b0a9e…) | $19,993 (GDX:d1-42338b0a9e…) | $19,799 (GDX:d1-42338b0a9e…) |
| V | $11,121 (VGT:d1-787044ebd5…) | $8,932 (VGT:d1-75353cd798…) | $8,959 (VGT:d1-75353cd798…) | $8,890 (VGT:d1-75353cd798…) |
| VG | $27,972 (VGT:d1-bd80e32ee4+GDX:d1…) | $27,011 (VGT:d1-bd80e32ee4+GDX:d1…) | $28,656 (VGT:d1-f41ebcd961+GDX:d1…) | $29,314 (VGT:d1-f41ebcd961+GDX:d1…) |
| VXR | $17,854 (VGT:d1-cc77e9b6e2+XBI:d1…) | $17,198 (VGT:d1-05f07225ab+XBI:d1…) | $17,159 (VGT:d1-05f07225ab+XBI:d1…) | $17,224 (VGT:d1-05f07225ab+XBI:d1…) |
| VXRG | $27,247 (VGT:d1-61be86f1a1+XBI:d1…) | $25,512 (VGT:d1-61be86f1a1+XBI:d1…) | $25,840 (VGT:d1-61be86f1a1+XBI:d1…) | $26,156 (VGT:d1-61be86f1a1+XBI:d1…) |
| VXRKG | $23,126 (VGT:d1-28ce3e131c+XBI:d1…) | $23,006 (VGT:d1-28ce3e131c+XBI:d1…) | $23,067 (VGT:d1-28ce3e131c+XBI:d1…) | $23,095 (VGT:d1-28ce3e131c+XBI:d1…) |

**Counts of risk-feasible non-holders above the reference** (a = rung 1 only; b = rung 2/3, not shortlisted;
c = shortlisted, failed qualification; d = qualified, no role):

| track | fidelity | risk-feasible non-holders: a | b | c | d | robust/yr ≥ ref +0% / +10% / +20% | centre, median AND p10 ≥ ref +0% / +10% / +20% | +10% robust by band 90–93 / 93–95 / 95–98 / 98–100 | +10% robust by category |
|---|---|---|---|---|---|---|---|---|---|
| G | rung 1 (16 pt) | 5012 | 187 | 2 | 0 | 257 / 17 / 0 | 174 / 0 / 0 | 0 / 16 / 0 / 1 | a 10 · b 7 · c 0 · d 0 |
| G | rung 2 (64 pt) | 0 | 112 | 2 | 0 | 8 / 1 / 0 | 2 / 1 / 0 | 1 / 0 / 0 / 0 | a 0 · b 0 · c 1 · d 0 |
| G | rung 3 (128 pt) | 0 | 42 | 3 | 0 | 6 / 1 / 0 | 3 / 0 / 0 | 1 / 0 / 0 / 0 | a 0 · b 0 · c 1 · d 0 |
| G | confirmation (384 pt) | 0 | 0 | 1 | 0 | 1 / 0 / 0 | 1 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| V | rung 1 (16 pt) | 4766 | 186 | 2 | 0 | 6 / 2 / 0 | 0 / 0 / 0 | 0 / 2 / 0 / 0 | a 2 · b 0 · c 0 · d 0 |
| V | rung 2 (64 pt) | 0 | 93 | 1 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| V | rung 3 (128 pt) | 0 | 27 | 0 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| V | confirmation (384 pt) | 0 | 0 | 1 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VG | rung 1 (16 pt) | 9599 | 187 | 2 | 0 | 94 / 0 / 0 | 9 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VG | rung 2 (64 pt) | 0 | 185 | 2 | 0 | 41 / 0 / 0 | 7 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VG | rung 3 (128 pt) | 0 | 42 | 2 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VG | confirmation (384 pt) | 0 | 0 | 2 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXR | rung 1 (16 pt) | 7909 | 187 | 1 | 0 | 10 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXR | rung 2 (64 pt) | 0 | 186 | 1 | 0 | 3 / 0 / 0 | 1 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXR | rung 3 (128 pt) | 0 | 43 | 1 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXR | confirmation (384 pt) | 0 | 0 | 1 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRG | rung 1 (16 pt) | 9110 | 186 | 0 | 1 | 4 / 0 / 0 | 4 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRG | rung 2 (64 pt) | 0 | 181 | 0 | 1 | 5 / 0 / 0 | 1 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRG | rung 3 (128 pt) | 0 | 43 | 0 | 1 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRG | confirmation (384 pt) | 0 | 0 | 0 | 1 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRKG | rung 1 (16 pt) | 8384 | 188 | 0 | 0 | 36 / 0 / 0 | 1 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRKG | rung 2 (64 pt) | 0 | 187 | 0 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRKG | rung 3 (128 pt) | 0 | 46 | 1 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |
| VXRKG | confirmation (384 pt) | 0 | 0 | 1 | 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | a 0 · b 0 · c 0 · d 0 |

**Reading the counts:**

1. **At ≥ 64 points, no configuration in VG, VXR, VXRG or VXRKG beats its track's best holder by 10% or more.**
   - **At rung 3 (128 points):** none beats it at all.
   - **At rung 2 (64 points):**
     - VG 41 configurations are above #2's rung-2 value, by up to +8.3% (#1 has no rung-2 record); VXRG 5, up to
       +4.0%; VXR 3, up to +1.9%.
     - Those re-measured at rung 3 (VG 16; all VXR and VXRG) fell back below the holder.
   - **At highest retained fidelity:** taking each configuration at its highest retained fidelity, each pooled
     track's best non-holder is −3% to +6% of the holder at that fidelity.
   - The five best per track are listed with their vectors in `outputs/f24-overlooked.md`.
   - **Why those 20 rows were excluded:** 9 not reached at the shortlist (six picks already taken), 7 below the
     rung-2 top 48, 3 within L∞ 0.03 of a rung-3 configuration, 1 within L∞ 0.10 of a shortlisted pick (§4).
2. **G is the exception, and it is not a robust exception.** G's higher-profit configurations sit on the risk
   boundary. The rung-3 neighbour below was excluded by L∞ distinctness, not by a risk gate, and was never measured
   at 384 points:
   - **Shortlist profit pick `GDX:d1-469476b33b`:** confirmation robust $23,039/yr, +16% over holder #12. Its
     confirmation share is **88.3% (p90 $35,190)**, so it failed Q2/Q2b/Q7.
   - **Centre pick `GDX:d1-40310975f5`:** 89.3%, p90 $35,121, failed Q2.
   - **Front member `GDX:d1-6d8ad80856`:** 91.9%, p90 $34,467, robust $21,456/yr (+8%). It failed only the Q7 stress
     gate (10 bps, 14%, next-open stops, +25 bps).
   - **Its rung-3 neighbour `GDX:d1-f99216b79e`:** 90.6%, p90 $34,848, +8%, within L∞ 0.032 of the failed profit pick.
   - In GDX, more profit is bought with less neighbourhood breadth. These are 90–93% configurations whose p90 DD is
     within $1k of the ceiling. "Overlooked robust profit" does not describe them.
3. **Rung-1-only leads exist but cannot be called robust:**
   - 223 in G, 53 in VG, 21 in VXRKG, 6 in V, 1 each in VXR and VXRG, above the best holder's own 16-point value
     (`outputs/f24-funnel.md`, "Rung-1-only leads").
   - **G:** 181 of the 223 leads have a 15/16 share. The five distinct ones shown have p90 $33.8k–$34.7k and are
     +8% to +13%. The 42 leads at 16/16 are at most +4.0% above holder #12's 16-point value.
   - **VG:** the five distinct leads shown are 16/16 and +3.7% to +9.1% at 16 points. Two of them share #1's VGT
     book (`VGT:d1-f41ebcd961+…`).
   - **VXRKG:** +2.4% to +4.3%.
   - Applying the measured rung-1 → rung-2 shrinkage (top decile −6.5%) and the 52% share retention for 15/16, the
     expected advantage of these leads is about zero. Whether any particular one is better is **not knowable from
     the archive**: it would need a fresh, separately approved training-only re-evaluation (≥ 128 points).
4. **By the user's bands (≥ 64-point records):**
   - **≥ 95%:** at rung 3, no ≥ 95% configuration in VXR, VXRG or VXRKG exceeds the track's best holder. At rung 2
     a few do, by up to +1.9% (VXR, 3) and +4.0% (VXRG, 4); every one fell back at rung 3. VXRKG has none.
   - **VG:** one 64-point record, `VGT:d1-544ed7fb45+GDX:d1-4198b1b2ff` (98.4%, robust $28,510/yr), is +6% above the
     best holder *that has a rung-2 record*, #2 VG balanced ($27,011 at rung 2). #1 has no rung-2 record (it is a
     refinement endpoint), and its 384-point value, $29,314, is higher. That record lies L∞ 0.020 from a rung-3
     configuration, so its region was measured at 128 points.
   - **G (−14%) and V:** their ≥ 95% configurations are all below their holders.
   - **Sealed holders in or near 93–95%:** #26 V extra (94.0%, robust $7,352/yr) and #3 VXRG profit (94.5–96.6%
     across measurements) are in or at the edge of the band. Neither is a materially more profitable case.
   - **93–95%:** no configuration in any track is ≥ 10% above its holder.
   - **90–93%:** only G's boundary configurations above.
5. **By category:**
   - **(a) rung 1 only:** leads only (point 3).
   - **(b) evaluated but not shortlisted:** within −4% … +8%, and the +8% is G's boundary region.
   - **(c) shortlisted, failed a gate:**
     - G's profit and centre picks failed **risk** gates (Q2, Q2b; plus Q7 stress for the profit pick).
     - G's front member failed the Q7 stress gate.
     - VG's centre pick and VXRKG's centre pick (#4) failed Q2b (in-box).
     - VG's front #5 and VXR's centre pick #4 failed Q8, a non-risk gate: the confirmation median was below 60% of
       the centre's net, i.e. the centre is a peak above its neighbourhood.
   - **(d) qualified, no role:** one configuration, VXRG #6 (selection robust $22,914/yr, below VXRG's holders),
     excluded by the two-extra cap.
   - **(e) sealed nominees:** unchanged.

## 3. Q4 — the frontier by share band (distinct regions, ≥ 64-point records)

**How the tables are built.**

- For each track and band, the three highest robust-profit risk-feasible configurations from **distinct regions**.
  Regions are greedy L∞ ≥ 0.10 representatives over all risk-feasible ≥ 64-point records; R1 holds the track's highest
  robust profit.
- Each configuration is shown at its highest retained fidelity.

**Columns.**

- **Share precision:** [Wilson lower bound]. **p90 precision:** [worst DD, an upper confidence bound].
- **Concentration:** top lot and best year as shares of centre net.
- **Activity:** lots/episodes over the training run.
- **Capital use:** net per occupied $100k-year, and occupancy (held calendar days ÷ 2,757 from arming).
- **Contention:** signals refused while the slot was held.

Vectors and configuration references for every row: `outputs/f24-frontier.md` (last section) and
`outputs/f24-frontier.csv`.

### G

| band | id | category | n | share [Wilson LB] | p90 DD [worst] | robust/yr | centre/yr | centre DD | lots/episodes | top lot | best year | net/capital-yr | occupancy | refused |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 90–93% | `GDX:d1-f99216b79e` | b: evaluated at r3, not shortlisted | 128 | 90.6% [85.5%] | $34,848 [$40,659] | $21,536 | $24,496 | $34,172 | 52/12 | 21% | 54% | $88,538 | 28% | 0 |
| 90–93% | `GDX:d1-6d8ad80856` | c: shortlisted; failed Q7 | 384 | 91.9% [89.3%] | $34,467 [$42,693] | $21,456 | $24,691 | $34,213 | 53/12 | 21% | 53% | $85,641 | 29% | 0 |
| 90–93% | `GDX:d1-9356463461` | b: evaluated at r3, not shortlisted | 128 | 90.6% [85.5%] | $34,736 [$51,559] | $19,802 | $24,722 | $27,051 | 45/11 | 21% | 53% | $91,520 | 27% | 0 |
| 98–100% | `GDX:d1-d2d78ab645` | b: evaluated at r2, not shortlisted | 64 | 98.4% [93.3%] | $24,896 [$35,721] | $17,412 | $23,157 | $17,281 | 17/13 | 22% | 56% | $162,902 | 14% | 0 |
| 98–100% | `GDX:d1-320f65ef34` | b: evaluated at r3, not shortlisted | 128 | 100.0% [97.9%] | $23,642 [$32,742] | $17,228 | $22,918 | $17,744 | 15/11 | 23% | 56% | $196,373 | 12% | 0 |
| 98–100% | `GDX:d1-cb8bcc6943` | b: evaluated at r3, not shortlisted | 128 | 99.2% [96.6%] | $26,532 [$36,005] | $17,072 | $22,039 | $17,744 | 17/13 | 24% | 58% | $159,943 | 14% | 0 |

### V

| band | id | category | n | share [Wilson LB] | p90 DD [worst] | robust/yr | centre/yr | centre DD | lots/episodes | top lot | best year | net/capital-yr | occupancy | refused |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 90–93% | `VGT:d1-75353cd798` | e: holder #23 profit (test fail) | 384 | 90.6% [87.9%] | $34,371 [$46,214] | $8,890 | $14,062 | $27,275 | 23/6 | 24% | 35% | $39,507 | 36% | 0 |
| 90–93% | `VGT:d1-0ccf0f27cf` | b: evaluated at r2, not shortlisted | 64 | 90.6% [82.9%] | $33,648 [$39,145] | $8,805 | $14,095 | $27,850 | 24/6 | 24% | 35% | $39,640 | 35% | 0 |
| 90–93% | `VGT:d1-d150b012c7` | b: evaluated at r3, not shortlisted | 128 | 90.6% [85.5%] | $32,879 [$40,058] | $8,115 | $15,932 | $29,133 | 28/8 | 21% | 37% | $36,276 | 44% | 0 |
| 93–95% | `VGT:d1-883cfba59e` | b: evaluated at r3, not shortlisted | 128 | 93.8% [89.2%] | $31,745 [$39,827] | $8,943 | $14,095 | $27,850 | 24/6 | 24% | 35% | $39,640 | 35% | 0 |
| 93–95% | `VGT:d1-b19ba9569a` | b: evaluated at r3, not shortlisted | 128 | 93.8% [89.2%] | $31,665 [$39,827] | $8,875 | $14,062 | $27,275 | 23/6 | 24% | 35% | $39,507 | 36% | 0 |
| 93–95% | `VGT:d1-790651b20a` | b: evaluated at r3, not shortlisted | 128 | 93.8% [89.2%] | $31,745 [$39,827] | $8,869 | $14,095 | $27,850 | 24/6 | 24% | 35% | $39,640 | 35% | 0 |
| 95–98% | `VGT:d1-787044ebd5` | e: holder #25 robust (test pass) | 384 | 96.6% [94.7%] | $34,604 [$36,638] | $8,584 | $17,619 | $21,330 | 17/6 | 18% | 42% | $41,922 | 42% | 0 |
| 95–98% | `VGT:d1-d60714cb77` | b: evaluated at r3, not shortlisted | 128 | 95.3% [91.2%] | $31,419 [$39,152] | $7,612 | $16,833 | $28,241 | 28/8 | 20% | 36% | $38,874 | 43% | 0 |
| 95–98% | `VGT:d1-e1fad4154e` | b: evaluated at r3, not shortlisted | 128 | 95.3% [91.2%] | $31,419 [$39,152] | $7,612 | $16,833 | $28,241 | 28/8 | 20% | 36% | $38,874 | 43% | 0 |
| 98–100% | `VGT:d1-2e2f00ec97` | b: evaluated at r3, not shortlisted | 128 | 99.2% [96.6%] | $34,604 [$36,286] | $6,767 | $17,135 | $21,333 | 16/8 | 19% | 43% | $43,278 | 40% | 0 |
| 98–100% | `VGT:d1-9e9158d887` | b: evaluated at r3, not shortlisted | 128 | 99.2% [96.6%] | $34,594 [$36,286] | $6,457 | $17,133 | $21,333 | 16/8 | 19% | 43% | $43,354 | 39% | 0 |
| 98–100% | `VGT:d1-6a70e3bb4b` | b: evaluated at r2, not shortlisted | 64 | 98.4% [93.3%] | $22,435 [$36,159] | $5,364 | $12,092 | $20,809 | 15/7 | 22% | 51% | $42,100 | 29% | 0 |

### VG

| band | id | category | n | share [Wilson LB] | p90 DD [worst] | robust/yr | centre/yr | centre DD | lots/episodes | top lot | best year | net/capital-yr | occupancy | refused |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 90–93% | `VGT:d1-4d70e94866+GDX:d1-3ece39cc57` | b: evaluated at r3, not shortlisted | 128 | 91.4% [86.4%] | $30,222 [$48,767] | $28,441 | $31,223 | $23,493 | 39/12 | 16% | 47% | $80,866 | 39% | 12 |
| 90–93% | `VGT:d1-513e51d8c6+GDX:d1-50ad8485c4` | b: evaluated at r3, not shortlisted | 128 | 91.4% [86.4%] | $30,718 [$51,760] | $28,241 | $32,535 | $26,878 | 39/11 | 16% | 45% | $85,552 | 38% | 13 |
| 90–93% | `VGT:d1-c8e34dda17+GDX:d1-fc8d0af80f` | c: shortlisted; failed Q2b | 384 | 91.9% [89.3%] | $33,613 [$48,904] | $27,224 | $37,560 | $19,832 | 36/9 | 14% | 41% | $76,752 | 49% | 17 |
| 93–95% | `VGT:d1-f41ebcd961+GDX:d1-5e5f2f3763` | b: evaluated at r3, not shortlisted | 128 | 93.8% [89.2%] | $30,403 [$51,760] | $28,291 | $32,230 | $26,868 | 40/12 | 16% | 46% | $82,620 | 39% | 13 |
| 93–95% | `VGT:d1-63cfdca5d3+GDX:d1-7afbcbe8a0` | b: evaluated at r3, not shortlisted | 128 | 94.5% [90.2%] | $25,968 [$51,319] | $28,064 | $32,008 | $18,519 | 38/11 | 16% | 45% | $86,144 | 37% | 13 |
| 93–95% | `VGT:d1-dab7285ec1+GDX:d1-6f2e60c0b4` | b: evaluated at r2, not shortlisted | 64 | 93.8% [86.8%] | $29,439 [$41,072] | $27,502 | $34,417 | $19,832 | 36/11 | 15% | 45% | $91,199 | 38% | 13 |
| 95–98% | `VGT:d1-f41ebcd961+GDX:d1-016d8e4257` | e: holder #1 profit (test pass) | 384 | 96.4% [94.4%] | $28,310 [$51,373] | $29,314 | $32,456 | $27,343 | 40/12 | 16% | 45% | $83,508 | 39% | 13 |
| 95–98% | `VGT:d1-0260b2e170+GDX:d1-e6e5b4e41c` | b: evaluated at r3, not shortlisted | 128 | 95.3% [91.2%] | $25,692 [$53,082] | $28,064 | $37,069 | $19,832 | 36/9 | 14% | 42% | $75,694 | 49% | 17 |
| 95–98% | `VGT:d1-071a0371b4+GDX:d1-83a62eba97` | b: evaluated at r2, not shortlisted | 64 | 96.9% [91.0%] | $29,145 [$44,534] | $28,022 | $32,493 | $26,868 | 41/12 | 16% | 45% | $83,605 | 39% | 13 |
| 98–100% | `VGT:d1-544ed7fb45+GDX:d1-4198b1b2ff` | b: evaluated at r2, not shortlisted | 64 | 98.4% [93.3%] | $29,744 [$44,151] | $28,510 | $32,295 | $27,344 | 40/12 | 16% | 47% | $82,863 | 39% | 13 |
| 98–100% | `VGT:d1-43d09d5cd6+GDX:d1-b3f82906fd` | b: evaluated at r2, not shortlisted | 64 | 98.4% [93.3%] | $26,082 [$42,870] | $28,156 | $28,688 | $22,437 | 40/13 | 18% | 43% | $81,180 | 35% | 12 |
| 98–100% | `VGT:d1-3a0a2bb27b+GDX:d1-e79d2f8ce3` | b: evaluated at r2, not shortlisted | 64 | 100.0% [95.9%] | $26,853 [$34,849] | $27,748 | $34,386 | $18,478 | 41/11 | 15% | 44% | $77,653 | 44% | 14 |

### VXR

| band | id | category | n | share [Wilson LB] | p90 DD [worst] | robust/yr | centre/yr | centre DD | lots/episodes | top lot | best year | net/capital-yr | occupancy | refused |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 93–95% | `VGT:d1-265b0cc41a+XBI:d1-28b80e874a+XRT:d1-dc40f26e0b` | b: evaluated at r2, not shortlisted | 64 | 93.8% [86.8%] | $32,501 [$52,688] | $13,035 | $27,362 | $22,887 | 43/13 | 18% | 37% | $106,000 | 26% | 22 |
| 95–98% | `VGT:d1-5a2f928c7c+XBI:d1-88eb452fa9+XRT:d1-f5538c448f` | b: evaluated at r3, not shortlisted | 128 | 95.3% [91.2%] | $30,183 [$43,261] | $15,510 | $27,028 | $22,877 | 45/13 | 18% | 37% | $106,202 | 25% | 22 |
| 95–98% | `VGT:d1-1e50a122bb+XBI:d1-3fe832ce35+XRT:d1-25fe9caec7` | b: evaluated at r2, not shortlisted | 64 | 96.9% [91.0%] | $25,490 [$37,549] | $15,263 | $25,518 | $22,020 | 40/10 | 13% | 47% | $123,355 | 21% | 16 |
| 95–98% | `VGT:d1-f743f8bf76+XBI:d1-ca28c1fc66+XRT:d1-15b6c9fa31` | b: evaluated at r3, not shortlisted | 128 | 97.7% [94.3%] | $26,612 [$42,829] | $15,188 | $25,453 | $22,877 | 44/12 | 19% | 39% | $97,640 | 26% | 21 |
| 98–100% | `VGT:d1-05f07225ab+XBI:d1-0f9162498a+XRT:d1-8424f14c77` | e: holder #15 profit (test pass) | 384 | 98.4% [97.0%] | $27,153 [$39,641] | $17,224 | $22,082 | $22,020 | 35/10 | 13% | 34% | $66,524 | 33% | 15 |
| 98–100% | `VGT:d1-ac19806145+XBI:d1-a76b0d90d4+XRT:d1-9fcb5e24e8` | b: evaluated at r2, not shortlisted | 64 | 100.0% [95.9%] | $27,778 [$32,427] | $17,185 | $21,659 | $22,020 | 34/12 | 13% | 35% | $71,261 | 30% | 14 |
| 98–100% | `VGT:d1-fbd6f8b794+XBI:d1-c890b36a0a+XRT:d1-d820c5437b` | b: evaluated at r3, not shortlisted | 128 | 100.0% [97.9%] | $26,894 [$33,194] | $16,796 | $20,437 | $22,020 | 33/12 | 14% | 37% | $67,402 | 30% | 15 |

### VXRG

| band | id | category | n | share [Wilson LB] | p90 DD [worst] | robust/yr | centre/yr | centre DD | lots/episodes | top lot | best year | net/capital-yr | occupancy | refused |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 90–93% | `VGT:d1-b0f1c3a337+XBI:d1-941f23a761+XRT:d1-0b64be531c+GDX:d1-2955634553` | b: evaluated at r2, not shortlisted | 64 | 92.2% [84.8%] | $31,853 [$55,219] | $25,640 | $26,162 | $21,226 | 43/17 | 20% | 60% | $107,081 | 24% | 25 |
| 90–93% | `VGT:d1-5fb303b9ab+XBI:d1-78c629c260+XRT:d1-344ca8d469+GDX:d1-21dea145eb` | b: evaluated at r2, not shortlisted | 64 | 90.6% [82.9%] | $34,072 [$41,200] | $24,019 | $30,874 | $29,087 | 42/14 | 17% | 53% | $104,453 | 29% | 25 |
| 90–93% | `VGT:d1-79e8405652+XBI:d1-7b1e523a34+XRT:d1-209a6cdb4a+GDX:d1-593171a0e2` | b: evaluated at r2, not shortlisted | 64 | 90.6% [82.9%] | $33,437 [$42,081] | $21,434 | $35,741 | $17,744 | 39/14 | 14% | 53% | $160,109 | 22% | 23 |
| 93–95% | `VGT:d1-61be86f1a1+XBI:d1-1a086c125a+XRT:d1-6036e39d3e+GDX:d1-ca3c80373a` | b: evaluated at r2, not shortlisted | 64 | 93.8% [86.8%] | $32,094 [$51,205] | $25,507 | $24,842 | $17,744 | 46/16 | 22% | 63% | $97,195 | 26% | 24 |
| 93–95% | `VGT:d1-2542ac3521+XBI:d1-507352e579+XRT:d1-f6f3260160+GDX:d1-a0a05998c5` | b: evaluated at r2, not shortlisted | 64 | 93.8% [86.8%] | $31,183 [$45,913] | $22,644 | $33,534 | $19,129 | 42/8 | 16% | 60% | $82,134 | 41% | 17 |
| 93–95% | `VGT:d1-ccbca34cc9+XBI:d1-f06bb1f744+XRT:d1-4baacdbb82+GDX:d1-0adcf91813` | b: evaluated at r2, not shortlisted | 64 | 93.8% [86.8%] | $29,704 [$45,812] | $22,484 | $33,022 | $19,004 | 43/7 | 16% | 61% | $85,768 | 38% | 16 |
| 95–98% | `VGT:d1-61be86f1a1+XBI:d1-1a086c125a+XRT:d1-0245c8dddf+GDX:d1-ca3c80373a` | e: holder #3 profit (test pass) | 384 | 96.6% [94.7%] | $30,381 [$45,892] | $26,156 | $24,842 | $17,744 | 46/16 | 22% | 63% | $97,195 | 26% | 24 |
| 95–98% | `VGT:d1-de90a45480+XBI:d1-8af94c0d9d+XRT:d1-1fccf69c61+GDX:d1-ba2052136f` | b: evaluated at r3, not shortlisted | 128 | 97.7% [94.3%] | $29,616 [$36,475] | $25,063 | $36,689 | $21,102 | 41/14 | 14% | 49% | $148,841 | 25% | 23 |
| 95–98% | `VGT:d1-b92a9a3eb8+XBI:d1-96368f27b9+XRT:d1-14e8eadf70+GDX:d1-2d6e58c510` | b: evaluated at r3, not shortlisted | 128 | 97.7% [94.3%] | $27,992 [$38,024] | $25,019 | $32,469 | $21,183 | 55/15 | 16% | 47% | $98,248 | 33% | 23 |
| 98–100% | `VGT:d1-f7242fa73f+XBI:d1-7131534d6d+XRT:d1-4e028ad95c+GDX:d1-f17446b205` | e: holder #4 balanced (test fail) | 384 | 99.7% [98.8%] | $23,620 [$39,359] | $25,549 | $34,175 | $19,621 | 40/8 | 16% | 59% | $90,385 | 38% | 16 |
| 98–100% | `VGT:d1-d1b1d07d99+XBI:d1-90d1c91e59+XRT:d1-447ca5fcef+GDX:d1-0ae44496f3` | b: evaluated at r3, not shortlisted | 128 | 99.2% [96.6%] | $27,139 [$38,955] | $25,514 | $34,622 | $19,756 | 52/16 | 15% | 53% | $108,710 | 32% | 25 |
| 98–100% | `VGT:d1-50bd03f470+XBI:d1-549d28495f+XRT:d1-8714c6883a+GDX:d1-47858c457d` | b: evaluated at r3, not shortlisted | 128 | 99.2% [96.6%] | $24,503 [$35,723] | $25,261 | $30,717 | $17,700 | 39/12 | 17% | 51% | $137,379 | 22% | 22 |

### VXRKG

| band | id | category | n | share [Wilson LB] | p90 DD [worst] | robust/yr | centre/yr | centre DD | lots/episodes | top lot | best year | net/capital-yr | occupancy | refused |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 90–93% | `VGT:d1-556a812478+XBI:d1-c2bfb74a92+XRT:d1-e89543e837+KRE:d1-f10c7ca1b8+GDX:d1-4d9fcf9d4f` | b: evaluated at r2, not shortlisted | 64 | 90.6% [82.9%] | $34,616 [$44,271] | $20,918 | $32,889 | $29,876 | 59/12 | 15% | 58% | $111,819 | 29% | 41 |
| 90–93% | `VGT:d1-712cacbd93+XBI:d1-b5d18ffa16+XRT:d1-d0e78a911e+KRE:d1-d8a0c0d216+GDX:d1-96b9009890` | b: evaluated at r2, not shortlisted | 64 | 92.2% [84.8%] | $34,022 [$46,077] | $20,753 | $29,180 | $25,400 | 51/11 | 18% | 66% | $121,605 | 24% | 29 |
| 90–93% | `VGT:d1-fd613c6ea0+XBI:d1-c96f458ccd+XRT:d1-bac5c57208+KRE:d1-996d52af99+GDX:d1-1ea10eeadd` | b: evaluated at r2, not shortlisted | 64 | 92.2% [84.8%] | $34,021 [$47,421] | $20,663 | $33,098 | $30,487 | 64/16 | 15% | 61% | $114,082 | 29% | 42 |
| 93–95% | `VGT:d1-7eb1e88383+XBI:d1-0c85c34f30+XRT:d1-0384f19028+KRE:d1-3dbb7765c4+GDX:d1-0ee634d881` | b: evaluated at r2, not shortlisted | 64 | 93.8% [86.8%] | $32,286 [$41,657] | $21,787 | $27,830 | $25,616 | 52/12 | 18% | 62% | $119,235 | 23% | 31 |
| 93–95% | `VGT:d1-baff625646+XBI:d1-c96f458ccd+XRT:d1-fe718362d6+KRE:d1-8313e4a537+GDX:d1-ecbf83c391` | b: evaluated at r2, not shortlisted | 64 | 93.8% [86.8%] | $34,135 [$38,956] | $21,206 | $33,388 | $30,082 | 59/13 | 15% | 60% | $102,153 | 33% | 43 |
| 93–95% | `VGT:d1-3f5fb28e19+XBI:d1-d03bd2bdb9+XRT:d1-e89543e837+KRE:d1-e644e4d566+GDX:d1-f3a51fe69d` | c: shortlisted; failed Q2b | 384 | 93.8% [91.4%] | $34,326 [$48,899] | $21,186 | $35,735 | $30,324 | 66/15 | 14% | 54% | $121,195 | 29% | 44 |
| 95–98% | `VGT:d1-c2cdf4335f+XBI:d1-d0d38fd44f+XRT:d1-f89100e847+KRE:d1-ada180394a+GDX:d1-b42950a9be` | b: evaluated at r2, not shortlisted | 64 | 96.9% [91.0%] | $31,663 [$40,264] | $22,254 | $31,408 | $25,938 | 51/11 | 16% | 65% | $126,484 | 25% | 31 |
| 95–98% | `VGT:d1-9ef61125bc+XBI:d1-ba0ed7b841+XRT:d1-6776afea8a+KRE:d1-2a658255b8+GDX:d1-6cfbed10ba` | b: evaluated at r2, not shortlisted | 64 | 96.9% [91.0%] | $31,890 [$40,266] | $22,236 | $26,682 | $25,616 | 47/10 | 19% | 64% | $119,920 | 22% | 32 |
| 95–98% | `VGT:d1-d920e96df6+XBI:d1-729e4b8b1b+XRT:d1-84f92b67c9+KRE:d1-78b9a5a0fe+GDX:d1-f1992e723c` | b: evaluated at r2, not shortlisted | 64 | 96.9% [91.0%] | $31,294 [$41,332] | $22,095 | $27,694 | $25,075 | 52/11 | 19% | 63% | $117,008 | 24% | 31 |
| 98–100% | `VGT:d1-28ce3e131c+XBI:d1-2c4343e62d+XRT:d1-1a4d950d56+KRE:d1-ce53998991+GDX:d1-9c73f00f55` | e: holder #8 profit (test pass) | 384 | 98.2% [96.7%] | $32,249 [$44,335] | $23,095 | $29,788 | $25,616 | 52/10 | 17% | 61% | $121,561 | 24% | 33 |
| 98–100% | `VGT:d1-bdf31dccef+XBI:d1-c13a466b4f+XRT:d1-426f3648ae+KRE:d1-4a89bcf93b+GDX:d1-cde8becc1d` | e: holder #9 balanced (test pass) | 384 | 99.0% [97.7%] | $31,131 [$38,480] | $22,393 | $26,932 | $25,325 | 52/11 | 19% | 67% | $117,397 | 23% | 33 |
| 98–100% | `VGT:d1-02a7861775+XBI:d1-f4e701b9b5+XRT:d1-96e81f70a3+KRE:d1-87a285523e+GDX:d1-f72bd12161` | b: evaluated at r3, not shortlisted | 128 | 99.2% [96.6%] | $31,480 [$39,088] | $22,384 | $26,836 | $25,612 | 48/11 | 19% | 60% | $123,023 | 22% | 33 |

**Economically distinct regions, not near-identical vectors.**

- The number of distinct L∞ ≥ 0.10 regions among risk-feasible ≥ 64-point records is in `outputs/f24-frontier.md`,
  per track.
- In VG, several high rows are GDX-book variants of #1 (`VGT:d1-f41ebcd961+…`) and fall in #1's region.
- In VXRG, `VGT:d1-61be86f1a1+…+XRT:d1-6036e39d3e+…` is a one-book variant of #3.

**More conservative alternatives with genuinely improved risk (lower p90 / higher share) at lower return**, from the
efficient set on (robust ↑, share ↑, p90 ↓):

| track | conservative alternative | category | share (n) | p90 DD | robust/yr (vs holder) | note |
|---|---|---|---|---|---|---|
| G | `GDX:d1-320f65ef34` | b (rung 3) | 100% (128) | $23,642 | $17,228 (−13% vs #12) | only 15 lots / 11 episodes in 7.5 training years; the same low-activity profile as holders #19 and #22 (100% confirmation share). Their sealed outcomes are in `VALIDATION_PERSISTENCE_AUDIT.md` |
| VG | #2 VG balanced `VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d` | e (holder) | 97.9% (384) | $24,082 | $27,098 (−8% vs #1) | already sealed and nominated |
| VG | #5 VG extra `VGT:d1-ed1b24997b+GDX:d1-8c0a637cf4` | e (holder) | 99.5% (384) | $23,046 | $24,181 (−18%) | already sealed and nominated |
| VXRG | `VGT:d1-d1b1d07d99+XBI:d1-90d1c91e59+XRT:d1-447ca5fcef+GDX:d1-0ae44496f3` | b (rung 3) | 99.2% (128) | $27,139 | $25,514 (−1% at r3) | not reached (six picks filled; T2-rescored, its 256-point value not retained) |
| VXRKG | #9 VXRKG balanced | e (holder) | 99.0% (384) | $31,131 | $22,393 (−3%) | already sealed and nominated |

## 4. Why candidates did not advance (decomposition)

`outputs/f24-funnel.md` gives the full funnel, gate and reason tables. In summary:

- **Rung 1 → rung 2: constrained-domination order with crowding, not robust profit.**
  - Of the feasible Pareto front at rung 1 (16-point values), G 91 of 274, V 63 of 162, VG 11 of 130, VXR 1 of 59,
    VXRG 4 of 50 and VXRKG 5 of 195 were not promoted. The cap is 192 at L∞ ≥ 0.02.
  - Feasible unpromoted configurations above the best promoted rung-1 robust value: G 1; every other track 0.
  - **Rung-1 infeasibility by non-risk constraints alone** (risk-feasible but infeasible; C3 lots/episodes, C5 or
    "other" = C3 lot-years / C4 / C6 / C7): 1,986–4,301 rows per track. The three distinct V leads shown are
    infeasible only on "other", which at rung 1 cannot be split further.
- **Rung 2 → rung 3:** "below the top 48 of the constrained-domination order" (135–143 per pooled track) and L∞
  < 0.03 of a rung-3 pick.
- **Rung 3 → shortlist:**
  - "Not reached": six picks were filled in profit/robust/balanced/centre/front order (25–40 per pooled track and
    G, counting T2-rescored ones; none in V).
  - Within L∞ 0.10 of a shortlisted pick (1–17).
  - Same funded-ledger signature (V 7, VG 2).
  - Several in VG, VXR and VXRG were T2-rescored, and their 256-point value was not retained.
- **Shortlist → qualification:** 9 of 36 F24 members failed:
  - risk gates (Q2, Q2b) in G ×2, V ×2, VG ×1, VXRKG ×1;
  - Q7 stress in G ×2 (the profit pick also failed Q2/Q2b);
  - Q8, the plateau-to-centre ratio, in VG ×1, VXR ×1, and V ×1 together with Q2b.
- **Qualification → roles:** only VXRG #6 qualified without a role, through the two-extra cap.

**Robust-profit formula (report-only).** On the rung-3-feasible sets, the top configuration changes with the scoring
rule (`outputs/f24-funnel.md`, last table):

- median only, p10 only, ¾·median + ¼·p10 and centre net each sometimes pick another configuration;
- in every case it is another shortlisted pick, or a non-shortlisted configuration within 3% of the sealed top. The
  largest gap is VXR's p10-only pick, −2.6%.

No alternative rule surfaces a materially more profitable risk-feasible configuration.

## 5. Q6 (training half) — what does a minimum share of 0.93, 0.95 or 0.98 cost?

This is the best robust profit among configurations feasible under every other sealed constraint, at rung 3
(128 points; all rung-3 configurations including refinement) and at confirmation (384 points; qualified shortlist
members). **Report-only: no gate changes.**

| track | record | min share | count | best robust/yr | % of 0.90 best | its median/yr | its p10/yr | its centre/yr | lowest p90 DD in set |
|---|---|---|---|---|---|---|---|---|---|
| G | rung 3 (128 pt; all r3 incl. refinement) | 0.90 | 48 | $22,926 | 100% | $24,141 | $21,712 | $23,739 | $17,281 |
| G | rung 3 (128 pt; all r3 incl. refinement) | 0.93 | 40 | $17,228 | 75% | $20,334 | $14,122 | $22,918 | $17,281 |
| G | rung 3 (128 pt; all r3 incl. refinement) | 0.95 | 40 | $17,228 | 75% | $20,334 | $14,122 | $22,918 | $17,281 |
| G | rung 3 (128 pt; all r3 incl. refinement) | 0.98 | 40 | $17,228 | 75% | $20,334 | $14,122 | $22,918 | $17,281 |
| G | confirmation (384 pt; shortlist) | 0.90 | 3 | $19,799 | 100% | $21,576 | $18,023 | $21,127 | $17,281 |
| G | confirmation (384 pt; shortlist) | 0.93 | 2 | $14,428 | 73% | $18,498 | $10,358 | $23,720 | $17,281 |
| G | confirmation (384 pt; shortlist) | 0.95 | 2 | $14,428 | 73% | $18,498 | $10,358 | $23,720 | $17,281 |
| G | confirmation (384 pt; shortlist) | 0.98 | 2 | $14,428 | 73% | $18,498 | $10,358 | $23,720 | $17,281 |
| V | rung 3 (128 pt; all r3 incl. refinement) | 0.90 | 11 | $8,959 | 100% | $10,070 | $7,847 | $14,062 | $31,630 |
| V | rung 3 (128 pt; all r3 incl. refinement) | 0.93 | 11 | $8,959 | 100% | $10,070 | $7,847 | $14,062 | $31,630 |
| V | rung 3 (128 pt; all r3 incl. refinement) | 0.95 | 3 | $8,271 | 92% | $11,018 | $5,524 | $17,619 | $34,508 |
| V | rung 3 (128 pt; all r3 incl. refinement) | 0.98 | 0 | — | — | — | — | — | — |
| V | confirmation (384 pt; shortlist) | 0.90 | 4 | $8,890 | 100% | $10,094 | $7,686 | $14,062 | $33,392 |
| V | confirmation (384 pt; shortlist) | 0.93 | 2 | $8,584 | 97% | $11,268 | $5,900 | $17,619 | $34,604 |
| V | confirmation (384 pt; shortlist) | 0.95 | 1 | $8,584 | 97% | $11,268 | $5,900 | $17,619 | $34,604 |
| V | confirmation (384 pt; shortlist) | 0.98 | 0 | — | — | — | — | — | — |
| VG | rung 3 (128 pt; all r3 incl. refinement) | 0.90 | 48 | $28,656 | 100% | $31,108 | $26,204 | $32,456 | $19,329 |
| VG | rung 3 (128 pt; all r3 incl. refinement) | 0.93 | 45 | $28,656 | 100% | $31,108 | $26,204 | $32,456 | $19,329 |
| VG | rung 3 (128 pt; all r3 incl. refinement) | 0.95 | 41 | $28,064 | 98% | $30,056 | $26,072 | $37,069 | $19,329 |
| VG | rung 3 (128 pt; all r3 incl. refinement) | 0.98 | 32 | $27,242 | 95% | $29,350 | $25,134 | $29,983 | $19,329 |
| VG | confirmation (384 pt; shortlist) | 0.90 | 4 | $29,314 | 100% | $30,992 | $27,635 | $32,456 | $19,676 |
| VG | confirmation (384 pt; shortlist) | 0.93 | 4 | $29,314 | 100% | $30,992 | $27,635 | $32,456 | $19,676 |
| VG | confirmation (384 pt; shortlist) | 0.95 | 4 | $29,314 | 100% | $30,992 | $27,635 | $32,456 | $19,676 |
| VG | confirmation (384 pt; shortlist) | 0.98 | 2 | $24,181 | 82% | $26,481 | $21,881 | $28,140 | $19,676 |
| VXR | rung 3 (128 pt; all r3 incl. refinement) | 0.90 | 49 | $17,159 | 100% | $19,442 | $14,875 | $22,082 | $23,628 |
| VXR | rung 3 (128 pt; all r3 incl. refinement) | 0.93 | 49 | $17,159 | 100% | $19,442 | $14,875 | $22,082 | $23,628 |
| VXR | rung 3 (128 pt; all r3 incl. refinement) | 0.95 | 49 | $17,159 | 100% | $19,442 | $14,875 | $22,082 | $23,628 |
| VXR | rung 3 (128 pt; all r3 incl. refinement) | 0.98 | 43 | $17,159 | 100% | $19,442 | $14,875 | $22,082 | $23,628 |
| VXR | confirmation (384 pt; shortlist) | 0.90 | 5 | $17,224 | 100% | $18,970 | $15,478 | $22,082 | $23,419 |
| VXR | confirmation (384 pt; shortlist) | 0.93 | 5 | $17,224 | 100% | $18,970 | $15,478 | $22,082 | $23,419 |
| VXR | confirmation (384 pt; shortlist) | 0.95 | 5 | $17,224 | 100% | $18,970 | $15,478 | $22,082 | $23,419 |
| VXR | confirmation (384 pt; shortlist) | 0.98 | 5 | $17,224 | 100% | $18,970 | $15,478 | $22,082 | $23,419 |
| VXRG | rung 3 (128 pt; all r3 incl. refinement) | 0.90 | 49 | $25,840 | 100% | $27,569 | $24,110 | $24,842 | $20,690 |
| VXRG | rung 3 (128 pt; all r3 incl. refinement) | 0.93 | 49 | $25,840 | 100% | $27,569 | $24,110 | $24,842 | $20,690 |
| VXRG | rung 3 (128 pt; all r3 incl. refinement) | 0.95 | 49 | $25,840 | 100% | $27,569 | $24,110 | $24,842 | $20,690 |
| VXRG | rung 3 (128 pt; all r3 incl. refinement) | 0.98 | 38 | $25,514 | 99% | $28,599 | $22,430 | $34,622 | $20,690 |
| VXRG | confirmation (384 pt; shortlist) | 0.90 | 6 | $26,156 | 100% | $28,104 | $24,208 | $24,842 | $22,067 |
| VXRG | confirmation (384 pt; shortlist) | 0.93 | 6 | $26,156 | 100% | $28,104 | $24,208 | $24,842 | $22,067 |
| VXRG | confirmation (384 pt; shortlist) | 0.95 | 6 | $26,156 | 100% | $28,104 | $24,208 | $24,842 | $22,067 |
| VXRG | confirmation (384 pt; shortlist) | 0.98 | 5 | $25,549 | 98% | $28,244 | $22,855 | $34,175 | $22,067 |
| VXRKG | rung 3 (128 pt; all r3 incl. refinement) | 0.90 | 52 | $23,067 | 100% | $25,044 | $21,091 | $29,788 | $26,168 |
| VXRKG | rung 3 (128 pt; all r3 incl. refinement) | 0.93 | 40 | $23,067 | 100% | $25,044 | $21,091 | $29,788 | $26,168 |
| VXRKG | rung 3 (128 pt; all r3 incl. refinement) | 0.95 | 39 | $23,067 | 100% | $25,044 | $21,091 | $29,788 | $26,168 |
| VXRKG | rung 3 (128 pt; all r3 incl. refinement) | 0.98 | 20 | $23,067 | 100% | $25,044 | $21,091 | $29,788 | $26,168 |
| VXRKG | confirmation (384 pt; shortlist) | 0.90 | 5 | $23,095 | 100% | $25,057 | $21,133 | $29,788 | $25,450 |
| VXRKG | confirmation (384 pt; shortlist) | 0.93 | 5 | $23,095 | 100% | $25,057 | $21,133 | $29,788 | $25,450 |
| VXRKG | confirmation (384 pt; shortlist) | 0.95 | 5 | $23,095 | 100% | $25,057 | $21,133 | $29,788 | $25,450 |
| VXRKG | confirmation (384 pt; shortlist) | 0.98 | 3 | $23,095 | 100% | $25,057 | $21,133 | $29,788 | $30,666 |

**Reading it:**

- Moving the minimum from 0.90 to **0.95** costs nothing in VXR, VXRG and VXRKG. It costs about 2% at rung 3 in VG
  (0% at confirmation, because #1 measures 96.4% there), 3–8% in V, and about **25% in G**.
- At **0.98** the cost stays ≤ 1% at rung 3 for VXR, VXRG and VXRKG, and ≤ 2.3% at confirmation (VXRG). It is 5%
  (rung 3) to 18% (confirmation) for VG, and unchanged in G (~25–27%). V has no configuration.
- **The user's ≥ 95% preference therefore excludes almost no training-side profit in the pooled tracks, and excludes
  a lot in GDX alone.** In GDX the more profitable vectors are exactly the less robust ones.
- A neighbourhood share is not a probability of future drawdown safety.
