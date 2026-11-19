# Priority 7A — bounded Growth suitability screening across other ETFs

Research only, not deployed. Every eligible ETF of the repository's inventory gets the same small standalone Growth
1.4.0 search on one fixed $100,000 principal (maximum minute drawdown $35,000), at C19, C21, C23 and C24, plus an
informed transfer lane of nine exact VGT/GDX Growth vectors at C24; the whole ETF-and-phenotype selection is repeated at
every earlier cutoff and tested on the following slice; a small frozen shortlist (≤ 3 new ETFs) is validated once on
2025–2026 (previously examined history).

| File | What |
|---|---|
| [`brief/BRIEF.md`](brief/BRIEF.md) | the user's Priority 7A brief (authoritative) |
| [`PROTOCOL.md`](PROTOCOL.md), [`AMENDMENTS.md`](AMENDMENTS.md), [`STANDARD_ADOPTION.json`](STANDARD_ADOPTION.json) | the frozen protocol, its append-only amendments, the standard 2.0.0 adoption |
| [`UNIVERSE_MANIFEST.json`](UNIVERSE_MANIFEST.json), `results/universe/R1-…json` | the universe and data audit (60 eligible; GDXJ, OIH, XLRE, XLF untested) |
| [`TRANSFER_MANIFEST.json`](TRANSFER_MANIFEST.json) | the nine exact transfer vectors, read from their sealed sources |
| `results/doors/DOORS.json`, `results/parity/parity.json` | door pins; the engineering gates |
| `results/search/<cut>/<ETF>.json`, `results/qualify/<cut>/<ETF>.json` | each ETF's sealed search and qualification per cutoff |
| `results/folds/` | cutoff selections, fold evaluations, sequential policies |
| `results/transfer/`, `results/final/` | the transfer lane; the C24 selection, shortlist and diagnostics |
| `FROZEN_SELECTION.json`, `results/validation/` | the frozen selection (before FULL) and the one-time validation |
| [`REPORT.md`](REPORT.md), `results/tables/` | the report and its tables (text and tables only) |
| [`RUN_COMMANDS.md`](RUN_COMMANDS.md), [`RESEARCH_RECOVERY.md`](RESEARCH_RECOVERY.md) | reproduction; the recovery checkpoint |

Code: `src/growth-etf-screening/` (`npm run getf -- <command>`); tables: `tools/growth-etf-screening/tables.ts`.
