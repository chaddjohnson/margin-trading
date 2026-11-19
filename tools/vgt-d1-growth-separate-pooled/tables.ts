// Report tables of the Priority 2 follow-up (a report helper: reads the sealed records, writes Markdown into
// research/vgt-d1-growth-separate-pooled/results/tables/; never touches a sealed record).
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vgt-d1-growth-separate-pooled/tables.ts
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const dir = path.join(root, 'research', 'vgt-d1-growth-separate-pooled');
const out = path.join(dir, 'results', 'tables');
const cmp = JSON.parse(fs.readFileSync(path.join(dir, 'results', 'comparison.json'), 'utf8'));
const nb = fs.existsSync(path.join(dir, 'results', 'neighbourhood.json'))
  ? JSON.parse(fs.readFileSync(path.join(dir, 'results', 'neighbourhood.json'), 'utf8'))
  : null;

const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : NaN);
const usd = (x: unknown) => {
  const v = num(x);

  return Number.isFinite(v)
    ? `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
};
const pct = (x: unknown, d = 1) => (Number.isFinite(num(x)) ? `${(num(x) * 100).toFixed(d)}%` : '—');
const ddp = (x: unknown) => (Number.isFinite(num(x)) ? `${(num(x) / 1000).toFixed(1)}%` : '—'); // $ ÷ $100,000
const table = (head: string[], rows: (string | number)[][], align?: string[]) =>
  `| ${head.join(' | ')} |\n|${head.map((_h, i) => align?.[i] ?? (i === 0 ? '---' : '---:')).join('|')}|\n${rows
    .map((r) => `| ${r.join(' | ')} |`)
    .join('\n')}\n`;
const write = (name: string, title: string, body: string) => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name), `# ${title}\n\n${body}`);
};

type Subject = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const subjects = cmp.subjects as Record<string, Subject>;
const cases = Object.values(subjects).filter((s) => s.role === 'primary diagnostic' || s.role === 'sensitivity');
const comparators = Object.values(subjects).filter((s) => !cases.includes(s));
const primary = cases[0]!;
const classOf = (key: string) => (cmp.classes as { members: string[] }[]).findIndex((c) => c.members.includes(key)) + 1;

// 1. the windows of every subject
const windowRow = (s: Subject) => {
  const w = s.windows;
  const d = s.D24.record;
  const f = s.FULL.record;

  return [
    s.key,
    usd(w.development.net),
    `${usd(w.development.dd)} (${ddp(w.development.dd)})`,
    usd(w.validation.pnl),
    `${usd(w.validation.ddReset)} (${ddp(w.validation.ddReset)})`,
    usd(w.full.net),
    `${usd(w.full.dd)} (${ddp(w.full.dd)})`,
    `${d.lots} (${d.wins}/${d.losses})`,
    `${f.lots} (${f.wins}/${f.losses})`
  ];
};
const windowHead = [
  'Configuration',
  'Dev net',
  'Dev DD',
  '2025–26 P&L',
  'Val. DD (reset)',
  'Full net',
  'Full DD',
  'Lots dev (W/L)',
  'Lots full (W/L)'
];

write(
  'windows.md',
  'Development, validation and full history (one fixed $100,000 budget; DD % of $100,000)',
  `Development = D24, 2016-01-04 → 2024-12-31. Validation = the marked change from the 2024-12-31 close in the continuous FULL run, through 2026-10-30. Full = 2016-01-04 → 2026-10-30.\n\n## The six cases (behavioural class in brackets)\n\n${table(
    windowHead,
    cases.map((s) => [`${s.key} [${classOf(s.key)}]`, ...windowRow(s).slice(1)])
  )}\n## Comparators (Priority 2's frozen records, recomputed and verified equal)\n\n${table(windowHead, comparators.map(windowRow))}`
);

