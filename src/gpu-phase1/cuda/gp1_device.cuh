// gpu-phase1-feasibility: the device evaluator. A LINE-FOR-LINE port of the canonical CPU engine's declared slice
// (PROTOCOL.md §6), one GPU thread per (candidate, D1 book) and one per candidate for the pool:
//   - runD1BookRc2 (src/d1-risk-controls-rc2/book.ts) with RiskShadowBook2 → RiskShadowBook (src/d1-risk-controls/
//     book.ts, the decline gate) → ShadowBook (src/multi-etf-allocator/shadow.ts) → EntryMachine / ExitManager
//     (src/shared-margin-portfolio/strategy.ts) → RiskExitManager (src/d1-risk-controls/exit.ts) and the entry-day
//     trigger (src/d1-risk-controls-rc2/exit.ts); the drawdown Tracker (src/multi-etf-allocator/engine.ts);
//   - runPool (src/vg-d1-growth-joint/pool.ts) for the default pool options.
// Precision rule: IEEE-754 binary64 everywhere, built with --fmad=false and IEEE division; every expression keeps the
// CPU code's operation order (JavaScript evaluates left to right without fusion), so results are bit-identical.
// Each CPU throw becomes a per-candidate status; nothing is skipped silently.
#pragma once
#include <cmath>
#include "gp1.h"

#define SPM 60.0
#define SPD 86400.0
#define SPY 31536000.0  // 365 * 86400 (secondsPerYear)

struct DevSym {
  const double *sTime, *sCloseTime, *sOpen, *sHigh, *sLow, *sClose, *sClosingPrint;
  const int32_t *sBarStart, *sBarCount;
  const double *bTime, *bOpen, *bHigh, *bLow, *bClose;
  const double *refHigh;  // [(L - 1) * S + s], L = 1 … maxL (computeReferenceHighs, firstIndex 0)
  int S, B, maxL;
};

struct DevData {
  DevSym sym[2];  // GDX, VGT
  int S;
};

#define LD(p) __ldg(p)

// ----- JavaScript Math.max / Math.min semantics (NaN propagates; +0 > −0) -----
__device__ __forceinline__ double jsmax(double a, double b) {
  if (isnan(a) || isnan(b)) return NAN;
  if (a == 0.0 && b == 0.0) return signbit(a) ? b : a;
  return a > b ? a : b;
}
__device__ __forceinline__ double jsmin(double a, double b) {
  if (isnan(a) || isnan(b)) return NAN;
  if (a == 0.0 && b == 0.0) return signbit(a) ? a : b;
  return a < b ? a : b;
}

// ----- fills (strategy.ts) -----
__device__ int firstTradeFrom(const DevSym& d, int s, double time) {
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  for (int k = 0; k < count; k++)
    if (LD(d.bTime + start + k) >= time) return k;
  return isnan(LD(d.sClosingPrint + s)) ? -1 : count;
}
__device__ int firstTradeAfterDecision(const DevSym& d, int s, double decisionTime) {
  const int k = firstTradeFrom(d, s, decisionTime);
  return (k == LD(d.sBarCount + s) && decisionTime >= LD(d.sCloseTime + s)) ? -1 : k;
}
__device__ __forceinline__ double priceAt(const DevSym& d, int s, int k) {
  return k < LD(d.sBarCount + s) ? LD(d.bOpen + LD(d.sBarStart + s) + k) : LD(d.sClosingPrint + s);
}
__device__ __forceinline__ double timeAt(const DevSym& d, int s, int k) {
  return k < LD(d.sBarCount + s) ? LD(d.bTime + LD(d.sBarStart + s) + k) : LD(d.sCloseTime + s);
}

