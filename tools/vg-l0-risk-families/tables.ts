// Markdown tables and a machine-readable summary from the sealed records and diagnostics (PROTOCOL.md §15; standard
// §7.7: tables only, no visuals). Regenerated, never sealed: results/tables/*.md and results/tables/summary.json.
//   node --experimental-transform-types tools/vg-l0-risk-families/tables.ts
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir } from '../../src/vg-l0-risk-families/context.ts';
import { readJson } from '../../src/vg-l0-risk-families/records.ts';
import { cutoffKeys, exists } from './common.ts';

const out = path.join(resultsDir, 'tables');
const usd = (x: unknown) =>
  typeof x !== 'number' || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (x: unknown, d = 1) => (typeof x !== 'number' || !Number.isFinite(x) ? '—' : `${(100 * x).toFixed(d)}%`);
const num = (x: unknown) => (typeof x !== 'number' || !Number.isFinite(x) ? '—' : x.toLocaleString('en-US'));
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const diag = <T>(name: string): T | null => (exists('diagnostics', `${name}.json`) ? readJson<T>(path.join(resultsDir, 'diagnostics', `${name}.json`)) : null);
const files: Record<string, string> = {};
const write = (name: string, text: string) => {
  files[name] = text;
};

type Brief = Record<string, number | string | null>;
const briefRow = (label: string, b: Brief | null) =>
  b
    ? [label, `\`${b.cell}\``, usd(b.centreNet), usd(b.centreDd), usd(b.selectRobust), usd(b.selectP90Dd), usd(b.confirmP10), usd(b.confirmP90Dd), usd(b.confirmP95Dd), usd(b.confirmWorst10Mean), usd(b.worstLotMae), String(b.lots)]
    : [label, '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—'];
const briefHead = ['Row', 'Cell', 'Centre net', 'Centre DD', 'Sel. robust', 'Sel. p90 DD', 'Conf. p10', 'Conf. p90 DD', 'Conf. p95 DD', 'Worst-10% mean', 'Worst lot MAE', 'Lots'];

// ----- budget and coverage -----
{
  const cov = diag<Record<string, { jobs: Record<string, { lanes: number; fresh: number; unique: number; hits: number; minutes: number; cap: number | null; peakCgroupGiB: number }>; proposals: number; requested: number; screenReasons: Record<string, number>; stops: Record<string, number>; cellsWithoutShortlist: string[]; cellsWithoutQualified: string[]; refinePlan: { cell: string; why: string[] }[] | null }>>('coverage');

  if (cov) {
    const rows: (string | number)[][] = [];
    let tf = 0;
    let tp = 0;

    for (const [cut, c] of Object.entries(cov)) {
      for (const [job, j] of Object.entries(c.jobs)) {
        rows.push([`${cut} ${job}`, num(j.lanes), num(j.fresh), num(j.unique), num(j.hits), num(j.cap), j.minutes.toFixed(1), j.peakCgroupGiB.toFixed(1)]);
        tf += j.fresh;
      }
      tp += c.proposals;
    }
    write(
      'budget.md',
      `# Executed budget per job (search stages)\n\nProposals executed (screen + island children + fillers + refinement designs): ${num(tp)}. Fresh simulations of the search jobs: ${num(tf)}.\n\n${table(['Job', 'Lanes', 'Fresh', 'Unique (all runs)', 'Archive hits', 'Cap', 'Minutes', 'Peak GiB'], rows)}\n`
    );

    const cr: (string | number)[][] = [];

    for (const [cut, c] of Object.entries(cov))
      cr.push([cut, num(c.proposals), num(c.requested), Object.entries(c.screenReasons).map(([k, v]) => `${k} ${v}`).join('; '), Object.entries(c.stops).map(([k, v]) => `${k.split(' (')[0]} ${v}`).join('; '), c.cellsWithoutShortlist.length, c.cellsWithoutQualified.length]);
    write(
      'coverage.md',
      `# Coverage per cutoff\n\n${table(['Cutoff', 'Proposals', 'Requested', 'Screen outcomes', 'Lane stops', 'Cells without shortlist', 'Cells without a qualified member'], cr)}\n\n${Object.entries(cov)
        .map(([cut, c]) => `## ${cut}\n\nCells without a qualified member: ${c.cellsWithoutQualified.map((x) => `\`${x}\``).join(', ') || 'none'}.\n\nRefinement plan: ${(c.refinePlan ?? []).map((p) => `\`${p.cell}\` (${p.why.join('; ')})`).join('; ')}.`)
        .join('\n\n')}\n`
    );
  }
}

// ----- families -----
{
  const fam = diag<Record<string, { qualified: number; qualifiedCells: number; legacyBest: Brief | null; h1NotDominatedByLegacyBest: number | null; h1BeatingLegacyOnBothPairs: string[] | null; pairs: Record<string, Brief | null>; marginal: Record<string, Brief | null>; topCells: [string, Brief][]; byCell: Record<string, Brief | null> }>>('families');

  if (fam) {
    const parts: string[] = ['# Structural families per cutoff (best qualified member by centre net; development evidence of that cutoff)'];

    for (const [cut, f] of Object.entries(fam)) {
      parts.push(`## ${cut}\n\n${f.qualified} qualified members in ${f.qualifiedCells} cells. Non-legacy qualified members not dominated by the legacy cell's best: ${num(f.h1NotDominatedByLegacyBest)}; beating it on both pairs: ${f.h1BeatingLegacyOnBothPairs?.length ?? 0}.`);
      parts.push(`### Family pairs (D1·GDX × D1·VGT)\n\n${table(briefHead, Object.entries(f.pairs).map(([k, b]) => briefRow(k, b)))}`);
      parts.push(`### Per book and gate\n\n${table(briefHead, Object.entries(f.marginal).map(([k, b]) => briefRow(k, b)))}`);
      parts.push(`### Top 25 cells\n\n${table(briefHead, f.topCells.map(([k, b]) => briefRow(k, b)))}`);
    }
    write('families.md', `${parts.join('\n\n')}\n`);

    const cells: string[] = ['# Every cell: best qualified member per cutoff'];

    for (const [cut, f] of Object.entries(fam)) cells.push(`## ${cut}\n\n${table(briefHead, Object.entries(f.byCell).map(([k, b]) => briefRow(k, b)))}`);
    write('cells.md', `${cells.join('\n\n')}\n`);
  }
}

