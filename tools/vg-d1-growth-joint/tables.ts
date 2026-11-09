// The report tables of Priority 3 (vg-d1-growth-joint), from the sealed records only (a reporting tool outside the
// study's frozen code closure; it computes nothing new). Run from the repository root:
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-d1-growth-joint/tables.ts \
//     [--root <results dir>] [--final C24|P18] [--out <dir>]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const root = opt('root', 'research/vg-d1-growth-joint/results');
const fin = opt('final', 'C24');
const studyDir = path.dirname(root);
const out = opt('out', path.join(root, 'tables'));
const read = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(d)}%`;
const ddp = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${usd(x)} (${pct(x / 100000)})`);
const table = (head: string[], rows: (string | number)[][]) =>
  `| ${head.join(' | ')} |\n|${head.map((_h, i) => (i === 0 ? '---' : '---:')).join('|')}|\n${rows.map((r) => `| ${r.join(' | ')} |`).join('\n')}\n`;
const books = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'];
const short = (b: string) => b.replace('D1:', 'D1·').replace('G:', 'G·');

const sel = read<Any>(path.join(root, 'folds', fin, 'selection.json'));
const gsel = read<Any>(path.join(root, 'gpair', fin, 'selection.json'));
const frozen = read<Any>(
  fin === 'C24' ? path.join(studyDir, 'FROZEN_SELECTION.json') : path.join(root, 'FROZEN_SELECTION.json')
);
const val = read<Any>(path.join(root, 'validation', 'validation.json'));
const diag = read<Any>(path.join(root, 'diagnostics', 'D24', 'diagnostics.json'));
const seq = read<Any>(path.join(root, 'folds', 'sequential.json'));

fs.mkdirSync(out, { recursive: true });

const evidence = new Map<string, Any>();

for (const e of [...(sel?.evidence ?? []), ...(gsel?.evidence ?? [])]) evidence.set(e.label, e);

const groupOf = (m: Any) =>
  m.label.startsWith('control:')
    ? `control (${(evidence.get(m.label)?.group ?? m.role.replace(/^control \(|\)$/g, '')) as string})`
    : m.role;
const members: Any[] = frozen?.members ?? [];
const valRow = (label: string) => (val?.rows ?? []).find((r: Any) => r.label === label) ?? null;
const devRec = (label: string): Any | null =>
  evidence.get(label)?.centre ?? (diag?.subjects ?? []).find((s: Any) => s.label === label)?.record ?? null;
const files: Record<string, string> = {};

// ----- 1. the main comparison: development, validation, full history -----
{
  const rows = members.map((m) => {
    const d = devRec(m.label);
    const v = valRow(m.label);
    const full = v?.record;

    return [
      `${m.label}${m.label === frozen?.primary ? ' **(primary)**' : ''}`,
      groupOf(m),
      usd(d?.net),
      ddp(d?.dd),
      usd(v?.validationNet),
      ddp(v?.validationDd),
      usd(full?.net),
      ddp(full?.dd),
      full ? `${usd(full.realized)} / ${usd(full.unrealized)}` : '—',
      full
        ? `${full.lots} (${full.wins}/${full.losses}; ${full.partials} partial)`
        : d
          ? `${d.lots} (${d.wins}/${d.losses})`
          : '—',
      full ? usd(full.interest) : '—',
      full ? usd(full.costs) : '—'
    ];
  });

  files['windows.md'] =
    `# Development, validation and full history (fixed $100,000 budget; DD % of $100,000)\n\nValidation 2025-01-02 → ${val?.end ?? '—'} is validation on previously examined history, not an untouched holdout. Validation P&L = the marked change from the 2024-12-31 close in one continuous run; its DD is reset at that close.\n\n` +
    table(
      [
        'Configuration',
        'Role / group',
        'Dev net',
        'Dev DD',
        'Val P&L',
        'Val DD (reset)',
        'Full net',
        'Full DD',
        'Full realized / unrealized',
        'Lots full (W/L)',
        'Interest full',
        'Costs full'
      ],
      rows
    );
}

