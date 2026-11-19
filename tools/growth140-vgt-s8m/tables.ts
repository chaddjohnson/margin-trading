// Report tables for growth140-vgt-s8m (a post-freeze helper: reads the sealed records, writes Markdown tables to
// research/growth140-vgt-s8m/results/tables/). It computes nothing new from market data.
//
//   node --experimental-transform-types tools/growth140-vgt-s8m/tables.ts [--qualify FILE] [--validation FILE] [--out DIR]
/* eslint-disable @typescript-eslint/no-explicit-any -- reads the sealed JSON records */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const study = path.join(root, 'research/growth140-vgt-s8m');
const args = process.argv.slice(2);
const opt = (n: string, d: string) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1]! : d);
const qFile = opt('qualify', path.join(study, 'results/qualify/qualify.json'));
const vFile = opt('validation', path.join(study, 'results/validation/validation.json'));
const outDir = opt('out', path.join(study, 'results/tables'));
const q = JSON.parse(fs.readFileSync(qFile, 'utf8'));
const v = fs.existsSync(vFile) ? JSON.parse(fs.readFileSync(vFile, 'utf8')) : null;

const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? 'n/a'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (x: number) => (x > 0 ? `+${usd(x)}` : usd(x));
const pct = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : `${x.toFixed(d)}%`);
const date = (t: string | null) => (t ? t.slice(0, 10) : '—');

// ---- display order: #4, then role holders by development rank, then the other members in shortlist order
const holderOrder: string[] = q.ranking.map((r: { id: string }) => r.id);
const members = [...q.members].sort((a: any, b: any) => {
  const ia = holderOrder.indexOf(a.id);
  const ib = holderOrder.indexOf(b.id);

  return (ia < 0 ? 99 + a.order : ia) - (ib < 0 ? 99 + b.order : ib);
});
const roleOf = (id: string) => {
  const r = q.ranking.find((x: { id: string }) => x.id === id);

  return r ? `${r.role} (rank ${r.rank}, ${r.tier})` : 'not a role holder';
};
const nameOf = (m: any, i: number) => `C${i + 1} ${m.id.slice(0, 8)}`;

// ---- development figures (the development door's centre run = the full run's development part, checked)
const devOf = (e: any) => ({
  net: e.detail.metrics.totalMarkedNetUsd,
  realized: e.detail.metrics.realizedNetUsd,
  open: e.detail.metrics.unrealizedNetUsd,
  dd: e.detail.minuteDrawdown,
  w: e.detail.metrics.trades.wins,
  l: e.detail.metrics.trades.losses,
  b: e.detail.metrics.trades.breakeven,
  closed: e.detail.metrics.trades.closed,
  openTrades: e.detail.metrics.trades.open,
  exposure: e.detail.metrics.occupancy.sessionsInvestedPercent
});
const valOf = (x: any) => {
  if (!x) return null;

  const d = x.detail;
  const bi = v.boundary.index;
  const closedVal = d.trades.filter((t: any) => t.status === 'closed' && t.exitIndex > bi);
  const days = d.daily.slice(bi + 1);
  const open = d.trades.find((t: any) => t.status === 'open');

  return {
    net: d.boundary.validationNet,
    dd: d.boundary.validationDrawdown,
    w: closedVal.filter((t: any) => t.net > 0).length,
    l: closedVal.filter((t: any) => t.net < 0).length,
    b: closedVal.filter((t: any) => t.net === 0).length,
    exposure: (100 * days.filter((s: any) => s.invested).length) / days.length,
    openAtEnd: open ? open.net : 0,
    carriedIn: d.boundary.carriedIn,
    newEntries: d.boundary.newEntries.length,
    run: d,
    battery: x.battery
  };
};
const vMember = (id: string) => (v ? v.members.find((m: any) => m.id === id) : null);

const lines: string[] = [];
const devC = devOf(q.control);
const valC = v ? valOf(v.control) : null;

lines.push('# Side by side: #4 and the frozen members (development and validation columns)', '');
lines.push(
  'Development = 2016-01-04 → 2024-12-31 (the development door; equal to the continuous run up to the 2024 close). Validation = 2025-01-02 → 2026-10-30 of ONE continuous run from 2016: net = marked equity at 2026-10-30 − at the 2024-12-31 close; drawdown peak initialized at the boundary equity. Drawdown % is of the $100,000 notional. W/L/B = closed trades (validation: closed after the boundary, a carried-in trade included). Δ = minus #4.',
  ''
);
lines.push(
  '| Configuration | Role | Dev net | Dev max minute DD | Dev W/L/B | Dev exposure | Dev Δ net | Dev Δ DD | Val net | Val max minute DD | Val W/L/B | Val exposure | Val Δ net | Val Δ DD | Validation status |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|'
);

