// Stage commands (main.ts; RUN_COMMANDS.md). Door preconditions are intrinsic to each door (gates.ts); each stage writes
// a write-once sealed record, and `seal <phase>` (or the stage itself) appends the phase to the hash chain. Study 8's
// commands.ts, ported to this study's tracks, folds and phases.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type FoldKey,
  type TrackKey,
  amendmentsFile,
  auditFile,
  cacheDir,
  resultFile,
  studyDir,
  foldKeys,
  folds,
  frozenSelectionFile,
  parityFile,
  smoke,
  testOrder,
  trackBooks,
  trackKeys,
  tracks
} from './context.ts';
import { auditCleared, requireProtocolFrozen } from './gates.ts';
import { acknowledgeCode, requireIntegrity } from './integrity.ts';
import { qualificationFile } from './qualify.ts';
import {
  appendPhase,
  doorLogLines,
  fileSha256,
  log,
  nowIso,
  phaseSealed,
  readSealed,
  requirePhase,
  verifyChain,
  writeSealed
} from './records.ts';
import { runSearch, searchFile } from './search.ts';
import { requireIdenticalConfirmation, testConfirmFile, testFile } from './test.ts';

const trackArg = (value: string | undefined): TrackKey => {
  if (!value || !(value in tracks)) throw new Error(`track must be one of ${trackKeys.join(', ')}`);
  return value as TrackKey;
};

const foldArg = (value: string | undefined): FoldKey => {
  if (!value || !(value in folds)) throw new Error(`fold must be one of ${foldKeys.join(', ')}`);
  return value as FoldKey;
};

const searchPhaseFiles = () =>
  trackKeys.flatMap((track) =>
    foldKeys.flatMap((fold) => [searchFile(track, fold), searchFile(track, fold).replace(/\.json$/, '-archive.csv.gz')])
  );

const qualifyPhaseFiles = () => trackKeys.flatMap((track) => foldKeys.map((fold) => qualificationFile(track, fold)));

