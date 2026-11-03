<!-- Verbatim handback of the independent read-only review agent (general-purpose subagent, finished 2026-10-26T13:30:42.483Z; reviewed the code as committed in 158f3aca, not the later funded-trade ledger work). Extracted unchanged from the session transcript on 2026-10-26. Brief: independent-review.PROMPT.md. Dispositions: docs/pools/WORK_RECOVERY.md section 6. -->

## Independent review of the B4/B5 pools and the prospective protocol (read-only)

**Scope.** I reviewed the code as committed in `158f3aca` (the user committed it at 13:25Z, during this review). The files I read match that commit. Since then the S10 work has started and I did **not** review it: the new `src/pools/trades.ts` and uncommitted edits to `src/pools/report.ts` and `src/pools/cli.ts`. All three are inside the code closure the freeze binds, so they need their own tests and review before any freeze.

### Checks I ran
- **Tests, typecheck, lint:**
  - `node --test src/pools/tests/*.test.ts`: 15/15 pass, none skipped.
  - `src/phenotype/tests/registry.test.ts`: 13/13 pass, including the COMPATIBILITY.md matrix.
  - `npx tsc --noEmit`: exit 0. `npx eslint src/pools src/app/pools.ts`: exit 0.
  - I did not run the full `npm test`. Its 562/562 log is from before S10.
- **CLI:**
  - `list`, `validate`, `show B5`, `research list|show|verify` and `forward status` all work.
  - `forward report` currently exits 1 ("freeze does not verify"), because no freeze exists yet.
  - `verify`: 64/64 PASS.
  - `fixed B4`, `fixed B5` and `portfolio B4`, each with `--out` in scratch.
  - I did not run `compare` or `costs`. They ignore `--out` for the per-run folders (see minor finding 1).
- **Independent Python checks:**
  - All 64 `data/*/data.csv` match the diverse-d1 baseline list. The splits, distributions, partitions, phenotype and frozen-reference hashes match the checkpoint.
  - The pool data pins equal the baseline.
  - Every README figure equals `controls.json` (`all`.B4/B5), at 0/2/5/10 bps and in both modes.
  - The 15 archived finalists are field-for-field equal to the sealed `J-u`/`T-u` `assessment.json`. Those files hash to the values `FROZEN_SELECTION.records` binds. Grid hashes and notation were recomputed.
  - The B4/B5 grids equal the phenotype JSONs, the `multi-etf-d1` nominations and the P-add-GDX GDX grid.
  - The lot CSVs confirm: every lot is $100,000; no overlaps; at most one open lot; exactly 5 bps on every entry and exit; interest = 100000·0.11·days/365 with integer days. The one same-minute tie funded KRE before XRT.
- **The code closure:** I re-parsed it with a broader import parser and it misses nothing (125 files). It contains no `.env`, network or broker code. The only `child_process` use is local `git`. The `pools` npm script has no `--env-file`.
- **Scratch scripts (wrote nothing to the repo):**
  - `observation-rerun.ts`: tests the forward report's observation-file check.
  - `ladder-scale.ts`: B4 at 10/15/20/25% and B5 at 20% on the frozen `all`.
  - `inner-cutoff.ts`: runs `forwardFiguresOf` at an inner historical cutoff, 2025-10-16, B4/B5 only. This exercised a carried lot, the windowed-drawdown self-check and the portfolio attribution on real data; all held.
  - `cutoff-reservations.ts`: at 2026-10-13 neither pool has an open lot or reservation.

### Material findings (a figure, guard or claim would be wrong)

1. **A second `forward report --snapshot <id>` always fails.**
   - `writeOnce` hashes the body *including* `firstWrittenAt` (`src/pools/forward/protocol.ts:80-91`).
   - The re-run check strips `firstWrittenAt` before re-hashing, so `hashBody(stored) !== bodyHash` every time (`src/pools/forward/report.ts:447-456`).
   - I reproduced it: hash check false, content check true.
   - This contradicts PROTOCOL.md:172, "reproducible from (freeze, snapshot)". The code is frozen, so it can't be fixed after the freeze.
