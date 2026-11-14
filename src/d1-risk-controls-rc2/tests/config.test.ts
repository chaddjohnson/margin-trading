// RC 2 configuration: RC 1 configurations keep RC 1's canonical form, identity and evaluation key byte for byte (next-
// session activation is the default and is dropped); entry-day activation is versioned (canonical version 2, "rc2-"
// identity, "|rc2:" key), valid only on a protective stop that is ON and only in a version-2 configuration; inactive
// genes stay masked; round trips are exact. No market data is read.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canonicalConfig,
  parseRiskConfig,
  riskEvalKey,
  riskId,
  type RiskConfig
} from '../../d1-risk-controls/config.ts';
import { quadId, type Quad } from '../../vg-d1-growth-joint/space.ts';
import { placeholder } from '../../vg-lifecycle-matched-optimization/config.ts';
import { grid } from '../../d1-risk-controls/tests/scenarios.ts';
import {
  type RiskConfig2,
  canonicalConfig2,
  configErrors2,
  parseRiskConfig2,
  riskEvalKey2,
  riskId2,
  serializeRiskConfig2,
  usesEntryDay
} from '../config.ts';

const quad = (o: Partial<ReturnType<typeof grid>> = {}): Quad => ({
  d1: { GDX: grid(o), VGT: grid({ ...o, maximumHoldDays: 7 }) },
  g: { GDX: placeholder, VGT: placeholder },
  first: 'D1'
});

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;

  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);

  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// a random RC 1 book (every family A–D, the gate on or off)
const randomBook = (r: () => number) => {
  const fam = Math.floor(r() * 4);
  const c: Record<string, unknown> = {};

  if (fam > 0) c.protectiveStop = { mode: 'on', stopDistanceTenths: 30 + Math.floor(r() * 220) };
  if (fam === 2) c.hold = { mode: 'disabled' };
  if (fam === 3) c.hold = { mode: 'adaptive', extendedHoldDays: 10 + Math.floor(r() * 50), progressTenths: 10 + Math.floor(r() * 140) };
  if (r() < 0.5) c.declineGate = { mode: 'on', losses: 1 + Math.floor(r() * 4), recoveryTenths: 100 + Math.floor(r() * 900), maxBlockSessions: 5 + Math.floor(r() * 245) };
  return c;
};

describe('RC 1 configurations are unchanged under RC 2', () => {
  it('300 random RC 1 configurations: canonical form, identity and evaluation key equal RC 1 byte for byte', () => {
    const r = rng(11);

    for (let i = 0; i < 300; i++) {
      const cfg = { version: 1, books: { 'D1:GDX': randomBook(r), 'D1:VGT': randomBook(r) } } as RiskConfig;
      const q = quad();

      assert.deepEqual(canonicalConfig2(cfg), canonicalConfig(cfg));
      assert.equal(riskId2(q, cfg), riskId(q, cfg));
      assert.equal(riskEvalKey2('D24', q, { enabled: { 'G:GDX': false } }, cfg), riskEvalKey('D24', q, { enabled: { 'G:GDX': false } }, cfg));
      assert.deepEqual(parseRiskConfig2(cfg), parseRiskConfig(cfg));
    }
  });

  it('an explicit next-session activation is the default: dropped, version 1, RC 1 identity and key', () => {
    const v2 = {
      version: 2,
      books: { 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80, activation: 'next-session' } } }
    } as RiskConfig2;
    const v1 = { version: 1, books: { 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } } } } as RiskConfig;

    assert.deepEqual(canonicalConfig2(v2), { version: 1, books: { 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } } } });
    assert.equal(riskId2(quad(), v2), riskId(quad(), v1));
    assert.match(riskId2(quad(), v2), /^rc1-/);
    assert.equal(riskEvalKey2('D24', quad(), {}, v2), riskEvalKey('D24', quad(), {}, v1));
    assert.equal(usesEntryDay(v2), false);
  });

  it('legacy forms keep Priority 3’s identity', () => {
    for (const cfg of [null, { version: 2, books: {} }, { version: 2, books: { 'D1:VGT': { protectiveStop: { mode: 'off' } } } }] as (RiskConfig2 | null)[]) {
      assert.equal(canonicalConfig2(cfg), null);
      assert.equal(riskId2(quad(), cfg), quadId(quad()));
    }
  });
});

