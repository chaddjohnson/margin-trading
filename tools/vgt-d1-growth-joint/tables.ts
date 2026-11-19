// Markdown tables from the sealed records of vgt-d1-growth-joint (report helper; reads only, never writes a record).
//
//   node --experimental-transform-types tools/vgt-d1-growth-joint/tables.ts [resultsDir] [outDir]
import fs from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped JSON records
type Rec = Record<string, any>;
const root = path.resolve(import.meta.dirname, '../..');
const results = path.resolve(process.argv[2] ?? path.join(root, 'research/vgt-d1-growth-joint/results'));
const outDir = path.resolve(process.argv[3] ?? path.join(results, 'tables'));
const read = (f: string) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const usd = (x: unknown) =>
  typeof x !== 'number' || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const k = (x: unknown) =>
  typeof x !== 'number' || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}$${(Math.abs(x) / 1000).toFixed(1)}k`;
const pct = (x: unknown, d = 1) => (typeof x === 'number' && Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—');
const n = (x: unknown) =>
  typeof x === 'number' ? x.toLocaleString('en-US') : x === undefined || x === null ? '—' : String(x);
const table = (head: string[], rows: unknown[][]) =>
  `| ${head.join(' | ')} |\n|${head.map((h, i) => (i === 0 ? '---' : '---:')).join('|')}|\n${rows.map((r) => `| ${r.map((c) => String(c ?? '—')).join(' | ')} |`).join('\n')}\n`;

fs.mkdirSync(outDir, { recursive: true });

const cutoffs = ['C19', 'C21', 'C23', 'C24', 'P18'];
let coverage = '# Search coverage and attrition (sealed search records)\n\n';

for (const c of cutoffs) {
  const s = read(path.join(results, 'search', c, 'search.json'));

  if (!s) continue;
  coverage += `## ${c} (door ${s.door}; ${s.schedule} budgets; ${n(s.evaluations.fresh)} fresh evaluations, ${s.minutes} min)\n\n`;
  coverage += table(
    [
      'lane',
      'screened',
      'plausible',
      'promoted',
      'rung-1 centres',
      'feasible',
      'islands (stop)',
      'island proposals',
      'r2 feas.',
      'r3 feas.',
      'refine moves',
      'shortlist'
    ],
    s.lanes.map(
      (l: { key: string; counts: Record<string, number>; islands: { stop: string; newConfigs: number }[] }) => [
        l.key,
        n(l.counts.screened ?? l.counts.localDesigns),
        n(l.counts.plausible),
        n(l.counts.promoted),
        n(l.counts.r1Centres),
        n(l.counts.r1Feasible),
        `${l.islands.length} (${l.islands.map((i) => i.stop).join(', ')})`,
        n(l.islands.reduce((a, i) => a + i.newConfigs, 0)),
        `${n(l.counts.r2Feasible)}/${n(l.counts.r2)}`,
        `${n(l.counts.r3Feasible)}/${n(l.counts.r3)}`,
        n(l.counts.refineMoves),
        n(l.counts.shortlist)
      ]
    )
  );
  coverage += '\nScreen by structural class (screened / plausible / promoted):\n\n';
  coverage += table(
    ['class', 'screened', 'plausible', 'promoted'],
    s.lanes.flatMap((l: { byClass: Record<string, { screened: number; plausible: number; promoted: number }> }) =>
      Object.entries(l.byClass).map(([cls, v]) => [cls, v.screened, v.plausible, v.promoted])
    )
  );
  coverage += '\n';
}

fs.writeFileSync(path.join(outDir, 'coverage.md'), coverage);

