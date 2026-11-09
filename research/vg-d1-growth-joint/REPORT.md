# REPORT — Priority 3: D1 + Growth for VGT and GDX in one shared $100,000 pool

Research only, not deployed. Development 2016-01-04 → 2024-12-31; validation 2025-01-02 → 2026-10-30 (the common
complete endpoint of VGT and GDX), which is **validation on previously examined history, not an untouched holdout**.
November–December 2026 do not exist and were not evaluated. All figures are on **one fixed $100,000 principal budget**,
no compounding, after 5 bps per executed side, $0 commission and 11% simple interest on outstanding principal (365-day
basis). "DD" is the maximum **minute** drawdown of the marked net; its percentage is DD ÷ $100,000 (not peak equity).
The ceiling is **$35,000**. Historical compliance with it is not a guarantee of future drawdown.

The four components — **D1·GDX, D1·VGT, Growth·GDX, Growth·VGT** — each have their own parameter vector and trade
through **architecture A**: one exclusive funded slot. The virtual-book semantics the user preserved through Priority 3
apply throughout: a refused entry still starts the component's virtual trade; funding never feeds back into a book;
freed capital never revives a refusal (§2).

## 1. Conclusion

- **The frozen primary failed validation.** The primary is the actual-profit role of the informed selectable set,
  `C24/informed#1 profit` (`575545f4d6438577`), from the four-component joint refinement (arm C).
  - Development: **$338,642.84**, DD **$20,393.61** (20.4%). Of 384 independent neighbours: median $256,435.91, p10
    $220,489.09, p90 DD $27,369.13; 2.6% breached $35,000 (10 draws; mean excess $42,916.79; worst $103,278.13).
  - Validation: **−$32,190.25**, DD **$57,568.06** (57.6%), which is also its whole-run DD. It fails V1, V2 and V3.
  - Validation-door neighbours (report-only): median −$32,086.08; 5.5% positive; all 128 exceed $35,000 of DD.
  - Full history: $306,452.60, of which −$40,492.79 is unrealized (an open Growth·GDX lot).
  - Why it failed: a Growth·VGT lot held 2024-09-27 → 2026-02-06 occupied the slot through 2025, so the April 2025
    D1·VGT trade that the other systems earned about $46,000 on never got capital. A Growth·GDX lot opened 2026-02-27
    was open at −$40,492.79 at the end.
- **The independent joint primary passed validation, but its procedure failed chronologically.**
  `C24/indep/GDX-rise_VGT-rise#1 profit` (`86d25530b9e9141d`, arm D):
  - development $245,220.78 / $17,280.74;
  - validation **+$76,802.05**, DD $15,620.02;
  - full history $322,022.83, DD $17,280.74;
  - V1–V3 pass.

  But the same procedure, rerun at 2019, 2021 and 2023, is **chronologically unsupported**: −$61,544.61 over 2020–2024
  with a $102,257.90 sequential minute DD. Its Growth·GDX component was never funded.
- **The unchanged expanded combinations failed the development gates, yet did best afterwards (descriptive).**
  VG #2 + Growth #4 + Appendix A failed Q3 on development: confirmation p90 DD $36,277.63, 13.3% of neighbours breached.
  Afterwards it earned +$139,887.46 in validation and $450,270.82 over the full history, with DD $21,536.85. Every one
  of its components was chosen with later history in view, so this is description, not evidence of a method.
- **VG #2 Balanced alone (harmonized):** development $268,487.02 / $20,801.07, validation +$74,688.80, full
  $343,175.82 / $21,303.61. Native, it reproduces Study 8's figures to the cent: development $260,223.13 / $17,280.74;
  full history $334,911.93 / $21,303.61.
- **Every known target reproduced exactly at the final stage**, and none was used to steer anything:
  - Appendix A's GDX Growth: $141,157.37 / $17,709.96 / 19 closed trades (17/2), flat. The transcribed vector is
    therefore verified.
  - VG #2's native full history.
  - Priority 2's VGT-only rows.

### The six questions

1. **Did a combined system improve on VG #2 under the frozen risk and qualification rules? No, not credibly.**
   - On development the frozen primary qualified and beat VG #2: +$70,155.82 over VG #2's harmonized $268,487.02. VG #2
     alone cannot satisfy the combined-product gate (Q6).
   - The primary then lost $32,190.25 in validation against VG #2's +$74,688.80, broke the ceiling, and finished the
     full history $36,723.22 below VG #2.
   - The independent primary passed validation but stayed below VG #2 on development (−$23,266.24) and on full history
     (−$21,152.99).
2. **Did the newly optimized combinations beat the unchanged combined benchmarks? On development, yes, by the frozen
   rules; afterwards, no.**
   - On development the refined primary earned $28,259.48 more than VG #2 + #4 + Appendix A with a far lighter tail
     (confirmation p90 DD $27,369 against $36,278). Both unchanged combinations failed Q3, so the frozen rule could
     not select them.
   - Out of sample the order reversed: validation +$139,887.46 and +$117,030.20 for the unchanged pair, against
     −$32,190.25 (primary), +$76,802.05 (independent) and −$6,699.40 (staged).
