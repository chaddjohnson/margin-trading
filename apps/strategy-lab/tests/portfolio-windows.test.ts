// Evaluation windows of the pooled candidates (2026-11-27) on real data, through the runner's own path: the shared
// manual-evaluation plan and door (src/manual-eval/execute.ts), the research-window reference and the bridge.
//
// - N/original through 2026-11-25 (a custom continuous window from the first session, so the test stays bounded when the
//   canonical files grow again): the period table equals the command line's committed run
//   (docs/data-updates/2026-11-27/n-original/all-through-2026-11-25/summary.json) field for field; lots 44–46; lot 44's
//   post-validation contribution is not its lifetime net; the run equals the research window decision for decision;
// - "all": ends at the latest common complete session, reaches past the validation end only when data exist after it;
// - a continuous reporting window = the same figures as the corresponding period of the longer run; an isolated window
//   starts flat; another candidate (runLife engine, a VGT-only one) on the extended data;
// - the research window keeps the archived benchmark (identical to the FULL replay of the parity test).
// Skipped without data/VGT and data/GDX (like the parity test).
import './repo-cwd.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { type ManualRunPlan, openPlanDoor, planManualRun, researchPlan } from '../../../src/manual-eval/execute.ts';
import type { Door } from '../../../src/vg-d1-growth-joint/data.ts';
import { type ReplayArtifacts, replayCandidate } from '../runner/portfolio-bridge.ts';
import { readCatalog } from '../runner/portfolio-catalog-read.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { hasData, REPO } from './portfolio-env.ts';

const RID = `PR-${'0'.repeat(64)}`;

