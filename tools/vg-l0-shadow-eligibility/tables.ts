// The report tables of vg-l0-shadow-eligibility (unsealed reporting; PROTOCOL.md §15): Markdown tables and a
// machine-readable summary built only from the sealed records (nothing is evaluated here).
//
//   node --experimental-transform-types tools/vg-l0-shadow-eligibility/tables.ts [--out <results dir>] [--final C24]
//
// Default: the study's results/ (tables into results/tables/). A pilot: --out .cache/vg-l0-shadow-eligibility/pilot/straight
// --final P18 --folds P18.
import fs from 'node:fs';
import path from 'node:path';
import { pct, usd } from '../../src/vg-l0-shadow-eligibility/records.ts';

const args = process.argv.slice(2);
const opt = (k: string, d?: string) => {
  const i = args.indexOf(`--${k}`);

  return i >= 0 ? args[i + 1]! : d;
};
const repo = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(repo, opt('out', 'research/vg-l0-shadow-eligibility/results')!);
const study = out.endsWith(path.join('vg-l0-shadow-eligibility', 'results'));
const researchDir = study ? path.dirname(out) : out;
const FIN = opt('final', 'C24')!;
const FOLDS = (opt('folds', 'C19,C21,C23') ?? '').split(',').filter(Boolean);
const tdir = path.join(out, 'tables');
const tracks = ['A1', 'A2', 'B1', 'B2'] as const;
type Track = (typeof tracks)[number];
const finalKey = (t: Track) => (t === 'A2' || t === 'B2' ? `${t}-g` : t);
const searchKeys = (t: Track) => (t === 'A2' || t === 'B2' ? [`${t}-d1`, `${t}-g`] : [t]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;
const read = (...p: string[]): J | null => {
  const f = path.join(out, ...p);

  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
};
const num = (x: unknown) => (typeof x === 'number' ? x : Number.NaN);
const n0 = (x: number) => (Number.isFinite(x) ? Math.round(x).toLocaleString('en-US') : '—');
const sgn = (x: number) => (Number.isFinite(x) ? `${x >= 0 ? '+' : '−'}${usd(Math.abs(x)).replace('$', '$')}` : '—');
const table = (head: string[], rows: (string | number)[][]) =>
  [
    `| ${head.join(' | ')} |`,
    `|${head.map((h, i) => (i === 0 ? '---' : '---:')).join('|')}|`,
    ...rows.map((r) => `| ${r.join(' | ')} |`)
  ].join('\n');
const shLabel = (sh: string) =>
  sh === '000' ? 'all OFF' : ['D1·GDX', 'D1·VGT', 'Growth·VGT'].filter((_b, i) => sh[i] === '1').join(' + ');
const files: Record<string, string> = {};
const summary: Record<string, unknown> = { generated: new Date().toISOString(), out: path.relative(repo, out) };
const write = (name: string, title: string, body: string) => {
  files[name] =
    `# ${title}\n\nGenerated from the sealed records by \`tools/vg-l0-shadow-eligibility/tables.ts\` (not sealed).\n\n${body}\n`;
};

// ----- 1. the fixed-parameter comparison -----
{
  const p2 = read('phase2', 'fixed-parameter.json');

  if (p2) {
    const rows: J[] = p2.rows;
    const off = rows.find((r) => r.sh === '000');
    const body: string[] = [];

    body.push(
      '## 1. The eight combinations on New L0’s frozen parameters (development 2016-01-04 → 2024-12-31, D24)\n',
      table(
        [
          'Combination',
          'Net',
          'Δ vs all OFF',
          'Max minute DD',
          'Lots',
          'Win rate',
          'Episodes',
          'Persisted to a release',
          'Recovered (delayed lots)',
          'Recovered net',
          'Worst recovered excursion',
          'Decisions displaced',
          'Lots lost vs OFF (their net)',
          'Lots added vs OFF (their net)',
          'Sessions held',
          'Conf. p10',
          'Conf. p90 DD',
          'Qualified',
          'Label vs A'
        ],
        rows.map((r) => [
          `${r.sh} ${r.label}`,
          usd(r.net),
          sgn(r.versusOff.dNet),
          usd(r.dd),
          r.trades.lots,
          pct(r.trades.winRate),
          r.episodes.generated,
          r.episodes.persistedToRelease,
          r.recovered.lots,
          usd(r.recovered.net),
          usd(r.recovered.worstExcursion),
          r.displacedDecisions.count,
          `${r.versusOff.lost.lots} (${usd(r.versusOff.lost.net)})`,
          `${r.versusOff.added.lots} (${usd(r.versusOff.added.net)})`,
          pct(r.utilization.sessionsHeldShare),
          usd(r.evidence.confirmP10),
          usd(r.evidence.confirmP90Dd),
          r.qualified
            ? 'yes'
            : `no (${Object.entries(r.gates)
                .filter(([, v]) => !v)
                .map(([k]) => k)
                .join(',')})`,
          r.sh === '000' ? 'reference (A)' : `${r.labelVsOff.label}${r.labelVsOff.qualifier ? ' *' : ''}`
        ])
      ),
      '\n\\* development improvement (no chronological test applies). Lots lost/added: funded lots matched by book and entry time against all OFF (the actual displacement; never a sum of standalone shadow profits).\n'
    );

    const f = p2.factorial;
    const fr = (name: string, x: J) => [
      name,
      ...['D1·GDX', 'D1·VGT', 'Growth·VGT'].map((k) => sgn(x.alone[k])),
      ...['D1·GDX', 'D1·VGT', 'Growth·VGT'].map((k) => sgn(x.main[k])),
      ...Object.values(x.interactions).map((v) => sgn(v as number))
    ];

    body.push(
      '\n## 2. The 2³ factorial (each toggle alone from all OFF; main effects and interactions = Yates contrasts / 4)\n',
      table(
        [
          'Metric',
          'D1·GDX alone',
          'D1·VGT alone',
          'Growth·VGT alone',
          'main D1·GDX',
          'main D1·VGT',
          'main Growth·VGT',
          'GDX × VGT (D1)',
          'D1·GDX × Growth',
          'D1·VGT × Growth',
          'all three'
        ],
        [
          fr('centre net', f.net),
          fr('max minute DD', f.dd),
          fr('confirmation p10', f.confirmP10),
          fr('confirmation p90 DD', f.confirmP90Dd)
        ]
      )
    );

    const years = Object.keys(off.years);

    body.push(
      '\n## 3. Year by year: P&L difference against all OFF (marked, session closes)\n',
      table(
        ['Combination', ...years],
        rows.filter((r) => r.sh !== '000').map((r) => [r.sh, ...years.map((y) => sgn(r.versusOff.byYear[y]))])
      ),
      '\n## 4. Recovered (delayed) lots’ net by year of entry\n',
      table(
        ['Combination', ...years],
        rows.filter((r) => r.sh !== '000').map((r) => [r.sh, ...years.map((y) => usd(r.recovered.byYear[y] ?? 0))])
      ),
      '\n## 5. Annual P&L and reset minute DD (all OFF and the combination with the highest net)\n'
    );

    const best = [...rows].sort((a, b) => b.net - a.net)[0];

    body.push(
      table(
        ['Year', 'all OFF P&L', 'all OFF DD', `${best.sh} P&L`, `${best.sh} DD`],
        years.map((y) => [
          y,
          usd(off.years[y].net),
          usd(off.years[y].dd),
          usd(best.years[y].net),
          usd(best.years[y].dd)
        ])
      ),
      '\n## 6. Per-strategy attribution (booked P&L: fresh lots / delayed lots)\n',
      table(
        ['Combination', 'D1·GDX', 'D1·VGT', 'Growth·VGT'],
        rows.map((r) => [
          r.sh,
          ...['D1:GDX', 'D1:VGT', 'G:VGT'].map((b) => {
            const a = r.attribution[b];

            return `${usd(a.booked)} (${a.fresh.lots} fresh ${usd(a.fresh.booked)}; ${a.delayed.lots} delayed ${usd(a.delayed.booked)})`;
          })
        ])
      ),
      '\n## 7. Waiting before the delayed entry (sessions from the refused decision)\n',
      table(
        [
          'Combination',
          'Delayed lots',
          'Median',
          'Max',
          'Lost to a fresh entry',
          'Lost to a higher-priority shadow',
          'Expired while occupied',
          'Own-lot refusals'
        ],
        rows
          .filter((r) => r.sh !== '000')
          .map((r) => {
            const w = [...r.recovered.waitSessions].sort((a: number, b: number) => a - b);

            return [
              r.sh,
              w.length,
              w.length ? w[Math.floor((w.length - 1) / 2)] : '—',
              w.length ? w.at(-1) : '—',
              r.episodes.lostToFresh,
              r.episodes.lostToShadow,
              r.episodes.expiredWhileOccupied,
              r.episodes.ownOccupant
            ];
          })
      )
    );
    write(
      'fixed.md',
      'The fixed-parameter shadow-eligibility comparison (New L0 × 8 toggle combinations)',
      body.join('\n')
    );
    summary.fixed = rows.map((r) => ({
      sh: r.sh,
      net: r.net,
      dd: r.dd,
      dNet: r.versusOff.dNet,
      recovered: r.recovered.lots,
      recoveredNet: r.recovered.net,
      displaced: r.displacedDecisions.count,
      qualified: r.qualified,
      label: r.labelVsOff.label,
      confirmP10: r.evidence.confirmP10,
      confirmP90Dd: r.evidence.confirmP90Dd
    }));
    summary.factorial = f;
  }
}

// ----- 2. budgets and coverage -----
const searchRec = (cut: string, key: string) => read('search', cut, `${key}.json`);
const selRec = (cut: string, key: string) => read('folds', cut, key, 'selection.json');
const proposalsOf = (lane: J) =>
  (lane.counts.screenUnique ?? 0) +
  (lane.counts.seedDesigns ?? 0) +
  (lane.counts.islandConfigs ?? 0) +
  (lane.counts.fillers ?? 0);
{
  const rows: (string | number)[][] = [];
  const perTrack: Record<
    string,
    {
      proposals: number;
      requested: number;
      fresh: number;
      hits: number;
      islands: number;
      starts: number;
      moves: number;
      qualFresh: number;
      minutes: number;
    }
  > = {};
  const cov: string[] = [];

  for (const cut of [...FOLDS, FIN])
    for (const t of tracks)
      for (const key of searchKeys(t)) {
        const s = searchRec(cut, key);

        if (!s) continue;

        const lanes: J[] = s.lanes;
        const proposals = lanes.reduce((a, l) => a + proposalsOf(l), 0);
        const islands = lanes.reduce((a, l) => a + l.islands.length, 0);
        const starts = lanes.reduce((a, l) => a + l.refinements.length, 0);
        const moves = lanes.reduce((a, l) => a + (l.counts.refineMoves ?? 0), 0);
        const requested = lanes.reduce((a, l) => a + l.requested, 0);
        const stops: Record<string, number> = {};

        for (const l of lanes) stops[l.extension.stop] = (stops[l.extension.stop] ?? 0) + 1;

        const q = selRec(cut, key);
        const T = (perTrack[t] ??= {
          proposals: 0,
          requested: 0,
          fresh: 0,
          hits: 0,
          islands: 0,
          starts: 0,
          moves: 0,
          qualFresh: 0,
          minutes: 0
        });

        T.proposals += proposals;
        T.requested += requested;
        T.fresh += s.compute.unique;
        T.hits += s.compute.archiveHits;
        T.islands += islands;
        T.starts += starts;
        T.moves += moves;
        T.minutes += s.minutes;
        T.qualFresh += q?.compute?.unique ?? 0;
        rows.push([
          cut,
          key,
          s.lanesCount,
          n0(proposals),
          islands,
          `${starts} / ${n0(moves)}`,
          n0(requested),
          n0(s.compute.unique),
          n0(s.compute.archiveHits),
          n0(s.cap ?? NaN),
          `${Math.round(s.minutes)} min`,
          Object.entries(stops)
            .map(([k, v]) => `${v} ${k.split(' (')[0]}`)
            .join('; '),
          q ? `${q.roles[key]?.qualified ?? '—'}/${q.roles[key]?.members ?? '—'} (${n0(q.compute.unique)} fresh)` : '—'
        ]);

        // coverage by toggle combination
        const by: Record<
          string,
          { screened: number; plausible: number; promoted: number; centres: number; feasible: number }
        > = {};

        for (const l of lanes)
          for (const [sh, v] of Object.entries(l.bySh as Record<string, J>)) {
            const b = (by[sh] ??= { screened: 0, plausible: 0, promoted: 0, centres: 0, feasible: 0 });

            for (const k of Object.keys(b) as (keyof typeof b)[]) b[k] += v[k];
          }
        cov.push(
          `\n### ${cut} ${key}\n`,
          table(
            ['Toggles', 'Screened', 'Plausible', 'Promoted', 'Rung-1 centres', 'Feasible (rung 1)'],
            Object.entries(by)
              .sort(([a], [b]) => (a < b ? -1 : 1))
              .map(([sh, v]) => [
                `${sh} ${shLabel(sh)}`,
                n0(v.screened),
                n0(v.plausible),
                n0(v.promoted),
                n0(v.centres),
                n0(v.feasible)
              ])
          )
        );
      }

  const ref3b: Record<string, number> = { C19: 1212750, C21: 1169417, C23: 1178935, C24: 1308569 };

  write(
    'budget.md',
    'Budgets: executed search and qualification effort by track, against Priority 3B and NL0',
    [
      '## 1. Every search job (requested = every evaluation the lanes asked for, archive hits included; fresh = unique fresh simulations of the job)\n',
      table(
        [
          'Cutoff',
          'Job',
          'Lanes',
          'Distinct proposals (executed)',
          'Islands',
          'Refinement starts / moves',
          'Requested',
          'Unique fresh',
          'Archive hits',
          'Cap',
          'Wall',
          'Lane stops',
          'Qualified / members (qualification fresh)'
        ],
        rows
      ),
      '\n## 2. Track totals\n',
      table(
        [
          'Track',
          'Distinct proposals',
          'Islands',
          'Refinement starts / moves',
          'Search requested',
          'Search unique fresh',
          'Archive hits',
          'Qualification fresh',
          'Search + qualification fresh',
          'Search wall'
        ],
        Object.entries(perTrack).map(([t, v]) => [
          t,
          n0(v.proposals),
          v.islands,
          `${v.starts} / ${n0(v.moves)}`,
          n0(v.requested),
          n0(v.fresh),
          n0(v.hits),
          n0(v.qualFresh),
          n0(v.fresh + v.qualFresh),
          `${(v.minutes / 60).toFixed(1)} h`
        ])
      ),
      '\n## 3. Against the references\n',
      table(
        ['Reference', 'Distinct proposals', 'Evaluations', 'Note'],
        [
          [
            'Priority 3B independent search, per cutoff (C19 / C21 / C23 / C24)',
            '131,072 base each (137,216 / 133,120 / 137,216 / 149,504 executed)',
            Object.entries(ref3b)
              .map(([c, v]) => `${c} ${n0(v)}`)
              .join('; '),
            'fresh; V, G, B cells'
          ],
          [
            'Priority 3B independent search + qualification (comparable work)',
            '557,056 executed',
            '4,869,671 + 285,368 = 5,155,039',
            'fresh'
          ],
          ['Priority 3B whole study', '602,111', '5,834,395', 'incl. its informed lanes (679,356)'],
          [
            'NL0: 5B L0 arm (the effective budget that produced New L0)',
            '49,346',
            '489,695 requested search + 64,554 qualification',
            'informed lane 4,034 proposals / 91,030 requested'
          ],
          [
            'This study: B1 / B2 per cutoff (configured base)',
            '131,072',
            '≈ 1.47 M requested (planned)',
            '32 × 3 lanes; 16 × 3 + 2 × 8 × 3 lanes'
          ]
        ]
      )
    ].join('\n')
  );
  write('coverage.md', 'Search coverage by toggle combination (every lane summed per job)', cov.join('\n'));
  summary.budget = perTrack;
}

// ----- 3. selections per cutoff and track -----
const evOf = (sel: J, label: string | null) => (label ? sel?.evidence?.find((e: J) => e.label === label) : null);
const evRow = (e: J) =>
  e
    ? [
        e.sh,
        usd(e.centre.net),
        usd(e.centre.dd),
        e.centre.lots,
        usd(e.select.robust),
        usd(e.confirm.p10),
        usd(e.confirm.p90Dd),
        e.qualified ? 'yes' : `no (${e.failed.join(',')})`,
        e.centre.shadow ? `${e.centre.shadow.recovered} (${usd(e.centre.shadow.recoveredNet)})` : '0'
      ]
    : ['—', '—', '—', '—', '—', '—', '—', '—', '—'];
{
  const body: string[] = [];

  for (const cut of [...FOLDS, FIN]) {
    const rows: (string | number)[][] = [];

    for (const t of tracks) {
      for (const key of searchKeys(t)) {
        const s = selRec(cut, key);

        if (!s) continue;

        const roles = s.roles[key]?.roles ?? {};

        if (key.endsWith('-d1'))
          for (const f of s.finalists ?? [])
            rows.push([key, `D1 finalist F${f.index} (${f.role})`, f.label, ...evRow(evOf(s, f.label))]);
        else
          for (const r of ['actual-profit', 'robust-profit', 'balanced', 'lower-drawdown'])
            rows.push([
              key,
              r === 'actual-profit' ? `**primary** (${r})` : r,
              roles[r] ?? '—',
              ...evRow(evOf(s, roles[r] ?? null))
            ]);
      }
    }
    if (rows.length)
      body.push(
        `\n## ${cut}\n`,
        table(
          [
            'Job',
            'Role',
            'Member',
            'Toggles',
            'Centre net',
            'Centre DD',
            'Lots',
            'Selection robust',
            'Conf. p10',
            'Conf. p90 DD',
            'Qualified',
            'Recovered lots (net)'
          ],
          rows
        )
      );

    // seed-level variability
    const vr: (string | number)[][] = [];

    for (const t of tracks) {
      const key = finalKey(t);
      const s = selRec(cut, key);

      if (!s) continue;

      const bests = Object.entries(s.roles as Record<string, J>)
        .filter(([k]) => new RegExp(`^${key} R\\d+$`).test(k))
        .map(([, v]) => evOf(s, v.roles['actual-profit'])?.centre.net)
        .filter((x): x is number => typeof x === 'number')
        .sort((a, b) => b - a);

      if (bests.length)
        vr.push([
          key,
          bests.length,
          usd(bests[0]!),
          usd(bests[Math.floor((bests.length - 1) / 2)]!),
          usd(bests.at(-1)!),
          usd(bests[0]! - bests.at(-1)!)
        ]);
    }
    if (vr.length)
      body.push(
        `\n### ${cut}: search variability (each replicate's own actual-profit holder)\n`,
        table(['Job', 'Replicates with a qualified member', 'Best', 'Median', 'Worst', 'Spread'], vr)
      );
  }
  write(
    'selections.md',
    'Selections by cutoff, track and step (roles, D1 finalists, search variability)',
    body.join('\n')
  );
}

// ----- 4. folds and sequential paths -----
{
  const body: string[] = [];

  for (const cut of FOLDS) {
    const e = read('folds', cut, 'evaluation.json');

    if (!e) continue;
    body.push(
      `\n## ${cut} → slice ${e.slice.join(' → ')}\n`,
      table(
        ['Row', 'Track', 'Roles', 'Toggles', 'Slice net', 'Slice DD', 'Whole-run DD'],
        e.rows.map((r: J) => [
          r.label,
          r.track ?? 'control',
          r.role.split(',').slice(0, 4).join(', '),
          r.sh,
          usd(r.sliceNet),
          usd(r.sliceDd),
          usd(r.wholeDd)
        ])
      )
    );
  }

  const seq = read('folds', 'sequential.json');

  if (seq) {
    body.push(
      '\n## The sequential paths (2020–2024; switch charge 5 bps on $100,000 per lot closed or adopted)\n',
      table(
        ['Path', 'Folds (primary: slice net)', 'Net', 'Sequential DD', 'Verdict'],
        [
          ...seq.procedures.map((p: J) => [
            `**${p.procedure.name}**`,
            p.procedure.parts.map((x: J) => `${x.fold}: ${x.label ?? 'none'} ${usd(x.sliceNet)}`).join('; '),
            usd(p.procedure.net),
            usd(p.procedure.sequentialDd),
            p.verdict.split(' (')[0]
          ]),
          ...seq.procedures.flatMap((p: J) =>
            p.policies
              .slice(1, 4)
              .map((x: J) => [
                x.name,
                '',
                usd(x.net),
                usd(x.sequentialDd),
                x.withinCeiling ? 'DD within' : 'DD > $35,000'
              ])
          ),
          ...seq.fixed.map((x: J) => [
            x.name,
            '',
            usd(x.net),
            usd(x.sequentialDd),
            x.withinCeiling ? 'DD within' : 'DD > $35,000'
          ])
        ]
      )
    );

    const reps = seq.procedures.map((p: J) => {
      const rs = p.policies.filter((x: J) => /replicate R\d+ alone/.test(x.name));

      return [
        p.track,
        rs.length,
        rs.filter((x: J) => x.net > 0 && x.withinCeiling).length,
        usd(Math.min(...rs.map((x: J) => x.net))),
        usd(Math.max(...rs.map((x: J) => x.net))),
        usd(Math.max(...rs.map((x: J) => x.sequentialDd)))
      ];
    });

    body.push(
      '\n### Replicate-level paths (each replicate’s own actual-profit holder per fold; reporting only)\n',
      table(
        ['Procedure', 'Replicate paths', 'Net > 0 and DD ≤ $35,000', 'Lowest net', 'Highest net', 'Largest DD'],
        reps
      )
    );
    summary.sequential = Object.fromEntries(
      seq.procedures.map((p: J) => [
        p.track,
        { verdict: p.verdict, net: p.procedure.net, dd: p.procedure.sequentialDd }
      ])
    );
  }
  write('folds.md', 'Folds and the chronological procedure test (fresh tracks)', body.join('\n'));
}

// ----- 5. the frozen labels and the decompositions -----
const fz = study
  ? fs.existsSync(path.join(researchDir, 'FROZEN_SELECTION.json'))
    ? JSON.parse(fs.readFileSync(path.join(researchDir, 'FROZEN_SELECTION.json'), 'utf8'))
    : null
  : read('FROZEN_SELECTION.json');
{
  if (fz) {
    const body: string[] = [];

    body.push(
      `Nominee (the actual-profit role of the final selectable set): **${fz.nominee.label}**${fz.nominee.isUnchangedControl ? ` (an unchanged control: ${fz.nominee.isUnchangedControl})` : ''}.\n`,
      table(
        ['Track', 'Primary'],
        Object.entries(fz.trackPrimaries as Record<string, J>).map(([t, v]) => [t, v.label ?? 'none'])
      ),
      '\n## Frozen comparison labels (development and folds only; computed before FULL opened)\n',
      table(
        ['Comparison', 'X net', 'Y net', 'Dev', 'Risk', 'Chron', 'Label'],
        Object.entries(fz.comparisonLabels as Record<string, J>).map(([k, v]) => [
          k,
          usd(v.x?.net),
          usd(v.y?.net),
          v.dev,
          v.risk,
          v.chronApplies ? v.chron : 'n/a',
          `${v.label}${v.qualifier ? ` (${v.qualifier})` : ''}`
        ])
      ),
      '\n## Decompositions (D24 centres): X − A = toggles on New L0 + parameters with toggles OFF + interaction\n',
      table(
        [
          'Row',
          'Exported as',
          'Toggles',
          'Total (X − A)',
          'Toggles effect on New L0',
          'Parameters (X all OFF − A)',
          'Interaction',
          'Eligibility within X',
          'Driver'
        ],
        (fz.decompositions as J[]).map((d) => [
          d.row,
          d.exportedBy
            .map((b: J) => b.roles.join('/'))
            .join('; ')
            .slice(0, 80),
          d.sh,
          sgn(d.total),
          sgn(d.toggles),
          sgn(d.parameters),
          sgn(d.interaction),
          sgn(d.eligibilityWithinX),
          d.driver
        ])
      )
    );
    write('labels.md', 'The frozen selection: nominee, track primaries, labels and decompositions', body.join('\n'));
    summary.frozen = {
      nominee: fz.nominee.label,
      trackPrimaries: Object.fromEntries(
        Object.entries(fz.trackPrimaries as Record<string, J>).map(([t, v]) => [t, v.label])
      ),
      labels: Object.fromEntries(Object.entries(fz.comparisonLabels as Record<string, J>).map(([k, v]) => [k, v.label]))
    };
  }
}

// ----- 5b. phenotypes of the frozen selections against New L0 -----
{
  if (fz) {
    const subjects: [string, J][] = [
      ['A: New L0', fz.A.evidence],
      ...(Object.entries(fz.trackPrimaries as Record<string, J>).map(([t, v]) => [`${t} primary`, v.evidence]) as [string, J][]),
      ['nominee', fz.nominee.evidence]
    ];
    const d1Keys = ['targetPercentChange', 'trailingBuyPercentage', 'trailingStopPercentage', 'maximumHoldDays', 'tickWindowSize', 'intradayLossBuffer', 'pullback', 'continuationWindow'];
    const d1 = (e: J, s: string) => (e ? `[${d1Keys.map((k) => e.settings.d1[s].grid[k]).join(',')}]` : '—');
    const g = (e: J) => {
      const x = e?.settings.growth.VGT;

      if (!x?.enabled) return 'disabled';

      const c = x.effective;

      return [
        `${c.entryMethod === 'trend_breakout' ? 'breakout' : `rise ${c.advanceFromRecentLowPercent}%/${c.recentLowLookbackBars}`}`,
        `trail ${c.trailingStopPercent}%`,
        c.maximumHoldEnabled ? `hold ${c.maximumHoldDays} d` : 'hold off',
        c.trendFilterEnabled ? 'trend on' : '',
        c.eligibilityEnabled ? `elig ${c.eligibilityPolicy ?? ''} ${c.eligibilityMaxAgeSessions ?? ''}` : '',
        c.drawdownRecoveryGateEnabled
          ? `gate dip ${c.dipThresholdPercent}%/${c.dipLookbackSessions} rec ${c.recoveryRetracementPercent}% conf ${c.recoveryConfirmationSessions}`
          : '',
        c.initialStopEnabled ? `istop ${c.initialStopAtrSessions}×${c.initialStopAtrMultiple}` : '',
        c.retentionEnabled ? 'retain' : '',
        c.continuationEnabled
          ? `cont ${c.continuationMethod ?? ''} ${c.continuationWindowSessions ?? ''}${c.continuationMethod === 'classic_d1' ? ` pb ${c.classicPullbackPercent}% rb ${c.classicReboundPercent}%` : ''}`
          : '',
        `id ${x.identity}`
      ]
        .filter(Boolean)
        .join(', ');
    };

    write(
      'phenotypes.md',
      'Phenotypes of the frozen selections against New L0',
      [
        'D1 vectors: [X, Y, stop, hold, L, buffer, P, W] in tenths of a percentage point; hold in calendar days; L and W in sessions.\n',
        table(
          ['Subject', 'Label', 'Toggles', 'D1·VGT', 'D1·GDX', 'Growth·VGT', 'Centre net', 'Centre DD'],
          subjects.map(([n, e]) => [n, e?.label ?? '—', e ? `${e.sh} ${shLabel(e.sh)}` : '—', d1(e, 'VGT'), d1(e, 'GDX'), g(e), usd(e?.net), usd(e?.dd)])
        )
      ].join('\n')
    );
  }
}

// ----- 6. the ablation matrix -----
{
  const a = read('ablation', FIN, 'matrix.json');

  if (a) {
    const combos = ['000', '100', '010', '001', '110', '101', '011', '111'];
    const body: string[] = [
      '## Centre net of each exported phenotype under every toggle combination (its own marked *)\n',
      table(
        ['Row', 'Exported as', ...combos],
        (a.matrix as J[]).map((m) => [
          m.row,
          (m.control ? `control ${m.control}` : m.exportedBy.map((b: J) => b.roles[0]).join('; ')).slice(0, 60),
          ...combos.map((c) => (m.cells[c] ? `${usd(m.cells[c].net)}${c === m.own ? ' *' : ''}` : '—'))
        ])
      ),
      '\n## Principal rows: confirmation (3 × 128) and the own top-episode blackout\n',
      table(
        [
          'Row',
          'Toggles',
          'Own',
          'Conf. median',
          'Conf. p10',
          'p90 DD',
          'p95 DD',
          'Worst-10% mean DD',
          'Breach share [Wilson 95%]',
          'Mean excess',
          'Worst DD',
          'Top episode (net)',
          'Net without it (blackout)'
        ],
        (a.principal as J[]).map((p) => [
          p.row,
          p.sh,
          p.own ? 'yes' : 'no',
          usd(p.confirm.median),
          usd(p.confirm.p10),
          usd(p.confirmTail.p90Dd),
          usd(p.confirmTail.p95Dd),
          usd(p.confirmTail.worst10Mean),
          `${pct(p.confirmTail.breachShare)} [${pct(p.confirmTail.breachInterval[0])}–${pct(p.confirmTail.breachInterval[1])}]`,
          usd(p.confirmTail.meanExcess),
          usd(p.confirmTail.worstDd),
          p.topEpisode ? `${p.topEpisode.first} → ${p.topEpisode.last} (${usd(p.topEpisode.net)})` : '—',
          p.blackout ? usd(p.blackout.net) : '—'
        ])
      )
    ];

    write('ablation.md', `The ${FIN} ablation: phenotype × toggles (report-only)`, body.join('\n'));
  }
}

// ----- 7. diagnostics -----
{
  const d = read('diagnostics', 'diagnostics.json');

  if (d) {
    const body: string[] = [
      '## Matched funded lots (by book and entry time) against New L0 (all OFF) and against the same phenotype with every toggle OFF\n',
      table(
        [
          'Subject',
          'Net',
          'DD',
          'Δ vs New L0',
          'Lots in both (Δ net)',
          'Only here (net; delayed)',
          'Only in New L0 (net)',
          'Δ vs own OFF',
          'Only here vs own OFF (net; delayed)',
          'Only in own OFF (net)'
        ],
        (d.subjects as J[]).map((s) => [
          s.name,
          usd(s.net),
          usd(s.dd),
          sgn(s.versusNewL0.dNet),
          `${s.versusNewL0.both.lots} (${sgn(s.versusNewL0.both.netDifference)})`,
          `${s.versusNewL0.onlyX.lots} (${usd(s.versusNewL0.onlyX.net)}; ${s.versusNewL0.onlyX.delayed} delayed ${usd(s.versusNewL0.onlyX.delayedNet)})`,
          `${s.versusNewL0.onlyY.lots} (${usd(s.versusNewL0.onlyY.net)})`,
          s.versusOwnOff ? sgn(s.versusOwnOff.dNet) : '—',
          s.versusOwnOff
            ? `${s.versusOwnOff.onlyX.lots} (${usd(s.versusOwnOff.onlyX.net)}; ${s.versusOwnOff.onlyX.delayed} delayed ${usd(s.versusOwnOff.onlyX.delayedNet)})`
            : '—',
          s.versusOwnOff ? `${s.versusOwnOff.onlyY.lots} (${usd(s.versusOwnOff.onlyY.net)})` : '—'
        ])
      ),
      '\n## Per-strategy attribution and participation (booked P&L; fresh / delayed lots; decisions, refusals, episodes)\n',
      table(
        [
          'Subject',
          'Book',
          'Booked',
          'Fresh lots (net)',
          'Delayed lots (net)',
          'Decisions',
          'Refused',
          'Episodes',
          'Recovered',
          'Principal-days'
        ],
        (d.subjects as J[]).flatMap((s) =>
          Object.entries(s.participation as Record<string, J>).map(([b, p]) => [
            s.name,
            b,
            usd(p.booked),
            `${s.attribution[b].fresh.lots} (${usd(s.attribution[b].fresh.booked)})`,
            `${s.attribution[b].delayed.lots} (${usd(s.attribution[b].delayed.booked)})`,
            p.decisions,
            p.refused,
            p.episodes,
            p.recovered,
            n0(p.principalDays)
          ])
        )
      ),
      '\n## Trades, utilization and concentration\n',
      table(
        [
          'Subject',
          'Lots',
          'Win rate',
          'Gross',
          'Costs',
          'Interest',
          'Worst trade',
          'Worst adverse excursion',
          'Largest win / net',
          'Top five wins / net',
          'Sessions held',
          'Principal-days share',
          'Delayed principal-days share'
        ],
        (d.subjects as J[]).map((s) => [
          s.name,
          s.trades.lots,
          pct(s.trades.winRate),
          usd(s.trades.gross),
          usd(s.trades.costs),
          usd(s.trades.interest),
          s.trades.worstTrade ? `${usd(s.trades.worstTrade.net)} (${s.trades.worstTrade.book})` : '—',
          usd(s.trades.worstAdverseExcursion),
          pct(s.trades.largestWinShare ?? NaN),
          pct(s.trades.topFiveWinShare ?? NaN),
          pct(s.utilization.sessionsHeldShare),
          pct(s.utilization.principalDaysShare),
          pct(s.utilization.delayedPrincipalDaysShare)
        ])
      )
    ];
    const years = Object.keys((d.subjects as J[])[0]?.years ?? {});

    body.push(
      '\n## Annual P&L / reset DD / recovered net (development)\n',
      table(
        ['Subject', ...years],
        (d.subjects as J[]).map((s) => [
          s.name,
          ...years.map((y) => `${usd(s.years[y].net)} / ${usd(s.years[y].dd)} / ${usd(s.years[y].recovered)}`)
        ])
      )
    );
    write('diagnostics.md', `${FIN} diagnostics (D24): mechanism, attribution and concentration`, body.join('\n'));
  }
}

// ----- 8. the validation and the final comparison table -----
{
  const v = read('validation', 'validation.json');

  if (v && fz) {
    const rows: J[] = v.rows;
    const body: string[] = [
      `Validation on previously examined history, not an untouched holdout (door ${v.door}, boundary ${v.boundary}). New L0 reproduced its known figures: **${v.knownNewL0?.reproduced ?? 'n/a'}**.\n`,
      table(
        [
          'Row',
          'Toggles',
          'Development net',
          'Validation P&L',
          'Reset validation DD',
          'Full-history net',
          'Whole-run DD',
          'Lots',
          'Recovered (net)',
          'V1',
          'V2',
          'V3'
        ],
        rows.map((r) => [
          r.name,
          r.sh,
          usd(r.developmentNet),
          usd(r.validationPnl),
          usd(r.validationDd),
          usd(r.fullNet),
          usd(r.wholeDd),
          r.lots,
          r.shadow ? `${r.shadow.recovered} (${usd(r.shadow.recoveredNet)})` : '0',
          r.tests.V1 ? 'pass' : 'FAIL',
          r.tests.V2 ? 'pass' : 'FAIL',
          r.tests.V3 ? 'pass' : 'FAIL'
        ])
      ),
      '\n## Stresses on FULL (report-only)\n',
      table(
        ['Row', 'Stress', 'Validation P&L', 'Validation DD', 'Full net', 'Whole-run DD'],
        (v.stresses as J[]).map((s) => [
          s.name,
          s.stress,
          usd(s.validationPnl),
          usd(s.validationDd),
          usd(s.fullNet),
          usd(s.wholeDd)
        ])
      ),
      '\n## Neighbourhoods on FULL (confirmation rep 1, 128 draws; report-only)\n',
      table(
        [
          'Row',
          'Draws',
          'Median validation P&L',
          'p10',
          'Share > 0',
          'p90 validation DD',
          'p90 whole-run DD',
          'Draws above $35,000'
        ],
        (v.neighbourhoods as J[]).map((n) => [
          n.name,
          n.draws,
          usd(n.medianValidation),
          usd(n.p10Validation),
          pct(n.sharePositive),
          usd(n.p90ValidationDd),
          usd(n.p90WholeDd),
          n.above35k
        ])
      )
    ];

    write('validation.md', 'The validation (FULL, once)', body.join('\n'));
    summary.validation = rows.map((r) => ({
      name: r.name,
      sh: r.sh,
      dev: r.developmentNet,
      validation: r.validationPnl,
      validationDd: r.validationDd,
      full: r.fullNet,
      wholeDd: r.wholeDd,
      tests: r.tests
    }));
  }
}

fs.mkdirSync(tdir, { recursive: true });
for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(tdir, name), text);
fs.writeFileSync(path.join(tdir, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
console.log(`tables: ${Object.keys(files).join(', ')} → ${path.relative(repo, tdir)}`);
