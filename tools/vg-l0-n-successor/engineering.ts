// P5-NS engineering gates and the pilot (PROTOCOL.md §13, §7.6) — NON-OFFICIAL (GPU_POLICY_PURPOSE parity-test |
// benchmark | cpu-reference), never an outcome-producing search, never official optimization evidence. Engineering output
// is equality counts, pass/fail, hashes, counts and timings: no net, drawdown or P&L of a non-reference configuration is
// printed or written (the references New L0 and N/original are compared with their sealed, published figures).
// Commands (repository root, `GPU_POLICY_PURPOSE=<purpose> npm run vg-l0ns-eng -- <command>`):
//   e1                     acceptance verification (independent verifier, out-of-band pin) and the entrypoint audit
//   e2                     the references on GPU and CPU (D19–D24; FULL known-target) = sealed figures; their C24
//                          qualification evidence on the GPU = Assignment 3's sealed evidence (the same instrument)
//   e3                     Assignment 3's sealed lanes reproduced by this study's lane runner on the GPU: 8 broad lanes
//                          (C19, R1), the legacy refinement lane (C19, R1) and N/original's own lane C24/informed/GD.VB/R2
//   e4                     CPU/GPU record parity on random configurations of the study's domain × its option sets
//   e5                     determinism: a mini lane set on the GPU twice (one interrupted and resumed) and on the CPU
//   e6                     the sequential statistic (sequential.ts) from GPU slice rows against the CPU exact minute chain
//   pilot                  the benchmark (BENCH seed keys): 128 broad lanes on D21, 16 informed lanes on D24 → expected
//   record --gate E7|E8 --log <file> --known <n>   a test-suite result
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { plain } from '../../src/vg-l0-full-joint/records.ts';
import { stripEnvelopes } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { budgets, laneWorstCase } from '../../src/vg-l0-full-joint/budgets.ts';
import { projectedSeeds as a3ProjectedSeeds } from '../../src/vg-l0-full-joint/informed.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { foldRun } from '../../src/vg-l0-full-joint/folds.ts';
import { sequentialDrawdown } from '../../src/vg-d1-growth-joint/post.ts';
import { type Cfg, allCells, allPairs, canonicalCfg, cellOf, cfgId, decode, pinStratum, screenGenomes } from '../../src/vg-l0-full-joint/space.ts';
import type { DRec, SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import type { LaneResult, LaneSpec } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { enabledOf, removalsOf } from '../../src/vg-l0-risk-families/qualify.ts';
import { audit, registryFile } from '../../src/gpu-backend/entrypoints.ts';
import { cutoffs, repoRoot, researchDir, resultsDir } from '../../src/vg-l0-n-successor/context.ts';
import { references } from '../../src/vg-l0-n-successor/incumbents.ts';
import { projectedSeeds } from '../../src/vg-l0-n-successor/informed.ts';
import { type Evidence, qualifyMembers, stresses } from '../../src/vg-l0-n-successor/qualify.ts';
import { runLanes, stopReasons } from '../../src/vg-l0-n-successor/lanes.ts';
import { laneCaps, nl0Caps, perMemberCap, perSubject, replicates, schedules } from '../../src/vg-l0-n-successor/budget.ts';
import { type SliceRow, chain } from '../../src/vg-l0-n-successor/sequential.ts';
import { codeDigest } from '../../src/vg-l0-n-successor/records.ts';
import { openToolLab, purposeOf, writeJson as writeJson0 } from './common.ts';

// every engineering record carries the study code digest it ran under and the rerun tag
const writeJson = (file: string, value: Record<string, unknown>) => writeJson0(file, { ...value, codeDigest: codeDigest(), tag: process.env.P5_ENG_TAG ?? null });

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string, d = '') => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const engDir = path.join(resultsDir, 'engineering');
const outFile = (name: string) => path.join(engDir, name);
const now = () => new Date().toISOString();
const a3Dir = path.join(repoRoot, 'research', 'vg-l0-full-joint');
// reruns of the gates on the final committed code use fresh job names (an archive is bound to the code digest)
const TAG = process.env.P5_ENG_TAG ? `-${process.env.P5_ENG_TAG}` : '';
const J = (name: string) => `${name}${TAG}`;
const readJ = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;

// ----- E1: the acceptance, independently verified, and the entrypoint audit -----

const e1 = () => {
  purposeOf(['parity-test']);

  const pin = 'bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7';
  let out = '';
  let ok = false;

  try {
    out = execFileSync(path.join(repoRoot, 'tools/gpu-backend/verify-acceptance.sh'), ['--rebuild', '--device', '--expect-record-sha256', pin], { cwd: repoRoot, encoding: 'utf8', timeout: 1_800_000 });
    ok = /\nVERIFIED\s*$/.test(out);
  } catch (e) {
    out = String((e as { stdout?: string }).stdout ?? e);
  }

  const problems = audit(readJ(registryFile));
  const pinFile = path.join(process.env.HOME!, '.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json');
  const pinOk = fs.existsSync(pinFile) && execFileSync('sha256sum', [pinFile], { encoding: 'utf8' }).startsWith(pin);
  const record = {
    gate: 'E1',
    what: 'the acceptance record in force (GPU Phase 7, research/gpu-phase7) verified by the independent verifier with a reproducible rebuild, the device and the record sha256 kept out of band; the entrypoint audit of src/ (this study is an official entrypoint through src/gpu-backend/official.ts)',
    verifier: out.trim().split('\n'),
    verified: ok,
    outOfBandPin: { file: pinFile, sha256: pin, matches: pinOk },
    entrypointAudit: { problems },
    pass: ok && pinOk && problems.length === 0,
    finished: now()
  };

  writeJson(outFile('E1-acceptance.json'), record);
  console.log(JSON.stringify({ E1: record.pass, verified: ok, pinOk, problems: problems.length }));
};

