// gpu-phase5 (PROTOCOL.md §4.5 item 5): a BOUNDED, NON-DESTRUCTIVE pattern test of spare GPU memory. It allocates a
// block of free VRAM (never the desktop's or another process's), and for each pass writes a pattern from a kernel,
// reads it back in another kernel and counts mismatching 64-bit words: all zeros, all ones, alternating bits, an
// address-dependent hash and its complement (so a stuck bit, a coupled cell or an addressing fault shows as a
// mismatch), each verified twice with a short hold between. No driver, clock or power setting is touched.
//   vram-test <GiB> <rounds>     prints one JSON line; exit 0 = no mismatch
// What it cannot show: a GeForce RTX 5090 has no ECC and reports no corrected or uncorrected memory error; a clean
// pattern test bounds persistent and frequent faults in the tested block only, never a one-off transient elsewhere.
#include <cuda_runtime.h>
#include <chrono>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <thread>

__device__ __host__ inline uint64_t mix(uint64_t x) {
  x ^= x >> 33; x *= 0xff51afd7ed558ccdull; x ^= x >> 33; x *= 0xc4ceb9fe1a85ec53ull; x ^= x >> 33; return x;
}
__device__ inline uint64_t pat(int kind, uint64_t i, uint64_t seed) {
  switch (kind) {
    case 0: return 0ull;
    case 1: return ~0ull;
    case 2: return 0xaaaaaaaaaaaaaaaaull;
    case 3: return 0x5555555555555555ull;
    case 4: return mix(i + seed);
    default: return ~mix(i + seed);
  }
}
__global__ void fillK(uint64_t* p, uint64_t n, int kind, uint64_t seed) {
  for (uint64_t i = blockIdx.x * (uint64_t)blockDim.x + threadIdx.x; i < n; i += (uint64_t)gridDim.x * blockDim.x) p[i] = pat(kind, i, seed);
}
__global__ void checkK(const uint64_t* p, uint64_t n, int kind, uint64_t seed, unsigned long long* bad, unsigned long long* first) {
  unsigned long long local = 0;
  for (uint64_t i = blockIdx.x * (uint64_t)blockDim.x + threadIdx.x; i < n; i += (uint64_t)gridDim.x * blockDim.x)
    if (p[i] != pat(kind, i, seed)) { local++; atomicMin(first, (unsigned long long)i); }
  if (local) atomicAdd(bad, local);
}
#define CK(x) do { cudaError_t e = (x); if (e != cudaSuccess) { printf("{\"error\":\"%s\"}\n", cudaGetErrorString(e)); return 2; } } while (0)

int main(int argc, char** argv) {
  const double gib = argc > 1 ? atof(argv[1]) : 8.0;
  const int rounds = argc > 2 ? atoi(argv[2]) : 2;
  size_t freeB = 0, totalB = 0;
  CK(cudaMemGetInfo(&freeB, &totalB));
  size_t want = (size_t)(gib * 1073741824.0);
  if (want + (3ull << 30) > freeB) { printf("{\"error\":\"refused: %.1f GiB wanted, %.1f GiB free (3 GiB reserve kept)\"}\n", gib, freeB / 1073741824.0); return 3; }
  const uint64_t n = want / 8;
  uint64_t* p = nullptr;
  CK(cudaMalloc(&p, n * 8));
  unsigned long long *bad = nullptr, *first = nullptr;
  CK(cudaMalloc(&bad, 8)); CK(cudaMalloc(&first, 8));
  unsigned long long totalBad = 0, firstBad = ~0ull, words = 0;
  int passes = 0;
  auto t0 = std::chrono::steady_clock::now();
  for (int r = 0; r < rounds; r++)
    for (int kind = 0; kind < 6; kind++) {
      const uint64_t seed = 0x9e3779b97f4a7c15ull * (uint64_t)(r + 1);
      fillK<<<4096, 256>>>(p, n, kind, seed);
      CK(cudaDeviceSynchronize());
      for (int v = 0; v < 2; v++) {
        if (v) std::this_thread::sleep_for(std::chrono::milliseconds(500));  // a short hold before the second read
        unsigned long long z = 0, m = ~0ull, b = 0, f = 0;
        CK(cudaMemcpy(bad, &z, 8, cudaMemcpyHostToDevice)); CK(cudaMemcpy(first, &m, 8, cudaMemcpyHostToDevice));
        checkK<<<4096, 256>>>(p, n, kind, seed, bad, first);
        CK(cudaDeviceSynchronize());
        CK(cudaMemcpy(&b, bad, 8, cudaMemcpyDeviceToHost)); CK(cudaMemcpy(&f, first, 8, cudaMemcpyDeviceToHost));
        totalBad += b; if (b && f < firstBad) firstBad = f;
        words += n; passes++;
      }
    }
  const double s = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
  cudaFree(p); cudaFree(bad); cudaFree(first);
  printf("{\"testedGiB\":%.2f,\"freeGiBBefore\":%.2f,\"totalGiB\":%.2f,\"rounds\":%d,\"patterns\":6,\"verifyPasses\":%d,\"wordsVerified\":%llu,\"mismatchedWords\":%llu,\"firstMismatchWord\":%s,\"seconds\":%.1f}\n",
         n * 8 / 1073741824.0, freeB / 1073741824.0, totalB / 1073741824.0, rounds, passes, words, totalBad,
         totalBad ? "\"see mismatchedWords\"" : "null", s);
  return totalBad ? 1 : 0;
}
