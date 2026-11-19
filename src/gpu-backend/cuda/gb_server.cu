// gpu-backend: the CUDA evaluator server (protocol v2, gb.h). Reads framed requests on stdin and answers framed
// responses on stdout; logs go to stderr only. The canonical engine is the TypeScript/CPU one; this server is its
// parity-gated accelerator (src/gpu-backend/README.md). It never evaluates anything on the CPU.
//
//   gb2 [--vram-budget-mb N] [--max-l N] [--tpb N] [--allow-fault-injection]
//
// Build: tools/gpu-backend/build.sh (nvcc -O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true,
// with the compatibility digest of the mirrored TypeScript sources compiled in as GB_COMPAT_DIGEST).
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <unistd.h>
#include <cuda_runtime.h>
#include "gb.h"
#include "gb_d1.cuh"
#include "gb_growth.cuh"
#include "gb_pool.cuh"

#ifndef GB_COMPAT_DIGEST
#define GB_COMPAT_DIGEST "unset"
#endif
#ifndef GB_BUILD_FLAGS
#define GB_BUILD_FLAGS "unset"
#endif

static int g_budgetMb = 0, g_maxL = 300, g_tpb = 64;
static bool g_allowFault = false;
// TEST-ONLY fault hooks (accepted only with --allow-fault-injection; an official gate refuses such a server)
static bool g_corruptSmoke = false, g_corruptOutput = false, g_badReceipt = false;
static int g_stallMs = 0;
static bool g_debug = getenv("GB_DEBUG") != nullptr;
static double g_watchdogS = 300;  // a batch whose kernels run longer fails closed (the server reports and exits)
static std::chrono::steady_clock::time_point g_t0 = std::chrono::steady_clock::now();
#define DBG(...) do { if (g_debug) { fprintf(stderr, "[gb2 %.3f s] ", std::chrono::duration<double>(std::chrono::steady_clock::now() - g_t0).count()); fprintf(stderr, __VA_ARGS__); fputc('\n', stderr); fflush(stderr); } } while (0)
static unsigned char g_uuid[16];
static char g_uuidText[64];

// ----- framed I/O -----
static bool readExact(void* p, size_t n) {
  char* c = (char*)p;
  while (n) { size_t r = fread(c, 1, n, stdin); if (r == 0) return false; c += r; n -= r; }
  return true;
}
static void respond(uint32_t status, const void* payload, uint64_t bytes) {
  uint32_t h[2] = {GB_RES_MAGIC, status};
  fwrite(h, 4, 2, stdout);
  fwrite(&bytes, 8, 1, stdout);
  if (bytes) fwrite(payload, 1, bytes, stdout);
  fflush(stdout);
}
static void respondText(uint32_t status, const std::string& s) { respond(status, s.data(), s.size()); }

static bool isSticky(cudaError_t e) {
  return e == cudaErrorIllegalAddress || e == cudaErrorLaunchFailure || e == cudaErrorHardwareStackError ||
         e == cudaErrorIllegalInstruction || e == cudaErrorMisalignedAddress || e == cudaErrorInvalidAddressSpace ||
         e == cudaErrorInvalidPc || e == cudaErrorAssert || e == cudaErrorUnknown;
}
#define CK(x)                                                                                                    \
  do {                                                                                                           \
    cudaError_t e_ = (x);                                                                                        \
    if (e_ != cudaSuccess) {                                                                                     \
      respondText(e_ == cudaErrorMemoryAllocation ? GB_E_MEMORY : GB_E_CUDA,                                     \
                  std::string("CUDA error ") + cudaGetErrorName(e_) + ": " + cudaGetErrorString(e_) + " at " #x); \
      if (isSticky(e_)) { fprintf(stderr, "gb2: sticky CUDA error, exiting\n"); exit(3); }                        \
      return;                                                                                                    \
    }                                                                                                            \
  } while (0)

// Waits for an event with a deadline (1 ms polls: no busy spin). A batch that exceeds the watchdog is reported as a CUDA
// error and the server exits: a running kernel cannot be cancelled inside the context, and a silent multi-hour stall is
// never acceptable (the client fails the job; nothing falls back to the CPU).
static cudaError_t waitEvent(cudaEvent_t e, const char* what, std::chrono::steady_clock::time_point start) {
  for (;;) {
    cudaError_t q = cudaEventQuery(e);
    if (q != cudaErrorNotReady) return q;
    const double s = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
    if (s > g_watchdogS) {
      char m[256];
      snprintf(m, sizeof m, "kernel watchdog: %s still running after %.0f s (limit %.0f s); the server exits", what, s, g_watchdogS);
      fprintf(stderr, "gb2: %s\n", m);
      respondText(GB_E_CUDA, m);
      fflush(stdout);
      _exit(6);
    }
    usleep(1000);
  }
}

// ----- the dataset on the device -----
struct DeviceDataset {
  bool loaded = false;
  int S = 0, bars[2] = {0, 0}, full[2] = {0, 0};
  std::vector<void*> allocs;
  DevData dev;
  std::string path;
  double uploadMs = 0, tablesMs = 0;
  size_t bytes = 0;
};
static DeviceDataset g_ds;

static void freeDataset() {
  for (void* p : g_ds.allocs) cudaFree(p);
  g_ds.allocs.clear();
  g_ds.loaded = false;
}

static uint64_t checksum32(const unsigned char* p, size_t n) {
  uint32_t h = 2166136261u;
  for (size_t i = 0; i + 4 <= n; i += 4) { uint32_t w; memcpy(&w, p + i, 4); h ^= w; h *= 16777619u; }
  return h;
}

__global__ void refHighKernel(const double* __restrict__ sHigh, int S, int maxL, double* table) {
  const size_t i = (size_t)blockIdx.x * blockDim.x + threadIdx.x;
  if (i >= (size_t)S * maxL) return;
  const int L = (int)(i / S) + 1, s = (int)(i % S);
  double h = -INFINITY;
  const int from = s - L > 0 ? s - L : 0;
  for (int j = from; j <= s - 1; j++) { const double x = sHigh[j]; h = j == from ? x : (h >= x ? h : x); }
  table[i] = h;
}
// one sparse-table level: lvl[i] = op(prev[i], prev[i + half]) (exact: minima/maxima)
__global__ void sparseLevelKernel(const double* __restrict__ prev, double* lvl, int n, int half, int isMax) {
  const int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i >= n) return;
  const double a = prev[i];
  const double b = i + half < n ? prev[i + half] : a;
  lvl[i] = isMax ? (a > b ? a : b) : (a < b ? a : b);
}

