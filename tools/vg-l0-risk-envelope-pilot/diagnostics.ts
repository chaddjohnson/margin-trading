// The risk-envelope pilot's NONBINDING CPU diagnostics (PROTOCOL.md §14; DIAGNOSTICS_SPEC.md; SCALING_CHECKS.md), run
// after the official stages, through the legacy-runner purpose gate (GPU_POLICY_PURPOSE=diagnostic):
//   population --cutoff C21|C24   D1 / D2 / D3 / DD^L / CPU envelope of the recorded populations of BOTH arms on the
//                                 training door: every distinct rung-2, rung-3, refinement-endpoint, shortlisted, top-net,
//                                 frontier and visible-infeasible centre of each lane (ids from the sealed search records,
//                                 configurations from the census's archive copy), the qualified members and benchmarks
//   primaries --cutoff C21|C24    the frozen primaries and benchmarks: training and interval diagnostics (interval-window
//                                 marked / liquidation DD, banked DD, new-lot principal loss, D1–D3 from the boundary), the
//                                 carried lot's give-back (Assignment 3's foldRun), their confirmation neighbourhoods
//                                 (3 × 128, regenerated) through D1–D3 / DD^L, $100k / $250k / $500k proportional replays,
//                                 the D1 maximum-hold-window tail stress and gap-through-stop scenarios, illustrative
//                                 account-level margin examples
//   all
// Never a search, gate, ranking, promotion or exit input; no coefficient here is an approved threshold.
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { engineExecArgv, maglevDisabled } from '../../src/gpu-backend/runtime.ts';
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { Store } from '../../src/growth140-vgt-s8m/store.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { datasetsOf, poolOptionsOf, type EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { runPool } from '../../src/vg-d1-growth-joint/pool.ts';
import { booksWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { quantile } from '../../src/vg-d1-growth-joint/fitness.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, canonicalCfg, cfgId, controlValuesOf, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { drawsOf, famOf } from '../../src/vg-l0-full-joint/qualify.ts';
import { foldRun } from '../../src/vg-l0-full-joint/folds.ts';
import { linearDeficiencyShock } from '../../src/vg-l0-risk-metrics/margin.ts';
import { envelopeOf } from '../../src/gpu-phase7/envelope.ts';
import { NL0_CONTROL, RE_EXPERIMENTAL, assess, capitalContext } from '../../src/risk-envelope/policy.ts';
import { type CutoffKey, STUDY_ID, cacheDir, cutoffs, resultsDir } from '../../src/vg-l0-risk-envelope-pilot/context.ts';
import { openPilotDoor, selectionFile } from '../../src/vg-l0-risk-envelope-pilot/doors.ts';
import { qualificationFile, searchFile } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { readSealed } from '../../src/vg-l0-risk-envelope-pilot/records.ts';
import type { LaneResult } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import type { Evidence } from '../../src/vg-l0-risk-envelope-pilot/qualify.ts';
import { purposeOf, writeJson } from './common.ts';

const purpose = purposeOf(['diagnostic']);

setA3Quiet(true);

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : undefined);
const outDir = path.join(resultsDir, 'diagnostics');
const r2 = (x: number) => Math.round(x * 100) / 100;
const WORKERS = Number(process.env.VGL0REP_DIAG_WORKERS ?? 12);

type Item = { key: string; cfg: Cfg; options?: EvalOptions; boundary?: string };

// the forked pool: items split into WORKERS chunks (round-robin), each worker returns its rows
const runItems = async (door: StudyDoor, items: Item[], what: string): Promise<Record<string, unknown>[]> => {
  if (!items.length) return [];

  const n = Math.min(WORKERS, items.length);
  const chunks = Array.from({ length: n }, (_v, i) => items.filter((_x, j) => j % n === i));
  const parts = await Promise.all(
    chunks.map(
      (chunk) =>
        new Promise<Record<string, unknown>[]>((resolve, reject) => {
          const child = fork(path.join(import.meta.dirname, 'diagWorker.ts'), [], {
            execArgv: [...(maglevDisabled() ? engineExecArgv : []), '--max-old-space-size=3072', '--experimental-transform-types', '--disable-warning=ExperimentalWarning'],
            serialization: 'advanced',
            env: { ...process.env },
            stdio: ['ignore', 'inherit', 'inherit', 'ipc']
          });

          child.on('message', (m: { t: string; rows?: Record<string, unknown>[]; e?: string }) => (m.t === 'done' ? resolve(m.rows!) : reject(new Error(m.e))));
          child.on('exit', (code) => code !== 0 && reject(new Error(`diagnostics worker exited ${code}`)));
          child.send({ door, purpose: `${purpose}: ${what}`, items: chunk });
        })
    )
  );
  const byKey = new Map(parts.flat().map((r) => [r.key as string, r]));

  return items.map((x) => byKey.get(x.key)!);
};

