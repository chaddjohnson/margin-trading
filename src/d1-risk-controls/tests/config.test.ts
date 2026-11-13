// The configuration (SPECIFICATION.md §3): validation at the boundary, canonical form, identity and serialization.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { D1Grid } from '../../vg-d1-growth-joint/books.ts';
import { evalKey } from '../../vg-d1-growth-joint/evaluate.ts';
import { type Quad, quadId } from '../../vg-d1-growth-joint/space.ts';
import { placeholder } from '../../vg-lifecycle-matched-optimization/config.ts';
import {
  type RiskConfig,
  RiskConfigError,
  canonicalConfig,
  configErrors,
  isLegacy,
  parseRiskConfig,
  riskEvalKey,
  riskId,
  serializeRiskConfig,
  validateAgainstGrids,
  validateRiskConfig
} from '../config.ts';

const grid = (hold: number): D1Grid => ({
  targetPercentChange: 237,
  trailingBuyPercentage: 9,
  trailingStopPercentage: 73,
  maximumHoldDays: hold,
  tickWindowSize: 72,
  intradayLossBuffer: 42,
  pullback: 103,
  continuationWindow: 41
});
const quad = (gdxHold = 13, vgtHold = 15): Quad => ({
  d1: { GDX: grid(gdxHold), VGT: grid(vgtHold) },
  g: { GDX: placeholder, VGT: placeholder },
  first: 'D1'
});
// gId validates the Growth configuration: both books carry 5B's registered placeholder vector (1af5b55987a56e2f)
const q0 = quad();

const B = (o: RiskConfig['books']): RiskConfig => ({ version: 1, books: o });

describe('validation', () => {
  it('accepts every family A–D on either book, independently', () => {
    const cfg = B({
      'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 }, hold: { mode: 'disabled' }, declineGate: { mode: 'on', losses: 2, recoveryTenths: 500, maxBlockSessions: 60 } },
      'D1:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: 120 }, hold: { mode: 'adaptive', extendedHoldDays: 30, progressTenths: 50 } }
    });

    assert.deepEqual(configErrors(cfg), []);
    assert.doesNotThrow(() => validateAgainstGrids(cfg, quad().d1));
    assert.deepEqual(configErrors(B({ 'D1:GDX': { hold: { mode: 'adaptive', extendedHoldDays: 30, progressTenths: 50 } } })), []);
  });

  it('refuses an unlimited hold without the protective stop, at parse and at the runner boundary', () => {
    const bad = B({ 'D1:VGT': { hold: { mode: 'disabled' } } });

    assert.ok(configErrors(bad).some((e) => /requires protectiveStop "on"/.test(e)));
    assert.throws(() => parseRiskConfig(JSON.stringify(bad)), RiskConfigError);
    assert.throws(() => validateAgainstGrids(bad, quad().d1), RiskConfigError);
    assert.ok(configErrors(B({ 'D1:VGT': { protectiveStop: { mode: 'off' }, hold: { mode: 'disabled' } } })).length > 0);
  });

  it('refuses wrong units, non-integers, out-of-range values, unknown keys, Growth books and other versions', () => {
    const cases: unknown[] = [
      B({ 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 0 } } }),
      B({ 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 1000 } } }),
      B({ 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 8.5 } } }),
      B({ 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: '80' as never } } }),
      B({ 'D1:GDX': { protectiveStop: { mode: 'on' } as never } }),
      B({ 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80, percent: 8 } as never } }),
      B({ 'D1:GDX': { hold: { mode: 'adaptive', extendedHoldDays: 366, progressTenths: 50 } } }),
      B({ 'D1:GDX': { hold: { mode: 'adaptive', extendedHoldDays: 20, progressTenths: 0 } } }),
      B({ 'D1:GDX': { hold: { mode: 'sessions' } as never } }),
      B({ 'D1:GDX': { declineGate: { mode: 'on', losses: 0, recoveryTenths: 500, maxBlockSessions: 60 } } }),
      B({ 'D1:GDX': { declineGate: { mode: 'on', losses: 2, recoveryTenths: 1001, maxBlockSessions: 60 } } }),
      B({ 'D1:GDX': { declineGate: { mode: 'on', losses: 2, recoveryTenths: 500, maxBlockSessions: Infinity } } }),
      B({ 'D1:GDX': { declineGate: { mode: 'on', losses: 2, recoveryTenths: 500 } as never } }),
      B({ 'D1:GDX': { trailingStop: {} } as never }),
      { version: 1, books: { 'G:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } } } },
      { version: 2, books: {} },
      { version: 1, books: {}, extra: true },
      null,
      []
    ];

    for (const c of cases) assert.ok(configErrors(c).length > 0, JSON.stringify(c));
  });

  it('checks an adaptive hold’s extended bound against the book’s own maximumHoldDays', () => {
    const cfg = B({ 'D1:VGT': { hold: { mode: 'adaptive', extendedHoldDays: 15, progressTenths: 50 } } });

    assert.throws(() => validateAgainstGrids(cfg, quad(13, 15).d1), /must exceed the book's maximumHoldDays 15/);
    assert.doesNotThrow(() => validateAgainstGrids(cfg, quad(13, 14).d1));
  });
});

