// Report tables of Priority 4A (written analysis support; Markdown only, no visuals — standard 2.0.0 §7.7). Reads only
// sealed records and writes results/tables/*.md (or a pilot's tables with --pilot NAME). Dollars with commas and two
// decimals; DD % = DD ÷ the fixed $100,000 principal budget.
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-growth-standalone/tables.ts [--pilot NAME]
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const study = path.join(repoRoot, 'research', 'gdx-growth-standalone');
const pilot = process.argv.includes('--pilot') ? process.argv[process.argv.indexOf('--pilot') + 1] : null;
const base = pilot ? path.join(repoRoot, '.cache', 'gdx-growth-standalone', 'pilot', pilot) : path.join(study, 'results');
const out = path.join(base, 'tables');
const folds = pilot ? ['P18'] : ['C19', 'C21', 'C23'];
const cuts = pilot ? ['P18'] : ['C19', 'C21', 'C23', 'C24'];
const fin = pilot ? 'P18' : 'C24';

type J = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const read = (f: string): J | null => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const num = (x: unknown) => Number(x);
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
const int = (x: unknown) => (Number.isFinite(num(x)) ? num(x).toLocaleString('en-US') : '—');
const table = (head: string[], rows: (string | number)[][]) =>
  [
    `| ${head.join(' | ')} |`,
    `|${head.map((_h, i) => (i === 0 ? '---' : '---:')).join('|')}|`,
    ...rows.map((r) => `| ${r.map((c) => String(c).replaceAll('|', ' · ')).join(' | ')} |`)
  ].join('\n');
