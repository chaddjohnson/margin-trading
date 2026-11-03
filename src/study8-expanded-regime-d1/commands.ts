// Stage commands (see main.ts and RUN_COMMANDS.md). Door preconditions are intrinsic to each door (gates.ts); each
// stage writes a write-once sealed record, and `seal <phase>` (or the stage itself) appends the phase to the hash chain.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type FoldKey,
  type TrackKey,
  auditFile,
  frozenSelectionFile,
  foldKeys,
  parityFile,
  qualificationFile,
  searchFile,
  testConfirmFile,
  testFile,
  trackKeys,
  tracks,
  folds
} from './context.ts';
import { requireProtocolFrozen, testOrder } from './gates.ts';
import { acknowledgeCode, amendmentsFile, requireIntegrity } from './integrity.ts';
import {
  appendPhase,
  chainHead,
  doorLogLines,
  fileSha256,
  log,
  nowIso,
  phaseSealed,
  readChain,
  readSealed,
  requirePhase,
  verifyChain,
  writeSealed
} from './records.ts';
import { doorsLog } from './context.ts';
import { runSearch } from './search.ts';

const trackArg = (value: string | undefined): TrackKey => {
  if (!value || !(value in tracks)) throw new Error(`track must be one of ${Object.keys(tracks).join(', ')}`);
  return value as TrackKey;
};

const foldArg = (value: string | undefined): FoldKey => {
  if (!value || !(value in folds)) throw new Error(`fold must be one of ${Object.keys(folds).join(', ')}`);
  return value as FoldKey;
};

const searchPhaseFiles = () =>
  trackKeys.flatMap((track) =>
    foldKeys.flatMap((fold) => [searchFile(track, fold), searchFile(track, fold).replace(/\.json$/, '-archive.csv.gz')])
  );

const qualifyPhaseFiles = () => trackKeys.flatMap((track) => foldKeys.map((fold) => qualificationFile(track, fold)));

// Door openings per job of a phase (the door log's purpose strings). A job whose door opened more than once (a crash
// and resume, or a deleted record re-run) may be sealed only with --acknowledge <ID> naming an AMENDMENTS.md entry.
const openingsOf = async (phase: 'search' | 'qualify') => {
  const purposes = (await doorLogLines()).map((line) => (JSON.parse(line) as { purpose: string }).purpose);
  const purposeOf = (track: TrackKey, fold: FoldKey) =>
    phase === 'search' ? `Phase B search-${track}-${fold}` : `qualification (in-sample) ${track} ${fold}`;

  return Object.fromEntries(
    trackKeys.flatMap((track) =>
      foldKeys.map((fold) => [`${track}/${fold}`, purposes.filter((p) => p === purposeOf(track, fold)).length])
    )
  );
};