// ----- 2. full settings -----
files['settings.md'] = `# Full effective settings and identities of every frozen member and control\n\n${members
  .map(
    (m) =>
      `- **${m.label}** (\`${m.id}\`; ${groupOf(m)}; enabled ${m.enabled.map(short).join(', ')}; same-instant priority ${m.quad.first}-first)\n  - ${m.describe}`
  )
  .join('\n')}\n`;

// ----- 3. qualification evidence -----
const evRows = (list: Any[]) =>
  list.map((e) => [
    `${e.label}${e.qualified ? '' : ` (fails ${e.failed.join(',')})`}`,
    usd(e.centre.net),
    usd(e.centre.dd),
    usd(e.select.robust),
    usd(e.select.p90Dd),
    `${usd(e.confirm.median)} / ${usd(e.confirm.p10)}`,
    usd(e.confirm.p90Dd),
    `${pct(e.confirm.breachShare)} (${e.confirm.breaches}; excess ${usd(e.confirm.meanExcess)}; worst ${usd(e.confirm.worstDd)})`,
    `${usd(e.wide.p10)} / ${usd(e.wide.p90Dd)} (${pct(e.wide.breachShare)})`,
    `${e.confirmDraws.unique}/${e.confirmDraws.drawn}, ${e.confirm.distinct} ledgers, ${e.confirm.clipped} clipped`
  ]);

if (sel)
  files[`qualify-${fin}.md`] =
    `# Qualification (${fin}, development door)\n\n` +
    table(
      [
        'Member',
        'Centre net',
        'Centre DD',
        'Sel. robust',
        'Sel. p90 DD',
        'Conf. median / p10',
        'Conf. p90 DD',
        'Conf. breaches',
        'Wide p10 / p90 DD (breach)',
        'Unique draws'
      ],
      evRows(sel.evidence)
    ) +
    `\n## Scopes (128 draws each: p10 net / p90 DD / breach share)\n\n` +
    table(
      ['Member', 'D1 only', 'Growth only', 'VGT only', 'GDX only', 'Small (½ radius)'],
      sel.evidence.map((e: Any) => [
        e.label,
        ...['d1', 'g', 'vgt', 'gdx'].map((s) =>
          e.scopes[s] ? `${usd(e.scopes[s].p10)} / ${usd(e.scopes[s].p90Dd)} / ${pct(e.scopes[s].breachShare)}` : '—'
        ),
        `${usd(e.small.p10)} / ${usd(e.small.p90Dd)}`
      ])
    ) +
    `\n## Stresses (centre net / DD)\n\n` +
    table(
      ['Member', ...Object.keys(sel.evidence[0]?.stress ?? {})],
      sel.evidence.map((e: Any) => [
        e.label,
        ...Object.values(e.stress).map((r: Any) => `${usd(r.net)} / ${usd(r.dd)}`)
      ])
    );

if (gsel)
  files['qualify-gpair.md'] =
    `# Arm B — the Growth pair (Growth-only pool, ${fin})\n\nShortlist (the distinct role holders): ${gsel.shortlist.map((x: Any) => `${x.label} [${x.roles.join(', ')}]`).join('; ')}\n\n` +
    table(
      [
        'Member',
        'Centre net',
        'Centre DD',
        'Sel. robust',
        'Sel. p90 DD',
        'Conf. median / p10',
        'Conf. p90 DD',
        'Conf. breaches',
        'Wide p10 / p90 DD (breach)',
        'Unique draws'
      ],
      evRows(gsel.evidence)
    );

// ----- 4. participation, booked and causal contributions -----
if (sel) {
  const rows = sel.evidence.map((e: Any) => {
    const c = e.centre;
    const total = books.reduce((a, b) => a + c.books[b].principalDays, 0);

    return [
      e.label,
      ...books.map(
        (b) =>
          `${e.participation[b]}: ${c.books[b].lots} lots${c.books[b].partials ? ` (+${c.books[b].partials} partial)` : ''}, ${usd(c.books[b].booked)}, ${pct(total ? c.books[b].principalDays / total : 0, 0)} of principal-days, refused ${c.books[b].refused}`
      ),
      e.familyParticipation
    ];
  });
  const causal = sel.evidence.map((e: Any) => [
    e.label,
    ...[
      'without D1',
      'without Growth',
      'without GDX',
      'without VGT',
      'without D1:GDX',
      'without D1:VGT',
      'without G:GDX',
      'without G:VGT'
    ].map((k) => (e.removal[k] ? usd(e.centre.net - e.removal[k].net) : '—'))
  ]);

  files['participation.md'] =
    `# Participation and contribution (${fin}, development)\n\nBooked = Σ net of the component's funded lots. Causal = the system's net − the same configuration rerun with that family, symbol or component disabled (capital availability changes).\n\n` +
    table(['Member', ...books.map(short), 'Families'], rows) +
    `\n## Causal contributions (net − net without …)\n\n` +
    table(['Member', 'D1', 'Growth', 'GDX', 'VGT', 'D1·GDX', 'D1·VGT', 'G·GDX', 'G·VGT'], causal);
}

