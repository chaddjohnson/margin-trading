// Chronology, doors and fold accounting on synthetic minute CSVs through the real loader (PROTOCOL.md §3.4, §8.1,
// §10): mutating every bar after a fold's cutoff leaves the training door's loaded bars, a vector's training metrics,
// the families, draws and every library and nominee byte-identical, while one mutated bar before the cutoff is
// visible; the evaluation door refuses before the sealed selection, after a triple's selection end before the sealed
// nested selection, and after 2023-12-29; source vectors are capped at their own doors; a lot open at the boundary is
// carried, not reset: mark(cutoff) = the training net, V = mark(end) − mark(cutoff), on the fast path and the engine.
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import fs from 'fs-extra';
import { defaultPartitionConfigText, newYorkOffset, nyseHolidays } from '#lib';

const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'd1-library-study-'));
const dataDir = path.join(scratch, 'data');
const rootDir = path.join(scratch, 'root');

process.env.D1_LIBRARY_STUDY_DATA = dataDir;
process.env.D1_LIBRARY_STUDY_ROOT = rootDir;

const doors = await import('../doors.ts');
const { Fast } = await import('../fast.ts');
const { prepareSymbol, drawPlan, evaluateDraws, selectSymbol } = await import('../library.ts');
const { candidateOf } = await import('../candidates.ts');
const { folds } = await import('../context.ts');
const { writeRecord } = await import('../records.ts');
const { requireFrozen } = await import('../freeze.ts');
const { searchCore } = await import('../search.ts');
const { phaseOf } = await import('../evaluation.ts');
const { executeSpec } = await import('../../d1-standalone-opportunity-audit/run.ts');
const { engineSpec } = await import('../engine.ts');

// synthetic data under real symbol names: the neighbourhood instrument's step patterns exist for the audited symbols
const members = ['GDX', 'VGT'];

