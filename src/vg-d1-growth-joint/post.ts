// The post-search stages (PROTOCOL.md §14, §16), written before any of them ran:
//
// - sequential: the chronological procedure test — each fold's frozen primary (arm D's independent procedure) trades
//   its evaluation slice; the slices are concatenated (switch charges as declared) and compared with the controls.
// - diagnostics (development, D24): ledgers, funded-trade chronology and capital displacement by family and symbol,
//   booked versus causal contributions, refused opportunities and idle capacity during unfunded virtual holds,
//   opportunity conflicts, same-instant ordering, the largest winning episode and its blackout rerun, ablations, matched
//   trades. Report-only.
// - freeze-selection: FROZEN_SELECTION.json (read-only) from the sealed C24 selection, before any 2025–2026 outcome of
//   a candidate exists.
// - validate: the one-time evaluation on FULL (2016-01-04 → 2026-10-30, continuous; validation = 2025-01-02 →
//   2026-10-30) under the frozen selection's guard, with the known full-history targets compared there.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import type { BookId } from './books.ts';
import { bookIds } from './books.ts';
import { appendixATarget, controlSpecs, resolveControls } from './controls.ts';
import {
  cacheRoot,
  chronology,
  economics,
  frozenSelectionFile,
  log,
  r2,
  repoRoot,
  researchDir,
  symbols
} from './context.ts';
import { type Door, indexOf, openFullDoor, openPrefixDoor, sha256File } from './data.ts';
import { type EvalOptions, type Rec, episodesOf, evaluate, recordOf, run } from './evaluate.ts';
import { nbStats } from './fitness.ts';
import { assertFrozenCode, closureDigest, freezeFile } from './freeze.ts';
import { codeDigest, withLab } from './lab.ts';
import { canonicalD1, canonicalGrowth } from './parity.ts';
import type { Lot, PoolResult } from './pool.ts';
import type { Evidence, Roles } from './qualify.ts';
import { isSealed, readJson, sealJson, sealText, usd } from './records.ts';
import {
  type Env,
  cutoffs,
  evaluationFile,
  gpairFile,
  searchFile,
  selectionFile,
  studyEnv,
  studyGuards
} from './stages.ts';
import { type Quad, describeQuad, neighbourhood, normalize, quadId } from './space.ts';

type SelectionRecord = {
  primary: string | null;
  roles: Record<string, Roles>;
  evidence: Evidence[];
};

const dateOf = (t: number) =>
  Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z' : '—';

// The strict minute drawdown of a concatenation of slices (each slice's path added to the running total).
export const sequentialDrawdown = (
  slices: readonly { t: number[]; v: number[]; charge?: number }[],
  startTime: number
) => {
  const tracker = new Tracker(0, startTime);
  let offset = 0;

  for (const s of slices) {
    offset -= s.charge ?? 0;
    for (let i = 0; i < s.t.length; i++) tracker.updateStrict(offset + s.v[i]!, s.t[i]!);
    offset += s.v.at(-1) ?? 0;
  }

  return { ...tracker.stats(), total: offset };
};

// ----- sequential policies (PROTOCOL.md §14.2) -----

export const runSequential = async (env: Env) => {
  const folds = ['C19', 'C21', 'C23'];
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  studyGuards(env);
  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  type Row = {
    label: string;
    role: string;
    id: string;
    sliceNet: number;
    sliceDd: number;
    wholeDd: number;
    openAtBoundary: string[];
    openAtEnd: string[];
  };
  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{ rows: Row[]; primary: string | null; slice: [string, string] }>(evaluationFile(env, c));
  });
  const closes = folds.map((c) =>
    readJson<{ label: string; t: number[]; v: number[] }[]>(
      path.join(cacheRoot, 'folds', env.prefix || 'study', `${c}-closes.json`)
    )
  );
  const charge = (economics.costBps / 10000) * economics.notional; // 5 bps of $100,000 per lot closed or adopted
  const policy = (name: string, pick: (i: number) => string | null) => {
    const slices: { t: number[]; v: number[]; charge: number }[] = [];
    const parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[] = [];
    let prev: { id: string; openAtEnd: number } | null = null;
    let charges = 0;

    folds.forEach((c, i) => {
      const label = pick(i);
      const row = label ? evals[i]!.rows.find((r) => r.label === label) : undefined;
      const m = label ? closes[i]!.find((x) => x.label === label) : undefined;
      let ch = 0;

      if (row && prev && prev.id !== row.id) ch = charge * (prev.openAtEnd + row.openAtBoundary.length);
      if (!row && prev) ch = charge * prev.openAtEnd;
      charges += ch;
      slices.push({ t: m?.t ?? [], v: m?.v ?? [], charge: ch });
      parts.push({ fold: c, label, sliceNet: row?.sliceNet ?? 0, sliceDd: row?.sliceDd ?? 0, charge: ch });
      prev = row ? { id: row.id, openAtEnd: row.openAtEnd.length } : null;
    });

    const dd = sequentialDrawdown(slices, 0);

    return {
      name,
      parts,
      netBeforeCharges: r2(parts.reduce((a, p) => a + p.sliceNet, 0)),
      charges: r2(charges),
      net: r2(parts.reduce((a, p) => a + p.sliceNet, 0) - charges),
      sequentialDd: r2(dd.maximum),
      ddPeak: dateOf(dd.peakTime),
      ddTrough: dateOf(dd.troughTime),
      withinCeiling: dd.maximum <= economics.ceiling
    };
  };
  const policies = [
    policy('independent joint procedure (each fold primary; flat without one)', (i) => evals[i]!.primary)
  ];

  for (const role of ['robust-profit', 'balanced', 'lower-drawdown'])
    policies.push(
      policy(`role ${role}`, (i) => evals[i]!.rows.find((r) => r.role.split(',').includes(role))?.label ?? null)
    );
  for (const l of evals[0]!.rows.filter((r) => r.role.startsWith('control')).map((r) => r.label))
    policies.push(policy(`fixed ${l} (descriptive: chosen with later data)`, () => l));

  const joint = policies[0]!;
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primary: evals[i]!.primary })),
    switchCharge: `${economics.costBps} bps on $${economics.notional} per open lot closed or adopted at a boundary`,
    policies,
    verdict: joint.parts.some((p) => p.label === null)
      ? `chronologically incomplete: ${joint.parts
          .filter((p) => p.label === null)
          .map((p) => p.fold)
          .join(', ')} had no qualified four-component candidate (flat fallback)`
      : joint.net > 0 && joint.withinCeiling
        ? 'chronologically supported (every fold produced a primary; sequential net > 0 and sequential minute drawdown ≤ $35,000)'
        : 'chronologically unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000)',
    scope:
      'the independent lane (arm D) only; the staged path (VG #2 + Growth pair) and the informed refinement inherit later-selected settings and have no chronological test'
  };

  sealJson(file, record, 'sequential');
  log(`sequential: ${record.verdict}; procedure ${usd(joint.net)}, DD ${usd(joint.sequentialDd)}`);
  return record;
};