// 2. detail: splits, costs, exposure, refusals, open positions, families
const detailRow = (s: Subject, w: 'D24' | 'FULL') => {
  const v = s[w];
  const r = v.record;
  const e = v.exposure;

  return [
    s.key,
    usd(r.realized),
    usd(r.unrealized),
    usd(r.interest),
    usd(r.costs),
    usd(r.lossSum),
    pct(e.heldShare),
    String(e.sessionsBoth),
    usd(e.meanPrincipal),
    usd(e.peakMarketValue),
    `${r.fam.D1.lots} / ${r.fam.G.lots}`,
    `${usd(r.fam.D1.booked)} / ${usd(r.fam.G.booked)}`,
    `${r.fam.D1.refused} / ${r.fam.G.refused}`,
    String(v.downsized),
    v.open.length ? v.open.map((l: Subject) => `${l.family} ${usd(l.unrealized)}`).join('; ') : '—'
  ];
};
const detailHead = [
  'Configuration',
  'Realized',
  'Unrealized',
  'Interest',
  'Costs',
  'Losing lots $',
  'Time held',
  'Both held (sessions)',
  'Mean principal',
  'Peak market value',
  'Lots D1 / G',
  'Booked D1 / G',
  'Refused D1 / G',
  'Downsized',
  'Open at end'
];

write(
  'detail.md',
  'Splits, costs, exposure, families, refusals and open positions',
  `## Development (D24)\n\n${table(
    detailHead,
    [...cases, ...comparators].map((s) => detailRow(s, 'D24'))
  )}\n## Full history (FULL, 2016-01-04 → 2026-10-30)\n\n${table(
    detailHead,
    [...cases, ...comparators].map((s) => detailRow(s, 'FULL'))
  )}\n## Validation window (changes after the 2024-12-31 close)\n\n${table(
    [
      'Configuration',
      'P&L',
      'Δ realized',
      'Δ unrealized',
      'Interest',
      'Costs',
      'Booked D1 / G',
      'Lots entered (W/L)',
      'Crossing lots',
      '2025',
      '2026'
    ],
    [...cases, ...comparators].map((s) => {
      const v = s.windows.validation;

      return [
        s.key,
        usd(v.pnl),
        usd(v.realizedChange),
        usd(v.unrealizedChange),
        usd(v.interest),
        usd(v.costs),
        `${usd(v.bookedD1)} / ${usd(v.bookedG)}`,
        `${v.lotsEntered} (${v.winsEntered}/${v.lossesEntered})`,
        v.crossing.length
          ? v.crossing
              .map((l: Subject) => `${l.family} ${l.entry.slice(0, 10)} → ${l.exit.slice(0, 10)} ${usd(l.net)}`)
              .join('; ')
          : '—',
        usd(v.y2025),
        usd(v.y2026)
      ];
    })
  )}\n## Reconciliation residuals (unrounded; each < $0.005)\n\n${table(
    [
      'Configuration',
      'D24 net − FULL at 2024-12-31',
      'Δrealized + Δunrealized − validation',
      'realized + unrealized − net'
    ],
    [...cases, ...comparators].map((s) => [
      s.key,
      s.windows.checks.continuity.toExponential(2),
      s.windows.checks.validationSplit.toExponential(2),
      s.windows.checks.fullSplit.toExponential(2)
    ])
  )}`
);