// ----- E2: the references -----

const refRow = (r: SRec | DRec) => ({ id: r.id, net: r.net, dd: r.dd, lots: r.lots, signature: r.signature });

const e2 = async () => {
  const purpose = purposeOf(['parity-test']);
  const refs = references();
  const doors = ['D19', 'D21', 'D23', 'D24', 'FULL'] as const;
  const rows: Record<string, unknown>[] = [];
  let pass = true;

  for (const door of doors) {
    const p = door === 'FULL' ? 'known-target reproduction of New L0 and N/original (equality with their sealed full-history figures)' : `${purpose}: E2 references`;
    const recs: Record<string, (SRec | DRec)[]> = {};

    for (const backend of ['gpu', 'cpu'] as const) {
      const t = await openToolLab({ backend, door, area: 'engineering', job: J(`E2-${door}-${backend}`), purpose: p, cpuWorkers: 4, ledger: path.join(engDir, 'E2', `${door}-${backend}${TAG}-receipts.jsonl`) });

      try {
        recs[backend] = await t.lab.evalMany<SRec>(
          (['NORIG', 'NL0'] as const).flatMap((k) => [
            { cfg: refs[k].cfg, options: vOptions, detail: true, risk: true },
            { cfg: refs[k].cfg, options: vOptions, risk: true }
          ]),
          `E2 ${door}`
        );
      } finally {
        await t.close();
      }
    }

    (['NORIG', 'NL0'] as const).forEach((k, i) => {
      const g = recs.gpu!.slice(2 * i, 2 * i + 2);
      const c = recs.cpu!.slice(2 * i, 2 * i + 2);
      const diffs = [...deepDiff(plain(c[0]), plain(g[0])), ...deepDiff(plain(c[1]), plain(g[1]))];
      const sealed = door === 'D24' ? refs[k].sealed.development : door === 'FULL' ? refs[k].sealed.full : null;
      const matchesSealed = sealed
        ? Math.round(g[1]!.net * 100) === Math.round(sealed.net * 100) && Math.round(g[1]!.dd * 100) === Math.round(sealed.dd * 100) && g[1]!.lots === sealed.lots && (!('signature' in sealed) || g[1]!.signature === sealed.signature)
        : null;

      if (diffs.length || matchesSealed === false || g[1]!.id !== refs[k].id) pass = false;
      rows.push({ door, reference: refs[k].label, cpuGpuDifferences: diffs.length, firstDifferences: diffs.slice(0, 5), gpu: refRow(g[1]!), sealed, matchesSealed });
    });
  }

  // the C24 qualification evidence of the two references on the GPU = Assignment 3's sealed evidence (same instrument)
  const a3c24 = readJ<{ evidence: (Evidence & { label: string })[] }>(path.join(a3Dir, 'results/folds/C24/broad-qualification.json')).evidence;
  const a3inf = readJ<{ evidence: (Evidence & { label: string })[] }>(path.join(a3Dir, 'results/folds/C24/informed-qualification.json')).evidence;
  const t = await openToolLab({ backend: 'gpu', door: 'D24', area: 'engineering', job: J('E2-qualify-D24-gpu'), purpose: `${purpose}: E2 reference qualification`, ledger: path.join(engDir, 'E2', 'qualify' + `${TAG}-receipts.jsonl`) });
  let evid: Evidence[];

  try {
    evid = (
      await qualifyMembers(
        t.lab,
        (['NORIG', 'NL0'] as const).map((k) => ({ label: refs[k].label, lane: 'control', stage: 'control', track: 'control', replicate: null, cfg: refs[k].cfg, pick: refs[k].label, sources: [] })),
        'C24'
      )
    ).evidence;
  } finally {
    await t.close();
  }

  const fields = ['select', 'confirm', 'selectTail', 'confirmTail', 'gates', 'qualified'] as const;
  const qual = (['NORIG', 'NL0'] as const).map((k, i) => {
    const sealed = [...a3inf, ...a3c24].find((e) => e.id === refs[k].id)!;
    const diffs = fields.flatMap((f) => deepDiff(plain(sealed[f]), plain(stripEnvelopes(evid[i]![f])), `$.${f}`));
    const centre = deepDiff(plain(sealed.centre), plain(stripEnvelopes(evid[i]!.centre)), '$.centre');

    if (diffs.length || centre.length) pass = false;
    return { reference: refs[k].label, a3Label: sealed.label, differences: diffs.length + centre.length, first: [...diffs, ...centre].slice(0, 5) };
  });

  const record = {
    gate: 'E2',
    what: 'New L0 and N/original through this study’s path: GPU = CPU (every record field, the envelope included) on D19, D21, D23, D24 and FULL (detailed and compact), = the sealed development (D24) and full-history (FULL, known-target reproduction) figures; and their C24 qualification evidence on the GPU = Assignment 3’s sealed evidence field by field (centre, selection and confirmation families, tails, gates)',
    rows,
    qualification: qual,
    pass,
    finished: now()
  };

  writeJson(outFile('E2-references.json'), record);
  console.log(JSON.stringify({ E2: pass, rows: rows.map((r) => `${r.door} ${r.reference}: cpu≠gpu ${r.cpuGpuDifferences}, sealed ${r.matchesSealed}`), qual }));
};

