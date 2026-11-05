// Deleting ONE saved run (server/delete-run.ts, migration 0003, DELETE /api/runs/:id): exactly that run's rows, notes,
// bookmark and artifact directory go; its variation, the strategy, other runs and their files, notes and bookmarks
// stay; ids are never reused or renumbered; unknown, active, referenced and already-deleted runs are refused; a failure
// at any step leaves the run intact (or, after the commit, is reported and purged at the next start); concurrent and
// duplicate requests are refused; the HTTP route needs the id repeated in the body; deleted demo runs are not reseeded.

import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { runDirName } from '../server/artifacts.ts';
import { type Config, loadConfig } from '../server/config.ts';
import { openDb } from '../server/db.ts';
import { DeleteRunError, deleteRun, recoverRunDeletions, trashDirOf } from '../server/delete-run.ts';
import { createHandler } from '../server/http.ts';
import type { Jobs } from '../server/jobs.ts';
import { MarketPrices } from '../server/prices.ts';
import { Repo } from '../server/repo.ts';
import { seedDemo } from '../server/seed-demo.ts';
import { LabService } from '../server/service.ts';

let cfg: Config;
let repo: Repo;

const fresh = () => {
  cfg = loadConfig({
    STRATEGY_LAB_STATE_DIR: mkdtempSync(join(tmpdir(), 'strategy-lab-delete-')),
    STRATEGY_LAB_STATIC_DIR: '',
    STRATEGY_LAB_SEED_DEMO: '0'
  });
  repo = new Repo(openDb(cfg.dbFile));
  seedDemo(repo, cfg);
};
const dirOf = (id: string) => join(cfg.stateDir, runDirName(id));
const filesHash = (id: string) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        readdirSync(dirOf(id))
          .sort()
          .map((f) => [
            f,
            createHash('sha256')
              .update(readFileSync(join(dirOf(id), f)))
              .digest('hex')
          ])
      )
    )
    .digest('hex');
const rowHash = (id: string) =>
  createHash('sha256')
    .update(JSON.stringify(repo.runRow(id)))
    .digest('hex');
const ids = () => repo.listRuns({ limit: 500 }).map((r) => r.id);
const expectError = (fn: () => unknown, status: number, message: RegExp) => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DeleteRunError);
    expect((e as DeleteRunError).status).toBe(status);
    expect((e as DeleteRunError).message).toMatch(message);
    return;
  }
  throw new Error('expected a DeleteRunError');
};
// A second run on the variation of `id` (left queued unless finished), for the shared-variation and active cases.
const sibling = (id: string) => {
  const row = repo.runRow(id)!;
  const r = repo.createRun({
    variationId: Number(row.variation_id),
    title: 'sibling',
    kind: 'demo',
    status: 'queued',
    dataOrigin: 'synthetic',
    symbols: JSON.parse(String(row.symbols_json)),
    window: { from: String(row.window_from), to: String(row.window_to), resolution: null, partition: null },
    params: [],
    assumptions: [],
    request: null,
    priceSource: JSON.parse(String(row.price_source_json)),
    provenance: {},
    codeRevision: null
  });
  return r;
};

describe('the database guard (migration 0003)', () => {
  beforeEach(fresh);

  it('a plain DELETE of a run, or of a deletion record, is refused by the database', () => {
    expect(() => repo.db.prepare("DELETE FROM runs WHERE public_id = 'R-000001'").run()).toThrow(
      /deleted only by the explicit run deletion/
    );
    deleteRun(cfg, repo, 'R-000002');
    expect(() => repo.db.prepare('DELETE FROM run_deletions').run()).toThrow(/run deletion records are kept/);
    expect(() => repo.db.prepare('DELETE FROM variations').run()).toThrow(/never deleted/);
    expect(repo.db.prepare('SELECT max(version) AS v FROM schema_migrations').get()).toEqual({ v: 3 });
  });
});