// ----- Tracker (engine.ts): updateStrict and the fields stats() reports (maximumPercent is not used by any output) --
struct Tracker {
  double peak, peakTime, maximum, ddPeakTime, troughTime, peakValue, troughValue, recoveryTime;
  bool recovering;
};
__device__ __forceinline__ void trackerInit(Tracker& t, double start, double time) {
  t.peak = start; t.peakTime = time; t.maximum = 0.0; t.ddPeakTime = time; t.troughTime = time;
  t.peakValue = start; t.troughValue = start; t.recoveryTime = NAN; t.recovering = false;
}
__device__ __forceinline__ void updateStrict(Tracker& t, double value, double time) {
  if (value > t.peak) {
    if (t.recovering && value >= t.peakValue) { t.recoveryTime = time; t.recovering = false; }
    t.peak = value; t.peakTime = time;
  }
  if (t.peak - value > t.maximum) {
    t.maximum = t.peak - value;
    t.ddPeakTime = t.peakTime; t.troughTime = time; t.peakValue = t.peak; t.troughValue = value;
    t.recoveryTime = NAN; t.recovering = true;
  }
}

// ----- the D1 book state -----
struct Decision {
  bool valid;
  int reason, barIndex;
  double price, time, signalTime;
};
__device__ __forceinline__ Decision noDecision() { Decision x; x.valid = false; x.reason = -1; x.barIndex = -1; x.price = NAN; x.time = NAN; x.signalTime = NAN; return x; }
__device__ __forceinline__ Decision mkDecision(int reason, int k, double price, double time) {
  Decision x; x.valid = true; x.reason = reason; x.barIndex = k; x.price = price; x.time = time; x.signalTime = NAN; return x;
}

struct D1Params {  // the CPU's StrategyParams doubles + the book settings + resolved RC 2 controls
  double X, Y, tsp, hold, buffer, pullback, costBps, rate, slipBps;
  int L, W, stopTenths, entryDay, holdMode, extHold, progTenths, gateOn, gateK, gateR, gateC, armStart, stopFill;
};

struct D1State {
  // EntryMachine
  bool setupActive; int setupKind; double setupRefHigh, setupTrailingLow, setupReboundTrigger;
  bool pending; bool contActive; double contHigh; int contStart; int setups;
  // ShadowBook
  bool orderActive; int orderFillBar; double orderDecisionTime; int orderTrade; double orderRefHigh;
  bool posActive; int posTrade, posEntryS; double posRefHigh; Decision posDecision;
  bool positionAtStart, exitedThisSession;
  // the lot (LotState)
  double lotEntryPrice, lotShares, lotInvestment, lotEntryTs, lotHoldTs, lotEntryRaw;
  // ExitManager / RiskExitManager
  double postEntryHigh, postEntryLow, stopPrice, pendingSignalTime, pendingSignalPrice;
  int stopActiveSessions, stopFirstActiveIndex;
  bool hasProt; double protLevel; double holdBase, holdExt, progressPrice; int extendedFrom; double effectiveHold, paramsHold;
  bool entryDayDecisionLive;  // posDecision is the RC 2 entry-day decision
  // DeclineGate
  bool epActive; double epRefHigh, epLow; int epLosses, epBlockedFrom, epRefusalS;
  int episodes, blocks, blockedSessions, blockedMinutes;
  // counters
  int protectiveExits, protectiveGapExits, maximumHoldExits, adaptiveExtensions, entryDayExits;
  int nTrades;
  double realized;
  int status, errInfo;
};

__device__ __forceinline__ void fail(D1State& st, int code, int info) { if (st.status == C_OK) { st.status = code; st.errInfo = info; } }

__device__ __forceinline__ double interestOn(const D1State& st, double rate, double sessionTime) {
  return st.lotInvestment * rate * ((sessionTime - st.lotEntryTs) / SPY);
}

