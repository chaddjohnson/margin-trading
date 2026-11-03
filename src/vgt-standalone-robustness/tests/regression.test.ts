// The standalone on the canonical `all` files (skipped when the local data are absent or not the pinned files): equal
// to the frozen B1 controls and to the stored base records, equal to the existing CLI's ledger at 0 bps, the shadow
// identity inside B4, a real cost scenario that changes the trade path (not only the net), and determinism.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, test } from 'node:test';
import fs from 'fs-extra';
import { loadAuditUniverse } from '../../b4-b5-robustness/cli.ts';
import { recostLot } from '../../b4-b5-robustness/analysis.ts';
import { lotRecordsOf, metricsOf, runSpec } from '../../b4-b5-robustness/run.ts';
import { baseRun } from '../../b4-b5-robustness/specs.ts';
import { cliTradesFile, controlsFile, scenarioById } from '../context.ts';
import { asPriorSpec, loadFrozenPools, loadStandalones, standaloneBaseRun, standaloneScenarioRun } from '../specs.ts';
import { parseCsv, readFamily } from '../store.ts';

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
  'standalone VGT primary on the canonical data',
  { skip: available ? false : 'the pinned canonical data are absent or changed' },
  async () => {
    const universe = available ? await loadAuditUniverse() : undefined;
    const pools = await loadFrozenPools();
    const [s] = await loadStandalones();
    const run = (spec: ReturnType<typeof standaloneBaseRun>) => runSpec(universe!, asPriorSpec(spec));
    const controls = JSON.parse(await fs.readFile(controlsFile, 'utf8'));

    test('fixed and portfolio at 5 bps equal the frozen B1 controls and the stored base records', async () => {
      const stored = await readFamily('s-base');

      for (const mode of ['fixed', 'portfolio'] as const) {
        const spec = standaloneBaseRun(s!, mode);
        const metrics = metricsOf(run(spec), asPriorSpec(spec));
        const control = controls.all.B1[`${mode}-5`].summary;

        assert.equal(metrics.net, control.net);
        assert.equal(metrics.lots, control.lots);
        assert.equal(metrics.minuteDD, control.minuteDrawdown);

        if (mode === 'portfolio') {
          assert.equal(metrics.endEquity, control.endEquity);
          assert.equal(metrics.dailyPercent, control.dailyPercent);
        }

        assert.equal(JSON.stringify(metrics), JSON.stringify(stored.get(spec.key)));
      }
    });

    test('at 0 bps the lots equal the existing standalone CLI ledger', async () => {
      const cli = parseCsv(await fs.readFile(cliTradesFile, 'utf8'));
      const lots = lotRecordsOf(run({ ...standaloneBaseRun(s!, 'fixed'), costBps: 0 }));

      assert.equal(lots.length, cli.length);
      lots.forEach((lot, index) => {
        assert.ok(Math.abs(lot.net - Number(cli[index]!.profit)) < 1e-6);
        assert.equal(lot.exitReason, cli[index]!.reason);
      });
    });

    test('shadow identity: B4’s virtual VGT trades are the standalone’s lots, its funded VGT lots a subset', () => {
      const standalone = lotRecordsOf(run(standaloneBaseRun(s!, 'fixed')));
      const pool = runSpec(universe!, baseRun(pools.B4, 'fixed'));
      const virtual = pool.trades.filter((trade) => trade.symbol === 'VGT');
      const keys = new Set(standalone.map((lot) => `${lot.decisionTime}>${lot.exitTime}`));

      assert.equal(virtual.length, standalone.length);
      virtual.forEach((trade, index) => assert.ok(Math.abs(trade.net - standalone[index]!.net) < 1e-6));
      assert.ok(
        lotRecordsOf(pool)
          .filter((lot) => lot.symbol === 'VGT')
          .every((lot) => keys.has(`${lot.decisionTime}>${lot.exitTime}`))
      );
    });

    test('C1 changes the trade path through the net-profit stop, not only the cost', () => {
      const baseLots = lotRecordsOf(run(standaloneBaseRun(s!, 'fixed')));
      const scenario = scenarioById('C1');
      const c1 = lotRecordsOf(run(standaloneScenarioRun(s!, scenario, 'fixed')));
      const recost = baseLots.reduce((total, lot) => total + recostLot(lot, scenario), 0);
      const actual = c1.reduce((total, lot) => total + lot.net, 0);
      const key = (lot: { decisionTime: number; exitTime: number }) => `${lot.decisionTime}>${lot.exitTime}`;

      assert.notDeepEqual(c1.map(key), baseLots.map(key));
      assert.ok(Math.abs(actual - recost) > 1000);
      c1.forEach((lot) => assert.ok(Math.abs(lot.gross - lot.friction - lot.interest - lot.net) < 0.01));
    });

    test('deterministic', () => {
      const spec = standaloneBaseRun(s!, 'portfolio');

      assert.equal(
        JSON.stringify(metricsOf(run(spec), asPriorSpec(spec))),
        JSON.stringify(metricsOf(run(spec), asPriorSpec(spec)))
      );
    });
  }
);
