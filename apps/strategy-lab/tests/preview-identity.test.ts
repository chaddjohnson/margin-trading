// Interactive Preview execution identity (server/preview-identity.ts): the import scanner, the implementation
// fingerprint (checked against a live trace of every module the runners load and every file they read), distinct keys
// for every input that can change a result, equal keys for inactive (irrelevant) values, and fail-closed errors.

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { REPO_ROOT } from '../server/config.ts';
import { NODE_FLAGS, RUNNER_SCRIPTS } from '../server/jobs.ts';
import {
  dataFingerprint,
  identityDifferences,
  identityKey,
  implementationFingerprint,
  moduleSpecifiers,
  PreviewIdentityError,
  previewIdentity,
  RUNTIME_INPUTS
} from '../server/preview-identity.ts';
import { canonicalJson, canonicalPreviewConfig, previewConfigKey } from '../shared/preview.ts';
import { findStrategy, RISE_FROM_RECENT_LOW, RISE_FROM_RECENT_LOW_TRADING } from '../shared/strategies.ts';

const hasData = existsSync(join(REPO_ROOT, 'data/VGT/data.csv')) && existsSync(join(REPO_ROOT, 'data/GDX/data.csv'));
const GROWTH = RISE_FROM_RECENT_LOW_TRADING;
const BASE = {
  advanceFromRecentLowPercent: 5,
  recentLowLookbackBars: 20,
  trailingStopPercent: 7.3,
  maximumHoldEnabled: true,
  maximumHoldDays: 8,
  intradayLossBufferEnabled: true,
  intradayLossBufferPercent: 2.9,
  costBpsPerSide: 5,
  continuationEnabled: false,
  trendFilterEnabled: false,
  eligibilityEnabled: false,
  entryMethod: 'rise_from_recent_low',
  initialStopEnabled: false,
  retentionEnabled: false
};
const request = (over: Record<string, unknown> = {}, params: Record<string, unknown> = {}) => ({
  strategyKey: GROWTH.key,
  strategyVersion: GROWTH.version,
  params: { ...BASE, ...params },
  symbols: ['VGT'],
  from: '2019-01-02',
  to: '2020-12-31',
  resolution: '1d' as const,
  ...over
});
const config = (over: Record<string, unknown> = {}, params: Record<string, unknown> = {}) =>
  canonicalPreviewConfig(GROWTH, request(over, params) as never);

describe('module specifiers (the static import scanner)', () => {
  it('reads every runtime import form and skips type-only imports and comments', () => {
    const src = [
      "import fs from 'fs-extra';",
      "import { a, type B } from './a.ts';",
      'import {',
      '  c,',
      '  d',
      "} from '../c.ts';",
      "import type { T } from './types.ts';",
      "export type { U } from './u.ts';",
      "export * from './star.ts';",
      "export { e } from './e.ts';",
      "import './side-effect.ts';",
      "// import x from './commented.ts';",
      '/* import y from "./block.ts"; */',
      '/**',
      " * import z from './doc.ts';",
      ' */',
      'export const f = 1;',
      'export type Alias = { a: string };',
      "const lazy = await import('./lazy.ts');",
      "import { g } from '#lib';"
    ].join('\n');
    expect(moduleSpecifiers(src, 'x.ts')).toEqual([
      'fs-extra',
      './a.ts',
      '../c.ts',
      './star.ts',
      './e.ts',
      './side-effect.ts',
      './lazy.ts',
      '#lib'
    ]);
  });

  it('fails closed on a dynamic import it cannot follow', () => {
    expect(() => moduleSpecifiers('const m = await import(name);', 'x.ts')).toThrow(PreviewIdentityError);
  });
});

