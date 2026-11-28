// Markdown tables from reports/tables/*.json (tools/tsla-d1-growth/analyze.ts) — report-only, no evaluation. Writes
// reports/tables/TABLES.md (included by the reports).
//   node --no-maglev --experimental-transform-types tools/tsla-d1-growth/tables-md.ts
import fs from 'node:fs';
import path from 'node:path';
import { researchDir } from '../../src/tsla-d1-growth/context.ts';

const t = path.join(researchDir, 'reports', 'tables');
const d = path.join(researchDir, 'reports', 'diagnostics');
const readJ = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);
const money = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : x === null || x === undefined ? '—' : String(x));
const pct = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? `${(x * 100).toFixed(1)} %` : '—');
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x.toLocaleString('en-US') : x === null || x === undefined ? '—' : String(x));
const table = (head: string[], rows: string[][]) => [`| ${head.join(' | ')} |`, `|${head.map((h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const out: string[] = ['# Tables (generated from the sealed records; report-only)', ''];

type Row = Record<string, unknown>;

const search = readJ<{ rows: Row[] }>(path.join(t, 'search-summary.json'));

if (search) {
  out.push('## Search, convergence and effort per cutoff and arm', '');
  out.push(
    table(
      ['Cutoff', 'Arm', 'Lanes (broad / refine)', 'Replicates', 'Rounds', 'Requested', 'Fresh', 'Hits', 'GPU wall (s)', 'Budget-bound share', 'Cells with a feasible fit', 'Label'],
      search.rows.map((r) => [
        String(r.cutoff),
        String(r.arm),
        `${num(r.broadLanes)} / ${num(r.refineLanes)}`,
        num(r.replicates),
        ((r.rounds as { k: number; fired: boolean }[]) ?? []).map((x) => `${x.k}${x.fired ? '✓' : '✗'}`).join(' ') || '—',
        num(r.requested),
        num(r.fresh),
        num(r.archiveHits),
        num(r.wallSeconds),
        pct(r.budgetBoundShare),
        `${num(r.cellsWithFeasible)} / ${num(r.cells)}`,
        String(r.budgetLimitedLabel)
      ])
    ),
    ''
  );
}

const qual = readJ<{ rows: Row[] }>(path.join(t, 'qualification.json'));

if (qual) {
  out.push('## Qualification per cutoff, arm and stage', '');
  out.push(
    table(
      ['Cutoff', 'Arm', 'Stage', 'Members', 'Qualified', 'Failed gates (count)'],
      qual.rows.map((r) => [String(r.cutoff), String(r.arm), String(r.stage), num(r.members), num(r.qualified), Object.entries((r.failedByGate as Record<string, number>) ?? {}).map(([k, v]) => `${k} ${v}`).join(', ') || '—'])
    ),
    ''
  );
}

const sel = readJ<{ rows: Row[] }>(path.join(t, 'selections.json'));

if (sel) {
  out.push('## Primaries per cutoff and population (NL0 original rule; RA1 report-only)', '');
  out.push(
    table(
      ['Cutoff', 'Population', 'Members / qualified', 'Primary', 'Cell', 'Centre net', 'Centre DD', 'Sel. robust', 'Sel. p90 DD', 'Conf. p10', 'Conf. p90 DD', 'RA1 agrees'],
      sel.rows.map((r) => {
        const p = r.primaryRow as Row | null;

        return [
          String(r.cutoff),
          String(r.population),
          `${num(r.members)} / ${num(r.qualified)}`,
          r.primary ? `\`${String(r.primary)}\`` : '**none qualified**',
          p ? String(p.cell) : '—',
          money(p?.centreNet),
          money(p?.centreDd),
          money(p?.selectRobust),
          money(p?.selectP90Dd),
          money(p?.confirmP10),
          money(p?.confirmP90Dd),
          r.primary ? (r.ra1AgreesWithPrimary ? 'yes' : `no (${r.ra1First ? `\`${String(r.ra1First)}\`` : 'none'})`) : '—'
        ];
      })
    ),
    ''
  );
}

const fin = readJ<{ rows: Row[] }>(path.join(t, 'finalists.json'));

if (fin) {
  out.push('## C24 finalists and external controls — development (2016–2024), validation (2025-01-02 → 2026-10-30) and full history', '');
  out.push(
    table(
      ['Kind / arm', 'Label', 'Roles', 'Q', 'Dev net', 'Dev gross', 'Interest', 'Costs', 'Dev DD (% of $100k)', 'Lots (W/L)', 'Conf. p10 / p90 DD', 'Val. net', 'Val. reset DD', 'Full net', 'Full DD', 'V1–V3'],
      fin.rows.map((r) => {
        const v = r.validationTests as Row | null;

        return [
          `${String(r.kind)} ${String(r.arm)}`,
          `\`${String(r.label)}\``,
          String(r.roles),
          r.qualified ? 'pass' : `fails ${String(r.failed)}`,
          money(r.centreNet),
          money(r.gross),
          money(r.interest),
          money(r.costs),
          `${money(r.centreDd)} (${pct(r.centreDdPct)})`,
          `${num(r.lots)} (${num(r.wins)}/${num(r.losses)})`,
          `${money(r.confirmP10)} / ${money(r.confirmP90Dd)}`,
          money(r.validationNet),
          money(r.validationResetDd),
          money(r.fullNet),
          money(r.fullDd),
          v ? `${v.V1 ? '✓' : '✗'}${v.V2 ? '✓' : '✗'}${v.V3 ? '✓' : '✗'}` : '—'
        ];
      })
    ),
    ''
  );
  out.push('### Risk decomposition (development; dollars of the fixed $100,000 allocation)', '');
  out.push(
    table(
      ['Arm', 'Label', 'Marked DD', 'Principal loss marked / liq.', 'Banked DD marked / liq.', 'Worst lot MAE', 'Worst realized lot', 'Occupancy', 'Open-lot share', 'Top episode share', 'D1 / Growth booked'],
      fin.rows.map((r) => [
        String(r.arm),
        `\`${String(r.label)}\``,
        money(r.centreDd),
        `${money(r.principalLossMarked)} / ${money(r.principalLossLiquidation)}`,
        `${money(r.bankedDdMarked)} / ${money(r.bankedDdLiquidation)}`,
        money(r.worstLotMae),
        money(r.worstLoss),
        pct(r.occupancy),
        typeof r.openShare === 'number' ? pct(r.openShare) : '—',
        typeof r.topEpisodeShare === 'number' ? pct(r.topEpisodeShare) : '—',
        `${money(r.d1Booked)} / ${money(r.growthBooked)}`
      ])
    ),
    ''
  );
  out.push('### Neighbourhood tails and stresses (development)', '');
  out.push(
    table(
      ['Arm', 'Label', 'Conf. median', 'Conf. p95 DD', 'Worst-10 % mean DD', 'Worst DD', 'Breach share', '10 bps net / DD', '20 bps net / DD', '14 % interest net', 'Slippage +25 bps net', 'Next-open net'],
      fin.rows.map((r) => {
        const s = (r.stress as Record<string, { net: number; dd: number }>) ?? {};

        return [
          String(r.arm),
          `\`${String(r.label)}\``,
          money(r.confirmMedian),
          money(r.confirmP95Dd),
          money(r.confirmWorst10MeanDd),
          money(r.confirmWorstDd),
          pct(r.confirmBreachShare),
          `${money(s['cost 10 bps']?.net)} / ${money(s['cost 10 bps']?.dd)}`,
          `${money(s['cost 20 bps']?.net)} / ${money(s['cost 20 bps']?.dd)}`,
          money(s['interest 14%']?.net),
          money(s['stop slippage +25 bps']?.net),
          money(s['next-open stops']?.net)
        ];
      })
    ),
    ''
  );
}

