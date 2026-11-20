// gpu-backend: where the user-space CUDA toolchain and the built evaluator live on Apollo (never on PATH, never
// system-wide). Overridable by environment for another host; the compatibility manifest records what was used.
import path from 'node:path';

export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const toolkitHome =
  process.env.GPU_BACKEND_CUDA_HOME ?? '/home/chad/.local/share/margin-trading-gpu/cuda-13.2-toolkit';
export const toolkitLib = path.join(toolkitHome, 'lib');
export const nvcc = path.join(toolkitHome, 'bin', 'nvcc');
export const computeSanitizer = path.join(toolkitHome, 'compute-sanitizer', 'compute-sanitizer');
// the accepted binary's path (config/gpu-backend/acceptance.json names it; rebuild it reproducibly with
// tools/gpu-backend/build.sh from the pinned sources). Each acceptance study builds its own binary in its own build
// directory (research/gpu-phase4/build/gb4 since GPU Phase 4), so an earlier accepted binary stays identifiable.
export const buildDir = process.env.GPU_BACKEND_BUILD_DIR ?? path.join(repoRoot, 'research', 'gpu-phase4', 'build');
export const serverBinary = process.env.GPU_BACKEND_BINARY ?? path.join(buildDir, 'gb4');
// the compilation flags the parity evidence was produced with (binary64, no FMA contraction, IEEE division/sqrt)
export const nvccFlags = [
  '-O3',
  '-std=c++17',
  '-arch=sm_120',
  '--fmad=false',
  '-prec-div=true',
  '-prec-sqrt=true',
  '-Xcompiler',
  '-ffp-contract=off'
];
