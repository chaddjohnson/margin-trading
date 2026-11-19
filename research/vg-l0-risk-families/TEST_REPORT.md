# Test report — RC 2 (entry-day protective-stop activation) and the study pipeline

Every layer passes, apart from the 7 known pre-existing failures of the full suite (§4), which are unrelated to this
work. **RC 2 was verified before the optimizer evaluated any non-default control's performance** (brief §1.3): the
synthetic tests (2026-11-14T01:3xZ), stage V (sealed 01:53:57Z) and the full suite (01:55–01:59Z) all precede the
protocol freeze (02:12:22Z) and the first search (02:12:30Z).

## 1. Summary

| Layer | What | Result |
|---|---|---|
| RC 2 synthetic tests | `src/d1-risk-controls-rc2/tests/` (config 7, exit 10, book 13, pool 5) | **35/35 pass** |
| RC 1 synthetic tests (unchanged module) | `src/d1-risk-controls/tests/` | **81/81 pass** |
| Study unit tests | `src/vg-l0-risk-families/tests/` (space 8, select 9) | **17/17 pass** |
| Type check | `npx tsc --noEmit -p tsconfig.json` (all of `src/`), and the tools with a temporary config | 0 errors |
| Full suite | `npm test` in unit `vgl0rf-npm-test` (`results/logs/npm-test.log`) | 1,610 tests: **1,599 pass, 7 fail (all known, pre-existing)**, 4 skipped |
| Stage V (sealed `results/parity/parity.json`, `dbedfa49…`) | V0–V6 on real data, 907 simulations, 64 s | **0 failed of 25,933 checks** |
| Pilot | every stage path on P18 (D19), 4 cells, pilot budgets | every stage completes |
| Interruption tests | graceful SIGTERM (stop after 1,500 fresh), worker SIGKILL (after 150), unit SIGKILL (10 s) | each resumed; **identical lane results** to the reference run |

## 2. RC 2 against the brief's acceptance items (§1)

