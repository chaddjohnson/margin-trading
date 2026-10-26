# Brief for the second independent read-only review (sent verbatim to a fresh agent; scratch path shortened)

You are an independent reviewer. You did not write this code. Repository: the working directory. A first review
(`docs/pools/reviews/independent-review.md`) examined commit `158f3aca` and found four material defects, plus minor
ones, in the prospective comparison. Since then two things have been added, uncommitted:

- **S10, a funded-trade ledger** for `npm run pools -- fixed B4|B5`:
  - `src/pools/trades.ts`, with changes to `report.ts` and `cli.ts`;
  - a terminal table by default, plus `trades.csv` and `trades.json`;
  - per-ETF summaries, totals, drawdowns, the open position and an exact reconciliation.
- **S11, fixes for the first review's findings** (listed in `docs/pools/WORK_RECOVERY.md` §6), with
  `research/prospective-b4-b5-shadow/PROTOCOL.md` aligned to the code.

Find defects; fix nothing. The real write-once prospective freeze is about to be made. It binds `PROTOCOL.md` and the
code closure, so anything wrong now cannot be fixed afterwards.

**Hard rules.** These are the same as the first review:
- Read-only.
- Do not run `forward freeze`, `forward import` or `research export`.
- Pool runs only with `--out` in your scratch directory.
- No `.env`, network, broker, order or download.
- No backtest of a diverse-d1 finalist after 2023-12-29.

Allowed: `git diff`, tests, tsc, eslint, `verify`, and read-only scripts in your scratch directory. Node:
`export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.

**Check, citing files and lines:**

1. **The trade ledger.**
   - Only funded lots appear.
   - The fills, interest and costs are the engine's own (`src/multi-etf-allocator/ledger.ts` `FixedLedger`;
     `src/portfolio-aware-d1/nbook/engine.ts` end-of-run marking).
   - gross − friction − interest = net.
   - An open position is marked correctly: no exit friction, interest accrued, unrealized.
   - MAE is the engine's `worstMark`.
   - The reconciliation checks are exact where claimed, including against
     `research/joint-16-etf-d1/results/controls/controls.json`.
   - Check the terminal and CSV/JSON labels, the timestamps (New York vs UTC), the split-units note and the
     cumulative net.
   - Run `fixed B4` and `fixed B5` with `--out`, and `fixed B4 --end 2025-12-31 --out …`.
2. **Each first-review finding** (M1–M4 and the minors): is it actually resolved, and did the fix introduce a new
   defect? In particular:
   - the append-only calendar rule: can it be bypassed, and does it catch a changed function body?
   - the incomplete-session guard;
   - the normalized portfolio comparison and the matched-borrowing ladder (units, direction, interpolation);
   - the observation re-run;
   - the snapshot and freeze bindings.
3. **Does `PROTOCOL.md` now say exactly what the code does?** List every remaining mismatch.
4. Anything that would make a figure, a guard, the docs (`docs/pools/README.md`) or the coming freeze wrong.

**Report format:**
- the checks you ran;
- material findings;
- minor findings;
- a one-line verdict: is it safe to make the real write-once prospective freeze now?
