// The Study 6 command line (research/study6-b5-kre-robustness-2026-10/RUN_COMMANDS.md). Run from the repository root
// with Node v24.21.0: npm run study6 -- <command>.
//
//   freeze-protocol            once: results/protocol_freeze.json (PROTOCOL.md sha256, time, git state, code digest)
//   parity                     P1, P3, P5 (PROTOCOL.md §8.1)
//   data                       S2 data audit (hashes, the 2026-10-13 prefixes = the B5 pins, sessions)
//   a1 | a2 | a5 | a6 | a7 | a8    Part A stages (PROTOCOL.md §6)
//   a3 <WDEV|W23|W13|W29>      neighbourhoods on one window
//   a4 <WDEV|W23|W29>          the joint decomposition on one window
//   p4 | r-om                  Track O engineering gates (PROTOCOL.md §8.1): the step-4 re-implementation on GDX/S0,
//                              and the multi-etf-d1 KRE search reproduced in a detached worktree
//   diagnostic-freeze          A9: results/diagnostic_manifest.json (then commit before Part B)
//   b-* , freeze-selection, final, pool …   Part B (see partB.ts)
import fs from 'fs-extra';
import type { WindowKey } from './context.ts';
import { protocolFile, protocolFreezeFile } from './context.ts';
import { sha256 } from './data.ts';
import {
  codeDigest,
  git,
  log,
  nowIso,
  requireParity,
  requirePartAOpen,
  requireProtocolFrozen,
  writeSealed
} from './records.ts';

const [command, ...args] = process.argv.slice(2);

const windowArg = (allowed: WindowKey[]): WindowKey => {
  const value = args[0] as WindowKey;

  if (!allowed.includes(value)) {
    throw new Error(`window must be one of ${allowed.join(', ')}`);
  }

  return value;
};

const main = async () => {
  if (process.version !== 'v24.21.0') {
    throw new Error(`Node v24.21.0 required (${process.version})`);
  }

  switch (command) {
    case 'freeze-protocol': {
      const record = await writeSealed(protocolFreezeFile, {
        stage: 'PROTOCOL_FREEZE',
        frozenAt: nowIso(),
        protocol: { file: protocolFile, sha256: sha256(await fs.readFile(protocolFile)) },
        git: { branch: git('branch --show-current'), head: git('rev-parse HEAD'), status: git('status --short') },
        code: await codeDigest()
      });

      log(`protocol frozen: ${JSON.stringify(record)}`);
      break;
    }
    case 'parity':
      await requireProtocolFrozen();
      await (await import('./parity.ts')).runParity();
      break;
    case 'data':
      await requireProtocolFrozen();
      await (await import('./partA.ts')).runDataAudit();
      break;
    case 'a1':
      await requirePartAOpen();
      await (await import('./partA.ts')).runEvidence();
      break;
    case 'a2':
      await requirePartAOpen();
      await (await import('./partA.ts')).runBaseline();
      break;
    case 'a3':
      await requirePartAOpen();
      await (await import('./partA.ts')).runNeighbourhoods(windowArg(['WDEV', 'W23', 'W13', 'W29']));
      break;
    case 'a4':
      await requirePartAOpen();
      await (await import('./partA.ts')).runDecomposition(windowArg(['WDEV', 'W23', 'W29']));
      break;
    case 'a5':
      await requirePartAOpen();
      await (await import('./partA.ts')).runB1();
      break;
    case 'a6':
      await requirePartAOpen();
      await (await import('./partA.ts')).runAblations();
      break;
    case 'a7':
      await requirePartAOpen();
      await (await import('./events.ts')).runEvents();
      break;
    case 'a8':
      await requirePartAOpen();
      await (await import('./execution.ts')).runExecution();
      break;
    case 'p4':
      await requireParity();
      await (await import('./trackO.ts')).runP4();
      break;
    case 'r-om':
      await requireParity();
      await (await import('./trackO.ts')).runROM();
      break;
    case 'diagnostic-freeze':
      await requireParity();
      await (await import('./checkpoint.ts')).runDiagnosticFreeze();
      break;
    default: {
      const partB = await import('./partB.ts');

      await partB.run(command, args);
    }
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
});
