# Data and corporate-action audit (§1, §2A, §4 of the brief)

The blocking preflight of the study, done before any candidate price-performance figure existed. It verifies the 16
canonical files and their logical windows, completes the split registry, proves split invariance on both evaluation
paths, scans every file for other discontinuities, and inventories earlier work the missing splits could have
affected. Machine-readable output: `results/audit/audit.json` and `results/audit/AUDIT_TABLES.md`
(`npm run complementary-etf-d1 -- audit`).

**Result: the gate passes.** All six known splits are verified against issuer or OCC records and registered; no
split-sized move remains unexplained in any of the 16 files; every other large move is a genuine market event or the
known XLF 2016 special distribution; forward and reverse splits held across are economically invisible on the
standalone path, the allocator path and the research engine, and adjusted exactly once. The training data of all
seven candidates is economically valid, XOP included.

## 1. Starting state

- Branch `research/trailing-buy-four-family-optimization`, HEAD `121cd347`, clean working tree.
- Baseline checks at HEAD: `npm test` **446 tests, 446 pass**; `tsc --noEmit` clean; `eslint` 0 errors (15 existing
  warnings); `npm run legacy-archive -- verify` 11 of 11 archived research inputs verified.
- The full-history All-lowDd evaluation (commit `0a0bb272`, `docs/all-lowdd-full-history-evaluation.md`) had
  finished: the distribution ledger covers VGT/VOOG through **2026-10-24**, past the data's last session. That report
  and its outputs are reused, not overwritten.

## 2. Canonical files and logical windows

`data/partitions.json` sha256 `43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6` (unchanged):
training 2016-01-01 → 2023-12-31, holdout 2024-01-01 → 2025-10-16, final 2025-10-17 → open, all = every row.
`npm run datasets -- verify` re-scanned all 16 files: **16 of 16 verified**. Every file is headerless, six-field,
comma-delimited minute OHLCV with UTC timestamps, strictly ascending, without duplicates, malformed rows, rows outside
the partitions or inconsistent prices; the training, holdout and final rows of each file add up to its rows, so the
three windows cover every row exactly once; each file covers the same **2,710 NYSE sessions, 2016-01-04 →
2026-10-13**, with no missing session and no session on a closed day. **2026-10-13 is the last common session.**

| Symbol | Rows | training / holdout / final rows | sha256 (equal to the migration report) |
|---|---:|---|---|
| EWZ | 1,198,263 | 888,710 / 196,014 / 113,539 | `b1cf63a6…` |
| GDX | 1,481,880 | 1,047,761 / 264,574 / 169,545 | `86ce101f…` |
| GLD | 1,485,247 | 1,038,957 / 255,106 / 191,184 | `d3dd1beb…` |
| IWM | 1,759,157 | 1,230,727 / 336,462 / 191,968 | `44a919f9…` |
| IWN | 970,861 | 730,920 / 159,278 / 80,663 | `34cc798c…` |
| KRE | 1,126,493 | 821,957 / 199,061 / 105,475 | `40e7bd6c…` |
| TLT | 1,478,738 | 982,849 / 323,446 / 172,443 | `f4df3690…` |
| VGT | 928,192 | 663,135 / 147,391 / 117,666 | `d8e6991d…` |
| VOOG | 483,645 | 290,213 / 98,270 / 95,162 | `a7aa42ae…` |
| XBI | 1,174,798 | 859,813 / 202,748 / 112,237 | `9afecc06…` |
| XLE | 1,322,426 | 962,949 / 210,497 / 148,980 | `57d013b0…` |
| XLF | 1,332,122 | 971,398 / 231,633 / 129,091 | `845e7b60…` |
| XLU | 1,122,603 | 821,321 / 188,913 / 112,369 | `ab2787a4…` |
| XLY | 1,081,319 | 800,191 / 180,655 / 100,473 | `7a80d7f2…` |
| XOP | 1,163,994 | 875,087 / 182,466 / 106,441 | `cb8f4d88…` |
| XRT | 1,068,251 | 792,337 / 178,080 / 97,834 | `ca0fdc6a…` |