// Minute rows 2016-01-04 → 2023-12-29, four bars a session: a drift with periodic 12% dips (so test vectors trade)
// and one extra dip just before fold A's cutoff (so a lot is open across it).
const rows = (symbol: string, mutateFrom?: string, mutateOne?: string) => {
  const lines: string[] = [];
  let price = 100;
  let day = 0;

  for (let time = Date.parse('2016-01-04T00:00:00Z'); time <= Date.parse('2023-12-29T00:00:00Z'); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const weekday = new Date(time).getUTCDay();

    if (weekday === 0 || weekday === 6 || nyseHolidays.has(date)) {
      continue;
    }

    day++;
    price =
      day % 37 === (symbol === 'GDX' ? 5 : 20) || date === '2020-06-24'
        ? price * 0.88
        : price * (1 + (day % 5 === 0 ? -0.004 : 0.003));

    const factor = (mutateFrom && date > mutateFrom) || date === mutateOne ? 1.37 : 1;
    const at = (hour: number, minute: number) => {
      const local =
        Date.parse(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`) / 1000;

      return `"${new Date((local - newYorkOffset(Date.parse(`${date}T16:00:00Z`) / 1000)) * 1000).toISOString().replace('.000', '')}"`;
    };

    for (const [hour, minute, move] of [
      [9, 30, 0],
      [11, 0, -0.01],
      [13, 0, 0.012],
      [15, 59, 0.002]
    ] as const) {
      const p = price * (1 + move) * factor;

      lines.push(`${at(hour, minute)},${p},${p * 1.001},${p * 0.999},${p},1000`);
    }
  }

  return `${lines.join('\n')}\n`;
};

const writeData = async (mutateFrom?: string, mutateOne?: string) => {
  await fs.outputFile(path.join(dataDir, 'partitions.json'), defaultPartitionConfigText);

  for (const symbol of members) {
    await fs.outputFile(path.join(dataDir, symbol, 'data.csv'), rows(symbol, mutateFrom, mutateOne));
  }
};

const grids = [
  {
    targetPercentChange: 100,
    trailingBuyPercentage: 5,
    trailingStopPercentage: 50,
    maximumHoldDays: 10,
    tickWindowSize: 20,
    intradayLossBuffer: 30,
    pullback: 50,
    continuationWindow: 20
  },
  {
    targetPercentChange: 100,
    trailingBuyPercentage: 8,
    trailingStopPercentage: 60,
    maximumHoldDays: 12,
    tickWindowSize: 25,
    intradayLossBuffer: 30,
    pullback: 50,
    continuationWindow: 20
  },
  {
    targetPercentChange: 90,
    trailingBuyPercentage: 5,
    trailingStopPercentage: 45,
    maximumHoldDays: 8,
    tickWindowSize: 30,
    intradayLossBuffer: 20,
    pullback: 40,
    continuationWindow: 30
  },
  {
    targetPercentChange: 110,
    trailingBuyPercentage: 3,
    trailingStopPercentage: 70,
    maximumHoldDays: 15,
    tickWindowSize: 20,
    intradayLossBuffer: 10,
    pullback: 60,
    continuationWindow: 40
  },
  {
    targetPercentChange: 95,
    trailingBuyPercentage: 10,
    trailingStopPercentage: 40,
    maximumHoldDays: 6,
    tickWindowSize: 40,
    intradayLossBuffer: 0,
    pullback: 30,
    continuationWindow: 15
  }
] as never[];

// Everything the training-only stage computes for fold A on the current fixture files.
const trainingSnapshot = async () => {
  const { loaded, door } = await doors.trainingUniverse('A', members);
  const fast = await Fast.create(loaded, 0);
  const items = members.flatMap((symbol) => grids.map((grid) => ({ symbol, grid })));
  const metrics = await fast.standalone(items);
  const candidates = metrics.map((m, index) =>
    candidateOf(
      m,
      { symbol: items[index]!.symbol, provenance: 'new', stage: 'new-sobol', origin: `test:${index}` },
      loaded.universe.dates
    )
  );
  const prepared = members.map((symbol) => prepareSymbol(loaded, symbol, candidates));
  const plans = prepared.map((p) => ({ symbol: p.symbol, plan: drawPlan(fast, folds.A, p) }));
  const { results } = await evaluateDraws(fast, plans);
  const selections = prepared.map((p, index) => selectSymbol(p, 'NEW', plans[index]!.plan, results));

  await fast.close();

  return { door, metrics, selections, json: JSON.stringify({ metrics, selections }), loaded };
};

// a stand-in sealed selection of an earlier fold (the calendar door checks the seal, the fold and its training door)
const sealFold = (fold: 'S18' | 'S19' | 'A' | 'S20') =>
  writeRecord(doors.selectionFile(fold), { stage: 'test-selection', fold, door: { lastDate: folds[fold].cutoff } });

before(async () => {
  await writeData();
});

describe('the calendar door', () => {
  test('fold A’s training door refuses before S18’s and S19’s selections are sealed', async () => {
    await assert.rejects(doors.trainingUniverse('A', members), /calendar door/);
    await sealFold('S18');
    await assert.rejects(doors.trainingUniverse('A', members), /S19/);
    await sealFold('S19');

    const { loaded } = await doors.trainingUniverse('A', members);

    assert.equal(loaded.universe.end, '2020-06-30');
  });

  test('fold B’s training door refuses before fold A’s and S20’s selections; a selection of the wrong fold is refused', async () => {
    await assert.rejects(doors.trainingUniverse('B', members), /calendar door/);
    await writeRecord(doors.selectionFile('S20'), {
      stage: 'test-selection',
      fold: 'S19',
      door: { lastDate: '2020-12-31' }
    });
    await assert.rejects(doors.trainingUniverse('B', members), /not fold S20/);
  });
});

after(async () => {
  await fs.remove(scratch);
});

describe('the training door and the training-only stages', () => {
  test('bars after the cutoff cannot change the loaded bars, the metrics, the families, the libraries or the nominees', async () => {
    const plain = await trainingSnapshot();

    assert.equal(plain.loaded.universe.end, '2020-06-30');
    assert.ok(
      plain.metrics.some((m) => m.trades > 0),
      'the fixture vectors trade'
    );

    await writeData('2020-06-30');

    const mutated = await trainingSnapshot();

    assert.deepEqual(mutated.door.loadedBarsSha256, plain.door.loadedBarsSha256);
    assert.equal(mutated.json, plain.json, 'byte-identical training metrics, families, libraries and nominees');

    await writeData(undefined, '2020-03-10');

    const inside = await trainingSnapshot();

    assert.notDeepEqual(inside.door.loadedBarsSha256, plain.door.loadedBarsSha256, 'a pre-cutoff mutation is visible');
    await writeData();
  });

  test('the new search (Sobol, refinement starts and moves, candidate ids) is byte-identical when bars after the cutoff change', async () => {
    const run = async () => {
      const { loaded } = await doors.trainingUniverse('A', members);
      const fast = await Fast.create(loaded, 0);
      const result = await searchCore('A', loaded, fast);

      await fast.close();

      return JSON.stringify({
        candidates: [...result.candidates.entries()],
        starts: result.starts.map((start) => ({ ...start, current: start.current.key })),
        path: result.path,
        causes: result.causes
      });
    };
    const plain = await run();

    await writeData('2020-06-30');

    const mutated = await run();

    await writeData();
    assert.equal(mutated, plain);
  });

  test('libraries are K-nested and every nominee belongs to its K-library', async () => {
    const { selections } = await trainingSnapshot();

    for (const s of selections) {
      for (const arm of ['A1', 'A2', 'A3'] as const) {
        for (const [k, nominee] of Object.entries(s.arms[arm].nominees)) {
          if (nominee) {
            assert.ok(s.arms[arm].library.slice(0, Number(k)).includes(nominee.key));
          }
        }
      }
    }
  });
});

describe('the evaluation door and the source caps', () => {
  test('refuses after the cutoff before the sealed selection, after T1’s selection end before the nested selection, and after 2023-12-29', async () => {
    await assert.rejects(doors.evaluationUniverse('A', '2021-12-31', members), /sealed/);
    await sealFold('A');
    await fs.remove(doors.selectionFile('S20'));
    await sealFold('S20');

    const opened = await doors.evaluationUniverse('A', '2021-12-31', members);

    assert.equal(opened.loaded.universe.end, '2021-12-31');
    await assert.rejects(doors.evaluationUniverse('A', '2023-12-29', members), /nested selection/);
    await assert.rejects(doors.evaluationUniverse('A', '2024-01-02', members), /2023-12-29/);
  });

  test('the door refuses an archived row beyond its source door and a non-T1 pool in T1’s later window', async () => {
    await writeRecord(doors.nestedSelectionFile('T1'), { stage: 'test-nested', triple: 'T1' });
    await assert.rejects(
      doors.evaluationUniverse('A', '2023-12-29', members, [
        { symbol: 'GDX', key: 'x', provenance: 'archive', pools: ['ARCH'] }
      ]),
      /./
    );
    await assert.rejects(
      doors.evaluationUniverse('A', '2023-12-29', members, [
        { symbol: 'GDX', key: 'x', provenance: 'new', pools: ['ALL'] }
      ]),
      /./
    );
    await fs.remove(doors.nestedSelectionFile('T1'));
  });

  test('the calendar door: B-sel’s window needs T1; a 2023 load needs T2 and S22', async () => {
    await writeRecord(doors.selectionFile('B'), {
      stage: 'test-selection',
      fold: 'B',
      door: { lastDate: '2021-12-31' }
    });
    await assert.rejects(doors.evaluationUniverse('B', '2022-12-30', members), /T1\/SELECTION/);
    await writeRecord(doors.nestedSelectionFile('T1'), { stage: 'test-nested', triple: 'T1' });

    const opened = await doors.evaluationUniverse('B', '2022-12-30', members);

    assert.equal(opened.loaded.universe.end, '2022-12-30');
    await assert.rejects(doors.evaluationUniverse('B', '2023-12-29', members), /T2/);
    await writeRecord(doors.nestedSelectionFile('T2'), { stage: 'test-nested', triple: 'T2' });
    await assert.rejects(doors.evaluationUniverse('B', '2023-12-29', members), /S22/);
    await fs.remove(doors.nestedSelectionFile('T1'));
    await fs.remove(doors.nestedSelectionFile('T2'));
    await fs.remove(doors.selectionFile('B'));
  });

  test('the phases’ prerequisites follow PROTOCOL.md §8.2', () => {
    assert.ok(phaseOf('B-sel').requires.includes(doors.nestedSelectionFile('T1')));
    assert.ok(
      phaseOf('B').requires.includes(doors.nestedSelectionFile('T2')) &&
        phaseOf('B').requires.includes(doors.selectionFile('S22'))
    );
    assert.ok(
      phaseOf('T1-later').requires.includes(doors.nestedSelectionFile('T2')) &&
        phaseOf('T1-later').requires.includes(doors.selectionFile('S22'))
    );
    assert.deepEqual(phaseOf('T1-later').pools, ['NEW', 'NEW-S']);
  });

  test('source vectors: fold-a never after 2021-12-31, final never', () => {
    assert.doesNotThrow(() => doors.sourceCap('fold-a', '2021-12-31'));
    assert.throws(() => doors.sourceCap('fold-a', '2022-01-03'));
    assert.doesNotThrow(() => doors.sourceCap('fold-b', '2023-12-29'));
    assert.throws(() => doors.sourceCap('final', '2020-01-02'));
  });

  test('every stage refuses the test overrides', async () => {
    await assert.rejects(requireFrozen(), /test overrides/);
  });
});

describe('fold accounting at the boundary', () => {
  test('a lot open at the cutoff is carried: mark(cutoff) = training net and V = mark(end) − mark(cutoff), fast = engine', async () => {
    const training = await trainingSnapshot();
    const { loaded } = await doors.evaluationUniverse('A', '2021-12-31', members);
    const boundary = loaded.universe.dates.indexOf('2020-06-30');
    const fast = await Fast.create(loaded, 0);
    let openAcross = 0;

    for (const [index, grid] of grids.entries()) {
      const trainingNet = training.metrics[index]!.net; // GDX
      const [windowed] = await fast.windowed([{ symbol: 'GDX', grid }], [boundary]);
      const markAtCutoff = windowed!.net - windowed!.windowed[0]!.net;

      assert.ok(
        Math.abs(markAtCutoff - trainingNet) < 1e-6,
        `grid ${index}: mark at the cutoff ${markAtCutoff} vs ${trainingNet}`
      );

      const record = executeSpec(
        loaded.universe,
        engineSpec({ key: `t${index}`, subject: 'GDX', books: [{ symbol: 'GDX', grid }], boundaryDate: '2020-06-30' })
      );

      assert.ok(
        Math.abs(record.windowed!.increment - windowed!.windowed[0]!.net) < 1e-6,
        `grid ${index}: engine V = fast V`
      );
      assert.ok(Math.abs(record.view.net - windowed!.net) < 1e-6, `grid ${index}: whole-run net`);
      openAcross += record.windowed!.openAtBoundary;
    }

    await fast.close();
    assert.ok(openAcross > 0, 'at least one fixture vector holds a lot across the cutoff');
  });
});
