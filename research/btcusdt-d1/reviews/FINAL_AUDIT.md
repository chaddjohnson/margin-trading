# Final independent read-only audit — BTCUSDT spot D1 study

**Auditor:** independent read-only subagent. **Written:** 2026-10-27T02:08Z (UTC, from the clock).
**State audited:** branch `research/btcusdt-d1-spot`, `HEAD` `40da6ddf…cfc99`; working tree ` M package.json`,
`?? src/btcusdt-d1/`, `?? research/btcusdt-d1/`, `?? config/research-phenotypes/` (only `btcusdt-d1/` inside).
Freeze body `a7fd1b50…`, outcome-critical digest `15273626…` (22 files, equal on disk), report-only files changed
since the freeze: `cli.ts` (now `ec2c1ca0…`, frozen `32b4fa6f…`) and `tables.ts` (now `2e620027…`).

**What I ran** (Node v24.21.0). `npm run btc-d1 -- verify` passed 19/19. `data-audit` matched the sealed audit.
`chronology` matched the freeze. The 47 BTC unit tests passed. I made ten `fixed` runs on permitted dates into
`evaluations/btcusdt-d1/final-audit/`, which is git-ignored. I made twelve refusal attempts. I also wrote my own
scripts in the session scratch directory:
- recomputed every body hash, stamp and cross-link;
- recomputed the gates and picks from SELECTION.json and the archives;
- recomputed the hashes of the prospective freeze's files;
- wrote a **third, independent implementation of BTC D1** in Python, from BTC_CLOCK_AND_EXECUTION.md, not from the
  TS code. It reads only raw rows before 2024-07-01 and stops reading at the first later row.

I ran no stage command, and I read no bar at or after 2024-07-01. I changed no file other than this one.

## Verdict

**The implementation, the sealed records and the negative conclusion hold. I found no blocker.**

- **Engines.** Both engines are causal and implement D1's rules on the UTC clock. My independent Python engine
  reproduces them **exactly, to the last bit**:
  - every trade, every fill price and every net;
  - the minute and daily drawdowns of three full development-span runs (33, 49 and 105 trades, all four exit
    reasons);
  - every figure in both sealed VALIDATION records: each pick, the shortlist centre and the diagnostic, at five
    settings plus the flat start (54 figures). That includes fold A rank 1: −29,144.944307 USDT net and a
    70,456.731770 USDT minute drawdown.
- **Records.** Every sealed record verifies. The 9 outcome records carry the freeze, outcome-code and procedure
  stamps, and all were written after the freeze. Each PICKS record precedes its VALIDATION, and each VALIDATION
  names its PICKS body hash. Recomputing the PROTOCOL §8 gate from VALIDATION.json gives FAIL for both folds:
  - fold A fails on net, conservative net, worst-fill net, the single-trade test and the 35,000 USDT drawdown cap;
  - fold B fails on net and on entries (0 < 5).

  So PROCEDURE_GATE `pass = false` is correct.
- **Holdout and selection.** No engine run read the holdout, and the CLI door refused every attempt. I rebuilt the
  shortlist gate flags, the scores and the family picks from the sealed SELECTION records; all three selections
  give exactly the sealed picks.
- **Reports and isolation.** The reports' numbers trace to sealed records or demo outputs. There is no BTC
  buy-and-hold benchmark anywhere. Earlier studies and the prospective B4/B5 freeze are untouched.

The one major finding concerns reporting only: the trade files of `fixed --dataset <window>` runs do not match
their terminal report. It touches no sealed outcome and no verdict. The minor findings are wording, documentation
and checkpoint accuracy. The negative verdict is conditional on the preregistered 35,000 USDT drawdown ceiling
(note N1).

## Findings

