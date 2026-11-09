// Report tables for research/intraday-dip-recovery-vgt (report-only; reads the sealed records, writes Markdown and CSV;
// no visual artifact). Run from the repository root:
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/intraday-dip-recovery/tables.ts
// The sealed records are read as untyped JSON (their writers are typed in src/intraday-dip-recovery/).
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'node:fs';
import path from 'node:path';

const S = 'research/intraday-dip-recovery-vgt';
const R = (...p: string[]) => path.join(S, 'results', ...p);
const read = (f: string) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const $ = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '–'
    : `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const n = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '–'
    : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined || !Number.isFinite(v) ? '–' : `${(v * 100).toFixed(d)}%`;
const numeric = /^(−?\$?[\d,]+(\.\d+)?%?|–|\+\d+\/−\d+)$/;
const table = (head: string[], rows: (string | number)[][]) => {
  const align = head.map((_h, i) =>
    rows.length && rows.every((r) => numeric.test(String(r[i] ?? '–'))) ? '---:' : '---'
  );

  return `| ${head.join(' | ')} |\n|${align.join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;
};
const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const s = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return `${cols.join(',')}\n${rows.map((r) => cols.map((c) => cell(r[c])).join(',')).join('\n')}\n`;
};
const out: string[] = [];
const csvs: Record<string, Record<string, unknown>[]> = {};
const h = (t: string) => out.push(`\n## ${t}\n`);
const p = (t: string) => out.push(t);

out.push('# Report tables — short-term VGT dip recovery, Phase 1\n');
out.push(
  'Generated from the sealed records by `tools/intraday-dip-recovery/tables.ts` (Markdown and CSV only). Money is net of 5 bps per side and 11% interest unless a row says otherwise; DD = maximum minute-marked drawdown in dollars (÷ $100,000 for %). Development = 2016-01-04 → 2024-12-31 (arming from 2016-02-01).\n'
);

// ---- search coverage --------------------------------------------------------------------------------------------
const cutoffs = ['C19', 'C21', 'C23', 'C24'];
const searchRows: Record<string, unknown>[] = [];
const cellRows: Record<string, unknown>[] = [];
const islandRows: Record<string, unknown>[] = [];

for (const c of cutoffs)
  for (const lane of ['indep', 'informed', 'explore2'])
    for (const f of ['F1', 'F2', 'F3', 'F4']) {
      const r = read(R('search', c, `${lane}-${f}.json`));
      if (!r) continue;
      const k = r.counts;
      searchRows.push({
        cutoff: c,
        lane,
        family: f,
        proposals: k.distinctProposals,
        evaluations: r.counters.requested,
        fresh: r.counters.fresh,
        hits: r.counters.hits,
        screened: k.screened,
        plausible: k.plausible,
        promoted: k.promoted,
        r1Fitted: k.r1Fitted,
        r1Feasible: k.r1Feasible,
        r1Ledgers: k.r1DistinctLedgers,
        r1ZeroTrade: k.r1ZeroTrade,
        r2Fitted: k.r2Fitted,
        r2Feasible: k.r2Feasible,
        r3Fitted: k.r3Fitted,
        r3Feasible: k.r3Feasible,
        r3FeasibleLedgers: k.r3FeasibleLedgers,
        shortlist: k.shortlist,
        islands: r.islands.length,
        extensionStop: r.extensionStop,
        seconds: Math.round(r.elapsedSeconds),
        centres: Object.values(r.stages as Record<string, { centres: number }>).reduce((t, s) => t + s.centres, 0),
        neighbours: Object.values(r.stages as Record<string, { neighbours: number }>).reduce(
          (t, s) => t + s.neighbours,
          0
        )
      });
      for (const cv of r.coverage) cellRows.push({ cutoff: c, lane, family: f, ...cv });
      for (const i of r.islands)
        islandRows.push({
          cutoff: c,
          lane,
          family: f,
          island: i.island,
          extension: i.extension,
          generations: i.generations,
          proposals: i.proposals,
          evaluations: i.evaluations,
          stop: i.stop,
          hvBefore: i.hvBefore,
          hvAfter: i.hvAfter,
          hvGainPer10k: i.hvGainPer10k,
          netBefore: i.netBefore,
          netAfter: i.netAfter,
          robustAfter: i.robustAfter,
          newFeasibleCells: (i.newFeasibleCells ?? []).join(' ')
        });
    }

