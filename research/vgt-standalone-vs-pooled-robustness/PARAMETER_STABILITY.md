<!-- Rendered by `npm run vgt-robustness -- report` from templates/PARAMETER_STABILITY.md and results/analysis.json; edit the template, not this file. -->
# Parameter stability: matched 8-D, one-at-a-time, and system-level

Every configuration here other than the frozen S, B4 and B5 is **diagnostic-only**. None was written to `config/`,
none was promoted, and no "best" variant was chosen.

Neighbours share one inspected history. They describe the in-sample response surface; they are not independent
trials. A neighbourhood median is **not** a forecast of future profit.

**Design** (PROTOCOL.md §5; grids, distances and quantization as in the prior audit):
- **OAT:** the prior audit's 32 one-at-a-time points of the VGT vector.
- **Matched 8-D, the primary comparison:** S run at **exactly** the prior audit's per-book VGT hypercube samples, 32
  from B4's design and 32 from B5's. Each S sample is paired with the stored pooled run of the same VGT vector.
- **S joint 8-D:** two fresh seeds of 64 over the same box.
- **System-level:** the prior B4 (32-D) and B5 (40-D) joint neighbourhoods, a different test of combined complexity.

Machine-readable files:
- `results/P_oat.csv`;
- `results/P_paired.csv`;
- `results/P_joint_samples.csv`;
- `results/P_designs.csv`.

## 1. The answer in brief

- **On matched tests the pools are more robust.**
  - Against B5: S better 0, B5 better 7, ties 1 → **pool more robust on matched tests**.
  - Against B4: S better 1, B4 better 7, ties 0 → **pool more robust on matched tests**.
  - Without item b6 (amendment A1), the result is unchanged: S better 0, B5 better 6, ties 1; S better 1, B4 better 6, ties 0.
- **S's frozen vector is a sharp peak of its own 8-D neighbourhood.**
  - The matched median keeps 70.1% of the frozen net. The P10 keeps
    45.6% and the worst 30.0%.
  - 0% of samples beat it.
  - Every sample is still profitable.
- **The same perturbations move the pools less.**
  - B4's VGT book keeps 91.5% at the median, and B5's 94.9%.
  - Part of this is dilution: the unperturbed books earn the same.
  - Part is that when VGT's changes free the slot, other books fill it.
- **VGT's own trade path is equally fragile in both structures** (a post hoc, supplementary diagnostic, amendment A1).
  About 5–8% of VGT's lots survive unchanged, and about half keep their entry session.
- **The fragility belongs to the VGT D1 book, not to the pooling.** Pooling damps it.
- **The system-level joint stresses are a different test.** Perturbing all 32 or 40 pooled parameters at once keeps
  only about 47% of each pool's net. That reflects how many parameters can be mis-set, not intrinsic per-parameter
  instability. It is not compared with an 8-D distribution as a causal statement.

## 2. Matched comparison items (PROTOCOL.md §11b)

Retention = net ÷ the configuration's own frozen net. "Paired 8-D" = the 32 samples of that pool's VGT design, run
standalone and inside the pool.

**S against B5:**

| Item | Measure | S | B5 | Tie band | Better |
|---|---|---:|---:|---:|---|
| b1 | paired 8-D median retention | 74.1% | 94.9% | 2 pp | **pool** |
| b2 | paired 8-D P10 retention | 49.5% | 83.1% | 2 pp | **pool** |
| b3 | paired 8-D worst retention | 35.2% | 74.3% | 2 pp | **pool** |
| b4 | OAT worst retention (32 VGT points) | 67.3% | 67.2% | 2 pp | tie |
| b5 | paired 8-D P10 of Δ$ vs own frozen | −$89,090 | −$82,023 | $2,500 | **pool** |
| b6 | paired 8-D median lot-path preservation | 4.8% | 83.0% | 2 pp | **pool** |
| b7 | C1 fixed net ÷ base fixed net | 70.9% | 79.7% | 2 pp | **pool** |
| b8 | paired 8-D median portfolio daily % DD − own frozen | +1.30 pp | +0.03 pp | 0.5 pp | **pool** |

**S against B4:**

| Item | Measure | S | B4 | Tie band | Better |
|---|---|---:|---:|---:|---|
| b1 | paired 8-D median retention | 67.6% | 91.5% | 2 pp | **pool** |
| b2 | paired 8-D P10 retention | 43.1% | 78.0% | 2 pp | **pool** |
| b3 | paired 8-D worst retention | 30.0% | 71.2% | 2 pp | **pool** |
| b4 | OAT worst retention (32 VGT points) | 67.3% | 77.6% | 2 pp | **pool** |
| b5 | paired 8-D P10 of Δ$ vs own frozen | −$100,264 | −$62,661 | $2,500 | **pool** |
| b6 | paired 8-D median lot-path preservation | 4.8% | 77.6% | 2 pp | **pool** |
| b7 | C1 fixed net ÷ base fixed net | 70.9% | 68.8% | 2 pp | **S** |
| b8 | paired 8-D median portfolio daily % DD − own frozen | +1.33 pp | −0.64 pp | 0.5 pp | **pool** |

**Caveats, stated in the protocol and in amendment A1:**
- **b1–b3 and b6 are diluted in the pools.** The other books are unperturbed: in B5 the VGT book is
  $110,095 of $486,208 in funded net.
- **b5 is not free of the structure either.** It is in dollars on the same $100,000 slot, but a pool's Δ$ scales with
  VGT's share of the slot (B5 funds 12 of S's 21 lots), and it includes other books refilling the slot.
- **A post hoc reading, not a rule.**
  - Five of the eight items (b1–b4, b6) are diluted by construction.
  - On the three less-diluted items (b5, b7, b8) the count is B5 better 3, S better 0, ties 0 against B5 and
    B4 better 2, S better 1, ties 0 against B4.
  - The predeclared verdict stands. It is best read as: perturbing VGT moves the pools less, largely because VGT holds
    only part of their slot.
- **b7 (cost) and b8 (drawdown shift) are structural.**

