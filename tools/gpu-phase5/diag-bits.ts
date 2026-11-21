// gpu-phase5 diagnostic (PROTOCOL.md §4.1): the CPU reference of chosen tasks of Phase 4's parity run D24-fund (Phase
// 4's own seeds, so the tasks are the original ones), exactly as a CPU reference worker computes them
// (src/gpu-phase5/cpuRefWorker.ts `reference`, the same code as Phase 4's), with every NaN of the record reported with
// its bit pattern. Run it under different V8 tiering flags to see whether the record hash depends on the tier.
//   node [v8 flags] --experimental-transform-types tools/gpu-phase5/diag-bits.ts --from 32 --to 36 [--options fund]
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { evaluate, evaluateDetail } from '../../src/vg-l0-risk-families/evaluate.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { resolveDoor } from '../../src/gpu-phase5/doorSpec.ts';
import { bookView, canonHash, poolView } from '../../src/gpu-backend/canon.ts';
import { nansOf } from '../../src/gpu-phase5/bits.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const door = await resolveDoor({ kind: 'market', name: opt('door', 'D24') as never }, 'gpu-phase5 diag-bits (CPU reference)');
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const optionSet = opt('options', 'fund');
const options: EvalOptions = optionSet === 'fund' ? { ...vOptions, fundFrom: at(0.3) } : vOptions;
const label = opt('label', 'O-fund');
const subjects = [...referenceSubjects(), ...randomSubjects(Number(opt('random', '1500')), label, 'coarse', 0), ...growthStrata(2, `${label}-G`)];
const from = Number(opt('from', '32'));
const to = Number(opt('to', '36'));
const detail = !args.includes('--no-detail');

for (let i = from; i < to; i++) {
  const s = subjects[i]!;
  const x = runWithControls2(door, s.quad, s.controls, options, detail, false, { cache: false });
  const rec = detail ? evaluateDetail(door, s.quad, s.controls, options) : evaluate(door, s.quad, s.controls, options);

  console.log(
    JSON.stringify({
      i,
      k: s.key,
      books: canonHash(x.books.map(bookView)),
      pool: canonHash(poolView(x.result)),
      record: canonHash(rec),
      recordNaNs: nansOf(rec),
      poolNaNs: nansOf({ ...poolView(x.result), daily: null, principalAtClose: null, valueAtClose: null, heldAtClose: null }).length,
      bookNaNs: [...new Set(nansOf(x.books.map(bookView)).map((n) => n.bits))]
    })
  );
}
