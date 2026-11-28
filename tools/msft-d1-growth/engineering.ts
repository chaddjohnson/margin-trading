// P9-MSFT engineering gates and the pilot (PROTOCOL.md §13, §7.6) — NON-OFFICIAL (GPU_POLICY_PURPOSE parity-test |
// benchmark | diagnostic), never an outcome-producing search, never official optimization evidence. Engineering output is
// equality counts, pass/fail, hashes, counts and timings: no net, drawdown or P&L of a searched MSFT configuration is
// printed or written (the references New L0 and N/original are compared, on THEIR OWN VGT/GDX data, with their sealed
// published figures).
// Commands (repository root, `GPU_POLICY_PURPOSE=<purpose> npm run msft9-eng -- <command>`):
//   e1                       acceptance verification (independent verifier, out-of-band pin) and the entrypoint audit
//   e2                       the MSFT data doors: every door = the canonical partition load with the MSFT ledger; prefix
//                            causality across doors; the splits; both engine slots one MSFT SymDoor (CPU, no strategy)
//   e3                       New L0 and N/original on their own data (Priority 3's D24 and FULL known-target doors): GPU =
//                            CPU = their sealed development and full-history figures (the engine is unchanged)
//   e4                       CPU/GPU record parity on random configurations of every arm's reachable domain (all cells,
//                            coarse and fine, a frozen-D1 arm S, arm C pairs) and the external controls × the option sets
//                            (base, the 8 stresses, the removals, a cutoff boundary, a 16-boundary series), D19–D24
//   e5 [--step run|kill]     determinism: a mini lane set of every arm on D19 — GPU A; GPU B interrupted (graceful stop)
//                            and resumed; GPU C whose process is SIGKILLed mid-run and resumed; GPU D whose GPU server
//                            is SIGKILLed mid-run (fails closed) and resumed; the CPU reference — identical
//   e6                       identities on the GPU: single-family identities (J with a book disabled = the D / G arm),
//                            the disabled engine slot is inert, causal data access across D19 → D21 → D23 → D24 (the
//                            boundary equity and the lots up to each cutoff), accounting (Σ lots = net; principal ≤ $100,000)
//   pilot --step lanes|summary   the benchmark (BENCH seed keys): the frozen schedules for every arm on D21
//   record --gate E7|E8 --log <file> --known <n>   a test-suite result
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { plain } from '../../src/vg-l0-full-joint/records.ts';
import { stripEnvelopes } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { budgets, laneWorstCase } from '../../src/vg-l0-full-joint/budgets.ts';
import type { DRec, SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { quadOf as a3QuadOf } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { enabledOf, removalsOf } from '../../src/vg-l0-risk-families/qualify.ts';
import { evaluate as cpuEvaluate } from '../../src/vg-l0-risk-families/evaluate.ts';
import { audit, registryFile } from '../../src/gpu-backend/entrypoints.ts';
import { openStudyDoor } from '../../src/gpu-backend/doors.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';
import { references } from '../../src/vg-l0-n-successor/incumbents.ts';
import { adjustSessionsForSplits } from '../../src/lib/corporateActions.ts';
import { resolveDataset } from '../../src/lib/dataset.ts';
import { loadDatasetSessions } from '../../src/lib/evaluation.ts';
import { type ArmKey, type DoorName, STUDY_ID, armOptions, armPolicy, cacheDir, chronology, repoRoot, researchDir, resultsDir } from '../../src/msft-d1-growth/context.ts';
import * as S from '../../src/msft-d1-growth/space.ts';
import type { Cfg } from '../../src/msft-d1-growth/space.ts';
import { stresses } from '../../src/msft-d1-growth/qualify.ts';
import { controlMembers } from '../../src/msft-d1-growth/controls.ts';
import { runLanes } from '../../src/msft-d1-growth/lanes.ts';
import type { LaneSpec } from '../../src/msft-d1-growth/search.ts';
import { laneCaps, nl0Caps, perMemberMax, perSubject, replicates, schedules, sequentialReplicates } from '../../src/msft-d1-growth/budget.ts';
import { codeDigest } from '../../src/msft-d1-growth/records.ts';
import { buildDoor, doorNames, doorSessions, doorSpecs, readPins, msftSplits } from '../../src/msft-d1-growth/doors.ts';
import { openToolLab, purposeOf, writeJson as writeJson0 } from './common.ts';

// every engineering record carries the study code digest it ran under and the rerun tag
const writeJson = (file: string, value: Record<string, unknown>) => writeJson0(file, { ...value, codeDigest: codeDigest(), tag: process.env.MSFT_ENG_TAG ?? null });

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k: string, d = '') => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const engDir = path.join(resultsDir, 'engineering');
const outFile = (name: string) => path.join(engDir, name);
const now = () => new Date().toISOString();
const TAG = process.env.MSFT_ENG_TAG ? `-${process.env.MSFT_ENG_TAG}` : '';
const J = (name: string) => `${name}${TAG}`;
const readJ = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
const sha = (x: unknown) => execFileSync('sha256sum', { input: JSON.stringify(x) }).toString().slice(0, 64);

// ----- E1 -----

