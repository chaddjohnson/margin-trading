# Test report — D1 risk controls and standard 2.2.0

Every layer passes, apart from the 7 known pre-existing failures of the full suite (§4), which are unrelated to this
work. Three gate records first failed because of **tool** errors in this study's gate scripts, never in the engine:

- the C24 lookup (A1);
- G5's "closed" test (A2);
- G7's seal paths (A3).

Each was diagnosed with read-only reruns and fixed by an amendment. The failed records stay sealed beside the passing
reruns. Tables: [`tables/gates.md`](tables/gates.md), [`tables/demonstrations.md`](tables/demonstrations.md).

## 1. Summary

| Layer | What | Result |
|---|---|---|
| Synthetic module tests | `src/d1-risk-controls/tests/` (config 9, exit 37, book 20, gate 5, pool 10) | **81/81 pass** (0.35 s) |
| Preflight tests | `src/research-standard/tests/preflight.test.ts` | **26/26 pass** |
| Type check | `npx tsc --noEmit -p tsconfig.json` (all of `src/`) | 0 errors |
| Full suite | `npm test` in unit `vgrcf-npm-test` (2026-11-13T23:16:55Z → 23:21:05Z) | 1,551 tests: **1,540 pass**, **7 fail (all known, pre-existing)**, 4 skipped |
| G0 isolation | frozen files untouched; Priority 3 / 5B / shadow digests | **pass**: only `src/d1-risk-controls/**` and `src/research-standard/**` changed; 3/3 digests = sealed |
| G1 New L0 FULL | Priority 3 = 5B's sealed R01 record; controlled runner = Priority 3 | **pass**: every field; $479,605.18 / $20,385.99 / 46 lots; 79 funding decisions; 547,753 mark changes |
| G2 ledger | D24 lots = 5B's development ledger | **pass**: 34/34 |
| G3 slices | D19, D21, D23, D24; D24 = 5B's sealed C24 centre | **pass**: 4/4 doors; 33/33 fields (after A1) |
| G4 random parity | 60 random configurations × D21, D24 | **pass**: 120/120 identical, 5,279 funded lots |
| G5 non-default invariants | 120 random (configuration, controls) pairs, D24 + causal D21 | **pass** after A2: 0 failures (first run: 7, all a tool error) |
| G6 demonstrations | families A–D and the gate on synthetic paths | sealed `results/demonstrations.json`; asserted by `book.test.ts` |
| G7 frozen work | preflight of every study; sealed records of 5 audited studies | **pass** after A3: 14/14 studies; 28 + 90 + 10 + 27 + 43 records verify |
| Frozen commands at HEAD | `npm run vg-lmo -- verify`; `npm run vg-l0se -- verify` | 28 and 90 sealed records verify (exit 0) |

## 2. The brief's acceptance criteria and where each is tested

### 2.1 Execution realism (brief §3.1)