// ----- E3: Assignment 3's sealed lanes reproduced -----

const a3Lane = (cut: string, part: string, key: string) => readJ<{ lanes: LaneResult[] }>(path.join(a3Dir, 'results/search', cut, `${part}.json`)).lanes.find((l) => l.key === key)!;
const capLabelA3 = 'extension cap reached (a trigger still fired: budget-bound, not converged)';

const compareLane = (sealed: LaneResult, mine: LaneResult) => {
  const ours = stripEnvelopes(mine) as LaneResult;
  const capMapped = sealed.extension.stop === capLabelA3 && (ours.extension.stop === stopReasons.capped || ours.extension.stop === stopReasons.classOnly);
  const masked = capMapped ? { ...ours, extension: { ...ours.extension, stop: sealed.extension.stop } } : ours;
  const diffs = deepDiff(plain(sealed), plain(masked), '$', [], 40);

  return { lane: sealed.key, identical: diffs.length === 0, capMapped, ourStop: ours.extension.stop, differences: diffs.map((d) => d.path), requested: [sealed.requested, mine.requested] };
};

const e3 = async () => {
  const purpose = purposeOf(['parity-test']);
  const cells = ['GA0.VA0', 'GB0.VD1', 'GD1.VB0', 'GC1.VD1', 'GB1.VB1', 'GA1.VC0', 'GD0.VA1', 'GC0.VC0'];
  const rows: ReturnType<typeof compareLane>[] = [];
  const a3Override = (k: 'broad' | 'refine' | 'informed', designs: number, focus: number) => ({
    schedule: budgets.study[k],
    laneCap: Math.ceil(laneWorstCase(budgets.study[k], designs, focus) / 1000) * 1000,
    nl0Cap: budgets.study[k].islandsMax
  });

  // (a) 8 broad lanes (C19, R1) and (b) the legacy refinement lane C19/refine/GA0.VA0/R1 together on D19; (c) N/original's own
  // lane C24/informed/GD.VB/R2 on D24 concurrently (few lanes in flight: latency-bound, so they share the time)
  const plan = readJ<{ cells: { cell: string; seeds: string[]; focus: string[] }[] }>(path.join(a3Dir, 'results/folds/C19/refine-plan.json'));
  const broadEv = readJ<{ evidence: { label: string; cfg: Cfg }[] }>(path.join(a3Dir, 'results/folds/C19/broad-qualification.json')).evidence;
  const pr = plan.cells.find((c) => c.cell === 'GA0.VA0')!;
  const rkey = 'C19/refine/GA0.VA0/R1';
  const refineSpec: LaneSpec = {
    key: rkey,
    seedKey: rkey,
    position: rkey,
    stage: 'refine',
    replicate: 1,
    cutoff: 'C19',
    kind: 'refine',
    res: 'fine',
    cell: cellOf('GA0.VA0'),
    seeds: pr.seeds.map((label) => ({ label, cfg: canonicalCfg(broadEv.find((e) => e.label === label)!.cfg), focus: pr.focus.includes(label) }))
  };
  const broadSpecs: LaneSpec[] = cells.map((c) => {
    const key = `C19/broad/${c}/R1`;

    return { key, seedKey: key, position: key, stage: 'broad', replicate: 1, cutoff: 'C19', kind: 'indep', res: 'coarse', cell: cellOf(c) };
  });
  const ikey = 'C24/informed/GD.VB/R2';
  const informedSpec: LaneSpec = { key: ikey, seedKey: ikey, position: ikey, stage: 'informed', replicate: 2, cutoff: 'C24', kind: 'informed', res: 'fine', pair: 'GD.VB', seeds: a3ProjectedSeeds('GD.VB', 2) };
  const d19 = async () => {
    const t = await openToolLab({ backend: 'gpu', door: 'D19', area: 'engineering', job: J('E3-C19'), purpose: `${purpose}: E3 Assignment 3 broad and refinement lanes`, ledger: path.join(engDir, 'E3', 'C19' + `${TAG}-receipts.jsonl`) });

    try {
      const [a, b] = await Promise.all([
        runLanes(t.lab, broadSpecs, 'broad', 'E3 broad', a3Override('broad', 0, 0)),
        runLanes(t.lab, [refineSpec], 'refine', 'E3 refine', a3Override('refine', 6 * 25 + 2 * 128, 2))
      ]);

      for (const r of a.results) {
        const cellIdx = allCells.findIndex((c) => c.id === r.structure);

        rows.push(compareLane(a3Lane('C19', cellIdx < 32 ? 'broad1' : 'broad2', r.key), r));
      }
      rows.push(compareLane(a3Lane('C19', 'refine', rkey), b.results[0]!));
    } finally {
      await t.close();
    }
  };
  const d24 = async () => {
    const t = await openToolLab({ backend: 'gpu', door: 'D24', area: 'engineering', job: J('E3-C24'), purpose: `${purpose}: E3 Assignment 3 informed lane (N/original's)`, ledger: path.join(engDir, 'E3', 'C24' + `${TAG}-receipts.jsonl`) });

    try {
      const { results } = await runLanes(t.lab, [informedSpec], 'informed', 'E3 informed', a3Override('informed', 16 * 25 + 2 * 128, 2));
      const r = compareLane(a3Lane('C24', 'informed2', ikey), results[0]!);
      const nOrig = results[0]!.shortlist.find((x) => x.id === references().NORIG.id);

      rows.push({ ...r, identical: r.identical && Boolean(nOrig), differences: [...r.differences, ...(nOrig ? [] : ['N/original not in the reproduced shortlist'])] });
    } finally {
      await t.close();
    }
  };

  await Promise.all([d19(), d24()]);

  const record = {
    gate: 'E3',
    what: 'Assignment 3’s sealed CPU lanes reproduced by this study’s lane runner (src/vg-l0-n-successor/lanes.ts runLanes over the pilot’s lane, P0) on the GPU with Assignment 3’s own schedules (NL0’s caps): 8 broad lanes of 8 structurally different cells (C19, R1), the legacy refinement lane (C19, R1) and N/original’s own lane C24/informed/GD.VB/R2 — every lane-result field identical after removing the envelope (Assignment 3 had none); a lane that Assignment 3 labelled “extension cap reached” carries this study’s finer label at the same cap',
    rows,
    pass: rows.every((r) => r.identical),
    finished: now()
  };

  writeJson(outFile('E3-a3-lanes.json'), record);
  console.log(JSON.stringify({ E3: record.pass, rows: rows.map((r) => `${r.lane}: ${r.identical ? 'identical' : `DIFF ${r.differences.slice(0, 3).join(',')}`}`) }));
};

