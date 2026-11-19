// The pooled-candidate catalog (Priority 6, docs/strategy-lab/POOLED_CANDIDATES.md): the five frozen portfolio
// candidates Strategy Lab can replay and display. Nothing here is typed from a screenshot or a summary: every vector,
// identity, target and ledger path is READ from the authoritative research records below, and every identity is
// recomputed with the engine's own hash functions (Growth configId, Priority 3 quadId, 5B cfgId, Priority 2 jointId).
// A record that disagrees fails the build. `scripts/build-candidate-catalog.ts` writes the result to
// catalog/pooled-candidates.json; tests/portfolio-catalog.test.ts rebuilds it and requires byte equality.
//
// Serialized non-finite values are decoded deliberately: the sealed records write NaN/±Infinity as "__NaN"/"__Inf"/
// "__-Inf" (src/growth140-vgt-s8m/store.ts `decode`); an engine field that is NaN means "inactive" (an OFF rule's
// value, D1's unused swing fields). The catalog's EXECUTABLE part (`quad`, `enabled`) holds only finite numbers,
// booleans and strings: Growth effective configurations omit inactive values, so a disabled rule can never become an
// active one on import. The DISPLAY copies of the engine parameters write an inactive value as null and list it under
// `inactive`; the runner never reads them.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { decode } from '../../../src/growth140-vgt-s8m/store.ts';
import { type BookId, type D1Grid, d1Keys, d1StrategyParams, growthParamsOf } from '../../../src/vg-d1-growth-joint/books.ts';
import { type GConfig, type Quad, gId, normalize, quadId } from '../../../src/vg-d1-growth-joint/space.ts';
import { canonicalOf, cfgId, placeholder } from '../../../src/vg-lifecycle-matched-optimization/config.ts';
import { jointId, normalize as p2Normalize } from '../../../src/vgt-d1-growth-joint/space.ts';
import { canonicalJson } from '../shared/preview.ts';
import { entrySha256 } from './portfolio-catalog-read.ts';
import {
  CATALOG_SCHEMA,
  CATALOG_VERSION,
  type CatalogComponent,
  type CandidateEntry,
  type CandidateCatalog,
  type CandidateSource,
  type CandidateTargets,
  type LedgerRef,
  PORTFOLIO_BENCHMARK
} from '../shared/portfolio.ts';

const SRC = {
  lmoFrozen: 'research/vg-lifecycle-matched-optimization/FROZEN_SELECTION.json',
  lmoValidation: 'research/vg-lifecycle-matched-optimization/results/validation/validation.json',
  lmoControls: 'research/vg-lifecycle-matched-optimization/CONTROL_MANIFEST.json',
  b3Frozen: 'research/vg-d1-growth-expanded/FROZEN_SELECTION.json',
  c3Controls: 'research/c4-gdx-growth-partner/CONTROL_MANIFEST.json',
  p3Controls: 'research/vg-d1-growth-joint/CONTROL_MANIFEST.json',
  p3Validation: 'research/vg-d1-growth-joint/results/validation/validation.json',
  p3LedgerIndex: 'research/vg-d1-growth-joint/results/validation/ledgers/INDEX.md',
  p2Frozen: 'research/vgt-d1-growth-joint/FROZEN_SELECTION.json',
  p2Validation: 'research/vgt-d1-growth-joint/results/validation/validation.json',
  p2LedgerIndex: 'research/vgt-d1-growth-joint/results/validation/ledgers/INDEX.md',
  p2Comparison: 'research/vgt-d1-growth-separate-pooled/results/comparison.json',
  g085Frozen: 'research/growth140-vgt-stable/FROZEN_SELECTION.json',
  vg2Config: 'config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json',
  d1Primary: 'config/phenotypes/D1/VGT.json'
} as const;

type Json = Record<string, unknown>;
type Readers = { text: (rel: string) => string; json: <T = Json>(rel: string) => T; sha: (rel: string) => string };

const readersOf = (repoRoot: string): Readers => {
  const memo = new Map<string, Buffer>();
  const buf = (rel: string) => {
    let b = memo.get(rel);
    if (!b) {
      b = readFileSync(join(repoRoot, rel));
      memo.set(rel, b);
    }
    return b;
  };
  return {
    text: (rel) => buf(rel).toString('utf8'),
    json: <T>(rel: string) => decode<T>(buf(rel).toString('utf8')),
    sha: (rel) => createHash('sha256').update(buf(rel)).digest('hex')
  };
};

const fail = (msg: string): never => {
  throw new Error(`pooled-candidate catalog: ${msg}`);
};
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const expect = (label: string, got: unknown, want: unknown) => {
  if (!same(got, want)) fail(`${label}: ${canonicalJson(got)} ≠ ${canonicalJson(want)}`);
};

