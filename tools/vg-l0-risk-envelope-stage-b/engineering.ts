// Engineering gate E3 of Stage B (PROTOCOL.md §12) — NON-OFFICIAL (purpose parity-test), never an outcome-producing
// search: Stage B's own code (the pilot's lane and arm fitness, both Stage B arms run concurrently in one Lab exactly as
// the official search does, the union qualification, lane values, the paired statistic, the selectors) on a fixed-seed
// MINI schedule on the engineering door D19 (cutoff label E3B, its own seed keys), on the GPU (accepted binary,
// non-official pool) and on the CPU reference; plus threshold-edge engineering subjects on D21 / D24 (Phase 7's edge
// subjects near $35k / $40k and Stage B's own P3 edge subjects near BD $30k, PL $25k, DD $40k / $35k drawn read-only from
// the pilot's archived populations: engineering subjects, never candidates). Commands (repository root,
// `GPU_POLICY_PURPOSE=parity-test npm run vg-l0reb-eng -- …`):
//   mini --backend gpu|cpu --name <job> [--stop-after N] [--resume] [--a3]
//   compare <a> <b> --out <json>       lane results, qualification evidence, selections, lane values and every archived
//                                      evaluation (key → record hash)
//   a3check <name> --out <json>        the Stage B CTRL mini lanes = Assignment 3's own lane on the same specs
//   edge --door D21|D24 --out <json>   the threshold-edge subjects on both backends: records, envelopes, every decision
//   identity <name> --out <json>       the archive refuses another backend / code digest
//   summary --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { StopRequested } from '../../src/gpu-backend/lab.ts';
import { Store, encode } from '../../src/growth140-vgt-s8m/store.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { rankOrder } from '../../src/study8-expanded-regime-d1/search.ts';
import { budgets, laneWorstCase } from '../../src/vg-l0-full-joint/budgets.ts';
import { Lane as A3Lane } from '../../src/vg-l0-full-joint/search.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, canonicalCfg, cellOf, cfgId } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import type { LaneResult, LaneSpec } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { assessArm, plausibleArm, screenReason, screenViolation } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { stripEnvelopes } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { type ArmKey, armKeys, arms, asPilotArm, cells, repoRoot, researchDir, resultsDir } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { runLanes } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { type Evidence, qualifyMembers, sealedEvidence } from '../../src/vg-l0-risk-envelope-stage-b/qualify.ts';
import { laneValues, selectArm } from '../../src/vg-l0-risk-envelope-stage-b/select.ts';
import { pairsOf, primaryOf } from '../../src/vg-l0-risk-envelope-stage-b/stats.ts';
import { codeDigest } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import { openToolLab, purposeOf, writeJson } from './common.ts';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string, d = '') => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const purpose = purposeOf(['parity-test']);
const e3Dir = path.join(resultsDir, 'engineering', 'E3');
const readOut = (name: string) => JSON.parse(fs.readFileSync(path.join(e3Dir, name, 'result.json'), 'utf8'));