const e1 = () => {
  purposeOf(['parity-test']);

  const pin = '9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4'; // GPU Phase 9; kept out of band (~/.local/share/margin-trading-gpu/acceptance-pins/)
  let out = '';
  let ok = false;

  try {
    out = execFileSync(path.join(repoRoot, 'tools/gpu-backend/verify-acceptance.sh'), ['--rebuild', '--device', '--expect-record-sha256', pin], { cwd: repoRoot, encoding: 'utf8', timeout: 1_800_000 });
    ok = /\nVERIFIED\s*$/.test(out);
  } catch (e) {
    out = String((e as { stdout?: string }).stdout ?? e);
  }

  const problems = audit(readJ(registryFile));
  const record = {
    gate: 'E1',
    what: 'the acceptance record in force (GPU Phase 9, research/gpu-phase9; sha256 kept out of band in ~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase9-9ebb33ce.json) verified by the independent verifier with a reproducible rebuild and the device; the entrypoint audit of src/ (src/msft-d1-growth is an official entrypoint through src/gpu-backend/official.ts); no evaluation-manifest file changed (the acceptance stays valid)',
    verifier: out.trim().split('\n'),
    verified: ok,
    entrypointProblems: problems,
    pass: ok && problems.length === 0,
    finished: now()
  };

  writeJson(outFile('E1-acceptance.json'), record);
  console.log(JSON.stringify({ E1: record.pass, problems }));
};

// ----- E2: the data doors (CPU; no strategy) -----

const sessionHash = (h: { date: string; open: number; high: number; low: number; close: number; volume: number; closingPrint?: number; bars: { time: number; open: number; high: number; low: number; close: number; volume: number }[] }[]) =>
  sha(h.map((s) => [s.date, s.open, s.high, s.low, s.close, s.volume, s.closingPrint ?? null, s.bars.map((b) => [b.time, b.open, b.high, b.low, b.close, b.volume])]));

const e2 = async () => {
  purposeOf(['parity-test']);

  const pins = readPins();
  const rows: Record<string, unknown>[] = [];
  let pass = true;
  const hist: Record<string, Awaited<ReturnType<typeof doorSessions>>['history']> = {};

  for (const d of doorNames) {
    const door = await buildDoor(d, pins);
    const { history, applied } = await doorSessions(d, pins);
    const part = await loadDatasetSessions({ dataset: resolveDataset('MSFT', 'all'), startDate: chronology.firstSession, endDate: doorSpecs[d].last, warmupSessions: 0 }); // the central ledger (default)
    const a = sessionHash(history);
    const b = sessionHash(part.history);
    const sameSlots = door.sym.GDX === door.sym.VGT;
    const ok = a === b && sameSlots && history.length === pins.doors[d].sessions && door.sessions === history.length;

    hist[d] = history;
    if (!ok) pass = false;
    rows.push({ door: d, sessions: history.length, pinnedSessions: pins.doors[d].sessions, splitsApplied: applied, doorHash: a, partitionPathHash: b, equal: a === b, bothSlotsOneSymDoor: sameSlots, ok });
  }

  const causal = doorNames.slice(0, -1).map((d, i) => {
    const next = doorNames[i + 1]!;
    const n = hist[d]!.length;
    const eq = sessionHash(hist[d]!) === sessionHash(hist[next]!.slice(0, n));

    if (!eq) pass = false;
    return { shorter: d, longer: next, sessions: n, prefixEqual: eq };
  });
  // MSFT has no split in the window: the central ledger lists no MSFT event, the adjustment is the identity, and no raw
  // overnight move is split-sized (open ÷ previous close outside [0.6, 1.6]) — counts only (FULL: data integrity)
  const full = hist.FULL!;
  const ledgerEvents = msftSplits(pins).length;
  const splitSized = full.slice(1).filter((x, i) => x.open / full[i]!.close < 0.6 || x.open / full[i]!.close > 1.6).length;
  const identity = sessionHash(adjustSessionsForSplits(full, 'MSFT', msftSplits(pins)).sessions) === sessionHash(full);
  const splits = { ledgerEvents, splitSizedRawGaps: splitSized, adjustmentIsIdentity: identity, ok: ledgerEvents === 0 && splitSized === 0 && identity };

  if (!splits.ok) pass = false;

  // regular-session semantics (brief Phase 1 item 6): every bar inside its session's regular minutes [open, close), the
  // closing-print proxy present on every session, early closes ending at 13:00 — no pre-market or after-hours bar enters
  const outside = full.reduce((a, x) => a + x.bars.filter((b) => b.time < x.openTime || b.time >= x.closeTime).length, 0);
  const noPrint = full.filter((x) => x.closingPrint === undefined).length;
  const early = full.filter((x) => x.isEarlyClose);
  const earlyOk = early.every((x) => Math.round((x.closeTime - x.openTime) / 60) === 210);
  const regular = { barsOutsideRegularMinutes: outside, sessionsWithoutClosingPrint: noPrint, earlyCloses: early.length, earlyClosesEndAt1300: earlyOk, ok: outside === 0 && noPrint === 0 && earlyOk };

  if (!regular.ok) pass = false;

  const record = {
    gate: 'E2',
    what: 'the MSFT doors (D19, D21, D23, D24, FULL ≤ 2026-10-30): each byte prefix verified (size, sha256, last row) and loaded through the canonical session grouping + the canonical forward split adjustment with the CENTRAL ledger equals, session by session and bar by bar, the canonical PARTITION path (resolveDataset("MSFT", "all"), the central ledger by default); each shorter door is a prefix of the next (causal data access); both engine slots hold one MSFT SymDoor; no MSFT split (no ledger event, no split-sized raw gap, the adjustment is the identity — applied exactly once by construction); regular-session semantics (no bar outside the regular minutes, a closing-print proxy on every session, early closes end at 13:00); no strategy is evaluated (FULL read for data integrity only, before the freeze)',
    rows,
    causal,
    splits,
    regular,
    pass,
    finished: now()
  };

  writeJson(outFile('E2-data.json'), record);
  console.log(JSON.stringify({ E2: record.pass, rows: rows.map((r) => `${r.door}: ${r.equal ? 'equal' : 'DIFF'}`), causal: causal.map((c) => c.prefixEqual) }));
};

