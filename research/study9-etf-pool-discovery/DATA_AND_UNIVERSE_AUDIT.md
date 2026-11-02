# S0 — data and universe audit

**Scope:**

- the refresh of all 64 local ETF minute files;
- their audit;
- the eligibility decisions;
- the training projection that every later stage reads;
- the leakage tests.

**No strategy was run in S0.** No P&L, return or ranking was computed. After 2024 only coverage, completeness,
liquidity and structural checks were read: D1 checks completeness through 2026-10-30, and D3 scans the whole file for
split-sized moves. This is integrity checking, permitted by the brief §1.4. It changed no eligibility decision (61 of
61), and no post-2024 price move is listed anywhere.

**Records:**

- `results/s0/symbols.json` — every rule, flag and reason per symbol;
- `results/tables/s0-symbols.csv` and `.md`;
- `results/s0/inventory-pre-refresh.json` and `inventory-post-refresh.json`;
- `results/s0/data-vintage-manifest.csv`;
- `results/s0/projection.json`;
- `DATA_MANIFEST.md` — hashes, commands and versions.

## 1. Freshness: the latest complete session is Friday 2026-10-30

**Before the refresh:**

- 59 files ended on 2026-10-13;
- the five B5 books (VGT, XBI, XRT, KRE, GDX) ended on 2026-10-29. They were Study 8's pinned files; their hashes
  were verified equal to the pins.

**The refresh.** The repository's own Alpaca SIP pipeline (`scripts/download.sh` → `npm run datasets -- append`) added
only the sessions after each file's last New York date:

- the end parameter was 2026-10-31, i.e. 00:00 UTC, or 20:00 New York on Friday 2026-10-30;
- the refresh ran on Monday 2026-11-02 at 17:01–17:12 UTC, while that day's session was still trading, so it is
  excluded;
- 344,509 rows were added for 64 symbols: 13 sessions (2026-10-14 → 10-30) for 59 files and one session (10-30) for
  the five B5 files;
- no download failed, no retry was needed, and no symbol was quarantined.

**The provider set the date.** The Alpaca SIP feed through 2026-10-30 was available for all 64 symbols, so the date was
not limited by subscription or availability.

**The append's guarantees:**

- rows the canonical file already had must be byte-identical (none overlapped);
- the combined file is scanned in full;
- the training and holdout partition rows must be unchanged;
- the file is replaced atomically.

`datasets verify` then verified all 64.

**Study 8's vintage is preserved:**

- the pre-refresh files are kept as read-only hard links in `data/vintages/pre-study9-2026-11-02/`;
- every refreshed file's prior-length prefix hashes to its prior vintage;
- the five B5 files' Study 8-pinned-length prefixes still hash to Study 8's pins;
- Study 8's runner recognises such files as "pinned file + appended bytes (prefix verified)".

Any old benchmark period can therefore be reproduced byte for byte. No historical value was edited.

## 2. Inventory and identity

**64 files:**

- the 61 canonical ETFs of `research/d1-robust-pool-discovery/results/audit/universe.json` (sha256 `ea7011ff…`);
- GDXJ and OIH (the late cohort);
- XLRE.

`BTCUSDT` is a different format and not an ETF; it was left alone.

**Every file:**

- headerless, comma-delimited, one-minute bars;
- ISO UTC timestamps, strictly ascending;
- no duplicates, malformed rows or rows outside the partitions (`datasets verify`);
- SIP feed, raw (unadjusted) prices, extended hours included.

Strategies trade only the regular session (`src/lib/session.ts`). Per-file sha256, bytes, rows and last bar are in
`results/s0/data-vintage-manifest.csv`.

## 3. Eligibility (the d1-robust rules D1–D5, re-dated to this refresh)

| Rule | Criterion | Failures |
|---|---|---|
| D1 history | first regular bar on 2016-01-04; a regular bar on every NYSE session through 2026-10-30; none on a closed day | GDXJ, OIH (start 2016-05-02); XLRE (missing 2016-01-25 and 2016-02-16) |
| D2 integrity | `datasets verify` status verified and the hash matches its report | none |
| D3 corporate actions | no split-sized (30%) overnight move without a registered split | none (training and post-2024) |
| D4 structure | the predeclared structural classification (no leveraged, inverse, volatility, single-commodity-futures or ETN product) | none among the 61 (GDXJ, OIH and XLRE are not classified: they are not canonical) |
| D5 tradability | training (2016–2024) median regular-session daily dollar volume ≥ $10M and training median minute coverage ≥ 25% | none |

**Result: 61 eligible**, exactly the canonical 61. The three exclusions are the same as in every earlier study:

