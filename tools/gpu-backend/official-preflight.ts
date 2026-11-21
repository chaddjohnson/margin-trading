// gpu-backend: the LIVE official preflight as a command (standard 3.0.0 §9.3) — opens the official gate exactly as an
// official optimization does (purpose, acceptance, server/build/device, reachable-domain capabilities, smoke kernel,
// memory, the host path, parity mini-set against the canonical CPU engine on the given door through that host path),
// prints every check, writes the attestation and closes. It evaluates no search candidate. Exit 0: the gate opened; 3:
// refused (the reason printed).
//   GPU_POLICY_PURPOSE=official-optimization node --experimental-transform-types tools/gpu-backend/official-preflight.ts \
//     --study research/<study> --door D24 [--domain pilot|assignment3] [--batch 8192] [--host-workers N] [--run preflight]
// Doors: D19, D21, D23, D24 (Priority 3's prefix doors) or FULL (Priority 3's FULL guard). The door opening is logged in
// the preflighted study's own research/<study>/results/doors.jsonl (src/gpu-backend/doors.ts).
// Each preflight is its own job (src/gpu-jobs/jobs.ts; GPU Phase 6): a freshly allocated name `preflight-<UTC>-<random>`
// in the study's job namespace (or --run <name>), with the explicitly SHARED dataset cache .cache/gpu-backend/datasets
// (the atomic write-once export makes sharing it safe; a preflight evaluates no search candidate).
import path from 'node:path';
import { openOfficialGpuSession } from '../../src/gpu-backend/official.ts';
import { PolicyError } from '../../src/gpu-backend/purpose.ts';
import { assignment3Domain, riskEnvelopePilotDomain } from '../../src/gpu-backend/domain.ts';
import { incumbents } from '../../src/vg-l0-full-joint/nl0.ts';
import { type StudyDoor, openStudyDoor } from '../../src/gpu-backend/doors.ts';
import { repoRoot } from '../../src/gpu-backend/toolchain.ts';
import { JobError, openJob } from '../../src/gpu-jobs/jobs.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const study = opt('study', '');

if (!study) {
  console.error(
    'usage: GPU_POLICY_PURPOSE=official-optimization official-preflight.ts --study research/<study> --door D24 [--domain pilot|assignment3] [--batch 8192]'
  );
  process.exit(2);
}
const grid = incumbents().NL0.quad.d1.VGT;
const domain = opt('domain', 'pilot') === 'assignment3' ? assignment3Domain(grid) : riskEnvelopePilotDomain(grid);
const door = await openStudyDoor(study, opt('door', 'D24') as StudyDoor, `official preflight for ${study}`);

let job: ReturnType<typeof openJob> | null = null;

try {
  job = openJob({
    study,
    ...(args.includes('--run') ? { job: opt('run', '') } : { label: 'preflight' }),
    identity: { kind: 'official preflight', door: opt('door', 'D24'), domain: opt('domain', 'pilot'), batch: Number(opt('batch', '8192')) },
    purpose: process.env.GPU_POLICY_PURPOSE ?? 'none',
    datasetCache: { shared: path.join(repoRoot, '.cache', 'gpu-backend', 'datasets') }
  });

  const s = await openOfficialGpuSession({
    study,
    job,
    purpose: process.env.GPU_POLICY_PURPOSE,
    door,
    domain,
    plannedBatch: Number(opt('batch', '8192')),
    ...(args.includes('--host-workers') ? { hostWorkers: Number(opt('host-workers', '8')) } : {})
  });

  for (const c of s.attestation.checks) console.log(`ok   ${c.name}: ${c.detail}`);
  console.log(`GATE OPEN — job ${job.id}, attestation ${path.relative(repoRoot, s.attestationFile)}`);
  await s.pipeline?.close();
  await s.server.close();
  job.complete({ attestation: path.relative(repoRoot, s.attestationFile) });
  job.release('gate open');
} catch (e) {
  job?.release(`refused: ${(e as Error).message.slice(0, 200)}`);
  if (e instanceof PolicyError || e instanceof JobError) {
    console.error(`REFUSED — ${e.message}`);
    process.exit(3);
  }
  throw e;
}
