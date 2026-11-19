# REPORT — Priority 2 follow-up: the separately optimized VGT D1 and Growth selections, pooled

- **What this is:** research only, not deployed. It is a **bounded retrospective diagnostic on previously examined
  history** (2016-01-04 → 2026-10-30).
- **What this is not:** not a search, not a selection, not fresh validation, and not a new primary of Priority 2.
  Priority 2's frozen primary `C24/informed#1 top` is unchanged.
- **Conventions:**
  - All dollar figures are on **one fixed $100,000 principal budget**, after 5 bps per side, $0 commission and 11%
    simple interest.
  - "DD" is the maximum **minute** drawdown of the marked net; its percentage is DD ÷ $100,000. The ceiling is $35,000.
- **Windows:**
  - Development (D24): 2016-01-04 → 2024-12-31.
  - Validation: the marked change from the 2024-12-31 close in one continuous run through 2026-10-30 (the first
    session is 2025-01-02).
  - Full history: 2016-01-04 → 2026-10-30.
  - November–December 2026 do not exist in the data and are not evaluated.

## 1. Conclusion

**The pair.**
- **Priority 2's two separately optimized single-family selections:**
  - D1 `C24/d1only#1 top`;
  - Growth `C24/gonly/breakout/off#1 top`.
- **The primary case:** pooled unchanged under architecture A (one exclusive $100,000 slot, D1-first). This is case
  **A · D1-first**.
- **The result:**

| Window | Pooled pair (A · D1-first) | Joint primary | D1 primary + #4 · A | D1 primary + 08500a60 · A |
|---|---:|---:|---:|---:|
| Development net / DD | **$145,470.37** / $29,272.36 (29.3%) | $169,722.07 / $23,023.18 (23.0%) | $204,940.21 / $19,534.41 (19.5%) | $191,808.45 / $19,534.41 (19.5%) |
| Validation P&L / DD (reset) | **+$23,858.51** / $33,522.58 (33.5%) | +$22,251.64 / $27,145.72 (27.1%) | +$66,585.12 / $14,950.77 (15.0%) | +$60,551.20 / $16,336.40 (16.3%) |
| Full net / whole-run DD | **$169,328.88** / $34,336.64 (34.3%) | $191,973.71 / $27,941.87 (27.9%) | $271,525.33 / $19,534.41 (19.5%) | $252,359.65 / $19,556.63 (19.6%) |

1. **Did the pooled pair outperform the frozen joint primary? No.**
   - It earned **$24,251.70 less** on development and **$22,644.83 less** over the full history.
   - Its drawdown was larger in every window: +$6,249.18 on development, +$6,376.86 on the reset validation, and
     +$6,394.77 over the whole run.
   - Its validation P&L was **$1,606.87 higher** (+$23,858.51 against +$22,251.64). That is one 22-month window of
     previously examined history, with a deeper drawdown, so it is not a reversal.
   - The mix differs: the pair's D1 booked +$16,056.95 and its Growth +$7,801.56 there, while the joint primary's D1
     booked +$44,612.82 and its Growth −$22,361.18.
   - Its whole-run DD of $34,336.64 is within $663.36 of the $35,000 ceiling.
2. **Did it improve on either fixed incumbent combination? No.**

   | Pair − fixed combination | Development | Validation | Full history |
   |---|---:|---:|---:|
   | D1 primary + #4 · A | −$59,469.84 | −$42,726.61 | −$102,196.45 |
   | D1 primary + 08500a60 · A | −$46,338.08 | −$36,692.69 | −$83,030.77 |

   - Its drawdown is 9.7–18.6 points of the budget deeper in every window.
   - **Against the standalone controls:**
     - It beat D1 primary alone, Growth #4 alone and Growth 08500a60 alone on development: +$10,111.33, +$52,894.66
       and +$29,961.22.
     - It lost to all three on validation: −$17,042.92, −$29,034.24 and −$21,606.42.
     - Over the full history it was $6,931.59 below D1 primary alone, and above #4 alone and 08500a60 alone.
   - **The fixed controls' provenance.** D1 primary and Growth #4 were chosen with later history in view, so their
     strength is descriptive (Priority 2 §1).
