// S6: machine-readable tables (CSV) and a summary JSON from the study's records — the reports are written from these.
//
//   node --experimental-transform-types tools/gpu-phase1/tables.ts
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase1/context.ts';

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
const exists = (f: string) => fs.existsSync(path.join(resultsDir, f));
const out = path.join(resultsDir, 'tables');
const csv = (name: string, header: string[], rows: (string | number | boolean | null)[][]) => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, name), [header.join(','), ...rows.map((r) => r.map((x) => (typeof x === 'string' && /[,"]/.test(x) ? `"${x.replace(/"/g, '""')}"` : String(x ?? ''))).join(','))].join('\n') + '\n');
};
const r = (x: number, d = 1) => Number(x.toFixed(d));
const summary: Record<string, unknown> = {};

// ----- S1: components -----
{
  const d = read('s1/components.json');
  const rows: (string | number)[][] = [];

  for (const [k, s] of Object.entries(d.summary) as [string, Record<string, { mean: number; median: number; p90: number; max: number }> & { n: number; shareOfComposed: Record<string, number> }][]) {
    const [door, set] = k.split('/');

    rows.push([door!, set!, s.n, r(s.d1GDX.mean, 2), r(s.d1VGT.mean, 2), r(s.growthVGT.mean, 2), r(s.pool.mean, 2), r(s.record.mean, 3), r(s.evaluate.mean, 2), r(s.evaluate.median, 2), r(s.evaluate.p90, 2), r(s.evaluate.max, 2), r(s.shareOfComposed.d1Books! * 100, 1), r(s.shareOfComposed.growth! * 100, 1), r(s.shareOfComposed.pool! * 100, 1), r(s.shareOfComposed.record! * 100, 2)]);
  }
  csv('s1_component_ms.csv', ['door', 'set', 'n', 'd1_gdx_ms', 'd1_vgt_ms', 'growth_vgt_ms', 'pool_ms', 'record_ms', 'evaluate_mean_ms', 'evaluate_median_ms', 'evaluate_p90_ms', 'evaluate_max_ms', 'share_d1_pct', 'share_growth_pct', 'share_pool_pct', 'share_record_pct'], rows);
  summary.s1Loads = d.loads;
}

// ----- S1: CPU pool -----
{
  const rows: (string | number)[][] = [];

  for (const door of ['D24', 'D19', 'FULL']) {
    if (!exists(`s1/cpu-pool-${door}.json`)) continue;

    const p = read(`s1/cpu-pool-${door}.json`);

    for (const x of p.runs) {
      const ws = x.workerStats as { mem?: { rss: number }; gcs?: number; gcMs?: number }[];

      rows.push([door, x.workers, x.tasks, r(x.evalsPerSecond, 1), r(x.inWorkerMs.mean, 1), r(x.workerBusyShare * 100, 1), r(x.hostCpuUtilization * 100, 0), r(x.startSeconds, 1), r(ws.reduce((a, w) => a + (w.mem?.rss ?? 0), 0) / 2 ** 30, 2), ws.reduce((a, w) => a + (w.gcs ?? 0), 0), r(ws.reduce((a, w) => a + (w.gcMs ?? 0), 0) / 1000, 2)]);
    }
  }
  csv('s1_cpu_pool.csv', ['door', 'workers', 'tasks', 'evals_per_s', 'in_worker_ms', 'worker_busy_pct', 'host_cpu_pct', 'startup_s', 'workers_rss_gib', 'forced_gcs', 'gc_s'], rows);
}

// ----- A3 production decomposition (sealed records of research/vg-l0-full-joint) -----
{
  const root = path.resolve(resultsDir, '../../vg-l0-full-joint/results/search');
  const rows: (string | number)[][] = [];
  const stages: Record<string, number> = {};
  let fresh = 0,
    ws = 0,
    wall = 0;

  for (const cut of fs.readdirSync(root)) {
    const dir = path.join(root, cut);

    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).compute;

      if (!c) continue;

      const st: Record<string, number> = {};
      let tot = 0;

      for (const [k, v] of Object.entries(c.tallies) as [string, { ms: number }][]) {
        const g = k.split(':')[0]!;

        st[g] = (st[g] ?? 0) + v.ms;
        stages[g] = (stages[g] ?? 0) + v.ms;
        tot += v.ms;
      }
      rows.push([`${cut}/${f.replace('.json', '')}`, c.fresh, c.archiveHits, r(c.wallSeconds / 60, 1), r(c.fresh / c.wallSeconds, 1), r((c.workerSeconds * 1000) / c.fresh, 1), r((c.workerSeconds / (c.wallSeconds * 12)) * 100, 1), ...['screen', 'r1', 'r2', 'r3', 'refine'].map((g) => r(((st[g] ?? 0) / tot) * 100, 1))]);
      fresh += c.fresh;
      ws += c.workerSeconds;
      wall += c.wallSeconds;
    }
  }
  csv('a3_production_jobs.csv', ['job', 'fresh', 'archive_hits', 'wall_min', 'fresh_per_s', 'worker_ms_per_fresh', 'worker_busy_pct_12w', 'stage_screen_pct', 'stage_r1_pct', 'stage_r2_pct', 'stage_r3_pct', 'stage_refine_pct'], rows);

  const tot = Object.values(stages).reduce((a, b) => a + b, 0);

  summary.a3Production = { searchJobs: rows.length, fresh, workerSeconds: ws, wallHours: wall / 3600, workerBusyPct: (ws / (wall * 12)) * 100, stagePct: Object.fromEntries(Object.entries(stages).map(([k, v]) => [k, (v / tot) * 100])) };
}

// ----- S4: parity -----
{
  const rows: (string | number | boolean)[][] = [];
  const files = fs.readdirSync(path.join(resultsDir, 's4')).filter((f) => /^parity-.*\.json$/.test(f) && f !== 'parity-fixtures.json');

  for (const f of files.sort()) {
    const d = read(`s4/${f}`);
    const s = d.summary;

    rows.push([d.door, d.options?.set ?? 'base', s.all.n, s.R.n, s.A.n, s.B.n, s.N.n, s.all.g2, s.all.g3, d.g4?.applicable ? Object.entries(d.g4).filter(([k]) => k !== 'applicable').every(([, v]) => (v as { pass: boolean }).pass) : 'n/a', d.determinism.map((x: { mismatches: number }) => x.mismatches).reduce((a: number, b: number) => a + b, 0), d.determinism.map((x: { run: string }) => x.run).join('; '), d.maxCounts.d1GDX, d.maxCounts.d1VGT, d.maxCounts.lots, d.pass, (d.build?.['research/gpu-phase1-feasibility/build/gp1'] ?? '').slice(0, 16)]);
  }
  csv('s4_parity.csv', ['door', 'options', 'subjects', 'R', 'A', 'B', 'N', 'g2_pass', 'g3_pass', 'g4_pass', 'g5_mismatches', 'g5_runs', 'max_d1_gdx_trades', 'max_d1_vgt_trades', 'max_lots', 'pass', 'binary_sha256_16'], rows);
  summary.parity = { files: files.length, subjects: rows.reduce((a, x) => a + Number(x[2]), 0), allPass: rows.every((x) => x[15] === true) };

  if (exists('s4/parity-fixtures.json')) {
    const fx = read('s4/parity-fixtures.json');

    csv('s4_fixture_coverage.csv', ['edge_path', 'count'], Object.entries(fx.coverage).map(([k, v]) => [k, v as number]));
    summary.fixtures = { compared: fx.compared, failed: fx.failed, pass: fx.pass };
  }
  if (exists('s4/negative.json')) {
    const ng = read('s4/negative.json');

    csv('s4_negative_tests.csv', ['case', 'expected', 'outcome', 'pass'], ng.cases.map((c: { case: string; expected: string; outcome: string; pass: boolean }) => [c.case, c.expected, c.outcome, c.pass]));
    summary.negative = { cases: ng.cases.length, pass: ng.pass };
  }
}

// ----- S5: benchmarks -----
{
  const rows: (string | number)[][] = [];
  const hy: (string | number)[][] = [];

  if (fs.existsSync(path.join(resultsDir, 's5')))
    for (const f of fs.readdirSync(path.join(resultsDir, 's5')).sort()) {
      if (!f.endsWith('.json') || f.includes('capacity-check')) continue;

      const d = read(`s5/${f}`);

      if (d.gpu?.scaling)
        for (const s of d.gpu.scaling) {
          const st = s.steady;

          rows.push([d.door, d.set, s.batch, s.runs[0].candidates, r(d.cpu.evalsPerSecond, 1), r(st.evalsPerSecond, 1), r(st.kernelOnlyEvalsPerSecond, 1), r(st.evalsPerSecond / d.cpu.evalsPerSecond, 2), r(st.kernelOnlyEvalsPerSecond / d.cpu.evalsPerSecond, 2), r(st.d1KernelMs, 0), r(st.poolKernelMs, 0), r(st.h2dMs, 1), r(st.d2hMs, 1), r(st.roundTripMs, 0), r(st.encodeMs, 0), r(st.decodeAndRecordMs, 0), r(st.wallMs, 0), r(s.firstCall.wallMs, 0), d.recordHashMismatches]);
        }
      if (d.hybrid) hy.push([d.door, d.set, d.hybrid.workers, d.hybrid.hybridBatch, d.n, r(d.cpu.evalsPerSecond, 1), r(d.hybrid.evalsPerSecond, 1), r(d.hybrid.evalsPerSecond / d.cpu.evalsPerSecond, 2), r(d.hybrid.gpuBusySeconds, 1), r(d.hybrid.wallSeconds, 1), d.recordsCompared, d.recordHashMismatches]);
    }
  csv('s5_gpu_slice_scaling.csv', ['door', 'set', 'batch', 'candidates_timed', 'cpu_12w_evals_per_s', 'gpu_total_evals_per_s', 'gpu_kernel_only_evals_per_s', 'speedup_total', 'speedup_kernel_only', 'd1_kernel_ms', 'pool_kernel_ms', 'h2d_ms', 'd2h_ms', 'round_trip_ms', 'encode_ms', 'decode_record_ms', 'wall_ms', 'first_call_wall_ms', 'record_hash_mismatches'], rows);
  csv('s5_hybrid_end_to_end.csv', ['door', 'set', 'cpu_workers', 'gpu_batch', 'evaluations', 'cpu_only_evals_per_s', 'hybrid_evals_per_s', 'speedup', 'gpu_busy_s', 'hybrid_wall_s', 'records_compared', 'record_hash_mismatches'], hy);
  summary.benchmarks = { sliceRows: rows.length, hybridRows: hy.length };
}

writeJson(path.join(out, 'summary.json'), summary);
console.log(JSON.stringify(summary, null, 1));
