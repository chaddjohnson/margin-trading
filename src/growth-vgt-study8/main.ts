// Growth 1.4.0 VGT Study 8–style optimization CLI (research/growth-vgt-study8/RUN_COMMANDS.md). Run from the repo root.
//   npm run growth-vgt-study8 -- pilot                  development-only timing pilot (before the protocol freeze)
//   npm run growth-vgt-study8 -- seal-protocol          freeze PROTOCOL.md, code and engine digests (commit afterwards)
//   npm run growth-vgt-study8 -- acknowledge-code <ID>  seal a post-freeze code change named in AMENDMENTS.md
//   npm run growth-vgt-study8 -- parity                 P1: the adapter against direct Strategy Lab runs (development data)
//   npm run growth-vgt-study8 -- search [--smoke]       the Study 8 V-track search on the development door
//   npm run growth-vgt-study8 -- qualify                Q1–Q9, E1, E2, diagnostics, #4 control evidence, PBO
//   npm run growth-vgt-study8 -- freeze                 roles, ranking → FROZEN_SELECTION.json (commit it before validate)
//   npm run growth-vgt-study8 -- validate               P2 browser parity of #4, then the validation battery (once)
//   npm run growth-vgt-study8 -- report                 tables from the sealed records (report-only)
//   npm run growth-vgt-study8 -- run --id <id>|--control4 [--door development|full] [--cost <bps>] [--out <dir>]
//   npm run growth-vgt-study8 -- verify                 re-hash the chain
import path from 'node:path';
import fs from 'fs-extra';
import {
  amendmentsFile,
  developmentDoor,
  frozenSelectionFile,
  fullDoor,
  protocolFile,
  resultFile,
  studyDir
} from './context.ts';
import { compareWithDirect, directRun, prefixRoot, scratchDir } from './parity.ts';
import { requestOf, runConfig } from './adapter.ts';
import { coverageOf, frozenSelectionCommitted, loadDevelopmentSessions, loadFullSessions } from './data.ts';
import { Lab, ParallelLab, doorView, withCost } from './lab.ts';
import { runPilot } from './pilot.ts';
import { runFreeze, runQualification, rulebook } from './qualify.ts';
import { runSearch } from './search.ts';
import {
  appendChain,
  codeDigest,
  engineDigest,
  fileSha256,
  git,
  hasPhase,
  log,
  nowIso,
  readChain,
  readSealed,
  recordDoor,
  requireFrozenEngine,
  requirePhase,
  sha256,
  verifyChain,
  writeSealed
} from './seal.ts';
import {
  type Genome,
  configId,
  control4Effective,
  effectiveOf,
  genomeOfRegistry,
  screenGenomes,
  structureKey,
  structureOf
} from './space.ts';
import { runBrowserParity, runValidation } from './validate.ts';

const [command, ...args] = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);

  return i >= 0 ? (args[i + 1] ?? '') : undefined;
};
const searchFile = resultFile('search', 'search.json');
const qualificationFile = resultFile('qualify', 'qualification.json');
const parityFile = resultFile('parity', 'parity.json');
const validationFile = resultFile('validation', 'validation.json');
const p2File = resultFile('validation', 'p2-browser-parity.json');
const freezeFile = resultFile('protocol_freeze.json');

export const developmentView = async (purpose: string) => {
  if (await fs.pathExists(frozenSelectionFile))
    throw new Error(`the selection is frozen (${frozenSelectionFile}); development search stages refuse to run again`);

  const loaded = await loadDevelopmentSessions();

  await recordDoor('development', purpose, loaded.sha256, loaded.lastDate);
  log(
    `development door opened for ${purpose}: ${loaded.firstDate} → ${loaded.lastDate}, ${loaded.rows} rows, ${loaded.sessions.length} sessions, sha256 ${loaded.sha256.slice(0, 16)}`
  );
  return doorView('development', loaded.sessions, loaded.sha256);
};