// ----- E4: CPU/GPU parity on the study's domain -----

const randomConfigs = (label: string, perCell: number, res: 'coarse' | 'fine') => {
  const out: Cfg[] = [];
  const seen = new Set<string>();

  allCells.forEach((cell, ci) => {
    const gs = screenGenomes(perCell * 4, res, 'P5-NS-E4', label, ci).map((g, i) => pinStratum(g, cell, i, perCell * 4));

    let k = 0;

    for (const g of gs) {
      if (k >= perCell) break;
      try {
        const c = decode(g, res);
        const id = cfgId(c);

        if (seen.has(id)) continue;
        seen.add(id);
        out.push(canonicalCfg(c));
        k++;
      } catch {
        // an invalid genome (repaired orders): skipped
      }
    }
  });
  return out;
};

const e4 = async () => {
  const purpose = purposeOf(['parity-test']);
  const doors = ['D19', 'D21', 'D23', 'D24'] as const;
  const boundaryOf: Record<string, string> = { D19: '2018-12-31', D21: '2019-12-31', D23: '2021-12-31', D24: '2023-12-29' };
  const rows: Record<string, unknown>[] = [];
  let pass = true;

  for (const door of doors) {
    const cfgs = [...randomConfigs(door, 3, 'coarse'), ...randomConfigs(`${door}-fine`, 1, 'fine'), references().NORIG.cfg, references().NL0.cfg];
    type It = { cfg: Cfg; options: typeof vOptions; detail?: boolean; risk?: true };
    const items: It[] = [];
    const removals = Object.values(removalsOf(enabledOf(vOptions)));

    cfgs.forEach((c, i) => {
      items.push({ cfg: c, options: vOptions, detail: true, risk: true }, { cfg: c, options: vOptions, risk: true });
      const sk = Object.values(stresses);

      items.push({ cfg: c, options: { ...vOptions, friction: { ...sk[i % sk.length]! } }, risk: true });
      items.push({ cfg: c, options: { ...vOptions, enabled: { ...vOptions.enabled, ...Object.fromEntries(removals[i % removals.length]!.map((b) => [b, false])) } }, risk: true });
      items.push({ cfg: c, options: { ...vOptions, boundaries: [boundaryOf[door]!] }, risk: true });
      // a 16-boundary run (the session-close series of the slice stage): the placeholder [] becomes the 16 sessions after
      // the boundary once the door is open
      if (i % 4 === 0) items.push({ cfg: c, options: { ...vOptions, boundaries: [] } });
    });

    const recs: Record<string, SRec[]> = {};
    let dates: string[] = [];

    for (const backend of ['gpu', 'cpu'] as const) {
      const t = await openToolLab({ backend, door, area: 'engineering', job: J(`E4-${door}-${backend}`), purpose: `${purpose}: E4 parity`, cpuWorkers: 12, ledger: path.join(engDir, 'E4', `${door}-${backend}${TAG}-receipts.jsonl`) });

      try {
        if (!dates.length) dates = t.door.dates.filter((d) => d > boundaryOf[door]!).slice(0, 16);
        const its = items.map((x) => (x.options.boundaries && x.options.boundaries.length === 0 ? { ...x, options: { ...x.options, boundaries: dates } } : x));

        recs[backend] = await t.lab.evalMany<SRec>(its, `E4 ${door}`);
      } finally {
        await t.close();
      }
    }

    let diff = 0;
    const first: unknown[] = [];

    recs.gpu!.forEach((g, i) => {
      const d = deepDiff(plain(recs.cpu![i]), plain(g), `$[${i}]`, [], 5);

      if (d.length) {
        diff++;
        if (first.length < 5) first.push(...d.slice(0, 2));
      }
    });
    if (diff) pass = false;
    rows.push({ door, configurations: cfgs.length, evaluations: items.length, differing: diff, first, sixteenBoundaryRuns: items.filter((x) => x.options.boundaries?.length === 0).length });
  }

  const record = {
    gate: 'E4',
    what: 'CPU/GPU parity of every record field (detailed and compact records, the risk envelope) on random configurations of the study’s reachable domain — all 64 cells, coarse and fine grids, Growth strata as the screen strata produce them — and the references, under the study’s option sets: base, each of the 8 stresses (cost 0/2/10/20 bps, 14 % interest, stop slippage +10/+25 bps, next-open stops), each causal removal, a cutoff boundary and a 16-boundary session-close series; on D19, D21, D23 and D24',
    rows,
    pass,
    finished: now()
  };

  writeJson(outFile('E4-parity.json'), record);
  console.log(JSON.stringify({ E4: pass, rows: rows.map((r) => `${r.door}: ${r.differing}/${r.evaluations} differ`) }));
};