| Item | Evidence |
|---|---|
| Next-session activation is RC 1 unchanged (default/legacy mode) | `config.test.ts` (300 random RC 1 configurations: canonical form, identity and key equal RC 1 byte for byte; explicit `next-session` canonicalizes to RC 1); `book.test.ts` (scenarios and 150 random paths × grids × random next-session controls, both stop fills, stresses: deep equality with RC 1 including its logs); `pool.test.ts`; stage V V3 (64 random RC 1 configurations × D21, D24: books with logs and results with every mark equal; 679 protective exits exercised) |
| Entry-day activation, per book, only for the protective stop | `config.test.ts` (refused on a stop that is OFF, in a version-1 configuration, with an unknown value); `book.test.ts` (no other exit on the entry session); V4 (5,141 entry-day positions that survived their entry session had no other exit there; next-session books never exited on an entry session) |
| Only observations after the fill | `exit.test.ts`: the fill minute's low (a later trade than its opening print) counts; minutes before the fill minute are never read ("pre-fill lows ignored"); a closing-print fill observes nothing; later minutes do not change the decision. V4 on real data: 86 entry-day exits re-derived from the raw bars (same session, at or after the fill, at L or a minute open ≤ L), 615 pre-fill lows below a level ignored, no missed trigger |
| Fill kinds: minute opening trade, closing print, first/last minute, delayed fill | `exit.test.ts` (each kind, with the next-open convention's closing-print and trigger-minute-close fallbacks); `book.test.ts` (an order carried overnight fills at the opening trade and is protected from that trade on; a closing-print fill = next-session) |
| Threshold equality, competing exits, boundaries | inclusive at L, silent a hair above; no competing exit on the entry session; sessions, holidays and missing minutes as in RC 1 (SPECIFICATION_RC2 §3) |
| Same-session adverse move | `book.test.ts`: the dip-buy filled at 90 falls through 82.8 two minutes later and exits at L that session (net −$8,079, no interest); next-session waits for Monday's gap at 80 (−$11,350) |
| An 8% stop exceeded by a larger gap loss | `book.test.ts`: a minute opening at 78 on the entry day (−13.4%) and a next-morning gap to 70 (−22%) both lose more than 8%: **not a loss cap** |
| Fill-minute exit through the unchanged pool | `pool.test.ts`: a funded lot entering and exiting in one minute (Priority 3's pool executes a new lot's exits in its fill minute); Σ lots = net; funded fills = virtual fills; one slot |
| Identity and compatibility | RC 1 identities, cache keys and records unchanged; entry-day = canonical version 2, `rc2-…` identity, `|rc2:` key; RC 1's engine files byte-identical to the foundation's freeze (V0) |
| Gate and continuation interaction | an entry-day exit counts as a failed attempt (K = 1 blocks the next arming); never opens a continuation window |
| Stresses | the +25 bps stop-slippage stress applies to entry-day fills (`book.test.ts`); the next-open stress applies to entry-day stops (fill convention) |

## 3. Stage V on real data (sealed; pass/fail counts and hashes only)

| Gate | Requirement | Result |
|---|---|---|
| V0 isolation | only `src/d1-risk-controls-rc2/**` and `src/vg-l0-risk-families/**` changed in src/apps/config since `26014af1`; research changes only in this study; RC 1's engine files = the foundation's freeze; Priority 3 / 5B / shadow evaluation digests = sealed (`147cad7c…`, `3f902532…`, `54304b69…`) | 46/46 |
| V1 New L0 baseline | RC 2's runner with legacy controls = Priority 3's engine (books, lots, funding, every minute-mark change, drawdowns, the record) on FULL (AD3) and D19–D24; FULL **$479,605.18 / $20,385.99 / 46 lots**, validation $96,883.72 / reset DD $20,385.99, ledger signature `7b17578108747911`, 79 funding decisions, 547,753 mark changes, and the foundation's sealed **trade-list, funding and mark hashes** equal; D19 $79,970.17 / $10,633.06 / 6, D21 $251,372.87 / $17,280.74 / 17, D23 $338,611.35 / $19,459.83 / 32, D24 **$382,721.46 / $19,459.83 / 34** | 12/12 |
| V2 random legacy parity | 40 random D1 pairs (New L0's Growth) × D21, D24 | 80/80 |
| V3 RC 1 parity | 64 random RC 1 configurations over the 64 base cells × D21, D24 | 128/128 |
| V4 entry-day invariants | 132 random configurations over the 132 onset cells: determinism, causality (D21 vs D24), accounting, re-derivation of every entry-day exit, no missed trigger, no other entry-session exit, protective nets < 0 | 25,656/25,656 |
| V5 module tests | RC 1, RC 2 and the study's tests | 133/133 |
| V6 frozen work | `research-preflight --all` passes every study (earlier pins with notices); the foundation's 9 sealed records verify | 10/10 |

**Limit of V4's re-derivation.** It recomputes each exit with the same `entryDayTrigger` function on the raw bars and
checks independent invariants (session, timing, price ≤ L, no missed trigger); the function itself is verified
independently only by the synthetic tests. On the 132 random real-data configurations every entry-day exit was a
later-minute low; the fill-minute and minute-open-through-stop cases occur only in the synthetic tests.

## 4. Known pre-existing failures of the full suite (unchanged)

| Test file | Cause |
|---|---|
| `src/intraday-study/tests/study.test.ts:19` | opens `src/app/allin-original.ts` (lowercase), absent on this case-sensitive filesystem |
| `src/minute-optimizer/tests/goldenMaster.test.ts:36` | same |
| `src/trailing-buy/tests/goldenMaster.test.ts:39, 43, 49, 58` | same (4 tests) |
| `src/study7-runners/tests/runners.test.ts:148` | its reconciliation applies only when the data end on 2026-10-29 (the canonical VGT file ends 2026-10-30) |

The suite grew from 1,551 (Assignment 1's full run) to 1,610 tests: +35 RC 2 tests, +17 study tests and the
foundation's 7 post-freeze A4 tests (added after its full-suite run). The 7 failures are exactly the foundation's list.

## 5. Limits

- OHLC minute bars do not order prices inside a minute; RC 2 uses only the fill minute's low (strictly below its
  opening print, hence later) and wholly later minutes. A real stop order's latency and queue position are not modelled.
- A protective stop is not a loss cap in either activation mode (gaps, minute opens through the level, halts).
- The pilot exercised the code paths and resumption; it was not a performance test and none of its figures is reported.