## 3. The neighbourhood tables

**S (standalone VGT primary):**

| Design | n | Median net | Median ÷ own frozen | P10 – P90 net | Worst (÷ frozen) | Net > 0 | ≥ ½ frozen | > frozen | Frozen percentile | Median fixed minute DD | Median lot-path preserved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S: OAT (32 VGT points) | 32 | $169,610 | 96.2% | $142,783 – $176,260 | $118,678 (67.3%) | 100% | 100% | 9% | 83% | $19,534 | 76% |
| S: matched 8-D, B4 VGT design (32) | 32 | $119,073 | 67.6% | $75,996 – $146,578 | $52,894 (30.0%) | 100% | 81% | 0% | 100% | $24,233 | 5% |
| S: matched 8-D, B5 VGT design (32) | 32 | $130,665 | 74.1% | $87,171 – $150,018 | $62,025 (35.2%) | 100% | 88% | 0% | 100% | $23,227 | 5% |
| S: matched 8-D, both designs (64) | 64 | $123,544 | 70.1% | $80,396 – $147,854 | $52,894 (30.0%) | 100% | 84% | 0% | 100% | $23,981 | 5% |
| S: joint 8-D, seed 1 (64) | 64 | $123,337 | 70.0% | $85,533 – $157,376 | $30,743 (17.4%) | 100% | 88% | 3% | 97% | $23,232 | 5% |
| S: joint 8-D, seed 2 (64) | 64 | $121,834 | 69.1% | $76,572 – $159,803 | $41,758 (23.7%) | 100% | 86% | 0% | 100% | $22,601 | 5% |
| S: joint 8-D, both seeds (128) | 128 | $122,259 | 69.4% | $82,113 – $158,200 | $30,743 (17.4%) | 100% | 87% | 2% | 98% | $22,789 | 5% |

**The pools, perturbing only VGT's eight parameters** (the matched counterparts):

| Design | n | Median net | Median ÷ own frozen | P10 – P90 net | Worst (÷ frozen) | Net > 0 | ≥ ½ frozen | > frozen | Frozen percentile | Median fixed minute DD | Median lot-path preserved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4: OAT of the VGT book (32) | 32 | $279,745 | 98.4% | $250,289 – $301,438 | $220,699 (77.6%) | 100% | 100% | 22% | 69% | $28,659 | 95% |
| B4: 8-D, VGT book only (32) | 32 | $259,971 | 91.5% | $221,584 – $303,990 | $202,276 (71.2%) | 100% | 100% | 19% | 81% | $28,454 | 78% |
| B5: OAT of the VGT book (32) | 32 | $475,053 | 97.7% | $445,146 – $486,208 | $326,687 (67.2%) | 100% | 100% | 9% | 81% | $26,510 | 95% |
| B5: 8-D, VGT book only (32) | 32 | $461,410 | 94.9% | $404,185 – $485,970 | $361,387 (74.3%) | 100% | 100% | 13% | 88% | $26,801 | 83% |

**The pools, perturbing one other book's eight parameters** (context; unpaired, other ranges):

| Design | n | Median net | Median ÷ own frozen | P10 – P90 net | Worst (÷ frozen) | Net > 0 | ≥ ½ frozen | > frozen | Frozen percentile | Median fixed minute DD | Median lot-path preserved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4: 8-D, XBI book only (32; context) | 32 | $241,318 | 84.9% | $214,197 – $264,280 | $206,894 (72.8%) | 100% | 100% | 0% | 100% | $29,926 | n/a |
| B4: 8-D, XRT book only (32; context) | 32 | $270,635 | 95.2% | $259,206 – $281,076 | $252,612 (88.9%) | 100% | 100% | 9% | 91% | $28,659 | n/a |
| B4: 8-D, KRE book only (32; context) | 32 | $220,844 | 77.7% | $199,580 – $238,752 | $191,566 (67.4%) | 100% | 100% | 0% | 100% | $39,617 | n/a |
| B5: 8-D, XBI book only (32; context) | 32 | $433,792 | 89.2% | $415,528 – $456,732 | $396,155 (81.5%) | 100% | 100% | 0% | 100% | $26,721 | n/a |
| B5: 8-D, XRT book only (32; context) | 32 | $471,514 | 97.0% | $458,461 – $514,748 | $411,444 (84.6%) | 100% | 100% | 25% | 75% | $26,510 | n/a |
| B5: 8-D, KRE book only (32; context) | 32 | $388,852 | 80.0% | $339,387 – $429,018 | $326,728 (67.2%) | 100% | 100% | 0% | 100% | $33,065 | n/a |
| B5: 8-D, GDX book only (32; context) | 32 | $375,903 | 77.3% | $339,912 – $450,498 | $326,160 (67.1%) | 100% | 100% | 0% | 100% | $26,559 | n/a |

**System-level joint stresses** (all books at once; a distinct test of combined complexity):

| Design | n | Median net | Median ÷ own frozen | P10 – P90 net | Worst (÷ frozen) | Net > 0 | ≥ ½ frozen | > frozen | Frozen percentile | Median fixed minute DD | Median lot-path preserved |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4: system-level joint 32-D, seed 1 (64) | 64 | $133,373 | 46.9% | $78,299 – $180,899 | $3,758 (1.3%) | 100% | 41% | 0% | 100% | $44,868 | n/a |
| B4: system-level joint 32-D, seed 2 (64) | 64 | $132,919 | 46.8% | $91,019 – $183,935 | $65,595 (23.1%) | 100% | 41% | 0% | 100% | $42,239 | n/a |
| B5: system-level joint 40-D, seed 1 (64) | 64 | $229,955 | 47.3% | $131,692 – $309,427 | $94,955 (19.5%) | 100% | 47% | 0% | 100% | $40,797 | n/a |
| B5: system-level joint 40-D, seed 2 (64) | 64 | $221,132 | 45.5% | $156,072 – $289,663 | $82,999 (17.1%) | 100% | 39% | 0% | 100% | $41,364 | n/a |