const write = (name: string, title: string, body: string) => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name), `# ${title}\n\n${body.trim()}\n`);
};
const short = (label: string | null) => (label ?? 'none').replace(/^control: /, '').replace(/^(C19|C21|C23|C24|P18)\//, '');
const gates = (e: J) => (e.qualified ? 'qualified' : `fails ${e.failed.join(', ')}`);
const kindRank: Record<string, number> = { independent: 0, informed: 1, control: 2, reference: 3 };
const sortEv = (a: J, b: J) => (kindRank[a.kind] ?? 9) - (kindRank[b.kind] ?? 9) || b.centre.net - a.centre.net;
const rolesOf = (sel: J, label: string) =>
  Object.entries(sel.roles as Record<string, J>)
    .flatMap(([set, r]) =>
      Object.entries(r.roles as Record<string, string | null>)
        .filter(([, l]) => l === label)
        .map(([role]) => `${set} ${role}`)
    )
    .join('; ');
const wilson = (k: number, n: number) => {
  if (!n) return '—';

  const z = 1.959964;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;

  return `[${pct(Math.max(0, c - h))}, ${pct(Math.min(1, c + h))}]`;
};

// ----- qualification and roles per cutoff -----

for (const cut of cuts) {
  const sel = read(path.join(base, 'folds', cut, 'selection.json'));

  if (!sel) continue;

  const ev: J[] = [...sel.evidence].sort(sortEv);
  let body = `Primary: **${short(sel.primary)}**. Independent primary: **${short(sel.independentPrimary)}**. ${sel.fallback}.\n\n`;

  body += table(
    ['Member', 'Kind / origin', 'Class', 'Centre net', 'Centre DD (%)', 'Lots (W/L)', 'Sel. robust', 'Sel. p90 DD', 'Conf. median', 'Conf. p10', 'Conf. robust', 'Conf. p90 DD', '> $35k', 'Worst DD', 'Gates', 'Roles'],
    ev.map((e) => [
      short(e.label),
      `${e.kind} / ${e.origin}`,
      e.class,
      usd(e.centre.net),
      `${usd(e.centre.dd)} (${ddPct(e.centre.dd)})`,
      `${e.centre.lots} (${e.centre.books['G:GDX'].wins}/${e.centre.books['G:GDX'].losses})`,
      usd(e.select.robust),
      usd(e.select.p90Dd),
      usd(e.confirm.median),
      usd(e.confirm.p10),
      usd(e.confirm.robust),
      usd(e.confirm.p90Dd),
      pct(e.confirm.breachShare),
      usd(e.confirm.worstDd),
      e.gdx ? gates(e) : 'reference',
      rolesOf(sel, e.label) || '—'
    ])
  );
  body += '\n\n## Roles and Pareto sets\n\n';
  body += table(
    ['Set', 'Qualified / members', 'Actual-profit', 'Robust-profit', 'Balanced', 'Lower-drawdown', 'Pareto set'],
    Object.entries(sel.roles as Record<string, J>).map(([k, r]) => [
      k,
      `${r.qualified} / ${r.members}`,
      short(r.roles['actual-profit']),
      short(r.roles['robust-profit']),
      short(r.roles.balanced),
      short(r.roles['lower-drawdown']),
      r.pareto.map(short).join('; ')
    ])
  );
  if (sel.nearMisses.length)
    body += `\n\n## Near misses (only Q3, Q4 or Q5 failed)\n\n${table(
      ['Member', 'Failed', 'Severity', 'Centre net', 'Centre DD'],
      sel.nearMisses.map((m: J) => [short(m.label), m.failed.join(', '), JSON.stringify(m.severity), usd(m.net), usd(m.dd)])
    )}`;
  write(`qualify-${cut}.md`, `Qualification and roles — ${cut} (training door ${sel.door})`, body);
}

// ----- the final cutoff: tails, stresses, toggles, the 5A instrument, labels against Appendix A -----

{
  const sel = read(path.join(base, 'folds', fin, 'selection.json'));

  if (sel) {
    const ev: J[] = sel.evidence.filter((e: J) => e.gdx).sort(sortEv);
    let body = table(
      ['Member', 'n', 'Conf. p90 DD [95% interval]', 'p95 DD', 'Worst-10% mean', 'Breaches [Wilson 95%]', 'Mean excess', 'Worst DD', 'Breach ledgers', 'Small (½) p90 / > $35k', 'Wide (1.5×) p90 / > $35k', 'Active inputs', 'Clipped'],
      ev.map((e) => {
        const t = e.confirmTail ?? {};

        return [
          short(e.label),
          e.confirm.n,
          `${usd(e.confirm.p90Dd)} [${usd(t.p90Interval?.[0])}, ${usd(t.p90Interval?.[1])}]`,
          usd(t.p95Dd),
          usd(t.worst10Mean),
          `${e.confirm.breaches} (${pct(e.confirm.breachShare)}) ${wilson(e.confirm.breaches, e.confirm.n)}`,
          usd(e.confirm.meanExcess),
          usd(e.confirm.worstDd),
          t.breachLedgers ?? '—',
          `${usd(e.small.p90Dd)} / ${pct(e.small.breachShare)}`,
          `${usd(e.wide.p90Dd)} / ${pct(e.wide.breachShare)}`,
          e.activeInputs,
          e.confirm.clipped
        ];
      })
    );

    body +=
      '\n\nBreach frequencies are perturbation frequencies on one history (2016–2024), not probabilities of future losses; report-only (standard §5.8).';
    write(`tails-${fin}.md`, `Neighbourhood tails — ${fin} (fresh confirmation, 3 × 128)`, body);

    const names = Object.keys(ev[0]?.stress ?? {});

    body = table(
      ['Member', 'Centre net / DD', ...names.map((n) => `${n}: net / DD`)],
      ev.map((e) => [
        short(e.label),
        `${usd(e.centre.net)} / ${usd(e.centre.dd)}`,
        ...names.map((n) => `${usd(e.stress[n]?.net)} / ${usd(e.stress[n]?.dd)}`)
      ])
    );
    body += '\n\n## Optional-rule toggles (report-only; each enabled rule OFF)\n\n';
    body += table(
      ['Member', 'Toggle', 'Net', 'Δ net', 'DD', 'Lots'],
      ev.flatMap((e) =>
        Object.entries(e.toggles as Record<string, J>).map(([k, r]) => [
          short(e.label),
          k,
          usd(r.net),
          sgn(r.net - e.centre.net),
          usd(r.dd),
          r.lots
        ])
      )
    );
    write(`stresses-${fin}.md`, `Stresses and toggles — ${fin} (development centres)`, body);

    if (ev.some((e) => e.p5a))
      write(
        `p5a-instrument-${fin}.md`,
        "Priority 5A's standalone instrument (report-only matched comparison)",
        `${table(
          ['Member', 'Centre net / DD', 'Median net', 'p10 net', 'p90 DD', 'Worst DD', '> $35k', 'Net > 0', 'Half radius: median / > $35k', '1.5× radius: median / > $35k'],
          ev
            .filter((e) => e.p5a)
            .map((e) => [
              short(e.label),
              `${usd(e.centre.net)} / ${usd(e.centre.dd)}`,
              usd(e.p5a.confirm.median),
              usd(e.p5a.confirm.p10),
              usd(e.p5a.confirm.p90Dd),
              usd(e.p5a.confirm.worstDd),
              pct(e.p5a.confirm.breachShare),
              pct(e.p5a.tail?.positiveShare),
              `${usd(e.p5a.small.median)} / ${pct(e.p5a.small.breachShare)}`,
              `${usd(e.p5a.wide.median)} / ${pct(e.p5a.wide.breachShare)}`
            ])
        )}\n\n5A's published figures on this instrument (development, alone on $100,000): VGT Growth #4 $92,575.71 / $14,578.10, median $42,637.80, p10 $10,456.77, p90 DD $22,265.15, 0% above $35,000; VGT 08500a60 $115,509.15 / $19,344.80, median $98,866.19, p10 $63,181.60, p90 DD $24,507.27, 0.8%. Methodological context only — not GDX benchmarks.`
      );

    if (sel.versusAppendixA?.length)
      write(
        `versus-appendixA-${fin}.md`,
        `Every member against Appendix A — ${fin} (descriptive; matched fresh confirmation; never a gate)`,
        table(
          ['Member', 'Δ centre net', 'Δ centre DD', 'Δ conf. median', 'Δ conf. p10', 'Δ conf. p90 DD', 'Dominates', 'Dominated', 'Higher-profit trade-off', 'Stronger local stability', 'p90 within finite-draw uncertainty'],
          (sel.versusAppendixA as J[]).map((l) => [
            short(l.label),
            sgn(l.dNet),
            sgn(l.dDd),
            sgn(l.dMedian),
            sgn(l.dP10),
            sgn(l.dP90Dd),
            l.dominates ? 'yes' : '—',
            l.dominatedBy ? 'yes' : '—',
            l.higherProfitTradeOff ? 'yes' : '—',
            l.strongerLocalStability ? 'yes' : '—',
            l.p90WithinFiniteDrawUncertainty === null ? '—' : l.p90WithinFiniteDrawUncertainty ? 'yes' : 'no'
          ])
        )
      );
  }
}

// ----- coverage and compute -----

{
  let body = '';
  const totals: Record<string, number> = {};

  for (const cut of cuts)
    for (const lane of ['independent', 'informed']) {
      const s = read(path.join(base, 'search', cut, `${lane}.json`));

      if (!s) continue;
      totals.fresh = (totals.fresh ?? 0) + s.compute.fresh;
      totals.hits = (totals.hits ?? 0) + s.compute.archiveHits;
      body += `\n## ${cut} ${lane} (door ${s.door}; ${s.minutes} min; ${int(s.compute.fresh)} fresh evaluations, ${int(s.compute.archiveHits)} archive hits, ${int(s.compute.workerSeconds)} worker-s; peak cgroup ${(s.peaks.cgroup / 2 ** 30).toFixed(2)} GiB)\n\n`;
      body += table(
        ['Lane', 'Screened (unique)', 'Promoted', 'Seeds / designs', 'Island proposals', 'Refinement moves', 'Distinct centres', 'Rung-1 measured', 'Rung-1 feasible', 'Ledgers (feasible)', 'Cash-equivalent', 'Rung 2 / 3 feasible', 'Islands', 'Stop', 'Last trigger reading'],
        s.lanes.map((l: J) => [
          short(l.key),
          l.counts.screened ? `${int(l.counts.screened)} (${int(l.counts.screenUnique)})` : '—',
          l.counts.promoted ?? '—',
          l.counts.seeds ? `${l.counts.seeds} / ${l.counts.seedDesigns}` : '—',
          int(l.counts.islandConfigs ?? 0),
          int(l.counts.refineMoves ?? 0),
          int(l.counts.distinctCentres),
          int(l.counts.r1Measured),
          int(l.counts.r1Feasible),
          `${int(l.ledgers.centres)} (${int(l.ledgers.feasible)})`,
          int(l.ledgers.baselineEquivalent),
          `${l.counts.r2Feasible ?? 0} / ${l.counts.r3Feasible ?? 0}`,
          l.extension.islands,
          l.extension.stop,
          l.extension.reason
        ])
      );
      body += '\n\nFresh evaluations by kind: ';
      body += Object.entries(s.compute.tallies as Record<string, J>)
        .map(([k, t]) => `${k} ${int(t.fresh)} (+${int(t.hits)} hits)`)
        .join('; ');
      body += '\n\nIsland stops: ';
      body += s.lanes
        .map(
          (l: J) =>
            `${short(l.key)}: ${l.islands.map((i: J) => `#${i.index} ${i.stop} (${i.newConfigs} new, ${i.generations} gen, HV gain/10k ${i.hvGainPer10k})`).join(', ')}`
        )
        .join('; ');
      body += '\n\nCoverage by protected stratum (rung-1 archive):\n\n';
      body += table(
        ['Lane', 'Stratum', 'Screened', 'Plausible', 'Promoted', 'Measured', 'Feasible'],
        s.lanes.flatMap((l: J) =>
          Object.entries(l.byClass as Record<string, J>)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, c]) => [short(l.key), k, c.screened, c.plausible, c.promoted, c.measured, c.feasible])
        )
      );
      body += '\n\nBy proposal origin:\n\n';
      body += table(
        ['Lane', 'Origin', 'Centres', 'Plausible', 'Feasible'],
        s.lanes.flatMap((l: J) =>
          Object.entries(l.byOrigin as Record<string, J>).map(([k, c]) => [short(l.key), k, c.centres, c.plausible, c.feasible])
        )
      );
    }

  for (const cut of cuts) {
    const sel = read(path.join(base, 'folds', cut, 'selection.json'));

    if (sel) {
      totals.fresh = (totals.fresh ?? 0) + sel.compute.fresh;
      totals.hits = (totals.hits ?? 0) + sel.compute.archiveHits;
      body += `\n\nQualification ${cut}: ${int(sel.compute.fresh)} fresh, ${int(sel.compute.archiveHits)} hits, ${int(sel.compute.workerSeconds)} worker-s.`;
    }
  }

  write('coverage.md', 'Search coverage, budgets, stopping and compute', `Total fresh evaluations (searches and qualifications): ${int(totals.fresh)}; archive hits ${int(totals.hits)}.\n${body}`);
}

