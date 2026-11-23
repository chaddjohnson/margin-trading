// gpu-backend: the D1 book with RC 1 / RC 2 controls — Phase 1's verified device port (src/gpu-phase1/cuda/
// gp1_device.cuh and gp1_kernels.cuh: runD1BookRc2 → RiskShadowBook2 → RiskShadowBook → ShadowBook → EntryMachine /
// ExitManager → RiskExitManager and the entry-day trigger; the decline gate), carried over expression for expression and
// adapted to the v2 output structures (gb.h). One GPU thread per (candidate, D1 book).
#pragma once
#include "gb_common.cuh"

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
  // staged-stop@1 (v3; RiskShadowBook3's tracker)
  Staged stg;
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

__device__ __forceinline__ double refHighAt(const DevSym& d, int L, int s) { return LD(d.refHigh + (size_t)(L - 1) * d.S + s); }

// ShadowBook.markAt
__device__ __forceinline__ double markAt(const D1State& st, const D1Params& p, double price, double sessionTime) {
  return st.posActive ? st.lotShares * price - st.lotInvestment - interestOn(st, p.rate, sessionTime) : 0.0;
}

// EntryMachine.armingKind: 0 none, 1 deep, 2 continuation
__device__ __forceinline__ int armingKind(const DevSym& d, const D1State& st, const D1Params& p, int s, double close) {
  if (s < p.armStart) return 0;
  const double recentHigh = refHighAt(d, p.L, s);
  if (s >= p.L && 1 - close / recentHigh >= p.X) return 1;
  const bool contOpen = st.contActive && s > st.contStart && s - st.contStart <= p.W;  // postExit is true for D1
  if (contOpen && close <= st.contHigh * (1 - p.pullback)) return 2;
  return 0;
}

// DeclineGate.onExit
__device__ void gateOnExit(D1State& st, const D1Params& p, int s, double net, double refHigh) {
  if (net > 0) {
    if (st.epActive && st.epBlockedFrom >= 0) { fail(st, C_PROFITABLE_WHILE_BLOCKED, s); return; }
    if (st.epActive) st.epActive = false;  // end: 'profitable exit'
    return;
  }
  if (!st.epActive) {
    st.epActive = true; st.epRefHigh = refHigh; st.epLow = INFINITY; st.epLosses = 1; st.epBlockedFrom = -1; st.epRefusalS = -1;
    st.episodes++;
  } else st.epLosses++;
  if (st.epLosses >= p.gateK && st.epBlockedFrom < 0) { st.epBlockedFrom = s; st.blocks++; }
}

// DeclineGate.afterClose
__device__ void gateAfterClose(const DevSym& d, D1State& st, const D1Params& p, int s) {
  if (!st.epActive) return;
  const double close = LD(d.sClose + s);
  st.epLow = jsmin(st.epLow, close);
  const double level = st.epLow + ((double)p.gateR / 1000) * (st.epRefHigh - st.epLow);
  if (close >= level) st.epActive = false;                                                        // 'recovery'
  else if (st.epBlockedFrom >= 0 && s - st.epBlockedFrom >= p.gateC) st.epActive = false;           // 'block expired'
}

__device__ __forceinline__ bool gateBlocked(const D1State& st) { return st.epActive && st.epBlockedFrom >= 0; }

struct D1Out {
  GbTrade* trades;  // [tradeCap]
  int tradeCap;
};

