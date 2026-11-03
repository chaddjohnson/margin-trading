# Trade ledger and risk (brief §10, PROTOCOL §3.3)

The complete machine-readable ledgers are in the sealed payloads (`results/payloads/evaluate/runs.json.gz`: every
path's trades with trims, events, daily rows, window decompositions and campaigns; `repair/paths.json.gz` for Stage 1's
picks). Readable tables: `results/tables/ledger-Pi1-S1.md`, `ledger-Pi1-S2.md`, `ledger-Pi-NET.md`, `stage1-repair.md`.

## 1. Π1 (the verdict path), 2019-12-31 → 2023-12-29, net-debit

21 trades: 14 fresh first entries, 2 adoption entries (2020-01-02, 2021-01-05), 5 re-entries; exits — 12 resting
stops (3 opening gap stops, all genuine gaps), 2 trend, 3 own OUT, 3 transitions, 1 open at the end. Worst trade
−$13,794 (E03 × XT, 2022-04-05 → 04-27, trend exit), best +$11,921 (E06 × XV, 2020-06-23 → 09-03), longest losing
streak 6 trades (2022-04 → 2023-03). Price gain +$34,883, friction $2,116, trade interest $25,225, carried-balance
interest −$5,032 (account interest $20,193): **Σ W = +$12,573**. Peak position value $115,601 (2021); Z1/Z2 trims 7.

| Window | W | From positions carried in (value at b) | From new positions | Minute DD | DD % of B₀ |
|---|---:|---:|---:|---:|---|
| 2020 | +$14,432 | — (flat start) | +$14,131 | $13,094 | 13% |
| 2021 | +$18,059 | +$357 (+$5,259) | +$15,595 | $8,509 | 9% |
| 2022 | −$30,966 | +$37 (+$3,898) | −$32,226 | $33,488 | 33% |
| 2023 | +$11,049 | +$759 (−$6,325) | +$8,888 | $13,350 | 13% |
| Chained | +$12,573 | | | **$42,882** | 43% (32% of B₀ + the +$35,202 peak mark) |

(The difference between W and the sum of the contributions is the window's carried-balance interest.) The chained
drawdown runs from +$35,202 on 2021-11-22 to −$7,679 on 2023-03-15; the account had not regained its 2021 peak by
2023-12-29 (505 sessions under water counted from the daily-close peak of 2021-12-27; 528 from the minute peak of
2021-11-22).

## 2. 2022: where the loss came from

- 2022-01-03: the 2021 policy's E03 × XV re-entry is sold at the transition, $458.73 (+$3,935 lifetime).
- E03 × XT + Z1 (the fold-C pick) then waits for its efficiency signal and enters three bear-market rallies:
  2022-04-05 at $421.71 → trend exit 2022-04-27 at $366.70 (**−$13,794**); 2022-07-27 at $350.23 → trend exit
  2022-09-30 at $311.86 after one trim (**−$12,106**; its open profit had peaked at +$10,671, giveback $22,777);
  2022-11-11 at $335.35 → sold at the 2023-01-03 transition at $322.36 (**−$5,566**).
- All 2022 losses came from new positions decided in 2022; nothing was inherited. Gross exposure averaged 0.37 of the
  slot (95 of 251 sessions long). The always-long C-ALR lost $37,608 in the same year; Π1 lost $30,966 — it avoided
  part of the decline but bought the failed rallies.

## 3. Stage 1's March 2020 → January 2022 lot (calendar trace; `EXECUTABLE_ANNUAL_SELECTION.md`)

Decision at the close of Friday 2020-03-13 (an +11% session; the CUSUM's fast up-detection), fill at the opening trade
of Monday 2020-03-16 ($193.27, after a −12% gap), five sessions before the 2020-03-23 closing low; 517.15 fixed shares.
Exit decision at the close of 2022-01-21 (own OUT), fill at the 2022-01-24 opening trade ($393.88). Lifetime net
**+$83,131**; at 2021-12-31 the position was worth $236,944 (L/G 0.42) with +$117,085 unrealised; 2022 increment
−$33,954 (part of the unrealised gain given back); peak open profit +$121,426, giveback from the peak to the exit
$38,294. In the executable S1 account this lot does not exist.

## 4. Giveback and winner dependence (rubric g)

Π1's largest campaign contributed +$12,091 (Σ W without it: +$483); its largest up-leg (2020-03-23 → 2020-09-02)
+$18,349 (Σ W without it: −$5,775); campaigns that peaked at ≥ $5,000 gave back 61% of their peak P&L. The strategy's
small four-year profit is one or two campaigns; the rest of the path roughly breaks even after financing.

## 5. Omitted and stressed risks

Simulated: opening gaps through stops (filled at the open, never at the level), delays, stop/entry/opening slippage,
missing bars, 8–14% interest (`NEIGHBORHOOD_AND_CHRONOLOGY.md` §4). Not modelled: margin calls and house maintenance (the
slot has no own equity), forced liquidation timing, bid/ask, liquidity, rates outside 8–14%, monthly compounding of
broker interest (≈0.5% of the interest), closing-print fills of late minute decisions being optimistic.
Distributions are a separate ledger (`results/tables/evaluate-extras.md`): Π1 would have received dividends on shares
held over ex-dates in addition to the price-only figures, as would the passive references. **Known defect (final audit
F4, amendment A2):** in the sealed event ledgers, exit-type rows (exit, transition, conversion, end) record the shares
and gross value held *before* the fill and a mark that double-counts the sold shares (Π1 trade 1: $102,402.71 recorded
vs $377.22 true); the correct post-fill values are S = 0 and mark = M − interest. No rubric quantity or table uses that
field.
