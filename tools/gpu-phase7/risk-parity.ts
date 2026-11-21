// gpu-phase7 (PROTOCOL.md §6 gate R1–R3): CPU/GPU parity of the RISK-ENVELOPE DELIVERY through the official delivery code —
// the same EvalLab (src/gpu-backend/lab.ts, items with `risk: true`, the `|risk` key, checkEnvelope) over the GPU pool
// (src/gpu-backend/pool.ts, the parallel host path) and over the non-official CPU pool (src/gpu-phase7/cpuEvalPool.ts:
// the canonical evaluate + the canonical envelope reference src/gpu-phase7/envelope.ts). NON-OFFICIAL (purpose
// parity-test): two jobs of research/gpu-phase7 (openJob), never official optimization evidence. Zero tolerance:
//   R1 every delivered value (record + envelope, canonical bit-pattern hash) GPU = CPU, risk and plain items alike;
//   R2 requesting the envelope never changes the record: risk value minus `envelope` = the plain record (both backends);
//      and for archive subjects the plain record = Assignment 3's ARCHIVED record (the sealed search archive, restored)
//   R3 qualification parity: src/risk-envelope/policy.ts assess() under the control (nl0-control) and the experimental
//      (re-40-25-25) policies — every check, decision and violation — GPU = CPU, and the rankings built from them
//      (qualified by centre net; constrained order by violation) are the same sequences;
// plus the threshold-edge census (how many subjects lie within ±1 % / ±5 % of each limit and how many decisions differ
// between the two policies) and the single-slot structural relations (trade PL ≤ marked DD; banked DD ≤ marked DD) as
// report-only counts.
//   GPU_POLICY_PURPOSE=parity-test node --no-maglev --expose-gc --experimental-transform-types tools/gpu-phase7/risk-parity.ts \
//     --door D24 --label edge-D24 [--edge research/gpu-phase7/results/risk-parity/edge-subjects-D24.json] [--finalists]
//     [--random 500] [--options base,cost10,cost0,rate14] [--host-workers 8] [--workers 12] --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { type Cfg, canonicalCfg, cfgId } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { openDoor, repoRoot, writeJson } from '../../src/gpu-phase7/context.ts';
import { randomSubjects } from '../../src/gpu-phase7/subjects.ts';
import { CpuEvalPool } from '../../src/gpu-phase7/cpuEvalPool.ts';
import { EvalLab, RISK_KEY_SUFFIX } from '../../src/gpu-backend/lab.ts';
import { GpuPool } from '../../src/gpu-backend/pool.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { canonHash } from '../../src/gpu-backend/canon.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { engineRuntime } from '../../src/gpu-backend/runtime.ts';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { labOptionsOf, openJob, poolFilesOf } from '../../src/gpu-jobs/jobs.ts';
import { NL0_CONTROL, RE_EXPERIMENTAL, assess, limitOf, type Assessment } from '../../src/risk-envelope/policy.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const purpose = process.env.GPU_POLICY_PURPOSE ?? '';

if (purpose !== 'parity-test')
  throw new Error('risk-parity: GPU_POLICY_PURPOSE=parity-test is required (non-official)');

const doorName = opt('door', 'D24') as keyof typeof doorSpecs;
const label = opt('label', `risk-${doorName}`);
const out = opt('out', `research/gpu-phase7/results/risk-parity/${label}.json`);
const hostWorkers = Number(opt('host-workers', '8'));
const workers = Number(opt('workers', '12'));
const t0 = Date.now();
const optionSets: Record<string, EvalOptions> = {
  base: vOptions,
  cost10: { ...vOptions, friction: { costBps: 10 } }, // NL0 Q5's stress
  cost0: { ...vOptions, friction: { costBps: 0 } }, // liquidation basis = marked basis (an equality edge)
  rate14: { ...vOptions, friction: { rate: 0.14 } }
};
const optionNames = opt('options', 'base').split(',');