csvs['search_coverage.csv'] = searchRows;
csvs['search_cells.csv'] = cellRows;
csvs['search_islands.csv'] = islandRows;
h('1. Search coverage and budgets (both units)');
p(
  table(
    [
      'Cutoff',
      'Lane',
      'Family',
      'Proposals',
      'Evaluations',
      'Fresh',
      'Hits',
      'Centres',
      'Neighbours',
      'Screened',
      'Plausible',
      'R1 fitted',
      'R1 feasible',
      'R1 ledgers',
      'R3 feasible',
      'Shortlist',
      'Islands',
      'Stop'
    ],
    searchRows.map((r) => [
      r.cutoff,
      r.lane,
      r.family,
      n(r.proposals as number),
      n(r.evaluations as number),
      n(r.fresh as number),
      n(r.hits as number),
      n(r.centres as number),
      n(r.neighbours as number),
      n(r.screened as number),
      n(r.plausible as number),
      n(r.r1Fitted as number),
      n(r.r1Feasible as number),
      n(r.r1Ledgers as number),
      n(r.r3Feasible as number),
      n(r.shortlist as number),
      n(r.islands as number),
      String(r.extensionStop)
    ]) as never
  )
);
const tot = (rows: Record<string, unknown>[], k: string) => rows.reduce((t, r) => t + (r[k] as number), 0);
p(
  `\nTotals: ${n(tot(searchRows, 'proposals'))} distinct proposals, ${n(tot(searchRows, 'evaluations'))} evaluations requested (${n(tot(searchRows, 'fresh'))} fresh backend evaluations, ${n(tot(searchRows, 'hits'))} archive/cache hits; ${n(tot(searchRows, 'centres'))} centre and ${n(tot(searchRows, 'neighbours'))} neighbour evaluations). Per-cell coverage: \`results/report/search_cells.csv\`; per island (hypervolume gain per 10,000 evaluations, stop reasons): \`results/report/search_islands.csv\`.\n`
);

// cell coverage aggregated per cutoff and lane
h('2. Coverage by protected cell (summed over F1–F4)');
const cellAgg = new Map<string, Record<string, number>>();
for (const r of cellRows) {
  const k = `${r.cutoff}|${r.lane}|${r.cell}`;
  const a = cellAgg.get(k) ?? {
    screened: 0,
    plausible: 0,
    promoted: 0,
    r1: 0,
    r1Feasible: 0,
    r3Feasible: 0,
    shortlisted: 0
  };
  for (const f of Object.keys(a)) a[f]! += r[f] as number;
  cellAgg.set(k, a);
}
p(
  table(
    [
      'Cutoff',
      'Lane',
      'Cell',
      'Screened',
      'Plausible',
      'Promoted',
      'Rung-1 fitted',
      'Rung-1 feasible',
      'Rung-3 feasible',
      'Shortlisted'
    ],
    [...cellAgg.entries()].map(([k, a]) => [
      ...k.split('|'),
      n(a.screened),
      n(a.plausible),
      n(a.promoted),
      n(a.r1),
      n(a.r1Feasible),
      n(a.r3Feasible),
      n(a.shortlisted)
    ])
  )
);