// The namespace's decision code must equal the latest sealed digest (the protocol freeze or an acknowledged amendment).
const requireSealedCode = async () => {
  await requirePhase('protocol');
  await requireFrozenEngine();

  const chain = await readChain();
  const latest = [...chain].reverse().find((e) => e.phase === 'protocol' || e.phase.startsWith('code-'))!;
  const sealedFile = latest.phase === 'protocol' ? freezeFile : resultFile('freeze', `${latest.phase}.json`);
  const sealed = (await fs.readJson(sealedFile)) as { code: { digest: string } };
  const now = await codeDigest();

  if (now.digest !== sealed.code.digest)
    throw new Error(
      `the study code changed since ${latest.phase}; record an AMENDMENTS.md entry and run acknowledge-code <ID>`
    );
};

const sealProtocol = async () => {
  if ((await readChain()).length) throw new Error('the protocol is already sealed');
  if (!(await fs.pathExists(protocolFile))) throw new Error(`${protocolFile} is missing`);

  const record = await writeSealed(freezeFile, {
    stage: 'PROTOCOL_FREEZE',
    at: nowIso(),
    git: { head: git('rev-parse HEAD'), branch: git('rev-parse --abbrev-ref HEAD') },
    protocol: { file: protocolFile, sha256: await fileSha256(protocolFile) },
    brief: {
      file: path.join(studyDir, 'brief', 'BRIEF.md'),
      sha256: await fileSha256(path.join(studyDir, 'brief', 'BRIEF.md'))
    },
    pilot: { file: resultFile('pilot', 'pilot.json'), sha256: await fileSha256(resultFile('pilot', 'pilot.json')) },
    code: await codeDigest(),
    engine: await engineDigest(),
    data: { file: 'data/VGT/data.csv', developmentDoor, fullDoor },
    rulebook: { sha256: sha256(JSON.stringify(rulebook())), values: rulebook() }
  });
  const files = [protocolFile, freezeFile, resultFile('pilot', 'pilot.json'), path.join(studyDir, 'brief', 'BRIEF.md')];

  if (await fs.pathExists(amendmentsFile)) files.push(amendmentsFile);

  const entry = await appendChain('protocol', files);

  log(
    `protocol sealed ${record.file} (${record.bodyHash.slice(0, 12)}), chain ${entry.hash.slice(0, 16)}; commit it before the search`
  );
};

const acknowledgeCode = async (id: string) => {
  if (!id) throw new Error('acknowledge-code needs an amendment ID');

  const text = await fs.readFile(amendmentsFile, 'utf8');

  if (!text.includes(`## ${id} `)) throw new Error(`${amendmentsFile} has no entry "## ${id} …"`);

  await requirePhase('protocol');
  await requireFrozenEngine();

  const file = resultFile('freeze', `code-${id}.json`);

  await writeSealed(file, {
    stage: 'CODE_AMENDMENT',
    id,
    at: nowIso(),
    git: git('rev-parse HEAD'),
    code: await codeDigest()
  });
  await appendChain(`code-${id}`, [file, amendmentsFile]);
  log(`code amendment ${id} sealed`);
};