for (const o of optionNames) if (!optionSets[o]) throw new Error(`unknown option set ${o}`);

// ----- subjects (engineering subjects only; nothing here is a candidate) -----
interface Subj {
  key: string;
  set: string;
  cfg: Cfg;
  archived?: { record: unknown; dd: number; net: number; id: string };
}
const subjects: Subj[] = [];

if (args.includes('--finalists')) {
  const frozen = decode<{ finalists: { label: string; id: string; cfg: Cfg }[] }>(
    fs.readFileSync(path.join(repoRoot, 'research/vg-l0-full-joint/FROZEN_SELECTION.json'), 'utf8')
  );

  for (const f of frozen.finalists) subjects.push({ key: `F:${f.label}`, set: 'F', cfg: canonicalCfg(f.cfg) });
}
if (args.includes('--edge')) {
  const e = JSON.parse(fs.readFileSync(path.join(repoRoot, opt('edge', '')), 'utf8')) as {
    door: string;
    subjects: { sel: string; id: string; archivedDd: number; archivedNet: number; archivedRecord: string; cfg: Cfg }[];
  };

  if (e.door !== doorName) throw new Error(`edge subjects of ${e.door} on door ${doorName}`);
  for (const s of e.subjects) {
    const cfg = canonicalCfg(s.cfg);

    if (cfgId(cfg) !== s.id) throw new Error(`edge subject ${s.id}: canonical id ${cfgId(cfg)} differs`);
    subjects.push({
      key: `E:${s.sel}:${s.id}`,
      set: `E-${s.sel}`,
      cfg,
      archived: { record: decode(s.archivedRecord), dd: s.archivedDd, net: s.archivedNet, id: s.id }
    });
  }
}
for (const s of randomSubjects(Number(opt('random', '0')), `riskpar-${doorName}`))
  subjects.push({ key: `A:${s.key}`, set: 'A', cfg: s.cfg! });
if (!subjects.length) throw new Error('no subjects (--finalists, --edge, --random)');

// ----- the two jobs and their Labs (the official delivery code; non-official pools) -----
const door = await openDoor(doorName, `gpu-phase7 risk-delivery parity ${label}`);
const doorPin = `GDX:${doorSpecs[doorName].pins.GDX.sha256},VGT:${doorSpecs[doorName].pins.VGT.sha256}`;
const definition = {
  tool: 'tools/gpu-phase7/risk-parity.ts',
  label,
  door: doorName,
  options: optionNames,
  n: subjects.length
};
const jobs = {
  gpu: openJob({
    study: 'research/gpu-phase7',
    job: `riskpar-${label}-gpu`,
    identity: { ...definition, backend: 'gpu' },
    purpose
  }),
  cpu: openJob({
    study: 'research/gpu-phase7',
    job: `riskpar-${label}-cpu`,
    identity: { ...definition, backend: 'cpu' },
    purpose
  })
};
const ds = exportDataset(door, jobs.gpu.dirs.dataset);
const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });
const info = await server.info();

if (!(await server.smoke()).ok) throw new Error('smoke failed');
await server.load(ds.file);

const binarySha256 = createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex');
const digest = compatManifest().digest;
const gpuPool = new GpuPool({
  door,
  session: null,
  server,
  uuid: info.uuid,
  ...poolFilesOf(jobs.gpu),
  batchSize: 8192,
  lingerMs: 30,
  hostWorkers
});
const cpuPool = new CpuEvalPool(workers, { kind: 'market', name: doorName });
const labOf = (j: typeof jobs.gpu, pool: GpuPool | CpuEvalPool, backend: string) =>
  new EvalLab({
    ...labOptionsOf(j),
    door: doorName,
    doorPin,
    purpose: `${purpose}: risk-delivery parity`,
    pool,
    backend,
    codeDigest: digest
  });
