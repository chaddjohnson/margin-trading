# Study 9, Phase A — broad ETF-pool discovery (S0–S3)

**Research only. Nothing here is deployed, traded or live.**

A training-only (2016-01-04 → 2024-12-31) screen of 2–5 ETF D1 pools over the 61 canonical ETFs, under four VGT/GDX
families with equal budgets:

- **V:** VGT without GDX;
- **G:** GDX without VGT;
- **VG:** both;
- **N:** neither.

It measures the actual one-funded-slot shared allocator with fixed generic vectors, and stops at the review checkpoint
before any full joint optimization (Phase B).

## Read in this order

1. `RECOMMENDATION.md` — the executive summary and the request for Phase B approval.
2. `PHASE_B_OPTIMIZATION_PROPOSAL.md` — what to optimize next, at what cost, with which gates.
3. `POOL_MARGINAL_CONTRIBUTION.md` (S3), `SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md` (S2), `STANDALONE_SCREEN.md` (S1),
   `DATA_AND_UNIVERSE_AUDIT.md` (S0).
4. `PROTOCOL.md`, `AMENDMENTS.md`, `DATA_MANIFEST.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`.

## Layout

| Path | Content |
|---|---|
| `brief/ASSIGNMENT.md` | the user's brief, verbatim |
| `results/s0/` | inventories, the eligibility audit, the projection manifest, the vintage manifest |
| `results/s1/etf/<SYMBOL>.json` | S1 per-ETF records |
| `results/s2/s2.json` | S2 record |
| `results/s3/screen/<F><k>.json` | S3 strata |
| `results/s3/mid-<part>.json`, `high-<part>.json` (parts V, G, VG, N, C), `nominations.json` | S3 later stages |
| `results/parity/parity.json` | engineering and leakage gates |
| `results/chain.jsonl`, `results/doors.jsonl`, `results/protocol_freeze.json`, `results/freeze/` | the tamper-evident record |
| `results/tables/` | generated CSV/Markdown tables (`scripts/build_tables.py`) |
| `reviews/` | the independent reviews |
| `results/cache/` | point caches (git-ignored; regenerable) |
| `src/study9-etf-pool-discovery/` | the code (pinned at the freeze) |

Market data stays local and git-ignored:

- `data/<SYMBOL>/data.csv` (refreshed);
- `data/vintages/pre-study9-2026-11-02/` (the prior vintage);
- `data/vintages/study9-refresh-2026-11-02/` (the increments);
- `data/vintages/study9-train-2024/` (the training projection).
