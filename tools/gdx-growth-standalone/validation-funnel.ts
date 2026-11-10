// Post-validation, report-only diagnostic of Priority 4A (amendment A1): the Growth·GDX decision funnel of every frozen
// validation member over the validation window (2025-01-02 → 2026-10-30) and, for comparison, over 2024, on the FULL
// door behind the committed frozen selection — why most selected books made no trade after 2024. It reads only frozen
// configurations, selects nothing and changes no record; its output is sealed as results/validation/funnel.json.
//
//   node --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning tools/gdx-growth-standalone/validation-funnel.ts
import path from 'node:path';
import { funnelOf, observe } from '../../src/vg-d1-growth-diagnostic/observer.ts';
import { openStudyDoor } from '../../src/gdx-growth-standalone/doors.ts';
import { frozenSelectionFile, resultsDir } from '../../src/gdx-growth-standalone/context.ts';
import { readJson, sealJson, sha256File } from '../../src/gdx-growth-standalone/records.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../../src/vg-d1-growth-joint/space.ts';

const fz = readJson<{ validationPlan: { members: { label: string; quad: Quad; enabled: string[]; options: EvalOptions }[] } }>(
  frozenSelectionFile
);
const door = await openStudyDoor('FULL', `post-validation funnel diagnostic (A1; guard ${sha256File(frozenSelectionFile).slice(0, 12)})`);
const idx = (d: string) => door.dates.findIndex((x) => x >= d);
const ranges = {
  '2024': { from: idx('2024-01-02'), to: idx('2025-01-02') - 1 },
  validation: { from: idx('2025-01-02'), to: door.sessions - 1 }
};
const counters = { books: 0 };
const rows = fz.validationPlan.members
  .filter((m) => m.enabled.includes('G:GDX'))
  .map((m) => {
    const ob = observe(door, m.quad, m.options, counters, true);

    return {
      label: m.label,
      funnels: Object.fromEntries(Object.entries(ranges).map(([k, r]) => [k, funnelOf(ob, 'G:GDX', r)]))
    };
  });
const file = path.join(resultsDir, 'validation', 'funnel.json');

sealJson(
  file,
  {
    stage: 'post-validation funnel diagnostic (report-only; amendment A1)',
    door: door.name,
    ranges: Object.fromEntries(Object.entries(ranges).map(([k, r]) => [k, [door.dates[r.from], door.dates[r.to]]])),
    rows,
    finished: new Date().toISOString()
  },
  'post-validation funnel diagnostic'
);
console.log(`sealed ${path.relative(process.cwd(), file)}: ${rows.length} members`);