// The scheduled exit at bar k executes (runner close → RC 2 / RC 1 / ShadowBook close).
__device__ void d1Close(const DevSym& d, D1State& st, const D1Params& p, D1Out& o, int s, int k) {
  if (!(st.posActive && st.posDecision.valid && st.posDecision.barIndex == k)) return;

  const Decision dec = st.posDecision;
  const bool entryDay = st.entryDayDecisionLive;
  // RiskShadowBook3.close: the staged exit event (counters), then the frozen close
  stagedOnExit(st.stg, dec.reason, s);
  // ShadowBook.close
  const bool isStop = dec.reason == RS_TSTOP || dec.reason == RS_TSTOP_GAP;
  double price = dec.price * (1 - p.costBps / 10000) * (1 - (isStop ? p.slipBps / 10000 : 0));
  const double interest = interestOn(st, p.rate, LD(d.sTime + s));
  double proceeds = st.lotShares * price;
  double net = proceeds - st.lotInvestment - interest;
  const int ti = st.posTrade;

  st.posActive = false;
  st.exitedThisSession = true;
  // machine.onExit(s, decision.price, trade.net) — the pre-slippage net
  if (net > 0) { st.contActive = true; st.contHigh = dec.price; st.contStart = s; }

  // RiskShadowBook.close: slippage on protective fills
  const bool protective = dec.reason == RS_PROT || dec.reason == RS_PROT_GAP;
  if (protective && p.slipBps != 0) {
    if (net > 0) fail(st, C_PROFITABLE_PROTECTIVE, s);
    price = dec.price * (1 - p.costBps / 10000) * (1 - p.slipBps / 10000);
    proceeds = st.lotShares * price;
    net = proceeds - st.lotInvestment - interest;
  }
  if (protective) {
    st.protectiveExits++;
    if (dec.reason == RS_PROT_GAP) st.protectiveGapExits++;
  }
  if (dec.reason == RS_MAXHOLD) st.maximumHoldExits++;
  if (st.extendedFrom >= 0) st.adaptiveExtensions++;
  if (p.gateOn) gateOnExit(st, p, s, net, st.posRefHigh);
  if (entryDay) { st.entryDayExits++; st.entryDayDecisionLive = false; }

  // runner close: the virtual fill
  if (ti < o.tradeCap) {
    GbTrade& v = o.trades[ti];
    GbFill& f = v.fills[0];
    f.s = s; f.k = dec.barIndex; f.t = dec.time; f.raw = dec.price; f.price = price; f.partial = 0; f.f = 1; f.reason = dec.reason;
    v.nFills = 1;
    v.vNet = net;
    v.vInterest = interest;
  }
  st.realized += net;
}

// The order fills at bar k (runner fill → RC 2 / RC 1 / ShadowBook open). Returns whether it filled.
__device__ bool d1Fill(const DevSym& d, D1State& st, const D1Params& p, D1Out& o, int s, int k) {
  if (!(st.orderActive && st.orderFillBar == k)) return false;

  const double raw = priceAt(d, s, k);
#ifdef GB_TEST_PERTURB
  const double price = raw * (1 + p.costBps / 10000) * (1 + 1e-12);  // TEST BUILD ONLY: a deliberately wrong kernel (the parity mini-set must refuse it)
#else
  const double price = raw * (1 + p.costBps / 10000);
#endif
  const double shares = 100000.0 / price;
  const double sTimeS = LD(d.sTime + s);

  st.lotEntryPrice = price; st.lotShares = shares; st.lotInvestment = 100000.0; st.lotEntryTs = sTimeS; st.lotHoldTs = sTimeS; st.lotEntryRaw = raw;

  // ExitManager.onEntry(lot, s, k, raw)
  const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
  double high = jsmax(raw, LD(d.sClose + s));
  double low = jsmin(raw, LD(d.sClose + s));
  for (int j = k; j < count; j++) { high = jsmax(high, LD(d.bHigh + start + j)); low = jsmin(low, LD(d.bLow + start + j)); }
  st.postEntryHigh = high; st.postEntryLow = low;
  st.stopPrice = high * (1 - p.tsp);
  st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN;
  st.stopActiveSessions = 0; st.stopFirstActiveIndex = -1;

  // RiskShadowBook.open: the policy
  st.hasProt = p.stopTenths >= 0;
  st.protLevel = st.hasProt ? raw * (1 - (double)p.stopTenths / 1000) : NAN;
  st.holdBase = p.hold; st.holdExt = (double)p.extHold;
  st.progressPrice = p.holdMode == 2 ? raw * (1 + (double)p.progTenths / 1000) : NAN;
  st.extendedFrom = -1; st.effectiveHold = NAN;

  const int ti = st.orderTrade;
  st.posActive = true; st.posTrade = ti; st.posEntryS = s; st.posRefHigh = st.orderRefHigh; st.posDecision = noDecision();
  st.orderActive = false;
  st.setupActive = false; st.pending = false;  // machine.clearSetup('filled')
  st.entryDayDecisionLive = false;

  if (ti < o.tradeCap) {
    GbTrade& v = o.trades[ti];
    v.eS = s; v.eK = k; v.eT = timeAt(d, s, k); v.eRaw = raw; v.ePrice = price;
  }

  // RiskShadowBook2.open: the entry-day trigger
  if (p.entryDay && st.hasProt) {
    const Trigger tr = entryDayTrigger(d, st, s, k, st.protLevel, p.stopFill);
    if (tr.valid) {
      if (interestOn(st, p.rate, sTimeS) != 0) fail(st, C_ENTRY_DAY_INTEREST, s);
      st.posDecision = mkDecision(RS_PROT, tr.barIndex, tr.price, tr.time);
      st.entryDayDecisionLive = true;
    }
  }
  // RiskShadowBook3.open: the staged onEntry hook after RC 2's open (the entry-day trigger reads only the protective level)
  stagedOnEntry(st.stg, st.postEntryHigh, st.stopPrice, raw, s, LD(d.sClose + s));
  return true;
}

