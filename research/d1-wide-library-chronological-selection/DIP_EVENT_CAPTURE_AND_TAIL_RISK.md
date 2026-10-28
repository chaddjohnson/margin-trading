# Dip-event capture, tail risk, costs and the portfolio overlay

**Evidence level: retrospective (inspected history).** Event labels are the standalone audit's price-only catalog
(zigzag 10% reversal; an episode = a confirmed peak and the following trough; major = depth ≥ 20%; a family = episodes
whose troughs fall within 126 sessions of the family's first trough), computed per window on that window's evaluation
universe after the fact; **no label enters any trading decision**. A **dip entry** is a lot entered in the decline phase
or at ≥ 50% of the episode's depth below its peak; **dip-captured** = dip entries with attributed net > 0 (a
continuation re-entry high up the rebound is not credited). Records: the sealed evaluations
(`results/evaluation/<phase>/`; per-nominee captures, lots with MAE/MFE, capture draws, portfolio windows) and
`results/tables/events-tails-portfolio.md`, `ledgers.csv` (every lot **entered** inside the window by a primary-cell
nominee: entry/exit ET, prices, reason, setup, gross, interest, friction, net, cumulative net, MAE/MFE, holding days,
episode — empty for the 895 of 14,298 lots outside every catalogued episode), `ledger-reconciliation.csv` and
`event-families.csv` (§5).

**Scope of the lot figures.** The ledgers and every window lot metric below (lots, wins/losses, worst lot, MAE, ES
proxy, interest, friction, concentration) cover lots *entered* in the window. Window V also contains the in-window
share of a lot already open at the window start, so a nominee's ledger does not sum to its V when a lot was carried in
(680 of the 1,785 nominee-windows with ledger rows differ by more than $1). `scripts/reconcile_ledgers.py` writes
`results/tables/ledger-reconciliation.csv`: for each of the 2,818 primary nominee-windows with engine rows, V at 5 bps,
the ledgered net and the carried-in share; the residual is non-zero exactly for the 929 with a carried-in lot (0
identity failures; S21 has no engine rows).

## 1. Event counts (how much evidence a window holds)

| Window | Eligible catalog families with a trough in the window (61 ETFs) | of which major (≥ 20%) |
|---|---:|---:|
| fold A (2020-07 → 2021-12) | 74 | 24 |
| fold B (2022-01 → 2023-12) | 156 | 78 |
| T1-later (2022-01 → 2023-12) | 156 | 78 |

