<!-- Verbatim handback of the focused third-check agent (finished 2026-10-26T14:42:32.162Z; checked b9a928bb). Extracted unchanged from the session transcript on 2026-10-26. Brief: third-check.PROMPT.md. Dispositions: docs/pools/WORK_RECOVERY.md section 8. -->

## Third check: second-review fixes (§7), read-only

**Verdict: safe to make the real freeze now.** I found no material defect. Before freezing, consider one design point: the completeness guard has no override (minor finding 1). It cannot be added once the code is frozen.

**What I checked:** commit `b9a928bb`, `PROTOCOL.md` sha256 `af0c4458…`, code digest `42971d65…` (134 files). The user committed the S10–S12 work while my check was running. No bound file changed after my checks started, and `git status` is clean.

### Checks I ran
- **Tests, typecheck, lint:** pool tests 24/24 pass, none skipped. `tsc` exit 0. `eslint src/pools` exit 0.
- **`verify`:** 66/66 PASS, including the new controls.json sha256 pin for B4 and B5.
- **Pool runs (all with `--out` in scratch):**
  - `fixed B5`, `fixed B4 --end 2025-12-31` and `compare B4 B5 --mode both` all exit 0.
  - `costs B4 --mode bogus` exits 1 with "--mode must be fixed or portfolio".
- **Interest:** in all 246 trade rows (three runs), interest = 100000 × 0.11 × `interestDays` ÷ 365 exactly, and `interestDays` is always a whole number.
- **2025 ledger:** with `--end 2025-12-31` the counts are 47 profitable / 28 losing / 1 open. The open XRT lot has an empty `exitNewYork` and `markedAt` "2025-12-31 close". The README's 47/29 and 61/33 match the full runs.
- **Code closure:** a broader import parser (both quote styles, side-effect imports, `require`) finds the same 134 files.
- **Daily % drawdown, independent check:** I recomputed it in Python from `daily.csv` at 15 cutoffs for both B4 and B5 and compared with `forwardFiguresOf`. Every one matches exactly (maximum difference 0), including the peak and trough dates.
  - At 2025-10-16, B5 is now 15.22%; the old code gave 13.83%.
  - From an early cutoff, the figure equals the engine's PercentTracker: 34.6461% (B4) and 29.6678% (B5).
- **Ladder on real history:** all nine rungs run. At 2025-10-16, B5's intensity is 50.68 and the ladder reaches 63.90, so the result is now "interpolated" between 35% and 40%. Before the fix it was "outside the ladder".
- **Last-bar timing, all of history:** I measured how close to the close each member's last regular bar falls, for all six members.
- **Scratch-only end-to-end run:** a temporary freeze (verifies with no failures), then the no-snapshot report, synthetic imports and two reports.
  - The no-snapshot report reproduced the cutoff state for all 6 pool/mode pairs, and its `report.txt` and `forward.json` both carry the limitations and the environment record.
  - Imports refused, as they should: a snapshot holding today's date; KRE alone truncated at noon; GDX missing its last 20 minutes.
  - A clean 8-session snapshot imported. Report pass 1 wrote the observation; pass 2 printed "reproduced".
  - The observation body carries the code digest. `forward.json` records Node, the digest and the calendar coverage, and the friction bps.

### §7 items: all resolved
- **Daily % drawdown (the material item):**
  - `forward/metrics.ts:60-89` now tracks the percent fall separately from the dollar fall.
  - `:267-284` reports `daily.percent`. The comparison uses it at `forward/report.ts:455-457` and prints it at `:194-196`.
  - Test: `forward.test.ts:281-294`.
- **Ledger labels:**
  - `interestDays`: `trades.ts:62-63`.
  - Win/loss and largest win/loss over closed trades only: `:110-118`, `:138-147`.
  - Drawdown peak and trough in New York time: `:387`.
  - Rate taken from the run, not hard-coded: `:364` and `report.ts:279`.
  - Open lot (empty `exitNewYork`, plus `markedAt`): `:51-52`.
  - "the XRT lot": `run.ts:268`.
- **M2 (calendar):** trailing comments tolerated at `protocol.ts:76`. Unit test at `forward.test.ts:322-341`.
- **M4 (completed sessions):** every member must have a bar in the last 15 minutes, `data.ts:34-66`, called at `:374-380`. Tests at `forward.test.ts:296-320`. The protocol's claim that 2024–2026 last bars are within 2 minutes of the close holds (maximum gap 1 minute).
- **M3 (ladder):** fractions 5–50% at `protocol.ts:20`. Exact match, including 0 vs 0, at `report.ts:77-84`. Tests at `forward.test.ts:343-352`.
- **Distribution and split guards:**
  - Ex and pay dates must be NYSE sessions: `data.ts:26-30`, `:268-271`.
  - Yield ≤ 3%: `:278-284`.
  - The "through" date must be after the frozen coverage and on or after every ex-date: `:251-255`, `:274-275`.
  - A declared split must explain the move: `:206-211`.
  - Tests: `forward.test.ts:354-391`.
