# Baselines and fixed subsets (Phase A — frozen phenotypes, no tuning)

Sources:
- the sealed records `results/phaseA/<config>-<window>.json` and their `-points.jsonl.gz`;
- the manifest `results/phaseA/baseline_manifest.json` (body `926465a66f13…`, committed in `e6aebab` before any
  Phase B search);
- the tables `results/tables/phaseA-centres.md`, `phaseA-dimension.md` and `phaseA-decomposition.md`, all generated
  from those records.

**Scope.**
- **Conventions:** fixed $100,000 slot, 11% simple interest, 5 bps per side, stops at the stop, arming 2017-06-15,
  continuous runs from 2016-01-04.
- **Windows:** W23 runs to 2023-12-29 and W29 to 2026-10-29. WDEV (to 2021-12-31) is in the records.
- **Books:** each subset uses B5's own frozen books: VGT `primary`, XBI and XRT `lowDd`, KRE `lowDd`, GDX
  `portfolioAware`.
- **Reading embargo:** per PROTOCOL.md §4.2, these results were sealed before Phase B and **not read until
  `FROZEN_SELECTION.json` was sealed** (2026-11-01T01:24:05Z). They informed no search, gate or selection.
- **Exposure:** all windows were seen before this study. This is retrospective description.

## 1. The five frozen configurations — centre and neighbourhood (joint N1 clip, all coordinates, 128 points × 5 replicates)

| Config | Window | Net | Minute DD | Daily DD | Lots | Episodes | Net / occupied $100k-yr | Joint N1 share < $35k (rep 1; reps 1–5) | p90 DD | Median net | p10 net | In-box | 0.5r | 1.5r |
|---|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|
| B1 (VGT) | W23 | $135,359 | $19,534 | $15,817 | 17 | 6 | $53,878 | 99.2% (99–100%) | $28,848 | $74,997 | $44,376 | 100% | 100% | 100% |
| B1 (VGT) | W29 | $176,260 | $19,534 | $15,817 | 21 | 7 | $53,258 | 99.2% (99–100%) | $28,848 | $120,679 | $93,012 | 100% | 100% | 100% |
| VG (VGT+GDX) | W23 | $183,265 | $19,534 | $15,817 | 22 | 9 | $71,162 | 73.4% (65–79%) | $40,164 | $132,276 | $74,766 | 77.3% | 93.8% | 63.3% |
| VG | W29 | $278,266 | $25,774 | $22,563 | 34 | 14 | $72,187 | 73.4% (65–78%) | $41,912 | $201,793 | $134,373 | 76.6% | 93.8% | 63.3% |
| VXR (VGT+XBI+XRT) | W23 | $186,007 | $19,534 | $15,817 | 34 | 10 | $65,724 | **93.0%** (93–95%) | **$33,288** | $87,685 | $51,642 | 92.2% | 97.7% | 91.4% |
| VXR | W29 | $228,475 | $19,534 | $17,163 | 38 | 11 | $61,364 | 87.5% (88–94%) | $35,486 | $134,238 | $97,051 | 89.8% | 96.9% | 89.1% |
| VXRG (no KRE) | W23 | $291,290 | $19,534 | $15,817 | 41 | 11 | $91,420 | 66.4% (62–73%) | $47,682 | $149,819 | $97,292 | 57.8% | 89.8% | 60.2% |
| VXRG | W29 | $387,857 | $25,774 | $22,563 | 53 | 16 | $85,026 | 64.8% (61–71%) | $48,020 | $216,390 | $148,798 | 57.8% | 89.8% | 58.6% |
| B5 (five books) | W23 | $388,489 | $26,510 | $23,789 | 82 | 9 | $113,077 | 28.1% (20–33%) | $56,835 | $182,147 | $118,203 | 28.1% | 53.9% | 25.0% |
| B5 | W29 | $484,637 | $26,510 | $23,789 | 95 | 14 | $100,507 | 28.1% (20–33%) | $56,835 | $244,847 | $165,634 | 28.1% | 53.9% | 25.0% |

**Gate verdicts** (decisive replicate 1; gate = share ≥ 90% **and** p90 < $35,000):

| Config | W23 | W29 | Notes |
|---|---|---|---|
| B1 | pass | pass | one breach in replicate 1 (a 2020-Q1 neighbour, $36,244) |
| VXR | pass | fail | W23: 93.0%, $33,288. W29: 87.5%, p90 $35,486, $486 over the ceiling, after the 2025-Q2 tariff shock. Replicates 2–5 on W29: 91–94%. **Marginal**: the verdict depends on the replicate. |
| VG | fail | fail | 73% |
| VXRG | fail | fail | 65% |
| B5 | fail | fail | 28% |