3. **Neighbourhoods** (development, Priority 2's instrument, same seeds; §5):
   - **Against the joint primary:**
     - the pair's profit neighbourhood is slightly lower: selection robust net $130,543.83 against $137,174.57;
       confirmation median/p10 of 384 draws $147,724.36 / $111,014.45 against $153,033.64 / $123,759.00;
     - its risk tail is much worse: confirmation p90 DD **$33,768.13** against $25,391.45;
     - 7.0% of its draws breach $35,000 (27 of 384; worst $49,294.36), against 0.5%.
   - **Against the fixed combinations:** the pair's profit neighbourhood is far higher (robust $130.5k against
     $91.3k / $91.9k). The fixed combinations' centres sit on narrow peaks. Its drawdown tail is still worse (p90
     $33.8k against $30.3k / $29.0k; breaches 7.0% against 1.0% / 0.8%).
   - **Priority 2's gates.** The pair would pass Q1–Q6.
4. **What this single matched comparison suggests, and what it cannot establish** (§6):
   - **What it suggests.** Optimizing each family for its own standalone fitness and then pooling produced a weak
     pool.
     - The two books never needed each other's capital before 2020.
     - After 2020, the optimized D1's long, wide-stop holds (12% trailing stop, mean 147 days) occupied the slot
       exactly when the optimized Growth wanted to re-enter its trends.
     - Four Growth trades were refused. One of them was worth +$53,871.32 on its own book (2020-04-14).
     - So the pool earned D1-alone's profit plus a fraction of Growth's (+$42,574.48 on development).
     - The joint search, which optimizes the funded pool directly, found a better pool. Simply pooling the existing
       fixed settings was better again.
   - **What it cannot establish:**
     - **Selection provenance differs.** The joint primary came from Priority 2's *informed* lane, seeded with
       incumbents whose 2025–2026 results were already known. The pair's components came from *independent*
       single-family lanes.
     - **Compute differs.** The joint lanes at C24 used ≈ 400,000 evaluations, against ≈ 140,000 for both
       single-family lanes together.
     - **The evidence is one pair on one history**, with neither procedure tested chronologically.
     - The best-ranked *independent* joint candidate in Priority 2 earned less on development than the pair
       ($123,896.43, robust $119,731.33), though with a lower drawdown tail (p90 $24,392.30). On provenance-matched
       terms the ordering is therefore mixed.
     - This is not evidence that joint optimization is superior as a method (standard §3.4).

**Architecture and priority.** Of the six cases, four are one behavioural class: A and B 100/100, each with both
priorities, all have identical trades.

- **Priority never mattered.** No two decisions ever fell at the same instant.
- **B 100/100 equals A.** Growth's retention partial sales released principal three times. On none of them was a D1
  decision waiting for it.
- **B 50/50 is pure position-size scaling of the two standalone books.** It never refuses: two $50,000 lots always
  fit. Its net is **exactly half** of D1-alone + Growth-alone: $104,189.67 on development and $118,976.58 over the
  full history.
  - Against A, it scales A's 9 development trades by one half (−$72,735.18) and funds A's 4 refused Growth trades at
    half size (+$31,454.49).
  - It holds both families at once in the 2025 decline. Its whole-run DD is **$35,524.07, above the ceiling.**

## 2. The exact pair, the cases and the manifest

The manifest is `COMPARISON_MANIFEST.json`, sha256 `8d01c734027bd936be3fdacb07fcee7c291b682a9c01e597b7e3a5256288e416`.
It was sealed 2026-11-08T21:48:08Z and committed in `63352297` **before any evaluation of the pair**. Its source records
are Priority 2's `FROZEN_SELECTION.json` (sha256 `e677e894…`) and the sealed C24 qualification record (`d04570f6…`). The
pair was never evaluated in any Priority 2 record or job archive: 27 archives were queried read-only, with 0 hits.

| Family | Source label (rank 1 of its lane) | Settings (full vectors in the manifest) | Its own development (sealed) |
|---|---|---|---|
| D1 | `C24/d1only#1 top` | X 23.9%, Y 1.0%, trailing stop 12.0%, maximum hold 25, L 48, buffer 4.2%, P 3.1%, W 96 | $102,895.89, DD $26,172.82; robust $95,162.78 |
| Growth 1.4.0 | `C24/gonly/breakout/off#1 top` | Trend-breakout entry (SMA 90, slope comparison 20, prior high 25); no trend filter, no gate; trailing stop 8.0%; maximum hold OFF; initial stop OFF; retention ON (sell 30%, SMA 170, 1 close below); continuation `breakout` (window 100, buffer 2.25%, 10 bars); 5 bps | $105,483.45, DD $21,694.44; robust $103,820.75 |

