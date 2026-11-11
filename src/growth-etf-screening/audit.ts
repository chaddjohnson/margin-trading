// The compute audit (brief: record actual versus planned budgets; fresh simulations versus archive hits): every job
// archive's distinct evaluations (the authoritative count of fresh backend simulations that reached the archive, resumed
// work counted once) plus the ledger's in-process runs; the ledger's per-job fresh and hit counts beside them. The
// manifest of the archives (size and sha256) is written for the recoverable archives kept outside git.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { cacheRoot, resultsDir } from './context.ts';
import { ledgerEntries } from './ledger.ts';
import { rel, sha256File } from './records.ts';

export const archiveAudit = (o: { write?: boolean } = {}) => {
  const root = path.join(cacheRoot, 'jobs');
  const jobs = fs.existsSync(root) ? fs.readdirSync(root).sort() : [];
  const rows = jobs.map((job) => {
    const file = path.join(root, job, 'archive.sqlite');

    if (!fs.existsSync(file))
      return { job, rows: 0, bytes: 0, sha256: null as string | null, file: null as string | null };

    const db = new DatabaseSync(file, { readOnly: true });
    const n = (db.prepare('SELECT COUNT(*) AS n FROM points').get() as { n: number } | undefined)?.n ?? 0;

    db.close();
    return { job, rows: n, bytes: fs.statSync(file).size, sha256: o.write ? sha256File(file) : null, file: rel(file) };
  });
  const ledger = ledgerEntries();
  const inProcess = ledger.filter((e) => e.kind === 'in-process').reduce((a, e) => a + e.fresh, 0);
  const pilot = rows.filter((r) => r.job.startsWith('pilot-')).reduce((a, r) => a + r.rows, 0);
  const study = rows.filter((r) => !r.job.startsWith('pilot-')).reduce((a, r) => a + r.rows, 0);
  const totals = {
    archivedPilot: pilot,
    archivedStudy: study,
    inProcess,
    total: pilot + study + inProcess,
    ledgerFresh: ledger.reduce((a, e) => a + e.fresh, 0),
    ledgerHits: ledger.reduce((a, e) => a + e.hits, 0),
    jobs: rows.length
  };

  if (o.write) {
    const file = path.join(resultsDir, 'archive-manifest.json');

    fs.writeFileSync(
      file,
      `${JSON.stringify({ kind: 'growth-etf-screening archive manifest (archives kept outside git, regenerable by rerunning the commands)', written: new Date().toISOString(), totals, archives: rows }, null, 1)}\n`
    );
  }
  return { totals, rows };
};