// ----- E5: determinism (GPU twice, one interrupted and resumed; CPU) -----

const miniBroad = { ...budgets.study.broad, screen: 96, promote: 12, islands: 2, islandsMax: 5, population: 8, newPerIsland: 24, r1: 8, r2: 16, r2Keep: 4, r3: 24, r3Keep: 2, refineN: 6, shortlist: 2, generations: 40, patience: 4 };
const miniSeeded = { ...budgets.study.informed, islands: 2, islandsMax: 5, population: 8, newPerIsland: 24, r1: 8, r2: 16, r2Keep: 4, r3: 24, r3Keep: 2, refineN: 6, shortlist: 3, near: 2, broad: 2, focusSmall: 4, focusMid: 4, generations: 40, patience: 4 };

const e5Run = async (name: string, backend: 'gpu' | 'cpu', stopAfterFresh?: number) => {
  const purpose = purposeOf(['parity-test']);
  const t = await openToolLab({ backend, door: 'D19', area: 'engineering', job: J(name), purpose: `${purpose}: E5 determinism`, cpuWorkers: 12, stopAfterFresh, ledger: path.join(engDir, 'E5', `${name}${TAG}-receipts.jsonl`) });

  try {
    const broad: LaneSpec[] = ['GA0.VA0', 'GD1.VB0', 'GC1.VD1'].map((c) => {
      const key = `E5/broad/${c}/R1`;

      return { key, seedKey: key, position: key, stage: 'broad', replicate: 1, cutoff: 'E5', kind: 'indep', res: 'coarse', cell: cellOf(c) };
    });
    const inf: LaneSpec = { key: 'E5/informed/GD.VB/R1', seedKey: 'E5/informed/GD.VB/R1', position: 'E5/informed/GD.VB/R1', stage: 'informed', replicate: 1, cutoff: 'E5', kind: 'informed', res: 'fine', pair: 'GD.VB', seeds: projectedSeeds('GD.VB', 1).slice(0, 4) };
    const a = await runLanes(t.lab, broad, 'broad', 'E5 broad', { schedule: miniBroad, laneCap: laneWorstCase(miniBroad, 0, 0), nl0Cap: 3 });
    const b = await runLanes(t.lab, [inf], 'informed', 'E5 informed', { schedule: miniSeeded, laneCap: laneWorstCase(miniSeeded, 4 * 5 + 2 * 8, 2), nl0Cap: 3 });

    return { lanes: [...a.results, ...b.results].map((r) => stripEnvelopes(r)), rounds: [a.rounds, b.rounds] };
  } finally {
    await t.close();
  }
};

const e5 = async () => {
  const sub = opt('step');

  if (sub === 'interrupted') {
    try {
      await e5Run('E5-gpu-b', 'gpu', 400);
      console.log('E5: the interrupted run was not interrupted');
    } catch (e) {
      console.log(`E5: interrupted as planned (${(e as Error).message.slice(0, 80)})`);
    }
    return;
  }

  const a = await e5Run('E5-gpu-a', 'gpu');
  const b = await e5Run('E5-gpu-b', 'gpu'); // resumes the interrupted job's archive
  const c = await e5Run('E5-cpu', 'cpu');
  const ab = deepDiff(plain(a), plain(b));
  const ac = deepDiff(plain(a), plain(c));
  const record = {
    gate: 'E5',
    what: 'a fixed-seed mini lane set (3 broad cells including two gated, protected cells, and one N/original-seeded informed lane with the two-tier extension rule) on D19: GPU run A; GPU run B interrupted after 400 fresh evaluations and resumed from its archive; the CPU reference run — every lane result and extension decision identical',
    gpuVsResumedGpu: { differences: ab.length, first: ab.slice(0, 5) },
    gpuVsCpu: { differences: ac.length, first: ac.slice(0, 5) },
    pass: ab.length === 0 && ac.length === 0,
    finished: now()
  };

  writeJson(outFile('E5-determinism.json'), record);
  console.log(JSON.stringify({ E5: record.pass, ab: ab.length, ac: ac.length }));
};

