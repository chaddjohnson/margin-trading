# ETF universe expansion and the data ingestion workflow (design only; nothing downloaded in Phase 1)

## 1. Why expand, and what the expansion must not do

The 16 current datasets (`EWZ GDX GLD IWM IWN KRE TLT VGT VOOG XBI XLE XLF XLU XLY XOP XRT`) were assembled when VGT
was expected to anchor the pool. The 16-ETF study showed that a one-lot pool rewards *few* books whose deep declines
and recoveries fall at different times (the surviving core {XBI, XRT, KRE, GDX} mixes biotech, retail, regional banks
and gold miners). Whether other correction mechanisms — defensive sectors, factors, non-US equity, duration, credit,
other real assets — can replace or complement that core is untested, and a breadth of candidates is the only way to
test it. The expansion must be chosen by **category and data quality**, not by any instrument's known 2024–2026
performance or by a standalone D1 profit screen (the earlier daily-proxy screen was wrong in direction for GDX and
XOP, as the portfolio-aware study found).

Hard constraints inherited from the engine (facts from the code):

- Members of one run must share the **same session calendar**, session by session (`assembleUniverse` refuses a
  mismatch) and the same first session; the common history today is 2016-01-04 → 2026-10-13 (2,710 sessions).
- Books arm from 2017-06-15 and need up to 250 sessions of history before it; so a symbol needs regular-session bars
  from 2016-01-04 on every NYSE session.
- Partitions are dates of one file (`data/partitions.json`), so a new symbol needs nothing but its canonical file;
  it does **not** acquire any right to be read on holdout/final/all by the optimizer (the access door is per request,
  not per file).

## 2. Eligibility rule (predeclared; applied to every symbol, old and new, after ingestion)

A symbol is **eligible** for the search universe when all of the following hold on its verified canonical file:

| Rule | Criterion | Rationale |
|---|---|---|
| D1 history | first regular-session bar on or before **2016-01-04**; a regular-session bar on **every** NYSE session through the last common session (`datasets -- verify`: `missingSessions` empty) | common calendar; warm-up for L ≤ 250 before 2017-06-15 |
| D2 integrity | `datasets -- verify` status `verified`: zero malformed, out-of-order, duplicate or out-of-range rows; rows hash equals file hash | the repository's own standard |
| D3 corporate actions | every split-sized overnight move explained by an entry in `config/market-events/splits.json` with an issuer/OCC source document (`market-events -- verify` lists no unexplained gap for the symbol) | an unrecorded split is a fake crash |
| D4 structure | not leveraged, inverse, volatility-futures, single-commodity-futures-roll-dominated with documented decay (see §3.5), or an ETN; no fund closure, delisting, trading halt > 5 sessions, or index/strategy change that the issuer documents inside 2016-01-04 → 2026-10-13 | D1 reads a price path; structural breaks are not corrections |
| D5 tradability (minimum) | training-window median daily dollar volume ≥ **$10M** and median regular-minute coverage ≥ **25%** | the lowest level at which actual-bar fills are meaningful (VOOG, at $16M and 36.7%, passes) |

A symbol failing D1 only (inception after 2016-01-04 but before 2018-07-01) is placed in a **late cohort**, recorded
with its first date, and **not** used in the primary study (the engine cannot mix calendars; a separate shorter-horizon
cohort study would need its own protocol). A symbol failing D2–D4 is excluded with the failing rule quoted in the
audit report. D5 is a floor; liquidity above the floor is a **flag**, not a gate (§5).

All 16 existing symbols are expected to pass D1–D5 (they passed the equivalent 16-ETF audit); they are **re-audited
under the same rules** so that eligibility is one rule for every symbol.

## 3. Proposed candidate shortlist (PROPOSED, UNVERIFIED — inception dates and histories from general knowledge, to
be confirmed from the downloaded data and issuer documents at ingestion)

Hypotheses are about *correction/recovery mechanisms*, i.e. why a symbol's deep declines and rebounds might fall at
different times from the current core's. Nothing here is a profitability claim.

### 3.1 Tier 1 — ingest first (28 symbols)

