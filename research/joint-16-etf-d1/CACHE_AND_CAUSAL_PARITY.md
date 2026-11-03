# Cached traces versus the full minute engine

**Outcome: no fallback was needed.** The cached replay reproduced the authoritative full engine exactly — every
virtual trade, funded lot, signal record (outcome, refusal reason and holder, same-minute count, staleness of every
member's last mark), daily row, drawdown statistic and book end state, compared field by field with exact numeric
equality — in all **268** parity comparisons below, run after the protocol freeze and **before** the replay selected
anything (`npm run joint-16-etf-d1 -- parity`, 307 s, `results/parity/parity.json`, table
[results/tables/parity.md](results/tables/parity.md)). Every nominee was then re-run on the full engine on training in
both modes at four costs before the selection freeze, and every post-freeze figure comes from the full engine with the
replay re-checked against it on the same `all` runs (HOLDOUT_FINAL_RESULTS.md).

## 1. The engines (reused, not cloned)

- **Full engine:** the previous study's N-book allocator `src/portfolio-aware-d1/nbook/engine.ts` (`runNAllocator`),
  unchanged: one chronological pass over every minute bar of every member; at each bar start core VOOG orders, virtual
  exits (closing funded lots), core VGT orders, virtual fills (opening funded lots), each book's completed-minute
  rebound test with the decisions handed to the allocator in tie order, then the marks; at the close the same, then
  dividends. Its authority rests on exact parity with the frozen `src/multi-etf-allocator/engine.ts` on every four-book
  control (the previous study's E1, re-checked here as P0).
- **Fast path:** the previous study's `traceBook` (the frozen `ShadowBook` over its own symbol) and `replayFixedPool`
  (the causal fixed-pool replay), unchanged; this study adds only `src/joint-16-etf-d1/evaluator.ts`, which caches traces
  by (symbol, vector ID, cost) inside one loaded universe, passes every configuration to both engines in the canonical
  book order, and computes the fitness figures from the replay's result.
- **Membership.** A configuration is any nonempty set of the 16 ETFs; the engines need no fixed member: a subset without
  VGT, XBI, XRT or KRE simply omits them (no VGT book, no XBI/XRT/KRE books, VOOG as a book, one book and all 16 books
  are all in the matrix). **Book order** (exits, fills: VGT, XBI, XRT, KRE, then the others alphabetically) cannot change
  a funding decision with one lot or reservation at a time — an exit only frees the pool, and only the reserved trade's
  fill opens a lot. **Same-minute tie order** is alphabetical among the subset's members, the previous convention
  generalized exactly (B4/B5 reproduce to the cent).
- **Core/lot overlap.** In the portfolio a VGT or VOOG book's lots are separate from the core's shares of the same ticker
  (the ledger keeps `voog`, `vgtCore` and each lot's shares apart; market values add them). P2 checks it on real data.

## 2. Why the traces can be shared across subsets, and the cache key

Under shadow semantics every book commits every signal it produces, and the allocator's answer only labels the virtual
trade (`allocator`, `fundedLotId`): it never feeds back into the entry machine, the exit manager, the continuation
window or the stop. A book's virtual trades are therefore a function of its own symbol's bars, its eight parameters and
the execution settings alone — the same in every subset. The previous study's `traceKey` (sha256 of the trace format,
the symbol, the dataset's id/content sha256/first and last dates/session and bar counts, the splits registry hash, every
machine parameter, the notional, the rate, the per-side cost, the stop fill and slippage, the arming/accounting/end
sessions, and the sha256 of `shadow.ts`, `strategy.ts`, `four-family/data.ts` and `trace.ts`) is carried by every
trace; this study's in-process cache is keyed by (symbol, vector ID, cost) within one training load, and a test checks
that it never crosses symbols or cost levels. No trace crosses a cost level, a window or the notional; **the fast path
is used for the fixed $100,000 pool only** — every portfolio figure (20% of marked equity, compounding, core orders,
distributions, margin) comes from the full engine, because a fixed-notional trace says nothing about dynamic sizing.

## 3. Why the replay cannot see the future

- The replay sorts the subset's trace events into the engine's order (session; bar minutes, then the closing print;
  within a minute exits, fills, decisions in tie order) and consumes them strictly in that order. A decision is
  answered from the pool's state at that moment (an open lot or a pending reservation refuses it); only already
  consumed exits and fills change that state. A trade's later fields are read only at its own fill or exit event.
- Test (`src/joint-16-etf-d1/tests/joint.test.ts`, a four-book subset including VOOG): halving the first funded trade's
  exit price (and its net) or moving its exit two sessions later changes **no** decision taken before the original
  exit.
- Completed training P&L enters only the after-the-fact fitness (net, drawdowns, folds, regimes, years), never a
  historical decision.

## 4. The parity matrix (before any selection)

| Gate | What | Cases × costs | Differences | Median full engine | Median trace + replay |
|---|---|---:|---:|---:|---:|
| P0 | frozen engine = N-book engine, B4 and B1, fixed and portfolio, training (identical datasets checked member by member) | 16 | 0 | 1.0–1.6 s | — |
| P1 | replay = N-book engine: each of the 16 ETFs alone with D1's constants and with a library vector (VOOG alone included) | 128 | 0 | 172 ms | 15 ms |
| P1 | random subsets of 2, 4, 8, 12 and 16 books with random library vectors (4 each; one with VOOG, one with XOP and without VGT) | 80 | 0 | 0.28–2.1 s | 26–160 ms |
| P1 | B1, B4, B5 with the frozen books | 12 | 0 | 0.15–0.64 s | 15–57 ms |
| P1 | 16-book pools of the library's extreme vectors (shortest/widest stop, longest hold, longest W, shortest/longest L) and of D1's constants on every ETF | 28 | 0 | 2.1–2.2 s | 152–168 ms |
| P2 | portfolio consistency (full engine, 5 bps): 16 books, VOOG alone, VOOG + VGT, B5 | 4 | 0 problems | 1.2–6.8 s | — |

Costs 0, 2, 5 and 10 bps per side for P0 and P1. The matrix covers 1–16 books, subsets with no VGT and no XBI/XRT/KRE,
VOOG as a book (VOOG's sparse bars, delayed fills), every ETF's own calendar, the tightest (3.0%) and widest (15.0%)
stops, 3–30-day holds, 20–250-session lookbacks, 10–200-session continuation windows, refused and same-minute decisions
(the 16-book D1 pool funds 88 of 389 virtual trades; the shortest-stop pool 142 of 976), positions open at the end, and
**XOP's 1:4 reverse split** (every XOP trace crosses 2020-03-30). Costs move stop activation (the net-profit rule includes
the entry cost) and the continuation window (opened by a profitable net); the replay follows both exactly. The summary
path used by the search (detail off) gives the same net, drawdowns and daily marks as the detailed path in every case.

**P2 portfolio consistency** (each check over all 2,011 training closes): the funded signals of the portfolio run equal
the fixed run's (no margin rule refused a signal in any case); equity = market values + cash + receivables − principal
− interest liability − funding payable at every close; VOOG and VGT market values equal (core shares + lot shares) ×
close; on each of the 64 VGT/VOOG ex-dates the core dividend equals core shares × amount, VGT lots receive VGT's (checked
on 3, 9 and 6 ex-dates with VGT lot shares) and VOOG lots receive none (VOOG lots open on 253 closes in the VOOG-alone
case, 14 in VOOG + VGT).

## 5. Determinism

The search is single-threaded and fully seeded (`deriveSeed`/`Rng` labels in PROTOCOL.md and FROZEN_SELECTION.json).
P4 re-ran Stages L and D in a fresh process (`npm run joint-16-etf-d1 -- determinism`, 574 s): both logs are
**byte-identical** (library sha256 `f8bc61a9…`, discovery `dedd736e…`; `results/determinism/determinism.json`).

## 6. The cache during the search, and the full-engine confirmations

The search built 46,011 traces (16,720 pinned library traces and 29,291 others, LRU-bounded) and answered 140,143 trace
requests from the cache, for 57,806 replays of 36,513 unique configurations (1,712 further requests were archive hits).
Every one of the 23 robustness batteries (20 shortlisted configurations and B1/B4/B5) re-ran its configuration on the
full engine (fixed, 5 bps, field for field against the replay: 23 of 23 exact; and the 20% portfolio, which only the full
engine computes), and the post hoc diagnostics re-checked 4 jointly perturbed configurations (exact). No nominee was
frozen, so no post-freeze run exists to re-check.
