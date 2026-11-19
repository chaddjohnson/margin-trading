# Universe and data audit

60 eligible ETFs (VGT and GDX are controls); untested: GDXJ, OIH, XLF, XLRE.

| ETF | Name | Cluster | Class | Data label | Dev. median minute coverage | Dev. sparse sessions | Dev. median daily $ volume | Splits in development | Splits in validation | Status | Reason |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AGG | iShares Core U.S. Aggregate Bond ETF | rates-credit | bonds | good | 99.7% | 0 | $464,645,130 | — | — | eligible |  |
| DBC | Invesco DB Commodity Index Tracking Fund | broad-commodities | commodity / precious metals | thin | 83.9% | 7 | $25,840,501 | — | — | eligible |  |
| EDV | Vanguard Extended Duration Treasury ETF | rates-credit | bonds | sparse | 40.8% | 1455 | $17,803,372 | — | — | eligible |  |
| EEM | iShares MSCI Emerging Markets ETF | em-broad | equity | good | 100.0% | 0 | $1,723,742,993 | — | — | eligible |  |
| EFA | iShares MSCI EAFE ETF | developed-ex-us | equity | good | 100.0% | 0 | $1,211,378,829 | — | — | eligible |  |
| EMB | iShares J.P. Morgan USD Emerging Markets Bond ETF | rates-credit | bonds | good | 98.7% | 0 | $349,765,660 | — | — | eligible |  |
| EWJ | iShares MSCI Japan ETF | developed-ex-us | equity | good | 99.7% | 0 | $343,312,781 | 2016-11-07 ×0.25 | — | eligible |  |
| EWW | iShares MSCI Mexico ETF | em-latam | equity | good | 99.0% | 0 | $113,621,739 | — | — | eligible |  |
| EWY | iShares MSCI South Korea ETF | em-asia | equity | good | 99.2% | 0 | $186,312,793 | — | — | eligible |  |
| EWZ | iShares MSCI Brazil ETF | em-latam | equity | good | 100.0% | 0 | $706,603,614 | — | — | eligible |  |
| FXI | iShares China Large-Cap ETF | em-asia | equity | good | 100.0% | 0 | $777,324,461 | — | — | eligible |  |
| GDX | VanEck Gold Miners ETF | precious-metals | commodity / precious metals | good | 100.0% | 0 | $686,321,678 | — | — | control |  |
| GDXJ | VanEck Junior Gold Miners ETF | none | equity | good | 100.0% | — | $246,842,881 | — | — | UNTESTED | D1 history: 2016-05-02 → 2026-10-30, 0 missing NYSE session(s) |
| GLD | SPDR Gold Shares | precious-metals | commodity / precious metals | good | 100.0% | 0 | $1,030,205,533 | — | — | eligible |  |
| HYG | iShares iBoxx $ High Yield Corporate Bond ETF | rates-credit | bonds | good | 100.0% | 0 | $1,658,210,631 | — | — | eligible |  |
| IAU | iShares Gold Trust | precious-metals | commodity / precious metals | good | 98.5% | 0 | $173,490,261 | 2021-05-24 ×0.5 | — | eligible |  |
| IBB | iShares Biotechnology ETF | us-healthcare-biotech | equity | good | 99.5% | 0 | $263,407,699 | 2017-12-01 ×3 | — | eligible |  |
| IEF | iShares 7-10 Year Treasury Bond ETF | rates-credit | bonds | good | 99.0% | 0 | $413,775,914 | — | — | eligible |  |
| IEMG | iShares Core MSCI Emerging Markets ETF | em-broad | equity | good | 100.0% | 0 | $524,620,437 | — | — | eligible |  |
| IGV | iShares Expanded Tech-Software Sector ETF | us-tech-growth | equity | sparse | 85.3% | 424 | $159,824,546 | 2024-03-07 ×5 | — | eligible |  |
| IJH | iShares Core S&P Mid-Cap ETF | us-broad-size-factor | equity | good | 97.4% | 0 | $244,697,405 | 2024-02-22 ×5 | — | eligible |  |
| IJR | iShares Core S&P Small-Cap ETF | us-broad-size-factor | equity | good | 100.0% | 0 | $291,071,969 | 2017-01-19 ×2 | — | eligible |  |
| ILF | iShares Latin America 40 ETF | em-latam | equity | thin | 92.8% | 10 | $31,625,497 | — | — | eligible |  |
| INDA | iShares MSCI India ETF | em-asia | equity | good | 98.0% | 0 | $113,248,684 | — | — | eligible |  |
| IWD | iShares Russell 1000 Value ETF | us-broad-size-factor | equity | good | 98.7% | 0 | $257,300,333 | — | — | eligible |  |
| IWF | iShares Russell 1000 Growth ETF | us-tech-growth | equity | good | 96.9% | 0 | $267,389,253 | — | 2026-04-29 ×4 | eligible |  |
| IWM | iShares Russell 2000 ETF | us-broad-size-factor | equity | good | 100.0% | 0 | $3,860,287,219 | — | — | eligible |  |
| IWN | iShares Russell 2000 Value ETF | us-broad-size-factor | equity | good | 95.1% | 0 | $149,946,931 | — | — | eligible |  |
| IYT | iShares U.S. Transportation ETF | us-cyclical | equity | sparse | 57.2% | 801 | $35,900,183 | 2024-03-07 ×4 | — | eligible |  |
| KBE | SPDR S&P Bank ETF | us-financials | equity | good | 99.5% | 0 | $93,145,131 | — | — | eligible |  |
| KIE | SPDR S&P Insurance ETF | us-financials | equity | sparse | 74.4% | 646 | $13,835,739 | 2017-11-30 ×3 | — | eligible |  |
| KRE | SPDR S&P Regional Banking ETF | us-financials | equity | good | 100.0% | 0 | $410,675,347 | — | — | eligible |  |
| LQD | iShares iBoxx $ Investment Grade Corporate Bond ETF | rates-credit | bonds | good | 100.0% | 0 | $1,302,216,390 | — | — | eligible |  |
| MTUM | iShares MSCI USA Momentum Factor ETF | us-tech-growth | equity | good | 88.2% | 225 | $85,201,705 | — | — | eligible |  |
| OIH | VanEck Oil Services ETF | none | equity | good | 97.4% | — | $134,752,913 | 2020-04-15 ×0.05 | — | UNTESTED | D1 history: 2016-05-02 → 2026-10-30, 0 missing NYSE session(s) |
| QUAL | iShares MSCI USA Quality Factor ETF | us-tech-growth | equity | sparse | 91.8% | 478 | $92,191,709 | — | — | eligible |  |
| RSP | Invesco S&P 500 Equal Weight ETF | us-broad-size-factor | equity | good | 97.7% | 0 | $178,812,357 | — | — | eligible |  |
| SHY | iShares 1-3 Year Treasury Bond ETF | rates-credit | bonds | good | 96.9% | 0 | $188,974,400 | — | — | eligible |  |
| SLV | iShares Silver Trust | precious-metals | commodity / precious metals | good | 100.0% | 0 | $267,806,664 | — | — | eligible |  |
| SMH | VanEck Semiconductor ETF | us-tech-growth | equity | good | 100.0% | 0 | $652,881,145 | 2023-05-05 ×2 | — | eligible |  |
| SPLV | Invesco S&P 500 Low Volatility ETF | us-broad-size-factor | equity | good | 96.9% | 0 | $115,513,248 | — | — | eligible |  |
| TIP | iShares TIPS Bond ETF | rates-credit | bonds | good | 96.7% | 0 | $180,818,031 | — | — | eligible |  |
| TLT | iShares 20+ Year Treasury Bond ETF | rates-credit | bonds | good | 100.0% | 0 | $1,372,199,038 | — | — | eligible |  |
| USMV | iShares MSCI USA Min Vol Factor ETF | us-broad-size-factor | equity | good | 99.5% | 0 | $169,357,287 | — | — | eligible |  |
| VGK | Vanguard FTSE Europe ETF | developed-ex-us | equity | good | 99.2% | 0 | $181,592,512 | — | — | eligible |  |
| VGT | Vanguard Information Technology ETF | us-tech-growth | equity | good | 83.6% | 0 | $139,172,275 | — | 2026-04-21 ×8 | control |  |
| VIG | Vanguard Dividend Appreciation ETF | us-broad-size-factor | equity | good | 96.9% | 0 | $130,670,561 | — | — | eligible |  |
| VOOG | Vanguard S&P 500 Growth ETF | us-tech-growth | equity | sparse | 36.7% | 1779 | $18,220,835 | — | 2026-04-21 ×6 | eligible |  |
| VPU | Vanguard Utilities ETF | us-defensive | equity | sparse | 58.0% | 714 | $22,048,169 | — | — | eligible |  |
| XBI | SPDR S&P Biotech ETF | us-healthcare-biotech | equity | good | 100.0% | 0 | $510,589,817 | — | — | eligible |  |
| XHB | SPDR S&P Homebuilders ETF | us-cyclical | equity | good | 99.7% | 0 | $124,152,158 | — | — | eligible |  |
| XLB | Materials Select Sector SPDR Fund | materials-metals-mining | equity | good | 100.0% | 0 | $343,079,050 | — | 2025-12-05 ×2 | eligible |  |
| XLE | Energy Select Sector SPDR Fund | energy | equity | good | 100.0% | 0 | $1,117,151,831 | — | 2025-12-05 ×2 | eligible |  |
| XLF | Financial Select Sector SPDR Fund | us-financials | equity | good | 100.0% | 0 | $1,355,860,379 | — | — | UNTESTED | D3b: 2016-09-19 -18.08% — special dividend in kind of 0.139146 XLRE shares ($4.44356 per XLF share as of 2016-09-16), ex-date 2016-09-19 (OCC/MIAX information memo 39575, https://miaxglobal.com/sites/default/files/alert-files/XLF_Distribution_39575.pdf; State Street announcement 2016-06-08) — the GICS real-estate carve-out. Close 2016-09-16 $23.62 → open 2016-09-19 $19.35 (−18.1%). The repository registers no adjustment for it (config/market-events covers splits for all symbols and distributions for VGT/VOOG only). |
| XLI | Industrial Select Sector SPDR Fund | us-cyclical | equity | good | 100.0% | 0 | $825,868,703 | — | — | eligible |  |
| XLK | Technology Select Sector SPDR Fund | us-tech-growth | equity | good | 100.0% | 0 | $835,662,849 | — | 2025-12-05 ×2 | eligible |  |
| XLP | Consumer Staples Select Sector SPDR Fund | us-defensive | equity | good | 100.0% | 0 | $655,898,632 | — | — | eligible |  |
| XLRE | Real Estate Select Sector SPDR Fund | none | equity | good | 99.2% | — | $148,409,167 | — | — | UNTESTED | D1 history: 2016-01-04 → 2026-10-30, 2 missing NYSE session(s) (2016-01-25, 2016-02-16) |
| XLU | Utilities Select Sector SPDR Fund | us-defensive | equity | good | 100.0% | 0 | $769,821,850 | — | 2025-12-05 ×2 | eligible |  |
| XLV | Health Care Select Sector SPDR Fund | us-healthcare-biotech | equity | good | 100.0% | 0 | $855,992,805 | — | — | eligible |  |
| XLY | Consumer Discretionary Select Sector SPDR Fund | us-cyclical | equity | good | 100.0% | 0 | $538,358,184 | — | 2025-12-05 ×2 | eligible |  |
| XME | SPDR S&P Metals & Mining ETF | materials-metals-mining | equity | good | 99.7% | 0 | $110,497,673 | — | — | eligible |  |
| XOP | SPDR S&P Oil & Gas Exploration & Production ETF | energy | equity | good | 100.0% | 0 | $537,594,335 | 2020-03-30 ×0.25 | — | eligible |  |
| XRT | SPDR S&P Retail ETF | us-cyclical | equity | good | 100.0% | 0 | $235,788,322 | — | — | eligible |  |
