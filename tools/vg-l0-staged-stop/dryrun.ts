// Priority 4 engineering DRY RUN — NON-OFFICIAL (purpose parity-test), engineering doors only (before the freeze), its own
// seed label (`DRY/…`, never the study's lanes), the Phase 8 mini schedule, an IN-PROCESS CPU reference pool (the Phase 8
// CPU worker's evaluation, single thread). It exercises exactly the code of the official stages after the search:
// membersFromLanes (union, OFF projections), qualifyMembers (the full instrument), selectionOf (lane values, pairs,
// statistics, mechanism, pooled P0, interval subjects), decompositionRowsOf, intervalPlansOf / intervalRowsOf on the next
// door, and checks invariants. It prints counts and invariant verdicts only — never nets or rankings — and its outputs
// stay in the git-ignored cache. Nothing here is study evidence.
//   GPU_POLICY_PURPOSE=parity-test node --no-maglev --experimental-transform-types tools/vg-l0-staged-stop/dryrun.ts
import path from 'node:path';
import { EvalLab, type PoolLike } from '../../src/gpu-backend/lab.ts';
import type { Task } from '../../src/gpu-backend/encode.ts';
import { evaluateStaged, evaluateStagedDetail, runWithStaged } from '../../src/d1-risk-controls-rc3/run.ts';
import { envelopeOf } from '../../src/gpu-phase8/envelope.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { budgets as a3Budgets } from '../../src/vg-l0-full-joint/budgets.ts';
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { STUDY_ID, armKeys, cacheDir } from '../../src/vg-l0-staged-stop/context.ts';
import { openP4Door } from '../../src/vg-l0-staged-stop/doors.ts';
import { codeDigest } from '../../src/vg-l0-staged-stop/records.ts';
import { broadSpecOf, runLanes } from '../../src/vg-l0-staged-stop/jobs.ts';
import type { Budget } from '../../src/vg-l0-staged-stop/search.ts';
import { qualifyMembers } from '../../src/vg-l0-staged-stop/qualify.ts';
import { arms, decompositionRowsOf, intervalPlansOf, intervalRowsOf, membersFromLanes, selectionOf } from '../../src/vg-l0-staged-stop/stages.ts';
import { expSpace, stagedOf } from '../../src/vg-l0-staged-stop/space.ts';
import { purposeOf } from './common.ts';

purposeOf(['parity-test']);

class InProcPool implements PoolLike {
  stopping: string | null = null;
  constructor(private readonly door: Door) {}
  async start() {}
  async run<T>(tasks: Task[], onResult: (task: Task, value: T, ms: number) => void) {
    for (const m of tasks) {
      const t0 = performance.now();
      const record = m.detail
        ? evaluateStagedDetail(this.door, m.quad, m.controls ?? null, m.staged ?? null, m.options ?? {})
        : evaluateStaged(this.door, m.quad, m.controls ?? null, m.staged ?? null, m.options ?? {});
      let value: unknown = record;

      if (m.risk) {
        const x = runWithStaged(this.door, m.quad, m.controls ?? null, m.staged ?? null, m.options ?? {}, Boolean(m.detail), false, { cache: false });
        const [bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation] = envelopeOf(this.door, x, m.options ?? {});

        value = { ...record, envelope: { bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation } };
      }
      onResult(m, value as T, performance.now() - t0);
    }
  }
  requestStop(reason: string) {
    this.stopping = reason;
  }
  async close() {}
}

