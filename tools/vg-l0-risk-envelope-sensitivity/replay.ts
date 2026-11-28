// RES-A 1.0.0 stage S3 — the bounded, predeclared deterministic CPU replays (PROTOCOL.md §5; purpose diagnostic; never
// official optimization evidence; `node --no-maglev`). Only fixed, already-evaluated configurations; no search, mutation,
// selection or new candidate.
//   g1 --cutoff C2x   confirmation gap fill: every rung-3 fit / refinement endpoint of either arm that is not a
//                     qualification member → the centre, the 10 bps stress and the frozen confirmation family
//                     (3 × 128, labels ('confirm', rep, cutoff); src/vg-l0-full-joint/qualify.ts drawsOf / famOf), through an
//                     EvalLab over this audit's CPU pool (archive .cache/…/jobs/G1-<cut>); the CPU centre record must equal
//                     the archived official GPU centre record bit for bit (G3)
//   g2 --cutoff C2x   giveback attribution: every profitable, funded centre whose centre verdict differs between P0 and
//                     any of P1–P8, or between P2 and any of P3–P8 → the canonical CPU record (G3 parity against the
//                     archived GPU record) and the D3 account partition from the portfolio path (./diagWorker.ts)
//   g3 --cutoff C2x   parity sample: the confirm-1 family (128 draws) of the cutoff's sealed CTRL and EXP P0 primaries,
//                     re-evaluated on the CPU and compared bit for bit with the official qualification archive's records
// Outputs: research/vg-l0-risk-envelope-sensitivity/results/replays/<g>-<cut>.json(.gz)
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/vg-l0-risk-envelope-sensitivity/replay.ts g1 --cutoff C21
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { EvalLab } from '../../src/gpu-backend/lab.ts';
import { engineExecArgv, maglevDisabled } from '../../src/gpu-backend/runtime.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { Store } from '../../src/growth140-vgt-s8m/store.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, cfgId, evalKeyOf } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { drawsOf, famOf, stresses } from '../../src/vg-l0-full-joint/qualify.ts';
import { fidelity, pooledStats } from '../../src/vg-l0-risk-families/qualify.ts';
import { checkEnvelope, RISK_KEY_SUFFIX } from '../../src/gpu-backend/lab.ts';
import { type CutoffKey, STUDY_ID as PILOT_STUDY_ID, cutoffs } from '../../src/vg-l0-risk-envelope-pilot/context.ts';
import { plausibleArm } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { codeDigest, readSealed } from '../../src/vg-l0-risk-envelope-pilot/records.ts';
import { qualificationFile, searchFile } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { selectionFile } from '../../src/vg-l0-risk-envelope-pilot/doors.ts';
import type { Evidence } from '../../src/vg-l0-risk-envelope-pilot/qualify.ts';
import { CpuPool } from './cpuPool.ts';
import { STUDY_ID, archiveCopy, cacheRoot, purposeOf, readJsonGz, resultsDir, utc, writeJson, writeJsonGz } from './common.ts';
import { arms, policyKeys } from './policies.ts';

const purpose = purposeOf(['diagnostic']);

setA3Quiet(true);

const args = process.argv.slice(2);
const cmd = args[0];
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;
const WORKERS = Number(process.env.VGL0RES_WORKERS ?? 12);

if (!['g1', 'g2', 'g3'].includes(cmd ?? '') || !cutoffs[cut]) throw new Error('usage: replay.ts g1|g2|g3 --cutoff C21|C24');

const spec = cutoffs[cut];
const outDir = path.join(resultsDir, 'replays');
const pins = doorSpecs[spec.door].pins;
const doorPin = `GDX:${pins.GDX.sha256},VGT:${pins.VGT.sha256}`;

type PopCentre = { id: string; cfg: Cfg; sources: string[]; stageTags: string[]; rec: { error: string | null; net: number; dd: number; mixed: boolean; envelope: unknown } };
const population = () => readJsonGz<{ centres: PopCentre[]; binding: { backend: string; codeDigest: string } }>(path.join(cacheRoot, `population-${cut}.json.gz`));

