// Data access for Strategy Lab. All SQL lives here. Execution facts are written once (inputs at creation, results at
// completion) and protected by triggers; titles, notes and bookmarks are annotations.

import type {
  DataOrigin,
  LabValue,
  Note,
  ParamSpec,
  PriceSource,
  RunDetail,
  RunKind,
  RunStatus,
  RunSummary,
  RunWindow,
  VariationSummary
} from '../shared/contract.ts';
import { type Db, formatPublicId, now, parsePublicId, tx } from './db.ts';

type Row = Record<string, unknown>;

const json = <T>(v: unknown, fallback: T): T => (typeof v === 'string' && v !== '' ? (JSON.parse(v) as T) : fallback);
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));

export interface StrategyInput {
  key: string;
  version: string;
  title: string;
  kind: 'entry_signal' | 'trades';
  runnable: boolean;
  description: string;
  params: ParamSpec[] | null;
  sourceRef: string | null;
}

export interface NewRun {
  variationId: number;
  title: string;
  kind: RunKind;
  status: RunStatus;
  dataOrigin: DataOrigin;
  symbols: string[];
  window: RunWindow;
  params: LabValue[];
  assumptions: LabValue[];
  request: unknown;
  priceSource: PriceSource;
  provenance: Record<string, unknown>;
  codeRevision: Record<string, unknown> | null;
}

export interface RunResult {
  eventCount: number;
  artifactDir: string;
  artifactSha256: string;
  metrics: Record<string, unknown> | null;
  provenance: Record<string, unknown>;
  priceSource: PriceSource;
}

export interface ListOptions {
  experiment?: string;
  q?: string;
  bookmarked?: boolean;
  variation?: string;
  limit?: number;
  offset?: number;
}

const RUN_SELECT = `
  SELECT r.*, v.public_id AS v_public_id, v.title AS v_title,
         s.public_id AS s_public_id, s.key AS s_key, s.version AS s_version, s.title AS s_title,
         s.param_schema_json AS s_param_schema_json,
         e.public_id AS e_public_id, e.title AS e_title,
         (SELECT count(*) FROM notes n WHERE n.target_type = 'run' AND n.target_id = r.id) AS note_count,
         (SELECT n.body FROM notes n WHERE n.target_type = 'run' AND n.target_id = r.id
            ORDER BY n.updated_at DESC, n.id DESC LIMIT 1) AS note_latest
  FROM runs r
  JOIN variations v ON v.id = r.variation_id
  JOIN strategies s ON s.id = v.strategy_id
  JOIN experiments e ON e.id = v.experiment_id`;

