// gpu-phase1-feasibility: the versioned binary interface (v1) between the Node client (src/gpu-phase1/gpu.ts) and the
// CUDA evaluator server (gp1.cu). Little-endian, natural alignment; every struct size is asserted on both sides.
//
// Frames on the server's stdin/stdout:  u32 magic | u32 type-or-status | u64 payload bytes | payload
//   request magic 0x51315047 ("GP1Q"), response magic 0x52315047 ("GP1R").
//   types: 1 LOAD (payload: UTF-8 path of a GP1 dataset file), 2 EVAL (payload: a batch), 3 INFO, 4 QUIT,
//          5 FAULT (test only: a device trap; refused unless the server runs with --allow-fault-injection).
//   response status: 0 OK, otherwise a batch-level error code (payload: UTF-8 message). A batch-level error never
//   carries results; per-candidate errors are a status in each CandOut (and that candidate's outputs are void).
#pragma once
#include <stdint.h>

#define GP1_PROTOCOL_VERSION 1u
#define GP1_REQ_MAGIC 0x51315047u
#define GP1_RES_MAGIC 0x52315047u

enum Gp1Type : uint32_t { GP1_LOAD = 1, GP1_EVAL = 2, GP1_INFO = 3, GP1_QUIT = 4, GP1_FAULT = 5 };

// batch-level status codes
enum Gp1Status : uint32_t {
  GP1_OK = 0,
  GP1_E_BAD_FRAME = 100,
  GP1_E_BAD_VERSION = 101,
  GP1_E_BAD_SIZE = 102,
  GP1_E_UNSUPPORTED = 103,  // an unknown or unsupported feature bit: the whole batch is refused
  GP1_E_NO_DATASET = 104,
  GP1_E_MEMORY = 105,       // the batch does not fit the VRAM budget or a device allocation failed
  GP1_E_CUDA = 106,         // a CUDA error (launch, fault); the server exits after reporting a sticky error
  GP1_E_DATASET = 107,      // a dataset file failed its checks
  GP1_E_FAULT_REFUSED = 108
};

// per-candidate status codes (mirror the CPU engine's throws; no output of such a candidate may be used)
enum Gp1CandStatus : int32_t {
  C_OK = 0,
  C_TRADE_CAPACITY = 1,
  C_LOT_CAPACITY = 2,
  C_FILL_CAPACITY = 3,
  C_INVALID = 4,                  // a parameter outside the evaluator's validated domain
  C_D1_ORDER = 10,                // decisions are not strictly ordered
  C_GATE_DECISION_BLOCKED = 11,   // a decision while the decline gate is blocked
  C_GATE_STATE = 12,              // a setup or continuation window while blocked
  C_PROFITABLE_PROTECTIVE = 13,
  C_CARRIED_SALE_MINUTE = 14,
  C_ENTRY_DAY_LEVEL = 15,
  C_UNEXPECTED_EXIT = 16,
  C_ENTRY_DAY_INTEREST = 17,
  C_PROFITABLE_WHILE_BLOCKED = 18,
  C_POOL_DECIDE_HOLDING = 20,
  C_POOL_EXIT_SKIPPED = 21,
  C_EXT_ORDER = 22
};

// feature bits of a candidate (capability negotiation). Supported in v1: the low byte. Anything else is refused.
enum Gp1Feature : uint32_t {
  F_RC_CONTROLS = 1u << 0,     // RC 1 / RC 2 controls on a D1 book
  F_EXT_GROWTH = 1u << 1,      // externally computed Growth books supplied to the pool
  F_NEXT_OPEN = 1u << 2,       // stop fill 'next-open' or stop slippage
  F_ARM_START = 1u << 3,       // a non-zero arming start (native arming)
  F_SUPPORTED_V1 = 0xFFu,
  // explicitly NOT supported in v1 (the client sets these when asked; the server refuses the batch):
  F_GROWTH_ON_GPU = 1u << 8,
  F_POOL_BLACKOUTS = 1u << 9,
  F_POOL_PERIODS = 1u << 10,
  F_POOL_WHOLE_SHARES = 1u << 11,
  F_POOL_TIE_ORDER = 1u << 12,
  F_POOL_FUND_FROM = 1u << 13,
  F_POOL_DETAIL_LOG = 1u << 14,
  F_RECORD_MARKS = 1u << 15,
  F_D1_BREAKEVEN = 1u << 16,
  F_D1_SWING = 1u << 17
};

// batch flags
enum Gp1Flags : uint32_t { B_RETURN_TRADES = 1u << 0, B_RETURN_LOTS = 1u << 1, B_RUN_POOL = 1u << 2 };

// exit reasons (D1 codes are fixed; Growth reasons are interned per batch by the client from 64 upward)
enum Gp1Reason : int32_t { RS_MAXHOLD = 0, RS_TSTOP = 1, RS_TSTOP_GAP = 2, RS_BUFFER = 3, RS_PROT = 4, RS_PROT_GAP = 5 };

