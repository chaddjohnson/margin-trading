// The full joint configuration space (PROTOCOL.md §6): 64 cells and 16 family pairs; the 92-gene genome at both
// resolutions; decode → encode → decode is exact in every cell; the controls express the cell; identities (Priority 3's
// quadId for legacy, rc1 for next-session controls, rc2 with an entry-day book; New L0's own identity); INACTIVE genes
// never change an identity (D1 hold/buffer under C, unused controls, an A book's activation, Growth's inactive inputs)
// while an ACTIVE Growth gene does; JSON round trips; the balanced strata; neighbourhoods (categorical genes and K fixed,
// every active numeric input within its radius, common random numbers, de-duplication); refinement moves; projections
// and Track N's seeds. No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Rng } from '../../optimizer/rng.ts';
import { quadId } from '../../vg-d1-growth-joint/space.ts';
import { fineStepOf } from '../../growth140-vgt-stable/space.ts';
import { focusOf, projectedSeeds, seedGrid } from '../informed.ts';
import { incumbents } from '../nl0.ts';
import {
  type Cfg,
  actGene,
  activeOrdinal,
  allCells,
  allPairs,
  canonicalCfg,
  cellOf,
  cellOfControls,
  cellOfPairGate,
  cfgId,
  controlValuesOf,
  ctlIndex,
  ctlOffset,
  d1Offset,
  decode,
  encode,
  entryDayOf,
  evalKeyOf,
  gId,
  gNumOffset,
  legacyCellId,
  levelsOf,
  movesOf,
  nCat,
  nGenes,
  neighbourhood,
  numericGenes,
  pairOf,
  pinCell,
  pinStratum,
  pinnedOfCell,
  project,
  strataCount,
  strataFactors,
  strataSequence,
  structureOf
} from '../space.ts';

const randomGenome = (rng: Rng, res: 'coarse' | 'fine') => levelsOf(res).map((n) => rng.int(n));
const inCell = (rng: Rng, cellId: string, res: 'coarse' | 'fine' = 'coarse') => pinCell(randomGenome(rng, res), cellOf(cellId));
const nl0Quad = () => incumbents().NL0.quad;

describe('structure', () => {
  it('8 × 8 = 64 cells, 16 family pairs of 4 gate states each', () => {
    assert.equal(allCells.length, 64);
    assert.equal(new Set(allCells.map((c) => c.id)).size, 64);
    assert.equal(allPairs.length, 16);
    for (const p of allPairs) assert.deepEqual([0, 1, 2, 3].map((j) => pairOf(cellOfPairGate(p, j))), [p, p, p, p]);
    assert.equal(cellOfPairGate('GC.VA', 3).id, 'GC1.VA1');
  });

  it('the genome: 14 categorical + 78 ordinal genes (D1 16, controls 12, Growth 50) at both resolutions', () => {
    assert.equal(nCat, 14);
    assert.equal(nGenes, 92);
    assert.equal(levelsOf('coarse').length, 92);
    assert.ok(levelsOf('fine').slice(gNumOffset).every((n, i) => n >= levelsOf('coarse')[gNumOffset + i]!), 'the fine Growth grid refines the coarse one');
  });
});