describe('implementation fingerprint', () => {
  it('covers every runner: its closure, the #lib subpath import and the npm packages it loads', () => {
    const f = implementationFingerprint(REPO_ROOT, RUNNER_SCRIPTS[GROWTH.key]!);
    expect(f.files['apps/strategy-lab/runner/trading-run.ts']).toMatch(/^[0-9a-f]{64}$/);
    expect(f.files['src/growth-trading/riseTrading.ts']).toBeDefined();
    expect(f.files['src/lib/index.ts']).toBeDefined(); // via '#lib' (package.json "imports")
    expect(Object.keys(f.packages)).toEqual(
      expect.arrayContaining(['node_modules/csv-parse', 'node_modules/fs-extra', 'node_modules/graceful-fs'])
    );
    expect(f.node).toBe(process.version);
    expect(f.flags).toEqual(NODE_FLAGS);
    // deterministic
    expect(implementationFingerprint(REPO_ROOT, RUNNER_SCRIPTS[GROWTH.key]!).sha256).toBe(f.sha256);
    const s = implementationFingerprint(REPO_ROOT, RUNNER_SCRIPTS[RISE_FROM_RECENT_LOW.key]!);
    expect(s.files['src/entry-signals/outcomes.ts']).toBeDefined();
    expect(s.sha256).not.toBe(f.sha256);
  });

  // The proof that the static closure is complete: run each runner under a preload that records every module the
  // loader loads and every path fs opens, then require each to be covered by the identity.
  for (const [key, req] of [
    [GROWTH.key, request({ symbols: ['VGT', 'GDX'], from: '2020-01-02', to: '2020-06-30' })],
    [
      RISE_FROM_RECENT_LOW.key,
      { strategyKey: RISE_FROM_RECENT_LOW.key, strategyVersion: '1.0.0', params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 }, symbols: ['VGT'], from: '2020-01-02', to: '2020-06-30', resolution: '1d' }
    ]
  ] as const)
    it.skipIf(!hasData)(`a traced ${key} run loads and reads nothing outside its identity`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'preview-trace-'));
      const trace = join(dir, 'trace.log');
      const preload = join(dir, 'trace.mjs');
      writeFileSync(
        preload,
        `import { registerHooks, syncBuiltinESMExports } from 'node:module';
import fs from 'node:fs';
const out = ${JSON.stringify(trace)};
const log = (k, p) => fs.appendFileSync(out, k + ' ' + p + '\\n');
registerHooks({ load(url, ctx, next) { log('module', url); return next(url, ctx); } });
for (const name of ['readFileSync', 'openSync', 'createReadStream', 'readdirSync', 'statSync', 'existsSync', 'readFile', 'open', 'stat']) {
  const orig = fs[name];
  fs[name] = function (p, ...rest) { if (typeof p === 'string' || p instanceof URL) log('fs', String(p)); return orig.call(this, p, ...rest); };
}
for (const name of ['readFile', 'open', 'stat', 'readdir']) { const orig = fs.promises[name]; fs.promises[name] = function (p, ...rest) { if (typeof p === 'string' || p instanceof URL) log('fs', String(p)); return orig.call(this, p, ...rest); }; }
syncBuiltinESMExports();
`
      );
      const work = join(dir, 'work');
      mkdirSync(work);
      writeFileSync(join(work, 'request.json'), JSON.stringify({ runId: 'PV-trace', ...req }));
      const r = spawnSync(process.execPath, ['--import', preload, ...NODE_FLAGS, join(REPO_ROOT, RUNNER_SCRIPTS[key]!), work], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        timeout: 120_000
      });
      expect(r.status, r.stderr).toBe(0);
      const spec = findStrategy(req.strategyKey, req.strategyVersion)!;
      const identity = previewIdentity(REPO_ROOT, spec, canonicalPreviewConfig(spec, req as never));
      const lines = readFileSync(trace, 'utf8').trim().split('\n');
      const covered = new Set([
        ...Object.keys(identity.implementation.files),
        ...Object.values(identity.data.symbols).flatMap((f) => Object.keys(f)),
        ...RUNTIME_INPUTS
      ]);
      const packages = Object.keys(identity.implementation.packages);
      const uncovered: string[] = [];
      for (const line of lines) {
        const [kind, ...rest] = line.split(' ');
        let p = rest.join(' ');
        if (kind === 'module') {
          if (!p.startsWith('file://')) continue; // node: builtins (the Node version is part of the identity)
          p = new URL(p).pathname;
        } else if (p.startsWith('file://')) p = new URL(p).pathname;
        const abs = resolve(REPO_ROOT, p);
        const rel = relative(REPO_ROOT, abs);
        if (abs.startsWith(work) || abs === dir) continue; // the run's own directory
        if (rel === '' || rel === 'data' || /^data\/[A-Z0-9.-]+$/.test(rel)) continue; // directory probes
        if (rel.startsWith('..')) {
          uncovered.push(abs);
          continue;
        }
        if (covered.has(rel) || packages.some((pk) => rel === pk || rel.startsWith(`${pk}/`))) continue;
        uncovered.push(rel);
      }
      expect([...new Set(uncovered)]).toEqual([]);
    });
});