// read-only access to an archive COPY (full records, for the bit-for-bit comparisons)
const openCopy = (job: string, binding: { backend: string; codeDigest: string }) =>
  new Store(archiveCopy(job), {
    binding: { study: PILOT_STUDY_ID, job, door: spec.door, doorPin, codeDigest: binding.codeDigest, backend: binding.backend },
    lruCapacity: 1000,
    commitRows: 1000,
    commitMs: 5000,
    readOnly: true
  });
const keyOf = (cfg: Cfg, options = vOptions) => `${evalKeyOf(spec.door as never, cfg, options)}${RISK_KEY_SUFFIX}`;

// a CPU EvalLab (its own archive under .cache/…/jobs/<job>; bound to this audit's study, the backend cpu:<n> and the
// pilot runner's current evaluation-closure digest)
const cpuLab = async (job: string) => {
  const pool = new CpuPool(WORKERS, spec.door, `${STUDY_ID} ${job} (${purpose})`);
  const lab = new EvalLab({ study: STUDY_ID, job, door: spec.door, doorPin, purpose: `${STUDY_ID} ${job} (non-official CPU, ${purpose})`, pool, backend: `cpu:${WORKERS} workers`, codeDigest: codeDigest(), cacheRoot });

  await pool.start();
  await lab.open();
  return lab;
};

const t0 = Date.now();

// ---------------------------------------------------------------- G1
if (cmd === 'g1') {
  const pop = population();
  const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut)).evidence;
  const memberIds = new Set(q.map((e) => e.id));
  const pick = pop.centres.filter((c) => !memberIds.has(c.id) && c.stageTags.some((t) => / r3 (feasible|infeasible)$|\|r3 (feasible|infeasible)$|refinement endpoint/.test(t)));

  if (pick.length > 80) throw new Error(`G1 ${cut}: ${pick.length} configurations exceed the predeclared cap of 80`);

  const s10 = { ...vOptions, friction: { ...stresses['cost 10 bps']! } };
  const plans = pick.map((c) => ({ c, fams: Array.from({ length: fidelity.confirmReps }, (_v, i) => drawsOf(c.cfg, famOf('confirm', ['confirm', i + 1, cut]))) }));
  const items = plans.flatMap((p) => [
    { cfg: p.c.cfg, options: vOptions, risk: true as const },
    { cfg: p.c.cfg, options: s10, risk: true as const },
    ...p.fams.flat().map((x) => ({ cfg: x.cfg, options: vOptions, risk: true as const }))
  ]);

  if (items.length > 35_000) throw new Error(`G1 ${cut}: ${items.length} evaluations exceed the per-cutoff share of the 70,000 cap`);
  console.log(`[${utc()}] G1 ${cut}: ${pick.length} configurations, ${items.length} requested CPU evaluations`);

  const lab = await cpuLab(`G1-${cut}`);
  const recs = (await lab.evalMany(items, `G1 ${cut}`)) as SRec[];
  const gpu = openCopy(`${cut}-search`, pop.binding);
  const rows = [];
  let at = 0;

  for (const p of plans) {
    const centre = recs[at++]!;
    const stress10 = recs[at++]!;
    const famRecs = p.fams.map((f) => f.map(() => recs[at++]!));
    const pooled = pooledStats(centre, p.fams.map((draws, i) => ({ draws, recs: famRecs[i]! })));
    const gpuCentre = gpu.read<SRec>('points', keyOf(p.c.cfg));
    const parity = gpuCentre ? deepDiff(centre, gpuCentre, '$', [], 10) : [{ path: 'missing GPU record' }];

    if (parity.length) throw new Error(`G1 ${cut} ${p.c.id}: CPU centre ≠ archived GPU centre at ${parity.map((d) => d.path).join(', ')}`);

    const compact = (r: SRec) => {
      if (r.error) return { error: String(r.error) };

      const e = checkEnvelope((r as SRec & { envelope?: unknown }).envelope, 'draw');

      return { net: r.net, dd: r.dd, plL: e.principalLossLiquidation, plM: e.principalLossMarked, bdL: e.bankedDdLiquidation, bdM: e.bankedDdMarked, lots: r.lots, signature: r.signature, mixed: r.mixed };
    };

    rows.push({
      id: p.c.id,
      sources: p.c.sources,
      stageTags: p.c.stageTags,
      cfg: p.c.cfg,
      centre,
      stress10: { net: stress10.net, dd: stress10.dd, envelope: checkEnvelope((stress10 as SRec & { envelope?: unknown }).envelope, 'stress') },
      confirmNb: pooled.nb,
      confirm: { drawn: pooled.drawn, unique: pooled.unique, draws: pooled.recs.map((r) => compact(r as SRec)) },
      parityCentre: 'identical'
    });
  }
  gpu.close();

  const compute = { requested: items.length, fresh: lab.fresh, archiveHits: lab.hits, seconds: Math.round((Date.now() - t0) / 1000) };

  await lab.close('G1-end');
  await (lab.pool as CpuPool).close();

  const sha = writeJsonGz(path.join(outDir, `G1-${cut}.json.gz`), { kind: 'RES-A G1 confirmation gap fill (non-official CPU, diagnostic)', cutoff: cut, door: spec.door, configurations: rows.length, compute, parity: { centres: rows.length, identical: rows.length }, rows, finished: utc() });

  console.log(JSON.stringify({ g: 'G1', cut, configurations: rows.length, compute, sha256: sha }));
}