describe('entry-day activation', () => {
  const ed = (d = 80, extra: Record<string, unknown> = {}): RiskConfig2 =>
    ({
      version: 2,
      books: { 'D1:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: d, activation: 'entry-day' }, ...extra } }
    }) as RiskConfig2;

  it('is versioned: canonical version 2, an rc2 identity distinct from next-session, an |rc2: key', () => {
    const c = canonicalConfig2(ed())!;

    assert.equal(c.version, 2);
    assert.deepEqual(c.books['D1:VGT']!.protectiveStop, { mode: 'on', stopDistanceTenths: 80, activation: 'entry-day' });
    assert.match(riskId2(quad(), ed()), /^rc2-[0-9a-f]{16}$/);
    assert.notEqual(riskId2(quad(), ed()), riskId2(quad(), { version: 1, books: { 'D1:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 } } } }));
    assert.ok(riskEvalKey2('D24', quad(), {}, ed()).endsWith(`|rc2:${JSON.stringify(c)}`));
    assert.equal(usesEntryDay(ed()), true);
  });

  it('is refused on a stop that is OFF, in a version-1 configuration, and with an unknown value', () => {
    assert.ok(configErrors2({ version: 2, books: { 'D1:GDX': { protectiveStop: { mode: 'off', activation: 'entry-day' } } } }).some((e) => e.includes('requires protectiveStop "on"')));
    assert.ok(configErrors2({ version: 1, books: { 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80, activation: 'entry-day' } } } }).some((e) => e.includes('RC 2 property')));
    assert.ok(configErrors2({ version: 2, books: { 'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80, activation: 'same-day' } } } }).some((e) => e.includes('must be "next-session" or "entry-day"')));
    assert.ok(configErrors2({ version: 3, books: {} }).some((e) => e.includes('version must be 1 or 2')));
    // RC 1's own checks still apply
    assert.ok(configErrors2({ version: 2, books: { 'D1:GDX': { hold: { mode: 'disabled' } } } }).some((e) => e.includes('requires protectiveStop "on"')));
    assert.ok(configErrors2({ version: 2, books: { 'G:VGT': {} } }).length > 0);
  });

  it('masks the genes a disabled hold makes inactive (one identity for behaviourally identical configurations)', () => {
    const c = ed(80, { hold: { mode: 'disabled' } });
    const withVgt = (o: Partial<ReturnType<typeof grid>>): Quad => ({ ...quad(), d1: { GDX: grid(), VGT: grid(o) } });

    assert.equal(
      riskId2(withVgt({ maximumHoldDays: 5, intradayLossBuffer: 20 }), c),
      riskId2(withVgt({ maximumHoldDays: 9, intradayLossBuffer: 40 }), c)
    );
    assert.notEqual(riskId2(withVgt({ trailingStopPercentage: 50 }), c), riskId2(withVgt({ trailingStopPercentage: 60 }), c));
    // the other book's hold stays active
    assert.notEqual(
      riskId2({ ...quad(), d1: { GDX: grid({ maximumHoldDays: 5 }), VGT: grid() } }, c),
      riskId2({ ...quad(), d1: { GDX: grid({ maximumHoldDays: 9 }), VGT: grid() } }, c)
    );
  });

  it('round-trips exactly through serialization and parsing', () => {
    const r = rng(5);

    for (let i = 0; i < 200; i++) {
      const books: Record<string, Record<string, unknown>> = { 'D1:GDX': randomBook(r), 'D1:VGT': randomBook(r) };

      for (const b of Object.values(books))
        if ((b.protectiveStop as { mode?: string } | undefined)?.mode === 'on' && r() < 0.6)
          (b.protectiveStop as Record<string, unknown>).activation = r() < 0.5 ? 'entry-day' : 'next-session';

      const cfg = { version: 2, books } as RiskConfig2;
      const text = serializeRiskConfig2(cfg);

      assert.equal(serializeRiskConfig2(parseRiskConfig2(text)), text);
      assert.deepEqual(parseRiskConfig2(text), canonicalConfig2(cfg));
    }
  });
});