// ----- ledgers -----

export const lotRows = (door: Door, r: PoolResult) =>
  r.lots.map((l) => {
    const endS = l.open ? r.endIndex : l.fills.at(-1)!.s;

    return {
      lot: l.id,
      component: l.book,
      family: l.family,
      symbol: l.symbol,
      kind: l.trade.kind,
      trade: l.trade.id,
      decision: dateOf(l.trade.dT),
      decisionPrice: l.trade.dPrice,
      entry: dateOf(l.entryT),
      entryRaw: l.entryRaw,
      entryAfterCost: l.entryPrice,
      principal: r2(l.principal0),
      shares: Math.round(l.shares0 * 1e6) / 1e6,
      partialExits: l.fills.filter((f) => f.partial).length,
      fills: l.fills
        .map(
          (f) =>
            `${dateOf(f.t)} ${f.partial ? 'partial' : 'final'} ${f.reason} @ ${f.raw} (${Math.round(f.shares * 1e4) / 1e4} sh, repaid ${r2(f.principal)}, net ${r2(f.net)})`
        )
        .join(' | '),
      exit: l.open ? 'open' : dateOf(l.fills.at(-1)!.t),
      exitReason: l.open ? 'open (marked at the last close)' : l.fills.at(-1)!.reason,
      sessionsHeld: endS - l.entryS,
      calendarDays: Math.round(((door.sym[l.symbol].ds.sTime[endS]! - l.entryTs) / 86400) * 10) / 10,
      interest: r2(l.interest),
      costs: r2(l.costs),
      realized: r2(l.realized),
      unrealized: r2(l.unrealized),
      net: r2(l.net),
      mae: r2(l.worst),
      maeTime: dateOf(l.worstT),
      mfe: r2(l.best),
      status: l.open ? 'open' : 'closed'
    };
  });

export const fundingRows = (door: Door, r: PoolResult) =>
  r.funding.map((f) => ({
    component: f.book,
    trade: f.trade,
    kind: f.kind,
    decision: dateOf(f.t),
    session: door.dates[f.s],
    price: f.price,
    grant: r2(f.grant),
    outcome: f.outcome,
    reason: f.reason,
    occupant: f.occupant
  }));

export const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';

  const keys = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);

    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  return `${keys.join(',')}\n${rows.map((x) => keys.map((k) => cell(x[k])).join(',')).join('\n')}\n`;
};

// Holding times per component (calendar days from the fill session to the final exit session, or to the end while
// open).
export const holdingOf = (door: Door, r: PoolResult) =>
  Object.fromEntries(
    bookIds.map((b) => {
      const days = r.lots
        .filter((l) => l.book === b)
        .map((l) => (door.sym[l.symbol].ds.sTime[l.open ? r.endIndex : l.fills.at(-1)!.s]! - l.entryTs) / 86400)
        .sort((a, c) => a - c);

      return [
        b,
        days.length
          ? {
              lots: days.length,
              meanDays: Math.round((days.reduce((a, c) => a + c, 0) / days.length) * 10) / 10,
              medianDays: Math.round(days[Math.floor((days.length - 1) / 2)]! * 10) / 10,
              maxDays: Math.round(days.at(-1)! * 10) / 10
            }
          : null
      ];
    })
  );

// ----- matched trades -----

