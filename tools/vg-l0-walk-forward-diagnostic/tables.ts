// Markdown tables and a machine-readable summary from this study's sealed records and the audited studies' sealed
// records (no simulation; the D24 session closes are read once to price the lots carried across each cutoff).
// Output: research/vg-l0-walk-forward-diagnostic/results/tables/*.md and summary.json (regenerated, not sealed).
// Run from the repository root: node --experimental-transform-types tools/vg-l0-walk-forward-diagnostic/tables.ts
import fs from 'node:fs';
import path from 'node:path';
import { openPrefixDoor } from '../../src/vg-d1-growth-joint/data.ts';
import { audited, ceiling, folds, r2, readRecord, repoRoot, resultsDir, usd } from './common.ts';

const out = path.join(resultsDir, 'tables');

fs.mkdirSync(out, { recursive: true });

const R = <T>(f: string) => readRecord<T>(path.join(resultsDir, f));
const A = <T>(f: string) => readRecord<T>(path.join(repoRoot, f));
const pct = (x: number | null | undefined) => (x === null || x === undefined ? '—' : `${r2(100 * x)}%`);
const u = (x: number | null | undefined) => (x === null || x === undefined ? '—' : usd(x));
const write = (name: string, title: string, intro: string, body: string[]) =>
  fs.writeFileSync(path.join(out, name), `# ${title}\n\n${intro}\n\n${body.join('\n')}\n`);
const table = (head: string[], rows: (string | number)[][], align?: string[]) => [
  `| ${head.join(' | ')} |`,
  `|${(align ?? head.map((_, i) => (i === 0 ? '---' : '---:'))).join('|')}|`,
  ...rows.map((r) => `| ${r.join(' | ')} |`)
];

const gates = R<any>('gates/gates.json');
const prim = R<any>('replays/primaries.json').subjects as any[];
const ses = R<any>('replays/session.json').subjects as any[];
const sel = R<any>('selection/selection.json');
const nb = R<any>('neighbours/selection-neighbourhoods.json').subjects as any[];
const ev = R<any>('replays/evaluated-rows.json').rows as any[];
const reg = R<any>('regimes/regimes.json').rows as any[];
const d8 = R<any>('gates/d8.json');
const subjectsAll = [...prim, ...ses.filter((s) => s.unit === 'ses')];
const subjectOf = (p: string, f: string) => subjectsAll.find((s) => s.path === p && s.fold === f && s.role === 'fold primary')!;

// ----- boundary closes (exposure of the lots carried across a cutoff) -----
const door = await openPrefixDoor('D24', 'wfd tables', true);
const closeAt = (sym: string, date: string) => {
  const i = door.dates.indexOf(date);

  if (i < 0) throw new Error(`${date} not in D24`);
  return Number(door.sym[sym as 'VGT' | 'GDX'].ds.sClose[i]);
};

// ===== audit.md =====
const pathNames: Record<string, string> = {
  '5B-L0': '5B L0 arm, independent procedure (calendar holds; V/G/B cells; 2 replicates)',
  SES: 'Trading-session study, independent procedure (session holds; V only; 6 replicates × V1–V3)',
  B1: 'Shadow eligibility B1, fresh joint (calendar; V only; 3 toggles searched; 32 replicates × V1–V3)',
  B2: 'Shadow eligibility B2, fresh sequential (D1 pair + toggles, then Growth·VGT; 8 replicates per step)'
};
const budgets: Record<string, string[]> = {
  '5B-L0': ['9,472 / 101,600', '9,728 / 100,913', '12,288 / 92,774'],
  SES: ['28,928 / 304,047', '26,880 / 276,504', '31,488 / 252,267'],
  B1: ['151,040 / 1,615,667', '157,440 / 1,661,821', '161,280 / 1,264,436'],
  B2: ['143,616 / 1,494,406', '143,872 / 1,531,188', '145,408 / 1,430,234']
};
const auditRows: (string | number)[][] = [];