// ----- folds and the sequential policies -----

{
  let body = '';

  for (const cut of folds) {
    const e = read(path.join(base, 'folds', cut, 'evaluation.json'));

    if (!e) continue;
    body += `\n## ${cut} → slice ${e.slice[0]} … ${e.slice[1]} (door ${e.door}; primary **${short(e.primary)}**)\n\n`;
    body += table(
      ['Member', 'Roles', 'Training net / DD', 'Slice P&L', 'Slice reset DD', 'Whole-run net / DD', 'Whole-run DD peak → trough (recovery)', 'Slice lots (carried in)', 'Open at slice end'],
      e.rows.map((r: J) => [
        short(r.label),
        r.roles,
        `${usd(r.trainingNet)} / ${usd(r.trainingDd)}`,
        usd(r.sliceNet),
        usd(r.sliceDd),
        `${usd(r.wholeNet)} / ${usd(r.wholeDd)}`,
        num(r.wholeDd) > 0 ? `${r.wholeDdPeak ?? '—'} → ${r.wholeDdTrough ?? '—'} (${r.wholeDdRecovery ?? 'not recovered'})` : '—',
        `${r.sliceLots.length} (${r.sliceLots.filter((l: J) => l.carriedIn).length})`,
        r.openAtEnd.length
      ])
    );
  }

  const s = read(path.join(base, 'folds', 'sequential.json'));

  if (s) {
    body += `\n\n## Sequential policies (verdict: ${s.verdict})\n\n`;
    body += table(
      ['Policy', ...s.folds.map((f: J) => `${f.fold} slice`), 'Charges', 'Net', 'Sequential DD', 'Peak → trough', 'Recovery', 'Within $35,000'],
      s.policies.map((p: J) => [
        p.name,
        ...p.parts.map((x: J) => `${short(x.label)}: ${usd(x.sliceNet)} (DD ${usd(x.sliceDd)})`),
        usd(p.charges),
        usd(p.net),
        usd(p.sequentialDd),
        num(p.sequentialDd) > 0 ? `${p.ddPeak ?? '—'} → ${p.ddTrough ?? '—'}` : '—',
        num(p.sequentialDd) > 0 ? (p.recovered ? p.ddRecovery : 'not recovered') : '—',
        p.withinCeiling ? 'yes' : 'no'
      ])
    );
    body += '\n\n### Positions open between the sequential peak and trough\n\n';
    body += table(
      ['Policy', 'Fold', 'Member', 'Entry', 'Exit', 'Net', 'Carried in'],
      s.policies.flatMap((p: J) =>
        (p.positionsResponsible as J[]).map((x) => [p.name, x.fold, short(x.member), x.entry, x.exit ?? 'open', usd(x.net), x.carriedIn ? 'yes' : '—'])
      )
    );
  }

  if (body) write('folds.md', 'Chronological procedure tests (independent lane)', body);
}

