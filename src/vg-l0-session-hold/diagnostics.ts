// The development diagnostics (PROTOCOL.md §11.3; report-only, never a selection input), sealed before the frozen
// selection, on the D24 door (2016-01-04 → 2024-12-31).
//
// 1. Mechanism: for the primary C, the independent and informed primaries, New L0, C4, C4-refined and D, under BOTH hold
//    units (so New L0 gives A and B): the funded-lot ledger (each lot's component, entry, exit, exit reason, sessions and
//    calendar days held, interest, costs, net, MAE / MFE), the funding decisions with every refusal and its occupant,
//    the pool's holding periods, the deepest drawdown episodes, the exit reasons by component, and matched lots between
//    the two units of the same phenotype (unchanged / retimed exit — extended or shortened by the unit / retimed /
//    newly admitted / displaced; reconciled to the net difference) and, for C, against A (New L0 under 'cal').
//    Hypothetical (virtual) profits are never summed as achievable.
// 2. Episode dependence of the neighbourhoods (5B's audit lesson, reporting only): for the primary and the independent
//    primary (D24) and each fold primary (its training door), the selection rep-1 neighbours (128) rerun in detail under
//    the session unit: the share whose largest winning pool-level episode overlaps the centre's, the distribution of each
//    neighbour's net earned by lots entered inside the centre's leading-episode window, distinct ledgers and clipping.
import fs from 'node:fs';
import path from 'node:path';
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type EvalOptions, episodesOf } from '../vg-d1-growth-joint/evaluate.ts';
import { quantile } from '../vg-d1-growth-joint/fitness.ts';
import type { PoolResult } from '../vg-d1-growth-joint/pool.ts';
import { csv, drawdownEpisodes, fundingRows, holdingOf, lotRows, matchLots } from '../vg-d1-growth-joint/post.ts';
import { nyseSessionsHeld } from '../lib/tradingSessions.ts';
import { simulationCaps } from './budgets.ts';
import { type Unit, log, r2, repoRoot, searchUnit, units } from './context.ts';
import { type Cfg, cfgId, optionsOf } from './config.ts';
import { controlOf, optionsOfControl, settingsOf } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { recordOfRun, runUnit } from './unit.ts';
import { type Evidence, type Roles, drawsOf, famOf } from './qualify.ts';
import { isSealed, plain, readJson, sha256File, sha256Text } from './records.ts';
import { type Env, cutoffs, finalCutoff, seal, selectionFile, studyGuards } from './stages.ts';

export const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics');
export const finalOf = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');
export const foldsOf = (env: Env) => (env.schedule === 'study' ? ['C19', 'C21', 'C23'] : ['P18']);

export interface SelectionRecord {
  primary: Partial<Record<Unit, string | null>>;
  independentPrimary: Partial<Record<Unit, string | null>>;
  roles: Record<string, Roles>;
  evidence: Evidence[];
}