static bool buildSparse(const double* level0, int n, int isMax, const double** out, std::string& err) {
  out[0] = level0;
  for (int k = 1; k < GB_SPARSE_LEVELS; k++) {
    if ((1 << k) > n) { out[k] = out[k - 1]; continue; }
    double* lvl = nullptr;
    if (cudaMalloc(&lvl, (size_t)n * 8) != cudaSuccess) { err = "sparse table allocation failed"; return false; }
    g_ds.allocs.push_back(lvl);
    g_ds.bytes += (size_t)n * 8;
    sparseLevelKernel<<<(n + 255) / 256, 256>>>(out[k - 1], lvl, n, 1 << (k - 1), isMax);
    if (cudaGetLastError() != cudaSuccess) { err = "sparse table kernel failed"; return false; }
    out[k] = lvl;
  }
  return true;
}

static void handleLoad(const std::string& path) {
  FILE* f = fopen(path.c_str(), "rb");
  if (!f) return respondText(GB_E_DATASET, "cannot open dataset " + path);
  std::vector<unsigned char> buf;
  fseek(f, 0, SEEK_END);
  long size = ftell(f);
  fseek(f, 0, SEEK_SET);
  buf.resize(size);
  if (size < (long)sizeof(GbDatasetHeader) || fread(buf.data(), 1, size, f) != (size_t)size) { fclose(f); return respondText(GB_E_DATASET, "short dataset file"); }
  fclose(f);
  GbDatasetHeader h;
  memcpy(&h, buf.data(), sizeof h);
  if (memcmp(h.magic, "GB2DSET1", 8) != 0) return respondText(GB_E_DATASET, "bad dataset magic");
  if (h.version != GB_DATASET_VERSION || h.nSym != 2) return respondText(GB_E_BAD_VERSION, "unsupported dataset version or symbol count");
  const uint64_t S = h.sessions;
  uint64_t expect = 0;
  for (int i = 0; i < 2; i++) expect += S * 12 * 8 + S * 4 * 4 + (uint64_t)h.bars[i] * 5 * 8 + (uint64_t)h.full[i] * 8;
  if (h.payloadBytes != expect || (uint64_t)size != sizeof h + expect) return respondText(GB_E_BAD_SIZE, "dataset size mismatch");
  if (checksum32(buf.data() + sizeof h, expect) != h.checksum) return respondText(GB_E_DATASET, "dataset checksum mismatch");

  freeDataset();
  auto t0 = std::chrono::steady_clock::now();
  const unsigned char* p = buf.data() + sizeof h;
  DevData dd;
  dd.S = (int)S;
  std::string err;
  auto up = [&](size_t n) -> void* {
    void* d = nullptr;
    if (cudaMalloc(&d, n ? n : 8) != cudaSuccess) return nullptr;
    g_ds.allocs.push_back(d);
    if (cudaMemcpy(d, p, n, cudaMemcpyHostToDevice) != cudaSuccess) return nullptr;
    p += n;
    g_ds.bytes += n;
    return d;
  };
  g_ds.bytes = 0;
  for (int i = 0; i < 2; i++) {
    DevSym& d = dd.sym[i];
    const size_t B = h.bars[i], F = h.full[i];
    d.S = (int)S; d.B = (int)B; d.F = (int)F; d.maxL = g_maxL;
    double** sf[12] = {(double**)&d.sTime, (double**)&d.sCloseTime, (double**)&d.sOpen, (double**)&d.sHigh, (double**)&d.sLow,
                       (double**)&d.sClose, (double**)&d.sClosingPrint, (double**)&d.barEnd, (double**)&d.barOpen,
                       (double**)&d.barHigh, (double**)&d.barLow, (double**)&d.barClose};
    for (auto q : sf) if (!(*q = (double*)up(S * 8))) { freeDataset(); return respondText(GB_E_MEMORY, "dataset upload failed"); }
    int32_t** si[4] = {(int32_t**)&d.sBarStart, (int32_t**)&d.sBarCount, (int32_t**)&d.nyOffset, (int32_t**)&d.fullStart};
    for (auto q : si) if (!(*q = (int32_t*)up(S * 4))) { freeDataset(); return respondText(GB_E_MEMORY, "dataset upload failed"); }
    double** bf[5] = {(double**)&d.bTime, (double**)&d.bOpen, (double**)&d.bHigh, (double**)&d.bLow, (double**)&d.bClose};
    for (auto q : bf) if (!(*q = (double*)up(B * 8))) { freeDataset(); return respondText(GB_E_MEMORY, "dataset upload failed"); }
    if (!(d.fullPrice = (double*)up(F * 8))) { freeDataset(); return respondText(GB_E_MEMORY, "dataset upload failed"); }
  }
  CK(cudaDeviceSynchronize());
  auto t1 = std::chrono::steady_clock::now();
  for (int i = 0; i < 2; i++) {
    DevSym& d = dd.sym[i];
    double* table = nullptr;
    const size_t n = (size_t)S * g_maxL;
    CK(cudaMalloc(&table, n * 8));
    g_ds.allocs.push_back(table);
    g_ds.bytes += n * 8;
    refHighKernel<<<(unsigned)((n + 255) / 256), 256>>>(d.sHigh, (int)S, g_maxL, table);
    CK(cudaGetLastError());
    d.refHigh = table;
    if (!buildSparse(d.barLow, (int)S, 0, d.rmqBarLow, err) || !buildSparse(d.sHigh, (int)S, 1, d.rmqSessHigh, err) ||
        !buildSparse(d.fullPrice, d.F, 1, d.rmqFull, err)) {
      freeDataset();
      return respondText(GB_E_MEMORY, err);
    }
  }
  CK(cudaDeviceSynchronize());
  auto t2 = std::chrono::steady_clock::now();
  g_ds.dev = dd;
  g_ds.S = (int)S; g_ds.bars[0] = h.bars[0]; g_ds.bars[1] = h.bars[1]; g_ds.full[0] = h.full[0]; g_ds.full[1] = h.full[1];
  g_ds.loaded = true;
  g_ds.path = path;
  g_ds.uploadMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
  g_ds.tablesMs = std::chrono::duration<double, std::milli>(t2 - t1).count();
  char msg[320];
  snprintf(msg, sizeof msg, "{\"sessions\":%d,\"bars\":[%d,%d],\"full\":[%d,%d],\"uploadMs\":%.3f,\"tablesMs\":%.3f,\"deviceBytes\":%zu,\"maxL\":%d}",
           g_ds.S, g_ds.bars[0], g_ds.bars[1], g_ds.full[0], g_ds.full[1], g_ds.uploadMs, g_ds.tablesMs, g_ds.bytes, g_maxL);
  respondText(GB_OK, msg);
}

