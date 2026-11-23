// Priority 4's report tables (no evaluation; reads sealed records only). Writes Markdown tables and a machine-readable
// summary under research/vg-l0-staged-stop/reports/tables/ and results/analysis/summary.json. No charts or visuals
// (CLAUDE.md reporting preference).
//   GPU_POLICY_PURPOSE=diagnostic npm run vg-l0ss-tools -- analyze  (via tools.ts)
import fs from 'node:fs';
import path from 'node:path';
import { type ArmKey, armKeys, cells, cutoffKeys, researchDir, resultsDir } from '../../src/vg-l0-staged-stop/context.ts';
import { ablationFile, intervalFile, searchFile, selectionFile } from '../../src/vg-l0-staged-stop/doors.ts';
import { decompositionFile, extendFile, gateRFile, informedFile, outcomeFile, qualificationFile } from '../../src/vg-l0-staged-stop/stages.ts';
import { readSealed } from '../../src/vg-l0-staged-stop/records.ts';
import { quantile } from '../../src/vg-d1-growth-joint/fitness.ts';
import { ledger } from '../../src/vg-l0-staged-stop/budget.ts';
import { writeJson } from './common.ts';

const tablesDir = path.join(researchDir, 'reports', 'tables');
const exists = (f: string) => fs.existsSync(f);
const usd = (x: number | null | undefined) => (x === null || x === undefined || Number.isNaN(x) ? '—' : `${x < 0 ? '−' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`);
const num = (x: number | null | undefined, d = 0) => (x === null || x === undefined || Number.isNaN(x) ? '—' : x.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined || Number.isNaN(x) ? '—' : `${(100 * x).toFixed(d)} %`);
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);
const q = (xs: number[], p: number) => (xs.length ? quantile([...xs].sort((a, b) => a - b), p) : NaN);
const out: Record<string, string> = {};
const summary: Record<string, unknown> = {};

// ----- ablations -----
if (exists(ablationFile)) {
  type Row = { label: string; incumbent: string; staged: unknown; byFriction: Record<string, { net: number; dd: number; envelope: { principalLossLiquidation: number; bankedDdLiquidation: number }; staged: Record<string, { arms: number; stagedExits: number; placementExits: number }> | null }> };
  const a = readSealed<{ a0: { pass: boolean; rows: unknown[] }; points: { label: string; invalid: string[]; duplicateOf: string | null }[]; rows: Row[]; requested: number }>(ablationFile);
  const offOf = (inc: string) => a.rows.find((r) => r.label === `${inc} | OFF`)!;
  const fr = ['base', 'stop slippage +10 bps', 'stop slippage +25 bps', 'next-open stops'];
  const rows = a.rows
    .filter((r) => !r.label.endsWith('| OFF'))
    .map((r) => {
      const off = offOf(r.incumbent);
      const c = r.byFriction.base!.staged ?? {};
      const sum = (k: 'arms' | 'stagedExits' | 'placementExits') => Object.values(c).reduce((s, x) => s + x[k], 0);

      return [
        r.label.replace(/^[^|]+\| /, ''),
        r.incumbent,
        ...fr.map((f) => usd(r.byFriction[f]!.net - off.byFriction[f]!.net)),
        usd(r.byFriction.base!.dd - off.byFriction.base!.dd),
        usd(r.byFriction.base!.envelope.principalLossLiquidation - off.byFriction.base!.envelope.principalLossLiquidation),
        usd(r.byFriction.base!.envelope.bankedDdLiquidation - off.byFriction.base!.envelope.bankedDdLiquidation),
        `${sum('arms')}/${sum('stagedExits')}/${sum('placementExits')}`
      ];
    });

  out['ablation-points'] = table(['Point (books · A · τ₂ ratio)', 'Incumbent', 'Δ net base', 'Δ net slip +10', 'Δ net slip +25', 'Δ net next-open', 'Δ marked DD', 'Δ principal loss (liq.)', 'Δ banked DD (liq.)', 'arms/staged exits/placement'], rows);
  out['ablation-off'] = table(
    ['Incumbent (staged OFF)', ...fr.map((f) => `net ${f}`), 'marked DD base'],
    ['New L0', 'N/original'].map((inc) => {
      const o = offOf(inc);

      return [inc, ...fr.map((f) => usd(o.byFriction[f]!.net)), usd(o.byFriction.base!.dd)];
    })
  );
  out['ablation-invalid'] = table(['Point', 'Rule failed'], a.points.filter((p) => p.invalid.length).map((p) => [p.label, p.invalid.join('; ')]));

  const better = (inc: string, set: string) => a.rows.filter((r) => r.incumbent === inc && r.label.includes(`| ${set} |`) && r.byFriction.base!.net > offOf(inc).byFriction.base!.net).length;
  const total = (inc: string, set: string) => a.rows.filter((r) => r.incumbent === inc && r.label.includes(`| ${set} |`)).length;
  const sets = ['D1:GDX', 'D1:VGT', 'G:VGT', 'D1:GDX+D1:VGT+G:VGT'];

  out['ablation-summary'] = table(
    ['Book set', 'New L0: points with Δ net > 0 (base)', 'N/original: points with Δ net > 0 (base)'],
    sets.map((s) => [s, `${better('New L0', s)} / ${total('New L0', s)}`, `${better('N/original', s)} / ${total('N/original', s)}`])
  );
  summary.ablation = { a0: a.a0.pass, requested: a.requested, points: a.points.length, invalid: a.points.filter((p) => p.invalid.length).length };
}

