// The protocol freeze (PROTOCOL.md §11): pins of the protocol, the brief, the adoption manifest and the amendments; the
// subjects' seal logs and sealed records (re-verified), their frozen selections, job archives (sha256), fold-mark
// caches and evaluation digests; the canonical data; git HEAD; the budgets and the resource contract.
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import {
  adoptionFile,
  allCuts,
  amendmentsFile,
  briefFile,
  budgets,
  freezeFile,
  log,
  protocolFile,
  repoRoot,
  researchDir,
  resources
} from './context.ts';
import { gitHead, rel, sealJson, sha256File } from './records.ts';
import { sources, subjectKeys, subjectSeals } from './sources.ts';

export const dataPins = {
  GDX: { file: 'data/GDX/data.csv', sha256: '77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049' },
  VGT: { file: 'data/VGT/data.csv', sha256: '2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e' }
};

export const verifyData = () => {
  for (const [s, p] of Object.entries(dataPins)) {
    const sha = sha256File(path.join(repoRoot, p.file));

    if (sha !== p.sha256) throw new Error(`${s} canonical data sha256 ${sha}, expected ${p.sha256}`);
  }
};

export const runFreeze = () => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (fs.existsSync(freezeFile)) throw new Error('the protocol is already frozen');
  verifyData();

  const subjects = Object.fromEntries(
    subjectKeys.map((k) => {
      const s = sources[k];
      const seals = subjectSeals(s);

      if (seals.records.some((r) => !r.verified)) throw new Error(`${k}: a sealed record does not verify`);

      const archives = allCuts.flatMap((c) =>
        [s.searchJob(c), s.qualifyJob(c)].map((f) => {
          log(`hashing ${rel(f)}`);
          return { file: rel(f), bytes: fs.statSync(f).size, sha256: sha256File(f) };
        })
      );
      const closes = ['C19', 'C21', 'C23'].map((c) => {
        const f = path.join(s.foldsCacheDir, `${c}-closes.json`);

        return { file: rel(f), bytes: fs.statSync(f).size, sha256: sha256File(f) };
      });

      return [
        k,
        {
          study: s.study,
          title: s.title,
          sealLog: { file: seals.log, sha256: seals.logSha256 },
          sealedRecords: seals.records,
          frozenSelection: { file: rel(s.frozenSelection), sha256: sha256File(s.frozenSelection) },
          protocolFreeze: {
            file: rel(path.join(s.resultsDir, 'protocol-freeze.json')),
            sha256: sha256File(path.join(s.resultsDir, 'protocol-freeze.json'))
          },
          evaluationDigest: s.evaluationDigest(),
          archives,
          foldMarkCaches: closes
        }
      ];
    })
  );
  const record = {
    kind: 'optimization-process-audit protocol freeze',
    protocol: { file: rel(protocolFile), sha256: sha256File(protocolFile) },
    brief: { file: rel(briefFile), sha256: sha256File(briefFile) },
    adoption: { file: rel(adoptionFile), sha256: sha256File(adoptionFile) },
    amendments: { file: rel(amendmentsFile), sha256: sha256File(amendmentsFile) },
    data: dataPins,
    subjects,
    head: gitHead(),
    budgets,
    resources,
    frozenAt: new Date().toISOString()
  };

  const sha = sealJson(freezeFile, record, 'protocol freeze');

  log(`protocol frozen: ${record.protocol.sha256.slice(0, 12)}…; record ${sha.slice(0, 12)}…`);
  return record;
};