- **Identities.** The six cases are `53901cc2ce312090` (A · D1-first), `142517f8cf1bc056`, `b9bdb3623ed864fd`,
  `61a0ef799a824d95`, `00fa701b7c19ba61` and `01195646d52e7f82`.
- **No substitution.** The manifest code refuses the pair if it equals the shipped D1 primary, VG #2's VGT book,
  Growth #4, Growth 08500a60 or the joint primary's family vectors.
- **Behavioural classes after running:**
  - class 1 = A · D1-first, A · Growth-first, B 100/100 · D1-first, B 100/100 · Growth-first (signatures
    `358e103c…` on D24, `35bcb0c3…` on FULL);
  - class 2 = both B 50/50 cases.

## 3. Results on identical conventions (`results/tables/windows.md`, `detail.md`, `annual.md`)

| Configuration | Dev net | Dev DD | 2025–26 P&L | Val. DD (reset) | Full net | Full DD | Lots dev / full (W/L full) |
|---|---:|---:|---:|---:|---:|---:|---|
| **Pair A · D1-first** (= A · G-first = B 100/100 ×2) | **$145,470.37** | $29,272.36 (29.3%) | **$23,858.51** | $33,522.58 (33.5%) | **$169,328.88** | $34,336.64 (34.3%) | 9 / 13 (8/4, 1 open) |
| Pair B 50/50 (both priorities) | $104,189.67 | $21,397.27 (21.4%) | $14,786.91 | $34,723.61 (34.7%) | $118,976.58 | **$35,524.07 (35.5%)** | 13 / 17 (12/4, 1 open) |
| Joint primary `C24/informed#1 top` | $169,722.07 | $23,023.18 (23.0%) | $22,251.64 | $27,145.72 (27.1%) | $191,973.71 | $27,941.87 (27.9%) | 27 / 36 (22/14) |
| Optimized D1 alone | $102,895.89 | $26,172.82 (26.2%) | $16,056.95 | $33,522.58 (33.5%) | $118,952.84 | $34,336.64 (34.3%) | 7 / 10 (6/4) |
| Optimized Growth alone | $105,483.45 | $21,694.44 (21.7%) | $13,516.86 | $35,924.63 (35.9%) | $119,000.32 | $43,280.48 (43.3%) | 6 / 7 (6/0, 1 open) |
| D1 primary + Growth #4 · A | $204,940.21 | $19,534.41 (19.5%) | $66,585.12 | $14,950.77 (15.0%) | $271,525.33 | $19,534.41 (19.5%) | 23 / 28 (20/8) |
| D1 primary + Growth #4 · B 50/50 | $113,967.37 | $10,974.74 (11.0%) | $46,897.09 | $12,188.83 (12.2%) | $160,864.47 | $12,188.83 (12.2%) | 28 / 34 (25/9) |
| D1 primary + Growth 08500a60 · A | $191,808.45 | $19,534.41 (19.5%) | $60,551.20 | $16,336.40 (16.3%) | $252,359.65 | $19,556.63 (19.6%) | 21 / 26 (17/8, 1 open) |
| D1 primary + Growth 08500a60 · B 50/50 | $125,434.10 | $16,798.44 (16.8%) | $43,183.18 | $16,089.26 (16.1%) | $168,617.28 | $16,798.44 (16.8%) | 24 / 30 (20/9, 1 open) |
| D1 primary alone | $135,359.04 | $19,534.41 (19.5%) | $40,901.43 | $14,937.92 (14.9%) | $176,260.47 | $19,534.41 (19.5%) | 17 / 21 (15/6) |
| Growth #4 alone | $92,575.71 | $14,578.10 (14.6%) | $52,892.75 | $9,916.01 (9.9%) | $145,468.46 | $14,578.10 (14.6%) | 11 / 13 (10/3) |
| Growth 08500a60 alone | $115,509.15 | $19,344.80 (19.3%) | $45,464.93 | $17,240.60 (17.2%) | $160,974.09 | $19,344.80 (19.3%) | 7 / 9 (5/3, 1 open) |

Notes on the table:
- Each fixed combination's B 100/100 row equals its A row.
- Every comparator figure is Priority 2's sealed figure, recomputed here and verified equal field for field (§7).

**The primary pair in detail.**