// ---- qualification ----------------------------------------------------------------------------------------------
const memberRows: Record<string, unknown>[] = [];
for (const c of cutoffs) {
  const q = read(R('qualify', `${c}.json`));
  if (!q) continue;
  h(`3.${cutoffs.indexOf(c) + 1} Qualification at ${c} (door ${q.door})`);
  const d = q.decision;
  const roleOf = (id: string) =>
    Object.entries(d.roles)
      .filter(([k, v]) => v === id && k !== 'lowerDrawdownNote')
      .map(([k]) => k)
      .join(', ');
  const rows = (q.members as any[]).map((m) => {
    memberRows.push({
      cutoff: c,
      id: m.id,
      lane: m.lane,
      family: m.family,
      source: m.source,
      describe: m.describe,
      qualified: m.qualified,
      Q1: m.gates.Q1,
      Q2: m.gates.Q2,
      Q3: m.gates.Q3,
      net: m.centre.net,
      dd: m.centre.dd,
      lots: m.centre.lots,
      wins: m.centre.wins,
      sameSession: m.centre.sameSession,
      medianHoldMin: m.behaviour.medianHoldMinutes,
      tradesPerYear: m.behaviour.tradesPerYear,
      sameSessionShare: m.behaviour.sameSessionShare,
      medianDepth: m.behaviour.medianDepth,
      selMedian: m.selection.median,
      selP10: m.selection.p10,
      selRobust: m.selection.robust,
      selP90Dd: m.selection.p90Dd,
      confMedian: m.confirmation.median,
      confP10: m.confirmation.p10,
      confRobust: m.confirmation.robust,
      confP90Dd: m.confirmation.p90Dd,
      confP95Dd: m.confirmation.p95Dd,
      confWorstDd: m.confirmation.worstDd,
      confWorst10MeanDd: m.confirmation.worst10MeanDd,
      confN: m.confirmation.n,
      confBreaches: m.confirmation.breaches,
      confBreachShare: m.confirmation.breachShare,
      confBreachLo: m.confirmation.breachLo,
      confBreachHi: m.confirmation.breachHi,
      confMeanExcess: m.confirmation.meanExcess,
      confWorstExcess: m.confirmation.worstExcess,
      confDistinct: m.confirmation.distinct,
      confBreachLedgers: m.confirmation.breachLedgers,
      confClipped: m.confirmation.clipped,
      smallP90Dd: m.small.p90Dd,
      smallBreachShare: m.small.breachShare,
      smallMedian: m.small.median,
      wideP90Dd: m.wide.p90Dd,
      wideBreachShare: m.wide.breachShare,
      wideMedian: m.wide.median,
      roles: roleOf(m.id),
      catalog: d.catalog.some((x: any) => x.id === m.id),
      pareto: d.pareto.includes(m.id),
      ...Object.fromEntries(Object.entries(m.stresses).map(([k, v]: [string, any]) => [`stress_${k}`, v.net])),
      ...Object.fromEntries(Object.entries(m.toggles).map(([k, v]: [string, any]) => [`toggle_${k}`, v.net]))
    });
    return [
      m.id,
      m.lane,
      m.qualified ? 'yes' : `no (${['Q1', 'Q2', 'Q3'].filter((g) => !m.gates[g]).join(',')})`,
      $(m.centre.net),
      $(m.centre.dd),
      n(m.centre.lots),
      $(m.selection.robust),
      $(m.selection.p90Dd),
      $(m.confirmation.p90Dd),
      pct(m.confirmation.breachShare),
      roleOf(m.id)
    ];
  });
  p(
    table(
      [
        'Member',
        'Lane',
        'Qualified',
        'Centre net',
        'Centre DD',
        'Lots',
        'Sel. robust',
        'Sel. p90 DD',
        'Conf. p90 DD',
        'Breach share',
        'Roles'
      ],
      rows
    )
  );
  p(
    `\nQualified: ${d.qualified.length} of ${(q.members as any[]).filter((m) => m.lane !== 'explore2').length} selectable members. **Primary (actual profit): ${d.primary ?? 'none'}**. Roles: actual-profit ${d.roles.actualProfit ?? '–'}, robust-profit ${d.roles.robustProfit ?? '–'}, balanced ${d.roles.balanced ?? '–'}, lower-drawdown ${d.roles.lowerDrawdown ?? 'vacant'}${d.roles.lowerDrawdownNote ? ` (${d.roles.lowerDrawdownNote})` : ''}. Pareto: ${d.pareto.join(', ') || '–'}.${c === 'C24' ? ` Independent primary: ${q.independent.primary ?? 'none'}. Exploratory 2-bp primary: ${q.exploratory2bp.primary ?? 'none'}.` : ''}\n`
  );
}
csvs['qualification_members.csv'] = memberRows;