const slug = (label: string) => label.replace(/[^A-Za-z0-9#._-]+/g, '_').slice(0, 90);
const iso = (door: Door, s: number) => door.dates[s] ?? null;

// Every refusal by component and occupant (who held the capital).
export const refusalsByOccupant = (r: PoolResult) => {
  const out: Partial<Record<BookId, Record<string, number>>> = {};

  for (const f of r.funding) {
    if (f.outcome !== 'refused') continue;

    const m = (out[f.book] ??= {});
    const k = f.occupant ?? f.reason ?? 'unknown';

    m[k] = (m[k] ?? 0) + 1;
  }
  return out;
};

// The ledger with the hold age in NYSE sessions (independently counted from the dates) beside the calendar days.
export const ledgerOf = (door: Door, r: PoolResult) =>
  lotRows(door, r).map((row, i) => {
    const l = r.lots[i]!;
    const ds = door.sym[l.symbol].ds;
    const endS = l.open ? r.endIndex : l.fills.at(-1)!.s;

    return { ...row, nyseSessionsHeld: nyseSessionsHeld(ds.sTime[l.entryS]!, ds.sTime[endS]!) };
  });

export const exitReasons = (r: PoolResult) => {
  const out: Partial<Record<BookId, Record<string, number>>> = {};

  for (const l of r.lots) {
    const k = l.open ? 'open' : l.fills.at(-1)!.reason;
    const m = (out[l.book] ??= {});

    m[k] = (m[k] ?? 0) + 1;
  }
  return out;
};

export const sessionHolding = (door: Door, r: PoolResult) =>
  Object.fromEntries(
    bookIds.map((b) => {
      const xs = r.lots
        .filter((l) => l.book === b)
        .map((l) => {
          const ds = door.sym[l.symbol].ds;

          return nyseSessionsHeld(ds.sTime[l.entryS]!, ds.sTime[l.open ? r.endIndex : l.fills.at(-1)!.s]!);
        })
        .sort((a, c) => a - c);

      return [
        b,
        xs.length
          ? {
              lots: xs.length,
              meanSessions: r2(xs.reduce((a, c) => a + c, 0) / xs.length),
              medianSessions: xs[Math.floor((xs.length - 1) / 2)]!,
              maxSessions: xs.at(-1)!
            }
          : null
      ];
    })
  );

// Retimed exits of the same entries: extended (a later exit under X) or shortened, with the P&L change.
export const extendedShortened = (m: ReturnType<typeof matchLots>) => {
  const rows = m.rows.filter((x) => x.kind === 'retimed exit');
  const later = (a: string, b: string) => (a === 'open' ? true : b === 'open' ? false : a > b);
  const ext = rows.filter((x) => later(x.xExit, x.yExit));
  const sh = rows.filter((x) => !later(x.xExit, x.yExit));
  const sum = (rs: typeof rows) => r2(rs.reduce((a, x) => a + x.delta, 0));

  return { extended: { lots: ext.length, delta: sum(ext) }, shortened: { lots: sh.length, delta: sum(sh) }, rows };
};

export const runDiagnostics = async (env: Env) => {
  const dir = diagDir(env);
  const file = path.join(dir, 'diagnostics.json');
  const fin = finalOf(env);
  const selFile = selectionFile(env, fin);

  studyGuards(env);
  if (!finalCutoff(fin) || !isSealed(selFile)) throw new Error('the final selection is not sealed');
  if (fs.existsSync(file)) throw new Error(`${path.relative(repoRoot, file)} exists`);

  const sel = readJson<SelectionRecord>(selFile);
  const ev = (label: string) => sel.evidence.find((x) => x.label === label)!;
  const door = await openStudyDoor(cutoffs[fin]!.door, `${env.prefix}diagnostics`);
  let simulations = 0;
  const files: Record<string, string> = {};
  const writeCsv = (name: string, rows: Record<string, unknown>[]) => {
    const f = path.join(dir, 'ledgers', name);
    const text = csv(rows);

    fs.mkdirSync(path.dirname(f), { recursive: true });
    if (fs.existsSync(f)) fs.chmodSync(f, 0o644);
    fs.writeFileSync(f, text);
    fs.chmodSync(f, 0o444);
    files[path.relative(dir, f)] = sha256Text(text);
  };

  // ----- 1. mechanism -----
  type Subject = { label: string; cfg: Cfg; options: EvalOptions; role: string };
  const subjects: Subject[] = [];
  const addSubject = (label: string | null | undefined, cfg: Cfg, options: EvalOptions, role: string) => {
    if (!label) return;

    const x = subjects.find((s) => cfgId(s.cfg) === cfgId(cfg));

    if (x) x.role = `${x.role}; ${role}`;
    else subjects.push({ label, cfg, options, role });
  };
  const addEv = (label: string | null | undefined, role: string) => {
    if (!label) return;

    const e = ev(label);

    addSubject(label, e.cfg, e.control ? optionsOfControl(controlOf(e.control)) : optionsOf(e.cfg), role);
  };

  addEv(sel.primary[searchUnit], 'primary (C)');
  addEv(sel.independentPrimary[searchUnit], 'independent primary');
  addEv(sel.roles[`${searchUnit}/informed`]?.roles['actual-profit'], 'informed primary');
  for (const k of ['NL0', 'C4', 'C4R', 'D']) {
    const c = controlOf(k);

    addSubject(
      `control: ${k}`,
      c.cfg,
      optionsOfControl(c),
      k === 'NL0' ? 'New L0 (A under cal, B under ses)' : `control ${k}`
    );
  }

  const runs = new Map<string, ReturnType<typeof runUnit>>();
  const runOf = (s: Subject, unit: Unit) => {
    const k = `${cfgId(s.cfg)}|${unit}`;
    let v = runs.get(k);

    if (!v) {
      v = runUnit(door, s.cfg.quad, s.options, unit);
      simulations++;
      runs.set(k, v);
    }
    return v;
  };
  const nl0 = subjects.find((s) => cfgId(s.cfg) === cfgId(controlOf('NL0').cfg))!;
  const mechanism = subjects.flatMap((s) =>
    units.map((unit) => {
      const x = runOf(s, unit);
      const r = x.result;
      const rec = recordOfRun(door, s.cfg.quad, x, s.options, unit);
      const name = `${slug(s.label)}/${unit}`;

      writeCsv(`${name}/lots.csv`, ledgerOf(door, r) as unknown as Record<string, unknown>[]);
      writeCsv(`${name}/funding.csv`, fundingRows(door, r) as unknown as Record<string, unknown>[]);

      const vsOtherUnit = unit === 'ses' ? matchLots(r, runOf(s, 'cal').result) : null;
      const vsA = unit === 'ses' && cfgId(s.cfg) !== cfgId(nl0.cfg) ? matchLots(r, runOf(nl0, 'cal').result) : null;

      return {
        label: s.label,
        role: s.role,
        id: cfgId(s.cfg),
        unit,
        settings: settingsOf(s.cfg, unit, s.options),
        record: rec,
        refusalsByOccupant: refusalsByOccupant(r),
        exitReasons: exitReasons(r),
        holding: holdingOf(door, r),
        holdingSessions: sessionHolding(door, r),
        drawdowns: drawdownEpisodes(door, r),
        lots: r.lots.length,
        versusSamePhenotypeCalendar: vsOtherUnit
          ? { ...vsOtherUnit, extendedShortened: extendedShortened(vsOtherUnit) }
          : null,
        versusA: vsA ? { summary: vsA.summary, byBook: vsA.byBook, delta: vsA.delta, check: vsA.check } : null
      };
    })
  );

  // ----- 2. episode dependence (session unit, selection rep 1) -----
  const holders: { label: string; cutoff: string; role: string }[] = [];
  const p = sel.primary[searchUnit];
  const ip = sel.independentPrimary[searchUnit];

  if (p) holders.push({ label: p, cutoff: fin, role: 'final primary' });
  if (ip && ip !== p) holders.push({ label: ip, cutoff: fin, role: 'independent primary' });

  const foldSels = Object.fromEntries(
    foldsOf(env)
      .filter((c) => c !== fin)
      .map((c) => [c, readJson<SelectionRecord>(selectionFile(env, c))])
  );

  for (const [c, fs2] of Object.entries(foldSels))
    if (fs2.primary[searchUnit]) holders.push({ label: fs2.primary[searchUnit]!, cutoff: c, role: 'fold primary' });

  const doors = new Map<string, Door>([[cutoffs[fin]!.door, door]]);
  const episodes = [];

  for (const h of holders) {
    const cut = cutoffs[h.cutoff]!;
    let dr = doors.get(cut.door);

    if (!dr) {
      dr = await openStudyDoor(cut.door, `${env.prefix}diagnostics episodes ${h.cutoff}`);
      doors.set(cut.door, dr);
    }

    const e = (h.cutoff === fin ? sel : foldSels[h.cutoff]!).evidence.find((x) => x.label === h.label)!;
    const o = e.control ? optionsOfControl(controlOf(e.control)) : optionsOf(e.cfg);
    const centreRun = runUnit(dr, e.cfg.quad, o, searchUnit);

    simulations++;

    const lead = episodesOf(centreRun.result)
      .filter((x) => x.net > 0)
      .sort((a, b) => b.net - a.net)[0];
    const draws = drawsOf(e.cfg, o, famOf('select', ['select', 1, h.cutoff], 'joint'));
    const rows = draws.map((dw) => {
      const x = runUnit(dr!, dw.quad, dw.options, searchUnit);

      simulations++;

      const top = episodesOf(x.result)
        .filter((y) => y.net > 0)
        .sort((a, b) => b.net - a.net)[0];
      const net = x.result.lots.reduce((a, l) => a + l.net, 0);
      const inWindow = lead
        ? x.result.lots.filter((l) => l.entryS >= lead.first && l.entryS <= lead.last).reduce((a, l) => a + l.net, 0)
        : 0;

      return {
        overlap: !!(lead && top && top.first <= lead.last && top.last >= lead.first),
        net,
        inWindowShare: net > 0 && lead ? inWindow / net : null,
        clipped: dw.clipped > 0
      };
    });
    const shares = rows
      .map((r) => r.inWindowShare)
      .filter((x): x is number => x !== null)
      .sort((a, b) => a - b);

    episodes.push({
      ...h,
      id: e.id,
      centreLeadingEpisode: lead
        ? {
            first: iso(dr, lead.first),
            last: Number.isFinite(lead.last) ? iso(dr, lead.last) : 'open',
            net: r2(lead.net),
            lots: lead.lots,
            shareOfCentreNet: e.centre.net > 0 ? r2(lead.net / e.centre.net) : null
          }
        : null,
      neighbours: rows.length,
      overlapShare: rows.length ? r2(rows.filter((r) => r.overlap).length / rows.length) : null,
      inWindowShare: shares.length
        ? {
            median: r2(quantile(shares, 0.5)),
            p10: r2(quantile(shares, 0.1)),
            p90: r2(quantile(shares, 0.9)),
            n: shares.length
          }
        : null,
      neighboursWithNetAtMostZero: rows.filter((r) => r.net <= 0).length,
      clippedDraws: rows.filter((r) => r.clipped).length,
      selectionFamily: {
        distinctLedgers: e.select.distinct,
        sameAsCentre: e.select.sameAsCentre,
        clipped: e.select.clipped,
        n: e.select.n
      }
    });
  }

  const record = {
    stage: 'diagnostics',
    door: door.name,
    selection: { file: path.relative(repoRoot, selFile), sha256: sha256File(selFile) },
    mechanism,
    episodeDependence: episodes,
    files,
    simulations,
    cap: env.schedule === 'study' ? simulationCaps.diagnostics : null,
    finished: new Date().toISOString()
  };

  if (env.schedule === 'study' && simulations > simulationCaps.diagnostics)
    throw new Error(`diagnostics: ${simulations} simulations exceed the cap ${simulationCaps.diagnostics}`);
  seal(env, file, plain(record), 'diagnostics');
  log(
    `diagnostics: ${mechanism.length} subject-unit rows, ${episodes.length} episode audits, ${simulations} simulations`
  );
  return record;
};
