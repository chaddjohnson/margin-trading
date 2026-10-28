# Signal generation and engine parity

**Every Study 2 figure comes from the frozen N-book engine** (`src/portfolio-aware-d1/nbook/engine.ts`
`runNAllocator`, bound by the prospective B4/B5 freeze and imported read-only), configured exactly as `npm run pools`
configures a pool run (one shared $100,000 slot or the 20% portfolio; 11% simple interest on a 365-day year; the
per-side cost on every fill; stops at the stop, gaps at the opening trade; books arming 2017-06-15; accounting from the
2016-01-04 close; the frozen dividend convention in portfolio mode). Nothing in the engine, the books or the allocator
was changed. Records: `results/parity/PARITY.json` (sealed), `results/code_freeze.json`, the stage records.

## 1. Provenance and data

- Canonical split-adjusted minute files `data/<SYMBOL>/data.csv` (Alpaca SIP, regular session), each hashed against
  the audited universe on every load; training partition, access `optimization` (the loader refuses holdout, final and
  `all` before reading); explicit data ends 2020-06-30, 2021-12-31 or 2023-12-29 and nothing later; one calendar shared
  by all 61 (2,710 sessions in the canonical files, 2,012 through 2023-12-29). Missing minutes are never imputed: a
  decision fills at the next existing trade of its own symbol (test `a fill waits for the next existing minute`).
- Splits inside the training era (EWJ, IJR, KIE, IBB, XOP 1:4 reverse, IAU, SMH) are forward-adjusted by the shared
  loader; no overnight move beyond ±40% exists in any of the 61 adjusted series through 2023-12-29 (parity check), so
  XOP's reverse split produces no fake +287% gain.
- Thin symbols (F7: DBC EDV ILF IYT KIE VOOG VPU) are run like every other and flagged in every table.

## 2. The signal instrument (concepts 1–9 of the brief)

| Concept | Where it comes from |
|---|---|
| 1 price dip episode (ex post) | the standalone audit's catalog `catalogOf` (zigzag 10% on daily closes), per ETF and data end |
| 2 armed trailing-buy state | the observer's setup log: arming minute (decision-time convention: minute end), kind (deep / continuation), reference high; armed until its signal or the data end |
| 3 triggered decision | the confirming completed minute; decision time = its end (bar start + 60 s) |
| 4 eligible next fill | the first trade of the symbol at or after the decision (the closing print if the decision is before the close; otherwise the next session's first trade) |
| 5 virtual lot | the frozen `ShadowBook`'s trade (shadow semantics: a book takes every signal it produces) |
| 6 funded lot | the engine's pool lot (B4, B5, scenarios) |
| 7 refused decision | the engine's signal record (`pool occupied` by a lot, `pool reserved` by a pending order — including same-minute ties — and, in portfolio mode only, margin refusals); refused decisions never fill (test) |
| 8 reset / continuation | the observer's continuation windows (opened by a profitable exit; closed by expiry or by any arming) |
| 9 exits and costs | the engine's exit decision, execution price, reason (trailing stop, gap, maximum hold, buffered loss), interest, friction, net; an open lot at a data end is valued at liquidation |

**Observer.** `observer.ts` steps one frozen `ShadowBook` over its symbol's sessions in exactly the engine's
per-bar order. It changes no decision; its trades must equal the engine's one-book run **field for field** for every
standalone run of every stage (fail closed inside `standaloneRun`). In Stage 2 it matched on every incumbent book over
the training era; in Stages 3–5 it matched on every one of the standalone runs (counts in §4).

**Gate rule.** Under shadow semantics a fixed pool's funded set is a function of its books' virtual trades: decisions
in (decision time, symbol) order, granted iff the decision time is later than the exit time of the last granted trade
(+∞ while that trade is open or pending at the data end). `gate.ts replayGate` restates this; it must equal the
engine's funded set for every fixed baseline and scenario run (fail closed in `gateCheck`). The independent reviewer
checked the rule against the engine's bar order (exits step 3, fills step 5, decisions step 6, ties alphabetical,
reservations from decision to fill). The first-order classification (busy / idle-clean / idle-displacing) uses the
same inequalities against the **unchanged** baseline.

**Minute drawdowns** of the fixed slot are re-derived from the lots and the minute bars in the engine's own order and
fed to the frozen `Tracker`; the whole-run maximum must equal the engine's (fail closed), the windowed one restarts the
peak at the window boundary. **Window increments** V are liquidation-equivalent mark changes; each lot's in-window
share is computed and the shares must sum to V (fail closed).

## 3. Stage 2 parity (sealed 2026-10-28T14:10:18Z; 512 checks, all pass)

The parity record keeps names, pass/fail and absolute differences only (PROTOCOL §10.2). Tolerances: counts exact;
cent figures ±$0.005; whole-dollar figures ±$0.50; identities 1e-6. Largest numeric difference among all checks:
$0.40 (a whole-dollar published anchor).