// ---- catalog ----------------------------------------------------------------------------------------------------
const q24 = read(R('qualify', 'C24.json'));
if (q24) {
  h('4. C24 catalog of distinct phenotypes, nearest neighbours and rejected near-duplicates');
  const byId = new Map((q24.members as any[]).filter((m) => m.lane !== 'explore2').map((m) => [m.id, m]));
  p(
    table(
      [
        'Member',
        'Why',
        'Describe',
        'Net',
        'DD',
        'Trades/yr',
        'Median hold (min)',
        'Same-session',
        'Median depth',
        'Nearest',
        'Overlap',
        'Distance'
      ],
      q24.decision.catalog.map((c: any) => {
        const m = byId.get(c.id);
        const nb = q24.decision.catalogNeighbours.find((x: any) => x.id === c.id);
        return [
          c.id,
          c.why,
          m.describe,
          $(m.centre.net),
          $(m.centre.dd),
          n(m.behaviour.tradesPerYear, 1),
          n(m.behaviour.medianHoldMinutes),
          pct(m.behaviour.sameSessionShare, 0),
          pct(m.behaviour.medianDepth, 2),
          nb?.nearest ?? '–',
          nb?.similarity ? n(nb.similarity.overlap, 2) : '–',
          nb?.similarity ? n(nb.similarity.distance, 3) : '–'
        ];
      })
    )
  );
  p(
    `\nRejected (first 20): ${
      q24.decision.catalogRejected
        .slice(0, 20)
        .map((r: any) => `${r.id} (${r.nearest ? `≈ ${r.nearest}: ` : ''}${r.reasons.join('; ')})`)
        .join('; ') || 'none'
    }.\n`
  );
}

// ---- folds --------------------------------------------------------------------------------------------------------
h('5. Chronological procedure (independent lane): fold selections, slices and the sequential verdict');
const foldRows: (string | number)[][] = [];
for (const c of ['C19', 'C21', 'C23']) {
  const sel = read(R('folds', `${c}-selection.json`));
  const ev = read(R('folds', `${c}-evaluation.json`));
  if (!sel) continue;
  if (!ev) {
    foldRows.push([c, sel.primary ?? 'none', '–', '–', '–', '–', '–']);
    continue;
  }
  for (const m of ev.members)
    foldRows.push([
      c,
      m.id,
      m.roles.join(', '),
      $(sel.members.find((x: any) => x.id === m.id)?.developmentNet),
      $(m.sliceNet),
      $(m.sliceResetDd),
      n(m.lotsInSlice)
    ]);
  if (!ev.members.length) foldRows.push([c, 'no primary (flat)', '', '', $(0), $(0), '0']);
  for (const k of ev.controlsDescriptive)
    foldRows.push([c, `control: ${k.id}`, 'descriptive', '', $(k.sliceNet), $(k.sliceResetDd), n(k.lotsInSlice)]);
}
p(table(['Cutoff', 'Member', 'Roles', 'Training net', 'Slice net', 'Slice reset DD', 'Slice lots'], foldRows));
const seq = read(R('folds', 'sequential.json'));
if (seq)
  p(
    `\nSequential procedure: ${seq.rows.map((r: any) => `${r.cutoff} ${r.primary ?? 'flat'} ${$(r.sliceNet)} (switch ${$(r.switchCost)})`).join('; ')}. **Chained net ${$(seq.net)}, chained minute DD ${$(seq.minuteDd)}, charges ${$(seq.charges)} → verdict: ${seq.verdict}** (${seq.rule}).\n`
  );

