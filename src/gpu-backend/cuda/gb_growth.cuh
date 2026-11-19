// gpu-backend: the Growth 1.4.0 virtual book on the device — a LINE-FOR-LINE port of the canonical CPU engine as
// Priority 3 runs it (src/vg-d1-growth-joint/books.ts simulateGrowth / runGrowthBook):
//   src/growth-trading/riseTrading.ts      simulateTrading (the minute loop, baseUntil, decide, enter, exitsAt, marks)
//   src/growth-trading/entryGates.ts       TrendGate (five methods), EntryGates (eligibility, five policies, renewal)
//   src/growth-trading/drawdownGate.ts     DrawdownRecoveryGate (observations, detection, recovery, releases)
//   src/growth-trading/optionalRules.ts    breakout scan, ATR initial stop, retention (PositionRules.evaluateSession)
//   src/growth-trading/continuation.ts     ContinuationController (classic_d1, breakout, shallow_pullback, ma_cross)
//   src/entry-signals/riseFromRecentLow.ts the Rise scanner (edge-triggered threshold crossing)
//   src/multi-etf-allocator/shadow.ts      ShadowBook (commit, open, close, finish) with its ExitManager / EntryMachine
// One GPU thread per (candidate, Growth book). The base decisions are produced lazily session by session (the CPU
// scans every bar up front; both read only bars complete at the decision), so no per-candidate decision list exists.
// Only what decides trades is kept: the decision log, opportunity and episode records, block counters and excursion
// diagnostics of the CPU engine produce no trade and are not reproduced (they are never part of a VBook).
//
// Exactness notes (each mirrors the CPU code):
// - the rolling low of the Rise scanner and the eligibility predicate, the breakout's prior high and the drawdown
//   gate's discovery maximum are minima/maxima (exact): they are read from load-time sparse tables instead of the
//   CPU's monotonic deques (identical values; ties only affect log fields such as recentLowIndex, not reproduced);
// - every moving average is the CPU's naive left-to-right sum divided by its length (never a prefix-sum shortcut);
// - Math.log / Math.exp of the regression slope are V8's own fdlibm algorithms (v8math.cuh);
// - percentages are fractions computed on the host by the CPU's own expressions (Number(`${p}e-2`), 1 + x / 100).
#pragma once
#include "gb_common.cuh"

#define GB_MAXC 8  // exit candidates per evaluation (at most 7 can exist)

enum { RU_TRAILING = 0, RU_INITIAL = 1, RU_MAXHOLD = 2, RU_BUFFER = 3, RU_TREND = 4 };
enum { TM_OFF = 0, TM_PRICE_CHANGE = 1, TM_REGRESSION = 2, TM_RISING_SMA = 3, TM_HHL = 4, TM_MOMENTUM = 5 };
enum { EP_OFF = 0, EP_TIME_LIMITED = 1, EP_MIN_STRENGTH = 2, EP_MAX_EXTENSION = 3, EP_DETERIORATION = 4, EP_RESET_RENEW = 5 };
enum { CM_OFF = 0, CM_CLASSIC = 1, CM_BREAKOUT = 2, CM_SHALLOW = 3, CM_MA_CROSS = 4 };
enum { CS_NONE = 0, CS_WATCHING = 1, CS_ARMED = 2, CS_DONE = 3 };  // episode status (DONE: ordered, filled or closed)
enum { DD_NORMAL = 0, DD_REQUIRED = 1, DD_CONFIRMED = 2 };

struct GOut {
  GbTrade* trades;
  int cap;
};

struct GExitCand {
  int rule, k, phase;
  double level;
  Decision d;
};

struct G {
  const DevSym* d;
  GbGrowthIn p;
  GOut o;
  int S, end;
  int status, errInfo;
  // ----- ShadowBook -----
  bool orderActive; int orderFillBar, orderTrade; double orderDecisionTime;
  bool orderHasAtr; double orderAtr; int orderAtrFill;  // PositionRules.checks of the pending order
  bool posActive; int posTrade, posEntryS; Decision posDecision;
  bool positionAtStart, exitedThisSession;
  double lotShares, lotInvestment, lotEntryTs, lotHoldTs, lotEntryRaw;
  // ExitManager
  double postEntryHigh, postEntryLow, stopPrice, pendingSignalTime, pendingSignalPrice;
  int stopActiveSessions, stopFirstActiveIndex;
  // EntryMachine (classic_d1 only: deep arming never fires with a NaN target)
  bool mSetup; double mTrailingLow, mReboundTrigger;
  bool mContActive; double mContHigh; int mContStart, mContWindows, mContExpiries;
  // ----- PositionRules of the open position -----
  bool rules;  // initial stop or retention ON
  bool rStop; double rStopLevel; int rStage, rFills, rCount; double rPartialNet, rPartialInterest;
  bool rPendingTrend; double rPendingTrendTime;
  bool rPendingBuffer; double rPendingBufferTime, rPendingBufferPrice;
  int ssS; bool ssDue; int ssDueBar; bool ssActive; double ssStopPrice;
  // ----- simulation -----
  double realized;
  int nTrades;
  bool gated, protectedOnly;
  // the base decision of the current session (lazily produced)
  bool decPending; double decTime, decPrice, decTrigger, decReference; int decBar;
  int risePrev;  // the scanner's C_{i-1}: -1 undefined, 0 false, 1 true
  // ----- continuation -----
  int cStatus, cFirst, cLast, cAnchor, cFormation, cNextBar, cProcessedMinute, cWindows, cExpiries;
  double cRefHigh, cTrough;
  // ----- eligibility (EntryGates) -----
  bool oLive; int oId, oSignalSession, oSignalBar, oLast; double oSignalPrice, oRecentLow, oThreshold, oMaxClose, oLastEval;
  int oCount;
  bool wActive; int wState, wLast; double wReference, wStart, wTrough;
  int gNextBar;
  int ddWaiting;  // the id of the opportunity the drawdown gate blocked last (-1: none)
  bool wakeValid; double wakeTime; int wakeSession;
  // ----- drawdown recovery gate -----
  bool ddOn;
  int ddState; bool ddCur; double ddPeak, ddTrough, ddThreshold;
  bool ddStreak; int ddStartSession, ddStartMinute, ddTargetSession;
  int ddOrigin, ddCs, ddCk, ddCp; double ddNextT;
  int ddEpochStart;
  bool ddHasLastFull; int ddLastFullSession; double ddLastFullPrice;
  bool ddLastPermissive;
};

__device__ __forceinline__ void gfail(G& g, int code, int info) { failInto(g.status, g.errInfo, code, info); }
__device__ __forceinline__ bool atOrAbove(double price, double level) { return price >= level * (1 - REL_TOL); }
__device__ __forceinline__ bool atOrBelow(double price, double level) { return price <= level * (1 + REL_TOL); }

__device__ __forceinline__ double gInterest(const G& g, double sessionTime) {
  return g.lotInvestment * g.p.rate * ((sessionTime - g.lotEntryTs) / SPY);
}
// ShadowBook.markAt
__device__ __forceinline__ double gMark(const G& g, double price, double sessionTime) {
  return g.posActive ? g.lotShares * price - g.lotInvestment - gInterest(g, sessionTime) : 0.0;
}

// sessionSma (optionalRules.ts): the naive sum of C_{s-L+1} … C_s, divided by L; ok = false before the history
__device__ __forceinline__ bool sessionSma(const DevSym& d, int s, int L, double& out) {
  if (s - L + 1 < 0) return false;
  double sum = 0;
  for (int i = s - L + 1; i <= s; i++) {
    const double c = LD(d.sClose + i);
    if (!validPrice(c)) return false;
    sum += c;
  }
  out = sum / L;
  return true;
}
// sma over the run-resolution bars (continuation.ts): NaN before the history
__device__ __forceinline__ double barSma(const DevSym& d, int end, int L) {
  if (end - L + 1 < 0) return NAN;
  double sum = 0;
  for (int i = end - L + 1; i <= end; i++) sum += LD(d.barClose + i);
  return sum / L;
}

// ===================================================================================================================
// The book (ShadowBook + ExitManager + EntryMachine as Growth drives them)
// ===================================================================================================================

__device__ int gCommit(G& g, int s, double decisionTime, double decisionPrice, int kind) {
  const int ti = g.nTrades++;
  if (ti >= g.o.cap) { gfail(g, C_TRADE_CAPACITY, ti); return -1; }
  GbTrade& v = g.o.trades[ti];
  if (ti > 0 && !(decisionTime > g.o.trades[ti - 1].dT)) gfail(g, C_BOOK_ORDER, ti);
  memset(&v, 0, sizeof v);  // every byte defined (unused fill slots included: initcheck)
  v.id = ti + 1; v.kind = kind; v.dS = s; v.dT = decisionTime; v.dPrice = decisionPrice;
  v.eS = -1; v.eK = -1; v.eT = NAN; v.eRaw = NAN; v.ePrice = NAN; v.nFills = 0; v.open = 0; v.vNet = 0; v.vInterest = 0; v.pad = 0;
  g.orderActive = true; g.orderTrade = ti; g.orderDecisionTime = decisionTime;
  g.orderFillBar = firstTradeAfterDecision(*g.d, s, decisionTime);
  g.orderHasAtr = false;
  return ti;
}