| Criterion | Evidence |
|---|---|
| Stops hit intraday | `exit.test.ts` "protects a position that was never profitable" (stop-level fill at L); `book.test.ts` "intraday stop-level fill at exactly L"; G5 `protectiveLevel` 935/935 |
| Gaps across stops at the open | `exit.test.ts` "fills a gap at the opening trade, below the level: not a loss cap"; `book.test.ts` crash path (gap to 80 through L = 82.8) |
| Prices through a stop before an exact print | `exit.test.ts` "fills a minute opening through the level at that open"; "uses the next minute's open under the next-open fill"; the six fill-convention cases are identical to the frozen trailing stop's fills |
| No future-bar information | G5 causality 395/395 and causal prefix 395/395 (D21 vs D24 runs of non-default controls); `exit.test.ts` "uses only the post-entry high through the previous session (no lookahead)"; exits never on the entry session (G5 935/935) |
| Simultaneous stop, trailing stop, hold expiry, queued execution | `exit.test.ts` "precedence inside one session" (11 cases: trailing gap; trailing first intraday; hold vs earlier stop; hold wins a tie; protective gap vs hold; carried sale vs later stop; protective gap vs carried sale; buffer vs a low in the next minute; vs an opening print through it; vs the signal minute; a stop voiding a same-session carry) |
| Unavailable minutes, holidays, weekends, shortened sessions, missing prints, boundary timestamps | weekday calendars with weekend gaps throughout (Friday → Tuesday = 4 days of interest, exact); "is skipped when the session has no minute reaching it (missing minutes)"; "an early close (13:00): a buffered signal in its last minute is carried …" (A4); carries decided at the close; sessions without a closing print |
| Split-adjusted data | FULL's VGT 8:1 split (2026-04-21) is continuous (809.13 → 812.56); the only consecutive-minute moves > 10% on FULL are three March 2020 overnight gaps (G1 follow-up, `results/doors.jsonl`) |
| Equality, rounding, conservative OHLC | "triggers at equality (inclusive) and not a hair above"; no price rounding (double precision); same-minute trailing/protective: the higher level first |
| 5 bps, 11% calendar-day interest, reconciliation | `book.test.ts` exact net = shares × 80 × (1 − 5 bps) − $100,000 − $100,000 × 11% × 4/365; stop slippage on protective fills; `pool.test.ts` Σ lots = net, funded fills = virtual fills; G1 (every lot's principal, interest, proceeds, net, costs, marks and minute DD identical to the frozen engine); G5 accounting 3 × 120 |
| Reduces risk in modelled paths, yet no maximum-loss guarantee | `book.test.ts` "smaller first-lot loss than the legacy maximum-hold exit (this modelled path only)" and "a gap exit below the stop level … (not a loss cap)": −$11,320.50 on an 8% stop |

### 2.2 D1 state and allocator interaction (brief §3.2)

| Criterion | Evidence |
|---|---|
| Profit-only activation of the trailing stop is respected | `exit.test.ts` legacy equality on 400 random paths (both stop policies, both fills); "the legacy stop is inactive under water" |
| Material-loss / lower-price re-entry after protective losses | Not present in New L0's D1 (SPECIFICATION §2, `GROWTH_TRADING_AUDIT.md` §1). The gate counts protective exits as failed attempts (`book.test.ts` K = 1 with the stop); its boundaries are in `gate.test.ts` (recovery inclusive, cooldown exact, net = 0 is a failure) |
| Continuation eligibility, window timing, exit-reason dependencies | `book.test.ts` "a profitable exit ends an unblocked episode, and the continuation re-entry is untouched"; "never blocks a book without failures"; "never opens a continuation window (a protective exit always loses)"; random-grid legacy parity (W 1–10 sessions) |
| Tracked high, recovery reset, episodes, state after stop/hold/adaptive exits | `book.test.ts` gate tests (event sequences with dates); `gate.test.ts` (no re-anchoring); the adaptive tests (latched extension, effective hold logged) |
| Multi-entry declines and duplicate signals | K = 2 "within allowance"; one refusal event per session with the minutes counted |
| Two D1 books + Growth in one pool; no double funding; priority unchanged | `pool.test.ts` (no overlapping lots; D1·GDX before D1·VGT at the same instant; refusal logged with its occupant; Growth books = Priority 3's); G5 `noOverlap` 120/120, `independence` 209/209; G4 |
| Accounting at open positions, boundaries, transitions | G1 (an open lot at the end; the 2024-12-31 boundary period); `pool.test.ts` |
| Shadow-entry eligibility OFF, no delayed entry | the runner uses Priority 3's `runPool` (no eligibility path); a refused arming is not armed and never re-armed later; `pool.test.ts` "the decline gate counts a failed virtual trade the pool refused (shadow lifecycle)" |

### 2.3 Parity and reproducibility gates (brief §3.3)

| Item | Evidence |
|---|---|
| 1 Existing and new suites | §1 (full suite, module, preflight) |
| 2 Exact New L0 parity (trade list, instants, prices, reasons, gross/net, minute DD, fund/refuse) | G1, G2 (`tables/new-l0-full-trades.md`) |
| 3 Original vs updated on slices and synthetic scenarios, including extended losing holds | G3 (D19–D24), G4 (120 runs), synthetic legacy parity (crash path: two maximum-hold losses), 150 random paths × grids × stresses |
| 4 Determinism, serialization, round trips, per-book settings | G5 determinism 120/120; `config.test.ts` round trip; `pool.test.ts` determinism and independence |
| 5 Frozen commands at their pins; no digest rewritten | G0, G7; `vg-lmo verify`, `vg-l0se verify` at HEAD |
| 6 A deterministic example per non-default mode | G6 `results/demonstrations.json` (families A, B, C, D ×2, gate ×2), asserted in `book.test.ts` |

## 3. Synthetic demonstrations (correctness, not performance)

Grid: X 10%, Y 1%, trailing 5%, hold 5 days, L 3, buffer 2%, P 5%, W 5, on the synthetic crash path. The full records
are in [`tables/demonstrations.md`](tables/demonstrations.md).

| Family | First lot's exit | Net |
|---|---|---:|
| A legacy | maximum hold, 2021-03-10 at 77 | −$14,680.64 |
| B 8% stop | protective gap, 2021-03-09 at 80 (level 82.8) | −$11,320.50 |
| C 15% stop, hold disabled | protective stop-level fill at 76.5 | −$15,235.64 |
| D adaptive (base 3, extended 20, progress 10%) + 8% stop | maximum hold at the base, 2021-03-08 at 88 | −$2,410.36 |
| Gate K = 1 + 8% stop | as B; arming refused 2021-03-10 to 03-12; block expired at the 03-12 close | — |

C's loss is larger than B's on this path: a wider stop gives back more. These are examples of mechanics only.

## 4. Known pre-existing failures of the full suite (unchanged from earlier studies)

| Test file | Cause |
|---|---|
| `src/intraday-study/tests/study.test.ts:19` | opens `src/app/allin-original.ts` (lowercase), absent on this case-sensitive filesystem (the file is `allIn-original.ts`) |
| `src/minute-optimizer/tests/goldenMaster.test.ts:36` | same |
| `src/trailing-buy/tests/goldenMaster.test.ts:39, 43, 49, 58` | same (4 tests) |
| `src/study7-runners/tests/runners.test.ts:148` | its reconciliation applies only when the data end on 2026-10-29; `data/VGT/data.csv` was extended to 2026-10-30 on 2026-11-02 |

The log is `results/logs/npm-test.log`.

## 5. Limits of this testing

- The real-data runs of non-default controls check invariants only: no profitability or risk claim, by design (AD7).
- OHLC minute bars do not order prices inside a minute; the conservative conventions are tested, not the truth.
- The entry session is never protected (the D1 convention); this is tested and documented, not changed.
- A protective stop is shown, on synthetic gaps, **not** to cap a loss.
