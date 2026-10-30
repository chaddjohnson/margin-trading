// Study 5 rules that need no market data: the universe guard, the closed final door, sealed records, the grid and the
// deterministic neighbourhood designs, the shortlist's distinct regions, and the research-pool phenotype paths.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import fs from 'fs-extra';
import { frozenGrids, neighbourhood, radius } from '../context.ts';
import { assertUniverse, openDoor, sealBody, verifySealed } from '../data.ts';
import {
  box,
  clipToBox,
  d1Keys,
  distance,
  genomeOfGrid,
  gridOfGenome,
  inBox,
  jointGenomeOf,
  jointGridsOf,
  jointNeighbourhoodOf,
  neighbourhoodOf,
  probesOf,
  quantile,
  sobolGrids
} from '../grid.ts';
import { configKey } from '../track2.ts';
import { shortlistOf, summarize } from '../studyA.ts';

describe('Study 5 universe guard', () => {
  it('accepts VGT/KRE/GDX subsets and refuses XBI, XRT, unknown and duplicate symbols', () => {
    assertUniverse(['VGT', 'KRE', 'GDX']);
    assertUniverse(['GDX']);
    assert.throws(() => assertUniverse(['VGT', 'KRE', 'GDX', 'XRT']), /refused: XRT/);
    assert.throws(() => assertUniverse(['XBI']), /refused: XBI/);
    assert.throws(() => assertUniverse(['VGT', 'VGT']), /universe guard/);
    assert.throws(() => assertUniverse([]), /universe guard/);
    assertUniverse(['VGT', 'XBI', 'XRT', 'KRE', 'GDX'], true);
  });

  it('refuses a restricted door that names XBI or XRT without the five-ETF control', async () => {
    await assert.rejects(openDoor('control', ['VGT', 'KRE', 'GDX'], 'test'), /control door opens only/);
  });
});

describe('Study 5 sealed records', () => {
  it('verifies an untouched body and rejects an edited one', () => {
    const sealed = sealBody({ a: 1, b: [2, 3] });

    assert.equal(verifySealed(sealed), true);
    assert.equal(verifySealed({ ...sealed, a: 2 }), false);
  });

  it('keeps the final door closed without a verified FROZEN_SELECTION.json', async () => {
    const manifest = 'research/study5-gdx-d1-b5-three-etf-2026-10/FROZEN_SELECTION.json';

    if (await fs.pathExists(manifest)) {
      const tmp = path.join(os.tmpdir(), `study5-tamper-${process.pid}.json`);
      const record = (await fs.readJson(manifest)) as Record<string, unknown>;

      await fs.writeJson(tmp, { ...record, studyA: 'tampered' });
      assert.equal(verifySealed((await fs.readJson(tmp)) as Record<string, unknown>), false);
      await fs.remove(tmp);
    } else {
      await assert.rejects(openDoor('final', ['GDX'], 'test'), /final door is closed/);
    }
  });
});

describe('Study 5 grid and designs', () => {
  it('maps the frozen B5 vectors into the box and back', () => {
    for (const grid of Object.values(frozenGrids)) {
      assert.equal(inBox(grid), true);
      assert.deepEqual(gridOfGenome(genomeOfGrid(grid)), grid);
    }
  });

  it('draws unique in-box Sobol screens reproducibly', () => {
    const a = sobolGrids(64, 'test', 'sobol').grids;
    const b = sobolGrids(64, 'test', 'sobol').grids;

    assert.deepEqual(a, b);
    assert.equal(new Set(a.map((grid) => JSON.stringify(grid))).size, 64);
    assert.equal(a.every(inBox), true);
  });

  it('builds deterministic, box-clipped LHS neighbourhoods within the radius', () => {
    const centre = frozenGrids.GDX;
    const a = neighbourhoodOf(centre, neighbourhood.n1, 1, 'test', 'x');
    const b = neighbourhoodOf(centre, neighbourhood.n1, 1, 'test', 'x');
    const c = neighbourhoodOf(centre, neighbourhood.n1, 1, 'test', 'y');

    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
    assert.equal(a.length, 128);

    for (const grid of a) {
      assert.equal(inBox(grid), true);

      for (const key of d1Keys) {
        assert.ok(Math.abs(grid[key] - centre[key]) <= radius[key], `${key} within ±r`);
      }
    }

    // Latin hypercube: every dimension's 128 offsets cover all 128 strata of [−1, 1] (before rounding and clipping).
    const wide = neighbourhoodOf(centre, neighbourhood.n2, 2, 'test', 'x');

    assert.ok(
      wide.some((grid) => Math.abs(grid.continuationWindow - centre.continuationWindow) > radius.continuationWindow)
    );
  });

  it('clips a box corner and keeps probes inside the box', () => {
    const corner = clipToBox({ ...frozenGrids.KRE, targetPercentChange: 400, trailingBuyPercentage: -5 });

    assert.equal(corner.targetPercentChange, box[0]!.max);
    assert.equal(corner.trailingBuyPercentage, box[1]!.min);
    assert.equal(
      probesOf(corner).every((probe) => inBox(probe.grid)),
      true
    );
    assert.ok(probesOf(frozenGrids.VGT).length === 32);
  });

  it('round-trips joint genomes and perturbs every book in a joint neighbourhood', () => {
    const books = { VGT: frozenGrids.VGT, KRE: frozenGrids.KRE, GDX: frozenGrids.GDX };
    const symbols = ['VGT', 'KRE', 'GDX'];

    assert.deepEqual(jointGridsOf(jointGenomeOf(books, symbols), symbols), books);

    const joint = jointNeighbourhoodOf(books, symbols, 32, 1, 'test');

    assert.equal(joint.length, 32);
    assert.ok(
      symbols.every((symbol) =>
        joint.some(
          (point) => configKey({ [symbol]: point[symbol]! }) !== configKey({ [symbol]: books[symbol as 'VGT'] })
        )
      )
    );
  });

  it('computes linear-interpolation quantiles and neighbourhood summaries', () => {
    assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
    assert.equal(quantile([10], 0.9), 10);

    const summary = summarize(
      [
        { dev: 1, val: -1, dd: 10000 },
        { dev: 3, val: 2, dd: 40000 }
      ],
      { dev: 2, val: 0 }
    );

    assert.equal(summary.share35, 0.5);
    assert.equal(summary.centrePercentileDev, 0.5);
    assert.equal(summary.positiveVal, 1);
  });

  it('builds a shortlist of distinct regions only', () => {
    const base = { origin: 't', ddDaily: 0, closed: 10, lots: 10, years: 4, wins: 5, worst: 0, best: 0 };
    const near = { ...frozenGrids.GDX, tickWindowSize: frozenGrids.GDX.tickWindowSize + 1 };
    const far = frozenGrids.KRE;
    const list = shortlistOf([
      { ...base, id: 'a', grid: frozenGrids.GDX, net: 100, dd: 20000 },
      { ...base, id: 'b', grid: near, net: 99, dd: 20000 },
      { ...base, id: 'c', grid: far, net: 98, dd: 20000 }
    ]);

    assert.deepEqual(
      list.map((item) => item.id),
      ['a', 'c']
    );
    assert.ok(distance(frozenGrids.GDX, near) < 0.1);
  });
});
