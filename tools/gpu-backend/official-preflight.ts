// gpu-backend: the LIVE official preflight as a command (standard 3.0.0 §9.3) — opens the official gate exactly as an
// official optimization does (purpose, acceptance, server/build/device, reachable-domain capabilities, smoke kernel,
// memory, parity mini-set against the canonical CPU engine on the given door), prints every check, writes the
// attestation and closes. It evaluates no search candidate. Exit 0: the gate opened; 3: refused (the reason printed).
//   GPU_POLICY_PURPOSE=official-optimization node --experimental-transform-types tools/gpu-backend/official-preflight.ts \
//     --study research/<study> --door D24 [--domain pilot|assignment3] [--batch 8192] [--run preflight]
// Doors: D19, D21, D23, D24 (Priority 3's prefix doors) or FULL (Priority 3's FULL guard). The door opening is logged in
// research/gpu-phase2/results/doors.jsonl (the acceptance study's door log).
import path from 'node:path';
import { openOfficialGpuSession } from '../../src/gpu-backend/official.ts';
import { PolicyError } from '../../src/gpu-backend/purpose.ts';
import { assignment3Domain, riskEnvelopePilotDomain } from '../../src/gpu-backend/domain.ts';
import { incumbents } from '../../src/vg-l0-full-joint/nl0.ts';
import { type DoorKey, cacheDir, openDoor } from '../../src/gpu-phase2/context.ts';
import { repoRoot } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const study = opt('study', '');

if (!study) {
  console.error('usage: GPU_POLICY_PURPOSE=official-optimization official-preflight.ts --study research/<study> --door D24 [--domain pilot|assignment3] [--batch 8192]');
  process.exit(2);
}
const grid = incumbents().NL0.quad.d1.VGT;
const domain = opt('domain', 'pilot') === 'assignment3' ? assignment3Domain(grid) : riskEnvelopePilotDomain(grid);
const door = await openDoor(opt('door', 'D24') as DoorKey, `official preflight for ${study}`);

try {
  const s = await openOfficialGpuSession({ study, runId: opt('run', 'preflight'), purpose: process.env.GPU_POLICY_PURPOSE, door, domain, plannedBatch: Number(opt('batch', '8192')), cacheDir });

  for (const c of s.attestation.checks) console.log(`ok   ${c.name}: ${c.detail}`);
  console.log(`GATE OPEN — attestation ${path.relative(repoRoot, s.attestationFile)}`);
  await s.server.close();
} catch (e) {
  if (e instanceof PolicyError) {
    console.error(`REFUSED — ${e.message}`);
    process.exit(3);
  }
  throw e;
}
