# Reference-engine author's notes (independent context)

Written 2026-10-29 (UTC) by the agent that wrote `src/study3-vgt-momentum-stage1b/reference.ts` under
`reviews/REFERENCE_AUTHOR_BRIEF.md`. Specification read: `ENGINE_CONTRACT.md` (sha256 `7eed7cc0…d123cde`),
`PROTOCOL.md` v1.2 (sha256 `aa255bc9…3d76f6c`; all sections, with §2–§5 and §12 as the brief's governing context),
Stage 1's `PROTOCOL.md` (§3 in particular), `types.ts` (sha256 `722ef34b…170790b95c`), `context.ts`,
`tests/synthetic.ts`, `EXPERIMENT_MATRIX.json` (for the exit-rule wording only), and the permitted imports
(`signals.ts`, `features.ts`, D1's `firstTradeFrom`/`firstTradeAfterDecision`/`priceAt`/`timeAt`, `Tracker`, the
`Dataset` type and Stage 1's fixture builders). Not opened: the fast engine and every other file of
`src/study3-vgt-momentum-stage1b/`, `src/study3-vgt-momentum/engine.ts` and `reference.ts`, and anything under `data/`.
I ran no Stage 1 or Stage 1b engine code. `tests/synthetic.ts` imports `mulberry32` from Stage 1's engine, so my scratch
tests loaded that module without my reading it.

The reference (`reference.ts`, sha256 `87db69f6d96cbe066c248c3be0ea74572b7d6622b82a79f47825196f34e6d3fd` as first
delivered; for the current version see "Amendment A1 applied" at the end) exports `referenceRun(ds, schedule, options): RunResult`. It is an explicit event simulation over sessions and minutes:

- **Ledger:** principal cash M, per-trade loan segments split at trims, net-debit account-interest segments split at
  every fill, and flat periods.
- **Orders:** explicit objects for the pending entry, the close-decided exit or transition, the trim and the conversion.

ZR (C-ALR) runs through its own segment path.

## Precedence I applied

- The contract governs field by field.
- Where its text is ambiguous, I took the reading most consistent with PROTOCOL.md.
- Where it plainly conflicts with PROTOCOL.md, PROTOCOL.md governs (PROTOCOL.md's own precedence rule) and the
  conflict is listed under "Suspected contract defects" below.
- I did not guess at what the fast engine does.

**Two choices below (N2 and N10) differ from the contract's most literal text.** Check the fast engine on these two
points before the parity stage.

## Readings and choices (cited in the code as [Nn])

- **N1. Run frame.**
  - A `Policy` schedule means `[{ index: e, policy }]`.
  - The first item must have index e, and later indices must increase; otherwise the reference throws.
  - Item i > 0 is processed after the close processing of its own session.
- **N2. Minute marks at fills (contract §8 "every fill as stated in §2" against PROTOCOL.md §3.3 "at each fill").**
  - §2 states marks only for exits:
    - the flat mark at `timeAt(s, k)` after a step-1 exit;
    - the flat mark at `bTime[k]` (the trigger minute) after a resting or fill-bar stop.
  - PROTOCOL.md §3.3 and Stage 1's PROTOCOL.md §3 mark "at each fill". I therefore also mark after every other fill,
    at the fill's price and time:
    - entries (`timeAt(s, k)`, p = raw fill);
    - trims (p = the raw trim price);
    - conversions (p = x);
    - ZR resets (one mark per reset at `timeAt(s, k0)`, p = raw, after the whole close-and-reopen, which is one fill
      of the traded difference).
  - An entry-fill mark sits below the preceding flat mark by the entry friction, so it can deepen a minute drawdown
    whose trough is at a re-entry. Fixture H8 below: flat 0, then entry friction, then the bar closes up; minuteDd =
    the entry friction.
  - **The literal alternative:** marks only at exits (and, for ZR, only minute closes and closes, as §10 lists). To get
    it, delete the four `fillMark` calls.
- **N3. Run tracker.** `new Tracker(0, sCloseTime[e])`. A window tracker is `new Tracker(mark_b, sCloseTime[b])`.
  - Both receive every mark after their start.
  - A close mark at b goes to the window that ends at b.
  - `markSink` receives every run-tracker mark.
- **N4. MAE/MFE.**
  - Updated only in step 6 (long, k < count, from the fill bar on).
  - A trade stopped at bar k does not include bar k's low or high. A fill-bar stop keeps MAE = MFE = the fill price.
  - This is the contract's literal order: steps 3 and 4 come before step 6.
- **N5. Daily rows and events are returned only when `recordDaily` is set.** Event conventions:
  - **Fills:** one event per fill. `shares` is unsigned (shares traded) and `cash` is signed.
  - **Exits:** a close-decided exit or stop is kind `exit`. An exit whose reason is `transition` is kind
    `transition`.
  - **Conversions:** one `conversion` event, for the new trade's id, after both legs:
    `shares = |S' − S|`, `cash = value − new principal`.
  - **ZR:** a reset is an `exit` event (cash = priceGain + B₀) followed by an `entry` event
    (cash = −(B₀ + friction)).
  - **End:** a final `end` event (bar −1) records a hypothetical liquidation at C_end:
    - `cash = S C_end (1 − c)`, and M after that cash;
    - S = L = G = 0;
    - `interest = A(end)`, so its mark equals `endLiquidation`.
  - `interest` on any event is the account interest A at the event's session after the fill (in fixed-slot mode,
    Σ trade interest).
- **N6. Intraday reference (§2 step 5).**
  - It is updated at every minute where step 5's outer condition holds (flat, no pending entry, active, k < count,
    the active policy intraday), even when firing is not allowed. So it accumulates from the exit minute itself,
    because step 5 follows step 3 at the same k.
  - High mode tests before updating.
  - The minute rule also requires no entry earlier in the session.
  - An exit at the closing print leaves a high reference at Hc or −∞ with no minute folded in.
  - A minute decision that completes exactly at the close gets −1 from `firstTradeAfterDecision` and becomes a
    `minute` pending entry, filled at the next session's opening trade as an opening fill.
- **N7. Delayed stop fallback.** When `firstTradeFrom(s, bTime[k] + 60d)` is −1, the fill is the last minute's close.
  - The trade's `exitBar` is that last minute (count − 1) and `exitTime` its bar time.
  - The flat mark stays at `bTime[k]`.
- **N8. Trade interest.** The trim bookkeeping that the contract labels "fixed-slot bookkeeping" (accrued, segStart)
  is the trade-interest ledger of §8. It is applied in both modes.
- **N9. XP / X6b `sessions` hurdle.** The contract writes "rate T/252". PROTOCOL.md §4.2 says "Stage 1's hurdle rate"
  and Stage 1's §10 says "X6b's 0.11 constant is fixed".
  - I use the constant 0.11, so it is independent of `options.rate`.
  - The `financing` hurdle uses `options.rate`.
  - The two readings differ only when the rate is not 0.11 (X6b is parity-only).
- **N10. XS arming (contract §5 "floorArmed := true if floor out[s] = 0" against PROTOCOL.md §4.2 and the matrix:
  "armed only after a held close with C > F(1−b)").**
  - The two differ at C = F(1 − b) exactly, which happens with b = 0 when a close equals the swing-low close. They
    also differ before the first confirmed swing low, where OUT is 0.
  - Following PROTOCOL.md, I arm only when C_s > F(1 − b) with F defined. The structural exit still uses
    `signalsOf`'s E05 OUT array.
  - F comes from a restatement of E05's close zigzag. On every run, the reference checks that the restatement
    reproduces `signalsOf`'s OUT for every session, and throws if not.
  - The arming test runs only when none of own out, trend or damage has matched (the contract's order).
- **N11. Ties between stop components.** Components are compared with a strict > in the contract's listed order: hard,
  trail, catastrophic, vol, ratchet, retain, giveback (XRD, then Z3), exp. On equal values the earlier one keeps the
  name, so `hard` beats `trail` at the fill when h = t, as in B-D1T.
  - `stopCore` and its component change only when the core strictly rises.
  - `d1net` names the level only when d1 > stopCore.
- **N12. The next session's level is computed at every long close.**
  - This includes a close that decides an exit: that level is the one the next open's gap check and `stopLevel`
    use.
  - It also includes the end close.
  - Trims are decided only when no exit is decided and s < end.
- **N13. An open trade at the end (§4 End of run).**
  - Fields as listed in §4 End of run. `exitIndex` and `exitBar` stay −1 and the reason stays `open`.
  - Unlisted fields are filled as a valuation at the end close:
    - `exitTime = sCloseTime[end]`, `exitPrice = C_end (1 − c)`, `exitShares = S`;
    - `stopLevel` = the level in force;
    - `sessionsHeld = end − entry + 1`, `calendarDays = Δdays(entry → end)`;
    - `highClose`, `maeLow`, `mfeHigh` as they stand.
  - `RunResult.realized` = Σ closed trades' nets only.
  - Pending orders at the end are not executed.
- **N14. Trade fields before any held close.**
  - `peakProfit` starts at −∞ (the position's initial value) and is set at held closes. It stays −∞ for a trade that
    entered and exited within one session.
  - `peakGross` starts at 0.
  - Before the trade closes, `exitTime`, `exitRaw`, `exitPrice` and `stopLevel` are NaN.
- **N15. Conversions.**
  - **Old trade:** it closes with reason `conversion`, `stopComponent` '', shortfall 0, and `gapFlag` `gap` if
    gapped. It opens no campaign and counts no re-entry opportunity (PROTOCOL.md §4.3: "a campaign is alive after an
    exit other than an own-OUT exit, a transition or a conversion"; §7.2: opportunities are exits with the campaign
    alive).
  - **New trade:** structural level = the new policy's event level at b, or NaN; permHigh −∞; a new campaign id.
  - **Fallback:** a pending conversion that the old position's stop pre-empts sets active := new before the
    campaign rule. The campaign then ends, and that exit session becomes the adoption close.
- **N16. `transitions` records.**
  - At the boundary b: `continue-old` (S2 long) and `adopt-flat` (flat).
  - At fills: `transition` only for an exit whose reason is `transition`, and `conversion` at each conversion.
  - Not recorded: an S1 exit that keeps the old policy's decided reason, an S1 transition pre-empted by a stop, and
    an S3 conversion that fell back.
  - `detail` is `"<old id> -> <new id>"`; the contract does not define it.
- **N17. Boundaries.**
  - A boundary is skipped when the new policy's id equals the active policy's id.
  - At a flat boundary, `decideFlat(old, b)` has already run in b's close processing, and any entry it chose is
    cancelled before `decideFlat(new, b)`.
  - Under S2, campaign ends and adoption closes are decided by comparing policy ids. A position whose policy becomes
    active again at a later boundary is therefore treated as the active policy's position.
- **N18. Gap relabelling.**
  - A pending close-decided exit becomes `stop gap` only at k = 0 (bOpen ≤ level), and a transition is flagged `gap`
    only at k = 0. Both follow the contract.
  - With a delay, an execution at open + d at a price at or below the level keeps its decided reason.
- **N19. Windows.**
  - Only boundaries with e ≤ b < end are used.
  - Each window's daily statistics, `peakGross` (from 0), `sessions` and `sessionsLong` count s > b. Dollar-days count
    s from b to the window's last session − 1.
  - `interest` = A(end of window) − A(b). In fixed-slot mode A = Σ trade interest, including the open trade's.
  - The last window's `endLiquidation` is the end row's liquidation mark. It equals the run's `endLiquidation` up to
    rounding (~1e−10).
- **N20. Trims.** A pending q ≤ 0 is not executed, so Z1/Z2 never buy. q = min(pending q, S).
- **N21. Drawdown statistics.** `DrawdownStats` is the `types.ts` subset of `Tracker.stats()`:
  - `peakTime` = the episode's peak time;
  - `troughTime`, `peakValue`, `troughValue` and `maximum` as in `Tracker.stats()`.
- **N22. ZR.**
  - The reset price is `priceAt(s, k0)`, which is bOpen[k0] for any minute.
  - **Closed segment:** `exitPrice` = `exitRaw` = raw, `stopLevel` −∞, `sessionsHeld = s − start + 1`.
  - `highClose` = the maximum of raw and the held closes.
  - `peakProfit` (at closes) = S(C − basis) − segment friction − I_seg.
  - **Open segment at the end:** `exitPrice = C_end (1 − c)` and `proceeds = net + principal + interest`.
  - A ZR session is processed even when the account is flat; the first reset is at e + 1.
- **N23. ZR counters.**
  - Every segment is `kind` `first`, `rule` `resize`, campaign 1.
  - `campaigns` = 1 once a segment opens; `reentries` = `reentryOpportunities` = 0.
- **N24. ZR in a multi-item schedule is undefined (§10)**, and the reference throws.
- **N25. Pending orders when the delayed bar is −1** (no minute at or after open + d and no closing print). They stay
  pending; nothing clears them. This cannot happen on regular sessions with d ≤ 5.

## Suspected contract defects or contradictions

1. **§8 "every fill as stated in §2" against PROTOCOL.md §3.3 / Stage 1 §3 "at each fill"** (and §10's ZR mark list).
   - §2 states marks only for exits.
   - This decides whether entry, trim, conversion and ZR-reset fills enter the minute drawdown. That is a parity-level
     difference (|Δ| up to the fill friction), not rounding. See N2.
2. **§5 XS arming "floor out[s] = 0" against PROTOCOL.md §4.2 / the matrix "C > F(1−b)".**
   - They differ at equality (reachable with b = 0) and before the first confirmed swing low. See N10.
3. **§5 stall: "hurdle = rate T/252 (`sessions`)"** leaves open whether rate means the run's rate or Stage 1's fixed
   0.11 (PROTOCOL.md §4.2 and Stage 1 §10 point to the constant). See N9.
4. **§4 "Campaign after a close" does not list `conversion`.** §6 sets campaign := none afterwards. Applied literally,
   §4's rule would first count a re-entry opportunity at a conversion (the old policy is still active at that moment).
   PROTOCOL.md §4.3/§7.2 exclude conversions. See N15.
5. **§4 labels the trade-interest updates at a trim "fixed-slot bookkeeping"**, although §8 (and PROTOCOL.md §3.2)
   apply trade interest in both modes. This is harmless if read as both modes. See N8.
6. **§4 End of run** does not specify `exitTime`, `exitPrice`, `stopLevel`, `sessionsHeld`, `calendarDays` or
   `exitBar` for an open trade. Nothing specifies `peakProfit` or `peakGross` for a trade that never saw a held close,
   or the transition-record `detail`. These are unspecified rather than wrong. See N13, N14, N16.
7. **§2 step 1 relabels `stop gap` only at k = 0.** PROTOCOL.md §3.1 says "a close-decided exit executing at an
   opening trade ≤ the level is recorded as a gap stop". Under a delay, PROTOCOL.md defines the opening trade as
   open + d. I followed the contract, reading "opening trade" there as bar 0, consistent with PROTOCOL.md's "bar-0
   exit" wording. This only matters with a delay and a gap between minutes. See N18.
8. **§2 step 6 "unless the trade entered this session at a later bar than k" can never apply**: a position that is
   long at k entered at or before k. It is harmless.

## Self-tests (scratch, outside the repository: `/tmp/claude-1000/ref-author/`)

- **Hand-checked closed forms:**
  - entry, stop at the level and interest;
  - R3F re-entry;
  - net-debit flat interest;
  - a bar-0 gap with `level above prior close`;
  - a fill-bar stop;
  - a delayed stop inside the delay, and the delayed fallbacks (closing print / last minute's close);
  - a Z2 trim and its repayment;
  - S1/S2/S3 records;
  - both S3 branches;
  - an identical re-selection;
  - E09 minute fills (same session, delay, decision at the close carried to the next open with opening slippage,
    cancelled at a flat boundary);
  - an E10 re-entry above the exited trade's Hc;
  - RS cross from below;
  - a trim skipped on a gap-down open, and trim + same-session stop;
  - the ZR friction, price gain and interest;
  - the entry-fill mark in the minute drawdown (N2);
  - strict XS arming at equality (N10).
- **Sweep:** 3,420 single-policy runs over 15 entries × 19 exit specifications on four synthetic markets
  (`syntheticMarket`, `randomWalk`). They cycle the 10 re-entry rules, Z0/Z1/Z2/Z3, delays 0/1/5, stop, entry and
  opening slippage, and windows. On every run:
  - PROTOCOL.md §3.2 identities (i), (ii) (both forms, with price gain and friction recomputed from fills), (iii),
    (v), (vi) (Σ fill mark changes = −Σ friction) and (vii) hold;
  - daily liquidation = mark − G c;
  - at most one entry per session and none in an exit session;
  - **every trade field and the path hash are identical in net-debit and fixed-slot mode**;
  - prefix invariance holds (a run ending at an earlier session reproduces every trade closed by then and the first
    window's increment).
- **Schedules:** 2,886 schedule runs: 480 four-policy schedules (with identical re-selections) × S1/S2/S3 × both modes,
  with delays, plus ZR (both modes, delays 0/1/5). The same identities and mode independence hold. Two executability
  checks pass:
  - every entry is by the policy active when it was decided;
  - outside S2, no old-policy position survives b + 1.
- **Branch coverage observed:**
  - every stop component binding;
  - every exit reason;
  - every re-entry rule firing;
  - `gap` and `level above prior close`;
  - trims with L → 0;
  - closing-print exits;
  - both S3 branches;
  - S2 across two boundaries;
  - transition gaps.
- **Further checks:** `markSink` replays to the same minute drawdown. The end row's liquidation − realized equals the
  open trade's net (§9).
- **Timing:** about 4 ms for a 1,010-session × 390-minute run.

## Amendment A1 applied

Applied on 2026-10-29 (UTC), after `AMENDMENTS.md` A1 (2026-10-29T00:19:04Z, pre-outcome) was written. It was applied
under the same independence rules: I did not open the fast engine or any other forbidden file. `reference.ts` is now
sha256 `50d34873d64d5513320585c46da97fe6ef0dd97a1cf25edd56988cedbb96c539`. A1 supersedes the earlier choices as
follows.

- **A1.1 supersedes N2 and suspected defect 1.**
  - Entry, trim, conversion and ZR-reset fills are no longer marked; the `fillMark` helper is gone.
  - Fills that leave the account flat are still marked as contract §2 states. These are stops (at the trigger minute
    `bTime[k]`), close-decided exits and transitions (at `timeAt(s, k)`), and fill-bar stops.
- **A1.2 supersedes N10 and suspected defect 2.**
  - XS is armed at a held close where E05's OUT (from `signalsOf`) is 0.
  - The restated zigzag and its cross-check are removed.
- **A1.3 confirms N9 and settles suspected defect 3.** No change: the `sessions` hurdle stays 0.11 × T/252.
- **A1.4 supersedes N23's labels.**
  - The first ZR segment is kind `first`, rule `fresh`; later segments are kind `reentry`, rule `resize`.
  - The counters are unchanged, because A1 says nothing about them: `campaigns` = 1, `reentries` = 0,
    `reentryOpportunities` = 0.
- **A1.5 confirms N15 and settles suspected defect 4.** No change: a conversion counts neither as a re-entry
  opportunity nor in `reentries`.
- **A1.6 supersedes part of N13 and confirms N14.**
  - An open trade's `exitTime` is now NaN; it was `sCloseTime[end]`.
  - These were already as A1.6 states: `exitIndex` = `exitBar` = −1, `exitRaw` = C_end, `exitPrice` = C_end (1 − c),
    `stopLevel` = the level, `sessionsHeld` = end − entry + 1, and `peakProfit` −∞ / `peakGross` 0 until the first
    held close.
  - This applies to both the regular open trade and the open ZR segment.
- **A1.7 confirms N19.** No change: a window's dollar-days already counted s from b, so the overnight b → b+1 goes to
  the window (b, e].

### Self-tests rerun after A1

These are the same scratch tests in `/tmp/claude-1000/ref-author/`, with expectations updated where A1 changes
behaviour:

- **Fixture H8:** the minute drawdown no longer contains the entry friction. It is now one day's interest.
- **Fixture H9:** arming at C = F (OUT 0) triggers the structural exit one held close earlier.
- **New checks:** ZR labels and the open-trade fields.

Results:

- 3,420 single-policy runs and 2,886 schedule and ZR runs pass every identity check, both financing modes agree on
  every trade field, prefix invariance holds, and the executability checks pass.
- All hand cases pass.
- `npx tsc --noEmit -p .` reports no errors, and the file passes prettier.