const labs = {
  gpu: labOf(jobs.gpu, gpuPool, `gpu:${info.uuid}:${binarySha256.slice(0, 16)}:${digest.slice(0, 16)}`),
  cpu: labOf(jobs.cpu, cpuPool, `cpu:${workers} workers`)
};
const items = subjects.flatMap((s) =>
  optionNames.flatMap((o) => [
    { s, o, risk: true, item: { cfg: s.cfg, options: optionSets[o]!, risk: true } },
    { s, o, risk: false, item: { cfg: s.cfg, options: optionSets[o]! } }
  ])
);
const values: Record<'gpu' | 'cpu', unknown[]> = { gpu: [], cpu: [] };
const timing: Record<string, number> = {};

for (const b of ['gpu', 'cpu'] as const) {
  const tb = Date.now();

  await labs[b].open();
  values[b] = await labs[b].evalMany(items.map((x) => x.item) as never, `risk-parity ${b}`);
  await labs[b].close();
  timing[`${b}Seconds`] = Math.round((Date.now() - tb) / 100) / 10;
  jobs[b].complete({ items: items.length });
  jobs[b].release('complete');
}

// ----- comparisons -----
const strip = (v: unknown) =>
  Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k]) => k !== 'envelope'));
const policies = [NL0_CONTROL, RE_EXPERIMENTAL];
const r1: string[] = [];
const r2: string[] = [];
const r2archive: { compared: number; differing: string[] } = { compared: 0, differing: [] };
const r3: string[] = [];
const assessments: Record<'gpu' | 'cpu', Record<string, Record<string, Assessment>>> = { gpu: {}, cpu: {} };
const rowsByKey = new Map<
  string,
  { gpuRisk: unknown; cpuRisk: unknown; gpuPlain: unknown; cpuPlain: unknown; s: Subj; o: string }
>();

items.forEach((x, i) => {
  const g = values.gpu[i];
  const c = values.cpu[i];
  const id = `${x.s.key}|${x.o}${x.risk ? RISK_KEY_SUFFIX : ''}`;

  if (canonHash(g) !== canonHash(c)) r1.push(id);

  const k = `${x.s.key}|${x.o}`;
  const row = rowsByKey.get(k) ?? { gpuRisk: null, cpuRisk: null, gpuPlain: null, cpuPlain: null, s: x.s, o: x.o };

  if (x.risk) [row.gpuRisk, row.cpuRisk] = [g, c];
  else [row.gpuPlain, row.cpuPlain] = [g, c];
  rowsByKey.set(k, row);
});
for (const [k, row] of rowsByKey) {
  if (canonHash(strip(row.gpuRisk)) !== canonHash(row.gpuPlain)) r2.push(`gpu ${k}`);
  if (canonHash(strip(row.cpuRisk)) !== canonHash(row.cpuPlain)) r2.push(`cpu ${k}`);
  if (row.s.archived && row.o === 'base') {
    r2archive.compared++;
    if (canonHash(row.gpuPlain) !== canonHash(row.s.archived.record)) r2archive.differing.push(k);
  }
  for (const b of ['gpu', 'cpu'] as const) {
    const v = (b === 'gpu' ? row.gpuRisk : row.cpuRisk) as { dd: number; envelope: never };

    for (const p of policies) (assessments[b][p.id] ??= {})[k] = assess(v, p, undefined, `${b} ${k}`);
  }
  for (const p of policies)
    if (canonHash(assessments.gpu[p.id]![k]) !== canonHash(assessments.cpu[p.id]![k])) r3.push(`${p.id} ${k}`);
}

// rankings per option set and policy: qualified members by centre net (ties: id), and the constrained order (violation,
// then centre net, then id) — the two orders a search's promotion and final selection read
const rankings: Record<
  string,
  { qualified: number; sameQualifiedOrder: boolean; sameConstrainedOrder: boolean; top5: string[] }
> = {};

