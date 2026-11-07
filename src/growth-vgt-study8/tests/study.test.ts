// Growth VGT Study 8–style optimization: unit tests on synthetic data only (no market data is read).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { paramsOf } from '../../../apps/strategy-lab/runner/growth-params.ts';
import { validateParams } from '../../../apps/strategy-lab/shared/params.ts';
import { runRiseTrading, summarizeSimulation, tradingParamErrors } from '../../growth-trading/riseTrading.ts';
import { Rng } from '../../optimizer/rng.ts';
import { control4, numAxes, schedule, structAxes } from '../context.ts';
import { recordOf, requestOf, runConfig } from '../adapter.ts';
import { assignRoles, jaccard, runQualification } from '../qualify.ts';
import { Lab, doorView, withCost } from '../lab.ts';
import { budgetOf, mutate, refinementMoves, runSearch, vary } from '../search.ts';
import { runValidation } from '../validate.ts';
import {
  S,
  activeOf,
  configId,
  control4Effective,
  control4Genome,
  design,
  distance,
  effectiveOf,
  isIntegral,
  lhsGenomes,
  nearBound,
  numIndex,
  screenGenomes,
  spec,
  structureKey,
  structureOf,
  uniquePoints
} from '../space.ts';
import { type TradeRow, boundarySplit, matchWinners, movesOf, tradesOf, underwaterOf } from '../trades.ts';
import { syntheticSessions } from './fixture.ts';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';

const sessions = syntheticSessions();

describe('the conditional genome', () => {
  const genomes = screenGenomes(3000, ['test-screen']);

  test('every screened genome is a valid Growth 1.4.0 configuration the engine accepts', () => {
    for (const g of genomes) {
      const e = effectiveOf(g);

      assert.deepEqual(validateParams(spec, e), []);
      assert.deepEqual(tradingParamErrors(paramsOf(requestOf(e, '2016-01-04', '2016-12-30'))), []);
      assert.equal(e.costBpsPerSide, 5);
    }
  });

  test('every structural level is reached and inactive genes never enter the configuration', () => {
    for (const [d, a] of structAxes.entries())
      for (let v = 0; v < a.levels.length; v++)
        assert.ok(
          genomes.some((g) => g[d] === v),
          `${a.key}=${a.levels[v]}`
        );

    const g = [...genomes[0]!];
    const id = configId(g);
    const inactive = numAxes.map((a) => a.key).filter((k) => !activeOf(g).includes(k));

    for (const k of inactive) g[numIndex[k]] = (g[numIndex[k]]! + 1) % 2;
    assert.equal(configId(g), id, 'a latent gene changed the identity');
  });

  test('the box keeps the registry constraints by construction (S < L, pmin < pmax)', () => {
    for (const g of lhsGenomes(2000, ['test-lhs'])) {
      const e = effectiveOf(g);

      if (e.trendMethod === 'momentum')
        assert.ok((e.trendMomentumShortSessions as number) < (e.trendMomentumLongSessions as number));
      if (e.continuationMethod === 'shallow_pullback')
        assert.ok((e.pullbackMinimumPercent as number) < (e.pullbackMaximumPercent as number));
    }
  });

  test('#4 round-trips exactly (off-grid retracement 45 as a fractional index) and is never on the grid', () => {
    const c = control4Genome();

    assert.deepEqual(effectiveOf(c), control4Effective());
    assert.equal(isIntegral(c), false);
    assert.equal(control4.recoveryRetracementPercent, 45);
    assert.ok(!genomes.some((g) => configId(g) === configId(c)));
  });

  test('distance: 1 across structures, normalized L∞ inside one', () => {
    const a = genomes.find((g) => structureOf(g).entry === 'rise_from_recent_low')!;
    const b = [...a];

    b[numIndex.trailingStopPercent] = a[numIndex.trailingStopPercent] === 0 ? 2 : 0;
    assert.equal(distance(a, b), Math.abs(a[numIndex.trailingStopPercent]! - b[numIndex.trailingStopPercent]!) / 24);

    const c = [...a];

    c[3] = 1 - a[3]!; // gate on/off
    assert.equal(distance(a, c), 1);
  });
});