const excerpt = (body: unknown) => {
  if (typeof body !== 'string') return null;
  const flat = body
    .replace(/[#*_`>\-[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.length > 90 ? `${flat.slice(0, 89)}…` : flat;
};

export class Repo {
  constructor(readonly db: Db) {}

  // ----- experiments and strategies -----

  ensureExperiment(slug: string, title: string, description = ''): { id: number; publicId: string } {
    return tx(this.db, () => {
      const found = this.db.prepare('SELECT id, public_id FROM experiments WHERE slug = ?').get(slug) as
        Row | undefined;
      if (found) return { id: Number(found.id), publicId: String(found.public_id) };
      const id = this.nextId('experiments');
      const publicId = formatPublicId('E', id, 4);
      this.db
        .prepare(
          'INSERT INTO experiments (id, public_id, slug, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(id, publicId, slug, title, description, now());
      return { id, publicId };
    });
  }

  ensureStrategy(s: StrategyInput): { id: number; publicId: string } {
    return tx(this.db, () => {
      const found = this.db
        .prepare('SELECT id, public_id FROM strategies WHERE key = ? AND version = ?')
        .get(s.key, s.version) as Row | undefined;
      if (found) return { id: Number(found.id), publicId: String(found.public_id) };
      const id = this.nextId('strategies');
      const publicId = formatPublicId('S', id, 4);
      this.db
        .prepare(
          `INSERT INTO strategies (id, public_id, key, version, title, kind, runnable, description, param_schema_json,
             source_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          publicId,
          s.key,
          s.version,
          s.title,
          s.kind,
          s.runnable ? 1 : 0,
          s.description,
          s.params ? JSON.stringify(s.params) : null,
          s.sourceRef,
          now()
        );
      return { id, publicId };
    });
  }

  listExperiments() {
    return (
      this.db
        .prepare('SELECT public_id, slug, title, description, created_at FROM experiments ORDER BY id')
        .all() as Row[]
    ).map((r) => ({
      id: String(r.public_id),
      slug: String(r.slug),
      title: String(r.title),
      description: String(r.description)
    }));
  }

  // ----- variations -----

  /** The variation with these exact parameters, or a new one. Parameters never change after creation. */
  findOrCreateVariation(v: {
    strategyId: number;
    experimentId: number;
    params: LabValue[];
    canonical: string;
    title: string;
    origin: RunKind;
    parentVariationId: number | null;
  }): { id: number; publicId: string; created: boolean } {
    return tx(this.db, () => {
      const found = this.db
        .prepare(
          'SELECT id, public_id FROM variations WHERE strategy_id = ? AND experiment_id = ? AND params_canonical = ?'
        )
        .get(v.strategyId, v.experimentId, v.canonical) as Row | undefined;
      if (found) return { id: Number(found.id), publicId: String(found.public_id), created: false };
      const id = this.nextId('variations');
      const publicId = formatPublicId('V', id, 6);
      this.db
        .prepare(
          `INSERT INTO variations (id, public_id, strategy_id, experiment_id, title, params_json, params_canonical, origin,
             parent_variation_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          publicId,
          v.strategyId,
          v.experimentId,
          v.title,
          JSON.stringify(v.params),
          v.canonical,
          v.origin,
          v.parentVariationId,
          now()
        );
      return { id, publicId, created: true };
    });
  }

  variationIdOf(publicId: string): number | null {
    const id = parsePublicId('V', publicId);
    if (id === null) return null;
    return (this.db.prepare('SELECT id FROM variations WHERE id = ?').get(id) as Row | undefined) ? id : null;
  }

  listVariations(o: ListOptions = {}): VariationSummary[] {
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (o.experiment) {
      where.push('e.public_id = ?');
      args.push(o.experiment);
    }
    if (o.bookmarked) where.push('v.bookmarked_at IS NOT NULL');
    if (o.q) {
      where.push('(v.public_id LIKE ? OR v.title LIKE ? OR s.title LIKE ? OR v.params_json LIKE ?)');
      const like = `%${o.q}%`;
      args.push(like, like, like, like);
    }
    const sql = `
      SELECT v.*, s.public_id AS s_public_id, s.key AS s_key, s.version AS s_version, s.title AS s_title,
             s.runnable AS s_runnable, e.public_id AS e_public_id, e.title AS e_title,
             (SELECT max(r.completed_at) FROM runs r WHERE r.variation_id = v.id AND r.status = 'completed') AS latest_result_at,
             (SELECT count(*) FROM runs r WHERE r.variation_id = v.id) AS run_count,
             (SELECT r.public_id || '|' || r.status || '|' || coalesce(r.completed_at, '') || '|' || r.created_at
                FROM runs r WHERE r.variation_id = v.id
                ORDER BY coalesce(r.completed_at, r.created_at) DESC, r.id DESC LIMIT 1) AS latest_run,
             (SELECT count(*) FROM notes n WHERE n.target_type = 'variation' AND n.target_id = v.id) AS note_count,
             (SELECT n.body FROM notes n WHERE n.target_type = 'variation' AND n.target_id = v.id
                ORDER BY n.updated_at DESC, n.id DESC LIMIT 1) AS note_latest
      FROM variations v
      JOIN strategies s ON s.id = v.strategy_id
      JOIN experiments e ON e.id = v.experiment_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY latest_result_at IS NULL, latest_result_at DESC, v.created_at DESC, v.id DESC
      LIMIT ? OFFSET ?`;
    const rows = this.db.prepare(sql).all(...args, Math.min(o.limit ?? 100, 500), o.offset ?? 0) as Row[];
    return rows.map((r) => {
      const [id, status, completedAt, createdAt] = typeof r.latest_run === 'string' ? r.latest_run.split('|') : [];
      return {
        id: String(r.public_id),
        title: String(r.title),
        strategy: {
          id: String(r.s_public_id),
          key: String(r.s_key),
          version: String(r.s_version),
          title: String(r.s_title),
          runnable: Number(r.s_runnable) === 1
        },
        experiment: { id: String(r.e_public_id), title: String(r.e_title) },
        params: json<LabValue[]>(r.params_json, []),
        origin: r.origin as RunKind,
        createdAt: String(r.created_at),
        latestRun: id
          ? { id, status: status as RunStatus, completedAt: completedAt || null, createdAt: createdAt! }
          : null,
        latestResultAt: str(r.latest_result_at),
        runCount: Number(r.run_count),
        bookmarked: r.bookmarked_at !== null,
        noteCount: Number(r.note_count),
        noteExcerpt: excerpt(r.note_latest)
      };
    });
  }

  // ----- runs -----

  createRun(n: NewRun): { id: number; publicId: string } {
    return tx(this.db, () => {
      const id = this.nextId('runs');
      const publicId = formatPublicId('R', id, 6);
      const t = now();
      this.db
        .prepare(
          `INSERT INTO runs (id, public_id, variation_id, title, kind, status, data_origin, symbols_json, window_from,
             window_to, resolution, partition, params_json, assumptions_json, request_json, price_source_json,
             provenance_json, code_revision_json, created_at, queued_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          publicId,
          n.variationId,
          n.title || publicId,
          n.kind,
          n.status,
          n.dataOrigin,
          JSON.stringify(n.symbols),
          n.window.from,
          n.window.to,
          n.window.resolution,
          n.window.partition,
          JSON.stringify(n.params),
          JSON.stringify(n.assumptions),
          n.request === null ? null : JSON.stringify(n.request),
          JSON.stringify(n.priceSource),
          JSON.stringify(n.provenance),
          n.codeRevision ? JSON.stringify(n.codeRevision) : null,
          t,
          n.status === 'queued' ? t : null
        );
      const ins = this.db.prepare('INSERT INTO run_symbols (run_id, symbol) VALUES (?, ?)');
      for (const s of n.symbols) ins.run(id, s);
      return { id, publicId };
    });
  }

  runIdOf(publicId: string): number | null {
    const id = parsePublicId('R', publicId);
    if (id === null) return null;
    return (this.db.prepare('SELECT id FROM runs WHERE id = ?').get(id) as Row | undefined) ? id : null;
  }

  runRow(publicId: string): Row | undefined {
    const id = parsePublicId('R', publicId);
    return id === null ? undefined : (this.db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as Row | undefined);
  }

  markRunning(id: number) {
    this.db
      .prepare("UPDATE runs SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'")
      .run(now(), id);
  }

  setProgress(id: number, message: string, fraction: number | null) {
    this.db
      .prepare("UPDATE runs SET progress_json = ? WHERE id = ? AND status IN ('queued', 'running')")
      .run(JSON.stringify({ message, fraction }), id);
  }

  complete(id: number, r: RunResult) {
    this.db
      .prepare(
        `UPDATE runs SET status = 'completed', event_count = ?, artifact_dir = ?, artifact_sha256 = ?, metrics_json = ?,
           provenance_json = ?, price_source_json = ?, progress_json = NULL, completed_at = ?
         WHERE id = ? AND status IN ('queued', 'running')`
      )
      .run(
        r.eventCount,
        r.artifactDir,
        r.artifactSha256,
        r.metrics ? JSON.stringify(r.metrics) : null,
        JSON.stringify(r.provenance),
        JSON.stringify(r.priceSource),
        now(),
        id
      );
  }

  finishUnsuccessfully(id: number, status: 'failed' | 'cancelled', error: string, artifactDir: string | null) {
    this.db
      .prepare(
        `UPDATE runs SET status = ?, error = ?, artifact_dir = coalesce(?, artifact_dir), progress_json = NULL,
           completed_at = ? WHERE id = ? AND status IN ('queued', 'running')`
      )
      .run(status, error.slice(0, 4000), artifactDir, now(), id);
  }

  runsWithStatus(statuses: RunStatus[]): { id: number; publicId: string; status: RunStatus }[] {
    const rows = this.db
      .prepare(
        `SELECT id, public_id, status FROM runs WHERE status IN (${statuses.map(() => '?').join(',')}) ORDER BY id`
      )
      .all(...statuses) as Row[];
    return rows.map((r) => ({ id: Number(r.id), publicId: String(r.public_id), status: r.status as RunStatus }));
  }

  private toSummary(r: Row): RunSummary {
    return {
      id: String(r.public_id),
      title: String(r.title),
      status: r.status as RunStatus,
      kind: r.kind as RunKind,
      dataOrigin: r.data_origin as DataOrigin,
      experiment: { id: String(r.e_public_id), title: String(r.e_title) },
      strategy: {
        id: String(r.s_public_id),
        key: String(r.s_key),
        version: String(r.s_version),
        title: String(r.s_title)
      },
      variation: { id: String(r.v_public_id), title: String(r.v_title) },
      symbols: json<string[]>(r.symbols_json, []),
      window: {
        from: String(r.window_from),
        to: String(r.window_to),
        resolution: (r.resolution as RunWindow['resolution']) ?? null,
        partition: str(r.partition)
      },
      createdAt: String(r.created_at),
      startedAt: str(r.started_at),
      completedAt: str(r.completed_at),
      eventCount: r.event_count === null ? null : Number(r.event_count),
      bookmarked: r.bookmarked_at !== null,
      noteCount: Number(r.note_count),
      noteExcerpt: excerpt(r.note_latest)
    };
  }

  listRuns(o: ListOptions = {}): RunSummary[] {
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (o.experiment) {
      where.push('e.public_id = ?');
      args.push(o.experiment);
    }
    if (o.variation) {
      where.push('v.public_id = ?');
      args.push(o.variation);
    }
    if (o.bookmarked) where.push('r.bookmarked_at IS NOT NULL');
    if (o.q) {
      where.push(
        '(r.public_id LIKE ? OR r.title LIKE ? OR r.symbols_json LIKE ? OR v.public_id LIKE ? OR s.title LIKE ?)'
      );
      const like = `%${o.q}%`;
      args.push(like, like, like, like, like);
    }
    const sql = `${RUN_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY coalesce(r.completed_at, r.created_at) DESC, r.id DESC LIMIT ? OFFSET ?`;
    return (this.db.prepare(sql).all(...args, Math.min(o.limit ?? 100, 500), o.offset ?? 0) as Row[]).map((r) =>
      this.toSummary(r)
    );
  }

  runDetail(publicId: string): (RunDetail & { artifactDir: string | null }) | null {
    const id = parsePublicId('R', publicId);
    if (id === null) return null;
    const r = this.db.prepare(`${RUN_SELECT} WHERE r.id = ?`).get(id) as Row | undefined;
    if (!r) return null;
    return {
      ...this.toSummary(r),
      params: json<LabValue[]>(r.params_json, []),
      paramSchema: json<ParamSpec[] | null>(r.s_param_schema_json, null),
      assumptions: json<LabValue[]>(r.assumptions_json, []),
      priceSource: json<PriceSource>(r.price_source_json, { kind: 'market', basisDate: String(r.window_from) }),
      provenance: json<Record<string, unknown>>(r.provenance_json, {}),
      codeRevision: json<Record<string, unknown> | null>(r.code_revision_json, null),
      metrics: json<Record<string, unknown> | null>(r.metrics_json, null),
      error: str(r.error),
      artifact: { sha256: str(r.artifact_sha256), files: [] },
      progress: json<{ message: string; fraction: number | null } | null>(r.progress_json, null),
      artifactDir: str(r.artifact_dir)
    };
  }

  /** The request a manual run was created from (for cloning). */
  runRequest(publicId: string): unknown {
    return json<unknown>(this.runRow(publicId)?.request_json, null);
  }

  setRunTitle(publicId: string, title: string): boolean {
    const id = parsePublicId('R', publicId);
    return id !== null && this.db.prepare('UPDATE runs SET title = ? WHERE id = ?').run(title, id).changes === 1;
  }

  setVariationTitle(publicId: string, title: string): boolean {
    const id = parsePublicId('V', publicId);
    return id !== null && this.db.prepare('UPDATE variations SET title = ? WHERE id = ?').run(title, id).changes === 1;
  }

  setBookmark(type: 'run' | 'variation', publicId: string, on: boolean): boolean {
    const id = parsePublicId(type === 'run' ? 'R' : 'V', publicId);
    if (id === null) return false;
    const table = type === 'run' ? 'runs' : 'variations';
    return (
      this.db.prepare(`UPDATE ${table} SET bookmarked_at = ? WHERE id = ?`).run(on ? now() : null, id).changes === 1
    );
  }

  // ----- notes -----

  private targetId(type: 'run' | 'variation', publicId: string): number | null {
    return type === 'run' ? this.runIdOf(publicId) : this.variationIdOf(publicId);
  }

  listNotes(type: 'run' | 'variation', publicId: string): Note[] | null {
    const id = this.targetId(type, publicId);
    if (id === null) return null;
    return (
      this.db
        .prepare('SELECT * FROM notes WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC, id DESC')
        .all(type, id) as Row[]
    ).map((n) => ({
      id: Number(n.id),
      targetType: type,
      targetId: publicId,
      body: String(n.body),
      createdAt: String(n.created_at),
      updatedAt: String(n.updated_at)
    }));
  }

  addNote(type: 'run' | 'variation', publicId: string, body: string): Note | null {
    const id = this.targetId(type, publicId);
    if (id === null) return null;
    const t = now();
    const r = this.db
      .prepare('INSERT INTO notes (target_type, target_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(type, id, body, t, t);
    return { id: Number(r.lastInsertRowid), targetType: type, targetId: publicId, body, createdAt: t, updatedAt: t };
  }

  updateNote(noteId: number, body: string): boolean {
    return (
      this.db.prepare('UPDATE notes SET body = ?, updated_at = ? WHERE id = ?').run(body, now(), noteId).changes === 1
    );
  }

  deleteNote(noteId: number): boolean {
    return this.db.prepare('DELETE FROM notes WHERE id = ?').run(noteId).changes === 1;
  }

  listOptimizationBatches() {
    return (this.db.prepare('SELECT * FROM optimization_batches ORDER BY imported_at DESC').all() as Row[]).map(
      (b) => ({
        id: String(b.public_id),
        title: String(b.title),
        studyRef: String(b.study_ref),
        methodologyRef: str(b.methodology_ref),
        sourcePath: String(b.source_path),
        sourceSha256: String(b.source_sha256),
        importedAt: String(b.imported_at),
        summary: json<Record<string, unknown>>(b.summary_json, {})
      })
    );
  }

  private nextId(table: 'experiments' | 'strategies' | 'variations' | 'runs'): number {
    const r = this.db.prepare(`SELECT coalesce(max(id), 0) + 1 AS next FROM ${table}`).get() as Row;
    return Number(r.next);
  }
}