// ExitManager.onEntry on a fresh manager
__device__ void gOnEntry(G& g, int s, int fillBar, double raw) {
  const DevSym& d = *g.d;
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  double high = jsmax(raw, LD(d.sClose + s));
  double low = jsmin(raw, LD(d.sClose + s));
  for (int k = fillBar; k < count; k++) { high = jsmax(high, LD(d.bHigh + start + k)); low = jsmin(low, LD(d.bLow + start + k)); }
  g.postEntryHigh = high; g.postEntryLow = low;
  g.stopPrice = high * (1 - g.p.tsp);
  g.pendingSignalTime = NAN; g.pendingSignalPrice = NAN;
  g.stopActiveSessions = 0; g.stopFirstActiveIndex = -1;
}

// ShadowBook.open
__device__ void gOpen(G& g, int s, int k) {
  const DevSym& d = *g.d;
  const double raw = priceAt(d, s, k);
  const double price = raw * (1 + g.p.costBps / 10000);
  const double shares = 100000.0 / price;
  const double sTimeS = LD(d.sTime + s);
  g.lotShares = shares; g.lotInvestment = 100000.0; g.lotEntryTs = sTimeS; g.lotHoldTs = sTimeS; g.lotEntryRaw = raw;
  const int ti = g.orderTrade;
  GbTrade& v = g.o.trades[ti];
  v.eS = s; v.eK = k; v.eT = timeAt(d, s, k); v.eRaw = raw; v.ePrice = price;
  gOnEntry(g, s, k, raw);
  g.mSetup = false;  // machine.clearSetup('filled')
  g.orderActive = false;
  g.posActive = true; g.posTrade = ti; g.posEntryS = s; g.posDecision = noDecision();
}

// EntryMachine.onExit (postExit only with classic_d1)
__device__ __forceinline__ void gMachineOnExit(G& g, int s, double exitPrice, double net) {
  if (g.p.cont == CM_CLASSIC && net > 0) { g.mContActive = true; g.mContHigh = exitPrice; g.mContStart = s; g.mContWindows++; }
}

// ShadowBook.close: closes the position at `dec`; returns the trade's net (and its interest)
__device__ double gClose(G& g, int s, const Decision& dec, double& interestOut, double& priceOut) {
  const DevSym& d = *g.d;
  const bool isStop = dec.reason == RS_TSTOP || dec.reason == RS_TSTOP_GAP;
  const double price = dec.price * (1 - g.p.costBps / 10000) * (1 - (isStop ? g.p.slipBps / 10000 : 0));
  const double interest = gInterest(g, LD(d.sTime + s));
  const double proceeds = g.lotShares * price;
  const double net = proceeds - g.lotInvestment - interest;
  g.posActive = false;
  g.exitedThisSession = true;
  gMachineOnExit(g, s, dec.price, net);
  interestOut = interest;
  priceOut = price;
  return net;
}

// ExitManager.isStopActive (net policy); RulesExitManager: only in stage full
__device__ __forceinline__ bool gStopActive(const G& g, int s) {
  if (g.rules && g.rStage != 0) return false;
  const double interest = gInterest(g, LD(g.d->sTime + s));
  return g.lotShares * g.stopPrice - g.lotInvestment - interest > 0;
}

// ExitManager.evaluate (net policy) — the Growth path without the optional rules
__device__ Decision gExitEvaluate(G& g, int s) {
  const DevSym& d = *g.d;
  const double sTimeS = LD(d.sTime + s);
  const double interest = gInterest(g, sTimeS);
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  const double stopPrice = g.stopPrice;
  const double sOpenS = LD(d.sOpen + s);
  const bool active = gStopActive(g, s);

  if (active) {
    if (g.stopFirstActiveIndex < 0) g.stopFirstActiveIndex = s;
    g.stopActiveSessions++;
  }

  const double daysHeld = (sTimeS - g.lotHoldTs) / SPD;
  const double maximumHoldDays = g.p.hold;
  const bool isMaximumHoldDue = daysHeld >= maximumHoldDays && g.lotShares * sOpenS - g.lotInvestment - interest < 0;
  const double pendingTime = g.pendingSignalTime;
  const double pendingPrice = g.pendingSignalPrice;

  g.pendingSignalTime = NAN;
  g.pendingSignalPrice = NAN;

  if (active && sOpenS <= stopPrice) return mkDecision(RS_TSTOP_GAP, 0, sOpenS, timeAt(d, s, 0));

  if (!isnan(pendingTime)) {
    const int k = firstTradeAfterDecision(d, s, pendingTime);
    if (k >= 0) {
      Decision x = mkDecision(RS_BUFFER, k, priceAt(d, s, k), timeAt(d, s, k));
      x.signalTime = pendingTime; x.signalPrice = pendingPrice;
      return x;
    }
  }

  if (isMaximumHoldDue) {
    const int k = firstTradeFrom(d, s, LD(d.bTime + start) + SPM);
    return k < 0 ? noDecision() : mkDecision(RS_MAXHOLD, k, priceAt(d, s, k), timeAt(d, s, k));
  }

  Decision stopExit = noDecision();
  int stopIndex = -1;

  if (active) {
    for (int k = 0; k < count; k++) {
      const double o = LD(d.bOpen + start + k);
      if (o <= stopPrice) { stopIndex = k; stopExit = mkDecision(RS_TSTOP, k, o, timeAt(d, s, k)); break; }
      if (LD(d.bLow + start + k) <= stopPrice) {
        stopIndex = k;
        if (g.p.stopFill == 0) stopExit = mkDecision(RS_TSTOP, k, stopPrice, timeAt(d, s, k));
        else {
          const int next = firstTradeFrom(d, s, LD(d.bTime + start + k) + SPM);
          stopExit = next >= 0 ? mkDecision(RS_TSTOP, next, priceAt(d, s, next), timeAt(d, s, next))
                               : mkDecision(RS_TSTOP, k, LD(d.bClose + start + k), LD(d.bTime + start + k));
        }
        break;
      }
    }
  }

  if (daysHeld < maximumHoldDays) return stopExit;

  const double threshold = -g.lotInvestment * g.p.buffer;
  int signalBar = -1;
  for (int k = 0; k < count; k++)
    if (g.lotShares * LD(d.bClose + start + k) - g.lotInvestment - interest <= threshold) { signalBar = k; break; }

  if (signalBar < 0) return stopExit;

  if (stopExit.valid && stopIndex >= 0 &&
      (stopIndex <= signalBar || (stopIndex == signalBar + 1 && LD(d.bOpen + start + stopIndex) <= stopPrice)))
    return stopExit;

  const double decisionTime = LD(d.bTime + start + signalBar) + SPM;
  const int k = firstTradeAfterDecision(d, s, decisionTime);

  if (k < 0) {
    g.pendingSignalTime = decisionTime;
    g.pendingSignalPrice = LD(d.bClose + start + signalBar);
    return noDecision();
  }

  Decision x = mkDecision(RS_BUFFER, k, priceAt(d, s, k), timeAt(d, s, k));
  x.signalTime = decisionTime; x.signalPrice = LD(d.bClose + start + signalBar);
  return x;
}

// ===================================================================================================================
// PositionRules (optionalRules.ts): the ATR initial stop and trend retention
// ===================================================================================================================

// PositionRules.protection: is ATR available for the fill this decision will get? (atrBefore)
__device__ bool gProtection(G& g, int s, double time, double& atr, int& fillSession) {
  const DevSym& d = *g.d;
  fillSession = firstTradeAfterDecision(d, s, time) >= 0 ? s : s + 1;
  const int L = g.p.atrL;
  const int from = fillSession - L;
  if (from - 1 < 0) return false;  // insufficient_history
  double sum = 0;
  for (int i = from; i < fillSession; i++) {
    const double high = LD(d.sHigh + i), low = LD(d.sLow + i), previous = LD(d.sClose + i - 1);
    if (!(validPrice(high) && validPrice(low) && validPrice(previous) && high >= low)) return false;  // invalid_data
    sum += jsmax(high, previous) - jsmin(low, previous);
  }
  atr = sum / L;
  return true;
}

// PositionRules.attach: the pending order's protection is fixed at its decision
__device__ void gAttach(G& g, int s, double time) {
  if (!g.p.istopOn) return;
  double atr; int fs;
  if (!gProtection(g, s, time, atr, fs)) { gfail(g, C_G_ORDER_WITHOUT_STOP, s); return; }
  g.orderHasAtr = true; g.orderAtr = atr; g.orderAtrFill = fs;
}