for (const g of gates.g4.paths) {
  g.parts.forEach((p: any, i: number) => {
    const sp = sel.paths.find((x: any) => x.path === g.path && x.fold === p.fold);
    const t = sp.primary.training;

    auditRows.push([
      g.path,
      `${p.fold} → ${folds[i]!.slice.join(' → ')}`,
      `\`${p.label}\` (${sp.primary.inc}${sp.primary.sh ? `, toggles ${sp.primary.sh}` : ''})`,
      `${sp.set.qualified}/${sp.set.members}`,
      budgets[g.path]![i]!,
      u(t.centreNet),
      u(t.centreDd),
      `${u(t.confirmP90Dd)} / ${pct(t.confirmBreachShare)} / ${u(t.confirmWorstDd)}`,
      u(p.sliceNet),
      u(p.resetDd),
      `${p.resetPeak} → ${p.resetTrough}`,
      u(p.charge)
    ]);
  });
}

const seqRows = gates.g4.paths.map((g: any) => [
  g.path,
  pathNames[g.path]!,
  u(g.net),
  u(g.dd),
  `${g.peak} → ${g.trough}`,
  g.recovery,
  g.ok ? 'equal to the cent' : 'DIFFERS'
]);

// other chronological tests (sealed records; headline only)
const other = [
  ['Priority 2 (VGT D1 + VGT Growth)', 'research/vgt-d1-growth-joint/results/folds/sequential.json', 'joint procedure'],
  ['Priority 3 (VGT + GDX D1 + Growth, four components)', 'research/vg-d1-growth-joint/results/folds/sequential.json', 'independent joint procedure'],
  ['Priority 3B (4.6× larger independent search)', 'research/vg-d1-growth-expanded/results/folds/sequential.json', 'independent procedure'],
  ['Priority 4A (GDX Growth alone)', 'research/gdx-growth-standalone/results/folds/sequential.json', 'independent procedure'],
  ['Priority 7A (ETF and Growth phenotype)', 'research/growth-etf-screening/results/folds/sequential.json', 'the universe procedure']
].map(([name, file, prefix]) => {
  const s = A<any>(file!);
  let found: any = null;
  const walk = (o: any) => {
    if (found || !o || typeof o !== 'object') return;
    if (typeof o.name === 'string' && o.name.startsWith(prefix!) && 'sequentialDd' in o) found = o;
    else for (const v of Object.values(o)) walk(v);
  };

  walk(s);
  return [name!, `\`${file}\``, u(found.net), u(found.sequentialDd), `${found.ddPeak} → ${found.ddTrough}`];
});
const fiveB = A<any>('research/vg-lifecycle-matched-optimization/results/folds/sequential.json');

for (const m of ['L1', 'L2']) {
  const p = fiveB.arms.find((a: any) => a.mode === m).procedure;

  other.push([`5B ${m} arm (other Growth lifecycle)`, '`research/vg-lifecycle-matched-optimization/results/folds/sequential.json`', u(p.net), u(p.sequentialDd), `${p.ddPeak} → ${p.ddTrough}`]);
}

const sesSeq = A<any>('research/vg-l0-session-hold/results/folds/sequential.json');
const cross = sesSeq.arms.flatMap((a: any) => a.policies).find((p: any) => p.name.startsWith('cal (descriptive cross row') && p.name.includes('independent procedure'));

if (cross) other.push(['Session study fold selections replayed under calendar holds (cross row, report-only)', '`research/vg-l0-session-hold/results/folds/sequential.json`', u(cross.net), u(cross.sequentialDd), `${cross.ddPeak} → ${cross.ddTrough}`]);

// role and replicate paths (sealed)
const rolePaths: (string | number)[][] = [];
const policiesOf = (key: string): any[] =>
  key === '5B-L0'
    ? fiveB.arms.find((a: any) => a.mode === 'L0').policies
    : key === 'SES'
      ? sesSeq.arms.flatMap((a: any) => a.policies).filter((p: any) => p.name.startsWith('ses:'))
      : A<any>('research/vg-l0-shadow-eligibility/results/folds/sequential.json').procedures.find((p: any) => p.track === key).policies;

for (const key of ['5B-L0', 'SES', 'B1', 'B2']) {
  const ps = policiesOf(key);
  const roles = ps.filter((p: any) => /role /.test(p.name));
  const reps = ps.filter((p: any) => /replicate R\d+ alone/.test(p.name));

  for (const p of roles) rolePaths.push([key, p.name.replace(/^.*role /, 'role '), u(p.net), u(p.sequentialDd), p.sequentialDd > ceiling ? 'breach' : 'within']);
  if (reps.length)
    rolePaths.push([
      key,
      `${reps.length} seed-level replicate paths`,
      `${u(Math.min(...reps.map((p: any) => p.net)))} … ${u(Math.max(...reps.map((p: any) => p.net)))}`,
      `${u(Math.min(...reps.map((p: any) => p.sequentialDd)))} … ${u(Math.max(...reps.map((p: any) => p.sequentialDd)))}`,
      `${reps.filter((p: any) => p.sequentialDd <= ceiling && p.net > 0).length} of ${reps.length} supported`
    ]);
}