describe('canonical form, identity and serialization', () => {
  it('treats absent, null, empty and explicit defaults as legacy, with the frozen identity and key unchanged', () => {
    const legacyForms: (RiskConfig | null | undefined)[] = [
      undefined,
      null,
      B({}),
      B({ 'D1:GDX': {}, 'D1:VGT': { protectiveStop: { mode: 'off' }, hold: { mode: 'legacy' }, declineGate: { mode: 'off' } } })
    ];

    for (const c of legacyForms) {
      assert.equal(isLegacy(c), true);
      assert.equal(canonicalConfig(c), null);
      assert.equal(riskId(q0, c), quadId(q0));
      assert.equal(riskEvalKey('D24', q0, {}, c), evalKey('D24', q0, {}));
      assert.equal(serializeRiskConfig(c), 'null');
    }
    assert.equal(parseRiskConfig(undefined), null);
    assert.equal(parseRiskConfig('null'), null);
  });

  it('gives a non-legacy configuration a versioned identity and key, distinct per book and per value', () => {
    const a = B({ 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } } });
    const b = B({ 'D1:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } } });
    const c = B({ 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 81 } } });
    const ids = [a, b, c].map((x) => riskId(q0, x));

    for (const id of ids) assert.match(id, /^rc1-[0-9a-f]{16}$/);
    assert.equal(new Set(ids).size, 3);
    assert.match(riskEvalKey('D24', q0, {}, a), /\|rc1:\{"version":1,"books":\{"D1:GDX":\{"protectiveStop":\{"mode":"on","stopDistanceTenths":80\}\}\}\}$/);
  });

  it('masks the genes a disabled hold makes inactive (hold and loss buffer): behaviourally equal configurations share one identity', () => {
    const cfg = B({ 'D1:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 }, hold: { mode: 'disabled' } } });
    const other = structuredClone(q0);

    other.d1.VGT.maximumHoldDays = 29;
    other.d1.VGT.intradayLossBuffer = 11;
    assert.equal(riskId(q0, cfg), riskId(other, cfg));
    assert.equal(riskEvalKey('D24', q0, {}, cfg), riskEvalKey('D24', other, {}, cfg));
    // the same change under the legacy hold is a different configuration
    const legacyStop = B({ 'D1:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } } });

    assert.notEqual(riskId(q0, legacyStop), riskId(other, legacyStop));
  });

  it('round-trips through JSON exactly (canonical form; key order and defaults do not matter)', () => {
    const cfg = B({
      'D1:VGT': { declineGate: { maxBlockSessions: 60, recoveryTenths: 500, losses: 2, mode: 'on' }, protectiveStop: { stopDistanceTenths: 80, mode: 'on' }, hold: { mode: 'legacy' } },
      'D1:GDX': { hold: { mode: 'adaptive', progressTenths: 50, extendedHoldDays: 30 } }
    } as never);
    const text = serializeRiskConfig(cfg);
    const back = parseRiskConfig(text);

    assert.deepEqual(back, canonicalConfig(cfg));
    assert.equal(serializeRiskConfig(back), text);
    assert.equal(riskId(q0, back), riskId(q0, cfg));
    assert.equal(
      text,
      '{"version":1,"books":{"D1:GDX":{"hold":{"mode":"adaptive","extendedHoldDays":30,"progressTenths":50}},' +
        '"D1:VGT":{"protectiveStop":{"mode":"on","stopDistanceTenths":80},"declineGate":{"mode":"on","losses":2,"recoveryTenths":500,"maxBlockSessions":60}}}}'
    );
  });

  it('validates on parse (a hand-edited file cannot slip an invalid value through)', () => {
    assert.throws(() => parseRiskConfig('{"version":1,"books":{"D1:GDX":{"protectiveStop":{"mode":"on","stopDistanceTenths":-5}}}}'), RiskConfigError);
    assert.throws(() => validateRiskConfig({ version: 1, books: { 'D1:GDX': { declineGate: { mode: 'on', losses: 25, recoveryTenths: 1, maxBlockSessions: 1 } } } }), RiskConfigError);
  });
});
