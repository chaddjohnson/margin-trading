# Stage A — opportunity screen of the seven candidates (training only)

`npm run complementary-etf-d1 -- screen`; rubric frozen in `PROTOCOL.md` §3 (sha256 `4b7c6e94…`, 2026-10-24T11:31:13Z)
before any figure below existed. Tables: `results/stageA/SCREEN_TABLES.md`; every proxy and episode:
`results/stageA/proxies/`, `results/stageA/episodes/`; the record: `results/stageA/screen.json`.

**Outcome: no candidate is selected.** All seven fail at least one predeclared gate. The decisive gate is
economics: no candidate's clean idle-pool proxies are profitable at 5 bps once their single best proxy is removed.
Stage B therefore optimizes nothing (zero selections is a valid outcome of the protocol), and no allocator scenario is
added. Post hoc diagnostics with the actual minute-level D1 (§5) point the same way.

## 1. What was measured

- **Data:** the split-adjusted training partition of each candidate (2,012 sessions, 2016-01-04 → 2023-12-29), read
  with `access: 'optimization'`; screening window 2017-06-15 → 2023-12-29 (1,647 sessions).
- **Baseline pool:** the All-lowDd shadow fixed-$100,000 run on `--dataset training` (the canonical path): **71 funded
  lots, net $249,174, 66 refused virtual trades**; the pool holds a lot at the close in **843 of 1,647** eligible
  sessions (51%). Occupancy is taken from the run's exact lots (decision minute → exit minute), not inferred from
  correlations.
- **Proxy p15** (the primary daily proxy): arm when a session's low is ≥ 15% below the 74-session high; buy at the
  close of the first session ≥ 2% above the lowest close since arming; sell after a 10% close-to-close stop or 20
  sessions; $100,000, 11% simple interest, 5 bps per side. *Idle at entry* = no funded baseline lot at the entry close;
  *clean* = idle and no baseline decision falls inside the proxy's holding interval (it would have been refused).
  These are daily proxies, not D1 fills; returns are retrospective diagnostics.

## 2. Episodes (74-session reference high, 2017-06-15 → 2023-12-29)

| ETF | Priority | 10–15% | 15–20% | 20–30% | 30%+ | Episodes ≥ 15% | Years with one | Deepest |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| GDX | high | 2 | 5 | 2 | 4 | 11 | 7 | 49.2% |
| XOP | high | 8 | 5 | 5 | 4 | 14 | 7 | 73.7% |
| EWZ | high | 3 | 5 | 1 | 4 | 10 | 7 | 58.5% |
| TLT | high | 1 | 0 | 3 | 1 | 4 | 3 | 40.8% |
| XLE | lower | 11 | 2 | 3 | 2 | 7 | 6 | 63.4% |
| XLU | lower | 4 | 2 | 2 | 1 | 5 | 4 | 38.9% |
| GLD | lower | 2 | 1 | 1 | 0 | 2 | 2 | 22.1% |

GDX, XOP and EWZ have broad, multi-regime dip histories (every year 2017–2023 has a ≥ 15% episode); TLT's are the
2020–2023 rate cycle; GLD barely dips by D1's standards.

## 3. The incremental view against the busy pool (p15, 5 bps per side)

| ETF | Proxies (years) | Idle at entry | Clean | Baseline lots inside proxies (VGT) | Net, all proxies | Net, clean | Clean without the best | Clean net, 0 bps | Wins |
|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| GDX | 38 (7) | 15 | 8 | 38 (5) | +$25,674 | +$6,578 | **−$758** | +$7,392 | 19/38 |
| XOP | 47 (7) | 14 | 10 | 32 (6) | +$12,228 | −$5,104 | **−$14,163** | −$4,101 | 22/47 |
| EWZ | 35 (7) | 15 | 10 | 25 (5) | −$940 | −$19,257 | **−$33,445** | −$18,269 | 18/35 |
| TLT | 10 (4) | 4 | 0 | 16 (5) | −$31,947 | $0 | $0 | $0 | 3/10 |
| XLE | 27 (6) | 7 | 5 | 20 (5) | +$29,718 | −$12,798 | **−$19,209** | −$12,306 | 10/27 |
| XLU | 9 (4) | 1 | 1 | 7 (2) | +$3,338 | +$1,126 | $0 | +$1,228 | 5/9 |
| GLD | 1 (1) | 0 | 0 | 0 (0) | +$33 | $0 | $0 | $0 | 1/1 |

