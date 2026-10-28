# Baseline occupancy and idle opportunities (Level D — first-order, descriptive)

**Evidence level:** first-order bookkeeping against the **unchanged** B4/B5 funded paths (frozen engine, 5 bps, 11%),
retrospective. It is **not** a counterfactual: what happens when a candidate actually shares the slot is in
`EXACT_SHARED_POOL_COUNTERFACTUALS.md`. Sources: `results/leveld/*` (sealed), `results/tables/leveld.md`,
`results/tables/leveld-per-etf.csv` (every ETF × view-window × baseline), `npm run d1-signal-complementarity --
occupancy --baseline B5 --window T`, `candidate --symbol XOP --baseline B4`. ° = designer-seen (T, B4); ᵗ = F7 thin.

## 1. How busy is the one shared slot?

| Window | Pool | Lots entered | Slot held (session-minutes) | Idle | Sessions with a lot at the close | Idle stretches | Idle minutes with **no** View U ETF armed or holding |
|---|---|---:|---:|---:|---|---:|---:|
| T 2017-06-15 → 2023-12-29 | B4 | 71 | 51.0% | 49.0% | 843 / 1,647 | 72 | 20.5% |
| T | B5 | 82 | 51.8% | 48.2% | 858 / 1,647 | 83 | 20.9% |
| A 2020-07 → 2021-12 | B4 | 12 | 60.7% | 39.3% | 232 / 380 | 12 | 0.0% |
| A | B5 | 20 | 55.4% | 44.6% | 213 / 380 | 20 | 0.0% |
| B 2022-01 → 2023-12 | B4 | 49 | 58.1% | 41.9% | 292 / 501 | 50 | 5.3% |
| B | B5 | 42 | 68.2% | 31.8% | 340 / 501 | 43 | 6.9% |

Pending reservations (decision → fill) occupy < 0.01% of the minutes. B4's 843 of 1,647 sessions reproduces the
seven-ETF screen's and the opportunity map's published 51%.

**Where the slot sat idle.** The longest idle stretch of both pools is **2017-06-15 → 2018-12-21 (384 sessions)** —
the 2017–18 advance — during which View U produced 55 decisions (EWW, EWZ, GDX, IBB, IJH, IJR, ILF, IWM, IWN, IYT,
KBE, KRE, SMH, VGT, …); counted minute-precisely, the 39 non-member decisions that arrived while B5 was idle there
netted −$54,011 (B4: 41, −$53,260; `results/tables/idle-stretch-decisions.md`). Next: 2019-05-13 → 2019-08-05 (59 sessions, 17 decisions), 2021-10-06 → 2021-12-21 (54; EWZ,
GDX, ILF, SLV, XBI, XOP), 2021-07-26 → 2021-09-22 (42), 2021-05-11 → 2021-06-21 (29). B5 ends the training era idle
(2023-12-15 → 29, no decision of any ETF). The only idle stretch whose idle-at-decision trades were profitable is B5's
2022-12-15 → 2023-01-03 (late-2022 rebound; 8 decisions, +$25,212). Prolonged advances leave the slot idle *and* leave almost every ETF without
a deep D1 dip.

**Q7 — lack of dips versus a busy slot.** About **one fifth of the training-era idle time had no ETF at all armed or
holding** under the uniform rule (no dip deep enough anywhere); in fold A no idle minute was without some armed ETF,
in fold B 5–7%. So idle time is mostly *not* empty of signals — but (§2) the signals that arrive in it are the weak,
early or isolated ones.

## 2. When do the 61 ETFs' signals arrive? (View U, training era, non-members of the pool)

| | Against B4 | Against B5 |
|---|---:|---:|
| Decisions (ETFs not in the pool) | 690 | 654 |
| … arriving while the pool holds a lot (busy) | 429 (62%) | 442 (68%) |
| … of which during a **profitable** incumbent holding / a losing one | 339 / 90 | 361 / 81 |
| Standalone net of the busy trades (summed across separate slots) | +$1,265,219 | +$1,332,981 |
| Idle-displacing (free at entry, would block a later incumbent entry) | 188, net +$56,862 | 153, net −$109,724 |
| **Idle-clean** (free throughout) | **73, net −$65,058** | **59, net −$52,477** |
| ETFs with a positive idle-clean total | 2 (ILFᵗ +$13,020; VPUᵗ +$124) | 1 (ILFᵗ +$13,020) |
| Idle-clean decisions in broad-shock / off-shock regimes; profitable off-shock | 22 / 51; 10 | 18 / 41; 8 |

