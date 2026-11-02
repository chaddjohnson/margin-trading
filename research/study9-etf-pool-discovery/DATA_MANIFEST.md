# Data manifest — Study 9 data vintage (refresh of 2026-11-02)

Every Phase A computation reads the **training projection**. Its training bytes are byte-identical to the pre-refresh
vintage, for all 64 files, and to Study 8's pins, for the five B5 files. Other studies' vintages of the other 59 files
were not re-checked. The refresh only appended bars after each file's last session.

## Vintages

| Vintage | Location (local, git-ignored) | Content | Integrity |
|---|---|---|---|
| **Prior** (pre-Study 9) | `data/vintages/pre-study9-2026-11-02/<SYMBOL>/data.csv` (hard links, read-only) | the 64 files as they were before the refresh: 59 ending 2026-10-13, VGT/XBI/XRT/KRE/GDX ending 2026-10-29 (Study 8's pinned files) | per-file sha256 in `results/s0/inventory-pre-refresh.json` (record sha256 `6c830c17…`); the five B5 files equal Study 8's pins (`624e4094…`, `83b71f75…`, `c625ca57…`, `fd7ab8aa…`, `134b7450…`) |
| **Refreshed** (canonical) | `data/<SYMBOL>/data.csv` | the prior files plus 344,509 appended rows; every file ends on the 2026-10-30 session | per-file sha256 in `results/s0/inventory-post-refresh.json` (`1292b4ee…`); every file's prior-length prefix hashes to its prior vintage (verified) |
| **Training projection** (Phase A input) | `data/vintages/study9-train-2024/<SYMBOL>/data.csv` (read-only) + `partitions.json` | for each of the 61 eligible ETFs, the canonical bytes through the last bar of New York date 2024-12-31 (a byte prefix); 2.8 GB | `results/s0/projection.json` (`627a6cfd…`), pinned at the freeze |

The per-symbol table (prior and refreshed sha256, bytes, rows, last bar, new rows, projection sha256 and bytes) is
`results/s0/data-vintage-manifest.csv` (`8f164fc0…`).

## The refresh (S0, 2026-11-02T17:01–17:12Z)

**Download** — the repository pipeline unchanged:

| Item | Value |
|---|---|
| Script | `scripts/download.sh` (sha256 `1af992d3…`) |
| Source | Alpaca v2 stock bars, 1Min, `feed=sip`, `adjustment=raw`, `limit=10000` |
| Tools | curl 8.18.0, jq 1.8.1 |
| Driver | `scripts/s0_refresh.sh download 2026-10-31` (`76e33a70…`); one symbol at a time, resumable |
| Symbols and rows | 64 of 64; 344,509 rows; 17:01:32–17:03:08Z |
| Start | the calendar day after each file's last New York date |
| End | `2026-10-31`, read by Alpaca as 2026-10-31T00:00Z = 20:00 New York on Friday 2026-10-30 |

The increments are kept with per-symbol sha256 and row counts (`.done` markers) in
`data/vintages/study9-refresh-2026-11-02/increments/`.

**Latest complete session: 2026-10-30.**

- 2026-11-02 (Monday) was in progress at the time of the refresh, so it is excluded by construction.
- No holiday falls between 2026-10-14 and 2026-10-30 (`src/lib/calendar.ts`).
- 59 files gained 13 sessions (2026-10-14 … 2026-10-30); the five B5 files gained one (2026-10-30).

**Append.** `npm run datasets -- append <64 symbols>` (`src/data-partition/canonical.ts`, `21368562…`):

- every row the canonical file already had must be byte-identical;
- the combined file is scanned in full;
- the training and holdout partition rows must be unchanged;
- the file is replaced by an atomic rename.

64 of 64 appended. Run record: `data/vintages/study9-refresh-2026-11-02/datasets-append-run.json` (`67e11021…`). The
previous append record (2026-10-30, the B5 five) is preserved at `data/vintages/pre-study9-2026-11-02/
datasets-append-run.json` (`6483da2e…`).

**Verify.** `npm run datasets -- verify` → 64 of 64 verified. Record:
`data/vintages/study9-refresh-2026-11-02/datasets-verify-run.json` (`53141566…`).

**Post-checks** (`scripts/s0_inventory.py`, `0a54a267…`):

- all 64 prior-length prefixes equal the prior vintage;
- all 64 snapshot files still hash to the pre-refresh inventory;
- all 64 inodes changed, so nothing was rewritten in place.

## Pins and companions

| File | sha256 | Use |
|---|---|---|
| `data/partitions.json` (= the projection's copy) | `43893f3d…` | partition boundaries (unchanged) |
| `config/market-events/splits.json` | `e5bde427…` | split forward-adjustment (unchanged; read by the loader) |
| `config/market-events/distributions.csv` | not read | the user's modified copy is never read by Study 9 (the fixed one-slot engine books no distributions) |

## Access rules

- Phase A opens only the projection, through `door.ts`, which refuses any end after 2024-12-31 and any other root.
- The refreshed canonical files are read only by:
  - the S0 audit (integrity, coverage and liquidity; no strategy, and post-2024 price moves are not listed);
  - parity gate E1 (byte-prefix checks).
- Phase B will read the refreshed files through its own doors, with the windows of `PHASE_B_OPTIMIZATION_PROPOSAL.md`.
- Market data never enters Git: `data/` is ignored except `data/partitions.json`, and Study 9's caches live under the
  ignored `results/cache/`.
