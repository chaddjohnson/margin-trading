// gpu-phase1-feasibility: the D1 book runner kernel (runD1BookRc2) and the pooled replay kernel (runPool).
#pragma once
#include "gp1_device.cuh"

// ---------------------------------------------------------------------------------------------------------------------
// The D1 book (one thread = one candidate's book of one symbol)
// ---------------------------------------------------------------------------------------------------------------------

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
  Gp1Trade* trades;  // [tradeCap]
  int tradeCap;
};

// The scheduled exit at bar k executes (runner close → RC 2 / RC 1 / ShadowBook close).
__device__ void d1Close(const DevSym& d, D1State& st, const D1Params& p, D1Out& o, int s, int k) {
  if (!(st.posActive && st.posDecision.valid && st.posDecision.barIndex == k)) return;

  const Decision dec = st.posDecision;
  const bool entryDay = st.entryDayDecisionLive;
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
    Gp1Trade& v = o.trades[ti];
    Gp1Fill& f = v.fills[0];
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
  const double price = raw * (1 + p.costBps / 10000);
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
    Gp1Trade& v = o.trades[ti];
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

__global__ void initKernel(const Gp1CandIn* __restrict__ cands, int nCand, Gp1CandOut* outs, int32_t* bookStatus) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand) return;
  memset(&outs[c], 0, sizeof(Gp1CandOut));
  outs[c].id = cands[c].id;
  bookStatus[4 * c] = 0; bookStatus[4 * c + 1] = 0; bookStatus[4 * c + 2] = 0; bookStatus[4 * c + 3] = 0;
}

// Deterministic per-candidate status: D1:GDX's error first, then D1:VGT's (the book index in errInfo's high byte).
__global__ void combineKernel(int nCand, Gp1CandOut* outs, const int32_t* bookStatus) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand) return;
  for (int b = 0; b < 2; b++)
    if (bookStatus[4 * c + 2 * b] != C_OK) {
      outs[c].status = bookStatus[4 * c + 2 * b];
      outs[c].errInfo = (b << 24) | (bookStatus[4 * c + 2 * b + 1] & 0xFFFFFF);
      return;
    }
}

__global__ void d1Kernel(DevData data, const Gp1CandIn* __restrict__ cands, int nCand, Gp1Trade* tradesAll, int tradeCap,
                         Gp1CandOut* outs, int32_t* bookStatus, int endIndex) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  const int b = blockIdx.y;  // 0 = D1:GDX, 1 = D1:VGT
  if (c >= nCand) return;

  const Gp1D1In in = cands[c].d1[b];
  Gp1BookOut& bo = outs[c].book[b];

  if (!in.enabled) { bo.nTrades = 0; bo.signals = 0; bo.firstDS = -1; return; }

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

  if (p.L < 1 || p.L > d.maxL || p.W < 0 || endIndex >= d.S || endIndex < 1) fail(st, C_INVALID, p.L);

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
        Gp1Trade& v = o.trades[ti];
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
      Gp1Trade& v = o.trades[st.posTrade];
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
  bo.firstDS = st.nTrades > 0 ? o.trades[0].dS : -1;
  bookStatus[4 * c + 2 * b] = st.status;
  bookStatus[4 * c + 2 * b + 1] = st.errInfo;
}

// ---------------------------------------------------------------------------------------------------------------------
// The pooled replay (one thread = one candidate): runPool with the default options
// ---------------------------------------------------------------------------------------------------------------------

struct BookView {  // one book's trade list
  const Gp1Trade* t;
  int n;
  int sym;  // 0 GDX, 1 VGT
};

struct PoolLot {
  int idx;  // index into the candidate's lot array
  int book, sym, trade;
};

