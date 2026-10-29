# ENGINE CONTRACT — the exact run semantics both Stage 1b engines implement (part of the protocol freeze)

This file makes PROTOCOL.md §3–§5 operational for an independent implementation. It is frozen with the protocol;
where it is more specific than PROTOCOL.md it governs the engines; where they conflict PROTOCOL.md governs and the
conflict is a defect. The interface is `src/study3-vgt-momentum-stage1b/types.ts`
(`run(ds, schedule: Policy | ScheduleItem[], options: RunOptions): RunResult`). Entry signals come from Stage 1's
`signalsOf(new Features(ds), policy.entry, policy.entryParams)` (`src/study3-vgt-momentum/signals.ts`, frozen); fills use
D1's `firstTradeAfterDecision`, `firstTradeFrom`, `priceAt`, `timeAt` (`src/shared-margin-portfolio/strategy.ts`); the
drawdown tracker is `Tracker.updateStrict` (`src/multi-etf-allocator/engine.ts`). Constants: B₀ = options.principal;
c = costBps/10⁴; a year = 365 × 86,400 s; days = Δ `ds.sTime` / 86,400.

## 1. Run frame

- Sessions s = e … end (e = firstDecisionIndex, end = endIndex). Session e has no minute processing (only its close).
  Accounting starts at e's close with mark 0. A schedule's first item must have index e; item i > 0 switches at the
  close of `item.index`.
- Signals by kind: **level** (state ∈ {0,1}); **event** (trigger, optional out, optional level); **intraday** (mode
  low/high, y, out); **none** (C-ALR, C-IDLE: never enter, except ZR below).
- ownOut(s): level → state[s] = 0; event with `level` array → C_s < the position's or campaign's recorded level; event
  or intraday with `out` → out[s] = 1; otherwise false. fresh(s): level → state[s] = 1; event → trigger[s] = 1; else
  false. C_s = `ds.sClose[s]` (the closing print, or the last minute close without one, as Features defines it).

## 2. Per session s > e — the minute loop k = 0 … count (k = count is the closing print)

Let `delayed` = 0, or with delay d > 0 `firstTradeFrom(ds, s, bTime[start] + 60d)`.
- exitBar = delayed if long and a close-decided exit, transition or conversion is pending, else −1; entryBar =
  delayed if flat with a pending entry (an `open` entry, or a `minute` decision carried from the previous session),
  else −1; trimBar = delayed if long with a pending trim.
