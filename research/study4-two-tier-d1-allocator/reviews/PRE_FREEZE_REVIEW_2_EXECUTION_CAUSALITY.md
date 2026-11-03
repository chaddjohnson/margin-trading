# Pre-freeze review 2 — execution causality and accounting (verbatim)

Reviewer: independent general-purpose subagent in an isolated context (read-only; no files changed, nothing under
data/ opened). Commissioned 2026-10-29T19:42Z on the draft ENGINE_CONTRACT.md and PROTOCOL.md; returned ≈19:57Z (subagent runtime 860 s). The
report below is reproduced verbatim as delivered. Dispositions: `PRE_FREEZE_DISPOSITIONS.md`.

---

Review of the Study 4 ENGINE_CONTRACT.md and PROTOCOL.md drafts for execution causality and accounting. Read-only: no files changed, nothing under data/ opened.

**Overall assessment: freeze after fixes.** No redesign is needed. Shadow traces, the mirror lot, gates G1/G2 and the date-difference interest rule are causal and consistent with the frozen engine. Findings 1–4 and 17 must be fixed before the freeze.

**Findings**

1. **MAJOR. Look-ahead in the stale test (§5.4, §3).** A purchase is cancelled if the deep trade's exit is "at or before the purchase event". Exit time is recorded as the bar's start (`timeAt`), so two cases use information the order could not have had.
   - (a) A stop-level or trigger-minute-close exit inside the purchase bar is key-equal to the purchase. The cancel then uses that bar's low, which comes after the purchase at the open.
   - (b) A gap stop or minute-open-through-stop at the purchase's own print. The order executes before that price is known.
   - This is reachable whenever the purchase falls in a later session than the virtual fill: a closing-print sale bought at the next open, P4 waits, or sparse bars. It favours preemption policies.
   - Fix: cancel only when the exit's trigger was known before the purchase. That means an earlier event, or the same event when the trigger was known in advance (maximum hold is known at the open; buffered or pending loss from an earlier minute).
   - For an intrabar exit in the purchase bar: buy at the open and close at the exit price.
   - For an exit at the purchase's own print: buy, then sell at the next trade, under a new reason `orphan-mirror` with both costs.
   - Add a fixture for each case.

2. **MAJOR. Where switch events sit in the event order (§3 vs §5.3/§5.5).**
   - §3 puts the sale (phase 2) after virtual fills (phase 1). The legacy `replayPreemptive` resolves the sale at phase 0.5: after exits, before fills.
   - Read literally, the commonest P2L case (the deep fill is at the sale bar) hits "fill precedes the sale → abort". This contradicts "a same-minute purchase … is allowed".
   - §3 also says exits come before switch events with no exception. §5.3 exempts only "stop level"; the legacy intrabar set also includes `trigger minute close`, which the next-open stop stress produces.
   - Fix: put the sale and purchase at phase 0.5 for every policy (no effect on mirror policies). Write the intrabar exception {stop level, trigger minute close} into §3. State that after a fill-test abort the intrabar own exit closes the lot (legacy §5.3.5).

3. **MAJOR. P2L is described wrongly (§5.5, EXPERIMENT_MATRIX "legacy ranked-preemption contract").** It differs from research/d1-ranked-preemption §5.3 in six ways:
   - (i) Legacy never preempts a reservation; Study 4 §5.1 cancels reservations under every listed policy, P2L included.
   - (ii) Legacy uses a strict rank over all books: B5 members preempt each other, and a replacement can itself be preempted (chains). Study 4 has two tiers and never preempts a deep lot.
   - (iii) Legacy breaks ties by rank; Study 4 is alphabetical within tier.
   - (iv) Legacy aborts when the incumbent's own exit and the replacement's fill are the same auction print (`ownExitAborts`); §5.5 omits this.
   - (v) Legacy allows one book per symbol.
   - (vi) At end of data, legacy executes a sale that is due, then aborts any pending preemption.
   - So P2L cannot reproduce $334,495 / $354,960.
   - Fix: call it "legacy execution mechanics under tier priority". Specify no reservation cancel, item (iv) and item (vi).
   - Add a parity test: P2L equals `replayPreemptive` (P1, $0, deep ranked above shallow) on random pools of one deep and one shallow book on distinct symbols, where the two contracts coincide. Compare every lot and preemption record, with minimum counts for executed, aborted, superseded and auction-aborted outcomes.

