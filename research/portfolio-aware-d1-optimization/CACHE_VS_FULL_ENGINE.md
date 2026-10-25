# Cached signal books versus the full minute engine

**Outcome: no fallback was needed.** The cached replay reproduced the full engine exactly — every trade, lot, signal
record, daily row and drawdown statistic, compared field by field with exact numeric equality — in every one of the
parity comparisons below, before it selected anything; every champion and every Stage C configuration was re-run on
the full engine on training, and every post-freeze figure comes from the full engine (with the replay re-checked
against it on the same `all` runs). Records: `results/parity/parity.json`, `results/stageB/champions.json`
(`fullEngine`), `results/stageC/stageC.json` (`parity`), `results/evaluation/evaluation.json` (`parity`).

## 1. Two engines

**The full engine** is the N-book allocator `src/portfolio-aware-d1/nbook/engine.ts`: the frozen
`src/multi-etf-allocator/engine.ts` `runAllocator` with the books' symbols taken from the configuration. It keeps the
frozen engine's single chronological pass over every minute bar of every file (core orders, virtual exits, core VGT
orders, virtual fills, rebound decisions in the tie order, marks), its shadow books (the frozen `ShadowBook`, imported
unchanged), its fixed ledger (`FixedLedger`, imported unchanged), its drawdown trackers (imported unchanged) and its
portfolio ledger and margin functions, generalized only from the fixed five securities to the run's list (sums in the
same order, so identical values for the five). Book order VGT, XBI, XRT, KRE, then other books alphabetically; tie
order alphabetical (the shadow policy's KRE VGT XBI XRT, extended: a candidate whose ticker sorts first wins a
same-minute tie). Dropped because no run here uses them: price shocks, margin calls and forced sales, requirement
changes, the Vanguard tier-interest sensitivity and the non-shadow policies. The frozen engine itself was not edited:
the N-book engine's authority rests on gate E1.

**The fast path** has two parts.

1. **Traces** (`src/portfolio-aware-d1/trace.ts`). Under the shadow semantics each book commits every rebound signal
   it produces; a refusal only labels the virtual trade (`allocator`, `fundedLotId`) and never feeds back into the
   entry machine, the exit manager, the continuation window or the stop. A book's virtual trades are therefore a
   function of its own symbol's bars and its settings alone. `traceBook` drives the frozen `ShadowBook` over its own
   sessions in exactly the per-bar order the engine uses (exit, then fill, then the completed minute's rebound test;
   the closing print's exit and fill; the after-close update) and returns every virtual trade with its decision, fill
   and exit minutes, prices, reasons, interest and P&L.
2. **The causal replay** (`src/portfolio-aware-d1/replay.ts`, fixed mode). It sorts the traces' events into the
   engine's order — session; the session's bar minutes in time order, then the closing print; within a minute, virtual
   exits, then virtual fills, then rebound decisions in the tie order — and consumes them strictly in that order. A
   decision is answered from the pool's state at that moment only: an open lot or a pending reservation refuses it
   ("pool occupied (…)", the engine's own label), otherwise it reserves the pool. A trade's fill, exit and P&L are read
   only when its own fill or exit event is reached. The funded lots are then booked by the frozen `FixedLedger` and
   marked where the engine marks them: at every bar of the held lot's own symbol (fresh mark at the bar close, interest
   through the session date), at its exit minute (realized only), and at every close; the minute and daily trackers
   are the frozen `Tracker`'s strict updates.

## 2. The cache key

`traceKey` = sha256 of: the trace format version; the symbol; the dataset's id (data hash prefix, partition, last
date), content sha256, first and last dates, session and bar counts; the splits registry's sha256; every machine
parameter (the eight D1 parameters and the fixed D1 settings); the notional; the interest rate; the per-side cost;
the stop fill; the stop slippage; the arming session, accounting start and end session; and the sha256 of
`src/multi-etf-allocator/shadow.ts`, `src/shared-margin-portfolio/strategy.ts`, `src/four-family/data.ts` and
`trace.ts`. A test changes each input in turn and checks the key changes (eleven variants, all distinct). The four
frozen books' traces are cached per cost level (one per cost; nothing crosses cost levels); candidate traces are
built per evaluation and not retained. Each trace also carries a content signature (sha256 of its trades).

## 3. Why the replay cannot see the future

- Decisions are made in event order from the pool's state, which only exits and fills that have already been
  consumed can change. No stored exit time or P&L enters a decision.
- A test alters the first funded trade's exit price (its P&L) and, separately, moves its exit two sessions later, and
  checks every decision before the original exit is unchanged (`src/portfolio-aware-d1/tests/engine.test.ts`).