- GDXJ and OIH start four months late;
- XLRE is missing two NYSE sessions in 2016.

No ticker was substituted and none was silently added. VGT and GDX are not required in any pool (§5 of the protocol
puts them into four families instead).

All 61 share one calendar:

- the engine's session-by-session calendar check passed when all 61 were loaded into one universe: 2,264 identical
  sessions, 2016-01-04 → 2024-12-31;
- every file holds every NYSE session through 2026-10-30 (D1), so the later slices are equally complete.

The latest **complete common session** is **2026-10-30**.

## 4. Data quality: what is thin, what is sparse, and what is not corruption

**The labels are descriptive.** Equal liquidity is not required.

- **sparse:** training median minute coverage < 75%, or > 400 sparse training sessions. A sparse session has fewer
  than half its scheduled regular minutes with a bar.
- **thin:** training median daily dollar volume < $50M.

**Sparse and thin ETFs** (the previously flagged VOOG, EDV, IYT, VPU, KIE, QUAL and IGV, plus MTUM, DBC and ILF):

| ETF | Label | Train coverage | Sparse sessions (train / after 2024) | Train median $ volume | $100k lot ÷ median bar $ | Pattern |
|---|---|---:|---:|---:|---:|---|
| VOOG | sparse | 36.7% | 1,779 / 19 | $18.2M | 1.44 | thin every year (143 bars per session median) |
| EDV | sparse | 40.8% | 1,455 / 0 | $17.8M | 2.02 | thin until 2022, liquid since 2023 |
| IYT | sparse | 57.2% | 801 / 13 | $35.9M | 1.37 | intermittently thin |
| VPU | sparse | 57.9% | 714 / 73 | $22.0M | 1.91 | thin 2016–2019 and again recently |
| KIE | sparse | 74.4% | 646 / 0 | $13.8M | 3.17 | thin 2016–2019, liquid since 2021 |
| QUAL | sparse | 91.8% | 478 / 0 | $92.2M | 0.74 | thin 2016–2018 only |
| IGV | sparse | 85.3% | 424 / 0 | $159.8M | 0.37 | thin 2016–2018 only |
| MTUM | good | 88.2% | 225 / 0 | $85.2M | 0.75 | thin 2016–2017 only |
| DBC | thin | 83.8% | 7 / 46 | $25.8M | 3.32 | low dollar volume |
| ILF | thin | 92.8% | 10 / 0 | $31.6M | 2.87 | low dollar volume |

These are **legitimately illiquid periods, not corruption.** The checks:

- no zero-volume bar;
- no stale session (≥ 30 regular bars at one close);
- no unexplained split-sized move;
- normal flat-bar shares (one-print minutes in thin funds);
- complete session calendars.

**How the engine treats sparse data:**

- a sparse minute simply has no bar;
- the engine never trades a minute without a bar, and nothing is forward-filled;
- a signal or a stop on a thin ETF fills at the first bar that exists, as the engine's fill rules prescribe.

**What the backtests cannot show.** A $100,000 lot exceeds the median minute's dollar volume for seven ETFs (DBC, EDV,
ILF, IYT, KIE, VOOG, VPU). Their backtested fills are therefore less credible than live fills would be. The reports
carry these labels next to every pool that contains them, as earlier studies did; they stay eligible.

**Integrity across the universe:**

| Check | Result |
|---|---|
| Splits | 19 registered splits and reverse splits are forward-adjusted by the loader. They include EWJ 1:4 (2016), IAU 1:2 (2021), XOP 1:4 (2020) and OIH 1:20 (2020); the XLB/XLE/XLK/XLU/XLY splits of 2025-12-05; and VGT, VOOG and IWF in 2026. Adjusted-price continuity holds: no split-sized move remains unexplained, before or after 2024 |
| Overnight moves > 15% (training only) | EWZ 2017-05-18; XLF 2016-09-19 (the in-kind XLRE distribution; it cannot create a false reference high, see the d1-robust audit); the March 2020 crash days for EWZ, ILF, XLE, XLF and XOP. All are genuine market events |
| DST and session boundaries | a 09:30 New York first regular bar in ≥ 96.6% of sessions for every file, across every DST change, so the time-zone conversion is correct. Early-close days carry some bars after 13:00, and extended-hours bars exist (4,487–711,375 per file); both lie outside the regular session the engine trades, are reported, and fail nothing |
| Distributions | the fixed one-slot engine books none. Study 9 loads no distribution ledger, so the user's uncommitted `config/market-events/distributions.csv` is read by nothing in this study. Its divergence is recorded by hash and diffstat only (content not read) and left untouched: `distributions.csv` working copy `30feaa99…` against committed `3b4342eb…`; `distributions.manifest.json` `acb68cca…` against `d2c02b01…`; 18 insertions and 18 deletions in total; plus an untracked raw snapshot folder `raw/vanguard-20261030T184421Z/` (3 files) |

