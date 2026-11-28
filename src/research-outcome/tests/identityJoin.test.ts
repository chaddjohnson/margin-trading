// research-outcome/identityJoin.ts: the reusable outcome join by (arm, id) — exact, order-independent, fail closed.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IdentityJoinError, hasIdentity, identityKey, joinByIdentity } from '../identityJoin.ts';

interface F {
  arm: string;
  id: string;
  label: string;
}
interface R {
  arm: string;
  id: string;
  label: string;
  kind?: string;
  ok?: boolean;
}

const f = (arm: string, id: string, label = `status of ${id}`): F => ({ arm, id, label });
const r = (arm: string, id: string, label = `candidate ${id}`, kind = 'selected'): R => ({ arm, id, label, kind });

const problemsOf = (fn: () => unknown): readonly string[] => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof IdentityJoinError, `expected an IdentityJoinError, got ${String(e)}`);
    assert.equal(e.name, 'IdentityJoinError');
    return e.problems;
  }
  assert.fail('the join did not fail');
};

describe('joinByIdentity', () => {
  it('matches by (arm, id) only: labels, positions and the other fields are irrelevant', () => {
    const finalists = [
      f('G', 'g1', 'development-qualified, NO chronological support'),
      f('C', 'c1', 'descriptive role holder')
    ];
    const rows = [r('C', 'c1', 'C24/C/pair'), r('D', 'd9'), r('G', 'g1', 'C24/G/refine/x#1 profit')];
    const out = joinByIdentity(finalists, rows);

    assert.deepEqual(
      out.pairs.map((p) => [p.finalist.id, p.row.label]),
      [
        ['g1', 'C24/G/refine/x#1 profit'],
        ['c1', 'C24/C/pair']
      ]
    );
    assert.deepEqual(
      out.unmatchedRows.map((x) => x.id),
      ['d9']
    );
    assert.equal(out.excludedRows, 0);
  });

  it('does not depend on the order of the rows; pairs follow the finalists', () => {
    const finalists = [f('D', 'd1'), f('G', 'g1'), f('J', 'j1')];
    const rows = [r('J', 'j1'), r('D', 'd1'), r('G', 'g1'), r('S', 's1')];
    const a = joinByIdentity(finalists, rows);
    const b = joinByIdentity(finalists, [...rows].reverse());

    assert.deepEqual(
      a.pairs.map((p) => identityKey(p.row)),
      b.pairs.map((p) => identityKey(p.row))
    );
    assert.deepEqual(
      a.pairs.map((p) => p.finalist.id),
      ['d1', 'g1', 'j1']
    );
  });

  it('fails closed on a missing row', () => {
    const p = problemsOf(() => joinByIdentity([f('G', 'g1'), f('D', 'd1')], [r('G', 'g1')]));

    assert.equal(p.length, 1);
    assert.match(p[0]!, /missing validation row for finalist \(arm D, id d1\)/);
  });

  it('fails closed on a duplicate row identity (a row could be consumed twice or the wrong one chosen)', () => {
    const p = problemsOf(() => joinByIdentity([f('G', 'g1')], [r('G', 'g1', 'one'), r('G', 'g1', 'two')]));

    assert.match(p.join('\n'), /duplicate validation identity \(arm G, id g1\): 2 eligible rows/);
  });

  it('fails closed on a duplicate finalist identity (one identity is one finalist with merged roles)', () => {
    const p = problemsOf(() => joinByIdentity([f('C', 'c1', 'primary'), f('C', 'c1', 'role')], [r('C', 'c1')]));

    assert.match(p.join('\n'), /duplicate finalist identity \(arm C, id c1\) at #0, #1/);
    assert.match(p.join('\n'), /would be consumed by more than one finalist/);
  });

  it('fails closed on a cross-arm identity (the id exists only under another arm)', () => {
    const p = problemsOf(() => joinByIdentity([f('G', 'x1')], [r('J', 'x1')]));

    assert.deepEqual(p, [
      'cross-arm identity: finalist (arm G, id x1) has no row under arm G; its id occurs under arm J'
    ]);
  });

  it('fails closed on a conflict reported by the caller and reports every problem at once', () => {
    const p = problemsOf(() =>
      joinByIdentity([f('D', 'd1'), f('G', 'g1'), f('J', 'j1')], [r('D', 'd1', 'A'), r('G', 'g1', 'B')], {
        what: 'test join',
        conflict: (x, y) => (y.label === 'A' ? `label ${y.label} rejected for ${x.id}` : null)
      })
    );

    assert.deepEqual(p, [
      'conflict for (arm D, id d1): label A rejected for d1',
      'missing validation row for finalist (arm J, id j1)'
    ]);
  });

  it('the error message names the join and lists the problems', () => {
    assert.throws(
      () => joinByIdentity([f('D', 'd1')], [], { what: 'P-test outcome' }),
      (e: Error) => {
        assert.ok(e instanceof IdentityJoinError);
        assert.match(e.message, /^P-test outcome: identity join failed \(1 problem\): missing validation row/);
        return true;
      }
    );
  });

  it('rejects invalid identities on either side (empty, missing or non-string arm or id)', () => {
    const bad = [{ arm: 'G', id: '' }, { arm: '', id: 'g' }, { id: 'g' }, { arm: 'G', id: 7 }, null] as unknown as F[];

    for (const x of bad) assert.equal(hasIdentity(x), false);

    const p1 = problemsOf(() => joinByIdentity([bad[0]!], [r('G', 'g1')]));

    assert.match(p1[0]!, /finalist #0 has no valid identity/);

    const p2 = problemsOf(() => joinByIdentity([f('G', 'g1')], [r('G', 'g1'), { arm: 'G', id: '' } as R]));

    assert.match(p2[0]!, /eligible row #1 has no valid identity/);
  });

  it('keys cannot collide through a separator', () => {
    assert.notEqual(identityKey({ arm: 'a|b', id: 'c' }), identityKey({ arm: 'a', id: 'b|c' }));

    const out = joinByIdentity([f('a', 'b|c')], [r('a|b', 'c'), r('a', 'b|c', 'right')]);

    assert.equal(out.pairs[0]!.row.label, 'right');
  });

  it('excluded rows never match and are counted; a finalist whose only row is excluded fails closed', () => {
    const eligible = (x: R) => x.kind === 'selected';
    const out = joinByIdentity([f('D', 'd1')], [r('D', 'd1', 'control twin', 'control'), r('D', 'd1', 'selected')], {
      eligible
    });

    assert.equal(out.pairs[0]!.row.label, 'selected');
    assert.equal(out.excludedRows, 1);

    const p = problemsOf(() => joinByIdentity([f('D', 'd1')], [r('D', 'd1', 'control', 'control')], { eligible }));

    assert.match(p[0]!, /missing validation row/);
  });

  it('an empty finalist list joins nothing and returns every eligible row as unmatched', () => {
    const out = joinByIdentity([], [r('D', 'd1')]);

    assert.equal(out.pairs.length, 0);
    assert.equal(out.unmatchedRows.length, 1);
  });
});
