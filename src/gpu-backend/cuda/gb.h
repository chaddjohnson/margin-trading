// gpu-backend: the versioned binary interface (v2) between the Node client (src/gpu-backend/client.ts) and the CUDA
// evaluator server (gb_server.cu). Little-endian, natural alignment, every struct size asserted on both sides
// (src/gpu-backend/layout.ts mirrors these definitions).
//
// Frames on the server's stdin/stdout:  u32 magic | u32 type-or-status | u64 payload bytes | payload
//   request magic 0x51324247 ("GB2Q"), response magic 0x52324247 ("GB2R").
//   types: 1 LOAD (UTF-8 path of a GB2 dataset file), 2 EVAL (a batch), 3 INFO, 4 QUIT, 5 FAULT (test only),
//          6 SMOKE (a deterministic device computation whose result proves live kernel execution).
//   response status: 0 OK, otherwise a batch-level error code (payload: UTF-8 message). A batch-level error never carries
//   results; per-candidate errors are a status in each CandOut (that candidate's outputs are void).
#pragma once
#include <stdint.h>

#define GB_PROTOCOL_VERSION 2u
#define GB_REQ_MAGIC 0x51324247u
#define GB_RES_MAGIC 0x52324247u
#define GB_DATASET_VERSION 2u

enum GbType : uint32_t { GB_LOAD = 1, GB_EVAL = 2, GB_INFO = 3, GB_QUIT = 4, GB_FAULT = 5, GB_SMOKE = 6 };

enum GbStatus : uint32_t {
  GB_OK = 0,
  GB_E_BAD_FRAME = 100,
  GB_E_BAD_VERSION = 101,
  GB_E_BAD_SIZE = 102,
  GB_E_UNSUPPORTED = 103,  // an unknown or unsupported capability bit: the whole batch is refused
  GB_E_NO_DATASET = 104,
  GB_E_MEMORY = 105,       // the batch does not fit the VRAM budget or a device allocation failed
  GB_E_CUDA = 106,         // a CUDA error (launch, fault); the server exits after reporting a sticky error
  GB_E_DATASET = 107,      // a dataset file failed its checks
  GB_E_FAULT_REFUSED = 108,
  GB_E_RECEIPT = 109       // the device-side execution counters disagree with the batch (never expected)
};

// per-candidate status codes: each mirrors a CPU throw (no output of such a candidate may be used) or a capacity limit
enum GbCandStatus : int32_t {
  C_OK = 0,
  C_TRADE_CAPACITY = 1,  // re-evaluated on the GPU with larger capacities by the client
  C_LOT_CAPACITY = 2,
  C_FILL_CAPACITY = 3,
  C_INVALID = 4,  // a parameter outside the evaluator's validated domain
  C_FUNDING_CAPACITY = 5,
  C_D1_ORDER = 10,
  C_GATE_DECISION_BLOCKED = 11,
  C_GATE_STATE = 12,
  C_PROFITABLE_PROTECTIVE = 13,
  C_CARRIED_SALE_MINUTE = 14,
  C_ENTRY_DAY_LEVEL = 15,
  C_UNEXPECTED_EXIT = 16,
  C_ENTRY_DAY_INTEREST = 17,
  C_PROFITABLE_WHILE_BLOCKED = 18,
  C_POOL_DECIDE_HOLDING = 20,
  C_POOL_EXIT_SKIPPED = 21,
  C_BOOK_ORDER = 22,  // a book's decisions are not strictly ordered
  // Growth (riseTrading.ts and its modules)
  C_G_DECISION_AFTER_CLOSE = 30,
  C_G_CONT_BAR_AFTER_CLOSE = 31,
  C_G_ELIG_BAR_AFTER_CLOSE = 32,
  C_G_THREE_FILLS = 33,
  C_G_ORDER_WITHOUT_STOP = 34,
  C_G_DD_UNPROCESSED = 35,
  C_G_CONT_NOT_FLAT = 36,
  C_G_EXIT_WHILE_EPISODE = 37,
  C_G_WINDOW_DISAGREES = 38,
  C_G_RELEASE_SESSION = 39,
  C_G_UNEXPECTED_ARMING = 40,
  C_G_FILL_BEFORE_ATR = 41,
  C_G_PARTIAL_STATE = 42,
  C_G_EXPIRY_STATE = 43,
  C_G_NO_BAR = 44,
  C_G_LOOP = 45  // a device loop exceeded its bound (never expected: fail closed instead of hanging)
};

