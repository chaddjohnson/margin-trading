# Source and conflicts audit — Study 4 (two-tier D1 allocator)

Written 2026-10-29 (UTC) **before any Study 4 outcome-bearing run**. Everything below was read from the repository at
branch `research/study4-two-tier-d1-allocator`, created from `9d9513bf58639b0dce6db7dedef19474e2b9ff4b` (the verified
remote head of `research/study3-vgt-momentum-stage1c` after `git fetch` at 2026-10-29T19:21Z). No file under `data/`
was opened for this audit except directory listings and file sizes; no bar was read. Hashes are SHA-256 of the file
bytes unless marked "tree" (a git tree id at `HEAD`).

## 1. Lineage and what must stay unchanged

| Item | Path | Hash / id |
|---|---|---|
| Study 3 Stage 1c head (branch base) | `research/study3-vgt-momentum-stage1c` @ `9d9513bf` | local = `origin/research/study3-vgt-momentum-stage1c` |
| Study 3 Stage 1, 1b, 1c records | `research/study3-vgt-momentum{,-stage1b,-stage1c}` | trees `7e7737af…`, `e378ac68…`, `1ee6b2c1…` |
| Study 1 (wide D1 library) | `research/d1-wide-library-chronological-selection` | tree `ee4096e0…` |
| Study 2 (all-61 complementarity) | `research/d1-all61-signal-capital-complementarity` | tree `b00c66cd…` |
| Ranked preemption | `research/d1-ranked-preemption` | tree `305d56fa…` |
| Prospective B4/B5 shadow | `research/prospective-b4-b5-shadow` | tree `cbf486aa…`; `PROTOCOL_FREEZE.json` `0dabd97e…`; `PROTOCOL.md` `f2bca114…` |
| Pool configs | `config/pools/B4.json`, `B5.json` | `4ca5aa1a…`, `deef53ca…` (tree `880c7ea3…`) |
| D1 phenotypes | `config/phenotypes/D1/{GDX,KRE,VGT,XBI,XRT}.json` | `ed98c23c…`, `6b8889e2…`, `3e77a419…`, `453c4fd0…`, `d7b7f222…` (tree `97039eae…`) |
| D1 strategy file | `src/app/allIn-trailingBuy-postExitContinuation.ts` | `de0935c3…` |
| D1 book port (frozen) | `src/shared-margin-portfolio/strategy.ts`, `src/multi-etf-allocator/shadow.ts` | `04075592…`, `d37332e9…` |
| N-book engine, trace, replay (frozen) | `src/portfolio-aware-d1/nbook/engine.ts`, `trace.ts`, `replay.ts`; `src/multi-etf-allocator/ledger.ts` | `9b346011…`, `508465ed…`, `9da17057…`, `7a41e274…` |
| Corporate actions, partitions | `config/market-events/splits.json`, `distributions.csv`, `data/partitions.json` | `e5bde427…`, `3b4342eb…`, `43893f3d…` |
| Universe audit (61 symbols) | `research/d1-ranked-preemption/results/audit/universe.json` | `26e71c4c…` |
| Frozen training controls | `research/joint-16-etf-d1/results/controls/controls.json` | `2bd521dc…` |
| Ranked-preemption final controls | `research/d1-ranked-preemption/results/controls/final/CONTROLS.json` | `e83b8e0b…` |
| `package.json`, `package-lock.json` at base | | `135bc266…`, `ee4c73e3…` |

`CLAUDE.md` and `docs/claude/context-recovery.md` on this branch are byte-identical to `origin/main` (`3ef43015`,
which is **not** an ancestor of the branch; the policy reached the Study 3 lineage separately). No change is made to
them. The two untracked `._.DS_Store` files under `research/study3-vgt-momentum-stage1c/` are the user's and are left
alone.

The prospective freeze binds the 134-file import closure of the `pools` CLI (including `src/portfolio-aware-d1/nbook/*`,
`src/multi-etf-allocator/*`, `src/shared-margin-portfolio/strategy.ts`), the pool configs, the phenotype JSONs, the
six canonical data files of B5's members, the splits/distributions/partitions files, the `pools` script line, the
`imports` map and `package-lock.json`. Study 4 imports these modules **read-only** and never edits them.