describe('neighbourhood designs', () => {
  const centre = screenGenomes(64, ['test-nb'])[7]!;

  test('only the active numeric genes move; the structure is fixed; offsets stay within r', () => {
    const active = new Set(activeOf(centre));

    for (const p of design(centre, { name: 'r1', n: 16, labels: ['r1-test'] })) {
      assert.equal(structureKey(structureOf(p.genome)), structureKey(structureOf(centre)));
      for (const a of numAxes) {
        const i = numIndex[a.key];

        if (!active.has(a.key)) assert.equal(p.genome[i], centre[i]);
        else assert.ok(Math.abs(p.genome[i]! - centre[i]!) <= a.radius);
      }
    }
  });

  test('common random numbers: the same labels give the same offsets; uniquePoints drops duplicates', () => {
    const f = { name: 'x', n: 32, labels: ['crn'] };

    assert.deepEqual(design(centre, f), design(centre, f));

    const pts = uniquePoints(design(centre, f), centre);

    assert.equal(new Set(pts.map((p) => configId(p.genome))).size, pts.length);
    assert.ok(!pts.some((p) => configId(p.genome) === configId(centre)));
  });

  test('in-box mode never clips; nearBound flags centres within r of a bound', () => {
    const edge = [...centre];

    edge[numIndex.trailingStopPercent] = 0;
    assert.ok(nearBound(edge).includes('trailingStopPercent'));
    for (const p of design(edge, { name: 'ib', n: 32, labels: ['ib'], mode: 'inbox' }))
      assert.equal(p.clipped.length, 0);
  });
});

describe('GA operators and refinement moves', () => {
  const genomes = screenGenomes(200, ['test-ga']);
  const rng = Rng.from('test-ga-rng');

  test('children are valid configurations; mutation moves at least one gene in most children', () => {
    let changed = 0;

    for (let i = 0; i < 100; i++) {
      const [a, b] = vary(genomes[i]!, genomes[199 - i]!, rng);

      effectiveOf(a!);
      effectiveOf(b!);

      const m = mutate(genomes[i]!, rng);

      if (m.some((x, d) => x !== genomes[i]![d])) changed++;
    }

    assert.ok(changed >= 80, `${changed}`);
  });

  test('refinement moves change exactly one active numeric gene and stay inside the box', () => {
    const g = genomes[3]!;

    for (const m of refinementMoves(g)) {
      const diff = m.map((x, d) => (x !== g[d] ? d : -1)).filter((d) => d >= 0);

      assert.equal(diff.length, 1);
      assert.ok(diff[0]! >= S);
      effectiveOf(m);
    }
  });
});

describe('the adapter', () => {
  test('equals runRiseTrading + summarizeSimulation on the paramsOf mapping, and reconciles', () => {
    for (const g of screenGenomes(12, ['test-adapter'])) {
      const e = effectiveOf(g);
      const out = runConfig(sessions, 'fixture', e);
      const direct = runRiseTrading(
        'VGT',
        sessions,
        0,
        paramsOf(requestOf(e, sessions[0]!.date, sessions.at(-1)!.date)),
        'fixture'
      );
      const s = summarizeSimulation(direct.simulation, direct.ds);

      assert.equal(out.summary.metrics.pnl.totalMarkedNetUsd, s.metrics.pnl.totalMarkedNetUsd);
      assert.equal(out.summary.metrics.drawdown.minute.maximumUsd, s.metrics.drawdown.minute.maximumUsd);
      assert.equal(out.run.simulation.daily.length, sessions.length);
    }
  });

  test('the record follows Study 8’s PointRecord and the cost input is the engine’s', () => {
    const e = effectiveOf(screenGenomes(4, ['test-record'])[2]!);
    const view = doorView('fixture', sessions, 'fixture');
    const r5 = recordOf(runConfig(sessions, 'fixture', e), view.ranges);
    const r20 = recordOf(runConfig(sessions, 'fixture', withCost(e, 20)), view.ranges);

    assert.equal(r5.lots, r5.closed + r5.open);
    assert.equal(r5.wins + r5.losses + r5.breakeven, r5.closed);
    assert.ok(r20.costs >= r5.costs || r20.lots !== r5.lots);
    assert.ok(
      Math.abs(
        Object.entries(r5.periods)
          .filter(([k]) => /^\d{4}(~partial)?$/.test(k))
          .reduce((a, [, v]) => a + v, 0) - r5.net
      ) < 0.05
    );
  });
});