Per-window row hashes are in each `data/<SYMBOL>/dataset-report.json`. VOOG has 1,798 sparse sessions (under half
their regular minutes; it trades thinly), every other file none; the seven candidates have a median of 390 regular
bars per session and a median training daily dollar volume of $561M (XOP) to $1,258M (TLT). Extended-hours bars are
present in the files and dropped by the session grouping (`src/lib/session.ts`). No quote (bid/ask) data exists, so
spreads are not measured; the cost levels of the study stand in for them.

## 3. Splits: evidence, registry, continuity

The prior report of four unrecorded splits was treated as a lead. Each event was checked against a primary record and
against the raw bars; copies of the records are kept beside the registry in
`config/market-events/raw/split-sources-2026-10-24/`.

| ETF | Action | Effective (first adjusted session) | Record | Copy sha256 | Registry |
|---|---|---|---|---|---|
| VGT | 8-for-1 | 2026-04-21 | Vanguard press release, 2026-03-24 | (prnewswire, cited) | already recorded, re-verified |
| VOOG | 6-for-1 | 2026-04-21 | Vanguard press release, 2026-03-24 | (prnewswire, cited) | already recorded, re-verified |
| XOP | **1-for-4 reverse** | 2020-03-30 | SSGA Form 8937, signed 2020-03-30: "every four shares … converted automatically into one (1) issued and outstanding share"; CUSIP 78464A730 → 78468R556; basis per share ×4, total basis unchanged | `ce6365b7…` | **added**, ratio 0.25 |
| XLE | 2-for-1 | 2025-12-05 | OCC Information Memo #57734 (2025-11-25): record 12-02, payable 12-04, ex-distribution 12-05, CUSIP 81369Y506 | `7c597f5f…` | **added**, ratio 2 |
| XLU | 2-for-1 | 2025-12-05 | OCC Information Memo #57736 (2025-11-25): same dates, CUSIP 81369Y886 | `01982dd5…` | **added**, ratio 2 |
| XLY | 2-for-1 | 2025-12-05 | OCC Information Memo #57733 (2025-11-25): same dates, CUSIP 81369Y407 | `28d7fb3b…` | **added**, ratio 2 |

State Street announced the Select Sector SPDR splits on 2025-11-20; the OCC memos (retrieved from the MIAX alert
archive, `miaxglobal.com/sites/default/files/alert-files/<TICKER>_Split_<ID>.pdf`) state the terms that apply to the
listed shares. The registry's convention is unchanged: `ratio` = new shares per old share, `effectiveDate` = the
first session trading split-adjusted. Nothing else in `config/market-events/` changed (the distribution ledger and its
manifest are byte-identical; `npm run market-events -- verify` rebuilds the ledger identically).

**Why each is a split and not a market move.** In the raw bars every one is a mechanical overnight jump at the ratio
with continuous dollar volume (`results/audit/AUDIT_TABLES.md`):

| ETF | Raw close → open | Raw overnight | Adjusted overnight | Depth below the 74-session high, raw → adjusted | Median minute volume before / after raw / after adjusted | Median daily $ volume before / after |
|---|---|---:|---:|---|---|---|
| VGT | 809.13 → 101.57 | −87.45% | +0.42% | 87.6% → 0.5% | 857 / 6,832 / 854 | $406.8M / $437.0M |
| VOOG | 460.46 → 77.25 | −83.22% | +0.66% | 83.6% → 1.6% | 391 / 2,020 / 337 | $108.6M / $117.1M |
| XOP | 8.03 → 31.10 | +287.30% | −3.18% | −22.6% (above the high) → 69.4% (the genuine March 2020 crash) | 105,448 / 22,405 / 89,618 | $548.1M / $488.5M |
| XLE | 92.22 → 46.03 | −50.09% | −0.17% | 50.6% → 1.2% | 23,556 / 43,958 / 21,979 | $1,372M / $1,143M |
| XLU | 87.42 → 43.72 | −49.99% | +0.02% | 53.8% → 7.7% (a genuine decline) | 15,695 / 26,336 / 13,168 | $886M / $747M |
| XLY | 238.14 → 119.18 | −49.95% | +0.09% | 51.0% → 2.1% | 12,128 / 13,485 / 6,743 | $1,283M / $939M |

