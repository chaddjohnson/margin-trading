// Report-only replays (PROTOCOL.md §13; post-freeze tooling, never a selection input):
//   finalists — every C24 finalist and New L0: the C24 cutoff exposure (from the sealed evidence); on FULL (only after the
//               validation is sealed): the carried lot's give-back and the 2025–2026 per-lot excursions, the training
//               selection neighbourhood on 2025–2026; on D24 and FULL: mechanics versus parameters (the finalist's D1
//               vectors under legacy mechanics; New L0's D1 vectors under the finalist's controls), each protected book's
//               activation flipped, each gated book's K ± 1; the 2020-crash and 2022-bear episodes; every protective exit
//               that filled below its level (gap or minute open through the stop).
//   folds     — every fold primary on its next door: the 2020 and 2022 episodes of its slice and its protective exits.
//   node --experimental-transform-types tools/vg-l0-risk-families/replays.ts <finalists|folds> [--dry]
import { recordOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import type { PoolResult } from '../../src/vg-d1-growth-joint/pool.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { wilson } from '../../src/vg-d1-growth-diagnostic/risk.ts';
import { economics, frozenSelectionFile, resultsDir } from '../../src/vg-l0-risk-families/context.ts';
import { openStudyDoor } from '../../src/vg-l0-risk-families/doors.ts';
import { foldRun } from '../../src/vg-l0-risk-families/folds.ts';
import { vOptions } from '../../src/vg-l0-risk-families/nl0.ts';
import { drawsOf, famOf } from '../../src/vg-l0-risk-families/qualify.ts';
import { isSealed, readJson } from '../../src/vg-l0-risk-families/records.ts';
import { type Cfg, cellIdOf, cellOf, controlValuesOf, decode, encode, quadOf } from '../../src/vg-l0-risk-families/space.ts';
import { quantile } from '../../src/vg-l0-risk-families/fitness.ts';
import { allEvidence, exists, foldKeys, r2, selection, writeDiagnostic } from './common.ts';
import path from 'node:path';

const dry = process.argv.includes('--dry');
const emit = (name: string, v: unknown) => (dry ? console.log(JSON.stringify(v, null, 1).slice(0, 8000)) : writeDiagnostic(name, v));

export const episodes = {
  'crash 2020': ['2020-02-19', '2020-04-30'],
  'bear 2022': ['2022-01-03', '2022-12-30']
} as const;

const run = (door: Door, cfg: Cfg, o: EvalOptions = vOptions) => {
  const x = runWithControls2(door, quadOf(cfg), cfg.controls, o, true, true);

  return { x, rec: recordOf(door, quadOf(cfg), x, o) };
};
const brief = (rec: ReturnType<typeof recordOf>) => ({ net: r2(rec.net), dd: r2(rec.dd), lots: rec.lots, periods: rec.periods.map((p) => ({ after: r2(p.after), dd: r2(p.dd) })) });

// the window's drawdown (peak reset at the window's first mark), losses by book, losing D1 entries, protective exits
export const episodeOf = (door: Door, r: PoolResult, from: string, to: string) => {
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

// mechanics versus parameters: the finalist's D1 vectors under legacy mechanics; New L0's D1 vectors under the
// finalist's controls (repaired in its cell); each protected book's activation flipped; each gated book's K ± 1
export const variantsOf = (x: Cfg, nl0: Cfg) => {
  const cell = cellOf(x.cell);
  const out: Record<string, Cfg> = {
    finalist: x,
    'finalist D1 under legacy mechanics': { cell: 'GA0.VA0', d1: x.d1, controls: null },
    'New L0 D1 under the finalist mechanics': decode([...encode({ ...nl0, cell: x.cell, controls: x.controls }).slice(0, 16), ...encode(x).slice(16)], cell),
    'New L0': nl0
  };

  for (const s of ['GDX', 'VGT'] as const) {
    const b = cell[s];

    if (b.family !== 'A') {
      const flipped = { ...b, entryDay: !b.entryDay };
      const c2 = cellOf(s === 'GDX' ? cellIdOf(flipped, cell.VGT) : cellIdOf(cell.GDX, flipped));

      out[`${s} activation ${b.entryDay ? 'entry-day → next-session' : 'next-session → entry-day'}`] = decode(encode(x), c2);
    }
    if (b.gate) {
      const g = encode(x);
      const k = 16 + (s === 'GDX' ? 0 : 6) + 3;

      for (const dk of [-1, 1]) {
        if (g[k]! + dk < 0 || g[k]! + dk > 3) continue;

        const h = [...g];

        h[k] = g[k]! + dk;
        out[`${s} K ${dk > 0 ? '+1' : '−1'}`] = decode(h, cell);
      }
    }
  }
  return out;
};

const finalistsStudy = async () => {
  const frozen = readJson<{ finalists: { label: string; cfg: Cfg; why: string[] }[]; newL0: { cfg: Cfg } }>(frozenSelectionFile);
  const validated = isSealed(path.join(resultsDir, 'validation', 'validation.json'));
  const d24 = await openStudyDoor('D24', 'report-only diagnostics: finalists on development');
  const full = validated ? await openStudyDoor('FULL', 'report-only diagnostics: finalists on FULL (after the validation)') : null;
  const sel = selection('C24');
  const ev = new Map(allEvidence('C24').map((e) => [e.label, e]));
  const nl0 = frozen.newL0.cfg;
  const rows: Record<string, unknown>[] = [];

  for (const f of [...frozen.finalists, { label: 'control: New L0', cfg: nl0, why: ['control'] }]) {
    const e = f.label === 'control: New L0' ? sel.control! : ev.get(f.label)!;
    const variants = variantsOf(f.cfg, nl0);
    const dev: Record<string, unknown> = {};
    const fullRows: Record<string, unknown> = {};

    for (const [k, c] of Object.entries(variants)) {
      dev[k] = brief(run(d24, c).rec);
      if (full) fullRows[k] = brief(run(full, c, { ...vOptions, boundaries: ['2024-12-31'] }).rec);
    }

    const devRun = run(d24, f.cfg);
    const fullRun = full ? run(full, f.cfg, { ...vOptions, boundaries: ['2024-12-31'] }) : null;
    let nextSlice: unknown = null;
    let neighbourhood: unknown = null;

    if (full) {
      const fr = foldRun(full, f.cfg, '2024-12-31');

      nextSlice = { sliceNet: r2(fr.sliceNet), sliceDd: r2(fr.sliceDd), giveBack: fr.giveBack, nextSlice: fr.nextSlice };

      const draws = [1, 2].flatMap((rep) => drawsOf(f.cfg, famOf('select', ['select', rep, 'C24'])));
      const seen = new Set<string>();
      const dds = draws
        .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)))
        .map((d) => run(full, d.cfg, { ...vOptions, boundaries: ['2024-12-31'] }).rec.periods[0]!.dd)
        .sort((a, b) => a - b);
      const k = dds.filter((x) => x > economics.ceiling).length;

      neighbourhood = { draws: dds.length, breaches: k, breachShare: r2(k / dds.length), wilson95: wilson(k, dds.length).map(r2), medianSliceDd: r2(quantile(dds, 0.5)), worstSliceDd: r2(dds.at(-1)!), trainingBreachShare: e.selectTail.breachShare };
    }

    rows.push({
      label: f.label,
      why: f.why,
      cell: f.cfg.cell,
      controls: f.cfg.controls,
      d1: f.cfg.d1,
      cutoffExposure: { conservativeNet: r2(e.risk.conservativeNet), openShare: e.risk.openShare, openLot: e.risk.openLot, occupancy: r2(e.risk.occupancy), mae: e.risk.mae, maeByBook: e.risk.maeByBook, worstRealized: e.risk.worstRealized, meanLosing: e.risk.meanLosing },
      stresses: e.stress,
      removals: e.removal,
      confirmTail: e.confirmTail,
      development: dev,
      full: full ? fullRows : 'FULL closed until the validation is sealed',
      nextSlice2025: nextSlice,
      trainingNeighbourhoodOn2025: neighbourhood,
      episodes: Object.fromEntries(Object.entries(episodes).map(([k, [a, b]]) => [k, episodeOf(d24, devRun.x.result, a, b)])),
      gapsThroughStop: { development: gapsThroughStop(d24, f.cfg, devRun.x.result), full: fullRun && full ? gapsThroughStop(full, f.cfg, fullRun.x.result) : null }
    });
  }

  emit('finalists', { validatedBeforeFull: validated, rows });
};