// ----- search, extension, budget -----
type Lane = { key: string; structure: string; replicate: number; requested: number; extension: { islands: number; stop: string }; counts: Record<string, number>; shortlist: unknown[] };
const searches = cutoffKeys.filter((c) => exists(searchFile(c))).map((c) => ({ c, s: readSealed<{ lanes: Record<ArmKey, Lane[]>; requested: number; compute: { fresh: number; archiveHits: number; wallSeconds: number }; wallSeconds: number }>(searchFile(c)) }));

if (searches.length) {
  const rows: (string | number)[][] = [];

  for (const { c, s } of searches)
    for (const a of armKeys) {
      const ls = s.lanes[a];
      const req = ls.map((l) => l.requested);
      const stops = ls.reduce<Record<string, number>>((m, l) => ((m[l.extension.stop.split(' (')[0]!] = (m[l.extension.stop.split(' (')[0]!] ?? 0) + 1), m), {});

      rows.push([c, a, ls.length, num(req.reduce((x, y) => x + y, 0)), num(mean(req)), num(q(req, 0.5)), num(Math.max(...req)), num(mean(ls.map((l) => l.extension.islands)), 2), Object.entries(stops).map(([k, v]) => `${k}: ${v}`).join('; ')]);
    }
  out['search-budget'] = table(['Cutoff', 'Arm', 'Lanes', 'Requested', 'Mean / lane', 'Median', 'Max', 'Mean islands', 'Stop reasons'], rows);
  out['search-compute'] = table(
    ['Cutoff', 'Requested', 'Fresh', 'Archive hits', 'Wall (s)', 'Requested / s'],
    searches.map(({ c, s }) => [c, num(s.requested), num(s.compute.fresh), num(s.compute.archiveHits), num(s.compute.wallSeconds), num(s.requested / s.compute.wallSeconds)])
  );
  summary.search = searches.map(({ c, s }) => ({ cutoff: c, requested: s.requested, fresh: s.compute.fresh, wallSeconds: s.compute.wallSeconds }));
}

const gate = cutoffKeys.filter((c) => exists(gateRFile(c))).map((c) => ({ c, g: readSealed<{ identical: boolean; lanes: { identical: boolean }[] }>(gateRFile(c)) }));

if (gate.length) out['gate-r'] = table(['Cutoff', 'CTRL lanes R3–R18 = Stage B', 'Verdict'], gate.map(({ c, g }) => [c, `${g.lanes.filter((l) => l.identical).length}/${g.lanes.length}`, g.identical ? 'IDENTICAL' : 'DIFFERENT']));