// ----- 5. search coverage -----
{
  const arms = ['indep', 'gpair', 'informed'];
  const cutoffs = fin === 'C24' ? ['C19', 'C21', 'C23', 'C24'] : ['P18'];
  let text =
    '# Search coverage, budgets and stopping\n\nCounts: distinct centres; evaluations from the sealed record (fresh + archive hits). Neighbourhood draws are evaluations, not centres.\n\n';
  const rows: (string | number)[][] = [];
  const classRows: (string | number)[][] = [];

  for (const c of cutoffs)
    for (const a of arms) {
      const s = read<Any>(path.join(root, 'search', c, `${a}.json`));

      if (!s) continue;
      for (const l of s.lanes) {
        const k = l.counts;

        rows.push([
          l.key,
          k.screened ?? k.localDesigns ?? 0,
          k.plausible ?? '—',
          k.promoted ?? k.seeds ?? '—',
          `${l.islands.length} (${l.islands.map((i: Any) => `${i.newConfigs}:${i.stop}`).join(', ')})`,
          l.extension.stop,
          k.refineMoves ?? 0,
          k.distinctCentres ?? '—',
          `${k.r1Feasible}/${k.r1Centres}`,
          `${k.r2Feasible}/${k.r2}`,
          `${k.r3Feasible}/${k.r3}`,
          k.shortlist
        ]);
        for (const [cls, v] of Object.entries(l.byClass as Record<string, Any>))
          classRows.push([l.key, cls, v.screened, v.plausible, v.promoted, v.r1Feasible]);
      }
      text += `- ${c} ${a}: ${s.evaluations.fresh.toLocaleString('en-US')} fresh + ${s.evaluations.archiveHits.toLocaleString('en-US')} archive hits, ${s.minutes} min, peak job cgroup ${(s.peaks.cgroup / 2 ** 30).toFixed(2)} GiB\n`;
    }

  files['coverage.md'] =
    `${text}\n` +
    table(
      [
        'Lane',
        'Screened / designs',
        'Plausible',
        'Promoted / seeds',
        'Islands (new:stop)',
        'Extension stop',
        'Refine moves',
        'Distinct centres',
        'R1 feasible',
        'R2 feasible',
        'R3 feasible',
        'Shortlist'
      ],
      rows
    ) +
    `\n## By structural class (screened / plausible / promoted / rung-1 feasible)\n\n` +
    table(['Lane', 'Class', 'Screened', 'Plausible', 'Promoted', 'R1 feasible'], classRows);
}

// ----- 6. roles -----
if (sel) {
  let text = `# Roles and rank orders (${fin})\n\nPrimary (the actual-profit role of the final set): **${sel.primary ?? 'none'}**\n\n`;

  for (const [k, r] of Object.entries(sel.roles as Record<string, Any>)) {
    text += `## ${k} — ${r.set} (${r.reason})\n\n${Object.entries(r.roles)
      .map(([role, l]) => `- ${role}: ${l ?? '—'}`)
      .join('\n')}\n- Pareto (centre net, centre DD, sel. p10, sel. p90 DD): ${r.pareto.join('; ') || '—'}\n\n`;
    text += table(
      ['Rank', 'Member', 'Centre net', 'Sel. robust', 'Sel. p90 DD'],
      r.ranked.map((x: Any) => [x.rank, x.label, usd(x.net), usd(x.robust), usd(x.p90)])
    );
    text += '\n';
  }
  files[`roles-${fin}.md`] = text;
}