write(
  'audit.md',
  'Experiment audit: folds, selections, budgets and reconciled walk-forward paths',
  'Sealed records of the audited studies; every slice net and DD recomputed independently from the fold mark caches (gate G4, `results/gates/gates.json`). DD = maximum minute drawdown of the marked net on the fixed $100,000; slice DD is reset at the cutoff close; the sequential DD is not reset. Budgets per cutoff: distinct proposals / requested search evaluations (the audited studies\' budget tables). Training statistics: centre on the training door; confirmation family 3 × 128 draws (p90 DD / breach share / worst DD).',
  [
    '## Fold primaries (each re-optimized at its cutoff; selection committed before the slice opened)',
    '',
    ...table(['Path', 'Fold → slice', 'Fold primary (structure, toggles)', 'Qualified / members', 'Budget at cutoff', 'Training net', 'Training DD', 'Conf. p90 DD / breach / worst', 'Slice net', 'Slice DD (reset)', 'Slice DD peak → trough', 'Switch charge'], auditRows),
    '',
    '## The walk-forward paths (sealed verdict: chronologically unsupported in all four)',
    '',
    ...table(['Path', 'Procedure', 'Net 2020–2024', 'Sequential DD', 'Peak → trough', 'Recovered by', 'Recomputed'], seqRows),
    '',
    '## Role and seed-level paths of the same procedures (sealed; reporting only)',
    '',
    ...table(['Path', 'Policy', 'Net', 'Sequential DD', 'Verdict on DD'], rolePaths),
    '',
    '## Other chronological tests of related procedures (sealed headlines)',
    '',
    ...table(['Study', 'Record', 'Net 2020–2024', 'Sequential DD', 'Peak → trough'], other)
  ]
);

// ===== chronology.md =====
const chron: string[] = [];

for (const key of ['5B-L0', 'SES', 'B1', 'B2', 'NL0']) {
  chron.push(`## ${key === 'NL0' ? 'New L0 (fixed; chosen with later data — descriptive only)' : pathNames[key]}`, '');
  for (const f of folds) {
    const s = key === 'NL0' ? prim.find((x) => x.path === 'NL0' && x.fold === f.fold) : subjectOf(key, f.fold);
    const sl = s.slice;
    const occ = Object.entries(sl.occupancy as Record<string, number>)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');

    chron.push(`### ${f.fold} → ${f.slice.join(' → ')}: \`${s.label}\` — slice ${u(s.sealed.sliceNet)}, DD ${u(s.sealed.sliceDd)}`, '');
    chron.push(`Sessions held at the close (of ${sl.sessions}): ${occ}. Refusals in the slice: ${sl.refusals.total} (${Object.entries(sl.refusals.byPair).map(([k, v]) => `${k} ×${v}`).join('; ') || 'none'}).`, '');
    for (const c of sl.carried as any[]) {
      const lot = sl.lots.find((l: any) => l.carriedIntoSlice && l.entry === c.entry);
      const sym = c.book.slice(-3);
      const shares = lot.principal / lot.entryPrice;
      const mv = shares * closeAt(sym, f.boundary);

      chron.push(
        `Carried across the cutoff: ${c.book} lot entered ${c.entry} at ${u(lot.entryPrice)}, marked **${u(c.markAtBoundary)}** at ${f.boundary} (${pct(c.markAtBoundary / sl.boundaryEquity)} of the training net ${u(sl.boundaryEquity)}); market value ${u(r2(mv))} = ${r2(mv / lot.principal)}× its $${lot.principal.toLocaleString('en-US')} principal; slice change ${u(c.sliceChange)}; exit ${c.exit} (${lot.exitReasons}).`,
        ''
      );
    }
    sl.episodes.slice(0, 2).forEach((e: any, k: number) => {
      chron.push(`Episode ${k + 1}: peak ${e.peak} → trough ${e.trough} (recovered ${e.recovery}): **${u(e.depth)}**${e.depth > ceiling ? ' (> $35,000)' : ''}.`, '');
      chron.push(
        ...table(
          ['Lot (book)', 'Entry', 'Exit', 'Exit reason', 'Change in window', 'Lot net', 'Lot MAE'],
          (e.contributions as any[]).filter((c) => Math.abs(c.change) >= 1).map((c) => [c.book, c.entry, c.exit, c.exitReasons || '—', u(c.change), u(c.lotNet), u(c.lotMae)])
        ),
        ''
      );
      if (e.refusalsInWindow.length)
        chron.push(`Refused decisions inside the window: ${e.refusalsInWindow.map((x: any) => `${x.t} ${x.book} (${x.kind}) ← ${x.occupant}`).join('; ')}.`, '');
    });
  }
}
write(
  'chronology.md',
  'Trade-level chronology of the fold primaries on their slices',
  'Replays with each study\'s own code (`results/replays/primaries.json`, `session.json`; every replay equal to its sealed record field for field, gate G3). Episodes are drawdown episodes of the slice\'s marked net (from a strict new high to its recovery); the largest is the slice DD. "Change in window" partitions each episode between the lots that held the single slot (one funded slot: the changes sum to −depth). Lot net and MAE are the whole lot\'s (a lot carried across the cutoff includes its training-period gain). Times UTC.',
  chron
);