// capability bits (a candidate's features; the server's supported set is GB_SUPPORTED). Bits outside the supported
// set — including the explicitly unsupported ones below — make the server refuse the whole batch.
enum GbFeature : uint64_t {
  F_D1_BOOK = 1ull << 0,
  F_RC_CONTROLS = 1ull << 1,
  F_NEXT_OPEN = 1ull << 2,  // stop fill 'next-open' (D1; Growth where supported)
  F_SLIPPAGE = 1ull << 3,
  F_ARM_START = 1ull << 4,
  F_G_RISE = 1ull << 5,
  F_G_BREAKOUT = 1ull << 6,
  F_G_TREND_PRICE_CHANGE = 1ull << 7,
  F_G_TREND_REGRESSION = 1ull << 8,
  F_G_TREND_RISING_SMA = 1ull << 9,
  F_G_TREND_HHL = 1ull << 10,
  F_G_TREND_MOMENTUM = 1ull << 11,
  F_G_ELIG_TIME_LIMITED = 1ull << 12,
  F_G_ELIG_MIN_STRENGTH = 1ull << 13,
  F_G_ELIG_MAX_EXTENSION = 1ull << 14,
  F_G_ELIG_DETERIORATION = 1ull << 15,
  F_G_ELIG_RESET_RENEW = 1ull << 16,
  F_G_DRAWDOWN_GATE = 1ull << 17,
  F_G_MAX_HOLD = 1ull << 18,
  F_G_BUFFER = 1ull << 19,
  F_G_INITIAL_STOP = 1ull << 20,
  F_G_RETENTION = 1ull << 21,
  F_G_CONT_CLASSIC = 1ull << 22,
  F_G_CONT_BREAKOUT = 1ull << 23,
  F_G_CONT_SHALLOW = 1ull << 24,
  F_G_CONT_MA_CROSS = 1ull << 25,
  F_POOL = 1ull << 26,
  F_POOL_FUND_FROM = 1ull << 27,
  F_POOL_ENABLED = 1ull << 28,
  F_POOL_WHOLE_SHARES = 1ull << 29,
  F_POOL_BLACKOUTS = 1ull << 30,
  F_POOL_PERIODS = 1ull << 31,
  F_POOL_TIE_ORDER = 1ull << 32,
  F_POOL_GROWTH_FIRST = 1ull << 33,
  F_POOL_DETAIL = 1ull << 34,
  F_RISK_METRICS = 1ull << 35,
  GB_SUPPORTED = (1ull << 36) - 1,
  // never supported by this evaluator (explicit refusal; outside the official optimization domain)
  F_RECORD_MARKS = 1ull << 48,
  F_D1_SWING = 1ull << 49,
  F_D1_BREAKEVEN = 1ull << 50,
  F_G_INTRADAY_RESOLUTION = 1ull << 51,
  F_LIFECYCLE_L1_L2 = 1ull << 52,
  F_SHADOW_ELIGIBILITY = 1ull << 53,
  F_SESSION_HOLD_UNIT = 1ull << 54
};

// batch flags
enum GbFlags : uint32_t { B_RETURN_TRADES = 1u << 0, B_RETURN_LOTS = 1u << 1, B_RUN_POOL = 1u << 2, B_RETURN_SERIES = 1u << 3, B_RETURN_DAILY = 1u << 4 };

// exit reasons (fixed codes; the client maps them to the CPU strings)
enum GbReason : int32_t {
  RS_MAXHOLD = 0,     // 'maximum hold'
  RS_TSTOP = 1,       // 'trailing stop'
  RS_TSTOP_GAP = 2,   // 'trailing stop gap'
  RS_BUFFER = 3,      // 'buffered intraday loss'
  RS_PROT = 4,        // RC 'protective stop'
  RS_PROT_GAP = 5,    // RC 'protective stop gap'
  RS_ISTOP = 6,       // Growth 'initial stop'
  RS_ISTOP_GAP = 7,   // Growth 'initial stop gap'
  RS_TREND = 8        // Growth 'trend exit'
};

