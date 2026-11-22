// Engineering gate E3 of the risk-envelope pilot (PROTOCOL.md §13) — NON-OFFICIAL (purpose parity-test), never an
// outcome-producing pilot search: the pilot's own code (derived lane, arm fitness, qualification, selectors) on a
// fixed-seed MINI schedule on the engineering door D19 (cutoff label E3, its own seed keys), both arms, on the GPU
// (accepted binary, non-official pool) and on the CPU reference; plus the Phase 7 threshold-edge engineering subjects on
// D21 / D24 (configurations drawn read-only from Assignment 3's archives near $35k / $40k: engineering subjects, never
// candidates). Commands (repository root, `GPU_POLICY_PURPOSE=parity-test node --no-maglev --experimental-transform-types
// tools/vg-l0-risk-envelope-pilot/engineering.ts …`):
//   mini --backend gpu|cpu --name <job> [--stop-after N] [--resume] [--a3]
//        both arms' lanes (CTRL then EXP, as the official phases), the union shortlist qualified with the real
//        instrument, the selectors of both arms; --a3 also runs Assignment 3's own lane (risk requested) on the CTRL specs
//   compare <a> <b> --out <json> [--lanes-only]   two mini runs: lane results, qualification evidence, selections and
//        (unless --lanes-only) every archived evaluation (key → record hash)
//   a3check <name> --out <json>   the pilot's CTRL lanes = Assignment 3's lanes on the same mini specs (envelopes stripped)
//   edge --door D21|D24 --out <json>   the threshold-edge subjects on both backends: records, envelopes and every arm decision
//   identity <name> --out <json>   the archive refuses another backend / code digest (archive identity)
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
import { armKeys, arms, cells, researchDir, resultsDir } from '../../src/vg-l0-risk-envelope-pilot/context.ts';
import { runLanes, stripEnvelopes } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import type { LaneSpec } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { type Evidence, qualifyMembers } from '../../src/vg-l0-risk-envelope-pilot/qualify.ts';
import { selectArm } from '../../src/vg-l0-risk-envelope-pilot/select.ts';
import { assessArm, plausibleArm, screenReason, screenViolation } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { openToolLab, purposeOf, writeJson } from './common.ts';
import { codeDigest } from '../../src/vg-l0-risk-envelope-pilot/records.ts';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string, d = '') => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const purpose = purposeOf(['parity-test']);
const e3Dir = path.join(resultsDir, 'engineering', 'E3');
const readOut = (name: string) => JSON.parse(fs.readFileSync(path.join(e3Dir, name, 'result.json'), 'utf8'));

// the declared mini schedule (GPU Phase 7's: Assignment 3's broad lane at reduced counts)
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
    const key = `E3/broad/${id}/R1`;

    return { key, seedKey: key, position: key, stage: 'broad', replicate: 1, cutoff: 'E3', kind: 'indep', res: 'coarse', cell: cellOf(id) };
  });