for (const o of optionNames)
  for (const p of policies) {
    const order = (b: 'gpu' | 'cpu', constrained: boolean) =>
      [...rowsByKey.entries()]
        .filter(([, r]) => r.o === o)
        .map(([k, r]) => ({
          k,
          a: assessments[b][p.id]![k]!,
          net: ((b === 'gpu' ? r.gpuRisk : r.cpuRisk) as { net: number }).net
        }))
        .filter((x) => constrained || x.a.pass)
        .sort((x, y) => (constrained ? x.a.violation - y.a.violation : 0) || y.net - x.net || (x.k < y.k ? -1 : 1))
        .map((x) => x.k);
    const gq = order('gpu', false);

    rankings[`${o}/${p.id}`] = {
      qualified: gq.length,
      sameQualifiedOrder: JSON.stringify(gq) === JSON.stringify(order('cpu', false)),
      sameConstrainedOrder: JSON.stringify(order('gpu', true)) === JSON.stringify(order('cpu', true)),
      top5: gq.slice(0, 5)
    };
  }

// threshold-edge census and policy disagreement (base option set; GPU values = CPU values when R1 holds)
const census = (() => {
  const base = [...rowsByKey.entries()].filter(([, r]) => r.o === optionNames[0]);
  const near = (v: number, limit: number, f: number) => Math.abs(v - limit) <= f * limit;
  const env = (r: { gpuRisk: unknown }) => (r.gpuRisk as { envelope: Record<string, number> }).envelope;
  const dd = (r: { gpuRisk: unknown }) => (r.gpuRisk as { dd: number }).dd;
  const count = (f: (r: (typeof base)[number][1]) => boolean) => base.filter(([, r]) => f(r)).length;
  const lim = { dd35: limitOf(35, 100_000), dd40: limitOf(40, 100_000), q25: limitOf(25, 100_000) };

  return {
    subjects: base.length,
    within1pct: {
      dd35: count((r) => near(dd(r), lim.dd35, 0.01)),
      dd40: count((r) => near(dd(r), lim.dd40, 0.01)),
      principalLossLiq25: count((r) => near(env(r).principalLossLiquidation!, lim.q25, 0.01)),
      bankedDdLiq25: count((r) => near(env(r).bankedDdLiquidation!, lim.q25, 0.01))
    },
    within5pct: {
      dd35: count((r) => near(dd(r), lim.dd35, 0.05)),
      dd40: count((r) => near(dd(r), lim.dd40, 0.05)),
      principalLossLiq25: count((r) => near(env(r).principalLossLiquidation!, lim.q25, 0.05)),
      bankedDdLiq25: count((r) => near(env(r).bankedDdLiquidation!, lim.q25, 0.05))
    },
    closest: {
      dd35: Math.min(...base.map(([, r]) => Math.abs(dd(r) - lim.dd35))),
      dd40: Math.min(...base.map(([, r]) => Math.abs(dd(r) - lim.dd40))),
      principalLossLiq25: Math.min(...base.map(([, r]) => Math.abs(env(r).principalLossLiquidation! - lim.q25))),
      bankedDdLiq25: Math.min(...base.map(([, r]) => Math.abs(env(r).bankedDdLiquidation! - lim.q25)))
    },
    decisions: {
      controlPass: base.filter(([k]) => assessments.gpu['nl0-control']![k]!.pass).length,
      experimentalPass: base.filter(([k]) => assessments.gpu['re-40-25-25']![k]!.pass).length,
      controlOnly: base.filter(
        ([k]) => assessments.gpu['nl0-control']![k]!.pass && !assessments.gpu['re-40-25-25']![k]!.pass
      ).length,
      experimentalOnly: base.filter(
        ([k]) => !assessments.gpu['nl0-control']![k]!.pass && assessments.gpu['re-40-25-25']![k]!.pass
      ).length,
      experimentalFailBy: Object.fromEntries(
        ['markedDd', 'principalLoss', 'bankedDd'].map((m) => [
          m,
          base.filter(([k]) =>
            assessments.gpu['re-40-25-25']![k]!.checks.some((c) => c.metric === m && c.pass === false)
          ).length
        ])
      )
    },
    structural: {
      // report-only (research/vg-l0-risk-metrics/SELECTION_PIPELINE_AUDIT.md §3): on one slot trade PL (marked) ≤ DD
      // exactly and banked DD ≤ DD barring partial sales under water
      principalLossMarkedAboveDd: count((r) => env(r).principalLossMarked! > dd(r)),
      bankedDdMarkedAboveDd: count((r) => env(r).bankedDdMarked! > dd(r)),
      liquidationEqualsMarkedAtCost0: optionNames.includes('cost0')
        ? [...rowsByKey.values()]
            .filter((r) => r.o === 'cost0')
            .every((r) => {
              const e = env(r);

              return e.principalLossLiquidation === e.principalLossMarked && e.bankedDdLiquidation === e.bankedDdMarked;
            })
        : null
    }
  };
})();

