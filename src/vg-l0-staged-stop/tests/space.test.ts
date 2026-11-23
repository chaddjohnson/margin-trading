// The two arms' spaces (space.ts): CTRL is Assignment 3's space itself; EXP's base part reproduces Assignment 3 exactly
// (its neighbourhood rows on every scope and scale, its screen's 92 genes, the identity and key of an all-OFF
// configuration); every decoded, perturbed or moved EXP configuration carries a valid repaired staged stop; screens
// balance the 8 ON/OFF patterns exactly; moves are bounded and include each ON book switched OFF; the restricted
// (informed) space moves only its free genes.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Rng, deriveSeed } from '../../optimizer/rng.ts';
import * as A3 from '../../vg-l0-full-joint/space.ts';
import { bookErrors } from '../../staged-stop/config.ts';
import {
  EXP_GENES,
  actGeneOf,
  baseOf,
  baseRow,
  ctrlSpace,
  expMaxMoves,
  expSpace,
  restrictedSpace,
  stagedOf,
  stagedSlots,
  switchGene,
  t2GeneOf,
  tau1OfCfg,
  toA3
} from '../space.ts';

const rng = (i: number) => new Rng(deriveSeed('vg-l0-staged-stop', 'test', 'space', i));
const randomGenome = (r: Rng, levels: number[]) => levels.map((l) => r.int(l));
const randomExp = (i: number, res: 'coarse' | 'fine' = 'coarse') => {
  const r = rng(i);

  for (;;) {
    try {
      return expSpace.decode(randomGenome(r, expSpace.levelsOf(res)), res);
    } catch {
      // an invalid base genome (Assignment 3's decoder refuses it): draw again
    }
  }
};
const validStaged = (c: ReturnType<typeof randomExp>) => {
  const st = stagedOf(c);
  const t1 = tau1OfCfg(baseOf(c));

  for (const s of stagedSlots) {
    const x = st?.books[s.book];

    if (x) assert.deepEqual(bookErrors(s.book, x, t1[s.book]), [], JSON.stringify(x));
  }
};

describe('CTRL is Assignment 3', () => {
  it('the very functions', () => {
    assert.equal(ctrlSpace.decode, A3.decode);
    assert.equal(ctrlSpace.neighbourhood, A3.neighbourhood);
    assert.equal(ctrlSpace.movesOf, A3.movesOf);
    assert.equal(ctrlSpace.screenGenomes, A3.screenGenomes);
    assert.equal(ctrlSpace.nGenes, 92);
    assert.equal(ctrlSpace.maxMoves, 230);
  });
});

describe('EXP: the base part reproduces Assignment 3', () => {
  it('neighbourhood rows (baseRow + de-duplication) equal Assignment 3’s on every scope and scale', () => {
    for (let i = 0; i < 40; i++) {
      const c = baseOf(randomExp(i, i % 2 ? 'fine' : 'coarse'));

      for (const scope of ['joint', 'd1', 'controls', 'growth'] as const)
        for (const scale of [0.5, 1, 1.5, 3]) {
          const fam = { name: 't', n: 24, labels: ['test', i, scope, scale], scope, scale };
          const want = A3.neighbourhood(c, fam);
          const seen = new Set([A3.cfgId(c)]);
          const got: { id: string; clipped: number }[] = [];

          for (const u of A3.unitsOf(fam.n, fam.labels)) {
            const b = baseRow(c, u, scope, scale);

            if (!b) continue;

            const id = A3.cfgId(b.cfg);

            if (seen.has(id)) continue;
            seen.add(id);
            got.push({ id, clipped: b.clipped });
          }
          assert.deepEqual(
            got,
            want.map((p) => ({ id: p.id, clipped: p.clipped }))
          );
        }
    }
  });

  it('an all-OFF genome decodes to Assignment 3’s configuration (same object shape, identity, key, neighbourhood, moves)', () => {
    for (let i = 0; i < 60; i++) {
      const r = rng(1000 + i);
      const g = randomGenome(r, expSpace.levelsOf('coarse'));

      for (let j = 0; j < 3; j++) g[switchGene(j)] = 0;

      let c;

      try {
        c = expSpace.decode(g, 'coarse');
      } catch {
        continue;
      }
      const a = A3.decode(toA3(g), 'coarse');

      assert.deepEqual(c, a);
      assert.equal('staged' in c, false);
      assert.equal(expSpace.cfgId(c), A3.cfgId(a));
      const fam = { name: 'r1', n: 16, labels: ['r1', 'C19'], scope: 'joint' as const };
      assert.deepEqual(
        expSpace.neighbourhood(c, fam).map((p) => p.id),
        A3.neighbourhood(a, fam).map((p) => p.id)
      );
      assert.deepEqual(
        expSpace.movesOf(c).map((m) => expSpace.cfgId(m)),
        A3.movesOf(a).map((m) => A3.cfgId(m))
      );
    }
  });

  it('the screen’s 92 shared genes are Assignment 3’s screen; the 8 patterns occur equally often', () => {
    const n = 512;
    const exp = expSpace.screenGenomes(n, 'coarse', 'screen', 'C21/broad/GA0.VA0/R3');
    const a3 = A3.screenGenomes(n, 'coarse', 'screen', 'C21/broad/GA0.VA0/R3');
    const counts = new Array(8).fill(0);

    exp.forEach((g, i) => {
      assert.equal(g.length, EXP_GENES);
      assert.deepEqual(toA3(g), a3[i]);
      counts[g[switchGene(0)]! | (g[switchGene(1)]! << 1) | (g[switchGene(2)]! << 2)]++;
    });
    assert.deepEqual(counts, new Array(8).fill(64));
    assert.deepEqual(expSpace.screenGenomes(n, 'coarse', 'screen', 'C21/broad/GA0.VA0/R3'), exp);
    // a filler screen of a size that is not a multiple of 8: every pattern within one of n/8
    const f = expSpace.screenGenomes(37, 'coarse', 'fill', 3, 'x');
    const fc = new Array(8).fill(0);

    for (const g of f) fc[g[switchGene(0)]! | (g[switchGene(1)]! << 1) | (g[switchGene(2)]! << 2)]++;
    assert.ok(fc.every((x) => x === 4 || x === 5));
  });
});