// ----- grow-only device buffers -----
struct Buf { void* p = nullptr; size_t n = 0; };
static Buf b_cands, b_ranges, b_d1t, b_gt, b_outs, b_lots, b_fund, b_periods, b_daily, b_prin, b_val, b_held, b_pack, b_off, b_counters, b_hash;
static cudaError_t ensure(Buf& b, size_t n) {
  if (n == 0) n = 8;
  if (b.n >= n) return cudaSuccess;
  if (b.p) cudaFree(b.p);
  b.p = nullptr; b.n = 0;
  cudaError_t e = cudaMalloc(&b.p, n);
  if (e == cudaSuccess) b.n = n;
  return e;
}
static size_t heldBytes() {
  Buf* all[] = {&b_cands, &b_ranges, &b_d1t, &b_gt, &b_outs, &b_lots, &b_fund, &b_periods, &b_daily, &b_prin, &b_val, &b_held, &b_pack, &b_off, &b_counters, &b_hash};
  size_t n = 0;
  for (Buf* b : all) n += b->n;
  return n;
}

__global__ void initKernel(const GbCandIn* __restrict__ cands, int nCand, GbCandOut* outs) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand) return;
  memset(&outs[c], 0, sizeof(GbCandOut));
  outs[c].id = cands[c].id;
}
// without the pool: the candidate's status is its first failing book's (the order D1:GDX, D1:VGT, G:GDX, G:VGT)
__global__ void combineKernel(int nCand, GbCandOut* outs) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand) return;
  for (int b = 0; b < 4; b++)
    if (outs[c].book[b].status != C_OK) { outs[c].status = outs[c].book[b].status; outs[c].errInfo = (b << 24) | (outs[c].book[b].errInfo & 0xFFFFFF); return; }
}
// per-candidate FNV-1a 64 over its CandOut bytes (the receipt's output checksum is combined on the host)
__global__ void hashKernel(int nCand, const GbCandOut* outs, uint64_t* h) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand) return;
  const unsigned char* p = (const unsigned char*)&outs[c];
  uint64_t x = 14695981039346656037ull;
  for (size_t i = 0; i < sizeof(GbCandOut); i++) { x ^= p[i]; x *= 1099511628211ull; }
  h[c] = x;
}
__global__ void packTrades(int nCand, const GbCandOut* outs, const GbTrade* d1t, int capD1, const GbTrade* gt, int capG, const long long* off, GbTrade* packed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand || outs[c].status != C_OK) return;
  long long o = off[c];
  for (int b = 0; b < 2; b++)
    for (int i = 0; i < outs[c].book[b].nTrades; i++) packed[o++] = d1t[((size_t)c * 2 + b) * capD1 + i];
  for (int b = 0; b < 2; b++)
    for (int i = 0; i < outs[c].book[2 + b].nTrades; i++) packed[o++] = gt[((size_t)c * 2 + b) * capG + i];
}
__global__ void packLots(int nCand, const GbCandOut* outs, const GbLot* lots, int lotCap, const long long* off, GbLot* packed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand || outs[c].status != C_OK) return;
  for (int i = 0; i < outs[c].nLots; i++) packed[off[c] + i] = lots[(size_t)c * lotCap + i];
}
__global__ void packFunding(int nCand, const GbCandOut* outs, const GbFunding* f, int fundCap, const long long* off, GbFunding* packed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand || outs[c].status != C_OK) return;
  for (int i = 0; i < outs[c].nFunding; i++) packed[off[c] + i] = f[(size_t)c * fundCap + i];
}