**The profitable D1 signals of the 61 ETFs arrive overwhelmingly while B4/B5 already hold the slot, and mostly while
the incumbent's own trade is profitable** (the same shocks). What arrives while the slot is free and stays free is a
small, net-negative set. The busy-trade sum is a sum over 61 separate slots and is not attainable by one slot.

Per ETF (B4; full table `results/tables/leveld.md`): XOP° 78 decisions, 49 busy, 17 idle-clean (−$9,346), 12
idle-displacing (+$24,146), first-order Δ −$118,582; GDX° 36 / 17 / 8 (−$8,184) / 11 (+$69,999), first-order +$1,494;
EWZ° 41 / 18 / 13 (−$15,575) / 10 (−$58,618); XLE° 32 / 25 / 1 / 6 (−$64,892); XME 34 decisions, standalone +$136,326,
98% of its positive net in busy or displacing trades; SMH 26, standalone +$82,195, 100% competing; ILFᵗ 25 decisions,
standalone +$397, 6 idle-clean (+$13,020) in one independent event. (U-GDX against B5 shows 11 idle-clean trades
(+$48,841), but GDX is already a B5 book — a second GDX book is not an addable candidate.)

## 3. The fold windows and the fitted phenotypes

| View-window vs B5 | Decisions | Busy | Idle-clean | Idle-clean net | Positive idle-clean ETFs |
|---|---:|---:|---:|---:|---|
| U-A (2020-07 → 2021-12) | 68 | 54% | 10 | −$12,416 | none |
| U-B (2022-01 → 2023-12) | 250 | 68% | 11 | −$23,305 | none |
| P-A (fold-a A0s) | 155 | 52% | 24 | −$18,696 | XME +$3,809, FXI +$389 |
| P-B (fold-b A0s) | 515 | 71% | 21 | −$32,687 | SMH +$3,798 |

Against B4: U-A 78 / 60% / 13 / −$17,391; U-B 267 / 59% / 20 / −$31,663 (XOP +$1,503, VPU +$124); P-A 165 / 58% / 25 /
−$19,234; P-B 522 / 59% / 46 / −$58,234 (SLV +$5,815, SMH +$3,798, EWW +$3,449, IJH +$2,209, XLF +$482 — each one trade).
The ETF-specific phenotypes do not find a hidden idle-time edge: their idle-clean totals are negative in both folds and
their positives are single trades.

## 4. Comparison with the seven-ETF daily-proxy screen

The proxy screen (daily bars, its own entry/exit rule) counted clean proxies GDX 8, XOP 10, EWZ 10, TLT 0, XLE 5,
XLU 1, GLD 0 and found every one uneconomic. With the real D1 minute signals (View U against B4): idle-clean GDX 8,
XOP 17, EWZ 13, TLT 0, XLE 1, XLU 0, GLD 0 (GLD never arms at 21.6%), nets GDX −$8,184, XOP −$9,346, EWZ −$15,575, XLE
−$1,623. The real signals agree with the proxy's conclusion (little clean idle-time opportunity, none economic), but the
proxy's first-order "incremental" figures are not counterfactuals: XOP's first-order Δ (−$118,582 here at 5 bps,
−$117,211 in the proxy study's 0 bps diagnostic) has the opposite sign to its full-path Δ (+$48,199;
`EXACT_SHARED_POOL_COUNTERFACTUALS.md`).

## 5. Answers to the mandatory per-ETF questions

For every ETF, view-window and baseline, `results/tables/leveld-per-etf.csv` gives: eligible dip episodes (and
major), armed setups, decisions, fills, wins/losses, standalone net; busy (held / reserved; during the incumbent's
profitable / losing holdings); idle-clean and idle-displacing counts and nets, worst idle-clean lot and net per
occupied day; first-order Δ; years; idle-clean years, shock/off-shock counts; families, solo families, independent
idle-clean events (positive); the largest family share of idle-clean net, idle-clean net without its best episode,
the competing share and the leading share. **No ETF combines a positive idle-clean total with positive idle-clean
trades in two independent events** under the uniform rule against either pool (XOP° and GDX° have winning idle-clean
trades in 2–4 independent events against B4, but their idle-clean totals are −$9,346 and −$8,184; ILFᵗ's positive total
rests on one event). The clean opportunities that exist are concentrated in quiet regimes (mid-2018, 2019, 2021) and
are net losers in aggregate.
