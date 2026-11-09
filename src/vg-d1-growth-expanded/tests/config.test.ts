// Unit tests of the 3B configuration space, fitness, roles and C4 labels (PROTOCOL.md §6, §8, §9, §12).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Rec } from '../../vg-d1-growth-joint/evaluate.ts';
import {
  type Cfg,
  canonicalOf,
  cellName,
  cells,
  cfgId,
  classOf,
  decode,
  eligGene,
  encode,
  enabledOf,
  entryGene,
  gateGene,
  growthOn,
  incGene,
  movesOf,
  neighbourhood,
  onFineGrid,
  optionsOf,
  pinCell,
  pinStratum,
  placeholder,
  quadId,
  screenGenomes,
  strataOf,
  structureOf
} from '../config.ts';
import { informedSeeds, loadControls, partners } from '../controls.ts';
import { fitOf, plausible, violationOf } from '../fitness.ts';
import { type Evidence, c4LabelsOf, rolesOf } from '../qualify.ts';

const randomCfgs = (n: number, label: string) =>
  cells.flatMap((cell) =>
    screenGenomes(n * 4, 'coarse', 'test', label, cellName(cell))
      .map((g, i) => {
        try {
          return decode(pinStratum(pinCell(g, cell), cell, i), 'coarse');
        } catch {
          return null;
        }
      })
      .filter((c): c is Cfg => c !== null)
      .slice(0, n)
  );

const rec = (o: Partial<Rec> & { d1?: number; gGdx?: number; gVgt?: number }): Rec => {
  const book = (lots: number) => ({
    lots,
    wins: 0,
    losses: 0,
    booked: 0,
    principalDays: lots * 1000,
    partials: 0,
    open: 0,
    decisions: lots,
    granted: lots,
    refused: 0
  });
  const d1 = o.d1 ?? 1;
  const gg = o.gGdx ?? 0;
  const gv = o.gVgt ?? 1;

  return {
    id: 'x',
    net: 1000,
    dd: 1000,
    signature: 'sig',
    error: undefined,
    ...o,
    books: { 'D1:GDX': book(d1), 'D1:VGT': book(0), 'G:GDX': book(gg), 'G:VGT': book(gv) },
    fam: { D1: book(d1), G: book(gg + gv) },
    mixed: d1 > 0 && gg + gv > 0
  } as unknown as Rec;
};