for (const c of cutoffs) {
  const q = read(path.join(results, 'folds', c, 'selection.json'));

  if (!q) continue;

  let md = `# ${c} qualification and selection (training door ${q.door})\n\n${q.selection.reason}. Primary: **${q.selection.primary ?? 'none'}**.\n\n`;

  md += table(
    ['role', 'member'],
    Object.entries(q.selection.roles).map(([r, l]) => [r, l ?? '—'])
  );
  md += `\nOptimized single-family controls: D1 alone ${q.singleFamily.d1only.primary ?? '—'}; Growth alone ${q.singleFamily.gonly.primary ?? '—'}.\n\n`;
  md += table(
    [
      'member',
      'cell',
      'part.',
      'net',
      'DD',
      'sel. robust',
      'sel. p90 DD',
      'conf. median',
      'conf. p10',
      'conf. p90 DD',
      'breach',
      'worst DD',
      'D1 lots / booked',
      'G lots / booked',
      'D1 causal',
      'G causal',
      'gates'
    ],
    q.evidence.map((e: Rec) => [
      e.label,
      e.cell,
      e.participation,
      usd(e.centre.net),
      usd(e.centre.dd),
      usd(e.select.robust),
      usd(e.select.p90Dd),
      usd(e.confirm.median),
      usd(e.confirm.p10),
      usd(e.confirm.p90Dd),
      pct(e.confirm.breachShare),
      usd(e.confirm.worstDd),
      `${e.centre.fam.D1.lots} / ${k(e.centre.fam.D1.booked)}`,
      `${e.centre.fam.G.lots} / ${k(e.centre.fam.G.booked)}`,
      e.removal.withoutD1 ? k(e.centre.net - e.removal.withoutD1.net) : '—',
      e.removal.withoutG ? k(e.centre.net - e.removal.withoutG.net) : '—',
      e.qualified ? 'pass' : `fail ${e.failed.join(',')}`
    ])
  );
  md += '\nStresses (centre net / DD):\n\n';
  md += table(
    ['member', '10 bps', '20 bps', '14% interest', '+25 bps stops', 'next-open stops'],
    q.evidence.map((e: Rec) => [
      e.label,
      ...['cost 10 bps', 'cost 20 bps', 'interest 14%', 'stop slippage +25 bps', 'next-open stops'].map((s) =>
        e.stress[s] ? `${k(e.stress[s].net)} / ${k(e.stress[s].dd)}` : 'n/a'
      )
    ])
  );
  fs.writeFileSync(path.join(outDir, `qualify-${c}.md`), md);
}

let folds = '# Chronological folds\n\n';

for (const c of ['C19', 'C21', 'C23', 'P18']) {
  const e = read(path.join(results, 'folds', c, 'evaluation.json'));

  if (!e) continue;
  folds += `## ${c}: slice ${e.slice[0]} → ${e.slice[1]} (door ${e.door}); primary ${e.primary ?? 'none (fallback: flat)'}\n\n`;
  folds += table(
    ['configuration', 'role', 'slice P&L', 'slice DD (reset)', 'whole-run net', 'whole-run DD'],
    e.rows.map((r: Rec) => [r.label, r.role, usd(r.sliceNet), usd(r.sliceDd), usd(r.wholeNet), usd(r.wholeDd)])
  );
  folds += '\n';
}

const seq = read(path.join(results, 'folds', 'sequential.json'));

if (seq) {
  folds += `## Sequential policies 2020–2024\n\nVerdict: **${seq.verdict}**\n\n`;
  folds += table(
    ['policy', '2020–21', '2022–23', '2024', 'charges', 'net', 'sequential DD', 'DD peak → trough'],
    seq.policies.map((p: Rec) => [
      p.name,
      ...p.parts.map((x: Rec) => (x.label ? usd(x.sliceNet) : 'flat')),
      usd(p.charges),
      usd(p.net),
      usd(p.sequentialDd),
      `${p.ddPeak} → ${p.ddTrough}`
    ])
  );
}

fs.writeFileSync(path.join(outDir, 'folds.md'), folds);

const diag = read(path.join(results, 'diagnostics', 'D24', 'diagnostics.json'));

