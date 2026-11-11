// The pooled-candidate catalog (Priority 6): the five exact identities, rebuilt from the authoritative research records
// (byte-identical to the committed file), with no mixing of the three kinds of D1 books and no disabled rule that a JSON
// import could turn on.
import './repo-cwd.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildCatalog } from '../runner/portfolio-catalog.ts';
import { CATALOG_FILE, catalogText, entrySha256, readCatalog } from '../runner/portfolio-catalog-read.ts';
import type { CandidateEntry } from '../shared/portfolio.ts';
import { REPO } from './portfolio-env.ts';

const catalog = readCatalog(REPO);
const byId = (id: string) => catalog.candidates.find((c) => c.id === id)!;
const grid = (e: CandidateEntry, s: 'VGT' | 'GDX') => Object.values(e.quad.d1[s]).join(',');

describe('pooled-candidate catalog', () => {
  it('is rebuilt byte for byte from the research records (a repeatable build, every identity recomputed)', () => {
    expect(catalogText(buildCatalog(REPO))).toBe(readFileSync(join(REPO, CATALOG_FILE), 'utf8'));
  });

  it('holds exactly the five candidates of the brief, in the brief’s order', () => {
    expect(catalog.candidates.map((c) => [c.order, c.id, c.name])).toEqual([
      [1, 'l0-primary', 'New L0 primary'],
      [2, 'c4-refined', 'C4-refined'],
      [3, 'c4', 'Original C4'],
      [4, 'vgt-d1-g4', 'VGT-only: D1 primary + Growth #4'],
      [5, 'vgt-d1-g085', 'VGT-only: D1 primary + Growth 08500a60']
    ]);
    expect(catalog.note).toMatch(/not a safety ranking/);
    for (const c of catalog.candidates) expect(entrySha256(c)).toBe(c.entrySha256);
  });

  it('carries the exact identities named in the brief', () => {
    expect(byId('l0-primary').identities).toMatchObject({
      study5bCfgId: '67cfdd9b62d1e16f',
      priority3QuadId: 'a2e385640ca61012',
      growthVgt: '6b5f909b30cfa516'
    });
    expect(byId('c4-refined').identities).toMatchObject({
      study5bCfgId: '0f017f0ab9b26f24',
      priority3QuadId: '07443ffaeef41e85',
      alias3B: 'C24/informed-fixed#1 profit',
      vg2Config: 'S8-VG-F24-3'
    });
    expect(byId('c4').identities).toMatchObject({ priority3QuadId: 'f324035d15f69610', growthVgt: '420cd989e4fa7749', vg2Config: 'S8-VG-F24-3' });
    expect(byId('vgt-d1-g4').identities).toMatchObject({ growthVgt: '420cd989e4fa7749', d1Vgt: 'd1-ebc9f639b3', priority2JointId: '04741779be90e639' });
    expect(byId('vgt-d1-g085').identities).toMatchObject({ growthVgt: '08500a60ec56cfae', d1Vgt: 'd1-ebc9f639b3', priority2JointId: 'a8833010dd6f9c30' });
    // C4-refined's Growth is not "#4 with two changes": 17 settings change, the initial stop among them.
    const changed = byId('c4-refined').identities.settingsChangedFromGrowth4!.split(', ');
    expect(changed).toHaveLength(17);
    expect(changed).toContain('initialStopEnabled');
    expect(byId('c4-refined').quad.g.VGT.initialStopEnabled).toBe(false);
  });

  it('never mixes the standalone D1 primary, VG #2’s pair and the L0 primary’s modified books', () => {
    const vg2 = { VGT: '235,9,74,15,78,44,110,55', GDX: '276,1,57,12,243,29,152,12' };
    expect(grid(byId('c4'), 'VGT')).toBe(vg2.VGT);
    expect(grid(byId('c4'), 'GDX')).toBe(vg2.GDX);
    expect(grid(byId('c4-refined'), 'VGT')).toBe(vg2.VGT);
    expect(grid(byId('c4-refined'), 'GDX')).toBe(vg2.GDX);
    expect(grid(byId('l0-primary'), 'VGT')).toBe('237,9,73,15,72,42,103,41');
    expect(grid(byId('l0-primary'), 'GDX')).toBe('277,1,61,13,232,25,152,10');
    for (const id of ['vgt-d1-g4', 'vgt-d1-g085']) {
      expect(grid(byId(id), 'VGT')).toBe('216,3,73,8,74,29,90,60'); // the shipped standalone D1 primary
      expect(byId(id).enabled).toEqual({ 'D1:GDX': false, 'D1:VGT': true, 'G:GDX': false, 'G:VGT': true });
      expect(byId(id).symbols).toEqual(['VGT']);
    }
    for (const id of ['l0-primary', 'c4-refined', 'c4']) {
      expect(byId(id).enabled).toEqual({ 'D1:GDX': true, 'D1:VGT': true, 'G:GDX': false, 'G:VGT': true });
      expect(byId(id).symbols).toEqual(['VGT', 'GDX']);
    }
  });

  it('holds the archived targets of the brief (not typed in: read from the validation records)', () => {
    const t = (id: string) => byId(id).targets;
    expect([t('l0-primary').fullNet, t('l0-primary').fullMinuteDd, t('l0-primary').validationNet]).toEqual([479605.18, 20385.99, 96883.72]);
    expect([t('c4-refined').fullNet, t('c4-refined').fullMinuteDd, t('c4-refined').validationNet]).toEqual([452082.36, 19477.66, 91512.65]);
    expect([t('c4').fullNet, t('c4').fullMinuteDd, t('c4').validationNet]).toEqual([401867.24, 21536.85, 99081.34]);
    expect([t('vgt-d1-g4').fullNet, t('vgt-d1-g4').fullMinuteDd, t('vgt-d1-g4').validationNet]).toEqual([271525.33, 19534.41, 66585.12]);
    expect([t('vgt-d1-g085').fullNet, t('vgt-d1-g085').fullMinuteDd, t('vgt-d1-g085').validationNet]).toEqual([252359.65, 19556.63, 60551.2]);
    expect([t('l0-primary').developmentNet, t('l0-primary').developmentMinuteDd]).toEqual([382721.46, 19459.83]);
    expect([t('c4-refined').developmentNet, t('c4-refined').developmentMinuteDd]).toEqual([360569.71, 17280.74]);
    expect([t('c4').developmentNet, t('c4').developmentMinuteDd]).toEqual([302785.91, 17332.09]);
  });

  it('keeps disabled rules disabled: the executable vectors hold no sentinel, null or non-finite value', () => {
    const walk = (v: unknown, path: string): void => {
      if (v === null) throw new Error(`${path} is null`);
      if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${path} is not finite`);
      if (typeof v === 'string' && /^(__)?(-?Inf|NaN)$/.test(v)) throw new Error(`${path} is a sentinel`);
      if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    for (const c of catalog.candidates) {
      expect(() => walk(c.quad, `${c.id}.quad`)).not.toThrow();
      expect(() => walk(c.enabled, `${c.id}.enabled`)).not.toThrow();
    }
    // 08500a60: the maximum hold is OFF — its days and the loss buffer are absent from the executable vector and shown
    // as inactive engine values (never turned into a rule).
    const g085 = byId('vgt-d1-g085');
    expect(g085.quad.g.VGT.maximumHoldEnabled).toBe(false);
    expect(g085.quad.g.VGT).not.toHaveProperty('maximumHoldDays');
    expect(g085.quad.g.VGT).not.toHaveProperty('intradayLossBufferPercent');
    expect(g085.components.find((c) => c.book === 'G:VGT')!.inactive).toEqual(['intradayLossBufferPercent', 'maximumHoldDays']);
    expect(g085.quad.g.VGT).toMatchObject({ retentionEnabled: true, retentionSellPercent: 50, retentionSmaSessions: 160, retentionClosesBelow: 1 });
    // D1's unused swing fields are NaN in the engine: inactive, never active.
    for (const c of catalog.candidates)
      for (const k of c.components.filter((x) => x.enabled && x.family === 'D1')) expect(k.inactive).toEqual(['swingLookback', 'swingProximity']);
  });

  it('records every source with its sha256, and the parity ledgers', () => {
    for (const c of catalog.candidates) {
      expect(c.sources.length).toBeGreaterThan(3);
      for (const s of c.sources) expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(c.ledgers.length).toBeGreaterThan(0);
    }
    expect(byId('c4').ledgers.map((l) => l.files.lots.path)).toContain('research/vg-d1-growth-joint/results/validation/ledgers/18-lots.csv');
    expect(byId('vgt-d1-g085').ledgers.map((l) => l.files.lots.path)).toEqual([
      'research/vg-d1-growth-joint/results/validation/ledgers/17-lots.csv',
      'research/vgt-d1-growth-joint/results/validation/ledgers/11-lots.csv'
    ]);
  });

  it('refuses an altered entry', () => {
    const text = readFileSync(join(REPO, CATALOG_FILE), 'utf8').replace('"name": "Original C4"', '"name": "Original C4 (edited)"');
    expect(text).toContain('Original C4 (edited)');
    const c = JSON.parse(text) as typeof catalog;
    const e = c.candidates.find((x) => x.id === 'c4')!;
    expect(entrySha256(e)).not.toBe(e.entrySha256);
  });
});