## 2. The authoritative B5 control (what Study 4 freezes as "B5")

`config/pools/B5.json` (`deef53ca…`): kind `d1-shared-pool`, policy `shadow`, one funded slot, $100,000 per funded
trade, no compounding, 11% simple interest (365-day year), 5 bps per side (0/2/10 sensitivities), stop fill `stop`,
no stop slippage, first eligible (arming) date 2017-06-15. Five books, loaded by `loadPool('B5')`
(`src/pools/load.ts:65`), which checks each book parameter for parameter against the frozen benchmark books:

| Book | Phenotype | Candidate | X (dip) | Y (rebound) | Stop | Max hold (cal. days) | L (sessions) | Buffer | P (pullback) | W (window) | Params sha256 |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| VGT | primary | d1-ebc9f639b3 | 21.6% | 0.3% | 7.3% | 8 | 74 | 2.9% | 9.0% | 60 | `62978dff…` |
| XBI | lowDd | d1-0aabdaab89 | 30.0% | 1.2% | 3.1% | 5 | 49 | 0.1% | 8.2% | 54 | `4755dc64…` |
| XRT | lowDd | d1-15c387627c | 24.4% | 4.7% | 8.0% | 17 | 48 | 3.6% | 6.2% | 120 | `92448568…` |
| KRE | lowDd | d1-a389037400 | 29.9% | 2.7% | 3.1% | 4 | 230 | 2.3% | 9.4% | 60 | `597ed664…` |
| GDX | portfolioAware | d1-51ea8d4bd6 | 27.4% | 0.4% | 7.1% | 18 | 100 | 3.6% | 19.1% | 81 | `26ca27ca…` |

- **GDX** is the B5 `portfolioAware` book selected by `research/portfolio-aware-d1-optimization` (configuration
  P-add-GDX), not any standalone GDX vector. **VGT `primary`** equals the shipped constants of the D1 strategy file
  (`d1Base`, `src/shared-margin-portfolio/strategy.ts:64-78`: 21.6% / 0.3% / 7.3% / 8 / 74 / 2.9% / 9.0% / 60), and the
  books run the frozen, parity-verified port (`EntryMachine`/`ExitManager` in `strategy.ts`, wrapped by `ShadowBook`),
  guarded by `checkStrategyDefinition` (`src/lib/frozenSource.ts:191`).
- The five dips differ (21.6%–30.0%): Study 4 does not impose one threshold. All five books also have the D1
  **continuation path** (after a profitable exit, a P pullback within W sessions arms a trailing buy; XRT's P is
  6.2%), so B5's high tier already takes some entries that are not deep dips. This is part of the frozen architecture
  and is recorded, not changed.
