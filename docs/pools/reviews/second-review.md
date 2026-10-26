<!-- Verbatim handback of the second independent read-only review agent (finished 2026-10-26T14:09:17.585Z; reviewed S10 + S11 on top of 158f3aca, uncommitted). Extracted unchanged from the session transcript on 2026-10-26. Brief: second-review.PROMPT.md. Dispositions: docs/pools/WORK_RECOVERY.md section 7. -->

## Second independent review: S10 trade ledger and S11 fixes (read-only)

**Verdict: not safe to make the real freeze yet.** One material defect remains: the forward portfolio "max daily % drawdown" uses the wrong definition, and that code would be frozen. Several smaller protocol mismatches should also be settled first, since they can't be changed afterwards.

### Checks I ran
- **Diff review:** all 18 modified files plus the new `src/pools/trades.ts`, read against `FixedLedger` (`src/multi-etf-allocator/ledger.ts:610-697`) and the engine's end-of-run marking (`src/portfolio-aware-d1/nbook/engine.ts:1264-1279`).
- **Tests, typecheck, lint:** pool tests 19/19 pass, none skipped. `tsc` exit 0. `eslint src/pools src/app/pools.ts` exit 0.
- **CLI:**
  - `verify` 64/64 PASS. `list`, `validate` and `forward status` work (status: no freeze, no snapshots).
  - These all exited 0 with `--out` in scratch: `fixed B4`, `fixed B5`, `fixed B4 --end 2025-12-31`, `portfolio B4`, `portfolio B5`, `compare B4 B5`.
- **Independent ledger check** (Python, `check_ledger.py`), on every trade of the three fixed runs:
  - gross before costs; friction is exactly 5 bps on each fill; shares × cost-adjusted entry = $100,000.
  - Interest = 100000 × 0.11 × (whole New York session-date days) ÷ 365.
  - gross − friction − interest = net; the cumulative net is right.
  - New York and UTC timestamps agree (checked with zoneinfo). MAE is never above 0. No trades overlap.
  - Field for field equal to the frozen `S0` and `P-add-GDX` `fixed-5-lots.csv` (76 and 94 rows, 0 mismatches).
  - Totals equal `controls.json` `all.B4/B5.fixed-5` exactly: net, interest, lots, minute and daily drawdown.
  - The open XRT lot is marked at 85.29, which is the raw 2025-12-31 21:00Z closing print. Its entry 82.025 is the open of the 14:39Z bar.
  - In portfolio mode `trades.json` also reconciles (12/12).
- **Code closure:** a broader import parser finds the same 126 files.
- **Calendar rule:** I tested six altered copies of `calendar.ts`.
- **Sandboxed end-to-end run, scratch only:**
  - a temporary freeze;
  - synthetic snapshots (the 2026-10-13 bars replayed onto later dates);
  - imports, then `runForwardReport` twice.
- **Inner historical cutoff** (2025-10-16, B4/B5 only): `forwardFiguresOf` for the B4 ladder and B5.
- **Rolling-window analysis** of portfolio `daily.csv` from the 20%/10–25% runs.

### Material finding
**1. The forward "max DAILY % drawdown" is the percent of the largest-dollar fall, not the largest percent fall.**
- **Where:**
  - `src/pools/forward/metrics.ts:58-82` (`drawdownFrom` selects by dollars) and `:262-272`;
  - compared in `src/pools/forward/report.ts:434-436`, printed at `:180-182`.
- **What it contradicts:**
  - PROTOCOL.md §6, line 134 ("maximum daily % drawdown") and §7, line 158.
  - The historical anchors (34.65% / 29.67%) use the engine's `PercentTracker`, which tracks the true maximum (`src/multi-etf-allocator/engine.ts:292-337`; nbook `engine.ts:417,1229`). So the forward and historical figures carry the same label but are different measures.
- **Evidence on real history:**
  - 2025-10-16 → 2026-10-13: B5 would be reported at 13.83% against a true 15.22%. B5 − B4 would read −2.19 points instead of −0.80.
  - Over rolling windows the figure is understated in 7–41 of 419–457 windows, by up to 5.4–6.1 points in 1-year windows.
- **Why it matters now:** the code is frozen with the protocol, so this can't be corrected later.

### Minor findings
**Trade ledger (S10).** Arithmetic and reconciliation are correct; these are labelling issues.
- The `days` column is elapsed time (e.g. 142.8), but interest uses whole session-date days (143). The README's "Interest = $100,000 × 11% × days held ÷ 365" (`docs/pools/README.md:94`) can't be reproduced from the days shown.
- An open lot's unrealized mark counts as "profitable" and towards "largest win", unlabelled (`trades.ts:106,133,141`). With `--end 2025-12-31` that gives 48/28, not 47 closed winners.
- The ledger's table times are New York, but the drawdown peak and trough lines are UTC ISO (`trades.ts:379`).
- "11%" is hard-coded in the ledger text (`trades.ts:356`).
- The CSV column `exitNewYork` holds text ("open at … close") for an open lot (`trades.ts:50`).
- Cosmetic: "a XRT lot".

