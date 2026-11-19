// gpu-backend: prints sizeof and every field's offsetof of protocol v2 (src/gpu-backend/cuda/gb.h) as JSON, so
// src/gpu-backend/tests/layout.test.ts can prove the TypeScript layout (src/gpu-backend/layout.ts) identical.
//   g++ -std=c++17 -o layout-dump tools/gpu-backend/layout-dump.cpp && ./layout-dump
#include <cstddef>
#include <cstdio>
#include "../../src/gpu-backend/cuda/gb.h"

#define S(T) printf("%s\"%s\":{\"size\":%zu", first ? "" : ",", #T, sizeof(T)); first = false;
#define F(T, x) printf(",\"%s\":%zu", #x, offsetof(T, x));
#define E printf("}");

int main() {
  bool first = true;
  printf("{");
  S(GbDatasetHeader) F(GbDatasetHeader, magic) F(GbDatasetHeader, version) F(GbDatasetHeader, nSym) F(GbDatasetHeader, sessions) F(GbDatasetHeader, flags) F(GbDatasetHeader, bars) F(GbDatasetHeader, full) F(GbDatasetHeader, checksum) F(GbDatasetHeader, payloadBytes) F(GbDatasetHeader, reserved) E
  S(GbBatchHeader) F(GbBatchHeader, magic) F(GbBatchHeader, version) F(GbBatchHeader, nCand) F(GbBatchHeader, flags) F(GbBatchHeader, tradeCapD1) F(GbBatchHeader, tradeCapG) F(GbBatchHeader, lotCap) F(GbBatchHeader, fundCap) F(GbBatchHeader, nRanges) F(GbBatchHeader, batchNonce) F(GbBatchHeader, endIndex) F(GbBatchHeader, reserved) F(GbBatchHeader, reserved2) E
  S(GbD1In) F(GbD1In, X) F(GbD1In, Y) F(GbD1In, tsp) F(GbD1In, hold) F(GbD1In, buffer) F(GbD1In, pullback) F(GbD1In, costBps) F(GbD1In, rate) F(GbD1In, slipBps) F(GbD1In, L) F(GbD1In, W) F(GbD1In, enabled) F(GbD1In, stopTenths) F(GbD1In, entryDay) F(GbD1In, holdMode) F(GbD1In, extHold) F(GbD1In, progTenths) F(GbD1In, gateOn) F(GbD1In, gateK) F(GbD1In, gateR) F(GbD1In, gateC) F(GbD1In, armStart) F(GbD1In, stopFill) E
  S(GbGrowthIn) F(GbGrowthIn, riseFactor) F(GbGrowthIn, tsp) F(GbGrowthIn, hold) F(GbGrowthIn, buffer) F(GbGrowthIn, costBps) F(GbGrowthIn, rate) F(GbGrowthIn, slipBps) F(GbGrowthIn, trM) F(GbGrowthIn, trM2) F(GbGrowthIn, trSlopePct) F(GbGrowthIn, elA) F(GbGrowthIn, elE) F(GbGrowthIn, elD) F(GbGrowthIn, elRD) F(GbGrowthIn, elRR) F(GbGrowthIn, ddD) F(GbGrowthIn, ddR) F(GbGrowthIn, atrMultiple) F(GbGrowthIn, retF) F(GbGrowthIn, coY) F(GbGrowthIn, coP) F(GbGrowthIn, coB) F(GbGrowthIn, coRise) F(GbGrowthIn, coPmin) F(GbGrowthIn, coPmax) F(GbGrowthIn, coRec) F(GbGrowthIn, coSlope) F(GbGrowthIn, coMargin) F(GbGrowthIn, enabled) F(GbGrowthIn, entry) F(GbGrowthIn, riseN) F(GbGrowthIn, boL) F(GbGrowthIn, boK) F(GbGrowthIn, boN) F(GbGrowthIn, stopFill) F(GbGrowthIn, trend) F(GbGrowthIn, trN) F(GbGrowthIn, trK) F(GbGrowthIn, elig) F(GbGrowthIn, elW) F(GbGrowthIn, ddOn) F(GbGrowthIn, ddN) F(GbGrowthIn, ddY) F(GbGrowthIn, istopOn) F(GbGrowthIn, atrL) F(GbGrowthIn, retOn) F(GbGrowthIn, retL) F(GbGrowthIn, retK) F(GbGrowthIn, cont) F(GbGrowthIn, coW) F(GbGrowthIn, coF) F(GbGrowthIn, coL) F(GbGrowthIn, coM) F(GbGrowthIn, pad) E
  S(GbCandIn) F(GbCandIn, id) F(GbCandIn, pad0) F(GbCandIn, features) F(GbCandIn, first) F(GbCandIn, tie) F(GbCandIn, present) F(GbCandIn, fundFrom) F(GbCandIn, wholeShares) F(GbCandIn, detail) F(GbCandIn, risk) F(GbCandIn, blackoutOff) F(GbCandIn, blackoutN) F(GbCandIn, periodOff) F(GbCandIn, periodN) F(GbCandIn, pad1) F(GbCandIn, budget) F(GbCandIn, poolRate) F(GbCandIn, d1) F(GbCandIn, g) E
  S(GbFill) F(GbFill, t) F(GbFill, raw) F(GbFill, price) F(GbFill, f) F(GbFill, s) F(GbFill, k) F(GbFill, partial) F(GbFill, reason) E
  S(GbTrade) F(GbTrade, dT) F(GbTrade, dPrice) F(GbTrade, eT) F(GbTrade, eRaw) F(GbTrade, ePrice) F(GbTrade, vNet) F(GbTrade, vInterest) F(GbTrade, id) F(GbTrade, dS) F(GbTrade, eS) F(GbTrade, eK) F(GbTrade, kind) F(GbTrade, open) F(GbTrade, nFills) F(GbTrade, pad) F(GbTrade, fills) E
  S(GbBookOut) F(GbBookOut, net) F(GbBookOut, realized) F(GbBookOut, minuteDd) F(GbBookOut, dailyDd) F(GbBookOut, nTrades) F(GbBookOut, signals) F(GbBookOut, protectiveExits) F(GbBookOut, protectiveGapExits) F(GbBookOut, maximumHoldExits) F(GbBookOut, adaptiveExtensions) F(GbBookOut, episodes) F(GbBookOut, blocks) F(GbBookOut, blockedSessions) F(GbBookOut, blockedMinutes) F(GbBookOut, entryDayExits) F(GbBookOut, firstDS) F(GbBookOut, status) F(GbBookOut, errInfo) F(GbBookOut, pad) E
  S(GbDD) F(GbDD, max) F(GbDD, peakT) F(GbDD, troughT) F(GbDD, recoveryT) E
  S(GbCandOut) F(GbCandOut, id) F(GbCandOut, status) F(GbCandOut, errInfo) F(GbCandOut, nLots) F(GbCandOut, book) F(GbCandOut, net) F(GbCandOut, realized) F(GbCandOut, unrealized) F(GbCandOut, peakPrincipal) F(GbCandOut, peakValue) F(GbCandOut, dd) F(GbCandOut, ddDaily) F(GbCandOut, sessionsHeld) F(GbCandOut, nFunding) F(GbCandOut, marks) F(GbCandOut, decisions) F(GbCandOut, refusals) F(GbCandOut, executed) F(GbCandOut, bdMarked) F(GbCandOut, bdLiq) F(GbCandOut, plMarked) F(GbCandOut, plLiq) E
  S(GbLotFill) F(GbLotFill, t) F(GbLotFill, raw) F(GbLotFill, price) F(GbLotFill, shares) F(GbLotFill, principal) F(GbLotFill, interest) F(GbLotFill, proceeds) F(GbLotFill, net) F(GbLotFill, s) F(GbLotFill, k) F(GbLotFill, partial) F(GbLotFill, reason) E
  S(GbLot) F(GbLot, principal0) F(GbLot, shares0) F(GbLot, shares) F(GbLot, principal) F(GbLot, entryT) F(GbLot, entryRaw) F(GbLot, entryPrice) F(GbLot, entryTs) F(GbLot, realized) F(GbLot, interest) F(GbLot, net) F(GbLot, unrealized) F(GbLot, costs) F(GbLot, worst) F(GbLot, worstT) F(GbLot, best) F(GbLot, bestT) F(GbLot, book) F(GbLot, tradeIdx) F(GbLot, entryS) F(GbLot, open) F(GbLot, nFills) F(GbLot, id) F(GbLot, fills) E
  S(GbFunding) F(GbFunding, t) F(GbFunding, price) F(GbFunding, occupantPrincipal) F(GbFunding, book) F(GbFunding, trade) F(GbFunding, s) F(GbFunding, kind) F(GbFunding, granted) F(GbFunding, reason) F(GbFunding, occupantBook) F(GbFunding, occupantLot) E
  S(GbPeriod) F(GbPeriod, equity) F(GbPeriod, dd) F(GbPeriod, boundary) F(GbPeriod, pad) E
  S(GbRange) F(GbRange, first) F(GbRange, last) E
  S(GbReceipt) F(GbReceipt, batchNonce) F(GbReceipt, uuid) F(GbReceipt, nCand) F(GbReceipt, booksLaunched) F(GbReceipt, d1Executed) F(GbReceipt, gExecuted) F(GbReceipt, poolExecuted) F(GbReceipt, kernels) F(GbReceipt, outChecksum) F(GbReceipt, h2dMs) F(GbReceipt, d1Ms) F(GbReceipt, gMs) F(GbReceipt, poolMs) F(GbReceipt, d2hMs) F(GbReceipt, totalMs) F(GbReceipt, deviceBytes) F(GbReceipt, pad) E
  S(GbResultHeader) F(GbResultHeader, magic) F(GbResultHeader, version) F(GbResultHeader, nCand) F(GbResultHeader, flags) F(GbResultHeader, tradeCapD1) F(GbResultHeader, tradeCapG) F(GbResultHeader, lotCap) F(GbResultHeader, fundCap) F(GbResultHeader, sessions) F(GbResultHeader, nTrades) F(GbResultHeader, nLots) F(GbResultHeader, nFunding) E
  printf("}\n");
  return 0;
}
