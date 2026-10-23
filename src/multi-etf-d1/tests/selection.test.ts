// The selection rule on synthetic candidates: feasibility, the D1 gate, the plateau check, the three policies and
// their distinctness, through a fake candidate pool whose probes are generated analytically.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { Metrics } from '../../d1-refinement/evaluate.ts';
import type { IntParams } from '../../d1-refinement/families.ts';
import { protocol } from '../context.ts';
import type { TickerData } from '../data.ts';
import type { Candidate } from '../search.ts';
import { type CandidatePool, feasible, paretoFront, plateauOf, selectOnFold, viewOf } from '../selection.ts';
import { type Genome, d1Id, d1Params, genomeToParams, idOf, paramsToGenome } from '../space.ts';

const label = 'train:final';

const fakeMetrics = (net: number, dd: number, entries: number, signature: string): Metrics =>
  ({
    net,
    gross: net,
    minuteDrawdown: dd,
    dailyDrawdown: dd * 0.9,
    interest: 0,
    entries,
    closedTrades: entries,
    wins: Math.ceil(entries / 2),
    losses: Math.floor(entries / 2),
    openAtEnd: false,
    exposure: 0.2,
    heldDays: 100,
    averageHoldDays: 20,
    bestTrade: net / 2,
    worstTrade: -1000,
    maximumLosingStreak: 1,
    worstEpisodeLoss: -1000,
    worstAdverseExcursion: -2000,
    netWithoutBestTrade: net / 2,
    entriesByKind: { deep: entries, continuation: 0, always: 0, swing: 0 },
    netByKind: { deep: net, continuation: 0, always: 0, swing: 0 },
    signature,
    minuteDrawdownPeak: 0,
    minuteDrawdownTrough: 0,
    stopNeverActiveTrades: 0,
    stopSwitchOffSessions: 0,
    counts: {
      setupActivations: entries,
      overnightOrders: 0,
      bufferedLossExits: 0,
      protectiveStopExits: 0,
      entriesWithoutTrade: 0,
      upgrades: 0,
      continuationWindows: 0,
      continuationExpiries: 0
    },
    exitReasons: {},
    segments: [
      {
        label: 'development',
        startDate: '2017-06-15',
        endDate: '2023-12-29',
        net,
        minuteDrawdown: dd,
        dailyDrawdown: dd * 0.9,
        interest: 0,
        entries,
        exits: entries,
        wins: 0,
        losses: 0,
        heldAtCloseSessions: 0,
        sessions: 1
      },
      {
        label,
        startDate: '2017-06-15',
        endDate: '2023-12-29',
        net,
        minuteDrawdown: dd,
        dailyDrawdown: dd * 0.9,
        interest: 0,
        entries,
        exits: entries,
        wins: 0,
        losses: 0,
        heldAtCloseSessions: 0,
        sessions: 1
      }
    ]
  }) as unknown as Metrics;

// A fake pool: the base candidates are given; probes of a candidate get a net scaled by its `plateauFactor`.
class FakePool implements CandidatePool {
  readonly entries = new Map<string, Candidate>();
  evaluations = 0;

  constructor(private readonly factors: Map<string, number>) {}

  add(params: IntParams, net: number, dd: number, entries: number, signature: string, origin = 'sobol') {
    const id = idOf(params);
    const candidate: Candidate = {
      id,
      genome: paramsToGenome(params),
      params,
      origin,
      foldIndex: 0,
      metrics: fakeMetrics(net, dd, entries, signature)
    };

    this.entries.set(id, candidate);

    return candidate;
  }

  pool(foldIndex: number) {
    return [...this.entries.values()].filter((candidate) => candidate.foldIndex <= foldIndex);
  }

  async evaluate(genomes: Genome[], origin: string, foldIndex: number) {
    return genomes.map((genome) => {
      const params = genomeToParams(genome);
      const id = idOf(params);
      let candidate = this.entries.get(id);

      if (!candidate) {
        // Find the parent: the nearest candidate (L1 distance over the parameters) that has a plateau factor.
        const distance = (other: Candidate) =>
          Object.keys(params).reduce(
            (total, key) =>
              total + Math.abs((params[key as keyof IntParams] ?? 0) - (other.params[key as keyof IntParams] ?? 0)),
            0
          );
        const parent = [...this.entries.values()]
          .filter((other) => this.factors.has(other.id))
          .sort((a, b) => distance(a) - distance(b))[0];
        const factor = parent ? this.factors.get(parent.id)! : 0.5;
        const base = parent ? viewOf(parent.metrics, label) : { net: 1000, minuteDrawdown: 1000, entries: 10 };

        candidate = {
          id,
          genome,
          params,
          origin,
          foldIndex,
          metrics: fakeMetrics(base.net * factor, base.minuteDrawdown, base.entries, `${id}-probe`)
        };
        this.entries.set(id, candidate);
        this.evaluations++;
      }

      return candidate;
    });
  }
}

const data = { ds: { dates: [] }, eligibility: 0, developmentEnd: 0 } as unknown as TickerData;
const fold = { key: 'final' };

