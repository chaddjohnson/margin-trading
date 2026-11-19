// Canonical backend-to-app parity of the five pooled candidates (Priority 6) on real data: ONE FULL door, each candidate
// replayed through the bridge (the research engine unchanged), against the archived targets of the brief, every field
// of the archived compact record (incl. the funded-lot ledger signature) and every archived ledger (lots, fills,
// funding decisions, daily marks; 5B development ledgers for 2016–2024). Skipped without data/VGT and data/GDX.
import './repo-cwd.ts';
import { beforeAll, describe, expect, it } from 'vitest';

import { p3 } from '../../../src/vg-d1-growth-diagnostic/context.ts';
import { frozenSelectionFile } from '../../../src/vg-d1-growth-joint/context.ts';
import { type Door, openFullDoor } from '../../../src/vg-d1-growth-joint/data.ts';
import { type ReplayArtifacts, replayCandidate } from '../runner/portfolio-bridge.ts';
import { readCatalog } from '../runner/portfolio-catalog-read.ts';
import { compareLedgers } from '../runner/portfolio-ledgers.ts';
import { compareEvents } from '../shared/contract.ts';
import { validateEvents } from '../shared/validate-events.ts';
import { hasData, REPO } from './portfolio-env.ts';

const BRIEF: Record<string, [number, number, number]> = {
  'l0-primary': [479605.18, 20385.99, 96883.72],
  'c4-refined': [452082.36, 19477.66, 91512.65],
  c4: [401867.24, 21536.85, 99081.34],
  'vgt-d1-g4': [271525.33, 19534.41, 66585.12],
  'vgt-d1-g085': [252359.65, 19556.63, 60551.2]
};
const DEV: Record<string, [number, number]> = {
  'l0-primary': [382721.46, 19459.83],
  'c4-refined': [360569.71, 17280.74],
  c4: [302785.91, 17332.09]
};