| Category | Symbol | Diversification hypothesis | Known caveats to check |
|---|---|---|---|
| US sector: health care | **XLV** | defensive; drawdowns driven by policy/drug cycles, shallower and differently timed than growth | overlaps XBI only partly |
| US sector: consumer staples | **XLP** | defensive, rate-sensitive; rarely reaches deep X thresholds — tests whether a "rarely arming" book helps or merely idles | low arming frequency |
| US sector: industrials | **XLI** | cyclical, trade-policy sensitive (2018–2019 dips) | correlated with IWM |
| US sector: materials | **XLB** | commodity-cycle driven; China demand shocks | correlated with XME/COPX |
| US sector: real estate | **XLRE** | rate-driven declines (2018, 2022–2023) distinct from equity-beta crashes | inception Oct 2015: confirm bars from 2016-01-04; thin early volume |
| US sector: technology (SPDR) | **XLK** | the VGT mechanism with deeper liquidity; tests whether VGT's thin bars mattered | near-duplicate of VGT |
| US industry: semiconductors | **SMH** | high-beta cyclical with its own inventory cycle; deep 2018/2022 declines | high correlation with XLK/VGT in crashes |
| US industry: homebuilders | **XHB** | rate-sensitive cyclical; distinct 2018 and 2022 paths | mid liquidity |
| US industry: metals & mining | **XME** | industrial-commodity miners; different driver from gold miners (GDX) | high volatility, drawdowns may breach the ceiling |
| US industry: banks (large) | **KBE** | banking stress (2020, 2023) with large-cap composition versus KRE's regionals | near-duplicate of KRE in 2023 |
| Factor: value | **IWD** | value's drawdowns and recoveries diverge from growth (2020–2021, 2022) | broad, shallow |
| Factor: growth | **IWF** | the growth cycle at broad-market depth | overlaps VOOG |
| Factor: dividend | **VIG** | quality-dividend defensiveness | Vanguard issuer (see §6 brokerage note) |
| Factor: minimum volatility | **USMV** | shallow, slow declines — tests the hypothesis that D1 needs volatility to pay | inception 2011; may rarely arm |
| Factor: momentum | **MTUM** | momentum crashes (reversal episodes) are a distinct correction mechanism | inception 2013; periodic reconstitution |
| Size: small-cap core | **IJR** | small-cap beta with better liquidity depth than IWN | overlaps IWM |
| Equal weight | **RSP** | breadth-driven declines (de-concentration) | overlaps VOOG/IWD |
| Non-US developed | **EFA** | ex-US developed cycle (Europe/Japan), currency component | US-hours proxy of overseas moves; gaps at the open |
| Non-US developed (Europe) | **VGK** | European policy/energy shocks (2018, 2022) | Vanguard issuer |
| Emerging markets | **EEM** | EM crises and recoveries distinct from US beta (2018, 2020, 2022) | overlaps EWZ partly |
| China | **FXI** | China policy cycle; deep declines 2018, 2021–2022 | large gap risk; regulatory shocks |
| Japan | **EWJ** | low-correlation developed market; currency-driven moves | low intraday volatility in US hours |
| Rates: intermediate Treasuries | **IEF** | duration shocks (2018 Q4, 2022) with smaller amplitude than TLT | rarely reaches deep X thresholds |
| Rates: long duration (zero coupon) | **EDV** | duration with amplitude large enough to arm D1 regularly | Vanguard issuer; thinner volume |
| Credit: investment grade | **LQD** | credit-spread corrections (2020 March, 2022) | high yield-drop signal effect (§7) |
| Credit: high yield | **HYG** | credit cycle; sharp 2020 crash and policy-driven rebound | monthly distributions move prices |
| Real assets: silver | **SLV** | precious metal with higher volatility than GLD; arms more often | commodity trust; no distributions |
| Real assets: broad commodities | **DBC** | commodity cycle (2020 crash, 2022 spike) with futures roll | roll yield; see §3.5 for the decay rule |

### 3.2 Tier 2 — ingest if Tier 1 completes within budget (20 symbols)

