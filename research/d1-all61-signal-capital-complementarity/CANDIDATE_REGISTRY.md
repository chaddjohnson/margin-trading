# Candidate registry — all 61 audited ETFs under every view

Machine-readable: `results/registry/candidate-registry.json` (sealed, bodyHash `eba74760b628…`) and `.csv`. Built by `npm run d1-signal-complementarity -- stage audit` from the sealed source records only (read-only): the audited universe `research/d1-ranked-preemption/results/audit/universe.json`, the source fold representatives `research/d1-ranked-preemption/standalone/<fold>/<SYM>.json` cross-checked against Study 1's `selections.ARCH.<SYM>.a0` (`results/libraries/{A,B}/SELECTION.json`) and final census, and `config/pools/B4.json`/`B5.json`. No vector was chosen by this study.

## Views and status

- **U** — the registered VGT `primary` vector `216.3.73.8.74.29.90.60` (X 21.6%, Y 0.3%, stop 7.3%, hold 8, L 74, buffer 2.9%, P 9.0%, W 60; candidate `d1-ebc9f639b3`) on all 61: status `registered` (a descriptive counterfactual on 60 of them), cap 2023-12-29.
- **P-A / P-B** — the source's sealed fold-a / fold-b representative where its status is `survivor` (= Study 1 A0 nominee): `period-correct`, caps 2021-12-31 / 2023-12-29. Otherwise `no nominee` (never substituted).
- **P-F** — the final-window survivor, `in-sample context` on 2016-01-04 → 2023-12-29 only (no screen, replay or verdict).
- **B4 / B5** members are never Level C candidates for their own pool; VOOG is never a Level C candidate (portfolio core; F7). Grid keys are in source grid units (‰ for percentages): X.Y.stop.hold.L.buffer.P.W.

Counts: U 61, P-A 49, P-B 54, P-F 53 (of 61). No-nominee rows: P-A AGG EEM EWZ IEF INDA IWN KIE SHY SPLV TIP XLE XOP; P-B AGG HYG IEF IEMG SHY SPLV TIP; P-F AGG DBC IEF SHY SPLV TIP VGK XOP.

## The 61 rows

