// The post-search stages (PROTOCOL.md §8.3, §12–§13), written before any of them ran:
//
// - sequential: the chronological procedure test — each fold's frozen primary trades its evaluation slice; the
//   slices are concatenated (switch charges as declared) and compared with the fixed controls on the same slices.
// - diagnostics (development, D24): ledgers, family contribution (booked and causal), ablations and sensitivities,
//   matched trades, concentration and stresses for the frozen set and the controls. Report-only.
// - freeze-selection: FROZEN_SELECTION.json (read-only) from the sealed C24 selection, before any 2025–2026 outcome of a
//   joint candidate exists.
// - validate: the one-time evaluation on FULL (2016-01-04 → 2026-10-30, continuous; validation = 2025-01-02 →
//   2026-10-30) under the frozen selection's guard.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Lot, PoolResult } from './allocator.ts';
import { controlSpecs, resolveControls } from './controls.ts';
import {
  cacheRoot,
  chronology,
  economics,
  frozenSelectionFile,
  log,
  r2,
  repoRoot,
  researchDir,
  resultsDir
} from './context.ts';
import { type Door, indexOf, openFullDoor, openPrefixDoor, sha256File } from './data.ts';
import { type EvalOptions, type Rec, episodesOf, evaluate, recordOf, run } from './evaluate.ts';
import { nbStats } from './fitness.ts';
import { assertFrozenCode, closureDigest, freezeFile } from './freeze.ts';
import { codeDigest, withLab } from './lab.ts';
import type { Evidence } from './qualify.ts';
import { isSealed, readJson, sealJson, sealText, usd } from './records.ts';
import {
  type Env,
  cutoffs,
  evaluationFile,
  searchFile,
  selectionFile,
  sequentialDrawdown,
  studyEnv
} from './stages.ts';
import { type Joint, describeJoint, jointId, neighbourhood, normalize } from './space.ts';

type SelectionRecord = {
  selection: {
    primary: string | null;
    frozen: string[];
    roles: Record<string, string | null>;
    ranked: { rank: number; label: string }[];
    reason: string;
  };
  singleFamily: { d1only: { primary: string | null }; gonly: { primary: string | null } };
  evidence: Evidence[];
};

const dateOf = (t: number) =>
  Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') + 'Z' : '—';

// ----- sequential policies (PROTOCOL.md §8.3) -----

export const runSequential = async (env: Env) => {
  const folds = ['C19', 'C21', 'C23'];
  const file = path.join(env.outDir, 'folds', 'sequential.json');

  if (fs.existsSync(file)) throw new Error('the sequential record exists');

  const evals = folds.map((c) => {
    if (!isSealed(evaluationFile(env, c))) throw new Error(`the fold evaluation of ${c} is not sealed`);
    return readJson<{
      rows: {
        label: string;
        role: string;
        id: string;
        sliceNet: number;
        sliceDd: number;
        wholeDd: number;
        openAtBoundary: number;
        openAtEnd: number;
      }[];
      primary: string | null;
      slice: [string, string];
    }>(evaluationFile(env, c));
  });
  const closes = folds.map((c) =>
    readJson<{ label: string; t: number[]; v: number[] }[]>(
      path.join(cacheRoot, 'folds', env.prefix || 'study', `${c}-closes.json`)
    )
  );
  const charge = (economics.costBps / 10000) * economics.notional;
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

      if (row && prev && prev.id !== row.id) ch = charge * (prev.openAtEnd + row.openAtBoundary);
      if (!row && prev) ch = charge * prev.openAtEnd;
      charges += ch;
      slices.push({ t: m?.t ?? [], v: m?.v ?? [], charge: ch });
      parts.push({ fold: c, label, sliceNet: row?.sliceNet ?? 0, sliceDd: row?.sliceDd ?? 0, charge: ch });
      prev = row ? { id: row.id, openAtEnd: row.openAtEnd } : null;
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
  const policies = [policy('joint procedure (each fold primary; flat without one)', (i) => evals[i]!.primary)];
  const controlLabels = evals[0]!.rows.filter((r) => r.role === 'control').map((r) => r.label);

  for (const l of controlLabels) policies.push(policy(`fixed ${l}`, () => l));
  for (const role of ['high-profit', 'balanced', 'lower-drawdown', 'other-architecture']) {
    policies.push(
      policy(`role ${role}`, (i) => evals[i]!.rows.find((r) => r.role.split(',').includes(role))?.label ?? null)
    );
  }

  const joint = policies[0]!;
  const record = {
    stage: 'sequential',
    folds: folds.map((c, i) => ({ fold: c, slice: evals[i]!.slice, primary: evals[i]!.primary })),
    policies,
    verdict: joint.parts.some((p) => p.label === null)
      ? `chronologically incomplete: ${joint.parts
          .filter((p) => p.label === null)
          .map((p) => p.fold)
          .join(', ')} had no qualified mixed candidate (flat fallback)`
      : joint.net > 0 && joint.withinCeiling
        ? 'chronologically supported (net > 0 and sequential minute drawdown ≤ $35,000)'
        : 'chronologically unsupported (net ≤ 0 or sequential minute drawdown > $35,000)'
  };

  sealJson(file, record, 'sequential');
  log(`sequential: ${record.verdict}; joint procedure ${usd(joint.net)}, DD ${usd(joint.sequentialDd)}`);
  return record;
};