| | Development | Validation (change) | Full history |
|---|---:|---:|---:|
| Net | $145,470.37 | +$23,858.51 | $169,328.88 |
| Realized / unrealized | $126,128.00 / $19,342.37 | +$38,448.55 / −$14,590.04 | $164,576.55 / $4,752.33 |
| Interest / costs | $62,389.59 / $942.05 | $14,643.56 / $441.84 | $77,033.15 / $1,383.89 |
| Lots D1 / Growth (booked) | 7 / 2 ($102,895.89 / $42,574.48) | 3 + crossing / 1 (+$16,056.95 / +$7,801.56) | 10 / 3 ($118,952.84 / $50,376.04) |
| Wins / losses (closed) | 6 / 2 (1 open) | entered 4: 1 / 2 (1 open) | 8 / 4 (1 open) |
| Funding refusals | Growth 4 ("slot occupied" by D1), D1 0 | 0 | Growth 4, D1 0 |
| Time held / both held | 67.8% of sessions / 0 | — | 69.9% / 0 |
| Mean / peak principal; peak market value | $63,211.13 / $100,000; $167,424.52 | — | $64,752.11 / $100,000; $167,424.52 |
| Growth share of principal-days | 50.4% (mixed participation, not token) | — | 46.4% |
| DD and dates | $29,272.36: 2020-02-19 → 2020-03-23, recovered 2020-04-29 | $33,522.58 (reset) | $34,336.64: 2024-12-16 → 2025-04-07, recovered 2025-06-05 |
| Open at the end | D1 lot 2024-08-05 (marked +$19,342.37; closed 2025-03-04 at +$7,254.28) | — | Growth lot 2026-04-27 (+$7,801.56, of which $4,752.33 unrealized) |

**Evidence strength.**
- **Development:** 9 funded lots in nine years, in 5 pool-level episodes. The largest episode (2019-03-14 →
  2020-10-28, three lots) earned $44,436.03, 30.5% of net. The largest single lot, D1's 2020-03-12 crash entry, earned
  +$42,493.66.
- **The two families take turns.** Growth funds 2016–2020 (two long trend lots). D1 funds from its first signal on
  2020-03-12, and all ten of its trades are funded.
- **Annual P&L:**
  - 2021 is $0: the slot sat empty while Growth's refused 2020 trade ran virtually.
  - 2022 is $4,357.73, D1's alone, against −$11,975.28 for Growth alone.

## 4. Why the pair earns what it does: funded trades, displacement and causal removal

### 4.1 Against each family alone (`results/tables/removal.md`, `matched.md`)

| Pair A · D1-first | Development | Validation | Full history |
|---|---:|---:|---:|
| Booked D1 / causal D1 (= net − Growth alone) | $102,895.89 / **$39,986.92** | $16,056.95 / $10,341.65 | $118,952.84 / **$50,328.56** |
| Booked Growth / causal Growth (= net − D1 alone) | $42,574.48 / **$42,574.48** | $7,801.56 / $7,801.56 | $50,376.04 / **$50,376.04** |

- **The identity.** Removing Growth leaves exactly the optimized D1 alone, and removing D1 leaves exactly the
  optimized Growth alone, on both doors (checked: signature and net).
- **What D1 adds.** D1 books $102,895.89 but adds only $39,986.92 causally. Its seven lots (+$102,895.89) displace four
  Growth trades that would have earned $62,908.97 on development (2020-04-14, 2023-03-30, 2023-12-08, 2024-09-26).
- **Growth.** It is never displaced from D1's side: D1 has no refusal. So its booked and causal contributions are
  equal.
- **The refused Growth trades.** Their virtual nets on their own $100,000 book were +$53,871.32 (2020-04-15 →
  2022-01-20), +$3,141.59, +$3,541.40 and +$8,069.97. The last was opened 2024-09-27 and was marked +$2,354.66 at the
  2024 close (`results/tables/refusals.md`). Every refusal is "slot occupied" by a D1 lot.

### 4.2 Against the joint primary (matched trades; Δ = pair − joint primary)

| Window | Δ net | Retimed (overlapping lot, other timing) | Newly admitted by the pair | Displaced (joint lots the pair lacks) |
|---|---:|---:|---:|---:|
| Development | −$24,251.70 | 5 lots, +$64,588.53 (3 D1, 2 Growth) | 4 D1 lots, +$56,044.50 | 22 lots, −$144,884.73 (6 D1 −$91,560.75; 16 Growth −$53,323.98) |
| Full history | −$22,644.83 | 7 lots, +$97,114.41 | 6 D1 lots, +$35,550.24 | 29 lots, −$155,309.48 (7 D1 −$135,825.33; 22 Growth −$19,484.15) |

