// Report tables of the New L0 trading-session study (research/vg-l0-session-hold; PROTOCOL.md §15): Markdown tables and
// one machine-readable summary from the sealed records. Outside the pinned study code (reporting only: it never runs a
// simulation, opens a door or writes a sealed record).
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 \
//     tools/vg-l0-session-hold/tables.ts [--pilot NAME]
//
// Study: reads research/vg-l0-session-hold/results/ and FROZEN_SELECTION.json; writes results/tables/. With --pilot it
// reads and writes the pilot's cache directory instead (a format check only).
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const pilot = process.argv.includes('--pilot') ? process.argv[process.argv.indexOf('--pilot') + 1]! : null;
const dir = pilot
  ? path.join(repoRoot, '.cache/vg-l0-session-hold/pilot', pilot)
  : path.join(repoRoot, 'research/vg-l0-session-hold/results');
const frozenFile = pilot
  ? path.join(dir, 'FROZEN_SELECTION.json')
  : path.join(repoRoot, 'research/vg-l0-session-hold/FROZEN_SELECTION.json');
const out = path.join(dir, 'tables');
const final = pilot ? 'P18' : 'C24';
const folds = pilot ? [] : ['C19', 'C21', 'C23'];
const cuts = [...folds, final];

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const read = (f: string): Any | null => (fs.existsSync(f) ? decode<Any>(fs.readFileSync(f, 'utf8')) : null);
const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const n0 = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : Math.round(x).toLocaleString('en-US');
const pct = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(d)}%`;
// right-align a column iff every cell is numeric-looking ($, −, digits, %, '—')
const numeric = (v: string | number) =>
  typeof v === 'number' || /^(\*\*)?[−-]?\$?[\d,.]+%?(\*\*)?$|^—$/.test(String(v).trim());
const table = (head: string[], rows: (string | number)[][]) =>
  [
    `| ${head.join(' | ')} |`,
    `|${head.map((_h, i) => (rows.length && rows.every((r) => numeric(r[i] ?? '—')) ? '---:' : '---')).join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
const files: Record<string, string> = {};
const write = (name: string, title: string, body: string[]) => {
  files[name] = `# ${title}\n\n${body.join('\n\n')}\n`;
};
const summary: Any = {};

// ----- 1. budgets and search, side by side with the original 5B L0 arm -----
{
  const rec = read(path.join(repoRoot, 'research/vg-l0-session-hold/recovery/original-recovery.json'))!;
  const L0 = rec.budget.L0 as Any;
  const all = rec.budget.allArms as Any;
  const rows: (string | number)[][] = [];
  const mine: Any = {};

  for (const c of cuts)
    for (const arm of c === final ? ['indep', 'informed'] : ['indep']) {
      const s = read(path.join(dir, 'search', c, `${arm}.json`));

      if (!s) continue;

      const lanes = s.lanes as Any[];
      const sum = (k: string) => lanes.reduce((a, l) => a + (l.counts[k] ?? 0), 0);
      const proposals = sum('screened') + sum('seedDesigns') + sum('islandConfigs') + sum('fillers');
      const starts = lanes.reduce((a, l) => a + l.refinements.length, 0);
      const requested = lanes.reduce((a, l) => a + l.requested, 0);
      const key = `${c === final && !pilot ? 'C24' : c}/${arm}`;
      const o = L0[key] ?? {};
      const w = all[key] ?? {};

      mine[key] = {
        proposals,
        islands: sum('islandsRun'),
        starts,
        moves: sum('refineMoves'),
        requested,
        fresh: s.compute.unique,
        hits: s.compute.archiveHits,
        minutes: s.minutes
      };
      rows.push([
        key,
        n0(o.proposals),
        n0(w.proposals),
        n0(proposals),
        `${n0(o.islandsRun)} / ${n0(sum('islandsRun'))}`,
        `${n0(o.refineStarts)} / ${n0(starts)}`,
        `${n0(o.refineMoves)} / ${n0(sum('refineMoves'))}`,
        n0(o.requested),
        n0(requested),
        n0(s.compute.unique),
        n0(s.compute.archiveHits),
        `${s.minutes} min`,
        [...new Set(lanes.map((l) => l.extension.stop.split(' (')[0]))].join('; ')
      ]);
    }

  const tally = (key: string) => {
    const s = read(path.join(dir, 'search', key.split('/')[0]!, `${key.split('/')[1]}.json`));

    if (!s) return null;

    const t = s.compute.tallies as Record<string, { fresh: number }>;
    const tot = Object.values(t).reduce((a, x) => a + x.fresh, 0);
    const g: Record<string, number> = {};

    for (const [k, x] of Object.entries(t)) g[k.split(':')[0]!] = (g[k.split(':')[0]!] ?? 0) + x.fresh;
    return { tot, g };
  };
  const shareRows = Object.keys(mine).map((k) => {
    const x = tally(k)!;

    return [k, ...['screen', 'r1', 'r2', 'r3', 'refine'].map((s) => pct((x.g[s] ?? 0) / Math.max(1, x.tot)))];
  });
  const totals = Object.values(mine).reduce(
    (a: Any, x: Any) => ({
      proposals: a.proposals + x.proposals,
      requested: a.requested + x.requested,
      fresh: a.fresh + x.fresh,
      moves: a.moves + x.moves
    }),
    { proposals: 0, requested: 0, fresh: 0, moves: 0 }
  );

  summary.budget = {
    mine,
    totals,
    originalL0: { proposals: 49346, requested: 489695, moves: 11137, qualification: 64554 }
  };
  write('budget.md', 'Search budget and effort, side by side with the original (5B L0 arm and whole study)', [
    'Units: distinct proposals = screen + seed designs + island children + fillers (refinement moves apart); requested = every evaluation a lane asked for (archive hits included); fresh = unique simulations computed by the job. Original figures from `recovery/original-recovery.json` (5B sealed records).',
    table(
      [
        'Lane',
        'Original L0 arm proposals',
        'Original 3 arms proposals',
        'This study proposals',
        'Islands (orig L0 / this)',
        'Refinement starts (orig L0 / this)',
        'Refinement moves (orig L0 / this)',
        'Original L0 requested evals',
        'This study requested evals',
        'This study fresh',
        'Archive hits',
        'Wall',
        'Lane stops'
      ],
      rows
    ),
    `**Totals (this study, searches):** ${n0(totals.proposals)} distinct proposals (original L0 arm 49,346; whole 5B study 148,038), ${n0(totals.moves)} refinement moves (original L0 arm 11,137), ${n0(totals.requested)} requested evaluations (original L0 arm 489,695; whole study 1,463,415), ${n0(totals.fresh)} unique fresh simulations.`,
    '**Allocation among stages (fresh simulations by tag; original 5B: rung 1 65.8–75.4%, refinement 14.6–18.6%):**',
    table(['Job', 'Screen', 'Rung 1', 'Rung 2', 'Rung 3', 'Refinement'], shareRows)
  ]);
}

// ----- 2. selection (C24 and folds) -----
const sel = Object.fromEntries(cuts.map((c) => [c, read(path.join(dir, 'folds', c, 'selection.json'))]));
const evOf = (c: string, label: string | null | undefined) =>
  label ? (sel[c]?.evidence as Any[]).find((e) => e.label === label) : null;

{
  const s = sel[final];

  if (s) {
    const ev = s.evidence as Any[];
    const roles = s.roles as Record<string, Any>;
    const fin = roles['ses/final'];
    const rankRows = (fin?.ranked ?? []).slice(0, 25).map((r: Any) => {
      const e = ev.find((x) => x.label === r.label)!;

      return [
        r.rank,
        r.label,
        usd(e.centre.net),
        usd(e.centre.dd),
        e.centre.lots,
        usd(e.select.robust),
        usd(e.select.p90Dd),
        usd(e.confirm.median),
        usd(e.confirm.p10),
        usd(e.confirm.p90Dd),
        pct(e.confirm.breachShare)
      ];
    });
    const ctl = ev.filter((e) => e.kind === 'control' || e.kind === 'd1-only');
    const ctlRows = ctl.map((e) => [
      e.label,
      e.qualified ? 'qualified' : `fails ${e.failed.join(',')}`,
      usd(e.centre.net),
      usd(e.centre.dd),
      e.centre.lots,
      usd(e.confirm.median),
      usd(e.confirm.p10),
      usd(e.confirm.p90Dd),
      pct(e.confirm.breachShare),
      usd(e.confirm.worstDd)
    ]);
    const roleRows = Object.entries(roles)
      .filter(([k]) => !/R\d/.test(k))
      .map(([k, r]) => [
        k,
        `${r.qualified} / ${r.members}`,
        r.roles['actual-profit'] ?? '—',
        r.roles['robust-profit'] ?? '—',
        r.roles.balanced ?? '—',
        r.roles['lower-drawdown'] ?? '—'
      ]);
    const repRows = ['independent', 'informed'].flatMap((lane) =>
      [1, 2, 3, 4, 5, 6].map((rep) => {
        const label = roles[`ses/${lane} R${rep}`]?.roles['actual-profit'];
        const e = evOf(final, label);

        return [
          `${lane} R${rep}`,
          label ?? '—',
          usd(e?.centre.net),
          usd(e?.centre.dd),
          usd(e?.confirm.p10),
          usd(e?.confirm.p90Dd)
        ];
      })
    );

    summary.selection = {
      primary: s.primary,
      independentPrimary: s.independentPrimary,
      roles: Object.fromEntries(Object.entries(roles).map(([k, r]) => [k, r.roles]))
    };
    write(
      `selection-${final}.md`,
      `Qualification and selection at ${final} (development ${pilot ? 'pilot' : '2016-01-04 → 2024-12-31'})`,
      [
        `Primary (C): **${s.primary.ses ?? 'none'}**; independent primary: ${s.independentPrimary.ses ?? 'none'}.`,
        table(['Set', 'Qualified / members', 'Actual-profit', 'Robust-profit', 'Balanced', 'Lower-drawdown'], roleRows),
        '**The final selectable set by the primary rule (top 25):**',
        table(
          [
            'Rank',
            'Member',
            'Centre net',
            'Centre DD',
            'Lots',
            'Sel. robust',
            'Sel. p90 DD',
            'Conf. median',
            'Conf. p10',
            'Conf. p90 DD',
            'Draws > $35k'
          ],
          rankRows
        ),
        '**Seed-level actual-profit holders (search variability; reporting only):**',
        table(['Replicate', 'Holder', 'Centre net', 'Centre DD', 'Conf. p10', 'Conf. p90 DD'], repRows),
        '**Controls under both units (same instrument):**',
        table(
          [
            'Control',
            'Gates',
            'Centre net',
            'Centre DD',
            'Lots',
            'Conf. median',
            'Conf. p10',
            'Conf. p90 DD',
            'Draws > $35k',
            'Worst DD'
          ],
          ctlRows
        ),
        `**Near misses** (fail only Q3/Q4/Q5): ${(s.nearMisses as Any[]).length ? (s.nearMisses as Any[]).map((x) => `${x.label} (${x.failed.join(',')}: ${JSON.stringify(x.severity)})`).join('; ') : 'none'}.`
      ]
    );
  }
}

// ----- 3. folds and the sequential path -----
if (!pilot) {
  const rows: (string | number)[][] = [];

  for (const c of folds) {
    const e = read(path.join(dir, 'folds', c, 'evaluation.json'));

    if (!e) continue;
    for (const r of e.rows as Any[])
      if (r.own || r.label.startsWith('control'))
        rows.push([c, r.label, r.unit, r.role, usd(r.sliceNet), usd(r.sliceDd), usd(r.wholeNet)]);
    for (const r of e.rows as Any[])
      if (!r.own && !r.label.startsWith('control') && r.unit === 'cal')
        rows.push([c, `${r.label} (cross row)`, r.unit, r.role, usd(r.sliceNet), usd(r.sliceDd), usd(r.wholeNet)]);
  }

  const seq = read(path.join(dir, 'folds', 'sequential.json'));
  const seqRows = seq
    ? (seq.arms as Any[]).flatMap((a) =>
        (a.policies as Any[]).map((p) => [
          p.name,
          usd(p.net),
          usd(p.charges),
          usd(p.sequentialDd),
          p.ddPeak,
          p.ddTrough,
          p.parts.map((x: Any) => `${x.fold}: ${x.label ?? 'flat'} ${usd(x.sliceNet)}`).join('; ')
        ])
      )
    : [];

  summary.sequential = seq ? { verdict: seq.verdict, procedure: (seq.arms as Any[])[0].procedure } : null;
  write('folds.md', 'Chronological procedure test (independent lanes; session unit)', [
    `Verdict (frozen rule): **${seq?.verdict ?? '—'}**. The original procedure (5B L0 arm, calendar days): −$29,358.01, sequential DD $67,214.22 — chronologically unsupported.`,
    table(['Policy', 'Sequential net', 'Charges', 'Sequential DD', 'DD peak', 'DD trough', 'Parts'], seqRows),
    '**Fold rows (slices; own rows under the session unit, cross rows under calendar days, controls descriptive):**',
    table(['Fold', 'Row', 'Unit', 'Role', 'Slice P&L', 'Slice DD', 'Whole-run net'], rows)
  ]);
}

// ----- 4. the unit cross-test and the decomposition (C24, development) -----
const frozen = read(frozenFile);

{
  const x = read(path.join(dir, 'crosstest', final, 'matrix.json'));

  if (x && frozen) {
    const rows = (x.rows as Any[]).map((r) => {
      const c = r.columns.cal;
      const s = r.columns.ses;

      return [
        r.row,
        r.control ?? r.exportedBy.map((b: Any) => b.roles.join('/')).join('; '),
        usd(c.centre.net),
        usd(c.centre.dd),
        usd(s.centre.net),
        usd(s.centre.dd),
        usd(s.centre.net - c.centre.net),
        c.confirm ? `${usd(c.confirm.nb.p10)} / ${usd(c.confirm.nb.p90Dd)}` : '—',
        s.confirm ? `${usd(s.confirm.nb.p10)} / ${usd(s.confirm.nb.p90Dd)}` : '—'
      ];
    });
    const nl0 = (x.rows as Any[]).find((r) => r.control === 'NL0');
    const cId = frozen.configurations.C.evidence?.id;
    const cRow = (x.rows as Any[]).find((r) => r.id === cId);
    const dec =
      nl0 && cRow
        ? {
            A: nl0.columns.cal.centre.net,
            B: nl0.columns.ses.centre.net,
            C: cRow.columns.ses.centre.net,
            Ccal: cRow.columns.cal.centre.net
          }
        : null;

    summary.decomposition = dec;
    write(
      `crosstest-${final}.md`,
      `The unit cross-test at ${final}: every exported phenotype under both hold units (development)`,
      [
        dec
          ? table(
              ['Effect', 'Centre net'],
              [
                ['A (New L0, calendar days)', usd(dec.A)],
                ['B (New L0, sessions)', usd(dec.B)],
                ['C (primary, sessions)', usd(dec.C)],
                ['C under calendar days', usd(dec.Ccal)],
                ['Convention effect B − A', usd(dec.B - dec.A)],
                ['Re-optimization effect C − B', usd(dec.C - dec.B)],
                ['Total C − A', usd(dec.C - dec.A)],
                ['Phenotype effect (C under cal − A)', usd(dec.Ccal - dec.A)],
                ['Interaction', usd(dec.C - dec.A - (dec.B - dec.A) - (dec.Ccal - dec.A))]
              ]
            )
          : 'no decomposition (pilot)',
        table(
          [
            'Row',
            'Exported as',
            'Calendar net',
            'Calendar DD',
            'Sessions net',
            'Sessions DD',
            'Sessions − calendar',
            'Conf. p10 / p90 DD (cal)',
            'Conf. p10 / p90 DD (ses)'
          ],
          rows
        )
      ]
    );
  }
}

// ----- 5. the frozen labels, A / B / C and the validation -----
{
  const v = read(path.join(dir, 'validation', 'validation.json'));

  if (frozen) {
    const L = frozen.comparisonLabels as Record<string, Any>;

    summary.labels = Object.fromEntries(
      Object.entries(L).map(([k, x]) => [
        k,
        { label: x.label, dev: x.dev, risk: x.risk, chron: x.chron, qualifier: x.qualifier }
      ])
    );
    write('labels.md', 'The frozen comparison labels (development and folds only; sealed before the validation)', [
      table(
        ['Comparison', 'Dev', 'Risk', 'Chron', 'Label', 'Qualifier'],
        Object.entries(L).map(([k, x]) => [
          k,
          x.dev,
          x.risk,
          x.chronApplies ? x.chron : 'n/a',
          `**${x.label}**`,
          x.qualifier ?? ''
        ])
      ),
      `C = ${frozen.configurations.C.label ?? 'none'}${frozen.configurations.C.isUnchangedIncumbent ? ` (an unchanged control: ${frozen.configurations.C.isUnchangedIncumbent})` : ''}.`
    ]);
  }

  if (v && frozen) {
    const rows = (v.rows as Any[]).map((r) => [
      r.row,
      r.control ?? r.exportedBy.map((b: Any) => b.roles.join('/')).join('; '),
      r.unit,
      usd(r.developmentNet),
      usd(r.validationPnl),
      usd(r.validationDd),
      usd(r.fullNet),
      usd(r.wholeDd),
      r.passes
        ? 'pass'
        : `fail ${Object.entries(r.tests)
            .filter(([, ok]) => !ok)
            .map(([k]) => k)
            .join(',')}`
    ]);
    const kt = Object.entries(v.knownTargets as Record<string, Any>).map(([k, t]) => [
      k,
      JSON.stringify(Object.fromEntries(Object.entries(t).filter(([kk]) => kk !== 'got'))),
      JSON.stringify(t.got)
    ]);

    summary.validation = { passes: (v.rows as Any[]).filter((r) => r.passes).length, rows: (v.rows as Any[]).length };
    write(
      'validation.md',
      'Validation (FULL once; 2025-01-02 → 2026-10-30, previously examined history) and full history',
      [
        table(
          [
            'Row',
            'Exported as',
            'Unit',
            'Development net',
            'Validation P&L',
            'Reset val. DD',
            'Full net',
            'Whole-run DD',
            'V1–V3'
          ],
          rows
        ),
        '**Known targets (compared here only):**',
        table(['Target', 'Expected', 'Reproduced'], kt),
        '**Report-only stresses on FULL:**',
        table(
          ['Row', 'Unit', 'Stress', 'Validation P&L', 'Validation DD', 'Full net', 'Whole-run DD'],
          (v.stresses as Any[]).flatMap((s) =>
            Object.entries(s.stresses as Record<string, Any>).map(([k, x]) => [
              s.label,
              s.unit,
              k,
              usd(x.validationPnl),
              usd(x.validationDd),
              usd(x.fullNet),
              usd(x.wholeDd)
            ])
          )
        ),
        '**Fresh confirmation rep 1 (128 draws) on FULL (report-only):**',
        table(
          [
            'Row',
            'Unit',
            'n',
            'Median val. P&L',
            'p10 val. P&L',
            'Positive share',
            'p90 val. DD',
            'p90 whole-run DD',
            'Whole-run > $35k'
          ],
          (v.neighbourhoods.res as Any[]).map((x) => [
            x.label,
            x.unit,
            x.n,
            usd(x.medianValidationPnl),
            usd(x.p10ValidationPnl),
            pct(x.positiveShare),
            usd(x.p90ValidationDd),
            usd(x.p90WholeRunDd),
            x.wholeRunAbove35k
          ])
        )
      ]
    );
  }
}

// ----- 6. A / B / C: the brief's comparison (training, validation, full history) -----
const parseCsv = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let q = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      cur.push(cell);
      cell = '';
    } else if (ch === '\n') {
      cur.push(cell);
      rows.push(cur);
      cur = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }

  const [head, ...body] = rows;

  return body.filter((r) => r.length === head!.length).map((r) => Object.fromEntries(head!.map((h, i) => [h, r[i]!])));
};

