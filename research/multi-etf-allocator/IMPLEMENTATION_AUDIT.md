# Implementation audit

## 1. What was added or changed

| Path | Status | Purpose |
|---|---|---|
| `src/multi-etf-allocator/context.ts` | new | protocol constants, references, the 8 combinations, policies, tie orders, helpers |
| `src/multi-etf-allocator/data.ts` | new | the five minute files through the repository loader, hash checks, calendar alignment, price-shock copies |
| `src/multi-etf-allocator/phenotypes.ts` | new | read-only phenotype bridge: validated registry loader → machine parameters, checked against the frozen manifest (body hash verified) and D1's constants |
| `src/multi-etf-allocator/shadow.ts` | new | one independent D1 book per symbol (virtual position) on the verified `EntryMachine`/`ExitManager` |
| `src/multi-etf-allocator/ledger.ts` | new | `PortfolioLedger` (multi-symbol margin account; simple 365-day or Vanguard tiers/360/monthly capitalization) and `FixedLedger` |
| `src/multi-etf-allocator/margin.ts` | new | requirement schedules (≤ 60%), maintenance proxy, break-evens, maximum principal, core-sale sizing |
| `src/multi-etf-allocator/engine.ts` | new | the chronological multi-file event loop shared by both modes: gate, reservations, fills, exits, core orders, dividends, marks, calls, forced liquidation |
| `src/multi-etf-allocator/{scenarios,metrics,export,overlap,report}.ts` | new | catalogue, summaries, CSV exports, overlap analysis, generated tables |
| `src/multi-etf-allocator/{audit,ledgerAudit,parity,stress,illustration,freeze,cli}.ts` | new | data audit, independent ledger recomputation, acceptance gates, stress program, amendment A1, protocol and forward-test freezes, commands |
| `src/multi-etf-allocator/tests/*` | new | fixtures and four test files (§3) |
| `src/app/multiEtfAllocator.ts` | new | `npm run app` entry point |
| `config/allocator/multi-etf-allocator.json` | new | declarative, versioned execution/allocation settings, separate from the phenotypes |
| `package.json` | changed | one script: `multi-etf-allocator` |
| `src/phenotype/strategies.ts`, `config/phenotypes/COMPATIBILITY.md` | changed (one line each) | the phenotype registry's rule that every `src/app/` entry point is listed once: `multiEtfAllocator` added as a research command line (like `multiEtfD1`), the matrix regenerated with `npm run app -- phenotypes matrix`; the injection mechanism is untouched |
| `.gitignore` | changed | per-session files of non-headline runs (regenerable) |
| `research/multi-etf-allocator/` | new | 11 reports, `FORWARD_TEST_FREEZE.json`, `results/` |

**Not modified**: the D1 strategy file (sha256 `a520cfcf…`, checked on every run), every other `src/app/` strategy,
`src/phenotype/` apart from the one registry line above (the injection mechanism is neither used nor refactored), the phenotype JSON files, `config/execution/`, the
shared-margin, multi-ETF D1 and four-family modules (imported, never edited), and every earlier research artifact
(read only). `npm run app -- allIn-trailingBuy-postExitContinuation VGT --phenotype primary` was rerun after the
changes and prints the same $183,044 (19 closed trades + 1 open).

## 2. Design and look-ahead controls