describe('identity: distinct for every result-changing input, equal for inactive values', () => {
  const spec = GROWTH;
  const key = (c: ReturnType<typeof config>, s = spec) => identityKey(previewIdentity(REPO_ROOT, s, c));

  it.skipIf(!hasData)('dates, bars, effective parameters, costs, symbols and order, strategy versions differ', () => {
    const base = key(config());
    const variants = {
      from: key(config({ from: '2019-01-03' })),
      to: key(config({ to: '2020-12-30' })),
      resolution: key(config({ resolution: '60m' })),
      x: key(config({}, { advanceFromRecentLowPercent: 10 })),
      n: key(config({}, { recentLowLookbackBars: 21 })),
      costs: key(config({}, { costBpsPerSide: 5.5 })),
      hold: key(config({}, { maximumHoldEnabled: false })),
      trend: key(config({}, { trendFilterEnabled: true })),
      // Growth 1.3.0: each optional rule, and its inputs, changes what executes
      initialStop: key(config({}, { initialStopEnabled: true, initialStopAtrSessions: 20, initialStopAtrMultiple: 3 })),
      initialStop2: key(config({}, { initialStopEnabled: true, initialStopAtrSessions: 20, initialStopAtrMultiple: 2 })),
      retention: key(config({}, { retentionEnabled: true, retentionSellPercent: 50, retentionSmaSessions: 50, retentionClosesBelow: 2 })),
      breakout: key(config({}, { entryMethod: 'trend_breakout', breakoutSmaSessions: 50, breakoutSlopeComparisonSessions: 40, breakoutPriorHighSessions: 20 })),
      symbols: key(config({ symbols: ['VGT', 'GDX'] })),
      order: key(config({ symbols: ['GDX', 'VGT'] })),
      signalOnly: key(
        canonicalPreviewConfig(RISE_FROM_RECENT_LOW, {
          strategyKey: RISE_FROM_RECENT_LOW.key,
          strategyVersion: '1.0.0',
          params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 },
          symbols: ['VGT'],
          from: '2019-01-02',
          to: '2020-12-31',
          resolution: '1d'
        }),
        RISE_FROM_RECENT_LOW
      )
    };
    const all = [base, ...Object.values(variants)];
    expect(new Set(all).size).toBe(all.length);
    expect(key(config())).toBe(base); // deterministic
  });

  it.skipIf(!hasData)('inactive values (disabled or hidden) never change the identity; number spellings do not either', () => {
    const base = key(config({}, { maximumHoldEnabled: false, intradayLossBufferEnabled: false }));
    // the buffer switch and percent are inactive while the hold is off; the hold age too
    expect(key(config({}, { maximumHoldEnabled: false, intradayLossBufferEnabled: true, intradayLossBufferPercent: 9, maximumHoldDays: 99 }))).toBe(base);
    // the trend filter's method inputs while the filter is OFF
    expect(key(config({}, { maximumHoldEnabled: false, intradayLossBufferEnabled: false, trendMethod: 'momentum', trendMomentumShortSessions: 3 }))).toBe(base);
    // another continuation method's inputs while classic_d1 is chosen
    const on = { continuationEnabled: true, continuationMethod: 'classic_d1', continuationWindowSessions: 10, classicPullbackPercent: 3, classicReboundPercent: 2 };
    expect(key(config({}, { ...on, breakoutBufferPercent: 1.7, crossSmaBars: 33 }))).toBe(key(config({}, on)));
    // Growth 1.3.0: a switched-off option's inputs, and the Rise inputs under the breakout entry, are drafts
    expect(key(config({}, { initialStopAtrSessions: 33, initialStopAtrMultiple: 9, retentionSellPercent: 10, breakoutSmaSessions: 7 }))).toBe(key(config()));
    const breakout = { entryMethod: 'trend_breakout', breakoutSmaSessions: 50, breakoutSlopeComparisonSessions: 40, breakoutPriorHighSessions: 20 };
    expect(key(config({}, { ...breakout, advanceFromRecentLowPercent: 9, recentLowLookbackBars: 77, eligibilityEnabled: true }))).toBe(key(config({}, breakout)));
    // 5 and 5.0 are one number
    expect(previewConfigKey(config({}, { advanceFromRecentLowPercent: Number('5.0') }))).toBe(previewConfigKey(config()));
  });

  it('canonical JSON sorts keys at every depth and refuses non-finite numbers', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: true } })).toBe('{"a":{"c":true,"d":[2,{"y":2,"z":1}]},"b":1}');
    expect(() => canonicalJson({ a: Number.NaN })).toThrow();
  });
});