4. **MAJOR. Mirror lots are managed on the virtual position's economics (§5.4, §5.8; undisclosed).** The `ExitManager` state is the virtual lot's:
   - stop activation: `isStopActive` uses virtual shares and entry, with interest from the virtual entry date;
   - maximum-hold clock: virtual `holdTimestamp`, and `profitAt(open)` on the virtual position;
   - buffered-loss threshold: on virtual profit;
   - stop level: from the post-entry high starting at the virtual fill minute.

   Consequences: a mirror lot bought higher can be stopped out at a loss (D1's "stop only in profit" no longer holds). The maximum-hold loss exit can fire or not fire against the mirror's own sign. The mirror's effective hold is shorter, which matters most under P4 and overnight cases. All of this is causal and acceptable as a rule, but only if disclosed.
   - Fix: state it as the binding rule. Record each mirror's entry slippage against the virtual ($, bps, minutes) and its net against the virtual net. Flag exits whose condition is false for the mirror lot itself, and report counts and dollars in 4C/4E.
   - Optional predeclared sensitivity: an own-managed mirror (a fresh `ExitManager` at the purchase, hold counted from the purchase date, slot freed at its own exit, deep book still virtually blocked).

5. **MINOR. Closing-print rule for the purchase (§5.4).** "Closing print if that bar start is before the close" lets a sale at the 15:59 bar buy at the closing print. Under the contract's own +60 s latency the order would arrive at 16:00, and `firstTradeAfterDecision` refuses the closing print then. Fix: purchase = `firstTradeAfterDecision(deep, s, saleTime + 60 s)`, carried forward like the legacy `firstTradeFromDecision`. Note closing-auction order cutoffs as an inherited limitation.

6. **MINOR. Estimate price undefined (§5.2).** Define it as legacy `lastPriceAt`: the close of the latest shallow bar starting at or before the decision bar's start, else `sClose[s−1]`. Assert that the booked net equals the tested net at the fill, as the legacy code does.

7. **MINOR. P4 contradicts itself (§5.2 vs §5.3/§5.6).** "If net ≥ 0, as P2" brings in P2's aborting fill test, but §5.3 says "P1 and P4 never abort at the fill". Pick one. Also answer the brief's §6 question explicitly: WAIT consumes no entry, because the virtual trade is committed at the decision. The risks are stale-wait and a later, differently priced mirror. WAIT blocks all decisions for up to D+1 sessions; count those refusals.

8. **NOTE. Fill-test abort (§5.3).** It is causal only as an immediate-or-cancel sell limit at p*, where net(p*) equals the threshold with interest through the sale date, tested at the sale print. A market order cannot depend on its own fill price. Say so. P1 and P4 sales are market orders.

9. **MINOR. Superseded switches are late funding, not preemption (§5.3, §4).** When the shallow lot exits on its own rule, no forced sale happens, yet the deep trade still gets a mirror lot. P0 forbids this ("a freed slot is never given to a book in mid-trade"). Part of any P1–P4 gain over P0 may come from this. Attribute superseded-switch mirror P&L separately in the switch ledger and the 4C decomposition. Consider a "P0 + late mirror on own exit" ablation.

10. **MINOR. Same-symbol switches (§5.4, F9).** Selling and rebuying one symbol at least 60 s later costs 2 × 5 bps plus price noise, for unchanged exposure. It is conservative and executable, so keep it as the default. Disclose it and report the count and friction.

11. **MINOR. End of window (§5.4, §7).** Only a pending purchase is covered. Add:
   - a pending SWITCH-SALE or WAIT at the end: the lot stays HELD, is marked at the last close, and the switch is recorded `pending-at-end`;
   - a sale due at the final event;
   - development windows: the door forbids reading the next session.

12. **MINOR. Chained accounts (§8; PROTOCOL §10.2).**
   - (a) The pool's state on 2020-01-02 is unspecified. B5's continuous run may carry a 2019 lot; a chain that starts flat cannot fund it mid-trade, which creates a preservation artefact. Fix: run F20's pick from 2016-01-04 and measure from the 2019-12-31 liquidation mark.
   - (b) Define book identity: a book with the same id and vector in both years continues deciding. Only absent books become runoff.
   - (c) Reset is compared with continuous B5, so friction and lost carry fall on one side only. Compare against B5 under reset.
   - (d) Reset mechanics: say what happens to a lot filled at the final closing print, to a session with no closing print (label it a non-executable liquidation mark at `sClose`), and to a pending SWITCH-SALE, SWITCH-BUY or WAIT at reset.
   - (e) A P4 WAIT carried across the boundary blocks new-configuration decisions; state this and count it.

13. **MINOR. Gates (§6).** Both are causal: reference highs use sessions s−L…s−1 (`computeReferenceHighs`), and activation is stamped at the completed minute.
   - G1 needs times, not sessions: `Setup.endIndex` is a session index. Define the armed or pending interval as [activationTime, the virtual fill event].
   - G2: "previous session's close" means `sClose[s−1]`. State that G2 never refuses on a deep book with s < max(L, armStart).

14. **NOTE/MINOR. Shadow semantics (§5.8; brief §3).** Traces are independent of funding (`ShadowBook` never reads the account), which is valid and matches frozen B5.
   - But the brief says "preemption can change future signals"; here it cannot.
   - A preempted shallow book stays virtually long and cannot signal until its virtual exit.
   - A profitable virtual exit opens its continuation window even though its funded lot was sold at a loss.
   - Fix: state this as the chosen state machine. Measure the idle minutes after a deep lot exits while the preempted virtual trade is still open. Put funded-path reset under future hypotheses.

15. **MINOR. Financial identities incomplete (§7).** Add these checks:
   - lot intervals are disjoint;
   - every sale→purchase gap is ≥ 60 s (P2L: never the same auction print);
   - at most one of {lot, reservation, switch, wait} exists at any event;
   - a mirror's entry is after the virtual fill (else it is the exact lot), and its exit equals the virtual exit;
   - shallow + exact-deep + mirror + forced-sale nets sum to realized;
   - interest days ≤ held calendar days;
   - forced friction is reported separately;
   - occupancy is measured on the shared calendar's regular-session minute grid, not on a symbol's sparse bars.

16. **MINOR. Topics the brief requires in ENGINE_CONTRACT (§9) are missing.**
   - Insufficient cash: say it does not apply (fixed principal, no margin model).
   - Distribution adjustment: price-only, split-adjusted, only splits up to the door end.
   - A warm-up fixture.

17. **MAJOR. Fixtures and parity are insufficient (§9; PROTOCOL §13).**

   Missing fixtures:
   - finding 1, both cases;
   - an intrabar own stop in the sale bar after a P2 fill-test abort;
   - a Friday-to-Monday and a holiday sale (extra interest in both tests);
   - an early-close session, a session with no closing print, and the 15:58/15:59 closing-print boundary for the sale and the purchase;
   - P2L: same-minute replacement allowed, auction abort, own-exit auction abort, replacement filling before the sale, no reservation cancel;
   - P4: net ≥ 0 at the decision, WAIT superseded by an own exit, stale-wait, a D=1 deadline over a weekend;
   - P3 with net exactly −B;
   - two deep decisions in one minute (the second is refused; under the deep-path filter the first is declined and the second accepted);
   - a deep decision during another switch's SWITCH-BUY;
   - a shallow fill at the same bar time as a deep decision (the HELD path, not a cancel);
   - G1 with a deep setup filled earlier in the session; G2 at the first bar;
   - a frozen-tie vs tier-tie difference (a shallow symbol sorting before a deep one);
   - shadow divergence (continuation window opened by the virtual exit; a new signal only after the virtual exit);
   - end of window with each pending state;
   - chained: the same book in both years, a runoff mirror lot, a switch pending across the boundary, the reset cases;
   - mirror management where the virtual is in profit and the mirror at a loss.

   Missing parity requirements:
   - P0 equals the frozen `replayFixedPool` for B5, B4 and B1 at 0/2/5/10 bps, and for random distinct-symbol pools with shallow-band books in frozen-tie mode: every lot, refusal, signal record, mark, and minute and daily drawdown;
   - the P2L parity in finding 3;
   - fast vs reference with quotas per branch (executed, declined, aborted, superseded, cancelled-reservation, stale-replacement, stale-wait, P4 deadline, gate refusal, same-symbol, overnight, closing-print, orphan-mirror; each ≥ 10) and per policy;
   - fast vs reference re-run on every sealed verdict object's chained carry and reset accounts after the seals (cheap, and no leakage);
   - metamorphic tests: a shallow book that never trades reproduces B5 exactly; permuting the input order of books changes nothing;
   - the reference must share no allocator or switch helpers with the fast path, only frozen modules.

**Checked and sound:**
- **Selling at the first trade at or after the decision:** causal.
- **Supersession at a bar's open:** sound, because both sales are at the same print.
- **Reservation cancel:** sound.
- **Interest:** no double interest on switch days; the date-difference convention matches `FixedLedger`.
- **Cash and costs:** no phantom cash, and the same cost formula applies to exact and mirror lots.
- **Marks:** monotonic across mid-session switches.
- **Calendar:** every session has at least one bar and calendars are asserted identical across symbols, so a sale is never more than one session away.
