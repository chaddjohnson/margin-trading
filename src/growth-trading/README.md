# Growth (`rise-from-recent-low-trading` v1.2.0; legacy v1.1.0 and v1.0.0)

A trading backtest of one symbol. The unchanged Rise-from-Recent-Low scanner (`src/entry-signals/`) is its base entry;
since 1.1.0, optional continuation entries after a net-profitable exit (OFF by default; OFF = 1.0.0 exactly); since
1.2.0, an optional entry trend filter and optional persistent entry eligibility (both OFF by default; OFF = 1.1.0
exactly).
Execution and exits are the unchanged Study 8 D1 book: `ShadowBook` (`src/multi-etf-allocator/shadow.ts`) with its
`ExitManager` (`src/shared-margin-portfolio/strategy.ts`).

- `entryGates.ts`: the entry trend filter (five methods on trading-session observations), the original predicate per
  bar, and persistent eligibility (five bounded policies, opportunities, the reset-and-renew watch)
  (`docs/strategy-lab/GROWTH_ENTRY_GATES.md`).
- `continuation.ts`: the four continuation methods (Classic D1 through D1's own `EntryMachine`; breakout, shallow
  pullback and MA cross on the run's bars), episodes, the decision log (`docs/strategy-lab/GROWTH_CONTINUATION.md`).
- `riseTrading.ts`:
  - the parameters, the defaults (the VGT D1 baseline exits) and the fixed execution settings;
  - `simulateTrading`: decisions → the book, per minute;
  - `runRiseTrading`: sessions → bars → signals → simulation;
  - the ledger, the reconciliation with `FixedLedger`, and the metrics.
- Strategy Lab runs it through `apps/strategy-lab/runner/trading-run.ts`.
- Rules, switches and accounting: `docs/strategy-lab/GROWTH_TRADING.md`. The D1 mapping and the parity evidence:
  `docs/strategy-lab/GROWTH_TRADING_AUDIT.md`.
- `tools/capture-baseline.ts`: captured the 1.0.0 baseline (`tests/fixtures/baseline-1.0.0.json`) once, at `b590c60`,
  before the continuation code existed. `tools/capture-baseline-1.1.0.ts`: captured the 1.1.0 baseline
  (`tests/fixtures/baseline-1.1.0.json`, continuation OFF and every method ON) once, at `0301c01`, before the entry-gate
  code existed.
- `tools/paired-comparison.ts` (`npm run growth-paired -- --request <request.json> [--out DIR]`): one configuration with
  an entry gate ON against the same with both OFF, on identical data and costs — a retrospective diagnostic, never a
  search.
- Tests:
  - `tests/riseTrading.test.ts` (synthetic minute data);
  - `tests/offParity.test.ts` (real data): continuation OFF = the 1.0.0 baseline, field for field;
  - `tests/continuation.test.ts` (synthetic) and `tests/continuationRealData.test.ts` (real data): the methods;
  - `tests/offParity-1.1.0.test.ts` (real data): both entry gates OFF = the 1.1.0 baseline, in full;
  - `tests/entryGates.test.ts` (synthetic) and `tests/entryGatesRealData.test.ts` (real data): the trend methods, the
    eligibility policies, clashes, orthogonality and causality;
  - `tests/parity.test.ts` (real data; skipped without `data/`): exact trade parity with the Study 8 engine's B1 and
    `s8-vg-balanced` books when fed their own decisions.

Nothing here places orders, searches parameters, or changes an existing strategy.
