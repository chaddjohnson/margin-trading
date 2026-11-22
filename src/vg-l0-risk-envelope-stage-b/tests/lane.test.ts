// E4 stage wiring and seed pairing: the pilot's lane (unchanged) driven by Stage B's mixed-arm runLanes on SYNTHETIC
// records. Each scenario gives every proposal the same risk shape, so the arm alone decides feasibility:
//   giveback   DD $38k, PL $10k, BD $10k   → CTRL nothing feasible; EXP30 feasible and shortlisted
//   banked28   DD $30k, PL $10k, BD $28k   → both feasible (P3 admits BD ≤ $30k)
//   banked31   DD $30k, PL $10k, BD $31k   → CTRL feasible; EXP30 nothing feasible (BD > limit)
//   principal  DD $30k, PL $26k, BD $10k   → CTRL feasible; EXP30 nothing feasible (PL > limit)
// Every request carries `risk: true`; both arms of one seed key request the identical screen (the arm never enters a
// seed); the lane results of a lane do not depend on whether it ran alone or together with the other arm (grouping).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { budgets } from '../../vg-l0-full-joint/budgets.ts';
import { type Cfg, cfgId } from '../../vg-l0-full-joint/space.ts';
import { setQuiet as setA3Quiet } from '../../vg-l0-full-joint/context.ts';
import { rec } from '../../vg-l0-risk-envelope-pilot/tests/helpers.ts';
import { type ArmKey, arms, setQuiet } from '../context.ts';
import { runLanes, specOf } from '../stages.ts';

setA3Quiet(true);
setQuiet(true);

const tiny = { ...budgets.study.broad, screen: 24, promote: 6, r1: 4, islands: 1, islandsMax: 2, population: 4, newPerIsland: 8, r2Keep: 2, r2: 4, r3Keep: 2, r3: 4, refineN: 2, shortlist: 2, generations: 4, patience: 2 };
const shapes = {
  giveback: { dd: 38_000, pl: 10_000, bd: 10_000 },
  banked28: { dd: 30_000, pl: 10_000, bd: 28_000 },
  banked31: { dd: 30_000, pl: 10_000, bd: 31_000 },
  principal: { dd: 30_000, pl: 26_000, bd: 10_000 }
} as const;

const fakeLab = (scenario: keyof typeof shapes) => {
  const seen: { tag: string; ids: string[]; risk: boolean[] }[] = [];

  return {
    seen,
    lab: {
      stage: '',
      evalMany: async (xs: { cfg: Cfg; risk?: boolean }[], tag = '') => {
        seen.push({ tag, ids: xs.map((x) => cfgId(x.cfg)), risk: xs.map((x) => x.risk === true) });
        return xs.map((x) => {
          const id = cfgId(x.cfg);
          const h = parseInt(createHash('sha256').update(id).digest('hex').slice(0, 8), 16);

          return rec({ ...shapes[scenario], net: 50_000 + (h % 50_000), signature: id });
        });
      },
      store: { write: () => undefined },
      checkpoint: () => undefined
    }
  };
};

const runPlan = async (scenario: keyof typeof shapes, armKeys: readonly ArmKey[], replicates: readonly number[] = [3]) => {
  const f = fakeLab(scenario);
  const plan = replicates.flatMap((r) => armKeys.map((a) => ({ spec: specOf('C19', 'GA0.VA0', r), arm: arms[a] })));
  const { results } = await runLanes(f.lab as never, plan, tiny, 1_000_000, Number.MAX_SAFE_INTEGER, 0, 'test');

  return { results, seen: f.seen };
};

for (const [scenario, feasible] of [
  ['giveback', { CTRL: false, EXP30: true }],
  ['banked28', { CTRL: true, EXP30: true }],
  ['banked31', { CTRL: true, EXP30: false }],
  ['principal', { CTRL: true, EXP30: false }]
] as const)
  test(`stage wiring (${scenario}): feasibility follows the arm; every request carries the envelope`, async () => {
    const { results, seen } = await runPlan(scenario, ['CTRL', 'EXP30']);

    assert.ok(seen.length > 0);
    assert.ok(seen.every((s) => s.risk.every(Boolean)), 'every evaluation requests the risk envelope');
    for (const { arm, result: r } of results) {
      const ok = feasible[arm];

      assert.equal(r.failure.screenPlausible > 0, ok, `${arm} screen plausibility`);
      assert.equal(r.r3.some((x) => x.feasible), ok, `${arm} rung-3 feasibility`);
      assert.equal(r.shortlist.length > 0, ok, `${arm} shortlist`);
      assert.equal(r.islands.some((i) => i.hvTrajectory.some((h) => h > 0)), ok, `${arm} hypervolume against (0, the arm's DD limit)`);
      if (!ok)
        assert.deepEqual(Object.keys(r.failure.screenReasons), [
          scenario === 'giveback' ? 'DD > ceiling' : scenario === 'principal' ? 'PL > limit' : 'BD > limit'
        ]);
    }
  });

test('seed pairing: both arms of one seed key request the identical screen; the arm never enters a seed', async () => {
  const { seen } = await runPlan('banked28', ['CTRL', 'EXP30']);
  const screens = seen.filter((s) => s.tag.endsWith('screen'));

  assert.equal(screens.length, 2);
  assert.match(screens[0]!.tag, /^(CTRL|EXP30) C19\/broad\/GA0\.VA0\/R3 screen$/);
  assert.deepEqual(screens[0]!.ids, screens[1]!.ids);
  // a different replicate gives a different screen
  const other = await runPlan('banked28', ['CTRL'], [4]);
  const s4 = other.seen.find((s) => s.tag.endsWith('screen'))!;

  assert.notDeepEqual(s4.ids, screens[0]!.ids);
  assert.equal(specOf('C19', 'GA0.VA0', 3).seedKey, 'C19/broad/GA0.VA0/R3');
});

test('grouping invariance: a lane run together with its paired lane and others equals the lane run alone', async () => {
  const alone = await runPlan('banked28', ['EXP30'], [3]);
  const together = await runPlan('banked28', ['CTRL', 'EXP30'], [3, 4]);
  const a = alone.results[0]!.result;
  const t = together.results.find((x) => x.arm === 'EXP30' && x.result.key === 'C19/broad/GA0.VA0/R3')!.result;

  assert.deepEqual(JSON.parse(JSON.stringify(t)), JSON.parse(JSON.stringify(a)));
});