Fold A had few deep dips (the post-COVID rebound); fold B held a full bear market — twice the families, three times the
major ones. The families of correlated ETFs coincide in time (2022's sell-off is one market event seen 61 times), so
these counts overstate the independent evidence.

Rolling one-year windows (catalog families with a trough in the year; NEW pool's baseline A0r):

| Year (cell) | Families (major) | A0r dip-captured (major) | Major families A0r's nominees never entered |
|---|---:|---:|---:|
| 2019 (S18) | 35 (14) | 7 (3) | 2 |
| 2020 (S19) | 81 (55) | 41 (31) | 0 |
| 2021 (S20) | 51 (12) | 6 (2) | 1 |
| 2022 (S21) | 93 (63) | not attributed | — |
| 2023 (S22) | 79 (23) | 11 (5) | 10 |
| 2023 (T2-later) | 79 (23) | not attributed | — |

**Event attribution does not exist for S21 or T2-later.** S21's phase (B-sel) has no full-engine rows by design, and
T2-later is window 1 of phase B, whose captures start at 2021-12-31 and are not split at T2's 2022-12-30 boundary. For
both, only the window's own catalog exists (it supplies the event-count floor of PROTOCOL §9.2); no capture, falling-
knife, entry-timing or winner figure is reported for them.

## 2. Capture, tails and costs at K = 16 (ARCH and NEW; all pools in the tables)

| Window | Pool | Arm | Dip-captured / families (major) | Falling-knife episodes | Window lots (win / loss) | Worst window lot | Worst MAE | ES proxy (mean of worst 10% lots) | Top-1 share of positive lot nets |
|---|---|---|---|---:|---|---:|---:|---:|---:|
| A | ARCH | A0 | 20 / 74 (9 / 24) | 26 | 195 (96 / 99) | −$9,730 | −19% | −$5,620 | 6% |
| A | ARCH | A1 | 17 / 74 (9 / 24) | 21 | 155 (82 / 73) | −$8,296 | −10% | −$4,942 | 5% |
| A | ARCH | A2 | 16 / 74 (8 / 24) | 29 | 177 (87 / 90) | −$10,997 | −16% | −$6,062 | 6% |
| A | ARCH | A3 | 12 / 74 (6 / 24) | 17 | 137 (50 / 87) | −$12,838 | −13% | −$6,215 | 10% |
| A | NEW | A0r | 18 / 74 (10 / 24) | 21 | 151 (81 / 70) | −$12,424 | −22% | −$5,992 | 8% |
| A | NEW | A3 | 10 / 74 (3 / 24) | 20 | 106 (31 / 75) | −$14,388 | −19% | −$6,955 | 23% |
| B | ARCH | A0 | 52 / 156 (34 / 78) | 87 | 595 (252 / 343) | −$19,998 | −21% | −$9,567 | 2% |
| B | ARCH | A1 | 47 / 156 (32 / 78) | 71 | 507 (222 / 285) | −$20,151 | −21% | −$10,202 | 3% |
| B | ARCH | A2 | 45 / 156 (28 / 78) | 80 | 499 (145 / 354) | −$20,151 | −20% | −$8,636 | 4% |
| B | ARCH | A3 | 52 / 156 (34 / 78) | 73 | 457 (162 / 295) | −$15,652 | −23% | −$9,803 | 4% |
| B | NEW | A0r | 40 / 156 (27 / 78) | 72 | 441 (190 / 251) | −$22,279 | −24% | −$10,793 | 3% |
| B | NEW | A2 | 40 / 156 (30 / 78) | 84 | 466 (138 / 328) | −$16,109 | −24% | −$9,844 | 5% |
| B | NEW | A3 | 50 / 156 (36 / 78) | 63 | 393 (131 / 262) | −$14,713 | −24% | −$9,980 | 5% |

- **Dip capture did not track V.** In fold A no wide arm dip-captured more families than its pool's baseline on the
  four verdict pools (ARCH: the baseline 20 of 74, 9 of 24 major; the wide arms 12–17; on the descriptive ARCH-S pool A2
  captured 22 against 12). In fold B several did on the new pools and on ARCH-S — A3 on NEW 50
  against A0r's 40 (36 against 27 major, also above the sealed A0's 34 on ARCH), A3 on ALL 57 against 53, A1 on NEW
  46 — and in T1-later A2 on NEW captured 60 against A0r's 52, without a better V in any of these cells. The counts are
  summed over 61 correlated ETFs (one market sell-off seen many times); they are not counts of independent dips.
- **Falling knives dominate fold B:** 63–87 episodes per arm with at least one decline-phase entry (entered at or before
  the trough) and an attributed episode net ≤ 0; losing lots outnumber winners in every fold-B cell (A2: 145 winners,
  354 losers on ARCH).
- **Large winners are not the story here:** the largest window lot is 2–10% of the positive lot nets in most cells
  (A3 on NEW in fold A, 23%, is the exception); concentration is descriptive and never a penalty.
- **Costs:** each nominee is re-simulated at 0/2/5/10 bps; moving from 5 to 10 bps lowers fold-B Σ V by $6k–$53k per
  arm and flips the sign of two near-zero mean ΔV comparisons at K = 16 (fold A ARCH A3 −$50 → +$481; fold B ALL A1
  +$344 → −$230); no verdict depends on them (`CHRONOLOGICAL_FOLD_COMPARISON.md` §2).
- **Drawdown:** fold B's windowed minute DD exceeded $35,000 for 8–17 nominees per arm (the baseline 11 on ARCH, 12 on
  NEW): **the historical $35,000 training gate did not bound later drawdowns**, for any procedure.

## 3. Were the largest window winners robustly captured? (primary cells; 16 neighbourhood draws each, diagnostic)

For each nominee's largest winning window episode: the share of its 16 N1 neighbours (every parameter ±1 step unit)
that also dip-captured the same family, and the share that kept ≥ 50% of the episode's net.