- **No lot is identical.** The phenotypes differ in both families.
- **What the joint primary does instead.**
  - Its near-VG #2 D1 trades more often (9 development lots).
  - Its breakout Growth with an ATR initial stop takes 18 shorter lots in the gaps between D1 trades.
  - It holds more principal over time (mean $72,526.50 against $63,211.13) and spends more on interest ($71,876.71
    against $62,389.59).
- **What the pair does instead.** Its Growth sits in two multi-year trend lots, and its D1 waits for deep pullbacks
  (X 23.9%).
- **Every decomposition reconciles to the cent** (check = $0.00).

### 4.3 Against the fixed combinations (development)

- **Against D1 primary + #4 · A (Δ −$59,469.84):**
  - **D1:** 14 of the D1 primary's 17 lots have no counterpart in the pair (−$139,519.12). 3 are retimed
    (+$51,011.47), and the pair's D1 adds 4 lots (+$56,044.50).
  - **Growth:** 4 of #4's lots are displaced (−$29,755.08) and 2 retimed (+$2,748.38).
- **Against D1 primary + 08500a60 · A (Δ −$46,338.08):** the D1 component dominates in the same way. Growth adds 1 lot
  (+$2,562.17) and displaces 3 (−$11,992.45).
- **What decides the difference.** The fixed combinations win mainly through **D1 primary's more frequent, shorter
  trades** (17 lots, $135,359.04 alone), which leave the slot free more often. The fixed combinations also refuse
  Growth when D1 holds the slot: D1 primary + 08500a60 refused 08500a60's 2020-04-13 trade, worth +$50,974.41 on its
  own book. But their D1 earns more per unit of occupied time.

### 4.4 Do architecture or priority alter trades? Price path versus position size

| Pair A · D1-first vs | Δ net (dev / full) | Altered lots | Pure scaling (resized, net ∝ principal) | Price-path difference |
|---|---:|---:|---:|---:|
| A · Growth-first | $0.00 / $0.00 | 0 | — | — |
| B 100/100 (either priority) | $0.00 / $0.00 | 0 | — | — |
| B 50/50 (either priority) | +$41,280.70 / +$50,352.30 | 13 / 17 | 9 / 13 lots: +$72,735.18 / +$84,664.44 | 4 Growth lots only B funds: −$31,454.48 / −$34,312.14 |

- **Priority.** No D1 and Growth decisions ever occurred at the same instant, so it cannot matter.
- **B 100/100.** Growth's retention sold 30% three times: 2018-02-06, 2019-08-05 and 2026-06-05. Each repaid $30,000
  of capacity, but no D1 decision arrived while a Growth remainder was held. B 100/100 therefore never had anything
  to admit, and it equals A.
- **B 50/50.** It funds both families at $50,000 every time: no refusal, no downsizing, and 498 development sessions
  with both held. Its result is exactly ½ × (D1 alone + Growth alone).
  - The resized lots are pure position-size scaling: all 9/13 are proportional, as checked.
  - The 4 extra half-size Growth lots are the price-path effect: trades A refused.
  - It lowers development DD to $21,397.27. But holding both books together through the 2024-12-16 → 2025-04-07
    decline gives a **$35,524.07 whole-run DD, above the ceiling.**

### 4.5 Where the drawdowns come from

- **Development** ($29,272.36): Growth's retained 2019 remainder fell from 2020-02-19 until its trend exit on
  2020-03-10. D1 then entered on 2020-03-12 and fell to the 2020-03-23 low.
- **Validation and whole run** ($33,522.58 reset; $34,336.64 whole run): this is D1's. D1 lot 9 (entered 2024-08-05)
  gave back its mark into 2025-03-04, and D1 lot 10 (2025-03-06 → 03-31) lost $7,677.74 into the April 2025 low. It
  matches the optimized D1 alone to the cent.

## 5. Neighbourhoods on matched definitions (`results/tables/neighbourhood.md`, `results/neighbourhood.json`)

**The instrument.**
- Priority 2's development instrument, unchanged (`qualifyMembers`, cutoff label C24, D24 only).
- The families:
  - 2 × 128 selection draws;
  - **3 × 128 = 384 independently seeded confirmation draws** of both families together;
  - 128 D1-only and 128 Growth-only draws;
  - half-radius and 1.5 × radius families;
  - five stresses, toggles and removals.
