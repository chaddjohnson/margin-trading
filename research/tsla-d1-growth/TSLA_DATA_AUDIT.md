# TSLA data audit (brief §2) — machine-readable record: `TSLA_DATA_AUDIT.json`

**Verdict: a complete, validated TSLA research set — no blocker.** Every NYSE session 2016-01-04 → 2026-10-30 is present
(2,723 of 2,723), the two splits are documented by the issuer's SEC filings and an OCC memo, explain the raw gaps exactly
and agree with an independent price source; no bar was filled, invented or dropped.

## 1. Source and acquisition

| Item | Value |
|---|---|
| Vendor / feed | Alpaca Markets Data API v2, `/v2/stocks/TSLA/bars`, **SIP** (consolidated), 1Min, `adjustment=raw` — the repository's canonical source and convention (the 61 canonical ETF files) |
| Command | `( set -a; . ./.env; set +a; OUTPUT_DIR=data scripts/download.sh TSLA 2016-01-04 2026-10-30 )` (2026-11-25T11:09–11:13Z; log `cache/logs/download.log`, git-ignored), then `npm run datasets -- import TSLA --dry-run`, `npm run datasets -- import TSLA --keep-source`, `npm run datasets -- verify TSLA`; the staging file removed after its sha256 was re-checked equal |
| Credentials | the existing `ALPACA_API_KEY` / `ALPACA_SECRET_KEY` of the git-ignored `.env`, exported into the download subshell only; never printed, logged or committed (the log was scanned: no secret text) |
| Entitlement and cost | the existing account's historical SIP access (no new service, no purchase, no incremental cost) |
| API accounting | **198 requests** (pages of ≤ 10,000 bars, one sequential request per page; Alpaca's documented basic-plan limit is 200 requests per minute) |
| Canonical file | `data/TSLA/data.csv` — **1,975,254 rows**, 112,220,072 bytes, sha256 **`8ed7f7d07edb11893f57c24bee3c729e294ebda36d9aa7059e4f89e8e3b0da72`**, first row 2016-01-04T09:00:00Z, last 2026-10-30T23:59:00Z; import scan: 0 malformed, 0 out of order, 0 duplicates, 0 out of range, 0 unaligned seconds, 0 inconsistent prices; 917,671 extended-hours bars (outside the regular session: never traded on) |
| Import report | `data/TSLA/dataset-report.json` (status verified; the only anomaly note: bars after 1 p.m. on the 21 early-close days — after the scheduled close, not traded on) |

## 2. Sessions, minutes and the endpoint

| Measure | Development 2016-01-04 → 2024-12-31 | Validation 2025-01-02 → 2026-10-30 |
|---|---:|---:|
| Sessions (NYSE calendar, `src/lib/calendar.ts`) | 2,264 | 459 |
| Missing / extra sessions | 0 / 0 | 0 / 0 |
| Early closes (data / calendar) | 18 / 18 | 3 / 3 |
| Scheduled regular minutes | 879,720 | 178,470 |
| Missing regular minutes (no trade in that minute: no bar) | **607 (0.07 %)** | **0** |
| Sessions missing > 5 minutes / sparse (< 50 %) | 25 / 0 | 0 / 0 |
| Intra-session gaps ≥ 5 minutes (halts) | 7 | 0 |
| Duplicate / out-of-order / inconsistent OHLC bars | 0 / 0 / 0 | 0 / 0 / 0 |
| Sessions with a closing-auction print | 2,264 | 459 |
| Minute outliers (\|close-to-close\| > 5 %, adjusted) | 1 (2018-09-18) | 0 |

The seven halts, kept as they are (never filled): 2016-02-02 (9 minutes), 2016-02-22 (46), **2018-08-07 (96: the
"funding secured" halt)**, and the March 2020 market-wide circuit breakers 2020-03-09, -12, -16, -18 (14 each). The engine's
session clock treats a minute without a trade as having no bar (the canonical convention).

**Endpoint.** The study's common complete endpoint is **2026-10-30** — the program's endpoint (the brief: "historically
2026-10-30"); TSLA has a complete regular session on it and none is missing before it. Later sessions are obtainable from the
same source but were deliberately **not requested**, so no study read them; nothing implies that November–December 2026 was
tested.

## 3. Corporate actions and the price basis

| Effective date | Ratio | Authoritative sources | Raw close → open | Adjusted overnight move |
|---|---:|---|---|---:|
| 2020-08-31 | 5:1 | Tesla 8-K 2020-08-11 (accession 0001564590-20-039353) Ex. 99.1: record 2020-08-21, distributed after the close of 2020-08-28, split-adjusted trading from 2020-08-31 | 2,213.40 → 444.55 (÷ 4.979) | +0.42 % |
| 2022-08-25 | 3:1 | Tesla 8-K 2022-08-05 (0001564590-22-028207) Ex. 99.1: record 2022-08-17, distributed after the close of 2022-08-24, split-adjusted trading from 2022-08-25; OCC/ONN memo 50828 (ex-distribution 2022-08-25, multiplier 3) | 891.29 → 302.38 (÷ 2.948) | +1.78 % |

- **No other** split-sized overnight gap (open ÷ previous close outside [0.6, 1.6]) exists in the file; TSLA paid no dividend.
- **Independent check:** Yahoo Finance's chart API (split events and split-adjusted daily closes, retrieved 2026-11-25 for
  2010-06-29 → 2024-12-31 only — no 2025–2026 data requested; copy in the git-ignored cache, sha256 in the JSON) lists exactly
  the same two splits, and our forward-adjusted closes divided by Yahoo's adjusted closes equal the constant **15 = 5 × 3**
  within **0.12 %** (2020) and **0.06 %** (2022) over ± 5 sessions around each split (the residual is the closing-price
  definition: auction print versus last trade).
- **The price basis.** The canonical file is raw (unadjusted); the study's ledger `data/TSLA-splits.json` (sha256
  `e96d6236…`, the exact schema of `config/market-events/splits.json`) is applied once by the canonical function
  `adjustSessionsForSplits` (forward: prices × ratio, volumes ÷ ratio from each effective date), so every door is in
  2016-01-04 share units (×5 from 2020-08-31, ×15 from 2022-08-25). Shares are fractional; with percentage rules every
  decision, fill, cost basis, stop and P&L is the same as in split-adjusted units (no double adjustment: gate E2 shows that
  applying the ledger again would change the data, and that the doors equal the canonical partition load with the ledger).
