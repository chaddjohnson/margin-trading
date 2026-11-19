// Report tables of Priority 5B (vg-lifecycle-matched-optimization): Markdown tables and machine-readable summaries
// written into <out>/tables/ from the sealed records (decoded with the store's non-finite encoding). Outside the study's
// pinned code; reads only, never evaluates. No charts (standard 2.0.0 §7.7).
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-lifecycle-matched-optimization/tables.ts [--pilot NAME]
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { decompose, withinSearchVariability, concentratedInEpisode } from '../../src/vg-lifecycle-matched-optimization/labels.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const pilot = args.includes('--pilot') ? args[args.indexOf('--pilot') + 1]! : null;
const out = pilot
  ? path.join(repo, '.cache/vg-lifecycle-matched-optimization/pilot', pilot)
  : path.join(repo, 'research/vg-lifecycle-matched-optimization/results');
const tablesDir = path.join(out, 'tables');
const folds = pilot ? [] : ['C19', 'C21', 'C23'];
const fin = pilot ? 'P18' : 'C24';
const modes = ['L0', 'L1', 'L2'] as const;
type Mode = (typeof modes)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
const read = (rel: string): Any | null => {
  const f = path.join(out, rel);

  return fs.existsSync(f) ? decode(fs.readFileSync(f, 'utf8')) : null;
};
const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(d)}%`);
const n0 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Math.round(x).toLocaleString('en-US'));
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((h) => (/^[A-Za-z]/.test(h) && !/net|DD|P&L|\$|share|lots|n$/i.test(h) ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const files: Record<string, string> = {};
const write = (name: string, text: string) => {
  files[name] = text;
};
const short = (label: string | null | undefined) => (label ?? '—').replace(/^(C\d\d|P18)\//, '');

// ----- search and compute -----

const searchRows: string[][] = [];
const coverRows: string[][] = [];
const extRows: string[][] = [];
const compute: Record<string, Any> = {};

for (const [cut, arm] of [...folds.map((c) => [c, 'indep']), [fin, 'indep'], [fin, 'informed']] as [string, string][]) {
  const s = read(`search/${cut}/${arm}.json`);

  if (!s) continue;
  compute[`search ${cut} ${arm}`] = { unique: s.compute.unique, freshAllRuns: s.compute.freshAllRuns, hits: s.compute.archiveHits, minutes: s.minutes, peakCgroup: s.peaks.cgroup, cap: s.cap };
  for (const mode of modes) {
    const lanes = s.lanes.filter((l: Any) => l.mode === mode);
    const sum = (k: string) => lanes.reduce((a: number, l: Any) => a + (l.counts[k] ?? 0), 0);

    searchRows.push([
      cut,
      arm,
      mode,
      n0(sum('screened')),
      n0(sum('seedDesigns')),
      n0(sum('islandConfigs')),
      n0(sum('fillers')),
      n0(sum('screened') + sum('seedDesigns') + sum('islandConfigs') + sum('fillers')),
      n0(sum('refineMoves')),
      n0(lanes.reduce((a: number, l: Any) => a + l.requested, 0)),
      n0(sum('r1Centres')),
      n0(sum('r1Feasible')),
      n0(lanes.reduce((a: number, l: Any) => a + l.ledgers.feasible, 0)),
      n0(sum('distinctCentres')),
      n0(sum('islandsRun')),
      [...new Set(lanes.map((l: Any) => l.extension.stop))].join('; ')
    ]);
    for (const l of lanes)
      for (const [inc, v] of Object.entries(l.byInc as Record<string, Any>))
        coverRows.push([cut, arm, mode, `R${l.replicate}`, l.cell ?? 'informed', inc, n0(v.centres), n0(v.plausible), n0(v.feasible), n0(v.bothFunded)]);
  }
  for (const r of s.extensionRounds)
    extRows.push([cut, arm, String(r.round), r.positions.map((p: Any) => `${p.position.replace(/^(C\d\d|P18)\//, '')}: ${modes.map((m) => (p.fired[m] ? m : '')).filter(Boolean).join('+') || 'none'}${p.extended ? ' → +1' : p.atCap ? ' (cap)' : ''}`).join('; '), n0(r.requestedBefore), r.decision]);
}

write(
  'search.md',
  [
    '# Search coverage and counts (per arm; distinct proposals = screen + designs + island children + fillers)',
    '',
    table(['Cutoff', 'Lane', 'Arm', 'Screened', 'Designs', 'Island', 'Fillers', 'Proposals', 'Refine moves', 'Evaluations asked', 'Rung-1 centres', 'Rung-1 feasible', 'Feasible ledgers', 'Distinct configs', 'Islands run', 'Stop'], searchRows),
    '',
    '## Synchronized extension rounds (positions whose lifecycles fired; a fired position extends in all three arms)',
    '',
    table(['Cutoff', 'Lane', 'Round', 'Positions', 'Requested before', 'Decision'], extRows),
    '',
    '## Coverage by structure (rung-1 archive per lane)',
    '',
    table(['Cutoff', 'Lane', 'Arm', 'Rep', 'Cell', 'Inclusion', 'Centres', 'Plausible', 'Feasible', 'Both Growth funded'], coverRows)
  ].join('\n')
);

// ----- selections -----

const evidenceOf = (sel: Any, label: string | null) => (label ? sel.evidence.find((e: Any) => e.label === label) : null);
const roleTable = (sel: Any, cut: string) => {
  const rows: string[][] = [];

  for (const [set, r] of Object.entries(sel.roles as Record<string, Any>))
    rows.push([set, `${r.qualified}/${r.members}`, short(r.roles['actual-profit']), short(r.roles['robust-profit']), short(r.roles.balanced), short(r.roles['lower-drawdown'])]);
  return `## ${cut} roles per set\n\n${table(['Set', 'Qualified', 'Actual-profit', 'Robust-profit', 'Balanced', 'Lower-drawdown'], rows)}`;
};
const evRow = (e: Any) => [
  short(e.label),
  e.mode,
  e.inc,
  e.entries,
  usd(e.centre.net),
  usd(e.centre.dd),
  String(e.centre.lots),
  usd(e.select.robust),
  usd(e.select.p90Dd),
  usd(e.confirm.median),
  usd(e.confirm.p10),
  usd(e.confirm.p90Dd),
  usd(e.confirmTail.p95Dd),
  usd(e.confirmTail.worst10Mean),
  usd(e.confirm.worstDd),
  `${pct(e.confirm.breachShare)} [${pct(e.confirmTail.breachInterval[0])}, ${pct(e.confirmTail.breachInterval[1])}]`,
  usd(e.confirm.meanExcess),
  e.qualified ? 'yes' : `no (${e.failed.join(',')})`,
  e.familyParticipation,
  Object.entries(e.participation as Record<string, string>)
    .filter(([, v]) => v !== 'disabled')
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')
];
const evHead = ['Member', 'Arm', 'Inc', 'Entries', 'Centre net', 'Centre DD', 'Lots', 'Sel. robust', 'Sel. p90 DD', 'Conf. median', 'Conf. p10', 'Conf. p90 DD', 'p95 DD', 'Worst-10% mean', 'Worst DD', '> $35k [Wilson 95%]', 'Mean excess', 'Qualified', 'Family', 'Components'];
const selections: Record<string, Any> = {};

for (const cut of [...folds, fin]) {
  const sel = read(`folds/${cut}/selection.json`);

  if (!sel) continue;
  selections[cut] = sel;
  compute[`qualify ${cut}`] = { unique: sel.compute.unique, freshAllRuns: sel.compute.freshAllRuns };

  const prim = modes.flatMap((m) =>
    [...new Set([sel.primary[m], sel.independentPrimary[m], sel.roles[`${m}/independent R1`]?.roles['actual-profit'], sel.roles[`${m}/independent R2`]?.roles['actual-profit']].filter(Boolean))].map((l) => evidenceOf(sel, l))
  );
  const ctl = sel.evidence.filter((e: Any) => e.kind === 'control' || e.kind === 'd1-only');

  write(
    `selection-${cut}.md`,
    [
      `# ${cut} selection (development, training door ${sel.door})`,
      '',
      `Primaries: ${modes.map((m) => `${m} ${short(sel.primary[m])} (independent ${short(sel.independentPrimary[m])})`).join('; ')}`,
      '',
      '## Primaries, independent primaries and seed-level (replicate) actual-profit holders',
      '',
      table(evHead, prim.map(evRow)),
      ...(ctl.length ? ['', '## Controls under each lifecycle', '', table(evHead, ctl.map(evRow))] : []),
      '',
      roleTable(sel, cut),
      '',
      '## Near misses (fail only Q3, Q4 or Q5)',
      '',
      table(['Member', 'Arm', 'Failed', 'Severity', 'Centre net', 'Centre DD'], sel.nearMisses.map((x: Any) => [short(x.label), x.mode, x.failed.join(','), JSON.stringify(x.severity), usd(x.net), usd(x.dd)])),
      '',
      '## Every member',
      '',
      table(evHead, sel.evidence.map(evRow))
    ].join('\n')
  );
}

// ----- folds and sequential -----

const foldRows: string[][] = [];

for (const cut of folds.length ? folds : [fin]) {
  const ev = read(`folds/${cut}/evaluation.json`);

  if (!ev) continue;
  for (const r of ev.rows)
    foldRows.push([cut, short(r.label), r.exportedBy ?? 'control', r.mode, r.own ? 'own' : 'cross', r.role, usd(r.boundaryEquity), usd(r.sliceNet), usd(r.sliceDd), r.openAtBoundary.join('+') || '—', r.openAtEnd.join('+') || '—']);
}

const seq = read('folds/sequential.json');
const seqRows: string[][] = [];

if (seq)
  for (const a of seq.arms)
    for (const p of a.policies)
      seqRows.push([p.name, ...p.parts.map((x: Any) => `${short(x.label)}: ${usd(x.sliceNet)} / DD ${usd(x.sliceDd)}`).concat(Array(Math.max(0, 3 - p.parts.length)).fill('')), usd(p.charges), usd(p.net), usd(p.sequentialDd), `${p.ddPeak} → ${p.ddTrough}`, p.withinCeiling ? 'yes' : 'no']);

write(
  'folds.md',
  [
    '# Chronological procedure tests (independent lanes; each arm its own continuous path)',
    '',
    seq ? table(['Arm', 'Verdict', 'Sequential net', 'Sequential DD'], seq.arms.map((a: Any) => [a.mode, a.verdict, usd(a.procedure.net), usd(a.procedure.sequentialDd)])) : '',
    '',
    '## Sequential policies',
    '',
    table(['Policy', 'Slice 1', 'Slice 2', 'Slice 3', 'Switch charges', 'Net', 'Sequential DD', 'Peak → trough', '≤ $35k'], seqRows),
    '',
    '## Fold evaluation rows (own = the phenotype under the lifecycle that exported it; cross = report-only)',
    '',
    table(['Fold', 'Phenotype', 'Exported by', 'Run under', 'Row', 'Roles', 'Training net (boundary)', 'Slice P&L', 'Slice DD (reset)', 'Open at boundary', 'Open at end'], foldRows)
  ].join('\n')
);

// ----- cross-test matrix and decomposition -----

const xt = (cut: string) => read(`crosstest/${cut}/matrix.json`);
const crossMd: string[] = ['# Cross-test matrix (each row one exact phenotype; columns L0 / L1 / L2; training door; report-only)', ''];
const decomp: Record<string, Any> = {};

for (const cut of [...folds, fin]) {
  const m = xt(cut);
  const sel = selections[cut];

  if (!m || !sel) continue;
  compute[`cross-test ${cut}`] = { unique: m.compute.unique, freshAllRuns: m.compute.freshAllRuns };
  crossMd.push(`## ${cut}`, '');
  crossMd.push(
    table(
      ['Row', 'Exported by (roles)', 'Control', ...modes.flatMap((md) => [`${md} net`, `${md} DD`, `${md} lots (G)`]), ...modes.map((md) => `${md} conf. median / p10 / p90 DD`)],
      m.rows.map((r: Any) => [
        r.row,
        r.exportedBy.map((b: Any) => `${b.mode}: ${short(b.label)} [${b.roles.join(', ')}]`).join('<br>') || '—',
        r.control ?? '—',
        ...modes.flatMap((md) => {
          const c = r.columns[md].centre;

          return [usd(c.net), usd(c.dd), `${c.lots} (${(c.books['G:GDX']?.lots ?? 0) + (c.books['G:VGT']?.lots ?? 0)})`];
        }),
        ...modes.map((md) => {
          const c = r.columns[md].confirm;

          return c ? `${usd(c.nb.median)} / ${usd(c.nb.p10)} / ${usd(c.nb.p90Dd)}` : '—';
        })
      ])
    ),
    ''
  );

  // decomposition for X ∈ {L1, L2} against L0 with each arm's primary (and independent primary)
  const rowOf = (label: string | null) => (label ? m.rows.find((r: Any) => r.exportedBy.some((b: Any) => b.label === label)) : null);
  const rows: string[][] = [];

  for (const kind of ['primary', 'independentPrimary'] as const) {
    const p0 = rowOf(sel[kind].L0);

    for (const X of ['L1', 'L2'] as const) {
      const pX = rowOf(sel[kind][X]);

      if (!p0 || !pX) continue;

      const cells = (f: (c: Any) => number) => ({ p0L0: f(p0.columns.L0), p0X: f(p0.columns[X]), pXL0: f(pX.columns.L0), pXX: f(pX.columns[X]) });
      const centre = decompose(cells((c) => c.centre.net) as Any);
      const med = p0.columns.L0.confirm && pX.columns.L0.confirm ? decompose(cells((c) => c.confirm?.nb.median ?? NaN) as Any) : null;
      const bo = cells((c) => c.withoutLeadingEpisode?.net ?? NaN);
      const totalBo = bo.pXX - bo.p0L0;
      const spreads = [X, 'L0'].map((md) => {
        const r1 = evidenceOf(sel, sel.roles[`${md}/independent R1`]?.roles['actual-profit'] ?? null)?.centre.net ?? NaN;
        const r2 = evidenceOf(sel, sel.roles[`${md}/independent R2`]?.roles['actual-profit'] ?? null)?.centre.net ?? NaN;

        return Math.abs(r1 - r2);
      });
      const key = `${cut} ${kind} ${X}`;

      decomp[key] = { centre, median: med, totalWithoutLeadingEpisodes: Number.isFinite(totalBo) ? Math.round(totalBo * 100) / 100 : null, spreads, withinSearchVariability: withinSearchVariability(centre.total, spreads), concentratedInEpisode: Number.isFinite(totalBo) ? concentratedInEpisode(centre.total, totalBo) : null, same: p0.row === pX.row };
      rows.push([cut, kind === 'primary' ? 'primary' : 'independent primary', `${X} vs L0`, p0.row === pX.row ? `${p0.row} (same phenotype)` : `${p0.row} → ${pX.row}`, usd(centre.total), usd(centre.lifecycle), usd(centre.phenotype), usd(centre.interaction), centre.driver, med ? `${usd(med.total)} (${usd(med.lifecycle)} / ${usd(med.phenotype)} / ${usd(med.interaction)})` : '—', spreads.map((x) => usd(x)).join(' / '), decomp[key].withinSearchVariability ? 'yes' : 'no', Number.isFinite(totalBo) ? usd(totalBo) : '—', decomp[key].concentratedInEpisode === null ? '—' : decomp[key].concentratedInEpisode ? 'yes' : 'no']);
    }
  }

  crossMd.push(`### ${cut} decomposition (centre net; confirmation medians in brackets)`, '', table(['Cutoff', 'Pair', 'Comparison', 'Rows (L0 → X)', 'Total', 'Lifecycle', 'Phenotype', 'Interaction', 'Driver', 'Median total (lifecycle / phenotype / interaction)', 'Replicate spreads X / L0', 'Within search variability', 'Total without leading episodes', 'Concentrated in one episode'], rows), '');
}

write('crosstest.md', crossMd.join('\n'));

// ----- frozen labels, diagnostics, validation -----

const fz = read(pilot ? 'FROZEN_SELECTION.json' : '../FROZEN_SELECTION.json');

if (fz)
  write(
    'labels.md',
    [
      '# Frozen evidence labels (development and folds only; computed before the validation door opened)',
      '',
      table(
        ['Arm vs L0', 'Dev', 'Chron', 'Risk', 'Label', 'Primary net X / L0', 'Replicate bests X / L0', 'Conf. p10 X / L0', 'Conf. p90 DD X / L0', 'Sequential X / L0'],
        Object.entries(fz.evidenceLabels as Record<string, Any>).map(([X, l]) => [
          X,
          l.dev,
          l.chron,
          l.risk,
          `**${l.label}**`,
          `${usd(l.evidence.finalPrimary?.net)} / ${usd(l.l0.finalPrimary?.net)}`,
          `${l.evidence.replicateBest.map(usd).join(', ')} / ${l.l0.replicateBest.map(usd).join(', ')}`,
          `${usd(l.evidence.finalPrimary?.confirmP10)} / ${usd(l.l0.finalPrimary?.confirmP10)}`,
          `${usd(l.evidence.finalPrimary?.confirmP90Dd)} / ${usd(l.l0.finalPrimary?.confirmP90Dd)}`,
          `${l.evidence.sequential.verdict} ${usd(l.evidence.sequential.net)} (DD ${usd(l.evidence.sequential.dd)}) / ${l.l0.sequential.verdict} ${usd(l.l0.sequential.net)} (DD ${usd(l.l0.sequential.dd)})`
        ])
      )
    ].join('\n')
  );

const dg = read('diagnostics/diagnostics.json');

if (dg) {
  const rows = dg.mechanism.map((x: Any) => {
    const b = x.summary.books as Record<string, Any>;
    const g = Object.entries(b)
      .map(([k, v]) => `${k}: req ${v.records} (granted ${v.granted}, refused ${v.refused}, waiting ${v.waiting}) lots ${v.lots} booked ${usd(v.booked)}${Object.keys(v.retained).length ? ` retained ${JSON.stringify(v.retained)} waits ${v.retainedWaits}` : ''}${v.virtualHolds.trades ? ` virtual holds ${v.virtualHolds.trades} (${v.virtualHolds.closes} closes, ${v.virtualHolds.idleCloses} idle)` : ''}`)
      .join('<br>');
    const occ = Object.entries(x.refusalsByOccupant as Record<string, Any>)
      .map(([k, v]) => `${k} ← ${Object.entries(v).map(([o, c]) => `${o} ${c}`).join(', ')}`)
      .join('<br>');
    const vs = x.versusSamePhenotypeL0;

    return [short(x.label), x.role, x.mode, usd(x.record.net), usd(x.record.dd), String(x.record.lots), `${x.summary.pool.held}/${x.summary.pool.reservedOnly}/${x.summary.pool.idle}`, g || '—', occ || '—', vs ? `+${vs.added?.length ?? vs.newlyAdmitted?.length ?? '?'} / −${vs.displaced?.length ?? '?'}` : '—', String(x.rounds)];
  });
  const ep = dg.episodeDependence.map((e: Any) => [e.cutoff, e.mode, e.role, short(e.label), e.centreLeadingEpisode ? `${e.centreLeadingEpisode.first} → ${e.centreLeadingEpisode.last} (${usd(e.centreLeadingEpisode.net)}, ${pct(e.centreLeadingEpisode.shareOfCentreNet, 0)} of net)` : '—', pct(e.overlapShare, 0), e.inWindowShare ? `${pct(e.inWindowShare.median, 0)} [${pct(e.inWindowShare.p10, 0)}, ${pct(e.inWindowShare.p90, 0)}]` : '—', String(e.neighboursWithNetAtMostZero), `${e.selectionFamily.distinctLedgers}/${e.selectionFamily.n}`, String(e.clippedDraws)]);

  write(
    'diagnostics.md',
    [
      '# Mechanism (D24, every subject under every lifecycle; report-only)',
      '',
      table(['Subject', 'Role', 'Arm', 'Net', 'DD', 'Lots', 'Closes held / reserved / idle', 'Growth books', 'Refusals by occupant', 'vs same phenotype under L0 (lots)', 'Fixed-point rounds'], rows),
      '',
      '# Episode dependence of the principal neighbourhoods (selection rep 1, own lifecycle)',
      '',
      table(['Cutoff', 'Arm', 'Role', 'Holder', 'Centre leading episode', 'Neighbours overlapping it', 'Neighbour net share inside it: median [p10, p90]', 'Neighbours with net ≤ 0', 'Distinct ledgers (selection)', 'Clipped draws'], ep)
    ].join('\n')
  );
}

const val = read('validation/validation.json');

if (val) {
  const rows = val.rows.map((r: Any) => [r.row, r.control ?? r.exportedBy.map((b: Any) => `${b.mode}: ${short(b.label)}`).join('<br>'), r.mode, r.own ? 'own' : r.control ? 'control' : 'cross', usd(r.developmentNet), usd(r.validationPnl), usd(r.validationDd), usd(r.fullNet), `${usd(r.fullRealized)} / ${usd(r.fullUnrealized)}`, usd(r.wholeDd), `${usd(r.years['2025'])} / ${usd(r.years['2026'])}`, r.lotsAfterBoundary.length, r.openAtEnd.map((o: Any) => `${o.book} ${usd(o.unrealized)}`).join(', ') || '—', `${r.tests.V1 ? '✓' : '✗'}${r.tests.V2 ? '✓' : '✗'}${r.tests.V3 ? '✓' : '✗'}`]);

  write(
    'validation.md',
    [
      `# Validation (FULL, once; boundary ${val.boundary}; previously examined history)`,
      '',
      table(['Row', 'Phenotype', 'Lifecycle', 'Kind', 'Development net', 'Validation P&L', 'Reset val. DD', 'Full net', 'Realized / open', 'Whole-run DD', '2025 / 2026', 'Lots after boundary', 'Open at end', 'V1 V2 V3'], rows),
      '',
      '## Known targets',
      '',
      '```json',
      JSON.stringify(val.knownTargets, null, 1),
      '```',
      '',
      '## Report-only perturbations on FULL',
      '',
      table(['Subject', 'Lifecycle', 'Median val. P&L', 'p10 val. P&L', 'Share positive', 'p90 val. DD', 'p90 whole-run DD', 'Draws > $35k'], (val.neighbourhoods.res as Any[]).map((x) => [x.label, x.mode, usd(x.medianValidationPnl), usd(x.p10ValidationPnl), pct(x.positiveShare), usd(x.p90ValidationDd), usd(x.p90WholeRunDd), `${x.wholeRunAbove35k}/${x.n}`])),
      '',
      table(['Subject', 'Lifecycle', 'Stress', 'Validation P&L', 'Val. DD', 'Full net', 'Whole DD'], (val.stresses as Any[]).flatMap((x) => Object.entries(x.stresses as Record<string, Any>).map(([k, v]) => [x.label, x.mode, k, usd(v.validationPnl), usd(v.validationDd), usd(v.fullNet), usd(v.wholeDd)])))
    ].join('\n')
  );
}

// ----- compute -----

const total = Object.values(compute).reduce((a: number, c: Any) => a + (c.unique ?? 0), 0);

write(
  'compute.md',
  [
    '# Compute (unique fresh simulations per job; archive hits apart)',
    '',
    table(['Job', 'Unique fresh', 'Fresh over all runs', 'Archive hits', 'Minutes', 'Peak cgroup', 'Cap'], Object.entries(compute).map(([k, c]) => [k, n0(c.unique), n0(c.freshAllRuns), n0(c.hits), c.minutes ?? '—', c.peakCgroup ? `${(c.peakCgroup / 2 ** 30).toFixed(1)} GiB` : '—', n0(c.cap)])),
    '',
    `Pool jobs total: ${n0(total)} unique fresh simulations (in-process fold, diagnostic and validation runs and the engineering stage are counted in their own records).`
  ].join('\n')
);

fs.mkdirSync(tablesDir, { recursive: true });
for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(tablesDir, name), `${text}\n`);
fs.writeFileSync(path.join(tablesDir, 'summary.json'), `${JSON.stringify({ compute, decomposition: decomp }, null, 1)}\n`);
console.log(`tables: ${Object.keys(files).length} files in ${path.relative(repo, tablesDir)}`);
