// Supplementary, report-only (outside the frozen plan; never a selection input): the capital-pool conflicts of A, B and C
// on the full history — every refused decision with its occupant and the refused virtual trade's own outcome on its
// $100,000 notional (the book's standalone trade). Standard §2.9: such virtual profits are descriptive and are never
// summed as an improvement the pool could have achieved (taking one would have displaced the occupant).
//
// Runs only after the study's validation is sealed (FULL behind the study's committed frozen selection, as the study's
// own door; logged in results/doors.jsonl).
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=8192 \
//     tools/vg-l0-session-hold/missed.ts
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Quad } from '../../src/vg-d1-growth-joint/space.ts';
import { openStudyDoor } from '../../src/vg-l0-session-hold/doors.ts';
import { isSealed } from '../../src/vg-l0-session-hold/records.ts';
import { type Unit, runUnit } from '../../src/vg-l0-session-hold/unit.ts';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const study = path.join(repoRoot, 'research/vg-l0-session-hold');
const validation = path.join(study, 'results/validation/validation.json');

if (!isSealed(validation)) throw new Error('the validation is not sealed: this report-only tool runs after it');

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const fz = decode<Any>(fs.readFileSync(path.join(study, 'FROZEN_SELECTION.json'), 'utf8'));
const subjects = (fz.crossTestSubjects as Any[]).filter(
  (r) => r.control === 'NL0' || r.id === fz.configurations.C.evidence.id
);
const rowOf = (id: string) => subjects.find((r) => r.id === id)!;
const nl0 = subjects.find((r) => r.control === 'NL0')!;
const cases: { key: string; quad: Quad; options: EvalOptions; unit: Unit }[] = [
  { key: 'A', quad: nl0.quad, options: nl0.options, unit: 'cal' },
  { key: 'B', quad: nl0.quad, options: nl0.options, unit: 'ses' },
  {
    key: 'C',
    quad: rowOf(fz.configurations.C.evidence.id).quad,
    options: rowOf(fz.configurations.C.evidence.id).options,
    unit: 'ses'
  }
];
const door = await openStudyDoor(
  'FULL',
  'supplementary report-only: refused decisions and their virtual outcomes (after the validation)'
);
const boundary = door.dates.indexOf('2024-12-31');
const out: Record<string, unknown> = {};

for (const c of cases) {
  const x = runUnit(door, c.quad, c.options, c.unit);
  const trades = new Map(x.books.flatMap((b) => b.trades.map((t) => [`${b.book}|${t.id}`, t] as const)));
  const refused = x.result.funding
    .filter((f) => f.outcome === 'refused')
    .map((f) => {
      const t = trades.get(`${f.book}|${f.trade}`);

      return {
        component: f.book,
        decision: door.dates[f.s],
        window: f.s <= boundary ? 'training' : 'validation',
        occupant: f.occupant,
        reason: f.reason,
        virtualEntry: t && t.eS >= 0 ? door.dates[t.eS] : null,
        virtualExit: t && t.fills.length ? door.dates[t.fills.at(-1)!.s] : t?.open ? 'open' : null,
        virtualNet: t ? Math.round(t.vNet * 100) / 100 : null
      };
    });
  const by = (w: string) => refused.filter((r) => r.window === w);
  const sum = (rs: typeof refused) => Math.round(rs.reduce((a, r) => a + (r.virtualNet ?? 0), 0) * 100) / 100;

  out[c.key] = {
    unit: c.unit,
    refusals: refused.length,
    training: {
      refusals: by('training').length,
      virtualNetOfRefused: sum(by('training')),
      positive: by('training').filter((r) => (r.virtualNet ?? 0) > 0).length
    },
    validation: {
      refusals: by('validation').length,
      virtualNetOfRefused: sum(by('validation')),
      positive: by('validation').filter((r) => (r.virtualNet ?? 0) > 0).length
    },
    rows: refused
  };
}

const file = path.join(study, 'results/supplementary/missed-opportunities.json');

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(
  file,
  `${JSON.stringify({ kind: 'vg-l0-session-hold supplementary (report-only, outside the frozen plan): refused decisions and their virtual outcomes', note: 'virtual outcomes are descriptive; never summed as achievable (standard §2.9)', generated: new Date().toISOString(), cases: out }, null, 1)}\n`
);
console.log(
  JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { ...(v as Any), rows: undefined }])))
);