// trade kinds
enum GbKind : int32_t { K_DEEP = 0, K_CONTINUATION = 1, K_RISE = 2, K_TREND_BREAKOUT = 3, K_CONT_BREAKOUT = 4, K_CONT_SHALLOW = 5, K_CONT_MA_CROSS = 6 };

// funding refusal reasons (detail mode)
enum GbRefusal : int32_t { R_GRANTED = 0, R_SLOT = 1, R_DISABLED = 2, R_BEFORE_FUNDING = 3, R_BLACKOUT = 4 };

#define GB_MAX_FILLS 2
#define GB_BOOKS 4  // D1:GDX, D1:VGT, G:GDX, G:VGT (the pool's book ids; tieOrderOf('D1') order)

#pragma pack(push, 8)
struct GbDatasetHeader {  // 64 bytes
  char magic[8];          // "GB2DSET1"
  uint32_t version, nSym, sessions, flags;
  uint32_t bars[2];       // GDX, VGT minute bars
  uint32_t full[2];       // GDX, VGT full drawdown-gate observations (minute closes + closing prints)
  uint64_t checksum;      // FNV-1a over the payload's 32-bit words
  uint64_t payloadBytes;
  uint64_t reserved;
};

struct GbBatchHeader {  // 64 bytes
  char magic[8];        // "GB2BATCH"
  uint32_t version, nCand, flags, tradeCapD1, tradeCapG, lotCap, fundCap, nRanges;
  uint64_t batchNonce;  // echoed in the receipt
  uint32_t endIndex, reserved;
  uint64_t reserved2;
};

struct GbD1In {  // 128 bytes: one D1 book (the CPU's exact doubles for every fraction)
  double X, Y, tsp, hold, buffer, pullback;
  double costBps, rate, slipBps;
  int32_t L, W, enabled, stopTenths, entryDay, holdMode, extHold, progTenths, gateOn, gateK, gateR, gateC, armStart, stopFill;
};

struct GbGrowthIn {  // 328 bytes: one Growth 1.4.0 book (host-computed doubles by the CPU's own expressions)
  double riseFactor;              // 1 + X / 100 (the scanner's and the eligibility predicate's factor)
  double tsp, hold, buffer;       // exitParamsOf: trailing stop fraction; hold days (Infinity = OFF); buffer (Infinity = OFF)
  double costBps, rate, slipBps;  // book settings
  double trM, trM2;               // trend fractions: price_change m / hhl m / momentum mS, momentum mL
  double trSlopePct;              // regression_slope: minimumSlopePercent (raw percent, as the CPU compares)
  double elA, elE, elD, elRD, elRR;  // eligibility fractions: min strength, max extension, deterioration, reset, rebound
  double ddD, ddR;                // drawdown gate: dip and retracement fractions
  double atrMultiple;             // initial stop m (raw)
  double retF;                    // retention sell fraction
  double coY, coP, coB, coRise, coPmin, coPmax, coRec, coSlope, coMargin;  // continuation fractions
  int32_t enabled, entry, riseN, boL, boK, boN, stopFill, trend, trN, trK, elig, elW, ddOn, ddN, ddY, istopOn, atrL,
      retOn, retL, retK, cont, coW, coF, coL, coM, pad;
};

struct GbCandIn {  // 1,016 bytes
  uint32_t id, pad0;
  uint64_t features;
  int32_t first;       // 0 = D1 first, 1 = Growth first
  int32_t tie[4];      // the same-instant order (book ids 0–3); default tieOrderOf(first)
  int32_t present[4];  // the books run and offered to the pool (enabled)
  int32_t fundFrom, wholeShares, detail, risk;
  int32_t blackoutOff, blackoutN, periodOff, periodN;
  int32_t pad1;
  double budget, poolRate;
  GbD1In d1[2];      // D1:GDX, D1:VGT
  GbGrowthIn g[2];   // G:GDX, G:VGT
};

struct GbFill {  // 48 bytes
  double t, raw, price, f;
  int32_t s, k, partial, reason;
};

struct GbTrade {  // 184 bytes: a virtual trade
  double dT, dPrice, eT, eRaw, ePrice, vNet, vInterest;
  int32_t id, dS, eS, eK, kind, open, nFills, pad;
  GbFill fills[GB_MAX_FILLS];
};