// ----- populations -----

const archiveConfigs = (cut: CutoffKey) => {
  const rec = readSealed<{ backend: string; codeDigest: string }>(searchFile(cut, 'CTRL'));
  const pins = doorSpecs[cutoffs[cut].door].pins;
  const file = path.join(cacheDir, 'analysis', 'jobs', `${cut}-search`, 'archive.sqlite');

  if (!fs.existsSync(file)) throw new Error(`${file}: run the census first (it makes the archive copy)`);

  const s = new Store(file, {
    binding: { study: STUDY_ID, job: `${cut}-search`, door: cutoffs[cut].door, doorPin: `GDX:${pins.GDX.sha256},VGT:${pins.VGT.sha256}`, codeDigest: rec.codeDigest, backend: rec.backend },
    lruCapacity: 1000,
    commitRows: 1000,
    commitMs: 5000,
    readOnly: true
  });
  const m = new Map<string, Cfg>();

  for (const [k, v] of s.iterate<Cfg>('configs')) m.set(k, v);
  s.close();
  return m;
};

const population = async (cut: CutoffKey) => {
  const cfgs = archiveConfigs(cut);
  const why = new Map<string, Set<string>>();
  const add = (id: string, tag: string, cfg?: Cfg) => {
    if (cfg && !cfgs.has(id)) cfgs.set(id, cfg);
    (why.get(id) ?? why.set(id, new Set()).get(id)!).add(tag);
  };

  for (const arm of ['CTRL', 'EXP'] as const)
    for (const l of readSealed<{ lanes: LaneResult[] }>(searchFile(cut, arm)).lanes) {
      for (const x of l.r2) add(x.id, `${arm} r2`);
      for (const x of l.r3) add(x.id, `${arm} r3${x.feasible ? '' : ' (infeasible)'}`);
      for (const r of l.refinements) add(r.endpoint, `${arm} refinement endpoint`);
      for (const p of l.shortlist) add(p.id, `${arm} shortlist`, p.cfg);
      for (const x of l.topByNet) add(x.id, `${arm} top-net${x.feasible ? '' : ' (infeasible)'}`);
      for (const x of l.frontier) add(x.id, `${arm} frontier`);
      for (const x of l.visibleInfeasible) add(x.id, `${arm} visible infeasible`, x.cfg);
    }

  const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut)).evidence;

  for (const e of q) add(e.id, e.shortlistedBy.some((s) => s.arm === 'benchmark') ? 'benchmark' : `qualification (CTRL ${e.arms.CTRL.qualified ? 'Q' : 'not Q'}, EXP ${e.arms.EXP.qualified ? 'Q' : 'not Q'})`, canonicalCfg(e.cfg));

  const items: Item[] = [...why.keys()].filter((id) => cfgs.has(id)).map((id) => ({ key: id, cfg: canonicalCfg(cfgs.get(id)!) }));
  const missing = [...why.keys()].filter((id) => !cfgs.has(id));
  const t0 = Date.now();
  const rows = await runItems(cutoffs[cut].door, items, `population ${cut}`);
  const out = rows.map((r, i) => ({ ...r, id: items[i]!.key, cell: items[i]!.cfg.cell, growthBounded: items[i]!.cfg.g.maximumHoldEnabled === true || items[i]!.cfg.g.initialStopEnabled === true, sources: [...why.get(items[i]!.key)!] }));

  writeJson(path.join(outDir, `population-${cut}.json`), {
    kind: 'risk-envelope pilot population diagnostics (nonbinding CPU; D1–D3, DD^L, CPU envelope)',
    cutoff: cut,
    door: cutoffs[cut].door,
    purpose,
    subjects: out.length,
    missing,
    seconds: Math.round((Date.now() - t0) / 1000),
    rows: out
  });
  console.log(`population ${cut}: ${out.length} subjects (${missing.length} without a configuration) in ${Math.round((Date.now() - t0) / 1000)} s`);
};

// ----- frozen primaries and benchmarks -----