- **One signal layer for both modes.** Each symbol's book is the verified port of D1 (`src/shared-margin-portfolio/
  strategy.ts`, already reproduced against the file and the D1-refinement engine by the earlier program and here
  re-verified for all seven phenotypes). Books read only their own completed minutes and pre-session state; exits are
  decided per session by D1's own evaluator and executed at the bar it names; decisions are stamped at the minute's end.
  The allocator sees only state at the decision time; the virtual trade's exit is revealed only when it executes.
- **Event order** (PROTOCOL.md §3.1) reproduces the earlier engine exactly for a single VGT book, which is why A and B
  match it at every close.
- **Shared capital**: occupancy counts open lots and reservations; a reservation is made at the decision and released
  at the fill; capital released by an exit is visible only to decisions stamped after the exit. The engine asserts the
  slot count and the aggregate cap (open principal ≤ f × equity at each lot's decision) at every reservation and fill.
- **Asynchronous files**: marks use each security's latest completed minute (stale ages logged); fills use each
  security's own next trade; no cross-file synchrony is assumed and nothing is interpolated.
- **Ledger**: assets − liabilities = equity asserted to $0.01 after every event; non-negative cash, inventories and
  principal asserted; borrowing never changes equity; interest accrues as a liability; distributions are entitled on the
  ex-date and paid on the pay date once.
- **Stress paths** shift every price from the open of τ; requirement changes apply from the start of τ; a forced sale's
  cash flows follow the normal exit rules, after which every later decision is recomputed.

## 3. Tests

New test files (`src/multi-etf-allocator/tests/`), all passing:

| File | Tests | What it proves |
|---|---:|---|
| `engine.test.ts` | 14 | identical virtual trades in both modes; refused signals stay virtual; funded lot = virtual trade; reservation blocks a later decision; capital release strictly after the exit (both sides of the boundary); same-minute tie orders; split capacity and the aggregate cap; cancel and hold semantics; asynchronous fills at the symbol's own next trade; eligibility gate; no compounding in the fixed pool; dividend entitlement (VGT lot yes, sector lot no, no double payment); Vanguard actual/360 accrual and monthly capitalization |
| `calls.test.ts` | 10 | the four designed calls of the brief (35% → 60% jump; traded-ETF requirement alone after a 15% fall; a price decline alone at 35%; no call at 50% + gap nor at 60% alone, a call at 60% + gap); liquidation keeps the ledger reconciled, passes the independent file audit and frees the pool for a later trade; next-open, halt, deadline, core-first and slippage models; the 60% ceiling |
| `margin.test.ts` | 11 | requirement schedules; every break-even leaves exactly zero excess by brute force; maximum principal; Reg T; the core-sale size restores the 5% buffer |
| `regression.test.ts` | 5 | input hashes, manifest and freeze; the seven phenotypes trade by trade; A and B equal the earlier engine; identical decision state in both modes for all eight combinations and their recorded figures; the principal runs' headline figures (all 59 with `ALLOCATOR_FULL_REGRESSION=1`) |

Whole suite (`npm test`): before this program **326 tests, 298 pass, 20 fail, 8 cancelled**; after it
**366 tests, 338 pass, 20 fail, 8 cancelled** (the 40 new tests all pass). The 20 failures and 8 cancellations are the same pre-existing set, name for name (the minute-optimizer and
four-family golden-master tests that regex-match `tickWindowSize` literals edited by earlier commits); no new failure.
`npx tsc --noEmit` clean; `npx eslint src/multi-etf-allocator src/app/multiEtfAllocator.ts src/phenotype/strategies.ts` clean (the repository-wide
lint shows only pre-existing warnings in other modules).

## 4. Parity and audits (computed)

- Seven fixed-$100k phenotypes: 0 differences trade by trade; VGT $183,043.82 / $19,330.69 / 20, XBI $206,045.81 /
  $27,885.29 / 25, XBI lowDd $118,055.36 / $12,836.60 / 29, XRT $165,729.49 / $23,383.16 / 26, XRT lowDd $148,435.71 /
  $19,965.68 / 19, KRE $195,047.71 / $26,271.47 / 75, KRE lowDd $174,147.76 / $22,724.74 / 77 (`results/parity/`).
- A $1,784,588.03 and B $2,346,272.33 equal the earlier engine (largest daily equity difference $5 × 10⁻¹⁰).
- Independent ledger recomputation from the exported files: 23 principal runs, 0 failures
  (`results/audit/ledger_audit.json`).
- Mode identity: the virtual-trade signature of every fixed run equals that of its portfolio twin (8 combinations ×
  3 policies + controls).

## 5. Commands actually run (2026-10-23)

| Command | Result | Wall time |
|---|---|---:|
| `npm test` (before any change) | 326 / 298 pass / 20 fail / 8 cancelled | 80.6 s |
| `npm run multi-etf-allocator -- freeze-protocol` | frozen 16:51:11Z, PROTOCOL.md `2d15e3a3…` | < 1 s |
| `… -- audit` | 5 files, 0 calendar mismatches | 17.9 s |
| `… -- parity` | 9 outcomes, 0 differences | 23.8 s |
| `… -- run` | 59 runs | 95.7 s |
| `… -- audit-ledger` | 23 runs, 0 failures | 14.0 s |
| `… -- stress --only static` / `--only paths` / `--only sensitivities` | 8,070 shock rows; 672 replays, 0 calls; 51 sensitivity runs | 30.5 s / 1,072 s / 98 s |
| `… -- illustration` | 17 replays, 6 with a call | 39.0 s |
| `… -- report` | 18 tables | 21 s |
| `… -- all` (end to end, after every code change) | exit 0; 9 parity outcomes with 0 differences, 23 ledger audits with 0 failures, 672 replays with 0 calls, A1 6 calls of 17; all 59 catalogue runs equal to their recorded figures (determinism across separate processes) | 1,364 s |
| `… -- run`, `audit-ledger`, `report`, `forward-freeze`, `manifest` (after adding the buying-power column) | 59 runs, 0 ledger failures, 18 tables, 24 code files hashed, 701 result files | ≈ 2 min |
| `npm run app -- allIn-trailingBuy-postExitContinuation VGT --phenotype primary` | Total net profit $183,044 | ≈ 30 s |
| `npm test` (after) | 366 / 338 pass / 20 fail / 8 cancelled; failing set identical to before | 97.6 s |

## 6. Limitations

- Inspected history only; the 2020 episode dominates every configuration; few independent episodes.
- Minute bars show that trading crossed a level, not the fill a stop-market order would get; spreads are not
  measured; the cost grid is hypothetical.
- The maintenance model is a proxy of Vanguard's proprietary calculation; account-specific requirements,
  concentration tests, liquidation practice and the 30-day Vanguard-ETF rule are unverified.
- XBI/XRT/KRE distributions are not modelled (price-only lots), bounded analytically.
- Interest uses today's Vanguard schedule for the method check, not historical rates; taxes are not modelled.
- The horizon end (2025-10-13) is a protocol constant; a forward test needs new minute files and a protocol amendment
  of the end date only.
