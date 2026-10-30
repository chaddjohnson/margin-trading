# Allocation and trade ledger

Machine-readable, path-linked ledgers of every chained verdict account (lots and switch records, with dates, prices,
interest, costs and nets): `results/ledgers/<procedure>_chained_lots.csv` and `_chained_switches.csv`, generated from the
sealed `results/evaluation/RECORD.json`. Per-fold development ledgers are reproducible from the sealed genomes with the
frozen engine. Below: the worst forced sales and the regime summaries; representative lots follow.

<!-- TABLE worst_forced -->

<!-- TABLE regimes -->

## Findings

- Every funded lot and switch record of the eight chained verdict accounts (2020–2023) is in `results/ledgers/`, with
  entry/exit dates and raw prices, shares, interest, costs, net, the deep decision that triggered a switch, the
  estimate the decision used, and the realized sale and purchase. The B5 continuous run's lots are in the evaluation
  record (`b5.lots`) and listed per trade in `DEEP_TIER_TRADE_PRESERVATION_AND_IDLE_CAPITAL.md`.
- Forced sales were small individually (the worst −$9,603: 4D-A, 2021-09-22, a B5 KRE decision selling an EWZ shallow
  lot under P1) but frequent in 2021–2023 for the preemptive procedures (4D-C: 22 executed switches and −$39,023 of
  forced-sale losses in the 2021, 2022-bear and 2023 regime windows). Decision estimates usually matched the realized
  sale within a few dollars, but 4D-C's P4(0) switches of 2022 realized up to $3,583 worse than estimated.
- The regime table shows where the money went: the shallow tier lost in the 2022 bear market in every account that funded
  shallow lots then, and in the COVID crash only the 4D-B account (whose reoptimized deep books missed B5's GDX trades) lost heavily.