const scaled = (door: Awaited<ReturnType<typeof openPilotDoor>>, cfg: Cfg, budget: number, options: EvalOptions) => {
  const q = quadOf(cfg);
  const books = booksWithControls2(door, q, cfg.controls, options);
  const result = runPool(datasetsOf(door), books, q.first, { ...poolOptionsOf(door, options, false), budget, endIndex: door.sessions - 1 });
  const [bdM, bdL, plM, plL] = envelopeOf(door, { books, result } as never, options) as [number, number, number, number];
  const env = { bankedDdMarked: bdM, bankedDdLiquidation: bdL, principalLossMarked: plM, principalLossLiquidation: plL };
  const ctx = capitalContext(budget);

  return {
    budget,
    net: result.net,
    dd: result.dd.max,
    envelope: env,
    periods: result.periods ?? null,
    lots: result.lots.map((l) => `${l.book}@${l.entryT}:${l.fills.map((f) => f.t).join('/')}`).join(';'),
    CTRL: assess({ dd: result.dd.max, envelope: env }, NL0_CONTROL, ctx).pass,
    EXP: assess({ dd: result.dd.max, envelope: env }, RE_EXPERIMENTAL, ctx).pass
  };
};
const scaling = (door: Awaited<ReturnType<typeof openPilotDoor>>, cfg: Cfg, options: EvalOptions) => {
  const base = scaled(door, cfg, 100_000, options);

  return [100_000, 250_000, 500_000].map((b) => {
    const s = b === 100_000 ? base : scaled(door, cfg, b, options);
    const k = b / 100_000;
    const dev = (x: number, y: number) => Math.abs(x / k - y) / 100_000;

    return {
      allocation: b,
      net: r2(s.net),
      dd: r2(s.dd),
      ddPctC0: Math.round((s.dd / b) * 1e6) / 1e4,
      principalLossLiqPct: Math.round((s.envelope.principalLossLiquidation / b) * 1e6) / 1e4,
      bankedDdLiqPct: Math.round((s.envelope.bankedDdLiquidation / b) * 1e6) / 1e4,
      limits: { ctrlDd: (b * 35) / 100, expDd: (b * 40) / 100, expPl: (b * 25) / 100, expBd: (b * 25) / 100 },
      decisions: { CTRL: s.CTRL, EXP: s.EXP },
      sameChronology: s.lots === base.lots,
      sameDecisions: s.CTRL === base.CTRL && s.EXP === base.EXP,
      worstDeviationOverC0: Math.max(dev(s.net, base.net), dev(s.dd, base.dd), ...(['bankedDdMarked', 'bankedDdLiquidation', 'principalLossMarked', 'principalLossLiquidation'] as const).map((f) => dev(s.envelope[f], base.envelope[f])))
    };
  });
};

