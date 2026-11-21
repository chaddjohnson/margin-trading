// gpu-phase4 (copy of tools/gpu-phase3/sanitize.ts, this study's namespace) gate H4 (Phase 2 T0, unchanged checks; the batch is encoded and decoded by the parallel host path): the evaluator's real kernels under compute-sanitizer (memcheck with leak checking, racecheck,
// initcheck, synccheck). A batch covering every Growth structural value, both D1 books with RC 2 controls and the pool
// in detail and risk modes (with blackouts and period boundaries) runs on a short window; the GPU results must still
// equal the CPU's and every tool must report zero errors. Logs: results/sanitizer/<tool>.txt; record: results/sanitizer/sanitizer.json.
//   node --experimental-transform-types tools/gpu-phase4/sanitize.ts [--door W-QUIET] [--per 1] [--random N] [--out-dir sanitizer] [--host-workers 4]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { type DoorKey, cacheDir, openDoor, resultsDir, writeJson } from '../../src/gpu-phase4/context.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { createHash } from 'node:crypto';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';
import { GpuServer } from '../../src/gpu-backend/client.ts';
import { HostPipeline } from '../../src/gpu-backend/hostPipeline.ts';
import { computeSanitizer, serverBinary, toolkitLib } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const doorName = opt('door', 'W-QUIET') as DoorKey;
const door = await openDoor(doorName, 'T0 sanitizer');
const ds = exportDataset(door, cacheDir);
const subjects = [
  ...referenceSubjects(),
  ...growthStrata(Number(opt('per', '1')), 'SAN'),
  ...randomSubjects(Number(opt('random', '0')), 'SAN-R')
];
const options: EvalOptions = {
  ...vOptions,
  blackouts: [{ first: door.dates[40]!, last: door.dates[60]! }],
  boundaries: [door.dates[100]!, door.dates[150]!]
};
const tasks = subjects.map((s, i) => ({
  k: s.key,
  quad: s.quad,
  controls: s.controls,
  options: i % 2 ? options : vOptions,
  detail: true,
  risk: true
}));
const outDir = path.join(resultsDir, opt('out-dir', 'sanitizer'));

fs.mkdirSync(outDir, { recursive: true });
const tools = opt('tools', 'memcheck,racecheck,initcheck,synccheck').split(',');
const version = execFileSync(computeSanitizer, ['--version']).toString().trim();
const rows: unknown[] = [];

for (const tool of tools) {
  const log = path.join(outDir, `${tool}.txt`);
  const extra = tool === 'memcheck' ? ['--leak-check', 'full'] : [];
  const server = GpuServer.start({
    binary: serverBinary,
    libDir: toolkitLib,
    wrapper: [
      computeSanitizer,
      '--tool',
      tool,
      ...extra,
      '--error-exitcode',
      '17',
      '--log-file',
      log,
      '--print-limit',
      '50'
    ],
    watchdogS: 7200
  });
  const t0 = Date.now();
  const smoke = await server.smoke();
  await server.load(ds.file);
  const pipe = await HostPipeline.start({ door, workers: Number(opt('host-workers', '4')) });
  const prepared = await pipe.prepare(door, tasks, { returnTrades: true, returnSeries: true });
  const r = await pipe.complete(prepared, await server.submit(prepared), undefined, 'full');

  await pipe.close();
  let identical = 0;

  r.results.forEach((g, i) => {
    const s = subjects[i]!;
    const x = runWithControls2(door, s.quad, s.controls, tasks[i]!.options, true, false, { cache: false });
    const d =
      g.status === 0
        ? deepDiff(
            x.books.map((b) => b.trades),
            g.books.map((b) => b.trades),
            '$',
            [],
            1
          ).length +
          deepDiff(
            { ...x.result, refusals: 0 },
            { ...g.pool!, refusals: 0, lots: g.pool!.lots.map((l, j) => ({ ...l, trade: x.result.lots[j]?.trade })) },
            '$',
            [],
            1
          ).length
        : 1;

    if (d === 0) identical++;
  });
  await server.close();
  await new Promise((res) => setTimeout(res, 2000));
  const text = fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
  // memcheck / initcheck / synccheck: "ERROR SUMMARY: n errors"; racecheck: "RACECHECK SUMMARY: h hazards displayed (n errors, w warnings)"
  const summary =
    /ERROR SUMMARY: (\d+) error/.exec(text) ?? /RACECHECK SUMMARY: \d+ hazards? displayed \((\d+) errors?/.exec(text);
  const warnings = /RACECHECK SUMMARY: \d+ hazards? displayed \(\d+ errors?, (\d+) warnings?\)/.exec(text);
  const row = {
    tool,
    extra,
    subjects: tasks.length,
    smoke: smoke.ok,
    identical,
    errors: summary ? Number(summary[1]) : null,
    warnings: warnings ? Number(warnings[1]) : null,
    seconds: Math.round((Date.now() - t0) / 1000),
    log: path.relative(process.cwd(), log),
    summaryLines: text.trim().split('\n').slice(-3)
  };

  rows.push(row);
  console.log(JSON.stringify(row));
}
writeJson(path.join(outDir, 'sanitizer.json'), {
  kind: 'gpu-phase4 compute-sanitizer (requests from the host pipeline)',
  t: new Date().toISOString(),
  door: doorName,
  version,
  binary: serverBinary,
  binarySha256: createHash('sha256').update(fs.readFileSync(serverBinary)).digest('hex'),
  rows
});