| ETF | Cluster | Flags | Coverage | Median $ vol (M) | B4/B5 member | P-A (fold-a A0) | P-B (fold-b A0) | P-F (final, context) |
|---|---|---|---:|---:|---|---|---|---|
| AGG | rates-credit |  | 1.00 | 437 | — | NA — rejected | NA — rejected | NA — screened-down |
| DBC | real-assets | F7 thin | 0.82 | 27 | — | `275.20.32.10.185.55.88.43` (d1-6ba15a8c3f) | `295.6.31.15.229.13.41.189` (d1-7bf2487a7c) | NA — screened-down |
| EDV | rates-credit | F7 thin | 0.47 | 16 | — | `117.48.63.3.246.17.151.74` (d1-dba5acd434) | `195.20.45.20.184.50.133.181` (d1-8f3c967bf6) | `207.38.51.25.41.54.80.165` (d1-87774653fc) |
| EEM | non-us |  | 1.00 | 1827 | — | NA — screened-down | `134.3.35.18.86.21.161.14` (d1-ac556b9b02) | `164.1.32.19.69.39.92.157` (d1-f0f201d346) |
| EFA | non-us |  | 1.00 | 1271 | — | `286.2.31.22.156.19.41.146` (d1-44195402ca) | `281.1.31.24.146.19.66.156` (d1-df8f61bc17) | `281.1.31.23.166.14.66.176` (d1-fa28eb046f) |
| EMB | rates-credit |  | 0.99 | 333 | — | `145.12.32.28.232.5.85.54` (d1-8f8494b301) | `124.12.30.22.170.5.170.158` (d1-8882047ed1) | `157.12.37.11.71.3.193.89` (d1-b68fa7e786) |
| EWJ | non-us | split | 1.00 | 341 | — | `273.15.31.27.34.0.36.137` (d1-d590e02c80) | `185.8.32.14.58.24.36.111` (d1-1c307c2fbc) | `230.11.33.25.139.51.50.89` (d1-8a50fa870d) |
| EWW | non-us |  | 0.99 | 114 | — | `184.13.39.11.153.5.137.41` (d1-70952db382) | `211.15.36.13.173.46.187.163` (d1-dd96c4ef9c) | `191.13.40.26.178.26.153.187` (d1-e749c2f782) |
| EWY | non-us |  | 0.99 | 189 | — | `249.2.42.30.169.45.39.125` (d1-3633856ad3) | `264.2.42.30.174.40.39.125` (d1-4f9de1288c) | `296.24.39.22.140.20.39.161` (d1-1a28c7bde0) |
| EWZ | non-us | designer-seen | 1.00 | 729 | — | NA — screened-down | `300.2.45.15.248.49.187.67` (d1-b469398567) | `300.2.45.11.223.54.197.47` (d1-2c5ad02356) |
| FXI | non-us |  | 1.00 | 782 | — | `169.3.33.16.100.40.66.51` (d1-b5912e5c69) | `172.9.37.18.67.55.113.195` (d1-4e409cc7ce) | `262.11.76.9.58.28.163.149` (d1-f50bb16a72) |
| GDX | real-assets | designer-seen | 1.00 | 702 | B5 | `257.8.65.30.227.18.116.68` (d1-04f8d2a5ed) | `294.5.100.30.204.33.47.191` (d1-26a7d7ab89) | `278.11.76.3.231.22.70.127` (d1-4f034dc898) |
| GLD | real-assets | designer-seen | 1.00 | 998 | — | `129.1.77.10.131.32.180.188` (d1-e8989dbe76) | `119.5.33.15.237.17.45.90` (d1-d3dadc1c2d) | `135.6.30.14.123.52.39.78` (d1-dc2b567bea) |
| HYG | rates-credit |  | 1.00 | 1513 | — | `113.5.41.6.232.0.126.40` (d1-cb6be7025d) | NA — screened-down | `164.26.30.12.223.11.155.97` (d1-b0c4ca6851) |
| IAU | real-assets | split | 0.99 | 166 | — | `84.22.31.26.222.8.113.126` (d1-eeac6291d3) | `132.1.37.11.132.5.59.149` (d1-f74ef1063f) | `131.20.57.25.101.44.114.180` (d1-e71c9d2a0c) |
| IBB | sector-industry | split | 0.99 | 275 | — | `167.8.42.11.177.16.70.101` (d1-f2430eae5b) | `167.8.47.10.172.11.60.91` (d1-42c7ed6d64) | `228.6.62.24.56.21.111.48` (d1-8cbcba52e3) |
| IEF | rates-credit |  | 0.99 | 378 | — | NA — rejected | NA — rejected | NA — screened-down |
| IEMG | non-us |  | 1.00 | 545 | — | `298.16.54.15.48.18.33.135` (d1-5c9b2c308e) | NA — screened-down | `209.8.33.22.125.13.32.118` (d1-ad1e3173d0) |
| IGV | sector-industry | split | 0.91 | 138 | — | `95.7.45.14.125.19.181.17` (d1-38fa4a4748) | `90.5.36.15.92.42.154.178` (d1-a104362d28) | `182.32.39.23.193.16.70.97` (d1-272577c668) |
| IJH | factor-size | split | 0.98 | 231 | — | `174.20.32.28.49.58.73.113` (d1-39a42bc57d) | `236.4.31.8.170.4.71.114` (d1-cd1c9c53d7) | `236.5.31.11.165.24.71.104` (d1-b68c1f3d58) |
| IJR | factor-size | split | 1.00 | 281 | — | `180.49.32.25.209.50.151.36` (d1-dca677e98e) | `179.23.36.5.211.29.38.66` (d1-09db7e9770) | `175.49.37.24.194.55.166.36` (d1-ff27f5f0c2) |
| ILF | non-us | F7 thin | 0.93 | 33 | — | `262.5.36.11.185.14.147.143` (d1-eb4dfe72e1) | `267.8.36.14.205.14.152.123` (d1-840e9379f8) | `272.5.36.11.210.24.147.123` (d1-7cbcb1fe4c) |
| INDA | non-us |  | 0.98 | 105 | — | NA — screened-down | `231.5.52.16.203.9.54.135` (d1-3915744953) | `226.5.52.14.188.4.44.145` (d1-bef5e27de3) |
| IWD | factor-size |  | 0.99 | 258 | — | `297.10.42.21.211.0.46.153` (d1-3608bfe932) | `297.3.42.21.216.0.36.153` (d1-ee5e3e0df3) | `277.7.37.22.226.10.41.143` (d1-c97cde64e5) |
| IWF | factor-size | split | 0.97 | 251 | — | `168.8.39.29.68.2.46.31` (d1-1a917d1dbc) | `168.10.39.29.73.2.46.21` (d1-87000aae34) | `106.13.43.13.192.19.46.90` (d1-9c88fc349a) |
| IWM | factor-size |  | 1.00 | 3690 | — | `272.16.45.30.121.45.170.36` (d1-c7a75cdb2d) | `257.22.31.8.67.7.106.129` (d1-cea8e01c1b) | `187.14.38.13.112.52.87.96` (d1-675ef68598) |
| IWN | factor-size |  | 0.94 | 147 | — | NA — screened-down | `270.2.34.21.100.38.145.121` (d1-07c387dcc9) | `260.3.34.11.125.48.140.121` (d1-bb127a6b96) |
| IYT | sector-industry | F7 thin, split | 0.62 | 37 | — | `298.9.42.19.44.12.91.129` (d1-4626c4ed01) | `232.9.48.5.198.54.65.44` (d1-2050188b77) | `212.11.48.5.198.54.60.44` (d1-8678d145eb) |
| KBE | sector-industry |  | 0.99 | 95 | — | `257.19.36.5.73.1.106.110` (d1-df6fac1961) | `279.19.38.5.199.27.90.124` (d1-1f2eabb5e4) | `255.32.39.4.208.26.46.187` (d1-c2ba0513b9) |
| KIE | sector-industry | F7 thin, split | 0.84 | 11 | — | NA — screened-down | `276.5.37.21.171.15.63.169` (d1-dcfc316bd8) | `277.13.39.14.211.5.72.73` (d1-692221f4bf) |
| KRE | sector-industry |  | 1.00 | 387 | B4/B5 | `282.36.38.4.199.2.137.63` (d1-b7c313215f) | `267.36.38.4.204.7.137.53` (d1-4ef1d51d99) | `297.16.30.5.208.8.174.19` (d1-02baeb8699) |
| LQD | rates-credit |  | 1.00 | 1158 | — | `82.6.30.15.58.10.70.129` (d1-f8ab8adc01) | `82.5.34.6.216.0.159.144` (d1-0f94645f67) | `124.13.34.29.50.23.43.104` (d1-703b7d79dd) |
| MTUM | factor-size |  | 0.90 | 80 | — | `151.6.30.12.222.53.102.13` (d1-e3b5221d74) | `201.9.48.27.229.49.33.160` (d1-a60be424b4) | `205.9.37.27.75.14.125.162` (d1-302ce96a91) |
| QUAL | factor-size |  | 0.93 | 80 | — | `169.14.40.11.186.30.34.128` (d1-602a895daf) | `256.5.48.30.165.19.50.139` (d1-46ec213d7f) | `211.10.37.26.153.52.77.171` (d1-db86e1d4f7) |
| RSP | factor-size |  | 0.99 | 129 | — | `209.11.36.14.236.13.128.41` (d1-54a1d2b4b8) | `229.8.62.8.208.6.45.40` (d1-d022352945) | `209.8.36.18.236.13.128.31` (d1-257c6d1c12) |
| SHY | rates-credit |  | 0.97 | 185 | — | NA — rejected | NA — rejected | NA — rejected |
| SLV | real-assets |  | 1.00 | 238 | — | `241.15.38.8.243.15.75.38` (d1-e9f5494111) | `232.36.32.28.124.15.37.149` (d1-e624569792) | `237.36.32.24.129.5.47.159` (d1-720fd990da) |
| SMH | sector-industry | split | 1.00 | 580 | — | `219.14.36.12.177.13.39.191` (d1-0aca84c31f) | `88.8.33.23.199.56.158.156` (d1-a7ee4a7929) | `242.22.39.25.50.35.31.182` (d1-d7f6cb776f) |
| SPLV | factor-size |  | 0.97 | 119 | — | NA — screened-down | NA — screened-down | NA — screened-down |
| TIP | rates-credit |  | 0.96 | 186 | — | NA — rejected | NA — rejected | NA — rejected |
| TLT | rates-credit | designer-seen | 1.00 | 1258 | — | `88.10.58.23.86.0.160.106` (d1-465fed046c) | `142.3.36.15.95.23.156.159` (d1-d802256fd6) | `190.17.35.17.68.19.69.124` (d1-ea2dfab02c) |
| USMV | factor-size |  | 0.99 | 176 | — | `126.2.31.12.21.4.50.121` (d1-ffa37654ee) | `137.16.30.14.169.10.51.111` (d1-36db122f4f) | `132.16.30.11.174.15.36.61` (d1-09bd897afd) |
| VGK | non-us |  | 0.99 | 194 | — | `237.20.30.22.238.24.41.188` (d1-77676aca5b) | `299.4.40.27.50.44.78.111` (d1-9c2ce0e29d) | NA — screened-down |
| VGT | sector-industry | split | 0.85 | 125 | B4/B5 | `240.14.82.8.162.54.57.111` (d1-5f38a1fd7d) | `235.10.77.17.170.46.93.103` (d1-a13304d396) | `229.35.78.8.194.34.95.60` (d1-681c3ac3cc) |
| VIG | factor-size |  | 0.97 | 129 | — | `133.2.31.29.192.55.124.81` (d1-c4df25821f) | `180.6.36.8.242.37.49.44` (d1-2d0e3c7b56) | `185.2.36.7.242.37.49.24` (d1-957c9d7b6c) |
| VOOG | factor-size | F7 thin, split | 0.41 | 16 | — | `249.4.35.14.38.55.50.38` (d1-4e8e91a333) | `116.12.37.7.168.46.42.163` (d1-0be6a24e46) | `280.17.34.12.126.48.32.92` (d1-03ccd1c671) |
| VPU | sector-industry | F7 thin | 0.58 | 22 | — | `295.22.47.21.175.43.98.79` (d1-69d270c189) | `203.9.37.11.195.8.113.178` (d1-152e43c387) | `199.6.58.8.185.19.122.88` (d1-b407c9f3f3) |
| XBI | sector-industry |  | 1.00 | 477 | B4/B5 | `263.5.30.23.172.30.96.140` (d1-a73f1d01d6) | `263.5.30.29.172.25.96.140` (d1-53dc14743e) | `247.23.36.17.31.7.64.192` (d1-7518b58e36) |
| XHB | sector-industry |  | 0.99 | 114 | — | `233.44.43.21.177.41.33.125` (d1-581d77c801) | `233.44.43.22.177.26.33.125` (d1-d2d5ed749f) | `267.47.67.28.235.13.49.27` (d1-a3f6464845) |
| XLB | sector-industry | split | 1.00 | 340 | — | `223.1.35.9.132.17.57.159` (d1-0018930c77) | `248.6.37.27.117.2.41.42` (d1-14188c37ee) | `253.5.37.25.127.22.41.42` (d1-46f3aab0db) |
| XLE | sector-industry | designer-seen, split | 1.00 | 1108 | — | NA — screened-down | `282.28.59.4.69.31.133.199` (d1-577511b2ed) | `292.27.64.4.74.1.133.179` (d1-44dff94a6c) |
| XLF | sector-industry |  | 1.00 | 1331 | — | `253.22.41.10.224.24.54.130` (d1-19906b90ff) | `253.17.41.8.219.34.44.140` (d1-1d85708ceb) | `226.11.32.27.121.7.60.161` (d1-ea6e27c7e3) |
| XLI | sector-industry |  | 1.00 | 803 | — | `257.7.44.28.243.59.100.158` (d1-8abd354636) | `257.6.49.28.238.54.90.138` (d1-31ebb304e2) | `218.9.46.28.188.9.129.19` (d1-0ca9ad6e07) |
| XLK | sector-industry | split | 1.00 | 808 | — | `206.2.43.16.59.10.54.60` (d1-1a0426c473) | `179.4.120.12.71.32.98.151` (d1-42fc380494) | `191.14.77.11.193.40.96.55` (d1-3296cccf51) |
| XLP | sector-industry |  | 1.00 | 646 | — | `126.7.32.23.138.50.185.68` (d1-3e918c05b4) | `103.5.32.11.209.36.165.97` (d1-8c8d201d76) | `134.7.43.3.51.21.65.171` (d1-776c1fa70a) |
| XLU | sector-industry | designer-seen, split | 1.00 | 773 | — | `269.37.45.12.125.56.97.48` (d1-555e37bd01) | `278.6.48.28.145.59.63.160` (d1-bf0110d961) | `162.13.32.20.72.26.139.102` (d1-1d2c419a5b) |
| XLV | sector-industry |  | 1.00 | 837 | — | `115.15.39.22.84.18.158.161` (d1-c4cc2a7486) | `94.9.39.20.131.13.71.118` (d1-409c1e1592) | `119.17.44.14.194.45.75.159` (d1-2f52e83ad4) |
| XLY | sector-industry | split | 1.00 | 533 | — | `162.28.38.27.141.45.88.68` (d1-20d6a1ff16) | `116.29.38.8.136.9.118.100` (d1-e7357820bd) | `221.30.55.16.81.7.114.156` (d1-c7d594cfa5) |
| XME | sector-industry |  | 1.00 | 108 | — | `224.9.35.13.180.2.157.169` (d1-31a9bc4b3c) | `287.3.75.4.25.27.97.193` (d1-78da6c9af1) | `277.5.75.4.25.27.97.193` (d1-cc14abc681) |
| XOP | sector-industry | designer-seen, split | 1.00 | 562 | — | NA — screened-down | `294.49.52.6.42.9.72.132` (d1-dbade45b13) | NA — screened-down |
| XRT | sector-industry |  | 1.00 | 223 | B4/B5 | `266.39.45.5.198.54.89.175` (d1-7d9fc80b29) | `264.49.35.29.233.16.38.87` (d1-97609fab67) | `240.16.30.19.84.58.66.93` (d1-9785d8d566) |

Flags: **F7 thin** = the standalone audit's liquidity/coverage flag (minute coverage < 0.75 or median dollar volume < $50M); conclusions for these symbols are flagged, never dropped. **designer-seen** = a published View-U-against-B4 training row existed before the protocol (PROTOCOL §0). **split** = a registered split in the canonical history (training-era ones are forward-adjusted by the shared loader; XLE/XLU/XLY/XLB/XLK 2025 and VGT/VOOG 2026 are after the research cap and never read). Prices are split-adjusted and price-only (no distributions on lots).

B5's GDX book `274.4.71.18.100.36.191.81` (`d1-51ea8d4bd6`, portfolioAware) differs from both GDX fold A0s; B4/B5 books are run exactly as `config/pools/*.json` through the pools loader.

