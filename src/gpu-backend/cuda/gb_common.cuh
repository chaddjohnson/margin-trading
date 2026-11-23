// gpu-backend: device data layout and the helpers every book shares. Precision rule (all of src/gpu-backend/cuda/):
// IEEE-754 binary64 everywhere, built with --fmad=false and IEEE division/square root; every expression keeps the CPU
// code's operation order (JavaScript evaluates left to right and never fuses a multiply-add), so results are
// bit-identical. JavaScript's Math.max/Math.min NaN and ±0 semantics are reproduced explicitly (jsmax/jsmin).
#pragma once
#include <cmath>
#include <stdint.h>
#include "gb.h"
#include "v8math.cuh"

#define SPM 60.0
#define SPD 86400.0
#define SPY 31536000.0           // 365 * 86400 (secondsPerYear)
#define REL_TOL 1e-12            // RELATIVE_TOLERANCE (src/entry-signals/riseFromRecentLow.ts)
#define GB_SPARSE_LEVELS 24      // sparse-table levels (2^23 > any per-symbol observation count accepted)

struct DevSym {
  // sessions (S)
  const double *sTime, *sCloseTime, *sOpen, *sHigh, *sLow, *sClose, *sClosingPrint;
  const int32_t *sBarStart, *sBarCount, *nyOffset, *fullStart;
  // the daily signal bars of the CPU door (bars[j], j = session index)
  const double *barEnd, *barOpen, *barHigh, *barLow, *barClose;
  // minutes (B)
  const double *bTime, *bOpen, *bHigh, *bLow, *bClose;
  // full drawdown-gate observations (F): each session's minute closes, then its close when a closing print exists
  const double* fullPrice;
  // derived on the device at load (exact: minima/maxima only)
  const double* refHigh;          // [(L - 1) * S + s], L = 1 … maxL (computeReferenceHighs, firstIndex 0)
  const double* rmqBarLow[GB_SPARSE_LEVELS];   // sparse table: min of barLow over [i, i + 2^k − 1]
  const double* rmqSessHigh[GB_SPARSE_LEVELS]; // max of sHigh
  const double* rmqFull[GB_SPARSE_LEVELS];     // max of fullPrice
  int S, B, F, maxL;
};

struct DevData {
  DevSym sym[2];  // GDX, VGT
  int S;
};

#define LD(p) __ldg(p)

// ----- JavaScript Math.max / Math.min semantics (NaN propagates; +0 > −0) -----
__host__ __device__ __forceinline__ double jsmax(double a, double b) {
  if (isnan(a) || isnan(b)) return NAN;
  if (a == 0.0 && b == 0.0) return signbit(a) ? b : a;
  return a > b ? a : b;
}
__host__ __device__ __forceinline__ double jsmin(double a, double b) {
  if (isnan(a) || isnan(b)) return NAN;
  if (a == 0.0 && b == 0.0) return signbit(a) ? a : b;
  return a < b ? a : b;
}
// valid price: Number.isFinite(x) && x > 0
__device__ __forceinline__ bool validPrice(double x) { return isfinite(x) && x > 0; }

// ----- range queries on the load-time sparse tables (inclusive [a, b], a <= b) -----
__device__ __forceinline__ int floorLog2(unsigned n) { return 31 - __clz(n); }
__device__ __forceinline__ double rmqMin(const double* const* t, int a, int b) {
  const int k = floorLog2((unsigned)(b - a + 1));
  const double x = LD(t[k] + a), y = LD(t[k] + b - (1 << k) + 1);
  return x < y ? x : y;
}
__device__ __forceinline__ double rmqMax(const double* const* t, int a, int b) {
  const int k = floorLog2((unsigned)(b - a + 1));
  const double x = LD(t[k] + a), y = LD(t[k] + b - (1 << k) + 1);
  return x > y ? x : y;
}

// ----- fills (src/shared-margin-portfolio/strategy.ts) -----
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

// ----- Tracker (src/multi-etf-allocator/engine.ts): updateStrict and the fields stats() reports -----
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

