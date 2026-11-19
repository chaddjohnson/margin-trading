// gpu-backend: evaluates v8_log / v8_exp (src/gpu-backend/cuda/v8math.cuh) on the GPU and on the host for every double
// of an input file; tools/gpu-backend/check-v8math.ts compares them bit for bit with Node's Math.log / Math.exp.
//   v8math-check <in.f64> <out.f64>   (out: n × [gpuLog, gpuExp, hostLog, hostExp])
#include <cstdio>
#include <cstdlib>
#include <vector>
#include "../../src/gpu-backend/cuda/v8math.cuh"
__global__ void k(const double* in, double* out, size_t n) {
  size_t i = (size_t)blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) { out[4 * i] = v8_log(in[i]); out[4 * i + 1] = v8_exp(in[i]); }
}
int main(int argc, char** argv) {
  if (argc != 3) return 2;
  FILE* f = fopen(argv[1], "rb"); fseek(f, 0, SEEK_END); size_t n = ftell(f) / 8; fseek(f, 0, SEEK_SET);
  std::vector<double> in(n), out(4 * n);
  if (fread(in.data(), 8, n, f) != n) return 3; fclose(f);
  double *din, *dout; cudaMalloc(&din, n * 8); cudaMalloc(&dout, n * 32);
  cudaMemcpy(din, in.data(), n * 8, cudaMemcpyHostToDevice);
  k<<<(unsigned)((n + 255) / 256), 256>>>(din, dout, n);
  if (cudaDeviceSynchronize() != cudaSuccess) return 4;
  cudaMemcpy(out.data(), dout, n * 32, cudaMemcpyDeviceToHost);
  for (size_t i = 0; i < n; i++) { out[4 * i + 2] = v8_log(in[i]); out[4 * i + 3] = v8_exp(in[i]); }
  FILE* g = fopen(argv[2], "wb"); fwrite(out.data(), 8, 4 * n, g); fclose(g);
  printf("%zu\n", n);
  return 0;
}