export const matchLots = (x: PoolResult, y: PoolResult) => {
  const key = (l: Lot) => `${l.book}|${l.trade.dT}|${l.entryT}`;
  const ys = new Map(y.lots.map((l) => [key(l), l]));
  const used = new Set<Lot>();
  const rows: { kind: string; book: string; x: Lot | null; y: Lot | null; delta: number }[] = [];

  for (const l of x.lots) {
    const m = ys.get(key(l));

    if (m) {
      used.add(m);

      const sameFills = l.fills.map((f) => f.t).join() === m.fills.map((f) => f.t).join();

      rows.push({ kind: sameFills ? 'unchanged' : 'retimed exit', book: l.book, x: l, y: m, delta: l.net - m.net });
      continue;
    }

    const end = (k: Lot) => (k.open ? Infinity : k.fills.at(-1)!.t);
    const overlap = y.lots.find(
      (m2) => !used.has(m2) && m2.book === l.book && m2.entryT < end(l) && l.entryT < end(m2)
    );

    if (overlap) {
      used.add(overlap);
      rows.push({ kind: 'retimed', book: l.book, x: l, y: overlap, delta: l.net - overlap.net });
    } else rows.push({ kind: 'newly admitted', book: l.book, x: l, y: null, delta: l.net });
  }

  for (const m of y.lots)
    if (!used.has(m)) rows.push({ kind: 'displaced', book: m.book, x: null, y: m, delta: -m.net });

  const by = (k: string) => rows.filter((r) => r.kind === k);
  const sum = (rs: typeof rows) => r2(rs.reduce((a, r) => a + r.delta, 0));

  return {
    summary: Object.fromEntries(
      ['unchanged', 'retimed exit', 'retimed', 'newly admitted', 'displaced'].map((k) => [
        k,
        { lots: by(k).length, delta: sum(by(k)) }
      ])
    ),
    byBook: Object.fromEntries(
      bookIds.map((b) => [
        b,
        Object.fromEntries(
          ['retimed', 'newly admitted', 'displaced'].map((k) => {
            const rs = rows.filter(
              (r) => r.book === b && (r.kind === k || (k === 'retimed' && r.kind === 'retimed exit'))
            );

            return [k, { lots: rs.length, delta: sum(rs) }];
          })
        )
      ])
    ),
    delta: r2(x.net - y.net),
    check: r2(sum(rows) - (x.net - y.net)),
    rows: rows.map((r) => ({
      kind: r.kind,
      component: r.book,
      xEntry: r.x ? dateOf(r.x.entryT) : '',
      xExit: r.x ? (r.x.open ? 'open' : dateOf(r.x.fills.at(-1)!.t)) : '',
      xNet: r.x ? r2(r.x.net) : null,
      yEntry: r.y ? dateOf(r.y.entryT) : '',
      yExit: r.y ? (r.y.open ? 'open' : dateOf(r.y.fills.at(-1)!.t)) : '',
      yNet: r.y ? r2(r.y.net) : null,
      delta: r2(r.delta)
    }))
  };
};

// ----- development diagnostics (PROTOCOL.md §16) -----

export const drawdownEpisodes = (door: Door, r: PoolResult) => {
  // daily-close drawdown episodes (peak → trough → recovery), the five deepest
  const out: { peak: string; trough: string; recovery: string | null; depth: number; sessions: number }[] = [];
  let peak = -Infinity;
  let peakS = 0;
  let trough = Infinity;
  let troughS = 0;
  let inDd = false;

  for (let s = 0; s <= r.endIndex; s++) {
    const v = r.daily[s]!;

    if (Number.isNaN(v)) continue;
    if (v > peak) {
      if (inDd)
        out.push({
          peak: door.dates[peakS]!,
          trough: door.dates[troughS]!,
          recovery: door.dates[s]!,
          depth: r2(peak - trough),
          sessions: s - peakS
        });
      inDd = false;
      peak = v;
      peakS = s;
      trough = v;
      troughS = s;
    } else if (v < trough) {
      trough = v;
      troughS = s;
      inDd = peak - v > 0;
    }
  }

  if (inDd)
    out.push({
      peak: door.dates[peakS]!,
      trough: door.dates[troughS]!,
      recovery: null,
      depth: r2(peak - trough),
      sessions: r.endIndex - peakS
    });

  return out.sort((a, b) => b.depth - a.depth).slice(0, 5);
};

// Refused opportunities, the occupant that displaced them and the idle capacity during their unfunded virtual hold:
// the sessions in which the refused virtual trade was still open while the pool held nothing (descriptive: an unfunded
// trade's standalone profit is not profit the pool could freely add).
export const refusalsOf = (door: Door, x: ReturnType<typeof run>) => {
  const r = x.result;
  const book = (b: BookId) => x.books.find((v) => v.book === b);
  const rows = r.funding
    .filter((f) => f.outcome === 'refused' && f.reason === 'slot occupied')
    .map((f) => {
      const v = book(f.book)?.trades.find((t) => t.id === f.trade);
      const vEnd = v ? (v.open || v.eS < 0 ? r.endIndex : v.fills.at(-1)!.s) : f.s;
      let idle = 0;

      for (let s = f.s; s <= vEnd; s++) if (r.heldAtClose[s] === -1) idle++;

      return {
        component: f.book,
        decision: dateOf(f.t),
        occupant: f.occupantBook,
        occupantLabel: f.occupant,
        virtualEntry: v && v.eS >= 0 ? dateOf(v.eT) : 'never filled',
        virtualExit: v ? (v.open ? 'open' : v.eS < 0 ? '—' : dateOf(v.fills.at(-1)!.t)) : '—',
        virtualNet: v ? r2(v.vNet) : null,
        idleSessionsDuringVirtualHold: idle
      };
    });
  const conflicts: Record<string, { refusals: number; virtualNet: number; idleSessions: number }> = {};

  for (const x2 of rows) {
    const k = `${x2.component} refused while ${x2.occupant ?? '?'} held the slot`;

    conflicts[k] ??= { refusals: 0, virtualNet: 0, idleSessions: 0 };
    conflicts[k].refusals++;
    conflicts[k].virtualNet = r2(conflicts[k].virtualNet + (x2.virtualNet ?? 0));
    conflicts[k].idleSessions += x2.idleSessionsDuringVirtualHold;
  }

  return { rows, conflicts };
};

