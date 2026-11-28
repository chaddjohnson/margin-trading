// Shared plumbing of Stage B's NON-OFFICIAL tools (engineering gate E3, report-only diagnostics): a declared non-official
// purpose, the study's guarded doors, an EvalLab over a non-official GPU pool (the accepted binary, no official gate —
// parity tests only) or the CPU reference pool. Nothing here is official optimization evidence.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { EvalLab } from '../../src/gpu-backend/lab.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { type DoorUse, openStageBDoor } from '../../src/vg-l0-risk-envelope-stage-b/doors.ts';
import { codeDigest } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import { STUDY_ID, cacheDir, execution } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { CpuPool } from './cpuPool.ts';

export const purposeOf = (allowed: string[]) => {
  const p = process.env.GPU_POLICY_PURPOSE ?? '';

  if (!allowed.includes(p)) throw new Error(`declare a non-official purpose (GPU_POLICY_PURPOSE=${allowed.join('|')}), got "${p}"`);
  return p;
};

export const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? `0x${v.toString(16)}` : typeof v === 'number' && !Number.isFinite(v) ? (Number.isNaN(v) ? '__NaN' : v > 0 ? '__Inf' : '__-Inf') : v), 1)}\n`
  );
};

export interface ToolLab {
  lab: EvalLab;
  backendId: string;
  close: (event?: string) => Promise<void>;
}

// an EvalLab for a non-official tool job under research/<stage-b>/cache/<area>/jobs/<name> (the Lab's own ownership lock)
export const openToolLab = async (o: {
  backend: 'gpu' | 'cpu';
  door: StudyDoor;
  use?: DoorUse;
  area: string;
  job: string;
  purpose: string;
  cpuWorkers?: number;
  stopAfterFresh?: number;
  ledger: string;
}): Promise<ToolLab & { door: Awaited<ReturnType<typeof openStageBDoor>> }> => {
  const use = o.use ?? 'engineering';
  const door = await openStageBDoor(o.door, use, `${o.purpose} (${o.job}, non-official ${o.backend})`);
  let pool: GpuPool | CpuPool;
  let backendId: string;

  if (o.backend === 'gpu') {
    const ds = exportDataset(door, path.join(cacheDir, o.area, 'datasets'));
    const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
    const info = await server.info();

    if (!(await server.smoke()).ok) throw new Error('smoke failed');
    await server.load(ds.file);
    backendId = `gpu:${info.uuid}:${createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex').slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
    fs.mkdirSync(path.dirname(o.ledger), { recursive: true });
    pool = new GpuPool({ door, session: null, server, uuid: info.uuid, ledgerFile: o.ledger, batchSize: execution.batchSize, lingerMs: execution.lingerMs, hostWorkers: execution.hostWorkers });
  } else {
    backendId = `cpu:${o.cpuWorkers ?? 12} workers`;
    pool = new CpuPool(o.cpuWorkers ?? 12, o.door, o.purpose, 4, use);
  }

  const pins = (doorSpecs as Record<string, { pins: Record<string, { sha256: string }> }>)[o.door];
  const doorPin = pins ? `GDX:${pins.pins.GDX!.sha256},VGT:${pins.pins.VGT!.sha256}` : `GDX:${door.sym.GDX.dataSha256},VGT:${door.sym.VGT.dataSha256}`;
  const lab = new EvalLab({
    study: STUDY_ID,
    job: o.job,
    door: o.door,
    doorPin,
    purpose: `${o.purpose} (non-official)`,
    pool,
    backend: backendId,
    codeDigest: codeDigest(),
    cacheRoot: path.join(cacheDir, o.area),
    stopAfterFresh: o.stopAfterFresh
  });

  await lab.open();
  return { lab, backendId, door, close: (event = 'job-end') => lab.close(event) };
};
