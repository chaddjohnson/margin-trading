// Real data (skipped without the git-ignored data/ files): reproducibility at the RUNNER level.
// 1. The before-change runner artifacts of rise-from-recent-low-trading@1.0.0 (tests/fixtures/
//    growth-runner-baseline-1.0.0: R-900001 VGT+GDX daily 2016–2023, R-900002 VGT 60m 2018–2020, captured at b590c60
//    with the unchanged runner) are reproduced by the current runner replaying the same 1.0.0 requests (1.2.0 with
//    continuation and both entry gates OFF): every stored field of trades.json, daily.json and metrics.json and every
//    stored event.
// 1b. The before-change runner artifacts of rise-from-recent-low-trading@1.1.0 (tests/fixtures/
//    growth-runner-baseline-1.1.0: R-910001 VGT+GDX daily OFF, R-910002 VGT daily breakout, R-910003 GDX 60m classic_d1,
//    captured at 0301c01 with the unchanged runner) are reproduced (a) by replaying the stored 1.1.0 requests and (b) by
//    the SAME configurations as 1.2.0 requests with the entry trend filter and persistent eligibility OFF: trades.json,
//    daily.json and events.json in full, every stored field of metrics.json and decisions.json, the minute marks.
// 1c. The before-change runner artifacts of rise-from-recent-low-trading@1.2.0 (tests/fixtures/
//    growth-runner-baseline-1.2.0, captured at 8d2800e with the unchanged runner: R-920001 Candidate A, R-920002 VGT+GDX
//    trend A + eligibility 1 + ma_cross, R-920003 GDX 60m trend B + eligibility 5 + buffer OFF, R-920005 buffer OFF,
//    R-920007 hold OFF) are reproduced (a) by replaying the stored 1.2.0 requests, (b) by the SAME configurations as
//    1.3.0 requests with the Rise entry and both new exit options OFF, and (c) — the 1.2.0 "buffer OFF" failure —
//    by the same configurations reduced to their EFFECTIVE values (R-920004, R-920006: what Interactive Preview
//    executes; the unchanged 1.2.0 runner refused them).
// 1d. The before-change runner artifacts of rise-from-recent-low-trading@1.3.0 (tests/fixtures/
//    growth-runner-baseline-1.3.0, captured at d13148a with the unchanged runner: R-930001 VGT+GDX breakout + trend A +
//    continuation breakout + initial stop, R-930002 VGT + trend C + initial stop + retention, R-930003 GDX 60m trend D +
//    eligibility 2 + initial stop + classic_d1, R-930004 XBI retention + hold OFF + eligibility 3 + trend C as EFFECTIVE
//    values only) are reproduced (a) by replaying the stored 1.3.0 requests and (b) by the SAME configurations as 1.4.0
//    requests with the Drawdown Recovery Gate OFF: trades.json, daily.json, events.json and decisions.json byte for
//    byte, the minute marks, and every stored field of metrics.json (1.4.0 adds only drawdownGate {enabled: false}).
// 2. The shared-slot pool rerun (runner/pool-run.ts) to the sealed end gives the same events as the Study 8 importer
//    applied to the same runner output, and reconciles with the sealed F24 record.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import { importStudy8 } from '../importers/study8.ts';
import { readEvents, sha256 } from '../server/artifacts.ts';
import { loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { compareRunOutputs } from '../server/replay.ts';
import { Repo } from '../server/repo.ts';

const hasData = ['VGT', 'GDX'].every((s) => existsSync(join(REPO_ROOT, 'data', s, 'data.csv')));
const hasStudy8 = existsSync(join(REPO_ROOT, 'research/study8-expanded-regime-d1/FROZEN_SELECTION.json'));
const FIXTURES = join(import.meta.dirname, 'fixtures/growth-runner-baseline-1.0.0');
const runner = (script: string, dir: string) =>
  spawnSync(process.execPath, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--max-old-space-size=6144', join(REPO_ROOT, script), dir], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 600_000
  });