"n/a" in the lot-path column: the prior audit's records of these designs keep only a lot-set hash, not the lots. Only
the VGT designs were re-executed with their lots (the `p-path` family).

## 4. Why the pools look more stable on VGT's own parameters

Each of the 64 matched vectors was run both standalone and inside its pool. Δ is measured against each structure's own
frozen run.

| Design (same 32 VGT vectors) | Median S − pool retention | P10 – P90 | S retention higher | Pool Δ VGT-book net (median; P10 – P90) | Pool Δ other books (median; P10 – P90) | Other books lose | Pool VGT lots (median; range) | Pool VGT lots ⊂ S lots | corr(Δ S, Δ pool) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B4 VGT design | −19.7 pp | −51.2 pp – −5.5 pp | 0% | −$49,916; −$101,434 – −$18,701 | +$19,887; −$14,110 – +$76,362 | 25% | 13; 7–20 | 100% | 0.17 |
| B5 VGT design | −18.2 pp | −45.5 pp – −5.4 pp | 6% | −$40,508; −$92,003 – +$3,278 | +$7,970; −$43,097 – +$63,009 | 44% | 10.5; 5–15 | 100% | -0.12 |

- **Displacement acts as partial insurance.**
  - When a VGT perturbation costs the VGT book money, other books often gain the freed slot. The median "other
    books" change is positive in both pools.
  - So the pool's loss is smaller than the VGT book's.
  - The correlation between the standalone's Δ and the pool's Δ for the same vector is weak. The pool outcome
    depends on what the other books do with the slot.
- **The insurance is not reliable.** In a minority of samples the other books lose too (column "Other books lose").
  B5's worst matched sample earns $361,387 against the frozen $486,208.

**Supplementary lot-path diagnostic** (amendment A1: post hoc, descriptive, outside every rule). "Exact" means the same
decision, exit time and reason. "Entry session" means the same entry date, whatever the exit.

| Design | S: exact lots preserved (median; P10 – P90) | Pool VGT book: exact (median; P10 – P90) | Pool, all books: exact (median) | S: entry sessions preserved (median) | Pool VGT book: entry sessions preserved (median) |
|---|---:|---:|---:|---:|---:|
| B4 VGT design | 5%; 0% – 10% | 7%; 0% – 14% | 78% | 52% | 50% |
| B5 VGT design | 5%; 0% – 14% | 8%; 0% – 17% | 83% | 57% | 42% |

- The whole-pool preservation used in item b6 is high only because most pool lots belong to unperturbed books.
- On VGT's own lots, the standalone and the pools are equally path-fragile.

## 5. One-at-a-time

All 32 VGT points are inside the legal grid. The S, B4 and B5 runs at each point are the same VGT vector.

**Swing of fixed net across each parameter's four points:**

| Rank | Parameter | S lowest – highest net | S swing | B4 swing | B5 swing |
|---|---:|---:|---:|---:|---:|
| 1 | P | $162,264 – $209,912 | $47,648 | $48,127 | $40,175 |
| 2 | stop | $118,678 – $161,988 | $43,310 | $46,757 | $63,206 |
| 3 | Y | $132,484 – $174,798 | $42,315 | $33,885 | $33,885 |
| 4 | X | $141,682 – $172,296 | $30,614 | $66,151 | $162,578 |
| 5 | W | $156,376 – $176,260 | $19,884 | $19,884 | $19,884 |
| 6 | hold | $152,687 – $165,640 | $12,953 | $60,538 | $88,722 |
| 7 | L | $164,785 – $176,260 | $11,476 | $17,386 | $21,690 |
| 8 | buffer | $173,449 – $176,260 | $2,812 | $2,539 | $2,539 |

- **The OAT surface.**
  - S's median OAT point keeps 96.2%, and the worst 67.3%.
  - Three of 32 points beat the frozen net (pullback P 8.5%, 9.5%, 10.0%), as the column "> frozen" shows. These are
    in-sample observations of the same history and are **not** candidates.
  - S's sharpest single parameters are the trailing stop (−1.0 pp keeps 67.3%), Y +0.2 pp and X.
- **In the pools the same single changes reshuffle the slot.** Take VGT hold −2 days:
  - it **costs** S;
  - but it **raises** B4 and B5, because other books take the freed time.

  S's portfolio drawdown moves little under single changes: the OAT points' median daily drawdown is
  32.8%, and the worst is 34.5%.