__device__ __forceinline__ void gAddCand(GExitCand* c, int& n, int rule, int reason, int k, double price, double time, int phase, double level) {
  GExitCand& x = c[n++];
  x.rule = rule; x.k = k; x.phase = phase; x.level = level;
  x.d = mkDecision(reason, k, price, time);
}

// the comparator of evaluateSession's candidates (a.k − b.k || a.phase − b.phase || level or precedence)
__device__ __forceinline__ double gCandCmp(const GExitCand& a, const GExitCand& b, const int* rank) {
  const double dk = (double)(a.k - b.k);
  if (dk != 0) return dk;
  const double dp = (double)(a.phase - b.phase);
  if (dp != 0) return dp;
  return a.phase == 1 ? b.level - a.level : (double)(rank[a.rule] - rank[b.rule]);
}

// PositionRules.evaluateSession: mode 0 'session', 1 'entry', 2 'after_partial'
__device__ Decision gEvaluateSession(G& g, int s, int mode, int from) {
  const DevSym& d = *g.d;
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  const double interest = gInterest(g, LD(d.sTime + s));
  const double daysHeld = (LD(d.sTime + s) - g.lotHoldTs) / SPD;
  const double P0 = g.rStop ? g.rStopLevel : NAN;
  const bool hasStop = g.rStop;
  const bool partialPending = g.p.retOn && g.rStage == 0;
#define PROFIT_AT(price) (g.lotShares * (price) - g.lotInvestment - interest)

  if (mode == 0) {
    const bool active = gStopActive(g, s);
    if (active) {
      if (g.stopFirstActiveIndex < 0) g.stopFirstActiveIndex = s;
      g.stopActiveSessions++;
    }
    const bool due = daysHeld >= g.p.hold && PROFIT_AT(LD(d.sOpen + s)) < 0;
    g.ssS = s; g.ssDue = due; g.ssDueBar = due ? firstTradeFrom(d, s, LD(d.bTime + start) + SPM) : -1;
    g.ssActive = active; g.ssStopPrice = g.stopPrice;
  } else if (mode == 1) {
    g.ssS = s; g.ssDue = false; g.ssDueBar = -1; g.ssActive = false; g.ssStopPrice = g.stopPrice;
  }
  if (g.ssS != s) { gfail(g, C_G_PARTIAL_STATE, s); return noDecision(); }

  GExitCand c[GB_MAXC];
  int n = 0;
  bool trailingGap = false, initialGap = false;

  if (mode == 0) {
    const double open = LD(d.sOpen + s);
    trailingGap = g.ssActive && open <= g.ssStopPrice;
    initialGap = hasStop && open <= P0;
    if (trailingGap) gAddCand(c, n, RU_TRAILING, RS_TSTOP_GAP, 0, open, timeAt(d, s, 0), 0, g.ssStopPrice);
    if (initialGap) gAddCand(c, n, RU_INITIAL, RS_ISTOP_GAP, 0, open, timeAt(d, s, 0), 0, P0);

    const bool pending = g.rPendingBuffer;
    const double pTime = g.rPendingBufferTime, pPrice = g.rPendingBufferPrice;
    g.rPendingBuffer = false;
    if (pending) {
      const int k = firstTradeAfterDecision(d, s, pTime);
      if (k >= 0) {
        gAddCand(c, n, RU_BUFFER, RS_BUFFER, k, priceAt(d, s, k), timeAt(d, s, k), 0, NAN);
        c[n - 1].d.signalTime = pTime; c[n - 1].d.signalPrice = pPrice;
      }
    }
    if (g.rPendingTrend) {
      const int k = firstTradeAfterDecision(d, s, g.rPendingTrendTime);
      if (k >= 0) gAddCand(c, n, RU_TREND, RS_TREND, k, priceAt(d, s, k), timeAt(d, s, k), 0, NAN);
    }
    if (g.ssDue && g.ssDueBar >= 0)
      gAddCand(c, n, RU_MAXHOLD, RS_MAXHOLD, g.ssDueBar, priceAt(d, s, g.ssDueBar), timeAt(d, s, g.ssDueBar), 0, NAN);
    if (g.ssActive && !g.ssDue && !trailingGap)
      for (int k = 0; k < count; k++) {
        const double o = LD(d.bOpen + start + k);
        if (o <= g.ssStopPrice) { gAddCand(c, n, RU_TRAILING, RS_TSTOP, k, o, timeAt(d, s, k), 0, g.ssStopPrice); break; }
        if (LD(d.bLow + start + k) <= g.ssStopPrice) {
          gAddCand(c, n, RU_TRAILING, RS_TSTOP, k, g.ssStopPrice, timeAt(d, s, k), 1, g.ssStopPrice);
          break;
        }
      }
  } else if (mode == 2 && g.ssDue && g.ssDueBar > from)
    gAddCand(c, n, RU_MAXHOLD, RS_MAXHOLD, g.ssDueBar, priceAt(d, s, g.ssDueBar), timeAt(d, s, g.ssDueBar), 0, NAN);

  if (hasStop && !initialGap)
    for (int k = from; k < count; k++) {
      const double o = LD(d.bOpen + start + k);
      if (!(mode != 0 && k == from) && o <= P0) { gAddCand(c, n, RU_INITIAL, RS_ISTOP, k, o, timeAt(d, s, k), 0, P0); break; }
      if (LD(d.bLow + start + k) <= P0) { gAddCand(c, n, RU_INITIAL, RS_ISTOP, k, P0, timeAt(d, s, k), 1, P0); break; }
    }

  bool carry = false;
  double carryTime = NAN, carryPrice = NAN;
  if (mode != 1 && !g.ssDue && daysHeld >= g.p.hold) {
    const double threshold = -g.lotInvestment * g.p.buffer;
    for (int j = mode == 0 ? 0 : from; j < count; j++)
      if (PROFIT_AT(LD(d.bClose + start + j)) <= threshold) {
        const double decisionTime = LD(d.bTime + start + j) + SPM;
        const int k = firstTradeAfterDecision(d, s, decisionTime);
        if (k < 0) { carry = true; carryTime = decisionTime; carryPrice = LD(d.bClose + start + j); }
        else {
          gAddCand(c, n, RU_BUFFER, RS_BUFFER, k, priceAt(d, s, k), timeAt(d, s, k), 0, NAN);
          c[n - 1].d.signalTime = decisionTime; c[n - 1].d.signalPrice = LD(d.bClose + start + j);
        }
        break;
      }
  }
#undef PROFIT_AT

  const int rankP[5] = {3, 0, 1, 2, 4};  // partial pending: initial 0, hold 1, buffer 2, trailing 3, trend 4
  const int rankN[5] = {0, 1, 2, 3, 4};  // otherwise: trailing 0, initial 1, hold 2, buffer 3, trend 4
  const int* rank = partialPending ? rankP : rankN;
  // stable insertion sort (V8's Array.prototype.sort is stable; the comparator is a consistent preorder)
  for (int i = 1; i < n; i++) {
    const GExitCand x = c[i];
    int j = i - 1;
    while (j >= 0 && gCandCmp(c[j], x, rank) > 0) { c[j + 1] = c[j]; j--; }
    c[j + 1] = x;
  }

  if (n == 0) {
    if (carry) { g.rPendingBuffer = true; g.rPendingBufferTime = carryTime; g.rPendingBufferPrice = carryPrice; }
    return noDecision();
  }
  Decision w = c[0].d;
  w.partial = c[0].rule == RU_TRAILING && partialPending;
  return w;
}

// PositionRules.onFill (book.open just ran)
__device__ void gRulesOnFill(G& g, int s, int k) {
  const GbTrade& v = g.o.trades[g.posTrade];
  if (g.p.istopOn) {
    if (!g.orderHasAtr) { gfail(g, C_G_FILL_BEFORE_ATR, s); return; }
    if (g.orderAtrFill > s) { gfail(g, C_G_FILL_BEFORE_ATR, s); return; }
    g.rStop = true;
    g.rStopLevel = v.eRaw - g.p.atrMultiple * g.orderAtr;
  } else g.rStop = false;
  g.rStage = 0; g.rFills = 0; g.rCount = 0; g.rPartialNet = 0; g.rPartialInterest = 0;
  g.rPendingTrend = false; g.rPendingBuffer = false;
  g.ssS = -1;
  // the RulesExitManager: a fresh manager with the same entry state (gOnEntry already ran on the book's own)
  if (g.rStop) g.posDecision = gEvaluateSession(g, s, 1, k);
}

