// Data doors and real-data parity. The development-door tests read ONLY the pinned 2016–2024 byte prefix of
// data/VGT/data.csv (they are skipped where the file is absent, e.g. a data-less worktree). P1 runs the canonical D1
// file, unchanged, on that prefix and requires (a) the engine's session clock to reproduce it trade for trade and
// (b) D1 itself to reproduce its sealed development record (non-regression: research/vgt-d1-refinement baseline).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import fs from 'fs-extra';
import { dataFile, developmentDoor } from '../context.ts';
import { loadDevelopmentSessions, loadValidationSessions } from '../data.ts';
import { doorView } from '../lab.ts';
import { compareWithD1, parityRun, readD1Trades } from '../parity.ts';

const hasData = fs.existsSync(dataFile);

describe('data doors', () => {
  it('the development door refuses bytes that are not the pinned prefix', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-d1-door-'));
    const file = path.join(dir, 'data.csv');

    const line = '"2016-01-04T14:30:00Z",1,1,1,1,1\n';

    await fs.writeFile(file, line.repeat(Math.ceil(developmentDoor.prefixBytes / line.length) + 1));
    await assert.rejects(loadDevelopmentSessions(file), /sha256/);
    await fs.writeFile(file, '"2016-01-04T14:30:00Z",1,1,1,1,1\n');
    await assert.rejects(loadDevelopmentSessions(file), /expected .* bytes/);
    await fs.remove(dir);
  });

  it('the validation door refuses without the sealed selection’s body hash', async () => {
    await assert.rejects(loadValidationSessions({ frozenBodyHash: 'not-the-seal' }), /validation door/);
  });

  it('the development door ends on 2024-12-31 and arms from 2016-02-01', { skip: !hasData }, async () => {
    const loaded = await loadDevelopmentSessions();
    const view = doorView('development', loaded.sessions);

    assert.equal(loaded.sha256, developmentDoor.prefixSha256);
    assert.equal(loaded.lastDate, '2024-12-31');
    assert.equal(loaded.sessions.length, 2264);
    assert.equal(view.sessions[view.window.armFromSession]!.date, '2016-02-01');
    assert.ok(view.ranges.some((r) => r.key === 'DEV') && !view.ranges.some((r) => r.key === 'VAL'));
  });
});

describe('parity P1 and D1 non-regression (development prefix only)', { skip: !hasData }, () => {
  it('the session clock reproduces the canonical D1 file, and D1 reproduces its sealed development record', async () => {
    const loaded = await loadDevelopmentSessions();
    const view = doorView('development', loaded.sessions);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'intraday-d1-p1-'));
    const prefix = path.join(dir, 'prefix.csv');
    const handle = await fs.promises.open(dataFile, 'r');
    const buffer = Buffer.alloc(developmentDoor.prefixBytes);

    await handle.read(buffer, 0, buffer.length, 0);
    await handle.close();
    await fs.writeFile(prefix, buffer);

    for (const fill of ['stop', 'next-open'] as const) {
      const out = path.join(dir, fill);

      await fs.ensureDir(out);
      execFileSync(
        process.execPath,
        [
          '--experimental-transform-types',
          '--disable-warning=ExperimentalWarning',
          'src/app.ts',
          'allIn-trailingBuy-postExitContinuation',
          'VGT',
          '-',
          '-',
          prefix,
          out,
          fill
        ],
        { stdio: 'ignore' }
      );

      const result = parityRun(view.market, view.sessions, fill);
      const trades = readD1Trades(path.join(out, 'trades.csv'));

      assert.deepEqual(compareWithD1(result, view.sessions, trades), []);

      const summary = (await fs.readJson(path.join(out, 'summary.json'))) as {
        netProfit: number;
        minuteMaximumDrawdown: number;
        maximumDrawdown: number;
      };

      assert.equal(result.minuteDrawdown.maximum, summary.minuteMaximumDrawdown);
      assert.equal(result.dailyDrawdown.maximum, summary.maximumDrawdown);

      if (fill === 'stop') {
        // research/vgt-d1-refinement/results/baseline/baseline.json, development segment (17 trades, flat after 2023)
        assert.equal(trades.length, 17);
        assert.equal(Math.round(summary.netProfit * 100) / 100, 137222.97);
        assert.equal(Math.round(summary.minuteMaximumDrawdown * 100) / 100, 19330.69);
        assert.equal(Math.round(summary.maximumDrawdown * 100) / 100, 15611.46);
      }
    }

    await fs.remove(dir);
  });
});