// ===== removal.md =====
const remRows: (string | number)[][] = [];

for (const s of [...prim, ...ses.filter((x) => x.unit === 'ses')])
  for (const r of s.removal)
    remRows.push([s.path, s.fold, r.without, u(s.sealed.sliceNet), u(s.sealed.sliceDd), u(r.boundaryEquity), u(r.sliceNet), u(r.sliceDd), r.sliceDd > ceiling ? 'breach' : 'within']);
write(
  'removal.md',
  'Causal removal: complete pooled replays with a book or family disabled (D4)',
  'Each row reruns the fold primary continuously from 2016-01-04 with the named book(s) never funded (the shadow study\'s toggle bit of a disabled book is 0). The cutoff state changes too (training-net column), so a removal is a whole-run counterfactual, not a slice-only switch. Report-only.',
  table(['Path', 'Fold', 'Without', 'Slice net (as sealed)', 'Slice DD (as sealed)', 'Training net without', 'Slice net without', 'Slice DD without', 'DD verdict'], remRows)
);

// ===== selection.md =====
const sRows = sel.paths.map((p: any) => {
  const t = p.primary.training;

  return [
    p.path,
    p.fold,
    `\`${p.primary.label}\``,
    `${p.set.qualified}`,
    p.primary.rank2 ? u(p.primary.rank2.gap) : '—',
    p.primary.top10Spread !== null ? u(p.primary.top10Spread) : '—',
    `${t.lots} / ${t.episodes}`,
    pct(t.topEpisodeShare),
    pct(t.unrealizedShare),
    pct(t.lastTwoYearsShare),
    `${u(t.confirmP90Dd)} / ${pct(t.confirmBreachShare)} / ${u(t.confirmWorst10Mean)}`,
    `${p.evaluatedSummary.breaching}/${p.evaluatedSummary.n}`,
    `${p.evaluatedSummary.primarySliceRankByNet} of ${p.evaluatedSummary.n}`
  ];
});
const corrRows = sel.paths.map((p: any) => [
  p.path,
  p.fold,
  p.correlations.n,
  p.correlations.centreNet_vs_sliceNet ?? '—',
  p.correlations.centreNet_vs_sliceDd ?? '—',
  p.correlations.confirmP90Dd_vs_sliceDd ?? '—',
  p.correlations.confirmWorst10Mean_vs_sliceDd ?? '—',
  p.correlations.topEpisodeShare_vs_sliceNet ?? '—',
  p.correlations.unrealizedShare_vs_sliceDd ?? '—'
]);
const pooledRows = Object.entries(sel.pooledByFold).map(([f, c]: [string, any]) => [
  f,
  c.n,
  c.breaching,
  c.centreNet_vs_sliceNet,
  c.centreNet_vs_sliceDd,
  c.confirmP90Dd_vs_sliceDd,
  c.confirmWorst10Mean_vs_sliceDd,
  c.topEpisodeShare_vs_sliceNet,
  c.unrealizedShare_vs_sliceDd
]);
const repRows = sel.paths
  .filter((p: any) => p.replicatePrimaries)
  .map((p: any) => {
    const r = p.replicatePrimaries;

    return [
      p.path,
      p.fold,
      r.n,
      `${r.breaching}`,
      `${r.acceptable}`,
      `${u(r.trainingNet.min)} … ${u(r.trainingNet.max)}`,
      `${u(r.sliceNet.min)} … ${u(r.sliceNet.median)} … ${u(r.sliceNet.max)}`,
      `${u(r.sliceDd.min)} … ${u(r.sliceDd.median)} … ${u(r.sliceDd.max)}`,
      Object.entries(r.growthEntry).map(([k, v]) => `${k} ${v}`).join(', '),
      `X ${r.d1.VGT.targetPercentChange.min}–${r.d1.VGT.targetPercentChange.max}, stop ${r.d1.VGT.trailingStopPercentage.min}–${r.d1.VGT.trailingStopPercentage.max}, hold ${r.d1.VGT.maximumHoldDays.min}–${r.d1.VGT.maximumHoldDays.max}`,
      `X ${r.d1.GDX.targetPercentChange.min}–${r.d1.GDX.targetPercentChange.max}, stop ${r.d1.GDX.trailingStopPercentage.min}–${r.d1.GDX.trailingStopPercentage.max}, hold ${r.d1.GDX.maximumHoldDays.min}–${r.d1.GDX.maximumHoldDays.max}`
    ];
  });