| Window | Pool | Arm | Nominees with a window winner | Median share capturing the same family | Median share keeping ≥ 50% | Narrow coincidences (< 25% keep) |
|---|---|---|---:|---:|---:|---:|
| A | ARCH | A0 | 13 | 1.00 | 0.88 | 0 |
| A | ARCH | A2 | 13 | 0.81 | 0.69 | 0 |
| A | NEW | A1 | 12 | 0.69 | 0.47 | 0 |
| B | ARCH | A0 | 37 | 1.00 | 0.81 | 1 |
| B | NEW | A3 | 34 | 1.00 | 0.81 | 3 |
| T1-later | NEW | A4 | 27 | 1.00 | 0.94 | 0 |

The episodes that paid were usually captured by most nearby settings (the underlying rebound, resized by the
parameters, rather than a one-minute coincidence); the narrow baseline's winners were at least as robust as the wide
arms'. This robustness says nothing about whether the *next* window will contain such an episode.

## 3b. Entry timing, missed majors, holding and exits (K = 16; `ANALYSIS.json` metrics, descriptive)

Negative offsets: entered before the trough (during the decline).

| Window | Pool | Arm | First entry vs trough, sessions: median (IQR; n) | Major families never entered | Episodes with a continuation entry and no dip entry | Held days median / p90 | Exits: max hold / trailing stop / buffered loss / open | Median MAE / MFE |
|---|---|---|---|---:|---:|---|---|---|
| A | ARCH | A0 | −13 (−48.5 to −2; 52) | 1 | 0 | 15 / 40 | 47% / 48% / 3% / 3% | −2% / 4.3% |
| A | ARCH | A1 | −5 (−37 to 0; 45) | 3 | 0 | 14 / 35 | 45% / 50% / 1% / 3% | −1.7% / 4.4% |
| A | ARCH | A2 | −11 (−39.2 to −0.8; 52) | 4 | 0 | 13 / 39 | 44% / 50% / 5% / 2% | −2.1% / 4.9% |
| A | ARCH | A3 | −12 (−49 to 1; 33) | 3 | 0 | 15 / 59 | 53% / 34% / 10% / 4% | −1.7% / 4.7% |
| A | NEW | A0r | −12 (−32 to −1; 45) | 2 | 0 | 21 / 41 | 44% / 52% / 1% / 2% | −2.2% / 5.2% |
| A | NEW | A3 | −15 (−65 to −1.8; 32) | 6 | 0 | 21.5 / 66 | 66% / 27% / 4% / 3% | −1.8% / 4.1% |
| B | ARCH | A0 | −20 (−40.5 to −8; 151) | 13 | 0 | 14 / 34 | 54% / 42% / 3% / 1% | −2.6% / 3.6% |
| B | ARCH | A1 | −21 (−41 to −10; 133) | 16 | 0 | 15 / 32 | 53% / 44% / 2% / 1% | −2.5% / 3.7% |
| B | ARCH | A2 | −16 (−38.5 to −3; 143) | 15 | 0 | 13 / 43 | 68% / 26% / 5% / 2% | −2.3% / 3.1% |
| B | ARCH | A3 | −18 (−39.5 to −4; 135) | 8 | 1 | 16 / 47 | 64% / 32% / 1% / 3% | −2.7% / 3.7% |
| B | NEW | A0r | −20 (−38 to −7; 122) | 16 | 0 | 14 / 35 | 53% / 44% / 2% / 1% | −3% / 3.9% |
| B | NEW | A2 | −15 (−34.8 to −3; 146) | 14 | 0 | 15 / 47 | 67% / 27% / 4% / 1% | −2.2% / 3.6% |
| B | NEW | A3 | −19 (−33 to −4; 124) | 14 | 0 | 19 / 50 | 64% / 33% / 1% / 2% | −2.6% / 4.2% |
| T1-later | NEW | A0r | −20 (−38.5 to −7; 127) | 13 | 0 | 13 / 35 | 52% / 45% / 2% / 1% | −3% / 4.2% |
| T1-later | NEW | A2 | −19 (−39 to −6; 153) | 6 | 0 | 14 / 41 | 63% / 33% / 2% / 2% | −2.1% / 3.4% |
| T1-later | NEW | A4 | −13 (−33.8 to −4; 142) | 13 | 0 | 14 / 46 | 67% / 28% / 3% / 1% | −2.4% / 3.6% |