// ----- E3: New L0 and N/original on their own data -----

const e3 = async () => {
  const purpose = purposeOf(['parity-test']);
  const refs = references();
  const rows: Record<string, unknown>[] = [];
  let pass = true;

  for (const name of ['D24', 'FULL'] as const) {
    const door = await openStudyDoor(STUDY_ID, name, name === 'FULL' ? 'known-target reproduction of New L0 and N/original (VGT/GDX FULL; equality with their sealed full-history figures; non-official)' : `${purpose}: E3 references on their own D24 (non-official)`);
    const ds = exportDataset(door, path.join(cacheDir, 'engineering', 'vg-datasets'));
    const server = GpuServer.start({ binary: serverBinary, libDir: toolkitLib });

    try {
      const info = await server.info();

      await server.load(ds.file);

      const keys = ['NORIG', 'NL0'] as const;
      const tasks = keys.map((k) => ({ k: `ref:${k}`, quad: a3QuadOf(refs[k].cfg), controls: refs[k].cfg.controls, options: vOptions, detail: false }));
      const gpu = await server.evaluate(door, tasks, { returnTrades: false }, info.uuid);

      keys.forEach((k, i) => {
        const g = gpu.results[i]!.record as SRec;
        const c = cpuEvaluate(door, tasks[i]!.quad, tasks[i]!.controls, vOptions) as SRec;
        const diffs = deepDiff(plain(c), plain(g));
        const sealed = name === 'D24' ? refs[k].sealed.development : refs[k].sealed.full;
        const matches =
          Math.round(g.net * 100) === Math.round(sealed.net * 100) && Math.round(g.dd * 100) === Math.round(sealed.dd * 100) && g.lots === sealed.lots && (!('signature' in sealed) || g.signature === (sealed as { signature: string }).signature);

        if (diffs.length || !matches || g.id !== refs[k].id) pass = false;
        rows.push({ door: `VGT/GDX ${name}`, reference: refs[k].label, cpuGpuDifferences: diffs.length, first: diffs.slice(0, 3), gpu: { id: g.id, net: g.net, dd: g.dd, lots: g.lots, signature: g.signature }, sealed, matchesSealed: matches });
      });
    } finally {
      server.kill();
    }
  }

  const record = {
    gate: 'E3',
    what: 'the frozen VGT/GDX benchmarks New L0 and N/original reproduced on their OWN data (Priority 3’s D24 and FULL doors) through the accepted GPU evaluator and the CPU engine: GPU = CPU in every record field and = their sealed development and full-history figures — the shared engine is unchanged by this study (no evaluation file modified); their sealed records are not touched',
    rows,
    pass,
    finished: now()
  };

  writeJson(outFile('E3-references.json'), record);
  console.log(JSON.stringify({ E3: pass, rows: rows.map((r) => `${r.door} ${r.reference}: cpu≠gpu ${r.cpuGpuDifferences}, sealed ${r.matchesSealed}`) }));
};

// ----- random configurations of every arm's reachable domain -----

export const registerEngFrozen = () => {
  const d = S.cellOf('D.D1');
  const c = S.decode(S.pinStratum(S.screenGenomes(1, 'coarse', 'P9-MSFT-ENG', 'frozen')[0]!, d, 0, 1), 'coarse', d);
  const f = S.frozenFrom('ENGF1', 'engineering (hash-selected, never outcome-selected)', c);

  S.registerFrozen(f);
  return f;
};

const randomConfigs = (label: string, perCell: number, res: 'coarse' | 'fine', arms: readonly Exclude<ArmKey, 'C'>[]) => {
  const out: Cfg[] = [];
  const seen = new Set<string>();

  registerEngFrozen();
  for (const arm of arms) {
    const cells = arm === 'S' ? S.sequentialCells('ENGF1') : S.cellsOfArm(arm);

    cells.forEach((cell, ci) => {
      const gs = S.screenGenomes(perCell * 4, res, 'P9-MSFT-E4', label, arm, ci).map((g, i) => S.pinStratum(g, cell, i, perCell * 4));
      let k = 0;

      for (const g of gs) {
        if (k >= perCell) break;
        try {
          const c = S.decode(g, res, cell);
          const id = `${arm}|${S.cfgId(c)}`;

          if (seen.has(id)) continue;
          seen.add(id);
          out.push(S.canonicalCfg(c));
          k++;
        } catch {
          // an invalid genome: skipped
        }
      }
    });
  }
  return out;
};

const armOfCfg = (c: Cfg) => S.armOfCell(c.cell);