3. **Did joint refinement improve on the same staged settings left unchanged? On development, at a tail cost; out of
   sample, no.**
   - Against the best staged combination (VG #2 + Growth pair `GDX-breakout_VGT-rise#3`, unchanged), refinement added
     **+$89,068.67** of development net and +$23,619.84 of selection robust net, with a similar p90 DD ($26,492 against
     $26,833).
   - Its tail worsened: the worst confirmation draw went from $50,488 to $103,278, and wide-radius breaches from 16.4%
     to 21.1%.
   - Its Growth·VGT holds became much longer (mean 474.5 days, maximum 854).
   - Validation: −$32,190.25 against −$6,699.40; both broke the ceiling.
   - Against its own unchanged seeds (the two unchanged four-component controls): +$28,259.48 on development, −$172,077.71
     in validation.
4. **Did both families and both ETFs contribute? In the primary yes, but Growth thinly; GDX Growth contributed only
   where an incumbent supplied it.**
   - **The primary on development:**
     - D1·GDX: 29 lots, booked $205,524.95, causal $165,116.29;
     - D1·VGT: 7 lots, $71,047.92, causal $101,385.66;
     - Growth·GDX: 1 lot, $17,183.16, causal $32,080.62;
     - Growth·VGT: 2 lots plus 1 partial exit, $44,886.81, causal $28,818.47.
     - Removing the whole Growth family costs $46,001.63 and removing D1 costs $268,114.37. All four are funded, none
       token, but Growth funds three episodes in nine years.
   - **The searched systems rarely funded Growth·GDX:** it was unfunded in 11 of 12 arm-B Growth pairs and in 11 of 16
     arm-D C24 shortlist members, the independent primary included.
   - **Only Appendix A's GDX Growth was funded substantively:** 9–10 lots and about $48,000–$52,000 booked in the
     unchanged combinations.
   - **Displacement in the primary (development):**
     - D1·VGT was refused 7 times while D1·GDX held the slot; those virtual trades earned $51,388 on their own books.
     - D1·GDX was refused 14 times while Growth·VGT held it (+$16,068 virtual).
     - Growth·VGT was refused once while Growth·GDX held (+$25,667 virtual, 117 idle sessions afterwards) and once while
       D1·GDX held (+$6,204, 227 idle sessions).
     - In validation, Growth·VGT's 16-month hold displaced D1's best 2025 trade.
   - **In VG #2 + #4 + Appendix A,** removing Growth·VGT *raises* net by $15,952.93: its causal contribution is
     negative.
5. **Did the independent selection procedure work chronologically? No.**
   - Fold primaries C19 → C21 → C23 earned −$29,722.57 (2020–21, slice DD $48,287), −$33,880.48 (2022–23, slice DD
     $69,054) and +$2,258.44 (2024). Sequential net −$61,544.61, sequential DD $102,257.90.
   - Every role's sequence also lost money and breached the ceiling.
   - This is separate from neighbourhood stability: the C24 independent primary's 384 draws had p10 $123,831 and p90
     DD $31,727. Its validation pass is one window on previously examined history, not a chronological verdict.
6. **What merits further investigation, and what remains unsupported?**
   - **Merits investigation:**
     - VG #2 combined with Appendix A's GDX Growth (and Growth #4 on VGT), but through its *risk tail*, which failed
       Q3: GDX-scope neighbours breached in 18.8% of draws, and the initial-stop toggle drove DD to $52,199.
     - **GDX alone (Priority 4)**, since the searches found little use for a GDX Growth book next to D1·GDX.
     - **Funding behaviour (Priority 5)**, since the failures here come from slot occupancy by long virtual-tracking
       Growth holds.
   - **Unsupported:**
     - that four-component joint optimization improves on VG #2 or on the unchanged combinations out of sample;
     - that the independent procedure is chronologically reliable;
     - any method-superiority claim (one history, unmatched arm budgets);
     - any bound on future drawdown.

## 2. What was built

### 2.1 The four-component pooled engine (`src/vg-d1-growth-joint/`, PROTOCOL.md §6)

- **Four canonical virtual books**, each its family's standalone engine on its own symbol: D1·GDX and D1·VGT (the
  frozen `ShadowBook` under shadow semantics), and Growth·GDX and Growth·VGT (`runRiseTrading`'s body on a cached
  dataset).
- **One merged minute timeline.** Each session's VGT and GDX minute bars are merged by time. At each instant the order
  is: decisions; exits and partial sales of the printing symbol(s); fills; the mark. A lot is re-marked only when its
  own symbol prints, which is the N-book engine's fixed-mode marking.
- **One exclusive $100,000 slot.**
  - A decision is funded only at its own instant, before any trade stamped then, iff nothing is open or reserved.
  - A retained Growth remainder keeps the slot.
  - At a same-instant tie the configuration's family priority comes first, then GDX before VGT.