// ShadowBook.processBar → EntryMachine.processBar (with RiskShadowBook's gate refusal). Returns 1 on a signal.
__device__ bool d1ProcessBar(const DevSym& d, D1State& st, const D1Params& p, int s, int k, double& decisionTime, double& decisionPrice) {
  if (st.positionAtStart || st.exitedThisSession || st.orderActive || st.posActive) return false;

  const int b = LD(d.sBarStart + s) + k;
  const double close = LD(d.bClose + b);

  if (p.gateOn && gateBlocked(st)) {
    if (st.setupActive || st.contActive) { fail(st, C_GATE_STATE, s); return false; }
    const int kind = armingKind(d, st, p, s, close);
    if (kind) {
      st.blockedMinutes++;
      if (st.epRefusalS != s) { st.epRefusalS = s; st.blockedSessions++; }
    }
    return false;
  }

  if (!st.setupActive) {
    const int kind = armingKind(d, st, p, s, close);
    if (!kind) return false;
    st.setups++;
    st.setupActive = true; st.setupKind = kind;
    st.setupRefHigh = refHighAt(d, p.L, s);
    st.setupTrailingLow = close;
    st.setupReboundTrigger = close * (1 + p.Y);
    st.contActive = false;  // any arming ends the continuation window
    return false;
  }

  const double low = LD(d.bLow + b);
  if (low < st.setupTrailingLow) st.setupTrailingLow = low;
  st.setupReboundTrigger = st.setupTrailingLow * (1 + p.Y);
  if (close < st.setupReboundTrigger) return false;
  decisionTime = LD(d.bTime + b) + SPM;
  decisionPrice = close;
  return true;
}