describe.skipIf(!hasData)('runner-level reproducibility of Growth 1.0.0 (real data)', () => {
  for (const id of ['R-900001', 'R-900002'])
    it(`${id}: the current runner reproduces the 1.0.0 artifacts captured before the change`, () => {
      const dir = join(mkdtempSync(join(tmpdir(), 'strategy-lab-parity-')), id);
      mkdirSync(dir);
      writeFileSync(join(dir, 'request.json'), gunzipSync(readFileSync(join(FIXTURES, id, 'request.json.gz'))));
      const r = runner('apps/strategy-lab/runner/trading-run.ts', dir);
      expect(r.status, r.stderr).toBe(0);
      const verdicts = compareRunOutputs(join(FIXTURES, id), dir, 'legacy');
      expect(verdicts.map((v) => [v.file, v.identical])).toEqual([
        ['trades.json', true],
        ['daily.json', true],
        ['metrics.json', true],
        ['events.json', true]
      ]);
      const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8'));
      expect(metrics.strategy).toMatchObject({ version: '1.0.0', engineVersion: '1.4.0' });
    }, 600_000);
});

const FIXTURES_11 = join(import.meta.dirname, 'fixtures/growth-runner-baseline-1.1.0');
const sums = (): Record<string, string> =>
  Object.fromEntries(
    readFileSync(join(FIXTURES_11, 'SHA256SUMS'), 'utf8')
      .trim()
      .split('\n')
      .map((l) => [l.split(/\s+/)[1]!, l.split(/\s+/)[0]!])
  );

describe.skipIf(!hasData)('runner-level OFF/OFF parity with Growth 1.1.0 (real data)', () => {
  for (const id of ['R-910001', 'R-910002', 'R-910003'])
    for (const as of ['1.1.0 (replay)', '1.2.0 with both gates OFF'] as const)
      it(`${id} as ${as}: identical to the 1.1.0 artifacts captured before the change`, () => {
        const dir = join(mkdtempSync(join(tmpdir(), 'strategy-lab-parity-')), id);
        mkdirSync(dir);
        const stored = JSON.parse(gunzipSync(readFileSync(join(FIXTURES_11, id, 'request.json.gz'))).toString('utf8'));
        const request =
          as === '1.1.0 (replay)'
            ? stored
            : { ...stored, strategyVersion: '1.2.0', params: { ...stored.params, trendFilterEnabled: false, eligibilityEnabled: false } };
        writeFileSync(join(dir, 'request.json'), JSON.stringify(request));
        const r = runner('apps/strategy-lab/runner/trading-run.ts', dir);
        expect(r.status, r.stderr + r.stdout).toBe(0);
        const verdicts = compareRunOutputs(join(FIXTURES_11, id), dir, 'legacy-1.1.0');
        expect(verdicts.map((v) => [v.file, v.identical])).toEqual([
          ['trades.json', true],
          ['daily.json', true],
          ['metrics.json', true],
          ['decisions.json', true],
          ['events.json', true]
        ]);
        // the events byte for byte (the runId is the stored one), and the minute marks' content
        expect(sha256(readFileSync(join(dir, 'events.json')))).toBe(sums()[`${id}/events.json`]);
        expect(sha256(readFileSync(join(dir, 'trades.json')))).toBe(sums()[`${id}/trades.json`]);
        expect(sha256(readFileSync(join(dir, 'daily.json')))).toBe(sums()[`${id}/daily.json`]);
        expect(sha256(gunzipSync(readFileSync(join(dir, 'minute-marks.csv.gz'))))).toBe(sums()[`${id}/minute-marks.csv`]);
        const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8'));
        expect(metrics.trendFilter).toEqual({ enabled: false });
        expect(metrics.eligibility).toEqual({ enabled: false });
        expect(metrics.strategy).toMatchObject({ version: request.strategyVersion, engineVersion: '1.4.0' });
      }, 600_000);
});

const FIXTURES_12 = join(import.meta.dirname, 'fixtures/growth-runner-baseline-1.2.0');
const sums12 = (): Record<string, string> =>
  Object.fromEntries(
    readFileSync(join(FIXTURES_12, 'SHA256SUMS'), 'utf8')
      .trim()
      .split('\n')
      .map((l) => [l.split(/\s+/)[1]!, l.split(/\s+/)[0]!])
  );
const stored12 = (id: string) =>
  JSON.parse(gunzipSync(readFileSync(join(FIXTURES_12, id, 'request.json.gz'))).toString('utf8'));
const OFF_1_3_0 = { entryMethod: 'rise_from_recent_low', initialStopEnabled: false, retentionEnabled: false };