{
  const v = read(path.join(dir, 'validation', 'validation.json'));
  const d = read(path.join(dir, 'diagnostics', 'diagnostics.json'));

  if (v && d && frozen) {
    const boundary = pilot ? '2018-12-31' : '2024-12-31';
    const devSessions = pilot ? 754 : 2262;
    const fullSessions = pilot ? 1006 : 2723;
    const devDays = (Date.parse(`${boundary}T00:00:00Z`) - Date.parse('2016-01-04T00:00:00Z')) / 86_400_000 + 1;
    const fullDays =
      (Date.parse(`${pilot ? '2019-12-31' : '2026-10-30'}T00:00:00Z`) - Date.parse('2016-01-04T00:00:00Z')) /
        86_400_000 +
      1;
    const cLabel = frozen.configurations.C.label as string | null;
    const cId = frozen.configurations.C.evidence?.id as string | undefined;
    const nl0Id = '67cfdd9b62d1e16f';
    const mech = (id: string | undefined, unit: string) =>
      (d.mechanism as Any[]).find((m) => m.id === id && m.unit === unit);
    const slug = (label: string) => label.replace(/[^A-Za-z0-9#._-]+/g, '_').slice(0, 90);
    const devLots = (m: Any) =>
      parseCsv(fs.readFileSync(path.join(dir, 'diagnostics', 'ledgers', slug(m.label), m.unit, 'lots.csv'), 'utf8'));
    const fullLots = (tag: string) =>
      parseCsv(fs.readFileSync(path.join(dir, 'validation', 'ledgers', tag, 'lots.csv'), 'utf8'));
    const det = (tag: string) => (v.detail as Any[]).find((x) => x.tag === tag);
    const vrow = (id: string | undefined, unit: string) =>
      (v.rows as Any[]).find((r) => r.id === id && r.unit === unit);
    const subjects = [
      { key: 'A', id: nl0Id, unit: 'cal' },
      { key: 'B', id: nl0Id, unit: 'ses' },
      { key: 'C', id: cId, unit: 'ses' },
      { key: 'C-cal', id: cId, unit: 'cal' }
    ];
    const num = (x: string | undefined) => Number(x);
    const stats = (lots: Record<string, string>[]) => {
      const nets = lots.map((l) => num(l.net));
      const closed = lots.filter((l) => l.status === 'closed');

      return {
        trades: lots.length,
        open: lots.length - closed.length,
        wins: closed.filter((l) => num(l.net) > 0).length,
        losses: closed.filter((l) => num(l.net) < 0).length,
        gross: nets.filter((x) => x > 0).reduce((a, x) => a + x, 0),
        loss: nets.filter((x) => x < 0).reduce((a, x) => a + x, 0),
        net: nets.reduce((a, x) => a + x, 0),
        interest: lots.reduce((a, l) => a + num(l.interest), 0),
        costs: lots.reduce((a, l) => a + num(l.costs), 0),
        sessions: lots.length ? lots.reduce((a, l) => a + num(l.nyseSessionsHeld), 0) / lots.length : NaN,
        days: lots.length ? lots.reduce((a, l) => a + num(l.calendarDays), 0) / lots.length : NaN,
        sessionsSum: lots.reduce((a, l) => a + num(l.nyseSessionsHeld), 0),
        principalSessions: lots.reduce((a, l) => a + num(l.principal) * num(l.nyseSessionsHeld), 0),
        worstMae: Math.min(0, ...lots.map((l) => num(l.mae)))
      };
    };
    const windows: Record<string, Any> = {};

    for (const s of subjects) {
      const m = mech(s.id, s.unit);
      const tag = s.key;
      const fl = det(tag) ? fullLots(tag) : null;
      const dl = m ? devLots(m) : null;
      const vr = vrow(s.id, s.unit);

      if (!m || !fl || !vr) continue;

      const after = fl.filter((l) => l.entry.slice(0, 10) > boundary);
      const tr = stats(dl!);
      const va = stats(after);
      const fu = stats(fl);

      windows[tag] = {
        training: {
          ...tr,
          netMarked: m.record.net,
          dd: m.record.dd,
          sessionsHeld: m.record.sessionsHeld,
          utilizationSessions: m.record.sessionsHeld / devSessions,
          utilizationPrincipal:
            Object.values(m.record.books as Record<string, Any>).reduce((a, b) => a + b.principalDays, 0) /
            (100000 * devDays)
        },
        validation: {
          ...va,
          netMarked: vr.validationPnl,
          dd: vr.validationDd,
          crossing: vr.crossingBoundary,
          crossingContribution: vr.validationPnl - va.net,
          utilizationSessions: (det(tag)!.sessionsHeld - m.record.sessionsHeld) / (fullSessions - devSessions)
        },
        full: {
          ...fu,
          netMarked: vr.fullNet,
          dd: vr.wholeDd,
          sessionsHeld: det(tag)!.sessionsHeld,
          utilizationSessions: det(tag)!.sessionsHeld / fullSessions,
          utilizationPrincipal:
            Object.values(det(tag)!.books as Record<string, Any>).reduce((a, b) => a + b.principalDays, 0) /
            (100000 * fullDays)
        },
        devNet: vr.developmentNet,
        valNet: vr.validationPnl
      };
    }

    const keys = Object.keys(windows);
    const metric = (w: string, label: string, f: (x: Any) => string) => [label, ...keys.map((k) => f(windows[k][w]))];
    const block = (w: string, title: string) => [
      `**${title}**`,
      table(
        [
          'Metric',
          ...keys.map((k) =>
            k === 'A'
              ? 'A: Baseline (calendar)'
              : k === 'B'
                ? 'B: Conversion (sessions)'
                : k === 'C'
                  ? 'C: Re-optimized (sessions)'
                  : 'C under calendar days (cross row)'
          )
        ],
        [
          metric(w, 'Net profit (marked)', (x) => usd(x.netMarked)),
          metric(w, 'Gross profit (Σ winning lots)', (x) => usd(x.gross)),
          metric(w, 'Gross loss (Σ losing lots)', (x) => usd(x.loss)),
          metric(w, 'Margin interest', (x) => usd(x.interest)),
          metric(w, 'Transaction costs (5 bps per side)', (x) => usd(x.costs)),
          metric(
            w,
            w === 'validation' ? 'Maximum minute DD (reset at 2024-12-31)' : 'Maximum minute DD',
            (x) => `${usd(x.dd)} (${pct(x.dd / 100000)})`
          ),
          metric(w, 'Number of trades (open at the end)', (x) => `${x.trades} (${x.open})`),
          metric(w, 'Win rate (closed lots)', (x) => pct(x.wins / Math.max(1, x.wins + x.losses))),
          metric(w, 'Average holding (NYSE sessions)', (x) =>
            Number.isFinite(x.sessions) ? x.sessions.toFixed(1) : '—'
          ),
          metric(w, 'Average holding (calendar days)', (x) => (Number.isFinite(x.days) ? x.days.toFixed(1) : '—')),
          metric(w, 'Capital utilization (sessions with a funded position)', (x) => pct(x.utilizationSessions)),
          ...(w !== 'validation'
            ? [metric(w, 'Capital utilization (principal-days ÷ $100,000 × days)', (x) => pct(x.utilizationPrincipal))]
            : []),
          metric(w, 'Worst intratrade mark (MAE of one lot)', (x) => usd(x.worstMae)),
          ...(w === 'validation'
            ? [metric(w, 'Contribution of positions crossing 2024-12-31', (x) => usd(x.crossingContribution))]
            : [])
        ]
      )
    ];
    const head = table(
      [
        'Configuration',
        'Training net (2016–2024)',
        'Validation net (2025–2026)',
        'Full-history net',
        'Full-history max minute DD'
      ],
      keys.map((k) => [
        k,
        usd(windows[k].devNet),
        usd(windows[k].valNet),
        usd(windows[k].full.netMarked),
        usd(windows[k].full.dd)
      ])
    );
    const annualRows = [...new Set(keys.flatMap((k) => Object.keys(det(k)!.calendarYears ?? {})))]
      .sort()
      .map((y) => [y, ...keys.flatMap((k) => [usd(det(k)!.calendarYears[y]?.pnl), usd(det(k)!.calendarYears[y]?.dd)])]);
    const worst = keys.flatMap((k) =>
      fullLots(k)
        .sort((a, b) => num(a.net) - num(b.net))
        .slice(0, 5)
        .map((l) => [
          k,
          l.component,
          l.entry.slice(0, 10),
          l.exit.slice(0, 10),
          l.exitReason,
          l.nyseSessionsHeld,
          usd(num(l.net)),
          usd(num(l.mae))
        ])
    );
    const comp = keys.flatMap((k) =>
      Object.entries(det(k)!.books as Record<string, Any>)
        .filter(([, b]) => b.lots > 0)
        .map(([b, x]) => [k, b, x.lots, x.wins, x.losses, usd(x.booked), `${x.granted} / ${x.refused}`])
    );
    const refusals = keys.flatMap((k) =>
      Object.entries(det(k)!.refusalsByOccupant as Record<string, Record<string, number>>).flatMap(([b, occ]) =>
        Object.entries(occ).map(([o, n]) => [k, b, o, n])
      )
    );
    const exits = keys.flatMap((k) =>
      Object.entries(det(k)!.exitReasons as Record<string, Record<string, number>>).map(([b, r]) => [
        k,
        b,
        Object.entries(r)
          .map(([x, n]) => `${x} ${n}`)
          .join('; ')
      ])
    );
    const matchRows = Object.entries(v.matched as Record<string, Any>)
      .filter(([, m]) => m)
      .map(([k, m]) => [
        k,
        ...['unchanged', 'retimed exit', 'retimed', 'newly admitted', 'displaced'].map(
          (x) => `${m.summary[x].lots} (${usd(m.summary[x].delta)})`
        ),
        `${m.extendedShortened.extended.lots} (${usd(m.extendedShortened.extended.delta)})`,
        `${m.extendedShortened.shortened.lots} (${usd(m.extendedShortened.shortened.delta)})`,
        usd(m.delta)
      ]);
    const exRows = Object.entries(v.matched as Record<string, Any>)
      .filter(([, m]) => m)
      .flatMap(([k, m]) =>
        (m.extendedShortened.rows as Any[]).map((r) => [
          k,
          r.component,
          r.xEntry.slice(0, 10),
          r.yExit.slice(0, 10),
          r.xExit.slice(0, 10),
          usd(r.yNet),
          usd(r.xNet),
          usd(r.delta)
        ])
      );
    // parameter changes of C against A
    const sa = frozen.configurations.A.evidence?.settings?.cal;
    const sc = frozen.configurations.C.evidence?.settings?.ses;
    const paramRows: (string | number)[][] = [];

    if (sa && sc) {
      for (const s of ['VGT', 'GDX'])
        for (const [k, a] of Object.entries(sa.d1[s].grid as Record<string, number>)) {
          const c = (sc.d1[s].grid as Record<string, number>)[k];

          if (c !== a) paramRows.push([`D1·${s} ${k}`, a, c]);
        }
      const ga = sa.growth.VGT.effective ?? {};
      const gc = sc.growth.VGT.effective ?? {};

      for (const k of [...new Set([...Object.keys(ga), ...Object.keys(gc)])].sort())
        if (JSON.stringify(ga[k]) !== JSON.stringify(gc[k]))
          paramRows.push([`Growth·VGT ${k}`, ga[k] ?? '(inactive)', gc[k] ?? '(inactive)']);
    }

    summary.abc = { windows, C: cLabel };
    write(
      'abc.md',
      'A / B / C — New L0 under calendar days (A), the same phenotype under trading sessions (B), the re-optimized primary (C)',
      [
        `C = ${cLabel ?? 'none'}${frozen.configurations.C.isUnchangedIncumbent ? ` (an unchanged control: ${frozen.configurations.C.isUnchangedIncumbent})` : ''}. Training = the D24 door run (2016-01-04 → 2024-12-31; lots closed by then, open lots marked at its close); validation = the FULL run after the 2024-12-31 close (lots entered after it; positions crossing the boundary shown apart); full = the FULL run.`,
        head,
        ...block('training', 'Training 2016-01-04 → 2024-12-31'),
        ...block('validation', 'Validation 2025-01-02 → 2026-10-30 (previously examined history)'),
        ...block('full', 'Full history 2016-01-04 → 2026-10-30'),
        '**Annual P&L and within-year maximum minute drawdown (FULL run):**',
        table(['Year', ...keys.flatMap((k) => [`${k} P&L`, `${k} DD`])], annualRows),
        '**The five worst lots of each (FULL run):**',
        table(['Config', 'Component', 'Entry', 'Exit', 'Reason', 'Sessions held', 'Net', 'MAE'], worst),
        '**By component (FULL run; booked attribution, not causal):**',
        table(['Config', 'Component', 'Lots', 'Wins', 'Losses', 'Booked net', 'Decisions granted / refused'], comp),
        '**Capital-pool conflicts: refused decisions by occupant (FULL run):**',
        table(['Config', 'Refused component', 'Occupant', 'Refusals'], refusals),
        '**Exit reasons (FULL run):**',
        table(['Config', 'Component', 'Exits'], exits),
        '**Changes in trade chronology (matched lots, FULL run; X vs Y):** lots unchanged, retimed exits (same entry, other exit — extended or shortened by the convention), retimed, newly admitted, displaced (Δ net in parentheses).',
        table(
          [
            'X vs Y',
            'Unchanged',
            'Retimed exit',
            'Retimed',
            'Newly admitted',
            'Displaced',
            'Extended',
            'Shortened',
            'Δ net'
          ],
          matchRows
        ),
        '**Trades extended or shortened (same entry, another exit):**',
        table(
          ['X vs Y', 'Component', 'Entry', 'Exit under Y', 'Exit under X', 'Net under Y', 'Net under X', 'Δ'],
          exRows
        ),
        '**Parameter changes of C against New L0 (A):**',
        paramRows.length ? table(['Parameter', 'New L0 (A)', 'C'], paramRows) : 'none (C is New L0).'
      ]
    );
  }
}

fs.mkdirSync(out, { recursive: true });
for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(out, name), text);
fs.writeFileSync(path.join(out, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
console.log(`tables: ${Object.keys(files).join(', ')} → ${path.relative(repoRoot, out)}`);