// box extremes (edge thresholds, stop activation at the box limits): the all-minimum, all-maximum and two alternating
// level vectors of every cell of D, G, J and S (fine grid), each decoded through the arm's own construction (invalid
// genomes skipped), deduplicated by identity
const extremeConfigs = () => {
  const out: Cfg[] = [];
  const seen = new Set<string>();
  const levels = S.levelsOf('fine');

  registerEngFrozen();
  for (const arm of ['D', 'G', 'J', 'S'] as const) {
    const cells = arm === 'S' ? S.sequentialCells('ENGF1') : S.cellsOfArm(arm);

    cells.forEach((cell, ci) => {
      const gs = [levels.map(() => 0), levels.map((l) => l - 1), levels.map((l, i) => (i % 2 ? l - 1 : 0)), levels.map((l, i) => (i % 2 ? 0 : l - 1))].map((g, i) => S.pinStratum(g, cell, i + ci, 4));

      for (const g of gs) {
        try {
          const c = S.canonicalCfg(S.decode(g, 'fine', cell));
          const id = `${arm}|${S.cfgId(c)}`;

          if (seen.has(id)) continue;
          seen.add(id);
          out.push(c);
        } catch {
          // an invalid genome: skipped
        }
      }
    });
  }
  return out;
};

// ----- E4: CPU/GPU parity -----

const e4 = async () => {
  const purpose = purposeOf(['parity-test']);
  const doors = ['D19', 'D21', 'D23', 'D24'] as const;
  const boundaryOf: Record<string, string> = { D19: '2018-12-31', D21: '2019-12-31', D23: '2021-12-31', D24: '2023-12-29' };
  const rows: Record<string, unknown>[] = [];
  let pass = true;

  for (const door of doors) {
    const base = [...randomConfigs(door, 6, 'coarse', ['D', 'G']), ...randomConfigs(door, 2, 'coarse', ['J', 'S']), ...randomConfigs(`${door}-fine`, 2, 'fine', ['D', 'G']), ...randomConfigs(`${door}-fine`, 1, 'fine', ['J', 'S']), ...extremeConfigs()];
    // arm C pairs from the random D and G configurations, and the external controls of D, G, J
    const ds = base.filter((c) => armOfCfg(c) === 'D');
    const gs = base.filter((c) => armOfCfg(c) === 'G');
    const pairs = ds.slice(0, 24).map((d, i) => S.pairCfg(d, gs[i % gs.length]!));
    const controls = (['D', 'G', 'J'] as const).flatMap((a) => controlMembers(a).map((m) => m.cfg));
    const cfgs = [...base, ...pairs, ...controls];
    type It = { cfg: Cfg; options: (typeof armOptions)[ArmKey]; detail?: boolean; risk?: true };
    const items: It[] = [];

    cfgs.forEach((c, i) => {
      const o = armOptions[armOfCfg(c)];
      const sk = Object.values(stresses);
      const removals = Object.values(removalsOf(enabledOf(o)));

      items.push({ cfg: c, options: o, detail: true, risk: true }, { cfg: c, options: o, risk: true });
      items.push({ cfg: c, options: { ...o, friction: { ...sk[i % sk.length]! } }, risk: true });
      if (removals.length) items.push({ cfg: c, options: { ...o, enabled: { ...o.enabled, ...Object.fromEntries(removals[i % removals.length]!.map((b) => [b, false])) } }, risk: true });
      items.push({ cfg: c, options: { ...o, boundaries: [boundaryOf[door]!] }, risk: true });
      if (i % 4 === 0) items.push({ cfg: c, options: { ...o, boundaries: [] } });
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

    const byArm = Object.fromEntries((['D', 'G', 'C', 'J', 'S'] as const).map((a) => [a, cfgs.filter((c) => armOfCfg(c) === a).length]));
    const cells = new Set(cfgs.map((c) => c.cell)).size;

    rows.push({ door, configurations: cfgs.length, byArm, cells, evaluations: items.length, differing: diff, first, sixteenBoundaryRuns: items.filter((x) => x.options.boundaries?.length === 0).length });
  }

  const record = {
    gate: 'E4',
    what: 'CPU/GPU parity of every record field (detailed and compact records, the risk envelope) on random configurations of every arm’s reachable domain — arm D all 8 cells, arm G all 6 cells (unrestricted G.h0.s0 included), arm J all 48 cells, arm S the 6 cells of a hash-selected frozen D1, arm C pairs; coarse and fine grids; screen strata — and the external controls, under the arm’s options: base, each of the 8 stresses, each causal removal, a cutoff boundary and a 16-boundary session-close series; plus the box-extreme genomes of every cell (all-minimum, all-maximum, alternating; fine grid); on D19, D21, D23 and D24 (MSFT has no split)',
    rows,
    pass,
    finished: now()
  };

  writeJson(outFile('E4-parity.json'), record);
  console.log(JSON.stringify({ E4: pass, rows: rows.map((r) => `${r.door}: ${r.differing}/${r.evaluations} differ (${r.configurations} configs, ${r.cells} cells)`) }));
};

// ----- E5: determinism -----

const miniBroad = budgets.pilot.broad;
const miniSeeded = budgets.pilot.refine;
const miniSpecs = () => {
  registerEngFrozen();

  const broad = (arm: Exclude<ArmKey, 'C'>, cell: string): LaneSpec => {
    const key = `E5/${arm}/broad/${cell}/R1`;

    return { key, seedKey: key, position: key, stage: 'broad', replicate: 1, cutoff: 'E5', kind: 'indep', res: 'coarse', cell: S.cellOf(cell) };
  };
  const jc = S.cellOf('J.B1.h1.s1');
  const seeds = S.screenGenomes(4, 'fine', 'P9-MSFT-E5', 'seeds').map((g, i) => ({ label: `E5 seed ${i}`, cfg: S.decode(S.pinStratum(g, jc, i, 4), 'fine', jc), focus: i === 0 }));
  const refine: LaneSpec = { key: 'E5/J/refine/J.B1.h1.s1/R1', seedKey: 'E5/J/refine/J.B1.h1.s1/R1', position: 'E5/J/refine/J.B1.h1.s1/R1', stage: 'refine', replicate: 1, cutoff: 'E5', kind: 'refine', res: 'fine', cell: jc, seeds };

  return { D: [broad('D', 'D.C1')], G: [broad('G', 'G.h0.s0')], J: [broad('J', 'J.D1.h2.s1')], S: [broad('S', 'S.ENGF1.h1.s0')], refine };
};

const e5Run = async (name: string, backend: 'gpu' | 'cpu', stopAfterFresh?: number) => {
  const purpose = purposeOf(['parity-test']);
  const t = await openToolLab({ backend, door: 'D19', area: 'engineering', job: J(name), purpose: `${purpose}: E5 determinism`, cpuWorkers: 12, stopAfterFresh, ledger: path.join(engDir, 'E5', `${name}${TAG}-receipts.jsonl`) });

  try {
    const sp = miniSpecs();
    const ov = { schedule: miniBroad, laneCap: laneWorstCase(miniBroad, 0, 0), nl0Cap: 3 };
    const results = await Promise.all((['D', 'G', 'J', 'S'] as const).map((a) => runLanes(t.lab, armPolicy(a), sp[a], 'broad', `E5 ${a}`, ov)));
    const r = await runLanes(t.lab, armPolicy('J'), [sp.refine], 'refine', 'E5 refine', { schedule: miniSeeded, laneCap: laneWorstCase(miniSeeded, 4 * 5 + 2 * 8, 2), nl0Cap: 3 });

    return { lanes: [...results.flatMap((x) => x.results), ...r.results].map((x) => stripEnvelopes(x)), rounds: [...results.map((x) => x.rounds), r.rounds] };
  } finally {
    await t.close();
  }
};

const runChild = (stepArgs: string[], killAfterMs: number, target: 'process' | 'server') =>
  new Promise<{ killed: boolean; code: number | null; signal: string | null }>((resolve) => {
    const child = spawn(process.execPath, [...process.execArgv, path.join(repoRoot, 'tools/msft-d1-growth/engineering.ts'), ...stepArgs], { cwd: repoRoot, env: process.env, stdio: ['ignore', 'inherit', 'inherit'] });
    let killed = false;
    const timer = setTimeout(() => {
      try {
        if (target === 'process') child.kill('SIGKILL');
        else {
          const pids = execFileSync('pgrep', ['-P', String(child.pid), '-f', path.basename(serverBinary)], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);

          for (const p of pids) process.kill(Number(p), 'SIGKILL');
        }
        killed = true;
      } catch {
        killed = false;
      }
    }, killAfterMs);

    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ killed, code, signal });
    });
  });

