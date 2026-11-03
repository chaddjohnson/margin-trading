# Protocol: multi-ETF D1 allocator (VGT, XBI, XRT, KRE), fixed $100k pool and compounded 20% portfolio, Vanguard margin-call risk

Written 2026-10-23, **before any allocator, multi-ETF or margin-stress result existed**. Only the single-symbol
regression controls of §11 (reproductions of figures already published by earlier programs) may run before this
file is frozen. The freeze record (`results/protocol_freeze.json`: this file's SHA-256, the UTC time, git HEAD and the
input hashes) is written by `npm run multi-etf-allocator -- freeze-protocol` before the first `fixed`, `portfolio`
or `stress` command; those commands refuse to run without it and report a protocol-hash mismatch if this file was
edited afterwards without an entry in §14. Every later change is appended to §14 with its reason.

## 1. Status of the evidence

- VGT D1 and the six XBI/XRT/KRE phenotypes were designed with extensive viewing of 2016–2025 data. The eight-ETF
  2024-01-02 → 2025-10-16 holdout was **opened and inspected on 2026-10-23** by the multi-ETF D1 program. Every
  result of this program through October 2025 is therefore an **exploratory, inspected-history comparison**. No
  allocator rule, phenotype combination or risk assumption below is chosen from these results, and no winner is
  selected after seeing them: all eight combinations and all predeclared policies are reported.
- Fresh data: no minute bar after 2025-10-16 exists in the repository (§2). Daily files that extend into 2026
  (`data/VGT/VGT-2026.csv`, `data/VGT/VGT-2016-2026.csv`, `data/VOOG/VOOG-2016-2026.csv`) are audited for
  existence and coverage only; D1 needs minute bars, so no strategy is evaluated on them. `FORWARD_TEST_FREEZE.json`
  records what a genuine forward test must hold fixed.
- No BTCUSDT, no swing-low, no P2s, no live orders, no credentials, no automatic git commit.

## 2. Frozen inputs

| Input | SHA-256 | Use |
|---|---|---|
| `src/app/allIn-trailingBuy-postExitContinuation.ts` (D1) | `a520cfcfd52782498da861c33d01d17b36865a83be945278629b83d9302a63ef` | the strategy definition; never edited |
| `research/multi-etf-d1/FROZEN_CANDIDATES.json` | file `94b0b646…`, manifest body hash `d3645e1e8b8dafbdbf5ca6b7ef3b78745a3389b7730b19f68df0647377f4ca7e` | the frozen XBI/XRT/KRE vectors (read only) |
| `config/phenotypes/D1/VGT.json` | `3e77a419943b6a066c5467494947dfd4e1212a436ea79f6777c99764ca6c5f70` | VGT `primary` |
| `config/phenotypes/D1/XBI.json` | `453c4fd00d9de91269da718011c78b3d20d4611a0791005285345cbdac12aff8` | XBI `primary`, `lowDd` |
| `config/phenotypes/D1/XRT.json` | `d7b7f222bb8921ec5a3781d3b98c32f3045eb775cb5e01ee5e6af05af4e7cee9` | XRT `primary`, `lowDd` |
| `config/phenotypes/D1/KRE.json` | `6b8889e20ab3c07e85f12e5c344166588495e95bc1f5573b36699e8a587a8c8d` | KRE `primary`, `lowDd` |
| `data/VGT/VGT-2016-2025-1-minute.csv` | `600322afbe3d837a4c66ec62acb39e16d707079f49ec18d77f947bcb24c7962f` | VGT signals, fills, marks; ends 2025-10-13 |
| `data/XBI/XBI-2016-2025-1-minute.csv` | `ad5521e33b53fa1590c07de5a4f5f6ca6738b06aae8bcb6224606901a5a56f7b` | ends 2025-10-16 |
| `data/XRT/XRT-2016-2025-1-minute.csv` | `c7c591557cc58576eb16da29ef5278643da0b0c23c183fe24cfb1c8f4bf79dc8` | ends 2025-10-16 |
| `data/KRE/KRE-2016-2025-1-minute.csv` | `5f8b2a284a862fdc15c1ba82649fbb749ce3dbbd66046c0f4c4c0f3f4c9e7e0b` | ends 2025-10-16 |
| `data/VOOG/VOOG-2016-2025-1-minute.csv` | `f4ad4d72f39b157fce64e023f644c4648db840be39ce6979ff42a5818d278cc2` | core VOOG marks and fills; ends 2025-10-13 |
| `research/risk-management/vgt-portfolio-margin/data/distributions.csv` | `30adf087e7f54927928c12a9d23e198d19336a7e6257df2e9be7e3fc70dba923` | VGT/VOOG distributions of the earlier studies |