describe('deleting one run', () => {
  beforeEach(fresh);

  it('removes exactly that run: rows, own notes, bookmark, artifact directory; keeps the variation and everything else', () => {
    const target = 'R-000005';
    const others = ids().filter((x) => x !== target);
    const before = Object.fromEntries(others.map((x) => [x, { row: rowHash(x), files: filesHash(x) }]));
    const row = repo.runRow(target)!;
    const variation = repo.db
      .prepare('SELECT public_id FROM variations WHERE id = ?')
      .get(Number(row.variation_id)) as { public_id: string };
    repo.addNote('run', target, 'a note on the run');
    repo.addNote('run', target, 'another');
    repo.addNote('variation', variation.public_id, 'a note on its variation');
    repo.addNote('run', 'R-000006', 'a note on another run');
    repo.setBookmark('run', target, true);
    repo.setBookmark('variation', variation.public_id, true);
    repo.setBookmark('run', 'R-000006', true);
    const counts = (t: string) => Number((repo.db.prepare(`SELECT count(*) AS n FROM ${t}`).get() as { n: number }).n);
    const tables = ['strategies', 'variations', 'experiments', 'phenotypes'];
    const kept = Object.fromEntries(tables.map((t) => [t, counts(t)]));

    const r = deleteRun(cfg, repo, target);

    expect(r).toMatchObject({
      deleted: target,
      notesDeleted: 2,
      bookmarkRemoved: true,
      variation: { id: variation.public_id, kept: true },
      artifacts: { existed: true, purged: true, warning: null }
    });
    expect(repo.runRow(target)).toBeUndefined();
    expect(repo.db.prepare('SELECT count(*) AS n FROM run_symbols WHERE run_id = ?').get(Number(row.id))).toEqual({
      n: 0
    });
    expect(
      repo.db.prepare("SELECT count(*) AS n FROM notes WHERE target_type = 'run' AND target_id = ?").get(Number(row.id))
    ).toEqual({ n: 0 });
    expect(existsSync(dirOf(target))).toBe(false);
    expect(readdirSync(trashDirOf(cfg))).toEqual([]);
    // kept: the variation (its note and bookmark), the strategy, every other run (row, files, note, bookmark)
    expect(repo.listNotes('variation', variation.public_id)!.map((n) => n.body)).toEqual(['a note on its variation']);
    expect(repo.listVariations({ bookmarked: true }).map((v) => v.id)).toContain(variation.public_id);
    expect(repo.listNotes('run', 'R-000006')!.map((n) => n.body)).toEqual(['a note on another run']);
    for (const x of others) {
      if (x === 'R-000006') continue; // its bookmark annotation changed above, on purpose
      expect(rowHash(x), x).toBe(before[x]!.row);
    }
    for (const x of others) expect(filesHash(x), x).toBe(before[x]!.files);
    expect(Object.fromEntries(tables.map((t) => [t, counts(t)]))).toEqual(kept);
    expect(ids()).toEqual(others); // nobody renumbered
    // the tombstone: minimal, no results or notes
    const tomb = repo.db.prepare('SELECT * FROM run_deletions WHERE public_id = ?').get(target) as Record<
      string,
      unknown
    >;
    expect(tomb).toMatchObject({
      state: 'deleted',
      kind: 'demo',
      artifacts_purged: 1,
      trash_dir: null,
      artifact_dir: 'runs/R-000005'
    });
    expect(JSON.parse(String(tomb.summary_json))).toMatchObject({
      variation: variation.public_id,
      notesDeleted: 2,
      bookmarkRemoved: true
    });
    expect(String(tomb.summary_json)).not.toMatch(/a note on the run/);
  });

  it('never reuses an id: deleting the newest run, then creating one, gives the next id', () => {
    const newest = ids()[0]!;
    deleteRun(cfg, repo, newest);
    const next = sibling('R-000001').publicId;
    expect(Number(next.slice(2))).toBe(Number(newest.slice(2)) + 1);
  });

  it('keeps a shared variation and its other run; a failed run without an artifact directory deletes cleanly', () => {
    const s = sibling('R-000003');
    repo.finishUnsuccessfully(s.id, 'failed', 'test', null);
    const r = deleteRun(cfg, repo, 'R-000003');
    expect(r.variation.otherRuns).toBe(1);
    expect(repo.runRow(s.publicId)).toBeDefined();
    const g = deleteRun(cfg, repo, s.publicId);
    expect(g.artifacts).toEqual({ existed: false, purged: true, warning: null });
    expect(repo.listVariations({}).some((v) => v.id === r.variation.id)).toBe(true); // a variation with no run stays
  });

  it('refuses unknown, malformed, already deleted, active, referenced and unexpected-path runs (nothing changes)', () => {
    expectError(() => deleteRun(cfg, repo, 'R-999999'), 404, /no run R-999999/);
    expectError(() => deleteRun(cfg, repo, 'R-*'), 400, /not a run id/);
    expectError(() => deleteRun(cfg, repo, '../R-000001'), 400, /not a run id/);
    deleteRun(cfg, repo, 'R-000007');
    expectError(() => deleteRun(cfg, repo, 'R-000007'), 404, /already deleted/);
    const queued = sibling('R-000001');
    expectError(() => deleteRun(cfg, repo, queued.publicId), 409, /queued: cancel it/);
    repo.markRunning(queued.id);
    expectError(() => deleteRun(cfg, repo, queued.publicId), 409, /running/);
    repo.db.exec(
      `INSERT INTO optimization_batches (id, public_id, title, study_ref, source_path, source_sha256, imported_at) VALUES (1, 'B-0001', 'b', 's', 'p', 'h', 't')`
    );
    repo.db.exec(
      `INSERT INTO optimization_trials (id, batch_id, trial_key, run_id, params_json) VALUES (1, 1, 'k', 2, '{}')`
    );
    expectError(() => deleteRun(cfg, repo, 'R-000002'), 409, /optimisation trial/);
    // a run recording an artifact directory other than its canonical runs/R-… (forced here past the immutability trigger)
    repo.db.exec('DROP TRIGGER runs_results_immutable');
    repo.db.prepare("UPDATE runs SET artifact_dir = 'imports/elsewhere' WHERE public_id = 'R-000004'").run();
    expectError(() => deleteRun(cfg, repo, 'R-000004'), 409, /unexpected artifact directory/);
    expect(existsSync(dirOf('R-000004'))).toBe(true);
    expect(repo.runRow('R-000004')).toBeDefined();
    expect(repo.runRow('R-000002')).toBeDefined();
  });

  it('a concurrent second deletion of the same run is refused while the first runs', () => {
    let second: unknown = null;
    deleteRun(cfg, repo, 'R-000008', {
      during: () => {
        try {
          deleteRun(cfg, repo, 'R-000008');
        } catch (e) {
          second = e;
        }
      }
    });
    expect(second).toBeInstanceOf(DeleteRunError);
    expect((second as DeleteRunError).status).toBe(409);
    expect((second as DeleteRunError).message).toMatch(/already being deleted/);
    expect(repo.runRow('R-000008')).toBeUndefined();
  });
});

