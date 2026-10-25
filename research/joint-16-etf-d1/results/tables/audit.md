# Audit tables

Last common session 2026-10-13; calendars identical: true; failures 0.

| ETF | sha256 | Sessions | First → last | Splits (raw → adjusted overnight) |
|---|---:|---:|---:|---:|
| EWZ | `b1cf63a676c2696c` | 2710 | 2016-01-04 → 2026-10-13 | — |
| GDX | `86ce101fede1a412` | 2710 | 2016-01-04 → 2026-10-13 | — |
| GLD | `d3dd1beb35bc9bee` | 2710 | 2016-01-04 → 2026-10-13 | — |
| IWM | `44a919f997c1eeaf` | 2710 | 2016-01-04 → 2026-10-13 | — |
| IWN | `34cc798c020a152a` | 2710 | 2016-01-04 → 2026-10-13 | — |
| KRE | `40e7bd6c72c1dffb` | 2710 | 2016-01-04 → 2026-10-13 | — |
| TLT | `f4df3690714ee876` | 2710 | 2016-01-04 → 2026-10-13 | — |
| VGT | `d8e6991de7d49010` | 2710 | 2016-01-04 → 2026-10-13 | 8:1 2026-04-21 (-87.4% → 0.42%, once: true) |
| VOOG | `a7aa42aeebd9e83f` | 2710 | 2016-01-04 → 2026-10-13 | 6:1 2026-04-21 (-83.2% → 0.66%, once: true) |
| XBI | `9afecc0606330d68` | 2710 | 2016-01-04 → 2026-10-13 | — |
| XLE | `57d013b051ccb205` | 2710 | 2016-01-04 → 2026-10-13 | 2:1 2025-12-05 (-50.1% → -0.17%, once: true) |
| XLF | `845e7b603edf0f4e` | 2710 | 2016-01-04 → 2026-10-13 | — |
| XLU | `ab2787a419828931` | 2710 | 2016-01-04 → 2026-10-13 | 2:1 2025-12-05 (-50.0% → 0.02%, once: true) |
| XLY | `7a80d7f22b5b9f79` | 2710 | 2016-01-04 → 2026-10-13 | 2:1 2025-12-05 (-50.0% → 0.09%, once: true) |
| XOP | `cb8f4d8852b2f714` | 2710 | 2016-01-04 → 2026-10-13 | 0.25:1 2020-03-30 (287.3% → -3.18%, once: true) |
| XRT | `ca0fdc6a4c77a97d` | 2710 | 2016-01-04 → 2026-10-13 | — |

## Bar coverage (training; counts and volumes only)

| ETF | Median bars | Minutes with a bar | Sparse sessions | Closing prints | Median gap / p99 / max (min) | Median daily $ volume | Median bar volume |
|---|---:|---:|---:|---:|---:|---:|---:|
| EWZ | 390 | 100.0% | 0 / 2012 | 2011 | 1 / 1 / 15 | $729M | 33231 |
| GDX | 390 | 100.0% | 0 / 2012 | 2011 | 1 / 1 / 15 | $701M | 46127 |
| GLD | 390 | 99.9% | 0 / 2012 | 2011 | 1 / 1 / 15 | $998M | 10117 |
| IWM | 390 | 100.0% | 0 / 2012 | 2011 | 1 / 1 / 15 | $3689M | 38679 |
| IWN | 372 | 92.8% | 0 / 2012 | 2010 | 1 / 3 / 15 | $147M | 1522 |
| KRE | 390 | 99.9% | 0 / 2012 | 2010 | 1 / 1 / 21 | $387M | 11228 |
| TLT | 390 | 99.8% | 0 / 2012 | 2012 | 1 / 1 / 47 | $1257M | 15531 |
| VGT | 327 | 83.8% | 0 / 2012 | 2009 | 1 / 4 / 19 | $125M | 803 |
| VOOG | 134 | 36.7% | 1629 / 2012 | 1610 | 2 / 16 / 91 | $16M | 311 |
| XBI | 390 | 99.7% | 0 / 2012 | 2011 | 1 / 1 / 15 | $476M | 9108 |
| XLE | 390 | 100.0% | 0 / 2012 | 2011 | 1 / 1 / 15 | $1107M | 32058 |
| XLF | 390 | 100.0% | 0 / 2012 | 2011 | 1 / 1 / 15 | $1331M | 73786 |
| XLU | 390 | 100.0% | 0 / 2012 | 2010 | 1 / 1 / 15 | $773M | 21152 |
| XLY | 390 | 99.9% | 0 / 2012 | 2010 | 1 / 1 / 15 | $533M | 7162 |
| XOP | 390 | 100.0% | 0 / 2012 | 2011 | 1 / 1 / 15 | $562M | 33388 |
| XRT | 390 | 99.6% | 0 / 2012 | 2010 | 1 / 1 / 16 | $223M | 5750 |

## Bar coverage by partition (median bars; sparse sessions)

| ETF | Training | Holdout | Final |
|---|---:|---:|---:|
| EWZ | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| GDX | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| GLD | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| IWM | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| IWN | 372; 0 sparse of 2012 | 356; 0 sparse of 450 | 326; 0 sparse of 248 |
| KRE | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| TLT | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| VGT | 327; 0 sparse of 2012 | 315; 0 sparse of 450 | 390; 0 sparse of 248 |
| VOOG | 134; 1629 sparse of 2012 | 208; 165 sparse of 450 | 373; 4 sparse of 248 |
| XBI | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| XLE | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| XLF | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| XLU | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| XLY | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| XOP | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
| XRT | 390; 0 sparse of 2012 | 390; 0 sparse of 450 | 390; 0 sparse of 248 |