// ----- diagnostics -----

{
  const d = read(path.join(base, 'diagnostics', 'D24', 'diagnostics.json'));

  if (d) {
    let body = table(
      ['Subject', 'Roles', 'Net (realized / open)', 'Lots (W/L, partials)', 'Episodes (win/lose)', 'Exposure', 'Holding mean / median / max days', 'Under water (longest)', 'Interest / costs', 'Largest win / worst loss'],
      d.subjects.map((s: J) => [
        short(s.label),
        s.role,
        `${usd(s.record.net)} (${usd(s.record.realized)} / ${usd(s.record.unrealized)})`,
        `${s.activity.lots} (${s.activity.wins}/${s.activity.losses}, ${s.activity.partialExits})`,
        `${s.activity.independentEpisodes} (${s.activity.winningEpisodes}/${s.activity.losingEpisodes})`,
        pct(s.activity.exposure),
        s.holding ? `${s.holding.meanDays} / ${s.holding.medianDays} / ${s.holding.maxDays}` : '—',
        `${pct(s.underwater.share)} (${s.underwater.longest} sessions)`,
        `${usd(s.activity.interest)} / ${usd(s.activity.costs)}`,
        `${usd(s.activity.largestWin)} / ${usd(s.activity.worstLoss)}`
      ])
    );

    body += '\n\n## Largest winning episode and its causal no-new-funding rerun\n\n';
    body += table(
      ['Subject', 'Episode', 'Episode net (share)', 'Second episode', 'Rerun without new funding: net / DD / lots', 'Causal contribution', 'Arithmetic net − episode'],
      d.subjects.map((s: J) => [
        short(s.label),
        s.topEpisode ? `decisions ${s.topEpisode.first}, entries ${s.topEpisode.firstEntry} → ${s.topEpisode.last} (${s.topEpisode.lots} lots)` : '—',
        s.topEpisode ? `${usd(s.topEpisode.net)} (${pct(s.topEpisode.share)})` : '—',
        usd(s.secondEpisode),
        s.blackout ? `${usd(s.blackout.net)} / ${usd(s.blackout.dd)} / ${s.blackout.lots}` : '—',
        s.blackout ? usd(s.blackout.causalContribution) : '—',
        s.blackout ? usd(s.blackout.arithmeticWithoutEpisode) : '—'
      ])
    );
    body += '\n\n## Maximum minute drawdown (development) and the positions responsible\n\n';
    body += table(
      ['Subject', 'DD (%)', 'Peak', 'Trough', 'Recovery', 'Positions open peak → trough'],
      d.subjects.map((s: J) => [
        short(s.label),
        `${usd(s.minuteDd.dd)} (${ddPct(s.minuteDd.dd)})`,
        s.minuteDd.peak ?? '—',
        s.minuteDd.trough ?? '—',
        s.minuteDd.recovered ? s.minuteDd.recovery : 'not recovered',
        (s.minuteDd.positions as J[]).map((p) => `#${p.lot} ${p.entry} → ${p.exit ?? 'open'} ${usd(p.net)}`).join('; ')
      ])
    );
    body += '\n\n## By development subperiod\n\n';
    body += table(
      ['Subject', '2016–2019', '2020–2021', '2022–2023', '2024'],
      d.subjects.map((s: J) => [short(s.label), ...['2016–2019', '2020–2021', '2022–2023', '2024'].map((k) => usd(s.bySubperiod[k]))])
    );
    body += '\n\n## Decision funnel (Growth·GDX; standalone: no capital competitor)\n\n';
    body += table(
      ['Subject', 'Crossings (episodes)', 'Dispositions', 'Eligibility invalidated by', 'Decisions', 'Virtual invested / flat sessions', 'Events'],
      d.subjects.map((s: J) => [
        short(s.label),
        `${s.funnel.crossings} (${s.funnel.crossingEpisodes})`,
        Object.entries(s.funnel.dispositions as Record<string, number>).map(([k, v]) => `${k} ${v}`).join('; '),
        Object.entries(s.funnel.invalidatedBy as Record<string, number>).map(([k, v]) => `${k} ${v}`).join('; ') || '—',
        s.funnel.decisions,
        `${s.funnel.virtualInvestedSessions} / ${s.funnel.virtualFlatSessions}`,
        Object.entries(s.funnel.events as Record<string, number>).map(([k, v]) => `${k} ${v}`).join('; ')
      ])
    );
    body += '\n\n## Episodes (every independent market episode of each subject)\n\n';
    for (const s of d.subjects as J[])
      body += `- **${short(s.label)}**: ${(s.episodes as J[]).map((e) => `${e.first}→${e.last} ${usd(e.net)} (${e.lots})`).join('; ')}\n`;
    write('diagnostics.md', 'Development diagnostics (D24, 2016–2024; report-only)', body);
  }
}

