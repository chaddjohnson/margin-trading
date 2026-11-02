# Study 9 Phase A — run commands

## Where and how

Run every command from the repository root on branch `research/study9-etf-pool-discovery`, with Node v24.21.0:

```
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
cd /home/chad/projects/margin-trading
```

Every stage is write-once and gated by the local hash chain (`results/chain.jsonl`). A stage refuses to start before
its predecessor phase is sealed, and refuses to run again once its own phase is sealed. `RESEARCH_RECOVERY.md` lists
what has run and the do-not-rerun guards.

## S0 — data (executed 2026-11-02; do not rerun)

| Step | Command |
|---|---|
| Pre-refresh inventory | `python3 research/study9-etf-pool-discovery/scripts/s0_inventory.py research/study9-etf-pool-discovery/results/s0/inventory-pre-refresh.json` |
| Prior-vintage snapshot (hard links) | `research/study9-etf-pool-discovery/scripts/s0_refresh.sh snapshot` |
| Increments through the last complete session | `research/study9-etf-pool-discovery/scripts/s0_refresh.sh download 2026-10-31` (reads `.env`; resumable per symbol) |
| Append (one run, all 64) | `research/study9-etf-pool-discovery/scripts/s0_refresh.sh append` |
| Verify | `npm run datasets -- verify` |
| Post-refresh inventory | `python3 research/study9-etf-pool-discovery/scripts/s0_inventory.py research/study9-etf-pool-discovery/results/s0/inventory-post-refresh.json` |
| Audit (D1–D5 + quality) | `npm run study9 -- s0-audit` |
| Training projection (write-once) | `npm run study9 -- s0-project` |
| Throughput pilot (pre-freeze only) | `npm run study9 -- pilot` |

## The study

| Stage | Command |
|---|---|
| Freeze (once) | `npm run study9 -- freeze-protocol` |
| Code acknowledgement after an amendment | `npm run study9 -- acknowledge-code <ID>` (needs `## <ID> —` in `AMENDMENTS.md`) |
| Engineering and leakage gates | `npm run study9 -- parity` |
| S1, all 61 ETFs (or a list) | `npm run study9 -- s1` (all) or `npm run study9 -- s1 <SYMBOL> [<SYMBOL> …]`; parallel: `research/study9-etf-pool-discovery/scripts/run_s1.sh 8` |
| Seal S1 | `npm run study9 -- seal-s1` |
| S2 | `npm run study9 -- s2` |
| S3 screen (16 strata; one process per family, run in parallel) | `npm run study9 -- s3-screen --family V`; `npm run study9 -- s3-screen --family G`; `npm run study9 -- s3-screen --family VG`; `npm run study9 -- s3-screen --family N` |
| Seal the screen | `npm run study9 -- seal-s3-screen` |
| S3 mid and high precision (one process per part, in parallel; C = Study 8 track sets and incumbents) | `npm run study9 -- s3-high --part V`; `npm run study9 -- s3-high --part G`; `npm run study9 -- s3-high --part VG`; `npm run study9 -- s3-high --part N`; `npm run study9 -- s3-high --part C` |
| Seal mid/high | `npm run study9 -- seal-s3-high` |
| S3 nominations, queue, PBO, batches | `npm run study9 -- s3-nominate` |
| Tables | `python3 research/study9-etf-pool-discovery/scripts/build_tables.py all` |
| Seal tables and reports | `npm run study9 -- seal report-<name> <files…>` (only `report-*` phases) |
| Verify | `npm run study9 -- verify-chain` |
| Chain listing | `npm run study9 -- chain` |

## Tests

| Check | Command |
|---|---|
| Unit tests (synthetic inputs, no market data) | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study9-etf-pool-discovery/tests/study9.test.ts` |
| Types | `npx tsc --noEmit -p .` |
| Lint | `npx eslint src/study9-etf-pool-discovery` |

`npm test` (the inherited suite) is **not** run in this checkout: it reads post-2024 market data.

## Executed (2026-11-02, UTC; all from the repository root)

| Time (Z) | Command | Result |
|---|---|---|
| 17:00–17:03 | `s0_inventory.py …/inventory-pre-refresh.json`; `s0_refresh.sh snapshot`; `s0_refresh.sh download 2026-10-31` | 64/64 increments, 344,509 rows |
| 17:10–17:12 | `s0_refresh.sh append`; `npm run datasets -- verify` | 64/64 appended, 64/64 verified |
| 17:2x | `npm run study9 -- s0-audit`; `npm run study9 -- s0-project` | 61 eligible; projection of 61 files |
| 17:31 | `npm run study9 -- pilot` | timings only |
| 19:14:16 | `npm run study9 -- freeze-protocol` | chain `protocol` `cbdd9ab2…` |
| 19:15 | first `npm run study9 -- parity` | refused before any door opened (loader self-match; AMENDMENTS E1); log `results/logs/parity-refused-E1.log` |
| 19:15:24 | `npm run study9 -- acknowledge-code E1` | chain `code-E1` |
| 19:15–19:21 | `npm run study9 -- parity` | 9/9 gates passed; chain `parity` |
| 19:22–19:24 | `research/study9-etf-pool-discovery/scripts/run_s1.sh 8`; `npm run study9 -- seal-s1` | 61 ETFs; chain `s1` |
| 19:25–19:27 | `npm run study9 -- s2` | chain `s2` |
| 19:28–19:36 | the four `npm run study9 -- s3-screen --family <F>` in parallel; `npm run study9 -- seal-s3-screen` | 16 strata; chain `s3-screen` |
| 19:37–19:50 | the five `npm run study9 -- s3-high --part <P>` in parallel; `npm run study9 -- seal-s3-high` | chain `s3-high` |
| 19:50 | `npm run study9 -- s3-nominate` | 6 nominations; chain `s3-nominate` |
| 19:51 | `python3 research/study9-etf-pool-discovery/scripts/build_tables.py all` | `results/tables/` |

Logs are in `results/logs/` (`s0-refresh/`, `s1/`, `s3/`, `parity.log`, `s2.log`). Each ends `exit 0`, except
`parity-refused-E1.log`, the refused first attempt, which ends `exit 1` as expected.

`results/logs/` is git-ignored by the repository's root `.gitignore` (`logs/`), so the logs stay local. The sealed
records and the chain are the evidence that would be committed.
