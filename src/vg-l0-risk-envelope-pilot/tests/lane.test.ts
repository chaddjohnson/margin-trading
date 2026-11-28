// E4 stage wiring: the derived lane (screen plausibility and promotion, centre-first rung fits, islands and their
// hypervolume reference, rungs 2–3, refinement, shortlist) runs on SYNTHETIC records under both arms. In each scenario
// every proposal has the same risk shape, so the arm alone decides whether anything is feasible:
//   giveback   DD $38k, PL $10k, BD $10k   → CTRL nothing feasible; EXP feasible and shortlisted
//   principal  DD $30k, PL $26k, BD $10k   → CTRL feasible; EXP nothing feasible (reason PL > limit)
//   banked     DD $30k, PL $10k, BD $26k   → CTRL feasible; EXP nothing feasible (reason BD > limit)
// and every evaluation the lane requests carries `risk: true`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { budgets } from '../../vg-l0-full-joint/budgets.ts';
import { type Cfg, cellOf, cfgId } from '../../vg-l0-full-joint/space.ts';
import { setQuiet as setA3Quiet } from '../../vg-l0-full-joint/context.ts';
import { type ArmKey, arms } from '../context.ts';
import { Lane, type LaneResult } from '../search.ts';
import { rec } from './helpers.ts';

setA3Quiet(true);

const tiny = { ...budgets.study.broad, screen: 24, promote: 6, r1: 4, islands: 1, islandsMax: 1, population: 4, newPerIsland: 8, r2Keep: 2, r2: 4, r3Keep: 2, r3: 4, refineN: 2, shortlist: 2, generations: 4, patience: 2 };
const shapes = {
  giveback: { dd: 38_000, pl: 10_000, bd: 10_000 },
  principal: { dd: 30_000, pl: 26_000, bd: 10_000 },
  banked: { dd: 30_000, pl: 10_000, bd: 26_000 }
} as const;

const run = async (scenario: keyof typeof shapes, armKey: ArmKey) => {
  let items = 0;
  let withoutRisk = 0;
  const lab = {
    evalMany: async (xs: { cfg: Cfg; risk?: boolean }[]) =>
      xs.map((x) => {
        items++;
        if (x.risk !== true) withoutRisk++;

        const id = cfgId(x.cfg);
        const h = parseInt(createHash('sha256').update(id).digest('hex').slice(0, 8), 16);

        return rec({ ...shapes[scenario], net: 50_000 + (h % 50_000), signature: id });
      }),
    store: { write: () => undefined },
    checkpoint: () => undefined
  };
  const key = `T/broad/GA0.VA0/R1`;
  const lane = new Lane(lab as never, { key, seedKey: key, position: key, stage: 'broad', replicate: 1, cutoff: 'T', kind: 'indep', res: 'coarse', cell: cellOf('GA0.VA0') }, tiny, arms[armKey], 1_000_000);

  await lane.base();

  const r: LaneResult = await lane.finish('test');

  return { r, items, withoutRisk };
};

for (const [scenario, feasibleArm] of [
  ['giveback', 'EXP'],
  ['principal', 'CTRL'],
  ['banked', 'CTRL']
] as const)
  test(`stage wiring (${scenario}): only ${feasibleArm} finds feasible proposals; every request carries the envelope`, async () => {
    for (const armKey of ['CTRL', 'EXP'] as const) {
      const { r, items, withoutRisk } = await run(scenario, armKey);
      const feasible = armKey === feasibleArm;

      assert.ok(items > 0);
      assert.equal(withoutRisk, 0, 'every evaluation requests the risk envelope');
      assert.equal(r.failure.screenPlausible > 0, feasible, `${armKey} screen plausibility`);
      assert.equal(r.r3.some((x) => x.feasible), feasible, `${armKey} rung-3 feasibility`);
      assert.equal(r.shortlist.length > 0, feasible, `${armKey} shortlist`);
      assert.equal(r.ledgers.feasible > 0, feasible, `${armKey} feasible rung-1 ledgers`);
      assert.equal(r.islands.some((i) => i.hvTrajectory.some((h) => h > 0)), feasible, `${armKey} hypervolume against (0, the arm's DD limit)`);
      if (!feasible) {
        const reason = Object.keys(r.failure.screenReasons);

        assert.deepEqual(reason, [scenario === 'giveback' ? 'DD > ceiling' : scenario === 'principal' ? 'PL > limit' : 'BD > limit']);
        // refinement of an infeasible lane starts from the least violation (no feasible start exists)
        assert.ok(r.refinements.every((x) => x.path[0]!.violation > 0));
      } else assert.ok(r.refinements.length > 0 && r.refinements.every((x) => x.path[0]!.violation === 0));
    }
  });