// ---------------------------------------------------------------- G2
if (cmd === 'g2') {
  const pop = population();
  const verdicts = (c: PopCentre) => Object.fromEntries(policyKeys.map((k) => [k, plausibleArm(c.rec as never, arms[k])]));
  const scope = pop.centres.filter((c) => !c.rec.error && c.rec.net > 0 && c.rec.mixed);
  const pick = scope.filter((c) => {
    const v = verdicts(c);

    return policyKeys.slice(1).some((k) => v[k] !== v.P0) || ['P3', 'P4', 'P5', 'P6', 'P7', 'P8'].some((k) => v[k] !== v.P2);
  });

  if (pick.length > 8000) throw new Error(`G2 ${cut}: ${pick.length} centres exceed the predeclared cap of 8,000`);
  console.log(`[${utc()}] G2 ${cut}: ${pick.length} of ${scope.length} profitable, funded centres change verdict across the policies`);

  const items = pick.map((c) => ({ key: c.id, cfg: c.cfg }));
  const n = Math.min(WORKERS, items.length);
  const chunks = Array.from({ length: n }, (_v, i) => items.filter((_x, j) => j % n === i));
  const parts = await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise<{ key: string; rec: SRec; d3: Record<string, unknown> }[]>((resolve, reject) => {
          const child = fork(path.join(import.meta.dirname, 'diagWorker.ts'), [], {
            execArgv: [...(maglevDisabled() ? engineExecArgv : []), '--expose-gc', '--max-old-space-size=3072', '--experimental-transform-types', '--disable-warning=ExperimentalWarning'],
            serialization: 'advanced',
            env: { ...process.env },
            stdio: ['ignore', 'inherit', 'inherit', 'ipc']
          });

          child.on('message', (m: { t: string; rows?: never[]; e?: string }) => (m.t === 'done' ? resolve(m.rows!) : reject(new Error(m.e))));
          child.on('exit', (code) => code !== 0 && reject(new Error(`G2 worker exited ${code}`)));
          child.send({ door: spec.door, purpose: `${STUDY_ID} G2 ${cut} (${purpose})`, items: chunk });
        })
    )
  );
  const byKey = new Map(parts.flat().map((r) => [r.key, r]));
  const gpu = openCopy(`${cut}-search`, pop.binding);
  const rows = [];
  let identical = 0;

  for (const c of pick) {
    const r = byKey.get(c.id)!;
    const g = gpu.read<SRec>('points', keyOf(c.cfg));
    const parity = g ? deepDiff(r.rec, g, '$', [], 10) : [{ path: 'missing GPU record' }];

    if (parity.length) throw new Error(`G2 ${cut} ${c.id}: CPU record ≠ archived GPU record at ${parity.map((d) => d.path).join(', ')}`);
    identical++;
    rows.push({ id: c.id, verdicts: verdicts(c), d3: r.d3 });
  }
  gpu.close();

  const sha = writeJsonGz(path.join(outDir, `G2-${cut}.json.gz`), {
    kind: 'RES-A G2 giveback attribution (non-official CPU, diagnostic)',
    cutoff: cut,
    door: spec.door,
    centres: rows.length,
    compute: { evaluations: rows.length * 2, enginePasses: 'evaluate() + one pooled replay per centre', seconds: Math.round((Date.now() - t0) / 1000), workers: n },
    parity: { centres: rows.length, identical, fields: 'the whole canonical record incl. the four envelope values, bit for bit' },
    rows,
    finished: utc()
  });

  console.log(JSON.stringify({ g: 'G2', cut, centres: rows.length, identical, seconds: Math.round((Date.now() - t0) / 1000), sha256: sha }));
}