// ----- D1 -----

/** D1's eight parameters: label, the grid's unit and the engine's unit (the grid is the registry's integer grid). */
export const D1_PARAM_LABELS: Record<keyof D1Grid, { label: string; grid: string; engine: string }> = {
  targetPercentChange: { label: 'Target (X)', grid: 'tenths of a percentage point', engine: 'fraction' },
  trailingBuyPercentage: { label: 'Trailing buy (Y)', grid: 'tenths of a percentage point', engine: 'fraction' },
  trailingStopPercentage: { label: 'Trailing stop', grid: 'tenths of a percentage point', engine: 'fraction' },
  maximumHoldDays: { label: 'Maximum losing hold', grid: 'calendar days', engine: 'calendar days' },
  tickWindowSize: { label: 'Tick window (L)', grid: 'sessions', engine: 'sessions' },
  intradayLossBuffer: { label: 'Intraday loss buffer', grid: 'tenths of a percentage point', engine: 'fraction' },
  pullback: { label: 'Pullback (P)', grid: 'tenths of a percentage point', engine: 'fraction' },
  continuationWindow: { label: 'Continuation window (W)', grid: 'sessions', engine: 'sessions' }
};

/** "23.5%" → 235 (tenths of a percentage point); an integer stays an integer. */
const gridValue = (v: string | number) =>
  typeof v === 'number' ? v : Math.round(Number(String(v).replace('%', '')) * 10);
const gridOfParameters = (p: Record<string, string | number>): D1Grid =>
  Object.fromEntries(d1Keys.map((k) => [k, gridValue(p[k] ?? fail(`D1 parameter ${k} missing`))])) as unknown as D1Grid;

/** Engine parameters for display: NaN (inactive) → null, listed under `inactive`. Finite numbers, strings, booleans kept. */
const displayParams = (o: Record<string, unknown>): { params: Record<string, unknown>; inactive: string[] } => {
  const inactive: string[] = [];
  const walk = (v: unknown, path: string): unknown => {
    if (typeof v === 'number' && !Number.isFinite(v)) {
      inactive.push(path);
      return null;
    }
    if (v && typeof v === 'object' && !Array.isArray(v))
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([k, x]) => [k, walk(x, path ? `${path}.${k}` : k)])
      );
    return v;
  };
  return { params: walk(o, '') as Record<string, unknown>, inactive: inactive.sort() };
};

// ----- the five candidates -----

interface Spec {
  id: string;
  name: string;
  summary: string;
  distinctions: string[];
  family: 'vg' | 'vgt';
}

const SPECS: Spec[] = [
  {
    id: 'l0-primary',
    name: 'New L0 primary',
    family: 'vg',
    summary:
      'Modified D1·VGT + modified D1·GDX + VGT Growth 6b5f909b; GDX Growth OFF; Growth funding lifecycle L0 (matched lifecycle study C24/L0/informed/R1#1 profit).',
    distinctions: [
      'Its two D1 books are modified relatives of VG #2 Balanced’s pair (D1·VGT 237,9,73,15,72,42,103,41; D1·GDX 277,1,61,13,232,25,152,10), NOT VG #2’s unchanged books.',
      'Selected by the matched L0/L1/L2 lifecycle optimization (Priority 5B) as the L0 arm’s primary; its 2025–2026 figures are validation on previously examined history.'
    ]
  },
  {
    id: 'c4-refined',
    name: 'C4-refined',
    family: 'vg',
    summary:
      'VG #2 Balanced’s unchanged D1·VGT + D1·GDX books + the refined VGT Growth (c3c1c0d5); GDX Growth OFF. Alias of Priority 3B C24/informed-fixed#1 profit.',
    distinctions: [
      'Alias of 3B `C24/informed-fixed#1 profit` — not `informed-joint#1` and not the new L0 primary.',
      'Its VGT Growth differs from Growth #4 in 17 settings, including the initial stop OFF; it is not “#4 with the trend filter OFF and a 5.7% trailing stop”.'
    ]
  },
  {
    id: 'c4',
    name: 'Original C4',
    family: 'vg',
    summary: 'VG #2 Balanced’s D1·VGT + D1·GDX pair + the original VGT Growth #4 (420cd989); GDX Growth OFF.',
    distinctions: [
      'VG #2 Balanced is Study 8 `S8-VG-F24-3` (`s8-vg-balanced`), not Study 7’s older `vg-balanced` pool.',
      'Uses the combined studies’ harmonized D1 arming (from 2016-01-04), not the native VG #2 runner’s 2017-06-15 start.'
    ]
  },
  {
    id: 'vgt-d1-g4',
    name: 'VGT-only: D1 primary + Growth #4',
    family: 'vgt',
    summary:
      'The existing standalone VGT D1 primary (d1-ebc9f639b3) paired as-is with VGT Growth #4 (420cd989) under Priority 2’s architecture A, D1 first. No GDX component.',
    distinctions: [
      'The D1 primary is the shipped standalone VGT D1 (216,3,73,8,74,29,90,60): not VG #2’s VGT book, not the optimized D1-only winner.'
    ]
  },
  {
    id: 'vgt-d1-g085',
    name: 'VGT-only: D1 primary + Growth 08500a60',
    family: 'vgt',
    summary:
      'The same standalone VGT D1 primary paired as-is with Growth 08500a60ec56cfae under architecture A, D1 first. No GDX component. Growth sells 50% at its first trailing-stop event and manages the remainder.',
    distinctions: [
      'Growth 08500a60 retains a remainder after a partial exit (50% at the first profit trailing-stop event); the remainder exits after one close below its 160-session SMA, or at its initial stop. The remainder keeps the slot until its final exit.'
    ]
  }
];