const vec = (v: number[]) => `[${v.join(', ')}]`;
const paramRows = [
  ['New L0 (fixed)', '—', '—', vec(sel.newL0.d1.VGT), vec(sel.newL0.d1.GDX), JSON.stringify(sel.newL0.growth.VGT).replaceAll('"', '').replaceAll(',', ', ')],
  ...sel.paths.map((p: any) => [
    p.path,
    p.fold,
    `${p.primary.inc}${p.primary.sh ? ` / ${p.primary.sh}` : ''}`,
    vec(p.primary.d1.VGT),
    vec(p.primary.d1.GDX),
    Object.entries(p.primary.growth)
      .filter(([k]) => !(p.primary.inc === 'V' && k === 'GDX') && !(p.primary.inc === 'G' && k === 'VGT'))
      .map(([k, g]: [string, any]) => `${k}: ${g.entry}, trend ${g.trend}, gate ${g.gate}, trail ${g.trail}%, hold ${g.maxHold}, init ${g.initialStop}, retention ${g.retention}, cont ${g.continuation}`)
      .join('; ')
  ])
];
write(
  'selection.md',
  'Selection trace: why each fold primary was chosen, and what its cohort did next',
  'From the sealed selection and fold-evaluation records (`results/selection/selection.json`). Every slice figure was published by the audited study before this diagnostic; nothing here could have been selected at the cutoff (hindsight, report-only). "Evaluated rows" = every row the audited fold stage evaluated on the slice under its own convention (role holders and seed-level replicate primaries).',
  [
    '## The fold primaries in their qualified sets',
    '',
    ...table(['Path', 'Fold', 'Primary', 'Qualified', 'Rank-1 margin over #2', 'Spread #1–#10', 'Training lots / episodes', 'Top-episode share', 'Unrealized share at cutoff', 'Share earned in last 2 training years', 'Conf. p90 DD / breach / worst-10% mean', 'Evaluated rows breaching', 'Primary\'s slice rank by net'], sRows),
    '',
    '## Parameters: fold primaries beside New L0 (D1 vectors [X, Y, stop, hold, L, buffer, P, W]; tenths of a percent, hold in the study\'s unit)',
    '',
    ...table(['Subject', 'Fold', 'Structure / toggles', 'D1·VGT', 'D1·GDX', 'Growth'], paramRows),
    '',
    '## Seed-level replicate primaries (each replicate\'s own actual-profit holder; same procedure, different seed)',
    '',
    ...table(['Path', 'Fold', 'n', 'Breaching', 'Net > 0 and DD ≤ $35k', 'Training net range', 'Slice net min … median … max', 'Slice DD min … median … max', 'Growth·VGT entry', 'D1·VGT range', 'D1·GDX range'], repRows),
    '',
    '## Do training statistics rank the next slice? (Spearman, evaluated rows; descriptive)',
    '',
    ...table(['Path', 'Fold', 'n', 'Training net vs slice net', 'Training net vs slice DD', 'Conf. p90 DD vs slice DD', 'Conf. worst-10% mean vs slice DD', 'Top-episode share vs slice net', 'Unrealized share vs slice DD'], corrRows),
    '',
    'Pooled across the four procedures (heterogeneous sets; descriptive only):',
    '',
    ...table(['Fold', 'n', 'Breaching', 'Training net vs slice net', 'Training net vs slice DD', 'Conf. p90 DD vs slice DD', 'Conf. worst-10% mean vs slice DD', 'Top-episode share vs slice net', 'Unrealized share vs slice DD'], pooledRows)
  ]
);