The phenotype bridge (`src/multi-etf-allocator/phenotypes.ts`) reads the JSON files through the existing validated
loader (`src/phenotype/phenotypes.ts`), checks every vector against the manifest nomination of the same role
(`primary` ↔ `primary`, `lowDd` ↔ `alternate-lowDd`; VGT against D1's shipped constants), verifies the manifest body
hash, and refuses to run on any difference. The phenotype injection mechanism and the D1 file are not modified.

**Horizon.** All multi-symbol and portfolio runs: 2016-01-04 → **2025-10-13**, the latest session common to VOOG,
VGT, XBI, XRT and KRE (VGT and VOOG end there). The three sector standalone controls are also run to 2025-10-16 to
reproduce their published figures. No price is filled for a missing day. **Eligibility**: no setup arms before
**2017-06-15** (session index 365 on every file) for any symbol; state is continuous through 2023/2024.

**Price basis.** Raw Alpaca SIP one-minute prices everywhere (signals, fills, marks, sizing). VGT/VOOG distributions
enter the portfolio ledger as cash flows from the ledger above (the earlier studies' convention). The repository
holds no documented XBI/XRT/KRE distribution history (third-party aggregators were found online but are partial and
not primary documents), so **funded XBI/XRT/KRE lots are price-only (non-total-return)**: an ex-date drop is a price
move and no cash is credited. Sensitivities (§10): lots of every symbol price-only (symmetric), and an analytic
yield bound for sector lots. The fixed pool is price-only for every symbol, as the D1 research.

## 3. The signal layer: one independent shadow D1 book per symbol

- Each symbol runs its own D1 machine on its own minute bars (`EntryMachine` and `ExitManager` of
  `src/shared-margin-portfolio/strategy.ts`, verified against the D1 file and the D1-refinement engine; this program
  re-verifies them for all seven phenotypes, §11). A book holds FLAT / ARMED / PENDING_FILL / LONG state, the stop,
  the continuation window and a **virtual** position of a fixed $100,000 notional at the scenario's decision rate.
- D1's decisions do not depend on position size (every profit test scales with the investment), so the virtual
  book's trades are exactly the symbol's standalone trades. Under the primary **shadow semantics** a book always
  takes its own signals; the allocator only decides which virtual trades are *funded*. A funded lot enters at the
  virtual fill and exits at the virtual exit (same session, minute, price and reason). Virtual positions never pay
  interest, receive dividends or move the real ledger.
- The book's net-profit tests (stop activation, buffered loss, continuation) use its own virtual economics: the
  scenario's per-side cost on fills, the scenario's stop slippage, and simple interest at the scenario's decision rate
  (11%/365 primary). A forced liquidation of a funded lot never changes the book; the virtual position runs on.

### 3.1 Event clock and order

Sessions are the common New York calendar (identical dates in every file through 2025-10-13; asserted). Within a
session the global timeline is the union of every file's minute-bar start times. At each time T, in this order:

1. forced sales due at T (stress runs only);
2. core VOOG orders filling at T;
3. virtual exits at T (books in the order VGT, XBI, XRT, KRE), each closing its funded lot if any;
4. core VGT orders filling at T;
5. virtual entry fills at T, each opening its funded lot if a reservation exists;
6. every book processes its bar starting at T; a rebound confirmed on that bar is a decision stamped **T + 60 s**
   (the minute's end) and goes to the allocator immediately, before any event stamped at a later time;
7. minute-sampled marks and margin measures after all events at T, at every T at which a held security (core
   VOOG, core VGT or a funded lot's ETF) has a bar, each security at the close of its latest bar starting at or
   before T (forward-filled, never interpolated; the earlier engine's convention). In the fixed pool a lot's mark
   changes only on its own symbol's bars.

For a single VGT book this is exactly the event order of the earlier portfolio engine
(`src/shared-margin-portfolio/engine.ts` §5.3), which is what makes the reproduction of §11.2 exact.

At the scheduled close: VOOG orders at the close, closing-print exits, VGT orders at the close, closing-print
entries, pay-date dividends, the daily updates of stops/highs/continuation windows, the daily marks and the
maintenance checks. Ex-date entitlements and forced sales ordered at the previous close happen before the first bar.

- **Capital release**: an exit at time t (a minute's opening trade, a stop level inside the minute, or the
  closing print at the close) frees its capital for decisions stamped strictly after t, so a decision at the end of
  the minute in which a stop filled sees the freed pool, and a decision at the close never uses the closing print's
  proceeds.
- **Reservation**: a granted decision reserves its principal from the decision time until its fill (the next trade
  of its own symbol at or after the decision, the closing print only for a decision before the close, else the next
  session's opening trade). Reserved capital counts as used for every later decision. A reservation still pending at
  the end of the data is reported; nothing fills it.
- **Asynchronous bars**: a symbol without a bar at T simply has no event at T; its last completed minute is its
  mark (stale-mark age reported). Bars are never treated as synchronous across files and no fill is invented.
- **Gaps / disappearing quotes**: fills and exits use only observed trades (D1's own rules: a stop gapped through
  fills at the opening trade, never at the crossed level).

## 4. Allocator policies (predeclared; no ranking function, no fitted weights)

| Key | Name | Pool | Refused-signal semantics | Same-minute tie (decisions stamped at the same minute end) |
|---|---|---|---|---|
| `shadow` | **Shadow / first executable signal wins (primary)** | one full allocation | shadow | alphabetical ticker order (KRE, VGT, XBI, XRT): a neutral, arbitrary, deterministic rule fixed here |
| `priority` | Fixed symbol priority (sensitivity) | one full allocation | shadow | VGT, XBI, XRT, KRE |
| `split` | Dedicated split (sensitivity) | two slots of 50% of the aggregate budget | shadow | alphabetical |
| `cancel` | Refused-signal control | one full allocation | a refused setup is cancelled; the book is FLAT and re-arms on its normal conditions | alphabetical |
| `hold` | Diagnostic only | one full allocation | a refused setup stays ARMED and re-tests later minutes (can fill late and far from the original price) | alphabetical |

- In every policy the earliest decision wins; the tie rule only orders decisions stamped at the same minute. A lot
  is never liquidated because another symbol signals (no displacement, no takeover). While the pool is occupied all
  other books continue virtually; a refused signal never fills later unless its book produces a new signal.
- `split`: at most two funded lots (necessarily of two symbols). Fixed mode: $50,000 per lot. Dynamic mode: a lot's
  principal is `min(0.5 × f × E_d, f × E_d − P_out)`, where `E_d` is equity at its decision, `f` the borrowed
  fraction and `P_out` the outstanding principal of the other open or reserved lot; refused if that is ≤ 0. Total
  borrowing at any entry therefore never exceeds `f × E_d` measured at that entry; a later fall in equity does not
  resize an open lot.
- Every decision is logged with its outcome (granted / refused and why), the occupying lot, and — for refusals — the
  hypothetical counterfactual (the virtual trade's entry, exit, net per $100,000 and at the would-be principal),
  marked **hypothetical**.

## 5. Configurations

VGT `primary` is fixed. XBI, XRT and KRE each take `primary` or `lowDd`: **2 × 2 × 2 = 8 combinations**, keyed
`xbiP-xrtP-kreP` … `xbiL-xrtL-kreL`. One phenotype per symbol per run; signals of two phenotypes of one symbol are
never mixed. **Main comparison: `all-primary` (`xbiP-xrtP-kreP`). Low-DD sensitivity: `all-lowDd`
(`xbiL-xrtL-kreL`).** The other six are reported in full with no winner selected. Every combination runs every
policy of §4 in both modes with identical constraints. VGT-only controls: fixed VGT D1 alone, portfolio B.

## 6. Mode A — fixed $100,000 standalone pool (a trading-strategy research ledger)

- $100,000 total borrowed principal for a full-pool policy (one lot at a time); $50,000 + $50,000 for `split`.
  Every lot buys `principal / fill price` shares (fractional) of its symbol. 11% simple annual interest per
  calendar day from the entry session date (none on the entry day), the D1 convention. No VOOG/VGT core, no
  compounding: realized P&L accumulates from $0 and never increases a later principal.
- Marks: realized plus open lots marked at their own symbol's minute closes (each lot's mark changes only on its own
  symbol's bars, with interest through the session date) and at the official close; minute-sampled and daily
  drawdowns in dollars and as a share of $100,000.
- Controls: VGT D1 alone must give **$183,043.82 / $19,330.69 minute DD / 20 entries**. Sector standalone figures are
  secondary references and are never summed as if simultaneously executable.
- This mode makes **no margin or collateral claim**: there is no posted equity behind its loan.

## 7. Mode B — dynamic 20%-of-equity compounded portfolio

- Start at the 2016-01-04 close: $180,000 VOOG (last regular trade 101.89; VOOG has no closing print that day) +
  $120,000 VGT (closing print 106.61), no cash, no debt. Fractional shares.
- `equity(t) = Σ market value (core VOOG, core VGT, funded lots) + cash + receivables − principal − accrued interest
  − funding payable`, each security at its last completed minute's close at or before t (else the previous close);
  the age of each stale mark is recorded at decisions and at the closest approaches.
- **Sizing** (full pool): principal = **0.20 × equity at the decision minute** (the deciding symbol at its decision
  close), subject to one shared pool (no other open or reserved lot), Reg T initial margin (debt after the purchase ≤
  50% of LMV), the house maintenance requirement at entry (post-purchase maintenance excess ≥ 0 under the scenario's
  requirement schedule) and the $2,000 minimum equity. Principal is fixed until repayment. Borrowing does not change
  equity.
- **Exit**: sell the lot at the virtual exit fill; repay principal and interest; **net > 0** buys VOOG 60% / VGT 40% at
  the earliest causally executable trades after the exit (VGT: its first trade after the end of the exit minute, the
  closing print only for an exit before the close, else the next open; VOOG: its own first trade at or after the
  same time); **net < 0** is funded by selling core VOOG and VGT in proportion to their market values at the same
  trades (VGT marked at its latest observed trade at the exit, the exit fill itself for a VGT lot). Cash waits for
  the trade. Principal is never reinvested; unrealized profit is never reinvested; core is never rebalanced
  (full-rebalance sensitivity in §10).
- **Dividends** (VGT/VOOG ledger): shares held at the previous close (core and VGT lots) are entitled on the ex-date;
  a receivable is paid on the pay date and buys the same ETF's core at that close (no cost). Each lot's entitlement
  is reported; no double counting. XBI/XRT/KRE lots: price-only (§2).
- **Interest (primary)**: 11% simple, per calendar day, per lot, paid at exit — parity with the VGT studies.
- **Scenarios**: A (60/40 buy and hold), B (VGT D1 alone at 20%), C (each combination × each policy). Same core,
  dates, marks, dividends, costs and assumptions within each comparison.
- Incremental value versus B is reported at matched utilization: B and `all-primary/shadow` are each run at 10, 15,
  20 and 25% of equity (risk-only, §10), and C at 20% is compared with B interpolated to C's borrowing-dollar-days
  and to C's maximum daily drawdown.

## 8. Margin model (Mode B only)

### 8.1 Sources and their status (accessed 2026-10-23)

| Fact | Source | Status |
|---|---|---|
| House maintenance 35% for most marginable securities; 50% or higher for concentrated positions; may vary by security | Vanguard Brokerage margin risk disclosure, https://investor.vanguard.com/client-benefits/margin-disclosure-statement | published, general; **not** an account-specific guarantee |
| House requirements can change at any time and take effect immediately, without prior notice; Vanguard can sell without contacting the client and chooses what to sell; no automatic extension | same; FINRA Rule 2264 margin disclosure, https://www.finra.org/rules-guidance/rulebooks/finra-rules/2264 | published |
| House call issued the morning after the deficiency (Day 1), to be met by Day 4; Reg T call trade date + 3 business days; exchange (25%) call within 2 days; client cannot choose what is sold | https://investor.vanguard.com/investor-resources-education/online-trading/margin-calls | published; **no guaranteed grace period** |
| Reg T initial 50% of purchase cost (100% under $5) | same page; FINRA Rule 4210(b) | regulation |
| FINRA maintenance minimum 25% of long market value; members set higher house requirements; $2,000 minimum equity | FINRA Rule 4210(c)(1), (d), (b)(4), https://www.finra.org/rules-guidance/rulebooks/finra-rules/4210 | regulation (legal context only, not simulated) |
| Margin interest: tiered, variable; base rate 9.75%; Standard tier by loan balance 12.25% (< $20k) … 10.25% ($250k–$499,999); Preferred 7.00% / Premier 6.00% by qualifying assets; accrues daily, compounds monthly | https://investor.vanguard.com/client-benefits/margin (schedule dated 2026-09-29) | today's schedule, **not** a historical schedule |
| Interest = average daily debit × rate × days ÷ **360**; period starts two business days before each month; unpaid interest added to the next period's opening debit | margin disclosure statement | published |
| **Newly purchased Vanguard ETF shares are not marginable for the first 30 calendar days; Vanguard ETF purchases settle in the cash account and are journaled to the margin account after 30 days** | margin overview page and disclosure statement | published; directly affects VGT lots and VOOG/VGT reinvestment (§8.6) |

### 8.2 Initial versus maintenance

Initial checks at each funded entry only: Reg T 50% (debt + principal ≤ 50% of LMV + principal), the house
maintenance requirement after the purchase (excess ≥ 0), and $2,000 minimum equity. For every entry the program
also reports the largest principal each requirement schedule of §8.3 would have allowed at that decision, the
amount a stricter requirement would have disallowed, and buying-power utilization. Maintenance is evaluated after
the purchase at every minute mark and every close.

### 8.3 Maintenance requirement schedules

One collateralized margin account; every core and trading holding is long collateral; cash and receivables carry no
requirement; there are no short positions. Primary model, a **proxy** of Vanguard's proprietary calculation:

```
equity(t)               = cash + receivables + Σ_i MV_i(t) − principal − accrued interest − funding payable
maintenance_required(t) = Σ_i r_i(t) × MV_i(t)        (i = VOOG, VGT (core + any VGT lot), XBI, XRT, KRE)
maintenance_excess(t)   = equity(t) − maintenance_required(t)
```

A requirement applies per **security**, so a VGT lot and core VGT share VGT's requirement. Seven schedules are
evaluated passively (no liquidation) on every run, at every minute mark and close:

| Key | Requirement | Meaning |
|---|---|---|
| `U35` | 35% on every holding | Vanguard's published general house requirement; equals the whole-account test equity ≥ 35% × LMV |
| `U50` | 50% on every holding | the published concentrated-position example applied account-wide |
| `U60` | 60% on every holding | **hypothetical research ceiling** set by the user; not a documented Vanguard maximum |
| `L50`, `L60` | 50% / 60% on the funded ETF's security, 35% elsewhere | single-security increase on the traded ETF |
| `G50`, `G60` | 50% / 60% on the sector-fund group (VGT core and lots, XBI, XRT, KRE), 35% on VOOG | concentrated / correlated group proxy: VGT is a single-sector fund held at 40% of the core and its lots add to it; VOOG is a broad growth index fund |

No requirement above 60% is simulated anywhere. The uniform schedules are also the earlier study's whole-account
`equity / LMV` test. VOOG/VGT holdings overlap (technology), but no constituent look-through data is in the
repository: concentration is reported as symbol and group shares of LMV (approximate proxies), with descriptive flags
at 20/30/50% of LMV, and the group schedules act as the conservative concentration add-on. The 25% FINRA floor is
legal context only.

### 8.4 Distance to a call (reported, not simulated scenarios)

At every funded entry, every close, every minute mark and immediately after any simulated requirement change:
equity, LMV, debt, debit/equity, LMV/equity, per-security requirement and MV, concentration shares, dollar excess,
`equity / required`, and:

- **homogeneous break-even requirement** `m* = equity / LMV` (the uniform requirement at which excess is 0);
- **funded-ETF break-even requirement** `r* = (equity − Σ_{others} 0.35 × MV) / MV_lot` (> 100% means no requirement on
  that security alone can cause a call);
- **uniform correlated shock to a call** under schedule S: `g* = excess / (LMV − required)`;
- **two-factor shock to a call**: the traded ETF (and same-security core) falls g, every other holding falls ρg,
  requirement schedule S: `g*(ρ, S) = excess / ((1 − r_lot) MV_lot + ρ Σ_{others} (1 − r_i) MV_i)`, for ρ ∈ {0, 0.5, 1};
- dollar fall in account value to a call (`excess / (1 − r̄)` for a uniform fall).

**Closest approaches**: one entry per session (its lowest minute-sampled `equity / required`), ranked, top 20 per
schedule per scenario, with the timestamp, holdings, lots, debt, requirement, excess and the break-even figures.
"Distance" is always the modelled excess under an assumed rule, never a claim of broker safety.

**Warning levels** (configurable, `config/allocator/multi-etf-allocator.json`): `equity / required < 1.25`
(warning) and `< 1.10` (critical) under each schedule; time spent below each is reported.

### 8.5 Active calls and forced liquidation (stress runs only)

A run may carry a **requirement path** (a schedule that changes at a timestamp) and a liquidation model:

- **Monitoring**: `intraday` (every minute mark; a deficiency on the bar starting at T is known at T + 60 s) or
  `close` (session close only, Vanguard's house-call practice).
- **Timing**: `immediate` (no warning: the sale fills at each security's first trade at or after the detection time),
  `next-open` (the next session's opening trades), `deadline` (the open of the fourth session after the close that
  showed the deficiency, if the deficiency is still present at the close before; **not a guaranteed grace period**),
  `halt` (the traded ETF has no executable trade until the next session's open; nothing else is sold meanwhile).
- **What is sold**: `lot-first` (funded lots, largest market value first, sold entirely; then core proportionally) or
  `core-first` (core VOOG/VGT sold proportionally; proceeds repay the lots' principal; the lot is sold only if the
  core is exhausted) — the broker chooses, the client cannot.
- **Amount**: enough to restore `excess ≥ 5% × LMV` after the sale (for a uniform requirement m this is the earlier
  study's `equity / LMV ≥ m + 5 points`), at the sale fills with the scenario's per-side cost plus a forced-sale
  slippage (0 bps primary, 50 bps sensitivity).
- A forcibly sold lot's cash flows follow §7 (repay, then reinvest or fund). The book continues virtually; the pool
  is free for the next new decision. Everything after the sale — sizes, refusals, later lots — is recomputed.

### 8.6 Broker-eligibility risks disclosed, not simulated

- Loss of marginability of a security (equivalent to a 100% requirement) is **not** simulated (cap 60%); its
  consequence is described qualitatively.
- Vanguard's 30-day rule for newly purchased Vanguard ETF shares (VGT, VOOG): as published, a VGT lot purchase and the
  VOOG/VGT reinvestment purchases would settle in the cash account and carry no loan value for 30 days. A VGT lot
  could then not be bought on margin as modelled. The program counts the affected purchases and their dollars
  (VGT lots, core reinvestments within 30 days) and states the consequence; it does not simulate it.

## 9. Stress program

All predeclared; nothing is tuned; 20% stays the primary fraction. Scenarios: B, and C under `all-primary` and
`all-lowDd` for `shadow`, `priority` and `split` (the "stress set"), unless a row says otherwise.

1. **Static entry shocks** (balance-sheet, labelled static): for every funded lot, at the next session's open after
   the entry, the traded ETF gaps −5/−10/−20/−30/−40%, every other holding falls by ρ × that with ρ ∈ {0, 0.5, 1};
   equity, requirement and excess under U35/U50/U60/L60/G60; the lot's exit replayed on the shifted path (D1's own
   rules; a gap through an active stop fills at the gapped open; an inactive stop leaves the loss exits).
2. **Requirement-change timing** at each funded lot: 60% (L60, G60, U60) applied (a) at the decision minute (would the
   entry be refused or cut; P_max), (b) immediately after the fill, (c) at the lot's worst minute mark, (d) at the
   next open together with the gaps of item 1.
3. **Full-path replays** (every price of every symbol and VOOG multiplied from the open of τ onwards; all later
   signals, exits, refusals, sizes, reinvestment and forced sales recomputed): τ ∈ {2018-12-24, 2020-03-16,
   2020-03-23, 2022-06-16, 2023-03-13, 2025-04-07} plus, by rule, the session after the closest approach under U60 in
   B and in `all-primary/shadow`. Traded ETFs fall g ∈ {20, 40}%, VOOG ρg with ρ ∈ {0.5, 1}; at τ the requirement
   jumps from U35 to L60, G60 or U60 (intraday monitoring, immediate lot-first liquidation). Any path that breaches is
   re-run under `next-open`, `deadline`, `halt` and `core-first`, and with 50 bps forced-sale slippage.
4. **Execution**: 0/2/5/10/25 bps per side on every fill; `next-open` stop fills; +50 bps adverse slippage on stop
   fills. Both modes (fixed VGT-only and all-primary/shadow; portfolio B and all-primary/shadow).
5. **Rates**: 8/11/14% simple (book and ledger); Vanguard today's Standard tier schedule by loan balance on an
   actual/360 daily accrual with monthly capitalization (book at 11%, and book at the 10.75%/360 tier-equivalent);
   Vanguard Preferred tier (7.00%) while equity ≥ $1M as a qualifying-asset proxy. Trade-list differences of the books
   at 8/14% are reported (D1's net-profit stop depends on interest).
6. **Borrowed fraction** 10/15/20/25% (risk-only) for B and all-primary/shadow (and all-lowDd/shadow).
7. **Dividends**: all lots price-only (symmetric); sector-lot yield bound y × principal × days held / 365 for y ∈
   {1, 2, 3}% (analytic, labelled).
8. **Core**: full 60/40 rebalance after each exit (B and all-primary/shadow).

## 10. Reports and exports

Per run: `trades.csv`, `signals.csv`, `refusals.csv`, `daily.csv`, `account_ledger.csv`, `margin_requirements.csv`
(daily, per schedule), `maintenance_events.csv`, `forced_liquidations.csv`, annual and monthly series, `summary.json`;
combined `scenario_summary.csv`; minute-sampled series and the sensitivity ledgers are git-ignored and regenerable.
Every number in a report is generated by a command and traceable to a file under `results/`.

## 11. Acceptance gates (must pass before any comparison is reported)

1. Seven fixed-$100k phenotypes through the shadow book + fixed ledger: trade-by-trade identical (sessions, minutes,
   prices, reasons, interest, profit) to `research/vgt-d1-refinement/results/baseline/baseline.json` (VGT D1, to
   2025-10-13) and `research/multi-etf-d1/results/holdout/<T>/<role>/` (to 2025-10-16), and the nets / minute and daily
   drawdowns to floating-point noise: VGT $183,043.82 / $19,330.69 / 20; XBI primary $206,045.81 / $27,885.29; XRT
   primary $165,729.49 / $23,383.16; KRE primary $195,047.71 / $26,271.47; KRE lowDd $174,147.76 / $22,724.74; XBI lowDd
   $118,055.36 / $12,836.60 / 29; XRT lowDd $148,435.71 / $19,965.68 / 19 (full-horizon figures of the research
   artifacts; for XRT lowDd the full and development minute drawdowns coincide).
2. Portfolio A and B under the old conventions: equal to the old engine (`src/shared-margin-portfolio`, run in the same
   process) at every daily close and every trade, and to the published $1,784,588 / 33.9% and $2,346,272 / 25.3%.
3. Ledger invariant `assets − liabilities = equity` within $0.01 after every event; no negative inventory or cash;
   no borrowed principal credited to P&L; no duplicate dividend; no compounding in fixed mode; the pool cap holds at
   every reservation and fill. An independent recomputation from the exported events must agree.
4. Identical decision state in both modes for the same execution assumptions (same virtual trades).

## 12. Decision rules for the final assessment (fixed before results)

- Fixed pool: the allocator "improves" on VGT D1 only if `all-primary/shadow` raises net **and** net / minute DD
  versus VGT D1 alone; all eight combinations are shown; consistency across combinations is reported, not optimized.
- Portfolio: "improves" only if `all-primary/shadow` beats B in end equity **and** at matched borrowing-dollar-days and
  matched daily drawdown (§7).
- 20% sizing: **do not deploy** if any historical breach occurs under U35 or U50; **lower** if the closest historical
  approach leaves a uniform correlated shock to a U60 call below 30%, or if any predeclared full-path stress (§9.3)
  breaches; otherwise **keep, conditional** on the Vanguard confirmations of the margin report. Independently, if the
  30-day Vanguard-ETF rule applies as published, VGT lots cannot be funded on margin as modelled at Vanguard and the
  VGT component is reported as not deployable there as specified.

## 13. Out of scope

Optimizing any D1 parameter, a signal-ranking or weighting function, a new borrowed fraction, swing-low/P2s,
takeover/displacement, BTCUSDT, live orders, taxes (reported as a caveat), and any requirement above 60%.

## 14. Chronology and change log

- 2026-10-23: protocol written after repository reconnaissance and before any allocator, multi-ETF or margin result.
- 2026-10-23, after the freeze: §3.1 item 7 was clarified before the freeze record was written (minute marks at
  every T at which a held security has a bar); it describes the engine that reproduced B and changed nothing.
- **A1 (2026-10-23, post hoc, after §9.1–§9.3 had run)**: none of the 672 predeclared full-path replays and none of
  the 8,070 static entry-shock rows produced a call, so the breach re-runs of §9.3 had nothing to act on. To show what
  a call does to the real ledger, a small beyond-grid illustration was added (`npm run multi-etf-allocator --
  illustration`, `results/stress/illustration_a1*.csv`): for B and all-primary/shadow, at the session after the
  closest U60 approach (the §9.3 rule date), every holding gaps 50% or 60% at the open (ρ = 1) with the requirement left
  at 35% or raised to 50% or 60%, intraday immediate lot-first liquidation, and every breaching path replayed under the
  other broker models. **It is not a predeclared stress, enters no decision rule of §12, and says nothing about the
  likelihood of such a gap** (the largest overnight gap in any file is −14.0%).
- Reporting-only changes after the first results (no rule, run or number changed): Reg T buying power and borrowed
  principal added to `margin_requirements.csv`; duplicate closest points removed from the break-even grid; a labelled
  linear extrapolation of B's borrowing ladder for allocator points beyond it, and a note that matching on drawdown is
  uninformative when the drawdown is the core's; corrected percentage labels; a column note on split lots in the
  overlap table.