// P1: the adapter against direct Strategy Lab runs on the development prefix (physically capped).
const parity = async () => {
  await requireSealedCode();
  if (await fs.pathExists(parityFile)) throw new Error(`${parityFile} exists (sealed)`);

  const view = await developmentView('P1 parity (adapter vs direct Strategy Lab runs)');
  // configurations: #4 and 40 from the engineering-only family ('parity'), chosen so every structural level appears
  const pool = screenGenomes(4096, ['parity', 'V', 'DEV']);
  const chosen: Genome[] = [];
  const seenLevels = new Map<string, number>();

  for (const g of pool) {
    if (chosen.length >= 40) break;

    const levels = g.slice(0, 8).map((v, d) => `${d}:${v}`);
    const gain = levels.filter((k) => (seenLevels.get(k) ?? 0) < 2).length;

    if (gain > 0 || chosen.length >= 32) {
      chosen.push(g);
      for (const k of levels) seenLevels.set(k, (seenLevels.get(k) ?? 0) + 1);
    }
  }

  const root = await prefixRoot();
  const cases = [
    { label: '#4', effective: control4Effective() },
    ...chosen.map((g, i) => ({ label: `parity-${i + 1}`, effective: effectiveOf(g) })),
    // the native cost input, at the two stress costs
    { label: '#4 @10bps', effective: withCost(control4Effective(), 10) },
    { label: `parity-1 @20bps`, effective: withCost(effectiveOf(chosen[0]!), 20) }
  ];
  const rows = [];

  for (const [i, c] of cases.entries()) {
    const runDir = path.join(scratchDir, 'P1', `case-${i}`);

    await fs.remove(runDir);

    const direct = await directRun(root, requestOf(c.effective, '2016-01-04', '2024-12-31'), runDir);
    const out = runConfig(view.sessions, view.dataSha256, c.effective);
    const problems = compareWithDirect(out, direct);

    rows.push({
      case: c.label,
      id: configId(genomeOfRegistry(c.effective)),
      structure: structureKey(structureOf(genomeOfRegistry(c.effective))),
      problems
    });
    log(`P1 ${c.label}: ${problems.length} differences`);
  }

  // determinism: the parallel lab equals the in-process lab on 64 configurations, twice
  const det = screenGenomes(64, ['parity-determinism', 'V', 'DEV']).map(effectiveOf);
  const single = new Lab(view);
  const a = await single.points(det);
  const lab = new ParallelLab(view, { door: 'development' });
  const b = await lab.points(det);

  await lab.close();

  const c2 = await new Lab(view).points(det);
  const detProblems = det.filter(
    (_e, i) => JSON.stringify(a[i]) !== JSON.stringify(b[i]) || JSON.stringify(a[i]) !== JSON.stringify(c2[i])
  ).length;
  const differences = rows.reduce((t, r) => t + r.problems.length, 0) + detProblems;
  const record = await writeSealed(parityFile, {
    stage: 'P1-PARITY',
    at: nowIso(),
    door: {
      door: 'development',
      first: view.sessions[0]!.date,
      last: view.sessions.at(-1)!.date,
      dataSha256: view.dataSha256
    },
    runner:
      'apps/strategy-lab/runner/trading-run.ts (unchanged), cwd = a scratch root whose data/VGT/data.csv is the pinned development prefix',
    cases: rows,
    structuralCoverage: Object.fromEntries(seenLevels),
    determinism: { configurations: det.length, differences: detProblems },
    coverage: coverageOf(view.sessions, ['2016-01-04', '2024-12-24', '2024-12-31']),
    differences,
    passed: differences === 0,
    note: 'Only difference counts are recorded; no net or drawdown of any configuration is stored here.'
  });

  await fs.remove(root);
  await appendChain('parity', [parityFile]);
  log(`P1 parity ${differences === 0 ? 'PASSED' : 'FAILED'} (${differences} differences) ${record.file}`);
  if (differences) process.exitCode = 1;
};

