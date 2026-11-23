// gpu-phase8 (copy of tools/gpu-phase5/tamper-probe.ts; the gate now opens with a held job, src/gpu-jobs/jobs.ts) tamper suite (PROTOCOL.md §6 gate E4): ONE enforcement mechanism of the tree it runs in (a sandbox clone), in a
// fresh process so a tampered module is what gets imported. Modes:
//   static   checkAcceptance({ binary }) of the sandbox's record
//   gate     openOfficialGpuSession on a synthetic door (purpose official-optimization)
//   runner   the official runner wrapper starting a module that imports the gate (the sandbox's fixture study)
// Prints one JSON line. Never run in the main checkout (tools/gpu-phase8/tamper.ts creates and removes the sandbox).
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const mode = process.argv[2];
const root = process.cwd();
const binary = process.env.GPU_BACKEND_BINARY!;

if (mode === 'static') {
  const { checkAcceptance } = await import(path.join(root, 'src/gpu-backend/acceptance.ts'));
  const c = checkAcceptance({ binary });

  console.log(JSON.stringify({ mode, status: c.status, reasons: c.reasons }));
} else if (mode === 'gate') {
  const { openOfficialGpuSession } = await import(path.join(root, 'src/gpu-backend/official.ts'));
  const { assignment3Domain } = await import(path.join(root, 'src/gpu-backend/domain.ts'));
  const { incumbents } = await import(path.join(root, 'src/vg-l0-full-joint/nl0.ts'));
  const { fixtureDoor } = await import(path.join(root, 'src/gpu-phase5/fixtures.ts'));
  const jobs = await import(path.join(root, 'src/gpu-jobs/jobs.ts')).catch(() => null);

  try {
    // an official run owns a job (a tampered tree without the job module opens the gate the old way)
    const job = jobs
      ? jobs.openJob({ study: 'research/zz-tamper', label: 'tamper', identity: { probe: 'gate' }, purpose: 'official-optimization' })
      : null;
    const s = await openOfficialGpuSession({
      study: 'research/zz-tamper',
      ...(job ? { job } : { runId: 'tamper', cacheDir: path.join(root, '.cache', 'tamper') }),
      purpose: 'official-optimization',
      door: fixtureDoor(5, 300),
      domain: assignment3Domain(incumbents().NL0.quad.d1.VGT),
      plannedBatch: 256,
      binary,
      parityMiniSet: 2,
      hostWorkers: 2
    });

    await s.pipeline?.close();
    await s.server.close();
    console.log(
      JSON.stringify({ mode, outcome: 'opened', checks: s.attestation.checks.map((c: { name: string }) => c.name) })
    );
  } catch (e) {
    console.log(JSON.stringify({ mode, outcome: 'refused', message: (e as Error).message.slice(0, 400) }));
  }
} else if (mode === 'runner') {
  const r = spawnSync(
    process.execPath,
    [
      '--no-maglev',
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      'src/gpu-backend/officialRunner.ts',
      'research/zz-tamper',
      'research/zz-tamper/run.ts'
    ],
    {
      cwd: root,
      env: { ...process.env, GPU_POLICY_PURPOSE: 'official-optimization' },
      encoding: 'utf8',
      timeout: 120000
    }
  );

  console.log(
    JSON.stringify({
      mode,
      outcome: r.status === 0 && /RAN/.test(r.stdout) ? 'ran' : 'refused',
      status: r.status,
      message: (r.stderr || r.stdout).trim().slice(0, 400)
    })
  );
} else {
  console.error('usage: tamper-probe.ts static|gate|runner');
  process.exit(2);
}