// ----- ledgers -----

export const lotRows = (door: Door, r: PoolResult) =>
  r.lots.map((l) => ({
    lot: l.id,
    family: l.family,
    kind: l.trade.kind,
    trade: l.trade.id,
    decision: dateOf(l.trade.dT),
    decisionPrice: l.trade.dPrice,
    entry: dateOf(l.entryT),
    entryRaw: l.entryRaw,
    entryAfterCost: l.entryPrice,
    principal: r2(l.principal0),
    shares: Math.round(l.shares0 * 1e6) / 1e6,
    fills: l.fills
      .map(
        (f) =>
          `${dateOf(f.t)} ${f.partial ? 'partial' : 'final'} ${f.reason} @ ${f.raw} (${Math.round(f.shares * 1e4) / 1e4} sh, repaid ${r2(f.principal)}, net ${r2(f.net)})`
      )
      .join(' | '),
    exit: l.open ? 'open' : dateOf(l.fills.at(-1)!.t),
    sessionsHeld: (l.open ? r.endIndex : l.fills.at(-1)!.s) - l.entryS,
    calendarDays: Math.round(((door.ds.sTime[l.open ? r.endIndex : l.fills.at(-1)!.s]! - l.entryTs) / 86400) * 10) / 10,
    interest: r2(l.interest),
    costs: r2(l.costs),
    realized: r2(l.realized),
    unrealized: r2(l.unrealized),
    net: r2(l.net),
    mae: r2(l.worst),
    maeTime: dateOf(l.worstT),
    mfe: r2(l.best),
    status: l.open ? 'open' : 'closed'
  }));

export const fundingRows = (door: Door, r: PoolResult) =>
  r.funding.map((f) => ({
    family: f.family,
    trade: f.trade,
    kind: f.kind,
    decision: dateOf(f.t),
    session: door.ds.dates[f.s],
    price: f.price,
    demand: r2(f.demand),
    capacity: r2(f.capacity),
    grant: r2(f.grant),
    outcome: f.outcome,
    reason: f.reason,
    occupant: f.occupant
  }));

const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';

  const keys = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);

    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  return `${keys.join(',')}\n${rows.map((r) => keys.map((k) => cell(r[k])).join(',')).join('\n')}\n`;
};

// Holding times per family (calendar days from the fill session to the final exit session, or to the end while open).
export const holdingOf = (door: Door, r: PoolResult) =>
  Object.fromEntries(
    (['D1', 'G'] as const).map((f) => {
      const days = r.lots
        .filter((l) => l.family === f)
        .map((l) => (door.ds.sTime[l.open ? r.endIndex : l.fills.at(-1)!.s]! - l.entryTs) / 86400)
        .sort((a, b) => a - b);

      return [
        f,
        days.length
          ? {
              lots: days.length,
              meanDays: Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10,
              medianDays: Math.round(days[Math.floor((days.length - 1) / 2)]! * 10) / 10,
              maxDays: Math.round(days.at(-1)! * 10) / 10
            }
          : null
      ];
    })
  );

// ----- matched trades (PROTOCOL.md §12.3) -----