const e5 = async () => {
  const step = opt('step');

  if (step === 'run') {
    await e5Run(opt('name'), 'gpu');
    return;
  }

  const a = await e5Run('E5-gpu-a', 'gpu');
  let graceful = 'not interrupted';

  try {
    await e5Run('E5-gpu-b', 'gpu', 300);
  } catch (e) {
    graceful = `stopped as planned: ${(e as Error).message.slice(0, 100)}`;
  }

  const b = await e5Run('E5-gpu-b', 'gpu'); // resumes the stopped job's archive
  const killProcess = await runChild(['e5', '--step', 'run', '--name', 'E5-gpu-c'], 25_000, 'process');
  const c = await e5Run('E5-gpu-c', 'gpu');
  const killServer = await runChild(['e5', '--step', 'run', '--name', 'E5-gpu-d'], 25_000, 'server');
  const d = await e5Run('E5-gpu-d', 'gpu');
  const cpu = await e5Run('E5-cpu', 'cpu');
  const diffs = { gracefulResume: deepDiff(plain(a), plain(b)), processKillResume: deepDiff(plain(a), plain(c)), serverKillResume: deepDiff(plain(a), plain(d)), cpu: deepDiff(plain(a), plain(cpu)) };
  const record = {
    gate: 'E5',
    what: 'a fixed-seed mini lane set of every arm (D D.C1, G G.h0.s0 (unrestricted), J J.D1.h2.s1, S S.ENGF1.h1.s0 with a hash-selected frozen D1, and a seeded J refinement lane) with the two-tier extension rule on D19: GPU run A; GPU run B gracefully stopped after 300 fresh evaluations and resumed from its archive; GPU run C whose process was SIGKILLed after 25 s and resumed; GPU run D whose GPU server was SIGKILLed after 25 s (the job fails closed) and resumed; the CPU reference — every lane result and extension decision identical',
    graceful,
    killProcess,
    killServer,
    differences: Object.fromEntries(Object.entries(diffs).map(([k, v]) => [k, { count: v.length, first: v.slice(0, 5) }])),
    pass: Object.values(diffs).every((v) => v.length === 0) && graceful.startsWith('stopped') && killProcess.killed && killServer.killed,
    finished: now()
  };

  writeJson(outFile('E5-determinism.json'), record);
  console.log(JSON.stringify({ E5: record.pass, graceful, killProcess, killServer, diffs: Object.fromEntries(Object.entries(diffs).map(([k, v]) => [k, v.length])) }));
};

// ----- E6: identities on the GPU -----

const strip = (r: SRec) => {
  const x = plain(r) as unknown as Record<string, unknown>;

  delete x.id;
  return x;
};