// the declared mini schedule (the pilot's E3 / GPU Phase 7's: Assignment 3's broad lane at reduced counts)
export const miniBudget = {
  ...budgets.study.broad,
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
const miniBound = laneWorstCase(miniBudget, 0, 0);
const miniSpecs = (): LaneSpec[] =>
  cells.map((id) => {
    const key = `E3B/broad/${id}/R1`;

    return { key, seedKey: key, position: key, stage: 'broad', replicate: 1, cutoff: 'E3B', kind: 'indep', res: 'coarse', cell: cellOf(id) };
  });

const mini = async () => {
  const backend = opt('backend', 'gpu') as 'gpu' | 'cpu';
  const name = opt('name');
  const out = path.join(e3Dir, name);

  if (!name) throw new Error('--name');
  if (!args.includes('--resume') && fs.existsSync(path.join(out, 'result.json'))) throw new Error(`${name} exists`);

  const t = await openToolLab({
    backend,
    door: 'D19',
    area: 'engineering',
    job: name,
    purpose: `${purpose}: E3 mini-pilot`,
    stopAfterFresh: args.includes('--stop-after') ? Number(opt('stop-after')) : undefined,
    ledger: path.join(out, 'receipts.jsonl')
  });
  const t0 = Date.now();

  try {
    const record: Record<string, unknown> = { kind: 'E3 mini-pilot (non-official)', codeDigest: t.lab.digest, backend: t.backendId, door: 'D19', budget: miniBudget, laneBound: miniBound };
    // both arms in ONE barrier loop, as the official search (PROTOCOL.md BA4)
    const plan = miniSpecs().flatMap((s) => armKeys.map((a) => ({ spec: s, arm: arms[a] })));
    const { results, rounds } = await runLanes(t.lab, plan, miniBudget, miniBound, Number.MAX_SAFE_INTEGER, 0, 'E3');
    const byArm = Object.fromEntries(armKeys.map((a) => [a, results.filter((r) => r.arm === a).map((r) => r.result)])) as Record<ArmKey, LaneResult[]>;

    record.arms = byArm;
    record.rounds = rounds;
    if (args.includes('--a3')) {
      // Assignment 3's own lane on the same specs, every evaluation with the risk envelope (its code never reads it)
      const riskLab = {
        evalMany: (items: Parameters<typeof t.lab.evalMany>[0], tag?: string) => t.lab.evalMany(items.map((x) => ({ ...x, risk: true })), tag),
        store: t.lab.store,
        checkpoint: (p: Record<string, unknown>) => t.lab.checkpoint(p)
      };
      const lanes = miniSpecs().map((s) => new A3Lane(riskLab as never, s, miniBudget));

      await Promise.all(lanes.map((l) => l.base()));

      const stops = new Map<string, string>();

      for (;;) {
        const live = lanes.filter((l) => !stops.has(l.spec.position));
        const go: A3Lane[] = [];

        for (const l of live) {
          const fired = l.lastTrigger?.fired ?? false;

          if (!fired) stops.set(l.spec.position, 'triggers not met');
          else if (l.atCap) stops.set(l.spec.position, 'extension cap reached (a trigger still fired: budget-bound, not converged)');
          else go.push(l);
        }
        if (!go.length) break;
        await Promise.all(go.map((l) => l.extend()));
      }
      record.a3Ctrl = await Promise.all(lanes.map((l) => l.finish(stops.get(l.spec.position) ?? 'triggers not met')));
    }

    // the union of both arms' shortlists, qualified with the real instrument (cutoff label E3B)
    const byId = new Map<string, Evidence['shortlistedBy'][number][]>();
    const cfgs = new Map<string, Cfg>();

    for (const a of armKeys)
      for (const l of byArm[a])
        l.shortlist.forEach((p, i) => {
          const c = canonicalCfg(p.cfg);
          const id = cfgId(c);

          cfgs.set(id, c);
          (byId.get(id) ?? byId.set(id, []).get(id)!).push({ arm: a, label: `${a} ${l.key}#${i + 1} ${p.pick}`, lane: l.key, pick: p.pick });
        });

    const members = [...byId.entries()].map(([id, by]) => ({ label: by[0]!.label, lane: by[0]!.lane, stage: 'broad' as const, track: 'I' as const, replicate: 1, cfg: cfgs.get(id)!, pick: by[0]!.pick, shortlistedBy: by }));
    const { evidence, requested } = await qualifyMembers(t.lab, members, 'E3B');
    const values = Object.fromEntries(
      armKeys.map((a) => [a, laneValues(evidence, a, byArm[a].map((l) => ({ key: l.key, cell: l.structure, replicate: l.replicate, shortlisted: l.shortlist.length })))])
    ) as Record<ArmKey, ReturnType<typeof laneValues>>;
    const pairs = pairsOf('E3B', values.CTRL, values.EXP30);

    record.qualification = { members: members.length, requested, evidence: evidence.map(sealedEvidence) };
    record.selection = Object.fromEntries(armKeys.map((a) => [a, selectArm(evidence, a)]));
    record.laneValues = values;
    record.pairs = pairs;
    record.primary = primaryOf('E3B', pairs);
    record.compute = t.lab.compute;
    record.minutes = Math.round((Date.now() - t0) / 600) / 100;

    // the archive: key → record hash (the store's encoding)
    t.lab.store.commit();

    const rows: string[] = [];

    for (const [k, v] of t.lab.store.iterate('points')) rows.push(`${k}=${createHash('sha256').update(encode(v)).digest('hex').slice(0, 20)}`);
    rows.sort();
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'archive.txt'), `${rows.join('\n')}\n`);
    record.archive = { rows: rows.length, sha256: createHash('sha256').update(rows.join('\n')).digest('hex') };
    writeJson(path.join(out, 'result.json'), record);
    await t.close('job-end');
    console.log(JSON.stringify({ name, backend, archived: rows.length, minutes: record.minutes, members: members.length }));
  } catch (e) {
    if (e instanceof StopRequested) {
      await t.close(`stopped: ${e.reason}`);
      console.log(`STOPPED ${e.reason}`);
      process.exit(75);
    }
    await t.close(`failed: ${(e as Error).message.slice(0, 160)}`).catch(() => undefined);
    throw e;
  }
};

