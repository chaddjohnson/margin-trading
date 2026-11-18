// gpu-phase1-feasibility: the CUDA evaluator server (proof of concept; research only, never wired into a runner).
// Reads framed requests on stdin and answers framed responses on stdout (gp1.h); logs go to stderr only.
//
//   gp1 [--vram-budget-mb N] [--max-l N] [--tpb N] [--allow-fault-injection]
//
// Build (RUN_COMMANDS.md): nvcc -O3 -std=c++17 -arch=sm_120 --fmad=false -prec-div=true -prec-sqrt=true gp1.cu -o gp1
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>
#include <cuda_runtime.h>
#include "gp1.h"
#include "gp1_kernels.cuh"

static int g_budgetMb = 2048, g_maxL = 300, g_tpb = 64;
static bool g_allowFault = false;

// ----- framed I/O -----
static bool readExact(void* p, size_t n) {
  char* c = (char*)p;
  while (n) { size_t r = fread(c, 1, n, stdin); if (r == 0) return false; c += r; n -= r; }
  return true;
}
static void respond(uint32_t status, const void* payload, uint64_t bytes) {
  uint32_t h[2] = {GP1_RES_MAGIC, status};
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
// a CUDA failure: report it; a sticky error corrupts the context, so the server exits after reporting
#define CK(x)                                                                                                    \
  do {                                                                                                           \
    cudaError_t e_ = (x);                                                                                        \
    if (e_ != cudaSuccess) {                                                                                     \
      respondText(e_ == cudaErrorMemoryAllocation ? GP1_E_MEMORY : GP1_E_CUDA,                                   \
                  std::string("CUDA error ") + cudaGetErrorName(e_) + ": " + cudaGetErrorString(e_) + " at " #x); \
      if (isSticky(e_)) { fprintf(stderr, "gp1: sticky CUDA error, exiting\n"); exit(3); }                        \
      return;                                                                                                    \
    }                                                                                                            \
  } while (0)

// ----- the dataset on the device -----
struct DeviceDataset {
  bool loaded = false;
  int S = 0, bars[2] = {0, 0};
  std::vector<void*> allocs;
  DevData dev;
  std::string path;
  double uploadMs = 0, refMs = 0;
  size_t bytes = 0;
};
static DeviceDataset g_ds;

static void freeDataset() {
  for (void* p : g_ds.allocs) cudaFree(p);
  g_ds.allocs.clear();
  g_ds.loaded = false;
}

// FNV-1a over the payload's little-endian 32-bit words (the payload is a multiple of 4 bytes); src/gpu-phase1/
// dataset.ts computes the same value
static uint64_t checksum32(const unsigned char* p, size_t n) {
  uint32_t h = 2166136261u;
  for (size_t i = 0; i + 4 <= n; i += 4) { uint32_t w; memcpy(&w, p + i, 4); h ^= w; h *= 16777619u; }
  return h;
}

static void handleLoad(const std::string& path) {
  FILE* f = fopen(path.c_str(), "rb");
  if (!f) return respondText(GP1_E_DATASET, "cannot open dataset " + path);
  std::vector<unsigned char> buf;
  fseek(f, 0, SEEK_END);
  long size = ftell(f);
  fseek(f, 0, SEEK_SET);
  buf.resize(size);
  if (size < (long)sizeof(Gp1DatasetHeader) || fread(buf.data(), 1, size, f) != (size_t)size) { fclose(f); return respondText(GP1_E_DATASET, "short dataset file"); }
  fclose(f);
  Gp1DatasetHeader h;
  memcpy(&h, buf.data(), sizeof h);
  if (memcmp(h.magic, "GP1DSET1", 8) != 0) return respondText(GP1_E_DATASET, "bad dataset magic");
  if (h.version != 1 || h.nSym != 2) return respondText(GP1_E_BAD_VERSION, "unsupported dataset version or symbol count");
  const uint64_t S = h.sessions;
  uint64_t expect = 0;
  for (int i = 0; i < 2; i++) expect += S * 7 * 8 + S * 2 * 4 + (uint64_t)h.bars[i] * 5 * 8;
  if (h.payloadBytes != expect || (uint64_t)size != sizeof h + expect) return respondText(GP1_E_BAD_SIZE, "dataset size mismatch");
  if (checksum32(buf.data() + sizeof h, expect) != h.checksum) return respondText(GP1_E_DATASET, "dataset checksum mismatch");

  freeDataset();
  auto t0 = std::chrono::steady_clock::now();
  const unsigned char* p = buf.data() + sizeof h;
  DevData dd;
  dd.S = (int)S;
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
    const size_t B = h.bars[i];
    d.S = (int)S; d.B = (int)B; d.maxL = g_maxL;
    double** sf[7] = {(double**)&d.sTime, (double**)&d.sCloseTime, (double**)&d.sOpen, (double**)&d.sHigh, (double**)&d.sLow, (double**)&d.sClose, (double**)&d.sClosingPrint};
    for (auto q : sf) if (!(*q = (double*)up(S * 8))) { freeDataset(); return respondText(GP1_E_MEMORY, "dataset upload failed"); }
    if (!(d.sBarStart = (int32_t*)up(S * 4)) || !(d.sBarCount = (int32_t*)up(S * 4))) { freeDataset(); return respondText(GP1_E_MEMORY, "dataset upload failed"); }
    double** bf[5] = {(double**)&d.bTime, (double**)&d.bOpen, (double**)&d.bHigh, (double**)&d.bLow, (double**)&d.bClose};
    for (auto q : bf) if (!(*q = (double*)up(B * 8))) { freeDataset(); return respondText(GP1_E_MEMORY, "dataset upload failed"); }
  }
  CK(cudaDeviceSynchronize());
  auto t1 = std::chrono::steady_clock::now();
  for (int i = 0; i < 2; i++) {
    double* table = nullptr;
    const size_t n = (size_t)S * g_maxL;
    CK(cudaMalloc(&table, n * 8));
    g_ds.allocs.push_back(table);
    g_ds.bytes += n * 8;
    refHighKernel<<<(unsigned)((n + 255) / 256), 256>>>(dd.sym[i].sHigh, (int)S, g_maxL, table);
    CK(cudaGetLastError());
    dd.sym[i].refHigh = table;
  }
  CK(cudaDeviceSynchronize());
  auto t2 = std::chrono::steady_clock::now();
  g_ds.dev = dd;
  g_ds.S = (int)S; g_ds.bars[0] = h.bars[0]; g_ds.bars[1] = h.bars[1];
  g_ds.loaded = true;
  g_ds.path = path;
  g_ds.uploadMs = std::chrono::duration<double, std::milli>(t1 - t0).count();
  g_ds.refMs = std::chrono::duration<double, std::milli>(t2 - t1).count();
  char msg[256];
  snprintf(msg, sizeof msg, "{\"sessions\":%d,\"bars\":[%d,%d],\"uploadMs\":%.3f,\"refHighMs\":%.3f,\"deviceBytes\":%zu,\"maxL\":%d}", g_ds.S, g_ds.bars[0], g_ds.bars[1], g_ds.uploadMs, g_ds.refMs, g_ds.bytes, g_maxL);
  respondText(GP1_OK, msg);
}

// ----- grow-only device buffers for batches -----
struct Buf { void* p = nullptr; size_t n = 0; };
static Buf b_cands, b_ext, b_trades, b_outs, b_status, b_lots, b_daily, b_prin, b_val, b_held, b_packT, b_packL, b_offT, b_offL;
static cudaError_t ensure(Buf& b, size_t n) {
  if (n == 0) n = 8;
  if (b.n >= n) return cudaSuccess;
  if (b.p) cudaFree(b.p);
  b.p = nullptr; b.n = 0;
  cudaError_t e = cudaMalloc(&b.p, n);
  if (e == cudaSuccess) b.n = n;
  return e;
}

__global__ void packTrades(int nCand, const Gp1CandOut* outs, const Gp1Trade* trades, int tradeCap, const long long* off, Gp1Trade* packed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand || outs[c].status != C_OK) return;
  long long o = off[c];
  for (int b = 0; b < 2; b++)
    for (int i = 0; i < outs[c].book[b].nTrades; i++) packed[o++] = trades[((size_t)c * 2 + b) * tradeCap + i];
}
__global__ void packLots(int nCand, const Gp1CandOut* outs, const Gp1Lot* lots, int lotCap, const long long* off, Gp1Lot* packed) {
  const int c = blockIdx.x * blockDim.x + threadIdx.x;
  if (c >= nCand || outs[c].status != C_OK) return;
  for (int i = 0; i < outs[c].nLots; i++) packed[off[c] + i] = lots[(size_t)c * lotCap + i];
}