// ----- the exit decision of a position (ExitDecision: the fields every caller reads) -----
struct Decision {
  bool valid;
  int reason, barIndex;
  double price, time, signalTime, signalPrice;
  bool partial;  // Growth optional rules: a retention partial sale
};
__device__ __forceinline__ Decision noDecision() {
  Decision x; x.valid = false; x.reason = -1; x.barIndex = -1; x.price = NAN; x.time = NAN; x.signalTime = NAN; x.signalPrice = NAN; x.partial = false; return x;
}
__device__ __forceinline__ Decision mkDecision(int reason, int k, double price, double time) {
  Decision x; x.valid = true; x.reason = reason; x.barIndex = k; x.price = price; x.time = time; x.signalTime = NAN; x.signalPrice = NAN; x.partial = false; return x;
}

// the per-candidate status: the first failure wins (each mirrors one CPU throw)
__device__ __forceinline__ void failInto(int& status, int& info, int code, int detail) {
  if (status == C_OK) { status = code; info = detail; }
}

// ----- staged-stop@1 (GPU Phase 8; src/staged-stop/tracker.ts StagedTracker, expression for expression) -----
// One position's staged state of one book with the stage ON. stagedOnEntry runs immediately after the book's onEntry
// (the fill); stagedStep immediately after the book's after-session ratchet (a later session close). The manager's own
// post-entry high H and level L are read and L is raised:
//   actPrice = raw * (1 + (double)actTenths / 1000)      armed = armed || H >= actPrice
//   if armed: L = jsmax(L, H * (1 - (double)st2Tenths / 1000))
// The counters are exact: arms (positions armed), stagedExits (trailing-stop events executed while armed; Growth
// retention's partial sale included), placementExits (a staged exit in the session right after the arming session whose
// close was at or below the level placed at arming).
struct Staged {
  bool on, armed, placed;
  int actTenths, st2Tenths, armedS;
  double actPrice;
  int arms, stagedExits, placementExits;
};
__device__ __forceinline__ void stagedInit(Staged& z, int on, int actTenths, int st2Tenths) {
  z.on = on != 0; z.armed = false; z.placed = false; z.actTenths = actTenths; z.st2Tenths = st2Tenths; z.armedS = -1;
  z.actPrice = NAN; z.arms = 0; z.stagedExits = 0; z.placementExits = 0;
}
__device__ __forceinline__ void stagedStep(Staged& z, double H, double& stopPrice, int s, double close) {
  if (!z.on) return;
  bool armedNow = false;
  if (!z.armed && H >= z.actPrice) { z.armed = true; z.armedS = s; z.arms++; armedNow = true; }
  if (!z.armed) return;
  stopPrice = jsmax(stopPrice, H * (1 - (double)z.st2Tenths / 1000));
  if (armedNow) z.placed = close <= stopPrice;
}
__device__ __forceinline__ void stagedOnEntry(Staged& z, double H, double& stopPrice, double raw, int s, double close) {
  if (!z.on) return;
  z.actPrice = raw * (1 + (double)z.actTenths / 1000);
  z.armed = false; z.armedS = -1; z.placed = false;
  stagedStep(z, H, stopPrice, s, close);
}
// an executed exit event at session s with reason code `reason` (RS_TSTOP / RS_TSTOP_GAP are trailing-stop events)
__device__ __forceinline__ void stagedOnExit(Staged& z, int reason, int s) {
  if (!z.on) return;
  if ((reason == RS_TSTOP || reason == RS_TSTOP_GAP) && z.armed) {
    z.stagedExits++;
    if (s == z.armedS + 1 && z.placed) z.placementExits++;
  }
}
// the device's own domain check of a staged book (the host validates first; a violation is a CPU throw: C_INVALID)
__device__ __forceinline__ bool stagedDomainOk(int on, int actTenths, int st2Tenths) {
  if (on == 0) return actTenths == 0 && st2Tenths == 0;
  return on == 1 && actTenths >= 50 && actTenths <= 500 && st2Tenths >= 15 && st2Tenths <= 145;
}