Study 6 reported 21.9% for B5 under the same instrument but its own seed family. Study 7's family gives 28.1%. The
difference is ordinary Monte Carlo variation across seed families; the pooled standard error is about ±2 points.

## 2. Execution sensitivity of the frozen centres (W29; net / minute DD)

| Config | 0 bps | 2 bps | 10 bps | 20 bps | 8% | 14% | next-open stops | +10 bps slip | +25 bps slip |
|---|---|---|---|---|---|---|---|---|---|
| B1 | $179k / $19.3k | $178k / $19.4k | $174k / $19.7k | $171k / $20.1k | $186k / $19.4k | $168k / $19.7k | $177k / $19.2k | $175k / $19.8k | $172k / $20.1k |
| VG | $282k / $25.4k | $280k / $25.5k | $275k / $26.2k | $269k / $26.9k | $290k / $25.3k | $269k / $26.2k | $278k / $25.9k | $276k / $26.0k | $271k / $26.3k |
| VXR | $232k / $19.3k | $231k / $19.4k | $224k / $19.7k | $217k / $20.1k | $239k / $19.4k | $218k / $19.7k | $230k / $19.2k | $226k / $19.8k | $222k / $20.1k |
| VXRG | $393k / $25.4k | $391k / $25.5k | $382k / $26.2k | $371k / $26.9k | $401k / $25.3k | $374k / $26.2k | $389k / $25.9k | $383k / $26.0k | $377k / $26.3k |
| B5 | $494k / $26.3k | $491k / $26.4k | $475k / $26.7k | $427k / $27.2k | $499k / $26.4k | $470k / $26.6k | $486k / $26.2k | $478k / $26.7k | $468k / $27.1k |

No centre approaches $35,000 under any setting. The frozen centres' risk lies in their neighbourhoods, not in costs or
fills.

## 3. Dimension-matched perturbations (W29; share < $35k / p90 DD)