- The loop runs only if long, or entryBar ≥ 0, or (the active policy is intraday, its reference is active and no entry
  is pending). For each k, in this order:
  1. **k = exitBar:** a pending conversion executes (§6 S3) and then, if k is not the print, the new position's
     fill-bar check (step 4's low test) applies; otherwise the pending exit executes at `priceAt(s, k)`: reason
     `transition` if a transition, else `stop gap` if k = 0 and bOpen ≤ the current level, else the pending reason; it
     is an opening fill. After it, a minute mark of the flat account is taken at `timeAt(s, k)`.
  2. **k = trimBar** and still long: if k is the print or bOpen > level, sell q = min(pending q, S) at `priceAt(s,k)`
     as an opening fill (§4); the pending trim is then cleared either way.
  3. **Resting stop** (long, k < count, k ≠ exitBar): if bOpen ≤ level → stop at the open (reason `stop gap` if k = 0
     else `stop`; opening fill iff k = 0); else if bLow ≤ level → `stop` at the level. With a delay the fill is at
     `firstTradeFrom(s, bTime[k] + 60d)` (its `priceAt`: a later minute's open, or the closing print), or, if that is
     −1 (no later minute and no closing print), the last minute's close at its bar time.
     After a stop the pending exit is cleared and a flat minute mark is taken at bTime[k].
  4. **k = entryBar**, flat, no exit and no entry yet this session: open the position (§3) at `priceAt(s, k)`; the
     pending entry is cleared; it is an opening fill iff it came from a pending order (not a same-session minute
     decision). If k < count and bLow ≤ the new level → `stop` at the level (delayed as in 3) and a flat mark.
  5. **Intraday rule** (flat, no pending entry, reference active, k < count, the active policy intraday): allowed iff
     no entry this session, s ≥ triggerFrom, and not (campaign alive and rule RN). Mode low: ref = min(ref, bLow) then
     fire if bClose ≥ ref × (1 + y). Mode high: fire if bClose > ref × (1 + y), then ref = max(ref, bHigh). On fire:
     decision time = bTime + 60 + 60d; the reference is deactivated; fill = `firstTradeAfterDecision(s, time)`; if ≥ 0
     entryBar := fill (same session, not an opening fill), else a `minute` pending entry for the next session. Kind =
     reentry if a campaign is alive, else first. Rule `minute`.
  6. **Marks** (long, k < count): unless the trade entered this session at a later bar than k, MAE = min(MAE, bLow),
     MFE = max(MFE, bHigh); then a minute mark at bTime[k].
- Intraday reference state: at the run start it is active for an intraday first policy with ref = +∞ (low) or −∞
  (high), folded over all of session e's minutes, and triggerFrom = e + 1. After any exit (stop or decided) of a
  position, if the **active** policy is intraday: ref := +∞ (low) or (high) the exited trade's Hc if the exited
  position's policy is the active policy, else −∞; triggerFrom := exit session + 1; the reference is active. It is
  deactivated whenever an entry becomes pending.

## 3. Entries, campaigns, the position

- A pending entry is created at a flat close (§5) or by the minute rule. On opening at raw x: if the entry is `first`
  or no campaign is alive, a new campaign is created (campaigns += 1); otherwise it is a re-entry of the alive campaign
  (reentries += 1). Buy price = x (1 + entrySlip) (1 + c) (1 + openSlip if opening); S = B₀ / buy price; principal = L =
  B₀; trade friction starts at B₀ − S x; M −= B₀. The campaign object is then dropped (it lives inside the position).
- Position state: E = x; Hc = x; MFE = MAE = x; level = the entry's recorded structural level (event `level` array at
  the decision close, or the campaign's level for a rule re-entry; NaN otherwise); stopCore = −∞; vol level = −∞;
  ownCount = 0; ownOutSeen = false; permExpired = false; permHigh = −∞ for a first entry, the campaign's permHigh for a
  re-entry; floorArmed = false; lastHigh = entry session; peakProfit = −∞.
- The stop at the fill: components (§7) evaluated with Hc = x and the ATR of s − 1.

## 4. Exits, trims, settlement

- Sell price = raw (1 − stopSlip if a stop or stop gap) (1 − c) (1 − openSlip if opening).
- **Trim** at raw y of q shares: price p = sell price (no stop slippage, opening); proceeds P = q p; fixed-slot
  bookkeeping: accrued += L r Δdays(segStart → s)/365, segStart := s; repaid = min(L, P); L −= repaid; trimCash += P −
  repaid; S −= q; trade.proceeds += P; priceGain += q (y − E); friction += q (y − p); M += P (net-debit: interest
  accrued to s first, then the segment base changes).
- **Close (all shares) at raw y:** value = S × sell price; trade: exitIndex/Bar/Time, exitRaw = y, exitShares = S,
  exitPrice = sell price, reason, stopComponent (the component that set the level, stops only), stopLevel = level,
  proceeds += value, priceGain += S (y − E), friction += S y − value, interest = I_trade(s), net = proceeds −
  principal − interest, sessionsHeld = s − entry + 1, calendarDays, highClose = Hc; for stops shortfall = level − y and
  gapFlag = (reason `stop gap`: `level above prior close` if C_{s−1} < level else `gap`); a `transition` at k = 0 with
  bOpen ≤ level has gapFlag `gap`. realized += net; M += value.
- **Campaign after a close:** it ends (no campaign) if the reason is `own out` or `transition`, or the position's
  policy is not the active policy, or (rule RPM ? permExpired : ownOutSeen); otherwise reentryOpportunities += 1 and a
  campaign is alive with stoppedHigh = Hc, stopAtExit = the level in force, trough = +∞, exitIndex = s, the position's
  level and permHigh, belowStop = false, failedBefore = false.
- **End of run** with a position: valued at C_end (1 − c) — exitRaw = C_end, exitShares = S, proceeds += S C_end (1 − c),
  priceGain += S (C_end − E), friction += S C_end c, interest = I_trade(end), net = proceeds − principal − interest;
  exitIndex stays −1. Flat at the end (net-debit): the unbooked flat interest is booked (§8).

## 5. The close of session s

- **Long:** a minute mark at sCloseTime with the close mark; if C_s > Hc then lastHigh := s; Hc = max(Hc, C_s);
  own = ownOut(s); if own, ownOutSeen = true; ownCount = own ? ownCount + 1 : 0; under RPM: permHigh = max(permHigh,
  C_s) and permExpired := true if C_s < SMA200_s or C_s ≤ 0.85 permHigh; P_s = trimCash + S C_s − L − I_trade(s);
  peakProfit = max(peakProfit, P_s); trade.peakProfit = peakProfit; trade.peakGross = max(trade.peakGross, S C_s).
  Exit decision, first match: `own out` (exit.own and ownCount ≥ ownConsecutive (default 1)); `trend` (trendLow N and
  C_s < min(C_{s−N..s−1})); `damage` (D_p = C_s ≤ Hc(1−p); D_t = N > 0 and C_s < min(C_{s−N..s−1}); AND if mode 1 or
  (mode 2 and C_s > SMA200_s), else OR); then, if none: `structural` (floor out[s] = 1 and (not armed-mode or
  floorArmed)); then floorArmed := true if floor out[s] = 0; then `stale` (s − lastHigh ≥ U and C_s ≤ Hc(1−d)); then
  `max hold` (s − entry + 1 ≥ M); else `stall` (s − entry ≥ T and C_s < C_{s−T}(1 + hurdle + m) and C_s ≤ Hc(1 − d);
  hurdle = rate T/252 (`sessions`) or L r Δdays(s−T → s)/365 / (S C_{s−T}) (`financing`)). A decided exit is pending
  for the next open. Otherwise, if s < end: Z1 — if month(date_s) ≠ month(date_{s−1}) and S C_s > B₀(1 + band), pending
  trim q = S − B₀/C_s; Z2 — if S C_s ≥ B₀(1 + u), pending trim q = S − B₀(1 + v)/C_s. Then the next session's level (§7).
- **Flat and no pending entry:** decideFlat (below) with the active policy.
- **decideFlat(policy, s):** if a campaign is alive: it dies if (RPM: C_s < SMA200_s or C_s ≤ 0.85 max(permHigh, C_s);
  else ownOut(s) with the campaign's level); else trough = min(trough, C_s), permHigh = max(permHigh, C_s). Then
  reclaimed := alive and belowStop and C_s > stopAtExit; if alive and C_s ≤ stopAtExit, belowStop := true. If s = end,
  stop. If alive: fresh = (event and trigger[s] = 1); ok by rule — R0 true; RC10 s − exitIndex ≥ 10; R3F C_s >
  stoppedHigh; RP50 C_s ≥ trough + 0.5 (stoppedHigh − trough); RS reclaimed; RFL the E05(θ 0.05, b 0.005) trigger[s] =
  1; REF: efficient = ER_30 ≥ 0.3 and A_30 ≥ 0.11 (Features `efficiency(30)`, `annualisedReturn(30)`), ok = efficient
  and failedBefore, then failedBefore := true if not efficient; RPM C_s > max(C_{s−10..s−1}); RN, RF false. If ok: a
  re-entry (rule = the rule's ID, the campaign's level); else if fresh and rule ≠ RN: a re-entry with rule `fresh` and
  the trigger's level. If no campaign is alive and fresh(s): a first entry (rule `fresh`). A chosen entry becomes the
  pending `open` entry and deactivates the intraday reference. A first entry chosen at the **adoption close** has rule
  `adoption` instead of `fresh`; the adoption close is e at the run start, b at a flat boundary (§6), and the exit
  session of a position whose policy is no longer the active one (S1 transition, S2, or a delayed S3 that fell back).

## 6. Boundaries (schedule item i at session b), after the close processing of b

Skip entirely (under S1, S2 and S3) if the new policy's id equals the active policy's id: position, pending orders and
campaign continue. Otherwise the pending entry is cancelled, then:
- **Long, S2:** transition record `continue-old`; campaign := none; active := new; reference inactive. The position
  keeps its own policy (exits, stops, trims).
- **Long, S3**, no pending exit and fresh_new(b) (level state IN or event trigger; intraday never): pending conversion
  with target S' = B₀/C_b; pending exit and pending trim cleared; campaign := none; reference inactive (active changes
  at the conversion).
- **Long, otherwise (S1):** pending trim cleared; campaign := none; pending exit := the old decided reason or
  `transition`; active := new; reference inactive.
- **Flat:** transition record `adopt-flat`; campaign := none; active := new; the adoption close := b; the intraday
  reference restarts as at a run start over session b's minutes (triggerFrom = b + 1); then decideFlat(new, b).
- **Conversion** at the opening trade x (§2 step 1): gapped = (k = 0 and bOpen ≤ the old level). If S ≥ S': value =
  S' x + (S − S') × sell(x, opening); new principal = S' x, new friction 0; else value = S x; new principal = S x +
  (S' − S) × buy(x, opening), new friction = (S' − S)(buy(x) − x). The old trade closes as in §4 with reason
  `conversion` and that value (exitPrice = value / S), gapFlag `gap` if gapped; transition record `conversion`;
  campaign := none; pending trim cleared; campaigns += 1; active := new; the new trade (kind and rule `conversion`, S',
  principal, E = x, entryPrice = principal / S', its own campaign) opens as in §3 (M −= principal) but without counting
  a re-entry. A pending conversion still pending when the old position is stopped first becomes S1's adoption
  (active := new) at that exit.

## 7. Stop levels (computed at a close for the next session; at a fill with Hc = E and the ATR of s − 1)

Hh = max(MFE, Hc). Core components (take the maximum, remembering which one): hard E(1−h); trail (ref 0: Hc, ref 1:
Hh)(1−t); catastrophic Hc(1−cat); vol: d = clamp(k ATR_n[s]/Hc, dmin, dmax) (ATR undefined → dmax), vol level =
max(vol level, Hc(1−d)); ratchet: if Hc ≥ E(1+g), Hc(1−t2); retain: if Hc ≥ E(1+a), E + ρ(Hc − E); giveback (XRD's
(A, G) and, under Z3(g), (g, g)): if S > 0 and peakProfit ≥ A, (peakProfit − G − trimCash + L + I_trade(max(s, entry)))
/ S; exp: if S > 0, Hc(1 − min(t0, max(tmin, t0 (S Hc/B₀)^(−γ)))). stopCore := max(stopCore, core) (the component is
updated only when the core rises). d1net (B-D1N): if S > 0 and S × Hh(1−t) − L − I_trade(max(s, entry)) + trimCash > 0,
d1 = Hh(1−t), else −∞. Level = max(stopCore, d1); component = d1net if d1 > stopCore, else the core's.

## 8. Interest, marks, the account

- **Trade interest (both modes):** I_trade(s) = accrued + L r Δdays(segStart → s)/365 (segStart = entry session, reset
  at each trim with accrued += the closed segment). Trade nets, P_s, giveback, d1net and the XP hurdle use it.
- **Principal cash** M: −cost at entries and conversions, +proceeds at trims, exits and conversions (never interest).
- **Account interest** A(s): fixed-slot — A = Σ closed trades' interest + I_trade of the open trade; net-debit —
  A(s) = closed + base × r × Δdays(segFrom → s)/365 with base = max(−M, 0), and at every fill closed := A(s),
  segFrom := s, then M changes, then base := max(−M, 0). Carried-balance interest carried(s) = A(s) − (Σ closed trades'
  interest + I_trade(s) of the open trade) (0 in fixed-slot mode). flatInterest = Σ over flat periods of the increase of
  A while flat (each flat period is booked at the next entry, and at the end if flat); fixed-slot: 0.
- **Marks:** fixed-slot — mark = realized + (trimCash + S p − L − I_trade(s)) when long, realized when flat (Stage 1's
  arithmetic, kept for parity); net-debit — mark = M + S p − A(s) (S = 0 when flat). realized = Σ closed trades' nets.
  Liquidation mark = mark − S C c. endMark = the mark at C_end; endLiquidation = (slot) realized + the open trade's net,
  or (net) M + S C_end (1 − c) − A(end) (flat: M − A(end)). carriedInterest = carried(end).
- **Minute marks** (Tracker over the run; the window tracker too): every minute close while long, every fill as stated
  in §2, each close while long, and — net-debit only — each close while flat for s > e. minuteDd = the run tracker's
  maximum. dailyDd = max over closes of (running max of close marks, starting at 0) − mark.

## 9. Daily rows, exposure, windows, counts

- At each close (s = e … end), after boundaries: row = {mark, liquidation, shares S, loan L (0 flat), gross S C_s, cash =
  M, realized = realized − carried(s) (so that liquidation − realized = the open trade's liquidation value), openTrade id
  or 0}. If long: sessionsLong += 1, the year of s is held, peakGross =
  max(peakGross, S C_s). For s < end with days to s+1: grossDollarDays += S C_s days; loanDollarDays += L days;
  debitDollarDays += max(−M, 0) days (both modes).
- **Windows** (options.windows, those with e ≤ b < end): at the close of each b the previous window (if any) ends there
  and a new one starts: startMark = mark, startLiquidation = liquidation, a new Tracker(mark, sCloseTime[b]), window
  daily peak = mark, interest base = cumulative interest at b (slot: closed trades' interest + I_trade; net: A). For
  s > b inside the window: daily peak/dd, peakGross, sessions, sessionsLong; dollar-days for s from b to the window's
  last session − 1. A window ends at the next boundary or at end: end, endMark, endLiquidation, increment =
  endLiquidation − startLiquidation, minuteDd = its tracker, calendarDays, interest = cumulative interest − its base.
- campaigns, reentries, reentryOpportunities as in §3–§4; yearsHeld = distinct years held at a close; sessions = end −
  e; calendarDays = Δdays(e → end); transitions as in §6 (and `transition` at each transition fill, `conversion` at each
  conversion).

## 10. ZR (C-ALR), a single-item schedule whose sizing is ZR

Stage 1's always-long reference: at k0 (0, or the delayed bar) of each session s > e, if S = 0 or s starts a new month
(month(date_s) ≠ month(date_{s−1})): raw = bOpen[k0]; if long, close the segment (exit reason `resize`, exitRaw =
exitPrice = raw, priceGain = S (raw − basis), friction = the segment's friction, interest = I_seg, net = priceGain −
friction − interest, proceeds = net + principal + interest); then open a segment: S = B₀/raw, basis = raw, friction =
|S_new − S_old| raw c, a trade with principal B₀, entryPrice = raw. Trade interest I_seg = B₀ r Δdays(segment start → s)
/365 in both modes. Net-debit: M −= B₀ + friction at each open and M += priceGain + B₀ at each close, A as in §8, mark =
M + S p − A(s); fixed-slot: mark = realized + S(p − basis) − friction − I_seg. Minute marks at every minute while long and
at the close; no stop, no exit. End: priceGain = S(C_end − basis), friction += S C_end c, net = priceGain − friction −
interest; endLiquidation (net) = M + S C_end (1 − c) − A(end). carriedInterest = A(end) − Σ segment interest (net).