2. **The frozen protocol expires on 2026-12-31.**
   - `src/lib/calendar.ts` sets coverage to 2026-12-31. `src/lib/session.ts:75-77` throws for any later session, and `forward/data.ts:26-31` refuses to import one.
   - `calendar.ts` is inside the bound code closure (via `#lib`). Extending the calendar changes the code digest, so every forward report is refused ("the code changed after the freeze", `freeze.ts:217-225`). There is no amendment path.
   - So v1 can observe at most about 55 sessions, far below its own 12-month / 20-lot evidence threshold.
   - It also contradicts PROTOCOL.md:72, which says a later session only needs "a reviewed calendar extension".
   - Fix before freezing: extend the calendar (2027 is published), or bind the calendar data separately with an append-only rule.
3. **The forward portfolio comparison is distorted by the different equity each pool carries at the cutoff.**
   - Equity at 2026-10-13: B4 $3.61M, B5 $5.41M. B4's ladder reaches only $2.87M / $3.22M / $3.61M / $4.04M at 10/15/20/25%.
   - The report prints "B5 − B4 … portfolio equity" and "at matched borrowing … B5 − matched B4" as dollar changes (`report.ts:184`, `373-400`; PROTOCOL.md §6 line 125, §7). These mostly measure the larger core's market move, not the strategies.
   - Measured at the inner cutoff 2025-10-16 (inspected history, B4/B5 only):
     - B5 − B4 forward equity change is +$621k, of which only about $267k is the strategy-net difference.
     - B4's ladder spans 29M–102M borrowing dollar-days against B5's 203M, so matched borrowing comes out "outside the ladder".
   - Forward *return* is comparable and is already shown. Normalise the comparison (return, or dollar-days ÷ cutoff equity) or drop the dollar lines before freezing PROTOCOL.md.
4. **The snapshot import accepts incomplete sessions.**
   - A session needs only one regular-hours bar (`forward/data.ts:252-258`).
   - The engine closes every session at the calendar close time (`session.ts` `closeTime`).
   - So a snapshot downloaded during trading hours has its partial last session treated as complete: marks, close-time exits and drawdowns at a mid-day price. That would be sealed write-once as an observation.
   - Fix: require the last regular bar at or near 15:59 (12:59 on early closes) or a minimum bar count, and refuse today's date.

### Minor findings
1. **`--out` is not honoured everywhere.** `costs` drops `--out` entirely, and `compare --out` applies only to the compare files; the per-run folders still go to `evaluations/pools/all/` (`cli.ts:226`, `281-284`). Separately, `assertOutsideResearch` does not protect `data/`. The README claims `--out` works for every command.
2. **The freeze records more than it enforces.**
   - The pool file's sha256 is recorded but not checked; only the algorithmic hash is, while PROTOCOL.md:159 says "binds the pool files".
   - Not bound at all: `config/market-events/distributions.manifest.json` (it holds the coverage date), `src/app.ts`, `package.json`, the Node version.
   - `frozenReference.manifestSha256` is never checked anywhere.
   - `verify` does not hash-check `controls.json` or the frozen ledgers. They are git-tracked and unchanged.
3. **Gaps in the forward data guards.**
   - `composeSnapshot` re-hashes the snapshot CSVs but not the snapshot's `distributions.csv` (`data.ts:388-404`).
   - Distribution rows are not validated: ETF, ex-date after 2026-10-24, duplicates, numeric amounts. Pre-cutoff duplicates would be caught by the cutoff-state check.
   - The report does not check that the snapshot record's `freezeBodyHash` matches the current freeze.
   - `forward import` checks only that the freeze exists and its body hash holds, not the full verification.
   - Split detection catches only overnight moves beyond ±25%, so a 5:4 split would pass.
