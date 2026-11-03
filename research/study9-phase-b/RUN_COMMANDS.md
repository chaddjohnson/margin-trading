# Study 9 Phase B — run commands

## Where and how

Run every command from the repository root `/home/chad/projects/margin-trading`, on branch
`research/study9-phase-b-seven-pool`, with Node v24.21.0:

```
export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH
cd /home/chad/projects/margin-trading
```

The stage wrapper is `research/study9-phase-b/scripts/s9b.sh <command> [args]` (it runs
`src/study9-phase-b/main.ts`). Every stage is write-once and gated by the local hash chain (`results/chain.jsonl`): a
stage refuses before its predecessor phase is sealed and after its own. `RESEARCH_RECOVERY.md` lists what has run and
the do-not-rerun guards.

## The study, in order

| Stage | Command |
|---|---|
| Timing pilot (pre-freeze only) | `research/study9-phase-b/scripts/s9b.sh pilot` |
| Freeze (once) | `research/study9-phase-b/scripts/s9b.sh freeze-protocol` |
| Code acknowledgement after an amendment | `research/study9-phase-b/scripts/s9b.sh acknowledge-code <ID>` (needs `## <ID> —` in `AMENDMENTS.md`) |
| Engineering and leakage gates | `research/study9-phase-b/scripts/s9b.sh parity` |
| All 35 searches (12 parallel, longest first) | `research/study9-phase-b/scripts/run_jobs.sh research/study9-phase-b/scripts/jobs-search.txt 12 > research/study9-phase-b/results/runlogs/orchestrator-search.txt 2>&1` |
| One search | `research/study9-phase-b/scripts/s9b.sh search <G4-ILF\|G4-EWW\|N3-EDV\|N2-SMH\|V3-IWM\|N2-EDV\|VG3-IWM> <F19\|F20\|F21\|F23\|F24>` |
| Seal the searches | `research/study9-phase-b/scripts/s9b.sh seal search` (with `--acknowledge <ID>` if a job's door opened twice) |
| All 35 qualifications | `research/study9-phase-b/scripts/run_jobs.sh research/study9-phase-b/scripts/jobs-qualify.txt 12 > research/study9-phase-b/results/runlogs/orchestrator-qualify.txt 2>&1` |
| Seal | `research/study9-phase-b/scripts/s9b.sh seal qualify` |
| Selection freeze | `research/study9-phase-b/scripts/s9b.sh freeze-selection` |
| Pre-test audit (the report, in `reviews/`, must have exactly one `Result:` line, reading `Result: CLEARED`) | `research/study9-phase-b/scripts/s9b.sh record-audit research/study9-phase-b/reviews/PRE_TEST_AUDIT.md` |
| Test doors, in this order | `research/study9-phase-b/scripts/s9b.sh test F19`, then `test F20`, `test F21`, `test F23`, `test F24` |
| F24 confirmation | `research/study9-phase-b/scripts/s9b.sh test F24 --confirm` |
| The 2026-10-30 slice (report-only) | `research/study9-phase-b/scripts/s9b.sh slice` |
| Post-test analyses (report-only) | `research/study9-phase-b/scripts/s9b.sh diagnostics` |
| Preference assessment and the three decisions (report-only; after diagnostics) | `research/study9-phase-b/scripts/s9b.sh preference` |
| Recovery: seal a written but unsealed stage record (after a crash between write and seal) | `research/study9-phase-b/scripts/s9b.sh seal selection` or `seal test-<fold>` / `seal test-F24-confirm` (refused for a failed record) |
| Seal report tables and documents | `research/study9-phase-b/scripts/s9b.sh seal report-<name> <files…>` |
| Verify | `research/study9-phase-b/scripts/s9b.sh verify-chain` |

## Runner (execution tooling; run only after the sealed F24 confirmation — its code was drafted earlier, AMENDMENTS.md E5)

| Purpose | Command |
|---|---|
| Write the research configs (once) | `npm run study9b-run -- research-configs` |
| List aliases | `npm run study9b-run -- list` |
| Run one configuration | `npm run study9b-run -- run s9b-nominee [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]` |
| Compare | `npm run study9b-run -- compare s9b-nominee s9b-vg3-iwm-robust s9b-n2-smh-profit s8-vg-balanced` (any aliases) or `npm run study9b-run -- compare --all` |
| Reconcile all 36 sealed F24 configurations | `npm run study9b-run -- compare s9b-rank-1 s9b-rank-2 s9b-rank-3 s9b-rank-4 s9b-rank-5 s9b-rank-6 s9b-rank-7 s9b-rank-8 s9b-rank-9 s9b-rank-10 s9b-rank-11 s9b-rank-12 s9b-rank-13 s9b-rank-14 s9b-rank-15 s9b-rank-16 s9b-rank-17 s9b-rank-18 s9b-rank-19 s9b-rank-20 s9b-rank-21 s9b-rank-22 s9b-rank-23 s9b-rank-24 s9b-rank-25 s9b-rank-26 s9b-rank-27 s9b-rank-28 s9b-rank-29 s9b-rank-30 s9b-rank-31 s9b-rank-32 s8-vg-balanced s8-vg-profit vgt-primary b5-frozen --end 2026-10-29 --out evaluations/study9b-runs/reconcile-<new-name>` (`--out` must be a new directory; the sealed run wrote `evaluations/study9b-runs/reconcile-2026-10-29/`) |
| Acceptance (edge cases) | `research/study9-phase-b/tools/runner_edge_cases.sh evaluations/study9b-runs/edge-cases-<UTC timestamp, a new directory>` |

`npm run study9b -- <command>` is equivalent to `scripts/s9b.sh <command>` (added after the sealed stages; E4).

## Tests

| Check | Command |
|---|---|
| Unit tests (synthetic, no market data) | `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study9-phase-b/tests/study9b.test.ts src/study9b-runners/tests/runners.test.ts` |
| Types | `npx tsc --noEmit -p .` |
| Lint and format | `npx eslint src/study9-phase-b src/study9b-runners`; `npx prettier --check src/study9-phase-b src/study9b-runners` |
| Inherited suite | `npm test` (reads post-2024 data in this checkout; run only after `test-F24-confirm`) |
| Report tables | `python3 research/study9-phase-b/tools/build_tables.py search qualify selection test folds tracks preference diagnostics execution slice` |

## Executed

Times UTC from the clock and the chain (`results/chain.jsonl`). Logs in `results/runlogs/`.

| Time (Z) | Command | Result |
|---|---|---|
| 11-02 22:44–22:45 | `scripts/s9b.sh pilot` | timings only (`results/pilot/pilot.json`) |
| 11-02 (pre-freeze) | scratchpad `smoke.sh` (3 runs; `results/pilot/smoke-run{1,2,3}-output.txt`) | smoke only; outputs deleted unread |
| 11-02 23:32:25 | `scripts/s9b.sh freeze-protocol` | chain 1 `protocol` `46faf87919cd` |
| 11-02 23:32:30 → 11-03 00:02:21 | `scripts/s9b.sh parity` (attempt 1) | N2 failed (cache header compared `doorKey`); nothing sealed |
| 00:03:08 | `scripts/s9b.sh acknowledge-code E1` | chain 2 `code-E1` `9d666c401ece` |
| 00:03:19 → 00:31:22 | `scripts/s9b.sh parity` (attempt 2) | 19/19 gates pass; chain 3 `parity` `42c722d3fbc6` |
| 00:31:39 → 05:48:42 | `scripts/run_jobs.sh scripts/jobs-search.txt 12` | 35/35 exit 0 |
| 05:49 | `scripts/s9b.sh seal search` | failed (string length; E2) |
| 05:49:41 | `scripts/s9b.sh acknowledge-code E2` | chain 4 `code-E2` `39b2a767d18c` |
| 05:49:57 | `scripts/s9b.sh seal search` | chain 5 `search` `72b9f43b2d4d` |
| 05:50:04 → 06:08:04 | `scripts/run_jobs.sh scripts/jobs-qualify.txt 12` | 35/35 exit 0 |
| 06:08:55 | `scripts/s9b.sh seal qualify` | chain 6 `qualify` `3a0d1a924c93` |
| 06:09:03 | `scripts/s9b.sh freeze-selection` | chain 7 `selection` `2cc50fbeaa20` |
| 06:26:29 | `scripts/s9b.sh acknowledge-code E3` | chain 8 `code-E3` `10e6037eaac9` |
| 06:26:42 | `scripts/s9b.sh record-audit research/study9-phase-b/reviews/PRE_TEST_AUDIT.md` | CLEARED; chain 9 `audit` `fd2fc387cd60` |
| 06:26:48 → 06:38:59 | `scripts/s9b.sh test F19` | 0/22 not failed; chain 10 `7808ffbe9de6` |
| 06:38:59 → 06:54:25 | `scripts/s9b.sh test F20` | 0/24; chain 11 `44c7a1b5e5a2` |
| 06:54:25 → 07:17:05 | `scripts/s9b.sh test F21` | 1/31; chain 12 `619a35ab8d85` |
| 07:17:05 → 07:43:56 | `scripts/s9b.sh test F23` | 6/29; chain 13 `ef4d8a3e291e` |
| 07:43:56 → 08:21:55 | `scripts/s9b.sh test F24` | 13/32, outcome qualified; chain 14 `f2fe57584769` |
| 08:21:55 → 09:00:31 | `scripts/s9b.sh test F24 --confirm` | IDENTICAL; chain 15 `104880f14189` |
| 09:00:48 → 09:01:35 | `scripts/s9b.sh slice` | chain 16 `slice-2026-10-30` `e6dcef6eaf29` |
| 09:01:35 → 09:10:26 | `scripts/s9b.sh diagnostics` | chain 17 `diagnostics` `6d5f7d32e55a` |
| 09:10:26 → 09:11:06 | `scripts/s9b.sh preference` | chain 18 `preference` `dbe5d77748cb` |
| 09:01:55; 09:02 | `node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 src/study9b-runners/main.ts research-configs` (the npm script did not exist yet; file mtimes, local listings show CET = UTC+1); then the first reconciliation | refused (Study 8's default-universe session check); fixed in the runner (`data.ts`), `results/runner/reconcile-attempt1-refused.txt` |
| ≈ 09:03–09:05 | `npm test` | 943 / 932 pass / 7 fail (pre-existing) / 4 skipped (`results/runner/npm-test.txt`) |
| ≈ 09:06–09:09 (output written 09:09) | `node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 src/study9b-runners/main.ts compare s9b-rank-1 s9b-rank-2 s9b-rank-3 s9b-rank-4 s9b-rank-5 s9b-rank-6 s9b-rank-7 s9b-rank-8 s9b-rank-9 s9b-rank-10 s9b-rank-11 s9b-rank-12 s9b-rank-13 s9b-rank-14 s9b-rank-15 s9b-rank-16 s9b-rank-17 s9b-rank-18 s9b-rank-19 s9b-rank-20 s9b-rank-21 s9b-rank-22 s9b-rank-23 s9b-rank-24 s9b-rank-25 s9b-rank-26 s9b-rank-27 s9b-rank-28 s9b-rank-29 s9b-rank-30 s9b-rank-31 s9b-rank-32 s8-vg-balanced s8-vg-profit vgt-primary b5-frozen --end 2026-10-29 --out evaluations/study9b-runs/reconcile-2026-10-29` | 36/36 PASS, 1,854 lots, 0 mismatches |
| 09:26 | `package.json` scripts `study9b`, `study9b-run` added (E4) | `npm run study9b-run -- list` exit 0 |
| 09:27; 09:32–09:33 | `research/study9-phase-b/tools/runner_edge_cases.sh evaluations/study9b-runs/edge-cases-20261103T092727Z`, then `research/study9-phase-b/tools/runner_edge_cases.sh evaluations/study9b-runs/edge-cases-20261103T093208Z` (before and after the E4 label change) | 11/11 cases as expected |
| 09:38:55 → ≈ 10:00 | final independent audit (fresh read-only agent; brief `reviews/FINAL_AUDIT_BRIEF.md`) | `reviews/FINAL_AUDIT.md`: CLEARED WITH NOTES (0 blocking, 16 non-blocking; resolved in E5) |
| 10:13–10:15 | `research/study9-phase-b/tools/runner_edge_cases.sh evaluations/study9b-runs/edge-cases-20261103T101302Z` (after the E5 runner changes) | 12/12 cases as expected (`results/runner/edge-cases.txt`) |
| 10:15 | `npm run study9b-run -- list > research/study9-phase-b/results/runner/list.txt` | exit 0 |
| 10:15 | `python3 research/study9-phase-b/tools/build_tables.py search qualify selection test folds tracks preference diagnostics execution inherited perbook slice` | 49 tables |
| after 10:20 | `research/study9-phase-b/scripts/s9b.sh seal report-final` with the files listed in `RESEARCH_RECOVERY.md` ("Report seal") | chain 19 `report-final` (hash in `RESEARCH_RECOVERY.md`) |