const main = async () => {
  switch (command) {
    case 'pilot': {
      if ((await readChain()).length) throw new Error('the pilot runs only before the protocol freeze');
      await runPilot(await developmentView('timing pilot (throughput only)'));
      break;
    }
    case 'seal-protocol':
      await sealProtocol();
      break;
    case 'acknowledge-code':
      await acknowledgeCode(args[0] ?? '');
      break;
    case 'parity':
      await parity();
      break;
    case 'search': {
      await requireSealedCode();
      await requirePhase('parity');

      const p = await readSealed<{ passed: boolean }>(parityFile);

      if (!p.passed) throw new Error('P1 parity did not pass; the search refuses');

      const smoke = args.includes('--smoke');
      const out = smoke ? resultFile('search', 'search-smoke.json') : searchFile;
      const view = await developmentView(smoke ? 'search (smoke)' : 'search');
      const lab = new ParallelLab(view, { door: 'development' });

      try {
        await runSearch(lab, view, { mode: smoke ? 'smoke' : 'base', out });
      } finally {
        await lab.close();
      }

      if (!smoke)
        await appendChain('search', [
          searchFile,
          searchFile.replace(/\.json$/, '-archive.csv.gz'),
          searchFile.replace(/\.json$/, '-screen.csv.gz')
        ]);
      break;
    }
    case 'qualify': {
      await requireSealedCode();
      await requirePhase('search');

      const view = await developmentView('qualification');
      const lab = new ParallelLab(view, { door: 'development' });

      try {
        await runQualification(lab, view, searchFile, qualificationFile);
      } finally {
        await lab.close();
      }

      await appendChain('qualify', [qualificationFile]);
      break;
    }
    case 'freeze': {
      await requireSealedCode();
      await requirePhase('qualify');

      const protocolCommit = git(`log -n 1 --format=%H -- ${resultFile('protocol_freeze.json')}`);

      if (!protocolCommit) throw new Error('the protocol freeze is not committed');

      await runFreeze(qualificationFile, searchFile, protocolCommit);
      await fs.chmod(frozenSelectionFile, 0o444); // the read-only manifest
      await appendChain('selection', [frozenSelectionFile]);
      log('commit FROZEN_SELECTION.json before validate');
      break;
    }
    case 'validate': {
      await requireSealedCode();
      await requirePhase('selection');
      if (!frozenSelectionCommitted())
        throw new Error(`${frozenSelectionFile} must be committed before the full door opens`);
      if (await hasPhase('validation')) throw new Error('validation is sealed; it is opened once');

      await runBrowserParity(p2File);

      const { files } = await runValidation(validationFile);

      await appendChain('validation', [p2File, ...files]);
      break;
    }
    case 'report': {
      const { runReport } = await import('./report.ts');

      await runReport();
      break;
    }
    case 'run': {
      const door = flag('door') ?? 'development';
      const id = flag('id');
      const outDir = flag('out');
      const cost = flag('cost');
      let effective: Record<string, unknown>;

      if (args.includes('--control4')) effective = control4Effective();
      else {
        const frozen = await readSealed<{ shortlist: { id: string; effective: Record<string, unknown> }[] }>(
          frozenSelectionFile
        );
        const found = frozen.shortlist.find((m) => m.id === id);

        if (!found) throw new Error(`--id ${id ?? ''} is not a frozen shortlist member`);
        effective = found.effective;
      }

      if (cost !== undefined) effective = withCost(effective as never, Number(cost));

      const loaded =
        door === 'full'
          ? await loadFullSessions({ frozenBodyHash: (await fs.readJson(frozenSelectionFile)).bodyHash })
          : await loadDevelopmentSessions();

      await recordDoor(door, `run CLI (post-study reproduction) ${id ?? '#4'}`, loaded.sha256, loaded.lastDate);

      const out = runConfig(loaded.sessions, loaded.sha256, effective as never);
      const m = out.summary.metrics;

      log(
        `${id ?? '#4'} on ${door} ${loaded.firstDate} → ${loaded.lastDate}: net ${m.pnl.totalMarkedNetUsd.toFixed(2)} (realized ${m.pnl.realizedNetUsd.toFixed(2)}), minute DD ${m.drawdown.minute.maximumUsd.toFixed(2)}, ${m.trades.wins}W/${m.trades.losses}L/${m.trades.breakeven}B, ${m.trades.closed} closed, ${m.trades.open} open, exposure ${m.occupancy.sessionsInvestedPercent?.toFixed(1)}%`
      );

      if (outDir) {
        const dir = path.resolve(process.env.INIT_CWD ?? process.cwd(), outDir);
        const { tradesOf } = await import('./trades.ts');

        await fs.outputJson(
          path.join(dir, 'summary.json'),
          { door, effective, metrics: m, trades: tradesOf(out) },
          { spaces: 1 }
        );
        log(`wrote ${dir}/summary.json`);
      }
      break;
    }
    case 'verify': {
      const v = await verifyChain();

      log(`chain: ${v.entries} entries, head ${v.head.slice(0, 16)}, ${v.problems.length} problems`);
      for (const p of v.problems) log(`  ${p}`);
      if (v.problems.length) process.exitCode = 1;
      break;
    }
    default:
      throw new Error(`unknown command ${command ?? '(none)'}`);
  }
};

await main();