// Same-instant decision groups of the funding log and whether the tie order decided a funding.
export const sameInstantOf = (r: PoolResult) => {
  const byT = new Map<number, typeof r.funding>();

  for (const f of r.funding) byT.set(f.t, [...(byT.get(f.t) ?? []), f]);

  const groups = [...byT.values()].filter((g) => g.length > 1);

  return {
    groups: groups.length,
    decisive: groups.filter(
      (g) => g.some((f) => f.outcome === 'granted') && g.some((f) => f.reason === 'slot occupied')
    ).length,
    examples: groups
      .slice(0, 10)
      .map((g) => g.map((f) => `${f.book}:${f.outcome}${f.reason ? ` (${f.reason})` : ''} @ ${dateOf(f.t)}`))
  };
};

const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics', 'D24');
const finalOf = (env: Env) => (env.schedule === 'study' ? 'C24' : 'P18');

export interface Subject {
  label: string;
  quad: Quad;
  options: EvalOptions;
  role: string;
}

// The frozen subjects: every role holder of every set at C24 (deduplicated), the Growth-pair shortlist (Growth only),
// and every control.
export const subjectsOf = (
  sel: SelectionRecord,
  gsel: { shortlist: { label: string; quad: Quad; roles: string[] }[] },
  cs: ReturnType<typeof controlSpecs>
) => {
  const out: Subject[] = [];
  const add = (label: string, quad: Quad, options: EvalOptions, role: string) => {
    const x = out.find((o) => o.label === label);

    if (x) x.role = [...new Set([...x.role.split(', '), role])].join(', ');
    else out.push({ label, quad, options, role });
  };

  for (const [set, roles] of Object.entries(sel.roles))
    for (const [role, label] of Object.entries(roles.roles)) {
      if (!label) continue;

      const e = sel.evidence.find((x) => x.label === label)!;

      add(
        label,
        e.quad,
        { enabled: Object.fromEntries(bookIds.map((b) => [b, e.enabled.includes(b)])) },
        `${set}:${role}`
      );
    }
  for (const g of gsel.shortlist)
    add(g.label, g.quad, { enabled: { 'D1:GDX': false, 'D1:VGT': false } }, `growth-pair:${g.roles.join('+')}`);
  for (const c of cs) add(`control: ${c.label}`, c.quad, { enabled: c.enabled }, `control (${c.group})`);

  return out;
};