| # | Severity | Location | What is wrong | Evidence | Recommended disposition |
|---|---|---|---|---|---|
| A1 | **major** (reporting only; no sealed outcome affected) | `src/btcusdt-d1/report.ts:309-318` (CSV/JSON write `run.trades`) vs `report.ts:137-148` (report/summary use `windowTrades`); `IMPLEMENTATION_AUDIT.md:11`; `README.md:59` | For a `--dataset <window>` run, `trades.csv` and `trades.json` hold every trade of the continuous account since 2019-02-11. `report.txt` and `summary.json` list and count only the trades held in the window, and no column marks which is which. When a trade is carried into the window, the window's gross/fees/impact include that trade's whole life, so gross − fees − impact ≠ window net. The claim "terminal = trades.csv = trades.json = summary.json" holds only for full-span runs, so the brief's "terminal and CSV/JSON results reconcile" is not met for a documented runbook command. | `fixed fold-a-r1 --dataset fold-a-validation`: CSV/JSON 49 rows; report/summary 9 trades. Σ CSV nets = 281,971.80; window net = −29,144.94. `fixed fold-a-r2 --dataset fold-a-validation`: summary gross − fees − impact = −17,848.75 vs window net −14,190.89 (trade #25 carried in). The window net and drawdowns themselves equal VALIDATION.json exactly. | Fix in the report-only formatter: add `in_window` and `carried_in` columns (or write the window's trades plus a separate full ledger). Compute or label the window cost totals as the in-window contribution versus the lifetime of the trades held. Scope the IMPLEMENTATION_AUDIT claim. |
| B1 | minor | `README.md:13`; `FINAL_COMPARISON_AND_RECOMMENDATION.md:45` | The reports overstate the crash-buyer pattern. "Only crash-buyer vectors (arming after a 47–59% fall) were feasible in-sample" and "the vectors that pass arm only after a 47–59% fall" are both too strong. | Feasible (G1+G2+G6) vectors reach down to X 21.2%: fold A has 183 of 2,307 feasible vectors below 40%, fold B 3 of 1,895, final 2 of 1,638. The G1–G6 eligible vectors span X 45.4–59.6%, and the nine picks 49.1–58.8%. SEARCH §2 ("92% / 99.8% arm only after ≥ 40%") is accurate. | Reword, e.g. "almost all feasible vectors (92–99.9%) need a ≥ 40% fall; every eligible vector needs 45–60%". |
| B2 | minor | `ENGINE_PARITY_AND_TESTS.md:59` | "44 tests at the freeze" is wrong. | Since the freeze, `verify` lists only `cli.ts` and `tables.ts` as changed (the test files keep their freeze hashes), and the suite has 47 tests. §6 of the same file says "+47 BTC tests", and the checkpoint says 47. | Correct it to 47. |
| B3 | minor | `README.md:86`; `RESEARCH_RECOVERY.md:91`; `src/btcusdt-d1/stages.ts:229-236` | "Stage commands … refuse to rerun" is not true of `parity`: it never checks the freeze and writes a new labelled `PARITY-rN.json` every time it runs. `benchmark`, `freeze` and `gate` do their computation first and only then refuse in `writeSealed`. The checkpoint's "rerun from scratch if absent" is also inaccurate. | Static reading; I did not run it. A post-freeze `parity` would read development data only, and the freeze still cites `PARITY-r2.json`. But it would add a new sealed file that `verify` lists. | Correct the docs. Optionally refuse `parity` in `cli.ts` (report-only) once the freeze exists. |
| B4 | minor | `src/btcusdt-d1/cli.ts:556-565` | `verify`'s check "prospective B4/B5 freeze untouched" only tests that the stored `bodyHash` string starts with `407a669b`. It does not recompute the body, and it checks neither the 134 bound files nor the script, imports and lockfile, so the label overstates it. | My recomputation: body `407a669b2bfd5245…` = stored. All 133 hash-pinned files match (the 134th, `src/lib/calendar.ts`, is an `append-only` entry and unchanged in git). The `pools` script, imports map, lockfile `ee4c73e3…` and six data pins match. `final-pools-verify.log`: 66 PASS, exit 0. | Rename the check (e.g. "prospective freeze record present") or make it recompute; cite `pools verify` as the real evidence. |
| B5 | minor | `RESEARCH_RECOVERY.md` lines 24, 35, 57, 80, 100-106, 112 | The checkpoint is partly stale or inaccurate:<br>• §6 still lists fold A as running work, with rerun instructions.<br>• §2 says `pools verify` was "not yet run".<br>• §4 says "nothing in them changes after it", which contradicts PROTOCOL §12 (costs.ts strings were rewritten; costs.ts `bd746e23…` → `2e19054d…`).<br>• The top-screen do-not-rerun list omits fold A/B, gate, final and phenotypes.<br>• "benchmark complete ~00:28Z" is an estimate (the record says 00:25:13Z).<br>• "phenotypes written 01:35:50Z" vs file mtimes 01:35:36Z. | File contents vs `writtenAt` fields and `stat` times. The stage guards would still refuse every rerun. | Refresh the checkpoint (context-recovery guide §2.2: clock timestamps, accurate running-work and do-not-rerun lists). |
| B6 | minor | `src/btcusdt-d1/cli.ts:309-337, 377-392`; `door.ts` | The door logic lives in the frozen `door.ts`, but it is called only from report-only `cli.ts`, and `cli.ts` changed after the freeze. Nothing records what changed in `cli.ts` and `tables.ts` after the freeze, and no test exercises the CLI door. A later `cli.ts` edit that dropped the guard or door call would pass every check. | I read the current `cli.ts`. Both `fixed` and `compare` call `guardOnceFrozen`, then `sealedDoor`, then `resolveDates` before any engine run, and slice the series at `end + 1`. All 12 refusal attempts were refused (below). | Record the post-freeze `cli.ts`/`tables.ts` hashes and the reason in IMPLEMENTATION_AUDIT/the checkpoint. Add a test (tests are report-only) asserting `fixed`/`compare` refuse holdout dates for every phenotype. |
| N1 | note | PROTOCOL §7.2 G1, §8; `FINAL_COMPARISON…md` §5 | The verdict is conditional on the preregistered **35,000 USDT** minute-drawdown ceiling. That ceiling is stricter than the brief's literal 35% rule; it was added before the freeze, on review findings M1/M4, and was never loosened. It is the binding constraint:<br>• ≤ 35% alone: 35–45% of vectors; ≤ 35,000 USDT: 5.4–8.1%.<br>• It forced the crash-buyer picks, which made no trade in fold B.<br>• Fold A fails regardless of the ceiling: −29,145 USDT, and negative at all 16 cost cells and all three stop conventions. | Archive statistics (SEARCH §2, recomputed). | Keep §5's statement and make it prominent in the user report. No post-hoc analysis under the 35%-only rule belongs in this study. |
| N2 | note | `FINAL_COMPARISON…md:37` | "All through days after its selection cutoff": the development-span drawdowns of fold-a-r2 and fold-a-r3 peak on 2021-10-20 (in-sample) and trough on 2022-06-18. The breach needs post-cutoff days, but the episodes span the cutoff. | `fixed fold-a-r2/-r3 --dataset development`: 52,001.79 and 51,309.80 USDT, peak 2021-10-20T14:51Z → trough 2022-06-18T20:52Z. | Wording. |
| N3 | note | CHRONOLOGICAL_VALIDATION tables; `fixed` report | "Exposure" has two definitions: exposure days over window days (32% for fold-a r1) vs held minutes over window minutes (29.37%, and FINAL_COMPARISON's "Time in BTC"). | VALIDATION.json vs summary.json. | Label each one. |
| N4 | note | `archive.jsonl.gz` rows; SEARCH §2 | The brief (§7) asks for realized vs unrealized for every candidate. The archive rows have marked net, gross, fees, impact and `openAtEnd`, but no realized/unrealized split. 22,811 of 68,530 final-window vectors end holding a position marked at the cutoff, and the selection net includes that mark (pre-freeze note n2). The neighbours' drawdown distributions are in SELECTION.json (`percents`) but SEARCH does not summarise them. | Archive keys and counts. | Disclose; optionally add a neighbour-drawdown summary to SEARCH (report-only). |
| N5 | note | `door.ts:122` | `fixed final-r1 --start 2024-07-01` is refused, but with "--start is after --end" instead of the door message with the latest permitted minute. | Refusal output. | Optional pre-check in `cli.ts` (`door.ts` is frozen). |
| N6 | note | RESEARCH_RECOVERY §4; PROTOCOL §12 | Two pre-outcome claims cannot be checked from disk: the pre-diagnostic `costs.ts` (`bd746e23…`) and the diagnostic scratch script are not preserved. Consistency check: the disclosed diagnostic result (105 trades, +89,223 USDT, 65.7%) equals the development-span result of both the reference engine and my independent engine (+89,223.455132 USDT, 65.7331%). The `params.ts` whitespace-only claim is verified (`663bbbb9…` copy). | — | Disclose as unverifiable; keep. |
| N7 | note | `results/logs/`, `results/baseline/`, `results/*/archive.jsonl.gz` | The logs are git-ignored by the root `.gitignore`, so a commit would not include them. The three archives total 86 MB (25–31 MB each). The data audit discloses non-price holdout facts (pre-freeze n4); `verify`, `snapshot` and `data-audit` read holdout bytes only to hash or count quality. | `git check-ignore`; `du`. | The user decides on commit scope. |
| N8 | note | repository test suite | `npm test` regenerates git-ignored files under `data/trailing-buy-entry/test-golden/` and `src/four-family/generated/`. It also rewrites two tracked files in `research/vgt-minute-optimizer/tmp/test-variants/` with identical content (git shows no change). This is pre-existing test behaviour, not a study edit. | Files changed since the branch was created, checked against git status and `.gitignore` rules. | None. |

## Checked and found correct

**Causal adapter (both engines).**
- Decisions are taken at completed minutes, and fills happen at the next traded minute's open. A last-minute decision
  fills at the next day's first trade, and gaps never create a fill.
- The reference high covers days d−L … d−1 and never includes the current day.
- The stop is set after each surviving day from the post-entry high (the fill minute onward on the entry day). It is
  active only if a sale at the stop is net-profitable.
- The maximum hold is decided on the opening trade and sells at the next minute.
- Buffered-loss vs stop precedence matches the ETF D1 original: the order is gap → carried buffered sale → hold →
  intraday (`evaluateBufferedSessionExit`).
- Continuation windows run in UTC days, close on any arming, and their high updates only on later days.
- There is no exit on the entry day and no entry on an exit day.
- The fast engine's skips are exact: monotone in the day's minimum close and low, and `assertValidSeries` guarantees
  low ≤ open.
- Selections and validations run on series physically sliced at the window end (`Evaluator.dataBefore`, `fixed`:
  `end + 1`).
- PARITY-r2 tested exactly the frozen engine closure (11/11 hashes): 205 runs, 0 differences, 0 ledger problems;
  192 + 96 mutation and truncation checks with 0 violations; both cheats caught (1 and 8 of 24 cutoffs).

**Independent reproduction.** My Python engine, written from the spec, matches the reference CLI trade for trade, to
the bit:
- final-r1 development: 33 trades, net 124,938.054281, mDD 25,708.840403 (25.6519%), dDD 20,888.210101;
- fold-a-r1 development: 49 trades, 281,971.804861, 70,456.731770;
- diagnostic development: 105 trades incl. buffered-loss exits, 89,223.455132, 104,192.777348.

It also reproduces all 54 sealed VALIDATION figures I checked (principal and its minute drawdown, the conservative,
stress, "low" and "stop" settings, and the flat start, for every pick, the centre and the diagnostic in both folds).
Hand spot-checks of fold-A trades #41, #45 and #46 against the canonical bars matched:
- the arming close against the 127-day reference high;
- the decision close against trailing low × 1.095;
- the entry at the next minute's open;
- the adverse stop at the next open below the stop;
- the maximum-hold exit at the second minute.

**Chronology and data doors.**
- N = 3,117 days and D = 2,332. The holdout starts on 2024-07-01: day ⌊0.75 N⌋ = 2,337 falls on 2024-07-06, whose
  month starts 2024-07-01. The holdout is 785 days (25.2%). The folds start 2021-12-01 and 2023-03-01 (days 1,399 and
  1,865).
- The arming day is 2019-02-11, and the minimum entries are 9 / 13 / 17 in selection and 4 / 5 in validation.
- All recomputed independently; equal to the freeze and to `chronology`. `calendar.ts` still carries its
  pre-outcome hash `35e5b26e…`.
- No stage code path evaluates past 2024-06-30: parity (development), benchmark (fold A and final selection), folds,
  final, `fixed`/`compare` door.
- Logs show only windows ending ≤ 2024-07-01 (exclusive). The demo outputs and all `evaluations/btcusdt-d1/*/summary.json`
  windows end ≤ 2024-06-30.
- `holdout` refuses on the failed gate, and `HOLDOUT.json` does not exist.
- The data door was refused on every attempt:
  - `--dataset all` and `--dataset holdout` (with and without `--flat`);
  - `--end 2024-07-01`;
  - `--start 2024-06-30 --end 2024-07-01`;
  - `--start 2024-07-01`;
  - `compare --end 2024-07-01` and `compare --dataset holdout`;
  - the diagnostic with `--dataset all`;
  - an invalid date, an unknown `--dataset`, and `--out` outside `evaluations/btcusdt-d1/`.

  The door is derived from the sealed PICKS, gate and HOLDOUT records with grid equality. The JSON door field is only
  checked, never trusted, and the demo shows a forged `final-r4` refused.

**Costs and account.** I reconciled, for `final-r1` (development), the diagnostic (development), `fold-a-r1`
(validation) and the diagnostic (fold A validation, fee 20 / impact 10, "low"):
- report.txt vs CSV vs JSON vs summary.json;
- for every trade:
  - fill = price × (1 ± impact) and notional = quantity × fill ≤ 100,000;
  - notional = min(100,000, available / (1 + fee)), where available = the reconstructed cash;
  - entry fee = notional × fee and exit fee = proceeds × fee;
  - gross − fees − impact = net, with interest 0;
  - the cumulative realized net;
- sequencing: no overlapping trades, exit day > entry day, no entry on an exit day;
- account level: elapsed days, Σ nets = realized, cash and final equity.

Marks are at liquidation value. The minute and daily trackers start at the window's start equity, and the daily
drawdown never exceeds the minute one. Fixed mode records top-ups (35,193.23 USDT for the diagnostic). The `fixed`
reference engine equals the sealed fast-engine VALIDATION and SELECTION figures exactly.

**Study records.**
- All 14 sealed JSON records verify under my own hashing, and the three archive hashes match.
- Stamps: every outcome record carries freeze `a7fd1b50…`, digest `15273626…`, procedure `90ff5f56…` and
  v24.21.0.
- Timeline: freeze 01:21:32Z → fold A PICKS 01:24:30.172 → VALIDATION 01:24:31.136 → fold B PICKS 01:29:25.488 →
  VALIDATION 01:29:26.046 → gate 01:29:52 → final 01:34:59. File mtimes agree.
- Cross-links: `selectionBodyHash` and `picksBodyHash` link correctly.
- The PARITY and BENCHMARK records hold only differences, trade counts and timings.
- The three bound documents still carry their frozen hashes.

**Selection procedure.**
- Archives: 68,554 / 68,555 / 68,530 distinct vectors.
- Gate flags: G1/G2/G6 recompute from the metrics; G3–G5 flags and the scores recompute from the stored neighbour
  nets.
- Picks: eligible 18 / 13 / 7, and the family picks recompute to the sealed ones with pairwise distance ≥ 0.627.
- Shortlist: minimum pairwise distance ≥ 0.100, at most 6 per lineage.
- Every SEARCH and CHRONOLOGICAL table row matches `tables` output rendered from the records.
- Every distribution, frontier, cost-ratio and skip figure I checked matches the archives.

**Conclusions.** Every headline number in README, CHRONOLOGICAL_VALIDATION and FINAL_COMPARISON traces to a sealed
record or `results/demo/`, apart from the wording issues in B1 and N2. The evidence classes are stated correctly:
in-sample, reused validation, no holdout, no prospective evidence. A grep of the study's code, documents, phenotypes
and demos finds **no BTC buy-and-hold** computation or comparison; the only mentions say it is excluded, and
"benchmark" means only the timing benchmark. The phenotype JSONs carry the eight parameters with units, the snapshot
hashes, the boundaries, seeds, origin, evidence, research-only status, doors through 2024-06-30 and gate failures.
The diagnostic equals `config/phenotypes/D1/VGT.json` "primary".

**Isolation.**
- `git diff`: only `package.json`, adding the `btc-d1` script plus a comma on the previous line.
- Against the prospective freeze: the `pools` script, the imports map and `package-lock.json` (`ee4c73e3…`)
  match; the freeze body recomputes; its six data pins and four market-event and partition files match.
- Earlier freezes record `package.json` only as "modified tracked", not by hash.
- The BTC code imports only `src/optimizer/{rng,sobol}.ts` from earlier code, with no network, `.env` or
  credential access.
- BTC raw file: sha256 `dd91a2b36d1ea513167861b916723e65ffaeb3f2cc8deefe44e3993c0298de83`, mtime 2026-10-20,
  unchanged.
- Test logs: baseline 607/607; final 654/654 (+47); `pools verify` 66 PASS.