<details><summary>Full OAT grid (fixed net, retention, and the pools' VGT-book / other-books decomposition)</summary>

| Param | Point | Value | S net (÷ frozen) | S daily % DD | B4 net (÷ frozen) | B4 Δ VGT / Δ others | B5 net (÷ frozen) | B5 Δ VGT / Δ others | B5 daily % DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| X | -m | 20.6% | $141,682 (80.4%) | 34.54% | $220,699 (77.6%) | −$56,057 / −$7,489 | $326,687 (67.2%) | −$2,015 / −$157,506 | 34.36% |
| X | -s | 21.1% | $169,547 (96.2%) | 32.78% | $249,189 (87.7%) | −$31,308 / −$3,748 | $442,776 (91.1%) | −$38,068 / −$5,363 | 29.67% |
| X | +s | 22.1% | $172,296 (97.8%) | 33.11% | $286,850 (100.9%) | +$2,605 / +$0 | $489,264 (100.6%) | +$3,057 / +$0 | 29.67% |
| X | +m | 22.6% | $164,033 (93.1%) | 32.94% | $249,689 (87.8%) | −$42,701 / +$8,145 | $447,275 (92.0%) | −$43,276 / +$4,344 | 29.67% |
| Y | -m | 0.1% | $174,798 (99.2%) | 32.70% | $273,224 (96.1%) | −$16 / −$11,005 | $474,846 (97.7%) | −$357 / −$11,005 | 29.67% |
| Y | -s | 0.2% | $174,714 (99.1%) | 32.70% | $273,166 (96.1%) | −$74 / −$11,005 | $474,871 (97.7%) | −$332 / −$11,005 | 29.67% |
| Y | +s | 0.4% | $174,286 (98.9%) | 32.78% | $283,166 (99.6%) | −$1,079 / −$0 | $485,627 (99.9%) | −$581 / +$0 | 29.67% |
| Y | +m | 0.5% | $132,484 (75.2%) | 32.72% | $249,281 (87.7%) | −$42,648 / +$7,684 | $451,742 (92.9%) | −$42,150 / +$7,684 | 29.01% |
| stop | -m | 6.3% | $118,678 (67.3%) | 33.81% | $302,454 (106.4%) | −$59,128 / +$77,338 | $480,019 (98.7%) | −$16,254 / +$10,065 | 29.66% |
| stop | -s | 6.8% | $136,865 (77.6%) | 32.77% | $292,293 (102.8%) | −$39,750 / +$47,798 | $506,748 (104.2%) | −$15,066 / +$35,606 | 29.66% |
| stop | +s | 7.8% | $161,988 (91.9%) | 33.51% | $263,714 (92.8%) | −$9,954 / −$10,577 | $450,192 (92.6%) | −$3,064 / −$32,952 | 29.74% |
| stop | +m | 8.3% | $153,730 (87.2%) | 33.87% | $255,697 (90.0%) | −$18,731 / −$9,817 | $443,542 (91.2%) | −$10,473 / −$32,193 | 29.88% |
| hold | -m | 6 | $152,687 (86.6%) | 33.66% | $329,286 (115.8%) | −$24,319 / +$69,360 | $535,565 (110.2%) | −$17,712 / +$67,069 | 29.67% |
| hold | -s | 7 | $165,640 (94.0%) | 34.27% | $277,783 (97.7%) | −$8,752 / +$2,291 | $446,843 (91.9%) | +$52,722 / −$92,086 | 29.67% |
| hold | +s | 9 | $156,219 (88.6%) | 33.81% | $271,510 (95.5%) | −$12,735 / +$0 | $479,865 (98.7%) | −$6,343 / +$0 | 29.67% |
| hold | +m | 10 | $155,063 (88.0%) | 33.81% | $268,748 (94.5%) | −$15,497 / +$0 | $477,103 (98.1%) | −$9,105 / +$0 | 29.67% |
| L | -m | 59 | $164,785 (93.5%) | 33.75% | $285,420 (100.4%) | −$11,476 / +$12,651 | $464,517 (95.5%) | −$14,760 / −$6,931 | 29.67% |
| L | -s | 67 | $176,260 (100.0%) | 32.78% | $284,245 (100.0%) | +$0 / +$0 | $486,208 (100.0%) | +$0 / +$0 | 29.67% |
| L | +s | 81 | $174,904 (99.2%) | 32.78% | $273,271 (96.1%) | −$397 / −$10,577 | $475,234 (97.7%) | −$397 / −$10,577 | 29.67% |
| L | +m | 89 | $169,674 (96.3%) | 33.27% | $268,035 (94.3%) | −$4,574 / −$11,636 | $469,998 (96.7%) | −$4,574 / −$11,636 | 29.67% |
| buffer | -m | 1.9% | $173,449 (98.4%) | 32.81% | $281,706 (99.1%) | +$764 / −$3,303 | $483,669 (99.5%) | +$764 / −$3,303 | 29.67% |
| buffer | -s | 2.4% | $176,112 (99.9%) | 32.78% | $284,245 (100.0%) | +$0 / +$0 | $486,208 (100.0%) | +$0 / +$0 | 29.67% |
| buffer | +s | 3.4% | $176,260 (100.0%) | 32.78% | $284,245 (100.0%) | +$0 / +$0 | $486,208 (100.0%) | +$0 / +$0 | 29.67% |
| buffer | +m | 3.9% | $176,260 (100.0%) | 32.78% | $284,245 (100.0%) | +$0 / +$0 | $486,208 (100.0%) | +$0 / +$0 | 29.67% |
| P | -m | 8.0% | $162,264 (92.1%) | 32.44% | $269,091 (94.7%) | −$15,153 / +$0 | $444,958 (91.5%) | −$19,012 / −$22,238 | 29.01% |
| P | -s | 8.5% | $177,105 (100.5%) | 32.73% | $283,170 (99.6%) | −$1,075 / +$0 | $485,133 (99.8%) | −$1,075 / +$0 | 29.62% |
| P | +s | 9.5% | $209,912 (119.1%) | 32.59% | $315,891 (111.1%) | +$31,160 / +$486 | $470,963 (96.9%) | −$15,731 / +$486 | 29.01% |
| P | +m | 10.0% | $200,401 (113.7%) | 33.02% | $317,218 (111.6%) | +$7,944 / +$25,030 | $472,322 (97.1%) | −$38,916 / +$25,030 | 29.01% |
| W | -m | 48 | $156,376 (88.7%) | 32.38% | $264,361 (93.0%) | −$19,884 / +$0 | $466,324 (95.9%) | −$19,884 / +$0 | 29.01% |
| W | -s | 54 | $156,376 (88.7%) | 32.38% | $264,361 (93.0%) | −$19,884 / +$0 | $466,324 (95.9%) | −$19,884 / +$0 | 29.01% |
| W | +s | 66 | $176,260 (100.0%) | 32.78% | $284,245 (100.0%) | +$0 / +$0 | $486,208 (100.0%) | +$0 / +$0 | 29.67% |
| W | +m | 72 | $176,260 (100.0%) | 32.78% | $284,245 (100.0%) | +$0 / +$0 | $486,208 (100.0%) | +$0 / +$0 | 29.67% |

</details>

## 6. Portfolio risk across the neighbourhoods

| Design | Median end equity | P10 – P90 | Median vs C0 | Beats C0 | Median daily % DD (range) | Median − own frozen | Daily > 30% | Daily > 35% | Median minute % DD | Minute > 35% | Worst daily episode = frozen's |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| S: OAT (32 VGT points) | $2,926,138 | $2,813,457 – $2,958,026 | +$646,369 | 100% | 32.8% (32.4% – 34.5%) | +0.0 pp | 100% | 0% | 35.2% | 88% | 56% |
| S: matched 8-D, B4 VGT design (32) | $2,705,597 | $2,559,592 – $2,810,871 | +$425,828 | 100% | 34.1% (32.9% – 35.5%) | +1.3 pp | 100% | 3% | 36.3% | 100% | 44% |
| S: matched 8-D, B5 VGT design (32) | $2,731,426 | $2,563,448 – $2,846,100 | +$451,657 | 100% | 34.1% (32.8% – 36.0%) | +1.3 pp | 100% | 9% | 36.3% | 100% | 31% |
| S: matched 8-D, both designs (64) | $2,727,446 | $2,560,198 – $2,820,171 | +$447,677 | 100% | 34.1% (32.8% – 36.0%) | +1.3 pp | 100% | 6% | 36.3% | 100% | 38% |
| S: joint 8-D, seed 1 (64) | $2,703,986 | $2,563,580 – $2,874,967 | +$424,217 | 100% | 34.1% (33.1% – 36.0%) | +1.3 pp | 100% | 11% | 36.4% | 100% | 30% |
| S: joint 8-D, seed 2 (64) | $2,702,651 | $2,531,154 – $2,889,957 | +$422,883 | 100% | 33.9% (32.7% – 35.6%) | +1.1 pp | 100% | 5% | 36.1% | 100% | 30% |
| S: joint 8-D, both seeds (128) | $2,703,986 | $2,548,669 – $2,880,021 | +$424,217 | 100% | 34.0% (32.7% – 36.0%) | +1.2 pp | 100% | 8% | 36.2% | 100% | 30% |
| B4: OAT of the VGT book (32) | $3,579,372 | $3,462,126 – $3,777,736 | +$1,299,603 | 100% | 34.6% (33.8% – 34.8%) | −0.0 pp | 100% | 0% | 37.0% | 100% | 100% |
| B4: 8-D, VGT book only (32) | $3,474,775 | $3,276,008 – $3,750,153 | +$1,195,006 | 100% | 34.0% (32.9% – 35.6%) | −0.6 pp | 100% | 3% | 36.0% | 97% | 100% |
| B5: OAT of the VGT book (32) | $5,301,370 | $5,028,119 – $5,410,977 | +$3,021,601 | 100% | 29.7% (29.0% – 34.4%) | +0.0 pp | 3% | 0% | 31.1% | 3% | 100% |
| B5: 8-D, VGT book only (32) | $5,165,780 | $4,661,670 – $5,408,328 | +$2,886,011 | 100% | 29.7% (29.0% – 33.8%) | +0.0 pp | 41% | 0% | 31.7% | 6% | 63% |
| B4: system-level joint 32-D, seed 1 (64) | $2,758,498 | $2,522,766 – $2,991,635 | +$478,729 | 98% | 35.3% (32.7% – 37.7%) | +0.6 pp | 100% | 56% | 37.4% | 98% | 55% |
| B4: system-level joint 32-D, seed 2 (64) | $2,754,090 | $2,560,077 – $2,980,465 | +$474,321 | 100% | 35.0% (33.1% – 37.5%) | +0.3 pp | 100% | 45% | 37.2% | 100% | 58% |
| B5: system-level joint 40-D, seed 1 (64) | $3,299,287 | $2,767,356 – $3,828,522 | +$1,019,518 | 100% | 35.2% (32.0% – 39.3%) | +5.5 pp | 100% | 55% | 37.2% | 89% | 11% |
| B5: system-level joint 40-D, seed 2 (64) | $3,218,599 | $2,889,563 – $3,736,042 | +$938,830 | 100% | 35.7% (29.4% – 40.3%) | +6.0 pp | 97% | 59% | 37.6% | 83% | 5% |

**S's portfolio drawdown is the more stable one under parameter uncertainty:**
- **S's matched and joint neighbours** have a median daily drawdown of about 34.1%
  (++1.3 pp over the frozen 32.78%). Few exceed 35%: 11%
  (seed 1) and 5% (seed 2).
- **B5's VGT-only neighbours** keep B5's 29.7%.
- **B5's system-level neighbours** have a median of 35.2%
  (+5.5 pp over frozen), and 55%
  exceed 35%.
  - B5's drawdown advantage survives perturbing any single book's eight parameters: the per-book medians range from
    29.7% to 32.4% (§3 context tables).
  - It does not survive perturbing all 40 together (the prior audit's finding).

**Where each design's worst daily-close drawdown falls** (regime windows of the prior protocol; "other YYYY" = outside
R1–R4). S's frozen worst episode is R2 stress (March 2020).

| Design | R2 stress | R3 rebound | R3 stress |
|---|---:|---:|---:|
| S: matched 8-D, both designs (64) | 24 | 0 | 40 |
| S: joint 8-D, both seeds (128) | 38 | 0 | 90 |
| B4: 8-D, VGT book only (32) | 32 | 0 | 0 |
| B5: 8-D, VGT book only (32) | 20 | 0 | 12 |
| B4: system-level joint 32-D, seed 1 (64) | 35 | 0 | 29 |
| B5: system-level joint 40-D, seed 1 (64) | 7 | 3 | 54 |

For most of S's neighbours the worst daily episode is the **2022 bear market** (R3 stress), not March 2020: see the
table. The frozen S only narrowly avoided making 2022 its worst; its 2022 episode is 2021-12-27 → 2022-10-14, 32.38%.

For planning, then, S's drawdown should be read as C0-like and 2022-driven. Its frozen 32.78% is not the expected
depth.

## 7. Traced execution paths (predeclared examples, fixed mode)

These are the four VGT OAT points with the largest B4 swings in the prior audit. Lot labels give symbol,
entry → exit, exit reason and net at $100,000.

**X -m (20.6%)**

- **S:** −$34,578 (net $141,682). Lots removed: 12; lots added: 15; 0 kept their entry but changed exit.
  - Removed: VGT 2018-12-21→2019-05-13 trailing stop 20250; VGT 2020-03-12→2020-03-20 maximum hold -3544; VGT 2020-03-23→2020-04-01 trailing stop 9015; VGT 2022-03-14→2022-04-07 trailing stop 7590; VGT 2022-05-12→2022-06-10 trailing stop 2013; VGT 2022-06-13→2022-06-21 maximum hold -1191; VGT 2022-06-22→2022-07-01 maximum hold 35; VGT 2022-07-05→2022-08-26 trailing stop 10956; VGT 2022-10-10→2022-11-03 trailing stop 575; VGT 2025-04-04→2025-04-10 trailing stop 1151; VGT 2025-04-11→2025-04-21 maximum hold -2239; VGT 2025-04-22→2025-11-07 trailing stop 44315
  - Added: VGT 2018-12-20→2019-01-03 maximum hold -316; VGT 2019-01-04→2019-05-13 trailing stop 19708; VGT 2020-03-09→2020-03-17 maximum hold -11041; VGT 2020-03-18→2020-04-01 trailing stop 5769; VGT 2022-02-24→2022-03-07 trailing stop 1128; VGT 2022-03-08→2022-04-07 trailing stop 6265; VGT 2022-05-11→2022-05-19 maximum hold -1426; VGT 2022-05-20→2022-06-13 maximum hold -4780; VGT 2022-06-14→2022-07-05 maximum hold -663; VGT 2022-07-06→2022-07-14 maximum hold -2257; VGT 2022-07-15→2022-08-26 trailing stop 5736; VGT 2022-09-29→2022-10-11 maximum hold -2805; VGT 2022-10-12→2022-11-03 trailing stop 1840; VGT 2025-04-03→2025-04-11 maximum hold -1804; VGT 2025-04-16→2025-11-07 trailing stop 38991
- **B4:** −$63,546 (VGT book −$56,057, other books −$7,489).
  - VGT lots removed: VGT 2018-12-21→2019-05-13 trailing stop 20250; VGT 2020-03-23→2020-04-01 trailing stop 9015; VGT 2022-06-22→2022-07-01 maximum hold 35; VGT 2022-07-05→2022-08-26 trailing stop 10956; VGT 2025-04-04→2025-04-10 trailing stop 1151; VGT 2025-04-11→2025-04-21 maximum hold -2239; VGT 2025-04-22→2025-11-07 trailing stop 44315
  - VGT lots added: VGT 2018-12-20→2019-01-03 maximum hold -316; VGT 2019-01-04→2019-05-13 trailing stop 19708; VGT 2020-03-09→2020-03-17 maximum hold -11041; VGT 2020-03-18→2020-04-01 trailing stop 5769; VGT 2022-02-24→2022-03-07 trailing stop 1128; VGT 2022-03-08→2022-04-07 trailing stop 6265; VGT 2022-05-11→2022-05-19 maximum hold -1426; VGT 2022-07-06→2022-07-14 maximum hold -2257; VGT 2022-07-15→2022-08-26 trailing stop 5736; VGT 2022-09-29→2022-10-11 maximum hold -2805; VGT 2022-10-12→2022-11-03 trailing stop 1840; VGT 2022-11-04→2022-12-15 trailing stop 6628; VGT 2025-04-03→2025-04-11 maximum hold -1804
  - Other books' lots removed: KRE 2020-03-09→2020-03-13 maximum hold -8258; XBI 2020-03-13→2020-03-16 trailing stop gap -614; KRE 2020-03-16→2020-03-17 trailing stop gap 2617; KRE 2020-03-18→2020-03-23 maximum hold -10094; XBI 2022-02-24→2022-03-01 trailing stop 5983; XBI 2022-03-08→2022-03-11 trailing stop 3566; XBI 2022-03-14→2022-03-21 trailing stop 9707; XBI 2022-05-12→2022-05-18 trailing stop 10542; XRT 2022-10-03→2022-10-20 maximum hold 146; XRT 2022-10-25→2022-12-15 trailing stop 2040
  - Other books' lots added: KRE 2025-04-11→2025-04-24 trailing stop gap 8145
- **B5:** −$159,521 (VGT book −$2,015, other books −$157,506).
  - VGT lots removed: VGT 2018-12-21→2019-05-13 trailing stop 20250; VGT 2022-06-22→2022-07-01 maximum hold 35; VGT 2022-07-05→2022-08-26 trailing stop 10956; VGT 2022-10-10→2022-11-03 trailing stop 575; VGT 2025-04-04→2025-04-10 trailing stop 1151; VGT 2025-04-11→2025-04-21 maximum hold -2239; VGT 2025-04-22→2025-11-07 trailing stop 44315
  - VGT lots added: VGT 2018-12-20→2019-01-03 maximum hold -316; VGT 2019-01-04→2019-05-13 trailing stop 19708; VGT 2020-03-09→2020-03-17 maximum hold -11041; VGT 2020-03-18→2020-04-01 trailing stop 5769; VGT 2020-04-02→2020-09-04 trailing stop 51264; VGT 2022-02-24→2022-03-07 trailing stop 1128; VGT 2022-03-08→2022-04-07 trailing stop 6265; VGT 2022-05-11→2022-05-19 maximum hold -1426; VGT 2022-07-06→2022-07-14 maximum hold -2257; VGT 2022-07-15→2022-08-26 trailing stop 5736; VGT 2025-04-03→2025-04-11 maximum hold -1804
  - Other books' lots removed: KRE 2020-03-09→2020-03-13 maximum hold -8258; XBI 2020-03-13→2020-03-16 trailing stop gap -614; GDX 2020-03-16→2020-03-18 trailing stop 37416; GDX 2020-03-19→2020-03-20 trailing stop gap 10921; GDX 2020-03-23→2020-03-27 trailing stop gap 16091; KRE 2020-03-27→2020-03-31 maximum hold -1745; GDX 2020-04-01→2020-04-15 trailing stop gap 27571; KRE 2020-04-15→2020-04-20 maximum hold -778; KRE 2020-04-21→2020-04-30 trailing stop gap 16508; XBI 2020-05-01→2020-05-13 trailing stop gap 12893; KRE 2020-05-13→2020-05-19 trailing stop 8158; KRE 2020-05-20→2020-05-28 trailing stop 10785; KRE 2020-06-01→2020-06-09 trailing stop gap 15286; KRE 2020-06-11→2020-06-15 maximum hold -5459; KRE 2020-06-16→2020-06-22 maximum hold -5956; KRE 2020-06-25→2020-06-29 maximum hold -2562; KRE 2020-06-30→2020-07-06 maximum hold -1866; KRE 2020-07-10→2020-07-14 trailing stop 2643; KRE 2020-07-15→2020-07-20 maximum hold -3336; KRE 2020-07-21→2020-07-27 trailing stop 705; KRE 2020-07-29→2020-08-03 maximum hold -1404; KRE 2020-08-05→2020-08-12 trailing stop 7595; KRE 2020-08-14→2020-08-18 maximum hold -2310; KRE 2020-08-24→2020-08-26 trailing stop 1014; KRE 2020-08-27→2020-08-31 maximum hold -1729; KRE 2020-09-01→2020-09-04 trailing stop 653; XBI 2022-02-24→2022-03-01 trailing stop 5983; XBI 2022-03-08→2022-03-11 trailing stop 3566; XBI 2022-03-14→2022-03-21 trailing stop 9707; XBI 2022-05-12→2022-05-18 trailing stop 10542
  - Other books' lots added: XBI 2020-03-17→2020-03-18 trailing stop gap -501; XBI 2020-09-04→2020-09-08 trailing stop gap 671; GDX 2022-10-11→2022-11-02 buffered intraday loss -3801; KRE 2025-04-11→2025-04-24 trailing stop gap 8145

**X +m (22.6%)**

- **S:** −$12,228 (net $164,033). Lots removed: 7; lots added: 4; 0 kept their entry but changed exit.
  - Removed: VGT 2018-12-21→2019-05-13 trailing stop 20250; VGT 2022-03-14→2022-04-07 trailing stop 7590; VGT 2022-04-26→2022-05-06 maximum hold -1176; VGT 2022-10-10→2022-11-03 trailing stop 575; VGT 2022-11-04→2022-12-15 trailing stop 6628; VGT 2025-04-11→2025-04-21 maximum hold -2239; VGT 2025-04-22→2025-11-07 trailing stop 44315
  - Added: VGT 2018-12-21→2019-05-13 trailing stop 21497; VGT 2022-10-11→2022-11-03 trailing stop 2315; VGT 2022-12-16→2022-12-27 maximum hold -3048; VGT 2025-04-16→2025-11-07 trailing stop 42951
- **B4:** −$34,556 (VGT book −$42,701, other books +$8,145).
  - VGT lots removed: VGT 2018-12-21→2019-05-13 trailing stop 20250; VGT 2022-04-26→2022-05-06 maximum hold -1176; VGT 2025-04-11→2025-04-21 maximum hold -2239; VGT 2025-04-22→2025-11-07 trailing stop 44315
  - VGT lots added: VGT 2018-12-21→2019-05-13 trailing stop 21497; VGT 2022-12-16→2022-12-27 maximum hold -3048
  - Other books' lots removed: none
  - Other books' lots added: KRE 2025-04-11→2025-04-24 trailing stop gap 8145
- **B5:** −$38,932 (VGT book −$43,276, other books +$4,344).
  - VGT lots removed: VGT 2018-12-21→2019-05-13 trailing stop 20250; VGT 2022-04-26→2022-05-06 maximum hold -1176; VGT 2022-10-10→2022-11-03 trailing stop 575; VGT 2025-04-11→2025-04-21 maximum hold -2239; VGT 2025-04-22→2025-11-07 trailing stop 44315
  - VGT lots added: VGT 2018-12-21→2019-05-13 trailing stop 21497; VGT 2022-12-16→2022-12-27 maximum hold -3048
  - Other books' lots removed: none
  - Other books' lots added: GDX 2022-10-11→2022-11-02 buffered intraday loss -3801; KRE 2025-04-11→2025-04-24 trailing stop gap 8145

**hold -m (6)**

- **S:** −$23,574 (net $152,687). Lots removed: 7; lots added: 7; 4 kept their entry but changed exit.
  - Removed: VGT 2020-03-12→2020-03-20 maximum hold -3544; VGT 2020-03-23→2020-04-01 trailing stop 9015; VGT 2020-10-28→2021-02-23 trailing stop 13031; VGT 2021-03-05→2021-05-11 trailing stop gap 3313; VGT 2022-04-26→2022-05-06 maximum hold -1176; VGT 2022-05-12→2022-06-10 trailing stop 2013; VGT 2022-09-16→2022-09-26 maximum hold -3284
  - Added: VGT 2020-03-12→2020-03-18 maximum hold -7208; VGT 2020-03-19→2020-04-01 trailing stop 6438; VGT 2020-10-28→2020-11-03 maximum hold -1410; VGT 2022-04-26→2022-05-02 maximum hold 68; VGT 2022-05-09→2022-05-16 maximum hold -1202; VGT 2022-05-19→2022-05-25 maximum hold -17; VGT 2022-09-16→2022-09-22 maximum hold -875
- **B4:** +$45,041 (VGT book −$24,319, other books +$69,360).
  - VGT lots removed: VGT 2020-03-23→2020-04-01 trailing stop 9015; VGT 2020-10-28→2021-02-23 trailing stop 13031; VGT 2021-03-05→2021-05-11 trailing stop gap 3313; VGT 2022-04-26→2022-05-06 maximum hold -1176; VGT 2022-09-16→2022-09-26 maximum hold -3284
  - VGT lots added: VGT 2020-10-28→2020-11-03 maximum hold -1410; VGT 2022-04-26→2022-05-02 maximum hold 68; VGT 2022-05-09→2022-05-16 maximum hold -1202; VGT 2022-09-16→2022-09-22 maximum hold -875
  - Other books' lots removed: XBI 2022-05-09→2022-05-11 trailing stop gap 35; XBI 2022-05-12→2022-05-18 trailing stop 10542
  - Other books' lots added: KRE 2020-03-24→2020-03-26 trailing stop 4036; KRE 2020-03-27→2020-03-31 maximum hold -1745; XRT 2020-11-03→2021-01-28 trailing stop 63493; KRE 2021-02-02→2021-02-11 trailing stop 6369; XBI 2021-02-17→2021-02-22 maximum hold -1223; XRT 2021-03-05→2021-03-19 trailing stop 8826; KRE 2021-03-24→2021-03-30 maximum hold 180
- **B5:** +$49,357 (VGT book −$17,712, other books +$67,069).
  - VGT lots removed: VGT 2020-10-28→2021-02-23 trailing stop 13031; VGT 2021-03-05→2021-05-11 trailing stop gap 3313; VGT 2022-04-26→2022-05-06 maximum hold -1176
  - VGT lots added: VGT 2020-10-28→2020-11-03 maximum hold -1410; VGT 2022-04-26→2022-05-02 maximum hold 68; VGT 2022-05-09→2022-05-16 maximum hold -1202
  - Other books' lots removed: XBI 2022-05-09→2022-05-11 trailing stop gap 35; XBI 2022-05-12→2022-05-18 trailing stop 10542
  - Other books' lots added: XRT 2020-11-03→2021-01-28 trailing stop 63493; KRE 2021-02-02→2021-02-11 trailing stop 6369; XBI 2021-02-17→2021-02-22 maximum hold -1223; XRT 2021-03-05→2021-03-19 trailing stop 8826; KRE 2021-03-24→2021-03-30 maximum hold 180

**P +m (10.0%)**

- **S:** +$24,141 (net $200,401). Lots removed: 8; lots added: 7; 0 kept their entry but changed exit.
  - Removed: VGT 2019-08-05→2020-02-24 trailing stop gap 17589; VGT 2020-02-28→2020-03-06 trailing stop 2295; VGT 2020-10-28→2021-02-23 trailing stop 13031; VGT 2021-03-05→2021-05-11 trailing stop gap 3313; VGT 2022-04-26→2022-05-06 maximum hold -1176; VGT 2022-05-12→2022-06-10 trailing stop 2013; VGT 2022-09-16→2022-09-26 maximum hold -3284; VGT 2025-11-21→2026-02-05 maximum hold -2326
  - Added: VGT 2020-10-30→2021-02-23 trailing stop 14665; VGT 2022-05-06→2022-05-16 maximum hold -3863; VGT 2022-05-19→2022-06-10 trailing stop 1053; VGT 2022-09-22→2022-09-30 maximum hold -4479; VGT 2025-11-21→2026-02-04 trailing stop 166; VGT 2026-03-27→2026-06-05 trailing stop 34972; VGT 2026-07-28→open open 13083
- **B4:** +$32,974 (VGT book +$7,944, other books +$25,030).
  - VGT lots removed: VGT 2019-08-05→2020-02-24 trailing stop gap 17589; VGT 2020-02-28→2020-03-06 trailing stop 2295; VGT 2020-10-28→2021-02-23 trailing stop 13031; VGT 2021-03-05→2021-05-11 trailing stop gap 3313; VGT 2022-04-26→2022-05-06 maximum hold -1176; VGT 2022-09-16→2022-09-26 maximum hold -3284
  - VGT lots added: VGT 2022-05-06→2022-05-16 maximum hold -3863; VGT 2022-09-22→2022-09-30 maximum hold -4479; VGT 2026-03-27→2026-06-05 trailing stop 34972; VGT 2026-07-28→open open 13083
  - Other books' lots removed: XBI 2022-05-09→2022-05-11 trailing stop gap 35; XBI 2022-05-12→2022-05-18 trailing stop 10542
  - Other books' lots added: KRE 2020-10-29→2020-11-04 trailing stop gap 4178; KRE 2020-11-05→2020-11-11 trailing stop 12930; XBI 2021-01-04→2021-01-11 trailing stop 4345; KRE 2021-02-02→2021-02-11 trailing stop 6369; XBI 2021-02-17→2021-02-22 maximum hold -1223; XRT 2021-03-05→2021-03-19 trailing stop 8826; KRE 2021-03-24→2021-03-30 maximum hold 180
- **B5:** −$13,886 (VGT book −$38,916, other books +$25,030).
  - VGT lots removed: VGT 2019-08-05→2020-02-24 trailing stop gap 17589; VGT 2020-02-28→2020-03-06 trailing stop 2295; VGT 2020-10-28→2021-02-23 trailing stop 13031; VGT 2021-03-05→2021-05-11 trailing stop gap 3313; VGT 2022-04-26→2022-05-06 maximum hold -1176
  - VGT lots added: VGT 2022-05-06→2022-05-16 maximum hold -3863
  - Other books' lots removed: XBI 2022-05-09→2022-05-11 trailing stop gap 35; XBI 2022-05-12→2022-05-18 trailing stop 10542
  - Other books' lots added: KRE 2020-10-29→2020-11-04 trailing stop gap 4178; KRE 2020-11-05→2020-11-11 trailing stop 12930; XBI 2021-01-04→2021-01-11 trailing stop 4345; KRE 2021-02-02→2021-02-11 trailing stop 6369; XBI 2021-02-17→2021-02-22 maximum hold -1223; XRT 2021-03-05→2021-03-19 trailing stop 8826; KRE 2021-03-24→2021-03-30 maximum hold 180

**What the examples show:**
- **The standalone has no slot competition, but it still has sequence effects.**
  - A different X or hold changes which dip arms.
  - That moves later entries, the net-profit stop, the post-exit continuation and its 60-session window.
  - So whole chains of lots change, for example the 2022 sequence.
- **In the pools, the same change also reorders the slot:**
  - at X −1.0 pp, B5's VGT book barely changes in total, but VGT holds the slot in March 2020 and the other books
    lose most of the difference;
  - at hold −2, the opposite happens: the pools gain from what other books do with the freed time.