// 3. causal removal vs booked
write(
  'removal.md',
  'Causal family removal versus booked family P&L',
  `Causal contribution = net − net of the same configuration rerun with that family disabled (capital availability changes); booked = Σ that family's funded lots.\n\n${table(
    [
      'Configuration',
      'Window',
      'Net',
      'Booked D1',
      'Causal D1',
      'Without D1',
      'Booked Growth',
      'Causal Growth',
      'Without Growth'
    ],
    Object.entries(cmp.removal as Record<string, Record<string, Subject>>).flatMap(([name, r]) => {
      const d = r.D24!;
      const f = r.FULL!;
      const s = subjects[name]!;

      return [
        [
          name,
          'development',
          usd(d.net),
          usd(d.bookedD1),
          usd(d.causalD1),
          usd(d.withoutD1.net),
          usd(d.bookedG),
          usd(d.causalG),
          usd(d.withoutG.net)
        ],
        [
          '',
          'validation',
          usd(s.windows.validation.pnl),
          usd(s.windows.validation.bookedD1),
          usd(f.validationCausalD1),
          usd(f.withoutD1.validation),
          usd(s.windows.validation.bookedG),
          usd(f.validationCausalG),
          usd(f.withoutG.validation)
        ],
        [
          '',
          'full',
          usd(f.net),
          usd(f.bookedD1),
          usd(f.causalD1),
          usd(f.withoutD1.net),
          usd(f.bookedG),
          usd(f.causalG),
          usd(f.withoutG.net)
        ]
      ];
    })
  )}\nIdentity checks: ${JSON.stringify(cmp.identities)}\n`
);

// 4. matched trades and scaling vs path
const kinds = ['unchanged', 'resized', 'retimed exit', 'retimed', 'newly admitted', 'displaced'];
const matchedTable = (key: 'D24' | 'FULL') =>
  table(
    ['Primary pair − other', 'Δ net', ...kinds.map((k) => `${k} (lots, Δ)`), 'check'],
    (cmp.matched[key] as Subject[]).map((m) => [
      m.y,
      usd(m.delta),
      ...kinds.map((k) => (m.summary[k].lots ? `${m.summary[k].lots}, ${usd(m.summary[k].delta)}` : '0')),
      usd(m.check)
    ])
  );
const scalingTable = (key: 'D24' | 'FULL') =>
  table(
    [
      'Primary pair vs',
      'Δ net',
      'Unchanged lots',
      'Altered lots',
      'Resized (proportional)',
      'Scaling Δ',
      'Price-path Δ'
    ],
    (cmp.matched[key] as Subject[])
      .filter((m) => cases.some((c) => c.key === m.y))
      .map((m) => [
        m.y,
        usd(m.delta),
        String(m.scaling.unchangedLots),
        String(m.scaling.alteredTrades),
        `${m.scaling.resizedLots} (${m.scaling.proportionalLots})`,
        usd(m.scaling.scalingDelta),
        usd(m.scaling.pathDelta)
      ])
  );

write(
  'matched.md',
  'Matched trades: the primary pair (A · D1-first) against each comparison',
  `Δ = the primary pair's net − the other's. Lots are matched by family, decision time and entry; Σ Δ reconciles to Δ net (check = 0). Resized = the same trade at a different principal (pure scaling); retimed / newly admitted / displaced = a different price path.\n\n## Development (D24)\n\n${matchedTable('D24')}\n## Full history (FULL)\n\n${matchedTable('FULL')}\n## Architecture and priority sensitivities: scaling versus price path\n\n### Development\n\n${scalingTable('D24')}\n### Full history\n\n${scalingTable('FULL')}`
);

// 5. refusals of the primary pair (lost opportunities)
write(
  'refusals.md',
  'Funding refusals of the primary pair (A · D1-first), full history',
  table(
    ['Family', 'Trade', 'Decision', 'Reason', 'Occupant', 'Virtual net (own $100,000 book)', 'Validation?'],
    (primary.FULL.refusals.list as Subject[]).map((f) => [
      f.family,
      String(f.trade),
      f.decision,
      f.reason,
      f.occupant || '—',
      usd(f.virtualNet),
      f.inValidation ? 'yes' : ''
    ]),
    ['---', '---:', '---', '---', '---', '---:', '---']
  )
);

// 6. annual P&L (full history)
const years = Object.keys(primary.FULL.record.years).sort();
const annualSubjects = [
  primary,
  ...comparators.filter((s) =>
    [
      'joint primary',
      'optimized D1 alone',
      'optimized Growth alone',
      'D1 primary + Growth #4 · A',
      'D1 primary + Growth 08500a60 · A'
    ].includes(s.key)
  )
];