describe.skipIf(!hasData)('pooled candidates: canonical parity on real data', () => {
  const catalog = readCatalog(REPO);
  let door: Door;
  const out = new Map<string, ReplayArtifacts>();
  beforeAll(async () => {
    door = await openFullDoor('Strategy Lab parity test (read-only)', { file: frozenSelectionFile, sha256: p3.frozenSelectionSha256 }, true);
    for (const e of catalog.candidates) out.set(e.id, replayCandidate(door, e, `PR-${'0'.repeat(64)}`));
  }, 120_000);

  for (const [id, [net, dd, val]] of Object.entries(BRIEF))
    it(`${id}: the brief's full-history net, minute drawdown and 2025–2026 net, every archived record field`, () => {
      const a = out.get(id)!;
      expect(a.metrics.full.net).toBe(net);
      expect(a.metrics.full.minuteDd.usd).toBe(dd);
      expect(a.metrics.validation.net).toBe(val);
      if (DEV[id]) expect([a.metrics.development.net, a.metrics.development.minuteDd.usd]).toEqual(DEV[id]);
      const failed = a.metrics.parity.checks.filter((c) => !c.pass);
      expect(failed).toEqual([]);
      expect(a.metrics.parity.status).toBe('verified');
    });

  it('every archived ledger matches event for event (entries, partial and final fills, funding, daily marks)', () => {
    for (const e of catalog.candidates) {
      const r = compareLedgers(REPO, e, out.get(e.id)!);
      expect(r.length).toBeGreaterThan(0);
      for (const l of r) expect({ id: e.id, ledger: l.ledger, problems: l.problems }).toEqual({ id: e.id, ledger: l.ledger, problems: [] });
    }
  });

  it('events are contract-valid, chronological, funded only, and reconcile with the ledger and the summary', () => {
    for (const e of catalog.candidates) {
      const a = out.get(e.id)!;
      expect(validateEvents(a.events, `PR-${'0'.repeat(64)}`, e.symbols)).toEqual([]);
      const executed = a.events.filter((x) => x.kind === 'executed_entry' || x.kind === 'executed_exit');
      expect(executed).toHaveLength(a.positions.reduce((n, p) => n + p.fills.length, 0));
      expect([...a.events].sort(compareEvents).map((x) => x.id)).toEqual(
        [...a.events].sort((x, y) => Date.parse(x.t) - Date.parse(y.t) || compareEvents(x, y)).map((x) => x.id)
      );
      // only enabled components, only the candidate's symbols; no shadow (virtual) trade, no GDX Growth
      for (const x of a.events) {
        expect(e.symbols).toContain(x.symbol);
        expect(e.enabled[x.meta!.book as keyof typeof e.enabled]).toBe(true);
      }
      expect(a.events.filter((x) => x.kind === 'rejected_signal').every((x) => x.meta?.refused === true && x.tradeId === null)).toBe(true);
      expect(a.events.filter((x) => x.kind === 'rejected_signal')).toHaveLength(a.metrics.refusals.slotOccupied);
      expect(a.positions.reduce((s, p) => s + p.net, 0)).toBeCloseTo(a.metrics.full.net, 1);
      expect(a.metrics.attribution.reduce((s, x) => s + x.booked, 0)).toBeCloseTo(a.metrics.full.net, 1);
      // one funded slot: positions never overlap in time (the remainder after a partial exit keeps the slot)
      const spans = a.positions.map((p) => [Date.parse(p.fills[0]!.t), p.status === 'open' ? Infinity : Date.parse(p.fills.at(-1)!.t)]);
      for (let i = 1; i < spans.length; i++) expect(spans[i]![0]!).toBeGreaterThanOrEqual(spans[i - 1]![1]!);
      expect(a.metrics.pending).toEqual([]);
    }
  });

  it('08500a60: its real partial exits and final exits, the remainder keeping the slot, the open remainder marked', () => {
    const a = out.get('vgt-d1-g085')!;
    const partials = a.positions.filter((p) => p.partialExits > 0);
    expect(partials.map((p) => [p.id, p.component, p.fills.map((f) => `${f.kind}@${f.t.slice(0, 16)}`)])).toEqual([
      ['P-1', 'Growth', ['entry@2016-07-06T13:31', 'partial@2018-02-06T14:30', 'final@2018-10-12T13:30']],
      ['P-21', 'Growth', ['entry@2023-11-01T13:30', 'partial@2024-04-19T14:19', 'final@2024-08-06T13:30']],
      ['P-26', 'Growth', ['entry@2026-04-13T15:55', 'partial@2026-06-09T15:23']]
    ]);
    const p26 = partials[2]!;
    expect(p26.status).toBe('open');
    expect(p26.fills[1]!.sharesAfter).toBeCloseTo(66.6787, 4);
    expect(p26.fills[1]!.principalAfter).toBe(50_000);
    expect(Math.round(p26.unrealized * 100) / 100).toBe(9376.22);
    expect(Math.round(p26.net * 100) / 100).toBe(19649.76);
    expect(a.metrics.full).toMatchObject({ positions: 26, openPositions: 1, partialExits: 3 });
    // (times above: the archived Priority 2 ledger research/vgt-d1-growth-joint/results/validation/ledgers/11-lots.csv)
    // the partial sale repays half the principal; the next position starts only after the remainder's final exit
    const p1 = partials[0]!;
    expect(p1.fills[1]!.principalRepaid).toBe(50_000);
    const p2 = a.positions[1]!;
    expect(Date.parse(p2.fills[0]!.t)).toBeGreaterThan(Date.parse(p1.fills[2]!.t));
  });

  it('the validation period is a viewport of the continuous run: carry-in and the 2024-12-31 equity', () => {
    for (const e of catalog.candidates) {
      const m = out.get(e.id)!.metrics;
      expect(m.validation.net).toBeCloseTo(m.full.net - m.development.net, 1);
      expect(m.validation.realizedChange + m.validation.unrealizedChange).toBeCloseTo(m.validation.net, 1);
    }
  });
});