describe('failures leave a consistent state', () => {
  beforeEach(fresh);

  it('the move fails: nothing is changed', () => {
    const h = [rowHash('R-000009'), filesHash('R-000009')];
    expectError(
      () => deleteRun(cfg, repo, 'R-000009', { failMove: true }),
      500,
      /NOT deleted: its artifact directory could not be moved/
    );
    expect([rowHash('R-000009'), filesHash('R-000009')]).toEqual(h);
    expect(repo.runDeletion('R-000009')).toBeNull();
  });

  it('the transaction fails: the rows are rolled back and the files moved back', () => {
    repo.addNote('run', 'R-000009', 'keep me');
    const h = [rowHash('R-000009'), filesHash('R-000009')];
    expectError(
      () => deleteRun(cfg, repo, 'R-000009', { failTransaction: true }),
      500,
      /NOT deleted: injected: transaction failed; nothing was changed/
    );
    expect([rowHash('R-000009'), filesHash('R-000009')]).toEqual(h);
    expect(repo.listNotes('run', 'R-000009')!.map((n) => n.body)).toEqual(['keep me']);
    expect(repo.runDeletion('R-000009')).toBeNull();
    expect(readdirSync(trashDirOf(cfg))).toEqual([]);
  });

  it('the transaction AND the move back fail: reported with the location; the next start restores the files', () => {
    const files = filesHash('R-000009');
    expectError(
      () => deleteRun(cfg, repo, 'R-000009', { failTransaction: true, failRestore: true }),
      500,
      /NOT deleted .* restored at the next server start/
    );
    expect(repo.runRow('R-000009')).toBeDefined();
    expect(existsSync(dirOf('R-000009'))).toBe(false);
    const report = recoverRunDeletions(cfg, repo);
    expect(report.restored).toEqual(['R-000009']);
    expect(filesHash('R-000009')).toBe(files);
  });

  it('the purge fails after the commit: deleted, the warning says so, the next start purges the files', () => {
    const r = deleteRun(cfg, repo, 'R-000010', { failPurge: true });
    expect(r.artifacts).toMatchObject({ existed: true, purged: false });
    expect(r.artifacts.warning).toMatch(
      /the run is deleted, but its files could not be removed from trash\/R-000010\.\d+/
    );
    expect(repo.runRow('R-000010')).toBeUndefined();
    expect(readdirSync(trashDirOf(cfg))).toHaveLength(1);
    expect(repo.runDeletion('R-000010')).toMatchObject({ state: 'deleted', artifactsPurged: false });
    const report = recoverRunDeletions(cfg, repo);
    expect(report.purged).toEqual(['R-000010']);
    expect(readdirSync(trashDirOf(cfg))).toEqual([]);
    expect(repo.runDeletion('R-000010')).toMatchObject({ artifactsPurged: true, trashDir: null });
  });

  it('unrelated files in the trash are left alone and reported', () => {
    deleteRun(cfg, repo, 'R-000011', { failPurge: true });
    writeFileSync(join(trashDirOf(cfg), 'something-else'), 'x');
    const report = recoverRunDeletions(cfg, repo);
    expect(report.left).toEqual(['something-else']);
    expect(existsSync(join(trashDirOf(cfg), 'something-else'))).toBe(true);
  });

  it('deleted demo runs are never reseeded at the next start', () => {
    for (const id of ids()) deleteRun(cfg, repo, id);
    expect(ids()).toEqual([]);
    expect(seedDemo(repo, cfg)).toBe(0);
    expect(ids()).toEqual([]);
  });
});