export const runDiagnostics = async (env: Env = studyEnv(14)) => {
  const dir = diagDir(env);
  const selFile = selectionFile(env, finalOf(env));

  if (!isSealed(selFile)) throw new Error('the C24 selection is not sealed');
  studyGuards(env);
  if (fs.existsSync(path.join(dir, 'diagnostics.json'))) throw new Error('the diagnostics are sealed');

  const sel = readJson<SelectionRecord>(selFile);
  const gsel = readJson<{ shortlist: { label: string; quad: Quad; roles: string[] }[] }>(gpairFile(env, finalOf(env)));
  const controls = await resolveControls();
  const door = await openPrefixDoor(
    env.schedule === 'study' ? 'D24' : 'D19',
    `${env.prefix}development diagnostics (report-only)`
  );
  const subjects = subjectsOf(sel, gsel, controlSpecs(controls));
  const ledgerDir = path.join(dir, 'ledgers');

  fs.mkdirSync(ledgerDir, { recursive: true });

  const details = new Map<string, { x: ReturnType<typeof run>; rec: Rec }>();

  for (const s of subjects) {
    const x = run(door, s.quad, s.options, true, false);

    details.set(s.label, { x, rec: recordOf(door, s.quad, x, s.options) });
  }

  subjects.forEach((s, i) => {
    const d = details.get(s.label)!;
    const tag = String(i + 1).padStart(2, '0');

    fs.writeFileSync(path.join(ledgerDir, `${tag}-lots.csv`), csv(lotRows(door, d.x.result)));
    fs.writeFileSync(path.join(ledgerDir, `${tag}-funding.csv`), csv(fundingRows(door, d.x.result)));
    fs.writeFileSync(
      path.join(ledgerDir, `${tag}-daily.csv`),
      csv(
        door.dates.map((date, k) => ({
          date,
          marked: r2(d.x.result.daily[k]!),
          principal: r2(d.x.result.principalAtClose[k]!),
          marketValue: r2(d.x.result.valueAtClose[k]!),
          held:
            d.x.result.heldAtClose[k] === -1 ? '' : ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'][d.x.result.heldAtClose[k]!]
        }))
      )
    );
  });
  fs.writeFileSync(
    path.join(ledgerDir, 'INDEX.md'),
    `# Ledger index (development, D24)\n\n${subjects.map((s, i) => `- ${String(i + 1).padStart(2, '0')}: ${s.label} (${s.role}) — ${describeQuad(s.quad)}; enabled ${bookIds.filter((b) => s.options.enabled?.[b] !== false).join(', ')}`).join('\n')}\n`
  );

  const out: Record<string, unknown> = { stage: 'diagnostics', door: door.name, selectionSha256: sha256File(selFile) };

  out.subjects = subjects.map((s) => {
    const d = details.get(s.label)!;
    const r = d.x.result;
    const eps = episodesOf(r).map((e) => ({
      first: door.dates[e.first],
      last: Number.isFinite(e.last) ? door.dates[e.last] : 'open',
      net: r2(e.net),
      lots: e.lots
    }));

    return {
      label: s.label,
      role: s.role,
      id: quadId(s.quad),
      describe: describeQuad(s.quad),
      record: d.rec,
      ddPeak: dateOf(r.dd.peakT),
      ddTrough: dateOf(r.dd.troughT),
      ddRecovery: dateOf(r.dd.recoveryT),
      drawdownEpisodes: drawdownEpisodes(door, r),
      episodes: eps.sort((a, b) => b.net - a.net).slice(0, 5),
      gapExits: r.lots.flatMap((l) =>
        l.fills
          .filter((f) => f.reason === 'trailing stop gap')
          .map((f) => ({ lot: l.id, component: l.book, date: dateOf(f.t), net: r2(f.net) }))
      ),
      holding: holdingOf(door, r),
      refusals: refusalsOf(door, d.x),
      sameInstant: sameInstantOf(r),
      chronology: r.lots.map((l) => `${dateOf(l.entryT).slice(0, 10)} ${l.book} ${r2(l.net)}`),
      exposure: {
        sessionsHeld: r.sessionsHeld,
        sessions: door.sessions,
        bySessionsHeldAtClose: Object.fromEntries(
          ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'].map((b, i) => [
            b,
            Array.from(r.heldAtClose).filter((h) => h === i).length
          ])
        ),
        peakPrincipal: r2(r.peakPrincipal),
        peakMarketValue: r2(r.peakValue),
        meanPrincipal: r2(Array.from(r.principalAtClose).reduce((a, b) => a + b, 0) / door.sessions)
      }
    };
  });

  // ablations of the primary and of the independent primary (report-only causal reruns on development)
  const ablate = (label: string | null) => {
    if (!label) return null;

    const s = subjects.find((x) => x.label === label)!;
    const p = s.quad;
    const base = details.get(label)!.rec;
    const top = episodesOf(details.get(label)!.x.result)
      .filter((e) => e.net > 0)
      .sort((a, b) => b.net - a.net)[0];
    const variants: [string, Quad, EvalOptions][] = [
      ['as frozen', p, s.options],
      ['priority flipped', normalize({ ...p, first: p.first === 'D1' ? 'G' : 'D1' }), s.options],
      [
        'symbol order reversed (VGT before GDX)',
        p,
        {
          ...s.options,
          tieOrder: p.first === 'D1' ? ['D1:VGT', 'D1:GDX', 'G:VGT', 'G:GDX'] : ['G:VGT', 'G:GDX', 'D1:VGT', 'D1:GDX']
        }
      ],
      ['whole shares', p, { ...s.options, wholeShares: true }],
      [
        'funding start 2017-06-15 (prespecified sensitivity)',
        p,
        { ...s.options, fundFrom: chronology.sensitivityFunding }
      ],
      ['D1 native arming 2017-06-15', p, { ...s.options, d1Arm: 'native' }],
      ['cost 10 bps', p, { ...s.options, friction: { costBps: 10 } }],
      ['cost 20 bps', p, { ...s.options, friction: { costBps: 20 } }],
      ['interest 14%', p, { ...s.options, friction: { rate: 0.14 } }],
      ['stop slippage +25 bps', p, { ...s.options, friction: { stopSlippageBps: 25 } }],
      ['next-open stops (D1; Growth where supported)', p, { ...s.options, friction: { stopFill: 'next-open' } }]
    ];

    if (top)
      variants.push([
        `no new funding in the largest winning episode (${door.dates[top.first]} → ${Number.isFinite(top.last) ? door.dates[top.last] : 'end'})`,
        p,
        {
          ...s.options,
          blackouts: [
            {
              first: door.dates[top.first]!,
              last: Number.isFinite(top.last) ? door.dates[top.last]! : door.dates.at(-1)!
            }
          ]
        }
      ]);

    return {
      label,
      topEpisode: top
        ? {
            first: door.dates[top.first],
            last: Number.isFinite(top.last) ? door.dates[top.last] : 'open',
            net: r2(top.net),
            lots: top.lots,
            arithmeticRemoval: r2(base.net - top.net)
          }
        : null,
      variants: variants.map(([name, q, o]) => {
        const r = evaluate(door, q, o);

        return {
          name,
          id: quadId(q),
          net: r.net,
          dd: r.dd,
          lots: r.lots,
          lotsBy: Object.fromEntries(bookIds.map((b) => [b, r.books[b].lots])),
          signature: r.signature,
          sameLedger: r.signature === base.signature,
          delta: r2(r.net - base.net)
        };
      })
    };
  };

  out.ablations = {
    primary: ablate(sel.primary),
    independentPrimary:
      sel.roles.independent?.roles['actual-profit'] !== sel.primary
        ? ablate(sel.roles.independent?.roles['actual-profit'] ?? null)
        : null
  };

  // matched trades: the primary against every other subject
  if (sel.primary) {
    const px = details.get(sel.primary)!.x.result;

    out.matched = subjects
      .filter((s) => s.label !== sel.primary)
      .map((s) => ({ x: sel.primary, y: s.label, ...matchLots(px, details.get(s.label)!.x.result) }));
  }

  sealJson(path.join(dir, 'diagnostics.json'), out, `${env.prefix}diagnostics`);
  log(`diagnostics: ${subjects.length} subjects`);
};

// ----- the frozen selection (PROTOCOL.md §16.1) -----

export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');

