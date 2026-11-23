// Shared plumbing of Priority 4's NON-OFFICIAL tools (the E5 benchmark, report-only diagnostics): a declared non-official
// purpose, the study's guarded doors, an EvalLab over a non-official GPU pool (the accepted binary, no official gate) or
// the CPU reference pool (Stage B's tool pool). Nothing here is official optimization evidence.
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
import { type DoorUse, openP4Door } from '../../src/vg-l0-staged-stop/doors.ts';
import { codeDigest } from '../../src/vg-l0-staged-stop/records.ts';
import { STUDY_ID, cacheDir, execution } from '../../src/vg-l0-staged-stop/context.ts';

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

// an EvalLab over the accepted binary through a NON-OFFICIAL GPU pool, under research/<study>/cache/<area>/jobs/<name>
export const openToolLab = async (o: { door: StudyDoor; use: DoorUse; area: string; job: string; purpose: string }) => {
  const door = await openP4Door(o.door, o.use, `${o.purpose} (${o.job}, non-official gpu)`);
  const ds = exportDataset(door, path.join(cacheDir, o.area, 'datasets'));
  const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
  const info = await server.info();

  if (!(await server.smoke()).ok) throw new Error('smoke failed');
  await server.load(ds.file);

  const backendId = `gpu:${info.uuid}:${createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex').slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
  const ledger = path.join(cacheDir, o.area, 'ledgers', `${o.job}.jsonl`);

  fs.mkdirSync(path.dirname(ledger), { recursive: true });

  const pool = new GpuPool({ door, session: null, server, uuid: info.uuid, ledgerFile: ledger, batchSize: execution.batchSize, lingerMs: execution.lingerMs, hostWorkers: execution.hostWorkers });
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
    cacheRoot: path.join(cacheDir, o.area)
  });

  await lab.open();
  return { lab, backendId, door, info, close: (event = 'job-end') => lab.close(event) };
};