describe('HTTP: DELETE /api/runs/:id', () => {
  let server: Server;
  let base: string;
  beforeAll(async () => {
    fresh();
    const jobs = { enqueue: () => {}, cancel: () => false, activeCount: 0 } as unknown as Jobs;
    const prices = new MarketPrices(cfg.repoRoot);
    const handler = createHandler({
      cfg,
      repo,
      jobs,
      prices,
      service: new LabService(repo, cfg, jobs, prices),
      log: () => {}
    });
    server = createServer((req, res) => void handler(req, res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => server.close());
  const del = (id: string, body?: unknown) =>
    fetch(`${base}/api/runs/${id}`, {
      method: 'DELETE',
      ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    });

  it('needs the id repeated in the body; deletes once; the run is gone from the API afterwards', async () => {
    expect((await del('R-000012')).status).toBe(415);
    expect((await del('R-000012', {})).status).toBe(400);
    expect((await del('R-000012', { confirm: 'R-000011' })).status).toBe(400);
    expect((await del('R-000012', { confirm: 'R-000012', all: true })).status).toBe(400);
    expect(repo.runRow('R-000012')).toBeDefined();
    const ok = await del('R-000012', { confirm: 'R-000012' });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ deleted: 'R-000012', artifacts: { purged: true } });
    expect((await fetch(`${base}/api/runs/R-000012`)).status).toBe(404);
    expect(
      ((await (await fetch(`${base}/api/runs?limit=500`)).json()) as { id: string }[]).map((r) => r.id)
    ).not.toContain('R-000012');
    const again = await del('R-000012', { confirm: 'R-000012' });
    expect(again.status).toBe(404);
    expect(((await again.json()) as { error: string }).error).toMatch(/already deleted/);
    expect((await del('R-123456', { confirm: 'R-123456' })).status).toBe(404);
    expect((await fetch(`${base}/api/runs`, { method: 'DELETE' })).status).toBe(405); // no bulk deletion
    expect((await del('R-0000', { confirm: 'R-0000' })).status).toBe(404); // not a run route
  });
});