- Common random numbers with every Priority 2 C24 member.

| Configuration (scope) | Centre net | Sel. robust | Sel. p90 DD | Conf. median / p10 (384) | Conf. p90 DD | Conf. breaches (worst) | Wide p90 DD (breach) |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Pair A · D1-first** (joint) | $145,470.37 | $130,543.83 | $33,624.43 | $147,724.36 / $111,014.45 | **$33,768.13** | **7.0%** (27; $49,294.36) | $44,981.10 (23.4%) |
| Joint primary (joint) | $169,722.07 | $137,174.57 | $26,007.43 | $153,033.64 / $123,759.00 | $25,391.45 | 0.5% (2; $40,665.23) | $31,221.17 (5.5%) |
| D1 primary + #4 · A (joint) | $204,940.21 | $91,343.29 | $30,669.71 | $107,095.26 / $66,358.85 | $30,311.85 | 1.0% (4; $37,173.40) | $32,227.18 (3.9%) |
| D1 primary + 08500a60 · A (joint) | $191,808.45 | $91,907.18 | $30,271.27 | $110,812.91 / $73,214.35 | $29,029.77 | 0.8% (3; $37,372.92) | $33,015.77 (3.9%) |
| Optimized D1 alone (D1 only) | $102,895.89 | $95,162.78 | $30,985.05 | $103,376.97 / $86,135.56 | $29,970.18 | 5.7% (22; $45,075.64) | $37,972.65 (10.9%) |
| Optimized Growth alone (Growth only) | $105,483.45 | $103,820.75 | $26,302.16 | $111,215.78 / $97,772.20 | $26,245.58 | 1.3% (5; $46,175.99) | $35,144.93 (10.2%) |

**The pair's neighbourhood in detail:**
- 384 of 384 draws are unique and every one funds both families. 162 clip at least one coordinate: P = 3.1% sits
  near its 3.0% box floor. No draw reproduces the centre's ledger.
- Its three confirmation reps agree closely: medians $147,164–$148,011, p10 $110,100–$111,988, p90 DD
  $33,704–$33,930.
- **One-family scopes:**
  - D1-only draws: median $145,807.41, p10 $107,208.81, p90 DD $32,056.54;
  - Growth-only draws: $147,589.87 / $145,095.43 / $33,266.98.
  - So most of the profit spread comes from the D1 parameters, and the drawdown tail from both.
- **Stresses (centre):**

  | Stress | Net | DD |
  |---|---:|---:|
  | 10 bps per side | $144,424.96 | $29,348.15 |
  | 20 bps per side | $147,492.75 | $32,949.92 |
  | 14% interest | $133,130.95 | $32,888.15 |
  | +25 bps stop slippage | $144,010.97 | — |
  | Next-open stops | $145,598.72 | — |

  - At 20 bps the lots are the same. Growth's cost-inclusive trailing stop exits its trend lot later and books
    $46,909.14 instead of $42,574.48: a path effect, not a cost benefit.
- **Toggles:**
  - **Retention OFF:** $109,047.59 with DD **$62,132.23**. Growth's partial-sale rule is what holds this pool's risk
    in place.
  - Architecture B 100/100, the flipped priority and continuation OFF change nothing.
- **Priority 2's gates Q1–Q6:** all would pass. This is reported, not used.

**Reading.** On matched definitions the pair is a *broad profit plateau with a heavy drawdown tail*.
- **Against the joint primary:** about the same profit neighbourhood (robust −4.8%), but a confirmation p90 DD
  $8,376.68 higher, 13.5× the breach share (27 against 2 of 384), and a wide-radius p90 above the ceiling.
- **Against the fixed combinations:** much more neighbourhood profit, but more tail risk.
- **Hypothetically, under Priority 2's frozen banded order** (an illustration of that rule, not a selection), the pair's
  selection robust net falls inside the joint primary's 5% band. Its higher p90 DD would have ranked it below the joint
  primary.

## 6. Method comparison context (standard §3.4)