- The completed training P&L of a vector enters only the after-the-fact fitness (Δ, standalone net, folds, regimes),
  never a historical decision.

## 4. Parity gates (`npm run portfolio-aware-d1 -- parity`, 793 s, before any selection)

**1,208 comparisons, 0 with any difference.** Every comparison is the whole result structure: each virtual trade
(decision, fill and exit session/minute/price/reason, stop state, interest, gross and net, allocator label, funded lot),
each funded lot (every ledger field, worst mark and its time, the number of minute marks), each signal record (outcome,
refusal reason and holder label, same-minute count, staleness of every symbol's last mark), each daily row (closes,
lot shares, market values, principal, interest liability, realized, unrealized, equity, owners; in the portfolio also
cash, receivables, requirements and margin ratios), each ledger event, every drawdown statistic (maximum, its depth,
peak, trough and recovery times) and the books' end states — with exact numeric equality (NaN equal to NaN).

| Gate | What | Window | Cases | Differences | Median time, full engine | Median time, trace + replay |
|---|---|---|---:|---:|---:|---:|
| E1 | frozen engine = N-book engine; S0 and VGT alone; fixed | training | 8 | 0 | 340 ms | — |
| E1 | same, portfolio | training | 8 | 0 | 1,315 ms | — |
| E1 | fixed | `all` → 2025-10-13 | 8 | 0 | 443 ms | — |
| E1 | portfolio | `all` → 2025-10-13 | 8 | 0 | 1,548 ms | — |
| E1 | fixed | `all` (→ 2026-10-13) | 8 | 0 | 476 ms | — |
| E1 | portfolio | `all` (→ 2026-10-13) | 8 | 0 | 1,877 ms | — |
| E2 | replay = N-book engine; S0 and VGT alone; fixed | training | 8 | 0 | 339 ms | 29 ms |
| E2 | same | `all` → 2025-10-13 | 8 | 0 | 425 ms | 34 ms |
| E2 | same | `all` | 8 | 0 | 466 ms | 38 ms |
| E3 | replay = N-book engine; candidate pools (below) | training | 1,136 | 0 | 600 ms | 51 ms |

E1 and E2 run each case at 0, 2, 5 and 10 bps. E1's two engines read the same loaded datasets, and the N-book loader's
datasets were checked identical (every typed array) to the frozen loader's for each member and window. E2 also checks
that the summary path (detail off, used by the search) gives the same net, drawdowns and daily marks as the detailed
path.

**E3, per candidate** (the controls — D1's constants, the six frozen XBI/XRT/KRE vectors, and for XLE its two
eight-ETF vectors — plus 12 vectors from the common pool: the shortest and widest stops, the longest hold, the longest
continuation window, the shortest and longest lookbacks, and the first six pool vectors; at 0/2/5/10 bps):

| ETF | Five-book additions | Standalone runs | Substitution (for KRE) | Six-book combination | Differences |
|---|---:|---:|---:|---:|---:|
| GDX | 76 | 76 | 4 | 4 (with XOP) | 0 |
| XOP | 76 | 76 | 4 | 4 (with EWZ) | 0 |
| EWZ | 76 | 76 | 4 | 4 (with TLT) | 0 |
| TLT | 76 | 76 | 4 | 4 (with XLE) | 0 |
| XLE | 84 | 84 | 4 | 4 (with XLU) | 0 |
| XLU | 76 | 76 | 4 | 4 (with GLD) | 0 |
| GLD | 76 | 76 | 4 | 4 (with GDX) | 0 |

The set covers short (3.0%) and wide (15.0%) stops, re-arming and post-exit continuation, refused and displaced
trades, same-minute decisions, gap and closing-print fills, positions open at the end of the data and **XOP's
1:4 reverse split** (every XOP trace crosses 2020-03-30); costs move stop activation (the net-profit rule includes
the entry cost) and the continuation window (opened by a profitable net), and the replay follows both exactly.

## 5. Measured speed

The full engine processes every minute of every member: ≈ 0.6 s for a five-book fixed training run, ≈ 1.3–1.9 s for a
portfolio run. Re-tracing all five books and replaying takes ≈ 51 ms; in the search the four frozen books' traces are
cached per cost, so one evaluation of a candidate vector at one cost (its trace, a standalone replay and a pool
replay) costs only the candidate's part: Stage A measured **≈ 22 ms per evaluation** (14,540 evaluations, 29,084
replays in 319 s) against ≈ 600 ms (pool) + ≈ 170 ms (standalone) on the full engine — about a **35× speed-up** at
identical results; the full engine alone would also have been affordable for this budget, so the
choice of the cache changed only the wall time, never a result.
