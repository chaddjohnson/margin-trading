// Report tables of Priority 3B (written analysis support; Markdown only, no visuals — standard 2.0.0 §7.7). Reads only
// sealed records and writes results/tables/*.md (or a pilot's tables with --pilot NAME). Dollars with commas and two
// decimals; DD % = DD ÷ the fixed $100,000.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-d1-growth-expanded/tables.ts [--pilot NAME]
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const study = path.join(repoRoot, 'research', 'vg-d1-growth-expanded');
const pilot = process.argv.includes('--pilot') ? process.argv[process.argv.indexOf('--pilot') + 1] : null;
const base = pilot ? path.join(repoRoot, '.cache', 'vg-d1-growth-expanded', 'pilot', pilot) : path.join(study, 'results');
const out = path.join(base, 'tables');
const finalCut = pilot ? 'P18' : 'C24';
const folds = pilot ? ['P18'] : ['C19', 'C21', 'C23'];
const cuts = pilot ? ['P18'] : ['C19', 'C21', 'C23', 'C24'];

type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const read = (f: string): J | null => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const usd = (x: unknown) => {
  const n = Number(x);

  return x === null || x === undefined || !Number.isFinite(n)
    ? '—'
    : `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const pct = (x: unknown, d = 1) => (Number.isFinite(Number(x)) ? `${(Number(x) * 100).toFixed(d)}%` : '—');
const ddPct = (x: unknown) => (Number.isFinite(Number(x)) ? `${(Number(x) / 1000).toFixed(1)}%` : '—');
const date = (t: unknown) => (Number.isFinite(Number(t)) && Number(t) > 0 ? new Date(Number(t) * 1000).toISOString().slice(0, 10) : '—');
const int = (x: unknown) => (Number.isFinite(Number(x)) ? Number(x).toLocaleString('en-US') : '—');
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join(
    '\n'
  );
const write = (name: string, title: string, body: string) => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name), `# ${title}\n\n${body.trim()}\n`);
};

