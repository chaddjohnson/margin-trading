// The joint space (PROTOCOL.md §5–§6): decoding, identity, the cell pins, the neighbourhood instrument's determinism and
// scopes, and the refinement moves. No market data is read.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Rng } from '../../optimizer/rng.ts';
import { briefD1, briefG085 } from '../controls.ts';
import {
  type Joint,
  cellOf,
  cells,
  d1Box,
  decode,
  encode,
  jointId,
  levelsOf,
  movesOf,
  neighbourhood,
  normalize,
  pinCell,
  screenGenomes
} from '../space.ts';

const seedJoint = (): Joint =>
  normalize({ d1: briefD1.vg2, g: briefG085, a: { arch: 'B', d1Target: 0.5, gTarget: 1, first: 'D1' } });

describe('decoding and identity', () => {
  test('a fine-grid genome round-trips the control configurations exactly', () => {
    const j = seedJoint();

    assert.equal(jointId(decode(encode(j, 'fine'), 'B', 'fine')), jointId(j));
  });

  test('random coarse genomes decode to valid configurations of their pinned cell', () => {
    const rng = Rng.from('test', 'space');
    const levels = levelsOf('coarse');

    for (let i = 0; i < 200; i++) {
      const cell = cells[i % cells.length]!;
      const j = decode(
        pinCell(
          levels.map((k) => rng.int(k)),
          cell
        ),
        cell.arch,
        'coarse'
      );

      assert.deepEqual(cellOf(j), cell);
      for (const b of d1Box) assert.ok(j.d1[b.key] >= b.min && j.d1[b.key] <= b.max);
    }
  });

  test('the screen is deterministic and pinned to its cell', () => {
    const a = screenGenomes(64, cells[5]!, 'coarse', 'screen', 'test');
    const b = screenGenomes(64, cells[5]!, 'coarse', 'screen', 'test');

    assert.deepEqual(a, b);
    for (const g of a) assert.deepEqual(cellOf(decode(g, cells[5]!.arch, 'coarse')), cells[5]);
  });
});

describe('neighbourhoods', () => {
  test('common random numbers: the same labels give the same neighbours', () => {
    const j = seedJoint();
    const a = neighbourhood(j, { name: 'x', n: 32, labels: ['r1', 'T'] }).map((p) => p.id);
    const b = neighbourhood(j, { name: 'x', n: 32, labels: ['r1', 'T'] }).map((p) => p.id);

    assert.deepEqual(a, b);
    assert.ok(!a.includes(jointId(j)));
    assert.equal(new Set(a).size, a.length);
  });

  test('scopes move only their own family; categorical genes never move', () => {
    const j = seedJoint();

    for (const p of neighbourhood(j, { name: 'd', n: 32, labels: ['d', 'T'], scope: 'd1' })) {
      assert.deepEqual(p.joint.g, j.g);
      assert.deepEqual(p.joint.a, j.a);
    }

    for (const p of neighbourhood(j, { name: 'g', n: 32, labels: ['g', 'T'], scope: 'g' })) {
      assert.deepEqual(p.joint.d1, j.d1);
      assert.equal(p.joint.g.entryMethod, j.g.entryMethod);
      assert.equal(p.joint.g.drawdownRecoveryGateEnabled, j.g.drawdownRecoveryGateEnabled);
    }

    for (const p of neighbourhood(j, { name: 'j', n: 64, labels: ['j', 'T'] })) {
      assert.deepEqual(cellOf(p.joint), cellOf(j));
      assert.equal(p.joint.a.first, j.a.first);
      assert.ok([0.25, 0.5, 0.75, 1].includes(p.joint.a.d1Target));
    }
  });

  test('refinement moves stay valid, distinct, and inside the cell', () => {
    const j = seedJoint();
    const moves = movesOf(j);

    assert.ok(moves.length > 20);
    assert.equal(new Set(moves.map(jointId)).size, moves.length);
    for (const m of moves) assert.deepEqual(cellOf(m), cellOf(j));
  });
});
