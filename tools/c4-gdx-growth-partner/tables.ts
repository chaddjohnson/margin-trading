// Report tables of Priority 3C (written analysis support; Markdown only, no visuals — standard 2.0.0 §7.7). Reads only
// sealed records and writes results/tables/*.md (or a pilot's tables with --pilot NAME). Dollars with commas and two
// decimals; DD % = DD ÷ the fixed $100,000. Arms in the report order: R (C4-refined, the lead), O (C4), G (VGT #4 alone).
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/c4-gdx-growth-partner/tables.ts [--pilot NAME]
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const study = path.join(repoRoot, 'research', 'c4-gdx-growth-partner');
const pilot = process.argv.includes('--pilot') ? process.argv[process.argv.indexOf('--pilot') + 1] : null;
const base = pilot ? path.join(repoRoot, '.cache', 'c4-gdx-growth-partner', 'pilot', pilot) : path.join(study, 'results');
const out = path.join(base, 'tables');
const folds = pilot ? ['P18'] : ['C19', 'C21', 'C23'];
const cuts = pilot ? ['P18'] : ['C19', 'C21', 'C23', 'C24'];
const arms = ['R', 'O', 'G'] as const;
const armName: Record<string, string> = { R: 'R — C4-refined + GDX', O: 'O — C4 + GDX', G: 'G — VGT #4 alone + GDX' };