The pattern is the same for every candidate: the proxies make
money mostly where the pool is already busy or about to be — the March 2020, 2018 and 2022 sell-offs that also arm
VGT, XBI, XRT and KRE — while the dips that fall in idle time are few (0–10 in six and a half years) and roughly break
even after 11% financing. Correlations of daily returns with the core and the books are low for GDX (ρ VOOG 0.16),
GLD (0.05) and TLT (−0.16) and moderate for XOP, EWZ, XLE, XLU (0.47–0.52), but low correlation did not produce idle
timing: the dips that matter for D1 cluster in the same crises.

## 4. Gates, scores and the selection

| ETF | Priority | Data | Liquidity | Breadth (≥ 5 in ≥ 3 yrs) | Timing (≥ 3 clean) | Economics | T | B | E | Composite |
|---|---|---|---|---|---|---|---:|---:|---:|---:|
| XOP | high | pass | pass | pass | pass | **fail** | 0.83 | 1.00 | 0.33 | 0.733 |
| GDX | high | pass | pass | pass | pass | **fail** | 0.67 | 0.83 | 0.50 | 0.667 |
| EWZ | high | pass | pass | pass | pass | **fail** | 1.00 | 0.67 | 0.00 | 0.600 |
| XLU | lower | pass | pass | pass | **fail** | **fail** | 0.33 | 0.33 | 0.83 | 0.483 |
| XLE | lower | pass | pass | pass | pass | **fail** | 0.50 | 0.50 | 0.17 | 0.400 |
| TLT | high | pass | pass | pass | **fail** | **fail** | 0.08 | 0.17 | 0.83 | 0.333 |
| GLD | lower | pass | pass | **fail** | **fail** | **fail** | 0.08 | 0.00 | 0.83 | 0.283 |

Rejections:

- **XOP** — the broadest dip history and the best composite, but its 10 clean proxies lose $5,104 (−$14,163 without
  the best). Most of its profitable dips (2018 Q4, March 2020) are when the pool is occupied. Redundant with XLE
  (ρ 0.91) in any case.
- **GDX** — the most promising economics: +$6,578 on 8 clean proxies, but that rests on one proxy (2017-12-13 →
  2018-01-12, +$7,336); without it −$758. Fails the predeclared "not one episode" condition, narrowly.
- **EWZ** — 10 clean proxies lose $19,257; Brazil-specific shocks (2017-05-18, the 2021–2022 drawdowns) do not
  rebound reliably within the proxy's horizon.
- **TLT** — no clean proxy: its four deep episodes (2020–2023) all coincide with funded baseline lots; the rate-cycle
  declines are long and do not rebound in 20 sessions (net −$31,947 over all proxies).
- **XLE** — 5 clean proxies lose $12,798. The eight-ETF program already optimized XLE (§5): its walk-forward failed
  and it never traded in the 2024–2025 holdout.
- **XLU** — one clean proxy in six years.
- **GLD** — one ≥ 15% proxy in six years; D1's dip scale does not fit gold.

No lower-priority ETF came near the "clearly better" margin, and no redundancy rule was needed.

## 5. Post hoc diagnostics (non-decisional): does the daily proxy misjudge D1?

