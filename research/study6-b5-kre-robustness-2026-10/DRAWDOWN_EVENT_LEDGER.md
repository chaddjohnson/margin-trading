# Drawdown event ledger — earliest divergence and peak-to-trough walkthroughs (Part A, PROTOCOL.md §6.7)

**Sources:**
- `results/partA/A7-events.json` (sealed);
- `results/partA/A7/breach-classes.csv`, which holds every breach scenario with its mechanism class.

All times are New York. Every decomposition below is exact inside one path: it is the change of each funded lot's
mark between the minute-DD peak and trough, rebuilt from the replay's own lots, and it sums to the drawdown with a
residual ≤ $2·10⁻¹¹. The rebuilt minute series reproduces the engine's tracker exactly for frozen B5 and for all 236
breach scenarios. Drawdowns are not added across trades or paths.

**Selection rule (predeclared):**
- Breach scenarios were taken from the pooled KRE N1 clip set (136 breaches of 320) and joint N1 clip rep 1 (100
  breaches of 128), on W29.
- They were grouped by the calendar quarter of their trough.
- KRE breaches fall in only two quarters, **2020-Q1 (119)** and **2020-Q3 (17)**. Joint rep 1 adds **2023-Q2 (40)**,
  **2022-Q3 (23)** and **2022-Q4 (4)**, as well as 2020-Q1 (31, already taken), 2023-Q4 (1) and 2022-Q2 (1).
- That gives **five independent episodes**; each is represented by its breach closest to frozen B5.

## Frozen B5 itself (the reference path)

The centre's worst drawdown is **$26,509.97**, from 2020-02-19 12:49 to 2020-03-12 10:23, recovered 2020-03-16. The
lots contributing between peak and trough:

| Lot | Contribution |
|---|---:|
| VGT lot of 2019-08-05 (stopped by a gap on 2020-02-24) | −$10,783 |
| VGT lot of 2020-02-28 | +$2,295 |
| KRE lot of 2020-03-09 | −$18,023 (at the trough) |

The next frozen-B5 episodes:

| Episode | Depth | Main contributors |
|---|---:|---|
| 2026-04-01 → 2026-07-17 | $25,774 | five GDX lots, the 2026 gold-miner decline |
| 2020-06-08 → 2020-07-31 | $23,514 | nine KRE lots |
| 2020-04-14 → 2020-04-16 | $18,980 | — |
| 2025-10-29 → 2025-11-20 | $18,209 | VGT and XRT lots |

## Episode 1 — 2020-Q1, the COVID crash (119 of 136 KRE-only breaches; 31 joint)

**Representative:** `book-clip-KRE-r2#62`.
- KRE X 29.9 → 29.2, Y 2.7 → 2.8, stop 3.1 → 3.0, **hold 4 → 3**, L 230 → 231, P 9.4 → 9.7.
- DD **$35,251.47**, 2020-02-19 12:49 → **2020-03-18 14:27**.

**Earliest divergence:**
- *Arming*, 2018-12-19: the KRE setup activates at 14:53 instead of 15:04. The resulting trade has the same outcome
  class (trailing stop, 2019-01-31).
- *Funded ledger*, 2019-05-30: lot #2 is a KRE lot (2019-05-30 → 06-03, max-hold, −$5,120) that frozen B5 never
  funded. Frozen B5's #2 is the VGT lot of 2019-08-05.
- The paths re-join before the crash: the VGT 2019-08-05 and 2020-02-28 lots are shared.

**Occupancy chain into the crash:**

| Lot | Status | Exit | Net |
|---|---|---|---:|
| VGT 2019-08-05 15:12 | shared | 2020-02-24 (trailing-stop gap) | +$17,589 |
| VGT 2020-02-28 09:32 | shared | 2020-03-06 | +$2,295 |
| KRE 2020-03-09 09:53 | new | 2020-03-12 09:31 (max hold, 3 days) | −$15,717 |
| *frozen:* same KRE entry | displaced | 2020-03-13 09:31 (4 days) | −$8,258 |
| **VGT 2020-03-12 09:32** | **new** | 2020-03-20 (max hold) | −$3,544 |
| *frozen:* XBI 2020-03-13 | displaced | — | −$614 |
| *frozen:* **GDX 2020-03-16 09:46** | **displaced** | 2020-03-18 | **+$37,416** |

