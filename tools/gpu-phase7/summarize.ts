// gpu-phase7: the readiness tables — reads the campaign's records (read-only) and writes results/tables/summary.json and
// results/tables/*.md (Markdown tables only; no visuals, standard §7.7). Every figure is copied from a record; nothing is
// recomputed from archives.
//   node --no-maglev --experimental-transform-types tools/gpu-phase7/summarize.ts
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase7/context.ts';

const R = (p: string) => path.join(resultsDir, p);
const read = <T>(p: string): T | null =>
  fs.existsSync(R(p)) ? (JSON.parse(fs.readFileSync(R(p), 'utf8')) as T) : null;
const sha = (p: string) =>
  fs.existsSync(R(p))
    ? createHash('sha256')
        .update(fs.readFileSync(R(p)))
        .digest('hex')
    : null;
const T = path.join(resultsDir, 'tables');
const md: Record<string, string[]> = {};
const row = (t: string, cells: (string | number | boolean | null | undefined)[]) =>
  (md[t] ??= []).push(`| ${cells.map((c) => (c === null || c === undefined ? '—' : String(c))).join(' | ')} |`);
const head = (t: string, cols: string[]) => {
  md[t] = [`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`];
};
const n = (x: number | undefined | null) => (typeof x === 'number' ? x.toLocaleString('en-US') : '—');
const summary: Record<string, unknown> = { kind: 'gpu-phase7 readiness summary', t: new Date().toISOString() };