- **Entries came early in the decline.** The median first entry into an episode was 13–21 sessions *before* its trough
  in fold B for every procedure (the sealed A0 on ARCH: −20; a quarter of first entries 40 or more sessions early) and
  5–15 sessions before it in fold A — the mechanics behind fold B's falling knives. The arms that entered somewhat
  later in 2022–23 (A2 −15 / −16, A4 −13 against the baselines' −20) did not do better.
- **Missed majors** are major families in which a nominee never entered: 13 for the sealed A0 in fold B against 8–16
  for the wide arms; A3 on ARCH missed fewer (8) and still lost more than A0.
- **Continuation entries high in a rebound** (episodes with a continuation entry and no dip entry) are practically
  absent (0–1 per cell).
- **Holding and exits:** median holding 13–22 days; the wide tail-compatible and support arms (A2, A3, A4) exit by the
  maximum-hold limit more often (63–68% of 2022–23 lots against 52–54% for the baselines and A1) — their phenotypes
  hold longer.

## 4. Portfolio overlay (20% of marked equity per lot on a $300,000 60/40 VOOG/VGT core, 5 bps)

| Window | Pool | Arm | Mean window equity increment over C0 (per nominee) | Median max daily % DD after the boundary | Nominees with > 30% / > 35% |
|---|---|---|---:|---:|---|
| A | ARCH | A0 | +$52,936 | 11.7% | 0 / 0 |
| A | ARCH | A2 | +$43,022 | 11.7% | 0 / 0 |
| B | ARCH | A0 | −$15,061 | 34.0% | 54 / 23 |
| B | ARCH | A2 | −$16,309 | 34.3% | 54 / 23 |
| B | NEW | A3 | −$9,865 | 34.0% | 48 / 18 |

In 2022 the 60/40 tech-heavy core itself fell by roughly a third; every overlay exceeded the preferred 30% ceiling for
nearly every nominee and the conditional 35% ceiling for a third of them. Increments over C0 partly reflect
compounding differences and are not pure strategy returns.

## 5. By event family (descriptive; `results/tables/event-families.csv`)

`scripts/event_families.py` writes one row per (window, ETF, eligible catalog family, primary nominee): the family's
depth, dates and major flag and what that nominee did in it (entries, dip entries, decline entries, dip-captured, net
at 5 bps); 6,410 rows over the attributed windows (A0/A0r, A1, A2, A3 at K = 16 and A4(16), the arms of
`nominees.csv`; its dip-captured totals equal ANALYSIS.json's in all 68 cells). Its summary (families dip-captured, summed over ETFs) shows that
equal counts hide large turnover between procedures:

| Window | Pool | Arm | Dip-captured | Shared with the baseline | Arm only | Baseline only |
|---|---|---|---:|---:|---:|---:|
| A | ARCH | A1 / A2 / A3 | 17 / 16 / 12 | 12 / 10 / 7 | 5 / 6 / 5 | 8 / 10 / 13 |
| B | ARCH | A1 / A2 / A3 | 47 / 45 / 52 | 33 / 29 / 27 | 14 / 16 / 25 | 19 / 23 / 25 |
| B | NEW | A1 / A2 / A3 | 46 / 40 / 50 | 31 / 27 / 26 | 15 / 13 / 24 | 9 / 13 / 14 |
| B | ALL | A1 / A2 / A3 | 49 / 43 / 57 | 36 / 31 / 32 | 13 / 12 / 25 | 17 / 22 / 21 |
| T1-later | NEW | A2 / A4 | 60 / 42 | 37 / 22 | 23 / 20 | 15 / 30 |

(Baselines: the sealed A0 on ARCH, A0r elsewhere.) A3 on ARCH in fold B dip-captured as many families as A0 (52) but
only 27 of the same ones. Which families a procedure catches depends heavily on the phenotype chosen; no procedure
caught a superset of the baseline's.