- **Why not the central ledger.** `config/market-events/splits.json` (sha256 `e5bde427…`) is pinned by ≥ 45 frozen research
  records and three code modules whose integrity guards fail closed on any change; adding TSLA there would break their
  reproducibility checks. `npm run market-events -- verify` therefore lists the two TSLA gaps as "UNRECORDED" (informational;
  a partition run of TSLA **outside this study** would read raw prices). Registering TSLA centrally is a user decision.

## 4. Doors (`data/DOOR_PINS.json`, sha256 `193fc2068ca0f73e93040541809b5c1dbb155e8362672ffd3ab0bc1715f7b611`)

| Door | Through | Rows | Sessions | sha256 (prefix) |
|---|---|---:|---:|---|
| D19 | 2019-12-31 | 523,218 | 1,006 | `beda557c8653b984` |
| D21 | 2021-12-31 | 890,207 | 1,511 | `97c820869006e993` |
| D23 | 2023-12-29 | 1,316,306 | 2,012 | `6a5315f0b3a6687d` (= the training partition's) |
| D24 | 2024-12-31 | 1,545,446 | 2,264 | `66458793205dbab0` |
| FULL | 2026-10-30 | 1,975,254 | 2,723 | `8ed7f7d07edb1189` (= the canonical file) |

Each is a byte prefix verified by size, sha256 and last-row time before parsing; FULL opens only for the validation (after
the committed frozen selection) and, before the freeze, only for data-integrity checks (this audit, gate E2).

## 5. Development-only suitability (report-only; `reports/data/SUITABILITY.json`, door D24, never 2025–2026)

| Measure | Value |
|---|---|
| Daily returns | mean +0.21 %, sd 3.71 %, **annualized volatility 58.9 %**; 1st / 99th percentile −9.2 % / +11.0 %; worst −21.0 %, best +22.0 % |
| Overnight gaps | 1st / 99th percentile −7.0 % / +7.6 %; worst −14.8 % (2020-09-08), −14.3 % (2020-03-16), −13.8 % (2020-03-09); 99 gaps beyond ±5 %, 17 beyond ±10 % |
| Calendar years | 2016 −7.4 % (max DD 39 %), 2017 +44.8 % (25 %), 2018 +6.7 % (36 %), 2019 +36.7 % (50 %), 2020 +731 % (64 %), 2021 +46.9 % (40 %), 2022 −67.8 % (73 %), 2023 +110 % (35 %), 2024 +61.4 % (45 %) |
| Holding windows (worst marked loss of a position bought at a close within H calendar days) | 15 d: median −5.9 %, 5th pct −22.0 %, worst −53.2 %, 0.5 % below −35 %; **30 d: median −8.0 %, 5th pct −28.4 %, worst −61.8 %, 15.6 % below −20 %, 1.9 % below −35 %**; 60 d: 6.9 % below −35 % |
| Dip episodes (close ≥ X below the prior L-session high; independent until the high is regained) | L 20: 12 (X 8 %) … 6 (X 30 %); L 250: 11 … 5 |
| Rise opportunities (close ≥ A above the prior N-session low; edge-triggered) | N 20: 111 / 116 / 82 (A 5 / 10 / 20 %); N 250: 19 / 27 / 28 |
| Liquidity | median daily dollar volume ≈ $10.3 billion (5th pct ≈ $0.74 billion); 390 regular minute bars in a median session |

**Implication (descriptive, decided nothing):** with $100,000 per lot and the $35,000 marked-drawdown ceiling (35 % of the
allocation), one TSLA lot can breach the ceiling within days; the gates will bind hard, and "no qualifying candidate" is a
real possibility for some arms. The boxes stay the original D1 / Growth domains (brief §4: "Search original parameter
domains"); no box was narrowed or widened because of this table.