// ---- ablation -------------------------------------------------------------------------------------------------------
const ab = read(R('ablation', 'ablation.json'));
if (ab) {
  h('6. Rule ladder L0–L5 on fixed development vectors (explanatory; D24)');
  for (const v of ab.vectors) p(`- **${v.vector}** — ${v.provenance}: ${v.describe}\n`);
  p(
    table(
      [
        'Vector',
        'Rung',
        'Net',
        'Pre-cost gross',
        'Friction',
        'Interest',
        'DD',
        'Trades',
        'Wins',
        'Worst',
        'Median hold (min)',
        'Same-session',
        'Overnight',
        'Δ entries +/−',
        'Exits changed',
        'Δ net'
      ],
      ab.rows.map((r: any) => [
        r.vector,
        r.rung,
        $(r.net),
        $(r.grossPreCost),
        $(r.friction),
        $(r.interest),
        $(r.dd),
        n(r.trades),
        n(r.wins),
        $(r.worstLoss),
        n(r.medianHoldMinutes),
        pct(r.sameSessionShare, 0),
        pct(r.overnightShare, 0),
        r.entriesAdded === undefined ? '–' : `+${r.entriesAdded}/−${r.entriesRemoved}`,
        r.exitsChanged ?? '–',
        r.netChange === undefined ? '–' : $(r.netChange)
      ])
    )
  );
}

// ---- controls ---------------------------------------------------------------------------------------------------------
const ctl = read(R('controls', 'development.json'));
if (ctl) {
  h('7. Controls on development (native and harmonized)');
  p(
    table(
      ['Control', 'Convention', 'Net', 'DD', 'Trades', 'Wins', 'Median hold (min)', 'Same-session'],
      ctl.rows.map((r: any) => [
        r.key,
        r.convention,
        $(r.net, 2),
        $(r.dd, 2),
        n(r.trades),
        n(r.wins),
        n(r.medianHoldMinutes),
        pct(r.sameSessionShare, 0)
      ])
    )
  );
}

// ---- diagnostics ---------------------------------------------------------------------------------------------------
const dg = read(R('diagnostics', 'diagnostics.json'));
if (dg) {
  h('8. Development diagnostics of the C24 set (report-only)');
  const rows = dg.subjects.map((s: any) => [
    s.key,
    $(s.summary.net),
    $(s.summary.dd),
    n(s.summary.trades),
    $(s.summary.worstLoss),
    n(s.summary.medianHoldMinutes),
    pct(s.summary.sameSessionShare, 0),
    n(s.concentration.episodes),
    s.concentration.topEpisode
      ? `${s.concentration.topEpisode.month} ${pct(s.concentration.topEpisode.share, 0)}`
      : '–',
    s.concentration.blackout ? $(s.concentration.blackout.net) : '–',
    n(s.concentration.profitFactor, 2),
    n(s.concentration.longestLosingStreak),
    ...[0, 2, 5, 10, 20].map((c) => $(s.costCurve[`${c}bps`])),
    pct(s.capacity.medianParticipationCausal, 0),
    n(s.capacity.flagged)
  ]);
  p(
    table(
      [
        'Subject',
        'Net',
        'DD',
        'Trades',
        'Worst',
        'Median hold',
        'Same-session',
        'Episodes',
        'Top month (share)',
        'Net without top month',
        'PF',
        'Loss streak',
        '0 bps',
        '2 bps',
        '5 bps',
        '10 bps',
        '20 bps',
        'Median participation',
        'Capacity flags'
      ],
      rows
    )
  );
}

