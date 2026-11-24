// P5-NS report-only tables (no evaluation): reads ONLY sealed records of this study (and the sealed references) and
// writes research/vg-l0-n-successor/reports/tables/*.md and summary.json. Never a selection, ranking or stopping input.
//   node --no-maglev --experimental-transform-types tools/vg-l0-n-successor/analyze.ts
import fs from 'node:fs';
import path from 'node:path';
import type { LaneResult } from '../../src/vg-l0-risk-envelope-pilot/search.ts';
import { cutoffKeys, researchDir, resultsDir } from '../../src/vg-l0-n-successor/context.ts';
import { stopReasons } from '../../src/vg-l0-n-successor/lanes.ts';
import { nl0Caps } from '../../src/vg-l0-n-successor/budget.ts';
import { cellOf } from '../../src/vg-l0-full-joint/space.ts';

const out = path.join(researchDir, 'reports', 'tables');
const rd = <T>(f: string): T | null => (fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')) as T) : null);
const usd = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `$${Math.round(x).toLocaleString('en-US')}`);
const usd2 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const pct = (x: number) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)} %` : '—');
const n = (x: number) => x.toLocaleString('en-US');
const table = (head: string[], rows: (string | number)[][]) =>
  [`| ${head.join(' | ')} |`, `|${head.map((_h, i) => (i === 0 ? '---' : '---:')).join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
const write = (name: string, title: string, body: string) => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name), `# ${title}\n\n${body.trim()}\n`);
};

interface SearchRec {
  cutoff: string;
  part: string;
  kind: 'broad' | 'refine' | 'informed';
  track: string;
  door: string;
  lanes: LaneResult[];
  requested: number;
  compute: { fresh: number; archiveHits: number; wallSeconds: number };
  wallSeconds: number;
  round?: number;
}

const searchRecords = () => {
  const rows: SearchRec[] = [];

  for (const c of cutoffKeys) {
    const d = path.join(resultsDir, 'search', c);

    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).sort()) rows.push(rd<SearchRec>(path.join(d, f))!);
  }
  return rows;
};

const stopClass = (s: string) =>
  s === stopReasons.converged ? 'converged' : s === stopReasons.classOnly ? 'coverage-limited' : s === stopReasons.capped ? 'budget-bound' : s === stopReasons.guard ? 'resource guard' : 'other';
const gatesOf = (structure: string) => {
  try {
    const c = cellOf(structure);

    return Number(c.GDX.gate) + Number(c.VGT.gate);
  } catch {
    return -1;
  }
};

const summary: Record<string, unknown> = {};