export const freezeSelection = async (env: Env = studyEnv(1)) => {
  const frozenFile = frozenFileOf(env);
  const fin = finalOf(env);

  if (fs.existsSync(frozenFile)) throw new Error(`${path.relative(repoRoot, frozenFile)} exists`);
  studyGuards(env);

  const selFile = selectionFile(env, fin);
  const seqFile = path.join(env.outDir, 'folds', 'sequential.json');
  const diagFile = path.join(env.outDir, 'diagnostics', 'D24', 'diagnostics.json');
  const required = [selFile, gpairFile(env, fin), diagFile, ...(env.schedule === 'study' ? [seqFile] : [])];

  for (const f of required) if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const digest = env.schedule === 'study' ? assertFrozenCode() : codeDigest();
  const sel = readJson<SelectionRecord>(selFile);
  const gsel = readJson<{ shortlist: { label: string; quad: Quad; roles: string[] }[]; roles: Roles }>(
    gpairFile(env, fin)
  );
  const seq = fs.existsSync(seqFile)
    ? readJson<{ verdict: string; policies: { name: string; net: number; sequentialDd: number }[] }>(seqFile)
    : { verdict: '(pilot: no sequential record)', policies: [] };
  const controls = await resolveControls();
  const subjects = subjectsOf(sel, gsel, controlSpecs(controls));
  const evidenceOf = (label: string) => sel.evidence.find((e) => e.label === label);
  const body = {
    study: 'vg-d1-growth-joint',
    kind: 'FROZEN SELECTION — read-only; written before any 2025–2026 outcome of a candidate was computed',
    frozenAt: new Date().toISOString(),
    pins: {
      evaluationDigest: digest ?? codeDigest(),
      closureDigest: closureDigest(),
      protocolFreezeSha256: fs.existsSync(freezeFile) ? sha256File(freezeFile) : '(not frozen: pilot)',
      protocolSha256: sha256File(path.join(researchDir, 'PROTOCOL.md')),
      amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md')),
      controlManifestSha256: sha256File(path.join(researchDir, 'CONTROL_MANIFEST.json')),
      selectionSha256: sha256File(selFile),
      gpairSelectionSha256: sha256File(gpairFile(env, fin)),
      sequentialSha256: fs.existsSync(seqFile) ? sha256File(seqFile) : null,
      diagnosticsSha256: sha256File(diagFile),
      gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim()
    },
    primary: sel.primary,
    primaryRule:
      'the actual-profit role of the informed selectable set (unchanged combined controls, staged, refined, independent; qualified four-component members): the highest development centre net; ties by the higher selection robust net, the lower centre drawdown, the label',
    roles: Object.fromEntries(Object.entries(sel.roles).map(([k, v]) => [k, v.roles])),
    rankOrders: Object.fromEntries(Object.entries(sel.roles).map(([k, v]) => [k, v.ranked])),
    pareto: Object.fromEntries(Object.entries(sel.roles).map(([k, v]) => [k, v.pareto])),
    growthPair: {
      roles: gsel.roles.roles,
      shortlist: gsel.shortlist.map((g) => ({ label: g.label, roles: g.roles, id: quadId(g.quad), quad: g.quad }))
    },
    chronology: seq.verdict,
    members: subjects.map((s) => {
      const e = evidenceOf(s.label);

      return {
        label: s.label,
        role: s.role,
        id: quadId(s.quad),
        quad: s.quad,
        enabled: bookIds.filter((b) => s.options.enabled?.[b] !== false),
        describe: describeQuad(s.quad),
        development: e
          ? {
              net: e.centre.net,
              dd: e.centre.dd,
              qualified: e.qualified,
              failed: e.failed,
              selectRobust: e.select.robust,
              selectP90: e.select.p90Dd,
              confirmMedian: e.confirm.median,
              confirmP10: e.confirm.p10,
              confirmP90Dd: e.confirm.p90Dd,
              breachShare: e.confirm.breachShare
            }
          : null
      };
    }),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30, both symbols; one continuous run, nothing reset at 2024-12-31)',
      boundary: '2024-12-31',
      tests: {
        V1: 'validation P&L (marked change from the 2024-12-31 close) > 0',
        V2: 'validation minute drawdown (reset at the boundary) ≤ $35,000',
        V3: 'whole-run minute drawdown 2016-01-04 → 2026-10-30 ≤ $35,000',
        V4: "the primary's validation P&L vs every other member and control (reported, not a gate)",
        V5: 'confirmation family 1 (128 draws) on FULL for the primary and the role holders of the final and independent sets: median validation P&L > 0 (report-only)'
      },
      knownTargets:
        "compared here, never used to steer: Appendix A's standalone GDX full-history figures; VG #2's native full history (Study 8 runner, Priority 2's external context $334,911.93 / $21,303.61); Priority 2's sealed VGT-only full-history rows",
      stresses: 'costs 10 and 20 bps, 14% interest (report-only)',
      noFeedback:
        'no validation outcome changes a range, ranking, role, candidate or stopping decision; a better validation score does not swap the primary'
    }
  };
  const text = `${JSON.stringify(body, null, 1)}\n`;

  sealText(frozenFile, text, `${env.prefix}frozen selection`);
  log(
    `${path.relative(repoRoot, frozenFile)} written (${sha256File(frozenFile).slice(0, 12)}…); commit it before validate`
  );
};

// ----- the one-time validation (PROTOCOL.md §16.2) -----