const sealedForm = (e: Evidence) => ({ ...e, risk: { ...e.risk, rows: undefined, rowsKept: e.risk.rows.length } });

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
    const record: Record<string, unknown> = { kind: 'E3 mini-pilot (non-official)', codeDigest: t.lab.digest, backend: t.backendId, door: 'D19', budget: miniBudget, laneBound: miniBound, arms: {} };

    for (const a of armKeys) {
      const { results, rounds } = await runLanes(t.lab, miniSpecs(), miniBudget, arms[a], miniBound, Number.MAX_SAFE_INTEGER, 0, `E3 ${a}`);

      (record.arms as Record<string, unknown>)[a] = { lanes: results, rounds };
    }
    if (args.includes('--a3')) {
      // Assignment 3's own lane on the same specs, every evaluation with the risk envelope (its code never reads it)
      const riskLab = {
        evalMany: (items: Parameters<typeof t.lab.evalMany>[0], tag?: string) => t.lab.evalMany(items.map((x) => ({ ...x, risk: true })), tag),
        store: t.lab.store,
        checkpoint: (p: Record<string, unknown>) => t.lab.checkpoint(p)
      };
      const lanes = miniSpecs().map((s) => new A3Lane(riskLab as never, s, miniBudget));

      await Promise.all(lanes.map((l) => l.base()));
      // the same barrier rule as runLanes (no resource guard: unbounded cap)
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

    // the union of both arms' shortlists, qualified with the real instrument (cutoff label E3)
    const byId = new Map<string, Evidence['shortlistedBy'][number][]>();
    const cfgs = new Map<string, Cfg>();

    for (const a of armKeys)
      for (const l of ((record.arms as Record<string, { lanes: { key: string; replicate: number; shortlist: { pick: string; cfg: Cfg }[] }[] }>)[a]!).lanes)
        l.shortlist.forEach((p, i) => {
          const c = canonicalCfg(p.cfg);
          const id = cfgId(c);

          cfgs.set(id, c);
          (byId.get(id) ?? byId.set(id, []).get(id)!).push({ arm: a, label: `${a} ${l.key}#${i + 1} ${p.pick}`, lane: l.key, pick: p.pick });
        });

    const members = [...byId.entries()].map(([id, by]) => ({ label: by[0]!.label, lane: by[0]!.lane, stage: 'broad' as const, track: 'I' as const, replicate: 1, cfg: cfgs.get(id)!, pick: by[0]!.pick, shortlistedBy: by }));
    const { evidence, requested } = await qualifyMembers(t.lab, members, 'E3');

    record.qualification = { members: members.length, requested, evidence: evidence.map(sealedForm) };
    record.selection = Object.fromEntries(armKeys.map((a) => [a, selectArm(evidence, a)]));
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
    console.log(JSON.stringify({ name, backend, archived: rows.length, minutes: record.minutes, primaries: Object.fromEntries(armKeys.map((a) => [a, (record.selection as Record<string, { primaries: unknown }>)[a]!.primaries])) }));
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
  const view = (r: Record<string, unknown>) => ({ arms: r.arms, qualification: r.qualification, selection: r.selection, ...(r.a3Ctrl ? { a3Ctrl: r.a3Ctrl } : {}) });
  const diffs = deepDiff(view(A), view(B), '$', [], 40);
  const lanesOnly = args.includes('--lanes-only');
  const rowsA = fs.readFileSync(path.join(e3Dir, a, 'archive.txt'), 'utf8');
  const rowsB = fs.readFileSync(path.join(e3Dir, b, 'archive.txt'), 'utf8');
  const archiveSame = rowsA === rowsB;
  const rec = {
    kind: 'E3 comparison',
    a: { name: a, backend: A.backend, archive: A.archive },
    b: { name: b, backend: B.backend, archive: B.archive },
    differences: diffs.map((d) => ({ path: d.path })),
    archiveIdentical: lanesOnly ? null : archiveSame,
    identical: diffs.length === 0 && (lanesOnly || archiveSame)
  };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ identical: rec.identical, diffs: diffs.length, archiveIdentical: rec.archiveIdentical }));
  process.exitCode = rec.identical ? 0 : 2;
};

const a3check = () => {
  const r = readOut(args[1]!);
  const mine = (r.arms as Record<string, { lanes: unknown[] }>).CTRL!.lanes;
  const diffs = deepDiff(stripEnvelopes(r.a3Ctrl), stripEnvelopes(mine), '$', [], 40);
  const rec = { kind: 'E3: the pilot CTRL lane = Assignment 3 lane (mini specs, envelope requested, stripped)', run: args[1], lanes: mine.length, differences: diffs.map((d) => ({ path: d.path })), identical: diffs.length === 0 && mine.length === cells.length };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ identical: rec.identical, diffs: diffs.length }));
  process.exitCode = rec.identical ? 0 : 2;
};

