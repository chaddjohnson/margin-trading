# Explicit research date boundaries, the VGT/GDX update through 2026-11-25, and N/original on all available data

The report for the user's brief of 2026-11-27 (`BRIEF.md`). The findings before any change are in `AUDIT.md`, the
commands in `RUN_COMMANDS.md`, the machine-readable evidence in `evidence/` and `n-original/`, and the task state in
`WORK_RECOVERY.md`. It is written as text and tables only (standard §7.7).

## 1. Outcome in brief

- **The data ended 2026-10-30, not 2026-10-23.** 2026-10-23 is the entry date of N/original's last D1·GDX lot.
  2026-10-30 is the validation end that every one of the 31 adopting studies had fixed. It is now explicit and
  authoritative: `config/research/date-ranges.json`, range **R1**, development 2016-01-04 → 2024-12-31 and validation
  2025-01-01 (first session 2025-01-02) → 2026-10-30. No established window moved.
- **VGT and GDX are updated through 2026-11-25**, the latest completed session (Thanksgiving was 2026-11-26).
  - 10,213 and 13,339 rows were appended: 18 sessions each (2026-11-02 → 2026-11-25).
  - The old files are proven to be exact byte prefixes of the new ones.
  - The re-downloaded 2026-10-30 session matched byte for byte: no revision.
  - No session is missing, duplicated or out of order.
- **Historical reproducibility holds after the append.** Priority 3's FULL door, the D24 door, the sealed N/original
  and New L0 replays, 51 sealed subjects on the GPU and the Growth golden masters are all identical to before. Two
  details:
  - The GPU's dataset of FULL is byte-identical to the one the accepted GPU study exported (`6e977ccd…`).
  - The Growth golden masters, which would have silently skipped after an append, now run on exactly their captured
    bytes.
- **N/original through 2026-11-25** (one continuous run, nothing reset):
  - the research window reproduces the sealed $482,700.73 / DD $20,385.99 / 44 lots exactly;
  - the newly available period (a **manual post-validation evaluation, not an extension of the formal validation
    dataset**) lost **−$5,697.90** over 3 lots;
  - the whole run ends at **$477,002.83** with a new maximum minute drawdown of **$25,794.56** (Nov 9 → Nov 20), below
    the $35,000 research ceiling.
- **One consequence needs the user's decision.** The repair touches files pinned by the GPU acceptance (the evaluation
  loaders and the research preflight), so `config/gpu-backend/acceptance.json` is **STALE on this branch**.
  - Official GPU optimization is blocked here until a §2 re-acceptance on Apollo. That campaign includes a fixed-seed
    mini-optimization, which the brief excluded, so it was not run.
  - A non-official GPU-vs-CPU check of fixed configurations passed (204 of 204 bit-identical).

## 2. Existing behaviour (before any change)

Details and file references: `AUDIT.md`.