const SYMBOLS = ['VGT', 'GDX'] as const;

/** Build the catalog from the repository's records (pure: no clock, no randomness; byte-stable). */
export function buildCatalog(repoRoot: string): CandidateCatalog {
  const r = readersOf(repoRoot);
  const src = (path: string, pointer: string, role: string): CandidateSource => ({ role, path, pointer, sha256: r.sha(path) });

  const lmo = r.json<Json>(SRC.lmoFrozen);
  const lmoVal = r.json<{ rows: Json[] }>(SRC.lmoValidation);
  const lmoControls = r.json<{ controls: Json[]; growthIdentities: Record<string, string> }>(SRC.lmoControls);
  const b3 = r.json<{ finalSet: Json[] }>(SRC.b3Frozen);
  const c3 = r.json<{ c4Refined: Json }>(SRC.c3Controls);
  const p3c = r.json<{ controls: Json[] }>(SRC.p3Controls);
  const p3v = r.json<{ rows: Json[] }>(SRC.p3Validation);
  const p2f = r.json<{ controls: Json[] }>(SRC.p2Frozen);
  const p2v = r.json<{ rows: Json[] }>(SRC.p2Validation);
  const p2c = r.json<{ subjects: Record<string, Json> }>(SRC.p2Comparison);
  const g085 = r.json<{ finalists: Json[] }>(SRC.g085Frozen);
  const vg2 = r.json<{ id: string; books: { symbol: string; candidateId: string; parameters: Record<string, string | number>; parametersSha256: string }[] }>(SRC.vg2Config);
  const d1p = r.json<{ phenotypes: { primary: { parameters: Record<string, string | number>; provenance: { candidateId: string } } } }>(SRC.d1Primary);

  // The fixed D1 books every distinction is checked against.
  const vg2Books = Object.fromEntries(vg2.books.map((b) => [b.symbol, { grid: gridOfParameters(b.parameters), id: b.candidateId, sha: b.parametersSha256 }]));
  if (vg2.id !== 'S8-VG-F24-3') fail(`VG #2 config id ${vg2.id}`);
  const d1PrimaryGrid = gridOfParameters(d1p.phenotypes.primary.parameters);
  if (d1p.phenotypes.primary.provenance.candidateId !== 'd1-ebc9f639b3') fail('the VGT D1 primary candidate id changed');

  // The Growth identities the brief names.
  const gIds = lmoControls.growthIdentities;
  expect('Growth #4 identity', gIds.g4, '420cd989e4fa7749');
  expect('Growth 08500a60 identity', gIds.g085, '08500a60ec56cfae');
  expect('C4-refined VGT Growth identity', gIds.c4RefinedVgt, 'c3c1c0d56c4ee3b0');
  const g085Final = g085.finalists.find((f) => f.id === '08500a60ec56cfae') ?? fail('08500a60 is not a growth140-vgt-stable finalist');
  expect('08500a60 config identity', gId(g085Final.config as GConfig), '08500a60ec56cfae');

  const lmoRow = (row: string) => (lmo.crossTestSubjects as Json[]).find((x) => x.row === row) ?? fail(`5B cross-test subject ${row} missing`);
  const lmoValRow = (row: string) => lmoVal.rows.find((x) => x.row === row && x.mode === 'L0') ?? fail(`5B validation row ${row} L0 missing`);
  const p3Control = (key: string) => p3c.controls.find((c) => c.key === key) ?? fail(`P3 control ${key} missing`);
  const p3ValRow = (id: string) => p3v.rows.find((x) => x.id === id) ?? fail(`P3 validation row ${id} missing`);
  const p2Control = (label: string) => p2f.controls.find((c) => c.label === label) ?? fail(`P2 control ${label} missing`);
  const p2ValRow = (label: string) => p2v.rows.find((x) => x.label === `control: ${label}`) ?? fail(`P2 validation row ${label} missing`);
  const lmoDev = (key: string) =>
    ((lmoControls.controls.find((c) => c.key === key) ?? fail(`5B control ${key} missing`)).sealedDevelopmentCentreL0 as {
      net: number;
      dd: number;
      lots: number;
    }) ?? fail(`5B control ${key} has no development centre`);

  const ledgerIndexLine = (indexPath: string, n: string, must: RegExp) => {
    const line = r.text(indexPath).split('\n').find((l) => l.startsWith(`- ${n}:`)) ?? fail(`${indexPath} has no entry ${n}`);
    if (!must.test(line)) fail(`${indexPath} entry ${n} is not the expected subject: ${line.slice(0, 120)}`);
  };
  const ledgerSet = (dir: string, n: string, scope: LedgerRef['scope'], engine: string): LedgerRef => {
    const files = Object.fromEntries(
      (['lots', 'funding', 'daily'] as const).map((k) => {
        const path = `${dir}/${n}-${k}.csv`;
        return [k, { path, sha256: r.sha(path) }];
      })
    ) as LedgerRef['files'];
    return { scope, engine, files };
  };
  const devLedger = (subject: string): LedgerRef => {
    const dir = `research/vg-lifecycle-matched-optimization/results/diagnostics/ledgers/${subject}/L0`;
    return {
      scope: 'development (D24 door, 2016-01-04 → 2024-12-31)',
      engine: 'Priority 3 pool (5B diagnostics, L0)',
      files: { lots: { path: `${dir}/lots.csv`, sha256: r.sha(`${dir}/lots.csv`) } }
    };
  };

  const candidates: CandidateEntry[] = SPECS.map((spec, i) => {
    let quad: Quad;
    let enabled: Record<BookId, boolean>;
    let identities: CandidateEntry['identities'];
    let targets: CandidateTargets;
    let sources: CandidateSource[];
    let ledgers: LedgerRef[];
    let conventions: Record<string, unknown>;

    if (spec.family === 'vg') {
      const row = { 'l0-primary': 'R01', 'c4-refined': 'R21', c4: 'R20' }[spec.id]!;
      const subject = lmoRow(row);
      const settings = subject.settings as Json;
      const control = { 'l0-primary': null, 'c4-refined': 'C4R', c4: 'C4' }[spec.id];
      expect(`${spec.id} 5B control`, subject.control, control);
      expect(`${spec.id} options`, subject.options, { enabled: { 'G:GDX': false } });
      quad = normalize(subject.quad as Quad);
      expect(`${spec.id} quad is canonical`, quad, subject.quad);
      enabled = { 'D1:GDX': true, 'D1:VGT': true, 'G:GDX': false, 'G:VGT': true };
      const growthVgt = gId(quad.g.VGT);
      const want = {
        'l0-primary': { cfg: '67cfdd9b62d1e16f', p3: 'a2e385640ca61012', g: '6b5f909b30cfa516' },
        'c4-refined': { cfg: '0f017f0ab9b26f24', p3: '07443ffaeef41e85', g: 'c3c1c0d56c4ee3b0' },
        c4: { cfg: '2f49a1cc226b4ece', p3: 'f324035d15f69610', g: '420cd989e4fa7749' }
      }[spec.id]!;
      expect(`${spec.id} 5B cfgId (recomputed)`, cfgId(canonicalOf('V', quad)), want.cfg);
      expect(`${spec.id} 5B id (recorded)`, subject.id, want.cfg);
      expect(`${spec.id} Priority 3 quadId (recomputed)`, quadId(quad), want.p3);
      expect(`${spec.id} Priority 3 quadId (recorded)`, settings.priority3QuadId, want.p3);
      expect(`${spec.id} VGT Growth identity`, growthVgt, want.g);
      expect(`${spec.id} GDX Growth placeholder`, gId(quad.g.GDX), gId(placeholder));
      expect(`${spec.id} lifecycle`, settings.lifecycle, 'L0');
      identities = {
        study5bCfgId: want.cfg,
        priority3QuadId: want.p3,
        growthVgt: want.g,
        growthGdxPlaceholder: gId(placeholder),
        d1Vgt: `d1-${d1Keys.map((k) => quad.d1.VGT[k]).join(',')}`,
        d1Gdx: `d1-${d1Keys.map((k) => quad.d1.GDX[k]).join(',')}`
      };
      // D1 books: VG #2's unchanged pair for C4 and C4-refined; modified books for the L0 primary.
      const isVg2 = SYMBOLS.every((s) => same(quad.d1[s], vg2Books[s]!.grid));
      if (spec.id === 'l0-primary' && isVg2) fail('the L0 primary must not carry VG #2’s unchanged D1 books');
      if (spec.id !== 'l0-primary' && !isVg2) fail(`${spec.id} must carry VG #2’s unchanged D1 books`);
      if (spec.id !== 'l0-primary') {
        identities.vg2Config = 'S8-VG-F24-3';
        identities.d1VgtVg2 = vg2Books.VGT!.id;
        identities.d1GdxVg2 = vg2Books.GDX!.id;
      }
      if (spec.id === 'l0-primary') {
        const primary = (lmo.arms as Json & { L0: { primary: Json } }).L0.primary;
        expect('arms.L0.primary.label', primary.label, 'C24/L0/informed/R1#1 profit');
        expect('arms.L0.primary.id', primary.id, want.cfg);
        expect('arms.L0.primary settings', (primary.settings as Json).priority3QuadId, want.p3);
      }
      if (spec.id === 'c4-refined') {
        const e = b3.finalSet.find((x) => x.label === 'C24/informed-fixed#1 profit') ?? fail('3B informed-fixed#1 missing');
        expect('3B informed-fixed#1 id', e.id, want.cfg);
        expect('3B informed-fixed#1 quad', (e.settings as Json).priority3QuadId, want.p3);
        expect('3C c4Refined.vgtEffective', normalize({ ...quad, g: { ...quad.g, VGT: c3.c4Refined.vgtEffective as GConfig } }).g.VGT, quad.g.VGT);
        // 17 settings change value (switches included); 5 more only become inactive because the trend filter and
        // the initial stop are OFF (3C CONTROL_MANIFEST c4Refined.differencesFromGrowth4, "(inactive)").
        const all = Object.entries(c3.c4Refined.differencesFromGrowth4 as Record<string, { c4Refined: unknown }>);
        const changed = all.filter(([, d]) => d.c4Refined !== '(inactive)').map(([k]) => k);
        const inactivated = all.filter(([, d]) => d.c4Refined === '(inactive)').map(([k]) => k);
        if (changed.length !== 17) fail(`C4-refined changes ${changed.length} settings of #4, expected 17`);
        if (!changed.includes('initialStopEnabled')) fail('C4-refined must switch the initial stop OFF');
        identities.alias3B = 'C24/informed-fixed#1 profit';
        identities.settingsChangedFromGrowth4 = changed.join(', ');
        identities.settingsInactiveVersusGrowth4 = inactivated.join(', ');
      }
      const v = lmoValRow(row);
      const rec = v.record as Json;
      const dev =
        spec.id === 'l0-primary'
          ? (() => {
              const p = (lmo.arms as Json & { L0: { primary: Json } }).L0.primary;
              return { net: p.net as number, dd: p.dd as number, lots: p.lots as number };
            })()
          : lmoDev(control!);
      targets = {
        fullNet: v.fullNet as number,
        fullMinuteDd: v.wholeDd as number,
        validationNet: v.validationPnl as number,
        validationResetDd: v.validationDd as number,
        developmentNet: v.developmentNet as number,
        developmentMinuteDd: dev.dd,
        developmentLots: dev.lots,
        fullRealized: v.fullRealized as number,
        fullUnrealized: v.fullUnrealized as number,
        lots: rec.lots as number,
        signature: rec.signature as string,
        record: rec,
        recordFormat: 'Priority 3 recordOf (5B validation, FULL door, boundary 2024-12-31, L0)'
      };
      if (Math.abs(dev.net - targets.developmentNet) > 0.005) fail(`${spec.id} development net ${dev.net} ≠ ${targets.developmentNet}`);
      sources = [
        src(SRC.lmoFrozen, `crossTestSubjects[row=${row}] (quad, settings)`, 'settings'),
        src(SRC.lmoValidation, `rows[row=${row}, mode=L0]`, 'full-history and validation targets, archived record'),
        spec.id === 'l0-primary'
          ? src(SRC.lmoFrozen, 'arms.L0.primary (net, dd, lots)', 'development check')
          : src(SRC.lmoControls, `controls[key=${control}].sealedDevelopmentCentreL0`, 'development check'),
        src(SRC.lmoControls, 'growthIdentities', 'Growth identities'),
        ...(spec.id === 'l0-primary' ? [] : [src(SRC.vg2Config, 'books[] (VGT, GDX)', 'VG #2 Balanced D1 books')]),
        ...(spec.id === 'c4-refined'
          ? [
              src(SRC.b3Frozen, 'finalSet[label=C24/informed-fixed#1 profit]', 'alias source (3B)'),
              src(SRC.c3Controls, 'c4Refined (vgtEffective, differencesFromGrowth4)', 'alias and differences from #4')
            ]
          : [])
      ];
      const subjectDir = { 'l0-primary': 'C24_L0_informed_R1#1_profit', 'c4-refined': 'control_C4R', c4: 'control_C4' }[spec.id]!;
      ledgers = [devLedger(subjectDir)];
      if (spec.id === 'c4') {
        ledgerIndexLine(SRC.p3LedgerIndex, '18', /control: VG #2 \+ Growth #4 \(VGT\) — three components/);
        ledgers.unshift(ledgerSet('research/vg-d1-growth-joint/results/validation/ledgers', '18', 'full', 'Priority 3 pool (validation, FULL)'));
        sources.push(src(SRC.p3LedgerIndex, 'entry 18', 'full-history ledger index'));
      }
      conventions = settings.allocator as Json;
    } else {
      const label = spec.id === 'vgt-d1-g4' ? 'D1 primary + Growth #4 · A' : 'D1 primary + Growth 08500a60 · A';
      const p3key = spec.id === 'vgt-d1-g4' ? 'p2:primary+g4' : 'p2:primary+g085';
      const wantP3 = spec.id === 'vgt-d1-g4' ? 'dbe7be81867b739a' : '51da785f9a3b5f26';
      const wantP2 = spec.id === 'vgt-d1-g4' ? '04741779be90e639' : 'a8833010dd6f9c30';
      const wantG = spec.id === 'vgt-d1-g4' ? '420cd989e4fa7749' : '08500a60ec56cfae';
      const p2 = p2Control(label);
      const p3 = p3Control(p3key);
      const joint = p2Normalize(p2.joint as Parameters<typeof p2Normalize>[0]);
      expect(`${spec.id} P2 joint is canonical`, joint, p2.joint);
      expect(`${spec.id} P2 allocation`, joint.a, { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' });
      expect(`${spec.id} P2 jointId (recomputed)`, jointId(joint), wantP2);
      expect(`${spec.id} P2 id (recorded)`, p2.id, wantP2);
      quad = normalize(p3.quad as Quad);
      expect(`${spec.id} P3 quad is canonical`, quad, p3.quad);
      expect(`${spec.id} P3 quadId (recomputed)`, quadId(quad), wantP3);
      expect(`${spec.id} P3 id (recorded)`, p3.id, wantP3);
      expect(`${spec.id} P3 enabled`, p3.enabled, { 'D1:GDX': false, 'D1:VGT': true, 'G:GDX': false, 'G:VGT': true });
      expect(`${spec.id} P3 first`, p3.first, 'D1');
      expect(`${spec.id} D1·VGT = P2's D1`, quad.d1.VGT, joint.d1);
      expect(`${spec.id} Growth·VGT = P2's Growth`, quad.g.VGT, joint.g);
      expect(`${spec.id} D1 = the standalone VGT D1 primary`, joint.d1, d1PrimaryGrid);
      if (same(joint.d1, vg2Books.VGT!.grid)) fail('the VGT D1 primary must not be VG #2’s VGT book');
      expect(`${spec.id} Growth identity`, gId(joint.g), wantG);
      enabled = { 'D1:GDX': false, 'D1:VGT': true, 'G:GDX': false, 'G:VGT': true };
      identities = {
        priority2JointId: wantP2,
        priority3QuadId: wantP3,
        growthVgt: wantG,
        d1Vgt: d1p.phenotypes.primary.provenance.candidateId,
        d1VgtGrid: `d1-${d1Keys.map((k) => joint.d1[k]).join(',')}`
      };
      const v2 = p2ValRow(label);
      const v3 = p3ValRow(wantP3);
      const cmp = p2c.subjects[label] ?? fail(`P2 comparison subject ${label} missing`);
      const win = cmp.windows as { development: { net: number; dd: number } };
      const d24 = (cmp.D24 as { record: { lots: number } }).record;
      expect(`${spec.id} P2 and P3 full net`, v3.wholeNet, v2.wholeNet);
      expect(`${spec.id} P2 and P3 full DD`, v3.wholeDd, v2.wholeDd);
      expect(`${spec.id} P2 and P3 validation`, v3.validationNet, v2.validationNet);
      const rec = v3.record as Json;
      targets = {
        fullNet: v2.wholeNet as number,
        fullMinuteDd: v2.wholeDd as number,
        validationNet: v2.validationNet as number,
        validationResetDd: v2.validationDd as number,
        developmentNet: v2.boundaryEquity as number,
        developmentMinuteDd: win.development.dd,
        developmentLots: d24.lots,
        fullRealized: rec.realized as number,
        fullUnrealized: rec.unrealized as number,
        lots: rec.lots as number,
        signature: rec.signature as string,
        record: rec,
        recordFormat: 'Priority 3 recordOf (P3 validation reproduction of the Priority 2 control, FULL door, boundary 2024-12-31)'
      };
      if (Math.abs(win.development.net - targets.developmentNet) > 0.005) fail(`${spec.id} development net differs`);
      const p3n = spec.id === 'vgt-d1-g4' ? '16' : '17';
      const p2n = spec.id === 'vgt-d1-g4' ? '14' : '11';
      ledgerIndexLine(SRC.p3LedgerIndex, p3n, new RegExp(`control: VGT only: ${label.replace(/[#+·]/g, '.')} \\(Priority 2\\)`));
      ledgerIndexLine(SRC.p2LedgerIndex, p2n, new RegExp(`control: ${label.replace(/[#+·]/g, '.')} \\(control\\)`));
      ledgers = [
        ledgerSet('research/vg-d1-growth-joint/results/validation/ledgers', p3n, 'full', 'Priority 3 pool (validation, FULL)'),
        ledgerSet('research/vgt-d1-growth-joint/results/validation/ledgers', p2n, 'full', 'Priority 2 one-symbol pool (validation, FULL)')
      ];
      sources = [
        src(SRC.p2Frozen, `controls[label=${label}].joint`, 'settings (Priority 2 frozen control)'),
        src(SRC.p3Controls, `controls[key=${p3key}] (quad, enabled)`, 'shared-engine representation (Priority 3)'),
        src(SRC.d1Primary, 'phenotypes.primary', 'standalone VGT D1 primary'),
        src(SRC.p2Validation, `rows[label=control: ${label}]`, 'full-history and validation targets (Priority 2)'),
        src(SRC.p3Validation, `rows[id=${wantP3}]`, 'archived record (Priority 3 reproduction)'),
        src(SRC.p2Comparison, `subjects[${label}].windows.development, .D24.record`, 'development check'),
        src(SRC.p3LedgerIndex, `entry ${p3n}`, 'full-history ledger index (P3)'),
        src(SRC.p2LedgerIndex, `entry ${p2n}`, 'full-history ledger index (P2)'),
        ...(spec.id === 'vgt-d1-g085' ? [src(SRC.g085Frozen, 'finalists[id=08500a60ec56cfae]', 'Growth 08500a60 identity')] : []),
        src(SRC.lmoControls, 'growthIdentities', 'Growth identities')
      ];
      conventions = {
        architecture: 'A: one exclusive funded slot (Priority 2)',
        principalBudget: 100000,
        compounding: false,
        preemption: false,
        simultaneousFundedPositions: false,
        partialExitReleasesSlot: false,
        sameInstantOrder: ['D1:VGT', 'G:VGT'],
        costBpsPerSide: 5,
        commission: 0,
        interest: '11% simple annual on outstanding principal, calendar days / 365',
        stopFill: 'at the stop or the gapped open; no extra slippage',
        shares: 'fractional',
        fundingFrom: '2016-01-04',
        d1Arming: 'harmonized: from the first session (each D1 machine arms once its reference high exists); the D1 primary’s first signal is 2018-12-21 under either arming',
        growthLifecycle: 'L0 — a refused Growth entry becomes an unfunded virtual position and waits for its virtual exit; funding never feeds back',
        d1Lifecycle: 'canonical shadow book (refusals never feed back into D1)'
      };
    }

    // The components, each with its full effective vector and the engine's own parameter form.
    const components: CatalogComponent[] = [];
    for (const s of SYMBOLS) {
      const book = `D1:${s}` as BookId;
      if (enabled[book]) {
        const engine = displayParams(d1StrategyParams(s, quad.d1[s]) as unknown as Record<string, unknown>);
        components.push({
          book,
          family: 'D1',
          symbol: s,
          enabled: true,
          identity: identities[s === 'VGT' ? 'd1Vgt' : 'd1Gdx'] as string,
          grid: { ...quad.d1[s] },
          gridUnits: Object.fromEntries(d1Keys.map((k) => [k, D1_PARAM_LABELS[k].grid])),
          engineParams: engine.params,
          inactive: engine.inactive
        });
      }
    }
    for (const s of SYMBOLS) {
      const book = `G:${s}` as BookId;
      if (enabled[book]) {
        const engine = displayParams(
          growthParamsOf(quad.g[s], s, { from: PORTFOLIO_BENCHMARK.from, to: PORTFOLIO_BENCHMARK.to }) as unknown as Record<string, unknown>
        );
        components.push({
          book,
          family: 'Growth',
          symbol: s,
          enabled: true,
          identity: gId(quad.g[s]),
          effective: { ...quad.g[s] },
          engineParams: engine.params,
          inactive: engine.inactive
        });
      } else
        components.push({
          book,
          family: book.startsWith('D1') ? 'D1' : 'Growth',
          symbol: s,
          enabled: false,
          identity: null,
          note: 'OFF: never run, never funded (the engine carries a placeholder vector for the identity only)'
        });
    }
    for (const s of SYMBOLS) {
      const book = `D1:${s}` as BookId;
      if (!enabled[book])
        components.push({
          book,
          family: 'D1',
          symbol: s,
          enabled: false,
          identity: null,
          note: 'OFF: never run, never funded (the engine carries a placeholder vector for the identity only)'
        });
    }

    // The engine identity check against the 5B archived settings (decoded): D1 engine params and Growth engine params.
    if (spec.family === 'vg') {
      const settings = lmoRow({ 'l0-primary': 'R01', 'c4-refined': 'R21', c4: 'R20' }[spec.id]!).settings as Json;
      for (const s of SYMBOLS) {
        const archived = (settings.d1 as Record<string, { grid: D1Grid; strategyParams: Json }>)[s]!;
        expect(`${spec.id} D1·${s} grid`, archived.grid, quad.d1[s]);
        expect(`${spec.id} D1·${s} engine params`, displayParams(archived.strategyParams).params, displayParams(d1StrategyParams(s, quad.d1[s]) as unknown as Json).params);
      }
      const gv = (settings.growth as Record<string, Json>).VGT!;
      expect(`${spec.id} Growth·VGT effective`, gv.effective, quad.g.VGT);
      expect(
        `${spec.id} Growth·VGT engine params`,
        displayParams(gv.engineParams as Json).params,
        displayParams(growthParamsOf(quad.g.VGT, 'VGT', { from: PORTFOLIO_BENCHMARK.from, to: PORTFOLIO_BENCHMARK.to }) as unknown as Json).params
      );
    }

    const entry: Omit<CandidateEntry, 'entrySha256'> = {
      id: spec.id,
      order: i + 1,
      name: spec.name,
      summary: spec.summary,
      distinctions: spec.distinctions,
      symbols: spec.family === 'vg' ? ['VGT', 'GDX'] : ['VGT'],
      lifecycle: 'L0',
      engine: {
        path: 'src/vg-lifecycle-matched-optimization/life.ts runLife(door, quad, options, "L0") = src/vg-d1-growth-joint/evaluate.ts run + recordOf (src/vg-d1-growth-joint/pool.ts runPool)',
        door: 'Priority 3 FULL door (src/vg-d1-growth-joint/data.ts openFullDoor, quiet): canonical VGT and GDX minute files, partition all, forward split adjustment to 2016-01-04',
        options: { enabled, boundaries: [PORTFOLIO_BENCHMARK.boundary] }
      },
      components,
      enabled,
      quad: quad as unknown as CandidateEntry['quad'],
      identities,
      conventions,
      targets,
      sources,
      ledgers
    };
    return { ...entry, entrySha256: entrySha256(entry) };
  });

  // No mixing: the three kinds of D1 books are distinct, and each candidate carries the expected kind.
  const grid = (id: string, s: 'VGT' | 'GDX') => (candidates.find((c) => c.id === id)!.quad as unknown as Quad).d1[s];
  if (same(grid('l0-primary', 'VGT'), vg2Books.VGT!.grid) || same(grid('l0-primary', 'GDX'), vg2Books.GDX!.grid))
    fail('the L0 primary shares a VG #2 D1 book');
  if (!same(grid('vgt-d1-g4', 'VGT'), grid('vgt-d1-g085', 'VGT'))) fail('the two VGT-only candidates must share the D1 primary');
  if (same(grid('vgt-d1-g4', 'VGT'), grid('l0-primary', 'VGT'))) fail('the D1 primary equals the L0 primary’s D1·VGT');

  return {
    schema: CATALOG_SCHEMA,
    version: CATALOG_VERSION,
    note:
      'Five frozen portfolio candidates for inspection in Strategy Lab (Priority 6). Listed in the order of the Priority 6 brief; the order is not a safety ranking, no candidate is an adopted favourite, and inclusion is permission to inspect, not a trading instruction or a deployment.',
    builtBy: 'apps/strategy-lab/scripts/build-candidate-catalog.ts (runner/portfolio-catalog.ts buildCatalog)',
    benchmark: PORTFOLIO_BENCHMARK,
    candidates
  };
}
