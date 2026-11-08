# RUN_COMMANDS — vgt-d1-growth-separate-pooled

**Where and how to run.**
- Run every command from the repository root `/home/chad/projects/margin-trading`, with Node v24.21.0
  (`.node-version`).
- Heavy stages run in transient systemd user units inside `vgtpair.slice` (MemoryHigh=44G, MemoryMax=48G,
  MemorySwapMax=0, re-applied at every launch), one at a time:

```
npm run vgt-pair -- launch --unit <unit> --wait -- <command> [options]     # log: results/logs/<unit>.log
```

| Stage | Command | Output | Rerun? |
|---|---|---|---|
| preflight | `npm run research-preflight -- --study research/vgt-d1-growth-separate-pooled` | PASS/FAIL (exit 0/1) | safe; also run in code by every stage |
| S1 manifest | `npm run vgt-pair -- manifest --dry-run` (prints, evaluates nothing), then `npm run vgt-pair -- manifest`, then commit | `COMPARISON_MANIFEST.json` (sealed) | **refuses** once sealed |
| S2 pilot | `bash research/vgt-d1-growth-separate-pooled/chains/pilot.sh` | `.cache/vgt-d1-growth-separate-pooled/pilot/p{1,2}/`, `results/logs/pilot-chain.log`, `results/memory/pilot-*.jsonl` | `pilot-` jobs only; refuses an existing pilot output |
| S3 comparison | `npm run vgt-pair -- launch --unit vgtpair-compare --wait -- compare` | `results/comparison.json` (sealed), `results/ledgers/` | **refuses** once sealed; nothing sealed until its end |
| S4 neighbourhood | `npm run vgt-pair -- launch --unit vgtpair-nbhd --wait -- neighbourhood --workers 8` | `results/neighbourhood.json` (sealed) | **refuses** once sealed; resumes from `.cache/…/jobs/neighbourhood/` |
| S5 tables | `node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vgt-d1-growth-separate-pooled/tables.ts` | `results/tables/*.md` | safe |
| S5 charts | `node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vgt-d1-growth-joint/charts.ts research/vgt-d1-growth-separate-pooled/results/ledgers/FULL research/vgt-d1-growth-separate-pooled/results/charts/pair-vs-joint-and-fixed.html "Pooled pair vs joint primary and fixed combinations (FULL, continuous)" "01=Pooled pair A,07=Joint primary,10=D1 primary + #4 A,13=D1 primary + 08500a60 A" 2024-12-31` (and `pair-vs-families.html` with `01=Pooled pair A,08=Optimized D1 alone,09=Optimized Growth alone,05=Pair B 50/50`) | `results/charts/*.html` | safe |
| verify | `npm run vgt-pair -- verify` | every seal's sha256 recomputed | safe |
| tests | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vgt-d1-growth-separate-pooled/tests/*.test.ts src/research-standard/tests/*.test.ts`; full suite in unit `vgtpair-npm-test` | `results/logs/npm-test.log` | safe |

**Interrupted jobs.**
- Check `systemctl --user is-active <unit>` and the unit's log first.
- **The neighbourhood stage** stops gracefully (exit 75) on SIGTERM or memory pressure. A worker death fails it
  (exit 1) after committing. Rerun the same command: archived evaluations are read back.
- **The comparison stage** is one in-process run. Rerun it whole.

## Executed (2026-11-08, UTC)

| Time | Stage | Command (unit) | Result |
|---|---|---|---|
| 21:47:58 | adoption | `STANDARD_ADOPTION.json` written; `npm run research-preflight -- --study …` | PASS |
| 21:48:08 | S1 | `npm run vgt-pair -- manifest`; commit `63352297` | sealed `8d01c734…` |
| 21:49–21:51 | S2 | `chains/pilot.sh` (units `vgtpair-pilot-p1a`, `-p1b`, `-p2a`, `-p2b`) | p1a exit 1 after 18 s (worker SIGKILL); p1b 0; p2a 75 (SIGTERM); p2b 0; p1 = p2 |
| 21:51:29–21:51:35 | S3 | `launch --unit vgtpair-compare --wait -- compare` | sealed `66bb9912…`; 24/24 comparators equal |
| 21:52:35–21:53:08 | S4 | `launch --unit vgtpair-nbhd --wait -- neighbourhood --workers 8` | sealed `8b77e6f5…`; joint primary reproduced |
| after | S5 | tables, charts | report helpers |
| 21:56– | tests | `systemd-run --user --unit=vgtpair-npm-test --slice=vgtpair.slice … npm test` | `results/logs/npm-test.log` |