static uint64_t fnv64(const void* p, size_t n, uint64_t x = 14695981039346656037ull) {
  const unsigned char* b = (const unsigned char*)p;
  for (size_t i = 0; i < n; i++) { x ^= b[i]; x *= 1099511628211ull; }
  return x;
}

static void handleEval(const std::vector<unsigned char>& req) {
  auto T0 = std::chrono::steady_clock::now();
  if (!g_ds.loaded) return respondText(GB_E_NO_DATASET, "no dataset loaded");
  if (req.size() < sizeof(GbBatchHeader)) return respondText(GB_E_BAD_SIZE, "short batch");
  GbBatchHeader h;
  memcpy(&h, req.data(), sizeof h);
  if (memcmp(h.magic, "GB2BATCH", 8) != 0) return respondText(GB_E_BAD_FRAME, "bad batch magic");
  if (h.version != GB_PROTOCOL_VERSION) return respondText(GB_E_BAD_VERSION, "unsupported batch version " + std::to_string(h.version));
  const uint64_t need = sizeof h + (uint64_t)h.nCand * sizeof(GbCandIn) + (uint64_t)h.nRanges * sizeof(GbRange);
  if (req.size() != need) return respondText(GB_E_BAD_SIZE, "batch size " + std::to_string(req.size()) + " != " + std::to_string(need));
  if (h.nCand == 0) return respondText(GB_E_BAD_SIZE, "empty batch");
  if (h.endIndex != (uint32_t)(g_ds.S - 1)) return respondText(GB_E_UNSUPPORTED, "the evaluator runs through the dataset's last session only");
  if (h.tradeCapD1 < 1 || h.tradeCapG < 1 || h.lotCap < 1 || h.tradeCapD1 > 1u << 16 || h.tradeCapG > 1u << 16 || h.lotCap > 1u << 16 || h.fundCap > 1u << 18)
    return respondText(GB_E_BAD_SIZE, "bad capacities");
  const GbCandIn* cin = (const GbCandIn*)(req.data() + sizeof h);
  const GbRange* rin = (const GbRange*)(req.data() + sizeof h + (size_t)h.nCand * sizeof(GbCandIn));
  const bool runPool = h.flags & B_RUN_POOL;
  uint32_t expectD1 = 0, expectG = 0;
  bool anyDetail = false;
  for (uint32_t i = 0; i < h.nCand; i++) {
    const GbCandIn& c = cin[i];
    if (c.features & ~(uint64_t)GB_SUPPORTED) {
      char m[200];
      snprintf(m, sizeof m, "candidate %u requests unsupported features 0x%llx (supported 0x%llx)", c.id,
               (unsigned long long)(c.features & ~(uint64_t)GB_SUPPORTED), (unsigned long long)GB_SUPPORTED);
      return respondText(GB_E_UNSUPPORTED, m);
    }
    if (c.first != 0 && c.first != 1) return respondText(GB_E_BAD_FRAME, "bad tie order");
    for (int b = 0; b < 4; b++) if (c.tie[b] < 0 || c.tie[b] > 3) return respondText(GB_E_BAD_FRAME, "bad tie order entry");
    if (c.blackoutN < 0 || c.periodN < 0 || c.periodN > GB_MAX_PERIODS || c.blackoutOff < 0 || c.periodOff < 0 ||
        (uint64_t)c.blackoutOff + c.blackoutN > h.nRanges || (uint64_t)c.periodOff + c.periodN > h.nRanges)
      return respondText(GB_E_BAD_SIZE, "range block out of bounds");
    for (int b = 0; b < 2; b++) {
      if (c.d1[b].enabled) expectD1++;
      if (c.g[b].enabled) expectG++;
      if ((c.present[b] != 0) != (c.d1[b].enabled != 0) || (c.present[2 + b] != 0) != (c.g[b].enabled != 0))
        return respondText(GB_E_BAD_FRAME, "present books differ from enabled books");
    }
    if (c.detail) anyDetail = true;
    if (!(c.budget > 0) || !(c.poolRate >= 0)) return respondText(GB_E_BAD_FRAME, "bad budget or rate");
  }

  const size_t n = h.nCand, S = g_ds.S;
  const size_t fundCap = anyDetail ? (h.fundCap ? h.fundCap : 1) : 1;
  const bool retDaily = runPool && (h.flags & B_RETURN_DAILY), retSeries = runPool && (h.flags & B_RETURN_SERIES);
  const size_t bytes = n * sizeof(GbCandIn) + (size_t)h.nRanges * (sizeof(GbRange) + sizeof(GbPeriod)) +
                       n * 2 * ((size_t)h.tradeCapD1 + h.tradeCapG) * sizeof(GbTrade) + n * sizeof(GbCandOut) + n * 8 +
                       (runPool ? n * (size_t)h.lotCap * sizeof(GbLot) + n * fundCap * sizeof(GbFunding) : 0) +
                       (retDaily ? n * S * 8 : 0) + (retSeries ? n * S * 17 : 0);
  size_t freeB = 0, totalB = 0;
  CK(cudaMemGetInfo(&freeB, &totalB));
  const size_t budget = g_budgetMb > 0 ? (size_t)g_budgetMb << 20 : totalB;
  if (bytes > budget)
    return respondText(GB_E_MEMORY, "batch needs " + std::to_string(bytes >> 20) + " MiB > VRAM budget " + std::to_string(budget >> 20) + " MiB");
  if (bytes + ((size_t)512 << 20) > heldBytes() + freeB)
    return respondText(GB_E_MEMORY, "batch needs " + std::to_string(bytes >> 20) + " MiB; free " + std::to_string(freeB >> 20) + " MiB (+ " + std::to_string(heldBytes() >> 20) + " MiB held)");

  CK(ensure(b_cands, n * sizeof(GbCandIn)));
  CK(ensure(b_ranges, (size_t)h.nRanges * sizeof(GbRange)));
  CK(ensure(b_periods, (size_t)h.nRanges * sizeof(GbPeriod)));
  CK(ensure(b_d1t, n * 2 * h.tradeCapD1 * sizeof(GbTrade)));
  CK(ensure(b_gt, n * 2 * h.tradeCapG * sizeof(GbTrade)));
  CK(ensure(b_outs, n * sizeof(GbCandOut)));
  CK(ensure(b_hash, n * 8));
  CK(ensure(b_counters, 64));
  if (runPool) {
    CK(ensure(b_lots, n * h.lotCap * sizeof(GbLot)));
    CK(ensure(b_fund, n * fundCap * sizeof(GbFunding)));
    if (retDaily) CK(ensure(b_daily, n * S * 8));
    if (retSeries) { CK(ensure(b_prin, n * S * 8)); CK(ensure(b_val, n * S * 8)); CK(ensure(b_held, n * S)); }
  }

  cudaStream_t sD1, sG;
  cudaStreamCreate(&sD1);
  cudaStreamCreate(&sG);
  cudaEvent_t e0, e1, eD1, eG, e3, e4;
  cudaEventCreate(&e0); cudaEventCreate(&e1); cudaEventCreate(&eD1); cudaEventCreate(&eG); cudaEventCreate(&e3); cudaEventCreate(&e4);
  cudaEventRecord(e0);
  CK(cudaMemcpy(b_cands.p, cin, n * sizeof(GbCandIn), cudaMemcpyHostToDevice));
  if (h.nRanges) CK(cudaMemcpy(b_ranges.p, rin, (size_t)h.nRanges * sizeof(GbRange), cudaMemcpyHostToDevice));
  CK(cudaMemset(b_counters.p, 0, 64));
  if (h.nRanges) CK(cudaMemset(b_periods.p, 0, (size_t)h.nRanges * sizeof(GbPeriod)));  // blackout slots stay defined
  cudaEventRecord(e1);
  const int tpb = g_tpb;
  const unsigned blocks = (unsigned)((n + tpb - 1) / tpb);
  unsigned* counters = (unsigned*)b_counters.p;  // [0] D1 books, [1] Growth books, [2] pool, [3] kernels launched
  DBG("eval n=%zu flags=%u launching", n, h.flags);
  initKernel<<<blocks, tpb>>>((const GbCandIn*)b_cands.p, (int)n, (GbCandOut*)b_outs.p);
  CK(cudaGetLastError());
  CK(cudaDeviceSynchronize());
  const auto tLaunch = std::chrono::steady_clock::now();
  d1Kernel<<<dim3(blocks, 2), tpb, 0, sD1>>>(g_ds.dev, (const GbCandIn*)b_cands.p, (int)n, (GbTrade*)b_d1t.p, (int)h.tradeCapD1,
                                             (GbCandOut*)b_outs.p, (int)h.endIndex, counters + 0);
  CK(cudaGetLastError());
  cudaEventRecord(eD1, sD1);
  growthKernel<<<dim3(blocks, 2), tpb, 0, sG>>>(g_ds.dev, (const GbCandIn*)b_cands.p, (int)n, (GbTrade*)b_gt.p, (int)h.tradeCapG,
                                                (GbCandOut*)b_outs.p, (int)h.endIndex, counters + 1);
  CK(cudaGetLastError());
  cudaEventRecord(eG, sG);
  CK(waitEvent(eD1, "the D1 kernel", tLaunch));
  DBG("D1 done");
  CK(waitEvent(eG, "the Growth kernel", tLaunch));
  DBG("Growth done");
  unsigned kernels = 3;
  if (runPool) {
    poolKernel<<<blocks, tpb>>>(g_ds.dev, (const GbCandIn*)b_cands.p, (int)n, (const GbTrade*)b_d1t.p, (int)h.tradeCapD1,
                                (const GbTrade*)b_gt.p, (int)h.tradeCapG, (const GbRange*)b_ranges.p, (GbCandOut*)b_outs.p,
                                (GbLot*)b_lots.p, (int)h.lotCap, (GbFunding*)b_fund.p, (int)fundCap, (GbPeriod*)b_periods.p,
                                (double*)b_daily.p, (double*)b_prin.p, (double*)b_val.p, (int8_t*)b_held.p, retSeries ? 1 : 0,
                                retDaily ? 1 : 0, (int)h.endIndex, counters + 2);
  } else
    combineKernel<<<blocks, tpb>>>((int)n, (GbCandOut*)b_outs.p);
  CK(cudaGetLastError());
  hashKernel<<<blocks, tpb>>>((int)n, (const GbCandOut*)b_outs.p, (uint64_t*)b_hash.p);
  CK(cudaGetLastError());
  kernels += 2;
  cudaEventRecord(e3);
  CK(waitEvent(e3, "the pool kernel", tLaunch));
  DBG("pool + hash done");

  std::vector<GbCandOut> outs(n);
  std::vector<uint64_t> hashes(n);
  unsigned ctr[4] = {0, 0, 0, 0};
  CK(cudaMemcpy(outs.data(), b_outs.p, n * sizeof(GbCandOut), cudaMemcpyDeviceToHost));
  CK(cudaMemcpy(hashes.data(), b_hash.p, n * 8, cudaMemcpyDeviceToHost));
  CK(cudaMemcpy(ctr, b_counters.p, 16, cudaMemcpyDeviceToHost));
  if (ctr[0] != expectD1 || ctr[1] != expectG || (runPool && ctr[2] != n)) {
    char m[200];
    snprintf(m, sizeof m, "device execution counters D1 %u/%u, Growth %u/%u, pool %u/%zu disagree with the batch", ctr[0], expectD1, ctr[1], expectG, ctr[2], runPool ? n : 0);
    return respondText(GB_E_RECEIPT, m);
  }
  std::vector<long long> offT(n), offL(n), offF(n);
  long long nT = 0, nL = 0, nF = 0;
  for (size_t c = 0; c < n; c++) {
    offT[c] = nT; offL[c] = nL; offF[c] = nF;
    if (outs[c].status == C_OK) {
      for (int b = 0; b < 4; b++) nT += outs[c].book[b].nTrades;
      if (runPool) { nL += outs[c].nLots; nF += outs[c].nFunding; }
    }
  }
  const bool retT = h.flags & B_RETURN_TRADES, retL = runPool && (h.flags & B_RETURN_LOTS);
  std::vector<GbTrade> trades(retT ? nT : 0);
  std::vector<GbLot> lotsOut(retL ? nL : 0);
  std::vector<GbFunding> fundOut(retL ? nF : 0);
  std::vector<GbPeriod> periods(runPool ? h.nRanges : 0);
  std::vector<double> daily(retDaily ? n * S : 0), prin(retSeries ? n * S : 0), val(retSeries ? n * S : 0);
  std::vector<int8_t> held(retSeries ? n * S : 0);
  CK(ensure(b_off, n * 8));
  if (retT && nT) {
    CK(ensure(b_pack, nT * sizeof(GbTrade)));
    CK(cudaMemcpy(b_off.p, offT.data(), n * 8, cudaMemcpyHostToDevice));
    packTrades<<<blocks, tpb>>>((int)n, (const GbCandOut*)b_outs.p, (const GbTrade*)b_d1t.p, (int)h.tradeCapD1, (const GbTrade*)b_gt.p,
                                (int)h.tradeCapG, (const long long*)b_off.p, (GbTrade*)b_pack.p);
    CK(cudaGetLastError());
    CK(cudaMemcpy(trades.data(), b_pack.p, nT * sizeof(GbTrade), cudaMemcpyDeviceToHost));
  }
  if (retL && nL) {
    CK(ensure(b_pack, nL * sizeof(GbLot)));
    CK(cudaMemcpy(b_off.p, offL.data(), n * 8, cudaMemcpyHostToDevice));
    packLots<<<blocks, tpb>>>((int)n, (const GbCandOut*)b_outs.p, (const GbLot*)b_lots.p, (int)h.lotCap, (const long long*)b_off.p, (GbLot*)b_pack.p);
    CK(cudaGetLastError());
    CK(cudaMemcpy(lotsOut.data(), b_pack.p, nL * sizeof(GbLot), cudaMemcpyDeviceToHost));
  }
  if (retL && nF) {
    CK(ensure(b_pack, nF * sizeof(GbFunding)));
    CK(cudaMemcpy(b_off.p, offF.data(), n * 8, cudaMemcpyHostToDevice));
    packFunding<<<blocks, tpb>>>((int)n, (const GbCandOut*)b_outs.p, (const GbFunding*)b_fund.p, (int)fundCap, (const long long*)b_off.p, (GbFunding*)b_pack.p);
    CK(cudaGetLastError());
    CK(cudaMemcpy(fundOut.data(), b_pack.p, nF * sizeof(GbFunding), cudaMemcpyDeviceToHost));
  }
  if (runPool && h.nRanges) CK(cudaMemcpy(periods.data(), b_periods.p, (size_t)h.nRanges * sizeof(GbPeriod), cudaMemcpyDeviceToHost));
  if (retDaily) CK(cudaMemcpy(daily.data(), b_daily.p, n * S * 8, cudaMemcpyDeviceToHost));
  if (retSeries) {
    CK(cudaMemcpy(prin.data(), b_prin.p, n * S * 8, cudaMemcpyDeviceToHost));
    CK(cudaMemcpy(val.data(), b_val.p, n * S * 8, cudaMemcpyDeviceToHost));
    CK(cudaMemcpy(held.data(), b_held.p, n * S, cudaMemcpyDeviceToHost));
  }
  cudaEventRecord(e4);
  CK(cudaEventSynchronize(e4));

  float h2d, d1ms, gms, poolms, d2h;
  cudaEventElapsedTime(&h2d, e0, e1);
  cudaEventElapsedTime(&d1ms, e1, eD1);
  cudaEventElapsedTime(&gms, e1, eG);
  cudaEventElapsedTime(&poolms, eG, e3);
  cudaEventElapsedTime(&d2h, e3, e4);
  cudaEventDestroy(e0); cudaEventDestroy(e1); cudaEventDestroy(eD1); cudaEventDestroy(eG); cudaEventDestroy(e3); cudaEventDestroy(e4);
  cudaStreamDestroy(sD1);
  cudaStreamDestroy(sG);

  GbReceipt rc;
  memset(&rc, 0, sizeof rc);
  rc.batchNonce = h.batchNonce;
  memcpy(rc.uuid, g_uuid, 16);
  rc.nCand = (uint32_t)n; rc.booksLaunched = (uint32_t)(4 * n); rc.d1Executed = ctr[0]; rc.gExecuted = ctr[1];
  rc.poolExecuted = runPool ? ctr[2] : 0; rc.kernels = kernels;
  uint64_t x = 14695981039346656037ull;
  for (size_t c = 0; c < n; c++) x = fnv64(&hashes[c], 8, x);
  rc.outChecksum = x;
  if (g_corruptOutput && n) { unsigned char* b = (unsigned char*)outs.data(); b[(n - 1) * sizeof(GbCandOut) + 64] ^= 0x01; }  // TEST: a flipped bit after hashing
  if (g_badReceipt) rc.gExecuted += 1;  // TEST: device counters that disagree with the batch
  if (g_stallMs) usleep((useconds_t)g_stallMs * 1000);  // TEST: a stalled server (heartbeat loss)
  rc.h2dMs = h2d; rc.d1Ms = d1ms; rc.gMs = gms; rc.poolMs = poolms; rc.d2hMs = d2h; rc.deviceBytes = (double)bytes;

  GbResultHeader rh;
  memset(&rh, 0, sizeof rh);
  memcpy(rh.magic, "GB2OUT01", 8);
  rh.version = GB_PROTOCOL_VERSION; rh.nCand = (uint32_t)n; rh.flags = h.flags; rh.tradeCapD1 = h.tradeCapD1; rh.tradeCapG = h.tradeCapG;
  rh.lotCap = h.lotCap; rh.fundCap = (uint32_t)fundCap; rh.sessions = (uint32_t)S;
  rh.nTrades = trades.size(); rh.nLots = lotsOut.size(); rh.nFunding = fundOut.size();
  const size_t heldPad = retSeries ? ((n * S + 7) & ~(size_t)7) : 0;
  const uint64_t total = sizeof rh + sizeof rc + n * sizeof(GbCandOut) + trades.size() * sizeof(GbTrade) + lotsOut.size() * sizeof(GbLot) +
                         fundOut.size() * sizeof(GbFunding) + periods.size() * sizeof(GbPeriod) + (daily.size() + prin.size() + val.size()) * 8 + heldPad;
  rc.totalMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - T0).count();
  uint32_t fh[2] = {GB_RES_MAGIC, GB_OK};
  fwrite(fh, 4, 2, stdout);
  fwrite(&total, 8, 1, stdout);
  fwrite(&rh, sizeof rh, 1, stdout);
  fwrite(&rc, sizeof rc, 1, stdout);
  fwrite(outs.data(), sizeof(GbCandOut), n, stdout);
  if (!trades.empty()) fwrite(trades.data(), sizeof(GbTrade), trades.size(), stdout);
  if (!lotsOut.empty()) fwrite(lotsOut.data(), sizeof(GbLot), lotsOut.size(), stdout);
  if (!fundOut.empty()) fwrite(fundOut.data(), sizeof(GbFunding), fundOut.size(), stdout);
  if (!periods.empty()) fwrite(periods.data(), sizeof(GbPeriod), periods.size(), stdout);
  if (!daily.empty()) fwrite(daily.data(), 8, daily.size(), stdout);
  if (!prin.empty()) fwrite(prin.data(), 8, prin.size(), stdout);
  if (!val.empty()) fwrite(val.data(), 8, val.size(), stdout);
  if (retSeries) { fwrite(held.data(), 1, held.size(), stdout); static const char z[8] = {0}; fwrite(z, 1, heldPad - held.size(), stdout); }
  fflush(stdout);
}