static void handleEval(const std::vector<unsigned char>& req) {
  auto T0 = std::chrono::steady_clock::now();
  if (!g_ds.loaded) return respondText(GP1_E_NO_DATASET, "no dataset loaded");
  if (req.size() < sizeof(Gp1BatchHeader)) return respondText(GP1_E_BAD_SIZE, "short batch");
  Gp1BatchHeader h;
  memcpy(&h, req.data(), sizeof h);
  if (memcmp(h.magic, "GP1BATCH", 8) != 0) return respondText(GP1_E_BAD_FRAME, "bad batch magic");
  if (h.version != GP1_PROTOCOL_VERSION) return respondText(GP1_E_BAD_VERSION, "unsupported batch version " + std::to_string(h.version));
  const uint64_t need = sizeof h + (uint64_t)h.nCand * sizeof(Gp1CandIn) + (uint64_t)h.nExt * sizeof(Gp1Trade);
  if (req.size() != need) return respondText(GP1_E_BAD_SIZE, "batch size " + std::to_string(req.size()) + " != " + std::to_string(need));
  if (h.nCand == 0) return respondText(GP1_E_BAD_SIZE, "empty batch");
  if (h.endIndex != (uint32_t)(g_ds.S - 1)) return respondText(GP1_E_UNSUPPORTED, "v1 evaluates through the dataset's last session only");
  if (h.tradeCap < 1 || h.lotCap < 1 || h.tradeCap > 1u << 20 || h.lotCap > 1u << 20) return respondText(GP1_E_BAD_SIZE, "bad capacities");
  const Gp1CandIn* cin = (const Gp1CandIn*)(req.data() + sizeof h);
  const Gp1Trade* ext = (const Gp1Trade*)(req.data() + sizeof h + (size_t)h.nCand * sizeof(Gp1CandIn));
  for (uint32_t i = 0; i < h.nCand; i++) {
    if (cin[i].features & ~F_SUPPORTED_V1) {
      char m[160];
      snprintf(m, sizeof m, "candidate %u requests unsupported features 0x%x (supported 0x%x)", cin[i].id, cin[i].features & ~F_SUPPORTED_V1, F_SUPPORTED_V1);
      return respondText(GP1_E_UNSUPPORTED, m);
    }
    for (int b = 0; b < 2; b++)
      if (cin[i].extPresent[b] && (cin[i].extOffset[b] < 0 || cin[i].extCount[b] < 0 || (uint64_t)cin[i].extOffset[b] + cin[i].extCount[b] > h.nExt))
        return respondText(GP1_E_BAD_SIZE, "external book range out of bounds");
    if (cin[i].first != 0 && cin[i].first != 1) return respondText(GP1_E_BAD_FRAME, "bad tie order");
  }
  for (uint32_t i = 0; i < h.nExt; i++)
    if (ext[i].nFills < 0 || ext[i].nFills > GP1_MAX_FILLS) return respondText(GP1_E_UNSUPPORTED, "an external trade has more fills than supported");

  const size_t n = h.nCand, S = g_ds.S;
  const bool runPool = h.flags & B_RUN_POOL;
  const size_t bytes = n * sizeof(Gp1CandIn) + (size_t)h.nExt * sizeof(Gp1Trade) + n * 2 * h.tradeCap * sizeof(Gp1Trade) +
                       n * sizeof(Gp1CandOut) + n * 16 +
                       (runPool ? n * h.lotCap * sizeof(Gp1Lot) + n * S * 8 + ((h.flags & 8u) ? n * S * (8 * 2 + 1) : 0) : 0);
  size_t freeB = 0, totalB = 0;
  CK(cudaMemGetInfo(&freeB, &totalB));
  const size_t have = b_cands.n + b_ext.n + b_trades.n + b_outs.n + b_status.n + b_lots.n + b_daily.n + b_prin.n + b_val.n + b_held.n;
  if (bytes > (size_t)g_budgetMb << 20)
    return respondText(GP1_E_MEMORY, "batch needs " + std::to_string(bytes >> 20) + " MiB > VRAM budget " + std::to_string(g_budgetMb) + " MiB");
  if (bytes > have + freeB - ((size_t)256 << 20))
    return respondText(GP1_E_MEMORY, "batch needs " + std::to_string(bytes >> 20) + " MiB; free " + std::to_string(freeB >> 20) + " MiB");

  CK(ensure(b_cands, n * sizeof(Gp1CandIn)));
  CK(ensure(b_ext, (size_t)h.nExt * sizeof(Gp1Trade)));
  CK(ensure(b_trades, n * 2 * h.tradeCap * sizeof(Gp1Trade)));
  CK(ensure(b_outs, n * sizeof(Gp1CandOut)));
  CK(ensure(b_status, n * 16));
  if (runPool) {
    CK(ensure(b_lots, n * h.lotCap * sizeof(Gp1Lot)));
    CK(ensure(b_daily, n * S * 8));
    if (h.flags & 8u) {
      CK(ensure(b_prin, n * S * 8));
      CK(ensure(b_val, n * S * 8));
      CK(ensure(b_held, n * S));
    }
  }

  cudaEvent_t e0, e1, e2, e3, e4;
  cudaEventCreate(&e0); cudaEventCreate(&e1); cudaEventCreate(&e2); cudaEventCreate(&e3); cudaEventCreate(&e4);
  cudaEventRecord(e0);
  CK(cudaMemcpy(b_cands.p, cin, n * sizeof(Gp1CandIn), cudaMemcpyHostToDevice));
  if (h.nExt) CK(cudaMemcpy(b_ext.p, ext, (size_t)h.nExt * sizeof(Gp1Trade), cudaMemcpyHostToDevice));
  cudaEventRecord(e1);
  const int tpb = g_tpb;
  const unsigned blocks = (unsigned)((n + tpb - 1) / tpb);
  initKernel<<<blocks, tpb>>>((const Gp1CandIn*)b_cands.p, (int)n, (Gp1CandOut*)b_outs.p, (int32_t*)b_status.p);
  CK(cudaGetLastError());
  d1Kernel<<<dim3(blocks, 2), tpb>>>(g_ds.dev, (const Gp1CandIn*)b_cands.p, (int)n, (Gp1Trade*)b_trades.p, (int)h.tradeCap,
                                     (Gp1CandOut*)b_outs.p, (int32_t*)b_status.p, (int)h.endIndex);
  CK(cudaGetLastError());
  combineKernel<<<blocks, tpb>>>((int)n, (Gp1CandOut*)b_outs.p, (const int32_t*)b_status.p);
  CK(cudaGetLastError());
  cudaEventRecord(e2);
  if (runPool) {
    poolKernel<<<blocks, tpb>>>(g_ds.dev, (const Gp1CandIn*)b_cands.p, (int)n, (const Gp1Trade*)b_trades.p, (int)h.tradeCap,
                                (const Gp1Trade*)b_ext.p, (Gp1CandOut*)b_outs.p, (Gp1Lot*)b_lots.p, (int)h.lotCap, (double*)b_daily.p,
                                (double*)b_prin.p, (double*)b_val.p, (int8_t*)b_held.p, (h.flags & 8u) ? 1 : 0, (int)h.endIndex, h.budget, h.poolRate);
    CK(cudaGetLastError());
  }
  cudaEventRecord(e3);
  CK(cudaEventSynchronize(e3));

  // outputs: CandOut, then the packed trades / lots and the series the flags ask for
  std::vector<Gp1CandOut> outs(n);
  CK(cudaMemcpy(outs.data(), b_outs.p, n * sizeof(Gp1CandOut), cudaMemcpyDeviceToHost));
  std::vector<long long> offT(n), offL(n);
  long long nT = 0, nL = 0;
  for (size_t c = 0; c < n; c++) {
    offT[c] = nT; offL[c] = nL;
    if (outs[c].status == C_OK) { nT += outs[c].book[0].nTrades + outs[c].book[1].nTrades; nL += runPool ? outs[c].nLots : 0; }
  }
  const bool retT = h.flags & B_RETURN_TRADES, retL = runPool && (h.flags & B_RETURN_LOTS), retS = runPool && (h.flags & 8u);
  std::vector<Gp1Trade> trades(retT ? nT : 0);
  std::vector<Gp1Lot> lotsOut(retL ? nL : 0);
  std::vector<double> daily(retL ? n * S : 0), prin(retS ? n * S : 0), val(retS ? n * S : 0);
  std::vector<int8_t> held(retS ? n * S : 0);
  if (retT && nT) {
    CK(ensure(b_offT, n * 8));
    CK(ensure(b_packT, nT * sizeof(Gp1Trade)));
    CK(cudaMemcpy(b_offT.p, offT.data(), n * 8, cudaMemcpyHostToDevice));
    packTrades<<<blocks, tpb>>>((int)n, (const Gp1CandOut*)b_outs.p, (const Gp1Trade*)b_trades.p, (int)h.tradeCap, (const long long*)b_offT.p, (Gp1Trade*)b_packT.p);
    CK(cudaGetLastError());
    CK(cudaMemcpy(trades.data(), b_packT.p, nT * sizeof(Gp1Trade), cudaMemcpyDeviceToHost));
  }
  if (retL) {
    if (nL) {
      CK(ensure(b_offL, n * 8));
      CK(ensure(b_packL, nL * sizeof(Gp1Lot)));
      CK(cudaMemcpy(b_offL.p, offL.data(), n * 8, cudaMemcpyHostToDevice));
      packLots<<<blocks, tpb>>>((int)n, (const Gp1CandOut*)b_outs.p, (const Gp1Lot*)b_lots.p, (int)h.lotCap, (const long long*)b_offL.p, (Gp1Lot*)b_packL.p);
      CK(cudaGetLastError());
      CK(cudaMemcpy(lotsOut.data(), b_packL.p, nL * sizeof(Gp1Lot), cudaMemcpyDeviceToHost));
    }
    CK(cudaMemcpy(daily.data(), b_daily.p, n * S * 8, cudaMemcpyDeviceToHost));
  }
  if (retS) {
    CK(cudaMemcpy(prin.data(), b_prin.p, n * S * 8, cudaMemcpyDeviceToHost));
    CK(cudaMemcpy(val.data(), b_val.p, n * S * 8, cudaMemcpyDeviceToHost));
    CK(cudaMemcpy(held.data(), b_held.p, n * S, cudaMemcpyDeviceToHost));
  }
  cudaEventRecord(e4);
  CK(cudaEventSynchronize(e4));

  float h2d, d1, pool, d2h;
  cudaEventElapsedTime(&h2d, e0, e1);
  cudaEventElapsedTime(&d1, e1, e2);
  cudaEventElapsedTime(&pool, e2, e3);
  cudaEventElapsedTime(&d2h, e3, e4);
  cudaEventDestroy(e0); cudaEventDestroy(e1); cudaEventDestroy(e2); cudaEventDestroy(e3); cudaEventDestroy(e4);

  Gp1ResultHeader rh;
  memset(&rh, 0, sizeof rh);
  memcpy(rh.magic, "GP1OUT01", 8);
  rh.version = GP1_PROTOCOL_VERSION; rh.nCand = (uint32_t)n; rh.flags = h.flags; rh.tradeCap = h.tradeCap; rh.lotCap = h.lotCap; rh.sessions = (uint32_t)S;
  rh.h2dMs = h2d; rh.refMs = 0; rh.d1KernelMs = d1; rh.poolKernelMs = pool; rh.d2hMs = d2h;
  rh.deviceBytes = (double)bytes;
  const size_t heldPad = retS ? ((n * S + 7) & ~(size_t)7) : 0;
  const uint64_t total = sizeof rh + n * sizeof(Gp1CandOut) + trades.size() * sizeof(Gp1Trade) + lotsOut.size() * sizeof(Gp1Lot) +
                         (daily.size() + prin.size() + val.size()) * 8 + heldPad;
  rh.totalMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - T0).count();
  uint32_t fh[2] = {GP1_RES_MAGIC, GP1_OK};
  fwrite(fh, 4, 2, stdout);
  fwrite(&total, 8, 1, stdout);
  fwrite(&rh, sizeof rh, 1, stdout);
  fwrite(outs.data(), sizeof(Gp1CandOut), n, stdout);
  if (!trades.empty()) fwrite(trades.data(), sizeof(Gp1Trade), trades.size(), stdout);
  if (!lotsOut.empty()) fwrite(lotsOut.data(), sizeof(Gp1Lot), lotsOut.size(), stdout);
  if (!daily.empty()) fwrite(daily.data(), 8, daily.size(), stdout);
  if (!prin.empty()) fwrite(prin.data(), 8, prin.size(), stdout);
  if (!val.empty()) fwrite(val.data(), 8, val.size(), stdout);
  if (retS) { fwrite(held.data(), 1, held.size(), stdout); static const char z[8] = {0}; fwrite(z, 1, heldPad - held.size(), stdout); }
  fflush(stdout);
}

