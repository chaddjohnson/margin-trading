// The archive audit (PROTOCOL.md §7.2; brief: "audit the archive first"): the configurations tables of Priority 3B's and
// Priority 3's evaluation archives (read-only, never modified) are scanned for configurations carrying EXACTLY one of
// this study's frozen anchors (VG #2's two D1 vectors and the arm's VGT Growth vector, or VGT Growth #4 alone for the
// Growth-only arm). Every match is listed with its archived development centre; each is re-evaluated FRESH here on the
// same door and compared field by field (a reuse-identity check: nothing is imported into this study's archive, so every
// later evaluation is computed fresh and counted as such). GDX-enabled matches not already among the cutoff's informed
// seeds become labelled ARCHIVE seeds of the final cutoff (prior archive selection, counted apart from new discovery).
// Sealed before the bench, the engineering gates and the protocol freeze; it runs after the control manifest (the newly
// combined control C4-refined + Appendix A is frozen before any of its results is read).
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decode } from '../growth140-vgt-s8m/store.ts';
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import { type Rec, evalKey, evaluate } from '../vg-d1-growth-joint/evaluate.ts';
import { log, repoRoot } from './context.ts';
import { type Seed, loadControls, seedsAt } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { auditFile } from './stages.ts';
import { plain, sealJson, sha256File } from './records.ts';
import { type Arm, type Quad, arms, build, gId, normalize, optionsOfEnabled, quadId } from './space.ts';

const roots = [
  { study: 'Priority 3B (vg-d1-growth-expanded)', dir: '.cache/vg-d1-growth-expanded/jobs', format: '3b' as const },
  { study: 'Priority 3 (vg-d1-growth-joint)', dir: '.cache/vg-d1-growth-joint/jobs', format: 'p3' as const }
];

const same = (a: unknown, b: unknown) => JSON.stringify(plain(a)) === JSON.stringify(plain(b));

