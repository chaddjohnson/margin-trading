// The per-arm reports (brief §9 item 7): STANDALONE_D1_REPORT.md (arm D), STANDALONE_GROWTH_REPORT.md (G),
// FIXED_COMBINATION_REPORT.md (C), JOINT_REPORT.md (J), SEQUENTIAL_REPORT.md (S) — each = the hand-written narrative
// reports/narrative/<ARM>.md followed by sections generated from the sealed records (reports/tables/*.json of analyze.ts)
// and the report-only diagnostics (reports/diagnostics/*.json). Report-only: no evaluation.
//   node --no-maglev --experimental-transform-types tools/gdx-d1-growth/arm-reports.ts
import fs from 'node:fs';
import path from 'node:path';
import { type ArmKey, cutoffKeys, researchDir, resultsDir } from '../../src/gdx-d1-growth/context.ts';

type Row = Record<string, unknown>;

const t = path.join(researchDir, 'reports', 'tables');
const d = path.join(researchDir, 'reports', 'diagnostics');
const readJ = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);
const money = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : x === null || x === undefined ? '—' : String(x));
const k$ = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? `${x < 0 ? '−' : ''}$${Math.round(Math.abs(x)).toLocaleString('en-US')}` : '—');
const pct = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? `${(x * 100).toFixed(1)} %` : '—');
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x.toLocaleString('en-US') : x === null || x === undefined ? '—' : String(x));
const code = (x: unknown) => (x ? `\`${String(x)}\`` : '—');
const table = (head: string[], rows: string[][]) =>
  rows.length ? [`| ${head.join(' | ')} |`, `|${head.map((_h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n') : '_(none)_';

const arms: ArmKey[] = ['D', 'G', 'C', 'J', 'S'];
const title: Record<ArmKey, string> = {
  D: 'Standalone D1·GDX (arm D)',
  G: 'Standalone Growth·GDX (arm G)',
  C: 'Fixed D1 + Growth combinations (arm C: pairs of the standalone finalists, no re-optimization)',
  J: 'Fully joint D1 + Growth optimization (arm J)',
  S: 'D1-first sequential optimization (arm S: arm D’s finalists frozen, Growth searched in the shared slot)'
};
const file: Record<ArmKey, string> = { D: 'STANDALONE_D1_REPORT.md', G: 'STANDALONE_GROWTH_REPORT.md', C: 'FIXED_COMBINATION_REPORT.md', J: 'JOINT_REPORT.md', S: 'SEQUENTIAL_REPORT.md' };
const subs: Record<ArmKey, string[]> = { D: ['D-A'], G: ['G-P', 'G-U'], C: [], J: ['J-P', 'J-U'], S: ['S-P', 'S-U'] };

const search = readJ<{ rows: Row[] }>(path.join(t, 'search-summary.json'))?.rows ?? [];
const qual = readJ<{ rows: Row[] }>(path.join(t, 'qualification.json'))?.rows ?? [];
const sels = readJ<{ rows: Row[] }>(path.join(t, 'selections.json'))?.rows ?? [];
const fin = readJ<{ rows: Row[] }>(path.join(t, 'finalists.json'))?.rows ?? [];
const chr = readJ<{ sequential?: { procedures: Row[]; secondary: Row[]; descriptive: Row[] }; slices: Record<string, Row[]> }>(path.join(t, 'chronology.json'));
const exp = readJ<{ rows: Row[] }>(path.join(t, 'exposure-5-9.json'))?.rows ?? [];
const lots = readJ<{ basis: string; rows: Row[] }>(path.join(d, 'lots.json'));
const tail = readJ<{ basis: string; referenceHistory: string; rows: Row[] }>(path.join(d, 'tail-stress.json'));
const nb = readJ<{ rows: Row[] }>(path.join(d, 'nbhd-small-wide.json'));

const section = (arm: ArmKey): string[] => {
  const o: string[] = [];
  const pops = [arm, ...subs[arm]];

  // 1. search
  o.push('## A. Search effort, coverage and convergence per cutoff', '');
  if (arm === 'C') o.push('Arm C is never searched: at each cutoff it pairs arm D’s and arm G’s finalists (primary, robust-profit, balanced; ≤ 3 × 3), vectors unchanged, and qualifies the pairs with the joint instrument.', '');
  else
    o.push(
      table(
        ['Cutoff', 'Lanes (broad / refine)', 'Replicates', 'Rounds (✓ fired)', 'Requested', 'Fresh', 'GPU wall (s)', 'Islands per lane (count)', 'Stop reasons', 'Cells with a feasible fit', 'Label'],
        search
          .filter((r) => r.arm === arm)
          .map((r) => [
            String(r.cutoff),
            `${num(r.broadLanes)} / ${num(r.refineLanes)}`,
            num(r.replicates),
            ((r.rounds as { k: number; fired: boolean }[]) ?? []).map((x) => `${x.k}${x.fired ? '✓' : '✗'}`).join(' ') || '—',
            num(r.requested),
            num(r.fresh),
            num(r.wallSeconds),
            Object.entries((r.islands as Record<string, number>) ?? {}).map(([k, v]) => `${k}: ${v}`).join(', '),
            Object.entries((r.stops as Record<string, number>) ?? {}).map(([k, v]) => `${k} ${v}`).join('; '),
            `${num(r.cellsWithFeasible)} / ${num(r.cells)}`,
            String(r.budgetLimitedLabel)
          ])
      ),
      ''
    );

  // 2. qualification
  o.push('## B. Qualification (Q1–Q6) per cutoff and stage', '');
  o.push(
    table(
      ['Cutoff', 'Stage', 'Members', 'Qualified', 'Failed gates (count)', 'External controls (qualified? failed gates)'],
      qual
        .filter((r) => r.arm === arm)
        .map((r) => [
          String(r.cutoff),
          String(r.stage),
          num(r.members),
          num(r.qualified),
          Object.entries((r.failedByGate as Record<string, number>) ?? {}).map(([k, v]) => `${k} ${v}`).join(', ') || '—',
          ((r.controls as { label: string; qualified: boolean; failed: string[] }[]) ?? []).map((c) => `${c.label.replace(/^control: /, '').replace(/ on GDX.*$/, '')}: ${c.qualified ? 'yes' : `no (${c.failed.join(' ')})`}`).join('; ') || '—'
        ])
    ),
    ''
  );

  // 3. selections
  o.push('## C. Primaries (NL0 original rule) and roles per cutoff', '');
  o.push(
    table(
      ['Cutoff', 'Population', 'Members / qualified', 'Primary', 'Centre net', 'Centre DD', 'Lots', 'Sel. robust / p90 DD', 'Conf. p10 / p90 DD', 'RA1 (report-only) agrees'],
      sels
        .filter((r) => pops.includes(String(r.population)))
        .map((r) => {
          const p = r.primaryRow as Row | null;

          return [
            String(r.cutoff),
            String(r.population),
            `${num(r.members)} / ${num(r.qualified)}`,
            r.primary ? code(r.primary) : '**none qualified**',
            k$(p?.centreNet),
            k$(p?.centreDd),
            num(p?.lots),
            `${k$(p?.selectRobust)} / ${k$(p?.selectP90Dd)}`,
            `${k$(p?.confirmP10)} / ${k$(p?.confirmP90Dd)}`,
            r.primary ? (r.ra1AgreesWithPrimary ? 'yes' : `no (${r.ra1First ? code(r.ra1First) : 'none'})`) : '—'
          ];
        })
    ),
    ''
  );
  o.push('Roles of the arm’s population (actual-profit = the primary):', '');
  o.push(
    table(
      ['Cutoff', 'robust-profit', 'balanced', 'lower-drawdown'],
      sels
        .filter((r) => r.population === arm)
        .map((r) => {
          const rl = (r.roles as Record<string, string | null>) ?? {};

          return [String(r.cutoff), code(rl['robust-profit']), code(rl.balanced), code(rl['lower-drawdown'])];
        })
    ),
    ''
  );
  if (arm === 'S' || arm === 'C')
    for (const c of cutoffKeys) {
      const f = path.join(resultsDir, arm === 'S' ? 'frozen-d1' : 'pairs', `${c}.json`);
      const r = readJ<{ frozen?: { key: string; label: string }[]; pairs?: { label: string; d1: string; g: string }[]; note?: string | null }>(f);

      if (!r) continue;
      if (arm === 'S') o.push(`- ${c}: frozen D1 finalists ${r.frozen!.length ? r.frozen!.map((x) => `\`${x.key}\` = ${code(x.label)}`).join(', ') : `none (${r.note ?? ''})`}`);
      else o.push(`- ${c}: ${r.pairs!.length} pairs — ${r.pairs!.map((x) => `${code(x.label)} = D1 ${code(x.d1)} × Growth ${code(x.g)}`).join('; ') || 'none'}`);
    }
  if (arm === 'S' || arm === 'C') o.push('');

  // 4. chronology
  o.push('## D. Chronological evidence (retrospective, previously examined broader-market history)', '');
  if (chr?.slices) {
    const rows: string[][] = [];

    for (const [c, rs] of Object.entries(chr.slices))
      for (const r of rs.filter((x) => x.arm === arm))
        rows.push([
          c,
          code(r.label),
          ((r.roles as string[]) ?? []).join('; '),
          k$(r.boundaryEquity),
          k$(r.sliceNet),
          k$(r.sliceDd),
          k$(r.wholeDd),
          `${num((r.nextSlice as Row)?.lots)} (${num((r.nextSlice as Row)?.losing)} losing)`,
          k$((r.nextSlice as Row)?.worstLotMae),
          `${num((r.neighbourhood as Row)?.breaches)} / ${num((r.neighbourhood as Row)?.draws)} (training ${pct((r.neighbourhood as Row)?.trainingBreachShare)})`
        ]);
    o.push(
      table(['Fold', 'Subject', 'Roles', 'Net at the cutoff', 'Next-slice P&L', 'Next-slice reset DD', 'Whole-run DD', 'Next-slice lots', 'Worst next-slice lot MAE', 'Training nbhd breaching on the slice (training breach share)'], rows),
      ''
    );
  }
  if (chr?.sequential) {
    const ps = [...chr.sequential.procedures, ...chr.sequential.secondary].filter((p) => pops.includes(String(p.population)));

    o.push('Sequential procedures (each fold’s primary over its next slice; 5 bps per switched lot; exact drawdown):', '');
    o.push(table(['Procedure', 'Fold primaries (C19 → C21 → C23)', 'Sequential net 2020–2024', 'Sequential DD', 'Verdict'], ps.map((p) => [String(p.name), ((p.labels as (string | null)[]) ?? []).map((l) => (l ? code(l) : '(none)')).join(' → '), k$(p.net), k$(p.drawdown), String(p.verdict)])), '');
    o.push(
      table(
        ['Descriptive path', 'Subjects', 'Net', 'DD', 'Verdict (descriptive only)'],
        chr.sequential.descriptive.filter((p) => String(p.name).startsWith(`${arm}: `)).map((p) => [String(p.name), ((p.labels as (string | null)[]) ?? []).map((l) => (l ? code(l) : '(none)')).join(' → '), k$(p.net), k$(p.drawdown), String(p.verdict)])
      ),
      ''
    );
  }

  // 5. finalists
  const fr = fin.filter((r) => r.arm === arm);

  o.push('## E. C24 finalists and external controls: development, validation and full history', '');
  o.push(
    'Development = 2016-01-04 → 2024-12-31 (every choice); validation = 2025-01-02 → 2026-10-30 on FULL, once, after the frozen selection (retrospective, previously examined broader-market history; never tuned on); full = the continuous run to 2026-10-30. Figures are the centre configuration unless labelled as neighbourhood statistics.',
    ''
  );
  o.push(
    table(
      ['Kind', 'Label', 'Roles', 'Q1–Q6', 'Dev net', 'Gross', 'Interest', 'Costs', 'Dev DD (% of $100k)', 'Lots W/L', 'Val. P&L', 'Val. reset DD', 'Full net', 'Full DD', 'V1 V2 V3'],
      fr.map((r) => {
        const v = r.validationTests as Row | null;

        return [
          String(r.kind),
          code(r.label),
          String(r.roles),
          r.qualified ? 'pass' : `fails ${String(r.failed)}`,
          money(r.centreNet),
          k$(r.gross),
          k$(r.interest),
          k$(r.costs),
          `${money(r.centreDd)} (${pct(r.centreDdPct)})`,
          `${num(r.lots)} ${num(r.wins)}/${num(r.losses)}`,
          money(r.validationNet),
          money(r.validationResetDd),
          money(r.fullNet),
          money(r.fullDd),
          v ? `${v.V1 ? '✓' : '✗'} ${v.V2 ? '✓' : '✗'} ${v.V3 ? '✓' : '✗'}` : '—'
        ];
      })
    ),
    ''
  );
  o.push('### Risk decomposition (development; dollars of the fixed $100,000 allocation)', '');
  o.push(
    table(
      ['Label', 'Marked minute DD', 'Principal loss marked / liquidation', 'Banked-capital DD marked / liquidation', 'Worst lot MAE', 'Worst realized lot', 'Occupancy', 'Open-lot share', 'Top episode share', 'D1 / Growth booked'],
      fr.map((r) => [
        code(r.label),
        k$(r.centreDd),
        `${k$(r.principalLossMarked)} / ${k$(r.principalLossLiquidation)}`,
        `${k$(r.bankedDdMarked)} / ${k$(r.bankedDdLiquidation)}`,
        k$(r.worstLotMae),
        k$(r.worstLoss),
        pct(r.occupancy),
        typeof r.openShare === 'number' ? pct(r.openShare) : '—',
        typeof r.topEpisodeShare === 'number' ? pct(r.topEpisodeShare) : '—',
        `${k$(r.d1Booked)} / ${k$(r.growthBooked)}`
      ])
    ),
    ''
  );
  o.push('### Neighbourhood distributions (development; confirmation family 3 × 128 unless labelled) and stresses', '');
  o.push(
    table(
      ['Label', 'Conf. median / p10 / robust', 'Conf. p90 / p95 DD', 'Worst-10 % mean / worst DD', 'Breach share (Wilson 95 %)', 'Sel. robust / p90 DD', '10 bps net / DD', '20 bps net / DD', '14 % interest', '+25 bps slippage', 'Next-open stops'],
      fr.map((r) => {
        const s = (r.stress as Record<string, { net: number; dd: number }>) ?? {};

        return [
          code(r.label),
          `${k$(r.confirmMedian)} / ${k$(r.confirmP10)} / ${k$(r.confirmRobust)}`,
          `${k$(r.confirmP90Dd)} / ${k$(r.confirmP95Dd)}`,
          `${k$(r.confirmWorst10MeanDd)} / ${k$(r.confirmWorstDd)}`,
          `${pct(r.confirmBreachShare)} (${((r.confirmBreachInterval as number[]) ?? []).map((x) => pct(x)).join('–')})`,
          `${k$(r.selectRobust)} / ${k$(r.selectP90Dd)}`,
          `${k$(s['cost 10 bps']?.net)} / ${k$(s['cost 10 bps']?.dd)}`,
          `${k$(s['cost 20 bps']?.net)} / ${k$(s['cost 20 bps']?.dd)}`,
          k$(s['interest 14%']?.net),
          `${k$(s['stop slippage +25 bps']?.net)} / ${k$(s['stop slippage +25 bps']?.dd)}`,
          `${k$(s['next-open stops']?.net)} / ${k$(s['next-open stops']?.dd)}`
        ];
      })
    ),
    ''
  );
  if (arm === 'C' || arm === 'J' || arm === 'S') {
    o.push('### Causal removals (development centre; the other book switched off)', '');
    o.push(
      table(
        ['Label', 'Without D1: net / DD', 'Without Growth: net / DD', 'Participation (funded principal-days share)'],
        fr.map((r) => {
          const m = (r.removal as Record<string, { net: number; dd: number }>) ?? {};
          const key = (re: RegExp) => Object.keys(m).find((k) => re.test(k));
          const a = key(/D1/i);
          const b = key(/Growth|G:/i);

          return [code(r.label), a ? `${k$(m[a]!.net)} / ${k$(m[a]!.dd)}` : '—', b ? `${k$(m[b]!.net)} / ${k$(m[b]!.dd)}` : '—', JSON.stringify(r.participation ?? {})];
        })
      ),
      ''
    );
  }
  o.push('### Annual results (development centre; validation years from the FULL run)', '');

  const years = [...new Set(fr.flatMap((r) => [...Object.keys((r.years as Row) ?? {}), ...Object.keys((r.validationYears as Row) ?? {})]))].sort();

  o.push(table(['Label', ...years], fr.map((r) => [code(r.label), ...years.map((y) => k$(((r.years as Row) ?? {})[y] ?? ((r.validationYears as Row) ?? {})[y]))])), '');
  o.push('### Parameter vectors', '');
  for (const r of fr) {
    const v = r.vector as { cell: string; d1: Row | null; controls: Row | null; d1EntryDay: unknown; growth: Row | null } | undefined;

    if (!v) continue;
    o.push(`- ${code(r.label)} — cell \`${v.cell}\``);
    if (v.d1) o.push(`  - D1·GDX: ${Object.entries(v.d1).map(([k, x]) => `${k} ${String(x)}`).join(', ')}; controls ${JSON.stringify(v.controls)}; D1 arming from the first day: ${String(v.d1EntryDay)}`);
    if (v.growth) o.push(`  - Growth·GDX: ${Object.entries(v.growth).map(([k, x]) => `${k} ${typeof x === 'object' ? JSON.stringify(x) : String(x)}`).join(', ')}`);
  }
  o.push('');

  // 6. lot-level diagnostics
  const lr = (lots?.rows ?? []).filter((r) => r.arm === arm);

  if (lr.length) {
    o.push('## F. Lot-level diagnostics (CPU reference replays on FULL with the 2024-12-31 boundary; report-only)', '', `Basis: ${lots!.basis}.`, '');
    o.push(
      table(
        ['Subject', 'Roles', 'Net 2016–2026', 'Lots', 'Win rate', 'Median / max days', 'Occupancy (sessions)', 'Total / max giveback', 'Worst marked lot', 'Refused decisions by occupant', 'Illustrative cash at the worst mark (25 / 30 / 50 % maintenance)'],
        lr.map((r) => {
          const du = r.durationDays as Row;
          const oc = r.occupancy as Row;
          const gb = r.giveback as Row;
          const m = (r.marginIllustrative as { cashNeededAtWorstMark: number }[]) ?? [];

          return [
            code(r.label),
            ((r.roles as string[]) ?? []).join('; '),
            money(r.net),
            num(r.lots),
            pct(r.winRate),
            `${num(du?.median)} / ${num(du?.max)}`,
            `${pct(oc?.share)} (${num(oc?.sessionsHeld)} / ${num(oc?.sessions)})`,
            `${k$(gb?.total)} / ${k$(gb?.max)}`,
            k$(r.worstMarkedLotExcursion),
            Object.entries((r.refusedByOccupant as Record<string, number>) ?? {}).map(([k, v]) => `${k}: ${v}`).join('; ') || 'none',
            m.map((x) => k$(x.cashNeededAtWorstMark)).join(' / ')
          ];
        })
      ),
      ''
    );
    o.push('Worst closed trades of each subject (net after costs and interest):', '');
    for (const r of lr) {
      const w = (r.worstTrades as Row[]) ?? [];

      o.push(`- ${code(r.label)}: ${w.map((x) => `${String(x.book)} ${String(x.entry)} → ${String(x.exit)} (${String(x.reason)}, ${num(x.days)} d) ${money(x.net)}`).join('; ') || 'none'}`);
      const gb = (r.giveback as { maxLot: Row | null }).maxLot;

      if (gb) o.push(`  - largest giveback: ${String(gb.book)} ${String(gb.entry)} → ${String(gb.exit ?? 'open')} best mark ${money(gb.best)}, final ${money(gb.net)} (giveback ${money(gb.giveback)})`);
      const open = (r.openAtEnd as Row[]) ?? [];

      if (open.length) o.push(`  - open at 2026-10-30: ${open.map((x) => `${String(x.book)} from ${String(x.entry)} marked ${money(x.net)}`).join('; ')}`);
    }
    o.push('');
  }

  const tr = (tail?.rows ?? []).filter((r) => r.arm === arm);

  if (tr.length) {
    o.push('## G. D1 maximum-hold-window tail stress (standard §5.9; daily resolution; report-only)', '', `Basis: ${tail!.basis}. Reference: ${tail!.referenceHistory}.`, '');
    o.push(
      table(
        ['Subject', 'D1 structure', 'Hold window (days)', 'Protective stop', 'Pre-2016 worst (date)', 'Pre-2016 p5', 'Pre-2016 share beyond $35k', 'Worst gap through the stop', '2016–2024 worst (date)', '2016–2024 share beyond $35k'],
        tr.map((r) => {
          const a = r.disjointPre2016 as Row;
          const b = r.inSample2016to2024 as Row;

          return [
            code(r.label),
            String(r.d1Family),
            `${num(r.holdWindowDays)} (${String(r.holdNote)})`,
            r.protectiveStopPct === null ? 'none (family A)' : pct(r.protectiveStopPct),
            `${k$(a.worst)} (${String(a.worstDate)})`,
            k$(a.p05),
            pct(a.shareBeyondCeiling),
            a.worstGapThroughStopPct === null ? '—' : `${pct(a.worstGapThroughStopPct)} below the stop (${String(a.worstGapAt)})`,
            `${k$(b.worst)} (${String(b.worstDate)})`,
            pct(b.shareBeyondCeiling)
          ];
        })
      ),
      ''
    );
  }

  const nr = (nb?.rows ?? []).filter((r) => r.arm === arm);

  if (nr.length) {
    o.push('## H. Small (0.5×) and wide (1.5×) neighbourhood families of the finalists (D24; non-official GPU; report-only)', '');
    o.push(
      table(
        ['Finalist', 'Family', 'Draws', 'Median / p10 net', 'p90 / p95 / worst DD', 'Worst-10 % mean DD', 'Breaches (share; Wilson 95 %)'],
        nr.flatMap((r) =>
          (['small', 'wide'] as const).map((k) => {
            const x = r[k] as Row;

            return [code(r.label), k, num(x.draws), `${k$(x.medianNet)} / ${k$(x.p10Net)}`, `${k$(x.p90Dd)} / ${k$(x.p95Dd)} / ${k$(x.worstDd)}`, k$(x.worst10MeanDd), `${num(x.breaches)} (${pct(x.breachShare)}; ${((x.wilson95 as number[]) ?? []).map((y) => pct(y)).join('–')})`];
          })
        )
      ),
      ''
    );
  }

  const er = exp.filter((r) => r.arm === arm && r.primary);

  if (er.length) {
    o.push('## I. Standard §5.9 exposure of the fold primaries (training evidence, then the next slice; labelled)', '');
    o.push(
      table(
        ['Cutoff', 'Primary', 'Training net', 'Open-lot share', 'Largest open lot at the cutoff', 'Its outcome on the next slice', 'Training lot MAE median / p90 / worst', 'Next-slice MAE median / worst'],
        er.map((r) => {
          const ol = r.largestOpenLot as Row | string;
          const gb = r.openLotGivebackNextSlice as Row | string;
          const tm = r.trainingMae as Row;
          const nm = r.nextSliceMae as Row | null;

          return [
            String(r.cutoff),
            code(r.primary),
            k$(r.trainingNet),
            typeof r.openLotShare === 'number' ? pct(r.openLotShare) : String(r.openLotShare),
            typeof ol === 'string' ? ol : `${String(ol.book) === 'D1:VGT' ? 'D1·GDX' : String(ol.book) === 'G:VGT' ? 'Growth·GDX' : String(ol.book)} from ${String(ol.entry)}: unrealized ${k$(ol.mark)} (market value ${num(ol.multiple)}× the lot's principal)`,
            typeof gb === 'string' ? gb : `${String(gb.reason)} ${String(gb.exit ?? 'open')}: lot net ${k$(gb.lotNetAtCutoff)} at the cutoff (partial exits included) → final ${k$(gb.finalNet)}; change on the slice ${k$(gb.change)}`,
            `${k$(tm.median)} / ${k$(tm.p90)} / ${k$(tm.worst)}`,
            nm ? `${k$(nm.median)} / ${k$(nm.worst)}` : '—'
          ];
        })
      ),
      ''
    );
  }
  return o;
};

for (const arm of arms) {
  const nf = path.join(researchDir, 'reports', 'narrative', `${arm}.md`);
  const narrative = fs.existsSync(nf) ? fs.readFileSync(nf, 'utf8').trimEnd() : `# ${title[arm]}\n\n_(narrative pending)_`;
  const body = [narrative, '', '---', '', `_Sections A–I below are generated from the sealed records by \`tools/gdx-d1-growth/arm-reports.ts\` (report-only; no evaluation)._`, '', ...section(arm)];

  fs.writeFileSync(path.join(researchDir, file[arm]), `${body.join('\n').replace(/\n{3,}/g, '\n\n')}\n`);
  console.log(`wrote ${file[arm]} (${body.length} lines)`);
}