static void handleInfo() {
  cudaDeviceProp p;
  int drv = 0, rt = 0;
  size_t fr = 0, to = 0;
  cudaGetDeviceProperties(&p, 0);
  cudaDriverGetVersion(&drv);
  cudaRuntimeGetVersion(&rt);
  cudaMemGetInfo(&fr, &to);
  char m[1024];
  snprintf(m, sizeof m,
           "{\"protocol\":%u,\"device\":\"%s\",\"cc\":\"%d.%d\",\"sms\":%d,\"totalBytes\":%zu,\"freeBytes\":%zu,\"driver\":%d,"
           "\"runtime\":%d,\"supportedFeatures\":%u,\"vramBudgetMb\":%d,\"maxL\":%d,\"tpb\":%d,\"datasetLoaded\":%s,\"sessions\":%d,"
           "\"build\":\"-O3 --fmad=false -prec-div=true -prec-sqrt=true sm_120\",\"faultInjection\":%s}",
           GP1_PROTOCOL_VERSION, p.name, p.major, p.minor, p.multiProcessorCount, to, fr, drv, rt, F_SUPPORTED_V1, g_budgetMb, g_maxL, g_tpb,
           g_ds.loaded ? "true" : "false", g_ds.S, g_allowFault ? "true" : "false");
  respondText(GP1_OK, m);
}