const ext = cutoffKeys.filter((c) => exists(extendFile(c))).map((c) => ({ c, e: readSealed<{ triggered: boolean; decision: { share: Record<ArmKey, number> }; requested: number; stillBudgetBound?: Record<ArmKey, string[]> }>(extendFile(c)) }));

if (ext.length)
  out.extension = table(
    ['Cutoff', 'Budget-bound share CTRL', 'EXP', 'Block triggered', 'Requested', 'Still budget-bound (CTRL / EXP)'],
    ext.map(({ c, e }) => [c, pct(e.decision.share.CTRL), pct(e.decision.share.EXP), e.triggered ? 'yes' : 'no', num(e.requested), e.stillBudgetBound ? `${e.stillBudgetBound.CTRL.length} / ${e.stillBudgetBound.EXP.length}` : '—'])
  );

// ----- selections: the paired statistics -----
type LV = { lane: string; cell: string; replicate: number; value: number; qualified: number; selectable: number; representative: { label: string; stagedPattern: string; isProjection: boolean } | null; offProjection: { centreNet: number } | null };
type Summ = { n: number; mean: number; l90: number; u90: number; perCell: Record<string, { n: number; mean: number }>; signs: { positive: number; zero: number; negative: number }; unstratified: { l90: number; u90: number } };
type Sel = {
  laneValues: Record<ArmKey, LV[]>;
  pairs: { cell: string; replicate: number; ctrl: number; exp: number; d: number }[];
  primary: Summ & { material: boolean; harmful: boolean; zeroLanes: { ctrl: number; exp: number } };
  risk: { metrics: Record<string, Summ & { margin: number; nonInferior: boolean; clearlyWorse: boolean }>; nonInferior: boolean; clearlyWorse: boolean; pairsWithBothRepresentatives: number };
  mechanism: { representatives: number; on: number; share: number; wilson95: [number, number] | null; advantage: { n: number; mean: number; l90: number; u90: number }; confirmed: boolean };
  pooled: Record<ArmKey, { qualified: number; selectable: number; primary: { label: string; stagedPattern: string; centreNet: number; centreDd: number; principalLossLiquidation: number; bankedDdLiquidation: number; confirmP90Dd: number; selectRobust: number } | null; stagedUse: { qualifiedOn: number; qualifiedOff: number } }>;
  budgetBoundAfterExtension: Record<ArmKey, number>;
  informed: { type: string; centre: string; values: Record<ArmKey, LV[]>; d: Summ; pooled: Record<ArmKey, { primary: { label: string; stagedPattern: string; centreNet: number } | null } | null> }[] | null;
};
const sels = cutoffKeys.filter((c) => exists(selectionFile(c))).map((c) => ({ c, s: readSealed<Sel>(selectionFile(c)) }));

