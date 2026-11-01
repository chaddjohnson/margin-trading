# GDX standalone D1 (Track G) — mandatory track

All figures come from sealed records:
- Phase A: `results/phaseA/G-*-W23.json` and `-W29.json`;
- Phase B: `results/phaseB/G/<fold>/search.json`;
- Phase D: `results/phaseD/G/<fold>/validation.json`;
- the final stage: `results/final/final.json`.

Conventions: GDX alone in the fixed $100,000 slot, 11% simple interest, 5 bps per side.

## Answer (priority question 1)

**Can GDX standalone reach a genuinely profitable, broad, acceptable-risk D1 neighbourhood?**

- **Not by a chronological test.**
  - Each fold's optimizer trained up to a cut-off and was tested on later data (F19 → 2020–21, F20 → 2021–22,
    M → 2022–23).
  - It found GDX regions with **100% of their training neighbourhood below $35,000**.
  - Every one of them broke out of fold. Fold M's six shortlisted vectors reach a $49k–$62k minute DD at their own
    centres in the 2022 gold-miner bear, and 0–12% of their neighbours stay below $35k on the run to 2023.
- **Yes, retrospectively.**
  - With 2022–2023 inside the training window (fold L), the search found a distinct GDX region. Its neighbourhood is
    100% below $35k on 2017–2023, and stays 100% below $35k on the full history to 2026-10-29 under new seeds.
  - The three role holders, `d1-9def070caf`, `d1-4a64bcdc89` and `d1-36ef0f546d`, pass every predeclared gate and the
    block-only final checks. They are **Class L research nominations** (ranks 7, 10 and 11).
- **Their economics are thin outside March 2020.** The final-door records show:
  - 61–72% of full-history net comes from 2020;
  - the ex-2020 economy is $5.5k–$7.8k per year, just above the $5k floor;
  - the 2024–2026 window, during a historic gold-miner rally, earned only **$6,853–$9,993 in 2.8 years** (3–6 lots).
- **In plain words:** robust, but mostly a March-2020 crash-buyer that otherwise trades rarely. It is not a
  high-profit strategy.

## 1. The earlier GDX vectors, verified from the repository's records

Every control vector equals the sealed Study 5 records (parity P5), and DEV/VAL/DD equal Study 5 to the cent. None was
ever nominated.

| Control | Provenance and status | W23: net / minute DD | W23 joint N1 share (rep 1) / p90 | W29 (full): net / DD | W29 share / p90 | Final door (new seeds): share / p90 |
|---|---|---|---|---|---|---|
| G-PA `d1-51ea8d4bd6` | B5's GDX `portfolioAware` book (portfolio-aware-d1, 2017–2023) | $142,930 / $34,134 | 21.9% / $46,179 | $197,029 / $34,134 | 18.8% / $49,439 | 15.1% / $49,877 |
| G-TS `d1-68ebf55a55` | portfolio-aware Track S vector | $155,422 / $29,880 | 45.3% / $47,283 | $171,224 / $29,880 | 45.3% / $47,283 | 40.9% / $48,710 |
| G-SR `d1-4f034dc898` | d1-standalone-opportunity-audit representative | $185,534 / $26,433 | 62.5% / $40,701 | $201,483 / $34,427 | 43.0% / $41,223 | 47.4% / $42,233 |
| G-NM1 `d1-ac0aaa704c` | Study 5 near-miss 1 (failed only G2) | $231,760 / $27,658 | 59.4% / $42,153 | $262,020 / $30,616 | 55.5% / $42,153 | 53.9% / $41,517 |
| G-NM2 `d1-a8e252df46` | Study 5 near-miss 2 | $219,894 / $26,374 | 56.2% / $42,320 | $255,319 / $30,834 | 48.4% / $42,320 | 44.5% / $42,431 |
| G-NM3 `d1-143e245fb1` | Study 5 near-miss 3 | $220,462 / $34,239 | 59.4% / $44,679 | $252,772 / $34,239 | 57.0% / $44,679 | 47.9% / $44,740 |
| G-T1P `d1-18da4e7426` | Study 5 Track 1 P (pool-selected; FULL DD $45.6k here) | $153,955 / $45,620 | 0.0% / $54,507 | $179,375 / $45,620 | 0.0% / $54,507 | 0.0% / $55,049 |
| G-T1S `d1-0168b7184b` | Study 5 Track 1 S | $216,362 / $32,704 | 43.8% / $48,024 | $260,954 / $32,704 | 43.0% / $48,024 | 38.0% / $46,621 |
| G-T2C (`d1-080f388562`) | Study 5 Track 2a `T2-s3-coord` GDX book | $157,416 / $30,237 | 10.2% / $52,666 | $188,575 / $30,237 | 10.2% / $52,666 | 8.3% / $49,579 |
| G-T2P (`d1-9ac33a68f4`) | Study 5 Track 2a `T2-s2` GDX book | $130,947 / $44,790 | 5.5% / $50,353 | $136,699 / $44,790 | 5.5% / $50,353 | 7.3% / $50,036 |