// ----- validation -----

{
  const v = read(path.join(base, 'validation', 'validation.json'));

  if (v) {
    let body = table(
      ['Member', 'Role', 'Development net', 'Validation P&L', 'Reset val. DD', 'Full net (realized / open)', 'Whole-run DD (%)', 'Whole-run DD peak → trough (recovery)', '2025 / 2026', 'Lots after 2024 (episodes)', 'Carried in', 'V1–V3'],
      v.rows.map((r: J) => [
        short(r.label),
        r.role,
        usd(r.developmentNet),
        usd(r.validationPnl),
        usd(r.validationDd),
        `${usd(r.fullNet)} (${usd(r.fullRealized)} / ${usd(r.fullUnrealized)})`,
        `${usd(r.wholeDd)} (${ddPct(r.wholeDd)})`,
        num(r.wholeDd) > 0 ? `${r.wholeDdPeak ?? '—'} → ${r.wholeDdTrough ?? '—'} (${r.wholeDdRecovery ?? 'not recovered'})` : '—',
        `${usd(r.years['2025'])} / ${usd(r.years['2026'])}`,
        `${r.lotsAfterBoundary} (${r.episodesAfterBoundary})`,
        r.crossingBoundary,
        r.passes ? 'pass' : `fail ${Object.entries(r.tests as Record<string, boolean>).filter(([, x]) => !x).map(([k]) => k).join(', ')}`
      ])
    );

    body += '\n\n## Whole-run drawdown positions\n\n';
    body += table(
      ['Member', 'Positions open peak → trough'],
      v.rows.map((r: J) => [short(r.label), (r.wholeDdPositions as J[]).map((p) => `#${p.lot} ${p.entry} → ${p.exit ?? 'open'} ${usd(p.net)}`).join('; ') || '—'])
    );
    body += '\n\n## Stresses on FULL (report-only)\n\n';
    body += table(
      ['Member', '10 bps: val. P&L / whole DD', '20 bps', '14% interest'],
      v.stresses.map((s: J) => [
        short(s.label),
        ...['cost 10 bps', 'cost 20 bps', 'interest 14%'].map((k) => `${usd(s.stresses[k].validationPnl)} / ${usd(s.stresses[k].wholeDd)}`)
      ])
    );
    body += '\n\n## Validation neighbourhoods (fresh confirmation rep 1, 128 draws on FULL; report-only)\n\n';
    body += table(
      ['Member', 'n', 'Median val. P&L', 'p10 val. P&L', 'Share > 0', 'p90 reset val. DD', 'p90 whole-run DD', 'Whole-run > $35k'],
      Object.entries(v.neighbourhoods as Record<string, J>).map(([k, n]) => [
        short(k),
        n.n,
        usd(n.medianValidationPnl),
        usd(n.p10ValidationPnl),
        pct(n.positiveShare),
        usd(n.p90ValidationDd),
        usd(n.p90WholeRunDd),
        n.wholeRunAbove35k
      ])
    );
    if (v.appendixATarget)
      body += `\n\nAppendix A's native full-history target: ${usd(v.appendixATarget.target.net)} / ${usd(v.appendixATarget.target.minuteDd)} / ${v.appendixATarget.target.closedTrades} trades; reproduced ${usd(v.appendixATarget.reproduced.net)} / ${usd(v.appendixATarget.reproduced.minuteDd)} / ${v.appendixATarget.reproduced.closedTrades} (${v.appendixATarget.reproduced.wins} W / ${v.appendixATarget.reproduced.losses} L, ${v.appendixATarget.reproduced.open} open): **${v.appendixATarget.exact ? 'exact' : 'NOT exact'}**.`;
    write('validation.md', `Validation (FULL, once; boundary ${v.boundary})`, body);
  }
}

// ----- complete effective settings of the frozen members -----

{
  const fz = read(pilot ? path.join(base, 'FROZEN_SELECTION.json') : path.join(study, 'FROZEN_SELECTION.json'));

  if (fz) {
    let body = '';

    for (const m of fz.frozenMembers as J[]) {
      const g = m.settings.growthGdx;

      body += `\n## ${short(m.label)} — ${m.role}\n\n- identity: configuration \`${m.settings.id}\`, GDX vector \`${g?.identity ?? '—'}\`; class ${g?.class ?? '—'}\n- effective settings (every input absent here is inactive under this structure): ${g ? Object.entries(g.effective).map(([k, x]) => `${k}=${x}`).join(', ') : 'cash'}\n`;
    }
    write('settings.md', 'Complete effective settings of the frozen members (Growth 1.4.0 keys; GDX, 1d, 5 bps)', body);
  }
}

console.log(`tables written to ${path.relative(repoRoot, out)}`);