describe('genome, controls and identity', () => {
  it('every cell, both resolutions: decode → encode → decode is exact and the controls express the cell', () => {
    const rng = Rng.from(1, 7);

    for (const res of ['coarse', 'fine'] as const)
      for (const cell of allCells)
        for (let i = 0; i < 4; i++) {
          const c = decode(inCell(rng, cell.id, res), res);

          assert.equal(c.cell, cell.id);
          assert.equal(cellOfControls(c.controls), cell.id);
          assert.equal(cfgId(decode(encode(c, res), res)), cfgId(c));
        }
  });

  it('identities: Priority 3 quadId when legacy, rc1 with next-session controls, rc2 with an entry-day book; New L0 = a2e385640ca61012', () => {
    const rng = Rng.from(2, 7);
    const legacy = decode(inCell(rng, legacyCellId), 'coarse');

    assert.match(cfgId(legacy), /^[0-9a-f]{16}$/);
    assert.equal(cfgId(legacy), quadId({ d1: legacy.d1, g: { GDX: incumbents().NL0.quad.g.GDX, VGT: legacy.g }, first: 'D1' }));

    const g = inCell(rng, 'GB1.VD0');

    g[actGene.GDX] = 0;
    g[actGene.VGT] = 0;
    assert.match(cfgId(decode(g, 'coarse')), /^rc1-/);
    g[actGene.VGT] = 1;
    assert.match(cfgId(decode(g, 'coarse')), /^rc2-/);

    const nl0 = project(nl0Quad(), cellOf(legacyCellId), { GDX: {}, VGT: {} }, { GDX: false, VGT: false });

    assert.equal(cfgId(nl0), 'a2e385640ca61012');
    assert.equal(gId(nl0.g), '6b5f909b30cfa516');
  });

  it('inactive genes never change an identity; an active Growth gene does', () => {
    const rng = Rng.from(3, 7);
    let activeChanges = 0;

    for (const cell of allCells)
      for (let i = 0; i < 3; i++) {
        const g = inCell(rng, cell.id);
        const c = decode(g, 'coarse');
        const id = cfgId(c);
        const pinned = pinnedOfCell(cell);
        const active = new Set(activeOrdinal(c));
        const lv = levelsOf('coarse');

        for (let k = nCat; k < nGenes; k++) {
          if (active.has(k)) continue;

          const h = [...g];

          h[k] = (h[k]! + 1) % lv[k]!;
          assert.equal(cfgId(decode(h, 'coarse')), id, `inactive gene ${k} (${pinned.has(k) ? 'pinned' : 'dormant'}) in ${cell.id}`);
        }
        for (const s of ['GDX', 'VGT'] as const)
          if (cell[s].family === 'A') {
            const h = [...g];

            h[actGene[s]] = 1 - h[actGene[s]]!;
            assert.equal(cfgId(decode(h, 'coarse')), id, `an A book's activation is inert (${cell.id})`);
          }

        const gActive = [...active].filter((k) => k >= gNumOffset);
        const k = gActive[rng.int(gActive.length)]!;
        const h = [...g];

        h[k] = (h[k]! + 1) % lv[k]!;
        if (cfgId(decode(h, 'coarse')) !== id) activeChanges++;
      }
    assert.ok(activeChanges >= 180, `an active Growth gene changes the identity (${activeChanges} of 192)`);
  });

  it('a configuration read back from JSON keeps its identity and evaluation key', () => {
    const rng = Rng.from(4, 7);

    for (const cell of allCells) {
      const c = decode(inCell(rng, cell.id, 'fine'), 'fine');
      const back = canonicalCfg(JSON.parse(JSON.stringify(c)) as Cfg);

      assert.equal(cfgId(back), cfgId(c));
      assert.equal(evalKeyOf('D24', back, { enabled: { 'G:GDX': false } }), evalKeyOf('D24', c, { enabled: { 'G:GDX': false } }));
    }
  });

  it('the adaptive bound is repaired to ≥ the book’s hold + 3', () => {
    const rng = Rng.from(5, 7);

    for (let i = 0; i < 50; i++) {
      const g = inCell(rng, 'GD0.VD1');

      g[ctlOffset.GDX + ctlIndex('hx')] = 0; // hx = 6
      g[d1Offset.GDX + 3] = 27; // hold = 30
      const c = decode(g, 'coarse');

      assert.equal(controlValuesOf(c, 'GDX').hx, 33);
    }
  });
});

describe('strata', () => {
  it('every stratum ≥ ⌊n / P⌋ proposals and every factor level within one of the others (n = 512, 192)', () => {
    for (const n of [512, 192])
      for (const cell of allCells) {
        const fs = strataFactors(cell);
        const P = strataCount(cell);
        const seq = strataSequence(cell, n);
        const per = new Map<number, number>();

        for (const t of seq) per.set(t, (per.get(t) ?? 0) + 1);
        assert.equal(seq.length, n);
        for (let t = 0; t < P; t++) assert.ok((per.get(t) ?? 0) >= Math.floor(n / P), `${cell.id} stratum ${t}`);

        let div = 1;

        fs.forEach((f) => {
          const counts = new Array<number>(f.levels).fill(0);

          for (const t of seq) counts[Math.floor(t / div) % f.levels]!++;
          assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `${cell.id} ${f.name} ${counts.join('/')} (n ${n})`);
          div *= f.levels;
        });
      }
  });

  it('a pinned screen position decodes into its cell with its stratum (activation, K, Growth entry and gate)', () => {
    const rng = Rng.from(6, 7);
    const cell = cellOf('GB1.VC1');

    for (let i = 0; i < 64; i++) {
      const c = decode(pinStratum(randomGenome(rng, 'coarse'), cell, i, 64), 'coarse');

      assert.equal(c.cell, cell.id);
      assert.ok(controlValuesOf(c, 'GDX').k !== undefined && controlValuesOf(c, 'VGT').k !== undefined);
    }

    const ents = Array.from({ length: 512 }, (_v, i) => structureOf(decode(pinStratum(randomGenome(rng, 'coarse'), cell, i, 512), 'coarse').g).entry);

    assert.ok(Math.abs(ents.filter((e) => e === 'trend_breakout').length - 512 / 3) <= 2, 'two of six Growth strata are breakout');
  });
});