export const matchLots = (x: PoolResult, y: PoolResult) => {
  const key = (l: Lot) => `${l.family}|${l.trade.dT}|${l.entryT}`;
  const ys = new Map(y.lots.map((l) => [key(l), l]));
  const used = new Set<Lot>();
  const rows: { kind: string; family: string; x: Lot | null; y: Lot | null; delta: number }[] = [];

  for (const l of x.lots) {
    const m = ys.get(key(l));

    if (m) {
      used.add(m);

      const sameFills = l.fills.map((f) => f.t).join() === m.fills.map((f) => f.t).join();
      const kind = Math.abs(l.principal0 - m.principal0) > 0.01 ? 'resized' : sameFills ? 'unchanged' : 'retimed exit';

      rows.push({ kind, family: l.family, x: l, y: m, delta: l.net - m.net });
      continue;
    }

    const end = (k: Lot) => (k.open ? Infinity : k.fills.at(-1)!.t);
    const overlap = y.lots.find(
      (m2) => !used.has(m2) && m2.family === l.family && m2.entryT < end(l) && l.entryT < end(m2)
    );

    if (overlap) {
      used.add(overlap);
      rows.push({ kind: 'retimed', family: l.family, x: l, y: overlap, delta: l.net - overlap.net });
    } else rows.push({ kind: 'newly admitted', family: l.family, x: l, y: null, delta: l.net });
  }

  for (const m of y.lots)
    if (!used.has(m)) rows.push({ kind: 'displaced', family: m.family, x: null, y: m, delta: -m.net });

  const by = (k: string) => rows.filter((r) => r.kind === k);
  const sum = (rs: typeof rows) => r2(rs.reduce((a, r) => a + r.delta, 0));

  return {
    summary: Object.fromEntries(
      ['unchanged', 'resized', 'retimed exit', 'retimed', 'newly admitted', 'displaced'].map((k) => [
        k,
        { lots: by(k).length, delta: sum(by(k)) }
      ])
    ),
    delta: r2(x.net - y.net),
    check: r2(sum(rows) - (x.net - y.net)),
    rows: rows.map((r) => ({
      kind: r.kind,
      family: r.family,
      xEntry: r.x ? dateOf(r.x.entryT) : '',
      xExit: r.x ? (r.x.open ? 'open' : dateOf(r.x.fills.at(-1)!.t)) : '',
      xPrincipal: r.x ? r2(r.x.principal0) : null,
      xNet: r.x ? r2(r.x.net) : null,
      yEntry: r.y ? dateOf(r.y.entryT) : '',
      yExit: r.y ? (r.y.open ? 'open' : dateOf(r.y.fills.at(-1)!.t)) : '',
      yPrincipal: r.y ? r2(r.y.principal0) : null,
      yNet: r.y ? r2(r.y.net) : null,
      delta: r2(r.delta)
    }))
  };
};

// ----- development diagnostics (PROTOCOL.md §12) -----

const diagDir = (env: Env) => path.join(env.outDir, 'diagnostics', 'D24');

export const detailed = (door: Door, j: Joint, o: EvalOptions = {}) => {
  const x = run(door, j, o, true, true);

  return { x, rec: recordOf(door, j, x, o) };
};

export const drawdownEpisodes = (door: Door, r: PoolResult) => {
  // daily-close drawdown episodes (peak → trough → recovery), the three deepest
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
          peak: door.ds.dates[peakS]!,
          trough: door.ds.dates[troughS]!,
          recovery: door.ds.dates[s]!,
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
      peak: door.ds.dates[peakS]!,
      trough: door.ds.dates[troughS]!,
      recovery: null,
      depth: r2(peak - trough),
      sessions: r.endIndex - peakS
    });

  return out.sort((a, b) => b.depth - a.depth).slice(0, 5);
};

