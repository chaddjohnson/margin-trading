// Report-only replays (PROTOCOL.md §13; post-freeze tooling, never a selection input):
//   finalists — every frozen C24 finalist and New L0. Development (D24) and, only after the validation is sealed, FULL:
//               the causal ablations (controls reverted to legacy; Growth·VGT frozen at New L0's; New L0's D1 under the
//               finalist's controls and Growth; New L0 with the finalist's mechanics; the finalist's D1 alone and its
//               Growth alone on New L0's other vectors; each protected book's activation switched; each gated book's
//               K ± 1; each control removed), each with net, DD, lots, occupancy, interest and costs; holding durations
//               per book and the lots open at every cutoff close; the 2020-crash and 2022-bear episodes; every protective
//               exit that filled below its level; on FULL the carried lot's give-back and the 2025–2026 per-lot
//               excursions and the training selection neighbourhood on 2025–2026.
//   folds     — every Track I fold primary on its next door: the slice's episodes, protective exits, holding durations
//               and booked profit by book after the boundary.
//   ledgers   — the trade ledger, the capital-pool funding log and the phenotype manifest of every C24 primary, the
//               lower-drawdown roles and New L0 on FULL (after the validation).
//   node --experimental-transform-types tools/vg-l0-full-joint/replays.ts <finalists|folds|ledgers> [--dry]
import path from 'node:path';
import { recordOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { EvalOptions, Rec } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import type { PoolResult } from '../../src/vg-d1-growth-joint/pool.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import type { D1RiskControls2, RiskConfig2 } from '../../src/d1-risk-controls-rc2/config.ts';
import { wilson } from '../../src/vg-d1-growth-diagnostic/risk.ts';
import { economics, resultsDir } from '../../src/vg-l0-full-joint/context.ts';
import { openStudyDoor } from '../../src/vg-l0-full-joint/doors.ts';
import { riskInputsOf } from '../../src/vg-l0-full-joint/evaluate.ts';
import { foldRun } from '../../src/vg-l0-full-joint/folds.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { drawsOf, famOf } from '../../src/vg-l0-full-joint/qualify.ts';
import { isSealed } from '../../src/vg-l0-full-joint/records.ts';
import {
  type Cfg,
  canonicalCfg,
  cellIdOf,
  cellOf,
  cfgId,
  cfgOf,
  controlValuesOf,
  describeCfg,
  entryDayOf,
  gId,
  legacyCellId,
  protectedFamily,
  quadOf
} from '../../src/vg-l0-full-joint/space.ts';
import { quantile } from '../../src/vg-l0-full-joint/fitness.ts';
import { allEvidence, baseDir, cutoffEnd, exists, finalKey, foldKeys, frozenSelection, isStudy, nextDoor, r2, selection, writeDiagnostic } from './common.ts';

const dry = process.argv.includes('--dry');
const emit = (name: string, v: unknown) => (dry ? console.log(JSON.stringify(v, null, 1).slice(0, 8000)) : writeDiagnostic(name, v));
const symbols = ['GDX', 'VGT'] as const;

export const episodes = {
  'crash 2020': ['2020-02-19', '2020-04-30'],
  'bear 2022': ['2022-01-03', '2022-12-30']
} as const;

const run = (door: Door, cfg: Cfg, o: EvalOptions = vOptions) => {
  const x = runWithControls2(door, quadOf(cfg), cfg.controls, o, true, true);

  return { x, rec: recordOf(door, quadOf(cfg), x, o) };
};
const brief = (door: Door, r: { x: { result: PoolResult }; rec: Rec }) => {
  const risk = riskInputsOf(door, r.x, r.rec);

  return {
    net: r2(r.rec.net),
    dd: r2(r.rec.dd),
    lots: r.rec.lots,
    realized: r2(r.rec.realized),
    unrealized: r2(r.rec.unrealized),
    interest: r2(r.rec.interest),
    costs: r2(r.rec.costs),
    occupancy: r2(risk.occupancy),
    worstLotMae: r2(risk.mae.worst),
    booked: Object.fromEntries(Object.entries(r.rec.books).map(([b, v]) => [b, r2(v.booked)])),
    periods: r.rec.periods.map((p) => ({ after: r2(p.after), dd: r2(p.dd) }))
  };
};

// the window's drawdown (peak reset at the window's first mark), losses by book, losing D1 entries, exit reasons
export const episodeOf = (r: PoolResult, from: string, to: string) => {
  const t0 = Date.parse(`${from}T00:00:00Z`) / 1000;
  const t1 = Date.parse(`${to}T23:59:59Z`) / 1000;
  const m = r.markChanges!;
  let peak = -Infinity;
  let dd = 0;
  let troughT = NaN;

  for (let i = 0; i < m.t.length; i++) {
    if (m.t[i]! < t0 || m.t[i]! > t1) continue;
    if (m.v[i]! > peak) peak = m.v[i]!;
    if (peak - m.v[i]! > dd) {
      dd = peak - m.v[i]!;
      troughT = m.t[i]!;
    }
  }

  const inWin = (t: number) => t >= t0 && t <= t1;
  const exited = r.lots.filter((l) => !l.open && inWin(l.fills.at(-1)!.t));
  const byBook: Record<string, { lots: number; net: number; losing: number }> = {};

  for (const l of exited) {
    const b = (byBook[l.book] ??= { lots: 0, net: 0, losing: 0 });

    b.lots++;
    b.net = r2(b.net + l.net);
    if (l.net < 0) b.losing++;
  }

  return {
    window: [from, to],
    dd: r2(dd),
    trough: Number.isFinite(troughT) ? new Date(troughT * 1000).toISOString().slice(0, 10) : null,
    byBook,
    losingD1Entries: r.lots.filter((l) => l.book.startsWith('D1:') && inWin(l.entryT) && !l.open && l.net < 0).length,
    exitReasons: exited.reduce<Record<string, number>>((a, l) => {
      const k = l.fills.at(-1)!.reason;

      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {})
  };
};

// every funded protective exit that filled below its level (a gap or a minute open through the stop)
export const gapsThroughStop = (door: Door, cfg: Cfg, r: PoolResult) => {
  const out: Record<string, unknown>[] = [];

  for (const l of r.lots) {
    const f = l.fills.at(-1);

    if (!f || !f.reason.startsWith('protective')) continue;

    const d = controlValuesOf(cfg, l.book.slice(3) as 'GDX' | 'VGT').d!;
    const level = l.entryRaw * (1 - d / 1000);

    if (f.raw < level - 1e-9)
      out.push({
        book: l.book,
        entry: door.dates[l.entryS],
        exit: door.dates[f.s],
        reason: f.reason,
        stopDistancePct: d / 10,
        realizedPct: r2((100 * (f.raw - l.entryRaw)) / l.entryRaw),
        beyondStopPct: r2((100 * (level - f.raw)) / l.entryRaw),
        net: r2(l.net)
      });
  }
  return out.sort((a, b) => (b.beyondStopPct as number) - (a.beyondStopPct as number));
};

// holding durations per book (calendar days; to the door's end while open), the lots open at each cutoff close, and the
// interest each book's lots paid
export const holdingsOf = (door: Door, r: PoolResult) => {
  const endT = door.sym.VGT.ds.sTime[r.endIndex]!;
  const days = (l: PoolResult['lots'][number]) => ((l.open ? endT : door.sym.VGT.ds.sTime[l.fills.at(-1)!.s]!) - door.sym.VGT.ds.sTime[l.entryS]!) / 86400;
  const byBook: Record<string, { lots: number; medianDays: number; p90Days: number; maxDays: number; longest: { entry: string; days: number; net: number; open: boolean } | null; interest: number }> = {};

  for (const b of [...new Set(r.lots.map((l) => l.book))]) {
    const ls = r.lots.filter((l) => l.book === b);
    const ds = ls.map(days).sort((x, y) => x - y);
    const longest = [...ls].sort((x, y) => days(y) - days(x))[0];

    byBook[b] = {
      lots: ls.length,
      medianDays: r2(quantile(ds, 0.5)),
      p90Days: r2(quantile(ds, 0.9)),
      maxDays: r2(ds.at(-1) ?? 0),
      longest: longest ? { entry: door.dates[longest.entryS]!, days: r2(days(longest)), net: r2(longest.net), open: longest.open } : null,
      interest: r2(ls.reduce((a, l) => a + l.interest, 0))
    };
  }

  const openAt: Record<string, string[]> = {};

  for (const [cut, date] of Object.entries(cutoffEnd)) {
    const s = door.dates.indexOf(date);

    if (s < 0 || s > r.endIndex) continue;
    openAt[cut] = r.lots.filter((l) => l.entryS <= s && (l.open || l.fills.at(-1)!.s > s)).map((l) => `${l.book} from ${door.dates[l.entryS]}`);
  }

  return { byBook, openAt };
};

const withBook = (x: Cfg, s: 'GDX' | 'VGT', b: D1RiskControls2 | undefined): Cfg => {
  const books: RiskConfig2['books'] = { ...(x.controls?.books ?? {}) };

  if (b && Object.keys(b).length) books[`D1:${s}`] = b;
  else delete books[`D1:${s}`];
  return { cell: `${x.cell} (ablation)`, d1: x.d1, g: x.g, controls: Object.keys(books).length ? { version: x.controls?.version ?? 1, books } : null };
};

// The causal ablations (attribution only; never a nomination)
export const variantsOf = (x: Cfg, nl0: Cfg): Record<string, Cfg> => {
  const cell = cellOf(x.cell);
  const ctl = { GDX: controlValuesOf(x, 'GDX'), VGT: controlValuesOf(x, 'VGT') };
  const act = { GDX: entryDayOf(x, 'GDX'), VGT: entryDayOf(x, 'VGT') };
  const legacy = cellOf(legacyCellId);
  const none = { GDX: {}, VGT: {} };
  const off = { GDX: false, VGT: false };
  const out: Record<string, Cfg> = {
    finalist: x,
    'controls reverted to legacy (its D1 and Growth)': cfgOf(legacy, x.d1, none, off, x.g),
    'Growth·VGT frozen at New L0’s (its D1 and controls)': cfgOf(cell, x.d1, ctl, act, nl0.g),
    'New L0’s D1 under its controls and Growth': cfgOf(cell, nl0.d1, ctl, act, x.g),
    'New L0 with its mechanics (controls only)': cfgOf(cell, nl0.d1, ctl, act, nl0.g),
    'its D1 alone (New L0’s Growth, legacy controls)': cfgOf(legacy, x.d1, none, off, nl0.g),
    'its Growth alone (New L0’s D1, legacy controls)': cfgOf(legacy, nl0.d1, none, off, x.g),
    'New L0': nl0
  };

  for (const s of symbols) {
    const b = cell[s];

    if (protectedFamily(b.family)) out[`${s} activation switched`] = cfgOf(cell, x.d1, ctl, { ...act, [s]: !act[s] }, x.g);
    if (b.gate)
      for (const dk of [-1, 1]) {
        const k = ctl[s].k! + dk;

        if (k >= 1 && k <= 4) out[`${s} K ${dk > 0 ? '+1' : '−1'}`] = cfgOf(cell, x.d1, { ...ctl, [s]: { ...ctl[s], k } }, act, x.g);
      }

    const c = x.controls?.books[`D1:${s}`];

    if (!c) continue;
    if (c.protectiveStop?.mode === 'on' && c.hold?.mode !== 'disabled' && c.hold?.mode !== 'adaptive') out[`${s} without the protective stop`] = withBook(x, s, { ...c, protectiveStop: undefined });
    if (c.hold && c.hold.mode !== 'legacy') out[`${s} legacy calendar hold instead of ${c.hold.mode}${c.hold.mode === 'disabled' ? ' (the inert hold at its box minimum, 3 days)' : ''}`] = cfgOf(cellOf(s === 'GDX' ? cellIdOf({ family: 'B', gate: b.gate }, cell.VGT) : cellIdOf(cell.GDX, { family: 'B', gate: b.gate })), x.d1, ctl, act, x.g);
    if (c.declineGate?.mode === 'on') out[`${s} without the decline gate`] = cfgOf(cellOf(s === 'GDX' ? cellIdOf({ ...b, gate: false }, cell.VGT) : cellIdOf(cell.GDX, { ...b, gate: false })), x.d1, ctl, act, x.g);
  }

  return out;
};

const finalistsStudy = async () => {
  const frozen = frozenSelection();
  const validated = isSealed(path.join(resultsDir, 'validation', 'validation.json')) || (!isStudy && exists('validation', 'validation.json'));
  const devDoor = isStudy ? 'D24' : 'D19';
  const d24 = await openStudyDoor(devDoor, 'report-only diagnostics: finalists on development');
  const full = validated && isStudy ? await openStudyDoor('FULL', 'report-only diagnostics: finalists on FULL (after the validation)') : null;
  const sel = selection(finalKey);
  const ev = new Map(allEvidence(finalKey).map((e) => [e.label, e]));
  const nl0 = canonicalCfg(frozen.newL0.cfg);
  const rows: Record<string, unknown>[] = [];
  const fullO = { ...vOptions, boundaries: ['2024-12-31'] };

  for (const f of [...frozen.finalists, { label: 'control: New L0', cfg: nl0, why: ['control'] }]) {
    const x = canonicalCfg(f.cfg);
    const e = f.label === 'control: New L0' ? sel.control! : ev.get(f.label)!;
    const variants = variantsOf(x, nl0);
    const dev: Record<string, unknown> = {};
    const fullRows: Record<string, unknown> = {};

    for (const [k, c] of Object.entries(variants)) {
      try {
        dev[k] = brief(d24, run(d24, c));
        if (full) fullRows[k] = brief(full, run(full, c, fullO));
      } catch (error) {
        dev[k] = `not evaluable: ${(error as Error).message.split('\n')[0]}`;
      }
    }

    const devRun = run(d24, x);
    const fullRun = full ? run(full, x, fullO) : null;
    let nextSlice: unknown = null;
    let neighbourhood: unknown = null;

    if (full) {
      const fr = foldRun(full, x, '2024-12-31');

      nextSlice = { sliceNet: r2(fr.sliceNet), sliceDd: r2(fr.sliceDd), giveBack: fr.giveBack, nextSlice: fr.nextSlice };

      const draws = [1, 2].flatMap((rep) => drawsOf(x, famOf('select', ['select', rep, 'C24'])));
      const seen = new Set<string>();
      const dds = draws
        .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
        .map((d) => run(full, d.cfg, fullO).rec.periods[0]!.dd)
        .sort((a, b) => a - b);
      const k = dds.filter((v) => v > economics.ceiling).length;

      neighbourhood = { draws: dds.length, breaches: k, breachShare: r2(k / dds.length), wilson95: wilson(k, dds.length).map(r2), medianSliceDd: r2(quantile(dds, 0.5)), worstSliceDd: r2(dds.at(-1)!), trainingBreachShare: e.selectTail.breachShare };
    }

    rows.push({
      label: f.label,
      why: f.why,
      id: cfgId(x),
      cell: x.cell,
      growthId: gId(x.g),
      phenotype: describeCfg(x),
      cutoffExposure: { conservativeNet: r2(e.risk.conservativeNet), openShare: e.risk.openShare, openLot: e.risk.openLot, occupancy: r2(e.risk.occupancy), mae: e.risk.mae, maeByBook: e.risk.maeByBook, worstRealized: e.risk.worstRealized, meanLosing: e.risk.meanLosing },
      stresses: e.stress,
      removals: e.removal,
      confirm: e.confirm,
      confirmTail: e.confirmTail,
      boundary: e.boundary,
      development: dev,
      full: full ? fullRows : 'FULL closed until the validation is sealed',
      holdings: { development: holdingsOf(d24, devRun.x.result), full: fullRun && full ? holdingsOf(full, fullRun.x.result) : null },
      nextSlice2025: nextSlice,
      trainingNeighbourhoodOn2025: neighbourhood,
      episodes: Object.fromEntries(Object.entries(episodes).map(([k, [a, b]]) => [k, episodeOf(devRun.x.result, a, b)])),
      gapsThroughStop: { development: gapsThroughStop(d24, x, devRun.x.result), full: fullRun && full ? gapsThroughStop(full, x, fullRun.x.result) : null }
    });
  }

  emit('finalists', { validatedBeforeFull: validated, developmentDoor: devDoor, rows });
};

const foldsStudy = async () => {
  const rows: Record<string, unknown>[] = [];

  for (const cut of foldKeys) {
    if (!exists('folds', cut, 'evaluation.json')) continue;

    const sel = selection(cut);
    const door = await openStudyDoor(nextDoor[cut]!, `report-only diagnostics: ${cut} fold primaries`);
    const labels = new Map<string, string[]>();
    const boundary = cutoffEnd[cut]!;
    const b = door.dates.indexOf(boundary);

    for (const p of ['L', 'B', 'F'] as const)
      for (const [s, l] of Object.entries(sel.primaries[p] ?? {})) if (l) labels.set(l, [...(labels.get(l) ?? []), `${p}/${s}`]);

    for (const [label, procs] of labels) {
      const cfg = canonicalCfg(sel.subjects[label]!.cfg);
      const r = run(door, cfg, { ...vOptions, boundaries: [boundary] });
      const after = r.x.result.lots.filter((l) => !l.open && l.fills.at(-1)!.s > b);
      const bookedAfter: Record<string, number> = {};

      for (const l of after) bookedAfter[l.book] = r2((bookedAfter[l.book] ?? 0) + l.net);

      rows.push({
        cutoff: cut,
        label,
        procedures: procs,
        cell: cfg.cell,
        phenotype: describeCfg(cfg),
        slice: brief(door, r).periods[0],
        bookedAfterBoundaryByBook: bookedAfter,
        holdings: holdingsOf(door, r.x.result),
        episodes: Object.fromEntries(Object.entries(episodes).filter(([, [a]]) => a > boundary && a <= door.dates.at(-1)!).map(([k, [a, z]]) => [k, episodeOf(r.x.result, a, z)])),
        gapsThroughStop: gapsThroughStop(door, cfg, r.x.result).filter((g) => (g.exit as string) > boundary)
      });
    }
  }

  emit('fold-primaries', { rows });
};

const ledgersStudy = async () => {
  if (!isSealed(path.join(resultsDir, 'validation', 'validation.json')) && isStudy) throw new Error('the ledgers run on FULL after the validation only');

  const frozen = frozenSelection();
  const door = isStudy ? await openStudyDoor('FULL', 'report-only ledgers of the C24 primaries (after the validation)') : await openStudyDoor('D19', 'pilot ledger stand-in');
  const subjects = new Map<string, Cfg>();

  for (const p of frozen.procedures) if (p.primary) subjects.set(p.primary, canonicalCfg(frozen.finalists.find((x) => x.label === p.primary)!.cfg));
  for (const x of frozen.finalists) if (x.why.some((w) => w.includes('lower-drawdown'))) subjects.set(x.label, canonicalCfg(x.cfg));
  subjects.set('control: New L0', canonicalCfg(frozen.newL0.cfg));

  const out: Record<string, unknown> = {};

  for (const [label, cfg] of subjects) {
    const r = run(door, cfg, { ...vOptions, boundaries: [isStudy ? '2024-12-31' : '2018-12-31'] });

    out[label] = {
      manifest: { id: cfgId(cfg), cell: cfg.cell, growthId: gId(cfg.g), d1: cfg.d1, controls: cfg.controls, growth: cfg.g, phenotype: describeCfg(cfg) },
      lots: r.x.result.lots.map((l, i) => ({
        lot: i + 1,
        book: l.book,
        kind: l.trade.kind,
        decision: new Date(l.trade.dT * 1000).toISOString().slice(0, 16),
        entry: door.dates[l.entryS],
        entryRaw: l.entryRaw,
        exits: l.fills.map((f) => ({ date: door.dates[f.s], raw: f.raw, partial: f.partial, reason: f.reason, net: r2(f.net) })),
        open: l.open,
        net: r2(l.net),
        interest: r2(l.interest),
        costs: r2(l.costs)
      })),
      funding: r.x.result.funding
    };
  }

  emit('ledgers', { door: isStudy ? 'FULL' : 'D19 (pilot stand-in)', subjects: out });
};

const which = process.argv[2];

if (which === 'finalists') await finalistsStudy();
if (which === 'folds') await foldsStudy();
if (which === 'ledgers') await ledgersStudy();
if (!['finalists', 'folds', 'ledgers'].includes(which ?? '')) console.error('usage: replays.ts <finalists|folds|ledgers> [--dry]');
void baseDir;