| Category | Symbol | Hypothesis / caveat |
|---|---|---|
| US sector: utilities (Vanguard) | VPU | duplicate check of XLU with a different issuer |
| US industry: biotech (large) | IBB | the biotech mechanism at large-cap composition |
| US industry: oil services | OIH | deepest energy drawdowns; drawdown ceiling likely breached |
| US industry: software | IGV | growth sub-sector with distinct 2022 path |
| US industry: transports | IYT | cyclical bellwether |
| US industry: insurance | KIE | financials without bank-run risk |
| Factor: quality | QUAL | inception 2013; shallow declines |
| Factor: low volatility | SPLV | duplicate check of USMV mechanism |
| Size: mid-cap | IJH | mid-cap beta |
| Non-US: EM ex-China weighting | IEMG | inception 2012; overlaps EEM |
| Country: Korea | EWY | export-cycle EM with deep 2018/2022 declines |
| Country: India | INDA | inception 2012; distinct domestic cycle |
| Country: Mexico | EWW | tariff/peso shocks |
| Latin America | ILF | overlaps EWZ heavily |
| Rates: short Treasuries | SHY | expected to never arm — a negative control for the activity floor |
| Inflation-linked | TIP | real-rate shocks 2022 |
| Credit: EM sovereign | EMB | EM credit cycle |
| Credit: broad aggregate | AGG/BND | duration + credit mix; one of the two |
| Real assets: gold (iShares) | IAU | duplicate check of GLD |
| Real assets: junior gold miners | GDXJ | higher-beta version of GDX; tests whether GDX's role is "gold miners" or "GDX specifically" |

### 3.3 Deliberately excluded categories (rule D4), listed so that the omission is a decision