type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const read = (f: string): J | null => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const num = (x: unknown) => (typeof x === 'string' ? Number(x) : Number(x));
const usd = (x: unknown) => {
  const n = num(x);

  return x === null || x === undefined || !Number.isFinite(n)
    ? '—'
    : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const sgn = (x: unknown) => {
  const n = num(x);

  return Number.isFinite(n) ? `${n > 0 ? '+' : ''}${usd(n)}` : '—';
};
const pct = (x: unknown, d = 1) => (Number.isFinite(num(x)) ? `${(num(x) * 100).toFixed(d)}%` : '—');
const ddPct = (x: unknown) => (Number.isFinite(num(x)) ? `${(num(x) / 1000).toFixed(1)}%` : '—');
const date = (t: unknown) => (Number.isFinite(num(t)) && num(t) > 0 ? new Date(num(t) * 1000).toISOString().slice(0, 10) : '—');
const int = (x: unknown) => (Number.isFinite(num(x)) ? num(x).toLocaleString('en-US') : '—');
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((_h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const write = (name: string, title: string, body: string) => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name), `# ${title}\n\n${body.trim()}\n`);
};
const short = (label: string) => label.replace(/^control: /, '').replace(/^(C19|C21|C23|C24|P18)\//, '');
const kindRank: Record<string, number> = { baseline: 0, control: 1, partner: 2, transfer: 3, context: 4 };
const sortEv = (a: J, b: J) => (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9) || b.centre.net - a.centre.net;
const gates = (e: J) => (e.qualified ? 'qualified' : `fails ${e.failed.join(', ')}`);

// ----- qualification per cutoff (per arm) -----

for (const cut of cuts) {
  const sel = read(path.join(base, 'folds', cut, 'selection.json'));

  if (!sel) continue;

  let body = '';

  for (const arm of arms) {
    const ev: J[] = sel.evidence.filter((e: J) => e.arm === arm).sort(sortEv);
    const a = sel.assessments[arm];
    const lab = (e: J) => a.labels.find((l: J) => l.label === e.label);

    body += `\n## ${armName[arm]}\n\nPrimary (actual-profit): **${short(sel.primaries[arm] ?? 'none')}**. Partner candidate: **${a.partnerCandidate ? short(a.partnerCandidate) : 'none'}**. Economic class: ${a.economicClass}.\n\n`;
    body += table(
      ['Member', 'Origin', 'Centre net', 'Δ net', 'Centre DD', 'GDX lots / booked', 'Sel. robust', 'Conf. median', 'Conf. p10', 'Conf. p90 DD', '> $35k', 'GDX-only p10', 'GDX-only p90 DD', 'Gates', 'Label'],
      ev.map((e) => {
        const l = lab(e);

        return [
          short(e.label),
          e.origin,
          usd(e.centre.net),
          e.kind === 'baseline' ? '—' : sgn(l?.dNet),
          usd(e.centre.dd),
          e.enabled.includes('G:GDX') ? `${e.centre.books['G:GDX'].lots} / ${usd(e.centre.books['G:GDX'].booked)}` : 'OFF',
          usd(e.select.robust),
          usd(e.confirm.median),
          usd(e.confirm.p10),
          usd(e.confirm.p90Dd),
          pct(e.confirm.breachShare),
          e.enabled.includes('G:GDX') ? usd(e.confirmGdx.p10) : '—',
          e.enabled.includes('G:GDX') ? usd(e.confirmGdx.p90Dd) : '—',
          gates(e),
          e.kind === 'baseline' ? 'baseline' : l?.dominates ? 'dominates' : l?.higherProfitTradeOff ? 'higher-profit trade-off' : l?.strongerLocalStability ? 'stronger local stability' : 'no improvement'
        ];
      })
    );
    body += `\n\nRoles: ${Object.entries(sel.roles[arm].roles)
      .map(([k, v]) => `${k} ${v ? short(v as string) : '—'}`)
      .join('; ')}. ${sel.roles[arm].reason}.\n`;
  }

  const ctx: J[] = sel.evidence.filter((e: J) => e.kind === 'context');

  if (ctx.length)
    body += `\n## Contextual controls\n\n${table(
      ['Member', 'Centre net', 'Centre DD', 'Conf. p10', 'Conf. p90 DD', '> $35k', 'Gates'],
      ctx.map((e) => [short(e.label), usd(e.centre.net), usd(e.centre.dd), usd(e.confirm.p10), usd(e.confirm.p90Dd), pct(e.confirm.breachShare), gates(e)])
    )}\n`;

  body += `\nSelection = 2 × 128 whole-portfolio draws (ranking); confirmation = fresh 3 × 128 (qualification only), in the whole-portfolio and GDX-only scopes. Q3/Q4 whole-portfolio; Q7 GDX-only.\n`;
  write(`qualify-${cut}.md`, `Qualification at ${cut} (development, door ${sel.door})`, body);

  // paired increments and tails
  let pb = '';
  let tb = '';

  for (const arm of arms) {
    const a = sel.assessments[arm];

    pb += `\n## ${armName[arm]}\n\n${table(
      ['Member', 'Δ centre net', 'Δ centre DD', 'Paired Δ net median', 'p10', 'p90', 'Rows higher', 'Paired Δ DD median', 'p90', 'Rows with higher DD', 'Breach both / member / baseline', 'GDX-only Δ net median', 'GDX-only p10', 'p90 within draw noise'],
      a.labels
        .filter((l: J) => sel.evidence.find((e: J) => e.arm === arm && e.label === l.label)?.kind !== 'baseline')
        .map((l: J) => [
          short(l.label),
          sgn(l.dNet),
          sgn(l.dDd),
          sgn(l.pairedJoint.medianDeltaNet),
          sgn(l.pairedJoint.p10DeltaNet),
          sgn(l.pairedJoint.p90DeltaNet),
          pct(l.pairedJoint.positiveShare),
          sgn(l.pairedJoint.medianDeltaDd),
          sgn(l.pairedJoint.p90DeltaDd),
          pct(l.pairedJoint.worseDdShare),
          `${l.pairedJoint.bothBreach} / ${l.pairedJoint.memberOnlyBreach} / ${l.pairedJoint.baselineOnlyBreach}`,
          l.pairedGdx ? sgn(l.pairedGdx.medianDeltaNet) : '—',
          l.pairedGdx ? sgn(l.pairedGdx.p10DeltaNet) : '—',
          l.p90WithinFiniteDrawUncertainty ? 'yes' : 'no'
        ])
    )}\n`;
    tb += `\n## ${armName[arm]}\n\n${table(
      ['Member', 'Conf. p90 DD [95% interval]', 'p95 DD', 'Worst-10% mean', '> $35k [Wilson 95%]', 'Mean excess', 'Worst DD', 'Breach ledgers', 'Half radius > $35k', '1.5× radius > $35k', 'GDX-only worst DD', 'Distinct ledgers', 'Clipped draws'],
      sel.evidence
        .filter((e: J) => e.arm === arm)
        .sort(sortEv)
        .map((e: J) => [
          short(e.label),
          `${usd(e.confirm.p90Dd)} [${usd(e.confirmTail.p90Interval[0])}, ${usd(e.confirmTail.p90Interval[1])}]`,
          usd(e.confirmTail.p95Dd),
          usd(e.confirmTail.worst10Mean),
          `${pct(e.confirmTail.breachShare)} [${pct(e.confirmTail.breachInterval[0])}, ${pct(e.confirmTail.breachInterval[1])}]`,
          usd(e.confirmTail.meanExcess),
          usd(e.confirmTail.worstDd),
          int(e.confirmTail.breachLedgers),
          pct(e.smallTail.breachShare),
          pct(e.wideTail.breachShare),
          e.confirmGdxTail ? usd(e.confirmGdxTail.worstDd) : '—',
          int(e.confirm.distinct),
          int(e.confirm.clipped)
        ])
    )}\n`;
  }
  write(`paired-${cut}.md`, `Paired increments over each baseline at ${cut} (identical draws; report-only)`, pb);
  write(`tails-${cut}.md`, `Tail severity at ${cut} (report-only, standard §5.8)`, tb);

  // stresses and causal removals
  let sb = '';

  for (const arm of arms) {
    const ev: J[] = sel.evidence.filter((e: J) => e.arm === arm).sort(sortEv);
    const names = Object.keys(ev[0]?.stress ?? {});

    sb += `\n## ${armName[arm]}\n\n${table(
      ['Member', ...names, 'Causal GDX (net − without G:GDX)'],
      ev.map((e) => [
        short(e.label),
        ...names.map((n) => `${usd(e.stress[n].net)} / ${usd(e.stress[n].dd)}`),
        e.removal['without G:GDX'] ? sgn(e.centre.net - e.removal['without G:GDX'].net) : '—'
      ])
    )}\n`;
  }
  write(`stresses-${cut}.md`, `Stresses (centre net / DD) and the causal GDX contribution at ${cut}`, sb);
}

// ----- the development ledger of the final cutoff (centre runs; exposure, episodes, realized/open) -----

{
  const sel = read(path.join(base, 'folds', pilot ? 'P18' : 'C24', 'selection.json'));

  if (sel) {
    let body = '';

    for (const arm of [...arms, null]) {
      const ev: J[] = sel.evidence.filter((e: J) => e.arm === arm).sort(sortEv);

      if (!ev.length) continue;
      body += `\n## ${arm ? armName[arm] : 'Contextual controls'}\n\n${table(
        [
          'Member',
          'Marked net (realized / open)',
          'Max minute DD (%)',
          'DD peak → trough',
          'Funded lots (wins / losses; partial exits)',
          'Independent episodes',
          'Sessions held',
          'Principal-days ($·days)',
          'Interest / costs',
          'GDX lots / principal-days share'
        ],
        ev.map((e) => {
          const r = e.centre;
          const tot = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'].reduce((a, b) => a + r.books[b].principalDays, 0);

          return [
            short(e.label),
            `${usd(r.net)} (${usd(r.realized)} / ${usd(r.unrealized)})`,
            `${usd(r.dd)} (${ddPct(r.dd)})`,
            `${date(r.ddPeakT)} → ${date(r.ddTroughT)}`,
            `${r.lots} (${r.wins} / ${r.losses}; ${r.partials})`,
            int(r.episodes),
            int(r.sessionsHeld),
            int(tot),
            `${usd(r.interest)} / ${usd(r.costs)}`,
            e.enabled.includes('G:GDX') ? `${r.books['G:GDX'].lots} / ${pct(tot ? r.books['G:GDX'].principalDays / tot : 0)}` : 'OFF'
          ];
        })
      )}\n`;
    }
    write('development.md', `Development centre runs at ${pilot ? 'P18' : 'C24'} (2016-01-04 → ${pilot ? '2018-12-31' : '2024-12-31'})`, body);
  }
}

// ----- coverage and effort -----

{
  let body = '';
  const totals: Record<string, { proposals: number; fresh: number; hits: number }> = {};

  for (const cut of cuts) {
    const s = read(path.join(base, 'search', cut, 'search.json'));

    if (!s) continue;
    body += `\n## ${cut} (door ${s.door}; ${s.minutes} min; ${int(s.compute.fresh)} fresh evaluations, ${int(s.compute.archiveHits)} archive hits; peak cgroup ${(s.peaks.cgroup / 2 ** 30).toFixed(1)} GiB)\n\n`;
    body += table(
      ['Lane', 'Seeds / designs', 'Screened', 'Island proposals', 'Islands (stop)', 'Refine moves', 'Rung-1 centres', 'Plausible→measured', 'Feasible', 'Baseline-equivalent', 'Distinct ledgers (feasible)', 'Shortlist', 'Requested evaluations'],
      s.lanes.map((l: J) => [
        l.key.replace(`${cut}/`, ''),
        `${int(l.counts.seeds ?? 0)} / ${int(l.counts.seedDesigns ?? 0)}`,
        int(l.counts.screened ?? 0),
        int(l.counts.islandConfigs ?? 0),
        `${l.extension.islands} (${l.extension.stop})`,
        int(l.counts.refineMoves ?? 0),
        int(l.counts.r1Centres),
        int(l.counts.r1Measured),
        int(l.counts.r1Feasible),
        int(l.ledgers.baselineEquivalent),
        `${int(l.ledgers.centres)} (${int(l.ledgers.feasible)})`,
        int(l.counts.shortlist),
        int(l.requested)
      ])
    );
    body += `\n\nPer arm (new GDX centre proposals = seeded designs + screened + island proposals; refinement moves apart):\n\n${table(
      ['Arm', 'Planned base / cap', 'Seeded designs', 'Screened', 'Island proposals', 'Total new proposals', 'Refinement moves', 'Requested evaluations'],
      arms.map((arm) => {
        const ls = s.lanes.filter((l: J) => l.arm === arm);
        const sum = (k: string) => ls.reduce((x: number, l: J) => x + (l.counts[k] ?? 0), 0);
        const total = sum('seedDesigns') + sum('screened') + sum('islandConfigs');
        const t = (totals[arm] ??= { proposals: 0, fresh: 0, hits: 0 });

        t.proposals += total;
        return [
          arm,
          `${int(s.proposalPlans[arm].base)} / ${int(s.proposalPlans[arm].cap)}`,
          int(sum('seedDesigns')),
          int(sum('screened')),
          int(sum('islandConfigs')),
          int(total),
          int(sum('refineMoves')),
          int(ls.reduce((x: number, l: J) => x + l.requested, 0))
        ];
      })
    )}\n\nEvaluations by kind (fresh / archive hits): ${Object.entries(s.compute.tallies)
      .map(([k, v]: [string, J]) => `${k} ${int(v.fresh)} / ${int(v.hits)}`)
      .join('; ')}.\n`;
    body += `\nOrigins (rung-1 centres / feasible): ${s.lanes
      .map((l: J) => `${l.key.replace(`${cut}/`, '')}: ${Object.entries(l.byOrigin).map(([o, v]: [string, J]) => `${o} ${v.centres}/${v.feasible}`).join(', ')}`)
      .join('; ')}.\n`;
  }
  body += `\n## All cutoffs\n\n${table(['Arm', 'New GDX centre proposals (4 cutoffs)'], arms.map((a) => [a, int(totals[a]?.proposals ?? 0)]))}\n`;
  for (const cut of cuts) {
    const q = read(path.join(base, 'folds', cut, 'selection.json'));

    if (q) body += `\nQualification ${cut}: ${int(q.compute.fresh)} fresh evaluations, ${int(q.compute.archiveHits)} archive hits, ${q.evidence.length} members.\n`;
  }
  const tr = read(path.join(base, 'transfers', 'transfers.json'));

  if (tr) body += `\nTransfers: ${int(tr.compute.fresh)} fresh evaluations, ${int(tr.compute.archiveHits)} archive hits, ${tr.rows.length} transfers.\n`;
  write('coverage.md', 'Search coverage, effort and stopping', body);
}

// ----- transfers -----

{
  const tr = read(path.join(base, 'transfers', 'transfers.json'));

  if (tr)
    write(
      'transfers.md',
      'Cross-transfers (complete pooled reruns, no tuning; report-only)',
      `${table(
        ['GDX book (source member)', 'From → to', 'Source Δ net vs its baseline', 'Target centre net', 'Δ net vs target baseline', 'Δ DD', 'GDX lots', 'Conf. p10 / p90 DD', 'Paired Δ net median', 'Gates', 'Label in the target arm'],
        tr.rows.map((r: J) => {
          const l = r.versusTargetBaseline;
          const e = tr.evidence.find((x: J) => x.label === r.label);

          return [
            short(r.sourceLabel),
            `${r.from} → ${r.to}`,
            sgn(r.sourceVersusItsBaseline.dNet),
            usd(e.centre.net),
            sgn(l.dNet),
            sgn(l.dDd),
            int(e.centre.books['G:GDX'].lots),
            `${usd(e.confirm.p10)} / ${usd(e.confirm.p90Dd)}`,
            sgn(l.pairedJoint.medianDeltaNet),
            gates(e),
            l.dominates ? 'dominates' : l.higherProfitTradeOff ? 'higher-profit trade-off' : l.strongerLocalStability ? 'stronger local stability' : 'no improvement'
          ];
        })
      )}\n\nTransfer set: ${tr.set.map((t: J) => `${short(t.label)} (${t.from}; ${t.reasons.join(', ')})`).join('; ')}.\n`
    );
}

// ----- diagnostics: the increment decomposition -----

{
  const d = read(path.join(base, 'diagnostics', 'D24', 'diagnostics.json'));

  if (d) {
    const inc = d.subjects.filter((s: J) => s.increment);
    let body = table(
      ['Subject', 'Arm', 'Δ net', 'GDX booked (lots)', 'Newly admitted', 'Displaced', 'Retimed', 'Δ D1 booked', 'Δ VGT Growth booked', 'Δ interest', 'Δ costs', 'Δ open marks', 'Check'],
      inc.map((s: J) => {
        const x = s.increment;
        const m = x.matched;

        return [
          short(s.label),
          s.arm,
          sgn(x.deltaNet),
          `${usd(x.gdxBooked)} (${x.gdxLots})`,
          `${m['newly admitted'].lots} / ${sgn(m['newly admitted'].delta)}`,
          `${m.displaced.lots} / ${sgn(m.displaced.delta)}`,
          `${m.retimed.lots + m['retimed exit'].lots} / ${sgn(m.retimed.delta + m['retimed exit'].delta)}`,
          sgn(x.byBook['D1:GDX'].booked + x.byBook['D1:VGT'].booked),
          sgn(x.byBook['G:VGT'].booked),
          sgn(-x.deltaInterest),
          sgn(-x.deltaCosts),
          sgn(x.deltaOpenMarks),
          usd(x.matchedCheck)
        ];
      })
    );

    body += `\n\nΔ interest and Δ costs are shown as their effect on net (an increase in interest is negative). The matched-lot check is Σ lot deltas − Δ net (0 = reconciled).\n\n## Anchor decisions refused while Growth·GDX held the slot (descriptive; never an achievable sum)\n\n${table(
      ['Subject', 'Arm', 'Refusals', 'Refused virtual net (descriptive)', 'Idle closes during those virtual holds', 'Examples (component, decision, virtual net)'],
      inc.map((s: J) => [
        short(s.label),
        s.arm,
        int(s.increment.anchorRefusalsBehindGdx.count),
        usd(s.increment.anchorRefusalsBehindGdx.virtualNetDescriptive),
        int(s.increment.anchorRefusalsBehindGdx.idleClosesDuringVirtualHolds),
        s.increment.anchorRefusalsBehindGdx.rows
          .slice(0, 4)
          .map((r: J) => `${r.component} ${r.decision.slice(0, 10)} ${usd(r.virtualNet)}`)
          .join('; ')
      ])
    )}\n\n## The increment by development subperiod and its episode dependence\n\n${table(
      ['Subject', 'Arm', '2016–2019', '2020–2021', '2022–2023', '2024', 'Top episode (subject)', 'Share', 'Δ net with the top episode blacked out (both)'],
      inc.map((s: J) => {
        const x = s.increment;

        return [
          short(s.label),
          s.arm,
          ...['2016–2019', '2020–2021', '2022–2023', '2024'].map((k) => sgn(x.bySubperiod[k].delta)),
          x.topEpisode.subject ? `${x.topEpisode.subject.first} → ${x.topEpisode.subject.last} ${usd(x.topEpisode.subject.net)}` : '—',
          x.topEpisode.subject ? pct(x.topEpisode.subject.share) : '—',
          x.blackout ? sgn(x.blackout.deltaNetAfterBlackout) : '—'
        ];
      })
    )}\n\n## Growth·GDX participation (funnel, development)\n\n${table(
      ['Subject', 'Arm', 'Lots', 'Principal-days share', 'Pool idle / held sessions'],
      d.subjects
        .filter((s: J) => s.funnels['G:GDX'])
        .map((s: J) => {
          const r = s.record;
          const tot = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'].reduce((a, b) => a + r.books[b].principalDays, 0);

          return [short(s.label), s.arm ?? 'ctx', int(r.books['G:GDX'].lots), pct(tot ? r.books['G:GDX'].principalDays / tot : 0), `${int(s.poolTime.idle)} / ${int(s.poolTime.held)}`];
        })
    )}\n`;
    write('diagnostics.md', 'Development diagnostics: the increment over each baseline (complete reruns)', body);
  }
}

// ----- folds and the sequential policies (descriptive) -----

{
  let body = '';

  for (const cut of folds) {
    const e = read(path.join(base, 'folds', cut, 'evaluation.json'));

    if (!e) continue;
    body += `\n## ${cut}: slice ${e.slice[0]} → ${e.slice[1]} (door ${e.door})\n\n${table(
      ['Arm', 'Member', 'Roles', 'Slice P&L', 'Slice DD (reset)', 'GDX lots (whole run)', 'Whole-run net / DD'],
      e.rows.map((r: J) => [r.arm, short(r.label), r.roles, usd(r.sliceNet), usd(r.sliceDd), int(r.record.books['G:GDX'].lots), `${usd(r.wholeNet)} / ${usd(r.wholeDd)}`])
    )}\n`;
  }

  const s = read(path.join(base, 'folds', 'sequential.json'));

  if (s)
    for (const arm of arms) {
      const a = s.arms[arm];

      body += `\n## Sequential, ${armName[arm]} (descriptive)\n\nFold primaries: ${a.primaries.map((p: J) => `${p.fold} ${p.primary ? short(p.primary) : 'none'}${p.isBaseline ? ' (baseline)' : ''}`).join('; ')}.\n\n${table(
        ['Policy', 'Net before charges', 'Charges', 'Net', 'Sequential DD', 'DD peak → trough'],
        a.policies.map((p: J) => [p.name, usd(p.netBeforeCharges), usd(p.charges), usd(p.net), usd(p.sequentialDd), `${String(p.ddPeak).startsWith('1970') ? 'the sequence start (2020-01-02)' : p.ddPeak} → ${p.ddTrough}`])
      )}\n\nVerdicts: ${a.verdict.standard}; ${a.verdict.incremental}.\n`;
    }
  if (body) write('folds.md', 'Fixed-anchor repeats at earlier cutoffs (descriptive)', body);
}

// ----- validation -----

{
  const v = read(path.join(base, 'validation', 'validation.json'));

  if (v) {
    let body = '';

    for (const arm of [...arms, null]) {
      const rows = v.rows.filter((r: J) => r.arm === arm);

      if (!rows.length) continue;
      body += `\n## ${arm ? armName[arm] : 'Contextual and native'}\n\n${arm ? `Recommendation (frozen rule): **${v.recommendations[arm]}**\n\n` : ''}${table(
        ['Member', 'Role', 'Development net', 'Validation P&L', 'Reset val. DD', 'Full net (realized / open)', 'Whole-run DD (%)', '2025 / 2026', 'GDX lots after', 'V1–V3'],
        rows.map((r: J) => [
          short(r.label),
          r.role,
          usd(r.developmentNet),
          usd(r.validationPnl),
          usd(r.validationDd),
          `${usd(r.fullNet)} (${usd(r.fullRealized)} / ${usd(r.fullUnrealized)})`,
          `${usd(r.wholeDd)} (${ddPct(r.wholeDd)})`,
          `${usd(r.years['2025'])} / ${usd(r.years['2026'])}`,
          int(r.gdxLotsAfterBoundary),
          r.passes ? 'pass' : `fails ${Object.entries(r.tests).filter(([, ok]) => !ok).map(([k]) => k).join(', ')}`
        ])
      )}\n`;
    }

    body += `\n## Report-only: stresses on FULL (validation P&L)\n\n${table(
      ['Arm', 'Member', 'cost 10 bps', 'cost 20 bps', 'interest 14%'],
      v.stresses.map((s: J) => [s.arm, short(s.label), usd(s.stresses['cost 10 bps'].validationPnl), usd(s.stresses['cost 20 bps'].validationPnl), usd(s.stresses['interest 14%'].validationPnl)])
    )}\n\n## Report-only: fresh whole-portfolio confirmation rep 1 on FULL (128 draws, paired with the baseline)\n\n${table(
      ['Arm | member', 'Median val. P&L', 'p10', 'Share > 0', 'p90 val. DD', 'p90 whole-run DD', 'Draws > $35k', 'Paired Δ val. P&L median', 'p10', 'Share above baseline'],
      Object.entries(v.neighbourhoods).map(([k, x]: [string, J]) => [
        short(k),
        usd(x.medianValidationPnl),
        usd(x.p10ValidationPnl),
        pct(x.positiveShare),
        usd(x.p90ValidationDd),
        usd(x.p90WholeRunDd),
        int(x.wholeRunAbove35k),
        sgn(x.pairedVsBaseline.medianDeltaValidationPnl),
        sgn(x.pairedVsBaseline.p10DeltaValidationPnl),
        pct(x.pairedVsBaseline.shareAboveBaseline)
      ])
    )}\n`;
    if (v.knownTargets)
      body += `\n## Known targets (compared here only)\n\n${table(
        ['Target', 'Reproduced', 'Target value'],
        [
          ['C4 development net', usd(v.knownTargets.C4.development.net), usd(v.knownTargets.C4.development.target)],
          ['C4 validation P&L / reset DD', `${usd(v.knownTargets.C4.validation.pnl)} / ${usd(v.knownTargets.C4.validation.dd)}`, `${usd(v.knownTargets.C4.validation.target)} / ${usd(v.knownTargets.C4.validation.ddTarget)}`],
          ['C4 full net / DD', `${usd(v.knownTargets.C4.full.net)} / ${usd(v.knownTargets.C4.full.dd)}`, `${usd(v.knownTargets.C4.full.target)} / ${usd(v.knownTargets.C4.full.ddTarget)}`],
          ['C4-refined development net', usd(v.knownTargets.C4refined.development.net), usd(v.knownTargets.C4refined.development.target)],
          ['C4-refined validation P&L / reset DD', `${usd(v.knownTargets.C4refined.validation.pnl)} / ${usd(v.knownTargets.C4refined.validation.dd)}`, `${usd(v.knownTargets.C4refined.validation.target)} / ${usd(v.knownTargets.C4refined.validation.ddTarget)}`],
          ['C4-refined full net / DD', `${usd(v.knownTargets.C4refined.full.net)} / ${usd(v.knownTargets.C4refined.full.dd)}`, `${usd(v.knownTargets.C4refined.full.target)} / ${usd(v.knownTargets.C4refined.full.ddTarget)}`],
          ['VG #2 native full net / DD', `${usd(v.knownTargets.vg2Native.net)} / ${usd(v.knownTargets.vg2Native.dd)}`, `${usd(v.knownTargets.vg2Native.target)} / ${usd(v.knownTargets.vg2Native.ddTarget)}`]
        ]
      )}\n`;
    body += `\nDD dates of every row are in validation.json (ddPeakT, ddTroughT); e.g. ${v.rows
      .slice(0, 3)
      .map((r: J) => `${short(r.label)} ${date(r.ddPeakT)} → ${date(r.ddTroughT)}`)
      .join('; ')}.\n`;
    write('validation.md', `Validation 2025-01-02 → 2026-10-30 (one continuous run per member; door ${v.door})`, body);
  }
}

// ----- settings -----

{
  const m = read(path.join(study, 'CONTROL_MANIFEST.json'));
  const fz = read(pilot ? path.join(base, 'FROZEN_SELECTION.json') : path.join(study, 'FROZEN_SELECTION.json'));
  let body = '';

  if (m) {
    body += `## Anchors and controls (CONTROL_MANIFEST.json)\n\n${table(
      ['Key', 'Label', 'Priority 3 id', 'Enabled', 'Growth·VGT', 'Growth·GDX'],
      m.controls.map((c: J) => [
        c.key,
        c.label,
        c.priority3Id,
        c.enabled.join(' + '),
        c.settings.growth?.VGT?.enabled ? c.settings.growth.VGT.identity : 'OFF',
        c.settings.growth?.GDX?.enabled ? c.settings.growth.GDX.identity : 'OFF'
      ])
    )}\n\n## C4-refined's VGT Growth book against #4\n\n${table(
      ['Input', 'VGT Growth #4', 'C4-refined'],
      Object.entries(m.c4Refined.differencesFromGrowth4).map(([k, v]: [string, J]) => [k, String(v.growth4), String(v.c4Refined)])
    )}\n`;
  }
  if (fz)
    body += `\n## Frozen members' GDX Growth books (complete effective vectors)\n\n${fz.frozenMembers
      .filter((x: J) => x.settings.growth.GDX.enabled)
      .map((x: J) => `- **${short(x.label)}** (${x.arm}; ${x.role}; id ${x.id}; GDX ${x.settings.growth.GDX.identity}): \`${JSON.stringify(x.settings.growth.GDX.effective)}\``)
      .join('\n')}\n`;
  if (body) write('settings.md', 'Exact settings', body);
}

console.log(`tables written to ${path.relative(repoRoot, out)}`);