#define GP1_MAX_FILLS 4

#pragma pack(push, 8)
struct Gp1DatasetHeader {  // 48 bytes
  char magic[8];           // "GP1DSET1"
  uint32_t version, nSym, sessions, flags;
  uint32_t bars[2];        // GDX, VGT
  uint64_t checksum;       // FNV-1a over the payload's 32-bit words (zero-extended)
  uint64_t payloadBytes;
};

struct Gp1BatchHeader {  // 64 bytes
  char magic[8];         // "GP1BATCH"
  uint32_t version, nCand, flags, tradeCap, lotCap, nExt, endIndex, reserved;
  double budget, poolRate;
  uint64_t reserved2;
};

struct Gp1D1In {  // 128 bytes: one D1 book (the CPU's exact doubles for every fraction)
  double X, Y, tsp, hold, buffer, pullback;  // StrategyParams: targetPercentChange, trailingBuyPercentage,
                                             // trailingStopPercentage, maximumHoldDays, intradayLossBuffer, pullback
  double costBps, rate, slipBps;             // friction (book settings)
  int32_t L, W, enabled, stopTenths, entryDay, holdMode, extHold, progTenths, gateOn, gateK, gateR, gateC, armStart, stopFill;
};

struct Gp1CandIn {  // 304 bytes
  uint32_t id, features;
  int32_t first;  // 0 = D1 first, 1 = Growth first
  int32_t pad0;
  int32_t extPresent[2], extOffset[2], extCount[2];  // [G:GDX, G:VGT]
  int32_t pad1[2];
  Gp1D1In d1[2];  // [D1:GDX, D1:VGT]
};

struct Gp1Fill {  // 48 bytes
  double t, raw, price, f;
  int32_t s, k, partial, reason;
};

struct Gp1Trade {  // 280 bytes: a virtual trade (D1 output, Growth input)
  double dT, dPrice, eT, eRaw, ePrice, vNet, vInterest;
  int32_t id, dS, eS, eK, kind, open, nFills, pad;
  Gp1Fill fills[GP1_MAX_FILLS];
};

struct Gp1BookOut {  // 80 bytes
  double net, realized, minuteDd, dailyDd;  // the standalone figures
  int32_t nTrades, signals, protectiveExits, protectiveGapExits, maximumHoldExits, adaptiveExtensions, episodes, blocks,
      blockedSessions, blockedMinutes, entryDayExits, firstDS;
};

struct Gp1DD {  // 32 bytes
  double max, peakT, troughT, recoveryT;
};

struct Gp1CandOut {  // 344 bytes
  uint32_t id;
  int32_t status, errInfo, nLots;
  Gp1BookOut book[2];
  double net, realized, unrealized, peakPrincipal, peakValue;
  Gp1DD dd, ddDaily;
  int32_t sessionsHeld, refusedSlot;
  int64_t marks;
  int32_t decisions[4][3];  // [D1:GDX, D1:VGT, G:GDX, G:VGT] × [total, granted, refused]
};

struct Gp1LotFill {  // 80 bytes
  double t, raw, price, shares, principal, interest, proceeds, net;
  int32_t s, k, partial, reason;
};

struct Gp1Lot {  // 448 bytes
  double principal0, shares0, shares, principal, entryT, entryRaw, entryPrice, entryTs, realized, interest, net,
      unrealized, costs;
  int32_t book, tradeIdx, entryS, open, nFills, id;
  Gp1LotFill fills[GP1_MAX_FILLS];
};

struct Gp1ResultHeader {  // 96 bytes
  char magic[8];          // "GP1OUT01"
  uint32_t version, nCand, flags, tradeCap, lotCap, sessions;
  double h2dMs, refMs, d1KernelMs, poolKernelMs, d2hMs, totalMs, deviceBytes;
  uint64_t reserved;
};
#pragma pack(pop)

static_assert(sizeof(Gp1DatasetHeader) == 48, "dataset header");
static_assert(sizeof(Gp1BatchHeader) == 64, "batch header");
static_assert(sizeof(Gp1D1In) == 128, "d1 in");
static_assert(sizeof(Gp1CandIn) == 304, "cand in");
static_assert(sizeof(Gp1Fill) == 48, "fill");
static_assert(sizeof(Gp1Trade) == 280, "trade");
static_assert(sizeof(Gp1BookOut) == 80, "book out");
static_assert(sizeof(Gp1CandOut) == 344, "cand out");
static_assert(sizeof(Gp1LotFill) == 80, "lot fill");
static_assert(sizeof(Gp1Lot) == 448, "lot");
static_assert(sizeof(Gp1ResultHeader) == 96, "result header");