export const runAudit = async () => {
  if (fs.existsSync(auditFile)) throw new Error('the archive audit is sealed');

  const { anchors } = loadControls();
  const vgt = Object.fromEntries(arms.map((a) => [a, gId(anchors[a].vgt)])) as Record<Arm, string>;
  const vg2 = JSON.stringify(anchors.R.d1);
  const jobs: {
    study: string;
    job: string;
    door: string;
    doorPin: string;
    codeDigest: string;
    configs: number;
    matches: number;
  }[] = [];
  const matches: {
    study: string;
    job: string;
    arm: Arm;
    configKey: string;
    gdxEnabled: boolean;
    gdxId: string | null;
    enabled: BookId[];
    p3Id: string;
    archived: { found: boolean; net?: number; dd?: number; gdxLots?: number; lots?: number };
    quad: Quad;
  }[] = [];

  for (const root of roots) {
    const dir = path.join(repoRoot, root.dir);

    if (!fs.existsSync(dir)) continue;
    for (const job of fs.readdirSync(dir).sort()) {
      if (job.startsWith('pilot')) continue;

      const file = path.join(dir, job, 'archive.sqlite');

      if (!fs.existsSync(file)) continue;

      const db = new DatabaseSync(file, { readOnly: true });
      const meta = Object.fromEntries(
        (db.prepare('SELECT k, v FROM meta').all() as { k: string; v: string }[]).map((r) => [r.k, r.v])
      );
      const rows = db.prepare('SELECT key, json FROM configs').all() as { key: string; json: string }[];
      let n = 0;

      for (const row of rows) {
        const x = decode<Record<string, unknown>>(row.json);
        const quad = (root.format === '3b' ? x.quad : x) as Quad;
        const inc = root.format === '3b' ? (x.inc as string) : null;
        const growthOnly = root.format === 'p3' && job.includes('gpair');
        let enabled: BookId[];

        if (root.format === '3b')
          enabled = bookIds.filter((b) => b.startsWith('D1:') || (b === 'G:GDX' ? inc !== 'V' : inc !== 'G'));
        else enabled = growthOnly ? ['G:GDX', 'G:VGT'] : [...bookIds];

        for (const arm of arms) {
          const a = anchors[arm];
          const d1Ok =
            arm === 'G'
              ? enabled.every((b) => !b.startsWith('D1:'))
              : JSON.stringify(quad.d1) === vg2 && enabled.includes('D1:GDX') && enabled.includes('D1:VGT');

          if (!d1Ok || !enabled.includes('G:VGT') || gId(quad.g.VGT) !== vgt[arm]) continue;

          const gdxEnabled = enabled.includes('G:GDX');
          const q = normalize(build(a, gdxEnabled ? quad.g.GDX : null).quad);
          const key = evalKey(meta.door!, root.format === '3b' ? (x.quad as Quad) : quad, optionsOfEnabled(enabled));
          const pt = db.prepare('SELECT json FROM points WHERE key = ?').get(key) as { json: string } | undefined;
          const rec = pt ? decode<Rec>(pt.json) : null;

          n++;
          matches.push({
            study: root.study,
            job,
            arm,
            configKey: row.key,
            gdxEnabled,
            gdxId: gdxEnabled ? gId(quad.g.GDX) : null,
            enabled,
            p3Id: quadId(q),
            archived: rec
              ? { found: true, net: rec.net, dd: rec.dd, gdxLots: rec.books['G:GDX'].lots, lots: rec.lots }
              : { found: false },
            quad: q
          });
        }
      }

      db.close();
      jobs.push({
        study: root.study,
        job,
        door: meta.door!,
        doorPin: meta.doorPin!,
        codeDigest: meta.codeDigest!,
        configs: rows.length,
        matches: n
      });
    }
  }

  // the fresh re-evaluation of every match on its door (D24 here: every matching job is a C24 job; checked)
  const d24 = await openStudyDoor('D24', 'archive audit: fresh re-evaluation of the exact-anchor matches');
  const checks = matches.map((m) => {
    const job = jobs.find((j) => j.job === m.job && j.study === m.study)!;

    if (job.door !== 'D24')
      return { ...m, fresh: null, identical: null, note: `archived on ${job.door}: not re-evaluated` };

    const fresh = evaluate(d24, m.quad, optionsOfEnabled(m.enabled));
    let identical: boolean | null = null;

    if (m.archived.found) {
      const db = new DatabaseSync(
        path.join(repoRoot, roots.find((r) => r.study === m.study)!.dir, m.job, 'archive.sqlite'),
        { readOnly: true }
      );
      const pt = db
        .prepare('SELECT json FROM points WHERE key = ?')
        .get(evalKey('D24', m.quad, optionsOfEnabled(m.enabled))) as { json: string } | undefined;

      identical = pt ? same(decode<Rec>(pt.json), fresh) : null;
      db.close();
    }

    return {
      ...m,
      fresh: {
        net: fresh.net,
        dd: fresh.dd,
        lots: fresh.lots,
        gdxLots: fresh.books['G:GDX'].lots,
        signature: fresh.signature
      },
      identical,
      note: ''
    };
  });

  // archive seeds: GDX-enabled matches not already among the final cutoff's informed seeds
  const known = new Set(seedsAt('C24').map((s) => gId(s.gdx)));
  const seeds: Seed[] = [];

  for (const m of checks)
    if (m.gdxEnabled && m.gdxId && !known.has(m.gdxId)) {
      known.add(m.gdxId);
      seeds.push({
        label: `archive ${m.job} ${m.configKey}`,
        gdx: m.quad.g.GDX,
        source: `${m.study} archive ${m.job} (configuration ${m.configKey})`,
        cutoff: '2016–2024'
      });
    }

  const record = {
    stage: 'archive audit',
    rule: "a configuration matches an arm iff its enabled D1 books carry VG #2's exact vectors (none for the Growth-only arm), Growth·VGT carries the arm's exact VGT vector, and Growth·GDX is either disabled or any vector",
    anchors: { vgt, vg2D1: anchors.R.d1 },
    jobs,
    matches: checks,
    reuse:
      'nothing is imported: every match is re-evaluated fresh in this study (identical = the fresh record equals the archived one field for field)',
    seeds: seeds.map((s) => ({ ...s, id: gId(s.gdx) })),
    finished: new Date().toISOString()
  };

  sealJson(auditFile, plain(record), 'archive audit');
  log(
    `archive audit: ${jobs.length} archives, ${matches.length} exact-anchor matches, ${seeds.length} new archive seed(s)`
  );
  return record;
};

export { sha256File };