## 5. The training projection and the data doors

**The projection.** `data/vintages/study9-train-2024/` holds 61 read-only files (2.8 GB). Each is the canonical file's
exact bytes through the last bar of New York date 2024-12-31, i.e. a byte prefix:

- evening bars stamped 2025-01-01 UTC belong to 2024-12-31 and are included;
- each file's next canonical row is on 2025-01-02;
- the hashes are pinned at the protocol freeze.

**The door.** Every Phase A computation opens this projection through `door.ts`, which:

- refuses any end after 2024-12-31 and any other root, before reading a byte;
- asserts the first, eligibility and last sessions;
- hashes only the bytes it loads;
- logs every opening to `results/doors.jsonl`.

**The post-2024 slices** — 2025-01-02 → 2026-10-29 (exposed) and 2026-10-30 (the later slice) — therefore enter no
strategy computation, cache or door log. The S0 audit and parity gate E1 read post-2024 bytes, for integrity checks
only (completeness, splits, byte prefixes), and `results/s0/symbols.json` holds post-2024 aggregates (coverage,
dollar volume) but no price move or return.

## 6. Leakage tests (parity stage, sealed as chain phase `parity` `9d0f68ab…`, `results/parity/parity.json`)

All passed (373 s, 2026-11-02 19:21Z):

| Gate | What it proves | Result |
|---|---|---|
| G1 | The door refuses an end after 2024-12-31 and the canonical `data/` root, before reading a byte | pass |
| N1 | A door cut at 2019-12-31 reproduces the full run's closed lots, refusals and daily marks before the cut: B5, Study 8 #2 and three new pools, at base, next-open and +25 bps | 15/15 |
| N2 | Synthetic crash bars appended after 2024-12-31 to copies of six projection files (VGT, GDX, XLE, EWZ, TLT, KRE; five sessions in January 2025, −10% a day) change nothing at the cut | see below |
| E1 | The projection hashes equal the manifest and are byte prefixes of the refreshed files; all 64 prior-length prefixes equal the pre-refresh vintage; the five B5 files' Study 8-pinned-length prefixes equal their own Study 8 pins | pass |

N2's detail:

- the door id is unchanged (`32c332a1…`), and so are the per-file prefix hashes;
- all 21 records are byte-identical, at base, next-open and +25 bps, including configurations that hold a lot open
  on 2024-12-31;
- when the same copies are read past the cut, outside the door, net or lots change, so the test has power.

**Engineering parity, same stage.** It proves that the reused engine and the Study 9 extensions reproduce the
authoritative results, so the refreshed data and the new symbols change nothing they should not:

| Gate | Result |
|---|---|
| P1 | 56 runs against the authoritative engine (`runNAllocator`), 0 differences, including tie-heavy near-duplicate pools (598 same-minute decisions, 1,308 refusals) |
| P2 | the Study 9 evaluator equals Study 8's on B5-subset configurations |
| P3 | **all 61 sealed Study 8 F24 training-door centres** (candidates and controls of the six tracks) reproduced to the cent, and the sealed 384-point confirmation summaries of #1 and #2 VG reproduced exactly |

## 7. Eligible universe by cluster (61)

| Cluster | ETFs |
|---|---|
| us-tech-growth | VGT, XLK, IGV, SMH, IWF, MTUM, VOOG, QUAL |
| us-broad-size-factor | RSP, IJH, IJR, IWM, IWN, IWD, USMV, SPLV, VIG |
| us-financials | XLF, KBE, KRE, KIE |
| us-cyclical | XHB, XRT, XLY, IYT, XLI |
| us-defensive | XLP, XLU, VPU |
| us-healthcare-biotech | XLV, IBB, XBI |
| energy | XLE, XOP |
| materials-metals-mining | XLB, XME |
| precious-metals | GLD, IAU, SLV, GDX |
| broad-commodities | DBC |
| em-latam | EWZ, EWW, ILF |
| em-asia | FXI, INDA, EWY |
| em-broad | EEM, IEMG |
| developed-ex-us | EFA, EWJ, VGK |
| rates-credit | AGG, IEF, SHY, TIP, TLT, EDV, LQD, HYG, EMB |

The full per-symbol table, with every flag, is `results/tables/s0-symbols.md`.