// selected candidate records (brief deliverable C): the references, both sides, in full
const selected = [...rowsByKey.entries()]
  .filter(
    ([k]) =>
      /incumbent: New L0|C24\/informed\/GD\.VB\/R2#1 profit|incumbent: C4R?\|/.test(k) || k.startsWith('F:incumbent')
  )
  .slice(0, 12)
  .map(([k, r]) => ({
    key: k,
    gpu: r.gpuRisk,
    cpuEqual: canonHash(r.gpuRisk) === canonHash(r.cpuRisk),
    assessments: Object.fromEntries(policies.map((p) => [p.id, assessments.gpu[p.id]![k]]))
  }));
const pass =
  r1.length === 0 &&
  r2.length === 0 &&
  r2archive.differing.length === 0 &&
  r3.length === 0 &&
  Object.values(rankings).every((x) => x.sameQualifiedOrder && x.sameConstrainedOrder);

writeJson(path.join(repoRoot, out), {
  kind: 'gpu-phase7 risk-delivery parity (R1–R3)',
  t: new Date().toISOString(),
  label,
  door: doorName,
  doorPin,
  runtime: engineRuntime(),
  build: {
    binary: path.relative(repoRoot, serverBinary),
    binarySha256,
    compatDigest: digest,
    serverDigest: info.compatDigest,
    uuid: info.uuid
  },
  datasetSha256: ds.sha256,
  options: optionNames,
  hostWorkers,
  cpuWorkers: workers,
  jobs: { gpu: jobs.gpu.id, cpu: jobs.cpu.id },
  subjects: {
    total: subjects.length,
    bySet: Object.fromEntries(
      [...new Set(subjects.map((s) => s.set))].map((s) => [s, subjects.filter((x) => x.set === s).length])
    )
  },
  items: items.length,
  r1: { compared: items.length, differing: r1.length, examples: r1.slice(0, 10) },
  r2: {
    compared: rowsByKey.size * 2,
    differing: r2.length,
    examples: r2.slice(0, 10),
    archive: {
      compared: r2archive.compared,
      differing: r2archive.differing.length,
      examples: r2archive.differing.slice(0, 10)
    }
  },
  r3: { compared: rowsByKey.size * policies.length, differing: r3.length, examples: r3.slice(0, 10), rankings },
  census,
  selected,
  timing: { ...timing, wallSeconds: Math.round((Date.now() - t0) / 100) / 10 },
  pass
});
console.log(
  JSON.stringify({
    label,
    pass,
    items: items.length,
    r1: r1.length,
    r2: r2.length,
    archive: r2archive,
    r3: r3.length,
    census: census.within1pct,
    decisions: census.decisions,
    timing
  })
);
await server.close().catch(() => undefined);
process.exitCode = pass ? 0 : 2;
