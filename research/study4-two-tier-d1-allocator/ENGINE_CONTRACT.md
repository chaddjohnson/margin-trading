# Engine contract — Study 4 two-tier allocator (revision 2)

The binding definition of how Study 4 executes a shared one-slot pool with deep and shallow books, priorities, gates
and preemption. Implemented twice: the fast **trace replay** (`src/study4-two-tier-d1-allocator/allocator.ts`) and an
independently written **reference engine** (`reference.ts`, written from this document without the fast path's code)
that steps live `ShadowBook`s minute by minute. They must agree exactly (every lot, switch record, mark and drawdown).
Frozen code used read-only: `ShadowBook` (`src/multi-etf-allocator/shadow.ts`), the D1 port and fill helpers
(`src/shared-margin-portfolio/strategy.ts`: `firstTradeFrom`, `firstTradeAfterDecision`, `priceAt`, `timeAt`), the
`Tracker` (`src/multi-etf-allocator/engine.ts`), and as parity oracles `traceBook`/`replayFixedPool`
(`src/portfolio-aware-d1/`) and `replayPreemptive` (`src/d1-ranked-preemption/replay.ts`).

## 1. Books and traces

- A **book** = (id, symbol, tier ∈ {deep, shallow}, priority rank, D1 vector, origin). Ids are unique in a
  configuration; two books may share a symbol. B5's books have ids `B5:<SYMBOL>` and their registered vectors.
- A book's **trace** = its frozen `ShadowBook` driven over its own symbol's sessions in the frozen per-bar order (virtual
  exit, virtual fill, completed-minute decision; at the close, exit then fill on the closing print; then the
  after-close update), from the window's first session, arming from 2017-06-15, at the run's cost and interest rate.
  Shadow semantics: every signal is committed; the allocator never feeds back. A book's trace is identical in every
  configuration and policy; Study 4's trace builder drives `ShadowBook` exactly as `traceBook` does (its trades must
  equal `traceBook`'s content signature) and also records each setup's activation time and kind.
- Warm-up: books read no session before the window; the deep path needs session index ≥ L (frozen rule); arming from
  2017-06-15 (index 365) satisfies every L ≤ 250. Prices are raw, split-adjusted (splits up to the door end); no
  distributions. Fixed principal: insufficient cash and margin calls do not arise in the fixed slot.

## 2. Pool state machine

States: **IDLE**; **RESERVED(r)** — a granted order of book r waiting for its virtual fill; **HELD(lot)** — one funded lot
(exact, mirror or orphan); **SALE(lot, d)** — a switch for deep decision d decided, the shallow lot's sale due at a known
event; **BUY(d)** — the shallow lot has left and the mirror purchase of d's trade is due at a known event; **WAIT(lot,
d)** — P4: the lot is watched for a breakeven-or-better minute close until a deadline; **LATE(lot, d)** — P0M: d waits for
the lot's own exit. At most one of these at any event. SALE, BUY, WAIT and LATE refuse every other decision (reason
recorded and counted).

## 3. Event order (both implementations)

Within one session: bar times in increasing order, then the close. At one time: (0) virtual exits of every book (book
order), (1) due switch sales and purchases, (2) virtual fills (book order), (3) P4 minute checks of that minute, then
decisions stamped at the end of the minute starting at that time, in priority order. At the close: closing-print
exits, closing-print switch events, closing-print fills, then (reset mode) the annual reset, then marks; no decisions
at the close (a decision stamped at the close came from the last minute and was processed in (3) of that minute).
Exits and fills of virtual trades that are not funded move no money.

**Intrabar exception.** A virtual exit whose execution is `stop level` or `trigger minute close` happens inside its bar,
after the bar's opening trade: a switch sale or purchase due at that bar's open comes first (§5.3, §5.4).

**Priority order of same-minute decisions.** Deep books by symbol then id; then shallow books in the configuration's
shallow priority order (default: symbol then id). **Frozen-tie mode** (parity only): alphabetical by symbol across all
books (the frozen rule; distinct symbols required). For B5 alone both are identical.

## 4. Funding without preemption (P0)