const compare = () => {
  const [a, b] = [args[1]!, args[2]!];
  const A = readOut(a);
  const B = readOut(b);
  const view = (r: Record<string, unknown>) => ({ arms: r.arms, rounds: r.rounds, qualification: r.qualification, selection: r.selection, laneValues: r.laneValues, pairs: r.pairs, primary: r.primary, ...(r.a3Ctrl ? { a3Ctrl: r.a3Ctrl } : {}) });
  const diffs = deepDiff(view(A), view(B), '$', [], 40);
  const rowsA = fs.readFileSync(path.join(e3Dir, a, 'archive.txt'), 'utf8');
  const rowsB = fs.readFileSync(path.join(e3Dir, b, 'archive.txt'), 'utf8');
  const archiveSame = rowsA === rowsB;
  const rec = {
    kind: 'E3 comparison',
    a: { name: a, backend: A.backend, archive: A.archive },
    b: { name: b, backend: B.backend, archive: B.archive },
    differences: diffs.map((d) => ({ path: d.path })),
    archiveIdentical: archiveSame,
    identical: diffs.length === 0 && archiveSame
  };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ identical: rec.identical, diffs: diffs.length, archiveIdentical: rec.archiveIdentical }));
  process.exitCode = rec.identical ? 0 : 2;
};

const a3check = () => {
  const r = readOut(args[1]!);
  const mine = (r.arms as Record<string, unknown[]>).CTRL!;
  const diffs = deepDiff(stripEnvelopes(r.a3Ctrl), stripEnvelopes(mine), '$', [], 40);
  const rec = { kind: 'E3: the Stage B CTRL mini lanes (run concurrently with EXP30) = Assignment 3 lanes (mini specs, envelope requested, stripped)', run: args[1], lanes: mine.length, differences: diffs.map((d) => ({ path: d.path })), identical: diffs.length === 0 && mine.length === cells.length };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ identical: rec.identical, diffs: diffs.length }));
  process.exitCode = rec.identical ? 0 : 2;
};