// PositionRules.partialSale: the retention partial sale at the first profit trailing-stop event
__device__ double gPartialSale(G& g, int s, const Decision& dec) {
  const DevSym& d = *g.d;
  if (g.rStage != 0) { gfail(g, C_G_PARTIAL_STATE, s); return 0; }
  const double f = g.p.retF;
  const double shares = g.lotShares * f;
  const double principal = g.lotInvestment * f;
  const double price = dec.price * (1 - g.p.costBps / 10000) * (1 - g.p.slipBps / 10000);
  const double interest = principal * g.p.rate * ((LD(d.sTime + s) - g.lotEntryTs) / SPY);
  const double proceeds = shares * price;
  const double net = proceeds - principal - interest;
  const double sharesAfter = g.lotShares - shares;
  const double principalAfter = g.lotInvestment - principal;
  g.lotShares = sharesAfter;
  g.lotInvestment = principalAfter;
  GbTrade& v = g.o.trades[g.posTrade];
  if (v.nFills >= GB_MAX_FILLS) { gfail(g, C_FILL_CAPACITY, g.posTrade); return 0; }
  GbFill& x = v.fills[v.nFills++];
  x.s = s; x.k = dec.barIndex; x.t = dec.time; x.raw = dec.price; x.price = price; x.partial = 1; x.f = f; x.reason = dec.reason;
  g.rFills++;
  g.rPartialNet = g.rPartialNet + net;
  g.rPartialInterest = g.rPartialInterest + interest;
  g.rStage = 1;
  g.rCount = 0;
  g.posDecision = gEvaluateSession(g, s, 2, dec.barIndex);
  return net;
}

// PositionRules.afterSession: the trend-retention count at the completed close
__device__ void gRulesAfterSession(G& g, int s) {
  if (!g.posActive || !g.p.retOn || g.rStage != 1 || g.rPendingTrend) return;
  const DevSym& d = *g.d;
  const double close = LD(d.sClose + s);
  double sma;
  if (!sessionSma(d, s, g.p.retL, sma)) { g.rCount = 0; return; }
  if (close < sma) g.rCount++;
  else g.rCount = 0;
  if (g.rCount >= g.p.retK) { g.rPendingTrend = true; g.rPendingTrendTime = LD(d.sCloseTime + s); g.rCount = 0; }
}

// ===================================================================================================================
// The Drawdown Recovery Gate (drawdownGate.ts)
// ===================================================================================================================

__device__ __forceinline__ double ddTimeAt(const G& g, int s, int k, int phase) {
  const DevSym& d = *g.d;
  if (s >= g.S) return INFINITY;
  const int start = LD(d.sBarStart + s);
  if (phase == 2) return isfinite(LD(d.sClosingPrint + s)) ? LD(d.sCloseTime + s) : NAN;
  if (phase == 1) return LD(d.bTime + start + k) + 60;
  if (k == 0) return LD(d.bTime + start);
  return LD(d.bTime + start + k) > LD(d.bTime + start + k - 1) + 60 ? LD(d.bTime + start + k) : NAN;
}

__device__ void ddAdvance(G& g) {
  const DevSym& d = *g.d;
  for (;;) {
    if (g.ddCp == 0) g.ddCp = 1;
    else if (g.ddCp == 1) {
      if (g.ddCk + 1 < LD(d.sBarCount + g.ddCs)) { g.ddCk++; g.ddCp = 0; }
      else g.ddCp = 2;
    } else { g.ddCs++; g.ddCk = 0; g.ddCp = 0; }
    const double t = ddTimeAt(g, g.ddCs, g.ddCk, g.ddCp);
    if (!isnan(t)) { g.ddNextT = t; return; }
  }
}

__device__ __forceinline__ bool ddWindowCompleteAt(const G& g, int s) { return s - g.p.ddN >= g.ddOrigin; }
__device__ __forceinline__ bool ddPermissiveAt(const G& g, int s) { return ddWindowCompleteAt(g, s) && g.ddState != DD_REQUIRED; }

// the New York wall-clock minute of day of an observation (offset of its session, precomputed by newYorkOffset)
__device__ __forceinline__ int ddMinuteOfDay(const G& g, int session, double time) {
  const long long t = (long long)time + (long long)LD(g.d->nyOffset + session);
  return (int)((((t % 86400) + 86400) % 86400) / 60);
}

__device__ void gWake(G& g, double time, int session);

__device__ void ddBreakStreak(G& g) { g.ddStreak = false; g.ddState = DD_REQUIRED; }

// processes the next observation (step → observe)
__device__ void ddStep(G& g) {
  const DevSym& d = *g.d;
  const int s = g.ddCs;
  if (s >= g.S) { gfail(g, C_G_DD_UNPROCESSED, s); return; }
  const int start = LD(d.sBarStart + s), k = g.ddCk, cp = g.ddCp;
  const double time = g.ddNextT;
  const bool full = cp != 0;
  const double price = cp == 2 ? LD(d.sClose + s) : cp == 1 ? LD(d.bClose + start + k) : LD(d.bOpen + start + k);
  const int fullIdx = cp == 2 ? LD(d.fullStart + s) + LD(d.sBarCount + s) : LD(d.fullStart + s) + k;
  ddAdvance(g);

  if (!full) {
    // observeContinuity
    if (g.ddCur && g.ddStreak && !atOrAbove(price, g.ddThreshold)) ddBreakStreak(g);
    if (!ddPermissiveAt(g, s)) g.ddLastPermissive = false;
    return;
  }

  // observeFull
  g.ddHasLastFull = true; g.ddLastFullSession = s; g.ddLastFullPrice = price;
  if (!g.ddCur) {
    // detect: the highest full close of the current epoch in the current session and the N before it, before j joins
    const int n = g.p.ddN;
    int a = s - n >= 0 ? LD(d.fullStart + s - n) : 0;
    if (a < g.ddEpochStart) a = g.ddEpochStart;
    if (a <= fullIdx - 1) {
      const double m = rmqMax(d.rmqFull, a, fullIdx - 1);
      if (atOrBelow(price, m * (1 - g.p.ddD))) {
        g.ddCur = true; g.ddPeak = m; g.ddTrough = price;
        g.ddThreshold = g.ddTrough + (g.ddPeak - g.ddTrough) * g.p.ddR;
        g.ddStreak = false;
        g.ddState = DD_REQUIRED;
      }
    }
  } else if (atOrAbove(price, g.ddPeak)) {
    // resolve: a fresh epoch whose first candidate is this observation
    g.ddState = DD_NORMAL; g.ddCur = false; g.ddStreak = false;
    g.ddEpochStart = fullIdx;
  } else if (price < g.ddTrough) {
    if (g.ddStreak) ddBreakStreak(g);
    g.ddTrough = price;
    g.ddThreshold = g.ddTrough + (g.ddPeak - g.ddTrough) * g.p.ddR;
  } else if (atOrAbove(price, g.ddThreshold)) {
    if (!g.ddStreak) {
      g.ddStreak = true; g.ddStartSession = s; g.ddStartMinute = ddMinuteOfDay(g, s, time); g.ddTargetSession = s + g.p.ddY;
      if (g.p.ddY == 0) g.ddState = DD_CONFIRMED;
    } else if (g.ddState == DD_REQUIRED &&
               (s > g.ddTargetSession || (s == g.ddTargetSession && ddMinuteOfDay(g, s, time) >= g.ddStartMinute)))
      g.ddState = DD_CONFIRMED;
  } else if (g.ddStreak) ddBreakStreak(g);

  // a blocking → permissive transition is a release
  const bool after = ddPermissiveAt(g, s);
  if (after && !g.ddLastPermissive) gWake(g, time, s);
  g.ddLastPermissive = after;
}

// DrawdownRecoveryGate.check
__device__ bool ddCheck(G& g, int s, double time) {
  if (g.ddNextT < time || (g.ddNextT == time && g.ddCp != 0)) { gfail(g, C_G_DD_UNPROCESSED, s); return false; }
  return ddWindowCompleteAt(g, s) && g.ddState != DD_REQUIRED;
}

// ===================================================================================================================
// The entry trend filter (TrendGate.evaluate) and the gate check (EntryGates.check)
// ===================================================================================================================

__device__ int trendWarmup(const GbGrowthIn& p) {
  switch (p.trend) {
    case TM_PRICE_CHANGE: case TM_REGRESSION: return p.trN;
    case TM_RISING_SMA: return p.trK + p.trN - 1;
    case TM_HHL: return p.trN - 1;
    case TM_MOMENTUM: return p.trK;  // the long lookback
  }
  return 0;
}

