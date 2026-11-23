// Priority 4's official jobs (PROTOCOL.md §11): each OFFICIAL evaluating stage is a GPU job of its own —
// src/gpu-jobs/jobs.ts openJob → src/gpu-backend/official.ts openOfficialGpuSession (the gate: purpose, the acceptance
// record, the server and device, the capability coverage of this study's reachable domain `stagedStopDomain`, the smoke
// kernel, the VRAM plan, the parity mini-set on the study door; an attestation) → the attested GpuPool → EvalLab (an
// archive bound to the study, job, door, door pin, code digest and backend). There is no CPU path. Stage B's job wrapper
// and barrier loop (src/vg-l0-risk-envelope-stage-b/stages.ts withOfficialJob, runLanes), with this study's lane, arms,
// doors and domain.
import { openOfficialGpuSession } from '../gpu-backend/official.ts';
import { GpuPool } from '../gpu-backend/pool.ts';
import { EvalLab, StopRequested } from '../gpu-backend/lab.ts';
import { compatManifest } from '../gpu-backend/compat.ts';
import { stagedStopDomain } from '../gpu-backend/domain.ts';
import type { StudyDoor } from '../gpu-backend/doors.ts';
import { type JobContext, JobError, labOptionsOf, openJob, poolFilesOf } from '../gpu-jobs/jobs.ts';
import { doorSpecs } from '../vg-d1-growth-joint/context.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { incumbents } from '../vg-l0-full-joint/nl0.ts';
import { cellOf } from '../vg-l0-full-joint/space.ts';
import type { Budget, LaneResult, LaneSpec } from './search.ts';
import { Lane } from './search.ts';
import { type Arm, type ArmKey, type CutoffKey, STUDY_ID, execution } from './context.ts';
import { type DoorUse, openP4Door } from './doors.ts';
import { codeDigest, rel } from './records.ts';

export type { LaneResult, LaneSpec };

// ----- the lanes (seed key = lane key in Assignment 3's namespace; the arm never enters it) -----

export const broadSpecOf = (cut: CutoffKey | string, cell: string, r: number): LaneSpec => {
  const key = `${cut}/broad/${cell}/R${r}`;

  return {
    key,
    seedKey: key,
    position: key,
    stage: 'broad',
    replicate: r,
    cutoff: cut,
    kind: 'indep',
    res: 'coarse',
    cell: cellOf(cell)
  };
};

// ----- one official job: the gate, the attested pool, the Lab -----

export interface JobRun<T> {
  job: string;
  resume: boolean;
  identity: Record<string, unknown>;
  door: StudyDoor;
  use: DoorUse;
  doorPurpose: string;
  maxFresh: number;
  body: (lab: EvalLab, ctx: { job: JobContext; door: Door; attestation: string; backend: string }) => Promise<T>;
}

export const withOfficialJob = async <T>(o: JobRun<T>): Promise<T> => {
  let job: JobContext;

  try {
    job = openJob({
      study: STUDY_ID,
      job: o.job,
      resume: o.resume,
      identity: o.identity,
      purpose: 'official-optimization'
    });
  } catch (e) {
    if (e instanceof JobError) console.error(`JOB-REFUSED ${e.code} ${e.message}`);
    throw e;
  }

  let lab: EvalLab | null = null;

  try {
    const door = await openP4Door(o.door, o.use, o.doorPurpose);
    const domain = stagedStopDomain(incumbents().NL0.quad.d1.VGT);
    const session = await openOfficialGpuSession({
      study: STUDY_ID,
      job,
      purpose: 'official-optimization',
      door,
      domain,
      plannedBatch: execution.batchSize,
      hostWorkers: execution.hostWorkers
    });
    const pool = new GpuPool({
      door,
      session,
      ...poolFilesOf(job),
      batchSize: execution.batchSize,
      lingerMs: execution.lingerMs,
      domainFeatures: domain.features,
      log: (s) => job.log(s)
    });
    const backend = `gpu:${session.info.uuid}:${session.attestation.binary.sha256.slice(0, 16)}:${compatManifest().digest.slice(0, 16)}`;
    const pins = (doorSpecs as Record<string, { pins: Record<string, { sha256: string }> }>)[o.door];
    const doorPin =
      o.door === 'FULL'
        ? `GDX:${door.sym.GDX.dataSha256},VGT:${door.sym.VGT.dataSha256}`
        : `GDX:${pins!.pins.GDX!.sha256},VGT:${pins!.pins.VGT!.sha256}`;

    lab = new EvalLab({
      ...labOptionsOf(job),
      door: o.door,
      doorPin,
      purpose: 'official-optimization',
      pool,
      backend,
      codeDigest: codeDigest(),
      maxFresh: o.maxFresh,
      log: (s) => job.log(s)
    });
    await lab.open();

    const attestation = rel(session.attestationFile);
    const out = await o.body(lab, { job, door, attestation, backend });

    await lab.close('job-end');
    lab = null;
    job.complete({ stage: o.identity.stage as string });
    job.release('complete');
    return out;
  } catch (error) {
    const why = (error as Error).message.split('\n')[0]!.slice(0, 200);

    await lab?.close(error instanceof StopRequested ? `stopped: ${why}` : `failed: ${why}`).catch(() => undefined);
    job.release(`${error instanceof StopRequested ? 'stopped' : 'failed'}: ${why}`);
    throw error;
  }
};