const foldsStudy = async () => {
  const rows: Record<string, unknown>[] = [];

  for (const cut of foldKeys) {
    if (!exists('folds', cut, 'evaluation.json')) continue;

    const sel = selection(cut);
    const door = await openStudyDoor(({ C19: 'D21', C21: 'D23', C23: 'D24' } as const)[cut], `report-only diagnostics: ${cut} fold primaries`);
    const labels = new Map<string, string[]>();

    for (const [p, ss] of Object.entries(sel.primaries))
      for (const [s, l] of Object.entries(ss)) if (l) labels.set(l, [...(labels.get(l) ?? []), `${p}/${s}`]);

    for (const [label, procs] of labels) {
      const cfg = sel.subjects[label]!.cfg;
      const r = run(door, cfg, { ...vOptions, boundaries: [{ C19: '2019-12-31', C21: '2021-12-31', C23: '2023-12-29' }[cut]] });
      const eps = Object.entries(episodes).filter(([, [a]]) => a > ({ C19: '2019-12-31', C21: '2021-12-31', C23: '2023-12-29' } as Record<string, string>)[cut]! && a < (cut === 'C19' ? '2022' : cut === 'C21' ? '2024' : '2025'));

      rows.push({
        cutoff: cut,
        label,
        procedures: procs,
        cell: cfg.cell,
        slice: brief(r.rec).periods[0],
        episodes: Object.fromEntries(eps.map(([k, [a, b]]) => [k, episodeOf(door, r.x.result, a, b)])),
        gapsThroughStop: gapsThroughStop(door, cfg, r.x.result).filter((g) => (g.exit as string) > ({ C19: '2019-12-31', C21: '2021-12-31', C23: '2023-12-29' } as Record<string, string>)[cut]!)
      });
    }
  }

  emit('fold-primaries', { rows });
};

const which = process.argv[2];

if (which === 'finalists') await finalistsStudy();
if (which === 'folds') await foldsStudy();