describe('trade evidence', () => {
  const row = (n: number, entry: number, last: number, net: number): TradeRow => ({
    n,
    status: 'closed',
    origin: 'base_growth',
    entrySession: entry,
    lastSession: last,
    entryDate: '',
    exitDate: '',
    entryTimeUtc: `${entry}`,
    exitTimeUtc: `${last}`,
    entryFill: 1,
    exitFill: 1,
    markPrice: null,
    exitReason: 'stop',
    net,
    calendarDaysHeld: 1,
    sessionsHeld: last - entry + 1,
    worstMark: 0,
    bestMark: 0
  });

  test('one-to-one matching: retained, retimed, extra entries, new moves, lost winners, losses', () => {
    const control = [row(1, 10, 30, 5000), row(2, 50, 70, 3000), row(3, 100, 120, 4000), row(4, 140, 150, -2000)];
    const cand = [
      row(1, 11, 31, 5200),
      row(2, 40, 55, 1000),
      row(3, 58, 69, 900),
      row(4, 141, 149, 100),
      row(5, 200, 210, 800),
      row(6, 212, 220, 300)
    ];
    const m = matchWinners(cand, control, { first: 0, last: 300, retainedTolerance: 2 });

    assert.equal(m.retained, 1); // 1↔1
    assert.equal(m.retimed, 1); // 3↔2 (overlap 12 beats 2↔2's 6)
    assert.deepEqual(m.extraEntriesInControlMoves, [2]);
    assert.equal(m.newWinningTrades.length, 3); // 4 (over a control loss), 5, 6
    assert.equal(m.newWinningMoves, 2); // {4} and {5, 6}
    assert.deepEqual(
      m.lostControlWinners.map((l) => l.control),
      [3]
    );
    assert.equal(m.losses.increased, false);
    assert.equal(movesOf(cand).length, 3);
  });

  test('underwater spans', () => {
    const u = underwaterOf([0, 10, 5, 4, 12, 11, 11].map((marked, i) => ({ date: `d${i}`, marked })));

    assert.equal(u.longest.sessions, 2);
    assert.equal(u.sessionsUnderwater, 4);
    assert.equal(u.longest.recovered, true);
  });

  test('the boundary split adds up and the validation drawdown starts at the boundary equity', () => {
    const e = effectiveOf(screenGenomes(32, ['test-split'])[5]!);
    const out = runConfig(sessions, 'fixture', e, { recordMinuteMarks: true });
    const boundary = sessions[300]!.date;
    const s = boundarySplit(out, boundary);
    const total = out.summary.metrics.pnl.totalMarkedNetUsd;

    assert.ok(Math.abs(s.development.net + s.validation.net - total) < 0.02);
    assert.ok(Math.abs(s.validation.realized + s.validation.open - s.validation.net) < 0.02);
    assert.ok(s.validation.minuteDrawdownUsd >= 0);
    if (s.carriedIn)
      assert.ok(Math.abs(s.carriedIn.developmentPart + s.carriedIn.validationPart - s.carriedIn.net) < 0.02);
    assert.equal(tradesOf(out).length, out.summary.rows.length);
  });
});