export const runDiagnostics = async (env: Env = studyEnv(14), part?: string) => {
  const dir = diagDir(env);
  const selFile = selectionFile(env, 'C24');

  if (!isSealed(selFile)) throw new Error('the C24 selection is not sealed');
  if (env.schedule === 'study') assertFrozenCode();

  const sel = readJson<SelectionRecord>(selFile);
  const controls = await resolveControls();
  const door = await openPrefixDoor('D24', `${env.prefix}development diagnostics (report-only)`);
  const ev = (label: string) => sel.evidence.find((e) => e.label === label)!;
  const frozen = sel.selection.frozen.map(ev);
  const cs = controlSpecs(controls);
  const singleD1 = sel.singleFamily.d1only.primary ? ev(sel.singleFamily.d1only.primary) : null;
  const singleG = sel.singleFamily.gonly.primary ? ev(sel.singleFamily.gonly.primary) : null;
  const subjects: { label: string; joint: Joint; options: EvalOptions; role: string }[] = [
    ...frozen.map((e) => ({
      label: e.label,
      joint: e.joint,
      options: {},
      role: Object.entries(sel.selection.roles)
        .filter(([, l]) => l === e.label)
        .map(([r]) => r)
        .join(',')
    })),
    ...(singleD1
      ? [
          {
            label: singleD1.label,
            joint: singleD1.joint,
            options: { enabled: { D1: true, G: false } },
            role: 'optimized D1 alone'
          }
        ]
      : []),
    ...(singleG
      ? [
          {
            label: singleG.label,
            joint: singleG.joint,
            options: { enabled: { D1: false, G: true } },
            role: 'optimized Growth alone'
          }
        ]
      : []),
    ...cs.map((c) => ({
      label: `control: ${c.label}`,
      joint: c.joint,
      options: c.enabled ? { enabled: c.enabled } : {},
      role: 'control'
    }))
  ];

  fs.mkdirSync(dir, { recursive: true });

  const out: Record<string, unknown> = { stage: 'diagnostics', door: 'D24', selectionSha256: sha256File(selFile) };
  const details = new Map<string, ReturnType<typeof detailed>>();

  for (const s of subjects) details.set(s.label, detailed(door, s.joint, s.options));

  // 1. ledgers of the frozen set and the optimized single-family controls
  const ledgerDir = path.join(dir, 'ledgers');

  fs.mkdirSync(ledgerDir, { recursive: true });
  subjects.forEach((s, i) => {
    const d = details.get(s.label)!;
    const tag = `${String(i + 1).padStart(2, '0')}`;

    fs.writeFileSync(path.join(ledgerDir, `${tag}-lots.csv`), csv(lotRows(door, d.x.result)));
    fs.writeFileSync(path.join(ledgerDir, `${tag}-funding.csv`), csv(fundingRows(door, d.x.result)));
    fs.writeFileSync(
      path.join(ledgerDir, `${tag}-daily.csv`),
      csv(
        door.ds.dates.map((date, k) => ({
          date,
          marked: r2(d.x.result.daily[k]!),
          principal: r2(d.x.result.principalAtClose[k]!),
          marketValue: r2(d.x.result.valueAtClose[k]!)
        }))
      )
    );
  });
  fs.writeFileSync(
    path.join(ledgerDir, 'INDEX.md'),
    `# Ledger index (development, D24)\n\n${subjects.map((s, i) => `- ${String(i + 1).padStart(2, '0')}: ${s.label} (${s.role || '—'}) — ${describeJoint(s.joint)}`).join('\n')}\n`
  );

  // 2. the subjects' records, drawdown episodes, top market episodes
  out.subjects = subjects.map((s) => {
    const d = details.get(s.label)!;
    const r = d.x.result;
    const eps = episodesOf(r).map((e) => ({
      first: door.ds.dates[e.first],
      last: Number.isFinite(e.last) ? door.ds.dates[e.last] : 'open',
      net: r2(e.net),
      lots: e.lots
    }));
    const gaps = r.lots.flatMap((l) =>
      l.fills
        .filter((f) => f.reason === 'trailing stop gap')
        .map((f) => ({ lot: l.id, date: dateOf(f.t), net: r2(f.net) }))
    );
    const refused = r.funding.filter((f) => f.outcome === 'refused');

    return {
      label: s.label,
      role: s.role,
      id: jointId(s.joint),
      describe: describeJoint(s.joint),
      record: d.rec,
      ddPeak: dateOf(r.dd.peakT),
      ddTrough: dateOf(r.dd.troughT),
      ddRecovery: dateOf(r.dd.recoveryT),
      drawdownEpisodes: drawdownEpisodes(door, r),
      episodes: eps.sort((a, b) => b.net - a.net).slice(0, 5),
      gapExits: gaps,
      holding: holdingOf(door, r),
      refusals: refused.length,
      lostOpportunities: refused.map((f) => {
        const book = f.family === 'D1' ? d.x.d1 : d.x.g;
        const v = book?.trades.find((t) => t.id === f.trade);

        return { family: f.family, decision: dateOf(f.t), reason: f.reason, virtualNet: v ? r2(v.vNet) : null };
      }),
      exposure: {
        sessionsHeld: r.sessionsHeld,
        sessionsBoth: r.sessionsBoth,
        sessions: door.sessions,
        peakPrincipal: r2(r.peakPrincipal),
        peakMarketValue: r2(r.peakValue),
        meanPrincipal: r2(Array.from(r.principalAtClose).reduce((a, b) => a + b, 0) / door.sessions)
      }
    };
  });

  // 3. ablations and sensitivities (report-only causal reruns on development)
  const primary = frozen[0];

  if (primary && (!part || part === 'ablations')) {
    const p = primary.joint;
    const top = episodesOf(details.get(primary.label)!.x.result).sort((a, b) => b.net - a.net)[0];
    const variants: [string, Joint, EvalOptions][] = [
      ['as frozen', p, {}],
      ['architecture A', normalize({ ...p, a: { ...p.a, arch: 'A', d1Target: 1, gTarget: 1 } }), {}],
      [
        'architecture B 100/100 (partial release ON)',
        normalize({ ...p, a: { ...p.a, arch: 'B', d1Target: 1, gTarget: 1 } }),
        {}
      ],
      ['priority flipped', normalize({ ...p, a: { ...p.a, first: p.a.first === 'D1' ? 'G' : 'D1' } }), {}],
      ['retention OFF', normalize({ ...p, g: { ...p.g, retentionEnabled: false } }), {}],
      ['D1 removed (Growth alone in the pool)', p, { enabled: { D1: false, G: true } }],
      ['Growth removed (D1 alone in the pool)', p, { enabled: { D1: true, G: false } }],
      ['minimum allocation $0', p, { minimumAllocation: 0 }],
      ['minimum allocation $5,000', p, { minimumAllocation: 5000 }],
      ['minimum allocation $20,000', p, { minimumAllocation: 20000 }],
      ['whole shares', p, { wholeShares: true }],
      ['funding start 2017-06-15 (prespecified sensitivity)', p, { fundFrom: chronology.sensitivityFunding }],
      ['D1 native arming 2017-06-15', p, { d1Arm: 'native' }],
      ['cost 10 bps', p, { friction: { costBps: 10 } }],
      ['cost 20 bps', p, { friction: { costBps: 20 } }],
      ['interest 14%', p, { friction: { rate: 0.14 } }],
      ['stop slippage +25 bps', p, { friction: { stopSlippageBps: 25 } }],
      ['next-open stops (D1; Growth where supported)', p, { friction: { stopFill: 'next-open' } }]
    ];

    if (top)
      variants.push([
        `no new funding in the top episode (${door.ds.dates[top.first]} → ${Number.isFinite(top.last) ? door.ds.dates[top.last] : 'end'})`,
        p,
        {
          blackouts: [
            {
              first: door.ds.dates[top.first]!,
              last: Number.isFinite(top.last) ? door.ds.dates[top.last]! : door.ds.dates.at(-1)!
            }
          ]
        }
      ]);

    out.ablations = variants.map(([name, j, o]) => {
      const r = evaluate(door, j, o);

      return {
        name,
        id: jointId(j),
        net: r.net,
        dd: r.dd,
        lots: r.lots,
        d1Lots: r.fam.D1.lots,
        gLots: r.fam.G.lots,
        d1Booked: r.fam.D1.booked,
        gBooked: r.fam.G.booked,
        minimumBinds: r.minimumBinds,
        delta: r2(r.net - details.get(primary.label)!.rec.net)
      };
    });
    out.topEpisode = top
      ? {
          first: door.ds.dates[top.first],
          last: Number.isFinite(top.last) ? door.ds.dates[top.last] : 'open',
          net: r2(top.net),
          arithmeticRemoval: r2(details.get(primary.label)!.rec.net - top.net)
        }
      : null;

    // the one-family and architecture perturbations of the primary are in the qualification evidence; the
    // allocation grid of the primary's trading parameters (every B target pair and A) is reported here
    const grid: Record<string, unknown>[] = [];

    for (const first of ['D1', 'G'] as const) {
      grid.push({
        arch: 'A',
        first,
        ...pick(evaluate(door, normalize({ ...p, a: { arch: 'A', d1Target: 1, gTarget: 1, first } })))
      });
      for (const d1Target of [0.25, 0.5, 0.75, 1])
        for (const gTarget of [0.25, 0.5, 0.75, 1])
          grid.push({
            arch: 'B',
            first,
            d1Target,
            gTarget,
            ...pick(evaluate(door, normalize({ ...p, a: { arch: 'B', d1Target, gTarget, first } })))
          });
    }
    out.allocationGrid = grid;
  }

  // 4. matched trades
  if (primary && (!part || part === 'matched')) {
    const px = details.get(primary.label)!.x.result;
    const pairs: [string, string][] = [];

    for (const s of subjects) if (s.label !== primary.label) pairs.push([primary.label, s.label]);
    out.matched = pairs.map(([a, b]) => ({ x: a, y: b, ...matchLots(px, details.get(b)!.x.result) }));
  }

  // 5. a ledger example: a Growth partial sale releasing principal, then a D1 admission funded with it
  out.partialReleaseExample = findPartialRelease(
    door,
    subjects.map((s) => ({ label: s.label, x: details.get(s.label)!.x.result }))
  );

  sealJson(path.join(dir, 'diagnostics.json'), out, 'diagnostics D24');
  log(`diagnostics: ${subjects.length} subjects`);
};