Leveraged and inverse ETFs (TQQQ, SQQQ, SPXL, SH, …), VIX-futures products (VXX, UVXY, SVXY), ETNs, single-commodity
futures funds with documented large roll decay (USO, UNG — their "declines" are partly contango, not corrections),
crypto products with inception after 2016 (BITO, IBIT, GBTC's non-ETF period), funds halted or delisted inside the
window (RSX, ERUS), and funds with a documented index change that redefines the exposure inside the window (for example
MJ). DBC is kept in Tier 1 as the one diversified futures proxy under an explicit caveat; if its audit shows a roll
structure the engine cannot distinguish from price, it is excluded with that reason.

### 3.4 Late cohort (inception after 2016-01-04; recorded, not used in the primary study)

XLC (2018-06), BOTZ (2016-09), and any Tier 1/2 symbol whose first canonical bar turns out to be after 2016-01-04.

### 3.5 Structural checks performed per symbol at audit (rule D4), from the data and issuer documents

Issuer-documented index/strategy changes and fund events inside the window; split-sized overnight moves (recorded or
unexplained); sessions with zero regular bars; the share of sessions whose first bar is after 09:31 and whose last is
before 15:59 (stale-quote proxy); distribution frequency and typical ex-dividend overnight move size relative to the
X/Y/buffer scales (a monthly 0.4% drop matters for buffer = 0.1%); for futures-based funds, the sign and magnitude of
the documented roll yield over the window (reported; a predeclared exclusion if the issuer documents a structural
decay the engine would read as a decline).

## 4. Breadth versus depth: how ≈ 40 eligible symbols are searched fairly

- **Library**: the identical 1,024 Sobol vectors (plus controls in the final round) on every eligible symbol, with the
  same per-vector records as the 16-ETF Stage L. Single-book smoothed figures (J of singletons) are **recorded as
  diagnostics and never used to prune, rank or seed** — the pool objective, not standalone profit, decides.
- **Coverage floor in discovery** (mechanical, predeclared): by the end of discovery every eligible symbol must appear
  in ≥ 400 evaluated configurations with ≥ 150 distinct vectors; symbols under the floor receive a **coverage top-up**
  island (one per under-covered symbol, 1,000 evaluations, initial population = that symbol in random 1–5-book
  subsets with library vectors). The top-up budget is reserved in advance (≤ 15% of discovery) so that a mechanism
  ignored by selection pressure early is still explored.
- **Category-stratified initial populations**: one island whose initial genomes draw one member per category
  (sector / factor-size / non-US / rates-credit / real assets) so that cross-mechanism pools exist from generation 0.
- **Compute**: the fast path's cost grows linearly with members per configuration, not with universe size; the
  library (≈ 1,045 × 40 ≈ 41,800 traces, ≈ 10 min) and memory (≈ 3.5 GB for 40 symbols; `--max-old-space-size`
  already 10 GB) are the only universe-size costs. PROPOSED_PROTOCOL.md §7 gives the schedule.
- **Comparability across universe sizes**: the benchmarks are evaluated under the same neighbourhood definition in the
  same universe load; the search's materiality bar M does not depend on universe size; the archive's PBO (WALK_FORWARD
  §8) is reported for the expanded universe so that the extra search breadth is visible as extra overfitting
  propensity, not hidden.

## 5. Execution-capacity rule (observables only)

For every member of every finalist, on the training window:

- `partLot` = $100,000 ÷ (median regular-minute dollar volume over the member's funded-decision minutes and the
  following 5 minutes); `partPortfolio` = the same with the lot notional at 20% of the portfolio's equity at the last
  training close;
- the share of funded fills that occurred ≥ 2 minutes after the decision minute (delay distribution; VOOG's library
  figures: median 0, p99 5 minutes).

Flag **capacity-limited** when `partLot` > 0.10 (the lot exceeds 10% of the next five minutes' traded value) or when
> 10% of fills were delayed ≥ 2 minutes; flag **capacity-unverified** when `partPortfolio` > 0.10. A finalist with a
capacity-limited member cannot be the primary recommendation (it may be an alternate, labelled); this is a reporting
and ranking rule, not a change to fill semantics (fills remain the first actual trade after the decision). The
threshold 0.10 is a predeclared convention, not a measured impact model; it is stated as such.

## 6. Brokerage notes carried from earlier programs (to re-verify, not resolved here)

- The multi-ETF allocator program recorded Vanguard's published rule that newly purchased **Vanguard ETF** shares
  settle in the cash account and carry no loan value for 30 days (`research/multi-etf-allocator/PROTOCOL.md` §8.6,
  `RECOMMENDATIONS.md`). As written it affects VGT lots and any Vanguard-issued book (VOOG, VIG, VGK, EDV, VPU, BND).
  Finalists containing a Vanguard-issued book are labelled **brokerage-constraint pending** in the recommendation.
- Vanguard's online ETF commission is zero; the 0/2/5/10 bps cost ladder models spread, slippage and impact and is a
  research assumption.

## 7. Dividend handling for new symbols

No distribution ledger exists for any symbol other than VGT/VOOG, and `npm run market-events -- update` fetches
Vanguard's API only. For the new study:

- Fixed pool: price-only for every lot (unchanged, symmetric across symbols). The omitted cash is bounded per finalist
  member as lot-days × $100,000 × yield ÷ 365 at 1/3/6% (the existing convention) **and**, new, the count of exits
  that occur within one session after an ex-date is reported where an ex-date calendar is available (issuer sites;
  optional ingestion in Phase 2, never synthesized).
- Portfolio: two conventions, both reported: **frozen** (`lotDividends: true`: VGT lots receive VGT's distributions,
  no other lot's) and **symmetric** (`lotDividends: false`: no lot distributions for any symbol; the core still
  receives its VGT/VOOG distributions). Benchmark comparisons in gates use the symmetric convention; the frozen
  convention reproduces the published B4/B5 figures and is kept for continuity. Price-only returns are *not* treated
  as equivalent to total returns; the bound makes the gap explicit.

## 8. Ingestion workflow for Phase 2 (confirmed by the user; specified here, not performed)

Facts from the repository: `scripts/download.sh <SYMBOL> [start] [end]` (run from the repository root; `data/download.sh`
is a wrapper that `cd`s to the root and sets `OUTPUT_DIR=data`) pages Alpaca's `v2/stocks/<SYMBOL>/bars` (1Min, SIP,
raw, `limit=10000`) with `curl --retry 5 --retry-all-errors` and **appends** each page to `data/<SYMBOL>.csv`
(headerless CSV via `jq`); it **refuses to start if that file exists** and requires `ALPACA_API_KEY` and
`ALPACA_SECRET_KEY` in the shell environment (`set -a; . ./.env; set +a`). `npm run datasets -- import <SYMBOL>
[--replace] [--keep-source] [--dry-run]` scans `data/<SYMBOL>.csv`, writes the data rows to
`data/<SYMBOL>/.data.csv.tmp-<pid>`, checks the rows' sha256, renames it to `data/<SYMBOL>/data.csv`, and **removes
the staging file unless `--keep-source`**; any validation error leaves everything as it was and removes the temporary
file. The CLI then writes `data/<SYMBOL>/dataset-report.json` and `data/datasets-import-run.json`. A new symbol's
directory holds **only** `data.csv` and `dataset-report.json`; `partition-report.json` and `migration-report.json`
found in the 16 existing directories are records of the 2026-10-23/24 layout migration and are **not** created for new
symbols (do not fabricate them).

### 8.1 Per-symbol procedure (Opus implements as `npm run robust-d1 -- ingest <SYMBOL> [...]`, a thin orchestrator
around the existing tools; it never re-implements download or import)