export const runValidation = async (workers: number, env: Env = studyEnv(workers)) => {
  const study = env.schedule === 'study';
  const frozenFile = frozenFileOf(env);
  const vdir = path.join(env.outDir, 'validation');
  const file = path.join(vdir, 'validation.json');
  // the study: FULL with the 2024-12-31 boundary; a pilot: development only (D24, boundary 2023-12-29)
  const doorName = study ? 'FULL' : 'D24';
  const boundary = study ? chronology.developmentEnd : '2023-12-29';

  if (fs.existsSync(file)) throw new Error('the validation is sealed: it runs once');
  if (!isSealed(frozenFile)) throw new Error(`${path.relative(repoRoot, frozenFile)} is not sealed`);
  studyGuards(env);
  if (study) {
    const status = execSync(`git status --porcelain -- ${path.relative(repoRoot, frozenFile)}`, { cwd: repoRoot })
      .toString()
      .trim();
    const tracked = execSync(`git ls-files -- ${path.relative(repoRoot, frozenFile)}`, { cwd: repoRoot })
      .toString()
      .trim();

    if (!tracked || status)
      throw new Error('FROZEN_SELECTION.json must be committed and unchanged before the validation');
  }

  const guard = { file: frozenFile, sha256: sha256File(frozenFile) };
  const frozen = readJson<{
    members: { label: string; role: string; quad: Quad; enabled: BookId[] }[];
    roles: Record<string, Record<string, string | null>>;
    primary: string | null;
  }>(frozenFile);
  const subjects: Subject[] = frozen.members.map((m) => ({
    label: m.label,
    quad: m.quad,
    options: { enabled: Object.fromEntries(bookIds.map((b) => [b, m.enabled.includes(b)])) },
    role: m.role
  }));

  fs.mkdirSync(vdir, { recursive: true });

  const door = study
    ? await openFullDoor('the one-time validation (frozen selection guard)', guard)
    : await openPrefixDoor('D24', `${env.prefix}validation path test (development only)`);
  const ledgerDir = path.join(vdir, 'ledgers');

  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.writeFileSync(
    path.join(ledgerDir, 'INDEX.md'),
    `# Validation ledger index (${doorName})\n\n${subjects.map((s, i) => `- ${String(i + 1).padStart(2, '0')}: ${s.label} (${s.role}) — ${describeQuad(s.quad)}`).join('\n')}\n`
  );

  const b = indexOf(door, boundary);
  const rows = subjects.map((s, i) => {
    const o: EvalOptions = { ...s.options, boundaries: [boundary] };
    const x = run(door, s.quad, o, true, false);
    const rec = recordOf(door, s.quad, x, o);
    const crossing = x.result.lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b));
    const tag = String(i + 1).padStart(2, '0');

    fs.writeFileSync(path.join(ledgerDir, `${tag}-lots.csv`), csv(lotRows(door, x.result)));
    fs.writeFileSync(path.join(ledgerDir, `${tag}-funding.csv`), csv(fundingRows(door, x.result)));
    fs.writeFileSync(
      path.join(ledgerDir, `${tag}-daily.csv`),
      csv(
        door.dates.map((date, k) => ({
          date,
          marked: r2(x.result.daily[k]!),
          principal: r2(x.result.principalAtClose[k]!),
          marketValue: r2(x.result.valueAtClose[k]!)
        }))
      )
    );

    const lotsAfter = x.result.lots.filter((l) => l.entryS > b);
    const realizedAt = (s: number) =>
      x.result.lots.reduce((a, l) => a + l.fills.filter((f) => f.s <= s).reduce((c, f) => c + f.net, 0), 0);

    return {
      label: s.label,
      role: s.role,
      id: quadId(s.quad),
      validationNet: rec.periods[0]!.after,
      validationRealized: r2(realizedAt(door.sessions - 1) - realizedAt(b)),
      validationDd: rec.periods[0]!.dd,
      boundaryEquity: rec.periods[0]!.equity,
      wholeNet: rec.net,
      wholeDd: rec.dd,
      wholeDdPeak: dateOf(rec.ddPeakT),
      wholeDdTrough: dateOf(rec.ddTroughT),
      ddRecovery: dateOf(rec.ddRecoveryT),
      years: rec.years,
      lotsAfter: lotsAfter.length,
      lotsAfterBy: Object.fromEntries(bookIds.map((bk) => [bk, lotsAfter.filter((l) => l.book === bk).length])),
      holding: holdingOf(door, x.result),
      refusalsAfterBoundary: refusalsOf(door, x).rows.filter((f) => f.decision > `${boundary} 23:59Z`).length,
      crossing: crossing.map((l) => ({
        component: l.book,
        entry: dateOf(l.entryT),
        exit: l.open ? 'open' : dateOf(l.fills.at(-1)!.t),
        net: r2(l.net)
      })),
      record: rec
    };
  });
  const primary = rows.find((r) => r.label === frozen.primary) ?? null;
  const gates = (r: (typeof rows)[number]) => ({
    V1: r.validationNet > 0,
    V2: r.validationDd <= economics.ceiling,
    V3: r.wholeDd <= economics.ceiling
  });
  const tests = {
    primary: primary
      ? {
          ...gates(primary),
          V4: Object.fromEntries(
            rows.filter((r) => r !== primary).map((r) => [r.label, r2(primary.validationNet - r.validationNet)])
          )
        }
      : null,
    members: Object.fromEntries(rows.map((r) => [r.label, gates(r)]))
  };

  // the known full-history targets, compared here only (never used to steer)
  const controls = await resolveControls();
  const targets: Record<string, unknown> = {};

  if (study) {
    const a = canonicalGrowth(door, 'GDX', controls.g.appA);
    const m = a.metrics;

    targets.appendixA = {
      target: appendixATarget,
      got: {
        net: r2(m.pnl.totalMarkedNetUsd),
        minuteDd: r2(m.drawdown.minute.maximumUsd),
        closedTrades: m.trades.wins + m.trades.losses,
        wins: m.trades.wins,
        losses: m.trades.losses,
        open: m.trades.open
      }
    };
    (targets.appendixA as Record<string, unknown>).reproduced =
      Math.abs(r2(m.pnl.totalMarkedNetUsd) - appendixATarget.net) < 0.005 &&
      Math.abs(r2(m.drawdown.minute.maximumUsd) - appendixATarget.minuteDd) < 0.005 &&
      m.trades.wins === appendixATarget.wins &&
      m.trades.losses === appendixATarget.losses &&
      m.trades.open === appendixATarget.open;

    const vg = canonicalD1(door, controls.d1.vg2, indexOf(door, '2017-06-15'));

    targets.vg2Native = {
      context: 'Priority 2 REPORT §4 external context: $334,911.93 through 2026-10-30, DD $21,303.61',
      got: { net: r2(vg.lots.reduce((s, l) => s + l.net, 0)), dd: r2(vg.minuteDrawdown.maximum), lots: vg.lots.length },
      reproduced:
        Math.abs(r2(vg.lots.reduce((s, l) => s + l.net, 0)) - 334911.93) < 0.005 &&
        Math.abs(r2(vg.minuteDrawdown.maximum) - 21303.61) < 0.005
    };

    for (const [key, want] of [
      ['control: VGT only: D1 primary + Growth #4 · A (Priority 2)', { net: 271525.33, dd: 19534.41 }],
      ['control: VGT only: D1 primary + Growth 08500a60 · A (Priority 2)', { net: 252359.65, dd: 19556.63 }]
    ] as const) {
      const r = rows.find((x) => x.label === key);

      targets[key] = {
        want,
        got: r ? { net: r.wholeNet, dd: r.wholeDd } : null,
        reproduced: r ? r.wholeNet === want.net && r.wholeDd === want.dd : false
      };
    }
  }

  // report-only perturbations and stresses on the validation door (through workers under the guard)
  const nbSubjects = [
    ...new Set(
      [...Object.values(frozen.roles.final ?? {}), ...Object.values(frozen.roles.independent ?? {})].filter(
        (x): x is string => Boolean(x)
      )
    )
  ];
  const perturbations = await withLab(
    {
      job: `${env.prefix}validate-perturbations`,
      door: doorName,
      purpose: `${env.prefix}validation perturbations (report-only)`,
      workers,
      ...(study ? { guard } : {})
    },
    async (lab) => {
      const out: Record<string, unknown> = {};

      for (const label of nbSubjects) {
        const s = subjects.find((x) => x.label === label)!;
        const nb = neighbourhood(s.quad, { name: 'confirm', n: 128, labels: ['confirm', 1, 'C24'] });
        const opts: EvalOptions = { ...s.options, boundaries: [boundary] };
        const recs = await lab.evalMany([
          { quad: s.quad, options: opts },
          ...nb.map((p) => ({ quad: p.quad, options: opts }))
        ]);
        const after = recs
          .slice(1)
          .map((r) => r.periods[0]!.after)
          .sort((a, c) => a - c);
        const stress = await lab.evalMany([
          { quad: s.quad, options: { ...opts, friction: { costBps: 10 } } },
          { quad: s.quad, options: { ...opts, friction: { costBps: 20 } } },
          { quad: s.quad, options: { ...opts, friction: { rate: 0.14 } } }
        ]);

        out[label] = {
          neighbours: after.length,
          validationMedian: r2(after[Math.floor((after.length - 1) / 2)] ?? NaN),
          validationP10: r2(after[Math.floor(0.1 * (after.length - 1))] ?? NaN),
          positiveShare: Math.round((after.filter((x) => x > 0).length / Math.max(1, after.length)) * 1e4) / 1e4,
          validationDdBreaches: recs.slice(1).filter((r) => r.periods[0]!.dd > economics.ceiling).length,
          wholeRunNb: nbStats(recs[0]!, recs.slice(1)),
          stress: {
            'cost 10 bps': pickV(stress[0]!),
            'cost 20 bps': pickV(stress[1]!),
            'interest 14%': pickV(stress[2]!)
          }
        };
      }

      return out;
    }
  );
  const record = {
    stage: 'validation',
    guardSha256: guard.sha256,
    door: doorName,
    boundary,
    end: door.dates.at(-1),
    label:
      '2025–2026 validation on previously examined history (not an untouched holdout); November–December 2026 not evaluated',
    primary: frozen.primary,
    tests,
    V5: primary
      ? ((perturbations as Record<string, { validationMedian: number }>)[primary.label]?.validationMedian ?? null)
      : null,
    targets,
    rows,
    perturbations,
    finished: new Date().toISOString()
  };

  sealJson(file, record, `${env.prefix}validation`);
  log(`validation sealed: primary ${frozen.primary ?? 'none'} ${primary ? usd(primary.validationNet) : ''}`);
};

const pickV = (r: Rec) => ({
  validationNet: r.periods[0]!.after,
  validationDd: r.periods[0]!.dd,
  wholeNet: r.net,
  wholeDd: r.dd
});

export { cutoffs, searchFile, symbols };