// ----- the lanes of one job: each lane with its own arm, Assignment 3's / Stage B's barrier loop unchanged in its rules
// (extension decisions at barriers, lane-local triggers, the per-job resource guard with NL0's finishing reserve) -----

export interface RoundRow {
  round: number;
  positions: { position: string; arm: ArmKey; fired: boolean; extended: boolean; atCap: boolean }[];
  requestedBefore: number;
  worstCase: number;
  decision: string;
}

export const runLanes = async (
  lab: EvalLab,
  plan: readonly { spec: LaneSpec; arm: Arm }[],
  budget: Budget,
  laneBound: number,
  cap: number,
  reserve: number,
  stageName: string
) => {
  const lanes = plan.map((p) => ({ arm: p.arm, lane: new Lane(lab, p.spec, budget, p.arm, laneBound) }));
  const id = (x: (typeof lanes)[number]) => `${x.arm.key} ${x.lane.spec.position}`;
  const requested = () => lanes.reduce((a, l) => a + l.lane.requested, 0);
  const rounds: RoundRow[] = [];

  lab.stage = `${stageName}: base (${lanes.length} lanes)`;
  await Promise.all(lanes.map((l) => l.lane.base()));

  const stops = new Map<string, string>();

  for (let round = 1; ; round++) {
    const live = lanes.filter((l) => !stops.has(id(l)));

    if (!live.length) break;

    const row: RoundRow = { round, positions: [], requestedBefore: requested(), worstCase: 0, decision: '' };
    const go: typeof lanes = [];

    for (const l of live) {
      const fired = l.lane.lastTrigger?.fired ?? false;
      const atCap = l.lane.atCap;

      row.positions.push({ position: l.lane.spec.position, arm: l.arm.key, fired, extended: fired && !atCap, atCap });
      if (!fired) stops.set(id(l), 'triggers not met');
      else if (atCap) stops.set(id(l), 'extension cap reached (a trigger still fired: budget-bound, not converged)');
      else go.push(l);
    }
    row.worstCase = go.reduce((a, l) => a + l.lane.islandWorstCase, 0);
    if (go.length && requested() + row.worstCase + reserve * lanes.length > cap) {
      for (const l of go) stops.set(id(l), 'resource guard (the job cap on fresh simulations)');
      row.decision = `resource guard: ${requested()} requested + worst case ${row.worstCase} + finishing reserve ${reserve * lanes.length} > cap ${cap}`;
      rounds.push(row);
      break;
    }
    row.decision = go.length ? `extend ${go.length} lane(s)` : 'no lane extends';
    rounds.push(row);
    if (!go.length) break;
    lab.stage = `${stageName}: extension round ${round} (${go.length} lanes)`;
    lab.checkpoint({ [`extension ${stageName}`]: { round, extending: go.map(id) } });
    await Promise.all(go.map((l) => l.lane.extend()));
  }

  lab.stage = `${stageName}: finishing`;

  const results = await Promise.all(
    lanes.map(async (l) => ({ arm: l.arm.key, result: await l.lane.finish(stops.get(id(l)) ?? 'triggers not met') }))
  );

  return { results, rounds };
};