| Question (brief §3) | Finding |
|---|---|
| Last complete session, VGT and GDX | **2026-10-30** for both (last rows 2026-10-30T23:59Z; files equal their 2026-11-02 `verify` reports) |
| Date ranges of the most recent workflows | Development 2016-01-04 → 2024-12-31; validation 2025-01-01/02 → 2026-10-30 (all 31 adoption manifests; N/original's study `vg-l0-full-joint`, folds C19/C21/C23/C24; the latest studies `vg-l0-n-successor`, `gdx-d1-growth`, `tsla-d1-growth`) |
| Was validation explicitly bounded? | Per study, yes (hard-coded 2026-10-30, checked against the files); centrally, no: the standard defined the validation end as "the common complete endpoint" of the files, so a study adopted after an append would have taken the newer date |
| Endpoints derived from the data | `partitions.json` `final`/`all` (end null: the last row; intended for manual runs); multi-symbol runners (Study 8/9b: latest common complete session; Study 7: earliest last bar date, no completeness check; pools, the allocator `--dataset all`, the N-book universe: file ends with aligned calendars); calendar-year report buckets. No formal validation used the file end |
| Reproducibility after an append | Inputs: exactly recoverable (each old file is a byte prefix of the new one). Checks: **Priority 3's FULL door** (every VG/L0 study, the GPU path, Strategy Lab Portfolios and its parity test) and several completed studies pinned the **whole-file** sha256 and would fail closed; the Growth golden masters would **skip silently**; byte-prefix doors (D19–D24, gdx-d1-growth, intraday-d1, Study 8/9) were already safe |
| Strategy Lab | No stale caches (content-addressed previews and portfolio replays, size/mtime chart reload, runs never reused). Single-symbol runs already support custom dates and an "All" preset; Portfolios are a fixed 2016-01-04 → 2026-10-30 benchmark through FULL; N/original is not in its catalog |
| CPU and GPU differences | None for the data boundary: the GPU receives the arrays of the same CPU door loader (`openFullDoor`/`openPrefixDoor` → `exportDataset`). The acceptance record hashes no data file, but its evaluation digest covers `src/lib/*` and the door loader, and its policy group the preflight |

## 3. Implementation

### 3.1 What changed and why

| Change | Files | Why |
|---|---|---|
| The authoritative research date ranges | `config/research/date-ranges.json` (R1), `src/lib/researchRanges.ts` | One explicit, versioned definition instead of a definition by the files' end and scattered constants; validated strictly (ordered windows, calendar coverage, the user's authorization required, unique ids) |
| Formal stages bounded at data access | `src/lib/evaluation.ts` (`access: 'development' \| 'validation'`) | A window ending after the stage's authorized end is refused **before a byte is read**; unset, the end is the authorized end; only the bytes through it are read (bad rows placed after the boundary are never parsed, test-proven); the data must cover the end completely |
| Pinned historical inputs | `src/lib/evaluation.ts` (`pin`), `src/lib/csv.ts` (`maxBytes`) | A pinned input `{bytes, sha256}` is verified before parsing and read no further, and it reports the pinned hash, so ids, cache keys and GPU dataset identities do not change when rows are appended |
| Shared byte-prefix and coverage helpers | `src/lib/canonicalPrefix.ts` | One implementation of what studies re-implemented: prefix pins, the prefix through a New York date (evening bars on the next UTC date, DST), latest complete session (early closes, partial sessions), common complete endpoint, the vintage registry and `historicalPin` |
| Priority 3's FULL door | `src/vg-d1-growth-joint/{context,data}.ts` | The single shared repair: FULL and the door builder verify the canonical files as their pinned prefixes (2016-01-04 → 2026-10-30) and read only those bytes; the door is identical (fingerprint), and every consumer (all VG/L0 studies, the GPU path, Strategy Lab Portfolios) works after any future append; the entrypoint registry entry of this legacy directory was regenerated |
| Append with proof and provenance | `src/data-partition/{canonical,cli}.ts`, `config/market-data/vintages.json` | `append` proves the new file begins with exactly the old file and records both versions; `datasets prefix` and `datasets vintages` verify pins and every vintage (VGT and GDX: 2026-10-13, 2026-10-29, 2026-10-30, 2026-11-25, all verified) |
| Preflight | `src/research-standard/preflight.ts` | Every manifest's windows must lie inside the research date range (all 31 existing ones do); from 4.0.0 a manifest pins its range (`dateRanges`) and its data's byte-prefix provenance (`dataPins`, verified against the local files); a new optimization cannot evade by pinning an older standard |
| Standard 4.0.0 | `docs/research/OPTIMIZATION_STANDARD.md`, registry, templates | §3.6 |
| Manual pooled runs | `src/manual-eval/{door,report}.ts`, `tools/manual-eval/pooled.ts`, `npm run manual-eval` | Research / all / custom windows of any sealed pooled VGT/GDX configuration, with period attribution by marked net, the established risk metrics, a ledger and the causal-trajectory check; the only route for N/original past 2026-10-30 |
| Golden masters kept meaningful | `src/growth-trading/tests/offParity*.test.ts`, `src/growth-trading/tools/capture-baseline*.ts` | They run on the captured bytes (whole file, or the recorded vintage verified as a prefix) instead of skipping |
| A test assumption | `src/study7-runners/tests/runners.test.ts` | It compared the default end of VGT+GDX with the whole Study 7 universe's last date, which differ once only two files are refreshed; it now compares like with like (the runner itself was right) |
| Documentation | `README.md`, `CLAUDE.md`, `docs/research/ROADMAP.md`, `docs/strategy-lab/POOLED_CANDIDATES.md` | The refresh procedure, the ranges, manual evaluation, the limitations |