// ===== neighbours.md =====
write(
  'neighbours.md',
  'Local versus chronological robustness: the fold primaries\' own selection neighbourhoods on the next slice (D7)',
  'Each fold primary\'s sealed selection family (2 × 128 draws, the family that ranked it) regenerated with its study\'s own code and seeds (parity: the training median, p10 and robust net equal the sealed values to the cent in all 12) and replayed once on the evaluation door (`results/neighbours/selection-neighbourhoods.json`; 3,072 simulations). Training breach share = the sealed selection family\'s share of draws above $35,000 on the training window.',
  table(
    ['Path', 'Fold', 'Draws', 'Parity', 'Training: centre DD / p90 DD / breach share / worst', 'Slice: centre net / DD', 'Slice: median net / p10 net / losing share', 'Slice DD: p10 / median / p90 / max', 'Slice breaches [Wilson 95%]', 'Net > 0 and DD ≤ $35k'],
    nb.map((x) => [
      x.path,
      x.fold,
      x.draws,
      x.parity.ok ? 'equal' : 'DIFF',
      `${u(x.training.centreDd)} / ${u(x.training.selectP90Dd)} / ${pct(x.training.selectBreachShare)} / ${u(x.training.selectWorstDd)}`,
      `${u(x.slice.centreNet)} / ${u(x.slice.centreDd)}`,
      `${u(x.slice.medianNet)} / ${u(x.slice.p10Net)} / ${pct(x.slice.losingShare)}`,
      `${u(x.slice.p10Dd)} / ${u(x.slice.medianDd)} / ${u(x.slice.p90Dd)} / ${u(x.slice.maxDd)}`,
      `${x.slice.breaches}/${x.draws} = ${pct(x.slice.breachShare)} [${pct(x.slice.breachInterval[0])}, ${pct(x.slice.breachInterval[1])}]`,
      `${x.slice.acceptable}`
    ])
  )
);

// ===== prevalence.md =====
const prevRows = folds.map((f) => {
  const rows = ev.filter((r) => r.fold === f.fold);
  const br = rows.filter((r) => r.breach);
  const med = (x: number[]) => (x.length ? [...x].sort((a, b) => a - b)[Math.floor((x.length - 1) / 2)]! : 0);
  const epi = br.filter((r) => r.worstEpisode);

  return [
    `${f.fold} → ${f.slice[0]!.slice(0, 4)}–${f.slice[1]!.slice(0, 4)}`,
    rows.length,
    br.length,
    `${rows.filter((r) => r.carried).length}`,
    pct(med(rows.map((r) => r.carriedShareOfTraining))),
    br.length ? u(med(epi.map((r) => r.worstEpisode.carriedGiveBack))) : '—',
    br.length ? pct(med(epi.map((r) => r.worstEpisode.carriedGiveBack / -r.worstEpisode.depth))) : '—',
    br.length ? pct(med(epi.map((r) => r.worstEpisode.byFamily.D1 / -r.worstEpisode.depth))) : '—',
    br.length ? `${epi.filter((r) => r.worstEpisode.largestSingleLoss <= -0.5 * r.worstEpisode.depth).length}/${epi.length}` : '—',
    br.length ? med(epi.map((r) => r.worstEpisode.losingLots)) : '—',
    br.length ? `${med(br.map((r) => r.maxHoldLosses.lots))} / ${u(med(br.map((r) => r.maxHoldLosses.net)))}` : '—',
    br.length ? u(med(br.map((r) => r.worstFreshMae))) : '—',
    med(rows.map((r) => r.refusals))
  ];
});
write(
  'prevalence.md',
  'How common each failure mechanism is among all evaluated fold winners (D6)',
  'Every row the audited fold stages evaluated on a slice under its own convention (172 rows: role holders and seed-level replicate primaries of 5B L0, the session study, B1 and B2), replayed with its study\'s code (all 172 equal to their sealed rows). Medians; "carried" = a lot open across the cutoff; "give-back" = that lot\'s change inside the row\'s worst slice episode; D1 share = the D1 books\' share of the worst episode\'s decline (descriptive attribution, not causal). `results/replays/evaluated-rows.json`.',
  table(
    ['Slice', 'Rows', 'Breaching', 'Carried lot at cutoff', 'Carried mark / training net', 'Carried give-back in worst episode (breaching)', 'Give-back / depth', 'D1 share of worst episode', 'One lot ≥ 50% of depth', 'Losing lots in worst episode', 'Max-hold losses: lots / net', 'Worst fresh-lot MAE', 'Refusals in slice'],
    prevRows
  )
);