- **The preserved virtual-book semantics** (the user's decision through Priorities 3 and 4; alternatives are Priority
  5's question):
  - A refused entry still starts the component's virtual trade, and the component waits for that virtual exit before it
    decides again.
  - Freed capital never revives the refusal.
  - A test checks this explicitly: an unfunded virtual trade persisting after capital is freed is never funded later,
    and the pool stays idle until that component's next own decision.
  - Growth's native eligibility (searched ON or OFF) is a genuine later decision of the virtual book, never a preserved
    refusal. D1's delayed eligibility stays OFF.

### 2.2 Parity and tests (`results/parity/parity.json`, sealed for the frozen code: 495 checks, 0 failed)

- **D1** (136 checks): every D1 book alone and two-book D1 pools against Study 8's `runNAllocator`, including VG #2's
  pair under both arming dates. Every trade, lot, refusal, net and drawdown is compared, with its times.
- **Growth** (132): each Growth control and 120 random configurations on both symbols against `runRiseTrading`.
- **Priority 2's frozen engine** (80): one-symbol D1 + Growth pools on VGT and on GDX, both priorities.
- **An independent reference** (96) for four-component, Growth-pair and cross-symbol pools, where no canonical engine
  exists:
  - the funded set must match exactly;
  - money and drawdowns must agree within $1e-6;
  - plus the cash, one-slot, principal and disabled-component identities.
- **Causality** (36): runs on D19 and D21 equal their D24 runs through the shorter door.
- **Targets** (15, development):
  - VG #2 native = Study 8's sealed F24 centre: $260,223.13 / $17,280.74 / 36 lots / 14 refusals.
  - Priority 2's sealed VGT figures to the cent: D1 primary + #4 · A $204,940.21 / $19,534.41 / 23 lots; + 08500a60
    · A $191,808.45 / $19,534.41 / 21 lots.
  - #4 $92,575.71 / $14,578.10; 08500a60 $115,509.15 / $19,344.80; D1 primary $135,359.04 / $19,534.41.
- **Tests:** the study's 20 tests (`tests/pool.test.ts` 11, `tests/space.test.ts` 9). They cover:
  - cross-symbol calendars, merged minute order, decisions before trades, next-session reservations;
  - same-instant priority, the persistent unfunded virtual trade, the one slot and the cash identity;
  - interest, partial exits holding the slot, gap exits, disabled components;
  - year boundaries, period drawdowns, open remainders;
  - identity, encoding, screens, neighbourhoods and scopes, moves;
  - the actual-profit order and tie-break, roles, the fallback and participation labels.

### 2.3 Provenance and conventions

- **The control manifest** (`CONTROL_MANIFEST.json`, sha256 `0f40efd7…aa1`) was sealed and committed in `1c867708`
  before any combined control was evaluated. Its vectors stayed immutable.
- **Appendix A** had no backend archive:
  - no repository record exists, the run folder R-000040 is absent and the trash is empty;
  - neither the preview cache nor the Strategy Lab database was opened;
  - its transcription was mapped to Growth 1.4.0 with every value explicit (identity `07cac3329fc7a520`);
  - it reproduced its full-history target exactly, at the final stage only.
- **The study convention (harmonized)** is funding from 2016-01-04, with D1 arming once its L-session reference high
  exists (Priority 2's convention).
- **The native → harmonized bridge for VG #2:**
  - development $260,223.13 / $17,280.74 / 36 lots → $268,487.02 / $20,801.07 / 45 lots (its GDX book's first entry
    moves to 2016-12-19);
  - full history $334,911.93 → $343,175.82, DD $21,303.61 either way.
- **Data.** `data/VGT/data.csv` `2ee06310…412e` and `data/GDX/data.csv` `77dba9b2…5049`: both 2,723 sessions on one
  calendar, complete through 2026-10-30. No GDX split; VGT's 8:1 split (2026-04-21) is forward-adjusted on FULL.
- **Doors.** Byte-prefix doors D19, D21, D23 and D24 per symbol; FULL opened only under the committed frozen selection
  (`results/doors.jsonl`).

## 3. Results on identical conventions (`results/tables/windows.md`, `validation.md`)

| Configuration | Group | Dev net | Dev DD | Val P&L | Val DD (reset) | Full net | Full DD | Full lots (W/L; partial exits) |
|---|---|---:|---:|---:|---:|---:|---:|---|
| **Final primary** `C24/informed#1 profit` | refined (C), final actual-profit | **$338,642.84** | $20,393.61 (20.4%) | **−$32,190.25** | **$57,568.06 (57.6%)** | $306,452.60 | **$57,568.06 (57.6%)** | 40 (31/8; 2) |
| `C24/informed#2 robust` | final robust-profit | $300,901.21 | $20,653.79 (20.7%) | $37,388.54 | $40,802.42 (40.8%) | $338,289.75 | $40,802.42 (40.8%) | 41 (30/10; 5) |
| `C24/informed#3 balanced` | final balanced | $296,844.18 | $20,653.79 (20.7%) | $36,113.52 | $40,802.42 (40.8%) | $332,957.70 | $40,802.42 (40.8%) | 40 (28/11; 4) |
| **Independent primary** `C24/indep/GDX-rise_VGT-rise#1 profit` | independent (D) actual-profit | $245,220.78 | $17,280.74 (17.3%) | **$76,802.05** | $15,620.02 (15.6%) | $322,022.83 | $17,280.74 (17.3%) | 44 (34/10; 0) |
| `C24/indep/GDX-breakout_VGT-breakout#2 robust` | independent robust-profit | $197,801.34 | $19,835.18 (19.8%) | $8,328.84 | $60,768.31 (60.8%) | $206,130.18 | $60,768.31 (60.8%) | 18 (15/2; 4) |
| `C24/indep/GDX-rise_VGT-breakout#3 balanced` | independent balanced | $163,851.00 | $17,280.74 (17.3%) | $2,962.67 | $20,752.62 (20.8%) | $166,813.67 | $20,752.62 (20.8%) | 17 (14/2; 10) |
| `C24/indep/GDX-rise_VGT-rise#3 balanced` | independent and final lower-drawdown | $154,673.75 | $17,280.74 (17.3%) | $7,290.85 | $19,171.94 (19.2%) | $161,964.60 | $19,171.94 (19.2%) | 26 (20/6; 1) |
| **Staged as-is** VG #2 + `gpair/GDX-breakout_VGT-rise#3` | staged (B + VG #2), every role | $249,574.17 | $17,393.58 (17.4%) | −$6,699.40 | $39,477.36 (39.5%) | $242,874.77 | $40,108.09 (40.1%) | 34 (24/9; 5) |
| Growth pair `gpair/GDX-rise_VGT-rise#1 profit` | arm B actual- and robust-profit | $126,648.83 | $32,521.34 (32.5%) | −$13,049.74 | $15,119.55 (15.1%) | $113,599.09 | $34,735.96 (34.7%) | 12 (4/7; 4) |
| Growth pair `gpair/GDX-rise_VGT-breakout#2 robust` | arm B balanced | $119,324.51 | $22,300.90 (22.3%) | $11,200.97 | $13,089.66 (13.1%) | $130,525.48 | $22,300.90 (22.3%) | 8 (6/1; 8) |
| Growth pair `gpair/GDX-breakout_VGT-rise#3 profit order` | arm B lower-drawdown | $82,849.55 | $17,580.29 (17.6%) | −$16,766.79 | $33,262.91 (33.3%) | $66,082.76 | $40,840.50 (40.8%) | 11 (7/3; 6) |
| **VG #2 Balanced** (D1·GDX + D1·VGT) | D1-only control | $268,487.02 | $20,801.07 (20.8%) | $74,688.80 | $21,303.61 (21.3%) | $343,175.82 | $21,303.61 (21.3%) | 57 (36/20; 0) |
| Growth pair: #4 (VGT) + Appendix A (GDX) | Growth-only control | $79,459.91 | $21,972.42 (22.0%) | $93,698.88 | $15,910.70 (15.9%) | $173,158.78 | $21,972.42 (22.0%) | 26 (21/5; 0) |
| Growth pair: 08500a60 (VGT) + Appendix A (GDX) | Growth-only control | $68,925.26 | $25,102.33 (25.1%) | $60,994.43 | $17,240.60 (17.2%) | $129,919.69 | $25,102.33 (25.1%) | 17 (12/4; 4) |
| Appendix A GDX Growth alone | Growth-only control | $53,816.50 | $17,709.96 (17.7%) | $87,340.87 | $17,709.24 (17.7%) | $141,157.37 | $17,709.96 (17.7%) | 19 (17/2; 0) |
| **Unchanged:** VG #2 + Growth #4 + Appendix A | unchanged four-component (fails Q3) | $310,383.36 | $20,801.07 (20.8%) | **$139,887.46** | $21,536.85 (21.5%) | **$450,270.82** | $21,536.85 (21.5%) | 71 (50/20; 0) |
| **Unchanged:** VG #2 + Growth 08500a60 + Appendix A | unchanged four-component (fails Q3) | $291,868.34 | $20,801.07 (20.8%) | $117,030.20 | $18,972.89 (19.0%) | $408,898.55 | $20,801.07 (20.8%) | 65 (45/19; 2) |
| VG #2 + Growth #4 (VGT) | three-component control | $302,785.91 | $17,332.09 (17.3%) | $99,081.34 | $21,536.85 (21.5%) | $401,867.24 | $21,536.85 (21.5%) | 49 (35/13; 0) |
| VG #2 + Growth 08500a60 (VGT) | three-component control | $263,681.27 | $18,119.12 (18.1%) | $76,224.08 | $16,510.18 (16.5%) | $339,905.35 | $19,821.14 (19.8%) | 39 (27/11; 3) |
| VGT only: D1 primary + Growth #4 · A | **smaller-universe** comparison (Priority 2) | $204,940.21 | $19,534.41 (19.5%) | $66,585.12 | $14,950.77 (15.0%) | $271,525.33 | $19,534.41 (19.5%) | 28 (20/8; 0) |
| VGT only: D1 primary + Growth 08500a60 · A | **smaller-universe** comparison (Priority 2) | $191,808.45 | $19,534.41 (19.5%) | $60,551.20 | $16,336.40 (16.3%) | $252,359.65 | $19,556.63 (19.6%) | 26 (17/8; 3) |

- **Where the remaining columns are.** `results/tables/windows.md` adds the realized/unrealized split, interest and
  execution costs for every row. `validation.md` adds 2025 and 2026 separately, the drawdown dates and recovery, lots
  after the boundary by component, and annual P&L. Full effective settings and identities are in `settings.md`; holding
  periods and exposure by component in `diagnostics.md`.
- **Open remainders at the end:**
  - the primary: one Growth·GDX lot, −$40,492.79;
  - the independent robust role: the same lot;
  - VG #2 and its combinations with #4: one D1·GDX lot, −$5,564.76;
  - 08500a60's combinations: its VGT lot, +$9,376.22.
- **Partial exits** are counted apart from full lots in every row.

**The frozen primary's exact settings** (identity `575545f4d6438577`, D1-first):

- **D1·GDX:** X 27.6%, Y 0.1%, trailing stop 5.3%, hold 12, L 249, buffer 2.9%, P 15.4%, W 30.
- **D1·VGT:** X 23.5%, Y 0.9%, stop 7.4%, hold 15, L 72, buffer 4.7%, P 9.3%, W 65.
- Both D1 books sit next to VG #2's pair. They differ in GDX's stop, L, P and W, and in VGT's L, buffer, P and W.
- **Growth·GDX:**
  - trend breakout (SMA 95, slope comparison 62, prior high 62);
  - no trend filter;
  - recovery gate on (lookback 60, dip 8.7%, retracement 86.8%, confirmation 10);
  - trailing stop 12.5%, maximum hold off, no initial stop, no retention;
  - continuation `classic_d1` (window 105, pullback 11.5%, rebound 2.6%).
- **Growth·VGT:**
  - trend breakout (SMA 100, slope comparison 20, prior high 5);
  - no trend filter;
  - recovery gate on (65, 8.5%, 65%, 5);
  - trailing stop 7.5%, maximum hold off, no initial stop;
  - retention on (sell 52%, SMA 137, 3 closes below);
  - continuation `ma_cross` (window 100, SMA 105, rising 15, slope 1%, margin 1.5%).

## 4. Why the systems earn what they do (development, `results/tables/participation.md`, `diagnostics.md`)

### 4.1 Booked versus causal, by family and symbol

| Development | Primary (refined) | Independent primary | Staged | Unchanged VG #2 + #4 + App. A | VG #2 alone |
|---|---:|---:|---:|---:|---:|
| D1·GDX lots / booked | 29 / $205,524.95 | 18 / $192,519.55 | 18 / $152,539.66 | 35 / $188,324.54 | 41 / $221,231.92 |
| D1·VGT lots / booked | 7 / $71,047.92 | 9 / $28,293.42 | 3 / $31,913.09 | 4 / $47,255.10 | 4 / $47,255.10 |
| Growth·GDX lots / booked | 1 / $17,183.16 | **0 (unfunded)** | **0 (unfunded)** | 9 / $47,807.42 | — |
| Growth·VGT lots (partial exits) / booked | 2 (1) / $44,886.81 | 9 (0) / $24,407.81 | 4 (4) / $65,121.42 | 8 (0) / $26,996.30 | — |
| Causal: without D1 / without Growth | $268,114.37 / $46,001.63 | $220,812.97 / $24,407.81 | $166,724.62 / **−$18,912.85** | $230,923.45 / $41,896.34 | — |
| Causal: without GDX / without VGT | $165,116.29 / $132,458.95 | $167,118.46 / $58,448.39 | $85,353.54 / $65,419.51 | $142,258.96 / $58,193.49 | $165,716.13 / $74,146.41 |
| Causal: without Growth·GDX / without Growth·VGT | $32,080.62 / $28,818.47 | $0 / $24,407.81 | $0 / **−$8,726.90** | $7,597.45 / **−$15,952.93** | — |

- **Negative causal contributions** (labelled, not vetoed):
  - the staged combination's Growth family as a whole (−$18,912.85);
  - the staged combination's Growth·VGT (−$8,726.90);
  - the unchanged combination's Growth·VGT (−$15,952.93).

  Each raises the net when it is removed.
- **Chronology of the primary's funded trades (development):**
  - Growth·VGT funds 2016-06-24 → (854 days) +$42,532.15.
  - D1·VGT funds 2018-12 → 2020-02.
  - D1·GDX takes the 2020 crash (five lots, about $94,000).
  - Growth·GDX funds once, 2020-04-23 (+$17,183.16, 110 days).
  - D1 trades then dominate 2020–2024: D1·GDX 24 lots in 2021–2024.
  - Growth·VGT re-enters 2024-09-27 and holds into 2026 (§1).
- **Refusals and idle capacity** (refused component × the occupant; the refused trades' own virtual nets are
  descriptive, not profit the pool could add):
  - the primary: D1·VGT refused 7× behind D1·GDX (+$51,388.13 virtual; 39 idle sessions during those unfunded holds);
    D1·GDX 12× behind D1·VGT (−$32,592.59 virtual); D1·GDX 14× behind Growth·VGT (+$16,068.36); Growth·VGT once behind
    Growth·GDX (+$25,667.48; 117 idle sessions) and once behind D1·GDX (+$6,203.67; 227 idle sessions);
  - VG #2 alone: D1·VGT refused 7× behind D1·GDX (+$55,515.78, 115 idle sessions); D1·GDX 7× behind D1·VGT
    (−$26,891.32);
  - the unchanged combination: Growth·VGT refused twice behind Growth·GDX (+$56,890.46 virtual, 247 idle sessions).
- **Same-instant ordering never changed a trade.** No subject had a same-instant decision group. The priority flip and
  the reversed symbol order gave identical ledgers for both primaries.
- **The largest winning episode and its removal stress:**
  - the primary's 2019-08-05 → 2020-08-11 episode earned $130,398.83 (38.5% of net); the causal rerun with no new
    funding in it gives $208,244.01, the same as the arithmetic removal;
  - the independent primary's 2020-03-12 → 2020-04-15 episode earned $97,922.11 (39.9%); its blackout rerun gives
    $147,298.67.
- **Prespecified sensitivities and stresses of the primary:**
  - funding from 2017-06-15: $302,400.47 (−$36,242.37);
  - D1 native arming: no change;
  - whole shares: −$86.41;
  - 10 / 20 bps per side: $334,395.45 / $326,285.98;
  - 14% interest: $324,300.94;
  - +25 bps stop slippage: $330,303.43;
  - next-open stops: $335,438.96.
- **Matched trades, the primary minus another subject (development; every decomposition reconciles to the cent):**
  - **minus VG #2:** +$70,155.82 — 10 newly admitted lots (+$118,211.35), 16 displaced (−$17,464.58), 13 retimed
    (−$31,664.73);
  - **minus the unchanged VG #2 + #4 + Appendix A:** +$28,259.49 — 12 newly admitted (+$138,284.16), 29 displaced
    (−$78,703.42).

### 4.2 Holding periods and exposure (development)

- **The primary:**
  - Growth·VGT mean 474.5 days (maximum 854);
  - D1·VGT 97.9 days;
  - D1·GDX 17.2 days;
  - held 1,578 of 2,264 sessions; mean principal $63,795.
- **The independent primary:** Growth·VGT 42.6 days; held 744 sessions; mean principal $31,360.
- **The unchanged combination:** held 1,336 sessions.

Long Growth holds are what occupy the single slot.

## 5. Neighbourhoods (development, 384 independent confirmation draws; `results/tables/qualify-C24.md`)

| Member | Conf. median / p10 | Conf. p90 DD | Breaches (share; mean excess; worst) | GDX scope p10 / p90 DD / breach | Wide (1.5×) p10 / p90 DD / breach |
|---|---:|---:|---|---|---|
| Final primary (refined) | $256,435.91 / $220,489.09 | $27,369.13 | 2.6%; $42,916.79; **$103,278.13** | $269,150.17 / $23,993.02 / 0% | $157,454.97 / $43,071.81 / 21.1% |
| Independent primary | $153,762.04 / $123,831.41 | $31,726.97 | 5.2%; $3,543.47; $42,041.85 | $144,850.83 / $28,539.97 / 0.8% | $101,160.27 / $38,664.93 / 19.5% |
| Staged as-is | $226,067.65 / $193,712.34 | $28,164.47 | 3.4%; $7,791.40; $50,488.13 | $238,809.43 / $23,173.97 / 0% | $152,212.22 / $39,107.82 / 16.4% |
| Unchanged VG #2 + #4 + App. A | $219,202.01 / $181,689.71 | **$36,277.63** | **13.3%**; $4,096.67; $55,963.54 | $223,522.38 / $37,270.87 / 18.8% | $151,104.21 / $43,483.77 / 27.3% |
| Unchanged VG #2 + 08500a60 + App. A | $216,846.88 / $185,007.58 | **$35,131.47** | **10.9%**; $3,674.16; $55,963.54 | $209,016.43 / $34,444.01 / 9.4% | $153,128.36 / $42,266.06 / 24.2% |
| VG #2 alone | $224,587.89 / $190,971.84 | $24,889.27 | 1.3%; $6,478.55; $46,682.59 | $214,391.20 / $24,417.45 / 0% | $167,753.71 / $37,189.59 / 11.7% |

- **Numerical stability versus categorical toggles.**
  - The primary's numerical neighbourhood is broad.
  - Its categorical toggles are sensitive: Growth·VGT retention OFF gives a $35,473.28 DD; Growth·GDX recovery gate OFF
    gives −$32,080.62.
  - In the unchanged combinations, Growth·GDX's initial stop OFF drives DD to $52,198.81.
  - Toggles are report-only.
- **Local stability is not chronological reliability (§6).**

## 6. Chronological procedure tests (arm D only; `results/tables/folds.md`)

| Fold | Training (door) | Fold primary (independent actual-profit) | Training net / DD (lots) | Slice | Slice P&L | Slice DD (reset) |
|---|---|---|---:|---|---:|---:|
| C19 | 2016–2019 (D19) | `GDX-rise_VGT-breakout#1 profit` | $146,151.92 / $15,674.36 (22) | 2020–2021 | **−$29,722.57** | **$48,287.11** |
| C21 | 2016–2021 (D21) | `GDX-breakout_VGT-breakout#1 profit` | $242,500.46 / $17,744.39 (12) | 2022–2023 | **−$33,880.48** | **$69,053.76** |
| C23 | 2016–2023 (D23) | `GDX-rise_VGT-rise#1 profit` | $275,001.90 / $18,086.36 (28) | 2024 | $2,258.44 | $15,618.35 |

- **Verdict (frozen rule): chronologically unsupported.**
  - Sequential net **−$61,544.61** after $200 of switch charges.
  - Sequential minute DD **$102,257.90**, from 2020-03-03 to 2023-01-06.
- **Every role's sequence failed too:**
  - robust-profit −$50,515.50 (DD $85,955.79);
  - balanced −$57,330.05 (DD $85,955.79);
  - lower-drawdown −$39,812.97 (DD $68,610.87).
- Every fold had a primary (15, 16 and 16 qualified members), and each selection was committed before its slice
  (`686e9075`, `dc611c07`, `1eb54415`).
- **The descriptive controls on the same slices** (all chosen with later data, so not evidence of a procedure):

  | Control | Sequential net | Sequential DD |
  |---|---:|---:|
  | VG #2 | $224,535.51 | $17,280.74 |
  | VG #2 + #4 + Appendix A | $238,385.39 | $18,556.54 |
  | VG #2 + #4 (three components) | $235,688.78 | $17,280.74 |
  | Priority 2's VGT-only D1 primary + #4 | $129,153.10 | $19,534.41 |
- **Scope.** The staged path and the informed refinement inherit later-selected settings (VG #2, and the incumbents in
  their seeds). They have no chronological test, and no staged-versus-joint method claim is made (departure D1).

## 7. Search coverage, budgets and stopping (`results/tables/coverage.md`)

| Arm (cutoff) | Distinct centres (screen / islands / refinement moves) | Fresh evaluations | Minutes | Extension stop per cell |
|---|---|---:|---:|---|
| D (C19) | 34,783 (16,384 / 15,360 / 2,415) | 340,770 | 39.4 | cap, cap, triggers not met, cap |
| D (C21) | 34,049 (16,384 / 14,336 / 2,749) | 328,647 | 55.1 | cap, not met, not met, not met |
| D (C23) | 35,346 (16,384 / 15,360 / 2,986) | 350,673 | 76.6 | not met, cap, cap, not met |
| D (C24) | 36,395 (16,384 / 16,384 / 2,967) | 367,836 | 88.8 | **cap in every cell** |
| B (C24, Growth pair) | 17,186 (8,192 / 6,912 / 1,810) | 171,712 | 32.8 | cap, cap, not met, cap |
| C (C24, informed) | 5,242 (485 seed designs / 4,096 / 666) | 91,839 | 23.1 | cap |
| Qualification (C19 / C21 / C23 / C24 / Growth pair) | 15 / 16 / 16 / 30 / 14 members | 21,455 / 22,894 / 22,908 / 42,123 / 16,359 | — | — |

- **Totals.**
  - 1,777,216 fresh evaluations plus 6,056 archive hits. Neighbourhood draws are evaluations, not centres.
  - The validation added 924 evaluations on FULL; parity, the pilot and the bench are separate.
- **Stopping reasons.**
  - Every island stopped on its proposal budget, never on stagnation.
  - At C24 every arm-D cell and the informed lane still fired an extension trigger when their island cap was reached.
  - **Those searches are budget-bound, not converged.**
- **Coverage by structural class** (cell × gate pair × retention pair × eligibility pair: screened, plausible,
  promoted, rung-1 feasible) is in `coverage.md`. Every cell produced feasible fits: 1,622–2,990 of 3,264–4,330 rung-1
  centres.
- **Inherited effort** (disclosed, not counted): Study 8 (9,983,389 point evaluations, VG #2); growth140 and Priority 2's
  searches (Growth #4 browser-chosen, 08500a60); Appendix A (browser-chosen).
- **Budgets across arms were not matched.** No method-superiority claim follows from comparing them.

## 8. Resources, containment and recoverability

- **Containment.** Every heavy unit ran in `vgjoint.slice` (MemoryHigh 44 GiB, MemoryMax 48 GiB, swap 0), one at a
  time, launched by `chains/study.sh` as its own unit (`vgjoint-chain`). The chain ran 2026-11-09T00:17 → 05:57 UTC.
- **Bench** (`results/pilot/PILOT.md`):
  - about 50 evaluations/s at 12–16 workers with a GC every 8 evaluations;
  - 64.3/s at 15 workers with GC every 64, at the same 9.5 GiB;
  - chosen: 15 workers, GC every 64.
- **Memory.** Peak job cgroup 11.66 GiB (validation); searches ≤ 10.65 GiB. No `memory.high`, `memory.max` or OOM
  event in any unit. The host's MemAvailable was ≥ 52.9 GiB at every launch check.
- **The pilot:**
  - every path ran on pilot budgets;
  - a graceful stop (exit 75), a unit SIGKILL and a worker death (the job failed in 20 s, without hanging) each resumed
    to a search identical to the straight run;
  - the expected refusals held.
- **Integrity.**
  - **The freeze:** `results/protocol-freeze.json` `69d30c41…`, frozen 2026-11-09T00:16:54Z, committed `634c75a0`. The
    evaluation digest `147cad7c…` equals the sealed parity's.
  - **The frozen selection:** `FROZEN_SELECTION.json` `e29e35e2…`, committed `52a2ecb9` before the validation.
  - **Seals:** 21 sealed records verify (`npm run vg-joint -- verify`).
  - **Amendments:** R1–R3 before the freeze (the bench's budget and execution settings; batched worker start; a wording
    note) and O1 after it (the chain as its own unit). No rule changed after the freeze.

## 9. Disclosures and limitations

- **Previously examined history.** Every window had been examined before. The incumbents' 2025–2026 outcomes were known:
  VG #2's test, #4's and 08500a60's validation, and Appendix A's full history from the user's preview. The protocol was
  designed after that history.
- **What I saw before the freeze:**
  - pilot-budget figures, once, while building the table tool;
  - the controls' development figures in the dry parity: VG #2's harmonized $268,487.02, and the Growth controls alone.

  Neither changed a rule.
- **Few independent episodes.** One episode is 38.5% of the primary's development net. Five-lot crash episodes (2020)
  dominate several systems.
- **Same-ETF overlap.** Two books per symbol are not diversification.
- **Fresh seeds are not fresh market history.**
- **The informed lane's seeds carried later information** (VG #2; the unchanged controls' incumbents; the staged pairs'
  VG #2 partner).
- **Logs** (`results/logs/`) are local and git-ignored by the repository's convention. The records quote their figures.
  The job archives (`.cache/vg-d1-growth-joint/jobs/`, about 1.2 GB with the pilot) are local caches, and reproducible
  by rerunning the commands (`RUN_COMMANDS.md`).
- **Not tested:**
  - other funding behaviours (Priority 5);
  - GDX alone (Priority 4);
  - November–December 2026.

## 10. Reproduce

From the repository root (`RUN_COMMANDS.md`):

```
npm run research-preflight -- --study research/vg-d1-growth-joint
npm run vg-joint -- doors
npm run vg-joint -- launch --unit vgjoint-parity --wait -- parity
bash research/vg-d1-growth-joint/chains/pilot.sh
npm run vg-joint -- freeze-protocol
bash research/vg-d1-growth-joint/chains/study.sh
npm run vg-joint -- launch --unit vgjoint-freeze-selection --wait -- freeze-selection   # then commit it
npm run vg-joint -- launch --unit vgjoint-validate --wait -- validate --workers 15
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-d1-growth-joint/tables.ts
npm run vg-joint -- verify
```

Sealed stages refuse a rerun. In a copy of the checkout with the seals removed, every stage reproduces deterministically
from its seeds and archives.

## Review points before Priority 4 (nothing started)

1. **Accept the negative result?**
   - The frozen four-component primary failed validation.
   - The independent procedure is chronologically unsupported.
   - No combined system credibly improves on VG #2.
2. **The unchanged expanded combination** (VG #2 + Growth #4 + Appendix A) led the descriptive comparisons but failed
   the development tail gate (Q3, 13.3% breaches). Decide whether its tail is worth a bounded diagnostic, or whether it
   simply reflects incumbents chosen with later data in view.
3. **GDX Growth.** The searches rarely funded a GDX Growth book next to D1·GDX. Priority 4 (GDX-only D1 + Growth) can
   test whether that holds without VGT, starting from VG #2's GDX book and Appendix A as controls.
4. **Slot occupancy.** Both failures trace to long Growth holds occupying the exclusive slot. Priority 5 (the funding
   behaviour) is where that belongs; the current behaviour stays fixed through Priority 4.