describe('EXP: staged genes', () => {
  it('every decoded configuration carries a valid repaired staged stop; encode → decode round-trips on the fine grid', () => {
    for (let i = 0; i < 300; i++) {
      const c = randomExp(2000 + i, i % 2 ? 'fine' : 'coarse');

      validStaged(c);
      if (i % 2) assert.equal(expSpace.cfgId(expSpace.decode(expSpace.encode(c, 'fine'), 'fine')), expSpace.cfgId(c));
    }
  });

  it('neighbours and moves of ON configurations: valid, distinct from the centre, bounded; OFF moves present', () => {
    let on = 0;

    for (let i = 0; i < 80; i++) {
      const c = randomExp(3000 + i, 'fine');
      const st = stagedOf(c);

      if (!st) continue;
      on++;

      const self = expSpace.cfgId(c);
      const nb = expSpace.neighbourhood(c, { name: 'x', n: 32, labels: ['x', i], scope: 'joint' });

      for (const p of nb) {
        validStaged(p.cfg);
        assert.notEqual(p.id, self);
        assert.equal(Object.keys(stagedOf(p.cfg)!.books).join(), Object.keys(st.books).join()); // switches fixed
      }

      const moves = expSpace.movesOf(c);

      assert.ok(moves.length <= expMaxMoves, `${moves.length}`);
      for (const m of moves) {
        validStaged(m);
        assert.notEqual(expSpace.cfgId(m), self);
      }
      for (const b of Object.keys(st.books))
        assert.ok(
          moves.some((m) => !stagedOf(m)?.books[b as never] && A3.cfgId(baseOf(m)) === A3.cfgId(baseOf(c))),
          `OFF move of ${b}`
        );
    }
    assert.ok(on > 50);
  });

  it('distance: 1 across staged patterns; within a pattern the larger of the base and the staged normalized steps', () => {
    const c = randomExp(4001, 'fine');
    const st = stagedOf(c);

    if (!st) return;

    const b = Object.keys(st.books)[0] as 'D1:GDX';
    const moved = {
      ...c,
      staged: {
        version: 1 as const,
        books: {
          ...st.books,
          [b]: { ...st.books[b]!, activationTenths: Math.min(500, st.books[b]!.activationTenths + 45) }
        }
      }
    };

    assert.equal(expSpace.cfgDistance(c, baseOf(c)), 1);
    assert.ok(
      Math.abs(
        expSpace.cfgDistance(c, moved) -
          Math.abs(moved.staged.books[b]!.activationTenths - st.books[b]!.activationTenths) / 450
      ) < 1e-12
    );
  });
});

describe('the restricted (informed) space', () => {
  it('moves and neighbours change only free genes', () => {
    const c = randomExp(5000, 'fine');
    const free = new Set<number>([
      switchGene(0),
      switchGene(1),
      switchGene(2),
      actGeneOf(0),
      t2GeneOf(0),
      actGeneOf(1),
      t2GeneOf(1),
      actGeneOf(2),
      t2GeneOf(2)
    ]);
    const sp = restrictedSpace(expSpace, baseOf(c), free, 'fine', 'staged only');
    const g0 = expSpace.encode(baseOf(c), 'fine');

    for (const g of sp.screenGenomes(64, 'fine', 'fill', 1))
      for (let i = 0; i < g.length; i++) if (!free.has(i)) assert.equal(g[i], g0[i]);

    const on = expSpace.decode(sp.pinPair(expSpace.screenGenomes(8, 'fine', 'fill', 2)[7]!, '' as never), 'fine');

    for (const m of [...sp.movesOf(on), ...sp.neighbourhood(on, { name: 'n', n: 16, labels: ['n'] }).map((p) => p.cfg)])
      assert.equal(A3.cfgId(baseOf(m)), A3.cfgId(baseOf(c)));
  });
});