if (sels.length) {
  out.primary = table(
    ['Cutoff', 'Pairs', 'Mean D', 'L90', 'U90', 'Per cell (GA0.VA0 / GB0.VD1)', 'Signs + / 0 / −', 'V = $0 lanes CTRL / EXP', 'Material', 'Harmful'],
    sels.map(({ c, s }) => [
      c,
      s.primary.n,
      usd(s.primary.mean),
      usd(s.primary.l90),
      usd(s.primary.u90),
      cells.map((x) => usd(s.primary.perCell[x]?.mean)).join(' / '),
      `${s.primary.signs.positive} / ${s.primary.signs.zero} / ${s.primary.signs.negative}`,
      `${s.primary.zeroLanes.ctrl} / ${s.primary.zeroLanes.exp}`,
      s.primary.material ? 'yes' : 'no',
      s.primary.harmful ? 'yes' : 'no'
    ])
  );
  out['primary-halves'] = table(
    ['Cutoff', 'Mean D R3–R18 (Stage B seeds)', 'Mean D R19–R34 (new)', 'Mean V CTRL', 'Mean V EXP', 'D p10 / median / p90'],
    sels.map(({ c, s }) => {
      const ds = s.pairs.map((p) => p.d);

      return [c, usd(mean(s.pairs.filter((p) => p.replicate <= 18).map((p) => p.d))), usd(mean(s.pairs.filter((p) => p.replicate > 18).map((p) => p.d))), usd(mean(s.pairs.map((p) => p.ctrl))), usd(mean(s.pairs.map((p) => p.exp))), `${usd(q(ds, 0.1))} / ${usd(q(ds, 0.5))} / ${usd(q(ds, 0.9))}`];
    })
  );
  out.risk = table(
    ['Cutoff', 'Metric', 'Pairs', 'Mean Δ (EXP − CTRL)', 'L90', 'U90', 'Margin', 'Non-inferior', 'Clearly worse'],
    sels.flatMap(({ c, s }) =>
      Object.entries(s.risk.metrics).map(([m, x]) => [
        c,
        m,
        x.n,
        m === 'breachShare' ? pct(x.mean, 2) : usd(x.mean),
        m === 'breachShare' ? pct(x.l90, 2) : usd(x.l90),
        m === 'breachShare' ? pct(x.u90, 2) : usd(x.u90),
        m === 'breachShare' ? pct(x.margin, 0) : usd(x.margin),
        x.nonInferior ? 'yes' : 'no',
        x.clearlyWorse ? 'yes' : 'no'
      ])
    )
  );
  out.mechanism = table(
    ['Cutoff', 'EXP representatives', 'Using S1', 'Share (Wilson 95 %)', 'Mean advantage over own all-OFF', 'L90', 'Representatives that are projections', 'Confirmed'],
    sels.map(({ c, s }) => [
      c,
      s.mechanism.representatives,
      s.mechanism.on,
      `${pct(s.mechanism.share)} (${s.mechanism.wilson95 ? `${pct(s.mechanism.wilson95[0])}–${pct(s.mechanism.wilson95[1])}` : '—'})`,
      usd(s.mechanism.advantage.mean),
      usd(s.mechanism.advantage.l90),
      s.laneValues.EXP.filter((v) => v.representative?.isProjection).length,
      s.mechanism.confirmed ? 'yes' : 'no'
    ])
  );
  out['staged-patterns'] = table(
    ['Cutoff', 'EXP representative pattern', 'Lanes'],
    sels.flatMap(({ c, s }) => {
      const m = s.laneValues.EXP.reduce<Record<string, number>>((a, v) => ((a[v.representative?.stagedPattern ?? 'no qualified member'] = (a[v.representative?.stagedPattern ?? 'no qualified member'] ?? 0) + 1), a), {});

      return Object.entries(m)
        .sort((x, y) => y[1] - x[1])
        .map(([k, v]) => [c, k, v]);
    })
  );
  out.pooled = table(
    ['Cutoff', 'Arm', 'Qualified / selectable', 'P0 primary', 'Pattern', 'Centre net', 'Centre DD', 'Principal loss (liq.)', 'Banked DD (liq.)', 'Confirm p90 DD', 'Qualified ON / OFF'],
    sels.flatMap(({ c, s }) =>
      armKeys.map((a) => {
        const p = s.pooled[a].primary;

        return [c, a, `${s.pooled[a].qualified} / ${s.pooled[a].selectable}`, p ? p.label : 'none qualified', p?.stagedPattern ?? '—', usd(p?.centreNet), usd(p?.centreDd), usd(p?.principalLossLiquidation), usd(p?.bankedDdLiquidation), usd(p?.confirmP90Dd), `${s.pooled[a].stagedUse.qualifiedOn} / ${s.pooled[a].stagedUse.qualifiedOff}`];
      })
    )
  );
  out.lanes = sels
    .map(({ c, s }) =>
      [
        `### ${c}`,
        '',
        table(
          ['Cell', 'R', 'V CTRL', 'V EXP', 'D', 'EXP representative pattern', 'EXP rep. − own all-OFF', 'Qualified CTRL / EXP'],
          s.laneValues.CTRL.map((v) => {
            const e = s.laneValues.EXP.find((x) => x.cell === v.cell && x.replicate === v.replicate)!;

            return [v.cell, v.replicate, usd(v.value), usd(e.value), usd(e.value - v.value), e.representative ? `${e.representative.stagedPattern}${e.representative.isProjection ? ' (projection)' : ''}` : 'none', e.offProjection ? usd(e.value - e.offProjection.centreNet) : '—', `${v.qualified}/${v.selectable} · ${e.qualified}/${e.selectable}`];
          })
        )
      ].join('\n')
    )
    .join('\n\n');

  const inf = sels.find((x) => x.c === 'C24')?.s.informed;

  if (inf)
    out.informed = table(
      ['Type', 'Centre', 'Mean V CTRL', 'Mean V EXP', 'Mean D_I', 'L90 / U90 (unstratified)', 'EXP reps using S1', 'EXP primary (pattern, net)'],
      inf.map((r) => [
        r.type,
        r.centre,
        usd(mean(r.values.CTRL.map((v) => v.value))),
        usd(mean(r.values.EXP.map((v) => v.value))),
        usd(r.d.mean),
        `${usd(r.d.unstratified.l90)} / ${usd(r.d.unstratified.u90)}`,
        `${r.values.EXP.filter((v) => v.representative && v.representative.stagedPattern !== 'off').length}/${r.values.EXP.length}`,
        r.pooled.EXP?.primary ? `${r.pooled.EXP.primary.stagedPattern}, ${usd(r.pooled.EXP.primary.centreNet)}` : 'none'
      ])
    );
  summary.selection = sels.map(({ c, s }) => ({ cutoff: c, primary: { mean: s.primary.mean, l90: s.primary.l90, u90: s.primary.u90, material: s.primary.material }, riskNonInferior: s.risk.nonInferior, mechanism: s.mechanism.confirmed }));
}