**Peak and trough:**

| Point | Time | Strategy mark | Realized | Held lot | Unrealized |
|---|---|---:|---:|---|---:|
| Peak | 2020-02-19 12:49 | $43,502 | $15,131 | VGT lot of 2019-08-05 | +$28,371 |
| Trough | 2020-03-18 14:27 | $8,251 | $19,298 | VGT lot of 2020-03-12 | −$11,047 |

**Decomposition** (sums to −$35,251.47):

| Lot | Contribution |
|---|---:|
| VGT 2019-08-05 | −$10,783 |
| VGT 2020-02-28 | +$2,295 |
| **KRE 2020-03-09** | **−$15,717** |
| **VGT 2020-03-12** | **−$11,047** |

Frozen B5 over the same interval **gained $20,056**, because its GDX lot of 2020-03-16 earned +$37,416.

**Cause:** multiple compounding events, classed "compound": KRE lots 42% of the decline, newly enabled lots 29%,
shared lots 29%. The gap flag is set (the VGT 2019 lot's stop filled on a gap).
1. A 3-day hold exits KRE a day earlier, at a worse open: KRE's own excursion, −$7,459 against frozen.
2. That frees the slot on 2020-03-12, so a VGT entry is funded into the crash.
3. That VGT lot blocks the slot when GDX signals on 2020-03-16, so the windfall that ended frozen B5's drawdown never
   happens.

This is capital contention and changed opportunity allocation, triggered by KRE's hold. The other 118 scenarios of
the episode share this path: 104 have exactly $35,251.47 and 15 have $35,273.

## Episode 2 — 2020-Q3, regional-bank chop (17 KRE-only breaches)

**Representative:** `book-clip-KRE-r1#6`.
- **hold 4 → 6**, X 29.9 → 30.0, Y 2.7 → 2.5, stop 3.1 → 3.0, P 9.4 → 8.5, W 60 → 73, buffer 2.3 → 2.6.
- DD **$43,828.75**, 2020-06-08 10:14 → 2020-09-24 09:40.

**Earliest divergence:** arming on 2018-12-19 (15:06 vs 15:04); first ledger difference on 2019-05-30 (an extra KRE
lot).

**Peak and trough:**

| Point | Strategy mark | Realized | Held lot | Unrealized |
|---|---:|---:|---|---:|
| Peak | $140,789 | $116,643 | XRT lot of 2020-05-15 | +$24,145 |
| Trough | $96,960 | $102,269 | KRE lot of 2020-09-23 | −$5,309 |

**Decomposition:**
- XRT 2020-05-15 −$10,297 (it exits on a gap 2020-06-11);
- then **twelve KRE lots** from 2020-06-11 to 2020-09-23, mostly max-hold exits on day 6: −$6,066, −$2,632, −$667,
  −$2,359, −$2,384, −$6,017, −$3,168, −$5,281, −$4,580, −$5,309, partly offset by +$3,024 and +$1,223;
- one XBI lot +$683.

Frozen B5 over the same interval lost $21,822 (its own nine-lot KRE chop, episode 3 of the centre).

**Cause: KRE's own adverse excursion** (79% of the decline). With a longer hold, each re-entry during the summer-2020
chop loses more before the maximum-hold exit.

## Episode 3 — 2023-Q2, the 2022 bear into the regional-bank crisis (40 joint breaches)

**Representative:** `joint-clip-r1#1`. All five books are perturbed: e.g. VGT X 21.6 → 22.4, stop 7.3 → 7.0; XBI stop
3.1 → 3.8, hold 5 → 6; KRE stop 3.1 → 3.8 with **hold unchanged at 4**; GDX X 27.4 → 26.7, stop 7.1 → 7.5. DD **$47,537.23**, from **2021-10-22 10:15** (peak, holding a GDX lot)
to **2023-05-04 10:29** (trough, holding a KRE lot −$13,540).

**Earliest divergence:**
- arming on 2018-12-19 (KRE 15:02 vs 15:04);
- the funded ledger diverges at lot #1 (VGT 2018-12-21 15:44 vs 12:35), and never re-joins.

**Decomposition** (30 lots; 28 never funded by frozen B5):
- GDX 2021-09 −$9,097;
- XBI January–June 2022 (11 lots, net −$4,824);
- XRT −$574;
- VGT −$4,793 / +$7,630;
- GDX July–September 2022 −$8,880, +$1,619, −$7,045, +$1,332;
- KRE March–May 2023 (+$5,928, +$2,544, then seven max-hold losses, −$9,378 … −$13,540).

Frozen B5 over the same interval **gained $118,460**: different lots, e.g. KRE 2021-12-21 +$11,799 and XBI 2022
+$8,776.

**Cause:** classed "enabled/displaced ETF" (60% of the decline from lots frozen B5 never funded). It is path
dependence from 2018 onward, plus direct price risk of re-entries through the 2022 bear and the 2023 bank failures.
KRE contributes 37%, but the episode does not need KRE alone.

## Episode 4 — 2022-Q3, the gold-miner bear (23 joint breaches)

**Representative:** `joint-clip-r1#12`. DD **$45,530.79**, from **2022-06-06 09:31** (peak, holding an XBI lot) to
**2022-09-27 13:41** (trough, holding a GDX lot −$2,253).

**Earliest divergence:** VGT arming on 2018-12-21 (12:32 vs 12:31); the ledger diverges at lot #1.

**Decomposition:**
- XBI −$4,900 and −$5,155;
- then **seven consecutive GDX lots**, 2022-06-14 → 2022-09-27, almost all max-hold exits: −$6,715, −$4,508, −$736,
  −$3,885, −$6,497, −$10,880, −$2,253.

Frozen B5 over the same interval **gained $5,624**. Its slot was held by XBI and VGT lots (+$9,240, +$10,956), and its
GDX book entered only in September.

**Cause:** direct price risk of the **perturbed GDX book** (GDX X 27.4 → 27.9, stop 7.1 → 7.7, hold 18 → 16, L 100 → 107,
W 81 → 67; KRE hold 4 → 5 elsewhere in the vector) re-entering through the 2022 decline: 89% from lots frozen B5 never funded, KRE share 0%. **This episode is not KRE's.**

## Episode 5 — 2022-Q4 (4 joint breaches)

**Representative:** `joint-clip-r1#75`. Among others: KRE hold 4 → 3, XBI hold 5 → 7, GDX hold 18 → 17, VGT X 21.6 →
20.7. DD **$36,158.36**, 2022-03-18 10:11 → 2022-10-13 09:45.

**Earliest divergence:** a VGT entry on 2018-12-20 that frozen B5 did not fund (a max-hold loss of −$316).

**Decomposition** — 14 lots (2 shared with frozen B5):
- XBI −$3,529, −$2,602 (shared), −$1,223, +$949, +$709, +$2,812 (shared), −$4,120;
- VGT −$2,404, −$2,330;
- XRT −$3,685;
- GDX −$2,501, −$3,189, −$8,731, −$6,315.

Frozen B5 gained $21,199 over the interval.

**Cause:** "enabled/displaced ETF". Several books' changed entries hold the slot through the 2022 bear, with GDX
max-hold losses largest.

## What the ledger shows (and does not)

- **2020 COVID** is relevant only through KRE's hold and the slot sequence of 2020-03-09 → 03-18 (episode 1), and
  through the summer-2020 KRE chop (episode 2).
- **2022:** the bear-market breaches are GDX/XBI re-entry losses of perturbed books (episodes 4 and 5).
- **2023:** the March–May 2023 regional-bank crisis matters only inside episode 3, after the 2022 losses. In the KRE-
  only set, 2023 never produces a breach.
- **2025–2026** produces no breach in any design. Frozen B5's second-worst episode (2026 GDX, $25,774) stays below
  the ceiling.
- The earliest divergences are minute-level arming differences in December 2018. After that, each scenario follows a
  different funded path, and its drawdown is a property of the whole path, not of one trade.
