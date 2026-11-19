#include <cstdio>
__global__ void k(int* p, int n, int bad) { int i = blockIdx.x * blockDim.x + threadIdx.x; if (i < n + bad) p[i] = i; }
int main(int argc, char**) { int* p; cudaMalloc(&p, 256 * sizeof(int)); k<<<1, 288>>>(p, 256, argc > 1 ? 32 : 0); cudaError_t e = cudaDeviceSynchronize(); printf("sync: %s\n", cudaGetErrorString(e)); cudaFree(p); return 0; }