- **Leftovers:**
  - `compare --out` writes per-mode folders (`cli.ts:228-245`); I confirmed separate folders on disk.
  - The freeze binds `src/app.ts`, the `"imports"` map and `package-lock.json`: `protocol.ts:65`, `freeze.ts:37-42`, `:181-186`, `:252-264`.
  - Controls sha256 pin: `verify.ts:86-93` and `controlsSha256` in `B4.json`/`B5.json`.
  - `costs --mode` validated: `cli.ts:282-284`.
- **README:** the two commands that need data are marked (lines 14, 50-51), and the `--out` layout is described (lines 57-59).

### PROTOCOL.md against the code
It matches. The six earlier mismatches are fixed:
- the import vs report refusals (§8, lines 206-210);
- the code digest, Node version and calendar coverage records (lines 212-214; `report.ts:296`, `:503`, `:519`);
- limitations in every report (§9, line 220; `report.ts:215`, `:310-311`);
- `--source` in the import command (line 61);
- friction recorded in bps as well as dollars (line 116; `metrics.ts:306`);
- the daily % drawdown definition (lines 139-141).

§2–§7 also agree with the code: the 15-minute window and the 12:45 early-close cut-off, the 5:4 split screen, the distribution rules, the ladder, the evidence threshold and the challenger deferral.

### Material findings
None.

### Minor findings
1. **The completeness guard has no override (design risk, worth deciding before the freeze).**
   - A vendor gap near the close makes that session unimportable. Because snapshots are cumulative, every later snapshot would be refused too, and unlike `--confirm-move` there is no recorded override.
   - The canonical history has such sessions:
     - 2019-08-12: every member's last regular bar is 23–32 minutes before the close.
     - 2017-04-04: VOOG's last bar is 17 minutes before the close.
   - That is 2 of 2,710 sessions, and none in 2024–2026.
   - The 2019 case would also have failed the old rule. The "every member" change adds single-member cases like the 2017 one.
   - Fix: a recorded `--confirm-complete SYMBOL:DATE` override, added before the freeze.
2. **Matched-borrowing ties:** when several rungs share B5's intensity (in practice only 0, meaning no forward lots), it picks the 5% rung. That is harmless here: in the sandbox every rung was 0/0 and matched at 5%.
3. **PROTOCOL §8 understates the bound code:** it lists `src/app.ts` as one file, but the code binds its whole import closure, including `src/phenotype/cli.ts` (134 files, up from 126). This binds more than stated, not less.
   - Practical effect: after the freeze, any edit to a shared file in that closure (for example `src/lib/index.ts`, `src/phenotype/*`) or to `package-lock.json` will make forward commands refuse to run.
4. **`--distributions-through`** is not limited to the snapshot's last session or the import day, and it is silently ignored when no `--distributions` file is given.
5. **Cosmetic:**
   - The `trades.json` definition of interest still says "days held" (`report.ts:347`), not `interestDays`.
   - The terminal table's "days" column is elapsed time. The README says so.
   - `metrics.ts:57` is a stale duplicate comment.
   - The forward report's "equity at cutoff → end" row overflows its column.

### Side effects
- My allowed `verify` run rewrote the git-ignored `evaluations/pools/verify/verify.json` (sha256 `37930c01…` → `e2bbc733…`).
- The sandbox freeze, snapshots and reports exist only in scratch; none of it is an observation.
- The repository is unchanged: `git status` is clean, there is no `PROTOCOL_FREEZE.json`, and no `data/prospective/` or `evaluations/pools/forward/`.

Everything is in `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/010d3095-ab38-45a6-a34b-fb43ed1c0d12/scratchpad/third-check/`:
- scripts: `scripts/closure.ts`, `scripts/inner.ts`, `scripts/e2e.ts`, `scripts/dd_pct.py`, `scripts/last_bar.py`, `scripts/interest_days.py`;
- logs: `tests.log`, `tsc.log`, `eslint.log`, `verify.log`, `e2e.log`, `inner.log`, `closure.log`.

**Verdict: yes, it is safe to make the real freeze now. Optionally add the completeness-guard override first, since it cannot be added after the freeze.**