describe('3B configuration space', () => {
  const cfgs = randomCfgs(6, 'space');

  it('covers every cell with the right inclusion and entries', () => {
    for (const cell of cells) {
      const mine = cfgs.filter((c) => cellName({ inc: c.inc, GDX: growthOn(c.inc, 'GDX') ? (c.quad.g.GDX.entryMethod === 'trend_breakout' ? 'breakout' : 'rise') : null, VGT: growthOn(c.inc, 'VGT') ? (c.quad.g.VGT.entryMethod === 'trend_breakout' ? 'breakout' : 'rise') : null }) === cellName(cell));

      assert.ok(mine.length > 0, cellName(cell));
    }
  });

  it('canonicalizes a disabled book to the placeholder and fixes the order to D1 first', () => {
    for (const c of cfgs) {
      for (const s of ['GDX', 'VGT'] as const)
        if (!growthOn(c.inc, s)) assert.deepEqual(c.quad.g[s], placeholder);
      assert.equal(c.quad.first, 'D1');
    }
  });

  it('gives the same identity whatever vector a disabled book carries', () => {
    const v = cfgs.find((c) => c.inc === 'V')!;
    const b = cfgs.find((c) => c.inc === 'B')!;
    const alt = canonicalOf('V', { ...v.quad, g: { ...v.quad.g, GDX: b.quad.g.GDX } });

    assert.equal(cfgId(alt), cfgId(v));
  });

  it('distinguishes inclusion choices that share a quad', () => {
    const b = cfgs.find((c) => c.inc === 'B')!;
    const v = canonicalOf('V', b.quad);
    const g = canonicalOf('G', b.quad);

    assert.notEqual(cfgId(v), cfgId(b));
    assert.notEqual(cfgId(g), cfgId(b));
    assert.notEqual(cfgId(v), cfgId(g));
  });

  it('round-trips genomes on both grids', () => {
    for (const c of cfgs) {
      assert.equal(cfgId(decode(encode(c, 'coarse'), 'coarse')), cfgId(c));
      assert.equal(cfgId(decode(encode(c, 'fine'), 'fine')), cfgId(c));
    }
  });

  it('keeps a dormant vector in the genome and drops it from the configuration', () => {
    const b = cfgs.find((c) => c.inc === 'B')!;
    const v = canonicalOf('V', b.quad);
    const g = encode(v, 'fine', { GDX: b.quad.g.GDX });

    assert.equal(cfgId(decode(g, 'fine')), cfgId(v));
    g[incGene] = 2; // switch to B: the dormant GDX vector comes back
    assert.equal(cfgId(decode(g, 'fine')), cfgId(canonicalOf('B', { ...b.quad })));
  });

  it('pins the cell and its strata', () => {
    for (const cell of cells) {
      const { count } = strataOf(cell);
      const gs = screenGenomes(count * 2, 'coarse', 'test', 'strata', cellName(cell)).map((g, i) =>
        pinStratum(pinCell(g, cell), cell, i)
      );

      gs.forEach((g, i) => {
        assert.equal(g[incGene], ['V', 'G', 'B'].indexOf(cell.inc));
        for (const s of ['GDX', 'VGT'] as const) if (cell[s]) assert.equal(g[entryGene[s]], cell[s] === 'rise' ? 0 : 1);

        const k = i % count;
        let bit = 0;

        for (const s of ['GDX', 'VGT'] as const) {
          if (!cell[s]) continue;
          assert.equal(g[gateGene[s]], (k >> bit) & 1, `gate ${s}`);
          bit++;
          if (cell[s] === 'rise') {
            assert.equal(g[eligGene[s]] !== 0, ((k >> bit) & 1) === 1, `elig ${s}`);
            bit++;
          }
        }
      });
    }
  });

  it('never moves a disabled book in a neighbourhood, and is deterministic', () => {
    const v = cfgs.find((c) => c.inc === 'V')!;
    const a = neighbourhood(v, { name: 't', n: 32, labels: ['test', 'nb'] });
    const b = neighbourhood(v, { name: 't', n: 32, labels: ['test', 'nb'] });

    assert.deepEqual(
      a.map((p) => p.id),
      b.map((p) => p.id)
    );
    for (const p of a) {
      assert.deepEqual(p.cfg.quad.g.GDX, placeholder);
      assert.equal(p.cfg.inc, 'V');
      assert.equal(p.cfg.quad.g.VGT.entryMethod, v.quad.g.VGT.entryMethod);
    }
    assert.ok(new Set(a.map((p) => p.id)).size === a.length && !a.some((p) => p.id === cfgId(v)));
  });

  it('restricts a scope to its books', () => {
    const b = cfgs.find((c) => c.inc === 'B')!;

    for (const p of neighbourhood(b, { name: 't', n: 16, labels: ['test', 'scope'], scope: 'd1' }))
      assert.deepEqual(p.cfg.quad.g, b.quad.g);
    for (const p of neighbourhood(b, { name: 't', n: 16, labels: ['test', 'scope'], scope: 'gdx' })) {
      assert.deepEqual(p.cfg.quad.d1.VGT, b.quad.d1.VGT);
      assert.deepEqual(p.cfg.quad.g.VGT, b.quad.g.VGT);
    }
  });

  it('offers inclusion moves in refinement', () => {
    const b = cfgs.find((c) => c.inc === 'B')!;
    const ms = movesOf(b);

    assert.ok(ms.some((m) => m.inc === 'V') && ms.some((m) => m.inc === 'G'));

    const v = cfgs.find((c) => c.inc === 'V')!;

    assert.ok(!movesOf(v).some((m) => m.inc === 'B'));
    assert.ok(movesOf(v, { d1: true, g: true }, { GDX: b.quad.g.GDX }).some((m) => m.inc === 'B'));
    assert.ok(!movesOf(v, { d1: false, g: true }).some((m) => JSON.stringify(m.quad.d1) !== JSON.stringify(v.quad.d1)));
  });

  it('classifies structure per enabled book', () => {
    const v = cfgs.find((c) => c.inc === 'V')!;

    assert.match(classOf(v).gates, /^-\//);
    assert.equal(structureOf(v.quad.g.VGT).entry, v.quad.g.VGT.entryMethod);
  });
});

describe('controls and seeds', () => {
  it('map every control to its exact Priority 3 identity, on the fine grid', () => {
    const { controls } = loadControls();
    const ids = Object.fromEntries(controls.map((c) => [c.key, c.p3Id]));

    assert.equal(ids.C4, 'f324035d15f69610');
    for (const c of controls)
      if (c.cfg) {
        assert.equal(quadId(c.cfg.quad), c.p3Id, c.key);
        assert.ok(onFineGrid(c.cfg), `${c.key} on the fine grid`);
        assert.deepEqual(enabledOf(c.cfg.inc), c.enabled, c.key);
        assert.deepEqual(optionsOf(c.cfg).enabled ?? {}, c.subject.options.enabled ?? {}, c.key);
      }
  });

  it('builds informed seeds in every inclusion variant, exactly representable, C4 the one focus', () => {
    for (const m of ['fixed', 'joint'] as const) {
      const s = informedSeeds(m);

      assert.ok(s.length > 80);
      assert.equal(s.filter((x) => x.focus).length, 1);
      assert.equal(quadId(s.find((x) => x.focus)!.cfg.quad), 'f324035d15f69610');
      for (const inc of ['V', 'G', 'B'] as const) assert.ok(s.some((x) => x.cfg.inc === inc));
      for (const x of s) assert.ok(onFineGrid(x.cfg), x.label);
      if (m === 'fixed') {
        const vg2 = JSON.stringify(s[0]!.cfg.quad.d1);

        for (const x of s) assert.equal(JSON.stringify(x.cfg.quad.d1), vg2);
      }
    }
    assert.equal(partners().GDX.length, 1);
  });
});

describe('fitness', () => {
  it('centre-first: an implausible centre gets the unmeasured penalty and is never feasible', () => {
    const r = rec({ net: -10, dd: 1000 });

    assert.equal(plausible(r), false);
    assert.ok(violationOf(r, null, 'mixed', 'V').violation >= 1);

    const ok = rec({ net: 5000, dd: 1000 });

    assert.equal(plausible(ok), true);
    assert.ok(violationOf(ok, null, 'mixed', 'V').violation >= 1, 'no neighbours: never feasible');
  });

  it("'all' requires a B configuration funding D1 and both Growth books", () => {
    const nb = { p90Dd: 1000, robust: 1 } as never;

    assert.equal(violationOf(rec({ gGdx: 1, gVgt: 1 }), nb, 'all', 'B').violation, 0);
    assert.ok(violationOf(rec({ gGdx: 0, gVgt: 1 }), nb, 'all', 'B').violation > 0);
    assert.ok(violationOf(rec({ gGdx: 0, gVgt: 1 }), nb, 'all', 'V').violation > 0);
    assert.equal(violationOf(rec({ gGdx: 0, gVgt: 1 }), nb, 'mixed', 'V').violation, 0);
    assert.ok(violationOf(rec({ d1: 0 }), nb, 'mixed', 'V').violation > 0);

    const f = fitOf('r1', 'x', 'B', rec({ gGdx: 1, gVgt: 1 }), nb);

    assert.equal(f.violation, 0);
    assert.equal(f.violationAll, 0);
  });
});

describe('roles, the primary and the C4 labels', () => {
  const ev = (label: string, net: number, dd: number, robust: number, p90: number, p10: number, qualified = true, extra: Partial<Evidence> = {}) =>
    ({
      label,
      qualified,
      inc: 'V',
      centre: { net, dd },
      select: { robust, p90Dd: p90, p10 },
      confirm: { p10, p90Dd: p90, median: robust },
      stress: { 'cost 10 bps': { net: net - 10 }, 'cost 20 bps': { net: net - 20 } },
      ...extra
    }) as unknown as Evidence;

  it('ranks the actual-profit role by centre net with the frozen tie-breaks', () => {
    const r = rolesOf('t', [ev('b', 100, 10, 50, 20, 40), ev('a', 100, 10, 50, 20, 40), ev('c', 90, 5, 80, 10, 70), ev('x', 999, 1, 1, 1, 1, false)]);

    assert.equal(r.roles['actual-profit'], 'a');
    assert.equal(r.roles['robust-profit'], 'c');
    assert.equal(r.roles.balanced, 'c');
    assert.equal(r.qualified, 3);
  });

  it('falls back to no primary without a qualified member', () => {
    const r = rolesOf('t', [ev('x', 999, 1, 1, 1, 1, false)]);

    assert.equal(r.roles['actual-profit'], null);
    assert.match(r.reason, /no qualified member/);
  });

  it('labels dominance, trade-offs and local stability against C4', () => {
    const c4 = ev('C4', 300, 17, 200, 24, 200);

    assert.equal(c4LabelsOf(ev('d', 310, 17, 210, 23, 205), c4).dominates, true);
    assert.equal(c4LabelsOf(ev('t', 330, 21, 180, 35, 170), c4).higherProfitTradeOff, true);
    assert.equal(c4LabelsOf(ev('t', 330, 21, 180, 35, 170), c4).dominates, false);
    assert.equal(c4LabelsOf(ev('s', 280, 15, 230, 20, 230), c4).strongerLocalStability, true);
    assert.equal(c4LabelsOf(c4, c4).dominates, false);
  });
});