static void handleFault() {
  if (!g_allowFault) return respondText(GP1_E_FAULT_REFUSED, "fault injection is disabled");
  int* p = nullptr;
  CK(cudaMalloc(&p, 256));
  faultKernel<<<1, 32>>>(p);
  CK(cudaGetLastError());
  CK(cudaDeviceSynchronize());
  respondText(GP1_OK, "no fault occurred");  // never reached on a working device
}

int main(int argc, char** argv) {
  for (int i = 1; i < argc; i++) {
    std::string a = argv[i];
    if (a == "--vram-budget-mb" && i + 1 < argc) g_budgetMb = atoi(argv[++i]);
    else if (a == "--max-l" && i + 1 < argc) g_maxL = atoi(argv[++i]);
    else if (a == "--tpb" && i + 1 < argc) g_tpb = atoi(argv[++i]);
    else if (a == "--allow-fault-injection") g_allowFault = true;
    else { fprintf(stderr, "gp1: unknown argument %s\n", a.c_str()); return 2; }
  }
  if (cudaSetDevice(0) != cudaSuccess || cudaFree(0) != cudaSuccess) { fprintf(stderr, "gp1: no CUDA device\n"); return 4; }
  // the default per-thread stack (1 KiB) suffices (ptxas: d1Kernel 0 B, poolKernel 144 B); a larger limit makes the
  // driver reserve local memory for every resident thread (8 KiB × 261,120 threads ≈ 2 GiB of VRAM)
  for (;;) {
    uint32_t hdr[2];
    uint64_t bytes;
    if (!readExact(hdr, 8) || !readExact(&bytes, 8)) break;  // EOF: the client closed the pipe
    if (hdr[0] != GP1_REQ_MAGIC || bytes > (1ull << 34)) { respondText(GP1_E_BAD_FRAME, "bad request frame"); break; }
    std::vector<unsigned char> payload(bytes);
    if (bytes && !readExact(payload.data(), bytes)) break;
    switch (hdr[1]) {
      case GP1_LOAD: handleLoad(std::string(payload.begin(), payload.end())); break;
      case GP1_EVAL: handleEval(payload); break;
      case GP1_INFO: handleInfo(); break;
      case GP1_QUIT: respondText(GP1_OK, "bye"); return 0;
      case GP1_FAULT: handleFault(); break;
      default: respondText(GP1_E_BAD_FRAME, "unknown request type"); break;
    }
  }
  return 0;
}