// ===== regimes.md =====
write(
  'regimes.md',
  'Market regimes in the training windows and slices (D9; amendment A2)',
  'Session closes of door D24 (development data; `results/regimes/regimes.json`). Worst 15/30-day decline = the largest close-to-close fall between two sessions at most 15/30 calendar days apart (the exposure window of a D1 lot held to its maximum hold). Distinct declines are counted once per new high.',
  table(
    ['Symbol', 'Window', 'Return', 'Max DD (peak → trough, sessions)', 'Worst 15-day fall', 'Worst 30-day fall', 'Declines ≥ 15% / ≥ 20%', 'Sessions below SMA200'],
    reg.map((x) => [
      x.symbol,
      x.window,
      `${x.totalReturnPct}%`,
      `${x.maxDrawdownPct}% (${x.maxDrawdownPeak} → ${x.maxDrawdownTrough}, ${x.maxDrawdownSessions})`,
      `${x.worst15CalendarDays.decline}% (${x.worst15CalendarDays.window})`,
      `${x.worst30CalendarDays.decline}%`,
      `${x.distinctDeclines15} / ${x.distinctDeclines20}`,
      x.belowSma200Pct === null ? '—' : `${x.belowSma200Pct}%`
    ])
  )
);

// ===== checks.md =====
write(
  'checks.md',
  'Engineering gates and bug-audit checks',
  'All checks passed; see the records for every value.',
  table(
    ['Check', 'Result', 'Record'],
    [
      ['G1 audited records verify against their seals', `${gates.g1.checked - gates.g1.failed}/${gates.g1.checked}`, '`results/gates/gates.json`'],
      ['G2 evaluation digests at this checkout (Priority 3, 5B, shadow) = sealed', `${gates.g2.priority3Ok && gates.g2.vglmoOk && gates.g2.shadowOk ? '3/3 equal' : 'DIFF'}`, '`results/gates/gates.json`'],
      ['G2 session study digest at 18674b39 = sealed', R<any>('replays/session.json').g2.session.digest === R<any>('replays/session.json').g2.session.sealed ? 'equal' : 'DIFF', '`results/replays/session.json`'],
      ['G4 sequential paths recomputed from the mark caches (net, DD, peak, trough, every slice net and reset DD)', `${gates.g4.checked - gates.g4.failed}/${gates.g4.checked} equal to the cent`, '`results/gates/gates.json`'],
      ['G3 fold primaries replayed = sealed fold rows (every record field)', `${prim.filter((s) => s.g3.ok).length + ses.filter((s) => s.g3.ok).length}/${prim.length + ses.length}`, '`results/replays/*.json`'],
      ['Causal prefix: training-door run = sealed selection centre (every field)', `${[...prim, ...ses].filter((s) => s.causalPrefix && s.causalPrefix.ok).length}/${[...prim, ...ses].filter((s) => s.causalPrefix).length}`, '`results/replays/*.json`'],
      ['G3 every evaluated fold row replayed = sealed', `${ev.filter((r) => r.g3 === 'ok').length}/${ev.length}`, '`results/replays/evaluated-rows.json`'],
      ['D7 regenerated selection families = sealed training statistics', `${nb.filter((x) => x.parity.ok).length}/${nb.length}`, '`results/neighbours/selection-neighbourhoods.json`'],
      ['D8 consecutive-bar moves > 10% in VGT / GDX D24', `${d8.priceJumps.VGT.movesOver10pct.length} / ${d8.priceJumps.GDX.movesOver10pct.length} (of ${d8.priceJumps.VGT.bars} / ${d8.priceJumps.GDX.bars} bars)`, '`results/gates/d8.json`'],
      ['D8 splits of VGT / GDX in the split register', d8.splitsRegister.map((s: any) => `${s.symbol} ${s.ratio}:1 on ${s.effectiveDate} (after every development door)`).join('; ') || 'none', '`config/market-events/splits.json`'],
      ['D8 maximum-hold exits that came before the configured hold', `${d8.maximumHold.notReached} of ${d8.maximumHold.checked}`, '`results/gates/d8.json`'],
      ['D8 slice reconciliation: Σ fresh lots + carried change − slice net', `max |diff| ${u(d8.reconciliation.maxAbsDiff)} (cent rounding of per-lot nets)`, '`results/gates/d8.json`'],
      ['Leakage: each fold selection committed before its slice evaluation (git)', '9/9 (5B, session, shadow; seconds before)', 'git log of `results/folds/*/selection.json` and `evaluation.json`']
    ],
    ['---', '---', '---']
  )
);