The earlier figures are confirmed: the near-misses' centres made $253k–$262k, with neighbourhoods 45–60% below $35k.
**Why they fail:** their joint-N1 breaches (reps 1–5, W29) concentrate in **2022-Q3**: 186–353 breaching neighbours
per control. A second cluster sits in **2026-Q3** (37–150 for the near-misses, G-SR and G-PA). The near-misses use L ≈ 215–228 and short continuation
windows (W 12–14), so they re-enter repeatedly through the April–September 2022 gold-miner decline. A nearby
parameter choice adds or shifts one of those re-entries, and the drawdown passes $35k. The B5 GDX book (G-PA)
is the most fragile, at 15–22%.

## 2. The new search (Phase B; 8-D, the full box)

| Fold | Training | Screen centres | Configurations at rung 1 | Rung-3 feasible | Shortlist training share (selection sets) |
|---|---|---:|---:|---:|---|
| F19 | → 2019-12-31 | 8,192 | 9,216 | 49 / 49 | 100% for all 6 |
| F20 | → 2020-12-31 | 8,192 | 8,448 | 50 / 50 | 100% |
| M | → 2021-12-31 | 8,192 | 9,216 | 48 / 48 | 100% |
| L | → 2023-12-29 | 8,192 (387 plausible) | 8,579 | 40 / 49 | 89.5–100% |

Through 2023, only 387 of 8,192 random GDX vectors were screen-plausible (centre DD < $35k, net > 0, ≥ 5 lots),
against 1,843–3,385 in the shorter folds.
The 2022 bear is the binding constraint.

## 3. Out-of-fold results (Phase D, confirmation sets of 3 × 128 new seeds)

### Fold M (DEV → VAL)

All six fail, and the 2022 bear is the cause.

| Pick | Vector | DEV net | VAL net | 2022 | Minute DD to 2023 (trough) | Pooled share | p90 |
|---|---|---:|---:|---:|---:|---:|---:|
| profit | `d1-03e5936be3` | $166,762 | $21,407 | $890 | $54,725 (2022-09-26) | 0.0% | $58,021 |
| robust | `d1-b2c4d6c69f` | $153,920 | −$11,300 | −$16,629 | $55,794 | 12.0% | $59,524 |
| balanced | `d1-9643c0f453` | $155,806 | −$2,064 | −$5,425 | $61,913 | 4.9% | $65,799 |
| centre | `d1-1d0c9bd9f9` | $203,533 | $2,316 | $2,219 | $51,908 | 0.0% | $56,540 |
| front | `d1-17401a0af8` | $155,635 | $12,913 | −$16,374 | $55,835 | 4.9% | $65,644 |
| front | `d1-934d1e8941` | $180,498 | −$5,432 | −$6,943 | $49,281 | 0.0% | $54,057 |

### Folds F20 and F19

- **F20:** all six fail Q1, Q2, Q3 and Q7. Test 2021–2022: shortlist median centre −$929, neighbourhood median −$3,780.
- **F19:** three of six keep a 100% share but fail Q6 (one lot > 25% of net). Three breach in March 2020 (centre DD
  $46k).

### Selection quality

- PBO is 0.43–0.83 on the procedure folds.
- The training-robust-profit rank of the shortlist correlates −0.89 to +0.09 with its test median.

## 4. Fold L — the retrospective GDX region and the final door