// ----- activation -----
{
  const act = diag<Record<string, { bestBase: Brief | null; bestOnset: Brief | null; summary: Record<string, Record<string, number | null>>; rows: { cell: string; base: string; pattern: string; onsetQualified: number; baseQualified: number; dNet: number | null; dDd: number | null; dSelectRobust: number | null; dConfirmP90Dd: number | null; dConfirmP95Dd: number | null; dWorst10Mean: number | null; dWorstLotMae: number | null }[] }>>('activation');

  if (act) {
    const parts: string[] = ['# The activation study: each entry-day onset cell against its next-session base counterpart (equal budgets)'];

    for (const [cut, a] of Object.entries(act)) {
      parts.push(`## ${cut}\n\n${table(briefHead, [briefRow('best base (next-session) member', a.bestBase), briefRow('best onset (entry-day) member', a.bestOnset)])}`);
      parts.push(
        table(
          ['Pattern', 'Pairs with both qualified', 'Only onset qualified', 'Only base qualified', 'Net +$2.5k', 'Net −$2.5k', 'Worst lot better', 'Worst lot worse', 'Worst-10% lower', 'Worst-10% higher', 'Median Δ net', 'Median Δ worst-10%', 'Median Δ worst lot'],
          Object.entries(a.summary).map(([k, s]) => [k, num(s.pairs), num(s.onsetOnlyQualified), num(s.baseOnlyQualified), num(s.higherNet), num(s.lowerNet), num(s.lowerWorstLotLoss), num(s.higherWorstLotLoss), num(s.lowerWorst10), num(s.higherWorst10), usd(s.medianDNet), usd(s.medianDWorst10Mean), usd(s.medianDWorstLotMae)])
        )
      );
    }

    const c24 = act.C24 ?? Object.values(act).at(-1)!;

    parts.push(
      `## Every onset cell at the latest cutoff\n\n${table(
        ['Onset cell', 'Base cell', 'Pattern', 'Qualified (onset/base)', 'Δ net', 'Δ centre DD', 'Δ sel. robust', 'Δ conf. p90 DD', 'Δ conf. p95 DD', 'Δ worst-10%', 'Δ worst lot'],
        c24.rows.map((r) => [`\`${r.cell}\``, `\`${r.base}\``, r.pattern, `${r.onsetQualified}/${r.baseQualified}`, usd(r.dNet), usd(r.dDd), usd(r.dSelectRobust), usd(r.dConfirmP90Dd), usd(r.dConfirmP95Dd), usd(r.dWorst10Mean), usd(r.dWorstLotMae)])
      )}`
    );
    write('activation.md', `${parts.join('\n\n')}\n`);
  }
}

// ----- selection 2 × 2 -----
{
  const sel = diag<{ folds: Record<string, Record<string, { qualified: number; same: boolean; original: Record<string, unknown> | null; RA1: Record<string, unknown> | null; passingAllScreens: number; screenFailures: Record<string, number> }>>; verdicts?: Record<string, { verdict: string; net: number; sequentialDd: number; parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number }[] }>; labels?: Record<string, { label: string; dNet: number; dSequentialDd: number; dSliceDd: number[]; dSliceNet: number[] }>; descriptive?: { name: string; net: number; sequentialDd: number }[] }>('selection');

  if (sel) {
    const parts: string[] = ['# The selection-method study (identical populations; training evidence only)'];
    const rows: (string | number)[][] = [];

    for (const [cut, pops] of Object.entries(sel.folds))
      for (const [p, x] of Object.entries(pops))
        for (const k of ['original', 'RA1'] as const) {
          const r = x[k] as Record<string, unknown> | null;
          const next = r?.next as { sliceNet: number; sliceDd: number } | null | undefined;

          rows.push([`${cut} ${p} ${k}`, r ? `\`${r.cell}\`` : '—', usd(r?.centreNet), usd(r?.conservativeNet), pct(r?.occupancy), r ? ((r.failedScreens as string[]).join(' ') || 'none') : '—', k === 'original' ? num(r?.ra1Rank) : num(r?.originalRank), x.same ? 'same' : 'differs', usd(next?.sliceNet), usd(next?.sliceDd)]);
        }
    parts.push(table(['Cutoff / population / rule', 'Cell', 'Training net', 'Conservative net', 'Occupancy', 'Failed screens', 'Rank under the other rule', 'Primaries', 'Next-slice net', 'Next-slice DD'], rows));

    if (sel.verdicts)
      parts.push(
        `## Sequential paths and verdicts (2020–2024; conditionally independent: fixed later-selected Growth·VGT)\n\n${table(
          ['Procedure', 'Verdict', 'Sequential net', 'Sequential DD', 'C19 slice net / DD', 'C21 slice net / DD', 'C23 slice net / DD'],
          Object.entries(sel.verdicts).map(([k, v]) => [k, v.verdict.split(' (')[0]!, usd(v.net), usd(v.sequentialDd), ...v.parts.map((p) => `${usd(p.sliceNet)} / ${usd(p.sliceDd)}`)])
        )}`
      );
    if (sel.labels)
      parts.push(
        `## Frozen comparison labels (PROTOCOL.md §11.3; band $2,500)\n\n${table(
          ['Comparison', 'Label', 'Δ sequential net', 'Δ sequential DD', 'Δ slice DD (C19, C21, C23)'],
          Object.entries(sel.labels).map(([k, l]) => [k, l.label, usd(l.dNet), usd(l.dSequentialDd), l.dSliceDd.map(usd).join(', ')])
        )}`
      );
    if (sel.descriptive) parts.push(`## Descriptive paths\n\n${table(['Path', 'Net', 'Sequential DD'], sel.descriptive.map((d) => [d.name, usd(d.net), usd(d.sequentialDd)]))}`);
    write('selection.md', `${parts.join('\n\n')}\n`);
  }
}

