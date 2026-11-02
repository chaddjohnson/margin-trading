// The Study 8 command line (research/study8-expanded-regime-d1/RUN_COMMANDS.md). Run from the Study 8 worktree root
// with Node v24.21.0: npm run study8 -- <command> [args].
//
//   pilot                         pre-freeze TIMING pilot (no economic output)
//   freeze-protocol               once: results/protocol_freeze.json + chain phase "protocol"
//   parity                        engineering gates; seals chain phase "parity" iff every gate passes
//   search <track> <fold>         one optimizer job (tracks G V VG VXR VXRG VXRKG; folds F19 F20 F21 F23 F24)
//   seal search|qualify           seal a completed phase into the hash chain
//   qualify <track> <fold>        in-sample qualification evidence (training door, confirmation seeds)
//   freeze-selection              FROZEN_SELECTION.json + chain phase "selection"
//   record-audit <report>         seal the independent pre-test audit (chain phase "audit")
//   test <fold> [--confirm]       one-time test door of a fold (order F19 F20 F21 F23 F24); seals "test-<fold>"
//   verify-chain                  re-verify every hash-chain entry and the integrity pins
//   acknowledge-code <ID>         after an AMENDMENTS.md entry <ID>: accept the current code digest (chain "code-<ID>")
//   research-configs | pool fixed <ID> …   research-only configurations and their runner (after test-F24)
import path from 'node:path';
import fs from 'fs-extra';
import { protocolFile, protocolFreezeFile } from './context.ts';
import { sha256 } from './data.ts';
import { runPilot } from './pilot.ts';
import { appendPhase, git, log, nowIso, setLogTag, writeSealed } from './records.ts';

const [command, ...args] = process.argv.slice(2);

const main = async () => {
  if (process.version !== 'v24.21.0') throw new Error(`Node v24.21.0 required (${process.version})`);

  setLogTag(
    `study8 ${[command ?? '', ...args.filter((a) => !a.startsWith('/') && !a.startsWith('--')).slice(0, 3)].join(' ')}`
  );

  switch (command) {
    case 'pilot': {
      if (await fs.pathExists(protocolFreezeFile))
        throw new Error('the pilot is a pre-freeze stage; the protocol is already frozen');

      await runPilot();
      break;
    }
    case 'freeze-protocol': {
      const { amendmentsFile, freezeDir, reviewFile, snapshot, verificationFile, writeCodeTarball } =
        await import('./integrity.ts');

      if (await fs.pathExists(protocolFreezeFile)) throw new Error(`${protocolFreezeFile} exists (sealed)`);

      for (const file of [protocolFile, reviewFile, verificationFile, amendmentsFile]) {
        if (!(await fs.pathExists(file))) throw new Error(`freeze refused: ${file} is missing`);
      }

      const tarball = path.join(freezeDir, 'code-protocol.tar.gz');
      const amendments = path.join(freezeDir, 'AMENDMENTS-protocol.md');

      writeCodeTarball(tarball);
      await fs.copy(amendmentsFile, amendments);

      const record = await writeSealed(protocolFreezeFile, {
        stage: 'PROTOCOL_FREEZE',
        frozenAt: nowIso(),
        protocol: { file: protocolFile, sha256: sha256(await fs.readFile(protocolFile)) },
        review: { file: reviewFile, sha256: sha256(await fs.readFile(reviewFile)) },
        verification: { file: verificationFile, sha256: sha256(await fs.readFile(verificationFile)) },
        amendments: { file: amendments, sha256: sha256(await fs.readFile(amendments)) },
        tarball: { file: tarball, sha256: sha256(await fs.readFile(tarball)) },
        git: { branch: git('branch --show-current'), head: git('rev-parse HEAD'), status: git('status --short') },
        node: process.version,
        integrity: await snapshot()
      });
      const entry = await appendPhase('protocol', [
        protocolFile,
        protocolFreezeFile,
        reviewFile,
        verificationFile,
        tarball,
        amendments
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