describe.skipIf(!hasData)('runner-level OFF parity with Growth 1.2.0 (real data)', () => {
  type Req = { params: Record<string, unknown> } & Record<string, unknown>;
  const cases: [string, string, (r: Req) => Req][] = [];
  for (const id of ['R-920001', 'R-920002', 'R-920003', 'R-920005', 'R-920007']) {
    cases.push([id, '1.2.0 (replay)', (r) => r]);
    cases.push([id, '1.3.0 with the three OFF', (r) => ({ ...r, strategyVersion: '1.3.0', params: { ...r.params, ...OFF_1_3_0 } })]);
  }
  // the effective-only forms (Interactive Preview): reproduce the run that carried the drafts
  cases.push(['R-920005', '1.2.0 effective values only (R-920004)', () => ({ ...stored12('R-920004'), runId: 'R-920005' })]);
  cases.push(['R-920007', '1.2.0 effective values only (R-920006)', () => ({ ...stored12('R-920006'), runId: 'R-920007' })]);
  cases.push(['R-920007', '1.3.0 effective values only', () => ({ ...stored12('R-920006'), runId: 'R-920007', strategyVersion: '1.3.0', params: { ...stored12('R-920006').params, ...OFF_1_3_0 } })]);
  for (const [id, as, make] of cases)
    it(`${id} as ${as}: identical to the 1.2.0 artifacts captured before the change`, () => {
      const dir = join(mkdtempSync(join(tmpdir(), 'strategy-lab-parity-')), id);
      mkdirSync(dir);
      const request = make(stored12(id));
      writeFileSync(join(dir, 'request.json'), JSON.stringify(request));
      const r = runner('apps/strategy-lab/runner/trading-run.ts', dir);
      expect(r.status, r.stderr + r.stdout).toBe(0);
      const verdicts = compareRunOutputs(join(FIXTURES_12, id), dir, 'legacy-1.2.0');
      expect(verdicts.map((v) => [v.file, v.identical])).toEqual([
        ['trades.json', true],
        ['daily.json', true],
        ['metrics.json', true],
        ['decisions.json', true],
        ['events.json', true]
      ]);
      expect(sha256(readFileSync(join(dir, 'events.json')))).toBe(sums12()[`${id}/events.json`]);
      expect(sha256(readFileSync(join(dir, 'trades.json')))).toBe(sums12()[`${id}/trades.json`]);
      expect(sha256(readFileSync(join(dir, 'daily.json')))).toBe(sums12()[`${id}/daily.json`]);
      expect(sha256(gunzipSync(readFileSync(join(dir, 'minute-marks.csv.gz'))))).toBe(sums12()[`${id}/minute-marks.csv`]);
      const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8'));
      expect(metrics.initialStop).toEqual({ enabled: false });
      expect(metrics.retention).toEqual({ enabled: false });
      expect(metrics.entryMethod).toMatchObject({ method: 'rise_from_recent_low' });
      expect(metrics.strategy).toMatchObject({ version: request.strategyVersion, engineVersion: '1.4.0' });
      for (const sym of Object.keys(metrics.perSymbol)) expect(metrics.perSymbol[sym].optionalRules).toBeUndefined();
    }, 600_000);
});

const FIXTURES_13 = join(import.meta.dirname, 'fixtures/growth-runner-baseline-1.3.0');
const sums13 = (): Record<string, string> =>
  Object.fromEntries(
    readFileSync(join(FIXTURES_13, 'SHA256SUMS'), 'utf8')
      .trim()
      .split('\n')
      .map((l) => [l.split(/\s+/)[1]!, l.split(/\s+/)[0]!])
  );
const stored13 = (id: string) =>
  JSON.parse(gunzipSync(readFileSync(join(FIXTURES_13, id, 'request.json.gz'))).toString('utf8'));

