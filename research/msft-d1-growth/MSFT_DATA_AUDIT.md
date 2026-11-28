# MSFT data audit (brief Phase 1) — machine-readable record: `MSFT_DATA_AUDIT.json`

**Verdict: a complete, validated MSFT research set — no blocker.** Every NYSE session 2016-01-04 → 2026-10-30 is present
(2,723 of 2,723); MSFT had no split in the window (its ninth and last split, 2:1, was on 2003-02-18) and the raw prices
need no adjustment; no bar was filled, invented or dropped. Written before the protocol freeze; for the validation period
only coverage and integrity counts were computed (no 2025–2026 return was read).

## 1. Source and acquisition

| Item | Value |
|---|---|
| Vendor / feed | Alpaca Markets Data API v2, `/v2/stocks/MSFT/bars`, **SIP** (consolidated, all US exchanges; never IEX), 1Min, `adjustment=raw` — the repository's canonical source and convention (the 61 canonical ETF files, TSLA) |
| Command | `( set -a; . ./.env; set +a; OUTPUT_DIR=data scripts/download.sh MSFT 2016-01-04 2026-10-30 )` (2026-11-28T08:23:45Z → 08:26:58Z; log `cache/logs/download.log`, git-ignored), then `npm run datasets -- import MSFT --dry-run`, `npm run datasets -- import MSFT --keep-source`, `npm run datasets -- verify MSFT` (VERIFIED); the staging file `data/MSFT.csv` was removed after its sha256 was re-checked equal |
| Credentials | the existing `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` of the git-ignored `.env`, exported into the download subshell only; never printed, logged or committed (the log was scanned: no secret text) |
| Entitlement and cost | the existing account's historical SIP access (no new service, no purchase, no incremental cost) |
| API accounting | **162 requests** (pages of ≤ 10,000 bars, one sequential request per page; Alpaca's documented basic-plan limit is 200 requests per minute) |
| End requested | 2026-10-30 (Alpaca reads a date-only end as the end of that UTC day). Later sessions were deliberately **not requested**: no data after the program's endpoint exist in the file, so nothing implies that November 2026 was tested |
| Canonical file | `data/MSFT/data.csv` — **1,619,189 rows**, 90,939,174 bytes, sha256 **`b2d79f9425e9f79eb3f59584a3bdfc3b7f797124f247399b759f2aab1a98be91`**, first row 2016-01-04T09:00:00Z, last 2026-10-30T23:59:00Z; import scan: 0 malformed, 0 out of order, 0 duplicates, 0 out of range, 0 unaligned seconds, 0 inconsistent prices |
| Import report | `data/MSFT/dataset-report.json` (status verified, sha256 `62630ce3…`; the only note: bars after 1 p.m. on the 21 early-close days — after the scheduled close, never traded on) |
| Standard 4.0.0 data pin | `npm run datasets -- prefix MSFT --through 2026-10-30` = the whole file (bytes 90,939,174, sha256 `b2d79f94…`; `nextRowUtc` null) |

## 2. Sessions, minutes and the endpoint

| Measure | Development 2016-01-04 → 2024-12-31 | Validation 2025-01-02 → 2026-10-30 |
|---|---:|---:|
| Sessions (NYSE calendar, `src/lib/calendar.ts`) | 2,264 | 459 |
| Missing / extra sessions | 0 / 0 | 0 / 0 |
| Early closes (data / calendar) | 18 / 18 | 3 / 3 |
| Scheduled regular minutes | 879,720 | 178,470 |
| Missing regular minutes (no trade in that minute: no bar) | **115 (0.01 %)** | **0** |
| Sessions missing > 5 minutes / sparse (< 50 %) | 6 / 0 | 0 / 0 |
| Intra-session gaps ≥ 5 minutes | 6 | 0 |
| Duplicate / out-of-order / inconsistent OHLC bars | 0 / 0 / 0 | 0 / 0 / 0 |
| Sessions with a closing-auction print (the 16:00 / 13:00 bar) | 2,264 | 459 |
| Minute outliers (\|close-to-close\| > 5 %) | 0 | 0 |

**The six gaps, kept as they are (never filled):** 2016-02-02 (9 minutes, 11:18–11:27 ET) and **2016-02-22 (46 minutes,
10:25–11:12 ET)** — both appear at the same minutes in the canonical TSLA file (and 2016-02-02 also in VGT's), so they are
gaps of the historical source feed, not MSFT halts — and the four March 2020 market-wide Level-1 circuit-breaker halts
(2020-03-09, -12, -16, -18; 14 minutes each). The engine's session clock treats a minute without a trade as having no bar
(the canonical convention); a strategy simply sees no price in such a minute.

**Endpoint.** The study's common complete endpoint is **2026-10-30** (research date range R1's validation end; the program's
endpoint, identical to P6-TSLA's and P8-GDX's). MSFT has a complete regular session on it and none is missing before it.

## 3. Regular-session semantics (brief Phase 1 item 6)

- The file keeps the raw pre-market and after-hours bars as delivered: **558,391 rows outside the regular session** (plus
  2,723 closing-print minutes; the import scan's 561,114 "extended-hours bars" count both).
- The canonical grouping (`src/lib/session.ts groupMarketSessions`) makes bars only of the regular minutes 09:30–15:59 New
  York (to 12:59 on early-close days) and takes the **open of the scheduled close minute's bar** (16:00, or 13:00) as the
  closing-print proxy. Pre- and post-market rows never enter a signal, high/low, stop, mark or execution. Gate E2 verifies
  it on every door: 0 bars outside the regular minutes, a closing-print proxy on all 2,723 sessions, the 21 early closes end
  at 13:00 (`results/engineering/E2-data.json`).
- An overnight move reaches a strategy only through the next regular-session open (stops fill at the stop level or the
  gapped open). Largest development opening gaps: −11.1 % (2020-03-16), −8.0 % (2022-10-26), +7.7 % (2023-04-26), +7.1 %
  (2017-10-27), −6.9 % (2016-04-22). No pre-market execution is simulated.
- Execution resolution is the minute bar (fills at the next minute's open, the closing print or the next session's
  opening trade; `firstTradeAfterDecision`); no tick-by-tick precision is claimed. MSFT is among the most liquid US
  equities (median daily dollar volume ≈ $4.29 billion in development; 390 regular bars in a median session), so the
  $100,000 lot is small relative to minute volume; the 5 bps per side cost and the 10 / 20 bps stresses bound the
  execution assumption.

## 4. Corporate actions and the price basis

| Check | Result |
|---|---|
| Central split ledger `config/market-events/splits.json` (sha256 `e5bde427…`, pinned by the doors) | **0 MSFT events** |
| Raw overnight moves outside [0.6, 1.6] (split-sized) on FULL | **0** |
| Independent split events (Yahoo Finance chart API, 1986-03-13 → 2024-12-31) | 9 splits: 1987-09-21 2:1, 1990-04-16 2:1, 1991-06-27 3:2, 1992-06-15 3:2, 1994-05-23 2:1, 1996-12-09 2:1, 1998-02-23 2:1, 1999-03-29 2:1, **2003-02-18 2:1** — none in the study window |
| Our raw closes vs Yahoo's split-adjusted (not dividend-adjusted) closes, every development session (2,264 compared, 0 missing at Yahoo) | max deviation **1.42 %** (2020-03-18), p99 **0.19 %**, 1 session above 1 % |

- **Adjustment:** none needed; the canonical forward adjustment (`adjustSessionsForSplits` with the central ledger) is the
  identity on MSFT (gate E2: re-applying it changes nothing; applied exactly once by construction). Volumes, shares and
  market values are therefore in raw units throughout.
- **The 2020-03-18 finding (disclosed, not repaired):** our close 142.39 is the canonical closing-print proxy (the open of
  the 16:00 bar); the independent consolidated close is 140.40. On that crash session the official auction print lay
  elsewhere in that minute's range. It is the frozen data convention of every study of the program and of the accepted GPU
  evaluator; every other development close is within 1 %.
- **Dividends (not a price adjustment):** MSFT paid **36 quarterly dividends** in 2016–2024, **$19.47 per share** in total
  ($0.36 per quarter in 2016 rising to $0.83 in 2024-11), listed in the JSON. **Price-only convention, unchanged (every
  strategy of the program):** a trading lot is never credited a dividend and the raw ex-date drop (≈ 0.2–0.3 % of the price
  per quarter) is part of its P&L, while interest is charged on the full principal. This is the important difference from
  TSLA (which paid none): MSFT trading results are biased slightly **downward** against a total-return holder, most for long
  holds (open-ended Growth). Splits and dividends are kept apart — no dividend is converted into a price adjustment, so
  nothing is counted twice. The report-only analyses (PROTOCOL.md §15) quantify the per-lot entitlement and compare
  buy-and-hold with and without dividends; the 2025–2026 dividends are fetched only after the sealed validation.

## 5. Doors (`data/DOOR_PINS.json`, sha256 `7deac6d79b56b2db4e331e45c1ab687a0b7f698ea196f7dc10e54fa40ed75f7f`)

| Door | Through | Rows | Sessions | Bytes | sha256 (prefix) |
|---|---|---:|---:|---:|---|
| D19 | 2019-12-31 | 494,593 | 1,006 | 27,264,769 | `0502be6b74e1e7f1` |
| D21 | 2021-12-31 | 815,243 | 1,511 | 45,413,285 | `ed4090774efcf68f` |
| D23 | 2023-12-29 | 1,130,503 | 2,012 | 63,270,707 | `7abf3d8677f51f99` (= the canonical training partition's) |
| D24 | 2024-12-31 | 1,284,455 | 2,264 | 72,004,079 | `7dd8a892816bd2dd` |
| FULL | 2026-10-30 | 1,619,189 | 2,723 | 90,939,174 | `b2d79f9425e9f79e` (= the canonical file) |

Each is a byte prefix verified by size, sha256 and last-row time before parsing (`src/msft-d1-growth/doors.ts`); FULL opens
only for the validation (after the committed frozen selection) and, before the freeze, only for data-integrity checks (this
audit, gate E2). Gate E2 shows each door equals the canonical partition load session by session and bar by bar and each
shorter door is a prefix of the next (causal access).

## 6. Development-only suitability (report-only; `reports/data/SUITABILITY.json`, door D24, never 2025–2026)

| Measure | Value |
|---|---|
| Daily returns | mean +0.10 %, sd 1.69 %, **annualized volatility 26.9 %** (TSLA 58.9 %); 1st / 99th percentile −4.4 % / +4.7 %; worst −13.3 %, best +13.4 % |
| Overnight gaps | 1st / 99th percentile −2.8 % / +3.2 %; worst −11.1 % (2020-03-16); 16 gaps beyond ±5 %, 1 beyond ±10 % |
| Calendar years (return, intra-year max drawdown) | 2016 +14.4 % (15 %), 2017 +36.2 % (7 %), 2018 +17.8 % (19 %), 2019 +58.4 % (9 %), 2020 +40.2 % (31 %), 2021 +51.1 % (10 %), **2022 −28.4 % (37 %)**, 2023 +54.7 % (16 %), 2024 +12.8 % (18 %) |
| Holding windows (worst marked loss of a position bought at a close within H calendar days) | 15 d: median −2.3 %, 5th pct −9.6 %, worst −21.9 %; **30 d: median −3.1 %, 5th pct −12.2 %, worst −27.9 %, 0.7 % below −20 %, none below −35 %**; 60 d: worst −29.8 %, 2.0 % below −20 % |
| Dip episodes (close ≥ X below the prior L-session high; independent until the high is regained) | L 60: 12 (X 8 %), 9 (10 %), 4 (15 %), 2 (20 %), 2 (25 %), 0 (30 %); L 250: 11, 8, 4, 2, 2, 1 |
| Rise opportunities (close ≥ A above the prior N-session low; edge-triggered) | N 20: 144 / 72 / 3 (A 5 / 10 / 20 %); N 250: 12 / 12 / 16 |
| Liquidity | median daily dollar volume ≈ $4.29 billion (5th pct ≈ $1.02 billion); 390 regular minute bars in a median session |

**Implication (descriptive, decided nothing):** MSFT is far less volatile than TSLA; deep D1 dips (X ≥ 15 %) occurred only
about four times in nine years, so D1 signal scarcity and thin evidence are real possibilities, while a single $100,000 lot
held 30 days lost at most 27.9 % in development — the $35,000 ceiling binds less per lot than for TSLA. The boxes stay the
original D1 / Growth domains and ES1–ES3 are not lowered (brief Phase 3 item 7): no box, threshold or budget was derived from
this table.