// parity campaign
{
  const s = read<{
    pass: boolean;
    totals: Record<string, unknown> & {
      runs: number;
      subjects: number;
      identical: number;
      mismatches: number;
      envelopesCompared: number;
      randomGenomes: number;
      determinismRuns: number;
      doors: string[];
      optionSets: string[];
      trades: number;
      lots: number;
    };
    runs: {
      file: string;
      door: string;
      options: string;
      detail: boolean;
      risk: boolean;
      subjects: number;
      identical: number;
      mismatches: number;
      envelopes: number;
      seconds: { total: number };
    }[];
  }>('parity/final/SUMMARY.json');

  summary.parity = s && { pass: s.pass, ...s.totals, sha256: sha('parity/final/SUMMARY.json') };
  head('parity', [
    'run',
    'door',
    'options',
    'detail',
    'risk',
    'subjects',
    'identical',
    'mismatches',
    'envelopes',
    'seconds'
  ]);
  for (const r of s?.runs ?? [])
    row('parity', [
      r.file.replace('.json', ''),
      r.door,
      r.options,
      r.detail,
      r.risk,
      n(r.subjects),
      n(r.identical),
      r.mismatches,
      n(r.envelopes),
      r.seconds?.total
    ]);
}
// risk-delivery parity
{
  head('riskParity', [
    'run',
    'door',
    'options',
    'subjects',
    'items',
    'R1 differing',
    'R2 differing',
    'archive compared / differing',
    'R3 differing',
    'rankings identical',
    'pass'
  ]);
  head('riskCensus', [
    'run',
    '±1 % of $35k DD',
    '±1 % of $40k DD',
    '±1 % of $25k PL',
    '±1 % of $25k BD',
    'closest to $35k / $40k (|Δ| $)',
    'control pass',
    'experimental pass',
    'control only',
    'experimental only',
    'EXP fails: DD / PL / BD'
  ]);
  const runs: Record<string, unknown> = {};

  for (const name of ['edge-D21', 'edge-D24', 'finalists-D24', 'random-D19']) {
    const x = read<{
      pass: boolean;
      door: string;
      options: string[];
      subjects: { total: number };
      items: number;
      r1: { differing: number };
      r2: { differing: number; archive: { compared: number; differing: number } };
      r3: {
        differing: number;
        rankings: Record<string, { sameQualifiedOrder: boolean; sameConstrainedOrder: boolean }>;
      };
      census: {
        within1pct: Record<string, number>;
        closest: Record<string, number>;
        decisions: {
          controlPass: number;
          experimentalPass: number;
          controlOnly: number;
          experimentalOnly: number;
          experimentalFailBy: Record<string, number>;
        };
        structural: Record<string, unknown>;
      };
      timing: Record<string, number>;
    }>(`risk-parity/${name}.json`);

    if (!x) continue;
    runs[name] = {
      pass: x.pass,
      subjects: x.subjects.total,
      items: x.items,
      r1: x.r1.differing,
      r2: x.r2.differing,
      archive: x.r2.archive,
      r3: x.r3.differing,
      census: x.census,
      timing: x.timing,
      sha256: sha(`risk-parity/${name}.json`)
    };
    const rk = Object.values(x.r3.rankings).every((r) => r.sameQualifiedOrder && r.sameConstrainedOrder);

    row('riskParity', [
      name,
      x.door,
      x.options.join(', '),
      n(x.subjects.total),
      n(x.items),
      x.r1.differing,
      x.r2.differing,
      `${n(x.r2.archive.compared)} / ${x.r2.archive.differing}`,
      x.r3.differing,
      rk,
      x.pass
    ]);
    const c = x.census;
    const d = c.decisions;

    row('riskCensus', [
      name,
      c.within1pct.dd35,
      c.within1pct.dd40,
      c.within1pct.principalLossLiq25,
      c.within1pct.bankedDdLiq25,
      `${c.closest.dd35.toFixed(2)} / ${c.closest.dd40.toFixed(2)}`,
      d.controlPass,
      d.experimentalPass,
      d.controlOnly,
      d.experimentalOnly,
      `${d.experimentalFailBy.markedDd} / ${d.experimentalFailBy.principalLoss} / ${d.experimentalFailBy.bankedDd}`
    ]);
  }
  summary.riskParity = runs;
}
// optimizer identity comparisons
{
  head('compare', [
    'comparison',
    'identical',
    'envelopes stripped',
    'lanes',
    'archived (a / b)',
    'differing rows',
    'lane differences'
  ]);
  const out: Record<string, unknown> = {};

  for (const f of fs.existsSync(R('compare'))
    ? fs
        .readdirSync(R('compare'))
        .filter((x) => x.endsWith('.json'))
        .sort()
    : []) {
    const x = read<{
      identical: boolean;
      envelopesStripped: number | null;
      lanes?: number;
      sealed?: { lanes: number };
      archivedEvaluations?: { a: number; b: number; differing: number };
      laneResultDifferences?: unknown[];
      differences?: unknown[];
    }>(`compare/${f}`);

    if (!x) continue;
    out[f] = { identical: x.identical, envelopesStripped: x.envelopesStripped, sha256: sha(`compare/${f}`) };
    row('compare', [
      f.replace('.json', ''),
      x.identical,
      x.envelopesStripped,
      x.lanes ?? x.sealed?.lanes,
      x.archivedEvaluations ? `${n(x.archivedEvaluations.a)} / ${n(x.archivedEvaluations.b)}` : '—',
      x.archivedEvaluations?.differing ?? '—',
      (x.laneResultDifferences ?? x.differences ?? []).length
    ]);
  }
  summary.compare = out;
}
// jobs: throughput (profile.json)
{
  head('jobs', [
    'job',
    'backend',
    'risk',
    'lanes',
    'fresh',
    'archive hits',
    'wall s',
    'evaluations / s',
    'host workers',
    'batches (median size)',
    'peak RSS MiB'
  ]);
  const out: Record<string, unknown> = {};

  for (const j of fs.existsSync(R('jobs')) ? fs.readdirSync(R('jobs')).sort() : []) {
    const p = read<{
      backend: string;
      risk?: boolean;
      lanes: number;
      fresh: number;
      archiveHits: number;
      wallSeconds: number;
      evaluationsPerSecond: number;
      hostWorkers: number;
      batches: { n: number; median: number } | null;
      peakRssMiB: number;
    }>(`jobs/${j}/profile.json`);

    if (!p) continue;
    out[j] = {
      backend: p.backend,
      risk: p.risk ?? false,
      lanes: p.lanes,
      fresh: p.fresh,
      wallSeconds: p.wallSeconds,
      evaluationsPerSecond: p.evaluationsPerSecond,
      hostWorkers: p.hostWorkers,
      batches: p.batches?.n ?? null,
      medianBatch: p.batches?.median ?? null
    };
    row('jobs', [
      j,
      p.backend,
      p.risk ?? false,
      p.lanes,
      n(p.fresh),
      n(p.archiveHits),
      p.wallSeconds,
      p.evaluationsPerSecond,
      p.hostWorkers,
      p.batches ? `${p.batches.n} (${p.batches.median})` : '—',
      p.peakRssMiB
    ]);
  }
  summary.jobs = out;
}
// Q1, finalists, sanitizer, sustained, negative, tamper, tests, integrity, scaling
{
  const q = read<Record<string, unknown>>('qualify/mini-risk.json');
  const fin = read<{
    pass: boolean;
    runs: { door: string; tasks: number; identical: number; sealedChecked: number; sealedEqual: number }[];
  }>('parity/finalists.json');
  const san = read<{
    rows: { tool: string; errors: number | null; subjects: number; identical: number; smoke: boolean }[];
  }>('sanitizer-final/sanitizer.json');
  const neg = read<{ pass: boolean; total: number; passed: number; rows: { group: string; pass: boolean }[] }>(
    'policy/negative-final.json'
  );
  const tam = read<{ pass: boolean; cases: number; passed: number; baselineOk: boolean }>('policy/tamper-final.json');
  const tests = read<{ pass: boolean; summary: string }>('tests/npm-test.json');
  const sl = read<{ pass: boolean; summary: string }>('tests/strategy-lab.json');
  const pp = read<{ pass: boolean; summary: string }>('tests/strategy-lab-portfolio-parity.json');
  const integ = read<{ pass: boolean; summary: string }>('integrity/integrity.json');
  const sus = ['p0', 'p1'].map((p) =>
    read<{
      pass: boolean;
      started: string;
      finished: string;
      failures: unknown[];
      parity: { samples: number; mismatches: number };
      repeat: { checks: number; mismatches: number };
      totals?: Record<string, number>;
      evaluations?: number;
      peaks?: Record<string, number>;
    }>(`sustained/${p}/summary.json`)
  );
  const groups: Record<string, string> = {};

  for (const r of neg?.rows ?? [])
    groups[r.group] =
      `${(neg?.rows ?? []).filter((x) => x.group === r.group && x.pass).length}/${(neg?.rows ?? []).filter((x) => x.group === r.group).length}`;
  summary.gates = {
    qualify: q,
    finalists: fin && { pass: fin.pass, runs: fin.runs },
    sanitizer: san?.rows,
    negative: neg && { pass: neg.pass, passed: neg.passed, total: neg.total, groups },
    tamper: tam && { pass: tam.pass, passed: tam.passed, cases: tam.cases, baselineOk: tam.baselineOk },
    sustained: sus.map(
      (s) =>
        s && {
          pass: s.pass,
          minutes: s.finished ? Math.round((Date.parse(s.finished) - Date.parse(s.started)) / 600) / 100 : null,
          failures: s.failures.length,
          parity: s.parity,
          repeat: s.repeat
        }
    ),
    npmTest: tests,
    strategyLab: sl,
    portfolioParity: pp,
    integrity: integ,
    scaling: ['D24', 'D21']
      .map((d) => read<Record<string, unknown>>(`scaling/scaling-${d}.json`))
      .map(
        (x) =>
          x && {
            door: x.door,
            pass: x.pass,
            subjects: x.subjects,
            chronologyDiffers: x.chronologyDiffers,
            decisionDiffers: x.decisionDiffers,
            worstC0: Math.max(...Object.values(x.worstDeviationRelativeToC0 as Record<string, number>))
          }
      )
  };
}

fs.mkdirSync(T, { recursive: true });
writeJson(path.join(T, 'summary.json'), summary);
for (const [k, lines] of Object.entries(md)) fs.writeFileSync(path.join(T, `${k}.md`), `${lines.join('\n')}\n`);
console.log(`tables: ${Object.keys(md).join(', ')}; summary ${path.relative(repoRoot, path.join(T, 'summary.json'))}`);