const chr = readJ<{ sequential?: { procedures: Row[]; secondary: Row[] } }>(path.join(t, 'chronology.json'));

if (chr?.sequential) {
  out.push('## Chronological procedures (folds C19 → 2020–21, C21 → 2022–23, C23 → 2024)', '');
  out.push(
    table(
      ['Procedure', 'Fold primaries', 'Sequential net', 'Sequential DD', 'Verdict'],
      [...chr.sequential.procedures, ...chr.sequential.secondary].map((p) => [
        String(p.name),
        ((p.labels as (string | null)[]) ?? []).map((l) => (l ? `\`${l}\`` : '(none)')).join(' → '),
        money(p.net),
        money(p.drawdown),
        String(p.verdict)
      ])
    ),
    ''
  );
}

const bh = readJ<Row>(path.join(d, 'buy-and-hold.json'));

if (bh) {
  out.push('## TSLA buy-and-hold controls ($100,000 at the 2016-01-04 open; report-only)', '');

  const rows: string[][] = [];

  for (const k of ['financed11pct', 'unfinanced']) {
    const x = bh[k] as Record<string, Row>;

    rows.push([k === 'financed11pct' ? 'financed (11 % simple)' : 'unfinanced', money(x.development!.pnl), money(x.development!.dd), money(x.validation!.pnl), money(x.validation!.dd), money(x.full!.pnl), money(x.full!.dd)]);
  }
  out.push(table(['Variant', 'Dev P&L', 'Dev DD', 'Val. P&L', 'Val. DD (from the 2024 close)', 'Full P&L', 'Full DD'], rows), '');
}

fs.writeFileSync(path.join(t, 'TABLES.md'), `${out.join('\n')}\n`);
console.log(`wrote ${path.join(t, 'TABLES.md')} (${out.length} lines)`);