if (diag) {
  let md = '# Development diagnostics (D24, report-only)\n\n';

  md += table(
    [
      'subject',
      'role',
      'net',
      'realized',
      'unrealized',
      'DD',
      'DD peak → trough',
      'lots (W/L)',
      'D1 / G lots',
      'interest',
      'costs',
      'peak principal',
      'peak market value',
      'sessions held / both'
    ],
    diag.subjects.map((s: Rec) => [
      s.label,
      s.role,
      usd(s.record.net),
      usd(s.record.realized),
      usd(s.record.unrealized),
      usd(s.record.dd),
      `${s.ddPeak} → ${s.ddTrough}`,
      `${s.record.lots} (${s.record.wins}/${s.record.losses})`,
      `${s.record.fam.D1.lots} / ${s.record.fam.G.lots}`,
      usd(s.record.interest),
      usd(s.record.costs),
      usd(s.exposure.peakPrincipal),
      usd(s.exposure.peakMarketValue),
      `${s.exposure.sessionsHeld} / ${s.exposure.sessionsBoth}`
    ])
  );

  if (diag.ablations) {
    md += '\n## Ablations and sensitivities of the primary\n\n';
    md += table(
      ['variant', 'net', 'Δ', 'DD', 'D1 / G lots', 'D1 / G booked', 'minimum binds'],
      diag.ablations.map((a: Rec) => [
        a.name,
        usd(a.net),
        usd(a.delta),
        usd(a.dd),
        `${a.d1Lots} / ${a.gLots}`,
        `${k(a.d1Booked)} / ${k(a.gBooked)}`,
        a.minimumBinds
      ])
    );
    md += '\n## The allocation grid at the primary trading parameters\n\n';
    md += table(
      ['arch', 'first', 'D1 target', 'G target', 'net', 'DD', 'D1 / G lots'],
      diag.allocationGrid.map((g: Rec) => [
        g.arch,
        g.first,
        g.d1Target ?? '—',
        g.gTarget ?? '—',
        usd(g.net),
        usd(g.dd),
        `${g.d1Lots} / ${g.gLots}`
      ])
    );
  }

  if (diag.matched) {
    md += '\n## Matched trades (primary − other)\n\n';
    md += table(
      ['other', 'Δ net', 'unchanged', 'resized', 'retimed exit', 'retimed', 'newly admitted', 'displaced'],
      diag.matched.map((m: Rec) => [
        m.y,
        usd(m.delta),
        ...['unchanged', 'resized', 'retimed exit', 'retimed', 'newly admitted', 'displaced'].map(
          (x) => `${m.summary[x].lots} (${k(m.summary[x].delta)})`
        )
      ])
    );
  }

  fs.writeFileSync(path.join(outDir, 'diagnostics.md'), md);
}

const val = read(path.join(results, 'validation', 'validation.json'));

if (val) {
  let md = `# Validation (FULL once; ${val.label})\n\nPrimary: ${val.primary ?? 'none'}. Tests: ${JSON.stringify({ V1: val.tests?.V1, V2: val.tests?.V2, V3: val.tests?.V3 })}; V5 median ${usd(val.V5)}.\n\n`;

  md += table(
    [
      'configuration',
      'role',
      '2025–26 P&L',
      '2025',
      '2026',
      'validation DD (reset)',
      'whole-run net',
      'whole-run DD',
      'DD peak → trough',
      'lots after 2024'
    ],
    val.rows.map((r: Rec) => [
      r.label,
      r.role,
      usd(r.validationNet),
      usd(r.y2025),
      usd(r.y2026),
      usd(r.validationDd),
      usd(r.wholeNet),
      usd(r.wholeDd),
      `${r.wholeDdPeak} → ${r.wholeDdTrough}`,
      r.lotsAfter
    ])
  );
  fs.writeFileSync(path.join(outDir, 'validation.md'), md);
}

console.log(`tables written to ${path.relative(root, outDir)}`);