// ----- E6: the sequential statistic against the CPU exact minute chain -----

const sliceRowOf = (label: string, cfg: Cfg, boundary: string, detail: DRec, centre: SRec, closes: { date: string; equity: number }[]): SliceRow => ({
  label,
  id: cfgId(cfg),
  boundary,
  boundaryEquity: centre.periods[0]!.equity,
  sliceNet: centre.periods[0]!.after,
  sliceDd: centre.periods[0]!.dd,
  closes,
  lots: detail.risk.rows.map((x) => ({ book: x.book, entry: x.entry, exit: x.exit, net: x.net, mae: x.mae, maeAt: x.maeAt }))
});

const e6 = async () => {
  const purpose = purposeOf(['parity-test']);
  const folds = ['C19', 'C21', 'C23'] as const;
  const subjects = [
    { label: 'N/original', cfg: references().NORIG.cfg },
    { label: 'New L0', cfg: references().NL0.cfg },
    ...randomConfigs('E6', 1, 'coarse')
      .filter((_c, i) => i % 16 === 3)
      .map((cfg, i) => ({ label: `E6 random ${i + 1}`, cfg }))
  ];
  const gpuRows: Record<string, Record<string, SliceRow>> = {};
  const cpuMarks: Record<string, Record<string, { t: number[]; v: number[]; sliceNet: number; sliceDd: number; openAtBoundary: number; openAtEnd: number }>> = {};

  for (const f of folds) {
    const spec = cutoffs[f];
    const t = await openToolLab({ backend: 'gpu', door: spec.sliceDoor as never, area: 'engineering', job: J(`E6-${f}-gpu`), purpose: `${purpose}: E6 sequential statistic`, ledger: path.join(engDir, 'E6', `${f}${TAG}-receipts.jsonl`) });

    try {
      const dates = t.door.dates.filter((d) => d > spec.end);
      const chunks = Array.from({ length: Math.ceil(dates.length / 16) }, (_v, i) => dates.slice(i * 16, i * 16 + 16));
      const opts = { ...vOptions, boundaries: [spec.end] };

      for (const s of subjects) {
        const recs = await t.lab.evalMany<SRec>(
          [{ cfg: s.cfg, options: opts, detail: true }, { cfg: s.cfg, options: opts }, ...chunks.map((c) => ({ cfg: s.cfg, options: { ...vOptions, boundaries: c } }))],
          `E6 ${f}`
        );
        const closes = recs.slice(2).flatMap((r) => r.periods.map((p) => ({ date: p.boundary, equity: p.equity })));

        (gpuRows[s.label] ??= {})[f] = sliceRowOf(s.label, s.cfg, spec.end, recs[0] as DRec, recs[1]!, closes);
      }

      // the CPU exact minute marks (purpose cpu-reference, this process; Assignment 3's own foldRun)
      for (const s of subjects) {
        const x = foldRun(t.door, s.cfg, spec.end);

        (cpuMarks[s.label] ??= {})[f] = { t: x.t, v: x.v, sliceNet: x.sliceNet, sliceDd: x.sliceDd, openAtBoundary: x.openAtBoundary.length, openAtEnd: x.openAtEnd.length };
      }
    } finally {
      await t.close();
    }
  }

  // fixed paths (one configuration in every fold) and switching paths (a different configuration per fold)
  const paths: { name: string; labels: string[] }[] = [
    ...subjects.map((s) => ({ name: `fixed ${s.label}`, labels: [s.label, s.label, s.label] })),
    ...subjects.slice(2, 6).map((s, i) => ({ name: `switching ${i + 1}`, labels: [s.label, subjects[(i + 3) % subjects.length]!.label, subjects[(i + 1) % subjects.length]!.label] }))
  ];
  const charge = 0.0005 * 100_000;
  const rows = paths.map((p) => {
    const g = chain(folds, p.labels.map((l, i) => gpuRows[l]![folds[i]!]!));
    let prev: { label: string; openAtEnd: number } | null = null;
    const slices = p.labels.map((l, i) => {
      const m = cpuMarks[l]![folds[i]!]!;
      const ch = prev && prev.label !== l ? charge * (prev.openAtEnd + m.openAtBoundary) : 0;

      prev = { label: l, openAtEnd: m.openAtEnd };
      return { t: m.t, v: m.v, charge: ch };
    });
    const exact = sequentialDrawdown(slices, 0);
    const sliceAgree = p.labels.every((l, i) => {
      const a = gpuRows[l]![folds[i]!]!;
      const b = cpuMarks[l]![folds[i]!]!;

      return Math.abs(a.sliceNet - b.sliceNet) < 0.011 && Math.abs(a.sliceDd - b.sliceDd) < 0.011;
    });

    return {
      path: p.name,
      gpuStatistic: Math.round(g.drawdown * 100) / 100,
      cpuExact: Math.round(exact.maximum * 100) / 100,
      gap: Math.round((exact.maximum - g.drawdown) * 100) / 100,
      lowerBound: g.drawdown <= exact.maximum + 0.011,
      netAgrees: Math.abs(g.net - exact.total) < 0.05,
      sliceAgree
    };
  });
  const record = {
    gate: 'E6',
    what: 'the GPU-exact sequential statistic (src/vg-l0-n-successor/sequential.ts: minute reset drawdowns inside slices, every session close, every lot minimum) computed from GPU slice rows of the frozen references and random configurations against Assignment 3’s exact minute chain (CPU reference foldRun + sequentialDrawdown, purpose parity-test): the GPU statistic is a lower bound, nets and slice figures agree to the cent; the gaps are reported (engineering configurations’ drawdown gaps only, no net)',
    rows: rows.map((r) => ({ path: r.path, gap: r.gap, lowerBound: r.lowerBound, netAgrees: r.netAgrees, sliceAgree: r.sliceAgree, ...(r.path.includes('N/original') || r.path.includes('New L0') ? { gpuStatistic: r.gpuStatistic, cpuExact: r.cpuExact } : {}) })),
    maxGap: Math.max(...rows.map((r) => r.gap)),
    pass: rows.every((r) => r.lowerBound && r.netAgrees && r.sliceAgree),
    finished: now()
  };

  writeJson(outFile('E6-chain.json'), record);
  console.log(JSON.stringify({ E6: record.pass, maxGap: record.maxGap, rows: record.rows.map((r) => `${r.path}: gap ${r.gap}`) }));
};