// ----- 7. folds and the sequential verdict -----
if (seq) {
  let text = `# Chronological procedure tests (arm D)\n\n**Verdict:** ${seq.verdict}\n\nScope: ${seq.scope}\n\n`;

  for (const c of ['C19', 'C21', 'C23']) {
    const ev = read<Any>(path.join(root, 'folds', c, 'evaluation.json'));
    const s = read<Any>(path.join(root, 'folds', c, 'selection.json'));

    if (!ev || !s) continue;
    text += `## ${c} (slice ${ev.slice.join(' → ')}); primary ${ev.primary ?? 'none'} — ${s.roles.independent.reason}\n\n`;
    text += table(
      ['Member', 'Role', 'Training net / DD', 'Slice P&L', 'Slice DD (reset)', 'Whole DD', 'Open at boundary'],
      ev.rows.map((r: Any) => {
        const e = s.evidence.find((x: Any) => x.label === r.label);

        return [
          r.label,
          r.role,
          e ? `${usd(e.centre.net)} / ${usd(e.centre.dd)}` : '—',
          usd(r.sliceNet),
          usd(r.sliceDd),
          usd(r.wholeDd),
          r.openAtBoundary.join(' ') || '—'
        ];
      })
    );
    text += '\n';
  }
  text += '## Sequential policies 2020–2024 (switch charges included)\n\n';
  text += table(
    ['Policy', '2020–21', '2022–23', '2024', 'Charges', 'Net', 'Sequential minute DD'],
    seq.policies.map((p: Any) => [
      p.name,
      ...p.parts.map((x: Any) => usd(x.sliceNet)),
      usd(p.charges),
      usd(p.net),
      `${usd(p.sequentialDd)}${p.withinCeiling ? '' : ' (> ceiling)'}`
    ])
  );
  files['folds.md'] = text;
}

// ----- 8. diagnostics: refusals, conflicts, idle capacity, ordering, chronology, ablations, matched -----
if (diag) {
  let text =
    '# Development diagnostics (D24, report-only)\n\n## Refused opportunities and idle capacity during unfunded virtual holds\n\n';

  for (const s of diag.subjects) {
    const c = s.refusals.conflicts as Record<string, Any>;

    if (!Object.keys(c).length) continue;
    text += `### ${s.label}\n\n`;
    text += table(
      ['Conflict', 'Refusals', 'Refused virtual net (descriptive)', 'Idle sessions during the unfunded holds'],
      Object.entries(c).map(([k, v]) => [k, v.refusals, usd(v.virtualNet), v.idleSessions])
    );
    text += '\n';
  }
  text += '## Same-instant decisions (does the tie order decide a funding?)\n\n';
  text += table(
    ['Subject', 'Same-instant groups', 'Groups where the order decided a funding'],
    diag.subjects.map((s: Any) => [s.label, s.sameInstant.groups, s.sameInstant.decisive])
  );
  text += '\n## Exposure and holding\n\n';
  text += table(
    [
      'Subject',
      'Sessions held',
      ...books.map((b) => `${short(b)} sessions at close`),
      ...books.map((b) => `${short(b)} mean / median days`)
    ],
    diag.subjects.map((s: Any) => [
      s.label,
      `${s.exposure.sessionsHeld} / ${s.exposure.sessions}`,
      ...books.map((b) => s.exposure.bySessionsHeldAtClose[b]),
      ...books.map((b) => (s.holding[b] ? `${s.holding[b].meanDays} / ${s.holding[b].medianDays}` : '—'))
    ])
  );
  text += '\n## Funded-trade chronology (entry date, component, net)\n\n';
  for (const s of diag.subjects.filter((x: Any) => !x.label.startsWith('control: VGT only')))
    text += `- **${s.label}**: ${s.chronology.join('; ') || '—'}\n`;
  for (const [k, a] of Object.entries(diag.ablations as Record<string, Any>)) {
    if (!a) continue;
    text += `\n## Ablations — ${k}: ${a.label}\n\n`;
    if (a.topEpisode)
      text += `Largest winning episode: ${a.topEpisode.first} → ${a.topEpisode.last}, ${usd(a.topEpisode.net)} (${a.topEpisode.lots} lots); arithmetic removal ${usd(a.topEpisode.arithmeticRemoval)}.\n\n`;
    text += table(
      ['Variant', 'Net', 'DD', 'Lots (D1·GDX/D1·VGT/G·GDX/G·VGT)', 'Same ledger', 'Δ net'],
      a.variants.map((v: Any) => [
        v.name,
        usd(v.net),
        usd(v.dd),
        books.map((b) => v.lotsBy[b]).join('/'),
        v.sameLedger ? 'yes' : 'no',
        usd(v.delta)
      ])
    );
  }
  if (diag.matched) {
    text += '\n## Matched trades: the primary − each subject (development)\n\n';
    text += table(
      ['Other', 'Δ net', 'Unchanged', 'Retimed', 'Newly admitted', 'Displaced', 'Check'],
      diag.matched.map((m: Any) => [
        m.y,
        usd(m.delta),
        `${m.summary.unchanged.lots} (${usd(m.summary.unchanged.delta)})`,
        `${m.summary.retimed.lots + m.summary['retimed exit'].lots} (${usd(m.summary.retimed.delta + m.summary['retimed exit'].delta)})`,
        `${m.summary['newly admitted'].lots} (${usd(m.summary['newly admitted'].delta)})`,
        `${m.summary.displaced.lots} (${usd(m.summary.displaced.delta)})`,
        usd(m.check)
      ])
    );
  }
  files['diagnostics.md'] = text;
}