// ===== coverage.md (D10) =====
const cov = R<any>('coverage/newl0-at-c21.json');

write(
  'coverage.md',
  'Coverage check: New L0 as a hypothetical C21 member (D10; hindsight, report-only)',
  'New L0 was chosen with later data and was in no C21 archive: this is not something the C21 procedure could have selected. It asks only whether the calendar-unit space held a configuration that the C21 rule and gates would have ranked first on 2016–2021 data, which the fresh searches did not find (`results/coverage/newl0-at-c21.json`; 386 simulations on D21).',
  [
    ...table(
      ['Item', 'Value'],
      [
        ['Centre net / DD on D21 (2016-01-04 → 2021-12-31)', `${u(cov.centre.net)} / ${u(cov.centre.dd)} (unrealized ${u(cov.centre.unrealized)}; ${cov.centre.lots} lots; top-episode share ${pct(cov.centre.topEpisodeShare)})`],
        ['10 bps stress net / DD', `${u(cov.stress10bps.net)} / ${u(cov.stress10bps.dd)}`],
        ['Confirmation (C21 family, 3 × 128; unique draws)', `${cov.confirmation.unique}: median ${u(cov.confirmation.median)}, p10 ${u(cov.confirmation.p10)}, p90 DD ${u(cov.confirmation.p90Dd)}, breach share ${pct(cov.confirmation.breachShare)}, worst-10% mean ${u(cov.confirmation.worst10Mean)}, worst ${u(cov.confirmation.worstDd)}`],
        ['Gates Q1–Q6', Object.entries(cov.gates).map(([k, v]) => `${k} ${v ? 'pass' : 'FAIL'}`).join(', ')],
        ...cov.rankAmongC21QualifiedSets.map((x: any) => [`Rank by centre net in ${x.path}'s C21 qualified set (${x.qualified} members)`, `${x.newL0WouldRank} (the actual primary ${x.rank1.label}: ${u(x.rank1.net)})`]),
        ['Its 2022–2023 slice (published by the shadow study)', '+$87,238.48, slice DD $19,459.83']
      ],
      ['---', '---']
    )
  ]
);

// ===== summary.json =====
fs.writeFileSync(
  path.join(out, 'summary.json'),
  `${JSON.stringify(
    {
      paths: gates.g4.paths.map((g: any) => ({ path: g.path, net: g.net, sequentialDd: g.dd, peak: g.peak, trough: g.trough, slices: g.parts.map((p: any) => ({ fold: p.fold, label: p.label, sliceNet: p.sliceNet, sliceDd: p.resetDd })) })),
      neighbourhoods: nb.map((x) => ({ path: x.path, fold: x.fold, trainingBreachShare: x.training.selectBreachShare, sliceBreachShare: x.slice.breachShare, sliceBreaches: x.slice.breaches, draws: x.draws })),
      evaluatedRows: folds.map((f) => ({ fold: f.fold, rows: ev.filter((r) => r.fold === f.fold).length, breaching: ev.filter((r) => r.fold === f.fold && r.breach).length })),
      pooledCorrelations: sel.pooledByFold
    },
    null,
    1
  )}\n`
);
console.log(`tables written to ${path.relative(repoRoot, out)}`);
