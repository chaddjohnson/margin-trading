// The frozen baselines through the audit runner on the canonical `all` files (skipped when the local data are absent
// or no longer the pinned files): B4/B5 fixed to the cent, B5 without GDX equal to B4 in every figure, determinism, and
// the stored base records equal to a fresh run. About a minute (one universe load).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { loadAuditUniverse } from '../cli.ts';
import { anchors } from '../context.ts';
import { metricsOf, runSpec } from '../run.ts';
import { allSpecs, baseRun, loadFrozenPools } from '../specs.ts';
import { readFamily } from '../store.ts';

const pinned = async () => {
  try {
    const pins = JSON.parse(await fs.readFile('config/pools/B5.json', 'utf8')).regressionAnchors.dataSha256 as Record<
      string,
      string
    >;

    for (const [symbol, hash] of Object.entries(pins)) {
      const actual = crypto
        .createHash('sha256')
        .update(await fs.readFile(`data/${symbol}/data.csv`))
        .digest('hex');

      if (actual !== hash) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
};

const available = await pinned();

describe(
  'frozen baselines through the audit runner',
  { skip: available ? false : 'the pinned canonical data are absent or changed' },
  async () => {
    const universe = available ? await loadAuditUniverse() : undefined;
    const pools = await loadFrozenPools();
    const cents = (value: number) => Math.round(value * 100) / 100;

    test('B4 and B5 fixed reproduce the anchors to the cent', () => {
      for (const id of ['B4', 'B5'] as const) {
        const spec = baseRun(pools[id], 'fixed');
        const m = metricsOf(runSpec(universe!, spec), spec);

        assert.equal(cents(m.net), anchors[id].net);
        assert.equal(cents(m.minuteDD), anchors[id].minuteDrawdown);
        assert.equal(m.lots, anchors[id].lots);
      }
    });

    test('B5 without GDX is B4 in every figure', () => {
      const { specs } = allSpecs(pools);
      const ablation = specs.find((spec) => spec.key === 'ablation:B5:-GDX:fixed')!;
      const b4 = baseRun(pools.B4, 'fixed');
      const strip = (value: ReturnType<typeof metricsOf>) =>
        JSON.stringify({ ...value, key: '', family: '', pool: '', meta: {}, specHash: '' });

      assert.equal(
        strip(metricsOf(runSpec(universe!, ablation), ablation)),
        strip(metricsOf(runSpec(universe!, b4), b4))
      );
    });

    test('deterministic, and equal to the stored base records', async () => {
      const spec = baseRun(pools.B5, 'fixed');
      const first = metricsOf(runSpec(universe!, spec), spec);
      const second = metricsOf(runSpec(universe!, spec), spec);

      assert.deepEqual(first, second);

      const stored = (await readFamily('base')).get(spec.key);

      if (stored) {
        assert.equal(stored.net, first.net);
        assert.equal(stored.minuteDD, first.minuteDD);
        assert.equal(stored.lotSetHash, first.lotSetHash);
      }
    });
  }
);
