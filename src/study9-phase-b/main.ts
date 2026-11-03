// The Study 9 Phase B command line (research/study9-phase-b/RUN_COMMANDS.md). Run from the repository root with Node
// v24.21.0: research/study9-phase-b/scripts/s9b.sh <command> [args] (the npm script `study9b` is added only after the
// study, because Phase A's integrity pins include package.json).
//
//   pilot                         pre-freeze TIMING pilot (no economic output)
//   freeze-protocol               once: results/protocol_freeze.json + chain phase "protocol"
//   parity                        engineering and leakage gates; seals "parity" iff every gate passes
//   search <track> <fold>         one optimizer job (tracks G4-ILF G4-EWW N3-EDV N2-SMH V3-IWM N2-EDV VG3-IWM)
//   seal search|qualify [--acknowledge <ID>] | seal report-<name> <files…>
//   qualify <track> <fold>        in-sample qualification (training door, confirmation seeds)
//   freeze-selection              FROZEN_SELECTION.json + chain phase "selection"
//   record-audit <report>         the independent pre-test audit (must state CLEARED); chain phase "audit"
//   test <fold> [--confirm]       the one-time test door of a fold (order F19 F20 F21 F23 F24)
//   slice                         the 2026-10-30 single-session slice (after test-F24-confirm; report-only)
//   verify-chain                  re-verify the chain, the door log and every integrity pin
//   acknowledge-code <ID>         after an AMENDMENTS.md entry <ID>: accept the current code digest
import path from 'node:path';
import fs from 'fs-extra';
import {
  briefFile,
  freezeDir,
  protocolFile,
  protocolFreezeFile,
  resultFile,
  reviewFile,
  smoke,
  verificationFile,
  amendmentsFile
} from './context.ts';
import { sha256 } from './records.ts';
import { appendPhase, git, log, nowIso, setLogTag, writeSealed } from './records.ts';

const [command, ...args] = process.argv.slice(2);

const main = async () => {
  if (process.version !== 'v24.21.0') throw new Error(`Node v24.21.0 required (${process.version})`);
  // review m7: smoke mode is a pre-freeze code-path test only
  if (smoke && (await fs.pathExists('research/study9-phase-b/results/protocol_freeze.json')))
    throw new Error('smoke mode is refused after the protocol freeze');

  setLogTag(
    `study9b ${[command ?? '', ...args.filter((a) => !a.startsWith('/') && !a.startsWith('--')).slice(0, 3)].join(' ')}`
  );

  switch (command) {
    case 'pilot': {
      if (smoke) throw new Error('the pilot is not a smoke stage');
      if (await fs.pathExists(protocolFreezeFile))
        throw new Error('the pilot is a pre-freeze stage; the protocol is frozen');

      const { runPilot } = await import('./pilot.ts');

      await runPilot();
      break;
    }
    case 'freeze-protocol': {
      if (smoke) throw new Error('no freeze in smoke mode');

      const { snapshot, writeCodeTarball } = await import('./integrity.ts');

      if (await fs.pathExists(protocolFreezeFile)) throw new Error(`${protocolFreezeFile} exists (sealed)`);

      const pilotFile = resultFile('pilot', 'pilot.json');
      // review V7: the smoke script and its printed output are sealed with the protocol
      const smokeFiles = ['smoke.sh', 'smoke-run1-output.txt', 'smoke-run2-output.txt', 'smoke-run3-output.txt'].map(
        (f) => resultFile('pilot', f)
      );

      for (const file of [
        protocolFile,
        briefFile,
        reviewFile,
        verificationFile,
        amendmentsFile,
        pilotFile,
        ...smokeFiles
      ]) {
        if (!(await fs.pathExists(file))) throw new Error(`freeze refused: ${file} is missing`);
      }

      const tarball = path.join(freezeDir, 'code-protocol.tar.gz');
      const amendments = path.join(freezeDir, 'AMENDMENTS-protocol.md');

      writeCodeTarball(tarball);
      await fs.copy(amendmentsFile, amendments);

      const shaOf = async (file: string) => ({ file, sha256: sha256(await fs.readFile(file)) });
      const record = await writeSealed(protocolFreezeFile, {
        stage: 'PROTOCOL_FREEZE',
        frozenAt: nowIso(),
        protocol: await shaOf(protocolFile),
        brief: await shaOf(briefFile),
        review: await shaOf(reviewFile),
        verification: await shaOf(verificationFile),
        amendments: await shaOf(amendments),
        tarball: await shaOf(tarball),
        pilot: await shaOf(pilotFile),
        git: { branch: git('branch --show-current'), head: git('rev-parse HEAD'), status: git('status --short') },
        node: process.version,
        integrity: await snapshot()
      });
      const entry = await appendPhase('protocol', [
        protocolFile,
        briefFile,
        protocolFreezeFile,
        reviewFile,
        verificationFile,
        tarball,
        amendments,
        pilotFile,
        ...smokeFiles
      ]);

      log(
        `protocol frozen: ${record.file} ${record.bodyHash.slice(0, 12)}; chain entry ${entry.seq} ${entry.entryHash.slice(0, 12)}`
      );
      break;
    }
    default: {
      const { dispatch } = await import('./commands.ts');

      await dispatch(command ?? '', args);
    }
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