// ----- search and convergence -----
{
  const recs = searchRecords();
  const rows: (string | number)[][] = [];
  const byTrack: Record<string, { lanes: number; requested: number; fresh: number; hits: number; wall: number; stops: Record<string, number> }> = {};

  for (const r of recs) {
    const stops: Record<string, number> = {};

    for (const l of r.lanes) stops[stopClass(l.extension.stop)] = (stops[stopClass(l.extension.stop)] ?? 0) + 1;

    const islands = r.lanes.map((l) => l.islands.length);
    const beyond = r.lanes.filter((l) => l.islands.length > nl0Caps[r.kind]).length;

    rows.push([
      r.cutoff,
      r.part,
      r.kind,
      r.lanes.length,
      n(r.requested),
      n(r.compute.fresh),
      n(r.compute.archiveHits),
      Math.round(r.wallSeconds),
      Math.round(r.requested / Math.max(1, r.wallSeconds)),
      `${Math.min(...islands)}–${Math.max(...islands)} (mean ${(islands.reduce((a, b) => a + b, 0) / islands.length).toFixed(2)})`,
      beyond,
      stops.converged ?? 0,
      stops['coverage-limited'] ?? 0,
      stops['budget-bound'] ?? 0,
      stops['resource guard'] ?? 0
    ]);

    const key = `${r.cutoff} ${r.kind === 'informed' ? 'N' : r.kind === 'refine' ? 'F refine' : 'F broad'}`;
    const t = (byTrack[key] ??= { lanes: 0, requested: 0, fresh: 0, hits: 0, wall: 0, stops: {} });

    t.lanes += r.lanes.length;
    t.requested += r.requested;
    t.fresh += r.compute.fresh;
    t.hits += r.compute.archiveHits;
    t.wall += r.wallSeconds;
    for (const [k, v] of Object.entries(stops)) t.stops[k] = (t.stops[k] ?? 0) + v;
  }

  const tRows = Object.entries(byTrack).map(([k, t]) => [
    k,
    t.lanes,
    n(t.requested),
    n(t.fresh),
    n(t.hits),
    `${(t.wall / 3600).toFixed(2)} h`,
    t.stops.converged ?? 0,
    `${t.stops['coverage-limited'] ?? 0} (${pct((t.stops['coverage-limited'] ?? 0) / t.lanes)})`,
    `${t.stops['budget-bound'] ?? 0} (${pct((t.stops['budget-bound'] ?? 0) / t.lanes)})`,
    (t.stops['budget-bound'] ?? 0) / t.lanes > 0.1 ? '**budget-limited (not converged)**' : 'within the 10 % tolerance'
  ]);

  // by number of decline gates ON (broad lanes)
  const g: Record<string, Record<string, number>> = {};

  for (const r of recs.filter((x) => x.kind === 'broad'))
    for (const l of r.lanes) {
      const k = `${r.cutoff} · ${gatesOf(l.structure)} gate(s)`;
      const row = (g[k] ??= { lanes: 0, converged: 0, 'coverage-limited': 0, 'budget-bound': 0, islands: 0 });

      row.lanes!++;
      row[stopClass(l.extension.stop)] = (row[stopClass(l.extension.stop)] ?? 0) + 1;
      row.islands! += l.islands.length;
    }

  // extension islands beyond NL0's cap: gains
  const ext: (string | number)[][] = [];

  for (const r of recs) {
    const isl = r.lanes.flatMap((l) => l.islands.filter((x) => x.index >= nl0Caps[r.kind]));

    if (!isl.length) continue;

    const gain = (b: number, a: number) => (Number.isFinite(b) && b > 0 ? (a - b) / b : 0);
    const net = isl.map((x) => gain(x.before.net, x.after.net)).sort((a, b) => a - b);
    const hv = isl.map((x) => gain(x.before.hv, x.after.hv)).sort((a, b) => a - b);

    ext.push([r.cutoff, r.part, isl.length, pct(hv[Math.floor(hv.length / 2)]!), pct(hv.at(-1)!), pct(net[Math.floor(net.length / 2)]!), pct(net.at(-1)!), isl.filter((x) => gain(x.before.net, x.after.net) > 0.05).length]);
  }

  write(
    'search.md',
    'Search execution and stopping (sealed search records)',
    [
      '## By track and cutoff',
      table(['Cutoff · track', 'Lanes', 'Requested', 'Fresh', 'Archive hits', 'Job wall', 'Converged', 'Coverage-limited', 'Budget-bound', 'Precommitted label (§7.5)'], tRows),
      '',
      '## By job',
      table(['Cutoff', 'Part', 'Kind', 'Lanes', 'Requested', 'Fresh', 'Hits', 'Wall s', 'Req/s', 'Islands', 'Lanes beyond NL0 cap', 'Converged', 'Coverage-limited', 'Budget-bound', 'Guard'], rows),
      '',
      '## Broad lanes by decline gates ON',
      table(
        ['Cutoff · gates', 'Lanes', 'Converged', 'Coverage-limited', 'Budget-bound', 'Mean islands'],
        Object.entries(g).map(([k, v]) => [k, v.lanes!, v.converged ?? 0, v['coverage-limited'] ?? 0, v['budget-bound'] ?? 0, (v.islands! / v.lanes!).toFixed(2)])
      ),
      '',
      '## Extension islands beyond NL0’s cap (gain of the lane state across the island)',
      ext.length ? table(['Cutoff', 'Part', 'Islands', 'Median HV gain', 'Max HV gain', 'Median best-net gain', 'Max best-net gain', 'Islands with > 5 % net gain'], ext) : '(none)'
    ].join('\n')
  );
  summary.search = { byTrack };
}

// ----- replicate rounds -----
{
  const rows: (string | number)[][] = [];

  for (const c of cutoffKeys) {
    const d = path.join(resultsDir, 'rounds', c);

    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).sort()) {
      const r = rd<{ track: string; k: number; lastReplicate: number; before: { hv: number; robust: number; net: number; points: number }; after: { hv: number; robust: number; net: number; points: number }; trigger: { hypervolume: number; robust: number; net: number; newStructures: string[] }; fired: boolean; stop: string | null }>(path.join(d, f))!;

      rows.push([c, r.track, r.k, `R${r.lastReplicate}`, r.after.points, pct(r.trigger.hypervolume), pct(r.trigger.robust), pct(r.trigger.net), r.trigger.newStructures.length, r.fired ? `fires → R${r.lastReplicate + 1}` : r.stop ?? '']);
    }
  }
  write('rounds.md', 'Replicate rounds (tier 2; sealed decisions)', rows.length ? table(['Cutoff', 'Track', 'k', 'Last replicate measured', 'Union points', 'HV gain', 'Robust gain', 'Centre-net gain', 'New structures', 'Decision'], rows) : '(none yet)');
}