describe('roles', () => {
  test('roles go only to qualified, distinct candidates; extras need a ledger Jaccard < 0.5', () => {
    const genomes = screenGenomes(8, ['test-roles']);
    const nb = (robust: number, share: number, p90: number) =>
      ({ robustPerYear: robust, share, p90Dd: p90, medianPerYear: robust }) as never;
    const c = (i: number, robust: number, share: number, q: boolean, ledger: string[]) => ({
      id: `c${i}`,
      genome: genomes[i]!,
      pick: 'x',
      describe: '',
      effective: {},
      trainingSelection: nb(robust, share, 10000),
      qualification: { qualified: q, failed: [], marginal: false },
      ledger,
      evidence: { decisive: { nb: nb(robust, share, 10000) } }
    });
    const roles = assignRoles([
      c(0, 30000, 0.95, true, ['a', 'b']),
      c(1, 40000, 0.99, false, ['c']),
      c(2, 20000, 0.99, true, ['a', 'b']),
      c(3, 10000, 0.92, true, ['z'])
    ]);

    assert.equal(roles.find((r) => r.role === 'profit')!.holder!.id, 'c0');
    assert.ok(!roles.some((r) => r.holder?.id === 'c1'));
    assert.equal(jaccard(['a', 'b'], ['a', 'b']), 1);
  });
});

describe('the pipeline on synthetic data (smoke budget)', () => {
  test('search → qualification run end to end and seal their records', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'growth-vgt-study8-test-'));
    const view = doorView('fixture', sessions, 'fixture');
    const lab = new Lab(view);
    const out = path.join(dir, 'search.json');
    const { record } = await runSearch(lab, view, { mode: 'smoke', out });
    const sealed = await fs.readJson(out);

    assert.equal(sealed.bodyHash, record.bodyHash);
    assert.equal(sealed.controlExclusions.controlId, configId(control4Genome()));
    assert.ok(sealed.counts.screen <= budgetOf('smoke').screen);
    assert.ok(sealed.shortlist.length <= budgetOf('smoke').shortlist);

    const q = path.join(dir, 'qualification.json');

    await runQualification(lab, view, out, q);

    const qual = await fs.readJson(q);

    assert.equal(qual.candidates.length, sealed.shortlist.length);
    assert.ok(qual.controls['#4'].evidence.decisive.nb.n > 100);
    assert.equal(schedule.shortlist, 6);

    // the one-time validation stage's code path, on synthetic doors (boundary at session 300)
    const boundary = sessions[299]!.date;
    const loaded = (list: typeof sessions) => ({
      door: 'fixture' as const,
      sessions: list,
      bytes: 0,
      rows: 0,
      sha256: 'fixture',
      firstDate: list[0]!.date,
      lastDate: list.at(-1)!.date,
      splitsApplied: []
    });
    const members = sealed.shortlist as {
      rank: number;
      pick: string;
      id: string;
      genome: number[];
      effective: Record<string, never>;
    }[];
    const frozen = {
      bodyHash: 'fixture',
      ranked: members
        .slice(0, 1)
        .map((m, i) => ({ rank: i + 1, role: 'profit', id: m.id, genome: m.genome, effective: m.effective })),
      shortlist: members.map((m) => ({
        rank: m.rank,
        pick: m.pick,
        id: m.id,
        effective: m.effective,
        qualified: false
      })),
      primary: members[0] ? { id: members[0].id } : null
    };
    const vOut = path.join(dir, 'validation', 'validation.json');
    const { files } = await runValidation(vOut, {
      frozen,
      full: loaded(sessions),
      dev: loaded(sessions.slice(0, 300)),
      lab: new Lab(view),
      boundary
    });
    const v = await fs.readJson(vOut);

    assert.equal(v.results.length, members.length);
    assert.ok(files.length >= 2);
    for (const r of [...v.results, v.control]) {
      assert.equal(r.noLookahead.identical, true, `${r.id}: ${JSON.stringify(r.noLookahead.problems)}`);
      assert.ok(Math.abs(r.split.development.net + r.split.validation.net - r.fullRun.net) < 0.02);
      assert.ok(['pass', 'ambiguous', 'fail'].includes(r.gates.status));
    }
    await fs.remove(dir);
  });
});