- **B4** (`4ca5aa1a…`) = VGT primary, XBI/XRT/KRE lowDd. **B1** = VGT D1 primary alone (frozen controls' name).

### 2.1 Exact executed semantics (source, not prose)

Verified in the frozen code (`src/portfolio-aware-d1/nbook/engine.ts`, `replay.ts`, `trace.ts`,
`src/multi-etf-allocator/shadow.ts`, `ledger.ts`):

1. **Shadow books.** Every book runs its D1 machine on its own symbol and commits every signal; the allocator's answer
   never feeds back (`ShadowBook.commit` is called for refusals too). A refused book's virtual trade fills, runs and
   exits on its own rules, and its net opens its continuation window. So a book's trade sequence (its **trace**) is a
   function of its symbol's data, parameters, window and execution settings only (`trace.ts:1-12`).
2. **Funding.** A decision (rebound confirmed at a completed minute, stamped bar start + 60 s) is granted iff the pool
   has no open lot and no reservation; the grant reserves the slot until the order fills at the symbol's first trade
   at or after the decision (the closing print only for a decision before the close; else the next session's first
   bar). A book can be funded only by a fresh decision, never mid-trade, and never re-enters on its own exit session.
3. **Order within a bar time** (`replay.ts:205`): session; bar minutes before the close; time; virtual exits, then
   fills, then decisions. Same-minute decisions are answered in **alphabetical symbol order** (`tieOrderOf`); exits
   and fills in book order (`bookOrderOf`). A lot exiting at bar T frees the slot for a decision stamped in the same
   bar.
4. **Ledger.** Entry price = raw × (1 + c), shares = 100,000 / entry price (fractional); exit price = raw × (1 − c) ×
   (1 − stop slippage); net = shares × exit − 100,000 − interest; interest = 100,000 × 11% × (session date of exit −
   session date of entry) / 365 days (whole calendar days; nothing on the entry day). An open lot at the window end is
   marked at the last close with no exit friction.
5. **Drawdowns.** Strategy mark = realized + Σ open lots (shares × last close − principal − interest through the
   session date). Minute DD: strict-peak tracker over marks at every bar of the held lot's symbol, at its exit minute
   and at every close; daily DD: the same at closes. Both start at 0 at the close of the window's first session
   (accounting start), arming from the first session ≥ 2017-06-15.
6. **Distributions.** Fixed mode books none, for any symbol. Portfolio mode books VGT/VOOG distributions only (frozen
   convention: open VGT lots receive VGT distributions; XBI/XRT/KRE/GDX none).

### 2.2 Authoritative matching-window anchors (sealed records, exact)

`research/joint-16-etf-d1/results/controls/controls.json` `training.*` (window 2016-01-04 → 2023-12-29, accounting from
the 2016-01-04 close, arming 2017-06-15; reproduced independently by the ranked-preemption parity gate and by Study 2's
parity record):

| Pool, cost | Net | Minute DD | Daily DD | Lots | Virtual trades | Refused | Interest | Costs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B5, 0 bps | 396,714.78541898355 | 26,309.782346360997 | 23,587.057596280007 | 82 | 155 | 73 | 37,791.7808219178 | 0 |
| B5, 2 bps | 393,666.58025408594 | 26,389.882645812046 | 23,667.702331793873 | 82 | 155 | 73 | 37,791.7808219178 | 3,366.309065201694 |
| **B5, 5 bps** | **388,489.25791641016** | **26,509.97304978661** | **23,788.608981739657** | **82** | 155 | 73 | 37,791.7808219178 | 8,413.249192940204 |
| B5, 10 bps | 379,867.28355386585 | 26,709.96376249958 | 23,989.959017163914 | 82 | 154 | 72 | 37,791.7808219178 | 16,818.09354153287 |
| B4, 5 bps | 242,196.01122128402 | 28,659.335705492747 | 25,267.95000173262 | 71 | 137 | 66 | 37,068.49315068493 | 7,239.703878237275 |
| B1 (VGT D1), 5 bps | 135,359.0411970347 | 19,534.41364010408 | 15,817.01380744687 | 17 | 17 | 0 | 27,635.616438356163 | 1,781.53852286657 |

B5 portfolio mode (5 bps, frozen dividends, same window): end equity $2,270,264.325530123, daily peak-to-trough
29.667815%. The B5 minute-DD episode (2020-02-21 → 2020-03-12, peak/trough Unix 1582134540/1584022980) is the same
in the training window and in the 2016–2026 `all` run (+$486,207.77 / $26,509.97 / 94 lots, not used here).

Window increments from Study 2's sealed parity record (`src/d1-signal-capital-complementarity/parity.ts`; 512 checks):
B5 2016→2021-12-31 $217,492.04; B5 2022-01-03→2023-12-29 increment +$170,997.21 (windowed minute DD $17,269);
2020-07-01→2021-12-31 increment +$46,506.24. These are the source of the brief's rounded context numbers. Study 4
reproduces its own B5 annual increments from the 2016–2023 run and checks the full-window figures above to the cent;
**nothing after 2023-12-29 is re-run to recreate any anchor**.

## 3. The data and the 61-symbol universe

- Canonical files `data/<SYMBOL>/data.csv` (headerless 1-minute OHLCV, raw prices, extended hours; regular session
  kept by the shared session builder). 69 symbol directories exist; partitions `training` 2016-01-01 → 2023-12-31.
- **Universe:** the audited 61 `eligible` symbols of `research/d1-ranked-preemption/results/audit/universe.json`
  (`26e71c4c…`; identical to the October 25 robust-pool audit): AGG DBC EDV EEM EFA EMB EWJ EWW EWY EWZ FXI GDX GLD HYG
  IAU IBB IEF IEMG IGV IJH IJR ILF INDA IWD IWF IWM IWN IYT KBE KIE KRE LQD MTUM QUAL RSP SHY SLV SMH SPLV TIP TLT USMV VGK
  VGT VIG VOOG VPU XBI XHB XLB XLE XLF XLI XLK XLP XLU XLV XLY XME XOP XRT. Excluded by the same audit: **GDXJ, OIH** (first
  bar 2016-05-02, "late"), **XLRE** (2 missing sessions in 2016). Study 4 keeps these exclusions (the shared-pool
  replay needs identical calendars) and checks calendar identity again in its own door. BTCUSDT (crypto calendar) is
  not an ETF and is not in the universe.
- **Splits inside 2016–2023** (forward-adjusted by the shared session selection): EWJ 2016-11-07 (×0.25), IJR
  2017-01-19 (×2), KIE 2017-11-30 (×3), IBB 2017-12-01 (×3), XOP 2020-03-30 (×0.25), IAU 2021-05-24 (×0.5), SMH
  2023-05-05 (×2) (OIH 2020 is excluded). Later splits in `splits.json` (VGT/VOOG 2026, XLE/XLU/XLY/XLB/XLK 2025, IGV/
  IYT/IJH 2024, IWF 2026) are metadata after the data cap; the Study 4 door passes only events effective on or before
  its cutoff, so no post-2023 corporate action enters any computation.
- **Distributions:** not modelled in the fixed slot for any book (frozen fixed-mode convention), so every fixed-slot
  comparison is price-only and matched. Portfolio overlay: see §7.

## 4. Prior evidence relevant to the Study 4 hypotheses

**Study 1 (wide D1 library, `research/d1-wide-library-chronological-selection/`).** Verdict "no demonstrated
improvement": 0 of 12 within-ETF verdicts improved, 6 worse; a wider library and validation-window selection did
not beat the narrow baseline (e.g. fold B −$78k vs −$159k ΣV, but A1 < A0 in fold A; A4 picks +$25k in selection,
−$5.5k later). Falling knives: fold B 63–87 dip episodes per arm, median first entry 13–21 sessions before the
trough; 8–17 nominees per arm breached $35k windowed DD. Lesson: retrospective parameter breadth does not transfer.

**Study 2 (all-61 complementarity, `research/d1-all61-signal-capital-complementarity/`).** Verdict "no demonstrated
economically useful complementarity". The common rule (VGT primary on all 61) produced 816 decisions, 66% in 21
market-wide families (broad selloffs); B5 holds the slot 51.8% of session-minutes 2017-06-15 → 2023-12-29 (68.2% in
2022–2023). B5's 59 idle-clean non-member signals lost **−$52,477 summed across separate standalone books** (not a
funded pool); only ILF was positive. 0 of 18 exact fold replays passed its complementarity test; XOP's +$48,198.60
against B4 was a reshuffle of funded trades (−$19,932 against B5, $88,442 minute DD). **Warning carried into Study 4:**
deep-dip D1 signals cluster in the same selloffs that B5 trades; "idle" signals at the *same depth* were not
profitable. Study 4 tests a different role (shallower, more frequent, lower priority), so this is evidence, not a veto.