// ----- qualification, selection -----
{
  const rows: (string | number)[][] = [];
  const sel: (string | number)[][] = [];

  for (const c of cutoffKeys)
    for (const st of ['broad', 'refine', 'informed']) {
      const q = rd<{ members: number; evaluatedMembers: number; qualified: number; requested: number; compute: { fresh: number; wallSeconds: number }; evidence: { failed: string[]; track: string }[] }>(path.join(resultsDir, 'qualification', c, `${st}.json`));

      if (!q) continue;

      const fails: Record<string, number> = {};

      for (const e of q.evidence.filter((x) => x.track !== 'control')) for (const f of e.failed) fails[f] = (fails[f] ?? 0) + 1;
      rows.push([c, st, q.members, q.evaluatedMembers, q.qualified, n(q.requested), Math.round(q.compute.wallSeconds), Object.entries(fails).map(([k, v]) => `${k} ${v}`).join(', ')]);
    }
  for (const c of cutoffKeys) {
    const s = rd<{ primaries: Record<string, string | null>; subjects: { label: string; centre: { net: number; dd: number; lots: number }; select: { robust: number; p90Dd: number }; confirm: { p10: number; p90Dd: number }; cell: string }[]; controls: { label: string; centre: { net: number; dd: number }; select: { robust: number; p90Dd: number }; confirm: { p10: number; p90Dd: number }; qualified: boolean }[]; counts: Record<string, { members: number; qualified: number }> }>(path.join(resultsDir, 'selection', `${c}.json`));

    if (!s) continue;
    for (const [p, l] of Object.entries(s.primaries)) {
      const e = l ? s.subjects.find((x) => x.label === l) : null;

      sel.push([c, p, `${s.counts[p]?.qualified ?? 0} / ${s.counts[p]?.members ?? 0}`, l ?? '— (no qualified member)', e?.cell ?? '', usd2(e?.centre.net), usd2(e?.centre.dd), usd(e?.select.robust), usd(e?.select.p90Dd), usd(e?.confirm.p10), usd(e?.confirm.p90Dd)]);
    }
    for (const e of s.controls) sel.push([c, 'control', e.qualified ? 'qualified' : 'not qualified', e.label, '', usd2(e.centre.net), usd2(e.centre.dd), usd(e.select.robust), usd(e.select.p90Dd), usd(e.confirm.p10), usd(e.confirm.p90Dd)]);
  }
  write('qualification.md', 'Qualification (sealed)', rows.length ? table(['Cutoff', 'Stage', 'Members', 'Evaluated', 'Qualified', 'Requested', 'Wall s', 'Failed gates (members)'], rows) : '(none yet)');
  write('selection.md', 'Selections (NL0’s original rule; training evidence of each cutoff)', sel.length ? table(['Cutoff', 'Population', 'Qualified / members', 'Primary', 'Cell', 'Centre net', 'Centre DD', 'Sel. robust', 'Sel. p90 DD', 'Conf. p10', 'Conf. p90 DD'], sel) : '(none yet)');
}

// ----- slices, sequential -----
{
  const rows: (string | number)[][] = [];

  for (const c of ['C19', 'C21', 'C23', 'C24']) {
    const s = rd<{ rows: { label: string; roles: string[]; sliceNet: number; sliceDd: number; wholeNet: number; wholeDd: number; neighbourhood: { breachShare: number; wilson95: number[]; medianSliceDd: number; worstSliceDd: number; trainingBreachShare: number }; validation?: Record<string, boolean> }[] }>(
      c === 'C24' ? path.join(resultsDir, 'validation', 'validation.json') : path.join(resultsDir, 'slices', `${c}.json`)
    );

    if (!s) continue;
    for (const r of s.rows)
      rows.push([c, r.label, r.roles.slice(0, 3).join('; '), usd2(r.sliceNet), usd2(r.sliceDd), usd2(r.wholeNet), usd2(r.wholeDd), `${pct(r.neighbourhood.breachShare)} [${r.neighbourhood.wilson95.map((x) => pct(x)).join(', ')}]`, pct(r.neighbourhood.trainingBreachShare), r.validation ? Object.entries(r.validation).map(([k, v]) => `${k} ${v ? 'pass' : 'FAIL'}`).join(', ') : '']);
  }
  write('slices.md', 'Fold slices and the validation (retrospective, previously examined history)', rows.length ? table(['Fold', 'Subject', 'Roles', 'Slice P&L', 'Slice DD (reset)', 'Whole-run net', 'Whole-run DD', 'Training nbhd on slice: breaches > $35k [Wilson 95 %]', 'Training breach share', 'V1–V3'], rows) : '(none yet)');

  const q = rd<{ procedures: { population: string; verdict: string; labels: (string | null)[]; net: number; drawdown: number; drawdownAt: string; parts: { fold: string; sliceNet: number; sliceDd: number; charge: number; crossTerm: number }[] }[]; descriptive: { name: string; verdict: string; net: number; drawdown: number }[] }>(path.join(resultsDir, 'sequential.json'));

  if (q)
    write(
      'sequential.md',
      'Sequential paths and frozen verdicts (2020–2024; retrospective)',
      [
        table(
          ['Procedure', 'Verdict', 'Sequential net', 'Sequential DD (GPU statistic)', 'Where', 'Slices (P&L / reset DD)'],
          q.procedures.map((p) => [`${p.population}/original`, p.verdict, usd2(p.net), usd2(p.drawdown), p.drawdownAt, p.parts.map((x) => `${x.fold} ${usd(x.sliceNet)} / ${usd(x.sliceDd)}`).join('; ')])
        ),
        '',
        '## Descriptive paths',
        table(['Path', 'Verdict (descriptive)', 'Net', 'DD'], q.descriptive.map((p) => [p.name, p.verdict, usd2(p.net), usd2(p.drawdown)]))
      ].join('\n')
    );
}

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'summary.json'), `${JSON.stringify(summary, null, 1)}\n`);
console.log(`tables written to ${path.relative(process.cwd(), out)}`);
