// gpu-phase5 (PROTOCOL.md §4.5 item 5): a BOUNDED user-space pattern test of host memory — NO reboot, no privilege. It
// allocates <GiB> of anonymous memory (touched, so the kernel backs it with real pages), and for each pass writes a
// pattern with <threads> threads and verifies it twice: zeros, ones, alternating bits, an address-dependent hash and
// its complement. It reports mismatching 64-bit words.
//   hostmem-test <GiB> <rounds> <threads>     prints one JSON line; exit 0 = no mismatch
// What it cannot show: it tests only the pages the kernel hands this process (not the page cache, kernel memory or
// the pages other processes hold), without ECC reporting, for minutes; a boot-time tester (memtest86+) covers all
// physical memory and needs a reboot, which this study is not authorized to do.
#define _GNU_SOURCE
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <time.h>

static inline uint64_t mix(uint64_t x) { x ^= x >> 33; x *= 0xff51afd7ed558ccdull; x ^= x >> 33; x *= 0xc4ceb9fe1a85ec53ull; x ^= x >> 33; return x; }
static inline uint64_t pat(int kind, uint64_t i, uint64_t seed) {
  switch (kind) { case 0: return 0ull; case 1: return ~0ull; case 2: return 0xaaaaaaaaaaaaaaaaull; case 3: return 0x5555555555555555ull;
                  case 4: return mix(i + seed); default: return ~mix(i + seed); }
}
typedef struct { uint64_t* p; uint64_t from, to; int kind, write; uint64_t seed; uint64_t bad; } Job;
static void* run(void* a) {
  Job* j = (Job*)a;
  if (j->write) for (uint64_t i = j->from; i < j->to; i++) j->p[i] = pat(j->kind, i, j->seed);
  else for (uint64_t i = j->from; i < j->to; i++) if (j->p[i] != pat(j->kind, i, j->seed)) j->bad++;
  return NULL;
}
int main(int argc, char** argv) {
  const double gib = argc > 1 ? atof(argv[1]) : 8.0;
  const int rounds = argc > 2 ? atoi(argv[2]) : 1;
  const int T = argc > 3 ? atoi(argv[3]) : 8;
  const uint64_t n = (uint64_t)(gib * 1073741824.0) / 8;
  uint64_t* p = mmap(NULL, n * 8, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
  if (p == MAP_FAILED) { printf("{\"error\":\"mmap failed\"}\n"); return 2; }
  struct timespec t0, t1; clock_gettime(CLOCK_MONOTONIC, &t0);
  uint64_t bad = 0, words = 0; int passes = 0;
  pthread_t th[64]; Job jobs[64];
  for (int r = 0; r < rounds; r++)
    for (int kind = 0; kind < 6; kind++)
      for (int phase = 0; phase < 3; phase++) {  // write, verify, verify
        for (int t = 0; t < T; t++) {
          jobs[t] = (Job){p, n * t / T, n * (t + 1) / T, kind, phase == 0, 0x9e3779b97f4a7c15ull * (uint64_t)(r + 1), 0};
          pthread_create(&th[t], NULL, run, &jobs[t]);
        }
        for (int t = 0; t < T; t++) { pthread_join(th[t], NULL); bad += jobs[t].bad; }
        if (phase) { words += n; passes++; }
      }
  clock_gettime(CLOCK_MONOTONIC, &t1);
  munmap(p, n * 8);
  printf("{\"testedGiB\":%.2f,\"rounds\":%d,\"patterns\":6,\"threads\":%d,\"verifyPasses\":%d,\"wordsVerified\":%llu,\"mismatchedWords\":%llu,\"seconds\":%.1f}\n",
         n * 8 / 1073741824.0, rounds, T, passes, (unsigned long long)words, (unsigned long long)bad, (t1.tv_sec - t0.tv_sec) + (t1.tv_nsec - t0.tv_nsec) / 1e9);
  return bad ? 1 : 0;
}