**First-review fixes.**
- **M1 is resolved.** In the sandbox, the second report printed "reproduced".
- **M2 is resolved.** A legitimate 2027 extension passes. A changed code line, a removed holiday and a changed coverage start are all caught. Two remaining points:
  - an extension line with a trailing comment changes the hash, so the extension would be refused;
  - `normalizedCalendarHash` has no unit test.
- **M4 is mostly resolved.** A snapshot containing today's date was refused, and so was one where every member was truncated on its last session. The remaining gaps:
  - **A snapshot with only KRE truncated at noon was accepted**, because the five-minute check passes if any one member trades late (`forward/data.ts:322-334`).
  - The today and last-five-minutes guards have no unit tests.
- **M3: units, direction and interpolation are correct** (`report.ts:69-92`). The ladder is a design risk, not a wrong figure:
  - In the most recent real year B5's intensity is 50.7, against B4's 12.97–32.2, so the result is "outside the ladder".
  - Across 1-year windows it is unavailable in about 27% of cases: B5 above the 25% rung in 79/419, B4 not borrowing in 36/419.
  - When neither pool borrows (0 vs 0), it is also labelled "outside the ladder".
  - Consider extending `ladderFractions` (`protocol.ts:20`) before freezing.

**Guards that remain thin.**
- **Snapshot distributions** (`data.ts:188-235`) are missing three checks the canonical ledger audit applies (`market-events/ledger.ts:219-226`):
  - The ex-date isn't checked to be an NYSE session. The engine books only on `exDate === session date` (nbook `engine.ts:1007`), so a weekend or holiday ex-date is dropped silently.
  - The pay date isn't checked to be a session, so such a receivable is never paid (`:1188`).
  - There is no yield or split-unit plausibility check.
- **`--distributions-through`** can be set earlier than the frozen coverage, which would shrink the reported coverage.
- **A declared split's ratio** is never checked against the observed move (`data.ts:158-160`).

**Leftovers from the first review.**
- `compare --mode both --out DIR` writes both modes' compare files into DIR, so portfolio overwrites fixed (`cli.ts:244-267`; confirmed: `compare.txt` holds only the portfolio comparison).
- Not bound by the freeze:
  - `src/app.ts`, the script `npm run pools` actually runs;
  - the `package.json` `"imports"` map, so redirecting `#lib` would bypass the code digest;
  - `node_modules`.
- `verify` records source hashes but never compares them (`verify.ts:86,118-120`).
- `costs --mode` is not validated.

### PROTOCOL.md vs code: remaining mismatches
1. **§6/§7 "maximum daily % drawdown":** see material finding 1.
2. **§8 (line 201):** "`forward import` … refuse[s] when … the cutoff state does not reproduce". Import only runs `verifyProspectiveFreeze`, never the engine (`data.ts:256-262`).
3. **§8 (line 204):** "Every report records … the code it ran". Neither the observation body nor `forward.json` records a code digest, Node version or calendar state; only `freezeBodyHash` (`forward/report.ts:445-488`).
4. **§9 (line 210):** "stated in every report". The limitations are in `forward.json` only, not in `report.txt` (`formatForward`) and not in the no-snapshot report or record (`:267-292`).
5. **§4 (lines 60-61):** the import command omits `--source`, which the CLI requires (`forward/cli.ts:64-68`).
6. **§5:** "forward friction (bps and dollars)". Only dollars are recorded.

Everything else in §2–§8 matches the code, including the boundary edge cases (dividends are counted at pay date: nbook `engine.ts:1188-1196`), the normalized metrics, the evidence threshold, the snapshot bindings and the `freezeBodyHash` check.

### README
The figures and the `--end` example match my runs exactly. Two inaccuracies:
- "each one run and checked; exit status 0" (line 14) can't be true for `forward import` or `forward report --snapshot`, which have no data to run on.
- The `--out` note (lines 57-58) doesn't mention that `compare --mode both` overwrites its own files.

### Disclosure
- My allowed `verify` run rewrote the git-ignored `evaluations/pools/verify/verify.json` (sha256 `182ea272…` → `01fbc796…`).
- The sandbox freeze, the synthetic snapshots and the forward reports exist only in scratch. Nothing in them is an observation. The repository's `git status` is unchanged (21 entries), and there is no `data/prospective/`, `evaluations/pools/forward/` or `PROTOCOL_FREEZE.json`.

Everything is in `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/010d3095-ab38-45a6-a34b-fb43ed1c0d12/scratchpad/second-review/`:
- scripts: `scripts/e2e.ts`, `scripts/inner.ts`, `scripts/ladder.ts`, `scripts/cal.ts`, `check_ledger.py`, `dd_pct.py`, `ladder_windows.py`;
- logs: `e2e.log`, `inner.log`, `verify.log`, `fixed-*.log`.

**Verdict: not safe to make the real write-once prospective freeze now.** Fix the forward daily % drawdown definition first, and settle the ladder range and the six protocol-wording mismatches before freezing.