// ExitManager.evaluate (strategy.ts) with the effective hold in st.paramsHold
__device__ Decision exitEvaluate(const DevSym& d, D1State& st, const D1Params& p, int s) {
  const double sTimeS = LD(d.sTime + s);
  const double interest = interestOn(st, p.rate, sTimeS);
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  const double stopPrice = st.stopPrice;
  const double sOpenS = LD(d.sOpen + s);
  const bool active = st.lotShares * stopPrice - st.lotInvestment - interest > 0;  // stopPolicy 'net'

  if (active) {
    if (st.stopFirstActiveIndex < 0) st.stopFirstActiveIndex = s;
    st.stopActiveSessions++;
  }

  const double daysHeld = (sTimeS - st.lotHoldTs) / SPD;
  const double maximumHoldDays = st.paramsHold;
  const bool isMaximumHoldDue = daysHeld >= maximumHoldDays && st.lotShares * sOpenS - st.lotInvestment - interest < 0;
  const double pendingTime = st.pendingSignalTime;

  st.pendingSignalTime = NAN;
  st.pendingSignalPrice = NAN;

  if (active && sOpenS <= stopPrice) return mkDecision(RS_TSTOP_GAP, 0, sOpenS, timeAt(d, s, 0));

  if (!isnan(pendingTime)) {
    const int k = firstTradeAfterDecision(d, s, pendingTime);
    if (k >= 0) {
      Decision x = mkDecision(RS_BUFFER, k, priceAt(d, s, k), timeAt(d, s, k));
      x.signalTime = pendingTime;
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
      if (o <= stopPrice) {
        stopIndex = k;
        stopExit = mkDecision(RS_TSTOP, k, o, timeAt(d, s, k));
        break;
      }
      if (LD(d.bLow + start + k) <= stopPrice) {
        stopIndex = k;
        if (p.stopFill == 0) stopExit = mkDecision(RS_TSTOP, k, stopPrice, timeAt(d, s, k));
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

  const double threshold = -st.lotInvestment * p.buffer;
  int signalBar = -1;

  for (int k = 0; k < count; k++)
    if (st.lotShares * LD(d.bClose + start + k) - st.lotInvestment - interest <= threshold) { signalBar = k; break; }

  if (signalBar < 0) return stopExit;

  if (stopExit.valid && stopIndex >= 0 &&
      (stopIndex <= signalBar || (stopIndex == signalBar + 1 && LD(d.bOpen + start + stopIndex) <= stopPrice)))
    return stopExit;

  const double decisionTime = LD(d.bTime + start + signalBar) + SPM;
  const int k = firstTradeAfterDecision(d, s, decisionTime);

  if (k < 0) {
    st.pendingSignalTime = decisionTime;
    st.pendingSignalPrice = LD(d.bClose + start + signalBar);
    return noDecision();
  }

  Decision x = mkDecision(RS_BUFFER, k, priceAt(d, s, k), timeAt(d, s, k));
  x.signalTime = decisionTime;
  return x;
}

struct Trigger {
  bool valid;
  int kind;  // 0 gap, 1 open, 2 low
  int triggerK, barIndex;
  double price, time;
};

// protectiveTrigger (d1-risk-controls/exit.ts)
__device__ Trigger protectiveTrigger(const DevSym& d, int s, double level, int stopFill) {
  Trigger t; t.valid = false;
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  const double sOpenS = LD(d.sOpen + s);

  if (sOpenS <= level) { t.valid = true; t.kind = 0; t.triggerK = 0; t.barIndex = 0; t.price = sOpenS; t.time = timeAt(d, s, 0); return t; }

  for (int k = 0; k < count; k++) {
    const double o = LD(d.bOpen + start + k);
    if (o <= level) { t.valid = true; t.kind = 1; t.triggerK = k; t.barIndex = k; t.price = o; t.time = timeAt(d, s, k); return t; }
    if (LD(d.bLow + start + k) <= level) {
      t.valid = true; t.kind = 2; t.triggerK = k;
      if (stopFill == 0) { t.barIndex = k; t.price = level; t.time = timeAt(d, s, k); return t; }
      const int next = firstTradeFrom(d, s, LD(d.bTime + start + k) + SPM);
      if (next >= 0) { t.barIndex = next; t.price = priceAt(d, s, next); t.time = timeAt(d, s, next); }
      else { t.barIndex = k; t.price = LD(d.bClose + start + k); t.time = LD(d.bTime + start + k); }
      return t;
    }
  }
  return t;
}

// entryDayTrigger (d1-risk-controls-rc2/exit.ts)
__device__ Trigger entryDayTrigger(const DevSym& d, D1State& st, int s, int fillK, double level, int stopFill) {
  Trigger t; t.valid = false;
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);

  if (fillK < 0 || fillK >= count) return t;
  if (!(level < LD(d.bOpen + start + fillK))) { fail(st, C_ENTRY_DAY_LEVEL, s); return t; }

  for (int k = fillK; k < count; k++) {
    const double o = LD(d.bOpen + start + k);
    if (k > fillK && o <= level) { t.valid = true; t.kind = 1; t.triggerK = k; t.barIndex = k; t.price = o; t.time = LD(d.bTime + start + k); return t; }
    if (LD(d.bLow + start + k) <= level) {
      t.valid = true; t.kind = 2; t.triggerK = k;
      if (stopFill == 0) { t.barIndex = k; t.price = level; t.time = LD(d.bTime + start + k); return t; }
      const int next = firstTradeFrom(d, s, LD(d.bTime + start + k) + SPM);
      if (next >= 0) { t.barIndex = next; t.price = priceAt(d, s, next); t.time = timeAt(d, s, next); }
      else { t.barIndex = k; t.price = LD(d.bClose + start + k); t.time = LD(d.bTime + start + k); }
      return t;
    }
  }
  return t;
}

__device__ int firstReach(const DevSym& d, int s, double level) {
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  for (int k = 0; k < count; k++)
    if (LD(d.bOpen + start + k) <= level || LD(d.bLow + start + k) <= level) return k;
  return -1;
}

__device__ int indexOfTime(const DevSym& d, int s, double t) {
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  for (int k = 0; k < count; k++)
    if (LD(d.bTime + start + k) == t) return k;
  return -1;
}

// RiskExitManager.evaluate (d1-risk-controls/exit.ts)
__device__ Decision riskEvaluate(const DevSym& d, D1State& st, const D1Params& p, int s) {
  double hold;
  if (p.holdMode == 0) hold = st.holdBase;
  else if (p.holdMode == 1) hold = INFINITY;
  else {
    if (st.extendedFrom < 0 && st.postEntryHigh >= st.progressPrice) st.extendedFrom = s;
    hold = st.extendedFrom >= 0 ? st.holdExt : st.holdBase;
  }
  st.effectiveHold = hold;
  st.paramsHold = hold;

  const Decision legacy = exitEvaluate(d, st, p, s);

  if (!st.hasProt) return legacy;

  const Trigger tr = protectiveTrigger(d, s, st.protLevel, p.stopFill);

  if (!tr.valid) return legacy;

  const int start = LD(d.sBarStart + s);
  Decision prot = mkDecision(tr.kind == 0 ? RS_PROT_GAP : RS_PROT, tr.barIndex, tr.price, tr.time);
  // protective(): a buffered sale carried by the legacy decision is void

  if (legacy.valid && legacy.reason == RS_TSTOP_GAP) return legacy;
  if (tr.kind == 0) { st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN; return prot; }

  if (!legacy.valid) {
    if (!isnan(st.pendingSignalTime)) {
      const int kS = indexOfTime(d, s, st.pendingSignalTime - SPM);
      if (kS < 0) { fail(st, C_CARRIED_SALE_MINUTE, s); return noDecision(); }
      if (tr.triggerK <= kS || (tr.triggerK == kS + 1 && tr.kind == 1)) { st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN; return prot; }
      return noDecision();
    }
    st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN;
    return prot;
  }

  switch (legacy.reason) {
    case RS_BUFFER: {
      if (legacy.signalTime < LD(d.bTime + start)) return legacy;
      const int kS = indexOfTime(d, s, legacy.signalTime - SPM);
      if (kS < 0) { fail(st, C_CARRIED_SALE_MINUTE, s); return noDecision(); }
      if (tr.triggerK <= kS || (tr.triggerK == kS + 1 && tr.kind == 1)) { st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN; return prot; }
      return legacy;
    }
    case RS_MAXHOLD:
      if (tr.triggerK < legacy.barIndex) { st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN; return prot; }
      return legacy;
    case RS_TSTOP: {
      const int kT = firstReach(d, s, st.stopPrice);
      if (kT >= 0 && tr.triggerK < kT) { st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN; return prot; }
      return legacy;
    }
    default:
      fail(st, C_UNEXPECTED_EXIT, legacy.reason);
      return noDecision();
  }
}