describe('selection rule', () => {
  test('feasibility and plateau arithmetic', () => {
    assert.ok(
      feasible(
        {
          net: 1,
          minuteDrawdown: 35000,
          entries: 5,
          dailyDrawdown: 0,
          exits: 0,
          wins: 0,
          losses: 0,
          startDate: '',
          endDate: ''
        },
        5
      )
    );
    assert.ok(
      !feasible(
        {
          net: 1,
          minuteDrawdown: 35001,
          entries: 5,
          dailyDrawdown: 0,
          exits: 0,
          wins: 0,
          losses: 0,
          startDate: '',
          endDate: ''
        },
        5
      )
    );
    assert.ok(
      !feasible(
        {
          net: 1,
          minuteDrawdown: 1,
          entries: 4,
          dailyDrawdown: 0,
          exits: 0,
          wins: 0,
          losses: 0,
          startDate: '',
          endDate: ''
        },
        5
      )
    );

    const view = (net: number, dd = 1000) => ({
      net,
      minuteDrawdown: dd,
      entries: 10,
      dailyDrawdown: 0,
      exits: 0,
      wins: 0,
      losses: 0,
      startDate: '',
      endDate: ''
    });
    const plateau = plateauOf(view(10000), [view(9000), view(8000), view(7500), view(7000)], 5);

    assert.ok(plateau.pass);
    assert.equal(plateau.medianNetShare, 0.775);

    const needle = plateauOf(view(10000), [view(9000), view(1000), view(500), view(0)], 5);

    assert.ok(!needle.pass);

    const infeasibleProbes = plateauOf(view(10000), [view(9000), view(9000, 40000), view(9000, 40000), view(9000)], 5);

    assert.ok(!infeasibleProbes.pass, 'half the probes breach the ceiling');
  });

  test('policies: primary prefers the DD band, maxNet needs a higher distinct net, lowDd a lower distinct DD; needles and D1 excluded', async () => {
    const factors = new Map<string, number>();
    const pool = new FakePool(factors);
    const base = d1Params();

    pool.add(base, 50000, 30000, 12, 'sig-d1', 'd1');
    assert.equal(idOf(base), d1Id());

    const high = { ...base, targetPercentChange: 100 }; // highest plateau net, DD above the preferred band
    const band = { ...base, targetPercentChange: 130 }; // inside the band but below `low`
    const needle = { ...base, targetPercentChange: 160 }; // the highest net of all, but a needle (sets the list floor)
    const low = { ...base, targetPercentChange: 190 }; // highest plateau net inside the band -> primary
    const lower = { ...base, targetPercentChange: 220 }; // lower DD, keeps the net floors -> lowDd
    const worse = { ...base, targetPercentChange: 250 }; // below D1
    const sameSig = { ...base, targetPercentChange: 280 }; // same trades as `band`

    for (const params of [high, band, needle, low, lower, sameSig]) {
      factors.set(idOf(params), params === needle ? 0.1 : 0.9);
    }

    pool.add(high, 125000, 30000, 12, 'sig-high');
    pool.add(band, 100000, 20000, 12, 'sig-band');
    pool.add(needle, 150000, 15000, 12, 'sig-needle');
    pool.add(low, 114000, 12000, 12, 'sig-low');
    pool.add(lower, 113000, 8000, 12, 'sig-lower');
    pool.add(worse, 40000, 10000, 12, 'sig-worse');
    pool.add(sameSig, 99000, 20000, 12, 'sig-band');

    const selection = await selectOnFold('TEST', data, pool, fold, 1, 5);
    const pick = (policy: string) => selection.policies.find((entry) => entry.policy === policy)!.pick;

    assert.equal(pick('primary')!.id, idOf(low), 'primary: the highest plateau net inside the preferred band');
    assert.equal(pick('maxNet')!.id, idOf(high), 'maxNet: the higher-net plateau candidate above the band');
    assert.equal(pick('lowDd')!.id, idOf(lower), 'lowDd: the lower-DD plateau candidate keeping both net floors');
    assert.equal(selection.beatingD1, 6);
    assert.ok(selection.probed.every((entry) => entry.id !== d1Id()));
    assert.ok(selection.probed.some((entry) => entry.id === idOf(needle) && !entry.plateau.pass));
    assert.equal(selection.policies.find((entry) => entry.policy === 'primary')!.pick!.plateau.medianNetShare, 0.9);
  });

  test('no feasible candidate beating D1 gives no nominations', async () => {
    const pool = new FakePool(new Map());
    const base = d1Params();

    pool.add(base, 50000, 30000, 12, 'sig-d1', 'd1');
    pool.add({ ...base, targetPercentChange: 150 }, 80000, 36000, 12, 'a'); // breaches the ceiling
    pool.add({ ...base, targetPercentChange: 160 }, 40000, 10000, 12, 'b'); // below D1
    pool.add({ ...base, targetPercentChange: 170 }, 90000, 10000, 3, 'c'); // too few entries

    const selection = await selectOnFold('TEST', data, pool, fold, 1, 5);

    assert.ok(selection.policies.every((entry) => entry.pick === undefined));
    assert.equal(selection.feasible, 1);
    assert.equal(selection.beatingD1, 0);
  });

  test('the Pareto front keeps distinct non-dominated feasible candidates and excludes D1', () => {
    const pool = new FakePool(new Map());
    const base = d1Params();

    pool.add(base, 50000, 30000, 12, 'sig-d1', 'd1');
    pool.add({ ...base, targetPercentChange: 150 }, 120000, 30000, 12, 'a');
    pool.add({ ...base, targetPercentChange: 160 }, 100000, 20000, 12, 'b');
    pool.add({ ...base, targetPercentChange: 170 }, 90000, 25000, 12, 'c'); // dominated by b
    pool.add({ ...base, targetPercentChange: 180 }, 130000, 40000, 12, 'd'); // infeasible
    pool.add({ ...base, targetPercentChange: 190 }, 100000, 20000, 12, 'b'); // duplicate signature

    const front = paretoFront([...pool.entries.values()]);

    assert.deepEqual(
      front.map((candidate) => candidate.metrics.signature),
      ['a', 'b']
    );
    assert.ok(protocol.drawdownCeiling === 35000);
  });
});