| Role (rank) | Vector | Parameters | FULL net | FULL minute DD | Lots (FX lots) | 2020 share of FULL | Ex-2020 economy | FX net (2024-01 → 2026-10-29) | Final share (n = 384) / p90 | In-box / 0.5r / 1.5r share |
|---|---|---|---:|---:|---|---:|---:|---:|---|---|
| profit (7) | `d1-9def070caf` | X 26.2 Y 0.9 stop 5.8 hold 14 L 38 buf 1.7 P 19.6 W 156 | $168,378 | $18,333 | 22 (6) | 61% | $7,802/yr | $9,993 | 100% / $20,713 | 100% / 100% / 99.2% |
| balanced (10) | `d1-4a64bcdc89` | X 26.7 Y 0.6 stop 6.2 hold 7 L 35 buf 4.5 P 9.7 W 112 | $162,406 | $17,281 | 19 (3) | 72% | $5,529/yr | $6,853 | 100% / $20,759 | 100% / 100% / 100% |
| robust (11) | `d1-36ef0f546d` | X 26.8 Y 0.5 stop 6.2 hold 4 L 35 buf 2.0 P 9.7 W 112 | $166,638 | $17,281 | 20 (4) | 70% | $5,907/yr | $7,442 | 100% / $17,310 | 100% / 100% / 99.2% |

Ex-2020 economy is net minus 2020, per remaining year.

### What makes this region different

- **A short high-lookback window (L 35–38 sessions)** with a deep entry (X 26–27%). D1 arms only after a ≥ 26% drop
  from a **recent** 7-week high, so a slow staircase decline does not re-arm it repeatedly the way L ≈ 215 does.
  - In 2022 it made money: $41.8k / $43.6k / $13.4k.
  - It has **no trades in 2017–2019**, so it would have been infeasible on fold F19's window.
- **Its risk is genuinely flat.**
  - The neighbourhood p90 DD is $17k–$21k under every design: in-box, half and 1.5× radius, and three independent
    final seed families.
  - Its worst drawdown is either the March-2020 single-lot loss ($17,281) or a 2026 sequence ($18,333).
- **Its profit is not broad over time.**
  - 2020 contributes $103k–$117k of $162k–$168k.
  - 2024–2026 contributes $7k–$10k, even though GDX rose about 2.6× ($31.13 on 2024-01-02 → $80.90 on 2026-10-29).
  - The strategy is robust largely because it trades rarely outside crashes. It is not a near-zero trader, with 19–22
    lots and 11–15 episodes, but it is a low-yield one.

**Execution sensitivity on FULL** (`d1-36ef0f546d`): $165k at 10 bps, $160k at 20 bps, $165k at 14% interest,
$162k with 25 bps slippage. The DD stays $17.3k throughout. The economics are insensitive to costs because the
strategy trades rarely.

## 5. Comparison with GDX inside the pools

- **GDX standalone.** The fold-L region uses L 35–38. Its neighbours are robust only when the training window contains
  2022.
- **VG pool (`VGT_CONTROL_AND_ROLE.md`).** The fold-L role holders run a **different** GDX book: X 29.8–30.0 at the box
  ceiling with L 239–247 (#1, #2), or X 29.9 with hold 30 (#5).
- **Translation is weak.** A stable standalone GDX region does not carry over directly into stable funded-pool
  performance: the pool optimizer chose other GDX vectors once GDX shared a slot with VGT. Every fold-M VG candidate
  failed on 2022–2023, like the standalone ones.

## 6. Verdict and practical reading

- **Mechanical:** three GDX standalone Class L research nominations (ranks 7, 10 and 11). They pass every gate on
  2017–2023 in-sample and are not blocked on 2024–2026.
- **Analyst:** **robust, low-yield, crash-dependent.** In-sample selection over 2017–2023 explains why they avoid the
  2022 failure mode. A truly out-of-sample GDX search (fold M) failed completely. Their only out-of-fold evidence is
  2024–2026: no drawdown problem, but only $2.4k–$3.6k of net per year.
- They are not a credible high-profit GDX strategy. If GDX is pursued, the honest step is prospective research-only
  observation. The near-miss region of Study 5 remains fragile.
