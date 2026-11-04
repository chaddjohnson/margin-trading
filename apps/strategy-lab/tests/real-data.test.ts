// Real-data integration (skipped when the git-ignored data/ files or the Study 8 runner output are absent):
// one manual single run through the real job manager and runner, and the Study 8 vg-balanced import with its
// independent verification (and refusal of a tampered ledger).

import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { type Config, loadConfig, REPO_ROOT } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { importStudy8 } from '../importers/study8.ts';
import { readEvents } from '../server/artifacts.ts';
import { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { LabService } from '../server/service.ts';

const hasData = existsSync(join(REPO_ROOT, 'data/VGT/data.csv'));
const importsDir = join(REPO_ROOT, 'state/strategy-lab/imports/study8');
const study8Out = existsSync(importsDir)
  ? readdirSync(importsDir)
      .filter((d) => d.endsWith('-s8-vg-balanced') && existsSync(join(importsDir, d, 'runner.json')))
      .sort()
      .at(-1)
  : undefined;

const cfg = (): Config =>
  loadConfig({
    STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-real-')),
    STRATEGY_LAB_STATIC_DIR: '',
    STRATEGY_LAB_SEED_DEMO: '0'
  });

const waitFor = async (fn: () => boolean, ms = 90_000) => {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 200));
  }
};

describe.skipIf(!hasData)('manual single run on real data', () => {
  it('runs one configuration in the runner process, persists it, and survives a restart', async () => {
    const c = cfg();
    const db = openDb(c.dbFile);
    const repo = new Repo(db);
    const jobs = new Jobs(repo, c);
    const service = new LabService(repo, c, jobs, new MarketPrices(c.repoRoot));
    const r = service.createManualRun({
      strategyKey: 'rise-from-recent-low',
      strategyVersion: '1.0.0',
      params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 },
      symbols: ['VGT', 'GDX'],
      from: '2020-01-02',
      to: '2020-12-31',
      resolution: '1d',
      title: 'integration'
    });
    if ('errors' in r) throw new Error(r.errors.join('; '));
    await waitFor(() => ['completed', 'failed'].includes(repo.runDetail(r.runId)!.status));
    const run = repo.runDetail(r.runId)!;
    expect(run.error).toBeNull();
    expect(run.status).toBe('completed');
    const file = readEvents(join(c.stateDir, run.artifactDir!), run.artifact.sha256);
    expect(file.events.length).toBe(run.eventCount);
    expect(file.events.length).toBeGreaterThan(0);
    expect(file.events.every((e) => e.kind === 'entry_signal' && ['VGT', 'GDX'].includes(e.symbol))).toBe(true);
    expect(file.events.every((e) => e.t >= '2020-01-02' && e.t <= '2021-01-01')).toBe(true);
    const prov = run.provenance as { runner: { symbols: Record<string, { dataSha256: string; access: string }> } };
    expect(prov.runner.symbols.VGT!.dataSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(prov.runner.symbols.VGT!.access).toBe('manual evaluation');
    db.close();

    // Restart: the same database, a new process state.
    const db2 = openDb(c.dbFile);
    const again = new Repo(db2).runDetail(r.runId)!;
    expect(again.status).toBe('completed');
    expect(again.eventCount).toBe(run.eventCount);
    // A second identical request is a new run of the same variation, and reproduces the events exactly.
    const jobs2 = new Jobs(new Repo(db2), c);
    const r2 = new LabService(new Repo(db2), c, jobs2, new MarketPrices(c.repoRoot)).createManualRun({
      strategyKey: 'rise-from-recent-low',
      strategyVersion: '1.0.0',
      params: { advanceFromRecentLowPercent: 5, recentLowLookbackBars: 20 },
      symbols: ['VGT', 'GDX'],
      from: '2020-01-02',
      to: '2020-12-31',
      resolution: '1d'
    });
    if ('errors' in r2) throw new Error(r2.errors.join('; '));
    await waitFor(() => ['completed', 'failed'].includes(new Repo(db2).runDetail(r2.runId)!.status));
    const run2 = new Repo(db2).runDetail(r2.runId)!;
    expect(run2.variation.id).toBe(run.variation.id);
    const e1 = readEvents(join(c.stateDir, run.artifactDir!), null).events.map((e) => [e.symbol, e.t, e.price]);
    const e2 = readEvents(join(c.stateDir, run2.artifactDir!), null).events.map((e) => [e.symbol, e.t, e.price]);
    expect(e2).toEqual(e1);
    db2.close();
  }, 120_000);
});

describe.skipIf(!hasData || !study8Out)('Study 8 vg-balanced import', () => {
  it('imports entries and exits that match the sealed record, per symbol', () => {
    const c = cfg();
    const repo = new Repo(openDb(c.dbFile));
    const report = importStudy8(c, repo, join(importsDir, study8Out!));
    expect(report.lots).toBe(48);
    expect(report.bySymbol).toEqual({
      GDX: { entries: 42, exits: 41, rejected: 7 },
      VGT: { entries: 6, exits: 6, rejected: 7 }
    });
    const run = repo.runDetail(report.runId)!;
    const events = readEvents(join(c.stateDir, run.artifactDir!), run.artifact.sha256).events;
    const sealed = JSON.parse(readFileSync(join(importsDir, study8Out!, 'lots.json'), 'utf8')).lots as {
      symbol: string;
      entryTimeUtc: string;
      entryFillPrice: number;
    }[];
    for (const l of sealed) {
      const e = events.find(
        (x) => x.kind === 'executed_entry' && x.symbol === l.symbol && Date.parse(x.t) === Date.parse(l.entryTimeUtc)
      );
      expect(e?.price).toBe(l.entryFillPrice);
    }
    expect(
      events.filter((e) => e.kind === 'rejected_signal').every((e) => e.price === null && e.priceBasis === 'unknown')
    ).toBe(true);
    expect(() => importStudy8(c, repo, join(importsDir, study8Out!))).toThrow(/already imported/);
  });

  it('refuses a runner output whose ledger disagrees with the sealed record', () => {
    const c = cfg();
    const repo = new Repo(openDb(c.dbFile));
    const copy = mkdtempSync(join(tmpdir(), 's8-tampered-'));
    cpSync(join(importsDir, study8Out!), copy, { recursive: true });
    const lots = JSON.parse(readFileSync(join(copy, 'lots.json'), 'utf8'));
    lots.lots[3].net += 100;
    writeFileSync(join(copy, 'lots.json'), JSON.stringify(lots));
    expect(() => importStudy8(c, repo, copy)).toThrow(/differs from the sealed record/);
  });
});
