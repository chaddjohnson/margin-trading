// Unit tests of the Study 8 local runner (no market data, no engine run): alias parsing, the default comparison, the
// refusal before the sealed F24 test exists, and the reconciliation's "not applicable" rule.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UsageError, compareAll, parseAlias } from '../aliases.ts';
import { reconcileStudy8 } from '../run.ts';

test('aliases parse to Study 8 kinds and delegate Study 7 names', () => {
  assert.deepEqual(parseAlias('s8-vg-profit'), { kind: 'role', alias: 's8-vg-profit', track: 'VG', role: 'profit' });
  assert.deepEqual(parseAlias('s8-vxrkg-best'), { kind: 'best', alias: 's8-vxrkg-best', track: 'VXRKG' });
  assert.deepEqual(parseAlias('s8-g-3'), { kind: 'member', alias: 's8-g-3', track: 'G', order: 3 });
  assert.deepEqual(parseAlias('s8-v-extra2'), { kind: 'role', alias: 's8-v-extra2', track: 'V', role: 'extra2' });
  assert.deepEqual(parseAlias('vxr-frozen'), {
    kind: 'frozen-subset',
    alias: 'vxr-frozen',
    key: 'VXR',
    id: 'S8R-VXR-frozen'
  });
  assert.deepEqual(parseAlias('b5-frozen'), { kind: 'study7', alias: 'b5-frozen' });
  assert.deepEqual(parseAlias('vg-profit'), { kind: 'study7', alias: 'vg-profit' });

  for (const bad of ['s8-xyz-best', 's8-vg-0', 's8-vg-', 'vg', 's8-vg-worst'])
    assert.throws(() => parseAlias(bad), UsageError);
});

test('compare --all covers the six tracks against B1 and B5', () => {
  assert.deepEqual(compareAll, [
    's8-g-best',
    's8-v-best',
    's8-vg-best',
    's8-vxr-best',
    's8-vxrg-best',
    's8-vxrkg-best',
    'vgt-primary',
    'b5-frozen'
  ]);
});

test('reconciliation is "not applicable" off the sealed convention, never a false PASS', () => {
  const resolved = {
    spec: { alias: 's8-vg-best' },
    pool: { config: { interest: { annualRate: 0.11 }, execution: { stopFill: 'stop', stopSlippageBps: 0 } } },
    study8: { kind: 'best', note: '' },
    sealed: {
      source: 'x',
      net: 1,
      realized: 1,
      unrealized: 0,
      interest: 0,
      costs: 0,
      dd: 0,
      ddDaily: 0,
      lots: 0,
      ledger: [],
      ledgerSealed: true
    }
  } as never;
  const record = { figures: {}, trades: [] } as never;

  assert.equal(reconcileStudy8(resolved, record, { lastSession: '2026-10-28', costBps: 5 }).applicable, false);
  assert.equal(reconcileStudy8(resolved, record, { lastSession: '2026-10-29', costBps: 10 }).applicable, false);
  assert.match(
    String(reconcileStudy8(resolved, record, { lastSession: '2026-10-29', costBps: 10 }).reason),
    /not|this run ends/
  );
});
