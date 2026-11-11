// Report tables of growth-etf-screening (Priority 7A) from its sealed records: Markdown (and CSV for the per-ETF
// screens) in results/tables/. Outside the pinned code closure; reads records only (no evaluation, no door).
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/growth-etf-screening/tables.ts [outDir]
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../..');
const study = path.join(repo, 'research', 'growth-etf-screening');
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(study, 'results');
const tables = path.join(out, 'tables');
const cutoffsAll = fs.existsSync(path.join(out, 'qualify', 'P18')) ? ['P18'] : ['C19', 'C21', 'C23', 'C24'];

fs.mkdirSync(tables, { recursive: true });

type J = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const read = (f: string): J | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as J) : null);
const usd = (x: unknown) =>
  typeof x !== 'number' || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (x: unknown, d = 1) => (typeof x === 'number' && Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—');
const esc = (x: unknown) => String(x ?? '—').replaceAll('|', '\\|');
const md = (head: string[], rows: unknown[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.map(esc).join(' | ')} |`)].join('\n');
const csv = (head: string[], rows: unknown[][]) =>
  [head, ...rows].map((r) => r.map((x) => (typeof x === 'string' && /[",\n]/.test(x) ? `"${x.replaceAll('"', '""')}"` : String(x ?? ''))).join(',')).join('\n');
const write = (name: string, text: string) => fs.writeFileSync(path.join(tables, name), `${text.trim()}\n`);
const short = (label: string | null | undefined) => (label ? label.replace(/^C\d\d\//, '').replace(/^P18\//, '') : '—');

// ----- the universe -----

const universe = read(path.join(study, 'UNIVERSE_MANIFEST.json'));
const r1 = read(path.join(study, 'results', 'universe', 'R1-corporate-action-discontinuities.json'));

if (universe) {
  const eligible = new Set<string>(r1?.eligible ?? universe.eligible);
  const rows = (universe.rows as J[]).map((r) => [
    r.symbol,
    r.name,
    r.cluster,
    r.assetClass,
    r.quality,
    r.development ? pct(r.development.medianCoverage) : '—',
    r.developmentScan?.sessionsBelowHalfMinutes ?? '—',
    r.development ? usd(r.development.medianDollarVolume).replace('.00', '') : '—',
    r.corporateActions.development.map((x: J) => `${x.effectiveDate} ×${x.ratio}`).join('; ') || '—',
    r.corporateActions.validation.map((x: J) => `${x.effectiveDate} ×${x.ratio}`).join('; ') || '—',
    r.control ? 'control' : eligible.has(r.symbol) ? 'eligible' : 'UNTESTED',
    eligible.has(r.symbol) ? '' : (r.exclusion ?? (r1?.excluded as J[] | undefined)?.find((x) => x.symbol === r.symbol)?.reason ?? '')
  ]);

  write(
    'universe.md',
    `# Universe and data audit\n\n${eligible.size} eligible ETFs (VGT and GDX are controls); untested: ${(universe.rows as J[]).filter((r) => !eligible.has(r.symbol)).map((r) => r.symbol).join(', ')}.\n\n${md(['ETF', 'Name', 'Cluster', 'Class', 'Data label', 'Dev. median minute coverage', 'Dev. sparse sessions', 'Dev. median daily $ volume', 'Splits in development', 'Splits in validation', 'Status', 'Reason'], rows)}`
  );
}

// ----- per-cutoff screens -----

for (const cut of cutoffsAll) {
  const dir = path.join(out, 'qualify', cut);

  if (!fs.existsSync(dir)) continue;

  const recs = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => read(path.join(dir, f))!);
  const head = ['ETF', 'Ctrl', 'Shortlist', 'Confirmed', 'Qualified', 'Actual-profit holder', 'Centre net', 'Centre DD', 'Lots', 'Episodes', 'Top episode share', 'Sel. robust', 'Conf. median', 'Conf. p10', 'Conf. p90 DD', '> $35k', 'Worst-10% mean DD', 'Robust-profit sel. robust', 'Unqualified picks (failed gates)', 'Fresh sims'];
  const rows = recs.map((r) => {
    const ap = r.roles.roles['actual-profit'];
    const s = (r.summary as J[]).find((x) => x.label === ap);
    const rp = (r.summary as J[]).find((x) => x.label === r.roles.roles['robust-profit']);
    const failed = (r.summary as J[]).filter((x) => x.confirmed && !x.qualified).map((x) => `${short(x.label)} (${x.failed})`).join('; ');

    return [r.sym, r.control ? 'yes' : '', r.evidence.length, (r.summary as J[]).filter((x) => x.confirmed).length, r.roles.qualified, short(ap), usd(s?.net), usd(s?.dd), s?.lots ?? '—', s?.episodes ?? '—', pct(s?.topEpisodeShare), usd(s?.selectRobust), usd(s?.confirmMedian), usd(s?.confirmP10), usd(s?.confirmP90Dd), pct(s?.breachShare), usd(s?.worst10MeanDd), usd(rp?.selectRobust), failed || '—', r.compute.fresh];
  });

  write(`screen-${cut}.md`, `# ${cut}: the screen of every eligible ETF (development; confirmation decides qualification)\n\n${md(head, rows)}`);
  fs.writeFileSync(path.join(tables, `screen-${cut}.csv`), `${csv(head, recs.map((r, i) => rows[i]!.map((x, k) => (k >= 6 && k <= 18 ? (typeof x === 'string' ? x.replace(/[$,]/g, '').replace('−', '-') : x) : x))))}\n`);

  // coverage and seed variability
  const cov = recs.map((r) => {
    const s = read(path.join(out, 'search', cut, `${r.sym}.json`))!;
    const lanes = s.lanes as J[];
    const best = (rep: string) => Math.max(-Infinity, ...lanes.filter((l) => l.rep === rep).map((l) => l.best.feasibleNet ?? -Infinity));
    const sum = (k: string) => lanes.reduce((a, l) => a + (l.counts[k] ?? 0), 0);

    return [r.sym, sum('screenUnique') + sum('islandConfigs'), sum('plausible'), sum('r1Centres'), sum('r1Feasible'), sum('r2Feasible'), sum('picks'), (s.shortlist as J[]).length, lanes.map((l) => l.island.stop).join('/'), sum('screenCashEquivalent'), lanes.reduce((a, l) => a + l.ledgers.centres, 0), usd(best('A')), usd(best('B')), s.compute.fresh];
  });

  write(
    `coverage-${cut}.md`,
    `# ${cut}: search coverage per ETF (proposals, feasibility, seed variability)\n\nProposals = screened unique + island children (planned 1,024 per ETF); "best feasible" is the lane archives' highest rung-1-feasible centre net per paired seed (search evidence, not qualification).\n\n${md(['ETF', 'Proposals', 'Screen plausible', 'Rung-1 centres', 'Rung-1 feasible', 'Rung-2 feasible', 'Lane picks', 'ETF shortlist', 'Island stops', 'Cash-equivalent screen centres', 'Distinct ledgers (lanes)', 'Best feasible seed A', 'Best feasible seed B', 'Search fresh sims'], cov)}`
  );

  const sel = read(path.join(out, 'folds', cut, 'selection.json')) ?? (cut === 'C24' || cut === 'P18' ? read(path.join(out, 'final', 'selection-C24.json')) : null);

  if (sel) {
    const ranked = (sel.universe.ranked as J[]).slice(0, 20).map((x) => [x.rank, x.sym, short(x.label), usd(x.net), usd(x.robust), usd(x.p90)]);

    write(
      `selection-${cut}.md`,
      `# ${cut}: the universe selection\n\n- **Primary (universe, controls included):** ${short(sel.primary)}\n- **New-ETF primary (report-only):** ${short(sel.primaryNew)}\n- **Universe roles:** ${Object.entries(sel.universe.roles).map(([k, v]) => `${k} ${short(v as string)}`).join('; ')}\n- **New-ETF roles:** ${Object.entries(sel.new.roles).map(([k, v]) => `${k} ${short(v as string)}`).join('; ')}\n- ${sel.universe.reason}; Pareto set: ${(sel.universe.pareto as string[]).map(short).join(', ') || '—'}\n\nThe 20 highest qualified members by the actual-profit order:\n\n${md(['Rank', 'ETF', 'Member', 'Centre net', 'Sel. robust', 'Sel. p90 DD'], ranked)}`
    );
  }
}

// ----- folds and sequential -----

{
  const parts: string[] = ['# Chronological tests (independent procedure; development slices)'];

  for (const cut of ['C19', 'C21', 'C23', 'P18']) {
    const e = read(path.join(out, 'folds', cut, 'evaluation.json'));

    if (!e) continue;

    const rows = e.rows as J[];
    const prim = rows.filter((r) => r.foldPrimary);
    const acceptable = rows.filter((r) => r.sliceNet > 0 && r.sliceDd <= 35000).length;

    parts.push(
      `## ${cut} → ${e.slice.join(' → ')}\n\nUniverse primary: ${short(e.primary)}; new-ETF primary: ${short(e.primaryNew)}. Post-fold cohort (every ETF's frozen role holders): ${rows.length} members, ${acceptable} acceptable on the slice (P&L > $0 and reset DD ≤ $35,000).\n\n${md(['ETF', 'Fold primary', 'Roles', 'Slice P&L', 'Slice reset DD', 'Slice lots', 'Universe primary'], prim.sort((a, b) => b.sliceNet - a.sliceNet).map((r) => [r.sym, short(r.label), r.roles, usd(r.sliceNet), usd(r.sliceDd), (r.sliceLots as J[]).length, r.universePrimary ? 'yes' : '']))}`
    );
  }

  const seq = read(path.join(out, 'folds', 'sequential.json'));

  if (seq) {
    // slice reset DDs from the sealed fold evaluations (amendment A1: the sequential record's part.sliceDd runs to 2024-12-31)
    const evalDd = (fold: string, label: string | null) =>
      label ? ((read(path.join(out, 'folds', fold, 'evaluation.json'))?.rows as J[] | undefined)?.find((r) => r.label === label)?.sliceDd ?? null) : null;

    const pol = (p: J) => [p.name, p.parts.map((x: J) => `${x.fold}: ${x.sym ?? 'cash'} ${usd(x.sliceNet)} (slice DD ${usd(evalDd(x.fold, x.label))})`).join('; '), usd(p.charges), usd(p.net), usd(p.sequentialDd), p.ddPeak ?? '—', p.ddTrough ?? '—', p.recovered ? 'yes' : 'no', p.verdict];

    parts.push(`## Sequential policies 2020–2024\n\n${md(['Policy', 'Slices', 'Charges', 'Net', 'Sequential DD', 'Peak', 'Trough', 'Recovered', 'Verdict'], [pol(seq.universe), pol(seq.new)])}`);
    parts.push(
      `## Every ETF's own procedure (its fold primaries)\n\nSupported: ${(seq.supportedEtfs as string[]).join(', ') || 'none'}.\n\n${md(['ETF', 'C19 → 2020–21', 'C21 → 2022–23', 'C23 → 2024', 'Charges', 'Net', 'Sequential DD', 'Verdict'], (seq.perEtf as J[]).sort((a, b) => b.net - a.net).map((p) => [p.sym, ...p.parts.map((x: J) => (x.label ? `${usd(x.sliceNet)} (DD ${usd(evalDd(x.fold, x.label))})` : 'no primary')), usd(p.charges), usd(p.net), usd(p.sequentialDd), p.verdict]))}`
    );
  }

  write('folds.md', parts.join('\n\n'));
}

// ----- the transfer lane -----

{
  const dir = path.join(out, 'transfer');

  if (fs.existsSync(dir)) {
    const recs = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => read(path.join(dir, f))!);
    const keys = (recs[0]?.centres as J[] | undefined)?.map((c) => c.key) ?? [];
    const rows = recs.map((r) => [r.sym, ...(r.centres as J[]).map((c) => `${usd(c.net)}${c.plausible ? '' : ' ✗'}`), r.roles.qualified, short(r.roles.roles['actual-profit']?.replace(/^.*transfer /, ''))]);

    write(
      'transfer.md',
      `# The transfer lane (C24; informed; the nine exact vectors on every ETF)\n\nCentre development net per vector (✗ = not plausible: net ≤ 0, centre DD > $35,000 or no lot). Qualification (Q1–Q5) for ≤ 2 confirmation picks per ETF.\n\n${md(['ETF', ...keys, 'Qualified', 'Transfer actual-profit'], rows)}`
    );
  }
}

// ----- the final selection, diagnostics, validation -----

{
  const f = read(path.join(out, 'final', 'selection-C24.json'));

  if (f) {
    write(
      'final.md',
      `# The C24 selection and the ETF shortlist (frozen rule)\n\n- **Shortlist (new ETFs for a possible 7B):** ${(f.shortlist as string[]).join(', ') || 'none'}\n- **Close substitutes:** ${(f.substitutes as J[]).map((s) => `${s.sym} (of ${s.substituteOf}, ${s.cluster})`).join('; ') || 'none'}\n- **Near misses:** ${(f.nearMisses as J[]).map((s) => `${s.sym} (Tier ${s.tier}: ${s.reason})`).join('; ') || 'none'}\n- **Universe primary:** ${short(f.primary)}; **new-ETF primary:** ${short(f.primaryNew)}\n- **Futility:** ${f.futility ? 'yes — no validation' : 'no'}\n\n${md(['ETF', 'Cluster', 'Tier', 'P (actual-profit net)', 'R (robust-profit sel. robust)', 'Rank P', 'Rank R', 'Rank sum', 'Own procedure 2020–2024'], (f.ordered as J[]).map((r) => [r.sym, r.cluster, r.tier, usd(r.P), usd(r.R), r.rankP, r.rankR, r.rankSum, r.chronology ?? '—']))}`
    );
  }

  const d = read(path.join(out, 'final', 'diagnostics.json'));

  if (d) {
    const subj = (d.subjects as J[]).map((s) => [
      short(s.label),
      s.kind,
      s.why.join('; '),
      usd(s.centre.net),
      usd(s.centre.dd),
      s.centre.lots,
      s.centre.episodes,
      Object.values(s.subperiods).map((v) => usd(v)).join(' / '),
      pct(s.exposure),
      pct(s.underwaterShare),
      s.topEpisodeCausal ? `${s.topEpisodeCausal.window.first} → ${s.topEpisodeCausal.window.last}: ${usd(s.topEpisodeCausal.episodeNet)} (${pct(s.topEpisodeCausal.episodeShare)}) → ${usd(s.topEpisodeCausal.netWithoutNewFundingInIt)}` : '—',
      s.neighbourEpisodes ? `${pct(s.neighbourEpisodes.overlapShare)} (${s.neighbourEpisodes.label}); in-window ${pct(s.neighbourEpisodes.medianInWindowShare)}; clipped ${s.neighbourEpisodes.clippedDraws}` : '—',
      s.small ? `${usd(s.small.p90Dd)} / ${pct(s.small.breachShare)}` : '—',
      s.wide ? `${usd(s.wide.p90Dd)} / ${pct(s.wide.breachShare)}` : '—'
    ]);
    const overlap = (d.subjects as J[]).map((s) => [short(s.label), s.busyOverlap.heldDays, ...Object.entries(s.busyOverlap).filter(([k]) => k !== 'heldDays').map(([, v]) => pct(v))]);
    const okeys = Object.keys((d.subjects as J[])[0]?.busyOverlap ?? {}).filter((k) => k !== 'heldDays');
    const bh = Object.entries(d.buyAndHold.rows as J).map(([sym, v]) => [sym, usd(v.financed.net), usd(v.financed.dd), usd(v.unlevered.net), usd(v.unlevered.dd)]);

    write(
      'diagnostics.md',
      `# Diagnostics (development; report-only)\n\n## Subjects\n\nSubperiods: 2016–2019 / 2020–2021 / 2022–2023 / 2024. Neighbour episode reproduction: the share of the 128 selection draws whose leading winning episode overlaps the centre's (≥ 0.8 = "single-episode stability").\n\n${md(['Subject', 'Lane', 'Why', 'Centre net', 'Centre DD', 'Lots', 'Episodes', 'Subperiods', 'Exposure', 'Under water', 'Largest episode → net without new funding in it', 'Neighbour episode overlap', 'Small p90 DD / > $35k', 'Wide p90 DD / > $35k'], subj)}\n\n## Overlap of held days with VGT Growth and the known portfolios' busy days (development; a hypothesis about complementarity, not a pooled result)\n\n${md(['Subject', 'Held days', ...okeys], overlap)}\n\n## Buy-and-hold references (development; report-only; never a gate)\n\n${d.buyAndHold.note}\n\n${md(['ETF', 'Financed net', 'Financed DD', 'Unlevered net', 'Unlevered DD'], bh)}`
    );
  }

  const v = read(path.join(out, 'validation', 'validation.json'));

  if (v) {
    const rows = (v.rows as J[]).map((r) => [short(r.label), r.sym, r.why.join('; '), usd(r.developmentNet), usd(r.validationPnl), usd(r.realized), usd(r.unrealized), usd(r.resetDd), usd(r.wholeNet), usd(r.wholeDd), r.lotsAfterBoundary, r.carriedIn, usd(r.y2025), usd(r.y2026), [r.V1 ? 'V1' : '✗V1', r.V2 ? 'V2' : '✗V2', r.V3 ? 'V3' : '✗V3'].join(' ')]);
    const nat = (v.native as J[]).map((n) => [n.key, n.label, n.sym, usd(n.wholeNet), usd(n.target?.net), usd(n.wholeDd), usd(n.target?.dd), n.lots, n.target?.lots ?? '—', usd(n.validationPnl), usd(n.target?.validation), n.reproduced === null ? 'no sealed target' : n.reproduced ? 'exact' : 'DIFFERENT']);
    const nb = Object.entries(v.neighbourhoods as J).map(([k, x]) => [short(k), x.draws, pct(x.positiveShare), pct(x.zeroShare), usd(x.medianPnl), usd(x.p10Pnl), usd(x.p90ResetDd), usd(x.p90WholeDd), x.wholeBreaches]);

    write(
      'validation.md',
      `# Validation (FULL, once; 2025-01-02 → 2026-10-30; previously examined history)\n\n${md(['Member', 'ETF', 'Why', 'Development net', 'Validation P&L', 'Realized', 'Open', 'Reset val. DD', 'Whole-run net', 'Whole-run DD', 'Lots after 2024', 'Carried in', '2025', '2026', 'V1–V3'], rows)}\n\n## Native reproduction of the transfer vectors\n\n${md(['Key', 'Vector', 'ETF', 'Full net', 'Target', 'Full DD', 'Target', 'Lots', 'Target', 'Validation', 'Target', 'Result'], nat)}\n\n## Validation-window neighbourhoods (report-only; 128 C24 confirmation rep-1 draws)\n\n${md(['Member', 'Draws', 'Positive', 'Zero', 'Median P&L', 'p10 P&L', 'p90 reset DD', 'p90 whole DD', 'Whole-run DD > $35k'], nb)}`
    );
  }
}

// ----- every ETF across the cutoffs (qualification and the actual-profit holder at each training door) -----

{
  const cuts = cutoffsAll.filter((c) => fs.existsSync(path.join(out, 'qualify', c)));

  if (cuts.length > 1) {
    const syms = fs
      .readdirSync(path.join(out, 'qualify', cuts[0]!))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .sort();
    const rows = syms.map((sym) => [
      sym,
      ...cuts.map((c) => {
        const q = read(path.join(out, 'qualify', c, `${sym}.json`));

        if (!q) return '—';

        const ap = (q.summary as J[]).find((x) => x.label === q.roles.roles['actual-profit']);

        return ap ? `${q.roles.qualified} q; ${usd(ap.net)} / DD ${usd(ap.dd)}` : `0 q (best ${usd(Math.max(-Infinity, ...(q.summary as J[]).map((x) => x.net)))})`;
      })
    ]);

    write(
      'etf-by-cutoff.md',
      `# Every ETF at every cutoff (training door only): qualified members and the actual-profit holder's centre net / DD\n\n${md(['ETF', ...cuts.map((c) => `${c} (training ${c === 'C19' ? '2016–2019' : c === 'C21' ? '2016–2021' : c === 'C23' ? '2016–2023' : '2016–2024'})`)], rows)}`
    );
  }
}

// ----- the per-ETF development comparison (C24 roles, own procedure, transfers, buy-and-hold) -----

{
  const f = read(path.join(out, 'final', 'selection-C24.json'));
  const d = read(path.join(out, 'final', 'diagnostics.json'));
  const cut = cutoffsAll.includes('C24') ? 'C24' : 'P18';

  if (f) {
    const rows = (f.rows as J[])
      .map((r) => {
        const q = read(path.join(out, 'qualify', cut, `${r.sym}.json`))!;
        const best = Math.max(-Infinity, ...(q.summary as J[]).map((x) => x.net));
        const ap = r.actualProfit;
        const t = read(path.join(out, 'transfer', `${r.sym}.json`));
        const bt = t ? (t.centres as J[]).filter((c) => c.plausible).sort((a, b) => b.net - a.net)[0] : null;
        const bh = d?.buyAndHold.rows[r.sym];

        return {
          sort: ap?.net ?? -1e12 + best,
          row: [
            r.sym,
            r.cluster,
            r.control ? 'control' : '',
            usd(best),
            r.qualified,
            usd(ap?.net),
            usd(ap?.dd),
            ap ? `${ap.lots} / ${ap.episodes}` : '—',
            pct(ap?.topEpisodeShare),
            usd(ap?.confirmP10),
            usd(ap?.confirmP90Dd),
            usd(r.robustProfit?.selectRobust),
            r.chronology ? `${r.chronology.supported ? 'SUPPORTED' : 'unsupported'} (${usd(r.chronology.net)}, DD ${usd(r.chronology.dd)})` : '—',
            bt ? `${bt.key} ${usd(bt.net)}` : 'none plausible',
            r.transfer.qualified,
            bh ? usd(bh.financed.net) : '—',
            bh ? usd(bh.financed.dd) : '—'
          ]
        };
      })
      .sort((a, b) => b.sort - a.sort)
      .map((x) => x.row);

    write(
      'etf-comparison.md',
      `# Per-ETF development comparison (C24 independent screen; own procedure 2020–2024; transfer lane; buy-and-hold reference)\n\nSorted by the C24 actual-profit holder's centre net (ETFs without a qualified member last, by their best shortlist centre). "Best shortlist centre" is search evidence; qualification needs Q1–Q5 on fresh confirmation draws. Buy-and-hold: financed at 11% on $100,000, report-only, never a gate.\n\n${md(['ETF', 'Cluster', 'Ctrl', 'Best shortlist centre net', 'Qualified', 'Actual-profit net', 'Its DD', 'Lots / episodes', 'Top episode share', 'Conf. p10', 'Conf. p90 DD', 'Robust-profit sel. robust', 'Own procedure 2020–2024 (net, sequential DD)', 'Best plausible transfer (centre net)', 'Qualified transfers', 'Buy-and-hold financed net', 'Buy-and-hold DD'], rows)}`
    );
  }
}

// ----- compute -----

{
  const ledger = fs.existsSync(path.join(out, 'budget-ledger.jsonl'))
    ? fs.readFileSync(path.join(out, 'budget-ledger.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as J)
    : [];
  const groups = new Map<string, { fresh: number; hits: number; n: number }>();

  for (const e of ledger) {
    const k = e.job.startsWith('pilot-') ? 'pilot and bench' : e.job.replace(/-[A-Z]{2,5}$/, '').replace(/-[0-9a-f]{16}$/, '');
    const g = groups.get(k) ?? { fresh: 0, hits: 0, n: 0 };

    g.fresh += e.fresh;
    g.hits += e.hits;
    g.n++;
    groups.set(k, g);
  }

  const total = [...groups.values()].reduce((a, g) => a + g.fresh, 0);

  write(
    'compute.md',
    `# Compute (the ledger; fresh backend simulations against the 2,000,000 ceiling)\n\n${md(['Stage', 'Entries', 'Fresh simulations', 'Archive hits'], [...groups.entries()].map(([k, g]) => [k, g.n, g.fresh.toLocaleString('en-US'), g.hits.toLocaleString('en-US')]))}\n\n**Total fresh: ${total.toLocaleString('en-US')}** (ceiling 2,000,000).`
  );
}

console.log(`tables written to ${path.relative(repo, tables)}`);