// ---- validation -----------------------------------------------------------------------------------------------------
const val = read(R('validation', 'validation.json'));
if (val) {
  h('9. Validation (2025-01-02 → 2026-10-30; previously examined history, not an untouched holdout)');
  csvs['validation_members.csv'] = val.members.map((m: any) => ({
    ...m,
    years: undefined,
    stresses: undefined,
    ...Object.fromEntries(Object.entries(m.stresses).map(([k, v]) => [`stress_${k}`, v]))
  }));
  p(
    table(
      [
        'Member',
        'Lane',
        'Tags',
        'Development',
        '2025',
        '2026 (to 10-30)',
        'Validation',
        'Reset val. DD',
        'Whole-run DD',
        'V1',
        'V2',
        'V3',
        'Lots after 2024'
      ],
      val.members.map((m: any) => [
        m.id,
        m.lane,
        (m.tags ?? []).join(' '),
        $(m.development),
        $(m.y2025),
        $(m.y2026),
        $(m.validation),
        $(m.validationResetDd),
        $(m.wholeRunDd),
        m.V1 ? 'pass' : 'fail',
        m.V2 ? 'pass' : 'fail',
        m.V3 ? 'pass' : 'fail',
        n(m.lotsAfterBoundary)
      ])
    )
  );
  p('\nControls on FULL:\n');
  p(
    table(
      ['Control', 'Convention', 'Development', '2025', '2026', 'Validation', 'Reset val. DD', 'Whole-run DD'],
      val.controls.map((c: any) => [
        c.key,
        c.convention,
        $(c.development, 2),
        $(c.y2025),
        $(c.y2026),
        $(c.validation),
        $(c.validationResetDd),
        $(c.wholeRunDd)
      ])
    )
  );
  p('\nValidation neighbourhoods (confirmation rep 1, 128 draws, report-only):\n');
  p(
    table(
      [
        'Member',
        'Draws',
        'Median validation',
        'p10 validation',
        'Positive share',
        'Whole-run breach share',
        'Validation breach share'
      ],
      Object.entries(val.neighbourhoods).map(([id, v]: [string, any]) => [
        id,
        n(v.n),
        $(v.medianValidation),
        $(v.p10Validation),
        pct(v.positiveShare, 0),
        pct(v.wholeRunBreachShare, 1),
        pct(v.validationBreachShare, 1)
      ])
    )
  );
}

// ---- net vs DD ---------------------------------------------------------------------------------------------------------
if (q24) {
  h('10. Net profit versus maximum minute drawdown (Markdown table, no chart)');
  const vm = new Map((val?.members ?? []).map((m: any) => [`${m.id}|${m.lane}`, m]));
  const rows = (q24.members as any[])
    .slice()
    .sort((a, b) => b.centre.net - a.centre.net)
    .map((m) => {
      const v: any = vm.get(`${m.id}|${m.lane}`);
      return [
        m.id,
        m.lane === 'explore2' ? 'explore2 (2 bps, never selectable)' : m.lane,
        m.qualified ? 'yes' : 'no',
        $(m.centre.net),
        $(m.centre.dd),
        pct(m.centre.dd / 100000, 1),
        v ? $(v.validation) : '–',
        v ? $(v.validationResetDd) : '–',
        v ? $(v.wholeRunDd) : '–'
      ];
    });
  for (const c of ctl?.rows ?? [])
    rows.push([
      `control: ${c.key}`,
      c.convention.split(':')[0],
      '–',
      $(c.net),
      $(c.dd),
      pct(c.dd / 100000, 1),
      '–',
      '–',
      '–'
    ]);
  p(
    table(
      [
        'Candidate',
        'Lane',
        'Qualified',
        'Development net',
        'Development DD',
        'DD % of $100k',
        'Validation net',
        'Reset val. DD',
        'Whole-run DD'
      ],
      rows
    )
  );
}

fs.mkdirSync(R('report'), { recursive: true });
fs.writeFileSync(path.join(S, 'REPORT_TABLES.md'), out.join('\n'));
for (const [f, rows] of Object.entries(csvs)) fs.writeFileSync(R('report', f), csv(rows));
console.log(`wrote ${path.join(S, 'REPORT_TABLES.md')} and ${Object.keys(csvs).length} CSV files`);
