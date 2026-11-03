# Allocation and trade ledger

Machine-readable, path-linked ledgers of every chained verdict account (lots and switch records, with dates, prices,
interest, costs and nets): `results/ledgers/<procedure>_chained_lots.csv` and `_chained_switches.csv`, generated from the
sealed `results/evaluation/RECORD.json`. Per-fold development ledgers are reproducible from the sealed genomes with the
frozen engine. Below: the worst forced sales and the regime summaries; representative lots follow.

| Procedure | Decision date | Deep book | Shallow book | Policy | Estimate net | Sale net |
|---|---:|---:|---:|---:|---:|---:|
| 4C | 2022-05-12 | B5:XBI | S:GDX:115.39.66.5.152.32.142.69 | P4(1) | -$4,946 | -$5,717 |
| 4C | 2022-06-16 | B5:XBI | S:GDX:115.39.66.5.152.32.142.69 | P4(1) | -$522 | $17 |
| 4C | 2022-04-26 | B5:VGT | S:XME:107.45.37.21.152.19.190.168 | P4(1) | -$1,559 | $31 |
| 4C | 2020-05-01 | B5:XBI | S:GDX:141.21.66.10.77.39.55.158 | P1 | $2,988 | $3,003 |
| 4C | 2020-06-16 | B5:KRE | S:GDX:141.21.66.10.77.39.55.158 | P1 | $3,288 | $3,257 |
| 4D-A | 2021-09-22 | B5:KRE | S:EWZ:120.11.65.28.121.1.158.67 | P1 | -$9,603 | -$9,603 |
| 4D-A | 2021-03-05 | B5:VGT | S:IBB:108.8.32.5.132.44.134.39 | P1 | -$5,097 | -$5,103 |
| 4D-A | 2023-01-03 | B5:XRT | S:EWZ:132.47.47.27.228.12.131.148 | P1+G1 | -$3,872 | -$3,836 |
| 4D-A | 2021-07-09 | B5:XRT | S:GDX:106.48.135.23.147.2.102.162 | P1 | -$3,077 | -$3,049 |
| 4D-A | 2021-12-21 | B5:KRE | S:IBB:108.8.32.5.132.44.134.39 | P1 | -$124 | -$131 |
| 4D-B | 2022-04-11 | D:XBI:277.10.40.3.50.5.89.58 | S:IGV:92.50.37.20.157.19.190.178 | P1 | -$7,353 | -$7,356 |
| 4D-B | 2021-03-05 | D:XRT:244.46.80.17.38.36.52.140 | S:EDV:34.50.33.16.35.31.129.93 | P1 | -$2,876 | -$2,834 |
| 4D-B | 2023-04-26 | B5:KRE | S:TLT:51.35.40.4.98.22.103.77 | P1 | -$1,025 | -$1,025 |
| 4D-B | 2022-05-19 | D:XBI:277.10.40.3.50.5.89.58 | S:GDX:148.4.131.4.25.37.69.107 | P1 | -$192 | -$224 |
| 4D-B | 2020-07-15 | B5:KRE | S:IGV:63.14.30.9.109.38.104.72 | P3(1250,any)+G1 | -$134 | -$69 |
| 4D-C | 2022-01-21 | B5:XBI | S:XBI:146.2.74.4.40.4.141.145 | P4(0) | -$4,706 | -$8,289 |
| 4D-C | 2022-05-12 | B5:XBI | S:GDX:114.34.148.4.88.4.160.89 | P4(0) | -$4,609 | -$7,348 |
| 4D-C | 2022-02-18 | B5:XBI | S:XBI:146.2.74.4.40.4.141.145 | P4(0) | -$2,993 | -$6,214 |
| 4D-C | 2023-02-24 | B5:GDX | S:GDX:141.6.103.4.32.54.41.161 | P1 | -$3,899 | -$3,899 |
| 4D-C | 2023-05-26 | B5:KRE | S:GDX:141.6.103.4.32.54.41.161 | P1 | -$3,109 | -$3,093 |