// Door openings per job of a phase (the door log's purpose strings). A job whose door opened more than once (a crash
// and resume) may be sealed only with --acknowledge <ID> naming an AMENDMENTS.md entry.
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
    case 'parity-a3':
    case 'parity-a4': {
      // the parity stage's child processes only (gates A3, A4): refused once parity is sealed
      await requireProtocolFrozen();
      if (await phaseSealed('parity')) throw new Error('parity is sealed');

      const runDir = args[0];

      if (!runDir || !path.normalize(runDir).startsWith(path.join(resultFile('parity'), 'run-')))
        throw new Error(`${command} needs the parity attempt's run folder`);

      const { runA3, runA4 } = await import('./parity.ts');

      await (command === 'parity-a3' ? runA3(runDir) : runA4(runDir));
      break;
    }
    case 'restart-probe': {
      // the parity stage's child process only (gate D1): a smoke-budget search on a parity door to 2019-12-31
      await requireProtocolFrozen();
      if (await phaseSealed('parity')) throw new Error('parity is sealed');

      const [track, out, cacheFile, stop] = args;

      await runSearch({ key: trackArg(track), books: trackBooks(trackArg(track)) }, 'F19', {
        mode: 'smoke',
        out: out!,
        cacheFile: cacheFile!,
        doorKey: 'parity-d1',
        doorEnd: folds.F19.trainEnd,
        labelPrefix: 'parity',
        ...(stop ? { stopAfterPoints: Number(stop) } : {})
      });
      break;
    }
    case 'search': {
      if (await phaseSealed('search')) throw new Error('the search phase is sealed; no further search');

      const track = trackArg(args[0]);

      const fold = foldArg(args[1]);

      // smoke mode writes its record where the later smoke stages read it (the scratch folder's search.json)
      await runSearch({ key: track, books: trackBooks(track) }, fold, {
        mode: smoke ? 'smoke' : 'base',
        ...(smoke ? { out: searchFile(track, fold), labelPrefix: 'smoke' } : {})
      });
      break;
    }
    case 'qualify': {
      if (await phaseSealed('qualify')) throw new Error('the qualify phase is sealed');

      const { runQualification } = await import('./qualify.ts');

      await runQualification(trackArg(args[0]), foldArg(args[1]));
      break;
    }
    case 'seal': {
      const phase = args[0] ?? '';

      if (phase.startsWith('report-')) {
        await requireIntegrity(`seal ${phase}`);

        const files = args.slice(1);

        if (!files.length) throw new Error('seal report-<name> needs the files to seal');

        const entry = await appendPhase(phase, files);

        log(`chain: ${phase} sealed (${files.length} files) as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
        break;
      }

      // recovery (review m8): a stage record written but not sealed (a crash between the write and the seal)
      if (phase === 'selection' || /^test-F(19|20|21|23|24)(-confirm)?$/.test(phase)) {
        await requireIntegrity(`seal ${phase}`);

        if (await phaseSealed(phase)) throw new Error(`phase ${phase} is already sealed`);

        const files =
          phase === 'selection'
            ? [frozenSelectionFile]
            : (() => {
                const fold = phase.slice(5, 8) as FoldKey;
                const out = phase.endsWith('-confirm') ? testConfirmFile(fold) : testFile(fold);

                return [out, out.replace(/\.json$/, '-lots.jsonl.gz')];
              })();

        const sealedRecord = await readSealed<{
          stage?: string;
          testParity?: { passed?: boolean } | null;
          confirmation?: { identical?: boolean };
        }>(files[0]!);

        // review V1: never seal a failed confirmation or a test record without passed test-door parity
        if (
          phase.endsWith('-confirm') &&
          !(sealedRecord.stage === 'TEST_CONFIRM' && sealedRecord.confirmation?.identical === true)
        )
          throw new Error(`${files[0]}: not an identical confirmation; it cannot be sealed`);
        if (/^test-F\d\d$/.test(phase) && sealedRecord.testParity?.passed !== true)
          throw new Error(`${files[0]}: its test-door parity did not pass; it cannot be sealed`);

        await requirePhase(phase === 'selection' ? 'qualify' : 'audit');

        const entry = await appendPhase(phase, files);

        log(`chain: ${phase} sealed by recovery as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
        break;
      }

      const base = phase === 'search' ? searchPhaseFiles() : phase === 'qualify' ? qualifyPhaseFiles() : undefined;

      if (!base) throw new Error('seal accepts search | qualify | selection | test-<fold>[-confirm] | report-<name>');

      // AMENDMENTS E3: refuse a sealed phase before anything is touched (the manifest below is regenerated)
      if (await phaseSealed(phase)) throw new Error(`phase ${phase} is already sealed`);

      // the jobs' persistent point caches are retained; their sha256 and line counts are sealed with the phase (m13)
      const manifest = resultFile(phase, 'cache-manifest.json');
      const files = [...base, manifest];

      await requireIntegrity(`seal ${phase}`);
      await requirePhase(phase === 'qualify' ? 'search' : 'parity');

      for (const file of base.filter((f) => f.endsWith('.json'))) await readSealed(file);

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

      // review V5: always regenerated from the caches as they are now (a stale manifest of a failed attempt is replaced)
      {
        await fs.remove(manifest);

        const caches: Record<string, { sha256: string; lines: number; bytes: number }> = {};

        for (const track of trackKeys) {
          for (const fold of foldKeys) {
            const file = path.join(cacheDir, `${phase}-${track}-${fold}.jsonl`);

            if (await fs.pathExists(file)) {
              const bytes = await fs.readFile(file);

              // AMENDMENTS E2: count newline bytes in the buffer (a cache can exceed the 512 MB string limit)
              let lines = 0;

              for (let at = bytes.indexOf(10); at >= 0; at = bytes.indexOf(10, at + 1)) lines++;

              caches[file] = { sha256: await fileSha256(file), lines, bytes: bytes.length };
            }
          }
        }

        if (Object.keys(caches).length !== trackKeys.length * foldKeys.length)
          throw new Error(
            `seal ${phase}: ${Object.keys(caches).length} of ${trackKeys.length * foldKeys.length} job caches found`
          );

        await writeSealed(manifest, { stage: 'CACHE_MANIFEST', phase, at: nowIso(), caches });
      }

      const entry = await appendPhase(phase, files);

      log(`chain: ${phase} sealed (${files.length} files) as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'freeze-selection': {
      const { runFreezeSelection } = await import('./select.ts');

      await requireIntegrity('freeze-selection');
      await runFreezeSelection();

      if (!smoke) {
        const entry = await appendPhase('selection', [frozenSelectionFile]);

        log(`chain: selection sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      }
      break;
    }
    case 'record-audit': {
      await requireIntegrity('record-audit');
      await requirePhase('selection');

      const report = args[0];

      if (!report || !(await fs.pathExists(report))) throw new Error('record-audit needs the audit report file');
      if (!path.normalize(report).startsWith(path.join(studyDir, 'reviews') + path.sep))
        throw new Error(`the audit report must live in ${path.join(studyDir, 'reviews')}`);
      if (await fs.pathExists(auditFile)) throw new Error(`${auditFile} exists (sealed)`);

      // PROTOCOL.md §8.3 (review M2): exactly one "Result: CLEARED" line and no negated or blocking result
      if (!auditCleared(await fs.readFile(report, 'utf8')))
        throw new Error('the audit report does not record exactly one "Result: CLEARED" line; no test door may open');

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

      if (!smoke) {
        const out = confirm ? testConfirmFile(fold) : testFile(fold);
        const entry = await appendPhase(confirm ? `test-${fold}-confirm` : `test-${fold}`, [
          out,
          out.replace(/\.json$/, '-lots.jsonl.gz')
        ]);

        log(
          `chain: test-${fold}${confirm ? '-confirm' : ''} sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`
        );
      }
      break;
    }
    case 'slice': {
      const { runSlice, sliceFile } = await import('./slice.ts');

      await requirePhase('test-F24-confirm');
      await requireIdenticalConfirmation();
      await runSlice();

      const entry = await appendPhase('slice-2026-10-30', [sliceFile()]);

      log(`chain: slice-2026-10-30 sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'preference': {
      const { runPreference, preferenceFile } = await import('./preference.ts');

      await requirePhase('diagnostics');
      await requireIdenticalConfirmation();
      await runPreference();

      const entry = await appendPhase('preference', [preferenceFile()]);

      log(`chain: preference sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'diagnostics': {
      const { runDiagnostics, diagnosticsFile } = await import('./diagnostics.ts');

      await requirePhase('test-F24-confirm');
      await requireIdenticalConfirmation();
      await runDiagnostics();

      const entry = await appendPhase('diagnostics', [diagnosticsFile()]);

      log(`chain: diagnostics sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    case 'verify-chain': {
      const chain = await verifyChain();
      const integrity = await requireIntegrity('verify-chain', { canonical: true });

      console.info(
        chain
          .map((e) => `${e.seq} ${e.phase} ${e.at} files=${e.files.length} doors=${e.doors.lines} ${e.entryHash}`)
          .join('\n')
      );
      console.info(
        `chain OK: ${chain.length} entries; integrity ${integrity ? `OK (code ${integrity.code.slice(0, 12)}, engine ${integrity.engine.slice(0, 12)}, accepted by ${integrity.acceptedBy}; canonical bytes after 2026-10-30: ${JSON.stringify(integrity.laterBytes)})` : 'not frozen yet'}`
      );
      break;
    }
    case 'acknowledge-code': {
      await requireProtocolFrozen();

      const entry = await acknowledgeCode(args[0] ?? '');

      log(`chain: ${entry.phase} sealed as entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`);
      break;
    }
    default:
      throw new Error(`unknown command ${command}`);
  }
};