// SMOKE: a deterministic device computation the client verifies against its own JavaScript result — V8's Math.log and
// Math.exp on fixed inputs (the evaluator's exact numerics) and an integer mix, reduced in a fixed order on the device
__global__ void smokeKernel(double* out, unsigned long long* mix) {
  const int i = threadIdx.x;  // 256 threads
  const double x = 0.5 + i * 0.75;
  out[i] = v8_log(x) + v8_exp(x / 64.0) * (1.0 / 3.0);
  unsigned long long h = 14695981039346656037ull ^ (unsigned long long)i;
  for (int r = 0; r < 64; r++) { h ^= (unsigned long long)(r * 2654435761u); h *= 1099511628211ull; }
  mix[i] = h;
}
static void handleSmoke() {
  double* d = nullptr;
  unsigned long long* m = nullptr;
  CK(cudaMalloc(&d, 256 * 8));
  CK(cudaMalloc(&m, 256 * 8));
  smokeKernel<<<1, 256>>>(d, m);
  CK(cudaGetLastError());
  CK(cudaDeviceSynchronize());
  std::vector<double> v(256);
  std::vector<unsigned long long> w(256);
  CK(cudaMemcpy(v.data(), d, 256 * 8, cudaMemcpyDeviceToHost));
  CK(cudaMemcpy(w.data(), m, 256 * 8, cudaMemcpyDeviceToHost));
  cudaFree(d);
  cudaFree(m);
  double sum = 0;
  unsigned long long x = 0;
  for (int i = 0; i < 256; i++) { sum += v[i]; x ^= w[i] + 0x9e3779b97f4a7c15ull + (x << 6) + (x >> 2); }
  char msg[256];
  if (g_corruptSmoke) sum += 1.0;
  snprintf(msg, sizeof msg, "{\"sum\":\"%a\",\"mix\":\"%016llx\",\"uuid\":\"%s\"}", sum, x, g_uuidText);
  respondText(GB_OK, msg);
}