// ----- finalists (report-only replays) -----
{
  type B = { net: number; dd: number; lots: number; periods: { after: number; dd: number }[] };
  const fin = diag<{ rows: { label: string; why: string[]; cell: string; development: Record<string, B>; full: Record<string, B> | string; nextSlice2025: { sliceNet: number; sliceDd: number; giveBack: Record<string, unknown> | null; nextSlice: Record<string, unknown> } | null; trainingNeighbourhoodOn2025: { breachShare: number; wilson95: number[]; medianSliceDd: number; worstSliceDd: number; trainingBreachShare: number } | null; episodes: Record<string, { dd: number; losingD1Entries: number; exitReasons: Record<string, number> }>; gapsThroughStop: { development: Record<string, unknown>[]; full: Record<string, unknown>[] | null } }[] }>('finalists');

  if (fin) {
    const parts: string[] = ['# C24 finalists (report-only replays; development = D24, FULL = 2016-01-04 → 2026-10-30, examined history)'];
    const full = (r: (typeof fin.rows)[number]) => (typeof r.full === 'string' ? null : r.full);

    parts.push(
      table(
        ['Finalist', 'Cell', 'Dev net', 'Dev DD', 'Full net', 'Full DD', '2025–26 P&L', '2025–26 reset DD', 'Carried lot at 2024-12-31 → change', 'C24 nbhd on 2025–26: breach share (training)'],
        fin.rows.map((r) => {
          const f = full(r)?.finalist;
          const gb = r.nextSlice2025?.giveBack as { book: string; markAtCutoff: number; changeFromCutoff: number } | null | undefined;
          const nb = r.trainingNeighbourhoodOn2025;

          return [r.label.replace('C24/', ''), `\`${r.cell}\``, usd(r.development.finalist?.net), usd(r.development.finalist?.dd), usd(f?.net), usd(f?.dd), usd(f?.periods[0]?.after), usd(f?.periods[0]?.dd), gb ? `${gb.book} ${usd(gb.markAtCutoff)} → ${usd(gb.changeFromCutoff)}` : 'none open', nb ? `${pct(nb.breachShare)} [${nb.wilson95.map((x) => pct(x)).join(', ')}] (${pct(nb.trainingBreachShare)})` : '—'];
        })
      )
    );

    const mech = (door: 'development' | 'full') =>
      table(
        ['Finalist', 'Finalist', 'Its D1 under legacy mechanics', 'New L0 D1 under its mechanics', 'New L0', 'Parameter effect (legacy-mech − New L0)', 'Mechanics effect on its D1', 'Mechanics effect on New L0 D1'],
        fin.rows
          .filter((r) => r.label !== 'control: New L0')
          .map((r) => {
            const v = door === 'development' ? r.development : full(r);

            if (!v) return [r.label, '—', '—', '—', '—', '—', '—', '—'];

            const x = v.finalist!.net;
            const lm = v['finalist D1 under legacy mechanics']!.net;
            const nm = v['New L0 D1 under the finalist mechanics']!.net;
            const n = v['New L0']!.net;

            return [r.label.replace('C24/', ''), usd(x), usd(lm), usd(nm), usd(n), usd(lm - n), usd(x - lm), usd(nm - n)];
          })
      );

    parts.push(`## Mechanics versus parameters — development (2016–2024)\n\n${mech('development')}`);
    parts.push(`## Mechanics versus parameters — FULL\n\n${mech('full')}`);

    const toggles = fin.rows.flatMap((r) =>
      Object.entries(r.development)
        .filter(([k]) => !['finalist', 'finalist D1 under legacy mechanics', 'New L0 D1 under the finalist mechanics', 'New L0'].includes(k))
        .map(([k, v]) => [r.label.replace('C24/', ''), k, usd(v.net - r.development.finalist!.net), usd(v.dd - r.development.finalist!.dd), full(r)?.[k] ? usd(full(r)![k]!.net - full(r)!.finalist!.net) : '—', full(r)?.[k] ? usd(full(r)![k]!.dd - full(r)!.finalist!.dd) : '—'])
    );

    parts.push(`## Activation flips, K ± 1 and per-control ablations (Δ against the finalist)\n\n${table(['Finalist', 'Variant', 'Δ dev net', 'Δ dev DD', 'Δ full net', 'Δ full DD'], toggles)}`);
    parts.push(
      `## Episodes (development door)\n\n${table(
        ['Finalist', '2020 crash DD', '2020 losing D1 entries', '2022 bear DD', '2022 losing D1 entries', '2022 exits'],
        fin.rows.map((r) => [r.label.replace('C24/', ''), usd(r.episodes['crash 2020']?.dd), num(r.episodes['crash 2020']?.losingD1Entries), usd(r.episodes['bear 2022']?.dd), num(r.episodes['bear 2022']?.losingD1Entries), Object.entries(r.episodes['bear 2022']?.exitReasons ?? {}).map(([k, v]) => `${k} ${v}`).join('; ')])
      )}`
    );

    const gaps = fin.rows.flatMap((r) => (r.gapsThroughStop.full ?? []).map((g) => [r.label.replace('C24/', ''), String(g.book), String(g.entry), String(g.exit), `${g.stopDistancePct}%`, `${g.realizedPct}%`, `${g.beyondStopPct}`, usd(g.net)]));

    parts.push(`## Protective exits filled below their level (gap or minute open through the stop), FULL\n\n${gaps.length ? table(['Finalist', 'Book', 'Entry', 'Exit', 'Stop distance', 'Realized move', 'Points beyond the stop', 'Lot net'], gaps) : 'none'}`);
    write('finalists.md', `${parts.join('\n\n')}\n`);
  }
}