| Anchor | Source | Result |
|---|---|---|
| B4 training, 5 bps: $242,196.01, 71 lots, 137 virtual trades, 66 refused, 843 of 1,647 sessions with a lot at the close | opportunity map / pools runbook / seven-ETF screen | equal |
| B5 training $388,489.26 | portfolio-aware study | equal |
| B4/B5 whole runs to 2021-12-31 $129,369.85 / $217,492.04 | ranked-preemption VALIDATION | equal (cent) |
| B4/B5 window A +$62,160.78 / +$46,506.24; window B +$112,826.16 / +$170,997.21 | Study 1 / ranked-preemption | equal (cent) |
| B4/B5 windowed minute DD A $17,702 / $16,557; B $22,327 / $17,269 | diverse-pool study | equal (±$0.50) |
| VGT primary alone: window A +$32,698 (minute DD $14,894), window B +$22,145 ($17,421) | Study 1 ANCHORS | equal (±$0.50) |
| Every P-A nominee (49) and P-B nominee (54) fold V and lots entered at 5 and 10 bps (206 runs) | standalone audit `results/runs/fold.jsonl` | equal, max \|ΔV\| 0 |
| Observer = engine on VGT primary, XBI/XRT/KRE lowDd, GDX portfolioAware over the training era | — | 0 differences |
| Seven published View-U-on-B4 rows (GDX, XOP, XLE, EWZ, TLT, XLU, GLD; training, 5 bps): virtual trades, busy/clean/displacing (map convention), candidate funded lots, baseline lots lost and their net, incumbent lots gained, Δ@5 | opportunity map | equal (XOP Δ +$48,198.60 vs +$48,199) |
| Post-cutoff mutation: VGT and XOP files with a bar changed on 2021-03-01, loaded through 2020-06-30 | — | identical loaded bars and identical View U ledgers |
| Doors refuse U and I through 2024-01-02 and P-A through 2022-01-03 | — | refused before reading |
| Determinism: a repeated U-XOP ledger | — | identical hash |

Protocol-convention class counts for the seven map rows equal the map's (the map counts a same-minute decision as busy
regardless of symbol; XOP and XLU each have one same-minute tie with a B4 funded decision, which does not change their
counts). The map's "19 S0 lots displaced worth $125,958" for XOP is the **full-replay lost set** (14 directly blocked
lots worth $133,382 plus 5 lost by cascade worth −$7,424), not a first-order count.

## 4. Fail-closed checks in Stages 3–5 (every one passed; a failure would have stopped the stage)

- **Observer = engine, field for field:** 667 standalone runs (screen A 110, screen B 115, signals 2020-06-30 110,
  2021-12-31 164, 2023-12-29 168 — View U on 61 ETFs at each data end, View P nominees on their folds, P-F context).
- **Gate replay = engine funded set:** every fixed baseline run of the screens and signals (10) and every fixed run of
  the replay stage (4 baseline sets × 5 cost runs + 25 scenarios × 5 cost runs = 145).
- **Minute-drawdown re-derivation = engine** and **window shares = V** on every run whose drawdown or increment is
  reported (standalone, baseline, scenario and the risk stage's 286 standalone and 9 pool runs).
- **Attribution identity** (Σ parts = ΔV; lots common to both runs have identical window shares) on all 25 scenarios at
  5 and 10 bps.
- **Determinism against the screens:** the signal ledgers ending 2020-06-30 and 2021-12-31 hash equal to the sealed
  screens' ledgers, symbol by symbol, for View U, View P and both baselines (`results/signals/SIGNALS-*.json`
  `determinism`).
- **Doors:** every stage record lists its door (end date, loaded last date, data and loaded-bar hashes per symbol); no
  record has a session after 2023-12-29; fold-a vectors were never loaded past 2021-12-31.
- **Protected inputs** re-verified before every stage (tracked files, `package.json`, 148 prospective-freeze pins incl.
  the calendar's append-only hash, 61 data files, the prior studies' ignored files).

## 5. Tests

`node --experimental-transform-types --disable-warning=ExperimentalWarning --test
'src/d1-signal-capital-complementarity/tests/*.test.ts'` — 22 tests (19 at the code freeze, plus the 3 rubric tests of
correction C1): same-minute ties alphabetical with no double
funding; a refused decision never fills and stays logged; the +∞ conventions for a baseline lot open at the end and a
reservation pending at the end; replayGate = engine on a multi-book fixture and the attribution identity; observer =
engine with setups; minute-drawdown re-derivation = engine and window shares = V with a lot open at the boundary;
friction changing stop activation (0 bps: the stop is in profit and the gap sells at the opening trade; 10 bps: the
same stop would lose money, so it is inactive and the lot is held — a full rerun, not a subtraction); fills across
missing minutes; the minute grid; the gate rule's boundary (a decision stamped at the exit time is refused); one-to-one
matching shared by both directions; NA for zero denominators and zero-signal partners; the computed diagonal;
asymmetric shares; inclusive, non-chaining anchor clusters counted once; interval measures; average ranks; screen gates
and roles (members and VOOG excluded, SRC skips S1, NC only ex-ante uneconomic); on the canonical data, the XOP
first-order vs full-path sign flip, door refusals, XOP's adjusted split, determinism and the protected inputs; the
rubric's reshuffle definition, NC replays informing labels, and label qualifiers (C1).