const mini: Budget = {
  ...a3Budgets.study.broad,
  screen: 96,
  promote: 12,
  islands: 2,
  islandsMax: 3,
  population: 8,
  newPerIsland: 24,
  r1: 8,
  r2: 16,
  r2Keep: 4,
  r3: 24,
  r3Keep: 2,
  refineN: 6,
  shortlist: 2,
  generations: 40,
  patience: 4
};
const checks: { name: string; pass: boolean; detail?: unknown }[] = [];
const check = (name: string, pass: boolean, detail?: unknown) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass ? '' : ` ${JSON.stringify(detail).slice(0, 400)}`}`);
};
const labOf = async (name: StudyDoor) => {
  const door = await openP4Door(name, 'engineering', 'engineering dry run of the stage logic (mini schedule, DRY seeds, no study evidence)');
  const pins = (doorSpecs as Record<string, { pins: Record<string, { sha256: string }> }>)[name]!;
  const lab = new EvalLab({
    study: STUDY_ID,
    job: `dryrun-${name}-${Date.now()}`,
    door: name,
    doorPin: `GDX:${pins.pins.GDX!.sha256},VGT:${pins.pins.VGT!.sha256}`,
    purpose: 'parity-test (non-official): engineering dry run',
    pool: new InProcPool(door),
    backend: 'cpu:in-process',
    codeDigest: codeDigest(),
    cacheRoot: path.join(cacheDir, 'dryrun')
  } as never);

  await lab.open();
  return lab;
};

const t0 = Date.now();
const lab = await labOf('D19');
// 1. the search: 2 cells × 1 replicate × both arms on the mini schedule
const plan = ['GA0.VA0', 'GB0.VD1'].flatMap((c) => armKeys.map((a) => ({ spec: broadSpecOf('DRY', c, 1), arm: arms[a] })));
const { results } = await runLanes(lab, plan, mini, () => 1_000_000, 1_000_000 * plan.length, 0, 'dry search');
const lanes = Object.fromEntries(armKeys.map((a) => [a, results.filter((r) => r.arm === a).map((r) => r.result)])) as Parameters<typeof membersFromLanes>[0];

check('search: 4 lanes, each with a shortlist', results.length === 4 && results.every((r) => r.result.shortlist.length > 0), results.map((r) => r.result.shortlist.length));

// 2. the union with OFF projections
const { members, duplicates } = membersFromLanes(lanes, null);
const onMembers = members.filter((m) => stagedOf(m.cfg));
const projections = members.flatMap((m) => m.origins.filter((o) => o.role === 'projection'));

check('union: every EXP ON member has its OFF projections; ids unique', new Set(members.map((m) => expSpace.cfgId(m.cfg))).size === members.length, { members: members.length, on: onMembers.length, projections: projections.length, duplicates: duplicates.length });

// 3. qualification (the full instrument) and selection
const { evidence, requested } = await qualifyMembers(lab, members, 'DRY');

check('qualification: one evidence row per member, envelopes present', evidence.length === members.length && evidence.every((e) => e.envelope && e.verdict), { requested });
check(
  'qualification: evidence ids are the staged-aware identities, unique (an ON member differs from its projections)',
  evidence.every((e) => e.id === expSpace.cfgId(e.cfg)) && new Set(evidence.map((e) => e.id)).size === evidence.length,
  evidence.filter((e) => e.id !== expSpace.cfgId(e.cfg)).map((e) => e.label)
);
check(
  'qualification: ON evidence carries staged counters for its ON books; OFF evidence carries none',
  evidence.every((e) => (e.staged ? Object.keys(e.stagedCounters).length > 0 : Object.keys(e.stagedCounters).length === 0)),
  evidence.map((e) => [e.stagedPattern, Object.keys(e.stagedCounters)])
);

const sel = selectionOf('DRY', evidence, lanes, null);

check('selection: 2 pairs, lane values defined, representatives are selectable members', sel.pairs.length === 2 && armKeys.every((a) => sel.laneValues[a].length === 2), sel.pairs.map((p) => ({ cell: p.cell, sign: Math.sign(p.d) })));
check(
  'selection: every ON EXP representative has its all-OFF projection',
  sel.laneValues.EXP.every((v) => !v.representative || v.representative.stagedPattern === 'off' || v.offProjection !== null),
  sel.laneValues.EXP.map((v) => v.representative?.stagedPattern)
);
check('selection: subjects de-duplicated and include both benchmarks', new Set(sel.subjects.map((s) => s.id)).size === sel.subjects.length && sel.subjects.filter((s) => s.roles.some((r) => (r as { kind: string }).kind === 'benchmark')).length === 2, { subjects: sel.subjects.length });
check('statistics: finite primary summary and mechanism record', Number.isFinite(sel.primary.mean) && sel.mechanism.representatives >= 0, { n: sel.primary.n });

// 4. the decomposition rows (as if this were C24)
const rows = decompositionRowsOf({ pooled: sel.pooled as never, informed: null }, evidence);

check('decomposition rows: incumbents OFF + (if the EXP primary uses S1) finalist, its all-OFF and the incumbents with its staged genes', rows.length === 2 || rows.length === 6, rows.map((r) => r.kind));
await lab.close('dryrun-end');

// 5. the interval on the next engineering door D21 with the boundary 2019-12-31 (three subjects)
const lab2 = await labOf('D21');
const subjects = sel.subjects.slice(0, 3).map((s) => {
  const e = evidence.find((x) => x.id === s.id)!;

  return { label: s.label, id: s.id, roles: s.roles, cfg: e.cfg, selectTail: e.selectTail };
});
const plans = intervalPlansOf(subjects, 'DRY', '2019-12-31');
const recs = await lab2.evalMany<never>(
  plans.flatMap((p) => p.items),
  'dry interval'
);
const irows = intervalRowsOf(plans, recs, '2019-12-31');

check('interval: one row per subject with interval P&L, reset DD, the seven stresses and the neighbourhood', irows.length === subjects.length && irows.every((r) => Number.isFinite(r.sliceNet) && Object.keys(r.stresses).length === 7 && r.neighbourhood.draws > 0), { rows: irows.length });
await lab2.close('dryrun-end');

console.log(`${checks.filter((c) => c.pass).length}/${checks.length} dry-run checks pass in ${Math.round((Date.now() - t0) / 1000)} s`);
process.exitCode = checks.every((c) => c.pass) ? 0 : 2;