struct GbBookOut {  // 96 bytes
  double net, realized, minuteDd, dailyDd;
  int32_t nTrades, signals, protectiveExits, protectiveGapExits, maximumHoldExits, adaptiveExtensions, episodes, blocks,
      blockedSessions, blockedMinutes, entryDayExits, firstDS, status, errInfo, pad[2];
};

struct GbDD {  // 32 bytes
  double max, peakT, troughT, recoveryT;
};

struct GbCandOut {  // 624 bytes
  uint32_t id;
  int32_t status, errInfo, nLots;
  GbBookOut book[4];
  double net, realized, unrealized, peakPrincipal, peakValue;
  GbDD dd, ddDaily;
  int32_t sessionsHeld, nFunding;
  int64_t marks;
  int32_t decisions[4][3];  // [D1:GDX, D1:VGT, G:GDX, G:VGT] × [total, granted, refused]
  int32_t refusals[5];      // by GbRefusal (slot, disabled, before funding, blackout)
  int32_t executed;         // set by the device when this candidate's pool thread completed (receipt)
  double bdMarked, bdLiq, plMarked, plLiq;  // risk-envelope inputs (risk mode)
};

struct GbLotFill {  // 80 bytes
  double t, raw, price, shares, principal, interest, proceeds, net;
  int32_t s, k, partial, reason;
};

struct GbLot {  // 320 bytes
  double principal0, shares0, shares, principal, entryT, entryRaw, entryPrice, entryTs, realized, interest, net,
      unrealized, costs, worst, worstT, best, bestT;
  int32_t book, tradeIdx, entryS, open, nFills, id;
  GbLotFill fills[GB_MAX_FILLS];
};

struct GbFunding {  // 56 bytes (detail mode: one record per decision)
  double t, price, occupantPrincipal;  // the open lot's outstanding principal at the decision (NaN: none)
  int32_t book, trade, s, kind, granted, reason, occupantBook, occupantLot;  // occupantLot: lot id, 0 = an order, -1 = none
};

struct GbPeriod {  // 48 bytes
  double equity;
  GbDD dd;
  int32_t boundary, pad;
};

struct GbRange {  // 8 bytes: a blackout [first, last] or a period boundary (first)
  int32_t first, last;
};

struct GbReceipt {  // 128 bytes: the device's own evidence that this batch executed on it
  uint64_t batchNonce;
  uint8_t uuid[16];
  uint32_t nCand, booksLaunched, d1Executed, gExecuted, poolExecuted, kernels;
  uint64_t outChecksum;  // FNV-1a over the CandOut array, computed by the server before the copy back
  double h2dMs, d1Ms, gMs, poolMs, d2hMs, totalMs, deviceBytes;
  uint8_t pad[16];
};

struct GbResultHeader {  // 64 bytes
  char magic[8];         // "GB2OUT01"
  uint32_t version, nCand, flags, tradeCapD1, tradeCapG, lotCap, fundCap, sessions;
  uint64_t nTrades, nLots, nFunding;
};
#pragma pack(pop)

static_assert(sizeof(GbDatasetHeader) == 64, "dataset header");
static_assert(sizeof(GbBatchHeader) == 64, "batch header");
static_assert(sizeof(GbD1In) == 128, "d1 in");
static_assert(sizeof(GbGrowthIn) == 328, "growth in");
static_assert(sizeof(GbCandIn) == 1016, "cand in");
static_assert(sizeof(GbFill) == 48, "fill");
static_assert(sizeof(GbTrade) == 184, "trade");
static_assert(sizeof(GbBookOut) == 96, "book out");
static_assert(sizeof(GbCandOut) == 624, "cand out");
static_assert(sizeof(GbLotFill) == 80, "lot fill");
static_assert(sizeof(GbLot) == 320, "lot");
static_assert(sizeof(GbFunding) == 56, "funding");
static_assert(sizeof(GbPeriod) == 48, "period");
static_assert(sizeof(GbRange) == 8, "range");
static_assert(sizeof(GbReceipt) == 128, "receipt");
static_assert(sizeof(GbResultHeader) == 64, "result header");