// Assignment 3's D1 maximum-hold-window tail stress (tools/vg-l0-full-joint/tail.ts `stress`, copied: that module runs
// its own main on import), on the training door's daily bars — an in-sample, daily-bar approximation
const day = 86_400_000;
const tailStress = (ds: { dates: string[]; sOpen: Float64Array; sLow: Float64Array; sClose: Float64Array; sessionCount: number }, holdDays: number, stopTenths: number | null) => {
  const d = { dates: ds.dates.slice(0, ds.sessionCount), open: ds.sOpen, low: ds.sLow, close: ds.sClose };
  const cost = 0.0005;
  const losses: { loss: number; date: string }[] = [];
  let worstGap = { beyond: 0, date: '' };

  for (let i = 0; i < d.dates.length; i++) {
    const entry = d.close[i]! * (1 + cost);
    const shares = 100_000 / entry;
    const endT = Date.parse(`${d.dates[i]}T00:00:00Z`) + holdDays * day;
    let j = i;

    while (j + 1 < d.dates.length && Date.parse(`${d.dates[j + 1]}T00:00:00Z`) <= endT) j++;
    if (j === i) continue;

    let exit = d.close[j]!;
    let exitIdx = j;

    if (stopTenths !== null) {
      const level = d.close[i]! * (1 - stopTenths / 1000);

      for (let k = i + 1; k <= j; k++) {
        if (d.open[k]! <= level) {
          exit = d.open[k]!;
          exitIdx = k;
          if ((level - exit) / d.close[i]! > worstGap.beyond) worstGap = { beyond: (level - exit) / d.close[i]!, date: d.dates[k]! };
          break;
        }
        if (d.low[k]! <= level) {
          exit = level;
          exitIdx = k;
          break;
        }
      }
    }

    const days = (Date.parse(`${d.dates[exitIdx]}T00:00:00Z`) - Date.parse(`${d.dates[i]}T00:00:00Z`)) / day;

    losses.push({ loss: shares * exit * (1 - cost) - 100_000 - (100_000 * 0.11 * days) / 365, date: d.dates[i]! });
  }

  const sorted = [...losses].sort((a, b) => a.loss - b.loss);

  return {
    windows: losses.length,
    worstLoss: r2(sorted[0]!.loss),
    worstEntry: sorted[0]!.date,
    p95Loss: r2(quantile(sorted.map((x) => x.loss), 0.05)),
    shareBelowMinus10k: r2(losses.filter((x) => x.loss < -10_000).length / losses.length),
    shareBelowMinus25k: r2(losses.filter((x) => x.loss < -25_000).length / losses.length),
    worstGapThroughStopPct: stopTenths === null ? null : { beyondStopPct: r2(100 * worstGap.beyond), date: worstGap.date || null }
  };
};
const holdOf = (cfg: Cfg, s: 'GDX' | 'VGT') => {
  const h = cfg.controls?.books[`D1:${s}`]?.hold;

  return h?.mode === 'disabled' ? { days: 60, basis: 'disabled: 60-day declared bound' } : h?.mode === 'adaptive' ? { days: h.extendedHoldDays, basis: 'adaptive: the extended bound' } : { days: cfg.d1[s].maximumHoldDays, basis: 'legacy calendar hold' };
};
const gaps = (stopTenths: number | null) =>
  Object.fromEntries(
    [10, 20, 30].map((g) => {
      const fill = stopTenths === null ? null : g > stopTenths / 10 ? 1 - g / 100 : 1 - stopTenths / 1000;

      return [`gap −${g}%`, fill === null ? 'no protective stop (held to the hold rule)' : r2((100_000 / 1.0005) * fill * 0.9995 - 100_000)];
    })
  );

// illustrative account-level margin examples (NOT the user's account, NOT a broker rule): the $100,000 slot bought on a
// $100,000 loan inside an account with other equity B; the common decline s* at which the modelled equity falls to the
// maintenance requirement, beside each subject's worst historical single-trade loss (% of principal)
const marginExamples = () =>
  [25_000, 50_000, 100_000].flatMap((buffer) =>
    [0.25, 0.3, 0.5].map((m) => ({ otherEquity: buffer, maintenance: m, firstDeficiencyDecline: (() => { const s = linearDeficiencyShock(100_000, buffer, 100_000, 0, m); return s === null ? null : r2(100 * s); })() }))
  );