// ---------------------------------------------------------------- G3
if (cmd === 'g3') {
  const q = readSealed<{ evidence: Evidence[]; backend: string; codeDigest: string }>(qualificationFile(cut));
  const sel = readSealed<{ arms: Record<string, { primaries: Record<string, string | null> }> }>(selectionFile(cut));
  const primaryLabel = (arm: 'CTRL' | 'EXP') => sel.arms[arm]!.primaries.P0!;
  const subjects = (['CTRL', 'EXP'] as const).map((arm) => {
    const label = primaryLabel(arm);
    const e = q.evidence.find((x) => x.shortlistedBy.some((s) => s.label === label));

    if (!e) throw new Error(`G3 ${cut}: no evidence for ${label}`);
    return { arm, label, e };
  });
  const draws = subjects.flatMap((s) => drawsOf(s.e.cfg, famOf('confirm', ['confirm', 1, cut])).map((d) => ({ s: s.label, cfg: d.cfg })));
  const lab = await cpuLab(`G3-${cut}`);
  const recs = (await lab.evalMany(draws.map((d) => ({ cfg: d.cfg, options: vOptions, risk: true as const })), `G3 ${cut}`)) as SRec[];
  const gpu = openCopy(`${cut}-qualify`, { backend: q.backend, codeDigest: q.codeDigest });
  let identical = 0;
  const differences: string[] = [];

  draws.forEach((d, i) => {
    const g = gpu.read<SRec>('points', keyOf(d.cfg));
    const diff = g ? deepDiff(recs[i], g, '$', [], 5) : [{ path: 'missing GPU record' }];

    if (diff.length) differences.push(`${d.s} draw ${i}: ${diff.map((x) => x.path).join(', ')}`);
    else identical++;
  });
  gpu.close();

  const compute = { requested: draws.length, fresh: lab.fresh, archiveHits: lab.hits, seconds: Math.round((Date.now() - t0) / 1000) };

  await lab.close('G3-end');
  await (lab.pool as CpuPool).close();
  writeJson(path.join(outDir, `G3-${cut}.json`), {
    kind: 'RES-A G3 CPU/GPU parity sample (non-official CPU, diagnostic)',
    cutoff: cut,
    subjects: subjects.map((s) => ({ arm: s.arm, label: s.label, id: s.e.id })),
    family: 'confirm rep 1 (128 draws each)',
    compute,
    draws: draws.length,
    identical,
    differences,
    unique: new Set(draws.map((d) => cfgId(d.cfg))).size,
    finished: utc()
  });
  console.log(JSON.stringify({ g: 'G3', cut, draws: draws.length, identical, differences: differences.length, compute }));
  if (differences.length) process.exitCode = 1;
}

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