const row = (name: string, role: string, d: ReturnType<typeof devOf>, val: ReturnType<typeof valOf>, isControl: boolean) =>
  `| ${name} | ${role} | ${usd(d.net)} | ${usd(d.dd.maximumUsd)} (${pct(d.dd.percentOfNotional)}) | ${d.w}/${d.l}/${d.b} | ${pct(d.exposure, 1)} | ${isControl ? '—' : signed(d.net - devC.net)} | ${isControl ? '—' : signed(d.dd.maximumUsd - devC.dd.maximumUsd)} | ${val ? usd(val.net) : 'not opened'} | ${val ? `${usd(val.dd.maximumUsd)} (${pct(val.dd.percentOfNotional)})` : '—'} | ${val ? `${val.w}/${val.l}/${val.b}` : '—'} | ${val ? pct(val.exposure, 1) : '—'} | ${val && valC && !isControl ? signed(val.net - valC.net) : '—'} | ${val && valC && !isControl ? signed(val.dd.maximumUsd - valC.dd.maximumUsd) : '—'} | ${val ? `${val.battery.status}${val.battery.failed.length ? ` (${val.battery.failed.join(', ')})` : ''}` : '—'} |`;

lines.push(row('#4 (control)', 'fixed control', devC, valC, true));
members.forEach((m: any, i: number) => lines.push(row(nameOf(m, i), `${m.pick} → ${roleOf(m.id)}${m.qualified ? '' : ' — not qualified'}`, devOf(m), v ? valOf(vMember(m.id)) : null, false)));
lines.push('');

// ---- the detailed ledger
lines.push('# Detailed ledger', '');

const ledgerOf = (title: string, e: any, x: any) => {
  const d = devOf(e);

  lines.push(`## ${title}`, '');
  lines.push(
    `- Development: total marked ${usd(d.net)} = realized ${usd(d.realized)} + open ${usd(d.open)}; max minute DD ${usd(d.dd.maximumUsd)} (${pct(d.dd.percentOfNotional)}), ${date(d.dd.peakTime)} → ${date(d.dd.troughTime)}, ${d.dd.recovered ? `recovered ${date(d.dd.recoveryTime)}` : 'not recovered by 2024-12-31'}; ${d.closed} closed (${d.w}/${d.l}/${d.b}), ${d.openTrades} open; exposure ${pct(d.exposure, 1)}.`
  );

  if (x) {
    const val = valOf(x)!;
    const run = x.detail;

    lines.push(
      `- Whole run 2016-01-04 → 2026-10-30: total marked ${usd(run.metrics.totalMarkedNetUsd)} = realized ${usd(run.metrics.realizedNetUsd)} + open ${usd(run.metrics.unrealizedNetUsd)}; max minute DD ${usd(run.minuteDrawdown.maximumUsd)} (${pct(run.minuteDrawdown.percentOfNotional)}), ${date(run.minuteDrawdown.peakTime)} → ${date(run.minuteDrawdown.troughTime)}, ${run.minuteDrawdown.recovered ? `recovered ${date(run.minuteDrawdown.recoveryTime)}` : 'not recovered by the end'}.`,
      `- Validation: net ${usd(val.net)} (boundary equity ${usd(run.boundary.equity)} → ${usd(run.boundary.finalEquity)}); max minute DD from the boundary ${usd(val.dd.maximumUsd)} (${pct(val.dd.percentOfNotional)}), ${date(val.dd.peakTime)} → ${date(val.dd.troughTime)}, ${val.dd.recovered ? `recovered ${date(val.dd.recoveryTime)}` : 'not recovered by 2026-10-30'}; ${val.newEntries} new entries; open at the end ${usd(val.openAtEnd)}.`,
      ...val.carriedIn.map((c: any) => `- Carried in: trade ${c.n} entered ${c.entryDate}, ${c.status === 'open' ? 'still open' : `closed ${c.exitDate}`}: net ${usd(c.net)} = ${usd(c.developmentPart)} before the boundary + ${usd(c.validationPart)} after.`)
    );
  }

  lines.push('', '| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |', '|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|');
  for (const t of (x ? x.detail.trades : e.detail.trades) as any[])
    lines.push(`| ${t.n} | ${t.status} | ${t.origin} | ${t.entryDate} | ${t.entryPrice.toFixed(2)} | ${t.exitDate ?? '—'} | ${t.exitPrice.toFixed(2)} | ${t.exitReason ?? 'open (marked)'} | ${t.sessionsHeld} | ${usd(t.gross)} | ${usd(t.costs)} | ${usd(t.interest)} | ${usd(t.net)} |`);
  lines.push('');
};