const order = ['control: C4', 'control: E', 'control: A', 'control: B', 'control: C85', 'control: D'];
const rank = (label: string) => {
  const i = order.indexOf(label);

  return i < 0 ? 100 : i;
};
const short = (label: string) => label.replace(/^control: /, '').replace(/^C24\//, '').replace(/^P18\//, '');

// ----- qualification (per cutoff) -----

for (const cut of cuts) {
  const sel = read(path.join(base, 'folds', cut, 'selection.json'));

  if (!sel) continue;

  const ev: J[] = [...sel.evidence].sort((a: J, b: J) => rank(a.label) - rank(b.label) || b.centre.net - a.centre.net);
  const rows = ev.map((e: J) => [
    short(e.label),
    e.inc,
    usd(e.centre.net),
    usd(e.centre.dd),
    usd(e.select.robust),
    usd(e.select.p90Dd),
    usd(e.confirm.median),
    usd(e.confirm.p10),
    usd(e.confirm.p90Dd),
    `${pct(e.confirm.breachShare)}`,
    e.qualified ? 'qualified' : `fails ${e.failed.join(', ')}`,
    e.familyParticipation,
    Object.entries(e.participation)
      .filter(([, v]) => v !== 'disabled')
      .map(([k, v]) => `${k} ${v}`)
      .join('; ')
  ]);
  let body = table(
    ['Member', 'Inc.', 'Centre net', 'Centre DD', 'Sel. robust', 'Sel. p90 DD', 'Conf. median', 'Conf. p10', 'Conf. p90 DD', '> $35k', 'Gates', 'Families', 'Components'],
    rows
  );

  body += `\n\nSelection = 2 × 128 draws (ranking); confirmation = fresh 3 × 128 (qualification only). Primary: **${sel.primary ?? 'none'}**.\n`;
  for (const [set, r] of Object.entries(sel.roles as Record<string, J>))
    body += `\n- **${set}** (${r.reason}): actual-profit ${r.roles['actual-profit'] ?? '—'}; robust-profit ${r.roles['robust-profit'] ?? '—'}; balanced ${r.roles.balanced ?? '—'}; lower-drawdown ${r.roles['lower-drawdown'] ?? '—'}; Pareto ${r.pareto.length ? r.pareto.map(short).join(', ') : '—'}`;
  if (sel.nearMisses?.length)
    body += `\n\n## Near misses (fail only Q3, Q4 or Q5; not qualified)\n\n${table(
      ['Member', 'Failed', 'Severity (beyond the threshold)', 'Centre net', 'Centre DD'],
      sel.nearMisses.map((m: J) => [short(m.label), m.failed.join(', '), Object.entries(m.severity).map(([g, v]) => `${g} ${usd(v)}`).join('; '), usd(m.net), usd(m.dd)])
    )}`;
  write(`qualify-${cut}.md`, `Qualification at ${cut}`, body);

  // tail severity (report-only)
  const tails = ev.map((e: J) => [
    short(e.label),
    usd(e.confirmTail.p90Dd),
    `${usd(e.confirmTail.p90Interval[0])}–${usd(e.confirmTail.p90Interval[1])}`,
    usd(e.confirmTail.p95Dd),
    usd(e.confirmTail.worst10Mean),
    usd(e.confirmTail.worstDd),
    `${pct(e.confirmTail.breachShare)} [${pct(e.confirmTail.breachInterval[0])}, ${pct(e.confirmTail.breachInterval[1])}]`,
    usd(e.confirmTail.meanExcess),
    e.confirmTail.breachLedgers,
    `${pct(e.smallTail.breachShare)} / ${pct(e.wideTail.breachShare)}`,
    `${e.confirmDraws.unique}/${e.confirmDraws.drawn}`,
    e.confirmTail.clipped,
    e.activeInputs.joint
  ]);

  write(
    `tails-${cut}.md`,
    `Tail severity at ${cut} (fresh confirmation; report-only, never a gate)`,
    table(
      ['Member', 'p90 DD', 'p90 95% (order stats)', 'p95 DD', 'Worst-10% mean', 'Worst DD', '> $35k [Wilson 95%]', 'Mean excess', 'Breach ledgers', '> $35k half / 1.5×', 'Unique/drawn', 'Clipped', 'Active inputs'],
      tails
    )
  );

  // scopes, stresses, causal removals, toggles
  const stress = ev.map((e: J) => [
    short(e.label),
    ...['cost 10 bps', 'cost 20 bps', 'interest 14%', 'stop slippage +25 bps', 'next-open stops'].map((k) => `${usd(e.stress[k]?.net)} / ${usd(e.stress[k]?.dd)}`)
  ]);
  const causal = ev.map((e: J) => [
    short(e.label),
    ...Object.entries(e.removal as Record<string, J>).map(([k, r]) => `${k}: ${usd(e.centre.net - r.net)}`)
  ]);
  const scopes = ev.map((e: J) => [
    short(e.label),
    ...['d1', 'g', 'vgt', 'gdx'].map((s) => (e.scopes[s] ? `${usd(e.scopes[s].p10)} / ${usd(e.scopes[s].p90Dd)} / ${pct(e.scopes[s].breachShare)}` : '—'))
  ]);

  write(
    `evidence-${cut}.md`,
    `Stresses, scopes and causal contributions at ${cut} (development)`,
    `## Stresses (centre net / DD)\n\n${table(['Member', '10 bps', '20 bps', '14% interest', '+25 bps stop slippage', 'Next-open stops'], stress)}\n\n## Scopes (p10 net / p90 DD / > $35k)\n\n${table(['Member', 'D1 books', 'Growth books', 'VGT books', 'GDX books'], scopes)}\n\n## Causal contributions (centre net − net of the complete rerun without the component)\n\n${causal.map((r) => `- **${r[0]}**: ${r.slice(1).join('; ')}`).join('\n')}\n\n## Toggles (report-only)\n\n${ev.map((e: J) => `- **${short(e.label)}**: ${Object.entries(e.toggles as Record<string, J>).map(([k, r]) => `${k} ${usd(r.net)} / ${usd(r.dd)}`).join('; ') || '—'}`).join('\n')}`
  );

  // C4 comparison
  if (sel.c4?.labels?.length) {
    const c4rows = (sel.c4.labels as J[])
      .filter((l) => l.label !== 'control: C4')
      .map((l) => {
        const e = ev.find((x: J) => x.label === l.label);

        return [
          short(l.label),
          e?.qualified ? 'yes' : 'no',
          usd(l.dNet),
          usd(l.dDd),
          usd(l.dSelectRobust),
          usd(l.dMedian),
          usd(l.dP10),
          usd(l.dP90Dd),
          usd(l.dCost10),
          usd(l.dCost20),
          [l.dominates ? 'dominates C4' : '', l.higherProfitTradeOff ? 'higher-profit trade-off' : '', l.strongerLocalStability ? 'stronger local stability' : '']
            .filter(Boolean)
            .join('; ') || '—'
        ];
      });

    write(
      'c4.md',
      'Paired differences from C4 (development; fresh confirmation)',
      `${table(['Member', 'Qualified', 'Δ centre net', 'Δ centre DD', 'Δ sel. robust', 'Δ conf. median', 'Δ conf. p10', 'Δ conf. p90 DD', 'Δ net 10 bps', 'Δ net 20 bps', 'Labels'], c4rows)}\n\nC4 qualified under the fresh instrument: **${sel.c4.qualified ? 'yes' : 'no'}**. Replacement candidate (highest-net qualified member dominating C4): **${sel.c4.replacementCandidate ?? 'none'}**.`
    );

    const arch = ev
      .filter((e: J) => e.archived)
      .map((e: J) => [short(e.label), usd(e.archived.confirm.median), usd(e.archived.confirm.p10), usd(e.archived.confirm.p90Dd), pct(e.archived.confirm.breachShare), usd(e.archived.tail.worstDd), `${e.archived.unique}/${e.archived.drawn}`]);

    write('archived-instrument.md', "Priority 3's archived confirmation instrument (report-only, like-for-like)", table(['Member', 'Median', 'p10', 'p90 DD', '> $35k', 'Worst DD', 'Unique/drawn'], arch));
  }
}

// ----- search coverage -----

{
  const rows: (string | number)[][] = [];
  const evals: (string | number)[][] = [];
  const inc: (string | number)[][] = [];

  for (const cut of cuts)
    for (const arm of ['indep', 'informed']) {
      const s = read(path.join(base, 'search', cut, `${arm}.json`));

      if (!s) continue;
      for (const l of s.lanes as J[]) {
        const c = l.counts;

        rows.push([
          short(l.key),
          int(c.screened ?? c.seedDesigns ?? 0),
          int(c.plausible ?? 0),
          int(c.promoted ?? c.seeds ?? 0),
          int(c.islandConfigs ?? 0),
          int(c.r1Centres),
          int(c.r1Measured),
          int(c.r1Feasible),
          int(c.r1FeasibleBoth ?? 0),
          int(c.refineMoves ?? 0),
          int(c.distinctCentres),
          `${int(l.ledgers.centres)} / ${int(l.ledgers.feasible)}`,
          `${l.islands.length} (${l.extension.stop})`,
          int(l.requested)
        ]);
        for (const [k, v] of Object.entries(l.byInc as Record<string, J>))
          inc.push([short(l.key), k, int(v.centres), int(v.plausible), int(v.feasible), int(v.bothFunded)]);
      }
      evals.push([
        `${cut} ${arm}`,
        int(s.compute.fresh),
        int(s.compute.archiveHits),
        ...['screen', 'r1:centre', 'r1:neighbours', 'r2:neighbours', 'r3:neighbours', 'refine:centre', 'refine:neighbours'].map((t) => int(s.compute.tallies[t]?.fresh ?? 0)),
        `${(s.compute.workerSeconds / 3600).toFixed(1)} h`,
        `${(s.compute.wallSeconds / 3600).toFixed(2)} h`
      ]);
    }

  write(
    'coverage.md',
    'Search coverage, budgets and stopping',
    `## Lanes\n\n${table(['Lane', 'Screened / designs', 'Plausible', 'Promoted / seeds', 'Island proposals', 'Rung-1 centres', 'Measured', 'Feasible', 'Feasible both-Growth', 'Refinement moves', 'Distinct centres', 'Ledgers (all / feasible)', 'Islands (stop)', 'Evaluations requested'], rows)}\n\n## Evaluations by kind (fresh) and compute\n\n${table(['Job', 'Fresh', 'Archive hits', 'Screen', 'R1 centres', 'R1 neighbours', 'R2 neighbours', 'R3 neighbours', 'Refine centres', 'Refine neighbours', 'Worker time', 'Wall'], evals)}\n\n## By inclusion choice\n\n${table(['Lane', 'Inclusion', 'Rung-1 centres', 'Plausible', 'Feasible', 'Funding both Growth books'], inc)}`
  );
}

// ----- folds and the sequential verdict -----

{
  const rows: (string | number)[][] = [];

  for (const cut of folds) {
    const e = read(path.join(base, 'folds', cut, 'evaluation.json'));

    if (!e) continue;
    for (const r of e.rows as J[]) rows.push([cut, short(r.label), r.role, usd(r.sliceNet), usd(r.sliceDd), usd(r.wholeDd), r.openAtEnd.join(', ') || '—']);
  }

  const seq = read(path.join(base, 'folds', 'sequential.json'));
  let body = table(['Fold', 'Member', 'Role', 'Slice P&L', 'Slice DD (reset)', 'Whole-run DD', 'Open at slice end'], rows);

  if (seq)
    body += `\n\n**Verdict:** ${seq.verdict}\n\n${table(
      ['Policy', 'Net before charges', 'Charges', 'Net', 'Sequential DD', 'Peak → trough'],
      seq.policies.map((p: J) => [p.name, usd(p.netBeforeCharges), usd(p.charges), usd(p.net), usd(p.sequentialDd), `${p.ddPeak} → ${p.ddTrough}`])
    )}`;
  write('folds.md', 'Chronological procedure tests (independent procedure; controls descriptive)', body);
}

// ----- diagnostics -----

{
  const d = read(path.join(base, 'diagnostics', 'D24', 'diagnostics.json'));

  if (d) {
    const part: string[] = [];

    for (const s of d.subjects as J[]) {
      const f = s.funnels as Record<string, J>;

      part.push(
        `### ${short(s.label)} (${s.role})\n\n${table(
          ['Component', 'Crossings', 'Virtual trades', 'Decisions', 'Granted', 'Refused (by occupant)', 'Funded lots', 'Partials', 'Booked', 'Closes held'],
          Object.entries(f).map(([b, x]) => [b, int(x.crossings), int(x.virtualTrades), int(x.decisions), int(x.granted), `${int(x.refused)} (${Object.entries(x.refusedBy).map(([k, v]) => `${k} ${v}`).join(', ') || '—'})`, int(x.lots), int(x.partials), usd(x.booked), int(x.heldSessions)])
        )}\n\nPool closes held / idle: ${int(s.poolTime.held)} / ${int(s.poolTime.idle)} of ${int(s.poolTime.sessions)}. Largest winning episode: ${s.topEpisode ? `${s.topEpisode.first} → ${s.topEpisode.last}, ${usd(s.topEpisode.net)} (${pct(s.topEpisode.share)} of net); blackout rerun ${usd(s.blackout?.net)} (arithmetic removal ${usd(s.blackout?.arithmetic)})` : '—'}.${s.gdxAdmission ? ` GDX admission (with − without Growth·GDX): net ${usd(s.gdxAdmission.deltaNet)}, VGT Growth booked ${usd(s.gdxAdmission.deltaVgtGrowthBooked)}, D1 booked ${usd(s.gdxAdmission.deltaD1Booked)}.` : ''} VGT trend-entry refusals: ${s.vgtTrendEntryRefusals.length ? s.vgtTrendEntryRefusals.map((r: J) => `${r.decision} behind ${r.occupant} (virtual ${usd(r.virtualNet)}, ${r.idleSessionsDuringVirtualHold} idle closes)`).join('; ') : 'none'}.${s.versusC4 ? ` Versus C4: ${usd(s.versusC4.delta)} (newly admitted ${s.versusC4.summary['newly admitted'].lots} lots ${usd(s.versusC4.summary['newly admitted'].delta)}; displaced ${s.versusC4.summary.displaced.lots} ${usd(s.versusC4.summary.displaced.delta)}; retimed ${s.versusC4.summary.retimed.lots + s.versusC4.summary['retimed exit'].lots} ${usd(s.versusC4.summary.retimed.delta + s.versusC4.summary['retimed exit'].delta)}).` : ''}`
      );
    }

    write('participation.md', 'Participation attribution, refusals, displacement and the GDX admission cost (development)', part.join('\n\n'));

    const w = (d.subjects as J[])
      .sort((a, b) => rank(a.label) - rank(b.label))
      .map((s) => {
        const r = s.record;
        const hold = Object.entries(s.holding as Record<string, J>)
          .filter(([, v]) => v)
          .map(([b, v]) => `${b} ${v.meanDays}d`)
          .join(', ');

        return [short(s.label), usd(r.net), usd(r.realized), usd(r.unrealized), usd(r.dd), ddPct(r.dd), `${date(r.ddPeakT)} → ${date(r.ddTroughT)}`, int(r.sessionsHeld), int(r.lots), `${r.wins}/${r.losses}`, int(r.partials), hold || '—', usd(r.interest), usd(r.costs)];
      });

    write(
      'development.md',
      'Development 2016-01-04 → 2024-12-31 (D24; harmonized; C4 first)',
      table(['Subject', 'Marked net', 'Realized', 'Open P&L', 'Max minute DD', 'DD % of $100k', 'DD peak → trough', 'Closes held', 'Funded lots', 'Wins/losses', 'Partial exits', 'Mean hold', 'Interest', 'Costs'], w)
    );
  }
}

// ----- validation -----

{
  const v = read(path.join(base, 'validation', 'validation.json'));

  if (v) {
    const rows = [...(v.rows as J[])]
      .sort((a, b) => rank(a.label) - rank(b.label))
      .map((r) => [
        short(r.label),
        usd(r.developmentNet),
        usd(r.validationPnl),
        usd(r.validationDd),
        ddPct(r.validationDd),
        usd(r.fullNet),
        usd(r.fullRealized),
        usd(r.fullUnrealized),
        usd(r.wholeDd),
        ddPct(r.wholeDd),
        `${date(r.ddPeakT)} → ${date(r.ddTroughT)}`,
        `${usd(r.years['2025'])} / ${usd(r.years['2026'])}`,
        int(r.lotsAfterBoundary.length),
        `${r.tests.V1 ? '✓' : '✗'}${r.tests.V2 ? '✓' : '✗'}${r.tests.V3 ? '✓' : '✗'}`
      ]);

    write(
      'validation.md',
      'Validation 2025-01-02 → 2026-10-30 and full history (previously examined history; continuous runs)',
      `${table(['Subject', 'Development net', 'Validation P&L', 'Reset val. DD', 'Val. DD %', 'Full net', 'Realized', 'Open P&L', 'Whole-run DD', 'DD %', 'DD peak → trough', '2025 / 2026', 'Lots after 2024', 'V1 V2 V3'], rows)}\n\n**Recommendation (frozen rule):** ${v.recommendation}`
    );
  }
}

console.log(`tables written to ${path.relative(repoRoot, out)}`);