**Ranked preemption (`research/d1-ranked-preemption/`).** Net-breakeven preemption by a frozen standalone ranking
(P1, threshold $0, two-stage test at the decision and at the sale fill, abort if the sale cannot precede the
replacement, auction-print abort, supersession by own exit, shadow books continue) lowered B5's 2016–2023 net from
$388,489 to $334,495 (R1) / $354,960 (R2); fold B validation $170,997 vs $121,764 / $107,540. Known limitation: the
replacement is assumed bought **in the same minute as the sale** (sub-minute latency). Study 4's priority is
structural (tier), not a standalone-return rank, and its default switch contract buys the replacement only at a
later trade than the sale (ENGINE_CONTRACT.md); the old contract is kept as a labelled legacy control (P2L).

**Prior shallow VGT phenotype `2-5a28fd24e1`.** Found only in `research/trailing-buy-variants/` (README.md:71,
STRATEGY_COMPARISON.md:284, phenotypes/bufferedLoss.md, results/shortlist.csv:13). It is **not a D1 vector**: it
belongs to `allIn-trailingBuy-bufferedLoss.ts` (the re-entry-restricted buffered-loss file, with material-loss 0.9%,
lower level 5.9% and reset 47.3% parameters that D1 does not have), ran on a legacy file without costs, X 11.4%, Y
0.1%, stop 7.3%, hold 10, L 166, buffer 2.6%. Reported: 2016-09-20 → 2025-10-13 $175,870 / minute DD $26,919 / 37
trades; development (to 2023-12-29, in-sample) $144,480 (README says $144,460 — a source conflict) / DD $22,742 / 32
trades. Shallow picks lost in every 2022 walk-forward of that study. **Study 4 uses it only as motivation**: it is
neither a seed nor a control, and its post-2023 figures are not used.