// ----- the pilot (benchmark): budgets and throughput -----

const cgroupPeak = () => {
  try {
    const cg = fs.readFileSync('/proc/self/cgroup', 'utf8').trim().split(':').at(-1)!;

    return Number(fs.readFileSync(path.join('/sys/fs/cgroup', cg, 'memory.peak'), 'utf8'));
  } catch {
    return null;
  }
};
const dirBytes = (d: string): number =>
  fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? dirBytes(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0) : 0;

const pilotPart = async (name: string, door: 'D21' | 'D24', kind: 'broad' | 'informed', specs: LaneSpec[]) => {
  const purpose = purposeOf(['benchmark']);
  const t0 = Date.now();
  const t = await openToolLab({ backend: 'gpu', door, area: 'pilot', job: name, purpose: `${purpose}: pilot ${name}`, ledger: path.join(engDir, 'pilot', `${name}${TAG}-receipts.jsonl`) });

  try {
    const { results, rounds } = await runLanes(t.lab, specs, kind, `pilot ${name}`);
    const wall = (Date.now() - t0) / 1000;
    const bytes = dirBytes(path.join(researchDir, 'cache', 'pilot', 'jobs', name));
    const fresh = t.lab.fresh;

    return {
      name,
      door,
      kind,
      lanes: results.map((r) => ({ key: r.key, structure: r.structure, requested: r.requested, islands: r.islands.length, stop: r.extension.stop })),
      rounds: rounds.map((r) => r.decision),
      requested: results.reduce((a, r) => a + r.requested, 0),
      fresh,
      hits: t.lab.hits,
      wallSeconds: Math.round(wall),
      requestedPerSecond: Math.round(results.reduce((a, r) => a + r.requested, 0) / wall),
      archiveBytes: bytes,
      bytesPerFresh: fresh ? Math.round(bytes / fresh) : null,
      cgroupPeakBytes: cgroupPeak(),
      rssPeakBytes: process.resourceUsage().maxRSS * 1024
    };
  } finally {
    await t.close();
  }
};

const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);