static void handleInfo() {
  cudaDeviceProp p;
  int drv = 0, rt = 0;
  size_t fr = 0, to = 0;
  cudaGetDeviceProperties(&p, 0);
  cudaDriverGetVersion(&drv);
  cudaRuntimeGetVersion(&rt);
  cudaMemGetInfo(&fr, &to);
  char m[2048];
  snprintf(m, sizeof m,
           "{\"protocol\":%u,\"datasetVersion\":%u,\"device\":\"%s\",\"uuid\":\"%s\",\"cc\":\"%d.%d\",\"sms\":%d,\"totalBytes\":%zu,"
           "\"freeBytes\":%zu,\"driver\":%d,\"runtime\":%d,\"supportedFeatures\":\"%llx\",\"vramBudgetMb\":%d,\"maxL\":%d,\"tpb\":%d,"
           "\"datasetLoaded\":%s,\"sessions\":%d,\"compatDigest\":\"%s\",\"buildFlags\":\"%s\",\"faultInjection\":%s,\"pid\":%d}",
           GB_PROTOCOL_VERSION, GB_DATASET_VERSION, p.name, g_uuidText, p.major, p.minor, p.multiProcessorCount, to, fr, drv, rt,
           (unsigned long long)GB_SUPPORTED, g_budgetMb, g_maxL, g_tpb, g_ds.loaded ? "true" : "false", g_ds.S, GB_COMPAT_DIGEST,
           GB_BUILD_FLAGS, g_allowFault ? "true" : "false", (int)getpid());
  respondText(GB_OK, m);
}