// ----- 9. validation -----
if (val) {
  let text = `# Validation (${val.door}, boundary ${val.boundary}, end ${val.end})\n\n${val.label}\n\n`;

  text += table(
    [
      'Member',
      'Role',
      'V1 P&L > 0',
      'V2 val DD ≤ $35k',
      'V3 whole DD ≤ $35k',
      'Val P&L (realized)',
      '2025',
      '2026',
      'Whole DD and dates',
      'Lots after boundary'
    ],
    val.rows.map((r: Any) => {
      const t = val.tests.members[r.label];

      return [
        r.label,
        r.role,
        t.V1 ? 'pass' : 'FAIL',
        t.V2 ? 'pass' : 'FAIL',
        t.V3 ? 'pass' : 'FAIL',
        `${usd(r.validationNet)} (${usd(r.validationRealized)})`,
        usd(r.years['2025'] ?? 0),
        usd(r.years['2026'] ?? 0),
        `${usd(r.wholeDd)}: ${r.wholeDdPeak} → ${r.wholeDdTrough}, recovered ${r.ddRecovery}`,
        books.map((b) => r.lotsAfterBy[b]).join('/')
      ];
    })
  );
  text += '\n## V5 and stresses on the validation door (report-only)\n\n';
  text += table(
    [
      'Member',
      'Neighbours',
      'Val median / p10',
      'Positive share',
      'Val DD breaches',
      '10 bps',
      '20 bps',
      '14% interest'
    ],
    Object.entries(val.perturbations as Record<string, Any>).map(([l, p]) => [
      l,
      p.neighbours,
      `${usd(p.validationMedian)} / ${usd(p.validationP10)}`,
      pct(p.positiveShare),
      p.validationDdBreaches,
      usd(p.stress['cost 10 bps'].validationNet),
      usd(p.stress['cost 20 bps'].validationNet),
      usd(p.stress['interest 14%'].validationNet)
    ])
  );
  text += `\n## Known full-history targets (compared here only)\n\n\`\`\`\n${JSON.stringify(val.targets, null, 1)}\n\`\`\`\n`;
  text += '\n## Annual P&L (whole run)\n\n';

  const years = [...new Set(val.rows.flatMap((r: Any) => Object.keys(r.years)))].sort() as string[];

  text += table(
    ['Member', ...years],
    val.rows.map((r: Any) => [r.label, ...years.map((y) => usd(r.years[y] ?? 0))])
  );
  files['validation.md'] = text;
}

for (const [f, t] of Object.entries(files)) fs.writeFileSync(path.join(out, f), t);
console.log(`tables: ${Object.keys(files).join(', ')} → ${out}`);
