# Intraday D1 (VGT) — exact commands, times and record hashes

All commands run from the repository root (`/home/chad/projects/margin-trading`), branch `research/intraday-d1-vgt`,
Node 24.21.0, 16 hardware threads (14 worker threads per stage). Times are UTC from the door log and the chain
(`results/doors.jsonl`, `results/chain.jsonl`). The script is `npm run intraday-d1` =
`node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288 src/intraday-d1/main.ts`.

| Step | Command | Door / time (UTC) | Output (sha256 prefix) | Chain |
|---|---|---|---|---|
| Protocol freeze | `npm run intraday-d1 -- seal-protocol` | — 17:35:23 | `PROTOCOL.md` 5cfa4234, `results/protocol_freeze.json` 57806470 | 1 protocol |
| Parity attempt 1 (failed: comparator, A1) | `npm run intraday-d1 -- parity` | development 17:35:25 | `results/parity/parity-attempt1.json` 20d45e7f | 2 amendment-A1 (with `AMENDMENTS.md` c5665933) |
| Parity rerun | `npm run intraday-d1 -- parity` | development 17:36:30 | `results/parity/parity.json` 30e1545b (0 differences) | 3 parity |
| Git commit (protocol freeze) | `git commit` | — | `f90d99087a867e4fe894b1e2efc407fa9dfe7ad8` | — |
| Search | `npm run intraday-d1 -- search` (background; log `results/logs/search.log`, git-ignored; copy `results/runlogs/search.txt`) | development 17:37:05 → 17:37:54 | `results/search/search.json` db62256e, `search-archive.csv.gz` 349c2102 | 4 search |
| Qualification | `npm run intraday-d1 -- qualify` | development 17:38:50 | `results/qualify/qualification.json` ae6313a5 | 5 qualify |
| Freeze | `npm run intraday-d1 -- freeze` | — 17:39:04 | `FROZEN_SELECTION.json` fffa2908 (body 1dd6700c) | 6 selection |
| Git commit (selection freeze) | `git commit` | — | `b3571c1` | — |
| Validation (once) | `npm run intraday-d1 -- validate` (log copy `results/runlogs/validation.txt`) | **validation 17:39:31** | `results/validation/validation.json` 577f9674 + 5 ledgers + 5 year tables | 7 validation |
| Report tables | `npm run intraday-d1 -- report` | development 17:39:49 (regime labels) | `results/report/REPORT_TABLES.md`, `results/report/regimes.json` | — (report-only) |
| Diagnostics | `npm run intraday-d1 -- diagnose` (run twice; the second added the screen re-evaluation and overwrote the first) | development 17:40:47, 17:41:27 | `results/report/diagnostics.json` 10b4088d | — (report-only) |
| CLI check | `npm run intraday-d1 -- run --candidate id-5.1v.e.1f.1y.t.1y.6.1f --door full --out <scratch>` | full (post-study run) 17:43:22 | reproduced DEV $71,245.59 / VAL $6,183.91 | — |
| Chain check | `npm run intraday-d1 -- verify` | — | 7 entries, 0 problems | — |
| Study tests | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/intraday-d1/tests/*.test.ts` | development prefix only | 17/17 pass | — |
| D1 non-regression (data-free) | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/lib/tests/frozenSource.test.ts src/phenotype/tests/splitRun.test.ts src/multi-etf-allocator/tests/crossPath.test.ts src/shared-margin-portfolio/tests/engine.test.ts` | none | 21/21 pass | — |
| D1 on the development prefix | `node --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts allIn-trailingBuy-postExitContinuation VGT - - <prefix.csv> <outdir> stop` (prefix = first 42,469,694 bytes of `data/VGT/data.csv`) | prefix only | $137,222.97 / DD $19,330.69 / $15,611.46 / 17 trades = sealed record | — |
| Full suite (after the freeze) | `npm test` (log `results/runlogs/npm-test.txt`) | all data | see `RESEARCH_RECOVERY.md` | — |

Rerunning a sealed stage is refused (write-once records; the search refuses once the selection exists; validation
refuses once sealed). A full re-execution needs a fresh copy of the study directory without `results/` and
`FROZEN_SELECTION.json`; every seed is fixed (`deriveSeed('intraday-d1-vgt', …labels)`), so the records reproduce.