No strategy rule, phenotype, allocator behaviour, cost, interest, fill or drawdown definition changed. No sealed record
was touched. `data/partitions.json` is unchanged (sha256 `43893f3d…`).

### 3.2 Where the ranges live and how to change them

- **Location:** `config/research/date-ranges.json`, read by `src/lib/researchRanges.ts` and checked by the research
  preflight. R1 is pinned by a test. Studies keep their own narrower windows (folds, cutoffs) inside it. A completed
  study's windows remain its own constants and are not routed through the file.
- **Deliberate change:**
  1. Add a new entry `R2` (never edit `R1`) with `development`, `validation`, `effective` and `authorization` (the
     user's explicit agreement).
  2. Make it `current`.
  3. Record the matching data pins. A new study pins R2; existing studies keep R1.
- **What an append does to the ranges:** nothing. Appending data never changes the file, and the loaders refuse formal
  reads past the authorized end.

### 3.3 Manual full-dataset and custom-date runs

| Need | Command | Effective window |
|---|---|---|
| A sealed pooled configuration on the research window | `npm run manual-eval -- --subject "N/original" --window research` | 2016-01-04 → 2026-10-30 (Priority 3's FULL door) |
| …on all available data | `… --window all` | 2016-01-04 → the latest session **every** required file holds completely (2026-11-25); a partly appended session never counts; a symbol ending earlier limits the run (it is named) |
| …on a custom window | `… --window custom --from D1 --to D2` | `D1`/`D2`; D2 after the common complete endpoint is refused; the run starts flat at D1 |
| A single-symbol strategy, all data | `src/app.ts <strategy> VGT all` | 2016-01-04 → 2026-11-25 (printed `Evaluation:` line) |
| …custom dates | `src/app.ts <strategy> VGT all 2025-01-02 2026-11-03` | exactly those dates, with the strategy's warm-up |
| Strategy Lab Run Test | dates or the All preset | per symbol, recorded in the run's provenance |

Every manual output states its effective first and last session. A window past 2026-10-30 is labelled "MANUAL
POST-VALIDATION EVALUATION". Manual access grants no formal stage anything: formal reads go through the formal access
modes or a study's own pinned doors.

### 3.4 How historical integrity is preserved

- **Prefix proof at every append:** the first N bytes of the new file must hash to the old file's sha256, and every
  overlapping downloaded row must equal the stored one; otherwise nothing is written.
- **Vintages:** every earlier file is recorded in git (`config/market-data/vintages.json`), each a verified prefix of
  today's file. Any whole-file pin of an earlier file resolves to its prefix (`historicalPin`).
- **No weakened check:**
  - FULL still verifies every historical byte, now as a prefix, and a changed byte still fails closed (tested).
  - The completed studies' own whole-file checks are untouched. They fail closed and are reproduced at their own
    commit from the verified prefix (standard §1.14).
- **Cache identities:**
  - Strategy Lab previews and portfolios key the data content and the window. The manual doors' names carry the
    window and both data versions.
  - FULL keeps its historical identity (same `dataSha256`, `ds.id`, GPU dataset), which is correct because it reads
    the same bytes.

### 3.5 CPU and GPU respect the same boundaries

- The GPU evaluator reads the arrays the CPU door loader builds.
- After the append, FULL exported as the GPU dataset is byte-identical to the accepted study's export
  (`research/gpu-phase7/cache/FULL.gb2ds`, sha256 `6e977ccd…`). This is an npm test.
- The accepted binary (`gb7`, `cb2ff30b…`, RTX 5090 `GPU-ae5f222c…`) evaluated 51 sealed subjects (compact and detailed
  records with the risk envelope, 102 tasks per door) on the post-append FULL door and on the door through 2026-11-25:
  - **204 of 204 results are bit-identical to the CPU reference**;
  - on FULL, 51 of 51 compact records equal the sealed figures;
  - on the extended door the GPU gives N/original $477,002.83 / $25,794.56, the CPU figures.
- Evidence: `evidence/gpu-nonofficial-check.json`, purpose `parity-test`. It is not an acceptance and not official
  evidence.

### 3.6 Optimization standard 4.0.0 (major; registered sha256 `c4743fd5…`)

- **§0.3:** defines the research date range, the fixed validation end, doors as verified byte prefixes, manual
  post-validation evaluation and vintages. The common complete endpoint is now the validation end verified in the
  files, no longer the files' latest complete date.
- **§1.3, rewritten:** windows are explicit and fixed before the research, inside the pinned range, with the data's
  byte-prefix provenance in the protocol and the manifest.
- **New mandatory items:**
  - §1.12: appended data never move a window. This is enforced at data access, and a later range exists only as a new
    user-authorized entry.
  - §1.13: manual evaluation on newer data is never optimization, selection, qualification or validation evidence, and
    never adjusts rules, ranges, phenotypes, the allocator or criteria without separate authorization.
  - §1.14: inputs stay reproducible after appends, by prefix verification and never weaker checks.
- **§7.2 and §7.6:** list the new manifest fields and preflight checks. §8 records the change.
- Studies pinned to 3.0.0 or earlier keep their pins. Every existing manifest satisfies the range. No gate, budget,
  instrument or the $35,000 ceiling changed.

## 4. Market data

| | VGT | GDX |
|---|---|---|
| Before (bytes / rows / sha256) | 53,395,054 / 935,608 / `2ee06310…` | 80,036,100 / 1,490,494 / `77dba9b2…` |
| Before: coverage | 2016-01-04 → 2026-10-30 (last row 23:59Z) | 2016-01-04 → 2026-10-30 |
| Download (scripts/download.sh, sha256 `1af992d3…`; SIP, raw, 1Min) | 2026-10-30 → end 2026-11-26: 10,862 rows, `05b7df2b…` | 14,080 rows, `abebc155…` |
| Overlap re-downloaded (2026-10-30) | 649 rows, byte-identical | 741 rows, byte-identical |
| Appended | **10,213 rows, 18 sessions** (2026-11-02 → 2026-11-25) | **13,339 rows, 18 sessions** |
| After (bytes / rows / sha256) | 53,976,698 / 945,821 / `dfde0f77…` | 80,741,665 / 1,503,833 / `aa23522d…` |
| After: coverage | 2016-01-04 → **2026-11-25** (last row 2026-11-26T00:59Z = 19:59 ET) | → **2026-11-25** (00:58Z) |
| Prefix proof | first 53,395,054 bytes = `2ee06310…` | first 80,036,100 bytes = `77dba9b2…` |
| Training / holdout rows | unchanged (`920f3a20…` / `20f7bb91…`) | unchanged (`a9ea93aa…` / `6ac858c0…`) |
| `datasets verify` | 2,741 sessions, 0 missing, 0 duplicate, out-of-order, malformed or inconsistent rows, no bars on closed days | the same |
| Vintages verified | 4 of 4 (10-13, 10-29, 10-30, 11-25) | 4 of 4 |

Data-quality findings:

- The 2026-11-01 DST change and the extended-hours convention are preserved. Under EST, a session's 19:00–19:59 ET bars
  fall on the next UTC date and belong to its New York date.
- No early close fell in the new period. 2026-11-27, an early close, is excluded: it was in progress.
- VGT's recorded 8:1 split (2026-04-21) re-verifies, and no unexplained split-sized move appears in either symbol.
- No VGT or GDX distribution falls in the new period. The distribution ledger covers VGT/VOOG through 2026-10-30;
  N/original books no distributions (price only).
- **Correction to an inherited note.** Alpaca reads a date-only `end` as the **end** of that UTC day, not 00:00Z.
  - Verified: `end=2026-11-26` returns bars through 00:59Z, and `end=2026-11-27` is refused (HTTP 403) because it
    reaches the last 15 minutes of SIP data.
  - Study 9's statement could not be told apart from this, because 2026-10-31 had no bars. Its data are unaffected.
  - The README now documents the rule.
- No historical correction was found or applied.

## 5. N/original on all available data

**Subject:**
- Assignment 3's `C24/informed/GD.VB/R2#1 profit`, id `rc1-f1a8b57cb02455c3`, from the sealed
  `research/vg-l0-full-joint/FROZEN_SELECTION.json` (`4080d4b1…`).
- D1·GDX `{277,2,61,13,232,24,152,10}` with protective stop 15.9%, adaptive hold and decline gate; D1·VGT
  `{237,2,73,15,70,42,103,41}` with protective stop 12.0%; Growth·VGT; Growth·GDX off; shadow eligibility off;
  lifecycle L0.

**Execution:**
- Its sealed options, unchanged: one exclusive $100,000 slot; same-instant D1 first, then GDX before VGT; 5 bps per side
  in the fills; 11% simple interest by calendar day; stops at the level or a gapped open; fractional shares; the strict
  minute tracker of marked net.
- One continuous causal run 2016-01-04 → 2026-11-25, 2,741 sessions. Nothing was reset at 2024-12-31 or 2026-10-30.

**Checks:**
- The rebuilt ledger reconciles to the engine: 548,415 marks, the DD with its instants, 46 lots.
- The run equals FULL **decision for decision through 2026-10-30**: portfolio path, funding log, every lot and every
  book's trades.

### 5.1 Periods (P&L attributed by the change of marked net)

A is the historical research window, through the existing validation end. B is the newly available period, a **manual
post-validation evaluation, not an extension of the formal validation dataset**. C is the entire available dataset. A1
and A2 are A's development and formal-validation parts.

| Item | A 2016-01-04 → 2026-10-30 | A1 → 2024-12-31 | A2 2025-01-02 → 2026-10-30 | **B 2026-11-02 → 2026-11-25** | C 2016-01-04 → 2026-11-25 |
|---|---:|---:|---:|---:|---:|
| Net profit (Δ marked net) | $482,700.73 | $388,031.02 | $94,669.70 | **−$5,697.90** | $477,002.83 |
| Gross trading P&L (net + interest + costs) | $559,840.71 | $452,935.34 | $106,905.37 | −$4,729.75 | $555,110.96 |
| Margin interest | $72,509.59 | $61,479.45 | $11,030.14 | $723.29 | $73,232.88 |
| Transaction costs | $4,630.40 | $3,424.87 | $1,205.53 | $244.86 | $4,875.26 |
| Realized P&L in the period | $488,265.48 | $388,031.02 | $100,234.46 | −$11,262.66 | $477,002.83 |
| Unrealized at start / end | $0 / −$5,564.76 | $0 / $0 | $0 / −$5,564.76 | −$5,564.76 / $0 | $0 / $0 |
| Max marked DD, reset at the period start | $20,385.99 (2026-06-17 → 07-17) | $19,459.83 (2023-01-25 → 02-24) | $20,385.99 | **$25,794.56** (2026-11-09 15:28 → 11-20 15:55 ET) | $25,794.56 |
| Max marked DD from the continuous peak | $20,385.99 | $19,459.83 | $20,385.99 | $25,794.56 (peak $500,698.77, a new all-time high) | $25,794.56 |
| Max banked-capital DD | $13,479.90 | $10,335.73 | $13,479.90 | $18,844.76 (high 11-10 → 11-20) | $18,844.76 |
| Max trade-principal loss | $11,113.57 (lot 40 D1·GDX) | $8,092.81 (lot 26 D1·GDX) | $11,113.57 | $16,225.15 (lot 45 D1·GDX) | $16,225.15 |
| Lots active / entered / closed / carried in | 44 / 44 / 43 / 0 | 32 / 32 / 32 / 0 | 12 / 12 / 11 / 0 | 3 / 2 / 3 / 1 | 46 / 46 / 46 / 0 |
| Win rate (closed lots) | 83.72% (36 / 43) | 87.50% (28 / 32) | 72.73% (8 / 11) | 33.33% (1 / 3) | 80.43% (37 / 46) |
| Open positions at the end | lot 44 D1·GDX −$5,564.76 | none | lot 44 | **none** | none |

Notes on the definitions:
- **Drawdown bases.** "Reset" restarts the strict tracker at the period's opening close, with the peak at the marked
  net there (the standard's period drawdown; B's opening close is 2026-10-30, at $482,700.73). "From the continuous
  peak" keeps the whole run's running peak from 2016. In B both are $25,794.56, because the B peak of 2026-11-09
  ($500,698.77, lot 44's high) exceeded every earlier value. The trough on 2026-11-20 at 15:55 ET ($474,904.21) came
  after lot 45's stop and during lot 46's adverse mark.
- **Trade-principal loss** is on the liquidation basis over each lot's whole life to the period end. **Banked-capital
  DD** starts its high-water mark at the period's opening banked net. Both follow
  `research/vg-l0-risk-metrics/METRIC_SPECIFICATION.md`.
- **Counts.** Lot counts are funded lots. In B the carried-in lot 44 counts as active and closed in B. B's interest and
  costs are those accrued or paid after the 2026-10-30 close.

### 5.2 Comparison with the recorded results

| Figure | Recorded (sealed / risk-metrics) | Now, through 2026-10-30 | Now, through 2026-11-25 |
|---|---:|---:|---:|
| Net | $482,700.73 | $482,700.73 | $477,002.83 |
| Max minute DD | $20,385.99 | $20,385.99 | $25,794.56 |
| Lots | 44 | 44 | 46 |
| Development net / DD | $388,031.02 / $19,459.83 | identical | identical |
| 2025–2026 P&L / reset DD | $94,669.70 / $20,385.99 | identical | identical (the formal window is unchanged) |
| Realized / unrealized | $488,265.48 / −$5,564.76 | identical | $477,002.83 / $0 |
| Interest / costs | $72,509.59 / $4,630.40 | identical | $73,232.88 / $4,875.26 |
| Banked DD (dev / val / full) | $10,335.73 / $13,479.90 / $13,479.90 | identical | full $18,844.76 |
| Trade-principal loss (dev / val) | $8,092.81 / $11,113.57 | identical | full $16,225.15 |
| Ledger signature | `54d1c2e07c2dbbfd` | identical | — (a longer ledger) |

Every difference comes from the new period B. Nothing before 2026-10-30 changed, and that is decision-for-decision
proven. The only endpoint-dependent value is lot 44: open at −$5,564.76 at the old end, closed later at +$5,483.48.

### 5.3 Trade and position ledger of the newly available period

| Lot | Book | Entry (ET) | Entry raw | Shares | Exit (ET) | Reason | Exit raw | Lot net | Value at 10-30 close | P&L in B | Interest in B | Costs in B | Principal loss | MAE |
|---|---|---|---:|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 44 (carried in) | D1·GDX (deep) | 2026-10-23 09:33 | 81.41 | 1,227.74 | 2026-11-10 11:20 | trailing stop | 86.4021 | +$5,483.48 | −$5,564.76 | **+$11,048.24** | $331.51 | $53.04 | $7,109.17 | −$7,062.59 |
| 45 | D1·GDX (deep) | 2026-11-12 09:33 | 82.94 | 1,205.09 | 2026-11-20 11:01 | protective stop (15.9%) | 69.7525 | −$16,225.15 | — | **−$16,225.15** | $241.10 | $92.00 | $16,225.15 | −$16,225.15 |
| 46 | D1·VGT (deep) | 2026-11-20 12:07 | 798.16 | 125.23 | 2026-11-25 09:30 | trailing stop (gap) | 796.00 | −$520.99 | — | **−$520.99** | $150.68 | $99.81 | $2,668.29 | −$2,619.60 |

- **Totals:** P&L in B −$5,697.90, interest $723.29, costs $244.85 (cent rounding of $244.86).
- **VGT prices** are in the run's first-session share units (the 2026-04-21 8:1 split is forward-adjusted; 798.16
  corresponds to a quote of about $99.77).
- **Funding decisions in B:**
  - D1·GDX trade 48 granted 2026-11-12 09:33 (lot 45);
  - D1·VGT trade 14 granted 2026-11-20 12:07 (lot 46);
  - **D1·GDX trade 49 refused 2026-11-23 09:32 at $74.06 (slot occupied by lot 46).**
- Machine-readable: `n-original/all-through-2026-11-25/ledger-post-validation.{json,csv}`, `funding-post-validation.json`.

### 5.4 State at the final session (2026-11-25 close)

- **Portfolio:** flat. No funded lot is open, the realized net is $477,002.83, and no interest is accruing.
- **D1·GDX book:** its refused trade 49 (decision and virtual entry 2026-11-23 09:32 ET at 74.07) is **virtually open**
  at the end, with a virtual net of −$353.14 on its notional. Under lifecycle L0 the book waits in that virtual position:
  no new GDX D1 decision can arise until it exits.
- **D1·VGT book:** flat after lot 46.
- **Growth·VGT book:** flat. Its last decision was 2026-04-15.
- No order is pending.
- The books' internal indicator state (reference highs, stop levels of the virtual trade) is not exposed by the engine's
  records; `book-states.json` lists what is.

## 6. Verification

| Check | Result |
|---|---|
| Door fingerprints (FULL, D24) and sealed N/original / New L0 replays: before any change = after the code change = after the append | identical (`evidence/fingerprint-{0,1,2}-*.json`) |
| `npm test` (final run after the append; contained unit) | see §6.1 |
| New tests | `src/lib/tests/researchBoundaries.test.ts` (16), `src/manual-eval/tests/manualEval.test.ts` (4), `src/data-partition/tests/datasets.test.ts` (+1), `src/research-standard/tests/preflight.test.ts` (+5) — all pass |
| Growth golden masters (`offParity*`) on real data after the append | 33 of 33 pass, 0 skipped (they run on the verified 10-30 vintage) |
| Strategy Lab unit suite (`vitest run`) | 314 of 314 pass (portfolio parity on FULL after the append, preview identity, candles) |
| Non-official GPU/CPU check | 204 of 204 bit-identical; 51 of 51 sealed on FULL |
| `tsc --noEmit` | 0 errors |
| ESLint on the 27 changed or new files | 0 errors (warnings are formatting) |
| Research preflight, all 31 studies | 26 pass; 5 official GPU studies BLOCKED only by the stale acceptance |
| `tools/gpu-backend/verify-acceptance.sh` | NOT VERIFIED: exactly the six changed pinned files (`src/lib/{csv,evaluation}.ts`, `src/vg-d1-growth-joint/{context,data}.ts`, `src/research-standard/preflight.ts`, `config/gpu-backend/entrypoints.json`); the binary hash passes |

The brief's twelve demonstrations:

1. Optimization range unchanged by an append: `researchBoundaries` "appending market data changes neither …"; the
   preflight; R1 pinned.
2. Validation range unchanged by an append: the same tests; the `access: 'validation'` loader ends at 2026-10-30 with
   rows through 2026-11-27 present.
3. Historical results reproducible:
   - the fingerprints;
   - `manualEval` "FULL is the recorded historical input";
   - the Growth golden masters;
   - the 51 sealed subjects on the GPU;
   - Strategy Lab portfolio parity.
4. Manual full-dataset runs include new data: `manual-eval --window all` (to 2026-11-25), `src/app.ts … VGT all`, and the
   synthetic manual test.
5. Custom dates respected: the synthetic custom-window test, `manual-eval --window custom` and `src/app.ts … VGT all
   2025-01-02 2026-11-03`.
6. Optimization cannot pass its cutoff: the `development` access refuses 2025-01-02 and reads nothing after 2024-12-31;
   the legacy `optimization` access stays training-only; D19–D24 are physical prefixes (unchanged fingerprints).
7. Validation cannot pass its cutoff: `validation` access refuses 2026-11-25 before reading, and a malformed row after
   the boundary is never parsed. FULL reads only its pinned bytes.
8. Integrity checks stay meaningful:
   - a changed historical byte, a cut inside a row and a short file fail the pin;
   - `datasets vintages` catches a rewrite;
   - the append refuses revised overlap rows;
   - the golden masters run instead of skipping.
9. CPU and GPU share the boundary: GPU dataset byte-identity (npm test) and the 204 bit-identical GPU/CPU results.
10. No stale Strategy Lab results: content-addressed preview and portfolio identities, which change with the data
    (existing `preview-identity` and `candles` tests); its suite passes after the update.
11. Common complete endpoint: the synthetic two-file tests (`researchBoundaries`, `manualEval`), and the real run limited
    by both files at 2026-11-25.
12. The trajectory before the cutoff is unchanged: `compareTrajectories` on real data (all-data run = FULL through
    2026-10-30). This covers the portfolio path, every lot and fill, funding and each book's decisions. Only the
    endpoint-dependent marking of lot 44 differs, and its marks through the cutoff are compared.

### 6.1 The full suite

The final contained run (after the append and every code change): **1,904 tests, 1,890 pass, 10 fail, 0 cancelled, 4
skipped.** The failures:

| Failures | Cause |
|---|---|
| 7 | Known pre-existing: the lowercase `allin-original.ts` ×6 (intraday-study, minute-optimizer, trailing-buy ×4), and the Study 7 sealed-door parity (data end 2026-10-29) |
| 3 | **By design while the acceptance is STALE:** MERGE GATE, "the recorded acceptance re-verifies independently", "every study … passes the preflight" (5 official studies BLOCKED) |

The run before the last fix had an 11th failure, the Study 7 end-validation assumption, which is now fixed (§3.1).

## 7. Unresolved issues, limitations and risks

1. **The GPU acceptance is STALE on this branch** (the user's decision, the follow-up gate):
   - official GPU optimization and the merge gate are blocked until a §2 re-acceptance on Apollo (a new binary built
     with the new evaluation digest, the parity campaign, sanitizer, negative and tamper tests, the fixed-seed
     mini-optimization, a new record);
   - no CUDA change is needed: the door arrays are byte-identical, as the dataset export shows;
   - the brief excluded running an optimization to test infrastructure, so this was not run;
   - **do not merge this branch into an official-research branch before that re-acceptance.**
2. **Completed studies with their own whole-file pins fail closed at HEAD after the append:**
   - `vgt-d1-growth-joint` (Priority 2), `growth140-vgt-s8m` / `-stable`, `vg-balanced-entry-eligibility`, the
     `intraday-d1` validation door, `growth-etf-screening`, and `tools/gdx-d1-growth/data.ts pins`;
   - their inputs are exact prefixes (vintages recorded), and they are reproduced at their own commit from the verified
     prefix; their code and records were not changed.
3. **Strategy Lab:**
   - the run views show the requested window, not the effective one (which is in each run's provenance);
   - a saved run whose requested end lay past its data at the time would now chart appended prices beyond what it
     evaluated;
   - Portfolios remain the fixed 2016-01-04 → 2026-10-30 benchmark;
   - full-data and custom pooled runs are command-line only (`npm run manual-eval`);
   - no UI was changed (brief §12).
4. **Only VGT and GDX were updated.** Multi-symbol runs with other files end at the common complete endpoint (2026-10-30)
   or refuse mismatched calendars (the allocator's VOOG/VGT `--dataset all`, B4/B5 pools on `all`). They fail closed,
   never stale. The distribution ledger's coverage (2026-10-30) matters for allocator portfolio runs, not for
   N/original.
5. **The new period is short:** 18 sessions, 3 lots. It is descriptive only and is not evidence about N/original's
   robustness. Its drawdown ($25,794.56) exceeds the whole recorded history's maximum but stays under the $35,000
   research ceiling, which is a historical criterion, not a loss limit.
6. **Standard 4.0.0** was adopted under the brief's authorization; it is the user's to review. Its §1.12–§1.14 bind new
   studies only.
7. **Environment:**
   - `npm run app`'s `preapp` lint fails on git-ignored Strategy Lab scratch bundles under `research/*/cache/` (left by
     earlier studies), which is why the entry point was run directly;
   - several other studies' tools carry pre-existing lint errors;
   - neither was changed.

## 8. Files and state

- **Commits on `feature/research-date-boundaries`** (from `03f3500c`): the implementation `7a41ff0b`, then the data
  update, evaluation and documentation commit. The branch was pushed to `origin`; the push is verified in
  `WORK_RECOVERY.md`.
- **Changed (38 files outside this directory):**
  - `CLAUDE.md`, `README.md`;
  - `config/gpu-backend/entrypoints.json`, `config/market-data/vintages.json` (new), `config/research/date-ranges.json`
    (new);
  - `docs/research/{OPTIMIZATION_STANDARD.md, optimization-standard.versions.json, ROADMAP.md, STUDY_PROTOCOL_TEMPLATE.md, templates/STANDARD_ADOPTION.template.json}`,
    `docs/strategy-lab/POOLED_CANDIDATES.md`;
  - `package.json`;
  - `src/data-partition/{canonical,cli}.ts` and its test; `src/growth-trading/{tests/offParity*.test.ts, tools/capture-baseline*.ts}`;
  - `src/lib/{canonicalPrefix (new), csv, evaluation, researchRanges (new)}.ts` and tests; `src/manual-eval/` (new);
    `src/research-standard/preflight.ts` and its test; `src/study7-runners/tests/runners.test.ts`;
    `src/vg-d1-growth-joint/{context,data}.ts`;
  - `tools/data-boundaries/` (new), `tools/manual-eval/` (new).
- **Local only (git-ignored data):**
  - `data/VGT/data.csv`, `data/GDX/data.csv` (appended);
  - their `dataset-report.json`; `data/datasets-{append,verify}-run.json`;
  - the run records copied to `data/vintages/data-update-2026-11-27/`;
  - no other data file was touched, and no market data are in git.