// ----- tail stress and fold-primary episodes -----
{
  const tail = diag<{ labels: Record<string, string>; rows: { label: string; cell: string; books: Record<string, { holdDays: number; holdBasis: string; stopDistancePct: number | null; inSample: { unprotected: Record<string, unknown>; protected: Record<string, unknown> | null }; proxy: { symbol: string; unprotected: Record<string, unknown>; protected: Record<string, unknown> | null }; syntheticGaps: Record<string, unknown> }> }[] }>('tail-stress');

  if (tail) {
    const rows = tail.rows.flatMap((r) =>
      Object.entries(r.books).map(([b, x]) => [
        r.label.replace('C24/', ''),
        b,
        `${x.holdDays} (${x.holdBasis.split(':')[0]})`,
        x.stopDistancePct === null ? 'none' : `${x.stopDistancePct}%`,
        `${usd(x.inSample.unprotected.worstLoss)} (${x.inSample.unprotected.worstEntry})`,
        usd(x.inSample.unprotected.p95Loss),
        x.inSample.protected ? usd(x.inSample.protected.worstLoss) : '—',
        x.inSample.protected ? String((x.inSample.protected.worstGapThroughStopPct as { beyondStopPct: number })?.beyondStopPct ?? '—') : '—',
        `${x.proxy.symbol}: ${usd(x.proxy.unprotected.worstLoss)}${x.proxy.protected ? ` / ${usd(x.proxy.protected.worstLoss)}` : ''}`,
        Object.entries(x.syntheticGaps).map(([k, v]) => `${k} ${typeof v === 'number' ? usd(v) : 'no stop'}`).join('; ')
      ])
    );

    write(
      'tail-stress.md',
      `# D1 hold-window tail stress (${Object.values(tail.labels).join('; ')})\n\nA $100,000 lot bought at each session close and held over the book's window; worst and p95 losses after costs and 11% interest.\n\n${table(['Row', 'Book', 'Window (days)', 'Stop', 'In-sample worst (entry)', 'In-sample p95', 'With the stop: worst', 'Worst points beyond the stop', 'Proxy worst: unprotected / protected', 'Synthetic opening gaps: lot net'], rows)}\n`
    );
  }

  const fp = diag<{ rows: { cutoff: string; label: string; procedures: string[]; cell: string; slice: { after: number; dd: number }; episodes: Record<string, { dd: number; losingD1Entries: number; byBook: Record<string, { lots: number; net: number; losing: number }>; exitReasons: Record<string, number> }>; gapsThroughStop: Record<string, unknown>[] }[] }>('fold-primaries');

  if (fp)
    write(
      'fold-primaries.md',
      `# Fold primaries: the 2020 and 2022 episodes inside their slices (report-only)\n\n${table(
        ['Fold', 'Primary of', 'Cell', 'Slice net / DD', 'Episode', 'Episode DD', 'Losing D1 entries', 'Lots by book (net)', 'Exit reasons', 'Gaps through a stop'],
        fp.rows.flatMap((r) => {
          const eps = Object.entries(r.episodes);

          return (eps.length ? eps : [['—', null] as const]).map(([k, e]) => [
            r.cutoff,
            r.procedures.join(', '),
            `\`${r.cell}\``,
            `${usd(r.slice.after)} / ${usd(r.slice.dd)}`,
            String(k),
            e ? usd(e.dd) : '—',
            e ? num(e.losingD1Entries) : '—',
            e ? Object.entries(e.byBook).map(([b, x]) => `${b} ${x.lots} (${usd(x.net)})`).join('; ') : '—',
            e ? Object.entries(e.exitReasons).map(([a, n]) => `${a} ${n}`).join('; ') : '—',
            r.gapsThroughStop.map((g) => `${g.book} ${g.exit} +${g.beyondStopPct} pts`).join('; ') || 'none'
          ]);
        })
      )}\n`
    );
}

fs.mkdirSync(out, { recursive: true });
for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(out, name), text);
fs.writeFileSync(
  path.join(out, 'summary.json'),
  `${JSON.stringify({ generated: new Date().toISOString(), cutoffs: cutoffKeys.filter((c) => exists('folds', c, 'selection.json')), tables: Object.keys(files) }, null, 1)}\n`
);
console.log(`tables: ${Object.keys(files).join(', ') || 'none yet'}`);