// the threshold-edge engineering subjects: records + envelopes + every arm decision on both backends
const edge = async () => {
  const door = opt('door') as 'D21' | 'D24';
  const subjFile = path.join(researchDir, '..', 'gpu-phase7', 'results', 'risk-parity', `edge-subjects-${door}.json`);
  const subj = JSON.parse(fs.readFileSync(subjFile, 'utf8')) as { door: string; subjects: { id: string; sel: string; cfg: Cfg }[] };

  if (subj.door !== door) throw new Error('edge subjects of another door');

  const cfgList = subj.subjects.map((s) => ({ sel: s.sel, cfg: canonicalCfg(s.cfg) }));
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
    cfgList.map((s, i) => {
      const base = recs[2 * i]!;
      const s10 = recs[2 * i + 1]!;

      return Object.fromEntries(
        armKeys.map((a) => [
          a,
          {
            plausible: plausibleArm(base, arms[a]),
            screenViolation: plausibleArm(base, arms[a]) ? 0 : screenViolation(base, arms[a]),
            reason: screenReason(base, arms[a]),
            assess: assessArm(base, arms[a]),
            q5: s10.net > 0 && assessArm(s10, arms[a]).pass
          }
        ])
      );
    });

  g.recs.forEach((r, i) => {
    if (createHash('sha256').update(encode(r)).digest('hex') !== createHash('sha256').update(encode(c.recs[i])).digest('hex')) recordDiffs++;
  });

  const dg = decisions(g.recs);
  const dc = decisions(c.recs);
  const decisionDiffs = deepDiff(dg, dc, '$', [], 40);
  const rank = (recs: SRec[], a: 'CTRL' | 'EXP') =>
    rankOrder(cfgList.map((s, i) => ({ id: cfgId(s.cfg), genome: [], objectives: [-recs[2 * i]!.net, recs[2 * i]!.dd], violation: plausibleArm(recs[2 * i]!, arms[a]) ? 0 : screenViolation(recs[2 * i]!, arms[a]) }))).map((x) => x.id);
  const rankingsIdentical = armKeys.every((a) => JSON.stringify(rank(g.recs, a)) === JSON.stringify(rank(c.recs, a)));
  const overlap = { both: 0, ctrlOnly: 0, expOnly: 0, neither: 0 };
  const expFail: Record<string, number> = {};

  for (const d of dg) {
    const k = d.CTRL!.plausible ? (d.EXP!.plausible ? 'both' : 'ctrlOnly') : d.EXP!.plausible ? 'expOnly' : 'neither';

    overlap[k]++;
    if (!d.EXP!.plausible) expFail[d.EXP!.reason] = (expFail[d.EXP!.reason] ?? 0) + 1;
  }

  const rec = {
    kind: 'E3 threshold-edge engineering subjects (non-official; Phase 7 edge subjects, never candidates)',
    door,
    subjects: { file: path.relative(path.join(researchDir, '..', '..'), subjFile), n: cfgList.length },
    backends: { gpu: g.backend, cpu: c.backend },
    evaluations: g.recs.length,
    recordDifferences: recordDiffs,
    decisionDifferences: decisionDiffs.map((d) => ({ path: d.path })),
    rankingsIdentical,
    plausibilityOverlap: overlap,
    expFailureReasons: expFail,
    identical: recordDiffs === 0 && decisionDiffs.length === 0 && rankingsIdentical
  };

  writeJson(opt('out'), rec);
  console.log(JSON.stringify({ identical: rec.identical, recordDiffs, decisionDiffs: decisionDiffs.length, rankingsIdentical, overlap }));
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
      const s = new Store(file, { binding: { study: 'research/vg-l0-risk-envelope-pilot', job: name, door: 'D19', doorPin: 'x', codeDigest: 'x', backend: r.backend, ...x.binding } as never });

      s.close();
      return { what: x.what, refused: false, error: null };
    } catch (e) {
      return { what: x.what, refused: true, error: (e as Error).message.slice(0, 200) };
    }
  });
  const rec = { kind: 'E3 archive identity', archive: path.relative(path.join(researchDir, '..', '..'), file), rows, pass: rows.every((x) => x.refused) };

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