// The receipt counter `executed` counts the (candidate, book) threads that ran a D1 book to its end on this device.
__global__ void d1Kernel(DevData data, const GbCandIn* __restrict__ cands, int nCand, GbTrade* tradesAll, int tradeCap,
                         GbCandOut* outs, int endIndex, unsigned* executed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  const int b = blockIdx.y;  // 0 = D1:GDX, 1 = D1:VGT
  if (c >= nCand) return;

  const GbD1In in = cands[c].d1[b];
  GbBookOut& bo = outs[c].book[b];

  if (!in.enabled) {
    bo.nTrades = 0; bo.signals = 0; bo.firstDS = -1; bo.status = C_OK; bo.errInfo = 0;
    bo.stagedArms = 0; bo.stagedExits = 0; bo.placementExits = 0; bo.pad = 0;
    return;
  }

  const DevSym& d = data.sym[b];
  D1Params p;
  p.X = in.X; p.Y = in.Y; p.tsp = in.tsp; p.hold = in.hold; p.buffer = in.buffer; p.pullback = in.pullback;
  p.costBps = in.costBps; p.rate = in.rate; p.slipBps = in.slipBps; p.L = in.L; p.W = in.W; p.stopTenths = in.stopTenths;
  p.entryDay = in.entryDay; p.holdMode = in.holdMode; p.extHold = in.extHold; p.progTenths = in.progTenths; p.gateOn = in.gateOn;
  p.gateK = in.gateK; p.gateR = in.gateR; p.gateC = in.gateC; p.armStart = in.armStart; p.stopFill = in.stopFill;

  D1State st;
  memset(&st, 0, sizeof(st));
  st.posDecision = noDecision();
  st.pendingSignalTime = NAN; st.pendingSignalPrice = NAN;
  st.epRefusalS = -1;
  st.status = C_OK;
  stagedInit(st.stg, in.stagedOn, in.actTenths, in.st2Tenths);

  if (p.L < 1 || p.L > d.maxL || p.W < 0 || endIndex >= d.S || endIndex < 1) fail(st, C_INVALID, p.L);
  if (!stagedDomainOk(in.stagedOn, in.actTenths, in.st2Tenths)) fail(st, C_INVALID, in.actTenths);

  D1Out o;
  o.trades = tradesAll + ((size_t)c * 2 + b) * tradeCap;
  o.tradeCap = tradeCap;

  Tracker minute, daily;
  trackerInit(minute, 0, LD(d.bTime + LD(d.sBarStart + 0)));
  trackerInit(daily, 0, LD(d.sTime + 0));

  double lastDT = -INFINITY;
  // the mark's interest is constant within a session for one position: cached by (session, trade) — same operands,
  // same bits
  int cacheS = -1, cacheTrade = -1;
  double cacheInterest = 0;

  for (int s = 1; s <= endIndex && st.status == C_OK; s++) {
    const int start = LD(d.sBarStart + s), count = LD(d.sBarCount + s);
    const double sTimeS = LD(d.sTime + s);

    // beginSession
    st.exitedThisSession = false;
    st.positionAtStart = st.posActive;
    if (st.orderActive && st.orderFillBar < 0) st.orderFillBar = firstTradeAfterDecision(d, s, st.orderDecisionTime);
    if (st.posActive) {
      st.posDecision = riskEvaluate(d, st, p, s);
      st.entryDayDecisionLive = false;
    }

    for (int k = 0; k < count; k++) {
      const bool heldBefore = st.posActive;

      d1Close(d, st, p, o, s, k);
      if (d1Fill(d, st, p, o, s, k)) d1Close(d, st, p, o, s, k);

      double dt, dp;
      if (d1ProcessBar(d, st, p, s, k, dt, dp)) {
        // commit
        if (p.gateOn && gateBlocked(st)) fail(st, C_GATE_DECISION_BLOCKED, s);
        const int ti = st.nTrades++;
        if (ti >= o.tradeCap) { fail(st, C_TRADE_CAPACITY, ti); break; }
        if (!(dt > lastDT)) fail(st, C_D1_ORDER, ti);
        lastDT = dt;
        GbTrade& v = o.trades[ti];
        memset(&v, 0, sizeof v);  // every byte defined (unused fill slots included: initcheck)
        v.id = ti + 1; v.kind = st.setupKind == 1 ? 0 : 1; v.dS = s; v.dT = dt; v.dPrice = dp;
        v.eS = -1; v.eK = -1; v.eT = NAN; v.eRaw = NAN; v.ePrice = NAN; v.nFills = 0; v.open = 0; v.vNet = 0; v.vInterest = 0; v.pad = 0;
        st.pending = true;
        st.orderActive = true; st.orderTrade = ti; st.orderDecisionTime = dt; st.orderRefHigh = st.setupRefHigh;
        st.orderFillBar = firstTradeAfterDecision(d, s, dt);
      }

      if (heldBefore || st.posActive) {
        double m = 0.0;
        if (st.posActive) {
          if (cacheS != s || cacheTrade != st.posTrade) { cacheS = s; cacheTrade = st.posTrade; cacheInterest = interestOn(st, p.rate, sTimeS); }
          m = st.lotShares * LD(d.bClose + start + k) - st.lotInvestment - cacheInterest;
        }
        updateStrict(minute, st.realized + m, LD(d.bTime + start + k));
      }
    }
    if (st.status != C_OK) break;

    d1Close(d, st, p, o, s, count);
    d1Fill(d, st, p, o, s, count);
    // afterSession: the position's high and stop (not on its entry session), the continuation window, the gate
    if (st.posActive && st.posEntryS != s) {
      st.postEntryHigh = jsmax(st.postEntryHigh, LD(d.sHigh + s));
      st.postEntryLow = jsmin(st.postEntryLow, LD(d.sLow + s));
      st.stopPrice = jsmax(st.stopPrice, st.postEntryHigh * (1 - p.tsp));
      // RiskShadowBook3.afterSession: the staged hook after the manager's ratchet (order-equivalent to the CPU's, which
      // runs after the continuation window and the gate: neither reads the level)
      stagedStep(st.stg, st.postEntryHigh, st.stopPrice, s, LD(d.sClose + s));
    }
    if (st.contActive) {
      if (s > st.contStart) st.contHigh = jsmax(st.contHigh, LD(d.sHigh + s));
      if (s - st.contStart >= p.W) st.contActive = false;
    }
    if (p.gateOn) gateAfterClose(d, st, p, s);

    const double closeS = LD(d.sClose + s);
    updateStrict(minute, st.realized + markAt(st, p, closeS, sTimeS), LD(d.sCloseTime + s));
    updateStrict(daily, st.realized + markAt(st, p, closeS, sTimeS), sTimeS);
  }

  // finish: an open position is marked at the last close with its accrued interest
  double net = st.realized;
  if (st.status == C_OK) {
    const double closeE = LD(d.sClose + endIndex), sTimeE = LD(d.sTime + endIndex);
    if (st.posActive) {
      const double interest = interestOn(st, p.rate, sTimeE);
      const double gross = st.lotShares * closeE - st.lotInvestment;
      GbTrade& v = o.trades[st.posTrade];
      v.open = 1;
      v.vNet = gross - interest;
      v.vInterest = interest;
    }
    net = st.realized + markAt(st, p, closeE, sTimeE);
  }

  bo.net = net;
  bo.realized = st.realized;
  bo.minuteDd = minute.maximum;
  bo.dailyDd = daily.maximum;
  bo.nTrades = st.nTrades;
  bo.signals = st.nTrades;
  bo.protectiveExits = st.protectiveExits; bo.protectiveGapExits = st.protectiveGapExits; bo.maximumHoldExits = st.maximumHoldExits;
  bo.adaptiveExtensions = st.adaptiveExtensions; bo.episodes = st.episodes; bo.blocks = st.blocks;
  bo.blockedSessions = st.blockedSessions; bo.blockedMinutes = st.blockedMinutes; bo.entryDayExits = st.entryDayExits;
  bo.stagedArms = st.stg.arms; bo.stagedExits = st.stg.stagedExits; bo.placementExits = st.stg.placementExits; bo.pad = 0;
  bo.firstDS = st.nTrades > 0 ? o.trades[0].dS : -1;
  bo.status = st.status;
  bo.errInfo = st.errInfo;
  atomicAdd(executed, 1u);
}