| | The pair (independent-then-pooled) | The joint primary (joint, informed) |
|---|---|---|
| How it was found | Two single-family lanes of Priority 2 C24: D1 alone (1 cell) and Growth alone (4 cells); each optimized its own family with the other disabled; never searched as a pair | The informed joint lane: 30 seeds from incumbents (D1 primary / VG #2 VGT × 08500a60, #4 and the stable study's ranks 1–3) × architectures, then islands and refinement |
| Distinct centre proposals at C24 | D1 alone 4,412; Growth alone 8,418 (its breakout/off cell 2,254) | informed 2,802 (alongside the independent joint lanes' 33,886) |
| Evaluations at C24 (≈, from the sealed lane counts) | D1 alone ≈ 46,900; Growth alone ≈ 92,900 | informed ≈ 50,500; independent joint ≈ 349,300 |
| Earlier-cutoff (chronological) test | none (single-family lanes ran at C24 only) | none for the informed lane; the independent joint procedure was *chronologically unsupported* |
| Provenance | independent (no incumbent seeds) | informed (seeds whose 2025–2026 outcomes were known) |

Notes:
- **The evaluation estimate.** Evaluations are screen + 17 × rung-1 centres + 64 × rung-2 + 128 × rung-3 + 17 ×
  refinement moves, from `research/vgt-d1-growth-joint/results/search/C24/search.json`. These estimates sum to 539,470,
  within 0.1% of the record's 539,967 evaluations (537,223 fresh + 2,744 archive hits).
- **The independent provenance-matched reference.** Priority 2's best-ranked *independent* joint candidate
  (`C24/indep/A/breakout/off#1 top`, rank 2 overall) earned $123,896.43 on development (DD $22,960.16), with robust net
  $119,731.33 and selection p90 $24,392.30. That is less profit than the pair, with a lighter tail. It was never
  validated, and is not validated here.

**What can and cannot be concluded.**
- **What can be concluded.** In this one comparison, pooling two independently optimized books gave less development
  and full-history profit than the informed joint primary, and much less than pooling the existing fixed settings, with
  more drawdown than either. The cause is visible in the ledger: occupancy conflicts that neither single-family
  optimization could see.
- **Why it is not a method verdict:**
  - the arms differ in compute (≈ 140k against ≈ 400k evaluations at C24);
  - they differ in provenance (independent against informed with known outcomes);
  - neither has chronological support;
  - the fixed settings that beat both were chosen with later history in view;
  - all windows were examined before;
  - one favourable or unfavourable historical pair cannot rank methods.
- **Not tested here:**
  - staged initialization followed by joint refinement;
  - a matched-budget, provenance-matched repetition across cutoffs.

## 7. Verification, integrity and disclosures

**Reuse was verified, not assumed.**
- **The comparators.** Every comparator's development record (against Priority 2's sealed C24 evidence) and
  full-history record (against its sealed validation rows) was recomputed with the frozen evaluator. All **24 of 24**
  matched field for field.
- **The instrument.** It reproduced the joint primary's sealed C24 evidence exactly, in all 21 compared fields
  (centre, selection, confirmation and its reps, one-family scopes, small, wide, stresses, toggles, removals, gates).
- **The engine.** Priority 2's evaluation digest `c936f691…` and closure digest `65de4cc4…` equal its freeze. Its sealed
  parity (341/341) therefore applies (AD2).

**Reconciliations (unrounded):**
- **Continuity:** the D24 net equals FULL's marked net at the 2024-12-31 close for all 18 subjects (residual 0).
- **Validation split:** Δrealized + Δunrealized = the validation P&L (residual ≤ 2.2 × 10⁻¹¹).
- **Full split:** realized + unrealized = net.
- **Matched trades:** every decomposition reconciles to the cent.
- **Identity:** each single-family removal equals the corresponding optimized family alone.

**Integrity.**
- **Seals.** `COMPARISON_MANIFEST.json` (`8d01c734…`), `results/comparison.json` (`66bb9912…`) and
  `results/neighbourhood.json` (`8b77e6f5…`) are sealed read-only, and `npm run vgt-pair -- verify` recomputes them
  (all ok).
- **Priority 2 untouched.** Its 19 sealed study records still verify against its `seals.jsonl`, and its folders have no
  change.
- **Doors.** Every door opening is logged in `results/doors.jsonl`. FULL opened only after the manifest commit.
- **The pilot** (S2, development only):
  - a worker SIGKILL failed the job in 18 s (exit 1, nothing hung), and the resume finished from the archive;
  - a SIGTERM stopped the coordinator gracefully (exit 75), and the resume finished;
  - both resumed records equal each other and the sealed record.
- **Amendments:** E1, a label correction only. The sealed neighbourhood record's descriptive `scope` text says
  "joint" for the three standalone controls. Their Priority 2 scope is single-family. The tables use the correct
  label; no number changes.
- **Tests:**
  - this study's 6 tests and the preflight's 14 tests pass;
  - `tsc --noEmit` is clean;
  - ESLint reports 0 problems on the new code;
  - the full `npm test` result is in `results/logs/npm-test.log` and summarized in `RESEARCH_RECOVERY.md`.

**Disclosures.**
- **Previously examined history.** All windows were examined before. The pair's components' validation results
  (+$16,056.95; +$13,516.86 with a $35,924.63 breach) were known from Priority 2. The pooled pair's were not.
- **Seed provenance.** The neighbourhood seeds are Priority 2's C24 seeds. Its confirmation seeds were also the
  components' own confirmation (qualification-only) seeds in their single-family scopes. Ranking used other seeds.
- **Engine conventions.** The comparison uses Priority 2's harmonized conventions (start 2016-01-04). Study 8's native
  arming (2017-06-15) is not applied. For this pair it would change nothing: D1's first signal is 2020-03-12.

## 8. Resources observed (bounded task; no tuning benchmark)

| Stage | Unit | Wall / CPU | Peak memory | Notes |
|---|---|---|---|---|
| Comparison | `vgtpair-compare` | 5.6 s / 7.1 s | 712 MB | in-process; 72 pooled runs on D24 and FULL plus 36 removals |
| Neighbourhood | `vgtpair-nbhd` | 33.8 s / 3 min 52 s (≈ 6.9 cores) | 3.19 GiB cgroup | 8 workers; 2,328 fresh evaluations; worker RSS ≤ 0.43 GiB; ArrayBuffers ≤ 28 MiB |
| Pilot (4 units) | `vgtpair-pilot-*` | 18–29 s each | ≤ 3.18 GiB | the interruption tests |

- **Containment.** Every unit ran inside `vgtpair.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0), one at a time.
- **Memory events.** There were no memory.high, memory.max or OOM events.
- **Host headroom.** About 53 GiB of the host's RAM stayed available. This bounded work did not need more, and nothing
  was allocated just to use it.

## 9. Reproduce

Run from the repository root (`RUN_COMMANDS.md` lists every command with its unit and output):

```
npm run research-preflight -- --study research/vgt-d1-growth-separate-pooled
npm run vgt-pair -- manifest --dry-run                       # evaluates nothing; the sealed manifest is committed
bash research/vgt-d1-growth-separate-pooled/chains/pilot.sh  # interruption tests (pilot jobs, D24 only)
npm run vgt-pair -- launch --unit vgtpair-compare --wait -- compare
npm run vgt-pair -- launch --unit vgtpair-nbhd --wait -- neighbourhood --workers 8
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vgt-d1-growth-separate-pooled/tables.ts
npm run vgt-pair -- verify
```

The sealed stages refuse a rerun. Rerunning them in a copy of the checkout, with their seals removed, reproduces the
records: every stage is deterministic.

## 10. Decision points before Priority 3 (for review; nothing started)

1. **The pool-building baseline.**
   - Treat "pool the existing fixed incumbents" as the benchmark that a Priority 3 method must beat.
   - The pair confirms what Priority 2 found: separately optimized books pooled are weaker than the incumbents pooled,
     because occupancy conflicts decide pooled profit.
2. **The staged approach for VGT + GDX** (`docs/research/ROADMAP.md`):
   - reuse VG #2 Balanced (`s8-vg-balanced`, `S8-VG-F24-3`, both D1 books together) as the D1 incumbent;
   - optimize a VGT + GDX Growth pool;
   - evaluate in one shared $100,000 pool;
   - then run the four-component joint refinement plus an independent joint search.

   Approve or modify this, and the budgets for matched-provenance arms.
3. **Selectability of incumbents.** Under standard 1.0.0 §3.2, incumbents and fixed combinations enter the selectable
   set or a frozen no-improvement fallback. Confirm which incumbents count for Priority 3.
4. **The risk tail.** Decide whether a confirmation-breach share above a threshold (the pair has 7.0%), or a wide-radius
   p90 above the ceiling, should become a reported warning or a gate. A change to the standard needs a versioned
   amendment.
5. **The standard.** Review `docs/research/OPTIMIZATION_STANDARD.md` 1.0.0. Agreed changes become 1.0.1 / 1.1.0 / 2.0.0
   with a change-log entry and a registry update, and Priority 3 pins the version it adopts.