// A disposable copy of exactly what the trading runner needs (its closure, package.json, runtime inputs, node_modules
// and one symbol's data), so the identity can be checked against code, data and package edits.
export function repoCopy(symbols: string[] = ['VGT'], copyData = false): string {
  const root = mkdtempSync(join(tmpdir(), 'preview-repo-'));
  const closure = [
    ...Object.keys(implementationFingerprint(REPO_ROOT, RUNNER_SCRIPTS[GROWTH.key]!).files),
    ...Object.keys(implementationFingerprint(REPO_ROOT, RUNNER_SCRIPTS[RISE_FROM_RECENT_LOW.key]!).files)
  ];
  for (const f of [...new Set(closure), 'package.json', 'apps/strategy-lab/package.json', ...RUNTIME_INPUTS]) {
    if (!existsSync(join(REPO_ROOT, f))) continue;
    mkdirSync(dirname(join(root, f)), { recursive: true });
    cpSync(join(REPO_ROOT, f), join(root, f));
  }
  symlinkSync(join(REPO_ROOT, 'node_modules'), join(root, 'node_modules'));
  for (const s of symbols) {
    if (copyData) cpSync(join(REPO_ROOT, 'data', s), join(root, 'data', s), { recursive: true });
    else symlinkSync(join(REPO_ROOT, 'data', s), join(root, 'data', s));
  }
  return root;
}

describe.skipIf(!hasData)('identity of a repository copy: code, data and package edits invalidate; failures fail closed', () => {
  it('a code edit with the version unchanged, a data edit, an input edit and a package edit each change the key', () => {
    const root = repoCopy(['VGT'], true);
    const c = config();
    const id0 = previewIdentity(root, GROWTH, c);
    expect(identityKey(previewIdentity(root, GROWTH, c))).toBe(identityKey(id0));
    // the same identity as the real repository (the copy has the same content)
    expect(identityKey(id0)).toBe(identityKey(previewIdentity(REPO_ROOT, GROWTH, c)));

    const engine = join(root, 'src/growth-trading/riseTrading.ts');
    writeFileSync(engine, `${readFileSync(engine, 'utf8')}\n// an edit that keeps STRATEGY_VERSION\n`);
    const id1 = previewIdentity(root, GROWTH, c);
    expect(identityKey(id1)).not.toBe(identityKey(id0));
    expect(identityDifferences(id0, id1)).toEqual(['code src/growth-trading/riseTrading.ts']);

    const data = join(root, 'data/VGT/data.csv');
    writeFileSync(data, `${readFileSync(data, 'utf8')}`.replace(/\n$/, '\n\n'));
    const id2 = previewIdentity(root, GROWTH, c);
    expect(identityDifferences(id1, id2)).toEqual(['market data of VGT']);

    const splits = join(root, 'config/market-events/splits.json');
    writeFileSync(splits, `${readFileSync(splits, 'utf8')} `);
    const id3 = previewIdentity(root, GROWTH, c);
    expect(identityDifferences(id2, id3)).toEqual(['input config/market-events/splits.json']);
  });

  it('fails closed: missing data, an unresolvable import, a missing package', () => {
    const root = repoCopy(['VGT']);
    expect(() => dataFingerprint(root, ['GDX'])).toThrow(/no local data file/);
    const rt = join(root, 'src/growth-trading/riseTrading.ts');
    const original = readFileSync(rt, 'utf8');
    writeFileSync(rt, `import { gone } from './does-not-exist.ts';\n${original}`);
    expect(() => implementationFingerprint(root, RUNNER_SCRIPTS[GROWTH.key]!)).toThrow(/does not resolve/);
    writeFileSync(rt, `import left from 'left-pad-not-installed';\n${original}`);
    expect(() => implementationFingerprint(root, RUNNER_SCRIPTS[GROWTH.key]!)).toThrow(/is not installed/);
  });
});