const primaries = async (cut: CutoffKey) => {
  const spec = cutoffs[cut];
  const sel = readSealed<{ subjects: { label: string; id: string; roles: unknown[]; evidence: Evidence }[]; benchmarks: { label: string; id: string; evidence: Evidence }[] }>(selectionFile(cut));
  const subjects = [...sel.subjects.map((s) => ({ ...s, kind: 'primary' })), ...sel.benchmarks.map((s) => ({ ...s, roles: [], kind: 'benchmark' }))].map((s) => ({ ...s, cfg: canonicalCfg(s.evidence.cfg) }));
  const iopts = { ...vOptions, boundaries: [spec.end] };
  const t0 = Date.now();
  const training = await runItems(spec.door, subjects.map((s) => ({ key: s.id, cfg: s.cfg })), `primaries ${cut} training`);
  const interval = await runItems(spec.sliceDoor, subjects.map((s) => ({ key: s.id, cfg: s.cfg, options: iopts, boundary: spec.end })), `primaries ${cut} interval`);
  // the confirmation neighbourhoods (3 × 128, regenerated exactly) on the training door
  const nbItems = subjects.flatMap((s) => {
    const seen = new Set<string>();

    return [1, 2, 3].flatMap((rep) => drawsOf(s.cfg, famOf('confirm', ['confirm', rep, cut]))).filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true))).map((d) => ({ key: `${s.id}|${d.id}`, cfg: d.cfg }));
  });
  const nbRows = await runItems(spec.door, nbItems, `primaries ${cut} confirmation neighbourhoods`);
  const tdoor = await openPilotDoor(spec.door, `${purpose}: primaries ${cut} scaling and tail (training)`);
  const idoor = await openPilotDoor(spec.sliceDoor, `${purpose}: primaries ${cut} scaling and give-back (interval)`);
  const q = (xs: number[], p: number) => r2(quantile([...xs].sort((a, b) => a - b), p));
  const rows = subjects.map((s, i) => {
    const nbs = nbRows.filter((r) => (r.key as string).startsWith(`${s.id}|`)) as unknown as { dd: number; ddLiquidation: number; envelope: Record<string, number>; views: { marked: { D1: { pct: number }; D2: { utilization: number } } }; unbankedGivebackShare: number | null; policies: { CTRL: boolean; EXP: boolean } }[];
    const fr = foldRun(idoor, s.cfg, spec.end);

    return {
      label: s.label,
      id: s.id,
      kind: s.kind,
      roles: s.roles,
      cell: s.cfg.cell,
      growthBounded: s.cfg.g.maximumHoldEnabled === true || s.cfg.g.initialStopEnabled === true,
      training: training[i],
      interval: interval[i],
      foldRun: { sliceNet: fr.sliceNet, sliceDd: fr.sliceDd, giveBack: fr.giveBack, nextSlice: fr.nextSlice, openAtBoundary: fr.openAtBoundary },
      confirmation: {
        draws: nbs.length,
        ddLiquidation: { p90: q(nbs.map((r) => r.ddLiquidation), 0.9), worst: r2(Math.max(...nbs.map((r) => r.ddLiquidation))) },
        D1pct: { median: q(nbs.map((r) => r.views.marked.D1.pct), 0.5), p90: q(nbs.map((r) => r.views.marked.D1.pct), 0.9), worst: Math.max(...nbs.map((r) => r.views.marked.D1.pct)) },
        D2utilization: { median: q(nbs.map((r) => r.views.marked.D2.utilization), 0.5), p90: q(nbs.map((r) => r.views.marked.D2.utilization), 0.9), shareAbove1: r2(nbs.filter((r) => r.views.marked.D2.utilization > 1).length / Math.max(1, nbs.length)) },
        givebackDominatedShare: r2(nbs.filter((r) => (r.unbankedGivebackShare ?? 0) >= 0.5).length / Math.max(1, nbs.length)),
        cpuPolicyPassShare: { CTRL: r2(nbs.filter((r) => r.policies.CTRL).length / Math.max(1, nbs.length)), EXP: r2(nbs.filter((r) => r.policies.EXP).length / Math.max(1, nbs.length)) }
      },
      scaling: { training: scaling(tdoor, s.cfg, vOptions), interval: scaling(idoor, s.cfg, iopts) },
      tail: Object.fromEntries(
        (['GDX', 'VGT'] as const).map((sym) => {
          const h = holdOf(s.cfg, sym);
          const d = controlValuesOf(s.cfg, sym).d ?? null;

          return [`D1·${sym}`, { holdDays: h.days, holdBasis: h.basis, stopDistancePct: d === null ? null : d / 10, inSample: { unprotected: tailStress(tdoor.sym[sym].ds, h.days, null), protected: d === null ? null : tailStress(tdoor.sym[sym].ds, h.days, d) }, syntheticGaps: gaps(d) }];
        })
      )
    };
  });

  writeJson(path.join(outDir, `primaries-${cut}.json`), {
    kind: 'risk-envelope pilot frozen-primary and benchmark diagnostics (nonbinding CPU)',
    cutoff: cut,
    trainingDoor: spec.door,
    intervalDoor: spec.sliceDoor,
    interval: spec.slice,
    label: 'retrospective, previously inspected history; a tail stress on the training window is in-sample (daily-bar approximation)',
    purpose,
    marginExamples: { note: 'illustrative only: a $100,000 position bought on a $100,000 loan with other account equity B; a common decline s* (percent) at which equity meets the maintenance requirement; not a broker rule and not the user’s account', rows: marginExamples() },
    seconds: Math.round((Date.now() - t0) / 1000),
    rows
  });
  console.log(`primaries ${cut}: ${rows.length} subjects, ${nbItems.length} neighbourhood replays in ${Math.round((Date.now() - t0) / 1000)} s`);
};

const cuts = (opt('cutoff') ? [opt('cutoff')] : ['C21', 'C24']) as CutoffKey[];

if (cmd === 'population' || cmd === 'all') for (const c of cuts) await population(c);
if (cmd === 'primaries' || cmd === 'all') for (const c of cuts) await primaries(c);
if (!['population', 'primaries', 'all'].includes(cmd ?? '')) {
  console.error('usage: diagnostics.ts population|primaries|all [--cutoff C21|C24]');
  process.exit(2);
}
void cfgId;