// session s's high/low through the minutes completed by `time` (TrendGate.partialHighLow)
__device__ void partialHighLow(const DevSym& d, int s, double time, double& high, double& low) {
  if (time >= LD(d.sCloseTime + s)) { high = LD(d.sHigh + s); low = LD(d.sLow + s); return; }
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  int k = -1;
  int lo = 0, hi = count - 1;
  while (lo <= hi) {
    const int mid = (lo + hi) >> 1;
    if (LD(d.bTime + start + mid) + 60 <= time) { k = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  if (k < 0) { high = NAN; low = NAN; return; }
  double ph = LD(d.bHigh + start), pl = LD(d.bLow + start);
  for (int i = 1; i <= k; i++) { ph = jsmax(ph, LD(d.bHigh + start + i)); pl = jsmin(pl, LD(d.bLow + start + i)); }
  high = ph; low = pl;
}

// TrendGate.evaluate → pass (the block reasons are equivalent: every non-pass blocks)
__device__ bool trendPass(const G& g, int s, double time, double price) {
  const DevSym& d = *g.d;
  const GbGrowthIn& p = g.p;
  const int need = trendWarmup(p);
  if (s - need < 0) return false;  // insufficient_history
#define CLOSE(k) ((k) == 0 ? price : LD(d.sClose + s - (k)))
#define BAD(x) (!(isfinite(x) && (x) > 0))
  if (BAD(price)) return false;

  if (p.trend == TM_PRICE_CHANGE) {
    const double ref = CLOSE(p.trN);
    if (BAD(ref)) return false;
    const double threshold = ref * (1 + p.trM);
    return atOrAbove(price, threshold);
  }
  if (p.trend == TM_REGRESSION) {
    const int n = p.trN;
    const double ref = CLOSE(n);
    if (BAD(ref)) return false;
    const double logRef = v8_log(ref);
    const int points = n + 1;
    const double xMean = (double)n / 2;
    double yMean = 0;
    for (int j = 0; j <= n; j++) {
      const double q = CLOSE(n - j);
      if (BAD(q)) return false;
      const double y = j == 0 ? 0 : v8_log(q) - logRef;
      yMean += y;
    }
    yMean /= points;
    double sxy = 0, sxx = 0;
    for (int j = 0; j <= n; j++) {
      const double q = CLOSE(n - j);
      const double y = j == 0 ? 0 : v8_log(q) - logRef;
      sxy += (j - xMean) * (y - yMean);
      sxx += (j - xMean) * (j - xMean);
    }
    const double b = sxy / sxx;
    const double slopePercent = (v8_exp(b * n) - 1) * 100;
    return slopePercent >= p.trSlopePct;
  }
  if (p.trend == TM_RISING_SMA) {
    const int n = p.trN, k = p.trK;
    double now = 0, then = 0;
    for (int i = 0; i < n; i++) {
      const double a = CLOSE(i), b = CLOSE(k + i);
      if (BAD(a) || BAD(b)) return false;
      now += a;
      then += b;
    }
    now /= n;
    then /= n;
    return price > now && now > then;
  }
  if (p.trend == TM_HHL) {
    const int n = p.trN, h = n / 2;
    const double m = p.trM;
    double curHigh, curLow;
    partialHighLow(d, s, time, curHigh, curLow);
    double newerHigh = -INFINITY, newerLow = INFINITY, olderHigh = -INFINITY, olderLow = INFINITY;
    for (int k = 0; k < h; k++) {
      const double hk = k == 0 ? curHigh : LD(d.sHigh + s - k), lk = k == 0 ? curLow : LD(d.sLow + s - k);
      if (BAD(hk) || BAD(lk)) return false;
      newerHigh = jsmax(newerHigh, hk);
      newerLow = jsmin(newerLow, lk);
    }
    for (int k = n - h; k < n; k++) {
      const double hk = k == 0 ? curHigh : LD(d.sHigh + s - k), lk = k == 0 ? curLow : LD(d.sLow + s - k);
      if (BAD(hk) || BAD(lk)) return false;
      olderHigh = jsmax(olderHigh, hk);
      olderLow = jsmin(olderLow, lk);
    }
    return newerHigh > olderHigh * (1 + m) && newerLow > olderLow * (1 + m);
  }
  // momentum (trN = S short, trK = L long)
  const double shortRef = CLOSE(p.trN), longRef = CLOSE(p.trK);
  if (BAD(shortRef) || BAD(longRef)) return false;
  const bool shortPass = atOrAbove(price, shortRef * (1 + p.trM));
  const bool longPass = atOrAbove(price, longRef * (1 + p.trM2));
  return shortPass && longPass;
#undef CLOSE
#undef BAD
}

// EntryGates.check: capital (none), the trend filter, the drawdown gate (evaluated even after a trend block), the
// initial stop's availability. Returns pass; `ddBlocked` reports the drawdown gate's own result.
__device__ bool gateCheck(G& g, int s, double time, double price, bool& ddEvaluated, bool& ddBlocked) {
  const bool trendOk = g.p.trend == TM_OFF ? true : trendPass(g, s, time, price);
  ddEvaluated = g.ddOn;
  ddBlocked = false;
  if (g.ddOn) ddBlocked = !ddCheck(g, s, time);
  if (!trendOk) return false;
  if (ddBlocked) return false;
  if (g.p.istopOn) {  // runtime.protection (only with the initial stop ON)
    double atr; int fs;
    if (!gProtection(g, s, time, atr, fs)) return false;
  }
  return true;
}

// ===================================================================================================================
// The continuation controller (continuation.ts) — forward declarations of the entry hooks it calls
// ===================================================================================================================

__device__ void gBeforeBaseEntry(G& g, int s, double time);
__device__ void gGatesAfterEntry(G& g);

// The continuation's trigger: the gate (or the protection-only check), then the order
__device__ void gContTrigger(G& g, int s, double time, double price, int kind) {
  bool pass = true;
  if (g.gated) { bool e, b; pass = gateCheck(g, s, time, price, e, b); }
  else if (g.protectedOnly) { double atr; int fs; pass = gProtection(g, s, time, atr, fs); }
  if (!pass) {
    // veto: recorded on the CPU; the episode ends (and a classic setup is cancelled, its window closed)
    if (g.p.cont == CM_CLASSIC) { g.mSetup = false; g.mContActive = false; }
    g.cStatus = CS_DONE;
    return;
  }
  if (gCommit(g, s, time, price, kind) < 0) return;
  g.cStatus = CS_DONE;  // ordered
  if (g.rules) gAttach(g, s, time);
  if (g.gated) gGatesAfterEntry(g);
}

// EntryMachine.processBar via ShadowBook.processBar (classic_d1); returns true on a rebound signal
__device__ bool gClassicProcessBar(G& g, int s, int k, double& decisionTime, double& decisionPrice) {
  if (g.positionAtStart || g.exitedThisSession || g.orderActive || g.posActive) return false;
  const DevSym& d = *g.d;
  const int b = LD(d.sBarStart + s) + k;
  const double close = LD(d.bClose + b);
  if (!g.mSetup) {
    // armingKind: the deep path never arms (targetPercentChange NaN); the continuation path
    const bool open = g.mContActive && s > g.mContStart && s - g.mContStart <= g.p.coW;
    if (!(open && close <= g.mContHigh * (1 - g.p.coP))) return false;
    g.mSetup = true;
    g.mTrailingLow = close;
    g.mReboundTrigger = close * (1 + g.p.coY);
    g.mContActive = false;  // any arming ends the continuation window
    // the episode: armed (it must be open and the setup a continuation one)
    if (!(g.cStatus == CS_WATCHING || g.cStatus == CS_ARMED)) { gfail(g, C_G_UNEXPECTED_ARMING, s); return false; }
    g.cStatus = CS_ARMED;
    return false;
  }
  const double low = LD(d.bLow + b);
  if (low < g.mTrailingLow) g.mTrailingLow = low;
  g.mReboundTrigger = g.mTrailingLow * (1 + g.p.coY);
  if (close < g.mReboundTrigger) return false;
  decisionTime = LD(d.bTime + b) + SPM;
  decisionPrice = close;
  return true;
}

__device__ __forceinline__ bool gContOpen(const G& g) { return g.cStatus == CS_WATCHING || g.cStatus == CS_ARMED; }

// ContinuationController.nextTime
__device__ double gContNextTime(const G& g, int s, int k, double t) {
  const DevSym& d = *g.d;
  if (g.p.cont == CM_CLASSIC) {
    if (!(g.mContActive || g.mSetup) || k == 0 || g.cProcessedMinute >= k - 1) return INFINITY;
    return LD(d.bTime + LD(d.sBarStart + s) + k - 1) + 60;
  }
  const int j = g.cNextBar;
  if (j < g.S && j == s && LD(d.barEnd + j) <= t) return LD(d.barEnd + j);
  return INFINITY;
}

// ContinuationController.evaluate
__device__ void gContEvaluate(G& g, int s, int k) {
  const DevSym& d = *g.d;
  if (g.p.cont == CM_CLASSIC) {
    g.cProcessedMinute = k - 1;
    double dt, dp;
    if (gClassicProcessBar(g, s, k - 1, dt, dp)) {
      if (g.cStatus != CS_ARMED && g.cStatus != CS_WATCHING) { gfail(g, C_G_UNEXPECTED_ARMING, s); return; }
      gContTrigger(g, s, dt, dp, K_CONTINUATION);
    }
    return;
  }
  const int j = g.cNextBar++;
  if (!gContOpen(g)) return;
  if (j < g.cFirst || j > g.cLast) return;  // bars[j].sessionIndex = j
  if (g.posActive || g.orderActive) { gfail(g, C_G_CONT_NOT_FLAT, s); return; }
  const double close = LD(d.barClose + j), end = LD(d.barEnd + j);

  if (g.p.cont == CM_BREAKOUT) {
    const double threshold = g.cRefHigh * (1 + g.p.coB);
    if (g.cFormation >= g.p.coF && close > threshold) { gContTrigger(g, s, end, close, K_CONT_BREAKOUT); return; }
  } else if (g.p.cont == CM_MA_CROSS) {
    const double now = barSma(d, j, g.p.coL), before = barSma(d, j - 1, g.p.coL), earlier = barSma(d, j - g.p.coM, g.p.coL);
    const double prior = j > 0 ? LD(d.barClose + j - 1) : NAN;
    if (isfinite(now) && isfinite(before) && isfinite(earlier) && isfinite(prior)) {
      const bool rising = now > earlier * (1 + g.p.coSlope);
      const bool fromBelow = prior <= before;
      const bool above = close > now * (1 + g.p.coMargin);
      if (rising && fromBelow && above) { gContTrigger(g, s, end, close, K_CONT_MA_CROSS); return; }
    }
  } else {  // shallow_pullback
    const double now = barSma(d, j, g.p.coL), earlier = barSma(d, j - g.p.coM, g.p.coL);
    const bool uptrend = isfinite(now) && isfinite(earlier) && now > earlier * (1 + g.p.coRise);
    const double depth = 1 - close / g.cRefHigh;
    const double recoveryThreshold = g.cTrough * (1 + g.p.coRec);
    if (isfinite(now) && isfinite(earlier)) {
      if (depth > g.p.coPmax) { g.cStatus = CS_DONE; return; }  // pullback_too_deep
      if (g.cStatus == CS_ARMED) {
        if (uptrend && close >= recoveryThreshold) { gContTrigger(g, s, end, close, K_CONT_SHALLOW); return; }
      } else if (depth >= g.p.coPmin && uptrend) {
        g.cStatus = CS_ARMED;
        g.cTrough = close;
        return;
      }
    }
  }
  // no action: the reference (watching) or the trough (armed), the bar's own values now included
  if (g.cStatus == CS_ARMED) {
    if (close < g.cTrough) g.cTrough = close;
  } else {
    g.cRefHigh = jsmax(g.cRefHigh, LD(d.barHigh + j));
    g.cFormation++;
  }
}

// ContinuationController.beforeBaseEntry: a base entry has priority (the episode closes, a classic setup is cancelled)
__device__ void gBeforeBaseEntry(G& g, int s, double time) {
  if (g.p.cont == CM_OFF || !gContOpen(g)) return;
  if (g.p.cont == CM_CLASSIC) { g.mSetup = false; g.mContActive = false; }
  g.cStatus = CS_DONE;
}

// ContinuationController.afterExit: a qualifying exit (net > 0) opens an episode
__device__ void gContAfterExit(G& g, int s, double net, double exitRaw) {
  if (g.p.cont == CM_OFF) return;
  if (gContOpen(g)) { gfail(g, C_G_EXIT_WHILE_EPISODE, s); return; }
  const bool qualifies = net > 0;
  if (g.p.cont == CM_CLASSIC) {
    const bool opened = g.mContWindows > g.cWindows;
    g.cWindows = g.mContWindows;
    if (opened != qualifies) { gfail(g, C_G_WINDOW_DISAGREES, s); return; }
    if (!opened) return;
  } else if (!qualifies) return;
  g.cStatus = CS_WATCHING;
  g.cAnchor = s; g.cFirst = s + 1; g.cLast = s + g.p.coW;
  g.cRefHigh = g.p.cont == CM_CLASSIC ? g.mContHigh : exitRaw;
  g.cFormation = 0; g.cTrough = NAN;
}

// ContinuationController.afterSession
__device__ void gContAfterSession(G& g, int s) {
  if (!gContOpen(g)) return;
  if (g.p.cont == CM_CLASSIC) {
    if (g.cStatus == CS_WATCHING) g.cRefHigh = g.mContHigh;
    if (g.mContExpiries > g.cExpiries) {
      g.cExpiries = g.mContExpiries;
      if (g.cStatus != CS_WATCHING) { gfail(g, C_G_EXPIRY_STATE, s); return; }
      g.cStatus = CS_DONE;  // window_expired
    }
    return;
  }
  if (s - g.cAnchor >= g.p.coW) g.cStatus = CS_DONE;  // window_expired
}

// ===================================================================================================================
// Persistent eligibility (EntryGates: opportunities, the renewal watch, releases)
// ===================================================================================================================

__device__ __forceinline__ bool gFlatWithoutOrder(const G& g) { return !g.posActive && !g.orderActive; }

// the original Rise predicate at bar j (risePredicateStates): 1 holds, 0 false, 2 not evaluable
__device__ __forceinline__ int risePredicate(const G& g, int j, double& low, double& threshold) {
  const int n = g.p.riseN;
  if (j < n - 1) { low = NAN; threshold = NAN; return 2; }
  const DevSym& d = *g.d;
  low = rmqMin(d.rmqBarLow, j - n + 1, j);
  threshold = low * g.p.riseFactor;
  return LD(d.barClose + j) >= low * g.p.riseFactor * (1 - REL_TOL) ? 1 : 0;
}

// the last bar complete at `time` (EntryGates.barAt): bars end at their session's close
__device__ int gBarAt(const G& g, double time) {
  const DevSym& d = *g.d;
  int lo = 0, hi = g.S - 1, found = -1;
  while (lo <= hi) {
    const int mid = (lo + hi) >> 1;
    if (LD(d.barEnd + mid) <= time) { found = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return found;
}

// places the order of a base-family decision (simulateTrading's enter)
__device__ void gEnter(G& g, int s, double time, double price) {
  gBeforeBaseEntry(g, s, time);
  if (gCommit(g, s, time, price, g.p.entry == 1 ? K_TREND_BREAKOUT : K_RISE) < 0) return;
  if (g.rules) gAttach(g, s, time);
}

__device__ void gStartWatch(G& g, int s, double time) {
  if (g.p.elig != EP_RESET_RENEW) return;
  g.wActive = true; g.wState = 0; g.wReference = g.oSignalPrice; g.wStart = time; g.wLast = s + g.p.elW; g.wTrough = NAN;
}

// the policy's validity at bar j (close `price`); policy 4 updates its running maximum
__device__ bool gValidity(G& g, int j, double price) {
  double low, thr;
  const bool holds = risePredicate(g, j, low, thr) == 1;
  switch (g.p.elig) {
    case EP_TIME_LIMITED: case EP_RESET_RENEW: return holds;
    case EP_MIN_STRENGTH: return atOrAbove(price, g.oRecentLow * (1 + g.p.elA));
    case EP_MAX_EXTENSION: {
      const double cap = g.oSignalPrice * (1 + g.p.elE);
      if (!holds) return false;
      return atOrBelow(price, cap);
    }
    default: {  // deterioration
      g.oMaxClose = jsmax(g.oMaxClose, price);
      const double floor_ = g.oMaxClose * (1 - g.p.elD);
      if (!holds) return false;
      return !atOrBelow(price, floor_);
    }
  }
}

// the policy at a release instant between bar ends (read-only)
__device__ bool gReleaseValidity(G& g, int j, double price) {
  double low, thr;
  const bool holds = risePredicate(g, j, low, thr) == 1;
  switch (g.p.elig) {
    case EP_TIME_LIMITED: case EP_RESET_RENEW: return holds;
    case EP_MIN_STRENGTH: return atOrAbove(price, g.oRecentLow * (1 + g.p.elA));
    case EP_MAX_EXTENSION: {
      const double cap = g.oSignalPrice * (1 + g.p.elE);
      if (!holds) return false;
      return atOrBelow(price, cap);
    }
    default: {
      const double floor_ = g.oMaxClose * (1 - g.p.elD);
      if (!holds) return false;
      return !atOrBelow(price, floor_);
    }
  }
}

// EntryGates.evaluateOpportunity (kind 0 crossing, 1 latched, 2 renewal; release: a drawdown-gate release)
__device__ void gEvaluateOpportunity(G& g, int s, int j, double time, double price, bool release) {
  if (g.ddOn) g.oLastEval = time;
  const bool valid = release ? gReleaseValidity(g, j, price) : gValidity(g, j, price);
  if (release && !valid) return;  // deferred: waits for its next bar
  if (!valid) {
    g.oLive = false;  // invalidated
    gStartWatch(g, s, time);
    return;
  }
  bool ddEvaluated, ddBlocked;
  const bool pass = gateCheck(g, s, time, price, ddEvaluated, ddBlocked);
  if (ddEvaluated) g.ddWaiting = ddBlocked ? g.oId : (g.ddWaiting == g.oId ? -1 : g.ddWaiting);
  if (!pass) return;  // deferred: stays armed
  gEnter(g, s, time, price);
  g.oLive = false;
  g.wActive = false;  // cancelWatch('entry_taken')
}

__device__ void gArm(G& g, int s, int j, double time, double price, double recentLow, double threshold) {
  g.oLive = true; g.oId = ++g.oCount; g.oSignalSession = s; g.oSignalBar = j; g.oSignalPrice = price;
  g.oRecentLow = recentLow; g.oThreshold = threshold; g.oLast = s + g.p.elW; g.oMaxClose = price; g.oLastEval = -INFINITY;
}

// EntryGates.onCrossing (a raw crossing met while flat with no order)
__device__ void gOnCrossing(G& g, int s, double time, double price, double trigger, double reference, int barIndex) {
  if (g.p.elig == EP_OFF) {
    bool e, b;
    if (!gateCheck(g, s, time, price, e, b)) return;  // vetoed
    gEnter(g, s, time, price);
    return;
  }
  g.oLive = false;  // a live opportunity is superseded
  g.wActive = false;  // and a renewal watch cleared
  const int j = barIndex >= 0 ? barIndex : gBarAt(g, time);
  gArm(g, s, j, time, price, reference, trigger);
  gEvaluateOpportunity(g, s, j, time, price, false);
}

// the drawdown gate's onRelease hook: wakes the live opportunity it was blocking
__device__ void gWake(G& g, double time, int session) {
  if (g.p.elig == EP_OFF) return;
  if (g.oLive && g.ddWaiting == g.oId) { g.wakeValid = true; g.wakeTime = time; g.wakeSession = session; }
}

__device__ double gGatesNextTime(const G& g, int s, double t) {
  if (g.p.elig == EP_OFF) return INFINITY;
  const int j = g.gNextBar;
  const double tb = (j < g.S && j == s && LD(g.d->barEnd + j) <= t) ? LD(g.d->barEnd + j) : INFINITY;
  return g.wakeValid && g.wakeTime <= t ? (tb < g.wakeTime ? tb : g.wakeTime) : tb;
}

__device__ void gStepWatch(G& g, int s, int j) {
  const DevSym& d = *g.d;
  const double end = LD(d.barEnd + j), close = LD(d.barClose + j);
  if (end <= g.wStart) return;
  if (j > g.wLast) { g.wActive = false; return; }  // lapsed
  if (g.wState == 0) {
    const double level = g.wReference * (1 - g.p.elRD);
    if (atOrBelow(close, level)) { g.wState = 1; g.wTrough = close; }
    return;
  }
  const double threshold = g.wTrough * (1 + g.p.elRR);
  if (!atOrAbove(close, threshold)) {
    if (close < g.wTrough) g.wTrough = close;
    return;
  }
  double low, thr;
  const int holds = risePredicate(g, j, low, thr);
  g.wActive = false;  // the first rebound bar ends the watch either way
  if (holds != 1) return;
  gArm(g, s, j, end, close, low, thr);
  gEvaluateOpportunity(g, s, j, end, close, false);
}

// EntryGates.evaluate (the bar schedule and a pending release)
__device__ void gGatesEvaluate(G& g, int s) {
  const DevSym& d = *g.d;
  if (g.wakeValid) {
    const int jb = g.gNextBar;
    const double tb = (jb < g.S && jb == s) ? LD(d.barEnd + jb) : INFINITY;
    if (g.wakeTime < tb) {
      const double wt = g.wakeTime;
      const int ws = g.wakeSession;
      g.wakeValid = false;
      // release(s, w)
      if (!g.oLive || g.ddWaiting != g.oId || !gFlatWithoutOrder(g)) return;
      if (g.oLastEval >= wt) return;
      if (ws != s) { gfail(g, C_G_RELEASE_SESSION, s); return; }
      if (!g.ddHasLastFull) { gfail(g, C_G_NO_BAR, s); return; }
      const int j = gBarAt(g, wt);
      if (j < g.oSignalBar) return;
      gEvaluateOpportunity(g, s, j, wt, g.ddLastFullPrice, true);
      return;
    }
  }
  const int j = g.gNextBar++;
  if (!gFlatWithoutOrder(g)) return;
  if (g.oLive) {
    if (j > g.oSignalBar) gEvaluateOpportunity(g, s, j, LD(d.barEnd + j), LD(d.barClose + j), false);
    return;
  }
  if (g.wActive) gStepWatch(g, s, j);
}

// EntryGates.afterEntry: an entry taken by another source (a continuation trigger)
__device__ void gGatesAfterEntry(G& g) {
  if (g.p.elig == EP_OFF) return;
  g.oLive = false;
  g.wActive = false;
}

// EntryGates.afterSession: expiry and the renewal watch's bound
__device__ void gGatesAfterSession(G& g, int s) {
  if (g.p.elig == EP_OFF) return;
  if (g.oLive && s >= g.oLast) {
    g.oLive = false;  // expired
    gStartWatch(g, s, LD(g.d->sCloseTime + s));
  }
  if (g.wActive && s >= g.wLast) g.wActive = false;  // lapsed
}

// ===================================================================================================================
// Base decisions (Rise scanner / trend-breakout scan), produced for session s before its minutes
// ===================================================================================================================

__device__ void gSessionDecision(G& g, int s) {
  const DevSym& d = *g.d;
  g.decPending = false;
  if (g.p.entry == 0) {
    // scanRiseFromRecentLow at bar i = s
    const int n = g.p.riseN;
    if (s < n - 1) return;
    const double low = rmqMin(d.rmqBarLow, s - n + 1, s);
    const double threshold = low * g.p.riseFactor;
    const bool current = LD(d.barClose + s) >= threshold * (1 - REL_TOL);
    if (current && g.risePrev == 0) {
      g.decPending = true; g.decTime = LD(d.barEnd + s); g.decPrice = LD(d.barClose + s);
      g.decTrigger = threshold; g.decReference = low; g.decBar = s;
    }
    g.risePrev = current ? 1 : 0;
    return;
  }
  // scanTrendBreakout at session s
  const int need = g.p.boL + g.p.boK - 1 > g.p.boN ? g.p.boL + g.p.boK - 1 : g.p.boN;
  if (s - need < 0) return;
  double now, then;
  if (!sessionSma(d, s, g.p.boL, now) || !sessionSma(d, s - g.p.boK, g.p.boL, then)) return;
  const double priorHigh = rmqMax(d.rmqSessHigh, s - g.p.boN, s - 1);
  const double close = LD(d.sClose + s);
  if (close > now && now > then && close > priorHigh) {
    g.decPending = true; g.decTime = LD(d.sCloseTime + s); g.decPrice = close;
    g.decTrigger = priorHigh; g.decReference = now; g.decBar = -1;
  }
}

// simulateTrading's decide
__device__ void gDecide(G& g, int s) {
  if (g.posActive || g.orderActive) return;  // rejected
  if (g.gated) {
    gOnCrossing(g, s, g.decTime, g.decPrice, g.decTrigger, g.decReference, g.decBar);
    return;
  }
  if (g.protectedOnly) {
    double atr; int fs;
    if (!gProtection(g, s, g.decTime, atr, fs)) return;  // vetoed
  }
  gEnter(g, s, g.decTime, g.decPrice);
}

// baseUntil(time): base decisions, latched steps and drawdown observations due at or before `time`, in time order
__device__ void gBaseUntil(G& g, int s, double time) {
  for (int guard = 0; g.status == C_OK; guard++) {
    if (guard > 400000) { gfail(g, C_G_LOOP, s); return; }
    const double tb = g.decPending ? g.decTime : INFINITY;
    const double tg = g.gated ? gGatesNextTime(g, s, time) : INFINITY;
    if (g.ddOn) {
      const double to = g.ddNextT;
      const bool full = g.ddCp != 0;
      if (full ? (to <= time && to <= tb && to <= tg) : (to < time && to < tb && to < tg)) { ddStep(g); continue; }
    }
    if (tb <= time && tb <= tg) { g.decPending = false; gDecide(g, s); }
    else if (tg <= time) gGatesEvaluate(g, s);
    else return;
  }
}

// exitsAt with the optional rules: a partial sale keeps the position, the remainder's exit may follow at the same bar
__device__ void gExitsAtRules(G& g, int s, int k) {
  for (int guard = 0; guard < 3; guard++) {
    if (!(g.posActive && g.posDecision.valid && g.posDecision.barIndex == k)) return;
    const Decision exit = g.posDecision;
    if (exit.partial) {
      g.realized += gPartialSale(g, s, exit);
      continue;
    }
    const int partials = g.rFills;
    // classic_d1: the machine judged the remainder alone; it is re-judged on the whole position's net below
    const bool snap = partials > 0;
    const bool a = g.mContActive; const double h = g.mContHigh; const int st = g.mContStart, w = g.mContWindows;
    const int ti = g.posTrade;
    double interest, price;
    const double net = gClose(g, s, exit, interest, price);
    GbTrade& v = g.o.trades[ti];
    if (v.nFills >= GB_MAX_FILLS) { gfail(g, C_FILL_CAPACITY, ti); return; }
    GbFill& x = v.fills[v.nFills++];
    x.s = s; x.k = exit.barIndex; x.t = exit.time; x.raw = exit.price; x.price = price; x.partial = 0; x.f = 1; x.reason = exit.reason;
    double tradeNet = net, tradeInterest = interest;
    if (partials > 0) {  // finalize: the logical position's totals over its fills
      tradeInterest = 0 + g.rPartialInterest + interest;
      tradeNet = 0 + g.rPartialNet + net;
    }
    v.vNet = tradeNet; v.vInterest = tradeInterest;
    if (snap) {
      g.mContActive = a; g.mContHigh = h; g.mContStart = st; g.mContWindows = w;
      gMachineOnExit(g, s, exit.price, tradeNet);
    }
    g.realized += net;  // the final fill's net (the partial fills were realized at their sale)
    gContAfterExit(g, s, tradeNet, exit.price);
    return;
  }
  gfail(g, C_G_THREE_FILLS, s);
}

// ===================================================================================================================
// The kernel: one thread per (candidate, Growth book)
// ===================================================================================================================

__global__ void growthKernel(DevData data, const GbCandIn* __restrict__ cands, int nCand, GbTrade* tradesAll, int tradeCap,
                             GbCandOut* outs, int endIndex, unsigned* executed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  const int b = blockIdx.y;  // 0 = G:GDX, 1 = G:VGT
  if (c >= nCand) return;

  GbBookOut& bo = outs[c].book[2 + b];
  const GbGrowthIn& in = cands[c].g[b];
  if (!in.enabled) { bo.nTrades = 0; bo.signals = 0; bo.firstDS = -1; bo.status = C_OK; bo.errInfo = 0; return; }

  G g;
  memset(&g, 0, sizeof(g));
  g.d = &data.sym[b];
  g.p = in;
  g.S = data.S;
  g.end = endIndex;
  g.o.trades = tradesAll + ((size_t)c * 2 + b) * tradeCap;
  g.o.cap = tradeCap;
  g.status = C_OK;
  g.posDecision = noDecision();
  g.pendingSignalTime = NAN; g.pendingSignalPrice = NAN;
  g.risePrev = -1;
  g.ddWaiting = -1;
  g.rules = in.istopOn || in.retOn;
  g.ddOn = in.ddOn != 0;
  g.gated = in.trend != TM_OFF || in.elig != EP_OFF || g.ddOn;
  g.protectedOnly = in.istopOn && !g.gated;
  g.cProcessedMinute = -1;
  const DevSym& d = *g.d;
  if (endIndex != g.S - 1 || endIndex < 1 || (in.entry == 0 && in.riseN < 2) || (in.retOn && in.stopFill != 0) ||
      (in.istopOn && in.stopFill != 0))
    gfail(g, C_INVALID, 0);
  if (g.ddOn) {
    g.ddOrigin = 0; g.ddCs = 0; g.ddCk = 0; g.ddCp = 0;
    g.ddNextT = ddTimeAt(g, 0, 0, 0);
    g.ddEpochStart = 0;
    g.ddState = DD_NORMAL;
    g.ddLastPermissive = false;
  }

  Tracker minute, session;
  trackerInit(minute, 0, LD(d.bTime + LD(d.sBarStart + 0)));
  trackerInit(session, 0, LD(d.sTime + 0));
  double unrealizedLast = 0;
  int cacheS = -1, cacheTrade = -1;
  double cacheInterest = 0;

  for (int s = 0; s <= endIndex && g.status == C_OK; s++) {
    const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
    const double sessionTime = LD(d.sTime + s);

    // book.beginSession
    g.exitedThisSession = false;
    g.positionAtStart = g.posActive;
    if (g.orderActive && g.orderFillBar < 0) g.orderFillBar = firstTradeAfterDecision(d, s, g.orderDecisionTime);
    if (g.posActive) g.posDecision = g.rules ? gEvaluateSession(g, s, 0, 0) : gExitEvaluate(g, s);
    // continuation.beginSession, gates.beginSession (daily bars: bar j belongs to session j)
    g.cProcessedMinute = -1;
    if (g.cNextBar < s) g.cNextBar = s;
    if (g.gNextBar < s) g.gNextBar = s;
    gSessionDecision(g, s);

    for (int k = 0; k <= count && g.status == C_OK; k++) {
      const double t = k < count ? LD(d.bTime + start + k) : LD(d.sCloseTime + s);
      if (g.p.cont != CM_OFF) {
        int guard = 0;
        for (double ct = gContNextTime(g, s, k, t); ct <= t && g.status == C_OK; ct = gContNextTime(g, s, k, t)) {
          if (++guard > 1000) { gfail(g, C_G_LOOP, s); break; }
          gBaseUntil(g, s, ct);
          gContEvaluate(g, s, k);
        }
      }
      gBaseUntil(g, s, t);
      if (g.status != C_OK) break;

      if (g.rules) gExitsAtRules(g, s, k);
      else if (g.posActive && g.posDecision.valid && g.posDecision.barIndex == k) {
        const Decision exit = g.posDecision;
        const int ti = g.posTrade;
        double interest, price;
        const double net = gClose(g, s, exit, interest, price);
        GbTrade& v = g.o.trades[ti];
        GbFill& x = v.fills[0];
        x.s = s; x.k = exit.barIndex; x.t = exit.time; x.raw = exit.price; x.price = price; x.partial = 0; x.f = 1; x.reason = exit.reason;
        v.nFills = 1; v.vNet = net; v.vInterest = interest;
        g.realized += net;
        gContAfterExit(g, s, net, exit.price);
      }

      if (g.orderActive && g.orderFillBar == k) {
        gOpen(g, s, k);
        if (g.rules) { gRulesOnFill(g, s, k); gExitsAtRules(g, s, k); }
      }

      const double price = k < count ? LD(d.bClose + start + k) : LD(d.sClose + s);
      double mark = 0;
      if (g.posActive) {
        if (cacheS != s || cacheTrade != g.posTrade || g.rules) { cacheS = s; cacheTrade = g.posTrade; cacheInterest = gInterest(g, sessionTime); }
        mark = g.lotShares * price - g.lotInvestment - cacheInterest;
      }
      updateStrict(minute, g.realized + mark, t);
    }
    if (g.status != C_OK) break;

    if (g.decPending) { gfail(g, C_G_DECISION_AFTER_CLOSE, s); break; }
    if (g.p.cont != CM_OFF && g.p.cont != CM_CLASSIC && gContNextTime(g, s, count + 1, INFINITY) != INFINITY) {
      gfail(g, C_G_CONT_BAR_AFTER_CLOSE, s); break;
    }
    if (g.gated && gGatesNextTime(g, s, INFINITY) != INFINITY) { gfail(g, C_G_ELIG_BAR_AFTER_CLOSE, s); break; }

    // book.afterSession: the position's high and stop (not on its entry session), the machine's window
    if (g.posActive && g.posEntryS != s) {
      g.postEntryHigh = jsmax(g.postEntryHigh, LD(d.sHigh + s));
      g.postEntryLow = jsmin(g.postEntryLow, LD(d.sLow + s));
      g.stopPrice = jsmax(g.stopPrice, g.postEntryHigh * (1 - g.p.tsp));
    }
    if (g.p.cont == CM_CLASSIC && g.mContActive) {
      if (s > g.mContStart) g.mContHigh = jsmax(g.mContHigh, LD(d.sHigh + s));
      if (s - g.mContStart >= g.p.coW) { g.mContActive = false; g.mContExpiries++; }
    }
    if (g.rules) gRulesAfterSession(g, s);
    gContAfterSession(g, s);
    gGatesAfterSession(g, s);

    const double unrealized = gMark(g, LD(d.sClose + s), sessionTime);
    updateStrict(session, g.realized + unrealized, sessionTime);
    unrealizedLast = unrealized;
  }

  // book.finish and rules.finish: an open position is marked at the last close with its accrued interest
  if (g.status == C_OK && g.posActive) {
    const double closeE = LD(d.sClose + endIndex), sTimeE = LD(d.sTime + endIndex);
    const double interest = gInterest(g, sTimeE);
    const double gross = g.lotShares * closeE - g.lotInvestment;
    GbTrade& v = g.o.trades[g.posTrade];
    v.open = 1;
    double net = gross - interest, intr = interest;
    if (g.rules && g.rFills > 0) {
      intr = intr + (0 + g.rPartialInterest);
      net = g.rPartialNet + net;
    }
    v.vNet = net;
    v.vInterest = intr;
  }

  bo.net = g.realized + unrealizedLast;
  bo.realized = g.realized;
  bo.minuteDd = minute.maximum;
  bo.dailyDd = session.maximum;
  bo.nTrades = g.status == C_OK ? g.nTrades : 0;
  bo.signals = bo.nTrades;
  bo.firstDS = bo.nTrades > 0 ? g.o.trades[0].dS : -1;
  bo.status = g.status;
  bo.errInfo = g.errInfo;
  atomicAdd(executed, 1u);
}