ledgerOf('#4 (control)', q.control, v?.control);
members.forEach((m: any, i: number) => ledgerOf(`${nameOf(m, i)} (${m.pick}; ${roleOf(m.id)})`, m, vMember(m.id)));

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'side-by-side-and-ledgers.md'), `${lines.join('\n')}\n`);

// ---- development evidence
const ev: string[] = ['# Development evidence (in-sample; report-only unless a gate)', ''];
const all = [{ ...q.control, label: '#4' }, ...members.map((m: any, i: number) => ({ ...m, label: nameOf(m, i) }))];

ev.push('## Neighbourhoods (distinct effective configurations / distinct trade ledgers)', '');
ev.push('| Configuration | Family | n | ledgers | share DD < $35k | p90 DD | median net | p10 net | robust/yr | robust $ | median/yr |', '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const e of all)
  for (const [fam, nb] of [
    ['confirmation 3×128', e.confirm.nb],
    ['selection 2×128', e.select.nb],
    ...(e.inbox ? [['in-box 2×128', e.inbox.nb]] : []),
    ['half radius 128', e.reportOnly.half],
    ['wide 1.5r 128', e.reportOnly.wide]
  ] as [string, any][])
    ev.push(`| ${e.label} | ${fam} | ${nb.n} | ${nb.ledgers} | ${(100 * nb.share).toFixed(1)}% | ${usd(nb.p90Dd)} | ${usd(nb.medianNet)} | ${usd(nb.p10Net)} | ${usd(nb.robustPerYear)} | ${usd(nb.robustNet)} | ${usd(nb.medianPerYear)} |`);

ev.push('', '## Gates', '', '| Configuration | Q1 | Q2 | Q2b | Q4 | Q5 | Q6 | Q7 | Q8 | E1 | E2 | search-feasible | qualified | marginal |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const e of all) {
  const g = e.gates;
  const b = (x: boolean | null) => (x === null ? '—' : x ? 'pass' : 'FAIL');

  ev.push(`| ${e.label} | ${b(g.Q1)} | ${b(g.Q2)} | ${b(g.Q2b)} | ${b(g.Q4)} | ${b(g.Q5)} | ${b(g.Q6)} | ${b(g.Q7)} | ${b(g.Q8)} | ${b(g.E1)} | ${b(g.E2)} | ${b(g.searchFeasible)} | ${e.qualified ? 'yes' : 'no'} | ${e.marginal ? 'yes' : 'no'} |`);
}

ev.push('', '## Year-by-year contributions (marked net per calendar year)', '');

const years = Object.keys(q.control.years).sort();

ev.push(`| Configuration | ${years.join(' | ')} |`, `|---|${years.map(() => '---:').join('|')}|`);
for (const e of all) ev.push(`| ${e.label} | ${years.map((y) => usd(e.years[y] ?? 0)).join(' | ')} |`);

ev.push('', '## Concentration, episodes, losses, exposure, time underwater', '');
ev.push('| Configuration | net | largest win | net ex largest win | largest win share | episodes | profitable episodes | losses | worst loss | exposure | underwater | longest underwater (sessions) |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const e of all)
  ev.push(`| ${e.label} | ${usd(e.record.net)} | ${usd(e.concentration.largestWin)} | ${usd(e.concentration.netExLargestWin)} | ${pct(100 * e.concentration.largestWinShare, 1)} | ${e.record.episodes} | ${e.record.profitableEpisodes} | ${e.record.losses} | ${usd(e.record.worstLoss)} | ${pct(e.record.exposure, 1)} | ${pct(e.record.underwater, 1)} | ${e.record.longestUnderwater} |`);

ev.push('', '## Cost stresses (separate diagnostics; Q7 gates 10 bps)', '');
ev.push('| Configuration | 5 bps net / DD | 10 bps net / DD | 10 bps confirmation-1 median / p90 | 20 bps net / DD | 20 bps confirmation-1 median / p90 |', '|---|---:|---:|---:|---:|---:|');
for (const e of all) {
  const s10 = e.stress['10bps'];
  const s20 = e.stress['20bps'];

  ev.push(`| ${e.label} | ${usd(e.record.net)} / ${usd(e.record.dd)} | ${usd(s10.centre.net)} / ${usd(s10.centre.dd)} | ${usd(s10.confirm1.nb.medianNet)} / ${usd(s10.confirm1.nb.p90Dd)} | ${usd(s20.centre.net)} / ${usd(s20.centre.dd)} | ${usd(s20.confirm1.nb.medianNet)} / ${usd(s20.confirm1.nb.p90Dd)} |`);
}

ev.push('', '## Expanding folds (slices of the continuous development run; centre and confirmation neighbourhood)', '');
ev.push('| Configuration | Fold | train | test | centre train net | centre test net | nbhd test median | nbhd test p10 | nbhd test > 0 |', '|---|---|---|---|---:|---:|---:|---:|---:|');
for (const e of all)
  for (const f of e.folds)
    ev.push(`| ${e.label} | ${f.fold} | ${f.train} | ${f.test} | ${usd(f.centreTrainNet)} | ${usd(f.centreTestNet)} | ${usd(f.neighbourhoodTestMedian)} | ${usd(f.neighbourhoodTestP10)} | ${(100 * f.neighbourhoodTestPositiveShare).toFixed(0)}% |`);

ev.push('', `Procedural fold diagnostic over the search's rung-3 set (Spearman of 2016–train robust profit with the test-slice median): ${q.proceduralFolds.map((f: any) => `${f.fold} ρ = ${Number.isFinite(f.spearmanTrainRobustVsTestMedian) ? f.spearmanTrainRobustVsTestMedian.toFixed(2) : 'n/a'} (n ${f.n})`).join('; ')}.`, '');

ev.push('## Ablations (each enabled optional rule OFF; centre only)', '');
ev.push('| Configuration | Rule OFF | net | DD | trades | wins |', '|---|---|---:|---:|---:|---:|');
for (const e of all) for (const a of e.ablations) ev.push(`| ${e.label} | ${a.rule} | ${usd(a.net)} | ${usd(a.dd)} | ${a.trades} | ${a.wins} |`);

ev.push('', '## Winning trades against #4 (development window; the predeclared matching rule)', '');
ev.push('| Configuration | winners | #4 winners | retained | retimed | extra entries in #4 moves | new wins on #4 losing moves | new winning moves | extra entries in new moves | lost #4 winners (net) | losses vs #4 | evidence |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|');
members.forEach((m: any, i: number) => {
  const x = q.matching[m.id];

  ev.push(`| ${nameOf(m, i)} | ${x.candidateWinners} | ${x.controlWinners} | ${x.retained} | ${x.retimed} | ${x.extraEntriesInControlMoves.length} | ${x.newWinsOnControlLosingMoves.length} | ${x.newWinningMoves} | ${x.extraEntriesInNewMoves} | ${x.lostControlWinners.length} (${usd(x.lostControlWinnersNet)}${x.lostControlWinners.length ? `: ${x.lostControlWinners.map((l: any) => `#${l.control} ${l.entryDate} ${usd(l.net)}`).join(', ')}` : ''}) | ${x.candidateLosses} (${usd(x.candidateLossSum)}) vs ${x.controlLosses} (${usd(x.controlLossSum)}) | ${x.sparse ? 'sparse — inconclusive' : 'sufficient'} |`);
});

ev.push('', '## Distinct effective configurations and ledgers per rung (search archive)', '');
ev.push('| Family | centres | feasible | distinct configs per centre (min / median / max) | total neighbour configurations | distinct ledgers per centre (min / median / max) |', '|---|---:|---:|---|---:|---|');
for (const [k, r] of Object.entries(q.rungs) as [string, any][])
  ev.push(`| ${k} | ${r.centres} | ${r.feasible} | ${r.distinctConfigurations.min} / ${r.distinctConfigurations.median} / ${r.distinctConfigurations.max} | ${r.distinctConfigurations.total} | ${r.distinctLedgers.min} / ${r.distinctLedgers.median} / ${r.distinctLedgers.max} |`);

fs.writeFileSync(path.join(outDir, 'development-evidence.md'), `${ev.join('\n')}\n`);

// ---- validation battery
if (v) {
  const vb: string[] = ['# Validation battery (opened once; development rank order)', ''];

  vb.push(`- #4 parity (2016-01-04 → 2026-10-30): ${v.parity4.passed ? 'PASSED' : 'FAILED'}.`, '');
  vb.push('| Field | Expected (browser) | Observed | Match |', '|---|---:|---:|---|');
  for (const [k, e] of Object.entries(v.parity4.expected)) vb.push(`| ${k} | ${String(e)} | ${String(v.parity4.observed[k])} | ${v.parity4.checks[k] ? 'yes' : 'NO'} |`);
  vb.push('', `Calendar-time exposure (not the browser's displayed figure): ${v.parity4.observed.exposureCalendarPercent}%.`, '');
  vb.push('| Configuration | T1 | T2 | T3 | T4 | T5 | T6 | T7 | status | test share | test p90 DD | test val median | new val trades / episodes | 10 bps val net | higher net with ≤ DD than #4 | winners retained / retimed / new moves / lost (val) | losses vs #4 |', '|---|---|---|---|---|---|---|---|---|---:|---:|---:|---|---:|---|---|---|');

  const bt = (x: any, label: string, cmp: any) => {
    const g = x.battery.gates;
    const f = x.battery.figures;
    const b = (y: boolean) => (y ? 'pass' : 'FAIL');

    vb.push(`| ${label} | ${b(g.T1)} | ${b(g.T2)} | ${b(g.T3)} | ${b(g.T4)} | ${b(g.T5)} | ${b(g.T6)} | ${b(g.T7)} | ${x.battery.status} | ${(100 * f.testShare).toFixed(1)}% | ${usd(f.testP90Dd)} | ${usd(f.testValidationMedian)} | ${f.newValidationTrades} / ${f.newValidationEpisodes} | ${usd(f.stress10ValidationNet)} | ${cmp ? (cmp.higherNetWithEqualOrLowerDrawdown ? 'yes' : 'no') : '—'} | ${cmp ? `${cmp.winners.retained} / ${cmp.winners.retimed} / ${cmp.winners.newWinningMoves} / ${cmp.winners.lostControlWinners.length}${cmp.winners.sparse ? ' (sparse)' : ''}` : '—'} | ${cmp ? `${cmp.winners.candidateLosses} vs ${cmp.winners.controlLosses}${cmp.lossesIncreased ? ' (more)' : ''}` : '—'} |`);
  };

  bt(v.control, '#4', null);
  members.forEach((m: any, i: number) => {
    const x = vMember(m.id);

    if (x) bt(x, nameOf(m, i), x.versus4);
  });
  vb.push('', '## Coverage (regular-session minute bars against the NYSE calendar)', '');
  vb.push('| Window | sessions | missing sessions | bars < 90% of scheduled | bars < 50% | fewest bars | median bars | early closes (calendar) | no closing print |', '|---|---:|---:|---:|---:|---:|---:|---|---|');
  for (const [k, c] of Object.entries(v.coverage) as [string, any][]) {
    const sorted = c.partialSessions.map((x: any) => x.bars).sort((a: number, b: number) => a - b);
    const half = c.partialSessions.filter((x: any) => x.bars < 0.5 * x.scheduled);
    const fewest = c.partialSessions.reduce((m: any, x: any) => (!m || x.bars < m.bars ? x : m), null);

    vb.push(`| ${k} | ${c.sessions} | ${c.missingSessions.length}${c.missingSessions.length ? ` (${c.missingSessions.join(', ')})` : ''} | ${c.partialSessions.length} | ${half.length}${half.length ? ` (${half.map((x: any) => `${x.date} ${x.bars}/${x.scheduled}`).join(', ')})` : ''} | ${fewest ? `${fewest.bars}/${fewest.scheduled} (${fewest.date})` : '—'} | ${sorted.length ? sorted[Math.floor(sorted.length / 2)] : '—'} (of the < 90% sessions) | ${c.earlyCloses.length} (${c.earlyClosesExpected.length}) | ${c.sessionsWithoutClosingPrint.join(', ') || 'none'} |`);
  }
  vb.push('', 'Minute bars exist only for minutes with a trade; the engine never imputes a missing minute (it fills and marks on the next actual minute), identically in every run, so thin minutes do not affect comparability between configurations.', '', '## Continuity', '', '```json', JSON.stringify({ continuity: v.continuity, control: v.control.developmentContinuity, members: v.members.map((m: any) => ({ id: m.id, ...m.developmentContinuity })) }, null, 1), '```');
  fs.writeFileSync(path.join(outDir, 'validation.md'), `${vb.join('\n')}\n`);
}

console.log(`tables written to ${outDir}`);