const pick = (r: Rec) => ({
  net: r.net,
  dd: r.dd,
  lots: r.lots,
  d1Lots: r.fam.D1.lots,
  gLots: r.fam.G.lots,
  mixed: r.mixed
});

export const findPartialRelease = (door: Door, runs: { label: string; x: PoolResult }[]) => {
  for (const { label, x } of runs) {
    for (const g of x.lots.filter((l) => l.family === 'G'))
      for (const f of g.fills.filter((ff) => ff.partial)) {
        const next = x.lots.find(
          (l) => l.family === 'D1' && l.entryT > f.t && l.entryT < (g.open ? Infinity : g.fills.at(-1)!.t)
        );

        if (next) {
          const decision = x.funding.find((ff) => ff.family === 'D1' && ff.trade === next.trade.id);

          return {
            subject: label,
            growthLot: {
              lot: g.id,
              entry: dateOf(g.entryT),
              principal: r2(g.principal0),
              partial: {
                time: dateOf(f.t),
                price: f.raw,
                sharesSold: f.shares,
                principalRepaid: r2(f.principal),
                interest: r2(f.interest),
                net: r2(f.net)
              },
              final: g.open ? 'open' : dateOf(g.fills.at(-1)!.t),
              net: r2(g.net)
            },
            d1Admission: decision
              ? {
                  decision: dateOf(decision.t),
                  demand: r2(decision.demand),
                  capacity: r2(decision.capacity),
                  grant: r2(decision.grant),
                  outcome: decision.outcome,
                  occupant: decision.occupant
                }
              : null,
            d1Lot: {
              lot: next.id,
              entry: dateOf(next.entryT),
              principal: r2(next.principal0),
              exit: next.open ? 'open' : dateOf(next.fills.at(-1)!.t),
              net: r2(next.net)
            }
          };
        }
      }
  }

  return null;
};