__global__ void poolKernel(DevData data, const Gp1CandIn* __restrict__ cands, int nCand, const Gp1Trade* d1Trades, int tradeCap,
                           const Gp1Trade* __restrict__ ext, Gp1CandOut* outs, Gp1Lot* lotsAll, int lotCap, double* dailyAll,
                           double* principalAll, double* valueAll, int8_t* heldAll, int writeSeries, int endIndexIn, double budget, double rate) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand) return;

  Gp1CandOut& out = outs[c];
  if (out.status != C_OK) return;  // a D1 book failed: the candidate is void

  const Gp1CandIn& cin = cands[c];
  // books by id: 0 D1:GDX, 1 D1:VGT, 2 G:GDX, 3 G:VGT
  BookView bk[4];
  bool present[4];
  for (int b = 0; b < 2; b++) {
    present[b] = cin.d1[b].enabled != 0;
    bk[b].t = d1Trades + ((size_t)c * 2 + b) * tradeCap; bk[b].n = present[b] ? out.book[b].nTrades : 0; bk[b].sym = b;
    present[2 + b] = cin.extPresent[b] != 0;
    bk[2 + b].t = ext + (present[2 + b] ? cin.extOffset[b] : 0); bk[2 + b].n = present[2 + b] ? cin.extCount[b] : 0; bk[2 + b].sym = b;
  }
  // the external books' decisions must be strictly ordered (runGrowthBook's own check)
  for (int b = 2; b < 4; b++)
    for (int i = 1; i < bk[b].n; i++)
      if (!(bk[b].t[i].dT > bk[b].t[i - 1].dT)) { out.status = C_EXT_ORDER; out.errInfo = b; return; }

  // tie order (tieOrderOf(first)) filtered by present books
  int order[4], nOrder = 0;
  const int d1First[4] = {0, 1, 2, 3}, gFirst[4] = {2, 3, 0, 1};
  for (int i = 0; i < 4; i++) { const int b = cin.first == 0 ? d1First[i] : gFirst[i]; if (present[b]) order[nOrder++] = b; }
  // the timeline's symbols (GDX, VGT order) and the reference dataset
  bool symOn[2] = {present[0] || present[2], present[1] || present[3]};
  const DevSym& ref = data.sym[symOn[0] ? 0 : 1];
  const int S = ref.S;
  const int endIndex = endIndexIn < S - 1 ? endIndexIn : S - 1;

  int cursor[4] = {0, 0, 0, 0};
  for (int i = 0; i < 4; i++) for (int j = 0; j < 3; j++) out.decisions[i][j] = 0;
  int refusedSlot = 0;
  Gp1Lot* lots = lotsAll + (size_t)c * lotCap;
  double* daily = dailyAll + (size_t)c * S;
  // the per-close principal / value / held series are written only when the caller asks for them (parity mode)
  double* principalAtClose = writeSeries ? principalAll + (size_t)c * S : nullptr;
  double* valueAtClose = writeSeries ? valueAll + (size_t)c * S : nullptr;
  int8_t* heldAtClose = writeSeries ? heldAll + (size_t)c * S : nullptr;
  int nLots = 0;
  int openLot = -1;          // index into lots, -1 = flat
  int resBook = -1, resIdx = -1;  // the reserved order
  double realized = 0;
  long long marks = 0;
  int nextExit = 0;
  int status = C_OK, errInfo = 0;
  const int bookIndexD1[4] = {0, 1, 2, 3};  // tieOrderOf('D1') index of each book

  for (int s = 0; s < S; s++) {
    daily[s] = NAN;
    if (writeSeries) { principalAtClose[s] = 0; valueAtClose[s] = 0; heldAtClose[s] = -1; }
  }

  auto tradeOf = [&](int b, int i) -> const Gp1Trade& { return bk[b].t[i]; };

  auto decide = [&](int b, int i) {
    out.decisions[b][0]++;
    if ((openLot >= 0 && lots[openLot].book == b) || (resBook == b)) { if (status == C_OK) { status = C_POOL_DECIDE_HOLDING; errInfo = b; } return; }
    if (openLot >= 0 || resBook >= 0) { out.decisions[b][2]++; refusedSlot++; return; }
    out.decisions[b][1]++;
    resBook = b; resIdx = i;
  };
  auto decideUntil = [&](double t) {
    for (;;) {
      int best = -1; double bestT = INFINITY;
      for (int j = 0; j < nOrder; j++) {
        const int b = order[j];
        if (cursor[b] < bk[b].n) { const double dT = tradeOf(b, cursor[b]).dT; if (dT <= t && dT < bestT) { best = b; bestT = dT; } }
      }
      if (best < 0) return;
      const int i = cursor[best]++;
      decide(best, i);
    }
  };
  auto nextDecisionTime = [&]() {
    double t = INFINITY;
    for (int j = 0; j < nOrder; j++) { const int b = order[j]; if (cursor[b] < bk[b].n) { const double dT = tradeOf(b, cursor[b]).dT; if (dT < t) t = dT; } }
    return t;
  };
  auto openLotNow = [&]() {
    const int b = resBook, i = resIdx;
    resBook = -1; resIdx = -1;
    const Gp1Trade& tr = tradeOf(b, i);
    const double shares = budget / tr.ePrice;
    const double principal = budget;
    if (!(shares > 0)) return;
    if (nLots >= lotCap) { if (status == C_OK) { status = C_LOT_CAPACITY; errInfo = nLots; } return; }
    Gp1Lot& L = lots[nLots];
    L.id = nLots + 1; L.book = b; L.tradeIdx = i;
    L.principal0 = principal; L.shares0 = shares; L.shares = shares; L.principal = principal;
    L.entryS = tr.eS; L.entryT = tr.eT; L.entryRaw = tr.eRaw; L.entryPrice = tr.ePrice; L.entryTs = LD(data.sym[bk[b].sym].sTime + tr.eS);
    L.nFills = 0; L.realized = 0; L.interest = 0; L.open = 1; L.net = 0; L.unrealized = 0;
    L.costs = shares * (tr.ePrice - tr.eRaw);
    openLot = nLots++;
    nextExit = 0;
  };
  auto exitFill = [&](Gp1Lot& L, const Gp1Fill& f) {
    const double sTimeF = LD(data.sym[bk[L.book].sym].sTime + f.s);
    const double sold = f.partial ? L.shares * f.f : L.shares;
    const double repaid = f.partial ? L.principal * f.f : L.principal;
    const double interest = repaid * rate * ((sTimeF - L.entryTs) / SPY);
    const double proceeds = sold * f.price;
    const double net = proceeds - repaid - interest;
    if (L.nFills >= GP1_MAX_FILLS) { if (status == C_OK) { status = C_FILL_CAPACITY; errInfo = L.id; } return; }
    Gp1LotFill& x = L.fills[L.nFills++];
    x.s = f.s; x.k = f.k; x.t = f.t; x.raw = f.raw; x.price = f.price; x.partial = f.partial; x.shares = sold; x.principal = repaid;
    x.interest = interest; x.proceeds = proceeds; x.net = net; x.reason = f.reason;
    L.realized += net;
    L.interest += interest;
    L.costs += sold * (f.raw - f.price);
    realized += net;
    if (f.partial) { L.shares = L.shares - sold; L.principal = L.principal - repaid; }
    else { L.shares = 0; L.principal = 0; L.open = 0; L.net = L.realized; openLot = -1; }
  };
  auto exitsAt = [&](int s, int sym, int k) {
    while (openLot >= 0 && bk[lots[openLot].book].sym == sym) {
      Gp1Lot& L = lots[openLot];
      const Gp1Trade& tr = tradeOf(L.book, L.tradeIdx);
      if (nextExit >= tr.nFills) return;
      const Gp1Fill& f = tr.fills[nextExit];
      if (f.s != s || f.k != k) return;
      nextExit++;
      exitFill(L, f);
    }
  };

  Tracker minute, sessionT;
  trackerInit(minute, 0, LD(ref.bTime + LD(ref.sBarStart + 0)));
  trackerInit(sessionT, 0, LD(ref.sTime + 0));
  double peakPrincipal = 0, peakValue = 0;
  int sessionsHeld = 0;
  const int exitOrder[2] = {1, 0};  // VGT, then GDX
  int ix[2] = {0, 0};

  auto markOf = [&](const Gp1Lot& L, double price, double sTime) {
    return L.shares * price - L.principal - L.principal * rate * ((sTime - L.entryTs) / SPY);
  };
  auto record = [&](double value, double t) { updateStrict(minute, value, t); marks++; };
  auto printsAt = [&](int s, int sym, double T) {
    const DevSym& ds = data.sym[sym];
    return ix[sym] < LD(ds.sBarCount + s) && LD(ds.bTime + LD(ds.sBarStart + s) + ix[sym]) == T;
  };

  for (int s = 0; s <= endIndex && status == C_OK; s++) {
    const double sTime = LD(ref.sTime + s);
    const double closeTime = LD(ref.sCloseTime + s);
    bool held = openLot >= 0;
    const bool noDec = nextDecisionTime() > closeTime;
    const bool skipBars = openLot < 0 && resBook < 0 && noDec;
    bool quiet = false;
    if (openLot >= 0 && noDec && resBook < 0) {
      const Gp1Lot& L = lots[openLot];
      const Gp1Trade& tr = tradeOf(L.book, L.tradeIdx);
      quiet = !(nextExit < tr.nFills && tr.fills[nextExit].s == s);
    }

    if (quiet) {
      Gp1Lot& L = lots[openLot];
      const DevSym& ds = data.sym[bk[L.book].sym];
      const int start = LD(ds.sBarStart + s), count = LD(ds.sBarCount + s);
      const double interest = L.principal * rate * ((sTime - L.entryTs) / SPY);
      if (L.principal > peakPrincipal) peakPrincipal = L.principal;
      for (int k = 0; k < count; k++) {
        const double price = LD(ds.bClose + start + k);
        const double mv = L.shares * price;
        if (mv > peakValue) peakValue = mv;
        record(realized + (mv - L.principal - interest), LD(ds.bTime + start + k));
      }
    } else if (!skipBars) {
      ix[0] = 0; ix[1] = 0;
      for (;;) {
        double T = INFINITY;
        for (int sym = 0; sym < 2; sym++) {
          if (!symOn[sym]) continue;
          const DevSym& ds = data.sym[sym];
          if (ix[sym] < LD(ds.sBarCount + s)) { const double bt = LD(ds.bTime + LD(ds.sBarStart + s) + ix[sym]); if (bt < T) T = bt; }
        }
        if (T == INFINITY) break;

        const int heldBefore = openLot >= 0 ? bk[lots[openLot].book].sym : -1;

        decideUntil(T);
        for (int e = 0; e < 2; e++) { const int sym = exitOrder[e]; if (symOn[sym] && printsAt(s, sym, T)) exitsAt(s, sym, ix[sym]); }
        for (int e = 0; e < 2; e++) {
          const int sym = exitOrder[e];
          if (!symOn[sym] || !printsAt(s, sym, T)) continue;
          if (resBook >= 0 && bk[resBook].sym == sym) {
            const Gp1Trade& r = tradeOf(resBook, resIdx);
            if (r.eS == s && r.eK == ix[sym]) { openLotNow(); exitsAt(s, sym, ix[sym]); }
          }
        }

        const int lotAfter = openLot;
        bool markHeld = false;
        for (int sym = 0; sym < 2; sym++) {
          if (!symOn[sym] || !printsAt(s, sym, T)) continue;
          if (sym == heldBefore || (lotAfter >= 0 && sym == bk[lots[lotAfter].book].sym)) markHeld = true;
        }
        if (lotAfter >= 0) held = true;
        if (markHeld) {
          double value = realized;
          if (lotAfter >= 0) {
            const Gp1Lot& L = lots[lotAfter];
            const int sym = bk[L.book].sym;
            const DevSym& ds = data.sym[sym];
            const double price = LD(ds.bClose + LD(ds.sBarStart + s) + ix[sym]);
            const double mv = L.shares * price;
            if (mv > peakValue) peakValue = mv;
            if (L.principal > peakPrincipal) peakPrincipal = L.principal;
            value += markOf(L, price, sTime);
          }
          record(value, T);
        }
        for (int sym = 0; sym < 2; sym++) if (symOn[sym] && printsAt(s, sym, T)) ix[sym]++;
      }

      decideUntil(closeTime);
      for (int e = 0; e < 2; e++) { const int sym = exitOrder[e]; if (symOn[sym]) exitsAt(s, sym, LD(data.sym[sym].sBarCount + s)); }
      for (int e = 0; e < 2; e++) {
        const int sym = exitOrder[e];
        if (!symOn[sym]) continue;
        const int count = LD(data.sym[sym].sBarCount + s);
        if (resBook >= 0 && bk[resBook].sym == sym) {
          const Gp1Trade& r = tradeOf(resBook, resIdx);
          if (r.eS == s && r.eK == count) { openLotNow(); exitsAt(s, sym, count); }
        }
      }
    }

    double closeValue = realized;
    if (openLot >= 0) {
      const Gp1Lot& L = lots[openLot];
      const DevSym& ds = data.sym[bk[L.book].sym];
      const double price = LD(ds.sClose + s);
      const double mv = L.shares * price;
      if (mv > peakValue) peakValue = mv;
      if (L.principal > peakPrincipal) peakPrincipal = L.principal;
      closeValue += markOf(L, price, sTime);
      if (writeSeries) {
        valueAtClose[s] = mv;
        principalAtClose[s] = L.principal;
        heldAtClose[s] = (int8_t)bookIndexD1[L.book];
      }
      held = true;
    }
    record(closeValue, closeTime);
    updateStrict(sessionT, closeValue, sTime);
    daily[s] = closeValue;
    if (held) sessionsHeld++;
  }

  double unrealized = 0;
  if (status == C_OK && openLot >= 0) {
    Gp1Lot& L = lots[openLot];
    const DevSym& ds = data.sym[bk[L.book].sym];
    const double accrued = L.principal * rate * ((LD(ds.sTime + endIndex) - L.entryTs) / SPY);
    const double mark = L.shares * LD(ds.sClose + endIndex) - L.principal - accrued;
    L.unrealized = mark;
    L.interest += accrued;
    L.net = L.realized + mark;
    unrealized = mark;
    const Gp1Trade& tr = tradeOf(L.book, L.tradeIdx);
    if (nextExit < tr.nFills && tr.fills[nextExit].s <= endIndex) { status = C_POOL_EXIT_SKIPPED; errInfo = L.id; }
  }

  out.net = realized + unrealized;
  out.realized = realized;
  out.unrealized = unrealized;
  out.dd.max = minute.maximum; out.dd.peakT = minute.ddPeakTime; out.dd.troughT = minute.troughTime; out.dd.recoveryT = minute.recoveryTime;
  out.ddDaily.max = sessionT.maximum; out.ddDaily.peakT = sessionT.ddPeakTime; out.ddDaily.troughT = sessionT.troughTime; out.ddDaily.recoveryT = sessionT.recoveryTime;
  out.peakPrincipal = peakPrincipal;
  out.peakValue = peakValue;
  out.sessionsHeld = sessionsHeld;
  out.refusedSlot = refusedSlot;
  out.marks = marks;
  out.nLots = nLots;
  if (status != C_OK) { out.status = status; out.errInfo = errInfo; }
}

// Reference highs for every lookback 1 … maxL (computeReferenceHighs with firstIndex 0): the highest session high of
// sessions [max(0, s − L), s − 1]; −Infinity for s = 0. Exact (a maximum of doubles involves no rounding).
__global__ void refHighKernel(const double* __restrict__ sHigh, int S, int maxL, double* table) {
  const size_t i = (size_t)blockIdx.x * blockDim.x + threadIdx.x;
  if (i >= (size_t)S * maxL) return;
  const int L = (int)(i / S) + 1, s = (int)(i % S);
  double h = -INFINITY;
  const int from = s - L > 0 ? s - L : 0;
  for (int j = from; j <= s - 1; j++) { const double x = sHigh[j]; h = j == from ? x : (h >= x ? h : x); }
  table[i] = h;
}

__global__ void faultKernel(int* p) {
  if (threadIdx.x == 0) __trap();
  p[threadIdx.x] = 1;
}
