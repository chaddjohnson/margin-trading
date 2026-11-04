# Growth trading (`rise-from-recent-low-trading` v1.0.0)

A trading backtest of one symbol. The unchanged Rise-from-Recent-Low scanner (`src/entry-signals/`) is its only entry.
Execution and exits are the unchanged Study 8 D1 book: `ShadowBook` (`src/multi-etf-allocator/shadow.ts`) with its
`ExitManager` (`src/shared-margin-portfolio/strategy.ts`).

- `riseTrading.ts`:
  - the parameters, the defaults (the VGT D1 baseline exits) and the fixed execution settings;
  - `simulateTrading`: decisions → the book, per minute;
  - `runRiseTrading`: sessions → bars → signals → simulation;
  - the ledger, the reconciliation with `FixedLedger`, and the metrics.
- Strategy Lab runs it through `apps/strategy-lab/runner/trading-run.ts`.
- Rules, switches and accounting: `docs/strategy-lab/GROWTH_TRADING.md`. The D1 mapping and the parity evidence:
  `docs/strategy-lab/GROWTH_TRADING_AUDIT.md`.
- Tests:
  - `tests/riseTrading.test.ts` (synthetic minute data);
  - `tests/parity.test.ts` (real data; skipped without `data/`): exact trade parity with the Study 8 engine's B1 and
    `s8-vg-balanced` books when fed their own decisions.

Nothing here places orders, searches parameters, or changes an existing strategy.