export const dispatch = async (command: string, args: string[]) => {
  switch (command) {
    case 'parity': {
      await requireProtocolFrozen();

      if (await fs.pathExists(parityFile)) throw new Error(`${parityFile} exists (sealed); parity refuses to re-run`);

      const { runParity } = await import('./parity.ts');

      await runParity();

      const entry = await appendPhase('parity', [parityFile]);

      log(`chain: parity sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'restart-probe': {
      const [, out, cacheFile, stop] = args;

      await runSearch(trackArg(args[0]), 'F19', {
        mode: 'smoke',
        out: out!,
        cacheFile: cacheFile!,
        doorKey: 'parity-F19',
        ...(stop ? { stopAfterPoints: Number(stop) } : {})
      });
      break;
    }
    case 'search':
      if (await phaseSealed('search')) throw new Error('the search phase is sealed; no further search');
      await runSearch(trackArg(args[0]), foldArg(args[1]), { mode: 'base' });
      break;
    case 'qualify': {
      if (await phaseSealed('qualify')) throw new Error('the qualify phase is sealed');

      const { runQualification } = await import('./qualify.ts');

      await runQualification(trackArg(args[0]), foldArg(args[1]));
      break;
    }
    case 'seal': {
      const phase = args[0];
      const files = phase === 'search' ? searchPhaseFiles() : phase === 'qualify' ? qualifyPhaseFiles() : undefined;

      if (!files) throw new Error('seal accepts search | qualify (other phases are sealed by their own stage)');

      await requireIntegrity(`seal ${phase}`);
      await requirePhase(phase === 'qualify' ? 'search' : 'parity');

      for (const file of files.filter((f) => f.endsWith('.json'))) await readSealed(file);

      const openings = await openingsOf(phase as 'search' | 'qualify');
      const repeated = Object.entries(openings).filter(([, n]) => n !== 1);
      const ackIndex = args.indexOf('--acknowledge');
      const ack = ackIndex >= 0 ? args[ackIndex + 1] : undefined;

      if (repeated.length) {
        const text = await fs.readFile(amendmentsFile, 'utf8');

        if (!ack || !text.includes(`\n## ${ack} — `)) {
          throw new Error(
            `seal ${phase} refused: door openings ≠ 1 for ${repeated.map(([k, n]) => `${k} (${n})`).join(', ')}; disclose them in AMENDMENTS.md and pass --acknowledge <ID>`
          );
        }

        log(`seal ${phase}: repeated openings ${JSON.stringify(Object.fromEntries(repeated))} acknowledged by ${ack}`);
      }

      const entry = await appendPhase(phase!, files);

      log(`chain: ${phase} sealed (${files.length} files) as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'freeze-selection': {
      const { runFreezeSelection } = await import('./select.ts');

      await requireIntegrity('freeze-selection');
      await runFreezeSelection();

      const entry = await appendPhase('selection', [frozenSelectionFile]);

      log(`chain: selection sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'record-audit': {
      await requireIntegrity('record-audit');
      await requirePhase('selection');

      const report = args[0];

      if (!report || !(await fs.pathExists(report))) throw new Error('record-audit needs the audit report file');
      if (await fs.pathExists(auditFile)) throw new Error(`${auditFile} exists (sealed)`);

      const chain = await verifyChain();
      const record = await writeSealed(auditFile, {
        stage: 'PRE_TEST_AUDIT',
        at: nowIso(),
        report: { file: report, sha256: await fileSha256(report) },
        chainHead: chain.at(-1)!.entryHash,
        note: 'a read-only independent audit of the sealed selection, run before any test door opened'
      });
      const entry = await appendPhase('audit', [report, auditFile]);

      log(`audit recorded: ${record.file} ${record.bodyHash.slice(0, 12)}; chain entry ${entry.seq}`);
      break;
    }
    case 'test': {
      const fold = foldArg(args[0]);
      const confirm = args.includes('--confirm');
      const { runTest } = await import('./test.ts');

      if (!(testOrder as readonly string[]).includes(fold)) throw new Error(`unknown fold ${fold}`);

      await runTest(fold, { confirm });

      const out = confirm ? testConfirmFile(fold) : testFile(fold);
      const entry = await appendPhase(confirm ? `test-${fold}-confirm` : `test-${fold}`, [
        out,
        out.replace(/\.json$/, '-lots.jsonl.gz')
      ]);

      log(
        `chain: test-${fold}${confirm ? '-confirm' : ''} sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`
      );
      break;
    }
    case 'verify-chain': {
      const chain = await verifyChain();
      const integrity = await requireIntegrity('verify-chain');

      console.info(
        chain
          .map((e) => `${e.seq} ${e.phase} ${e.at} files=${e.files.length} doors=${e.doors.lines} ${e.entryHash}`)
          .join('\n')
      );
      console.info(
        `chain OK: ${chain.length} entries; integrity ${integrity ? `OK (code ${integrity.code.slice(0, 12)}, engine ${integrity.engine.slice(0, 12)}, accepted by ${integrity.acceptedBy})` : 'not frozen yet'}`
      );
      break;
    }
    case 'acknowledge-code': {
      await requireProtocolFrozen();

      const entry = await acknowledgeCode(args[0] ?? '');

      log(`chain: ${entry.phase} sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'research-configs': {
      await requireIntegrity('research-configs');
      await requirePhase('test-F24');

      const { writeResearchConfigs } = await import('./poolrun.ts');

      await writeResearchConfigs();
      break;
    }
    case 'pool': {
      // the research-pool runner loads the full history through the pools loader: only after the one-time F24 test
      await requireIntegrity('pool');
      await requirePhase('test-F24');
      await fs.appendFile(
        doorsLog,
        `${JSON.stringify({ at: nowIso(), door: 'pool-runner', purpose: `pool ${args.join(' ')}`, chainHead: chainHead(await readChain()), pid: process.pid })}\n`
      );

      const { runResearchPool } = await import('./poolrun.ts');

      await runResearchPool(args);
      break;
    }
    default:
      throw new Error(`unknown command ${command}`);
  }

  void path;
};
