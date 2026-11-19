// Explains the 8 non-matching results of results/s5/slice-D24-median-8192.json (caps 256 / 256): every candidate the
// GPU did not return must be an explicit capacity error whose CPU book or pool really exceeds the cap; every other
// candidate must match the CPU record exactly.
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { booksOf as p3BooksOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { VBook } from '../../src/vg-d1-growth-joint/books.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { openDoor, writeJson } from '../../src/gpu-phase1/context.ts';
import { exportDataset } from '../../src/gpu-phase1/dataset.ts';
import { type EvalItem, GpuEvaluator } from '../../src/gpu-phase1/gpu.ts';
import { randomSubjects, referenceSubjects } from '../../src/gpu-phase1/subjects.ts';

const door = await openDoor('D24', 'S5 capacity check (8192, caps 256)');
const ds = exportDataset(door, 'D24-bench');
const nl0 = referenceSubjects()[0]!;
const subjects = randomSubjects(8192, 'GPUBENCH-F').map((s) => ({ ...s, quad: { ...s.quad, g: nl0.quad.g } }));
const g = p3BooksOf(door, subjects[0]!.quad, { ...vOptions, enabled: { ...vOptions.enabled, 'D1:GDX': false, 'D1:VGT': false } }) as VBook[];
const items: EvalItem[] = subjects.map((s, i) => ({ key: String(i), quad: s.quad, controls: s.controls, options: vOptions, growth: g }));
const gpu = GpuEvaluator.start({ vramBudgetMb: 2400 });

await gpu.load(ds.file);

const failed: { key: string; status: string; cpu: { d1GDX: number; d1VGT: number; lots: number } }[] = [];

for (let i = 0; i < items.length; i += 4096) {
  const { results } = await gpu.evaluate(door, items.slice(i, i + 4096), { record: false, returnLots: true, tradeCap: 256, lotCap: 256 });

  for (const r of results.filter((x) => x.status !== 0)) {
    const it = items[Number(r.key)]!;
    const x = runWithControls2(door, it.quad, it.controls, it.options, false, false, { cache: false });

    failed.push({ key: r.key, status: r.statusText, cpu: { d1GDX: x.books.find((b) => b.book === 'D1:GDX')!.trades.length, d1VGT: x.books.find((b) => b.book === 'D1:VGT')!.trades.length, lots: x.result.lots.length } });
  }
}
await gpu.close();

const explained = failed.every((f) => (f.status === 'trade capacity' && (f.cpu.d1GDX > 256 || f.cpu.d1VGT > 256)) || (f.status === 'lot capacity' && f.cpu.lots > 256));

writeJson('research/gpu-phase1-feasibility/results/s5/slice-D24-median-8192-capacity-check.json', { kind: 'gpu-phase1 capacity check of the 8192 benchmark', caps: { trade: 256, lot: 256 }, candidates: items.length, failed, allExplainedByCapacity: explained });
console.log(JSON.stringify({ failed, allExplainedByCapacity: explained }));