// the threshold-edge engineering subjects: records + envelopes + every arm decision on both backends
const edge = async () => {
  const door = opt('door') as 'D21' | 'D24';
  const p7File = path.join(repoRoot, 'research', 'gpu-phase7', 'results', 'risk-parity', `edge-subjects-${door}.json`);
  const sbFile = path.join(e3Dir, `edge-subjects-${door}.json`);
  const p7 = JSON.parse(fs.readFileSync(p7File, 'utf8')) as { door: string; subjects: { id: string; sel: string; cfg: Cfg }[] };
  const sb = JSON.parse(fs.readFileSync(sbFile, 'utf8')) as { door: string; subjects: { id: string; sel: string; cfg: Cfg }[] };

  if (p7.door !== door || sb.door !== door) throw new Error('edge subjects of another door');

  const cfgList = [...p7.subjects.map((s) => ({ sel: `phase7:${s.sel}`, cfg: canonicalCfg(s.cfg) })), ...sb.subjects.map((s) => ({ sel: `stageB:${s.sel}`, cfg: canonicalCfg(s.cfg) }))];
  const options = { base: vOptions, 'cost 10 bps': { ...vOptions, friction: { costBps: 10 } } };
  const run = async (backend: 'gpu' | 'cpu') => {
    const t = await openToolLab({ backend, door, area: 'engineering', job: `E3-edge-${door}-${backend}`, purpose: `${purpose}: E3 edge subjects`, ledger: path.join(e3Dir, `edge-${door}-${backend}`, 'receipts.jsonl') });
    const items = cfgList.flatMap((s) => Object.values(options).map((o) => ({ cfg: s.cfg, options: o, risk: true as const })));
    const recs = await t.lab.evalMany<SRec>(items, 'E3 edge');

    await t.close('job-end');
    return { backend: t.backendId, recs };
  };
  const g = await run('gpu');
  const c = await run('cpu');
  let recordDiffs = 0;
  const decisions = (recs: SRec[]) =>
    cfgList.map((_s, i) => {
      const base = recs[2 * i]!;
      const s10 = recs[2 * i + 1]!;

      return Object.fromEntries(
        armKeys.map((a) => {
          const arm = asPilotArm(arms[a]);

          return [
            a,
            {
              plausible: plausibleArm(base, arm),
              screenViolation: plausibleArm(base, arm) ? 0 : screenViolation(base, arm),
              reason: screenReason(base, arm),
              assess: assessArm(base, arm),
              q5: s10.net > 0 && assessArm(s10, arm).pass
            }
          ];
        })
      );
    });

  g.recs.forEach((r, i) => {
    if (createHash('sha256').update(encode(r)).digest('hex') !== createHash('sha256').update(encode(c.recs[i])).digest('hex')) recordDiffs++;
  });

  const dg = decisions(g.recs);
  const dc = decisions(c.recs);
  const decisionDiffs = deepDiff(dg, dc, '$', [], 40);
  const rank = (recs: SRec[], a: ArmKey) =>
    rankOrder(
      cfgList.map((s, i) => ({ id: cfgId(s.cfg), genome: [], objectives: [-recs[2 * i]!.net, recs[2 * i]!.dd], violation: plausibleArm(recs[2 * i]!, asPilotArm(arms[a])) ? 0 : screenViolation(recs[2 * i]!, asPilotArm(arms[a])) }))
    ).map((x) => x.id);
  const rankingsIdentical = armKeys.every((a) => JSON.stringify(rank(g.recs, a)) === JSON.stringify(rank(c.recs, a)));
  const overlap = { both: 0, ctrlOnly: 0, exp30Only: 0, neither: 0 };
  const expFail: Record<string, number> = {};
  // how close the subjects came to each P3 limit (the edge is exercised, not assumed)
  const within = (f: (r: SRec) => number, target: number, tol: number) => g.recs.filter((r, i) => i % 2 === 0 && !r.error && Math.abs(f(r) - target) <= tol).length;
  const env = (r: SRec) => (r as SRec & { envelope: { bankedDdLiquidation: number; principalLossLiquidation: number } }).envelope;

  for (const d of dg) {
    const k = d.CTRL!.plausible ? (d.EXP30!.plausible ? 'both' : 'ctrlOnly') : d.EXP30!.plausible ? 'exp30Only' : 'neither';

    overlap[k]++;
    if (!d.EXP30!.plausible) expFail[d.EXP30!.reason] = (expFail[d.EXP30!.reason] ?? 0) + 1;
  }

  const rec = {
    kind: 'E3 threshold-edge engineering subjects (non-official; never candidates)',
    door,
    subjects: { phase7: { file: path.relative(repoRoot, p7File), n: p7.subjects.length }, stageB: { file: path.relative(repoRoot, sbFile), n: sb.subjects.length } },
    backends: { gpu: g.backend, cpu: c.backend },
    evaluations: g.recs.length,
    recordDifferences: recordDiffs,
    decisionDifferences: decisionDiffs.map((d) => ({ path: d.path })),
    rankingsIdentical,
    plausibilityOverlap: overlap,
    exp30FailureReasons: expFail,
    edgeCoverage: {
      bankedDdWithin500OfBd30: within((r) => env(r).bankedDdLiquidation, 30_000, 500),
      principalLossWithin500OfPl25: within((r) => env(r).principalLossLiquidation, 25_000, 500),
      markedDdWithin500Of40k: within((r) => r.dd, 40_000, 500),
      markedDdWithin500Of35k: within((r) => r.dd, 35_000, 500)
    },
    identical: recordDiffs === 0 && decisionDiffs.length === 0 && rankingsIdentical
  };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ identical: rec.identical, recordDiffs, decisionDiffs: decisionDiffs.length, rankingsIdentical, overlap, edge: rec.edgeCoverage }));
  process.exitCode = rec.identical ? 0 : 2;
};