const pilot = async () => {
  const step = opt('step');
  const pilotDir = path.join(engDir, 'pilot');

  if (step === 'broad') {
    const specs: LaneSpec[] = allCells.flatMap((c) =>
      [9001, 9002].map((r) => {
        const key = `BENCH-C21/broad/${c.id}/R${r}`;

        return { key, seedKey: key, position: key, stage: 'broad' as const, replicate: r, cutoff: 'BENCH-C21', kind: 'indep' as const, res: 'coarse' as const, cell: c };
      })
    );

    writeJson(path.join(pilotDir, 'broad.json'), await pilotPart('pilot-broad-D21', 'D21', 'broad', specs));
    return;
  }
  if (step === 'informed') {
    const specs: LaneSpec[] = allPairs.map((p) => {
      const key = `BENCH-C24/informed/${p}/R9001`;

      return { key, seedKey: key, position: key, stage: 'informed' as const, replicate: 9001, cutoff: 'BENCH-C24', kind: 'informed' as const, res: 'fine' as const, pair: p, seeds: projectedSeeds(p, 1) };
    });

    writeJson(path.join(pilotDir, 'informed.json'), await pilotPart('pilot-informed-D24', 'D24', 'informed', specs));
    return;
  }

  // the summary: expected costs (the launch rule only) and Track N's replicate count by the frozen matching rule
  const b = readJ<ReturnType<typeof pilotPart> extends Promise<infer T> ? T : never>(path.join(pilotDir, 'broad.json'));
  const inf = readJ<typeof b>(path.join(pilotDir, 'informed.json'));
  const a3Mean = (cut: string, parts: string[], filter: (l: LaneResult) => boolean = () => true) =>
    mean(parts.flatMap((p) => readJ<{ lanes: LaneResult[] }>(path.join(a3Dir, 'results/search', cut, `${p}.json`)).lanes.filter(filter).map((l) => l.requested)));
  const a3Broad = Object.fromEntries(['C19', 'C21', 'C23', 'C24'].map((c) => [c, a3Mean(c, ['broad1', 'broad2'])]));
  const a3Refine = Object.fromEntries(['C19', 'C21', 'C23', 'C24'].map((c) => [c, a3Mean(c, ['refine'])]));
  const a3Informed = a3Mean('C24', ['informed1', 'informed2']);
  const broadRatio = mean(b.lanes.map((l) => l.requested)) / a3Broad.C21!;
  const informedRatio = mean(inf.lanes.map((l) => l.requested)) / a3Informed;
  // a refinement lane of this study has up to 2× Assignment 3's seeds (4 broad replicates instead of 2): + 6 × 25 designs
  const refineExtra = 6 * 25 * 17;
  const doorOf: Record<string, string> = { C19: 'D19', C21: 'D21', C23: 'D23', C24: 'D24' };
  const expected = {
    perLane: {
      broad: Object.fromEntries(Object.entries(a3Broad).map(([c, m]) => [doorOf[c]!, Math.round(m * broadRatio)])),
      refine: Object.fromEntries(Object.entries(a3Refine).map(([c, m]) => [doorOf[c]!, Math.round(m * informedRatio + refineExtra)])),
      informed: { D24: Math.round(mean(inf.lanes.map((l) => l.requested))) }
    },
    perMember: perMemberCap(),
    perSubject: perSubject()
  };
  const trackFC24 = 256 * expected.perLane.broad.D24! + 17 * replicates.refine * expected.perLane.refine.D24!;
  let rN = 4;

  while (16 * rN * expected.perLane.informed.D24! < trackFC24) rN++;

  const bound = (k: 'broad' | 'refine' | 'informed') => laneCaps[k];
  const record = {
    gate: 'E9 (pilot / benchmark)',
    what: 'the study-schedule pilot (NON-OFFICIAL, purpose benchmark, BENCH seed keys never used by the study): 128 broad lanes (64 cells × 2) on D21 and 16 Track N lanes (one per family pair) on D24 with the frozen two-tier island rule — requested per lane, islands, stop reasons, throughput, memory and archive bytes; outputs are counts and timings only (no profit or drawdown of any searched configuration was read)',
    broad: { ...b, lanes: undefined, laneSummary: summarizeLanes(b.lanes) },
    informed: { ...inf, lanes: undefined, laneSummary: summarizeLanes(inf.lanes) },
    assignment3Means: { broad: a3Broad, refine: a3Refine, informed: a3Informed },
    ratios: { broad: broadRatio, informed: informedRatio },
    expected,
    trackN: { rule: 'R_N = the smallest integer ≥ 4 such that 16 × R_N × the expected informed lane ≥ the expected Track F C24 search (256 broad lanes + 17 refined cells × 4 lanes)', trackFC24, rN, frozenInCode: replicates.informedBase, agrees: rN === replicates.informedBase },
    laneCaps: { broad: bound('broad'), refine: bound('refine'), informed: bound('informed') },
    nl0Caps,
    islandCaps: Object.fromEntries((['broad', 'refine', 'informed'] as const).map((k) => [k, schedules[k].islandsMax])),
    pass: rN === replicates.informedBase,
    finished: now()
  };

  writeJson(outFile('pilot.json'), record);
  console.log(JSON.stringify({ pilot: record.pass, expected, rN, broadRatio, informedRatio, trackFC24 }));
};

const summarizeLanes = (lanes: { structure: string; requested: number; islands: number; stop: string }[]) => {
  const byStop: Record<string, number> = {};
  const islands: Record<number, number> = {};

  for (const l of lanes) {
    byStop[l.stop] = (byStop[l.stop] ?? 0) + 1;
    islands[l.islands] = (islands[l.islands] ?? 0) + 1;
  }
  const req = lanes.map((l) => l.requested).sort((a, b) => a - b);

  return { lanes: lanes.length, meanRequested: Math.round(mean(req)), medianRequested: req[Math.floor(req.length / 2)], maxRequested: req.at(-1), byStop, islands };
};

// ----- E7 / E8: a test-suite result -----

const recordTests = () => {
  const gate = opt('gate');
  const log = opt('log');
  const known = Number(opt('known', '0'));
  const text = fs.readFileSync(log, 'utf8');
  const num = (k: string) => Number((text.match(new RegExp(`^# ${k} (\\d+)`, 'm')) ?? [])[1] ?? NaN);
  const failingFiles = [...text.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]!);
  const record = {
    gate,
    log: path.relative(repoRoot, log),
    tests: num('tests'),
    pass: num('fail') <= known,
    passed: num('pass'),
    failed: num('fail'),
    skipped: num('skipped'),
    cancelled: num('cancelled'),
    knownFailures: known,
    failing: failingFiles,
    finished: now()
  };

  writeJson(outFile(gate === 'E7' ? 'E7-tests.json' : 'E8-regression.json'), record);
  console.log(JSON.stringify(record));
};

const main = async () => {
  switch (cmd) {
    case 'e1':
      return e1();
    case 'e2':
      return e2();
    case 'e3':
      return e3();
    case 'e4':
      return e4();
    case 'e5':
      return e5();
    case 'e6':
      return e6();
    case 'pilot':
      return pilot();
    case 'record':
      return recordTests();
    default:
      throw new Error(`unknown command ${cmd ?? ''}`);
  }
};

await main();
void nl0Caps;