__global__ void faultKernel(int* p) {
  if (threadIdx.x == 0) __trap();
  p[threadIdx.x] = 1;
}
static void handleFault() {
  if (!g_allowFault) return respondText(GB_E_FAULT_REFUSED, "fault injection is disabled");
  int* p = nullptr;
  CK(cudaMalloc(&p, 256));
  faultKernel<<<1, 32>>>(p);
  CK(cudaGetLastError());
  CK(cudaDeviceSynchronize());
  respondText(GB_OK, "no fault occurred");
}

// every device allocation is released before the process ends (a clean leak check under compute-sanitizer)
static void releaseAll() {
  freeDataset();
  Buf* all[] = {&b_cands, &b_ranges, &b_d1t, &b_gt, &b_outs, &b_lots, &b_fund, &b_periods, &b_daily, &b_prin, &b_val, &b_held, &b_pack, &b_off, &b_counters, &b_hash};
  for (Buf* b : all) { if (b->p) cudaFree(b->p); b->p = nullptr; b->n = 0; }
  cudaDeviceSynchronize();
}

int main(int argc, char** argv) {
  for (int i = 1; i < argc; i++) {
    std::string a = argv[i];
    if (a == "--vram-budget-mb" && i + 1 < argc) g_budgetMb = atoi(argv[++i]);
    else if (a == "--max-l" && i + 1 < argc) g_maxL = atoi(argv[++i]);
    else if (a == "--tpb" && i + 1 < argc) g_tpb = atoi(argv[++i]);
    else if (a == "--allow-fault-injection") g_allowFault = true;
    else if (a == "--watchdog-s" && i + 1 < argc) g_watchdogS = atof(argv[++i]);
    else if (a == "--test-corrupt-smoke") g_corruptSmoke = true;
    else if (a == "--test-corrupt-output") g_corruptOutput = true;
    else if (a == "--test-bad-receipt") g_badReceipt = true;
    else if (a == "--test-stall-ms" && i + 1 < argc) g_stallMs = atoi(argv[++i]);
    else { fprintf(stderr, "gb2: unknown argument %s\n", a.c_str()); return 2; }
  }
  if ((g_corruptSmoke || g_corruptOutput || g_badReceipt || g_stallMs) && !g_allowFault) { fprintf(stderr, "gb2: test hooks need --allow-fault-injection\n"); return 2; }
  if (cudaSetDevice(0) != cudaSuccess || cudaFree(0) != cudaSuccess) { fprintf(stderr, "gb2: no CUDA device\n"); return 4; }
  cudaDeviceProp p;
  cudaGetDeviceProperties(&p, 0);
  memcpy(g_uuid, p.uuid.bytes, 16);
  snprintf(g_uuidText, sizeof g_uuidText, "GPU-%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x", g_uuid[0], g_uuid[1],
           g_uuid[2], g_uuid[3], g_uuid[4], g_uuid[5], g_uuid[6], g_uuid[7], g_uuid[8], g_uuid[9], g_uuid[10], g_uuid[11], g_uuid[12],
           g_uuid[13], g_uuid[14], g_uuid[15]);
  for (;;) {
    uint32_t hdr[2];
    uint64_t bytes;
    if (!readExact(hdr, 8) || !readExact(&bytes, 8)) break;  // EOF: the client closed the pipe
    if (hdr[0] != GB_REQ_MAGIC || bytes > (1ull << 36)) { respondText(GB_E_BAD_FRAME, "bad request frame"); break; }
    std::vector<unsigned char> payload(bytes);
    if (bytes && !readExact(payload.data(), bytes)) break;
    switch (hdr[1]) {
      case GB_LOAD: handleLoad(std::string(payload.begin(), payload.end())); break;
      case GB_EVAL: handleEval(payload); break;
      case GB_INFO: handleInfo(); break;
      case GB_QUIT: releaseAll(); respondText(GB_OK, "bye"); return 0;
      case GB_FAULT: handleFault(); break;
      case GB_SMOKE: handleSmoke(); break;
      default: respondText(GB_E_BAD_FRAME, "unknown request type"); break;
    }
  }
  releaseAll();
  return 0;
}