const e6 = async () => {
  const purpose = purposeOf(['parity-test']);
  const results: Record<string, unknown> = {};
  let pass = true;
  const jcfgs = randomConfigs('E6', 1, 'coarse', ['J']);
  const all = randomConfigs('E6-all', 2, 'coarse', ['D', 'G', 'J', 'S']);
  const runs: Record<string, DRec[]> = {};

  for (const door of ['D19', 'D21', 'D23', 'D24'] as const) {
    const t = await openToolLab({ backend: 'gpu', door, area: 'engineering', job: J(`E6-${door}`), purpose: `${purpose}: E6 identities`, ledger: path.join(engDir, 'E6', `${door}${TAG}-receipts.jsonl`) });

    try {
      const prev = ({ D21: 'D19', D23: 'D21', D24: 'D23' } as Record<string, DoorName>)[door];
      const boundary = prev ? doorSpecs[prev].last : null;

      runs[door] = await t.lab.evalMany<DRec>(
        all.map((c) => ({ cfg: c, options: { ...armOptions[armOfCfg(c)], ...(boundary ? { boundaries: [boundary] } : {}) }, detail: true, risk: true })),
        `E6 ${door} causal`
      );

      if (door === 'D24') {
        // (a) single-family identities: a J configuration with Growth disabled = its D1 in arm D; with D1 disabled = its
        // Growth in arm G (every record field except the identity)
        const dOf = (c: Cfg) => { const p = S.partsOf(c); return S.cfgOf(S.cellOf(`D.${c.cell.split('.')[1]}`), p.d1, p.ctl, p.entryDay, p.g); };
        const gOf = (c: Cfg) => { const p = S.partsOf(c); const cell = S.cellOf(c.cell); return S.cfgOf(S.cellOf(`G.h${cell.exits}.s${cell.istop}`), p.d1, p.ctl, p.entryDay, p.g); };
        const off = (o: (typeof armOptions)['J'], b: string) => ({ ...o, enabled: { ...o.enabled, [b]: false } });
        const items = jcfgs.flatMap((c) => [
          { cfg: c, options: off(armOptions.J, 'G:VGT') },
          { cfg: dOf(c), options: armOptions.D },
          { cfg: c, options: off(armOptions.J, 'D1:VGT') },
          { cfg: gOf(c), options: armOptions.G },
          // (b) the disabled engine slot is inert: another D1·GDX vector changes nothing
          { cfg: c, options: armOptions.J },
          { cfg: { ...c, d1: { ...c.d1, GDX: Object.fromEntries(S.d1Box.map((b) => [b.key, b.max])) as unknown as Cfg['d1']['GDX'] } }, options: armOptions.J }
        ]);
        const recs = await t.lab.evalMany<SRec>(items, 'E6 identities');
        let dFam = 0;
        let gFam = 0;
        let slot = 0;

        for (let i = 0; i < jcfgs.length; i++) {
          const r = recs.slice(6 * i, 6 * i + 6);

          if (deepDiff(strip(r[0]!), strip(r[1]!)).length) dFam++;
          if (deepDiff(strip(r[2]!), strip(r[3]!)).length) gFam++;
          if (deepDiff(strip(r[4]!), strip(r[5]!)).length) slot++;
        }
        results.singleFamily = { configurations: jcfgs.length, d1OnlyDiffer: dFam, growthOnlyDiffer: gFam };
        results.inertSlot = { configurations: jcfgs.length, differ: slot };
        if (dFam || gFam || slot) pass = false;
      }
    } finally {
      await t.close();
    }
  }

  // (c) causal data access: the run on the longer door has, at the shorter door's last close, exactly the shorter run's
  // marked net, and the same funded lots up to it (closed lots identical; lots open there entered identically)
  const causal = (['D21', 'D23', 'D24'] as const).map((door) => {
    const prev = ({ D21: 'D19', D23: 'D21', D24: 'D23' } as const)[door];
    let equityDiff = 0;
    let lotDiff = 0;

    all.forEach((_c, i) => {
      const a = runs[prev]![i]!;
      const b = runs[door]![i]!;
      const end = doorSpecs[prev].last;

      if (b.periods[0]!.equity !== a.net) equityDiff++;

      const closedA = a.risk.rows.filter((x) => x.exit !== null).map((x) => [x.book, x.entry, x.exit, x.net]);
      const closedB = b.risk.rows.filter((x) => x.exit !== null && x.exit <= end).map((x) => [x.book, x.entry, x.exit, x.net]);
      const openA = a.risk.rows.filter((x) => x.exit === null).map((x) => [x.book, x.entry]);
      const openB = b.risk.rows.filter((x) => x.entry <= end && (x.exit === null || x.exit > end)).map((x) => [x.book, x.entry]);

      if (JSON.stringify(closedA) !== JSON.stringify(closedB) || JSON.stringify(openA) !== JSON.stringify(openB)) lotDiff++;
    });
    if (equityDiff || lotDiff) pass = false;
    return { shorter: prev, longer: door, configurations: all.length, boundaryEquityDiffer: equityDiff, lotsDiffer: lotDiff };
  });
  // (d) accounting on every causal run: Σ lot nets = net (cents), net = realized + unrealized, peak principal ≤ $100,000
  let acct = 0;

  for (const door of Object.keys(runs))
    for (const r of runs[door]!) {
      const sum = r.risk.rows.reduce((a, x) => a + x.net, 0);

      if (Math.abs(sum - r.net) > 0.05 || Math.abs(r.realized + r.unrealized - r.net) > 0.02 || r.peakPrincipal > 100_000 + 1e-6) acct++;
    }
  if (acct) pass = false;

  const record = {
    gate: 'E6',
    what: 'identities on the GPU evaluator (standard §5.1): (a) single-family identities — a joint configuration with Growth·MSFT disabled equals its D1 book evaluated in arm D, and with D1·MSFT disabled equals its Growth book in arm G (every record field but the identity); (b) the disabled engine slot is inert — another D1·GDX vector changes no field; (c) causal data access — on D21, D23 and D24 every configuration (all arms) has, at the previous door’s last close, exactly that shorter run’s marked net and the same funded lots; (d) accounting — Σ lot nets = net, net = realized + unrealized, peak principal ≤ $100,000. Counts only',
    ...results,
    causal,
    accounting: { runs: Object.values(runs).reduce((a, x) => a + x.length, 0), violations: acct },
    pass,
    finished: now()
  };

  writeJson(outFile('E6-identities.json'), record);
  console.log(JSON.stringify({ E6: pass, results, causal, acct }));
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
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / Math.max(1, xs.length);
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

const benchSpec = (arm: Exclude<ArmKey, 'C'>, cell: string, r: number, kind: 'broad' | 'refine' = 'broad', seeds?: LaneSpec['seeds']): LaneSpec => {
  const key = `BENCH-C21/${arm}/${kind}/${cell}/R${r}`;

  return { key, seedKey: key, position: key, stage: kind, replicate: r, cutoff: 'BENCH-C21', kind: kind === 'broad' ? 'indep' : 'refine', res: kind === 'broad' ? 'coarse' : 'fine', cell: S.cellOf(cell), ...(seeds ? { seeds } : {}) };
};

const pilot = async () => {
  const step = opt('step');
  const pilotDir = path.join(engDir, 'pilot');

  if (step === 'lanes') {
    const purpose = purposeOf(['benchmark']);
    // the pilot's frozen D1 for arm S: hash-selected (a fixed screen genome of D.B0), never outcome-selected
    const dcell = S.cellOf('D.B0');
    const fz = S.frozenFrom('BENCHF1', 'pilot (hash-selected)', S.decode(S.pinStratum(S.screenGenomes(1, 'coarse', 'P9-MSFT-BENCH', 'frozen')[0]!, dcell, 0, 1), 'coarse', dcell));

    S.registerFrozen(fz);

    const t0 = Date.now();
    const t = await openToolLab({ backend: 'gpu', door: 'D21', area: 'pilot', job: J('pilot-D21'), purpose: `${purpose}: pilot`, ledger: path.join(pilotDir, `D21${TAG}-receipts.jsonl`) });

    try {
      const specs: Record<string, LaneSpec[]> = {
        D: S.cellsOfArm('D').map((c) => benchSpec('D', c.id, 9001)),
        G: S.cellsOfArm('G').map((c) => benchSpec('G', c.id, 9001)),
        J: S.cellsOfArm('J').map((c) => benchSpec('J', c.id, 9001)),
        S: S.sequentialCells('BENCHF1').map((c) => benchSpec('S', c.id, 9001))
      };
      const out = await Promise.all(
        (['D', 'G', 'J', 'S'] as const).map(async (a) => {
          const ta = Date.now();
          const r = await runLanes(t.lab, armPolicy(a), specs[a]!, 'broad', `pilot ${a}`);

          return { arm: a, wallSeconds: Math.round((Date.now() - ta) / 1000), lanes: r.results.map((x) => ({ key: x.key, structure: x.structure, requested: x.requested, islands: x.islands.length, stop: x.extension.stop })), shortlists: r.results.map((x) => ({ key: x.key, structure: x.structure, picks: x.shortlist.map((p) => S.canonicalCfg(p.cfg)) })) };
        })
      );
      // refinement lanes: the first two J cells (in cell order) with a shortlist, two replicates each, seeded by their
      // pilot shortlists (a fixed rule; no outcome is read)
      const jShort = out.find((o) => o.arm === 'J')!.shortlists.filter((s) => s.picks.length).slice(0, 2);
      const refSpecs = jShort.flatMap((s) => [9001, 9002].map((r) => benchSpec('J', s.structure, r, 'refine', s.picks.map((c, i) => ({ label: `pilot ${s.key}#${i + 1}`, cfg: c, focus: i === 0 })))));
      const tr = Date.now();
      const ref = refSpecs.length ? await runLanes(t.lab, armPolicy('J'), refSpecs, 'refine', 'pilot refine') : { results: [] };
      const wall = (Date.now() - t0) / 1000;
      const requested = out.reduce((a, o) => a + o.lanes.reduce((b, l) => b + l.requested, 0), 0) + ref.results.reduce((a, r) => a + r.requested, 0);
      const bytes = dirBytes(path.join(cacheDir, 'pilot', 'jobs', J('pilot-D21')));

      writeJson(path.join(pilotDir, 'lanes.json'), {
        door: 'D21',
        frozen: fz,
        arms: out.map((o) => ({ arm: o.arm, wallSeconds: o.wallSeconds, lanes: o.lanes, laneSummary: summarizeLanes(o.lanes) })),
        refine: { wallSeconds: Math.round((Date.now() - tr) / 1000), lanes: ref.results.map((x) => ({ key: x.key, structure: x.structure, requested: x.requested, islands: x.islands.length, stop: x.extension.stop })) },
        requested,
        fresh: t.lab.fresh,
        hits: t.lab.hits,
        wallSeconds: Math.round(wall),
        requestedPerSecond: Math.round(requested / wall),
        freshPerSecond: Math.round(t.lab.fresh / wall),
        archiveBytes: bytes,
        bytesPerFresh: t.lab.fresh ? Math.round(bytes / t.lab.fresh) : null,
        cgroupPeakBytes: cgroupPeak(),
        rssPeakBytes: process.resourceUsage().maxRSS * 1024
      });
    } finally {
      await t.close();
    }
    return;
  }

  // the summary: expected costs (the launch rule only) and arm S's replicate count by the frozen matching rule
  const p = readJ<{ arms: { arm: string; laneSummary: { meanRequested: number }; lanes: { structure: string; requested: number; islands: number; stop: string }[] }[]; refine: { lanes: { requested: number }[] }; requestedPerSecond: number; freshPerSecond: number; bytesPerFresh: number; cgroupPeakBytes: number; rssPeakBytes: number; wallSeconds: number; fresh: number; requested: number }>(path.join(pilotDir, 'lanes.json'));
  const m = Object.fromEntries(p.arms.map((a) => [a.arm, a.laneSummary.meanRequested]));
  const refineMean = Math.round(mean(p.refine.lanes.map((l) => l.requested)));
  const doors = ['D19', 'D21', 'D23', 'D24'];
  const perLane = Object.fromEntries((['D', 'G', 'J', 'S'] as const).map((a) => [a, { broad: Object.fromEntries(doors.map((d) => [d, m[a]!])), refine: Object.fromEntries(doors.map((d) => [d, refineMean])) }]));
  const F = 3;
  const rS = sequentialReplicates(F);
  const expected = { perLane, perMember: perMemberMax, perSubject };
  // planning: arm S's lanes priced at E[J lane] (an S lane is a J lane with the D1 book frozen; the pilot's own S lanes ran
  // on a HASH-selected, never outcome-selected frozen D1 whose proposals were mostly implausible, so their mean understates a
  // real finalist's lanes — reported, never used)
  // base broad lanes from budget.ts (cells × base replicates: D 8 × 8, G 6 × 24, J 48 × 8; S 6·F·R_S(F) at F = 3)
  const lanesD = 8 * replicates.base.D;
  const lanesG = 6 * replicates.base.G;
  const lanesJ = 48 * replicates.base.J;
  const perCutoff = {
    broad: lanesD * m.D! + lanesG * m.G! + lanesJ * m.J! + F * 6 * rS * m.J!,
    refine: (8 + 6 + 16 + 12) * replicates.refine * refineMean,
    lanes: { D: lanesD, G: lanesG, J: lanesJ, S: F * 6 * rS, refine: (8 + 6 + 16 + 12) * replicates.refine }
  };
  const record = {
    gate: 'E9 (pilot / benchmark)',
    what: 'the study-schedule pilot (NON-OFFICIAL, purpose benchmark, BENCH seed keys never used by the study) on D21: one broad lane per cell of every arm (D 8, G 6, J 48, S 6 on a hash-selected frozen D1) and 4 J refinement lanes seeded by the pilot’s own shortlists, with the frozen two-tier island rule — requested per lane, islands, stop reasons, throughput, memory and archive bytes; outputs are counts and timings only (no profit or drawdown of any searched configuration was read)',
    pilot: { ...p, arms: p.arms.map((a) => ({ arm: a.arm, laneSummary: summarizeLanes(a.lanes) })) },
    expected,
    sequentialReplicates: {
      rule: `R_S(F) = max(${replicates.base.D}, ⌈(${48 * replicates.base.J} − ${8 * replicates.base.D}) ÷ (6·F)⌉): arm S, its D1 step (arm D’s ${8 * replicates.base.D} base lanes) included, gets at least arm J’s ${48 * replicates.base.J} base lanes (a data-independent lane-count rule fixed before any official result)`,
      byF: { 1: sequentialReplicates(1), 2: sequentialReplicates(2), 3: sequentialReplicates(3) },
      pilotMeans: m,
      note: 'the pilot’s S lanes (hash-selected frozen D1) averaged ' + m.S + ' requested — not representative of a qualified finalist; arm S’s replicates follow the data-independent lane-matching rule of budget.ts (S + its D1 step ≥ J’s base lanes), as in P6-TSLA and P8-GDX'
    },
    planning: { perCutoffRequested: perCutoff, studyRequestedEstimate: 4 * (perCutoff.broad + perCutoff.refine), hoursAtPilotThroughput: Math.round((4 * (perCutoff.broad + perCutoff.refine)) / p.requestedPerSecond / 360) / 10, note: 'before replicate rounds and qualification (≈ 650 requested per qualified member)' },
    laneCaps,
    nl0Caps,
    islandCaps: Object.fromEntries((['broad', 'refine'] as const).map((k) => [k, schedules[k].islandsMax])),
    pass: p.arms.length === 4 && p.refine.lanes.length > 0,
    finished: now()
  };

  writeJson(outFile('pilot.json'), record);
  console.log(JSON.stringify({ pilot: record.pass, means: m, refineMean, rS, planning: record.planning, throughput: p.requestedPerSecond }));
};

// ----- E7 / E8: a test-suite result -----

const recordTests = () => {
  const gate = opt('gate');
  const log = opt('log');
  const known = Number(opt('known', '0'));
  const text = fs.readFileSync(log, 'utf8');
  const num = (k: string) => Number((text.match(new RegExp(`^# ${k} (\\d+)`, 'm')) ?? [])[1] ?? NaN);
  const failingFiles = [...text.matchAll(/^not ok \d+ - (.+)$/gm)].map((mm) => mm[1]!);
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
void researchDir;
