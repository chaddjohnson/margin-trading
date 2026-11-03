# Ingestion runs (PROTOCOL.md §3.3) — 2026-10-25

**Scope.** The 48 new candidates of the protocol's Tier 1 (28) and Tier 2 (20), downloaded through the repository's own
`scripts/download.sh` (Alpaca v2 stocks bars, 1Min, SIP feed, `adjustment=raw`, start 2016-01-04, end fixed at
2026-10-13) and imported and verified through the repository's own `npm run datasets -- import/verify`, orchestrated by
`npm run robust-d1 -- ingest`. Integrity metadata only: no strategy was run on any symbol at this stage. The 16 existing
datasets were not re-downloaded or extended; they were re-verified (below).

**Outcome.** 48 of 48 new symbols imported and verified; 105 download attempts in all. No staging file
(`data/<SYMBOL>.csv`) remains; no canonical file was quarantined, deleted or overwritten; no credential value appears in
any log, report or JSON (the dummy-credential test passes, and the attempt logs show `[REDACTED:…]` where the fixture
downloader echoed values).

## How the runs went

| Run | What | Result |
|---|---|---|
| 1 | XLV alone (pipeline check) | verified in 441 s |
| 2 | the other 47, four parallel lanes, Tier 1 queued before Tier 2 | 44 verified or split-blocked; XHB, XME, HYG exhausted 4 attempts each on mid-transfer `curl: (56) Recv failure: Connection reset by peer` |
| 3 | HYG, XHB, XME sequentially (one lane) | all verified (XHB needed one more retry) |
| 4 | `ingest <SYMBOL> --resolve` for the 13 split-blocked symbols, after each split was registered with a source document | all 13 verified; staging files then removed |

Retry policy as written: 26 symbols had at least one failed attempt, every one classified **retryable** (connection
resets mid-transfer, which surface as a truncated page and a `jq` parse error); none was terminal (no 401/403). Before
each retry the orchestrator deleted only the partial `data/<SYMBOL>.csv` its own attempt log recorded as incomplete
(the script appends, so a partial file would have duplicated rows). The connection resets coincided with four parallel
lanes; the single-lane re-run of run 3 succeeded.

**A defect found and fixed during run 4.** The first `--resolve` invocation (11 symbols) wrote its small result over
each symbol's original ingest record in `results/ingestion/results/<SYMBOL>.json`. The orchestrator now writes
resolutions to `<SYMBOL>.resolve.json`; for the 11 affected symbols (XLB, XLK, IJR, IWF, SMH, EWJ, IBB, KIE, OIH, IGV,
IYT) the record was rebuilt from the attempt log (row count) and is marked `reconstructed`. Nothing in `data/` was
affected; the canonical files' hashes are in the audit.

## The 16 existing datasets

`npm run datasets -- verify EWZ GDX GLD IWM IWN KRE TLT VGT VOOG XBI XLE XLF XLU XLY XOP XRT`: 16 of 16 verified; every
`data/<SYMBOL>/data.csv` and every `dataset-report.json` is byte-identical to its hash recorded at the start of the
study (the verifier rewrites the report with identical content). The verifier's run file
`data/datasets-verify-run.json` is rewritten by design.

## Split verification of the batch

`npm run market-events -- verify` once after the batch (output in `results/ingestion/market-events-verify.txt`): exit 0;
all 19 registered splits match the raw overnight moves within ±10% after adjustment; **no unexplained split-sized
overnight move remains in any canonical file**.

## Per-symbol record

Generated from the attempt logs (`results/ingestion/<SYMBOL>.attempts.json`, logs under `results/ingestion/logs/`):

See [results/tables/ingestion.md](results/tables/ingestion.md).