write(
  'annual.md',
  'Marked P&L per calendar year (full continuous run)',
  table(
    ['Configuration', ...years],
    annualSubjects.map((s) => [s.key, ...years.map((y) => usd(s.FULL.record.years[y] ?? 0))])
  )
);

// 7. neighbourhoods on matched definitions
if (nb) {
  const nbRow = (label: string, scope: string, e: Subject) => [
    label,
    scope,
    usd(e.centre?.net ?? e.summary?.net),
    usd(e.select.robust),
    usd(e.select.p90Dd),
    `${usd(e.confirm.median)} / ${usd(e.confirm.p10)}`,
    usd(e.confirm.p90Dd),
    `${pct(e.confirm.breachShare)} (${e.confirm.breaches}); worst ${usd(e.confirm.worstDd)}; excess ${usd(e.confirm.meanExcess)}`,
    e.d1Only ? `${usd(e.d1Only.median)} / ${usd(e.d1Only.p10)} / ${usd(e.d1Only.p90Dd)}` : '—',
    e.gOnly ? `${usd(e.gOnly.median)} / ${usd(e.gOnly.p10)} / ${usd(e.gOnly.p90Dd)}` : '—',
    `${usd(e.small.median)} / ${usd(e.small.p10)}`,
    `${usd(e.wide.median)} / ${usd(e.wide.p10)} / ${usd(e.wide.p90Dd)}; ${pct(e.wide.breachShare)}`
  ];
  const head = [
    'Configuration',
    'Scope',
    'Centre net',
    'Sel. robust',
    'Sel. p90 DD',
    'Conf. median / p10 (384)',
    'Conf. p90 DD',
    'Conf. breaches',
    'D1-only med / p10 / p90 DD',
    'Growth-only med / p10 / p90 DD',
    'Small med / p10',
    'Wide med / p10 / p90 DD; breach'
  ];
  const p = nb.pair.evidence;
  // Priority 2's scope rule (stages.ts: need = the enabled family for a single-family control, scopeOfNeed): the sealed
  // record's descriptive `scope` text is wrong for the three standalone controls (AMENDMENTS E1); derive it here.
  const scopeOf = (r: Subject) =>
    /^control: D1 .* alone$/.test(r.label)
      ? 'D1 only (Growth disabled)'
      : /^control: Growth .* alone$/.test(r.label)
        ? 'Growth only (D1 disabled)'
        : r.scope;

  write(
    'neighbourhood.md',
    'Development neighbourhoods on matched definitions (D24; Priority 2 instrument, seeds C24)',
    `${table(head, [
      nbRow(`**pair ${primary.key}**`, 'joint', p),
      ...(nb.reused as Subject[]).map((r) =>
        nbRow(r.label.replace('control: ', ''), scopeOf(r), { ...r, centre: { net: r.summary.net } })
      )
    ])}\nThe pair: confirmation draws ${p.confirmDraws.drawn} (${p.confirmDraws.unique} unique), clipped ${p.confirm.clipped}, distinct ledgers ${p.confirm.distinct}, equal to the centre ${p.confirm.sameAsCentre}, funding both families ${pct(p.confirm.mixedShare)}; participation ${p.participation}; gates ${JSON.stringify(p.gates)}.\n\nStresses of the pair (centre): ${Object.entries(
      p.stress as Record<string, Subject>
    )
      .map(([k, r]) => `${k} ${usd(r.net)} (DD ${usd(r.dd)})`)
      .join('; ')}.\n\nToggles of the pair: ${Object.entries(p.toggles as Record<string, Subject>)
      .map(([k, r]) => `${k} ${usd(r.net)} (DD ${usd(r.dd)})`)
      .join(
        '; '
      )}.\n\nReproduction of the joint primary's sealed C24 evidence: ${nb.reproduction.equalToSealed ? 'equal in every compared field' : 'DIFFERENT'} (${nb.reproduction.fieldsCompared.length} fields).\n`
  );
}

console.log(`tables written to ${path.relative(root, out)}`);