| Config | Joint (all coordinates) | Count-matched k = 8 (one book's worth) | k = 16 | Norm-matched (√(8/d) radius) | One book at a time (64 × 3) |
|---|---|---|---|---|---|
| B1 (8-D) | 99.2% / $28,848 | = joint | — | = joint | — |
| VG (16-D) | 73.4% / $41,912 | 88.3% / $37,018 | — | 85.2% / $37,260 | VGT 98%, GDX 86% |
| VXR (24-D) | 87.5% / $35,486 | **98.4% / $26,304** | 93.8% / $31,072 | 99.2% / $28,213 | VGT 100%, XBI 98%, XRT 97% |
| VXRG (32-D) | 64.8% / $48,020 | 97.7% / $29,300 | 89.8% / $35,008 | 86.7% / $36,662 | VGT 98%, XBI 97%, XRT 100%, GDX 86% |
| B5 (40-D) | 28.1% / $56,835 | 89.8% / $34,946 | 64.8% / $39,028 | 57.8% / $39,285 | VGT 100%, XBI 100%, XRT 100%, KRE 62%, GDX 91% |

**Reading.** A 40-D joint perturbation is not the same difficulty as an 8-D one. At equal perturbed-coordinate count
(k = 8):
- B5 rises from 28% to 90%;
- VXRG rises from 65% to 98%;
- VG rises only from 73% to 88%. Its fragility is not a dimension artefact: it comes from the GDX book (86% alone).

The hypothesis H2 is supported for VXR and VXRG (the smaller pools are more stable, partly because of dimension). It
is **refuted for VG**: adding GDX to VGT makes the pool less stable than B1 under every design.

## 4. Mechanism: who breaks the pool, and own P&L versus funding (W29, joint reps 1–3, 384 points)

| Config | Joint breaches | Breaches removed by resetting each book | Breaches with only that book perturbed | Median abs. Δ pool net | Median abs. interaction (funding/blocking) | var(interaction) ÷ var(Δ pool) | Kept-lot share / ledger Jaccard (rep 1) |
|---|---:|---|---|---:|---:|---:|---|
| B1 | 1 | VGT 100% | VGT 100% | $52,587 | $0 | 0.00 | 0.05 / 0.03 |
| VG | 107 | GDX 89%, VGT 64% | GDX 36%, VGT 11% | $80,724 | $42,466 | 0.71 | 0.12 / 0.06 |
| VXR | 35 | XBI 80%, XRT 80%, VGT 63% | XRT 17%, XBI 9%, VGT 0% | $95,084 | $114,022 | 0.87 | 0.08 / 0.04 |
| VXRG | 143 | GDX 76%, XBI 64%, VGT 38%, XRT 16% | GDX 25%, XBI 1% | $170,346 | $109,912 | 0.81 | 0.09 / 0.05 |
| B5 | 284 | KRE 54%, GDX 36%, VGT 17%, XBI 11%, XRT 4% | KRE 51%, GDX 14% | $240,055 | $97,100 | 0.90 | 0.11 / 0.06 |

- **Funding interactions are as large as the books' own P&L changes.**
  - In every pool, the interaction term is 71–90% of the variance of the pool's net change. It is the part not
    explained by summing each book's standalone change.
  - Summed standalone P&L would therefore misstate pooled P&L by roughly as much as the effect being measured.
  - The kept-lot shares of 5–12% mean almost no neighbour reproduces the centre's funded sequence exactly.
- **Breaches are mostly joint.**
  - Few breaches arise from one book's perturbation alone; the exceptions are KRE in B5 (51%) and GDX in VG (36%).
  - Resetting the pool's GDX book removes 76–89% of breaches where GDX is present.

### Breach episodes (calendar quarter of the minute-DD trough, joint reps 1–5 pooled)

| Config | Main breach quarters (count of breaching neighbours) |
|---|---|
| B1 | 2020-Q1 (1) |
| VG | **2022-Q3 (136)**, 2025-Q2 (25), 2022-Q4 (11), 2020-Q1 (3) |
| VXR | **2025-Q2 (40)**, 2022-Q1 (8), 2022-Q4 (5), 2022-Q2/Q3 (3 each) |
| VXRG | **2022-Q3 (168)**, 2025-Q2 (40), 2022-Q4 (9) |
| B5 | **2023-Q2 (192)**, 2020-Q1 (127), 2022-Q3 (108) |

**Representative breaches.** The one nearest the centre in rep 1 is decomposed by lot from the minute series. The
lot contributions sum to the drawdown exactly.

- **VG:** $49,327 from 2022-03-29 to 2022-09-26. The losses are GDX re-entries through the 2022 gold-miner bear
  (09-08 −$11,346, 08-19 −$9,320, 06-30 −$9,312, 06-10 −$4,917) plus a VGT lot (03-14 −$8,714).
- **VXRG:** $50,775, the same 2022 GDX sequence.
- **VXR:** $35,090, spread over 2022–2025 (VGT 2025-04-04 −$8,258, VGT 2022-03-14 −$7,771, XRT 2023-02-15 −$6,943,
  XBI 2022-06-10 −$5,364).
- **B5:** $49,291, the 2022 GDX sequence. KRE drives its 2020-Q1 and 2023-Q2 breaches (Study 6).

**Centre drawdowns.**
- **B1, VXR and B5:** the frozen centres' worst drawdowns are the March 2020 episode. B1 and VXR lose $19,534, from a
  VGT lot entered 2019-08-05 and the 2020-03-12 lot. B5 loses $26,510, from KRE's 2020-03-09 lot.
- **VG and VXRG:** their full-history worst drawdown is **2026-04-01 → 2026-07-17, $25,774**, a sequence of five GDX
  lots in 2026.

### March 2020 and 2022–2023 re-entry (W29, rep-1 neighbours)

| Config | M2020 centre lots | M2020: median neighbour lots / kept / net | R2223 centre lots | R2223: median neighbour lots / kept / net | R2223 median net of breaching neighbours |
|---|---:|---|---:|---|---:|
| B1 | 4 | 3 / 0 / $36,301 | 9 | 8.5 / 0 / $12,486 | $6,496 |
| VG | 4 | 4 / 1 / $56,807 | 13 | 12 / 1 / $25,008 | $17,149 |
| VXR | 4 | 3 / 0 / $35,229 | 22 | 18 / 2 / $12,907 | −$2,484 |
| VXRG | 4 | 4 / 1 / $56,171 | 25 | 21 / 2 / $20,930 | $8,954 |
| B5 | 10 | 7 / 2 / $60,836 | 42 | 42 / 4 / $48,427 | $34,673 |

Breaching neighbours are often still profitable over 2022–2023. Their breach is a path drawdown inside a long re-entry
sequence, mainly GDX's, not a net loss.

## 5. Answers for Phase A (descriptive; frozen phenotypes)

1. **Do smaller pools exhibit a plateau?**
   - **VXR:** close to one. It passes the gate to 2023 and misses narrowly on the full history (87.5%, p90 $35,486;
     replicates 88–94%). It is 98–99% under dimension-matched designs.
   - **VXRG:** improves on B5 (65% vs 28%) but stays far from 90%.
   - **VG:** does not. It is less stable than B1 because of GDX.
   - Removing KRE helps, as Study 6 predicted. It does not remove the GDX 2022 failure mode.
2. **Is B1 still the strongest stable control?** Yes: 99.2–100% on every design. Its profit is the lowest of the five
   ($176k full history).
3. **GDX controls standalone:** see `GDX_STANDALONE.md` §1. Every earlier GDX vector fails the joint gate on W23 and
   W29 (0–63%).
