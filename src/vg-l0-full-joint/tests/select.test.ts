// The frozen selection rules (PROTOCOL.md §10): (1) the selectors ARE Assignment 2's — this study's wrappers re-derive
// every one of Assignment 2's sealed C19, C21, C23 and C24 primaries (populations L, B, F × original, RA1, RA2) from its
// sealed evidence; (2) this study's populations (L, B, F of Track I; N of Track N with the incumbents; U = both; the New
// L0 control never selectable); (3) the stage-2 refinement plan (the legacy cell always, the quota, family and Growth
// coverage). Reads only Assignment 2's sealed development records (no market data).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { decode } from '../../growth140-vgt-s8m/store.ts';
import { repoRoot } from '../context.ts';
import type { Evidence } from '../qualify.ts';
import { populations, refineCells, refineQuota, selectorNames, selectors } from '../select.ts';
import { allCells, cellOf, legacyCellId } from '../space.ts';

const a2 = (cut: string, f: string) =>
  decode<Record<string, unknown>>(fs.readFileSync(path.join(repoRoot, 'research/vg-l0-risk-families/results/folds', cut, f), 'utf8'));

describe('the selectors are Assignment 2’s, unchanged', () => {
  for (const cut of ['C19', 'C21', 'C23', 'C24'])
    it(`${cut}: every sealed primary of Assignment 2 is re-derived from its sealed evidence`, () => {
      const ev: Evidence[] = [];
      const seen = new Set<string>();

      for (const st of ['broad', 'refine'])
        for (const e of (a2(cut, `${st}-qualification.json`) as { evidence: Evidence[] }).evidence)
          if (!seen.has(e.id)) {
            seen.add(e.id);
            ev.push(e);
          }

      const sel = a2(cut, 'selection.json') as { primaries: Record<string, Record<string, string | null>> };
      const cands = ev.filter((e) => e.stage !== 'control');
      const pop = { L: (e: Evidence) => e.cell === legacyCellId, B: (e: Evidence) => e.base, F: () => true } as const;

      for (const [p, f] of Object.entries(pop))
        for (const s of selectorNames) assert.equal(selectors[s](cands.filter(f))[0]?.label ?? null, sel.primaries[p]![s], `${cut} ${p}/${s}`);
    });
});

const ev = (label: string, o: Partial<Evidence> & { net?: number }): Evidence =>
  ({
    label,
    lane: label,
    stage: 'broad',
    track: 'I',
    pick: 'profit',
    replicate: 1,
    cell: legacyCellId,
    pair: 'GA.VA',
    base: true,
    activation: '',
    controlPattern: '',
    growthEntry: 'rise',
    growthStratum: 'rise·gate on·elig on',
    growthId: 'x',
    id: label,
    cfg: { cell: o.cell ?? legacyCellId, d1: {} as never, controls: null, g: { drawdownRecoveryGateEnabled: true } },
    activeInputs: 40,
    boundary: [],
    centre: { net: o.net ?? 100_000, dd: 15_000 } as never,
    risk: { conservativeNet: o.net ?? 100_000, occupancy: 0.5, openLot: null, openShare: null, mae: { worst: -5_000 } } as never,
    select: { robust: 80_000, p10: 60_000, p90Dd: 25_000 } as never,
    selectTail: { worst10Mean: 28_000 } as never,
    qualified: true,
    failed: [],
    ...o
  }) as Evidence;

describe('populations', () => {
  it('L, B, F hold only Track I; N only Track N (with the incumbents); U both; the control is never a member', () => {
    const xs = [
      ev('a', { cell: 'GA0.VA0' }),
      ev('b', { cell: 'GB1.VC0', base: true }),
      ev('c', { cell: 'GB1.VC0', base: false }),
      ev('n', { cell: 'GD0.VA1', track: 'N', stage: 'informed' }),
      ev('i', { cell: 'GA0.VA0', track: 'N', stage: 'incumbent' }),
      ev('ctl', { cell: 'GA0.VA0', track: 'control', stage: 'control' })
    ];
    const of = (p: keyof typeof populations) => xs.filter(populations[p]).map((e) => e.label);

    assert.deepEqual(of('L'), ['a']);
    assert.deepEqual(of('B'), ['a', 'b']);
    assert.deepEqual(of('F'), ['a', 'b', 'c']);
    assert.deepEqual(of('N'), ['n', 'i']);
    assert.deepEqual(of('U'), ['a', 'b', 'c', 'n', 'i']);
  });

  it('the original rule takes the highest qualified centre net; RA1 prefers a member passing every screen', () => {
    const xs = [
      ev('rich', { net: 300_000, selectTail: { worst10Mean: 40_000 } as never }),
      ev('safe', { net: 250_000 }),
      ev('unqualified', { net: 900_000, qualified: false })
    ];

    assert.equal(selectors.original(xs)[0]!.label, 'rich');
    assert.equal(selectors.RA1(xs)[0]!.label, 'safe');
    assert.ok(!selectors.RA1(xs).some((e) => e.label === 'unqualified'));
  });
});

describe('the stage-2 refinement plan', () => {
  it('always the legacy cell, at most 16 others, every family on every book and both Growth entries covered when available', () => {
    const xs: Evidence[] = [];

    allCells.forEach((cell, i) => {
      xs.push(ev(`${cell.id}#1`, { cell: cell.id, net: 100_000 + 1_000 * i, growthEntry: i % 7 === 0 ? 'breakout' : 'rise' }));
      xs.push(ev(`${cell.id}#2`, { cell: cell.id, net: 90_000 + 500 * i }));
    });

    const plan = refineCells(xs);
    const cells = plan.cells.map((c) => c.cell);

    assert.equal(cells[0], legacyCellId);
    assert.ok(cells.length <= refineQuota + 1);
    for (const s of ['GDX', 'VGT'] as const)
      for (const f of ['A', 'B', 'C', 'D']) assert.ok(cells.some((c) => cellOf(c)[s].family === f), `${s} family ${f}`);
    assert.ok(cells.some((c) => xs.some((e) => e.cell === c && e.growthEntry === 'breakout')), 'a breakout member is refined');
    for (const c of plan.cells) assert.ok(c.seeds.length > 0 && c.focus.length >= 1);
  });
});
