# Trade ledger and risk

Sources: `results/tables/ledgers.md` (every Π1 and Π1-off trade with fills, reasons, stop components, nets, interest,
peak profit, C levels, release entries, blocked decisions and rule-A events), `trade-stats.md`, `paths.md`,
`results/payloads/evaluate/paths.json.gz` (daily marks, events, contributions, campaign givebacks for every path).
`ledgers.md` lists, per trade, the raw prices and the fill prices (after slippage), shares and friction. The study
evaluated 5,114,598 configurations (5,111,641 in development).

- **Π1:** 14 trades (7 losing), longest losing streak 4, worst single-trade adverse excursion −$17,693 (−17.7%), median
  57 calendar days held, long at 72.5% of closes, peak gross exposure $124,065, largest unrealised giveback of a trade
  $19,481, largest campaign giveback $19,421; 6 release entries (net +$16,525); no losing transition exit. Trade
  interest $31,945; carried-balance interest −$10,628; flat interest +$180.
- **Drawdowns** (`paths.md`, UTC dates): chained minute DD $24,193 (24.2% of $100,000) from a peak on 2021-11-22 to a
  trough on 2022-05-20; daily DD $22,319. Window minute DDs: $23,198 (2020, 2020-02-19 → 2020-05-04), $11,086 (2021,
  2021-04-27 → 2021-05-12), $22,004 (2022, 2022-01-03 → 2022-05-20), $14,170 (2023, 2023-07-19 → 2023-12-04).
  Rule-free picks: $56,063 chained, 2021-12-27 → 2022-10-13 (2022 window $53,749, 2022-01-03 → 2022-10-13).
- **Rule events on Π1:** 232 eligible A checks, 6 A sales (all at a losing open, fill at the next minute), 127
  discarded decisions by B, none by C.
- **Peak exposure and financing** of every path: `paths.md` (peak gross, trade interest), `trade-stats.md`.
- DD is a mark-to-market decline of the research slot's cumulative mark, never a loss of borrowed principal; no
  margin-call or forced-liquidation model.
