# Engine parity, lookahead tests and isolation

## 1. Two engines

- `src/btcusdt-d1/engine.ts` — the reference: plain objects per day and minute, one completed minute at a time, the
  full ledger (every trade field of the `fixed` report), events and decision signals.
- `src/btcusdt-d1/fast.ts` — the search's replay: typed arrays, a monotonic-deque rolling high, flat days without a
  setup skipped by an exact monotone test on the day's lowest close, minute walks on every day with a setup or a
  position. Separate code, the same expressions for every money figure, so equality is exact.

## 2. Parity

`src/btcusdt-d1/parity.ts` compares, for every run: trade count; per trade the entry and exit time, bar, day, price,
kind and reason, quantity, notional, both fees, gross and net; per reporting window the start and end equity, net,
minute and daily drawdowns in USDT and %, entries, exits and mark count; the final cash, BTC, equity, realized and
unrealized; setup counts; and the full list of decision signals (arming, buy trigger, cancellation, stop, gap,
maximum hold, buffered-loss signal, each with its bar). `reconcileLedger` checks every reference ledger: closed nets
sum to realized; cash = initial + top-ups + realized − open cost; equity = initial + top-ups + realized + unrealized;
gross − fees − impact = net per trade; notional = quantity × fill price ≤ 100,000; cash ≥ 0.

**Synthetic fixtures** (`tests/engine.test.ts`, `tests/mutation.test.ts`): every scenario is checked under the three
stop conventions × fee/impact 0/0, 10/5 and 30/20.

**Real data**, development data only (the holdout is not read): the diagnostic vector and 40 uniform random vectors ×
five settings (0/0, principal 10/5, stress 30/20 adverse; principal with "stop" and with worst-case "low" fills) =
205 runs on four windows (development, fold A selection, both validations).

| Record | Code | Runs with a difference | Max money difference | Ledger problems | Trades |
|---|---|---:|---:|---:|---:|
| `results/parity/PARITY.json` (body `0aa399b4…`) | before the review's engine fixes | 0 | 0.0 | 0 | 7,462 |
| `results/parity/PARITY-r2.json` (body `7663f900…`), labelled rerun, same seeds and vectors | **the frozen engine closure** | **0** | **0.0** | **0** | **7,462** |

Coverage in the rerun at the principal costs: 1,492 trades; 300 held across a data gap of ≥ 60 minutes; 55 trailing
stop gaps at a day's open; 1 buy carried past midnight. Fills after a missing minute and carried sales (buffered or
stop) did not occur with these vectors; they are covered by fixtures and the reviewer's probes. The freeze refuses
unless the latest parity record tested exactly the engine closure being frozen (`records.ts engineClosure`).

## 3. Lookahead mutation (`src/btcusdt-d1/mutation.ts`)

Every bar from a cutoff on has its four prices scaled by a random factor in [0.7, 1.3] and its volume replaced; the
run is repeated; everything recorded before the cutoff must be identical: decision signals from earlier bars, entries
and exits at earlier bars (time, price, quantity, notional, fee, net), and every reporting window ending at or before
the cutoff.

- Fixtures: every cutoff of a 22-bar series with stops, a maximum hold, missing minutes and an open end, for both
  engines and all three stop conventions: 0 violations.
- Fixtures, truncation: every bar from each cutoff deleted (times, gaps and the end of data change), both engines,
  all three conventions: 0 violations.
- Real development data (PARITY-r2): 24 cutoffs (12 UTC day boundaries, 12 random minutes) × the diagnostic and three
  random vectors × both engines: 0 violations in 192 checks; truncation, fast engine: 0 violations in 96 checks.
- Deliberately cheating runners are caught: "next-minute low" (each minute's low includes the next minute's) on the
  fixture and at 1 of 24 real cutoffs; "same-day high" (a reference high that contains the current day's complete
  high) on the fixture and at 8 of 24 real cutoffs.
- Selections slice the series at their cutoff (`Evaluator.dataBefore`), so a selection cannot read a later bar at
  all; validation runs slice at the validation end.

## 4. Test results

Study suite (`src/btcusdt-d1/tests/`; 47 tests at the freeze, 50 after the report-only `door.test.ts` was added
following the final audit): `engine.test.ts` (clock, entries, exits, re-entry,
continuation, accounting), `mutation.test.ts` (lookahead at every cutoff, truncation, two caught cheats,
stop/buffer precedence), `probes.test.ts` (the reviewer's eight parity probes), `data.test.ts` (parser, snapshot
rules, series validation, subperiods), `gates.test.ts` (the out-of-sample gate, including a carried-in position),
`door.test.ts` (the CLI data door: every request reaching the holdout is refused). Final repository-wide results are
in §6.

## 5. Isolation from earlier studies

- New code only under `src/btcusdt-d1/`; study files only under `research/btcusdt-d1/`,
  `config/research-phenotypes/btcusdt-d1/` and the git-ignored `evaluations/btcusdt-d1/`.
- One shared-file edit: a `btc-d1` script added to `package.json`. The prospective B4/B5 freeze binds the `pools`
  script string, the imports map and `package-lock.json`; all three are unchanged (checked against
  `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`, lockfile sha256 `ee4c73e3…`).
- No file bound by that freeze (134 code files) and no earlier study record, phenotype or data file was edited.
- The BTC code imports `src/optimizer/rng.ts` and `src/optimizer/sobol.ts` read-only (their hashes are in the BTC code
  manifest) and nothing else from earlier studies.
- Adding `src/btcusdt-d1/*.ts` changes the `src/**/*.ts` manifests that some completed studies (e.g. ranked
  preemption) compute; those studies are complete, never rerun, and are checked at their own commits.

## 6. Final verification (2026-10-27, after every stage)

| Check | Result |
|---|---|
| `npm test` (repository, 01:43:42Z → 01:46:40Z) | **654 / 654 pass**, 0 fail, 0 cancelled, 0 skipped (baseline before this study: 607 / 607; +47 BTC tests) — log `results/logs/final-npm-test.log` |
| `npm test` again after the audit's report-only fixes (02:15:00Z → 02:17:56Z) | **657 / 657 pass** (+3 door tests), 0 fail — log `results/logs/final-npm-test-2.log` |
| `npx tsc --noEmit` | clean |
| `npx eslint` | 0 errors; the same 15 warnings as the baseline, all in earlier studies' files (none in `src/btcusdt-d1/`) |
| `npm run pools -- verify` (01:46:40Z → 01:48:13Z) | **66 / 66 PASS**, "all checks passed" — the prospective B4/B5 freeze and its pinned data are intact; log `results/logs/final-pools-verify.log` |
| `npm run btc-d1 -- verify` | 19 / 19 checks pass (snapshot prefix and series, freeze guard, every sealed record, phenotypes vs sealed doors, outcome stamps, holdout sealed, B4/B5 freeze body) |
| BTC raw file | sha256 `dd91a2b3…8de83`, 451,326,328 bytes, mtime 2026-10-20 (unchanged since before the study) |
| `data/partitions.json` | unchanged (tracked; no diff) |
| `git status --short` | ` M package.json` (one `btc-d1` script line), `?? src/btcusdt-d1/`, `?? research/btcusdt-d1/`, `?? config/research-phenotypes/` |