**Study 3 Stage 1c.** 5,114,598 standalone VGT momentum configurations; verdict "no demonstrated edge", no nominee.
Its large per-evaluation archives were git-ignored, so its `verify` on a fresh clone reports some development stages
broken although the compact results are committed. Study 4 is a D1 study; no Study 3 candidate is used.

**Prospective B4/B5 shadow.** Observation cutoff 2026-10-13; forward observations start 2026-10-14; count 0 at
freeze. Study 4 never writes under `research/prospective-b4-b5-shadow/`, never runs `pools forward`, and labels
nothing prospective.

## 5. Known leakage and incompatible comparisons (registered before results)

1. **Designer knowledge.** 2016–2023 has been inspected repeatedly: the designer knows the 2018 Q4, COVID-2020 and
   2022 declines, the 2021 trend and 2023 rebound, B5's annual contributions (2020: $165,888 realized by exit year;
   2022: $84,884; 2023: $86,060 in the ranked-preemption controls) and that net-breakeven ranked preemption and
   all-61 deep-dip complementarity failed. Every Study 4 fold result is **retrospective forward-selection
   evaluation**, not independent out-of-sample validation.
2. **B5 itself was chosen with 2016–2026 hindsight** (its books were selected on windows including 2024–2026). Every
   "Δ versus B5" is relative to a hindsight-selected incumbent; this biases against challengers in 2016–2023 only in
   the sense that B5 is a strong in-sample control.
3. **Dual use of 2020–2023.** Later folds' development windows contain earlier folds' evaluation years (walk-forward
   by construction).
4. **Accounting conventions that differ across studies:** the windowed-increment convention (liquidation mark with
   exit friction at both ends, ranked preemption) vs. marks without exit friction (the frozen engine's open-lot
   mark); the $52.29 difference between $170,997 and $170,945 for B5 2022–2023 (Study 1 vs ranked preemption) is the
   boundary lot's exit friction. Study 4 states its convention per table (PROTOCOL.md §8).
5. **Standalone vs pooled.** Study 2's −$52,477 is a sum over separate books; the ranked-preemption standalone ranks
   are $100k-book returns. Neither is a pooled result; Study 4 never sums standalone books.
6. **Portfolio-mode dividends** are only for VGT/VOOG; a non-VGT lot gets no distribution in portfolio mode, which
   favours nothing in fixed mode (none booked) but would bias an overlay comparison between VGT-heavy and other
   lots. See §7.
7. **B5 hindsight inherited by challengers.** B5's vectors were selected on windows that include 2024–2026. Study 4's
   4D-B neighbourhoods, 4D-C incumbent options, the deep floor ρ (min X₀/σ of B5's books) and the shallow cap (≤ 0.6 × B5's
   X) all derive from them, so 4D-B/4D-C challengers inherit post-2023 information and could not later receive a clean
   2024–2025 validation; moving away from a look-ahead optimum also biases their 2020–2023 Δ *against* them. 4D-B
   versus 4D-B0 (both inheriting the same information) is the clean contrast.