Unadjusted, XOP's reverse split reads as a 287% overnight gain and lifts the series far above its reference high;
XLE/XLU/XLY read as 50% crashes that would arm any D1 phenotype. `npm run market-events -- verify` now reports
`SPLIT … adjusted overnight move` for all six and **no unrecorded split-sized move in any of the 16 files** (before
the change it listed XLE, XLU, XLY 2025-12-05 and XOP 2020-03-30). The adjustment factor equals the registry's
factor exactly in every case.

**Units.** Adjusted runs are in the share units of their first session: XOP after 2020-03-30 is ¼ of its quote,
XLE/XLU/XLY after 2025-12-05 are 2× theirs, VGT/VOOG after 2026-04-21 are 8×/6×. These are backtest units, not broker
quote or share units; a broker-facing order would convert a price by ÷ the cumulative factor and a share count by ×
the factor (`splitFactor` in `src/lib/corporateActions.ts`). No order is placed by anything in this study.

## 4. Economic invariance and single adjustment (tests)

| Test | Path | What it proves |
|---|---|---|
| `src/lib/tests/corporateActions.test.ts` — "the shipped registry holds the documented splits" (updated) | registry | the six events and their source documents |
| same file — "a reverse split and successive splits" (new) | loader | 1:4 then 2:1 compose (factor 0.5); later prices × 0.25 then × 2, volumes the other way, every bar field in the same units; dollar volume kept; the adjusted series has no split-sized gap; turned off, both raw gaps appear |
| `src/phenotype/tests/splitRun.test.ts` — forward split held across (existing) and **1:4 reverse split held across (new, XOP 2020-03-30 from the shipped registry)** | standalone `--phenotype` runner and the D1 file | fills, shares, stops, setups, states, marks, interest and drawdowns identical to the same economy printed without a split; volumes × 4; with the registry entry absent the same bytes book **> $200,000 on a $100,000 position** (the artifact) |
| `src/multi-etf-allocator/tests/dataset.test.ts` — forward split (existing) and **a lot held across a 1:4 reverse split, fixed and portfolio (new)** | allocator `--dataset` loader, shadow books, both ledgers | same lots, exits, virtual trades, cost basis, proceeds, interest, net and daily equity as the unsplit economy; unadjusted, the held lot books **> $200,000** |
| `src/multi-etf-allocator/tests/crossPath.test.ts` (new) | standalone **and** allocator | on one economy with VGT's 8:1 split held across, the standalone phenotype run and the allocator book agree trade for trade (entry/exit session, minute, price, shares, interest, net), are priced in pre-split units (adjusted once, not twice), and equal the unsplit economy |
| `src/complementary-etf-d1/tests/data.test.ts` (new, real data) | research training view | XOP training is the training partition only, adjusted once (adjusted ÷ raw = 0.25 exactly on 2020-03-30, earlier sessions untouched), eligibility at session 365; holdout/final/all refused before reading |
| `npm run complementary-etf-d1 -- parity` (new, real data) | D1 file vs research engine | on each candidate's canonical training partition, the shipped D1 file and the d1-refinement engine agree **trade for trade, 0 differences**: GDX 45 trades, XOP 82 (across the reverse split), EWZ 42, TLT 5, XLE 32 ($26,974, equal to the eight-ETF program's independent figure), XLU 7, GLD 0 |

The allocator path adjusts through the same `loadDatasetSessions` → `adjustSessionsForSplits` as the standalone
path, distributions with ex-dates after a split are scaled by the same factor (unchanged code), and the research
engine is built from the same loader's sessions, so no bar passes through a second adjustment.

## 5. The other discontinuities of all 16 files

Integrity only: overnight moves of the split-adjusted series of at least 8%, single-minute jumps of at least 8%,
and 3× shifts of the 20-session median daily volume (every partition read; no strategy computed).

- **52 overnight gaps ≥ 8%**, of which 40 are market-wide (≥ 4 of the 16 files moved ≥ 4% the same night; March 2020
  dominates). The 12 idiosyncratic ones are all identified:

| Symbol | Date | Overnight | Attribution |
|---|---|---:|---|
| XLF | 2016-09-19 | −18.1% | the special distribution of Real Estate Select Sector (XLRE) shares to XLF holders — a **corporate action**, documented by the eight-ETF audit; before every eligibility date; XLF is context only here and is not adjusted (price-only) |
| EWZ | 2017-05-18 | −17.8% | Brazil's "Joesley Day" (the Temer recording scandal) |
| EWZ | 2020-03-17, 2020-05-26 | +8.3%, +9.7% | COVID-era Brazil rebounds |
| EWZ | 2026-10-05 | +12.0% | the session after Brazil's 2026-10-04 general election (final window) |
| GDX | 2026-01-30, 2026-03-19 | −8.3%, −8.2% | gold-price shocks (final window) |
| KRE | 2023-03-13, 2023-03-14 | −12.6%, +10.6% | the SVB regional-bank crisis |
| XOP | 2019-09-16 | +8.8% | the Abqaiq oil-facility attack |
| XRT | 2021-01-27, 2021-01-29 | +10.2%, +9.7% | the GameStop squeeze (XRT held GME) |

- **1 single-minute jump ≥ 8%**: GDX 2020-03-13 15:59 ET (+8.1%, the national-emergency rally into the close).
- **11 volume-regime shifts**: February–March 2020 (GLD, IWM, IWN, VGT, VOOG, XLE, XLF), KRE 2023-02-28 (SVB),
  IWN 2019-01-18 and VOOG 2019-07-31 (volume normalizing after spikes). None coincides with a price discontinuity, a
  ticker or CUSIP change or a split.

No spin-off, ticker change or other split was found beyond those above. Ordinary distributions are below the scan's
threshold and are a matter of the price basis (§6), not a data error.

## 6. Distributions

- **Ledger:** `config/market-events/distributions.csv` (sha256 `3b4342eb…`, 86 rows) covers VGT and VOOG through
  2026-10-24, past the last session; nothing in it changed. The allocator books those distributions in portfolio
  mode, as frozen.
- **Candidates:** by the frozen convention, book ETFs other than VGT are price-only, and the screen's proxies and the
  diagnostics are price-only. No candidate reached a portfolio evaluation, so no candidate distribution ledger was
  built and none was synthesized. The issuer pages of the candidates (VanEck, iShares, SSGA) were not machine-readable
  from this session; VanEck's refused automated access.
- **Does the price basis change the screen?** The one gate a distribution could move is economics (clean idle-pool
  proxies' net at 5 bps without the best, OPPORTUNITY_SCREEN.md). Accruing a constant yield over every clean proxy's
  holding days, the break-even yield that would flip it is **22.6% (XOP), 60.4% (EWZ), 68.7% (XLE)**, impossible; TLT,
  XLU and GLD fail other gates. For **GDX** it is **1.37%** a year on every clean proxy; GDX distributes once a year in
  late December (third-party history: e.g. ex-date 2017-12-18, $0.176), and of its clean proxies only 2017-12-13 →
  2018-01-12 spans an ex-date — the best one, which the gate already removes. The screen's result does not depend on
  the price basis.

## 7. Earlier work the missing splits could have affected

| Work | Symbols / span | Affected? |
|---|---|---|
| Eight-ETF D1 program (`research/multi-etf-d1/`, frozen) | XLE, XLY archived files ending 2025-10-16 | no: before 2025-12-05; no XOP or XLU |
| Multi-ETF allocator protocol (`research/multi-etf-allocator/`, frozen) | VGT/VOOG/XBI/XRT/KRE to 2025-10-13 | no |
| All-lowDd full history (`docs/all-lowdd-full-history-evaluation.md`, 0a0bb272) | VGT/VOOG across 2026-04-21 | no: VGT/VOOG were adjusted there |
| Standalone VGT D1 on `all` before 007a8650 ($195,186) | VGT across 2026-04-21 | **yes**, already flagged unreliable in `docs/vgt-d1-primary-discrepancy.md` ($178,574 is the corrected figure) |
| Any partition run of XOP spanning 2020-03-30, or of XLE/XLU/XLY spanning 2025-12-05, before this change | — | would have read raw prices; **no stored output of such a run exists** in the repository (searched every `summary.json` outside the frozen eight-ETF study) |
| Sector/ETF normalization program | another branch, Stooq daily data | not on this branch and not on the canonical minute files; not re-examined |

No frozen artifact was modified. The historical documents that describe the four splits as unrecorded
(`docs/all-lowdd-full-history-evaluation.md`, `docs/canonical-dataset-migration.md`) are dated records and were left
as they are; the living `README.md` was updated.