4. **PROTOCOL.md says things the code does not do.**
   - Line 23: "64 files … bound". Only the 6 member files are pinned.
   - Line 106: "calendar-year forward tables". Only monthly ones exist.
   - Line 123: "the whole-run minute % … shown separately". It is not shown.
   - Line 77: "distributions after the ledger's coverage". Not enforced.
   - The evidence threshold counts calendar months touched, so with 248 sessions it reported 13 months; the 12-month mark is reached about a month early.
5. **README:** it says `forward report` with no snapshot prints the zero-observation statement and that every listed command exits 0. Before the freeze, that command fails.
6. **Cosmetic:**
   - The portfolio refusal reason reads "pool reserved by a pending order by a KRE pending order" (`run.ts:266`).
   - The schema comment overstates what enters the hash: name, role, candidateId, phenotypeFile and sensitivityBps do not.
   - Pool ids are not validated before `path.join`. Only the schema rejects a research JSON.
   - The research "leak" check is weak (`research.ts:238-241`).

### What checked out (your questions 1–8)
- **Provenance (1):** the five books equal the frozen research books exactly. The hashes (B4 `5bfc4fd5…`, B5 `92d73fc3…`) are sound. A phenotype grid edit is refused by the pinned grid and the frozen bridge, and an edit to both files changes the algorithmic hash, which the freeze checks.
- **Funding (2):** one slot, a constant non-compounding $100k, the shadow policy with alphabetical ties, 11% simple interest and 5 bps per side are all confirmed. The portfolio mode and the frozen dividend convention equal the controls. The symmetric convention has no frozen `all` reference to regress against.
- **Report labels (2):** minute vs daily drawdowns, the % denominators, and fixed P&L vs portfolio growth are labelled correctly.
- **Regression (3):** `verify` uses exact equality with no weakened tolerance. `newSymbols: ["GDX"]` is legitimate: `src/joint-16-etf-d1/controls.ts:147` passes the same argument. It changes only `newLots` (16) and `newLotDays` (347); every other field is compared.
- **Archive (4):** it holds exact copies of the selected sealed fields, not whole assessment objects, and no run command can load it.
- **Boundary (5):**
  - Forward net is M_end − M_C, and a carried lot is attributed from its cutoff mark.
  - Interest is the difference of paid-plus-accrued totals, borrowing dollar-days = interest × 365 ÷ rate, and friction counts only fills after the cutoff. Nothing is double counted.
  - Both drawdowns reset at the cutoff. The windowed minute drawdown is self-checked against the engine over the whole run, and the hard-coded 11% is guarded.
  - The canonical files are only read, and are hash-checked.
  - The no-data path computes no P&L.
  - I found no path that reads post-cutoff bars before the freeze.
  - Two edge cases are not live at this cutoff: dividends with an ex-date before the cutoff but paid after it would count as "forward dividends", and a lot decided before the cutoff but filled after it would not appear among forward decisions.
- **Protocol (6):** deferring the challengers is consistent with diverse-d1 §15.4 ("nothing evaluated after 2023") and §22 (no "one more look"). J-u-f1 and T-u-f1 are indeed the top-ranked unseeded finalists.
- **Isolation (7):** no frozen study, data, split, partition, distribution or phenotype JSON changed.

### Disclosure
My `npm run pools -- verify` run (one of the allowed commands) rewrote the git-ignored `evaluations/pools/verify/verify.json`. Its hash is now `a23176aa…`, not the `40b0b400…` cited in `docs/pools/WORK_RECOVERY.md`. Nothing else in the repository was written.

Scratch scripts are in `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/010d3095-ab38-45a6-a34b-fb43ed1c0d12/scratchpad/pools-review/`:
- `observation-rerun.ts`
- `ladder-scale.ts`
- `inner-cutoff.ts`
- `cutoff-reservations.ts`

### Verdict
**Not safe to make the real write-once freeze yet.** The freeze binds both PROTOCOL.md and the code, so material findings 1–4 (and the unreviewed S10 changes) must be fixed, tested and re-reviewed first.
