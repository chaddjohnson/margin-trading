// The study's configuration space (PROTOCOL.md §6): the 196 = 64 + 132 cells; decode/encode round trips in every cell;
// the controls express their cell; identities (Priority 3's quadId for the legacy cell, rc1 for base, rc2 for onset;
// New L0's own identity); inactive genes never change an identity; the adaptive bound's repair; neighbourhoods (K and
// inactive genes fixed, clipping, common random numbers, de-duplication); refinement moves; the screen's K strata.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Rng } from '../../optimizer/rng.ts';
import { newL0 } from '../nl0.ts';
import {
  type Cfg,
  activeSet,
  allCells,
  baseCells,
  baseCounterpart,
  cellOf,
  cellOfControls,
  cfgId,
  ctlOffset,
  d1Offset,
  decode,
  encode,
  levels,
  movesOf,
  nGenes,
  neighbourhood,
  onsetCells,
  pinStratum,
  screenGenomes,
  strataCount,
  controlValuesOf
} from '../space.ts';

const random = (seed: number) => {
  const rng = Rng.from(seed, 7);

  return () => Array.from({ length: nGenes }, (_v, i) => rng.int(levels[i]!));
};

describe('cells', () => {
  it('14 × 14 = 196 cells: 64 base (next-session only) and 132 with an entry-day book', () => {
    assert.equal(allCells.length, 196);
    assert.equal(baseCells.length, 64);
    assert.equal(onsetCells.length, 132);
    assert.equal(new Set(allCells.map((c) => c.id)).size, 196);
    assert.ok(onsetCells.every((c) => c.GDX.entryDay || c.VGT.entryDay));
    assert.ok(allCells.every((c) => !(c.GDX.family === 'A' && c.GDX.entryDay)));
    assert.equal(baseCounterpart(cellOf('GB1e.VC0')), 'GB1.VC0');
    assert.equal(baseCounterpart(cellOf('GD0e.VD1e')), 'GD0.VD1');
  });
});

describe('genome, controls and identity', () => {
  it('every cell: decode → encode → decode is exact; the controls express the cell; identities are versioned', () => {
    const g = random(1);

    for (const cell of allCells)
      for (let i = 0; i < 5; i++) {
        const c = decode(g(), cell);

        assert.equal(cfgId(decode(encode(c), cell)), cfgId(c));
        assert.equal(cellOfControls(c.controls), cell.id);
        assert.match(cfgId(c), cell.id === 'GA0.VA0' ? /^[0-9a-f]{16}$/ : cell.base ? /^rc1-/ : /^rc2-/);
      }
  });

  it('New L0 in the legacy cell keeps Priority 3’s identity a2e385640ca61012', () => {
    const c: Cfg = { cell: 'GA0.VA0', d1: newL0().quad.d1, controls: null };

    assert.equal(cfgId(c), 'a2e385640ca61012');
    assert.equal(cfgId(decode(encode(c), cellOf('GA0.VA0'))), 'a2e385640ca61012');
  });

  it('inactive genes never change an identity (C: hold and buffer; unused control genes)', () => {
    const g = random(2)();
    const cell = cellOf('GC0.VA0');
    const base = cfgId(decode(g, cell));
    const active = activeSet(cell);

    for (let i = 0; i < nGenes; i++) {
      if (active.has(i)) continue;

      const h = [...g];

      h[i] = (h[i]! + 1) % levels[i]!;
      assert.equal(cfgId(decode(h, cell)), base, `gene ${i}`);
    }
    assert.ok(!active.has(d1Offset.GDX + 3) && !active.has(d1Offset.GDX + 5), 'C: hold and buffer inactive');
    assert.ok(active.has(d1Offset.VGT + 3), 'A: the hold stays active');
  });

  it('repairs the adaptive bound to at least hold + 3 and keeps it valid', () => {
    const g = new Array<number>(nGenes).fill(0);
    const cell = cellOf('GD0.VA0');

    g[d1Offset.GDX + 3] = 27; // hold 30
    g[ctlOffset.GDX + 1] = 0; // hx 6
    const c = decode(g, cell);
    const h = c.controls!.books['D1:GDX']!.hold!;

    assert.equal(c.d1.GDX.maximumHoldDays, 30);
    assert.deepEqual(h.mode === 'adaptive' ? h.extendedHoldDays : null, 33);
  });
});

describe('neighbourhoods and moves', () => {
  it('K and inactive genes never move; clipping is counted; the same labels give the same draws', () => {
    const g = random(3)();
    const cell = cellOf('GB1.VD1e');
    const c = decode(g, cell);
    const fam = { name: 'r1', n: 64, labels: ['test', 'r1'] };
    const a = neighbourhood(c, fam);
    const b = neighbourhood(c, fam);

    assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id));
    assert.ok(a.length > 50);
    for (const p of a) {
      assert.equal(controlValuesOf(p.cfg, 'GDX').k, controlValuesOf(c, 'GDX').k);
      assert.equal(controlValuesOf(p.cfg, 'VGT').k, controlValuesOf(c, 'VGT').k);
      assert.equal(p.cfg.cell, cell.id);
    }
    assert.equal(new Set(a.map((x) => x.id)).size, a.length, 'de-duplicated');
    assert.ok(!a.some((x) => x.id === cfgId(c)), 'the centre is never its own neighbour');
  });

  it('moves stay in the cell and the box; K ± 1 exists for a gated book', () => {
    const c = decode(random(4)(), cellOf('GA1.VB0'));
    const moves = movesOf(c);

    assert.ok(moves.length > 20);
    assert.ok(moves.every((m) => m.cell === 'GA1.VB0'));
    assert.ok(moves.some((m) => Math.abs((controlValuesOf(m, 'GDX').k ?? 0) - (controlValuesOf(c, 'GDX').k ?? 0)) === 1));
    for (const m of moves) for (const [i, v] of encode(m).entries()) assert.ok(v >= 0 && v < levels[i]!);
  });
});

describe('the screen’s K strata', () => {
  it('give every K pair of a doubly gated cell the same number of proposals', () => {
    const cell = cellOf('GB1.VC1e');
    const n = 512;
    const seen = new Map<string, number>();

    assert.equal(strataCount(cell), 16);
    for (const [i, g] of screenGenomes(n, 'test', 'screen').entries()) {
      const c = decode(pinStratum(g, cell, i), cell);
      const k = `${controlValuesOf(c, 'GDX').k}/${controlValuesOf(c, 'VGT').k}`;

      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    assert.equal(seen.size, 16);
    assert.ok([...seen.values()].every((x) => x === n / 16));
  });
});
