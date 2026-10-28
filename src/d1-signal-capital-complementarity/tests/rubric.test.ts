// The rubric's pure functions against PROTOCOL.md v2.1 §9 (correction amendment C1): a fold replay of any role,
// negative controls included, informs that ETF's label (only the verdict excludes NC); a `pool-path gain (reshuffle)`
// is a positive ΔV@5 failing only the complement test; label qualifiers belong to the complement labels only.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { labelOf, replayFlags } from '../analysisStage.ts';
import type { SymbolSummary } from '../leveld.ts';

const replay = (
  role: string,
  deltas: Record<string, number>,
  own: number,
  extra: Partial<Record<string, number>> = {}
) => ({
  item: {
    id: `B4+U:XOP@A(${role})`,
    baseline: 'B4' as const,
    view: 'U',
    fold: 'A',
    role,
    candidate: 'XOP',
    kind: 'fold'
  },
  summary: {
    costs: Object.entries(deltas).map(([cost, delta]) => ({ cost, baseline: 0, scenario: delta, delta })),
    attribution: {
      delta: deltas['5']!,
      parts: {
        candidateIdleClean: own,
        candidateIdleDisplacing: 0,
        candidateBusyAgainstBaseline: 0,
        incumbentGained: deltas['5']! - own,
        incumbentLostDirect: 0,
        incumbentLostCascade: 0
      },
      complementShare: deltas['5']! > 0 ? own / deltas['5']! : null,
      deltaWithoutLargest: extra.withoutLargest ?? deltas['5']! / 2,
      largestScenarioOnlyShare: deltas['5']! / 2,
      worstOwnLotInWindow: extra.worst ?? -1000,
      firstOrder: { delta: -5000 },
      signAgreement: false,
      byRegime: { G8: deltas['5']! / 2, G9: deltas['5']! / 2 },
      candidateClasses: {}
    },
    risk: { scenarioMinuteDD: 20000, baselineMinuteDD: 18000 },
    portfolio: {
      core: { windowedDailyPercentDrawdown: 0.12 },
      baseline: { windowedDailyPercentDrawdown: 0.13 },
      scenario: { windowedDailyPercentDrawdown: 0.13 }
    }
  }
});

const summary = (over: Partial<SymbolSummary> = {}): SymbolSummary =>
  ({
    symbol: 'XOP',
    member: true,
    decisions: 30,
    all: { net: 10000 },
    idleClean: { count: 3, net: 2000 },
    independentIdleClean: 2,
    independentIdleCleanPositive: 1,
    positiveNetShareCompeting: 0.7,
    ...over
  }) as unknown as SymbolSummary;

describe('the rubric (correction C1)', () => {
  test('a reshuffle gain is a positive ΔV failing only the complement test', () => {
    const material = replayFlags(replay('NC', { 0: 30000, 2: 29000, 5: 28000, 10: 27000 }, -500) as never);

    assert.equal(material.reshuffleGain, true);
    assert.equal(material.C, false);

    // +$496, below the $5,000 materiality floor: not a reshuffle gain (it fails more than the complement test)
    const small = replayFlags(replay('SRC', { 0: 497, 2: 497, 5: 496, 10: 496 }, 0) as never);

    assert.equal(small.reshuffleGain, false);
  });

  test('a negative-control replay informs its ETF label; only the verdict excludes it', () => {
    const flags = replayFlags(replay('NC', { 0: 30000, 2: 29000, 5: 28000, 10: 27000 }, -500) as never);
    const label = labelOf(summary(), 'B4', 'U', [flags], true);

    assert.equal(label.label, 'economically interesting but mostly competing (reshuffle)');
    assert.deepEqual(label.qualifiers, [], 'qualifiers belong to the complement labels only');
  });

  test('Level D labels without a replay keep their qualifiers only when they are complement labels', () => {
    const complement = labelOf(summary({ idleClean: { count: 3, net: 2000 } as never }), 'B4', 'U', [], false);

    assert.equal(complement.label, 'exploratory marginal complement (Level D only)');
    assert.deepEqual(complement.qualifiers, ['thin', 'shock-only']);

    const uneconomic = labelOf(summary({ idleClean: { count: 3, net: -2000 } as never }), 'B4', 'U', [], false);

    assert.equal(uneconomic.label, 'asynchronously timed but uneconomic');
    assert.deepEqual(uneconomic.qualifiers, []);
  });
});