// ----- the frozen selection (PROTOCOL.md §13.1) -----

// The study's frozen file, or (pilot) one inside the pilot's output directory.
export const frozenFileOf = (env: Env) =>
  env.schedule === 'study' ? frozenSelectionFile : path.join(env.outDir, 'FROZEN_SELECTION.json');

export const freezeSelection = async (env: Env = studyEnv(1)) => {
  const frozenFile = frozenFileOf(env);
  const outRoot = env.outDir;

  if (fs.existsSync(frozenFile)) throw new Error(`${path.relative(repoRoot, frozenFile)} exists`);

  const selFile = selectionFile(env, 'C24');
  const seqFile = path.join(outRoot, 'folds', 'sequential.json');
  const diagFile = path.join(outRoot, 'diagnostics', 'D24', 'diagnostics.json');

  for (const f of [
    selFile,
    ...(env.schedule === 'study' || fs.existsSync(seqFile) ? [seqFile] : []),
    searchFile(env, 'C24'),
    diagFile
  ])
    if (!isSealed(f)) throw new Error(`${path.relative(repoRoot, f)} is not sealed`);

  const digest = env.schedule === 'study' ? assertFrozenCode() : codeDigest();
  const sel = readJson<SelectionRecord>(selFile);
  const seq = fs.existsSync(seqFile)
    ? readJson<{ verdict: string; policies: { name: string; net: number; sequentialDd: number }[] }>(seqFile)
    : { verdict: '(pilot: no sequential record)', policies: [] };
  const ev = (label: string) => sel.evidence.find((e) => e.label === label)!;
  const controls = await resolveControls();
  const body = {
    study: 'vgt-d1-growth-joint',
    kind: 'FROZEN SELECTION — read-only; written before any 2025–2026 outcome of a joint candidate was computed',
    frozenAt: new Date().toISOString(),
    pins: {
      evaluationDigest: digest ?? codeDigest(),
      closureDigest: closureDigest(),
      protocolFreezeSha256: fs.existsSync(freezeFile) ? sha256File(freezeFile) : '(not frozen: pilot)',
      protocolSha256: sha256File(path.join(researchDir, 'PROTOCOL.md')),
      amendmentsSha256: sha256File(path.join(researchDir, 'AMENDMENTS.md')),
      selectionSha256: sha256File(selFile),
      sequentialSha256: fs.existsSync(seqFile) ? sha256File(seqFile) : null,
      diagnosticsSha256: sha256File(diagFile),
      canonicalDataSha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e',
      gitHead: execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim()
    },
    primary: sel.selection.primary,
    roles: sel.selection.roles,
    rankOrder: sel.selection.ranked,
    chronology: seq.verdict,
    members: sel.selection.frozen.map((label) => {
      const e = ev(label);

      return {
        label,
        id: e.id,
        joint: e.joint,
        describe: describeJoint(e.joint),
        development: {
          net: e.centre.net,
          dd: e.centre.dd,
          selectRobust: e.select.robust,
          selectP90: e.select.p90Dd,
          confirmMedian: e.confirm.median,
          confirmP10: e.confirm.p10,
          confirmP90Dd: e.confirm.p90Dd
        }
      };
    }),
    singleFamily: {
      d1only: sel.singleFamily.d1only.primary
        ? { label: sel.singleFamily.d1only.primary, joint: ev(sel.singleFamily.d1only.primary).joint }
        : null,
      gonly: sel.singleFamily.gonly.primary
        ? { label: sel.singleFamily.gonly.primary, joint: ev(sel.singleFamily.gonly.primary).joint }
        : null
    },
    controls: controlSpecs(controls).map((c) => ({
      label: c.label,
      id: jointId(c.joint),
      joint: c.joint,
      enabled: c.enabled ?? null
    })),
    validationPlan: {
      door: 'FULL (2016-01-04 → 2026-10-30; one continuous run, nothing reset at 2024-12-31)',
      boundary: '2024-12-31',
      tests: {
        V1: 'validation P&L (marked change from the 2024-12-31 close) > 0',
        V2: 'validation minute drawdown (reset at the boundary) ≤ $35,000',
        V3: 'whole-run minute drawdown 2016-01-04 → 2026-10-30 ≤ $35,000',
        V4: "the primary's validation P&L vs every control and the optimized single-family controls (reported, not a gate)",
        V5: 'confirmation family 1 (128 draws) on FULL: median validation P&L > 0 (report-only)'
      },
      perturbations:
        "confirmation rep 1 (seed labels ['confirm', 1, 'C24']) for the primary and every role holder; costs 10 and 20 bps, 14% interest",
      noFeedback: 'no validation outcome changes a range, ranking, role, candidate or stopping decision'
    }
  };
  const text = `${JSON.stringify(body, null, 1)}\n`;

  sealText(frozenFile, text, `${env.prefix}frozen selection`);
  log(
    `${path.relative(repoRoot, frozenFile)} written (${sha256File(frozenFile).slice(0, 12)}…); commit it before validate`
  );
};