describe.skipIf(!hasData)('pooled candidates: evaluation windows on real data', () => {
  const catalog = readCatalog(REPO);
  const entry = (id: string) => catalog.candidates.find((c) => c.id === id)!;
  const research = researchPlan();
  let full: Door;
  const refs = new Map<string, ReturnType<typeof replayCandidate>>();
  const ref = (id: string) => {
    if (!refs.has(id)) refs.set(id, replayCandidate(full, entry(id), RID, { plan: research }));
    const r = refs.get(id)!;
    return { evaluation: r.evaluation, parity: r.metrics.parity };
  };
  const doors = new Map<string, Door>();
  const doorOf = async (p: ManualRunPlan) => {
    const k = `${p.simulation.from}→${p.simulation.to}`;
    if (!doors.has(k)) doors.set(k, await openPlanDoor(p, 'Strategy Lab window test (read-only)'));
    return doors.get(k)!;
  };
  const run = async (id: string, p: ManualRunPlan): Promise<ReplayArtifacts & ReturnType<typeof replayCandidate>> =>
    replayCandidate(await doorOf(p), entry(id), RID, { plan: p, ...(p.simulation.from === '2016-01-04' && p.request.mode !== 'research' ? { reference: ref(id) } : {}) });

  const through1125 = planManualRun({ mode: 'custom', from: '2016-01-04', to: '2026-11-25', execution: 'continuous' }, 'continuous');
  let n1125: Awaited<ReturnType<typeof run>>;

  beforeAll(async () => {
    full = await openPlanDoor(research, 'Strategy Lab window test (read-only)');
    n1125 = await run('n-original', through1125);
  }, 240_000);

  it('N/original through 2026-11-25: the CLI’s committed period table, field for field', () => {
    const cli = JSON.parse(readFileSync(join(REPO, 'docs/data-updates/2026-11-27/n-original/all-through-2026-11-25/summary.json'), 'utf8')) as {
      periods: unknown[];
    };
    expect(n1125.metrics.periods).toEqual(cli.periods);
    const m = n1125.metrics;
    expect([m.full.net, m.full.minuteDd.usd, m.full.positions, m.full.interest, m.full.costs]).toEqual([477002.83, 25794.56, 46, 73232.88, 4875.26]);
    expect([m.validation!.through, m.validation!.net, m.validation!.resetDd.usd]).toEqual(['2026-10-30', 94669.7, 20385.99]);
    expect(m.development!.net).toBe(388031.02);
    expect(m.postValidation).toMatchObject({ after: '2026-10-30', through: '2026-11-25', net: -5697.9, positionsEntered: 2, carriedIn: ['P-44'], interest: 723.29, costs: 244.86 });
    expect(m.postValidation!.resetDd.usd).toBe(25794.56);
    expect(m.window).toMatchObject({
      requested: { mode: 'custom', from: '2016-01-04', to: '2026-11-25', execution: 'continuous' },
      simulation: { from: '2016-01-04', to: '2026-11-25', sessions: 2741 },
      reporting: { from: '2016-01-04', to: '2026-11-25', sessions: 2741 },
      postValidation: true,
      label: 'MANUAL POST-VALIDATION EVALUATION (not an extension of the formal validation dataset)'
    });
    expect(m.parity.status).toBe('not applicable');
    expect(m.trajectory).toMatchObject({ identical: true, researchParity: 'verified', differences: [] });
    expect(m.trajectory!.comparedThrough.slice(0, 10)).toBe('2026-10-30');
    expect(m.reconciliation.lots).toBe(46);
  });

  it('N/original: lots 44–46, and lot 44’s post-validation P&L is not its lifetime net', () => {
    const p = (lot: number) => n1125.positions.find((x) => x.lot === lot)!;
    const l44 = p(44);
    expect([l44.book, l44.fills[0]!.t, l44.fills.at(-1)!.t, l44.exitReason, l44.status]).toEqual(['D1:GDX', '2026-10-23T13:33:00Z', '2026-11-10T16:20:00Z', 'trailing stop', 'closed']);
    expect(l44.net).toBeCloseTo(5483.48, 2); // lifetime (entered 2026-10-23)
    expect(l44.inPeriod!.B).toMatchObject({ carriedIn: true, valueAtStart: -5564.76, valueAtEnd: 5483.48, pnl: 11048.24 });
    expect(l44.inPeriod!.A2).toMatchObject({ carriedIn: false, pnl: -5564.76 });
    const l45 = p(45);
    expect([l45.book, l45.fills[0]!.t, l45.fills.at(-1)!.t, l45.exitReason]).toEqual(['D1:GDX', '2026-11-12T14:33:00Z', '2026-11-20T16:01:00Z', 'protective stop']);
    expect(l45.net).toBeCloseTo(-16225.15, 2);
    const l46 = p(46);
    expect([l46.book, l46.fills[0]!.t, l46.fills.at(-1)!.t, l46.exitReason]).toEqual(['D1:VGT', '2026-11-20T17:07:00Z', '2026-11-25T14:30:00Z', 'trailing stop gap']);
    expect(l46.net).toBeCloseTo(-520.99, 2);
    // the B contributions of the three lots sum to the post-validation net (the pool is flat outside its lots)
    expect([44, 45, 46].reduce((a, l) => a + p(l).inPeriod!.B!.pnl, 0)).toBeCloseTo(n1125.metrics.postValidation!.net, 2);
    // every chart event is contract-valid; the new trades have entry and exit markers
    expect(validateEvents(n1125.events, RID, entry('n-original').symbols)).toEqual([]);
    for (const id of ['GDX:P-45:entry', 'GDX:P-45:exit', 'VGT:P-46:entry', 'VGT:P-46:exit', 'GDX:P-44:exit']) expect(n1125.events.some((e) => e.id === id)).toBe(true);
    // the refused D1·GDX decision of 2026-11-23 (slot held by P-46) is a refused signal, never a fill
    expect(n1125.events.some((e) => e.kind === 'rejected_signal' && e.t.startsWith('2026-11-23') && e.symbol === 'GDX')).toBe(true);
    // the equity series reaches the last session
    expect(n1125.equity.dates.at(-1)).toBe('2026-11-25');
  });

  it('“all” ends at the latest common complete session and equals the bounded run through 2026-11-25', async () => {
    const all = planManualRun({ mode: 'all' }, 'continuous');
    expect(all.simulation.from).toBe('2016-01-04');
    expect(all.simulation.to).toBe(all.reporting.endpoint.date);
    expect(all.simulation.to >= '2026-11-25').toBe(true);
    if (all.simulation.to === '2026-11-25') {
      const a = await run('n-original', all);
      expect(a.metrics.periods).toEqual(n1125.metrics.periods);
      expect(a.positions).toEqual(n1125.positions);
      expect(a.metrics.window.requested).toEqual({ mode: 'all' });
    }
  }, 120_000);

  it('a continuous reporting window reports the corresponding period of the one run (state carried in)', async () => {
    const p = planManualRun({ mode: 'custom', from: '2026-11-02', to: '2026-11-25', execution: 'continuous' }, 'continuous');
    expect(p.simulation.from).toBe('2016-01-04');
    const a = await run('n-original', p);
    const R = a.metrics.periods.find((x) => x.key === 'R')!;
    const B = n1125.metrics.periods.find((x) => x.key === 'B')!;
    expect({ ...R, key: 'B', label: B.label }).toEqual(B);
    expect(a.metrics.window.reporting).toEqual({ from: '2026-11-02', to: '2026-11-25', sessions: 18 });
    expect(a.metrics.window.simulation).toEqual({ from: '2016-01-04', to: '2026-11-25', sessions: 2741 });
    expect(a.positions.find((x) => x.lot === 44)!.inPeriod!.R).toMatchObject({ carriedIn: true, pnl: 11048.24 });
  }, 120_000);

  it('an isolated window starts flat at its first session (a cold start, no state carried in)', async () => {
    const p = planManualRun({ mode: 'custom', from: '2025-01-02', to: '2026-11-25', execution: 'isolated' }, 'continuous');
    expect(p.simulation.from).toBe('2025-01-02');
    const a = await run('n-original', p);
    expect(a.metrics.window.simulation.from).toBe('2025-01-02');
    expect(a.metrics.trajectory).toBeNull();
    expect(a.metrics.parity.status).toBe('not applicable');
    expect(a.metrics.development).toBeNull();
    expect(a.metrics.validation).toBeNull();
    expect(a.positions.every((x) => x.fills[0]!.t >= '2025-01-02')).toBe(true);
    expect(a.metrics.periods.map((x) => x.key)).toEqual(['A', 'B', 'C']);
    expect(a.metrics.periods.find((x) => x.key === 'C')!.lots.carriedIn).toBe(0);
  }, 120_000);

  it('other candidates on the extended data: C4 (runLife engine) and a VGT-only candidate equal their research windows through 2026-10-30', async () => {
    for (const id of ['c4', 'vgt-d1-g085']) {
      const a = await run(id, through1125);
      expect(a.metrics.trajectory).toMatchObject({ identical: true, researchParity: 'verified' });
      expect(a.metrics.window.simulation.to).toBe('2026-11-25');
      expect(a.equity.dates.at(-1)).toBe('2026-11-25');
      // the formal validation figures of the extended run are the archived ones
      expect(a.metrics.validation!.net).toBe(entry(id).targets.validationNet);
      expect(a.metrics.validation!.resetDd.usd).toBe(entry(id).targets.validationResetDd);
      expect(a.metrics.development!.net).toBe(entry(id).targets.developmentNet);
    }
  }, 240_000);

  it('the research window is the archived benchmark (parity verified, no post-validation period)', () => {
    const r = refs.get('n-original')!;
    expect(r.metrics.parity.status).toBe('verified');
    expect(r.metrics.window.simulation).toEqual({ from: '2016-01-04', to: '2026-10-30', sessions: 2723 });
    expect(r.metrics.postValidation).toBeNull();
    expect(r.metrics.periods.map((x) => x.key)).toEqual(['A', 'A1', 'A2', 'C']);
    expect([r.metrics.full.net, r.metrics.full.minuteDd.usd, r.metrics.full.positions]).toEqual([482700.73, 20385.99, 44]);
  });
});