`npm run complementary-etf-d1 -- diagnose` (`results/stageA-diagnostics/`), training only, run after the result
above and changing nothing. It classifies **actual minute-level D1 trades** against the same pool: a trade is
fundable when no baseline lot holds the pool at its decision minute, and its first-order incremental value is its net
minus the net of the baseline lots whose decisions fall inside it (path effects of a full allocator run ignored). The
engine reproduces the shipped D1 file trade for trade on every candidate (`results/parity/`).

| ETF | Vector | Standalone training net / minute DD / entries | Fundable (clean) | Fundable net | Displaced baseline lots (VGT) / their net | First-order incremental |
|---|---|---|---|---:|---|---:|
| GDX | unchanged D1 | $80,782 / $56,875 / 37 | 19 of 37 (9) | +$56,180 | 16 (2) / +$65,274 | **−$9,094** |
| XOP | unchanged D1 | $82,894 / $142,788 / 79 | 29 of 79 (17) | +$17,730 | 14 (7) / +$134,941 | **−$117,211** |
| EWZ | unchanged D1 | −$10,185 / $59,907 / 41 | 23 of 41 (13) | −$72,113 | 14 (3) / +$22,763 | **−$94,876** |
| TLT | unchanged D1 | $14,790 / $13,690 / 5 | 3 of 5 (0) | +$4,654 | 16 (0) / +$22,718 | **−$18,064** |
| XLE | unchanged D1 | $26,974 / $72,402 / 32 | 7 of 32 (1) | −$65,878 | 9 (3) / +$11,401 | **−$77,279** |
| XLU | unchanged D1 | $23,741 / $18,714 / 7 | 2 of 7 (0) | +$8,652 | 4 (1) / +$59,547 | **−$50,895** |
| GLD | unchanged D1 | no trade | — | — | — | $0 |
| XLE | eight-ETF frozen primary (X 28.0% Y 2.7% L 52 stop 6.5% hold 4 …), in-sample | $154,448 / $24,861 / 23 | **1 of 23** (0) | +$23,915 | 2 (0) / +$2,390 | +$21,525 ($0 without that trade) |
| XLE | eight-ETF frozen lowDd (X 29.7% …), in-sample | $120,741 / $22,438 / 25 | **1 of 25** (0) | +$11,064 | 1 (0) / +$247 | +$10,817 ($0 without it) |

The same accounting on the p15 proxies (5 bps): first-order incremental −$21,727 (GDX), −$24,833 (XOP), −$76,972
(EWZ), −$46,096 (TLT), −$17,105 (XLE), +$1,126 (XLU, one trade), $0 (GLD).

What this says:

- With the real D1 the picture is the same as with the proxy: every candidate's fundable trades are worth less than
  the baseline trades they would displace, mostly KRE and XBI lots during the same sell-offs.
- An optimizer can make a candidate profitable **standalone** (XLE: $154,448 in-sample, against $26,974 unchanged),
  but it does so by concentrating on the deep crisis dips, and **22 of the optimized XLE vector's 23 training trades
  start while the All-lowDd pool is already funded** — they would be refused by the shadow allocator. Optimizing a
  candidate alone does not create idle-pool timing; nothing in the D1 search sees the pool.
- The screen's null is therefore not an artifact of the daily proxy. Its precise thresholds remain a predeclared
  judgement; they were not revisited.

## 6. Sensitivities (reported, not used)

- **p20** (20% arming): clean proxies 0–8, clean net −$12,889 (EWZ) to +$3,134 (GDX, 4 proxies).
- **L = 230** (the books' long lookback): clean net −$29,332 (GDX), −$11,532 (XOP), −$8,725 (EWZ), −$6,212 (XLE),
  +$1,086 (XLU, 2 proxies).
- **Distributions:** the break-even constant yield that would flip the economics gate is 22.6% (XOP), 60.4% (EWZ),
  68.7% (XLE) and 1.37% (GDX); GDX distributes annually in late December and its only clean proxy across an ex-date is
  the best one, already excluded (`DATA_AND_CORPORATE_ACTION_AUDIT.md` §6).

None of these changes a gate outcome.