| Procedure | Regime | Shallow lots | Shallow net | Deep net | Switch records | Executed | Forced-sale losses |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4B | COVID crash 2020-02-19→03-23 | 1 | -$4,688 | $55,555 | 0 | 0 | $0 |
| 4B | COVID recovery →2020-08-31 | 0 | $0 | $76,013 | 0 | 0 | $0 |
| 4B | 2021 trend | 8 | -$1,414 | $4,770 | 0 | 0 | $0 |
| 4B | 2022 bear →10-12 | 0 | $0 | $54,994 | 0 | 0 | $0 |
| 4B | 2023 rebound | 1 | -$2,718 | $89,303 | 0 | 0 | $0 |
| 4C | COVID crash 2020-02-19→03-23 | 0 | $0 | $57,850 | 0 | 0 | $0 |
| 4C | COVID recovery →2020-08-31 | 2 | $6,260 | $76,138 | 2 | 2 | $0 |
| 4C | 2021 trend | 7 | $692 | $4,770 | 3 | 0 | $0 |
| 4C | 2022 bear →10-12 | 5 | -$11,338 | $42,045 | 4 | 3 | -$5,717 |
| 4C | 2023 rebound | 1 | -$2,718 | $71,052 | 4 | 0 | $0 |
| 4D-A | COVID crash 2020-02-19→03-23 | 0 | $0 | $57,850 | 0 | 0 | $0 |
| 4D-A | COVID recovery →2020-08-31 | 0 | $0 | $76,013 | 0 | 0 | $0 |
| 4D-A | 2021 trend | 14 | -$15,799 | $24,395 | 5 | 5 | -$17,886 |
| 4D-A | 2022 bear →10-12 | 10 | -$288 | $21,423 | 16 | 2 | $0 |
| 4D-A | 2023 rebound | 4 | -$13,606 | $85,997 | 2 | 2 | -$3,836 |
| 4D-A0P | COVID crash 2020-02-19→03-23 | 0 | $0 | $57,850 | 0 | 0 | $0 |
| 4D-A0P | COVID recovery →2020-08-31 | 0 | $0 | $76,013 | 0 | 0 | $0 |
| 4D-A0P | 2021 trend | 22 | -$4,328 | $1,637 | 0 | 0 | $0 |
| 4D-A0P | 2022 bear →10-12 | 5 | -$58,234 | $53,174 | 0 | 0 | $0 |
| 4D-A0P | 2023 rebound | 0 | $0 | $86,060 | 0 | 0 | $0 |
| 4D-B | COVID crash 2020-02-19→03-23 | 2 | -$28,428 | $7,418 | 7 | 0 | $0 |
| 4D-B | COVID recovery →2020-08-31 | 2 | -$13,946 | $83,243 | 3 | 1 | -$69 |
| 4D-B | 2021 trend | 26 | -$10,430 | $22,937 | 4 | 4 | -$2,834 |
| 4D-B | 2022 bear →10-12 | 5 | -$15,106 | -$13,583 | 2 | 2 | -$7,580 |
| 4D-B | 2023 rebound | 10 | -$1,600 | $86,105 | 5 | 5 | -$1,025 |
| 4D-B0 | COVID crash 2020-02-19→03-23 | 0 | $0 | $57,850 | 0 | 0 | $0 |
| 4D-B0 | COVID recovery →2020-08-31 | 0 | $0 | $76,013 | 0 | 0 | $0 |
| 4D-B0 | 2021 trend | 0 | $0 | $24,567 | 0 | 0 | $0 |
| 4D-B0 | 2022 bear →10-12 | 0 | $0 | $54,994 | 0 | 0 | $0 |
| 4D-B0 | 2023 rebound | 0 | $0 | $72,920 | 0 | 0 | $0 |
| 4D-C | COVID crash 2020-02-19→03-23 | 0 | $0 | $57,850 | 0 | 0 | $0 |
| 4D-C | COVID recovery →2020-08-31 | 0 | $0 | $76,013 | 0 | 0 | $0 |
| 4D-C | 2021 trend | 8 | -$2,762 | -$1,280 | 6 | 6 | -$6,350 |
| 4D-C | 2022 bear →10-12 | 15 | -$39,093 | $42,411 | 9 | 9 | -$24,598 |
| 4D-C | 2023 rebound | 10 | -$7,556 | $72,133 | 7 | 7 | -$8,075 |
| 4D-C0 | COVID crash 2020-02-19→03-23 | 0 | $0 | $57,850 | 0 | 0 | $0 |
| 4D-C0 | COVID recovery →2020-08-31 | 0 | $0 | $76,013 | 0 | 0 | $0 |
| 4D-C0 | 2021 trend | 0 | $0 | $13,260 | 0 | 0 | $0 |
| 4D-C0 | 2022 bear →10-12 | 0 | $0 | -$25,765 | 0 | 0 | $0 |
| 4D-C0 | 2023 rebound | 0 | $0 | $72,920 | 0 | 0 | $0 |

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