8. **Metadata already seen.** `config/market-events/splits.json` and `distributions.csv` list corporate actions after
   2023 (e.g. IGV/IYT/IJH 2024 splits, VGT/VOOG 2026); they have been read as metadata in earlier work and in this audit.
   They contain no prices; the Study 4 door applies only events effective on or before its end.
9. **Design-informing knowledge.** Before writing the protocol the designer had seen the full-history (2016–2023) σ table
   of the U61 symbols (`research/d1-standalone-etf-opportunity-audit/OPPORTUNITY_EVENT_CATALOG.md`, cited by the
   pre-freeze review) and Study 2's map of B5's idle stretches; the role-band multipliers were set with that knowledge.
10. **Whole-file hashes forbidden.** The prospective-freeze verifier and the shared loader hash whole data files (bytes
    after 2023); Study 4 runs neither and hashes only the prefix its door reads.

## 6. Role definitions stated before results (detailed in PROTOCOL.md §5)

- **Deep (high-priority) tier:** the five B5 books in all frozen-B5 experiments; in 4D-B/4D-C challengers, D1 books
  with X at least 0.70 × the symbol's development-window annualized volatility (and, for reoptimized B5 books, within
  a controlled neighbourhood of the incumbent).
- **Shallow (low-priority) tier:** D1 books with X between max(3.0%, 0.15 σ) and 0.55 σ (σ = development-window
  annualized daily volatility of the symbol) and, on a B5 symbol, X ≤ 0.6 × the B5 book's X. The gap between 0.55 σ
  and 0.70 σ separates the roles. A symbol whose band is empty (low-volatility bond ETFs: 0.55 σ < 3.0%, the engine
  grid's minimum dip) has no shallow book; this is reported per symbol, not silently dropped.

## 7. Feasibility conflicts

- **Overlay.** The frozen portfolio engine supports P0 pools keyed by symbol with VGT/VOOG distributions. It cannot
  represent Study 4's mirrored replacement lots, tier priorities or two books on one symbol. Study 4 will run the
  overlay only where an implementation reproduces the frozen B5 portfolio anchor exactly on 2016–2023; otherwise the
  overlay is reported as not run (PROTOCOL.md §11).
- **Margin calls / maintenance.** The fixed slot has no maintenance model; the frozen portfolio engine has margin
  tests. No liquidation-by-margin-call model is invented.
- **2024–2026.** Not loaded, previewed, hashed as an input or evaluated for any Study 4 purpose. The Study 4 door reads
  files from the first byte and stops at the first line whose UTC date is ≥ cutoff + 2 days, unparsed; the prefix it
  read is hashed, never the whole file.
- **`npm test`.** Inherited suites read whole data files (incident in Study 3 Stage 1c); the full suite runs only in a
  data-less worktree.

## 8. Explicit source conflicts found

| # | Conflict | Resolution |
|---|---|---|
| C1 | Brief: "11.4% shallow VGT phenotype 2-5a28fd24e1" implied a D1 vector | It is a bufferedLoss-file vector with restriction parameters, not D1; motivation only |
| C2 | `trailing-buy-variants/README.md:71` $144,460 / $31,410 vs three other sources $144,480 / $31,390 | Not used numerically |
| C3 | B5 2022–2023: $170,997.21 (ranked preemption / Study 2) vs $170,945 (Study 1) | Exit-friction convention at the boundary; Study 4 states its own convention |
| C4 | Brief §1.7: ranked-preemption contract "reuse" vs brief §3: "no assumed atomic simultaneous fill" | The old same-minute replacement is kept only as legacy control P2L; Study 4's default switch buys after the sale fill |
| C5 | B5 config `firstEligibleDate` is asserted, not used, by `runPoolOn`; arming comes from `protocol.eligibilityDate` 2017-06-15 | Identical value; Study 4 uses 2017-06-15 for every book |
| C6 | Brief context "B5 2016–2026 +$486,207.77" | Not reproduced (post-2023); the matching 2016–2023 anchor ($388,489.26) is used |