// ----- qualification census -----
const quals = cutoffKeys.filter((c) => exists(qualificationFile(c))).map((c) => ({ c, q: readSealed<{ members: number; requested: number; byRole: Record<string, number>; evidence: { stagedPattern: string; qualified: boolean; origins: { arm: string; role: string }[]; centre: { net: number } }[] }>(qualificationFile(c)) }));

if (quals.length)
  out.census = table(
    ['Cutoff', 'Members', 'Requested', 'By origin', 'Qualified (all)', 'Qualified ON', 'Best qualified net ON', 'Best qualified net OFF'],
    quals.map(({ c, q: x }) => {
      const qq = x.evidence.filter((e) => e.qualified);
      const on = qq.filter((e) => e.stagedPattern !== 'off');
      const off = qq.filter((e) => e.stagedPattern === 'off');

      return [c, x.members, num(x.requested), Object.entries(x.byRole).map(([k, v]) => `${k} ${v}`).join('; '), qq.length, on.length, usd(Math.max(...on.map((e) => e.centre.net), NaN)), usd(Math.max(...off.map((e) => e.centre.net), NaN))];
    })
  );

// ----- intervals -----
type IRow = { label: string; roles: { arm: string; kind: string }[]; stagedPattern: string; sliceNet: number; sliceDd: number; wholeNet: number; wholeDd: number; neighbourhood: { p90SliceDd: number; above35k: { share: number } }; years: Record<string, number> | unknown };
const ints = cutoffKeys.filter((c) => exists(intervalFile(c))).map((c) => ({ c, i: readSealed<{ rows: IRow[]; interval: [string, string] }>(intervalFile(c)) }));

if (ints.length) {
  const key = (r: IRow) => r.roles.map((x) => `${x.arm} ${x.kind}`).filter((x, i, a) => a.indexOf(x) === i);

  out.intervals = ints
    .map(({ c, i }) =>
      [
        `### ${c} → ${i.interval.join(' … ')}`,
        '',
        table(
          ['Subject', 'Roles', 'Pattern', 'Interval P&L', 'Interval DD (reset)', 'Nbhd p90 interval DD', 'Nbhd share > $35k', 'Whole-run net', 'Whole-run DD'],
          i.rows
            .filter((r) => r.roles.some((x) => x.kind !== 'lane representative' && x.kind !== 'representative all-OFF projection'))
            .map((r) => [r.label, key(r).join('; '), r.stagedPattern, usd(r.sliceNet), usd(r.sliceDd), usd(r.neighbourhood.p90SliceDd), pct(r.neighbourhood.above35k.share), usd(r.wholeNet), usd(r.wholeDd)])
        ),
        '',
        table(
          ['Arm', 'Lane representatives', 'Mean interval P&L', 'Median', 'Mean interval DD', 'Share with interval DD > $35k'],
          armKeys.map((a) => {
            const rs = i.rows.filter((r) => r.roles.some((x) => x.arm === a && x.kind === 'lane representative'));

            return [a, rs.length, usd(mean(rs.map((r) => r.sliceNet))), usd(q(rs.map((r) => r.sliceNet), 0.5)), usd(mean(rs.map((r) => r.sliceDd))), pct(rs.filter((r) => r.sliceDd > 35_000).length / Math.max(1, rs.length))];
          })
        )
      ].join('\n')
    )
    .join('\n\n');
}