A decision is granted iff the pool is IDLE and no gate refuses it; RESERVED until the book's own virtual fill, then
HELD(exact lot) until the trade's own virtual exit. Otherwise refused (reason: occupied / pending order / pending
switch / gate). A freed slot is never given to a book in mid-trade. This is the frozen allocator plus the priority
order.

## 5. Preemption and late funding (P0M, P1, P2, P2L, P3, P4)

A switch can start only on a **deep** decision (a rebound confirmed at a completed minute: an actionable D1 entry
decision, never a mere arming) while the pool is RESERVED or HELD by a **shallow** book.

1. **Reservation.** Under P0M, P1, P2, P3 and P4, if RESERVED by a shallow order not yet filled, the order is cancelled
   (no fill, no cost) and the deep decision is granted as in P0 (`cancelled-reservation`). P2L never cancels.
2. **Decision test.** For HELD(shallow lot ℓ) the estimate is net(p) = shares × p × (1 − c) − 100,000 − 100,000 × r ×
   (session date − ℓ's entry session date) ÷ 365, with p = the close of the shallow symbol's latest bar starting at or
   before the decision bar's start, else the previous session's close. P1: no test. P2, P2L: net ≥ 0. P3(B, f): net ≥
   −B, and with f = deep-path the deep decision's setup must be of kind `deep` (else `declined-filter`). P4: net ≥ 0 →
   the sale is sent at once (no fill test); net < 0 → WAIT (§5.6). P0M: no sale; LATE (§5.7). A decision failing its
   test is `declined` (refused; the deep book's virtual trade continues unfunded).
3. **Sale.** The shallow lot is sold at the shallow symbol's first trade at or after the decision
   (`firstTradeAfterDecision`, carried to later sessions' first trade): price raw × (1 − c), interest through the sale's
   session date. P1 and P4 sales are market orders.
   - **Supersession:** if the lot's own virtual exit comes at an earlier event, or at the sale's event at its opening
     trade or closing print (gap stop, minute open through the stop, maximum hold, buffered loss, pending buffered loss,
     closing-print exits), no sale is made: the lot closes on its own rule (`superseded`) and §5.4 follows from the own
     exit's fill. An own exit inside the sale bar (intrabar exception) comes after the sale.
   - **Fill test** (P2, P2L, P3): the net at the sale price with interest through the sale's session must still be ≥ the
     threshold; otherwise the switch **aborts**: nothing is sold, the lot stays HELD (an intrabar own exit in that bar
     then closes it), the deep decision is refused. This models an immediate-or-cancel sell limit at the price whose
     net equals the threshold, tested at the sale print. The booked net of an executed sale equals the tested net
     (asserted).
   - The deep trade ends before the sale's event → `stale-before-sale`, nothing sold.
4. **Mirror purchase (default replacement).** The replacement is decided once the sale (or own exit) is known: at the
   fill's bar start + 60 s, it fills under the frozen rule for an order decided then (`firstTradeAfterDecision` on the
   deep symbol: a later bar of that session, its closing print only if decided before the close, else the next
   session's first trade); a sale at the closing print buys at the next session's first trade. Price raw × (1 + c),
   shares 100,000 ÷ price, interest from the purchase's session date. If the purchase is at the deep trade's own fill
   bar the lot is the **exact** lot; otherwise a **mirror** lot that closes at the deep trade's own virtual exit (its
   time and raw price, exit cost and stop slippage). The deep trade's exit relative to the purchase event:
   - exit at an earlier event, or at the purchase's event with a trigger known before the purchase (maximum hold,
     buffered loss, pending buffered loss, any closing-print exit) → the purchase is cancelled, the pool becomes IDLE
     (`stale-replacement`; the sale stands);
   - exit at the purchase's own print whose trigger is that print (`trailing stop gap` at an opening trade, `minute open
     through stop`) → the purchase executes and the lot is sold at the deep symbol's next trade after it (exit reason
     `orphan-mirror`, both costs);
   - exit inside the purchase bar (intrabar exception) → the purchase executes at the open and the lot closes at the
     virtual exit's price in that bar.
   A purchase still due at the window's end is cancelled (pool idle).
5. **P2L — legacy execution mechanics under tier priority** (comparison only): the ranked-preemption P1 mechanics with
   priority deep > shallow: no reservation cancel; the replacement is the deep book's own virtual order, filled at its
   own fill as an exact lot; if that fill comes at an earlier event than the sale the switch aborts
   (`aborted-replacement-first`); if it is at the sale's very print and that print is an auction (the closing print, or
   an opening trade of a session after the decision's) the switch aborts before anything is sold (`aborted-auction`);
   if the lot's own exit supersedes and the replacement's fill is that same auction print, the replacement is dropped
   (`aborted-auction`); a same-minute replacement at the sale bar's open is allowed (the legacy sub-minute latency
   assumption); a sale due at the final event executes, then any still-pending switch aborts. It differs from the
   ranked-preemption study's P1 in using tiers (no deep-vs-deep preemption, no chains) and Study 4's tie order, so it
   does not reproduce that study's B-R1/B-R2 figures; its parity is with `replayPreemptive` on one-deep/one-shallow
   pools, where the two coincide.
6. **P4(D) wait.** WAIT(ℓ, d): at the end of each later completed minute of the shallow symbol, if the liquidation net
   at that minute's close (interest through that session) is ≥ 0 a sale order is sent and fills at the shallow symbol's
   first trade at or after that minute's end (no fill test), then §5.4. The deep trade ending first → `stale-wait`
   (nothing sold, lot stays HELD). The lot exiting on its own first → supersession (§5.3). After the last minute of the
   D-th session after the decision's session (D = 0: that session) a forced sale fills at the next session's first
   trade, then §5.4. WAIT consumes no entry (the deep virtual trade was committed at its decision); its risks are a
   stale wait and a later, differently priced mirror; decisions refused during WAIT are counted.
7. **P0M late funding.** LATE(ℓ, d): nothing is sold; when ℓ exits on its own, §5.4 follows from that exit (a mirror of
   d's trade if it is still open); the deep trade ending first → `stale-replacement`. It isolates the "late funding"
   part of superseded switches.
8. **Superseded and late-funded mirror lots** are attributed separately from forced switches in every ledger.
9. **No churn.** One switch at a time; deep, mirror and orphan lots and deep reservations are never preempted; shallow
   books never preempt shallow books.
10. **Shadow divergence.** A sale changes only the funded lot. The shallow book's virtual position continues and exits
    by its own rules (moving no money); its continuation window, buffer, hold and stop follow the virtual position; it
    cannot signal again until its virtual exit. No book is reset, no exit backdated, no same-bar re-entry granted.
11. **Mirror management (binding, disclosed).** A mirror lot is managed by the virtual trade's exit state: stop
    activation, maximum-hold clock, buffered-loss threshold and stop level are the virtual position's, so a mirror lot
    bought higher can be stopped at a loss and the maximum-hold rule can act against the mirror's own sign. Each mirror
    records its entry slippage against the virtual fill ($, bps, minutes), its net against the virtual net, and whether
    its exit condition held for the mirror itself; counts and dollars are reported. (An own-managed mirror is a future
    hypothesis, not tested.)
12. **Same-symbol switches** (a deep and a shallow book on one symbol) sell and rebuy that symbol with both costs and at
    least one minute between; counted and their friction reported.

## 6. Gates (shallow decisions only; at the decision with information then known)

- **G1:** refused if any active deep book has a setup activated at or before the decision time whose virtual fill has
  not happened by then (armed or pending). **G1d:** the same counting only `deep`-path setups.
- **G2(λ):** refused if, for any active deep book with session index s ≥ max(L, arming index), the last price of its
  symbol at the decision (the close of its latest bar starting at or before the decision bar's start, else the previous
  session's close) is ≤ its session reference high (highest high of sessions s−L…s−1) × (1 − λ × X).

## 7. Accounting, marks and identities

Every lot (exact, mirror, orphan, preempted): entry raw × (1 + c), shares 100,000 ÷ entry price; exit raw × (1 − c) × (1
− stop slippage for stop exits); interest 100,000 × r × (exit session date − entry session date) ÷ 365 days; net =
shares × exit price − 100,000 − interest. A lot open at the window end is marked at the last close (no exit friction)
for net, and at the liquidation mark (exit friction) for windowed increments. Marks (frozen convention): the held lot
at the close of every bar of its own symbol from its entry bar on; at its exit bar the realized value (the lot closes
before that bar's mark); every session close; while flat, realized values at the same instants. Trackers: frozen
strict-peak `Tracker` from 0 at the accounting start or from the boundary mark (windowed). Identities checked per run:
lot intervals disjoint; every sale-to-purchase gap ≥ 60 s (P2L: never the same auction print); one state at a time;
a mirror's entry after the virtual fill and its exit equal to the virtual exit; Σ lot nets = realized; interest days ≤
held calendar days; forced-sale friction reported separately; occupancy on the shared calendar's regular-session
minute grid.

## 8. Chained account transitions (protocol §10.2)

The configuration changes at year-end boundaries. Book identity is (tier, symbol, vector): the same book in consecutive
picks continues; a book absent from the new pick is a runoff book (no new decisions; its funded lot exits by its own
rule with its old tier, and a shallow runoff lot can be preempted by a new deep decision under the new policy). The
policy in force for a decision is that of its session's year. **Carry:** reservations, lots and pending switches cross
the boundary under their own rules (a WAIT or LATE carried across blocks new decisions until resolved, counted).
**Reset:** at the year-end close, after that session's close events, the held lot is sold at the closing print (or the
session's last close if it has none: a labelled non-executable liquidation mark); a lot filled at that very closing
print is sold at the next session's first trade; reservations and SALE/BUY/WAIT/LATE are cancelled; the next year
starts IDLE with every book's virtual state its own trace's.

## 9. End of window

A due sale at the final event executes; a SALE or WAIT still pending leaves the lot HELD (marked at the last close) and
is recorded `pending-at-end`; a BUY still pending is cancelled; a reservation at the end is reported. Development
windows end at their door's end: no later bar exists in the process.

## 10. Tests

**Closed-form fixtures** (hand-built bars and traces): P0 refusal; P1 losing sale and one-minute-later mirror; P2
declined / executed / fill-test abort (with an intrabar own stop closing the lot afterwards); decision at the last
minute (sale at the next opening trade, purchase at the second minute); Friday→Monday and holiday sales (interest in
both tests); early close, a session without a closing print, the 15:58/15:59 closing-print boundary for sale and
purchase; equal timestamps (deep before shallow; two deep decisions in a minute; frozen versus tier ties); stale
replacement, stale-before-sale, orphan mirror and intrabar mirror exit; supersession at the sale bar; reservation
cancel; a shallow fill at the deep decision's bar time (HELD path); P3 at exactly −B, the deep-path filter; P4 net ≥ 0
at the decision, recovery, deadline over a weekend, stale-wait, supersession during WAIT; P0M late funding; P2L
same-minute replacement, auction abort, own-exit auction abort, replacement-first abort, no reservation cancel; G1/G1d
with a setup filled earlier in the session, G2 at the first bar; same-symbol collision; shadow divergence (continuation
window from the virtual exit, no signal before the virtual exit); end of window with each pending state; chained carry
(same book continues, runoff mirror, a switch pending across the boundary) and reset cases; a mirror at a loss while the
virtual position is in profit; warm-up and no re-entry on an exit session.

**Parity:** P0 = frozen `replayFixedPool` for B5, B4 and B1 at 0/2/5/10 bps (to the cent, every lot, mark and drawdown)
and for random distinct-symbol pools in frozen-tie mode; P2L = frozen `replayPreemptive` (P1, $0, deep ranked above
shallow) on random one-deep/one-shallow pools with minimum counts of executed, aborted, superseded and auction-aborted
outcomes; fast = reference on randomized synthetic pools and policies with quotas per branch (executed, declined,
aborted, superseded, cancelled-reservation, stale-replacement, stale-wait, P4 deadline, P0M late, gate refusal,
same-symbol, overnight, closing-print, orphan-mirror; each ≥ 10) and on ≥ 40 sampled real F20 development pools; after
the seals, fast = reference on every chained verdict account. **Metamorphic:** a shallow book that never trades
reproduces B5 exactly; permuting the books' input order changes nothing. The reference shares no allocator or switch
code with the fast path, only the frozen modules above.