describe.skipIf(!hasData || !['XBI'].every((s) => existsSync(join(REPO_ROOT, 'data', s, 'data.csv'))))(
  'runner-level OFF parity with Growth 1.3.0 (real data)',
  () => {
    type Req = { params: Record<string, unknown> } & Record<string, unknown>;
    const cases: [string, string, (r: Req) => Req][] = [];
    for (const id of ['R-930001', 'R-930002', 'R-930003', 'R-930004']) {
      cases.push([id, '1.3.0 (replay)', (r) => r]);
      cases.push([id, '1.4.0 with the gate OFF', (r) => ({ ...r, strategyVersion: '1.4.0', params: { ...r.params, drawdownRecoveryGateEnabled: false } })]);
    }
    for (const [id, as, make] of cases)
      it(`${id} as ${as}: identical to the 1.3.0 artifacts captured before the change`, () => {
        const dir = join(mkdtempSync(join(tmpdir(), 'strategy-lab-parity-')), id);
        mkdirSync(dir);
        const request = make(stored13(id));
        writeFileSync(join(dir, 'request.json'), JSON.stringify(request));
        const r = runner('apps/strategy-lab/runner/trading-run.ts', dir);
        expect(r.status, r.stderr + r.stdout).toBe(0);
        const verdicts = compareRunOutputs(join(FIXTURES_13, id), dir, 'legacy-1.3.0');
        expect(verdicts.map((v) => [v.file, v.identical])).toEqual([
          ['trades.json', true],
          ['daily.json', true],
          ['metrics.json', true],
          ['decisions.json', true],
          ['events.json', true]
        ]);
        for (const f of ['events.json', 'trades.json', 'daily.json', 'decisions.json'])
          expect(sha256(readFileSync(join(dir, f))), f).toBe(sums13()[`${id}/${f}`]);
        expect(sha256(gunzipSync(readFileSync(join(dir, 'minute-marks.csv.gz'))))).toBe(sums13()[`${id}/minute-marks.csv`]);
        const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8'));
        expect(metrics.drawdownGate).toEqual({ enabled: false });
        expect(metrics.strategy).toMatchObject({ version: request.strategyVersion, engineVersion: '1.4.0' });
        // metrics.json = the stored one plus only the run-level drawdownGate record and the engine version
        const stored = JSON.parse(gunzipSync(readFileSync(join(FIXTURES_13, id, 'metrics.json.gz'))).toString('utf8'));
        const without = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
        expect(without(metrics, ['drawdownGate', 'strategy'])).toEqual(without(stored, ['strategy']));
        for (const sym of Object.keys(metrics.perSymbol)) expect(metrics.perSymbol[sym].drawdownGate).toBeUndefined();
      }, 600_000);
  }
);

describe.skipIf(!hasData || !hasStudy8)('shared-slot pool rerun = the importer on the same Study 8 output (real data)', () => {
  it('s8-vg-balanced to 2026-10-29: reconciled, the importer’s events exactly', () => {
    const root = mkdtempSync(join(tmpdir(), 'strategy-lab-pool-'));
    const dir = join(root, 'runs', 'R-000001');
    mkdirSync(dir, { recursive: true });
    const request = {
      runId: 'R-000001',
      kind: 'study8-pool-rerun',
      strategyKey: 'study8-d1-pool',
      strategyVersion: 'pools-engine',
      phenotypeId: 'PH-0001',
      alias: 's8-vg-balanced',
      sealedId: 'VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d',
      end: '2026-10-29',
      costBps: 5,
      symbols: ['GDX', 'VGT']
    };
    writeFileSync(join(dir, 'request.json'), JSON.stringify(request));
    const r = runner('apps/strategy-lab/runner/pool-run.ts', dir);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const metrics = JSON.parse(readFileSync(join(dir, 'metrics.json'), 'utf8'));
    expect(metrics.reconciliation).toMatchObject({ applicable: true, pass: true });
    expect(metrics.trades).toMatchObject({ lots: 48, openLots: 1, refusedSignals: 14 });
    const pool = readEvents(dir, null).events;
    // the importer, given the very same runner output, into a separate state
    const cfg = loadConfig({ STRATEGY_LAB_STATE_DIR: join(root, 'import-state'), STRATEGY_LAB_SEED_DEMO: '0', STRATEGY_LAB_STATIC_DIR: '' });
    const repo = new Repo(openDb(cfg.dbFile));
    const report = importStudy8(cfg, repo, join(dir, 'study8'));
    const imported = readEvents(join(cfg.stateDir, 'runs', report.runId), null).events;
    const norm = (es: typeof pool) => es.map((e) => ({ ...e, runId: 'R' }));
    expect(norm(pool)).toEqual(norm(imported));
    expect(pool).toHaveLength(109);
    repo.db.close();
  }, 600_000);
});