// ----- the one-time validation (PROTOCOL.md §13.2) -----

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

  if (study) {
    const status = execSync(`git status --porcelain -- ${path.relative(repoRoot, frozenFile)}`, { cwd: repoRoot })
      .toString()
      .trim();
    const tracked = execSync(`git ls-files -- ${path.relative(repoRoot, frozenFile)}`, { cwd: repoRoot })
      .toString()
      .trim();

    if (!tracked || status)
      throw new Error('FROZEN_SELECTION.json must be committed and unchanged before the validation');
    assertFrozenCode();
  }

  const guard = { file: frozenFile, sha256: sha256File(frozenFile) };
  const frozen = readJson<{
    members: { label: string; joint: Joint }[];
    roles: Record<string, string | null>;
    primary: string | null;
    singleFamily: { d1only: { label: string; joint: Joint } | null; gonly: { label: string; joint: Joint } | null };
    controls: { label: string; joint: Joint; enabled: { D1: boolean; G: boolean } | null }[];
  }>(frozenFile);
  const subjects: { label: string; joint: Joint; options: EvalOptions; role: string }[] = [
    ...frozen.members.map((m) => ({
      label: m.label,
      joint: m.joint,
      options: {},
      role: Object.entries(frozen.roles)
        .filter(([, l]) => l === m.label)
        .map(([r]) => r)
        .join(',')
    })),
    ...(frozen.singleFamily.d1only
      ? [
          {
            label: frozen.singleFamily.d1only.label,
            joint: frozen.singleFamily.d1only.joint,
            options: { enabled: { D1: true, G: false } },
            role: 'optimized D1 alone'
          }
        ]
      : []),
    ...(frozen.singleFamily.gonly
      ? [
          {
            label: frozen.singleFamily.gonly.label,
            joint: frozen.singleFamily.gonly.joint,
            options: { enabled: { D1: false, G: true } },
            role: 'optimized Growth alone'
          }
        ]
      : []),
    ...frozen.controls.map((c) => ({
      label: `control: ${c.label}`,
      joint: c.joint,
      options: c.enabled ? { enabled: c.enabled } : {},
      role: 'control'
    }))
  ];

  fs.mkdirSync(vdir, { recursive: true });

  const door = study
    ? await openFullDoor('the one-time validation (frozen selection guard)', guard)
    : await openPrefixDoor('D24', `${env.prefix}validation path test (development only)`);
  const ledgerDir = path.join(vdir, 'ledgers');

  fs.mkdirSync(ledgerDir, { recursive: true });
  fs.writeFileSync(
    path.join(ledgerDir, 'INDEX.md'),
    `# Validation ledger index (FULL)\n\n${subjects.map((s, i) => `- ${String(i + 1).padStart(2, '0')}: ${s.label} (${s.role || '—'}) — ${describeJoint(s.joint)}`).join('\n')}\n`
  );

  const rows = subjects.map((s, i) => {
    const o: EvalOptions = { ...s.options, boundaries: [boundary] };
    const x = run(door, s.joint, o, true, true);
    const rec = recordOf(door, s.joint, x, o);
    const b = indexOf(door, boundary);
    const crossing = x.result.lots.filter((l) => l.entryS <= b && (l.open || l.fills.at(-1)!.s > b));

    {
      const tag = String(i + 1).padStart(2, '0');

      fs.writeFileSync(path.join(ledgerDir, `${tag}-lots.csv`), csv(lotRows(door, x.result)));
      fs.writeFileSync(path.join(ledgerDir, `${tag}-funding.csv`), csv(fundingRows(door, x.result)));
    }

    fs.writeFileSync(
      path.join(ledgerDir, `${String(i + 1).padStart(2, '0')}-daily.csv`),
      csv(
        door.ds.dates.map((date, k) => ({
          date,
          marked: r2(x.result.daily[k]!),
          principal: r2(x.result.principalAtClose[k]!),
          marketValue: r2(x.result.valueAtClose[k]!)
        }))
      )
    );

    return {
      label: s.label,
      role: s.role,
      id: jointId(s.joint),
      validationNet: rec.periods[0]!.after,
      validationDd: rec.periods[0]!.dd,
      boundaryEquity: rec.periods[0]!.equity,
      wholeNet: rec.net,
      wholeDd: rec.dd,
      wholeDdPeak: dateOf(rec.ddPeakT),
      wholeDdTrough: dateOf(rec.ddTroughT),
      y2025: rec.years['2025'] ?? 0,
      y2026: rec.years['2026'] ?? 0,
      lotsAfter: x.result.lots.filter((l) => l.entryS > b).length,
      holding: holdingOf(door, x.result),
      ddRecovery: dateOf(rec.ddRecoveryT),
      crossing: crossing.map((l) => ({
        family: l.family,
        entry: dateOf(l.entryT),
        exit: l.open ? 'open' : dateOf(l.fills.at(-1)!.t),
        net: r2(l.net)
      })),
      record: rec
    };
  });
  const primary = rows.find((r) => r.label === frozen.primary) ?? null;
  const tests = primary
    ? {
        V1: primary.validationNet > 0,
        V2: primary.validationDd <= economics.ceiling,
        V3: primary.wholeDd <= economics.ceiling,
        V4: Object.fromEntries(
          rows.filter((r) => r !== primary).map((r) => [r.label, r2(primary.validationNet - r.validationNet)])
        )
      }
    : null;

  // report-only perturbations and stresses of the frozen members on FULL (through workers under the guard)
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

      for (const m of frozen.members) {
        const nb = neighbourhood(m.joint, { name: 'confirm', n: 128, labels: ['confirm', 1, 'C24'] });
        const opts: EvalOptions = { boundaries: [boundary] };
        const recs = await lab.evalMany([
          { joint: m.joint, options: opts },
          ...nb.map((p) => ({ joint: p.joint, options: opts }))
        ]);
        const centre = recs[0]!;
        const after = recs
          .slice(1)
          .map((r) => r.periods[0]!.after)
          .sort((a, b) => a - b);
        const stress = await lab.evalMany([
          { joint: m.joint, options: { boundaries: [boundary], friction: { costBps: 10 } } },
          { joint: m.joint, options: { boundaries: [boundary], friction: { costBps: 20 } } },
          { joint: m.joint, options: { boundaries: [boundary], friction: { rate: 0.14 } } }
        ]);

        out[m.label] = {
          neighbours: after.length,
          validationMedian: r2(after[Math.floor((after.length - 1) / 2)] ?? NaN),
          validationP10: r2(after[Math.floor(0.1 * (after.length - 1))] ?? NaN),
          positiveShare: Math.round((after.filter((x) => x > 0).length / Math.max(1, after.length)) * 1e4) / 1e4,
          wholeRunNb: nbStats(centre, recs.slice(1)),
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
    end: door.ds.dates.at(-1),
    label:
      '2025–2026 validation on previously examined history (not an untouched holdout); November–December 2026 not evaluated',
    primary: frozen.primary,
    tests,
    V5: primary
      ? ((perturbations as Record<string, { validationMedian: number }>)[primary.label]?.validationMedian ?? null)
      : null,
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

export { cutoffs };