describe('neighbourhoods and moves', () => {
  it('categorical genes and K stay fixed; every active input moves within its radius; duplicates dropped', () => {
    const rng = Rng.from(7, 7);

    for (const id of ['GA0.VA0', 'GB1.VC0', 'GD1.VD1', 'GC0.VB1']) {
      const c = decode(inCell(rng, id, 'fine'), 'fine');
      const nb = neighbourhood(c, { name: 't', n: 64, labels: ['t', id] });
      const st = JSON.stringify(structureOf(c.g));

      assert.ok(nb.length > 40);
      assert.equal(new Set(nb.map((p) => p.id)).size, nb.length);
      for (const p of nb) {
        assert.equal(p.cfg.cell, c.cell);
        assert.equal(JSON.stringify(structureOf(p.cfg.g)), st);
        for (const s of ['GDX', 'VGT'] as const) {
          assert.equal(entryDayOf(p.cfg, s), entryDayOf(c, s));
          assert.equal(controlValuesOf(p.cfg, s).k, controlValuesOf(c, s).k);
          assert.ok(Math.abs(p.cfg.d1[s].targetPercentChange - c.d1[s].targetPercentChange) <= 10);
        }
        for (const gene of numericGenes) {
          const a = c.g[gene.key];
          const b = p.cfg.g[gene.key];

          // growth140's perturbation: u × 10% of the box, rounded to the fine step (so up to half a step beyond)
          if (typeof a === 'number') assert.ok(Math.abs((b as number) - a) <= 0.1 * (gene.max - gene.min) + fineStepOf(gene) / 2 + 1e-9, gene.key);
        }
      }
    }
  });

  it('refinement moves keep the cell (Track I), switch activations, and switch gates only in Track N', () => {
    const rng = Rng.from(8, 7);
    const c = decode(inCell(rng, 'GB0.VC1', 'fine'), 'fine');
    const m = movesOf(c);
    const mn = movesOf(c, { gateSwitches: true });

    assert.ok(m.length > 60 && m.length <= 230);
    assert.ok(m.every((x) => x.cell === c.cell && cfgId(x) !== cfgId(c)));
    assert.ok(m.some((x) => entryDayOf(x, 'GDX') !== entryDayOf(c, 'GDX')));
    assert.deepEqual([...new Set(mn.map((x) => x.cell))].sort(), ['GB0.VC0', 'GB0.VC1', 'GB1.VC1']);
  });
});

describe('projections and Track N seeds', () => {
  it('every incumbent projects onto every cell', () => {
    const inc = incumbents();

    for (const k of ['NL0', 'IJ1', 'C4', 'C4R'] as const)
      for (const cell of allCells) {
        const c = project(inc[k].quad, cell, { GDX: { d: 120, hx: 30, g: 40, k: 2, r: 500, c: 60 }, VGT: { d: 160, hx: 30, g: 40, k: 3, r: 700, c: 120 } }, { GDX: true, VGT: false });

        assert.equal(cellOfControls(c.controls), cell.id);
        assert.equal(gId(c.g), inc[k].growthVgtId);
      }
  });

  it('16 seeds per lane: each grid level 4 times per book, 8 entry-day seeds per book, 2 focus seeds; genomes decode to the seeds', () => {
    for (const pair of ['GA.VA', 'GB.VD', 'GD.VC'])
      for (let r = 1; r <= 4; r++) {
        const seeds = projectedSeeds(pair, r);

        assert.equal(seeds.length, 16);
        assert.equal(seeds.filter((s) => s.focus).length, 2);
        assert.deepEqual(
          seeds.filter((s) => s.focus).map((s) => [s.incumbent, s.gateState]),
          focusOf(r).map((f) => [f.key, f.gateState])
        );
        for (const s of ['GDX', 'VGT'] as const) {
          for (let l = 0; l < 4; l++) assert.equal(seeds.filter((x) => x.levels[s] === l).length, 4);
          if (pair.includes(s === 'GDX' ? 'GA' : 'VA')) continue;
          assert.equal(seeds.filter((x) => entryDayOf(x.cfg, s)).length, 8);
        }
        for (const x of seeds) {
          assert.equal(cfgId(decode(x.genome!, 'fine')), cfgId(x.cfg));
          for (const s of ['GDX', 'VGT'] as const)
            if (!cellOf(x.cfg.cell)[s].gate)
              assert.equal(x.genome![ctlOffset[s] + ctlIndex('k')], seedGrid.k[x.levels[s]]! - 1, 'the dormant gate K');
        }
      }
  });
});