// the archive identity: a job archive refuses another backend or code digest (the Store binding)
const identity = () => {
  const name = args[1]!;
  const file = path.join(researchDir, 'cache', 'engineering', 'jobs', name, 'archive.sqlite');
  const r = readOut(name);
  const tries = [
    { what: 'another backend', binding: { backend: 'cpu:12 workers' } },
    { what: 'another code digest', binding: { codeDigest: '0'.repeat(64) } }
  ];
  const rows = tries.map((x) => {
    try {
      const s = new Store(file, { binding: { study: 'research/vg-l0-risk-envelope-stage-b', job: name, door: 'D19', doorPin: 'x', codeDigest: 'x', backend: r.backend, ...x.binding } as never, lruCapacity: 100, commitRows: 100, commitMs: 1000, readOnly: true });

      s.close();
      return { what: x.what, refused: false, error: null };
    } catch (e) {
      return { what: x.what, refused: true, error: (e as Error).message.slice(0, 200) };
    }
  });
  const rec = { kind: 'E3 archive identity', archive: path.relative(repoRoot, file), rows, pass: rows.every((x) => x.refused) };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ pass: rec.pass }));
  process.exitCode = rec.pass ? 0 : 2;
};

const summary = () => {
  const need = ['compare-gpu-vs-cpu.json', 'compare-stopped-resumed-vs-gpu.json', 'compare-killed-resumed-vs-gpu.json', 'a3check-gpu.json', 'a3check-cpu.json', 'edge-D21.json', 'edge-D24.json', 'identity.json'];
  const rows = need.map((f) => {
    const p = path.join(e3Dir, f);
    const x = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;

    return { file: f, present: Boolean(x), pass: x ? Boolean(x.identical ?? x.pass) : false, sha256: x ? createHash('sha256').update(fs.readFileSync(p)).digest('hex') : null };
  });
  const digests = [...new Set(['gpu', 'cpu', 'gpu-stopped', 'gpu-killed'].map((n) => (fs.existsSync(path.join(e3Dir, n, 'result.json')) ? readOut(n).codeDigest : null)))];
  const rec = { kind: 'E3 summary', codeDigest: digests.length === 1 ? digests[0] : null, codeDigests: digests, rows, pass: rows.every((r) => r.pass) && digests.length === 1 && digests[0] === codeDigest() };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ pass: rec.pass, rows: rows.map((r) => `${r.file}:${r.pass}`) }));
  process.exitCode = rec.pass ? 0 : 2;
};

if (cmd === 'mini') await mini();
else if (cmd === 'compare') compare();
else if (cmd === 'a3check') a3check();
else if (cmd === 'edge') await edge();
else if (cmd === 'identity') identity();
else if (cmd === 'summary') summary();
else {
  console.error('usage: engineering.ts mini|compare|a3check|edge|identity|summary …');
  process.exit(2);
}
