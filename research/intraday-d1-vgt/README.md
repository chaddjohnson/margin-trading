# Intraday D1 on VGT 1-minute bars (Study 8–style robust optimization)

**Status: complete. Recommendation: no robust edge** (see `REPORT.md`).

A new, independent strategy, `intradayD1` (`src/intraday-d1/`), keeps canonical D1's rules and state machine with the
session clock replaced by B-minute periods. It was optimized on 2016–2024 VGT minute data with Study 8's verified
V-track methodology and validated once on 2025-01-02 → 2026-10-30 (partial 2026). Daily D1 is unchanged.

| File | Content |
|---|---|
| `REPORT.md` | Executive summary, results, robustness, Study 8 assessment, limitations, reproduction |
| `PROTOCOL.md`, `AMENDMENTS.md` | Frozen protocol (before the search) and amendment A1 |
| `FROZEN_SELECTION.json` | Sealed selection: no role holder (committed before validation) |
| `audit/` | D1 audit, Study 8 audit, prior intraday and infrastructure audit, methodology transfer map, rule-parity design |
| `brief/BRIEF.md` | The user's brief, verbatim |
| `results/parity/` | P1–P3 parity records (attempt 1 kept) |
| `results/search/`, `results/qualify/` | Sealed search (with the rung-1 archive) and qualification |
| `results/validation/` | Sealed validation record; per-trade ledgers (`ledger-*.csv`) and per-year tables (`years-*.csv`) for the frozen shortlist and B1 |
| `results/report/` | Generated tables (`REPORT_TABLES.md`), development diagnostics, regime labels |
| `results/chain.jsonl`, `results/doors.jsonl` | Local hash chain of sealed phases; every data-door opening |
| `results/runlogs/` | Stage logs |
| `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md` | Exact commands, hashes and the recovery checkpoint |