// ----- decomposition and outcome -----
if (exists(decompositionFile)) {
  const d = readSealed<{ rows: { label: string; kind: string; id: string; droppedInvalid: string[] }[]; evidence: { id: string; centre: { net: number; dd: number }; qualified: boolean; envelope: { centre: { principalLossLiquidation: number; bankedDdLiquidation: number } } }[] }>(decompositionFile);

  out.decomposition = table(
    ['Row', 'Kind', 'D24 centre net', 'D24 marked DD', 'Principal loss (liq.)', 'Banked DD (liq.)', 'Qualified (P0)', 'Invalid books dropped'],
    d.rows.map((r) => {
      const e = d.evidence.find((x) => x.id === r.id)!;

      return [r.label, r.kind, usd(e.centre.net), usd(e.centre.dd), usd(e.envelope.centre.principalLossLiquidation), usd(e.envelope.centre.bankedDdLiquidation), e.qualified ? 'yes' : 'no', r.droppedInvalid.join(', ') || '—'];
    })
  );
}
if (exists(outcomeFile)) {
  const o = readSealed<{ label: { label: string; reason: string }; chronological: Record<ArmKey, { supported: boolean; sequentialNet: number | null; largestIntervalDd: number | null }>; intervalTests: { T1: Record<string, { pass: boolean | null }>; T2: Record<string, { u90: number; nonInferior: boolean }>; T3: Record<string, { mean: number; l90: number; u90: number }> } }>(outcomeFile);

  out.outcome = [
    `**Outcome label: ${o.label.label}** — ${o.label.reason}`,
    '',
    table(['Arm', 'Chronological check (study §9.3)', 'Σ fold-primary interval P&L', 'Largest interval DD'], armKeys.map((a) => [a, o.chronological[a].supported ? 'passed' : 'not passed', usd(o.chronological[a].sequentialNet), usd(o.chronological[a].largestIntervalDd)])),
    '',
    table(
      ['Cutoff', 'T1 EXP primary interval DD ≤ CTRL + $5k', 'T2 U90 paired rep. interval DD Δ', 'T2 non-inferior', 'T3 mean paired interval P&L Δ (L90 / U90)'],
      cutoffKeys.map((c) => [c, String(o.intervalTests.T1[c]?.pass ?? '—'), usd(o.intervalTests.T2[c]?.u90), o.intervalTests.T2[c]?.nonInferior ? 'yes' : 'no', `${usd(o.intervalTests.T3[c]?.mean)} (${usd(o.intervalTests.T3[c]?.l90)} / ${usd(o.intervalTests.T3[c]?.u90)})`])
    )
  ].join('\n');
  summary.outcome = o.label;
}
if (exists(informedFile)) summary.informedRequested = readSealed<{ requested: number }>(informedFile).requested;
summary.ledger = ledger();

fs.mkdirSync(tablesDir, { recursive: true });
for (const [k, v] of Object.entries(out)) fs.writeFileSync(path.join(tablesDir, `${k}.md`), `${v}\n`);
writeJson(path.join(resultsDir, 'analysis', 'summary.json'), { kind: 'Priority 4 analysis summary (derived from sealed records; no evaluation)', t: new Date().toISOString(), ...summary });
console.log(`analyze: ${Object.keys(out).length} tables → ${path.relative(process.cwd(), tablesDir)}; cutoffs with selection: ${sels.map((s) => s.c).join(', ') || 'none'}`);