```
0. Preconditions: node --env-file-if-exists loads .env for npm scripts; for the shell script export the two variables
   from .env in the current shell only (never echo, log, or pass them as arguments). Verify `jq` and `curl` exist.
   Refuse if data/<SYMBOL>/data.csv already exists unless --refresh (then the path is `import --replace` / `append`,
   documented separately; a refresh of an EXISTING symbol is out of scope for first ingestion).
1. Staging check: if data/<SYMBOL>.csv exists, it is a leftover of an earlier attempt → stop with a message; delete it
   only if the orchestrator's own attempt log (data/<SYMBOL>.ingest-attempt.json) marks it as that attempt's
   incomplete output; never delete anything else.
2. Download: scripts/download.sh <SYMBOL> 2016-01-04 <END>, END = the current last common session (2026-10-13 today;
   a later END is allowed only after the "extend history" decision, OPEN_DECISIONS.md D9) — the same END for every
   symbol, so calendars agree. Capture stdout/stderr to data/<SYMBOL>.download.log. The script prints only page
   counts and paths; the orchestrator must never print, log or serialize its environment, and a test (§8.2) runs the
   orchestrator with dummy credential values and asserts they appear in no output file.
3. Retry policy: on a non-zero exit — classify from the log: HTTP 401/403 or "Set ALPACA_API_KEY" → NON-RETRYABLE,
   stop and report; HTTP 429, 5xx, timeouts, "curl: (" transport errors → RETRYABLE. Before a retry: verify the path is
   exactly data/<SYMBOL>.csv for the symbol being ingested and that the attempt log marks it incomplete, then delete
   it (the script appends, so a partial file would be duplicated). At most 4 attempts with waits 30/60/120 s. Never
   touch data/<SYMBOL>/ during cleanup.
4. Sanity before import: non-empty; first field of the first line parses as an ISO UTC timestamp on or before
   2016-01-04T14:30:00Z's session; last line's date equals END's last session or the symbol's last available session
   (recorded); line count within ±20% of the median of the existing 16 (reported, not fatal).
5. Import with --dry-run first (prints the scan, writes nothing); then import --keep-source (atomic temp file + rename
   by the existing code); the staging file is intentionally kept at this step.
6. Verify: npm run datasets -- verify <SYMBOL> (status must be `verified`; anomalies recorded) and
   npm run market-events -- verify (no unexplained split-sized gap for <SYMBOL>; if one is listed, the symbol is
   blocked until a split is registered in config/market-events/splits.json with a source document, exactly as XOP's
   was, and verify passes). Record both reports' hashes.
7. Cleanup: only after step 6 passes, delete data/<SYMBOL>.csv (validated path) and write the attempt log's final
   status (downloaded/imported/verified/cleaned, hashes of the canonical file and dataset-report.json). On a step-5/6
   failure: keep the staging file and the logs for diagnosis, record the failure, do not create or leave a partial
   data/<SYMBOL>/data.csv (import already guarantees this), and stop.
8. Eligibility audit (rules D1–D5, §2) from dataset-report.json, the file and the split registry → an entry in
   results/audit/universe.json with the decision and the failing rule if any. Only `eligible` symbols enter the
   universe constant of the frozen protocol.
```

Repeat for every symbol in Tier 1, then Tier 2. Every command name and flag above was read from
`src/data-partition/cli.ts`, `scripts/download.sh` and `src/market-events/cli.ts` on 2026-10-25 and must be
re-confirmed at implementation time (`--help` output or source) rather than assumed.

### 8.2 Protections (invariants to test)

- The orchestrator's deletion function accepts only `data/<SYMBOL>.csv` for the symbol in progress and refuses any
  path under `data/<SYMBOL>/`, `data/archive/`, or any other symbol (unit test with adversarial paths).
- A failed import never leaves `data/<SYMBOL>/data.csv` (the existing temp-file + rename guarantees it; re-tested).
- Credentials: no orchestrator log line, report, JSON or commit contains the environment values (test: the orchestrator
  runs with dummy values in a subprocess and its outputs are grepped for them).
- The common END date is one constant for the whole ingestion batch; a symbol whose last bar is earlier is recorded and
  fails D1 (the calendar check would refuse it anyway).
