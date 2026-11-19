// gpu-backend: the pooled replay — a line-for-line port of runPool (src/vg-d1-growth-joint/pool.ts) with every
// PoolOptions field the optimization domain uses (Phase 1's verified kernel extended): the tie order (D1-first,
// Growth-first or explicit), enabled books, the funding start, blackouts, whole shares, period (reset) drawdowns, detail
// mode (the funding log and every lot's worst/best marks), plus the risk-envelope inputs of
// src/vg-l0-risk-metrics/metrics.ts (trade principal loss and banked-capital drawdown on the marked and liquidation
// bases, from the lots' re-marks exactly as engine.ts remark() and portfolioPath() build them). One thread = one candidate.
#pragma once
#include "gb_common.cuh"

struct BookView {
  const GbTrade* t;
  int n;
  int sym;  // 0 GDX, 1 VGT
};

#define GB_MAX_PERIODS 16

__global__ void poolKernel(DevData data, const GbCandIn* __restrict__ cands, int nCand, const GbTrade* d1Trades, int tradeCapD1,
                           const GbTrade* gTrades, int tradeCapG, const GbRange* __restrict__ ranges, GbCandOut* outs,
                           GbLot* lotsAll, int lotCap, GbFunding* fundAll, int fundCap, GbPeriod* periodsAll, double* dailyAll,
                           double* principalAll, double* valueAll, int8_t* heldAll, int writeSeries, int writeDaily,
                           int endIndexIn, unsigned* executed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand) return;

  GbCandOut& out = outs[c];
  const GbCandIn& cin = cands[c];
  // a book failed: the candidate is void (the first failing book in the order D1:GDX, D1:VGT, G:GDX, G:VGT)
  for (int b = 0; b < 4; b++)
    if (out.book[b].status != C_OK) { out.status = out.book[b].status; out.errInfo = (b << 24) | (out.book[b].errInfo & 0xFFFFFF); atomicAdd(executed, 1u); out.executed = 1; return; }

  BookView bk[4];
  bool present[4];
  for (int b = 0; b < 2; b++) {
    present[b] = cin.present[b] != 0;
    bk[b].t = d1Trades + ((size_t)c * 2 + b) * tradeCapD1; bk[b].n = present[b] ? out.book[b].nTrades : 0; bk[b].sym = b;
    present[2 + b] = cin.present[2 + b] != 0;
    bk[2 + b].t = gTrades + ((size_t)c * 2 + b) * tradeCapG; bk[2 + b].n = present[2 + b] ? out.book[2 + b].nTrades : 0; bk[2 + b].sym = b;
  }
  const bool detail = cin.detail != 0, risk = cin.risk != 0, whole = cin.wholeShares != 0;
  const double budget = cin.budget, rate = cin.poolRate;

  // the tie order filtered by the books given (runPool: options.tieOrder ?? tieOrderOf(first), then filter present)
  int order[4], nOrder = 0;
  for (int i = 0; i < 4; i++) { const int b = cin.tie[i]; if (b >= 0 && b < 4 && present[b]) order[nOrder++] = b; }
  // the timeline's symbols (GDX, VGT order) and the reference dataset
  const bool symOn[2] = {present[0] || present[2], present[1] || present[3]};
  const DevSym& ref = data.sym[symOn[0] ? 0 : 1];
  const int S = ref.S;
  const int endIndex = endIndexIn < S - 1 ? endIndexIn : S - 1;
  const int fundFrom = cin.fundFrom;
  const GbRange* blackouts = ranges + cin.blackoutOff;
  const int nBlackouts = cin.blackoutN;
  int boundaries[GB_MAX_PERIODS];
  const int nPeriods = cin.periodN;
  for (int i = 0; i < nPeriods; i++) boundaries[i] = ranges[cin.periodOff + i].first;
  // sort the boundaries ascending (runPool sorts a copy; insertion sort)
  for (int i = 1; i < nPeriods; i++) { const int x = boundaries[i]; int j = i - 1; while (j >= 0 && boundaries[j] > x) { boundaries[j + 1] = boundaries[j]; j--; } boundaries[j + 1] = x; }

  int cursor[4] = {0, 0, 0, 0};
  for (int i = 0; i < 4; i++) for (int j = 0; j < 3; j++) out.decisions[i][j] = 0;
  for (int i = 0; i < 5; i++) out.refusals[i] = 0;
  GbLot* lots = lotsAll + (size_t)c * lotCap;
  GbFunding* funding = fundAll + (size_t)c * fundCap;
  GbPeriod* periods = periodsAll + (size_t)cin.periodOff;
  double* daily = writeDaily ? dailyAll + (size_t)c * S : nullptr;
  double* principalAtClose = writeSeries ? principalAll + (size_t)c * S : nullptr;
  double* valueAtClose = writeSeries ? valueAll + (size_t)c * S : nullptr;
  int8_t* heldAtClose = writeSeries ? heldAll + (size_t)c * S : nullptr;
  int nLots = 0, nFunding = 0;
  int openLot = -1;               // index into lots, -1 = flat
  int resBook = -1, resIdx = -1;  // the reserved order
  double realized = 0;
  long long marks = 0;
  int nextExit = 0;
  int status = C_OK, errInfo = 0;
  // risk-envelope inputs (metrics.ts on engine.ts's re-marks): the portfolio path's realized-before, the banked
  // high-water mark, and the worst lot P&L of the open lot on both bases
  double rkBefore = 0, rkH = 0, bdM = 0, bdL = 0, plM = 0, plL = 0, lotWorstM = 0, lotWorstL = 0;
  const double costBps = cin.d1[1].costBps;  // the run's friction cost (every book of a candidate shares it)

  if (writeDaily) for (int s = 0; s < S; s++) daily[s] = NAN;
  if (writeSeries) for (int s = 0; s < S; s++) { principalAtClose[s] = 0; valueAtClose[s] = 0; heldAtClose[s] = -1; }

  auto tradeOf = [&](int b, int i) -> const GbTrade& { return bk[b].t[i]; };
  auto blackedOut = [&](int s) {
    for (int i = 0; i < nBlackouts; i++) if (s >= blackouts[i].first && s <= blackouts[i].last) return true;
    return false;
  };

  auto decide = [&](int b, int i) {
    const GbTrade& tr = tradeOf(b, i);
    int reason = R_GRANTED;
    out.decisions[b][0]++;
    // enabled: a disabled book is never given to the pool here (present = false), as booksOf skips it
    if (tr.dS < fundFrom) reason = R_BEFORE_FUNDING;
    else if (blackedOut(tr.dS)) reason = R_BLACKOUT;
    else if ((openLot >= 0 && lots[openLot].book == b) || resBook == b) { if (status == C_OK) { status = C_POOL_DECIDE_HOLDING; errInfo = b; } return; }
    else if (openLot >= 0 || resBook >= 0) reason = R_SLOT;
    if (reason == R_GRANTED) out.decisions[b][1]++;
    else { out.decisions[b][2]++; out.refusals[reason]++; }
    if (detail) {
      if (nFunding >= fundCap) { if (status == C_OK) { status = C_FUNDING_CAPACITY; errInfo = nFunding; } }
      else {
        GbFunding& f = funding[nFunding++];
        memset(&f, 0, sizeof f);
        f.book = b; f.trade = tr.id; f.kind = tr.kind; f.s = tr.dS; f.t = tr.dT; f.price = tr.dPrice;
        f.granted = reason == R_GRANTED ? 1 : 0; f.reason = reason;
        f.occupantBook = openLot >= 0 ? lots[openLot].book : resBook;
        f.occupantLot = openLot >= 0 ? lots[openLot].id : (resBook >= 0 ? 0 : -1);
        f.occupantPrincipal = openLot >= 0 ? lots[openLot].principal : NAN;
      }
    }
    if (reason == R_GRANTED) { resBook = b; resIdx = i; }
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
    const GbTrade& tr = tradeOf(b, i);
    double shares = budget / tr.ePrice;
    double principal = budget;
    if (whole) { shares = floor(shares + 1e-9); principal = shares * tr.ePrice; }
    if (!(shares > 0)) return;
    if (nLots >= lotCap) { if (status == C_OK) { status = C_LOT_CAPACITY; errInfo = nLots; } return; }
    GbLot& L = lots[nLots];
    memset(&L, 0, sizeof L);  // every byte defined (unused fill slots included: initcheck)
    L.id = nLots + 1; L.book = b; L.tradeIdx = i;
    L.principal0 = principal; L.shares0 = shares; L.shares = shares; L.principal = principal;
    L.entryS = tr.eS; L.entryT = tr.eT; L.entryRaw = tr.eRaw; L.entryPrice = tr.ePrice; L.entryTs = LD(data.sym[bk[b].sym].sTime + tr.eS);
    L.nFills = 0; L.realized = 0; L.interest = 0; L.open = 1; L.net = 0; L.unrealized = 0;
    L.costs = shares * (tr.ePrice - tr.eRaw);
    L.worst = INFINITY; L.worstT = NAN; L.best = -INFINITY; L.bestT = NAN;
    openLot = nLots++;
    nextExit = 0;
    lotWorstM = 0; lotWorstL = 0;
  };
  auto riskPoint = [&](double m, double l, double r) {  // one point of the portfolio path: banked-capital drawdown
    if (r > rkH) rkH = r;
    const double dm = rkH - m, dl = rkH - l;
    if (dm > bdM) bdM = dm;
    if (dl > bdL) bdL = dl;
  };
  auto exitFill = [&](GbLot& L, const GbFill& f) {
    const double sTimeF = LD(data.sym[bk[L.book].sym].sTime + f.s);
    const double sold = f.partial ? (whole ? floor(L.shares * f.f + 1e-9) : L.shares * f.f) : L.shares;
    const double repaid = f.partial ? (whole ? sold * L.entryPrice : L.principal * f.f) : L.principal;
    const double interest = repaid * rate * ((sTimeF - L.entryTs) / SPY);
    const double proceeds = sold * f.price;
    const double net = proceeds - repaid - interest;
    if (L.nFills >= GB_MAX_FILLS) { if (status == C_OK) { status = C_FILL_CAPACITY; errInfo = L.id; } return; }
    GbLotFill& x = L.fills[L.nFills++];
    x.s = f.s; x.k = f.k; x.t = f.t; x.raw = f.raw; x.price = f.price; x.partial = f.partial; x.shares = sold; x.principal = repaid;
    x.interest = interest; x.proceeds = proceeds; x.net = net; x.reason = f.reason;
    L.realized += net;
    L.interest += interest;
    L.costs += sold * (f.raw - f.price);
    realized += net;
    if (f.partial) { L.shares = L.shares - sold; L.principal = L.principal - repaid; }
    else {
      L.shares = 0; L.principal = 0; L.open = 0; L.net = L.realized; openLot = -1;
      if (risk) {  // the lot's exit point (metrics.ts: series point (net, net); path point M = R = before + net)
        if (L.net < lotWorstM) lotWorstM = L.net;
        if (L.net < lotWorstL) lotWorstL = L.net;
        const double pm = lotWorstM < 0 ? -lotWorstM : 0, pl = lotWorstL < 0 ? -lotWorstL : 0;
        if (pm > plM) plM = pm;
        if (pl > plL) plL = pl;
        rkBefore += L.net;
        riskPoint(rkBefore, rkBefore, rkBefore);
      }
    }
  };
  auto exitsAt = [&](int s, int sym, int k) {
    while (openLot >= 0 && bk[lots[openLot].book].sym == sym) {
      GbLot& L = lots[openLot];
      const GbTrade& tr = tradeOf(L.book, L.tradeIdx);
      if (nextExit >= tr.nFills) return;
      const GbFill& f = tr.fills[nextExit];
      if (f.s != s || f.k != k) return;
      nextExit++;
      exitFill(L, f);
    }
  };
  // a mark of the open lot in engine.ts remark()'s own arithmetic: pnl = realized + mv − principal − interest
  auto riskMark = [&](const GbLot& L, double price, double sTime) {
    const double interest = L.principal * rate * ((sTime - L.entryTs) / SPY);
    const double mv = L.shares * price;
    const double pnl = L.realized + mv - L.principal - interest;
    const double liq = pnl - (mv * costBps) / 10000;
    if (pnl < lotWorstM) lotWorstM = pnl;
    if (liq < lotWorstL) lotWorstL = liq;
    riskPoint(rkBefore + pnl, rkBefore + liq, rkBefore + L.realized);
  };

  Tracker minute, sessionT;
  trackerInit(minute, 0, LD(ref.bTime + LD(ref.sBarStart + 0)));
  trackerInit(sessionT, 0, LD(ref.sTime + 0));
  Tracker ptrack[GB_MAX_PERIODS];
  bool pOn[GB_MAX_PERIODS];
  for (int i = 0; i < nPeriods; i++) { pOn[i] = false; periods[i].boundary = boundaries[i]; periods[i].equity = NAN; periods[i].pad = 0; }
  double peakPrincipal = 0, peakValue = 0;
  int sessionsHeld = 0;
  const int exitOrder[2] = {1, 0};  // VGT, then GDX
  int ix[2] = {0, 0};

  auto markOf = [&](const GbLot& L, double price, double sTime) {
    return L.shares * price - L.principal - L.principal * rate * ((sTime - L.entryTs) / SPY);
  };
  auto lotMark = [&](GbLot& L, double price, double sTime, double t) {
    const double m = L.realized + markOf(L, price, sTime);
    if (m < L.worst) { L.worst = m; L.worstT = t; }
    if (m > L.best) { L.best = m; L.bestT = t; }
  };
  auto record = [&](double value, double t) {
    updateStrict(minute, value, t);
    for (int i = 0; i < nPeriods; i++) if (pOn[i]) updateStrict(ptrack[i], value, t);
    marks++;
  };
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
      const GbLot& L = lots[openLot];
      const GbTrade& tr = tradeOf(L.book, L.tradeIdx);
      quiet = !(nextExit < tr.nFills && tr.fills[nextExit].s == s);
    }

    if (quiet) {
      GbLot& L = lots[openLot];
      const DevSym& ds = data.sym[bk[L.book].sym];
      const int start = LD(ds.sBarStart + s), count = LD(ds.sBarCount + s);
      const double interest = L.principal * rate * ((sTime - L.entryTs) / SPY);
      if (L.principal > peakPrincipal) peakPrincipal = L.principal;
      for (int k = 0; k < count; k++) {
        const double price = LD(ds.bClose + start + k);
        const double mv = L.shares * price;
        if (mv > peakValue) peakValue = mv;
        if (detail) lotMark(L, price, sTime, LD(ds.bTime + start + k));
        if (risk) riskMark(L, price, sTime);
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
            const GbTrade& r = tradeOf(resBook, resIdx);
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
            GbLot& L = lots[lotAfter];
            const int sym = bk[L.book].sym;
            const DevSym& ds = data.sym[sym];
            const double price = LD(ds.bClose + LD(ds.sBarStart + s) + ix[sym]);
            const double mv = L.shares * price;
            if (mv > peakValue) peakValue = mv;
            if (L.principal > peakPrincipal) peakPrincipal = L.principal;
            if (detail) lotMark(L, price, sTime, T);
            if (risk) riskMark(L, price, sTime);
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
          const GbTrade& r = tradeOf(resBook, resIdx);
          if (r.eS == s && r.eK == count) { openLotNow(); exitsAt(s, sym, count); }
        }
      }
    }

    double closeValue = realized;
    if (openLot >= 0) {
      GbLot& L = lots[openLot];
      const DevSym& ds = data.sym[bk[L.book].sym];
      const double price = LD(ds.sClose + s);
      const double mv = L.shares * price;
      if (mv > peakValue) peakValue = mv;
      if (L.principal > peakPrincipal) peakPrincipal = L.principal;
      if (detail) lotMark(L, price, sTime, closeTime);
      if (risk) riskMark(L, price, sTime);
      closeValue += markOf(L, price, sTime);
      if (writeSeries) { valueAtClose[s] = mv; principalAtClose[s] = L.principal; heldAtClose[s] = (int8_t)L.book; }
      held = true;
    }
    record(closeValue, closeTime);
    updateStrict(sessionT, closeValue, sTime);
    if (writeDaily) daily[s] = closeValue;
    if (held) sessionsHeld++;
    // a period starts after its boundary's close: its tracker's peak is the marked net at that close
    for (int i = 0; i < nPeriods; i++)
      if (boundaries[i] == s) { periods[i].equity = closeValue; pOn[i] = true; trackerInit(ptrack[i], closeValue, closeTime); }
  }

  double unrealized = 0;
  if (status == C_OK && openLot >= 0) {
    GbLot& L = lots[openLot];
    const DevSym& ds = data.sym[bk[L.book].sym];
    const double accrued = L.principal * rate * ((LD(ds.sTime + endIndex) - L.entryTs) / SPY);
    const double mark = L.shares * LD(ds.sClose + endIndex) - L.principal - accrued;
    L.unrealized = mark;
    L.interest += accrued;
    L.net = L.realized + mark;
    unrealized = mark;
    const GbTrade& tr = tradeOf(L.book, L.tradeIdx);
    if (nextExit < tr.nFills && tr.fills[nextExit].s <= endIndex) { status = C_POOL_EXIT_SKIPPED; errInfo = L.id; }
    if (risk) {  // the open lot's own principal loss over its marks (metrics.ts tradeRisk: no exit point)
      const double pm = lotWorstM < 0 ? -lotWorstM : 0, pl = lotWorstL < 0 ? -lotWorstL : 0;
      if (pm > plM) plM = pm;
      if (pl > plL) plL = pl;
    }
  }

  out.net = realized + unrealized;
  out.realized = realized;
  out.unrealized = unrealized;
  out.dd.max = minute.maximum; out.dd.peakT = minute.ddPeakTime; out.dd.troughT = minute.troughTime; out.dd.recoveryT = minute.recoveryTime;
  out.ddDaily.max = sessionT.maximum; out.ddDaily.peakT = sessionT.ddPeakTime; out.ddDaily.troughT = sessionT.troughTime; out.ddDaily.recoveryT = sessionT.recoveryTime;
  for (int i = 0; i < nPeriods; i++) {
    if (pOn[i]) { periods[i].dd.max = ptrack[i].maximum; periods[i].dd.peakT = ptrack[i].ddPeakTime; periods[i].dd.troughT = ptrack[i].troughTime; periods[i].dd.recoveryT = ptrack[i].recoveryTime; }
    else { periods[i].dd.max = 0; periods[i].dd.peakT = NAN; periods[i].dd.troughT = NAN; periods[i].dd.recoveryT = NAN; }
  }
  out.peakPrincipal = peakPrincipal;
  out.peakValue = peakValue;
  out.sessionsHeld = sessionsHeld;
  out.marks = marks;
  out.nLots = nLots;
  out.nFunding = nFunding;
  out.bdMarked = bdM; out.bdLiq = bdL; out.plMarked = plM; out.plLiq = plL;
  if (status != C_OK) { out.status = status; out.errInfo = errInfo; }
  out.executed = 1;
  atomicAdd(executed, 1u);
}
